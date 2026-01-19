"use strict";
// xform_renderers.ts
// Output renderers for CSV, JSON, Text, XML
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderCSV = renderCSV;
exports.renderJSON = renderJSON;
exports.renderText = renderText;
exports.renderXML = renderXML;
function escapeCSV(val) {
    if (val == null)
        return '';
    const s = String(val);
    if (/[,"\n]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}
function renderCSV(rows, columns, opts = {}) {
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
function renderJSON(rows) {
    return JSON.stringify(rows, null, 2);
}
function renderText(values) {
    return values.map(v => v == null ? '' : String(v)).join('\n');
}
function renderXML(rows, rootName = 'root', rowName = 'row') {
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
function escapeXML(val) {
    if (val == null)
        return '';
    return String(val).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
}
