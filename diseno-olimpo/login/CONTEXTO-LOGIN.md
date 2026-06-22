# Paquete de diseño — LOGIN de OLIMPO (HyperionX)

Sesión dedicada **solo al login**. Es la puerta de entrada al panel maestro.

## Flujo
1. Sube `LoginOlimpo.jsx` + `olimpo.css` a Claude.
2. Diseñas hablando; lo ves en vivo (como localhost). **No editas código a mano.**
3. Exportas y en tu proyecto local se reconecta a Firebase Auth (lo hace tu asistente).

> El login **no muestra datos de negocio** — solo autentica. Así que no hay mocks de
> clientes/pagos: el diseño es puramente visual + estados de formulario.

---

## Qué es el login

Pantalla única, centrada, fondo dark navy. Marca HyperionX (no GL).

### Elementos actuales
- **Logo** `hyperionx-hx.png` (en Claude usa un placeholder cuadrado).
- **Título** `OLIMPO` (Barlow Condensed, rojo `--hx-accent`).
- **Subtítulo** `PANEL MAESTRO · HYPERIONX`.
- **Formulario:** email + contraseña (con toggle ver/ocultar) + botón "Ingresar".
- **Link** "¿Olvidaste tu clave?".

### 3 estados de la pantalla (todos deben verse bien)
1. **Login normal** — formulario email/clave.
2. **Recuperar clave** — un solo campo email + botón "Enviar enlace" + "Cancelar".
3. **Enlace enviado** — confirmación con check verde + "Volver al login".

### Mensajes de error a contemplar
- "Correo o clave incorrectos."
- "Correo no registrado en este panel."
- **"Acceso no autorizado. Este panel es exclusivo para cuentas HyperionX."**
  (aparece si alguien sin rol owner/ventas intenta entrar).

---

## Design system (olimpo.css — compartido con el interior)

Mantén estas variables como base (son las mismas que usa el panel interior, para coherencia):
- Fondo `--hx-bg #0b0f18`, panel `--hx-panel #131a2a`, borde `--hx-border rgba(255,255,255,0.08)`.
- Acento rojo `--hx-accent #cc1020`. Verde `--hx-green #10b981`, rojo suave `--hx-red-soft #f87171`.
- Tipografía: `Barlow Condensed` (títulos), `Inter` (cuerpo).
- Soporta tema claro con `[data-theme="light"]`.

> ⚠️ Si cambias colores/fuentes del tema aquí, **aplica el mismo cambio en la sesión
> del interior** (o decide la paleta primero) para que login y panel combinen.

---

## Texto para pegar en tu primer mensaje a Claude

> Voy a rediseñar SOLO la pantalla de login del panel "Olimpo" (HyperionX).
> Adjunto LoginOlimpo.jsx y olimpo.css. Mantén las variables de tema `--hx-*`
> como base del design system. El login tiene 3 estados: login normal, recuperar
> clave y "enlace enviado" — los tres deben verse bien. Conserva los textos de
> error (incluido "Acceso no autorizado…"). Usa un placeholder para el logo.
> Renderiza en vivo. Empecemos por: [describe el estilo que quieres].

---

## Reintegración (lo hace tu asistente de código)
Al exportar, se conserva la lógica de `LoginOlimpo.jsx` (signIn, sendPasswordResetEmail,
detección de rol owner/ventas con signOut) y se reemplaza solo lo visual.
