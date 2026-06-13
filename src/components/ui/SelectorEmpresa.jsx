import { useState } from 'react'
import { Globe, Plus, X } from 'lucide-react'
import { useEmpresas } from '../../hooks/useEmpresas'
import { t } from '../../theme/tokens'
import { Modal, Button, Input, Field } from '../kit'

function ModalAgregarEmpresa({ onGuardar, onCerrar }) {
  const [nombre, setNombre] = useState('')
  const submit = (e) => { e.preventDefault(); if (nombre.trim()) onGuardar(nombre.trim()) }
  return (
    <Modal open title="Nueva empresa" onClose={onCerrar} maxWidth={360}
      footer={<>
        <Button variant="secondary" size="lg" onClick={onCerrar}>Cancelar</Button>
        <Button variant="primary" size="lg" onClick={submit}>Agregar</Button>
      </>}>
      <form onSubmit={submit}>
        <Field label="Nombre de la empresa">
          <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: AquaChile" autoFocus />
        </Field>
      </form>
    </Modal>
  )
}

export default function SelectorEmpresa({ empresaActiva, onCambiar, role }) {
  const { empresas, agregarEmpresa, eliminarEmpresa } = useEmpresas()
  const [modalAgregar, setModalAgregar] = useState(false)
  const [aEliminar, setAEliminar]       = useState(null)

  const handleAgregar = async (nombre) => { await agregarEmpresa(nombre); setModalAgregar(false) }
  const confirmarEliminar = async () => {
    await eliminarEmpresa(aEliminar.id)
    if (empresaActiva?.id === aEliminar.id) onCambiar(null)
    setAEliminar(null)
  }

  const chip = (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px',
    borderRadius: t.radiusFull, border: `1px solid ${active ? t.brand : t.border}`,
    background: active ? t.brandTint : 'transparent',
    color: active ? t.brandSoft : t.textSecondary,
    cursor: 'pointer', fontSize: t.textSm, fontWeight: 500, whiteSpace: 'nowrap',
    transition: `all ${t.durFast} ${t.ease}`,
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', maxWidth: '100%', padding: '2px' }}>
      <button onClick={() => onCambiar(null)} style={chip(empresaActiva === null)} title="Todas las empresas">
        <Globe size={14} /> Todas
      </button>

      {empresas.map(e => {
        const active = empresaActiva?.id === e.id
        return (
          <span key={e.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <button onClick={() => onCambiar(e)} style={chip(active)}>{e.nombre}</button>
            {role === 'admin' && active && (
              <button className="gl-icon-btn" style={{ padding: 3, marginLeft: 2, color: t.fault }}
                onClick={() => setAEliminar(e)} aria-label={`Eliminar ${e.nombre}`}><X size={13} /></button>
            )}
          </span>
        )
      })}

      {role === 'admin' && (
        <button onClick={() => setModalAgregar(true)} style={{ ...chip(false), borderStyle: 'dashed', color: t.brandSoft }} title="Agregar empresa">
          <Plus size={14} />
        </button>
      )}

      {modalAgregar && <ModalAgregarEmpresa onGuardar={handleAgregar} onCerrar={() => setModalAgregar(false)} />}

      {aEliminar && (
        <Modal open title="Eliminar empresa" onClose={() => setAEliminar(null)} maxWidth={340}
          footer={<>
            <Button variant="secondary" size="lg" onClick={() => setAEliminar(null)}>Cancelar</Button>
            <Button variant="primary" size="lg" style={{ background: t.fault }} onClick={confirmarEliminar}>Eliminar</Button>
          </>}>
          <p style={{ color: t.textSecondary, fontSize: t.textSm, margin: 0, lineHeight: 1.5 }}>
            ¿Seguro que quieres eliminar <b style={{ color: t.textPrimary }}>{aEliminar.nombre}</b>?
          </p>
        </Modal>
      )}
    </div>
  )
}
