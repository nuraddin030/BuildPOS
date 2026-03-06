import { useState, useEffect, useCallback } from 'react'
import {
    Handshake, Plus, Pencil, Lock, Unlock, X,
    AlertCircle, Loader2, Search, TrendingUp, Phone
} from 'lucide-react'
import {
    getPartners, createPartner, updatePartner, togglePartnerStatus
} from '../api/partners'
import '../styles/ProductsPage.css'

const EMPTY_FORM = { name: '', phone: '', notes: '' }

const fmt = (v) => v ? new Intl.NumberFormat('uz-UZ').format(v) + ' UZS' : '0 UZS'

export default function PartnersPage() {
    const [partners, setPartners] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')

    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [statsPartner, setStatsPartner] = useState(null)
    const [statsLoading, setStatsLoading] = useState(false)

    const load = useCallback(() => {
        setLoading(true)
        getPartners({ search: search || undefined, size: 100 })
            .then(res => {
                const d = res.data
                setPartners(d.content || d || [])
                setTotal(d.totalElements || (d.content || d || []).length)
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [search])

    useEffect(() => { load() }, [load])

    const openAdd = () => {
        setEditId(null); setForm(EMPTY_FORM); setError(''); setShowModal(true)
    }

    const openEdit = (p) => {
        setEditId(p.id)
        setForm({ name: p.name || '', phone: p.phone || '', notes: p.notes || '' })
        setError(''); setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) { setError('Nomi kiritilishi shart'); return }
        if (!form.phone.trim()) { setError('Telefon kiritilishi shart'); return }
        setSaving(true); setError('')
        try {
            editId ? await updatePartner(editId, form) : await createPartner(form)
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
    }, [showModal, form, editId])

    const handleToggle = async (p) => {
        try { await togglePartnerStatus(p.id); load() }
        catch (e) { alert(e.response?.data?.message || 'Xatolik') }
    }

    const openStats = async (p) => {
        setStatsLoading(true); setStatsPartner(null)
        try {
            const res = await getPartnerById(p.id)
            setStatsPartner(res.data)
        } catch (e) { console.error(e) }
        finally { setStatsLoading(false) }
    }

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap">
                        <Handshake size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">
                            Hamkorlar
                            <span className="page-count">({total} ta)</span>
                        </h1>
                        <p className="page-subtitle">Hamkorlar va statistikani boshqarish</p>
                    </div>
                </div>
                <button className="btn-add" onClick={openAdd}>
                    <Plus size={16} />
                    Hamkor qo'shish
                </button>
            </div>

            {/* Filter */}
            <div className="filter-bar">
                <div className="filter-search-wrap">
                    <Search size={16} className="filter-search-icon" />
                    <input className="filter-search" placeholder="Ism yoki telefon..."
                           value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {/* Table */}
            <div className="table-card">
                {loading ? (
                    <div className="table-loading"><Loader2 size={28} className="spin" /><p>Yuklanmoqda...</p></div>
                ) : partners.length === 0 ? (
                    <div className="table-empty"><Handshake size={40} strokeWidth={1} /><p>Hamkorlar yo'q</p></div>
                ) : (
                    <div className="table-responsive">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th>Nomi</th>
                                <th>Telefon</th>
                                <th className="th-right">Jami sotuv</th>
                                <th className="th-right">Sotuv soni</th>
                                <th className="th-right">Mijozlar</th>
                                <th className="th-center">Holat</th>
                                <th className="th-center">Amallar</th>
                            </tr>
                            </thead>
                            <tbody>
                            {partners.map((p, i) => (
                                <tr key={p.id}>
                                    <td className="cell-num">{i + 1}</td>
                                    <td>
                                        <div className="cell-name">{p.name}</div>
                                        {p.bestMonth && <div className="cell-muted" style={{ fontSize: 12 }}>Eng yaxshi oy: {p.bestMonth}</div>}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Phone size={13} style={{ color: 'var(--text-muted)' }} />
                                            <span className="cell-barcode">{p.phone}</span>
                                        </div>
                                    </td>
                                    <td className="th-right">
                                            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                                {p.totalSaleAmount ? fmt(p.totalSaleAmount) : '—'}
                                            </span>
                                    </td>
                                    <td className="th-right">
                                        {p.totalSaleCount ? (
                                            <span>
                                                    {p.totalSaleCount} ta
                                                {p.debtSaleCount > 0 && <span style={{ color: 'var(--danger)', fontSize: 12, marginLeft: 4 }}>({p.debtSaleCount} nasiya)</span>}
                                                </span>
                                        ) : '—'}
                                    </td>
                                    <td className="th-right">
                                        {p.totalCustomerCount ? `${p.totalCustomerCount} ta` : '—'}
                                    </td>
                                    <td className="th-center">
                                            <span className={`status-badge ${p.isActive ? 'status-active' : 'status-inactive'}`}>
                                                {p.isActive ? 'Faol' : 'Noaktiv'}
                                            </span>
                                    </td>
                                    <td>
                                        <div className="action-group">
                                            <button className="act-btn act-edit" title="Tahrirlash" onClick={() => openEdit(p)}>
                                                <Pencil size={14} />
                                            </button>
                                            <button className="act-btn"
                                                    style={{ color: 'var(--info, #0891b2)' }}
                                                    title="Statistika" onClick={() => openStats(p)}>
                                                <TrendingUp size={14} />
                                            </button>
                                            <button className={`act-btn ${p.isActive ? 'act-lock' : ''}`}
                                                    title={p.isActive ? 'Bloklash' : 'Faollashtirish'}
                                                    onClick={() => handleToggle(p)}>
                                                {p.isActive ? <Lock size={14} /> : <Unlock size={14} />}
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
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <Handshake size={20} />
                                <div>
                                    <h6 className="modal-title">{editId ? 'Hamkorni tahrirlash' : 'Hamkor qo\'shish'}</h6>
                                    <p className="modal-subtitle">Ma'lumotlarni kiriting</p>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label">Nomi <span className="required">*</span></label>
                                <input className="form-input" value={form.name}
                                       onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                       placeholder="Hamkor ismi" autoFocus />
                            </div>
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label">Telefon <span className="required">*</span></label>
                                <input className="form-input" value={form.phone}
                                       onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
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

            {/* Stats Modal */}
            {(statsPartner || statsLoading) && (
                <div className="modal-overlay" onClick={() => setStatsPartner(null)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <TrendingUp size={20} />
                                <div>
                                    <h6 className="modal-title">{statsPartner?.name} — Statistika</h6>
                                    <p className="modal-subtitle">Sotuv ko'rsatkichlari</p>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setStatsPartner(null)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            {statsLoading ? (
                                <div className="table-loading"><Loader2 size={24} className="spin" /></div>
                            ) : statsPartner && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {[
                                        { label: 'Jami sotuv summasi', value: fmt(statsPartner.totalSaleAmount), color: 'var(--primary)' },
                                        { label: "O'rtacha sotuv", value: fmt(statsPartner.avgSaleAmount), color: 'var(--info, #0891b2)' },
                                        { label: 'Jami sotuv soni', value: statsPartner.totalSaleCount ? `${statsPartner.totalSaleCount} ta` : '—' },
                                        { label: 'To\'langan sotuvlar', value: statsPartner.paidSaleCount ? `${statsPartner.paidSaleCount} ta` : '—', color: 'var(--success)' },
                                        { label: 'Nasiya sotuvlar', value: statsPartner.debtSaleCount ? `${statsPartner.debtSaleCount} ta` : '—', color: statsPartner.debtSaleCount > 0 ? 'var(--danger)' : undefined },
                                        { label: 'Olib kelgan mijozlar', value: statsPartner.totalCustomerCount ? `${statsPartner.totalCustomerCount} ta` : '—' },
                                        { label: 'Eng yaxshi oy', value: statsPartner.bestMonth || '—' },
                                        { label: 'Oxirgi sotuv', value: statsPartner.lastSaleAt ? new Date(statsPartner.lastSaleAt).toLocaleDateString('uz-UZ') : '—' },
                                    ].map((item, i) => (
                                        <div key={i} style={{
                                            background: 'var(--surface-2, var(--surface))',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 10, padding: '12px 16px'
                                        }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: item.color || 'var(--text-primary)' }}>{item.value}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}