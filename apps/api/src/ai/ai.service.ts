import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

export type LLMConfig = { id: string; provider: string; model: string; apiKey: string; enabled: boolean };

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    constructor(private readonly settingsService: SettingsService) {}

    private async getActiveLLMConfigs(): Promise<LLMConfig[]> {
        const setting = await this.settingsService.getByKey('AI_LLM_PROVIDERS');
        if (!setting || !setting.value) {
            throw new InternalServerErrorException('No AI settings found in database.');
        }

        let configs: LLMConfig[] = [];
        try {
            configs = JSON.parse(setting.value);
        } catch (error) {
            this.logger.error('Failed to parse AI_LLM_PROVIDERS', error);
            throw new InternalServerErrorException('Corrupted AI configuration');
        }

        const activeConfigs = configs.filter(c => c.enabled && c.apiKey);
        if (activeConfigs.length === 0) {
            throw new InternalServerErrorException('No active LLM providers configured. Please add an API key in Admin Settings.');
        }

        return activeConfigs;
    }

    async listModels(provider: string, apiKey: string): Promise<string[]> {
        if (!apiKey) return [];
        try {
            if (provider === 'Google Gemini') {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                if (!response.ok) return [];
                const data = await response.json();
                return data.models
                    .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
                    .map((m: any) => m.name.replace('models/', ''));
            }
            if (provider === 'OpenAI') {
                const response = await fetch('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (!response.ok) return [];
                const data = await response.json();
                return data.data.map((m: any) => m.id).filter((id: string) => id.includes('gpt'));
            }
            if (provider === 'Anthropic Claude') {
                return ['claude-3-5-sonnet-20240620', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'];
            }
            return [];
        } catch (e) {
            this.logger.error(`Error fetching models for ${provider}:`, e);
            return [];
        }
    }

    async generateTaskFromDocs(documentation: string, currentState?: any, additionalPrompt?: string, chatHistory: any[] = []): Promise<any> {
        const configs = await this.getActiveLLMConfigs();
        
        let lastError: Error | null = null;

        for (const config of configs) {
            this.logger.log(`Attempting Task Draft Generation using Provider: ${config.provider} (Model: ${config.model})`);
            
            try {
                if (config.provider === 'Google Gemini' || config.provider === 'Gemini') {
                    return await this.generateWithGemini(config, documentation, currentState, additionalPrompt, chatHistory);
                } else {
                    this.logger.warn(`Provider ${config.provider} is currently under construction. Skipping.`);
                    continue;
                }
            } catch (err: any) {
                this.logger.warn(`Provider ${config.provider} failed: ${err.message}. Falling back to next provider in chain...`);
                lastError = err;
            }
        }

        throw new InternalServerErrorException(`All available fallback providers failed. Last Error: ${lastError?.message || 'Unknown configuration error.'}`);
    }

    private async generateWithGemini(config: LLMConfig, docs: string, currentState?: any, prompt?: string, chatHistory: any[] = []) {
        try {
            const systemInstruction = `You are the Restmon Agentic Copilot. Given API documentation or user instructions, you generate or strictly update a precise JSON representation of a Restmon Task, and provide a conversational explanation of what you did.
A Restmon Task generation response MUST have the following JSON structure:
{
   "task": {
       "name": "Meaningful Name representing the endpoint",
       "description": "Short description of what this does based on docs",
       "command": {
           "method": "GET|POST|PUT|DELETE|PATCH",
           "url": "https://api.example.com/item/{{input_id}}",
           "headers": { "Authorization": "Bearer {{api_key}}", "Content-Type": "application/json" },
           "body": "Optional request payload as stringified JSON. Use {{var}} syntax for insertions."
       },
       "variableExtraction": [
            { 
                "variableName": "target_variable_name",
                "type": "jmespath|regex|advanced",
                "spec": "JMESPath string, Raw Regex Pattern, or YAML specification."
            }
       ]
   },
   "mcp_config": {
       "serverId": "UUID of the selected server",
       "toolName": "name_of_the_tool",
       "parameters": { "key": "{{variable}}" }
   },
   "explanation": "A friendly conversational message to the user explaining what you updated or generated. Use a helpful, confident tone.",
   "sources": [
       { "title": "ServiceNow Auth Docs", "url": "https://developer.servicenow.com/..." }
   ]
}

AGENTIC MCP GUIDELINES:
1. When 'availableMcpContext' is present in the prompt below, you MUST populate 'mcp_config' — NO HTTP task should be generated for an MCP node.
2. The context follows this structure:
   registeredServers: [{ id, name, url, availableTools: [{name, description, inputSchema}] }]
   currentServerId: "uuid" or "auto-select"
3. If currentServerId === 'auto-select', pick the BEST matching server from registeredServers based on the user's intent and the server's name/tools.
4. Pick the tool whose name/description best matches the user's request. Set 'mcp_config.toolName' to EXACTLY that tool's name.
5. Set 'mcp_config.serverId' to the selected server's id (UUID string).
6. Populate 'mcp_config.parameters' as a JSON object using the tool's inputSchema as a guide. Map any user-mentioned variable references using {{variable_name}} syntax.
7. leave 'task.command' empty (null/omitted) for MCP nodes.

CRITICAL RULES FOR OUTPUT VARIABLE EXTRACTION:
1. Based on the documentation or your absolute knowledge of this API endpoint's standard response schema, aggressively infer the exact JSON response structure.
2. Automatically create 'variableExtraction' configurations for ALL critical primary keys, entity IDs, authentication tokens, and major status codes that result from this call.
3. Determine the optimal transformer 'type'. 
   - Use 'jmespath' for standard JSON extraction (e.g. spec: 'data.id'). 
   - Use 'regex' for text searching or header parsing.
   - Use 'advanced' ONLY for complex structural mutations, mapping, string interpolation, or conditional manipulation.
4. If using 'advanced', you MUST write a valid Restmon Advanced YAML specification inside 'spec' using this strict schema:

OVERVIEW:
A declarative YAML spec that tells the engine how to transform input data (JSON, XML, HTML) into CSV/JSON/XML/Text. Expressions use JMESPath (JSON), XPath (XML), and CSS selectors with text ops (HTML).

TOP-LEVEL KEYS:
- version (int, required): must be 1.
- name (string, required): unique transform name.
- input (object, required): { type: json | xml | html, root: selector for rows }
- output (object, required): { type: csv | json | xml | text, options: { header: bool, delimiter: char } }
- mappings (array, required): [{ name: string, expr: path, type: string }]
- filters (array, optional): [{ expr: expression }]
- parameters (array, optional): [{ name: string, type: string, default: any }]

VARIABLES ({{var}}):
Use in expr (mappings & filters): city == {{target_city}}, age >= {{min_age}}.
Strings → "value" (JMESPath), quoted literal in XPath.
Numbers/Booleans → typed literals.

BEST PRACTICES:
- Keep root array‑resolving.
- Use variables for filters.
- Prefer unquoted {{var}} placeholders for type‑safe insertion.
- Validate & preview before saving.
- For nested arrays in JSON, use a [] path in root (e.g., $.orders[].lines[]). 
- if root is a simple json - use $ not the word json

Return ONLY a strictly valid JSON object matching the above schema exactly. Do not use Markdown wrappers.`;

            const userPrompt = `
${currentState && Object.keys(currentState).length > 0 ? `=== CURRENT DRAFT STATUS ===\n${JSON.stringify(currentState, null, 2)}\n\n` : ''}
${chatHistory.length > 0 ? `=== CHAT CONTEXT ===\n${chatHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}\n\n` : ''}
${prompt ? `Additional Constraints from user: ${prompt}\n\n` : ''}
${currentState && Object.keys(currentState).length > 0 ? 'Modify the existing draft according to the following iterative instructions / corrections from the user:' : 'Here is the API documentation to convert into a Restmon Task:'}
---
${docs}
---

${currentState?.mcpMetadata ? `=== availableMcpContext ===\n${JSON.stringify(currentState.mcpMetadata, null, 2)}\n\n` : ''}
`;

            const modelName = config.model || 'gemini-1.5-flash';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.apiKey}`;
            
            const payload = {
                contents: [{
                    role: 'user',
                    parts: [{ text: systemInstruction + "\n\n" + userPrompt }]
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.1
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                this.logger.error(`Gemini API Error: ${errText}`);
                throw new InternalServerErrorException('LLM Provider returned an error.');
            }

            const data = await response.json();
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            
            try {
                return JSON.parse(responseText);
            } catch (jsonErr) {
                this.logger.error('Failed to parse Gemini output as JSON:', responseText);
                throw new InternalServerErrorException('AI returned malformed JSON structure.');
            }
            
        } catch (error: any) {
            this.logger.error(`Gemini Generation Error:`, error);
            throw new InternalServerErrorException(error.message || 'Error communicating with Gemini');
        }
    }
}
