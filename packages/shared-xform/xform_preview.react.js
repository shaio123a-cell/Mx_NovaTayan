"use strict";
// xform_preview.react.tsx
// React preview component for transformation engine
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.XformPreview = void 0;
const react_1 = __importStar(require("react"));
const xform_engine_1 = require("./xform_engine");
const XformPreview = ({ specYaml, inputText, vars = {}, limit = 20, onError }) => {
    const [valid, setValid] = (0, react_1.useState)(false);
    const [errors, setErrors] = (0, react_1.useState)([]);
    const [preview, setPreview] = (0, react_1.useState)('');
    const [columns, setColumns] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        const v = (0, xform_engine_1.validateSpec)(specYaml);
        setValid(v.ok);
        setErrors(v.ok ? [] : v.errors);
        if (v.ok) {
            (0, xform_engine_1.transform)(v.spec, inputText, vars, { previewLimit: limit })
                .then(result => {
                setPreview(typeof result === 'string' ? result : Buffer.from(result).toString('utf8'));
                if (v.spec.output.type === 'csv') {
                    setColumns(v.spec.mappings.map(m => m.name));
                }
                else if (v.spec.output.type === 'json') {
                    setColumns(v.spec.mappings.map(m => m.name));
                }
                else if (v.spec.output.type === 'text') {
                    setColumns([v.spec.mappings[0].name]);
                }
                else {
                    setColumns([]);
                }
            })
                .catch(e => {
                setPreview('');
                setErrors([e.message || String(e)]);
                onError?.(e);
            });
        }
        else {
            setPreview('');
            setColumns([]);
        }
    }, [specYaml, inputText, vars, limit, onError]);
    return (<div style={{ fontFamily: 'monospace', fontSize: 14 }}>
      <div>
        <span style={{ color: valid ? 'green' : 'red', fontWeight: 'bold' }}>{valid ? 'Valid Spec' : 'Invalid Spec'}</span>
        {errors.length > 0 && (<ul style={{ color: 'red' }}>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>)}
      </div>
      {valid && preview && (<div style={{ marginTop: 12 }}>
          {columns.length > 0 && (<table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>{columns.map(col => <th key={col} style={{ border: '1px solid #ccc', padding: 4 }}>{col}</th>)}</tr>
              </thead>
              <tbody>
                {preview.split('\n').slice(0, limit).map((row, i) => (<tr key={i}>{row.split(',').map((cell, j) => <td key={j} style={{ border: '1px solid #eee', padding: 4 }}>{cell}</td>)}</tr>))}
              </tbody>
            </table>)}
          {!columns.length && (<pre style={{ background: '#f9f9f9', padding: 8 }}>{preview}</pre>)}
        </div>)}
    </div>);
};
exports.XformPreview = XformPreview;
