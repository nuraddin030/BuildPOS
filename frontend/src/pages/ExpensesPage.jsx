import { useState, useEffect, useCallback } from 'react'
import {
    Receipt, Plus, Trash2, X, Loader2, Tag, Calendar, Filter,
    RotateCcw, ChevronDown
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

const fmtDT = (dt) => {
    if (!dt) return '—'
    const d = new Date(dt)
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function todayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ExpensesPage() {
    const [categories, setCategories]   = useState([])
    const [expenses, setExpenses]       = useState([])
    const [todayTotal, setTodayTotal]   = useState(null)
    const [loading, setLoading]         = useState(false)

    // Kategoriya qo'shish
    const [catName, setCatName]         = useState('')
    const [catSaving, setCatSaving]     = useState(false)

    // Harajat qo'shish
    const [showForm, setShowForm]       = useState(false)
    const [formDate, setFormDate]       = useState(todayStr())
    const [formCatId, setFormCatId]     = useState('')
    const [formAmount, setFormAmount]   = useState('')
    const [formNote, setFormNote]       = useState('')
    const [formSaving, setFormSaving]   = useState(false)

    // Filter
    const [filterFrom, setFilterFrom]   = useState('')
    const [filterTo, setFilterTo]       = useState('')
    const [filterCat, setFilterCat]     = useState('')

    // O'chirish tasdiqlash
    const [deletingId, setDeletingId]   = useState(null)
    const [confirmId, setConfirmId]     = useState(null)

    // Kategoriya o'chirish tasdiqlash
    const [confirmCatId, setConfirmCatId] = useState(null)
    const [deletingCatId, setDeletingCatId] = useState(null)

    const [catOpen, setCatOpen]         = useState(false)

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

    const loadTodayTotal = useCallback(() => {
        api.get('/api/v1/expenses/today-total').then(r => setTodayTotal(r.data.total)).catch(console.error)
    }, [])

    useEffect(() => { loadCategories() }, [loadCategories])
    useEffect(() => { loadExpenses() }, [loadExpenses])
    useEffect(() => { loadTodayTotal() }, [loadTodayTotal])

    const handleAddCategory = async (e) => {
        e.preventDefault()
        if (!catName.trim()) return
        setCatSaving(true)
        try {
            await api.post('/api/v1/expenses/categories', { name: catName.trim() })
            setCatName('')
            loadCategories()
        } catch (err) {
            console.error(err)
        } finally {
            setCatSaving(false)
        }
    }

    const handleDeleteCategory = async (id) => {
        setDeletingCatId(id)
        try {
            await api.delete(`/api/v1/expenses/categories/${id}`)
            setCategories(prev => prev.filter(c => c.id !== id))
        } catch (err) {
            console.error(err)
        } finally {
            setDeletingCatId(null)
            setConfirmCatId(null)
        }
    }

    const handleAddExpense = async (e) => {
        e.preventDefault()
        if (!formAmount) return
        setFormSaving(true)
        try {
            await api.post('/api/v1/expenses', {
                date:       formDate || null,
                categoryId: formCatId || null,
                amount:     formAmount,
                note:       formNote || null,
            })
            setShowForm(false)
            setFormAmount('')
            setFormNote('')
            setFormDate(todayStr())
            setFormCatId('')
            loadExpenses()
            loadTodayTotal()
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
            loadTodayTotal()
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

    // Kategoriyalar bo'yicha kunlik jami (joriy filter bo'yicha)
    const byCategory = categories
        .map(cat => ({
            name:   cat.name,
            total:  expenses
                .filter(e => e.categoryId === cat.id)
                .reduce((s, e) => s + Number(e.amount), 0),
        }))
        .filter(c => c.total > 0)
        .sort((a, b) => b.total - a.total)

    const grandTotal = expenses.reduce((s, e) => s + Number(e.amount), 0)

    return (
        <div className="exp-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                        <Receipt size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">
                            Harajatlar
                        </h1>
                        <p className="page-subtitle">Kunlik xarajatlar va kategoriyalar</p>
                    </div>
                </div>
                <div className="products-header-right">
                    {todayTotal != null && (
                        <div className="exp-today-badge">
                            <span className="exp-today-label">Bugun:</span>
                            <span className="exp-today-value">{fmt(todayTotal)} UZS</span>
                        </div>
                    )}
                    <button className="btn-add" onClick={() => setShowForm(true)}>
                        <Plus size={16} /> Harajat qo'shish
                    </button>
                </div>
            </div>

            <div className="exp-layout">
                {/* Chap panel — kategoriyalar */}
                <div className="exp-sidebar-panel">
                    {/* Kategoriyalar boshqaruvi */}
                    <div className="exp-cat-block">
                        <button
                            className="exp-cat-toggle"
                            onClick={() => setCatOpen(o => !o)}
                        >
                            <span className="exp-cat-toggle-left">
                                <Tag size={14} /> Kategoriyalar
                                <span className="exp-cat-count">{categories.length}</span>
                            </span>
                            <ChevronDown size={14} className={`exp-chevron ${catOpen ? 'open' : ''}`} />
                        </button>

                        {catOpen && (
                            <div className="exp-cat-body">
                                <form onSubmit={handleAddCategory} className="exp-cat-form">
                                    <input
                                        type="text"
                                        className="exp-cat-input"
                                        placeholder="Yangi kategoriya nomi"
                                        value={catName}
                                        onChange={e => setCatName(e.target.value)}
                                        maxLength={100}
                                    />
                                    <button type="submit" className="exp-cat-add-btn" disabled={catSaving || !catName.trim()}>
                                        {catSaving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                                    </button>
                                </form>

                                <div className="exp-cat-list">
                                    {categories.map(cat => (
                                        <div key={cat.id} className="exp-cat-item">
                                            <span className="exp-cat-name">{cat.name}</span>
                                            <button
                                                className="exp-cat-del"
                                                onClick={() => setConfirmCatId(cat.id)}
                                                disabled={deletingCatId === cat.id}
                                            >
                                                {deletingCatId === cat.id
                                                    ? <Loader2 size={12} className="spin" />
                                                    : <Trash2 size={12} />}
                                            </button>
                                        </div>
                                    ))}
                                    {categories.length === 0 && (
                                        <div className="exp-cat-empty">Kategoriya yo'q</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Kategoriyalar bo'yicha jami */}
                    {byCategory.length > 0 && (
                        <div className="exp-summary-block">
                            <div className="exp-summary-title">Jami (filtr bo'yicha)</div>
                            {byCategory.map(c => (
                                <div key={c.name} className="exp-summary-row">
                                    <span className="exp-summary-name">{c.name}</span>
                                    <span className="exp-summary-amount">{fmt(c.total)} UZS</span>
                                </div>
                            ))}
                            <div className="exp-summary-total">
                                <span>Hammasi</span>
                                <span>{fmt(grandTotal)} UZS</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* O'ng panel — harajatlar jadvali */}
                <div className="exp-main-panel">
                    {/* Filter */}
                    <div className="filter-bar exp-filter-bar">
                        <div className="exp-date-inputs">
                            <Calendar size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <input type="date" className="filter-search"
                                   value={filterFrom}
                                   onChange={e => setFilterFrom(e.target.value)}
                                   placeholder="Boshlanish" />
                            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                            <input type="date" className="filter-search"
                                   value={filterTo}
                                   onChange={e => setFilterTo(e.target.value)}
                                   placeholder="Tugash" />
                        </div>
                        <div className="exp-filter-select-wrap">
                            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                            <select className="filter-search exp-cat-select"
                                    value={filterCat}
                                    onChange={e => setFilterCat(e.target.value)}>
                                <option value="">Barcha kategoriyalar</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <button className="btn-reset" onClick={handleReset}>
                            <RotateCcw size={14} /> Tozalash
                        </button>
                    </div>

                    {/* Jadval */}
                    <div className="table-card">
                        {loading ? (
                            <div className="table-loading">
                                <Loader2 size={28} className="spin" />
                                <p>Yuklanmoqda...</p>
                            </div>
                        ) : expenses.length === 0 ? (
                            <div className="table-empty">
                                <Receipt size={40} strokeWidth={1} />
                                <p>Harajatlar topilmadi</p>
                            </div>
                        ) : (
                            <>
                            <div className="exp-table-wrap">
                                <table className="ptable">
                                    <thead>
                                    <tr>
                                        <th className="th-num">#</th>
                                        <th>Sana</th>
                                        <th>Kategoriya</th>
                                        <th>Izoh</th>
                                        <th>Qo'shgan</th>
                                        <th className="th-right">Summa</th>
                                        <th className="th-center">Amallar</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {expenses.map((e, i) => (
                                        <tr key={e.id}>
                                            <td className="cell-num">{i + 1}</td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</td>
                                            <td>
                                                {e.categoryName && e.categoryName !== '—'
                                                    ? <span className="exp-cat-badge">{e.categoryName}</span>
                                                    : <span className="cell-muted">—</span>
                                                }
                                            </td>
                                            <td style={{ maxWidth: 200 }}>
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
                                                >
                                                    {deletingId === e.id
                                                        ? <Loader2 size={13} className="spin" />
                                                        : <Trash2 size={13} />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobil kard ko'rinishi */}
                            <div className="exp-cards">
                                {expenses.map((e) => (
                                    <div key={e.id} className="exp-card">
                                        <div className="exp-card-top">
                                            <div className="exp-card-left">
                                                <span className="exp-card-date">{fmtDate(e.date)}</span>
                                                {e.categoryName && e.categoryName !== '—' && (
                                                    <span className="exp-cat-badge">{e.categoryName}</span>
                                                )}
                                            </div>
                                            <span className="exp-card-amount">{fmt(e.amount)} UZS</span>
                                        </div>
                                        {e.note && <div className="exp-card-note">{e.note}</div>}
                                        <div className="exp-card-footer">
                                            <span className="exp-card-by">{e.createdByName}</span>
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
                            </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Harajat qo'shish modali */}
            {showForm && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
                    <div className="modal-box products-modal">
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <div style={{
                                    width: 40, height: 40, borderRadius: 12,
                                    background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Receipt size={20} />
                                </div>
                                <div>
                                    <h3 className="modal-title">Harajat qo'shish</h3>
                                    <p className="modal-subtitle">Yangi xarajatni kiritish</p>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowForm(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAddExpense}>
                            <div className="modal-body">
                                <div className="modal-field">
                                    <label className="modal-label">Sana</label>
                                    <input
                                        type="date"
                                        className="modal-input"
                                        value={formDate}
                                        onChange={e => setFormDate(e.target.value)}
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
                                    <label className="modal-label">Summa (UZS) *</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        className="modal-input"
                                        placeholder="Masalan: 50000"
                                        value={formAmount}
                                        onChange={e => setFormAmount(e.target.value.replace(/\D/g, ''))}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="modal-field">
                                    <label className="modal-label">Izoh</label>
                                    <input
                                        type="text"
                                        className="modal-input"
                                        placeholder="Ixtiyoriy"
                                        value={formNote}
                                        onChange={e => setFormNote(e.target.value)}
                                        maxLength={500}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Bekor</button>
                                <button type="submit" className="btn-save" disabled={formSaving || !formAmount}>
                                    {formSaving ? <><Loader2 size={14} className="spin" /> Saqlanmoqda...</> : 'Saqlash'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Harajat o'chirish tasdiqlash */}
            {confirmId && (
                <div className="modal-overlay" onClick={() => setConfirmId(null)}>
                    <div className="modal-box products-modal" onClick={e => e.stopPropagation()}
                         style={{ maxWidth: 380 }}>
                        <div className="modal-body" style={{ textAlign: 'center', padding: '24px 24px 16px' }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: 16, background: 'rgba(239,68,68,0.1)',
                                color: '#ef4444', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto 16px'
                            }}>
                                <Trash2 size={24} />
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

            {/* Kategoriya o'chirish tasdiqlash */}
            {confirmCatId && (
                <div className="modal-overlay" onClick={() => setConfirmCatId(null)}>
                    <div className="modal-box products-modal" onClick={e => e.stopPropagation()}
                         style={{ maxWidth: 380 }}>
                        <div className="modal-body" style={{ textAlign: 'center', padding: '24px 24px 16px' }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: 16, background: 'rgba(239,68,68,0.1)',
                                color: '#ef4444', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto 16px'
                            }}>
                                <Tag size={24} />
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>Kategoriyani o'chirish</h3>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
                                Bu kategoriya o'chiriladi. Unga bog'liq harajatlar kategoriyasiz qoladi.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setConfirmCatId(null)}>Bekor</button>
                            <button className="btn-delete"
                                    onClick={() => handleDeleteCategory(confirmCatId)}
                                    disabled={deletingCatId === confirmCatId}>
                                {deletingCatId === confirmCatId
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