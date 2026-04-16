import { useState, useEffect } from 'react'
import { ShieldCheck, Search, Loader2, AlertTriangle, Monitor, Smartphone, Clock, LogIn, LogOut } from 'lucide-react'
import api from '../api/api'
import '../styles/AuditLogPage.css'

const ACTION_COLORS = {
    LOGIN:      { bg: '#d1fae5', color: '#065f46', label: 'Kirish' },
    LOGIN_FAIL: { bg: '#fee2e2', color: '#991b1b', label: 'Xato parol' },
    LOCKED:     { bg: '#fff7ed', color: '#c2410c', label: 'Bloklandi' },
    CREATE:     { bg: '#dbeafe', color: '#1e40af', label: 'Yaratildi' },
    UPDATE:     { bg: '#fef9c3', color: '#854d0e', label: 'Yangilandi' },
    DELETE:     { bg: '#fee2e2', color: '#991b1b', label: 'O\'chirildi' },
}

function parseDevice(userAgent) {
    if (!userAgent) return { icon: 'monitor', name: 'Noma\'lum' }
    const ua = userAgent.toLowerCase()
    const isMobile = /mobile|android|iphone|ipad/.test(ua)
    let browser = 'Noma\'lum'
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome'
    else if (ua.includes('firefox')) browser = 'Firefox'
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
    else if (ua.includes('edg')) browser = 'Edge'
    let os = ''
    if (ua.includes('windows')) os = 'Windows'
    else if (ua.includes('android')) os = 'Android'
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'
    else if (ua.includes('mac')) os = 'macOS'
    else if (ua.includes('linux')) os = 'Linux'
    return { icon: isMobile ? 'mobile' : 'monitor', name: `${browser}${os ? ' / ' + os : ''}` }
}

function fmtDate(dt) {
    if (!dt) return '—'
    const d = new Date(dt)
    const pad = n => String(n).padStart(2, '0')
    return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fmtDuration(sec) {
    if (sec == null) return null // faol
    if (sec < 60)   return `${sec} son`
    if (sec < 3600) return `${Math.floor(sec / 60)} daq`
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return m > 0 ? `${h}s ${m}d` : `${h} soat`
}

// ── Audit log tab ─────────────────────────────────────────────
function AuditTab() {
    const [logs,    setLogs]    = useState([])
    const [total,   setTotal]   = useState(0)
    const [page,    setPage]    = useState(0)
    const [loading, setLoading] = useState(true)
    const [error,   setError]   = useState('')
    const [username, setUsername] = useState('')
    const [action,   setAction]   = useState('')
    const [from,     setFrom]     = useState('')
    const [to,       setTo]       = useState('')

    useEffect(() => {
        let alive = true
        setLoading(true)
        const params = new URLSearchParams({ page, size: 50 })
        if (username) params.set('username', username)
        if (action)   params.set('action', action)
        if (from)     params.set('from', from)
        if (to)       params.set('to', to)
        params.set('excludeAuth', 'true')
        api.get(`/api/v1/audit-logs?${params}`)
            .then(r => { if (alive) { setLogs(r.data.content); setTotal(r.data.totalElements); setError(''); setLoading(false) } })
            .catch(() => { if (alive) { setError("Ma'lumot yuklanmadi"); setLoading(false) } })
        return () => { alive = false }
    }, [page, username, action, from, to])

    return (
        <>
            <div className="al-filter">
                <input className="al-input" placeholder="Foydalanuvchi..."
                    value={username} onChange={e => { setUsername(e.target.value); setPage(0) }} />
                <select className="al-input al-select"
                    value={action} onChange={e => { setAction(e.target.value); setPage(0) }}>
                    <option value="">Barcha amallar</option>
                    <option value="CREATE">Yaratildi</option>
                    <option value="UPDATE">Yangilandi</option>
                    <option value="DELETE">O'chirildi</option>
                </select>
                <input type="date" className="al-input" value={from}
                    onChange={e => { setFrom(e.target.value); setPage(0) }} />
                <input type="date" className="al-input" value={to}
                    onChange={e => { setTo(e.target.value); setPage(0) }} />
            </div>

            {loading ? (
                <div className="table-loading" style={{ minHeight: 200 }}>
                    <Loader2 size={28} className="spin" style={{ color: 'var(--primary)' }} />
                    <p>Yuklanmoqda...</p>
                </div>
            ) : error ? (
                <div className="table-empty"><AlertTriangle size={36} strokeWidth={1} /><p>{error}</p></div>
            ) : (
                <div className="al-card">
                    <div className="al-table-wrap">
                        <table className="ptable">
                            <thead>
                                <tr>
                                    <th>Amal</th>
                                    <th>Foydalanuvchi</th>
                                    <th>Ob'ekt</th>
                                    <th>O'zgarish</th>
                                    <th>Qurilma</th>
                                    <th className="th-right">Vaqt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Ma'lumot yo'q</td></tr>
                                ) : logs.map(log => {
                                    const ac  = ACTION_COLORS[log.action] || { bg: 'var(--border-color)', color: 'var(--text-muted)', label: log.action }
                                    const dev = parseDevice(log.userAgent)
                                    return (
                                        <tr key={log.id}>
                                            <td>
                                                <span className="al-badge" style={{ background: ac.bg, color: ac.color }}>{ac.label}</span>
                                            </td>
                                            <td><div className="cell-name">{log.username || '—'}</div></td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                                                        {log.entityName || log.entityType}
                                                    </span>
                                                    <span className="cell-muted" style={{ fontSize: 11 }}>
                                                        {log.entityType}{log.entityId ? ` #${log.entityId}` : ''}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ maxWidth: 280 }}>
                                                {log.details
                                                    ? <span style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                                                        {log.details.split(' | ').map((d, i) => (
                                                            <span key={i} style={{ display: 'block' }}>{d}</span>
                                                        ))}
                                                      </span>
                                                    : <span className="cell-muted" style={{ fontSize: 12 }}>—</span>
                                                }
                                            </td>
                                            <td>
                                                <div className="al-device">
                                                    {dev.icon === 'mobile'
                                                        ? <Smartphone size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                                        : <Monitor size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                                                    <span>{dev.name}</span>
                                                </div>
                                            </td>
                                            <td className="th-right">
                                                <span className="cell-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(log.createdAt)}</span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    {total > 50 && (
                        <div className="al-pagination">
                            <button className="al-page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Oldingi</button>
                            <span className="al-page-info">{page + 1} / {Math.ceil(total / 50)}</span>
                            <button className="al-page-btn" disabled={(page + 1) * 50 >= total} onClick={() => setPage(p => p + 1)}>Keyingi →</button>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}

// ── Sessiyalar tab ────────────────────────────────────────────
function SessionsTab() {
    const [sessions, setSessions] = useState([])
    const [total,    setTotal]    = useState(0)
    const [page,     setPage]     = useState(0)
    const [loading,  setLoading]  = useState(true)
    const [error,    setError]    = useState('')
    const [username, setUsername] = useState('')
    const [from,     setFrom]     = useState('')
    const [to,       setTo]       = useState('')
    const [failed,   setFailed]   = useState([])

    useEffect(() => {
        let alive = true
        setLoading(true)
        const params = new URLSearchParams({ page, size: 50 })
        if (username) params.set('username', username)
        if (from)     params.set('from', from)
        if (to)       params.set('to', to)

        Promise.all([
            api.get(`/api/v1/sessions?${params}`),
            api.get(`/api/v1/audit-logs/failed-attempts?${params}`)
        ])
            .then(([sRes, fRes]) => {
                if (!alive) return
                setSessions(sRes.data.content)
                setTotal(sRes.data.totalElements)
                setFailed(fRes.data)
                setError('')
                setLoading(false)
            })
            .catch(() => { if (alive) { setError("Ma'lumot yuklanmadi"); setLoading(false) } })
        return () => { alive = false }
    }, [page, username, from, to])

    return (
        <>
            <div className="al-filter">
                <input className="al-input" placeholder="Foydalanuvchi..."
                    value={username} onChange={e => { setUsername(e.target.value); setPage(0) }} />
                <input type="date" className="al-input" value={from}
                    onChange={e => { setFrom(e.target.value); setPage(0) }} />
                <input type="date" className="al-input" value={to}
                    onChange={e => { setTo(e.target.value); setPage(0) }} />
            </div>

            {loading ? (
                <div className="table-loading" style={{ minHeight: 200 }}>
                    <Loader2 size={28} className="spin" style={{ color: 'var(--primary)' }} />
                    <p>Yuklanmoqda...</p>
                </div>
            ) : error ? (
                <div className="table-empty"><AlertTriangle size={36} strokeWidth={1} /><p>{error}</p></div>
            ) : (
                <div className="al-card">
                    <div className="al-table-wrap">
                        <table className="ptable">
                            <thead>
                                <tr>
                                    <th>Foydalanuvchi</th>
                                    <th>Kirish</th>
                                    <th>Chiqish</th>
                                    <th className="th-center">Davomiylik</th>
                                    <th>IP / Qurilma</th>
                                    <th className="th-center">Holat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.length === 0 ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Ma'lumot yo'q</td></tr>
                                ) : sessions.map(s => {
                                    const duration = fmtDuration(s.durationSec)
                                    const isActive = s.logoutAt == null
                                    return (
                                        <tr key={s.id}>
                                            <td><div className="cell-name">{s.username}</div></td>
                                            <td>
                                                <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                                                    {fmtDate(s.loginAt)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="cell-muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                                                    {isActive ? '—' : fmtDate(s.logoutAt)}
                                                </span>
                                            </td>
                                            <td className="th-center">
                                                {isActive
                                                    ? <span className="al-duration-active">Faol</span>
                                                    : <span className="al-duration">{duration}</span>
                                                }
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    <code className="al-ip">{s.ipAddress}</code>
                                                    <span className="al-device" style={{ fontSize: 11 }}>{s.device || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="th-center">
                                                {isActive ? (
                                                    <span className="al-badge" style={{ background: '#d1fae5', color: '#065f46' }}>
                                                        <LogIn size={10} style={{ display: 'inline', marginRight: 3 }} />
                                                        Tizimda
                                                    </span>
                                                ) : (
                                                    <span className="al-badge" style={{ background: 'var(--border-color)', color: 'var(--text-muted)' }}>
                                                        <LogOut size={10} style={{ display: 'inline', marginRight: 3 }} />
                                                        {s.logoutType === 'MANUAL' ? 'Chiqdi' : 'Tugadi'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    {total > 50 && (
                        <div className="al-pagination">
                            <button className="al-page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Oldingi</button>
                            <span className="al-page-info">{page + 1} / {Math.ceil(total / 50)}</span>
                            <button className="al-page-btn" disabled={(page + 1) * 50 >= total} onClick={() => setPage(p => p + 1)}>Keyingi →</button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Muvaffaqiyatsiz urinishlar ── */}
            {!loading && failed.length > 0 && (
                <div className="al-card">
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#991b1b' }}>Muvaffaqiyatsiz urinishlar</span>
                        <span className="al-badge" style={{ background: '#fee2e2', color: '#991b1b' }}>{failed.length}</span>
                    </div>
                    <div className="al-table-wrap">
                        <table className="ptable">
                            <thead>
                                <tr>
                                    <th>Foydalanuvchi</th>
                                    <th>Hodisa</th>
                                    <th>IP manzil</th>
                                    <th>Qurilma</th>
                                    <th className="th-right">Vaqt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {failed.map(f => {
                                    const dev = parseDevice(f.userAgent)
                                    return (
                                        <tr key={f.id}>
                                            <td><div className="cell-name">{f.username || '—'}</div></td>
                                            <td>
                                                <span className="al-badge" style={
                                                    f.action === 'LOCKED'
                                                        ? { background: '#fff7ed', color: '#c2410c' }
                                                        : { background: '#fee2e2', color: '#991b1b' }
                                                }>
                                                    {f.action === 'LOCKED' ? 'Bloklandi' : 'Xato parol'}
                                                </span>
                                            </td>
                                            <td><code className="al-ip">{f.ipAddress}</code></td>
                                            <td>
                                                <div className="al-device">
                                                    {dev.icon === 'mobile'
                                                        ? <Smartphone size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                                        : <Monitor size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                                                    <span>{dev.name}</span>
                                                </div>
                                            </td>
                                            <td className="th-right">
                                                <span className="cell-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(f.createdAt)}</span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    )
}

// ════════════════════════════════════════════════════════════════
export default function AuditLogPage() {
    const [tab, setTab] = useState('audit')

    return (
        <div className="al-wrapper">
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">Audit Journal</h1>
                        <p className="page-subtitle">Tizim faoliyati va sessiyalar tarixi</p>
                    </div>
                </div>
            </div>

            <div className="al-tabs">
                <button className={`al-tab ${tab === 'audit' ? 'active' : ''}`} onClick={() => setTab('audit')}>
                    <ShieldCheck size={14} /> Amallar jurnali
                </button>
                <button className={`al-tab ${tab === 'sessions' ? 'active' : ''}`} onClick={() => setTab('sessions')}>
                    <Clock size={14} /> Sessiyalar
                </button>
            </div>

            {tab === 'audit'    && <AuditTab />}
            {tab === 'sessions' && <SessionsTab />}
        </div>
    )
}
