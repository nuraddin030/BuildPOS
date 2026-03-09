import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ShoppingCart, Plus, Search, Filter, Eye, CheckCircle,
    XCircle, Loader2, Truck, Calendar, DollarSign, Package,
    ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react'
import { getPurchases, cancelPurchase } from '../api/purchases'
import { useAuth } from '../context/AuthContext'
import '../styles/ProductsPage.css'

const fmt = (num) => num == null ? '0' : String(Math.round(Number(num))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const STATUS_MAP = {
    PENDING:            { label: 'Kutilmoqda',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    PARTIALLY_RECEIVED: { label: 'Qisman qabul',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    RECEIVED:           { label: 'Qabul qilindi',  color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    CANCELLED:          { label: 'Bekor qilindi',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
}

export default function PurchasesPage() {
    const navigate = useNavigate()
    const { hasPermission } = useAuth()

    const [purchases, setPurchases] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [size] = useState(20)
    const [loading, setLoading] = useState(false)

    const [filterStatus, setFilterStatus] = useState('')
    const [filterSearch, setFilterSearch] = useState('')

    const load = useCallback(() => {
        setLoading(true)
        getPurchases({
            page, size,
            status: filterStatus || undefined,
        })
            .then(res => {
                setPurchases(res.data.content || [])
                setTotal(res.data.totalElements || 0)
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [page, size, filterStatus])

    useEffect(() => { load() }, [load])

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
                {hasPermission('PURCHASES_CREATE') && (
                    <button className="btn-add" onClick={() => navigate('/purchases/new')}>
                        <Plus size={16} /> Yangi xarid
                    </button>
                )}
            </div>

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
                    <div className="table-responsive">
                        <table className="ptable">
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
                                            <span style={{ fontWeight: 600 }}>{fmt(p.totalAmount)}</span>
                                        </td>
                                        <td className="th-right">
                                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                                                    {fmt(p.paidAmount)}
                                                </span>
                                        </td>
                                        <td className="th-right">
                                            {Number(p.debtAmount) > 0 ? (
                                                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                                                        {fmt(p.debtAmount)}
                                                    </span>
                                            ) : (
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
                                                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString('uz-UZ') : '—'}
                                                </span>
                                        </td>
                                        <td>
                                            <div className="action-group">
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
                                        </td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    </div>
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