import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { workflowsApi } from '../api/workflows'
import { useState } from 'react'
import { ExecutionVisualizer } from '../components/ExecutionVisualizer'
import { TaskEditShelf } from '../components/TaskEditShelf'
import { CheckCircle, AlertCircle, AlertTriangle, X, Clock, Play, Square, RefreshCcw } from 'lucide-react'

function WorkflowExecutionDetail() {
    const { id } = useParams()
    const [selectedTask, setSelectedTask] = useState<any>(null)
    const [showInspector, setShowInspector] = useState(false)
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null)


    const queryClient = useQueryClient();

    const { data: execution, isLoading } = useQuery({
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

    const runMutation = useMutation({
        mutationFn: () => workflowsApi.executeWorkflow(execution.workflowId),
        onSuccess: () => alert('New execution started! See history.')
    });



    if (isLoading) return <div className="p-8 text-center text-xl text-gray-500 animate-pulse">Loading execution details...</div>
    if (!execution) return <div className="p-8 text-center text-xl text-red-500">Execution not found</div>

    return (
        <>
            <div className="h-full flex flex-col">
                {/* Header Header */}
                <div className="bg-gray-900 border-b border-gray-800 p-4 px-8 flex justify-between items-center bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 shadow-xl z-20">
                    <div className="flex items-center gap-6">
                        <Link to="/history" className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg text-gray-400 transition-all border border-gray-700 hover:scale-105">
                            ←
                        </Link>
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
                                onClick={() => queryClient.invalidateQueries({ queryKey: ['workflow-execution', id] })}
                                className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 rounded-lg transition-all"
                                title="Refresh data"
                            >
                                <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
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
                                setSelectedTask(record);
                                setShowInspector(true);
                            }
                        }}
                        onInspect={(nodeId) => {
                            const record = execution.taskExecutionRecords.find((r: any) => r.nodeId === nodeId);
                            if (record) {
                                setSelectedTask(record);
                                setShowInspector(true);
                            }
                        }}
                        onEditTask={(nodeId) => {
                            const record = execution.taskExecutionRecords.find((r: any) => r.nodeId === nodeId);
                            if (record && record.task) {
                                setEditingTaskId(record.task.id);
                            }
                        }}
                    />
                </div>
            </div>

            {/* Task Edit Shelf (Right Modal Drawer) */}
            {editingTaskId && (
                <TaskEditShelf 
                    taskId={editingTaskId} 
                    onClose={() => setEditingTaskId(null)} 
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
                                <h2 className="text-xl font-medium text-gray-800">{selectedTask.task?.name || 'Task Detail'}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${selectedTask.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {selectedTask.status}
                                    </span>
                                    {selectedTask.result?.status && (
                                        <span className="text-[10px] font-mono text-gray-400">HTTP {selectedTask.result.status}</span>
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
                             <button 
                                onClick={() => {
                                    setEditingTaskId(selectedTask.task.id);
                                    setShowInspector(false);
                                }}
                                className="text-[11px] font-bold text-primary-600 hover:underline flex items-center gap-1"
                             >
                                EDIT TASK DEFINITION →
                             </button>
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 custom-scrollbar bg-white">
                            
                            {/* Request Details */}
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

                            {/* Response Details */}
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

                            {/* Sanity Check Results */}
                            {selectedTask.task?.sanityChecks?.length > 0 && (
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
        </>
    )
}

function StatusBadge({ status, size = 'sm' }: { status: string, size?: 'sm' | 'lg' }) {
    const getStyles = (s: string) => {
        switch (s) {
            case 'SUCCESS': return 'bg-green-500/20 text-green-400 border-green-500/20';
            case 'FAILED': return 'bg-red-500/20 text-red-500 border-red-500/20';
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
