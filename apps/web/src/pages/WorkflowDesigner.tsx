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
    EdgeLabelRenderer,
    ReactFlowProvider,
    useReactFlow,
    Node,
    Handle,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import { workflowsApi } from '../api/workflows'
import { TaskEditShelf } from '../components/TaskEditShelf'
import { Network, Check, Send, RefreshCw, Trash2, Terminal, Activity, Pencil, Zap, Settings2, X } from 'lucide-react'
import { useDirtyState } from '../context/DirtyStateContext'
import { useToast } from '../context/ToastContext'

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
        if (data.taskType === 'VARIABLE') return <Zap size={18} className="text-yellow-400" fill="currentColor" />;
        switch (method) {
            case 'POST': return <Send size={14} className="text-blue-400" />;
            case 'PUT': return <RefreshCw size={14} className="text-yellow-400" />;
            case 'DELETE': return <Trash2 size={14} className="text-red-400" />;
            case 'GET': return <Activity size={14} className="text-green-400" />;
            default: return <Terminal size={14} className="text-gray-400" />;
        }
    }

    const isUtility = data.taskType === 'VARIABLE' || data.taskId === '00000000-0000-0000-0000-000000000001';
    return (
        <div style={{ 
            background: isUtility ? 'linear-gradient(135deg, #1e1b0a 0%, #111217 100%)' : '#111217', 
            border: isUtility ? '1px solid #ffcc00' : '1px solid #202226', 
            borderRadius: isUtility ? '24px' : '12px', 
            minWidth: isUtility ? '160px' : '240px',
            boxShadow: isUtility 
                ? '0 0 20px rgba(255, 204, 0, 0.15), 0 10px 15px -3px rgba(0, 0, 0, 0.4)' 
                : '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
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
                        <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#464c54', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{data.taskType === 'VARIABLE' ? 'UTILITY' : data.method}</div>
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
                    {!isUtility ? (
                        <>
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
                                <label style={{ fontSize: '9px', color: '#464c54', fontWeight: 'bold', textTransform: 'uppercase' }}>Status Override</label>
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
                                    <option value="FAILED">FAILED</option>
                                    <option value="SKIPPED">SKIPPED</option>
                                    <option value="SUCCESS">SUCCESS</option>
                                </select>
                            </div>
                        </>
                    ) : (
                        <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255, 204, 0, 0.2)', paddingTop: '10px' }}>
                             <div style={{ fontSize: '10px', color: '#ffcc00', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>
                                 {Object.keys(data.variableExtraction?.vars || {}).filter(k=>!k.startsWith('__')).length} VARIABLES DEFINED
                             </div>
                        </div>
                    )}
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

    const onRemove = (evt: any) => {
        evt.stopPropagation();
        setEdges((eds) => eds.filter((edge) => edge.id !== id));
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
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        fontSize: 12,
                        pointerEvents: 'all',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px'
                    }}
                    className="nodrag nopan"
                >
                    <div 
                         onClick={onEdgeClick}
                         style={{ 
                            background: color, 
                            color: 'white', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontSize: '9px', 
                            fontWeight: 800, 
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            userSelect: 'none'
                        }}
                    >
                        {label}
                    </div>
                    <button
                        onClick={onRemove}
                        style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: 'white',
                            border: `1px solid ${color}`,
                            color: color,
                            fontSize: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            padding: 0,
                            lineHeight: 1
                        }}
                        className="hover:bg-red-50 hover:text-red-600 hover:border-red-600 transition-colors"
                        title="Remove connection"
                    >
                        &times;
                    </button>
                </div>
            </EdgeLabelRenderer>
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
    setEdges,
    setIsDirty,
    onNodeClick,
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
            const isUtility = taskData.taskType === 'VARIABLE';
            const randomSuffix = Math.floor(100000 + Math.random() * 900000);
            const label = isUtility ? `${taskData.name} ${randomSuffix}` : taskData.name;

            const newNode: Node = {
                id: newNodeId,
                type: 'taskNode',
                position,
                data: {
                    id: newNodeId,
                    label: label,
                    taskId: taskData.id,
                    taskType: taskData.taskType || 'HTTP',
                    method: taskData.command?.method || (taskData.taskType === 'VARIABLE' ? 'VAR' : 'GET'),
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
                onNodeClick={(_, node) => onNodeClick(node)}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onEdgesDelete={(deletedEdges) => {
                    setEdges(eds => eds.filter(e => !deletedEdges.find(de => de.id === e.id)));
                    setIsDirty(true);
                }}
                onNodesDelete={(deletedNodes) => {
                    setNodes(nds => nds.filter(n => !deletedNodes.find(dn => dn.id === n.id)));
                    setIsDirty(true);
                }}
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
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [editingNode, setEditingNode] = useState<any>(null);
    const [isTopDrawerOpen, setIsTopDrawerOpen] = useState(false);
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
                    label: tasks?.find((t: any) => t.id === n.taskId)?.name || n.label,
                    taskId: n.taskId,
                    taskType: n.taskType || 'HTTP',
                    method: n.taskType === 'VARIABLE' ? 'VAR' : (tasks?.find((t: any) => t.id === n.taskId)?.command?.method || 'GET'),
                    targetTags: n.targetTags || [],
                    failureStrategy: n.failureStrategy || 'SUCCESS_REQUIRED',
                    failureStatusOverride: n.failureStatusOverride || 'FAILED',
                    variableExtraction: n.variableExtraction, // Carry over for utility tasks
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
            showToast('Workflow saved successfully!', 'success')
            queryClient.invalidateQueries({ queryKey: ['workflows'] })
            setIsDirty(false);
        },
        onError: (err: any) => showToast(`Save failed: ${err.message}`, 'error'),
    })

    const executeMutation = useMutation({
        mutationFn: (id: string) => workflowsApi.executeWorkflow(id),
        onSuccess: () => showToast('Workflow execution started!', 'success'),
    })

    const handleSave = () => {
        const workflowData = {
            name: workflowName,
            tags: workflowTags,
            nodes: nodes.map(n => ({
                id: n.id,
                taskId: n.data.taskId,
                taskType: n.data.taskType || 'HTTP',
                position: n.position,
                label: n.data.label,
                targetTags: n.data.targetTags || [],
                failureStrategy: n.data.failureStrategy || 'SUCCESS_REQUIRED',
                failureStatusOverride: n.data.failureStatusOverride || 'FAILED',
                variableExtraction: n.data.variableExtraction // Ensure utility task variables are saved
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
                        onClick={() => setIsTopDrawerOpen(!isTopDrawerOpen)}
                        style={{
                            padding: '8px 16px',
                            background: isTopDrawerOpen ? '#f05a28' : '#f9fafb',
                            color: isTopDrawerOpen ? 'white' : '#4b5563',
                            border: '1px solid #e5e7eb',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                        }}
                    >
                        <Settings2 size={16} />
                        Utility Toolbox
                    </button>

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

            {/* Top Drawer for Utilities */}
            {isTopDrawerOpen && (
                <div style={{ 
                    background: 'rgba(255, 255, 255, 0.8)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid #eee', 
                    borderRadius: '16px', 
                    padding: '20px', 
                    marginBottom: '10px',
                    display: 'flex',
                    gap: '20px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                    animation: 'slide-in-top 0.3s ease-out'
                }}>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>Workflow Utilities</h4>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div 
                                draggable
                                onDragStart={(e) => onDragStart(e, { id: 'util-vars', name: 'Variables Manipulation', taskType: 'VARIABLE' })}
                                style={{
                                    padding: '16px 24px',
                                    background: 'white',
                                    border: '2px dashed #ffcc00',
                                    borderRadius: '12px',
                                    cursor: 'grab',
                                    fontSize: '14px',
                                    color: '#856404',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s'
                                }}
                                className="hover:shadow-lg hover:border-solid hover:scale-105"
                            >
                                <Zap size={20} fill="#ffcc00" />
                                <div>
                                    <div style={{ fontSize: '14px' }}>Variables Manipulation</div>
                                    <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#999' }}>Transform & Store Data</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setIsTopDrawerOpen(false)} style={{ border: 'none', background: 'transparent', color: '#999', alignSelf: 'flex-start', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>
            )}

            {/* Main Area */}
            <div style={{ display: 'flex', flex: 1, gap: '24px', minHeight: 0 }}>
                
                {/* Palette */}
                <div style={{ width: '320px', background: 'white', borderRadius: '16px', border: '1px solid #eee', display: 'flex', flexDirection: 'column', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>Utility Actions</h3>
                        <div 
                            draggable
                            onDragStart={(e) => onDragStart(e, { id: 'util-vars', name: 'Variables Manipulation', taskType: 'VARIABLE' })}
                            style={{
                                padding: '12px',
                                background: '#fff9e6',
                                border: '1px solid #ffcc00',
                                borderRadius: '10px',
                                cursor: 'grab',
                                fontSize: '13px',
                                color: '#856404',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}
                        >
                            <Zap size={16} fill="currentColor" />
                            <span>Variables Manipulation</span>
                        </div>
                    </div>

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

                <ReactFlowCanvas
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={(changes: any) => { onNodesChange(changes); setIsDirty(true); }}
                    onEdgesChange={(changes: any) => { onEdgesChange(changes); setIsDirty(true); }}
                    onConnect={onConnect}
                    onNodeClick={(node: any) => setEditingNode(node)}
                    setNodes={setNodes}
                    setEdges={setEdges}
                    setIsDirty={setIsDirty}
                    reactFlowWrapper={reactFlowWrapper}
                />
            </div>

            {editingNode && (() => {
                // Calculate Upstream Variables
                const upstreamNodes: string[] = [];
                const queue = [editingNode.id];
                const visited = new Set();
                while (queue.length > 0) {
                    const currId = queue.shift();
                    if (visited.has(currId)) continue;
                    visited.add(currId);
                    edges.filter(e => e.target === currId).forEach(e => {
                        upstreamNodes.push(e.source);
                        queue.push(e.source);
                    });
                }
                const upstreamVarNames = nodes
                    .filter(n => upstreamNodes.includes(n.id))
                    .flatMap(n => {
                        const taskDef = tasks?.find((t: any) => t.id === n.data.taskId);
                        const vars = n.data.variableExtraction?.vars || (taskDef as any)?.variableExtraction?.vars || {};
                        return Object.keys(vars)
                            .filter(k => !k.startsWith('__'))
                            .map(name => ({ name, taskName: n.data.label || 'Task' }));
                    });

                const isUtil = editingNode.data.taskType === 'VARIABLE' || editingNode.data.taskId === '00000000-0000-0000-0000-000000000001';

                return (
                    <TaskEditShelf 
                        taskId={editingNode.data.taskId} 
                        nodeData={editingNode.data}
                        availableUpstreamVars={Array.from(new Set(upstreamVarNames))}
                        onClose={() => setEditingNode(null)}
                        onSaveNode={(newNodeData: any) => {
                            setNodes(nds => nds.map(n => n.id === editingNode.id ? { ...n, data: { ...n.data, ...newNodeData } } : n));
                            setIsDirty(true);
                            setEditingNode(null);
                        }}
                    />
                );
            })()}
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
