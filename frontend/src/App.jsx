import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'

function PrivateRoute({ children }) {
    const token = localStorage.getItem('buildpos_token')
    return token ? children : <Navigate to="/login" replace />
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/*"
                    element={
                        <PrivateRoute>
                            <Layout />
                        </PrivateRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    )
}