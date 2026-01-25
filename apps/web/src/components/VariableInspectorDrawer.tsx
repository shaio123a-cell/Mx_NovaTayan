import React, { useState } from 'react';

interface Props {
  open: boolean;
  name: string;
  value: any;
  transformer?: any;
  inputValue?: any;
  onClose: () => void;
}

export default function VariableInspectorDrawer({ open, name, value, transformer, inputValue, onClose }: Props) {
  const [showTransformer, setShowTransformer] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [showValue, setShowValue] = useState(true);

  if (!open) return null;

    return (
    <div className="fixed inset-0 z-[10010] flex">
      <div className="absolute inset-0 bg-black/20 z-[10010]" onClick={onClose} />
      <div onClick={(e) => e.stopPropagation()} className="ml-auto w-[560px] h-full bg-white shadow-2xl p-6 overflow-auto z-[10011]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Variable: <span className="font-mono">{name}</span></h3>
            <div className="text-xs text-gray-500">Inspect value, input used, and transformer</div>
          </div>
          <button onClick={onClose} className="text-sm text-gray-500">Close</button>
        </div>

        <div>
          <div className="border rounded mb-3">
            <button className="w-full text-left p-3 font-bold" onClick={() => setShowValue(v => !v)}>
              Full Value
            </button>
            {showValue && (
              <div className="p-3 bg-gray-50 text-xs font-mono text-gray-800">
                <pre className="whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
              </div>
            )}
          </div>

          <div className="border rounded mb-3">
            <button className="w-full text-left p-3 font-bold" onClick={() => setShowInput(v => !v)}>
              Input Used
            </button>
            {showInput && (
              <div className="p-3 bg-gray-50 text-xs font-mono text-gray-800">
                <pre className="whitespace-pre-wrap">{JSON.stringify(inputValue, null, 2)}</pre>
              </div>
            )}
          </div>

          <div className="border rounded mb-3">
            <button className="w-full text-left p-3 font-bold" onClick={() => setShowTransformer(v => !v)}>
              Transformer
            </button>
            {showTransformer && (
              <div className="p-3 bg-gray-50 text-xs font-mono text-gray-800">
                {transformer ? (
                  <>
                    <div className="mb-2 text-[12px] font-semibold">Type: {transformer.type || transformer?.transformer?.type || '—'}</div>
                    <div className="text-[12px]">Spec / Config:</div>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(transformer, null, 2)}</pre>
                  </>
                ) : (
                  <div className="text-gray-500">No transformer configured for this variable.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
