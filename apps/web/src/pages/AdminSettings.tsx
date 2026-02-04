import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../api/settings'
import { Settings as SettingsIcon, Save, Info } from 'lucide-react'

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

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="flex items-center gap-6 mb-10">
                <div className="p-4 rounded-2xl bg-blue-50 text-[#1976D2] border border-blue-100 shadow-sm">
                    <SettingsIcon className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">System Defaults</h1>
                    <p className="text-gray-500 mt-1">Configure global orchestration rules and status code definitions.</p>
                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-gray-50 bg-gray-50/50">
                        <h3 className="font-bold text-gray-900 flex items-center gap-3">
                            <span className="text-lg">📡</span> Global Status Mappings
                        </h3>
                        <p className="text-[11px] font-medium text-gray-400 mt-1 uppercase tracking-wider">Engine interpretation rules</p>
                    </div>
                    
                    <div className="p-8 divide-y divide-gray-50 space-y-8">
                        {settings?.map((setting: any) => (
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
                                        <button 
                                            className="p-3 text-gray-300 hover:text-[#1976D2] transition-colors bg-gray-50 rounded-lg"
                                            title="Auto-saved on blur"
                                        >
                                            <Save className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 flex gap-4">
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-blue-50">
                        <Info className="w-5 h-5 text-[#1976D2] shrink-0" />
                    </div>
                    <div className="text-sm text-[#1976D2] leading-relaxed">
                        <p className="font-black uppercase tracking-wider text-[11px] mb-2 opacity-70">Syntax Documentation</p>
                        <div className="flex gap-8">
                            <div className="flex items-center gap-2">
                                <span className="w-1 h-1 bg-[#1976D2] rounded-full" />
                                <span className="font-medium text-xs">Literal: <code>200</code></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1 h-1 bg-[#1976D2] rounded-full" />
                                <span className="font-medium text-xs">Set: <code>200, 201, 204</code></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1 h-1 bg-[#1976D2] rounded-full" />
                                <span className="font-medium text-xs">Range: <code>200-299</code></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
