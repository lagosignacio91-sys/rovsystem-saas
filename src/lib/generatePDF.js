import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const LOGO_PATH = '/logo.png'

async function loadLogoBase64() {
  try {
    const res = await fetch(LOGO_PATH)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function urlToBase64(url) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function generarPDFEntrega(entrega) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const margin = 14

  const logo = await loadLogoBase64()

  // ── Encabezado ──
  let headerY = 12
  if (logo) {
    doc.addImage(logo, 'PNG', margin, headerY, 14, 14)
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(10, 37, 64)
  doc.text('GL Robótica Submarina', logo ? margin + 17 : margin, headerY + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 100, 120)
  doc.text('Informe de entrega de turno', logo ? margin + 17 : margin, headerY + 10)

  // línea separadora
  doc.setDrawColor(200, 215, 230)
  doc.line(margin, headerY + 16, W - margin, headerY + 16)

  // ── Datos generales ──
  let y = headerY + 22
  doc.setFontSize(8)
  doc.setTextColor(100, 120, 140)

  const campos = [
    ['Centro',        entrega.centroNombre],
    ['Fecha',         entrega.fecha],
    ['Hora',          entrega.hora],
    ['Piloto',        entrega.piloto],
    ['Relevo',        entrega.relevo ?? entrega.backup],
    ['Equipo ppal',   entrega.equipo],
    ['Equipo backup', entrega.equipoBackup],
  ]

  const colW = (W - margin * 2) / 3
  const filasDatos = Math.ceil(campos.length / 3)
  campos.forEach(([label, valor], i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x   = margin + col * colW
    const ry  = y + row * 10
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 100, 120)
    doc.text(label + ':', x, ry)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 40, 60)
    doc.text(valor || '—', x + 22, ry)
  })

  if (entrega.observacionGeneral) {
    y += filasDatos * 10
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 100, 120)
    doc.text('Observación general:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 40, 60)
    const lines = doc.splitTextToSize(entrega.observacionGeneral, W - margin * 2 - 40)
    doc.text(lines, margin + 40, y)
    y += lines.length * 4 + 4
  } else {
    y += filasDatos * 10 + 2
  }

  // ── Inspección de equipos (principal + backup) ──
  async function dibujarInspeccion(titulo, inspeccion) {
    if (!inspeccion || inspeccion.length === 0) return

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(10, 37, 64)
    doc.text(titulo, margin, y)
    y += 3

    const fotoImgs = []
    for (const sec of inspeccion) {
      let img = null
      if (sec.fotoUrl) img = await urlToBase64(sec.fotoUrl)
      fotoImgs.push(img)
    }

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Componente', 'Estado', 'Nota', 'Foto']],
      body: inspeccion.map((sec) => [
        sec.label,
        sec.estado === 'ok' ? 'Sin anomalías' : 'Anomalía',
        sec.nota || '—',
        '',
      ]),
      headStyles: {
        fillColor: [10, 37, 64],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { cellWidth: 28 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 22 },
      },
      bodyStyles: { fontSize: 8, textColor: [20, 40, 60] },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      didParseCell(data) {
        if (data.column.index === 1 && data.section === 'body') {
          const sec = inspeccion[data.row.index]
          data.cell.styles.textColor = sec?.estado === 'ok' ? [22, 163, 74] : [220, 38, 38]
          data.cell.styles.fontStyle = 'bold'
        }
      },
      didDrawCell(data) {
        if (data.column.index === 3 && data.section === 'body') {
          const img = fotoImgs[data.row.index]
          if (img) {
            const pad = 1
            doc.addImage(img, 'JPEG',
              data.cell.x + pad,
              data.cell.y + pad,
              data.cell.width  - pad * 2,
              data.cell.height - pad * 2
            )
          }
        }
      },
      rowPageBreak: 'avoid',
    })

    y = doc.lastAutoTable.finalY + 8
  }

  const equipoPpalNombre = entrega.equipo ? `Inspección equipo principal (${entrega.equipo})` : 'Inspección equipo principal'
  const equipoBkpNombre  = entrega.equipoBackup ? `Inspección equipo backup (${entrega.equipoBackup})` : 'Inspección equipo backup'
  await dibujarInspeccion(equipoPpalNombre, entrega.inspeccion)
  await dibujarInspeccion(equipoBkpNombre, entrega.inspeccionBackup)

  // ── Inventario ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(10, 37, 64)
  doc.text('Inventario de insumos', margin, y)
  y += 3

  const mitad = Math.ceil(entrega.inventario.length / 2)
  const col1  = entrega.inventario.slice(0, mitad)
  const col2  = entrega.inventario.slice(mitad)
  const rows  = col1.map((item, i) => {
    const item2 = col2[i]
    return [
      item.label, String(item.cantidad ?? 0),
      item2 ? item2.label : '', item2 ? String(item2.cantidad ?? 0) : '',
    ]
  })

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Insumo', 'Cant.', 'Insumo', 'Cant.']],
    body: rows,
    headStyles: {
      fillColor: [10, 37, 64],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 16, halign: 'center' },
    },
    bodyStyles: { fontSize: 8, textColor: [20, 40, 60] },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    didParseCell(data) {
      if ((data.column.index === 1 || data.column.index === 3) && data.section === 'body') {
        if (data.cell.text[0] === '0') {
          data.cell.styles.textColor = [220, 38, 38]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  if (entrega.observacionFinal) {
    y = doc.lastAutoTable.finalY + 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(80, 100, 120)
    doc.text('Observaciones finales:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 40, 60)
    const lines = doc.splitTextToSize(entrega.observacionFinal, W - margin * 2 - 38)
    doc.text(lines, margin + 38, y)
  }

  // ── Pie de página ──
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setDrawColor(200, 215, 230)
    doc.line(margin, 287, W - margin, 287)
    doc.setFontSize(7)
    doc.setTextColor(150, 170, 190)
    doc.text(`GL Robótica Submarina · Generado ${new Date().toLocaleString('es-CL')}`, margin, 291)
    doc.text(`Página ${p} de ${totalPages}`, W - margin, 291, { align: 'right' })
  }

  return doc
}

export async function descargarPDF(entrega) {
  const doc = await generarPDFEntrega(entrega)
  const fecha = entrega.fecha?.replace(/\//g, '-') ?? 'informe'
  doc.save(`Entrega-Turno-${entrega.centroNombre}-${fecha}.pdf`)
}

export async function compartirPDF(entrega) {
  const doc = await generarPDFEntrega(entrega)
  const fecha = entrega.fecha?.replace(/\//g, '-') ?? 'informe'
  const nombre = `Entrega-Turno-${entrega.centroNombre}-${fecha}.pdf`
  const blob = doc.output('blob')
  const file = new File([blob], nombre, { type: 'application/pdf' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `Entrega de turno — ${entrega.centroNombre}`,
      text:  `Informe de entrega de turno · ${entrega.centroNombre} · ${entrega.fecha}`,
    })
  } else {
    doc.save(nombre)
  }
}
