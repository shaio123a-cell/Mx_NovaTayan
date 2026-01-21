// xform_renderers.ts
// Output renderers for CSV, JSON, Text, XML

function escapeCSV(val: unknown): string {
  if (val == null) return '';
  const s = String(val);
  if (/[,"\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function renderCSV(rows: Record<string, unknown>[], columns: string[], opts: { header?: boolean; delimiter?: string } = {}): string {
  const delimiter = opts.delimiter || ',';
  const header = opts.header !== false;
  let out = '';
  if (header) {
    out += columns.map(escapeCSV).join(delimiter) + '\n';
  }
  for (const row of rows) {
    out += columns.map(col => escapeCSV(row[col])).join(delimiter) + '\n';
  }
  return out.trimEnd();
}

export function renderJSON(rows: Record<string, unknown>[]): string {
  return JSON.stringify(rows, null, 2);
}

export function renderText(values: (string | number | boolean | null | undefined)[]): string {
  return values.map(v => v == null ? '' : String(v)).join('\n');
}

export function renderXML(rows: Record<string, unknown>[], rootName = 'root', rowName = 'row'): string {
  let out = `<${rootName}>`;
  for (const row of rows) {
    out += `<${rowName}>`;
    for (const [k, v] of Object.entries(row)) {
      out += `<${k}>${escapeXML(v)}</${k}>`;
    }
    out += `</${rowName}>`;
  }
  out += `</${rootName}>`;
  return out;
}

function escapeXML(val: unknown): string {
  if (val == null) return '';
  return String(val).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
}
