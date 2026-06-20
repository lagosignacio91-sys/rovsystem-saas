import { useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { CENTROS, ESTADO_META } from '../data/centros'

export default function MapaDemo() {
  const [selected, setSelected] = useState(null)

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <MapContainer
        center={[-44.8, -72.9]}
        zoom={8}
        style={{ height: '100%', width: '100%', background: '#0a1422' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {CENTROS.map(centro => {
          const m = ESTADO_META[centro.estado]
          return (
            <CircleMarker
              key={centro.id}
              center={[centro.lat, centro.lng]}
              radius={10}
              pathOptions={{
                color: m.dot,
                fillColor: m.dot,
                fillOpacity: 0.85,
                weight: 2,
              }}
              eventHandlers={{ click: () => setSelected(centro) }}
            >
              <Popup>
                <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    {centro.empresa} · {centro.nombre}
                  </div>
                  <div style={{ fontSize: 11, color: m.dot, fontWeight: 600, marginBottom: 6 }}>
                    ● {m.label}
                  </div>
                  {centro.operador
                    ? <div style={{ fontSize: 11 }}>👤 {centro.operador.nombre}</div>
                    : <div style={{ fontSize: 11, color: '#888' }}>Sin operador</div>
                  }
                  <div style={{ fontSize: 11, marginTop: 4, color: '#888' }}>
                    ROV: {centro.equipos.rov}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {/* Leyenda */}
      <div style={s.leyenda}>
        {Object.entries(ESTADO_META).map(([key, m]) => (
          <div key={key} style={s.leyendaFila}>
            <span style={{ ...s.leyendaDot, background: m.dot }} />
            <span style={s.leyendaLabel}>{m.label}</span>
            <span style={s.leyendaCount}>
              {CENTROS.filter(c => c.estado === key).length}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const s = {
  leyenda:      { position: 'absolute', bottom: 32, left: 16, zIndex: 1000, background: 'rgba(10,20,34,0.88)', border: '1px solid #1a3050', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, backdropFilter: 'blur(8px)' },
  leyendaFila:  { display: 'flex', alignItems: 'center', gap: 8 },
  leyendaDot:   { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 },
  leyendaLabel: { fontSize: 11, color: '#a3b6d1', flex: 1 },
  leyendaCount: { fontSize: 11, fontWeight: 700, color: '#f3f7fc' },
}
