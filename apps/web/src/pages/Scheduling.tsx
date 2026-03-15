import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
    Calendar, 
    Clock, 
    Plus, 
    Search, 
    MoreHorizontal,
    Play,
    Pause,
    Trash2,
    CalendarDays,
    Timer,
    ChevronRight,
    ExternalLink
} from 'lucide-react';

export default function Scheduling() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'calendars' | 'schedules'>(
        (searchParams.get('tab') as any) || 'calendars'
    );
    const [searchTerm, setSearchTerm] = useState('');

    const { data: calendars, isLoading: loadingCalendars } = useQuery({
        queryKey: ['calendars'],
        queryFn: () => fetch('/api/calendars').then(res => res.json())
    });

    const { data: schedules, isLoading: loadingSchedules } = useQuery({
        queryKey: ['schedules'],
        queryFn: () => fetch('/api/schedules').then(res => res.json())
    });

    const filteredCalendars = calendars?.filter((c: any) => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredSchedules = schedules?.filter((s: any) => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-[1200px] mx-auto">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">Scheduling Library</h1>
                    <p className="text-gray-500 text-sm">Manage reusable schedules and business calendars.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                    <button 
                        onClick={() => navigate(activeTab === 'calendars' ? '/scheduling/calendar/new' : '/scheduling/schedule/new')}
                        className="flex items-center gap-2 bg-[#f05a28] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#d84a1d] transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Create {activeTab === 'calendars' ? 'Calendar' : 'Schedule'}
                    </button>
                </div>
            </header>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="flex border-b border-gray-100 px-6 pt-4">
                    <button 
                        onClick={() => setActiveTab('calendars')}
                        className={`pb-4 px-4 text-sm font-bold transition-all relative ${
                            activeTab === 'calendars' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4" />
                            Calendars
                            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] ml-1">
                                {calendars?.length || 0}
                            </span>
                        </div>
                        {activeTab === 'calendars' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                        )}
                    </button>
                    <button 
                        onClick={() => setActiveTab('schedules')}
                        className={`pb-4 px-4 text-sm font-bold transition-all relative ${
                            activeTab === 'schedules' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4" />
                            Schedules
                            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] ml-1">
                                {schedules?.length || 0}
                            </span>
                        </div>
                        {activeTab === 'schedules' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                        )}
                    </button>
                </div>

                <div className="p-0">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider font-bold">
                                <th className="px-6 py-3 border-b border-gray-100 w-[40%]">Name</th>
                                <th className="px-6 py-3 border-b border-gray-100">Type / Mode</th>
                                <th className="px-6 py-3 border-b border-gray-100">State</th>
                                <th className="px-6 py-3 border-b border-gray-100">Last Updated</th>
                                <th className="px-6 py-3 border-b border-gray-100 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {activeTab === 'calendars' ? (
                                filteredCalendars?.map((c: any) => (
                                    <tr 
                                        key={c.id} 
                                        className="hover:bg-gray-50/50 cursor-pointer transition-colors group"
                                        onClick={() => navigate(`/scheduling/calendar/${c.id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                                    <CalendarDays className="w-4 h-4 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                        {c.name}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-medium">
                                                        {c.timezone}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold inline-block uppercase">
                                                {c.rules?.length || 0} Rules
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StateBadge state={c.state} />
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 tabular-nums font-medium">
                                            {new Date(c.updatedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 hover:bg-gray-200 rounded text-gray-400">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                                <ChevronRight className="w-4 h-4 text-gray-300" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                filteredSchedules?.map((s: any) => (
                                    <tr 
                                        key={s.id} 
                                        className="hover:bg-gray-50/50 cursor-pointer transition-colors group"
                                        onClick={() => navigate(`/scheduling/schedule/${s.id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                                    <Timer className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                        {s.name}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-medium truncate max-w-[200px]">
                                                        {s.description || 'No description'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold inline-block uppercase tracking-wide">
                                                {s.mode}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StateBadge state={s.state} />
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 tabular-nums font-medium">
                                            {new Date(s.updatedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 hover:bg-gray-200 rounded text-gray-400">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                                <ChevronRight className="w-4 h-4 text-gray-300" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {(activeTab === 'calendars' ? filteredCalendars : filteredSchedules)?.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                {activeTab === 'calendars' ? <CalendarDays className="w-8 h-8 text-gray-200" /> : <Timer className="w-8 h-8 text-gray-200" />}
                            </div>
                            <h3 className="text-sm font-bold text-gray-900">No {activeTab} found</h3>
                            <p className="text-xs text-gray-400 mt-1">Try a different search or create a new one.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StateBadge({ state }: { state: string }) {
    const isActive = state === 'ACTIVE';
    return (
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${
            isActive ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
        }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-orange-500'}`} />
            {state}
        </div>
    );
}
