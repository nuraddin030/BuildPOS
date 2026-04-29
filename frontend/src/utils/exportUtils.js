/**
 * BuildPOS — Export Utilities
 */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// ── Excel Export ─────────────────────────────────────────────────
export function exportToExcel(filename, headers, rows) {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

    const colWidths = headers.map((h, ci) => {
        let max = String(h).length
        for (const row of rows) {
            const len = String(row[ci] ?? '').length
            if (len > max) max = len
        }
        return { wch: Math.min(max + 2, 40) }
    })
    ws['!cols'] = colWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Hisobot')
    XLSX.writeFile(wb, `${filename}.xlsx`)
}

// O'zbek apostroflarini PDF uchun xavfsiz belgiga aylantiradi
function sanitize(val) {
    return String(val ?? '').replace(/['‘’`]/g, "'")
}

function sanitizeArr(arr) {
    return arr.map(v => sanitize(v))
}

// ── PDF Export ────────────────────────────────────────────────────
export async function exportToPDF({ filename, title, subtitle, headers, rows, summary }) {
    const doc = new jsPDF({
        orientation: rows[0]?.length > 6 ? 'landscape' : 'portrait',
        unit: 'mm', format: 'a4'
    })

    const safeTitle    = sanitize(title)
    const safeSubtitle = sanitize(subtitle)
    const safeHeaders  = sanitizeArr(headers)
    const safeRows     = rows.map(sanitizeArr)

    doc.setFontSize(15)
    doc.setTextColor(30, 30, 30)
    doc.text(safeTitle, 14, 16)

    let y = 22

    if (safeSubtitle) {
        doc.setFontSize(9); doc.setTextColor(100, 100, 100)
        doc.text(safeSubtitle, 14, y); y += 6
    }

    doc.setFontSize(8); doc.setTextColor(130, 130, 130)
    doc.text(
        `Sana: ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
        14, y
    )
    y += 5

    if (summary?.length) {
        doc.setFontSize(9); doc.setTextColor(50, 50, 50)
        doc.text(summary.map(s => `${sanitize(s.label)}: ${sanitize(s.value)}`).join('    |    '), 14, y + 3)
        y += 9
    }

    autoTable(doc, {
        head: [safeHeaders], body: safeRows, startY: y + 2,
        styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        margin: { left: 14, right: 14 },
    })

    doc.save(`${filename}.pdf`)
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