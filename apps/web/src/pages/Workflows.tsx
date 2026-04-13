import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { workflowsApi } from '../api/workflows'
import { Play, Edit2, Trash2, Plus, Search, FolderPlus, Folder, AlertTriangle, Network, X, MoreVertical, ArrowUp, ArrowDown } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useBreadcrumbs } from '../context/BreadcrumbContext'

export function Workflows() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams()
    const currentFolderId = searchParams.get('folderId')
    const [searchQuery, setSearchQuery] = useState('')
    const { showToast } = useToast();
    const { setExtraSegments } = useBreadcrumbs()
    
    const queryClient = useQueryClient()

    const { data: workflows, isLoading } = useQuery({
        queryKey: ['workflows', currentFolderId],
        queryFn: () => workflowsApi.getWorkflows(currentFolderId || undefined),
    })

    const { data: folderTree } = useQuery({
        queryKey: ['workflow-folders'],
        queryFn: workflowsApi.getFolderTree,
    })

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
            { label: 'Workflows', path: '/workflows' },
            ...breadcrumbs.map(crumb => ({
                label: crumb.name,
                path: `/workflows?folderId=${crumb.id}`
            }))
        ]
        setExtraSegments(segments)
        return () => setExtraSegments([])
    }, [breadcrumbs, setExtraSegments])

    const deleteMutation = useMutation({
        mutationFn: workflowsApi.deleteWorkflow,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] })
            showToast('Workflow deleted', 'success')
        }
    })

    const reorderMutation = useMutation({
        mutationFn: ({ id, order }: { id: string, order: number }) => workflowsApi.reorderWorkflow(id, order),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] })
        }
    })

    const updateFolderMutation = useMutation({
        mutationFn: ({ id, name }: { id: string, name: string }) => workflowsApi.updateFolder(id, { name }),
        onSuccess: () => {
            showToast('Folder renamed successfully', 'success')
            setIsRenamingFolder(false)
            queryClient.invalidateQueries({ queryKey: ['workflow-folders'] })
        },
        onError: (err: any) => showToast(err.message || 'Failed to rename folder', 'error')
    })

    const deleteFolderMutation = useMutation({
        mutationFn: workflowsApi.deleteFolder,
        onSuccess: () => {
            showToast('Folder deleted successfully', 'success')
            setIsConfirmingFolderDelete(false)
            queryClient.invalidateQueries({ queryKey: ['workflow-folders'] })
            queryClient.invalidateQueries({ queryKey: ['workflows'] })
            navigate('/workflows')
        },
        onError: (err: any) => {
            setIsConfirmingFolderDelete(false)
            showToast(err.message || 'Failed to delete folder', 'error')
        }
    })

    const createFolderMutation = useMutation({
        mutationFn: (data: { name: string, parentId?: string }) => workflowsApi.createFolder(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflow-folders'] })
            setIsCreatingFolder(false)
            setNewFolderName('')
            showToast('Folder created successfully', 'success')
        },
        onError: (err: any) => showToast(err.message || 'Failed to create folder', 'error')
    })

    const handleCreateFolder = () => {
        if (newFolderName) {
            createFolderMutation.mutate({ 
                name: newFolderName, 
                parentId: currentFolderId || undefined 
            })
        }
    }

    const filteredWorkflows = useMemo(() => {
        if (!workflows) return []
        const query = searchQuery.toLowerCase()
        if (!query) return workflows
        return workflows.filter((w: any) => w.name.toLowerCase().includes(query) || (w.description || '').toLowerCase().includes(query))
    }, [workflows, searchQuery])

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [localWorkflows, setLocalWorkflows] = useState<any[]>([]);

    React.useEffect(() => {
        setLocalWorkflows(filteredWorkflows);
    }, [filteredWorkflows]);

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const next = [...localWorkflows];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= next.length) return;

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
        // Add workflow data for external drop targets (like the sidebar)
        e.dataTransfer.setData('application/restmon-workflow', localWorkflows[index].id);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        const next = [...localWorkflows];
        const item = next[draggedIndex];
        next.splice(draggedIndex, 1);
        next.splice(index, 0, item);
        setLocalWorkflows(next);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        if (draggedIndex === null) return;
        const index = draggedIndex;
        const prev = localWorkflows[index - 1];
        const next = localWorkflows[index + 1];
        let newOrder: number;
        if (!prev && !next) newOrder = 0;
        else if (!prev) newOrder = next.order - 1;
        else if (!next) newOrder = prev.order + 1;
        else newOrder = (prev.order + next.order) / 2;
        reorderMutation.mutate({ id: localWorkflows[index].id, order: newOrder });
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
                            <Network size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                                    {currentFolder ? currentFolder.name : 'Workflows'}
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
                                {currentFolder?.description || (currentFolderId ? 'Showing workflows in this folder.' : 'Build and manage your end-to-end automation logic.')}
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
                    <Link
                        to="/designer"
                        className="bg-[#1976D2] hover:bg-[#1565C0] text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
                    >
                        <Plus size={20} /> New Workflow
                    </Link>
                </div>
            </div>
        </div>

            {/* Search */}
            <div className="mb-8">
                <div className="relative group flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1976D2] transition-colors" size={20} />
                    <input 
                        type="text"
                        placeholder="Search workflows..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-4 focus:ring-blue-100 focus:border-[#1976D2] outline-none transition-all text-gray-700 font-medium"
                    />
                </div>
            </div>

            {/* Workflow List */}
            <div className="space-y-3">
                {localWorkflows.map((wf, index) => (
                    <WorkflowCard 
                        key={wf.id} 
                        workflow={wf} 
                        index={index}
                        isDragged={draggedIndex === index}
                        onDragStart={(e: any) => handleDragStart(e, index)}
                        onDragOver={(e: any) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onMove={(dir: 'up' | 'down') => handleMove(index, dir)}
                        onDelete={() => window.confirm(`Permanently delete workflow "${wf.name}"?`) && deleteMutation.mutate(wf.id)}
                    />
                ))}

                {localWorkflows.length === 0 && (
                    <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="text-gray-300 mb-4 text-4xl opacity-20">🚀</div>
                        <p className="text-gray-400 font-medium text-lg">No workflows found in this view.</p>
                        <p className="text-gray-400 text-sm">Create your first automation to get started!</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {isRenamingFolder && (
                <FolderModal 
                    title="Rename Folder" 
                    value={renameFolderName} 
                    onChange={setRenameFolderName} 
                    onClose={() => setIsRenamingFolder(false)} 
                    onSubmit={() => currentFolderId && updateFolderMutation.mutate({ id: currentFolderId, name: renameFolderName })} 
                />
            )}
            {isCreatingFolder && (
                <FolderModal 
                    title="Create New Folder" 
                    value={newFolderName} 
                    onChange={setNewFolderName} 
                    onClose={() => setIsCreatingFolder(false)} 
                    onSubmit={handleCreateFolder} 
                />
            )}
            {isConfirmingFolderDelete && (
                <DeleteConfirmationModal 
                    name={currentFolder?.name} 
                    onCancel={() => setIsConfirmingFolderDelete(false)} 
                    onConfirm={() => deleteFolderMutation.mutate(currentFolder?.id)} 
                />
            )}
        </div>
    )
}

function WorkflowCard({ workflow, index, isDragged, onDragStart, onDragOver, onDragEnd, onMove, onDelete }: any) {
    const navigate = useNavigate();
    return (
        <div 
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            className={`group bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between ${isDragged ? 'opacity-30' : ''}`}
        >
            <div className="flex items-center gap-6 flex-1 min-w-0">
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

                <div className="flex-1 min-w-0">
                    <Link to={`/workflows/history/${workflow.executions?.[0]?.id || ''}`} className="block group/title">
                        <h4 className="font-bold text-xl text-gray-800 mb-1 group-hover/title:text-[#1976D2] transition-colors truncate">{workflow.name}</h4>
                    </Link>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-medium text-gray-400">
                            {workflow.nodes?.length || 0} nodes • v{workflow.version}
                        </span>
                        <div className="h-3 w-px bg-gray-200" />
                        <ExecutionHistoryCubes workflow={workflow} />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 ml-6">
                <Link
                    to={`/designer?id=${workflow.id}`}
                    className="px-4 py-2 rounded-lg font-bold text-sm text-gray-600 bg-white border border-gray-200 hover:border-[#1976D2] hover:text-[#1976D2] transition-all shadow-sm"
                >
                    Edit
                </Link>
                <button
                    onClick={() => workflowsApi.executeWorkflow(workflow.id).then((res) => {
                        if (res?.id) navigate(`/workflows/history/${res.id}`);
                    })}
                    className="px-4 py-2 rounded-lg font-bold text-sm text-white bg-green-500 hover:bg-green-600 transition-all shadow-sm flex items-center gap-2"
                >
                    Run
                </button>
                <button 
                    onClick={onDelete} 
                    title="Delete"
                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    )
}

function FolderModal({ title, value, onChange, onClose, onSubmit }: any) {
    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-900">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20}/></button>
                </div>
                <form 
                    onSubmit={(e) => { e.preventDefault(); onSubmit(); }} 
                    className="p-6 space-y-4"
                >
                   <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Folder Name</label>
                        <input 
                            autoFocus
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            required 
                            placeholder="e.g. Sales Pipeline" 
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100/50 text-sm" 
                        />
                   </div>
                   <div className="pt-4 flex justify-end gap-3 border-t border-gray-50 mt-2">
                       <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium text-sm transition-colors">Cancel</button>
                       <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm shadow-sm hover:shadow transition-all">Confirm</button>
                   </div>
                </form>
            </div>
        </div>
    )
}

function DeleteConfirmationModal({ name, onCancel, onConfirm }: any) {
    return (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-[450px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                <div className="p-6 pb-4 border-b border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shrink-0 border border-red-100">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Delete Folder?</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                            Are you sure you want to delete <span className="font-bold text-slate-700">"{name}"</span> and all workflows inside? This action cannot be undone.
                        </p>
                    </div>
                </div>
                <div className="p-4 flex flex-col gap-2 bg-slate-50/50">
                    <button onClick={onConfirm} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2">
                        <Trash2 size={16} /> Confirm Deletion
                    </button>
                    <button onClick={onCancel} className="w-full py-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl font-bold text-sm transition-all">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}

function ExecutionHistoryCubes({ workflow }: { workflow: any }) {
    const executions = workflow.executions || [];
    const slots = Array(10).fill(null).map((_, i) => executions[9 - i] || null);
    return (
        <div className="flex items-center gap-1">
            {slots.map((exe, i) => (
                <Cube key={i} execution={exe} />
            ))}
            <span className="ml-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest">History</span>
        </div>
    )
}

function Cube({ execution }: { execution: any }) {
    if (!execution) return <div className="w-3 h-3 rounded-sm bg-gray-100" title="No execution" />;
    const color = {
        SUCCESS: 'bg-[#10b981] hover:bg-[#059669]',
        FAILED: 'bg-[#ef4444] hover:bg-[#dc2626]',
        MAJOR: 'bg-[#f97316] hover:bg-[#ea580c]',
        MINOR: 'bg-[#fbbf24] hover:bg-[#f59e0b]',
        WARNING: 'bg-[#fbbf24] hover:bg-[#f59e0b]',
        INFORMATION: 'bg-[#3b82f6] hover:bg-[#2563eb]',
        RUNNING: 'bg-[#3b82f6] hover:bg-[#2563eb] animate-pulse',
        PENDING: 'bg-[#eab308] hover:bg-[#ca8a04]',
        TIMEOUT: 'bg-[#f97316] hover:bg-[#ea580c]',
    }[execution.status?.toUpperCase() as string] || 'bg-gray-400';
    return (
        <Link 
            to={`/workflows/history/${execution.id}`}
            className={`w-3 h-3 rounded-sm ${color} transition-all transform hover:scale-125 hover:z-10 cursor-pointer shadow-sm`}
            title={`Status: ${execution.status}\nStarted: ${new Date(execution.startedAt).toLocaleString()}`}
        />
    );
}
