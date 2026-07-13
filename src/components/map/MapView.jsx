import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { useState, useRef, useCallback, useEffect, memo } from 'react'
import { Search, X, MapPin, Maximize2 } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
// Iconos del marcador servidos desde el propio bundle (Vite los emite con hash),
// no desde el CDN unpkg: evita depender de una red externa en producción.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import PopupCentro from './PopupCentro'
import PopupCentroContactos from './PopupCentroContactos'
import { t, ESTADO_META } from '../../theme/tokens'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
})

// SVG paths (lucide) por estado para incrustar en el marcador
const SVG = {
  OK:              '<path d="M20 6 9 17l-5-5"/>',
  LOW_STOCK:       '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  EQUIPMENT_FAULT: '<path d="M12 16h.01"/><path d="M12 8v4"/><path d="M15.3 2H8.7L2 8.7v6.6L8.7 22h6.6L22 15.3V8.7z"/>',
  DISPATCH_ONWAY:  '<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  NO_OPERATOR:     '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4"/><line x1="17" y1="8" x2="22" y2="13"/><line x1="22" y1="8" x2="17" y2="13"/>',
}

const ESTADOS_ORDEN = ['OK', 'EQUIPMENT_FAULT', 'DISPATCH_ONWAY', 'NO_OPERATOR']

// El tamaño del marcador escala con el zoom: lejos = pequeño, cerca = grande.
function tamPorZoom(zoom) {
  return Math.round(Math.max(16, Math.min(34, (zoom - 3) * 3)))
}

function crearIcono(estado, size = 26, tieneFaltante = false) {
  const meta  = ESTADO_META[estado] ?? ESTADO_META.NO_OPERATOR
  const color = meta.dot
  const alerta = estado === 'EQUIPMENT_FAULT'
  const grande = size >= 22
  const borde  = Math.max(1.5, size * 0.085).toFixed(1)
  // Halo de estado siempre presente (instrumento); pulso solo en alertas grandes.
  const glow   = `0 0 ${Math.round(size * 0.55)}px ${color}99, 0 0 0 1px ${color}55, 0 2px 6px rgba(0,0,0,0.55)`
  const pulso  = (alerta && grande) ? `animation:markerPulse 2s ease-out infinite;` : ''
  const iconHtml = grande
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(size * 0.5)}" height="${Math.round(size * 0.5)}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${SVG[estado] ?? SVG.NO_OPERATOR}</svg>`
    : ''
  // Badge independiente del color base: marca "tiene faltantes" aunque otro estado
  // (NO_OPERATOR/EQUIPMENT_FAULT) tenga prioridad visual sobre el color principal.
  const faltanteSize = Math.max(8, Math.round(size * 0.4))
  const overlay = tieneFaltante
    ? `<span style="position:absolute;top:-2px;right:-2px;width:${faltanteSize}px;height:${faltanteSize}px;background:var(--gl-low, #eab308);border:1.5px solid #fff;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.5);"></span>`
    : ''
  // Anillo exterior fino + núcleo de color = lectura "instrumentada" a distancia.
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;border-radius:50%;color:${color};box-shadow:${glow};${pulso}">
      <div style="width:${size}px;height:${size}px;background:${color};border:${borde}px solid rgba(255,255,255,0.92);border-radius:50%;display:flex;align-items:center;justify-content:center;">${iconHtml}</div>
      ${overlay}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// Icono azul neutro para centros que no pertenecen al team del operador
function crearIconoAzul(size = 26) {
  const borde = Math.max(1.5, size * 0.085).toFixed(1)
  const c = '#3b82f6'
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${c};border:${borde}px solid rgba(255,255,255,0.9);border-radius:50%;box-shadow:0 0 ${Math.round(size*0.4)}px ${c}88, 0 2px 6px rgba(0,0,0,0.45)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// Ajusta vista para mostrar todos los centros
function fitBoundsCentros(map, centros) {
  if (!centros.length) { map.setView([-45.5, -72.5], 8); return }
  const bounds = L.latLngBounds(centros.filter(c => c.lat && c.lng).map(c => [c.lat, c.lng]))
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 })
}

// Se dispara una sola vez cuando los centros cargan (pueden llegar async desde Firebase)
function FitOnMount({ centros }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (!done.current && centros.length > 0) {
      done.current = true
      fitBoundsCentros(map, centros)
    }
  }, [centros, map])
  return null
}

// Botón que ajusta la vista para mostrar todos los centros
function FitCentros({ centros }) {
  const map = useMap()
  const fit = useCallback(() => fitBoundsCentros(map, centros), [map, centros])

  return (
    <div className="leaflet-top leaflet-left" style={{ marginTop: 80 }}>
      <div className="leaflet-control leaflet-bar">
        <button onClick={fit} title="Ver todos los centros" aria-label="Ver todos los centros" className="gl-map-fit-btn">
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  )
}

function MapEvents({ onMapClick, onZoom, onMouseMove }) {
  useMapEvents({
    click(e)    { if (onMapClick)   onMapClick(e.latlng) },
    zoomend(e)  { if (onZoom)       onZoom(e.target.getZoom()) },
    mousemove(e){ if (onMouseMove)  onMouseMove(e.latlng) },
  })
  return null
}

function Leyenda() {
  const [open, setOpen] = useState(false)
  return (
    <div style={leyenda.wrap}>
      {open && (
        <div className="gl-glass" style={leyenda.box}>
          {ESTADOS_ORDEN.map(e => (
            <div key={e} style={leyenda.fila}>
              <span style={{ ...leyenda.punto, background: ESTADO_META[e].dot }} />
              <span style={leyenda.label}>{ESTADO_META[e].label}</span>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(v => !v)}
        title="Leyenda"
        className="gl-glass"
        style={leyenda.btn}
        aria-label="Mostrar leyenda"
      >
        {ESTADOS_ORDEN.map(e => (
          <span key={e} style={{ width: 7, height: 7, borderRadius: '50%', background: ESTADO_META[e].dot, flexShrink: 0 }} />
        ))}
      </button>
    </div>
  )
}

function StatsPanel({ centros }) {
  const conteo = ESTADOS_ORDEN.map(e => ({ e, n: centros.filter(c => c.estado === e).length })).filter(x => x.n > 0)
  if (conteo.length === 0) return null
  return (
    <div className="gl-glass" style={stats.box}>
      {conteo.map(({ e, n }, i) => (
        <div key={e} style={{ ...stats.item, borderRight: i < conteo.length - 1 ? '1px solid var(--gl-glass-border)' : 'none' }}>
          <span style={{ ...stats.punto, background: ESTADO_META[e].dot, boxShadow: `0 0 7px ${ESTADO_META[e].dot}` }} />
          <div>
            <div className="gl-mono" style={stats.num}>{n}</div>
            <div className="gl-label" style={stats.label}>{ESTADO_META[e].label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Detecta si el texto parece coordenadas (decimal, DMS o con hemisferio)
function detectarCoordenadas(texto) {
  const s = texto.trim()
  if (!s || s.length < 3) return false
  if (/[°º]/.test(s)) return true
  if (/[NSEWnsew]/.test(s)) return true
  return /^[+-]?\d+\.?\d*\s*[,;]\s*[+-]?\d+\.?\d*/.test(s)
}

// Icono tipo chincheta/pin para el punto de coordenadas ingresado
function crearIconoChincheta() {
  const c = '#22d3ee'
  return L.divIcon({
    className: '',
    html: `<div style="filter:drop-shadow(0 3px 10px ${c}cc);width:28px;height:36px">
      <svg viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg" width="28" height="36">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.27 21.73 0 14 0z" fill="${c}" stroke="rgba(255,255,255,0.9)" stroke-width="1.5"/>
        <circle cx="14" cy="14" r="5" fill="rgba(0,0,0,0.22)"/>
        <line x1="14" y1="9" x2="14" y2="19" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <line x1="9" y1="14" x2="19" y2="14" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>`,
    iconSize:    [28, 36],
    iconAnchor:  [14, 36],
    popupAnchor: [0, -36],
  })
}

function BuscadorUnificado({ centros, mapRef, onSelect, onCoordsPin, role, mouseCoords }) {
  const [query, setQuery]       = useState('')
  const [focus, setFocus]       = useState(false)
  const [coordError, setCoordError] = useState('')

  const esCoord = detectarCoordenadas(query)
  const q       = query.trim().toLowerCase()

  const resultadosCentros = q && !esCoord
    ? centros.filter(c =>
        c.nombre?.toLowerCase().includes(q) ||
        c.empresaNombre?.toLowerCase().includes(q) ||
        (c.teamAsignado ?? '').toLowerCase().includes(q)
      ).slice(0, 7)
    : []

  const showDropdown = focus && (esCoord || resultadosCentros.length > 0 || (q && !esCoord && resultadosCentros.length === 0))

  const coordsFromQuery = () => {
    const partes = splitCoordenadas(query)
    if (partes.length < 2) return null
    const lat = parsearCoordenada(partes[0])
    const lng = parsearCoordenada(partes[1])
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
    return { lat, lng }
  }

  const coordsParsed = esCoord ? coordsFromQuery() : null

  const irACoords = () => {
    setCoordError('')
    const c = coordsParsed
    if (!c) { setCoordError('Formato no reconocido'); return }
    if (mapRef.current) mapRef.current.flyTo([c.lat, c.lng], 14, { duration: 1.2 })
    onCoordsPin && onCoordsPin(c)
    setQuery(''); setFocus(false)
  }

  const elegir = (c) => {
    if (mapRef.current && typeof c.lat === 'number' && typeof c.lng === 'number') {
      mapRef.current.flyTo([c.lat, c.lng], 13, { duration: 1.1 })
    }
    setQuery(''); setFocus(false)
    onSelect && onSelect(c)
  }

  const limpiar = () => { setQuery(''); setCoordError('') }

  return (
    <div style={buscador.box}>
      <div className="gl-glass" style={buscador.inputRow}>
        <Search size={16} color={t.accent} style={{ flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setCoordError('') }}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 180)}
          onKeyDown={e => {
            if (e.key === 'Enter') { esCoord ? irACoords() : resultadosCentros[0] && elegir(resultadosCentros[0]) }
            if (e.key === 'Escape') limpiar()
          }}
          placeholder=""
          aria-label={role === 'admin' ? 'Buscar centro o ingresar coordenadas' : 'Buscar centro'}
          style={buscador.input}
        />
        {query && (
          <button className="gl-icon-btn" style={{ padding: 2 }} onMouseDown={limpiar} aria-label="Limpiar"><X size={14} /></button>
        )}
      </div>

      {/* Coords del cursor en tiempo real (solo admin, solo cuando no hay texto) */}
      {!query && mouseCoords && role === 'admin' && (
        <div className="gl-mono" style={buscador.hintCoords}>
          {mouseCoords.lat.toFixed(5)}, {mouseCoords.lng.toFixed(5)}
        </div>
      )}

      {showDropdown && (
        <div className="gl-glass" style={buscador.lista}>
          {/* Opción ir a coordenadas */}
          {esCoord && role === 'admin' && (
            <button className="gl-search-item" onMouseDown={irACoords} style={buscador.item}>
              <MapPin size={14} color={t.accent} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ ...buscador.itemNombre, color: t.accent }}>
                  {coordsParsed
                    ? `Ir a ${coordsParsed.lat.toFixed(5)}, ${coordsParsed.lng.toFixed(5)}`
                    : 'Ir a coordenadas'}
                </span>
                <span style={buscador.itemEmpresa}>Aparece un pin · haz clic en él para agregar un centro</span>
              </span>
            </button>
          )}
          {coordError && <div style={{ ...buscador.vacio, color: 'var(--gl-fault)' }}>{coordError}</div>}

          {/* Resultados de centros */}
          {resultadosCentros.map(c => {
            const meta = ESTADO_META[c.estado] ?? ESTADO_META.NO_OPERATOR
            const teamLabel = c.teamAsignado
              ? 'Team ' + c.teamAsignado.replace(/\D/g, '')
              : null
            return (
              <button key={c.id} className="gl-search-item" onMouseDown={() => elegir(c)} style={buscador.item}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot, flexShrink: 0, boxShadow: `0 0 6px ${meta.dot}` }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={buscador.itemNombre}>{c.nombre}</span>
                  <span style={buscador.itemEmpresa}>
                    {c.empresaNombre ?? 'Sin empresa'}{teamLabel ? ` · ${teamLabel}` : ''}
                  </span>
                </span>
                <MapPin size={13} color={t.textMuted} style={{ flexShrink: 0 }} />
              </button>
            )
          })}

          {q && !esCoord && resultadosCentros.length === 0 && (
            <div style={buscador.vacio}>Sin resultados para "{query}"</div>
          )}
        </div>
      )}
    </div>
  )
}

// Parsea un token de coordenada en cualquier formato:
//   Decimal:  -45.1234  |  45.1234S
//   DMS:      45°07'24.4"S  |  45° 7' 24" S  |  45 7 24 S
function parsearCoordenada(token) {
  const s = token.trim()
  // DMS con símbolos: 45°07'24.4"S  o  45°7'24"  o  45 7 24.4S
  const dms = s.match(/^(\d+)[°º\s]\s*(\d+)[''′\s]\s*([\d.]+)["""″\s]?\s*([NSEWnsew])?$/)
  if (dms) {
    const val = parseFloat(dms[1]) + parseFloat(dms[2]) / 60 + parseFloat(dms[3]) / 3600
    const h = (dms[4] || '').toUpperCase()
    return (h === 'S' || h === 'W') ? -val : val
  }
  // Decimal con o sin hemisferio: -45.1234 | 45.1234S | 45,1234S (coma decimal)
  const dec = s.replace(',', '.').match(/^([+-]?[\d.]+)\s*([NSEWnsew])?$/)
  if (dec) {
    const val = Math.abs(parseFloat(dec[1]))
    const h = (dec[2] || '').toUpperCase()
    const neg = parseFloat(dec[1]) < 0 || h === 'S' || h === 'W'
    return neg ? -val : val
  }
  return NaN
}

// Divide el texto en dos tokens (lat, lng) tolerando coma, punto y coma,
// o el límite natural N/S → E/W en formato DMS sin coma.
function splitCoordenadas(texto) {
  // Si hay coma o punto y coma: split ahí
  if (/[,;]/.test(texto)) return texto.split(/[,;]/).map(s => s.trim())
  // DMS sin coma: "45°07'24"S 72°34'04"W" — dividir después del primer hemisferio N/S
  const dmsMatch = texto.match(/^(.+?[NSns])\s+(.+)$/)
  if (dmsMatch) return [dmsMatch[1].trim(), dmsMatch[2].trim()]
  // Fallback: primer y segundo token separados por espacio
  const partes = texto.trim().split(/\s+/)
  return partes.length >= 2 ? [partes[0], partes.slice(1).join(' ')] : []
}


function MapInner({ centros, onMapClick, onCentroClick, role, userTeamId, centrosConFaltantes }) {
  const [popupCentro, setPopupCentro] = useState(null)
  const [popupPos, setPopupPos]       = useState(null)
  const [popupTipo, setPopupTipo]     = useState('propio') // 'propio' | 'ajeno'
  const [mouseCoords, setMouseCoords] = useState(null)
  const [zoom, setZoom]               = useState(8)
  const [coordPin, setCoordPin]       = useState(null) // { lat, lng } pin temporal de coordenadas
  const mapRef = useRef(null)
  const size = tamPorZoom(zoom)

  const esAjeno = (centro) =>
    role === 'operador' && centro.teamAsignado !== userTeamId

  const handleMarkerClick = (e, centro) => {
    L.DomEvent.stopPropagation(e)
    const point = mapRef.current.latLngToContainerPoint([centro.lat, centro.lng])
    setPopupCentro(centro)
    setPopupPos({ x: point.x, y: point.y })
    // El operador siempre ve el popup de contacto (en faena), incluso en su propio centro,
    // ya que el panel completo de su centro queda fijo a la derecha (ver MapaPage).
    setPopupTipo(role === 'operador' ? 'ajeno' : 'propio')
  }
  const handleMapClick = (latlng) => {
    setPopupCentro(null); setPopupPos(null)
    setCoordPin(null)
    onMapClick && onMapClick(latlng)
  }
  const cerrarPopup = () => { setPopupCentro(null); setPopupPos(null) }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer center={[-45.5, -72.5]} zoom={8} style={{ width: '100%', height: '100%' }} ref={mapRef}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' maxZoom={19} />
        <TileLayer url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png" attribution='&copy; OpenSeaMap' maxZoom={19} />
        <MapEvents onMapClick={handleMapClick} onZoom={setZoom} onMouseMove={role === 'admin' ? setMouseCoords : null} />
        <FitOnMount centros={centros} />
        <FitCentros centros={centros} />
        {centros.map(c => (
          <Marker key={c.id} position={[c.lat, c.lng]}
            icon={esAjeno(c) ? crearIconoAzul(size) : crearIcono(c.estado, size, centrosConFaltantes?.has(c.id))}
            eventHandlers={{ click: (e) => handleMarkerClick(e, c) }} />
        ))}
        {/* Pin temporal de coordenadas: clic para agregar centro ahí exactamente */}
        {coordPin && role === 'admin' && (
          <Marker
            position={[coordPin.lat, coordPin.lng]}
            icon={crearIconoChincheta()}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e)
                const ll = { lat: coordPin.lat, lng: coordPin.lng }
                setCoordPin(null)
                onMapClick && onMapClick(ll)
              }
            }}
          />
        )}
      </MapContainer>

      <BuscadorUnificado
        centros={centros}
        mapRef={mapRef}
        mouseCoords={mouseCoords}
        role={role}
        onCoordsPin={setCoordPin}
        onSelect={(c) => {
          if (role === 'operador') {
            const point = mapRef.current?.latLngToContainerPoint([c.lat, c.lng])
            if (point) { setPopupCentro(c); setPopupPos({ x: point.x, y: point.y }); setPopupTipo('ajeno') }
            return
          }
          onCentroClick && onCentroClick(c)
        }}
      />
      <Leyenda />
      {role !== 'operador' && <StatsPanel centros={centros} />}

      {popupCentro && popupPos && popupTipo === 'propio' && (
        <div style={{ position: 'absolute', left: Math.min(Math.max(8, popupPos.x + 16), window.innerWidth - 240), top: Math.max(8, popupPos.y - 30), zIndex: 1000 }}
          onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
          <PopupCentro centro={popupCentro} centrosConFaltantes={centrosConFaltantes}
            onAbrir={(c) => { cerrarPopup(); onCentroClick && onCentroClick(c) }}
            onCerrar={cerrarPopup} />
        </div>
      )}

      {popupCentro && popupPos && popupTipo === 'ajeno' && (
        <div style={{ position: 'absolute', left: Math.min(Math.max(8, popupPos.x + 16), window.innerWidth - 240), top: Math.max(8, popupPos.y - 30), zIndex: 1000 }}
          onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
          <PopupCentroContactos centro={popupCentro} onCerrar={cerrarPopup} />
        </div>
      )}
    </div>
  )
}

export default memo(function MapView({ centros = [], onMapClick, onCentroClick, role, userTeamId, centrosConFaltantes }) {
  return <MapInner centros={centros} onMapClick={onMapClick} onCentroClick={onCentroClick} role={role} userTeamId={userTeamId} centrosConFaltantes={centrosConFaltantes} />
})

const buscador = {
  box:        { position: 'absolute', top: 10, left: 48, zIndex: 600, width: 'min(300px, calc(100% - 58px))' },
  inputRow:   { display: 'flex', alignItems: 'center', gap: 8, borderRadius: 'var(--gl-radius-md)', padding: '8px 11px', boxShadow: 'var(--gl-shadow-md)' },
  input:      { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--gl-text-primary)', fontSize: 'var(--gl-text-sm)', minWidth: 0 },
  hintCoords: { fontSize: 10, color: 'var(--gl-text-muted)', padding: '3px 4px', opacity: 0.75, letterSpacing: '-0.01em' },
  lista:      { marginTop: 6, borderRadius: 'var(--gl-radius-md)', boxShadow: 'var(--gl-shadow-md)', overflow: 'hidden' },
  item:       { display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '9px 12px' },
  itemNombre: { display: 'block', fontSize: 'var(--gl-text-sm)', fontWeight: 600, color: 'var(--gl-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  itemEmpresa:{ display: 'block', fontSize: 10, color: 'var(--gl-text-muted)' },
  vacio:      { padding: '11px 12px', fontSize: 'var(--gl-text-sm)', color: 'var(--gl-text-muted)' },
}

const leyenda = {
  wrap:  { position: 'absolute', bottom: 50, right: 12, zIndex: 600, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  box:   { borderRadius: 'var(--gl-radius-md)', padding: '8px 11px', display: 'flex', flexDirection: 'column', gap: 5, boxShadow: 'var(--gl-shadow-md)' },
  fila:  { display: 'flex', alignItems: 'center', gap: 7 },
  punto: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  label: { fontSize: 11, color: 'var(--gl-text-secondary)', whiteSpace: 'nowrap' },
  btn:   { display: 'flex', alignItems: 'center', gap: 4, borderRadius: 'var(--gl-radius-md)', padding: '6px 9px', cursor: 'pointer', boxShadow: 'var(--gl-shadow-sm)' },
}
const stats = {
  box:   { position: 'absolute', bottom: 14, left: 14, zIndex: 600, borderRadius: 'var(--gl-radius-md)', padding: '7px 4px 7px 10px', display: 'flex', gap: 0, boxShadow: 'var(--gl-shadow-md)' },
  item:  { display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px' },
  punto: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  num:   { fontSize: 17, fontWeight: 700, color: 'var(--gl-text-primary)', lineHeight: 1 },
  label: { fontSize: 9, marginTop: 2 },
}

