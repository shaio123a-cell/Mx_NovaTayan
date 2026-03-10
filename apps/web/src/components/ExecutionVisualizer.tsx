import { useMemo, useState } from 'react'
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
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Terminal, Clock, AlertTriangle, UserX, CheckCircle, Play, MoreVertical, Settings, Eye, AlertCircle, Zap, Layers } from 'lucide-react'

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
        default: return { bg: '#111217', border: '#202226', icon: <Terminal size={14} className="text-gray-400" /> };
    }
}

function ExecutionNode({ data }: any) {
    const isUtility = data.taskType === 'VARIABLE';
    const isWorkflow = data.taskType === 'WORKFLOW';
    const { bg, border, icon } = getStatusStyles(data.status);
    
    const renderIcon = () => {
        if (isUtility) return <Zap size={14} className="text-yellow-400" fill="currentColor" />;
        if (isWorkflow) return <Layers size={14} className="text-white" />;
        return icon;
    };

    const isEditing = data.isEditing;
    
    return (
        <div 
            style={{ 
                minWidth: isUtility ? '180px' : '240px',
                position: 'relative',
                opacity: data.status ? 1 : 0.5,
                transition: 'all 0.2s',
                transform: isEditing ? 'scale(1.05)' : 'scale(1)',
                zIndex: isEditing ? 50 : 1
            }}
            className="group"
        >
            {/* Shaped Background Layers */}
            {/* Border Layer */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: isWorkflow ? '#32a895' : (isUtility ? (isEditing ? '#f05a28' : '#ffcc00') : (isEditing ? '#f05a28' : border)),
                clipPath: isUtility 
                    ? 'none' 
                    : (isWorkflow ? 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)' : 'none'),
                borderRadius: isUtility ? '999px' : (isWorkflow ? '0' : '12px'),
                zIndex: 0
            }} />
            
            {/* Fill Layer */}
            <div style={{
                position: 'absolute',
                inset: '1.5px', // Border width
                background: isWorkflow ? 'linear-gradient(135deg, #032cfc 0%, #021a99 100%)' : (isUtility ? 'linear-gradient(135deg, #1e1b0a 0%, #111217 100%)' : bg),
                clipPath: isUtility 
                    ? 'none' 
                    : (isWorkflow ? 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)' : 'none'),
                borderRadius: isUtility ? '999px' : (isWorkflow ? '0' : '11px'),
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
            
            <div style={{ padding: isUtility ? '12px 24px' : '12px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ 
                        width: '32px', 
                        height: '32px', 
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
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.label}</div>
                        <div style={{ fontSize: '9px', fontWeight: 'bold', color: isWorkflow ? '#fff' : border, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{data.status || 'NOT REACHED'}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                        {!isUtility && !isWorkflow && data.httpStatus ? (
                            <span style={{ color: data.httpStatus < 300 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>HTTP {data.httpStatus}</span>
                        ) : (isUtility ? <span style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: '10px' }}>⚡ VMA LOGIC</span> : (isWorkflow ? <span style={{ color: '#fff', fontWeight: 'bold' }}>NESTED WF</span> : '---'))}
                    </div>
                    {data.duration && (
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={10} /> {data.duration}ms
                        </div>
                    )}
                </div>
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
    const label = condition === 'ALWAYS' ? 'Run Always' : condition === 'ON_SUCCESS' ? 'On Success' : 'On Failure';
    const color = data?.isActive 
        ? (condition === 'ON_SUCCESS' ? '#10b981' : condition === 'ON_FAILURE' ? '#ef4444' : '#3b82f6')
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

const nodeTypes = {
    executionNode: ExecutionNode
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
    const nodes = useMemo(() => {
        if (!workflow?.nodes) return [];
        return (workflow.nodes as any[]).map((n: any) => {
            const record = taskExecutions.find(r => r.nodeId === n.id);
            return {
                id: n.id,
                type: 'executionNode',
                position: n.position,
                data: {
                    id: n.id,
                    taskId: n.taskId,
                    label: n.label,
                    taskType: n.taskType || record?.input?.taskType || 'HTTP',
                    status: record?.status,
                    duration: record?.duration,
                    httpStatus: record?.result?.status,
                    failureStrategy: n.failureStrategy || 'SUCCESS_REQUIRED',
                    isEditing: editingTaskId === n.taskId,
                    onInspect: onInspect || (() => {}),
                    onEditTask: onEditTask || (() => {})
                }
            } as Node;
        });
    }, [workflow, taskExecutions, editingTaskId, onInspect, onEditTask]);

    const edges = useMemo(() => {
        if (!workflow?.edges) return [];
        return (workflow.edges as any[]).map((e: any) => {
            const sourceNode = (workflow.nodes as any[]).find(n => n.id === e.source);
            const sourceRecord = taskExecutions.find(r => r.nodeId === e.source);
            
            const strategy = sourceNode?.failureStrategy || 'SUCCESS_REQUIRED';
            const isSourceFinished = sourceRecord && ['SUCCESS', 'FAILED', 'TIMEOUT', 'NO_WORKER_FOUND'].includes(sourceRecord.status);
            
            // A path is "active" if:
            // 1. Source is finished
            // 2. Edge condition is met
            // 3. AND if source failed, strategy MUST be CONTINUE_ON_FAIL
            const conditionMet = sourceRecord && (
                (e.condition === 'ON_SUCCESS' && sourceRecord.status === 'SUCCESS') ||
                (e.condition === 'ON_FAILURE' && sourceRecord.status !== 'SUCCESS') ||
                (e.condition === 'ALWAYS')
            );

            const isActive = isSourceFinished && conditionMet && (sourceRecord.status === 'SUCCESS' || strategy === 'CONTINUE_ON_FAIL');

            return {
                id: e.id,
                source: e.source,
                target: e.target,
                type: 'executionEdge',
                animated: sourceRecord?.status === 'RUNNING',
                data: { 
                    condition: e.condition || 'ALWAYS',
                    isActive: isActive
                }
            } as Edge;
        });
    }, [workflow, taskExecutions]);

    return (
        <div style={{ width: '100%', height: '600px', background: '#020617', borderRadius: '16px', border: '1px solid #1e293b', overflow: 'hidden', position: 'relative' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                nodesConnectable={false}
                nodesDraggable={true}
                elementsSelectable={true}
                onNodeClick={(_, node) => onNodeClick?.(node.id)}
            >
                <Background variant={BackgroundVariant.Lines} gap={0} size={0} color="transparent" />
                <Controls />
            </ReactFlow>
        </div>
    )
}
