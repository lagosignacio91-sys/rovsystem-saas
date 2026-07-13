// Campos de inspección del ROV. `sinFalla: true` marca los que no admiten
// registro de falla (p. ej. el modelo). Compartido por TabROV (UI) y
// useEquipoTickets (derivación de tickets); vive en config para no acoplar
// un hook a un componente ni romper Fast Refresh en TabROV.
export const CAMPOS = [
  { key: 'modelo',               label: 'Modelo',             sinFalla: true },
  { key: 'codigoRov',            label: 'Código ROV' },
  { key: 'codigoControl',        label: 'Código Control' },
  { key: 'codigoUmbilical',      label: 'Código Umbilical' },
  { key: 'sensor',               label: 'Sensor' },
  { key: 'codigoCargadorRov',    label: 'Cargador ROV' },
  { key: 'codigoCargadorControl',label: 'Cargador Control' },
]
