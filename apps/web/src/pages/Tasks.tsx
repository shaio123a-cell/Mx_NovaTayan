import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'

function Tasks() {
    const [showForm, setShowForm] = useState(false)
    const [editingTask, setEditingTask] = useState<any>(null)
    const [statusMappings, setStatusMappings] = useState<any[]>([])
    const [sanityChecks, setSanityChecks] = useState<any[]>([])
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
    const queryClient = useQueryClient()

    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: tasksApi.getTasks,
    })

    const createMutation = useMutation({
        mutationFn: tasksApi.createTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            setShowForm(false)
            setEditingTask(null)
            alert('Task created!')
        },
        onError: (error: any) => alert(`Failed: ${error.message}`),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => tasksApi.updateTask(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            setShowForm(false)
            setEditingTask(null)
            alert('Task updated!')
        },
        onError: (error: any) => alert(`Update failed: ${error.message}`),
    })

    const deleteMutation = useMutation({
        mutationFn: tasksApi.deleteTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            alert('Task deleted!')
        },
        onError: (error: any) => alert(`Delete failed: ${error.message}`),
    })

    const executeMutation = useMutation({
        mutationFn: tasksApi.executeTask,
        onSuccess: () => {
            alert('Execution enqueued!')
            queryClient.invalidateQueries({ queryKey: ['executions'] })
        },
        onError: (error: any) => alert(`Execution failed: ${error.message}`),
    })

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const headersStr = formData.get('headers') as string
        let headers = {}
        if (headersStr) {
            try { headers = JSON.parse(headersStr) } catch { alert('Invalid JSON in headers'); return }
        }

        const taskData = {
            name: formData.get('name') as string,
            description: formData.get('description') as string || undefined,
            method: formData.get('method') as string,
            url: formData.get('url') as string,
            headers: Object.keys(headers).length > 0 ? headers : undefined,
            body: formData.get('body') as string || undefined,
            timeout: Number(formData.get('timeout')) || undefined,
            workerGroup: formData.get('workerGroup') as string || 'default',
            statusMappings: statusMappings.length > 0 ? statusMappings : undefined,
            sanityChecks: sanityChecks.length > 0 ? sanityChecks : undefined,
        }

        if (editingTask) {
            updateMutation.mutate({ id: editingTask.id, data: taskData })
        } else {
            createMutation.mutate(taskData as any)
        }
    }

    const handleEdit = (task: any) => {
        setEditingTask(task)
        setStatusMappings(task.statusMappings || [])
        setSanityChecks(task.sanityChecks || [])
        setShowForm(true)
    }

    if (isLoading) return <div className="text-center py-12">Loading...</div>

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold">Tasks</h2>
                    <p className="text-gray-400 text-sm mt-1">Manage and orchestrate HTTP requests</p>
                </div>
                <button
                    onClick={() => { setShowForm(!showForm); setEditingTask(null); }}
                    className="bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg font-bold transition-all shadow-lg"
                >
                    {showForm ? 'Cancel' : '+ New Task'}
                </button>
            </div>

            {showForm && (
                <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary-600" />
                    <h3 className="text-xl font-bold mb-6">{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Name *</label>
                                <input name="name" defaultValue={editingTask?.name} required className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary-500 outline-none" placeholder="Task name..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                                <input name="description" defaultValue={editingTask?.description} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Method</label>
                                    <select name="method" defaultValue={editingTask?.command?.method || 'GET'} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 outline-none">
                                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    {/* Placeholder for future tagging UI or empty space */}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Timeout (ms)</label>
                                <input name="timeout" type="number" defaultValue={editingTask?.command?.timeout || 30000} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 outline-none" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">URL *</label>
                                <input name="url" type="url" defaultValue={editingTask?.command?.url} required className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 outline-none" placeholder="https://..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Headers (JSON)</label>
                                <textarea name="headers" defaultValue={editingTask?.command?.headers ? JSON.stringify(editingTask.command.headers) : ''} rows={2} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 font-mono text-xs outline-none" placeholder='{"Authorization": "..."}' />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Body</label>
                                <textarea name="body" defaultValue={editingTask?.command?.body} rows={2} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 font-mono text-xs outline-none" placeholder='{"foo": "bar"}' />
                            </div>
                        </div>
                        
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-700/50">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-3">Custom Status Mappings</label>
                                <div className="space-y-2">
                                    {statusMappings.map((m, i) => (
                                        <div key={i} className="flex gap-2 items-center bg-gray-900/50 p-2 rounded-lg border border-gray-700">
                                            <input 
                                                placeholder="Code (e.g. 201-204)" 
                                                className="bg-transparent text-xs w-24 outline-none"
                                                value={m.pattern}
                                                onChange={(e) => {
                                                    const newMappings = [...statusMappings];
                                                    newMappings[i].pattern = e.target.value;
                                                    setStatusMappings(newMappings);
                                                }}
                                            />
                                            <select 
                                                className="bg-transparent text-xs outline-none text-gray-400"
                                                value={m.status}
                                                onChange={(e) => {
                                                    const newMappings = [...statusMappings];
                                                    newMappings[i].status = e.target.value;
                                                    setStatusMappings(newMappings);
                                                }}
                                            >
                                                <option value="SUCCESS">SUCCESS</option>
                                                <option value="FAILED">FAILED</option>
                                            </select>
                                            <button type="button" onClick={() => setStatusMappings(statusMappings.filter((_, idx) => idx !== i))} className="text-gray-600 hover:text-red-400 ml-auto">✕</button>
                                        </div>
                                    ))}
                                    <button 
                                        type="button" 
                                        onClick={() => setStatusMappings([...statusMappings, { pattern: '', status: 'SUCCESS' }])}
                                        className="text-[10px] font-bold text-primary-500 hover:text-primary-400"
                                    >
                                        + Add Mapping
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-3">Sanity Checks (Regex)</label>
                                <div className="space-y-2">
                                    {sanityChecks.map((c, i) => (
                                        <div key={i} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 space-y-2">
                                            <div className="flex gap-2 items-center">
                                                <input 
                                                    placeholder="Regex..." 
                                                    className="bg-transparent text-xs flex-1 outline-none font-mono"
                                                    value={c.regex}
                                                    onChange={(e) => {
                                                        const newChecks = [...sanityChecks];
                                                        newChecks[i].regex = e.target.value;
                                                        setSanityChecks(newChecks);
                                                    }}
                                                />
                                                <button type="button" onClick={() => setSanityChecks(sanityChecks.filter((_, idx) => idx !== i))} className="text-gray-600 hover:text-red-400">✕</button>
                                            </div>
                                            <div className="flex gap-4">
                                                <select 
                                                    className="bg-transparent text-[10px] outline-none text-gray-500"
                                                    value={c.condition}
                                                    onChange={(e) => {
                                                        const newChecks = [...sanityChecks];
                                                        newChecks[i].condition = e.target.value;
                                                        setSanityChecks(newChecks);
                                                    }}
                                                >
                                                    <option value="MUST_CONTAIN">MUST CONTAIN</option>
                                                    <option value="MUST_NOT_CONTAIN">MUST NOT CONTAIN</option>
                                                </select>
                                                <select 
                                                    className="bg-transparent text-[10px] outline-none text-gray-500 font-bold"
                                                    value={c.severity}
                                                    onChange={(e) => {
                                                        const newChecks = [...sanityChecks];
                                                        newChecks[i].severity = e.target.value;
                                                        setSanityChecks(newChecks);
                                                    }}
                                                >
                                                    <option value="ERROR" className="text-red-500">SEVERITY: ERROR</option>
                                                    <option value="WARNING" className="text-yellow-500">SEVERITY: WARNING</option>
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                    <button 
                                        type="button" 
                                        onClick={() => setSanityChecks([...sanityChecks, { regex: '', condition: 'MUST_CONTAIN', severity: 'ERROR' }])}
                                        className="text-[10px] font-bold text-primary-500 hover:text-primary-400"
                                    >
                                        + Add Sanity Check
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 pt-4">
                            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full bg-primary-600 hover:bg-primary-700 py-3 rounded-lg font-bold shadow-lg transition-all active:scale-[0.99]">
                                {editingTask ? 'Apply Changes' : 'Create Task'}
                            </button>
                        </div>
                    </form>
                </div >
            )
            }

            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-750 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-700">
                        <tr>
                            <th className="px-6 py-4">Task</th>
                            <th className="px-6 py-4">URL</th>
                            <th className="px-6 py-4">Last Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {tasks?.map((task: any) => (
                            <TaskRow
                                key={task.id}
                                task={task}
                                isExpanded={expandedTaskId === task.id}
                                onToggle={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                onEdit={() => handleEdit(task)}
                                onDelete={() => window.confirm('Delete?') && deleteMutation.mutate(task.id)}
                                onExecute={() => executeMutation.mutate(task.id)}
                            />
                        ))}
                    </tbody>
                </table>
                {tasks?.length === 0 && <div className="p-12 text-center text-gray-500">No tasks found.</div>}
            </div>
        </div >
    )
}

function TaskRow({ task, isExpanded, onToggle, onEdit, onDelete, onExecute }: any) {
    const methodColors: any = {
        GET: 'bg-green-500/10 text-green-500 border-green-500/20',
        POST: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        PUT: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        PATCH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
    }

    return (
        <>
            <tr className={`group hover:bg-gray-750 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-750' : ''}`} onClick={onToggle}>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${methodColors[task.command.method] || ''}`}>
                            {task.command.method}
                        </span>
                        <div className="flex flex-col">
                            <span className="font-semibold text-gray-200">{task.name}</span>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="text-sm text-gray-400 truncate max-w-xs">{task.command.url}</div>
                </td>
                <td className="px-6 py-4">
                    <LatestStatus taskId={task.id} />
                </td>
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                        <button onClick={onExecute} className="hover:text-green-400 p-1 transition-colors" title="Execute Now">▶️</button>
                        <button onClick={onEdit} className="hover:text-primary-400 p-1 transition-colors" title="Edit Task">📝</button>
                        <button onClick={onDelete} className="hover:text-red-400 p-1 transition-colors" title="Delete Task">🗑️</button>
                    </div>
                </td>
            </tr>
            {isExpanded && (
                <tr className="bg-gray-900/50">
                    <td colSpan={4} className="px-6 py-4">
                        <TaskExecutions taskId={task.id} />
                    </td>
                </tr>
            )}
        </>
    )
}

function LatestStatus({ taskId }: { taskId: string }) {
    const { data: executions } = useQuery({
        queryKey: ['executions', taskId],
        queryFn: () => tasksApi.getTaskExecutions(taskId),
        refetchInterval: 5000,
    })

    const latest = executions?.[0]
    if (!latest) return <span className="text-gray-600 text-xs italic">Never run</span>

    const styles: any = {
        SUCCESS: 'bg-green-500',
        FAILED: 'bg-red-500',
        TIMEOUT: 'bg-orange-500',
        NO_WORKER_FOUND: 'bg-gray-500',
        RUNNING: 'bg-blue-500 animate-pulse',
        PENDING: 'bg-yellow-500',
    }

    return (
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${styles[latest.status] || 'bg-gray-500'}`} />
            <span className="text-xs text-gray-300">
                {latest.status === 'SUCCESS' ? `HTTP ${latest.result?.status || 200}` : latest.status.replace(/_/g, ' ')}
            </span>
        </div>
    )
}

function TaskExecutions({ taskId }: { taskId: string }) {
    const { data: executions } = useQuery({
        queryKey: ['executions', taskId],
        queryFn: () => tasksApi.getTaskExecutions(taskId),
    })

    if (!executions || executions.length === 0) return <div className="text-xs text-gray-500 py-2">No execution history.</div>

    return (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Recent Runs</h4>
            <div className="grid grid-cols-1 gap-1">
                {executions.map((ex: any) => (
                    <div key={ex.id} className="group relative flex items-center justify-between bg-gray-800/80 p-3 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-all">
                        <div className="flex items-center gap-4">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                ex.status === 'SUCCESS' ? 'bg-green-500/20 text-green-400' : 
                                ex.status === 'FAILED' ? 'bg-red-500/20 text-red-500' :
                                ex.status === 'TIMEOUT' ? 'bg-orange-500/20 text-orange-400' :
                                ex.status === 'NO_WORKER_FOUND' ? 'bg-gray-500/20 text-gray-400' :
                                'bg-blue-500/20 text-blue-400'
                            }`}>
                                {ex.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">
                                {new Date(ex.startedAt).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            {ex.duration && <span className="text-[10px] text-gray-500">{ex.duration}ms</span>}
                            {ex.result && (
                                <ExecutionLog result={ex.result} startedAt={ex.startedAt} />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function ExecutionLog({ result, startedAt }: { result: any, startedAt: string }) {
    const [show, setShow] = useState(false)
    return (
        <div>
            <button
                onClick={(e) => { e.stopPropagation(); setShow(!show); }}
                className="text-primary-400 text-xs hover:underline flex items-center gap-1"
            >
                <span>🔍</span> {show ? 'Close' : 'View Result'}
            </button>
            {show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-gray-800 border border-gray-700 w-full max-w-4xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-750">
                            <div>
                                <h3 className="font-bold text-lg">Execution Result</h3>
                                <p className="text-xs text-gray-400 font-mono">{new Date(startedAt).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setShow(false)} className="text-gray-400 hover:text-white p-2">✕</button>
                        </div>
                        <div className="flex-1 overflow-auto p-6 bg-gray-900">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Status</div>
                                    <div className={`text-xl font-bold ${result.status < 400 ? 'text-green-500' : 'text-red-500'}`}>
                                        HTTP {result.status}
                                    </div>
                                </div>
                                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 md:col-span-2">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Outcome</div>
                                    <div className="text-sm truncate font-mono text-gray-300">
                                        {result.status < 400 ? 'Success' : 'Task returned an error status code.'}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Response Body</h4>
                                    <pre className="text-xs font-mono bg-black/50 p-4 rounded-lg border border-gray-800 text-gray-300 whitespace-pre-wrap break-all overflow-auto max-h-96">
                                        {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
                                    </pre>
                                </div>
                                {result.headers && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Response Headers</h4>
                                        <pre className="text-[10px] font-mono bg-black/20 p-4 rounded-lg text-gray-500">
                                            {JSON.stringify(result.headers, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-700 bg-gray-850 flex justify-end">
                            <button onClick={() => setShow(false)} className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-bold transition-all">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Tasks
