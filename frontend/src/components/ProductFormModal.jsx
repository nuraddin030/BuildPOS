import { useRef, useState } from 'react'
import { X, Save, Loader2, PackagePlus } from 'lucide-react'
import ProductForm from './ProductForm'
import '../styles/ProductsPage.css'
import '../styles/PurchasesPage.css'

export default function ProductFormModal({ initialValues, onSaved, onClose, title = 'Yangi mahsulot', hideStockSection = false }) {
    const formRef = useRef()
    const [saving, setSaving] = useState(false)

    const handleSaved = (product) => {
        onSaved?.(product)
        onClose?.()
    }

    return (
        <div className="pfm-overlay" onClick={onClose}>
            <div className="pfm-modal" onClick={e => e.stopPropagation()}>
                <div className="pfm-header">
                    <div className="pfm-header-left">
                        <PackagePlus size={18} />
                        <span>{title}</span>
                    </div>
                    <button className="pfm-close" onClick={onClose} disabled={saving}>
                        <X size={18} />
                    </button>
                </div>

                <div className="pfm-body">
                    <ProductForm
                        ref={formRef}
                        initialValues={initialValues}
                        onSaved={handleSaved}
                        renderFooter={false}
                        hideStockSection={hideStockSection}
                        onSavingChange={setSaving}
                    />
                </div>

                <div className="pfm-footer">
                    <button className="btn-cancel" onClick={onClose} disabled={saving}>
                        Bekor
                    </button>
                    <button className="btn-add"
                            onClick={() => formRef.current?.save()}
                            disabled={saving}>
                        {saving
                            ? <><Loader2 size={15} className="spin" /> Saqlanmoqda...</>
                            : <><Save size={15} /> Saqlash va tanlash</>
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}