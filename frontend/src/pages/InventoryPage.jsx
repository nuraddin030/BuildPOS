import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { inventoryApi } from '../api/inventory'
import { getWarehouses } from '../api/products'
import api from '../api/api'
import {
    ClipboardList, Plus, ArrowLeft, CheckCircle, Trash2,
    Loader2, ChevronLeft, ChevronRight, Search, ArrowLeftRight,
    ChevronDown, Package
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

// ── Tasdiqlash modali ─────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, confirmClass, onConfirm, onCancel }) {
    return (
        <div className="inv-overlay" onClick={onCancel}>
            <div className="inv-confirm-modal" onClick={e => e.stopPropagation()}>
                <div className="inv-confirm-title">{title}</div>
                <div className="inv-confirm-msg">{message}</div>
                <div className="inv-confirm-actions">
                    <button className="inv-btn-cancel" onClick={onCancel}>Bekor</button>
                    <button className={confirmClass} onClick={onConfirm}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    )
}

// ── Sessiya detali (mahsulotlar ro'yxati + kiritish) ───────────────
function SessionDetail({ sessionId }) {
    const { hasPermission, user } = useAuth()
    const navigate = useNavigate()
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [completing, setCompleting] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [search, setSearch] = useState('')
    const [savingId, setSavingId] = useState(null)
    const [localQty, setLocalQty] = useState({})
    const [confirmModal, setConfirmModal] = useState(null) // { type: 'complete'|'delete' }

    const canManage = hasPermission('INVENTORY_MANAGE') ||
        user?.role === 'ADMIN' || user?.role === 'OWNER' ||
        user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_OWNER' ||
        user?.role === 'STOREKEEPER'

    const load = useCallback(async () => {
        try {
            const r = await inventoryApi.getById(sessionId)
            setSession(r.data)
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

    const doComplete = async () => {
        setConfirmModal(null)
        setCompleting(true)
        try {
            await inventoryApi.complete(sessionId)
            navigate('/inventory')
        } catch (e) {
            console.error(e)
        } finally {
            setCompleting(false)
        }
    }

    const doDelete = async () => {
        setConfirmModal(null)
        setDeleting(true)
        try {
            await inventoryApi.delete(sessionId)
            navigate('/inventory')
        } catch (e) {
            console.error(e)
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
                    <button className="inv-back-btn" onClick={() => navigate('/inventory')}>
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
                            <button className="inv-btn-danger" onClick={() => setConfirmModal('delete')} disabled={deleting}>
                                {deleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                                O'chirish
                            </button>
                            <button className="inv-btn-success" onClick={() => setConfirmModal('complete')} disabled={completing}>
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

            {/* Jadval + qidiruv bitta kartada */}
            <div className="table-card">
                <div className="inv-table-toolbar">
                    <div className="filter-search-wrap">
                        <Search size={16} className="filter-search-icon" />
                        <input
                            type="text"
                            className="filter-search"
                            placeholder="Mahsulot nomi..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {search && (
                        <button className="btn-reset" onClick={() => setSearch('')}>
                            ✕ Tozalash
                        </button>
                    )}
                </div>

                <div className="inv-items-table-wrapper table-responsive">
                    <table className="ptable inv-items-table">
                        <colgroup>
                            <col style={{ width: '4%' }} />
                            <col style={{ width: '32%' }} />
                            <col style={{ width: '16%' }} />
                            <col style={{ width: '16%' }} />
                            <col style={{ width: '16%' }} />
                            <col style={{ width: '16%' }} />
                        </colgroup>
                        <thead>
                        <tr>
                            <th className="th-num">#</th>
                            <th>Mahsulot</th>
                            <th className="th-center">Tizim miqdori</th>
                            <th className="th-center">Haqiqiy miqdor</th>
                            <th className="th-center">Farq</th>
                            <th className="th-center">Izoh</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredItems.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Mahsulot topilmadi</td></tr>
                        ) : filteredItems.map((item, i) => {
                            const diff = item.actualQty != null ? item.actualQty - item.systemQty : null
                            const diffColor = diff == null ? '' : diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#6b7280'
                            return (
                                <tr key={item.id}>
                                    <td className="cell-num">{i + 1}</td>
                                    <td>
                                        <span className="cell-name">{item.productName}</span>
                                        <span className="cell-muted" style={{ marginLeft: 6, fontSize: 12 }}>{item.unitSymbol}</span>
                                    </td>
                                    <td className="th-center">
                                        <span style={{ fontWeight: 500 }}>{fmt(item.systemQty)}</span>
                                    </td>
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
                                                {savingId === item.id && <Loader2 size={12} className="spin" style={{ color: 'var(--text-muted)' }} />}
                                            </div>
                                        ) : (
                                            <span style={{ fontWeight: 600 }}>{fmt(item.actualQty)}</span>
                                        )}
                                    </td>
                                    <td className="th-center">
                                        {diff != null && (
                                            <span style={{ color: diffColor, fontWeight: 700 }}>
                                                {diff > 0 ? '+' : ''}{fmt(diff)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="th-center">
                                        {isDraft && canManage ? (
                                            <input className="inv-note-input" type="text"
                                                   defaultValue={item.notes || ''}
                                                   onBlur={e => inventoryApi.updateItem(sessionId, item.id,
                                                       { actualQty: item.actualQty, notes: e.target.value || null })}
                                                   placeholder="..." />
                                        ) : (
                                            <span className="cell-muted" style={{ fontSize: 12 }}>{item.notes || ''}</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
                <div className="inv-items-cards">
                    {filteredItems.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Mahsulot topilmadi</div>
                    ) : filteredItems.map((item, i) => {
                        const diff = item.actualQty != null ? item.actualQty - item.systemQty : null
                        const diffColor = diff == null ? '' : diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#6b7280'
                        return (
                            <div key={item.id} className="inv-item-card">
                                <div className="inv-item-card-name">
                                    {item.productName}
                                    {item.unitSymbol && <span className="inv-item-unit"> {item.unitSymbol}</span>}
                                </div>
                                <div className="inv-item-card-row">
                                    <span className="inv-item-card-label">Tizim</span>
                                    <span className="inv-item-card-val">{fmt(item.systemQty)}</span>
                                </div>
                                <div className="inv-item-card-row">
                                    <span className="inv-item-card-label">Haqiqiy</span>
                                    {isDraft && canManage ? (
                                        <div className="inv-qty-cell" style={{ justifyContent: 'flex-end' }}>
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
                                            {savingId === item.id && <Loader2 size={12} className="spin" style={{ color: 'var(--text-muted)' }} />}
                                        </div>
                                    ) : (
                                        <span className="inv-item-card-val" style={{ fontWeight: 700 }}>{fmt(item.actualQty)}</span>
                                    )}
                                </div>
                                {diff != null && (
                                    <div className="inv-item-card-row">
                                        <span className="inv-item-card-label">Farq</span>
                                        <span style={{ fontWeight: 700, color: diffColor }}>
                                            {diff > 0 ? '+' : ''}{fmt(diff)}
                                        </span>
                                    </div>
                                )}
                                {(isDraft && canManage) ? (
                                    <input className="inv-note-input" type="text"
                                           style={{ marginTop: 6, textAlign: 'left' }}
                                           defaultValue={item.notes || ''}
                                           onBlur={e => inventoryApi.updateItem(sessionId, item.id,
                                               { actualQty: item.actualQty, notes: e.target.value || null })}
                                           placeholder="Izoh..." />
                                ) : item.notes ? (
                                    <div className="inv-item-card-notes">{item.notes}</div>
                                ) : null}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Confirm modallar */}
            {confirmModal === 'complete' && (
                <ConfirmModal
                    title="Inventarizatsiyani yakunlash"
                    message="Kiritilgan farqlar omborga kirim/chiqim sifatida yoziladi. Davom etasizmi?"
                    confirmLabel="Yakunlash"
                    confirmClass="inv-btn-success"
                    onConfirm={doComplete}
                    onCancel={() => setConfirmModal(null)}
                />
            )}
            {confirmModal === 'delete' && (
                <ConfirmModal
                    title="Inventarizatsiyani o'chirish"
                    message="Bu inventarizatsiya sessiyasi butunlay o'chiriladi. Davom etasizmi?"
                    confirmLabel="O'chirish"
                    confirmClass="inv-btn-danger"
                    onConfirm={doDelete}
                    onCancel={() => setConfirmModal(null)}
                />
            )}
        </div>
    )
}

// Harakatlarni "transfer sessiya" ga guruhlash — bir xil ombor, foydalanuvchi, izoh va 2 minut ichida
function groupTransfers(movements) {
    const groups = []
    const used = new Set()
    for (let i = 0; i < movements.length; i++) {
        if (used.has(i)) continue
        const m = movements[i]
        const t = new Date(m.movedAt).getTime()
        const items = [m]
        used.add(i)
        for (let j = i + 1; j < movements.length; j++) {
            if (used.has(j)) continue
            const n = movements[j]
            if (n.fromWarehouseName === m.fromWarehouseName &&
                n.toWarehouseName === m.toWarehouseName &&
                n.movedBy === m.movedBy &&
                (n.notes || '') === (m.notes || '') &&
                Math.abs(new Date(n.movedAt).getTime() - t) < 120000) {
                items.push(n)
                used.add(j)
            }
        }
        groups.push({
            key: m.id,
            fromWarehouseName: m.fromWarehouseName,
            toWarehouseName: m.toWarehouseName,
            movedBy: m.movedBy,
            movedAt: m.movedAt,
            notes: m.notes,
            items,
            itemCount: items.length,
        })
    }
    return groups
}

// ── Transfer tarixi ──────────────────────────────────────────────
function TransferHistory({ hasPermission, user, navigate }) {
    const [movements, setMovements] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [size, setSize] = useState(100)
    const [loading, setLoading] = useState(false)
    const [expandedKey, setExpandedKey] = useState(null)

    const canManage = hasPermission('INVENTORY_MANAGE') ||
        user?.role === 'ADMIN' || user?.role === 'OWNER' ||
        user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_OWNER' ||
        user?.role === 'STOREKEEPER'

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.get('/api/v1/stock-movements', {
                params: { movementType: 'TRANSFER_OUT', page, size }
            })
            const data = res.data
            setMovements(data?.content || [])
            setTotal(data?.totalElements || 0)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [page, size])

    useEffect(() => { load() }, [load])

    const groups = groupTransfers(movements)
    const totalPages = Math.ceil(total / size)

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                {canManage && (
                    <button className="btn-add" onClick={() => navigate('/inventory/transfer')}>
                        <ArrowLeftRight size={16} />
                        <span>Yangi ko'chirish</span>
                    </button>
                )}
            </div>

            <div className="table-card">
                {loading ? (
                    <div className="table-loading"><Loader2 size={24} className="spin" /><span>Yuklanmoqda...</span></div>
                ) : groups.length === 0 ? (
                    <div className="table-empty">
                        <ArrowLeftRight size={40} strokeWidth={1.2} />
                        <p>Transfer tarixi yo'q</p>
                    </div>
                ) : (
                    <>
                    <div className="inv-transfer-table-wrap table-responsive">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th style={{ width: 36 }}></th>
                                <th className="th-num">#</th>
                                <th>Qayerdan</th>
                                <th>Qayerga</th>
                                <th className="th-center">Mahsulotlar</th>
                                <th>Izoh</th>
                                <th>Sana</th>
                                <th>Kim</th>
                            </tr>
                            </thead>
                            <tbody>
                            {groups.map((g, i) => {
                                const isOpen = expandedKey === g.key
                                return (
                                    <React.Fragment key={g.key}>
                                        <tr className="inv-transfer-group-row"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setExpandedKey(isOpen ? null : g.key)}>
                                            <td style={{ textAlign: 'center' }}>
                                                <ChevronDown size={14}
                                                    style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                                            </td>
                                            <td className="cell-num">{page * (size / 1) + i + 1}</td>
                                            <td><span style={{ fontWeight: 500, fontSize: 13 }}>{g.fromWarehouseName || '—'}</span></td>
                                            <td><span style={{ fontWeight: 500, fontSize: 13 }}>{g.toWarehouseName || '—'}</span></td>
                                            <td className="th-center">
                                                <span className="inv-transfer-count-badge">{g.itemCount} ta</span>
                                            </td>
                                            <td>
                                                <span className="cell-muted" style={{ fontSize: 12 }} title={g.notes}>
                                                    {g.notes ? (g.notes.length > 30 ? g.notes.slice(0, 30) + '…' : g.notes) : '—'}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDT(g.movedAt)}</td>
                                            <td style={{ fontSize: 12 }}>{g.movedBy || '—'}</td>
                                        </tr>
                                        {isOpen && (
                                            <tr className="inv-transfer-detail-row">
                                                <td colSpan={8} style={{ padding: 0 }}>
                                                    <div className="inv-transfer-detail-items">
                                                        <table className="ptable inv-transfer-sub-table">
                                                            <thead>
                                                            <tr>
                                                                <th style={{ width: 36 }}></th>
                                                                <th>Mahsulot</th>
                                                                <th>Birlik</th>
                                                                <th className="th-center">Miqdor</th>
                                                            </tr>
                                                            </thead>
                                                            <tbody>
                                                            {g.items.map(item => (
                                                                <tr key={item.id}>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <Package size={13} style={{ color: 'var(--text-muted)' }} />
                                                                    </td>
                                                                    <td><span className="cell-name">{item.productName || '—'}</span></td>
                                                                    <td><span className="cell-muted" style={{ fontSize: 12 }}>{item.unitSymbol || '—'}</span></td>
                                                                    <td className="th-center">
                                                                        <span style={{ fontWeight: 700, fontSize: 14 }}>{fmt(item.quantity)}</span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                            </tbody>
                        </table>
                    </div>
                    <div className="inv-transfer-cards">
                        {groups.map((g, i) => {
                            const isOpen = expandedKey === g.key
                            return (
                                <div key={g.key} className="inv-transfer-card"
                                     onClick={() => setExpandedKey(isOpen ? null : g.key)}>
                                    <div className="inv-transfer-card-top">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <ChevronDown size={14}
                                                style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', color: 'var(--text-muted)' }} />
                                            <span className="inv-transfer-card-name">
                                                {g.fromWarehouseName} → {g.toWarehouseName}
                                            </span>
                                        </div>
                                        <span className="inv-transfer-count-badge">{g.itemCount} ta</span>
                                    </div>
                                    <div className="inv-transfer-card-row">
                                        <span>Sana</span>
                                        <span>{fmtDT(g.movedAt)}</span>
                                    </div>
                                    {g.movedBy && (
                                        <div className="inv-transfer-card-row">
                                            <span>Kim</span>
                                            <span>{g.movedBy}</span>
                                        </div>
                                    )}
                                    {g.notes && <div className="inv-card-notes">{g.notes}</div>}
                                    {isOpen && (
                                        <div className="inv-transfer-card-items" onClick={e => e.stopPropagation()}>
                                            {g.items.map(item => (
                                                <div key={item.id} className="inv-transfer-card-item">
                                                    <span>
                                                        {item.productName}
                                                        {item.unitSymbol && <span className="cell-muted" style={{ fontSize: 11, marginLeft: 4 }}>{item.unitSymbol}</span>}
                                                    </span>
                                                    <span style={{ fontWeight: 700 }}>{fmt(item.quantity)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    </>
                )}

                {total > size && (
                    <div className="table-footer">
                        <select className="al-size-select" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(0) }}>
                            {[100, 200, 500].map(s => <option key={s} value={s}>{s} ta</option>)}
                        </select>
                        <div className="pagination-group">
                            <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Oldingi</button>
                            <span className="page-info">{page + 1} / {Math.max(1, totalPages)}</span>
                            <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Keyingi →</button>
                        </div>
                        <span className="table-footer-info">Jami: {total} ta</span>
                    </div>
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
    const navigate = useNavigate()
    const { id } = useParams()
    const [searchParams, setSearchParams] = useSearchParams()
    const tab = searchParams.get('tab') || 'inventory'

    if (id) {
        return <SessionDetail sessionId={Number(id)} />
    }

    const setTab = (t) => setSearchParams(t === 'inventory' ? {} : { tab: t })

    return (
        <div className="products-wrapper">
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                        <ClipboardList size={20} />
                    </div>
                    <div>
                        <h1 className="page-title">Inventarizatsiya</h1>
                        <p className="page-subtitle">Omborlardagi mahsulotlarni sanab tekshirish va transfer</p>
                    </div>
                </div>
            </div>

            <div className="inv-tabs">
                <button className={`inv-tab${tab === 'inventory' ? ' active' : ''}`}
                        onClick={() => setTab('inventory')}>
                    <ClipboardList size={15} />
                    Inventarizatsiya
                </button>
                <button className={`inv-tab${tab === 'transfer' ? ' active' : ''}`}
                        onClick={() => setTab('transfer')}>
                    <ArrowLeftRight size={15} />
                    Transfer
                </button>
            </div>

            {tab === 'inventory'
                ? <InventoryListContent hasPermission={hasPermission} user={user} navigate={navigate} />
                : <TransferHistory hasPermission={hasPermission} user={user} navigate={navigate} />
            }
        </div>
    )
}

function InventoryListContent({ hasPermission, user, navigate }) {
    const [sessions, setSessions] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [size, setSize] = useState(20)
    const [loading, setLoading] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)

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

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} ta sessiya</span>
                {canManage && (
                    <button className="btn-add" onClick={() => setCreateOpen(true)}>
                        <Plus size={18} />
                        <span>Yangi inventarizatsiya</span>
                    </button>
                )}
            </div>

            <div className="table-card">
                {loading ? (
                    <div className="table-loading"><Loader2 size={24} className="spin" /><span>Yuklanmoqda...</span></div>
                ) : sessions.length === 0 ? (
                    <div className="table-empty">
                        <ClipboardList size={40} strokeWidth={1.2} />
                        <p>Inventarizatsiya yo'q</p>
                    </div>
                ) : (
                    <>
                    <div className="inv-table-wrapper table-responsive">
                        <table className="ptable inventory-ptable">
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
                                        onClick={() => navigate(`/inventory/${s.id}`)}>
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
                                                        onClick={() => navigate(`/inventory/${s.id}`)}>
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
                    <div className="inv-cards">
                        {sessions.map(s => {
                            const st = STATUS[s.status] || {}
                            return (
                                <div key={s.id} className="inv-card" onClick={() => navigate(`/inventory/${s.id}`)}>
                                    <div className="inv-card-top">
                                        <span className="inv-card-id">#{s.id}</span>
                                        <span className="inv-status-badge" style={{ color: st.color, background: st.bg }}>
                                            {st.label}
                                        </span>
                                    </div>
                                    <div className="inv-card-warehouse">{s.warehouseName}</div>
                                    <div className="inv-card-meta">
                                        <span>{s.createdByName || '—'}</span>
                                        <span>·</span>
                                        <span>{fmtDT(s.createdAt)}</span>
                                    </div>
                                    {s.notes && <div className="inv-card-notes">{s.notes}</div>}
                                </div>
                            )
                        })}
                    </div>
                    </>
                )}

                {total > size && (
                    <div className="table-footer">
                        <select className="al-size-select" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(0) }}>
                            {[20, 50, 100].map(s => <option key={s} value={s}>{s} ta</option>)}
                        </select>
                        <div className="pagination-group">
                            <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Oldingi</button>
                            <span className="page-info">{page + 1} / {Math.max(1, totalPages)}</span>
                            <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Keyingi →</button>
                        </div>
                        <span className="table-footer-info">Jami: {total} ta</span>
                    </div>
                )}
            </div>

            {createOpen && (
                <CreateModal
                    onClose={() => setCreateOpen(false)}
                    onCreate={(session) => {
                        setCreateOpen(false)
                        navigate(`/inventory/${session.id}`)
                    }}
                />
            )}
        </>
    )
}