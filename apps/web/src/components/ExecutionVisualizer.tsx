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
import { Terminal, Clock, AlertTriangle, UserX, CheckCircle, Play, MoreVertical, Settings, Eye, AlertCircle } from 'lucide-react'

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
    const { bg, border, icon } = getStatusStyles(data.status);
    const [showMenu, setShowMenu] = useState(false);
    const isEditing = data.isEditing;
    
    return (
        <div 
            style={{ 
                background: bg, 
                border: isEditing ? '3px solid #f05a28' : `2px solid ${border}`, 
                borderRadius: '12px', 
                minWidth: '220px',
                boxShadow: isEditing 
                    ? '0 0 20px rgba(240, 90, 40, 0.4), 0 10px 15px -3px rgba(0, 0, 0, 0.4)' 
                    : '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
                overflow: 'visible', // Allow menu to overflow
                position: 'relative',
                opacity: data.status ? 1 : 0.5,
                transition: 'all 0.2s',
                transform: isEditing ? 'scale(1.05)' : 'scale(1)',
                zIndex: isEditing ? 50 : 1
            }}
            className="group"
        >
            <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
            
            <div style={{ padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        background: 'rgba(0,0,0,0.3)', 
                        borderRadius: '8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.label}</div>
                        <div style={{ fontSize: '9px', fontWeight: 'bold', color: border, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{data.status || 'NOT REACHED'}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                        {data.httpStatus ? (
                            <span style={{ color: data.httpStatus < 300 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>HTTP {data.httpStatus}</span>
                        ) : '---'}
                    </div>
                    {data.duration && (
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={10} /> {data.duration}ms
                        </div>
                    )}
                </div>

                {/* Failure Strategy Indicator */}
                <div style={{ 
                    marginTop: '8px', 
                    fontSize: '9px', 
                    color: data.failureStrategy === 'CONTINUE_ON_FAIL' ? '#10b981' : '#f97316',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '4px'
                }}>
                    {data.failureStrategy === 'CONTINUE_ON_FAIL' ? 'Continue on Fail' : 'Stop on Fail'}
                </div>
            </div>

            {/* 3-Dots Menu Button */}
            <div 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowMenu(!showMenu);
                }}
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    padding: '6px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: showMenu ? '#fff' : 'rgba(255,255,255,0.4)',
                    background: showMenu ? 'rgba(59, 130, 246, 0.5)' : 'rgba(0,0,0,0.2)',
                    zIndex: 20
                }}
                className="hover:text-white hover:bg-white/10 transition-all"
            >
                <MoreVertical size={14} />
            </div>

            {/* Dropdown Menu */}
            {showMenu && (
                <div style={{
                    position: 'absolute',
                    top: '40px',
                    right: '8px',
                    background: '#1c1d21',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    width: '140px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 100,
                    overflow: 'hidden'
                }}>
                    <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            data.onInspect(data.id);
                            setShowMenu(false);
                        }}
                        style={{ padding: '10px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#d8d9da' }}
                        className="hover:bg-primary-500 hover:text-white transition-colors"
                    >
                        <Eye size={12} /> Inspect Result
                    </div>
                    <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            data.onEditTask(data.id);
                            setShowMenu(false);
                        }}
                        style={{ padding: '10px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#d8d9da', borderTop: '1px solid #222' }}
                        className="hover:bg-primary-500 hover:text-white transition-colors"
                    >
                        <Settings size={12} /> Edit Task
                    </div>
                </div>
            )}

            <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
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
        <div style={{ width: '100%', height: '600px', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden', position: 'relative' }}>
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
