import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    ChevronLeft, 
    Save, 
    Info, 
    Clock, 
    Calendar as CalendarIcon,
    Play,
    Pause,
    ChevronRight,
    Search,
    RefreshCcw,
    Zap,
    Hash,
    AlignLeft,
    Globe,
    ChevronDown,
    Trash2,
    Undo2,
    X as XIcon
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useDirtyState } from '../context/DirtyStateContext';
import { ImpactAnalysis } from '../components/ImpactAnalysis';
import { schedulingApi } from '../api/scheduling';
import { BlockedDeleteModal } from '../components/BlockedDeleteModal';

export default function ScheduleDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { setIsDirty, setShowDirtyModal, setPendingAction } = useDirtyState();
    const isNew = id === 'new';
    const EXIT_PATH = '/scheduling?tab=schedules';

    const [form, setForm] = useState({
        name: '',
        description: '',
        mode: 'INTERVAL',
        payload: { every: '1h' } as any,
        launchAt: '',
        endAt: '',
        maxRuns: undefined as number | undefined,
        misfirePolicy: 'fire_once',
        state: 'ACTIVE',
        scope: 'GLOBAL',
        timezone: 'UTC'
    });

    const lastSavedFormRef = useRef<any>(null);
    const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);

    const [previewTimes, setPreviewTimes] = useState<string[]>([]);

    const { data: schedule, isLoading } = useQuery({
        queryKey: ['schedule', id],
        queryFn: () => fetch(`/api/schedules/${id}`).then(res => res.json()),
        enabled: !isNew
    });

    const { data: usageData } = useQuery({
        queryKey: ['schedule-usage', id],
        queryFn: () => schedulingApi.getScheduleUsage(id!),
        enabled: !isNew
    });

    useEffect(() => {
        if (schedule && !isNew) {
            const initialData = {
                name: schedule.name || '',
                description: schedule.description || '',
                mode: schedule.mode || 'INTERVAL',
                payload: schedule.payload || {},
                launchAt: schedule.launchAt ? new Date(schedule.launchAt).toISOString().split('T')[0] : '',
                endAt: schedule.endAt ? new Date(schedule.endAt).toISOString().split('T')[0] : '',
                maxRuns: schedule.maxRuns || undefined,
                misfirePolicy: schedule.misfirePolicy || 'fire_once',
                state: schedule.state || 'ACTIVE',
                scope: schedule.scope || 'GLOBAL',
                timezone: schedule.timezone || 'UTC'
            };
            setForm(initialData);
            lastSavedFormRef.current = JSON.parse(JSON.stringify(initialData));
            setIsDirty(false);
        }
    }, [schedule, isNew, setIsDirty]);

    // Computed synchronously on every render — never stale, never laggy
    const localIsDirty = useMemo(() => {
        if (!lastSavedFormRef.current) return isNew; // new = always saveable
        return JSON.stringify(form) !== JSON.stringify(lastSavedFormRef.current);
    }, [form, isNew]);

    // Sync to global context so sidebar/header navigation protection works
    useEffect(() => {
        setIsDirty(localIsDirty);
    }, [localIsDirty, setIsDirty]);

    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            const method = isNew ? 'POST' : 'PUT';
            const url = isNew ? '/api/schedules' : `/api/schedules/${id}`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (!res.ok) throw result;
            return result;
        },
        onSuccess: (data, variables) => {
            // Use 'variables' (what was passed to mutate()) NOT the stale 'form' closure
            showToast('Schedule saved successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            queryClient.invalidateQueries({ queryKey: ['schedule', id] });
            // Update the ref (not state) so it doesn't trigger the dirty effect
            lastSavedFormRef.current = JSON.parse(JSON.stringify(variables));
            setIsDirty(false);
            // Signal Save & Exit that save is complete
            window.dispatchEvent(new CustomEvent('DESIGNER_SAVE_COMPLETE'));

            if (isNew && data.id) {
                navigate(`/scheduling/schedule/${data.id}`, { replace: true });
            }
        },
        onError: (error: any) => {
            showToast(error.message || 'Failed to save schedule', 'error');
        }
    });

    // Respond to Save request (from dirty modal)
    useEffect(() => {
        const handleGlobalSave = () => saveMutation.mutate(form);
        window.addEventListener('DESIGNER_SAVE_REQUESTED', handleGlobalSave);
        return () => window.removeEventListener('DESIGNER_SAVE_REQUESTED', handleGlobalSave);
    }, [form, saveMutation]);


    const deleteMutation = useMutation({
        mutationFn: () => schedulingApi.deleteSchedule(id!),
        onSuccess: () => {
            showToast('Schedule deleted successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            navigate(EXIT_PATH);
        },
        onError: (error: any) => {
            showToast(error.message || 'Failed to delete schedule', 'error');
        }
    });

    // Both Cancel and Back show the same modal.
    // Save & Exit = save then navigate away.
    // Discard Changes = discard then navigate away.
    // Cancel in modal = stay on page with current changes.
    const showExitModal = () => {
        setPendingAction(() => () => navigate(EXIT_PATH));
        setShowDirtyModal(true);
    };

    const handleCancel = () => {
        if (localIsDirty) {
            showExitModal();
        } else {
            navigate(EXIT_PATH);
        }
    };

    const handleBack = () => {
        if (localIsDirty) {
            showExitModal();
        } else {
            navigate(EXIT_PATH);
        }
    };

    const handleDelete = () => {
        if (usageData?.usageCount > 0) {
            setIsBlockedModalOpen(true);
        } else {
            if (window.confirm('Are you sure you want to delete this schedule?')) {
                deleteMutation.mutate();
            }
        }
    };

    const updatePayload = (update: any) => {
        setForm({ ...form, payload: { ...form.payload, ...update } });
    };

    const fetchPreview = async () => {
        try {
            const res = await fetch('/api/schedules/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: form.mode, payload: form.payload })
            });
            const data = await res.json();
            setPreviewTimes(data.nextFireTimes || []);
        } catch (e) {
            console.error('Failed to fetch preview', e);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(fetchPreview, 500);
        return () => clearTimeout(timeout);
    }, [form.mode, form.payload]);

    if (isLoading && !isNew) return <div className="p-8">Loading...</div>;

    return (
        <div className="max-w-[1000px] mx-auto pb-20">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleBack}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isNew ? 'New Schedule' : form.name}
                        </h1>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-0.5">
                            Firing Pattern Configuration
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${form.state === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                        {form.state}
                    </div>
                    <button 
                        onClick={handleCancel}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                    >
                        <XIcon className="w-4 h-4" /> Cancel
                    </button>
                    <button 
                        onClick={() => saveMutation.mutate(form)}
                        disabled={saveMutation.isPending || !localIsDirty}
                        className="flex items-center gap-2 bg-[#f05a28] text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-[#d84a1d] transition-all shadow-sm disabled:opacity-50"
                    >
                        {saveMutation.isPending ? 'Saving...' : <><Save className="w-4 h-4" /> Save Schedule</>}
                    </button>
                    {!isNew && (
                        <button 
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="p-2.5 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            title="Delete Schedule"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            <ImpactAnalysis usageData={usageData} type="schedule" />

            <BlockedDeleteModal 
                isOpen={isBlockedModalOpen} 
                onClose={() => setIsBlockedModalOpen(false)}
                usageData={usageData}
                type="schedule"
            />

            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-4 space-y-6">
                    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-50 pb-3">
                            <AlignLeft className="w-4 h-4 text-gray-400" />
                            General Details
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Schedule Name</label>
                                <input 
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Workday Every 15m"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 focus:border-blue-500 transition-all">Reference Timezone</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                                    <select 
                                        value={form.timezone}
                                        onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="UTC">UTC (GMT+0)</option>
                                        {((Intl as any).supportedValuesOf('timeZone') as string[]).filter(tz => tz !== 'UTC').map(tz => {
                                            let offset = '';
                                            try {
                                                const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
                                                offset = parts.find(p => p.type === 'timeZoneName')?.value || '';
                                            } catch (e) {}
                                            return (
                                                <option key={tz} value={tz}>{tz} ({offset || '?'})</option>
                                            );
                                        })}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <ChevronDown size={14} />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description</label>
                                <textarea 
                                    rows={2}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none"
                                />
                            </div>
                        </div>
                    </section>

                    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-50 pb-3">
                            <Zap className="w-4 h-4 text-orange-500" />
                            Launch Constraints
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Launch At</label>
                                    <input 
                                        type="date"
                                        value={form.launchAt}
                                        onChange={(e) => setForm({ ...form, launchAt: e.target.value })}
                                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">End At</label>
                                    <input 
                                        type="date"
                                        value={form.endAt}
                                        onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Max Runs (Optional)</label>
                                <input 
                                    type="number"
                                    value={form.maxRuns || ''}
                                    onChange={(e) => setForm({ ...form, maxRuns: e.target.value ? parseInt(e.target.value) : undefined })}
                                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Misfire Policy</label>
                                <select 
                                    value={form.misfirePolicy}
                                    onChange={(e) => setForm({ ...form, misfirePolicy: e.target.value })}
                                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs"
                                >
                                    <option value="fire_once">Fire Once (Immediate when open)</option>
                                    <option value="skip">Skip (Wait for next cycle)</option>
                                    <option value="catch_up_all">Catch Up (Fire all missed)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Visibility Scope</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setForm({ ...form, scope: 'GLOBAL' })}
                                        className={`px-3 py-1.5 rounded text-[10px] font-bold border transition-all ${form.scope === 'GLOBAL' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                                    >
                                        GLOBAL
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setForm({ ...form, scope: 'PRIVATE' })}
                                        className={`px-3 py-1.5 rounded text-[10px] font-bold border transition-all ${form.scope === 'PRIVATE' ? 'bg-gray-800 border-gray-800 text-white' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                                    >
                                        PRIVATE
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="col-span-8 flex flex-col gap-8">
                    <section className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                        <header className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Trigger Mode</h3>
                                <p className="text-xs text-gray-400">Define how the schedule recurs over time.</p>
                            </div>
                            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                                {['ONCE', 'INTERVAL', 'WEEKLY', 'MONTHLY', 'CRON'].map(m => (
                                    <button 
                                        key={m}
                                        onClick={() => setForm({ ...form, mode: m, payload: m === 'CRON' ? { cron: '* * * * *' } : m === 'INTERVAL' ? { every: '1h' } : {} })}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                            form.mode === m 
                                            ? 'bg-white text-blue-600 shadow-sm border border-gray-100' 
                                            : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </header>

                        <div className="min-h-[200px] bg-gray-50/50 rounded-2xl border border-gray-100 p-8">
                            {form.mode === 'ONCE' && (
                                <div className="max-w-xs">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 text-center">Specific Target Time</label>
                                    <input 
                                        type="datetime-local"
                                        value={form.payload.at || ''}
                                        onChange={(e) => updatePayload({ at: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                                    />
                                </div>
                            )}

                            {form.mode === 'INTERVAL' && (
                                <div className="max-w-xs">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Repeat Every</label>
                                    <div className="flex gap-3">
                                        <input 
                                            type="text"
                                            value={form.payload.every || '1h'}
                                            onChange={(e) => updatePayload({ every: e.target.value })}
                                            placeholder="e.g. 15m, 1h, 30s"
                                            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-lg font-bold shadow-sm text-center"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2 italic text-center">Use 's' for seconds, 'm' for minutes, 'h' for hours, 'd' for days.</p>
                                </div>
                            )}

                            {form.mode === 'WEEKLY' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">On these days</label>
                                        <div className="flex gap-2">
                                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                                                const isActive = form.payload.days?.includes(idx);
                                                return (
                                                    <button 
                                                        key={idx}
                                                        onClick={() => {
                                                            const days = form.payload.days || [];
                                                            const newDays = days.includes(idx) ? days.filter((d: number) => d !== idx) : [...days, idx];
                                                            updatePayload({ days: newDays });
                                                        }}
                                                        className={`w-12 h-12 rounded-xl text-xs font-bold transition-all border ${
                                                            isActive ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-400'
                                                        }`}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="max-w-[200px]">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">At this time</label>
                                        <input 
                                            type="time"
                                            value={form.payload.time || '09:00'}
                                            onChange={(e) => updatePayload({ time: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-lg font-bold shadow-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {form.mode === 'CRON' && (
                                <div className="space-y-4">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cron Expression</label>
                                    <div className="relative">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input 
                                            type="text"
                                            value={form.payload.cron || '* * * * *'}
                                            onChange={(e) => updatePayload({ cron: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-xl font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                                            placeholder="* * * * *"
                                        />
                                    </div>
                                    <div className="grid grid-cols-5 gap-2 text-[8px] text-gray-400 font-bold uppercase tracking-widest text-center px-4">
                                        <span>Min</span>
                                        <span>Hour</span>
                                        <span>Day</span>
                                        <span>Month</span>
                                        <span>Weekday</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="bg-gray-900 rounded-2xl p-8 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-white font-bold text-base">Timeline Preview</h3>
                                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-1">Calculated firing sequence</p>
                            </div>
                            <button 
                                onClick={fetchPreview}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
                            >
                                <RefreshCcw className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            {previewTimes.length > 0 ? previewTimes.map((time, idx) => (
                                <div key={idx} className="flex items-center gap-4 bg-white/5 border border-white/5 px-4 py-3 rounded-xl group hover:bg-white/10 transition-colors">
                                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 flex items-center justify-between">
                                        <span className="text-gray-300 text-sm font-mono tracking-tight">
                                            {new Date(time).toLocaleDateString()}
                                        </span>
                                        <span className="text-white text-sm font-bold tabular-nums">
                                            {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.4)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )) : (
                                <div className="py-10 text-center text-gray-600 text-xs italic font-medium">
                                    Updating preview...
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
