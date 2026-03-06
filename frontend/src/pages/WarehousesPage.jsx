import { useState, useEffect, useCallback } from 'react'
import { Warehouse, Plus, Pencil, Lock, Unlock, Trash2, X, AlertCircle, Loader2, Search, Star } from 'lucide-react'
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse, toggleWarehouseStatus, setDefaultWarehouse } from '../api/warehouses'
import '../styles/ProductsPage.css'

const EMPTY_FORM = { name: '', address: '' }

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const load = useCallback(() => {
        setLoading(true)
        getWarehouses()
            .then(res => setWarehouses(res.data.content || res.data || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => { load() }, [load])

    const filtered = warehouses.filter(w =>
        w.name?.toLowerCase().includes(search.toLowerCase()) ||
        w.address?.toLowerCase().includes(search.toLowerCase())
    )

    const openAdd = () => {
        setEditId(null); setForm(EMPTY_FORM); setError(''); setShowModal(true)
    }

    const openEdit = (w) => {
        setEditId(w.id)
        setForm({ name: w.name || '', address: w.address || '' })
        setError(''); setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) { setError("Nomi kiritilishi shart"); return }
        setSaving(true); setError('')
        try {
            editId ? await updateWarehouse(editId, form) : await createWarehouse(form)
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

    const handleToggle = async (w) => {
        try { await toggleWarehouseStatus(w.id); load() } catch (e) {
            alert(e.response?.data?.message || 'Xatolik')
        }
    }

    const handleSetDefault = async (id) => {
        try { await setDefaultWarehouse(id); load() } catch (e) {
            alert(e.response?.data?.message || 'Xatolik')
        }
    }

    const handleDelete = async (w) => {
        if (w.isDefault) return
        if (!confirm('Omborni o\'chirishni tasdiqlaysizmi?')) return
        try { await deleteWarehouse(w.id); load() } catch (e) {
            alert(e.response?.data?.message || 'Xatolik')
        }
    }

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap">
                        <Warehouse size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">
                            Omborlar
                            <span className="page-count">({filtered.length}/{warehouses.length} ta)</span>
                        </h1>
                        <p className="page-subtitle">Ombor va filiallarni boshqarish</p>
                    </div>
                </div>
                <button className="btn-add" onClick={openAdd}>
                    <Plus size={16} />
                    Ombor qo'shish
                </button>
            </div>

            {/* Filter */}
            <div className="filter-bar">
                <div className="filter-search-wrap">
                    <Search size={16} className="filter-search-icon" />
                    <input className="filter-search" placeholder="Nomi yoki manzil..." value={search}
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
                ) : filtered.length === 0 ? (
                    <div className="table-empty">
                        <Warehouse size={40} strokeWidth={1} />
                        <p>Omborlar yo'q</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th>Nomi</th>
                                <th>Manzil</th>
                                <th className="th-center">Default</th>
                                <th className="th-center">Holat</th>
                                <th className="th-center">Amallar</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((w, i) => (
                                <tr key={w.id}>
                                    <td className="cell-num">{i + 1}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className="cell-name">{w.name}</span>
                                            {w.isDefault && (
                                                <span style={{
                                                    fontSize: 11, fontWeight: 700,
                                                    background: '#fef9c3', color: '#854d0e',
                                                    padding: '2px 8px', borderRadius: 20,
                                                    display: 'flex', alignItems: 'center', gap: 3
                                                }}>
                                                        <Star size={10} fill="#854d0e" /> Default
                                                    </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="cell-muted">{w.address || '—'}</td>
                                    <td className="th-center">
                                        {!w.isDefault ? (
                                            <button
                                                onClick={() => handleSetDefault(w.id)}
                                                style={{
                                                    fontSize: 12, fontWeight: 600,
                                                    background: 'var(--surface-secondary)', border: '1px solid var(--border-color)',
                                                    borderRadius: 8, padding: '4px 12px', cursor: 'pointer',
                                                    color: 'var(--text-secondary)', transition: 'all 0.15s'
                                                }}
                                            >
                                                Default qilish
                                            </button>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                                        )}
                                    </td>
                                    <td className="th-center">
                                            <span className={`status-badge ${w.isActive !== false ? 'status-active' : 'status-inactive'}`}>
                                                {w.isActive !== false ? 'Faol' : 'Noaktiv'}
                                            </span>
                                    </td>
                                    <td>
                                        <div className="action-group">
                                            <button className="act-btn act-edit" title="Tahrirlash" onClick={() => openEdit(w)}>
                                                <Pencil size={14} />
                                            </button>
                                            <button className="act-btn act-lock"
                                                    title={w.isActive !== false ? 'Noaktiv qilish' : 'Faollashtirish'}
                                                    onClick={() => handleToggle(w)}>
                                                {w.isActive !== false ? <Lock size={14} /> : <Unlock size={14} />}
                                            </button>
                                            {!w.isDefault && (
                                                <button className="act-btn act-delete" title="O'chirish" onClick={() => handleDelete(w)}>
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

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box products-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <Warehouse size={20} />
                                <div>
                                    <h6 className="modal-title">{editId ? 'Omborni tahrirlash' : 'Ombor qo\'shish'}</h6>
                                    <p className="modal-subtitle">Ombor ma'lumotlarini kiriting</p>
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
                                       placeholder="Asosiy ombor" autoFocus />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Manzil</label>
                                <input className="form-input" value={form.address}
                                       onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                       placeholder="Toshkent, Chilonzor..." />
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
        </div>
    )
}