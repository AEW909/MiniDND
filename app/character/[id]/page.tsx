'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  Character, CharacterSkill, CharacterAttack, CharacterSpell,
  CharacterSpellSlot, CharacterInventory, CharacterOther,
} from '@/lib/types'
import {
  CLASSES, AVATARS, DAMAGE_TYPES, ABILITY_LABELS,
  getAvatarEmoji, getDamageEmoji, getDamageColor, getDamageLabel, abilityModifier, proficiencyBonus, formatModifier,
} from '@/lib/constants'
import { getSpellSlots, isCasterClass, slotLevelLabel } from '@/lib/spell-slots'
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
          <h1 className="font-display font-bold text-lg leading-tight truncate">{char.name}</h1>
          <p className="text-xs" style={{ color: 'var(--gold)' }}>
            {char.class}{char.subclass ? ` · ${char.subclass}` : ''} · Lv {char.level}
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
          <OverviewTab char={char} prof={prof} scores={scores} />
        )}
        {tab === 'skills' && (
          <SkillsTab skills={skills} scores={scores} prof={prof} onToggle={toggleSkill} />
        )}
        {tab === 'attacks' && (
          <AttacksTab attacks={attacks} onAdd={() => setShowAddAttack(true)} onDelete={deleteAttack} />
        )}
        {tab === 'spells' && (
          <SpellsTab
            spells={spells} slots={slots}
            onAdd={() => setShowAddSpell(true)} onDelete={deleteSpell}
            onUseSlot={useSlot} onRestoreSlot={restoreSlot} onRestoreAll={restoreAllSlots}
            charClass={char.class} subclass={char.subclass} level={char.level}
          />
        )}
        {tab === 'inventory' && (
          <InventoryTab inventory={inventory} onAdd={() => setShowAddInventory(true)} onUpdateQty={updateQty} onDelete={deleteInventory} />
        )}
        {tab === 'other' && (
          <OtherTab other={other} onAdd={() => setShowAddOther(true)} onDelete={deleteOther} />
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
    </div>
  )
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ char, prof, scores }: { char: Character; prof: number; scores: Record<string, number> }) {
  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Core stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <StatPill label="Proficiency" value={`+${prof}`} />
        <StatPill label="Speed" value={`${char.speed} ft`} />
        <StatPill label="Level" value={String(char.level)} />
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
                <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {mod >= 0 ? '+' : ''}{mod}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Saving throws derived */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          Saving Throws <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(base modifier only)</span>
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(scores).map(([ab, score]) => (
            <div key={ab} className="flex items-center justify-between px-3 py-2 rounded-xl"
              style={{ background: 'var(--surface-2)' }}>
              <span className="text-sm font-medium">{ABILITY_LABELS[ab]}</span>
              <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
                {formatModifier(abilityModifier(score))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
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

// ─── Attacks Tab ─────────────────────────────────────────────────────────────

function AttacksTab({ attacks, onAdd, onDelete }: {
  attacks: CharacterAttack[]; onAdd: () => void; onDelete: (a: CharacterAttack) => void
}) {
  return (
    <div className="p-4 flex flex-col gap-3">
      <AddButton onClick={onAdd} label="Add Attack" />
      {attacks.length === 0 && <EmptyState emoji="⚔️" text="No attacks yet" />}
      {attacks.map(atk => (
        <div key={atk.id} className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
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
            {atk.notation && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-lg text-sm font-mono font-bold"
                style={{ background: 'var(--surface-2)', color: 'var(--gold)' }}>
                {atk.notation}
              </span>
            )}
          </div>
          <button onClick={() => onDelete(atk)} className="p-1 rounded-lg shrink-0"
            style={{ color: 'var(--text-muted)' }}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Spells Tab ───────────────────────────────────────────────────────────────

function SpellsTab({ spells, slots, onAdd, onDelete, onUseSlot, onRestoreSlot, onRestoreAll, charClass, subclass, level }: {
  spells: CharacterSpell[]; slots: CharacterSpellSlot[]
  onAdd: () => void; onDelete: (s: CharacterSpell) => void
  onUseSlot: (s: CharacterSpellSlot) => void; onRestoreSlot: (s: CharacterSpellSlot) => void
  onRestoreAll: () => void
  charClass: string; subclass: string | null; level: number
}) {
  const byLevel = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].reduce<Record<number, CharacterSpell[]>>((acc, l) => {
    acc[l] = spells.filter(s => s.spell_level === l)
    return acc
  }, {})

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
            {byLevel[l].map(spell => (
              <div key={spell.id} className="flex items-start gap-3 px-4 py-3"
                style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
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
                  {spell.notation && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-lg text-xs font-mono font-bold"
                      style={{ background: 'var(--surface)', color: 'var(--gold)' }}>
                      {spell.notation}
                    </span>
                  )}
                </div>
                <button onClick={() => onDelete(spell)} className="p-1 shrink-0" style={{ color: 'var(--text-muted)' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ─── Inventory Tab ────────────────────────────────────────────────────────────

function InventoryTab({ inventory, onAdd, onUpdateQty, onDelete }: {
  inventory: CharacterInventory[]
  onAdd: () => void
  onUpdateQty: (item: CharacterInventory, delta: number) => void
  onDelete: (item: CharacterInventory) => void
}) {
  return (
    <div className="p-4 flex flex-col gap-3">
      <AddButton onClick={onAdd} label="Add Item" />
      {inventory.length === 0 && <EmptyState emoji="🎒" text="Inventory empty" />}
      {inventory.map(item => (
        <div key={item.id} className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
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
      ))}
    </div>
  )
}

// ─── Specials Tab ─────────────────────────────────────────────────────────────

function OtherTab({ other, onAdd, onDelete }: {
  other: CharacterOther[]; onAdd: () => void; onDelete: (o: CharacterOther) => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setExpanded(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })
  return (
    <div className="p-4 flex flex-col gap-3">
      <AddButton onClick={onAdd} label="Add Special" />
      {other.length === 0 && <EmptyState emoji="⚡" text="No specials yet" />}
      {other.map(item => (
        <div key={item.id} className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div onClick={() => toggle(item.id)}
            className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
            <span className="flex-1 text-left font-bold">{item.name}</span>
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
            {expanded.has(item.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <button onClick={e => { e.stopPropagation(); onDelete(item) }} className="p-1 ml-1" style={{ color: 'var(--text-muted)' }}>
              <Trash2 size={15} />
            </button>
          </div>
          {expanded.has(item.id) && item.description && (
            <div className="px-4 pb-3 text-sm" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
              {item.description}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Add Modals ───────────────────────────────────────────────────────────────

function AddAttackModal({ onClose, onSave }: { onClose: () => void; onSave: (d: object) => void }) {
  const [name, setName] = useState(''); const [desc, setDesc] = useState('')
  const [notation, setNotation] = useState(''); const [dmgType, setDmgType] = useState('')
  return (
    <Modal title="Add Attack" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Name"><input autoFocus type="text" placeholder="Longsword" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none" style={inputStyle} /></Field>
        <Field label="Description"><input type="text" placeholder="Melee weapon attack" value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none" style={inputStyle} /></Field>
        <Field label="Dice notation"><input type="text" placeholder="1d8+3" value={notation} onChange={e => setNotation(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none font-mono" style={inputStyle} /></Field>
        <Field label="Damage type">
          <DamageTypePicker value={dmgType} onChange={setDmgType} />
        </Field>
        <button onClick={() => onSave({ name, description: desc, notation, damage_type: dmgType || null })}
          disabled={!name.trim()} className="w-full py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: 'var(--gold)', color: '#1c1917' }}>
          Add Attack
        </button>
      </div>
    </Modal>
  )
}

function AddSpellModal({ onClose, onSave }: { onClose: () => void; onSave: (d: object) => void }) {
  const [name, setName] = useState(''); const [desc, setDesc] = useState('')
  const [notation, setNotation] = useState(''); const [dmgType, setDmgType] = useState('')
  const [level, setLevel] = useState('0')
  return (
    <Modal title="Add Spell" onClose={onClose}>
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
        <Field label="Dice notation"><input type="text" placeholder="8d6" value={notation} onChange={e => setNotation(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none font-mono" style={inputStyle} /></Field>
        <Field label="Damage type"><DamageTypePicker value={dmgType} onChange={setDmgType} /></Field>
        <button onClick={() => onSave({ name, description: desc, notation, damage_type: dmgType || null, spell_level: parseInt(level) })}
          disabled={!name.trim()} className="w-full py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: 'var(--gold)', color: '#1c1917' }}>
          Add Spell
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

function AddOtherModal({ onClose, onSave }: { onClose: () => void; onSave: (d: object) => void }) {
  const [name, setName] = useState(''); const [desc, setDesc] = useState(''); const [notation, setNotation] = useState('')
  const [hasSlots, setHasSlots] = useState(false); const [maxSlots, setMaxSlots] = useState(1)
  return (
    <Modal title="Add Special" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Name"><input autoFocus type="text" placeholder="Second Wind" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none" style={inputStyle} /></Field>
        <Field label="Description"><input type="text" placeholder="Regain HP as a bonus action…" value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none" style={inputStyle} /></Field>
        <Field label="Dice notation (optional)"><input type="text" placeholder="1d10+5" value={notation} onChange={e => setNotation(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none font-mono" style={inputStyle} /></Field>
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
        <button onClick={() => onSave({ name, description: desc, notation: notation || null, has_slots: hasSlots, max_slots: hasSlots ? maxSlots : 1, used_slots: 0 })}
          disabled={!name.trim()} className="w-full py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: 'var(--gold)', color: '#1c1917' }}>
          Add Special
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
