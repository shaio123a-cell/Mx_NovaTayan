import { AlertCircle, Save, Trash2, X } from 'lucide-react';

interface UnsavedChangesModalProps {
    isOpen: boolean;
    onSave: () => void;
    onDiscard: () => void;
    onCancel: () => void;
}

export function UnsavedChangesModal({ isOpen, onSave, onDiscard, onCancel }: UnsavedChangesModalProps) {
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
                        background: '#fff7ed', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid #ffedd5'
                    }}>
                        <AlertCircle color="#f97316" size={24} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>Unsaved Changes</h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                            You have unsaved changes in your design. What would you like to do?
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                        onClick={onSave}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            background: '#1976D2',
                            color: 'white',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        <Save size={18} /> Save & Continue
                    </button>
                    
                    <button 
                        onClick={onDiscard}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fecaca',
                            padding: '12px',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        <Trash2 size={18} /> Discard Changes
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
                            padding: '12px',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        <X size={18} /> Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
