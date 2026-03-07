import { useState, useEffect, useCallback } from 'react'
import {
    FolderTree, Plus, ChevronRight, ChevronDown,
    Pencil, Lock, Unlock, Trash2, X, AlertCircle, Loader2, FolderPlus
} from 'lucide-react'
import {
    getCategoryTree, createCategory, updateCategory,
    deleteCategory, toggleCategoryStatus
} from '../api/categories'
import { useAuth } from '../context/AuthContext'
import '../styles/ProductsPage.css'

const EMPTY_FORM = { name: '', description: '', parentId: '' }

function flattenTree(nodes, depth = 0) {
    const result = []
    for (const node of nodes) {
        result.push({ ...node, depth })
        if (node.children?.length && node._expanded) {
            result.push(...flattenTree(node.children, depth + 1))
        }
    }
    return result
}

function toggleExpand(nodes, id) {
    return nodes.map(n => {
        if (n.id === id) return { ...n, _expanded: !n._expanded }
        if (n.children?.length) return { ...n, children: toggleExpand(n.children, id) }
        return n
    })
}

function getAllFlat(nodes) {
    const result = []
    for (const n of nodes) {
        result.push(n)
        if (n.children?.length) result.push(...getAllFlat(n.children))
    }
    return result
}

export default function CategoriesPage() {
    const [tree, setTree] = useState([])
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const load = useCallback(() => {
        setLoading(true)
        getCategoryTree()
            .then(res => {
                const addExpanded = (nodes) => nodes.map(n => ({
                    ...n, _expanded: true,
                    children: n.children ? addExpanded(n.children) : []
                }))
                setTree(addExpanded(res.data || []))
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => { load() }, [load])

    const allFlat = getAllFlat(tree)
    const rows = flattenTree(tree)
    const total = allFlat.length

    const openAdd = (parentId = '') => {
        setEditId(null)
        setForm({ ...EMPTY_FORM, parentId: parentId ? String(parentId) : '' })
        setError('')
        setShowModal(true)
    }
    const { hasPermission } = useAuth()

    const openEdit = (cat) => {
        setEditId(cat.id)
        setForm({
            name: cat.name || '',
            description: cat.description || '',
            parentId: cat.parentId ? String(cat.parentId) : ''
        })
        setError('')
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) { setError('Nomi kiritilishi shart'); return }
        setSaving(true); setError('')
        try {
            const payload = {
                name: form.name,
                description: form.description,
                parentId: form.parentId ? Number(form.parentId) : null
            }
            editId ? await updateCategory(editId, payload) : await createCategory(payload)
            setShowModal(false)
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

    const handleToggle = async (id) => {
        try { await toggleCategoryStatus(id); load() } catch (e) { console.error(e) }
    }

    const handleDelete = async (id) => {
        if (!confirm('Kategoriyani o\'chirishni tasdiqlaysizmi?')) return
        try { await deleteCategory(id); load() } catch (e) {
            alert(e.response?.data?.message || 'Xatolik')
        }
    }

    // Parent options (exclude self and descendants)
    const parentOptions = allFlat.filter(n => n.id !== editId)

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap">
                        <FolderTree size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">
                            Kategoriyalar
                            <span className="page-count">({total} ta)</span>
                        </h1>
                        <p className="page-subtitle">Mahsulot kategoriyalarini boshqarish</p>
                    </div>
                </div>
                {hasPermission('CATEGORIES_CREATE') && (
                    <button className="btn-add" onClick={() => openAdd()}>
                        <Plus size={16} />
                        Kategoriya qo'shish
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="table-card">
                {loading ? (
                    <div className="table-loading">
                        <Loader2 size={28} className="spin" />
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="table-empty">
                        <FolderTree size={40} strokeWidth={1} />
                        <p>Kategoriyalar yo'q</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th>Nomi</th>
                                <th>Tavsif</th>
                                <th className="th-center">Holat</th>
                                <th className="th-center">Amallar</th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.map((cat, i) => (
                                <tr key={cat.id}>
                                    <td className="cell-num">{i + 1}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: cat.depth * 24 }}>
                                            {cat.depth > 0 && (
                                                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>└</span>
                                            )}
                                            {cat.children?.length > 0 && (
                                                <button
                                                    onClick={() => setTree(t => toggleExpand(t, cat.id))}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-secondary)', display: 'flex' }}
                                                >
                                                    {cat._expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                </button>
                                            )}
                                            <span className="cell-name">{cat.name}</span>
                                            {cat.children?.length > 0 && (
                                                <span style={{
                                                    fontSize: 11, fontWeight: 600,
                                                    background: 'var(--primary-light)', color: 'var(--primary)',
                                                    padding: '2px 8px', borderRadius: 20
                                                }}>
                                                        {cat.children.length} ta
                                                    </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="cell-muted">{cat.description || '—'}</td>
                                    <td className="th-center">
                                            <span className={`status-badge ${cat.isActive !== false ? 'status-active' : 'status-inactive'}`}>
                                                {cat.isActive !== false ? 'Faol' : 'Noaktiv'}
                                            </span>
                                    </td>
                                    <td>
                                        <div className="action-group">
                                            {hasPermission('CATEGORIES_EDIT') && (
                                                <button className="act-btn act-edit" title="Tahrirlash" onClick={() => openEdit(cat)}>
                                                    <Pencil size={14} />
                                                </button>
                                            )}
                                            {hasPermission('CATEGORIES_EDIT') && (
                                                <button
                                                    className={`act-btn act-lock`}
                                                    title={cat.isActive !== false ? 'Noaktiv qilish' : 'Faollashtirish'}
                                                    onClick={() => handleToggle(cat.id)}
                                                >
                                                    {cat.isActive !== false ? <Lock size={14} /> : <Unlock size={14} />}
                                                </button>
                                            )}
                                            {hasPermission('CATEGORIES_DELETE') && (
                                                <button className="act-btn act-delete" title="O'chirish" onClick={() => handleDelete(cat.id)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                            {hasPermission('CATEGORIES_CREATE') && (
                                                <button className="act-btn act-edit" title="Pastki kategoriya qo'shish" onClick={() => openAdd(cat.id)}>
                                                    <FolderPlus size={14} />
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
                    <div className="modal-box products-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <FolderTree size={20} />
                                <div>
                                    <h6 className="modal-title">{editId ? 'Kategoriyani tahrirlash' : 'Kategoriya qo\'shish'}</h6>
                                    <p className="modal-subtitle">Kategoriya ma'lumotlarini kiriting</p>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                                <X size={16} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {error && (
                                <div className="form-error">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}
                            <div className="form-row" style={{ marginBottom: 16 }}>
                                <div className="form-group flex-2">
                                    <label className="form-label">Nomi <span className="required">*</span></label>
                                    <input className="form-input" value={form.name}
                                           onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                           placeholder="Kategoriya nomi" autoFocus />
                                </div>
                                <div className="form-group flex-1">
                                    <label className="form-label">Yuqori kategoriya</label>
                                    <select className="form-select" value={form.parentId}
                                            onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}>
                                        <option value="">— Asosiy —</option>
                                        {parentOptions.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {'  '.repeat(0)}{p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tavsif</label>
                                <textarea className="form-textarea" rows={3} value={form.description}
                                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                          placeholder="Ixtiyoriy tavsif" />
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

//

