"use strict";
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
// xform_preview.react.tsx
const react_1 = __importStar(require("react"));
const xform_engine_1 = require("./xform_engine");
const XformPreview = ({ specYaml, inputText, vars = {}, limit = 20, onError }) => {
    const [output, setOutput] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (!specYaml || !inputText) {
            setOutput(null);
            setError(null);
            return;
        }
        (async () => {
            try {
                setError(null);
                const result = await (0, xform_engine_1.transform)(specYaml, inputText, vars, { limit });
                setOutput(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
                if (onError)
                    onError(null);
            }
            catch (err) {
                setOutput(null);
                setError(err.message || 'Error during transformation');
                if (onError)
                    onError(err.message || 'Error during transformation');
            }
        })();
    }, [specYaml, inputText, vars, limit]);
    return (<div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 16, minHeight: 120 }}>
			{error ? (<div style={{ color: 'red' }}>Error: {error}</div>) : (<pre style={{ fontFamily: 'monospace', fontSize: 14, margin: 0 }}>{output || 'No output yet.'}</pre>)}
		</div>);
};
exports.XformPreview = XformPreview;
