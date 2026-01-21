"use strict";
// xform_selectors_xml.ts
// XPath helpers for XML input using xmldom + xpath
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectNodes = selectNodes;
exports.evalXPath = evalXPath;
const xmldom_1 = require("xmldom");
const xpath_1 = __importDefault(require("xpath"));
function selectNodes(xmlText, rootXPath) {
    const doc = new xmldom_1.DOMParser().parseFromString(xmlText, 'text/xml');
    const nodes = xpath_1.default.select(rootXPath, doc);
    if (!Array.isArray(nodes)) {
        throw new Error(`XPath root must resolve to a node array. Got: ${typeof nodes}`);
    }
    return nodes;
}
function evalXPath(node, expr) {
    return xpath_1.default.select(expr, node);
}
