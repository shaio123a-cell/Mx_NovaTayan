"use strict";
// xform_engine.ts
// Main transform engine for YAML DSL
Object.defineProperty(exports, "__esModule", { value: true });
exports.transform = transform;
exports.validateSpec = validateSpec;
exports.detectInputTypeFromSpec = detectInputTypeFromSpec;
const xform_validation_1 = require("./xform_validation");
const xform_vars_1 = require("./xform_vars");
const xform_selectors_json_1 = require("./xform_selectors_json");
const xform_selectors_xml_1 = require("./xform_selectors_xml");
const xform_selectors_html_1 = require("./xform_selectors_html");
const xform_renderers_1 = require("./xform_renderers");
async function transform(spec, input, vars = {}, options = {}) {
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
    const paramTypes = {};
    spec.parameters?.forEach(p => { if (p.name)
        paramTypes[p.name] = p.type || 'any'; });
    // Parse input
    let rows = [];
    let inputType = detectInputTypeFromSpec(spec);
    let doc;
    if (inputType === 'json') {
        doc = typeof input === 'string' ? JSON.parse(input) : JSON.parse(Buffer.from(input).toString('utf8'));
        rows = (0, xform_selectors_json_1.selectRows)(doc, spec.input.root);
    }
    else if (inputType === 'xml') {
        const xmlText = typeof input === 'string' ? input : Buffer.from(input).toString('utf8');
        rows = (0, xform_selectors_xml_1.selectNodes)(xmlText, spec.input.root);
    }
    else if (inputType === 'html') {
        const htmlText = typeof input === 'string' ? input : Buffer.from(input).toString('utf8');
        rows = (0, xform_selectors_html_1.selectNodes)(htmlText, spec.input.root);
    }
    else {
        throw new Error('Unknown input type');
    }
    // Apply filters
    if (spec.filters && spec.filters.length > 0) {
        rows = rows.filter((row, idx) => {
            return spec.filters.every(f => {
                try {
                    const expr = (0, xform_vars_1.interpolateExpr)(f.expr, vars, inputType === 'json' ? 'jmespath' : inputType === 'xml' ? 'xpath' : 'css', paramTypes);
                    if (inputType === 'json')
                        return !!(0, xform_selectors_json_1.evalExpr)(row, expr);
                    if (inputType === 'xml')
                        return !!(0, xform_selectors_xml_1.evalXPath)(row, expr);
                    if (inputType === 'html')
                        return !!(0, xform_selectors_html_1.evalRelative)(row, expr);
                }
                catch (e) {
                    return false;
                }
            });
        });
    }
    // Build records
    let records = [];
    for (const row of rows) {
        const rec = {};
        for (const m of spec.mappings) {
            try {
                const expr = (0, xform_vars_1.interpolateExpr)(m.expr, vars, inputType === 'json' ? 'jmespath' : inputType === 'xml' ? 'xpath' : 'css', paramTypes);
                let val;
                if (inputType === 'json')
                    val = (0, xform_selectors_json_1.evalExpr)(row, expr);
                else if (inputType === 'xml')
                    val = (0, xform_selectors_xml_1.evalXPath)(row, expr);
                else if (inputType === 'html')
                    val = (0, xform_selectors_html_1.evalRelative)(row, expr);
                // Type coercion
                if (m.type === 'number')
                    val = Number(val);
                else if (m.type === 'boolean')
                    val = Boolean(val);
                else if (m.type === 'string')
                    val = val == null ? '' : String(val);
                rec[m.name] = val;
            }
            catch (e) {
                if (spec.defaults?.on_missing === 'error')
                    throw new Error(`Mapping error for ${m.name}: ${e}`);
                if (spec.defaults?.on_missing === 'skip_row')
                    continue;
                rec[m.name] = null;
            }
        }
        records.push(rec);
        if (options.previewLimit && records.length >= options.previewLimit)
            break;
    }
    // Render output
    if (spec.output.type === 'csv') {
        const columns = spec.mappings.map(m => m.name);
        return (0, xform_renderers_1.renderCSV)(records, columns, spec.output.options || {});
    }
    else if (spec.output.type === 'json') {
        return (0, xform_renderers_1.renderJSON)(records);
    }
    else if (spec.output.type === 'text') {
        // Only one mapping allowed
        const col = spec.mappings[0].name;
        return (0, xform_renderers_1.renderText)(records.map(r => r[col]));
    }
    else if (spec.output.type === 'xml') {
        return (0, xform_renderers_1.renderXML)(records);
    }
    throw new Error('Unknown output type');
}
function validateSpec(specYaml) {
    return (0, xform_validation_1.validateSpecYaml)(specYaml);
}
function detectInputTypeFromSpec(spec) {
    return spec.input.type;
}
