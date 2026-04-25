import { AlertTriangle } from 'lucide-react'

export default function ConfirmModal({
    title = 'Tasdiqlash',
    message,
    confirmLabel = 'Tasdiqlash',
    cancelLabel = 'Bekor',
    confirmClass = 'btn-save',
    variant = 'default',
    onConfirm,
    onCancel,
}) {
    return (
        <div className="confirm-modal-overlay" onClick={onCancel}>
            <div className="confirm-modal" onClick={e => e.stopPropagation()}>
                <div className={`confirm-modal-icon confirm-modal-icon--${variant}`}>
                    <AlertTriangle size={22} />
                </div>
                <div className="confirm-modal-title">{title}</div>
                <div className="confirm-modal-msg">{message}</div>
                <div className="confirm-modal-actions">
                    <button className="btn-cancel" onClick={onCancel}>{cancelLabel}</button>
                    <button className={confirmClass} onClick={onConfirm}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    )
}