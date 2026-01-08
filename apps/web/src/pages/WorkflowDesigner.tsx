import { useCallback, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    BackgroundVariant,
    Node,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import { workflowsApi } from '../api/workflows'

const initialNodes: Node[] = []
const initialEdges: any[] = []

// Custom Task Node Component (inline for now)
function TaskNode({ data }: any) {
    return (
        <div className="px-4 py-2 shadow-md rounded-md bg-gray-900 border-2 border-primary-500 min-w-[200px]">
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                    <div className="text-[10px] font-bold text-gray-500 uppercase">{data.method}</div>
                    <div className="text-[8px] bg-gray-800 px-1 rounded text-primary-400 font-mono">
                        {data.workerGroup || 'inherit'}
                    </div>
                </div>
                <div className="text-sm font-semibold mb-2">{data.label}</div>
                <div className="border-t border-gray-700 pt-2">
                    <input
                        className="w-full bg-gray-800 text-[10px] px-2 py-1 rounded outline-none border border-gray-700 focus:border-primary-500"
                        placeholder="Group override..."
                        defaultValue={data.workerGroup || ''}
                        onChange={(e) => data.onChangeWorkerGroup(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>
        </div>
    )
}

const nodeTypes = {
    taskNode: TaskNode,
}

function WorkflowDesigner() {
    const [searchParams] = useSearchParams()
    const workflowId = searchParams.get('id')
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
    const [workflowName, setWorkflowName] = useState('My Workflow')
    const [workerGroup, setWorkerGroup] = useState('default')
    const queryClient = useQueryClient()

    // 1. Fetch available tasks
    const { data: tasks } = useQuery({
        queryKey: ['tasks'],
        queryFn: tasksApi.getTasks,
    })

    const { data: existingWorkflow, isLoading: isWfLoading } = useQuery({
        queryKey: ['workflow', workflowId],
        queryFn: () => workflowsApi.getWorkflow(workflowId!),
        enabled: !!workflowId,
    })

    // 2. Load existing workflow into canvas
    useEffect(() => {
        if (existingWorkflow) {
            setWorkflowName(existingWorkflow.name)
            setWorkerGroup(existingWorkflow.workerGroup || 'default')
            setNodes(existingWorkflow.nodes.map((n: any) => ({
                id: n.id,
                type: 'taskNode',
                position: n.position,
                data: {
                    label: n.label,
                    taskId: n.taskId,
                    method: tasks?.find((t: any) => t.id === n.taskId)?.command?.method || 'GET',
                    workerGroup: n.workerGroup
                }
            })))
            setEdges(existingWorkflow.edges.map((e: any) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                animated: true,
                data: { condition: e.condition }
            })))
        }
    }, [existingWorkflow, setNodes, setEdges, tasks])

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, data: { condition: 'ON_SUCCESS' } }, eds)),
        [setEdges],
    )

    // 2. Mutations
    const saveMutation = useMutation({
        mutationFn: (data: any) => workflowId
            ? workflowsApi.updateWorkflow(workflowId, data)
            : workflowsApi.createWorkflow(data),
        onSuccess: () => {
            alert('Workflow saved!')
            queryClient.invalidateQueries({ queryKey: ['workflows'] })
        },
        onError: (err: any) => alert(`Save failed: ${err.message}`),
    })

    const executeMutation = useMutation({
        mutationFn: (id: string) => workflowsApi.executeWorkflow(id),
        onSuccess: () => alert('Execution started!'),
    })

    const handleSave = () => {
        const workflowData = {
            name: workflowName,
            workerGroup: workerGroup,
            nodes: nodes.map(n => ({
                id: n.id,
                taskId: n.data.taskId,
                position: n.position,
                label: n.data.label,
                workerGroup: n.data.workerGroup
            })),
            edges: edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                condition: 'ON_SUCCESS' // Default for now
            })),
            scope: 'GLOBAL'
        }
        saveMutation.mutate(workflowData)
    }

    const addTaskToCanvas = (task: any) => {
        const newNode: Node = {
            id: `node-${Date.now()}`,
            type: 'taskNode',
            position: { x: Math.random() * 400, y: Math.random() * 400 },
            data: {
                label: task.name,
                taskId: task.id,
                method: task.command.method,
                workerGroup: task.workerGroup || '',
                onChangeWorkerGroup: (val: string) => {
                    setNodes(nds => nds.map(node => node.id === newNode.id ? { ...node, data: { ...node.data, workerGroup: val } } : node))
                }
            },
        }
        setNodes((nds) => nds.concat(newNode))
    }

    if (isWfLoading) return <div className="p-8 text-center text-xl">Loading workflow...</div>

    return (
        <div className="flex flex-col h-[calc(100vh-160px)]">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold">Designer</h2>
                        <input
                            value={workflowName}
                            onChange={(e) => setWorkflowName(e.target.value)}
                            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-lg font-semibold w-64 focus:border-primary-500 outline-none"
                        />
                    </div>
                    <div className="h-8 w-px bg-gray-700" />
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">Default Group</span>
                        <input
                            value={workerGroup}
                            onChange={(e) => setWorkerGroup(e.target.value)}
                            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm font-mono w-40 focus:border-primary-500 outline-none"
                        />
                    </div>
                </div>
                <div className="space-x-2">
                    <button
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 px-4 py-2 rounded"
                    >
                        {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        onClick={() => alert('Execute requires a saved ID. Implementing workflow selection next.')}
                        className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
                    >
                        Run
                    </button>
                </div>
            </div>

            <div className="flex gap-4 flex-1">
                {/* Task Palette */}
                <div className="w-64 bg-gray-800 rounded-lg p-4 border border-gray-700 overflow-y-auto max-h-[600px]">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Available Tasks</h3>
                    <div className="space-y-2">
                        {tasks?.map((task: any) => (
                            <div
                                key={task.id}
                                onClick={() => addTaskToCanvas(task)}
                                className="bg-gray-700 hover:bg-gray-600 p-2 rounded cursor-pointer border border-gray-600 transition-colors"
                            >
                                <div className="text-[10px] text-primary-400 font-mono font-bold">{task.command.method}</div>
                                <div className="text-sm font-medium truncate">{task.name}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 bg-gray-900 rounded-lg border border-gray-700 relative overflow-hidden ring-1 ring-gray-800 shadow-2xl">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        fitView
                    >
                        <Controls />
                        <MiniMap
                            style={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                            nodeColor="#3b82f6"
                        />
                        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#374151" />
                    </ReactFlow>
                </div>
            </div>
        </div>
    )
}

export default WorkflowDesigner
