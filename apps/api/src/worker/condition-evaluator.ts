import { Injectable, Logger } from '@nestjs/common';
import { VariableEngine } from '../../../../packages/shared-xform/variable_engine';

export interface Condition {
  variable: string;
  op: string;
  value: any;
  valueType?: string;
}

export interface ConditionGroup {
  operator: 'AND' | 'OR';
  conditions: Condition[];
}

@Injectable()
export class ConditionEvaluator {
  private readonly logger = new Logger(ConditionEvaluator.name);

  /**
   * Evaluates a set of condition groups against the provided context.
   * Groups are implicitly joined by OR.
   */
  evaluate(
    groups: any[],
    context: any
  ): { result: boolean; trace: any[] } {
    const engine = new VariableEngine(context);
    const trace: any[] = [];
    
    if (!groups || groups.length === 0) {
      return { result: true, trace: [{ message: 'No conditions defined, defaulting to TRUE' }] };
    }

    let finalResult = false;

    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const groupResults = [];
        const groupTrace = [];

        for (const cond of group.conditions) {
            // Strip {{ }} if present
            let varPath = cond.variable || '';
            if (varPath.startsWith('{{') && varPath.endsWith('}}')) {
                varPath = varPath.substring(2, varPath.length - 2);
            }
            
            const resolvedValue = engine.evaluateExpression(varPath);
            const passed = this.compare(resolvedValue, cond.operator || cond.op, cond.value);
            
            groupResults.push(passed);
            groupTrace.push({
                variable: cond.variable,
                resolvedValue,
                op: cond.operator || cond.op,
                expectedValue: cond.value,
                passed
            });
        }

        const logicalOp = group.logicalOperator || group.operator || 'AND';
        const groupPassed = logicalOp === 'OR' 
            ? groupResults.some(r => r === true)
            : groupResults.every(r => r === true);

        trace.push({
            groupId: i,
            operator: logicalOp,
            conditions: groupTrace,
            passed: groupPassed
        });

        if (groupPassed) {
            finalResult = true;
        }
    }

    return { result: finalResult, trace };
  }

  private compare(actual: any, op: string, expected: any): boolean {
    // Handle null/undefined
    if (actual === undefined || actual === null) {
        if (op === 'is_empty' || op === '== null') return expected === true;
        if (op === 'is_not_empty' || op === 'exists') return false;
        if (op === '!=') return expected !== null && expected !== undefined;
        return false;
    }

    switch (op) {
      case '==':
      case 'equals':
        return String(actual) == String(expected);
      case '!=':
      case 'not_equals':
        return String(actual) != String(expected);
      case '>':
        return Number(actual) > Number(expected);
      case '>=':
        return Number(actual) >= Number(expected);
      case '<':
        return Number(actual) < Number(expected);
      case '<=':
        return Number(actual) <= Number(expected);
      case 'contains':
        if (Array.isArray(actual)) return actual.includes(expected);
        return String(actual).includes(String(expected));
      case 'not_contains':
        if (Array.isArray(actual)) return !actual.includes(expected);
        return !String(actual).includes(String(expected));
      case 'regex':
      case 'matches_regex':
        try {
            // Use 's' flag so that dot matches newlines, and 'i' for case-insensitivity which is generally expected for filters
            const re = new RegExp(expected, 'si');
            return re.test(String(actual));
        } catch (e) {
            return false;
        }
      case 'exists':
      case 'is_not_empty':
        if (Array.isArray(actual)) return actual.length > 0;
        if (typeof actual === 'string') return actual.trim() !== '';
        return true;
      case 'is_empty':
        if (Array.isArray(actual)) return actual.length === 0;
        if (typeof actual === 'string') return actual.trim() === '';
        return false;
      default:
        return false;
    }
  }

  /**
   * Helper for raw JMESPath expressions
   */
  evaluateRaw(expression: string, context: any): boolean {
    const engine = new VariableEngine(context);
    try {
        const result = engine.evaluateExpression(expression);
        return !!result;
    } catch (e) {
        return false;
    }
  }
}
