import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Clock, Truck, CircleCheck, Trash2, Package, Send } from 'lucide-react'
import { t } from '../theme/tokens'
import { Button, Modal } from '../components/kit'
import { useDespachosGlobal } from '../hooks/useDespachosGlobal'

const ESTADO_INFO = {
  pendiente: { label: 'Pendiente',  color: t.low,      tint: t.lowTint,      icon: Clock },
  enviado:   { label: 'En camino',  color: t.dispatch, tint: t.dispatchTint, icon: Truck },
  parcial:   { label: 'Parcial',    color: t.low,      tint: t.lowTint,      icon: Truck },
  recibido:  { label: 'Recibido',   color: t.ok,       tint: t.okTint,       icon: CircleCheck },
}

const FILTROS = [
  { key: 'todos',      label: 'Todos' },
  { key: 'pendiente',  label: 'Pendientes' },
  { key: 'enviado',    label: 'En camino' },
  { key: 'recibido',   label: 'Recibidos' },
]

function itemsTexto(d) {
  const items = d.items ?? []
  if (items.length === 0) return 'Sin ítems'
  return items.map(i => i.nombre + (i.cantidadSolicitada ? ` ×${i.cantidadSolicitada}` : '')).join(', ')
}

export default function DespachosPage() {
  const { role } = useOutletContext()
  const { despachos, cargando, marcarEnviado, confirmarRecepcion, eliminarDespacho } = useDespachosGlobal()
  const [filtro, setFiltro]     = useState('todos')
  const [aEliminar, setAEliminar] = useState(null)

  const conteo = {
    pendiente: despachos.filter(d => d.estado === 'pendiente').length,
    enviado:   despachos.filter(d => d.estado === 'enviado' || d.estado === 'parcial').length,
    recibido:  despachos.filter(d => d.estado === 'recibido').length,
  }
  let lista = filtro === 'todos' ? despachos
    : filtro === 'enviado' ? despachos.filter(d => d.estado === 'enviado' || d.estado === 'parcial')
    : despachos.filter(d => d.estado === filtro)

  const enviarWhatsApp = (d) => {
    const msg = `*Solicitud de despacho*\nCentro: ${d.centroNombre}\nÍtems:\n${(d.items ?? []).map(i => `• ${i.nombre}${i.cantidadSolicitada ? ` ×${i.cantidadSolicitada}` : ''}`).join('\n')}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: t.space5 }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 7, marginBottom: t.space4, flexWrap: 'wrap' }}>
          {FILTROS.map(f => {
            const active = filtro === f.key
            const n = f.key === 'todos' ? despachos.length : conteo[f.key]
            return (
              <button key={f.key} onClick={() => setFiltro(f.key)}
                style={{ fontSize: t.textXs, padding: '6px 13px', borderRadius: t.radiusFull, cursor: 'pointer',
                  border: `1px solid ${active ? t.brand : t.border}`, background: active ? t.brandTint : 'transparent',
                  color: active ? t.brandSoft : t.textSecondary, fontWeight: 500 }}>
                {f.label}{n > 0 ? ` · ${n}` : ''}
              </button>
            )
          })}
        </div>

        {cargando && <p style={{ color: t.textMuted, fontSize: t.textSm }}>Cargando...</p>}
        {!cargando && lista.length === 0 && (
          <div style={{ textAlign: 'center', color: t.textMuted, padding: '48px 0', fontSize: t.textSm }}>
            <Package size={32} style={{ opacity: 0.5, marginBottom: 8 }} /><div>No hay despachos en esta categoría.</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {lista.map(d => {
            const info = ESTADO_INFO[d.estado] ?? ESTADO_INFO.pendiente
            const Icon = info.icon
            const recibido = d.estado === 'recibido'
            return (
              <div key={d.id} style={{ background: recibido ? t.bgInput : t.bgElevated, border: `1px solid ${t.border}`,
                borderRadius: t.radiusLg, padding: '13px 15px', opacity: recibido ? 0.8 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 11, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: t.radiusMd, background: info.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} color={info.color} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary }}>{d.centroNombre ?? 'Centro'}</div>
                      <div style={{ fontSize: t.textXs, color: t.textMuted, marginTop: 2 }}>{(d.items ?? []).length} ítem(s) · {itemsTexto(d)}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: info.color, background: info.tint, padding: '3px 10px', borderRadius: t.radiusFull, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>{info.label}</span>
                </div>

                {!recibido && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 11, borderTop: `1px solid ${t.border}`, flexWrap: 'wrap' }}>
                    {role === 'admin' && (d.estado === 'pendiente') && (
                      <>
                        <Button size="sm" icon={Send} onClick={() => enviarWhatsApp(d)} style={{ background: '#22c55e', color: '#06240f' }}>WhatsApp</Button>
                        <Button size="sm" variant="secondary" icon={Truck} onClick={() => marcarEnviado(d.id)}>Marcar enviado</Button>
                      </>
                    )}
                    {(d.estado === 'enviado' || d.estado === 'parcial') && (
                      <Button size="sm" variant="secondary" icon={CircleCheck} onClick={() => confirmarRecepcion(d.id)} style={{ borderColor: t.ok, color: t.ok }}>Confirmar recepción</Button>
                    )}
                    {role === 'admin' && (
                      <Button size="sm" variant="danger" icon={Trash2} onClick={() => setAEliminar(d)} style={{ marginLeft: 'auto' }} aria-label="Eliminar" />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {aEliminar && (
        <Modal open title="Eliminar despacho" onClose={() => setAEliminar(null)} maxWidth={340}
          footer={<>
            <Button variant="secondary" size="lg" onClick={() => setAEliminar(null)}>Cancelar</Button>
            <Button variant="primary" size="lg" style={{ background: t.fault }} onClick={async () => { await eliminarDespacho(aEliminar.id); setAEliminar(null) }}>Eliminar</Button>
          </>}>
          <p style={{ color: t.textSecondary, fontSize: t.textSm, margin: 0 }}>¿Eliminar el despacho de <b style={{ color: t.textPrimary }}>{aEliminar.centroNombre}</b>?</p>
        </Modal>
      )}
    </div>
  )
}
