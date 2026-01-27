import { useState, useEffect } from 'react';
import { VariableTransformerDrawer } from './VariableTransformerDrawer';

export interface VariableManagerProps {
  value: Record<string, any>;
  onChange: (vars: Record<string, any>) => void;
  usedNames?: string[];
}

export function VariableManager({ value, onChange, usedNames = [] }: VariableManagerProps) {
  const [newVar, setNewVar] = useState('');
  const [newVal, setNewVal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [scopes, setScopes] = useState<Record<string, string>>({});
  const [newScope, setNewScope] = useState<'LOCAL'|'WORKFLOW'|'GLOBAL'>('LOCAL');
  const [openTransformerFor, setOpenTransformerFor] = useState<string | null>(null);

  const getTransformerFor = (name: string) => {
    try {
      const v = value && value[name];
      if (!v) return null;
      if (typeof v === 'object' && (v.valueMode === 'transformer' || v.transformer)) return v.transformer || v;
      return null;
    } catch (e) { return null; }
  };

  useEffect(() => {
    try {
      setScopes((value && (value.__scopes || {})) || {});
    } catch (e) {
      setScopes({});
    }
  }, [value]);

  const handleAdd = () => {
    if (!newVar.trim()) return;
    if (usedNames.includes(newVar) && editingName !== newVar) {
      setError('Name already used elsewhere');
      return;
    }
    const hasExisting = Object.keys(value).includes(newVar);
    if (!editingName && hasExisting) {
      setError('Variable name must be unique');
      return;
    }
    setError(null);
    const copy = { ...value } as Record<string, any>;
    if (editingName && editingName !== newVar) {
      delete copy[editingName];
    }
    copy[newVar] = newVal;
    const newScopes = { ...scopes };
    newScopes[newVar] = newScope;
    copy['__scopes'] = newScopes;
    onChange(copy);
    setScopes(newScopes);
    setNewVar('');
    setNewVal('');
    setEditingName(null);
  };

  const handleDelete = (name: string) => {
    const copy = { ...value };
    delete copy[name];
    const newScopes = { ...scopes };
    delete newScopes[name];
    copy['__scopes'] = newScopes;
    onChange(copy);
    setScopes(newScopes);
  };

  const handleSaveTransformer = (name: string, transformer: any) => {
    const copy = { ...value } as Record<string, any>;
    copy[name] = { valueMode: 'transformer', transformer };
    const newScopes = { ...scopes };
    if (!newScopes[name]) newScopes[name] = 'LOCAL';
    copy['__scopes'] = newScopes;
    onChange(copy);
    setScopes(newScopes);
    setOpenTransformerFor(null);
  };

  const handleEdit = (name: string) => {
    setEditingName(name);
    setNewVar(name);
    setNewVal(String(value[name]));
    setNewScope((value && (value.__scopes || {})[name]) || 'LOCAL');
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingName(null);
    setNewVar('');
    setNewVal('');
    setError(null);
  };

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontWeight: 500 }}>Variables</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <input
          placeholder="Name"
          value={newVar}
          onChange={e => setNewVar(e.target.value)}
          style={{ width: 160, padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: 6 }}
        />
        <input
          placeholder="Value"
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          style={{ width: 160, padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: 6 }}
        />
        <select value={newScope} onChange={e => setNewScope(e.target.value as any)} style={{ padding: '8px', borderRadius: 6, border: '1px solid #e0e0e0' }}>
          <option value="LOCAL">Local</option>
          <option value="WORKFLOW">Workflow</option>
          <option value="GLOBAL">Global</option>
        </select>
        <button onClick={handleAdd} style={{ color: '#1976D2', fontWeight: '700', border: 'none', background: 'transparent', cursor: 'pointer' }}>{editingName ? 'Save' : 'Add'}</button>
        {editingName && <button onClick={handleCancelEdit} style={{ color: '#999', border: 'none', background: 'transparent', cursor: 'pointer' }}>Cancel</button>}
      </div>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Name</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Value</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Scope</th>
            <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}></th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(value).filter(([k]) => k !== '__scopes').map(([name, val]) => (
            <tr key={name}>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{name}</td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
                {typeof val === 'object' && val.valueMode === 'transformer' ? (
                  <div style={{ fontStyle: 'italic', color: '#444' }}>[Transformer] {val.transformer?.type || ''}</div>
                ) : (
                  <div>{String(val)}</div>
                )}
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>{(value.__scopes || {})[name] || 'LOCAL'}</td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>
                {editingName === name ? (
                  <>
                    <button onClick={() => handleAdd()} style={{ marginRight: 8, color: '#1976D2', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700 }}>Save</button>
                    <button onClick={handleCancelEdit} style={{ color: '#999', border: 'none', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEdit(name)} style={{ marginRight: 12, color: '#1976D2', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700 }}>Edit</button>
                    <button onClick={() => handleDelete(name)} style={{ color: '#999', border: 'none', background: 'transparent', cursor: 'pointer' }}>Delete</button>
                    <button onClick={() => setOpenTransformerFor(name)} style={{ marginLeft: 12, color: '#1976D2', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700 }}>Transformer</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <VariableTransformerDrawer
        open={!!openTransformerFor}
        name={openTransformerFor || ''}
        initial={openTransformerFor ? getTransformerFor(openTransformerFor) : null}
        variables={Object.keys(value).filter(k => k !== '__scopes')}
        onClose={() => setOpenTransformerFor(null)}
        onSave={(t) => openTransformerFor && handleSaveTransformer(openTransformerFor, t)}
      />
    </div>
  );
}

// end of VariableManager
