// xform_selectors_html.ts
// HTML helpers using cheerio

import * as cheerio from 'cheerio';

export function selectNodes(htmlText: string, rootCss: string) {
  const $ = cheerio.load(htmlText);
  return $(rootCss).toArray().map(el => $(el));
}

export function evalRelative($row: cheerio.Cheerio, expr: string): string | number | boolean {
  // $row is a Cheerio instance
  // Example: td:nth-child(2)
  const el = $row.find(expr);
  return el.text();
}
