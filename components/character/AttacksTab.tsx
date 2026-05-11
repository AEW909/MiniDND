'use client'
import { Trash2, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CharacterAttack } from '@/lib/types'
import { getDamageEmoji, getDamageColor, getDamageLabel } from '@/lib/constants'
import { useDndSensors, SortableRow, AddButton, EmptyState } from '@/components/character/shared'

export function AttacksTab({ attacks, onAdd, onDelete, onEdit, onReorder }: {
  attacks: CharacterAttack[]; onAdd: () => void
  onDelete: (a: CharacterAttack) => void; onEdit: (a: CharacterAttack) => void
  onReorder: (r: CharacterAttack[]) => void
}) {
  const sensors = useDndSensors()
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const from = attacks.findIndex(a => a.id === active.id)
      const to = attacks.findIndex(a => a.id === over.id)
      onReorder(arrayMove(attacks, from, to))
    }
  }
  return (
    <div className="p-4 flex flex-col gap-3">
      <AddButton onClick={onAdd} label="Add Attack" />
      {attacks.length === 0 && <EmptyState emoji="⚔️" text="No attacks yet" />}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={attacks.map(a => a.id)} strategy={verticalListSortingStrategy}>
          {attacks.map(atk => (
            <SortableRow key={atk.id} id={atk.id}>
              {drag => (
                <div onClick={() => onEdit(atk)}
                  className="rounded-2xl p-4 flex items-start gap-3 cursor-pointer hover:brightness-110 transition-all"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div {...drag} className="self-center cursor-grab active:cursor-grabbing shrink-0 touch-none"
                    onClick={e => e.stopPropagation()} style={{ color: 'var(--text-muted)' }}>
                    <GripVertical size={16} />
                  </div>
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                    <span className="text-2xl">{getDamageEmoji(atk.damage_type) || '⚔️'}</span>
                    {atk.damage_type && (
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                        style={{ background: getDamageColor(atk.damage_type) + '22', color: getDamageColor(atk.damage_type), border: `1px solid ${getDamageColor(atk.damage_type)}44` }}>
                        {getDamageLabel(atk.damage_type)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">{atk.name}</p>
                    {atk.description && <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{atk.description}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {atk.to_hit && (
                        <span className="px-2 py-0.5 rounded-lg text-sm font-mono font-bold"
                          style={{ background: '#818cf822', color: '#818cf8', border: '1px solid #818cf844' }}>
                          {atk.to_hit} to hit
                        </span>
                      )}
                      {atk.notation && (
                        <span className="px-2 py-0.5 rounded-lg text-sm font-mono font-bold"
                          style={{ background: 'var(--surface-2)', color: 'var(--gold)' }}>
                          {atk.notation}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); onDelete(atk) }} className="p-1 rounded-lg shrink-0"
                    style={{ color: 'var(--text-muted)' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </SortableRow>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
