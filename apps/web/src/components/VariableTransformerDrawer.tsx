import { useState, useEffect } from 'react';

export function VariableTransformerDrawer({ open, name, initial, variables = [], onClose, onSave }: any) {
  const [tab, setTab] = useState<'constant'|'regex'|'jmespath'|'xpath'|'advanced'>('jmespath');
  const [spec, setSpec] = useState('');
  const [inputSource, setInputSource] = useState<'task_output'|'variable'>('task_output');
  const [inputVariable, setInputVariable] = useState<string>('');
  const [sample, setSample] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (initial) {
      setTab(initial.type || initial.transformType || 'jmespath');
      setSpec(initial.spec || initial.pattern || '');
      setInputSource(initial.inputSource || 'task_output');
      setInputVariable(initial.inputVariable || '');
      setSample(initial.sampleInput || '');
      setDirty(false);
    } else {
      setTab('jmespath'); setSpec(''); setInputSource('task_output'); setInputVariable(''); setSample(''); setTestResult(null); setDirty(false);
    }
  }, [initial, open]);

  if (!open) return null;

  const runTest = async () => {
    setError(null); setTestResult(null);
    try {
      const input = sample || '';
      if (tab === 'regex') {
        const re = new RegExp(spec);
        const m = input.match(re);
        setTestResult(JSON.stringify(m || []));
        return;
      }
        try {
        if (tab === 'jmespath') {
          const parsed = input ? JSON.parse(input) : null;
          const sel: any = await import('shared-xform/xform_selectors_json');
          const res = sel.evalExpr(parsed, spec);
          setTestResult(JSON.stringify(res, null, 2));
          return;
        }
        if (tab === 'advanced') {
          const eng: any = await import('shared-xform/xform_engine');
          const validate = eng.validateSpec || eng.validateSpecYaml || eng.validateSpecFromYaml;
          const validated = validate ? await validate(spec) : null;
          const out = await (eng.transform || eng.run || eng.execute)(validated?.spec || spec, input, {}, { previewLimit: 20 });
          setTestResult(typeof out === 'string' ? out : JSON.stringify(out, null, 2));
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
    const payload = {
      type: tab,
      spec,
      inputSource,
      inputVariable,
      sampleInput: sample
    };
    onSave && onSave(payload);
    setDirty(false);
  };

  const handleBackdropClick = () => {
    if (dirty) setConfirmClose(true);
    else onClose && onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999999, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={handleBackdropClick} />
      <div style={{ position: 'relative', width: 640, height: '100%', backgroundColor: 'white', boxShadow: '-10px 0 30px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', animation: 'slide-in-right 0.25s ease-out', zIndex: 2 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{name}</h3>
            <div style={{ fontSize: 12, color: '#666' }}>Value Transformer</div>
          </div>
          <div>
            <button onClick={() => { if (dirty) setConfirmClose(true); else onClose && onClose(); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#1976D2', fontWeight: 700 }}>Close</button>
          </div>
        </div>

        <div style={{ display: 'flex', padding: '16px 24px', gap: 12, alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['constant','regex','jmespath','xpath','advanced'] as any[]).map(t => (
              <button key={t} onClick={() => { setTab(t); setDirty(true); }} style={{ padding: '8px 12px', border: 'none', background: tab === t ? '#1976D2' : 'transparent', color: tab === t ? 'white' : '#666', borderRadius: 6, cursor: 'pointer', fontWeight: 700, textTransform: 'capitalize' }}>{t === 'jmespath' ? 'JSON' : t}</button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={inputSource} onChange={e => { setInputSource(e.target.value as any); setDirty(true); }} style={{ padding: 8, borderRadius: 6, border: '1px solid #e0e0e0' }}>
              <option value="task_output">Task Output</option>
              <option value="variable">Another Variable</option>
            </select>
            {inputSource === 'variable' && (
              <select value={inputVariable} onChange={e => { setInputVariable(e.target.value); setDirty(true); }} style={{ padding: 8, borderRadius: 6, border: '1px solid #e0e0e0' }}>
                <option value="">-- select variable --</option>
                {variables.map((v: string) => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
          </div>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Transformer Spec / Pattern / YAML</label>
            <textarea value={spec} onChange={e => { setSpec(e.target.value); setDirty(true); }} style={{ width: '100%', height: 160, fontFamily: 'monospace', padding: 8, border: '1px solid #e6eef8', borderRadius: 6 }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Sample Input (for Test)</label>
            <textarea value={sample} onChange={e => { setSample(e.target.value); setDirty(true); }} style={{ width: '100%', height: 120, fontFamily: 'monospace', padding: 8, border: '1px solid #e6eef8', borderRadius: 6 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={runTest} style={{ background: 'transparent', border: '1px solid #1976D2', color: '#1976D2', padding: '8px 12px', borderRadius: 6 }}>Test</button>
            <button onClick={handleSave} style={{ background: '#1976D2', color: 'white', border: 'none', padding: '8px 12px', borderRadius: 6 }}>Save</button>
          </div>
          {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
          {testResult && <pre style={{ background: '#0f172a', color: '#e6eef8', padding: 12, marginTop: 8, borderRadius: 6, maxHeight: 360, overflow: 'auto' }}>{testResult}</pre>}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => { setSpec(''); setSample(''); setDirty(false); }} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer' }}>Reset</button>
          <button onClick={() => { setConfirmClose(true); }} style={{ background: 'transparent', border: '1px solid #1976D2', color: '#1976D2', padding: '8px 12px', borderRadius: 6 }}>Close</button>
          <button onClick={handleSave} style={{ background: '#1976D2', color: 'white', border: 'none', padding: '8px 12px', borderRadius: 6 }}>Save</button>
        </div>

        {confirmClose && (
          <div style={{ position: 'absolute', left: 24, bottom: 80, background: 'white', border: '1px solid #eee', padding: 12, borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Unsaved changes</div>
            <div style={{ marginBottom: 12 }}>You have unsaved changes. Save before closing?</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setConfirmClose(false); }} style={{ background: 'transparent', border: 'none', color: '#999' }}>Cancel</button>
              <button onClick={() => { setConfirmClose(false); setDirty(false); onClose && onClose(); }} style={{ background: 'transparent', border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: 6 }}>Discard</button>
              <button onClick={() => { handleSave(); setConfirmClose(false); onClose && onClose(); }} style={{ background: '#1976D2', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6 }}>Save & Close</button>
            </div>
          </div>
        )}

      </div>

      <style>{`@keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
}

export default VariableTransformerDrawer;
