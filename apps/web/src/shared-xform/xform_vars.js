"use strict";
// xform_vars.ts
// Safe variable interpolation for JMESPath, XPath, and CSS engines
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpolateExpr = interpolateExpr;
exports.redactVars = redactVars;
const PLACEHOLDER_REGEX = /{{\s*([A-Za-z_][A-Za-z0-9_]*)\s*}}/g;
function interpolateExpr(expr, vars, engine, paramTypes) {
    return expr.replace(PLACEHOLDER_REGEX, (match, varName, offset, fullExpr) => {
        if (!(varName in vars)) {
            throw new Error(`Missing required variable: ${varName}`);
        }
        const value = vars[varName];
        const type = paramTypes?.[varName] ?? typeof value;
        // Detect quoted context
        const before = fullExpr[offset - 1];
        const after = fullExpr[offset + match.length];
        const isQuoted = (before === '"' && after === '"') || (before === "'" && after === "'");
        if (engine === 'jmespath') {
            if (typeof value === 'string')
                return JSON.stringify(value);
            if (typeof value === 'number' || typeof value === 'boolean' || value === null)
                return String(value);
            return JSON.stringify(value);
        }
        else if (engine === 'xpath') {
            if (typeof value === 'string') {
                // If quoted, insert raw; else wrap in quotes or concat
                if (isQuoted)
                    return escapeForXPath(value);
                return singleOrDoubleQuoteXPath(value);
            }
            if (typeof value === 'number')
                return String(value);
            if (typeof value === 'boolean')
                return value ? 'true()' : 'false()';
            return String(value);
        }
        else if (engine === 'css') {
            // Only allow as string literal
            return typeof value === 'string' ? value : String(value);
        }
        return String(value);
    });
}
function escapeForXPath(str) {
    // If both quote types exist, use concat()
    if (str.includes("'") && str.includes('"')) {
        const parts = str.split(/(['"])/).map(s => s === "'" ? '"' : s === '"' ? "'" : `'${s}'`);
        return `concat(${parts.join(',')})`;
    }
    else if (str.includes("'")) {
        return `"${str}"`;
    }
    else {
        return `'${str}'`;
    }
}
function singleOrDoubleQuoteXPath(str) {
    if (str.includes("'"))
        return `"${str}"`;
    return `'${str}'`;
}
// Redact variable values in logs
function redactVars(vars) {
    return Object.keys(vars);
}
