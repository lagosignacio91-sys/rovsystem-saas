import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FileDown, ExternalLink, MessageCircle, NotebookText, Phone, Trash2, Plus, Eye, CheckCircle2, AlertCircle, Pencil } from 'lucide-react'
import { t } from '../theme/tokens'
import { useBitacorasGlobal } from '../hooks/useBitacorasGlobal'
import { descargarPDFBitacora } from '../lib/generatePDF'
import { generarTextoBitacora } from '../lib/bitacoraTexto'
import PanelCentro from '../components/ui/PanelCentro'
import ModalGenerarBitacora from '../components/bitacora/ModalGenerarBitacora'
import { Modal, Button } from '../components/kit'
import { db } from '../lib/firebase'
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore'
import { kitBase } from '../lib/kitScope'

function formatFecha(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${String(y).slice(2)}`
}

// Local, no UTC (mismo patrón que TabBitacora.jsx / ModalGenerarBitacora.jsx): de noche
// en Chile, .toISOString() ya está "mañana" en UTC y compararía mal contra `ultima.fecha`.
function hoy() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function mesActual() {
  return hoy().slice(0, 7)
}

function Campo({ label, valor }) {
  if (!valor) return null
  return (
    <div style={{ display: 'flex', gap: 6, fontSize: t.textXs, lineHeight: 1.4 }}>
      <span style={{ color: t.textMuted, flexShrink: 0, minWidth: 90 }}>{label}:</span>
      <span style={{ color: t.textPrimary }}>{valor}</span>
    </div>
  )
}

function OpRow({ op, enviadaHoy }) {
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
      {/* Ya envió hoy: no tiene sentido solicitarla de nuevo. */}
      {!enviadaHoy && (
        <a href={waHref} target="_blank" rel="noopener noreferrer"
          title="Solicitar bitácora por WhatsApp"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, gap: 4, background: '#22c55e18', color: '#16a34a', border: '1px solid #22c55e40', borderRadius: t.radiusMd, padding: '4px 10px', fontSize: 10, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
          <MessageCircle size={13} /> WA
        </a>
      )}
    </div>
  )
}

export default function BitacorasPage() {
  const { centros, role, uid, teamId, sincronizarEstado, actualizarCentro, empresaActiva, whatsappBitacora } = useOutletContext()
  const base = role === 'operador'
    ? centros.filter(c => c.teamAsignado === teamId)
    : (empresaActiva ? centros.filter(c => c.empresaId === empresaActiva.id) : centros)
  const { datos: datosSinOrden, cargando } = useBitacorasGlobal(base)
  // Primero los que NO enviaron su bitácora de hoy — son los que hay que atacar de
  // inmediato; nombre como desempate dentro de cada grupo.
  const datos = [...datosSinOrden].sort((a, b) => {
    const aEnviada = a.ultima?.fecha === hoy()
    const bEnviada = b.ultima?.fecha === hoy()
    if (aEnviada !== bEnviada) return aEnviada ? 1 : -1
    return (a.centro.nombre ?? '').localeCompare(b.centro.nombre ?? '')
  })
  const [centroActivo, setCentroActivo]   = useState(null)
  const [descargando, setDescargando]     = useState(null)
  const [aEliminar, setAEliminar]         = useState(null) // { centro, entrada }
  const [eliminando, setEliminando]       = useState(false)
  const [generarPara, setGenerarPara]     = useState(null) // { centro, ultima }
  const [editarPara, setEditarPara]       = useState(null) // { centro, entrada } — corregir una entrada existente
  const [detalleAbierto, setDetalleAbierto] = useState(null) // { centro, entrada }

  const centroVivo = centroActivo ? centros.find(c => c.id === centroActivo.id) ?? centroActivo : null

  const handleDescargar = async (entrada, centro, key = centro.id) => {
    setDescargando(key)
    try { await descargarPDFBitacora(entrada, centro) } finally { setDescargando(null) }
  }

  const handleEnviarWhatsApp = async (entrada, centro, key) => {
    setDescargando(key)
    try {
      const [snapRov, snapRedes] = await Promise.all([
        getDoc(doc(db, ...kitBase(centro), 'equipos', 'rov')),
        getDoc(doc(db, ...kitBase(centro), 'datos', 'redes')),
      ])
      const rov   = snapRov.exists()   ? snapRov.data()   : null
      const redes = snapRedes.exists() ? snapRedes.data() : null
      const texto = generarTextoBitacora(centro, entrada, rov, redes)
      window.location.href = `whatsapp://send?text=${encodeURIComponent(texto)}`
    } finally {
      setDescargando(null)
    }
  }

  // Borra solo la entrada puntual (no todo el historial del centro).
  const handleEliminarBitacora = async () => {
    if (!aEliminar) return
    setEliminando(true)
    try {
      await updateDoc(doc(db, ...kitBase(aEliminar.centro), 'datos', 'bitacora'), {
        lista: arrayRemove(aEliminar.entrada),
      })
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
          {datos.map(({ centro, bitacora, ultima, operadores }) => {
            const entradasMes = (bitacora?.lista ?? [])
              .filter(b => (b.fecha ?? '').slice(0, 7) === mesActual())
              .slice()
              .reverse()
            // "Enviada" es un chequeo diario: solo cuenta si la última entrada es de HOY,
            // no si el centro tiene historial de días anteriores.
            const enviadaHoy = ultima?.fecha === hoy()

            return (
            <div key={centro.id} style={{ background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusLg, padding: 15 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary }}>{centro.nombre}</div>
                  <div style={{ fontSize: 10, color: t.textMuted }}>{centro.empresaNombre ?? ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {role === 'operador' && (
                    <button
                      onClick={() => setGenerarPara({ centro, ultima, borrador: bitacora?.borrador ?? null })}
                      title="Generar bitácora diaria"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, gap: 4, background: t.brand, color: '#fff', border: 'none', borderRadius: t.radiusMd, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      <Plus size={13} /> Generar bitácora diaria
                    </button>
                  )}
                  {(role === 'admin' || role === 'supervisor') && (
                    <button
                      onClick={() => setCentroActivo(centro)}
                      title="Abrir panel del centro"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, gap: 4, background: t.brandTint, color: t.brandSoft, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      <ExternalLink size={13} /> Panel
                    </button>
                  )}
                </div>
              </div>

              {/* Operador: listado del mes en curso, solo su propio centro */}
              {role === 'operador' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                  {entradasMes.length === 0 && (
                    <div style={{ fontSize: t.textXs, color: t.textMuted, fontStyle: 'italic' }}>Sin bitácoras este mes.</div>
                  )}
                  {entradasMes.map((b, i) => {
                    const key = `${centro.id}-${b.creadoEn ?? i}`
                    return (
                    <div key={i} style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontSize: t.textXs, fontWeight: 700, color: t.textPrimary }}>{formatFecha(b.fecha)} — {b.piloto || 'Sin piloto'}</div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => setEditarPara({ centro, entrada: b })}
                            title="Editar bitácora"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, gap: 4, background: t.bgInput, border: `1px solid ${t.border}`, color: t.textSecondary, borderRadius: t.radiusMd, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            <Pencil size={12} /> Editar
                          </button>
                          {/* El admin puede ocultar el WhatsApp por operador (whatsappBitacora=false).
                              La bitácora igual se genera/guarda; solo desaparece este botón de compartir. */}
                          {whatsappBitacora !== false && (
                            <button onClick={() => handleEnviarWhatsApp(b, centro, key)} disabled={descargando === key}
                              title="Enviar por WhatsApp"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, gap: 4, background: '#22c55e18', border: '1px solid #22c55e40', color: '#16a34a', borderRadius: t.radiusMd, padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: descargando === key ? 0.6 : 1 }}>
                              <MessageCircle size={12} /> {descargando === key ? '…' : 'Enviar por WhatsApp'}
                            </button>
                          )}
                          <button onClick={() => setAEliminar({ centro, entrada: b })}
                            title="Eliminar esta bitácora"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44, background: t.faultTint, color: t.fault, border: `1px solid ${t.fault}40`, borderRadius: t.radiusMd, padding: '4px 8px', cursor: 'pointer' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <Campo label="Estado puerto" valor={b.estadoPuerto} />
                      <Campo label="Jornada AM"    valor={b.jornadaAm} />
                      <Campo label="Jornada PM"    valor={b.jornadaPm} />
                      <Campo label="Observaciones" valor={b.observaciones} />
                      {((Number(b.parchesInstalados) || 0) > 0 || (Number(b.costurasRealizadas) || 0) > 0) && (
                        <Campo label="Redes" valor={`${b.parchesInstalados || 0} parches · ${b.costurasRealizadas || 0} costuras`} />
                      )}
                    </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                  {enviadaHoy ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: t.ok, fontSize: t.textXs, fontWeight: 600 }}>
                      <CheckCircle2 size={14} /> Enviada hoy
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: t.fault, fontSize: t.textXs, fontWeight: 600 }}>
                      <AlertCircle size={14} /> Sin enviar
                    </span>
                  )}
                  {ultima && (
                    <button
                      onClick={() => setDetalleAbierto({ centro, entrada: ultima })}
                      title="Ver la última bitácora registrada"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, gap: 4, background: t.bgInput, color: t.textPrimary, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      <Eye size={13} /> Ver bitácora
                    </button>
                  )}
                </div>
              )}

              {/* Operadores: "solicitar bitácora" es una acción de admin/supervisor hacia el operador, no algo que el operador vea de sí mismo */}
              {role !== 'operador' && (
                <>
                  <OpRow op={operadores?.op1} enviadaHoy={enviadaHoy} />
                  <OpRow op={operadores?.op2} enviadaHoy={enviadaHoy} />
                </>
              )}
            </div>
            )
          })}
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

      {detalleAbierto && (
        <Modal open title={`Bitácora — ${detalleAbierto.centro.nombre}`} onClose={() => setDetalleAbierto(null)} maxWidth={420}
          footer={<>
            <Button variant="secondary" size="lg" onClick={() => setDetalleAbierto(null)}>Cerrar</Button>
            <Button variant="secondary" size="lg"
              disabled={descargando === detalleAbierto.centro.id}
              onClick={() => handleDescargar(detalleAbierto.entrada, detalleAbierto.centro)}>
              <FileDown size={14} /> {descargando === detalleAbierto.centro.id ? 'Descargando…' : 'PDF'}
            </Button>
            {role === 'admin' && (
              <Button variant="primary" size="lg" style={{ background: t.fault }}
                onClick={() => { setAEliminar({ centro: detalleAbierto.centro, entrada: detalleAbierto.entrada }); setDetalleAbierto(null) }}>
                <Trash2 size={14} /> Eliminar
              </Button>
            )}
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Campo label="Fecha"         valor={detalleAbierto.entrada.fecha} />
            <Campo label="Piloto"        valor={detalleAbierto.entrada.piloto} />
            <Campo label="Team"          valor={detalleAbierto.entrada.team} />
            <Campo label="Área"          valor={detalleAbierto.entrada.area} />
            <Campo label="Estado puerto" valor={detalleAbierto.entrada.estadoPuerto} />
            <Campo label="Jornada AM"    valor={detalleAbierto.entrada.jornadaAm} />
            <Campo label="Jornada PM"    valor={detalleAbierto.entrada.jornadaPm} />
            <Campo label="Observaciones" valor={detalleAbierto.entrada.observaciones} />
            {((Number(detalleAbierto.entrada.parchesInstalados) || 0) > 0 || (Number(detalleAbierto.entrada.costurasRealizadas) || 0) > 0) && (
              <Campo label="Redes" valor={`${detalleAbierto.entrada.parchesInstalados || 0} parches · ${detalleAbierto.entrada.costurasRealizadas || 0} costuras`} />
            )}
          </div>
        </Modal>
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
            ¿Eliminar la entrada del {formatFecha(aEliminar.entrada?.fecha)} de <b style={{ color: t.textPrimary }}>{aEliminar.centro.nombre}</b>? El resto del historial se conserva.
          </p>
        </Modal>
      )}

      {generarPara && (
        <ModalGenerarBitacora
          centro={generarPara.centro}
          ultima={generarPara.ultima}
          borrador={generarPara.borrador}
          onCerrar={() => setGenerarPara(null)}
        />
      )}

      {editarPara && (
        <ModalGenerarBitacora
          centro={editarPara.centro}
          editando={editarPara.entrada}
          onCerrar={() => setEditarPara(null)}
        />
      )}
    </div>
  )
}
