import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
    TrendingUp, TrendingDown, CalendarDays, AlertTriangle,
    ShoppingCart, Wallet, CreditCard, ArrowRightLeft,
    BarChart3, Receipt, Inbox
} from 'lucide-react'
import api from '../api/api'
import '../styles/ui.css'
import '../styles/dashboard.css'

const fmt = (num) => String(Math.round(num || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

export default function DashboardPage() {
    const { t } = useTranslation()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/api/v1/dashboard')
            .then((res) => setData(res.data))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="dash-loading">
                <div className="dash-spinner" />
                <span>{t('common.loading')}</span>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="dash-error">
                <AlertTriangle size={20} />
                <span>{t('common.error')}</span>
            </div>
        )
    }

    return (
        <div className="dashboard-wrapper">

            {/* Page header */}
            <div className="dash-header">
                <h5 className="dash-title">{t('dashboard.title')}</h5>
                <span className="dash-date">
                    <CalendarDays size={14} />
                    {new Date().toLocaleDateString('uz-UZ', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </span>
            </div>

            {/* ===== KPI KARTALAR ===== */}
            <div className="kpi-grid">

                {/* Today Sales */}
                <div className="kpi-card kpi-card--blue">
                    <div className="kpi-icon-wrap kpi-icon--blue">
                        <ShoppingCart size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">{t('dashboard.today_sales')}</span>
                        <span className="kpi-value">{fmt(data.todaySaleAmount)}</span>
                        <span className="kpi-sub">{data.todaySaleCount} ta sotuv</span>
                    </div>
                    <TrendingUp size={16} className="kpi-trend kpi-trend--up" />
                </div>

                {/* Month Sales */}
                <div className="kpi-card kpi-card--green">
                    <div className="kpi-icon-wrap kpi-icon--green">
                        <TrendingUp size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">{t('dashboard.month_sales')}</span>
                        <span className="kpi-value">{fmt(data.monthSaleAmount)}</span>
                        <span className="kpi-sub">Joriy oy</span>
                    </div>
                </div>

                {/* Customer Debt */}
                <div className="kpi-card kpi-card--amber">
                    <div className="kpi-icon-wrap kpi-icon--amber">
                        <Wallet size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">{t('dashboard.customer_debt')}</span>
                        <span className="kpi-value">{fmt(data.totalCustomerDebt)}</span>
                        {data.overdueDebtCount > 0 ? (
                            <span className="kpi-sub kpi-sub--warn">
                                <AlertTriangle size={12} />
                                {data.overdueDebtCount} ta {t('dashboard.overdue_debts')}
                            </span>
                        ) : (
                            <span className="kpi-sub">Mijozlardan</span>
                        )}
                    </div>
                </div>

                {/* Supplier Debt */}
                <div className="kpi-card kpi-card--red">
                    <div className="kpi-icon-wrap kpi-icon--red">
                        <TrendingDown size={20} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">{t('dashboard.supplier_debt')}</span>
                        <span className="kpi-value">{fmt(data.totalSupplierDebt)}</span>
                        <span className="kpi-sub">Yetkazuvchilarga</span>
                    </div>
                </div>

            </div>

            {/* ===== O'RTA QISM: To'lovlar + Grafik ===== */}
            <div className="dash-mid-grid">

                {/* Today Payments */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <Receipt size={16} className="dash-card-icon" />
                        <h6 className="dash-card-title">{t('dashboard.today_amount')}</h6>
                    </div>
                    <div className="payment-grid">
                        <div className="payment-item">
                            <div className="payment-icon-wrap payment-icon--green">
                                <Wallet size={18} />
                            </div>
                            <div className="payment-info">
                                <span className="payment-label">{t('dashboard.cash')}</span>
                                <span className="payment-value payment-value--green">{fmt(data.todayCash)}</span>
                            </div>
                        </div>
                        <div className="payment-item">
                            <div className="payment-icon-wrap payment-icon--blue">
                                <CreditCard size={18} />
                            </div>
                            <div className="payment-info">
                                <span className="payment-label">{t('dashboard.card')}</span>
                                <span className="payment-value payment-value--blue">{fmt(data.todayCard)}</span>
                            </div>
                        </div>
                        <div className="payment-item">
                            <div className="payment-icon-wrap payment-icon--cyan">
                                <ArrowRightLeft size={18} />
                            </div>
                            <div className="payment-info">
                                <span className="payment-label">{t('dashboard.transfer')}</span>
                                <span className="payment-value payment-value--cyan">{fmt(data.todayTransfer)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Weekly Chart */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <BarChart3 size={16} className="dash-card-icon" />
                        <h6 className="dash-card-title">{t('dashboard.weekly_chart')}</h6>
                    </div>
                    <div className="chart-area">
                        {data.weeklySales?.map((day, i) => {
                            const max = Math.max(...data.weeklySales.map(d => d.amount || 0), 1)
                            const pct = Math.round(((day.amount || 0) / max) * 100)
                            return (
                                <div key={i} className="chart-col">
                                    <div className="chart-bar-track">
                                        <div
                                            className="chart-bar"
                                            style={{ height: `${pct}%`, minHeight: 6 }}
                                            title={`${day.day}: ${fmt(day.amount)}`}
                                        />
                                    </div>
                                    <span className="chart-day">{day.day?.slice(0, 2)}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>

            {/* ===== SO'NGGI SOTUVLAR JADVALI ===== */}
            <div className="dash-card dash-card--table">
                <div className="dash-card-header">
                    <Receipt size={16} className="dash-card-icon" />
                    <h6 className="dash-card-title">{t('dashboard.recent_sales')}</h6>
                </div>

                <div className="table-responsive">
                    <table className="dash-table">
                        <thead>
                        <tr>
                            <th>#</th>
                            <th>{t('sales.customer')}</th>
                            <th>{t('sales.seller')}</th>
                            <th className="text-end">{t('sales.total')}</th>
                            <th>{t('common.date')}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {data.recentSales?.length === 0 && (
                            <tr>
                                <td colSpan={5} className="empty-state">
                                    <Inbox size={32} className="empty-icon" />
                                    <span>{t('sales.information')}</span>
                                </td>
                            </tr>
                        )}
                        {data.recentSales?.map((sale) => (
                            <tr key={sale.id}>
                                <td className="cell-muted">{sale.referenceNo}</td>
                                <td className="cell-name">
                                    {sale.customerName || <span className="cell-muted">--</span>}
                                </td>
                                <td className="cell-muted">{sale.sellerName}</td>
                                <td className="text-end">
                                    <span className="amount-badge">{fmt(sale.totalAmount)}</span>
                                </td>
                                <td className="cell-muted">
                                    {sale.completedAt
                                        ? new Date(sale.completedAt).toLocaleDateString('uz-UZ')
                                        : '--'}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    )
}


// import { useState, useEffect } from 'react'
// import { useTranslation } from 'react-i18next'
// import api from '../api/api'
// import '../styles/ui.css'
// import '../styles/dashboard.css'
//
// const fmt = (num) =>
//     new Intl.NumberFormat('uz-UZ').format(Math.round(num || 0))
//
// export default function DashboardPage() {
//     const { t } = useTranslation()
//     const [data, setData] = useState(null)
//     const [loading, setLoading] = useState(true)
//
//     useEffect(() => {
//         api.get('/api/v1/dashboard')
//             .then((res) => setData(res.data))
//             .catch(console.error)
//             .finally(() => setLoading(false))
//     }, [])
//
//     if (loading) return <div className="text-center py-5">{t('common.loading')}</div>
//     if (!data) return <div className="alert alert-danger">{t('common.error')}</div>
//
//     return (
//         <div className="dashboard-wrapper">
//             <h5 className="mb-4 fw-bold">{t('dashboard.title')}</h5>
//
//            {/* Stat kartalar */}
//             <div className="row g-4 mb-4 align-items-stretch">
//
//                 {/* Today Sales */}
//                 <div className="col-12 col-sm-6 col-lg-3 d-flex">
//                     <div className="ui-card flex-fill">
//                         <div className="text-muted small mb-2">
//                             {t('dashboard.today_sales')}
//                         </div>
//
//                         <div className="kpi-value text-primary">
//                             {fmt(data.todaySaleAmount)}
//                         </div>
//
//                         <div className="text-muted small">
//                             {data.todaySaleCount} ta sotuv
//                         </div>
//                     </div>
//                 </div>
//
//                 {/* Month Sales */}
//                 <div className="col-12 col-sm-6 col-lg-3 d-flex">
//                     <div className="ui-card flex-fill">
//                         <div className="text-muted small mb-2">
//                             {t('dashboard.month_sales')}
//                         </div>
//
//                         <div className="kpi-value text-success">
//                             {fmt(data.monthSaleAmount)}
//                         </div>
//
//                         <div className="text-muted small">
//                             Joriy oy
//                         </div>
//                     </div>
//                 </div>
//
//                 {/* Customer Debt */}
//                 <div className="col-12 col-sm-6 col-lg-3 d-flex">
//                     <div className="ui-card flex-fill">
//                         <div className="text-muted small mb-2">
//                             {t('dashboard.customer_debt')}
//                         </div>
//
//                         <div className="kpi-value text-warning">
//                             {fmt(data.totalCustomerDebt)}
//                         </div>
//
//                         {data.overdueDebtCount > 0 && (
//                             <div className="text-danger small mt-1">
//                                 ⚠ {data.overdueDebtCount} ta {t('dashboard.overdue_debts')}
//                             </div>
//                         )}
//                     </div>
//                 </div>
//
//                 {/* Supplier Debt */}
//                 <div className="col-12 col-sm-6 col-lg-3 d-flex">
//                     <div className="ui-card flex-fill">
//                         <div className="text-muted small mb-2">
//                             {t('dashboard.supplier_debt')}
//                         </div>
//
//                         <div className="kpi-value text-danger">
//                             {fmt(data.totalSupplierDebt)}
//                         </div>
//
//                         <div className="text-muted small">
//                             Yetkazuvchilarga
//                         </div>
//                     </div>
//                 </div>
//
//             </div>
//
//             {/* Bugungi to'lovlar */}
//             <div className="row g-4 mb-4 align-items-stretch">
//
//                 {/* Today Amount */}
//                 <div className="col-12 col-lg-6 d-flex">
//                     <div className="card stat-card flex-fill d-flex flex-column">
//                         <div className="card-body d-flex flex-column">
//                             <h6 className="card-title text-muted mb-4">
//                                 {t('dashboard.today_amount')}
//                             </h6>
//
//                             <div className="row g-2 text-center flex-grow-1 align-items-center">
//                                 <div className="col-4">
//                                     <div className="small text-muted">
//                                         {t('dashboard.cash')}
//                                     </div>
//                                     <div className="fw-bold text-success">
//                                         {fmt(data.todayCash)}
//                                     </div>
//                                 </div>
//
//                                 <div className="col-4">
//                                     <div className="small text-muted">
//                                         {t('dashboard.card')}
//                                     </div>
//                                     <div className="fw-bold text-primary">
//                                         {fmt(data.todayCard)}
//                                     </div>
//                                 </div>
//
//                                 <div className="col-4">
//                                     <div className="small text-muted">
//                                         {t('dashboard.transfer')}
//                                     </div>
//                                     <div className="fw-bold text-info">
//                                         {fmt(data.todayTransfer)}
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//
//                 {/* Weekly Chart */}
//                 <div className="col-12 col-lg-6 d-flex">
//                     <div className="card stat-card flex-fill d-flex flex-column">
//                         <div className="card-body d-flex flex-column">
//                             <h6 className="card-title text-muted mb-4">
//                                 {t('dashboard.weekly_chart')}
//                             </h6>
//
//                             <div className="d-flex align-items-end gap-2 flex-grow-1">
//                                 {data.weeklySales?.map((day, i) => {
//                                     const max = Math.max(...data.weeklySales.map(d => d.amount || 0), 1)
//                                     const height = Math.round(((day.amount || 0) / max) * 100)
//
//                                     return (
//                                         <div key={i} className="flex-fill text-center">
//                                             <div
//                                                 className="mini-bar"
//                                                 style={{
//                                                     height: `${height}%`,
//                                                     minHeight: 6
//                                                 }}
//                                                 title={`${day.day}: ${fmt(day.amount)}`}
//                                             />
//                                             <div className="small text-muted mt-2">
//                                                 {day.day?.slice(0, 2)}
//                                             </div>
//                                         </div>
//                                     )
//                                 })}
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//
//             </div>
//
//             {/* So'nggi sotuvlar */}
//             <div className="ui-card p-0 overflow-hidden">
//
//                 <div className="p-4 border-bottom">
//                     <h6 className="mb-0 fw-semibold">
//                         {t('dashboard.recent_sales')}
//                     </h6>
//                 </div>
//
//                 <div className="table-responsive">
//                     <table className="table align-middle mb-0 modern-table">
//                         <thead>
//                         <tr>
//                             <th>#</th>
//                             <th>{t('sales.customer')}</th>
//                             <th>{t('sales.seller')}</th>
//                             <th>{t('sales.total')}</th>
//                             <th>{t('common.date')}</th>
//                         </tr>
//                         </thead>
//
//                         <tbody>
//
//                         {data.recentSales?.length === 0 && (
//                             <tr>
//                                 <td colSpan={5} className="text-center py-5 text-muted">
//                                     <div style={{ fontSize: 32 }}>📭</div>
//                                     <div className="mt-2">
//                                         {t('sales.information')}
//                                     </div>
//                                 </td>
//                             </tr>
//                         )}
//
//                         {data.recentSales?.map((sale) => (
//                             <tr key={sale.id} className="table-row-hover">
//
//                                 <td className="ps-4 text-muted small">
//                                     {sale.referenceNo}
//                                 </td>
//
//                                 <td>
//                                     {sale.customerName || (
//                                         <span className="text-muted">—</span>
//                                     )}
//                                 </td>
//
//                                 <td className="text-muted">
//                                     {sale.sellerName}
//                                 </td>
//
//                                 <td className="text-end">
//               <span className="amount-badge">
//                 {fmt(sale.totalAmount)}
//               </span>
//                                 </td>
//
//                                 <td className="pe-4 text-muted small">
//                                     {sale.completedAt
//                                         ? new Date(sale.completedAt).toLocaleDateString('uz-UZ')
//                                         : '—'}
//                                 </td>
//
//                             </tr>
//                         ))}
//
//                         </tbody>
//                     </table>
//                 </div>
//
//             </div>
//         </div>
//     )
// }