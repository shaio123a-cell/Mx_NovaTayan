import { useQuery } from '@tanstack/react-query'
import { workflowsApi } from '../api/workflows'

import { Link } from 'react-router-dom'

function Dashboard() {
    const { data: workflows } = useQuery({
        queryKey: ['workflows'],
        queryFn: workflowsApi.getWorkflows,
    })

    const { data: stats } = useQuery({
        queryKey: ['system-stats'],
        queryFn: workflowsApi.getSystemStats,
        refetchInterval: 30000
    })

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
                    <p className="text-gray-500 mt-1">Real-time monitoring of your automation system performance.</p>
                </div>
                <Link to="/designer" className="bg-[#1976D2] hover:bg-[#1565C0] text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 transform hover:-translate-y-0.5">
                    + New Workflow
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.1em] mb-3">Total Workflows</h3>
                    <p className="text-5xl font-black text-[#1976D2] tracking-tighter">{stats?.totalWorkflows || 0}</p>
                </div>
                <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.1em] mb-3">Active Tasks</h3>
                    <p className="text-5xl font-black text-green-600 tracking-tighter">{stats?.totalTasks || 0}</p>
                </div>
                <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.1em] mb-3">Failures (24h)</h3>
                    <p className="text-5xl font-black text-red-500 tracking-tighter">{stats?.failures24h || 0}</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Your Workflows</h3>
                </div>
                <div className="divide-y divide-gray-50">
                    {workflows?.map((wf: any) => (
                        <div key={wf.id} className="p-6 flex justify-between items-center hover:bg-blue-50/10 transition-colors group">
                            <div className="flex-1">
                                <Link to={`/workflows/history/${wf.executions?.[0]?.id || ''}`} className="block group/title">
                                    <h4 className="font-bold text-xl text-gray-800 mb-1 group-hover/title:text-[#1976D2] transition-colors">{wf.name}</h4>
                                </Link>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-medium text-gray-400">
                                        {wf.nodes?.length || 0} nodes • v{wf.version}
                                    </span>
                                    <div className="h-3 w-px bg-gray-200" />
                                    <ExecutionHistoryCubes workflow={wf} />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    to={`/designer?id=${wf.id}`}
                                    className="px-4 py-2 rounded-lg font-bold text-sm text-gray-600 bg-white border border-gray-200 hover:border-[#1976D2] hover:text-[#1976D2] transition-all shadow-sm"
                                >
                                    Edit
                                </Link>
                                <button
                                    onClick={() => workflowsApi.executeWorkflow(wf.id).then(() => alert('Triggered!'))}
                                    className="px-4 py-2 rounded-lg font-bold text-sm text-white bg-green-500 hover:bg-green-600 transition-all shadow-sm flex items-center gap-2"
                                >
                                    Run
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm(`Are you sure you want to delete workflow "${wf.name}"?`)) {
                                            workflowsApi.deleteWorkflow(wf.id).then(() => {
                                                window.location.reload();
                                            })
                                        }
                                    }}
                                    className="px-3 py-2 rounded-lg font-bold text-sm text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {(!workflows || workflows.length === 0) && (
                        <div className="p-16 text-center text-gray-400">
                            <div className="mb-4 opacity-10">🚀</div>
                            <p className="text-lg font-medium">No workflows found.</p>
                            <p className="text-sm">Create your first automation to get started!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function ExecutionHistoryCubes({ workflow }: { workflow: any }) {
    // We want last 10 executions. Backend findAll is already taking 10 and ordering by startedAt desc.
    const executions = workflow.executions || [];
    
    // Fill up to 10 slots (placeholders for "Never Run")
    const slots = Array(10).fill(null).map((_, i) => executions[9 - i] || null); // Show oldest to newest (left to right)

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
    if (!execution) {
        return <div className="w-3 h-3 rounded-sm bg-gray-100" title="No execution" />;
    }

    const color = {
        SUCCESS: 'bg-green-500 hover:bg-green-600',
        FAILED: 'bg-red-500 hover:bg-red-600',
        RUNNING: 'bg-blue-500 hover:bg-blue-600 animate-pulse',
        PENDING: 'bg-orange-500 hover:bg-orange-600',
        TIMEOUT: 'bg-orange-600 hover:bg-orange-700',
    }[execution.status as string] || 'bg-gray-400';

    // Calculate task status counts
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
            className={`w-3 h-3 rounded-sm ${color} transition-all transform hover:scale-125 hover:z-10 cursor-pointer shadow-sm`}
            title={tooltip}
        />
    );
}

export default Dashboard
