import React, { useRef, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useQuery } from '@tanstack/react-query';
import { globalVarsApi } from '../api/globalVars';

interface VariableAwareInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'onChange'> {
    isTextarea?: boolean;
    onValueChange: (val: string) => void;
    availableVars?: (string | { name: string, taskName: string, value?: any })[];
}

export const VariableAwareInput = forwardRef<any, VariableAwareInputProps>(({ value, onValueChange, placeholder, isTextarea = false, availableVars, ...props }, ref) => {
    const { data: globalVars } = useQuery({ queryKey: ['globalVars'], queryFn: globalVarsApi.getAll });
    const [tooltip, setTooltip] = useState<{ text: string, x: number, y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
        get selectionStart() { return inputRef.current?.selectionStart; },
        get selectionEnd() { return inputRef.current?.selectionEnd; },
        setSelectionRange: (start: number, end: number) => inputRef.current?.setSelectionRange(start, end),
        focus: () => inputRef.current?.focus(),
    }));

    const strValue = String(value || '');

    // Highlight regions
    const regions = useMemo(() => {
        const regex = /({{\s*(.+?)\s*}})/g;
        const res = [];
        let match;
        while ((match = regex.exec(strValue)) !== null) {
            res.push({
                full: match[0],
                expr: match[2].trim(),
                start: match.index,
                end: regex.lastIndex
            });
        }
        return res;
    }, [strValue]);

    // Simple Recursive Resolver for UI Tooltips
    const resolveVar = (expr: string, depth = 0): string => {
        if (depth > 5) return '... (too deep)';
        
        // Check if it's a workflow or local variable from availableVars
        if (availableVars && availableVars.length > 0) {
            const varName = expr.replace(/^(workflow\.|local\.)/, '');
            const found = availableVars.find(v => {
                if (typeof v === 'string') return v === varName;
                return v.name === varName;
            });
            
            if (found) {
                // For upstream variables, we can't resolve their actual values in the UI
                // Just indicate they're available
                if (typeof found === 'string') {
                    return `[Workflow/Local: ${found}]`;
                } else {
                    const valPreview = found.value !== undefined && found.value !== null 
                        ? ` = ${typeof found.value === 'object' ? JSON.stringify(found.value).substring(0, 50) + (JSON.stringify(found.value).length > 50 ? '...' : '') : String(found.value)}`
                        : '';
                    return `[From ${found.taskName}: ${found.name}]${valPreview}`;
                }
            }
        }
        
        // Fall back to global variable resolution
        const name = expr.startsWith('global.') ? expr.substring(7) : expr;
        const v = globalVars?.find((gv: any) => gv.name === name);
        if (!v) return 'Not found';
        if (v.isSecret || v.type === 'secret') return '********';
        
        const val = String(v.value);
        if (val.includes('{{')) {
            return val.replace(/\{\{\s*(.+?)\s*\}\}/g, (match, innerExpr) => {
                return resolveVar(innerExpr.trim(), depth + 1);
            });
        }
        return val;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current || !mirrorRef.current || regions.length === 0) {
            setTooltip(null);
            return;
        }

        const x = e.clientX;
        const y = e.clientY;
        
        const input = inputRef.current;
        if (input) {
            // Hit detection: disable input briefly to hit mirror spans
            const oldPE = input.style.pointerEvents;
            input.style.pointerEvents = 'none';
            mirrorRef.current.style.pointerEvents = 'auto';
            const elements = document.elementsFromPoint(x, y);
            input.style.pointerEvents = oldPE;
            mirrorRef.current.style.pointerEvents = 'none';

            const span = elements.find(el => (el as any).dataset?.variableExpr);
            
            if (span) {
                const expr = (span as any).dataset.variableExpr;
                const val = resolveVar(expr);
                setTooltip({ text: val, x, y: y - 10 });
            } else {
                setTooltip(null);
            }
        }
    };

    const handleScroll = (e: any) => {
        if (mirrorRef.current) {
            mirrorRef.current.scrollTop = e.target.scrollTop;
            mirrorRef.current.scrollLeft = e.target.scrollLeft;
        }
    };

    const renderHighlights = () => {
        const result = [];
        let lastIndex = 0;
        const isPassword = (props as any).type === 'password';
        
        const maskText = (text: string) => isPassword ? '●'.repeat(text.length) : text;
        
        regions.forEach((region, idx) => {
            if (region.start > lastIndex) {
                result.push(<span key={`text-${idx}`}>{maskText(strValue.substring(lastIndex, region.start))}</span>);
            }

            const expr = region.expr;
            const isGlobal = expr.startsWith('global.');
            const isWorkflow = expr.startsWith('workflow.');
            const isLocal = expr.startsWith('local.');
            
            // Check if it's in availableVars (which could be plain names)
            let isAvailable = false;
            if (availableVars && !isGlobal && !isWorkflow && !isLocal) {
                const varName = expr;
                isAvailable = availableVars.some(v => {
                    if (typeof v === 'string') return v === varName;
                    return v.name === varName;
                });
            }

            let bgColor = '#f3f4f6'; 
            let textColor = '#1E40AF'; 
            let borderColor = '#d1d5db';

            if (isGlobal) {
                bgColor = '#DBEAFE'; // blue-100
                textColor = '#1E40AF'; // blue-800
                borderColor = '#BFDBFE'; 
            } else if (isWorkflow || expr.startsWith('HTTP.')) {
                bgColor = '#FFEDD5'; // orange-100
                textColor = '#9A3412'; // orange-800
                borderColor = '#FED7AA'; 
            } else if (isLocal || isAvailable) {
                bgColor = '#F3E8FF'; // purple-100
                textColor = '#6B21A8'; // purple-800
                borderColor = '#E9D5FF';
            }

            result.push(
                <mark 
                    key={`var-${idx}`} 
                    data-variable-expr={region.expr}
                    style={{ 
                        backgroundColor: bgColor, 
                        color: textColor,
                        padding: '0 2px',
                        margin: '0 -1px',
                        borderRadius: '3px',
                        border: `1px solid ${borderColor}`,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        fontWeight: '600',
                        fontStyle: 'normal',
                        pointerEvents: 'auto'
                    }}
                >
                    {region.full}
                </mark>
            );
            lastIndex = region.end;
        });

        if (lastIndex < strValue.length) {
            result.push(<span key="text-end">{maskText(strValue.substring(lastIndex))}</span>);
        }
        return result;
    };

    const Component = isTextarea ? 'textarea' : 'input';

    const baseStyles: React.CSSProperties = {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '14px',
        lineHeight: '1.5rem',
        padding: isTextarea ? '12px' : '12px 16px',
        width: '100%',
        margin: 0,
        boxSizing: 'border-box',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
    };

    return (
        <div 
            ref={containerRef}
            className="relative w-full rounded-lg overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all bg-white" 
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip(null)}
        >
            {/* Mirror Layer: Displays highlights and base text */}
            <div 
                ref={mirrorRef}
                className="absolute inset-0 pointer-events-none scrollbar-hide"
                style={{ 
                    ...baseStyles,
                    color: '#374151', // text-gray-700
                    zIndex: 0,
                    overflowY: isTextarea ? 'auto' : 'hidden',
                    overflowX: 'hidden'
                }}
            >
                {renderHighlights()}
            </div>

            {/* Input Layer: Captures input. Text is transparent so mirror shows through. */}
            <Component 
                {...props as any}
                ref={inputRef}
                value={strValue}
                onChange={(e: any) => onValueChange(e.target.value)}
                onScroll={handleScroll}
                placeholder={placeholder}
                className="outline-none block w-full bg-transparent scrollbar-hide"
                style={{ 
                    ...baseStyles,
                    position: 'relative',
                    zIndex: 1,
                    color: 'transparent', 
                    WebkitTextFillColor: 'transparent',
                    background: 'transparent',
                    caretColor: '#111827',
                    minHeight: isTextarea ? (props.style?.minHeight || '120px') : (props.style?.minHeight || '46px'),
                    height: props.style?.height || (isTextarea ? 'auto' : '46px'),
                    resize: isTextarea ? 'vertical' : 'none',
                    ...props.style
                }}
            />

            {/* Tooltip Overlay */}
            {tooltip && (
                <div 
                    className="fixed z-[999999] bg-gray-900/95 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs font-bold shadow-2xl pointer-events-none animate-in fade-in zoom-in-95 duration-100 border border-white/10"
                    style={{ 
                        left: tooltip.x, 
                        top: tooltip.y, 
                        transform: 'translate(-50%, -100%)' 
                    }}
                >
                    <div className="flex flex-col gap-0.5">
                        <span className="text-blue-300 text-[9px] uppercase tracking-wider font-extrabold">Value Preview</span>
                        <span className="font-mono text-white text-sm break-all max-w-[320px]">{tooltip.text}</span>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900/95" />
                </div>
            )}

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                
                /* Selection visibility */
                .scrollbar-hide::selection {
                    background: rgba(59, 130, 246, 0.25) !important;
                    -webkit-text-fill-color: #1e3a8a !important;
                }
            `}</style>
        </div>
    );
});
