import { Controller, Post, Body, Param, Query, Headers } from '@nestjs/common';
import { WorkflowsService } from '../workflows/workflows.service';

@Controller('triggers')
export class TriggersController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post(':token')
  triggerByToken(
    @Param('token') token: string, 
    @Body() body: any,
    @Query() query: any,
    @Headers() headers: any
  ) {
    return this.workflowsService.triggerByToken(token, { body, query, headers });
  }
}
