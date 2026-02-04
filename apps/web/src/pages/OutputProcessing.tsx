import { useState } from 'react';
import { VariableManager } from '../components/VariableManager';

export default function OutputProcessing() {
  const [vars, setVars] = useState<Record<string, any>>({});

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <h2 style={{ fontSize: 24, fontWeight: 600 }}>Output Processing Preview</h2>
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
          Output processing is now configured per-variable. Define variables and attach transformers below.
        </div>
        <VariableManager value={vars} onChange={setVars} usedNames={[]} />
      </div>
    </div>
  );
}
