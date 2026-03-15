import { Controller, Get, Post, Body, Patch, Param, Delete, Put, UseGuards, Request, Query } from '@nestjs/common';
import { CalendarsService } from './calendars.service';
import { CreateCalendarDto, UpdateCalendarDto } from './dto/calendar.dto';

@Controller('calendars')
export class CalendarsController {
  constructor(private readonly calendarsService: CalendarsService) {}

  @Post()
  create(@Body() createCalendarDto: CreateCalendarDto, @Request() req: any) {
    // ownerId would normally come from auth, using a placeholder for now as per project pattern
    const ownerId = req.user?.id || 'system';
    return this.calendarsService.create(createCalendarDto, ownerId);
  }

  @Get()
  findAll() {
    return this.calendarsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.calendarsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateCalendarDto: UpdateCalendarDto) {
    return this.calendarsService.update(id, updateCalendarDto);
  }

  @Patch(':id/state')
  updateState(@Param('id') id: string, @Body('state') state: string) {
    return this.calendarsService.updateState(id, state);
  }

  @Get(':id/usage')
  getUsage(@Param('id') id: string) {
    return this.calendarsService.getUsage(id);
  }

  @Post(':id/preview')
  getPreview(@Param('id') id: string, @Body() range: { start: string, end: string }) {
    return this.calendarsService.getPreview(id, range);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.calendarsService.remove(id);
  }
}
