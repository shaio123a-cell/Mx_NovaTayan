import React from 'react';
import { Trash2, Move, AlertTriangle, X } from 'lucide-react';

interface ZoneDeleteModalProps {
    isOpen: boolean;
    onCancel: () => void;
    onDeleteAll: () => void;
    onDeleteZoneOnly: () => void;
    memberCount: number;
}

export function ZoneDeleteModal({ isOpen, onCancel, onDeleteAll, onDeleteZoneOnly, memberCount }: ZoneDeleteModalProps) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '20px',
                width: '500px',
                padding: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #eee',
                position: 'relative',
                animation: 'modal-bounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                <button 
                    onClick={onCancel}
                    style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                    <X size={20} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ 
                        width: '56px', 
                        height: '56px', 
                        background: '#fff1f2', 
                        borderRadius: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid #ffe4e6'
                    }}>
                        <Trash2 color="#e11d48" size={28} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>Delete Try Zone</h3>
                        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>
                            Choose how you want to handle the contents of this zone.
                        </p>
                    </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px' }}>
                    <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                    <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                        This zone currently contains <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{memberCount} nodes</span>. 
                        Deleting the zone will either remove these nodes or move them to the main canvas.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button 
                        onClick={onDeleteZoneOnly}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #e2e8f0',
                            padding: '16px',
                            borderRadius: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                            textAlign: 'left'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <Move size={16} className="text-blue-500" />
                            </div>
                            <div>
                                <div style={{ fontWeight: '800' }}>Keep Contents</div>
                                <div style={{ fontSize: '11px', opacity: 0.7, fontWeight: '500' }}>Unwrap nodes and keep them on the canvas</div>
                            </div>
                        </div>
                    </button>
                    
                    <button 
                        onClick={onDeleteAll}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#fff1f2',
                            color: '#9f1239',
                            border: '1px solid #fecaca',
                            padding: '16px',
                            borderRadius: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                            textAlign: 'left'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#ffe4e6'; e.currentTarget.style.borderColor = '#fda4af'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <Trash2 size={16} className="text-rose-500" />
                            </div>
                            <div>
                                <div style={{ fontWeight: '800' }}>Delete Everything</div>
                                <div style={{ fontSize: '11px', opacity: 0.7, fontWeight: '500' }}>Remove the zone and all tasks inside it</div>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes modal-bounce {
                    0% { transform: scale(0.9); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
