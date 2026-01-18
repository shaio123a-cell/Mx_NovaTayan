import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workflowsApi } from '../api/workflows'
import { Link } from 'react-router-dom'
import { Trash2, RefreshCcw, Clock, ChevronRight, ChevronDown, Activity } from 'lucide-react'

function WorkflowExecutions() {
    const queryClient = useQueryClient();
    const [refreshInterval, setRefreshInterval] = useState<number>(60000);
    const [collapsedWorkflows, setCollapsedWorkflows] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

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

    const groupedHistory = useMemo(() => {
        if (!executions) return {};
        const groups: Record<string, { workflowName: string, workflowId: string, version: number, items: any[] }> = {};
        
        executions.forEach((ex: any) => {
            const key = ex.workflowId || 'unknown';
            if (!groups[key]) {
                groups[key] = { 
                    workflowName: ex.workflowName, 
                    workflowId: ex.workflowId, 
                    version: ex.workflowVersion, 
                    items: [] 
                };
            }
            groups[key].items.push(ex);
        });
        
        return groups;
    }, [executions]);

    const filteredGroups = useMemo(() => {
        if (!searchQuery) return groupedHistory;
        const query = searchQuery.toLowerCase();
        const result: any = {};
        Object.entries(groupedHistory).forEach(([id, data]: any) => {
            if (data.workflowName.toLowerCase().includes(query)) {
                result[id] = data;
            }
        });
        return result;
    }, [groupedHistory, searchQuery]);

    const toggleWorkflow = (id: string) => {
        setCollapsedWorkflows(prev => 
            prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
        );
    }

    if (isLoading) return <div className="p-8 text-center text-gray-400">Loading execution history...</div>

    return (
        <div className="max-w-7xl mx-auto p-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Workflow History</h2>
                    <p className="text-gray-500 mt-1">Review execution status and performance across all automations</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <input 
                        type="text"
                        placeholder="Filter by workflow..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-[#1976D2] outline-none text-sm transition-all"
                    />
                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                        <select 
                            value={refreshInterval}
                            onChange={(e) => setRefreshInterval(Number(e.target.value))}
                            className="bg-transparent text-gray-600 text-xs font-bold outline-none cursor-pointer px-2"
                        >
                            <option value={0}>Refresh: Off</option>
                            <option value={10000}>10s</option>
                            <option value={30000}>30s</option>
                            <option value={60000}>1m</option>
                        </select>
                        <button 
                            onClick={() => refetch()}
                            className="p-1 text-gray-400 hover:text-[#1976D2] transition-colors"
                        >
                            <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {Object.entries(filteredGroups).map(([id, data]: any) => (
                    <div key={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div 
                            className="px-6 py-4 bg-gray-50/50 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleWorkflow(id)}
                        >
                            <div className="flex items-center gap-4">
                                {collapsedWorkflows.includes(id) ? <ChevronRight size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                <div>
                                    <h3 className="font-bold text-gray-900">{data.workflowName}</h3>
                                    <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">ID: {id.split('-')[0]} • Version {data.version}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <ExecutionHistoryCubes workflow={{ executions: data.items.slice(0, 10).reverse() }} />
                                <div className="text-right">
                                    <span className="text-xs font-black text-gray-400">{data.items.length} TOTAL RUNS</span>
                                </div>
                            </div>
                        </div>

                        {!collapsedWorkflows.includes(id) && (
                            <div className="overflow-x-auto border-t border-gray-50">
                                <table className="w-full text-left">
                                    <thead className="bg-[#f9fafb] text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-8 py-3">Status</th>
                                            <th className="px-8 py-3">Started At</th>
                                            <th className="px-8 py-3">Duration</th>
                                            <th className="px-8 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {data.items.map((ex: any) => (
                                            <tr key={ex.id} className="hover:bg-blue-50/10 transition-colors group">
                                                <td className="px-8 py-4">
                                                    <StatusBadge status={ex.status} />
                                                </td>
                                                <td className="px-8 py-4 text-sm text-gray-500 font-mono">
                                                    {new Date(ex.startedAt).toLocaleString()}
                                                </td>
                                                <td className="px-8 py-4 text-sm text-gray-600 font-bold">
                                                    {ex.duration ? `${ex.duration}ms` : '-'}
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Link
                                                            to={`/workflows/history/${ex.id}`}
                                                            className="px-4 py-1.5 bg-white border border-gray-200 hover:border-[#1976D2] hover:text-[#1976D2] text-[#1976D2] text-xs font-bold rounded-lg transition-all shadow-sm"
                                                        >
                                                            Inspect
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

function ExecutionHistoryCubes({ workflow }: any) {
    const executions = workflow.executions || []
    const paddedExecutions = [...Array(10)].map((_, i) => executions[i] || null)

    return (
        <div className="flex gap-1.5 items-center">
            {paddedExecutions.map((ex, i) => (
                <Cube key={i} execution={ex} />
            ))}
        </div>
    )
}

function Cube({ execution }: { execution: any }) {
    if (!execution) return <div className="w-3.5 h-3.5 rounded-sm bg-gray-100" />

    const colors: any = {
        SUCCESS: '#4caf50',
        FAILED: '#f44336',
        RUNNING: '#2196f3',
        PENDING: '#ff9800',
        TIMEOUT: '#ff9800',
    }

    const tasks = execution.taskExecutionRecords || [];
    const counts = {
        SUCCESS: tasks.filter((t: any) => t.status === 'SUCCESS' || t.status === 'COMPLETED').length,
        FAILED: tasks.filter((t: any) => t.status === 'FAILED').length,
        PENDING: tasks.filter((t: any) => t.status === 'PENDING').length,
        RUNNING: tasks.filter((t: any) => t.status === 'RUNNING').length,
        NO_WORKER: tasks.filter((t: any) => t.status === 'NO_WORKER_FOUND').length,
    };

    const tooltip = `
Status: ${execution.status}
Duration: ${execution.duration || 0}ms
Started: ${new Date(execution.startedAt).toLocaleString()}
---
Success: ${counts.SUCCESS}
Failed: ${counts.FAILED}
Pending: ${counts.PENDING}
Running: ${counts.RUNNING}
No Worker: ${counts.NO_WORKER}
    `.trim();

    return (
        <Link 
            to={`/workflows/history/${execution.id}`}
            className="w-3.5 h-3.5 rounded-sm cursor-help transition-transform hover:scale-125 hover:z-10"
            style={{ backgroundColor: colors[execution.status] || '#9e9e9e' }}
            title={tooltip}
        />
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        SUCCESS: 'bg-green-100 text-green-700',
        FAILED: 'bg-red-100 text-red-700',
        RUNNING: 'bg-blue-100 text-blue-700 animate-pulse',
        PENDING: 'bg-amber-100 text-amber-700',
    }

    return (
        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
            {status}
        </span>
    )
}

export default WorkflowExecutions
