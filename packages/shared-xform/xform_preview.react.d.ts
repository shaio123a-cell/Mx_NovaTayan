import React from 'react';
interface XformPreviewProps {
    specYaml: string;
    inputText: string;
    vars?: Record<string, unknown>;
    limit?: number;
    onError?: (e: Error) => void;
}
export declare const XformPreview: React.FC<XformPreviewProps>;
export {};
