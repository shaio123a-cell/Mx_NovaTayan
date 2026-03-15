import { IsString, IsOptional, IsEnum, IsObject, IsDateString, IsInt, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsEnum(['ONCE', 'INTERVAL', 'WEEKLY', 'MONTHLY', 'CRON'])
  mode: string;

  @IsObject()
  payload: any;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsDateString()
  launchAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsInt()
  maxRuns?: number;

  @IsOptional()
  @IsEnum(['skip', 'fire_once', 'catch_up_all'])
  misfirePolicy?: string;

  @IsOptional()
  @IsInt()
  coalesceSecs?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsEnum(['ACTIVE', 'PAUSED'])
  state?: string;
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsEnum(['ONCE', 'INTERVAL', 'WEEKLY', 'MONTHLY', 'CRON'])
  mode?: string;

  @IsOptional()
  @IsObject()
  payload?: any;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsDateString()
  launchAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsInt()
  maxRuns?: number;

  @IsOptional()
  @IsEnum(['skip', 'fire_once', 'catch_up_all'])
  misfirePolicy?: string;

  @IsOptional()
  @IsInt()
  coalesceSecs?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsEnum(['ACTIVE', 'PAUSED'])
  state?: string;
}
