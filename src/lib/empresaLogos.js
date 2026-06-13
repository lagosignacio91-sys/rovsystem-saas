// Mapea el nombre de una empresa (de Firestore) a su archivo de logo en /public/empresas.
// Coincidencia flexible: ignora mayúsculas, acentos y espacios.
const LOGOS = [
  { match: ['aqua'],                   src: '/empresas/aquachile.png',  alt: 'AquaChile' },
  { match: ['blumar', 'biomar'],       src: '/empresas/blumar.png',     alt: 'Blumar' },
  { match: ['cermaq'],                 src: '/empresas/cermaq.png',     alt: 'Cermaq' },
  { match: ['marine', 'granja', 'farm'], src: '/empresas/marinefarm.png', alt: 'Marine Farm' },
]

function normalizar(s = '') {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function logoEmpresa(nombre) {
  const n = normalizar(nombre)
  return LOGOS.find(l => l.match.some(m => n.includes(m))) ?? null
}
