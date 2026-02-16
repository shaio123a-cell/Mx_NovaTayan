import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowsApi } from '../api/workflows';
import { useToast } from '../context/ToastContext';
import { 
    X, Settings2, Clock, Zap, Bell, Shield, Info, 
    ArrowRight, Save, Plus, Trash2, Calendar, 
    Mail, MessageSquare, AlertTriangle, Layers,
    ChevronDown, ChevronUp, Check, Play, Globe, Lock
} from 'lucide-react';
import { VariableManager } from './VariableManager';

interface WorkflowAdminShelfProps {
    workflowId: string | null;
    onClose: () => void;
    onSave?: (data: any) => void;
}

export function WorkflowAdminShelf({ workflowId, onClose, onSave }: WorkflowAdminShelfProps) {
    const [activeTab, setActiveTab] = useState<'scheduling' | 'variables' | 'notifications'>('variables');
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const initializedRef = useRef<string | null>(null);

    // Form state
    const [inputVars, setInputVars] = useState<Record<string, any>>({});
    const [outputVars, setOutputVars] = useState<Record<string, any>>({});
    const [scheduling, setScheduling] = useState<any>({ enabled: false, cron: '0 * * * *' });
    const [notifications, setNotifications] = useState<any[]>([]);
    const [scope, setScope] = useState<'GLOBAL' | 'PRIVATE'>('GLOBAL');

    const { data: workflow, isLoading } = useQuery({
        queryKey: ['workflow', workflowId],
        queryFn: () => workflowsApi.getWorkflow(workflowId!),
        enabled: !!workflowId
    });

    useEffect(() => {
        if (workflow && initializedRef.current !== workflowId) {
            setInputVars(workflow.inputVariables || {});
            setOutputVars(workflow.outputVariables || {});
            setScheduling(workflow.scheduling || { enabled: false, cron: '0 * * * *' });
            setNotifications(workflow.notifications || []);
            setScope(workflow.scope || 'GLOBAL');
            initializedRef.current = workflowId;
        }
    }, [workflow, workflowId]);

    const updateMutation = useMutation({
        mutationFn: (data: any) => workflowId 
            ? workflowsApi.updateWorkflow(workflowId, data)
            : Promise.resolve(data), // Placeholder for new workflow
        onSuccess: (data: any) => {
            if (workflowId) {
                showToast('Workflow settings updated', 'success');
                queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
            } else {
                showToast('Settings applied to draft', 'info');
            }
            if (onSave) onSave(data);
        },
        onError: (err: any) => showToast(`Failed to update: ${err.message}`, 'error')
    });

    const handleSave = () => {
        const data = {
            ...workflow,
            inputVariables: inputVars,
            outputVariables: outputVars,
            scheduling: scheduling,
            notifications: notifications,
            scope: scope
        };
        
        if (!workflowId) {
            // If new workflow, we just send it back to parent via onSave
            if (onSave) onSave(data);
            showToast('Draft settings updated!', 'info');
            onClose();
            return;
        }

        updateMutation.mutate(data);
    };

    if (isLoading && workflowId) return null;

    return (
        <div className="fixed top-0 right-0 bottom-0 w-[650px] bg-slate-50 shadow-2xl z-[1000] flex flex-col border-l border-slate-200 animate-slide-in-right">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1976D2] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 leading-tight">Workflow Administration</h2>
                        <p className="text-sm text-slate-500 font-medium">{workflow?.name || 'New Workflow'}</p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white px-6 flex items-center gap-8 shrink-0">
                <TabButton 
                    active={activeTab === 'variables'} 
                    onClick={() => setActiveTab('variables')} 
                    icon={<Zap size={18} />} 
                    label="Variables Config" 
                />
                <TabButton 
                    active={activeTab === 'scheduling'} 
                    onClick={() => setActiveTab('scheduling')} 
                    icon={<Clock size={18} />} 
                    label="Execution & Scope" 
                />
                <TabButton 
                    active={activeTab === 'notifications'} 
                    onClick={() => setActiveTab('notifications')} 
                    icon={<Bell size={18} />} 
                    label="Monitoring" 
                />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 pt-6">
                {activeTab === 'variables' && (
                    <div className="space-y-12">
                        {/* Input Variables Section */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                    <ArrowRight size={20} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-800">Dynamic Inputs</h3>
                                    <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Interface Definition</p>
                                </div>
                                <div className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-black tracking-tighter">EXPOSED</div>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <VariableManager 
                                    value={inputVars}
                                    onChange={setInputVars}
                                    forceWorkflowScope
                                />
                                <div className="mt-6 flex items-start gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                                    <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
                                    <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                                        These variables will appear as "Input Mapping" when this workflow is called as a nested task. 
                                        They act as the arguments for your automation.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Output Variables Section */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                    <Layers size={20} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-800">Return Payload</h3>
                                    <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Result Mapping</p>
                                </div>
                                <div className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded font-black tracking-tighter">RESULTS</div>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <VariableManager 
                                    value={outputVars}
                                    onChange={setOutputVars}
                                    forceWorkflowScope
                                    availableUpstreamVars={(() => {
                                        if (!workflow?.nodes) return [];
                                        let nodes = workflow.nodes as any[];
                                        if (typeof nodes === 'string') nodes = JSON.parse(nodes);
                                        if (!Array.isArray(nodes)) nodes = Object.values(nodes || {});

                                        return nodes.flatMap((n: any) => {
                                            const vars = n.variableExtraction?.vars || {};
                                            return Object.keys(vars)
                                                .filter(k => !k.startsWith('__'))
                                                .map(name => ({
                                                    name,
                                                    taskName: n.label || 'Task'
                                                }));
                                        });
                                    })()}
                                />
                                <div className="mt-6 flex items-start gap-3 bg-purple-50/50 p-4 rounded-xl border border-purple-100/50">
                                    <Info size={16} className="text-purple-500 mt-0.5 shrink-0" />
                                    <p className="text-[11px] text-purple-700 font-medium leading-relaxed">
                                        Variable mapping for the final response. Use the "Transformer" option to map results from internal nodes 
                                        to these output keys.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'scheduling' && (
                    <div className="space-y-8">
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Visibility & Control</h3>
                                    <p className="text-sm text-slate-500 font-medium">Define who can see and run this workflow.</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div 
                                    onClick={() => setScope('GLOBAL')}
                                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${scope === 'GLOBAL' ? 'border-[#1976D2] bg-blue-50/30' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${scope === 'GLOBAL' ? 'bg-[#1976D2] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <Globe size={20} />
                                    </div>
                                    <h4 className="font-bold text-slate-800 mb-1">Global Workflow</h4>
                                    <p className="text-[11px] text-slate-500 font-medium">Visible to everyone in the project and available in the core library.</p>
                                </div>
                                <div 
                                    onClick={() => setScope('PRIVATE')}
                                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${scope === 'PRIVATE' ? 'border-[#1976D2] bg-blue-50/30' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${scope === 'PRIVATE' ? 'bg-[#1976D2] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <Lock size={20} />
                                    </div>
                                    <h4 className="font-bold text-slate-800 mb-1">Restricted Mode</h4>
                                    <p className="text-[11px] text-slate-500 font-medium">Hidden from the main library. Only accessible via direct link or internal calls.</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Automated Execution</h3>
                                    <p className="text-sm text-slate-500 font-medium">Set up recurring triggers using Cron syntax.</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex items-center gap-4 mb-6">
                                    <button 
                                        onClick={() => setScheduling({ ...scheduling, enabled: !scheduling.enabled })}
                                        className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${scheduling.enabled ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-400'}`}
                                    >
                                        {scheduling.enabled ? 'ENABLED' : 'DISABLED'}
                                    </button>
                                    <p className="text-xs text-slate-500 font-medium">{scheduling.enabled ? 'Workflow will run automatically on the specified schedule.' : 'Workflow will only run when manually triggered.'}</p>
                                </div>

                                {scheduling.enabled && (
                                    <div className="space-y-4 animate-slide-in-top">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Cron Expression</label>
                                            <div className="relative">
                                                <input 
                                                    value={scheduling.cron}
                                                    onChange={(e) => setScheduling({ ...scheduling, cron: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-[#1976D2] transition-all"
                                                    placeholder="0 * * * *"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-500">FORMAT: MIN HR DAY MON DOW</div>
                                            </div>
                                        </div>
                                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex gap-3">
                                            <Calendar size={18} className="text-amber-500 shrink-0" />
                                            <div>
                                                <p className="text-xs text-amber-800 font-bold mb-1">Schedule Preview</p>
                                                <p className="text-[11px] text-amber-700 font-medium">Execution Engine parses this on the bridge. Ensure correct timezone settings.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                         <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-6">
                             <Bell size={32} />
                         </div>
                         <h3 className="text-xl font-bold text-slate-800 mb-2">Workflow Monitoring</h3>
                         <p className="text-slate-500 font-medium text-center max-w-sm">
                             Stay informed with Email, Slack, and Webhook alerts.
                             Full alerting system integration is being polished.
                         </p>
                         <button className="mt-8 px-8 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all">
                             Check Logs Instead
                         </button>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="bg-white border-t border-slate-200 p-6 flex items-center justify-end gap-3 shrink-0">
                <button 
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all border border-slate-200"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="px-8 py-2.5 bg-[#1976D2] hover:bg-[#1565C0] disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-100 flex items-center gap-2 transition-all active:scale-95"
                >
                    {updateMutation.isPending ? 'Saving...' : (
                        <>
                            <Save size={18} />
                            Save Configuration
                        </>
                    )}
                </button>
            </div>

            <style>{`
                .animate-slide-in-right { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideInTop { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-slide-in-top { animation: slideInTop 0.2s ease-out; }
            `}</style>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-2 py-4 border-b-2 font-bold text-sm transition-all focus:outline-none ${
                active 
                ? 'border-[#1976D2] text-[#1976D2]' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
        >
            {icon}
            {label}
        </button>
    );
}
