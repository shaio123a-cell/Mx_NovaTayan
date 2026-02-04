// xform_preview.react.tsx
import React, { useState, useEffect } from 'react';
import { validateSpec, transform } from './xform_engine';
export const XformPreview = ({ specYaml, inputText, vars = {}, limit = 20, onError }) => {
	const [output, setOutput] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		if (!specYaml || !inputText) {
			setOutput(null);
			setError(null);
			return;
		}
		(async () => {
			try {
				setError(null);
				const result = await transform(specYaml, inputText, vars, { limit });
				setOutput(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
				if (onError) onError(null);
			} catch (err: any) {
				setOutput(null);
				setError(err.message || 'Error during transformation');
				if (onError) onError(err.message || 'Error during transformation');
			}
		})();
	}, [specYaml, inputText, vars, limit]);
	return (
		<div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 16, minHeight: 120 }}>
			{error ? (
				<div style={{ color: 'red' }}>Error: {error}</div>
			) : (
				<pre style={{ fontFamily: 'monospace', fontSize: 14, margin: 0 }}>{output || 'No output yet.'}</pre>
			)}
		</div>
	);
};
