
import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Play } from 'lucide-react';

interface ImpactAnalysisProps {
    usageData: {
        usageCount: number;
        dependents: Array<{ id: string; name: string }>;
    } | undefined;
    type: 'schedule' | 'calendar';
}

export function ImpactAnalysis({ usageData, type }: ImpactAnalysisProps) {
    const [isUsageExpanded, setIsUsageExpanded] = useState(false);

    if (!usageData || usageData.usageCount === 0) return null;

    const typeLabel = type === 'schedule' ? 'schedule' : 'calendar';

    return (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle size={20} />
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-amber-800 uppercase tracking-tighter">Shared Library Warning</h4>
                    <button 
                        onClick={() => setIsUsageExpanded(!isUsageExpanded)}
                        className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-100/50 hover:bg-amber-100 px-2 py-1 rounded-lg transition-all"
                    >
                        {isUsageExpanded ? 'HIDE LIST' : 'VIEW LIST'}
                        {isUsageExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                </div>
                <p className="text-xs text-amber-700 font-medium leading-relaxed mt-1">
                    This {typeLabel} is actively used in <span className="font-bold">{usageData.usageCount} workflows</span>. 
                    Modifying or deleting it <span className="underline">will affect</span> the execution of these dependent processes.
                </p>

                {isUsageExpanded && usageData.dependents && (
                    <div className="mt-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1.5">Impacted Workflows:</div>
                        <div className="grid grid-cols-1 gap-2">
                            {usageData.dependents.map((dep: any) => (
                                <a 
                                    key={dep.id}
                                    href={`/designer?id=${dep.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center justify-between p-2.5 bg-white/50 border border-amber-200/50 rounded-xl hover:bg-white hover:border-amber-300 transition-all"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover:scale-125 transition-transform" />
                                        <span className="text-xs font-bold text-amber-900 line-clamp-1">{dep.name}</span>
                                    </div>
                                    <Play size={10} className="text-amber-400 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
