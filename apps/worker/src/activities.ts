import axios from 'axios';

/**
 * Execute an HTTP request task
 */
export async function executeHttpRequest(config: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
}): Promise<{
    statusCode: number;
    body: string;
    headers: Record<string, string>;
}> {
    console.log(`Executing HTTP ${config.method} to ${config.url}`);

    const response = await axios({
        method: config.method,
        url: config.url,
        headers: config.headers,
        data: config.body,
        timeout: config.timeout || 30000,
        validateStatus: () => true, // Accept all status codes
    });

    return {
        statusCode: response.status,
        body: JSON.stringify(response.data),
        headers: response.headers as Record<string, string>,
    };
}

/**
 * Extract variables from response using JSONPath or regex
 */
export async function extractVariables(
    responseBody: string,
    extractions: Array<{
        variableName: string;
        jsonPath?: string;
        regex?: string;
        defaultValue?: string;
    }>
): Promise<Record<string, string>> {
    const variables: Record<string, string> = {};

    // Placeholder - implement JSONPath and regex extraction
    for (const extraction of extractions) {
        variables[extraction.variableName] = extraction.defaultValue || '';
    }

    return variables;
}
