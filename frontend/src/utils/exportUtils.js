/**
 * BuildPOS — Export Utilities
 * CSV va PDF export uchun umumiy funksiyalar
 */
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

// ── CSV Export ────────────────────────────────────────────────────
export function exportToCSV(filename, headers, rows) {
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [
        headers.map(escape).join(','),
        ...rows.map(row => row.map(escape).join(','))
    ]
    const csv = '\uFEFF' + lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

// ── PDF Export ────────────────────────────────────────────────────
export async function exportToPDF({ filename, title, subtitle, headers, rows, summary }) {
    try {
        const doc = new jsPDF({
            orientation: rows[0]?.length > 6 ? 'landscape' : 'portrait',
            unit: 'mm', format: 'a4'
        })

        doc.setFontSize(15)
        doc.setTextColor(30, 30, 30)
        doc.text(title, 14, 16)

        let y = 22

        if (subtitle) {
            doc.setFontSize(9); doc.setTextColor(100, 100, 100)
            doc.text(subtitle, 14, y); y += 6
        }

        doc.setFontSize(8); doc.setTextColor(130, 130, 130)
        doc.text(
            `Sana: ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
            14, y
        )
        y += 5

        if (summary?.length) {
            doc.setFontSize(9); doc.setTextColor(50, 50, 50)
            doc.text(summary.map(s => `${s.label}: ${s.value}`).join('    |    '), 14, y + 3)
            y += 9
        }

        doc.autoTable({
            head: [headers], body: rows, startY: y + 2,
            styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
            alternateRowStyles: { fillColor: [248, 249, 250] },
            margin: { left: 14, right: 14 },
        })

        doc.save(`${filename}.pdf`)
    } catch (e) {
        exportToCSV(filename, headers, rows)
    }
}

// ── Yordamchi formatlar ───────────────────────────────────────────
export const fmtNum = (num) =>
    num == null ? '0' : String(Math.round(Number(num))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

export const fmtDate = (dt) => {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('ru-RU')
}

export const fmtDateTime = (dt) => {
    if (!dt) return '—'
    const d = new Date(dt)
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}