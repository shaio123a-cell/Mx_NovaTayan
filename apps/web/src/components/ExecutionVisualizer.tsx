import { useMemo, useState } from 'react'
import ReactFlow, {
    Background,
    Controls,
    Handle,
    Position,
    Node,
    Edge,
    BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Terminal, Clock, AlertTriangle, UserX, CheckCircle, Play, MoreVertical, Settings, Eye } from 'lucide-react'

/**
 * Node color mapping based on status
 */
const getStatusStyles = (status: string) => {
    switch (status) {
        case 'SUCCESS': return { bg: '#064e3b', border: '#10b981', icon: <CheckCircle size={14} className="text-green-400" /> };
        case 'FAILED': return { bg: '#450a0a', border: '#ef4444', icon: <AlertTriangle size={14} className="text-red-400" /> };
        case 'TIMEOUT': return { bg: '#450a0a', border: '#f97316', icon: <Clock size={14} className="text-orange-400" /> };
        case 'NO_WORKER_FOUND': return { bg: '#1c1d21', border: '#464c54', icon: <UserX size={14} className="text-gray-400" /> };
        case 'RUNNING': return { bg: '#1e3a8a', border: '#3b82f6', icon: <Play size={14} className="text-blue-400 animate-pulse" /> };
        case 'PENDING': return { bg: '#422006', border: '#eab308', icon: <Clock size={14} className="text-yellow-400" /> };
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

const nodeTypes = {
    executionNode: ExecutionNode
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
                    isEditing: editingTaskId === n.taskId,
                    onInspect: onInspect || (() => {}),
                    onEditTask: onEditTask || (() => {})
                }
            } as Node;
        });
    }, [workflow, taskExecutions, editingTaskId, onInspect, onEditTask]);

    const edges = useMemo(() => {
        if (!workflow?.edges) return [];
        return (workflow.edges as any[]).map((e: any) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            animated: taskExecutions.some(r => r.nodeId === e.source && r.status === 'RUNNING'),
            style: { 
                stroke: taskExecutions.some(r => r.nodeId === e.source && r.status === 'SUCCESS') ? '#10b981' : '#464c54', 
                strokeWidth: 3 
            }
        } as Edge));
    }, [workflow, taskExecutions]);

    return (
        <div style={{ width: '100%', height: '600px', background: '#0b0c10', borderRadius: '16px', border: '1px solid #202226', overflow: 'hidden', position: 'relative' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                nodesConnectable={false}
                nodesDraggable={true}
                elementsSelectable={true}
                onNodeClick={(_, node) => onNodeClick?.(node.id)}
            >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1c1d21" />
                <Controls />
            </ReactFlow>
        </div>
    )
}
