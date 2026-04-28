import { useState, useMemo } from 'react';
import { X, Search, Calculator, Type, Hash, Clock, Code, List, Settings, ChevronRight } from 'lucide-react';

import { ACTIONS, ACTION_CATEGORIES } from '../constants/action_definitions';
import type { ActionItem } from '../constants/action_definitions';

export function ActionPicker({ onSelect, onClose }: { onSelect: (template: string) => void, onClose: () => void }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({
        math: true, string: true, collection: true, date: true, conversion: true, advanced: false
    });

    const filteredActions = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        return ACTIONS.filter(a => 
            a.label.toLowerCase().includes(query) || 
            a.description.toLowerCase().includes(query) ||
            a.category.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    const toggle = (cat: string) => setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));

    return (
        <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-2xl flex flex-col z-[100001] animate-in slide-in-from-right duration-200"
        >
             <div className="p-4 border-b border-gray-100 flex flex-col gap-3 bg-gray-50/80 backdrop-blur-sm">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                        <Calculator size={16} className="text-blue-600"/>
                        Add Action
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded transition-colors"><X size={16}/></button>
                </div>
                
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input
                        type="text"
                        autoFocus
                        placeholder="Search actions (e.g. count, sum)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                    />
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                 {ACTION_CATEGORIES.map(cat => {
                     const items = filteredActions.filter(a => a.category === cat.id);
                     if (items.length === 0) return null;

                     return (
                        <div key={cat.id} className="space-y-1">
                            <button onClick={() => toggle(cat.id)} className="w-full flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded text-left transition-colors group">
                                <ChevronRight size={14} className={`transition-transform text-gray-400 group-hover:text-gray-600 ${expanded[cat.id] ? 'rotate-90' : ''}`} />
                                <cat.icon size={14} className={cat.color}/>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{cat.label}</span>
                            </button>
                            
                            {expanded[cat.id] && (
                                <div className="grid grid-cols-1 gap-1 pl-2 border-l border-gray-100 ml-3">
                                    {items.map(action => (
                                        <button 
                                            key={action.id}
                                            onClick={() => onSelect(action.template)}
                                            className="w-full text-left p-2 rounded-lg hover:bg-blue-50 group/item transition-all border border-transparent hover:border-blue-100"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-gray-50 rounded group-hover/item:bg-white group-hover/item:shadow-sm transition-colors">
                                                    <action.icon size={12} className="text-gray-500 group-hover/item:text-blue-600" />
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="text-xs font-bold text-gray-700 group-hover/item:text-blue-700 truncate">{action.label}</div>
                                                    <div className="text-[10px] text-gray-400 truncate">{action.description}</div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                     );
                 })}

                 {searchQuery && filteredActions.length === 0 && (
                     <div className="p-8 text-center">
                         <Search size={32} className="mx-auto text-gray-200 mb-2" />
                         <p className="text-xs text-gray-400 font-medium">No actions match your search</p>
                     </div>
                 )}
             </div>

             <div className="p-3 bg-blue-50 border-t border-blue-100">
                <p className="text-[10px] text-blue-600 font-medium italic">
                    Tip: Actions are applied in sequence left-to-right.
                </p>
             </div>
        </div>
    );
}
