import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workflowsApi } from '../api/workflows';
import { useToast } from '../context/ToastContext';
import { 
    Plus, Trash2, Copy, Check, Zap, Globe, 
    Lock, ArrowRight, ChevronDown, ChevronUp
} from 'lucide-react';
import { VariableAwareInput } from './VariableAwareInput';
import { VariablePicker } from './VariablePicker';

interface WebhookTriggerManagerProps {
    workflowId: string;
    availableVarNames?: string[]; // The Workflow Input variable names we want to map TO
    onDirty?: () => void;
}

export function WebhookTriggerManager({ workflowId, availableVarNames = [], onDirty }: WebhookTriggerManagerProps) {
    const { showToast } = useToast();
    const [expandedTokenId, setExpandedTokenId] = useState<string | null>(null);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [showVarPicker, setShowVarPicker] = useState(false);
    const [pickerTarget, setPickerTarget] = useState<{ tokenId: string, varName: string } | null>(null);
    const [expandedInputs, setExpandedInputs] = useState<Record<string, boolean>>({});
    const [localTokens, setLocalTokens] = useState<any[]>(() => {
        return (window as any)._webhookDraft || [];
    });
    const [initialized, setInitialized] = useState(!!(window as any)._webhookDraft);
    const inputRefs = useRef<Record<string, any>>({});

    // --- Queries ---
    const { data: tokens, isLoading } = useQuery<any[]>({
        queryKey: ['workflow-tokens', workflowId],
        queryFn: () => workflowsApi.getTokens(workflowId)
    });

    // Handle initialization when tokens load
    useEffect(() => {
        if (!initialized && tokens) {
            setLocalTokens(tokens);
            setInitialized(true);
        }
    }, [tokens, initialized]);

    // --- Mutations ---
    const handleCreateToken = (description = 'New Webhook') => {
        const id = `new-${Date.now()}`;
        const newToken = {
            id,
            token: 'pending-save-token-generation...',
            description,
            mapping: {},
            enabled: true
        };
        setLocalTokens(prev => [...prev, newToken]);
        onDirty?.();
        showToast('Draft webhook added. Save configuration to apply.', 'info');
    };

    const handleDeleteToken = (id: string) => {
        setLocalTokens(prev => prev.filter(t => t.id !== id));
        if (!id.startsWith('new-')) {
            const deleted = ((window as any)._webhookDeleted) || [];
            (window as any)._webhookDeleted = [...deleted, id];
        }
        onDirty?.();
        showToast('Webhook removed from draft. Save configuration to commit changes.', 'info');
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedToken(id);
        setTimeout(() => setCopiedToken(null), 2000);
        showToast('Copied to clipboard', 'info');
    };

    const handleAddMapping = (tokenId: string) => {
        setLocalTokens(prev => prev.map(t => {
            if (t.id !== tokenId) return t;
            const mapping = { ...(t.mapping || {}) };
            const nextVar = availableVarNames.find(v => !mapping[v]) || availableVarNames[0];
            if (nextVar) mapping[nextVar] = 'body.value';
            return { ...t, mapping };
        }));
        onDirty?.();
    };

    const handleUpdateMapping = (tokenId: string, varName: string, sourceTemplate: string) => {
        setLocalTokens(prev => prev.map(t => {
            if (t.id !== tokenId) return t;
            const mapping = { ...(t.mapping || {}) };
            mapping[varName] = sourceTemplate;
            return { ...t, mapping };
        }));
        onDirty?.();
    };

    const handleUpdateDescription = (tokenId: string, description: string) => {
        setLocalTokens(prev => prev.map(t => t.id === tokenId ? { ...t, description } : t));
        onDirty?.();
    };

    const handleToggleEnabled = (tokenId: string) => {
        setLocalTokens(prev => prev.map(t => t.id === tokenId ? { ...t, enabled: !t.enabled } : t));
        onDirty?.();
    };

    const handleRemoveMapping = (tokenId: string, varName: string) => {
        setLocalTokens(prev => prev.map(t => {
            if (t.id !== tokenId) return t;
            const mapping = { ...(t.mapping || {}) };
            delete mapping[varName];
            return { ...t, mapping };
        }));
        onDirty?.();
    };

    const handleUpdateVarName = (tokenId: string, oldName: string, newName: string) => {
        setLocalTokens(prev => prev.map(t => {
            if (t.id !== tokenId) return t;
            const mapping = { ...(t.mapping || {}) };
            const val = mapping[oldName];
            delete mapping[oldName];
            mapping[newName] = val;
            return { ...t, mapping };
        }));
        onDirty?.();
    };



    // CRITICAL: Push local changes to a place where WorkflowAdminShelf can see them
    // Do NOT delete on unmount — the shelf needs the draft to survive tab switches
    useEffect(() => {
        if (initialized) {
            (window as any)._webhookDraft = localTokens;
        }
    }, [localTokens, initialized]);

    if (isLoading) return <div className="p-8 text-center text-slate-400 font-bold animate-pulse">Loading Webhooks...</div>;

    const webhookBaseUrl = `${window.location.protocol}//${window.location.host}/api/triggers`;

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">API Webhooks</h3>
                    <p className="text-xs text-slate-500 font-medium">External systems can trigger this workflow using unique tokens.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => handleCreateToken('New Webhook')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-100 transition-all active:scale-95"
                    >
                        <Plus size={16} />
                        Create Token
                    </button>
                </div>
            </header>

            <div className="space-y-4">
                {localTokens?.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4 border border-slate-100">
                            <Globe size={32} />
                        </div>
                        <h4 className="text-slate-900 font-bold mb-1">No Webhooks Configured</h4>
                        <p className="text-xs text-slate-500 max-w-[280px] mx-auto leading-relaxed font-medium">
                            Generate a secret token to allow external systems like <span className="text-blue-600 font-bold">Stripe</span> or <span className="text-blue-600 font-bold">GitHub</span> to trigger this workflow.
                        </p>
                    </div>
                ) : localTokens?.map((token: any) => (
                    <div key={token.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md">
                        {/* Token Header */}
                        <div className="p-5 flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${token.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Lock size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <input 
                                        type="text"
                                        value={token.description || ''}
                                        onChange={(e) => handleUpdateDescription(token.id, e.target.value)}
                                        className="text-sm font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-0 w-full hover:bg-slate-50 rounded px-1 transition-colors"
                                        placeholder="Add a description (e.g. GitHub Production)"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 tracking-tighter">
                                        {token.token.substring(0, 8)}••••••••••••••••
                                    </code>
                                    <button 
                                        onClick={() => copyToClipboard(token.token, token.id)}
                                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                        {copiedToken === token.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleToggleEnabled(token.id)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all border ${token.enabled ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                                >
                                    {token.enabled ? 'Enabled' : 'Disabled'}
                                </button>
                                <button 
                                    onClick={() => setExpandedTokenId(expandedTokenId === token.id ? null : token.id)}
                                    className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-all"
                                >
                                    {expandedTokenId === token.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                <button 
                                    onClick={() => handleDeleteToken(token.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Expanded Details & Mapping */}
                        {expandedTokenId === token.id && (
                            <div className="bg-slate-50/50 border-t border-slate-100 p-6 space-y-8 animate-in slide-in-from-top-2 duration-300">
                                {/* Webhook URL Section */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Webhook Target URL</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between text-xs font-mono group overflow-hidden shadow-inner">
                                            <span className="truncate text-slate-400">{webhookBaseUrl}/<span className="text-blue-600 font-bold">{token.token}</span></span>
                                            <button 
                                                onClick={() => copyToClipboard(`${webhookBaseUrl}/${token.token}`, `url-${token.id}`)}
                                                className="shrink-0 p-1.5 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-blue-600 transition-all ml-4"
                                            >
                                                {copiedToken === `url-${token.id}` ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Mapping Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Variable Payload Mapping</label>
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                        </div>
                                        <button 
                                            onClick={() => handleAddMapping(token.id)}
                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1.5 transition-all active:scale-95"
                                        >
                                            <Plus size={12} />
                                            Add Entry
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {Object.entries(token.mapping || {}).length === 0 ? (
                                            <div className="text-[10px] text-slate-400 italic font-medium p-4 bg-white/50 border border-dashed border-slate-200 rounded-xl text-center">
                                                By default, the raw JSON body is passed to the workflow. Add mapping to target specific inputs.
                                            </div>
                                        ) : (
                                            Object.entries(token.mapping || {}).map(([varName, template]: [string, any], idx) => (
                                                <div key={`${token.id}-${varName}`} className="grid grid-cols-12 gap-3 items-start group animate-in slide-in-from-left-2" style={{ animationDelay: `${idx * 50}ms` }}>
                                                    <div className="col-span-5 relative h-8 flex items-center">
                                                        <select 
                                                            value={varName}
                                                            onChange={(e) => handleUpdateVarName(token.id, varName, e.target.value)}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-blue-100 outline-none appearance-none"
                                                        >
                                                            {availableVarNames.map(v => (
                                                                <option key={v} value={v}>{v}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                                    </div>
                                                    <div className="col-span-1 flex justify-center h-8 items-center text-slate-300">
                                                        <ArrowRight size={14} />
                                                    </div>
                                                    <div className="col-span-5 relative">
                                                        <VariableAwareInput 
                                                            ref={el => {
                                                                if (el) inputRefs.current[`${token.id}-${varName}`] = el;
                                                            }}
                                                            isTextarea={expandedInputs[`${token.id}-${varName}`]}
                                                            value={String(template)}
                                                            onValueChange={(val) => handleUpdateMapping(token.id, varName, val)}
                                                            placeholder="Source Path: e.g. body.user.id"
                                                            className={`w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-blue-600 shadow-sm focus:ring-2 focus:ring-blue-100 outline-none pr-16 transition-all ${expandedInputs[`${token.id}-${varName}`] ? 'h-32' : 'h-8'}`}
                                                            availableVars={['body', 'query', 'headers', 'request']}
                                                        />
                                                        <div className="absolute right-1 top-1 flex items-center gap-0.5 z-10">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setExpandedInputs(prev => ({ ...prev, [`${token.id}-${varName}`]: !prev[`${token.id}-${varName}`] }));
                                                                }}
                                                                className={`p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all ${expandedInputs[`${token.id}-${varName}`] ? 'text-blue-500 bg-blue-50' : ''}`}
                                                                title={expandedInputs[`${token.id}-${varName}`] ? "Collapse" : "Expand"}
                                                            >
                                                                {expandedInputs[`${token.id}-${varName}`] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                            </button>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPickerTarget({ tokenId: token.id, varName });
                                                                    setShowVarPicker(true);
                                                                }}
                                                                className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-all"
                                                                title="Pick Payload Source"
                                                            >
                                                                <Zap size={12} fill="currentColor" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-1 flex justify-end">
                                                        <button 
                                                            onClick={() => handleRemoveMapping(token.id, varName)}
                                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Quick Example (cURL) */}
                                <div className="pt-6 border-t border-slate-100">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Test Request (cURL)</label>
                                    <div className="bg-slate-900 rounded-xl p-4 font-mono text-[10px] text-emerald-400 relative group overflow-x-auto shadow-2xl">
                                        <pre className="whitespace-pre-wrap leading-relaxed">
                                            {`curl -X POST "${webhookBaseUrl}/${token.token}" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "value"}'`}
                                        </pre>
                                        <button 
                                            onClick={() => copyToClipboard(`curl -X POST "${webhookBaseUrl}/${token.token}" -H "Content-Type: application/json" -d '{"event": "test"}'`, `curl-${token.id}`)}
                                            className="absolute right-3 top-3 p-2 bg-white/5 hover:bg-white/10 rounded-lg text-emerald-500/50 hover:text-emerald-400 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {showVarPicker && (
                <div className="fixed inset-0 z-[2000] flex justify-end">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowVarPicker(false)} />
                    <div className="relative w-80 h-full">
                        <VariablePicker 
                            onSelect={(v) => {
                                if (pickerTarget) {
                                    const refKey = `${pickerTarget.tokenId}-${pickerTarget.varName}`;
                                    const ref = inputRefs.current[refKey];
                                    if (ref) {
                                        ref.insertTextAtCursor(v);
                                    } else {
                                        // Fallback manual update
                                        const token = localTokens?.find((t: any) => t.id === pickerTarget.tokenId);
                                        if (token) {
                                            const currentVal = token.mapping[pickerTarget.varName] || '';
                                            handleUpdateMapping(token.id, pickerTarget.varName, currentVal + v);
                                        }
                                    }
                                }
                                setShowVarPicker(false);
                            }} 
                            onClose={() => setShowVarPicker(false)} 
                            triggerVars={['body', 'query', 'headers', 'request']}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
