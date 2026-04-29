import { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'

/**
 * Dropdown ni document.body ga render qiladi (portal).
 * overflow:hidden, table — hech narsa clip qilmaydi.
 * anchorEl — trigger tugma DOM elementi (e.currentTarget)
 * Pastda joy yetmasa yuqoriga ochiladi.
 */
export default function DropdownPortal({ anchorEl, onClose, children }) {
    const ref = useRef(null)

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target) &&
                anchorEl && !anchorEl.contains(e.target)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [onClose, anchorEl])

    if (!anchorEl) return null
    const rect = anchorEl.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < 220

    return ReactDOM.createPortal(
        <div
            ref={ref}
            className="act-dropdown"
            style={{
                position: 'fixed',
                top: openUp ? 'auto' : rect.bottom + 4,
                bottom: openUp ? (window.innerHeight - rect.top + 4) : 'auto',
                right: window.innerWidth - rect.right,
                zIndex: 9999,
            }}
        >
            {children}
        </div>,
        document.body
    )
}