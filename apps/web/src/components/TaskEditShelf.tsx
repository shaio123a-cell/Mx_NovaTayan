import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import { useState, useEffect } from 'react'
import { X, AlertTriangle, Save, Info } from 'lucide-react'

interface Props {
    taskId: string;
    onClose: () => void;
}

export function TaskEditShelf({ taskId, onClose }: Props) {
    const queryClient = useQueryClient()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [url, setUrl] = useState('')

    const { data: task, isLoading: isTaskLoading } = useQuery({
        queryKey: ['task', taskId],
        queryFn: () => tasksApi.getTask(taskId),
        enabled: !!taskId
    })

    const { data: impact, isLoading: isImpactLoading } = useQuery({
        queryKey: ['task-impact', taskId],
        queryFn: () => tasksApi.getTaskImpact(taskId),
        enabled: !!taskId
    })

    useEffect(() => {
        if (task) {
            setName(task.name)
            setDescription(task.description || '')
            setUrl((task as any).command?.url || '')
        }
    }, [task])

    const updateMutation = useMutation({
        mutationFn: (data: any) => tasksApi.updateTask(taskId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            queryClient.invalidateQueries({ queryKey: ['workflow-execution'] })
            onClose()
        }
    })

    if (isTaskLoading || isImpactLoading) {
        return (
            <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-700 shadow-2xl z-[100] p-6 flex items-center justify-center">
                <div className="animate-spin text-primary-400 text-2xl">⌛</div>
            </div>
        )
    }

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-700 shadow-2xl z-[100] flex flex-col animate-slide-in-right">
            <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center px-6">
                <div>
                    <h3 className="font-bold text-gray-200">Edit Task</h3>
                    <p className="text-[10px] text-gray-500 uppercase font-mono">{taskId}</p>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Impact Assessment Warning */}
                {impact && impact.count > 0 && (
                    <div className="bg-orange-900/20 border border-orange-500/20 p-4 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-wider">
                            <AlertTriangle size={14} /> Critical Impact
                        </div>
                        <p className="text-xs text-orange-200/70 leading-relaxed">
                            Editing this task affects <strong>{impact.count}</strong> workflows.
                        </p>
                        <div className="bg-black/20 p-2 rounded-lg">
                            <ul className="text-[10px] text-orange-300/50 space-y-1">
                                {impact.workflows.map((wf: any) => (
                                    <li key={wf.id}>• {wf.name}</li>
                                ))}
                                {impact.count > 10 && <li>...and {impact.count - 10} more</li>}
                            </ul>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Task Name</label>
                        <input 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-black/30 border border-gray-700 rounded-lg p-2.5 text-sm text-gray-200 focus:border-primary-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Description</label>
                        <textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-black/30 border border-gray-700 rounded-lg p-2.5 text-sm text-gray-200 focus:border-primary-500 outline-none transition-all h-20 resize-none"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">URL</label>
                        <input 
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full bg-black/30 border border-gray-700 rounded-lg p-2.5 text-sm font-mono text-primary-400 focus:border-primary-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="bg-blue-900/10 border border-blue-500/10 p-4 rounded-xl flex gap-3">
                    <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-300/60 leading-relaxed">
                        Changes to shared tasks will be applied immediately across all executions that haven't picked up this task yet.
                    </p>
                </div>
            </div>

            <div className="p-4 bg-gray-800 border-t border-gray-700 flex gap-3 px-6">
                <button 
                    onClick={() => updateMutation.mutate({ name, description, url })}
                    disabled={updateMutation.isPending}
                    className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                >
                    <Save size={16} /> Save Changes
                </button>
                <button 
                    onClick={onClose}
                    className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 font-bold text-gray-300 rounded-lg transition-all"
                >
                    Cancel
                </button>
            </div>
        </div>
    )
}
