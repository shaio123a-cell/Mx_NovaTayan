import { useState } from 'react';
import { VariableManager } from '../components/VariableManager';
import { XformPreview } from '../shared-xform/xform_preview.react';

export default function OutputProcessing() {
  const [specYaml, setSpecYaml] = useState('');
  const [inputText, setInputText] = useState('');
  const [vars, setVars] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <h2 style={{ fontSize: 24, fontWeight: 600 }}>Output Processing Preview</h2>
      <div style={{ marginTop: 24 }}>
        <label>Transformation Spec (YAML):</label>
        <textarea
          value={specYaml}
          onChange={e => setSpecYaml(e.target.value)}
          rows={10}
          style={{ width: '100%', fontFamily: 'monospace', marginBottom: 16 }}
        />
        <label>Input Data:</label>
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          rows={6}
          style={{ width: '100%', fontFamily: 'monospace', marginBottom: 16 }}
        />
        <VariableManager value={vars} onChange={setVars} usedNames={[]} />
        {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
        <div style={{ marginTop: 32 }}>
          <XformPreview
            specYaml={specYaml}
            inputText={inputText}
            vars={vars}
            limit={20}
            onError={e => setError(e.message)}
          />
        </div>
      </div>
    </div>
  );
}
