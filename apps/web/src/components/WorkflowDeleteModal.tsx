import { AlertCircle, Trash2, X } from 'lucide-react';

interface WorkflowDeleteModalProps {
    isOpen: boolean;
    name: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function WorkflowDeleteModal({ isOpen, name, onConfirm, onCancel }: WorkflowDeleteModalProps) {
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
            zIndex: 9999,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                width: '450px',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #eee'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        background: '#fef2f2', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid #fee2e2'
                    }}>
                        <AlertCircle color="#ef4444" size={24} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>Delete Workflow?</h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', lineHeight: '1.5' }}>
                            Are you sure you want to delete <span style={{ fontWeight: 'bold', color: '#374151' }}>"{name}"</span>? This action is permanent and cannot be undone.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                        onClick={onConfirm}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '14px',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#dc2626')}
                        onMouseOut={(e) => (e.currentTarget.style.background = '#ef4444')}
                    >
                        <Trash2 size={18} /> Permanently Delete
                    </button>
                    
                    <button 
                        onClick={onCancel}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            background: 'white',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            padding: '14px',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#f9fafb')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'white')}
                    >
                        <X size={18} /> Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
