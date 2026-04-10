import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
    ShoppingCart, Plus, Search, Filter, Eye, CheckCircle,
    XCircle, Loader2, Truck, Calendar, DollarSign, Package,
    ChevronLeft, ChevronRight, AlertCircle, FileDown, MoreVertical
} from 'lucide-react'
import { getPurchases, cancelPurchase } from '../api/purchases'
import { useAuth } from '../context/AuthContext'
import { exportToCSV, exportToPDF, fmtNum, fmtDate as fmtDateExport } from '../utils/exportUtils'
import DropdownPortal from '../components/DropdownPortal'
import '../styles/ProductsPage.css'
import '../styles/PurchasesPage.css'

const fmt = (num) => num == null ? '0' : String(Math.round(Number(num))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const STATUS_MAP = {
    PENDING:            { label: 'Kutilmoqda',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    PARTIALLY_RECEIVED: { label: 'Qisman qabul',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    RECEIVED:           { label: 'Qabul qilindi',  color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    CANCELLED:          { label: 'Bekor qilindi',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
}

export default function PurchasesPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { hasPermission } = useAuth()

    const [purchases, setPurchases] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [size] = useState(20)
    const [loading, setLoading] = useState(false)

    const [filterStatus, setFilterStatus] = useState('')
    const [filterSearch, setFilterSearch] = useState('')

    // URL dan supplierId o'qish (DebtsPage dan o'tganda)
    const urlSupplierId = new URLSearchParams(location.search).get('supplierId')
    const [filterSupplierId] = useState(urlSupplierId || '')
    const [supplierFilterLabel] = useState(
        urlSupplierId ? `Yetkazuvchi #${urlSupplierId} bo'yicha` : ''
    )

    const load = useCallback(() => {
        setLoading(true)
        getPurchases({
            page, size,
            status:     filterStatus     || undefined,
            supplierId: filterSupplierId || undefined,
        })
            .then(res => {
                setPurchases(res.data.content || [])
                setTotal(res.data.totalElements || 0)
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [page, size, filterStatus, filterSupplierId])

    useEffect(() => { load() }, [load])

    const [exportLoading, setExportLoading] = useState(false)
    const [openMenuId, setOpenMenuId] = useState(null)
    const [menuAnchor, setMenuAnchor] = useState(null)

    const handleExport = async (format = 'csv') => {
        setExportLoading(true)
        try {
            const res = await getPurchases({ page: 0, size: 1000, status: filterStatus || undefined, supplierId: filterSupplierId || undefined })
            const rows = res.data.content || []

            const headers = ['#', 'Raqam', 'Yetkazuvchi', 'Ombor', 'Tovarlar', 'Jami', "To'langan", 'Qarz', 'Status', 'Sana']
            const data = rows.map((p, i) => [
                i + 1,
                p.referenceNo || '',
                p.supplierName || '',
                p.warehouseName || '',
                p.itemCount + ' ta',
                fmtNum(p.totalAmount) + ' UZS',
                fmtNum(p.paidUzs || p.paidAmount || 0) + ' UZS',
                fmtNum(p.debtUzs || 0) + ' UZS',
                STATUS_MAP[p.status]?.label || p.status,
                p.createdAt ? new Date(p.createdAt).toLocaleDateString('ru-RU') : '—'
            ])

            const filename = 'xaridlar'
            if (format === 'pdf') {
                await exportToPDF({
                    filename, title: 'Xaridlar hisoboti', headers, rows: data,
                    summary: [
                        { label: 'Jami xaridlar', value: rows.length + ' ta' },
                        { label: 'Jami summa', value: fmtNum(rows.reduce((s, p) => s + Number(p.totalAmount || 0), 0)) + ' UZS' },
                    ]
                })
            } else {
                exportToCSV(filename, headers, data)
            }
        } catch (e) {
            alert('Export xatosi')
        } finally {
            setExportLoading(false)
        }
    }

    const handleCancel = async (id) => {
        if (!confirm('Bu xaridni bekor qilishni tasdiqlaysizmi?')) return
        try {
            await cancelPurchase(id)
            load()
        } catch (e) {
            alert(e.response?.data?.message || 'Xatolik')
        }
    }

    const filtered = filterSearch
        ? purchases.filter(p =>
            p.referenceNo?.toLowerCase().includes(filterSearch.toLowerCase()) ||
            p.supplierName?.toLowerCase().includes(filterSearch.toLowerCase())
        )
        : purchases

    const totalPages = Math.ceil(total / size)

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap">
                        <ShoppingCart size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">Xaridlar</h1>
                        <p className="page-subtitle">Partiyalar boshqaruvi</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {hasPermission('PURCHASES_CREATE') && (
                        <button className="btn-add" onClick={() => navigate('/purchases/new')}>
                            <Plus size={16} /> Yangi xarid
                        </button>
                    )}
                    <button className="btn-reset" onClick={() => handleExport('csv')} disabled={exportLoading}
                            style={{ color: '#16a34a', borderColor: '#16a34a' }}>
                        {exportLoading ? <Loader2 size={14} className="spin" /> : <FileDown size={14} />} Excel
                    </button>
                    <button className="btn-reset" onClick={() => handleExport('pdf')} disabled={exportLoading}
                            style={{ color: '#dc2626', borderColor: '#dc2626' }}>
                        <FileDown size={14} /> PDF
                    </button>
                </div>
            </div>

            {/* Yetkazuvchi filter belgisi */}
            {filterSupplierId && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', marginBottom: 12,
                    background: 'var(--primary-light)', borderRadius: 8,
                    fontSize: 13, color: 'var(--primary)', fontWeight: 600
                }}>
                    <Truck size={14} />
                    Yetkazuvchi bo'yicha filter qo'llanilgan
                    <button style={{
                        marginLeft: 'auto', background: 'none', border: 'none',
                        cursor: 'pointer', color: 'var(--primary)', display: 'flex'
                    }} onClick={() => navigate('/purchases')}>
                        ✕ Tozalash
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="filter-bar">
                <div className="filter-search-wrap">
                    <Search size={16} className="filter-search-icon" />
                    <input
                        className="filter-search"
                        placeholder="Raqam yoki yetkazuvchi..."
                        value={filterSearch}
                        onChange={e => setFilterSearch(e.target.value)}
                    />
                </div>
                <div className="filter-select-wrap">
                    <Filter size={14} className="filter-select-icon" />
                    <select
                        className="filter-select"
                        value={filterStatus}
                        onChange={e => { setFilterStatus(e.target.value); setPage(0) }}
                    >
                        <option value="">Barcha statuslar</option>
                        <option value="PENDING">Kutilmoqda</option>
                        <option value="PARTIALLY_RECEIVED">Qisman qabul</option>
                        <option value="RECEIVED">Qabul qilindi</option>
                        <option value="CANCELLED">Bekor qilindi</option>
                    </select>
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
                        <ShoppingCart size={40} strokeWidth={1} />
                        <p>Xaridlar yo'q</p>
                    </div>
                ) : (
                    <>
                        <div className="purchases-table-wrapper">
                            <div className="table-responsive">
                                <table className="ptable purchases-ptable">
                                    <thead>
                                    <tr>
                                        <th className="th-num">#</th>
                                        <th>Raqam</th>
                                        <th>Yetkazuvchi</th>
                                        <th>Ombor</th>
                                        <th className="th-center">Tovarlar</th>
                                        <th className="th-right">Jami</th>
                                        <th className="th-right">To'langan</th>
                                        <th className="th-right">Qarz</th>
                                        <th className="th-center">Status</th>
                                        <th className="th-center">Sana</th>
                                        <th className="th-center">Amallar</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filtered.map((p, i) => {
                                        const st = STATUS_MAP[p.status] || {}
                                        return (
                                            <tr key={p.id}>
                                                <td className="cell-num">{page * size + i + 1}</td>
                                                <td>
                                                    <span className="cell-barcode">{p.referenceNo}</span>
                                                </td>
                                                <td>
                                                    <div className="cell-name">{p.supplierName}</div>
                                                </td>
                                                <td>
                                                    <span className="cell-muted">{p.warehouseName}</span>
                                                </td>
                                                <td className="th-center">
                                                        <span style={{
                                                            padding: '2px 10px', borderRadius: 20,
                                                            background: 'var(--primary-light, rgba(37,99,235,0.1))',
                                                            color: 'var(--primary)', fontSize: 12, fontWeight: 600
                                                        }}>{p.itemCount} ta</span>
                                                </td>
                                                <td className="th-right">
                                                    {Number(p.totalUsd) > 0 && (
                                                        <div style={{ fontWeight: 600, color: '#3b82f6' }}>{fmt(p.totalUsd)} USD</div>
                                                    )}
                                                    {Number(p.totalUzs) > 0 && (
                                                        <div style={{ fontWeight: 600 }}>{fmt(p.totalUzs)} UZS</div>
                                                    )}
                                                    {!Number(p.totalUsd) && !Number(p.totalUzs) && (
                                                        <span style={{ fontWeight: 600 }}>{fmt(p.totalAmount)} UZS</span>
                                                    )}
                                                </td>
                                                <td className="th-right">
                                                    {Number(p.paidUsd) > 0 && (
                                                        <div style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(p.paidUsd)} USD</div>
                                                    )}
                                                    {Number(p.paidUzs) > 0 && (
                                                        <div style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(p.paidUzs)} UZS</div>
                                                    )}
                                                    {!Number(p.paidUsd) && !Number(p.paidUzs) && (
                                                        <span style={{ color: 'var(--success)' }}>—</span>
                                                    )}
                                                </td>
                                                <td className="th-right">
                                                    {Number(p.debtUsd) > 0 && (
                                                        <div style={{ color: 'var(--danger)', fontWeight: 700 }}>{fmt(p.debtUsd)} USD</div>
                                                    )}
                                                    {Number(p.debtUzs) > 0 && (
                                                        <div style={{ color: 'var(--danger)', fontWeight: 700 }}>{fmt(p.debtUzs)} UZS</div>
                                                    )}
                                                    {!Number(p.debtUsd) && !Number(p.debtUzs) && (
                                                        <span style={{ color: 'var(--success)' }}>—</span>
                                                    )}
                                                </td>
                                                <td className="th-center">
                                                        <span style={{
                                                            padding: '3px 10px', borderRadius: 20,
                                                            fontSize: 12, fontWeight: 600,
                                                            color: st.color, background: st.bg
                                                        }}>{st.label}</span>
                                                </td>
                                                <td className="th-center">
                                                        <span className="cell-muted" style={{ fontSize: 12 }}>
                                                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString('ru-RU') : '—'}
                                                        </span>
                                                </td>
                                                <td>
                                                    <div className="action-group desk-actions">
                                                        <button
                                                            className="act-btn act-edit"
                                                            title="Ko'rish"
                                                            onClick={() => navigate(`/purchases/${p.id}`)}
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        {p.status === 'PENDING' && hasPermission('PURCHASES_DELETE') && (
                                                            <button
                                                                className="act-btn act-delete"
                                                                title="Bekor qilish"
                                                                onClick={() => handleCancel(p.id)}
                                                            >
                                                                <XCircle size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="mob-actions">
                                                        <button className="act-btn act-more" onClick={(e) => {
                                                            if (openMenuId === p.id) { setOpenMenuId(null); setMenuAnchor(null) }
                                                            else { setOpenMenuId(p.id); setMenuAnchor(e.currentTarget) }
                                                        }}>
                                                            <MoreVertical size={15} />
                                                        </button>
                                                        {openMenuId === p.id && (
                                                            <DropdownPortal anchorEl={menuAnchor} onClose={() => { setOpenMenuId(null); setMenuAnchor(null) }}>
                                                                <button className="act-dd-item" onClick={() => { navigate(`/purchases/${p.id}`); setOpenMenuId(null) }}>
                                                                    <Eye size={14} /> Ko'rish
                                                                </button>
                                                                {p.status === 'PENDING' && hasPermission('PURCHASES_DELETE') && (
                                                                    <button className="act-dd-item act-dd-danger" onClick={() => { handleCancel(p.id); setOpenMenuId(null) }}>
                                                                        <XCircle size={14} /> Bekor qilish
                                                                    </button>
                                                                )}
                                                            </DropdownPortal>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="purchases-mobile-cards">
                            {filtered.map((p) => {
                                const st = STATUS_MAP[p.status] || {}
                                const hasDebt = Number(p.debtUsd) > 0 || Number(p.debtUzs) > 0
                                return (
                                    <div key={p.id} className="purchase-card">
                                        <div className="purchase-card-top">
                                            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                                                {p.referenceNo}
                                            </span>
                                            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                                                {p.createdAt ? new Date(p.createdAt).toLocaleDateString('ru-RU') : '—'}
                                            </span>
                                        </div>

                                        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>
                                            {p.supplierName}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                                {p.warehouseName}
                                            </span>
                                            <span style={{
                                                fontSize: 11,
                                                background: 'var(--primary-light, rgba(37,99,235,0.1))',
                                                color: 'var(--primary)',
                                                padding: '2px 8px', borderRadius: 20
                                            }}>
                                                {p.itemCount} ta
                                            </span>
                                        </div>

                                        <div className="purchase-card-bottom">
                                            <div>
                                                {Number(p.totalUsd) > 0 && (
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6' }}>{fmt(p.totalUsd)} USD</div>
                                                )}
                                                {Number(p.totalUzs) > 0 && (
                                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt(p.totalUzs)} UZS</div>
                                                )}
                                                {!Number(p.totalUsd) && !Number(p.totalUzs) && (
                                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt(p.totalAmount)} UZS</div>
                                                )}
                                                {hasDebt && (
                                                    <div style={{ fontSize: 11, color: 'var(--danger)' }}>
                                                        Qarz: {Number(p.debtUsd) > 0 ? `${fmt(p.debtUsd)} USD` : `${fmt(p.debtUzs)} UZS`}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: 20,
                                                    fontSize: 12, fontWeight: 600,
                                                    color: st.color, background: st.bg
                                                }}>{st.label}</span>
                                                <button className="purchase-view-btn" onClick={() => navigate(`/purchases/${p.id}`)}>
                                                    Ko'rish
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination">
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
                )}
            </div>
        </div>
    )
}