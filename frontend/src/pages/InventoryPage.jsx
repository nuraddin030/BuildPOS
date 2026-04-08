import { useState, useEffect, useCallback } from 'react'
import { inventoryApi } from '../api/inventory'
import { getWarehouses } from '../api/products'
import {
    ClipboardList, Plus, ArrowLeft, CheckCircle, Trash2,
    Loader2, ChevronLeft, ChevronRight, Search
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import '../styles/InventoryPage.css'

const fmt = (n) => n == null ? '—' : String(Math.round(Number(n) * 1000) / 1000).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const fmtDT = (dt) => {
    if (!dt) return '—'
    const d = new Date(dt)
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

const STATUS = {
    DRAFT:     { label: 'Jarayonda', color: '#f59e0b', bg: '#fffbeb' },
    COMPLETED: { label: 'Yakunlangan', color: '#16a34a', bg: '#f0fdf4' },
}

// ── Yangi sessiya yaratish modali ──────────────────────────────────
function CreateModal({ onClose, onCreate }) {
    const [warehouses, setWarehouses] = useState([])
    const [warehouseId, setWarehouseId] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        getWarehouses().then(r => {
            const list = r.data.content || r.data || []
            setWarehouses(list)
            if (list.length === 1) setWarehouseId(String(list[0].id))
        })
    }, [])

    const handleCreate = async () => {
        if (!warehouseId) return
        setLoading(true)
        try {
            const r = await inventoryApi.create({ warehouseId: Number(warehouseId), notes })
            onCreate(r.data)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="inv-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="inv-create-modal">
                <div className="inv-modal-header">
                    <span>Yangi inventarizatsiya</span>
                    <button className="inv-close-btn" onClick={onClose}>✕</button>
                </div>
                <div className="inv-modal-body">
                    <label className="inv-label">Ombor *</label>
                    <select className="inv-select" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                        <option value="">Omborni tanlang</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <label className="inv-label" style={{ marginTop: 14 }}>Izoh</label>
                    <textarea className="inv-textarea" rows={2} value={notes}
                              onChange={e => setNotes(e.target.value)}
                              placeholder="Ixtiyoriy..." />
                </div>
                <div className="inv-modal-footer">
                    <button className="inv-btn-cancel" onClick={onClose}>Bekor</button>
                    <button className="inv-btn-primary" onClick={handleCreate}
                            disabled={!warehouseId || loading}>
                        {loading ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
                        Yaratish
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Sessiya detali (mahsulotlar ro'yxati + kiritish) ───────────────
function SessionDetail({ sessionId, onBack, onCompleted }) {
    const { hasPermission, user } = useAuth()
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [completing, setCompleting] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [search, setSearch] = useState('')
    const [savingId, setSavingId] = useState(null)
    const [localQty, setLocalQty] = useState({}) // itemId → string value

    const canManage = hasPermission('INVENTORY_MANAGE') ||
        user?.role === 'ADMIN' || user?.role === 'OWNER' ||
        user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_OWNER' ||
        user?.role === 'STOREKEEPER'

    const load = useCallback(async () => {
        try {
            const r = await inventoryApi.getById(sessionId)
            setSession(r.data)
            // local qty ni initialize qilish (faqat birinchi marta)
            setLocalQty(prev => {
                const next = { ...prev }
                r.data.items?.forEach(item => {
                    if (!(item.id in next)) {
                        next[item.id] = item.actualQty != null ? String(item.actualQty) : ''
                    }
                })
                return next
            })
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [sessionId])

    useEffect(() => { load() }, [load])

    const saveItem = async (itemId) => {
        const val = localQty[itemId]
        const qty = val === '' ? null : parseFloat(val.replace(',', '.'))
        if (val !== '' && (isNaN(qty) || qty < 0)) return
        setSavingId(itemId)
        try {
            await inventoryApi.updateItem(sessionId, itemId, { actualQty: qty })
            setSession(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    items: prev.items.map(it => it.id === itemId
                        ? { ...it, actualQty: qty, difference: qty != null ? qty - it.systemQty : null }
                        : it
                    ),
                    filledItems: prev.items.filter(it =>
                        it.id === itemId ? qty != null : it.actualQty != null
                    ).length
                }
            })
        } finally {
            setSavingId(null)
        }
    }

    const handleComplete = async () => {
        if (!window.confirm('Inventarizatsiyani yakunlash? Farqlar stock ga kiritiladi.')) return
        setCompleting(true)
        try {
            const r = await inventoryApi.complete(sessionId)
            onCompleted(r.data)
        } catch (e) {
            alert(e?.response?.data?.message || 'Xatolik yuz berdi')
        } finally {
            setCompleting(false)
        }
    }

    const handleDelete = async () => {
        if (!window.confirm("Inventarizatsiyani o'chirish?")) return
        setDeleting(true)
        try {
            await inventoryApi.delete(sessionId)
            onBack()
        } catch (e) {
            alert(e?.response?.data?.message || 'Xatolik')
            setDeleting(false)
        }
    }

    const filteredItems = session?.items?.filter(it =>
        !search || it.productName.toLowerCase().includes(search.toLowerCase())
    ) || []

    const isDraft = session?.status === 'DRAFT'

    if (loading) return (
        <div className="inv-loading"><Loader2 size={28} className="spin" /> Yuklanmoqda...</div>
    )
    if (!session) return null

    const st = STATUS[session.status] || {}
    const progress = session.totalItems > 0
        ? Math.round(session.filledItems / session.totalItems * 100) : 0

    return (
        <div className="inv-detail">
            {/* Header */}
            <div className="inv-detail-header">
                <div className="inv-detail-header-left">
                    <button className="inv-back-btn" onClick={onBack}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 className="inv-detail-title">
                            #{session.id} — Inventarizatsiya
                            <span className="inv-status-badge" style={{ color: st.color, background: st.bg }}>
                                {st.label}
                            </span>
                        </h2>
                        <p className="inv-detail-sub">
                            {session.warehouseName} · {fmtDT(session.createdAt)} · {session.createdByName}
                        </p>
                    </div>
                </div>
                <div className="inv-detail-actions">
                    {isDraft && canManage && (
                        <>
                            <button className="inv-btn-danger" onClick={handleDelete} disabled={deleting}>
                                {deleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                                O'chirish
                            </button>
                            <button className="inv-btn-success" onClick={handleComplete} disabled={completing}>
                                {completing ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />}
                                Yakunlash
                            </button>
                        </>
                    )}
                    {!isDraft && (
                        <div className="inv-completed-by">
                            Yakunladi: {session.completedByName} — {fmtDT(session.completedAt)}
                        </div>
                    )}
                </div>
            </div>

            {/* Progress */}
            {isDraft && (
                <div className="inv-progress-wrap">
                    <div className="inv-progress-info">
                        <span>Kiritildi: <b>{session.filledItems}</b> / {session.totalItems} ta mahsulot</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="inv-progress-bar">
                        <div className="inv-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            )}

            {/* Qidiruv */}
            <div className="inv-search-wrap">
                <Search size={15} className="inv-search-icon" />
                <input className="inv-search" placeholder="Mahsulot nomi..."
                       value={search} onChange={e => setSearch(e.target.value)} />
                {search && <button className="inv-search-clear" onClick={() => setSearch('')}>✕</button>}
            </div>

            {/* Items jadvali */}
            <div className="inv-table-wrap">
                <table className="inv-table">
                    <thead>
                    <tr>
                        <th>#</th>
                        <th>Mahsulot</th>
                        <th className="th-right">Tizim</th>
                        <th className="th-center">Haqiqiy</th>
                        <th className="th-right">Farq</th>
                        <th>Izoh</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredItems.map((item, i) => {
                        const diff = item.actualQty != null ? item.actualQty - item.systemQty : null
                        const diffColor = diff == null ? '' : diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#6b7280'
                        return (
                            <tr key={item.id} className={item.actualQty != null ? 'inv-row-filled' : ''}>
                                <td className="inv-cell-num">{i + 1}</td>
                                <td>
                                    <span className="inv-product-name">{item.productName}</span>
                                    <span className="inv-unit-sym">{item.unitSymbol}</span>
                                </td>
                                <td className="th-right inv-sys-qty">{fmt(item.systemQty)}</td>
                                <td className="th-center">
                                    {isDraft && canManage ? (
                                        <div className="inv-qty-cell">
                                            <input
                                                className="inv-qty-input"
                                                type="text"
                                                inputMode="numeric"
                                                value={localQty[item.id] ?? ''}
                                                onChange={e => setLocalQty(p => ({ ...p, [item.id]: e.target.value }))}
                                                onBlur={() => saveItem(item.id)}
                                                onKeyDown={e => e.key === 'Enter' && saveItem(item.id)}
                                                placeholder="—"
                                            />
                                            {savingId === item.id && <Loader2 size={12} className="spin inv-saving" />}
                                        </div>
                                    ) : (
                                        <span style={{ fontWeight: 600 }}>{fmt(item.actualQty)}</span>
                                    )}
                                </td>
                                <td className="th-right">
                                    {diff != null && (
                                        <span className="inv-diff" style={{ color: diffColor }}>
                                            {diff > 0 ? '+' : ''}{fmt(diff)}
                                        </span>
                                    )}
                                </td>
                                <td>
                                    {isDraft && canManage ? (
                                        <input className="inv-note-input" type="text"
                                               defaultValue={item.notes || ''}
                                               onBlur={e => inventoryApi.updateItem(sessionId, item.id,
                                                   { actualQty: item.actualQty, notes: e.target.value || null })}
                                               placeholder="..." />
                                    ) : (
                                        <span className="inv-note-text">{item.notes || ''}</span>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                    </tbody>
                </table>
                {filteredItems.length === 0 && (
                    <div className="inv-empty">Mahsulot topilmadi</div>
                )}
            </div>
        </div>
    )
}

// ══════════════════════════════════════════════════════════════════
// InventoryPage — asosiy komponent
// ══════════════════════════════════════════════════════════════════
export default function InventoryPage() {
    const { hasPermission, user } = useAuth()
    const [sessions, setSessions] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [size] = useState(20)
    const [loading, setLoading] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)
    const [selectedId, setSelectedId] = useState(null)

    const canManage = hasPermission('INVENTORY_MANAGE') ||
        user?.role === 'ADMIN' || user?.role === 'OWNER' ||
        user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_OWNER' ||
        user?.role === 'STOREKEEPER'

    const load = useCallback(() => {
        setLoading(true)
        inventoryApi.getAll({ page, size })
            .then(r => { setSessions(r.data.content || []); setTotal(r.data.totalElements || 0) })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [page, size])

    useEffect(() => { load() }, [load])

    const totalPages = Math.ceil(total / size)

    if (selectedId) {
        return (
            <SessionDetail
                sessionId={selectedId}
                onBack={() => { setSelectedId(null); load() }}
                onCompleted={() => { setSelectedId(null); load() }}
            />
        )
    }

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                        <ClipboardList size={20} />
                    </div>
                    <div>
                        <h1 className="page-title">
                            Inventarizatsiya
                            <span className="page-count">({total} ta)</span>
                        </h1>
                        <p className="page-subtitle">Omborlardagi mahsulotlarni sanab tekshirish</p>
                    </div>
                </div>
                {canManage && (
                    <button className="btn-add" onClick={() => setCreateOpen(true)}>
                        <Plus size={18} />
                        <span>Yangi inventarizatsiya</span>
                    </button>
                )}
            </div>

            {/* Jadval */}
            <div className="table-card">
                {loading ? (
                    <div className="table-loading"><Loader2 size={24} className="spin" /><span>Yuklanmoqda...</span></div>
                ) : sessions.length === 0 ? (
                    <div className="table-empty">
                        <ClipboardList size={40} strokeWidth={1.2} />
                        <p>Inventarizatsiya yo'q</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th>Ombor</th>
                                <th className="th-center">Holat</th>
                                <th>Yaratdi</th>
                                <th className="th-center">Yaratilgan</th>
                                <th className="th-center">Yakunlangan</th>
                                <th>Izoh</th>
                                <th className="th-center">Amallar</th>
                            </tr>
                            </thead>
                            <tbody>
                            {sessions.map((s, i) => {
                                const st = STATUS[s.status] || {}
                                return (
                                    <tr key={s.id} style={{ cursor: 'pointer' }}
                                        onClick={() => setSelectedId(s.id)}>
                                        <td className="cell-num">#{s.id}</td>
                                        <td><span className="cell-name">{s.warehouseName}</span></td>
                                        <td className="th-center">
                                            <span className="inv-status-badge"
                                                  style={{ color: st.color, background: st.bg }}>
                                                {st.label}
                                            </span>
                                        </td>
                                        <td><span className="cell-muted">{s.createdByName || '—'}</span></td>
                                        <td className="th-center">
                                            <span style={{ fontSize: 12 }}>{fmtDT(s.createdAt)}</span>
                                        </td>
                                        <td className="th-center">
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {s.completedAt ? fmtDT(s.completedAt) : '—'}
                                            </span>
                                        </td>
                                        <td><span className="cell-muted">{s.notes || '—'}</span></td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className="action-group">
                                                <button className="act-btn act-edit"
                                                        title="Ko'rish"
                                                        onClick={() => setSelectedId(s.id)}>
                                                    <ClipboardList size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="table-footer">
                        <span className="table-footer-info">Jami: {total} ta</span>
                        <div className="pagination-group">
                            <button className="page-btn" disabled={page === 0}
                                    onClick={() => setPage(p => p - 1)}>
                                <ChevronLeft size={16} />
                            </button>
                            <span className="page-info">{page + 1} / {totalPages}</span>
                            <button className="page-btn" disabled={page >= totalPages - 1}
                                    onClick={() => setPage(p => p + 1)}>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {createOpen && (
                <CreateModal
                    onClose={() => setCreateOpen(false)}
                    onCreate={(session) => {
                        setCreateOpen(false)
                        setSelectedId(session.id)
                    }}
                />
            )}
        </div>
    )
}