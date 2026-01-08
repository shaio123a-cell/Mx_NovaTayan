import { useQuery } from '@tanstack/react-query'
import { workflowsApi } from '../api/workflows'
import { Link } from 'react-router-dom'

function WorkflowExecutions() {
    const { data: executions, isLoading } = useQuery({
        queryKey: ['workflow-executions'],
        queryFn: workflowsApi.getAllExecutions,
        refetchInterval: 5000 // Poll for updates
    })

    if (isLoading) return <div className="p-8 text-center">Loading execution history...</div>

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white">Execution History</h2>
                <p className="text-gray-400 mt-1">Global log of all workflow and task orchestrations</p>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
                <table className="w-full text-left">
                    <thead className="bg-gray-750 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-700">
                        <tr>
                            <th className="px-6 py-4">Workflow Name</th>
                            <th className="px-6 py-4">Trigger</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Started At</th>
                            <th className="px-6 py-4">Duration</th>
                            <th className="px-6 py-4 text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {executions?.map((ex: any) => (
                            <tr key={ex.id} className="hover:bg-gray-750/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-200">{ex.workflowName}</span>
                                        <span className="text-[10px] font-mono text-gray-500 uppercase">v{ex.workflowVersion} • {ex.id.split('-')[0]}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-gray-900 border border-gray-700 px-2 py-1 rounded text-gray-400 text-[10px] font-bold">
                                        {ex.triggeredBy}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={ex.status} />
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                                    {new Date(ex.startedAt).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-400">
                                    {ex.duration ? `${ex.duration}ms` : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Link
                                        to={`/workflows/history/${ex.id}`}
                                        className="text-primary-400 hover:text-primary-300 text-sm font-bold"
                                    >
                                        Inspect
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {executions?.length === 0 && <div className="p-12 text-center text-gray-500 italic">No executions recorded yet.</div>}
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        RUNNING: 'bg-primary-500/20 text-primary-400 border-primary-500/20 animate-pulse',
        SUCCESS: 'bg-green-500/20 text-green-400 border-green-500/20',
        FAILED: 'bg-red-500/20 text-red-500 border-red-500/20',
    }

    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${styles[status] || styles.RUNNING}`}>
            {status}
        </span>
    )
}

export default WorkflowExecutions
