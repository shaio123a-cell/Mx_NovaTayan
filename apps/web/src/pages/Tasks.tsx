import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { tasksApi } from '../api/tasks'
import { TaskEditShelf } from '../components/TaskEditShelf'
import { Play, Edit2, Trash2, Plus, Search, FolderPlus, Folder, ChevronRight, ChevronDown, Clock, History, AlertTriangle, ListTodo, X, MoreVertical, ArrowUp, ArrowDown } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useBreadcrumbs } from '../context/BreadcrumbContext'

const ICON_MAPPING: Record<string, string> = {
    'aws':            'https://cdn.simpleicons.org/amazonaws/FF9900',
    'amazon':         'https://cdn.simpleicons.org/amazon/FF9900',
    'google':         'https://cdn.simpleicons.org/google/4285F4',
    'google cloud':   'https://cdn.simpleicons.org/googlecloud/4285F4',
    'microsoft':      'https://cdn.simpleicons.org/microsoft/5E5E5E',
    'azure':          'https://cdn.simpleicons.org/microsoftazure/0078D4',
    'ibm':            'https://cdn.simpleicons.org/ibm/052FAD',
    'sap':            'https://cdn.simpleicons.org/sap/0FAAFF',
    'bmc':            'https://cdn.simpleicons.org/bmcsoftware/FF2D9C',
    'salesforce':     'https://cdn.simpleicons.org/salesforce/00A1E0',
    'servicenow':     'https://cdn.simpleicons.org/servicenow/62D84E',
    'github':         'https://cdn.simpleicons.org/github/181717',
    'gitlab':         'https://cdn.simpleicons.org/gitlab/FC6D26',
    'slack':          'https://cdn.simpleicons.org/slack/4A154B',
    'jira':           'https://cdn.simpleicons.org/jira/0052CC',
};

function normalizeSlug(name: string): string {
    return name.toLowerCase().replace(/\.com$/i, '').replace(/\s+/g, '').replace(/[^\w]/g, '');           
}

function getEffectiveIcon(item: any) {
    if (item.icon) return item.icon;
    const name = (item.name || '').toLowerCase();
    const sorted = Object.keys(ICON_MAPPING).sort((a, b) => b.length - a.length);
    for (const key of sorted) {
        if (name.includes(key)) return ICON_MAPPING[key];
    }
    const slug = normalizeSlug(name);
    if (slug.length > 1) return `https://cdn.simpleicons.org/${slug}`;
    return null;
}

function BrandIcon({ task }: any) {
    const [error, setError] = useState(false);
    const icon = getEffectiveIcon(task);
    const method = task.command?.method || 'GET';
    const methodColors: any = {
        GET: 'bg-green-100 text-green-700',
        POST: 'bg-blue-100 text-blue-700',
        PUT: 'bg-amber-100 text-amber-700',
        DELETE: 'bg-red-100 text-red-700',
    }

    if (icon && !error) {
        return (
            <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                <img 
                    src={icon} 
                    className="w-7 h-7 object-contain" 
                    alt="brand" 
                    onError={() => setError(true)} 
                />
            </div>
        );
    }

    return (
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${methodColors[method] || 'bg-gray-100'}`}>
            {method}
        </div>
    );
}

function Tasks() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams()
    const currentFolderId = searchParams.get('folderId')
    
    const [showDrawer, setShowDrawer] = useState(false)
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchInDetails, setSearchInDetails] = useState(false)
    const [searchInHistory, setSearchInHistory] = useState(false)
    const { showToast } = useToast();
    const { setExtraSegments } = useBreadcrumbs()
    
    const queryClient = useQueryClient()

    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks', currentFolderId],
        queryFn: () => tasksApi.getTasks(currentFolderId || undefined),
    })

    const { data: folderTree } = useQuery({
        queryKey: ['task-folders'],
        queryFn: tasksApi.getFolderTree,
    })

    // Flatten folders to find current folder name
    const currentFolder = useMemo(() => {
        if (!folderTree || !currentFolderId) return null;
        const find = (nodes: any[]): any => {
            for (const n of nodes) {
                if (n.id === currentFolderId) return n;
                if (n.children) {
                    const found = find(n.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return find(folderTree);
    }, [folderTree, currentFolderId]);

    const [isCreatingFolder, setIsCreatingFolder] = useState(false)
    const [isRenamingFolder, setIsRenamingFolder] = useState(false)
    const [isConfirmingFolderDelete, setIsConfirmingFolderDelete] = useState(false)
    const [deletionBlockers, setDeletionBlockers] = useState<{ names: string[], total: number } | null>(null)
    const [newFolderName, setNewFolderName] = useState('')
    const [renameFolderName, setRenameFolderName] = useState('')

    const breadcrumbs = useMemo(() => {
        if (!currentFolderId || !folderTree) return []
        const path: { id: string, name: string }[] = []
        function findPath(nodes: any[], targetId: string): boolean {
            for (const node of nodes) {
                if (node.id === targetId) {
                    path.push({ id: node.id, name: node.name })
                    return true
                }
                if (node.children && findPath(node.children, targetId)) {
                    path.push({ id: node.id, name: node.name })
                    return true
                }
            }
            return false
        }
        findPath(folderTree, currentFolderId)
        return path.reverse()
    }, [folderTree, currentFolderId])

    React.useEffect(() => {
        const segments = [
            { label: 'Tasks', path: '/tasks' },
            ...breadcrumbs.map(crumb => ({
                label: crumb.name,
                path: `/tasks?folderId=${crumb.id}`
            }))
        ]
        setExtraSegments(segments)
        return () => setExtraSegments([])
    }, [breadcrumbs, setExtraSegments])

    const deleteMutation = useMutation({
        mutationFn: tasksApi.deleteTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }
    })

    const reorderMutation = useMutation({
        mutationFn: ({ id, order }: { id: string, order: number }) => tasksApi.reorderTask(id, order),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }
    })

    const updateFolderMutation = useMutation({
        mutationFn: ({ id, name }: { id: string, name: string }) => tasksApi.updateFolder(id, { name }),
        onSuccess: () => {
            showToast('Folder renamed successfully', 'success')
            setIsRenamingFolder(false)
            queryClient.invalidateQueries({ queryKey: ['task-folders'] })
        },
        onError: (err: any) => showToast(err.message || 'Failed to rename folder', 'error')
    })

    const deleteFolderMutation = useMutation({
        mutationFn: tasksApi.deleteFolder,
        onSuccess: () => {
            showToast('Folder deleted successfully', 'success')
            setIsConfirmingFolderDelete(false)
            queryClient.invalidateQueries({ queryKey: ['task-folders'] })
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            navigate('/tasks')
        },
        onError: (err: any) => {
            setIsConfirmingFolderDelete(false)
            if (err.blockers) {
                setDeletionBlockers({ names: err.blockers, total: err.totalBlockers });
            } else {
                showToast(err.message || 'Failed to delete folder', 'error');
            }
        }
    })

    const executeMutation = useMutation({
        mutationFn: tasksApi.executeTask,
        onSuccess: () => {
            showToast('Task execution started successfully!', 'success')
            queryClient.invalidateQueries({ queryKey: ['executions'] })
        },
        onError: (error: any) => showToast(`Execution failed: ${error.message}`, 'error'),
    })

    const createFolderMutation = useMutation({
        mutationFn: (data: { name: string, parentId?: string }) => tasksApi.createFolder(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-folders'] })
            setIsCreatingFolder(false)
            setNewFolderName('')
            showToast('Folder created successfully', 'success')
        },
        onError: (err: any) => showToast(err.message || 'Failed to create folder', 'error')
    })

    const handleCreateFolder = (e: React.FormEvent) => {
        e.preventDefault()
        if (newFolderName) {
            createFolderMutation.mutate({ 
                name: newFolderName, 
                parentId: currentFolderId || undefined 
            })
        }
    }

    const handleCreate = () => {
        setEditingTaskId(null)
        setShowDrawer(true)
    }

    const handleEdit = (id: string) => {
        setEditingTaskId(id)
        setShowDrawer(true)
    }


    const filteredTasks = useMemo(() => {
        if (!tasks) return []
        
        // Filter by folder first if selected
        let list = tasks;
        if (currentFolderId) {
            list = tasks.filter((t: any) => t.folderId === currentFolderId);
        } else if (tasks.length > 0) {
            // If no folder selected, maybe show "General" or all top-level?
            // User requested Postman style, where clicking a folder in sidebar shows its items.
            // If viewing root /tasks, we show all (or just top-level). 
            // Let's show all for now unless filtered.
        }

        const query = searchQuery.toLowerCase()
        if (!query) return list

        return list.filter((t: any) => {
            const inName = t.name.toLowerCase().includes(query)
            const inURL = (t.command?.url || '').toLowerCase().includes(query)
            const inDetails = searchInDetails && (
                (t.description || '').toLowerCase().includes(query) ||
                JSON.stringify(t.command || {}).toLowerCase().includes(query)
            )
            const inHistory = searchInHistory && (t.executions || []).some((e: any) => 
                (e.status || '').toLowerCase().includes(query) ||
                (e.error || '').toLowerCase().includes(query)
            )

            const isVariableTask = t.taskType === 'VARIABLE';
            return (inName || inURL || inDetails || inHistory) && !isVariableTask;
        })
    }, [tasks, currentFolderId, searchQuery, searchInDetails, searchInHistory])

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [localTasks, setLocalTasks] = useState<any[]>([]);

    React.useEffect(() => {
        setLocalTasks(filteredTasks);
    }, [filteredTasks]);

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const next = [...localTasks];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= next.length) return;

        // Decimal ordering logic
        let newOrder: number;
        if (direction === 'up') {
            const prev = next[target - 1];
            const current = next[target];
            newOrder = prev ? (prev.order + current.order) / 2 : current.order - 1;
        } else {
            const nextItem = next[target + 1];
            const current = next[target];
            newOrder = nextItem ? (nextItem.order + current.order) / 2 : current.order + 1;
        }

        reorderMutation.mutate({ id: next[index].id, order: newOrder });
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // Add task data for external drop targets (like the sidebar)
        e.dataTransfer.setData('application/restmon-task', localTasks[index].id);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const next = [...localTasks];
        const item = next[draggedIndex];
        next.splice(draggedIndex, 1);
        next.splice(index, 0, item);
        setLocalTasks(next);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        if (draggedIndex === null) return;
        
        // Calculate the new order based on surrounding items
        const index = draggedIndex;
        const prev = localTasks[index - 1];
        const next = localTasks[index + 1];
        
        let newOrder: number;
        if (!prev && !next) newOrder = 0;
        else if (!prev) newOrder = next.order - 1;
        else if (!next) newOrder = prev.order + 1;
        else newOrder = (prev.order + next.order) / 2;

        reorderMutation.mutate({ id: localTasks[index].id, order: newOrder });
        setDraggedIndex(null);
    };

    if (isLoading) return (
        <div className="flex justify-center items-center h-[60vh]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1976D2]"></div>
        </div>
    )

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col mb-10">

                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                            <ListTodo size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                                    {currentFolder ? currentFolder.name : 'All Tasks'}
                                </h1>
                                {currentFolder && (
                                    <div className="flex items-center gap-1 ml-2">
                                        <button 
                                            onClick={() => {
                                                setRenameFolderName(currentFolder.name);
                                                setIsRenamingFolder(true);
                                            }}
                                            className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors"
                                            title="Rename Folder"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => setIsConfirmingFolderDelete(true)}
                                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                            title="Delete Folder"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <p className="text-gray-500 mt-1">
                                {currentFolder?.description || (currentFolderId ? 'Showing tasks in this folder.' : 'Manage and monitor your API automation units.')}
                            </p>
                        </div>
                    </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsCreatingFolder(true)}
                        className="bg-white border border-gray-200 text-gray-600 px-6 py-3 rounded-lg font-bold shadow-sm hover:border-[#1976D2] hover:text-[#1976D2] transition-all flex items-center gap-2"
                    >
                        <FolderPlus size={20} /> {currentFolderId ? 'New Sub-folder' : 'New Folder'}
                    </button>
                    <button
                        onClick={handleCreate}
                        className="bg-[#1976D2] hover:bg-[#1565C0] text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
                    >
                        <Plus size={20} /> Add Task
                    </button>
                </div>
            </div>
        </div>

            {/* Subfolder navigation is now handled by the Sidebar Tree for better scalability */}

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

            {/* Task List */}
            <div className="space-y-3">
                {localTasks.map((task: any, index) => (
                    <TaskCard 
                        key={task.id} 
                        task={task} 
                        index={index}
                        isDragged={draggedIndex === index}
                        onDragStart={(e: any) => handleDragStart(e, index)}
                        onDragOver={(e: any) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onMove={(dir: 'up' | 'down') => handleMove(index, dir)}
                        onEdit={() => handleEdit(task.id)}
                        onDelete={() => window.confirm('Permanently delete this task?') && deleteMutation.mutate(task.id)}
                        onExecute={() => executeMutation.mutate(task.id)}
                    />
                ))}

                {filteredTasks.length === 0 && (
                    <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="text-gray-300 mb-4"><Search size={48} className="mx-auto opacity-20" /></div>
                        <p className="text-gray-400 font-medium text-lg">No tasks found in this view.</p>
                        {searchQuery && <p className="text-gray-400 text-sm">Try adjusting your search filters.</p>}
                    </div>
                )}
            </div>

            {/* Edit Drawer Integration */}
            {showDrawer && (
                <TaskEditShelf 
                    taskId={editingTaskId} 
                    folderId={currentFolderId || undefined}
                    onClose={() => setShowDrawer(false)} 
                />
            )}

            {/* Rename Folder Modal (Global Var Style) */}
            {isRenamingFolder && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900">Rename Folder</h3>
                            <button onClick={() => setIsRenamingFolder(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20}/></button>
                        </div>
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (currentFolderId) {
                                    updateFolderMutation.mutate({ id: currentFolderId, name: renameFolderName });
                                }
                            }} 
                            className="p-6 space-y-4"
                        >
                           <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Folder Name</label>
                                <input 
                                    autoFocus
                                    value={renameFolderName}
                                    onChange={(e) => setRenameFolderName(e.target.value)}
                                    required 
                                    placeholder="e.g. Infrastructure Setup" 
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100/50 text-sm" 
                                />
                           </div>
                           <div className="pt-4 flex justify-end gap-3 border-t border-gray-50 mt-2">
                               <button type="button" onClick={() => setIsRenamingFolder(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium text-sm transition-colors">Cancel</button>
                               <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm shadow-sm hover:shadow transition-all">Save Changes</button>
                           </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Folder Modal (Global Var Style) */}
            {isCreatingFolder && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900">Create New Folder</h3>
                            <button onClick={() => setIsCreatingFolder(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleCreateFolder} className="p-6 space-y-4">
                           <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Folder Name</label>
                                <input 
                                    autoFocus
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    required 
                                    placeholder="e.g. Infrastructure Setup" 
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100/50 text-sm" 
                                />
                           </div>
                           <div className="pt-4 flex justify-end gap-3 border-t border-gray-50 mt-2">
                               <button type="button" onClick={() => setIsCreatingFolder(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium text-sm transition-colors">Cancel</button>
                               <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm shadow-sm hover:shadow transition-all">Create Folder</button>
                           </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal (Unsaved Changes Style) */}
            {isConfirmingFolderDelete && (
                <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-[450px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                        <div className="p-6 pb-4 border-b border-slate-100 flex items-center gap-4">
                            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shrink-0 border border-red-100">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight">Delete Folder?</h3>
                                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                                    Are you sure you want to delete <span className="font-bold text-slate-700">"{currentFolder?.name}"</span> and all tasks inside? This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="p-4 flex flex-col gap-2 bg-slate-50/50">
                            <button 
                                onClick={() => deleteFolderMutation.mutate(currentFolder?.id)}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} /> Confirm Deletion
                            </button>
                            <button 
                                onClick={() => setIsConfirmingFolderDelete(false)}
                                className="w-full py-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl font-bold text-sm transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deletion Blockers Modal (Unsaved Changes Style) */}
            {deletionBlockers && (
                <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-[500px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                        <div className="p-6 pb-4 border-b border-slate-100 flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center shrink-0 border border-amber-100">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight">Deletion Blocked</h3>
                                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                                    Cannot delete folder: It contains tasks used by <span className="font-bold text-slate-700">{deletionBlockers.total} workflow(s)</span>.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50/50">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Workflows using these tasks:</div>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 no-scrollbar">
                                {deletionBlockers.names.map((name, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        {name}
                                    </div>
                                ))}
                                {deletionBlockers.total > 10 && (
                                    <div className="text-center text-[10px] text-slate-400 font-bold py-2">...and {deletionBlockers.total - 10} more</div>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium mt-4 italic">
                                Please unbind these tasks from the workflows before deleting the folder.
                            </p>
                        </div>
                        <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
                            <button 
                                onClick={() => setDeletionBlockers(null)}
                                className="px-6 py-2 bg-[#1976D2] hover:bg-[#1565C0] text-white rounded-lg font-bold text-sm transition-all shadow-md"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
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

function TaskCard({ task, onEdit, onDelete, onExecute, index, isDragged, onDragStart, onDragOver, onDragEnd, onMove }: any) {
    return (
        <div 
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            className={`group bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between ${isDragged ? 'opacity-30' : ''}`}
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Reorder Controls (Variable Manager Style) */}
                <div className="flex items-center gap-1 shrink-0">
                    <div className="cursor-move text-gray-300 group-hover:text-gray-400 p-1">
                        <MoreVertical size={18} />
                    </div>
                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onMove('up')} className="p-0.5 text-gray-400 hover:text-blue-600 rounded">
                            <ArrowUp size={12} />
                        </button>
                        <button onClick={() => onMove('down')} className="p-0.5 text-gray-400 hover:text-blue-600 rounded">
                            <ArrowDown size={12} />
                        </button>
                    </div>
                </div>

                <BrandIcon task={task} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-gray-900 text-lg truncate">{task.name}</h3>
                        <div className="flex gap-1">
                            {(task.tags || []).map((tag: string) => (
                                <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded leading-none font-mono">{tag}</span>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-400 mt-0.5 truncate font-mono">{task.command?.url}</p>
                        {task.folder && (
                            <span className="flex items-center gap-1 text-[10px] text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded">
                                <Folder size={10} /> {task.folder.name}
                            </span>
                        )}
                    </div>
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
