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
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-xl bg-primary-600/10 text-primary-500">
                    <SettingsIcon className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Global Settings</h1>
                    <p className="text-gray-400">Manage system-wide defaults for task orchestration</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
                    <div className="p-6 border-b border-gray-700 bg-gray-900/30">
                        <h3 className="font-bold flex items-center gap-2">
                            <span>🛠️</span> HTTP Success/Failure Mapping
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Define how HTTP status codes are interpreted by the worker engine.</p>
                    </div>
                    
                    <div className="p-6 divide-y divide-gray-700 space-y-6">
                        {settings?.map((setting: any) => (
                            <div key={setting.key} className="pt-6 first:pt-0">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-bold text-gray-200 mb-1">
                                            {setting.key.replace(/_/g, ' ')}
                                        </label>
                                        <p className="text-xs text-gray-500">{setting.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            defaultValue={setting.value}
                                            className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm font-mono focus:ring-1 focus:ring-primary-500 outline-none w-48"
                                            onBlur={(e) => {
                                                if (e.target.value !== setting.value) {
                                                    handleSave(setting.key, e.target.value)
                                                }
                                            }}
                                        />
                                        <button 
                                            className="p-2 text-gray-500 hover:text-primary-500 transition-colors"
                                            title="Saved automatically on blur"
                                        >
                                            <Save className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                    <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-300/80 leading-relaxed">
                        <p className="font-bold text-blue-400 mb-1">Pattern Guide:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Specific code: <code>200</code></li>
                            <li>Comma separated: <code>200, 201, 204</code></li>
                            <li>Ranges: <code>200-299</code></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
