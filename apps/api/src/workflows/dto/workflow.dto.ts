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

    @IsObject()
    @IsOptional()
    inputVariables?: Record<string, any>;

    @IsObject()
    @IsOptional()
    outputVariables?: Record<string, any>;

    @IsObject()
    @IsOptional()
    scheduling?: any;

    @IsArray()
    @IsOptional()
    notifications?: any[];

    @IsString()
    @IsOptional()
    icon?: string;

    @IsString()
    @IsOptional()
    folderId?: string;
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

    @IsObject()
    @IsOptional()
    inputVariables?: Record<string, any>;

    @IsObject()
    @IsOptional()
    outputVariables?: Record<string, any>;

    @IsObject()
    @IsOptional()
    scheduling?: any;

    @IsArray()
    @IsOptional()
    notifications?: any[];

    @IsString()
    @IsOptional()
    icon?: string;

    @IsString()
    @IsOptional()
    folderId?: string;
}

export class CreateFolderDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    parentId?: string;
}

export class UpdateFolderDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    parentId?: string;
}
