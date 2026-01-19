// xform_selectors_xml.ts
// XPath helpers for XML input using xmldom + xpath

import { DOMParser } from 'xmldom';
import xpath from 'xpath';

export function selectNodes(xmlText: string, rootXPath: string): Node[] {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const nodes = xpath.select(rootXPath, doc);
  if (!Array.isArray(nodes)) {
    throw new Error(`XPath root must resolve to a node array. Got: ${typeof nodes}`);
  }
  return nodes as Node[];
}

export function evalXPath(node: Node, expr: string): string | number | boolean | Node | Node[] {
  return xpath.select(expr, node) as any;
}
