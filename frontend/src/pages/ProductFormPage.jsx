import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PackagePlus, ArrowLeft, Loader2, Save } from 'lucide-react'
import ProductForm from '../components/ProductForm'
import '../styles/ProductsPage.css'

export default function ProductFormPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)
    const formRef = useRef()
    const [saving, setSaving] = useState(false)

    return (
        <div className="products-wrapper">
            <div className="products-header">
                <div className="products-header-left">
                    <button className="act-btn" onClick={() => navigate('/products')} style={{ marginRight: 8 }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div className="page-icon-wrap"><PackagePlus size={20} /></div>
                    <div>
                        <h1 className="page-title">
                            {isEdit ? 'Mahsulotni tahrirlash' : t('products.add')}
                        </h1>
                        <p className="page-subtitle">
                            {isEdit ? "Ma'lumotlarni o'zgartiring" : "Yangi mahsulot qo'shing"}
                        </p>
                    </div>
                </div>
                <button className="btn-add"
                        onClick={() => formRef.current?.save()}
                        disabled={saving}>
                    {saving
                        ? <><Loader2 size={15} className="spin" /> Saqlanmoqda...</>
                        : <><Save size={15} /> {t('common.save')}</>
                    }
                </button>
            </div>

            <ProductForm
                ref={formRef}
                productId={id}
                onSaved={() => navigate('/products')}
                renderFooter={false}
                onSavingChange={setSaving}
            />
        </div>
    )
}
