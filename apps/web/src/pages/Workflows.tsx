import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { workflowsApi } from '../api/workflows'
import { Play, Edit2, Trash2, Plus, Search, FolderPlus, Folder, AlertTriangle, Network, X, MoreVertical, ArrowUp, ArrowDown, RefreshCcw, ChevronDown, ChevronUp, Calendar, Clock, Globe, Zap, Settings, History, MessageSquare, List } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useBreadcrumbs } from '../context/BreadcrumbContext'
import { WorkflowDeleteModal } from '../components/WorkflowDeleteModal'

export function Workflows() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams()
    const currentFolderId = searchParams.get('folderId')
    const [searchQuery, setSearchQuery] = useState('')
    const { showToast } = useToast();
    const { setExtraSegments } = useBreadcrumbs()
    const [refreshInterval, setRefreshInterval] = useState<number>(30000);
    
    const queryClient = useQueryClient()

    const { data: workflows, isLoading, isFetching: isFetchingWorkflows } = useQuery({
        queryKey: ['workflows', currentFolderId],
        queryFn: () => workflowsApi.getWorkflows(currentFolderId || undefined),
        refetchInterval: refreshInterval
    })

    const { data: folderTree } = useQuery({
        queryKey: ['workflow-folders'],
        queryFn: workflowsApi.getFolderTree,
    })

    const { data: stats, isFetching: isFetchingStats } = useQuery<any>({
        queryKey: ['system-stats', currentFolderId],
        queryFn: () => workflowsApi.getSystemStats(currentFolderId || undefined),
        refetchInterval: refreshInterval
    })

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['workflows'] });
        queryClient.invalidateQueries({ queryKey: ['workflow-folders'] });
        queryClient.invalidateQueries({ queryKey: ['system-stats'] });
    };

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
    const [workflowToDelete, setWorkflowToDelete] = useState<any>(null)
    const [newFolderName, setNewFolderName] = useState('')
    const [renameFolderName, setRenameFolderName] = useState('')
    const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(null)

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

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<any> }) => workflowsApi.updateWorkflow(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] })
        },
        onError: (err: any) => showToast(err.message || 'Failed to update workflow', 'error')
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
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm mr-2">
                            <select
                                value={refreshInterval}
                                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                                className="bg-transparent text-gray-600 text-[10px] font-bold outline-none cursor-pointer px-2"
                            >
                                <option value={0}>Refresh: Off</option>
                                <option value={10000}>10s</option>
                                <option value={30000}>30s</option>
                                <option value={60000}>1m</option>
                            </select>
                            <button
                                onClick={handleRefresh}
                                className="p-2 text-gray-400 hover:text-[#1976D2] transition-colors"
                                title="Refresh"
                            >
                                <RefreshCcw size={14} className={(isFetchingWorkflows || isFetchingStats) ? 'animate-spin' : ''} />
                            </button>
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

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-2">Total Workflows</h3>
                        <p className="text-4xl font-black text-[#1976D2] tracking-tighter">{stats?.totalWorkflows || 0}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-2">Active Tasks</h3>
                        <p className="text-4xl font-black text-green-600 tracking-tighter">{stats?.totalTasks || 0}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-2">Failures (24h)</h3>
                        <p className="text-4xl font-black text-red-500 tracking-tighter">{stats?.failures24h || 0}</p>
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
                        isExpanded={expandedWorkflowId === wf.id}
                        onToggleExpand={() => setExpandedWorkflowId(expandedWorkflowId === wf.id ? null : wf.id)}
                        onDragStart={(e: any) => handleDragStart(e, index)}
                        onDragOver={(e: any) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onMove={(dir: 'up' | 'down') => handleMove(index, dir)}
                        onDelete={() => setWorkflowToDelete(wf)}
                        onToggleEnabled={() => updateMutation.mutate({ id: wf.id, data: { enabled: !wf.enabled } })}
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
            {workflowToDelete && (
                <WorkflowDeleteModal 
                    isOpen={!!workflowToDelete}
                    name={workflowToDelete.name}
                    onCancel={() => setWorkflowToDelete(null)}
                    onConfirm={() => {
                        deleteMutation.mutate(workflowToDelete.id);
                        setWorkflowToDelete(null);
                    }}
                />
            )}
        </div>
    )
}

function WorkflowCard({ workflow, index, isDragged, isExpanded, onToggleExpand, onDragStart, onDragOver, onDragEnd, onMove, onDelete, onToggleEnabled }: any) {
    const navigate = useNavigate();
    return (
        <div 
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            className={`group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden ${isDragged ? 'opacity-30' : ''}`}
        >
            <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-6 flex-1 min-w-0">
                    <div className="flex items-center gap-1 shrink-0">
                        <div className="cursor-move text-gray-200 group-hover:text-gray-400 p-1">
                            <MoreVertical size={16} />
                        </div>
                        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); onMove('up'); }} className="p-0.5 text-gray-400 hover:text-blue-600 rounded">
                                <ArrowUp size={10} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onMove('down'); }} className="p-0.5 text-gray-400 hover:text-blue-600 rounded">
                                <ArrowDown size={10} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <Link 
                                to={`/workflows/history/${workflow.executions?.[0]?.id || ''}`} 
                                className="block group/title"
                                draggable="false"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h4 className={`font-bold text-xl transition-colors truncate ${workflow.enabled ? 'text-gray-800 group-hover/title:text-[#1976D2]' : 'text-gray-400'}`}>
                                    {workflow.name}
                                </h4>
                            </Link>
                            {!workflow.enabled && (
                                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-wider">
                                    Disabled
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-medium text-gray-400 pointer-events-none">
                                {workflow.nodes?.length || 0} nodes • v{workflow.version}
                            </span>
                            <div className="h-3 w-px bg-gray-200 pointer-events-none" />
                            <ExecutionHistoryCubes workflow={workflow} />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 ml-6">
                    {/* Enable/Disable Toggle */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleEnabled();
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${workflow.enabled ? 'bg-green-500' : 'bg-gray-200'}`}
                        title={workflow.enabled ? 'Disable workflow' : 'Enable workflow'}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${workflow.enabled ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                    </button>

                    <Link
                        to={`/designer?id=${workflow.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-2 rounded-lg font-bold text-sm text-gray-600 bg-white border border-gray-200 hover:border-[#1976D2] hover:text-[#1976D2] transition-all shadow-sm flex items-center gap-2"
                    >
                        <Edit2 size={14} /> Edit
                    </Link>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            workflowsApi.executeWorkflow(workflow.id).then((res) => {
                                if (res?.id) navigate(`/workflows/history/${res.id}`);
                            });
                        }}
                        className="px-4 py-2 rounded-lg font-bold text-sm text-white bg-green-500 hover:bg-green-600 transition-all shadow-lg shadow-green-100 flex items-center gap-2"
                    >
                        <Play size={14} fill="currentColor" /> Run
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                        title="Delete"
                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleExpand(); }} 
                        className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>
            </div>

            {/* Accordion Content */}
            {isExpanded && (
                <div className="border-t border-gray-50 bg-gray-50/30 p-8 space-y-8 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Stats Group 1: Timing */}
                        <div className="space-y-4 lg:col-span-4">
                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} /> Timeline & Activity
                            </h5>
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Last Modified</span>
                                    <span className="font-bold text-gray-700">{new Date(workflow.updatedAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Last Execution</span>
                                    <span className="font-bold text-gray-700">
                                        {workflow.executions?.[0] ? new Date(workflow.executions[0].startedAt).toLocaleString() : 'Never'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-3 border-t border-gray-50">
                                    <span className="text-gray-500">Next Scheduled</span>
                                    <span className="font-bold text-blue-600">
                                        {workflow.bindings?.some((b: any) => b.nextFireAt) 
                                            ? new Date(Math.min(...workflow.bindings.filter((b: any) => b.nextFireAt).map((b: any) => new Date(b.nextFireAt).getTime()))).toLocaleString()
                                            : 'N/A'
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Group 2: Configuration */}
                        <div className="space-y-4 lg:col-span-3">
                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Settings size={12} /> Configuration
                            </h5>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="text-[10px] text-gray-400 font-bold mb-1">Schedules</div>
                                    <div className="text-xl font-black text-gray-800">{workflow.bindings?.length || 0}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="text-[10px] text-gray-400 font-bold mb-1">Webhooks</div>
                                    <div className="text-xl font-black text-gray-800">{workflow.triggerTokens?.length || 0}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="text-[10px] text-gray-400 font-bold mb-1">Input Params</div>
                                    <div className="text-xl font-black text-gray-800">{Object.keys(workflow.inputVariables || {}).length}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="text-[10px] text-gray-400 font-bold mb-1">Output Params</div>
                                    <div className="text-xl font-black text-gray-800">{Object.keys(workflow.outputVariables || {}).length}</div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Group 3: Performance Sparkline */}
                        <div className="space-y-4 lg:col-span-5">
                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between items-center">
                                <span className="flex items-center gap-2"><History size={12} /> Performance (Last 20 Runs)</span>
                            </h5>
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-[190px] flex flex-col justify-center">
                                <DurationSparkline executions={workflow.executions} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
                        {/* Event Triggers / Notifications */}
                        <div className="space-y-4">
                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare size={12} /> Event Notifications
                            </h5>
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                                {['ON_SUCCESS', 'ON_FAILURE', 'ON_COMPLETION'].map(status => {
                                    const count = (workflow.notifications || []).filter((n: any) => n.trigger === status).length;
                                    return (
                                        <div key={status} className="p-4 flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-600">{status.replace('ON_', '')}</span>
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black ${count > 0 ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-300'}`}>
                                                {count} configured
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Time Machine Accordion */}
                        <div className="space-y-4">
                             <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={12} /> Time Machine Prediction (Next 30)
                            </h5>
                            <ExecutionPrediction workflowId={workflow.id} isScheduled={workflow.bindings?.length > 0} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function DurationSparkline({ executions }: { executions: any[] }) {
    const navigate = useNavigate();
    const [hoveredExecution, setHoveredExecution] = useState<any>(null);
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

    const data = useMemo(() => {
        if (!executions || executions.length === 0) return [];
        return [...executions].reverse();
    }, [executions]);

    if (data.length < 2) return <div className="text-center text-xs text-gray-300 py-10 italic">Awaiting more execution data...</div>;

    const values = data.map(ex => ex.duration || 0);
    const maxVal = Math.max(...values, 1);
    const width = 500;
    const height = 120;
    const padding = 10;
    const chartWidth = width - 60; // Spacing for Y axis
    const chartHeight = height - 20;
    
    const points = values.map((val, i) => {
        const x = (i / (values.length - 1)) * (chartWidth - 2 * padding) + padding + 50;
        const y = chartHeight - (val / maxVal) * (chartHeight - 2 * padding) - padding;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="relative w-full h-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                {/* Y-Axis Scales */}
                <line x1="45" y1={padding} x2="45" y2={chartHeight - padding} stroke="#eee" strokeWidth="1" />
                <text x="40" y={padding + 5} textAnchor="end" className="text-[12px] font-black fill-gray-600">{maxVal.toLocaleString()}ms</text>
                <text x="40" y={chartHeight / 2 + 5} textAnchor="end" className="text-[12px] font-black fill-gray-600">{Math.round(maxVal / 2).toLocaleString()}ms</text>
                <text x="40" y={chartHeight - padding + 5} textAnchor="end" className="text-[12px] font-black fill-gray-600">0ms</text>

                <defs>
                    <linearGradient id="sparkGradientDetailed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path
                    d={`M ${points} V ${chartHeight} H ${padding + 50} Z`}
                    fill="url(#sparkGradientDetailed)"
                />
                <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                />
                {data.map((ex, i) => {
                    const x = (i / (data.length - 1)) * (chartWidth - 2 * padding) + padding + 50;
                    const y = chartHeight - ((ex.duration || 0) / maxVal) * (chartHeight - 2 * padding) - padding;
                    return (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="4"
                            className={`${
                                ex.status === 'SUCCESS' ? 'stroke-green-500 fill-white' : 
                                ex.status === 'FAILED' ? 'stroke-red-500 fill-red-500' : 
                                ex.status === 'RUNNING' ? 'stroke-blue-500 fill-white' : 
                                'stroke-gray-400 fill-white'
                            } stroke-[2.5] cursor-pointer transition-all duration-75`}
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/workflows/history/${ex.id}`);
                            }}
                            onMouseEnter={(e) => {
                                setHoveredExecution(ex);
                                setHoverPos({ x, y });
                            }}
                            onMouseLeave={() => setHoveredExecution(null)}
                        />
                    );
                })}
            </svg>
            
            {/* Rich Hover Tooltip */}
            {hoveredExecution && (
                <ExecutionTooltip 
                    execution={hoveredExecution} 
                    x={hoverPos.x} 
                    y={hoverPos.y} 
                    parentWidth={width} 
                    parentHeight={height} 
                />
            )}

            <div className="flex justify-between mt-1 text-[8px] font-bold text-gray-500 uppercase tracking-tighter pl-12">
                <span>{new Date(data[0].startedAt).toLocaleDateString()}</span>
                <span>Latest Run</span>
            </div>
        </div>
    );
}

function ExecutionPrediction({ workflowId, isScheduled }: { workflowId: string, isScheduled: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const { data: predictions, isLoading } = useQuery({
        queryKey: ['workflow-predictions', workflowId],
        queryFn: () => fetch(`/api/workflows/${workflowId}/predict-future?count=30`).then(r => r.json()),
        enabled: isOpen && isScheduled
    });

    if (!isScheduled) return (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-xs italic">No schedules configured for this workflow.</p>
        </div>
    );

    return (
        <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
            >
                <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
                    <List size={14} className="text-blue-500" /> View Predicted Runs
                </span>
                {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {isOpen && (
                <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {isLoading ? (
                        <div className="p-4 text-center"><div className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>
                    ) : predictions?.length > 0 ? (
                        predictions.map((date: string, i: number) => (
                            <div key={i} className="px-3 py-2 flex items-center justify-between hover:bg-blue-50/50 rounded-lg transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                                        {i + 1}
                                    </div>
                                    <span className="text-xs text-gray-700 font-medium">{new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                </div>
                                <span className="text-xs font-black text-gray-400">{new Date(date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-xs text-gray-400 italic">No future runs predicted. Is the schedule active?</div>
                    )}
                </div>
            )}
        </div>
    );
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
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                width: '450px',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #eee'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        background: '#fef2f2', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid #fee2e2'
                    }}>
                        <AlertTriangle color="#ef4444" size={24} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>Delete Folder?</h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', lineHeight: '1.5' }}>
                            Are you sure you want to delete <span style={{ fontWeight: 'bold', color: '#374151' }}>"{name}"</span> and all workflows inside? This action cannot be undone.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                        onClick={onConfirm}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '14px',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                        }}
                    >
                        <Trash2 size={18} /> Confirm Deletion
                    </button>
                    
                    <button 
                        onClick={onCancel}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            background: 'white',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            padding: '14px',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                        }}
                    >
                        <X size={18} /> Cancel
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
    const [isHovered, setIsHovered] = useState(false);
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
        <div className="relative">
            <Link 
                to={`/workflows/history/${execution.id}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`w-3 h-3 rounded-sm ${color} transition-all block cursor-pointer shadow-sm`}
            />
            {isHovered && (
                <div className="fixed z-[9999] pointer-events-none" style={{ 
                    transform: 'translate(-50%, -100%) translateY(-25px)',
                    animation: 'none' // Prevent blinking
                }}>
                     <ExecutionTooltip 
                        execution={execution} 
                        x={0} 
                        y={0} 
                        parentWidth={1} 
                        parentHeight={1} 
                        isFixed
                        forceUp={true}
                    />
                </div>
            )}
        </div>
    );
}

function ExecutionTooltip({ execution, x, y, parentWidth, parentHeight, isFixed, forceUp }: { execution: any, x: number, y: number, parentWidth: number, parentHeight: number, isFixed?: boolean, forceUp?: boolean }) {
    const isRightSide = !isFixed && (x / parentWidth) > 0.65;
    const isTopSide = !isFixed && (y / parentHeight) < 0.3;
    
    return (
        <div 
            className={`${isFixed ? 'relative' : 'absolute'} z-[9999] bg-white border border-gray-200 rounded-xl shadow-2xl p-4 w-60 pointer-events-none animate-in fade-in zoom-in-95 duration-100 shadow-blue-900/10`}
            style={isFixed ? {} : { 
                left: `${(x / parentWidth) * 100}%`, 
                top: `${(y / parentHeight) * 100}%`,
                transform: isRightSide 
                    ? (isTopSide ? `translate(-95%, 15%)` : `translate(-95%, -115%)`)
                    : (isTopSide ? `translate(-50%, 15%)` : `translate(-50%, -115%)`)
            }}
        >
            <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Execution Detail</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${execution.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {execution.status}
                </span>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-xs items-center">
                    <span className="text-gray-500 font-bold">Duration</span>
                    <span className="font-black text-blue-600 text-[13px]">{(execution.duration || 0).toLocaleString()}ms</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                    <span className="text-gray-500 text-[10px] font-bold">Timestamp</span>
                    <span className="font-medium text-gray-700 text-[10px]">{new Date(execution.startedAt).toLocaleString()}</span>
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-4 gap-1">
                    {[
                        { key: 'SUCCESS', color: 'bg-green-50 text-green-600', label: 'OK' },
                        { key: 'FAILED', color: 'bg-red-50 text-red-600', label: 'FAIL' },
                        { key: 'RUNNING', color: 'bg-blue-50 text-blue-600', label: 'RUN' },
                        { key: 'PENDING', color: 'bg-amber-50 text-amber-600', label: 'WAIT' }
                    ].map(stat => {
                        const count = (execution.taskExecutionRecords || []).filter((r: any) => r.status === stat.key).length;
                        return (
                            <div key={stat.key} className={`flex flex-col items-center py-1 rounded-lg ${stat.color} ${count === 0 ? 'opacity-30' : ''}`}>
                                <span className="text-[12px] font-black">{count}</span>
                                <span className="text-[7px] font-black uppercase tracking-tighter">{stat.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Tooltip arrow */}
            {!isFixed && !isTopSide && (
                <div className={`absolute -bottom-2 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white ${ isRightSide ? 'right-4' : 'left-1/2 -translate-x-1/2'}`} />
            )}
            {!isFixed && isTopSide && (
                <div className={`absolute -top-2 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-white ${ isRightSide ? 'right-4' : 'left-1/2 -translate-x-1/2'}`} />
            )}
        </div>
    );
}
