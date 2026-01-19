import { TransformSpec } from './xform_schema';
export declare function transform(spec: TransformSpec, input: string | ArrayBuffer | Buffer, vars?: Record<string, unknown>, options?: {
    previewLimit?: number;
    timeoutMs?: number;
}): Promise<string | Uint8Array>;
export declare function validateSpec(specYaml: string): {
    ok: true;
    spec: TransformSpec;
} | {
    ok: false;
    errors: string[];
};
export declare function detectInputTypeFromSpec(spec: TransformSpec): 'json' | 'xml' | 'html';
