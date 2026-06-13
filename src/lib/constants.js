export const STATUS = {
  OK:              { label: 'OK',                color: '#22c55e', dot: '🟢' },
  LOW_STOCK:       { label: 'Stock bajo',        color: '#eab308', dot: '🟡' },
  EQUIPMENT_FAULT: { label: 'Falla de equipo',   color: '#ef4444', dot: '🔴' },
  DISPATCH_ONWAY:  { label: 'Despacho en camino',color: '#3b82f6', dot: '🔵' },
  NO_OPERATOR:     { label: 'Sin operador',      color: '#6b7280', dot: '⚫' },
}

export const ROLES = {
  ADMIN:    'admin',
  OPERATOR: 'operador',
}

export const TABS = [
  { id: 'rov',       label: 'Equipos ROV'  },
  { id: 'tools',     label: 'Herramientas' },
  { id: 'operator',  label: 'Operador'     },
  { id: 'supplies',  label: 'Insumos'      },
]

export const DISPATCH_STATUS = {
  PENDING:   { label: 'Pendiente',   color: '#eab308' },
  ONWAY:     { label: 'En camino',   color: '#3b82f6' },
  DELIVERED: { label: 'Entregado',   color: '#22c55e' },
  CANCELLED: { label: 'Cancelado',   color: '#ef4444' },
}