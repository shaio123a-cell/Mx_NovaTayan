import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListTodo, Network, History, ShieldCheck, Activity } from 'lucide-react';

export function Sidebar() {
    const location = useLocation();

    const isActive = (path: string) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: ListTodo, label: 'Tasks', path: '/tasks' },
        { icon: Network, label: 'Designer', path: '/designer' },
        { icon: History, label: 'History', path: '/history' },
    ];

    const adminItems = [
        { icon: ShieldCheck, label: 'Admin', path: '/admin' },
    ];

    return (
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0 shrink-0">
            {/* Logo Area */}
            <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-900/50">
                    <Activity className="text-white w-5 h-5" />
                </div>
                <div>
                    <h1 className="font-bold text-lg tracking-tight text-white">RestMon</h1>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Orchestrator</p>
                </div>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                <div className="px-3 mb-2 text-xs font-bold text-gray-600 uppercase tracking-widest">Menu</div>
                {navItems.map((item) => (
                    <NavItem
                        key={item.path}
                        item={item}
                        active={isActive(item.path)}
                    />
                ))}

                <div className="my-6 border-t border-gray-800" />

                <div className="px-3 mb-2 text-xs font-bold text-gray-600 uppercase tracking-widest">System</div>
                {adminItems.map((item) => (
                    <NavItem
                        key={item.path}
                        item={item}
                        active={isActive(item.path)}
                    />
                ))}
            </div>

            {/* Version / Footer */}
            <div className="p-4 border-t border-gray-800">
                <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 font-mono">v1.2.0-beta</div>
                    <div className="text-[10px] text-gray-600 mt-1">Connected to local-cluster</div>
                </div>
            </div>
        </div>
    );
}

function NavItem({ item, active }: { item: any, active: boolean }) {
    const Icon = item.icon;
    return (
        <Link
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${active
                    ? 'bg-primary-600/10 text-primary-400 font-bold border border-primary-600/20'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
        >
            <Icon className={`w-5 h-5 ${active ? 'text-primary-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
            <span>{item.label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(var(--primary-500),0.8)]" />}
        </Link>
    );
}
