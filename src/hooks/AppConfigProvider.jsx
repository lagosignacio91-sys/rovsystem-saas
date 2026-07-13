// ============================================================
// AppConfigProvider — configuración global de la app, editable por admin.
//
// Lee config/app (Firestore) en vivo, lo combina con los defaults de
// código y lo expone a toda la app. Guardar usa setDoc merge, restringido
// a admin por firestore.rules.
//
// El hook de consumo (useAppConfig) y el contexto viven en ./useAppConfig;
// separarlos deja este archivo como "solo componente" para Fast Refresh.
// ============================================================
import { useEffect, useMemo, useState, useCallback } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  TABS_DEFAULT, NAV_DEFAULT, BRANDING_DEFAULT, LISTAS_DEFAULT, CAMPOS_OPERADOR_DEFAULT,
  resolverLista, nivelPermiso, NAV_META,
} from '../config/appDefaults'
import { AppConfigContext } from './useAppConfig'

const CONFIG_REF = () => doc(db, 'config', 'app')

// Aplica el color de marca elegido por el admin a las variables CSS.
function aplicarBranding(branding) {
  const root = document.documentElement
  if (branding.brandColor) {
    root.style.setProperty('--gl-brand', branding.brandColor)
    root.style.setProperty('--gl-brand-strong', branding.brandColor)
    root.style.setProperty('--gl-brand-soft', branding.brandColor)
    // tinte translúcido derivado del color (acepta #rrggbb)
    const tint = hexToRgba(branding.brandColor, 0.14)
    if (tint) root.style.setProperty('--gl-brand-tint', tint)
  } else {
    root.style.removeProperty('--gl-brand')
    root.style.removeProperty('--gl-brand-strong')
    root.style.removeProperty('--gl-brand-soft')
    root.style.removeProperty('--gl-brand-tint')
  }
  if (branding.appName) {
    document.title = `${branding.appName} · Robótica Submarina`
  }
}

function hexToRgba(hex, alpha) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return null
  const [, r, g, b] = m
  return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${alpha})`
}

export function AppConfigProvider({ children }) {
  const [raw, setRaw]         = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(
      CONFIG_REF(),
      (snap) => { setRaw(snap.exists() ? snap.data() : {}); setCargando(false) },
      () => { setRaw({}); setCargando(false) },   // sin permiso / error → defaults
    )
    return () => unsub()
  }, [])

  const branding = useMemo(
    () => ({ ...BRANDING_DEFAULT, ...(raw?.branding ?? {}) }),
    [raw],
  )

  // Aplica branding (color/título) cada vez que cambia.
  useEffect(() => { aplicarBranding(branding) }, [branding])

  const tabs = useMemo(() => resolverLista(TABS_DEFAULT, raw?.tabs), [raw])
  const nav  = useMemo(() => {
    const resolved = resolverLista(NAV_DEFAULT, raw?.nav)
    // Items con restricción de roles nunca se ocultan — el filtro de rol maneja el acceso
    return resolved.map(item => NAV_META[item.id]?.roles ? { ...item, hidden: false } : item)
  }, [raw])

  // Listas con add/remove (no solo reorden): usar config si existe, si no el default.
  const listas = useMemo(() => ({
    inspeccionRov: raw?.listas?.inspeccionRov?.length
      ? raw.listas.inspeccionRov
      : LISTAS_DEFAULT.inspeccionRov,
  }), [raw])

  const permisos = useMemo(() => raw?.permisos ?? {}, [raw])
  const permiso  = useCallback((tabId, role) => nivelPermiso(permisos, tabId, role), [permisos])

  const camposOperador = useMemo(
    () => resolverLista(CAMPOS_OPERADOR_DEFAULT, raw?.camposOperador),
    [raw],
  )

  const guardarConfig = useCallback(async (patch) => {
    await setDoc(CONFIG_REF(), patch, { merge: true })
  }, [])

  const value = useMemo(
    () => ({ tabs, nav, branding, listas, permisos, permiso, camposOperador, guardarConfig, cargando }),
    [tabs, nav, branding, listas, permisos, permiso, camposOperador, guardarConfig, cargando],
  )

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>
}
