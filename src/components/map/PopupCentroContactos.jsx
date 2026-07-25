import { useState, useEffect } from 'react'
import { db } from '../../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { X, Phone, Mail } from 'lucide-react'
import { t } from '../../theme/tokens'
import { kitBase, labelEspecialidad, labelTeamEspecial } from '../../lib/kitScope'

function OpCard({ op, especialidadFallback }) {
  if (!op?.nombre) return null
  const enFaena = op.estado === 'faena'
  // Etiqueta Apertura/Soberanía: del roster si viene, si no del team especial del centro.
  const etiqueta = op.especialidad ? labelEspecialidad(op.especialidad) : especialidadFallback
  return (
    <div style={s.opCard}>
      <div style={s.opFotoWrap}>
        {op.foto
          ? <img src={op.foto} alt={op.nombre} style={s.opFoto} />
          : <div style={s.opFotoVacia}>{(op.nombre[0] ?? '?').toUpperCase()}</div>}
      </div>
      <div style={s.opInfo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <div style={s.opNombre}>{op.nombre}</div>
          {etiqueta && <span style={s.especialidad}>{etiqueta}</span>}
        </div>
        <span style={{ ...s.estado, color: enFaena ? t.ok : t.textMuted, background: enFaena ? t.okTint : t.bgInput }}>
          {enFaena ? '🎮 En faena' : '😴 En descanso'}
        </span>
        {op.telefono && (
          <a href={`tel:${op.telefono}`} style={s.contacto}>
            <Phone size={11} /> {op.telefono}
          </a>
        )}
        {(op.correoCorp || op.correoPersonal) && (
          <a href={`mailto:${op.correoCorp || op.correoPersonal}`} style={s.contacto}>
            <Mail size={11} /> {op.correoCorp || op.correoPersonal}
          </a>
        )}
      </div>
    </div>
  )
}

export default function PopupCentroContactos({ centro, onCerrar }) {
  const [ops, setOps] = useState({ op1: {}, op2: {} })

  useEffect(() => {
    let vivo = true
    // kitBase: el roster de un centro de apertura vive en teams/team08, no en centros/{id}.
    // Se resetea SIEMPRE (exista o no el doc): así, al saltar de un marcador a otro sin
    // cerrar el popup, no quedan los operadores del centro anterior.
    getDoc(doc(db, ...kitBase(centro), 'datos', 'operadores'))
      .then(snap => { if (vivo) setOps(snap.exists() ? snap.data() : { op1: {}, op2: {} }) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-lee por id/team del centro
  }, [centro.id, centro.teamAsignado])

  // Compatibilidad: la sincronización guarda en `lista` (array); formato antiguo usa op1/op2.
  // Se muestran TODOS los operadores del centro (faena y descanso) para tener el contacto
  // de ambos; faena primero.
  const operadores = (ops.lista ?? [ops.op1, ops.op2].filter(Boolean))
    .filter(op => op?.nombre)
    .slice()
    .sort((a, b) => (a.estado === 'faena' ? 0 : 1) - (b.estado === 'faena' ? 0 : 1))

  // Si el centro es especial (apertura/soberanía), sus operadores son de esa especialidad.
  const especialidadFallback = labelTeamEspecial(centro.teamAsignado)

  return (
    <div className="gl-glass" style={s.card}>
      <div style={s.header}>
        <div>
          <div style={s.nombre}>{centro.nombre}</div>
          <div className="gl-mono" style={s.coords}>
            📍 {Number(centro.lat).toFixed(5)}, {Number(centro.lng).toFixed(5)}
          </div>
        </div>
        <button className="gl-icon-btn" onClick={onCerrar} aria-label="Cerrar" style={{ flexShrink: 0 }}>
          <X size={15} />
        </button>
      </div>

      <div style={s.divider} />

      {operadores.length > 0 ? (
        <div style={s.ops}>
          {operadores.map((op, i) => (
            <div key={op.uid ?? op.nombre ?? i} style={i > 0 ? s.opSeparado : undefined}>
              <OpCard op={op} especialidadFallback={especialidadFallback} />
            </div>
          ))}
        </div>
      ) : (
        <p style={s.sinOps}>Sin operadores asignados</p>
      )}
    </div>
  )
}

const s = {
  card:        { borderRadius: 14, width: 230, boxShadow: t.shadowLg, overflow: 'hidden' },
  header:      { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, padding: '12px 12px 10px' },
  nombre:      { fontSize: 13, fontWeight: 700, color: t.textPrimary, lineHeight: 1.2 },
  coords:      { fontSize: 10, color: t.textMuted, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" },
  divider:     { borderTop: `1px solid ${t.border}` },
  ops:         { display: 'flex', flexDirection: 'column' },
  opSeparado:  { borderTop: `1px solid ${t.border}` },
  opCard:      { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 12px' },
  opFotoWrap:  { flexShrink: 0 },
  opFoto:      { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${t.border}` },
  opFotoVacia: { width: 36, height: 36, borderRadius: '50%', background: '#3b82f620', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, border: '2px solid #3b82f640' },
  opInfo:      { display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 },
  opNombre:    { fontSize: 12, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  especialidad:{ flexShrink: 0, fontSize: 8, fontWeight: 700, color: t.brandSoft, background: t.brandTint, borderRadius: 999, padding: '1px 6px' },
  estado:      { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 999, alignSelf: 'flex-start' },
  contacto:    { display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: t.brandSoft, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sinOps:      { color: t.textMuted, fontSize: 12, padding: '10px 12px', margin: 0 },
}
