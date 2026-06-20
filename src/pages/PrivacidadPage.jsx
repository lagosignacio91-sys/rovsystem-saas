import { ArrowLeft, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { t } from '../theme/tokens'

export default function PrivacidadPage() {
  const navigate = useNavigate()

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <div style={s.header}>
          <Shield size={22} color={t.brand} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h1 style={s.titulo}>Política de Privacidad</h1>
            <p style={s.subtitulo}>RovSystem · Versión 1.0 · Junio 2026</p>
          </div>
        </div>

        <div style={s.scroll}>
          <Bloque titulo="1. Responsable del Tratamiento">
            <p><strong style={{ color: '#e2e8f0' }}>HyperionX</strong> (operado por German Mella, en proceso de constitución legal en Chile). Contacto: <a href="mailto:soporte@hyperionx.tech" style={{ color: t.brand }}>soporte@hyperionx.tech</a></p>
          </Bloque>

          <Bloque titulo="2. Datos Personales que Tratamos">
            <p>En el marco del servicio RovSystem, se recopilan y tratan los siguientes datos personales de los operadores y usuarios del sistema:</p>
            <ul style={{ paddingLeft: 20, margin: '6px 0 0' }}>
              <li>Nombre completo</li>
              <li>RUT (Rol Único Tributario)</li>
              <li>Fotografía de perfil</li>
              <li>Correo electrónico</li>
              <li>Número de teléfono</li>
            </ul>
            <p style={{ marginTop: 8 }}>También se registran datos operacionales como registros de turno, despachos y bitácoras, los cuales no constituyen datos personales en sentido estricto.</p>
          </Bloque>

          <Bloque titulo="3. Finalidad del Tratamiento">
            <p>Los datos personales se utilizan exclusivamente para:</p>
            <ul style={{ paddingLeft: 20, margin: '6px 0 0' }}>
              <li>Autenticación y control de acceso al sistema</li>
              <li>Identificación de operadores en registros operacionales</li>
              <li>Gestión de turnos, despachos y bitácoras</li>
              <li>Comunicación operacional dentro de la plataforma</li>
            </ul>
          </Bloque>

          <Bloque titulo="4. Base Legal">
            <p>El tratamiento de datos se realiza en el marco de la <strong style={{ color: '#e2e8f0' }}>Ley N° 19.628</strong> sobre Protección de la Vida Privada de Chile. El consentimiento para el tratamiento de los datos de los operadores es otorgado por la empresa contratante (cliente) al contratar el servicio RovSystem.</p>
          </Bloque>

          <Bloque titulo="5. Roles en el Tratamiento">
            <p>En el contexto de la Ley 19.628:</p>
            <ul style={{ paddingLeft: 20, margin: '6px 0 0' }}>
              <li><strong style={{ color: '#e2e8f0' }}>Responsable (Controller):</strong> La empresa cliente (ej: GL Robótica Submarina), quien decide qué datos de sus operadores ingresar al sistema.</li>
              <li><strong style={{ color: '#e2e8f0' }}>Encargado (Processor):</strong> HyperionX, quien trata los datos por encargo del cliente y siguiendo sus instrucciones.</li>
            </ul>
          </Bloque>

          <Bloque titulo="6. Almacenamiento y Transferencia Internacional">
            <p>Los datos se almacenan en <strong style={{ color: '#e2e8f0' }}>Firebase (Google LLC)</strong>, plataforma con servidores ubicados principalmente en Estados Unidos. Esto constituye una transferencia internacional de datos personales. Google LLC cumple con estándares internacionales de seguridad (ISO 27001, SOC 2 Type II) y el Marco de Privacidad de Datos UE–EEUU.</p>
          </Bloque>

          <Bloque titulo="7. Plazo de Retención">
            <p>Los datos personales se conservan durante toda la vigencia del contrato de servicio entre HyperionX y la empresa cliente, y hasta <strong style={{ color: '#e2e8f0' }}>90 días después de su término</strong>, plazo en que pueden ser eliminados a solicitud expresa del cliente.</p>
          </Bloque>

          <Bloque titulo="8. Medidas de Seguridad">
            <p>Los datos están protegidos mediante:</p>
            <ul style={{ paddingLeft: 20, margin: '6px 0 0' }}>
              <li>Autenticación segura con Firebase Authentication</li>
              <li>Control de acceso por rol (operador, supervisor, administrador)</li>
              <li>Conexión cifrada HTTPS en todas las comunicaciones</li>
              <li>Reglas de seguridad de Firestore que limitan el acceso a los datos propios</li>
              <li>Acceso al panel de administración restringido al equipo de HyperionX</li>
            </ul>
          </Bloque>

          <Bloque titulo="9. Derechos del Titular (ARCO)">
            <p>Los titulares de los datos personales (operadores) tienen los siguientes derechos, conforme a la Ley 19.628:</p>
            <ul style={{ paddingLeft: 20, margin: '6px 0 0' }}>
              <li><strong style={{ color: '#e2e8f0' }}>Acceso:</strong> Solicitar información sobre sus datos almacenados</li>
              <li><strong style={{ color: '#e2e8f0' }}>Rectificación:</strong> Corregir datos incorrectos o desactualizados</li>
              <li><strong style={{ color: '#e2e8f0' }}>Cancelación:</strong> Solicitar la eliminación de sus datos</li>
              <li><strong style={{ color: '#e2e8f0' }}>Oposición:</strong> Oponerse al tratamiento en casos justificados</li>
            </ul>
            <p style={{ marginTop: 8 }}>Para ejercer estos derechos, contactar a: <a href="mailto:soporte@hyperionx.tech" style={{ color: t.brand }}>soporte@hyperionx.tech</a>. Se responderá en un plazo máximo de 15 días hábiles.</p>
          </Bloque>

          <Bloque titulo="10. Cookies y Almacenamiento Local">
            <p>RovSystem utiliza almacenamiento local del navegador (localStorage) exclusivamente para mantener la sesión activa del usuario. No se utilizan cookies de seguimiento ni publicidad.</p>
          </Bloque>

          <Bloque titulo="11. Cambios a esta Política">
            <p>HyperionX puede actualizar esta Política de Privacidad. Cualquier cambio relevante será comunicado con al menos 30 días de anticipación por correo electrónico o aviso dentro de la aplicación.</p>
          </Bloque>

          <Bloque titulo="12. Contacto">
            <p>Para consultas sobre privacidad o ejercicio de derechos ARCO:<br />
            <a href="mailto:soporte@hyperionx.tech" style={{ color: t.brand }}>soporte@hyperionx.tech</a><br />
            HyperionX — Santiago, Chile</p>
          </Bloque>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="gl-btn gl-btn--ghost"
          style={{ marginTop: 20, alignSelf: 'flex-start' }}
        >
          <ArrowLeft size={15} style={{ marginRight: 6 }} /> Volver
        </button>
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
  titulo:    { color: t.textPrimary, fontSize: 17, fontWeight: 700, margin: '0 0 3px' },
  subtitulo: { color: t.textMuted, fontSize: t.textXs, margin: 0 },
  scroll:    { maxHeight: '65vh', overflowY: 'auto', paddingRight: 4 },
}
