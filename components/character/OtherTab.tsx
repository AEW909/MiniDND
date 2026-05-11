'use client'
import { useState } from 'react'
import { Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CharacterOther } from '@/lib/types'
import { useDndSensors, SortableRow, AddButton, EmptyState } from '@/components/character/shared'

export function OtherTab({ other, onAdd, onDelete, onEdit, onReorder }: {
  other: CharacterOther[]; onAdd: () => void
  onDelete: (o: CharacterOther) => void; onEdit: (o: CharacterOther) => void
  onReorder: (r: CharacterOther[]) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id)
  const sensors = useDndSensors()
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const from = other.findIndex(o => o.id === active.id)
      const to = other.findIndex(o => o.id === over.id)
      onReorder(arrayMove(other, from, to))
    }
  }
  return (
    <div className="p-4 flex flex-col gap-3">
      <AddButton onClick={onAdd} label="Add Special" />
      {other.length === 0 && <EmptyState emoji="⚡" text="No specials yet" />}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={other.map(o => o.id)} strategy={verticalListSortingStrategy}>
          {other.map(item => (
            <SortableRow key={item.id} id={item.id}>
              {drag => (
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div onClick={() => toggle(item.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
                    <div {...drag} className="cursor-grab active:cursor-grabbing shrink-0 touch-none"
                      onClick={e => e.stopPropagation()} style={{ color: 'var(--text-muted)' }}>
                      <GripVertical size={16} />
                    </div>
                    <span className="flex-1 text-left font-bold">{item.name}</span>
                    {item.to_hit && (
                      <span className="px-2 py-0.5 rounded-lg text-sm font-mono font-bold"
                        style={{ background: '#818cf822', color: '#818cf8', border: '1px solid #818cf844' }}>
                        {item.to_hit} to hit
                      </span>
                    )}
                    {item.notation && (
                      <span className="px-2 py-0.5 rounded-lg text-sm font-mono font-bold"
                        style={{ background: 'var(--surface-2)', color: 'var(--gold)' }}>
                        {item.notation}
                      </span>
                    )}
                    {item.has_slots && (
                      <span className="text-xs px-2 py-0.5 rounded-lg font-semibold"
                        style={{ background: 'var(--surface-2)', color: 'var(--gold)' }}>
                        {item.max_slots} slot{item.max_slots !== 1 ? 's' : ''}
                      </span>
                    )}
                    {openId === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <button onClick={e => { e.stopPropagation(); onEdit(item) }} className="p-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                      ✏️
                    </button>
                    <button onClick={e => { e.stopPropagation(); onDelete(item) }} className="p-1" style={{ color: 'var(--text-muted)' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  {openId === item.id && item.description && (
                    <div className="px-4 pb-3 text-sm" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                      {item.description}
                    </div>
                  )}
                </div>
              )}
            </SortableRow>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
