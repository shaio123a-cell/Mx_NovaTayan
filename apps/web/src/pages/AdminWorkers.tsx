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
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Worker Management</h2>
                    <p className="text-gray-400 mt-1">Monitor coverage and manage targeting tags</p>
                </div>
                <button className="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 rounded-lg font-bold transition-all shadow-lg text-sm flex items-center gap-2">
                    <span>⬇️</span> Download Agent
                </button>
            </div>

            <div className="grid gap-6">
                <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900/50 text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700">
                            <tr>
                                <th className="px-6 py-4">Worker / Hostname</th>
                                <th className="px-6 py-4">Targeting Tags</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Last Seen</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {workers?.map((worker: any) => (
                                <tr key={worker.id} className="hover:bg-gray-700/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-200">{worker.name || worker.hostname}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-mono text-gray-500 bg-black/30 px-1.5 py-0.5 rounded">{worker.hostname} • {worker.ipAddress}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm max-w-xs break-words">
                                        <div className="flex flex-wrap gap-1.5">
                                            {worker.tags?.length > 0 ? (
                                                worker.tags.map((tag: string) => (
                                                    <span key={tag} className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">
                                                        {tag}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-600 italic text-xs">Global only</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={worker.status} lastSeen={worker.lastSeen} />
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400 font-mono text-xs">
                                        {new Date(worker.lastSeen).toLocaleTimeString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setEditingTagsWorker(worker)}
                                                className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-3 py-1.5 rounded transition-colors text-xs font-bold"
                                            >
                                                Edit Tags
                                            </button>
                                            <button
                                                onClick={() => toggleMutation.mutate({ id: worker.id, enabled: worker.status === 'DISABLED' })}
                                                className={`px-3 py-1.5 rounded text-xs font-bold transition-all border ${worker.status === 'DISABLED'
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                                                    : 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20'
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
                    {workers?.length === 0 && <div className="p-12 text-center text-gray-500 italic">No workers registered yet.</div>}
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Guide</h3>
                    <ul className="space-y-3 text-sm text-gray-400">
                        <li className="flex items-start gap-3">
                            <span className="bg-indigo-500/20 text-indigo-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                            <span>Download and run the worker agent on any machine.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="bg-indigo-500/20 text-indigo-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                            <span>Assign <strong>Tags</strong> (e.g. <code>gpu</code>, <code>us-east</code>) to route specific workflows.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="bg-indigo-500/20 text-indigo-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                            <span>Workflows with matching tags will <strong>automatically fan-out</strong> to these workers.</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-gray-800 border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700 bg-gray-900/50">
                    <h3 className="font-bold text-xl text-gray-100">Edit Worker Tags</h3>
                    <p className="text-sm text-gray-500 mt-1">Targeting for {worker.hostname}</p>
                </div>
                <div className="p-6">
                    <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
                        {tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded text-xs font-bold border border-indigo-500/20">
                                {tag}
                                <button onClick={() => removeTag(tag)} className="hover:text-white px-1">✕</button>
                            </span>
                        ))}
                        {tags.length === 0 && <span className="text-gray-500 text-sm italic py-1">No tags assigned.</span>}
                    </div>

                    <form onSubmit={addTag} className="flex gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="Add a tag (e.g. 'production')..."
                            autoFocus
                        />
                        <button type="submit" disabled={!input.trim()} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            Add
                        </button>
                    </form>
                </div>
                <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="text-gray-400 hover:text-white px-4 py-2 text-sm font-bold transition-colors">Cancel</button>
                    <button onClick={() => onSave(tags)} className="bg-gray-100 hover:bg-white text-black px-6 py-2 rounded-lg text-sm font-bold shadow-lg hover:scale-[1.02] transition-all">Save Changes</button>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status, lastSeen }: { status: string, lastSeen: Date }) {
    // Check if offline (no heartbeat for > 1 minute)
    const isActuallyOffline = status !== 'DISABLED' && (new Date().getTime() - new Date(lastSeen).getTime() > 60000);
    const displayStatus = isActuallyOffline ? 'OFFLINE' : status;

    const styles: any = {
        ONLINE: 'bg-green-500/20 text-green-400 border-green-500/20',
        OFFLINE: 'bg-red-500/20 text-red-500 border-red-500/20',
        DISABLED: 'bg-gray-500/20 text-gray-400 border-gray-500/20',
    }

    return (
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${displayStatus === 'ONLINE' ? 'bg-green-500' : displayStatus === 'OFFLINE' ? 'bg-red-500' : 'bg-gray-500'}`} />
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${styles[displayStatus]}`}>
                {displayStatus}
            </span>
        </div>
    )
}

export default AdminWorkers
