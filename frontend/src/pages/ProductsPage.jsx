import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
    getProducts, createProduct, updateProduct,
    deleteProduct, toggleProductStatus, getCategories, getUnits
} from '../api/products'
import { uploadImage } from '../api/upload'
import { adjustStock } from '../api/products'
import '../styles/ProductsPage.css'


const fmt = (num) => new Intl.NumberFormat('uz-UZ').format(Math.round(num || 0))

const STATUS_BADGE = {
    ACTIVE: <span className="badge bg-success">Faol</span>,
    INACTIVE: <span className="badge bg-secondary">Noaktiv</span>,
    DELETED: <span className="badge bg-danger">O'chirilgan</span>,
}

const genSKU = () => 'SKU-' + Math.random().toString(36).toUpperCase().slice(2, 8)
const genBarcode = () => '' + Math.floor(1000000000000 + Math.random() * 9000000000000)

const EMPTY_UNIT = {
    unitId: '', isDefault: true, barcode: '',
    costPrice: '', salePrice: '', minPrice: '',
    initialStock: '', warehouseId: ''
}

const EMPTY_FORM = {
    name: '', description: '', sku: '', imageUrl: '',
    categoryId: '', units: [{ ...EMPTY_UNIT }], supplierIds: []
}

export default function ProductsPage() {
    const { t } = useTranslation()
    const fileInputRef = useRef()

    const [products, setProducts] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [size] = useState(20)
    const [search, setSearch] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [loading, setLoading] = useState(false)

    const [categories, setCategories] = useState([])
    const [units, setUnits] = useState([])
    const [warehouses, setWarehouses] = useState([])
    // Tahrirlashda zaxira o'zgarishlari: { [unitId]: { warehouseId, quantity, movementType } }
    const [stockAdjustments, setStockAdjustments] = useState({})

    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [imagePreview, setImagePreview] = useState('')
    const [imageUploading, setImageUploading] = useState(false)

    const load = useCallback(() => {
        setLoading(true)
        getProducts({ search: search || undefined, categoryId: categoryId || undefined, page, size })
            .then(res => { setProducts(res.data.content); setTotal(res.data.totalElements) })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [search, categoryId, page, size])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        getCategories().then(res => setCategories(res.data.content || res.data))
        getUnits().then(res => setUnits(res.data.content || res.data))
        import('../api/products').then(m => m.getWarehouses && m.getWarehouses().then(res => setWarehouses(res.data.content || res.data)).catch(() => {}))
    }, [])

    const openAdd = () => {
        setEditId(null)
        setForm(EMPTY_FORM)
        setImagePreview('')
        setError('')
        setStockAdjustments({})
        setShowModal(true)
    }

    const openEdit = async (p) => {
        setEditId(p.id)
        setError('')
        setStockAdjustments({})
        setShowModal(true)
        try {
            const res = await import('../api/products').then(m => m.getProductById(p.id))
            const full = res.data
            setForm({
                name: full.name || '',
                description: full.description || '',
                sku: full.sku || '',
                imageUrl: full.imageUrl || '',
                categoryId: full.categoryId || '',
                units: (full.units || []).map((u, i) => ({
                    id: u.id,
                    unitId: u.unitId || '',
                    isDefault: u.isDefault || i === 0,
                    barcode: u.barcode || '',
                    costPrice: u.costPrice || '',
                    salePrice: u.salePrice || '',
                    minPrice: u.minPrice || '',
                    warehouseStocks: u.warehouseStocks || [],
                    initialStock: '',
                    warehouseId: ''
                })),
                supplierIds: (full.suppliers || []).map(s => s.supplierId)
            })
            setImagePreview(full.imageUrl || '')
        } catch (err) {
            setError('Mahsulot ma\'lumotlarini yuklashda xatolik')
        }
    }

    // Rasm yuklash
    const handleImageSelect = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        // Preview
        const reader = new FileReader()
        reader.onload = (ev) => setImagePreview(ev.target.result)
        reader.readAsDataURL(file)

        // Serverga yuklash
        setImageUploading(true)
        try {
            const res = await uploadImage(file)
            setForm(f => ({ ...f, imageUrl: res.data.url }))
        } catch (err) {
            setError('Rasmni yuklashda xatolik')
        } finally {
            setImageUploading(false)
        }
    }

    const setUnit = (i, field, val) => {
        setForm(f => {
            const units = [...f.units]
            units[i] = { ...units[i], [field]: val }
            return { ...f, units }
        })
    }

    const addUnit = () => setForm(f => ({ ...f, units: [...f.units, { ...EMPTY_UNIT, isDefault: false }] }))
    const removeUnit = (i) => setForm(f => ({ ...f, units: f.units.filter((_, idx) => idx !== i) }))

    const handleSave = async () => {
        if (!form.name.trim()) { setError("Mahsulot nomi kiritilishi shart"); return }
        if (!form.units[0]?.unitId) { setError("O'lchov birligi tanlanishi shart"); return }

        setSaving(true)
        setError('')
        try {
            const payload = {
                ...form,
                categoryId: form.categoryId || null,
                units: form.units.map((u, i) => ({
                    unitId: Number(u.unitId),
                    isDefault: i === 0,
                    barcode: u.barcode || null,
                    costPrice: Number(u.costPrice) || 0,
                    salePrice: Number(u.salePrice) || 0,
                    minPrice: Number(u.minPrice) || 0,
                    initialStock: u.initialStock ? Number(u.initialStock) : null,
                    warehouseId: u.warehouseId ? Number(u.warehouseId) : null,
                    priceTiers: []
                }))
            }
            if (editId) {
                await updateProduct(editId, payload)
                // Zaxira o'zgarishlarini saqlash
                for (const [unitId, adj] of Object.entries(stockAdjustments)) {
                    if (adj.quantity && Number(adj.quantity) > 0 && adj.warehouseId) {
                        await adjustStock(unitId, {
                            warehouseId: Number(adj.warehouseId),
                            quantity: Number(adj.quantity),
                            movementType: adj.movementType || 'ADJUSTMENT_IN',
                            notes: adj.movementType === 'ADJUSTMENT_OUT' ? 'Chiqim' : 'Kirim'
                        })
                    }
                }
            } else {
                await createProduct(payload)
            }
            setShowModal(false)
            load()
        } catch (err) {
            setError(err.response?.data?.message || t('common.error'))
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm(t('common.confirm_delete'))) return
        await deleteProduct(id)
        load()
    }

    const handleToggle = async (id) => {
        await toggleProductStatus(id)
        load()
    }

    const totalPages = Math.ceil(total / size)

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <h5 className="fw-bold mb-0">{t('products.title')} <span className="text-muted fw-normal fs-6">({total})</span></h5>
                <button className="btn btn-primary btn-sm" onClick={openAdd}>
                    + {t('products.add')}
                </button>
            </div>

            {/* Filter */}
            <div className="filter-card-modern">
                <div className="card-body py-2">
                    <div className="row g-2">
                        <div className="col-md-5">
                            <input type="text" className="form-control form-control-sm"
                                   placeholder={`${t('common.search')}...`}
                                   value={search}
                                   onChange={e => { setSearch(e.target.value); setPage(0) }} />
                        </div>
                        <div className="col-md-4">
                            <select className="form-select form-select-sm" value={categoryId}
                                    onChange={e => { setCategoryId(e.target.value); setPage(0) }}>
                                <option value="">Barcha kategoriyalar</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <button className="btn btn-sm btn-outline-secondary w-100"
                                    onClick={() => { setSearch(''); setCategoryId(''); setPage(0) }}>
                                {t('common.reset')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Jadval */}
            <div className="table-card-modern">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-4">{t('common.loading')}</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                <tr>
                                    <th>#</th>
                                    <th>{t('products.name')}</th>
                                    <th>Rasm</th>
                                    <th>{t('products.category')}</th>
                                    <th>{t('products.barcode')}</th>
                                    <th>{t('products.sale_price')}</th>
                                    <th>{t('products.stock')}</th>
                                    <th>{t('products.status')}</th>
                                    <th>{t('common.actions')}</th>
                                </tr>
                                </thead>
                                <tbody>
                                {products.length === 0 && (
                                    <tr><td colSpan={9} className="text-center text-muted py-4">Ma'lumot yo'q</td></tr>
                                )}
                                {products.map((p, i) => (
                                    <tr key={p.id}>
                                        <td className="text-muted small">{page * size + i + 1}</td>
                                        <td>
                                            <div className="fw-semibold">{p.name}</div>
                                            {p.sku && <div className="text-muted small">{p.sku}</div>}
                                        </td>
                                        <td>
                                            {p.imageUrl
                                                ? <img src={p.imageUrl} alt="" style={{width:36, height:36, objectFit:'cover', borderRadius:6}} />
                                                : <div style={{width:36, height:36, background:'#f0f0f0', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16}}>📦</div>
                                            }
                                        </td>
                                        <td className="text-muted small">{p.categoryName || '—'}</td>
                                        <td className="text-muted small">{p.defaultBarcode || '—'}</td>
                                        <td className="text-end">{fmt(p.defaultSalePrice)}</td>
                                        <td className="text-end">
                        <span className={p.isLowStock ? 'text-danger fw-bold' : ''}>
                          {fmt(p.totalStock)} {p.defaultUnitSymbol}
                        </span>
                                        </td>
                                        <td>{STATUS_BADGE[p.status]}</td>
                                        <td>
                                            <div className="d-flex gap-1">
                                                <button className="action-btn edit" onClick={() => openEdit(p)}>✏️</button>
                                                <button className="btn btn-sm btn-outline-secondary" onClick={() => handleToggle(p.id)}
                                                        title={p.status === 'ACTIVE' ? 'Noaktiv qilish' : 'Faollashtirish'}>
                                                    {p.status === 'ACTIVE' ? '🔒' : '🔓'}
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p.id)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="card-footer d-flex justify-content-between align-items-center">
                        <small className="text-muted">Jami: {total} ta</small>
                        <div className="d-flex gap-1">
                            <button className="btn btn-sm btn-outline-secondary"
                                    disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</button>
                            <span className="btn btn-sm disabled">{page + 1} / {totalPages}</span>
                            <button className="btn btn-sm btn-outline-secondary"
                                    disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{editId ? 'Mahsulotni tahrirlash' : t('products.add')}</h5>
                                <button className="btn-close" onClick={() => setShowModal(false)} />
                            </div>
                            <div className="modal-body">
                                {error && <div className="alert alert-danger py-2">{error}</div>}

                                <div className="row g-3">
                                    {/* Rasm */}
                                    <div className="col-12">
                                        <label className="form-label">Mahsulot rasmi</label>
                                        <div className="d-flex align-items-center gap-3">
                                            {/* Preview */}
                                            <div
                                                style={{width:80, height:80, border:'2px dashed #dee2e6', borderRadius:8,
                                                    display:'flex', alignItems:'center', justifyContent:'center',
                                                    overflow:'hidden', cursor:'pointer', background:'#f8f9fa'}}
                                                onClick={() => fileInputRef.current.click()}
                                            >
                                                {imageUploading
                                                    ? <span className="spinner-border spinner-border-sm text-primary" />
                                                    : imagePreview
                                                        ? <img src={imagePreview} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                                                        : <span style={{fontSize:28}}>📷</span>
                                                }
                                            </div>
                                            <div>
                                                <button className="action-btn edit d-block mb-1"
                                                        onClick={() => fileInputRef.current.click()}
                                                        disabled={imageUploading}>
                                                    {imageUploading ? 'Yuklanmoqda...' : 'Rasm tanlash'}
                                                </button>
                                                <small className="text-muted">JPG, PNG — max 10MB<br/>Avtomatik siqiladi</small>
                                                {form.imageUrl && (
                                                    <button className="btn btn-sm btn-link text-danger p-0 d-block mt-1"
                                                            onClick={() => { setForm(f => ({...f, imageUrl:''})); setImagePreview('') }}>
                                                        Rasmni olib tashlash
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <input ref={fileInputRef} type="file" accept="image/*"
                                               className="d-none" onChange={handleImageSelect} />
                                    </div>

                                    {/* Nomi */}
                                    <div className="col-md-8">
                                        <label className="form-label">{t('products.name')} *</label>
                                        <input className="form-control" value={form.name}
                                               onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                    </div>

                                    {/* SKU */}
                                    <div className="col-md-4">
                                        <label className="form-label">SKU</label>
                                        <div className="input-group">
                                            <input className="form-control" value={form.sku}
                                                   onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                                                   placeholder="Avtomatik" />
                                            <button className="btn btn-outline-secondary btn-sm" type="button"
                                                    onClick={() => setForm(f => ({ ...f, sku: genSKU() }))}
                                                    title="Avtomatik yaratish">⚡</button>
                                        </div>
                                    </div>

                                    {/* Kategoriya */}
                                    <div className="col-md-6">
                                        <label className="form-label">{t('products.category')}</label>
                                        <select className="form-select" value={form.categoryId}
                                                onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                                            <option value="">— Kategoriya —</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>

                                    {/* Tavsif */}
                                    <div className="col-12">
                                        <label className="form-label">Tavsif</label>
                                        <textarea className="form-control" rows={2} value={form.description}
                                                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                                    </div>

                                    {/* O'lchov birliklari */}
                                    <div className="col-12">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <label className="form-label mb-0">O'lchov birliklari *</label>
                                            <button className="action-btn edit" onClick={addUnit}>
                                                + Birlik qo'shish
                                            </button>
                                        </div>
                                        {form.units.map((u, i) => (
                                            <div key={i} className="border rounded p-3 mb-2 bg-light">
                                                <div className="row g-2">
                                                    <div className="col-md-3">
                                                        <label className="form-label small">Birlik *</label>
                                                        <select className="form-select form-select-sm" value={u.unitId}
                                                                onChange={e => setUnit(i, 'unitId', e.target.value)}>
                                                            <option value="">— Tanlang —</option>
                                                            {units.map(un => (
                                                                <option key={un.id} value={un.id}>{un.name} ({un.symbol})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="col-md-3">
                                                        <label className="form-label small">Shtrix kod</label>
                                                        <div className="input-group input-group-sm">
                                                            <input className="form-control" value={u.barcode}
                                                                   onChange={e => setUnit(i, 'barcode', e.target.value)}
                                                                   placeholder="Avtomatik" />
                                                            <button className="btn btn-outline-secondary" type="button"
                                                                    onClick={() => setUnit(i, 'barcode', genBarcode())}
                                                                    title="Avtomatik yaratish">⚡</button>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label small">{t('products.cost_price')}</label>
                                                        <input type="number" className="form-control form-control-sm"
                                                               value={u.costPrice} onChange={e => setUnit(i, 'costPrice', e.target.value)} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label small">{t('products.sale_price')}</label>
                                                        <input type="number" className="form-control form-control-sm"
                                                               value={u.salePrice} onChange={e => setUnit(i, 'salePrice', e.target.value)} />
                                                    </div>
                                                    <div className="col-md-2">
                                                        <label className="form-label small">{t('products.min_price')}</label>
                                                        <input type="number" className="form-control form-control-sm"
                                                               value={u.minPrice} onChange={e => setUnit(i, 'minPrice', e.target.value)} />
                                                    </div>
                                                    <div className="col-12">
                                                        <div className="row g-2 mt-1 pt-2 border-top">
                                                            {!editId ? (
                                                                <>
                                                                    <div className="col-md-3">
                                                                        <label className="form-label small">Boshlang'ich zaxira</label>
                                                                        <input type="number" className="form-control form-control-sm"
                                                                               value={u.initialStock}
                                                                               onChange={e => setUnit(i, 'initialStock', e.target.value)}
                                                                               placeholder="0" min="0" />
                                                                    </div>
                                                                    <div className="col-md-5">
                                                                        <label className="form-label small">Omborxona</label>
                                                                        <select className="form-select form-select-sm"
                                                                                value={u.warehouseId}
                                                                                onChange={e => setUnit(i, 'warehouseId', e.target.value)}>
                                                                            <option value="">— Tanlang —</option>
                                                                            {warehouses.map(w => (
                                                                                <option key={w.id} value={w.id}>{w.name}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="col-12">
                                                                        <label className="form-label small fw-semibold">Zaxira o'zgartirish</label>
                                                                        {u.id && (
                                                                            <div className="row g-2">
                                                                                <div className="col-md-3">
                                                                                    <select className="form-select form-select-sm"
                                                                                            value={stockAdjustments[u.id]?.movementType || 'ADJUSTMENT_IN'}
                                                                                            onChange={e => setStockAdjustments(s => ({...s, [u.id]: {...(s[u.id]||{}), movementType: e.target.value}}))}>
                                                                                        <option value="ADJUSTMENT_IN">+ Kirim</option>
                                                                                        <option value="ADJUSTMENT_OUT">- Chiqim</option>
                                                                                    </select>
                                                                                </div>
                                                                                <div className="col-md-2">
                                                                                    <input type="number" className="form-control form-control-sm"
                                                                                           placeholder="Miqdor" min="0"
                                                                                           value={stockAdjustments[u.id]?.quantity || ''}
                                                                                           onChange={e => setStockAdjustments(s => ({...s, [u.id]: {...(s[u.id]||{}), quantity: e.target.value}}))} />
                                                                                </div>
                                                                                <div className="col-md-4">
                                                                                    <select className="form-select form-select-sm"
                                                                                            value={stockAdjustments[u.id]?.warehouseId || ''}
                                                                                            onChange={e => setStockAdjustments(s => ({...s, [u.id]: {...(s[u.id]||{}), warehouseId: e.target.value}}))}>
                                                                                        <option value="">— Omborxona —</option>
                                                                                        {warehouses.map(w => (
                                                                                            <option key={w.id} value={w.id}>{w.name}</option>
                                                                                        ))}
                                                                                    </select>
                                                                                </div>
                                                                                <div className="col-md-3 d-flex align-items-end">
                                                                                    {u.warehouseStocks && u.warehouseStocks.length > 0 && (
                                                                                        <small className="text-muted">
                                                                                            {u.warehouseStocks.map(ws => (
                                                                                                <span key={ws.warehouseId} className="d-block">
                                                                                                    {ws.warehouseName}: <b>{ws.quantity}</b>
                                                                                                </span>
                                                                                            ))}
                                                                                        </small>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {form.units.length > 1 && (
                                                    <button className="btn btn-sm btn-link text-danger p-0 mt-1"
                                                            onClick={() => removeUnit(i)}>Olib tashlash</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    {t('common.cancel')}
                                </button>
                                <button className="btn btn-primary" onClick={handleSave} disabled={saving || imageUploading}>
                                    {saving ? t('common.loading') : t('common.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}