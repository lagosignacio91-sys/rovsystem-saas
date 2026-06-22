import { logError } from '../../lib/logger'
import { useState, useEffect, useRef } from 'react'
import { X, Camera, XCircle } from 'lucide-react'
import { t } from '../../theme/tokens'
import { storage } from '../../lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth } from '../../lib/firebase'

async function subirFotos(despachoId, archivos) {
  const urls = []
  const uid = auth.currentUser?.uid ?? 'unknown'
  for (const { file } of archivos) {
    try {
      const path    = `despachos/${despachoId}/${Date.now()}_${file.name}`
      const storRef = ref(storage, path)
      const snap    = await uploadBytes(storRef, file, { customMetadata: { uploadedBy: uid } })
      urls.push(await getDownloadURL(snap.ref))
    } catch {
      // Error de Storage — se omite la foto sin abortar el despacho
    }
  }
  return urls
}

export default function ModalDespacho({ isOpen, onClose, solicitud, onDespachar }) {
  const [comentario,    setComentario]    = useState('')
  const [transportista, setTransportista] = useState('')
  const [fotos,         setFotos]         = useState([])
  const [cargando,      setCargando]      = useState(false)
  const [progreso,      setProgreso]      = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setComentario('')
      setTransportista('')
      setFotos([])
      setProgreso('')
    }
  }, [isOpen, solicitud?.id])

  if (!isOpen || !solicitud) return null

  const handleFotos = (e) => {
    const nuevas = Array.from(e.target.files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setFotos(prev => [...prev, ...nuevas])
    e.target.value = ''
  }

  const handleQuitarFoto = (idx) => {
    setFotos(prev => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const handleDespachar = async () => {
    if (!transportista.trim()) { alert('Debes seleccionar un transportista'); return }

    setCargando(true)
    try {
      if (fotos.length > 0) setProgreso('Subiendo fotos...')
      const urls = await subirFotos(solicitud.id, fotos)
      setProgreso('Registrando despacho...')
      const itemsDespachados = (solicitud.itemsSolicitados || []).map(item => ({
        ...item,
        cantidadDespachada: item.cantidad,
      }))
      await onDespachar(solicitud.id, itemsDespachados, comentario, urls, transportista)
      onClose()
    } catch (e) {
      logError('ModalDespacho/despachar', e)
      alert('Error al despachar: ' + (e?.message ?? 'intenta de nuevo'))
    } finally {
      setCargando(false)
      setProgreso('')
    }
  }

  const s = {
    overlay:    { position: 'fixed', inset: 0, background: t.scrim, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
    card:       { background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radiusLg, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', boxShadow: t.shadowLg },
    header:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${t.border}`, position: 'sticky', top: 0, background: t.bgSurface, zIndex: 1 },
    title:      { fontWeight: 700, fontSize: t.textBase, color: t.textPrimary },
    body:       { padding: 16, display: 'flex', flexDirection: 'column', gap: 16 },
    label:      { display: 'block', fontSize: t.textSm, fontWeight: 600, color: t.textSecondary, marginBottom: 4 },
    resumen:    { padding: '10px 12px', background: t.bgElevated, borderRadius: t.radiusMd, border: `1px solid ${t.border}` },
    input:      { width: '100%', padding: '8px 10px', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textPrimary, fontSize: t.textSm, boxSizing: 'border-box' },
    textarea:   { width: '100%', padding: '8px 10px', background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textPrimary, fontSize: t.textSm, resize: 'vertical', boxSizing: 'border-box' },
    footer:     { display: 'flex', gap: 8 },
    btnCancel:  { flex: 1, padding: '8px 0', background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textSecondary, cursor: 'pointer', fontWeight: 600, fontSize: t.textSm },
    btnOk:      { flex: 1, padding: '8px 0', background: 'var(--gl-ok)', border: 'none', borderRadius: t.radiusMd, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: t.textSm },
    asterisk:   { color: 'var(--gl-fault)' },
    uploadBtn:  { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: t.bgElevated, border: `1px dashed ${t.border}`, borderRadius: t.radiusMd, color: t.textSecondary, cursor: 'pointer', fontSize: t.textSm, fontWeight: 500, width: '100%', justifyContent: 'center' },
    thumbGrid:  { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    thumb:      { position: 'relative', width: 72, height: 72 },
    thumbImg:   { width: 72, height: 72, objectFit: 'cover', borderRadius: t.radiusSm, border: `1px solid ${t.border}` },
    thumbDel:   { position: 'absolute', top: -6, right: -6, background: t.bgSurface, borderRadius: '50%', cursor: 'pointer', color: 'var(--gl-fault)', lineHeight: 0 },
  }

  const disabled = cargando || !transportista.trim()

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <div style={s.header}>
          <span style={s.title}>Despachar Solicitud</span>
          <button onClick={onClose} disabled={cargando} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted }}>
            <X size={18} />
          </button>
        </div>

        <div style={s.body}>
          {/* Resumen de items */}
          <div style={s.resumen}>
            <div style={{ fontSize: t.textXs, fontWeight: 700, color: t.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Items a despachar
            </div>
            {(solicitud.itemsSolicitados || []).map((item, idx) => (
              <div key={idx} style={{ fontSize: t.textSm, color: t.textPrimary, marginBottom: 2 }}>
                • {item.nombre || item.itemId} × <strong>{item.cantidad}</strong>
              </div>
            ))}
            {solicitud.centroNombre && (
              <div style={{ fontSize: t.textXs, color: t.textMuted, marginTop: 6 }}>
                Destino: {solicitud.centroNombre}
              </div>
            )}
          </div>

          {/* Fotos del despacho */}
          <div>
            <label style={s.label}>Fotos del despacho</label>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*"
              capture="environment"
              onChange={handleFotos}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={cargando}
              style={s.uploadBtn}
            >
              <Camera size={16} />
              {fotos.length === 0 ? 'Adjuntar fotos' : `${fotos.length} foto${fotos.length > 1 ? 's' : ''} seleccionada${fotos.length > 1 ? 's' : ''}`}
            </button>

            {fotos.length > 0 && (
              <div style={s.thumbGrid}>
                {fotos.map((f, idx) => (
                  <div key={idx} style={s.thumb}>
                    <img src={f.preview} alt="" style={s.thumbImg} />
                    <button
                      type="button"
                      onClick={() => handleQuitarFoto(idx)}
                      disabled={cargando}
                      style={s.thumbDel}
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transportista */}
          <div>
            <label style={s.label}>🚚 Transportista <span style={s.asterisk}>*</span></label>
            <select value={transportista} onChange={e => setTransportista(e.target.value)} disabled={cargando} style={s.input}>
              <option value="">Selecciona...</option>
              <option value="Courier">Courier</option>
              <option value="DHL">DHL</option>
              <option value="FedEx">FedEx</option>
              <option value="Transporte Interno">Transporte Interno</option>
            </select>
          </div>

          {/* Comentario */}
          <div>
            <label style={s.label}>Comentarios</label>
            <textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              disabled={cargando}
              placeholder="Detalles adicionales del despacho..."
              rows={3}
              style={s.textarea}
            />
          </div>

          <div style={s.footer}>
            <button onClick={onClose} disabled={cargando} style={s.btnCancel}>Cancelar</button>
            <button onClick={handleDespachar} disabled={disabled} style={{ ...s.btnOk, opacity: disabled ? 0.5 : 1 }}>
              {cargando ? (progreso || 'Procesando...') : 'Confirmar Despacho'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
