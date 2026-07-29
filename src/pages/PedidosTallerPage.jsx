import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ClipboardList, FileDown, Share2, Trash2, Plus } from 'lucide-react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { t } from '../theme/tokens'
import { logError } from '../lib/logger'
import { descargarPDFPedidosTaller, compartirPDFPedidosTaller } from '../lib/generatePDF'

// Lista MANUAL de cosas que el taller necesita que le compren. La escribe el
// supervisor; el admin la ve (solo lectura). Distinta de "Compras", que es el
// consolidado automático de faltantes de los centros.
//
// Vive en `bodegaCentral/pedidosTaller` = { lista: [{ id, nombre, cantidad }] }.
// Las reglas de bodegaCentral ya dan write:supervisor / read:admin+supervisor,
// así que la UI de edición se muestra solo al supervisor.
const REF = () => doc(db, 'bodegaCentral', 'pedidosTaller')

export default function PedidosTallerPage() {
  const { role } = useOutletContext()
  const esSupervisor = role === 'supervisor'

  const [lista, setLista]         = useState([])
  const [cargando, setCargando]   = useState(true)
  const [nombre, setNombre]       = useState('')
  const [cantidad, setCantidad]   = useState(1)

  useEffect(() => {
    const unsub = onSnapshot(
      REF(),
      (snap) => { setLista(snap.exists() ? (snap.data().lista ?? []) : []); setCargando(false) },
      (e) => { logError('PedidosTaller/onSnapshot', e); setCargando(false) },
    )
    return () => unsub()
  }, [])

  const guardar = async (nueva) => {
    try { await setDoc(REF(), { lista: nueva }, { merge: true }) }
    catch (e) { logError('PedidosTaller/guardar', e) }
  }

  const agregar = () => {
    const n = nombre.trim()
    if (!n) return
    const cant = Math.max(1, Number(cantidad) || 1)
    guardar([...lista, { id: String(Date.now()), nombre: n, cantidad: cant }])
    setNombre(''); setCantidad(1)
  }

  const eliminar = (id) => guardar(lista.filter(it => it.id !== id))

  const puedeExportar = lista.length > 0
  const cols = esSupervisor ? '1fr 90px 44px' : '1fr 90px'

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: t.space5 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Encabezado + acciones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: t.space4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <ClipboardList size={20} color={t.brandSoft} />
            <div>
              <div style={{ fontSize: t.textBase, fontWeight: 700, color: t.textPrimary }}>Pedidos del Taller</div>
              <div style={{ fontSize: t.textXs, color: t.textMuted }}>
                {esSupervisor ? 'Cosas que necesitás que te compren' : 'Lista del taller (solo lectura)'}
              </div>
            </div>
          </div>
          <button
            onClick={() => descargarPDFPedidosTaller(lista)}
            disabled={!puedeExportar}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${t.brand}`, color: t.brandSoft, borderRadius: t.radiusMd, padding: '7px 14px', cursor: puedeExportar ? 'pointer' : 'default', fontSize: t.textSm, fontWeight: 600, opacity: puedeExportar ? 1 : 0.5 }}>
            <FileDown size={14} /> Descargar PDF
          </button>
          <button
            onClick={() => compartirPDFPedidosTaller(lista)}
            disabled={!puedeExportar}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: t.brand, border: 'none', color: '#fff', borderRadius: t.radiusMd, padding: '7px 14px', cursor: puedeExportar ? 'pointer' : 'default', fontSize: t.textSm, fontWeight: 600, opacity: puedeExportar ? 1 : 0.5 }}>
            <Share2 size={14} /> Compartir
          </button>
        </div>

        {/* Alta (solo supervisor) */}
        {esSupervisor && (
          <div style={{ display: 'flex', gap: 8, marginBottom: t.space4, flexWrap: 'wrap' }}>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') agregar() }}
              placeholder="¿Qué necesitás? (ej: Guantes de nitrilo talla L)"
              style={{ flex: 1, minWidth: 200, background: t.bgInput, border: `1px solid ${t.border}`, color: t.textPrimary, borderRadius: t.radiusMd, padding: '9px 12px', fontSize: t.textSm }}
            />
            <input
              type="number" min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') agregar() }}
              aria-label="Cantidad"
              style={{ width: 80, background: t.bgInput, border: `1px solid ${t.border}`, color: t.textPrimary, borderRadius: t.radiusMd, padding: '9px 12px', fontSize: t.textSm, textAlign: 'center' }}
            />
            <button
              onClick={agregar}
              disabled={!nombre.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: t.brand, border: 'none', color: '#fff', borderRadius: t.radiusMd, padding: '9px 16px', cursor: nombre.trim() ? 'pointer' : 'default', fontSize: t.textSm, fontWeight: 600, opacity: nombre.trim() ? 1 : 0.5 }}>
              <Plus size={16} /> Agregar
            </button>
          </div>
        )}

        {/* Estados vacíos */}
        {!cargando && lista.length === 0 && (
          <div style={{ textAlign: 'center', color: t.textMuted, padding: '48px 0', fontSize: t.textSm }}>
            <ClipboardList size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
            <div>{esSupervisor ? 'Todavía no cargaste ningún pedido. Agregá arriba lo que necesitás.' : 'El taller no cargó pedidos por ahora.'}</div>
          </div>
        )}

        {/* Tabla */}
        {lista.length > 0 && (
          <div style={{ border: `1px solid ${t.border}`, borderRadius: t.radiusMd, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 8, padding: '10px 14px', background: t.bgInput, borderBottom: `1px solid ${t.border}`, fontSize: t.textXs, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              <span>Ítem</span>
              <span style={{ textAlign: 'center' }}>Cantidad</span>
              {esSupervisor && <span />}
            </div>
            {lista.map(it => (
              <div key={it.id} style={{ display: 'grid', gridTemplateColumns: cols, gap: 8, alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${t.border}` }}>
                <span style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary }}>{it.nombre}</span>
                <span className="gl-mono" style={{ textAlign: 'center', fontSize: t.textBase, fontWeight: 700, color: t.textPrimary }}>{it.cantidad}</span>
                {esSupervisor && (
                  <button
                    onClick={() => eliminar(it.id)}
                    className="gl-icon-btn"
                    aria-label={`Borrar ${it.nombre}`}
                    title="Borrar"
                    style={{ justifySelf: 'center', color: t.fault }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
