// xform_engine.ts
import { TransformSpec } from './xform_schema';
import { validateSpecYaml } from './xform_validation';
import { interpolateExpr } from './xform_vars';
import { selectRows, evalExpr } from './xform_selectors_json';
import { selectNodes as selectXmlNodes, evalXPath } from './xform_selectors_xml';
import { selectNodes as selectHtmlNodes, evalRelative } from './xform_selectors_html';
import { renderCSV, renderJSON, renderText, renderXML } from './xform_renderers';
import yaml from 'yaml';
export async function transform(spec, input, vars = {}, options = {}) { /* ...as previously generated... */ }
export function validateSpec(specYaml) { /* ...as previously generated... */ }
export function detectInputTypeFromSpec(spec) { /* ...as previously generated... */ }
