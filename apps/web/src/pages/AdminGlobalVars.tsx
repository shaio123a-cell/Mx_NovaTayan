import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { globalVarsApi } from '../api/globalVars';
import { Plus, Search, Trash2, Edit2, Zap, Lock, Folder, ChevronDown, ChevronRight, MoreVertical, X, LayoutGrid } from 'lucide-react';

export default function AdminGlobalVars() {
    const queryClient = useQueryClient();
    
    // UI State
    const [isEditing, setIsEditing] = useState(false);
    const [isManagingGroups, setIsManagingGroups] = useState(false);
    const [editingVar, setEditingVar] = useState<any>(null);
    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ 'Ungrouped': true });

    // Data Fetching
    const { data: vars, isLoading } = useQuery({
        queryKey: ['globalVars'],
        queryFn: globalVarsApi.getAll,
    });

    const { data: groups, isLoading: isLoadingGroups } = useQuery({
        queryKey: ['globalVarGroups'],
        queryFn: globalVarsApi.getGroups,
    });

    // Mutations - Variables
    const createMutation = useMutation({
        mutationFn: globalVarsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['globalVars'] });
            queryClient.invalidateQueries({ queryKey: ['globalVarGroups'] }); 
            setIsEditing(false);
            setEditingVar(null);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => globalVarsApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['globalVars'] });
            queryClient.invalidateQueries({ queryKey: ['globalVarGroups'] });
            setIsEditing(false);
            setEditingVar(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: globalVarsApi.delete,
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['globalVars'] });
        },
    });

    // Mutations - Groups
    const createGroupMutation = useMutation({
        mutationFn: globalVarsApi.createGroup,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['globalVarGroups'] }),
    });

    const updateGroupMutation = useMutation({
        mutationFn: ({ name, data }: { name: string; data: any }) => globalVarsApi.updateGroup(name, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['globalVarGroups'] });
            queryClient.invalidateQueries({ queryKey: ['globalVars'] }); // Variables might have changed group name
            setEditingGroup(null);
        },
    });

    const deleteGroupMutation = useMutation({
        mutationFn: globalVarsApi.deleteGroup,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['globalVarGroups'] }),
    });

    // Handlers
    const handleVarSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data: any = {
            name: formData.get('name'),
            value: formData.get('value'),
            type: formData.get('type') || 'string',
            group: formData.get('group'),
            description: formData.get('description'),
        };

        if (editingVar?.id) {
            data.version = editingVar.version;
            updateMutation.mutate({ id: editingVar.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleGroupSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const name = formData.get('name') as string;
        if(name) {
            createGroupMutation.mutate({ name, description: '' });
            (form.elements.namedItem('name') as HTMLInputElement).value = '';
        }
    };

    const handleEditGroupSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const name = formData.get('name') as string;
        if(name && editingGroup) {
            updateGroupMutation.mutate({ name: editingGroup.name, data: { name } });
        }
    };

    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    // Processing & Grouping
    const groupedVars = useMemo(() => {
        if (!vars) return {};
        
        // Ensure all explicit groups exist in the map
        const map: Record<string, any[]> = {};
        groups?.forEach((g: any) => { map[g.name] = []; });
        map['Ungrouped'] = [];

        // Distribute vars
        vars.forEach((v: any) => {
            if (search && 
                !v.name.toLowerCase().includes(search.toLowerCase()) && 
                !v.group?.toLowerCase().includes(search.toLowerCase())
            ) return; // Skip if filtered out

            const g = v.group || 'Ungrouped';
            if (!map[g]) map[g] = [];
            map[g].push(v);
        });

        return map;
    }, [vars, groups, search]);

    if (isLoading) return <div className="p-8 text-center text-gray-400 animate-pulse">Loading variables...</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-xl shadow-sm border border-blue-100">
                        <Zap className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Global Variables</h1>
                        <p className="text-gray-500 text-sm">Manage environment-wide constants and secrets</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                         onClick={() => setIsManagingGroups(true)}
                         className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium text-sm"
                    >
                        <Folder className="w-4 h-4" />
                        Manage Groups
                    </button>
                    <button 
                        onClick={() => { setEditingVar({}); setIsEditing(true); }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Variable
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search variables..." 
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-200 text-sm shadow-sm transition-all"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Grouped Lists */}
            <div className="space-y-4">
                {Object.entries(groupedVars).map(([groupName, groupVars]: [string, any[]]) => {
                    if (search && groupVars.length === 0) return null;

                    const isExpanded = expandedGroups[groupName] !== false; 
                    
                    return (
                        <div key={groupName} className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
                            <button 
                                onClick={() => toggleGroup(groupName)}
                                className="w-full px-4 py-3 bg-gray-50/30 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-2 font-medium text-gray-700">
                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                    <Folder className="w-4 h-4 text-blue-400 fill-blue-50" />
                                    <span>{groupName}</span>
                                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{groupVars.length}</span>
                                </div>
                            </button>
                            
                            {isExpanded && (
                                <div className="divide-y divide-gray-100">
                                    {groupVars.length === 0 ? (
                                        <div className="px-6 py-8 text-center text-gray-400 text-sm italic">
                                            No variables in this group.
                                        </div>
                                    ) : (
                                        <table className="w-full text-left text-sm">
                                            <thead className="text-gray-400 font-medium text-xs uppercase tracking-wider bg-white">
                                               <tr>
                                                    <th className="px-6 py-2 w-1/4">Name</th>
                                                    <th className="px-6 py-2 w-1/3">Value</th>
                                                    <th className="px-6 py-2 w-24">Type</th>
                                                    <th className="px-6 py-2 text-right"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                            {groupVars.map(v => (
                                                <tr key={v.id} className="hover:bg-blue-50/30 transition-colors group">
                                                    <td className="px-6 py-3 font-medium text-gray-700 font-mono text-xs">{v.name}</td>
                                                    <td className="px-6 py-3 font-mono text-gray-600 text-xs">
                                                        {v.isSecret || v.type === 'secret' ? 
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 text-amber-600 border border-amber-100">
                                                                <Lock className="w-3 h-3" /> Encrypted
                                                            </span> : 
                                                            <span className="truncate max-w-xs block" title={v.value}>{v.value}</span>
                                                        }
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 border border-gray-200">
                                                            {v.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => { setEditingVar(v); setIsEditing(true); }}
                                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => deleteMutation.mutate(v.id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Manage Groups Modal */}
            {isManagingGroups && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900">Manage Groups</h3>
                            <button onClick={() => setIsManagingGroups(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6">
                            {editingGroup ? (
                                <form onSubmit={handleEditGroupSubmit} className="space-y-4 animate-in slide-in-from-bottom-2 duration-200">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rename Group</label>
                                        <input name="name" defaultValue={editingGroup.name} required className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100/50 text-sm" />
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">Save Changes</button>
                                        <button type="button" onClick={() => setEditingGroup(null)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium text-sm">Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <form onSubmit={handleGroupSubmit} className="flex gap-2 mb-6">
                                        <input name="name" placeholder="New Group Name" required className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100/50 text-sm" />
                                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">Add</button>
                                    </form>
                                    
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                        {groups?.map((g: any) => (
                                            <div key={g.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-white hover:shadow-sm hover:border-blue-100 border border-transparent transition-all">
                                                <div className="flex items-center gap-3">
                                                    <Folder className="w-4 h-4 text-blue-400" />
                                                    <span className="font-medium text-gray-700 text-sm">{g.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => setEditingGroup(g)}
                                                        className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                                                        title="Rename Group"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {g.isDefined ? (
                                                        <button 
                                                            onClick={() => deleteGroupMutation.mutate(g.name)}
                                                            className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                                                            title="Delete Group"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Implicit</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {groups?.length === 0 && <div className="text-center text-gray-400 text-sm">No groups defined.</div>}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Variable Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900">{editingVar?.id ? 'Edit Variable' : 'Create Variable'}</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={handleVarSubmit} className="p-6 space-y-4">
                           <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Name</label>
                                <input name="name" defaultValue={editingVar?.name} required placeholder="global.apiKey" className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100/50 font-mono text-sm" />
                           </div>
                           <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Group</label>
                                <div className="relative">
                                    <input 
                                        name="group" 
                                        list="groupsList"
                                        defaultValue={editingVar?.group} 
                                        placeholder="Select or type group name" 
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100/50 text-sm" 
                                    />
                                    <datalist id="groupsList">
                                        {groups?.map((g: any) => <option key={g.name} value={g.name} />)}
                                    </datalist>
                                </div>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                               <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Type</label>
                                    <select name="type" defaultValue={editingVar?.type || 'string'} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100/50 text-sm bg-white cursor-pointer">
                                        <option value="string">String</option>
                                        <option value="number">Number</option>
                                        <option value="boolean">Boolean</option>
                                        <option value="json">JSON</option>
                                        <option value="secret">Secret</option>
                                    </select>
                               </div>
                           </div>
                           <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Value</label>
                                <textarea name="value" defaultValue={editingVar?.type === 'secret' && editingVar?.id ? '***' : editingVar?.value} required className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100/50 font-mono text-sm h-24" />
                                {editingVar?.type === 'secret' && <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><Lock className="w-3 h-3"/> Values are encrypted. Enter new value to update.</p>}
                           </div>
                           <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                                <input name="description" defaultValue={editingVar?.description} className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100/50 text-sm" />
                           </div>
                           
                           <div className="pt-4 flex justify-end gap-3 border-t border-gray-50 mt-2">
                               <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium text-sm transition-colors">Cancel</button>
                               <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm shadow-sm hover:shadow transition-all">Save Variable</button>
                           </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
