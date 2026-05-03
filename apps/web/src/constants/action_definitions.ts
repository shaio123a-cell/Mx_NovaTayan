import { 
    Calculator, Type, Hash, Clock, Code, List, Settings, Search, Box, Workflow, Zap, Globe 
} from 'lucide-react';

export interface ActionItem {
    id: string;
    label: string;
    description: string;
    icon: any;
    category: 'math' | 'string' | 'collection' | 'date' | 'conversion' | 'advanced' | 'environment';
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
    // --- DATE & TIME ---
    { id: 'now', label: 'now (ISO)', description: 'Current timestamp', icon: Clock, category: 'date', template: '{{now}}' },
    { id: 'now5m', label: 'now - 5 mins', description: 'Window: 5 mins ago', icon: Clock, category: 'date', template: '{{now-5m}}' },
    { id: 'now1h', label: 'now - 1 hour', description: 'Window: 1 hour ago', icon: Clock, category: 'date', template: '{{now-1h}}' },
    { id: 'epoch', label: 'epoch (sec)', description: 'Current Unix time', icon: Clock, category: 'date', template: '{{epoch}}' },
    { id: 'epoch5m', label: 'epoch - 5 mins', description: 'Unix: 5 mins ago', icon: Clock, category: 'date', template: '{{epoch-5m}}' },
    { id: 'today1d', label: 'today - 1 day', description: 'Yesterday date', icon: Clock, category: 'date', template: '{{today-1d}}' },
    { id: 'formatDate', label: 'Format Date', description: 'Style date/time string', icon: Clock, category: 'date', template: "formatDate: 'YYYY-MM-DD'" },
    { id: 'startOf', label: 'Start Of Window', description: 'Truncate to day/hour', icon: Clock, category: 'date', template: "startOf: 'day'" },

    // --- STRING & TEXT ---
    { id: 'trim', label: 'Trim Whitespace', description: 'Remove stray spaces', icon: Type, category: 'string', template: 'trim' },
    { id: 'upper', label: 'To Uppercase', description: 'CONVERT TO UPPER', icon: Type, category: 'string', template: 'upper' },
    { id: 'lower', label: 'To Lowercase', description: 'convert to lower', icon: Type, category: 'string', template: 'lower' },
    { id: 'countWords', label: 'Count Words', description: 'Calculate word count', icon: Type, category: 'string', template: 'countWords' },
    { id: 'countMatches', label: 'Count Matches', description: "Occurrences of 'foo'", icon: Search, category: 'string', template: "countMatches: 'foo'" },
    { id: 'mask', label: 'Mask Sensitive', description: 'Hide part (####)', icon: Settings, category: 'string', template: "mask: 4" },

    // --- COLLECTION ---
    { id: 'length', label: 'Length / Size', description: 'Count items/chars', icon: Hash, category: 'collection', template: 'length' },
    { id: 'first', label: 'First Item', description: 'Get first element', icon: List, category: 'collection', template: 'first' },
    { id: 'last', label: 'Last Item', description: 'Get last element', icon: List, category: 'collection', template: 'last' },
    { id: 'join', label: 'Join Items', description: 'Flatten list to string', icon: List, category: 'collection', template: "join: ', '" },
    { id: 'countUnique', label: 'Unique Count', description: 'Count distinct items', icon: List, category: 'collection', template: 'countUnique' },

    // --- MATH ---
    { id: 'sum', label: 'Sum', description: 'Total of numbers', icon: Calculator, category: 'math', template: 'sum' },
    { id: 'avg', label: 'Average', description: 'Mean value', icon: Calculator, category: 'math', template: 'avg' },
    { id: 'math', label: 'Manual Math', description: 'e.g. * 1.5 or + 10', icon: Calculator, category: 'math', template: 'math: ' },
    { id: 'round', label: 'Round Number', description: 'Nearest integer', icon: Hash, category: 'math', template: 'round' },
    { id: 'abs', label: 'Absolute Value', description: 'Remove negative sign', icon: Hash, category: 'math', template: 'abs' },
    { id: 'floor', label: 'Floor', description: 'Round down', icon: Hash, category: 'math', template: 'floor' },
    { id: 'ceil', label: 'Ceiling', description: 'Round up', icon: Hash, category: 'math', template: 'ceil' },

    // --- CONVERSION & DATAOPS ---
    { id: 'random_hex', label: 'random_hex', description: '8-char Batch ID', icon: Code, category: 'conversion', template: '{{random_hex}}' },
    { id: 'uuid', label: 'uuid (GUID)', description: 'Unique session key', icon: Code, category: 'conversion', template: '{{uuid}}' },
    { id: 'now_fs', label: 'now_fs (Safe)', description: 'Filesystem safe time', icon: Code, category: 'conversion', template: '{{now_fs}}' },
    { id: 'toJson', label: 'To JSON String', description: 'Object to text', icon: Code, category: 'conversion', template: 'toJson' },
    { id: 'fromJson', label: 'Parse JSON', description: 'Text to object', icon: Code, category: 'conversion', template: 'fromJson' },
    { id: 'base64', label: 'Base64 Encode', description: 'For data ingestion', icon: Code, category: 'conversion', template: 'base64Encode' },
    { id: 'md5', label: 'MD5 Hash', description: 'Generate checksum', icon: Hash, category: 'conversion', template: 'md5' },

    // --- ADVANCED ---
    { id: 'jsonPath', label: 'JSON Path', description: 'Extract using JMESPath', icon: Settings, category: 'advanced', template: 'jsonPath: ' },
    { id: 'xpath', label: 'XPath (XML)', description: 'Extract from XML', icon: Settings, category: 'advanced', template: 'xpath: ' },
];
