import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { globalVarsApi } from '../api/globalVars';
import { 
    ChevronRight, Globe, Box, Workflow, X, Zap, 
    Folder, Search, Calculator, Globe as GlobeIcon 
} from 'lucide-react';
import { ACTIONS } from '../constants/action_definitions';

type VarSource = { name: string, taskName: string; source?: 'workflow' | 'task' | 'workflow_input' | 'workflow_output' };

export function VariablePicker({ onSelect, onClose, localVars = [], triggerVars = [] }: { onSelect: (v: string) => void, onClose: () => void, localVars?: (string | VarSource)[], triggerVars?: string[] }) {
    const { data: globalVars } = useQuery({ queryKey: ['globalVars'], queryFn: globalVarsApi.getAll });
    const [searchQuery, setSearchQuery] = useState('');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'global': false, 'task': false, 'workflow': false, 'local': true, 'macros': false, 'utils': false, 'trigger': true });

    const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    // UNIFIED ROW RENDERING - Single source of truth for fonts and spacing
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

    // Group Global Vars
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

    const systemSections = [
        {
            id: 'utils',
            label: 'Operations & Actions',
            icon: Calculator,
            items: ACTIONS.map(a => ({ label: a.label, value: ` | ${a.template}`, icon: a.icon, description: a.description }))
        },
        { 
            id: 'task', 
            label: 'HTTP Response', 
            icon: Box, 
            items: [
                { label: 'Current.body', value: '{{HTTP.Current.body}}' },
                { label: 'Current.status', value: '{{HTTP.Current.status}}' }
            ] 
        },
         { 
            id: 'workflow', 
            label: 'Workflow System', 
            icon: Workflow, 
            items: [
                 { label: 'Execution ID', value: '{{workflow.executionId}}' },
                 { label: 'Workflow Name', value: '{{workflow.name}}' },
                 { label: 'Current Execution Status', value: '{{workflow.executionStatus}}' },
                 { label: 'Current Execution Duration (ms)', value: '{{workflow.executionDuration}}' },
                 { label: 'Last success duration (ms)', value: '{{workflow.lastSuccessDuration}}' },
                 { label: 'Last execution epoch', value: '{{workflow.lastExecutionEpoch}}' },
                 { label: 'Last successful epoch', value: '{{workflow.lastSuccessEpoch}}' },
                 { label: 'Last failed epoch', value: '{{workflow.lastFailedEpoch}}' }
             ] 
        },
        {
            id: 'macros',
            label: 'Macro Variables',
            icon: Zap,
            items: [
                { label: 'now (ISO)', value: '{{now}}' },
                { label: 'epoch (sec)', value: '{{epoch}}' },
                { label: 'epochMs (ms)', value: '{{epochMs}}' },
                { label: 'uuid', value: '{{uuid}}' },
                { label: 'env', value: '{{env}}' },
                { label: 'appVer', value: '{{appVer}}' },
                { label: 'region', value: '{{region}}' },
                { label: 'Current Task Name', value: '{{task.name}}' },
                { label: 'Current Task ID', value: '{{task.id}}' },
                { label: 'Last Body', value: '{{HTTP.last.body}}' },
                { label: 'Last Status', value: '{{HTTP.last.status}}' }
            ]
        }
    ];

    const filteredSections = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        
        // Process Local Vars (Extracted in Task)
        const normalizedLocal = (localVars || []).filter(Boolean).map(v => {
            if (typeof v === 'string') return { label: v, value: `{{${v}}}`, taskName: 'Current Task' };
            const varObj = v as VarSource;
            return { 
                label: varObj.name || 'Unknown', 
                value: (varObj as any).value || `{{${varObj.name || ''}}}`, 
                taskName: varObj.taskName || 'Task',
                source: varObj.source
            };
        }).filter(v => v.label.toLowerCase().includes(query) || v.taskName.toLowerCase().includes(query));

        // Process Trigger Vars
        const normalizedTrigger = (triggerVars || []).map(v => ({
            label: `${v} payload`,
            value: v, // No double curly braces for trigger mapping usually, or {{body.path}}? 
            icon: Globe
        })).filter(v => v.label.toLowerCase().includes(query));

        // Process Global Vars
        const filteredGlobals: Record<string, any[]> = {};
        Object.entries(groupedGlobalVars).forEach(([group, vars]) => {
            const matches = vars.filter((v: any) => v.name.toLowerCase().includes(query));
            if (matches.length > 0) filteredGlobals[group] = matches;
        });

        // Process System Sections
        const filteredSystem = systemSections.map(s => ({
            ...s,
            items: s.items.filter(i => 
                i.label.toLowerCase().includes(query) || 
                (i as any).description?.toLowerCase().includes(query)
            )
        })).filter(s => s.items.length > 0);

        return {
            local: normalizedLocal,
            trigger: normalizedTrigger,
            globals: filteredGlobals,
            system: filteredSystem
        };
    }, [searchQuery, localVars, triggerVars, groupedGlobalVars, systemSections]);

    // Automatically expand sections with results when searching
    useEffect(() => {
        if (searchQuery.length >= 1) {
            const newExpanded: any = {};
            if (filteredSections.local.length > 0) newExpanded.local = true;
            if (filteredSections.trigger.length > 0) newExpanded.trigger = true;
            if (Object.keys(filteredSections.globals).length > 0) newExpanded.global = true;
            filteredSections.system.forEach(s => { newExpanded[s.id] = true; });
            setExpanded(newExpanded);
        }
    }, [filteredSections, searchQuery]);

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
                    <input
                        type="text"
                        placeholder="Search variables..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                    />
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                 
                 {/* Trigger Payload Section */}
                 {filteredSections.trigger.length > 0 && (
                    <div className="mb-2">
                        <button onClick={() => toggle('trigger')} className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded text-left transition-colors group">
                            <ChevronRight size={14} className={`transition-transform text-gray-400 group-hover:text-gray-600 ${expanded['trigger'] ? 'rotate-90' : ''}`} />
                            <Zap size={14} className="text-orange-500 fill-orange-50"/>
                            <span className="text-sm font-semibold text-gray-700">Trigger Payload</span>
                            <span className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{filteredSections.trigger.length}</span>
                        </button>
                        {expanded['trigger'] && (
                            <div className="ml-6 space-y-1 mt-1 border-l border-gray-100 pl-2">
                                {filteredSections.trigger.map((item: any) => (
                                    <button 
                                        key={item.value} 
                                        onClick={() => onSelect(item.value)} 
                                        className="w-full text-left text-xs p-2 rounded transition-all group/item flex items-center gap-2 hover:bg-orange-50 text-slate-600"
                                    >
                                        <Globe size={11} className="text-orange-400 shrink-0" />
                                        <div className="font-mono truncate font-bold text-orange-700">{item.value}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                 )}
                 
                 {/* Local / Upstream Section */}
                 {filteredSections.local.length > 0 && (
                    <div className="mb-2">
                        <button onClick={() => toggle('local')} className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded text-left transition-colors group">
                            <ChevronRight size={14} className={`transition-transform text-gray-400 group-hover:text-gray-600 ${expanded['local'] ? 'rotate-90' : ''}`} />
                            <Box size={14} className="text-blue-500"/>
                            <span className="text-sm font-semibold text-gray-700">Workflow Context</span>
                            <span className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{filteredSections.local.length}</span>
                        </button>
                        {expanded['local'] && (
                            <div className="ml-6 space-y-0.5 mt-1 border-l border-gray-100 pl-2">
                                {filteredSections.local.map((item: any) => {
                                    let icon = Box;
                                    let color = "text-blue-500";
                                    if (item.source === 'workflow_input') { icon = Zap; color = "text-amber-500"; }
                                    else if (item.source === 'workflow_output') { icon = Workflow; color = "text-indigo-500"; }
                                    else if (item.source === 'workflow') { icon = Workflow; color = "text-purple-500"; }

                                    return renderRow({
                                        label: item.label,
                                        value: item.value,
                                        icon: icon,
                                        color: color,
                                        description: item.taskName,
                                        isMono: true
                                    });
                                })}
                            </div>
                        )}
                    </div>
                 )}

                 {/* Global Section */}
                 {Object.keys(filteredSections.globals).length > 0 && (
                    <div className="mb-2">
                        <button onClick={() => toggle('global')} className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded text-left transition-colors group">
                            <ChevronRight size={14} className={`transition-transform text-gray-400 group-hover:text-gray-600 ${expanded['global'] ? 'rotate-90' : ''}`} />
                            <Globe size={14} className="text-green-500"/>
                            <span className="text-sm font-semibold text-gray-700">Global Variables</span>
                        </button>
                        {expanded['global'] && (
                            <div className="ml-2 pl-2 border-l border-gray-100 mt-1 space-y-1">
                                {Object.entries(filteredSections.globals).map(([group, vars]) => (
                                    <div key={group} className="mb-2">
                                        <div className="px-2 py-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1.5">
                                            <Folder size={10}/> {group}
                                        </div>
                                        <div className="pl-2 mt-1 space-y-0.5">
                                            {vars.map((v: any) => renderRow({
                                                label: v.name,
                                                value: `{{global.${v.name}}}`,
                                                icon: GlobeIcon,
                                                color: "text-green-500",
                                                description: `Global: ${group}`,
                                                isMono: true
                                            }))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                 )}

                 {/* System Sections */}
                 {filteredSections.system.map(section => (
                    <div key={section.id} className="mb-2">
                        <button onClick={() => toggle(section.id)} className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded text-left transition-colors group">
                            <ChevronRight size={14} className={`transition-transform text-gray-400 group-hover:text-gray-600 ${expanded[section.id] ? 'rotate-90' : ''}`} />
                            <section.icon size={14} className="text-purple-500"/>
                            <span className="text-sm font-semibold text-gray-700">{section.label}</span>
                        </button>
                        {expanded[section.id] && (
                            <div className="ml-6 space-y-0.5 mt-1 border-l border-gray-100 pl-2">
                                {section.items.map((item: any) => renderRow({
                                    label: item.label,
                                    value: item.value,
                                    icon: item.icon || section.icon,
                                    description: item.description || section.label,
                                    color: section.id === 'utils' ? 'text-indigo-500' : 'text-purple-500'
                                }))}
                            </div>
                        )}
                    </div>
                 ))}

                 {searchQuery && filteredSections.local.length === 0 && Object.keys(filteredSections.globals).length === 0 && filteredSections.system.length === 0 && (
                     <div className="p-8 text-center">
                         <Search size={32} className="mx-auto text-gray-200 mb-2" />
                         <p className="text-xs text-gray-400 font-medium">No variables match your search</p>
                     </div>
                 )}
             </div>
        </div>
    );
}
