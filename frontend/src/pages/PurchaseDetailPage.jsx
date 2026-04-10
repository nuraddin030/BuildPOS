import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    ShoppingCart, ArrowLeft, CheckCircle, XCircle, CreditCard,
    Loader2, AlertCircle, Package, Truck, Building2, Calendar,
    DollarSign, Clock, X, Plus, Search, FileText
} from 'lucide-react'
import { getPurchaseById, receivePurchase, addPayment, cancelPurchase, addItemToPurchase } from '../api/purchases'
import { getProducts, getProductById, getExchangeRate } from '../api/products'
import { useAuth } from '../context/AuthContext'
import { exportToPDF, exportToCSV, fmtNum } from '../utils/exportUtils'
import '../styles/ProductsPage.css'
import '../styles/PurchasesPage.css'

const fmt = (num) => num == null ? '0' : String(Math.round(Number(num))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const STATUS_MAP = {
    PENDING:            { label: 'Kutilmoqda',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    PARTIALLY_RECEIVED: { label: 'Qisman qabul',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    RECEIVED:           { label: 'Qabul qilindi', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    CANCELLED:          { label: 'Bekor qilindi', color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
}

const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Naqd' },
    { value: 'CARD', label: 'Karta' },
    { value: 'BANK_TRANSFER', label: 'Bank o\'tkazma' },
    { value: 'OTHER', label: 'Boshqa' },
]

const fmtPrice = (val) => {
    if (val === '' || val === null || val === undefined) return ''
    const num = String(val).replace(/[^\d]/g, '')
    if (!num) return ''
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const EMPTY_NEW_ITEM = {
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

export default function PurchaseDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { hasPermission } = useAuth()

    const [purchase, setPurchase] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Payment modal
    const [showPayment, setShowPayment] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('CASH')
    const [paymentNote, setPaymentNote] = useState('')
    const [paymentCurrency, setPaymentCurrency] = useState('UZS')
    const [paymentSaving, setPaymentSaving] = useState(false)
    const [paymentError, setPaymentError] = useState('')

    // Actions loading
    const [receiving, setReceiving] = useState(false)
    const [cancelling, setCancelling] = useState(false)
    const [pdfLoading, setPdfLoading] = useState(false)

    const [showReceive, setShowReceive] = useState(false)
    const [receiveItems, setReceiveItems] = useState([])

    // ✅ PENDING xaridga yangi item qo'shish
    const [showAddItem, setShowAddItem] = useState(false)
    const [newItem, setNewItem] = useState({ ...EMPTY_NEW_ITEM })
    const [addingItem, setAddingItem] = useState(false)
    const [addItemError, setAddItemError] = useState('')
    const [itemSearch, setItemSearch] = useState('')
    const [itemResults, setItemResults] = useState([])
    const [itemSearching, setItemSearching] = useState(false)
    const [exchangeRate, setExchangeRate] = useState(12700)
    const searchTimeout = useRef(null)

    const load = () => {
        setLoading(true)
        getPurchaseById(id)
            .then(res => setPurchase(res.data))
            .catch(() => setError('Xarid topilmadi'))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        load()
        getExchangeRate().then(res => setExchangeRate(Number(res.data?.rate) || 12700)).catch(() => {})
    }, [id])

    const handleReceive = () => {
        setReceiveItems(
            purchase.items
                .filter(i => Number(i.remainingQty) > 0)
                .map(i => ({
                    purchaseItemId: i.id,
                    productName: i.productName,
                    unitSymbol: i.unitSymbol,
                    orderedQty: i.quantity,
                    remainingQty: i.remainingQty,
                    receivedQty: String(i.remainingQty),
                    unitPrice: String(i.unitPrice),
                    currency: i.currency || 'UZS',
                }))
        )
        setShowReceive(true)
    }

    const handleCancel = async () => {
        if (!confirm('Bu xaridni bekor qilishni tasdiqlaysizmi?')) return
        setCancelling(true)
        try {
            await cancelPurchase(id)
            load()
        } catch (e) {
            alert(e.response?.data?.message || 'Xatolik')
        } finally { setCancelling(false) }
    }

    const handleAddPayment = async () => {
        if (!paymentAmount || Number(paymentAmount) <= 0) {
            setPaymentError("Summa kiritilishi shart"); return
        }
        setPaymentSaving(true); setPaymentError('')
        try {
            await addPayment(id, {
                amount: Number(paymentAmount),
                currency: paymentCurrency,
                paymentMethod,
                note: paymentNote || undefined,
            })
            setShowPayment(false)
            setPaymentAmount('')
            setPaymentNote('')
            setPaymentMethod('CASH')
            setPaymentCurrency('UZS')
            load()
        } catch (e) {
            setPaymentError(e.response?.data?.message || 'Xatolik')
        } finally { setPaymentSaving(false) }
    }

    const handleConfirmReceive = async () => {
        setReceiving(true)
        try {
            const items = receiveItems
                .filter(i => Number(i.receivedQty) > 0)
                .map(i => ({
                    purchaseItemId: i.purchaseItemId,
                    receivedQty: Number(i.receivedQty),
                    unitPrice: i.unitPrice ? Number(i.unitPrice) : undefined,
                }))
            await receivePurchase(id, { items })
            setShowReceive(false)
            load()
        } catch (e) {
            alert(e.response?.data?.message || 'Xatolik')
        } finally { setReceiving(false) }
    }

    // ✅ Mahsulot qidirish (add item modal)
    const searchProduct = (val) => {
        setItemSearch(val)
        clearTimeout(searchTimeout.current)
        if (!val.trim()) { setItemResults([]); return }
        searchTimeout.current = setTimeout(async () => {
            setItemSearching(true)
            try {
                const res = await getProducts({ search: val, size: 10, sort: 'name,asc' })
                setItemResults(res.data.content || [])
            } catch {}
            finally { setItemSearching(false) }
        }, 350)
    }

    const selectItemProduct = async (product) => {
        try {
            const res = await getProductById(product.id)
            const full = res.data
            const unit = full.units?.[0] || full.productUnits?.[0]
            setNewItem(prev => ({
                ...prev,
                productUnitId: unit?.id,
                productName: full.name,
                unitSymbol: unit?.unitSymbol || unit?.symbol || '',
                salePrice: unit?.salePrice || '',
                minPrice: unit?.minPrice || '',
            }))
        } catch {}
        setItemSearch('')
        setItemResults([])
    }

    // ✅ PENDING xaridga item qo'shish
    const handleAddItem = async () => {
        if (!newItem.productUnitId) { setAddItemError('Mahsulot tanlanishi shart'); return }
        if (!newItem.quantity || Number(newItem.quantity) <= 0) { setAddItemError('Miqdor kiritilishi shart'); return }
        if (!newItem.unitPrice || Number(newItem.unitPrice) <= 0) { setAddItemError('Tannarx kiritilishi shart'); return }
        // BUG FIX: exchangeRate bo'sh bo'lsa global kursni ishlatamiz
        const effectiveRate = newItem.currency === 'USD'
            ? (Number(newItem.exchangeRate) || Number(exchangeRate))
            : undefined

        setAddingItem(true); setAddItemError('')
        try {
            await addItemToPurchase(id, {
                productUnitId: newItem.productUnitId,
                quantity: Number(newItem.quantity),
                unitPrice: Number(newItem.unitPrice),
                currency: newItem.currency,
                exchangeRate: effectiveRate,
                updatePrices: newItem.updatePrices,
                salePrice: newItem.updatePrices && newItem.salePrice ? Number(newItem.salePrice) : undefined,
                minPrice: newItem.updatePrices && newItem.minPrice ? Number(newItem.minPrice) : undefined,
            })
            setShowAddItem(false)
            setNewItem({ ...EMPTY_NEW_ITEM })
            setItemSearch('')
            load()
        } catch (e) {
            setAddItemError(e.response?.data?.message || 'Xatolik yuz berdi')
        } finally { setAddingItem(false) }
    }

    if (loading) return (
        <div className="products-wrapper">
            <div className="table-loading"><Loader2 size={28} className="spin" /><p>Yuklanmoqda...</p></div>
        </div>
    )

    if (error || !purchase) return (
        <div className="products-wrapper">
            <div className="table-empty"><AlertCircle size={40} strokeWidth={1} /><p>{error || 'Topilmadi'}</p></div>
        </div>
    )

    const handlePDF = async () => {
        if (!purchase) return
        setPdfLoading(true)
        try {
            const isPending = ['PENDING', 'PARTIALLY_RECEIVED'].includes(purchase.status)
            const date = purchase.createdAt
                ? new Date(purchase.createdAt).toLocaleDateString('ru-RU')
                : '—'

            // jsPDF CDN dan yuklaymiz
            if (!window.jspdf?.jsPDF) {
                await new Promise((res, rej) => {
                    const s = document.createElement('script')
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
                    s.onload = res; s.onerror = rej
                    document.head.appendChild(s)
                })
                await new Promise((res, rej) => {
                    const s = document.createElement('script')
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
                    s.onload = res; s.onerror = rej
                    document.head.appendChild(s)
                })
            }

            const { jsPDF } = window.jspdf
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

            // ── Sarlavha ──────────────────────────────────────────
            doc.setFontSize(15); doc.setTextColor(30, 30, 30)
            doc.text(
                isPending
                    ? `Buyurtma varaqasi — ${purchase.referenceNo}`
                    : `Xarid hujjati — ${purchase.referenceNo}`,
                14, 16
            )
            doc.setFontSize(9); doc.setTextColor(100, 100, 100)
            doc.text(
                `Yetkazuvchi: ${purchase.supplierName || '—'}  |  Ombor: ${purchase.warehouseName || '—'}  |  Sana: ${date}`,
                14, 23
            )
            doc.setFontSize(8); doc.setTextColor(130, 130, 130)
            doc.text(
                `Chop etilgan: ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
                14, 29
            )

            let y = 33

            if (isPending) {
                // ── Buyurtma varaqasi — narxsiz ───────────────────
                doc.autoTable({
                    head: [['#', 'Mahsulot', 'Miqdor', 'Birlik']],
                    body: (purchase.items || []).map((item, i) => [
                        i + 1,
                        item.productName || '',
                        item.quantity || '',
                        item.unitSymbol || ''
                    ]),
                    startY: y,
                    styles: { fontSize: 9, cellPadding: 3 },
                    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [248, 249, 250] },
                    margin: { left: 14, right: 14 },
                    foot: [[
                        { content: `Jami: ${(purchase.items || []).length} ta mahsulot`, colSpan: 4,
                            styles: { fontStyle: 'bold', fillColor: [241, 245, 249] }
                        }
                    ]],
                    showFoot: 'lastPage',
                })
            } else {
                // ── To'liq hujjat — mahsulotlar ───────────────────
                const uzsItems = (purchase.items || []).filter(i => (i.currency || 'UZS') === 'UZS')
                const usdItems = (purchase.items || []).filter(i => i.currency === 'USD')

                const makeRows = (items, offset = 0) => items.map((item, i) => {
                    const total = Number(item.quantity || 0) * Number(item.unitPrice || 0)
                    const currency = item.currency || 'UZS'
                    return [
                        offset + i + 1,
                        item.productName || '',
                        item.quantity || '',
                        item.unitSymbol || '',
                        `${fmtNum(item.unitPrice)} ${currency}`,
                        `${fmtNum(total)} ${currency}`
                    ]
                })

                const allRows = makeRows(purchase.items || [])

                // Jami qatorlar
                const totalUzs = uzsItems.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0)
                const totalUsd = usdItems.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0)

                const footRow = []
                if (totalUzs > 0) footRow.push(`Jami UZS: ${fmtNum(totalUzs)} UZS`)
                if (totalUsd > 0) footRow.push(`Jami USD: ${fmtNum(totalUsd)} USD`)
                if (Number(purchase.debtUzs) > 0) footRow.push(`Qarz UZS: ${fmtNum(purchase.debtUzs)} UZS`)
                if (Number(purchase.debtUsd) > 0) footRow.push(`Qarz USD: ${fmtNum(purchase.debtUsd)} USD`)

                doc.autoTable({
                    head: [['#', 'Mahsulot', 'Miqdor', 'Birlik', 'Tan narx', 'Jami']],
                    body: allRows,
                    startY: y,
                    styles: { fontSize: 9, cellPadding: 3 },
                    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [248, 249, 250] },
                    margin: { left: 14, right: 14 },
                    foot: [[{
                        content: footRow.join('    |    '),
                        colSpan: 6,
                        styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [30, 30, 30] }
                    }]],
                    showFoot: 'lastPage',
                })

                // ── To'lovlar tarixi ──────────────────────────────
                if (purchase.payments?.length) {
                    const payY = doc.lastAutoTable.finalY + 10
                    doc.setFontSize(11); doc.setTextColor(30, 30, 30)
                    doc.text(`To'lovlar tarixi (${purchase.payments.length} ta)`, 14, payY)

                    doc.autoTable({
                        head: [['#', 'Sana', "To'lov usuli", 'Summa', 'Valyuta', 'Izoh']],
                        body: purchase.payments.map((p, i) => [
                            i + 1,
                            p.paidAt ? new Date(p.paidAt).toLocaleDateString('ru-RU') : '—',
                            p.paymentMethod || '',
                            fmtNum(p.amount),
                            p.currency || 'UZS',
                            p.notes || ''
                        ]),
                        startY: payY + 4,
                        styles: { fontSize: 9, cellPadding: 3 },
                        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
                        alternateRowStyles: { fillColor: [240, 253, 244] },
                        margin: { left: 14, right: 14 },
                    })
                }
            }

            doc.save(`${isPending ? 'buyurtma' : 'xarid'}_${purchase.referenceNo}.pdf`)
        } catch (e) {
            console.error('PDF xatosi:', e)
        } finally {
            setPdfLoading(false)
        }
    }
    const isPending = ['PENDING', 'PARTIALLY_RECEIVED'].includes(purchase.status)
    const st = STATUS_MAP[purchase.status] || {}

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <button className="act-btn" onClick={() => navigate('/purchases')} style={{ marginRight: 8 }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div className="page-icon-wrap"><ShoppingCart size={22} /></div>
                    <div>
                        <h1 className="page-title">{purchase.referenceNo}</h1>
                        <p className="page-subtitle">{purchase.supplierName}</p>
                    </div>
                </div>
                <div className="purchase-detail-actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                        color: st.color, background: st.bg
                    }}>{st.label}</span>

                    {/* PDF tugma */}
                    <button className="btn-reset" onClick={handlePDF} disabled={pdfLoading}
                            style={{ color: '#dc2626', borderColor: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {pdfLoading
                            ? <Loader2 size={14} className="spin" />
                            : <FileText size={14} />
                        }
                        {isPending ? 'Buyurtma PDF' : 'Hujjat PDF'}
                    </button>

                    {(purchase.status === 'PENDING' || purchase.status === 'PARTIALLY_RECEIVED') &&
                        hasPermission('PURCHASES_RECEIVE') && (
                            <button className="btn-add" style={{ background: '#10b981' }} onClick={handleReceive} disabled={receiving}>
                                {receiving ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />}
                                Qabul qilish
                            </button>
                        )}

                    {purchase.status !== 'CANCELLED' && purchase.status !== 'RECEIVED' &&
                        hasPermission('PURCHASES_DELETE') && (
                            <button className="btn-add" style={{ background: '#ef4444' }} onClick={handleCancel} disabled={cancelling}>
                                {cancelling ? <Loader2 size={14} className="spin" /> : <XCircle size={14} />}
                                Bekor qilish
                            </button>
                        )}
                </div>
            </div>

            <div className="purchase-detail-grid">
                {/* Asosiy ma'lumotlar */}
                <div className="table-card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Asosiy ma'lumotlar</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <InfoRow icon={<Truck size={14} />} label="Yetkazuvchi" value={purchase.supplierName} />
                        <InfoRow icon={<Building2 size={14} />} label="Ombor" value={purchase.warehouseName} />
                        <InfoRow icon={<Calendar size={14} />} label="Yaratilgan" value={purchase.createdAt ? new Date(purchase.createdAt).toLocaleDateString('ru-RU') : '—'} />
                        <InfoRow icon={<Calendar size={14} />} label="Qabul sanasi" value={purchase.receivedAt ? new Date(purchase.receivedAt).toLocaleDateString('ru-RU') : '—'} />
                        {purchase.notes && <InfoRow icon={<Clock size={14} />} label="Izoh" value={purchase.notes} />}
                    </div>
                </div>

                {/* Moliyaviy ma'lumotlar - multi-currency */}
                <div className="table-card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Moliyaviy holat</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                        {/* USD qism */}
                        {Number(purchase.totalUsd) > 0 && (
                            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', marginBottom: 6, letterSpacing: 0.5 }}>USD QISM</div>
                                <MultiCurrencyRow label="Jami" amount={purchase.totalUsd} currency="USD" />
                                <MultiCurrencyRow label="To'langan" amount={purchase.paidUsd} currency="USD" color="#10b981" />
                                <div style={{ borderTop: '1px solid rgba(59,130,246,0.15)', marginTop: 6, paddingTop: 6 }}>
                                    <MultiCurrencyRow label="Qarz" amount={purchase.debtUsd} currency="USD"
                                                      color={Number(purchase.debtUsd) > 0 ? '#ef4444' : '#10b981'} bold />
                                </div>
                                {purchase.status !== 'CANCELLED' && Number(purchase.debtUsd) > 0 && hasPermission('PURCHASES_PAY') && (
                                    <button className="btn-add" style={{ marginTop: 8, width: '100%', justifyContent: 'center', fontSize: 13, background: '#3b82f6' }}
                                            onClick={() => { setPaymentCurrency('USD'); setShowPayment(true) }}>
                                        <CreditCard size={13} /> USD da to'lash
                                    </button>
                                )}
                            </div>
                        )}

                        {/* UZS qism */}
                        {Number(purchase.totalUzs) > 0 && (
                            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginBottom: 6, letterSpacing: 0.5 }}>UZS QISM</div>
                                <MultiCurrencyRow label="Jami" amount={purchase.totalUzs} currency="UZS" />
                                <MultiCurrencyRow label="To'langan" amount={purchase.paidUzs} currency="UZS" color="#10b981" />
                                <div style={{ borderTop: '1px solid rgba(16,185,129,0.15)', marginTop: 6, paddingTop: 6 }}>
                                    <MultiCurrencyRow label="Qarz" amount={purchase.debtUzs} currency="UZS"
                                                      color={Number(purchase.debtUzs) > 0 ? '#ef4444' : '#10b981'} bold />
                                </div>
                                {purchase.status !== 'CANCELLED' && Number(purchase.debtUzs) > 0 && hasPermission('PURCHASES_PAY') && (
                                    <button className="btn-add" style={{ marginTop: 8, width: '100%', justifyContent: 'center', fontSize: 13 }}
                                            onClick={() => { setPaymentCurrency('UZS'); setShowPayment(true) }}>
                                        <CreditCard size={13} /> UZS da to'lash
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Faqat bitta valyuta bo'lsa oddiy ko'rinish */}
                        {Number(purchase.totalUsd) === 0 && Number(purchase.totalUzs) === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <AmountRow label="Jami summa" amount={purchase.totalAmount} color="var(--text-primary)" />
                                <AmountRow label="To'langan" amount={purchase.paidAmount} color="#10b981" />
                                <div style={{ borderTop: '1.5px solid var(--border-color)', paddingTop: 10 }}>
                                    <AmountRow label="Qarz" amount={purchase.debtAmount}
                                               color={Number(purchase.debtAmount) > 0 ? '#ef4444' : '#10b981'} bold />
                                </div>
                                {purchase.status !== 'CANCELLED' && Number(purchase.debtAmount) > 0 && hasPermission('PURCHASES_PAY') && (
                                    <button className="btn-add" style={{ marginTop: 4 }} onClick={() => { setPaymentCurrency('UZS'); setShowPayment(true) }}>
                                        <CreditCard size={14} /> To'lov qo'shish
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mahsulotlar */}
            <div className="table-card" style={{ padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                        <Package size={15} style={{ display: 'inline', marginRight: 6 }} />
                        Mahsulotlar ({purchase.items?.length || 0} ta)
                    </div>
                    {/* ✅ Faqat PENDING da "Mahsulot qo'shish" tugmasi */}
                    {isPending && hasPermission('PURCHASES_CREATE') && (
                        <button className="btn-add" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => { setShowAddItem(true); setAddItemError('') }}>
                            <Plus size={14} /> Mahsulot qo'shish
                        </button>
                    )}
                </div>
                <div className="purchase-items-table-wrapper">
                    <div className="table-responsive">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th>Mahsulot</th>
                                <th className="th-center">O'lchov</th>
                                <th className="th-right">Miqdor</th>
                                <th className="th-right">Narx</th>
                                <th className="th-center">Valyuta</th>
                                <th className="th-right">Jami (UZS)</th>
                                <th className="th-right">Qabul qilindi</th>
                                <th className="th-right">Qoldi</th>
                            </tr>
                            </thead>
                            <tbody>
                            {(purchase.items || []).map((item, i) => (
                                <tr key={item.id}>
                                    <td className="cell-num">{i + 1}</td>
                                    <td><div className="cell-name">{item.productName}</div></td>
                                    <td className="th-center"><span className="cell-muted">{item.unitSymbol}</span></td>
                                    <td className="th-right">{fmt(item.quantity)}</td>
                                    <td className="th-right">
                                        {fmt(item.unitPrice)}
                                        {item.currency === 'USD' && item.exchangeRate && (
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                kurs: {fmt(item.exchangeRate)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="th-center">
                                        <span style={{
                                            fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                                            color: item.currency === 'USD' ? '#3b82f6' : 'var(--text-muted)',
                                            background: item.currency === 'USD' ? 'rgba(59,130,246,0.1)' : 'var(--surface-2)'
                                        }}>{item.currency || 'UZS'}</span>
                                    </td>
                                    <td className="th-right" style={{ fontWeight: 600 }}>{fmt(item.totalPrice)}</td>
                                    <td className="th-right" style={{ color: '#10b981' }}>{fmt(item.receivedQty)}</td>
                                    <td className="th-right" style={{ color: Number(item.remainingQty) > 0 ? '#f59e0b' : '#10b981' }}>
                                        {fmt(item.remainingQty)}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="purchase-items-cards">
                    {(purchase.items || []).map((item) => (
                        <div key={item.id} className="purchase-item-card">
                            <div className="purchase-item-name">{item.productName}</div>
                            <div className="purchase-item-row">
                                <span>O'lchov</span>
                                <span>{item.unitSymbol} &nbsp; {fmt(item.quantity)} ta</span>
                            </div>
                            <div className="purchase-item-row">
                                <span>Narx</span>
                                <span>{fmt(item.unitPrice)} {item.currency || 'UZS'}</span>
                            </div>
                            <div className="purchase-item-total">
                                <span>Jami</span>
                                <span>{fmt(item.totalPrice)} UZS</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* To'lovlar tarixi */}
            <div className="table-card" style={{ padding: '16px 20px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
                    <CreditCard size={15} style={{ display: 'inline', marginRight: 6 }} />
                    To'lovlar tarixi ({purchase.payments?.length || 0} ta)
                </div>
                {!purchase.payments?.length ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                        To'lovlar yo'q
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th className="th-right">Summa</th>
                                <th className="th-center">Valyuta</th>
                                <th className="th-center">Usul</th>
                                <th>Izoh</th>
                                <th className="th-center">Sana</th>
                                <th className="th-center">Kim</th>
                            </tr>
                            </thead>
                            <tbody>
                            {purchase.payments.map((p, i) => (
                                <tr key={p.id}>
                                    <td className="cell-num">{i + 1}</td>
                                    <td className="th-right" style={{ fontWeight: 700, color: '#10b981' }}>
                                        {(p.currency || 'UZS') === 'USD'
                                            ? (Number(p.amount)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
                                            : fmt(p.amount)
                                        } {p.currency || 'UZS'}
                                    </td>
                                    <td className="th-center">
                                        <span style={{
                                            fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                                            color: (p.currency||'UZS')==='USD' ? '#3b82f6' : '#10b981',
                                            background: (p.currency||'UZS')==='USD' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)'
                                        }}>{p.currency || 'UZS'}</span>
                                    </td>
                                    <td className="th-center">
                                        <span style={{
                                            fontSize: 12, padding: '2px 8px', borderRadius: 10,
                                            background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600
                                        }}>
                                            {PAYMENT_METHODS.find(m => m.value === p.paymentMethod)?.label || p.paymentMethod}
                                        </span>
                                    </td>
                                    <td><span className="cell-muted">{p.note || '—'}</span></td>
                                    <td className="th-center">
                                        <span className="cell-muted" style={{ fontSize: 12 }}>
                                            {p.paidAt ? new Date(p.paidAt).toLocaleDateString('ru-RU') : '—'}
                                        </span>
                                    </td>
                                    <td className="th-center">
                                        <span className="cell-muted">{p.paidBy || '—'}</span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* To'lov modal */}
            {showPayment && (
                <div className="modal-overlay" onClick={() => setShowPayment(false)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <CreditCard size={20} />
                                <div><h6 className="modal-title">To'lov qo'shish</h6></div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowPayment(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            {paymentError && <div className="form-error"><AlertCircle size={16} />{paymentError}</div>}
                            {/* Valyuta va qarz ko'rsatish */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                                {[
                                    { cur: 'USD', debt: purchase.debtUsd, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
                                    { cur: 'UZS', debt: purchase.debtUzs, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
                                ].filter(x => Number(x.debt) > 0).map(({ cur, debt, color, bg }) => (
                                    <button key={cur}
                                            onClick={() => setPaymentCurrency(cur)}
                                            style={{
                                                flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                                                background: paymentCurrency === cur ? bg : 'var(--surface-2)',
                                                border: paymentCurrency === cur ? `2px solid ${color}` : '2px solid transparent',
                                                color: paymentCurrency === cur ? color : 'var(--text-muted)',
                                                fontWeight: 600, fontSize: 13, textAlign: 'center',
                                                transition: 'all 0.15s'
                                            }}>
                                        <div style={{ fontSize: 11, marginBottom: 2, opacity: 0.8 }}>Qarz ({cur})</div>
                                        <div style={{ fontSize: 15 }}>{fmt(debt)} {cur}</div>
                                    </button>
                                ))}
                            </div>
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="form-label">Summa ({paymentCurrency}) <span className="required">*</span></label>
                                <input
                                    className="form-input"
                                    type="text"
                                    inputMode="numeric"
                                    value={fmtPrice(paymentAmount)}
                                    onChange={e => setPaymentAmount(e.target.value.replace(/\s/g, ''))}
                                    placeholder={paymentCurrency === 'USD' ? fmt(purchase.debtUsd) : fmt(purchase.debtUzs)}
                                    autoFocus
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="form-label">To'lov usuli</label>
                                <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Izoh</label>
                                <input className="form-input" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowPayment(false)}>Bekor</button>
                            <button className="btn-save" onClick={handleAddPayment} disabled={paymentSaving}>
                                {paymentSaving ? <><Loader2 size={14} className="spin" />Saqlanmoqda...</> : 'Saqlash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tovarlarni qabul qilish modali */}
            {showReceive && (
                <div className="modal-overlay" onClick={() => setShowReceive(false)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <CheckCircle size={20} />
                                <div><h6 className="modal-title">Tovarlarni qabul qilish</h6></div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowReceive(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <table className="ptable">
                                <thead>
                                <tr>
                                    <th>Mahsulot</th>
                                    <th className="th-right">Qoldi</th>
                                    <th className="th-right">Qabul miqdori</th>
                                    <th className="th-right">Narx</th>
                                </tr>
                                </thead>
                                <tbody>
                                {receiveItems.map((item, idx) => (
                                    <tr key={item.purchaseItemId}>
                                        <td>
                                            <div className="cell-name">{item.productName}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.unitSymbol}</div>
                                        </td>
                                        <td className="th-right">{fmt(item.remainingQty)}</td>
                                        <td className="th-right">
                                            <input
                                                className="form-input"
                                                type="text"
                                                inputMode="numeric"
                                                style={{ width: 100, textAlign: 'right' }}
                                                value={fmtPrice(item.receivedQty)}
                                                onChange={e => setReceiveItems(prev => prev.map((r, i) =>
                                                    i === idx ? { ...r, receivedQty: e.target.value.replace(/\s/g, '') } : r
                                                ))}
                                            />
                                        </td>
                                        <td className="th-right">
                                            <input
                                                className="form-input"
                                                type="text"
                                                inputMode="numeric"
                                                style={{ width: 120, textAlign: 'right' }}
                                                value={fmtPrice(item.unitPrice)}
                                                onChange={e => setReceiveItems(prev => prev.map((r, i) =>
                                                    i === idx ? { ...r, unitPrice: e.target.value.replace(/\s/g, '') } : r
                                                ))}
                                            />
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowReceive(false)}>Bekor</button>
                            <button className="btn-save" onClick={handleConfirmReceive} disabled={receiving}>
                                {receiving ? <><Loader2 size={14} className="spin" />Saqlanmoqda...</> : 'Qabul qilish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ PENDING xaridga mahsulot qo'shish modali */}
            {showAddItem && (
                <div className="modal-overlay" onClick={() => setShowAddItem(false)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <Plus size={20} />
                                <div><h6 className="modal-title">Mahsulot qo'shish</h6></div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowAddItem(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            {addItemError && <div className="form-error"><AlertCircle size={16} />{addItemError}</div>}

                            {/* Mahsulot qidirish */}
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="form-label">Mahsulot <span className="required">*</span></label>
                                {newItem.productUnitId ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{
                                            flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 14,
                                            background: 'var(--primary-light, rgba(37,99,235,0.08))',
                                            color: 'var(--primary)', fontWeight: 600
                                        }}>
                                            {newItem.productName} ({newItem.unitSymbol})
                                        </span>
                                        <button className="act-btn" onClick={() => setNewItem(prev => ({ ...prev, productUnitId: null, productName: '', unitSymbol: '' }))}>
                                            <X size={13} />
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ position: 'relative' }}>
                                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            className="form-input"
                                            style={{ paddingLeft: 32 }}
                                            placeholder="Mahsulot qidiring..."
                                            value={itemSearch}
                                            onChange={e => searchProduct(e.target.value)}
                                            autoFocus
                                        />
                                        {itemSearching && <Loader2 size={13} className="spin" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }} />}
                                        {itemResults.length > 0 && (
                                            <div style={{
                                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                                background: 'var(--surface)', border: '1px solid var(--border-color)',
                                                borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto'
                                            }}>
                                                {itemResults.map(p => (
                                                    <div key={p.id}
                                                         style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}
                                                         onMouseDown={(e) => { e.preventDefault(); selectItemProduct(p) }}
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
                                    </div>
                                )}
                            </div>

                            {/* Miqdor, narx, valyuta */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: 10, marginBottom: 12 }}>
                                <div>
                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                        Miqdor {newItem.unitSymbol && `(${newItem.unitSymbol})`} <span className="required">*</span>
                                    </label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        inputMode="numeric"
                                        value={fmtPrice(newItem.quantity)}
                                        onChange={e => setNewItem(prev => ({ ...prev, quantity: e.target.value.replace(/\s/g, '') }))}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                        Tannarx <span className="required">*</span>
                                    </label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        inputMode="numeric"
                                        value={fmtPrice(newItem.unitPrice)}
                                        onChange={e => setNewItem(prev => ({ ...prev, unitPrice: e.target.value.replace(/\s/g, '') }))}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Valyuta</label>
                                    <select
                                        className="form-select"
                                        value={newItem.currency}
                                        onChange={e => setNewItem(prev => ({ ...prev, currency: e.target.value }))}
                                    >
                                        <option value="UZS">UZS</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                            </div>

                            {newItem.currency === 'USD' && (
                                <div className="form-group" style={{ marginBottom: 12 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                        Kurs (1 USD = ? UZS)
                                    </label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        value={newItem.exchangeRate || exchangeRate}
                                        onChange={e => setNewItem(prev => ({ ...prev, exchangeRate: e.target.value }))}
                                        placeholder={String(exchangeRate)}
                                    />
                                </div>
                            )}

                            {/* Sotuv narxi, minimal narx */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                                <div>
                                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                        Sotuv narxi (UZS)
                                    </label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        inputMode="numeric"
                                        value={fmtPrice(newItem.salePrice)}
                                        onChange={e => setNewItem(prev => ({ ...prev, salePrice: e.target.value.replace(/\s/g, '') }))}
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
                                        value={fmtPrice(newItem.minPrice)}
                                        onChange={e => setNewItem(prev => ({ ...prev, minPrice: e.target.value.replace(/\s/g, '') }))}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                <input
                                    type="checkbox"
                                    checked={newItem.updatePrices}
                                    onChange={e => setNewItem(prev => ({ ...prev, updatePrices: e.target.checked }))}
                                />
                                <span style={{ color: 'var(--text-secondary)' }}>Mahsulot kartasidagi narxlarni yangilash</span>
                            </label>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowAddItem(false)}>Bekor</button>
                            <button className="btn-save" onClick={handleAddItem} disabled={addingItem}>
                                {addingItem ? <><Loader2 size={14} className="spin" />Qo'shilmoqda...</> : 'Qo\'shish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function InfoRow({ icon, label, value }) {
    return (
        <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                {icon} {label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{value || '—'}</div>
        </div>
    )
}

function MultiCurrencyRow({ label, amount, currency, color, bold }) {
    const isUsd = currency === 'USD'
    const displayAmt = isUsd
        ? (Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : String(Math.round(Number(amount) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontSize: bold ? 15 : 13, fontWeight: bold ? 800 : 600, color: color || 'var(--text-primary)' }}>
                {displayAmt} {currency}
            </span>
        </div>
    )
}

function AmountRow({ label, amount, color, bold }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontSize: bold ? 18 : 15, fontWeight: bold ? 800 : 600, color }}>
                {String(Math.round(Number(amount) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} UZS
            </span>
        </div>
    )
}