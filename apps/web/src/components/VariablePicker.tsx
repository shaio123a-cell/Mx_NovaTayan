import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { globalVarsApi } from '../api/globalVars';
import { ChevronRight, Globe, Box, Workflow, X, Zap, Folder, Search } from 'lucide-react';

type VarSource = { name: string, taskName: string };

export function VariablePicker({ onSelect, onClose, localVars = [] }: { onSelect: (v: string) => void, onClose: () => void, localVars?: (string | VarSource)[] }) {
    const { data: globalVars } = useQuery({ queryKey: ['globalVars'], queryFn: globalVarsApi.getAll });
    const [searchQuery, setSearchQuery] = useState('');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'global': false, 'task': false, 'workflow': false, 'local': true, 'macros': false, 'utils': false });

    const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

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
                { label: 'executionId', value: '{{workflow.executionId}}' }
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
                { label: 'Last Body', value: '{{HTTP.last.body}}' },
                { label: 'Last Status', value: '{{HTTP.last.status}}' }
            ]
        },
        {
            id: 'utils',
            label: 'Utility Helpers',
            icon: Folder,
            items: [
                { label: 'Upper Case', value: '{{ value | upper }}' },
                { label: 'Lower Case', value: '{{ value | lower }}' },
                { label: 'JSON Path', value: '{{ payload | jsonPath:$.token }}' },
                { label: 'Coalesce', value: '{{ val1 | coalesce:val2,fallback }}' },
                { label: 'To JSON', value: '{{ obj | toJson }}' },
                { label: 'From JSON', value: '{{ str | fromJson }}' },
                { label: 'Base64 Enc', value: '{{ x | base64enc }}' },
                { label: 'URL Enc', value: '{{ x | urlenc }}' },
                { label: 'SHA256', value: '{{ x | sha256 }}' }
            ]
        }
    ];

    const filteredSections = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        
        // Process Local Vars (Extracted in Task)
        const normalizedLocal = (localVars || []).filter(Boolean).map(v => {
            if (typeof v === 'string') return { label: v, value: `{{${v}}}`, taskName: 'Current Task' };
            const varObj = v as VarSource;
            return { label: varObj.name || 'Unknown', value: `{{${varObj.name || ''}}}`, taskName: varObj.taskName || 'Task' };
        }).filter(v => v.label.toLowerCase().includes(query) || v.taskName.toLowerCase().includes(query));

        // Process Global Vars
        const filteredGlobals: Record<string, any[]> = {};
        Object.entries(groupedGlobalVars).forEach(([group, vars]) => {
            const matches = vars.filter((v: any) => v.name.toLowerCase().includes(query));
            if (matches.length > 0) filteredGlobals[group] = matches;
        });

        // Process System Sections
        const filteredSystem = systemSections.map(s => ({
            ...s,
            items: s.items.filter(i => i.label.toLowerCase().includes(query))
        })).filter(s => s.items.length > 0);

        return {
            local: normalizedLocal,
            globals: filteredGlobals,
            system: filteredSystem
        };
    }, [searchQuery, localVars, groupedGlobalVars]);

    // Automatically expand sections with results when searching
    useEffect(() => {
        if (searchQuery.length > 1) {
            setExpanded({
                local: filteredSections.local.length > 0,
                global: Object.keys(filteredSections.globals).length > 0,
                task: filteredSections.system.some(s => s.id === 'task'),
                workflow: filteredSections.system.some(s => s.id === 'workflow'),
                macros: filteredSections.system.some(s => s.id === 'macros'),
                utils: filteredSections.system.some(s => s.id === 'utils')
            });
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
                 
                 {/* Local / Upstream Section */}
                 {filteredSections.local.length > 0 && (
                    <div className="mb-2">
                        <button onClick={() => toggle('local')} className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded text-left transition-colors group">
                            <ChevronRight size={14} className={`transition-transform text-gray-400 group-hover:text-gray-600 ${expanded['local'] ? 'rotate-90' : ''}`} />
                            <Box size={14} className="text-blue-500"/>
                            <span className="text-sm font-semibold text-gray-700">Extracted in Tasks</span>
                            <span className="ml-auto text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{filteredSections.local.length}</span>
                        </button>
                        {expanded['local'] && (
                            <div className="ml-6 space-y-1 mt-1 border-l border-gray-100 pl-2">
                                {filteredSections.local.map((item: any) => (
                                    <button 
                                        key={item.value} 
                                        onClick={() => onSelect(item.value)} 
                                        className="w-full text-left text-xs text-gray-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded transition-all group/item relative"
                                        title={`${item.value}\nSource: ${item.taskName}`}
                                    >
                                        <div className="font-mono font-bold truncate">{item.label}</div>
                                        <div className="text-[9px] text-gray-400 font-medium truncate uppercase tracking-tighter mt-0.5 group-hover/item:text-blue-400">
                                            {item.taskName}
                                        </div>
                                    </button>
                                ))}
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
                                            {vars.map((v: any) => (
                                                <button key={v.id} onClick={() => onSelect(`{{global.${v.name}}}`)} className="w-full text-left text-xs text-gray-600 hover:text-green-700 hover:bg-green-50 p-1.5 rounded transition-colors truncate font-mono">
                                                    {v.name}
                                                </button>
                                            ))}
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
                            <div className="ml-6 space-y-1 mt-1 border-l border-gray-100 pl-2">
                                {section.items.map((item: any) => (
                                    <button key={item.value} onClick={() => onSelect(item.value)} className="w-full text-left text-xs text-gray-600 hover:text-purple-700 hover:bg-purple-50 p-1.5 rounded transition-colors truncate font-mono" title={item.value}>
                                        {item.label}
                                    </button>
                                ))}
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
