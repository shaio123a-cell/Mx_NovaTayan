import { Cheerio, Element } from 'cheerio';
export declare function selectNodes(htmlText: string, rootCss: string): Element[];
export declare function evalRelative($row: Cheerio, expr: string): string | number | boolean;
