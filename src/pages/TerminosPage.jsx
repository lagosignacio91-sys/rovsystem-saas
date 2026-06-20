import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, FileText } from 'lucide-react'
import { t } from '../theme/tokens'

const VERSION = '1.0'

export default function TerminosPage({ onAceptar }) {
  const navigate  = useNavigate()
  const [cargando, setCargando] = useState(false)
  const [scrollado, setScrollado] = useState(false)

  const handleScroll = (e) => {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) setScrollado(true)
  }

  const handleAceptar = async () => {
    setCargando(true)
    await onAceptar(VERSION)
    navigate('/', { replace: true })
  }

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <div style={s.header}>
          <FileText size={22} color={t.brand} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h1 style={s.titulo}>Términos y Condiciones de Uso</h1>
            <p style={s.subtitulo}>RovSystem · Versión {VERSION} · Junio 2026</p>
          </div>
        </div>

        <div style={s.scroll} onScroll={handleScroll}>
          <Terminos />
        </div>

        {!scrollado && (
          <p style={s.hint}>↓ Desplázate hacia abajo para leer los términos completos</p>
        )}

        <button
          onClick={handleAceptar}
          disabled={!scrollado || cargando}
          className="gl-btn gl-btn--primary gl-btn--lg"
          style={{ marginTop: 16, opacity: scrollado ? 1 : 0.4, transition: 'opacity 0.3s' }}
        >
          {cargando
            ? 'Guardando...'
            : <><CheckCircle2 size={16} style={{ marginRight: 8 }} />Acepto los Términos y Condiciones</>
          }
        </button>

        <p style={s.pie}>
          Al aceptar, también confirmas haber leído nuestra{' '}
          <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={s.link}>
            Política de Privacidad
          </a>.
        </p>
      </div>
    </div>
  )
}

function Bloque({ titulo, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13, margin: '0 0 5px' }}>{titulo}</p>
      <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.75 }}>{children}</div>
    </div>
  )
}

function Terminos() {
  return (
    <div style={{ padding: '4px 2px' }}>
      <Bloque titulo="1. Identificación del Proveedor">
        <p>RovSystem es un sistema de software SaaS desarrollado y operado por <strong style={{ color: '#e2e8f0' }}>HyperionX</strong> (en proceso de constitución como sociedad en Chile). Contacto: <a href="mailto:soporte@hyperionx.tech" style={{ color: t.brand }}>soporte@hyperionx.tech</a></p>
      </Bloque>

      <Bloque titulo="2. Objeto">
        <p>Estos Términos regulan el acceso y uso del sistema RovSystem, incluyendo sus módulos de gestión de centros acuícolas, despachos, operadores, bitácoras y reportes operacionales.</p>
      </Bloque>

      <Bloque titulo="3. Licencia de Uso">
        <p>HyperionX otorga al cliente una licencia de uso limitada, no exclusiva, no transferible y revocable para acceder al sistema durante la vigencia del contrato de servicio entre las partes.</p>
      </Bloque>

      <Bloque titulo="4. Uso Permitido y Prohibido">
        <p>El sistema debe usarse exclusivamente para la gestión operacional del cliente. Queda prohibido:</p>
        <ul style={{ paddingLeft: 20, margin: '6px 0 0' }}>
          <li>Ceder o compartir credenciales con terceros no autorizados</li>
          <li>Intentar acceder a datos de otras organizaciones</li>
          <li>Realizar ingeniería inversa o modificar el software</li>
          <li>Usar el sistema para actividades ilícitas</li>
        </ul>
      </Bloque>

      <Bloque titulo="5. Propiedad Intelectual">
        <p>El sistema RovSystem, su código fuente, diseño, marca y logotipos son propiedad exclusiva de HyperionX. El cliente no adquiere ningún derecho de propiedad sobre el software. Cualquier mejora desarrollada por HyperionX, aun cuando sea solicitada por el cliente, pertenece a HyperionX.</p>
      </Bloque>

      <Bloque titulo="6. Datos del Cliente">
        <p>Los datos operacionales ingresados por el cliente son propiedad del cliente. HyperionX los almacena y procesa exclusivamente para prestar el servicio y no los cede a terceros, salvo obligación legal.</p>
      </Bloque>

      <Bloque titulo="7. Disponibilidad del Servicio">
        <p>HyperionX realiza esfuerzos razonables para mantener el servicio disponible. No se garantiza disponibilidad ininterrumpida. Las mantenciones programadas se informarán con anticipación. HyperionX no responde por interrupciones causadas por fuerza mayor o fallas de proveedores de infraestructura.</p>
      </Bloque>

      <Bloque titulo="8. Suspensión">
        <p>HyperionX puede suspender el acceso ante: (a) falta de pago; (b) uso indebido del sistema. Se procurará avisar con anticipación cuando sea posible.</p>
      </Bloque>

      <Bloque titulo="9. Limitación de Responsabilidad">
        <p>HyperionX no será responsable por daños indirectos, pérdida de datos o lucro cesante. La responsabilidad máxima se limita al monto pagado por el cliente en el mes en que ocurra el daño.</p>
      </Bloque>

      <Bloque titulo="10. Modificaciones">
        <p>HyperionX puede modificar estos Términos con un aviso mínimo de 30 días por correo electrónico o aviso dentro de la aplicación. El uso continuado implica aceptación.</p>
      </Bloque>

      <Bloque titulo="11. Privacidad">
        <p>El tratamiento de datos personales se rige por nuestra <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: t.brand }}>Política de Privacidad</a> y por la Ley N° 19.628 sobre Protección de la Vida Privada.</p>
      </Bloque>

      <Bloque titulo="12. Ley Aplicable">
        <p>Estos Términos se rigen por la legislación de la República de Chile. Cualquier disputa se somete a la jurisdicción de los Tribunales de Justicia de Santiago, Chile.</p>
      </Bloque>
    </div>
  )
}

const s = {
  wrapper: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px 16px', background: t.bgBase,
  },
  card: {
    width: '100%', maxWidth: 660, background: t.bgElevated,
    border: `1px solid ${t.border}`, borderRadius: t.radiusXl,
    padding: '28px 32px', display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20,
    paddingBottom: 16, borderBottom: `1px solid ${t.border}`,
  },
  titulo:   { color: t.textPrimary, fontSize: 17, fontWeight: 700, margin: '0 0 3px' },
  subtitulo:{ color: t.textMuted, fontSize: t.textXs, margin: 0 },
  scroll:   { maxHeight: '48vh', overflowY: 'auto', paddingRight: 4 },
  hint:     { color: t.textMuted, fontSize: t.textXs, textAlign: 'center', margin: '10px 0 0', fontStyle: 'italic' },
  pie:      { color: t.textMuted, fontSize: t.textXs, textAlign: 'center', margin: '12px 0 0' },
  link:     { color: t.brand, textDecoration: 'underline' },
}
