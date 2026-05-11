'use client'
import { Trash2, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CharacterInventory } from '@/lib/types'
import { useDndSensors, SortableRow, AddButton, EmptyState } from '@/components/character/shared'

export function InventoryTab({ inventory, onAdd, onUpdateQty, onDelete, onReorder }: {
  inventory: CharacterInventory[]
  onAdd: () => void
  onUpdateQty: (item: CharacterInventory, delta: number) => void
  onDelete: (item: CharacterInventory) => void
  onReorder: (r: CharacterInventory[]) => void
}) {
  const sensors = useDndSensors()
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const from = inventory.findIndex(i => i.id === active.id)
      const to = inventory.findIndex(i => i.id === over.id)
      onReorder(arrayMove(inventory, from, to))
    }
  }
  return (
    <div className="p-4 flex flex-col gap-3">
      <AddButton onClick={onAdd} label="Add Item" />
      {inventory.length === 0 && <EmptyState emoji="🎒" text="Inventory empty" />}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={inventory.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {inventory.map(item => (
            <SortableRow key={item.id} id={item.id}>
              {drag => (
                <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div {...drag} className="cursor-grab active:cursor-grabbing shrink-0 touch-none" style={{ color: 'var(--text-muted)' }}>
                    <GripVertical size={16} />
                  </div>
                  <p className="flex-1 font-medium">{item.name}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onUpdateQty(item, -1)}
                      className="w-8 h-8 rounded-xl font-bold flex items-center justify-center"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>−</button>
                    <span className="w-8 text-center font-bold tabular-nums">{item.quantity}</span>
                    <button onClick={() => onUpdateQty(item, 1)}
                      className="w-8 h-8 rounded-xl font-bold flex items-center justify-center"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>+</button>
                  </div>
                  <button onClick={() => onDelete(item)} className="p-1" style={{ color: 'var(--text-muted)' }}>
                    <Trash2 size={15} />
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
