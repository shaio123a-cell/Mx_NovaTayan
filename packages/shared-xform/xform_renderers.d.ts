export declare function renderCSV(rows: Record<string, unknown>[], columns: string[], opts?: {
    header?: boolean;
    delimiter?: string;
}): string;
export declare function renderJSON(rows: Record<string, unknown>[]): string;
export declare function renderText(values: (string | number | boolean | null | undefined)[]): string;
export declare function renderXML(rows: Record<string, unknown>[], rootName?: string, rowName?: string): string;
