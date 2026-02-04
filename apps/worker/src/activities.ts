import axios from 'axios';
import * as jwt from 'jsonwebtoken';

/**
 * Execute an HTTP request task with authorization support
 */
export async function executeHttpRequest(config: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
    authorization?: {
        type: 'none' | 'basic' | 'bearer' | 'jwt';
        username?: string;
        password?: string;
        token?: string;
        algorithm?: string;
        secret?: string;
        secretIsBase64?: boolean;
        payload?: Record<string, any>;
        addTo?: 'header' | 'query';
    };
}): Promise<{
    statusCode: number;
    body: string;
    headers: Record<string, string>;
}> {
    console.log(`Executing HTTP ${config.method} to ${config.url}`);

    let headers = { ...config.headers } || {};
    let url = config.url;

    // Handle authorization
    if (config.authorization && config.authorization.type !== 'none') {
        const auth = config.authorization;

        if (auth.type === 'basic') {
            // Basic Authentication
            const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
        } else if (auth.type === 'bearer') {
            // Bearer Token
            headers['Authorization'] = `Bearer ${auth.token}`;
        } else if (auth.type === 'jwt') {
            // JWT Bearer
            try {
                let secret = auth.secret || '';
                
                // Decode Base64 secret if specified
                if (auth.secretIsBase64) {
                    secret = Buffer.from(secret, 'base64').toString('utf-8');
                }

                const algorithm = (auth.algorithm || 'HS256') as jwt.Algorithm;
                const payload = auth.payload || {};
                
                // Sign the JWT
                const token = jwt.sign(payload, secret, { algorithm });
                
                // Add to header or query param
                if (auth.addTo === 'query') {
                    const separator = url.includes('?') ? '&' : '?';
                    url = `${url}${separator}token=${encodeURIComponent(token)}`;
                } else {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            } catch (error) {
                console.error(`JWT signing failed: ${error.message}`);
                throw new Error(`JWT authentication failed: ${error.message}`);
            }
        }
    }

    const response = await axios({
        method: config.method,
        url: url,
        headers: headers,
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
