import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) {}

    @Get('models')
    async listModels(
        @Query('provider') provider: string,
        @Query('apiKey') apiKey: string
    ) {
        return this.aiService.listModels(provider, apiKey);
    }

    @Post('generate-task')
    async generateTask(
        @Body('documentation') documentation: string, 
        @Body('currentState') currentState?: any,
        @Body('chatHistory') chatHistory?: any[],
        @Body('prompt') prompt?: string
    ) {
        return this.aiService.generateTaskFromDocs(documentation, currentState, prompt, chatHistory);
    }
}
