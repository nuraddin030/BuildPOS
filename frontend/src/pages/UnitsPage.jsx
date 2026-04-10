import { useState, useEffect, useCallback } from 'react'
import { Ruler, Plus, Pencil, Lock, Unlock, Trash2, X, AlertCircle, Loader2, Search, MoreVertical } from 'lucide-react'
import { getUnits, createUnit, updateUnit, deleteUnit, toggleUnitStatus } from '../api/Units'
import '../styles/ProductsPage.css'
import '../styles/UnitsPage.css'
import { useAuth } from '../context/AuthContext'
import DropdownPortal from '../components/DropdownPortal'

const EMPTY_FORM = { name: '', symbol: '' }

export default function UnitsPage() {
    const [units, setUnits] = useState([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [openMenuId, setOpenMenuId] = useState(null)
    const [menuAnchor, setMenuAnchor] = useState(null)

    const load = useCallback(() => {
        setLoading(true)
        getUnits()
            .then(res => setUnits(res.data.content || res.data || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => { load() }, [load])

    const filtered = units.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.symbol?.toLowerCase().includes(search.toLowerCase())
    )

    const { hasPermission } = useAuth()

    const openAdd = () => {
        setEditId(null); setForm(EMPTY_FORM); setError(''); setShowModal(true)
    }

    const openEdit = (u) => {
        setEditId(u.id)
        setForm({ name: u.name || '', symbol: u.symbol || '' })
        setError(''); setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) { setError("Nomi kiritilishi shart"); return }
        if (!form.symbol.trim()) { setError("Belgisi kiritilishi shart"); return }
        setSaving(true); setError('')
        try {
            editId ? await updateUnit(editId, form) : await createUnit(form)
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

    const handleToggle = async (id) => {
        try { await toggleUnitStatus(id); load() } catch (e) { console.error(e) }
    }

    const handleDelete = async (id) => {
        if (!confirm('O\'lchov birligini o\'chirishni tasdiqlaysizmi?')) return
        try { await deleteUnit(id); load() } catch (e) {
            alert(e.response?.data?.message || 'Xatolik')
        }
    }

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap">
                        <Ruler size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">
                            O'lchov birliklari
                            <span className="page-count">({filtered.length}/{units.length} ta)</span>
                        </h1>
                        <p className="page-subtitle">Mahsulot o'lchov birliklarini boshqarish</p>
                    </div>
                </div>
                {hasPermission('UNITS_CREATE') && (
                    <button className="btn-add" onClick={openAdd}>
                        <Plus size={16} />
                        O'lchov qo'shish
                    </button>
                )}
            </div>

            {/* Filter */}
            <div className="filter-bar">
                <div className="filter-search-wrap">
                    <Search size={16} className="filter-search-icon" />
                    <input className="filter-search" placeholder="Nomi yoki belgisi..." value={search}
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
                        <Ruler size={40} strokeWidth={1} />
                        <p>O'lchov birliklari yo'q</p>
                    </div>
                ) : (
                    <>
                    <div className="unit-table-wrapper">
                    <div className="table-responsive">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th>Nomi</th>
                                <th>Belgisi</th>
                                <th className="th-center">Holat</th>
                                <th className="th-center">Amallar</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((u, i) => (
                                <tr key={u.id}>
                                    <td className="cell-num">{i + 1}</td>
                                    <td className="cell-name">{u.name}</td>
                                    <td>
                                        <span className="cell-barcode">{u.symbol}</span>
                                    </td>
                                    <td className="th-center">
                                            <span className={`status-badge ${u.isActive !== false ? 'status-active' : 'status-inactive'}`}>
                                                {u.isActive !== false ? 'Faol' : 'Noaktiv'}
                                            </span>
                                    </td>
                                    <td>
                                        <div className="action-group">
                                            <div className="desk-actions">
                                                {hasPermission('UNITS_EDIT') && (
                                                    <button className="act-btn act-edit" title="Tahrirlash" onClick={() => openEdit(u)}>
                                                        <Pencil size={14} />
                                                    </button>
                                                )}
                                                {hasPermission('UNITS_EDIT') && (
                                                    <button className="act-btn act-lock" title={u.isActive !== false ? 'Noaktiv' : 'Faollashtirish'}
                                                            onClick={() => handleToggle(u.id)}>
                                                        {u.isActive !== false ? <Lock size={14} /> : <Unlock size={14} />}
                                                    </button>
                                                )}
                                                {hasPermission('UNITS_DELETE') && (
                                                    <button className="act-btn act-delete" title="O'chirish" onClick={() => handleDelete(u.id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="mob-actions">
                                                <button className="act-btn act-more" onClick={(e) => {
                                                    if (openMenuId === u.id) { setOpenMenuId(null); setMenuAnchor(null) }
                                                    else { setOpenMenuId(u.id); setMenuAnchor(e.currentTarget) }
                                                }}>
                                                    <MoreVertical size={15} />
                                                </button>
                                                {openMenuId === u.id && (
                                                    <DropdownPortal anchorEl={menuAnchor} onClose={() => { setOpenMenuId(null); setMenuAnchor(null) }}>
                                                        {hasPermission('UNITS_EDIT') && (
                                                            <button className="act-btn act-edit" onClick={() => { openEdit(u); setOpenMenuId(null); setMenuAnchor(null) }}>
                                                                <Pencil size={14} /> Tahrirlash
                                                            </button>
                                                        )}
                                                        {hasPermission('UNITS_EDIT') && (
                                                            <button className="act-btn act-lock" onClick={() => { handleToggle(u.id); setOpenMenuId(null); setMenuAnchor(null) }}>
                                                                {u.isActive !== false ? <Lock size={14} /> : <Unlock size={14} />}
                                                                {u.isActive !== false ? 'Noaktiv' : 'Faollashtirish'}
                                                            </button>
                                                        )}
                                                        {hasPermission('UNITS_DELETE') && (
                                                            <button className="act-btn act-delete" onClick={() => { handleDelete(u.id); setOpenMenuId(null); setMenuAnchor(null) }}>
                                                                <Trash2 size={14} /> O'chirish
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

                    <div className="unit-cards">
                        {filtered.map((u) => (
                            <div key={u.id} className="unit-card">
                                <div className="unit-card-top">
                                    <span className="unit-card-name">{u.name}</span>
                                    <span className={`status-badge ${u.isActive !== false ? 'status-active' : 'status-inactive'}`}>
                                        {u.isActive !== false ? 'Faol' : 'Noaktiv'}
                                    </span>
                                </div>
                                <div className="unit-card-symbol">
                                    Belgi: <strong>{u.symbol}</strong>
                                </div>
                                <div className="unit-card-actions">
                                    {hasPermission('UNITS_EDIT') && (
                                        <button className="act-btn act-edit" title="Tahrirlash" onClick={() => openEdit(u)}>
                                            <Pencil size={14} />
                                        </button>
                                    )}
                                    {hasPermission('UNITS_EDIT') && (
                                        <button className="act-btn act-lock" title={u.isActive !== false ? 'Noaktiv' : 'Faollashtirish'} onClick={() => handleToggle(u.id)}>
                                            {u.isActive !== false ? <Lock size={14} /> : <Unlock size={14} />}
                                        </button>
                                    )}
                                    {hasPermission('UNITS_DELETE') && (
                                        <button className="act-btn act-delete" title="O'chirish" onClick={() => handleDelete(u.id)}>
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    </>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <Ruler size={20} />
                                <div>
                                    <h6 className="modal-title">{editId ? 'O\'lchov birligini tahrirlash' : 'O\'lchov birligi qo\'shish'}</h6>
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
                                           placeholder="Kilogram" autoFocus />
                                </div>
                                <div className="form-group flex-1">
                                    <label className="form-label">Belgisi <span className="required">*</span></label>
                                    <input className="form-input" value={form.symbol}
                                           onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
                                           placeholder="kg" />
                                </div>
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