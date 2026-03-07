import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
    const { user } = useAuth()
    if (!user) return <Navigate to="/login" replace />
    return children
}

function AppRoutes() {
    return (
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
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    )
}