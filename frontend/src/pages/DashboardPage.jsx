import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    TrendingUp, TrendingDown, CalendarDays, AlertTriangle,
    ShoppingCart, Wallet, CreditCard, ArrowRightLeft,
    BarChart3, Receipt, Inbox, Clock, Package, Truck,
    CreditCard as NasiyaIcon, AlertCircle, CheckCircle,
    Loader2, ArrowUpRight
} from 'lucide-react'
import api from '../api/api'
import { shiftsApi } from '../api/shifts'
import { useAuth } from '../context/AuthContext'
import '../styles/ProductsPage.css'
import '../styles/DashboardPage.css'

const fmt = (num) => num == null ? '0' : String(Math.round(Number(num))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '—'

const STATUS_PURCHASE = {
    PENDING:            { label: 'Kutilmoqda',    color: '#f59e0b' },
    PARTIALLY_RECEIVED: { label: 'Qisman',        color: '#3b82f6' },
    RECEIVED:           { label: 'Qabul qilindi', color: '#10b981' },
    CANCELLED:          { label: 'Bekor',          color: '#ef4444' },
}

// ── KPI karta ────────────────────────────────────────────────────
function KpiCard({ label, value, sub, subWarn, icon: Icon, color, onClick }) {
    return (
        <div className={`dash-kpi-card${onClick ? ' dash-kpi-clickable' : ''}`}
             style={{ borderTop: `3px solid ${color}` }}
             onClick={onClick}>
            <div className="dash-kpi-icon" style={{ background: color + '18', color }}>
                <Icon size={20} />
            </div>
            <div className="dash-kpi-content">
                <span className="dash-kpi-label">{label}</span>
                <span className="dash-kpi-value">{value} <span className="dash-kpi-currency">UZS</span></span>
                {subWarn
                    ? <span className="dash-kpi-sub dash-kpi-sub--warn"><AlertTriangle size={11} /> {subWarn}</span>
                    : sub ? <span className="dash-kpi-sub">{sub}</span> : null
                }
            </div>
        </div>
    )
}

// ── PaymentRow ───────────────────────────────────────────────────
function PaymentRow({ icon: Icon, label, value, color, total }) {
    const pct = total > 0 ? Math.round(Number(value) / total * 100) : 0
    return (
        <div className="dash-pay-row">
            <div className="dash-pay-left">
                <div className="dash-pay-icon" style={{ background: color + '18', color }}>
                    <Icon size={14} />
                </div>
                <span className="dash-pay-label">{label}</span>
            </div>
            <div className="dash-pay-right">
                <span className="dash-pay-value" style={{ color }}>{fmt(value)} UZS</span>
                <span className="dash-pay-pct">{pct}%</span>
            </div>
            <div className="dash-pay-bar-bg">
                <div className="dash-pay-bar" style={{ width: `${pct}%`, background: color }} />
            </div>
        </div>
    )
}

export default function DashboardPage() {
    const navigate = useNavigate()
    const { user } = useAuth()

    const [data, setData]       = useState(null)
    const [shift, setShift]     = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            api.get('/api/v1/dashboard'),
            shiftsApi.getCurrent().catch(() => null)
        ]).then(([dashRes, shiftRes]) => {
            setData(dashRes.data)
            setShift(shiftRes?.data || null)
        }).catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) return (
        <div className="table-loading" style={{ minHeight: 300 }}>
            <Loader2 size={32} className="spin" style={{ color: 'var(--primary)' }} />
            <p>Yuklanmoqda...</p>
        </div>
    )

    if (!data) return (
        <div className="table-empty">
            <AlertTriangle size={40} strokeWidth={1} />
            <p>Ma'lumot yuklanmadi</p>
        </div>
    )

    const totalToday = Number(data.todayCash || 0) + Number(data.todayCard || 0) +
        Number(data.todayTransfer || 0) + Number(data.todayDebt || 0)

    return (
        <div className="products-wrapper">

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>
                        <BarChart3 size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">Bosh sahifa</h1>
                        <p className="page-subtitle">
                            <CalendarDays size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                            {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* Joriy smena */}
                {shift ? (
                    <div className="dash-shift-badge dash-shift-badge--open"
                         onClick={() => navigate('/shifts')}
                         title="Smena hisobotiga o'tish">
                        <CheckCircle size={14} />
                        <div>
                            <div className="dash-shift-name">{shift.cashierName}</div>
                            <div className="dash-shift-time">
                                {shift.openedAt ? new Date(shift.openedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''} dan
                            </div>
                        </div>
                        <ArrowUpRight size={14} />
                    </div>
                ) : (
                    <div className="dash-shift-badge dash-shift-badge--closed">
                        <Clock size={14} />
                        <span>Smena yopiq</span>
                    </div>
                )}
            </div>

            {/* ── Muddati o'tgan nasiyalar ogohlantirish ─────────── */}
            {data.overdueDebtCount > 0 && (
                <div className="dash-alert" onClick={() => navigate('/debts')}>
                    <AlertCircle size={18} />
                    <div>
                        <span className="dash-alert-title">Muddati o'tgan nasiyalar: {data.overdueDebtCount} ta</span>
                        <span className="dash-alert-sub">Jami: {fmt(data.overdueDebtAmount)} UZS</span>
                    </div>
                    <ArrowUpRight size={16} className="dash-alert-arrow" />
                </div>
            )}

            {/* ── KPI kartalar ───────────────────────────────────── */}
            <div className="dash-kpi-grid">
                <KpiCard label="Bugungi sotuv" value={fmt(data.todaySaleAmount)}
                         sub={`${data.todaySaleCount} ta chek • O'rtacha: ${fmt(data.todayAvgSale)} UZS`}
                         icon={ShoppingCart} color="#2563eb"
                         onClick={() => navigate('/sales')} />
                <KpiCard label="Joriy oy sotuvlari" value={fmt(data.monthSaleAmount)}
                         sub="Shu oy davomida"
                         icon={TrendingUp} color="#16a34a" />
                <KpiCard label="Mijozlar nasiyasi" value={fmt(data.totalCustomerDebt)}
                         sub={`${data.openDebtCount} ta ochiq nasiya`}
                         subWarn={data.overdueDebtCount > 0 ? `${data.overdueDebtCount} ta muddati o'tgan` : null}
                         icon={Wallet} color="#f59e0b"
                         onClick={() => navigate('/debts')} />
                <KpiCard label="Yetkazuvchi qarzi" value={fmt(data.totalSupplierDebt)}
                         sub="Yetkazuvchilarga"
                         icon={TrendingDown} color="#ef4444" />
            </div>

            {/* ── O'rta qism ─────────────────────────────────────── */}
            <div className="dash-mid-grid">

                {/* Bugungi to'lovlar */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <Receipt size={15} />
                        <h6 className="dash-card-title">Bugungi tushum</h6>
                        <span className="dash-card-total">{fmt(totalToday)} UZS</span>
                    </div>
                    <div className="dash-pay-list">
                        <PaymentRow icon={Wallet}         label="Naqd"     value={data.todayCash}     color="#16a34a" total={totalToday} />
                        <PaymentRow icon={CreditCard}     label="Karta"    value={data.todayCard}     color="#2563eb" total={totalToday} />
                        <PaymentRow icon={ArrowRightLeft} label="O'tkazma" value={data.todayTransfer} color="#7c3aed" total={totalToday} />
                        <PaymentRow icon={NasiyaIcon}     label="Nasiya"   value={data.todayDebt}     color="#f59e0b" total={totalToday} />
                    </div>
                </div>

                {/* Haftalik grafik */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <BarChart3 size={15} />
                        <h6 className="dash-card-title">Haftalik sotuv</h6>
                    </div>
                    <div className="dash-chart">
                        {data.weeklySales?.map((day, i) => {
                            const max = Math.max(...(data.weeklySales || []).map(d => Number(d.amount) || 0), 1)
                            const pct = Math.round((Number(day.amount) || 0) / max * 100)
                            const isToday = day.date === new Date().toISOString().slice(0, 10)
                            return (
                                <div key={i} className="dash-chart-col">
                                    <span className="dash-chart-amount">{pct > 0 ? fmt(day.amount) : ''}</span>
                                    <div className="dash-chart-track">
                                        <div className={`dash-chart-bar${isToday ? ' dash-chart-bar--today' : ''}`}
                                             style={{ height: `${Math.max(pct, 4)}%` }}
                                             title={`${day.day}: ${fmt(day.amount)} UZS`} />
                                    </div>
                                    <span className={`dash-chart-day${isToday ? ' dash-chart-day--today' : ''}`}>
                                        {day.day?.slice(0, 2)}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* ── Quyi grid ──────────────────────────────────────── */}
            <div className="dash-bottom-grid">

                {/* Top mahsulotlar */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <TrendingUp size={15} />
                        <h6 className="dash-card-title">Bugungi top mahsulotlar</h6>
                    </div>
                    {data.topProducts?.length > 0 ? (
                        <table className="ptable" style={{ fontSize: 13 }}>
                            <thead>
                            <tr>
                                <th>#</th>
                                <th>Mahsulot</th>
                                <th className="th-right">Miqdor</th>
                                <th className="th-right">Summa</th>
                            </tr>
                            </thead>
                            <tbody>
                            {data.topProducts.map((p, i) => (
                                <tr key={i}>
                                    <td className="cell-num">{i + 1}</td>
                                    <td>
                                        <div className="cell-name">{p.productName}</div>
                                        <div className="cell-muted" style={{ fontSize: 11 }}>{p.unitSymbol}</div>
                                    </td>
                                    <td className="th-right" style={{ fontWeight: 600 }}>{fmt(p.totalQuantity)}</td>
                                    <td className="th-right" style={{ fontWeight: 700, color: '#2563eb' }}>
                                        {fmt(p.totalAmount)} UZS
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="table-empty" style={{ padding: '24px 0' }}>
                            <Package size={32} strokeWidth={1} />
                            <p>Bugun sotuv yo'q</p>
                        </div>
                    )}
                </div>

                {/* Kam qolgan mahsulotlar */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <AlertTriangle size={15} style={{ color: '#f59e0b' }} />
                        <h6 className="dash-card-title">Kam qolgan mahsulotlar</h6>
                        {data.lowStockCount > 0 && (
                            <span className="dash-card-badge">{data.lowStockCount} ta</span>
                        )}
                    </div>
                    {data.lowStockItems?.length > 0 ? (
                        <table className="ptable" style={{ fontSize: 13 }}>
                            <thead>
                            <tr>
                                <th>Mahsulot</th>
                                <th>Ombor</th>
                                <th className="th-right">Qoldiq</th>
                                <th className="th-right">Min</th>
                            </tr>
                            </thead>
                            <tbody>
                            {data.lowStockItems.map((item, i) => (
                                <tr key={i}>
                                    <td>
                                        <div className="cell-name">{item.productName}</div>
                                        <div className="cell-muted" style={{ fontSize: 11 }}>{item.unitSymbol}</div>
                                    </td>
                                    <td><span className="cell-muted">{item.warehouseName}</span></td>
                                    <td className="th-right">
                                        <span style={{ fontWeight: 700, color: '#ef4444' }}>{fmt(item.currentStock)}</span>
                                    </td>
                                    <td className="th-right">
                                        <span style={{ color: 'var(--text-muted)' }}>{fmt(item.minStock)}</span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="table-empty" style={{ padding: '24px 0' }}>
                            <Package size={32} strokeWidth={1} />
                            <p>Barcha mahsulotlar yetarli</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── So'nggi sotuvlar va xaridlar ───────────────────── */}
            <div className="dash-bottom-grid">

                {/* So'nggi sotuvlar */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <Receipt size={15} />
                        <h6 className="dash-card-title">So'nggi sotuvlar</h6>
                        <button className="dash-card-link" onClick={() => navigate('/sales')}>
                            Barchasi <ArrowUpRight size={12} />
                        </button>
                    </div>
                    <table className="ptable" style={{ fontSize: 13 }}>
                        <thead>
                        <tr>
                            <th>Chek</th>
                            <th>Mijoz</th>
                            <th>Kassir</th>
                            <th className="th-right">Summa</th>
                            <th className="th-center">Sana</th>
                        </tr>
                        </thead>
                        <tbody>
                        {data.recentSales?.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                                Sotuv yo'q
                            </td></tr>
                        ) : data.recentSales?.map(sale => (
                            <tr key={sale.id} style={{ cursor: 'pointer' }}
                                onClick={() => navigate('/sales')}>
                                <td><span className="cell-muted" style={{ fontSize: 11 }}>{sale.referenceNo}</span></td>
                                <td><span className="cell-name">{sale.customerName || '—'}</span></td>
                                <td><span className="cell-muted">{sale.cashierName || sale.sellerName}</span></td>
                                <td className="th-right" style={{ fontWeight: 700 }}>{fmt(sale.totalAmount)} UZS</td>
                                <td className="th-center"><span className="cell-muted">{fmtDate(sale.completedAt)}</span></td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                {/* So'nggi xaridlar */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <Truck size={15} />
                        <h6 className="dash-card-title">So'nggi xaridlar</h6>
                        <button className="dash-card-link" onClick={() => navigate('/purchases')}>
                            Barchasi <ArrowUpRight size={12} />
                        </button>
                    </div>
                    {data.recentPurchases?.length > 0 ? (
                        <table className="ptable" style={{ fontSize: 13 }}>
                            <thead>
                            <tr>
                                <th>Raqam</th>
                                <th>Yetkazuvchi</th>
                                <th className="th-right">Summa</th>
                                <th className="th-center">Holat</th>
                                <th className="th-center">Sana</th>
                            </tr>
                            </thead>
                            <tbody>
                            {data.recentPurchases.map(p => {
                                const st = STATUS_PURCHASE[p.status] || {}
                                return (
                                    <tr key={p.id} style={{ cursor: 'pointer' }}
                                        onClick={() => navigate(`/purchases/${p.id}`)}>
                                        <td><span className="cell-muted" style={{ fontSize: 11 }}>{p.referenceNo}</span></td>
                                        <td><span className="cell-name">{p.supplierName}</span></td>
                                        <td className="th-right" style={{ fontWeight: 700 }}>
                                            {p.totalDisplay || (fmt(p.totalAmount) + ' UZS')}
                                        </td>
                                        <td className="th-center">
                                            <span style={{
                                                fontSize: 11, padding: '2px 8px', borderRadius: 20,
                                                fontWeight: 600, color: st.color,
                                                background: st.color + '18'
                                            }}>{st.label}</span>
                                        </td>
                                        <td className="th-center"><span className="cell-muted">{p.createdAt}</span></td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="table-empty" style={{ padding: '24px 0' }}>
                            <Truck size={32} strokeWidth={1} />
                            <p>Xarid yo'q</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}