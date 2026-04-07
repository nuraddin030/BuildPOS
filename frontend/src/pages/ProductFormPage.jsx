import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    getProductById, createProduct, updateProduct,
    getCategories, getUnits, getCategoriesTree, adjustStock,
    getWarehouses, getExchangeRate
} from '../api/products'
import { uploadImage } from '../api/upload'
import {
    PackagePlus, ArrowLeft, Plus, Minus, Upload, ImageIcon,
    Wand2, Shuffle, ScanLine, Loader2, Trash2, Save, AlertCircle
} from 'lucide-react'
import CameraScanner from '../components/CameraScanner'
import { useAuth } from '../context/AuthContext'
import '../styles/ProductsPage.css'

const fmt = (num) => String(Math.round(num || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const fmtPrice = (val) => {
    if (val === '' || val === null || val === undefined) return ''
    const num = String(val).replace(/[^\d]/g, '')
    if (!num) return ''
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const parsePrice = (formatted) => {
    if (!formatted) return ''
    return formatted.replace(/\s/g, '')
}

const genSKU = () => 'SKU-' + Math.random().toString(36).toUpperCase().slice(2, 8)
const genBarcode = () => '' + Math.floor(1000000000000 + Math.random() * 9000000000000)

const EMPTY_UNIT = {
    unitId: '', isDefault: true, barcode: '',
    costPrice: '', salePrice: '', minPrice: '',
    currency: 'UZS', minStock: '',
    initialStock: '', warehouseId: '',
    isBaseUnit: false, conversionFactor: ''
}

const EMPTY_FORM = {
    name: '', description: '', sku: '', imageUrl: '',
    categoryId: '', units: [{ ...EMPTY_UNIT, isBaseUnit: true }], supplierIds: []
}

export default function ProductFormPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)
    const fileInputRef = useRef()
    const { hasPermission } = useAuth()

    const [form, setForm] = useState(EMPTY_FORM)
    const [categories, setCategories] = useState([])
    const [units, setUnits] = useState([])
    const [warehouses, setWarehouses] = useState([])
    const [exchangeRate, setExchangeRate] = useState(12700)
    const [stockAdjustments, setStockAdjustments] = useState({})
    const [imagePreview, setImagePreview] = useState('')
    const [imageUploading, setImageUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(isEdit)
    const [toast, setToast] = useState(null)
    const [cameraUnitIdx, setCameraUnitIdx] = useState(null)

    const showToast = (msg, type = 'error') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    useEffect(() => {
        getCategoriesTree()
            .then(res => {
                const d = res.data
                const list = Array.isArray(d) ? d : Array.isArray(d?.content) ? d.content : []
                if (list.length > 0) {
                    setCategories(list)
                } else {
                    // tree bo'sh bo'lsa flat list bilan urinib ko'r
                    return getCategories().then(r => setCategories(r.data?.content || r.data || []))
                }
            })
            .catch(() =>
                getCategories().then(r => setCategories(r.data?.content || r.data || [])).catch(() => {})
            )
        getUnits().then(res => setUnits(res.data.content || res.data))
        getWarehouses().then(res => setWarehouses(res.data.content || res.data)).catch(() => {})
        getExchangeRate().then(res => setExchangeRate(Number(res.data.rate) || 12700)).catch(() => {})
    }, [])

    useEffect(() => {
        if (!isEdit) return
        setLoading(true)
        getProductById(id)
            .then(res => {
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
                        currency: u.costPriceUsd != null ? 'USD' : 'UZS',
                        costPrice: u.costPriceUsd != null ? (u.costPriceUsd || '') : (u.costPrice || ''),
                        salePrice: u.salePrice || '',
                        minPrice: u.minPrice || '',
                        warehouseStocks: u.warehouseStocks || [],
                        minStock: u.warehouseStocks?.find(ws => ws.minStock > 0)?.minStock
                            ?? u.warehouseStocks?.[0]?.minStock ?? '',
                        isBaseUnit: u.isBaseUnit ?? false,
                        conversionFactor: u.isBaseUnit ? '' : (u.conversionFactor && Number(u.conversionFactor) !== 0 ? (1 / Number(u.conversionFactor)) : ''),
                        initialStock: '',
                        warehouseId: ''
                    })),
                    supplierIds: (full.suppliers || []).map(s => s.supplierId)
                })
                setImagePreview(full.imageUrl || '')
            })
            .catch(() => showToast("Mahsulot ma'lumotlarini yuklashda xatolik"))
            .finally(() => setLoading(false))
    }, [id, isEdit])

    const setUnit = (i, field, val) => {
        setForm(f => {
            const units = [...f.units]
            units[i] = { ...units[i], [field]: val }
            return { ...f, units }
        })
    }

    const addUnit = () => setForm(f => ({ ...f, units: [...f.units, { ...EMPTY_UNIT, isDefault: false }] }))
    const removeUnit = (i) => setForm(f => ({ ...f, units: f.units.filter((_, idx) => idx !== i) }))

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
        } catch {
            showToast('Rasmni yuklashda xatolik')
        } finally {
            setImageUploading(false)
        }
    }

    const handleSave = useCallback(async () => {
        if (!form.name.trim()) { showToast("Mahsulot nomi kiritilishi shart"); return }
        if (!form.units[0]?.unitId) { showToast("O'lchov birligi tanlanishi shart"); return }

        for (let i = 0; i < form.units.length; i++) {
            const u = form.units[i]
            const cost = Number(parsePrice(String(u.costPrice))) || 0
            const sale = Number(parsePrice(String(u.salePrice))) || 0
            const min = Number(parsePrice(String(u.minPrice))) || 0
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
                    id: u.id || null,
                    unitId: Number(u.unitId),
                    isDefault: i === 0,
                    barcode: u.barcode || null,
                    costPrice: u.currency === 'USD'
                        ? Math.round((Number(parsePrice(String(u.costPrice))) || 0) * exchangeRate)
                        : (Number(parsePrice(String(u.costPrice))) || 0),
                    salePrice: Number(parsePrice(String(u.salePrice))) || 0,
                    minPrice: Number(parsePrice(String(u.minPrice))) || 0,
                    costPriceUsd: u.currency === 'USD' ? (Number(parsePrice(String(u.costPrice))) || 0) : null,
                    salePriceUsd: u.currency === 'USD' ? (Number(parsePrice(String(u.salePrice))) || 0) : null,
                    minPriceUsd: u.currency === 'USD' ? (Number(parsePrice(String(u.minPrice))) || 0) : null,
                    exchangeRateAtSave: u.currency === 'USD' ? exchangeRate : null,
                    initialStock: u.initialStock ? Number(u.initialStock) : null,
                    warehouseId: u.warehouseId ? Number(u.warehouseId) : null,
                    minStock: u.minStock !== '' ? Number(u.minStock) : null,
                    isBaseUnit: u.isBaseUnit === true,
                    conversionFactor: u.isBaseUnit ? 1 : (u.conversionFactor !== '' && Number(u.conversionFactor) > 0 ? (1 / Number(u.conversionFactor)) : 1),
                    priceTiers: []
                }))
            }

            if (isEdit) {
                await updateProduct(id, payload)
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
            navigate('/products')
        } catch (err) {
            showToast(err.response?.data?.message || t('common.error'))
        } finally {
            setSaving(false)
        }
    }, [form, exchangeRate, stockAdjustments, isEdit, id, navigate, t])

    const renderCategoryOptions = (nodes, depth = 0) =>
        (Array.isArray(nodes) ? nodes : []).flatMap(c => [
            <option key={c.id} value={c.id}>
                {'\u00A0'.repeat(depth * 4)}{depth > 0 ? '└ ' : ''}{c.name}
            </option>,
            ...(c.children?.length ? renderCategoryOptions(c.children, depth + 1) : [])
        ])

    if (loading) {
        return (
            <div className="products-wrapper">
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <Loader2 size={28} className="spin" />
                </div>
            </div>
        )
    }

    return (
        <>
            {cameraUnitIdx !== null && (
                <CameraScanner
                    onDetected={(code) => {
                        setUnit(cameraUnitIdx, 'barcode', code)
                        setCameraUnitIdx(null)
                    }}
                    onClose={() => setCameraUnitIdx(null)}
                />
            )}

            <div className="products-wrapper">
                {/* Header */}
                <div className="products-header">
                    <div className="products-header-left">
                        <button className="act-btn" onClick={() => navigate('/products')} style={{ marginRight: 8 }}>
                            <ArrowLeft size={18} />
                        </button>
                        <div className="page-icon-wrap"><PackagePlus size={20} /></div>
                        <div>
                            <h1 className="page-title">
                                {isEdit ? 'Mahsulotni tahrirlash' : t('products.add')}
                            </h1>
                            <p className="page-subtitle">
                                {isEdit ? "Ma'lumotlarni o'zgartiring" : "Yangi mahsulot qo'shing"}
                            </p>
                        </div>
                    </div>
                    <button className="btn-add" onClick={handleSave} disabled={saving || imageUploading}>
                        {saving
                            ? <><Loader2 size={15} className="spin" /> Saqlanmoqda...</>
                            : <><Save size={15} /> {t('common.save')}</>
                        }
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* Karta 1: Asosiy ma'lumot */}
                    <div className="table-card" style={{ padding: '20px 24px' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Asosiy ma'lumot
                        </div>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                            {/* Rasm — kichik thumbnail */}
                            <div style={{ flexShrink: 0 }}>
                                <div
                                    onClick={() => fileInputRef.current.click()}
                                    style={{
                                        width: 88, height: 88,
                                        border: '2px dashed var(--border)',
                                        borderRadius: 10,
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', overflow: 'hidden',
                                        background: 'var(--surface-secondary)',
                                        gap: 4, color: 'var(--text-muted)',
                                        transition: 'border-color 0.15s'
                                    }}
                                >
                                    {imageUploading ? (
                                        <Loader2 size={20} className="spin" />
                                    ) : imagePreview ? (
                                        <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <>
                                            <ImageIcon size={22} />
                                            <span style={{ fontSize: 10 }}>Rasm</span>
                                        </>
                                    )}
                                </div>
                                {form.imageUrl && (
                                    <button
                                        onClick={() => { setForm(f => ({ ...f, imageUrl: '' })); setImagePreview('') }}
                                        style={{ marginTop: 4, width: '100%', fontSize: 11, color: 'var(--danger, #ef4444)', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        O'chirish
                                    </button>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*"
                                       className="hidden-input" onChange={handleImageSelect} />
                            </div>

                            {/* Nom, SKU, Kategoriya, Tavsif */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div className="form-group" style={{ flex: 2, margin: 0 }}>
                                        <label className="form-label-sm">{t('products.name')} *</label>
                                        <input className="form-input form-input-sm"
                                               value={form.name}
                                               onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                               placeholder="Mahsulot nomi"
                                               autoFocus />
                                    </div>
                                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                        <label className="form-label-sm">SKU</label>
                                        <div className="input-with-btn">
                                            <input className="form-input form-input-sm"
                                                   value={form.sku}
                                                   onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                                                   placeholder="Avtomatik" />
                                            <button className="input-action-btn" type="button"
                                                    onClick={() => setForm(f => ({ ...f, sku: genSKU() }))}
                                                    title="Avtomatik yaratish">
                                                <Wand2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                        <label className="form-label-sm">{t('products.category')}</label>
                                        <select className="form-input form-input-sm"
                                                value={form.categoryId}
                                                onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                                            <option value="">{'\u2014'} Tanlang {'\u2014'}</option>
                                            {renderCategoryOptions(categories)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label-sm">Tavsif <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(ixtiyoriy)</span></label>
                                    <textarea className="form-input form-input-sm form-textarea"
                                              rows={2}
                                              value={form.description}
                                              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                              placeholder="Mahsulot haqida qisqacha..." />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Karta 2+: O'lchov birliklari */}
                    {form.units.map((u, i) => (
                        <div key={i} className="table-card" style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {form.units.length > 1 ? `${i + 1}-birlik` : "O'lchov birligi va narxlar"}
                                </span>
                                {form.units.length > 1 && (
                                    <button className="btn-remove-unit" onClick={() => removeUnit(i)}>
                                        <Minus size={12} /> Olib tashlash
                                    </button>
                                )}
                            </div>

                            {/* Birlik + Barcode */}
                            <div className="form-row" style={{ marginBottom: 12 }}>
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
                                                onClick={() => setCameraUnitIdx(i)} title="Kamera bilan skanerlash">
                                            <ScanLine size={14} strokeWidth={2} />
                                        </button>
                                        <button className="input-action-btn" type="button"
                                                onClick={() => setUnit(i, 'barcode', genBarcode())} title="Avtomatik generatsiya">
                                            <Shuffle size={13} strokeWidth={2} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Asosiy birlik belgisi + Konversiya */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, padding: '10px 14px', background: u.isBaseUnit ? 'var(--primary-light, #eff6ff)' : 'var(--surface-secondary)', borderRadius: 8, border: `1px solid ${u.isBaseUnit ? 'var(--primary)' : 'var(--border)'}` }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: u.isBaseUnit ? 'var(--primary)' : 'var(--text-secondary)', userSelect: 'none' }}>
                                    <input
                                        type="radio"
                                        name={`baseUnit-${form.units.map((_, idx) => idx).join('-')}`}
                                        checked={u.isBaseUnit === true}
                                        onChange={() => setForm(f => ({
                                            ...f,
                                            units: f.units.map((u2, idx2) => ({
                                                ...u2,
                                                isBaseUnit: idx2 === i,
                                                conversionFactor: idx2 === i ? '' : u2.conversionFactor
                                            }))
                                        }))}
                                        style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
                                    />
                                    Asosiy birlik (stock shu yerda)
                                </label>
                                {!u.isBaseUnit && (() => {
                                    const baseUnit = form.units.find(u2 => u2.isBaseUnit)
                                    const baseUnitName = baseUnit
                                        ? (units.find(un => String(un.id) === String(baseUnit.unitId))?.name || 'asosiy birlik')
                                        : 'asosiy birlik'
                                    const thisUnitName = units.find(un => String(un.id) === String(u.unitId))?.name || 'shu birlik'
                                    return (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>1 {baseUnitName} =</span>
                                            <input
                                                type="number"
                                                className="form-input form-input-sm"
                                                style={{ width: 90 }}
                                                value={u.conversionFactor}
                                                onChange={e => setUnit(i, 'conversionFactor', e.target.value)}
                                                placeholder="4"
                                                min="0.0001"
                                                step="any"
                                            />
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{thisUnitName}</span>
                                        </div>
                                    )
                                })()}
                            </div>

                            {/* Narxlar */}
                            <div className="form-row form-row-4" style={{ marginBottom: 12 }}>
                                <div className="form-group" style={{ flex: '0 0 10%' }}>
                                    <label className="form-label-sm">Valyuta</label>
                                    <select className="form-input form-input-sm"
                                            value={u.currency || 'UZS'}
                                            onChange={e => setUnit(i, 'currency', e.target.value)}>
                                        <option value="UZS">UZS</option>
                                        <option value="USD">USD ($)</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label-sm">
                                        {t('products.cost_price')}
                                        {u.currency === 'USD' && u.costPrice && (
                                            <span className="usd-hint">≈{fmt(parsePrice(String(u.costPrice)) * exchangeRate)}</span>
                                        )}
                                    </label>
                                    <div className="input-with-prefix">
                                        <span className="input-prefix">{u.currency || 'UZS'}</span>
                                        <input type="text" inputMode="numeric" className="form-input form-input-sm"
                                               value={fmtPrice(u.costPrice)}
                                               onChange={e => setUnit(i, 'costPrice', parsePrice(e.target.value))} />
                                    </div>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label-sm">{t('products.sale_price')}</label>
                                    <div className="input-with-prefix">
                                        <span className="input-prefix">UZS</span>
                                        <input type="text" inputMode="numeric" className="form-input form-input-sm"
                                               value={fmtPrice(u.salePrice)}
                                               onChange={e => setUnit(i, 'salePrice', parsePrice(e.target.value))} />
                                    </div>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label-sm">{t('products.min_price')}</label>
                                    <div className="input-with-prefix">
                                        <span className="input-prefix">UZS</span>
                                        <input type="text" inputMode="numeric" className="form-input form-input-sm"
                                               value={fmtPrice(u.minPrice)}
                                               onChange={e => setUnit(i, 'minPrice', parsePrice(e.target.value))} />
                                    </div>
                                </div>
                            </div>

                            {/* Zaxira */}
                            <div className="unit-stock-section">
                                {(!isEdit || !u.id) ? (
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
                                        <div className="form-group">
                                            <label className="form-label-sm">Minimal miqdor</label>
                                            <input type="number" className="form-input form-input-sm"
                                                   value={u.minStock}
                                                   onChange={e => setUnit(i, 'minStock', e.target.value)}
                                                   placeholder="0" min="0" />
                                        </div>
                                    </div>
                                ) : u.id && (
                                    <div className="stock-adjust-area">
                                        <label className="form-label-sm stock-adjust-label">{"Zaxira o'zgartirish"}</label>
                                        <div className="form-row form-row-3">
                                            <div className="form-group">
                                                <select className="form-input form-input-sm"
                                                        value={stockAdjustments[u.id]?.movementType || 'ADJUSTMENT_IN'}
                                                        onChange={e => setStockAdjustments(s => ({ ...s, [u.id]: { ...(s[u.id] || {}), movementType: e.target.value } }))}>
                                                    <option value="ADJUSTMENT_IN">+ Kirim</option>
                                                    <option value="ADJUSTMENT_OUT">- Chiqim</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <input type="number" className="form-input form-input-sm"
                                                       placeholder="Miqdor" min="0"
                                                       value={stockAdjustments[u.id]?.quantity || ''}
                                                       onChange={e => setStockAdjustments(s => ({ ...s, [u.id]: { ...(s[u.id] || {}), quantity: e.target.value } }))} />
                                            </div>
                                            <div className="form-group">
                                                <select className="form-input form-input-sm"
                                                        value={stockAdjustments[u.id]?.warehouseId || ''}
                                                        onChange={e => setStockAdjustments(s => ({ ...s, [u.id]: { ...(s[u.id] || {}), warehouseId: e.target.value } }))}>
                                                    <option value="">{'\u2014'} Omborxona {'\u2014'}</option>
                                                    {warehouses.map(w => (
                                                        <option key={w.id} value={w.id}>{w.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        {u.warehouseStocks?.length > 0 && (
                                            <div className="stock-current-info">
                                                <div className="stock-info-row">
                                                    <div className="stock-badges-wrap">
                                                        {u.warehouseStocks.map(ws => (
                                                            <span key={ws.warehouseId} className="stock-badge">
                                                                {ws.warehouseName}: <strong>{ws.quantity}</strong>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="stock-min-wrap">
                                                        <label className="form-label-sm">Minimal miqdor:</label>
                                                        <input type="number"
                                                               className="form-input form-input-sm stock-min-input"
                                                               placeholder="0"
                                                               value={u.minStock ?? ''}
                                                               onChange={e => setUnit(i, 'minStock', e.target.value)} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Birlik qo'shish tugmasi */}
                    <button className="btn-add-unit" onClick={addUnit}
                            style={{ alignSelf: 'flex-start', padding: '8px 16px' }}>
                        <Plus size={14} /> Birlik qo'shish
                    </button>
                </div>
            </div>

            {toast && (
                <div className={`toast-msg toast-msg--${toast.type}`}>
                    {toast.type === 'error' ? '⚠ ' : '✓ '}{toast.msg}
                </div>
            )}
        </>
    )
}