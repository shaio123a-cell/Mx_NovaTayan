import { IsString, IsOptional, IsArray, IsBoolean, IsObject } from 'class-validator';

export class CreateWorkflowDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    scope?: string;

    @IsArray()
    nodes: any[];

    @IsArray()
    edges: any[];

    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @IsArray()
    @IsOptional()
    tags?: string[];
}

export class UpdateWorkflowDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsArray()
    @IsOptional()
    nodes?: any[];

    @IsArray()
    @IsOptional()
    edges?: any[];

    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @IsArray()
    @IsOptional()
    tags?: string[];
}
