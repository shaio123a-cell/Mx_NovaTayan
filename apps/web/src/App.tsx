import React, { useState, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DirtyStateProvider, useDirtyState } from './context/DirtyStateContext'
import { ToastProvider } from './context/ToastContext'
import { BreadcrumbProvider } from './context/BreadcrumbContext'

// Pages
import Dashboard from './pages/Dashboard'
import WorkflowDesigner from './pages/WorkflowDesigner'
import Tasks from './pages/Tasks'
import { Workflows } from './pages/Workflows'
import AdminWorkers from './pages/AdminWorkers'
import WorkflowExecutions from './pages/WorkflowExecutions'
import WorkflowExecutionDetail from './pages/WorkflowExecutionDetail'
import AdminDashboard from './pages/AdminDashboard'
import AdminSettings from './pages/AdminSettings'
import AdminGlobalVars from './pages/AdminGlobalVars'
import Scheduling from './pages/Scheduling'
import CalendarDetail from './pages/CalendarDetail'
import ScheduleDetail from './pages/ScheduleDetail'
import { UnsavedChangesModal } from './components/UnsavedChangesModal'

// Components
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: false,
        },
    },
})

function AppContent() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const { setIsDirty, showDirtyModal, setShowDirtyModal, pendingAction, setPendingAction } = useDirtyState();
    
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = localStorage.getItem('sidebar_width');
        return saved ? Number(saved) : 240;
    });
    const [isDragging, setIsDragging] = useState(false);

    const startResizing = React.useCallback(() => {
        setIsDragging(true);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, []);

    const handleMouseMove = React.useCallback((e: MouseEvent) => {
        const newWidth = Math.min(Math.max(200, e.clientX), 600);
        setSidebarWidth(newWidth);
        localStorage.setItem('sidebar_width', String(newWidth));
    }, []);

    const handleSaveAndContinue = () => {
        // Close the modal immediately so UI feels responsive
        setShowDirtyModal(false);
        // Store the current pendingAction in a closure captured here
        const actionToRun = pendingAction;
        setPendingAction(null);
        // Tell the editor to save. When it finishes, it fires DESIGNER_SAVE_COMPLETE.
        const onSaveComplete = () => {
            window.removeEventListener('DESIGNER_SAVE_COMPLETE', onSaveComplete);
            if (actionToRun) {
                actionToRun();
            }
        };
        window.addEventListener('DESIGNER_SAVE_COMPLETE', onSaveComplete);
        window.dispatchEvent(new CustomEvent('DESIGNER_SAVE_REQUESTED'));
    };

    const handleDiscardAndContinue = () => {
        setIsDirty(false);
        setShowDirtyModal(false);
        const actionToRun = pendingAction;
        setPendingAction(null);
        if (actionToRun) {
            actionToRun();
        }
    };

    const handleCancel = () => {
        // Just close the modal — stay on the current page, no navigation
        setShowDirtyModal(false);
        setPendingAction(null);
    };

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'row', 
            height: '100vh', 
            width: '100vw', 
            overflow: 'hidden',
            background: '#F5F5F5',
            color: '#111827'
        }}>
            <UnsavedChangesModal 
                isOpen={showDirtyModal}
                onSave={handleSaveAndContinue}
                onDiscard={handleDiscardAndContinue}
                onCancel={handleCancel}
            />
            {/* Pillar 1: Sidebar */}
            <div style={{ width: `${isSidebarOpen ? sidebarWidth : 52}px`, flexShrink: 0, transition: isDragging ? 'none' : 'width 0.3s ease', position: 'relative' }}>
                <Sidebar 
                    isOpen={isSidebarOpen} 
                    onResizeStart={startResizing}
                />
            </div>

            {/* Pillar 2: Content Stack */}
            <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                minWidth: 0, 
                height: '100%',
                position: 'relative'
            }}>
                <Header 
                    isSidebarOpen={isSidebarOpen} 
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
                />

                <main style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    overflowX: 'hidden',
                    padding: '40px',
                    background: '#F5F5F5'
                }}>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/workflows" element={<Workflows />} />
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/designer" element={<WorkflowDesigner />} />
                        <Route path="/output-processing" element={<Suspense fallback={<div>Loading...</div>}>{React.createElement(React.lazy(() => import('./pages/OutputProcessing')))}</Suspense>} />
                        <Route path="/history" element={<WorkflowExecutions />} />
                        <Route path="/workflows/history/:id" element={<WorkflowExecutionDetail />} />
                        <Route path="/scheduling" element={<Scheduling />} />
                        <Route path="/scheduling/calendar/:id" element={<CalendarDetail />} />
                        <Route path="/scheduling/schedule/:id" element={<ScheduleDetail />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/workers" element={<AdminWorkers />} />
                        <Route path="/admin/settings" element={<AdminSettings />} />
                        <Route path="/admin/variables" element={<AdminGlobalVars />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

function MainApp() {
    return (
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <BreadcrumbProvider>
                    <DirtyStateProvider>
                        <BrowserRouter>
                            <AppContent />
                        </BrowserRouter>
                    </DirtyStateProvider>
                </BreadcrumbProvider>
            </ToastProvider>
        </QueryClientProvider>
    )
}

export default MainApp;
