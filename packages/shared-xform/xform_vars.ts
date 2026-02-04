// xform_vars.ts
import { VariableEngine, VariableContext } from './variable_engine';

// Capture {{ ... }} with any content
const PLACEHOLDER_REGEX = /{{\s*(.+?)\s*}}/g;

export function interpolateExpr(
  expr: string,
  vars: Record<string, unknown>,
  engine: 'jmespath' | 'xpath' | 'css'
): string {
  // Detect if vars is a Context object or flat
  let context: VariableContext;
  if (vars && (vars.task || vars.workflow || vars.global)) {
      context = vars as VariableContext;
  } else {
      context = { task: vars };
  }
  
  if (!context.task) context.task = {};

  const varEngine = new VariableEngine(context);

  return expr.replace(PLACEHOLDER_REGEX, (match, expression, offset, fullExpr) => {
    try {
      const value = varEngine.evaluateExpression(expression);

      // Detect quoted context
      const before = fullExpr[offset - 1];
      const after = fullExpr[offset + match.length];
      const isQuoted = (before === '"' && after === '"') || (before === "'" && after === "'");

      if (engine === 'jmespath') {
        if (typeof value === 'string') return JSON.stringify(value);
        if (typeof value === 'number' || typeof value === 'boolean' || value === null) return String(value);
        return JSON.stringify(value);
      } else if (engine === 'xpath') {
        if (typeof value === 'string') {
          // If quoted, insert raw (but escaped); else wrap in quotes
          if (isQuoted) return escapeForXPath(value);
          return singleOrDoubleQuoteXPath(value);
        }
        if (typeof value === 'number') return String(value);
        if (typeof value === 'boolean') return value ? 'true()' : 'false()';
        return String(value);
      } else if (engine === 'css') {
        // Only allow as string literal
        return typeof value === 'string' ? value : String(value);
      }
      return String(value);
    } catch (e: any) {
        if (e.message && e.message.startsWith('E_VAR_CYCLE')) throw e;
        throw new Error(`Missing or invalid variable: ${expression}`);
    }
  });
}

function escapeForXPath(str: string): string {
  // If both quote types exist, use concat()
  if (str.includes("'") && str.includes('"')) {
    const parts = str.split(/(['"])/).map(s =>
      s === "'" ? '"' : s === '"' ? "'" : `'${s}'`
    );
    return `concat(${parts.join(',')})`;
  } else if (str.includes("'")) {
    return `"${str}"`;
  } else {
    return `'${str}'`;
  }
}

function singleOrDoubleQuoteXPath(str: string): string {
  if (str.includes("'")) return `"${str}"`;
  return `'${str}'`;
}

// Redact variable values in logs
export function redactVars(vars: Record<string, unknown>): string[] {
    if ((vars as any).task) return Object.keys((vars as any).task);
    return Object.keys(vars);
}
