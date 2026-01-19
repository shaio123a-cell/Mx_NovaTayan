import React, { useState, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DirtyStateProvider, useDirtyState } from './context/DirtyStateContext'

// Pages
import Dashboard from './pages/Dashboard'
import WorkflowDesigner from './pages/WorkflowDesigner'
import Tasks from './pages/Tasks'
import AdminWorkers from './pages/AdminWorkers'
import WorkflowExecutions from './pages/WorkflowExecutions'
import WorkflowExecutionDetail from './pages/WorkflowExecutionDetail'
import AdminDashboard from './pages/AdminDashboard'
import AdminSettings from './pages/AdminSettings'
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

    const sidebarWidth = isSidebarOpen ? 240 : 52;

    const handleSaveAndContinue = () => {
        window.dispatchEvent(new CustomEvent('DESIGNER_SAVE_REQUESTED'));
        setTimeout(() => {
            setShowDirtyModal(false);
            if (pendingAction) {
                pendingAction();
                setPendingAction(null);
            }
        }, 800);
    };

    const handleDiscardAndContinue = () => {
        setIsDirty(false);
        setShowDirtyModal(false);
        if (pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
    };

    const handleCancel = () => {
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
            <div style={{ width: `${sidebarWidth}px`, flexShrink: 0, transition: 'width 0.3s ease' }}>
                <Sidebar isOpen={isSidebarOpen} />
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
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/designer" element={<WorkflowDesigner />} />
                        <Route path="/output-processing" element={<Suspense fallback={<div>Loading...</div>}>{React.createElement(React.lazy(() => import('./pages/OutputProcessing')))}</Suspense>} />
                        <Route path="/history" element={<WorkflowExecutions />} />
                        <Route path="/workflows/history/:id" element={<WorkflowExecutionDetail />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/workers" element={<AdminWorkers />} />
                        <Route path="/admin/settings" element={<AdminSettings />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

function MainApp() {
    return (
        <QueryClientProvider client={queryClient}>
            <DirtyStateProvider>
                <BrowserRouter>
                    <AppContent />
                </BrowserRouter>
            </DirtyStateProvider>
        </QueryClientProvider>
    )
}

export default MainApp;
