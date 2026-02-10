import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { workflowsApi } from '../api/workflows'
import { useState } from 'react'
import { ExecutionVisualizer } from '../components/ExecutionVisualizer'
import { TaskEditShelf } from '../components/TaskEditShelf'
import VariableInspectorDrawer from '../components/VariableInspectorDrawer'
import { 
    CheckCircle, 
    AlertCircle, 
    AlertTriangle, 
    X, 
    Clock, 
    Play, 
    Square, 
    RefreshCcw,
    Zap,
    Activity,
    Server,
    ArrowLeft,
    Save, 
    ChevronDown, 
    ChevronRight
} from 'lucide-react'

function WorkflowExecutionDetail() {
    const { id } = useParams()
    const [selectedTask, setSelectedTask] = useState<any>(null)
    const [showInspector, setShowInspector] = useState(false)
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
    const [editingNodeData, setEditingNodeData] = useState<any>(null)
    const [inspectorVarOpen, setInspectorVarOpen] = useState(false);
    const [inspectedVarName, setInspectedVarName] = useState<string | null>(null);
    const [inspectedVarPayload, setInspectedVarPayload] = useState<{ value: any; transformer?: any; input?: any } | null>(null);
    const [expandedSections, setExpandedSections] = useState<string[]>(['definition', 'results']);


    const queryClient = useQueryClient();

    const { data: execution, isLoading, isFetching: isFetchingExecution, refetch: refetchExecution } = useQuery({
        queryKey: ['workflow-execution', id],
        queryFn: () => workflowsApi.getExecutionDetail(id!),
        refetchInterval: (query) => (['RUNNING', 'PENDING'].includes(query.state.data?.status) ? 3000 : false)
    })

    const terminateMutation = useMutation({
        mutationFn: () => workflowsApi.terminateExecution(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflow-execution', id] });
        }
    });

    const navigate = useNavigate();

    const { data: history } = useQuery({
        queryKey: ['workflow-history', execution?.workflowId],
        queryFn: () => workflowsApi.getWorkflowExecutions(execution!.workflowId),
        enabled: !!execution?.workflowId,
        refetchInterval: 30000
    });

    const { data: workflow } = useQuery({
        queryKey: ['workflow', execution?.workflowId],
        queryFn: () => workflowsApi.getWorkflow(execution!.workflowId),
        enabled: !!execution?.workflowId
    });

    const runMutation = useMutation({
        mutationFn: () => workflowsApi.executeWorkflow(execution.workflowId),
        onSuccess: (newExec) => {
            if (newExec?.id) {
                navigate(`/workflows/history/${newExec.id}`);
            }
        }
    });

    const updateWorkflowMutation = useMutation({
        mutationFn: (data: any) => workflowsApi.updateWorkflow(execution.workflowId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflow-execution'] });
            queryClient.invalidateQueries({ queryKey: ['workflow', execution.workflowId] });
            refetchExecution();
        }
    });

    const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

    const handleNavigate = (newId: string) => {
        setNavigationHistory(prev => [...prev, id!]);
        navigate(`/workflows/history/${newId}`);
    };

    const handleBack = () => {
        const prev = [...navigationHistory];
        const lastId = prev.pop();
        setNavigationHistory(prev);
        if (lastId) {
            navigate(`/workflows/history/${lastId}`);
        } else {
            navigate('/history');
        }
    };    if (isLoading) return <div className="p-8 text-center text-xl text-gray-500 animate-pulse">Loading execution details...</div>
    if (!execution) return <div className="p-8 text-center text-xl text-red-500">Execution not found</div>

    return (
        <>
            <div className="h-full flex flex-col">
                {/* Header Header */}
                <div className="bg-gray-900 border-b border-gray-800 p-4 px-8 flex justify-between items-center bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 shadow-xl z-20">
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={handleBack}
                            className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg text-gray-400 transition-all border border-gray-700 hover:scale-105"
                        >
                            ←
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-gray-100">{execution.workflowName}</h2>
                                <StatusBadge status={execution.status} size="sm" />
                            </div>
                            <p className="text-gray-500 font-mono text-[9px] uppercase tracking-widest mt-0.5">Execution {execution.id}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="text-[10px] font-mono text-gray-500 uppercase">Triggered By</div>
                            <div className="text-xs font-bold text-primary-400">{execution.triggeredBy}</div>
                        </div>
                        <div className="h-8 w-px bg-gray-800" />
                        <div className="text-right">
                            <div className="text-[10px] font-mono text-gray-500 uppercase">Started At</div>
                            <div className="text-xs font-bold text-gray-300">{new Date(execution.startedAt).toLocaleString()}</div>
                        </div>
                        <div className="h-8 w-px bg-gray-800" />
                        
                        <ExecutionHistoryGraph 
                            executions={history || []} 
                            currentId={id!} 
                            onNavigate={handleNavigate}
                        />

                        <div className="h-8 w-px bg-gray-800" />
                        <div className="flex items-center gap-3">
                            {['RUNNING', 'PENDING'].includes(execution.status) ? (
                                <button 
                                    onClick={() => terminateMutation.mutate()}
                                    disabled={terminateMutation.isPending}
                                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
                                >
                                    <Square size={14} fill="currentColor" /> Terminate
                                </button>
                            ) : (
                                <button 
                                    onClick={() => runMutation.mutate()}
                                    disabled={runMutation.isPending}
                                    className="px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 border border-primary-500/20 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
                                >
                                    <Play size={14} fill="currentColor" /> Run Again
                                </button>
                            )}
                            <button 
                                onClick={() => {
                                    refetchExecution();
                                    if (execution?.workflowId) {
                                        queryClient.invalidateQueries({ queryKey: ['workflow-history', execution.workflowId] });
                                    }
                                }}
                                className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 rounded-lg transition-all"
                                title="Refresh data"
                            >
                                <RefreshCcw size={16} className={(isFetchingExecution) ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content: Full Screen Visualizer */}
                <div className="flex-1 relative bg-[#0b0c10] overflow-hidden">
                    <ExecutionVisualizer 
                        workflow={execution.workflow} 
                        taskExecutions={execution.taskExecutionRecords || []} 
                        editingTaskId={editingTaskId}
                        onNodeClick={(nodeId) => {
                            const record = execution.taskExecutionRecords.find((r: any) => r.nodeId === nodeId);
                            if (record) {
                                // Priority: check input.taskType, then task.taskType, then taskId, then label/name patterns
                                const isUtil = record.input?.taskType === 'VARIABLE' || 
                                              record.task?.taskType === 'VARIABLE' || 
                                              record.task?.id === '00000000-0000-0000-0000-000000000001' ||
                                              record.task?.name?.toLowerCase().includes('variable');
                                              
                                setSelectedTask({
                                    ...record,
                                    taskType: isUtil ? 'VARIABLE' : (record.task?.taskType || 'HTTP')
                                });
                                setShowInspector(true);
                            }
                        }}
                        onInspect={(nodeId) => {
                            const record = execution.taskExecutionRecords.find((r: any) => r.nodeId === nodeId);
                            if (record) {
                                const isUtil = record.input?.taskType === 'VARIABLE' || 
                                              record.task?.taskType === 'VARIABLE' || 
                                              record.task?.id === '00000000-0000-0000-0000-000000000001' ||
                                              record.task?.name?.toLowerCase().includes('variable');

                                setSelectedTask({
                                    ...record,
                                    taskType: isUtil ? 'VARIABLE' : (record.task?.taskType || 'HTTP')
                                });
                                setShowInspector(true);
                            }
                        }}
                        onEditTask={(nodeId) => {
                            const record = execution.taskExecutionRecords.find((r: any) => r.nodeId === nodeId);
                            if (record) {
                                const isUtil = record.input?.taskType === 'VARIABLE' || 
                                              record.task?.taskType === 'VARIABLE' || 
                                              record.task?.id === '00000000-0000-0000-0000-000000000001' ||
                                              record.task?.name?.toLowerCase().includes('variable');

                                if (isUtil) {
                                    const nodeDef = (workflow?.nodes as any[])?.find((n: any) => n.id === nodeId);
                                    setEditingNodeData({
                                        id: nodeId,
                                        label: nodeDef?.label || record.label || record.task?.name,
                                        variableExtraction: nodeDef?.variableExtraction || record.input?.variableExtraction || record.task?.variableExtraction || { vars: {} }
                                    });
                                } else if (record.task) {
                                    const nodeDef = (workflow?.nodes as any[])?.find((n: any) => n.id === nodeId);
                                    setEditingTaskId(record.task.id);
                                    setEditingNodeData({
                                        id: nodeId,
                                        label: nodeDef?.label || record.label || record.task?.name,
                                        ...nodeDef
                                    });
                                }
                            }
                        }}
                    />
                </div>
            </div>

            {/* Task Edit Shelf (Right Modal Drawer) */}
            {(editingTaskId || editingNodeData) && (
                <TaskEditShelf 
                    taskId={editingTaskId} 
                    nodeData={editingNodeData}
                    availableUpstreamVars={(() => {
                        const nodeId = editingNodeData?.id || execution?.taskExecutionRecords?.find((r: any) => r.task?.id === editingTaskId)?.nodeId;
                        if (!nodeId || !workflow) return [];
                        
                        // Discover all upstream nodes
                        const upstreamIds: string[] = [];
                        const queue = [nodeId];
                        const visited = new Set();
                        while (queue.length > 0) {
                            const curr = queue.shift();
                            if (!curr || visited.has(curr)) continue;
                            visited.add(curr);
                            (workflow.edges || []).filter((e: any) => e.target === curr).forEach((e: any) => {
                                if (e.source) {
                                    upstreamIds.push(e.source);
                                    queue.push(e.source);
                                }
                            });
                        }
                        
                        // Extract variables with task source
                        return ((workflow.nodes as any[]) || [])
                            .filter((n: any) => upstreamIds.includes(n.id))
                            .flatMap((n: any) => {
                                // Try to find the record in execution history to get full task definition
                                // This ensures we get library variables too, not just overlays
                                const record = execution?.taskExecutionRecords?.find((r: any) => r.nodeId === n.id);
                                
                                let vars = {};
                                
                                if (record) {
                                    const libVars = record.task?.variableExtraction?.vars || {};
                                    // Use input from record (what was actually executed) or node def
                                    const overlayVars = record.input?.variableExtraction?.vars || n.variableExtraction?.vars || {};
                                    vars = { ...libVars, ...overlayVars };
                                } else {
                                    // Fallback to just node overlay if no execution record found
                                    vars = n.variableExtraction?.vars || {};
                                }

                                return Object.keys(vars)
                                    .filter(k => !k.startsWith('__'))
                                    .map(name => ({ 
                                        name, 
                                        taskName: n.label || record?.task?.name || 'Task',
                                        value: record?.result?.variables?.[name] ?? null
                                    }));
                            });
                    })()}
                    onClose={() => { setEditingTaskId(null); setEditingNodeData(null); }} 
                    onSaveNode={(data) => {
                        if (!workflow) return;
                        const targetId = editingNodeData?.id || editingTaskId;
                        const updatedNodes = (workflow.nodes as any[] || []).map((n: any) => 
                            n.id === targetId ? { ...n, ...data } : n
                        );
                        updateWorkflowMutation.mutate({ nodes: updatedNodes });
                        setEditingNodeData(null);
                        setEditingTaskId(null);
                    }}
                />
            )}

            {/* Task Execution Inspector (Right Modal Drawer) */}
            {showInspector && selectedTask && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[9998] transition-opacity duration-300"
                        onClick={() => setShowInspector(false)}
                    />
                    
                    {/* Drawer */}
                    <div className="fixed inset-y-0 right-0 w-[520px] bg-white shadow-[-8px_0_24px_rgba(0,0,0,0.15)] z-[9999] flex flex-col h-screen animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-medium text-gray-800">
                                    {selectedTask.taskType === 'VARIABLE' ? 'Logic Manipulation' : (selectedTask.task?.name || 'Task Detail')}
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${selectedTask.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {selectedTask.status}
                                    </span>
                                    {selectedTask.taskType !== 'VARIABLE' ? (
                                        selectedTask.result?.status && (
                                            <span className="text-[10px] font-mono text-gray-400">HTTP {selectedTask.result.status}</span>
                                        )
                                    ) : (
                                        <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">⚡ LOCAL LOGIC</span>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setShowInspector(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Drawer Actions */}
                        <div className="px-8 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
                             <div className="flex items-center gap-4">
                                <div className="text-[11px] font-bold text-gray-400">
                                    <Clock size={12} className="inline mr-1" />
                                    {selectedTask.duration ? `${selectedTask.duration}ms` : '---'}
                                </div>
                             </div>
                             {(selectedTask.taskType !== 'VARIABLE') ? (
                                 <button 
                                    onClick={() => {
                                        const nodeDef = (workflow?.nodes as any[])?.find((n: any) => n.id === selectedTask.nodeId);
                                        setEditingTaskId(selectedTask.task.id);
                                        setEditingNodeData({
                                            id: selectedTask.nodeId,
                                            label: nodeDef?.label || selectedTask.label || selectedTask.task?.name,
                                            ...nodeDef
                                        });
                                        setShowInspector(false);
                                    }}
                                    className="text-[11px] font-bold text-primary-600 hover:underline flex items-center gap-1"
                                 >
                                    EDIT TASK →
                                 </button>
                             ) : (
                                <button 
                                    onClick={() => {
                                        const nodeDef = (workflow?.nodes as any[])?.find((n: any) => n.id === selectedTask.nodeId);
                                        setEditingNodeData({
                                            id: selectedTask.nodeId,
                                            label: nodeDef?.label || selectedTask.label || selectedTask.task?.name,
                                            variableExtraction: nodeDef?.variableExtraction || selectedTask.input?.variableExtraction || selectedTask.task?.variableExtraction || { vars: {} }
                                        });
                                        setShowInspector(false);
                                    }}
                                    className="text-[11px] font-bold text-primary-600 hover:underline flex items-center gap-1"
                                 >
                                    EDIT VARIABLES →
                                 </button>
                             )}
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 custom-scrollbar bg-white">
                            
                            {/* Request Details (Only for non-utility) */}
                            {selectedTask.taskType !== 'VARIABLE' && (
                                <section>
                                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Request Input</h4>
                                    <div className="space-y-4">
                                        <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs text-gray-600 break-all border border-gray-100">
                                            <span className="font-bold text-primary-600 mr-2">{selectedTask.input?.method || selectedTask.task?.command?.method}</span>
                                            {selectedTask.input?.url || selectedTask.task?.command?.url}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-tighter">Payload Sent</p>
                                            <pre className="bg-gray-900 text-blue-200 p-4 rounded-xl text-xs overflow-auto max-h-40 border border-gray-800 shadow-inner">
                                                {selectedTask.input?.data ? JSON.stringify(selectedTask.input.data, null, 2) : (selectedTask.task?.command?.body || 'No payload')}
                                            </pre>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Response Details (Only for non-utility) */}
                            {selectedTask.taskType !== 'VARIABLE' && (
                                <section>
                                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Execution Output</h4>
                                    {selectedTask.error && (
                                        <div className="mb-4 bg-red-50 border border-red-100 p-4 rounded-xl">
                                            <div className="flex items-center gap-2 text-red-600 font-bold text-[10px] uppercase mb-2">
                                                <AlertCircle size={14} /> System Error
                                            </div>
                                            <div className="text-xs text-red-800 font-mono whitespace-pre-wrap">{selectedTask.error}</div>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-tighter">Response Body</p>
                                            <pre className="bg-white border border-gray-200 p-4 rounded-xl text-xs text-gray-700 overflow-auto max-h-[400px] shadow-sm">
                                                {selectedTask.result ? (typeof selectedTask.result.data === 'string'
                                                    ? selectedTask.result.data
                                                    : JSON.stringify(selectedTask.result.data, null, 2)) : '---'}
                                            </pre>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Output Processing / Manipulation Results */}
                            <section>
                                 <div className="flex items-center gap-2 mb-4">
                                     {(() => {
                                         const isVariableTask = selectedTask.taskType === 'VARIABLE' || 
                                                              selectedTask.task?.id === '00000000-0000-0000-0000-000000000001' || 
                                                              selectedTask.task?.name?.toLowerCase().includes('variable');
                                         return isVariableTask ? (
                                             <Zap size={14} className="text-yellow-500" fill="currentColor" />
                                         ) : (
                                             <Activity size={14} className="text-gray-400" />
                                         );
                                     })()}
                                     <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                         {(() => {
                                             const isVariableTask = selectedTask.taskType === 'VARIABLE' || 
                                                                  selectedTask.task?.id === '00000000-0000-0000-0000-000000000001' || 
                                                                  selectedTask.task?.name?.toLowerCase().includes('variable');
                                             return isVariableTask ? 'MANIPULATION RESULT' : 'Output Processing';
                                         })()}
                                     </h4>
                                 </div>

                                 <div className="space-y-8">
                                     {/* Section 1: Definition (Saved Variables) */}
                                     <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                                         <button 
                                             onClick={() => setExpandedSections(p => p.includes('definition') ? p.filter(s => s !== 'definition') : [...p, 'definition'])}
                                             className="w-full flex items-center gap-2 p-3 bg-gray-50/80 hover:bg-gray-100 transition-colors text-left"
                                         >
                                             {expandedSections.includes('definition') ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                                             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Definition (Saved Variables)</span>
                                         </button>
                                         
                                         {expandedSections.includes('definition') && <div className="p-4 bg-white border-t border-gray-100">
                                         {(() => {
                                             const nodeDef = (workflow?.nodes as any[])?.find((n: any) => n.id === selectedTask.nodeId);
                                             const isVariableTask = selectedTask.taskType === 'VARIABLE' || 
                                                                  selectedTask.task?.id === '00000000-0000-0000-0000-000000000001' || 
                                                                  selectedTask.task?.name?.toLowerCase().includes('variable');
                                             
                                             const libraryVars = (!isVariableTask ? selectedTask.task?.variableExtraction?.vars : {}) || {};
                                             // Check both nodeDef and input for overlay variables
                                             const instanceVars = {
                                                 ...(selectedTask.input?.variableExtraction?.vars || {}),
                                                 ...(nodeDef?.variableExtraction?.vars || {})
                                             };
                                             
                                             const vars = { ...libraryVars, ...instanceVars };
                                             const displayVars = Object.keys(vars).filter(k=>!k.startsWith('__'));
                                             
                                             if (displayVars.length === 0) {
                                                 return <div className="text-[11px] text-gray-400 italic bg-gray-50/50 p-3 rounded-lg border border-dashed border-gray-200">No static variables defined.</div>;
                                             }

                                            return (
                                                <table className="w-full text-xs border-collapse">
                                                    <thead>
                                                        <tr className="text-left text-[10px] text-gray-400 uppercase font-black">
                                                            <th className="pb-2 w-1/3">Name</th>
                                                            <th className="pb-2 w-1/3">Source</th>
                                                            <th className="pb-2 w-1/3">Scope</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(() => {
                                                            // Separate library and overlay variable names
                                                            const libraryVarNames = Object.keys(libraryVars).filter(k => !k.startsWith('__'));
                                                            const overlayVarNames = Object.keys(instanceVars).filter(k => !k.startsWith('__'));
                                                            
                                                            // Order library variables
                                                            let orderedLibrary = libraryVarNames;
                                                            if (libraryVars.__order && Array.isArray(libraryVars.__order)) {
                                                                const libOrder = libraryVars.__order.filter((n: string) => libraryVarNames.includes(n));
                                                                const newLib = libraryVarNames.filter(n => !libraryVars.__order.includes(n));
                                                                orderedLibrary = [...libOrder, ...newLib];
                                                            }
                                                            
                                                            // Order overlay variables
                                                            let orderedOverlay = overlayVarNames;
                                                            if (instanceVars.__order && Array.isArray(instanceVars.__order)) {
                                                                const overlayOrder = instanceVars.__order.filter((n: string) => overlayVarNames.includes(n));
                                                                const newOverlay = overlayVarNames.filter(n => !instanceVars.__order.includes(n));
                                                                orderedOverlay = [...overlayOrder, ...newOverlay];
                                                            }
                                                            
                                                            // Final order: library first, then overlay
                                                            const order = [...orderedLibrary, ...orderedOverlay];
                                                            
                                                            return order.map((name: string) => {
                                                                const val = vars[name];
                                                                return (
                                                                    <tr key={name} className="border-t border-gray-100">
                                                                        <td className="py-2.5 align-top font-mono text-gray-700 font-bold">{name}</td>
                                                                        <td className="py-2.5 align-top font-mono text-gray-500">
                                                                            {typeof val === 'object' && val.valueMode === 'transformer' 
                                                                                ? <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold">TRANSFORMER: {val.transformer?.type}</span> 
                                                                                : <span className="truncate max-w-[150px] inline-block">{String(val)}</span>}
                                                                        </td>
                                                                        <td className="py-2.5 align-top">
                                                                            <span className="text-[9px] font-bold text-gray-400">{(vars.__scopes || {})[name] || 'LOCAL'}</span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            });
                                                        })()}
                                                    </tbody>
                                                </table>
                                            );
                                        })()}
                                        </div>}
                                    </div>

                                    {/* Section 2: Execution Result (Computed Variables) */}
                                    <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                                        <button 
                                            onClick={() => setExpandedSections(p => p.includes('results') ? p.filter(s => s !== 'results') : [...p, 'results'])}
                                            className="w-full flex items-center gap-2 p-3 bg-gray-50/80 hover:bg-gray-100 transition-colors text-left"
                                        >
                                            {expandedSections.includes('results') ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Results (Computed This Run)</span>
                                        </button>
                                        
                                        {expandedSections.includes('results') && <div className="p-4 bg-white border-t border-gray-100">
                                        {selectedTask.result?.variables && Object.keys(selectedTask.result.variables).length > 0 ? (
                                            <table className="w-full text-xs border-collapse">
                                                <thead>
                                                    <tr className="text-left text-[10px] text-gray-400 uppercase font-black">
                                                        <th className="pb-2 w-1/3">Name</th>
                                                        <th className="pb-2 w-1/2">Value</th>
                                                        <th className="pb-2 w-[10%]"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(() => {
                                                        const vars = selectedTask.result.variables || {};
                                                        
                                                        const nodeDef = (workflow?.nodes as any[])?.find((n: any) => n.id === selectedTask.nodeId);
                                                        const isVariableTask = selectedTask.taskType === 'VARIABLE' || 
                                                                             selectedTask.task?.id === '00000000-0000-0000-0000-000000000001';
                                                        
                                                        const libraryVars = (!isVariableTask ? selectedTask.task?.variableExtraction?.vars : {}) || {};
                                                        // Check both nodeDef and input for overlay variables
                                                        const instanceVars = {
                                                            ...(selectedTask.input?.variableExtraction?.vars || {}),
                                                            ...(nodeDef?.variableExtraction?.vars || {})
                                                        };
                                                        
                                                        // Get all variable names that have results
                                                        const allResultVars = Object.keys(vars).filter(k => !k.startsWith('__'));
                                                        
                                                        // Separate into library and overlay
                                                        const libraryVarNames = Object.keys(libraryVars).filter(k => !k.startsWith('__'));
                                                        const overlayVarNames = Object.keys(instanceVars).filter(k => !k.startsWith('__'));
                                                        
                                                        // Order library variables (use their __order if exists, else natural order)
                                                        let orderedLibrary = libraryVarNames.filter(n => allResultVars.includes(n));
                                                        if (libraryVars.__order && Array.isArray(libraryVars.__order)) {
                                                            const libOrder = libraryVars.__order.filter((n: string) => orderedLibrary.includes(n));
                                                            const newLib = orderedLibrary.filter(n => !libraryVars.__order.includes(n));
                                                            orderedLibrary = [...libOrder, ...newLib];
                                                        }
                                                        
                                                        // Order overlay variables (use their __order if exists, else natural order)
                                                        let orderedOverlay = overlayVarNames.filter(n => allResultVars.includes(n));
                                                        if (instanceVars.__order && Array.isArray(instanceVars.__order)) {
                                                            const overlayOrder = instanceVars.__order.filter((n: string) => orderedOverlay.includes(n));
                                                            const newOverlay = orderedOverlay.filter(n => !instanceVars.__order.includes(n));
                                                            orderedOverlay = [...overlayOrder, ...newOverlay];
                                                        }
                                                        
                                                        // Final order: library first, then overlay
                                                        const allNames = [...orderedLibrary, ...orderedOverlay];

                                                        return allNames.map((name: string) => {
                                                            const val = vars[name];
                                                            return (
                                                                <tr key={name} className="border-t border-gray-100 group hover:bg-gray-50/50 transition-colors">
                                                                    <td className="py-2.5 align-top font-mono font-bold text-gray-700">{name}</td>
                                                                    <td className="py-2.5 align-top font-mono text-blue-600 truncate max-w-[200px]" title={String(val)}>
                                                                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                                    </td>
                                                                    <td className="py-2.5 align-top text-right">
                                                                        <button onClick={() => {
                                                                            const nodeDef = (workflow?.nodes as any[])?.find((n: any) => n.id === selectedTask.nodeId);
                                                                            const isVariableTask = selectedTask.taskType === 'VARIABLE' || 
                                                                                                 selectedTask.task?.id === '00000000-0000-0000-0000-000000000001';
                                                                            
                                                                            const libraryVars = selectedTask.task?.variableExtraction?.vars || {};
                                                                            // Check both nodeDef and input for overlay variables
                                                                            const instanceVars = {
                                                                                ...(selectedTask.input?.variableExtraction?.vars || {}),
                                                                                ...(nodeDef?.variableExtraction?.vars || {})
                                                                            };
                                                                            
                                                                            const allVarDefs = { ...libraryVars, ...instanceVars };
                                                                            const savedDef = allVarDefs[name];
                                                                            
                                                                            // Extract transformer only if savedDef is an object with valueMode === 'transformer'
                                                                            const transformer = (savedDef && typeof savedDef === 'object' && savedDef.valueMode === 'transformer') 
                                                                                ? savedDef.transformer 
                                                                                : null;
                                                                            
                                                                            let inputUsed: any = selectedTask.result?.data ?? selectedTask.task?.command?.body ?? null;
                                                                            if (transformer && transformer.inputSource === 'variable' && transformer.inputVariable) {
                                                                                inputUsed = selectedTask.result?.variables?.[transformer.inputVariable] ?? null;
                                                                            }
                                                                            setInspectedVarName(name);
                                                                            setInspectedVarPayload({ 
                                                                                value: val, 
                                                                                transformer, 
                                                                                input: selectedTask.result?.variableInputs?.[name] ?? inputUsed 
                                                                            });
                                                                            setInspectorVarOpen(true);
                                                                        }} className="text-primary-600 font-bold text-[10px] uppercase transition-opacity whitespace-nowrap">
                                                                            Inspect
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });
                                                    })()}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="text-[11px] text-gray-400 italic bg-gray-50/50 p-3 rounded-lg border border-dashed border-gray-200">No variables were produced in this run.</div>
                                        )}
                                        </div>}
                                    </div>
                                </div>
                            </section>  {/* Sanity Check Results (Only for non-utility) */}
                            {selectedTask.taskType !== 'VARIABLE' && selectedTask.task?.sanityChecks?.length > 0 && (
                                <section>
                                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Sanity Gates</h4>
                                    <div className="space-y-2">
                                        {selectedTask.task.sanityChecks.map((check: any, idx: number) => {
                                            const record = selectedTask.result?.sanityResults?.find((r: any) => r.regex === check.regex);
                                            const isFailed = record ? !record.passed : selectedTask.error?.includes(`"${check.regex}"`);
                                            
                                            return (
                                                <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between ${isFailed ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                                    <div className="flex items-center gap-3">
                                                        {isFailed ? <AlertTriangle size={16} className="text-red-500" /> : <CheckCircle size={16} className="text-green-500" />}
                                                        <div>
                                                            <div className="text-[11px] font-bold text-gray-700">{check.regex}</div>
                                                            <div className="text-[9px] text-gray-400 uppercase font-black">{check.condition} • {check.severity}</div>
                                                        </div>
                                                    </div>
                                                    <div className={`text-[10px] font-black ${isFailed ? 'text-red-600' : 'text-green-600'}`}>
                                                        {isFailed ? 'FAILED' : 'PASSED'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 border-t border-gray-100 flex justify-end bg-white">
                            <button 
                                onClick={() => setShowInspector(false)}
                                className="text-[13px] font-bold text-primary-600 uppercase tracking-widest hover:bg-primary-50 px-6 py-2 rounded-md transition-colors"
                            >
                                CLOSE INSPECTOR
                            </button>
                        </div>
                    </div>
                </>
            )}

            {inspectorVarOpen && inspectedVarName && inspectedVarPayload && (
                <VariableInspectorDrawer
                    open={inspectorVarOpen}
                    name={inspectedVarName}
                    value={inspectedVarPayload.value}
                    transformer={inspectedVarPayload.transformer}
                    inputValue={inspectedVarPayload.input}
                    onClose={() => { setInspectorVarOpen(false); setInspectedVarName(null); setInspectedVarPayload(null); }}
                />
            )}
        </>
    )
}

function ExecutionHistoryGraph({ executions, currentId, onNavigate }: { executions: any[], currentId: string, onNavigate: (id: string) => void }) {
    const data = [...executions].reverse();
    const maxDuration = Math.max(...data.map(ex => ex.duration || 0), 100);
    
    // Status colors mapping to match dashboard
    const colors: Record<string, string> = {
        SUCCESS: '#10b981',
        FAILED: '#ef4444',
        MAJOR: '#f97316',
        MINOR: '#fbbf24',
        WARNING: '#fbbf24',
        INFORMATION: '#3b82f6',
        RUNNING: '#3b82f6',
        PENDING: '#eab308',
        TIMEOUT: '#f97316',
    };

    return (
        <div className="flex flex-col items-center gap-2 mr-4">
            <div className="flex items-end gap-[3px] h-12">
                {data.slice(-20).map((ex) => {
                    const isCurrent = ex.id === currentId;
                    const height = Math.max(10, ((ex.duration || 0) / maxDuration) * 40);
                    const tasks = ex.taskExecutionRecords || [];
                    const stats = {
                        success: tasks.filter((t: any) => t.status === 'SUCCESS').length,
                        fail: tasks.filter((t: any) => ['FAILED', 'MAJOR', 'MINOR', 'WARNING', 'INFORMATION', 'TIMEOUT'].includes(t.status)).length
                    };
                    
                    const tooltip = `
Run ID: ${ex.id.split('-')[0]}
Status: ${ex.status}
Duration: ${ex.duration || 0}ms
Tasks: ${stats.success} Success, ${stats.fail} Issues
Started: ${new Date(ex.startedAt).toLocaleString()}
                    `.trim();

                    return (
                        <div
                            key={ex.id}
                            onClick={() => onNavigate(ex.id)}
                            className={`w-3 rounded-t-sm cursor-pointer transition-all hover:opacity-100 relative group
                                ${isCurrent ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-y-110 opacity-100' : 'opacity-60'}
                            `}
                            style={{ 
                                height: `${height}px`, 
                                backgroundColor: colors[ex.status] || '#464c54',
                                minHeight: '6px'
                            }}
                            title={tooltip}
                        >
                            {/* Digital glow effect on hover */}
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                        </div>
                    );
                })}
            </div>
            <div className="text-[8px] font-mono text-gray-500 uppercase tracking-tighter">Execution Timeline (Last 20)</div>
        </div>
    );
}

function StatusBadge({ status, size = 'sm' }: { status: string, size?: 'sm' | 'lg' }) {
    const getStyles = (s: string) => {
        switch (s) {
            case 'SUCCESS': return 'bg-green-500/20 text-green-400 border-green-500/20';
            case 'FAILED': return 'bg-red-500/20 text-red-500 border-red-500/20';
            case 'MAJOR': return 'bg-orange-500/20 text-orange-500 border-orange-500/20';
            case 'MINOR': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
            case 'WARNING': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20';
            case 'INFORMATION': return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
            case 'TIMEOUT': return 'bg-red-500/10 text-orange-500 border-red-500/20';
            case 'NO_WORKER_FOUND': return 'bg-gray-500/10 text-gray-500 border-gray-700';
            case 'RUNNING': return 'bg-blue-500/20 text-blue-400 border-blue-500/20 animate-pulse';
            case 'PENDING': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-700';
        }
    }

    return (
        <span className={`${size === 'lg' ? 'text-sm px-4 py-1.5' : 'text-[9px] px-2 py-0.5'} font-bold rounded border ${getStyles(status)} shadow-sm transition-all whitespace-nowrap uppercase tracking-tighter`}>
            {status.replace(/_/g, ' ')}
        </span>
    )
}

export default WorkflowExecutionDetail
