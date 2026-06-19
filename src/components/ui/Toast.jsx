import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Package, Truck } from 'lucide-react'

let _addToast = null
export const toast = {
  solicitud: (msg) => _addToast?.({ tipo: 'solicitud', msg }),
  despacho:  (msg) => _addToast?.({ tipo: 'despacho',  msg }),
}

export function ToastProvider() {
  const [items, setItems] = useState([])
  const timers = useRef({})

  const remove = useCallback((id) => {
    clearTimeout(timers.current[id])
    setItems(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((t) => {
    const id = Date.now()
    setItems(prev => [...prev.slice(-3), { ...t, id }])
    timers.current[id] = setTimeout(() => remove(id), 5000)
  }, [remove])

  useEffect(() => { _addToast = add; return () => { _addToast = null } }, [add])

  if (items.length === 0) return null

  return (
    <div style={{ position: 'fixed', bottom: 72, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
      {items.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: t.tipo === 'solicitud' ? '#1e3a5f' : '#14532d',
          border: `1px solid ${t.tipo === 'solicitud' ? '#3b82f6' : '#22c55e'}`,
          borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          animation: 'fadeInUp 0.2s ease',
        }}>
          {t.tipo === 'solicitud'
            ? <Package size={16} color="#60a5fa" style={{ flexShrink: 0 }} />
            : <Truck    size={16} color="#4ade80" style={{ flexShrink: 0 }} />}
          <span style={{ fontSize: 12, color: '#f1f5f9', flex: 1, lineHeight: 1.4 }}>{t.msg}</span>
          <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2, display: 'flex', flexShrink: 0 }}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
