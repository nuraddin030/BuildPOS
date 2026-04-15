import { useState, useEffect, useCallback } from 'react'
import {
    TrendingUp, TrendingDown, DollarSign, Percent, ShoppingBag,
    Receipt, Wallet, CreditCard, ArrowRightLeft, AlertTriangle, Loader2
} from 'lucide-react'
import api from '../api/api'
import '../styles/ReportsPage.css'

const fmt = (n) => n == null ? '0' : String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const fmtDec = (n) => n == null ? '0.00' : Number(n).toFixed(1)

const PERIODS = [
    { key: 'today',       label: 'Bugun' },
    { key: 'week',        label: 'Shu hafta' },
    { key: 'month',       label: 'Shu oy' },
    { key: 'last_month',  label: "O'tgan oy" },
    { key: 'year',        label: 'Shu yil' },
    { key: 'custom',      label: 'Maxsus' },
]

function periodDates(key) {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
    const today = iso(now)
    if (key === 'today') return { from: today, to: today }
    if (key === 'week') {
        const mon = new Date(now)
        mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
        return { from: iso(mon), to: today }
    }
    if (key === 'month') {
        return { from: `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`, to: today }
    }
    if (key === 'last_month') {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lme = new Date(now.getFullYear(), now.getMonth(), 0)
        return { from: iso(lm), to: iso(lme) }
    }
    if (key === 'year') {
        return { from: `${now.getFullYear()}-01-01`, to: today }
    }
    return null
}

function KpiCard({ label, value, unit = 'UZS', sub, color, icon, warn }) {
    const Icon = icon
    return (
        <div className="rp-kpi" style={{ borderTop: `3px solid ${color}` }}>
            <div className="rp-kpi-icon" style={{ background: color + '18', color }}>
                <Icon size={20} />
            </div>
            <div className="rp-kpi-body">
                <span className="rp-kpi-label">{label}</span>
                <span className="rp-kpi-value">{value} <span className="rp-kpi-unit">{unit}</span></span>
                {sub && <span className={`rp-kpi-sub${warn ? ' rp-kpi-sub--warn' : ''}`}>{sub}</span>}
            </div>
        </div>
    )
}

function PayRow({ label, icon, value, total, color }) {
    const Icon = icon
    const pct = total > 0 ? Math.round(Number(value) / total * 100) : 0
    return (
        <div className="rp-pay-row">
            <div className="rp-pay-left">
                <div className="rp-pay-icon" style={{ background: color + '18', color }}><Icon size={13} /></div>
                <span className="rp-pay-label">{label}</span>
            </div>
            <div className="rp-pay-right">
                <span className="rp-pay-val" style={{ color }}>{fmt(value)} UZS</span>
                <span className="rp-pay-pct">{pct}%</span>
            </div>
            <div className="rp-pay-track">
                <div className="rp-pay-bar" style={{ width: `${pct}%`, background: color }} />
            </div>
        </div>
    )
}

export default function ReportsPage() {
    const [period, setPeriod] = useState('month')
    const [customFrom, setCustomFrom] = useState('')
    const [customTo,   setCustomTo]   = useState('')
    const [data,    setData]    = useState(null)
    const [_fetching, setFetching] = useState(false)
    const [error,   setError]   = useState('')

    // period o'zgarganda avtomatik yuklash
    useEffect(() => {
        if (period === 'custom') return
        const dates = periodDates(period)
        let alive = true
        api.get(`/api/v1/reports/pl?from=${dates.from}&to=${dates.to}`)
            .then(r => { if (alive) { setData(r.data); setError(''); setFetching(false) } })
            .catch(() => { if (alive) { setError("Ma'lumot yuklanmadi"); setFetching(false) } })
        return () => { alive = false }
    }, [period])

    // Maxsus sana tugmasi uchun
    const load = useCallback(() => {
        if (!customFrom || !customTo) return
        setFetching(true)
        api.get(`/api/v1/reports/pl?from=${customFrom}&to=${customTo}`)
            .then(r => { setData(r.data); setError(''); setFetching(false) })
            .catch(() => { setError("Ma'lumot yuklanmadi"); setFetching(false) })
    }, [customFrom, customTo])

    const loading = !data && !error

    const totalPay = Number(data?.cash||0) + Number(data?.card||0) +
                     Number(data?.transfer||0) + Number(data?.debt||0)

    const maxTrend = data?.monthlyTrend
        ? Math.max(...data.monthlyTrend.map(m => Number(m.revenue) || 0), 1)
        : 1

    return (
        <div className="rp-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                        <TrendingUp size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">P&amp;L Hisoboti</h1>
                        <p className="page-subtitle">Foyda va zarar tahlili</p>
                    </div>
                </div>
            </div>

            {/* Period selector */}
            <div className="rp-periods">
                {PERIODS.map(p => (
                    <button key={p.key}
                        className={`rp-period-btn${period === p.key ? ' active' : ''}`}
                        onClick={() => setPeriod(p.key)}>
                        {p.label}
                    </button>
                ))}
            </div>

            {period === 'custom' && (
                <div className="rp-custom-range">
                    <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                        className="rp-date-input" />
                    <span className="rp-date-sep">—</span>
                    <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                        className="rp-date-input" />
                    <button className="rp-load-btn" onClick={load}
                        disabled={!customFrom || !customTo}>
                        Ko'rsatish
                    </button>
                </div>
            )}

            {loading && (
                <div className="table-loading" style={{ minHeight: 200 }}>
                    <Loader2 size={28} className="spin" style={{ color: 'var(--primary)' }} />
                    <p>Yuklanmoqda...</p>
                </div>
            )}

            {error && (
                <div className="table-empty">
                    <AlertTriangle size={36} strokeWidth={1} />
                    <p>{error}</p>
                </div>
            )}

            {!loading && !error && data && (<>

            {/* KPI kartalar — 4 ta asosiy */}
            <div className="rp-kpi-grid">
                <KpiCard label="Daromad (Sotuv)"   value={fmt(data.revenue)}
                    icon={TrendingUp}  color="#2563eb"
                    sub={`${data.saleCount} ta sotuv • O'rtacha: ${fmt(data.avgSale)} UZS`} />
                <KpiCard label="Tannarx (COGS)"     value={fmt(data.cogs)}
                    icon={TrendingDown} color="#ef4444"
                    sub="Sotilgan tovarlar tannarxi" />
                <KpiCard label="Yalpi Foyda"         value={fmt(data.grossProfit)}
                    icon={DollarSign}  color="#10b981"
                    sub={`Chegirmalar: ${fmt(data.discounts)} UZS`} />
                <KpiCard label="Foyda Foizi"         value={fmtDec(data.grossMargin)}
                    unit="%" icon={Percent}   color="#7c3aed"
                    warn={Number(data.grossMargin) < 10}
                    sub={Number(data.grossMargin) < 10 ? 'Foydalilik past!' : 'Jami sotuvdan ulushi'} />
            </div>

            {/* Harajatlar banner — faqat harajat kiritilganda */}
            {Number(data.totalExpenses) > 0 && (
                <div className="rp-expense-banner">
                    <div className="rp-expense-item">
                        <div className="rp-expense-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                            <TrendingDown size={18} />
                        </div>
                        <div>
                            <div className="rp-expense-label">Harajatlar</div>
                            <div className="rp-expense-value" style={{ color: '#f59e0b' }}>
                                {fmt(data.totalExpenses)} <span className="rp-expense-unit">UZS</span>
                            </div>
                            <div className="rp-expense-sub">Davr davomidagi xarajatlar</div>
                        </div>
                    </div>

                    <div className="rp-expense-arrow">→</div>

                    <div className="rp-expense-item">
                        <div className="rp-expense-icon" style={{
                            background: Number(data.netProfit) >= 0 ? 'rgba(14,165,233,0.12)' : 'rgba(220,38,38,0.12)',
                            color: Number(data.netProfit) >= 0 ? '#0ea5e9' : '#dc2626'
                        }}>
                            <DollarSign size={18} />
                        </div>
                        <div>
                            <div className="rp-expense-label">Sof Foyda</div>
                            <div className="rp-expense-value" style={{
                                color: Number(data.netProfit) >= 0 ? '#0ea5e9' : '#dc2626'
                            }}>
                                {Number(data.netProfit) >= 0 ? '' : '−'}{fmt(Math.abs(Number(data.netProfit)))} <span className="rp-expense-unit">UZS</span>
                            </div>
                            <div className="rp-expense-sub">Yalpi foyda − harajatlar</div>
                        </div>
                    </div>
                </div>
            )}

            {/* O'rta qism */}
            <div className="rp-mid">

                {/* To'lov usullari */}
                <div className="rp-card">
                    <div className="rp-card-header">
                        <Receipt size={15} />
                        <h6>To'lov usullari</h6>
                        <span className="rp-card-total">{fmt(totalPay)} UZS</span>
                    </div>
                    <div className="rp-pay-list">
                        <PayRow label="Naqd"     icon={Wallet}         value={data.cash}     total={totalPay} color="#16a34a" />
                        <PayRow label="Karta"    icon={CreditCard}     value={data.card}     total={totalPay} color="#2563eb" />
                        <PayRow label="O'tkazma" icon={ArrowRightLeft} value={data.transfer} total={totalPay} color="#7c3aed" />
                        <PayRow label="Nasiya"   icon={ShoppingBag}    value={data.debt}     total={totalPay} color="#f59e0b" />
                    </div>
                </div>

                {/* Oylik trend */}
                <div className="rp-card">
                    <div className="rp-card-header">
                        <TrendingUp size={15} />
                        <h6>Oylik trend (12 oy)</h6>
                    </div>
                    <div className="rp-chart">
                        {data.monthlyTrend?.map((m, i) => {
                            const pct = Math.round(Number(m.revenue) / maxTrend * 100)
                            const cpct = Number(m.revenue) > 0
                                ? Math.round(Number(m.cogs) / Number(m.revenue) * pct)
                                : 0
                            return (
                                <div key={i} className="rp-chart-col">
                                    <div className="rp-chart-track">
                                        <div className="rp-chart-bar-cogs"
                                             style={{ height: `${Math.min(cpct, pct)}%` }}
                                             title={`Tannarx: ${fmt(m.cogs)} UZS`} />
                                        <div className="rp-chart-bar"
                                             style={{ height: `${Math.max(pct - cpct, pct > 0 ? 2 : 0)}%` }}
                                             title={`Foyda: ${fmt(m.profit)} UZS`} />
                                    </div>
                                    <span className="rp-chart-label">{m.label}</span>
                                </div>
                            )
                        })}
                    </div>
                    <div className="rp-chart-legend">
                        <span className="rp-legend-dot rp-legend-dot--profit" />Foyda
                        <span className="rp-legend-dot rp-legend-dot--cogs" />Tannarx
                    </div>
                </div>
            </div>

            {/* Top mahsulotlar */}
            <div className="rp-card">
                <div className="rp-card-header">
                    <TrendingUp size={15} />
                    <h6>Top 10 foydali mahsulotlar</h6>
                </div>

                {data.topProducts?.length > 0 ? (<>
                    <div className="rp-table-wrap">
                    <table className="ptable">
                        <thead>
                        <tr>
                            <th>#</th>
                            <th>Mahsulot</th>
                            <th className="th-right">Miqdor</th>
                            <th className="th-right">Daromad</th>
                            <th className="th-right">Tannarx</th>
                            <th className="th-right">Foyda</th>
                            <th className="th-right">Margin</th>
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
                                <td className="th-right">{fmt(p.quantity)}</td>
                                <td className="th-right" style={{ color: '#2563eb', fontWeight: 600 }}>{fmt(p.revenue)}</td>
                                <td className="th-right" style={{ color: '#ef4444' }}>{fmt(p.cogs)}</td>
                                <td className="th-right" style={{ color: '#10b981', fontWeight: 700 }}>{fmt(p.profit)}</td>
                                <td className="th-right">
                                    <span className={`rp-margin-badge${Number(p.margin) < 10 ? ' warn' : ''}`}>
                                        {fmtDec(p.margin)}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                    {/* Mobil kard ko'rinishi */}
                    <div className="dash-mob-list">
                    {data.topProducts.map((p, i) => (
                        <div key={i} className="dash-mob-row">
                            <div className="dash-mob-left">
                                <div className="dash-mob-name">{i+1}. {p.productName}</div>
                                <div className="dash-mob-sub">{p.unitSymbol} · {fmt(p.quantity)} dona</div>
                            </div>
                            <div className="dash-mob-right">
                                <div className="dash-mob-amount" style={{ color: '#10b981' }}>+{fmt(p.profit)} UZS</div>
                                <div className="dash-mob-meta">{fmtDec(p.margin)}% margin</div>
                            </div>
                        </div>
                    ))}
                    </div>
                </>) : (
                    <div className="table-empty" style={{ padding: '24px 0' }}>
                        <ShoppingBag size={32} strokeWidth={1} />
                        <p>Bu davrda sotuv yo'q</p>
                    </div>
                )}
            </div>

            </>)}
        </div>
    )
}
