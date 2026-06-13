import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { useState, useRef } from 'react'
import { Search, X, MapPin } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import PopupCentro from './PopupCentro'
import { t, ESTADO_META } from '../../theme/tokens'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// SVG paths (lucide) por estado para incrustar en el marcador
const SVG = {
  OK:              '<path d="M20 6 9 17l-5-5"/>',
  LOW_STOCK:       '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  EQUIPMENT_FAULT: '<path d="M12 16h.01"/><path d="M12 8v4"/><path d="M15.3 2H8.7L2 8.7v6.6L8.7 22h6.6L22 15.3V8.7z"/>',
  DISPATCH_ONWAY:  '<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  NO_OPERATOR:     '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4"/><line x1="17" y1="8" x2="22" y2="13"/><line x1="22" y1="8" x2="17" y2="13"/>',
}

const ESTADOS_ORDEN = ['OK', 'LOW_STOCK', 'EQUIPMENT_FAULT', 'DISPATCH_ONWAY', 'NO_OPERATOR']

// El tamaño del marcador escala con el zoom: lejos = pequeño, cerca = grande.
function tamPorZoom(zoom) {
  return Math.round(Math.max(16, Math.min(34, (zoom - 3) * 3)))
}

function crearIcono(estado, size = 26) {
  const meta  = ESTADO_META[estado] ?? ESTADO_META.NO_OPERATOR
  const color = meta.dot
  const alerta = estado === 'LOW_STOCK' || estado === 'EQUIPMENT_FAULT'
  const grande = size >= 22
  const borde  = Math.max(1.5, size * 0.09).toFixed(1)
  const halo   = (alerta && grande) ? `box-shadow:0 0 0 ${Math.round(size * 0.22)}px ${color}38;animation:markerPulse 2s ease-out infinite;` : `box-shadow:0 1px 5px rgba(0,0,0,0.5);`
  const iconHtml = grande
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(size * 0.5)}" height="${Math.round(size * 0.5)}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${SVG[estado] ?? SVG.NO_OPERATOR}</svg>`
    : ''
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:${borde}px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;${halo}">${iconHtml}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function MapEvents({ onMapClick, onZoom }) {
  useMapEvents({
    click(e) { if (onMapClick) onMapClick(e.latlng) },
    zoomend(e) { if (onZoom) onZoom(e.target.getZoom()) },
  })
  return null
}

function Leyenda() {
  return (
    <div style={leyenda.box}>
      <div style={leyenda.titulo}>LEYENDA</div>
      {ESTADOS_ORDEN.map(e => (
        <div key={e} style={leyenda.fila}>
          <span style={{ ...leyenda.punto, background: ESTADO_META[e].dot }} />
          <span style={leyenda.label}>{ESTADO_META[e].label}</span>
        </div>
      ))}
    </div>
  )
}

function StatsPanel({ centros }) {
  const conteo = ESTADOS_ORDEN.map(e => ({ e, n: centros.filter(c => c.estado === e).length })).filter(x => x.n > 0)
  if (conteo.length === 0) return null
  return (
    <div style={stats.box}>
      {conteo.map(({ e, n }, i) => (
        <div key={e} style={{ ...stats.item, borderRight: i < conteo.length - 1 ? '1px solid var(--gl-border)' : 'none' }}>
          <span style={{ ...stats.punto, background: ESTADO_META[e].dot }} />
          <div>
            <div style={stats.num}>{n}</div>
            <div style={stats.label}>{ESTADO_META[e].label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function BuscadorCentros({ centros, mapRef, onSelect }) {
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState(false)

  const q = query.trim().toLowerCase()
  const resultados = q
    ? centros.filter(c => c.nombre?.toLowerCase().includes(q) || c.empresaNombre?.toLowerCase().includes(q)).slice(0, 6)
    : []

  const elegir = (c) => {
    if (mapRef.current && typeof c.lat === 'number' && typeof c.lng === 'number') {
      mapRef.current.flyTo([c.lat, c.lng], 13, { duration: 1.1 })
    }
    setQuery(''); setFocus(false)
    onSelect && onSelect(c)
  }

  return (
    <div style={buscador.box}>
      <div style={buscador.inputRow}>
        <Search size={16} color={t.textMuted} style={{ flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          placeholder="Buscar centro..."
          style={buscador.input}
        />
        {query && <button className="gl-icon-btn" style={{ padding: 2 }} onMouseDown={() => setQuery('')} aria-label="Limpiar"><X size={14} /></button>}
      </div>
      {focus && resultados.length > 0 && (
        <div style={buscador.lista}>
          {resultados.map(c => {
            const meta = ESTADO_META[c.estado] ?? ESTADO_META.NO_OPERATOR
            return (
              <button key={c.id} className="gl-search-item" onMouseDown={() => elegir(c)} style={buscador.item}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={buscador.itemNombre}>{c.nombre}</span>
                  <span style={buscador.itemEmpresa}>{c.empresaNombre ?? 'Sin empresa'}</span>
                </span>
                <MapPin size={14} color={t.textMuted} style={{ flexShrink: 0 }} />
              </button>
            )
          })}
        </div>
      )}
      {focus && q && resultados.length === 0 && (
        <div style={buscador.lista}><div style={buscador.vacio}>Sin resultados para "{query}"</div></div>
      )}
    </div>
  )
}

function MapInner({ centros, onMapClick, onCentroClick }) {
  const [popupCentro, setPopupCentro] = useState(null)
  const [popupPos, setPopupPos]       = useState(null)
  const [zoom, setZoom]               = useState(8)
  const mapRef = useRef(null)
  const size = tamPorZoom(zoom)

  const handleMarkerClick = (e, centro) => {
    L.DomEvent.stopPropagation(e)
    const point = mapRef.current.latLngToContainerPoint([centro.lat, centro.lng])
    setPopupCentro(centro)
    setPopupPos({ x: point.x, y: point.y })
  }
  const handleMapClick = (latlng) => {
    setPopupCentro(null); setPopupPos(null)
    onMapClick && onMapClick(latlng)
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer center={[-45.5, -72.5]} zoom={8} style={{ width: '100%', height: '100%' }} ref={mapRef}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' maxZoom={19} />
        <TileLayer url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png" attribution='&copy; OpenSeaMap' maxZoom={19} />
        <MapEvents onMapClick={handleMapClick} onZoom={setZoom} />
        {centros.map(c => (
          <Marker key={c.id} position={[c.lat, c.lng]} icon={crearIcono(c.estado, size)}
            eventHandlers={{ click: (e) => handleMarkerClick(e, c) }} />
        ))}
      </MapContainer>

      <BuscadorCentros centros={centros} mapRef={mapRef} onSelect={onCentroClick} />
      <Leyenda />
      <StatsPanel centros={centros} />

      {popupCentro && popupPos && (
        <div style={{ position: 'absolute', left: popupPos.x + 16, top: popupPos.y - 30, zIndex: 1000 }}
          onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
          <PopupCentro centro={popupCentro}
            onAbrir={(c) => { setPopupCentro(null); setPopupPos(null); onCentroClick && onCentroClick(c) }}
            onCerrar={() => { setPopupCentro(null); setPopupPos(null) }} />
        </div>
      )}
    </div>
  )
}

export default function MapView({ centros = [], onMapClick, onCentroClick }) {
  return <MapInner centros={centros} onMapClick={onMapClick} onCentroClick={onCentroClick} />
}

const buscador = {
  box:        { position: 'absolute', top: 12, left: 52, zIndex: 600, width: 250, maxWidth: 'calc(100% - 76px)' },
  inputRow:   { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gl-bg-surface)', border: '1px solid var(--gl-border)', borderRadius: 'var(--gl-radius-md)', padding: '8px 11px', boxShadow: 'var(--gl-shadow-md)' },
  input:      { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--gl-text-primary)', fontSize: 'var(--gl-text-sm)', minWidth: 0 },
  lista:      { marginTop: 6, background: 'var(--gl-bg-surface)', border: '1px solid var(--gl-border)', borderRadius: 'var(--gl-radius-md)', boxShadow: 'var(--gl-shadow-md)', overflow: 'hidden' },
  item:       { display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '9px 12px' },
  itemNombre: { display: 'block', fontSize: 'var(--gl-text-sm)', fontWeight: 600, color: 'var(--gl-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  itemEmpresa:{ display: 'block', fontSize: 10, color: 'var(--gl-text-muted)' },
  vacio:      { padding: '11px 12px', fontSize: 'var(--gl-text-sm)', color: 'var(--gl-text-muted)' },
}

const leyenda = {
  box:    { position: 'absolute', top: 12, right: 12, zIndex: 600, background: 'var(--gl-bg-surface)', border: '1px solid var(--gl-border)', borderRadius: 'var(--gl-radius-lg)', padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: 6, boxShadow: 'var(--gl-shadow-md)' },
  titulo: { fontSize: 9, color: 'var(--gl-text-muted)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 2 },
  fila:   { display: 'flex', alignItems: 'center', gap: 8 },
  punto:  { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 },
  label:  { fontSize: 11, color: 'var(--gl-text-secondary)' },
}
const stats = {
  box:   { position: 'absolute', bottom: 14, left: 14, zIndex: 600, background: 'var(--gl-bg-surface)', border: '1px solid var(--gl-border)', borderRadius: 'var(--gl-radius-lg)', padding: '10px 6px 10px 14px', display: 'flex', gap: 0, boxShadow: 'var(--gl-shadow-md)' },
  item:  { display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' },
  punto: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  num:   { fontSize: 17, fontWeight: 600, color: 'var(--gl-text-primary)', lineHeight: 1 },
  label: { fontSize: 9, color: 'var(--gl-text-muted)', marginTop: 1 },
}
