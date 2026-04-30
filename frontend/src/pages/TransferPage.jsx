import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ArrowLeftRight, ArrowLeft, Plus, Trash2, Search,
    Loader2, AlertCircle, Package, Warehouse, X, CheckCircle
} from 'lucide-react'
import { getProducts, getProductById, getWarehouses } from '../api/products'
import api from '../api/api'
import { useAuth } from '../context/AuthContext'
import '../styles/ProductsPage.css'
import '../styles/TransferPage.css'

const fmt = (n) => {
    if (n == null) return '0'
    const num = Number(n)
    if (!Number.isFinite(num)) return '0'
    const str = num % 1 === 0 ? String(num) : num.toFixed(3).replace(/\.?0+$/, '')
    const [int, dec] = str.split('.')
    return dec ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + '.' + dec : int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const fmtPrice = (val) => {
    if (val === '' || val === null || val === undefined) return ''
    const str = String(val).replace(/[^\d.]/g, '')
    const parts = str.split('.')
    const intPart = (parts[0] || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    if (parts.length > 1) return intPart + '.' + parts[1].slice(0, 3)
    if (str.endsWith('.')) return intPart + '.'
    return intPart || ''
}

export default function TransferPage() {
    const navigate = useNavigate()
    const { hasPermission } = useAuth()

    const [fromWarehouseId, setFromWarehouseId] = useState('')
    const [toWarehouseId, setToWarehouseId] = useState('')
    const [notes, setNotes] = useState('')
    const [warehouses, setWarehouses] = useState([])

    const [items, setItems] = useState([])

    const [productSearch, setProductSearch] = useState('')
    const [productResults, setProductResults] = useState([])
    const [productSearching, setProductSearching] = useState(false)
    const [dropIdx, setDropIdx] = useState(-1)
    const searchTimeout = useRef(null)
    const dropRefs = useRef({})
    const searchRef = useRef(null)

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [toast, setToast] = useState(null)

    const showToast = (msg, type = 'error') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    useEffect(() => {
        getWarehouses().then(r => {
            const list = r.data.content || r.data || []
            setWarehouses(list)
        })
    }, [])

    const searchProduct = (val) => {
        setProductSearch(val)
        setDropIdx(-1)
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

    const handleSearchKeyDown = (e) => {
        if (!productResults.length) return
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setDropIdx(i => Math.min(i + 1, productResults.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setDropIdx(i => Math.max(i - 1, -1))
        } else if (e.key === 'Enter' && dropIdx >= 0) {
            e.preventDefault()
            selectProduct(productResults[dropIdx])
        } else if (e.key === 'Escape') {
            setProductResults([])
            setDropIdx(-1)
        }
    }

    useEffect(() => {
        if (dropIdx >= 0 && dropRefs.current[dropIdx]) {
            dropRefs.current[dropIdx].scrollIntoView({ block: 'nearest' })
        }
    }, [dropIdx])

    const selectProduct = async (product) => {
        if (!fromWarehouseId) {
            showToast('Avval "Qayerdan" omborni tanlang')
            return
        }
        try {
            const res = await getProductById(product.id)
            const full = res.data
            const units = full.units || []
            const unit = units.find(u => u.isBaseUnit) || units[0]
            if (!unit) return

            const stock = (unit.warehouseStocks || []).find(
                ws => ws.warehouseId === Number(fromWarehouseId)
            )
            const available = stock ? Number(stock.quantity) : 0

            if (items.some(i => i.productUnitId === unit.id)) {
                showToast('Bu mahsulot allaqachon qo\'shilgan')
                setProductSearch('')
                setProductResults([])
                return
            }

            setItems(prev => [...prev, {
                _id: Date.now(),
                productUnitId: unit.id,
                productName: full.name,
                unitSymbol: unit.unitSymbol || unit.symbol || '',
                availableUnits: units,
                available,
                quantity: '',
            }])
        } catch {}
        setProductSearch('')
        setProductResults([])
        setDropIdx(-1)
        setTimeout(() => searchRef.current?.focus(), 50)
    }

    const updateItem = (idx, field, value) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
    }

    const changeUnit = async (idx, unitId) => {
        const item = items[idx]
        const unit = item.availableUnits.find(u => u.id === Number(unitId))
        if (!unit) return
        const stock = (unit.warehouseStocks || []).find(
            ws => ws.warehouseId === Number(fromWarehouseId)
        )
        setItems(prev => prev.map((it, i) => i === idx ? {
            ...it,
            productUnitId: unit.id,
            unitSymbol: unit.unitSymbol || unit.symbol || '',
            available: stock ? Number(stock.quantity) : 0,
            quantity: '',
        } : it))
    }

    const removeItem = (idx) => {
        setItems(prev => prev.filter((_, i) => i !== idx))
    }

    const handleFromWarehouseChange = async (wId) => {
        setFromWarehouseId(wId)
        if (!wId || items.length === 0) return
        const updated = await Promise.all(items.map(async (item) => {
            try {
                const res = await getProductById(null)
                return item
            } catch { return item }
        }))
        const newItems = []
        for (const item of items) {
            try {
                const unit = item.availableUnits.find(u => u.id === item.productUnitId)
                if (unit) {
                    const stock = (unit.warehouseStocks || []).find(
                        ws => ws.warehouseId === Number(wId)
                    )
                    newItems.push({ ...item, available: stock ? Number(stock.quantity) : 0 })
                } else {
                    newItems.push(item)
                }
            } catch {
                newItems.push(item)
            }
        }
        setItems(newItems)
    }

    const handleSubmit = async () => {
        if (!fromWarehouseId) { setError('"Qayerdan" omborni tanlang'); return }
        if (!toWarehouseId) { setError('"Qayerga" omborni tanlang'); return }
        if (fromWarehouseId === toWarehouseId) { setError('Omborlar bir xil bo\'lmasligi kerak'); return }
        if (items.length === 0) { setError('Kamida bitta mahsulot qo\'shing'); return }

        for (const item of items) {
            const qty = Number(String(item.quantity).replace(/\s/g, ''))
            if (!qty || qty <= 0) { setError(`"${item.productName}" uchun miqdor kiriting`); return }
            if (qty > item.available) { setError(`"${item.productName}" — mavjud: ${fmt(item.available)}, siz: ${fmt(qty)}`); return }
        }

        setSaving(true)
        setError('')
        let success = 0
        let firstErr = ''
        for (const item of items) {
            try {
                await api.post('/api/v1/products/stock/transfer', {
                    productUnitId: item.productUnitId,
                    fromWarehouseId: Number(fromWarehouseId),
                    toWarehouseId: Number(toWarehouseId),
                    quantity: Number(String(item.quantity).replace(/\s/g, '')),
                    notes: notes || undefined,
                })
                success++
            } catch (e) {
                if (!firstErr) firstErr = e.response?.data?.message || `"${item.productName}" ko'chirishda xatolik`
            }
        }
        setSaving(false)
        if (firstErr) {
            setError(`${success}/${items.length} ta ko'chirildi. Xatolik: ${firstErr}`)
        } else {
            showToast(`${success} ta mahsulot muvaffaqiyatli ko'chirildi`, 'success')
            setTimeout(() => navigate('/inventory'), 1000)
        }
    }

    const fromWarehouse = warehouses.find(w => w.id === Number(fromWarehouseId))
    const toWarehouse = warehouses.find(w => w.id === Number(toWarehouseId))

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <button className="act-btn" onClick={() => navigate('/inventory')} style={{ marginRight: 8 }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div className="page-icon-wrap" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                        <ArrowLeftRight size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">Tovar ko'chirish</h1>
                        <p className="page-subtitle">Omborlar o'rtasida mahsulot ko'chirish</p>
                    </div>
                </div>
                <button className="btn-add" onClick={handleSubmit} disabled={saving || items.length === 0}
                        style={{ background: '#8b5cf6' }}>
                    {saving ? <Loader2 size={16} className="spin" /> : <CheckCircle size={16} />}
                    Ko'chirish
                </button>
            </div>

            {error && (
                <div className="form-error" style={{ marginBottom: 14 }}>
                    <AlertCircle size={16} /> {error}
                    <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Omborlar va izoh */}
            <div className="table-card transfer-settings">
                <div className="transfer-warehouses">
                    <div className="transfer-wh-block">
                        <label className="form-label">
                            <Warehouse size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Qayerdan <span className="required">*</span>
                        </label>
                        <select className="form-select" value={fromWarehouseId}
                                onChange={e => handleFromWarehouseChange(e.target.value)}>
                            <option value="">Omborni tanlang</option>
                            {warehouses.filter(w => String(w.id) !== toWarehouseId).map(w =>
                                <option key={w.id} value={w.id}>{w.name}</option>
                            )}
                        </select>
                    </div>
                    <div className="transfer-arrow">
                        <ArrowLeftRight size={20} />
                    </div>
                    <div className="transfer-wh-block">
                        <label className="form-label">
                            <Warehouse size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Qayerga <span className="required">*</span>
                        </label>
                        <select className="form-select" value={toWarehouseId}
                                onChange={e => setToWarehouseId(e.target.value)}>
                            <option value="">Omborni tanlang</option>
                            {warehouses.filter(w => String(w.id) !== fromWarehouseId).map(w =>
                                <option key={w.id} value={w.id}>{w.name}</option>
                            )}
                        </select>
                    </div>
                </div>
                <div className="transfer-notes">
                    <label className="form-label">Izoh (ixtiyoriy)</label>
                    <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)}
                           placeholder="Masalan: do'konga yetkazildi" />
                </div>
            </div>

            {/* Mahsulot qidirish */}
            <div className="table-card" style={{ padding: '16px 20px', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                    <Package size={15} style={{ display: 'inline', marginRight: 6 }} />
                    Mahsulotlar ({items.length} ta)
                </div>
                <div className="transfer-search-wrap">
                    <Search size={16} className="filter-search-icon" />
                    <input
                        ref={searchRef}
                        className="filter-search"
                        type="text"
                        placeholder={fromWarehouseId ? "Mahsulot nomi yoki shtrix-kod..." : "Avval omborni tanlang"}
                        value={productSearch}
                        onChange={e => searchProduct(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        disabled={!fromWarehouseId}
                    />
                    {productSearching && <Loader2 size={14} className="spin" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />}
                    {productResults.length > 0 && (
                        <div className="transfer-search-dropdown">
                            {productResults.map((p, i) => {
                                const unit = (p.units || []).find(u => u.isBaseUnit) || p.units?.[0]
                                const stock = unit ? (unit.warehouseStocks || []).find(
                                    ws => ws.warehouseId === Number(fromWarehouseId)
                                ) : null
                                return (
                                    <div key={p.id} ref={el => dropRefs.current[i] = el}
                                         className={`transfer-search-item${i === dropIdx ? ' active' : ''}`}
                                         onClick={() => selectProduct(p)}>
                                        <div className="transfer-search-name">{p.name}</div>
                                        <div className="transfer-search-meta">
                                            <span>{unit?.unitSymbol || ''}</span>
                                            <span>Mavjud: {stock ? fmt(stock.quantity) : '0'}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Jadval */}
                {items.length > 0 && (
                    <>
                    <div className="transfer-table-wrap table-responsive">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th>Mahsulot</th>
                                <th className="th-center">Birlik</th>
                                <th className="th-right">Mavjud</th>
                                <th className="th-right">Ko'chirish miqdori</th>
                                <th className="th-center" style={{ width: 50 }}></th>
                            </tr>
                            </thead>
                            <tbody>
                            {items.map((item, idx) => (
                                <tr key={item._id}>
                                    <td className="cell-num">{idx + 1}</td>
                                    <td><div className="cell-name">{item.productName}</div></td>
                                    <td className="th-center">
                                        {item.availableUnits.length > 1 ? (
                                            <select className="form-select" style={{ width: 90, fontSize: 12, padding: '4px 6px' }}
                                                    value={item.productUnitId}
                                                    onChange={e => changeUnit(idx, e.target.value)}>
                                                {item.availableUnits.map(u =>
                                                    <option key={u.id} value={u.id}>{u.unitSymbol || u.symbol}</option>
                                                )}
                                            </select>
                                        ) : (
                                            <span className="cell-muted">{item.unitSymbol}</span>
                                        )}
                                    </td>
                                    <td className="th-right">
                                        <span style={{ fontWeight: 600, color: item.available > 0 ? '#10b981' : '#ef4444' }}>
                                            {fmt(item.available)}
                                        </span>
                                    </td>
                                    <td className="th-right">
                                        <input
                                            className="form-input"
                                            type="text"
                                            inputMode="numeric"
                                            style={{ width: 120, textAlign: 'right' }}
                                            value={fmtPrice(item.quantity)}
                                            onChange={e => updateItem(idx, 'quantity', e.target.value.replace(/\s/g, ''))}
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="th-center">
                                        <button className="act-btn" onClick={() => removeItem(idx)}
                                                style={{ color: '#ef4444' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="transfer-items-cards">
                        {items.map((item, idx) => (
                            <div key={item._id} className="transfer-item-card">
                                <div className="transfer-item-card-top">
                                    <div className="transfer-item-card-name">{item.productName}</div>
                                    <button className="act-btn" onClick={() => removeItem(idx)}
                                            style={{ color: '#ef4444' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="transfer-item-card-row">
                                    <span>Birlik</span>
                                    <span>{item.unitSymbol}</span>
                                </div>
                                <div className="transfer-item-card-row">
                                    <span>Mavjud</span>
                                    <span style={{ fontWeight: 600, color: item.available > 0 ? '#10b981' : '#ef4444' }}>
                                        {fmt(item.available)}
                                    </span>
                                </div>
                                <div className="transfer-item-card-row">
                                    <span>Ko'chirish</span>
                                    <input
                                        className="form-input"
                                        type="text"
                                        inputMode="numeric"
                                        style={{ width: 100, textAlign: 'right' }}
                                        value={fmtPrice(item.quantity)}
                                        onChange={e => updateItem(idx, 'quantity', e.target.value.replace(/\s/g, ''))}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    </>
                )}

                {items.length === 0 && fromWarehouseId && (
                    <div className="table-empty" style={{ padding: '40px 0' }}>
                        <Package size={36} strokeWidth={1.2} />
                        <p>Mahsulot qo'shing</p>
                    </div>
                )}
            </div>

            {/* Mobilda pastki ko'chirish tugmasi */}
            {items.length > 0 && (
                <div className="transfer-bottom-bar">
                    <div className="transfer-bottom-info">
                        {fromWarehouse?.name || '—'} → {toWarehouse?.name || '—'} · {items.length} ta mahsulot
                    </div>
                    <button className="btn-add" onClick={handleSubmit} disabled={saving}
                            style={{ background: '#8b5cf6', width: '100%', justifyContent: 'center' }}>
                        {saving ? <Loader2 size={16} className="spin" /> : <CheckCircle size={16} />}
                        Ko'chirish
                    </button>
                </div>
            )}

            {toast && (
                <div className={`toast-msg toast-msg--${toast.type}`}>
                    {toast.type === 'error' ? '⚠ ' : '✓ '}{toast.msg}
                </div>
            )}
        </div>
    )
}