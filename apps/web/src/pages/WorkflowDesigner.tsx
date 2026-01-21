import { useCallback, useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    BackgroundVariant,
    Position,
    getBezierPath,
    EdgeText,
    ReactFlowProvider,
    useReactFlow,
    Node,
    Handle,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import { workflowsApi } from '../api/workflows'
import { Network, Check, Send, RefreshCw, Trash2, Terminal, Activity, Pencil } from 'lucide-react'
import { useDirtyState } from '../context/DirtyStateContext'

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
            position: 'relative'
        }} className="hover:border-primary-500/50 transition-all group">
            
            {/* Input Port (n8n flavor) - Now Blue and Larger */}
            <Handle
                type="target"
                position={Position.Left}
                style={{ 
                    background: '#3b82f6', 
                    width: '16px', 
                    height: '16px', 
                    border: '3px solid white',
                    left: '-10px',
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                    zIndex: 1000
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
                    {/* Delete Toggle */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            data.onDelete(data.id);
                        }}
                        style={{ 
                            background: 'transparent',
                            border: 'none',
                            color: '#464c54',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px'
                        }}
                        className="hover:bg-red-500/10 hover:text-red-500 transition-colors"
                        title="Remove task"
                    >
                        <Trash2 size={14} />
                    </button>
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
                            <option value="SUCCESS_REQUIRED">Stop On Failure</option>
                            <option value="CONTINUE_ON_FAIL">Continue On Failure</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '9px', color: '#464c54', fontWeight: 'bold', textTransform: 'uppercase' }}>Status on Failure</label>
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
                            value={data.failureStatusOverride || 'FAILED'}
                            onChange={(e) => data.onChangeFailureStatusOverride(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="FAILED">Failed (Default)</option>
                            <option value="MAJOR">Major</option>
                            <option value="MINOR">Minor</option>
                            <option value="WARNING">Warning</option>
                            <option value="INFORMATION">Information</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Output Port (n8n flavor) - Now Blue and Larger */}
            <Handle
                type="source"
                position={Position.Right}
                style={{ 
                    background: '#3b82f6', 
                    width: '16px', 
                    height: '16px', 
                    border: '3px solid white',
                    right: '-10px',
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                    zIndex: 1000
                }}
            />
        </div>
    )
}

function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
}: any) {
    const { setEdges } = useReactFlow();
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const condition = data?.condition || 'ALWAYS';
    const label = condition === 'ALWAYS' ? 'Run Always' : condition === 'ON_SUCCESS' ? 'On Success' : 'On Failure';
    const color = condition === 'ALWAYS' ? '#94a3b8' : condition === 'ON_SUCCESS' ? '#22c55e' : '#ef4444';

    const onEdgeClick = (evt: any) => {
        evt.stopPropagation();
        const nextCondition = condition === 'ALWAYS' ? 'ON_SUCCESS' : condition === 'ON_SUCCESS' ? 'ON_FAILURE' : 'ALWAYS';
        setEdges((eds) =>
            eds.map((edge) => {
                if (edge.id === id) {
                    return {
                        ...edge,
                        data: { ...edge.data, condition: nextCondition },
                        label: nextCondition === 'ALWAYS' ? '' : nextCondition.replace('ON_', ''),
                        style: { ...edge.style, stroke: nextCondition === 'ALWAYS' ? '#94a3b8' : nextCondition === 'ON_SUCCESS' ? '#22c55e' : '#ef4444' }
                    };
                }
                return edge;
            })
        );
    };

    return (
        <>
            <path
                id={id}
                style={{ ...style, stroke: color, strokeWidth: 2 }}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={markerEnd}
            />
            <EdgeText
                x={labelX}
                y={labelY}
                label={label}
                labelStyle={{ fill: 'white', fontWeight: 700, fontSize: 10 }}
                labelShowBg
                labelBgStyle={{ fill: color, rx: 4, ry: 4 }}
                labelBgPadding={[6, 4]}
                onClick={onEdgeClick}
                style={{ cursor: 'pointer' }}
                title={condition === 'ALWAYS' ? "Depends on previous task failure strategy" : ""}
            />
        </>
    );
}

const nodeTypes = {
    taskNode: N8nTaskNode,
}

const edgeTypes = {
    custom: CustomEdge,
}

function ReactFlowCanvas({ 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect, 
    setNodes,
    setIsDirty,
    reactFlowWrapper 
}: any) {
    const reactFlowInstance = useReactFlow();
    const projectRef = useRef<any>(null);

    useEffect(() => {
        if (reactFlowInstance?.project) {
            projectRef.current = reactFlowInstance.project;
        }
    }, [reactFlowInstance]);

    const onDragOver = useCallback((event: any) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: any) => {
            event.preventDefault();
            if (!projectRef.current) return;
            
            const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
            if (!reactFlowBounds) return;

            const taskDataStr = event.dataTransfer.getData('application/reactflow');
            if (!taskDataStr) return;
            const taskData = JSON.parse(taskDataStr);

            const position = projectRef.current({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            const newNodeId = `node-${Date.now()}`;
            const newNode: Node = {
                id: newNodeId,
                type: 'taskNode',
                position,
                data: {
                    id: newNodeId,
                    label: taskData.name,
                    taskId: taskData.id,
                    method: taskData.command?.method || 'GET',
                    targetTags: taskData.targetTags || [],
                    failureStrategy: 'SUCCESS_REQUIRED',
                    failureStatusOverride: 'FAILED',
                    onDelete: (id: string) => {
                        setNodes((nds: any) => nds.filter((node: any) => node.id !== id));
                        setIsDirty(true);
                    },
                    onChangeTargetTags: (val: string) => {
                        const tags = val.split(',').map((t: any) => t.trim()).filter(Boolean);
                        setNodes((nds: any) => nds.map((node: any) => node.id === newNodeId ? { ...node, data: { ...node.data, targetTags: tags } } : node))
                        setIsDirty(true);
                    },
                    onChangeFailureStrategy: (val: string) => {
                        setNodes((nds: any) => nds.map((node: any) => node.id === newNodeId ? { ...node, data: { ...node.data, failureStrategy: val } } : node))
                        setIsDirty(true);
                    },
                    onChangeFailureStatusOverride: (val: string) => {
                        setNodes((nds: any) => nds.map((node: any) => node.id === newNodeId ? { ...node, data: { ...node.data, failureStatusOverride: val } } : node))
                        setIsDirty(true);
                    }
                },
            };

            setNodes((nds: any) => nds.concat(newNode));
            setIsDirty(true);
        },
        [setNodes, setIsDirty, reactFlowWrapper]
    );

    return (
        <div ref={reactFlowWrapper} style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid #eee', position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                snapToGrid={true}
                snapGrid={[15, 15]}
            >
                <Background color="#1976D2" gap={25} size={1.5} variant={BackgroundVariant.Dots} style={{ opacity: 0.3 }} />
                <Controls style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
                <MiniMap 
                    style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} 
                    nodeColor="#1976D2"
                    maskColor="rgba(255, 255, 255, 0.7)"
                />
            </ReactFlow>
        </div>
    );
}

function WorkflowDesignerContent() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams()
    const workflowId = searchParams.get('id')
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
    const [workflowName, setWorkflowName] = useState('My Workflow')
    const [workflowTags, setWorkflowTags] = useState<string[]>(['default'])
    const { isDirty, setIsDirty, setShowDirtyModal, setPendingAction } = useDirtyState();
    const [searchQuery, setSearchQuery] = useState('');
    const queryClient = useQueryClient()
    const initializedRef = useRef<string | null>(null)
    const reactFlowWrapper = useRef<HTMLDivElement>(null)

    const { data: tasks, isLoading: isLoadingTasks } = useQuery({
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
                    id: n.id,
                    label: n.label,
                    taskId: n.taskId,
                    method: tasks?.find((t: any) => t.id === n.taskId)?.command?.method || 'GET',
                    targetTags: n.targetTags || [],
                    failureStrategy: n.failureStrategy || 'SUCCESS_REQUIRED',
                    failureStatusOverride: n.failureStatusOverride || 'FAILED',
                    onDelete: (id: string) => {
                        setNodes(nds => nds.filter(node => node.id !== id));
                        setIsDirty(true);
                    },
                    onChangeTargetTags: (val: string) => {
                        const tags = val.split(',').map(t => t.trim()).filter(Boolean);
                        setNodes(nds => nds.map(node => node.id === n.id ? { ...node, data: { ...node.data, targetTags: tags } } : node))
                        setIsDirty(true);
                    },
                    onChangeFailureStrategy: (val: string) => {
                        setNodes(nds => nds.map(node => node.id === n.id ? { ...node, data: { ...node.data, failureStrategy: val } } : node))
                        setIsDirty(true);
                    },
                    onChangeFailureStatusOverride: (val: string) => {
                        setNodes(nds => nds.map(node => node.id === n.id ? { ...node, data: { ...node.data, failureStatusOverride: val } } : node))
                        setIsDirty(true);
                    }
                }
            })))
            setEdges(existingWorkflow.edges.map((e: any) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                type: 'custom',
                data: { condition: e.condition || 'ALWAYS' },
                animated: true,
                style: { 
                    stroke: (e.condition === 'ON_SUCCESS' ? '#22c55e' : e.condition === 'ON_FAILURE' ? '#ef4444' : '#94a3b8'), 
                    strokeWidth: 2 
                },
            })))
            setTimeout(() => setIsDirty(false), 50); // Small delay to prevent initial load marking as dirty
        }
    }, [existingWorkflow, tasks])

    useEffect(() => {
        const handleSaveRequest = () => {
            handleSave();
        };
        window.addEventListener('DESIGNER_SAVE_REQUESTED', handleSaveRequest);
        
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (isDirty) {
                event.preventDefault();
                event.returnValue = ''; // Standard for browser prompts
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('DESIGNER_SAVE_REQUESTED', handleSaveRequest);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty, nodes, edges, workflowName, workflowTags]);

    const onConnect = useCallback(
        (params: Connection) => {
            setEdges((eds) => addEdge({ 
                ...params, 
                type: 'custom',
                data: { condition: 'ALWAYS' },
                animated: true, 
                style: { stroke: '#94a3b8', strokeWidth: 2 } 
            }, eds));
            setIsDirty(true);
        },
        [setEdges],
    )

    const saveMutation = useMutation({
        mutationFn: (data: any) => workflowId
            ? workflowsApi.updateWorkflow(workflowId, data)
            : workflowsApi.createWorkflow(data),
        onSuccess: () => {
            alert('Workflow saved!')
            queryClient.invalidateQueries({ queryKey: ['workflows'] })
            setIsDirty(false);
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
                failureStrategy: n.data.failureStrategy || 'SUCCESS_REQUIRED',
                failureStatusOverride: n.data.failureStatusOverride || 'FAILED'
            })),
            edges: edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                condition: e.data?.condition || 'ALWAYS'
            })),
            scope: 'GLOBAL'
        }
        saveMutation.mutate(workflowData)
    }

    const handleCancel = () => {
        if (isDirty) {
            setShowDirtyModal(true);
            setPendingAction(() => () => navigate('/'));
        } else {
            navigate('/');
        }
    };

    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ 'Global': true })

    const groupedTasks = (() => {
        const grouped: Record<string, any[]> = {}
        const filtered = tasks?.filter((t: any) => {
            const name = t.name?.toLowerCase() ?? '';
            const label = t.label?.toLowerCase() ?? '';
            const method = t.command?.method?.toLowerCase() ?? '';
            const q = searchQuery.toLowerCase();
            return name.includes(q) || label.includes(q) || method.includes(q);
        });
        filtered?.forEach((t: any) => {
            const tg = t.groups || []
            if (tg.length === 0) {
                if (!grouped['Global']) grouped['Global'] = []
                grouped['Global'].push(t)
            } else {
                tg.forEach((g: any) => {
                    const name = typeof g === 'string' ? g : g.name
                    if (!grouped[name]) grouped[name] = []
                    grouped[name].push(t)
                })
            }
        })
        return grouped
    })()

    const onDragStart = (event: any, task: any) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(task));
        event.dataTransfer.effectAllowed = 'move';
    };

    const isTaskInWorkflow = (taskId: string) => nodes.some(n => n.data.taskId === taskId)

    if (isWfLoading || !tasks) return <div style={{ color: '#1976D2', textAlign: 'center', padding: '100px', fontWeight: 'bold' }}>Initialising Designer Engine...</div>

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
            
            {/* Top Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '16px 24px', borderRadius: '16px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(25,118,210,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(25,118,210,0.2)' }}>
                            <Network style={{ color: '#1976D2' }} size={20} />
                        </div>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                value={workflowName}
                                onChange={(e) => { setWorkflowName(e.target.value); setIsDirty(true); }}
                                style={{ background: 'transparent', border: 'none', color: '#111827', fontSize: '20px', fontWeight: 'bold', outline: 'none', width: '250px' }}
                            />
                            <Pencil size={14} color="#999" />
                        </div>
                    </div>
                    <div style={{ height: '32px', width: '1px', background: '#eee' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase', letterSpacing: '1px' }}>Global Targeting Group</span>
                        <input
                            value={workflowTags.join(', ')}
                            onChange={(e) => { setWorkflowTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean)); setIsDirty(true); }}
                            style={{ background: '#f9fafb', border: '1px solid #eee', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: '#1976D2', outline: 'none', width: '150px', fontWeight: 'bold' }}
                            placeholder="e.g. prod, linux"
                        />
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {isDirty && (
                        <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
                            <div className="animate-pulse" style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '50%' }} />
                            Unsaved Changes
                        </div>
                    )}
                    <button 
                        onClick={handleCancel}
                        style={{ background: 'transparent', border: '1px solid #ddd', color: '#6b7280', padding: '8px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        style={{ background: 'white', border: '1px solid #ddd', color: '#374151', padding: '8px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                    >
                        Save Workflow
                    </button>
                    <button 
                        onClick={() => workflowId && executeMutation.mutate(workflowId)}
                        disabled={!workflowId}
                        style={{ background: '#1976D2', color: '#fff', border: 'none', padding: '8px 28px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: workflowId ? 1 : 0.5, fontSize: '13px', boxShadow: '0 4px 6px rgba(25,118,210,0.2)' }}
                    >
                        Run Now
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div style={{ display: 'flex', flex: 1, gap: '24px', minHeight: 0 }}>
                
                {/* Palette */}
                <div style={{ width: '320px', background: 'white', borderRadius: '16px', border: '1px solid #eee', display: 'flex', flexDirection: 'column', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Task Library</h3>
                        <p style={{ fontSize: '11px', color: '#666' }}>Drag & drop tasks onto the canvas.</p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type="text"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    paddingLeft: '32px',
                                    borderRadius: '8px',
                                    border: '1px solid #eee',
                                    fontSize: '13px',
                                    background: '#f9f9f9',
                                    outline: 'none'
                                }}
                            />
                            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}>
                                <Network size={14} />
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {isLoadingTasks ? (
                            <div style={{ color: '#999', fontSize: '12px' }}>Loading tasks library...</div>
                        ) : (
                            Object.entries(groupedTasks).sort(([a], [b]) => a === 'Global' ? -1 : b === 'Global' ? 1 : a.localeCompare(b)).map(([groupName, groupTasks]: [string, any]) => (
                                <div key={groupName} style={{ marginBottom: '24px' }}>
                                    <div 
                                        onClick={() => setExpandedFolders(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            padding: '8px 0',
                                            borderBottom: '1px solid #f0f0f0',
                                            marginBottom: '12px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '14px' }}>{groupName === 'Global' ? '🌐' : '📁'}</span>
                                            <span style={{ fontSize: '12px', fontWeight: 900, color: '#333', textTransform: 'uppercase', letterSpacing: '1px' }}>{groupName}</span>
                                        </div>
                                        <span style={{ color: '#ccc', fontSize: '10px' }}>{expandedFolders[groupName] ? '▼' : '▶'}</span>
                                    </div>
                                    
                                    {(expandedFolders[groupName] || searchQuery.length > 0) && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {groupTasks.map((task: any) => {
                                                const selected = isTaskInWorkflow(task.id);
                                                return (
                                                    <div
                                                        key={task.id}
                                                        draggable
                                                        onDragStart={(event) => onDragStart(event, task)}
                                                        style={{
                                                            padding: '12px',
                                                            background: selected ? '#f0f7ff' : '#fafafa',
                                                            border: `1px solid ${selected ? '#1976D2' : '#eee'}`,
                                                            borderRadius: '10px',
                                                            cursor: 'grab',
                                                            fontSize: '13px',
                                                            color: '#333',
                                                            fontWeight: '600',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!selected) {
                                                                e.currentTarget.style.background = '#f9fafb';
                                                                e.currentTarget.style.transform = 'translateX(4px)';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (!selected) {
                                                                e.currentTarget.style.background = '#fafafa';
                                                                e.currentTarget.style.transform = 'translateX(0)';
                                                            }
                                                        }}
                                                    >
                                                        <div style={{ 
                                                            width: '8px', 
                                                            height: '8px', 
                                                            borderRadius: '50%', 
                                                            background: task.command?.method === 'POST' ? '#1976D2' : task.command?.method === 'DELETE' ? '#dc2626' : '#22c55e',
                                                            boxShadow: selected ? '0 0 8px rgba(25,118,210,0.4)' : 'none'
                                                        }} />
                                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</span>
                                                        {selected && <Check size={12} color="#1976D2" strokeWidth={3} />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Canvas Area - White Background with Dots */}
                <ReactFlowCanvas
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={(changes: any) => { onNodesChange(changes); setIsDirty(true); }}
                    onEdgesChange={(changes: any) => { onEdgesChange(changes); setIsDirty(true); }}
                    onConnect={onConnect}
                    setNodes={setNodes}
                    setIsDirty={setIsDirty}
                    reactFlowWrapper={reactFlowWrapper}
                />
            </div>
        </div>
    )
}

export default function WorkflowDesigner() {
    return (
        <ReactFlowProvider>
            <WorkflowDesignerContent />
        </ReactFlowProvider>
    );
}
