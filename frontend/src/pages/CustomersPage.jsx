import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Pencil, X, AlertCircle, Loader2, Search, CreditCard, ChevronDown, ChevronUp } from 'lucide-react'
import { getCustomers, createCustomer, updateCustomer, getCustomerDebts, payCustomerDebt } from '../api/customers'
import '../styles/ProductsPage.css'

const EMPTY_FORM = { name: '', phone: '', notes: '' }
const formatPhone = (v) => v.replace(/\D/g, '').slice(0, 12)
const fmt = (v) => v ? new Intl.NumberFormat('uz-UZ').format(v) + ' UZS' : '0 UZS'

export default function CustomersPage() {
    const [customers, setCustomers] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Debts
    const [debtCustomer, setDebtCustomer] = useState(null)
    const [debts, setDebts] = useState([])
    const [debtLoading, setDebtLoading] = useState(false)
    const [payingDebtId, setPayingDebtId] = useState(null)
    const [payAmount, setPayAmount] = useState('')

    const load = useCallback(() => {
        setLoading(true)
        getCustomers({ search: search || undefined, size: 100 })
            .then(res => {
                const d = res.data
                setCustomers(d.content || d || [])
                setTotal(d.totalElements || (d.content || d || []).length)
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [search])

    useEffect(() => { load() }, [load])

    const openAdd = () => {
        setEditId(null); setForm(EMPTY_FORM); setError(''); setShowModal(true)
    }

    const openEdit = (c) => {
        setEditId(c.id)
        setForm({ name: c.name || '', phone: c.phone || '', notes: c.notes || '' })
        setError(''); setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) { setError("Ismi kiritilishi shart"); return }
        if (!form.phone.trim()) { setError("Telefon kiritilishi shart"); return }
        setSaving(true); setError('')
        try {
            editId ? await updateCustomer(editId, form) : await createCustomer(form)
            setShowModal(false); load()
        } catch (err) {
            setError(err.response?.data?.message || 'Xatolik yuz berdi')
        } finally { setSaving(false) }
    }
    useEffect(() => {
        if (!showModal) return
        const handleKey = (e) => {
            if (e.key === 'Escape') setShowModal(false)
            if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') handleSave()
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [showModal, handleSave])

    const openDebts = async (c) => {
        setDebtCustomer(c); setDebtLoading(true); setDebts([])
        try {
            const res = await getCustomerDebts(c.id)
            setDebts(res.data || [])
        } catch (e) { console.error(e) }
        finally { setDebtLoading(false) }
    }

    const handlePay = async (debtId) => {
        if (!payAmount || Number(payAmount) <= 0) return
        try {
            await payCustomerDebt(debtId, { amount: Number(payAmount) })
            setPayAmount(''); setPayingDebtId(null)
            openDebts(debtCustomer); load()
        } catch (err) { alert(err.response?.data?.message || 'Xatolik') }
    }

    const totalDebt = debts.reduce((s, d) => s + (d.remainingAmount || 0), 0)

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap">
                        <Users size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">
                            Mijozlar
                            <span className="page-count">({total} ta)</span>
                        </h1>
                        <p className="page-subtitle">Mijozlar va nasiyalarni boshqarish</p>
                    </div>
                </div>
                <button className="btn-add" onClick={openAdd}>
                    <Plus size={16} />
                    Mijoz qo'shish
                </button>
            </div>

            {/* Filter */}
            <div className="filter-bar">
                <div className="filter-search-wrap">
                    <Search size={16} className="filter-search-icon" />
                    <input className="filter-search" placeholder="Ism yoki telefon..." value={search}
                           onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {/* Table */}
            <div className="table-card">
                {loading ? (
                    <div className="table-loading">
                        <Loader2 size={28} className="spin" />
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : customers.length === 0 ? (
                    <div className="table-empty">
                        <Users size={40} strokeWidth={1} />
                        <p>Mijozlar yo'q</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th>Ismi</th>
                                <th>Telefon</th>
                                <th>Izoh</th>
                                <th className="th-right">Qarz</th>
                                <th className="th-center">Holat</th>
                                <th className="th-center">Amallar</th>
                            </tr>
                            </thead>
                            <tbody>
                            {customers.map((c, i) => (
                                <tr key={c.id}>
                                    <td className="cell-num">{i + 1}</td>
                                    <td className="cell-name">{c.name}</td>
                                    <td>
                                        <span className="cell-barcode">{c.phone}</span>
                                    </td>
                                    <td className="cell-muted">{c.notes || '—'}</td>
                                    <td className="th-right">
                                        {c.totalDebt > 0 ? (
                                            <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 13 }}>
                                                    {fmt(c.totalDebt)}
                                                </span>
                                        ) : (
                                            <span className="cell-muted">—</span>
                                        )}
                                    </td>
                                    <td className="th-center">
                                            <span className={`status-badge ${c.isActive !== false ? 'status-active' : 'status-inactive'}`}>
                                                {c.isActive !== false ? 'Faol' : 'Noaktiv'}
                                            </span>
                                    </td>
                                    <td>
                                        <div className="action-group">
                                            <button className="act-btn act-edit" title="Tahrirlash" onClick={() => openEdit(c)}>
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                className="act-btn"
                                                title="Nasiyalar"
                                                style={{ color: 'var(--info, #0891b2)', borderColor: 'var(--border-color)' }}
                                                onClick={() => openDebts(c)}
                                            >
                                                <CreditCard size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box products-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <Users size={20} />
                                <div>
                                    <h6 className="modal-title">{editId ? 'Mijozni tahrirlash' : 'Mijoz qo\'shish'}</h6>
                                    <p className="modal-subtitle">Mijoz ma'lumotlarini kiriting</p>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label">Ismi <span className="required">*</span></label>
                                <input className="form-input" value={form.name}
                                       onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                       placeholder="Mijoz ismi" autoFocus />
                            </div>
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label">Telefon <span className="required">*</span></label>
                                <input className="form-input" value={form.phone}
                                       onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                                       placeholder="+998901234567" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Izoh</label>
                                <textarea className="form-textarea" rows={2} value={form.notes}
                                          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                          placeholder="Ixtiyoriy" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowModal(false)}>Bekor qilish</button>
                            <button className="btn-save" onClick={handleSave} disabled={saving}>
                                {saving ? <><Loader2 size={14} className="spin" /> Saqlanmoqda...</> : 'Saqlash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Debts Modal */}
            {debtCustomer && (
                <div className="modal-overlay" onClick={() => setDebtCustomer(null)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <CreditCard size={20} />
                                <div>
                                    <h6 className="modal-title">{debtCustomer.name} — Nasiyalar</h6>
                                    {totalDebt > 0 && (
                                        <p className="modal-subtitle" style={{ color: 'var(--danger)' }}>
                                            Jami qarz: {fmt(totalDebt)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setDebtCustomer(null)}><X size={16} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: 0 }}>
                            {debtLoading ? (
                                <div className="table-loading"><Loader2 size={24} className="spin" /></div>
                            ) : debts.length === 0 ? (
                                <div className="table-empty">
                                    <CreditCard size={36} strokeWidth={1} />
                                    <p>Nasiya yo'q ✅</p>
                                </div>
                            ) : (
                                <table className="ptable">
                                    <thead>
                                    <tr>
                                        <th className="th-num">#</th>
                                        <th>Sana</th>
                                        <th className="th-right">Umumiy</th>
                                        <th className="th-right">To'langan</th>
                                        <th className="th-right">Qoldi</th>
                                        <th className="th-center">To'lash</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {debts.map((d, i) => (
                                        <tr key={d.id}>
                                            <td className="cell-num">{i + 1}</td>
                                            <td className="cell-muted" style={{ fontSize: 13 }}>
                                                {d.createdAt ? new Date(d.createdAt).toLocaleDateString('uz-UZ') : '—'}
                                            </td>
                                            <td className="th-right cell-price">{fmt(d.totalAmount)}</td>
                                            <td className="th-right" style={{ color: 'var(--success)' }}>{fmt(d.paidAmount)}</td>
                                            <td className="th-right">
                                                    <span style={{ fontWeight: 700, color: d.remainingAmount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                                        {fmt(d.remainingAmount)}
                                                    </span>
                                            </td>
                                            <td className="th-center">
                                                {d.remainingAmount > 0 ? (
                                                    payingDebtId === d.id ? (
                                                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                                            <input type="number" className="form-input" style={{ width: 110, height: 32 }}
                                                                   value={payAmount} onChange={e => setPayAmount(e.target.value)}
                                                                   placeholder="Summa" autoFocus />
                                                            <button className="act-btn act-edit" onClick={() => handlePay(d.id)} style={{ color: 'var(--success)' }}>✓</button>
                                                            <button className="act-btn" onClick={() => setPayingDebtId(null)}>✕</button>
                                                        </div>
                                                    ) : (
                                                        <button className="act-btn act-edit" style={{ width: 'auto', padding: '0 10px', fontSize: 12 }}
                                                                onClick={() => { setPayingDebtId(d.id); setPayAmount('') }}>
                                                            To'lash
                                                        </button>
                                                    )
                                                ) : (
                                                    <span className="status-badge status-active">To'langan</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}