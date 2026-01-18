import { useCallback, useState, useEffect, useRef } from 'react'
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
    Handle,
    Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import { workflowsApi } from '../api/workflows'
import { Network, Check, Send, RefreshCw, Trash2, Terminal, Activity } from 'lucide-react'

const initialNodes: Node[] = []
const initialEdges: any[] = []

/**
 * n8n-Style Task Node
 * - Input on Left
 * - Output on Right
 * - Distinct color-coded icons
 */
function N8nTaskNode({ data }: any) {
    const getIcon = () => {
        const method = data.method?.toUpperCase() || 'GET'
        switch (method) {
            case 'POST': return <Send size={14} className="text-blue-400" />;
            case 'PUT': return <RefreshCw size={14} className="text-yellow-400" />;
            case 'DELETE': return <Trash2 size={14} className="text-red-400" />;
            case 'GET': return <Activity size={14} className="text-green-400" />;
            default: return <Terminal size={14} className="text-gray-400" />;
        }
    }

    return (
        <div style={{ 
            background: '#111217', 
            border: '1px solid #202226', 
            borderRadius: '12px', 
            minWidth: '240px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
            position: 'relative'
        }} className="hover:border-primary-500/50 transition-all group">
            
            {/* Input Port (n8n flavor) */}
            <Handle
                type="target"
                position={Position.Left}
                style={{ 
                    background: '#f05a28', 
                    width: '10px', 
                    height: '10px', 
                    border: '2px solid #111217',
                    left: '-6px'
                }}
            />

            {/* Node Content */}
            <div style={{ padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', borderBottom: '1px solid #202226', paddingBottom: '8px' }}>
                    <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        background: '#0b0c10', 
                        borderRadius: '8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid #202226'
                    }}>
                        {getIcon()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#464c54', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{data.method}</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f2f5f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.label}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '9px', color: '#464c54', fontWeight: 'bold', textTransform: 'uppercase' }}>Target Tags</label>
                        <input
                            style={{ 
                                background: '#0b0c10', 
                                border: '1px solid #202226', 
                                borderRadius: '6px', 
                                padding: '4px 8px', 
                                fontSize: '11px', 
                                color: '#f05a28',
                                outline: 'none',
                                width: '100%'
                            }}
                            className="focus:border-primary-500 shadow-inner"
                            defaultValue={data.targetTags?.join(', ') || ''}
                            onChange={(e) => data.onChangeTargetTags(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="e.g. gpu, high-mem"
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '9px', color: '#464c54', fontWeight: 'bold', textTransform: 'uppercase' }}>Failure Strategy</label>
                        <select
                            style={{ 
                                background: '#0b0c10', 
                                border: '1px solid #202226', 
                                borderRadius: '6px', 
                                padding: '4px 4px', 
                                fontSize: '10px', 
                                color: '#d8d9da',
                                outline: 'none',
                                width: '100%',
                                cursor: 'pointer'
                            }}
                            className="focus:border-primary-500"
                            value={data.failureStrategy || 'SUCCESS_REQUIRED'}
                            onChange={(e) => data.onChangeFailureStrategy(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="SUCCESS_REQUIRED">Success Required To Continue</option>
                            <option value="CONTINUE_ON_FAIL">Continue On Failure</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Output Port (n8n flavor) */}
            <Handle
                type="source"
                position={Position.Right}
                style={{ 
                    background: '#f05a28', 
                    width: '10px', 
                    height: '10px', 
                    border: '2px solid #111217',
                    right: '-6px'
                }}
            />
        </div>
    )
}

const nodeTypes = {
    taskNode: N8nTaskNode,
}

function WorkflowDesigner() {
    const [searchParams] = useSearchParams()
    const workflowId = searchParams.get('id')
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
    const [workflowName, setWorkflowName] = useState('My Workflow')
    const [workflowTags, setWorkflowTags] = useState<string[]>(['default'])
    const queryClient = useQueryClient()
    const initializedRef = useRef<string | null>(null)

    const { data: tasks } = useQuery({
        queryKey: ['tasks'],
        queryFn: tasksApi.getTasks,
    })

    const { data: existingWorkflow, isLoading: isWfLoading } = useQuery({
        queryKey: ['workflow', workflowId],
        queryFn: () => workflowsApi.getWorkflow(workflowId!),
        enabled: !!workflowId,
    })

    useEffect(() => {
        if (existingWorkflow && initializedRef.current !== workflowId) {
            // Only set state when the workflow ID changes or it's the first load
            setWorkflowName(existingWorkflow.name)
            setWorkflowTags(existingWorkflow.tags || ['default'])
            initializedRef.current = workflowId
            
            setNodes(existingWorkflow.nodes.map((n: any) => ({
                id: n.id,
                type: 'taskNode',
                position: n.position,
                data: {
                    label: n.label,
                    taskId: n.taskId,
                    method: tasks?.find((t: any) => t.id === n.taskId)?.command?.method || 'GET',
                    targetTags: n.targetTags || [],
                    failureStrategy: n.failureStrategy || 'SUCCESS_REQUIRED',
                    onChangeTargetTags: (val: string) => {
                        const tags = val.split(',').map(t => t.trim()).filter(Boolean);
                        setNodes(nds => nds.map(node => node.id === n.id ? { ...node, data: { ...node.data, targetTags: tags } } : node))
                    },
                    onChangeFailureStrategy: (val: string) => {
                        setNodes(nds => nds.map(node => node.id === n.id ? { ...node, data: { ...node.data, failureStrategy: val } } : node))
                    }
                }
            })))
            setEdges(existingWorkflow.edges.map((e: any) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                animated: true,
                style: { stroke: '#464c54', strokeWidth: 2 },
            })))
        }
    }, [existingWorkflow, tasks])

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#464c54', strokeWidth: 2 } }, eds)),
        [setEdges],
    )

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
            tags: workflowTags,
            nodes: nodes.map(n => ({
                id: n.id,
                taskId: n.data.taskId,
                position: n.position,
                label: n.data.label,
                targetTags: n.data.targetTags || [],
                failureStrategy: n.data.failureStrategy || 'SUCCESS_REQUIRED'
            })),
            edges: edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                condition: 'ON_SUCCESS'
            })),
            scope: 'GLOBAL'
        }
        saveMutation.mutate(workflowData)
    }

    const isTaskInWorkflow = (taskId: string) => nodes.some(n => n.data.taskId === taskId)

    const toggleTaskSelection = (task: any) => {
        if (isTaskInWorkflow(task.id)) {
            const nodeToRemove = nodes.find(n => n.data.taskId === task.id)
            if (nodeToRemove) {
                setNodes(nds => nds.filter(n => n.id !== nodeToRemove.id))
                setEdges(eds => eds.filter(e => e.source !== nodeToRemove.id && e.target !== nodeToRemove.id))
            }
        } else {
            addTaskToCanvas(task)
        }
    }

    const addTaskToCanvas = (task: any) => {
        const newNodeId = `node-${Date.now()}`
        const newNode: Node = {
            id: newNodeId,
            type: 'taskNode',
            position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
            data: {
                label: task.name,
                taskId: task.id,
                method: task.command?.method || 'GET',
                targetTags: task.targetTags || [],
                failureStrategy: 'SUCCESS_REQUIRED',
                onChangeTargetTags: (val: string) => {
                    const tags = val.split(',').map(t => t.trim()).filter(Boolean);
                    setNodes(nds => nds.map(node => node.id === newNodeId ? { ...node, data: { ...node.data, targetTags: tags } } : node))
                },
                onChangeFailureStrategy: (val: string) => {
                    setNodes(nds => nds.map(node => node.id === newNodeId ? { ...node, data: { ...node.data, failureStrategy: val } } : node))
                }
            },
        }
        setNodes((nds) => nds.concat(newNode))
    }

    if (isWfLoading) return <div style={{ color: '#fff', textAlign: 'center', padding: '100px' }}>Loading...</div>

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
            
            {/* Top Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(240,90,40,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifySelf: 'center', border: '1px solid rgba(240,90,40,0.2)' }}>
                            <Network style={{ color: '#f05a28', margin: 'auto' }} size={20} />
                        </div>
                        <input
                            value={workflowName}
                            onChange={(e) => setWorkflowName(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#f2f5f5', fontSize: '24px', fontWeight: 'bold', outline: 'none', width: '300px' }}
                        />
                    </div>
                    <div style={{ height: '32px', width: '1px', background: '#202226' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#464c54', textTransform: 'uppercase' }}>Default Group</span>
                        <input
                            value={workflowTags.join(', ')}
                            onChange={(e) => setWorkflowTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                            style={{ background: '#111217', border: '1px solid #202226', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', color: '#f05a28', outline: 'none', width: '150px' }}
                        />
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={handleSave}
                        style={{ background: '#1e2023', border: '1px solid #202226', color: '#d8d9da', padding: '8px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Save
                    </button>
                    <button 
                        onClick={() => workflowId && executeMutation.mutate(workflowId)}
                        disabled={!workflowId}
                        style={{ background: '#f05a28', color: '#fff', border: 'none', padding: '8px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: workflowId ? 1 : 0.5 }}
                    >
                        Run Now
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div style={{ display: 'flex', flex: 1, gap: '24px', minHeight: 0 }}>
                
                {/* Palette */}
                <div style={{ width: '300px', background: '#111217', borderRadius: '16px', border: '1px solid #202226', display: 'flex', flexDirection: 'column', padding: '20px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 'bold', color: '#464c54', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Task Library</h3>
                    
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {(() => {
                            const grouped: Record<string, any[]> = {}
                            tasks?.forEach((t: any) => {
                                const tg = t.groups || []
                                if (tg.length === 0) {
                                    if (!grouped['Global']) grouped['Global'] = []
                                    grouped['Global'].push(t)
                                } else {
                                    tg.forEach((g: any) => {
                                        if (!grouped[g.name]) grouped[g.name] = []
                                        grouped[g.name].push(t)
                                    })
                                }
                            })

                            return Object.entries(grouped).sort(([a], [b]) => a === 'Global' ? -1 : b === 'Global' ? 1 : a.localeCompare(b)).map(([groupName, groupTasks]) => (
                                <div key={groupName} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#f05a28', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.6 }}>
                                        <div style={{ height: '1px', flex: 1, background: 'rgba(240,90,40,0.1)' }} />
                                        {groupName}
                                        <div style={{ height: '1px', flex: 1, background: 'rgba(240,90,40,0.1)' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {groupTasks.map((task: any) => {
                                            const selected = isTaskInWorkflow(task.id)
                                            return (
                                                <div 
                                                    key={task.id}
                                                    onClick={() => toggleTaskSelection(task)}
                                                    style={{ 
                                                        padding: '10px 12px', 
                                                        background: selected ? 'rgba(240,90,40,0.05)' : '#0b0c10', 
                                                        border: `1px solid ${selected ? '#f05a28' : '#202226'}`, 
                                                        borderRadius: '10px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{ 
                                                        width: '18px', 
                                                        height: '18px', 
                                                        borderRadius: '4px', 
                                                        background: selected ? '#f05a28' : 'transparent',
                                                        border: `1px solid ${selected ? '#f05a28' : '#202226'}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        {selected && <Check size={10} color="#fff" strokeWidth={4} />}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: selected ? '#fff' : '#d8d9da', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.name}</div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))
                        })()}
                    </div>
                </div>

                {/* Canvas Area */}
                <div style={{ flex: 1, background: '#0b0c10', borderRadius: '16px', border: '1px solid #202226', position: 'relative', overflow: 'hidden' }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        fitView
                        snapToGrid={true}
                        snapGrid={[15, 15]}
                    >
                        <Background color="#1c1d21" gap={20} size={1} variant={BackgroundVariant.Dots} />
                        <Controls style={{ background: '#111217', border: '1px solid #202226', borderRadius: '8px' }} />
                        <MiniMap 
                            style={{ background: '#111217', border: '1px solid #202226', borderRadius: '12px' }} 
                            nodeColor="#f05a28"
                            maskColor="rgba(11, 12, 16, 0.7)"
                        />
                    </ReactFlow>
                </div>
            </div>
        </div>
    )
}

export default WorkflowDesigner
