// xform_selectors_json.ts
// JMESPath evaluation helpers for JSON input

import jmespath from 'jmespath';

export function selectRows(doc: any, rootExpr: string): any[] {
  const result = jmespath.search(doc, rootExpr);
  if (!Array.isArray(result)) {
    throw new Error(`JMESPath root expression must resolve to an array. Got: ${typeof result}`);
  }
  return result;
}

export function evalExpr(row: any, expr: string): any {
  // Evaluate JMESPath expression relative to row
  return jmespath.search(row, expr);
}
