import { createContext, useContext, useState } from 'react'
import { login as loginApi, logout as logoutApi, getMe } from '../api/Auth'

const AuthContext = createContext(null)

const extractPermissions = (meData) => {
    const perms = []
    meData?.permissionGroups?.forEach(g =>
        g.permissions?.forEach(p => perms.push(p.name))
    )
    return perms
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('buildpos_user')
        return saved ? JSON.parse(saved) : null
    })

    const [permissions, setPermissions] = useState(() => {
        const saved = localStorage.getItem('buildpos_permissions')
        return saved ? JSON.parse(saved) : []
    })

    const [loading, setLoading] = useState(false)

    const login = async (username, password) => {
        setLoading(true)
        try {
            const res = await loginApi({ username, password })
            const { token, username: uname, role, fullName } = res.data

            localStorage.setItem('buildpos_token', token)
            const userData = { username: uname, role, fullName }
            localStorage.setItem('buildpos_user', JSON.stringify(userData))
            setUser(userData)

            const meRes = await getMe()
            const perms = extractPermissions(meRes.data)
            localStorage.setItem('buildpos_permissions', JSON.stringify(perms))
            setPermissions(perms)

            return { success: true }
        } catch (err) {
            return { success: false, message: err.response?.data?.message || 'Xatolik' }
        } finally {
            setLoading(false)
        }
    }

    const logout = async () => {
        try {
            await Promise.race([
                logoutApi(),
                new Promise((_, reject) => setTimeout(() => reject(), 2000))
            ])
        } catch {}
        localStorage.removeItem('buildpos_token')
        localStorage.removeItem('buildpos_user')
        localStorage.removeItem('buildpos_permissions')
        setUser(null)
        setPermissions([])
    }

    const refreshPermissions = async () => {
        try {
            const meRes = await getMe()
            const perms = extractPermissions(meRes.data)
            localStorage.setItem('buildpos_permissions', JSON.stringify(perms))
            setPermissions(perms)
        } catch {}
    }

    const hasPermission = (permName) => {
        if (user?.role === 'OWNER' || user?.role === 'ADMIN') return true
        return permissions.includes(permName)
    }

    return (
        <AuthContext.Provider value={{ user, permissions, loading, login, logout, hasPermission, refreshPermissions }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}