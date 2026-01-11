import { Controller, Get, Patch, Body, Param } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    findAll() {
        return this.settingsService.findAll();
    }

    @Patch(':key')
    update(@Param('key') key: string, @Body('value') value: string) {
        return this.settingsService.update(key, value);
    }
}
