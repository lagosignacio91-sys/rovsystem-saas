import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FileDown, ExternalLink, MessageCircle, NotebookText, Phone, Trash2 } from 'lucide-react'
import { t } from '../theme/tokens'
import { useBitacorasGlobal } from '../hooks/useBitacorasGlobal'
import { descargarPDFBitacora } from '../lib/generatePDF'
import PanelCentro from '../components/ui/PanelCentro'
import { Modal, Button } from '../components/kit'
import { db } from '../lib/firebase'
import { deleteDoc, doc } from 'firebase/firestore'

function Campo({ label, valor }) {
  if (!valor) return null
  return (
    <div style={{ display: 'flex', gap: 6, fontSize: t.textXs, lineHeight: 1.4 }}>
      <span style={{ color: t.textMuted, flexShrink: 0, minWidth: 90 }}>{label}:</span>
      <span style={{ color: t.textPrimary }}>{valor}</span>
    </div>
  )
}

function OpRow({ op, centroNombre }) {
  if (!op?.nombre) return null
  const tel = op.telefono?.replace(/[^\d+]/g, '') ?? ''
  const msg = encodeURIComponent('se solicita su bitácora diaria')
  const waHref = `whatsapp://send${tel ? `?phone=56${tel}&` : '?'}text=${msg}`
  const inicial = (op.nombre[0] ?? '?').toUpperCase()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: `1px solid ${t.border}` }}>
      {op.foto
        ? <img src={op.foto} alt={op.nombre} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: 30, height: 30, borderRadius: '50%', background: t.brandTint, color: t.brandSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{inicial}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: t.textXs, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.nombre}</div>
        {op.telefono && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: t.textMuted }}>
            <Phone size={10} /><span>{op.telefono}</span>
          </div>
        )}
      </div>
      <a href={waHref} target="_blank" rel="noopener noreferrer"
        title="Solicitar bitácora por WhatsApp"
        style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#22c55e18', color: '#16a34a', border: '1px solid #22c55e40', borderRadius: t.radiusMd, padding: '4px 8px', fontSize: 10, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
        <MessageCircle size={13} /> WA
      </a>
    </div>
  )
}

export default function BitacorasPage() {
  const { centros, role, uid, sincronizarEstado, actualizarCentro, empresaActiva } = useOutletContext()
  const base = empresaActiva ? centros.filter(c => c.empresaId === empresaActiva.id) : centros
  const { datos, cargando } = useBitacorasGlobal(base)
  const [centroActivo, setCentroActivo]   = useState(null)
  const [descargando, setDescargando]     = useState(null)
  const [aEliminar, setAEliminar]         = useState(null) // { centro }
  const [eliminando, setEliminando]       = useState(false)

  const centroVivo = centroActivo ? centros.find(c => c.id === centroActivo.id) ?? centroActivo : null

  const handleDescargar = async (bitacora, centro) => {
    setDescargando(centro.id)
    try { await descargarPDFBitacora(bitacora, centro) } finally { setDescargando(null) }
  }

  const handleEliminarBitacora = async () => {
    if (!aEliminar) return
    setEliminando(true)
    try {
      await deleteDoc(doc(db, 'centros', aEliminar.centro.id, 'datos', 'bitacora'))
    } finally {
      setEliminando(false)
      setAEliminar(null)
    }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: t.space5 }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        {cargando && <p style={{ color: t.textMuted, fontSize: t.textSm }}>Cargando bitácoras…</p>}

        {!cargando && datos.length === 0 && (
          <div style={{ textAlign: 'center', color: t.textMuted, padding: '48px 0', fontSize: t.textSm }}>
            <NotebookText size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
            <div>Sin bitácoras disponibles.</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {datos.map(({ centro, bitacora, operadores }) => (
            <div key={centro.id} style={{ background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusLg, padding: 15 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary }}>{centro.nombre}</div>
                  <div style={{ fontSize: 10, color: t.textMuted }}>{centro.empresaNombre ?? ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {(role === 'admin' || role === 'supervisor') && (
                    <button
                      onClick={() => setCentroActivo(centro)}
                      title="Abrir panel del centro"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: t.brandTint, color: t.brandSoft, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '5px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      <ExternalLink size={13} /> Panel
                    </button>
                  )}
                  {bitacora && (
                    <button
                      onClick={() => handleDescargar(bitacora, centro)}
                      disabled={descargando === centro.id}
                      title="Descargar PDF de bitácora"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '5px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: descargando === centro.id ? 0.6 : 1 }}>
                      <FileDown size={13} /> {descargando === centro.id ? '…' : 'PDF'}
                    </button>
                  )}
                  {role === 'admin' && bitacora && (
                    <button
                      onClick={() => setAEliminar({ centro })}
                      title="Eliminar bitácora"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.faultTint, color: t.fault, border: `1px solid ${t.fault}40`, borderRadius: t.radiusMd, padding: '5px 8px', cursor: 'pointer' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Datos bitácora */}
              {bitacora ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                  <Campo label="Fecha"         valor={bitacora.fecha} />
                  <Campo label="Piloto"        valor={bitacora.piloto} />
                  <Campo label="Team"          valor={bitacora.team} />
                  <Campo label="Área"          valor={bitacora.area} />
                  <Campo label="Estado puerto" valor={bitacora.estadoPuerto} />
                  <Campo label="Jornada AM"    valor={bitacora.jornadaAm} />
                  <Campo label="Jornada PM"    valor={bitacora.jornadaPm} />
                  <Campo label="Observaciones" valor={bitacora.observaciones} />
                </div>
              ) : (
                <div style={{ fontSize: t.textXs, color: t.textMuted, fontStyle: 'italic', marginBottom: 10 }}>Sin bitácora registrada.</div>
              )}

              {/* Operadores */}
              <OpRow op={operadores?.op1} />
              <OpRow op={operadores?.op2} />
            </div>
          ))}
        </div>
      </div>

      {centroVivo && (
        <div className="panel-slide gl-panel-wrapper gl-panel-wrapper--page" style={{ position: 'absolute', top: 0, right: 0, height: '100%', zIndex: 1000 }}>
          <PanelCentro
            centro={centroVivo}
            role={role}
            uid={uid}
            sincronizarEstado={sincronizarEstado}
            actualizarCentro={actualizarCentro}
            onCerrar={() => setCentroActivo(null)}
            onEliminar={() => setCentroActivo(null)}
          />
        </div>
      )}

      {aEliminar && (
        <Modal open title="Eliminar bitácora" onClose={() => setAEliminar(null)} maxWidth={340}
          footer={<>
            <Button variant="secondary" size="lg" onClick={() => setAEliminar(null)}>Cancelar</Button>
            <Button variant="primary" size="lg" style={{ background: t.fault }} disabled={eliminando} onClick={handleEliminarBitacora}>
              {eliminando ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </>}>
          <p style={{ color: t.textSecondary, fontSize: t.textSm, margin: 0, lineHeight: 1.5 }}>
            ¿Eliminar la bitácora de <b style={{ color: t.textPrimary }}>{aEliminar.centro.nombre}</b>? Los datos del formulario se borrarán permanentemente.
          </p>
        </Modal>
      )}
    </div>
  )
}
