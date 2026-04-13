import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks';
import { workflowsApi } from '../api/workflows';
import { useDirtyState } from '../context/DirtyStateContext';
import { useToast } from '../context/ToastContext';
import { 
    ListTodo, 
    Network, 
    ShieldCheck, 
    Activity, 
    Settings,
    Cpu,
    HelpCircle,
    Component,
    ChevronRight,
    Zap,
    Clock,
    Folder
} from 'lucide-react';

interface NavItemData {
    icon: any;
    label: string;
    path: string;
    children?: NavItemData[];
}

interface SidebarProps {
    isOpen: boolean; 
    onResizeStart: () => void;
}

export function Sidebar({ isOpen, onResizeStart }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { isDirty, setShowDirtyModal, setPendingAction } = useDirtyState();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const moveTaskMutation = useMutation({
        mutationFn: ({ id, folderId }: { id: string, folderId: string | undefined }) => 
            tasksApi.updateTask(id, { folderId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task-folders'] });
            showToast('Task moved successfully', 'success');
        },
        onError: (err: any) => showToast(err.message || 'Failed to move task', 'error')
    });

    const moveWorkflowMutation = useMutation({
        mutationFn: ({ id, folderId }: { id: string, folderId: string | undefined }) => 
            workflowsApi.updateWorkflow(id, { folderId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] });
            queryClient.invalidateQueries({ queryKey: ['workflow-folders'] });
            showToast('Workflow moved successfully', 'success');
        },
        onError: (err: any) => showToast(err.message || 'Failed to move workflow', 'error')
    });
    const [expandedPaths, setExpandedPaths] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('sidebar_expanded_paths');
            return saved ? JSON.parse(saved) : ['Administration', 'Tasks'];
        } catch {
            return ['Administration', 'Tasks'];
        }
    });
    
    // Fetch Task Folders
    const { data: taskFolderTree } = useQuery({
        queryKey: ['task-folders'],
        queryFn: tasksApi.getFolderTree
    });

    // Fetch Workflow Folders
    const { data: workflowFolderTree } = useQuery({
        queryKey: ['workflow-folders'],
        queryFn: workflowsApi.getFolderTree
    });

    // Auto-expand tree to show current folder
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const folderId = params.get('folderId');
        const tree = location.pathname.startsWith('/tasks') ? taskFolderTree : workflowFolderTree;
        if (!folderId || !tree) return;

        const path: string[] = [];
        const findPath = (nodes: any[], targetId: string): boolean => {
            const basePath = location.pathname.startsWith('/tasks') ? '/tasks' : '/workflows';
            for (const node of nodes) {
                const nodePath = `${basePath}?folderId=${node.id}`;
                if (node.id === targetId) return true;
                if (node.children && findPath(node.children, targetId)) {
                    path.push(nodePath); 
                    return true;
                }
            }
            return false;
        };

        if (findPath(tree, folderId)) {
            setExpandedPaths(prev => {
                const missing = path.filter(p => !prev.includes(p));
                if (missing.length === 0) return prev;
                const next = [...prev, ...missing];
                localStorage.setItem('sidebar_expanded_paths', JSON.stringify(next));
                return next;
            });
        }
    }, [location.pathname, location.search, taskFolderTree, workflowFolderTree]);

    const toggleExpanded = (path: string) => {
        setExpandedPaths(prev => {
            const next = prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path];
            localStorage.setItem('sidebar_expanded_paths', JSON.stringify(next));
            return next;
        });
    };

    const isActive = (path: string) => {
        if (path === '/' && location.pathname === '/') return true;
        
        // Exact match for tasks with folderId
        if (path.includes('folderId=')) {
            return location.search.includes(path.split('?')[1]);
        }

        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    // Transform API folder tree to NavItemData recursively
    const taskChildren = useMemo(() => {
        const mapFolder = (folder: any): NavItemData => ({
            label: folder.name,
            path: `/tasks?folderId=${folder.id}`,
            icon: Folder,
            children: folder.children?.map(mapFolder)
        });
        return taskFolderTree?.map(mapFolder) || [];
    }, [taskFolderTree]);

    const workflowChildren = useMemo(() => {
        const mapFolder = (folder: any): NavItemData => ({
            label: folder.name,
            path: `/workflows?folderId=${folder.id}`,
            icon: Folder,
            children: folder.children?.map(mapFolder)
        });
        return workflowFolderTree?.map(mapFolder) || [];
    }, [workflowFolderTree]);

    const allItems = useMemo(() => [
        { 
            icon: Network, 
            label: 'Workflows', 
            path: '/workflows',
            children: workflowChildren
        },
        { icon: Component, label: 'Dashboards', path: '/history' },
        { icon: Zap, label: 'Designer', path: '/designer' },
        { 
            icon: ListTodo, 
            label: 'Tasks', 
            path: '/tasks',
            children: taskChildren
        },
        { icon: Clock, label: 'Scheduling', path: '/scheduling' },
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
    ], [taskChildren, workflowChildren]);

    const helpItem = { icon: HelpCircle, label: 'Help', path: '/help' };

    const widthClass = isOpen ? 'w-[240px]' : 'w-[52px]';

    return (
        <aside 
            className={`bg-[#111217] flex flex-col h-full shrink-0 transition-all duration-300 border-r border-[#202226] overflow-hidden w-full`}
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
                            key={item.label + item.path}
                            item={item}
                            active={isActive(item.path)}
                            isExpanded={expandedPaths.includes(item.path)}
                            onToggleExpanded={() => toggleExpanded(item.path)}
                            checkActive={isActive}
                            isSidebarExpanded={isOpen}
                            isDirty={isDirty}
                            setShowDirtyModal={setShowDirtyModal}
                            setPendingAction={setPendingAction}
                            navigate={navigate}
                            expandedPaths={expandedPaths}
                            toggleExpanded={toggleExpanded}
                            onDropTask={(id, folderId) => moveTaskMutation.mutate({ id, folderId })}
                            onDropWorkflow={(id, folderId) => moveWorkflowMutation.mutate({ id, folderId })}
                        />
                    ))}
                </nav>

                <nav className={`mt-auto border-t border-[#202226] pt-4 pb-4 transition-all duration-300 ${isOpen ? 'px-2' : 'px-1'}`}>
                    <SidebarItem 
                        item={helpItem}
                        active={isActive(helpItem.path)}
                        isExpanded={false}
                        onToggleExpanded={() => {}}
                        checkActive={isActive}
                        isSidebarExpanded={isOpen}
                        isDirty={isDirty}
                        setShowDirtyModal={setShowDirtyModal}
                        setPendingAction={setPendingAction}
                        navigate={navigate}
                        expandedPaths={expandedPaths}
                        toggleExpanded={toggleExpanded}
                    />
                </nav>
            </div>
            {/* Resize Handle */}
            {isOpen && (
                <div 
                    onMouseDown={onResizeStart}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#f05a28] transition-colors group z-50"
                >
                    <div className="absolute right-0 top-0 bottom-0 w-[4px] -mr-[2px]" />
                </div>
            )}
        </aside>
    );
}

function SidebarItem({ 
    item, 
    active, 
    isExpanded,
    onToggleExpanded,
    checkActive,
    isSidebarExpanded,
    isDirty,
    setShowDirtyModal,
    setPendingAction,
    navigate,
    expandedPaths,
    toggleExpanded,
    onDropTask,
    onDropWorkflow,
    depth = 0
}: any) {
    const [isDragOver, setIsDragOver] = useState(false);
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    
    // An item is "Active" if it's the current path or any of its children are active
    const isAnyChildActive = useMemo(() => {
        const checkChildren = (children: NavItemData[]): boolean => {
            return children.some(c => checkActive(c.path) || (c.children && checkChildren(c.children)));
        };
        return hasChildren ? checkChildren(item.children) : false;
    }, [item.children, checkActive, hasChildren]);

    const displayActive = active || isAnyChildActive;

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleExpanded();
    };

    const handleNavigate = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isDirty) {
            setPendingAction(() => () => navigate(item.path));
            setShowDirtyModal(true);
        } else {
            navigate(item.path);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        const isTask = e.dataTransfer.types.includes('application/restmon-task');
        const isWorkflow = e.dataTransfer.types.includes('application/restmon-workflow');
        
        // Only allow dropping if it's the right kind of folder
        if ((isTask && item.path.startsWith('/tasks')) || (isWorkflow && item.path.startsWith('/workflows'))) {
            e.preventDefault();
            setIsDragOver(true);
        }
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        
        const taskId = e.dataTransfer.getData('application/restmon-task');
        const workflowId = e.dataTransfer.getData('application/restmon-workflow');
        
        // Extract folderId from path (e.g., /tasks?folderId=uuid)
        const url = new URL(item.path, window.location.origin);
        const folderId = url.searchParams.get('folderId') || null;

        if (taskId && item.path.startsWith('/tasks') && onDropTask) {
            onDropTask(taskId, folderId);
        } else if (workflowId && item.path.startsWith('/workflows') && onDropWorkflow) {
            onDropWorkflow(workflowId, folderId);
        }
    };

    return (
        <div className="mb-0.5">
            <div 
                onClick={handleNavigate}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex items-center gap-3 py-2 cursor-pointer transition-all duration-200 group relative ${
                    displayActive ? 'text-[#f2f5f5]' : 'text-[#9fa2a8] hover:text-[#f2f5f5] hover:bg-[#202226]'
                } ${isSidebarExpanded ? 'px-3 rounded-md' : 'px-0 justify-center'} ${isDragOver ? 'bg-[#f05a28]/20 ring-1 ring-[#f05a28] scale-[1.02]' : ''}`}
                style={{ paddingLeft: isSidebarExpanded ? `${12 + depth * 12}px` : undefined }}
            >
                {/* Active Indicator Line */}
                {active && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#f05a28] rounded-r-full shadow-[0_0_8px_rgba(240,90,40,0.4)]" />
                )}

                <div onClick={hasChildren ? handleToggle : handleNavigate} className="shrink-0 flex items-center justify-center w-4 h-4">
                    <Icon className={`transition-transform duration-200 ${!isSidebarExpanded && 'scale-110'} ${displayActive ? 'text-[#f05a28]' : ''} w-4 h-4`} />
                </div>
                
                {isSidebarExpanded && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="text-[11px] font-semibold truncate leading-none pt-0.5">{item.label}</span>
                        {hasChildren && (
                            <div 
                                onClick={handleToggle}
                                className="p-1 hover:bg-white/10 rounded transition-colors"
                            >
                                <ChevronRight 
                                    className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                />
                            </div>
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

            {hasChildren && isExpanded && isSidebarExpanded && (
                <div className="mt-0.5 border-l border-[#202226]/50 ml-5 animate-in slide-in-from-top-2 duration-200">
                    {item.children.map((child: any) => (
                        <SidebarItem 
                            key={child.path + child.label}
                            item={child}
                            active={checkActive(child.path)}
                            isExpanded={expandedPaths?.includes(child.path)}
                            onToggleExpanded={() => toggleExpanded(child.path)}
                            checkActive={checkActive}
                            isSidebarExpanded={isSidebarExpanded}
                            isDirty={isDirty}
                            setShowDirtyModal={setShowDirtyModal}
                            setPendingAction={setPendingAction}
                            navigate={navigate}
                            expandedPaths={expandedPaths}
                            toggleExpanded={toggleExpanded}
                            onDropTask={onDropTask}
                            onDropWorkflow={onDropWorkflow}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
