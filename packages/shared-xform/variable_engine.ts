
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
        return this.resolveGlobal(path.substring(7), path);
    }
    
    // 2. Explicit workflow
    if (path.startsWith('workflow.')) {
        return this.getValue(this.context.workflow, path.substring(9));
    }

    // 3. Explicit task
    if (path.startsWith('task.')) {
        return this.getValue(this.context.task, path.substring(5));
    }

    // 4. Precedence: task -> workflow -> global -> macros -> literal
    let val = this.getValue(this.context.task, path);
    if (val !== undefined) return val;

    val = this.getValue(this.context.workflow, path);
    if (val !== undefined) {
         // If workflow var is a template string, should we recurse?
         // Spec mentions cycles in "workflow defaults". 
         // Assuming if it looks like a template, we try to resolve it.
         if (typeof val === 'string' && val.includes('{{')) {
             return this.resolveRecursive(val, path);
         }
         return val;
    }

    val = this.resolveGlobal(path, path); // Implicit global lookup
    if (val !== undefined) return val;
    
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
    if (!obj) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
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
      default: 
        if (name.startsWith('HTTP.')) {
            // Support HTTP.<taskName>.status, HTTP.<taskName>.body.path, HTTP.last.body
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
      default: return value;
    }
  }
  
  private formatResult(value: any): string {
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
  }
}
