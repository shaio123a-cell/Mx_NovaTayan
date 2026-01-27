// xform_preview.react.tsx
// React preview component for transformation engine

import React, { useState, useEffect } from 'react';
import * as engine from 'shared-xform/xform_engine';

interface XformPreviewProps {
  specYaml: string;
  inputText: string;
  vars?: Record<string, unknown>;
  limit?: number;
  onError?: (e: Error) => void;
}

export const XformPreview: React.FC<XformPreviewProps> = ({ specYaml, inputText, vars = {}, limit = 20, onError }) => {
  const [valid, setValid] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<string>('');
  const [columns, setColumns] = useState<string[]>([]);

  useEffect(() => {
    const v = engine.validateSpec(specYaml);
    setValid(v.ok);
    setErrors(v.ok ? [] : (v as any).errors || []);
    if (v.ok) {
      engine.transform(v.spec, inputText, vars, { previewLimit: limit })
        .then(result => {
          setPreview(typeof result === 'string' ? result : Buffer.from(result).toString('utf8'));
          if (v.spec.output.type === 'csv') {
            setColumns(v.spec.mappings.map(m => m.name));
          } else if (v.spec.output.type === 'json') {
            setColumns(v.spec.mappings.map(m => m.name));
          } else if (v.spec.output.type === 'text') {
            setColumns([v.spec.mappings[0].name]);
          } else {
            setColumns([]);
          }
        })
        .catch(e => {
          setPreview('');
          setErrors([e.message || String(e)]);
          onError?.(e);
        });
    } else {
      setPreview('');
      setColumns([]);
    }
  }, [specYaml, inputText, vars, limit, onError]);

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 14 }}>
      <div>
        <span style={{ color: valid ? 'green' : 'red', fontWeight: 'bold' }}>{valid ? 'Valid Spec' : 'Invalid Spec'}</span>
        {errors.length > 0 && (
          <ul style={{ color: 'red' }}>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        )}
      </div>
      {valid && preview && (
        <div style={{ marginTop: 12 }}>
          {columns.length > 0 && (
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>{columns.map(col => <th key={col} style={{ border: '1px solid #ccc', padding: 4 }}>{col}</th>)}</tr>
              </thead>
              <tbody>
                {preview.split('\n').slice(0, limit).map((row, i) => (
                  <tr key={i}>{row.split(',').map((cell, j) => <td key={j} style={{ border: '1px solid #eee', padding: 4 }}>{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          )}
          {!columns.length && (
            <pre style={{ background: '#f9f9f9', padding: 8 }}>{preview}</pre>
          )}
        </div>
      )}
    </div>
  );
};
