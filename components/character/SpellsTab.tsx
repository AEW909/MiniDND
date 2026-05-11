'use client'
import { Trash2, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CharacterSpell, CharacterSpellSlot } from '@/lib/types'
import { getDamageEmoji, getDamageColor, getDamageLabel } from '@/lib/constants'
import { slotLevelLabel } from '@/lib/spell-slots'
import { useDndSensors, SortableRow, AddButton, EmptyState } from '@/components/character/shared'

export function SpellsTab({ spells, slots, onAdd, onDelete, onEdit, onReorder, onUseSlot, onRestoreSlot, onRestoreAll, charClass, subclass, level }: {
  spells: CharacterSpell[]; slots: CharacterSpellSlot[]
  onAdd: () => void; onDelete: (s: CharacterSpell) => void; onEdit: (s: CharacterSpell) => void
  onReorder: (levelSpells: CharacterSpell[]) => void
  onUseSlot: (s: CharacterSpellSlot) => void; onRestoreSlot: (s: CharacterSpellSlot) => void
  onRestoreAll: () => void
  charClass: string; subclass: string | null; level: number
}) {
  const sensors = useDndSensors()
  const byLevel = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].reduce<Record<number, CharacterSpell[]>>((acc, l) => {
    acc[l] = spells.filter(s => s.spell_level === l)
    return acc
  }, {})

  function handleDragEnd(l: number, e: DragEndEvent) {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const group = byLevel[l]
      const from = group.findIndex(s => s.id === active.id)
      const to = group.findIndex(s => s.id === over.id)
      onReorder(arrayMove(group, from, to))
    }
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <AddButton onClick={onAdd} label="Add Spell" />

      {/* Spell slots */}
      {slots.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>Spell Slots</h3>
            <button onClick={onRestoreAll} className="text-xs px-3 py-1 rounded-lg font-medium"
              style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              Long Rest ↺
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {slots.map(slot => {
              const avail = slot.max_slots - slot.used_slots
              return (
                <div key={slot.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold w-8 shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {slotLevelLabel(slot.slot_level)}
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {Array.from({ length: slot.max_slots }).map((_, i) => {
                      const used = i >= avail
                      return (
                        <button key={i}
                          onClick={() => used ? onRestoreSlot(slot) : onUseSlot(slot)}
                          className="w-8 h-8 rounded-full transition-all"
                          style={{
                            background: used ? 'var(--surface-2)' : 'var(--gold)',
                            border: `2px solid ${used ? 'var(--border)' : 'var(--gold)'}`,
                          }} />
                      )
                    })}
                  </div>
                  <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                    {avail}/{slot.max_slots}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Spells by level */}
      {spells.length === 0 && <EmptyState emoji="✨" text="No spells yet" />}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => {
        if (!byLevel[l]?.length) return null
        return (
          <div key={l} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="px-4 py-2" style={{ background: 'var(--surface)' }}>
              <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
                {l === 0 ? 'Cantrips' : `${slotLevelLabel(l)} Level`}
              </span>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(l, e)}>
              <SortableContext items={byLevel[l].map(s => s.id)} strategy={verticalListSortingStrategy}>
                {byLevel[l].map(spell => (
                  <SortableRow key={spell.id} id={spell.id}>
                    {drag => (
                      <div onClick={() => onEdit(spell)}
                        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:brightness-110 transition-all"
                        style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
                        <div {...drag} className="self-center cursor-grab active:cursor-grabbing shrink-0 touch-none"
                          onClick={e => e.stopPropagation()} style={{ color: 'var(--text-muted)' }}>
                          <GripVertical size={15} />
                        </div>
                        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                          <span className="text-xl">{getDamageEmoji(spell.damage_type) || '✨'}</span>
                          {spell.damage_type && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                              style={{ background: getDamageColor(spell.damage_type) + '22', color: getDamageColor(spell.damage_type), border: `1px solid ${getDamageColor(spell.damage_type)}44` }}>
                              {getDamageLabel(spell.damage_type)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">{spell.name}</p>
                          {spell.description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{spell.description}</p>}
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {spell.to_hit && (
                              <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold"
                                style={{ background: '#818cf822', color: '#818cf8', border: '1px solid #818cf844' }}>
                                {spell.to_hit} to hit
                              </span>
                            )}
                            {spell.notation && (
                              <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold"
                                style={{ background: 'var(--surface)', color: 'var(--gold)' }}>
                                {spell.notation}
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); onDelete(spell) }} className="p-1 shrink-0" style={{ color: 'var(--text-muted)' }}>
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
      })}
    </div>
  )
}
