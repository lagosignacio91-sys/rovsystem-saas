# Guía de carga de operadores (arranque de datos)

Cómo preparar el Excel/CSV para el importador (`Importar operadores desde CSV`) y qué hacer después, para que el arranque del miércoles entre a la primera. Basado en `src/components/admin/ImportarCSV.jsx`.

## 1. Formato del archivo

- **7 columnas, en este orden exacto:**
  `Área | Centro | Proveedor | Nombre | RUT | Correo corporativo | Teléfono`
- **Fila de encabezado:** opcional (si la primera fila contiene la palabra "nombre", se salta sola).
- **Separador:** coma `,` **o** punto y coma `;` — los dos funcionan (Excel en español suele usar `;`).
- **⚠️ Codificación:** el importador lee el archivo como **ISO-8859-1 (Latin-1)**. Al exportar desde Excel elegí **"CSV (delimitado por comas)"**, **NO "CSV UTF-8"** → si no, los acentos y la Ñ (ej. **GOÑI**, nombres con á/é/í/ó) salen corruptos.
- **Límites:** máximo **500 KB** y **200 operadores** por archivo (si hay más, dividir en partes).

## 2. El team ya NO se asigna automático por el nombre del centro

**Cambio del 2026-07-17:** se sacó el mapeo fijo `Centro → team` del código (tenía errores confirmados: team08 sin centro y team09 mal asignado). Los 10 centros reales (auchile, gregoria, ninualac, nevenka, tangbac, aysen 4, teresa 1, pato, jorge canal goñi, isla quemada) están cargados en la empresa **aquachile**, pero **ninguno tiene team preasignado**.

**Flujo real ahora:**
1. Importás los operadores desde el Excel (columna `Centro` queda solo como referencia/dato informativo, ya no dispara ninguna asignación automática — dejarla en blanco o con el nombre igual está bien).
2. Vas a **Centros**, elegís el centro donde va cada operador, y le asignás el `teamId` correspondiente al operador (o le asignás el team directamente al centro, según cómo lo tengan pensado operar).
3. Como GL reasigna gente de un centro a otro según turnos/licencias (ej. "German estaba en Pato, pero cubre Lalanca esta semana"), este paso es manual **a propósito** — no hay una tabla fija que lo automatice.

## 3. Validaciones que bloquean la importación

Antes de importar, el sistema valida **todas** las filas y **no deja continuar** si hay:
- **Correo inválido** (debe ser un email bien formado).
- **RUT inválido** (si la fila trae RUT; se valida dígito verificador).
El error lista las primeras filas problemáticas → conviene revisar correos y RUTs en el Excel antes.

## 4. ⚠️ Lo más importante: el ESTADO

- El importador crea a cada operador en **`estado: 'pendiente'` por defecto**, y **solo los `'activo'` pueden entrar** a la app (regla `aprovisionado()`).
- En la **vista previa** (antes de darle "Importar") cada fila tiene un selector de estado → **poné en "Activo"** las filas de los operadores que deban poder trabajar desde el día 1.
- Si un operador queda en `pendiente`, **no podrá iniciar sesión** hasta activarlo (Centros/gestión → editar → estado Activo).

## 5. Contraseña

- Hay un campo **"Contraseña por defecto para todos"** (o una por fila).
- Recomendado en el código: usar una contraseña inicial simple y que cada uno la cambie en el primer ingreso (el perfil marca `passwordCambiado: false`).

## 6. Después de importar

1. La importación crea las cuentas (Firebase Auth) y los perfiles vía la Cloud Function `crearUsuario`. Al final muestra cuántas OK y cuántas fallaron (con el motivo).
2. Ir a **Centros → "Sincronizar operadores"** para asociarlos a sus centros.
3. Asegurarse de que **los centros existan y tengan `teamAsignado`** (hoy en prod solo existe `auchile` sin team). Inicializar/crear los centros y asignar el team correspondiente.
4. Cada **operador** entra con su usuario/clave y **carga por sí mismo el inventario** (equipos ROV y herramientas) de su centro — las reglas se lo permiten solo para su team.
5. El **owner** carga la **Bodega Virtual** (taller físico central).

## Checklist rápido para dejar el Excel listo (hoy)
- [ ] 7 columnas en orden: Área, Centro, Proveedor, Nombre, RUT, Correo, Teléfono.
- [ ] Nombres de `Centro` exactamente como la tabla de arriba.
- [ ] Correos válidos y RUTs válidos.
- [ ] Guardar como **CSV (comas)** — no "CSV UTF-8".
- [ ] ≤ 200 filas y ≤ 500 KB por archivo.
- [ ] (El miércoles, en la vista previa) poner estado **Activo** a quienes deban entrar, y fijar la contraseña por defecto.
