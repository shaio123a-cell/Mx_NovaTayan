import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class McpService {
    private readonly logger = new Logger(McpService.name);

    /**
     * Pings an MCP server to check if it's reachable and speaking the protocol.
     */
    async ping(url: string): Promise<boolean> {
        try {
            // MCP servers usually respond to an 'initialize' or 'list_tools' JSON-RPC call
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'ping-' + Date.now(),
                    method: 'initialize',
                    params: {
                        protocolVersion: '2024-11-05',
                        capabilities: {},
                        clientInfo: { name: 'NovaTayan-Relay', version: '1.0.0' }
                    }
                })
            });

            return response.ok;
        } catch (error) {
            this.logger.error(`Ping failed for MCP server at ${url}: ${error.message}`);
            return false;
        }
    }

    /**
     * Lists available tools from the external MCP server.
     */
    async listTools(url: string): Promise<any[]> {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'list-' + Date.now(),
                    method: 'tools/list',
                    params: {}
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            if (data.error) throw new Error(data.error.message || 'MCP Error');

            return data.result?.tools || [];
        } catch (error) {
            this.logger.error(`Failed to list tools from MCP server at ${url}: ${error.message}`);
            throw error;
        }
    }
}
