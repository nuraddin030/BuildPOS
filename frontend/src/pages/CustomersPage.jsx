import {useState, useEffect, useCallback} from 'react'
import {useNavigate} from 'react-router-dom'
import {Users, Plus, Pencil, X, AlertCircle, Loader2, Search, CreditCard, ExternalLink, MoreVertical} from 'lucide-react'
import {getCustomers, createCustomer, updateCustomer} from '../api/Customers'
import '../styles/ProductsPage.css'
import '../styles/CustomersPage.css'
import {useAuth} from '../context/AuthContext'
import DropdownPortal from '../components/DropdownPortal'

const EMPTY_FORM = {name: '', phone: '', notes: '', debtLimit: '', debtLimitStrict: false}
const formatPhone = (v) => v.replace(/\D/g, '').slice(0, 12)
const fmt = (v) => v ? new Intl.NumberFormat('uz-UZ').format(v) + ' UZS' : '0 UZS'

export default function CustomersPage() {
    const navigate = useNavigate()
    const [customers, setCustomers] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Debts endi DebtsPage ga yo'naltiriladi — bu state lar kerak emas
    const [noDebtModal, setNoDebtModal] = useState(null) // qarz yo'q mijoz nomi
    const [openMenuId, setOpenMenuId] = useState(null)
    const [menuAnchor, setMenuAnchor] = useState(null)

    const load = useCallback(() => {
        setLoading(true)
        getCustomers({search: search || undefined, size: 100})
            .then(res => {
                const d = res.data
                setCustomers(d.content || d || [])
                setTotal(d.totalElements || (d.content || d || []).length)
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [search])

    useEffect(() => {
        load()
    }, [load])

    const openAdd = () => {
        setEditId(null);
        setForm(EMPTY_FORM);
        setError('');
        setShowModal(true)
    }

    const {hasPermission} = useAuth()

    const openEdit = (c) => {
        setEditId(c.id)
        setForm({
            name: c.name || '',
            phone: c.phone || '',
            notes: c.notes || '',
            debtLimit: c.debtLimit ? String(c.debtLimit) : '',
            debtLimitStrict: c.debtLimitStrict || false
        })
        setError('');
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) {
            setError("Ismi kiritilishi shart");
            return
        }
        if (!form.phone.trim()) {
            setError("Telefon kiritilishi shart");
            return
        }
        setSaving(true);
        setError('')
        try {
            const payload = {
                ...form,
                debtLimit: form.debtLimit ? Number(form.debtLimit) : null,
                debtLimitStrict: form.debtLimitStrict || false,
            }
            editId ? await updateCustomer(editId, payload) : await createCustomer(payload)
            setShowModal(false);
            load()
        } catch (err) {
            setError(err.response?.data?.message || 'Xatolik yuz berdi')
        } finally {
            setSaving(false)
        }
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


    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap">
                        <Users size={22}/>
                    </div>
                    <div>
                        <h1 className="page-title">
                            Mijozlar
                            <span className="page-count">({total} ta)</span>
                        </h1>
                        <p className="page-subtitle">Mijozlar va nasiyalarni boshqarish</p>
                    </div>
                </div>
                {hasPermission('CUSTOMERS_CREATE') && (
                    <button className="btn-add" onClick={openAdd}>
                        <Plus size={16}/>
                        Mijoz qo'shish
                    </button>
                )}
            </div>

            {/* Filter */}
            <div className="filter-bar">
                <div className="filter-search-wrap">
                    <Search size={16} className="filter-search-icon"/>
                    <input className="filter-search" placeholder="Ism yoki telefon..." value={search}
                           onChange={e => setSearch(e.target.value)}/>
                </div>
            </div>

            {/* Table */}
            <div className="table-card">
                {loading ? (
                    <div className="table-loading">
                        <Loader2 size={28} className="spin"/>
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : customers.length === 0 ? (
                    <div className="table-empty">
                        <Users size={40} strokeWidth={1}/>
                        <p>Mijozlar yo'q</p>
                    </div>
                ) : (
                    <>
                    <div className="cust-table-wrapper">
                    <div className="table-responsive">
                        <table className="ptable customers-ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th>Ismi</th>
                                <th>Telefon</th>
                                <th>Izoh</th>
                                <th className="th-right">Qarz</th>
                                <th className="th-right">Limit</th>
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
                                            <span style={{color: 'var(--danger)', fontWeight: 600, fontSize: 13}}>
                                                    {fmt(c.totalDebt)}
                                                </span>
                                        ) : (
                                            <span className="cell-muted">—</span>
                                        )}
                                    </td>
                                    <td className="th-right">
                                        {c.debtLimit ? (
                                            <div>
                                                <div style={{
                                                    fontSize: 12, fontWeight: 600,
                                                    color: c.limitExceeded ? '#dc2626' : 'var(--text-secondary)'
                                                }}>
                                                    {fmt(c.debtLimit)}
                                                </div>
                                                <div style={{fontSize: 10, marginTop: 2}}>
                                                    <span style={{
                                                        padding: '1px 5px', borderRadius: 6,
                                                        background: c.debtLimitStrict ? 'rgba(220,38,38,0.1)' : 'rgba(245,158,11,0.1)',
                                                        color: c.debtLimitStrict ? '#dc2626' : '#f59e0b',
                                                        fontWeight: 600
                                                    }}>
                                                        {c.debtLimitStrict ? '🚫 Qat\'iy' : '⚠ Ogohlantirish'}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="cell-muted">—</span>
                                        )}
                                    </td>
                                    <td className="th-center">
                                            <span
                                                className={`status-badge ${c.isActive !== false ? 'status-active' : 'status-inactive'}`}>
                                                {c.isActive !== false ? 'Faol' : 'Noaktiv'}
                                            </span>
                                    </td>
                                    <td>
                                        <div className="action-group">
                                            <div className="desk-actions">
                                                {hasPermission('CUSTOMERS_EDIT') && (
                                                    <button className="act-btn act-edit" title="Tahrirlash"
                                                            onClick={() => openEdit(c)}>
                                                        <Pencil size={14}/>
                                                    </button>
                                                )}
                                                {hasPermission('CUSTOMERS_DEBT_VIEW') && (
                                                    <button
                                                        className="act-btn"
                                                        title={c.totalDebt > 0 ? "Nasiyalarni ko'rish" : "Nasiya yo'q"}
                                                        style={{
                                                            color: c.totalDebt > 0 ? '#dc2626' : 'var(--text-muted)',
                                                            borderColor: 'var(--border-color)'
                                                        }}
                                                        onClick={() => {
                                                            if (c.totalDebt > 0) {
                                                                navigate(`/debts?customerId=${c.id}`)
                                                            } else {
                                                                setNoDebtModal(c.name)
                                                            }
                                                        }}
                                                    >
                                                        {c.totalDebt > 0
                                                            ? <ExternalLink size={14}/>
                                                            : <CreditCard size={14}/>
                                                        }
                                                    </button>
                                                )}
                                            </div>
                                            <div className="mob-actions">
                                                <button className="act-btn act-more" onClick={(e) => {
                                                    if (openMenuId === c.id) { setOpenMenuId(null); setMenuAnchor(null) }
                                                    else { setOpenMenuId(c.id); setMenuAnchor(e.currentTarget) }
                                                }}>
                                                    <MoreVertical size={15}/>
                                                </button>
                                                {openMenuId === c.id && (
                                                    <DropdownPortal anchorEl={menuAnchor} onClose={() => { setOpenMenuId(null); setMenuAnchor(null) }}>
                                                        {hasPermission('CUSTOMERS_EDIT') && (
                                                            <button className="act-btn act-edit" title="Tahrirlash"
                                                                    onClick={() => { openEdit(c); setOpenMenuId(null); setMenuAnchor(null) }}>
                                                                <Pencil size={14}/> Tahrirlash
                                                            </button>
                                                        )}
                                                        {hasPermission('CUSTOMERS_DEBT_VIEW') && (
                                                            <button
                                                                className="act-btn"
                                                                style={{
                                                                    color: c.totalDebt > 0 ? '#dc2626' : 'var(--text-muted)',
                                                                    borderColor: 'var(--border-color)'
                                                                }}
                                                                onClick={() => {
                                                                    setOpenMenuId(null); setMenuAnchor(null)
                                                                    if (c.totalDebt > 0) {
                                                                        navigate(`/debts?customerId=${c.id}`)
                                                                    } else {
                                                                        setNoDebtModal(c.name)
                                                                    }
                                                                }}
                                                            >
                                                                {c.totalDebt > 0 ? <ExternalLink size={14}/> : <CreditCard size={14}/>}
                                                                {c.totalDebt > 0 ? 'Nasiyalar' : "Nasiya yo'q"}
                                                            </button>
                                                        )}
                                                    </DropdownPortal>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    </div>

                    <div className="cust-cards">
                        {customers.map((c) => (
                            <div key={c.id} className="cust-card">
                                <div className="cust-card-top">
                                    <span className="cust-card-name">{c.name}</span>
                                    <span className={`status-badge ${c.isActive !== false ? 'status-active' : 'status-inactive'}`}>
                                        {c.isActive !== false ? 'Faol' : 'Noaktiv'}
                                    </span>
                                </div>
                                <div className="cust-card-phone">{c.phone}</div>
                                {c.totalDebt > 0 && (
                                    <div className="cust-card-debt">Qarz: {fmt(c.totalDebt)}</div>
                                )}
                                {c.debtLimit && (
                                    <div className="cust-card-limit">
                                        Limit: {fmt(c.debtLimit)}
                                        {' '}<span style={{
                                            padding: '1px 5px', borderRadius: 6,
                                            background: c.debtLimitStrict ? 'rgba(220,38,38,0.1)' : 'rgba(245,158,11,0.1)',
                                            color: c.debtLimitStrict ? '#dc2626' : '#f59e0b', fontWeight: 600
                                        }}>
                                            {c.debtLimitStrict ? "Qat'iy" : 'Ogohlantirish'}
                                        </span>
                                    </div>
                                )}
                                <div className="cust-card-actions">
                                    {hasPermission('CUSTOMERS_EDIT') && (
                                        <button className="act-btn act-edit" title="Tahrirlash" onClick={() => openEdit(c)}>
                                            <Pencil size={14} />
                                        </button>
                                    )}
                                    {hasPermission('CUSTOMERS_DEBT_VIEW') && (
                                        <button className="act-btn"
                                                title={c.totalDebt > 0 ? "Nasiyalarni ko'rish" : "Nasiya yo'q"}
                                                style={{ color: c.totalDebt > 0 ? '#dc2626' : 'var(--text-muted)' }}
                                                onClick={() => {
                                                    if (c.totalDebt > 0) navigate(`/debts?customerId=${c.id}`)
                                                    else setNoDebtModal(c.name)
                                                }}>
                                            {c.totalDebt > 0 ? <ExternalLink size={14} /> : <CreditCard size={14} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    </>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box products-modal" style={{maxWidth: 500}}
                         onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <Users size={20}/>
                                <div>
                                    <h6 className="modal-title">{editId ? 'Mijozni tahrirlash' : 'Mijoz qo\'shish'}</h6>
                                    <p className="modal-subtitle">Mijoz ma'lumotlarini kiriting</p>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={16}/>
                            </button>
                        </div>
                        <div className="modal-body">
                            {error && <div className="form-error"><AlertCircle size={16}/>{error}</div>}
                            <div className="form-group" style={{marginBottom: 16}}>
                                <label className="form-label">Ismi <span className="required">*</span></label>
                                <input className="form-input" value={form.name}
                                       onChange={e => setForm(f => ({...f, name: e.target.value}))}
                                       placeholder="Mijoz ismi" autoFocus/>
                            </div>
                            <div className="form-group" style={{marginBottom: 16}}>
                                <label className="form-label">Telefon <span className="required">*</span></label>
                                <input className="form-input" value={form.phone}
                                       onChange={e => setForm(f => ({...f, phone: formatPhone(e.target.value)}))}
                                       placeholder="+998901234567"/>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Izoh</label>
                                <textarea className="form-textarea" rows={2} value={form.notes}
                                          onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                                          placeholder="Ixtiyoriy"/>
                            </div>

                            {/* Qarz limiti bo'limi */}
                            <div style={{
                                marginTop: 16, padding: '14px 16px',
                                background: 'var(--surface-secondary)',
                                borderRadius: 10, border: '1px solid var(--border-color)'
                            }}>
                                <div style={{
                                    fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
                                    textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 12
                                }}>
                                    Qarz limiti
                                </div>
                                <div className="form-group" style={{marginBottom: 12}}>
                                    <label className="form-label">Maksimal nasiya summasi (UZS)</label>
                                    <input className="form-input"
                                           value={form.debtLimit}
                                           onChange={e => setForm(f => ({
                                               ...f,
                                               debtLimit: e.target.value.replace(/[^\d]/g, '')
                                           }))}
                                           placeholder="Bo'sh qoldiring = limit yo'q"/>
                                    {form.debtLimit && (
                                        <div style={{fontSize: 12, color: 'var(--text-muted)', marginTop: 4}}>
                                            Limit: {Number(form.debtLimit).toLocaleString('ru-RU')} UZS
                                        </div>
                                    )}
                                </div>
                                {form.debtLimit && (
                                    <div>
                                        <label className="form-label" style={{marginBottom: 8}}>
                                            Limit turi
                                        </label>
                                        <div style={{display: 'flex', gap: 8}}>
                                            <button
                                                type="button"
                                                onClick={() => setForm(f => ({...f, debtLimitStrict: false}))}
                                                style={{
                                                    flex: 1, padding: '8px 12px', borderRadius: 8,
                                                    border: `2px solid ${!form.debtLimitStrict ? '#f59e0b' : 'var(--border-color)'}`,
                                                    background: !form.debtLimitStrict ? 'rgba(245,158,11,0.08)' : 'var(--surface)',
                                                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                                    color: !form.debtLimitStrict ? '#f59e0b' : 'var(--text-secondary)'
                                                }}>
                                                ⚠ Ogohlantirish
                                                <div style={{fontSize: 11, fontWeight: 400, marginTop: 2}}>
                                                    Kassir ko'radi, sotishi mumkin
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setForm(f => ({...f, debtLimitStrict: true}))}
                                                style={{
                                                    flex: 1, padding: '8px 12px', borderRadius: 8,
                                                    border: `2px solid ${form.debtLimitStrict ? '#dc2626' : 'var(--border-color)'}`,
                                                    background: form.debtLimitStrict ? 'rgba(220,38,38,0.08)' : 'var(--surface)',
                                                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                                    color: form.debtLimitStrict ? '#dc2626' : 'var(--text-secondary)'
                                                }}>
                                                🚫 Qat'iy bloklash
                                                <div style={{fontSize: 11, fontWeight: 400, marginTop: 2}}>
                                                    Nasiya berib bo'lmaydi
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowModal(false)}>Bekor qilish</button>
                            <button className="btn-save" onClick={handleSave} disabled={saving}>
                                {saving ? <><Loader2 size={14} className="spin"/> Saqlanmoqda...</> : 'Saqlash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Nasiya yo'q modal */}
            {noDebtModal && (
                <div className="modal-overlay" onClick={() => setNoDebtModal(null)}>
                    <div className="modal-box" style={{maxWidth: 360, textAlign: 'center'}}
                         onClick={e => e.stopPropagation()}>
                        <div className="modal-body" style={{padding: '32px 28px'}}>
                            <div style={{
                                width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
                                background: 'rgba(22,163,74,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#16a34a', fontSize: 28
                            }}>✓
                            </div>
                            <div style={{fontWeight: 700, fontSize: 16, marginBottom: 6}}>
                                {noDebtModal}
                            </div>
                            <div style={{color: 'var(--text-muted)', fontSize: 14}}>
                                Bu mijozda hozircha nasiya yo'q ✅
                            </div>
                        </div>
                        <div className="modal-footer" style={{justifyContent: 'center'}}>
                            <button className="btn-save" onClick={() => setNoDebtModal(null)}>
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}