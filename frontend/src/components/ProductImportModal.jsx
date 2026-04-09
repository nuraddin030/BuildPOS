import { useState, useRef, useEffect } from 'react'
import { Upload, FileSpreadsheet, Download, X, ChevronRight, Check, AlertCircle, Loader2, Warehouse } from 'lucide-react'
import { downloadImportTemplate, previewImport, executeImport } from '../api/products'
import { getWarehouses } from '../api/products'
import '../styles/ProductImportModal.css'

const FIELD_LABELS = {
    name:         { label: 'Mahsulot nomi',      required: true },
    categoryName: { label: 'Kategoriya',          required: false },
    unitName:     { label: "O'lchov birligi",     required: true },
    barcode:      { label: 'Shtrix kodi',         required: false },
    costPriceUsd: { label: 'Tannarx (USD)',       required: false },
    salePrice:    { label: 'Sotuv narxi (UZS)',   required: false },
    minPrice:     { label: 'Min narx (UZS)',      required: false },
    minStock:     { label: 'Min qoldiq',          required: false },
    initialStock: { label: "Boshlang'ich zaxira", required: false },
}

export default function ProductImportModal({ onClose, onSuccess }) {
    const [step, setStep] = useState(1) // 1: upload, 2: mapping, 3: result
    const [file, setFile] = useState(null)
    const [dragOver, setDragOver] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [warehouseId, setWarehouseId] = useState('')
    const [warehouses, setWarehouses] = useState([])

    // Step 2 data
    const [preview, setPreview] = useState(null) // ImportPreviewResponse
    const [mapping, setMapping] = useState({})   // { fieldName: columnIndex }

    // Step 3 data
    const [result, setResult] = useState(null)   // ImportResultResponse

    useEffect(() => {
        getWarehouses().then(res => {
            const data = res.data
            setWarehouses(Array.isArray(data) ? data : (data.content || []))
        }).catch(() => {})
    }, [])

    const fileInputRef = useRef()

    // ── Template yuklab olish ─────────────────────────────────────
    const handleDownloadTemplate = async () => {
        try {
            const res = await downloadImportTemplate()
            const url = URL.createObjectURL(res.data)
            const a = document.createElement('a')
            a.href = url
            a.download = 'mahsulotlar_shablon.xlsx'
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            setError("Shablonni yuklab olishda xato")
        }
    }

    // ── Fayl tanlash ──────────────────────────────────────────────
    const handleFile = (f) => {
        if (!f) return
        const name = f.name.toLowerCase()
        if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
            setError('Faqat .xlsx yoki .xls fayl qabul qilinadi')
            return
        }
        setError('')
        setFile(f)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragOver(false)
        const f = e.dataTransfer.files[0]
        handleFile(f)
    }

    // ── Step 1 → 2: Preview ───────────────────────────────────────
    const handlePreview = async () => {
        if (!file) return
        setLoading(true)
        setError('')
        try {
            const res = await previewImport(file)
            const data = res.data
            setPreview(data)
            // Auto-mapping'ni boshlang'ich qiymat sifatida o'rnatish
            const initMapping = {}
            for (const field of Object.keys(FIELD_LABELS)) {
                initMapping[field] = data.autoMapping[field] ?? -1
            }
            setMapping(initMapping)
            setStep(2)
        } catch (e) {
            setError(e?.response?.data?.message || "Faylni o'qishda xato yuz berdi")
        } finally {
            setLoading(false)
        }
    }

    // ── Step 2 → 3: Execute ───────────────────────────────────────
    const handleExecute = async () => {
        // Majburiy maydonlarni tekshirish
        const missingRequired = Object.entries(FIELD_LABELS)
            .filter(([k, v]) => v.required && (mapping[k] === undefined || mapping[k] < 0))
            .map(([, v]) => v.label)

        if (missingRequired.length > 0) {
            setError(`Majburiy ustunlar tanlanmagan: ${missingRequired.join(', ')}`)
            return
        }

        setLoading(true)
        setError('')
        try {
            const res = await executeImport(file, mapping, warehouseId || null)
            setResult(res.data)
            setStep(3)
        } catch (e) {
            setError(e?.response?.data?.message || "Import bajarishda xato yuz berdi")
        } finally {
            setLoading(false)
        }
    }

    // ── Xato faylni yuklab olish ──────────────────────────────────
    const handleDownloadErrors = () => {
        if (!result?.errorFileBase64) return
        const bytes = atob(result.errorFileBase64)
        const arr = new Uint8Array(bytes.length)
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
        const blob = new Blob([arr], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'import_xatolar.xlsx'
        a.click()
        URL.revokeObjectURL(url)
    }

    // ── Ustun tanlov opsiyalari ───────────────────────────────────
    const colOptions = preview
        ? [{ value: -1, label: '— Tanlanmagan —' },
           ...preview.headers.map((h, i) => ({ value: i, label: `${i + 1}. ${h}` }))]
        : []

    return (
        <div className="pim-overlay" onClick={onClose}>
            <div className="pim-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="pim-header">
                    <div className="pim-header-left">
                        <FileSpreadsheet size={18} />
                        <span>Excel import</span>
                    </div>
                    <button className="pim-close" onClick={onClose}><X size={18} /></button>
                </div>

                {/* Steps indicator */}
                <div className="pim-steps">
                    {['Fayl yuklash', 'Ustunlarni moslashtirish', 'Natija'].map((label, idx) => (
                        <div key={idx} className={`pim-step ${step === idx + 1 ? 'active' : step > idx + 1 ? 'done' : ''}`}>
                            <div className="pim-step-circle">
                                {step > idx + 1 ? <Check size={12} /> : idx + 1}
                            </div>
                            <span className="pim-step-label">{label}</span>
                            {idx < 2 && <ChevronRight size={14} className="pim-step-arrow" />}
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="pim-body">

                    {/* ── Step 1: Upload ── */}
                    {step === 1 && (
                        <div className="pim-step1">
                            <button className="pim-template-btn" onClick={handleDownloadTemplate}>
                                <Download size={15} />
                                Shablonni yuklab olish (.xlsx)
                            </button>

                            <div className="pim-warehouse-wrap">
                                <label className="pim-warehouse-label">
                                    <Warehouse size={14} />
                                    Ombor (boshlang'ich zaxira uchun)
                                </label>
                                <select
                                    className="pim-warehouse-select"
                                    value={warehouseId}
                                    onChange={e => setWarehouseId(e.target.value)}
                                >
                                    <option value="">— Tanlanmagan (zaxirasiz import) —</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                                {warehouseId && (
                                    <p className="pim-warehouse-hint">
                                        Excel dagi miqdor ustuniga asosan bu omborga qo'shiladi
                                    </p>
                                )}
                            </div>

                            <div
                                className={`pim-dropzone ${dragOver ? 'dragover' : ''} ${file ? 'has-file' : ''}`}
                                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    style={{ display: 'none' }}
                                    onChange={e => handleFile(e.target.files[0])}
                                />
                                {file ? (
                                    <>
                                        <FileSpreadsheet size={32} className="pim-drop-icon pim-drop-icon-ok" />
                                        <p className="pim-drop-filename">{file.name}</p>
                                        <p className="pim-drop-hint">Boshqa fayl tanlash uchun bosing</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={32} className="pim-drop-icon" />
                                        <p className="pim-drop-text">Excel faylini shu yerga tashlang</p>
                                        <p className="pim-drop-hint">yoki bosib tanlang (.xlsx, .xls)</p>
                                    </>
                                )}
                            </div>

                        </div>
                    )}

                    {/* ── Step 2: Column Mapping ── */}
                    {step === 2 && preview && (
                        <div className="pim-step2">
                            <p className="pim-info">
                                Faylda <strong>{preview.totalDataRows}</strong> ta ma'lumot qatori topildi.
                                Har bir maydon uchun mos ustunni tanlang.
                            </p>

                            <div className="pim-mapping-table">
                                <div className="pim-mapping-head">
                                    <span>Tizim maydoni</span>
                                    <span>Excel ustuni</span>
                                </div>
                                {Object.entries(FIELD_LABELS).map(([field, meta]) => (
                                    <div key={field} className="pim-mapping-row">
                                        <span className="pim-field-label">
                                            {meta.label}
                                            {meta.required && <span className="pim-required">*</span>}
                                        </span>
                                        <select
                                            className={`pim-col-select ${mapping[field] >= 0 ? 'mapped' : ''}`}
                                            value={mapping[field] ?? -1}
                                            onChange={e => setMapping(m => ({ ...m, [field]: Number(e.target.value) }))}
                                        >
                                            {colOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            {/* Namuna qatorlar */}
                            {preview.sampleRows.length > 0 && (
                                <div className="pim-sample-wrap">
                                    <p className="pim-sample-title">Namuna ma'lumotlar (birinchi {preview.sampleRows.length} qator):</p>
                                    <div className="pim-sample-scroll">
                                        <table className="pim-sample-table">
                                            <thead>
                                            <tr>
                                                {preview.headers.map((h, i) => (
                                                    <th key={i}>{h}</th>
                                                ))}
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {preview.sampleRows.map((row, r) => (
                                                <tr key={r}>
                                                    {row.map((cell, c) => (
                                                        <td key={c}>{cell || <span className="pim-empty-cell">—</span>}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {/* ── Step 3: Result ── */}
                    {step === 3 && result && (
                        <div className="pim-step3">
                            <div className="pim-result-cards">
                                <div className="pim-result-card pim-result-total">
                                    <span className="pim-result-num">{result.totalRows}</span>
                                    <span className="pim-result-lbl">Jami qator</span>
                                </div>
                                <div className="pim-result-card pim-result-ok">
                                    <span className="pim-result-num">{result.successCount}</span>
                                    <span className="pim-result-lbl">Muvaffaqiyatli</span>
                                </div>
                                <div className="pim-result-card pim-result-err">
                                    <span className="pim-result-num">{result.errorCount}</span>
                                    <span className="pim-result-lbl">Xato</span>
                                </div>
                            </div>

                            {result.successCount > 0 && (
                                <div className="pim-result-msg pim-result-msg-ok">
                                    <Check size={16} />
                                    {result.successCount} ta mahsulot muvaffaqiyatli qo'shildi
                                </div>
                            )}

                            {result.errorCount > 0 && result.errorFileBase64 && (
                                <button className="pim-download-errors" onClick={handleDownloadErrors}>
                                    <Download size={15} />
                                    Xato qatorlarni yuklab olish ({result.errorCount} ta)
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="pim-footer">
                    {error && (
                        <div className="pim-error pim-error-footer">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}
                    <div className="pim-footer-actions">
                        {step === 1 && (
                            <>
                                <button className="pim-btn-cancel" onClick={onClose}>Bekor</button>
                                <button
                                    className="pim-btn-primary"
                                    onClick={handlePreview}
                                    disabled={!file || loading}
                                >
                                    {loading ? <Loader2 size={15} className="spin" /> : <ChevronRight size={15} />}
                                    Davom etish
                                </button>
                            </>
                        )}
                        {step === 2 && (
                            <>
                                <button className="pim-btn-cancel" onClick={() => { setStep(1); setError('') }}>Orqaga</button>
                                <button
                                    className="pim-btn-primary"
                                    onClick={handleExecute}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
                                    Importni boshlash
                                </button>
                            </>
                        )}
                        {step === 3 && (
                            <>
                                {result?.successCount > 0 && (
                                    <button className="pim-btn-cancel" onClick={() => { setStep(1); setFile(null); setResult(null); setError('') }}>
                                        Yana import
                                    </button>
                                )}
                                <button className="pim-btn-primary" onClick={() => { onSuccess?.(); onClose() }}>
                                    <Check size={15} />
                                    Yopish
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}