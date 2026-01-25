// xform_selectors_json.ts
// JMESPath evaluation helpers for JSON input

import jmespath from 'jmespath';

export function selectRows(doc: any, rootExpr: string): any[] {
  const result = jmespath.search(doc, rootExpr);
    // Be tolerant: if result is not an array, wrap it into one instead of throwing.
    return Array.isArray(result) ? result : [result];
}

export function evalExpr(row: any, expr: string): any {
  // Evaluate JMESPath expression relative to row
  return jmespath.search(row, expr);
}
