
import { v4 as uuidv4 } from 'uuid';

export interface VariableContext {
  task?: Record<string, any>;
  workflow?: Record<string, any>;
  global?: Record<string, any>;
  macros?: Record<string, any>;
  [key: string]: any;
}

export interface ResolveOptions {
  maskSecrets?: boolean;
}

export class VariableEngine {
  private context: VariableContext;
  private resolvingStack: Set<string> = new Set();

  constructor(context: VariableContext) {
    this.context = context;
  }

  // Main entry point
  public resolve(template: string, options?: ResolveOptions): string {
    if (!template) return '';
    if (typeof template !== 'string') return String(template);
    
    // If no placeholders, return as is
    if (!template.includes('{{')) return template;

    return template.replace(/{{\s*(.+?)\s*}}/g, (match, expression) => {
      try {
        const result = this.evaluateExpression(expression);
        return this.formatResult(result);
      } catch (e: any) {
        if (e.message && e.message.startsWith('E_VAR_CYCLE')) {
            throw e; // Propagate cycle error
        }
        // Spec: "Preview: warn, leave token unresolved. Runtime: throw E_VAR_NOT_FOUND"
        console.warn(`Failed to resolve variable: ${expression}`, e);
        return match; // Leave as is
      }
    });
  }

  /**
   * Resolves a value that could be a string template or a UI configuration object.
   * Handles standard modes: static, variable, parent.
   */
  public resolveValue(val: any, defaultKey?: string): any {
    if (val === null || val === undefined) return val;
    
    // 1. Handle common string templates
    if (typeof val === 'string') {
        // Optimization: If it's a pure {{expr}}, return the raw result (e.g. object/array)
        const match = val.match(/^\{\{\s*(.*?)\s*\}\}$/);
        if (match) {
            return this.evaluateExpression(match[1].trim());
        }
        // Otherwise resolve as a string template (interpolated)
        return this.resolve(val);
    }

    // 2. Handle UI configuration objects
    if (typeof val === 'object' && !Array.isArray(val)) {
        const mode = val.valueMode;
        if (mode === 'static') {
            const staticVal = val.value;
            // Static values might still contain templates
            return typeof staticVal === 'string' ? this.resolve(staticVal) : staticVal;
        }
        if (mode === 'variable') {
            return this.evaluateExpression(val.value);
        }
        if (mode === 'parent' && val.useParentInput) {
            // Use provided 'value' field (target variable name) or fallback to defaultKey
            const lookupKey = val.value || defaultKey;
            return this.evaluateExpression(lookupKey);
        }
        // Fallback for objects that aren't config objects but have a 'value' field (legacy)
        if (val.hasOwnProperty('value') && Object.keys(val).length <= 2) {
            return val.value;
        }
    }

    return val;
  }

  public evaluateExpression(expression: string): any {
    // 1. Check for helpers (pipe)
    const pipeParts = expression.split('|').map(s => s.trim());
    let valueStr = pipeParts[0];
    
    // Evaluate the initial value
    let value = this.resolvePath(valueStr);

    // Apply pipes
    for (let i = 1; i < pipeParts.length; i++) {
        const pipe = pipeParts[i];
        value = this.applyHelper(value, pipe);
    }
    
    return value;
  }

  private resolvePath(path: string): any {
    // 1. Explicit global
    if (path.startsWith('global.')) {
        const val = this.resolveGlobal(path.substring(7), path);
        if (val !== undefined) return val;
    }
    
    // 2. Explicit workflow
    if (path.startsWith('workflow.')) {
        const val = this.getValue(this.context.workflow, path.substring(9));
        if (val !== undefined) return val;
    }

    // 3. Explicit task
    if (path.startsWith('task.')) {
        const val = this.getValue(this.context.task, path.substring(5));
        if (val !== undefined) return val;
    }

    // 4. Precedence: task -> workflow -> global -> macros -> literal
    let val = this.getValue(this.context.task, path);
    if (val !== undefined) return val;

    val = this.getValue(this.context.workflow, path);
    if (val !== undefined) {
         if (typeof val === 'string' && val.includes('{{')) {
             return this.resolveRecursive(val, path);
         }
         return val;
    }

    val = this.resolveGlobal(path, path);
    if (val !== undefined) return val;

    // 5. NEW: Handle arbitrary namespaces from the context (e.g. 'body.xxx', 'request.xxx')
    const firstPart = path.split('.')[0];
    if (this.context[firstPart] !== undefined) {
        if (path === firstPart) {
            return this.context[firstPart];
        } else {
            const result = this.getValue(this.context[firstPart], path.substring(firstPart.length + 1));
            if (result !== undefined) return result;
        }
    }
    
    // 6. Fallback to macros (this handles Task.X, HTTP.X, and workflow.X if not in vars)
    val = this.getMacro(path);
    if (val !== undefined) return val;

    return undefined;
  }

  private resolveGlobal(key: string, fullPath: string): any {
     const raw = this.getValue(this.context.global, key);
     if (raw === undefined) return undefined;

     // Recursion if string contains {{
     if (typeof raw === 'string' && raw.includes('{{')) {
         return this.resolveRecursive(raw, fullPath);
     }
     return raw;
  }

  private resolveRecursive(template: string, pathInfo: string): any {
      if (this.resolvingStack.has(pathInfo)) {
          throw new Error(`E_VAR_CYCLE: Cycle detected: ${Array.from(this.resolvingStack).join(' -> ')} -> ${pathInfo}`);
      }
      this.resolvingStack.add(pathInfo);
      try {
          return this.resolve(template);
      } finally {
          this.resolvingStack.delete(pathInfo);
      }
  }

  private getValue(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') return undefined;

    // 1. Try exact match first (the most common case)
    if (path in obj) return obj[path];

    // 2. Try trimmed exact match (robustness against leading/trailing spaces in DB)
    const trimmedPath = path.trim();
    if (trimmedPath !== path && trimmedPath in obj) return obj[trimmedPath];

    // 3. Greedy matching for keys with dots (e.g. 'WF 2.0')
    const parts = path.split('.');
    let current = obj;
    let i = 0;
    
    while (i < parts.length) {
      let found = false;
      // Try to find the longest matching prefix starting from current index i
      for (let j = parts.length; j > i; j--) {
        const candidate = parts.slice(i, j).join('.');
        if (current && typeof current === 'object') {
            if (candidate in current) {
                current = current[candidate];
                i = j;
                found = true;
                break;
            }
            // Also try trimmed candidate
            const trimmedCandidate = candidate.trim();
            if (trimmedCandidate !== candidate && trimmedCandidate in current) {
                current = current[trimmedCandidate];
                i = j;
                found = true;
                break;
            }
        }
      }
      
      if (!found) return undefined;
    }
    
    return current;
  }

  private getMacro(name: string): any {
    // Standardize name: allow both "now" and "global.now" to resolve to the same macro
    let lowerName = name.startsWith('global.') ? name.substring(7) : name;
    lowerName = lowerName.toLowerCase();

    // 1. DYNAMIC ARITHMETIC (e.g., now-5m, epoch+1h, today-2d)
    const arithmeticMatch = lowerName.match(/^(now|epoch|epochms|epochsec|today|yesterday|tomorrow)([+\-])(\d+)([smhd])$/);
    if (arithmeticMatch) {
        const [_, base, op, val, unit] = arithmeticMatch;
        let date = new Date();
        
        // Adjust for tomorrow/yesterday bases
        if (base === 'yesterday') date.setDate(date.getDate() - 1);
        if (base === 'tomorrow') date.setDate(date.getDate() + 1);

        const amount = parseInt(val) * (op === '-' ? -1 : 1);
        const msPerUnit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit as 's'|'m'|'h'|'d'];
        date = new Date(date.getTime() + (amount * msPerUnit));

        if (base.startsWith('epoch')) {
            const ts = date.getTime();
            return (base === 'epochms') ? ts : Math.floor(ts / 1000);
        }
        if (base === 'today' || base === 'yesterday' || base === 'tomorrow') {
            return date.toISOString().split('T')[0];
        }
        return date.toISOString();
    }

    // 2. CONTEXT MACROS (Strictly prioritize non-empty values)
    if (this.context.macros) {
        const val1 = this.context.macros[lowerName];
        if (val1 !== undefined && val1 !== null && val1 !== '') return val1;
        const val2 = this.context.macros[name];
        if (val2 !== undefined && val2 !== null && val2 !== '') return val2;
    }

    // 3. SYSTEM MACROS (Standard)
    switch (lowerName) {
      case 'now': return new Date().toISOString();
      case 'now_fs': return new Date().toISOString().replace(/[:.]/g, '-');
      case 'epoch': 
      case 'epochsec': return Math.floor(Date.now() / 1000);
      case 'epochms': return Date.now();
      case 'uuid': 
      case 'guid': return uuidv4();
      case 'random_hex': return Math.random().toString(16).substring(2, 10);
      case 'today': return new Date().toISOString().split('T')[0];
      case 'yesterday': {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
      }
      case 'tomorrow': {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      }
      case 'random': return Math.floor(Math.random() * 1000000);
      case 'env': return process.env.NODE_ENV || 'production';
      case 'appver': return '0.1.0'; 
      case 'region': return process.env.REGION || 'local';
      case 'task.name': return this.context.task?.name || this.context.macros?.['task.name'];
      case 'task.id': return this.context.task?.id || this.context.macros?.['task.id'];
      case 'workflow.name': return this.context.workflow?.name || this.context.macros?.['workflow.name'];
      case 'workflow.id': return this.context.workflow?.id || this.context.macros?.['workflow.id'];
      case 'workflow.executionid': return this.context.workflow?.executionId || this.context.macros?.['workflow.executionId'];
      case 'workflow.lastexecutionepoch': return this.context.workflow?.lastExecutionEpoch || this.context.macros?.['workflow.lastExecutionEpoch'];
      case 'workflow.lastsuccessepoch': return this.context.workflow?.lastSuccessEpoch || this.context.macros?.['workflow.lastSuccessEpoch'];
      case 'workflow.lastfailedepoch': return this.context.workflow?.lastFailedEpoch || this.context.macros?.['workflow.lastFailedEpoch'];
      case 'workflow.lastcancelledepoch': return this.context.workflow?.lastCancelledEpoch || this.context.macros?.['workflow.lastCancelledEpoch'];
      case 'workflow.lastsuccessduration': return this.context.workflow?.lastSuccessDuration || this.context.macros?.['workflow.lastSuccessDuration'];
      default: 
        if (lowerName.startsWith('http.')) {
            return this.getValue(this.context.macros, lowerName.substring(5));
        }
        if (lowerName.startsWith('task.')) {
            return this.getValue(this.context.macros, lowerName.substring(5));
        }
        return undefined;
    }
  }

  private applyHelper(value: any, helperSig: string): any {
    // helper:param1,param2
    const parts = helperSig.split(':');
    const helperName = parts[0].trim();
    const argsString = parts.slice(1).join(':').trim();
    const args = argsString ? argsString.split(',').map(s => s.trim()) : [];

    switch (helperName) {
      case 'upper': return String(value).toUpperCase();
      case 'lower': return String(value).toLowerCase();
      case 'length': {
          if (Array.isArray(value)) return value.length;
          if (typeof value === 'object' && value !== null) return Object.keys(value).length;
          return String(value || '').length;
      }
      case 'countWords': {
          const s = String(value || '').trim();
          if (!s) return 0;
          return s.split(/\s+/).length;
      }
      case 'countMatches': {
          const s = String(value || '');
          const match = argsString.trim();
          if (!match || !s) return 0;
          // Escape regex special chars in match string to avoid errors if searching for things like '.'
          const escaped = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return (s.match(new RegExp(escaped, 'g')) || []).length;
      }
      case 'countUnique': {
          if (!Array.isArray(value)) return 0;
          return new Set(value).size;
      }
      case 'count': {
          if (Array.isArray(value)) return value.length;
          const s = String(value || '').trim();
          if (!s) return 0;
          return s.split(/\s+/).length;
      }
      case 'sum': {
          if (!Array.isArray(value)) return 0;
          return value.reduce((a, b) => a + (Number(b) || 0), 0);
      }
      case 'avg': {
          if (!Array.isArray(value) || value.length === 0) return 0;
          const sum = value.reduce((a, b) => a + (Number(b) || 0), 0);
          return sum / value.length;
      }
      case 'min': {
          if (!Array.isArray(value) || value.length === 0) return 0;
          return Math.min(...value.map(v => Number(v) || 0));
      }
      case 'max': {
          if (!Array.isArray(value) || value.length === 0) return 0;
          return Math.max(...value.map(v => Number(v) || 0));
      }
      case 'math': {
          // Usage: | math: * 1.15  or  | math: + 10
          const expr = argsString.trim();
          const val = Number(value) || 0;
          if (!expr) return val;
          try {
              // Basic sanitization: only allow math operators and numbers
              if (!/^[+\-*/%().0-9\s]+$/.test(expr)) return val;
              // Prepend value if it starts with an operator
              const fullExpr = /^[+\-*/%]/.test(expr) ? `${val} ${expr}` : expr;
              // eslint-disable-next-line no-eval
              return eval(fullExpr);
          } catch (e) {
              return val;
          }
      }
      case 'abs': return Math.abs(Number(value) || 0);
      case 'round': return Math.round(Number(value) || 0);
      case 'ceil': return Math.ceil(Number(value) || 0);
      case 'floor': return Math.floor(Number(value) || 0);
      case 'xpath': {
          try {
              const { selectNodes, evalXPath } = require('./xform_selectors_xml');
              const xmlText = typeof value === 'string' ? value : JSON.stringify(value);
              // If args[0] is root and args[1] is selection
              const root = args[1] ? args[0] : '/*';
              const selector = args[1] || args[0];
              const nodes = selectNodes(xmlText, root);
              if (nodes && nodes.length > 0) {
                  const res = evalXPath(nodes[0], selector);
                  return typeof res === 'object' ? JSON.stringify(res) : String(res);
              }
              return '';
          } catch (e) {
              return '';
          }
      }
      case 'jsonPath': 
        try {
            const jmespath = require('jmespath');
            return jmespath.search(value, argsString);
        } catch (e) {
            return value;
        }
      case 'coalesce':
        if (value !== null && value !== undefined && value !== '') return value;
        for (const arg of args) {
             const fallback = this.resolvePath(arg); // Resolve args as variables
             if (fallback !== null && fallback !== undefined && fallback !== '') return fallback;
        }
        return null;
      case 'trim': return String(value || '').trim();
      case 'mask': {
          const s = String(value || '');
          const n = Number(args[0]) || 4;
          if (s.length <= n) return s;
          return '*'.repeat(s.length - n) + s.slice(-n);
      }
      case 'first': return Array.isArray(value) ? value[0] : value;
      case 'last': return Array.isArray(value) ? value[value.length - 1] : value;
      case 'join': {
          const sep = args[0] || ', ';
          return Array.isArray(value) ? value.join(sep) : value;
      }
      case 'toJson': return JSON.stringify(value, null, 2);
      case 'fromJson': try { return typeof value === 'string' ? JSON.parse(value) : value; } catch(e) { return value; }
      case 'base64enc':
      case 'base64Encode': return typeof Buffer !== 'undefined' ? Buffer.from(String(value)).toString('base64') : btoa(String(value));
      case 'base64dec':
      case 'base64Decode': return typeof Buffer !== 'undefined' ? Buffer.from(String(value), 'base64').toString('utf8') : atob(String(value));
      case 'urlenc': return encodeURIComponent(String(value));
      case 'md5':
           try {
              if (typeof require !== 'undefined') {
                 const nodeCrypto = require('crypto');
                 return nodeCrypto.createHash('md5').update(String(value)).digest('hex');
              }
           } catch (e) {}
           return 'md5_unavailable'; 
      case 'sha256': 
          try {
             if (typeof require !== 'undefined') {
                const nodeCrypto = require('crypto');
                return nodeCrypto.createHash('sha256').update(String(value)).digest('hex');
             }
          } catch (e) {}
          return 'sha256_unavailable'; 
      case 'startOf': {
          if (!value) return '';
          const d = new Date(value);
          if (isNaN(d.getTime())) return value;
          const unit = (args[0] || 'day').toLowerCase();
          if (unit === 'year') d.setMonth(0, 1);
          else if (unit === 'month') d.setDate(1);
          else if (unit === 'day') d.setHours(0, 0, 0, 0);
          else if (unit === 'hour') d.setMinutes(0, 0, 0);
          return d.toISOString();
      }
      case 'formatDate': {
          if (!value) return '';
          let d: Date;
          if (typeof value === 'number' || !isNaN(Number(value))) {
              const num = Number(value);
              d = new Date(num < 10000000000 ? num * 1000 : num);
          } else {
              d = new Date(value);
          }
          if (isNaN(d.getTime())) return String(value);
          
          const format = args[0] || 'YYYY-MM-DD HH:mm:ss';
          const pad = (n: number) => n.toString().padStart(2, '0');
          
          return format
              .replace(/YYYY/g, d.getFullYear().toString())
              .replace(/MM/g, pad(d.getMonth() + 1))
              .replace(/DD/g, pad(d.getDate()))
              .replace(/HH/g, pad(d.getHours()))
              .replace(/mm/g, pad(d.getMinutes()))
              .replace(/ss/g, pad(d.getSeconds()))
              .replace(/SSS/g, d.getMilliseconds().toString().padStart(3, '0'));
      }
      case 'toEpoch': {
          if (!value) return 0;
          const d = new Date(value);
          if (isNaN(d.getTime())) return 0;
          const mode = args[0] || 's'; // s or ms
          return mode === 'ms' ? d.getTime() : Math.floor(d.getTime() / 1000);
      }
      default: return value;
    }
  }
  
  private formatResult(value: any): string {
      if (value === undefined || value === null) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
  }
}
