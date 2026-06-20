import { MessageCircle } from 'lucide-react'

// Actualiza este número con el WhatsApp de HyperionX
const WA_NUMBER = '56949912635'
const WA_MSG    = encodeURIComponent('Hola, me interesa conocer RovSystem by HyperionX. ¿Podríamos agendar una demo?')

export default function CTAFloat() {
  return (
    <a
      href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
      target="_blank"
      rel="noopener noreferrer"
      style={s.btn}
      title="Solicitar demo real"
    >
      <MessageCircle size={18} fill="white" />
      <span style={s.label}>Solicitar demo real</span>
    </a>
  )
}

const s = {
  btn:   { position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#25d366', borderRadius: 50, color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: '0 4px 20px rgba(37,211,102,0.4)', border: 'none', transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'pointer' },
  label: { whiteSpace: 'nowrap' },
}
