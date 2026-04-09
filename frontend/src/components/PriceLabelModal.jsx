import { useState, useEffect, useRef } from 'react'
import { X, Printer, Minus, Plus } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import '../styles/PriceLabelModal.css'

const STORE_NAME = 'PrimeStroy'

const fmt = (num) =>
    String(Math.round(num || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

function LabelPreview({ product, unitSymbol }) {
    const barcodeRef = useRef(null)
    const barcode = product.defaultBarcode

    useEffect(() => {
        if (barcodeRef.current && barcode) {
            try {
                JsBarcode(barcodeRef.current, barcode, {
                    format: 'CODE128',
                    width: 1.1,
                    height: 22,
                    displayValue: true,
                    fontSize: 6,
                    margin: 0,
                    textMargin: 1,
                })
            } catch { /* noto'g'ri format */ }
        }
    }, [barcode])

    return (
        <div className="plm-label">
            {/* Do'kon nomi */}
            <div className="plm-label-store">{STORE_NAME}</div>

            {/* Ajratuvchi chiziq */}
            <div className="plm-label-divider" />

            {/* Mahsulot nomi + narx */}
            <div className="plm-label-body">
                <div className="plm-label-name">{product.name}</div>
                <div className="plm-label-price">
                    {fmt(product.defaultSalePrice)} so'm
                    {unitSymbol && <span className="plm-label-unit"> / {unitSymbol}</span>}
                </div>
            </div>

            {/* Ajratuvchi chiziq */}
            {barcode && <div className="plm-label-divider" />}

            {/* Shtrix kod */}
            {barcode ? (
                <div className="plm-label-barcode">
                    <svg ref={barcodeRef} />
                </div>
            ) : (
                <div className="plm-label-no-barcode">Shtrix kod yo'q</div>
            )}
        </div>
    )
}

export default function PriceLabelModal({ product, onClose }) {
    const [qty, setQty] = useState(1)
    const unitSymbol = product.defaultUnitSymbol || ''

    const handlePrint = () => {
        const barcode = product.defaultBarcode
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

        const labelHtml = `
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

        const labels = Array(qty).fill(labelHtml).join('')

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
            .divider {
                border-top: 0.3mm solid #000;
                width: 100%;
            }
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
            .bc-wrap svg {
                max-width: 36mm;
                height: auto;
            }
        </style>
        </head><body>${labels}
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}<\/script>
        </body></html>`)
        win.document.close()
    }

    return (
        <div className="plm-overlay" onClick={onClose}>
            <div className="plm-modal" onClick={e => e.stopPropagation()}>
                <div className="plm-header">
                    <div className="plm-header-left">
                        <Printer size={17} />
                        <span>Narx etiketi</span>
                    </div>
                    <button className="plm-close" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="plm-body">
                    <p className="plm-hint">Ko'rinish (40×30mm):</p>
                    <div className="plm-preview-wrap">
                        <LabelPreview product={product} unitSymbol={unitSymbol} />
                    </div>

                    <div className="plm-qty-wrap">
                        <span className="plm-qty-label">Nusxa soni:</span>
                        <div className="plm-qty-controls">
                            <button className="plm-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}>
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
                            <button className="plm-qty-btn" onClick={() => setQty(q => Math.min(999, q + 1))}>
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                </div>

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