import { IsString, IsOptional, IsEnum, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CalendarRuleDto {
  @IsString()
  @IsEnum(['ALLOW_WINDOW', 'EXCLUDE_WINDOW', 'EXCEPTION_DATE'])
  type: string;

  @IsOptional()
  payload?: any;
}

export class CreateCalendarDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalendarRuleDto)
  rules?: CalendarRuleDto[];
}

export class UpdateCalendarDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalendarRuleDto)
  rules?: CalendarRuleDto[];
}
