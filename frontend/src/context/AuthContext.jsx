import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { login as loginApi, logout as logoutApi, getMe } from '../api/Auth'
import { setAccessToken, clearAccessToken, getAccessToken } from '../api/api'

const INACTIVITY_MS  = 30 * 60 * 1000 // 30 daqiqa
const HEARTBEAT_MS   = 30 * 1000       // 30 soniyada bir session tekshirish

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

    // Ilovani yuklashda silent refresh — HttpOnly cookie bor bo'lsa tokenni tiklaymiz
    const [initializing, setInitializing] = useState(true)

    const inactivityTimer = useRef(null)
    const heartbeatTimer  = useRef(null)

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

    // Heartbeat: 30 soniyada bir access token tekshirish
    // Force-close bo'lsa → 401 → refresh ham ishlamasa → logout
    useEffect(() => {
        if (!user) return
        const check = async () => {
            if (!getAccessToken()) return
            try {
                await axios.get('/api/v1/employees/me', {
                    headers: { Authorization: `Bearer ${getAccessToken()}` }
                })
            } catch (err) {
                if (err.response?.status === 401) {
                    // Token yaroqsiz — refreshni sinab ko'ramiz
                    try {
                        const res = await axios.post('/api/auth/refresh', null, { withCredentials: true })
                        setAccessToken(res.data.token)
                    } catch {
                        // Refresh ham ishlamadi — majburiy logout
                        clearAccessToken()
                        sessionStorage.removeItem('buildpos_user')
                        sessionStorage.removeItem('buildpos_permissions')
                        setUser(null)
                        setPermissions([])
                        window.location.href = '/login'
                    }
                }
            }
        }
        heartbeatTimer.current = setInterval(check, HEARTBEAT_MS)
        return () => clearInterval(heartbeatTimer.current)
    }, [user])

    // App yuklanganda: cookie bor bo'lsa tokenni xotiraga tiklaymiz
    useEffect(() => {
        const savedUser = sessionStorage.getItem('buildpos_user')
        if (!savedUser) {
            setInitializing(false)
            return
        }
        axios.post('/api/auth/refresh', null, { withCredentials: true })
            .then(res => {
                setAccessToken(res.data.token)
            })
            .catch(() => {
                // Refresh token muddati o'tgan — sessiyani tozalaymiz
                sessionStorage.removeItem('buildpos_user')
                sessionStorage.removeItem('buildpos_permissions')
                setUser(null)
                setPermissions([])
            })
            .finally(() => setInitializing(false))
    }, [])

    const login = async (username, password) => {
        try {
            const res = await loginApi({ username, password })
            const { token, username: uname, role, fullName } = res.data

            // Access token — faqat xotirada
            setAccessToken(token)

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
        }
    }

    const logout = async () => {
        try {
            await Promise.race([
                logoutApi(),
                new Promise((_, reject) => setTimeout(() => reject(), 2000))
            ])
        } catch {}
        clearAccessToken()
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
        <AuthContext.Provider value={{ user, permissions, loading: initializing, login, logout, hasPermission, refreshPermissions }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}