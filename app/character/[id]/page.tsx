'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  Character, CharacterSkill, CharacterAttack, CharacterSpell,
  CharacterSpellSlot, CharacterInventory, CharacterOther,
} from '@/lib/types'
import { getAvatarEmoji, proficiencyBonus } from '@/lib/constants'
import { applyTheme, resetToGlobalTheme } from '@/lib/theme'
import Modal from '@/components/Modal'
import { OverviewTab } from '@/components/character/OverviewTab'
import { SkillsTab } from '@/components/character/SkillsTab'
import { AttacksTab } from '@/components/character/AttacksTab'
import { SpellsTab } from '@/components/character/SpellsTab'
import { InventoryTab } from '@/components/character/InventoryTab'
import { OtherTab } from '@/components/character/OtherTab'
import {
  AddAttackModal, AddSpellModal, AddInventoryModal, AddOtherModal, EditCharModal,
} from '@/components/character/Modals'

type Tab = 'overview' | 'skills' | 'attacks' | 'spells' | 'inventory' | 'other'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'overview', label: 'Overview', emoji: '📋' },
  { id: 'skills', label: 'Skills', emoji: '🎯' },
  { id: 'attacks', label: 'Attacks', emoji: '⚔️' },
  { id: 'spells', label: 'Spells', emoji: '✨' },
  { id: 'inventory', label: 'Inventory', emoji: '🎒' },
  { id: 'other', label: 'Specials', emoji: '⚡' },
]

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

  // Modal visibility
  const [showAddAttack, setShowAddAttack] = useState(false)
  const [showAddSpell, setShowAddSpell] = useState(false)
  const [showAddInventory, setShowAddInventory] = useState(false)
  const [showAddOther, setShowAddOther] = useState(false)
  const [showEditChar, setShowEditChar] = useState(false)

  // Edit targets
  const [editingAttack, setEditingAttack] = useState<CharacterAttack | null>(null)
  const [editingSpell, setEditingSpell] = useState<CharacterSpell | null>(null)
  const [editingOther, setEditingOther] = useState<CharacterOther | null>(null)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [
      { data: c }, { data: sk }, { data: at }, { data: sp },
      { data: sl }, { data: inv }, { data: ot },
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
        }} onDelete={deleteCharacter} />
      )}
    </div>
  )
}
