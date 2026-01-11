import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, 
    ListTodo, 
    Network, 
    ShieldCheck, 
    Activity, 
    Settings,
    Cpu,
    HelpCircle,
    Component,
    ChevronRight
} from 'lucide-react';

interface NavItemData {
    icon: any;
    label: string;
    path: string;
    children?: { label: string; path: string; icon: any }[];
}

interface SidebarProps {
    isOpen: boolean; // Controls whether sidebar is visible at all
}

export function Sidebar({ isOpen }: SidebarProps) {
    const location = useLocation();
    const [expandedParents, setExpandedParents] = useState<string[]>(['Administration']);
    
    // Auto-expand/collapse toggle is handled by the Header, 
    // but the Sidebar should also support a "slim" vs "full" state.
    // However, the user wants "side by side" and "expand/collapse".
    // I will interpret "isSidebarOpen" from App.tsx as the "Expanded" vs "Slim" state.
    // If NOT isOpen, we show SLIM (icons only).
    // If isOpen, we show FULL (labels).

    const toggleParent = (label: string) => {
        setExpandedParents(prev => 
            prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
        );
    };

    const isActive = (path: string) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    const allItems: NavItemData[] = [
        { icon: LayoutDashboard, label: 'Home', path: '/' },
        { icon: Component, label: 'Dashboards', path: '/history' },
        { icon: Network, label: 'Designer', path: '/designer' },
        { icon: ListTodo, label: 'Tasks', path: '/tasks' },
        { 
            icon: ShieldCheck, 
            label: 'Administration', 
            path: '/admin',
            children: [
                { label: 'Overview', path: '/admin', icon: Activity },
                { label: 'Workers', path: '/admin/workers', icon: Cpu },
                { label: 'Settings', path: '/admin/settings', icon: Settings },
            ]
        },
    ];

    const helpItem = { icon: HelpCircle, label: 'Help', path: '/help' };

    // Strict Widths
    const widthClass = isOpen ? 'w-[240px]' : 'w-[52px]';

    return (
        <aside 
            className={`bg-[#111217] flex flex-col h-full shrink-0 transition-all duration-300 border-r border-[#202226] overflow-hidden ${widthClass}`}
        >
            {/* Logo Section */}
            <div className={`h-12 flex items-center shrink-0 border-b border-[#202226] transition-all duration-300 ${isOpen ? 'px-4' : 'px-3 justify-center'}`}>
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 bg-[#f05a28] rounded flex items-center justify-center shrink-0 shadow-lg">
                        <Activity className="text-white w-3.5 h-3.5" />
                    </div>
                    {isOpen && (
                        <span className="font-bold text-[#f2f5f5] text-sm tracking-tight truncate animate-in fade-in duration-500">RestMon</span>
                    )}
                </div>
            </div>

            {/* Navigation Scroll Area */}
            <div className="flex-1 overflow-y-auto mt-2 no-scrollbar overflow-x-hidden">
                <nav className={`flex-1 transition-all duration-300 ${isOpen ? 'px-2' : 'px-1'}`}>
                    {allItems.map((item) => (
                        <SidebarItem 
                            key={item.label}
                            item={item}
                            active={isActive(item.path)}
                            isParentOpen={expandedParents.includes(item.label)}
                            onToggleParent={() => toggleParent(item.label)}
                            isAnyChildActive={item.children?.some(c => isActive(c.path)) || false}
                            checkActive={isActive}
                            isSidebarExpanded={isOpen}
                        />
                    ))}
                </nav>

                <nav className={`mt-auto border-t border-[#202226] pt-4 pb-4 transition-all duration-300 ${isOpen ? 'px-2' : 'px-1'}`}>
                    <SidebarItem 
                        item={helpItem}
                        active={isActive(helpItem.path)}
                        isParentOpen={false}
                        onToggleParent={() => {}}
                        isAnyChildActive={false}
                        checkActive={isActive}
                        isSidebarExpanded={isOpen}
                    />
                </nav>
            </div>
        </aside>
    );
}

function SidebarItem({ 
    item, 
    active, 
    isParentOpen,
    onToggleParent,
    isAnyChildActive,
    checkActive,
    isSidebarExpanded
}: any) {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const displayActive = active || isAnyChildActive;

    return (
        <div className="mb-1">
            <Link
                to={item.path || '#'}
                onClick={(e) => {
                    if (hasChildren && isSidebarExpanded) {
                        e.preventDefault();
                        onToggleParent();
                    }
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded transition-all group relative ${
                    displayActive 
                        ? 'bg-[rgba(240,90,40,0.12)] text-white' 
                        : 'text-[#d8d9da] hover:bg-[#1e2023] hover:text-white'
                } ${!isSidebarExpanded && 'justify-center px-0'}`}
                title={!isSidebarExpanded ? item.label : undefined}
            >
                {/* Active strip */}
                {displayActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#f05a28]" />
                )}

                <Icon size={18} className={`${displayActive ? 'text-[#f05a28]' : 'text-[#9fa7b0] group-hover:text-white'} shrink-0`} />
                
                {isSidebarExpanded && (
                    <>
                        <span className="text-[13px] font-medium truncate animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>
                        {hasChildren && (
                            <ChevronRight 
                                size={14} 
                                className={`ml-auto transition-transform ${isParentOpen ? 'rotate-90' : ''} ${displayActive ? 'text-white' : 'text-[#464c54]'}`} 
                            />
                        )}
                    </>
                )}
            </Link>

            {/* Sub-menu (Expanded only when sidebar is expanded) */}
            {hasChildren && isParentOpen && isSidebarExpanded && (
                <div className="mt-0.5 ml-4 pl-3 border-l border-[#202226] space-y-1 animate-in slide-in-from-top-1 duration-200">
                    {item.children.map((child: any) => {
                        const ChildIcon = child.icon;
                        const isChildActive = checkActive(child.path);
                        return (
                            <Link
                                key={child.path}
                                to={child.path}
                                className={`flex items-center gap-3 px-3 py-1.5 rounded text-[12px] transition-all ${
                                    isChildActive 
                                        ? 'text-white font-semibold bg-[#1e2023]' 
                                        : 'text-[#9fa7b0] hover:text-white hover:bg-[#1e2023]'
                                }`}
                            >
                                <ChildIcon size={14} className="shrink-0" />
                                <span className="truncate">{child.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
