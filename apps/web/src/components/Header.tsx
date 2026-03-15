import { useLocation, Link } from 'react-router-dom';
import { Menu, Search, HelpCircle, User, Activity, ChevronRight } from 'lucide-react';
import { useBreadcrumbs } from '../context/BreadcrumbContext';
import { useDirtyState } from '../context/DirtyStateContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
    onToggleSidebar: () => void;
    isSidebarOpen: boolean;
}

export function Header({ onToggleSidebar, isSidebarOpen }: HeaderProps) {
    const { extraSegments } = useBreadcrumbs();
    const location = useLocation();
    const navigate = useNavigate();
    const { isDirty, setShowDirtyModal, setPendingAction } = useDirtyState();

    const handleLinkClick = (e: React.MouseEvent, path: string) => {
        e.preventDefault();
        if (isDirty) {
            setPendingAction(() => () => navigate(path));
            setShowDirtyModal(true);
        } else {
            navigate(path);
        }
    };

    // Generate breadcrumbs from path
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    let breadcrumbs: { label: string; path?: string }[] = [
        { label: 'RestMon', path: '/' }
    ];

    if (extraSegments.length > 0) {
        // If segments are provided explicitly, use them as the primary trail
        breadcrumbs = [...breadcrumbs, ...extraSegments];
    } else {
        // Fallback to path-based breadcrumbs only if no explicit segments are provided
        pathSegments.forEach((segment, index) => {
            // Ignore UUIDs or IDs in path breadcrumbs
            if (segment.length > 20 && segment.includes('-')) return;

            let label = segment.charAt(0).toUpperCase() + segment.slice(1);
            if (segment.toLowerCase() === 'history') label = 'History';
            if (segment.toLowerCase() === 'workflows') label = 'Workflow';
            if (segment.toLowerCase() === 'admin') label = 'Admin';
            
            breadcrumbs.push({
                label,
                path: '/' + pathSegments.slice(0, index + 1).join('/')
            });
        });
    }

    return (
        <header className="h-12 border-b border-[#202226] bg-[#111217] flex items-center px-2 shrink-0 z-[110]">
            <div className="flex items-center gap-3 flex-1">
                <button 
                    onClick={onToggleSidebar}
                    className="p-2 hover:bg-[#1e2023] rounded text-[#d8d9da] hover:text-white transition-colors"
                >
                    <Menu size={18} />
                </button>

                {/* Logo (only if sidebar is closed) */}
                {!isSidebarOpen && (
                    <Link 
                        to="/" 
                        onClick={(e) => handleLinkClick(e, '/')}
                        className="flex items-center gap-2 px-1"
                    >
                        <div className="w-6 h-6 bg-[#f05a28] rounded-sm flex items-center justify-center">
                            <Activity className="text-white w-4 h-4" />
                        </div>
                    </Link>
                )}

                {/* Breadcrumbs */}
                <nav className="flex items-center text-[13px] font-medium ml-2">
                    {breadcrumbs.map((crumb, index) => (
                        <div key={crumb.path || index} className="flex items-center">
                            {index > 0 && <ChevronRight size={14} className="mx-2 text-[#9fa7b0] shrink-0" />}
                            <Link 
                                to={crumb.path || '#'}
                                onClick={(e) => crumb.path && handleLinkClick(e, crumb.path)}
                                className={`${
                                    index === breadcrumbs.length - 1 || !crumb.path
                                        ? 'text-white pointer-events-none' 
                                        : 'text-[#9fa7b0] hover:text-white'
                                } transition-colors truncate max-w-[200px]`}
                            >
                                {crumb.label}
                            </Link>
                        </div>
                    ))}
                </nav>
            </div>

            {/* Right side items */}
            <div className="flex items-center gap-2">
                <div className="relative group hidden md:block mr-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9fa7b0]" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        className="bg-[#1e2023] border border-[#202226] rounded h-8 pl-8 pr-12 text-[12px] text-white focus:outline-none focus:border-[#464c54] w-48 transition-all"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#464c54] font-mono border border-[#464c54] px-1 rounded">ctrl+k</div>
                </div>
                
                <button className="p-2 text-[#9fa7b0] hover:text-white transition-colors">
                    <HelpCircle size={18} />
                </button>
                <div className="h-4 w-[1px] bg-[#202226] mx-1" />
                <button className="flex items-center gap-2 px-2 h-8 hover:bg-[#1e2023] rounded text-[#d8d9da] hover:text-white transition-colors">
                    <User size={18} />
                    <span className="text-[12px] font-medium hidden sm:inline">Admin</span>
                </button>
            </div>
        </header>
    );
}
