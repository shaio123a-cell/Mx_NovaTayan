import { useState, useEffect, useRef } from 'react';
import { Box, Plus, X, Zap, Play, ArrowUp } from 'lucide-react';
import { VariablePicker } from './VariablePicker';
import { VariableAwareInput } from './VariableAwareInput';
import { useQuery } from '@tanstack/react-query';
import { globalVarsApi } from '../api/globalVars';

// --- Main Drawer ---

export function VariableTransformerDrawer({ open, name, initial, variables = [], onClose, onSave, readOnly = false, showWorkflowInputToggle = false }: any) {
  const { data: globalVars } = useQuery({ queryKey: ['globalVars'], queryFn: globalVarsApi.getAll });
  // State
  const [tab, setTab] = useState<'none'|'constant'|'regex'|'jmespath'|'xpath'|'advanced'>('none');
  const [spec, setSpec] = useState('');
  
  // UX State
  const [inputSource, setInputSource] = useState<'task_output'|'variable'|'parent'>('task_output');
  const [inputVariable, setInputVariable] = useState<string>(''); // Stores {{...}} or raw var name? Lets assume raw for simplicity if from prop list, or {{}} if from picker.
  
  // Test State
  const [sample, setSample] = useState('');
  const [contextJson, setContextJson] = useState('{"global": { "env": "dev" }}');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Controls
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [showVarPicker, setShowVarPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'input'|'spec'>('spec'); // Where to insert variable?

  // Refs for focusing and inserting variables
  const inputVarRef = useRef<any>(null);
  const specInputRef = useRef<any>(null);

  useEffect(() => {
    if (initial) {
      setTab(initial.type || initial.transformType || 'jmespath');
      setSpec(initial.spec || initial.pattern || '');
      setInputSource(initial.inputSource || 'task_output');
      setInputVariable(initial.inputVariable || '');
      setSample(initial.sampleInput || '');
      setContextJson(initial.contextJson || '{"global": { "env": "dev" }}');
      setDirty(false);
    } else {
      setTab('none'); setSpec(''); setInputSource('task_output'); setInputVariable(''); setSample(''); setTestResult(null); setDirty(false);
    }
  }, [initial, open]);

  if (!open) return null;

  const handleVarSelect = (val: string) => {
      let toInsert = val;
      const target = pickerMode === 'spec' ? specInputRef.current : inputVarRef.current;
      const currentVal = (target?.value || '').trim();

      if (pickerMode === 'spec') {
          // Detect if we are adding a logic operational helper
          const isLogic = val.includes('|') || 
                          ['length', 'count', 'upper', 'lower', 'round'].some(k => val.toLowerCase().includes(k));
          
          if (!currentVal.includes('{{')) {
              if (currentVal === '') {
                  // Case 1: Empty field -> Wrap the item
                  toInsert = val.includes('{{') ? val : `{{ ${val.trim().replace(/^\| /,'')} }}`;
              } else if (isLogic) {
                  // Case 2: Naked text exists (like $.name) -> Scoop and wrap the WHOLE thing
                  const logicPart = val.startsWith(' ') || val.startsWith('|') ? val : ` | ${val}`;
                  const wrapped = `{{ ${currentVal}${logicPart} }}`;
                  setSpec(wrapped);
                  setDirty(true);
                  setShowVarPicker(false);
                  return;
              } else if (!val.includes('{{')) {
                  // Case 3: Naked var added to naked field (standard var insertion)
                  toInsert = `{{ ${val} }}`;
              }
          }
      }

      if (target) {
          target.insertTextAtCursor(toInsert);
      } else {
          // Fallback
          if (pickerMode === 'input') {
              setInputVariable(prev => prev + toInsert);
          } else {
              setSpec(prev => prev + toInsert);
          }
      }
      setDirty(true);
      setShowVarPicker(false);
  };

  const openPicker = (mode: 'input'|'spec') => {
      setPickerMode(mode);
      setShowVarPicker(true);
  };

  const runTest = async () => {
    setError(null); setTestResult(null);
    try {
      const input = sample || '';
      // Build context from Mock Json + Actual Global Vars
      let context: any = { global: {}, workflow: {}, task: {}, macros: {} };
      try {
          const mock = JSON.parse(contextJson);
          context = { ...context, ...mock };
          if (!context.macros) context.macros = {};
      } catch (e) {
          setError('Invalid Context JSON');
          return;
      }

      // Inject Current task mock data for testing
      if (!context.macros.Current) {
        let parsedSample = sample;
        try { 
            if (sample.trim().startsWith('{') || sample.trim().startsWith('[')) {
                parsedSample = JSON.parse(sample); 
            }
        } catch(e) {}
        
        context.macros.Current = {
            status: 200,
            body: parsedSample,
            headers: {}
        };
      }
      
      // Also provide a 'last' shortcut for convenience in testing
      if (!context.macros.last) {
          context.macros.last = context.macros.Current;
      }

      // 5. System mock data for macros
      if (!context.macros['workflow.name']) context.macros['workflow.name'] = 'Test Workflow';
      if (!context.macros['workflow.executionId']) context.macros['workflow.executionId'] = 'exec-test-123-abc';
      if (!context.macros['workflow.lastExecutionEpoch']) context.macros['workflow.lastExecutionEpoch'] = Math.floor(Date.now() / 1000) - 3600;
      if (!context.macros['workflow.lastSuccessEpoch']) context.macros['workflow.lastSuccessEpoch'] = Math.floor(Date.now() / 1000) - 7200;
      if (!context.macros['workflow.lastFailedEpoch']) context.macros['workflow.lastFailedEpoch'] = 0;
      if (!context.macros['workflow.lastSuccessDuration']) context.macros['workflow.lastSuccessDuration'] = 1250;
      if (!context.macros['task.name']) context.macros['task.name'] = name;
      if (!context.macros['task.id']) context.macros['task.id'] = 'node-test-123';

      // Ensure task and workflow objects are also semi-populated if not present
      if (!context.task) context.task = {};
      if (!context.task.name) context.task.name = name;
      if (!context.task.id) context.task.id = 'node-test-123';
      if (!context.workflow) context.workflow = {};
      if (!context.workflow.name) context.workflow.name = 'Test Workflow';
      if (!context.workflow.executionId) context.workflow.executionId = 'exec-test-123-abc';

      // Fill in actual global variables if not overridden by mock
      if (globalVars) {
          globalVars.forEach((gv: any) => {
              if (!context.global[gv.name]) {
                  context.global[gv.name] = gv.value;
              }
          });
      }

      // INITIALIZE ENGINE
      const { VariableEngine } = await import('shared-xform/variable_engine');
      const ve = new VariableEngine(context);
      let testInput = input;

      // ENGINE EXECUTION
      let result: any = null;
      let engineQuery = spec;
      let actions: string[] = [];

      // Extract actions if present
      const inner = spec.includes('{{') ? spec.match(/{{(.*?)}}/)?.[1] || spec : spec;
      const parts = inner.split('|').map(s => s.trim());
      engineQuery = parts[0];
      actions = parts.slice(1);

      if (tab === 'regex') {
        try {
            const re = new RegExp(engineQuery);
            const m = testInput.match(re);
            result = m ? (m[1] !== undefined ? m[1] : m[0]) : null;
        } catch (e: any) {
            setError('Regex Error: ' + e.message); return;
        }
      } else if (tab === 'jmespath') {
          try {
            let parsed = null;
            try { parsed = (typeof testInput === 'string' && (testInput.trim().startsWith('{') || testInput.trim().startsWith('['))) ? JSON.parse(testInput) : testInput; } catch(e) { parsed = testInput; }
            const sel: any = await import('shared-xform/xform_selectors_json');
            result = sel.evalExpr(parsed, engineQuery);
          } catch (e: any) {
            setError('JSONPath Error: ' + e.message); return;
          }
      } else if (tab === 'constant') {
          // If constant contains variables, resolve them first
          result = spec.includes('{{') ? ve.resolve(spec) : engineQuery;
      } else {
          // VARIABLE MODE: Resolve the base variable (e.g. 'epoch' or '$.name')
          result = ve.evaluateExpression(engineQuery);
      }

      // Apply Remaining Actions
      if (actions.length > 0) {
          try {
              // Apply actions to the result of the query
              // FIXED: Correctly merge macros so 'value' is not overwritten by context spread
              const veInternal = new VariableEngine({ 
                  ...context,
                  macros: { 
                      ...(context.macros || {}),
                      value: result 
                  } 
              });
              let actionChain = `value | ${actions.join(' | ')}`;
              result = veInternal.evaluateExpression(actionChain);
          } catch (e: any) {
              setError('Action Error: ' + e.message); return;
          }
      }

      setTestResult(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const handleSave = () => {
    onSave && onSave({ type: tab, spec, inputSource, inputVariable, sampleInput: sample, contextJson });
    setDirty(false);
  };

  const handleBackdropClick = () => {
    if (dirty) setConfirmClose(true);
    else onClose && onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999999, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={handleBackdropClick} />
      <div className="relative w-[800px] h-full bg-slate-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 z-10 font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-200 flex justify-between items-center shrink-0">
          <div>
            <h3 className="m-0 text-lg font-bold text-gray-800 flex items-center gap-2">
                <Box size={18} className="text-blue-600"/>
                {name}
            </h3>
            <div className="text-xs text-gray-500 mt-0.5">Define how this value is generated</div>
          </div>
          <div className="flex gap-2">
             <button onClick={() => { if (dirty) setConfirmClose(true); else onClose && onClose(); }} className="text-gray-400 hover:text-gray-700 transition-colors p-2 rounded hover:bg-gray-100">
                <X size={20} />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* 1. Input Source Selection */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">1. Input Source</h4>
                
                <div className="flex gap-4 items-center">
                    <button 
                        onClick={() => { if (!readOnly) { setInputSource('task_output'); setDirty(true); } }}
                        disabled={readOnly}
                        className={`flex-1 p-3 rounded-lg border text-left transition-all ${inputSource === 'task_output' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 bg-white'} ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        <div className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
                            <Box size={16} className={inputSource === 'task_output' ? 'text-blue-500' : 'text-gray-400'} />
                            Task Output
                        </div>
                        <div className="text-xs text-gray-500 mt-1 pl-6">Use the result of this task as input</div>
                    </button>         

                    <button 
                        onClick={() => { if (!readOnly) { setInputSource('variable'); setDirty(true); } }}
                        disabled={readOnly}
                        className={`flex-1 p-3 rounded-lg border text-left transition-all ${inputSource === 'variable' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-gray-200 hover:border-gray-300 bg-white'} ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        <div className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
                            <Zap size={16} className={inputSource === 'variable' ? 'text-purple-500' : 'text-gray-400'} />
                            Variable
                        </div>
                        <div className="text-xs text-gray-500 mt-1 pl-6">Use another variable as input</div>
                    </button>

                    {showWorkflowInputToggle && (
                        <button 
                            onClick={() => { if (!readOnly) { setInputSource('parent'); setDirty(true); } }}
                            disabled={readOnly}
                            className={`flex-1 p-3 rounded-lg border text-left transition-all ${inputSource === 'parent' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-gray-200 hover:border-gray-300 bg-white'} ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <div className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
                                <ArrowUp size={16} className={inputSource === 'parent' ? 'text-amber-500' : 'text-gray-400'} />
                                Parent Input
                            </div>
                            <div className="text-xs text-gray-500 mt-1 pl-6">Input from parent workflow</div>
                        </button>
                    )}
                </div>

                {/* Variable Selector Input */}
                {inputSource === 'variable' && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Select Input Variable</label>
                        <div className="flex gap-2">
                            <VariableAwareInput 
                                ref={inputVarRef}
                                value={inputVariable} 
                                onValueChange={val => { if (!readOnly) { setInputVariable(val); setDirty(true); } }}
                                placeholder="{{global.myVar}}"
                                disabled={readOnly}
                            />
                            {!readOnly && (
                                <button 
                                    onClick={() => openPicker('input')}
                                    className="px-3 py-2 bg-purple-100 text-purple-700 font-bold text-sm rounded-md hover:bg-purple-200 transition-colors flex items-center h-[46px]"
                                >
                                    Pick
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Transformation Logic */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">2. Transformation (Optional)</h4>
                    
                    {/* Engine Tabs */}
                     <div className="flex bg-gray-100 p-1 rounded-lg">
                        {(['none','constant','regex','jmespath','xpath','advanced'] as any[]).map(t => (
                            <button 
                                key={t} 
                                onClick={() => { setTab(t); setDirty(true); }} 
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${tab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {t === 'jmespath' ? 'JSON' : t.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative">
                    <div className="flex justify-between items-end mb-1">
                        <label className="text-xs font-semibold text-gray-500">Expression / Pattern</label>
                        <button 
                            onClick={() => openPicker('spec')}
                            className="text-[10px] text-blue-600 font-bold flex items-center hover:bg-blue-50 px-2 py-0.5 rounded transition-colors"
                        >
                            Add Variable or Action
                        </button>
                    </div>
                    {tab !== 'none' ? (
                        <VariableAwareInput 
                            ref={specInputRef}
                            value={spec} 
                            onValueChange={val => { if (!readOnly) { setSpec(val); setDirty(true); } }} 
                            onInsertClick={() => openPicker('spec')}
                            isTextarea={true}
                            disabled={readOnly}
                            placeholder={tab === 'advanced' ? "mappings:\n  - name: id\n    expr: {{global.prefix}}-{{uuid}}" : "Expression..."}
                        />
                    ) : (
                        <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-400 text-xs text-center italic">
                            No transformation will be applied. Input value is used as-is.
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Test Lab */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                 <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Play size={16} className="text-emerald-600"/> Test Lab
                 </h4>

                  <div className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Sample Input (JSON or Text)</label>
                        <textarea 
                            value={sample} 
                            onChange={e => { setSample(e.target.value); setDirty(true); }} 
                            className="w-full h-32 font-mono text-xs p-3 border border-gray-200 rounded-md bg-gray-50 focus:bg-white focus:border-emerald-300 transition-all outline-none"
                            placeholder='{"foo": "bar"}'
                        />
                     </div>
                  </div>

                 <div className="flex justify-end mt-3">
                     <button onClick={runTest} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm shadow-sm flex items-center gap-2">
                        <Play size={14} fill="currentColor"/> Run Test
                     </button>
                 </div>

                 {error && (
                     <div className="mt-3 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-md font-mono">
                         {error}
                     </div>
                 )}

                 {testResult && (
                     <div className="mt-4">
                         <label className="block text-xs font-bold text-gray-500 mb-1">Result Preview</label>
                         <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-60">
                             {testResult}
                         </pre>
                     </div>
                 )}
            </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-3 shrink-0 z-10">
           <button onClick={() => { setSpec(''); setSample(''); setDirty(false); }} className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium text-sm">Reset</button>
           <button onClick={() => { if (dirty) setConfirmClose(true); else onClose && onClose(); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
               {readOnly ? 'Close' : 'Cancel'}
           </button>
           {!readOnly && (
               <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow hover:shadow-md transition-all">Save Changes</button>
           )}
        </div>

        {/* Overlays */}
        {showVarPicker && (
            <VariablePicker 
                onSelect={handleVarSelect} 
                onClose={() => setShowVarPicker(false)} 
                localVars={variables}
            />
        )}

        {confirmClose && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-end justify-center pb-20 z-20 animate-in fade-in duration-200">
            <div className="bg-white border boundary-gray-200 p-6 rounded-2xl shadow-2xl max-w-sm text-center">
               <h4 className="font-bold text-gray-900 text-lg mb-2">Unsaved Changes</h4>
               <p className="text-gray-500 text-sm mb-6">You have unsaved changes. Are you sure you want to discard them?</p>
               <div className="flex gap-3 justify-center">
                  <button onClick={() => setConfirmClose(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Go Back</button>
                  <button onClick={() => { setConfirmClose(false); onClose && onClose(); }} className="px-4 py-2 bg-red-50 text-red-600 font-bold hover:bg-red-100 rounded-lg">Discard</button>
               </div>
            </div>
          </div>
        )}

      </div>
      <style>{`@keyframes slide-in-right { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}

export default VariableTransformerDrawer;
