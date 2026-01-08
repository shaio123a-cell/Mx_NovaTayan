import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { workflowsApi } from '../api/workflows'
import { useState } from 'react'

function WorkflowExecutionDetail() {
    const { id } = useParams()
    const [selectedTask, setSelectedTask] = useState<any>(null)

    const { data: execution, isLoading } = useQuery({
        queryKey: ['workflow-execution', id],
        queryFn: () => workflowsApi.getExecutionDetail(id!),
        refetchInterval: (query) => (query.state.data?.status === 'RUNNING' ? 3000 : false)
    })

    if (isLoading) return <div className="p-8 text-center text-xl">Loading execution details...</div>
    if (!execution) return <div className="p-8 text-center text-xl text-red-500">Execution not found</div>

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <Link to="/history" className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1 mb-2">
                        ← Back to History
                    </Link>
                    <h2 className="text-3xl font-bold">{execution.workflowName}</h2>
                    <p className="text-gray-400 font-mono text-xs mt-1 uppercase">Run ID: {execution.id}</p>
                </div>
                <div className="text-right">
                    <StatusBadge status={execution.status} size="lg" />
                    <p className="text-gray-400 text-sm mt-2">{new Date(execution.startedAt).toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Task Checklist */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest px-2">Task Sequence</h3>
                    <div className="space-y-2">
                        {execution.taskExecutionRecords?.map((taskEx: any, idx: number) => (
                            <div
                                key={taskEx.id}
                                onClick={() => setSelectedTask(taskEx)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedTask?.id === taskEx.id
                                        ? 'bg-primary-900/20 border-primary-500'
                                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                                    }`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <div className="text-[10px] font-bold text-gray-500">STEP {idx + 1}</div>
                                    <StatusBadge status={taskEx.status} />
                                </div>
                                <div className="font-bold text-gray-200">{taskEx.task?.name || 'Unknown Task'}</div>
                                <div className="text-[10px] font-mono text-gray-500 mt-1 uppercase">Node: {taskEx.nodeId}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Task Details / Logs */}
                <div className="lg:col-span-2">
                    {selectedTask ? (
                        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl flex flex-col h-full min-h-[500px]">
                            <div className="p-6 border-b border-gray-700 bg-gray-750">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold">{selectedTask.task?.name}</h3>
                                    <div className="text-sm font-mono text-gray-400">{selectedTask.duration}ms</div>
                                </div>
                                <div className="mt-2 flex gap-4 text-xs font-medium">
                                    <span className="text-gray-400">Worker Group: <span className="text-gray-200">{selectedTask.task?.workerGroup || 'default'}</span></span>
                                    <span className="text-gray-400">Method: <span className="text-gray-200">{selectedTask.task?.command?.method}</span></span>
                                </div>
                            </div>

                            <div className="p-6 bg-gray-900 flex-1 space-y-6">
                                {selectedTask.error ? (
                                    <div className="bg-red-900/20 border border-red-500/20 p-4 rounded-lg text-red-400">
                                        <div className="font-bold mb-1">Execution Error</div>
                                        <pre className="text-xs font-mono">{selectedTask.error}</pre>
                                    </div>
                                ) : selectedTask.result ? (
                                    <>
                                        <div>
                                            <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Response Output</h4>
                                            <pre className="bg-black/50 p-4 rounded-lg border border-gray-800 text-xs font-mono text-gray-300 overflow-auto max-h-96 whitespace-pre-wrap">
                                                {typeof selectedTask.result.data === 'string'
                                                    ? selectedTask.result.data
                                                    : JSON.stringify(selectedTask.result.data, null, 2)}
                                            </pre>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Metadata / Headers</h4>
                                            <pre className="bg-black/20 p-4 rounded-lg text-[10px] font-mono text-gray-500">
                                                {JSON.stringify({
                                                    status: selectedTask.result.status,
                                                    headers: selectedTask.result.headers,
                                                    workerId: selectedTask.workerId
                                                }, null, 2)}
                                            </pre>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-12 text-gray-500 italic">
                                        <span className="animate-spin text-2xl mb-4">⌛</span>
                                        Waiting for execution results...
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center flex flex-col items-center justify-center h-full min-h-[500px]">
                            <div className="text-5xl mb-4 opacity-20">📊</div>
                            <h3 className="text-xl font-bold text-gray-300">Select a task on the left</h3>
                            <p className="text-gray-500 mt-2 max-w-xs mx-auto">Click on any completed or running task to view its detailed logs, outputs, and performance metrics.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function StatusBadge({ status, size = 'sm' }: { status: string, size?: 'sm' | 'lg' }) {
    const styles: any = {
        RUNNING: 'bg-primary-500/20 text-primary-400 border-primary-500/20 animate-pulse',
        SUCCESS: 'bg-green-500/20 text-green-400 border-green-500/20',
        COMPLETED: 'bg-green-500/20 text-green-400 border-green-500/20',
        FAILED: 'bg-red-500/20 text-red-500 border-red-500/20',
        PENDING: 'bg-gray-500/10 text-gray-400 border-gray-700',
    }

    return (
        <span className={`${size === 'lg' ? 'text-sm px-4 py-1' : 'text-[10px] px-2 py-0.5'} font-bold rounded border ${styles[status] || styles.RUNNING}`}>
            {status}
        </span>
    )
}

export default WorkflowExecutionDetail
