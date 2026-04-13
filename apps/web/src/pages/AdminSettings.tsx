import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../api/settings'
import { Settings as SettingsIcon, Save, Info, Plus, Trash2, Cpu, Eye, EyeOff, Activity, RefreshCcw, Loader2 } from 'lucide-react'

export type LLMConfig = { id: string; provider: string; model: string; apiKey: string; enabled: boolean };

export default function AdminSettings() {
    const queryClient = useQueryClient()
    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: settingsApi.getSettings,
    })

    const updateMutation = useMutation({
        mutationFn: ({ key, value }: { key: string; value: string }) => settingsApi.updateSetting(key, value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] })
        },
    })

    const handleSave = (key: string, value: string) => {
        updateMutation.mutate({ key, value })
    }

    if (isLoading) return <div className="p-8 text-center text-gray-400 animate-pulse">Loading system configuration...</div>

    const globalSettings = settings?.filter((s: any) => s.key !== 'AI_LLM_PROVIDERS') || [];
    const aiSettingStr = settings?.find((s: any) => s.key === 'AI_LLM_PROVIDERS')?.value || '[]';
    
    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="flex items-center gap-6 mb-10">
                <div className="p-4 rounded-2xl bg-blue-50 text-[#1976D2] border border-blue-100 shadow-sm">
                    <SettingsIcon className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">System Defaults & Connections</h1>
                    <p className="text-gray-500 mt-1">Configure global orchestration rules and external service integrations.</p>
                </div>
            </div>

            <div className="space-y-8">
                {/* AI Copilot Section */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-gray-50 bg-gradient-to-r from-purple-50/50 to-white">
                        <h3 className="font-bold text-gray-900 flex items-center gap-3">
                            <span className="text-lg"><Cpu className="text-purple-500 w-5 h-5"/></span> AI Copilot Connections (Fallback Chain)
                        </h3>
                        <p className="text-sm font-medium text-gray-500 mt-2 tracking-wide">
                            Configure multiple LLM engines. If the first fails or hits rate limits, the Copilot automatically falls back to the next enabled provider.
                        </p>
                    </div>
                    
                    <div className="p-8 space-y-4">
                        <AIProviderManager 
                             baseJsonStr={aiSettingStr} 
                             onSaveConfigs={(newJsonStr) => handleSave('AI_LLM_PROVIDERS', newJsonStr)} 
                        />
                    </div>
                </div>

                {/* General Settings Section */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-gray-50 bg-gray-50/50">
                        <h3 className="font-bold text-gray-900 flex items-center gap-3">
                            <span className="text-lg"><Activity className="text-blue-500 w-5 h-5" /></span> Global Status Mappings
                        </h3>
                        <p className="text-[11px] font-medium text-gray-400 mt-1 uppercase tracking-wider">Engine interpretation rules</p>
                    </div>
                    
                    <div className="p-8 divide-y divide-gray-50 space-y-8">
                        {globalSettings.map((setting: any) => (
                            <div key={setting.key} className="pt-8 first:pt-0">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1">
                                        <label className="block text-sm font-black text-gray-800 mb-1 uppercase tracking-wide">
                                            {setting.key.replace(/_/g, ' ')}
                                        </label>
                                        <p className="text-sm text-gray-500 font-medium">{setting.description}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="text"
                                            defaultValue={setting.value}
                                            className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-sm font-bold font-mono text-[#1976D2] focus:border-[#1976D2] focus:ring-1 focus:ring-blue-100 outline-none w-56 shadow-inner"
                                            onBlur={(e) => {
                                                if (e.target.value !== setting.value) {
                                                    handleSave(setting.key, e.target.value)
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

function AIProviderManager({ baseJsonStr, onSaveConfigs }: { baseJsonStr: string, onSaveConfigs: (str: string) => void }) {
    const [configs, setConfigs] = useState<LLMConfig[]>(() => {
        try { return JSON.parse(baseJsonStr); } catch { return []; }
    });
    const [showKey, setShowKey] = useState<string | null>(null);
    const [fetchingModels, setFetchingModels] = useState<Record<string, boolean>>({});
    const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({});

    const fetchModels = async (id: string, provider: string, apiKey: string) => {
        if (!apiKey) return;
        setFetchingModels(prev => ({ ...prev, [id]: true }));
        try {
            const res = await fetch(`/api/ai/models?provider=${encodeURIComponent(provider)}&apiKey=${encodeURIComponent(apiKey)}`);
            if (res.ok) {
                const models = await res.json();
                if (Array.isArray(models) && models.length > 0) {
                    setAvailableModels(prev => ({ ...prev, [id]: models }));
                    
                    // Automatically map to the first generic model if user hasn't correctly matched one
                    const currentModelValid = models.includes(configs.find(c => c.id === id)?.model);
                    if (!currentModelValid) {
                        const newCfgs = [...configs];
                        const idx = newCfgs.findIndex(c => c.id === id);
                        if (idx !== -1) {
                            newCfgs[idx] = { ...newCfgs[idx], model: models[0] };
                            setConfigs(newCfgs);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Failed to fetch models');
        } finally {
            setFetchingModels(prev => ({ ...prev, [id]: false }));
        }
    };

    const updateConfig = (idx: number, updates: Partial<LLMConfig>) => {
        const newCfgs = [...configs];
        newCfgs[idx] = { ...newCfgs[idx], ...updates };
        setConfigs(newCfgs);
    };

    const addConfig = () => {
        const newCfgs = [...configs, { id: crypto.randomUUID(), provider: 'Google Gemini', model: 'gemini-1.5-pro', apiKey: '', enabled: true }];
        setConfigs(newCfgs);
    };

    const removeConfig = (idx: number) => {
        const newCfgs = [...configs];
        newCfgs.splice(idx, 1);
        setConfigs(newCfgs);
        onSaveConfigs(JSON.stringify(newCfgs));
    };

    const commitSave = () => {
        onSaveConfigs(JSON.stringify(configs));
    };

    return (
        <div className="space-y-4">
            {configs.length === 0 && (
                <div className="text-center p-6 bg-gray-50 text-gray-400 rounded-xl border border-dashed border-gray-200">
                    No AI Copilot connection defined. Please add one to enable agentic workflow generation.
                </div>
            )}
            
            {configs.map((cfg, idx) => (
                <div key={cfg.id} className={`flex items-center gap-4 p-4 border rounded-xl transition-colors ${cfg.enabled ? 'bg-white border-purple-100' : 'bg-gray-50 border-gray-100 opacity-70'} shadow-sm`}>
                    <div className="font-bold text-gray-300 w-6 text-center">#{idx + 1}</div>
                    
                    <select 
                        value={cfg.provider} 
                        onChange={(e) => updateConfig(idx, { provider: e.target.value })}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-purple-300"
                    >
                        <option value="Google Gemini">Google Gemini</option>
                        <option value="OpenAI">OpenAI</option>
                        <option value="Anthropic Claude">Anthropic Claude</option>
                    </select>

                    <div className="relative">
                        {availableModels[cfg.id] && availableModels[cfg.id].length > 0 ? (
                            <select 
                                value={cfg.model} 
                                onChange={(e) => updateConfig(idx, { model: e.target.value })}
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono w-48 outline-none focus:border-purple-300 pr-8"
                            >
                                {availableModels[cfg.id].map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        ) : (
                            <input 
                                type="text" 
                                value={cfg.model} 
                                onChange={(e) => updateConfig(idx, { model: e.target.value })}
                                placeholder="e.g. gemini-1.5-pro"
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono w-48 outline-none focus:border-purple-300 pr-8"
                            />
                        )}
                        <button 
                            onClick={() => fetchModels(cfg.id, cfg.provider, cfg.apiKey)}
                            disabled={fetchingModels[cfg.id] || !cfg.apiKey}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 disabled:opacity-50 transition-colors"
                            title="Fetch available models from provider"
                        >
                            {fetchingModels[cfg.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="relative flex-1">
                        <input 
                            type={showKey === cfg.id ? "text" : "password"} 
                            value={cfg.apiKey} 
                            onChange={(e) => updateConfig(idx, { apiKey: e.target.value })}
                            placeholder="API Key"
                            className="bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-10 py-2 text-sm font-mono w-full outline-none focus:border-purple-300"
                        />
                        <button 
                            onClick={() => setShowKey(showKey === cfg.id ? null : cfg.id)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showKey === cfg.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 border-l pl-4 border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={cfg.enabled} 
                                onChange={(e) => updateConfig(idx, { enabled: e.target.checked })}
                                className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                            />
                            <span className="text-xs font-bold text-gray-500 uppercase">On</span>
                        </label>
                        <button onClick={() => removeConfig(idx)} className="p-2 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors ml-2">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}

            <div className="flex justify-between items-center pt-4">
                <button 
                    onClick={addConfig} 
                    className="flex items-center gap-2 text-sm font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-lg transition-colors border border-purple-100 shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Add Provider
                </button>
                
                <button 
                    onClick={commitSave} 
                    className="flex items-center gap-2 text-sm font-bold text-white bg-gray-900 hover:bg-black px-6 py-2 rounded-lg transition-colors shadow-md"
                >
                    <Save className="w-4 h-4" /> Save Fallback Chain
                </button>
            </div>
        </div>
    )
}

