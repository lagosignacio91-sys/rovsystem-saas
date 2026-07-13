import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { db } from './firebase'
import { doc as fsDoc, getDoc } from 'firebase/firestore'

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
  if (!url) return null
  if (url.startsWith('data:')) return url
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
  const H = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentW = W - margin * 2

  const logo = await loadLogoBase64()
  let y = 0

  function addPageHeader() {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(10, 37, 64)
    doc.text('GL Robótica Submarina · Entrega de Turno', margin, 10)
    doc.setDrawColor(200, 215, 230)
    doc.line(margin, 12, W - margin, 12)
    return 17
  }

  function checkPageBreak(neededH) {
    if (y + neededH > H - 16) {
      doc.addPage()
      y = addPageHeader()
    }
  }

  // ── Encabezado primera página ──
  y = 12
  if (logo) {
    doc.addImage(logo, 'PNG', margin, y, 14, 14)
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(10, 37, 64)
  doc.text('GL Robótica Submarina', logo ? margin + 17 : margin, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 100, 120)
  doc.text('Informe de entrega de turno', logo ? margin + 17 : margin, y + 10)
  doc.setDrawColor(200, 215, 230)
  doc.line(margin, y + 16, W - margin, y + 16)
  y += 22

  // ── Datos generales ──
  const campos = [
    ['Centro',        entrega.centroNombre],
    ['Fecha',         entrega.fecha],
    ['Hora',          entrega.hora],
    ['Piloto',        entrega.piloto],
    ['Relevo',        entrega.relevo ?? entrega.backup],
    ['Equipo ppal',   entrega.equipo],
    ['Equipo backup', entrega.equipoBackup],
  ]

  const colW = contentW / 3
  const filasDatos = Math.ceil(campos.length / 3)
  campos.forEach(([label, valor], i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x   = margin + col * colW
    const ry  = y + row * 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(80, 100, 120)
    doc.text(label + ':', x, ry)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 40, 60)
    doc.text(valor || '—', x + 25, ry)
  })

  if (entrega.observacionGeneral) {
    y += filasDatos * 10 + 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(80, 100, 120)
    doc.text('Observación general:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 40, 60)
    const lines = doc.splitTextToSize(entrega.observacionGeneral, contentW - 42)
    doc.text(lines, margin + 42, y)
    y += lines.length * 4 + 6
  } else {
    y += filasDatos * 10 + 4
  }

  // ── Función inspección: tabla + foto-grid ──
  async function dibujarInspeccion(titulo, inspeccion) {
    if (!inspeccion || inspeccion.length === 0) return

    checkPageBreak(30)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(10, 37, 64)
    doc.text(titulo, margin, y)
    y += 4

    // Pre-cargar imágenes antes de dibujar la tabla
    const fotoImgs = []
    for (const sec of inspeccion) {
      fotoImgs.push(sec.fotoUrl ? await urlToBase64(sec.fotoUrl) : null)
    }

    // Tabla sin columna de foto
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Componente', 'Estado', 'Observación']],
      body: inspeccion.map((sec) => [
        sec.label,
        sec.estado === 'ok' ? 'Sin anomalías' : 'Anomalía',
        sec.nota || '—',
      ]),
      headStyles: {
        fillColor: [10, 37, 64],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 34 },
        2: { cellWidth: 'auto' },
      },
      bodyStyles: { fontSize: 8, textColor: [20, 40, 60], minCellHeight: 8 },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      didParseCell(data) {
        if (data.column.index === 1 && data.section === 'body') {
          const sec = inspeccion[data.row.index]
          data.cell.styles.textColor = sec?.estado === 'ok' ? [22, 163, 74] : [220, 38, 38]
          data.cell.styles.fontStyle = 'bold'
        }
      },
      rowPageBreak: 'avoid',
    })

    y = doc.lastAutoTable.finalY + 6

    // Fotos: grid de 2 columnas
    const sectWithPhotos = inspeccion
      .map((sec, i) => ({ sec, img: fotoImgs[i] }))
      .filter(x => x.img)

    if (sectWithPhotos.length > 0) {
      const gap    = 5
      const photoW = (contentW - gap) / 2
      const photoH = Math.round(photoW * 0.65)
      const labelH = 7

      checkPageBreak(12)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(10, 37, 64)
      doc.text('Registro fotográfico', margin, y)
      y += 5

      for (let i = 0; i < sectWithPhotos.length; i += 2) {
        const left  = sectWithPhotos[i]
        const right = sectWithPhotos[i + 1]

        checkPageBreak(photoH + labelH + 4)

        const x1 = margin
        const x2 = margin + photoW + gap

        // Foto izquierda
        doc.setDrawColor(180, 200, 220)
        doc.setFillColor(230, 238, 246)
        doc.rect(x1, y, photoW, photoH, 'FD')
        try {
          doc.addImage(left.img, 'JPEG', x1, y, photoW, photoH, undefined, 'FAST')
        } catch { /* imagen inválida — quedará fondo azul */ }
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(50, 80, 120)
        doc.text(left.sec.label, x1 + photoW / 2, y + photoH + 5, { align: 'center' })

        // Foto derecha
        if (right) {
          doc.setDrawColor(180, 200, 220)
          doc.setFillColor(230, 238, 246)
          doc.rect(x2, y, photoW, photoH, 'FD')
          try {
            doc.addImage(right.img, 'JPEG', x2, y, photoW, photoH, undefined, 'FAST')
          } catch { /* imagen inválida */ }
          doc.text(right.sec.label, x2 + photoW / 2, y + photoH + 5, { align: 'center' })
        }

        y += photoH + labelH + 4
      }
    }

    y += 6
  }

  const ppalTitulo = entrega.equipo
    ? `Inspección equipo principal — ${entrega.equipo}`
    : 'Inspección equipo principal'
  const bkpTitulo = entrega.equipoBackup
    ? `Inspección equipo backup — ${entrega.equipoBackup}`
    : 'Inspección equipo backup'

  await dibujarInspeccion(ppalTitulo, entrega.inspeccion)
  await dibujarInspeccion(bkpTitulo,  entrega.inspeccionBackup)

  // ── Inventario ──
  checkPageBreak(30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(10, 37, 64)
  doc.text('Inventario de insumos', margin, y)
  y += 4

  const mitad = Math.ceil((entrega.inventario ?? []).length / 2)
  const col1  = (entrega.inventario ?? []).slice(0, mitad)
  const col2  = (entrega.inventario ?? []).slice(mitad)
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
    checkPageBreak(16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(80, 100, 120)
    doc.text('Observaciones finales:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 40, 60)
    const lines = doc.splitTextToSize(entrega.observacionFinal, contentW - 40)
    doc.text(lines, margin + 40, y)
  }

  // ── Pie de página en todas las páginas ──
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setDrawColor(200, 215, 230)
    doc.line(margin, H - 8, W - margin, H - 8)
    doc.setFontSize(7)
    doc.setTextColor(150, 170, 190)
    doc.text(
      `Generado con RovSystem · HyperionX · ${new Date().toLocaleString('es-CL')}`,
      margin, H - 4
    )
    doc.text(`Página ${p} de ${totalPages}`, W - margin, H - 4, { align: 'right' })
  }

  return doc
}

async function construirPDFBitacora(bitacora, centro) {
  const { jsPDF } = await import('jspdf')
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const W     = doc.internal.pageSize.getWidth()
  const margin = 14
  let y = 20

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`Bitácora Diaria — ${centro.nombre}`, margin, y)
  y += 8

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`GL Robótica · ${bitacora.fecha ?? '—'}`, margin, y)
  y += 10

  doc.setTextColor(30)
  const campos = [
    ['Fecha',           bitacora.fecha],
    ['Piloto',          bitacora.piloto],
    ['Team',            bitacora.team],
    ['Área',            bitacora.area],
    ['Estado puerto',   bitacora.estadoPuerto],
    ['Jornada AM',      bitacora.jornadaAm],
    ['Jornada PM',      bitacora.jornadaPm],
    ['Observaciones',   bitacora.observaciones],
  ].filter(([, v]) => v)

  for (const [label, valor] of campos) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(`${label}:`, margin, y)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(String(valor), W - margin * 2 - 35)
    doc.text(lines, margin + 36, y)
    y += lines.length * 5 + 2
  }

  // Equipos (estado actual, en vivo) al final de la bitácora.
  let rov = null
  try {
    const snapRov = await getDoc(fsDoc(db, 'centros', centro.id, 'equipos', 'rov'))
    if (snapRov.exists()) rov = snapRov.data()
  } catch { /* sin permiso o sin datos: se omite la sección */ }

  if (rov) {
    y += 4
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30)
    doc.text('Equipos', margin, y)
    y += 6

    const bloqueEquipo = (titulo, eq) => {
      if (!eq) return
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(titulo, margin, y)
      y += 5
      const filas = [
        ['Modelo',            eq.modelo],
        ['Código ROV',        eq.codigoRov],
        ['Código Control',    eq.codigoControl],
        ['Código Umbilical',  eq.codigoUmbilical],
        ['Cargador ROV',      eq.codigoCargadorRov],
        ['Cargador Control',  eq.codigoCargadorControl],
        ['Observación',       eq.observacion || 'Operativo'],
      ].filter(([, v]) => v)
      for (const [label, valor] of filas) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(`${label}:`, margin + 4, y)
        doc.setFont('helvetica', 'normal')
        const lines = doc.splitTextToSize(String(valor), W - margin * 2 - 45)
        doc.text(lines, margin + 42, y)
        y += lines.length * 5 + 1
      }
      y += 3
    }

    bloqueEquipo('Equipo Principal', rov.principal)
    bloqueEquipo('Equipo Backup', rov.backup)
  }

  // Pie de marca de la plataforma
  const H = doc.internal.pageSize.getHeight()
  doc.setDrawColor(200, 215, 230)
  doc.line(margin, H - 8, W - margin, H - 8)
  doc.setFontSize(7)
  doc.setTextColor(150, 170, 190)
  doc.text(`Generado con RovSystem · HyperionX · ${new Date().toLocaleString('es-CL')}`, margin, H - 4)

  return doc
}

function nombreBitacora(bitacora, centro) {
  return `Bitacora-${centro.nombre}-${bitacora.fecha?.replace(/\//g, '-') ?? 'GL'}.pdf`
}

export async function descargarPDFBitacora(bitacora, centro) {
  const doc = await construirPDFBitacora(bitacora, centro)
  doc.save(nombreBitacora(bitacora, centro))
}

export async function compartirPDFBitacora(bitacora, centro) {
  const doc = await construirPDFBitacora(bitacora, centro)
  const nombre = nombreBitacora(bitacora, centro)
  const blob = doc.output('blob')
  const file = new File([blob], nombre, { type: 'application/pdf' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `Bitácora diaria — ${centro.nombre}`,
      text:  `Bitácora diaria · ${centro.nombre} · ${bitacora.fecha}`,
    })
  } else {
    doc.save(nombre)
  }
}

export async function descargarPDF(entrega) {
  const doc = await generarPDFEntrega(entrega)
  const fecha = entrega.fecha?.replace(/\//g, '-') ?? 'informe'
  doc.save(`Entrega-Turno-${entrega.centroNombre ?? 'GL'}-${fecha}.pdf`)
}

export async function compartirPDF(entrega) {
  const doc = await generarPDFEntrega(entrega)
  const fecha = entrega.fecha?.replace(/\//g, '-') ?? 'informe'
  const nombre = `Entrega-Turno-${entrega.centroNombre ?? 'GL'}-${fecha}.pdf`
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
