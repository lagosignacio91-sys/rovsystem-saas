// Lista reordenable por arrastre (táctil + mouse), con ocultar y renombrar.
// Reutilizable: menú, pestañas, listas de inspección, etc.
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, arrayMove, useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff, Trash2 } from 'lucide-react'
import { t } from '../../theme/tokens'

function Fila({ item, onToggle, onRename, onEliminar, conOcultar }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : item.hidden ? 0.45 : 1,
    zIndex: isDragging ? 10 : 'auto',
  }
  return (
    <div ref={setNodeRef} style={{ ...style, ...s.row }}>
      <button {...attributes} {...listeners} style={s.handle} aria-label="Arrastrar" title="Arrastrar para reordenar">
        <GripVertical size={16} />
      </button>
      <input
        value={item.label}
        onChange={(e) => onRename(item.id, e.target.value)}
        style={s.input}
        aria-label="Nombre"
      />
      {conOcultar && (
        <button
          onClick={() => onToggle(item.id)}
          style={{ ...s.eye, color: item.hidden ? t.textMuted : t.brandSoft }}
          aria-label={item.hidden ? 'Mostrar' : 'Ocultar'}
          title={item.hidden ? 'Mostrar' : 'Ocultar'}
        >
          {item.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
      {onEliminar && (
        <button onClick={() => onEliminar(item.id)} style={{ ...s.eye, color: t.fault }} aria-label="Eliminar" title="Eliminar">
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}

export default function ListaOrdenable({ items, onChange, conOcultar = true, conEliminar = false }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    const movido = arrayMove(items, oldIndex, newIndex).map((it, idx) => ({ ...it, order: idx }))
    onChange(movido)
  }

  const onToggle = (id) => onChange(items.map((i) => (i.id === id ? { ...i, hidden: !i.hidden } : i)))
  const onRename = (id, label) => onChange(items.map((i) => (i.id === id ? { ...i, label } : i)))
  const onEliminar = conEliminar ? (id) => onChange(items.filter((i) => i.id !== id)) : null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div style={s.lista}>
          {items.map((item) => (
            <Fila key={item.id} item={item} onToggle={onToggle} onRename={onRename}
              onEliminar={onEliminar} conOcultar={conOcultar} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

const s = {
  lista:  { display: 'flex', flexDirection: 'column', gap: 6 },
  row:    { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gl-bg-input)', border: '1px solid var(--gl-border)', borderRadius: 10, padding: '6px 8px' },
  handle: { background: 'none', border: 'none', cursor: 'grab', color: 'var(--gl-text-muted)', display: 'flex', padding: 4, touchAction: 'none' },
  input:  { flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'var(--gl-text-primary)', fontSize: 13, fontFamily: 'inherit', padding: '4px 2px' },
  eye:    { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 },
}
