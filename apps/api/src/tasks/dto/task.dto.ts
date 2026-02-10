import { IsString, IsNotEmpty, IsEnum, IsOptional, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    PATCH = 'PATCH',
    DELETE = 'DELETE',
}

export enum ScopeType {
    PRIVATE = 'PRIVATE',
    GLOBAL = 'GLOBAL',
}

export class CreateTaskDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(ScopeType)
    @IsOptional()
    scope?: ScopeType = ScopeType.GLOBAL;

    @IsEnum(HttpMethod)
    @IsNotEmpty()
    method: HttpMethod;

    @IsString()
    @IsNotEmpty()
    url: string;

    @IsObject()
    @IsOptional()
    headers?: Record<string, string>;

    @IsString()
    @IsOptional()
    body?: string;

    @IsOptional()
    timeout?: number;

    @IsArray()
    @IsOptional()
    tags?: string[];

    @IsArray()
    @IsOptional()
    groupIds?: string[];

    @IsObject()
    @IsOptional()
    authorization?: any;
}

export class UpdateTaskDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(ScopeType)
    @IsOptional()
    scope?: ScopeType;

    @IsEnum(HttpMethod)
    @IsOptional()
    method?: HttpMethod;

    @IsString()
    @IsOptional()
    url?: string;

    @IsObject()
    @IsOptional()
    headers?: Record<string, string>;

    @IsString()
    @IsOptional()
    body?: string;

    @IsOptional()
    timeout?: number;

    @IsArray()
    @IsOptional()
    groupIds?: string[];

    @IsObject()
    @IsOptional()
    authorization?: any;
}
