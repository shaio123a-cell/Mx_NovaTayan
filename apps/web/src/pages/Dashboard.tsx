import { useQuery } from '@tanstack/react-query'
import { workflowsApi } from '../api/workflows'
import { tasksApi } from '../api/tasks'
import { Link } from 'react-router-dom'

function Dashboard() {
    const { data: workflows } = useQuery({
        queryKey: ['workflows'],
        queryFn: workflowsApi.getWorkflows,
    })

    const { data: tasks } = useQuery({
        queryKey: ['tasks'],
        queryFn: tasksApi.getTasks,
    })

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Dashboard</h2>
                <Link to="/designer" className="bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded font-semibold">
                    + New Workflow
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">Total Workflows</h3>
                    <p className="text-4xl font-bold text-primary-400">{workflows?.length || 0}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">Total Tasks</h3>
                    <p className="text-4xl font-bold text-green-400">{tasks?.length || 0}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">Failures (24h)</h3>
                    <p className="text-4xl font-bold text-red-500">0</p>
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden">
                <div className="p-4 border-b border-gray-700 bg-gray-750">
                    <h3 className="text-lg font-bold">Your Workflows</h3>
                </div>
                <div className="divide-y divide-gray-700">
                    {workflows?.map((wf: any) => (
                        <div key={wf.id} className="p-4 flex justify-between items-center hover:bg-gray-750 transition-colors">
                            <div>
                                <h4 className="font-semibold text-lg">{wf.name}</h4>
                                <div className="text-sm text-gray-400">
                                    {wf.nodes?.length || 0} nodes • {wf.version} version
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    to={`/designer?id=${wf.id}`}
                                    className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm"
                                >
                                    Edit
                                </Link>
                                <button
                                    onClick={() => workflowsApi.executeWorkflow(wf.id).then(() => alert('Triggered!'))}
                                    className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-medium"
                                >
                                    Run Now
                                </button>
                            </div>
                        </div>
                    ))}
                    {(!workflows || workflows.length === 0) && (
                        <div className="p-8 text-center text-gray-500">
                            No workflows found. Create your first one to get started!
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Dashboard
