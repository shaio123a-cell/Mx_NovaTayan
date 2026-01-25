// xform_selectors_json.ts
// JMESPath evaluation helpers for JSON input

import jmespath from 'jmespath';

export function selectRows(doc: any, rootExpr: string): any[] {
  // Translate JSONPath-style expressions starting with '$' to JMESPath
  const toJmes = (e: string) => {
    if (!e) return e;
    if (e === '$' || e === '$.') return '';
    let out = e;
    if (e.startsWith('$.')) out = e.slice(2);
    else if (e.startsWith('$')) out = e.slice(1);
    // Convert JSONPath-style projection '[]' to JMESPath '[*]'
    out = out.replace(/\[\]/g, '[*]');
    return out;
  };

  const jmesExpr = toJmes(rootExpr);
  if (jmesExpr === '') {
    return Array.isArray(doc) ? doc : [doc];
  }
  const result = jmespath.search(doc, jmesExpr);
  // Be tolerant: if result is not an array, wrap it into one instead of throwing.
  return Array.isArray(result) ? result : [result];
}

export function evalExpr(row: any, expr: string): any {
  // Evaluate JMESPath expression relative to row
  const toJmes = (e: string) => {
    if (!e) return e;
    if (e === '$' || e === '$.') return '';
    if (e.startsWith('$.')) return e.slice(2);
    if (e.startsWith('$')) return e.slice(1);
    return e;
  };
  if (expr === '$' || expr === '$.') return row;
  const jmes = toJmes(expr);
  if (jmes === '') return row;
  return jmespath.search(row, jmes);
}
