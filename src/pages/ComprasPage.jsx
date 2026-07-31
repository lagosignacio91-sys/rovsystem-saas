import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { RefreshCw, FileDown, Share2, ShoppingCart, PackageCheck } from 'lucide-react'
import { t } from '../theme/tokens'
import { consolidarFaltantesHerramientas } from '../lib/consolidadoFaltantes'
import { descargarPDFFaltantes, compartirPDFFaltantes } from '../lib/generatePDF'
import { areaDe } from '../config/appDefaults'

// Consolidado de herramientas faltantes de todos los centros (estuche + caja),
// agrupado por ítem, para planificar compras semanales/mensuales. Solo admin/supervisor.
export default function ComprasPage() {
  const { centros, empresaActiva, areaActiva } = useOutletContext()
  const base = (centros ?? [])
    .filter(c => !empresaActiva || c.empresaId === empresaActiva.id)
    .filter(c => !areaActiva || areaActiva === 'todas' || areaDe(c) === areaActiva)

  const [consolidado, setConsolidado] = useState(null)
  const [cargando, setCargando]       = useState(true)
  const [nonce, setNonce]             = useState(0)   // el botón "Actualizar" fuerza un re-fetch

  const meta = { empresaNombre: empresaActiva?.nombre ?? '' }

  // Clave estable: re-generar cuando cambia la empresa, el conjunto de centros o el nonce.
  const idsStable = base.map(c => c.id).join(',')

  useEffect(() => {
    let cancel = false
    const run = async () => {
      const res = await consolidarFaltantesHerramientas(base)
      if (cancel) return
      setConsolidado(res)
      setCargando(false)
    }
    run()
    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaActiva?.id, idsStable, nonce])

  const generar = () => { setCargando(true); setNonce(n => n + 1) }

  const items = consolidado?.items ?? []
  const totalUnidades = items.reduce((n, it) => n + it.unidades, 0)
  const puedeExportar = items.length > 0

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: t.space5 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Encabezado + acciones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: t.space4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <ShoppingCart size={20} color={t.brandSoft} />
            <div>
              <div style={{ fontSize: t.textBase, fontWeight: 700, color: t.textPrimary }}>Herramientas para comprar</div>
              <div style={{ fontSize: t.textXs, color: t.textMuted }}>
                Consolidado de faltantes de {empresaActiva ? empresaActiva.nombre : 'todos los centros'}
              </div>
            </div>
          </div>
          <button
            onClick={generar}
            disabled={cargando}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${t.border}`, color: t.textSecondary, borderRadius: t.radiusMd, padding: '7px 14px', cursor: 'pointer', fontSize: t.textSm, fontWeight: 600, opacity: cargando ? 0.5 : 1 }}>
            <RefreshCw size={14} className={cargando ? 'gl-spin' : undefined} /> Actualizar
          </button>
          <button
            onClick={() => descargarPDFFaltantes(consolidado, meta)}
            disabled={!puedeExportar}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${t.brand}`, color: t.brandSoft, borderRadius: t.radiusMd, padding: '7px 14px', cursor: puedeExportar ? 'pointer' : 'default', fontSize: t.textSm, fontWeight: 600, opacity: puedeExportar ? 1 : 0.5 }}>
            <FileDown size={14} /> Descargar PDF
          </button>
          <button
            onClick={() => compartirPDFFaltantes(consolidado, meta)}
            disabled={!puedeExportar}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: t.brand, border: 'none', color: '#fff', borderRadius: t.radiusMd, padding: '7px 14px', cursor: puedeExportar ? 'pointer' : 'default', fontSize: t.textSm, fontWeight: 600, opacity: puedeExportar ? 1 : 0.5 }}>
            <Share2 size={14} /> Compartir
          </button>
        </div>

        {/* Resumen */}
        {!cargando && (
          <div className="gl-stats-row" style={{ marginBottom: t.space4 }}>
            <span className="gl-stat-chip">Herramientas distintas <span className="gl-mono" style={{ opacity: 0.7 }}>{items.length}</span></span>
            <span className="gl-stat-chip">Unidades a comprar <span className="gl-mono" style={{ opacity: 0.7 }}>{totalUnidades}</span></span>
            <span className="gl-stat-chip">Centros con faltantes <span className="gl-mono" style={{ opacity: 0.7 }}>{consolidado?.totalCentrosConFaltantes ?? 0}</span></span>
          </div>
        )}

        {/* Estados */}
        {cargando && (
          <div style={{ textAlign: 'center', color: t.textMuted, padding: '48px 0', fontSize: t.textSm }}>
            <RefreshCw size={26} className="gl-spin" style={{ opacity: 0.6, marginBottom: 8 }} />
            <div>Revisando el inventario de los centros…</div>
          </div>
        )}

        {!cargando && items.length === 0 && (
          <div style={{ textAlign: 'center', color: t.textMuted, padding: '48px 0', fontSize: t.textSm }}>
            <PackageCheck size={32} color={t.ok} style={{ marginBottom: 8 }} />
            <div>Ningún centro tiene herramientas faltantes. ✅</div>
          </div>
        )}

        {/* Tabla por ítem */}
        {!cargando && items.length > 0 && (
          <div style={{ border: `1px solid ${t.border}`, borderRadius: t.radiusMd, overflow: 'hidden' }}>
            {/* Cabecera */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px', gap: 8, padding: '10px 14px', background: t.bgInput, borderBottom: `1px solid ${t.border}`, fontSize: t.textXs, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              <span>Herramienta</span>
              <span style={{ textAlign: 'center' }}>Categoría</span>
              <span style={{ textAlign: 'center' }}>Unidades</span>
            </div>
            {items.map(it => (
              <div key={it.key} style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: t.textSm, fontWeight: 600, color: t.textPrimary }}>{it.label}</span>
                  <span style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: t.brandSoft, background: t.brandTint, borderRadius: t.radiusMd, padding: '2px 8px' }}>{it.categoria}</span>
                  </span>
                  <span className="gl-mono" style={{ textAlign: 'center', fontSize: t.textBase, fontWeight: 700, color: t.textPrimary }}>{it.unidades}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: t.textXs, color: t.textMuted, lineHeight: 1.5 }}>
                  {it.centros.map((c, i) => {
                    const abbr = (c.sets ?? []).map(s => (s === 'Principal' ? 'Ppal' : s === 'Backup' ? 'Bkp' : s))
                    return (
                      <span key={c.nombre + i}>
                        {i > 0 && ' · '}
                        {c.nombre}{abbr.length ? ` (${abbr.join(', ')})` : ''}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
