import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Placeholder pages
import Dashboard from './pages/Dashboard'
import WorkflowDesigner from './pages/WorkflowDesigner'
import Tasks from './pages/Tasks'
import AdminWorkers from './pages/AdminWorkers'
import WorkflowExecutions from './pages/WorkflowExecutions'
import WorkflowExecutionDetail from './pages/WorkflowExecutionDetail'
import AdminDashboard from './pages/AdminDashboard'

import { Sidebar } from './components/Sidebar'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false, // Don't refetch when tab regains focus
            retry: false, // Only retry once on failure
        },
    },
})

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
                    <Sidebar />

                    {/* Main Content Area */}
                    <main className="flex-1 overflow-auto relative">
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/tasks" element={<Tasks />} />
                            <Route path="/designer" element={<WorkflowDesigner />} />
                            <Route path="/history" element={<WorkflowExecutions />} />
                            <Route path="/workflows/history/:id" element={<WorkflowExecutionDetail />} />

                            {/* Admin Routes */}
                            <Route path="/admin" element={<AdminDashboard />} />
                            <Route path="/admin/workers" element={<AdminWorkers />} />
                        </Routes>
                    </main>
                </div>
            </BrowserRouter>
        </QueryClientProvider>
    )
}

export default App
