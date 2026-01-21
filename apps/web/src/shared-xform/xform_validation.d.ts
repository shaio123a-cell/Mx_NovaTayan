import { TransformSpec } from './xform_schema';
export declare function validateSpecYaml(yamlText: string): {
    ok: true;
    spec: TransformSpec;
} | {
    ok: false;
    errors: string[];
};
export declare function validateSpecObject(obj: unknown): {
    ok: true;
    spec: TransformSpec;
} | {
    ok: false;
    errors: string[];
};
