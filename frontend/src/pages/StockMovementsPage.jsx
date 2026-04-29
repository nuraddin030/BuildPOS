import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/api'
import {
    Package, Filter, X, ChevronLeft, ChevronRight,
    TrendingUp, TrendingDown, RefreshCw, ShoppingCart,
    Search, FileSpreadsheet, Download, RotateCcw, Loader2
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { exportToExcel, exportToPDF, fmtNum } from '../utils/exportUtils'
import '../styles/ProductsPage.css'
import "../styles/dashboard.css"
import '../styles/StockMovementsPage.css'

// ─── Harakat turlari ───────────────────────────────────────────────────────
const MOVEMENT_TYPES = [
    { value: '',               label: 'Barchasi' },
    { value: 'PURCHASE_IN',   label: 'Yetkazuvchidan kirim',  color: '#10b981', icon: 'in'  },
    { value: 'SALE_OUT',      label: 'Sotuvdan chiqim',        color: '#ef4444', icon: 'out' },
    { value: 'ADJUSTMENT_IN', label: 'Qo\'lda kirim',          color: '#3b82f6', icon: 'in'  },
    { value: 'ADJUSTMENT_OUT',label: 'Qo\'lda chiqim',         color: '#f97316', icon: 'out' },
    { value: 'TRANSFER_IN',   label: 'Transfer kirim',         color: '#8b5cf6', icon: 'in'  },
    { value: 'TRANSFER_OUT',  label: 'Transfer chiqim',        color: '#ec4899', icon: 'out' },
    { value: 'RETURN_IN',     label: 'Qaytarib olish',         color: '#06b6d4', icon: 'in'  },
]

const TYPE_MAP = Object.fromEntries(MOVEMENT_TYPES.filter(t => t.value).map(t => [t.value, t]))

const fmt = (n) => n == null ? '—' : Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 3 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '—'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

// ─── Badge ─────────────────────────────────────────────────────────────────
function MovementBadge({ type }) {
    const info = TYPE_MAP[type]
    if (!info) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{type}</span>
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: info.color + '18', color: info.color, whiteSpace: 'nowrap'
        }}>
            {info.icon === 'in'
                ? <TrendingUp size={11} />
                : <TrendingDown size={11} />
            }
            {info.label}
        </span>
    )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function StockMovementsPage() {
    const navigate = useNavigate()
    const { hasPermission } = useAuth()

    // Filters
    const [movementType, setMovementType] = useState('')
    const [warehouseId, setWarehouseId]   = useState('')
    const [dateFrom, setDateFrom]   = useState('')
    const [dateTo, setDateTo]       = useState('')
    const [productSearch, setProductSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(productSearch), 400)
        return () => clearTimeout(t)
    }, [productSearch])
    const [showFilters, setShowFilters] = useState(false)
    const [exportLoading, setExportLoading] = useState(false)

    // Data
    const [movements, setMovements] = useState([])
    const [warehouses, setWarehouses] = useState([])
    const [loading, setLoading]     = useState(false)
    const [page, setPage]           = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [totalElements, setTotalElements] = useState(0)
    const [pageSize, setPageSize] = useState(20)

    // Stats (hisoblangan)
    const [stats, setStats] = useState({ totalIn: 0, totalOut: 0 })
    const [typeCounts, setTypeCounts] = useState({})

    // ── Load warehouses ────────────────────────────────────────────────────
    useEffect(() => {
        api.get('/api/v1/warehouses').then(r => {
            setWarehouses(r.data?.content || r.data || [])
        }).catch(() => {})
        api.get('/api/v1/stock-movements/counts').then(r => {
            setTypeCounts(r.data || {})
        }).catch(() => {})
    }, [])

    // ── Load movements ─────────────────────────────────────────────────────
    const load = useCallback(async (p = 0) => {
        setLoading(true)
        try {
            const params = { page: p, size: pageSize }
            if (movementType)  params.movementType = movementType
            if (warehouseId)   params.warehouseId  = Number(warehouseId)
            if (dateFrom)      params.from = dateFrom + 'T00:00:00'
            if (dateTo)        params.to   = dateTo   + 'T23:59:59'
            if (debouncedSearch) params.productName = debouncedSearch

            const res = await api.get('/api/v1/stock-movements', { params })
            const data = res.data
            const content = data?.content || data || []
            setMovements(content)
            setTotalPages(data?.totalPages || 1)
            setTotalElements(data?.totalElements || content.length)
            setPage(p)

            // Sahifadagi statistika
            const inTypes  = ['PURCHASE_IN','ADJUSTMENT_IN','TRANSFER_IN','RETURN_IN']
            const outTypes = ['SALE_OUT','ADJUSTMENT_OUT','TRANSFER_OUT']
            setStats({
                totalIn:  content.filter(m => inTypes.includes(m.movementType)).reduce((s,m) => s + Number(m.quantity||0), 0),
                totalOut: content.filter(m => outTypes.includes(m.movementType)).reduce((s,m) => s + Number(m.quantity||0), 0),
            })
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [movementType, warehouseId, dateFrom, dateTo, debouncedSearch])

    useEffect(() => { load(0) }, [load])

    // ── Filter reset ───────────────────────────────────────────────────────
    const resetFilters = () => {
        setMovementType(''); setWarehouseId('')
        setDateFrom(''); setDateTo(''); setProductSearch('')
    }
    const hasFilters = movementType || warehouseId || dateFrom || dateTo || productSearch

    // ── Export ────────────────────────────────────────────────────────────────
    const handleExport = async (format) => {
        setExportLoading(true)
        try {
            const params = { page: 0, size: 1000 }
            if (movementType) params.movementType = movementType
            if (warehouseId)  params.warehouseId  = Number(warehouseId)
            if (dateFrom)     params.from = dateFrom + 'T00:00:00'
            if (dateTo)       params.to   = dateTo   + 'T23:59:59'
            const res = await api.get('/api/v1/stock-movements', { params })
            const rows = res.data?.content || []

            const headers = ['#', 'Mahsulot', 'Birlik', 'Harakat turi', 'Ombor', 'Miqdor', 'Narx', 'Jami', 'Manba', 'Sana', 'Kim']
            const data = rows.map((m, i) => {
                const isIn = ['PURCHASE_IN','ADJUSTMENT_IN','TRANSFER_IN','RETURN_IN'].includes(m.movementType)
                const warehouse = m.fromWarehouseName && m.toWarehouseName
                    ? `${m.fromWarehouseName} → ${m.toWarehouseName}`
                    : (m.toWarehouseName || m.fromWarehouseName || '—')
                return [
                    i + 1,
                    m.productName || '',
                    m.unitSymbol || '',
                    TYPE_MAP[m.movementType]?.label || m.movementType,
                    warehouse,
                    (isIn ? '+' : '-') + fmtNum(m.quantity),
                    m.unitPrice ? fmtNum(m.unitPrice) : '',
                    m.totalPrice ? fmtNum(m.totalPrice) : '',
                    m.referenceType ? `${m.referenceType} #${m.referenceId || ''}` : '',
                    m.movedAt ? new Date(m.movedAt).toLocaleDateString('ru-RU') : '',
                    m.movedBy || ''
                ]
            })

            if (format === 'pdf') {
                await exportToPDF({
                    filename: 'sklad_harakatlari',
                    title: 'Sklad harakatlari',
                    subtitle: `${dateFrom || ''} — ${dateTo || ''}`,
                    headers, rows: data,
                    summary: [{ label: 'Jami harakatlar', value: rows.length + ' ta' }]
                })
            } else {
                exportToExcel('sklad_harakatlari', headers, data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setExportLoading(false)
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="products-wrapper">
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap">
                        <Package size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">
                            Sklad harakatlari
                            <span className="page-count">({totalElements.toLocaleString('ru-RU')} ta)</span>
                        </h1>
                        <p className="page-subtitle">Kirim, chiqim va transfer tarixi</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="btn-reset" onClick={() => handleExport('excel')} disabled={exportLoading}
                            style={{ color: '#16a34a', borderColor: '#16a34a' }}>
                        {exportLoading ? <Loader2 size={14} className="spin" /> : <FileSpreadsheet size={14} />} Excel
                    </button>
                    <button className="btn-reset" onClick={() => handleExport('pdf')} disabled={exportLoading}
                            style={{ color: '#dc2626', borderColor: '#dc2626' }}>
                        <Download size={14} /> PDF
                    </button>
                </div>
            </div>
            {/* ── Stat kartochkalar ── */}
            <div className="movement-type-cards">
                {MOVEMENT_TYPES.filter(t => t.value).map(t => (
                    <div key={t.value}
                         className="kpi-card"
                         onClick={() => setMovementType(v => v === t.value ? '' : t.value)}
                         style={{
                             cursor: 'pointer',
                             outline: movementType === t.value ? `2px solid ${t.color}` : '2px solid transparent',
                             transition: 'all 0.15s',
                             background: movementType === t.value ? t.color + '12' : undefined
                         }}>
                        <div className="kpi-content">
                            <span className="kpi-label" style={{ color: t.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {t.label}
                            </span>
                            <span className="kpi-value" style={{ color: movementType === t.value ? t.color : undefined }}>
                                {typeCounts[t.value] ?? 0}
                                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>ta</span>
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filter bar ── */}
            <div className="filter-bar">
                <div className="filter-search-wrap">
                    <Search size={15} className="filter-search-icon" />
                    <input className="filter-search" placeholder="Mahsulot nomi yoki shtrix-kod..."
                           value={productSearch}
                           onChange={e => setProductSearch(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-outline" onClick={() => load(page)} title="Yangilash">
                        <RefreshCw size={15} />
                    </button>
                    <button className={`btn-outline${showFilters ? ' active' : ''}`}
                            onClick={() => setShowFilters(v => !v)}
                            style={showFilters ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}}>
                        <Filter size={15} /> Filter
                        {hasFilters && <span style={{
                            background: '#fff', color: 'var(--primary)',
                            borderRadius: '50%', width: 16, height: 16,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, marginLeft: 2
                        }}>!</span>}
                    </button>
                    {hasFilters && (
                        <button className="btn-reset" onClick={resetFilters}>
                            <RotateCcw size={14} /> Tozalash
                        </button>
                    )}
                </div>
            </div>

            {/* ── Filterlar ── */}
            {showFilters && (
                <div className="table-card" style={{ padding: '16px 20px', marginBottom: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>

                        {/* Harakat turi */}
                        <div>
                            <label className="form-label-sm">Harakat turi</label>
                            <select className="form-input form-input-sm"
                                    value={movementType} onChange={e => setMovementType(e.target.value)}>
                                {MOVEMENT_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        {/* Ombor */}
                        <div>
                            <label className="form-label-sm">Ombor</label>
                            <select className="form-input form-input-sm"
                                    value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                                <option value="">Barcha omborlar</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                        {/* Sanadan */}
                        <div>
                            <label className="form-label-sm">Sanadan</label>
                            <input type="date" className="form-input form-input-sm"
                                   value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        </div>
                        {/* Sanagacha */}
                        <div>
                            <label className="form-label-sm">Sanagacha</label>
                            <input type="date" className="form-input form-input-sm"
                                   value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        </div>
                    </div>
                    {hasFilters && (
                        <button className="btn-outline" onClick={resetFilters}
                                style={{ marginTop: 12, fontSize: 12, padding: '5px 12px', color: '#ef4444', borderColor: '#ef444440' }}>
                            <X size={13} /> Filterni tozalash
                        </button>
                    )}
                </div>
            )}

            {/* ── Jadval ── */}
            <div className="table-card">
                {loading ? (
                    <div className="table-loading"><Loader2 size={28} className="spin" /><p>Yuklanmoqda...</p></div>
                ) : movements.length === 0 ? (
                    <div className="table-empty">
                        <Package size={40} strokeWidth={1.2} />
                        <p>Harakatlar topilmadi</p>
                        {hasFilters && (
                            <button className="btn-outline" onClick={resetFilters} style={{ fontSize: 13 }}>
                                Filterni tozalash
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                    <div className="movements-table-wrapper table-responsive">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th className="th-center" style={{ width: 36 }}>#</th>
                                <th style={{ minWidth: 150 }}>Mahsulot</th>
                                <th style={{ minWidth: 160 }}>Harakat turi</th>
                                <th style={{ minWidth: 110 }}>Ombor</th>
                                <th className="th-right" style={{ minWidth: 70 }}>Miqdor</th>
                                <th className="th-right" style={{ minWidth: 130 }}>Narx / Jami</th>
                                <th style={{ minWidth: 100 }}>Manba</th>
                                <th style={{ minWidth: 100 }}>Izoh</th>
                                <th style={{ minWidth: 130 }}>Sana</th>
                                <th style={{ minWidth: 70 }}>Kim</th>
                            </tr>
                            </thead>
                            <tbody>
                            {movements.map((m, idx) => {
                                const typeInfo = TYPE_MAP[m.movementType]
                                const isIn = ['PURCHASE_IN','ADJUSTMENT_IN','TRANSFER_IN','RETURN_IN'].includes(m.movementType)
                                const refPath = m.referenceType === 'PURCHASE' ? `/purchases/${m.referenceId}`
                                    : m.referenceType === 'SALE' ? `/sales/${m.referenceId}` : null
                                return (
                                    <tr key={m.id}>
                                        <td className="th-center" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                            {page * pageSize + idx + 1}
                                        </td>
                                        {/* Mahsulot */}
                                        <td>
                                            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{m.productName || '—'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                {m.unitSymbol && <span>{m.unitSymbol}</span>}
                                                {m.barcode && <span style={{ marginLeft: 6, fontFamily: 'monospace', opacity: 0.7 }}>{m.barcode}</span>}
                                            </div>
                                        </td>
                                        {/* Harakat turi */}
                                        <td><MovementBadge type={m.movementType} /></td>
                                        {/* Ombor */}
                                        <td style={{ fontSize: 13 }}>
                                            {m.fromWarehouseName && m.toWarehouseName ? (
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{m.fromWarehouseName}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>→ {m.toWarehouseName}</div>
                                                </div>
                                            ) : (
                                                <span>{m.toWarehouseName || m.fromWarehouseName || '—'}</span>
                                            )}
                                        </td>
                                        {/* Miqdor */}
                                        <td className="th-right">
                                            <span style={{ fontWeight: 700, fontSize: 14, color: isIn ? '#10b981' : '#ef4444' }}>
                                                {isIn ? '+' : '-'}{fmt(m.quantity)}
                                            </span>
                                        </td>
                                        {/* Narx */}
                                        <td className="th-right">
                                            {m.unitPrice ? (
                                                <div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                        {fmt(m.unitPrice)} × {fmt(m.quantity)}
                                                    </div>
                                                    <div style={{ fontWeight: 700, fontSize: 13 }}>
                                                        {fmt(m.totalPrice || (Number(m.unitPrice) * Number(m.quantity)))}
                                                    </div>
                                                </div>
                                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                        </td>
                                        {/* Manba */}
                                        <td>
                                            {m.referenceType ? (
                                                <span
                                                    onClick={() => refPath && navigate(refPath)}
                                                    style={{
                                                        fontSize: 11, padding: '3px 8px',
                                                        background: 'var(--primary-light, rgba(37,99,235,0.08))',
                                                        color: 'var(--primary)', borderRadius: 20, fontWeight: 700,
                                                        whiteSpace: 'nowrap', display: 'inline-block',
                                                        cursor: refPath ? 'pointer' : 'default'
                                                    }}>
                                                    {m.referenceType === 'PURCHASE' ? 'Xarid' :
                                                        m.referenceType === 'SALE' ? 'Sotuv' :
                                                            m.referenceType === 'INITIAL_STOCK' ? 'Boshl.' :
                                                                m.referenceType}
                                                    {m.referenceId && ` #${m.referenceId}`}
                                                </span>
                                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                        </td>
                                        {/* Izoh */}
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 150 }}>
                                            <span title={m.notes}>
                                                {m.notes ? (m.notes.length > 25 ? m.notes.slice(0,25)+'…' : m.notes) : '—'}
                                            </span>
                                        </td>
                                        {/* Sana */}
                                        <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                            {fmtDateTime(m.movedAt)}
                                        </td>
                                        {/* Kim */}
                                        <td style={{ fontSize: 12 }}>{m.movedBy || '—'}</td>
                                    </tr>
                                )
                            })}
                            </tbody>
                            {/* Sahifa yig'indisi */}
                            <tfoot>
                            <tr>
                                <td colSpan={4} style={{ padding: '10px 8px 4px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', fontWeight: 600 }}>
                                    Sahifadagi jami:
                                </td>
                                <td className="th-right" style={{ padding: '10px 8px 4px' }}>
                                    {stats.totalIn > 0 && (
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>
                                            +{fmt(stats.totalIn)}
                                        </div>
                                    )}
                                    {stats.totalOut > 0 && (
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
                                            -{fmt(stats.totalOut)}
                                        </div>
                                    )}
                                </td>
                                <td colSpan={5}></td>
                            </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div className="movements-cards">
                        {movements.map((m, idx) => {
                            const isIn = ['PURCHASE_IN','ADJUSTMENT_IN','TRANSFER_IN','RETURN_IN'].includes(m.movementType)
                            const refPath = m.referenceType === 'PURCHASE' ? `/purchases/${m.referenceId}`
                                : m.referenceType === 'SALE' ? `/sales/${m.referenceId}` : null
                            return (
                                <div key={m.id} className="movement-card">
                                    <div className="movement-card-top">
                                        <span className="movement-card-product">{m.productName || '—'}</span>
                                        <span className="movement-card-qty" style={{ color: isIn ? '#10b981' : '#ef4444' }}>
                                            {isIn ? '+' : '-'}{fmt(m.quantity)}
                                            {m.unitSymbol && <span style={{ fontSize: 11, fontWeight: 400 }}> {m.unitSymbol}</span>}
                                        </span>
                                    </div>
                                    <div className="movement-card-meta">
                                        <MovementBadge type={m.movementType} />
                                        {(m.toWarehouseName || m.fromWarehouseName) && (
                                            <span>{m.toWarehouseName || m.fromWarehouseName}</span>
                                        )}
                                    </div>
                                    <div className="movement-card-bottom">
                                        <span>{fmtDateTime(m.movedAt)}</span>
                                        {m.totalPrice && (
                                            <span className="movement-card-total">{fmt(m.totalPrice)}</span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    </>
                )}

                {totalElements > pageSize && (
                    <div className="table-footer">
                        <select className="al-size-select" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); load(0) }}>
                            {[20, 50, 100].map(s => <option key={s} value={s}>{s} ta</option>)}
                        </select>
                        <div className="pagination-group">
                            <button className="page-btn" disabled={page === 0} onClick={() => load(page - 1)}>← Oldingi</button>
                            <span className="page-info">{page + 1} / {Math.max(1, totalPages)}</span>
                            <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => load(page + 1)}>Keyingi →</button>
                        </div>
                        <span className="table-footer-info">Jami: {totalElements} ta</span>
                    </div>
                )}
            </div>
        </div>
    )
}