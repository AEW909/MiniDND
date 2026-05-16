'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, ChevronUp, Swords } from 'lucide-react'
import { applyTheme, resetToGlobalTheme } from '@/lib/theme'
import { supabase } from '@/lib/supabase'
import { Character, CharacterSkill, CharacterAttack, CharacterSpell, CharacterSpellSlot, CharacterInventory, CharacterOther } from '@/lib/types'
import {
  getAvatarEmoji, getDamageEmoji, getDamageColor, getDamageLabel, abilityModifier, proficiencyBonus, formatModifier, getPartyIcon, ABILITY_EMOJI, CONDITIONS,
} from '@/lib/constants'
import { slotLevelLabel } from '@/lib/spell-slots'
import { InitEntry, InitPanel } from '@/components/campaign/InitPanel'
import { SectionPanel, RestPanel } from '@/components/campaign/Section'

type SectionKey = 'skills' | 'attacks' | 'spells' | 'inventory' | 'specials'

interface CharData {
  char: Character
  skills: CharacterSkill[]
  attacks: CharacterAttack[]
  spells: CharacterSpell[]
  slots: CharacterSpellSlot[]
  inventory: CharacterInventory[]
  specials: CharacterOther[]
  expanded: SectionKey | null
  restOpen: boolean
  skillsOpen: boolean
  conditionsOpen: boolean
}

export default function CampaignPage() {
  const { partyId } = useParams<{ partyId: string }>()
  const router = useRouter()
  const [partyName, setPartyName] = useState('')
  const [partyBg, setPartyBg] = useState<string | null>(null)
  const [partyIconKey, setPartyIconKey] = useState<string | null>(null)
  const [simplifiedSkills, setSimplifiedSkills] = useState(false)
  const [skillsSort, setSkillsSort] = useState<'alpha' | 'ability'>('alpha')
  const [charData, setCharData] = useState<CharData[]>([])
  const [loading, setLoading] = useState(true)
  const [hpEdit, setHpEdit] = useState<{ charId: string; value: string } | null>(null)
  const [showInit, setShowInit] = useState(false)
  const [initEntries, setInitEntries] = useState<InitEntry[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [round, setRound] = useState(1)

  useEffect(() => {
    load()
    const channel = supabase.channel(`campaign-${partyId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'dnd', table: 'characters' }, ({ new: row }) => {
        setCharData(prev => prev.map(cd =>
          cd.char.id === row.id ? { ...cd, char: { ...cd.char, ...(row as Character) } } : cd
        ))
      })
      .on('postgres_changes', { event: '*', schema: 'dnd', table: 'character_inventory' }, () => {
        loadInventory()
      })
      .on('postgres_changes', { event: '*', schema: 'dnd', table: 'character_spell_slots' }, () => {
        loadSlots()
      })
      .on('postgres_changes', { event: '*', schema: 'dnd', table: 'character_other' }, () => {
        loadSpecials()
      })
      .on('postgres_changes', { event: '*', schema: 'dnd', table: 'encounters', filter: `party_id=eq.${partyId}` }, ({ eventType, new: row }) => {
        if (eventType === 'DELETE') {
          setInitEntries([]); setCurrentId(null); setRound(1); setShowInit(false)
          return
        }
        const enc = row as { entries: InitEntry[]; current_id: string | null; round: number; is_active: boolean }
        setInitEntries(enc.entries ?? [])
        setCurrentId(enc.current_id ?? null)
        setRound(enc.round ?? 1)
        setShowInit(!!enc.is_active)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [partyId])

  async function load() {
    setLoading(true)
    const { data: party } = await supabase.from('parties').select('name, background_url, icon_key, theme, simplified_skills, skills_sort').eq('id', partyId).single()
    setPartyName(party?.name ?? '')
    setPartyBg(party?.background_url ?? null)
    setPartyIconKey(party?.icon_key ?? null)
    setSimplifiedSkills(party?.simplified_skills ?? false)
    setSkillsSort((party?.skills_sort as 'alpha' | 'ability') ?? 'alpha')
    if (party?.theme) applyTheme(party.theme as Parameters<typeof applyTheme>[0])
    else resetToGlobalTheme()

    const { data: chars } = await supabase.from('characters').select('*').eq('party_id', partyId).order('sort_order').order('created_at')
    if (!chars) { setLoading(false); return }

    const ids = chars.map(c => c.id)
    const [
      { data: skills }, { data: attacks }, { data: spells }, { data: slots }, { data: inv }, { data: specials }
    ] = await Promise.all([
      supabase.from('character_skills').select('*').in('character_id', ids),
      supabase.from('character_attacks').select('*').in('character_id', ids).order('sort_order'),
      supabase.from('character_spells').select('*').in('character_id', ids).order('spell_level'),
      supabase.from('character_spell_slots').select('*').in('character_id', ids).order('slot_level'),
      supabase.from('character_inventory').select('*').in('character_id', ids).order('sort_order'),
      supabase.from('character_other').select('*').in('character_id', ids).order('sort_order'),
    ])

    setCharData(chars.map(char => ({
      char,
      skills: (skills ?? []).filter(s => s.character_id === char.id),
      attacks: (attacks ?? []).filter(a => a.character_id === char.id),
      spells: (spells ?? []).filter(s => s.character_id === char.id),
      slots: (slots ?? []).filter(s => s.character_id === char.id),
      inventory: (inv ?? []).filter(i => i.character_id === char.id),
      specials: (specials ?? []).filter(s => s.character_id === char.id),
      expanded: null,
      restOpen: false,
      skillsOpen: true,
      conditionsOpen: false,
    })))

    const { data: enc } = await supabase.from('encounters').select('*').eq('party_id', partyId).single()
    if (enc?.is_active) {
      setInitEntries(enc.entries ?? [])
      setCurrentId(enc.current_id ?? null)
      setRound(enc.round ?? 1)
      setShowInit(true)
    }

    setLoading(false)
  }

  async function getPartyCharIds() {
    const { data } = await supabase.from('characters').select('id').eq('party_id', partyId)
    return (data ?? []).map(c => c.id)
  }

  async function loadInventory() {
    const ids = await getPartyCharIds()
    if (!ids.length) return
    const { data } = await supabase.from('character_inventory').select('*').in('character_id', ids)
    setCharData(prev => prev.map(cd => ({
      ...cd,
      inventory: (data ?? []).filter(i => i.character_id === cd.char.id),
    })))
  }

  async function loadSlots() {
    const ids = await getPartyCharIds()
    if (!ids.length) return
    const { data } = await supabase.from('character_spell_slots').select('*').in('character_id', ids).order('slot_level')
    setCharData(prev => prev.map(cd => ({
      ...cd,
      slots: (data ?? []).filter(s => s.character_id === cd.char.id),
    })))
  }

  async function loadSpecials() {
    const ids = await getPartyCharIds()
    if (!ids.length) return
    const { data } = await supabase.from('character_other').select('*').in('character_id', ids).order('sort_order')
    setCharData(prev => prev.map(cd => ({
      ...cd,
      specials: (data ?? []).filter(s => s.character_id === cd.char.id),
    })))
  }

  async function applyHpChange(char: Character, newHp: number, newTemp: number) {
    const clearSaves = char.current_hp === 0 && newHp > 0
    const dbUpdate: Record<string, unknown> = { current_hp: newHp, temp_hp: newTemp }
    if (clearSaves) dbUpdate.death_saves = { successes: 0, failures: 0 }
    setCharData(prev => prev.map(cd =>
      cd.char.id === char.id
        ? { ...cd, char: { ...cd.char, current_hp: newHp, temp_hp: newTemp, ...(clearSaves ? { death_saves: { successes: 0, failures: 0 } } : {}) } }
        : cd
    ))
    await supabase.from('characters').update(dbUpdate).eq('id', char.id)
  }

  async function tapDeathSave(char: Character, type: 'success' | 'failure', index: number) {
    const ds = char.death_saves ?? { successes: 0, failures: 0 }
    let { successes, failures } = ds
    if (type === 'success') {
      successes = index < successes ? index : Math.min(3, index + 1)
    } else {
      failures = index < failures ? index : Math.min(3, index + 1)
    }
    const newDs = { successes, failures }
    setCharData(prev => prev.map(cd =>
      cd.char.id === char.id ? { ...cd, char: { ...cd.char, death_saves: newDs } } : cd
    ))
    await supabase.from('characters').update({ death_saves: newDs }).eq('id', char.id)
  }

  function damageChar(char: Character, damage: number): [number, number] {
    if (char.temp_hp >= damage) return [char.current_hp, char.temp_hp - damage]
    const remaining = damage - char.temp_hp
    return [Math.max(0, char.current_hp - remaining), 0]
  }

  async function updateHp(char: Character, delta: number) {
    if (delta < 0) {
      const [newHp, newTemp] = damageChar(char, -delta)
      await applyHpChange(char, newHp, newTemp)
    } else {
      await applyHpChange(char, Math.min(char.max_hp, char.current_hp + delta), char.temp_hp)
    }
  }

  async function addTemp(char: Character) {
    await applyHpChange(char, char.current_hp, char.temp_hp + 1)
  }

  async function clearTemp(char: Character) {
    await applyHpChange(char, char.current_hp, 0)
  }

  async function saveHp(char: Character, rawValue: string) {
    const parsed = parseInt(rawValue)
    setHpEdit(null)
    if (isNaN(parsed)) return
    const oldEffective = char.current_hp + char.temp_hp
    let newHp: number, newTemp: number
    if (parsed < oldEffective) {
      ;[newHp, newTemp] = damageChar(char, oldEffective - parsed)
    } else {
      newHp = Math.min(char.max_hp, parsed)
      newTemp = char.temp_hp
    }
    await applyHpChange(char, newHp, newTemp)
  }

  async function doRest(charId: string, opts: { spellSlots: boolean; specials: boolean; hp: boolean }) {
    const cd = charData.find(c => c.char.id === charId)
    if (!cd) return
    const awaitables: PromiseLike<unknown>[] = []

    if (opts.spellSlots && cd.slots.length) {
      awaitables.push(...cd.slots.map(s =>
        supabase.from('character_spell_slots').update({ used_slots: 0 }).eq('id', s.id)
      ))
    }
    if (opts.specials) {
      awaitables.push(...cd.specials.filter(s => s.has_slots).map(s =>
        supabase.from('character_other').update({ used_slots: 0 }).eq('id', s.id)
      ))
    }
    if (opts.hp) {
      awaitables.push(supabase.from('characters').update({ current_hp: cd.char.max_hp, temp_hp: 0, death_saves: { successes: 0, failures: 0 } }).eq('id', charId))
    }

    await Promise.all(awaitables)

    setCharData(prev => prev.map(c => {
      if (c.char.id !== charId) return c
      return {
        ...c,
        char: opts.hp ? { ...c.char, current_hp: c.char.max_hp, temp_hp: 0, death_saves: { successes: 0, failures: 0 } } : c.char,
        slots: opts.spellSlots ? c.slots.map(s => ({ ...s, used_slots: 0 })) : c.slots,
        specials: opts.specials ? c.specials.map(s => s.has_slots ? { ...s, used_slots: 0 } : s) : c.specials,
        restOpen: false,
      }
    }))
  }

  async function useSpecial(charId: string, item: CharacterOther) {
    if (item.used_slots >= item.max_slots) return
    const used = item.used_slots + 1
    await supabase.from('character_other').update({ used_slots: used }).eq('id', item.id)
    setCharData(prev => prev.map(cd =>
      cd.char.id === charId
        ? { ...cd, specials: cd.specials.map(s => s.id === item.id ? { ...s, used_slots: used } : s) }
        : cd
    ))
  }

  async function restoreSpecial(charId: string, item: CharacterOther) {
    if (item.used_slots <= 0) return
    const used = item.used_slots - 1
    await supabase.from('character_other').update({ used_slots: used }).eq('id', item.id)
    setCharData(prev => prev.map(cd =>
      cd.char.id === charId
        ? { ...cd, specials: cd.specials.map(s => s.id === item.id ? { ...s, used_slots: used } : s) }
        : cd
    ))
  }

  function toggleRestOpen(charId: string) {
    setCharData(prev => prev.map(cd =>
      cd.char.id === charId ? { ...cd, restOpen: !cd.restOpen } : cd
    ))
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

  function toggleSection(charId: string, section: SectionKey) {
    setCharData(prev => prev.map(cd => {
      if (cd.char.id !== charId) return cd
      return { ...cd, expanded: cd.expanded === section ? null : section }
    }))
  }

  function toggleSkillsOpen(charId: string) {
    setCharData(prev => prev.map(cd =>
      cd.char.id === charId ? { ...cd, skillsOpen: !cd.skillsOpen } : cd
    ))
  }

  function toggleConditionsOpen(charId: string) {
    setCharData(prev => prev.map(cd =>
      cd.char.id === charId ? { ...cd, conditionsOpen: !cd.conditionsOpen } : cd
    ))
  }

  async function toggleCondition(charId: string, conditionKey: string) {
    const cd = charData.find(c => c.char.id === charId)
    if (!cd) return
    const current = cd.char.conditions ?? []
    const next = current.includes(conditionKey)
      ? current.filter(c => c !== conditionKey)
      : [...current, conditionKey]
    setCharData(prev => prev.map(c =>
      c.char.id === charId ? { ...c, char: { ...c.char, conditions: next } } : c
    ))
    await supabase.from('characters').update({ conditions: next }).eq('id', charId)
  }

  function buildPcEntries() {
    return charData.map(cd => ({
      id: cd.char.id,
      name: cd.char.name,
      type: 'pc' as const,
      side: 'neutral' as const,
      desc: `${cd.char.class} · Lv ${cd.char.level}`,
      charId: cd.char.id,
    }))
  }

  async function saveEncounter(state: { entries: InitEntry[]; current_id: string | null; round: number; is_active: boolean }) {
    await supabase.from('encounters').upsert({ party_id: partyId, ...state }, { onConflict: 'party_id' })
  }

  async function openInit() {
    if (showInit) { setShowInit(false); return }
    if (initEntries.length === 0) {
      const pcs = buildPcEntries()
      setInitEntries(pcs); setCurrentId(null); setRound(1)
      await saveEncounter({ entries: pcs, current_id: null, round: 1, is_active: true })
    } else {
      const newPcs = charData
        .filter(cd => !initEntries.some(e => e.charId === cd.char.id))
        .map(cd => ({ id: cd.char.id, name: cd.char.name, type: 'pc' as const, side: 'neutral' as const, desc: `${cd.char.class} · Lv ${cd.char.level}`, charId: cd.char.id }))
      if (newPcs.length > 0) {
        const updated = [...initEntries, ...newPcs]
        setInitEntries(updated)
        await saveEncounter({ entries: updated, current_id: currentId, round, is_active: true })
      }
    }
    setShowInit(true)
  }

  async function handleAddNpc(entry: Omit<InitEntry, 'id'>) {
    const newEntry = { ...entry, id: `npc-${Date.now()}` }
    const newEntries = [...initEntries, newEntry]
    setInitEntries(newEntries)
    await saveEncounter({ entries: newEntries, current_id: currentId, round, is_active: true })
  }

  async function handleRemoveEntry(id: string) {
    const newEntries = initEntries.filter(e => e.id !== id)
    let newCurrentId = currentId
    if (currentId === id) {
      const idx = initEntries.findIndex(e => e.id === id)
      newCurrentId = newEntries[idx]?.id ?? newEntries[idx - 1]?.id ?? null
    }
    setInitEntries(newEntries); setCurrentId(newCurrentId)
    await saveEncounter({ entries: newEntries, current_id: newCurrentId, round, is_active: true })
  }

  async function handleNext() {
    if (initEntries.length === 0) return
    let newCurrentId: string
    let newRound = round
    if (currentId === null) {
      newCurrentId = initEntries[0].id
    } else {
      const idx = initEntries.findIndex(e => e.id === currentId)
      if (idx === -1 || idx >= initEntries.length - 1) {
        newCurrentId = initEntries[0].id; newRound = round + 1
      } else {
        newCurrentId = initEntries[idx + 1].id
      }
    }
    setCurrentId(newCurrentId); setRound(newRound)
    await saveEncounter({ entries: initEntries, current_id: newCurrentId, round: newRound, is_active: true })
  }

  async function handleEndEncounter() {
    setInitEntries([]); setCurrentId(null); setRound(1); setShowInit(false)
    await saveEncounter({ entries: [], current_id: null, round: 1, is_active: false })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-lg" style={{ color: 'var(--text-muted)' }}>
      Loading campaign…
    </div>
  )

  const bgStyle = partyBg ? {
    backgroundImage: `linear-gradient(var(--overlay-color), var(--overlay-color)), url(${partyBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } : {}

  return (
    <div className="h-full flex flex-col" style={{ maxHeight: '100dvh', ...bgStyle }}>
      <header className="shrink-0 px-4 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={22} />
        </button>
        <span className="text-xl">{getPartyIcon(partyIconKey)}</span>
        <h1 className="font-display text-lg font-bold" style={{ color: 'var(--gold)' }}>{partyName} — Campaign View</h1>
        <span className="text-xs ml-auto px-2 py-1 rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--success)' }}>
          ● Live
        </span>
        <button onClick={openInit} title="Initiative Tracker"
          className="p-2 rounded-xl transition-colors"
          style={{
            background: showInit ? 'color-mix(in srgb, var(--gold) 20%, var(--surface-2))' : 'var(--surface-2)',
            border: `1px solid ${showInit ? 'var(--gold)' : 'var(--border)'}`,
            color: showInit ? 'var(--gold)' : 'var(--text-muted)',
          }}>
          <Swords size={18} />
        </button>
      </header>

      {showInit && (
        <InitPanel
          entries={initEntries}
          currentId={currentId}
          round={round}
          partyChars={charData.map(cd => ({ id: cd.char.id, name: cd.char.name, className: cd.char.class, level: cd.char.level }))}
          onClose={() => setShowInit(false)}
          onReorder={async (e) => { setInitEntries(e); await saveEncounter({ entries: e, current_id: currentId, round, is_active: true }) }}
          onAdd={handleAddNpc}
          onRemove={handleRemoveEntry}
          onNext={handleNext}
          onEnd={handleEndEncounter}
        />
      )}

      <div className="flex-1 overflow-x-auto [overflow-y:clip] snap-x snap-mandatory md:snap-none">
        <div className="flex h-full">
          {charData.map(({ char, skills, attacks, spells, slots, inventory, specials, expanded, restOpen, skillsOpen, conditionsOpen }) => {
            const prof = proficiencyBonus(char.level)
            const scores: Record<string, number> = {
              STR: char.str_score, DEX: char.dex_score, CON: char.con_score,
              INT: char.int_score, WIS: char.wis_score, CHA: char.cha_score,
            }
            const wisMod = abilityModifier(char.wis_score)
            const initMod = abilityModifier(char.dex_score)
            const perceptionSkill = skills.find(s => s.skill_name === 'Perception')
            const insightSkill = skills.find(s => s.skill_name === 'Insight')
            const passivePerc = 10 + wisMod + (perceptionSkill?.is_proficient ? (perceptionSkill.is_expert ? 2 : 1) * prof : 0)
            const passiveWis = 10 + wisMod
            const passiveIns = 10 + wisMod + (insightSkill?.is_proficient ? (insightSkill.is_expert ? 2 : 1) * prof : 0)
            const effectiveHp = char.current_hp + char.temp_hp
            const hasTemp = char.temp_hp > 0
            const rawHpPct = char.max_hp > 0 ? Math.max(0, Math.min(1, char.current_hp / char.max_hp)) : 0
            const MIN_TEMP = 0.05
            const visibleTempPct = hasTemp
              ? Math.max(MIN_TEMP, Math.min(char.temp_hp / char.max_hp, 1 - rawHpPct))
              : 0
            const hpPct = hasTemp ? Math.min(rawHpPct, 1 - MIN_TEMP) : rawHpPct
            const tempPct = visibleTempPct
            const gradientColor = (() => {
              if (hpPct >= 0.5) {
                const t = (hpPct - 0.5) / 0.5
                return `rgb(${Math.round(34 + (245 - 34) * (1 - t))},${Math.round(197 + (158 - 197) * (1 - t))},${Math.round(94 + (11 - 94) * (1 - t))})`
              } else {
                const t = hpPct / 0.5
                return `rgb(${Math.round(245 + (239 - 245) * (1 - t))},${Math.round(158 + (68 - 158) * (1 - t))},${Math.round(11 + (68 - 11) * (1 - t))})`
              }
            })()
            const numberColor = hasTemp ? '#60a5fa' : gradientColor

            return (
              <div key={char.id} className="flex flex-col border-r overflow-y-auto snap-start w-[100dvw] shrink-0 md:w-[300px] md:min-w-[300px]"
                style={{ borderColor: 'var(--border)' }}>

                {/* Character header */}
                <div className="sticky top-0 z-10 p-4" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">{getAvatarEmoji(char.avatar_key)}</span>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => router.push(`/character/${char.id}`)}
                        className="font-display font-bold text-base truncate block hover:underline text-left w-full">
                        {char.name}
                      </button>
                      <p className="text-xs" style={{ color: 'var(--gold)' }}>
                        {char.class} · Lv {char.level}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleConditionsOpen(char.id)}
                      title="Conditions"
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base transition-all"
                      style={{
                        background: conditionsOpen ? 'color-mix(in srgb, var(--gold) 20%, var(--surface-2))' : 'var(--surface-2)',
                        border: `1px solid ${conditionsOpen ? 'var(--gold)' : 'var(--border)'}`,
                      }}>
                      ⚠️
                    </button>
                  </div>

                  {/* Active condition badges */}
                  {(char.conditions ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(char.conditions ?? []).map(key => {
                        const cond = CONDITIONS.find(c => c.key === key)
                        if (!cond) return null
                        return (
                          <button key={key}
                            onClick={() => toggleCondition(char.id, key)}
                            title={`Remove ${cond.label}`}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold"
                            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}>
                            {cond.emoji} {cond.label}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Condition picker */}
                  {conditionsOpen && (
                    <div className="mb-2 p-2 rounded-xl flex flex-wrap gap-1.5"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      {CONDITIONS.map(cond => {
                        const active = (char.conditions ?? []).includes(cond.key)
                        return (
                          <button key={cond.key}
                            onClick={() => toggleCondition(char.id, cond.key)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all"
                            style={{
                              background: active ? 'rgba(239,68,68,0.2)' : 'var(--surface)',
                              border: `1px solid ${active ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
                              color: active ? '#ef4444' : 'var(--text)',
                            }}>
                            {cond.emoji} {cond.label}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* HP bar + controls */}
                  <div className="flex items-center gap-2 mb-1">
                    <button onClick={() => updateHp(char, -1)}
                      className="w-8 h-8 rounded-xl font-bold flex items-center justify-center shrink-0"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>−</button>
                    <div className="flex-1">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        {hpEdit?.charId === char.id ? (
                          <input autoFocus type="number" min={0}
                            value={hpEdit.value}
                            onChange={e => setHpEdit(prev => prev && { ...prev, value: e.target.value })}
                            onBlur={() => saveHp(char, hpEdit.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveHp(char, hpEdit.value); if (e.key === 'Escape') setHpEdit(null) }}
                            className="w-14 text-center font-bold text-sm rounded-lg outline-none"
                            style={{ background: 'var(--surface-2)', color: numberColor, border: `1px solid ${numberColor}` }} />
                        ) : (
                          <span className="font-bold cursor-pointer"
                            style={{ color: numberColor }}
                            onClick={() => setHpEdit({ charId: char.id, value: String(effectiveHp) })}>
                            {effectiveHp}
                          </span>
                        )}
                        <span style={{ color: 'var(--text-muted)' }}>/ {char.max_hp}</span>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden flex" style={{ background: 'var(--surface-2)' }}>
                        <div className="h-full transition-all duration-300 shrink-0"
                          style={{ background: gradientColor, width: `${hpPct * 100}%` }} />
                        {hasTemp && (
                          <div className="h-full transition-all duration-300 shrink-0"
                            style={{ background: '#3b82f6', width: `${Math.min(char.temp_hp / char.max_hp, 1 - hpPct) * 100}%`, minWidth: hasTemp ? '6px' : 0 }} />
                        )}
                      </div>
                    </div>
                    <button onClick={() => updateHp(char, 1)}
                      className="w-8 h-8 rounded-xl font-bold flex items-center justify-center shrink-0"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>+</button>
                  </div>

                  {/* Temp HP row */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <button onClick={() => addTemp(char)}
                      className="w-7 h-7 rounded-lg font-bold flex items-center justify-center text-sm shrink-0"
                      style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6', color: '#60a5fa' }}>+</button>
                    {hasTemp ? (
                      <div className="flex items-center gap-1 flex-1 px-2 py-1 rounded-lg"
                        style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6' }}>
                        <span className="text-xs font-bold flex-1" style={{ color: '#60a5fa' }}>🛡 {char.temp_hp} Temp HP</span>
                        <button onClick={() => clearTemp(char)} className="text-xs font-bold" style={{ color: '#60a5fa' }}>×</button>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Temp HP</span>
                    )}
                  </div>

                  {/* Death saves */}
                  {char.current_hp === 0 && (() => {
                    const ds = char.death_saves ?? { successes: 0, failures: 0 }
                    const isStable = ds.successes >= 3
                    const isDead = ds.failures >= 3
                    return (
                      <div className="mb-2">
                        {isDead || isStable ? (
                          <div className="text-center py-1.5 rounded-lg text-xs font-bold"
                            style={isDead
                              ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }
                              : { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#22c55e' }}>
                            {isDead ? '💀 Dead' : '💤 Stable'}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold" style={{ color: '#ef4444' }}>✗</span>
                              {[0,1,2].map(i => (
                                <button key={i} onClick={() => tapDeathSave(char, 'failure', i)}
                                  className="w-5 h-5 rounded-full transition-all"
                                  style={{
                                    background: i < ds.failures ? '#ef4444' : 'var(--surface-2)',
                                    border: `1.5px solid ${i < ds.failures ? '#ef4444' : 'var(--border)'}`,
                                  }} />
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {[0,1,2].map(i => (
                                <button key={i} onClick={() => tapDeathSave(char, 'success', i)}
                                  className="w-5 h-5 rounded-full transition-all"
                                  style={{
                                    background: i < ds.successes ? '#22c55e' : 'var(--surface-2)',
                                    border: `1.5px solid ${i < ds.successes ? '#22c55e' : 'var(--border)'}`,
                                  }} />
                              ))}
                              <span className="text-xs font-bold" style={{ color: '#22c55e' }}>✓</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  <div className="flex gap-1.5 text-xs text-center mb-1.5">
                    <div className="flex-1 py-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>AC </span>
                      <span className="font-bold">{char.ac ?? 10}</span>
                    </div>
                    <div className="flex-1 py-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Prof </span>
                      <span className="font-bold" style={{ color: 'var(--gold)' }}>+{prof}</span>
                    </div>
                    <div className="flex-1 py-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Speed </span>
                      <span className="font-bold">{char.speed}ft</span>
                    </div>
                    <div className="flex-1 py-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Init </span>
                      <span className="font-bold">{formatModifier(initMod)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 text-xs text-center mb-2">
                    <div className="flex-1 py-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>PER </span>
                      <span className="font-bold">{passivePerc}</span>
                    </div>
                    <div className="flex-1 py-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>WIS </span>
                      <span className="font-bold">{passiveWis}</span>
                    </div>
                    <div className="flex-1 py-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>INS </span>
                      <span className="font-bold">{passiveIns}</span>
                    </div>
                  </div>

                  <RestPanel charId={char.id} open={restOpen}
                    onToggle={() => toggleRestOpen(char.id)}
                    hasSlots={slots.length > 0}
                    hasSpecials={specials.some(s => s.has_slots)}
                    onRest={opts => doRest(char.id, opts)} />
                </div>

                {/* Expandable sections */}
                <div className="flex flex-col">
                  {/* Skills & Abilities */}
                  <SectionPanel label="Skills & Abilities 🎯" isOpen={expanded === 'skills'} onToggle={() => toggleSection(char.id, 'skills')}>
                    {!simplifiedSkills && (
                      <div className="grid grid-cols-3 gap-1.5 p-3" style={{ borderBottom: '1px solid var(--border)' }}>
                        {['STR','DEX','CON','INT','WIS','CHA'].map(ab => {
                          const score = scores[ab]
                          const mod = abilityModifier(score)
                          return (
                            <div key={ab} className="text-center py-1.5 rounded-lg" style={{ background: 'var(--surface)' }}>
                              <p className="text-xs font-bold" style={{ color: 'var(--gold)' }}>{ab}</p>
                              <p className="text-sm font-bold">{score}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatModifier(mod)}</p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <div>
                      <button onClick={() => toggleSkillsOpen(char.id)}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold"
                        style={{ background: 'var(--surface)', color: 'var(--text-muted)', borderBottom: skillsOpen ? '1px solid var(--border)' : 'none' }}>
                        Skills
                        {skillsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {skillsOpen && (
                        simplifiedSkills ? (
                          <div className="px-3 py-2 space-y-3">
                            {['STR','DEX','CON','INT','WIS','CHA'].map(ab => {
                              const abSkills = skills.filter(s => s.ability === ab)
                              if (!abSkills.length) return null
                              const abMod = abilityModifier(scores[ab])
                              const saveProf = !!(char as unknown as Record<string,boolean>)[`${ab.toLowerCase()}_save_prof`]
                              const saveMod = abMod + (saveProf ? prof : 0)
                              const tiers = [
                                { key: 'expert', icon: '◈', color: 'var(--gold-light)', skills: abSkills.filter(s => s.is_expert),                    mod: abMod + 2 * prof },
                                { key: 'prof',   icon: '●', color: 'var(--gold)',       skills: abSkills.filter(s => s.is_proficient && !s.is_expert), mod: abMod + prof },
                                { key: 'none',   icon: '○', color: 'var(--text-muted)', skills: abSkills.filter(s => !s.is_proficient),               mod: abMod },
                              ].filter(t => t.skills.length > 0)
                              return (
                                <div key={ab}>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-base leading-none">{ABILITY_EMOJI[ab]}</span>
                                    <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>{ab}</span>
                                    <span className="text-xs font-semibold">{scores[ab]}</span>
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({formatModifier(abMod)})</span>
                                    <span className="ml-auto text-xs whitespace-nowrap" style={{ color: saveProf ? 'var(--gold)' : 'var(--text-muted)' }}>
                                      {ab} save {formatModifier(saveMod)}
                                    </span>
                                  </div>
                                  <div className="pl-2 space-y-0.5">
                                    {tiers.map(tier => (
                                      <div key={tier.key} className="flex items-center gap-x-2 flex-wrap gap-y-0.5">
                                        {tier.skills.map(skill => (
                                          <span key={skill.id} className="flex items-center gap-0.5 text-xs whitespace-nowrap">
                                            <span style={{ color: tier.color }}>{tier.icon}</span>
                                            <span>{skill.skill_name}</span>
                                          </span>
                                        ))}
                                        <span className="text-xs font-bold tabular-nums ml-auto" style={{ color: 'var(--gold)' }}>{formatModifier(tier.mod)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : skillsSort === 'ability' ? (
                          ['STR','DEX','CON','INT','WIS','CHA'].map(ab => {
                            const abSkills = skills.filter(s => s.ability === ab)
                            if (!abSkills.length) return null
                            const abMod = abilityModifier(scores[ab])
                            const saveProf = !!(char as unknown as Record<string,boolean>)[`${ab.toLowerCase()}_save_prof`]
                            const saveMod = abMod + (saveProf ? prof : 0)
                            return (
                              <div key={ab}>
                                <div className="flex items-center justify-between px-4 py-1" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                                  <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{ab}</span>
                                  <span className="text-xs" style={{ color: saveProf ? 'var(--gold)' : 'var(--text-muted)' }}>
                                    save {formatModifier(saveMod)}
                                  </span>
                                </div>
                                {abSkills.map(skill => {
                                  const mult = skill.is_expert ? 2 : skill.is_proficient ? 1 : 0
                                  const mod = abMod + mult * prof
                                  const dot = skill.is_expert ? 'var(--gold-light)' : skill.is_proficient ? 'var(--gold)' : 'var(--surface-2)'
                                  return (
                                    <div key={skill.id} className="flex items-center gap-2 px-4 py-1.5"
                                      style={{ borderBottom: '1px solid var(--border)' }}>
                                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot, border: `1.5px solid ${dot === 'var(--surface-2)' ? 'var(--border)' : dot}` }} />
                                      <span className="flex-1 text-xs">{skill.skill_name}</span>
                                      <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--gold)' }}>{formatModifier(mod)}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })
                        ) : (
                          <>
                            <div style={{ borderBottom: '1px solid var(--border)' }}>
                              <div className="px-4 py-1" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                                <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>SAVES</span>
                              </div>
                              <div className="grid grid-cols-2">
                                {['STR','DEX','CON','INT','WIS','CHA'].map(ab => {
                                  const abMod = abilityModifier(scores[ab])
                                  const saveProf = !!(char as unknown as Record<string,boolean>)[`${ab.toLowerCase()}_save_prof`]
                                  const saveMod = abMod + (saveProf ? prof : 0)
                                  return (
                                    <div key={ab} className="flex items-center gap-2 px-4 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: saveProf ? 'var(--gold)' : 'var(--surface-2)', border: `1.5px solid ${saveProf ? 'var(--gold)' : 'var(--border)'}` }} />
                                      <span className="flex-1 text-xs">{ab} save</span>
                                      <span className="text-xs font-bold tabular-nums" style={{ color: saveProf ? 'var(--gold)' : 'var(--text-muted)' }}>{formatModifier(saveMod)}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            {[...skills].sort((a, b) => a.skill_name.localeCompare(b.skill_name)).map(skill => {
                              const base = abilityModifier(scores[skill.ability] ?? 10)
                              const mult = skill.is_expert ? 2 : skill.is_proficient ? 1 : 0
                              const mod = base + mult * prof
                              const dot = skill.is_expert ? 'var(--gold-light)' : skill.is_proficient ? 'var(--gold)' : 'var(--surface-2)'
                              return (
                                <div key={skill.id} className="flex items-center gap-2 px-4 py-1.5"
                                  style={{ borderBottom: '1px solid var(--border)' }}>
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot, border: `1.5px solid ${dot === 'var(--surface-2)' ? 'var(--border)' : dot}` }} />
                                  <span className="flex-1 text-xs">{skill.skill_name}</span>
                                  <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--gold)' }}>{formatModifier(mod)}</span>
                                </div>
                              )
                            })}
                          </>
                        )
                      )}
                    </div>
                  </SectionPanel>

                  {/* Attacks */}
                  <SectionPanel label="Attacks ⚔️" isOpen={expanded === 'attacks'} onToggle={() => toggleSection(char.id, 'attacks')}>
                    {attacks.length === 0
                      ? <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No attacks</p>
                      : attacks.map(atk => (
                        <div key={atk.id} className="flex items-center gap-2 px-4 py-2"
                          style={{ borderTop: '1px solid var(--border)' }}>
                          <div className="flex flex-col items-center gap-0.5 shrink-0">
                            <span className="text-base">{getDamageEmoji(atk.damage_type) || '⚔️'}</span>
                            {atk.damage_type && (
                              <span className="text-xs px-1 rounded" style={{ background: getDamageColor(atk.damage_type) + '33', color: getDamageColor(atk.damage_type), fontSize: '9px' }}>
                                {getDamageLabel(atk.damage_type)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{atk.name}</p>
                            {atk.notation && <p className="text-xs font-mono" style={{ color: 'var(--gold)' }}>{atk.notation}</p>}
                            {atk.description && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{atk.description}</p>}
                          </div>
                        </div>
                      ))
                    }
                  </SectionPanel>

                  {/* Spell slots */}
                  <SectionPanel label="Spells ✨" isOpen={expanded === 'spells'} onToggle={() => toggleSection(char.id, 'spells')}>
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
                        {[0,1,2,3,4,5,6,7,8,9].map(lvl => {
                          const group = spells.filter(s => s.spell_level === lvl)
                          if (!group.length) return null
                          return (
                            <div key={lvl}>
                              <div className="px-4 py-1" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
                                <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>
                                  {lvl === 0 ? 'Cantrips' : `${slotLevelLabel(lvl)} Level`}
                                </span>
                              </div>
                              {group.map(spell => (
                                <div key={spell.id} className="flex items-center gap-2 px-4 py-1.5"
                                  style={{ borderTop: '1px solid var(--border)' }}>
                                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                                    <span className="text-sm">{getDamageEmoji(spell.damage_type) || '✨'}</span>
                                    {spell.damage_type && (
                                      <span style={{ background: getDamageColor(spell.damage_type) + '33', color: getDamageColor(spell.damage_type), fontSize: '9px', padding: '0 3px', borderRadius: '3px' }}>
                                        {getDamageLabel(spell.damage_type)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{spell.name}</p>
                                    {spell.notation && <p className="text-xs font-mono" style={{ color: 'var(--gold)' }}>{spell.notation}</p>}
                                    {spell.to_hit && <p className="text-xs font-mono" style={{ color: '#818cf8' }}>{spell.to_hit} to hit</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </>
                    }
                  </SectionPanel>

                  {/* Specials */}
                  <SectionPanel label="Specials ⚡" isOpen={expanded === 'specials'} onToggle={() => toggleSection(char.id, 'specials')}>
                    {specials.length === 0
                      ? <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No specials</p>
                      : specials.map(item => (
                        <div key={item.id} className="flex flex-col px-4 py-2 gap-1.5"
                          style={{ borderTop: '1px solid var(--border)' }}>
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-xs font-semibold truncate">{item.name}</span>
                            {item.notation && <span className="text-xs font-mono" style={{ color: 'var(--gold)' }}>{item.notation}</span>}
                          </div>
                          {item.description && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.description}</p>}
                          {item.has_slots && (
                            <div className="flex gap-1 flex-wrap">
                              {Array.from({ length: item.max_slots }).map((_, i) => {
                                const used = i >= (item.max_slots - item.used_slots)
                                return (
                                  <button key={i}
                                    onClick={() => used ? restoreSpecial(char.id, item) : useSpecial(char.id, item)}
                                    className="w-5 h-5 rounded-full transition-all"
                                    style={{
                                      background: used ? 'var(--surface-2)' : 'var(--gold)',
                                      border: `1.5px solid ${used ? 'var(--border)' : 'var(--gold)'}`,
                                    }} />
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))
                    }
                  </SectionPanel>

                  {/* Inventory */}
                  <SectionPanel label="Inventory 🎒" isOpen={expanded === 'inventory'} onToggle={() => toggleSection(char.id, 'inventory')}>
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
                  </SectionPanel>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
