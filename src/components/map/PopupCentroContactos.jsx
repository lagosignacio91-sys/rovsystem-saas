import { useState, useEffect } from 'react'
import { db } from '../../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { X, Phone, Mail } from 'lucide-react'
import { t } from '../../theme/tokens'

function OpCard({ op }) {
  if (!op?.nombre) return null
  return (
    <div style={s.opCard}>
      <div style={s.opFotoWrap}>
        {op.foto
          ? <img src={op.foto} alt={op.nombre} style={s.opFoto} />
          : <div style={s.opFotoVacia}>{(op.nombre[0] ?? '?').toUpperCase()}</div>}
      </div>
      <div style={s.opInfo}>
        <div style={s.opNombre}>{op.nombre}</div>
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
    getDoc(doc(db, 'centros', centro.id, 'datos', 'operadores'))
      .then(snap => { if (snap.exists()) setOps(snap.data()) })
  }, [centro.id])

  // Compatibilidad: la sincronización guarda en `lista` (array); formato antiguo usa op1/op2.
  const lista    = ops.lista ?? [ops.op1, ops.op2].filter(Boolean)
  const tieneOps = lista.some(op => op?.nombre)

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

      {tieneOps ? (
        <div style={s.ops}>
          {lista.map((op, i) => <OpCard key={i} op={op} />)}
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
  ops:         { display: 'flex', flexDirection: 'column', gap: 1 },
  opCard:      { display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px' },
  opFotoWrap:  { flexShrink: 0 },
  opFoto:      { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${t.border}` },
  opFotoVacia: { width: 36, height: 36, borderRadius: '50%', background: '#3b82f620', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, border: '2px solid #3b82f640' },
  opInfo:      { display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 },
  opNombre:    { fontSize: 12, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  contacto:    { display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: t.brandSoft, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sinOps:      { color: t.textMuted, fontSize: 12, padding: '10px 12px', margin: 0 },
}
