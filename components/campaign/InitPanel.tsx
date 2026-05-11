'use client'
import { useState } from 'react'
import { Swords, GripVertical, X, Plus } from 'lucide-react'
import {
  DndContext, closestCenter, DragEndEvent,
  PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface InitEntry {
  id: string
  name: string
  type: 'pc' | 'npc'
  side: 'friend' | 'foe' | 'neutral'
  desc: string
  charId?: string
}

function SortableInitRow({ entry, isCurrent, onRemove }: {
  entry: InitEntry; isCurrent: boolean; onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id })
  const dragStyle = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const c = isCurrent
    ? { bg: 'color-mix(in srgb, var(--gold) 15%, var(--surface))', border: 'var(--gold)', nameColor: 'var(--gold)' }
    : entry.type === 'pc'
    ? { bg: 'var(--surface)', border: 'var(--border)', nameColor: 'var(--text)' }
    : entry.side === 'foe'
    ? { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', nameColor: '#dc2626' }
    : entry.side === 'friend'
    ? { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', nameColor: '#16a34a' }
    : { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.4)', nameColor: '#b45309' }

  const sideEmoji = entry.type === 'npc'
    ? entry.side === 'foe' ? '💀' : entry.side === 'friend' ? '🤝' : '❓'
    : '⚔️'

  return (
    <div ref={setNodeRef} style={{ ...dragStyle, background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: '10px', marginBottom: '6px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {isCurrent && <span style={{ fontSize: '12px', color: 'var(--gold)', flexShrink: 0 }}>▶</span>}
      <button {...attributes} {...listeners} style={{ color: 'var(--text-muted)', cursor: 'grab', flexShrink: 0, touchAction: 'none', display: 'flex' }}>
        <GripVertical size={16} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: c.nameColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sideEmoji} {entry.name}
        </p>
        {entry.desc && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.desc}
          </p>
        )}
      </div>
      <button onClick={onRemove} style={{ color: 'var(--text-muted)', display: 'flex', padding: '2px', flexShrink: 0 }}>
        <X size={12} />
      </button>
    </div>
  )
}

export function InitPanel({ entries, currentId, round, partyChars, onClose, onReorder, onAdd, onRemove, onNext, onEnd }: {
  entries: InitEntry[]
  currentId: string | null
  round: number
  partyChars: Array<{ id: string; name: string; className: string; level: number }>
  onClose: () => void
  onReorder: (entries: InitEntry[]) => void
  onAdd: (entry: Omit<InitEntry, 'id'>) => void
  onRemove: (id: string) => void
  onNext: () => void
  onEnd: () => void
}) {
  const [picker, setPicker] = useState<'closed' | 'menu' | 'npc-form'>('closed')
  const [endConfirm, setEndConfirm] = useState(false)
  const [npcSide, setNpcSide] = useState<'friend' | 'foe' | 'neutral'>('neutral')
  const [npcName, setNpcName] = useState('')
  const [npcDesc, setNpcDesc] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 20 } }),
  )

  const removedPcs = partyChars.filter(pc => !entries.some(e => e.charId === pc.id))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = entries.findIndex(e => e.id === active.id)
      const newIndex = entries.findIndex(e => e.id === over.id)
      onReorder(arrayMove(entries, oldIndex, newIndex))
    }
  }

  function openPicker() {
    setPicker(prev => prev !== 'closed' ? 'closed' : removedPcs.length > 0 ? 'menu' : 'npc-form')
  }

  function submitNpc() {
    if (!npcName.trim()) return
    onAdd({ name: npcName.trim(), type: 'npc', side: npcSide, desc: npcDesc.trim() })
    setNpcName(''); setNpcDesc(''); setNpcSide('neutral'); setPicker('closed')
  }

  const sideConfig = {
    friend:  { emoji: '🤝', label: 'Friend',  activeBg: 'rgba(34,197,94,0.2)',  activeBorder: 'rgba(34,197,94,0.6)',  activeColor: '#86efac' },
    neutral: { emoji: '❓', label: 'Neutral', activeBg: 'var(--surface-2)',      activeBorder: 'var(--gold)',           activeColor: 'var(--text)' },
    foe:     { emoji: '💀', label: 'Foe',     activeBg: 'rgba(239,68,68,0.2)',  activeBorder: 'rgba(239,68,68,0.6)',  activeColor: '#ef4444' },
  } as const

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', pointerEvents: 'none' }}>
      <div style={{ flex: 1, pointerEvents: 'none' }} onClick={() => { setPicker('closed'); setEndConfirm(false) }} />
      <div style={{ width: '280px', height: '100%', background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', pointerEvents: 'auto', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <Swords size={16} style={{ color: 'var(--gold)', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--gold)' }}>Initiative</span>
          <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>Round {round}</span>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', display: 'flex', padding: '4px' }}><X size={18} /></button>
        </div>

        {/* Combatant list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
              {entries.map(entry => (
                <SortableInitRow key={entry.id} entry={entry}
                  isCurrent={entry.id === currentId}
                  onRemove={() => onRemove(entry.id)} />
              ))}
            </SortableContext>
          </DndContext>
          {entries.length === 0 && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '24px' }}>No combatants yet</p>
          )}
        </div>

        {/* + picker: menu */}
        {picker === 'menu' && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '8px', background: 'var(--surface-2)', flexShrink: 0 }}>
            <button onClick={() => setPicker('npc-form')}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', marginBottom: '6px' }}>
              <Plus size={13} /> Add NPC
            </button>
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 2px 4px' }}>Re-add party member</p>
            {removedPcs.map(pc => (
              <button key={pc.id}
                onClick={() => { onAdd({ name: pc.name, type: 'pc', side: 'neutral', desc: `${pc.className} · Lv ${pc.level}`, charId: pc.id }); setPicker('closed') }}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', fontSize: '12px', textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', marginBottom: '4px', display: 'block' }}>
                ⚔️ {pc.name} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>· {pc.className} Lv {pc.level}</span>
              </button>
            ))}
          </div>
        )}

        {/* + picker: NPC form */}
        {picker === 'npc-form' && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '12px', background: 'var(--surface-2)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)' }}>Add NPC</span>
              <button onClick={() => setPicker('closed')} style={{ color: 'var(--text-muted)', display: 'flex' }}><X size={14} /></button>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['friend', 'neutral', 'foe'] as const).map(s => {
                const cfg = sideConfig[s]; const active = npcSide === s
                return (
                  <button key={s} onClick={() => setNpcSide(s)}
                    style={{ flex: 1, padding: '5px 4px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: active ? cfg.activeBg : 'var(--surface)', border: `1.5px solid ${active ? cfg.activeBorder : 'var(--border)'}`, color: active ? cfg.activeColor : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                    <span style={{ fontSize: '13px' }}>{cfg.emoji}</span>{cfg.label}
                  </button>
                )
              })}
            </div>
            <input autoFocus value={npcName} onChange={e => setNpcName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitNpc()}
              placeholder="Name…"
              style={{ padding: '7px 10px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '13px', outline: 'none' }} />
            <input value={npcDesc} onChange={e => setNpcDesc(e.target.value)}
              placeholder="Description (optional)"
              style={{ padding: '7px 10px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '13px', outline: 'none' }} />
            <button onClick={submitNpc}
              style={{ padding: '7px', borderRadius: '8px', fontWeight: 700, fontSize: '12px', background: npcSide === 'foe' ? 'rgba(239,68,68,0.8)' : npcSide === 'friend' ? 'rgba(34,197,94,0.8)' : 'var(--gold)', color: '#1c1917' }}>
              Add to Initiative
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          {endConfirm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>End encounter? This resets everything.</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setEndConfirm(false)}
                  style={{ flex: 1, padding: '8px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '12px', fontWeight: 600 }}>
                  Cancel
                </button>
                <button onClick={() => { setEndConfirm(false); onEnd() }}
                  style={{ flex: 1, padding: '8px', borderRadius: '10px', background: 'rgba(239,68,68,0.8)', color: '#fff', fontSize: '12px', fontWeight: 700 }}>
                  End Encounter
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={onNext}
                style={{ flex: 1, padding: '8px', borderRadius: '10px', background: 'var(--gold)', color: '#1c1917', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                Next ▶
              </button>
              <button onClick={openPicker}
                style={{ padding: '8px 12px', borderRadius: '10px', background: picker !== 'closed' ? 'color-mix(in srgb, var(--gold) 20%, var(--surface-2))' : 'var(--surface-2)', border: `1px solid ${picker !== 'closed' ? 'var(--gold)' : 'var(--border)'}`, color: picker !== 'closed' ? 'var(--gold)' : 'var(--text)', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                <Plus size={14} />
              </button>
              <button onClick={() => { setPicker('closed'); setEndConfirm(true) }}
                style={{ padding: '8px 10px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '12px' }}>
                End
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
