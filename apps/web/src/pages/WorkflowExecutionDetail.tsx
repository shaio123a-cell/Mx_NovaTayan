import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { workflowsApi } from '../api/workflows'
import { useState } from 'react'
import { ExecutionVisualizer } from '../components/ExecutionVisualizer'
import { TaskEditShelf } from '../components/TaskEditShelf'

function WorkflowExecutionDetail() {
    const { id } = useParams()
    const [selectedTask, setSelectedTask] = useState<any>(null)
    const [showInspector, setShowInspector] = useState(false)
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null)

    const { data: execution, isLoading } = useQuery({
        queryKey: ['workflow-execution', id],
        queryFn: () => workflowsApi.getExecutionDetail(id!),
        refetchInterval: (query) => (['RUNNING', 'PENDING'].includes(query.state.data?.status) ? 3000 : false)
    })

    if (isLoading) return <div className="p-8 text-center text-xl text-gray-500 animate-pulse">Loading execution details...</div>
    if (!execution) return <div className="p-8 text-center text-xl text-red-500">Execution not found</div>

    return (
        <>
            <div className="h-full flex flex-col">
                {/* Header Header */}
                <div className="bg-gray-900 border-b border-gray-800 p-4 px-8 flex justify-between items-center bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800">
                    <div className="flex items-center gap-6">
                        <Link to="/history" className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg text-gray-400 transition-all border border-gray-700">
                            ←
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-gray-100">{execution.workflowName}</h2>
                                <StatusBadge status={execution.status} size="sm" />
                            </div>
                            <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mt-0.5">Run ID: {execution.id}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-mono text-gray-400">Triggered By: <span className="text-primary-400 font-bold">{execution.triggeredBy}</span></div>
                        <p className="text-gray-500 text-[10px] mt-1">{new Date(execution.startedAt).toLocaleString()}</p>
                    </div>
                </div>

                {/* Main Content: Full Screen Visualizer */}
                <div className="flex-1 relative bg-[#0b0c10]">
                    <ExecutionVisualizer 
                        workflow={execution.workflow} 
                        taskExecutions={execution.taskExecutionRecords || []} 
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
                        onEditTask={(taskId) => {
                            setEditingTaskId(taskId);
                        }}
                    />
                </div>
            </div>

            {/* Task Edit Shelf (Slide-over) */}
            {editingTaskId && (
                <TaskEditShelf 
                    taskId={editingTaskId} 
                    onClose={() => setEditingTaskId(null)} 
                />
            )}

            {/* Bottom Inspector Pane */}
            {showInspector && selectedTask && (
                <div className="fixed bottom-0 left-[240px] right-0 bg-gray-900 border-t border-gray-700 shadow-2xl z-50 transition-all animate-slide-up" style={{ height: '45vh' }}>
                    <div className="h-full flex flex-col">
                        <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center px-6">
                            <div className="flex items-center gap-3">
                                <StatusBadge status={selectedTask.status} />
                                <h3 className="font-bold text-gray-200">{selectedTask.task?.name}</h3>
                                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{selectedTask.nodeId}</span>
                                {selectedTask.duration && (
                                    <span className="bg-black/40 px-2 py-0.5 rounded text-[10px] text-gray-400 font-mono">
                                        {selectedTask.duration}ms
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-[10px] text-gray-500 font-mono">
                                    {selectedTask.startedAt && `Start: ${new Date(selectedTask.startedAt).toLocaleTimeString()}`}
                                    {selectedTask.completedAt && ` • End: ${new Date(selectedTask.completedAt).toLocaleTimeString()}`}
                                </div>
                                <div className="h-4 w-px bg-gray-700" />
                                <button 
                                    onClick={() => setShowInspector(false)}
                                    className="text-gray-500 hover:text-white transition-colors p-1 text-[11px] font-bold"
                                >
                                    ✕ CLOSE
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-hidden grid grid-cols-2 divide-x divide-gray-700">
                            {/* Request (Input) */}
                            <div className="h-full overflow-y-auto p-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Execution Request (Sent)</h4>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="col-span-1">
                                            <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Method</div>
                                            <div className="text-xs font-mono text-primary-400 font-bold">{selectedTask.input?.method || selectedTask.task?.command?.method}</div>
                                        </div>
                                        <div className="col-span-3">
                                            <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">URL</div>
                                            <div className="text-xs font-mono text-gray-300 break-all">{selectedTask.input?.url || selectedTask.task?.command?.url}</div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Headers</div>
                                        <pre className="bg-black/30 p-3 rounded-lg text-[10px] font-mono text-gray-400 border border-gray-800">
                                            {JSON.stringify(selectedTask.input?.headers || selectedTask.task?.command?.headers || {}, null, 2)}
                                        </pre>
                                    </div>

                                    <div>
                                        <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Body Context</div>
                                        <pre className="bg-black/30 p-3 rounded-lg text-[10px] font-mono text-gray-400 border border-gray-800">
                                            {selectedTask.input?.data ? JSON.stringify(selectedTask.input.data, null, 2) : 'No body sent'}
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            {/* Response (Output) */}
                            <div className="h-full overflow-y-auto p-6 space-y-4 bg-black/10">
                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Execution Response (Result)</h4>
                                {selectedTask.error ? (
                                    <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-lg">
                                        <div className="text-[10px] text-red-500 font-bold uppercase mb-2">Failure Detail / Error Log</div>
                                        <pre className="text-xs font-mono text-red-400 whitespace-pre-wrap">{selectedTask.error}</pre>
                                    </div>
                                ) : selectedTask.result ? (
                                    <div className="space-y-4">
                                        <div className="flex gap-6">
                                            <div>
                                                <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Result Status</div>
                                                <div className={`text-xs font-mono font-bold ${selectedTask.result.status < 300 ? 'text-green-500' : 'text-red-500'}`}>
                                                    HTTP {selectedTask.result.status}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Total Latency</div>
                                                <div className="text-xs font-mono text-gray-300">{selectedTask.duration}ms</div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Response Payload</div>
                                            <pre className="bg-black/40 p-3 rounded-lg text-xs font-mono text-gray-300 border border-gray-800 whitespace-pre-wrap">
                                                {typeof selectedTask.result.data === 'string'
                                                    ? selectedTask.result.data
                                                    : JSON.stringify(selectedTask.result.data, null, 2)}
                                            </pre>
                                        </div>

                                        <div>
                                            <div className="text-[10px] text-gray-600 uppercase font-bold mb-1">Response Headers</div>
                                            <pre className="bg-black/10 p-3 rounded-lg text-[10px] font-mono text-gray-500 overflow-auto max-h-40">
                                                {JSON.stringify(selectedTask.result.headers, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-40 text-gray-600 animate-pulse italic text-xs">
                                        Execution in progress or pending worker pickup...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

function StatusBadge({ status, size = 'sm' }: { status: string, size?: 'sm' | 'lg' }) {
    const getStyles = (s: string) => {
        switch (s) {
            case 'SUCCESS': return 'bg-green-500/20 text-green-400 border-green-500/20';
            case 'FAILED': return 'bg-red-500/20 text-red-500 border-red-500/20';
            case 'TIMEOUT': return 'bg-red-500/20 text-orange-500 border-red-500/20';
            case 'NO_WORKER_FOUND': return 'bg-gray-500/10 text-gray-500 border-gray-700';
            case 'RUNNING': return 'bg-blue-500/20 text-blue-400 border-blue-500/20 animate-pulse';
            case 'PENDING': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-700';
        }
    }

    return (
        <span className={`${size === 'lg' ? 'text-sm px-4 py-1.5' : 'text-[10px] px-2 py-0.5'} font-bold rounded-lg border ${getStyles(status)} shadow-sm transition-all whitespace-nowrap`}>
            {status.replace(/_/g, ' ')}
        </span>
    )
}

export default WorkflowExecutionDetail
