
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
    
    // 5. Fallback to macros (this handles Task.X, HTTP.X, and workflow.X if not in vars)
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
    // Check custom macros in context?
    if (this.context.macros && name in this.context.macros) return this.context.macros[name];

    // System macros
    switch (name) {
      case 'now': return new Date().toISOString();
      case 'epoch': return Math.floor(Date.now() / 1000);
      case 'epochMs': return Date.now();
      case 'uuid': return uuidv4();
      case 'env': return process.env.NODE_ENV || 'production';
      case 'appVer': return '0.1.0'; 
      case 'region': return process.env.REGION || 'local';
      case 'task.name': return this.context.task?.name || this.context.macros?.['task.name'];
      case 'task.id': return this.context.task?.id || this.context.macros?.['task.id'];
      case 'workflow.name': return this.context.workflow?.name || this.context.macros?.['workflow.name'];
      case 'workflow.id': return this.context.workflow?.id || this.context.macros?.['workflow.id'];
      case 'workflow.executionId': return this.context.workflow?.executionId || this.context.macros?.['workflow.executionId'];
      case 'workflow.lastExecutionEpoch': return this.context.workflow?.lastExecutionEpoch || this.context.macros?.['workflow.lastExecutionEpoch'];
      case 'workflow.lastSuccessEpoch': return this.context.workflow?.lastSuccessEpoch || this.context.macros?.['workflow.lastSuccessEpoch'];
      case 'workflow.lastFailedEpoch': return this.context.workflow?.lastFailedEpoch || this.context.macros?.['workflow.lastFailedEpoch'];
      case 'workflow.lastCancelledEpoch': return this.context.workflow?.lastCancelledEpoch || this.context.macros?.['workflow.lastCancelledEpoch'];
      case 'workflow.lastSuccessDuration': return this.context.workflow?.lastSuccessDuration || this.context.macros?.['workflow.lastSuccessDuration'];
      default: 
        if (name.startsWith('HTTP.')) {
            // Support HTTP.<taskName>.status, HTTP.<taskName>.body.path, HTTP.last.body, HTTP.<taskName>.duration
            return this.getValue(this.context.macros, name.substring(5));
        }
        if (name.startsWith('Task.')) {
            // Support Task.<taskName>.status, Task.<taskName>.duration, Task.<taskName>.lastSuccessDuration
            return this.getValue(this.context.macros, name.substring(5));
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
      case 'toJson': return JSON.stringify(value, null, 2);
      case 'fromJson': try { return typeof value === 'string' ? JSON.parse(value) : value; } catch(e) { return value; }
      case 'base64enc': return typeof Buffer !== 'undefined' ? Buffer.from(String(value)).toString('base64') : btoa(String(value));
      case 'urlenc': return encodeURIComponent(String(value));
      case 'sha256': 
          try {
             if (typeof require !== 'undefined') {
                const nodeCrypto = require('crypto');
                return nodeCrypto.createHash('sha256').update(String(value)).digest('hex');
             }
          } catch (e) {}
          return 'sha256_unavailable'; 
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
