import { useState } from 'react'
import { ClipboardCheck, Plus, Download, Share2, Trash2, Settings, GripVertical, X } from 'lucide-react'
import { useEntregasTurno } from '../../hooks/useEntregasTurno'
import { descargarPDF, compartirPDF } from '../../lib/generatePDF'
import ModalEntregaTurno from '../turno/ModalEntregaTurno'
import { storage } from '../../lib/firebase'
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage'

function formatFecha(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

function badgeEntrega(entrega) {
  const todas = [...(entrega.inspeccion ?? []), ...(entrega.inspeccionBackup ?? [])]
  const anomalias = todas.filter(s => s.estado === 'anomalia').length
  if (anomalias === 0) return { label: 'Sin anomalías', bg: 'var(--gl-ok-tint)', color: 'var(--gl-ok)' }
  return { label: `${anomalias} anomalía${anomalias > 1 ? 's' : ''}`, bg: 'var(--gl-fault-tint)', color: 'var(--gl-fault)' }
}

function ModalEditarInventario({ items, onGuardar, onCerrar }) {
  const [lista, setLista] = useState(items)
  const [nuevo, setNuevo] = useState('')

  const agregar = () => {
    if (!nuevo.trim()) return
    const id = nuevo.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now()
    setLista(l => [...l, { id, label: nuevo.trim() }])
    setNuevo('')
  }

  const eliminar = (id) => setLista(l => l.filter(i => i.id !== id))

  return (
    <div style={ms.overlay}>
      <div style={ms.modal}>
        <div style={ms.header}>
          <span style={ms.title}>Editar lista de inventario</span>
          <button style={ms.closeBtn} onClick={onCerrar}><X size={16} /></button>
        </div>
        <div style={ms.body}>
          <p style={ms.sub}>Esta lista es la que el operador rellena al hacer la entrega.</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {lista.map(item => (
              <div key={item.id} style={ms.row}>
                <GripVertical size={14} color="var(--gl-text-muted)" />
                <span style={ms.nombre}>{item.label}</span>
                <button style={ms.trashBtn} onClick={() => eliminar(item.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <div style={ms.addRow}>
            <input
              style={ms.input}
              placeholder="Nuevo insumo..."
              value={nuevo}
              onChange={e => setNuevo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregar()}
            />
            <button style={ms.addBtn} onClick={agregar}><Plus size={15} /></button>
          </div>
        </div>
        <div style={ms.footer}>
          <button style={ms.btnCancel} onClick={onCerrar}>Cancelar</button>
          <button style={ms.btnSave} onClick={() => { onGuardar(lista); onCerrar() }}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

const ms = {
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal:     { background: 'var(--gl-bg-elevated)', border: '1px solid var(--gl-border)', borderRadius: 16, width: '100%', maxWidth: 380, maxHeight: '80dvh', display: 'flex', flexDirection: 'column' },
  header:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--gl-border)' },
  title:     { fontSize: 14, fontWeight: 700, color: 'var(--gl-text-primary)' },
  closeBtn:  { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gl-text-secondary)', display: 'flex', padding: 4 },
  body:      { flex: 1, overflowY: 'auto', padding: 16 },
  sub:       { fontSize: 11, color: 'var(--gl-text-muted)', marginBottom: 12 },
  row:       { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--gl-border)' },
  nombre:    { flex: 1, fontSize: 13, color: 'var(--gl-text-primary)' },
  trashBtn:  { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gl-fault)', display: 'flex', padding: 2 },
  addRow:    { display: 'flex', gap: 8, marginTop: 12 },
  input:     { flex: 1, background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, color: 'var(--gl-text-primary)', fontSize: 13, padding: '8px 10px', outline: 'none', fontFamily: 'inherit' },
  addBtn:    { background: 'var(--gl-brand)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px 12px' },
  footer:    { display: 'flex', gap: 8, padding: 16, borderTop: '1px solid var(--gl-border)' },
  btnCancel: { flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--gl-border)', background: 'transparent', color: 'var(--gl-text-secondary)', fontSize: 13, cursor: 'pointer' },
  btnSave:   { flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: 'var(--gl-brand)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
}

export default function TabEntregaTurno({ centro, role, uid }) {
  const { entregas, itemsList, cargando, crearEntrega, actualizarEntrega, eliminarEntrega, guardarItemsList } = useEntregasTurno(centro.id)
  const [modalNueva,    setModalNueva]    = useState(false)
  const [modalInventario, setModalInv]   = useState(false)
  const [confirmDel,    setConfirmDel]   = useState(null)

  const canCreate    = role === 'operador'
  const tieneReporte = entregas.length > 0

  // Sube las fotos de un equipo y devuelve el array de inspección con las fotoUrl ya resueltas (sin file).
  const subirFotos = async (id, equipo, inspeccionArr) => {
    const resultado = []
    for (const sec of inspeccionArr) {
      const { file, ...limpio } = sec
      if (file) {
        try {
          const storageRef = ref(storage, `entregas/${centro.id}/${id}/${equipo}_${sec.id}`)
          await uploadBytes(storageRef, file)
          limpio.fotoUrl = await getDownloadURL(storageRef)
        } catch (e) {
          console.warn('No se pudo subir foto', equipo, sec.id, e)
        }
      }
      resultado.push(limpio)
    }
    return resultado
  }

  // Borra las fotos de una entrega en Storage. Fire-and-forget: si Storage no está
  // habilitado, listAll puede colgarse reintentando, así que NUNCA lo esperamos.
  const borrarFotosEntrega = (entregaId) => {
    listAll(ref(storage, `entregas/${centro.id}/${entregaId}`))
      .then(({ items }) => Promise.all(items.map(it => deleteObject(it).catch(() => {}))))
      .catch(() => {})
  }

  // Borra una entrega anterior: primero el doc de Firestore (rápido, libera la UI),
  // luego sus fotos en Storage sin bloquear.
  const borrarEntregaCompleta = async (entregaId) => {
    try {
      await eliminarEntrega(entregaId)
    } catch (e) {
      console.warn('No se pudo borrar entrega previa', entregaId, e)
    }
    borrarFotosEntrega(entregaId)
  }

  const handleGuardar = async (entregaData, principalArr, backupArr) => {
    // Snapshot de las entregas previas ANTES de crear la nueva (la nueva aún no está en la lista).
    const previas = entregas.map(e => e.id)
    const id = await crearEntrega(entregaData)

    // Solo se conserva la última entrega: borramos todas las anteriores en segundo plano.
    if (previas.length) {
      ;(async () => {
        for (const pid of previas) await borrarEntregaCompleta(pid)
      })()
    }

    // Subida de fotos en segundo plano (para el historial del admin cuando Storage esté activo).
    const hayFotos = [...principalArr, ...backupArr].some(s => s.file)
    if (hayFotos) {
      ;(async () => {
        try {
          const [insp, inspBackup] = await Promise.all([
            subirFotos(id, 'principal', principalArr),
            subirFotos(id, 'backup', backupArr),
          ])
          await actualizarEntrega(id, { inspeccion: insp, inspeccionBackup: inspBackup })
        } catch (e) {
          console.warn('No se pudieron persistir las fotos de la entrega', id, e)
        }
      })()
    }
    return id
  }

  if (cargando) return <p style={{ color: 'var(--gl-text-muted)', fontSize: 13 }}>Cargando...</p>

  return (
    <div>
      <div style={s.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ClipboardCheck size={16} color="var(--gl-brand)" />
          <span style={s.titulo}>Entrega de turno</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {role === 'admin' && (
            <button style={s.btnIcon} onClick={() => setModalInv(true)} title="Editar inventario">
              <Settings size={15} />
            </button>
          )}
          {canCreate && !tieneReporte && (
            <button style={s.btnPrimary} onClick={() => setModalNueva(true)}>
              <Plus size={14} /> Nueva entrega
            </button>
          )}
          {canCreate && tieneReporte && (
            <span style={{ fontSize: 10, color: 'var(--gl-fault)', maxWidth: 160, textAlign: 'right', lineHeight: 1.3 }}>
              Elimina el reporte actual para generar uno nuevo
            </span>
          )}
        </div>
      </div>

      {entregas.length === 0 && (
        <p style={{ color: 'var(--gl-text-muted)', fontSize: 13 }}>Sin entregas registradas.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entregas.map(e => {
          const badge = badgeEntrega(e)
          return (
            <div key={e.id} style={s.card}>
              <div style={s.cardTop}>
                <span style={s.fecha}>{formatFecha(e.creadoEn)}</span>
                <span style={{ ...s.badge, background: badge.bg, color: badge.color }}>{badge.label}</span>
              </div>
              <div style={s.piloto}>{e.piloto || '—'}{(e.relevo ?? e.backup) ? ` → ${e.relevo ?? e.backup}` : ''}</div>
              <div style={s.equipo}>{e.equipo}{e.equipoBackup ? ` · Backup: ${e.equipoBackup}` : ''}</div>
              <div style={s.acciones}>
                <button style={s.btnSm} onClick={() => descargarPDF(e)}>
                  <Download size={12} /> PDF
                </button>
                <button style={s.btnSm} onClick={() => compartirPDF(e)}>
                  <Share2 size={12} /> Compartir
                </button>
                <button style={{ ...s.btnSm, color: 'var(--gl-fault)', borderColor: 'var(--gl-fault-tint)' }} onClick={() => setConfirmDel(e.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {confirmDel && (
        <div style={ms.overlay}>
          <div style={{ ...ms.modal, maxWidth: 320 }}>
            <div style={{ padding: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--gl-text-primary)', margin: '0 0 8px' }}>¿Eliminar esta entrega?</p>
              <p style={{ fontSize: 12, color: 'var(--gl-text-muted)', margin: '0 0 16px' }}>Esta acción no se puede deshacer.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={ms.btnCancel} onClick={() => setConfirmDel(null)}>Cancelar</button>
                <button style={{ ...ms.btnSave, background: 'var(--gl-fault)' }} onClick={() => { eliminarEntrega(confirmDel); setConfirmDel(null) }}>Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalInventario && (
        <ModalEditarInventario
          items={itemsList}
          onGuardar={guardarItemsList}
          onCerrar={() => setModalInv(false)}
        />
      )}

      {modalNueva && (
        <ModalEntregaTurno
          centro={centro}
          itemsList={itemsList}
          onCerrar={() => setModalNueva(false)}
          onGuardar={handleGuardar}
        />
      )}
    </div>
  )
}

const s = {
  topBar:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titulo:     { fontSize: 14, fontWeight: 600, color: 'var(--gl-text-primary)' },
  btnIcon:    { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 7, color: 'var(--gl-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '5px 7px' },
  btnPrimary: { background: 'var(--gl-brand)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 },
  card:       { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 10, padding: '10px 12px' },
  cardTop:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  fecha:      { fontSize: 11, color: 'var(--gl-text-muted)' },
  badge:      { fontSize: 10, padding: '2px 8px', borderRadius: 999, fontWeight: 600 },
  piloto:     { fontSize: 13, fontWeight: 600, color: 'var(--gl-text-primary)' },
  equipo:     { fontSize: 11, color: 'var(--gl-text-secondary)', marginTop: 1 },
  acciones:   { display: 'flex', gap: 6, marginTop: 8 },
  btnSm:      { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 10px', borderRadius: 7, border: '1px solid var(--gl-border)', background: 'var(--gl-bg-elevated)', color: 'var(--gl-text-secondary)', cursor: 'pointer' },
}
