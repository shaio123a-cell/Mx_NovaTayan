# 📘 GPT Assist Integration — Full Implementation Guide  
### *Adding AI‑Based REGEX / JMESPath / XPath / YAML Generation to the Config Transformer Shelf*

---

## 🧩 Overview
Your application already supports several transformation modes inside the **Config Transformer Shelf Window**:

- **REGEX**
- **JMESPath**
- **XPath**
- **ADVANCED YAML DSL** (custom schema-based transformation language)

This document describes how to integrate a **GPT-powered conversational assistant** into all four transformation types — allowing users to **describe the transformation they want in natural language** and automatically generate:

- A **regex pattern**
- A **JMESPath expression**
- An **XPath expression**
- A **full YAML DSL transformation spec**

It also includes architecture, UI changes, backend services, JSON metadata, prompt templates, and validation requirements.

---

## 🎯 Goals

1. Add a **“GPT Assist” button** inside the Config Transformer window.  That when pressed on opens a prompt window that allows the user to describe the transformation they want in natural language and automatically generate:
   - A **regex pattern**
   - A **JMESPath expression**
   - An **XPath expression**
   - A **full YAML DSL transformation spec**
2. Enable natural-language → transformer generation:
   - "extract email" → REGEX  
   - "filter items where age > 30" → JMESPath  
   - "select all `<user>` with `role='admin'`" → XPath  
   - "convert JSON employees to CSV" → Advanced YAML  
3. Provide conversational refinement.  
4. Real, deterministic preview using your existing transformation engine.  
5. Support runtime variables `{{var}}` for the YAML DSL.  
6. Make the assistant consistent, safe, validated, and schema‑compliant.

---
This document explains how to integrate GPT/MCP‑based assistance into all transformer types (REGEX, JMESPath, XPath, Advanced YAML DSL) **and** how to configure external AI providers via a new **Administration → AI Provider Settings** tab.

---

## 🧩 Overview
Your application supports multiple transformation engines:
- REGEX
- JMESPath
- XPath
- Advanced YAML DSL

The goal is to allow users to describe their transformation needs in natural language and automatically generate:
- regex
- jmespath expressions
- xpath expressions
- YAML transformation specs

All through a GPT/MCP‑powered assistant.

---

## 🔌 NEW: AI Provider Configuration (Administration → AI Provider Settings)
To use GPT Assist, the app must allow administrators to configure access to **external AI models**.

### Why?
The app does **not** embed any AI credentials. Users must provide their own:
- OpenAI API keys
- Azure OpenAI deployment & keys
- Anthropic Claude keys
- Google Gemini keys
- MCP local/enterprise model endpoints

### New Admin Tab: **Administration → AI Provider Settings**
This page contains a settings panel with the following fields:

```
Provider Type: [OpenAI | Azure OpenAI | Anthropic | Gemini | MCP | Custom]
Base URL:        https://api.openai.com/v1/
Model Name:      gpt-4.1, gpt-4o, claude-3, gemini-pro, etc.
API Key:         ••••••••••••••
Extra Headers:   { "api-key": "xyz", "deployment-id": "abc" }
MCP Endpoint:    ws://localhost:9000 or unix:///mcp.sock
Test Connection: [Button]
```

### Behavior
- Settings are **encrypted** and stored securely.
- "Test Connection" triggers backend health check.
- The GPT Assist panel is disabled until configuration is valid.

---

## 🔧 Backend Layer — AI Connector
The backend includes a module:
```
/services/aiConnector.ts
```
It provides a **unified API** regardless of provider.

### Example Interface
```ts
const result = await aiConnector.complete({
  model: config.model,
  messages: gptMessages,
  temperature: 0,
});
```

### Responsibilities
1. Read provider settings from Admin config.
2. Route to correct provider:
   - OpenAI REST
   - Azure OpenAI REST
   - Anthropic REST
   - Google Gemini REST
   - MCP (WebSocket/Unix socket)
3. Normalize response format.
4. Return text only (no tool calls).

---

## 🧱 Architecture Overview
```
+-------------------------+
| Config Transformer UI   |
|  (shelf window)         |
+-----------+-------------+
            |
            | user intent text
            v
+-------------------------+
| GPT Assist Frontend     |
+-----------+-------------+
            |
            | REST request with:
            | - intent
            | - sample input
            | - transformer type
            v
+-------------------------+
| Backend Prompt Builder  |
| (loads JSON bundles)    |
+-----------+-------------+
            |
            | GPT API call
            v
+-------------------------+
| GPT Model Output        |
| - regex/jmespath/xpath  |
| - or YAML DSL           |
| - mock preview          |
+-----------+-------------+
            |
            | validation + real execution
            v
+-----------------------------+
| Transform Engine (existing) |
+-----------------------------+
```

---

## 🖥️ Frontend Requirements

### 1. Add a “GPT Assist” button
This appears inside **each transformer panel**.

### 2. GPT Assist UI Components
- Prompt input field
- Conversation history
- GPT output view: regex / jmespath / xpath / yaml
- Real preview (from engine)
- Apply button
- Regenerate button
- Examples dropdown

### 3. Integration per Transformer Type
- REGEX → show regex output
- JMESPath → show expression
- XPath → show expression
- YAML → show spec

---

## 🔧 Backend Requirements

### 1. Endpoints
```
POST /gpt/regex
POST /gpt/jmespath
POST /gpt/xpath
POST /gpt/yaml
```

### 2. Validation
- Validate Regex (compile)
- Validate JMESPath (dry-run)
- Validate XPath (dry-run)
- Validate YAML (AJV + schema)

### 3. Real Preview Execution
```
result = transformEngine.transform(spec, input, vars)
```

---

## 📦 JSON Knowledge Bundles
You need 4 bundles:
- regex_assist_bundle.json
- jmespath_assist_bundle.json
- xpath_assist_bundle.json
- yaml_assist_bundle.json (full version previously generated)

Each bundle includes:
- examples
- patterns
- prompt template
- usage instructions

---

## 🤖 GPT Prompt Builders

### Regex Prompt Example
```
You generate strict REGEX patterns.
Use only sample input.
Return:
1) regex
2) explanation
```

### JMESPath Prompt Example
```
You generate JMESPath expressions. Use only fields.
Return expression + explanation.
```

### XPath Prompt Example
```
You generate XPath expressions. Use only sample XML.
Return expression + explanation.
```

### YAML DSL Prompt
Provided fully inside the JSON bundle earlier.

---

## 🧭 UI Flow
1. User clicks GPT Assist
2. Sends intent + sample input
3. Backend builds GPT prompt
4. GPT returns transformation
5. Backend validates
6. Engine runs preview
7. Preview shown
8. User applies

## 🧭 UI Flow Summary
1. User opens transformer shelf
2. Clicks GPT Assist
3. Enters natural-language request
4. Backend builds GPT prompt
5. aiConnector sends request to external model
6. GPT returns regex/xpath/jmespath/yaml
7. Backend validates
8. Engine produces real preview
9. User accepts transformation

---

## 🧪 Testing Requirements
- Unit tests: validators (regex, xpath, jmespath, yaml)
- Integration tests: each bundle example
- E2E tests: UI → GPT → preview → apply

---

## 🔐 Security
- API keys encrypted
- No logging of secrets
- GPT never runs code
- Engine always validates

---

## 📌 Summary
You need to implement:

### Frontend
- GPT Assist Panel for all transformer types
- New Admin tab: **AI Provider Settings**
- Real preview integration

### Backend
- AI Connector (OpenAI/Azure/Anthropic/Gemini/MCP)
- GPT endpoints
- Validation modules
- Preview execution

### Metadata
- Four knowledge bundles
- Prompt builders

This file is the full blueprint for development.
---

## 📁 File Structure
```
/gpt/
   regex_assist_bundle.json
   jmespath_assist_bundle.json
   xpath_assist_bundle.json
   yaml_assist_bundle.json
   promptBuilders/
      buildRegexPrompt.ts
      buildJmespathPrompt.ts
      buildXPathPrompt.ts
      buildYamlPrompt.ts
   routes/
      regex.ts
      jmespath.ts
      xpath.ts
      yaml.ts

/ui/TransformerShelf/
   GPTAssistPanel.tsx
   GPTChatHistory.tsx
   GPTPreview.tsx
   UseGPTAssist.ts
```

---

## 🧪 Testing
- Unit tests for each syntax validator
- Integration tests for examples
- E2E tests: user → GPT → preview → apply

---

## 🛡️ Safety
- GPT never executes data
- Engine always executes deterministically
- Validation always required
- No field invention allowed

---

## 📌 Summary
You must build:
### Frontend
- GPT Assist panel
- Apply flow
- Preview UI

### Backend
- 4 endpoints
- Prompt builders
- Validation
- Preview execution

### Bundles
- 4 JSON knowledge packs

This document serves as the full blueprint.
