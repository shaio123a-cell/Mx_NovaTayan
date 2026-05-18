import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { Shield, Zap, AlertCircle, Trash2, Pencil } from 'lucide-react';

/**
 * TRY_ZONE Node
 * A resizable transparent container for guarding nodes.
 */
export const TryZoneNode = ({ data, selected }: any) => {
    const originalBounds = useRef<any>(null);
    return (
        <div 
            style={{ 
                width: '100%', 
                height: '100%', 
                minWidth: '200px', 
                minHeight: '150px',
                background: selected ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.06)',
                border: selected ? '2px dashed #22c55e' : '1px dashed #22c55e',
                borderRadius: '16px',
                position: 'relative',
                pointerEvents: 'none' // Let events pass through to canvas/nodes behind
            }}
            className="group"
        >
            <div style={{ pointerEvents: 'all' }}>
                <NodeResizer 
                    minWidth={200} 
                    minHeight={150} 
                    isVisible={selected} 
                    lineStyle={{ borderColor: '#22c55e' }}
                    handleStyle={{ background: '#22c55e', width: '10px', height: '10px' }}
                    onResizeStart={(evt, params) => {
                        originalBounds.current = params;
                    }}
                    onResizeEnd={(evt, params) => {
                        data.onResizeEnd?.(data.id, params, originalBounds.current);
                        originalBounds.current = null;
                    }}
                />
            </div>
            
            {/* Header / Label - This is the handle for moving the zone */}
            <div 
                className="nodrag"
                style={{
                    position: 'absolute',
                    top: '-24px',
                    left: '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '2px 12px',
                    background: '#22c55e',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    borderRadius: '6px 6px 0 0',
                    letterSpacing: '0.05em',
                    pointerEvents: 'all',
                    cursor: 'grab',
                    boxShadow: '0 -2px 4px rgba(0,0,0,0.05)'
                }}
            >
                <Zap size={10} fill="white" />
                <span 
                    style={{ marginRight: '8px', cursor: 'pointer' }}
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        data.onEdit?.(data.id); 
                    }}
                >
                    {data.label || 'Try Block'}
                </span>
                
                {data.memberNodeIds?.length > 0 && (
                    <div style={{
                        background: 'rgba(255,255,255,0.2)',
                        padding: '0 6px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        marginRight: '12px',
                        border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                        {data.memberNodeIds.length} NODES
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); data.onEdit?.(data.id); }}
                        style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'white', display: 'flex', opacity: 0.8 }}
                        title="Edit Settings"
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                    >
                        <Pencil size={12} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); data.onDelete?.(data.id); }}
                        style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'white', display: 'flex', opacity: 0.8 }}
                        title="Delete Zone"
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            {/* Status Badge (if running) */}
            {data.executionState === 'RETRYING' && (
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: '#f59e0b',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '20px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    zIndex: 10
                }} className="animate-pulse">
                    <RefreshCw size={10} className="animate-spin" />
                    RETRYING ({data.retryCount || 0}/{data.retryPolicy?.maxAttempts || 3})
                </div>
            )}

            {/* Catch Port (ON_ERROR) */}
            <Handle 
                type="source" 
                position={Position.Bottom} 
                id="catch"
                style={{ 
                    background: '#ef4444', 
                    width: '12px', 
                    height: '12px', 
                    border: '2px solid white',
                    bottom: '-6px',
                    pointerEvents: 'all'
                }} 
                title="ON_ERROR connection to CATCH node"
            />
        </div>
    );
};

const RefreshCw = ({ size, className }: any) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
    </svg>
);

/**
 * CATCH Node
 * Entry point for error handling.
 */
export const CatchNode = ({ data, selected }: any) => {
    return (
        <div style={{
            minWidth: '140px',
            background: 'white',
            border: selected ? '2px solid #ef4444' : '1px solid #ef4444',
            borderRadius: '12px',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            position: 'relative'
        }}>
            <div style={{
                width: '32px',
                height: '32px',
                background: '#ef4444',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
            }}>
                <Shield size={18} fill="currentColor" fillOpacity={0.8} />
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '9px', fontWeight: '900', color: '#ef4444', textTransform: 'uppercase' }}>CATCH</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {data.label || 'Handle Error'}
                </div>
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); data.onDelete?.(data.id); }}
                style={{ 
                    position: 'absolute', 
                    top: '-8px', 
                    right: '-8px', 
                    width: '24px', 
                    height: '24px', 
                    background: '#fee2e2', 
                    color: '#ef4444', 
                    border: '1px solid #fecaca', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    opacity: selected ? 1 : 0,
                    transition: 'opacity 0.2s',
                    zIndex: 10
                }}
                className="delete-btn"
                title="Delete Catch Node"
            >
                <Trash2 size={12} />
            </button>

            <Handle 
                type="target" 
                position={Position.Top} 
                style={{ background: '#ef4444', width: '10px', height: '10px', border: '2px solid white' }} 
            />
            
            <Handle 
                type="source" 
                position={Position.Right} 
                style={{ background: '#3b82f6', width: '10px', height: '10px', border: '2px solid white' }} 
            />
        </div>
    );
};
