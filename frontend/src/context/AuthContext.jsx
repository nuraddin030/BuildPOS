import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { login as loginApi, logout as logoutApi, getMe } from '../api/Auth'

const INACTIVITY_MS = 30 * 60 * 1000 // 30 daqiqa

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
        const saved = sessionStorage.getItem('buildpos_user')
        return saved ? JSON.parse(saved) : null
    })

    const [permissions, setPermissions] = useState(() => {
        const saved = sessionStorage.getItem('buildpos_permissions')
        return saved ? JSON.parse(saved) : []
    })

    const [loading, setLoading] = useState(false)
    const inactivityTimer = useRef(null)

    // F-09: Harakatsizlik timeout — 30 daqiqa
    const resetTimer = useCallback(() => {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
        inactivityTimer.current = setTimeout(() => {
            logout()
        }, INACTIVITY_MS)
    }, [])

    useEffect(() => {
        if (!user) return
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
        events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
        resetTimer()
        return () => {
            events.forEach(e => window.removeEventListener(e, resetTimer))
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
        }
    }, [user, resetTimer])

    const login = async (username, password) => {
        setLoading(true)
        try {
            const res = await loginApi({ username, password })
            const { token, refreshToken, username: uname, role, fullName } = res.data

            sessionStorage.setItem('buildpos_token', token)
            sessionStorage.setItem('buildpos_refresh_token', refreshToken)
            const userData = { username: uname, role, fullName }
            sessionStorage.setItem('buildpos_user', JSON.stringify(userData))
            setUser(userData)

            const meRes = await getMe()
            const perms = extractPermissions(meRes.data)
            sessionStorage.setItem('buildpos_permissions', JSON.stringify(perms))
            setPermissions(perms)

            return { success: true }
        } catch (err) {
            const data = err.response?.data || {}
            return {
                success: false,
                message: data.message || 'Xatolik',
                locked: !!data.locked,
                minutesLeft: data.minutesLeft || null,
                remainingAttempts: data.remainingAttempts || null,
            }
        } finally {
            setLoading(false)
        }
    }

    const logout = async () => {
        const refreshToken = sessionStorage.getItem('buildpos_refresh_token')
        try {
            await Promise.race([
                logoutApi(refreshToken),
                new Promise((_, reject) => setTimeout(() => reject(), 2000))
            ])
        } catch {}
        sessionStorage.removeItem('buildpos_token')
        sessionStorage.removeItem('buildpos_refresh_token')
        sessionStorage.removeItem('buildpos_user')
        sessionStorage.removeItem('buildpos_permissions')
        setUser(null)
        setPermissions([])
    }

    const refreshPermissions = async () => {
        try {
            const meRes = await getMe()
            const perms = extractPermissions(meRes.data)
            sessionStorage.setItem('buildpos_permissions', JSON.stringify(perms))
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