import { useState, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { t } from '../theme/tokens'
import { useIsMobile } from '../hooks/useIsMobile'
import { BarChart2, Package, Wrench, Download } from 'lucide-react'

// Tarjeta para móvil: muestra pares etiqueta/valor apilados (reemplaza filas de tabla).
function DataCard({ rows }) {
  return (
    <div style={{ borderTop: `1px solid ${t.border}`, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map(([label, value], i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
          <span style={{ fontSize: t.textXs, color: t.textMuted, flexShrink: 0 }}>{label}</span>
          <span style={{ fontSize: t.textSm, color: t.textPrimary, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function getMesOptions() {
  const hoy = new Date()
  const opts = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    opts.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${MESES[d.getMonth()]} ${d.getFullYear()}` })
  }
  return opts
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: '16px 20px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color ?? t.textPrimary }}>{value}</div>
      <div style={{ fontSize: t.textXs, color: t.textMuted, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function BarRow({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: t.textXs, color: t.textSecondary, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ fontWeight: 700, color: t.textPrimary }}>{value}</span>
      </div>
      <div style={{ height: 8, background: t.bgInput, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color ?? t.brand, borderRadius: 4, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

export default function ReportesPage() {
  const { centros, empresaActiva } = useOutletContext()
  const isMobile = useIsMobile()
  const mesOpts = useMemo(getMesOptions, [])
  const [mesSel, setMesSel] = useState(mesOpts[0].value)
  const [despachos, setDespachos] = useState([])
  const [fallas, setFallas]       = useState([])
  const [cargando, setCargando]   = useState(true)

  useEffect(() => {
    let cancelled = false
    const [ano, mes] = mesSel.split('-').map(Number)
    const inicio = new Date(ano, mes - 1, 1).toISOString()
    const fin    = new Date(ano, mes, 1).toISOString()

    async function cargar() {
      setCargando(true)
      try {
        // Despachos del mes
        const snap = await getDocs(
          query(collection(db, 'despachos'),
            where('creadoEn', '>=', inicio),
            where('creadoEn', '<', fin)
          )
        )
        const despData = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(d => !d.eliminado)

        // Fallas de equipos de todos los centros (createdAt en ese mes)
        const centrosList = empresaActiva
          ? centros.filter(c => c.empresaId === empresaActiva.id)
          : centros

        const fallasData = []
        await Promise.all(centrosList.map(async (c) => {
          const eqSnap = await getDocs(collection(db, 'centros', c.id, 'equipos'))
          eqSnap.docs.forEach(doc => {
            const eq = doc.data()
            ;(eq.unidades ?? []).forEach(u => {
              if (u.estado === 'conFalla' && u.desde) {
                const d = new Date(u.desde)
                if (d >= new Date(inicio) && d < new Date(fin)) {
                  fallasData.push({ centroId: c.id, centroNombre: c.nombre, teamAsignado: c.teamAsignado, modelo: doc.id, serial: u.serial, desde: u.desde, detallesFalla: u.detallesFalla })
                }
              }
            })
          })
        }))

        if (!cancelled) {
          setDespachos(despData)
          setFallas(fallasData)
        }
      } finally {
        if (!cancelled) setCargando(false)
      }
    }
    cargar()
    return () => { cancelled = true }
  }, [mesSel, empresaActiva, centros])

  // Agrupaciones
  const centrosFiltrados = empresaActiva ? centros.filter(c => c.empresaId === empresaActiva.id) : centros
  const centroIds = new Set(centrosFiltrados.map(c => c.id))

  const despFiltrados = despachos.filter(d => !empresaActiva || centroIds.has(d.centroId))

  const porEquipo = despFiltrados.reduce((acc, d) => {
    const k = d.teamAsignado ?? 'Sin equipo'
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  const maxDesp = Math.max(1, ...Object.values(porEquipo))

  const fallasFiltradas = fallas.filter(f => !empresaActiva || centroIds.has(f.centroId))
  const fallasPorEquipo = fallasFiltradas.reduce((acc, f) => {
    const k = f.teamAsignado ?? 'Sin equipo'
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  const maxFallas = Math.max(1, ...Object.values(fallasPorEquipo))

  const porEstado = despFiltrados.reduce((acc, d) => { acc[d.estado] = (acc[d.estado] ?? 0) + 1; return acc }, {})
  const itemsTotal = despFiltrados.reduce((acc, d) => acc + (d.items?.length ?? 0), 0)

  const mesLabel = mesOpts.find(m => m.value === mesSel)?.label ?? mesSel

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: t.space5 }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>

        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.space5, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart2 size={22} color={t.brand} />
            <h1 style={{ fontSize: t.textXl, fontWeight: 800, color: t.textPrimary, margin: 0 }}>Reportes Mensuales</h1>
          </div>
          <select value={mesSel} onChange={e => setMesSel(e.target.value)}
            style={{ padding: '7px 12px', background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textPrimary, fontSize: t.textSm, cursor: 'pointer' }}>
            {mesOpts.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {cargando && <p style={{ color: t.textMuted, fontSize: t.textSm }}>Cargando datos de {mesLabel}…</p>}

        {!cargando && (
          <div>
            {/* Stats generales */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              <StatBox label="Solicitudes totales" value={despFiltrados.length} color={t.brand} />
              <StatBox label="Ítems solicitados"   value={itemsTotal}           color={t.brandSoft} />
              <StatBox label="Fallas registradas"  value={fallasFiltradas.length} color="var(--gl-fault)" />
              <StatBox label="Recibidos"            value={porEstado.recibido ?? 0} color="var(--gl-ok)" />
            </div>

            {/* Solicitudes por equipo */}
            <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Package size={16} color={t.brand} />
                <span style={{ fontWeight: 700, fontSize: t.textBase, color: t.textPrimary }}>Solicitudes de stock por equipo</span>
                <span style={{ fontSize: t.textXs, color: t.textMuted, marginLeft: 'auto' }}>{mesLabel}</span>
              </div>
              {Object.keys(porEquipo).length === 0
                ? <p style={{ fontSize: t.textSm, color: t.textMuted, margin: 0 }}>Sin solicitudes en este período.</p>
                : Object.entries(porEquipo)
                    .sort((a, b) => b[1] - a[1])
                    .map(([equipo, n]) => (
                      <BarRow key={equipo} label={equipo} value={n} max={maxDesp} color={t.brand} />
                    ))
              }
            </div>

            {/* Fallas por equipo */}
            <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Wrench size={16} color="var(--gl-fault)" />
                <span style={{ fontWeight: 700, fontSize: t.textBase, color: t.textPrimary }}>Fallas de equipos por equipo</span>
                <span style={{ fontSize: t.textXs, color: t.textMuted, marginLeft: 'auto' }}>{mesLabel}</span>
              </div>
              {Object.keys(fallasPorEquipo).length === 0
                ? <p style={{ fontSize: t.textSm, color: t.textMuted, margin: 0 }}>Sin fallas registradas en este período.</p>
                : Object.entries(fallasPorEquipo)
                    .sort((a, b) => b[1] - a[1])
                    .map(([equipo, n]) => (
                      <BarRow key={equipo} label={equipo} value={n} max={maxFallas} color="var(--gl-fault)" />
                    ))
              }
            </div>

            {/* Detalle de fallas */}
            {fallasFiltradas.length > 0 && (
              <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.border}`, fontWeight: 700, fontSize: t.textSm, color: t.textPrimary }}>
                  Detalle de fallas — {mesLabel}
                </div>
                {isMobile ? (
                  fallasFiltradas.map((f, i) => (
                    <DataCard key={i} rows={[
                      ['Centro', f.centroNombre],
                      ['Equipo', f.teamAsignado ?? '—'],
                      ['Modelo', f.modelo],
                      ['Serial', f.serial],
                      ['Detalle', f.detallesFalla || '—'],
                      ['Fecha', f.desde ? new Date(f.desde).toLocaleDateString('es-CL') : '—'],
                    ]} />
                  ))
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: t.textSm }}>
                      <thead>
                        <tr style={{ background: t.bgElevated }}>
                          {['Centro', 'Equipo', 'Modelo', 'Serial', 'Detalle', 'Fecha'].map(h => (
                            <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: t.textSecondary, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fallasFiltradas.map((f, i) => (
                          <tr key={i} style={{ borderTop: `1px solid ${t.border}` }}>
                            <td style={{ padding: '9px 14px', color: t.textPrimary }}>{f.centroNombre}</td>
                            <td style={{ padding: '9px 14px', color: t.textSecondary }}>{f.teamAsignado ?? '—'}</td>
                            <td style={{ padding: '9px 14px', color: t.textPrimary, fontWeight: 600 }}>{f.modelo}</td>
                            <td style={{ padding: '9px 14px', color: t.textSecondary }}>{f.serial}</td>
                            <td style={{ padding: '9px 14px', color: t.textMuted, maxWidth: 200 }}>{f.detallesFalla || '—'}</td>
                            <td style={{ padding: '9px 14px', color: t.textMuted, whiteSpace: 'nowrap' }}>
                              {f.desde ? new Date(f.desde).toLocaleDateString('es-CL') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Detalle de solicitudes */}
            {despFiltrados.length > 0 && (
              <div style={{ background: t.bgSurface, border: `1px solid ${t.border}`, borderRadius: t.radiusMd, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: t.textSm, color: t.textPrimary }}>Detalle de solicitudes — {mesLabel}</span>
                </div>
                {(() => {
                  const ordenados = [...despFiltrados].sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? ''))
                  const estadoBadge = (estado) => (
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                      background: estado === 'recibido' ? 'var(--gl-ok-tint)' : estado === 'enviado' ? 'var(--gl-dispatch-tint)' : 'var(--gl-low-tint)',
                      color:      estado === 'recibido' ? 'var(--gl-ok)'       : estado === 'enviado' ? 'var(--gl-dispatch)'      : 'var(--gl-low)',
                    }}>
                      {estado === 'recibido' ? 'Recibido' : estado === 'enviado' ? 'En camino' : 'Pendiente'}
                    </span>
                  )
                  const itemsTxt = (d) => (d.items ?? []).map(i => `${i.nombre}×${i.cantidadSolicitada ?? i.cantidad ?? 1}`).join(', ')
                  return isMobile ? (
                    ordenados.map(d => (
                      <DataCard key={d.id} rows={[
                        ['Fecha', d.creadoEn ? new Date(d.creadoEn).toLocaleDateString('es-CL') : '—'],
                        ['Centro', d.centroNombre ?? '—'],
                        ['Equipo', d.teamAsignado ?? '—'],
                        ['Ítems', itemsTxt(d) || '—'],
                        ['Estado', estadoBadge(d.estado)],
                      ]} />
                    ))
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: t.textSm }}>
                        <thead>
                          <tr style={{ background: t.bgElevated }}>
                            {['Fecha', 'Centro', 'Equipo', 'Ítems', 'Estado'].map(h => (
                              <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: t.textSecondary, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ordenados.map(d => (
                            <tr key={d.id} style={{ borderTop: `1px solid ${t.border}` }}>
                              <td style={{ padding: '9px 14px', color: t.textMuted, whiteSpace: 'nowrap' }}>
                                {d.creadoEn ? new Date(d.creadoEn).toLocaleDateString('es-CL') : '—'}
                              </td>
                              <td style={{ padding: '9px 14px', color: t.textPrimary, fontWeight: 600 }}>{d.centroNombre ?? '—'}</td>
                              <td style={{ padding: '9px 14px', color: t.textSecondary }}>{d.teamAsignado ?? '—'}</td>
                              <td style={{ padding: '9px 14px', color: t.textSecondary, maxWidth: 220 }}>{itemsTxt(d)}</td>
                              <td style={{ padding: '9px 14px' }}>{estadoBadge(d.estado)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
