import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import CashierPage from '../src/pages/CashierPage.jsx'

function PrivateRoute({ children }) {
    const { user } = useAuth()
    if (!user) return <Navigate to="/login" replace />
    return children
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Fullscreen — Layout siz */}
            <Route path="/cashier" element={
                <PrivateRoute>
                    <CashierPage />
                </PrivateRoute>
            } />

            {/* Qolgan barcha sahifalar Layout ichida */}
            <Route path="/*" element={
                <PrivateRoute>
                    <Layout />
                </PrivateRoute>
            } />
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