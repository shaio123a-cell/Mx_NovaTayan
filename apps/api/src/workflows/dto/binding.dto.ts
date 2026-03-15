import { IsString, IsOptional, IsBoolean, IsInt, IsObject, IsEnum } from 'class-validator';

export class CreateBindingDto {
  @IsString()
  scheduleId: string;

  @IsOptional()
  @IsString()
  calendarId?: string;

  @IsOptional()
  @IsBoolean()
  skipIfRunning?: boolean;

  @IsOptional()
  @IsInt()
  maxConcurrency?: number;

  @IsOptional()
  @IsObject()
  retryPolicy?: any;

  @IsOptional()
  @IsEnum(['ACTIVE', 'PAUSED'])
  state?: string;
}

export class UpdateBindingDto extends CreateBindingDto {}
