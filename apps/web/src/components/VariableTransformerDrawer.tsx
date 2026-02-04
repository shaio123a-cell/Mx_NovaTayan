import { useState, useEffect } from 'react';
import { Box, Plus, X, Zap, Play } from 'lucide-react';
import { VariablePicker } from './VariablePicker';
import { VariableAwareInput } from './VariableAwareInput';
import { useQuery } from '@tanstack/react-query';
import { globalVarsApi } from '../api/globalVars';

// --- Main Drawer ---

export function VariableTransformerDrawer({ open, name, initial, variables = [], onClose, onSave }: any) {
  const { data: globalVars } = useQuery({ queryKey: ['globalVars'], queryFn: globalVarsApi.getAll });
  // State
  const [tab, setTab] = useState<'constant'|'regex'|'jmespath'|'xpath'|'advanced'>('jmespath');
  const [spec, setSpec] = useState('');
  
  // UX State
  const [inputSource, setInputSource] = useState<'task_output'|'variable'>('task_output');
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
      setTab('jmespath'); setSpec(''); setInputSource('task_output'); setInputVariable(''); setSample(''); setTestResult(null); setDirty(false);
    }
  }, [initial, open]);

  if (!open) return null;

  const handleVarSelect = (val: string) => {
      if (pickerMode === 'input') {
          // If input source is variable, we set the input variable
          setInputVariable(val);
          setInputSource('variable');
      } else {
          // Inserting into spec
          setSpec(prev => prev + val);
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

      // Fill in actual global variables if not overridden by mock
      if (globalVars) {
          globalVars.forEach((gv: any) => {
              if (!context.global[gv.name]) {
                  context.global[gv.name] = gv.value;
              }
          });
      }

      // Interpolate the spec first if it contains variables
       let interpolatedSpec = spec;
       try {
           const { interpolateExpr } = await import('shared-xform/xform_vars');
           if (spec.includes('{{')) {
               // We need to resolve recursively for deep variables
               interpolatedSpec = interpolateExpr(spec, context, tab === 'jmespath' ? 'jmespath' : tab === 'xpath' ? 'xpath' : 'css');
           }
       } catch (e: any) {
           setError('Interpolation Error: ' + e.message);
           return; 
       }

       // Resolve input if it comes from a variable
       let testInput = input;
       if (inputSource === 'variable' && inputVariable) {
           try {
               const { interpolateExpr } = await import('shared-xform/xform_vars');
               testInput = interpolateExpr(inputVariable, context, 'jmespath');
           } catch (e: any) {
               setError('Input Resolution Error: ' + e.message);
               return;
           }
       }
       
      // Engine Execution
      if (tab === 'regex') {
        const re = new RegExp(interpolatedSpec);
        const m = testInput.match(re);
        setTestResult(m ? JSON.stringify(m, null, 2) : "No match");
        return;
      }

      const eng: any = await import('shared-xform/xform_engine');
      try {
        if (tab === 'jmespath') {
          let parsed = null;
          try {
              // If testInput is stringified JSON, parse it for JMESPath
              parsed = (typeof testInput === 'string' && (testInput.trim().startsWith('{') || testInput.trim().startsWith('['))) 
                       ? JSON.parse(testInput) 
                       : testInput;
          } catch(e) {
              parsed = testInput;
          }
          const sel: any = await import('shared-xform/xform_selectors_json');
          const res = sel.evalExpr(parsed, interpolatedSpec);
          setTestResult(typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res));
          return;
        }
        if (tab === 'advanced') {
          // Pass raw spec (which is YAML) and let engine handle it? 
          // Actually if user interpolates YAML structure it might break validation if we interpolate first.
          // But if we don't, engine must support context.
          // xform_engine does support context. 
          const validate = eng.validateSpec || eng.validateSpecYaml || eng.validateSpecFromYaml;
          const validated = validate ? await validate(spec) : null;
          const out = await (eng.transform || eng.run || eng.execute)(validated?.spec || spec, testInput, context, { previewLimit: 20 });
          setTestResult(typeof out === 'string' ? out : JSON.stringify(out, null, 2));
          return;
        }
        if (tab === 'constant') {
            setTestResult(interpolatedSpec);
            return;
        }
        setTestResult('No engine available to test this transformer in the browser.');
      } catch (e: any) {
        setError(String(e?.message || e));
      }
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
                        onClick={() => { setInputSource('task_output'); setDirty(true); }}
                        className={`flex-1 p-3 rounded-lg border text-left transition-all ${inputSource === 'task_output' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                    >
                        <div className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
                            <Box size={16} className={inputSource === 'task_output' ? 'text-blue-500' : 'text-gray-400'} />
                            Task Output
                        </div>
                        <div className="text-xs text-gray-500 mt-1 pl-6">Use the result of this task as input</div>
                    </button>         

                    <button 
                        onClick={() => { setInputSource('variable'); setDirty(true); }}
                        className={`flex-1 p-3 rounded-lg border text-left transition-all ${inputSource === 'variable' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                    >
                        <div className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
                            <Zap size={16} className={inputSource === 'variable' ? 'text-purple-500' : 'text-gray-400'} />
                            Variable
                        </div>
                        <div className="text-xs text-gray-500 mt-1 pl-6">Use another variable as input</div>
                    </button>
                </div>

                {/* Variable Selector Input */}
                {inputSource === 'variable' && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Select Input Variable</label>
                        <div className="flex gap-2">
                            <VariableAwareInput 
                                value={inputVariable} 
                                onValueChange={val => { setInputVariable(val); setDirty(true); }}
                                placeholder="{{global.myVar}}"
                            />
                            <button 
                                onClick={() => openPicker('input')}
                                className="px-3 py-2 bg-purple-100 text-purple-700 font-bold text-sm rounded-md hover:bg-purple-200 transition-colors flex items-center gap-2 h-[46px]"
                            >
                                <Plus size={14}/> Pick
                            </button>
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
                        {(['constant','regex','jmespath','xpath','advanced'] as any[]).map(t => (
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
                            className="text-[10px] text-blue-600 font-bold flex items-center gap-1 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors"
                        >
                            <Plus size={10}/> Insert Variable
                        </button>
                    </div>
                    <VariableAwareInput 
                        value={spec} 
                        onValueChange={val => { setSpec(val); setDirty(true); }} 
                        isTextarea={true}
                        placeholder={tab === 'advanced' ? "mappings:\n  - name: id\n    expr: {{global.prefix}}-{{uuid}}" : "Expression..."}
                    />
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
           <button onClick={() => { if (dirty) setConfirmClose(true); else onClose && onClose(); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">Cancel</button>
           <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow hover:shadow-md transition-all">Save Changes</button>
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
