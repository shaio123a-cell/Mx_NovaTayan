const http = require('http');

const TOOLS = [
    {
        name: 'calculate_risk',
        description: 'Analyzes asset metadata and returns a risk score (0-100).',
        inputSchema: {
            type: 'object',
            properties: {
                asset_id: { type: 'string' },
                severity: { type: 'number' }
            },
            required: ['asset_id']
        }
    },
    {
        name: 'fetch_audit_log',
        description: 'Retrieves the last 10 entries from the security audit log.',
        inputSchema: { type: 'object', properties: {} }
    },
    {
        name: 'generate_summary',
        description: 'Uses a local LLM-lite to summarize execution details.',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string' }
            }
        }
    }
];

const server = http.createServer((req, res) => {
    // Basic CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const json = JSON.parse(body);
                console.log(`[MCP MOCK] Received method: ${json.method}`);

                let result = {};
                switch (json.method) {
                    case 'initialize':
                        result = {
                            protocolVersion: '2024-11-05',
                            capabilities: { tools: { listChanged: false } },
                            serverInfo: { name: 'NovaTayan-Mock-Server', version: '1.0.0' }
                        };
                        break;
                    case 'tools/list':
                        result = { tools: TOOLS };
                        break;
                    default:
                        res.writeHead(404);
                        res.end();
                        return;
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ jsonrpc: '2.0', id: json.id, result }));
            } catch (e) {
                res.writeHead(400);
                res.end('Invalid JSON');
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

const PORT = 3333;
server.listen(PORT, () => {
    console.log(`\x1b[36m%s\x1b[0m`, `🚀 MCP Mock Server running at http://localhost:${PORT}`);
    console.log(`Ready for NovaTayan Integration Test!`);
});
