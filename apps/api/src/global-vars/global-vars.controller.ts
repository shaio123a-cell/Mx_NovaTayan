import { Controller, Get, Post, Body, Param, Patch, Delete, Req } from '@nestjs/common';
import { GlobalVarsService } from './global-vars.service';

@Controller('global-vars')
export class GlobalVarsController {
  constructor(private readonly service: GlobalVarsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
  
  @Get('groups')
  getGroups() {
      return this.service.getGroups();
  }

  @Post('groups')
  createGroup(@Body() body: { name: string; description?: string }) {
      return this.service.createGroup(body.name, body.description || '');
  }

  @Patch('groups/:name')
  updateGroup(@Param('name') name: string, @Body() body: { name: string; description?: string }) {
      return this.service.updateGroup(name, body);
  }

  @Delete('groups/:name')
  deleteGroup(@Param('name') name: string) {
      return this.service.deleteGroup(name);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: any, @Req() req: any) {
    // Assumption: Auth middleware populates req.user
    const user = req.user?.username || 'system'; 
    return this.service.create(body, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const user = req.user?.username || 'system';
    return this.service.update(id, body, user);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    const user = req.user?.username || 'system';
    return this.service.delete(id, user);
  }
}
