"use strict";
// xform_selectors_html.ts
// HTML helpers using cheerio
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectNodes = selectNodes;
exports.evalRelative = evalRelative;
const cheerio_1 = __importDefault(require("cheerio"));
function selectNodes(htmlText, rootCss) {
    const $ = cheerio_1.default.load(htmlText);
    const nodes = $(rootCss).toArray();
    if (!Array.isArray(nodes)) {
        throw new Error(`CSS root must resolve to an array of elements. Got: ${typeof nodes}`);
    }
    return nodes;
}
function evalRelative($row, expr) {
    // Only allow text extraction paths
    // Example: td:nth-child(2)
    const el = $row.find(expr);
    return el.text();
}
