// ============================================================
// Contexto y hook de configuración global de la app.
//
// El componente que provee este contexto (AppConfigProvider) vive en
// ./AppConfigProvider; mantener aquí solo el contexto y el hook evita mezclar
// componente y no-componente en un mismo archivo (Fast Refresh).
// ============================================================
import { createContext, useContext } from 'react'

export const AppConfigContext = createContext(null)

export function useAppConfig() {
  const ctx = useContext(AppConfigContext)
  if (!ctx) throw new Error('useAppConfig debe usarse dentro de <AppConfigProvider>')
  return ctx
}
