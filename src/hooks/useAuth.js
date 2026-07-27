import { createContext, useContext } from 'react'

// ============================================================
// Contexto de autenticación — fuente ÚNICA de verdad de la sesión.
//
// El estado (usuario, rol, teamId, empresaId, etc.) y las acciones
// (signIn/signOut/cambiarPassword/…) los provee <AuthProvider> en
// ./AuthProvider.jsx. Aquí solo viven el contexto y el hook de consumo,
// para que los componentes hagan `const { role, teamId } = useAuth()`.
//
// IMPORTANTE: antes cada componente que llamaba useAuth() creaba su
// PROPIO onAuthStateChanged + getDoc del perfil, con su propio `loading`
// arrancando en true. Eso provocaba un "parpadeo" (rol/teamId momentánea-
// mente null → el menú perdía ítems y el operador no veía su centro, y
// luego "se arreglaba solo"). Con un único provider hay una sola carga y
// una sola verdad: el parpadeo desaparece.
// ============================================================

export const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error('useAuth() debe usarse dentro de <AuthProvider>')
  }
  return ctx
}
