import { useState, useEffect, useCallback } from 'react'
import {
    Factory, Plus, Pencil, Trash2, X, AlertCircle,
    Loader2, Search, CreditCard, Phone, Building2
} from 'lucide-react'
import {
    getSuppliers, createSupplier, updateSupplier,
    deleteSupplier, getSupplierDebts
} from '../api/suppliers'
import '../styles/ProductsPage.css'
import { useAuth } from '../context/AuthContext'

const EMPTY_FORM = {
    name: '', company: '', phone: '',
    address: '', bankAccount: '', inn: '', notes: ''
}

const fmt = (v) => v ? new Intl.NumberFormat('uz-UZ').format(v) + ' UZS' : '0 UZS'

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')

    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Debts
    const [debtSupplier, setDebtSupplier] = useState(null)
    const [debts, setDebts] = useState([])
    const [debtLoading, setDebtLoading] = useState(false)

    const { hasPermission } = useAuth()

    const load = useCallback(() => {
        setLoading(true)
        getSuppliers({ search: search || undefined, size: 100 })
            .then(res => {
                const d = res.data
                setSuppliers(d.content || d || [])
                setTotal(d.totalElements || (d.content || d || []).length)
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [search])

    useEffect(() => { load() }, [load])

    const openAdd = () => {
        setEditId(null); setForm(EMPTY_FORM); setError(''); setShowModal(true)
    }

    const openEdit = (s) => {
        setEditId(s.id)
        setForm({
            name: s.name || '', company: s.company || '',
            phone: s.phone || '', address: s.address || '',
            bankAccount: s.bankAccount || '', inn: s.inn || '',
            notes: s.notes || ''
        })
        setError(''); setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) { setError("Nomi kiritilishi shart"); return }
        setSaving(true); setError('')
        try {
            editId ? await updateSupplier(editId, form) : await createSupplier(form)
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

    const handleDelete = async (s) => {
        if (!confirm(`"${s.name}" ni o'chirishni tasdiqlaysizmi?`)) return
        try { await deleteSupplier(s.id); load() } catch (e) {
            alert(e.response?.data?.message || 'Xatolik')
        }
    }

    const openDebts = async (s) => {
        setDebtSupplier(s); setDebtLoading(true); setDebts([])
        try {
            const res = await getSupplierDebts(s.id)
            setDebts(res.data || [])
        } catch (e) { console.error(e) }
        finally { setDebtLoading(false) }
    }

    const totalDebt = debts.reduce((s, d) => s + (d.remainingAmount || 0), 0)

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap">
                        <Factory size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">
                            Yetkazuvchilar
                            <span className="page-count">({total} ta)</span>
                        </h1>
                        <p className="page-subtitle">Ta'minotchilar va qarzlarni boshqarish</p>
                    </div>
                </div>
                {hasPermission('SUPPLIERS_CREATE') && (
                    <button className="btn-add" onClick={openAdd}>
                        <Plus size={16} />
                        Yetkazuvchi qo'shish
                    </button>
                )}
            </div>

            {/* Filter */}
            <div className="filter-bar">
                <div className="filter-search-wrap">
                    <Search size={16} className="filter-search-icon" />
                    <input className="filter-search" placeholder="Ism yoki kompaniya..." value={search}
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
                ) : suppliers.length === 0 ? (
                    <div className="table-empty">
                        <Factory size={40} strokeWidth={1} />
                        <p>Yetkazuvchilar yo'q</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th>Nomi</th>
                                <th>Kompaniya</th>
                                <th>Telefon</th>
                                <th>INN</th>
                                <th className="th-center">Holat</th>
                                <th className="th-center">Amallar</th>
                            </tr>
                            </thead>
                            <tbody>
                            {suppliers.map((s, i) => (
                                <tr key={s.id}>
                                    <td className="cell-num">{i + 1}</td>
                                    <td>
                                        <div className="cell-name">{s.name}</div>
                                        {s.address && <div className="cell-muted" style={{ fontSize: 12 }}>{s.address}</div>}
                                    </td>
                                    <td>
                                        {s.company ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Building2 size={13} style={{ color: 'var(--text-muted)' }} />
                                                <span style={{ fontSize: 13 }}>{s.company}</span>
                                            </div>
                                        ) : <span className="cell-muted">—</span>}
                                    </td>
                                    <td>
                                        {s.phone ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Phone size={13} style={{ color: 'var(--text-muted)' }} />
                                                <span className="cell-barcode">{s.phone}</span>
                                            </div>
                                        ) : <span className="cell-muted">—</span>}
                                    </td>
                                    <td>
                                        {s.inn ? <span className="cell-barcode">{s.inn}</span> : <span className="cell-muted">—</span>}
                                    </td>
                                    <td className="th-center">
                                            <span className={`status-badge ${s.isActive !== false ? 'status-active' : 'status-inactive'}`}>
                                                {s.isActive !== false ? 'Faol' : 'Noaktiv'}
                                            </span>
                                    </td>
                                    <td>
                                        <div className="action-group">
                                            {hasPermission('SUPPLIERS_EDIT') && (
                                                <button className="act-btn act-edit" title="Tahrirlash" onClick={() => openEdit(s)}>
                                                    <Pencil size={14} />
                                                </button>
                                            )}
                                            {hasPermission('SUPPLIERS_DEBT_VIEW') && (
                                                <button className="act-btn"
                                                        style={{ color: 'var(--info, #0891b2)' }}
                                                        title="Qarzlar" onClick={() => openDebts(s)}>
                                                    <CreditCard size={14} />
                                                </button>
                                            )}
                                            {hasPermission('SUPPLIERS_DELETE') && (
                                                <button className="act-btn act-delete" title="O'chirish" onClick={() => handleDelete(s)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
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
                    <div className="modal-box products-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <Factory size={20} />
                                <div>
                                    <h6 className="modal-title">{editId ? 'Yetkazuvchini tahrirlash' : 'Yetkazuvchi qo\'shish'}</h6>
                                    <p className="modal-subtitle">Ma'lumotlarni kiriting</p>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}
                            <div className="form-row">
                                <div className="form-group flex-2">
                                    <label className="form-label">Nomi <span className="required">*</span></label>
                                    <input className="form-input" value={form.name}
                                           onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                           placeholder="Yetkazuvchi ismi" autoFocus />
                                </div>
                                <div className="form-group flex-2">
                                    <label className="form-label">Kompaniya</label>
                                    <input className="form-input" value={form.company}
                                           onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                                           placeholder="Kompaniya nomi" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group flex-1">
                                    <label className="form-label">Telefon</label>
                                    <input className="form-input" value={form.phone}
                                           onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                           placeholder="+998901234567" />
                                </div>
                                <div className="form-group flex-1">
                                    <label className="form-label">INN</label>
                                    <input className="form-input" value={form.inn}
                                           onChange={e => setForm(f => ({ ...f, inn: e.target.value }))}
                                           placeholder="123456789" />
                                </div>
                                <div className="form-group flex-1">
                                    <label className="form-label">Bank hisob</label>
                                    <input className="form-input" value={form.bankAccount}
                                           onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value }))}
                                           placeholder="20208..." />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label">Manzil</label>
                                <input className="form-input" value={form.address}
                                       onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                       placeholder="Shahar, ko'cha..." />
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
            {debtSupplier && (
                <div className="modal-overlay" onClick={() => setDebtSupplier(null)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <CreditCard size={20} />
                                <div>
                                    <h6 className="modal-title">{debtSupplier.name} — Qarzlar</h6>
                                    {totalDebt > 0 && (
                                        <p className="modal-subtitle" style={{ color: 'var(--danger)' }}>
                                            Jami qarz: {fmt(totalDebt)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setDebtSupplier(null)}><X size={16} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: 0 }}>
                            {debtLoading ? (
                                <div className="table-loading"><Loader2 size={24} className="spin" /></div>
                            ) : debts.length === 0 ? (
                                <div className="table-empty">
                                    <CreditCard size={36} strokeWidth={1} />
                                    <p>Qarz yo'q ✅</p>
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
                                        <th className="th-center">Holat</th>
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
                                                    <span className={`status-badge ${d.isPaid ? 'status-active' : 'status-inactive'}`}>
                                                        {d.isPaid ? 'To\'langan' : 'Qarz'}
                                                    </span>
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