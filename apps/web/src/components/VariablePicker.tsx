import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { globalVarsApi } from '../api/globalVars';
import { 
    ChevronRight, Globe, Box, Workflow, X, Zap, Clock,
    Folder, Search, Calculator, Globe as GlobeIcon, Database, Hash, Calendar
} from 'lucide-react';
import { ACTIONS, ACTION_CATEGORIES } from '../constants/action_definitions';

type VarSource = { name: string, taskName: string; source?: 'workflow' | 'task' | 'workflow_input' | 'workflow_output' };

export function VariablePicker({ onSelect, onClose, localVars = [], triggerVars = [] }: { onSelect: (v: string) => void, onClose: () => void, localVars?: (string | VarSource)[], triggerVars?: string[] }) {
    const { data: globalVars } = useQuery({ queryKey: ['globalVars'], queryFn: globalVarsApi.getAll });
    const [searchQuery, setSearchQuery] = useState('');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ 
        'global': false, 'task': false, 'workflow': false, 'local': true, 'trigger': true, 'operations': true 
    });
    const [subExpanded, setSubExpanded] = useState<Record<string, boolean>>({
        'date': false, 'string': false, 'math': false, 'collection': false, 'conversion': false, 'advanced': false
    });

    const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    const toggleSub = (id: string) => setSubExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    const renderRow = (item: { label: string, value: string, icon: any, description?: string, color?: string, isMono?: boolean }) => {
        const Icon = item.icon || Box;
        return (
            <button 
                key={item.value}
                onClick={() => onSelect(item.value)}
                className="w-full text-left p-2 rounded-lg hover:bg-blue-50 group/item transition-all border border-transparent hover:border-blue-100"
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-gray-50 rounded group-hover/item:bg-white group-hover/item:shadow-sm transition-colors">
                        <Icon size={12} className={item.color || "text-gray-500"} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className={`text-xs font-bold text-gray-700 group-hover/item:text-blue-700 truncate ${item.isMono ? 'font-mono' : ''}`}>{item.label}</div>
                        <div className="text-[10px] text-gray-400 truncate opacity-70 font-medium">{item.description || 'Variable'}</div>
                    </div>
                    <ChevronRight size={10} className="text-gray-300 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                </div>
            </button>
        );
    };

    const groupedGlobalVars = useMemo(() => {
        if (!globalVars) return {};
        const map: Record<string, any[]> = {};
        globalVars.forEach((v: any) => {
            const g = v.group || 'Ungrouped';
            if (!map[g]) map[g] = [];
            map[g].push(v);
        });
        return map;
    }, [globalVars]);

    const categorizedActions = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        return ACTION_CATEGORIES.map(cat => ({
            ...cat,
            items: ACTIONS.filter(a => a.category === cat.id && (
                a.label.toLowerCase().includes(query) || 
                a.description.toLowerCase().includes(query)
            )).map(a => ({
                label: a.label,
                value: a.template.startsWith('{{') ? a.template : ` | ${a.template}`,
                icon: a.icon,
                description: a.description,
                color: cat.color
            }))
        })).filter(g => g.items.length > 0 && g.id !== 'environment');
    }, [searchQuery]);

    const systemSections = [
        { 
            id: 'task', 
            label: 'Task & HTTP Context', 
            icon: Box, 
            items: [
                { label: 'Current Task Name', value: '{{task.name}}', description: 'Node label' },
                { label: 'Current Node ID', value: '{{task.id}}', description: 'Internal ID' },
                { label: 'Last HTTP Status', value: '{{HTTP.last.status}}', description: 'Previous code' }
            ] 
        },
         { 
            id: 'workflow', 
            label: 'Workflow Metadata', 
            icon: Workflow, 
            items: [
                 { label: 'Execution ID', value: '{{workflow.executionId}}', description: 'Unique run ID' },
                 { label: 'Workflow Name', value: '{{workflow.name}}', description: 'Template name' },
                 { label: 'Environment', value: '{{env}}', description: 'Execution tier (dev/prod)' },
                 { label: 'Region', value: '{{region}}', description: 'DC Location' },
                 { label: 'Platform Version', value: '{{appVer}}', description: 'Core engine ver' },
                 { label: 'Success Duration', value: '{{workflow.lastSuccessDuration}}', description: 'Last good run' }
             ] 
        }
    ];

    const filteredSections = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const normalizedLocal = (localVars || []).filter(Boolean).map(v => {
            if (typeof v === 'string') return { label: v, value: `{{${v}}}`, taskName: 'Current Task' };
            const varObj = v as VarSource;
            return { label: varObj.name || 'Unknown', value: (varObj as any).value || `{{${varObj.name || ''}}}`, taskName: varObj.taskName || 'Task', source: varObj.source };
        }).filter(v => v.label.toLowerCase().includes(query) || v.taskName.toLowerCase().includes(query));

        const normalizedTrigger = (triggerVars || []).map(v => ({ label: `${v} payload`, value: v, icon: Globe })).filter(v => v.label.toLowerCase().includes(query));

        const filteredGlobals: Record<string, any[]> = {};
        Object.entries(groupedGlobalVars).forEach(([group, vars]) => {
            const matches = vars.filter((v: any) => v.name.toLowerCase().includes(query));
            if (matches.length > 0) filteredGlobals[group] = matches;
        });

        const filteredSystem = systemSections.map(s => ({
            ...s,
            items: s.items.filter(i => i.label.toLowerCase().includes(query) || (i as any).description?.toLowerCase().includes(query))
        })).filter(s => s.items.length > 0);

        return { local: normalizedLocal, trigger: normalizedTrigger, globals: filteredGlobals, system: filteredSystem };
    }, [searchQuery, localVars, triggerVars, groupedGlobalVars, systemSections]);

    useEffect(() => {
        if (searchQuery.length >= 1) {
            const newExpanded: any = {};
            if (filteredSections.local.length > 0) newExpanded.local = true;
            if (filteredSections.trigger.length > 0) newExpanded.trigger = true;
            if (Object.keys(filteredSections.globals).length > 0) newExpanded.global = true;
            filteredSections.system.forEach(s => { newExpanded[s.id] = true; });
            if (categorizedActions.length > 0) {
                newExpanded.operations = true;
                const newSubs: any = {};
                categorizedActions.forEach(g => { newSubs[g.id] = true; });
                setSubExpanded(prev => ({ ...prev, ...newSubs }));
            }
            setExpanded(prev => ({ ...prev, ...newExpanded }));
        }
    }, [filteredSections, searchQuery, categorizedActions]);

    return (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-2xl flex flex-col z-[100000] animate-in slide-in-from-right duration-200">
             <div className="p-4 border-b border-gray-100 flex flex-col gap-3 bg-gray-50/80 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                        <Zap size={16} className="text-blue-600 fill-blue-100"/>
                        Select Variable
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded transition-colors"><X size={16}/></button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input type="text" placeholder="Search variables..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium" />
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                 {/* 1. Workflow Context (TOP) */}
                 {filteredSections.local.length > 0 && (
                    <div className="mb-2">
                        <button onClick={() => toggle('local')} className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded text-left transition-colors group">
                            <ChevronRight size={14} className={`transition-transform text-gray-400 group-hover:text-gray-600 ${expanded['local'] ? 'rotate-90' : ''}`} />
                            <Box size={14} className="text-blue-500"/>
                            <span className="text-sm font-semibold text-gray-700">Workflow Context</span>
                        </button>
                        {expanded['local'] && (
                            <div className="ml-6 space-y-0.5 mt-1 border-l border-gray-100 pl-2">
                                {filteredSections.local.map((item: any) => {
                                    let icon = Box; let color = "text-blue-500";
                                    if (item.source === 'workflow_input') { icon = Zap; color = "text-amber-500"; }
                                    else if (item.source === 'workflow_output') { icon = Workflow; color = "text-indigo-500"; }
                                    else if (item.source === 'workflow') { icon = Workflow; color = "text-purple-500"; }
                                    return renderRow({ label: item.label, value: item.value, icon, color, description: item.taskName, isMono: true });
                                })}
                            </div>
                        )}
                    </div>
                 )}

                 {/* 2. Trigger Payload Section */}
                 {filteredSections.trigger.length > 0 && (
                    <div className="mb-2">
                        <button onClick={() => toggle('trigger')} className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded text-left transition-colors group">
                            <ChevronRight size={14} className={`transition-transform text-gray-400 group-hover:text-gray-600 ${expanded['trigger'] ? 'rotate-90' : ''}`} />
                            <Zap size={14} className="text-orange-500 fill-orange-50"/>
                            <span className="text-sm font-semibold text-gray-700">Trigger Payload</span>
                        </button>
                        {expanded['trigger'] && (
                            <div className="ml-6 space-y-1 mt-1 border-l border-gray-100 pl-2">
                                {filteredSections.trigger.map((item: any) => (
                                    <button key={item.value} onClick={() => onSelect(item.value)} className="w-full text-left text-xs p-2 rounded transition-all group/item flex items-center gap-2 hover:bg-orange-50 text-slate-600">
                                        <Globe size={11} className="text-orange-400 shrink-0" /><div className="font-mono truncate font-bold text-orange-700">{item.value}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                 )}

                 {/* 3. Operations & Actions (Categorized & Collapsible) */}
                 {categorizedActions.length > 0 && (
                    <div className="mb-2">
                        <button onClick={() => toggle('operations')} className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded text-left transition-colors group">
                            <ChevronRight size={14} className={`transition-transform text-gray-400 group-hover:text-gray-600 ${expanded['operations'] ? 'rotate-90' : ''}`} />
                            <Calculator size={14} className="text-blue-600"/>
                            <span className="text-sm font-semibold text-gray-700">Operations & Actions</span>
                        </button>
                        {expanded['operations'] && (
                            <div className="ml-6 mt-1 border-l border-gray-100 pl-2 space-y-1">
                                {categorizedActions.map(group => (
                                    <div key={group.id} className="mb-2">
                                        <button onClick={() => toggleSub(group.id)} className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded group/sub transition-colors">
                                            <ChevronRight size={12} className={`transition-transform text-gray-300 group-hover/sub:text-gray-500 ${subExpanded[group.id] ? 'rotate-90' : ''}`} />
                                            <group.icon size={14} className={group.color || "text-gray-400"}/>
                                            <span className="text-sm font-semibold text-gray-700">{group.label}</span>
                                        </button>
                                        {subExpanded[group.id] && (
                                            <div className="pl-4 mt-0.5 space-y-0.5 border-l border-gray-100 ml-3">
                                                {group.items.map(item => renderRow(item))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                 )}

                 {/* 4. Global Variables */}
                 {Object.keys(filteredSections.globals).length > 0 && (
                    <div className="mb-2">
                        <button onClick={() => toggle('global')} className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded text-left transition-colors group">
                            <ChevronRight size={14} className={`transition-transform text-gray-400 group-hover:text-gray-600 ${expanded['global'] ? 'rotate-90' : ''}`} />
                            <Globe size={14} className="text-green-500"/>
                            <span className="text-sm font-semibold text-gray-700">Global Variables</span>
                        </button>
                        {expanded['global'] && (
                            <div className="ml-6 pl-2 border-l border-gray-100 mt-1 space-y-3">
                                {Object.entries(filteredSections.globals).map(([group, vars]) => (
                                    <div key={group}>
                                        <div className="px-2 py-0.5 text-[9px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1.5 mb-1">
                                            <Folder size={10}/> {group}
                                        </div>
                                        <div className="space-y-0.5">
                                            {vars.map((v: any) => renderRow({ label: v.name, value: `{{global.${v.name}}}`, icon: GlobeIcon, color: "text-green-500", description: v.isSecret ? '[Secret Value]' : String(v.value), isMono: true }))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                 )}

                 {/* 5. System Metadata (Task, Workflow) */}
                 {filteredSections.system.map(section => (
                    <div key={section.id} className="mb-2">
                        <button onClick={() => toggle(section.id)} className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded text-left transition-colors group">
                            <ChevronRight size={14} className={`transition-transform text-gray-400 group-hover:text-gray-600 ${expanded[section.id] ? 'rotate-90' : ''}`} />
                            <section.icon size={14} className="text-purple-500"/>
                            <span className="text-sm font-semibold text-gray-700">{section.label}</span>
                        </button>
                        {expanded[section.id] && (
                            <div className="ml-6 space-y-0.5 mt-1 border-l border-gray-100 pl-2">
                                {section.items.map((item: any) => renderRow(item))}
                            </div>
                        )}
                    </div>
                 ))}

                 {searchQuery && filteredSections.local.length === 0 && Object.keys(filteredSections.globals).length === 0 && filteredSections.system.length === 0 && categorizedActions.length === 0 && (
                     <div className="p-8 text-center text-xs text-gray-400 font-medium">No variables match search</div>
                 )}
             </div>
        </div>
    );
}
