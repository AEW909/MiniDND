'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Character, CharacterSkill, CharacterAttack, CharacterSpell, CharacterSpellSlot, CharacterInventory } from '@/lib/types'
import {
  getAvatarEmoji, getDamageEmoji, abilityModifier, proficiencyBonus, formatModifier,
} from '@/lib/constants'
import { slotLevelLabel } from '@/lib/spell-slots'

type Section = 'skills' | 'attacks' | 'spells' | 'inventory'

interface CharData {
  char: Character
  skills: CharacterSkill[]
  attacks: CharacterAttack[]
  spells: CharacterSpell[]
  slots: CharacterSpellSlot[]
  inventory: CharacterInventory[]
  expanded: Set<Section>
}

export default function CampaignPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const router = useRouter()
  const [partyName, setPartyName] = useState('')
  const [charData, setCharData] = useState<CharData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
    // Realtime subscription for HP/inventory changes
    const channel = supabase.channel(`campaign-${partyId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'characters' }, ({ new: row }) => {
        setCharData(prev => prev.map(cd =>
          cd.char.id === row.id ? { ...cd, char: { ...cd.char, ...(row as Character) } } : cd
        ))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'character_inventory' }, () => {
        loadInventory()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'character_spell_slots' }, () => {
        loadSlots()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [partyId])

  async function load() {
    setLoading(true)
    const { data: party } = await supabase.from('parties').select('name').eq('id', partyId).single()
    setPartyName(party?.name ?? '')

    const { data: chars } = await supabase.from('characters').select('*').eq('party_id', partyId).order('sort_order').order('created_at')
    if (!chars) { setLoading(false); return }

    const ids = chars.map(c => c.id)
    const [
      { data: skills }, { data: attacks }, { data: spells }, { data: slots }, { data: inv }
    ] = await Promise.all([
      supabase.from('character_skills').select('*').in('character_id', ids),
      supabase.from('character_attacks').select('*').in('character_id', ids).order('sort_order'),
      supabase.from('character_spells').select('*').in('character_id', ids).order('spell_level'),
      supabase.from('character_spell_slots').select('*').in('character_id', ids).order('slot_level'),
      supabase.from('character_inventory').select('*').in('character_id', ids).order('sort_order'),
    ])

    setCharData(chars.map(char => ({
      char,
      skills: (skills ?? []).filter(s => s.character_id === char.id),
      attacks: (attacks ?? []).filter(a => a.character_id === char.id),
      spells: (spells ?? []).filter(s => s.character_id === char.id),
      slots: (slots ?? []).filter(s => s.character_id === char.id),
      inventory: (inv ?? []).filter(i => i.character_id === char.id),
      expanded: new Set(),
    })))
    setLoading(false)
  }

  async function loadInventory() {
    const ids = charData.map(cd => cd.char.id)
    if (!ids.length) return
    const { data } = await supabase.from('character_inventory').select('*').in('character_id', ids)
    setCharData(prev => prev.map(cd => ({
      ...cd,
      inventory: (data ?? []).filter(i => i.character_id === cd.char.id),
    })))
  }

  async function loadSlots() {
    const ids = charData.map(cd => cd.char.id)
    if (!ids.length) return
    const { data } = await supabase.from('character_spell_slots').select('*').in('character_id', ids).order('slot_level')
    setCharData(prev => prev.map(cd => ({
      ...cd,
      slots: (data ?? []).filter(s => s.character_id === cd.char.id),
    })))
  }

  async function updateHp(char: Character, delta: number) {
    const newHp = Math.max(0, Math.min(char.current_hp + delta, char.max_hp))
    // Optimistic update first so the bar moves immediately
    setCharData(prev => prev.map(cd =>
      cd.char.id === char.id ? { ...cd, char: { ...cd.char, current_hp: newHp } } : cd
    ))
    await supabase.from('characters').update({ current_hp: newHp }).eq('id', char.id)
  }

  async function longRest(charId: string, charSlots: CharacterSpellSlot[]) {
    if (!charSlots.length) return
    await Promise.all(charSlots.map(s =>
      supabase.from('character_spell_slots').update({ used_slots: 0 }).eq('id', s.id)
    ))
    setCharData(prev => prev.map(cd =>
      cd.char.id === charId
        ? { ...cd, slots: cd.slots.map(s => ({ ...s, used_slots: 0 })) }
        : cd
    ))
  }

  async function shortRest(charId: string, charSlots: CharacterSpellSlot[]) {
    // Short rest: restore Warlock pact slots only (other casters need long rest)
    // For simplicity, restore all slots — DM decides when to press
    await longRest(charId, charSlots)
  }

  async function updateQty(charId: string, item: CharacterInventory, delta: number) {
    const qty = item.quantity + delta
    if (qty <= 0) {
      setCharData(prev => prev.map(cd =>
        cd.char.id === charId
          ? { ...cd, inventory: cd.inventory.filter(i => i.id !== item.id) }
          : cd
      ))
      await supabase.from('character_inventory').delete().eq('id', item.id)
    } else {
      setCharData(prev => prev.map(cd =>
        cd.char.id === charId
          ? { ...cd, inventory: cd.inventory.map(i => i.id === item.id ? { ...i, quantity: qty } : i) }
          : cd
      ))
      await supabase.from('character_inventory').update({ quantity: qty }).eq('id', item.id)
    }
  }

  async function useSlot(charId: string, slot: CharacterSpellSlot) {
    if (slot.used_slots >= slot.max_slots) return
    const used = slot.used_slots + 1
    await supabase.from('character_spell_slots').update({ used_slots: used }).eq('id', slot.id)
    setCharData(prev => prev.map(cd =>
      cd.char.id === charId
        ? { ...cd, slots: cd.slots.map(s => s.id === slot.id ? { ...s, used_slots: used } : s) }
        : cd
    ))
  }

  async function restoreSlot(charId: string, slot: CharacterSpellSlot) {
    if (slot.used_slots <= 0) return
    const used = slot.used_slots - 1
    await supabase.from('character_spell_slots').update({ used_slots: used }).eq('id', slot.id)
    setCharData(prev => prev.map(cd =>
      cd.char.id === charId
        ? { ...cd, slots: cd.slots.map(s => s.id === slot.id ? { ...s, used_slots: used } : s) }
        : cd
    ))
  }

  function toggleSection(charId: string, section: Section) {
    setCharData(prev => prev.map(cd => {
      if (cd.char.id !== charId) return cd
      const exp = new Set(cd.expanded)
      exp.has(section) ? exp.delete(section) : exp.add(section)
      return { ...cd, expanded: exp }
    }))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-lg" style={{ color: 'var(--text-muted)' }}>
      Loading campaign…
    </div>
  )

  return (
    <div className="h-full flex flex-col" style={{ maxHeight: '100dvh' }}>
      <header className="shrink-0 px-4 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={22} />
        </button>
        <span className="text-xl">⚔️</span>
        <h1 className="text-lg font-bold" style={{ color: 'var(--gold)' }}>{partyName} — Campaign View</h1>
        <span className="text-xs ml-auto px-2 py-1 rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--success)' }}>
          ● Live
        </span>
      </header>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full" style={{ minWidth: `${charData.length * 280}px` }}>
          {charData.map(({ char, skills, attacks, spells, slots, inventory, expanded }) => {
            const prof = proficiencyBonus(char.level)
            const scores: Record<string, number> = {
              STR: char.str_score, DEX: char.dex_score, CON: char.con_score,
              INT: char.int_score, WIS: char.wis_score, CHA: char.cha_score,
            }
            const hpPct = Math.max(0, Math.min(1, char.current_hp / char.max_hp))
            const hpColor = hpPct > 0.5 ? 'var(--success)' : hpPct > 0.25 ? '#f59e0b' : 'var(--danger)'

            return (
              <div key={char.id} className="flex flex-col border-r overflow-y-auto"
                style={{ width: '280px', minWidth: '280px', borderColor: 'var(--border)', background: 'var(--background)' }}>

                {/* Character header */}
                <div className="sticky top-0 z-10 p-4" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">{getAvatarEmoji(char.avatar_key)}</span>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => router.push(`/character/${char.id}`)}
                        className="font-bold text-base truncate block hover:underline text-left w-full">
                        {char.name}
                      </button>
                      <p className="text-xs" style={{ color: 'var(--gold)' }}>
                        {char.class} · Lv {char.level}
                      </p>
                    </div>
                  </div>

                  {/* HP bar + controls */}
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => updateHp(char, -1)}
                      className="w-8 h-8 rounded-xl font-bold flex items-center justify-center shrink-0"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>−</button>
                    <div className="flex-1">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="font-bold" style={{ color: hpColor }}>{char.current_hp}</span>
                        <span style={{ color: 'var(--text-muted)' }}>/ {char.max_hp}</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: 'var(--surface-2)' }}>
                        <div className="h-full rounded-full transition-all" style={{ background: hpColor, width: `${hpPct * 100}%` }} />
                      </div>
                    </div>
                    <button onClick={() => updateHp(char, 1)}
                      className="w-8 h-8 rounded-xl font-bold flex items-center justify-center shrink-0"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>+</button>
                  </div>

                  <div className="flex gap-2 text-xs text-center mb-2">
                    <div className="flex-1 py-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Prof </span>
                      <span className="font-bold" style={{ color: 'var(--gold)' }}>+{prof}</span>
                    </div>
                    <div className="flex-1 py-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Speed </span>
                      <span className="font-bold">{char.speed}ft</span>
                    </div>
                  </div>

                  {/* Rest buttons */}
                  <div className="flex gap-1.5 text-xs">
                    <button onClick={() => shortRest(char.id, slots)}
                      className="flex-1 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-80"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                      title="Short Rest — restores spell slots">
                      💤 Short Rest
                    </button>
                    <button onClick={() => longRest(char.id, slots)}
                      className="flex-1 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-80"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--gold)', color: 'var(--gold)' }}
                      title="Long Rest — restores all spell slots">
                      🌙 Long Rest
                    </button>
                  </div>
                </div>

                {/* Expandable sections */}
                <div className="flex-1 flex flex-col">
                  {/* Skills */}
                  <Section label="Skills 🎯" isOpen={expanded.has('skills')} onToggle={() => toggleSection(char.id, 'skills')}>
                    {skills.map(skill => {
                      const base = abilityModifier(scores[skill.ability] ?? 10)
                      const mult = skill.is_expert ? 2 : skill.is_proficient ? 1 : 0
                      const mod = base + mult * prof
                      const dot = skill.is_expert ? 'var(--gold-light)' : skill.is_proficient ? 'var(--gold)' : 'var(--surface-2)'
                      return (
                        <div key={skill.id} className="flex items-center gap-2 px-4 py-1.5"
                          style={{ borderTop: '1px solid var(--border)' }}>
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot, border: `1.5px solid ${dot === 'var(--surface-2)' ? 'var(--border)' : dot}` }} />
                          <span className="flex-1 text-xs">{skill.skill_name}</span>
                          <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--gold)' }}>{formatModifier(mod)}</span>
                        </div>
                      )
                    })}
                  </Section>

                  {/* Attacks */}
                  <Section label="Attacks ⚔️" isOpen={expanded.has('attacks')} onToggle={() => toggleSection(char.id, 'attacks')}>
                    {attacks.length === 0
                      ? <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No attacks</p>
                      : attacks.map(atk => (
                        <div key={atk.id} className="flex items-center gap-2 px-4 py-2"
                          style={{ borderTop: '1px solid var(--border)' }}>
                          <span className="text-base">{getDamageEmoji(atk.damage_type) || '⚔️'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{atk.name}</p>
                            {atk.notation && <p className="text-xs font-mono" style={{ color: 'var(--gold)' }}>{atk.notation}</p>}
                            {atk.description && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{atk.description}</p>}
                          </div>
                        </div>
                      ))
                    }
                  </Section>

                  {/* Spell slots */}
                  <Section label="Spells ✨" isOpen={expanded.has('spells')} onToggle={() => toggleSection(char.id, 'spells')}>
                    {slots.length === 0 && spells.length === 0
                      ? <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No spells</p>
                      : <>
                        {slots.length > 0 && (
                          <div className="px-4 py-2 flex flex-col gap-1.5">
                            {slots.map(slot => {
                              const avail = slot.max_slots - slot.used_slots
                              return (
                                <div key={slot.id} className="flex items-center gap-2">
                                  <span className="text-xs w-7 shrink-0" style={{ color: 'var(--text-muted)' }}>
                                    {slotLevelLabel(slot.slot_level)}
                                  </span>
                                  <div className="flex gap-1 flex-wrap">
                                    {Array.from({ length: slot.max_slots }).map((_, i) => {
                                      const used = i >= avail
                                      return (
                                        <button key={i}
                                          onClick={() => used ? restoreSlot(char.id, slot) : useSlot(char.id, slot)}
                                          className="w-5 h-5 rounded-full transition-all"
                                          style={{
                                            background: used ? 'var(--surface-2)' : 'var(--gold)',
                                            border: `1.5px solid ${used ? 'var(--border)' : 'var(--gold)'}`,
                                          }} />
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        {spells.slice(0, 5).map(spell => (
                          <div key={spell.id} className="flex items-center gap-2 px-4 py-1.5"
                            style={{ borderTop: '1px solid var(--border)' }}>
                            <span className="text-sm">{getDamageEmoji(spell.damage_type) || '✨'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{spell.name}</p>
                              {spell.notation && <p className="text-xs font-mono" style={{ color: 'var(--gold)' }}>{spell.notation}</p>}
                              {spell.description && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{spell.description}</p>}
                            </div>
                          </div>
                        ))}
                      </>
                    }
                  </Section>

                  {/* Inventory */}
                  <Section label="Inventory 🎒" isOpen={expanded.has('inventory')} onToggle={() => toggleSection(char.id, 'inventory')}>
                    {inventory.length === 0
                      ? <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No items</p>
                      : inventory.map(item => (
                        <div key={item.id} className="flex items-center gap-2 px-4 py-2"
                          style={{ borderTop: '1px solid var(--border)' }}>
                          <span className="flex-1 text-xs truncate">{item.name}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateQty(char.id, item, -1)}
                              className="w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center"
                              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>−</button>
                            <span className="text-xs font-bold tabular-nums w-5 text-center">{item.quantity}</span>
                            <button onClick={() => updateQty(char.id, item, 1)}
                              className="w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center"
                              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>+</button>
                          </div>
                        </div>
                      ))
                    }
                  </Section>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Section({ label, isOpen, onToggle, children }: {
  label: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 font-semibold text-sm"
        style={{ background: 'var(--surface)' }}>
        {label}
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen && <div style={{ background: 'var(--background)' }}>{children}</div>}
    </div>
  )
}
