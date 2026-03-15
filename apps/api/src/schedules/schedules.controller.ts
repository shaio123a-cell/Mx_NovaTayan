import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Request } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/schedule.dto';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  create(@Body() createScheduleDto: CreateScheduleDto, @Request() req: any) {
    const ownerId = req.user?.id || 'system';
    return this.schedulesService.create(createScheduleDto, ownerId);
  }

  @Get()
  findAll() {
    return this.schedulesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateScheduleDto: UpdateScheduleDto) {
    return this.schedulesService.update(id, updateScheduleDto);
  }

  @Patch(':id/state')
  updateState(@Param('id') id: string, @Body('state') state: string) {
    return this.schedulesService.updateState(id, state);
  }

  @Post('preview')
  getPreviewGeneric(@Body() options: any) {
    return this.schedulesService.getPreviewGeneric(options);
  }

  @Post(':id/preview')
  getPreview(@Param('id') id: string, @Body() options: any) {
    return this.schedulesService.getPreview(id, options);
  }

  @Get(':id/usage')
  getUsage(@Param('id') id: string) {
    return this.schedulesService.getUsage(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.schedulesService.remove(id);
  }
}
