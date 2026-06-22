# Paquete de diseño — INTERIOR de OLIMPO (panel maestro)

Sesión dedicada **solo al interior** del panel (lo que se ve después de iniciar sesión).

## Flujo
1. Sube `OlimpoPage.jsx` + `olimpo.css` a Claude.
2. Diseñas hablando; lo ves en vivo. **No editas código a mano.**
3. Exportas y en tu proyecto local se reconecta a Firebase (lo hace tu asistente).

> En Claude correrá con **datos de ejemplo (mock)**. Para reconectar fácil después,
> pídele que **conserve los nombres de los campos** que se listan abajo.

---

## Estructura

**TopBar** (logo HyperionX + reloj + badge ACTIVO + usuario + toggle tema) +
**Sidebar** (6 secciones) + área de contenido.

> El rol `ventas` solo ve **OPERACIONES + CARTERA**. El `owner` ve las 6.

### Las 6 secciones

**1. COMMAND CENTER** — KPIs ejecutivos
- MRR = suma `cliente.plan.tarifaBase` de clientes `estado === 'activa'`. ARR = MRR × 12.
- Clientes activos / en aviso. Ingresos del mes vs gastos del mes. Margen neto (barra).
- Resumen vs mes anterior (delta +/−). Alertas: clientes activos sin pago del mes.

**2. OPERACIONES** (visible para ventas) — lista de clientes expandible
- Por cliente: `nombre`, `estado`, `plan.tarifaBase`, `plan.diaVencimiento`.
- Métricas de uso: `totalUsuarios`, `porRol {admin, supervisor, operador}`, `movilesHabilitados`, `totalCentros`.
- Acciones (solo owner): registrar pago, cambiar estado, registrar mejora.

**3. FINANZAS**
- Ingresos del mes / año. Gráfico de barras 12 meses (ingresos vs gastos), **CSS puro**.
- Tabla de pagos: `mes`, `cliente`, `monto`, `metodo`.

**4. LOGÍSTICA**
- Gastos del mes / año. Alertas de vencimientos ≤ 60 días.
- Tabla de gastos: `fecha`, `concepto`, `monto`, `categoria`, `recurrente`, `vencimiento`.

**5. SISTEMAS**
- Config cuenta bancaria (editable). Datos de empresa (razón social, RUT, email).
- Links a consolas: Firebase, Vercel, Donweb.

**6. CARTERA** (visible para ventas) — pipeline de prospectos
- Etapas: `nuevo` → `demo_enviada` → `negociando` → `cerrado` / `descartado`.
- Por prospecto: `empresa`, `contactoNombre`, `etapa`, `creadoEn`. Acción: convertir a cliente.

---

## Forma de los datos (para el mock)

### Cliente
```js
{
  id: 'gl-robotica', nombre: 'GL Robótica', estado: 'activa', // 'activa'|'aviso'|'inactiva'
  plan: { tarifaBase: 1000000, moneda: 'CLP', descripcion: 'Plan Estándar', diaVencimiento: 19 },
  licencia: { fechaInicio: '2026-01-01', tipo: 'mensual', mejorasDisponibles: 2, mejorasUsadas: 0 },
  moviles: { incluidos: 10 },
  contacto: { nombre: 'Omar Guajardo', email: 'omar.guajardo@glrobotica.cl', tel: '' },
}
```
### Pago  → `{ id, mes: '2026-06', cliente: 'gl-robotica', monto: 1000000, metodo: 'transferencia' }`
### Gasto  → `{ id, fecha: '2026-06-18', concepto: 'Firebase', monto: 45000, categoria: 'infraestructura', recurrente: true, vencimiento: '2026-07-18' }`
### Prospecto → `{ id, empresa: 'Acuicultura X', contactoNombre: 'Juan', etapa: 'nuevo', creadoEn }`
### Métricas por cliente → `{ totalUsuarios: 31, porRol: { admin: 2, supervisor: 1, operador: 28 }, movilesHabilitados: 4, totalCentros: 10 }`

Genera 8-12 meses de pagos/gastos para que el gráfico y los totales se vean realistas.

---

## Design system (olimpo.css — compartido con el login)

- Fondo `--hx-bg #0b0f18`, panel `--hx-panel #131a2a`, acento rojo `--hx-accent #cc1020`.
- Verde `--hx-green #10b981`, ámbar `--hx-amber #f59e0b`.
- Títulos `Barlow Condensed`, cuerpo `Inter`. Tema claro con `[data-theme="light"]`.

> ⚠️ Si cambias el tema aquí, aplica el mismo cambio en la sesión del **login** para que combinen.

---

## Texto para pegar en tu primer mensaje a Claude

> Voy a rediseñar el INTERIOR del panel "Olimpo" (HyperionX), sin el login.
> Adjunto OlimpoPage.jsx y olimpo.css. Mantén la estructura de 6 secciones y
> **los nombres de los campos de datos** (clientes, pagos, gastos, prospectos,
> métricas) para reconectar a Firebase después. Conserva las variables `--hx-*`
> como base del tema. Recuerda que el rol "ventas" solo ve Operaciones y Cartera.
> Usa datos de ejemplo realistas (8-12 meses). Renderiza en vivo.
> Empecemos por: [la sección que quieras primero, ej. Command Center].

---

## Reintegración (lo hace tu asistente de código)
Al exportar, se conservan los hooks `useHxData` (clientes/pagos/gastos/prospectos/config)
y `useClienteMetrics` (métricas por cliente); se reemplaza solo lo visual y se reconectan
los mocks → datos reales (mismos nombres = cambio trivial). Luego: dark/light, gate de
rol `ventas`, routing `/olimpo`, deploy y verificación en `olimpo.hyperionx.tech`.
