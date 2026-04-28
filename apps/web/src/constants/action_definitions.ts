import { 
    Calculator, Type, Hash, Clock, Code, List, Settings, Search, Box, Workflow, Zap 
} from 'lucide-react';

export interface ActionItem {
    id: string;
    label: string;
    description: string;
    icon: any;
    category: 'math' | 'string' | 'collection' | 'date' | 'conversion' | 'advanced';
    template: string; 
}

export const ACTION_CATEGORIES = [
    { id: 'math', label: 'Math & Logic', icon: Calculator, color: 'text-blue-500' },
    { id: 'string', label: 'Text & String', icon: Type, color: 'text-orange-500' },
    { id: 'collection', label: 'Arrays & Lists', icon: List, color: 'text-purple-500' },
    { id: 'date', label: 'Date & Time', icon: Clock, color: 'text-emerald-500' },
    { id: 'conversion', label: 'Format Conversion', icon: Code, color: 'text-pink-500' },
    { id: 'advanced', label: 'Advanced Selectors', icon: Settings, color: 'text-slate-500' },
];

export const ACTIONS: ActionItem[] = [
    // Collection / Counting
    { id: 'length', label: 'Length / Size', description: 'Count total characters or array size', icon: Hash, category: 'collection', template: 'length' },
    { id: 'countWords', label: 'Count Words', description: 'Calculate number of words', icon: Type, category: 'string', template: 'countWords' },
    { id: 'countMatches', label: 'Occurrence Count', description: 'Count matches for a word/char', icon: Search, category: 'string', template: 'countMatches: ' },
    { id: 'countUnique', label: 'Unique Items', description: 'Count distinct values in list', icon: List, category: 'collection', template: 'countUnique' },

    // Math
    { id: 'sum', label: 'Sum', description: 'Calculate total of numbers', icon: Calculator, category: 'math', template: 'sum' },
    { id: 'avg', label: 'Average', description: 'Calculate mean value', icon: Calculator, category: 'math', template: 'avg' },
    { id: 'math', label: 'Manual Math', description: 'Perform custom calculation (+ 10)', icon: Settings, category: 'math', template: 'math: ' },
    { id: 'round', label: 'Round Number', description: 'Round to nearest integer', icon: Hash, category: 'math', template: 'round' },
    { id: 'abs', label: 'Absolute', description: 'Convert to positive number', icon: Hash, category: 'math', template: 'abs' },

    // String
    { id: 'upper', label: 'To Uppercase', description: 'CONVERT TO UPPER', icon: Type, category: 'string', template: 'upper' },
    { id: 'lower', label: 'To Lowercase', description: 'convert to lower', icon: Type, category: 'string', template: 'lower' },

    // Date
    { id: 'formatDate', label: 'Format Date', description: 'Style date/time string', icon: Clock, category: 'date', template: "formatDate: 'YYYY-MM-DD'" },

    // Advanced
    { id: 'jsonPath', label: 'JSON Path', description: 'Extract using JMESPath', icon: Settings, category: 'advanced', template: 'jsonPath: ' },
    { id: 'xpath', label: 'XPath (XML)', description: 'Extract from XML tags', icon: Settings, category: 'advanced', template: 'xpath: ' },

    // Conversion
    { id: 'toJson', label: 'To JSON String', description: 'Convert object to text', icon: Code, category: 'conversion', template: 'toJson' },
    { id: 'fromJson', label: 'Parse JSON', description: 'Convert text to object', icon: Code, category: 'conversion', template: 'fromJson' },
];
