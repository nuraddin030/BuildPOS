import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
    getProducts, createProduct, updateProduct,
    deleteProduct, toggleProductStatus, getCategories, getUnits, getCategoriesTree
} from '../api/products'
import { uploadImage } from '../api/upload'
import { adjustStock } from '../api/products'
import {
    Package, Plus, Search, Filter, RotateCcw, Pencil, Lock,
    Unlock, Trash2, X, Upload, ImageIcon, ChevronLeft,
    ChevronRight, Zap, AlertCircle, Loader2, Minus, PackagePlus
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import '../styles/ProductsPage.css'

const fmt = (num) => String(Math.round(num || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

// Narx formatlovchi: 25000 -> "25 000", faqat raqam va bo'sh joy
const fmtPrice = (val) => {
    if (val === '' || val === null || val === undefined) return ''
    const num = String(val).replace(/[^\d]/g, '')
    if (!num) return ''
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// Formatlangan qiymatdan sof raqam olish: "25 000" -> "25000"
const parsePrice = (formatted) => {
    if (!formatted) return ''
    return formatted.replace(/\s/g, '')
}

const genSKU = () => 'SKU-' + Math.random().toString(36).toUpperCase().slice(2, 8)
const genBarcode = () => '' + Math.floor(1000000000000 + Math.random() * 9000000000000)

const EMPTY_UNIT = {
    unitId: '', isDefault: true, barcode: '',
    costPrice: '', salePrice: '', minPrice: '',
    currency: 'UZS',
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
    const [exchangeRate, setExchangeRate] = useState(12700)
    const [stockAdjustments, setStockAdjustments] = useState({})

    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState(null)
    const showToast = (msg, type = 'error') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }
    const [imagePreview, setImagePreview] = useState('')
    const [imageUploading, setImageUploading] = useState(false)

    const { hasPermission } = useAuth()

    const load = useCallback(() => {
        setLoading(true)
        getProducts({ search: search || undefined, categoryId: categoryId || undefined, page, size })
            .then(res => { setProducts(res.data.content); setTotal(res.data.totalElements) })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [search, categoryId, page, size])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        getCategoriesTree().then(res => setCategories(res.data.content || res.data))
        getUnits().then(res => setUnits(res.data.content || res.data))
        import('../api/products').then(m => m.getWarehouses && m.getWarehouses().then(res => setWarehouses(res.data.content || res.data)).catch(() => {}))
        import('../api/products').then(m => m.getExchangeRate && m.getExchangeRate().then(res => setExchangeRate(Number(res.data.rate) || 12700)).catch(() => {}))
    }, [])


    const openAdd = () => {
        setEditId(null)
        setForm(EMPTY_FORM)
        setImagePreview('')
        setStockAdjustments({})
        setShowModal(true)
    }

    const openEdit = async (p) => {
        setEditId(p.id)
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
            showToast('Mahsulot ma\'lumotlarini yuklashda xatolik')
        }
    }

    const handleImageSelect = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => setImagePreview(ev.target.result)
        reader.readAsDataURL(file)
        setImageUploading(true)
        try {
            const res = await uploadImage(file)
            setForm(f => ({ ...f, imageUrl: res.data.url }))
        } catch (err) {
            showToast('Rasmni yuklashda xatolik')
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

        if (!form.name.trim()) { showToast("Mahsulot nomi kiritilishi shart"); return }
        if (!form.units[0]?.unitId) { showToast("O'lchov birligi tanlanishi shart"); return }

        for (let i = 0; i < form.units.length; i++) {
            const u = form.units[i]
            const cost = Number(u.costPrice) || 0
            const sale = Number(u.salePrice) || 0
            const min = Number(u.minPrice) || 0
            if (sale < cost) { showToast(`${i + 1}-birlik: Sotuv narxi tannarxdan kam bo'lmasligi kerak`); return }
            if (min < cost) { showToast(`${i + 1}-birlik: Minimal narx tannarxdan kam bo'lmasligi kerak`); return }
            if (min > sale) { showToast(`${i + 1}-birlik: Minimal narx sotuv narxidan katta bo'lmasligi kerak`); return }
        }

        setSaving(true)

        try {
            const payload = {
                ...form,
                categoryId: form.categoryId || null,
                units: form.units.map((u, i) => ({
                    unitId: Number(u.unitId),
                    isDefault: i === 0,
                    barcode: u.barcode || null,
                    costPrice: u.currency === 'USD' ? Math.round((Number(u.costPrice) || 0) * exchangeRate) : (Number(u.costPrice) || 0),
                    salePrice: u.currency === 'USD' ? Math.round((Number(u.salePrice) || 0) * exchangeRate) : (Number(u.salePrice) || 0),
                    minPrice: u.currency === 'USD' ? Math.round((Number(u.minPrice) || 0) * exchangeRate) : (Number(u.minPrice) || 0),
                    costPriceUsd: u.currency === 'USD' ? (Number(u.costPrice) || 0) : null,
                    salePriceUsd: u.currency === 'USD' ? (Number(u.salePrice) || 0) : null,
                    minPriceUsd: u.currency === 'USD' ? (Number(u.minPrice) || 0) : null,
                    exchangeRateAtSave: u.currency === 'USD' ? exchangeRate : null,
                    initialStock: u.initialStock ? Number(u.initialStock) : null,
                    warehouseId: u.warehouseId ? Number(u.warehouseId) : null,
                    priceTiers: []
                }))
            }
            if (editId) {
                await updateProduct(editId, payload)
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
            showToast(err.response?.data?.message || t('common.error'))
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

    const handleDelete = async (id) => {
        if (!window.confirm(t('common.confirm_delete'))) return
        await deleteProduct(id)
        load()
    }

    const handleToggle = async (id) => {
        await toggleProductStatus(id)
        load()
    }
    const renderCategoryOptions = (nodes, depth = 0) =>
        nodes.flatMap(c => [
            <option key={c.id} value={c.id}>
                {'\u00A0'.repeat(depth * 4)}{depth > 0 ? '└ ' : ''}{c.name}
            </option>,
            ...(c.children?.length ? renderCategoryOptions(c.children, depth + 1) : [])
        ])

    const totalPages = Math.ceil(total / size)

    return (
        <>
            <div className="products-wrapper">
                {/* Header */}
                <div className="products-header">
                    <div className="products-header-left">
                        <div className="page-icon-wrap">
                            <Package size={20} />
                        </div>
                        <div>
                            <h1 className="page-title">
                                {t('products.title')}
                                <span className="page-count">({total})</span>
                            </h1>
                            <p className="page-subtitle">Barcha mahsulotlarni boshqaring</p>
                        </div>
                    </div>
                    {hasPermission('PRODUCTS_CREATE') && (
                        <button className="btn-add" onClick={openAdd}>
                            <Plus size={18} />
                            <span>{t('products.add')}</span>
                        </button>
                    )}
                </div>

                {/* Filter */}
                <div className="filter-bar">
                    <div className="filter-search-wrap">
                        <Search size={16} className="filter-search-icon" />
                        <input
                            type="text"
                            className="filter-search"
                            placeholder={`${t('common.search')}...`}
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(0) }}
                        />
                    </div>
                    <div className="filter-select-wrap">
                        <Filter size={14} className="filter-select-icon" />
                        <select
                            className="filter-select"
                            value={categoryId}
                            onChange={e => { setCategoryId(e.target.value); setPage(0) }}
                        >
                            <option value="">Barcha kategoriyalar</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    {(search || categoryId) && (
                        <button className="btn-reset" onClick={() => { setSearch(''); setCategoryId(''); setPage(0) }}>
                            <RotateCcw size={14} />
                            <span>{t('common.reset')}</span>
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="table-card">
                    {loading ? (
                        <div className="table-loading">
                            <Loader2 size={24} className="spin" />
                            <span>{t('common.loading')}</span>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="table-empty">
                            <Package size={40} strokeWidth={1.2} />
                            <p>{"Ma'lumot yo'q"}</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="ptable">
                                <thead>
                                <tr>
                                    <th className="th-num">#</th>
                                    <th>{t('products.name')}</th>
                                    <th>Rasm</th>
                                    <th>{t('products.category')}</th>
                                    <th>{t('products.barcode')}</th>
                                    <th className="th-right">{t('products.sale_price')}</th>
                                    <th className="th-center">{t('products.stock')}</th>
                                    <th className="th-center">{t('products.status')}</th>
                                    <th className="th-center">{t('common.actions')}</th>
                                </tr>
                                </thead>
                                <tbody>
                                {products.map((p, i) => (
                                    <tr key={p.id}>
                                        <td className="cell-num">{page * size + i + 1}</td>
                                        <td>
                                            <span className="cell-name">{p.name}</span>
                                        </td>
                                        <td>
                                            {p.imageUrl ? (
                                                <img src={p.imageUrl} alt="" className="product-thumb" />
                                            ) : (
                                                <div className="product-thumb-empty">
                                                    <Package size={16} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="cell-muted">{p.categoryName || '\u2014'}</td>
                                        <td>
                                            <code className="cell-barcode">{p.defaultBarcode || '\u2014'}</code>
                                        </td>
                                        <td className="th-right">
                                            <span className="cell-price">{fmt(p.defaultSalePrice)}</span>
                                        </td>
                                        <td className="th-center">
                                        <span className={`cell-stock ${p.isLowStock ? 'low-stock' : ''}`}>
                                            {fmt(p.totalStock)} {p.defaultUnitSymbol}
                                        </span>
                                        </td>
                                        <td className="th-center">
                                        <span className={`status-badge status-${(p.status || '').toLowerCase()}`}>
                                            {p.status === 'ACTIVE' ? 'Faol' : p.status === 'INACTIVE' ? 'Noaktiv' : "O'chirilgan"}
                                        </span>
                                        </td>
                                        <td className="th-center">
                                            <div className="action-group">
                                                {hasPermission('PRODUCTS_EDIT') && (
                                                    <button className="act-btn act-edit" onClick={() => openEdit(p)} title="Tahrirlash">
                                                        <Pencil size={15} />
                                                    </button>
                                                )}
                                                {hasPermission('PRODUCTS_EDIT') && (
                                                    <button
                                                        className="act-btn act-lock"
                                                        onClick={() => handleToggle(p.id)}
                                                        title={p.status === 'ACTIVE' ? 'Noaktiv qilish' : 'Faollashtirish'}
                                                    >
                                                        {p.status === 'ACTIVE' ? <Lock size={15} /> : <Unlock size={15} />}
                                                    </button>
                                                )}
                                                {hasPermission('PRODUCTS_DELETE') && (
                                                    <button className="act-btn act-delete" onClick={() => handleDelete(p.id)} title="O'chirish">
                                                        <Trash2 size={15} />
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

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="table-footer">
                            <span className="table-footer-info">Jami: {total} ta</span>
                            <div className="pagination-group">
                                <button
                                    className="page-btn"
                                    disabled={page === 0}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="page-info">{page + 1} / {totalPages}</span>
                                <button
                                    className="page-btn"
                                    disabled={page >= totalPages - 1}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ==================== MODAL ==================== */}
                {showModal && (
                    <div className="modal-overlay">
                        <div className="modal-box modal-lg products-modal" onClick={e => e.stopPropagation()}>
                            {/* Modal header */}
                            <div className="modal-header">
                                <div className="modal-header-left">
                                    <PackagePlus size={20} />
                                    <div>
                                        <h3 className="modal-title">
                                            {editId ? 'Mahsulotni tahrirlash' : t('products.add')}
                                        </h3>
                                        <p className="modal-subtitle">
                                            {editId ? "Ma'lumotlarni o'zgartiring" : "Yangi mahsulot qo'shing"}
                                        </p>
                                    </div>
                                </div>
                                <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal body */}
                            <div className="modal-body">

                                {/* Rasm */}
                                <div className="form-section">
                                    <label className="form-section-label">Mahsulot rasmi</label>
                                    <div className="image-upload-area">
                                        <div
                                            className="image-preview-box"
                                            onClick={() => fileInputRef.current.click()}
                                        >
                                            {imageUploading ? (
                                                <Loader2 size={22} className="spin" />
                                            ) : imagePreview ? (
                                                <img src={imagePreview} alt="" />
                                            ) : (
                                                <ImageIcon size={28} />
                                            )}
                                        </div>
                                        <div className="image-upload-info">
                                            <button
                                                className="btn-upload"
                                                onClick={() => fileInputRef.current.click()}
                                                disabled={imageUploading}
                                            >
                                                <Upload size={14} />
                                                {imageUploading ? 'Yuklanmoqda...' : 'Rasm tanlash'}
                                            </button>
                                            <span className="image-hint">JPG, PNG — max 10MB</span>
                                            {form.imageUrl && (
                                                <button
                                                    className="btn-remove-image"
                                                    onClick={() => { setForm(f => ({...f, imageUrl:''})); setImagePreview('') }}
                                                >
                                                    <Trash2 size={12} />
                                                    Rasmni olib tashlash
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <input ref={fileInputRef} type="file" accept="image/*"
                                           className="hidden-input" onChange={handleImageSelect} />
                                </div>

                                {/* Nom + SKU */}
                                <div className="form-row">
                                    <div className="form-group flex-2">
                                        <label className="form-label">{t('products.name')} *</label>
                                        <input
                                            className="form-input"
                                            value={form.name}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            placeholder="Mahsulot nomi"
                                        />
                                    </div>
                                    <div className="form-group flex-1">
                                        <label className="form-label">SKU</label>
                                        <div className="input-with-btn">
                                            <input
                                                className="form-input"
                                                value={form.sku}
                                                onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                                                placeholder="Avtomatik"
                                            />
                                            <button
                                                className="input-action-btn"
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, sku: genSKU() }))}
                                                title="Avtomatik yaratish"
                                            >
                                                <Zap size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Kategoriya */}
                                <div className="form-group">
                                    <label className="form-label">{t('products.category')}</label>
                                    <select
                                        className="form-input"
                                        value={form.categoryId}
                                        onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                                    >
                                        <option value="">{'\u2014'} Kategoriya {'\u2014'}</option>
                                        {renderCategoryOptions(categories)}
                                    </select>
                                </div>

                                {/* Tavsif */}
                                <div className="form-group">
                                    <label className="form-label">Tavsif</label>
                                    <textarea
                                        className="form-input form-textarea"
                                        rows={2}
                                        value={form.description}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        placeholder="Mahsulot haqida qisqacha..."
                                    />
                                </div>

                                {/* O'lchov birliklari */}
                                <div className="form-section">
                                    <div className="section-header">
                                        <label className="form-section-label">{"O'lchov birliklari *"}</label>
                                        <button className="btn-add-unit" onClick={addUnit}>
                                            <Plus size={14} />
                                            Birlik qo'shish
                                        </button>
                                    </div>

                                    {form.units.map((u, i) => (
                                        <div key={i} className="unit-card">
                                            <div className="unit-card-header">
                                                <span className="unit-badge">{i + 1}-birlik</span>
                                                {form.units.length > 1 && (
                                                    <button className="btn-remove-unit" onClick={() => removeUnit(i)}>
                                                        <Minus size={12} /> Olib tashlash
                                                    </button>
                                                )}
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group flex-1">
                                                    <label className="form-label-sm">Birlik *</label>
                                                    <select className="form-input form-input-sm" value={u.unitId}
                                                            onChange={e => setUnit(i, 'unitId', e.target.value)}>
                                                        <option value="">{'\u2014'} Tanlang {'\u2014'}</option>
                                                        {units.map(un => (
                                                            <option key={un.id} value={un.id}>{un.name} ({un.symbol})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="form-group flex-1">
                                                    <label className="form-label-sm">Shtrix kod</label>
                                                    <div className="input-with-btn">
                                                        <input className="form-input form-input-sm" value={u.barcode}
                                                               onChange={e => setUnit(i, 'barcode', e.target.value)}
                                                               placeholder="Avtomatik" />
                                                        <button className="input-action-btn" type="button"
                                                                onClick={() => setUnit(i, 'barcode', genBarcode())}
                                                                title="Avtomatik yaratish">
                                                            <Zap size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Narxlar */}
                                            <div className="form-row form-row-4">
                                                <div className="form-group">
                                                    <label className="form-label-sm">Valyuta</label>
                                                    <select className="form-input form-input-sm"
                                                            value={u.currency || 'UZS'}
                                                            onChange={e => setUnit(i, 'currency', e.target.value)}>
                                                        <option value="UZS">{"UZS (so'm)"}</option>
                                                        <option value="USD">USD ($)</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label-sm">
                                                        {t('products.cost_price')}
                                                        {u.currency === 'USD' && u.costPrice && (
                                                            <span className="usd-hint">{'\u2248'}{fmt(u.costPrice * exchangeRate)}</span>
                                                        )}
                                                    </label>
                                                    <div className="input-with-prefix">
                                                        <span className="input-prefix">{u.currency || 'UZS'}</span>
                                                        <input type="text" inputMode="numeric" className="form-input form-input-sm"
                                                               value={fmtPrice(u.costPrice)}
                                                               onChange={e => setUnit(i, 'costPrice', parsePrice(e.target.value))} />
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label-sm">
                                                        {t('products.sale_price')}
                                                        {u.currency === 'USD' && u.salePrice && (
                                                            <span className="usd-hint">{'\u2248'}{fmt(u.salePrice * exchangeRate)}</span>
                                                        )}
                                                    </label>
                                                    <div className="input-with-prefix">
                                                        <span className="input-prefix">{u.currency || 'UZS'}</span>
                                                        <input type="text" inputMode="numeric" className="form-input form-input-sm"
                                                               value={fmtPrice(u.salePrice)}
                                                               onChange={e => setUnit(i, 'salePrice', parsePrice(e.target.value))} />
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label-sm">
                                                        {t('products.min_price')}
                                                        {u.currency === 'USD' && u.minPrice && (
                                                            <span className="usd-hint">{'\u2248'}{fmt(u.minPrice * exchangeRate)}</span>
                                                        )}
                                                    </label>
                                                    <div className="input-with-prefix">
                                                        <span className="input-prefix">{u.currency || 'UZS'}</span>
                                                        <input type="text" inputMode="numeric" className="form-input form-input-sm"
                                                               value={fmtPrice(u.minPrice)}
                                                               onChange={e => setUnit(i, 'minPrice', parsePrice(e.target.value))} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Zaxira */}
                                            <div className="unit-stock-section">
                                                {!editId ? (
                                                    <div className="form-row">
                                                        <div className="form-group flex-1">
                                                            <label className="form-label-sm">{"Boshlang'ich zaxira"}</label>
                                                            <input type="number" className="form-input form-input-sm"
                                                                   value={u.initialStock}
                                                                   onChange={e => setUnit(i, 'initialStock', e.target.value)}
                                                                   placeholder="0" min="0" />
                                                        </div>
                                                        <div className="form-group flex-2">
                                                            <label className="form-label-sm">Omborxona</label>
                                                            <select className="form-input form-input-sm"
                                                                    value={u.warehouseId}
                                                                    onChange={e => setUnit(i, 'warehouseId', e.target.value)}>
                                                                <option value="">{'\u2014'} Tanlang {'\u2014'}</option>
                                                                {warehouses.map(w => (
                                                                    <option key={w.id} value={w.id}>{w.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                ) : u.id && (
                                                    <div className="stock-adjust-area">
                                                        <label className="form-label-sm stock-adjust-label">{"Zaxira o'zgartirish"}</label>
                                                        <div className="form-row form-row-3">
                                                            <div className="form-group">
                                                                <select className="form-input form-input-sm"
                                                                        value={stockAdjustments[u.id]?.movementType || 'ADJUSTMENT_IN'}
                                                                        onChange={e => setStockAdjustments(s => ({...s, [u.id]: {...(s[u.id]||{}), movementType: e.target.value}}))}>
                                                                    <option value="ADJUSTMENT_IN">+ Kirim</option>
                                                                    <option value="ADJUSTMENT_OUT">- Chiqim</option>
                                                                </select>
                                                            </div>
                                                            <div className="form-group">
                                                                <input type="number" className="form-input form-input-sm"
                                                                       placeholder="Miqdor" min="0"
                                                                       value={stockAdjustments[u.id]?.quantity || ''}
                                                                       onChange={e => setStockAdjustments(s => ({...s, [u.id]: {...(s[u.id]||{}), quantity: e.target.value}}))} />
                                                            </div>
                                                            <div className="form-group">
                                                                <select className="form-input form-input-sm"
                                                                        value={stockAdjustments[u.id]?.warehouseId || ''}
                                                                        onChange={e => setStockAdjustments(s => ({...s, [u.id]: {...(s[u.id]||{}), warehouseId: e.target.value}}))}>
                                                                    <option value="">{'\u2014'} Omborxona {'\u2014'}</option>
                                                                    {warehouses.map(w => (
                                                                        <option key={w.id} value={w.id}>{w.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        {u.warehouseStocks && u.warehouseStocks.length > 0 && (
                                                            <div className="stock-current-info">
                                                                {u.warehouseStocks.map(ws => (
                                                                    <span key={ws.warehouseId} className="stock-badge">
                                                                    {ws.warehouseName}: <strong>{ws.quantity}</strong>
                                                                </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Modal footer */}
                            <div className="modal-footer">
                                <button className="btn-cancel" onClick={() => setShowModal(false)}>
                                    {t('common.cancel')}
                                </button>
                                <button className="btn-save" onClick={handleSave} disabled={saving || imageUploading}>
                                    {saving ? (
                                        <><Loader2 size={16} className="spin" /> {t('common.loading')}</>
                                    ) : t('common.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 99999,
                    background: toast.type === 'error' ? '#ef4444' : '#22c55e',
                    color: '#fff', padding: '12px 20px', borderRadius: 10,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)', fontSize: 14,
                    fontWeight: 500, maxWidth: 360, lineHeight: 1.4,
                    animation: 'fadeInRight 0.25s ease'
                }}>
                    {toast.type === 'error' ? '⚠ ' : '✓ '}{toast.msg}
                </div>
            )}
        </>
    )
}