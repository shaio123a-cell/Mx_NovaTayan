import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import { TaskEditShelf } from '../components/TaskEditShelf'
import { Play, Edit2, Trash2, Plus, Search, FolderPlus, Folder, ChevronRight, ChevronDown, Clock, History } from 'lucide-react'

function Tasks() {
    const [showDrawer, setShowDrawer] = useState(false)
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchInDetails, setSearchInDetails] = useState(false)
    const [searchInHistory, setSearchInHistory] = useState(false)
    const [collapsedGroups, setCollapsedGroups] = useState<string[]>([])
    
    const queryClient = useQueryClient()

    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: tasksApi.getTasks,
    })

    const { data: groups } = useQuery({
        queryKey: ['task-groups'],
        queryFn: tasksApi.getGroups,
    })

    const deleteMutation = useMutation({
        mutationFn: tasksApi.deleteTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }
    })

    const executeMutation = useMutation({
        mutationFn: tasksApi.executeTask,
        onSuccess: () => {
            alert('Execution enqueued!')
            queryClient.invalidateQueries({ queryKey: ['executions'] })
        },
        onError: (error: any) => alert(`Execution failed: ${error.message}`),
    })

    const handleCreate = () => {
        setEditingTaskId(null)
        setShowDrawer(true)
    }

    const handleEdit = (id: string) => {
        setEditingTaskId(id)
        setShowDrawer(true)
    }

    const handleCreateFolder = async () => {
        const name = prompt('Enter folder name:')
        if (name) {
            await tasksApi.createGroup(name)
            queryClient.invalidateQueries({ queryKey: ['task-groups'] })
        }
    }

    const toggleGroup = (groupName: string) => {
        setCollapsedGroups(prev => 
            prev.includes(groupName) ? prev.filter(g => g !== groupName) : [...prev, groupName]
        )
    }

    const filteredTasks = useMemo(() => {
        if (!tasks) return []
        const query = searchQuery.toLowerCase()
        if (!query) return tasks

        return tasks.filter((t: any) => {
            const inName = t.name.toLowerCase().includes(query)
            const inURL = (t.command?.url || '').toLowerCase().includes(query)
            const inDetails = searchInDetails && (
                (t.description || '').toLowerCase().includes(query) ||
                JSON.stringify(t.command || {}).toLowerCase().includes(query)
            )
            // History search would ideally be backend, but for mock-like behavior:
            const inHistory = searchInHistory && (t.executions || []).some((e: any) => 
                (e.status || '').toLowerCase().includes(query) ||
                (e.error || '').toLowerCase().includes(query)
            )

            return inName || inURL || inDetails || inHistory
        })
    }, [tasks, searchQuery, searchInDetails, searchInHistory])

    const groupedTasks = useMemo(() => {
        const result: Record<string, any[]> = {}
        
        filteredTasks.forEach((task: any) => {
            const taskGroups = task.groups || []
            if (taskGroups.length === 0) {
                if (!result['Global']) result['Global'] = []
                result['Global'].push(task)
            } else {
                taskGroups.forEach((g: any) => {
                    if (!result[g.name]) result[g.name] = []
                    result[g.name].push(task)
                })
            }
        })

        return result
    }, [filteredTasks])

    if (isLoading) return (
        <div className="flex justify-center items-center h-[60vh]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1976D2]"></div>
        </div>
    )

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header Area */}
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tasks</h1>
                    <p className="text-gray-500 mt-1">Manage and monitor your API automation units.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleCreateFolder}
                        className="bg-white border border-gray-200 text-gray-600 px-6 py-3 rounded-lg font-bold shadow-sm hover:border-[#1976D2] hover:text-[#1976D2] transition-all flex items-center gap-2"
                    >
                        <FolderPlus size={20} /> New Folder
                    </button>
                    <button
                        onClick={handleCreate}
                        className="bg-[#1976D2] hover:bg-[#1565C0] text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
                    >
                        <Plus size={20} /> Add Task
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="mb-8 space-y-4">
                <div className="flex items-center gap-4">
                    <div className="relative group flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1976D2] transition-colors" size={20} />
                        <input 
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-4 focus:ring-blue-100 focus:border-[#1976D2] outline-none transition-all text-gray-700 font-medium"
                        />
                    </div>
                    <div className="flex gap-2">
                        <SearchToggle active={searchInDetails} onClick={() => setSearchInDetails(!searchInDetails)} label="Details" icon={<Clock size={14}/>} />
                        <SearchToggle active={searchInHistory} onClick={() => setSearchInHistory(!searchInHistory)} label="History" icon={<History size={14}/>} />
                    </div>
                </div>
            </div>

            {/* Task Grouped List */}
            <div className="space-y-6">
                {Object.entries(groupedTasks).sort(([a], [b]) => a === 'Global' ? -1 : b === 'Global' ? 1 : a.localeCompare(b)).map(([groupName, groupTasks]) => (
                    <div key={groupName} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div 
                            className="px-6 py-4 bg-gray-50/50 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleGroup(groupName)}
                        >
                            <div className="flex items-center gap-3">
                                {collapsedGroups.includes(groupName) ? <ChevronRight size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                <Folder size={20} className="text-[#1976D2]" />
                                <h3 className="font-bold text-gray-800">{groupName}</h3>
                                <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-black">{groupTasks.length}</span>
                            </div>
                            {groupName !== 'Global' && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Delete folder "${groupName}"? Tasks will be moved to Global.`)) {
                                            const gid = groups?.find((g: any) => g.name === groupName)?.id;
                                            if (gid) tasksApi.deleteGroup(gid).then(() => queryClient.invalidateQueries({ queryKey: ['task-groups'] }))
                                        }
                                    }}
                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                        
                        {!collapsedGroups.includes(groupName) && (
                            <div className="p-2 space-y-2">
                                {groupTasks.map((task: any) => (
                                    <TaskCard 
                                        key={task.id} 
                                        task={task} 
                                        onEdit={() => handleEdit(task.id)}
                                        onDelete={() => window.confirm('Permanently delete this task?') && deleteMutation.mutate(task.id)}
                                        onExecute={() => executeMutation.mutate(task.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {Object.keys(groupedTasks).length === 0 && (
                <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-gray-300 mb-4"><Search size={48} className="mx-auto opacity-20" /></div>
                    <p className="text-gray-400 font-medium text-lg">No tasks found matching your criteria.</p>
                </div>
            )}

            {/* Edit Drawer Integration */}
            {showDrawer && (
                <TaskEditShelf 
                    taskId={editingTaskId} 
                    onClose={() => setShowDrawer(false)} 
                />
            )}
        </div >
    )
}

function SearchToggle({ active, onClick, label, icon }: any) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                active 
                    ? 'bg-[#1976D2] text-white border-[#1976D2] shadow-md' 
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
            }`}
        >
            {icon} {label}
        </button>
    )
}

function TaskCard({ task, onEdit, onDelete, onExecute }: any) {
    const methodColors: any = {
        GET: 'bg-green-100 text-green-700',
        POST: 'bg-blue-100 text-blue-700',
        PUT: 'bg-amber-100 text-amber-700',
        DELETE: 'bg-red-100 text-red-700',
    }

    return (
        <div className="group bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div className="flex items-center gap-6 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${methodColors[task.command?.method] || 'bg-gray-100'}`}>
                    {task.command?.method || 'GET'}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-gray-900 text-lg truncate">{task.name}</h3>
                        <div className="flex gap-1">
                            {(task.tags || []).map((tag: string) => (
                                <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded leading-none font-mono">{tag}</span>
                            ))}
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5 truncate font-mono">{task.command?.url}</p>
                </div>
            </div>

            <div className="flex items-center gap-6 ml-6">
                <LatestStatus taskId={task.id} />
                
                <div className="flex items-center gap-1 border-l border-gray-100 pl-6">
                    <button 
                        onClick={onExecute}
                        title="Run Task"
                        className="p-2.5 text-gray-400 hover:text-[#1976D2] hover:bg-blue-50 rounded-lg transition-all"
                    >
                        <Play size={18} fill="currentColor" />
                    </button>
                    <button 
                        onClick={onEdit} 
                        title="Edit Task"
                        className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button 
                        onClick={onDelete} 
                        title="Delete Task"
                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}

function LatestStatus({ taskId }: { taskId: string }) {
    const { data: executions } = useQuery({
        queryKey: ['executions', taskId],
        queryFn: () => tasksApi.getTaskExecutions(taskId),
        refetchInterval: 10000,
    })

    const latest = executions?.[0]
    
    if (!latest) return <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">NEVER RUN</span>

    const styles: any = {
        SUCCESS: 'bg-green-100 text-green-700',
        FAILED: 'bg-red-100 text-red-700',
        RUNNING: 'bg-blue-100 text-blue-700 animate-pulse',
        PENDING: 'bg-amber-100 text-amber-700',
    }

    return (
        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${styles[latest.status] || 'bg-gray-100 text-gray-500'}`}>
            {latest.status === 'SUCCESS' ? 'Completed' : latest.status === 'RUNNING' ? 'In Progress' : latest.status === 'FAILED' ? 'Failed' : 'Pending'}
        </span>
    )
}

export default Tasks
