
import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Play, X } from 'lucide-react';

interface BlockedDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    usageData: {
        usageCount: number;
        dependents: Array<{ id: string; name: string }>;
    } | undefined;
    type: 'schedule' | 'calendar';
}

export function BlockedDeleteModal({ isOpen, onClose, usageData, type }: BlockedDeleteModalProps) {
    const [isUsageExpanded, setIsUsageExpanded] = useState(false);

    if (!isOpen) return null;

    const typeLabel = type === 'schedule' ? 'schedule' : 'calendar';

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
                width: '500px',
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
                        <AlertCircle color="#dc2626" size={24} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>Deletion Blocked</h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                            This {typeLabel} is currently bound and cannot be deleted.
                        </p>
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-amber-800 uppercase tracking-tighter">Shared Library Warning</span>
                        <button 
                            onClick={() => setIsUsageExpanded(!isUsageExpanded)}
                            className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-100/50 hover:bg-amber-100 px-2 py-1 rounded-lg transition-all"
                        >
                            {isUsageExpanded ? 'HIDE LIST' : 'VIEW LIST'}
                            {isUsageExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                    </div>
                    <p className="text-xs text-amber-700 font-medium leading-relaxed">
                        This {typeLabel} is actively used in <span className="font-bold">{usageData?.usageCount} workflows</span>. 
                        You must unbind it from all workflows before deletion.
                    </p>

                    {isUsageExpanded && usageData?.dependents && (
                        <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            {usageData.dependents.map((dep: any) => (
                                <a 
                                    key={dep.id}
                                    href={`/designer?id=${dep.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center justify-between p-2.5 bg-white/80 border border-amber-200/50 rounded-xl hover:bg-white hover:border-amber-300 transition-all font-bold"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        <span className="text-xs text-amber-900">{dep.name}</span>
                                    </div>
                                    <Play size={10} className="text-amber-400" />
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                        onClick={onClose}
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
                        <X size={18} /> Close
                    </button>
                </div>
            </div>
        </div>
    );
}
