# Prompt para diseñar el LOGIN de Olimpo en Claude

## Pasos (Fase 1)
1. En Claude (claude.ai), adjunta **2 archivos** desde `diseno-olimpo/login/`:
   - `LoginOlimpo.jsx`
   - `olimpo.css`
2. Pega el prompt de abajo.
3. Itera hablando. Cuando te guste, exporta y lo reconectamos a Firebase.

---

## PROMPT (copiar y pegar)

Voy a rediseñar **solo la pantalla de login** de mi panel "Olimpo" (HyperionX).
Adjunto `LoginOlimpo.jsx` (el login actual) y `olimpo.css` (mi design system).

**Dirección visual:** quiero una estética de **"centro de mando" tech pero premium y
confiable** — combina lo futurista (líneas finas, glow sutil, pequeños detalles tipo
HUD, acentos rojos HyperionX) con la solidez y jerarquía limpia de un SaaS empresarial
serio (estilo Linear/Stripe). Nada recargado ni "gamer": refinado, elegante, sobrio.

**Layout:** tarjeta centrada en una sola columna (mantén esa estructura).

**Debe incluir:**
- **Logo protagonista**: el logo arriba, grande y con presencia (usa un placeholder cuadrado).
- **Animación de entrada** suave al cargar la pantalla.
- **Fondo con movimiento** sutil (gradiente animado / partículas finas / grid tenue) —
  discreto, que no compita con el formulario.
- Un detalle de **"centro de mando"**: un reloj en vivo y/o un badge de "SISTEMA ACTIVO".

**Marca y tema (respétalos):**
- Título `OLIMPO`, subtítulo `PANEL MAESTRO · HYPERIONX`.
- Usa las variables `--hx-*` de mi olimpo.css como base del tema (fondo `#0b0f18`,
  acento rojo `#cc1020`, tipografía Barlow Condensed para títulos + Inter para texto).
- Soporta tema claro (`[data-theme="light"]`) si es fácil.

**Importante — 3 estados de la pantalla (diséñalos todos):**
1. **Login normal**: email + contraseña (con botón ver/ocultar) + botón "Ingresar" + link "¿Olvidaste tu clave?".
2. **Recuperar clave**: un campo email + botón "Enviar enlace" + "Cancelar".
3. **Enlace enviado**: confirmación con check verde + "Volver al login".

**Conserva estos textos de error** (deben poder mostrarse):
- "Correo o clave incorrectos."
- "Correo no registrado en este panel."
- "Acceso no autorizado. Este panel es exclusivo para cuentas HyperionX."

No cambies los nombres de los campos ni la lógica del formulario (necesito reconectarlo
a Firebase después). Renderiza el resultado en vivo y empecemos a iterar.
