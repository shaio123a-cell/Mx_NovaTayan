import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDirtyState } from '../context/DirtyStateContext';
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
    ChevronRight,
    Zap
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
    const navigate = useNavigate();
    const { isDirty, setShowDirtyModal, setPendingAction } = useDirtyState();
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
                { label: 'Global Variables', path: '/admin/variables', icon: Zap },
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
                            // Pass down global dirty state to avoid multiple useDirtyState calls if needed
                            isDirty={isDirty}
                            setShowDirtyModal={setShowDirtyModal}
                            setPendingAction={setPendingAction}
                            navigate={navigate}
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
                        isDirty={isDirty}
                        setShowDirtyModal={setShowDirtyModal}
                        setPendingAction={setPendingAction}
                        navigate={navigate}
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
    isSidebarExpanded,
    isDirty,
    setShowDirtyModal,
    setPendingAction,
    navigate
}: any) {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const displayActive = active || isAnyChildActive;

    const handleClick = (e: React.MouseEvent) => {
        if (hasChildren) {
            onToggleParent();
            return;
        }

        e.preventDefault();
        
        if (isDirty) {
            setPendingAction(() => () => navigate(item.path));
            setShowDirtyModal(true);
        } else {
            navigate(item.path);
        }
    };

    return (
        <div className="mb-0.5">
            <div 
                onClick={handleClick}
                className={`flex items-center gap-3 py-2 cursor-pointer transition-all duration-200 group relative ${
                    displayActive ? 'text-[#f2f5f5]' : 'text-[#9fa2a8] hover:text-[#f2f5f5] hover:bg-[#202226]'
                } ${isSidebarExpanded ? 'px-3 rounded-md' : 'px-0 justify-center'}`}
            >
                {/* Active Indicator Line */}
                {displayActive && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#f05a28] rounded-r-full shadow-[0_0_8px_rgba(240,90,40,0.4)]" />
                )}

                <Icon className={`shrink-0 transition-transform duration-200 ${!isSidebarExpanded && 'scale-110'} ${displayActive ? 'text-[#f05a28]' : ''} w-4 h-4`} />
                
                {isSidebarExpanded && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="text-xs font-semibold truncate leading-none pt-0.5">{item.label}</span>
                        {hasChildren && (
                            <ChevronRight 
                                className={`w-3 h-3 transition-transform duration-200 ${isParentOpen ? 'rotate-90' : ''}`}
                            />
                        )}
                    </div>
                )}

                {/* Tooltip for Slim Mode */}
                {!isSidebarExpanded && (
                    <div className="fixed left-14 bg-[#202226] text-[#dfdfdf] px-2.5 py-1.5 rounded text-[11px] font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-2xl z-[100] border border-[#303339] whitespace-nowrap">
                        {item.label}
                    </div>
                )}
            </div>

            {hasChildren && isParentOpen && isSidebarExpanded && (
                <div className="mt-1 space-y-0.5 ml-8 border-l border-[#202226] pl-2 animate-in slide-in-from-top-2 duration-200">
                    {item.children.map((child: any) => (
                        <div
                            key={child.path}
                            onClick={(e) => {
                                e.preventDefault();
                                if (isDirty) {
                                  setPendingAction(() => () => navigate(child.path));
                                  setShowDirtyModal(true);
                                } else {
                                  navigate(child.path);
                                }
                            }}
                            className={`flex items-center gap-2.5 py-1.5 px-3 rounded-md cursor-pointer text-[11px] font-medium transition-colors ${
                                checkActive(child.path) 
                                ? 'text-[#f05a28] bg-[#f05a28]/5' 
                                : 'text-[#8e8e8e] hover:text-[#f2f5f5] hover:bg-[#202226]'
                            }`}
                        >
                            <child.icon className="w-3.5 h-3.5" />
                            {child.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
