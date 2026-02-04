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
function selectRows(doc, rootExpr) {
    const result = jmespath_1.default.search(doc, rootExpr);
    if (!Array.isArray(result)) {
        throw new Error(`JMESPath root expression must resolve to an array. Got: ${typeof result}`);
    }
    return result;
}
function evalExpr(row, expr) {
    // Evaluate JMESPath expression relative to row
    return jmespath_1.default.search(row, expr);
}
