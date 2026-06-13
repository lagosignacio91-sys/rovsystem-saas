import { useState } from 'react'
import { useEmpresas } from '../../hooks/useEmpresas'

function ModalAgregarEmpresa({ onGuardar, onCerrar }) {
  const [nombre, setNombre] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    onGuardar(nombre.trim())
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitulo}>Nueva Empresa</h3>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Nombre de la empresa</label>
          <input
            style={styles.input}
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: AquaChile"
            autoFocus
            required
          />
          <div style={styles.modalBtns}>
            <button type="button" onClick={onCerrar}  style={styles.btnCancelar}>Cancelar</button>
            <button type="submit"                      style={styles.btnConfirmar}>Agregar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SelectorEmpresa({ empresaActiva, onCambiar, role }) {
  const { empresas, agregarEmpresa, eliminarEmpresa } = useEmpresas()
  const [modalAgregar, setModalAgregar] = useState(false)

  const handleAgregar = async (nombre) => {
    await agregarEmpresa(nombre)
    setModalAgregar(false)
  }

  const handleEliminar = async (empresa) => {
    if (window.confirm(`¿Eliminar empresa "${empresa.nombre}"?`)) {
      await eliminarEmpresa(empresa.id)
      if (empresaActiva?.id === empresa.id) onCambiar(null)
    }
  }

  return (
    <div style={styles.wrapper}>
      {/* Pestaña Todas — solo globo */}
      <button
        onClick={() => onCambiar(null)}
        style={{ ...styles.tab, ...(empresaActiva === null ? styles.tabActiva : {}) }}
        title="Todas las empresas"
      >
        🌐
      </button>

      {empresas.map(e => (
        <div key={e.id} style={styles.tabWrapper}>
          <button
            onClick={() => onCambiar(e)}
            style={{ ...styles.tab, ...(empresaActiva?.id === e.id ? styles.tabActiva : {}) }}
          >
            {e.nombre}
          </button>
          {role === 'admin' && empresaActiva?.id === e.id && (
            <button onClick={() => handleEliminar(e)} style={styles.btnEliminar} title="Eliminar empresa">✕</button>
          )}
        </div>
      ))}

      {/* Botón agregar — solo + */}
      {role === 'admin' && (
        <button onClick={() => setModalAgregar(true)} style={styles.btnAgregar} title="Agregar empresa">+</button>
      )}

      {modalAgregar && (
        <ModalAgregarEmpresa onGuardar={handleAgregar} onCerrar={() => setModalAgregar(false)} />
      )}
    </div>
  )
}

const styles = {
  wrapper:     { display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', flex: 1, padding: '0 12px' },
  tabWrapper:  { display: 'flex', alignItems: 'center', gap: '2px' },
  tab:         { padding: '4px 10px', borderRadius: '6px', border: '1px solid #1e3a5f', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap' },
  tabActiva:   { background: '#1d4ed8', border: '1px solid #3b82f6', color: '#fff', fontWeight: '600' },
  btnEliminar: { background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', padding: '2px 4px' },
  btnAgregar:  { padding: '4px 8px', borderRadius: '6px', border: '1px dashed #1e3a5f', background: 'transparent', color: '#3b82f6', cursor: 'pointer', fontSize: '16px', fontWeight: '700', lineHeight: 1 },
  modalOverlay:{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal:       { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '360px' },
  modalTitulo: { color: '#f1f5f9', fontSize: '16px', fontWeight: '700', marginBottom: '16px' },
  label:       { color: '#94a3b8', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' },
  input:       { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', padding: '10px', outline: 'none', boxSizing: 'border-box' },
  modalBtns:   { display: 'flex', gap: '12px', marginTop: '20px' },
  btnCancelar: { flex: 1, background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '14px' },
  btnConfirmar:{ flex: 1, background: '#2563eb', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
}