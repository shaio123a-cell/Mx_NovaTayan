import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workersApi } from '../api/workers'
import { useState } from 'react'

function AdminWorkers() {
    const queryClient = useQueryClient()
    const { data: workers, isLoading } = useQuery({
        queryKey: ['workers'],
        queryFn: workersApi.getWorkers,
        refetchInterval: 10000 // Refresh every 10s
    })

    const [editingTagsWorker, setEditingTagsWorker] = useState<any>(null);

    const toggleMutation = useMutation({
        mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
            workersApi.updateWorker(id, { status: enabled ? 'ONLINE' : 'DISABLED' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workers'] }),
    })

    const updateTagsMutation = useMutation({
        mutationFn: ({ id, tags }: { id: string; tags: string[] }) =>
            workersApi.updateWorker(id, { tags } as any),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            setEditingTagsWorker(null);
        },
    });

    if (isLoading) return <div className="p-8 text-center text-gray-400 animate-pulse">Loading fleet status...</div>

    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Worker Fleet</h2>
                    <p className="text-gray-500 mt-1">Monitor agent coverage and manage dynamic targeting tags.</p>
                </div>
                <button className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm text-sm flex items-center gap-2">
                    <span style={{ color: '#1976D2' }}>⬇️</span> Download Agent
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-12">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] border-b border-gray-100">
                        <tr>
                            <th className="px-8 py-5">Node / Identity</th>
                            <th className="px-8 py-5">Targeting Tags</th>
                            <th className="px-8 py-5">Status</th>
                            <th className="px-8 py-5">Last Heartbeat</th>
                            <th className="px-8 py-5 text-right">Control</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {workers?.map((worker: any) => (
                            <tr key={worker.id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900 text-base">{worker.name || worker.hostname}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{worker.hostname} • {worker.ipAddress}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-wrap gap-2">
                                        {worker.tags?.length > 0 ? (
                                            worker.tags.map((tag: string) => (
                                                <span key={tag} className="bg-blue-50 text-[#1976D2] px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-blue-100">
                                                    {tag}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-gray-300 italic text-[11px] font-medium tracking-wide">GLOBAL SCOPE</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <StatusBadge status={worker.status} lastSeen={worker.lastSeen} />
                                </td>
                                <td className="px-8 py-6">
                                    <span className="text-gray-500 font-medium text-xs bg-gray-50 px-2 py-1 rounded border border-gray-100 italic">
                                        {new Date(worker.lastSeen).toLocaleTimeString()}
                                    </span >
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setEditingTagsWorker(worker)}
                                            className="text-[#1976D2] hover:text-[#1565C0] hover:bg-blue-50 px-4 py-2 rounded-lg transition-all text-xs font-black uppercase tracking-widest"
                                        >
                                            Edit Tags
                                        </button>
                                        <button
                                            onClick={() => toggleMutation.mutate({ id: worker.id, enabled: worker.status === 'DISABLED' })}
                                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${worker.status === 'DISABLED'
                                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                                                }`}
                                        >
                                            {worker.status === 'DISABLED' ? 'Enable' : 'Disable'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {(!workers || workers.length === 0) && (
                    <div className="p-20 text-center">
                        <div className="text-4xl mb-4">🤖</div>
                        <h4 className="text-gray-900 font-bold">No Workers Detected</h4>
                        <p className="text-gray-500 text-sm mt-1">Download the agent to start processing tasks.</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-full -mr-10 -mt-10" />
                    <h3 className="text-sm font-black text-[#1976D2] uppercase tracking-[0.2em] mb-6">Execution Guide</h3>
                    <ul className="space-y-4 text-sm text-gray-600 relative z-10">
                        <li className="flex items-start gap-4">
                            <span className="bg-blue-100 text-[#1976D2] rounded-lg w-6 h-6 flex items-center justify-center text-[10px] font-black mt-0.5">1</span>
                            <span><b>Agent Deployment:</b> Run the binary on any server; it will auto-register via hostname.</span>
                        </li>
                        <li className="flex items-start gap-4">
                            <span className="bg-blue-100 text-[#1976D2] rounded-lg w-6 h-6 flex items-center justify-center text-[10px] font-black mt-0.5">2</span>
                            <span><b>Tag Assignment:</b> Use tags like <code>gpu</code> or <code>legacy-db</code> to create specialized pools.</span>
                        </li>
                        <li className="flex items-start gap-4">
                            <span className="bg-blue-100 text-[#1976D2] rounded-lg w-6 h-6 flex items-center justify-center text-[10px] font-black mt-0.5">3</span>
                            <span><b>Dynamic Routing:</b> Workflows targeting those tags will automatically distribute tasks across matching nodes.</span>
                        </li>
                    </ul>
                </div>
            </div>

            {editingTagsWorker && (
                <TagEditor
                    worker={editingTagsWorker}
                    onClose={() => setEditingTagsWorker(null)}
                    onSave={(tags: string[]) => updateTagsMutation.mutate({ id: editingTagsWorker.id, tags })}
                />
            )}
        </div>
    )
}

function TagEditor({ worker, onClose, onSave }: any) {
    const [tags, setTags] = useState<string[]>(worker.tags || []);
    const [input, setInput] = useState('');

    const addTag = (e: any) => {
        e.preventDefault();
        const val = input.trim();
        if (val && !tags.includes(val)) {
            setTags([...tags, val]);
            setInput('');
        }
    };

    const removeTag = (t: string) => setTags(tags.filter((tag) => tag !== t));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100" onClick={(e) => e.stopPropagation()}>
                <div className="p-8 border-b border-gray-50 bg-gray-50/50">
                    <h3 className="font-bold text-xl text-gray-900">Manage Targeting Tags</h3>
                    <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-wider">Node: {worker.hostname}</p>
                </div>
                <div className="p-8">
                    <div className="flex flex-wrap gap-2 mb-6 min-h-[40px]">
                        {tags.map(tag => (
                            <span key={tag} className="flex items-center gap-2 bg-blue-50 text-[#1976D2] px-3 py-1.5 rounded-lg text-[10px] font-black border border-blue-100 uppercase tracking-widest">
                                {tag}
                                <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">✕</button>
                            </span>
                        ))}
                        {tags.length === 0 && <span className="text-gray-400 text-xs italic py-1 font-medium">Currently receiving GLOBAL tasks only.</span>}
                    </div>

                    <form onSubmit={addTag} className="flex gap-3">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-[#1976D2] focus:ring-1 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300"
                            placeholder="Add tag (e.g. 'prod')..."
                            autoFocus
                        />
                        <button type="submit" disabled={!input.trim()} className="bg-[#1976D2] hover:bg-[#1565C0] text-white px-5 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md">
                            Add
                        </button>
                    </form>
                </div>
                <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors">Dismiss</button>
                    <button onClick={() => onSave(tags)} className="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">Update Worker</button>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status, lastSeen }: { status: string, lastSeen: Date }) {
    const isActuallyOffline = status !== 'DISABLED' && (new Date().getTime() - new Date(lastSeen).getTime() > 60000);
    const displayStatus = isActuallyOffline ? 'OFFLINE' : status;

    const styles: any = {
        ONLINE: 'bg-green-50 text-green-700 border-green-100',
        OFFLINE: 'bg-red-50 text-red-600 border-red-100',
        DISABLED: 'bg-gray-100 text-gray-500 border-gray-200',
    }

    return (
        <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full animate-pulse ${displayStatus === 'ONLINE' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : displayStatus === 'OFFLINE' ? 'bg-red-500' : 'bg-gray-400'}`} />
            <span className={`text-[10px] font-black px-3 py-1 rounded-md border uppercase tracking-wider ${styles[displayStatus]}`}>
                {displayStatus}
            </span>
        </div>
    )
}

export default AdminWorkers
