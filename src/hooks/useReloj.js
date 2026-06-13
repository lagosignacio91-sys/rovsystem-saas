import { useState, useEffect } from 'react'

export function useReloj() {
  const [hora, setHora] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setHora(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return {
    hora,
    horaStr:  hora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    fechaStr: hora.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' }),
  }
}
