// Bus del sistema de toasts. Separa la API imperativa (toast.*) del componente
// ToastProvider para que Fast Refresh trate a Toast.jsx como archivo de solo
// componentes (react-refresh/only-export-components).

let _addToast = null

export const toast = {
  solicitud: (msg) => _addToast?.({ tipo: 'solicitud', msg }),
  despacho:  (msg) => _addToast?.({ tipo: 'despacho',  msg }),
}

// El ToastProvider registra aquí su función de alta; devuelve el des-registro
// para usar como cleanup del efecto (solo se limpia si sigue siendo la actual).
export function registerToast(fn) {
  _addToast = fn
  return () => { if (_addToast === fn) _addToast = null }
}
