import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    ChevronLeft, 
    Save, 
    Plus, 
    Trash2, 
    Calendar as CalendarIcon,
    Globe,
    ToggleLeft,
    ToggleRight,
    Search,
    Clock,
    CalendarDays,
    Info,
    Check,
    ChevronDown,
    Undo2,
    X as XIcon
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useDirtyState } from '../context/DirtyStateContext';
import { ImpactAnalysis } from '../components/ImpactAnalysis';
import { schedulingApi } from '../api/scheduling';
import { BlockedDeleteModal } from '../components/BlockedDeleteModal';

export default function CalendarDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { isDirty, setIsDirty, setShowDirtyModal, setPendingAction } = useDirtyState();
    const isNew = id === 'new';
    const EXIT_PATH = '/scheduling?tab=calendars';

    const [form, setForm] = useState({
        name: '',
        description: '',
        timezone: 'UTC',
        state: 'ACTIVE',
        rules: [] as any[]
    });

    const lastSavedFormRef = useRef<any>(null);
    const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);

    const { data: calendar, isLoading } = useQuery({
        queryKey: ['calendar', id],
        queryFn: () => fetch(`/api/calendars/${id}`).then(res => res.json()),
        enabled: !isNew
    });

    const { data: usageData } = useQuery({
        queryKey: ['calendar-usage', id],
        queryFn: () => schedulingApi.getCalendarUsage(id!),
        enabled: !isNew
    });

    useEffect(() => {
        if (calendar && !isNew) {
            const initialData = {
                name: calendar.name || '',
                description: calendar.description || '',
                timezone: calendar.timezone || 'UTC',
                state: calendar.state || 'ACTIVE',
                rules: calendar.rules?.map((r: any) => ({
                    ...r,
                    type: r.ruleType || r.type
                })) || []
            };
            setForm(initialData);
            // Use a deep copy for the ref so form mutations don't affect it
            lastSavedFormRef.current = JSON.parse(JSON.stringify(initialData));
            setIsDirty(false);
        }
    }, [calendar, isNew, setIsDirty]);

    // Update dirty state reactively whenever the form changes
    useEffect(() => {
        if (lastSavedFormRef.current) {
            const isDifferent = JSON.stringify(form) !== JSON.stringify(lastSavedFormRef.current);
            setIsDirty(isDifferent);
        }
    }, [form, setIsDirty]);

    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            const method = isNew ? 'POST' : 'PUT';
            const url = isNew ? '/api/calendars' : `/api/calendars/${id}`;
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
            showToast('Calendar saved successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['calendars'] });
            queryClient.invalidateQueries({ queryKey: ['calendar', id] });
            // Update the ref (not state) so it doesn't trigger the dirty effect
            lastSavedFormRef.current = JSON.parse(JSON.stringify(variables));
            setIsDirty(false);
            // Signal Save & Exit that save is complete
            window.dispatchEvent(new CustomEvent('DESIGNER_SAVE_COMPLETE'));

            if (isNew && data.id) {
                navigate(`/scheduling/calendar/${data.id}`, { replace: true });
            }
        },
        onError: (error: any) => {
            showToast(error.message || 'Failed to save calendar', 'error');
        }
    });

    // Respond to Save request (from dirty modal) — save then signal completion
    useEffect(() => {
        const handleGlobalSave = () => saveMutation.mutate(form);
        window.addEventListener('DESIGNER_SAVE_REQUESTED', handleGlobalSave);
        return () => window.removeEventListener('DESIGNER_SAVE_REQUESTED', handleGlobalSave);
    }, [form, saveMutation]);

    const deleteMutation = useMutation({
        mutationFn: () => schedulingApi.deleteCalendar(id!),
        onSuccess: () => {
            showToast('Calendar deleted successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['calendars'] });
            navigate(EXIT_PATH);
        },
        onError: (error: any) => {
            showToast(error.message || 'Failed to delete calendar', 'error');
        }
    });

    const showExitModal = () => {
        setPendingAction(() => () => navigate(EXIT_PATH));
        setShowDirtyModal(true);
    };

    const handleCancel = () => {
        if (isDirty) {
            showExitModal();
        } else {
            navigate(EXIT_PATH);
        }
    };

    const handleBack = () => {
        if (isDirty) {
            showExitModal();
        } else {
            navigate(EXIT_PATH);
        }
    };

    const handleDelete = () => {
        if (usageData?.usageCount > 0) {
            setIsBlockedModalOpen(true);
        } else {
            if (window.confirm('Are you sure you want to delete this calendar?')) {
                deleteMutation.mutate();
            }
        }
    };

    const addRule = (type: 'ALLOW_WINDOW' | 'EXCLUDE_WINDOW' | 'EXCEPTION_DATE') => {
        const newRule = {
            type: type,
            payload: type === 'EXCEPTION_DATE' 
                ? { date: new Date().toISOString().split('T')[0] } 
                : { daysOfWeek: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' }
        };
        setForm({ ...form, rules: [...form.rules, newRule] });
    };

    const removeRule = (index: number) => {
        const updatedRules = [...form.rules];
        updatedRules.splice(index, 1);
        setForm({ ...form, rules: updatedRules });
    };

    const updateRulePayload = (index: number, payloadUpdate: any) => {
        const updatedRules = [...form.rules];
        updatedRules[index].payload = { ...updatedRules[index].payload, ...payloadUpdate };
        setForm({ ...form, rules: updatedRules });
    };

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
                            {isNew ? 'New Calendar' : form.name}
                        </h1>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-0.5">
                            Calendar Configuration
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setForm({ ...form, state: form.state === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' })}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            form.state === 'ACTIVE' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}
                    >
                        {form.state === 'ACTIVE' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        {form.state}
                    </button>
                    <button 
                        onClick={handleCancel}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                    >
                        <XIcon className="w-4 h-4" /> Cancel
                    </button>
                    <button 
                        onClick={() => saveMutation.mutate(form)}
                        disabled={saveMutation.isPending || !isDirty}
                        className="flex items-center gap-2 bg-[#f05a28] text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-[#d84a1d] transition-all shadow-sm disabled:opacity-50"
                    >
                        {saveMutation.isPending ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                    </button>
                    {!isNew && (
                        <button 
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="p-2.5 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            title="Delete Calendar"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            <ImpactAnalysis usageData={usageData} type="calendar" />

            <BlockedDeleteModal 
                isOpen={isBlockedModalOpen} 
                onClose={() => setIsBlockedModalOpen(false)}
                usageData={usageData}
                type="calendar"
            />

            <div className="grid grid-cols-3 gap-8">
                <div className="col-span-1 space-y-6">
                    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-50 pb-3">
                            <Info className="w-4 h-4 text-blue-500" />
                            General Information
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Name</label>
                                <input 
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Business Hours IL"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Timezone</label>
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
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Standard working hours for Israel office..."
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none"
                                />
                            </div>
                        </div>
                    </section>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                        <h4 className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            Rule Evaluation
                        </h4>
                        <p className="text-[10px] leading-relaxed text-blue-700 font-medium">
                            Calendars use "OR" logic. A trigger is allowed if it fits within ANY Allow Window and is NOT blocked by an Exclude Window or Exception Date.
                        </p>
                    </div>
                </div>

                <div className="col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            Rules Designer
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">
                                {form.rules.length}
                            </span>
                        </h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => addRule('ALLOW_WINDOW')}
                                className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5" /> Allow
                            </button>
                            <button 
                                onClick={() => addRule('EXCLUDE_WINDOW')}
                                className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5" /> Exclude
                            </button>
                            <button 
                                onClick={() => addRule('EXCEPTION_DATE')}
                                className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5" /> Date
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {form.rules.length === 0 ? (
                            <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl py-20 text-center">
                                <Search className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                                <p className="text-sm font-bold text-gray-400">No gating rules defined.</p>
                                <p className="text-[10px] text-gray-300 mt-1 uppercase font-bold tracking-widest">Add a rule to control workflow execution windows</p>
                            </div>
                        ) : (
                            form.rules.map((rule, idx) => (
                                <div 
                                    key={idx} 
                                    className={`bg-white border rounded-xl p-5 shadow-sm transition-all hover:shadow-md relative group ${
                                        rule.type === 'ALLOW_WINDOW' ? 'border-l-4 border-l-green-500' : 
                                        rule.type === 'EXCLUDE_WINDOW' ? 'border-l-4 border-l-orange-500' : 
                                        'border-l-4 border-l-red-500'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                {rule.type === 'ALLOW_WINDOW' && <div className="px-2 py-0.5 rounded bg-green-50 text-green-700 text-[9px] font-bold uppercase tracking-tight">Allow Window</div>}
                                                {rule.type === 'EXCLUDE_WINDOW' && <div className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 text-[9px] font-bold uppercase tracking-tight">Exclude Window</div>}
                                                {rule.type === 'EXCEPTION_DATE' && <div className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-[9px] font-bold uppercase tracking-tight">Exception Date</div>}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => removeRule(idx)}
                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-12 gap-6 items-end">
                                        {rule.type === 'EXCEPTION_DATE' ? (
                                            <div className="col-span-6">
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Specific Date</label>
                                                <input 
                                                    type="date"
                                                    value={rule.payload.date}
                                                    onChange={(e) => updateRulePayload(idx, { date: e.target.value })}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="col-span-7">
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Days of Week</label>
                                                    <div className="flex gap-2">
                                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, dIdx) => {
                                                            const isActive = rule.payload.daysOfWeek?.includes(dIdx);
                                                            return (
                                                                <button 
                                                                    key={dIdx}
                                                                    onClick={() => {
                                                                        const days = rule.payload.daysOfWeek || [];
                                                                        const newDays = days.includes(dIdx) 
                                                                            ? days.filter((d: number) => d !== dIdx) 
                                                                            : [...days, dIdx].sort();
                                                                        updateRulePayload(idx, { daysOfWeek: newDays });
                                                                    }}
                                                                    className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all border ${
                                                                        isActive 
                                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                                                        : 'bg-white border-gray-200 text-gray-400 hover:border-blue-400'
                                                                    }`}
                                                                >
                                                                    {day}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="col-span-5 flex gap-3">
                                                    <div className="flex-1">
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Start</label>
                                                        <input 
                                                            type="time"
                                                            value={rule.payload.start}
                                                            onChange={(e) => updateRulePayload(idx, { start: e.target.value })}
                                                            className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">End</label>
                                                        <input 
                                                            type="time"
                                                            value={rule.payload.end}
                                                            onChange={(e) => updateRulePayload(idx, { end: e.target.value })}
                                                            className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold"
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
