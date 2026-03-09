import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ShoppingCart, ArrowLeft, Plus, Trash2, Search, X,
    Loader2, AlertCircle, Package, User, Truck,
    DollarSign, Save, Building2
} from 'lucide-react'
import { createPurchase} from '../api/purchases'
import {getProducts, getWarehouses, getExchangeRate, getProductById} from '../api/products'
import { getSuppliers, createSupplier } from '../api/suppliers'
import '../styles/ProductsPage.css'

const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'OTHER']
const PAYMENT_LABELS = { CASH: 'Naqd', CARD: 'Karta', BANK_TRANSFER: 'Bank', OTHER: 'Boshqa' }

const EMPTY_ITEM = {
    productUnitId: null,
    productName: '',
    unitSymbol: '',
    quantity: '',
    unitPrice: '',
    currency: 'UZS',
    exchangeRate: '',
    salePrice: '',
    minPrice: '',
    updatePrices: false,
}
const fmtPrice = (val) => {
    if (val === '' || val === null || val === undefined) return ''
    const num = String(val).replace(/[^\d]/g, '')
    if (!num) return ''
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
const EMPTY_SUPPLIER = { name: '', phone: '', inn: '', address: '' }

export default function PurchaseNewPage() {
    const navigate = useNavigate()

    const [supplierId, setSupplierId] = useState('')
    const [warehouseId, setWarehouseId] = useState('')
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState([{ ...EMPTY_ITEM, _id: Date.now() }])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [suppliers, setSuppliers] = useState([])
    const [warehouses, setWarehouses] = useState([])
    const [exchangeRate, setExchangeRate] = useState(12700)

    // Product search
    const [productSearch, setProductSearch] = useState({})
    const [productResults, setProductResults] = useState({})
    const [productSearching, setProductSearching] = useState({})
    const searchTimeouts = useRef({})

    // Supplier drawer
    const [showSupplierDrawer, setShowSupplierDrawer] = useState(false)
    const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER)
    const [supplierSaving, setSupplierSaving] = useState(false)
    const [supplierError, setSupplierError] = useState('')

    useEffect(() => {
        getSuppliers({ size: 100 }).then(res => setSuppliers(res.data.content || res.data || []))
        getWarehouses().then(res => {
            const list = res.data.content || res.data || []
            setWarehouses(list)
            const def = list.find(w => w.isDefault)
            if (def) setWarehouseId(String(def.id))
        })
        getExchangeRate().then(res => setExchangeRate(Number(res.data?.rate) || 12700)).catch(() => {})
    }, [])

    // Product qidirish
    const searchProduct = (idx, val) => {
        setProductSearch(p => ({ ...p, [idx]: val }))
        clearTimeout(searchTimeouts.current[idx])
        if (!val.trim()) { setProductResults(p => ({ ...p, [idx]: [] })); return }
        searchTimeouts.current[idx] = setTimeout(async () => {
            setProductSearching(p => ({ ...p, [idx]: true }))
            try {
                const res = await getProducts({ search: val, size: 10, sort: 'name,asc' })
                setProductResults(p => ({ ...p, [idx]: res.data.content || [] }))
            } catch {}
            finally { setProductSearching(p => ({ ...p, [idx]: false })) }
        }, 350)
    }

    const selectProduct = async (idx, product) => {
        try {
            const res = await getProductById(product.id)
            const fullProduct = res.data
            const unit = fullProduct.units?.[0] || fullProduct.productUnits?.[0]
            setItems(prev => prev.map((item, i) => i === idx ? {
                ...item,
                productUnitId: unit?.id,
                productName: fullProduct.name,
                unitSymbol: unit?.unitSymbol || unit?.symbol || fullProduct.defaultUnitSymbol || '',
                salePrice: unit?.salePrice || fullProduct.defaultSalePrice || '',
                minPrice: unit?.minPrice || '',
            } : item))
        } catch {}
        setProductSearch(p => ({ ...p, [idx]: '' }))
        setProductResults(p => ({ ...p, [idx]: [] }))
    }

    const updateItem = (idx, field, val) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item))
    }

    const addItem = () => {
        setItems(prev => [...prev, { ...EMPTY_ITEM, _id: Date.now() }])
    }

    const removeItem = (idx) => {
        setItems(prev => prev.filter((_, i) => i !== idx))
    }

    // UZS da narx hisoblash
    const getUzsPrice = (item) => {
        if (!item.unitPrice) return 0
        const price = Number(item.unitPrice)
        if (item.currency === 'USD') {
            const rate = Number(item.exchangeRate) || Number(exchangeRate)
            return price * rate
        }
        return price
    }

    const getItemTotal = (item) => {
        return getUzsPrice(item) * (Number(item.quantity) || 0)
    }

    const grandTotal = items.reduce((sum, item) => sum + getItemTotal(item), 0)

    // Supplier yaratish
    const handleCreateSupplier = async () => {
        if (!supplierForm.name.trim()) { setSupplierError("Nomi kiritilishi shart"); return }
        setSupplierSaving(true); setSupplierError('')
        try {
            const res = await createSupplier(supplierForm)
            const newSupplier = res.data
            setSuppliers(prev => [...prev, newSupplier])
            setSupplierId(String(newSupplier.id))
            setShowSupplierDrawer(false)
            setSupplierForm(EMPTY_SUPPLIER)
        } catch (e) {
            setSupplierError(e.response?.data?.message || 'Xatolik')
        } finally { setSupplierSaving(false) }
    }

    // Saqlash
    const handleSave = async () => {
        if (!supplierId) { setError("Yetkazuvchi tanlanishi shart"); return }
        if (!warehouseId) { setError("Ombor tanlanishi shart"); return }
        if (items.length === 0) { setError("Kamida bitta mahsulot kerak"); return }

        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (!item.productUnitId) { setError(`${i + 1}-mahsulot tanlanmagan`); return }
            if (!item.quantity || Number(item.quantity) <= 0) { setError(`${i + 1}-mahsulot miqdori kiritilmagan`); return }
            if (!item.unitPrice || Number(item.unitPrice) <= 0) { setError(`${i + 1}-mahsulot narxi kiritilmagan`); return }
            if (item.currency === 'USD' && !item.exchangeRate) { setError(`${i + 1}-mahsulot uchun kurs kiritilishi kerak`); return }
        }

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
                    exchangeRate: item.currency === 'USD' ? Number(item.exchangeRate) : undefined,
                }))
            }
            const res = await createPurchase(data)
            navigate(`/purchases/${res.data.id}`)
        } catch (e) {
            setError(e.response?.data?.message || 'Xatolik yuz berdi')
        } finally { setSaving(false) }
    }

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <button className="act-btn" onClick={() => navigate('/purchases')} style={{ marginRight: 8 }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div className="page-icon-wrap">
                        <ShoppingCart size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">Yangi xarid</h1>
                        <p className="page-subtitle">Partiya kiritish</p>
                    </div>
                </div>
                <button className="btn-add" onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 size={15} className="spin" /> Saqlanmoqda...</> : <><Save size={15} /> Saqlash</>}
                </button>
            </div>

            {error && (
                <div className="form-error" style={{ marginBottom: 12 }}>
                    <AlertCircle size={16} />{error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
                {/* ── CHAP PANEL ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* Yetkazuvchi */}
                    <div className="table-card" style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Truck size={15} /> Yetkazuvchi
                            </span>
                            <button
                                style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => setShowSupplierDrawer(true)}
                            >
                                + Yangi
                            </button>
                        </div>
                        <select
                            className="form-select"
                            value={supplierId}
                            onChange={e => setSupplierId(e.target.value)}
                        >
                            <option value="">— Tanlang —</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    {/* Ombor */}
                    <div className="table-card" style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Building2 size={15} /> Ombor
                        </div>
                        <select
                            className="form-select"
                            value={warehouseId}
                            onChange={e => setWarehouseId(e.target.value)}
                        >
                            <option value="">— Tanlang —</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>

                    {/* Kurs */}
                    <div className="table-card" style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <DollarSign size={15} /> Dollar kursi
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                                className="form-input"
                                type="text"
                                inputMode="numeric"
                                value={fmtPrice(exchangeRate)}
                                onChange={e => setExchangeRate(e.target.value.replace(/\s/g, ''))}
                                style={{ flex: 1 }}
                            />
                            <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>UZS</span>
                        </div>
                    </div>

                    {/* Izoh */}
                    <div className="table-card" style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Izoh</div>
                        <textarea
                            className="form-input"
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Ixtiyoriy..."
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    {/* Jami */}
                    <div className="table-card" style={{ padding: '16px 20px', background: 'var(--primary)', color: '#fff' }}>
                        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>Jami summa</div>
                        <div style={{ fontSize: 24, fontWeight: 800 }}>
                            {String(Math.round(grandTotal)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} UZS
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{items.length} ta mahsulot</div>
                    </div>
                </div>

                {/* ── O'NG PANEL ── */}
                <div className="table-card" style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Package size={15} /> Mahsulotlar
                        </span>
                        <button className="btn-add" style={{ padding: '6px 14px', fontSize: 13 }} onClick={addItem}>
                            <Plus size={14} /> Qo'shish
                        </button>
                    </div>

                    {items.map((item, idx) => (
                        <div key={item._id} style={{
                            border: '1.5px solid var(--border-color)', borderRadius: 10,
                            padding: '14px 16px', marginBottom: 12,
                            background: 'var(--surface-2, rgba(0,0,0,0.01))'
                        }}>
                            {/* Mahsulot qidirish */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    {item.productUnitId ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{
                                                flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 14,
                                                background: 'var(--primary-light, rgba(37,99,235,0.08))',
                                                color: 'var(--primary)', fontWeight: 600
                                            }}>
                                                {item.productName} ({item.unitSymbol})
                                            </span>
                                            <button className="act-btn" onClick={() => updateItem(idx, 'productUnitId', null)}>
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                            <input
                                                className="form-input"
                                                style={{ paddingLeft: 32 }}
                                                placeholder="Mahsulot qidiring..."
                                                value={productSearch[idx] || ''}
                                                onChange={e => searchProduct(idx, e.target.value)}
                                            />
                                            {productSearching[idx] && (
                                                <Loader2 size={13} className="spin" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }} />
                                            )}
                                            {(productResults[idx] || []).length > 0 && (
                                                <div style={{
                                                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                                    background: 'var(--surface)', border: '1px solid var(--border-color)',
                                                    borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto'
                                                }}>
                                                    {productResults[idx].map(p => (
                                                        <div key={p.id}
                                                             style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}
                                                             onMouseDown={(e) => {
                                                                 e.preventDefault()
                                                                 selectProduct(idx, p)}}
                                                             className="dropdown-hover"
                                                        >
                                                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                                {p.units?.map(u => u.unitSymbol || u.symbol).join(', ')}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                {items.length > 1 && (
                                    <button className="act-btn act-delete" onClick={() => removeItem(idx)}>
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Miqdor, narx, valyuta */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 8, marginBottom: 8 }}>
                                <div>
                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                        Miqdor {item.unitSymbol && `(${item.unitSymbol})`}
                                    </label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        inputMode="numeric"
                                        min="0"
                                        value={fmtPrice(item.unitPrice)}
                                        onChange={e => updateItem(idx, 'unitPrice', e.target.value.replace(/\s/g, ''))}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                        Tannarx ({item.currency})
                                    </label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        inputMode="numeric"
                                        min="0"
                                        value={fmtPrice(item.unitPrice)}
                                        onChange={e => updateItem(idx, 'unitPrice', e.target.value.replace(/\s/g, ''))}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                        Valyuta
                                    </label>
                                    <select
                                        className="form-select"
                                        value={item.currency}
                                        onChange={e => updateItem(idx, 'currency', e.target.value)}
                                    >
                                        <option value="UZS">UZS</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                            </div>

                            {/* USD kurs */}
                            {item.currency === 'USD' && (
                                <div style={{ marginBottom: 8 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                        Kurs (1 USD = ? UZS)
                                    </label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        value={item.exchangeRate || exchangeRate}
                                        onChange={e => updateItem(idx, 'exchangeRate', e.target.value)}
                                        placeholder={String(exchangeRate)}
                                    />
                                </div>
                            )}

                            {/* Sotuv narxi va minimal narx */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                <div>
                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                        Sotuv narxi (UZS)
                                    </label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        inputMode="numeric"
                                        min="0"
                                        value={fmtPrice(item.unitPrice)}
                                        onChange={e => updateItem(idx, 'unitPrice', e.target.value.replace(/\s/g, ''))}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                        Minimal narx (UZS)
                                    </label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        inputMode="numeric"
                                        min="0"
                                        value={fmtPrice(item.unitPrice)}
                                        onChange={e => updateItem(idx, 'unitPrice', e.target.value.replace(/\s/g, ''))}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Narxlarni yangilash */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                <input
                                    type="checkbox"
                                    checked={item.updatePrices}
                                    onChange={e => updateItem(idx, 'updatePrices', e.target.checked)}
                                />
                                <span style={{ color: 'var(--text-secondary)' }}>
                                    Mahsulot kartasidagi narxlarni yangilash
                                </span>
                            </label>

                            {/* Jami */}
                            {item.quantity && item.unitPrice && (
                                <div style={{
                                    marginTop: 10, padding: '8px 12px', borderRadius: 8,
                                    background: 'var(--primary-light, rgba(37,99,235,0.07))',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {item.quantity} × {item.unitPrice} {item.currency}
                                        {item.currency === 'USD' && ` × ${item.exchangeRate || exchangeRate}`}
                                    </span>
                                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                        = {String(Math.round(getItemTotal(item))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} UZS
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}

                    <button
                        onClick={addItem}
                        style={{
                            width: '100%', padding: '10px', borderRadius: 8,
                            border: '1.5px dashed var(--border-color)',
                            background: 'transparent', cursor: 'pointer',
                            color: 'var(--text-muted)', fontSize: 13,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}
                    >
                        <Plus size={14} /> Mahsulot qo'shish
                    </button>
                </div>
            </div>

            {/* Supplier Drawer */}
            {showSupplierDrawer && (
                <div className="modal-overlay" onClick={() => setShowSupplierDrawer(false)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <Truck size={20} />
                                <div>
                                    <h6 className="modal-title">Yangi yetkazuvchi</h6>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowSupplierDrawer(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            {supplierError && <div className="form-error"><AlertCircle size={16} />{supplierError}</div>}
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="form-label">Nomi <span className="required">*</span></label>
                                <input className="form-input" value={supplierForm.name}
                                       onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))}
                                       autoFocus />
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
        </div>
    )
}