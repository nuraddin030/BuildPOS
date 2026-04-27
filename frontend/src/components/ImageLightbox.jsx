import { useEffect } from 'react'
import { X } from 'lucide-react'
import '../styles/ImageLightbox.css'

export default function ImageLightbox({ src, alt = '', onClose }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = prev
        }
    }, [onClose])

    if (!src) return null

    return (
        <div className="image-lightbox-overlay" onClick={onClose}>
            <button className="image-lightbox-close" onClick={onClose} aria-label="Yopish">
                <X size={22} />
            </button>
            <img
                src={src}
                alt={alt}
                className="image-lightbox-img"
                onClick={e => e.stopPropagation()}
            />
        </div>
    )
}