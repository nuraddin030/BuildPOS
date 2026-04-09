import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
    getProducts, deleteProduct, toggleProductStatus, getCategoriesTree, getPriceHistory
} from '../api/products'
import {
    Package, Plus, Search, Filter, RotateCcw, Pencil, Lock,
    Unlock, Trash2, ChevronLeft, ChevronRight, Loader2, TrendingUp, Upload, Printer, MoreVertical
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ProductImportModal from '../components/ProductImportModal'
import PriceLabelModal from '../components/PriceLabelModal'
import '../styles/ProductsPage.css'

const fmt = (num) => String(Math.round(num || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

export default function ProductsPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { hasPermission } = useAuth()

    const [products, setProducts] = useState([])
    const [phModal, setPhModal] = useState(null) // { product }
    const [phData, setPhData] = useState([])
    const [phLoading, setPhLoading] = useState(false)
    const [importModal, setImportModal] = useState(false)
    const [labelProduct, setLabelProduct] = useState(null)
    const [openMenuId, setOpenMenuId] = useState(null)
    const menuRef = useRef(null)

    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuId(null)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [size] = useState(20)
    const [search, setSearch] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState([])

    const load = useCallback(() => {
        setLoading(true)
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
        if (!window.confirm(t('common.confirm_delete'))) return
        await deleteProduct(id)
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

    const fieldLabel = (f) => f === 'costPrice' ? 'Tannarx' : f === 'salePrice' ? 'Sotuv narx' : f === 'minPrice' ? 'Min narx' : f

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
                    <div className="table-responsive">
                        <table className="ptable products-ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th>{t('products.name')}</th>
                                <th>Rasm</th>
                                <th>{t('products.category')}</th>
                                <th>{t('products.barcode')}</th>
                                <th className="th-right">{t('products.sale_price')}</th>
                                <th className="th-center">{t('products.stock')}</th>
                                <th className="th-center">{t('products.status')}</th>
                                <th className="th-center">{t('common.actions')}</th>
                            </tr>
                            </thead>
                            <tbody>
                            {products.map((p, i) => (
                                <tr key={p.id}>
                                    <td className="cell-num">{page * size + i + 1}</td>
                                    <td>
                                        <span className="cell-name">{p.name}</span>
                                    </td>
                                    <td>
                                        {p.imageUrl ? (
                                            <img src={p.imageUrl} alt="" className="product-thumb" />
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
                                        <div className="action-group" ref={openMenuId === p.id ? menuRef : null}>
                                            {/* Narx etiketi — har doim ko'rinadi */}
                                            <button className="act-btn act-print"
                                                    onClick={() => setLabelProduct(p)}
                                                    title="Narx etiketi">
                                                <Printer size={15} />
                                            </button>

                                            {/* ⋮ Dropdown */}
                                            <div className="act-menu-wrap">
                                                <button
                                                    className="act-btn act-more"
                                                    onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
                                                    title="Ko'proq"
                                                >
                                                    <MoreVertical size={15} />
                                                </button>
                                                {openMenuId === p.id && (
                                                    <div className="act-dropdown">
                                                        {hasPermission('PRICE_HISTORY_VIEW') && p.defaultUnitId && (
                                                            <button className="act-dd-item" onClick={() => { openPriceHistory(p); setOpenMenuId(null) }}>
                                                                <TrendingUp size={14} /> Narx tarixi
                                                            </button>
                                                        )}
                                                        {hasPermission('PRODUCTS_EDIT') && (
                                                            <button className="act-dd-item" onClick={() => { navigate(`/products/${p.id}/edit`); setOpenMenuId(null) }}>
                                                                <Pencil size={14} /> Tahrirlash
                                                            </button>
                                                        )}
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
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="table-footer">
                        <span className="table-footer-info">Jami: {total} ta</span>
                        <div className="pagination-group">
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
                    </div>
                )}
            </div>

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
                                <table className="ph-table">
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
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}