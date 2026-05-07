'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  DndContext, closestCenter, DragEndEvent,
  PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Character, CharacterSkill, CharacterAttack, CharacterSpell,
  CharacterSpellSlot, CharacterInventory, CharacterOther,
} from '@/lib/types'
import {
  CLASSES, AVATARS, DAMAGE_TYPES, ABILITY_LABELS, SPECIES, CONDITIONS,
  getAvatarEmoji, getDamageEmoji, getDamageColor, getDamageLabel, abilityModifier, proficiencyBonus, formatModifier,
} from '@/lib/constants'
import { getSpellSlots, isCasterClass, slotLevelLabel } from '@/lib/spell-slots'
import { applyTheme, resetToGlobalTheme } from '@/lib/theme'
import Modal from '@/components/Modal'

type Tab = 'overview' | 'skills' | 'attacks' | 'spells' | 'inventory' | 'other'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'overview', label: 'Overview', emoji: '📋' },
  { id: 'skills', label: 'Skills', emoji: '🎯' },
  { id: 'attacks', label: 'Attacks', emoji: '⚔️' },
  { id: 'spells', label: 'Spells', emoji: '✨' },
  { id: 'inventory', label: 'Inventory', emoji: '🎒' },
  { id: 'other', label: 'Specials', emoji: '⚡' },
]

const ABILITY_KEYS = [
  { key: 'str_score', ab: 'STR' }, { key: 'dex_score', ab: 'DEX' }, { key: 'con_score', ab: 'CON' },
  { key: 'int_score', ab: 'INT' }, { key: 'wis_score', ab: 'WIS' }, { key: 'cha_score', ab: 'CHA' },
] as const

export default function CharacterPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [char, setChar] = useState<Character | null>(null)
  const [skills, setSkills] = useState<CharacterSkill[]>([])
  const [attacks, setAttacks] = useState<CharacterAttack[]>([])
  const [spells, setSpells] = useState<CharacterSpell[]>([])
  const [slots, setSlots] = useState<CharacterSpellSlot[]>([])
  const [inventory, setInventory] = useState<CharacterInventory[]>([])
  const [other, setOther] = useState<CharacterOther[]>([])
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)

  // Edit states
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [editingHp, setEditingHp] = useState(false)
  const [hpInput, setHpInput] = useState('')
  const [editingMaxHp, setEditingMaxHp] = useState(false)
  const [maxHpInput, setMaxHpInput] = useState('')

  // Add modals
  const [showAddAttack, setShowAddAttack] = useState(false)
  const [showAddSpell, setShowAddSpell] = useState(false)
  const [showAddInventory, setShowAddInventory] = useState(false)
  const [showAddOther, setShowAddOther] = useState(false)
  const [showEditChar, setShowEditChar] = useState(false)

  // Edit modals
  const [editingAttack, setEditingAttack] = useState<CharacterAttack | null>(null)
  const [editingSpell, setEditingSpell] = useState<CharacterSpell | null>(null)
  const [editingOther, setEditingOther] = useState<CharacterOther | null>(null)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [
      { data: c },
      { data: sk },
      { data: at },
      { data: sp },
      { data: sl },
      { data: inv },
      { data: ot },
    ] = await Promise.all([
      supabase.from('characters').select('*').eq('id', id).single(),
      supabase.from('character_skills').select('*').eq('character_id', id),
      supabase.from('character_attacks').select('*').eq('character_id', id).order('sort_order').order('created_at'),
      supabase.from('character_spells').select('*').eq('character_id', id).order('spell_level').order('sort_order').order('created_at'),
      supabase.from('character_spell_slots').select('*').eq('character_id', id).order('slot_level'),
      supabase.from('character_inventory').select('*').eq('character_id', id).order('sort_order').order('created_at'),
      supabase.from('character_other').select('*').eq('character_id', id).order('sort_order').order('created_at'),
    ])
    setChar(c)
    setSkills(sk ?? [])
    setAttacks(at ?? [])
    setSpells(sp ?? [])
    setSlots(sl ?? [])
    setInventory(inv ?? [])
    setOther(ot ?? [])
    setLoading(false)
    if (c?.party_id) {
      const { data: party } = await supabase.from('parties').select('theme').eq('id', c.party_id).single()
      if (party?.theme) applyTheme(party.theme as Parameters<typeof applyTheme>[0])
      else resetToGlobalTheme()
    }
  }

  async function updateHp(newHp: number) {
    if (!char) return
    const clamped = Math.max(0, Math.min(newHp, char.max_hp))
    await supabase.from('characters').update({ current_hp: clamped }).eq('id', id)
    setChar(prev => prev ? { ...prev, current_hp: clamped } : prev)
  }

  async function updateMaxHp(newMax: number) {
    if (!char) return
    const m = Math.max(1, newMax)
    await supabase.from('characters').update({ max_hp: m, current_hp: Math.min(char.current_hp, m) }).eq('id', id)
    setChar(prev => prev ? { ...prev, max_hp: m, current_hp: Math.min(prev.current_hp, m) } : prev)
  }

  async function updateChar(updates: {
    name?: string
    level?: number; max_hp?: number; speed?: number; ac?: number; species?: string | null
    str_score?: number; dex_score?: number; con_score?: number
    int_score?: number; wis_score?: number; cha_score?: number
    str_save_prof?: boolean; dex_save_prof?: boolean; con_save_prof?: boolean
    int_save_prof?: boolean; wis_save_prof?: boolean; cha_save_prof?: boolean
  }) {
    if (!char) return
    await supabase.from('characters').update(updates).eq('id', id)
    setChar(prev => prev ? { ...prev, ...updates } : prev)
  }

  async function deleteCharacter() {
    if (!char) return
    const { data: enc } = await supabase
      .from('encounters').select('*').eq('party_id', char.party_id).single()
    if (enc?.is_active) {
      const entries = (enc.entries ?? []) as Array<{ id: string; charId?: string }>
      const removedIdx = entries.findIndex(e => e.charId === id)
      if (removedIdx !== -1) {
        const filtered = entries.filter((_, i) => i !== removedIdx)
        const removedEntryId = entries[removedIdx].id
        const newCurrentId = enc.current_id === removedEntryId
          ? (filtered[removedIdx % Math.max(filtered.length, 1)]?.id ?? null)
          : enc.current_id
        await supabase.from('encounters')
          .update({ entries: filtered, current_id: newCurrentId })
          .eq('party_id', char.party_id)
      }
    }
    await supabase.from('characters').delete().eq('id', id)
    router.push(`/party/${char.party_id}`)
  }

  async function toggleSkill(skill: CharacterSkill) {
    // Cycle: none → proficient → expert → none
    let is_proficient = skill.is_proficient
    let is_expert = skill.is_expert
    if (!is_proficient && !is_expert) { is_proficient = true; is_expert = false }
    else if (is_proficient && !is_expert) { is_proficient = true; is_expert = true }
    else { is_proficient = false; is_expert = false }
    await supabase.from('character_skills').update({ is_proficient, is_expert }).eq('id', skill.id)
    setSkills(prev => prev.map(s => s.id === skill.id ? { ...s, is_proficient, is_expert } : s))
  }

  async function useSlot(slot: CharacterSpellSlot) {
    if (slot.used_slots >= slot.max_slots) return
    const used = slot.used_slots + 1
    await supabase.from('character_spell_slots').update({ used_slots: used }).eq('id', slot.id)
    setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, used_slots: used } : s))
  }

  async function restoreSlot(slot: CharacterSpellSlot) {
    if (slot.used_slots <= 0) return
    const used = slot.used_slots - 1
    await supabase.from('character_spell_slots').update({ used_slots: used }).eq('id', slot.id)
    setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, used_slots: used } : s))
  }

  async function restoreAllSlots() {
    await Promise.all(slots.map(s =>
      supabase.from('character_spell_slots').update({ used_slots: 0 }).eq('id', s.id)
    ))
    setSlots(prev => prev.map(s => ({ ...s, used_slots: 0 })))
  }

  async function updateQty(item: CharacterInventory, delta: number) {
    const qty = Math.max(0, item.quantity + delta)
    await supabase.from('character_inventory').update({ quantity: qty }).eq('id', item.id)
    setInventory(prev => prev.map(i => i.id === item.id ? { ...i, quantity: qty } : i))
  }

  async function deleteAttack(atk: CharacterAttack) {
    await supabase.from('character_attacks').delete().eq('id', atk.id)
    setAttacks(prev => prev.filter(a => a.id !== atk.id))
  }

  async function deleteSpell(spell: CharacterSpell) {
    await supabase.from('character_spells').delete().eq('id', spell.id)
    setSpells(prev => prev.filter(s => s.id !== spell.id))
  }

  async function deleteInventory(item: CharacterInventory) {
    await supabase.from('character_inventory').delete().eq('id', item.id)
    setInventory(prev => prev.filter(i => i.id !== item.id))
  }

  async function deleteOther(item: CharacterOther) {
    await supabase.from('character_other').delete().eq('id', item.id)
    setOther(prev => prev.filter(o => o.id !== item.id))
  }

  async function saveEditAttack(data: object) {
    if (!editingAttack) return
    const { data: row } = await supabase.from('character_attacks').update(data).eq('id', editingAttack.id).select().single()
    if (row) setAttacks(prev => prev.map(a => a.id === editingAttack.id ? row : a))
    setEditingAttack(null)
  }

  async function saveEditSpell(data: object) {
    if (!editingSpell) return
    const { data: row } = await supabase.from('character_spells').update(data).eq('id', editingSpell.id).select().single()
    if (row) setSpells(prev => prev.map(s => s.id === editingSpell.id ? row : s))
    setEditingSpell(null)
  }

  async function saveEditOther(data: object) {
    if (!editingOther) return
    const { data: row } = await supabase.from('character_other').update(data).eq('id', editingOther.id).select().single()
    if (row) setOther(prev => prev.map(o => o.id === editingOther.id ? row : o))
    setEditingOther(null)
  }

  async function reorderAttacks(reordered: CharacterAttack[]) {
    setAttacks(reordered)
    await Promise.all(reordered.map((a, i) =>
      supabase.from('character_attacks').update({ sort_order: i }).eq('id', a.id)
    ))
  }

  async function reorderInventory(reordered: CharacterInventory[]) {
    setInventory(reordered)
    await Promise.all(reordered.map((item, i) =>
      supabase.from('character_inventory').update({ sort_order: i }).eq('id', item.id)
    ))
  }

  async function reorderOther(reordered: CharacterOther[]) {
    setOther(reordered)
    await Promise.all(reordered.map((item, i) =>
      supabase.from('character_other').update({ sort_order: i }).eq('id', item.id)
    ))
  }

  async function reorderSpells(levelSpells: CharacterSpell[]) {
    const level = levelSpells[0]?.spell_level
    if (level === undefined) return
    setSpells(prev => [
      ...prev.filter(s => s.spell_level < level),
      ...levelSpells,
      ...prev.filter(s => s.spell_level > level),
    ])
    await Promise.all(levelSpells.map((s, i) =>
      supabase.from('character_spells').update({ sort_order: i }).eq('id', s.id)
    ))
  }

  if (loading || !char) return (
    <div className="flex items-center justify-center h-screen text-lg" style={{ color: 'var(--text-muted)' }}>
      Loading character…
    </div>
  )

  const prof = proficiencyBonus(char.level)
  const scores: Record<string, number> = {
    STR: char.str_score, DEX: char.dex_score, CON: char.con_score,
    INT: char.int_score, WIS: char.wis_score, CHA: char.cha_score,
  }
  const hpPct = Math.max(0, Math.min(1, char.current_hp / char.max_hp))
  const hpColor = hpPct > 0.5 ? 'var(--success)' : hpPct > 0.25 ? '#f59e0b' : 'var(--danger)'

  return (
    <div className="h-full flex flex-col" style={{ maxHeight: '100dvh' }}>
      {/* Fixed header */}
      <header className="shrink-0 px-4 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={22} />
        </button>

        <div className="text-4xl">{getAvatarEmoji(char.avatar_key)}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {editingName ? (
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onBlur={() => {
                  const t = nameInput.trim()
                  if (t && t !== char.name) updateChar({ name: t })
                  setEditingName(false)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  else if (e.key === 'Escape') setEditingName(false)
                }}
                className="font-display font-bold text-lg leading-tight outline-none bg-transparent border-b flex-1 min-w-0"
                style={{ color: 'var(--text)', borderColor: 'var(--gold)' }}
              />
            ) : (
              <h1
                className="font-display font-bold text-lg leading-tight truncate cursor-text"
                onClick={() => { setEditingName(true); setNameInput(char.name) }}
              >{char.name}</h1>
            )}
            <button onClick={() => setShowEditChar(true)} className="p-1 rounded-lg shrink-0" style={{ color: 'var(--text-muted)' }}>
              <Pencil size={14} />
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--gold)' }}>
            {char.species ? `${char.species} · ` : ''}{char.class}{char.subclass ? ` · ${char.subclass}` : ''} · Lv {char.level}
          </p>
        </div>

        {/* HP display */}
        <div className="flex items-center gap-2">
          <button onClick={() => updateHp(char.current_hp - 1)}
            className="w-9 h-9 rounded-xl font-bold text-lg flex items-center justify-center transition-colors"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>−</button>
          <div className="text-center" style={{ minWidth: '56px' }}>
            <div className="flex items-center justify-center gap-1">
              <span className="font-bold text-lg"
                onClick={() => { setEditingHp(true); setHpInput(String(char.current_hp)) }}
                style={{ cursor: 'pointer', color: hpColor }}>
                {char.current_hp}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>/</span>
              <span className="font-semibold text-sm"
                onClick={() => { setEditingMaxHp(true); setMaxHpInput(String(char.max_hp)) }}
                style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
                {char.max_hp}
              </span>
            </div>
            <div className="h-1.5 rounded-full mt-1" style={{ background: 'var(--surface-2)', width: '100%' }}>
              <div className="h-full rounded-full transition-all" style={{ background: hpColor, width: `${hpPct * 100}%` }} />
            </div>
          </div>
          <button onClick={() => updateHp(char.current_hp + 1)}
            className="w-9 h-9 rounded-xl font-bold text-lg flex items-center justify-center transition-colors"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>+</button>
        </div>
      </header>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'overview' && (
          <OverviewTab char={char} prof={prof} scores={scores} skills={skills} onSave={updateChar} />
        )}
        {tab === 'skills' && (
          <SkillsTab skills={skills} scores={scores} prof={prof} onToggle={toggleSkill} />
        )}
        {tab === 'attacks' && (
          <AttacksTab attacks={attacks} onAdd={() => setShowAddAttack(true)} onDelete={deleteAttack} onEdit={setEditingAttack} onReorder={reorderAttacks} />
        )}
        {tab === 'spells' && (
          <SpellsTab
            spells={spells} slots={slots}
            onAdd={() => setShowAddSpell(true)} onDelete={deleteSpell} onEdit={setEditingSpell} onReorder={reorderSpells}
            onUseSlot={useSlot} onRestoreSlot={restoreSlot} onRestoreAll={restoreAllSlots}
            charClass={char.class} subclass={char.subclass} level={char.level}
          />
        )}
        {tab === 'inventory' && (
          <InventoryTab inventory={inventory} onAdd={() => setShowAddInventory(true)} onUpdateQty={updateQty} onDelete={deleteInventory} onReorder={reorderInventory} />
        )}
        {tab === 'other' && (
          <OtherTab other={other} onAdd={() => setShowAddOther(true)} onDelete={deleteOther} onEdit={setEditingOther} onReorder={reorderOther} />
        )}
      </div>

      {/* Bottom tab bar */}
      <nav className="shrink-0 flex" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors text-xs font-medium"
            style={{ color: tab === t.id ? 'var(--gold)' : 'var(--text-muted)' }}>
            <span className="text-lg">{t.emoji}</span>
            <span className="hidden sm:block">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* HP edit modals */}
      {editingHp && (
        <Modal title="Set Current HP" onClose={() => setEditingHp(false)}>
          <div className="flex flex-col gap-4">
            <input autoFocus type="number" value={hpInput}
              onChange={e => setHpInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (updateHp(parseInt(hpInput) || 0), setEditingHp(false))}
              className="w-full px-4 py-4 rounded-xl text-center text-3xl font-bold outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            <button onClick={() => { updateHp(parseInt(hpInput) || 0); setEditingHp(false) }}
              className="w-full py-3 rounded-xl font-bold" style={{ background: 'var(--gold)', color: '#1c1917' }}>
              Set HP
            </button>
          </div>
        </Modal>
      )}
      {editingMaxHp && (
        <Modal title="Set Max HP" onClose={() => setEditingMaxHp(false)}>
          <div className="flex flex-col gap-4">
            <input autoFocus type="number" value={maxHpInput}
              onChange={e => setMaxHpInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (updateMaxHp(parseInt(maxHpInput) || 1), setEditingMaxHp(false))}
              className="w-full px-4 py-4 rounded-xl text-center text-3xl font-bold outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            <button onClick={() => { updateMaxHp(parseInt(maxHpInput) || 1); setEditingMaxHp(false) }}
              className="w-full py-3 rounded-xl font-bold" style={{ background: 'var(--gold)', color: '#1c1917' }}>
              Set Max HP
            </button>
          </div>
        </Modal>
      )}

      {showAddAttack && (
        <AddAttackModal onClose={() => setShowAddAttack(false)}
          onSave={async (data) => {
            const { data: row } = await supabase.from('character_attacks').insert({ character_id: id, ...data }).select().single()
            if (row) setAttacks(prev => [...prev, row])
            setShowAddAttack(false)
          }} />
      )}
      {showAddSpell && (
        <AddSpellModal onClose={() => setShowAddSpell(false)}
          onSave={async (data) => {
            const { data: row } = await supabase.from('character_spells').insert({ character_id: id, ...data }).select().single()
            if (row) setSpells(prev => [...prev, row])
            setShowAddSpell(false)
          }} />
      )}
      {showAddInventory && (
        <AddInventoryModal onClose={() => setShowAddInventory(false)}
          onSave={async (data) => {
            const { data: row } = await supabase.from('character_inventory').insert({ character_id: id, ...data }).select().single()
            if (row) setInventory(prev => [...prev, row])
            setShowAddInventory(false)
          }} />
      )}
      {showAddOther && (
        <AddOtherModal onClose={() => setShowAddOther(false)}
          onSave={async (data) => {
            const { data: row } = await supabase.from('character_other').insert({ character_id: id, ...data }).select().single()
            if (row) setOther(prev => [...prev, row])
            setShowAddOther(false)
          }} />
      )}

      {editingAttack && (
        <AddAttackModal title="Edit Attack" initial={editingAttack}
          onClose={() => setEditingAttack(null)} onSave={saveEditAttack} />
      )}
      {editingSpell && (
        <AddSpellModal title="Edit Spell" initial={editingSpell}
          onClose={() => setEditingSpell(null)} onSave={saveEditSpell} />
      )}
      {editingOther && (
        <AddOtherModal title="Edit Special" initial={editingOther}
          onClose={() => setEditingOther(null)} onSave={saveEditOther} />
      )}

      {showEditChar && (
        <EditCharModal char={char} onClose={() => setShowEditChar(false)} onSave={async (updates) => {
          await updateChar(updates)
          setShowEditChar(false)
        }} />
      )}
    </div>
  )
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ char, prof, scores, skills, onSave }: {
  char: Character; prof: number; scores: Record<string, number>
  skills: CharacterSkill[]
  onSave: (u: object) => Promise<void>
}) {
  const [showStatsEdit, setShowStatsEdit] = useState(false)
  const wisMod = abilityModifier(char.wis_score)
  const perceptionSkill = skills.find(s => s.skill_name === 'Perception')
  const insightSkill = skills.find(s => s.skill_name === 'Insight')
  const passivePerc = 10 + wisMod + (perceptionSkill?.is_proficient ? (perceptionSkill.is_expert ? 2 : 1) * prof : 0)
  const passiveWis = 10 + wisMod
  const passiveIns = 10 + wisMod + (insightSkill?.is_proficient ? (insightSkill.is_expert ? 2 : 1) * prof : 0)
  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Core stats strip */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Stats</span>
        <button onClick={() => setShowStatsEdit(true)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
          style={{ color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Pencil size={11} /> Edit
        </button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <StatPill label="AC" value={String(char.ac ?? 10)} />
        <StatPill label="Prof" value={`+${prof}`} />
        <StatPill label="Speed" value={`${char.speed}ft`} />
        <StatPill label="Level" value={String(char.level)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatPill label="Passive PER" value={String(passivePerc)} />
        <StatPill label="Passive WIS" value={String(passiveWis)} />
        <StatPill label="Passive INS" value={String(passiveIns)} />
      </div>

      {/* Ability scores */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: 'var(--gold)' }}>Ability Scores</h2>
        <div className="grid grid-cols-3 gap-3">
          {ABILITY_KEYS.map(({ key, ab }) => {
            const score = (char as unknown as Record<string, number>)[key]
            const mod = abilityModifier(score)
            return (
              <div key={ab} className="rounded-xl p-3 text-center"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-bold mb-1" style={{ color: 'var(--gold)' }}>{ab}</p>
                <p className="text-2xl font-black">{score}</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>{formatModifier(mod)}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Saving throws — display only, edit via pencil */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: 'var(--gold)' }}>Saving Throws</h2>
        <div className="flex flex-col gap-1">
          {ABILITY_KEYS.map(({ key, ab }) => {
            const score = (char as unknown as Record<string, number>)[key]
            const baseMod = abilityModifier(score)
            const profKey = `${ab.toLowerCase()}_save_prof` as keyof Character
            const isProf = !!char[profKey]
            const total = baseMod + (isProf ? prof : 0)
            return (
              <div key={ab} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background: 'var(--surface-2)' }}>
                <div className="w-4 h-4 rounded-full shrink-0"
                  style={{ background: isProf ? 'var(--gold)' : 'transparent', border: `2px solid ${isProf ? 'var(--gold)' : 'var(--border)'}` }} />
                <span className="flex-1 text-sm font-medium">{ABILITY_LABELS[ab]}</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: isProf ? 'var(--gold)' : 'var(--text-muted)' }}>
                  {formatModifier(total)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Conditions */}
      {(char.conditions ?? []).length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: 'var(--danger, #ef4444)' }}>Conditions</h2>
          <div className="flex flex-wrap gap-2">
            {(char.conditions ?? []).map(key => {
              const cond = CONDITIONS.find(c => c.key === key)
              if (!cond) return null
              return (
                <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}>
                  {cond.emoji} {cond.label}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Death saves — read-only, shown when HP is 0 */}
      {char.current_hp === 0 && (() => {
        const ds = char.death_saves ?? { successes: 0, failures: 0 }
        const isStable = ds.successes >= 3
        const isDead = ds.failures >= 3
        return (
          <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: isDead ? '#ef4444' : '#f59e0b' }}>
              💀 Death Saves
            </h2>
            {isDead || isStable ? (
              <div className="text-center py-2 rounded-xl text-sm font-bold"
                style={isDead
                  ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' }
                  : { background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                {isDead ? '💀 Dead' : '💤 Stable'}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold w-14" style={{ color: '#ef4444' }}>✗ Fails</span>
                  <div className="flex gap-1.5">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full"
                        style={{
                          background: i < ds.failures ? '#ef4444' : 'var(--surface-2)',
                          border: `1.5px solid ${i < ds.failures ? '#ef4444' : 'var(--border)'}`,
                        }} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold w-14" style={{ color: '#22c55e' }}>✓ Saves</span>
                  <div className="flex gap-1.5">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full"
                        style={{
                          background: i < ds.successes ? '#22c55e' : 'var(--surface-2)',
                          border: `1.5px solid ${i < ds.successes ? '#22c55e' : 'var(--border)'}`,
                        }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {showStatsEdit && (
        <StatsEditModal char={char} prof={prof}
          onClose={() => setShowStatsEdit(false)}
          onSave={async (u) => { await onSave(u); setShowStatsEdit(false) }} />
      )}
    </div>
  )
}

function StatsEditModal({ char, prof, onClose, onSave }: {
  char: Character; prof: number
  onClose: () => void
  onSave: (u: object) => Promise<void>
}) {
  const [level, setLevel] = useState(String(char.level))
  const [ac, setAc] = useState(String(char.ac ?? 10))
  const [speed, setSpeed] = useState(String(char.speed))
  const [maxHp, setMaxHp] = useState(String(char.max_hp))
  const [str, setStr] = useState(String(char.str_score))
  const [dex, setDex] = useState(String(char.dex_score))
  const [con, setCon] = useState(String(char.con_score))
  const [int_, setInt] = useState(String(char.int_score))
  const [wis, setWis] = useState(String(char.wis_score))
  const [cha, setCha] = useState(String(char.cha_score))
  const [saves, setSaves] = useState({
    str: char.str_save_prof, dex: char.dex_save_prof, con: char.con_save_prof,
    int: char.int_save_prof, wis: char.wis_save_prof, cha: char.cha_save_prof,
  })
  const [saving, setSaving] = useState(false)

  const scoreInputs = [
    { ab: 'STR', val: str, set: setStr }, { ab: 'DEX', val: dex, set: setDex },
    { ab: 'CON', val: con, set: setCon }, { ab: 'INT', val: int_, set: setInt },
    { ab: 'WIS', val: wis, set: setWis }, { ab: 'CHA', val: cha, set: setCha },
  ]
  const saveRows = [
    { ab: 'STR', key: 'str' as const, label: ABILITY_LABELS['STR'] },
    { ab: 'DEX', key: 'dex' as const, label: ABILITY_LABELS['DEX'] },
    { ab: 'CON', key: 'con' as const, label: ABILITY_LABELS['CON'] },
    { ab: 'INT', key: 'int' as const, label: ABILITY_LABELS['INT'] },
    { ab: 'WIS', key: 'wis' as const, label: ABILITY_LABELS['WIS'] },
    { ab: 'CHA', key: 'cha' as const, label: ABILITY_LABELS['CHA'] },
  ]

  async function save() {
    setSaving(true)
    await onSave({
      level: Math.max(1, Math.min(20, parseInt(level) || 1)),
      ac: Math.max(1, parseInt(ac) || 10),
      speed: Math.max(0, parseInt(speed) || 30),
      max_hp: Math.max(1, parseInt(maxHp) || 1),
      str_score: Math.max(1, parseInt(str) || 10),
      dex_score: Math.max(1, parseInt(dex) || 10),
      con_score: Math.max(1, parseInt(con) || 10),
      int_score: Math.max(1, parseInt(int_) || 10),
      wis_score: Math.max(1, parseInt(wis) || 10),
      cha_score: Math.max(1, parseInt(cha) || 10),
      str_save_prof: saves.str, dex_save_prof: saves.dex, con_save_prof: saves.con,
      int_save_prof: saves.int, wis_save_prof: saves.wis, cha_save_prof: saves.cha,
    })
    setSaving(false)
  }

  const IS = { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }

  return (
    <Modal title="Edit Stats" onClose={onClose}>
      <div className="flex flex-col gap-5">
        {/* Core stats */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Core</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Level', val: level, set: setLevel, min: 1, max: 20 },
              { label: 'AC', val: ac, set: setAc, min: 1 },
              { label: 'Speed', val: speed, set: setSpeed, min: 0, step: 5 },
              { label: 'Max HP', val: maxHp, set: setMaxHp, min: 1 },
            ].map(({ label, val, set, min, max, step }) => (
              <div key={label}>
                <label className="block text-xs font-medium mb-1 text-center" style={{ color: 'var(--text-muted)' }}>{label}</label>
                <input type="number" min={min} max={max} step={step} value={val}
                  onChange={e => set(e.target.value)}
                  className="w-full px-2 py-2 rounded-xl outline-none text-center font-bold text-sm"
                  style={IS} />
              </div>
            ))}
          </div>
        </div>

        {/* Ability scores */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Ability Scores</p>
          <div className="grid grid-cols-3 gap-2">
            {scoreInputs.map(({ ab, val, set }) => (
              <div key={ab}>
                <label className="block text-xs font-bold mb-1 text-center" style={{ color: 'var(--gold)' }}>{ab}</label>
                <input type="number" min={1} max={30} value={val}
                  onChange={e => set(e.target.value)}
                  className="w-full px-2 py-2 rounded-xl outline-none text-center font-bold text-sm"
                  style={IS} />
              </div>
            ))}
          </div>
        </div>

        {/* Saving throw proficiencies */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Saving Throw Proficiencies</p>
          <div className="grid grid-cols-2 gap-1">
            {saveRows.map(({ ab, key, label }) => {
              const score = { str: char.str_score, dex: char.dex_score, con: char.con_score, int: char.int_score, wis: char.wis_score, cha: char.cha_score }[key]
              const baseMod = abilityModifier(score ?? 10)
              const total = baseMod + (saves[key] ? prof : 0)
              return (
                <button key={ab} onClick={() => setSaves(s => ({ ...s, [key]: !s[key] }))}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all"
                  style={{ background: saves[key] ? 'color-mix(in srgb, var(--gold) 15%, var(--surface-2))' : 'var(--surface-2)', border: `1px solid ${saves[key] ? 'var(--gold)' : 'var(--border)'}` }}>
                  <div className="w-4 h-4 rounded-full shrink-0 transition-all"
                    style={{ background: saves[key] ? 'var(--gold)' : 'transparent', border: `2px solid ${saves[key] ? 'var(--gold)' : 'var(--border)'}` }} />
                  <span className="text-xs font-medium flex-1">{ab}</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: saves[key] ? 'var(--gold)' : 'var(--text-muted)' }}>{formatModifier(total)}</span>
                </button>
              )
            })}
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="w-full py-3 rounded-xl font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--gold)', color: '#1c1917' }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xl font-black" style={{ color: 'var(--gold)' }}>{value}</p>
    </div>
  )
}

// ─── Skills Tab ───────────────────────────────────────────────────────────────

const ABILITY_ORDER = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

function SkillsTab({ skills, scores, prof, onToggle }: {
  skills: CharacterSkill[]; scores: Record<string, number>; prof: number
  onToggle: (s: CharacterSkill) => void
}) {
  const grouped = ABILITY_ORDER.reduce<Record<string, CharacterSkill[]>>((acc, ab) => {
    acc[ab] = skills.filter(s => s.ability === ab)
    return acc
  }, {})

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-stone-600" /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>None</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ background: 'var(--gold)' }} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Proficient (+Prof)</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ background: 'var(--gold-light)' }} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>Expert (×2 Prof)</span></div>
      </div>
      {ABILITY_ORDER.map(ab => {
        if (!grouped[ab]?.length) return null
        const score = scores[ab] ?? 10
        const baseMod = abilityModifier(score)
        return (
          <div key={ab} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="px-4 py-2 flex items-center justify-between"
              style={{ background: 'var(--surface)' }}>
              <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
                {ABILITY_LABELS[ab]} ({ab})
              </span>
              <span className="text-sm font-bold">{formatModifier(baseMod)}</span>
            </div>
            {grouped[ab].map(skill => {
              const mult = skill.is_expert ? 2 : skill.is_proficient ? 1 : 0
              const mod = baseMod + mult * prof
              const color = skill.is_expert ? 'var(--gold-light)' : skill.is_proficient ? 'var(--gold)' : 'var(--surface-2)'
              const borderColor = skill.is_expert ? 'var(--gold-light)' : skill.is_proficient ? 'var(--gold)' : 'var(--border)'
              return (
                <div key={skill.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors"
                  style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
                  <button onClick={() => onToggle(skill)}
                    className="w-5 h-5 rounded-full shrink-0 transition-all"
                    style={{ background: color, border: `2px solid ${borderColor}` }} />
                  <span className="flex-1 text-sm font-medium">{skill.skill_name}</span>
                  <span className="text-sm font-bold tabular-nums w-8 text-right" style={{ color: mod >= 0 ? 'var(--gold)' : 'var(--danger)' }}>
                    {formatModifier(mod)}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ─── Shared drag helpers ──────────────────────────────────────────────────────

function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )
}

function SortableRow({ id, children }: { id: string; children: (drag: React.HTMLAttributes<HTMLElement>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      {children({ ...attributes, ...listeners })}
    </div>
  )
}

// ─── Attacks Tab ─────────────────────────────────────────────────────────────

function AttacksTab({ attacks, onAdd, onDelete, onEdit, onReorder }: {
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

// ─── Spells Tab ───────────────────────────────────────────────────────────────

function SpellsTab({ spells, slots, onAdd, onDelete, onEdit, onReorder, onUseSlot, onRestoreSlot, onRestoreAll, charClass, subclass, level }: {
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

      {/* Spells by level — accordion */}
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

// ─── Inventory Tab ────────────────────────────────────────────────────────────

function InventoryTab({ inventory, onAdd, onUpdateQty, onDelete, onReorder }: {
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

// ─── Specials Tab ─────────────────────────────────────────────────────────────

function OtherTab({ other, onAdd, onDelete, onEdit, onReorder }: {
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

// ─── Add Modals ───────────────────────────────────────────────────────────────

function AddAttackModal({ title = 'Add Attack', initial, onClose, onSave }: {
  title?: string; initial?: CharacterAttack; onClose: () => void; onSave: (d: object) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [desc, setDesc] = useState(initial?.description ?? '')
  const [notation, setNotation] = useState(initial?.notation ?? '')
  const [dmgType, setDmgType] = useState(initial?.damage_type ?? '')
  const [toHit, setToHit] = useState(initial?.to_hit ?? '')
  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Name"><input autoFocus type="text" placeholder="Longsword" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none" style={inputStyle} /></Field>
        <Field label="Description"><input type="text" placeholder="Melee weapon attack" value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none" style={inputStyle} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="To Hit (e.g. +3)"><input type="text" placeholder="+3" value={toHit} onChange={e => setToHit(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none font-mono" style={inputStyle} /></Field>
          <Field label="Dice notation"><input type="text" placeholder="1d8+3" value={notation} onChange={e => setNotation(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none font-mono" style={inputStyle} /></Field>
        </div>
        <Field label="Damage type">
          <DamageTypePicker value={dmgType} onChange={setDmgType} />
        </Field>
        <button onClick={() => onSave({ name, description: desc, notation: notation || null, damage_type: dmgType || null, to_hit: toHit || null })}
          disabled={!name.trim()} className="w-full py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: 'var(--gold)', color: '#1c1917' }}>
          {initial ? 'Save Changes' : 'Add Attack'}
        </button>
      </div>
    </Modal>
  )
}

function AddSpellModal({ title = 'Add Spell', initial, onClose, onSave }: {
  title?: string; initial?: CharacterSpell; onClose: () => void; onSave: (d: object) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [desc, setDesc] = useState(initial?.description ?? '')
  const [notation, setNotation] = useState(initial?.notation ?? '')
  const [dmgType, setDmgType] = useState(initial?.damage_type ?? '')
  const [level, setLevel] = useState(String(initial?.spell_level ?? '0'))
  const [toHit, setToHit] = useState(initial?.to_hit ?? '')
  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name"><input autoFocus type="text" placeholder="Fireball" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none" style={inputStyle} /></Field>
          <Field label="Spell level">
            <select value={level} onChange={e => setLevel(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none" style={inputStyle}>
              <option value="0">Cantrip</option>
              {[1,2,3,4,5,6,7,8,9].map(l => <option key={l} value={l}>{slotLevelLabel(l)} level</option>)}
            </select>
          </Field>
        </div>
        <Field label="Description"><input type="text" placeholder="Deals fire damage in a 20ft sphere" value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none" style={inputStyle} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="To Hit (e.g. +5)"><input type="text" placeholder="+5" value={toHit} onChange={e => setToHit(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none font-mono" style={inputStyle} /></Field>
          <Field label="Dice notation"><input type="text" placeholder="8d6" value={notation} onChange={e => setNotation(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none font-mono" style={inputStyle} /></Field>
        </div>
        <Field label="Damage type"><DamageTypePicker value={dmgType} onChange={setDmgType} /></Field>
        <button onClick={() => onSave({ name, description: desc, notation: notation || null, damage_type: dmgType || null, to_hit: toHit || null, spell_level: parseInt(level) })}
          disabled={!name.trim()} className="w-full py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: 'var(--gold)', color: '#1c1917' }}>
          {initial ? 'Save Changes' : 'Add Spell'}
        </button>
      </div>
    </Modal>
  )
}

function AddInventoryModal({ onClose, onSave }: { onClose: () => void; onSave: (d: object) => void }) {
  const [name, setName] = useState(''); const [qty, setQty] = useState('1')
  return (
    <Modal title="Add Item" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Item name"><input autoFocus type="text" placeholder="Health Potion" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none" style={inputStyle} /></Field>
        <Field label="Quantity"><input type="number" min="0" value={qty} onChange={e => setQty(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none text-center" style={inputStyle} /></Field>
        <button onClick={() => onSave({ name, quantity: parseInt(qty) || 1 })}
          disabled={!name.trim()} className="w-full py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: 'var(--gold)', color: '#1c1917' }}>
          Add Item
        </button>
      </div>
    </Modal>
  )
}

function AddOtherModal({ title = 'Add Special', initial, onClose, onSave }: {
  title?: string; initial?: CharacterOther; onClose: () => void; onSave: (d: object) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [desc, setDesc] = useState(initial?.description ?? '')
  const [notation, setNotation] = useState(initial?.notation ?? '')
  const [toHit, setToHit] = useState(initial?.to_hit ?? '')
  const [hasSlots, setHasSlots] = useState(initial?.has_slots ?? false)
  const [maxSlots, setMaxSlots] = useState(initial?.max_slots ?? 1)
  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Name"><input autoFocus type="text" placeholder="Second Wind" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none" style={inputStyle} /></Field>
        <Field label="Description"><input type="text" placeholder="Regain HP as a bonus action…" value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none" style={inputStyle} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="To Hit (e.g. +3)"><input type="text" placeholder="+3" value={toHit} onChange={e => setToHit(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none font-mono" style={inputStyle} /></Field>
          <Field label="Dice notation (optional)"><input type="text" placeholder="1d10+5" value={notation} onChange={e => setNotation(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none font-mono" style={inputStyle} /></Field>
        </div>
        <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div>
            <p className="text-sm font-semibold">Trackable uses</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>e.g. Second Wind, Action Surge</p>
          </div>
          <button onClick={() => setHasSlots(v => !v)}
            className="w-10 h-6 rounded-full transition-colors relative"
            style={{ background: hasSlots ? 'var(--gold)' : 'var(--surface)', border: '1px solid var(--border)' }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: hasSlots ? '18px' : '2px' }} />
          </button>
        </div>
        {hasSlots && (
          <Field label="Number of uses">
            <div className="flex items-center gap-3">
              <button onClick={() => setMaxSlots(v => Math.max(1, v - 1))}
                className="w-10 h-10 rounded-xl font-bold text-lg flex items-center justify-center"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>−</button>
              <span className="flex-1 text-center text-2xl font-bold">{maxSlots}</span>
              <button onClick={() => setMaxSlots(v => Math.min(10, v + 1))}
                className="w-10 h-10 rounded-xl font-bold text-lg flex items-center justify-center"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>+</button>
            </div>
          </Field>
        )}
        <button onClick={() => onSave({ name, description: desc, notation: notation || null, to_hit: toHit || null, has_slots: hasSlots, max_slots: hasSlots ? maxSlots : 1, used_slots: initial?.used_slots ?? 0 })}
          disabled={!name.trim()} className="w-full py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: 'var(--gold)', color: '#1c1917' }}>
          {initial ? 'Save Changes' : 'Add Special'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const inputStyle = { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-opacity hover:opacity-80"
      style={{ background: 'var(--surface)', border: '2px dashed var(--border)', color: 'var(--gold)' }}>
      <Plus size={18} /> {label}
    </button>
  )
}

function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <span className="text-4xl">{emoji}</span>
      <p style={{ color: 'var(--text-muted)' }}>{text}</p>
    </div>
  )
}

function DamageTypePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {DAMAGE_TYPES.map(dt => (
        <button key={dt.key} onClick={() => onChange(value === dt.key ? '' : dt.key)}
          title={dt.label}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm transition-all"
          style={{
            background: value === dt.key ? 'var(--gold)' : 'var(--surface-2)',
            border: `1px solid ${value === dt.key ? 'var(--gold)' : 'var(--border)'}`,
            color: value === dt.key ? '#1c1917' : 'var(--text)',
          }}>
          {dt.emoji} {dt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Edit Character Modal ─────────────────────────────────────────────────────

function EditCharModal({ char, onClose, onSave }: {
  char: Character; onClose: () => void
  onSave: (updates: { species?: string | null }) => Promise<void>
}) {
  const [species, setSpecies] = useState(char.species ?? '')
  const [saving, setSaving] = useState(false)
  const IS = { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }

  async function save() {
    setSaving(true)
    await onSave({ species: species.trim() || null })
    setSaving(false)
  }

  return (
    <Modal title="Edit Character" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Species</label>
          <input autoFocus type="text" list="ec-species-list" placeholder="Human, Elf…" value={species}
            onChange={e => setSpecies(e.target.value)}
            className="w-full px-4 py-3 rounded-xl outline-none"
            style={IS} />
          <datalist id="ec-species-list">
            {SPECIES.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>
        <button onClick={save} disabled={saving}
          className="w-full py-3 rounded-xl font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--gold)', color: '#1c1917' }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  )
}
