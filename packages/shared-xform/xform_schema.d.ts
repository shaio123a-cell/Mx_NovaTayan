export declare const TRANSFORM_JSON_SCHEMA: {
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly title: "TransformSpec";
    readonly type: "object";
    readonly required: readonly ["version", "name", "input", "output", "mappings"];
    readonly properties: {
        readonly version: {
            readonly type: "integer";
            readonly const: 1;
        };
        readonly name: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly input: {
            readonly type: "object";
            readonly required: readonly ["type", "root"];
            readonly properties: {
                readonly type: {
                    readonly type: "string";
                    readonly enum: readonly ["json", "xml", "html"];
                };
                readonly root: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
            };
            readonly additionalProperties: false;
        };
        readonly output: {
            readonly type: "object";
            readonly required: readonly ["type"];
            readonly properties: {
                readonly type: {
                    readonly type: "string";
                    readonly enum: readonly ["csv", "json", "xml", "text"];
                };
                readonly options: {
                    readonly type: "object";
                    readonly properties: {
                        readonly header: {
                            readonly type: "boolean";
                        };
                        readonly delimiter: {
                            readonly type: "string";
                            readonly minLength: 1;
                            readonly maxLength: 1;
                        };
                    };
                    readonly additionalProperties: true;
                };
            };
            readonly additionalProperties: false;
        };
        readonly mappings: {
            readonly type: "array";
            readonly minItems: 1;
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly expr: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly type: {
                        readonly type: "string";
                        readonly enum: readonly ["string", "number", "boolean", "date", "any"];
                    };
                };
                readonly required: readonly ["name", "expr"];
                readonly additionalProperties: false;
            };
        };
        readonly filters: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly expr: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                };
                readonly required: readonly ["expr"];
                readonly additionalProperties: false;
            };
        };
        readonly defaults: {
            readonly type: "object";
            readonly properties: {
                readonly on_missing: {
                    readonly type: "string";
                    readonly enum: readonly ["null", "skip_row", "error"];
                };
            };
            readonly additionalProperties: false;
        };
        readonly parameters: {
            readonly description: "Optional declaration of variables expected at runtime";
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                        readonly pattern: "^[A-Za-z_][A-Za-z0-9_]*$";
                    };
                    readonly type: {
                        readonly type: "string";
                        readonly enum: readonly ["string", "number", "boolean", "any"];
                    };
                    readonly required: {
                        readonly type: "boolean";
                        readonly default: false;
                    };
                    readonly default: {};
                };
                readonly required: readonly ["name"];
                readonly additionalProperties: false;
            };
        };
    };
    readonly additionalProperties: false;
};
export type TransformInputType = "json" | "xml" | "html";
export type TransformOutputType = "csv" | "json" | "xml" | "text";
export interface TransformSpec {
    version: 1;
    name: string;
    input: {
        type: TransformInputType;
        root: string;
    };
    output: {
        type: TransformOutputType;
        options?: {
            header?: boolean;
            delimiter?: string;
            [key: string]: any;
        };
    };
    mappings: Array<{
        name: string;
        expr: string;
        type?: "string" | "number" | "boolean" | "date" | "any";
    }>;
    filters?: Array<{
        expr: string;
    }>;
    defaults?: {
        on_missing?: "null" | "skip_row" | "error";
    };
    parameters?: Array<{
        name: string;
        type?: "string" | "number" | "boolean" | "any";
        required?: boolean;
        default?: any;
    }>;
}
