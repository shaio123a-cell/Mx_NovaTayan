import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, RefreshCw, Terminal, History, ChevronRight, CalendarDays } from 'lucide-react';

interface ExecutionPredictorProps {
    schedule: any;
    calendarIds: string[];
    title?: string;
}

export function ExecutionPredictor({ schedule, calendarIds, title = "Next Predicted Executions" }: ExecutionPredictorProps) {
    const [predictions, setPredictions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [simulateFrom, setSimulateFrom] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const fetchPredictions = async () => {
        if (!schedule || (!schedule.mode && !schedule.payload)) {
            setPredictions([]);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const body: any = {
                ...schedule,
                calendarIds,
                limit: 10
            };
            if (simulateFrom) body.startFrom = new Date(simulateFrom).toISOString();

            const res = await fetch('/api/schedules/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error('Failed to fetch predictions');
            const data = await res.json();
            setPredictions(data.nextFireTimes || []);
        } catch (err) {
            console.error(err);
            setError('Could not calculate schedule at this time');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(fetchPredictions, 400); // Debounce
        return () => clearTimeout(timeout);
    }, [schedule, calendarIds, simulateFrom]);

    const formatDateTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        }) + ' at ' + d.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="mt-6 border border-indigo-100 rounded-xl bg-indigo-50/30 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-tight">{title}</span>
                </div>
                {isLoading && <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
            </div>

            <div className="p-4 space-y-4">
                {/* Simulator Controls */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase ml-1 flex items-center gap-1.5">
                        <CalendarDays className="w-3 h-3" />
                        Predict from specific date (Time Machine)
                    </label>
                    <div className="flex gap-2">
                        <input 
                            type="datetime-local" 
                            value={simulateFrom}
                            onChange={(e) => setSimulateFrom(e.target.value)}
                            className="bg-white border border-indigo-100 rounded-lg px-3 py-1.5 text-xs text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 flex-1"
                        />
                        {simulateFrom && (
                            <button 
                                onClick={() => setSimulateFrom('')}
                                className="px-2 text-[10px] font-bold text-indigo-400 hover:text-indigo-600 uppercase transition-colors"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Results List */}
                <div className="bg-white/80 rounded-lg border border-indigo-50 divide-y divide-indigo-50 overflow-hidden">
                    {error ? (
                        <div className="p-6 text-center">
                            <p className="text-xs text-red-500 font-medium">{error}</p>
                        </div>
                    ) : predictions.length > 0 ? (
                        predictions.map((p, idx) => (
                            <div key={idx} className="px-3 py-2.5 flex items-center gap-3 group hover:bg-white transition-colors">
                                <span className="text-[10px] font-bold text-indigo-300 w-4">{idx + 1}</span>
                                <div className="flex-1">
                                    <div className="text-xs font-semibold text-indigo-900">
                                        {formatDateTime(p)}
                                    </div>
                                </div>
                                <ChevronRight className="w-3 h-3 text-indigo-100 group-hover:text-indigo-300" />
                            </div>
                        ))
                    ) : !isLoading && (
                        <div className="p-8 text-center">
                            <div className="flex justify-center mb-2">
                                <RefreshCw className="w-8 h-8 text-indigo-100" />
                            </div>
                            <p className="text-xs text-indigo-300 font-medium">No valid executions found in the current window.</p>
                            <p className="text-[10px] text-indigo-200 mt-1 max-w-[200px] mx-auto">Either the schedule has expired or the calendar rules block all upcoming slots.</p>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5 px-1 opacity-60">
                    <Terminal className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] text-indigo-500 font-medium font-mono">Simulating binding at 1-sec precision</span>
                </div>
            </div>
        </div>
    );
}
