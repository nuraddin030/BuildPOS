import { useState } from 'react'
import { X, Printer, Minus, Plus } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import '../styles/BulkPrintModal.css'

const STORE_NAME = 'PrimeStroy'

const fmt = (num) =>
    String(Math.round(num || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

function buildLabelHtml(product, qty) {
    const barcode = product.defaultBarcode
    const unitSymbol = product.defaultUnitSymbol || ''
    let barcodeSection = ''

    if (barcode) {
        const svgEl = document.createElement('svg')
        try {
            JsBarcode(svgEl, barcode, {
                format: 'CODE128',
                width: 1.1,
                height: 22,
                displayValue: true,
                fontSize: 6,
                margin: 0,
                textMargin: 1,
            })
            barcodeSection = `
                <div class="divider"></div>
                <div class="bc-wrap">${svgEl.outerHTML}</div>
            `
        } catch { barcodeSection = '' }
    }

    const single = `
        <div class="label">
            <div class="store">${STORE_NAME}</div>
            <div class="divider"></div>
            <div class="body">
                <div class="name">${product.name}</div>
                <div class="price">${fmt(product.defaultSalePrice)} so'm${unitSymbol ? ` / ${unitSymbol}` : ''}</div>
            </div>
            ${barcodeSection}
        </div>
    `
    return Array(qty).fill(single).join('')
}

export default function BulkPrintModal({ products, onClose }) {
    const [quantities, setQuantities] = useState(
        () => Object.fromEntries(products.map(p => [p.id, 1]))
    )

    const setQty = (id, val) => {
        const v = Math.max(1, Math.min(999, val))
        setQuantities(prev => ({ ...prev, [id]: v }))
    }

    const totalLabels = products.reduce((sum, p) => sum + (quantities[p.id] || 1), 0)

    const handlePrint = () => {
        const allLabels = products.map(p => buildLabelHtml(p, quantities[p.id] || 1)).join('')

        const win = window.open('', '_blank', 'width=400,height=600')
        win.document.write(`<!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <title>Narx etiketi</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: 40mm 30mm; margin: 0; }
            body { font-family: Arial, sans-serif; background: #fff; }
            .label {
                width: 40mm;
                height: 30mm;
                display: flex;
                flex-direction: column;
                align-items: stretch;
                page-break-after: always;
                overflow: hidden;
                border: 0.3mm solid #000;
            }
            .store {
                font-size: 7.5pt;
                font-weight: 700;
                text-align: center;
                padding: 1mm 2mm;
                letter-spacing: 0.5px;
            }
            .divider { border-top: 0.3mm solid #000; width: 100%; }
            .body {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 1mm 2mm;
                gap: 1mm;
            }
            .name {
                font-size: 7pt;
                font-weight: 600;
                text-align: center;
                line-height: 1.2;
                word-break: break-word;
            }
            .price {
                font-size: 11pt;
                font-weight: 900;
                text-align: center;
                line-height: 1;
            }
            .bc-wrap {
                display: flex;
                justify-content: center;
                padding: 0.5mm 1mm;
            }
            .bc-wrap svg { max-width: 36mm; height: auto; }
        </style>
        </head><body>${allLabels}
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}<\/script>
        </body></html>`)
        win.document.close()
    }

    return (
        <div className="bpm-overlay" onClick={onClose}>
            <div className="bpm-modal" onClick={e => e.stopPropagation()}>
                <div className="bpm-header">
                    <div className="bpm-header-left">
                        <Printer size={17} />
                        <span>Ommaviy etiket chop etish</span>
                    </div>
                    <button className="bpm-close" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="bpm-body">
                    <p className="bpm-hint">Har bir mahsulot uchun nusxa sonini kiriting:</p>
                    <div className="bpm-list">
                        {products.map(p => (
                            <div key={p.id} className="bpm-row">
                                <div className="bpm-row-name">{p.name}</div>
                                <div className="bpm-row-price">{fmt(p.defaultSalePrice)} so'm</div>
                                <div className="bpm-qty-controls">
                                    <button
                                        className="bpm-qty-btn"
                                        onClick={() => setQty(p.id, (quantities[p.id] || 1) - 1)}
                                        disabled={(quantities[p.id] || 1) <= 1}
                                    >
                                        <Minus size={13} />
                                    </button>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        className="bpm-qty-input"
                                        value={quantities[p.id] || 1}
                                        onChange={e => {
                                            const v = parseInt(e.target.value)
                                            if (!isNaN(v) && v > 0) setQty(p.id, v)
                                        }}
                                    />
                                    <button
                                        className="bpm-qty-btn"
                                        onClick={() => setQty(p.id, (quantities[p.id] || 1) + 1)}
                                    >
                                        <Plus size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bpm-footer">
                    <button className="bpm-btn-cancel" onClick={onClose}>Bekor</button>
                    <button className="bpm-btn-print" onClick={handlePrint}>
                        <Printer size={15} />
                        Chop etish ({totalLabels} ta)
                    </button>
                </div>
            </div>
        </div>
    )
}