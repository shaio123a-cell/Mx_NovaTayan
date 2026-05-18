import { useMemo, useState, useEffect } from 'react'
import ReactFlow, {
    Background,
    Controls,
    Handle,
    Position,
    Node,
    Edge,
    BackgroundVariant,
    getBezierPath,
    EdgeText,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Terminal, Clock, AlertTriangle, UserX, CheckCircle, Play, MoreVertical, Settings, Eye, AlertCircle, Zap, Layers, GitBranch, Shield, RefreshCcw, Sparkles } from 'lucide-react'

/**
 * Node color mapping based on status
 */
const getStatusStyles = (status: string) => {
    switch (status) {
        case 'SUCCESS': return { bg: '#064e3b', border: '#10b981', icon: <CheckCircle size={14} className="text-green-400" /> };
        case 'FAILED': return { bg: '#450a0a', border: '#ef4444', icon: <AlertTriangle size={14} className="text-red-400" /> };
        case 'MAJOR': return { bg: '#4d1b0d', border: '#f97316', icon: <AlertTriangle size={14} className="text-orange-500" /> };
        case 'MINOR': return { bg: '#3f2e06', border: '#fbbf24', icon: <AlertTriangle size={14} className="text-yellow-500" /> };
        case 'WARNING': return { bg: '#3f2e06', border: '#fbbf24', icon: <AlertCircle size={14} className="text-yellow-400" /> };
        case 'INFORMATION': return { bg: '#0c2159', border: '#3b82f6', icon: <Eye size={14} className="text-blue-400" /> };
        case 'TIMEOUT': return { bg: '#450a0a', border: '#f97316', icon: <Clock size={14} className="text-orange-400" /> };
        case 'NO_WORKER_FOUND': return { bg: '#1c1d21', border: '#464c54', icon: <UserX size={14} className="text-gray-400" /> };
        case 'RUNNING': return { bg: '#1e3a8a', border: '#3b82f6', icon: <Play size={14} className="text-blue-400 animate-pulse" /> };
        case 'PENDING': return { bg: '#2e1907', border: '#eab308', icon: <Clock size={14} className="text-yellow-600" /> };
        case 'BYPASSED': return { bg: '#1c1d21', border: '#464c54', icon: <UserX size={14} className="text-gray-500 opacity-50" /> };
        default: return { bg: '#111217', border: '#202226', icon: <Terminal size={14} className="text-gray-400" /> };
    }
}

function ExecutionNode({ data }: any) {
    const isUtility = data.taskType === 'VARIABLE';
    const isWorkflow = data.taskType === 'WORKFLOW';
    const { bg, border, icon } = getStatusStyles(data.status);
    
    const isIfNode = data.taskType === 'IF';
    const isMcp = data.taskType === 'MCP_CLIENT';
    
    const renderIcon = () => {
        if (isIfNode) return <GitBranch size={14} className="text-amber-400" />;
        if (isUtility) return <Zap size={14} className="text-yellow-400" fill="currentColor" />;
        if (isWorkflow) return <Layers size={14} className="text-white" />;
        if (isMcp) return <Sparkles size={14} className="text-fuchsia-400" />;
        return icon;
    };

    const isEditing = data.isEditing;
    
    return (
        <div 
            style={{ 
                minWidth: isIfNode ? '120px' : (isUtility ? '180px' : '240px'),
                width: isIfNode ? '120px' : 'auto',
                height: isIfNode ? '120px' : 'auto',
                position: 'relative',
                opacity: data.status === 'BYPASSED' ? 0.3 : (data.status ? 1 : 0.5),
                filter: data.status === 'BYPASSED' ? 'grayscale(1)' : 'none',
                transition: 'all 0.2s',
                transform: isEditing ? 'scale(1.05)' : 'scale(1)',
                zIndex: isEditing ? 50 : 1,
                background: 'transparent',
                backgroundColor: 'transparent',
                border: 'none',
                boxShadow: 'none'
            }}
            className="group"
        >
            {/* Shaped Background Layers */}
            {/* Border Layer */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: isIfNode ? '#f59e0b' : (isMcp ? (isEditing ? '#f05a28' : '#d946ef') : (isWorkflow ? '#32a895' : (isUtility ? (isEditing ? '#f05a28' : '#ffcc00') : (isEditing ? '#f05a28' : border)))),
                clipPath: isIfNode
                    ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                    : (isMcp 
                        ? 'polygon(15px 0%, 100% 0%, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0% 100%, 0% 15px)'
                        : (isUtility 
                            ? 'none' 
                            : (isWorkflow ? 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)' : 'none'))),
                borderRadius: (isIfNode || isMcp) ? '0' : (isUtility ? '999px' : (isWorkflow ? '0' : '12px')),
                zIndex: 0
            }} />
            
            {/* Fill Layer */}
            <div style={{
                position: 'absolute',
                inset: '1.5px', // Border width
                background: isIfNode ? '#111217' : (isMcp ? 'linear-gradient(135deg, #4a044e 0%, #111217 100%)' : (isWorkflow ? 'linear-gradient(135deg, #032cfc 0%, #021a99 100%)' : (isUtility ? 'linear-gradient(135deg, #1e1b0a 0%, #111217 100%)' : bg))),
                clipPath: isIfNode
                    ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                    : (isMcp 
                        ? 'polygon(15px 0%, 100% 0%, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0% 100%, 0% 15px)'
                        : (isUtility 
                            ? 'none' 
                            : (isWorkflow ? 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)' : 'none'))),
                borderRadius: (isIfNode || isMcp) ? '0' : (isUtility ? '999px' : (isWorkflow ? '0' : '11px')),
                zIndex: 1
            }} />
            
            {/* Drop Shadow Wrapper (Non-clipped) */}
            <div style={{
                position: 'absolute',
                inset: 0,
                filter: isEditing 
                    ? 'drop-shadow(0 0 10px rgba(240, 90, 40, 0.4))' 
                    : 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.4))',
                zIndex: -1,
                pointerEvents: 'none'
            }} />

            <Handle type="target" position={Position.Left} style={{ visibility: 'hidden', zIndex: 10 }} />
            
            <div style={{ 
                padding: isIfNode ? '15px 10px' : (isUtility ? '12px 24px' : '12px'), 
                position: 'relative', 
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: isIfNode ? 'center' : 'stretch',
                justifyContent: isIfNode ? 'center' : 'flex-start',
                height: '100%',
                textAlign: isIfNode ? 'center' : 'left'
            }}>
                <div style={{ 
                    display: 'flex', 
                    flexDirection: isIfNode ? 'column' : 'row',
                    alignItems: 'center', 
                    gap: '8px', 
                    marginBottom: '8px' 
                }}>
                    <div style={{ 
                        width: isIfNode ? '24px' : '32px', 
                        height: isIfNode ? '24px' : '32px', 
                        background: 'rgba(0,0,0,0.3)', 
                        borderRadius: isUtility ? '50%' : (isWorkflow ? '0' : '8px'), 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: isUtility ? '1px solid rgba(255,204,0,0.2)' : '1px solid rgba(255,255,255,0.05)',
                    }}>
                        {renderIcon()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: isIfNode ? '11px' : '13px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isIfNode ? '80px' : 'none' }}>{data.label}</div>
                        <div style={{ 
                            fontSize: '9px', 
                            fontWeight: 'bold', 
                            color: data.isRetrying ? '#f59e0b' : (isMcp ? '#d946ef' : (isWorkflow ? '#fff' : (isIfNode ? (data.status === 'BRANCHED' ? '#ef4444' : '#f59e0b') : border))), 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.05em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            {data.isRetrying && <RefreshCcw size={8} className="animate-spin" />}
                            {data.isRetrying ? 'Retrying...' : (data.status === 'BRANCHED' ? (data.branchResult || 'BRANCHED') : (data.status || 'NOT REACHED'))}
                            {!data.isRetrying && data.retryAttempt > 0 && (
                                <span className="opacity-60">
                                    [{data.retryAttempt} of {data.maxAttempts || 1}]
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {!isIfNode && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                            {!isUtility && !isWorkflow && !isMcp && data.httpStatus ? (
                                <span style={{ color: data.httpStatus < 300 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>HTTP {data.httpStatus}</span>
                            ) : (isUtility ? <span style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: '10px' }}>⚡ VMA LOGIC</span> : (isWorkflow ? <span style={{ color: '#fff', fontWeight: 'bold' }}>NESTED WF</span> : (isMcp ? <span style={{ color: '#d946ef', fontWeight: 'bold', fontSize: '10px' }}>✨ AI TOOL</span> : '---')))}
                        </div>
                        {data.duration && (
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Clock size={10} /> {data.duration}ms
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 3-Dots Menu Button */}
            <div 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    data.onInspect(data.id);
                }}
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    padding: '6px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: 'rgba(255,255,255,0.8)',
                    background: 'rgba(0,0,0,0.2)',
                    zIndex: 20
                }}
                className="hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
            >
                <Eye size={14} />
            </div>

            <Handle type="source" position={Position.Right} style={{ visibility: 'hidden', zIndex: 10 }} />
        </div>
    )
}

function ExecutionEdge({
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
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const condition = data?.condition || 'ALWAYS';
    const labelMapping: Record<string, string> = {
        'ALWAYS': 'Run Always',
        'ON_SUCCESS': 'On Success',
        'ON_FAILURE': 'On Failure',
        'ON_THEN': 'IF TRUE (THEN)',
        'ON_ELSE': 'IF FALSE (ELSE)'
    };
    const label = labelMapping[condition] || condition;
    
    const colorMapping: Record<string, string> = {
        'ON_SUCCESS': '#10b981',
        'ON_THEN': '#22c55e',
        'ON_FAILURE': '#ef4444',
        'ON_ELSE': '#ef4444',
        'ALWAYS': '#3b82f6'
    };
    const color = data?.isActive 
        ? (colorMapping[condition] || '#3b82f6')
        : '#2d2e35';

    return (
        <>
            <path
                id={id}
                style={{ ...style, stroke: color, strokeWidth: data?.isActive ? 3 : 2, opacity: data?.isActive ? 1 : 0.3 }}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={markerEnd}
            />
            <EdgeText
                x={labelX}
                y={labelY}
                label={label}
                labelStyle={{ fill: 'white', fontWeight: 700, fontSize: 9 }}
                labelShowBg
                labelBgStyle={{ fill: color, rx: 4, ry: 4, opacity: data?.isActive ? 1 : 0.4 }}
                labelBgPadding={[4, 2]}
            />
        </>
    );
}

function TryZoneExecutionNode({ data }: any) {
    const { bg, border } = getStatusStyles(data.status);
    
    const isRunning = data.status === 'RUNNING';
    const isSuccess = data.status === 'SUCCESS';
    const isFailed = data.status === 'FAILED';
    const isPending = data.status === 'PENDING';

    const getZoneBackground = () => {
        if (isRunning) return 'rgba(59, 130, 246, 0.08)';
        if (isSuccess) return 'rgba(16, 185, 129, 0.04)';
        if (isFailed) return 'rgba(239, 68, 68, 0.04)';
        return 'rgba(255, 255, 255, 0.02)';
    };

    const getZoneBorder = () => {
        if (isRunning) return '#3b82f6';
        if (isSuccess) return '#10b981';
        if (isFailed) return '#ef4444';
        return '#464c54';
    };

    return (
        <div 
            style={{ 
                width: '100%', 
                height: '100%', 
                background: getZoneBackground(),
                border: `2px dashed ${getZoneBorder()}`,
                borderRadius: '24px',
                position: 'relative',
                pointerEvents: 'none',
                transition: 'all 0.5s ease-in-out',
                ...(isRunning && {
                    animation: 'pulse-blue 4s infinite alternate'
                })
            }}
        >
            {isRunning && (
                <style>
                    {`
                    @keyframes pulse-blue {
                        0% { background-color: rgba(59, 130, 246, 0.05); }
                        100% { background-color: rgba(59, 130, 246, 0.15); }
                    }
                    `}
                </style>
            )}
            <div 
                style={{
                    position: 'absolute',
                    top: '-24px',
                    left: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '2px 14px',
                    background: getZoneBorder(),
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    borderRadius: '8px 8px 0 0',
                    pointerEvents: 'all',
                    boxShadow: '0 -4px 10px rgba(0,0,0,0.1)'
                }}
            >
                <Zap size={10} fill="white" />
                <span>{data.label || 'Try Block'}</span>
                {data.retryAttempt > 0 && (
                    <div style={{ marginLeft: '8px', background: '#f59e0b', color: '#451a03', padding: '0 8px', borderRadius: '4px', fontSize: '8px', fontWeight: '900' }}>
                        RETRY {data.retryAttempt} OF {data.maxAttempts || 1}
                    </div>
                )}
                <div style={{ marginLeft: '8px', opacity: 0.8, fontSize: '9px', fontWeight: 'bold' }}>{data.status || 'READY'}</div>
            </div>

            <div 
                onClick={(e) => { e.stopPropagation(); data.onInspect(data.id); }}
                style={{ position: 'absolute', top: '8px', right: '8px', pointerEvents: 'all', cursor: 'pointer', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', padding: '4px' }}
            >
                <Eye size={12} className="text-white" />
            </div>

            <Handle type="source" position={Position.Bottom} id="catch" style={{ background: '#ef4444', bottom: '-6px' }} />
        </div>
    );
}

function CatchExecutionNode({ data }: any) {
    const { bg, border } = getStatusStyles(data.status);
    return (
        <div style={{
            minWidth: '140px',
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: '12px',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            position: 'relative'
        }}>
            <div style={{
                width: '32px', height: '32px', background: '#ef4444', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
            }}>
                <Shield size={18} fill="currentColor" fillOpacity={0.8} />
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '9px', fontWeight: '900', color: '#ef4444', textTransform: 'uppercase' }}>CATCH</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {data.label}
                </div>
            </div>
            
            <Handle type="target" position={Position.Top} style={{ background: '#ef4444' }} />
            <Handle type="source" position={Position.Right} style={{ background: '#3b82f6' }} />
        </div>
    );
}

const nodeTypes = {
    executionNode: ExecutionNode,
    tryZoneExecutionNode: TryZoneExecutionNode,
    catchExecutionNode: CatchExecutionNode
};

const edgeTypes = {
    executionEdge: ExecutionEdge
};

interface Props {
    workflow: any;
    taskExecutions: any[];
    editingTaskId?: string | null;
    onNodeClick?: (nodeId: string) => void;
    onInspect?: (nodeId: string) => void;
    onEditTask?: (taskId: string) => void;
}

export function ExecutionVisualizer({ workflow, taskExecutions, editingTaskId, onNodeClick, onInspect, onEditTask }: Props) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    
    useEffect(() => {
        const rawNodes = Array.isArray(workflow?.nodes) ? workflow.nodes : [];
        setNodes(currNodes => rawNodes.map((n: any) => {
            // FIND LATEST RECORD (in case of retries)
            const records = (taskExecutions || []).filter(r => r.nodeId === n.id);
            const record = records.length > 0 ? records[records.length - 1] : null;

            const existingNode = currNodes.find(node => node.id === n.id);
            
            const isTry = n.taskType === 'TRY_ZONE';
            const isCatch = n.taskType === 'CATCH';
            
            return {
                id: n.id,
                type: isTry ? 'tryZoneExecutionNode' : (isCatch ? 'catchExecutionNode' : 'executionNode'),
                position: existingNode?.position || n.position || { x: 0, y: 0 },
                parentNode: n.parentNode,
                extent: n.extent,
                width: n.width || existingNode?.width,
                height: n.height || existingNode?.height,
                style: isTry 
                    ? { width: n.width || 400, height: n.height || 250, zIndex: -1 } 
                    : { background: 'transparent', backgroundColor: 'transparent', border: 'none', boxShadow: 'none' },
                data: {
                    id: n.id,
                    taskId: n.taskId,
                    label: n.label || n.name || (isTry ? 'Try Block' : 'Task'),
                    taskType: n.taskType || record?.input?.taskType || 'HTTP',
                    duration: record?.duration,
                    httpStatus: record?.result?.status,
                    branchResult: record?.result?.branchResult,
                    failureStrategy: n.failureStrategy || 'SUCCESS_REQUIRED',
                    isEditing: editingTaskId === n.taskId,
                    onInspect: onInspect || (() => {}),
                    onEditTask: onEditTask || (() => {}),
                    // Derive Try Zone state from members
                    status: isTry ? (() => {
                        const memberIds = n.memberNodeIds || [];
                        // Get only the LATEST execution for each member node
                        const latestMemberRecords = memberIds.map((mid: string) => {
                            const recs = taskExecutions.filter(r => r.nodeId === mid);
                            return recs.length > 0 ? recs[recs.length - 1] : null;
                        }).filter((r: any) => r !== null);

                        if (latestMemberRecords.some((r: any) => r.status === 'FAILED' || r.status === 'TIMEOUT' || r.status === 'NO_WORKER_FOUND')) return 'FAILED';
                        if (latestMemberRecords.length > 0 && latestMemberRecords.every((r: any) => r.status === 'SUCCESS' || r.status === 'BYPASSED')) return 'SUCCESS';
                        if (latestMemberRecords.some((r: any) => r.status === 'RUNNING' || r.status === 'PENDING')) return 'RUNNING';
                        return 'PENDING';
                    })() : record?.status,
                    retryAttempt: isTry ? (() => {
                        const memberIds = n.memberNodeIds || [];
                        const memberRecords = taskExecutions.filter(r => memberIds.includes(r.nodeId));
                        return Math.max(0, ...memberRecords.map(r => {
                            const input = typeof r.input === 'string' ? JSON.parse(r.input) : r.input;
                            return (input as any)?.retryAttempt || 0;
                        }));
                    })() : (() => {
                        const input = typeof record?.input === 'string' ? JSON.parse(record.input) : record?.input;
                        return (input as any)?.retryAttempt || 0;
                    })(),
                    maxAttempts: isTry ? (n.retryPolicy?.maxAttempts || n.data?.retryPolicy?.maxAttempts || 0) : (() => {
                        const parent = rawNodes.find((pn: any) => pn.id === n.parentNode);
                        return parent?.retryPolicy?.maxAttempts || parent?.data?.retryPolicy?.maxAttempts || 0;
                    })(),
                    isRetrying: !isTry && record?.status === 'PENDING' && (() => {
                        const input = typeof record?.input === 'string' ? JSON.parse(record.input) : record?.input;
                        return (input as any)?.retryAttempt > 0;
                    })()
                }
            } as Node;
        }));
    }, [workflow?.nodes, taskExecutions, editingTaskId, onInspect, onEditTask, setNodes]);

    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        const rawEdges = Array.isArray(workflow?.edges) ? workflow.edges : [];
        const rawNodes = Array.isArray(workflow?.nodes) ? workflow.nodes : [];

        const newEdges = rawEdges.map((e: any) => {
            const sourceNode = rawNodes.find((n: any) => n.id === e.source);
            const sourceRecord = taskExecutions?.find(r => r.nodeId === e.source);
            
            const strategy = sourceNode?.failureStrategy || 'SUCCESS_REQUIRED';
            const isSourceFinished = sourceRecord && ['SUCCESS', 'FAILED', 'TIMEOUT', 'NO_WORKER_FOUND', 'BRANCHED'].includes(sourceRecord.status);
            
            const conditionMet = sourceRecord && (
                (e.condition === 'ON_SUCCESS' && (sourceRecord.status === 'SUCCESS' || sourceRecord.status === 'BRANCHED')) ||
                (e.condition === 'ON_FAILURE' && sourceRecord.status !== 'SUCCESS' && sourceRecord.status !== 'BRANCHED') ||
                (e.condition === 'ON_THEN' && sourceRecord.result?.branchResult === 'THEN') ||
                (e.condition === 'ON_ELSE' && sourceRecord.result?.branchResult === 'ELSE') ||
                (e.condition === 'ALWAYS')
            );

            const isActive = isSourceFinished && conditionMet && (
                sourceRecord.status === 'SUCCESS' || 
                strategy === 'CONTINUE_ON_FAIL' || 
                sourceNode?.taskType === 'IF' // IF nodes don't "fail" in the orchestration sense unless system error
            );

            return {
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle || (sourceNode?.taskType === 'IF' ? (e.condition === 'ON_THEN' ? 'then' : 'else') : null),
                type: 'executionEdge',
                animated: sourceRecord?.status === 'RUNNING',
                data: { 
                    condition: e.condition || 'ALWAYS',
                    isActive: !!isActive
                }
            } as Edge;
        });
        setEdges(newEdges);
    }, [workflow?.edges, workflow?.nodes, taskExecutions, setEdges]);

    if (!workflow?.nodes || !Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
        return (
            <div className="flex items-center justify-center w-full h-full bg-[#020617]">
                <div className="text-slate-500 text-xs font-mono animate-pulse uppercase tracking-[0.3em]">Synchronizing Graph UI...</div>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, width: '100%', background: '#020617', overflow: 'hidden', position: 'relative' }}>
            <ReactFlowProvider>
                <ReactFlow
                    style={{ background: '#020617' }}
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    fitViewOptions={{ padding: 0.05 }}
                    nodesConnectable={false}
                    nodesDraggable={true}
                    elementsSelectable={true}
                    onNodeClick={(_, node) => onNodeClick?.(node.id)}
                >
                    <Background variant={BackgroundVariant.Lines} gap={0} size={0} color="transparent" />
                    <Controls />
                </ReactFlow>
            </ReactFlowProvider>
        </div>
    )
}
