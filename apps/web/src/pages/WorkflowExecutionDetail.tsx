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
    Layers,
    Cpu,
    ArrowRight,
    Box,
    FileText
} from 'lucide-react'

function WorkflowExecutionDetail() {
    const { id } = useParams()
    const [selectedTask, setSelectedTask] = useState<any>(null)
    const [showInspector, setShowInspector] = useState(false)
    const [inspectMode, setInspectMode] = useState<'task' | 'workflow'>('task')
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
    };

    if (isLoading) return <div className="p-8 text-center text-xl text-gray-500 animate-pulse">Loading execution details...</div>
    if (!execution) return <div className="p-8 text-center text-xl text-red-500">Execution not found</div>

    return (
        <div className="h-full flex flex-col bg-slate-950">
            {/* Main Header */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 px-8 flex justify-between items-center shadow-xl z-20">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={handleBack}
                        className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-slate-400 transition-all border border-slate-700"
                    >
                        ←
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-slate-100">{execution.workflowName}</h2>
                            <StatusBadge status={execution.status} size="sm" />
                        </div>
                        <p className="text-slate-500 font-mono text-[9px] uppercase tracking-widest mt-0.5">Execution {execution.id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <ExecutionHistoryGraph 
                        executions={history || []} 
                        currentId={id!} 
                        onNavigate={handleNavigate}
                    />

                    <div className="h-8 w-px bg-slate-800" />
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => {
                                setInspectMode('workflow');
                                setShowInspector(true);
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm group"
                        >
                            <Activity size={14} className="group-hover:text-primary-400 transition-colors" /> Workflow Meta
                        </button>

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
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-lg transition-all"
                        >
                            <RefreshCcw size={16} className={isFetchingExecution ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 relative bg-slate-950 overflow-hidden">
                <ExecutionVisualizer 
                    workflow={execution.workflow} 
                    taskExecutions={execution.taskExecutionRecords || []} 
                    editingTaskId={editingTaskId}
                    onNodeClick={(nodeId) => {
                        const record = execution.taskExecutionRecords.find((r: any) => r.nodeId === nodeId);
                        if (record) {
                            const isUtil = record.input?.taskType === 'VARIABLE' || 
                                          record.input?.utility === true || 
                                          record.task?.taskType === 'VARIABLE' || 
                                          record.taskId === '00000000-0000-0000-0000-000000000001' ||
                                          record.taskId === 'util-vars' ||
                                          record.task?.id === '00000000-0000-0000-0000-000000000001' ||
                                          record.task?.name?.toLowerCase().includes('variable');
                            
                            const isNested = record.input?.taskType === 'WORKFLOW' || 
                                           record.input?.nested === true ||
                                           record.task?.taskType === 'WORKFLOW' ||
                                           (execution.workflow?.nodes as any[])?.find(n => n.id === nodeId)?.taskType === 'WORKFLOW';

                            console.log('[DEBUG] Node Click Inspection:', { 
                                nodeId, 
                                isUtil, 
                                isNested, 
                                recordTaskType: record.task?.taskType, 
                                inputTaskType: record.input?.taskType 
                            });

                            setSelectedTask({
                                ...record,
                                taskType: isUtil ? 'VARIABLE' : (isNested ? 'WORKFLOW' : (record.task?.taskType || 'HTTP'))
                            });
                            setInspectMode('task');
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
                                    taskType: 'VARIABLE',
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

            {(editingTaskId || editingNodeData) && (
                <TaskEditShelf 
                    taskId={editingTaskId} 
                    nodeData={editingNodeData}
                    availableUpstreamVars={(() => {
                        if (!workflow) return [];
                        const targetId = editingNodeData?.id || editingTaskId;
                        return (execution?.taskExecutionRecords || [])
                            .filter((r: any) => r.nodeId !== targetId && r.status !== 'PENDING')
                            .flatMap((record: any) => {
                                const n = (workflow.nodes as any[]).find(node => node.id === record.nodeId);
                                if (!n) return [];
                                
                                let vars = record.input?.variableExtraction?.vars || {};
                                if (record.task?.variableExtraction?.vars) vars = record.task.variableExtraction.vars;
                                if (n.variableExtraction?.vars) vars = n.variableExtraction?.vars;

                                // For WORKFLOW nodes, expose all variables that were actually returned in the result
                                if (n.taskType === 'WORKFLOW') {
                                    const actualVars = record?.result?.variables || {};
                                    return Object.keys(actualVars)
                                        .filter(k => !k.startsWith('__'))
                                        .map(name => ({
                                            name,
                                            taskName: n.label || record?.task?.name || 'Workflow',
                                            value: actualVars[name],
                                            source: 'workflow' as const
                                        }));
                                }

                                return Object.keys(vars)
                                    .filter(k => !k.startsWith('__'))
                                    .map(name => ({ 
                                        name, 
                                        taskName: n.label || record?.task?.name || 'Task',
                                        value: record?.result?.variables?.[name] ?? null,
                                        source: 'task' as const
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

            {showInspector && (
                <div className="fixed inset-y-0 right-0 w-[640px] bg-white shadow-[0_0_100px_rgba(0,0,0,0.4)] z-[99999] flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-500 ease-out">
                    {/* Shelf Header */}
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <div className="flex flex-col">
                            {inspectMode === 'workflow' ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <Layers size={18} className="text-secondary-600" />
                                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Workflow Orchestration</h2>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{execution.workflowName} • Version {execution.workflowVersion}</p>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        {selectedTask.taskType === 'VARIABLE' ? <Cpu size={18} className="text-amber-500" /> : <Activity size={18} className="text-primary-600" />}
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight truncate max-w-[340px]">
                                            {selectedTask.task?.name || selectedTask.nodeId}
                                        </h2>
                                        <StatusBadge status={selectedTask.status} size="sm" />
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                            <Server size={10} /> Worker: {selectedTask.workerId || 'Pending'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={10} /> {selectedTask.duration}ms
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            {inspectMode === 'task' && (
                                <button 
                                    onClick={() => {
                                        if (selectedTask.taskType === 'VARIABLE') {
                                            const nodeDef = (workflow?.nodes as any[])?.find((n: any) => n.id === selectedTask.nodeId);
                                            setEditingNodeData({
                                                id: selectedTask.nodeId,
                                                label: nodeDef?.label || selectedTask.label || selectedTask.task?.name,
                                                taskType: 'VARIABLE',
                                                variableExtraction: nodeDef?.variableExtraction || selectedTask.input?.variableExtraction || selectedTask.task?.variableExtraction || { vars: {} }
                                            });
                                        } else {
                                            setEditingTaskId(selectedTask.task?.id);
                                            const nodeDef = (workflow?.nodes as any[])?.find((n: any) => n.id === selectedTask.nodeId);
                                            setEditingNodeData({
                                                id: selectedTask.nodeId,
                                                label: nodeDef?.label || selectedTask.label || selectedTask.task?.name,
                                                ...nodeDef
                                            });
                                        }
                                        setShowInspector(false);
                                    }}
                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-black uppercase tracking-tighter transition-all"
                                >
                                    Modify Node
                                </button>
                            )}
                            <button onClick={() => setShowInspector(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Shelf Content */}
                    <div className="flex-1 overflow-y-auto px-8 py-8 space-y-12 custom-scrollbar bg-white">
                        {inspectMode === 'workflow' ? (
                            <div className="space-y-12">
                                <section>
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-b border-slate-50 pb-2 flex items-center gap-2">
                                        <Activity size={12} /> Execution Summary
                                    </h4>
                                    <div className="grid grid-cols-2 gap-8 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Trigger Path</div>
                                                <div className="text-xs font-bold text-slate-700">{execution.triggeredBy} ({execution.triggeredByUser})</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Current State</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <StatusBadge status={execution.status} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Workforce</div>
                                                <div className="text-xs font-bold text-slate-700">{execution.targetWorkerId || 'Shared Global Cluster'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Uptime</div>
                                                <div className="text-xs font-bold text-slate-700">{Math.floor((new Date().getTime() - new Date(execution.startedAt).getTime())/1000)}s total</div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {(() => {
                                    const { inputs, outputs, internal } = (() => {
                                        const allVars: Record<string, any> = {};
                                        const inputDefinitions = execution.workflow?.inputVariables || {};
                                        const outputDefinitions = execution.workflow?.outputVariables || {};

                                        // 1. Initialize with defaults from workflow definition (Admin static values)
                                        const allDefs = { ...inputDefinitions, ...outputDefinitions };
                                        Object.entries(allDefs).forEach(([k, v]: [string, any]) => {
                                            if (!k.startsWith('__')) {
                                                allVars[k] = (v && typeof v === 'object' && v.hasOwnProperty('value')) ? v.value : v;
                                            }
                                        });

                                        // 2. Overlay with resolved inputs if provided
                                        // Case A: This IS a sub-workflow, get from parentTaskExecution
                                        let parentInput = (execution as any).parentTaskExecution?.input;
                                        if (parentInput) {
                                            if (typeof parentInput === 'string') {
                                                try { parentInput = JSON.parse(parentInput); } catch (e) { parentInput = null; }
                                            }
                                            if (parentInput) {
                                                const resolved = parentInput.resolvedInput || (parentInput as any).inputMapping;
                                                if (resolved) {
                                                    const resolvedObj = typeof resolved === 'string' ? JSON.parse(resolved) : resolved;
                                                    Object.assign(allVars, resolvedObj);
                                                }
                                            }
                                        }
                                        // Case B: Fallback - search child records for initialization inputs
                                        const recordWithInput = execution.taskExecutionRecords?.find((r: any) => r.input?.resolvedInput);
                                        if (recordWithInput?.input?.resolvedInput) {
                                            Object.assign(allVars, recordWithInput.input.resolvedInput);
                                        }

                                        // 3. Merge all task results in chronological order
                                        execution.taskExecutionRecords?.forEach((r: any) => {
                                            let res = r.result;
                                            if (typeof res === 'string') {
                                                try { res = JSON.parse(res); } catch (e) { return; }
                                            }
                                            if (res?.variables) {
                                                const v = typeof res.variables === 'string' ? JSON.parse(res.variables) : res.variables;
                                                Object.assign(allVars, v);
                                            }
                                        });

                                        // 4. Final overlay from the workflow's own summary record (if completed)
                                        let summaryResult = (execution as any).taskExecutions;
                                        if (summaryResult) {
                                            if (typeof summaryResult === 'string') {
                                                try { summaryResult = JSON.parse(summaryResult); } catch (e) { summaryResult = null; }
                                            }
                                            if (summaryResult?.finalVariables) {
                                                Object.assign(allVars, summaryResult.finalVariables);
                                            }
                                        }

                                        const resInputs: Record<string, any> = {};
                                        const resOutputs: Record<string, any> = {};
                                        const resInternal: Record<string, any> = {};

                                        const inputKeys = Object.keys(inputDefinitions).filter(k => !k.startsWith('__'));
                                        const outputKeys = Object.keys(outputDefinitions).filter(k => !k.startsWith('__'));

                                        inputKeys.forEach(k => {
                                            resInputs[k] = allVars[k];
                                        });

                                        outputKeys.forEach(k => {
                                            resOutputs[k] = allVars[k];
                                        });

                                        Object.keys(allVars).forEach(k => {
                                            if (!inputKeys.includes(k) && !outputKeys.includes(k) && !k.startsWith('__')) {
                                                resInternal[k] = allVars[k];
                                            }
                                        });

                                        return { inputs: resInputs, outputs: resOutputs, internal: resInternal };
                                    })();

                                    return (
                                        <div className="space-y-10">
                                            {/* Input Variables */}
                                            <section>
                                                <h4 className="text-[11px] font-black text-amber-600 uppercase tracking-[0.2em] mb-6 border-b border-amber-50 pb-2 flex items-center gap-2">
                                                    <ArrowRight size={12} /> Input Interface
                                                </h4>
                                                {Object.keys(inputs).length > 0 ? (
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {Object.entries(inputs).map(([key, value]) => (
                                                            <div key={key} className="flex flex-col p-4 bg-amber-50/30 border border-amber-100 rounded-xl">
                                                                <div className="text-[10px] font-black text-amber-700/60 uppercase tracking-tighter mb-1 font-mono">{key}</div>
                                                                <div className="text-xs font-mono text-amber-900 break-all">{value !== undefined ? (typeof value === 'object' ? JSON.stringify(value) : String(value)) : <span className="italic opacity-40">undefined</span>}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-[10px] italic">
                                                        No input variables defined for this workflow.
                                                    </div>
                                                )}
                                            </section>

                                            {/* Output Variables */}
                                            <section>
                                                <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 border-b border-indigo-50 pb-2 flex items-center gap-2">
                                                    <Zap size={12} /> Output Interface
                                                </h4>
                                                {Object.keys(outputs).length > 0 ? (
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {Object.entries(outputs).map(([key, value]) => (
                                                            <div key={key} className="flex flex-col p-4 bg-indigo-50/30 border border-indigo-100 rounded-xl">
                                                                <div className="text-[10px] font-black text-indigo-700/60 uppercase tracking-tighter mb-1 font-mono">{key}</div>
                                                                <div className="text-xs font-mono text-indigo-900 break-all">{value !== undefined ? (typeof value === 'object' ? JSON.stringify(value) : String(value)) : <span className="italic opacity-40">not yet extracted</span>}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-[10px] italic">
                                                        No output variables defined for this workflow.
                                                    </div>
                                                )}
                                            </section>

                                            {/* Internal Variables (Context) */}
                                            {Object.keys(internal).length > 0 && (
                                                <section>
                                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-b border-slate-50 pb-2 flex items-center gap-2">
                                                        <Box size={12} /> Full Variable Context
                                                    </h4>
                                                    <div className="bg-slate-900 rounded-xl p-6 font-mono text-[10px] text-blue-300 overflow-x-auto border border-slate-800 shadow-inner">
                                                        <pre>{JSON.stringify(internal, null, 2)}</pre>
                                                    </div>
                                                </section>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="space-y-12">
                                {/* Task Type Header Tag */}
                                <div className="flex justify-start">
                                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                        selectedTask.taskType === 'VARIABLE' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                                        selectedTask.taskType === 'WORKFLOW' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                                        'bg-sky-50 text-sky-600 border-sky-200'
                                    }`}>
                                        {selectedTask.taskType} Engine Task
                                    </span>
                                </div>

                                {selectedTask.taskType === 'HTTP' && (
                                    <section>
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <ArrowRight size={12} /> Network Request
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="bg-slate-900 p-4 rounded-xl font-mono text-xs border border-slate-800 flex items-center justify-between">
                                                <span className="font-black text-primary-400">{selectedTask.input?.method || 'GET'}</span>
                                                <span className="text-slate-300 truncate ml-4 flex-1 text-right">{selectedTask.input?.url || '---'}</span>
                                            </div>
                                            {selectedTask.input?.data && (
                                                <div className="bg-white border border-slate-200 p-4 rounded-xl">
                                                    <div className="text-[8px] font-black text-slate-400 uppercase mb-2">Payload</div>
                                                    <pre className="text-[11px] text-slate-700 overflow-auto max-h-40">{JSON.stringify(selectedTask.input.data, null, 2)}</pre>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                )}

                                {selectedTask.taskType === 'VARIABLE' && (
                                    <section>
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <Zap size={12} className="text-amber-500" /> Variable Engine Context
                                        </h4>
                                        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6 mb-6">
                                            <p className="text-xs text-amber-900/70 leading-relaxed">
                                                This computation node transforms incoming data and workflow state. It uses the active variable context gathered at the time of orchestration.
                                            </p>
                                        </div>
                                        
                                        {/* IN-SITE VARIABLE CONTEXT PREVIEW */}
                                        {selectedTask.input?.workflowVars && (
                                            <div className="mb-6">
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Active Input Context (Inherited)</div>
                                                <div className="bg-slate-900 rounded-xl p-4 font-mono text-[10px] text-blue-300 border border-slate-800 max-h-60 overflow-auto shadow-inner">
                                                    <pre>{JSON.stringify(selectedTask.input.workflowVars, null, 2)}</pre>
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                )}

                                {selectedTask.taskType === 'WORKFLOW' && (
                                    <section>
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <Layers size={12} className="text-indigo-500" /> Nested Execution Context
                                        </h4>
                                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 border-l-4 border-l-indigo-400">
                                            <p className="text-xs text-indigo-900/70 mb-6 leading-relaxed">
                                                This task launched a sub-workflow. You can inspect its internal state, nodes, and progress by switching to its dedicated execution view.
                                            </p>
                                            <button 
                                                onClick={() => {
                                                    const childId = selectedTask.result?.childExecutionId || selectedTask.subWorkflows?.[0]?.id;
                                                    if (childId) {
                                                        handleNavigate(childId);
                                                        setShowInspector(false);
                                                    } else {
                                                        alert("Sub-workflow execution ID not yet available. It may be initializing.");
                                                    }
                                                }}
                                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.4)]"
                                            >
                                                Deep Dive into Sub-Workflow <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </section>
                                )}

                                {selectedTask.taskType === 'HTTP' && (
                                    <section>
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Response Raw Data</h4>
                                        {selectedTask.error && (
                                            <div className="mb-4 bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3">
                                                <AlertCircle className="text-red-500 shrink-0" size={16} />
                                                <div className="text-xs text-red-900 font-mono italic">{selectedTask.error}</div>
                                            </div>
                                        )}
                                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-inner max-h-[500px] overflow-auto">
                                            <pre className="text-xs text-slate-600">
                                                {selectedTask.result?.data ? (typeof selectedTask.result.data === 'string' ? selectedTask.result.data : JSON.stringify(selectedTask.result.data, null, 2)) : '---'}
                                            </pre>
                                        </div>
                                    </section>
                                )}

                                {(selectedTask.taskType === 'VARIABLE' || selectedTask.taskType === 'WORKFLOW' || Object.keys(selectedTask.result?.variables || {}).filter(k => !k.startsWith('__')).length > 0) && (
                                <section>
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                        <Zap size={14} className="text-amber-500" /> Manipulation results
                                    </h4>
                                    
                                    <div className="space-y-4">
                                        {Object.keys(selectedTask.result?.variables || {}).filter(k => !k.startsWith('__')).length > 0 ? (
                                            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-100/50">
                                                            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Variable Key</th>
                                                            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Computed Value</th>
                                                            <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(() => {
                                                            const nodeDef = (workflow?.nodes as any[])?.find((n: any) => n.id === selectedTask.nodeId);
                                                            const allVars = selectedTask.result.variables || {};
                                                            
                                                            // For WORKFLOW tasks, only show declared output variables
                                                            let varsToShow = Object.entries(allVars).filter(([k]) => !k.startsWith('__'));
                                                            if (selectedTask.taskType === 'WORKFLOW') {
                                                                const declaredOutputs = nodeDef?.outputVariables || selectedTask.task?.outputVariables || {};
                                                                const declaredKeys = Object.keys(declaredOutputs);
                                                                varsToShow = varsToShow.filter(([k]) => declaredKeys.includes(k));
                                                            }
                                                            
                                                            return varsToShow.map(([key, val]) => (
                                                            <tr key={key} className="group hover:bg-white transition-colors">
                                                                <td className="px-4 py-3 border-b border-slate-100/50">
                                                                    <div className="text-[10px] font-black text-slate-600 font-mono tracking-tight">{key}</div>
                                                                </td>
                                                                <td className="px-4 py-3 border-b border-slate-100/50">
                                                                    <div className="font-mono text-[10px] text-slate-800 break-all max-w-[200px]" title={String(val)}>{String(val)}</div>
                                                                </td>
                                                                    <td className="px-4 py-3 border-b border-slate-100/50 text-right">
                                                                        <button 
                                                                            onClick={() => {
                                                                                const nodeDef = (workflow?.nodes as any[])?.find((n: any) => n.id === selectedTask.nodeId);
                                                                                const libVars = selectedTask.task?.variableExtraction?.vars || {};
                                                                                const instVars = { ...(selectedTask.input?.variableExtraction?.vars || {}), ...(nodeDef?.variableExtraction?.vars || {}) };
                                                                                const savedDef = { ...libVars, ...instVars }[key];
                                                                                const transformer = (savedDef && typeof savedDef === 'object' && savedDef.valueMode === 'transformer') ? savedDef.transformer : null;
                                                                                let inputUsed = selectedTask.result?.data ?? selectedTask.task?.command?.body ?? null;
                                                                                if (transformer && transformer.inputSource === 'variable' && transformer.inputVariable) inputUsed = selectedTask.result?.variables?.[transformer.inputVariable] ?? null;
                                                                                
                                                                                setInspectedVarName(key);
                                                                                setInspectedVarPayload({ value: val, transformer, input: selectedTask.result?.variableInputs?.[key] ?? inputUsed });
                                                                                setInspectorVarOpen(true);
                                                                            }}
                                                                            className="p-1.5 transition-all bg-primary-50 text-primary-600 rounded-md hover:bg-primary-600 hover:text-white shadow-sm"
                                                                            title="Inspect Trace"
                                                                        >
                                                                            <Zap size={12} />
                                                                        </button>
                                                                    </td>
                                                            </tr>
                                                            ));
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs italic">
                                                No manipulated variables were produced in this cycle.
                                            </div>
                                        )}
                                    </div>
                                </section>
                                )}

                                {selectedTask.taskType !== 'VARIABLE' && (
                                    <section>
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Sanity Gates</h4>
                                        <div className="space-y-3">
                                            {(() => {
                                                const libraryChecks = selectedTask.task?.sanityChecks || [];
                                                const nodeDef = (workflow?.nodes as any[])?.find((n: any) => n.id === selectedTask.nodeId);
                                                const overlayChecks = nodeDef?.sanityChecks || selectedTask.input?.sanityChecks || [];
                                                const allChecks = [...libraryChecks, ...overlayChecks];
                                                
                                                if (allChecks.length === 0) return <div className="text-[10px] text-slate-300 italic">No gates active.</div>;
                                                
                                                return allChecks.map((check: any, idx: number) => {
                                                    const record = selectedTask.result?.sanityResults?.find((r: any) => r.regex === check.regex);
                                                    const isFailed = record ? !record.passed : false;
                                                    return (
                                                        <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between ${isFailed ? 'bg-red-50/50 border-red-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                                                            <div className="flex items-center gap-3">
                                                                {isFailed ? <AlertTriangle size={16} className="text-red-500" /> : <CheckCircle size={16} className="text-emerald-500" />}
                                                                <div>
                                                                    <div className="text-[11px] font-bold text-slate-700">{check.regex}</div>
                                                                    <div className="text-[9px] text-slate-400 uppercase font-black">{check.condition} • {check.severity}</div>
                                                                </div>
                                                            </div>
                                                            <div className={`text-[10px] font-black ${isFailed ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                {isFailed ? 'FAILED' : 'PASSED'}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </section>
                                )}
                                {/* DEBUG RAW TRACE */}
                                <section className="mt-12 pt-8 border-t border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 font-mono">
                                        <FileText size={10} /> RAW DB TRACE (DEBUG)
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-auto">
                                            <div className="text-[8px] font-black text-slate-400 uppercase mb-2">Input JSON</div>
                                            <pre className="text-[9px] text-slate-500 font-mono leading-tight">{JSON.stringify(selectedTask.input, null, 2)}</pre>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-auto">
                                            <div className="text-[8px] font-black text-slate-400 uppercase mb-2">Result JSON</div>
                                            <pre className="text-[9px] text-slate-500 font-mono leading-tight">{JSON.stringify(selectedTask.result, null, 2)}</pre>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                </div>
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
        </div>
    )
}

function ExecutionHistoryGraph({ executions, currentId, onNavigate }: { executions: any[], currentId: string, onNavigate: (id: string) => void }) {
    const data = [...executions].reverse();
    const maxDuration = Math.max(...data.map(ex => ex.duration || 0), 100);
    const colors: Record<string, string> = {
        SUCCESS: '#10b981', FAILED: '#ef4444', MAJOR: '#f97316', MINOR: '#fbbf24', WARNING: '#fbbf24',
        INFORMATION: '#3b82f6', RUNNING: '#3b82f6', PENDING: '#eab308', TIMEOUT: '#f97316',
    };

    return (
        <div className="flex flex-col items-center gap-1.5 mr-4">
            <div className="flex items-end gap-[3px] h-10">
                {data.slice(-20).map((ex) => {
                    const isCurrent = ex.id === currentId;
                    const height = Math.max(10, ((ex.duration || 0) / maxDuration) * 32);
                    return (
                        <div
                            key={ex.id}
                            onClick={() => onNavigate(ex.id)}
                            className={`w-2.5 rounded-t-sm cursor-pointer transition-all hover:opacity-100 relative group ${isCurrent ? 'opacity-100 scale-y-110' : 'opacity-40'}`}
                            style={{ height: `${height}px`, backgroundColor: colors[ex.status] || '#464c54', minHeight: '6px' }}
                            title={`Status: ${ex.status} | ${ex.duration || 0}ms`}
                        />
                    );
                })}
            </div>
            <div className="text-[7px] font-bold text-slate-600 uppercase tracking-widest leading-none">Recap</div>
        </div>
    );
}

function StatusBadge({ status, size = 'sm' }: { status: string, size?: 'sm' | 'lg' }) {
    const getStyles = (s: string) => {
        switch (s) {
            case 'SUCCESS': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
            case 'FAILED': return 'bg-red-500/20 text-red-400 border-red-500/20';
            case 'RUNNING': return 'bg-sky-500/20 text-sky-400 border-sky-500/20 animate-pulse';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-700';
        }
    }
    return (
        <span className={`${size === 'lg' ? 'text-xs px-3 py-1' : 'text-[9px] px-2 py-0.5'} font-black rounded border ${getStyles(status)} uppercase tracking-widest`}>
            {status.replace(/_/g, ' ')}
        </span>
    )
}

export default WorkflowExecutionDetail
