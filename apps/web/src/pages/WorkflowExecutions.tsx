import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workflowsApi } from '../api/workflows'
import { Link } from 'react-router-dom'
import { Trash2, RefreshCcw, Clock } from 'lucide-react'

function WorkflowExecutions() {
    const queryClient = useQueryClient();
    const [refreshInterval, setRefreshInterval] = useState<number>(60000); // Default 1 minute

    const { data: executions, isLoading, refetch } = useQuery({
        queryKey: ['workflow-executions'],
        queryFn: workflowsApi.getAllExecutions,
        refetchInterval: refreshInterval
    })

    const deleteMutation = useMutation({
        mutationFn: workflowsApi.deleteWorkflowExecution,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflow-executions'] });
        }
    });

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this execution record?')) {
            try {
                await deleteMutation.mutateAsync(id);
            } catch (err: any) {
                alert(`Failed to delete: ${err.message}`);
            }
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-400">Loading execution history...</div>

    return (
        <div className="max-w-7xl mx-auto p-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Execution History</h2>
                    <p className="text-gray-400 mt-1">Global log of all workflow and task orchestrations</p>
                </div>
                
                <div className="flex items-center gap-3 bg-gray-800/50 p-2 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 px-2 border-r border-gray-700">
                        <Clock size={16} />
                        <span className="text-xs font-medium">Refresh</span>
                    </div>
                    <select 
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                        className="bg-transparent text-gray-200 text-xs font-bold outline-none cursor-pointer pr-2 hover:text-primary-400 transition-colors"
                    >
                        <option value={0} className="bg-gray-800">Off</option>
                        <option value={10000} className="bg-gray-800">10s</option>
                        <option value={30000} className="bg-gray-800">30s</option>
                        <option value={60000} className="bg-gray-800">1m</option>
                        <option value={300000} className="bg-gray-800">5m</option>
                    </select>
                    <button 
                        onClick={() => refetch()}
                        className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-all active:scale-95"
                        title="Manual Refresh"
                    >
                        <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900/50 text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700">
                            <tr>
                                <th className="px-6 py-4">Workflow Name</th>
                                <th className="px-6 py-4">Trigger</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Started At</th>
                                <th className="px-6 py-4">Duration</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {executions?.map((ex: any) => (
                                <tr key={ex.id} className="hover:bg-gray-750/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-200 group-hover:text-primary-400 transition-colors">
                                                {ex.workflowName}
                                            </span>
                                            <span className="text-[10px] font-mono text-gray-500 uppercase">
                                                v{ex.workflowVersion} • {ex.id.split('-')[0]}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-gray-900/50 border border-gray-700 px-2 py-1 rounded text-gray-500 text-[10px] font-bold uppercase">
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
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                to={`/workflows/history/${ex.id}`}
                                                className="px-3 py-1.5 bg-gray-700/50 hover:bg-primary-600/20 text-gray-300 hover:text-primary-400 text-xs font-bold rounded-md border border-transparent hover:border-primary-600/30 transition-all"
                                            >
                                                Inspect
                                            </Link>
                                            <button
                                                onClick={(e) => handleDelete(e, ex.id)}
                                                disabled={deleteMutation.isPending}
                                                className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all active:scale-90"
                                                title="Delete Record"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {executions?.length === 0 && (
                    <div className="p-12 text-center text-gray-500 italic bg-gray-800/40">
                        No executions recorded yet.
                    </div>
                )}
            </div>
        </div>
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

export default WorkflowExecutions
