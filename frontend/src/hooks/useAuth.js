import { useState, useEffect } from 'react'
import { login as loginApi, logout as logoutApi, getMe } from '../api/auth'

export function useAuth() {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('buildpos_user')
        return saved ? JSON.parse(saved) : null
    })
    const [permissions, setPermissions] = useState([])
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

            // Permission larni olish
            const meRes = await getMe()
            const perms = meRes.data.permissions?.map(p => p.name) || []
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
            await logoutApi()
        } catch {}
        localStorage.removeItem('buildpos_token')
        localStorage.removeItem('buildpos_user')
        setUser(null)
        setPermissions([])
    }

    const hasPermission = (permName) => {
        if (user?.role === 'OWNER' || user?.role === 'ADMIN') return true
        return permissions.includes(permName)
    }

    return { user, permissions, loading, login, logout, hasPermission }
}