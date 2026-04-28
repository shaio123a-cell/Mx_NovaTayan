import { useState, useEffect, useRef } from 'react';
import { VariableTransformerDrawer } from './VariableTransformerDrawer';
import { VariablePicker } from './VariablePicker';
import { VariableAwareInput } from './VariableAwareInput';
import { ArrowUp, ArrowDown, Trash2, Edit2, Zap, MoreVertical, Globe, Library, Eye, Plus, Check, Shield, RotateCcw } from 'lucide-react';

export interface VariableManagerProps {
  value: Record<string, any>;
  onChange: (vars: Record<string, any>) => void;
  usedNames?: string[];
  availableUpstreamVars?: (string | { name: string, taskName: string, value?: any, source?: 'workflow' | 'task' | 'workflow_input' | 'workflow_output' })[];
  forceWorkflowScope?: boolean;
  inheritedNames?: string[];
  showWorkflowInputToggle?: boolean;
  hideAdd?: boolean;
  lockedNames?: string[];
  overriddenNames?: string[];
  onResetOverride?: (name: string) => void;
}

export function VariableManager({ value, onChange, usedNames = [], availableUpstreamVars = [], forceWorkflowScope = false, inheritedNames = [], showWorkflowInputToggle = false, hideAdd = false, lockedNames = [], overriddenNames = [], onResetOverride }: VariableManagerProps) {
  const [newVar, setNewVar] = useState('');
  const [newVal, setNewVal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [scopes, setScopes] = useState<Record<string, string>>({});
  const [newScope, setNewScope] = useState<'LOCAL'|'WORKFLOW'|'GLOBAL'>('WORKFLOW');
  const [openTransformerFor, setOpenTransformerFor] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showVarPicker, setShowVarPicker] = useState(false);
  const [useParentInput, setUseParentInput] = useState(false);
  
  // Refs for focusing and inserting variables
  const newValInputRef = useRef<any>(null);
  const transformerInputRef = useRef<any>(null); // To be passed to drawer if needed, but for now just newVal
  const [pickerTarget, setPickerTarget] = useState<'newVal' | 'transformer'>('newVal');

  // Derive variable names in order
  const [orderedNames, setOrderedNames] = useState<string[]>([]);

  useEffect(() => {
    const rawScopes = (value && (value.__scopes || {})) || {};
    setScopes(rawScopes);
    
    // Determine order: ALWAYS inherited first, then overlay
    let names = Object.keys(value || {}).filter(k => k !== '__scopes' && k !== '__order');
    
    // Separate inherited and overlay variables
    const inherited = names.filter(n => inheritedNames.includes(n));
    const overlay = names.filter(n => !inheritedNames.includes(n));
    
    // For overlay variables, use the saved order if it exists
    let orderedOverlay = overlay;
    if (value && value.__order && Array.isArray(value.__order)) {
        // Filter __order to only include overlay variables that still exist
        const savedOverlayOrder = value.__order.filter((n: string) => overlay.includes(n));
        // Add any new overlay variables not in the saved order
        const newOverlay = overlay.filter(n => !value.__order.includes(n));
        orderedOverlay = [...savedOverlayOrder, ...newOverlay];
    }
    
    // Final order: inherited first, then ordered overlay
    names = [...inherited, ...orderedOverlay];
    setOrderedNames(names);
  }, [value, inheritedNames.join(',')]);

  const updateParent = (names: string[], currentScopes: any, currentVars: any) => {
    // Filter order to only include non-inherited variables
    const filteredOrder = names.filter(n => !inheritedNames.includes(n));
    // Filter scopes to only include non-inherited variables
    const filteredScopes: Record<string, string> = {};
    Object.keys(currentScopes).forEach(k => {
      if (!inheritedNames.includes(k)) {
        filteredScopes[k] = currentScopes[k];
      }
    });
    
    const next = { ...currentVars, __order: filteredOrder, __scopes: filteredScopes };
    onChange(next);
  };

  const handleAdd = () => {
    if (!newVar.trim()) return;
    const name = newVar.trim();
    if ((usedNames.includes(name) || inheritedNames.includes(name)) && editingName !== name) {
      setError('Name already used or inherited from task');
      return;
    }
    const hasExisting = Object.keys(value).includes(name);
    if (!editingName && hasExisting) {
      setError('Variable name must be unique');
      return;
    }

    setError(null);
    const copy = { ...value } as Record<string, any>;
    
    // Preserve old val definition if editing and newVal is empty
    let finalVal: any = newVal;
    if (editingName && !newVal && typeof value[editingName] === 'object' && value[editingName].valueMode === 'transformer') {
        finalVal = value[editingName];
    }

    if (editingName && editingName !== name) {
      delete copy[editingName];
    }
    
    // Assign value
    if (useParentInput) {
        copy[name] = { valueMode: 'parent', useParentInput: true };
    } else {
        copy[name] = finalVal;
    }
    
    // Update scopes
    const newScopes = { ...scopes };
    if (editingName && editingName !== name) {
        newScopes[name] = scopes[editingName] || newScope;
        delete newScopes[editingName];
    } else {
        newScopes[name] = newScope;
    }

    // Update names order
    let nextNames = [...orderedNames];
    if (editingName) {
        const idx = nextNames.indexOf(editingName);
        if (idx !== -1) nextNames[idx] = name;
    } else {
        if (!nextNames.includes(name)) nextNames.push(name);
    }

    updateParent(nextNames, newScopes, copy);
    
    setNewVar('');
    setNewVal('');
    setNewScope('WORKFLOW');
    setEditingName(null);
    setUseParentInput(false);
  };

  const handleDelete = (name: string) => {
    const copy = { ...value };
    delete copy[name];
    const newScopes = { ...scopes };
    delete newScopes[name];
    const nextNames = orderedNames.filter(n => n !== name);
    updateParent(nextNames, newScopes, copy);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const nextNames = [...orderedNames];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= nextNames.length) return;
    
    const temp = nextNames[index];
    nextNames[index] = nextNames[target];
    nextNames[target] = temp;
    
    updateParent(nextNames, scopes, value);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const nextNames = [...orderedNames];
    const item = nextNames[draggedIndex];
    nextNames.splice(draggedIndex, 1);
    nextNames.splice(index, 0, item);
    
    setOrderedNames(nextNames); // Visual update only
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    updateParent(orderedNames, scopes, value);
    setDraggedIndex(null);
  };

  const handleEdit = (name: string) => {
    setEditingName(name);
    setNewVar(name);
    const val = value[name];
    if (typeof val === 'object' && val.valueMode === 'transformer') {
         setNewVal(''); // Values are set via transformer drawer
         setNewScope((scopes[name] as any) || (val.transformer?.scope as any) || 'WORKFLOW');
    } else {
         const isParent = typeof val === 'object' && val.valueMode === 'parent';
         setUseParentInput(isParent);
         setNewVal(isParent ? '' : String(val));
         setNewScope((scopes[name] as any) || 'WORKFLOW');
    }
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingName(null);
    setNewVar('');
    setNewVal('');
    setNewScope(forceWorkflowScope ? 'WORKFLOW' : 'LOCAL');
    setUseParentInput(false);
    setError(null);
  };

  const getUsages = (name: string) => {
    const usages: string[] = [];
    Object.entries(value).forEach(([vName, vDef]: [string, any]) => {
      if (vName === '__scopes' || vName === '__order') return;
      if (vDef?.transformer?.inputSource === 'variable' && vDef?.transformer?.inputVariable === name) {
        usages.push(vName);
      }
    });
    return usages;
  };

  const handleSafeDelete = (name: string) => {
    const usages = getUsages(name);
    if (usages.length > 0) {
      if (!window.confirm(`Variable "${name}" is used as input for: ${usages.join(', ')}. deleting it might break their transformations. Delete anyway?`)) {
        return;
      }
    }
    handleDelete(name);
  };

  return (
    <div style={{ marginTop: 24 }} className="space-y-4">

      {/* Add/Edit Form */}
      {(!hideAdd || editingName) && (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex gap-3 items-end">
            <div className={`flex-1 ${ (editingName && inheritedNames.includes(editingName)) || (editingName && lockedNames.includes(editingName)) ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block">NAME</label>
                <input
                    placeholder="e.g. user_id"
                    value={newVar}
                    onChange={e => setNewVar(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-mono"
                    readOnly={editingName && lockedNames.includes(editingName)}
                />
            </div>
            <div className={`flex-1 transition-all duration-300 ${useParentInput ? 'opacity-30 pointer-events-none' : ''}`}>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block">DIRECT VALUE</label>
                <div className="relative">
                    <VariableAwareInput
                        ref={newValInputRef}
                        placeholder={useParentInput ? "Supplied By Parent" : "Omit if using transformer"}
                        value={newVal}
                        onValueChange={setNewVal}
                        availableVars={availableUpstreamVars}
                        onInsertClick={!useParentInput ? () => {
                            setPickerTarget('newVal');
                            setShowVarPicker(true);
                        } : undefined}
                    />
                </div>
            </div>
            {showWorkflowInputToggle && (
                <div className="flex flex-col justify-end">
                    <label className="text-[10px] font-bold text-gray-400 mb-2 block uppercase tracking-tighter">Workflow Input</label>
                    <button 
                        onClick={() => setUseParentInput(!useParentInput)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-black text-[9px] transition-all border ${useParentInput ? 'bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-100' : 'bg-white border-slate-200 text-slate-400 hover:border-amber-200 hover:text-amber-500'}`}
                    >
                        {useParentInput ? <Check size={12}/> : <ArrowUp size={12}/>}
                        {useParentInput ? 'PARENT INPUT ENABLED' : 'USE PARENT INPUT'}
                    </button>
                </div>
            )}
              <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-1 block">SCOPE</label>
                  <select 
                      value={newScope} 
                      onChange={e => setNewScope(e.target.value as any)} 
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white outline-none cursor-pointer"
                  >
                      <option value="LOCAL">Local</option>
                      <option value="WORKFLOW">Workflow</option>
                      {!forceWorkflowScope && <option value="GLOBAL">Global</option>}
                  </select>
              </div>
            <div className="flex gap-2">
                <button 
                    onClick={handleAdd} 
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-sm ${editingName ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                    {editingName ? <Edit2 size={16}/> : <Zap size={16}/>}
                    {editingName ? 'Update' : 'Add Var'}
                </button>
                {editingName && (
                    <button 
                        onClick={handleCancelEdit}
                        className="px-4 py-2 rounded-lg font-bold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all border border-gray-200"
                    >
                        Cancel
                    </button>
                )}
            </div>
          </div>
          {error && <div className="text-xs text-red-500 font-bold px-1">{error}</div>}
        </div>
      )}

      {/* Table / List with DND */}
      <div className="border border-gray-200 rounded-xl overflow-x-auto bg-white shadow-sm">
        <table className="w-full text-sm border-collapse table-fixed min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="w-12"></th>
                    <th className="text-left px-4 py-3 text-[10px] font-extrabold text-gray-400 uppercase w-1/4">Name</th>
                    <th className="text-left px-4 py-3 text-[10px] font-extrabold text-gray-400 uppercase w-2/5">Value / Source</th>
                    {!forceWorkflowScope && <th className="text-left px-4 py-3 text-[10px] font-extrabold text-gray-400 uppercase w-[15%]">Scope</th>}
                    <th className="text-left px-4 py-3 text-[10px] font-extrabold text-gray-400 uppercase w-2/5">Value / Strategy</th>
                </tr>
            </thead>
            <tbody>
                {orderedNames.map((name, index) => {
                    const val = value[name];
                    const isTransformer = typeof val === 'object' && val.valueMode === 'transformer';
                    const scope = scopes[name] || 'LOCAL';
                    const isInherited = inheritedNames.includes(name);
                    const isOverridden = overriddenNames.includes(name);
                    const isLocked = lockedNames.includes(name);
                    
                    return (
                        <tr 
                            key={name}
                            draggable={!isInherited}
                            onDragStart={(e) => !isInherited && handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={!isInherited ? handleDragEnd : undefined}
                            className={`border-b last:border-0 transition-colors group ${
                                isInherited && !isOverridden ? 'bg-indigo-50/20' : 'hover:bg-blue-50/30'
                            } ${draggedIndex === index ? 'opacity-30' : ''}`}
                        >
                            <td className="text-center">
                                {!isInherited ? (
                                    <div className="flex flex-col items-center cursor-move text-gray-300 group-hover:text-gray-400">
                                        <MoreVertical size={16} />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-indigo-300" title="Inherited from Task Library">
                                        <Globe size={14} className="opacity-50" />
                                    </div>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <div className={`font-mono font-bold truncate flex items-center gap-2 ${isInherited ? 'text-indigo-600' : 'text-gray-700'}`} title={name}>
                                    {name}
                                    {isInherited && !isOverridden && <span className="text-[8px] bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded uppercase tracking-tighter">Library</span>}
                                    {isOverridden && <span className="text-[8px] bg-amber-100 text-amber-600 px-1 py-0.5 rounded uppercase tracking-tighter shadow-sm border border-amber-200">Overlay Active</span>}
                                    {isLocked && <span className="text-[8px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded uppercase tracking-tighter font-black flex items-center gap-1"><Shield size={8}/> IN USE</span>}
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                {isTransformer ? (
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border uppercase tracking-tight shrink-0 ${
                                            isInherited ? 'bg-white text-indigo-400 border-indigo-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                                        }`}>
                                            {val.transformer?.type || 'spec'}
                                        </span>
                                        {val.transformer?.inputVariable && (
                                            <span className="text-[10px] text-gray-400 font-mono truncate">← {val.transformer.inputVariable}</span>
                                        )}
                                    </div>
                                ) : (typeof val === 'object' && val.valueMode === 'parent') ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                                            External Payload Entry
                                        </span>
                                    </div>
                                ) : (
                                    <div className="font-mono text-gray-500 text-xs truncate w-full">{String(val)}</div>
                                )}
                            </td>
                            {!forceWorkflowScope && (
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                        {isInherited ? <Library size={12} className="text-indigo-500" /> : 
                                        scope === 'WORKFLOW' ? <Zap size={12} className="text-orange-500" fill="currentColor" /> : 
                                        <Globe size={12} className="text-blue-500" />
                                        }
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${
                                            isInherited && !isOverridden ? 'bg-indigo-100/50 text-indigo-500 italic' :
                                            isOverridden ? 'bg-amber-100 text-amber-600 font-bold' :
                                            scope === 'WORKFLOW' ? 'bg-orange-100 text-orange-600' :
                                            'bg-blue-100 text-blue-600'
                                        }`}>
                                            {isOverridden ? 'OVERRIDDEN' : (isInherited ? 'LIBRARY DEFAULT' : scope)}
                                        </span>
                                    </div>
                                </td>
                            )}
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1">
                                        {!isInherited && (
                                            <>
                                                <button onClick={() => handleMove(index, 'up')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all" title="Move Up">
                                                    <ArrowUp size={14} />
                                                </button>
                                                <button onClick={() => handleMove(index, 'down')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all" title="Move Down">
                                                    <ArrowDown size={14} />
                                                </button>
                                                <div className="w-px h-5 bg-gray-200 mx-2"></div>
                                            </>
                                        )}
                                        <button 
                                            onClick={() => setOpenTransformerFor(name)} 
                                            disabled={typeof val === 'object' && val.valueMode === 'parent'}
                                            className={`p-2 rounded-lg transition-all border border-transparent ${typeof val === 'object' && val.valueMode === 'parent' ? 'text-gray-200 cursor-not-allowed' : 'text-blue-500 hover:bg-blue-50 hover:border-blue-200'}`} 
                                            title="Config Transformer"
                                        >
                                            <Zap size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleEdit(name)} 
                                            className={`p-2 rounded-lg transition-all border border-transparent text-amber-500 hover:bg-amber-50 hover:border-amber-200`} 
                                            title={isLocked ? "Variable interface locked - renaming blocked, but value can be updated" : "Edit Value"}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        {isInherited && isOverridden && (
                                            <button 
                                                onClick={() => onResetOverride && onResetOverride(name)} 
                                                className={`p-2 rounded-lg transition-all border border-transparent text-gray-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200`} 
                                                title="Reset to Library Default"
                                            >
                                                <RotateCcw size={14} />
                                            </button>
                                        )}
                                        {!isInherited && (
                                            <button 
                                                onClick={() => handleSafeDelete(name)} 
                                                disabled={isLocked}
                                                className={`p-2 rounded-lg transition-all border border-transparent ${isLocked ? 'text-gray-200 cursor-not-allowed' : 'text-red-500 hover:bg-red-50 hover:border-red-200'}`} 
                                                title={isLocked ? "Variable used by dependents - deletion blocked" : "Delete"}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
        {orderedNames.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-xs italic">
                No variables defined for this task.
            </div>
        )}
      </div>

      <VariableTransformerDrawer
        open={!!openTransformerFor}
        readOnly={false}
        name={openTransformerFor || ''}
        initial={openTransformerFor ? (value[openTransformerFor]?.transformer || null) : null}
        variables={(() => {
            const idx = orderedNames.indexOf(openTransformerFor || '');
            const internalAbove = idx !== -1 ? orderedNames.slice(0, idx) : orderedNames;
            return Array.from(new Set([...internalAbove, ...availableUpstreamVars]));
        })()}
        showWorkflowInputToggle={showWorkflowInputToggle}
        onClose={() => setOpenTransformerFor(null)}
        onSave={(t: any) => {
            if (openTransformerFor) {
                const copy = { ...value };
                copy[openTransformerFor] = { valueMode: 'transformer', transformer: t };
                updateParent(orderedNames, scopes, copy);
                setOpenTransformerFor(null);
            }
        }}
      />
      
      {showVarPicker && (
          <div className="fixed inset-0 z-[1000000] flex justify-end">
              <div className="absolute inset-0 bg-black/20" onClick={() => setShowVarPicker(false)} />
              <div className="relative w-80 h-full">
                <VariablePicker 
                    onSelect={(v) => {
                        if (pickerTarget === 'newVal' && newValInputRef.current) {
                            newValInputRef.current.insertTextAtCursor(v);
                        } else {
                            // Fallback if ref or target not set
                            setNewVal(prev => prev + v);
                        }
                        setShowVarPicker(false);
                    }} 
                    onClose={() => setShowVarPicker(false)} 
                    localVars={(() => {
                        return Array.from(new Set([...orderedNames, ...availableUpstreamVars]));
                    })()}
                />
              </div>
          </div>
      )}
    </div>
  );
}
