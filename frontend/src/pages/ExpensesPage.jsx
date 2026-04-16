import { useState, useEffect, useCallback } from 'react'
import {
    Receipt, Plus, Trash2, X, Loader2, Tag, Calendar,
    Filter, RotateCcw, ChevronDown, ChevronUp, Wallet,
} from 'lucide-react'
import api from '../api/api'
import '../styles/ExpensesPage.css'

const fmt = (n) =>
    n == null ? '0' : String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const fmtDate = (d) => {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}.${m}.${y}`
}

const fmtShiftLabel = (s) => {
    const openDate  = s.openedAt?.slice(0, 10)
    const closeDate = s.closedAt?.slice(0, 10)
    const openTime  = s.openedAt?.slice(11, 16)
    const closeTime = s.closedAt?.slice(11, 16)
    const d2 = (dateStr) => {
        if (!dateStr) return ''
        const [, m, d] = dateStr.split('-')
        return `${d}.${m}`
    }
    // Ismning birinchi so'zi (familiya emas)
    const firstName = s.cashierName?.split(' ')[0] ?? ''
    const multiDay  = closeDate && openDate !== closeDate
    if (multiDay) {
        return `${firstName}: ${d2(openDate)} ${openTime} – ${d2(closeDate)} ${closeTime}`
    }
    return `${firstName}: ${d2(openDate)} ${openTime}${closeTime ? `–${closeTime}` : ' (ochiq)'}`
}

function todayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthStartStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// ── Summary karta (rp-kpi uslubida) ───────────────────────────
function SummaryCard({ label, value, sub, color, icon: Icon }) {
    return (
        <div className="exp-sum-card">
            <div className="exp-sum-icon" style={{ background: color + '18', color }}>
                <Icon size={20} />
            </div>
            <div className="exp-sum-body">
                <span className="exp-sum-label">{label}</span>
                <span className="exp-sum-value">{fmt(value)} <span className="exp-sum-unit">UZS</span></span>
                {sub != null && <span className="exp-sum-sub">{sub}</span>}
            </div>
        </div>
    )
}

// ── Kategoriyalar modali ───────────────────────────────────────
function CategoriesModal({ categories, onClose, onRefresh }) {
    const [catName, setCatName]         = useState('')
    const [catSaving, setCatSaving]     = useState(false)
    const [confirmId, setConfirmId]     = useState(null)
    const [deletingId, setDeletingId]   = useState(null)

    const handleAdd = async (e) => {
        e.preventDefault()
        if (!catName.trim()) return
        setCatSaving(true)
        try {
            await api.post('/api/v1/expenses/categories', { name: catName.trim() })
            setCatName('')
            onRefresh()
        } catch (err) {
            console.error(err)
        } finally {
            setCatSaving(false)
        }
    }

    const handleDelete = async (id) => {
        setDeletingId(id)
        try {
            await api.delete(`/api/v1/expenses/categories/${id}`)
            onRefresh()
        } catch (err) {
            console.error(err)
        } finally {
            setDeletingId(null)
            setConfirmId(null)
        }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box products-modal" style={{ maxWidth: 420 }}>
                <div className="modal-header">
                    <div className="modal-header-left">
                        <div className="exp-modal-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                            <Tag size={20} />
                        </div>
                        <div>
                            <h3 className="modal-title">Kategoriyalar</h3>
                            <p className="modal-subtitle">Harajat kategoriyalarini boshqarish</p>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="modal-body">
                    {/* Yangi kategoriya qo'shish */}
                    <form onSubmit={handleAdd} className="exp-cat-add-row">
                        <input
                            type="text"
                            className="modal-input"
                            placeholder="Yangi kategoriya nomi..."
                            value={catName}
                            onChange={e => setCatName(e.target.value)}
                            maxLength={100}
                            autoFocus
                        />
                        <button type="submit" className="btn-save exp-cat-save-btn"
                                disabled={catSaving || !catName.trim()}>
                            {catSaving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                            Qo'shish
                        </button>
                    </form>

                    {/* Kategoriyalar ro'yxati */}
                    <div className="exp-cat-modal-list">
                        {categories.length === 0 ? (
                            <div className="table-empty" style={{ padding: '20px 0' }}>
                                <Tag size={28} strokeWidth={1} />
                                <p>Kategoriya yo'q</p>
                            </div>
                        ) : categories.map(cat => (
                            <div key={cat.id} className="exp-cat-modal-item">
                                <div className="exp-cat-modal-name">
                                    <span className="exp-cat-dot" />
                                    {cat.name}
                                </div>
                                {confirmId === cat.id ? (
                                    <div className="exp-cat-confirm-btns">
                                        <button className="btn-cancel exp-cat-confirm-no"
                                                onClick={() => setConfirmId(null)}>Yo'q</button>
                                        <button className="btn-delete exp-cat-confirm-yes"
                                                onClick={() => handleDelete(cat.id)}
                                                disabled={deletingId === cat.id}>
                                            {deletingId === cat.id
                                                ? <Loader2 size={12} className="spin" />
                                                : "Ha, o'chir"}
                                        </button>
                                    </div>
                                ) : (
                                    <button className="exp-cat-del-btn"
                                            onClick={() => setConfirmId(cat.id)}>
                                        <Trash2 size={13} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-save" onClick={onClose}>Yopish</button>
                </div>
            </div>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════
// Asosiy komponent
// ════════════════════════════════════════════════════════════════
export default function ExpensesPage() {
    const [categories, setCategories]   = useState([])
    const [expenses, setExpenses]       = useState([])
    const [todayTotal, setTodayTotal]   = useState(null)
    const [monthTotal, setMonthTotal]   = useState(null)
    const [loading, setLoading]         = useState(false)

    // Modallar
    const [showAddModal, setShowAddModal]   = useState(false)
    const [showCatModal, setShowCatModal]   = useState(false)
    const [confirmId, setConfirmId]         = useState(null)
    const [deletingId, setDeletingId]       = useState(null)

    // Harajat forma
    const [formDate, setFormDate]       = useState(todayStr())
    const [formCatId, setFormCatId]     = useState('')
    const [formAmount, setFormAmount]   = useState('')
    const [formNote, setFormNote]       = useState('')
    const [formSaving, setFormSaving]   = useState(false)
    const [formShiftId, setFormShiftId] = useState('')
    const [dateShifts, setDateShifts]   = useState([])
    const [shiftsLoading, setShiftsLoading] = useState(false)

    // Filter
    const [filterFrom, setFilterFrom]   = useState('')
    const [filterTo, setFilterTo]       = useState('')
    const [filterCat, setFilterCat]     = useState('')
    const [filterOpen, setFilterOpen]   = useState(false)

    const hasFilter = filterFrom || filterTo || filterCat

    const loadCategories = useCallback(() => {
        api.get('/api/v1/expenses/categories').then(r => setCategories(r.data)).catch(console.error)
    }, [])

    const loadExpenses = useCallback(() => {
        setLoading(true)
        const params = new URLSearchParams()
        if (filterFrom) params.append('from', filterFrom)
        if (filterTo)   params.append('to', filterTo)
        if (filterCat)  params.append('categoryId', filterCat)
        api.get('/api/v1/expenses?' + params)
            .then(r => setExpenses(r.data))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [filterFrom, filterTo, filterCat])

    const loadTotals = useCallback(() => {
        api.get('/api/v1/expenses/today-total')
            .then(r => setTodayTotal(r.data.total))
            .catch(console.error)
        const today = todayStr()
        const monthStart = monthStartStr()
        api.get(`/api/v1/expenses/period-total?from=${monthStart}&to=${today}`)
            .then(r => setMonthTotal(r.data.total))
            .catch(console.error)
    }, [])

    useEffect(() => { loadCategories() }, [loadCategories])
    useEffect(() => { loadExpenses() },   [loadExpenses])
    useEffect(() => { loadTotals() },     [loadTotals])

    // Forma ochilganda yoki sana o'zgarganda — o'sha sananing smenalarini yukla
    useEffect(() => {
        if (!showAddModal || !formDate) return
        setShiftsLoading(true)
        setFormShiftId('')
        api.get(`/api/v1/shifts/by-date?date=${formDate}`)
            .then(r => {
                setDateShifts(r.data)
                // Smena(lar) bo'lsa — birinchisini avtomatik tanlash
                if (r.data.length > 0) setFormShiftId(String(r.data[0].id))
            })
            .catch(() => setDateShifts([]))
            .finally(() => setShiftsLoading(false))
    }, [showAddModal, formDate])

    // Filtrlangan ro'yxatning jami
    const filteredTotal = expenses.reduce((s, e) => s + Number(e.amount), 0)

    const handleAddExpense = async (e) => {
        e.preventDefault()
        if (!formAmount) return
        // Smena(lar) mavjud bo'lsa — tanlash majburiy
        if (dateShifts.length > 0 && !formShiftId) return
        setFormSaving(true)
        try {
            await api.post('/api/v1/expenses', {
                date:       formDate || null,
                categoryId: formCatId || null,
                shiftId:    formShiftId || null,
                amount:     formAmount,
                note:       formNote || null,
            })
            setShowAddModal(false)
            setFormAmount('')
            setFormNote('')
            setFormDate(todayStr())
            setFormCatId('')
            setFormShiftId('')
            setDateShifts([])
            loadExpenses()
            loadTotals()
        } catch (err) {
            console.error(err)
        } finally {
            setFormSaving(false)
        }
    }

    const handleDeleteExpense = async (id) => {
        setDeletingId(id)
        try {
            await api.delete(`/api/v1/expenses/${id}`)
            setExpenses(prev => prev.filter(e => e.id !== id))
            loadTotals()
        } catch (err) {
            console.error(err)
        } finally {
            setDeletingId(null)
            setConfirmId(null)
        }
    }

    const handleReset = () => {
        setFilterFrom('')
        setFilterTo('')
        setFilterCat('')
    }

    return (
        <div className="exp-wrapper">

            {/* ── Header ─────────────────────────────────── */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                        <Receipt size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">
                            Harajatlar
                            <span className="page-count">({expenses.length} ta)</span>
                        </h1>
                        <p className="page-subtitle">Kunlik xarajatlar va kategoriyalar</p>
                    </div>
                </div>
                <div className="products-header-right">
                    <button className="btn-reset" onClick={() => setShowCatModal(true)}>
                        <Tag size={14} /> Kategoriyalar
                    </button>
                    <button className="btn-add" onClick={() => setShowAddModal(true)}>
                        <Plus size={16} /> Harajat qo'shish
                    </button>
                </div>
            </div>

            {/* ── Summary kartalar ───────────────────────── */}
            <div className="exp-sum-grid">
                <SummaryCard
                    label="Bugun"
                    value={todayTotal}
                    icon={Receipt}
                    color="#ef4444"
                    sub="Bugungi harajatlar"
                />
                <SummaryCard
                    label="Joriy oy"
                    value={monthTotal}
                    icon={Calendar}
                    color="#f59e0b"
                    sub="Shu oy davomida"
                />
                <SummaryCard
                    label={hasFilter ? "Filtr bo'yicha" : "Bugun (tanlangan)"}
                    value={hasFilter ? filteredTotal : todayTotal}
                    icon={Wallet}
                    color="#2563eb"
                    sub={hasFilter
                        ? `${expenses.length} ta harajat`
                        : "Filtr berish uchun ustiga bosing"}
                />
            </div>

            {/* ── Filter bar ─────────────────────────────── */}
            <div className="filter-bar exp-filter-bar">
                <button
                    className={`exp-filter-toggle ${filterOpen || hasFilter ? 'active' : ''}`}
                    onClick={() => setFilterOpen(o => !o)}
                >
                    <Filter size={14} />
                    Filtr
                    {hasFilter && <span className="exp-filter-dot" />}
                    {filterOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {(filterOpen || hasFilter) && (
                    <div className="exp-filter-fields">
                        <div className="exp-filter-date-group">
                            <Calendar size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <input type="date" className="filter-search"
                                   value={filterFrom}
                                   onChange={e => setFilterFrom(e.target.value)} />
                            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                            <input type="date" className="filter-search"
                                   value={filterTo}
                                   onChange={e => setFilterTo(e.target.value)} />
                        </div>
                        <select className="filter-search exp-cat-select"
                                value={filterCat}
                                onChange={e => setFilterCat(e.target.value)}>
                            <option value="">Barcha kategoriyalar</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {hasFilter && (
                            <button className="btn-reset" onClick={handleReset}>
                                <RotateCcw size={13} /> Tozalash
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Jadval ─────────────────────────────────── */}
            <div className="table-card">
                {loading ? (
                    <div className="table-loading">
                        <Loader2 size={28} className="spin" />
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="table-empty">
                        <Receipt size={44} strokeWidth={1} />
                        <p>{hasFilter ? 'Filtr bo\'yicha harajat topilmadi' : 'Harajatlar yo\'q'}</p>
                        <button className="btn-add" onClick={() => setShowAddModal(true)}>
                            <Plus size={14} /> Birinchi harajatni qo'shish
                        </button>
                    </div>
                ) : (
                    <>
                    {/* Desktop jadval */}
                    <div className="exp-table-wrap">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th>Sana</th>
                                <th>Kategoriya</th>
                                <th>Izoh</th>
                                <th style={{ fontSize: 12, color: 'var(--text-muted)' }}>Qo'shgan</th>
                                <th className="th-right">Summa</th>
                                <th className="th-center" style={{ width: 60 }}></th>
                            </tr>
                            </thead>
                            <tbody>
                            {expenses.map((e, i) => (
                                <tr key={e.id}>
                                    <td className="cell-num">{i + 1}</td>
                                    <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{fmtDate(e.date)}</td>
                                    <td>
                                        {e.categoryName && e.categoryName !== '—'
                                            ? <span className="exp-cat-badge">{e.categoryName}</span>
                                            : <span className="cell-muted">—</span>
                                        }
                                    </td>
                                    <td>
                                        <span className="cell-muted" style={{ fontSize: 13 }}>
                                            {e.note || '—'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {e.createdByName || '—'}
                                    </td>
                                    <td className="th-right">
                                        <span style={{ fontWeight: 700, color: '#ef4444' }}>
                                            {fmt(e.amount)} UZS
                                        </span>
                                    </td>
                                    <td className="th-center">
                                        <button
                                            className="act-btn act-del"
                                            onClick={() => setConfirmId(e.id)}
                                            disabled={deletingId === e.id}
                                            title="O'chirish"
                                        >
                                            {deletingId === e.id
                                                ? <Loader2 size={13} className="spin" />
                                                : <Trash2 size={13} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                            <tfoot>
                            <tr className="exp-table-footer">
                                <td colSpan={5} style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-muted)', paddingRight: 8 }}>
                                    Jami:
                                </td>
                                <td className="th-right" style={{ fontWeight: 700, fontSize: 15, color: '#ef4444' }}>
                                    {fmt(filteredTotal)} UZS
                                </td>
                                <td />
                            </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Mobil kartalar */}
                    <div className="exp-cards">
                        {expenses.map((e) => (
                            <div key={e.id} className="exp-card">
                                <div className="exp-card-row">
                                    <div className="exp-card-left">
                                        <span className="exp-card-date">{fmtDate(e.date)}</span>
                                        {e.categoryName && e.categoryName !== '—' && (
                                            <span className="exp-cat-badge">{e.categoryName}</span>
                                        )}
                                    </div>
                                    <span className="exp-card-amount">{fmt(e.amount)} UZS</span>
                                </div>
                                {e.note && (
                                    <div className="exp-card-note">{e.note}</div>
                                )}
                                <div className="exp-card-footer">
                                    <span className="exp-card-by">{e.createdByName || '—'}</span>
                                    <button
                                        className="act-btn act-del"
                                        onClick={() => setConfirmId(e.id)}
                                        disabled={deletingId === e.id}
                                    >
                                        {deletingId === e.id
                                            ? <Loader2 size={13} className="spin" />
                                            : <Trash2 size={13} />}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Mobil jami */}
                        <div className="exp-cards-total">
                            <span>Jami:</span>
                            <span style={{ color: '#ef4444', fontWeight: 700 }}>{fmt(filteredTotal)} UZS</span>
                        </div>
                    </div>
                    </>
                )}
            </div>

            {/* ══ Harajat qo'shish modali ══════════════════ */}
            {showAddModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowAddModal(false); setDateShifts([]); setFormShiftId('') } }}>
                    <div className="modal-box products-modal">
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <div className="exp-modal-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                                    <Receipt size={20} />
                                </div>
                                <div>
                                    <h3 className="modal-title">Harajat qo'shish</h3>
                                    <p className="modal-subtitle">Yangi xarajatni kiritish</p>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => { setShowAddModal(false); setDateShifts([]); setFormShiftId('') }}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAddExpense}>
                            <div className="modal-body">
                                <div className="exp-form-grid">
                                    <div className="modal-field">
                                        <label className="modal-label">Summa (UZS) *</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="modal-input exp-amount-input"
                                            placeholder="0"
                                            value={formAmount ? fmt(formAmount) : ''}
                                            onChange={e => setFormAmount(e.target.value.replace(/\D/g, ''))}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div className="modal-field">
                                        <label className="modal-label">Kategoriya</label>
                                        <select
                                            className="modal-input"
                                            value={formCatId}
                                            onChange={e => setFormCatId(e.target.value)}
                                        >
                                            <option value="">Kategoriyasiz</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="modal-field">
                                        <label className="modal-label">Sana</label>
                                        <input
                                            type="date"
                                            className="modal-input"
                                            value={formDate}
                                            onChange={e => setFormDate(e.target.value)}
                                        />
                                    </div>
                                    {shiftsLoading ? (
                                        <div className="modal-field">
                                            <label className="modal-label">Smena</label>
                                            <div className="modal-input exp-shift-loading">
                                                <Loader2 size={13} className="spin" /> Yuklanmoqda...
                                            </div>
                                        </div>
                                    ) : dateShifts.length > 0 ? (
                                        <div className="modal-field">
                                            <label className="modal-label">Smena *</label>
                                            <select
                                                className="modal-input exp-shift-select"
                                                value={formShiftId}
                                                onChange={e => setFormShiftId(e.target.value)}
                                                required
                                            >
                                                {dateShifts.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {fmtShiftLabel(s)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : null}
                                    <div className="modal-field">
                                        <label className="modal-label">Izoh</label>
                                        <input
                                            type="text"
                                            className="modal-input"
                                            placeholder="Ixtiyoriy..."
                                            value={formNote}
                                            onChange={e => setFormNote(e.target.value)}
                                            maxLength={500}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                                    Bekor
                                </button>
                                <button type="submit" className="btn-save"
                                        disabled={formSaving || !formAmount || shiftsLoading || (dateShifts.length > 0 && !formShiftId)}>
                                    {formSaving
                                        ? <><Loader2 size={14} className="spin" /> Saqlanmoqda...</>
                                        : 'Saqlash'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══ Kategoriyalar modali ══════════════════════ */}
            {showCatModal && (
                <CategoriesModal
                    categories={categories}
                    onClose={() => setShowCatModal(false)}
                    onRefresh={loadCategories}
                />
            )}

            {/* ══ O'chirish tasdiqlash modali ═══════════════ */}
            {confirmId && (
                <div className="modal-overlay" onClick={() => setConfirmId(null)}>
                    <div className="modal-box products-modal" onClick={e => e.stopPropagation()}
                         style={{ maxWidth: 380 }}>
                        <div className="modal-body" style={{ textAlign: 'center', padding: '28px 24px 16px' }}>
                            <div className="exp-del-icon">
                                <Trash2 size={26} />
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>O'chirishni tasdiqlang</h3>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
                                Bu harajat o'chiriladi. Amalni qaytarib bo'lmaydi.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setConfirmId(null)}>Bekor</button>
                            <button className="btn-delete"
                                    onClick={() => handleDeleteExpense(confirmId)}
                                    disabled={deletingId === confirmId}>
                                {deletingId === confirmId
                                    ? <><Loader2 size={14} className="spin" /> O'chirilmoqda...</>
                                    : "O'chirish"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}