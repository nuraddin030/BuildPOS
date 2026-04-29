import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Clock, Users, ChevronLeft, ChevronRight, Eye, Loader2,
    BarChart2, Banknote, CreditCard, Smartphone, TrendingDown,
    Package, DollarSign, X, CheckCircle, XCircle, RotateCcw,
    FileSpreadsheet, Download, Calendar
} from 'lucide-react'
import { shiftsApi } from '../api/shifts'
import { useAuth } from '../context/AuthContext'
import { exportToExcel, exportToPDF, fmtNum } from '../utils/exportUtils'
import '../styles/ProductsPage.css'
import '../styles/ShiftReportPage.css'

const fmt = (num) =>
    num == null ? '0' : String(Math.round(Number(num))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const fmtDT = (dt) => {
    if (!dt) return '—'
    const d = new Date(dt)
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

const STATUS_MAP = {
    OPEN:   { label: 'Ochiq',   color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
    CLOSED: { label: 'Yopilgan', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
}

// ── StatCard ──────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color = '#2563eb', sub }) {
    return (
        <div className="shift-stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div className="shift-stat-icon" style={{ background: color + '18', color }}>
                    <Icon size={18} />
                </div>
                <span className="shift-stat-label">{label}</span>
            </div>
            <div className="shift-stat-value">{value}</div>
            {sub && <div className="shift-stat-sub">{sub}</div>}
        </div>
    )
}

// ── PaymentBar ────────────────────────────────────────────────────
function PaymentBar({ label, amount, total, color, icon: Icon }) {
    const pct = total > 0 ? Math.round(amount / total * 100) : 0
    return (
        <div className="shift-payment-row">
            <div className="shift-payment-header">
                <div className="shift-payment-label" style={{ color }}>
                    <Icon size={14} /> {label}
                </div>
                <div className="shift-payment-amount">
                    {fmt(amount)} UZS
                    <span className="shift-payment-pct">{pct}%</span>
                </div>
            </div>
            <div className="shift-payment-bar-bg">
                <div className="shift-payment-bar-fill" style={{ background: color, width: `${pct}%` }} />
            </div>
        </div>
    )
}

// ── ShiftDetailModal ──────────────────────────────────────────────
function ShiftDetailModal({ shiftId, onClose }) {
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(true)
    const [exportLoading, setExportLoading] = useState(false)

    useEffect(() => {
        shiftsApi.getSummary(shiftId)
            .then(r => setSummary(r.data))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [shiftId])

    const handleExport = async (format) => {
        if (!summary) return
        setExportLoading(true)
        try {
            const filename = `smena_${shiftId}_${summary.cashierName?.replace(/ /g,'_')}`
            const title = `Smena hisoboti — ${summary.cashierName}`
            const subtitle = `${fmtDT(summary.openedAt)} — ${fmtDT(summary.closedAt) || 'Ochiq'}  |  ${summary.warehouseName}`

            const headers = ['Ko\'rsatkich', 'Qiymat']
            const rows = [
                ['Kassir', summary.cashierName || '—'],
                ['Ombor', summary.warehouseName || '—'],
                ['Ochilgan', fmtDT(summary.openedAt)],
                ['Yopilgan', fmtDT(summary.closedAt) || 'Ochiq'],
                ['Davomiylik', summary.durationFormatted || '—'],
                ['', ''],
                ['Jami sotuvlar', fmt(summary.totalSales) + ' UZS'],
                ['Sotuvlar soni', summary.saleCount + ' ta'],
                ["O'rtacha chek", fmt(summary.averageSale) + ' UZS'],
                ['Chegirma', fmt(summary.totalDiscount) + ' UZS'],
                ['Bekor qilingan', summary.cancelledCount + ' ta'],
                ['Qaytarishlar', summary.returnedCount + ' ta'],
                ['', ''],
                ['Naqd', fmt(summary.totalCash) + ' UZS'],
                ['Karta', fmt(summary.totalCard) + ' UZS'],
                ["O'tkazma", fmt(summary.totalTransfer) + ' UZS'],
                ['Nasiya', fmt(summary.totalDebt) + ' UZS'],
                ['', ''],
                ['Boshlang\'ich kassa', fmt(summary.openingCash) + ' UZS'],
                ['Harajatlar', fmt(summary.totalExpenses) + ' UZS'],
                ['Kutilayotgan kassa', fmt(summary.expectedCash) + ' UZS'],
                ['Yakuniy kassa', fmt(summary.closingCash) + ' UZS'],
                ['Kassa farqi', fmt(summary.cashDifference) + ' UZS'],
            ]

            if (format === 'pdf') {
                await exportToPDF({ filename, title, subtitle, headers, rows })
            } else {
                exportToExcel(filename, headers, rows)
            }
        } finally {
            setExportLoading(false)
        }
    }

    return (
        <div className="modal-overlay shift-modal" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box">
                <div className="modal-header">
                    <div className="modal-header-left">
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'rgba(37,99,235,0.1)', color: '#2563eb',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <BarChart2 size={20} />
                        </div>
                        <div>
                            <h3 className="modal-title">Smena hisoboti</h3>
                            <p className="modal-subtitle">
                                {loading ? 'Yuklanmoqda...' : `${summary?.cashierName} — ${summary?.warehouseName}`}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {!loading && summary && (
                            <>
                                <button className="btn-reset" onClick={() => handleExport('excel')}
                                        disabled={exportLoading}
                                        style={{ color: '#16a34a', borderColor: '#16a34a', fontSize: 12 }}>
                                    <FileSpreadsheet size={13} /> Excel
                                </button>
                                <button className="btn-reset" onClick={() => handleExport('pdf')}
                                        disabled={exportLoading}
                                        style={{ color: '#dc2626', borderColor: '#dc2626', fontSize: 12 }}>
                                    <Download size={13} /> PDF
                                </button>
                            </>
                        )}
                        <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
                    </div>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center' }}>
                            <Loader2 size={32} className="spin" style={{ color: 'var(--primary)' }} />
                        </div>
                    ) : !summary ? (
                        <div className="table-empty"><BarChart2 size={40} strokeWidth={1} /><p>Ma'lumot topilmadi</p></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                            {/* Smena vaqti */}
                            <div className="debt-info-box">
                                <div className="debt-info-row">
                                    <span>Ochilgan</span>
                                    <span className="debt-info-value">{fmtDT(summary.openedAt)}</span>
                                </div>
                                <div className="debt-info-row">
                                    <span>Yopilgan</span>
                                    <span className="debt-info-value">{fmtDT(summary.closedAt) || '—'}</span>
                                </div>
                                <div className="debt-info-row">
                                    <span>Davomiylik</span>
                                    <span className="debt-info-value" style={{ color: 'var(--primary)' }}>
                                        {summary.durationFormatted}
                                    </span>
                                </div>
                            </div>

                            {/* Statistika kartalari */}
                            <div className="shift-stat-grid">
                                <StatCard label="Jami sotuvlar" value={fmt(summary.totalSales) + ' UZS'}
                                          icon={DollarSign} color="#2563eb"
                                          sub={summary.saleCount + ' ta chek'} />
                                <StatCard label="O'rtacha chek" value={fmt(summary.averageSale) + ' UZS'}
                                          icon={TrendingDown} color="#7c3aed" />
                                <StatCard label="Chegirma" value={fmt(summary.totalDiscount) + ' UZS'}
                                          icon={RotateCcw} color="#f59e0b" />
                            </div>

                            {/* Sotuvlar holati */}
                            <div className="shift-status-grid">
                                {[
                                    { label: 'Muvaffaqiyatli', val: summary.saleCount,      icon: CheckCircle, color: '#16a34a' },
                                    { label: 'Bekor qilingan', val: summary.cancelledCount, icon: XCircle,     color: '#ef4444' },
                                    { label: 'Qaytarishlar',   val: summary.returnedCount,  icon: RotateCcw,   color: '#f59e0b' },
                                ].map(({ label, val, icon: Icon, color }) => (
                                    <div key={label} className="shift-status-card"
                                         style={{ background: color + '10', border: `1px solid ${color}30` }}>
                                        <Icon size={20} color={color} />
                                        <div>
                                            <div className="shift-status-count" style={{ color }}>{val}</div>
                                            <div className="shift-status-label">{label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* To'lov usullari */}
                            <div className="shift-payment-box">
                                <div className="shift-payment-title">To'lov usullari bo'yicha</div>
                                {(() => {
                                    const total = Number(summary.totalCash) + Number(summary.totalCard) +
                                        Number(summary.totalTransfer) + Number(summary.totalDebt)
                                    return (
                                        <>
                                            <PaymentBar label="Naqd"      amount={summary.totalCash}     total={total} color="#16a34a" icon={Banknote} />
                                            <PaymentBar label="Karta"     amount={summary.totalCard}     total={total} color="#2563eb" icon={CreditCard} />
                                            <PaymentBar label="O'tkazma"  amount={summary.totalTransfer} total={total} color="#7c3aed" icon={Smartphone} />
                                            <PaymentBar label="Nasiya"    amount={summary.totalDebt}     total={total} color="#f59e0b" icon={TrendingDown} />
                                        </>
                                    )
                                })()}
                            </div>

                            {/* Kassa */}
                            <div className="debt-info-box">
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
                                    textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.4px' }}>
                                    Kassa
                                </div>
                                <div className="debt-info-row">
                                    <span>Boshlang'ich kassa</span>
                                    <span className="debt-info-value">{fmt(summary.openingCash)} UZS</span>
                                </div>
                                <div className="debt-info-row">
                                    <span>Naqd tushumlar</span>
                                    <span className="debt-info-value" style={{ color: '#16a34a' }}>+{fmt(summary.totalCash)} UZS</span>
                                </div>
                                {Number(summary.totalExpenses) > 0 && (
                                    <>
                                        <div className="debt-info-row">
                                            <span>Harajatlar (jami)</span>
                                            <span className="debt-info-value" style={{ color: '#ef4444' }}>−{fmt(summary.totalExpenses)} UZS</span>
                                        </div>
                                        {Number(summary.expenseCash) > 0 && (
                                            <div className="debt-info-row" style={{ paddingLeft: 12 }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>· Naqd</span>
                                                <span className="debt-info-value" style={{ color: '#ef4444', fontSize: 12 }}>−{fmt(summary.expenseCash)} UZS</span>
                                            </div>
                                        )}
                                        {Number(summary.expenseCard) > 0 && (
                                            <div className="debt-info-row" style={{ paddingLeft: 12 }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>· Karta</span>
                                                <span className="debt-info-value" style={{ color: '#ef4444', fontSize: 12 }}>−{fmt(summary.expenseCard)} UZS</span>
                                            </div>
                                        )}
                                        {Number(summary.expenseTransfer) > 0 && (
                                            <div className="debt-info-row" style={{ paddingLeft: 12 }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>· O'tkazma</span>
                                                <span className="debt-info-value" style={{ color: '#ef4444', fontSize: 12 }}>−{fmt(summary.expenseTransfer)} UZS</span>
                                            </div>
                                        )}
                                    </>
                                )}
                                <div className="debt-info-row">
                                    <span>Kutilayotgan kassa</span>
                                    <span className="debt-info-value" style={{ color: 'var(--primary)', fontWeight: 700 }}>{fmt(summary.expectedCash)} UZS</span>
                                </div>
                                {summary.closingCash != null && (
                                    <div className="debt-info-row">
                                        <span>Haqiqiy kassa (kiritilgan)</span>
                                        <span className="debt-info-value">{fmt(summary.closingCash)} UZS</span>
                                    </div>
                                )}
                                <div className="debt-info-row debt-info-main">
                                    <span>Kassa farqi</span>
                                    <span className="debt-info-value" style={{
                                        color: Number(summary.cashDifference) >= 0 ? '#16a34a' : '#dc2626'
                                    }}>
                                        {Number(summary.cashDifference) >= 0 ? '+' : ''}{fmt(summary.cashDifference)} UZS
                                    </span>
                                </div>
                            </div>

                            {/* Top mahsulotlar */}
                            {summary.topProducts?.length > 0 && (
                                <div>
                                    <div className="shift-section-title">Top mahsulotlar</div>
                                    <div className="shift-top-table-wrapper">
                                    <table className="ptable" style={{ fontSize: 13 }}>
                                        <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Mahsulot</th>
                                            <th className="th-center">Birlik</th>
                                            <th className="th-right">Miqdor</th>
                                            <th className="th-right">Summa</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {summary.topProducts.map((p, i) => (
                                            <tr key={i}>
                                                <td className="cell-num">{i + 1}</td>
                                                <td><span className="cell-name">{p.productName}</span></td>
                                                <td className="th-center"><span className="cell-muted">{p.unitName}</span></td>
                                                <td className="th-right" style={{ fontWeight: 600 }}>{fmt(p.totalQuantity)}</td>
                                                <td className="th-right" style={{ fontWeight: 700, color: '#2563eb' }}>
                                                    {fmt(p.totalAmount)} UZS
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                    </div>
                                    <div className="shift-top-list">
                                        {summary.topProducts.map((p, i) => (
                                            <div key={i} className="shift-top-row">
                                                <span className="shift-top-name">{i + 1}. {p.productName}</span>
                                                <div className="shift-top-right">
                                                    <div className="shift-top-amount">{fmt(p.totalAmount)} UZS</div>
                                                    <div className="shift-top-qty">{fmt(p.totalQuantity)} {p.unitName}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════
// ShiftReportPage — asosiy komponent
// ════════════════════════════════════════════════════════════════
export default function ShiftReportPage() {
    const { hasPermission, user } = useAuth()
    const navigate = useNavigate()

    const canView = user?.role === 'OWNER' || user?.role === 'ADMIN' || hasPermission('SHIFT_VIEW')

    useEffect(() => {
        if (!canView) navigate('/', { replace: true })
    }, [canView, navigate])

    const [shifts, setShifts] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [size, setSize] = useState(20)
    const [loading, setLoading] = useState(false)

    const [filterFrom, setFilterFrom] = useState('')
    const [filterTo, setFilterTo] = useState('')
    const [selectedShiftId, setSelectedShiftId] = useState(null)

    const load = useCallback(() => {
        setLoading(true)
        const params = {
            page, size,
            from: filterFrom ? filterFrom + 'T00:00:00' : undefined,
            to:   filterTo   ? filterTo   + 'T23:59:59' : undefined,
        }
        shiftsApi.getAll(params)
            .then(res => {
                setShifts(res.data.content || [])
                setTotal(res.data.totalElements || 0)
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [page, size, filterFrom, filterTo])

    useEffect(() => { load() }, [load])

    const totalPages = Math.ceil(total / size)

    const handleReset = () => {
        setFilterFrom('')
        setFilterTo('')
        setPage(0)
    }

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>
                        <BarChart2 size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">
                            Smena hisobotlari
                            <span className="page-count">({total} ta)</span>
                        </h1>
                        <p className="page-subtitle">Kassir smenalari va hisobotlar</p>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="filter-bar shifts-filter-bar">
                <div className="shifts-date-inputs">
                    <Calendar size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input type="date" className="filter-search"
                           value={filterFrom}
                           onChange={e => { setFilterFrom(e.target.value); setPage(0) }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: 13, flexShrink: 0 }}>—</span>
                    <input type="date" className="filter-search"
                           value={filterTo}
                           onChange={e => { setFilterTo(e.target.value); setPage(0) }} />
                </div>
                <button className="btn-reset" onClick={handleReset}>
                    <RotateCcw size={14} /> Tozalash
                </button>
            </div>

            {/* Jadval */}
            <div className="table-card">
                {loading ? (
                    <div className="table-loading"><Loader2 size={28} className="spin" /><p>Yuklanmoqda...</p></div>
                ) : shifts.length === 0 ? (
                    <div className="table-empty"><BarChart2 size={40} strokeWidth={1} /><p>Smenalar topilmadi</p></div>
                ) : (
                    <>
                    <div className="shifts-table-wrapper table-responsive">
                        <table className="ptable shifts-ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th>Kassir</th>
                                <th>Ombor</th>
                                <th className="th-center">Ochilgan</th>
                                <th className="th-center">Yopilgan</th>
                                <th className="th-right">Sotuvlar</th>
                                <th className="th-right">Naqd</th>
                                <th className="th-right">Karta</th>
                                <th className="th-right">Nasiya</th>
                                <th className="th-center">Holat</th>
                                <th className="th-center">Amallar</th>
                            </tr>
                            </thead>
                            <tbody>
                            {shifts.map((s, i) => {
                                const st = STATUS_MAP[s.status] || {}
                                return (
                                    <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedShiftId(s.id)}>
                                        <td className="cell-num">{page * size + i + 1}</td>
                                        <td>
                                            <div className="cell-name">{s.cashierName}</div>
                                        </td>
                                        <td><span className="cell-muted">{s.warehouseName}</span></td>
                                        <td className="th-center">
                                            <span style={{ fontSize: 12 }}>{fmtDT(s.openedAt)}</span>
                                        </td>
                                        <td className="th-center">
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {s.closedAt ? fmtDT(s.closedAt) : '—'}
                                            </span>
                                        </td>
                                        <td className="th-right">
                                            <span style={{ fontWeight: 700 }}>{fmt(s.totalSales)}</span>
                                            <span className="cell-muted" style={{ fontSize: 11 }}> UZS</span>
                                        </td>
                                        <td className="th-right" style={{ color: '#16a34a' }}>
                                            {fmt(s.totalCash)}
                                            <span className="cell-muted" style={{ fontSize: 11 }}> UZS</span>
                                        </td>
                                        <td className="th-right" style={{ color: '#2563eb' }}>
                                            {fmt(s.totalCard)}
                                            <span className="cell-muted" style={{ fontSize: 11 }}> UZS</span>
                                        </td>
                                        <td className="th-right" style={{ color: '#f59e0b' }}>
                                            {fmt(s.totalDebt)}
                                            <span className="cell-muted" style={{ fontSize: 11 }}> UZS</span>
                                        </td>
                                        <td className="th-center">
                                            <span style={{
                                                padding: '3px 10px', borderRadius: 20,
                                                fontSize: 12, fontWeight: 600,
                                                color: st.color, background: st.bg
                                            }}>{st.label}</span>
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className="action-group">
                                                <button className="act-btn act-edit"
                                                        title="Hisobotni ko'rish"
                                                        onClick={() => setSelectedShiftId(s.id)}>
                                                    <Eye size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    </div>
                    <div className="shifts-cards">
                        {shifts.map(s => {
                            const st = STATUS_MAP[s.status] || {}
                            return (
                                <div key={s.id} className="shift-card" onClick={() => setSelectedShiftId(s.id)}>
                                    <div className="shift-card-top">
                                        <span className="shift-card-cashier">{s.cashierName}</span>
                                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: st.color, background: st.bg }}>{st.label}</span>
                                    </div>
                                    <div className="shift-card-meta">{s.warehouseName} · {fmtDT(s.openedAt)}</div>
                                    <div className="shift-card-amounts">
                                        <div className="shift-card-amount-item">
                                            <span className="shift-card-amount-label">Jami sotuv</span>
                                            <span className="shift-card-amount-value">{fmt(s.totalSales)}</span>
                                        </div>
                                        <div className="shift-card-amount-item">
                                            <span className="shift-card-amount-label">Naqd</span>
                                            <span className="shift-card-amount-value" style={{ color: '#16a34a' }}>{fmt(s.totalCash)}</span>
                                        </div>
                                        <div className="shift-card-amount-item">
                                            <span className="shift-card-amount-label">Karta</span>
                                            <span className="shift-card-amount-value" style={{ color: '#2563eb' }}>{fmt(s.totalCard)}</span>
                                        </div>
                                        <div className="shift-card-amount-item">
                                            <span className="shift-card-amount-label">Nasiya</span>
                                            <span className="shift-card-amount-value" style={{ color: '#f59e0b' }}>{fmt(s.totalDebt)}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    </>
                )}

                {total > size && (
                    <div className="table-footer">
                        <select className="al-size-select" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(0) }}>
                            {[20, 50, 100].map(s => <option key={s} value={s}>{s} ta</option>)}
                        </select>
                        <div className="pagination-group">
                            <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Oldingi</button>
                            <span className="page-info">{page + 1} / {Math.max(1, totalPages)}</span>
                            <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Keyingi →</button>
                        </div>
                        <span className="table-footer-info">Jami: {total} ta</span>
                    </div>
                )}
            </div>

            {/* Detail modal */}
            {selectedShiftId && (
                <ShiftDetailModal
                    shiftId={selectedShiftId}
                    onClose={() => setSelectedShiftId(null)}
                />
            )}
        </div>
    )
}