const s = {
  lista:    { display: 'flex', flexDirection: 'column' },
  item:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gl-border)' },
  nombre:   { fontSize: 13, color: 'var(--gl-text-primary)' },
  input:    { width: 64, textAlign: 'center', background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, color: 'var(--gl-text-primary)', fontSize: 13, fontWeight: 600, padding: '5px 8px', outline: 'none', fontFamily: 'inherit' },
  textarea: { background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 8, color: 'var(--gl-text-primary)', fontSize: 13, padding: '8px 10px', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none', lineHeight: 1.5, marginTop: 12 },
  label:    { fontSize: 11, fontWeight: 600, color: 'var(--gl-text-secondary)', display: 'block', marginTop: 14, marginBottom: 4 },
}

export default function StepInventario({ inventario, onChange, observacionFinal, onObsChange }) {
  const set = (id, cantidad) => onChange(inventario.map(i => i.id === id ? { ...i, cantidad } : i))

  return (
    <div>
      <div style={s.lista}>
        {inventario.map(item => (
          <div key={item.id} style={s.item}>
            <span style={s.nombre}>{item.label}</span>
            <input
              type="number"
              min={0}
              style={{ ...s.input, color: item.cantidad === 0 ? 'var(--gl-fault)' : 'var(--gl-text-primary)' }}
              value={item.cantidad}
              onChange={e => set(item.id, Number(e.target.value))}
            />
          </div>
        ))}
      </div>
      <label style={s.label}>Observaciones finales</label>
      <textarea
        style={s.textarea}
        rows={3}
        placeholder="Caja de herramientas guardada con insumos adentro..."
        value={observacionFinal}
        onChange={e => onObsChange(e.target.value)}
      />
    </div>
  )
}
