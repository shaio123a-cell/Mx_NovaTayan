import React, { useRef, useState, useMemo, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { globalVarsApi } from '../api/globalVars';
import { ActionPicker } from './ActionPicker';
import { 
    X, Search, Calculator, Type, Hash, Clock, 
    Code, List, Settings, ChevronRight, Zap, Trash2, Check, Edit3, ChevronDown, ChevronUp 
} from 'lucide-react';

interface VariableAwareInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'onChange'> {
    isTextarea?: boolean;
    expandable?: boolean;
    onValueChange: (val: string) => void;
    availableVars?: (string | { name: string, taskName: string, value?: any })[];
    onInsertClick?: () => void;
    mode?: 'standard' | 'implicit';
}

interface Region {
    full: string;
    expr: string;
    start: number;
    end: number;
    isImplicit: boolean;
}

export const VariableAwareInput = forwardRef<any, VariableAwareInputProps>(({ value, onValueChange, placeholder, isTextarea = false, expandable = false, availableVars, onInsertClick, mode = 'standard', ...props }, ref) => {
    const { data: globalVars } = useQuery({ queryKey: ['globalVars'], queryFn: globalVarsApi.getAll });
    const [tooltip, setTooltip] = useState<{ text: string, x: number, y: number } | null>(null);
    const [actionPicker, setActionPicker] = useState<{ x: number, y: number, regionIdx: number } | null>(null);
    const [editingAction, setEditingAction] = useState<{ regionIdx: number, actionIdx: number, value: string, rect: DOMRect } | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<any>(null);
    const selectionRef = useRef<number | null>(null);

    const [cursorPos, setCursorPos] = useState(0);
    const handleCursorSync = () => {
        if (inputRef.current) setCursorPos(inputRef.current.selectionStart);
    };

    useImperativeHandle(ref, () => ({
        get value() { return inputRef.current?.value; },
        get selectionStart() { return inputRef.current?.selectionStart; },
        get selectionEnd() { return inputRef.current?.selectionEnd; },
        setSelectionRange: (start: number, end: number) => inputRef.current?.setSelectionRange(start, end),
        focus: () => inputRef.current?.focus(),
        insertTextAtCursor: (text: string) => {
            const input = inputRef.current;
            if (!input) return;
            let start = input.selectionStart ?? 0;
            let end = input.selectionEnd ?? 0;
            const value = input.value;

            // SMART-SNAP: If inserting an action, ensure we don't splice another expression
            if (text.startsWith(' | ')) {
                const region = regions.find(r => start > r.start && start <= r.end);
                if (region) {
                    // Snap to the end of the expression part (before }})
                    // Find actual end of content before }}
                    const closeBraces = value.indexOf('}}', region.start);
                    if (closeBraces !== -1) {
                        start = closeBraces;
                        end = closeBraces;
                    }
                }
            }

            const nextValue = value.substring(0, start) + text + value.substring(end);
            onValueChange(nextValue);
            
            // Move cursor to after inserted text on next tick
            const newPos = start + text.length;
            setTimeout(() => {
                input.focus();
                input.setSelectionRange(newPos, newPos);
                handleCursorSync();
            }, 0);
        }
    }));

    const strValue = String(value || '');

    const regions = useMemo(() => {
        const val = String(value || '');
        if (mode === 'implicit' && val.trim()) {
            return [{ full: val, expr: val.trim(), start: 0, end: val.length, isImplicit: true }];
        }
        const regex = /({{\s*(.+?)\s*}})/g;
        const res = [];
        let match;
        while ((match = regex.exec(val)) !== null) {
            res.push({ full: match[0], expr: match[2].trim(), start: match.index, end: regex.lastIndex, isImplicit: false });
        }
        return res;
    }, [value, mode]);

    const findSpanUnderMouse = (x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y);
        return elements.find(el => el.hasAttribute('data-region-idx'));
    };

    const handleClick = (e: React.MouseEvent) => {
        const span = findSpanUnderMouse(e.clientX, e.clientY) as HTMLElement;
        if (span) {
            const regionIdx = parseInt(span.dataset.regionIdx || '-1');
            const actionIdx = parseInt(span.dataset.actionIdx || '-1');
            const expr = span.dataset.variableExpr || '';
            const rect = span.getBoundingClientRect();

            if (regionIdx !== -1) {
                setEditingAction({ regionIdx, actionIdx, value: expr, rect });
                setActionPicker(null);
                setTooltip(null);
                return;
            }
        }
        setEditingAction(null);
        setActionPicker(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Backspace') {
            const input = inputRef.current;
            if (!input || input.selectionStart !== input.selectionEnd) return;
            const pos = input.selectionStart;
            const region = regions.find(r => pos > r.start && pos <= r.end);
            if (region && pos === region.end) {
                e.preventDefault();
                const newValue = strValue.substring(0, region.start) + strValue.substring(region.end);
                onValueChange(newValue);
            }
        }
    };

    const handleActionClick = (e: React.MouseEvent, regionIdx: number, actionIdx: number, currentValue: string) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setEditingAction({ regionIdx, actionIdx, value: currentValue, rect });
    };

    const commitActionChange = (newValue: string, isDelete: boolean = false) => {
        if (!editingAction) return;
        const region = regions[editingAction.regionIdx];
        const parts = region.expr.split('|').map(p => p.trim());
        
        if (isDelete) {
            if (editingAction.actionIdx === -1) {
                // Deleting the base variable deletes the whole thing
                const nextValue = strValue.substring(0, region.start) + strValue.substring(region.end);
                onValueChange(nextValue);
                setEditingAction(null);
                return;
            }
            parts.splice(editingAction.actionIdx + 1, 1);
        } else {
            if (editingAction.actionIdx === -1) {
                parts[0] = newValue;
            } else {
                parts[editingAction.actionIdx + 1] = newValue;
            }
        }

        const newExpr = parts.join(' | ');
        const newFull = region.isImplicit ? newExpr : `{{ ${newExpr} }}`;
        const nextValue = strValue.substring(0, region.start) + newFull + strValue.substring(region.end);
        
        onValueChange(nextValue);
        setEditingAction(null);
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
            const parts = expr.split('|').map(s => s.trim());
            const baseVar = parts[0];
            const actions = parts.slice(1);

            const isMacro = ['now', 'epoch', 'uuid', 'guid', 'today', 'yesterday', 'tomorrow', 'random', 'env'].includes(baseVar);
            const isGlobal = baseVar.startsWith('global.') || isMacro;
            const isWorkflow = baseVar.startsWith('workflow.');
            const isLocal = baseVar.startsWith('local.');
            
            let isAvailable = false;
            let varDetails: any = null;
            if (availableVars) {
                const cleanBase = baseVar.replace(/^global\./, '');
                const possibleNames = [baseVar, cleanBase, `global.${baseVar}`];
                
                isAvailable = availableVars.some(v => {
                    const vName = typeof v === 'string' ? v : v.name;
                    return possibleNames.includes(vName);
                });
                
                varDetails = availableVars.find(v => {
                    const vName = typeof v === 'string' ? v : v.name;
                    return possibleNames.includes(vName);
                }) as any;
            }

            let bgColor = '#f3f4f6'; 
            let textColor = '#1E40AF'; 
            let borderColor = '#d1d5db';
            
            // Tooltip resolution logic
            let tooltip = `Variable: ${baseVar}`;
            if (varDetails) {
                if (varDetails.taskName) tooltip += `\nSource: ${varDetails.taskName}`;
                if (varDetails.value !== undefined) tooltip += `\nValue Preview: ${String(varDetails.value)}`;
            } else if (isGlobal) {
                // Resolve macros for tooltip
                if (baseVar === 'now') tooltip += `\nValue: ${new Date().toISOString()}`;
                else if (baseVar === 'epoch') tooltip += `\nValue: ${Math.floor(Date.now() / 1000)}`;
                else if (baseVar === 'uuid') tooltip += '\nValue: [Dynamic UUID]';
                else {
                    const cleanName = baseVar.replace(/^global\./, '');
                    const gVar = globalVars?.find((v: any) => v.name === cleanName || v.name === baseVar);
                    if (gVar) {
                        tooltip += `\nValue Preview: ${gVar.isSecret ? '[Secret Value]' : String(gVar.value)}`;
                        if (gVar.description) tooltip += `\nDescription: ${gVar.description}`;
                    } else {
                        tooltip += `\nGlobal Identifier`;
                    }
                }
            }

            if (region.isImplicit) {
                bgColor = '#F1F5F9'; textColor = '#475569'; borderColor = '#E2E8F0';
            } else if (isGlobal) {
                bgColor = '#DBEAFE'; textColor = '#1E40AF'; borderColor = '#BFDBFE'; 
            } else if (isWorkflow || baseVar.startsWith('HTTP.')) {
                bgColor = '#FFEDD5'; textColor = '#9A3412'; borderColor = '#FED7AA'; 
            } else if (isLocal || isAvailable) {
                bgColor = '#F3E8FF'; textColor = '#6B21A8'; borderColor = '#E9D5FF';
            }

            // GHOST TEXT STRATEGY:
            // We render the raw variable text (e.g. {{global.var}}) as invisible text in the document flow.
            // This 'Anchor' carved out the EXACT space needed for the variable.
            // Then we overlay the visual Chip (mark) absolutely on top of it.
            const fullRawText = strValue.substring(region.start, region.end);
            result.push(
                <span 
                    key={`var-group-${idx}`} 
                    className="relative inline-block"
                    style={{ 
                        pointerEvents: 'auto'
                    }}
                >
                    {/* The Anchor: Invisible but provides exact width */}
                    <span 
                        className="opacity-0 whitespace-pre select-none pointer-events-none"
                        style={{ 
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            fontSize: '14px',
                            letterSpacing: 'normal',
                            zIndex: 0
                        }}
                    >
                        {fullRawText}
                    </span>

                    {/* The Visual Chip Layer: Scaled perfectly to 100% of Anchor Width */}
                    <div className="absolute inset-0 flex items-center pointer-events-none" style={{ zIndex: 1, padding: '0 2px' }}>
                        <div 
                             className="pointer-events-auto flex items-center justify-center h-[24px] w-full shadow-sm transition-all group/chip relative overflow-hidden"
                             style={{ 
                                 backgroundColor: bgColor, color: textColor,
                                 borderRadius: '6px', border: `1px solid ${borderColor}`,
                                 cursor: 'pointer'
                             }}
                            data-region-idx={idx}
                            data-action-idx={-1}
                            title={tooltip}
                        >
                            <div className="flex items-center gap-1 font-bold px-2 w-full justify-center overflow-hidden">
                                {region.isImplicit && <Code size={12} className="opacity-50 shrink-0" />}
                                <span className="truncate text-[13px] whitespace-nowrap">{baseVar}</span>
                                {actions.map((action, aidx) => {
                                    const [name, ...params] = action.split(':');
                                    const paramString = params.join(':').trim();
                                    return (
                                        <React.Fragment key={aidx}>
                                            <ChevronRight size={12} className="opacity-40 shrink-0" />
                                            <span className="truncate text-[13px] whitespace-nowrap">
                                                {name.trim()}
                                                {paramString && <span className="ml-1 text-[11px] opacity-70 font-mono font-black">{paramString}</span>}
                                            </span>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </span>
            );
            lastIndex = region.end;
        });
        
        if (lastIndex < strValue.length) {
            result.push(<span key="text-end">{maskText(strValue.substring(lastIndex))}</span>);
        }
        return result;
    };

    const handleScroll = (e: any) => {
        if (mirrorRef.current) {
            mirrorRef.current.scrollTop = e.target.scrollTop;
            mirrorRef.current.scrollLeft = e.target.scrollLeft;
        }
    };

    const Component = (isTextarea || isExpanded) ? 'textarea' : 'input';

    const baseStyles: React.CSSProperties = {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '14px',
        lineHeight: '1.5rem',
        padding: (isTextarea || isExpanded) ? '12px' : '12px 16px',
        width: '100%',
        margin: 0,
        boxSizing: 'border-box',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
    };

    return (
        <div 
            ref={containerRef}
            className="relative w-full rounded-lg overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all bg-white shadow-sm flex items-center" 
            onMouseMove={(e) => {
                if (!containerRef.current || !mirrorRef.current || regions.length === 0 || editingAction) {
                    setTooltip(null);
                    return;
                }
                const span = findSpanUnderMouse(e.clientX, e.clientY) as HTMLElement;
                if (span && span.title) {
                    setTooltip({ text: span.title, x: e.clientX, y: e.clientY });
                } else {
                    setTooltip(null);
                }
            }}
            onMouseLeave={() => setTooltip(null)}
            onClick={handleClick}
        >
            <div className="relative flex-1 min-w-0 h-full">
                <div 
                    ref={mirrorRef}
                    className="absolute inset-0 pointer-events-none scrollbar-hide"
                    style={{ 
                        ...baseStyles, color: '#374151', zIndex: 0,
                        overflowY: (isTextarea || isExpanded) ? 'auto' : 'hidden', overflowX: 'hidden'
                    }}
                >
                    {renderHighlights()}
                </div>

                <Component 
                    {...props as any}
                    ref={inputRef}
                    value={strValue}
                    onChange={(e: any) => onValueChange(e.target.value)}
                    onScroll={handleScroll}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="outline-none block w-full bg-transparent scrollbar-hide"
                    style={{ 
                        ...baseStyles, position: 'relative', zIndex: 1,
                        color: 'transparent', WebkitTextFillColor: 'transparent',
                        background: 'transparent', caretColor: '#111827',
                        minHeight: (isTextarea || isExpanded) ? (props.style?.minHeight || '120px') : (props.style?.minHeight || '46px'),
                        height: props.style?.height || ((isTextarea || isExpanded) ? '120px' : '46px'),
                        resize: (isTextarea || isExpanded) ? 'vertical' : 'none',
                        ...props.style
                    }}
                />
            </div>
            
            <div className="px-1 shrink-0 border-l border-gray-100 flex flex-col justify-center items-center h-full bg-gray-50/50">
                <button 
                    onClick={(e) => { e.stopPropagation(); onInsertClick?.(); }}
                    className="p-0.5 text-blue-500 hover:bg-blue-50 rounded transition-all group"
                    title="Insert Variable / Action"
                >
                    <Zap size={12} className="group-hover:rotate-90 transition-transform fill-current" />
                </button>
                {expandable && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className={`p-0.5 rounded transition-all ${isExpanded ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'}`}
                        title={isExpanded ? "Collapse Textarea" : "Expand Textarea"}
                    >
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                )}
            </div>

            {/* THE ACTION HUB - The new interactive portal */}
            {editingAction && (
                <div 
                    className="fixed z-[2000000] animate-in fade-in zoom-in duration-200"
                    onClick={(e) => e.stopPropagation()}
                    style={{ 
                        left: editingAction.rect.left + (editingAction.rect.width / 2),
                        top: editingAction.rect.top - 12,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-2 min-w-[200px] flex flex-col gap-2 ring-1 ring-black/5">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <Edit3 size={10} /> Edit {editingAction.actionIdx === -1 ? 'Variable' : 'Action'}
                            </span>
                            <button onClick={() => setEditingAction(null)} className="text-gray-400 hover:text-gray-600"><X size={12}/></button>
                        </div>

                        <div className="flex gap-2 items-center">
                            <div className="flex-1">
                                {editingAction.value.includes(':') || editingAction.actionIdx === -1 ? (
                                    <input 
                                        autoFocus
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                        value={editingAction.value}
                                        onChange={(e) => setEditingAction({ ...editingAction, value: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') commitActionChange(editingAction.value);
                                            if (e.key === 'Escape') setEditingAction(null);
                                        }}
                                    />
                                ) : (
                                    <div className="text-xs text-gray-500 px-2 py-1 italic font-medium">Simple operation (no parameters)</div>
                                )}
                            </div>
                            <button 
                                onClick={() => commitActionChange(editingAction.value)}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <Check size={14} />
                            </button>
                            <button 
                                onClick={() => commitActionChange('', true)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                title="Delete Operation"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                        
                        {editingAction.actionIdx === -1 && (
                            <div className="text-[9px] text-amber-600 font-bold px-1 flex items-center gap-1">
                                <Search size={9} /> Base variable name
                            </div>
                        )}
                        {editingAction.value.includes(':') && (
                            <div className="text-[9px] text-blue-600 font-bold px-1 flex items-center gap-1">
                                <Calculator size={9} /> Add parameters after the colon
                            </div>
                        )}
                    </div>
                    {/* Popover Arrow */}
                    <div className="absolute top-[calc(100%-1px)] left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-gray-100 rotate-45 shadow-[3px_3px_5px_rgba(0,0,0,0.03)]" />
                </div>
            )}

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            {tooltip && (
                <div 
                    className="fixed z-[3000000] pointer-events-none"
                    style={{ 
                        left: tooltip.x + 12,
                        top: tooltip.y + 12,
                    }}
                >
                    <div className="bg-slate-900/90 backdrop-blur text-white text-xs px-3 py-2 rounded-lg shadow-2xl border border-white/10 whitespace-pre font-mono">
                        {tooltip.text}
                    </div>
                </div>
            )}
        </div>
    );
});
