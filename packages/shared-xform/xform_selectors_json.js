"use strict";
// xform_selectors_json.ts
// JMESPath evaluation helpers for JSON input
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectRows = selectRows;
exports.evalExpr = evalExpr;
const jmespath_1 = __importDefault(require("jmespath"));
function toJmes(e) {
    if (!e)
        return e;
    if (e === '$' || e === '$.')
        return '';
    let out = e;
    if (e.startsWith('$.'))
        out = e.slice(2);
    else if (e.startsWith('$'))
        out = e.slice(1);
    out = out.replace(/\[\]/g, '[*]');
    return out;
}
function selectRows(doc, rootExpr) {
    const jmesExpr = toJmes(rootExpr);
    if (jmesExpr === '' || jmesExpr === undefined)
        return Array.isArray(doc) ? doc : [doc];
    const result = jmespath_1.default.search(doc, jmesExpr);
    // Be tolerant: if result is not an array, wrap it into one instead of throwing.
    return Array.isArray(result) ? result : [result];
}
function evalExpr(row, expr) {
    if (expr === '$' || expr === '$.')
        return row;
    const jmes = toJmes(expr);
    if (jmes === '' || jmes === undefined)
        return row;
    return jmespath_1.default.search(row, jmes);
}
