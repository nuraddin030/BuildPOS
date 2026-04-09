import { useState, useEffect, useRef } from 'react'
import { X, Printer, Minus, Plus } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import '../styles/PriceLabelModal.css'

const STORE_NAME = 'PrimeStroy'

const fmt = (num) =>
    String(Math.round(num || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

function LabelPreview({ product, unitSymbol, qty }) {
    const barcodeRef = useRef(null)
    const barcode = product.defaultBarcode

    useEffect(() => {
        if (barcodeRef.current && barcode) {
            try {
                JsBarcode(barcodeRef.current, barcode, {
                    format: 'CODE128',
                    width: 1.4,
                    height: 28,
                    displayValue: true,
                    fontSize: 7,
                    margin: 0,
                    textMargin: 2,
                })
            } catch {
                // barcode noto'g'ri format bo'lsa e'tiborsiz qoldirish
            }
        }
    }, [barcode])

    return (
        <div className="plm-label">
            <div className="plm-store">{STORE_NAME}</div>
            <div className="plm-name">{product.name}</div>
            <div className="plm-price">
                {fmt(product.defaultSalePrice)} so'm
                {unitSymbol && <span className="plm-unit"> / {unitSymbol}</span>}
            </div>
            {barcode ? (
                <div className="plm-barcode-wrap">
                    <svg ref={barcodeRef} />
                </div>
            ) : (
                <div className="plm-no-barcode">Shtrix kod yo'q</div>
            )}
            {qty > 1 && (
                <div className="plm-qty-badge">{qty} ta</div>
            )}
        </div>
    )
}

export default function PriceLabelModal({ product, onClose }) {
    const [qty, setQty] = useState(1)

    const unitSymbol = product.defaultUnitSymbol || ''

    const handlePrint = () => {
        const barcode = product.defaultBarcode
        let barcodeHtml = ''

        if (barcode) {
            // SVG ni string sifatida olish (JsBarcode orqali)
            const svgEl = document.createElement('svg')
            try {
                JsBarcode(svgEl, barcode, {
                    format: 'CODE128',
                    width: 1.4,
                    height: 28,
                    displayValue: true,
                    fontSize: 7,
                    margin: 0,
                    textMargin: 2,
                })
                barcodeHtml = `<div class="bc-wrap">${svgEl.outerHTML}</div>`
            } catch {
                barcodeHtml = ''
            }
        }

        const labelHtml = `
            <div class="label">
                <div class="store">${STORE_NAME}</div>
                <div class="name">${product.name}</div>
                <div class="price">${fmt(product.defaultSalePrice)} so'm${unitSymbol ? ` / ${unitSymbol}` : ''}</div>
                ${barcodeHtml}
            </div>
        `

        const labels = Array(qty).fill(labelHtml).join('')

        const win = window.open('', '_blank', 'width=400,height=600')
        win.document.write(`<!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <title>Narx etiketi</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page {
                size: 40mm 30mm;
                margin: 0;
            }
            body {
                font-family: Arial, sans-serif;
                background: #fff;
            }
            .label {
                width: 40mm;
                height: 30mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 1.5mm 2mm;
                gap: 0.5mm;
                page-break-after: always;
                overflow: hidden;
            }
            .store {
                font-size: 6pt;
                font-weight: 600;
                color: #555;
                text-align: center;
                letter-spacing: 0.5px;
            }
            .name {
                font-size: 7.5pt;
                font-weight: 700;
                text-align: center;
                line-height: 1.2;
                max-height: 8mm;
                overflow: hidden;
                word-break: break-word;
            }
            .price {
                font-size: 12pt;
                font-weight: 900;
                text-align: center;
                line-height: 1;
            }
            .bc-wrap {
                display: flex;
                justify-content: center;
                margin-top: 0.5mm;
            }
            .bc-wrap svg {
                max-width: 36mm;
                height: auto;
            }
        </style>
        </head><body>${labels}<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script></body></html>`)
        win.document.close()
    }

    return (
        <div className="plm-overlay" onClick={onClose}>
            <div className="plm-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="plm-header">
                    <div className="plm-header-left">
                        <Printer size={17} />
                        <span>Narx etiketi</span>
                    </div>
                    <button className="plm-close" onClick={onClose}><X size={18} /></button>
                </div>

                {/* Preview */}
                <div className="plm-body">
                    <p className="plm-hint">Ko'rinish (40×30mm):</p>
                    <div className="plm-preview-wrap">
                        <LabelPreview product={product} unitSymbol={unitSymbol} qty={qty} />
                    </div>

                    {/* Quantity */}
                    <div className="plm-qty-wrap">
                        <span className="plm-qty-label">Nusxa soni:</span>
                        <div className="plm-qty-controls">
                            <button
                                className="plm-qty-btn"
                                onClick={() => setQty(q => Math.max(1, q - 1))}
                                disabled={qty <= 1}
                            >
                                <Minus size={14} />
                            </button>
                            <input
                                type="text"
                                inputMode="numeric"
                                className="plm-qty-input"
                                value={qty}
                                onChange={e => {
                                    const v = parseInt(e.target.value)
                                    if (!isNaN(v) && v > 0) setQty(Math.min(v, 999))
                                }}
                            />
                            <button
                                className="plm-qty-btn"
                                onClick={() => setQty(q => Math.min(999, q + 1))}
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="plm-footer">
                    <button className="plm-btn-cancel" onClick={onClose}>Bekor</button>
                    <button className="plm-btn-print" onClick={handlePrint}>
                        <Printer size={15} />
                        Chop etish ({qty} ta)
                    </button>
                </div>
            </div>
        </div>
    )
}
