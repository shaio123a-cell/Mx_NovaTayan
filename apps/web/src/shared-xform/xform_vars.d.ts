export declare function interpolateExpr(expr: string, vars: Record<string, unknown>, engine: 'jmespath' | 'xpath' | 'css', paramTypes?: Record<string, string>): string;
export declare function redactVars(vars: Record<string, unknown>): string[];
