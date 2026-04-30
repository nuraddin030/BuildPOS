import { useState, useEffect, useCallback, useRef } from 'react'
import DropdownPortal from '../components/DropdownPortal'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    getProducts, deleteProduct, toggleProductStatus, getCategoriesTree, getPriceHistory
} from '../api/products'
import {
    Package, Plus, Search, Filter, RotateCcw, Pencil, Lock,
    Unlock, Trash2, ChevronLeft, ChevronRight, Loader2, TrendingUp, TrendingDown,
    Upload, Printer, MoreVertical, Download, FileSpreadsheet, History, X
} from 'lucide-react'
import api from '../api/api'
import { useAuth } from '../context/AuthContext'
import ProductImportModal from '../components/ProductImportModal'
import PriceLabelModal from '../components/PriceLabelModal'
import BulkPrintModal from '../components/BulkPrintModal'
import ImageLightbox from '../components/ImageLightbox'
import ConfirmModal from '../components/ConfirmModal'
import { exportToExcel } from '../utils/exportUtils'
import '../styles/ProductsPage.css'

const fmt = (num) => {
    const n = Number(num || 0)
    const str = n % 1 === 0 ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
    const [int, dec] = str.split('.')
    return dec ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + '.' + dec : int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function ProductsPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { hasPermission, user } = useAuth()
    const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN'

    const [products, setProducts] = useState([])
    const [phModal, setPhModal] = useState(null) // { product }
    const [phData, setPhData] = useState([])
    const [phLoading, setPhLoading] = useState(false)
    const [importModal, setImportModal] = useState(false)
    const [labelProduct, setLabelProduct] = useState(null)
    const [lightboxSrc, setLightboxSrc] = useState(null)
    const [openMenuId, setOpenMenuId] = useState(null)
    const [menuAnchor, setMenuAnchor] = useState(null)
    const [selected, setSelected] = useState(new Set())
    const [selectMode, setSelectMode] = useState(false)
    const [bulkPrint, setBulkPrint] = useState(false)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [size, setSize] = useState(20)
    const [search, setSearch] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState([])
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [exportLoading, setExportLoading] = useState(false)
    const [historyModal, setHistoryModal] = useState(null)
    const [historyData, setHistoryData] = useState([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [historyType, setHistoryType] = useState('')
    const [historyFrom, setHistoryFrom] = useState('')
    const [historyTo, setHistoryTo] = useState('')

    const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()) }

    const load = useCallback(() => {
        setLoading(true)
        setSelected(new Set())
        getProducts({ search: search || undefined, categoryId: categoryId || undefined, page, size })
            .then(res => { setProducts(res.data.content); setTotal(res.data.totalElements) })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [search, categoryId, page, size])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        getCategoriesTree().then(res => setCategories(res.data.content || res.data))
    }, [])

    const handleDelete = async (id) => {
        setDeleteConfirm(id)
    }

    const confirmDeleteProduct = async () => {
        if (!deleteConfirm) return
        await deleteProduct(deleteConfirm)
        setDeleteConfirm(null)
        load()
    }

    const handleToggle = async (id) => {
        await toggleProductStatus(id)
        load()
    }

    const openPriceHistory = async (p) => {
        if (!p.defaultUnitId) return
        setPhModal(p)
        setPhData([])
        setPhLoading(true)
        try {
            const r = await getPriceHistory(p.defaultUnitId)
            setPhData(Array.isArray(r.data) ? r.data : [])
        } catch (e) {
            console.error(e)
        } finally {
            setPhLoading(false)
        }
    }

    const loadHistory = useCallback(async (productId, type, from, to) => {
        setHistoryLoading(true)
        try {
            const params = { productId, size: 200 }
            if (type) params.movementType = type
            if (from) params.from = from + 'T00:00:00'
            if (to) params.to = to + 'T23:59:59'
            const res = await api.get('/api/v1/stock-movements', { params })
            setHistoryData(res.data.content || [])
        } catch (e) {
            console.error(e)
        } finally {
            setHistoryLoading(false)
        }
    }, [])

    const openHistory = (product) => {
        setHistoryModal(product)
        setHistoryData([])
        setHistoryType('')
        setHistoryFrom('')
        setHistoryTo('')
        loadHistory(product.id, '', '', '')
    }

    const fieldLabel = (f) => f === 'costPrice' ? 'Tannarx' : f === 'salePrice' ? 'Sotuv narx' : f === 'minPrice' ? 'Min narx' : f

    const handleExport = async () => {
        setExportLoading(true)
        try {
            const res = await getProducts({ page: 0, size: 10000, search: search || undefined, categoryId: categoryId || undefined })
            const rows = res.data.content || []
            const headers = ['#', 'Nomi', 'Kategoriya', 'Shtrix kod', 'Birlik', 'Tannarx', 'Sotuv narx', 'Min narx', 'Qoldiq', 'Status']
            const data = rows.map((p, i) => [
                i + 1,
                p.name || '',
                p.categoryName || '',
                p.defaultBarcode || '',
                p.defaultUnitSymbol || '',
                p.defaultCostPriceUsd ? `$${p.defaultCostPriceUsd}` : (p.defaultCostPrice || 0),
                p.defaultSalePrice || 0,
                p.defaultMinPrice || 0,
                `${p.totalStock || 0} ${p.defaultUnitSymbol || ''}`,
                p.status === 'ACTIVE' ? 'Faol' : p.status === 'INACTIVE' ? 'Noaktiv' : "O'chirilgan"
            ])
            exportToExcel('mahsulotlar', headers, data)
        } catch {
            alert('Export xatosi')
        } finally {
            setExportLoading(false)
        }
    }

    const totalPages = Math.ceil(total / size)

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap">
                        <Package size={20} />
                    </div>
                    <div>
                        <h1 className="page-title">
                            {t('products.title')}
                            <span className="page-count">({total})</span>
                        </h1>
                        <p className="page-subtitle">Barcha mahsulotlarni boshqaring</p>
                    </div>
                </div>
                <div className="products-header-actions">
                    <button className="btn-export" onClick={handleExport} disabled={exportLoading}>
                        {exportLoading ? <Loader2 size={16} className="spin" /> : <FileSpreadsheet size={16} />}
                        <span>Excel</span>
                    </button>
                    <button
                        className={`btn-bulk-print${selectMode ? ' active' : ''}`}
                        onClick={() => { if (selectMode) exitSelectMode(); else setSelectMode(true) }}
                    >
                        <Printer size={16} />
                        <span>{selectMode ? 'Bekor' : 'Chop etish'}</span>
                    </button>
                    {hasPermission('PRODUCTS_CREATE') && (
                        <button className="btn-import" onClick={() => setImportModal(true)}>
                            <Upload size={16} />
                            <span>Import</span>
                        </button>
                    )}
                    {hasPermission('PRODUCTS_CREATE') && (
                        <button className="btn-add" onClick={() => navigate('/products/new')}>
                            <Plus size={18} />
                            <span>{t('products.add')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Filter */}
            <div className="filter-bar">
                <div className="filter-search-wrap">
                    <Search size={16} className="filter-search-icon" />
                    <input
                        type="text"
                        className="filter-search"
                        placeholder={`${t('common.search')}...`}
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0) }}
                    />
                </div>
                <div className="filter-select-wrap">
                    <Filter size={14} className="filter-select-icon" />
                    <select
                        className="filter-select"
                        value={categoryId}
                        onChange={e => { setCategoryId(e.target.value); setPage(0) }}
                    >
                        <option value="">Barcha kategoriyalar</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                {(search || categoryId) && (
                    <button className="btn-reset" onClick={() => { setSearch(''); setCategoryId(''); setPage(0) }}>
                        <RotateCcw size={14} />
                        <span>{t('common.reset')}</span>
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="table-card">
                {loading ? (
                    <div className="table-loading">
                        <Loader2 size={24} className="spin" />
                        <span>{t('common.loading')}</span>
                    </div>
                ) : products.length === 0 ? (
                    <div className="table-empty">
                        <Package size={40} strokeWidth={1.2} />
                        <p>{"Ma'lumot yo'q"}</p>
                    </div>
                ) : (
                    <>
                    <div className="products-table-wrapper table-responsive">
                        <table className="ptable products-ptable">
                            <thead>
                            <tr>
                                {selectMode && (
                                    <th className="th-check">
                                        <input type="checkbox"
                                            className="row-check"
                                            checked={products.length > 0 && products.every(p => selected.has(p.id))}
                                            onChange={e => {
                                                if (e.target.checked) setSelected(new Set(products.map(p => p.id)))
                                                else setSelected(new Set())
                                            }}
                                        />
                                    </th>
                                )}
                                <th className="th-num">#</th>
                                <th>{t('products.name')}</th>
                                <th>Rasm</th>
                                <th>{t('products.category')}</th>
                                <th>{t('products.barcode')}</th>
                                {isOwnerOrAdmin && <th className="th-right">Tannarx</th>}
                                <th className="th-right">{t('products.sale_price')}</th>
                                <th className="th-center">{t('products.stock')}</th>
                                <th className="th-center">{t('products.status')}</th>
                                <th className="th-center">{t('common.actions')}</th>
                            </tr>
                            </thead>
                            <tbody>
                            {products.map((p, i) => (
                                <tr key={p.id} className={selected.has(p.id) ? 'row-selected' : ''}>
                                    {selectMode && (
                                        <td className="th-check">
                                            <input type="checkbox"
                                                className="row-check"
                                                checked={selected.has(p.id)}
                                                onChange={e => {
                                                    const s = new Set(selected)
                                                    e.target.checked ? s.add(p.id) : s.delete(p.id)
                                                    setSelected(s)
                                                }}
                                            />
                                        </td>
                                    )}
                                    <td className="cell-num">{page * size + i + 1}</td>
                                    <td>
                                        <span className="cell-name">{p.name}</span>
                                    </td>
                                    <td>
                                        {(p.thumbnailUrl || p.imageUrl) ? (
                                            <img
                                                src={p.thumbnailUrl || p.imageUrl}
                                                alt=""
                                                className="product-thumb"
                                                loading="lazy"
                                                decoding="async"
                                                onClick={() => setLightboxSrc(p.imageUrl || p.thumbnailUrl)}
                                            />
                                        ) : (
                                            <div className="product-thumb-empty">
                                                <Package size={16} />
                                            </div>
                                        )}
                                    </td>
                                    <td className="cell-muted">{p.categoryName || '\u2014'}</td>
                                    <td>
                                        <code className="cell-barcode">{p.defaultBarcode || '\u2014'}</code>
                                    </td>
                                    {isOwnerOrAdmin && (
                                        <td className="th-right">
                                            {p.defaultCostPriceUsd ? (
                                                <>
                                                    <span className="cell-price">${fmt(p.defaultCostPriceUsd)}</span>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>≈{fmt(p.defaultCostPrice)}</div>
                                                </>
                                            ) : (
                                                <span className="cell-price">{fmt(p.defaultCostPrice)}</span>
                                            )}
                                        </td>
                                    )}
                                    <td className="th-right">
                                        <span className="cell-price">{fmt(p.defaultSalePrice)}</span>
                                    </td>
                                    <td className="th-center">
                                        <span className={`cell-stock ${p.isLowStock ? 'low-stock' : ''}`}>
                                            {fmt(p.totalStock)} {p.defaultUnitSymbol}
                                        </span>
                                    </td>
                                    <td className="th-center">
                                        <span className={`status-badge status-${(p.status || '').toLowerCase()}`}>
                                            {p.status === 'ACTIVE' ? 'Faol' : p.status === 'INACTIVE' ? 'Noaktiv' : "O'chirilgan"}
                                        </span>
                                    </td>
                                    <td className="th-center">
                                        <div className="action-group">
                                            {/* Narx etiketi — har doim ko'rinadi */}
                                            <button className="act-btn act-print"
                                                    onClick={() => setLabelProduct(p)}
                                                    title="Narx etiketi">
                                                <Printer size={15} />
                                            </button>

                                            {/* ⋮ Dropdown — DropdownPortal (body ga render) */}
                                            <button
                                                className="act-btn act-more"
                                                onClick={(e) => {
                                                    if (openMenuId === p.id) { setOpenMenuId(null); setMenuAnchor(null) }
                                                    else { setOpenMenuId(p.id); setMenuAnchor(e.currentTarget) }
                                                }}
                                                title="Ko'proq"
                                            >
                                                <MoreVertical size={15} />
                                            </button>
                                            {openMenuId === p.id && (
                                                <DropdownPortal anchorEl={menuAnchor} onClose={() => { setOpenMenuId(null); setMenuAnchor(null) }}>
                                                    {hasPermission('PRODUCTS_EDIT') && (
                                                        <button className="act-dd-item" onClick={() => { navigate(`/products/${p.id}/edit`); setOpenMenuId(null) }}>
                                                            <Pencil size={14} /> Tahrirlash
                                                        </button>
                                                    )}
                                                    {hasPermission('PRICE_HISTORY_VIEW') && p.defaultUnitId && (
                                                        <button className="act-dd-item" onClick={() => { openPriceHistory(p); setOpenMenuId(null) }}>
                                                            <TrendingUp size={14} /> Narx tarixi
                                                        </button>
                                                    )}
                                                    <button className="act-dd-item" onClick={() => { openHistory(p); setOpenMenuId(null) }}>
                                                        <History size={14} /> Tovar tarixi
                                                    </button>
                                                    {hasPermission('PRODUCTS_EDIT') && (
                                                        <button className="act-dd-item" onClick={() => { handleToggle(p.id); setOpenMenuId(null) }}>
                                                            {p.status === 'ACTIVE' ? <><Lock size={14} /> Noaktiv qilish</> : <><Unlock size={14} /> Faollashtirish</>}
                                                        </button>
                                                    )}
                                                    {hasPermission('PRODUCTS_DELETE') && (
                                                        <button className="act-dd-item act-dd-danger" onClick={() => { handleDelete(p.id); setOpenMenuId(null) }}>
                                                            <Trash2 size={14} /> O'chirish
                                                        </button>
                                                    )}
                                                </DropdownPortal>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="products-mobile-cards">
                        {products.map((p, i) => (
                            <div key={p.id} className="product-card">
                                <div className="product-card-top">
                                    {selectMode && (
                                        <input type="checkbox" className="product-card-check"
                                            checked={selected.has(p.id)}
                                            onChange={e => {
                                                const s = new Set(selected)
                                                e.target.checked ? s.add(p.id) : s.delete(p.id)
                                                setSelected(s)
                                            }}
                                        />
                                    )}
                                    {(p.thumbnailUrl || p.imageUrl) ? (
                                        <img
                                            src={p.thumbnailUrl || p.imageUrl}
                                            alt=""
                                            className="product-card-img"
                                            loading="lazy"
                                            decoding="async"
                                            onClick={(e) => { e.stopPropagation(); setLightboxSrc(p.imageUrl || p.thumbnailUrl) }}
                                        />
                                    ) : (
                                        <div className="product-card-img-empty"><Package size={18} /></div>
                                    )}
                                    <div className="product-card-info">
                                        <div className="product-card-name">{p.name}</div>
                                        <div className="product-card-barcode">{p.defaultBarcode || '—'}</div>
                                    </div>
                                    <span className={`status-badge status-${(p.status || '').toLowerCase()}`}>
                                        {p.status === 'ACTIVE' ? 'Faol' : p.status === 'INACTIVE' ? 'Noaktiv' : "O'chirilgan"}
                                    </span>
                                </div>
                                <div className="product-card-meta">
                                    {p.categoryName && <span className="product-card-cat">{p.categoryName}</span>}
                                </div>
                                <div className="product-card-bottom">
                                    <div>
                                        {isOwnerOrAdmin && (
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                                                {p.defaultCostPriceUsd
                                                    ? <>${fmt(p.defaultCostPriceUsd)} <span style={{ fontSize: 11 }}>≈{fmt(p.defaultCostPrice)}</span></>
                                                    : fmt(p.defaultCostPrice)
                                                }
                                            </div>
                                        )}
                                        <div className="product-card-price">{fmt(p.defaultSalePrice)} UZS</div>
                                        <div className={`product-card-stock${p.isLowStock ? ' low-stock' : ''}`}>
                                            Qoldiq: {fmt(p.totalStock)} {p.defaultUnitSymbol}
                                        </div>
                                    </div>
                                    <div className="product-card-actions">
                                        <button className="act-btn act-print" title="Narx etiketi"
                                                onClick={() => setLabelProduct(p)}>
                                            <Printer size={15} />
                                        </button>
                                        <button
                                            className="act-btn act-more"
                                            onClick={(e) => {
                                                const key = 'card-' + p.id
                                                if (openMenuId === key) { setOpenMenuId(null); setMenuAnchor(null) }
                                                else { setOpenMenuId(key); setMenuAnchor(e.currentTarget) }
                                            }}
                                        >
                                            <MoreVertical size={15} />
                                        </button>
                                        {openMenuId === 'card-' + p.id && (
                                            <DropdownPortal anchorEl={menuAnchor} onClose={() => { setOpenMenuId(null); setMenuAnchor(null) }}>
                                                {hasPermission('PRODUCTS_EDIT') && (
                                                    <button className="act-dd-item" onClick={() => { navigate(`/products/${p.id}/edit`); setOpenMenuId(null) }}>
                                                        <Pencil size={14} /> Tahrirlash
                                                    </button>
                                                )}
                                                {hasPermission('PRICE_HISTORY_VIEW') && p.defaultUnitId && (
                                                    <button className="act-dd-item" onClick={() => { openPriceHistory(p); setOpenMenuId(null) }}>
                                                        <TrendingUp size={14} /> Narx tarixi
                                                    </button>
                                                )}
                                                <button className="act-dd-item" onClick={() => { openHistory(p); setOpenMenuId(null) }}>
                                                    <History size={14} /> Tovar tarixi
                                                </button>
                                                {hasPermission('PRODUCTS_EDIT') && (
                                                    <button className="act-dd-item" onClick={() => { handleToggle(p.id); setOpenMenuId(null) }}>
                                                        {p.status === 'ACTIVE' ? <><Lock size={14} /> Noaktiv qilish</> : <><Unlock size={14} /> Faollashtirish</>}
                                                    </button>
                                                )}
                                                {hasPermission('PRODUCTS_DELETE') && (
                                                    <button className="act-dd-item act-dd-danger" onClick={() => { handleDelete(p.id); setOpenMenuId(null) }}>
                                                        <Trash2 size={14} /> O'chirish
                                                    </button>
                                                )}
                                            </DropdownPortal>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
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

            {/* Bulk selection floating bar */}
            {selected.size > 0 && (
                <div className="bulk-bar">
                    <span className="bulk-bar-info">
                        <strong>{selected.size}</strong> ta mahsulot tanlandi
                    </span>
                    <div className="bulk-bar-actions">
                        <button className="bulk-bar-cancel" onClick={exitSelectMode}>
                            Bekor
                        </button>
                        <button className="bulk-bar-print" onClick={() => setBulkPrint(true)}>
                            <Printer size={15} />
                            Etiket chop etish
                        </button>
                    </div>
                </div>
            )}

            {/* Bulk Print Modal */}
            {bulkPrint && (
                <BulkPrintModal
                    products={products.filter(p => selected.has(p.id))}
                    onClose={() => setBulkPrint(false)}
                />
            )}

            {/* Price Label Modal */}
            {labelProduct && (
                <PriceLabelModal
                    product={labelProduct}
                    onClose={() => setLabelProduct(null)}
                />
            )}

            {/* Import Modal */}
            {importModal && (
                <ProductImportModal
                    onClose={() => setImportModal(false)}
                    onSuccess={() => { setImportModal(false); load() }}
                />
            )}

            {/* Image Lightbox — original 1000x1000 */}
            {lightboxSrc && (
                <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
            )}

            {deleteConfirm && (
                <ConfirmModal
                    title={t('common.confirm_delete')}
                    message="Mahsulot o'chirilsinmi?"
                    confirmLabel="O'chirish"
                    confirmClass="btn-save btn-danger"
                    variant="danger"
                    onConfirm={confirmDeleteProduct}
                    onCancel={() => setDeleteConfirm(null)}
                />
            )}

            {/* Price History Modal */}
            {phModal && (
                <div className="ph-overlay" onClick={() => setPhModal(null)}>
                    <div className="ph-modal" onClick={e => e.stopPropagation()}>
                        <div className="ph-modal-header">
                            <span>📈 Narx tarixi — {phModal.name}</span>
                            <button className="ph-close" onClick={() => setPhModal(null)}>✕</button>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {phLoading ? (
                                <div className="ph-empty"><Loader2 size={20} className="spin" /> Yuklanmoqda...</div>
                            ) : phData.length === 0 ? (
                                <div className="ph-empty">Narx o'zgartirish tarixi yo'q</div>
                            ) : (
                                <>
                                <table className="ph-table ph-desktop">
                                    <thead>
                                    <tr>
                                        <th>Sana</th>
                                        <th>Maydon</th>
                                        <th>Eski narx</th>
                                        <th>Yangi narx</th>
                                        <th>Kim</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {phData.map(h => (
                                        <tr key={h.id}>
                                            <td>{new Date(h.changedAt).toLocaleString('uz-UZ')}</td>
                                            <td>{fieldLabel(h.fieldName)}</td>
                                            <td className="ph-old">{fmt(h.oldValue)}</td>
                                            <td className="ph-new">{fmt(h.newValue)}</td>
                                            <td>{h.changedByName || '—'}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                                <div className="ph-cards">
                                    {phData.map(h => (
                                        <div key={h.id} className="smh-card">
                                            <div className="smh-card-top">
                                                <span className="smh-badge" style={{ background: '#3b82f618', color: '#3b82f6' }}>{fieldLabel(h.fieldName)}</span>
                                                <span className="cell-muted">{new Date(h.changedAt).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                                            </div>
                                            <div className="smh-card-rows">
                                                <div className="smh-card-row">
                                                    <span className="smh-card-label">Eski narx</span>
                                                    <span className="ph-old">{fmt(h.oldValue)}</span>
                                                </div>
                                                <div className="smh-card-row">
                                                    <span className="smh-card-label">Yangi narx</span>
                                                    <span className="ph-new">{fmt(h.newValue)}</span>
                                                </div>
                                                {h.changedByName && (
                                                    <div className="smh-card-row">
                                                        <span className="smh-card-label">Kim</span>
                                                        <span>{h.changedByName}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Stock Movement History Modal */}
            {historyModal && (
                <div className="ph-overlay" onClick={() => setHistoryModal(null)}>
                    <div className="ph-modal smh-modal" onClick={e => e.stopPropagation()}>
                        <div className="ph-modal-header">
                            <span>Tovar tarixi — {historyModal.name}</span>
                            <button className="ph-close" onClick={() => setHistoryModal(null)}><X size={16} /></button>
                        </div>
                        <div className="smh-filters">
                            <select
                                className="smh-filter-select"
                                value={historyType}
                                onChange={e => { setHistoryType(e.target.value); loadHistory(historyModal.id, e.target.value, historyFrom, historyTo) }}
                            >
                                <option value="">Barcha harakatlar</option>
                                <option value="PURCHASE_IN">Yetkazuvchidan kirim</option>
                                <option value="SALE_OUT">Sotuvdan chiqim</option>
                                <option value="ADJUSTMENT_IN">Qo'lda kirim</option>
                                <option value="ADJUSTMENT_OUT">Qo'lda chiqim</option>
                                <option value="TRANSFER_IN">Transfer kirim</option>
                                <option value="TRANSFER_OUT">Transfer chiqim</option>
                                <option value="RETURN_IN">Qaytarib olish</option>
                            </select>
                            <input
                                type="date"
                                className="smh-filter-date"
                                value={historyFrom}
                                onChange={e => { setHistoryFrom(e.target.value); loadHistory(historyModal.id, historyType, e.target.value, historyTo) }}
                            />
                            <span className="smh-filter-sep">—</span>
                            <input
                                type="date"
                                className="smh-filter-date"
                                value={historyTo}
                                onChange={e => { setHistoryTo(e.target.value); loadHistory(historyModal.id, historyType, historyFrom, e.target.value) }}
                            />
                            {(historyType || historyFrom || historyTo) && (
                                <button className="smh-filter-reset" onClick={() => { setHistoryType(''); setHistoryFrom(''); setHistoryTo(''); loadHistory(historyModal.id, '', '', '') }}>
                                    <RotateCcw size={13} /> Tozalash
                                </button>
                            )}
                        </div>
                        <div className="smh-body">
                            {historyLoading ? (
                                <div className="ph-empty"><Loader2 size={20} className="spin" /> Yuklanmoqda...</div>
                            ) : historyData.length === 0 ? (
                                <div className="ph-empty">Harakat tarixi yo'q</div>
                            ) : (
                                <>
                                <table className="ph-table smh-table smh-desktop">
                                    <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Sana</th>
                                        <th>Harakat</th>
                                        <th>Birlik</th>
                                        <th>Ombor</th>
                                        <th className="th-right">Miqdor</th>
                                        <th className="th-right">Narx</th>
                                        <th>Manba</th>
                                        <th>Kim</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {historyData.map((m, idx) => {
                                        const isIn = ['PURCHASE_IN','ADJUSTMENT_IN','TRANSFER_IN','RETURN_IN'].includes(m.movementType)
                                        const warehouse = m.fromWarehouseName && m.toWarehouseName
                                            ? `${m.fromWarehouseName} → ${m.toWarehouseName}`
                                            : (m.toWarehouseName || m.fromWarehouseName || '—')
                                        return (
                                            <tr key={m.id}>
                                                <td className="cell-num">{idx + 1}</td>
                                                <td className="cell-muted">{m.movedAt ? new Date(m.movedAt).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}</td>
                                                <td><SmhBadge type={m.movementType} /></td>
                                                <td>{m.unitSymbol || ''}</td>
                                                <td className="cell-muted">{warehouse}</td>
                                                <td className={`th-right ${isIn ? 'smh-qty-in' : 'smh-qty-out'}`}>
                                                    {isIn ? '+' : '-'}{fmt(m.quantity)}
                                                </td>
                                                <td className="th-right">{m.unitPrice ? fmt(m.unitPrice) : '—'}</td>
                                                <td>
                                                    <SmhRef m={m} navigate={navigate} />
                                                </td>
                                                <td className="cell-muted">{m.movedBy || '—'}</td>
                                            </tr>
                                        )
                                    })}
                                    </tbody>
                                </table>

                                {/* Mobile cards */}
                                <div className="smh-cards">
                                    {historyData.map((m, idx) => {
                                        const isIn = ['PURCHASE_IN','ADJUSTMENT_IN','TRANSFER_IN','RETURN_IN'].includes(m.movementType)
                                        const warehouse = m.fromWarehouseName && m.toWarehouseName
                                            ? `${m.fromWarehouseName} → ${m.toWarehouseName}`
                                            : (m.toWarehouseName || m.fromWarehouseName || '—')
                                        return (
                                            <div key={m.id} className="smh-card">1
                                                <div className="smh-card-top">
                                                    <SmhBadge type={m.movementType} />
                                                    <span className={isIn ? 'smh-qty-in' : 'smh-qty-out'}>
                                                        {isIn ? '+' : '-'}{fmt(m.quantity)} {m.unitSymbol || ''}
                                                    </span>
                                                </div>
                                                <div className="smh-card-rows">
                                                    <div className="smh-card-row">
                                                        <span className="smh-card-label">Sana</span>
                                                        <span>{m.movedAt ? new Date(m.movedAt).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}</span>
                                                    </div>
                                                    <div className="smh-card-row">
                                                        <span className="smh-card-label">Ombor</span>
                                                        <span>{warehouse}</span>
                                                    </div>
                                                    {m.unitPrice && (
                                                        <div className="smh-card-row">
                                                            <span className="smh-card-label">Narx</span>
                                                            <span>{fmt(m.unitPrice)}</span>
                                                        </div>
                                                    )}
                                                    <div className="smh-card-row">
                                                        <span className="smh-card-label">Manba</span>
                                                        <span><SmhRef m={m} navigate={navigate} /></span>
                                                    </div>
                                                    {m.movedBy && (
                                                        <div className="smh-card-row">
                                                            <span className="smh-card-label">Kim</span>
                                                            <span>{m.movedBy}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const SMH_TYPES = {
    PURCHASE_IN:    { label: 'Yetkazuvchidan kirim', color: '#10b981', icon: 'in' },
    SALE_OUT:       { label: 'Sotuvdan chiqim',      color: '#ef4444', icon: 'out' },
    ADJUSTMENT_IN:  { label: 'Qo\'lda kirim',        color: '#3b82f6', icon: 'in' },
    ADJUSTMENT_OUT: { label: 'Qo\'lda chiqim',       color: '#f97316', icon: 'out' },
    TRANSFER_IN:    { label: 'Transfer kirim',       color: '#8b5cf6', icon: 'in' },
    TRANSFER_OUT:   { label: 'Transfer chiqim',      color: '#ec4899', icon: 'out' },
    RETURN_IN:      { label: 'Qaytarib olish',       color: '#06b6d4', icon: 'in' },
}

const REF_TYPE_MAP = {
    PURCHASE: 'Xarid',
    SALE: 'Sotuv',
    RETURN: 'Qaytarish',
    ADJUSTMENT: 'Tuzatish',
    TRANSFER: 'Ko\'chirish',
    INVENTORY: 'Inventarizatsiya',
    DRAFT: 'Qoralama',
    CANCEL: 'Bekor qilish',
    UNHOLD: 'Qayta tiklash',
}

function SmhBadge({ type }) {
    const info = SMH_TYPES[type]
    if (!info) return <span className="cell-muted">{type}</span>
    return (
        <span className="smh-badge" style={{ background: info.color + '18', color: info.color }}>
            {info.icon === 'in' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {info.label}
        </span>
    )
}

function SmhRef({ m, navigate }) {
    const label = REF_TYPE_MAP[m.referenceType] || m.referenceType || '—'
    const refLabel = m.referenceNo || (m.referenceId ? `#${m.referenceId}` : '')
    if (m.referenceType === 'PURCHASE' && m.referenceId) {
        return <span className="smh-ref smh-ref-purchase" onClick={() => navigate(`/purchases/${m.referenceId}`)}>{label} {refLabel}</span>
    }
    if (m.referenceType === 'SALE' && m.referenceId) {
        return <span className="smh-ref smh-ref-sale" onClick={() => navigate(`/sales/${m.referenceId}`)}>{label} {refLabel}</span>
    }
    return <span>{label}{refLabel ? ` ${refLabel}` : ''}</span>
}