import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ShoppingCart, ArrowLeft, Plus, Trash2, Search, X,
    Loader2, AlertCircle, Package, Truck, DollarSign,
    Save, Building2, CheckCircle, Edit2
} from 'lucide-react'
import { createPurchase } from '../api/purchases'
import { getProducts, getProductById, getWarehouses, getExchangeRate, getUnits, getCategories, createProduct } from '../api/products'
import { getSuppliers, createSupplier } from '../api/suppliers'
import '../styles/ProductsPage.css'

const fmt = (num) => num == null ? '0' : String(Math.round(Number(num))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const fmtPrice = (val) => {
    if (val === '' || val === null || val === undefined) return ''
    const num = String(val).replace(/[^\d]/g, '')
    if (!num) return ''
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const EMPTY_FORM = {
    productUnitId: null, productName: '', unitSymbol: '', availableUnits: [],
    quantity: '', unitPrice: '', currency: 'UZS',
    exchangeRate: '', salePrice: '', minPrice: '', updatePrices: false,
}
const EMPTY_SUPPLIER = { name: '', phone: '', inn: '' }
const EMPTY_PRODUCT = { name: '', categoryId: '', unitId: '', barcode: '', purchasePrice: '', salePrice: '', minPrice: '' }

export default function PurchaseNewPage() {
    const navigate = useNavigate()

    const [supplierId, setSupplierId] = useState('')
    const [warehouseId, setWarehouseId] = useState('')
    const [notes, setNotes] = useState('')
    const [exchangeRate, setExchangeRate] = useState(12700)

    // ── Tasdiqlangan ro'yxat ──
    const [items, setItems] = useState([])

    // ── Hozirgi forma ──
    const [form, setForm] = useState({ ...EMPTY_FORM })
    const [formError, setFormError] = useState('')
    const [editingIdx, setEditingIdx] = useState(null) // null = yangi, N = tahrir

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [suppliers, setSuppliers] = useState([])
    const [warehouses, setWarehouses] = useState([])
    const [units, setUnits] = useState([])
    const [categories, setCategories] = useState([])

    const [productSearch, setProductSearch] = useState('')
    const [productResults, setProductResults] = useState([])
    const [productSearching, setProductSearching] = useState(false)
    const searchTimeout = useRef(null)

    const [showSupplierDrawer, setShowSupplierDrawer] = useState(false)
    const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER)
    const [supplierSaving, setSupplierSaving] = useState(false)
    const [supplierError, setSupplierError] = useState('')

    const [showProductModal, setShowProductModal] = useState(false)
    const [productForm, setProductForm] = useState(EMPTY_PRODUCT)
    const [productSaving, setProductSaving] = useState(false)
    const [productError, setProductError] = useState('')

    useEffect(() => {
        getSuppliers({ size: 100 }).then(r => setSuppliers(r.data.content || r.data || []))
        getWarehouses().then(r => {
            const list = r.data.content || r.data || []
            setWarehouses(list)
            const def = list.find(w => w.isDefault)
            if (def) setWarehouseId(String(def.id))
        })
        getExchangeRate().then(r => setExchangeRate(Number(r.data?.rate) || 12700)).catch(() => {})
        getUnits().then(r => setUnits(r.data.content || r.data || [])).catch(() => {})
        getCategories().then(r => setCategories(r.data.content || r.data || [])).catch(() => {})
    }, [])

    const searchProduct = (val) => {
        setProductSearch(val)
        clearTimeout(searchTimeout.current)
        if (!val.trim()) { setProductResults([]); return }
        searchTimeout.current = setTimeout(async () => {
            setProductSearching(true)
            try {
                const res = await getProducts({ search: val, size: 10, sort: 'name,asc' })
                setProductResults(res.data.content || [])
            } catch {}
            finally { setProductSearching(false) }
        }, 350)
    }

    const selectProduct = async (product) => {
        try {
            const res = await getProductById(product.id)
            const full = res.data
            const units = full.units || []
            const unit = units.find(u => u.isBaseUnit) || units[0]
            setForm(prev => ({
                ...prev,
                productUnitId: unit?.id || null,
                productName: full.name,
                unitSymbol: unit?.unitSymbol || unit?.symbol || '',
                availableUnits: units,
                salePrice: unit?.salePrice ? String(unit.salePrice) : '',
                minPrice: unit?.minPrice ? String(unit.minPrice) : '',
            }))
        } catch {}
        setProductSearch('')
        setProductResults([])
    }

    const selectUnit = (unit) => {
        setForm(prev => ({
            ...prev,
            productUnitId: unit.id,
            unitSymbol: unit.unitSymbol || unit.symbol || '',
            salePrice: unit.salePrice ? String(unit.salePrice) : '',
            minPrice: unit.minPrice ? String(unit.minPrice) : '',
        }))
    }

    const getItemTotalUsd = (item) =>
        item.currency === 'USD' ? (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0) : 0
    const getItemTotalUzs = (item) => {
        if (!item.unitPrice) return 0
        const p = Number(item.unitPrice)
        const uzs = item.currency === 'USD' ? p * (Number(item.exchangeRate) || Number(exchangeRate)) : p
        return uzs * (Number(item.quantity) || 0)
    }
    // Chap panel uchun yig'indi
    const grandTotalUsd = items.filter(i => i.currency === 'USD')
        .reduce((sum, i) => sum + getItemTotalUsd(i), 0)
    const grandTotalUzs = items.filter(i => i.currency !== 'USD')
        .reduce((sum, i) => sum + getItemTotalUzs(i), 0)

    // ── Ro'yxatga qo'shish ──
    const handleAddToList = () => {
        setFormError('')
        if (!form.productUnitId) { setFormError("Mahsulot tanlanishi shart"); return }
        if (!form.quantity || Number(form.quantity) <= 0) { setFormError("Miqdor kiritilishi shart"); return }
        if (!form.unitPrice || Number(form.unitPrice) <= 0) { setFormError("Tannarx kiritilishi shart"); return }
        // BUG FIX: form.exchangeRate bo'sh bo'lsa global kursni ishlatamiz
        const effectiveExchangeRate = form.currency === 'USD'
            ? (Number(form.exchangeRate) || Number(exchangeRate))
            : undefined

        const newItem = { ...form, exchangeRate: effectiveExchangeRate, _id: editingIdx !== null ? items[editingIdx]._id : Date.now() }

        if (editingIdx !== null) {
            setItems(prev => prev.map((item, i) => i === editingIdx ? newItem : item))
            setEditingIdx(null)
        } else {
            setItems(prev => [...prev, newItem])
        }
        setForm({ ...EMPTY_FORM })
        setProductSearch('')
    }

    const handleEditItem = (idx) => {
        setForm({ ...items[idx] })
        setEditingIdx(idx)
        setFormError('')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleCancelEdit = () => {
        setForm({ ...EMPTY_FORM })
        setEditingIdx(null)
        setFormError('')
    }

    const handleRemoveItem = (idx) => {
        if (editingIdx === idx) { setForm({ ...EMPTY_FORM }); setEditingIdx(null) }
        setItems(prev => prev.filter((_, i) => i !== idx))
    }

    const handleSave = async () => {
        if (!supplierId) { setError("Yetkazuvchi tanlanishi shart"); return }
        if (!warehouseId) { setError("Ombor tanlanishi shart"); return }
        if (items.length === 0) { setError("Kamida bitta mahsulot kerak"); return }
        setSaving(true); setError('')
        try {
            const data = {
                supplierId: Number(supplierId),
                warehouseId: Number(warehouseId),
                notes,
                items: items.map(item => ({
                    productUnitId: item.productUnitId,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    currency: item.currency,
                    exchangeRate: item.currency === 'USD' ? (Number(item.exchangeRate) || Number(exchangeRate)) : undefined,
                    updatePrices: item.updatePrices,
                    salePrice: item.updatePrices && item.salePrice ? Number(item.salePrice) : undefined,
                    minPrice: item.updatePrices && item.minPrice ? Number(item.minPrice) : undefined,
                }))
            }
            const res = await createPurchase(data)
            navigate(`/purchases/${res.data.id}`)
        } catch (e) {
            setError(e.response?.data?.message || 'Xatolik yuz berdi')
        } finally { setSaving(false) }
    }

    const handleCreateSupplier = async () => {
        if (!supplierForm.name.trim()) { setSupplierError("Nomi kiritilishi shart"); return }
        setSupplierSaving(true); setSupplierError('')
        try {
            const res = await createSupplier(supplierForm)
            setSuppliers(prev => [...prev, res.data])
            setSupplierId(String(res.data.id))
            setShowSupplierDrawer(false)
            setSupplierForm(EMPTY_SUPPLIER)
        } catch (e) {
            setSupplierError(e.response?.data?.message || 'Xatolik')
        } finally { setSupplierSaving(false) }
    }

    const handleCreateProduct = async () => {
        if (!productForm.name.trim()) { setProductError('Nomi kiritilishi shart'); return }
        if (!productForm.unitId) { setProductError('Birlik tanlanishi shart'); return }
        setProductSaving(true); setProductError('')
        try {
            const res = await createProduct({
                name: productForm.name.trim(),
                categoryId: productForm.categoryId ? Number(productForm.categoryId) : null,
                barcode: productForm.barcode || null,
                units: [{
                    unitId: Number(productForm.unitId), isDefault: true,
                    purchasePrice: productForm.purchasePrice ? Number(productForm.purchasePrice) : 0,
                    salePrice: productForm.salePrice ? Number(productForm.salePrice) : 0,
                    minPrice: productForm.minPrice ? Number(productForm.minPrice) : 0,
                }]
            })
            await selectProduct(res.data)
            if (productForm.salePrice) setForm(f => ({ ...f, salePrice: productForm.salePrice, minPrice: productForm.minPrice || '' }))
            setShowProductModal(false)
            setProductForm(EMPTY_PRODUCT)
        } catch (e) {
            setProductError(e.response?.data?.message || 'Xatolik yuz berdi')
        } finally { setProductSaving(false) }
    }

    const isEditing = editingIdx !== null
    // currentTotal preview da to'g'ridan hisoblanadi (getItemTotalUsd/Uzs)

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <button className="act-btn" onClick={() => navigate('/purchases')} style={{ marginRight: 8 }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div className="page-icon-wrap"><ShoppingCart size={22} /></div>
                    <div>
                        <h1 className="page-title">Yangi xarid</h1>
                        <p className="page-subtitle">Partiya kiritish</p>
                    </div>
                </div>
                <button
                    className="btn-add"
                    onClick={handleSave}
                    disabled={saving || items.length === 0}
                    style={{ opacity: items.length === 0 ? 0.45 : 1 }}
                >
                    {saving
                        ? <><Loader2 size={15} className="spin" /> Saqlanmoqda...</>
                        : <><Save size={15} /> Partiyani saqlash{items.length > 0 ? ` (${items.length} ta)` : ''}</>
                    }
                </button>
            </div>

            {error && <div className="form-error" style={{ marginBottom: 12 }}><AlertCircle size={16} />{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>

                {/* ── CHAP PANEL ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="table-card" style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Truck size={15} /> Yetkazuvchi
                            </span>
                            <button style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                    onClick={() => setShowSupplierDrawer(true)}>+ Yangi</button>
                        </div>
                        <select className="form-select" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                            <option value="">— Tanlang —</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="table-card" style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Building2 size={15} /> Ombor
                        </div>
                        <select className="form-select" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                            <option value="">— Tanlang —</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>

                    <div className="table-card" style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <DollarSign size={15} /> Dollar kursi
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input className="form-input" type="text" inputMode="numeric" style={{ flex: 1 }}
                                   value={fmtPrice(exchangeRate)}
                                   onChange={e => setExchangeRate(e.target.value.replace(/\s/g, ''))} />
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>UZS</span>
                        </div>
                    </div>

                    <div className="table-card" style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Izoh</div>
                        <textarea className="form-input" rows={3} value={notes}
                                  onChange={e => setNotes(e.target.value)} placeholder="Ixtiyoriy..." style={{ resize: 'vertical' }} />
                    </div>

                    <div className="table-card" style={{ padding: '16px 20px', background: 'var(--primary)', color: '#fff' }}>
                        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>Jami summa</div>
                        {grandTotalUsd > 0 && (
                            <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(grandTotalUsd)} USD</div>
                        )}
                        {grandTotalUzs > 0 && (
                            <div style={{ fontSize: grandTotalUsd > 0 ? 16 : 22, fontWeight: 800, opacity: grandTotalUsd > 0 ? 0.9 : 1 }}>
                                {fmt(grandTotalUzs)} UZS
                            </div>
                        )}
                        {grandTotalUsd === 0 && grandTotalUzs === 0 && (
                            <div style={{ fontSize: 22, fontWeight: 800 }}>0 UZS</div>
                        )}
                        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                            {items.length === 0 ? 'Mahsulotlar qo\'shilmagan' : `${items.length} ta mahsulot`}
                        </div>
                    </div>
                </div>

                {/* ── O'NG PANEL ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* ─── 1-QADAM: MAHSULOT FORMA ─── */}
                    <div className="table-card" style={{
                        padding: '20px',
                        borderColor: isEditing ? 'var(--primary)' : 'var(--border-color)',
                        borderWidth: isEditing ? 2 : 1.5,
                        borderStyle: 'solid',
                        borderRadius: 12,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: isEditing ? 'var(--primary)' : 'inherit' }}>
                                {isEditing
                                    ? <><Edit2 size={15} /> Tahrirlash: {form.productName}</>
                                    : <><Plus size={15} /> Mahsulot qo'shish</>
                                }
                            </span>
                            {isEditing && (
                                <button className="act-btn" onClick={handleCancelEdit} title="Bekor qilish">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {formError && <div className="form-error" style={{ marginBottom: 12 }}><AlertCircle size={15} />{formError}</div>}

                        {/* Mahsulot tanlash */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                                Mahsulot <span className="required">*</span>
                            </label>
                            {form.productUnitId ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{
                                            flex: 1, padding: '9px 14px', borderRadius: 8, fontSize: 14,
                                            background: 'var(--primary-light, rgba(37,99,235,0.08))',
                                            color: 'var(--primary)', fontWeight: 600,
                                            display: 'flex', alignItems: 'center', gap: 8
                                        }}>
                                            <CheckCircle size={15} />
                                            {form.productName}
                                        </span>
                                        <button className="act-btn" onClick={() => setForm(f => ({ ...f, productUnitId: null, productName: '', unitSymbol: '', availableUnits: [] }))}>
                                            <X size={13} />
                                        </button>
                                    </div>
                                    {form.availableUnits.length > 1 && (
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {form.availableUnits.map(u => (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    onClick={() => selectUnit(u)}
                                                    style={{
                                                        padding: '5px 14px', borderRadius: 20, fontSize: 13,
                                                        border: `1.5px solid ${form.productUnitId === u.id ? 'var(--primary)' : 'var(--border)'}`,
                                                        background: form.productUnitId === u.id ? 'var(--primary)' : 'var(--surface)',
                                                        color: form.productUnitId === u.id ? '#fff' : 'var(--text)',
                                                        cursor: 'pointer', fontWeight: form.productUnitId === u.id ? 600 : 400,
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    {u.unitName || u.unitSymbol}
                                                    {u.isBaseUnit && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.75 }}>(asosiy)</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
                                    <input
                                        className="form-input"
                                        style={{ paddingLeft: 32 }}
                                        placeholder="Nom yoki shtrix-kod bilan qidiring..."
                                        value={productSearch}
                                        onChange={e => searchProduct(e.target.value)}
                                        autoFocus={!isEditing}
                                    />
                                    {productSearching && <Loader2 size={13} className="spin" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }} />}
                                    {(productResults.length > 0 || (productSearch && !productSearching)) && (
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                                            background: 'var(--surface)', border: '1px solid var(--border-color)',
                                            borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.13)', maxHeight: 220, overflowY: 'auto'
                                        }}>
                                            {productResults.map(p => (
                                                <div key={p.id}
                                                     style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13 }}
                                                     onMouseDown={e => { e.preventDefault(); selectProduct(p) }}
                                                     className="dropdown-hover"
                                                >
                                                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                        {p.units?.map(u => u.unitSymbol || u.symbol).join(', ')}
                                                    </div>
                                                </div>
                                            ))}
                                            {productResults.length === 0 && productSearch && !productSearching && (
                                                <div style={{ padding: '10px 14px' }}>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                                                        «{productSearch}» topilmadi
                                                    </div>
                                                    <button className="btn-add"
                                                            style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}
                                                            onMouseDown={e => {
                                                                e.preventDefault()
                                                                setProductForm({ ...EMPTY_PRODUCT, name: productSearch })
                                                                setProductError('')
                                                                setShowProductModal(true)
                                                            }}>
                                                        <Plus size={13} /> Yangi mahsulot yaratish
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Miqdor + Tannarx + Valyuta */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px', gap: 10, marginBottom: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                                    Miqdor {form.unitSymbol && `(${form.unitSymbol})`} <span className="required">*</span>
                                </label>
                                <input className="form-input" type="text" inputMode="numeric"
                                       value={fmtPrice(form.quantity)}
                                       onChange={e => setForm(f => ({ ...f, quantity: e.target.value.replace(/\s/g, '') }))}
                                       placeholder="0" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                                    Tannarx ({form.currency}) <span className="required">*</span>
                                </label>
                                <input className="form-input" type="text" inputMode="numeric"
                                       value={fmtPrice(form.unitPrice)}
                                       onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value.replace(/\s/g, '') }))}
                                       placeholder="0" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Valyuta</label>
                                <select className="form-select" value={form.currency}
                                        onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                                    <option value="UZS">UZS</option>
                                    <option value="USD">USD</option>
                                </select>
                            </div>
                        </div>

                        {/* Kurs chap paneldagi Dollar kursi dan olinadi — bu yerda kiritish shart emas */}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                                    Sotuv narxi <span style={{fontSize:11,background:'rgba(16,185,129,0.12)',color:'#10b981',borderRadius:4,padding:'1px 5px',fontWeight:600}}>UZS</span>
                                </label>
                                <input className="form-input" type="text" inputMode="numeric"
                                       value={fmtPrice(form.salePrice)}
                                       onChange={e => setForm(f => ({ ...f, salePrice: e.target.value.replace(/\s/g, '') }))}
                                       placeholder="0" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                                    Minimal narx <span style={{fontSize:11,background:'rgba(16,185,129,0.12)',color:'#10b981',borderRadius:4,padding:'1px 5px',fontWeight:600}}>UZS</span>
                                </label>
                                <input className="form-input" type="text" inputMode="numeric"
                                       value={fmtPrice(form.minPrice)}
                                       onChange={e => setForm(f => ({ ...f, minPrice: e.target.value.replace(/\s/g, '') }))}
                                       placeholder="0" />
                            </div>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 14 }}>
                            <input type="checkbox" checked={form.updatePrices}
                                   onChange={e => setForm(f => ({ ...f, updatePrices: e.target.checked }))} />
                            <span style={{ color: 'var(--text-secondary)' }}>Mahsulot kartasidagi narxlarni yangilash</span>
                        </label>

                        {/* Joriy preview */}
                        {form.quantity && form.unitPrice && (
                            <div style={{
                                padding: '8px 12px', borderRadius: 8, marginBottom: 14,
                                background: 'var(--primary-light, rgba(37,99,235,0.07))',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {form.quantity} × {form.unitPrice} {form.currency}
                                </span>
                                {form.currency === 'USD' ? (
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: '#3b82f6' }}>
                                            = {fmt(Number(form.unitPrice) * Number(form.quantity))} USD
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            ≈ {fmt(Number(form.unitPrice) * Number(form.quantity) * Number(exchangeRate))} UZS
                                        </div>
                                    </div>
                                ) : (
                                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                        = {fmt(Number(form.unitPrice) * Number(form.quantity))} UZS
                                    </span>
                                )}
                            </div>
                        )}

                        {/* ✅ Ro'yxatga qo'shish / saqlash */}
                        <button
                            className="btn-add"
                            style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14 }}
                            onClick={handleAddToList}
                        >
                            {isEditing
                                ? <><CheckCircle size={15} /> O'zgarishlarni saqlash</>
                                : <><Plus size={15} /> Ro'yxatga qo'shish</>
                            }
                        </button>
                    </div>

                    {/* ─── 2-QADAM: QO'SHILGAN RO'YXAT ─── */}
                    {items.length > 0 ? (
                        <div className="table-card" style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CheckCircle size={15} style={{ color: '#10b981' }} />
                                    Qo'shilgan mahsulotlar
                                </span>
                                <span style={{
                                    fontSize: 12, fontWeight: 700, background: '#10b981',
                                    color: '#fff', borderRadius: 20, padding: '1px 8px'
                                }}>{items.length}</span>
                            </div>
                            <div className="table-responsive">
                                <table className="ptable">
                                    <thead>
                                    <tr>
                                        <th className="th-num">#</th>
                                        <th>Mahsulot</th>
                                        <th className="th-right">Miqdor</th>
                                        <th className="th-right">Narx</th>
                                        <th className="th-center">Val.</th>
                                        <th className="th-right">Jami</th>
                                        <th className="th-center">Narx ✓</th>
                                        <th></th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={item._id} style={{
                                            background: editingIdx === idx ? 'rgba(37,99,235,0.04)' : undefined,
                                            outline: editingIdx === idx ? '2px solid var(--primary)' : undefined,
                                        }}>
                                            <td className="cell-num">{idx + 1}</td>
                                            <td>
                                                <div className="cell-name">{item.productName}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.unitSymbol}</div>
                                            </td>
                                            <td className="th-right">{fmt(item.quantity)}</td>
                                            <td className="th-right">
                                                {fmt(item.unitPrice)}
                                                {item.currency === 'USD' && (
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                        ×{fmt(item.exchangeRate || exchangeRate)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="th-center">
                                                <span style={{
                                                    fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 8,
                                                    color: item.currency === 'USD' ? '#3b82f6' : 'var(--text-muted)',
                                                    background: item.currency === 'USD' ? 'rgba(59,130,246,0.1)' : 'var(--surface-2)'
                                                }}>{item.currency}</span>
                                            </td>
                                            <td className="th-right" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                                {item.currency === 'USD'
                                                    ? <>{fmt(getItemTotalUsd(item))} <span style={{fontSize:11}}>USD</span></>
                                                    : <>{fmt(getItemTotalUzs(item))} <span style={{fontSize:11}}>UZS</span></>
                                                }
                                            </td>
                                            <td className="th-center">
                                                {item.updatePrices
                                                    ? <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>✓</span>
                                                    : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                                                }
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                                    <button className="act-btn" onClick={() => handleEditItem(idx)} title="Tahrirlash">
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button className="act-btn act-delete" onClick={() => handleRemoveItem(idx)} title="O'chirish">
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                    <tfoot>
                                    {grandTotalUsd > 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-muted)', padding: '8px 8px 2px', fontWeight: 600 }}>
                                                USD jami:
                                            </td>
                                            <td className="th-right" style={{ fontSize: 15, fontWeight: 800, color: '#3b82f6', padding: '8px 8px 2px' }}>
                                                {fmt(grandTotalUsd)} USD
                                            </td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    )}
                                    {grandTotalUzs > 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-muted)', padding: '2px 8px 4px', fontWeight: 600 }}>
                                                UZS jami:
                                            </td>
                                            <td className="th-right" style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)', padding: '2px 8px 4px' }}>
                                                {fmt(grandTotalUzs)} UZS
                                            </td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    )}
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            padding: '36px 20px', textAlign: 'center',
                            border: '1.5px dashed var(--border-color)', borderRadius: 12,
                            color: 'var(--text-muted)', fontSize: 13
                        }}>
                            <Package size={36} strokeWidth={1} style={{ marginBottom: 10, opacity: 0.35 }} />
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>Hali mahsulot qo'shilmagan</div>
                            <div style={{ fontSize: 12 }}>Yuqoridagi forma orqali mahsulot tanlang va «Ro'yxatga qo'shish» tugmasini bosing</div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Supplier Drawer ── */}
            {showSupplierDrawer && (
                <div className="modal-overlay" onClick={() => setShowSupplierDrawer(false)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left"><Truck size={20} /><div><h6 className="modal-title">Yangi yetkazuvchi</h6></div></div>
                            <button className="modal-close-btn" onClick={() => setShowSupplierDrawer(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            {supplierError && <div className="form-error"><AlertCircle size={16} />{supplierError}</div>}
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="form-label">Nomi <span className="required">*</span></label>
                                <input className="form-input" value={supplierForm.name} autoFocus
                                       onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div className="form-row">
                                <div className="form-group flex-1">
                                    <label className="form-label">Telefon</label>
                                    <input className="form-input" value={supplierForm.phone}
                                           onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} />
                                </div>
                                <div className="form-group flex-1">
                                    <label className="form-label">INN</label>
                                    <input className="form-input" value={supplierForm.inn}
                                           onChange={e => setSupplierForm(f => ({ ...f, inn: e.target.value }))} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowSupplierDrawer(false)}>Bekor</button>
                            <button className="btn-save" onClick={handleCreateSupplier} disabled={supplierSaving}>
                                {supplierSaving ? <><Loader2 size={14} className="spin" />Saqlanmoqda...</> : 'Saqlash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Yangi mahsulot modal ── */}
            {showProductModal && (
                <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <Package size={20} />
                                <div><h6 className="modal-title">Yangi mahsulot</h6><p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Tez yaratish</p></div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowProductModal(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            {productError && <div className="form-error"><AlertCircle size={16} />{productError}</div>}
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="form-label">Nomi <span className="required">*</span></label>
                                <input className="form-input" value={productForm.name} autoFocus
                                       onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} placeholder="Mahsulot nomi" />
                            </div>
                            <div className="form-row" style={{ gap: 12, marginBottom: 14 }}>
                                <div className="form-group flex-1">
                                    <label className="form-label">Birlik <span className="required">*</span></label>
                                    <select className="form-select" value={productForm.unitId}
                                            onChange={e => setProductForm(f => ({ ...f, unitId: e.target.value }))}>
                                        <option value="">— Tanlang —</option>
                                        {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                                    </select>
                                </div>
                                <div className="form-group flex-1">
                                    <label className="form-label">Kategoriya</label>
                                    <select className="form-select" value={productForm.categoryId}
                                            onChange={e => setProductForm(f => ({ ...f, categoryId: e.target.value }))}>
                                        <option value="">— Ixtiyoriy —</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="form-label">Shtrix-kod</label>
                                <input className="form-input" value={productForm.barcode}
                                       onChange={e => setProductForm(f => ({ ...f, barcode: e.target.value }))} placeholder="Ixtiyoriy" />
                            </div>
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>NARXLAR</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                    {[['purchasePrice', 'Tannarx'], ['salePrice', 'Sotuv narxi'], ['minPrice', 'Minimal narx']].map(([key, label]) => (
                                        <div key={key}>
                                            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{label} (UZS)</label>
                                            <input className="form-input" type="text" inputMode="numeric"
                                                   value={fmtPrice(productForm[key])}
                                                   onChange={e => setProductForm(f => ({ ...f, [key]: e.target.value.replace(/\s/g, '') }))}
                                                   placeholder="0" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowProductModal(false)}>Bekor</button>
                            <button className="btn-save" onClick={handleCreateProduct} disabled={productSaving}>
                                {productSaving ? <><Loader2 size={14} className="spin" />Saqlanmoqda...</> : 'Yaratish va qo\'shish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}