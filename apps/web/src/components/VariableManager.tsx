import { useState } from 'react';

export interface VariableManagerProps {
  value: Record<string, any>;
  onChange: (vars: Record<string, any>) => void;
  usedNames?: string[];
}

export function VariableManager({ value, onChange, usedNames = [] }: VariableManagerProps) {
  const [newVar, setNewVar] = useState('');
  const [newVal, setNewVal] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newVar.trim()) return;
    if (usedNames.includes(newVar)) {
      setError('Name already used elsewhere');
      return;
    }
    if (Object.keys(value).includes(newVar)) {
      setError('Variable name must be unique');
      return;
    }
    setError(null);
    onChange({ ...value, [newVar]: newVal });
    setNewVar('');
    setNewVal('');
  };

  const handleDelete = (name: string) => {
    const copy = { ...value };
    delete copy[name];
    onChange(copy);
  };

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontWeight: 500 }}>Variables</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          placeholder="Name"
          value={newVar}
          onChange={e => setNewVar(e.target.value)}
          style={{ width: 120 }}
        />
        <input
          placeholder="Value"
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          style={{ width: 180 }}
        />
        <button onClick={handleAdd}>Add</button>
      </div>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <table style={{ width: '100%', fontSize: 14, background: '#fafafa', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 4 }}>Name</th>
            <th style={{ textAlign: 'left', padding: 4 }}>Value</th>
            <th style={{ padding: 4 }}></th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(value).map(([name, val]) => (
            <tr key={name}>
              <td style={{ padding: 4 }}>{name}</td>
              <td style={{ padding: 4 }}>{String(val)}</td>
              <td style={{ padding: 4 }}>
                <button onClick={() => handleDelete(name)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
