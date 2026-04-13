import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { X } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

export default function CameraScanner({ onDetected, onClose }) {
    const instanceRef = useRef(null)
    const isRunningRef = useRef(false)
    const startedRef = useRef(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    const stopScanner = () => {
        if (instanceRef.current && isRunningRef.current) {
            isRunningRef.current = false
            instanceRef.current.stop().catch(() => {})
            instanceRef.current = null
        }
    }

    const doStart = (scanner, cameraConstraint) => {
        scanner.start(
            cameraConstraint,
            { fps: 10, qrbox: { width: 240, height: 160 } },
            (code) => {
                isRunningRef.current = false
                scanner.stop().catch(() => {})
                instanceRef.current = null
                onDetected(code)
                onClose()
            },
            () => {}
        )
        .then(() => { isRunningRef.current = true; setLoading(false) })
        .catch(() => {
            if (cameraConstraint?.facingMode) {
                Html5Qrcode.getCameras()
                    .then(cameras => {
                        if (!cameras.length) { setError('Kamera topilmadi'); return }
                        doStart(scanner, cameras[cameras.length - 1].id)
                    })
                    .catch(e => setError('Kameraga ruxsat berilmagan: ' + (e?.message || e)))
            } else {
                setError('Kamera topilmadi yoki ruxsat yo\'q')
            }
        })
    }

    useEffect(() => {
        if (startedRef.current) return
        startedRef.current = true

        const el = document.getElementById('pos-qr-reader')
        if (el) el.innerHTML = ''
        const scanner = new Html5Qrcode('pos-qr-reader')
        instanceRef.current = scanner
        doStart(scanner, { facingMode: 'environment' })

        return () => { stopScanner() }
    }, [])

    const handleClose = () => {
        stopScanner()
        onClose()
    }

    return ReactDOM.createPortal(
        <div className="pos-overlay" onClick={handleClose}>
            <div className="pos-modal pos-modal--sm pos-camera-modal" onClick={e => e.stopPropagation()}>
                <div className="pos-mh">
                    Kamera bilan skanerlash
                    <button onClick={handleClose} className="pos-modal-close"><X size={18} /></button>
                </div>
                <div className="pos-camera-body">
                    {error ? (
                        <div className="pos-camera-error">{error}</div>
                    ) : (
                        <>
                            {loading && <div className="pos-camera-loading">Kamera yoqilmoqda...</div>}
                            <div id="pos-qr-reader" className="pos-qr-reader" />
                            <div className="pos-camera-hint">QR kod yoki shtrix-kodni kameraga ko'rsating</div>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
