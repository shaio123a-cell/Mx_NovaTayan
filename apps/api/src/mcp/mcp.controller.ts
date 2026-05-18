import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
    constructor(private readonly mcpService: McpService) {}

    @Get('ping')
    async ping(@Query('url') url: string) {
        if (!url) throw new HttpException('Server URL is required', HttpStatus.BAD_REQUEST);
        const isUp = await this.mcpService.ping(url);
        if (!isUp) throw new HttpException('MCP Server Unreachable', HttpStatus.SERVICE_UNAVAILABLE);
        return { status: 'online' };
    }

    @Get('tools')
    async listTools(@Query('url') url: string) {
        if (!url) throw new HttpException('Server URL is required', HttpStatus.BAD_REQUEST);
        try {
            const tools = await this.mcpService.listTools(url);
            return { tools };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to list MCP tools', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
