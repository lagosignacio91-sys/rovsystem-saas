import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ClipboardList, Plus, Trash2, Download, Share2, ChevronDown, ChevronRight } from 'lucide-react'
import { t } from '../theme/tokens'
import { useEntregasTurno } from '../hooks/useEntregasTurno'
import ModalEntregaTurno from '../components/turno/ModalEntregaTurno'
import { descargarPDF, compartirPDF } from '../lib/generatePDF'

function EntregaCard({ entrega, onEliminar, role }) {
  const [abierta, setAbierta] = useState(false)
  const fecha = entrega.fecha ?? entrega.creadoEn?.slice(0, 10) ?? '—'
  const hora  = entrega.hora ?? entrega.creadoEn?.slice(11, 16) ?? '—'

  return (
    <div style={{ background: t.bgElevated, border: `1px solid ${t.border}`, borderRadius: t.radiusLg, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
        onClick={() => setAbierta(a => !a)}>
        <ClipboardList size={15} color={t.brandSoft} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary }}>{fecha} · {hora}</div>
          {entrega.piloto && <div style={{ fontSize: 10, color: t.textMuted, marginTop: 1 }}>Piloto: {entrega.piloto}</div>}
        </div>
        {abierta ? <ChevronDown size={15} color={t.textMuted} /> : <ChevronRight size={15} color={t.textMuted} />}
      </div>

      {abierta && (
        <div style={{ borderTop: `1px solid ${t.border}`, padding: '10px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => descargarPDF(entrega)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: t.bgInput, border: `1px solid ${t.border}`, color: t.textSecondary, borderRadius: t.radiusMd, padding: '5px 11px', cursor: 'pointer', fontSize: 12 }}>
            <Download size={13} /> PDF
          </button>
          <button onClick={() => compartirPDF(entrega)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: t.bgInput, border: `1px solid ${t.border}`, color: t.textSecondary, borderRadius: t.radiusMd, padding: '5px 11px', cursor: 'pointer', fontSize: 12 }}>
            <Share2 size={13} /> Compartir
          </button>
          {role === 'admin' && (
            <button onClick={() => onEliminar(entrega.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: `1px solid ${t.fault}`, color: t.fault, borderRadius: t.radiusMd, padding: '5px 11px', cursor: 'pointer', fontSize: 12, marginLeft: 'auto' }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function CentroTurnos({ centro, role }) {
  const { entregas, itemsList, cargando, crearEntrega, actualizarEntrega, eliminarEntrega, subirFoto, guardarItemsList } = useEntregasTurno(centro.id)
  const [modal, setModal] = useState(false)

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: t.textBase, fontWeight: 600, color: t.textPrimary, textTransform: 'capitalize' }}>{centro.nombre}</div>
          {centro.teamAsignado && (
            <span style={{ fontSize: 10, color: t.brandSoft, background: t.brandTint, borderRadius: t.radiusMd, padding: '1px 7px', fontWeight: 600 }}>
              {centro.teamAsignado}
            </span>
          )}
        </div>
        {role === 'operador' && (
          <button onClick={() => setModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: t.brand, border: 'none', color: '#fff', borderRadius: t.radiusMd, padding: '6px 13px', cursor: 'pointer', fontSize: t.textSm, fontWeight: 600 }}>
            <Plus size={14} /> Nueva entrega
          </button>
        )}
      </div>

      {cargando && <p style={{ color: t.textMuted, fontSize: t.textSm }}>Cargando...</p>}
      {!cargando && entregas.length === 0 && (
        <p style={{ color: t.textMuted, fontSize: t.textSm, fontStyle: 'italic' }}>Sin entregas registradas.</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {entregas.map(e => (
          <EntregaCard key={e.id} entrega={e} role={role} onEliminar={eliminarEntrega} />
        ))}
      </div>

      {modal && (
        <ModalEntregaTurno
          centro={centro}
          itemsList={itemsList}
          crearEntrega={crearEntrega}
          actualizarEntrega={actualizarEntrega}
          subirFoto={subirFoto}
          guardarItemsList={guardarItemsList}
          onCerrar={() => setModal(false)}
        />
      )}
    </div>
  )
}

export default function TurnosPage() {
  const { centros, role, teamId, empresaActiva } = useOutletContext()

  const lista = (() => {
    let base = empresaActiva ? centros.filter(c => c.empresaId === empresaActiva.id) : centros
    if (role === 'operador' && teamId) base = base.filter(c => c.teamAsignado === teamId)
    return [...base].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''))
  })()

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: t.space5 }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        {lista.length === 0 && (
          <div style={{ textAlign: 'center', color: t.textMuted, padding: '48px 0', fontSize: t.textSm }}>
            <ClipboardList size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
            <div>Sin centros disponibles.</div>
          </div>
        )}
        {lista.map(c => (
          <CentroTurnos key={c.id} centro={c} role={role} />
        ))}
      </div>
    </div>
  )
}
