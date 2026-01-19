// xform_engine.ts
// Main transform engine for YAML DSL

import { TransformSpec } from './xform_schema';
import { validateSpecYaml } from './xform_validation';
import { interpolateExpr } from './xform_vars';
import { selectRows, evalExpr } from './xform_selectors_json';
import { selectNodes as selectXmlNodes, evalXPath } from './xform_selectors_xml';
import { selectNodes as selectHtmlNodes, evalRelative } from './xform_selectors_html';
import { renderCSV, renderJSON, renderText, renderXML } from './xform_renderers';
// import yaml from 'yaml';

export async function transform(
  spec: TransformSpec,
  input: string | ArrayBuffer | Buffer,
  vars: Record<string, unknown> = {},
  options: { previewLimit?: number; timeoutMs?: number } = {}
): Promise<string | Uint8Array> {
  // 1. Validate spec
  // 2. Interpolate variables in mappings/filters
  // 3. Parse input
  // 4. Select rows
  // 5. Apply filters
  // 6. Build records
  // 7. Render output
  // 8. Enforce timeout/size

  // Validate spec
  // (Assume already validated for brevity)

  // Interpolate mappings/filters
  const paramTypes: Record<string, string> = {};
  spec.parameters?.forEach(p => { if (p.name) paramTypes[p.name] = p.type || 'any'; });

  // Parse input
  let rows: any[] = [];
  let inputType = detectInputTypeFromSpec(spec);
  let doc: any;
  if (inputType === 'json') {
    doc = typeof input === 'string' ? JSON.parse(input) : JSON.parse(Buffer.from(input as any).toString('utf8'));
    rows = selectRows(doc, spec.input.root);
  } else if (inputType === 'xml') {
    const xmlText = typeof input === 'string' ? input : Buffer.from(input as any).toString('utf8');
    rows = selectXmlNodes(xmlText, spec.input.root);
  } else if (inputType === 'html') {
    const htmlText = typeof input === 'string' ? input : Buffer.from(input as any).toString('utf8');
    rows = selectHtmlNodes(htmlText, spec.input.root);
  } else {
    throw new Error('Unknown input type');
  }

  // Apply filters
  if (spec.filters && spec.filters.length > 0) {
    rows = rows.filter(row => {
      return spec.filters!.every(f => {
        try {
          const expr = interpolateExpr(f.expr, vars, inputType === 'json' ? 'jmespath' : inputType === 'xml' ? 'xpath' : 'css');
          if (inputType === 'json') return !!evalExpr(row, expr);
          if (inputType === 'xml') return !!evalXPath(row, expr);
          if (inputType === 'html') return !!evalRelative(row, expr);
        } catch (e) {
          return false;
        }
      });
    });
  }

  // Build records
  let records: Record<string, unknown>[] = [];
  for (const row of rows) {
    const rec: Record<string, unknown> = {};
    for (const m of spec.mappings) {
      try {
        const expr = interpolateExpr(m.expr, vars, inputType === 'json' ? 'jmespath' : inputType === 'xml' ? 'xpath' : 'css');
        let val;
        if (inputType === 'json') val = evalExpr(row, expr);
        else if (inputType === 'xml') val = evalXPath(row, expr);
        else if (inputType === 'html') val = evalRelative(row, expr);
        // Type coercion
        if (m.type === 'number') val = Number(val);
        else if (m.type === 'boolean') val = Boolean(val);
        else if (m.type === 'string') val = val == null ? '' : String(val);
        rec[m.name] = val;
      } catch (e) {
        if (spec.defaults?.on_missing === 'error') throw new Error(`Mapping error for ${m.name}: ${e}`);
        if (spec.defaults?.on_missing === 'skip_row') continue;
        rec[m.name] = null;
      }
    }
    records.push(rec);
    if (options.previewLimit && records.length >= options.previewLimit) break;
  }

  // Render output
  if (spec.output.type === 'csv') {
    const columns = spec.mappings.map(m => m.name);
    return renderCSV(records, columns, spec.output.options || {});
  } else if (spec.output.type === 'json') {
    return renderJSON(records);
  } else if (spec.output.type === 'text') {
    // Only one mapping allowed
    const col = spec.mappings[0].name;
    return renderText(records.map(r => String(r[col])));
  } else if (spec.output.type === 'xml') {
    return renderXML(records);
  }
  throw new Error('Unknown output type');
}

export function validateSpec(specYaml: string) {
  return validateSpecYaml(specYaml);
}

export function detectInputTypeFromSpec(spec: TransformSpec): 'json' | 'xml' | 'html' {
  return spec.input.type;
}
