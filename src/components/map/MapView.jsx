import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { useState, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import PopupCentro from './PopupCentro'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STATUS_COLORS = {
  OK:              '#22c55e',
  LOW_STOCK:       '#eab308',
  EQUIPMENT_FAULT: '#ef4444',
  DISPATCH_ONWAY:  '#3b82f6',
  NO_OPERATOR:     '#6b7280',
}

function crearIcono(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;background:${color};border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.6);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) { if (onMapClick) onMapClick(e.latlng) }
  })
  return null
}

function MapInner({ centros, onMapClick, onCentroClick }) {
  const [popupCentro, setPopupCentro] = useState(null)
  const [popupPos, setPopupPos]       = useState(null)
  const mapRef = useRef(null)

  const handleMarkerClick = (e, centro) => {
    L.DomEvent.stopPropagation(e)
    const point = mapRef.current.latLngToContainerPoint([centro.lat, centro.lng])
    setPopupCentro(centro)
    setPopupPos({ x: point.x, y: point.y })
  }

  const handleMapClick = (latlng) => {
    setPopupCentro(null)
    setPopupPos(null)
    onMapClick && onMapClick(latlng)
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={[-45.5, -72.5]}
        zoom={8}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' maxZoom={19} />
        <TileLayer url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png" attribution='&copy; OpenSeaMap' maxZoom={19} />
        <ClickHandler onMapClick={handleMapClick} />

        {centros.map(c => (
          <Marker
            key={c.id}
            position={[c.lat, c.lng]}
            icon={crearIcono(STATUS_COLORS[c.estado] ?? '#6b7280')}
            eventHandlers={{
              click: (e) => handleMarkerClick(e, c)
            }}
          />
        ))}
      </MapContainer>

      {popupCentro && popupPos && (
        <div
          style={{
            position: 'absolute',
            left: popupPos.x + 14,
            top:  popupPos.y - 30,
            zIndex: 1000,
            pointerEvents: 'auto',
          }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <PopupCentro
            centro={popupCentro}
            onAbrir={(c) => { setPopupCentro(null); setPopupPos(null); onCentroClick && onCentroClick(c) }}
            onCerrar={() => { setPopupCentro(null); setPopupPos(null) }}
          />
        </div>
      )}
    </div>
  )
}

export default function MapView({ centros = [], onMapClick, onCentroClick }) {
  return <MapInner centros={centros} onMapClick={onMapClick} onCentroClick={onCentroClick} />
}