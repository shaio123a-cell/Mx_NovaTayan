import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Pages
import Dashboard from './pages/Dashboard'
import WorkflowDesigner from './pages/WorkflowDesigner'
import Tasks from './pages/Tasks'
import AdminWorkers from './pages/AdminWorkers'
import WorkflowExecutions from './pages/WorkflowExecutions'
import WorkflowExecutionDetail from './pages/WorkflowExecutionDetail'
import AdminDashboard from './pages/AdminDashboard'
import AdminSettings from './pages/AdminSettings'

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

function App() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Forces the sidebar width based on state
    const sidebarWidth = isSidebarOpen ? 240 : 52;

    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                {/* 
                  ULTRA-STRICT FLEXBOX LAYOUT (Inline Styled)
                  This forces the layout to be side-by-side regardless of CSS loading.
                */}
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    height: '100vh', 
                    width: '100vw', 
                    overflow: 'hidden',
                    background: '#F5F5F5',
                    color: '#111827'
                }}>
                    
                    {/* Pillar 1: Sidebar (Static width, fixed position in flow) */}
                    <div style={{ width: `${sidebarWidth}px`, flexShrink: 0, transition: 'width 0.3s ease' }}>
                        <Sidebar isOpen={isSidebarOpen} />
                    </div>

                    {/* Pillar 2: Content Stack (Fills remaining space) */}
                    <div style={{ 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        minWidth: 0, 
                        height: '100%',
                        position: 'relative'
                    }}>
                        
                        {/* 2a. Header (Fixed height at top) */}
                        <Header 
                            isSidebarOpen={isSidebarOpen} 
                            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
                        />

                        {/* 2b. Main Content (The ACTUAL scrollable area) */}
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
                                <Route path="/history" element={<WorkflowExecutions />} />
                                <Route path="/workflows/history/:id" element={<WorkflowExecutionDetail />} />

                                {/* Admin Routes */}
                                <Route path="/admin" element={<AdminDashboard />} />
                                <Route path="/admin/workers" element={<AdminWorkers />} />
                                <Route path="/admin/settings" element={<AdminSettings />} />
                            </Routes>
                        </main>
                    </div>
                </div>
            </BrowserRouter>
        </QueryClientProvider>
    )
}

export default App
