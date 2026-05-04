'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, ArrowLeft, Swords, Trash2, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Party, Character } from '@/lib/types'
import { CLASSES, CLASS_NAMES, AVATARS, SKILLS, SPECIES, PARTY_ICONS, CLASS_ABILITY_SUGGESTIONS, CLASS_STARTER_GEAR, CLASS_SAVE_PROFS, getAvatarEmoji, getPartyIcon, abilityModifier } from '@/lib/constants'
import { getSpellSlots, isCasterClass } from '@/lib/spell-slots'
import { applyTheme, resetToGlobalTheme, THEMES } from '@/lib/theme'
import { ThemeSwatchPicker } from '@/app/page'
import Modal from '@/components/Modal'

const SESSION_KEY = 'minidnd_unlocked'
function isUnlocked(id: string) {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}')[id] === true } catch { return false }
}

const STAT_KEYS = ['str_score', 'dex_score', 'con_score', 'int_score', 'wis_score', 'cha_score'] as const
const STAT_LABELS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

type NewChar = {
  name: string; avatar_key: string; class: string; subclass: string; species: string
  level: string; speed: string; max_hp: string; ac: string
  str_score: string; dex_score: string; con_score: string
  int_score: string; wis_score: string; cha_score: string
  use_spell_slots: boolean
  str_save_prof: boolean; dex_save_prof: boolean; con_save_prof: boolean
  int_save_prof: boolean; wis_save_prof: boolean; cha_save_prof: boolean
}

function saveProfDefaults(className: string) {
  const profs = CLASS_SAVE_PROFS[className] ?? []
  return {
    str_save_prof: profs.includes('str'), dex_save_prof: profs.includes('dex'),
    con_save_prof: profs.includes('con'), int_save_prof: profs.includes('int'),
    wis_save_prof: profs.includes('wis'), cha_save_prof: profs.includes('cha'),
  }
}

const defaultChar = (): NewChar => ({
  name: '', avatar_key: 'warrior', class: 'Fighter', subclass: '', species: '',
  level: '1', speed: '30', max_hp: '10', ac: '10',
  str_score: '10', dex_score: '10', con_score: '10',
  int_score: '10', wis_score: '10', cha_score: '10',
  use_spell_slots: false,
  ...saveProfDefaults('Fighter'),
})

export default function PartyPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [party, setParty] = useState<Party | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showEditParty, setShowEditParty] = useState(false)
  const [editName, setEditName] = useState('')
  const [editIconKey, setEditIconKey] = useState<string | null>(null)
  const [editTheme, setEditTheme] = useState<string | null>(null)
  const [editBgUrl, setEditBgUrl] = useState('')
  const [editSimplifiedSkills, setEditSimplifiedSkills] = useState(false)
  const [editSimplifiedCreation, setEditSimplifiedCreation] = useState(false)
  const [editSkillsSort, setEditSkillsSort] = useState('alpha')
  const [simplifiedCreation, setSimplifiedCreation] = useState(false)
  const [newChar, setNewChar] = useState<NewChar>(defaultChar())
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)
  const [step, setStep] = useState<'info' | 'stats'>('info')

  useEffect(() => {
    if (!isUnlocked(id)) { router.replace('/'); return }
    load()
  }, [id])

  async function load() {
    setLoading(true)
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('parties').select('*').eq('id', id).single(),
      supabase.from('characters').select('*').eq('party_id', id).order('sort_order').order('created_at'),
    ])
    setParty(p)
    setCharacters(c ?? [])
    setSimplifiedCreation(p?.simplified_creation ?? false)
    setLoading(false)
    if (p?.theme) applyTheme(p.theme as Parameters<typeof applyTheme>[0])
    else resetToGlobalTheme()
  }

  function setField(key: keyof NewChar, val: string | boolean) {
    setNewChar(prev => {
      const updated = { ...prev, [key]: val }
      if (key === 'class') {
        const subclasses = CLASSES[val as string] ?? []
        updated.subclass = subclasses[0] ?? ''
        updated.use_spell_slots = isCasterClass(val as string, subclasses[0] ?? null)
        Object.assign(updated, saveProfDefaults(val as string))
        if (simplifiedCreation) {
          const sug = CLASS_ABILITY_SUGGESTIONS[val as string]
          const gear = CLASS_STARTER_GEAR[val as string]
          if (sug) {
            updated.str_score = String(sug.str_score)
            updated.dex_score = String(sug.dex_score)
            updated.con_score = String(sug.con_score)
            updated.int_score = String(sug.int_score)
            updated.wis_score = String(sug.wis_score)
            updated.cha_score = String(sug.cha_score)
          }
          if (gear) updated.ac = String(gear.ac)
        }
      }
      return updated
    })
  }

  async function createCharacter() {
    setCreateError('')
    if (!newChar.name.trim()) return setCreateError('Name is required')
    const lvl = parseInt(newChar.level) || 1
    const hp = parseInt(newChar.max_hp) || 10
    setCreating(true)

    const charData = {
      party_id: id,
      name: newChar.name.trim(),
      avatar_key: newChar.avatar_key,
      class: newChar.class,
      subclass: newChar.subclass || null,
      level: lvl,
      speed: parseInt(newChar.speed) || 30,
      max_hp: hp,
      current_hp: hp,
      ac: parseInt(newChar.ac) || 10,
      str_score: parseInt(newChar.str_score) || 10,
      dex_score: parseInt(newChar.dex_score) || 10,
      con_score: parseInt(newChar.con_score) || 10,
      int_score: parseInt(newChar.int_score) || 10,
      wis_score: parseInt(newChar.wis_score) || 10,
      cha_score: parseInt(newChar.cha_score) || 10,
      species: newChar.species || null,
      use_spell_slots: newChar.use_spell_slots,
      str_save_prof: newChar.str_save_prof,
      dex_save_prof: newChar.dex_save_prof,
      con_save_prof: newChar.con_save_prof,
      int_save_prof: newChar.int_save_prof,
      wis_save_prof: newChar.wis_save_prof,
      cha_save_prof: newChar.cha_save_prof,
    }

    const { data: char, error } = await supabase.from('characters').insert(charData).select().single()
    if (error || !char) { setCreating(false); return setCreateError('Failed to create character') }

    // Seed skills
    await supabase.from('character_skills').insert(
      SKILLS.map(s => ({ character_id: char.id, skill_name: s.name, ability: s.ability }))
    )

    // Seed spell slots if caster
    if (newChar.use_spell_slots) {
      const slots = getSpellSlots(newChar.class, newChar.subclass || null, lvl)
      const slotRows = slots
        .map((max, i) => ({ character_id: char.id, slot_level: i + 1, max_slots: max, used_slots: 0 }))
        .filter(r => r.max_slots > 0)
      if (slotRows.length > 0) await supabase.from('character_spell_slots').insert(slotRows)
    }

    // Simplified creation: auto-add starter gear
    if (simplifiedCreation) {
      const gear = CLASS_STARTER_GEAR[newChar.class]
      if (gear) {
        const atkRows = gear.attacks.map((a, i) => ({ character_id: char.id, ...a, description: null, sort_order: i }))
        const invRows = gear.inventory.map((item, i) => ({ character_id: char.id, ...item, sort_order: i }))
        await Promise.all([
          atkRows.length ? supabase.from('character_attacks').insert(atkRows) : Promise.resolve(),
          invRows.length ? supabase.from('character_inventory').insert(invRows) : Promise.resolve(),
        ])
      }
    }

    setCreating(false)
    setShowCreate(false)
    setNewChar(defaultChar())
    setStep('info')
    router.push(`/character/${char.id}`)
  }

  async function deleteChar(char: Character, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Remove ${char.name}? All their data will be deleted.`)) return
    await supabase.from('characters').delete().eq('id', char.id)
    setCharacters(prev => prev.filter(c => c.id !== char.id))
  }

  async function savePartyDetails() {
    if (!editName.trim()) return
    const bgUrl = editBgUrl.trim() || null
    await supabase.from('parties').update({
      name: editName.trim(), icon_key: editIconKey, theme: editTheme, background_url: bgUrl,
      simplified_skills: editSimplifiedSkills, simplified_creation: editSimplifiedCreation, skills_sort: editSkillsSort,
    }).eq('id', id)
    setParty(prev => prev ? {
      ...prev, name: editName.trim(), icon_key: editIconKey, theme: editTheme, background_url: bgUrl,
      simplified_skills: editSimplifiedSkills, simplified_creation: editSimplifiedCreation, skills_sort: editSkillsSort,
    } : prev)
    setSimplifiedCreation(editSimplifiedCreation)
    if (editTheme) applyTheme(editTheme as Parameters<typeof applyTheme>[0])
    else resetToGlobalTheme()
    setShowEditParty(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-lg" style={{ color: 'var(--text-muted)' }}>
      Loading party…
    </div>
  )

  const bgStyle = party?.background_url ? {
    backgroundImage: `linear-gradient(var(--overlay-color), var(--overlay-color)), url(${party.background_url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'local',
  } : {}

  return (
    <div className="min-h-full flex flex-col" style={bgStyle}>
      <header className="px-6 py-5 flex items-center gap-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => router.push('/')} className="p-2 rounded-xl transition-colors"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={22} />
        </button>
        <span className="text-3xl">{getPartyIcon(party?.icon_key)}</span>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--gold)' }}>{party?.name}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{characters.length} adventurer{characters.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => {
          setEditName(party?.name ?? '')
          setEditIconKey(party?.icon_key ?? null)
          setEditTheme(party?.theme ?? null)
          setEditBgUrl(party?.background_url ?? '')
          setEditSimplifiedSkills(party?.simplified_skills ?? false)
          setEditSimplifiedCreation(party?.simplified_creation ?? false)
          setEditSkillsSort(party?.skills_sort ?? 'alpha')
          setShowEditParty(true)
        }}
          className="p-2 rounded-xl transition-opacity hover:opacity-80"
          title="Edit party"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <Pencil size={18} />
        </button>
        <button onClick={() => router.push(`/campaign/${id}`)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--gold)' }}>
          <Swords size={16} /> Campaign
        </button>
        <button onClick={() => { setShowCreate(true); setStep('info'); setNewChar(defaultChar()) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: 'var(--gold)', color: '#1c1917' }}>
          <Plus size={18} /> Add Character
        </button>
      </header>

      <main className="flex-1 p-6">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <span className="text-6xl">🗺️</span>
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>No adventurers yet</p>
            <button onClick={() => setShowCreate(true)}
              className="px-6 py-3 rounded-xl font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--gold)', color: '#1c1917' }}>
              Add your first character
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {characters.map(char => (
              <button key={char.id} onClick={() => router.push(`/character/${char.id}`)}
                className="relative text-left rounded-2xl p-5 transition-all hover:scale-105 active:scale-100 group cursor-pointer"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span onClick={e => deleteChar(char, e)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}>
                  <Trash2 size={15} />
                </span>
                <div className="text-5xl mb-3 text-center">{getAvatarEmoji(char.avatar_key)}</div>
                <div className="text-center">
                  <p className="font-bold text-base truncate">{char.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--gold)' }}>
                    {char.class} · Lv {char.level}
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <span className="text-red-400">❤️</span>
                    <span className="text-sm font-semibold">{char.current_hp}<span style={{ color: 'var(--text-muted)' }}>/{char.max_hp}</span></span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {showEditParty && (
        <Modal title="Edit Party" onClose={() => setShowEditParty(false)}>
          <div className="flex flex-col gap-4">
            <Field label="Party name">
              <input autoFocus type="text" value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && savePartyDetails()}
                className="w-full px-4 py-3 rounded-xl outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </Field>
            <Field label="Party icon">
              <div className="grid grid-cols-8 gap-2 mt-1">
                {PARTY_ICONS.map(icon => (
                  <button key={icon.key} onClick={() => setEditIconKey(icon.key)}
                    title={icon.label}
                    className="text-2xl p-2 rounded-xl transition-all"
                    style={{
                      background: editIconKey === icon.key ? 'var(--gold)' : 'var(--surface-2)',
                      border: `2px solid ${editIconKey === icon.key ? 'var(--gold)' : 'transparent'}`,
                    }}>
                    {icon.emoji}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Campaign theme">
              <ThemeSwatchPicker value={editTheme} onChange={setEditTheme} />
            </Field>
            <Field label="Background image URL">
              <input type="url" placeholder="https://example.com/image.jpg" value={editBgUrl}
                onChange={e => setEditBgUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              {editBgUrl && (
                <div className="mt-2 w-full h-28 rounded-xl overflow-hidden"
                  style={{ backgroundImage: `url(${editBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              )}
            </Field>

            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-bold" style={{ color: 'var(--gold)' }}>Campaign Options</p>
              <Toggle label="Simplified skills & abilities" description="Groups skills under each ability with proficiency icons"
                value={editSimplifiedSkills} onChange={setEditSimplifiedSkills} />
              <Toggle label="Simplified character creation" description="Auto-fills ability scores and adds starter equipment by class"
                value={editSimplifiedCreation} onChange={setEditSimplifiedCreation} />
              {!editSimplifiedSkills && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Skill list order</p>
                  <div className="flex gap-2">
                    {[{ id: 'alpha', label: 'Alphabetical' }, { id: 'ability', label: 'By ability' }].map(opt => (
                      <button key={opt.id} onClick={() => setEditSkillsSort(opt.id)}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: editSkillsSort === opt.id ? 'var(--gold)' : 'var(--surface)',
                          color: editSkillsSort === opt.id ? '#1c1917' : 'var(--text-muted)',
                          border: `1px solid ${editSkillsSort === opt.id ? 'var(--gold)' : 'var(--border)'}`,
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={savePartyDetails}
              className="w-full py-3 rounded-xl font-bold transition-opacity hover:opacity-80"
              style={{ background: 'var(--gold)', color: '#1c1917' }}>
              Save
            </button>
          </div>
        </Modal>
      )}

      {showCreate && (
        <Modal title="New Character" onClose={() => setShowCreate(false)} maxWidth="max-w-lg">
          {step === 'info' ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Character name">
                  <input autoFocus type="text" placeholder="Aria Swiftfoot…" value={newChar.name}
                    onChange={e => setField('name', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </Field>
                <Field label="Species">
                  <input type="text" list="species-list" placeholder="Human, Elf…" value={newChar.species}
                    onChange={e => setField('species', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                  <datalist id="species-list">
                    {SPECIES.map(s => <option key={s} value={s} />)}
                  </datalist>
                </Field>
              </div>

              <Field label="Avatar">
                <div className="grid grid-cols-8 gap-2 mt-1">
                  {AVATARS.map(av => (
                    <button key={av.key} onClick={() => setField('avatar_key', av.key)}
                      title={av.label}
                      className="text-2xl p-2 rounded-xl transition-all"
                      style={{
                        background: newChar.avatar_key === av.key ? 'var(--gold)' : 'var(--surface-2)',
                        border: `2px solid ${newChar.avatar_key === av.key ? 'var(--gold)' : 'transparent'}`,
                      }}>
                      {av.emoji}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Class">
                  <select value={newChar.class} onChange={e => setField('class', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                    {CLASS_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Subclass">
                  <select value={newChar.subclass} onChange={e => setField('subclass', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl outline-none"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                    <option value="">— None yet —</option>
                    {(CLASSES[newChar.class] ?? []).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <Field label="Level">
                  <input type="number" min="1" max="20" value={newChar.level}
                    onChange={e => setField('level', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl outline-none text-center"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </Field>
                <Field label="Max HP">
                  <input type="number" min="1" value={newChar.max_hp}
                    onChange={e => setField('max_hp', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl outline-none text-center"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </Field>
                <Field label="AC">
                  <input type="number" min="1" value={newChar.ac}
                    onChange={e => setField('ac', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl outline-none text-center"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </Field>
                <Field label="Speed (ft)">
                  <input type="number" min="0" step="5" value={newChar.speed}
                    onChange={e => setField('speed', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl outline-none text-center"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </Field>
              </div>
              {simplifiedCreation && (
                <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
                  ✨ Ability scores, AC, and starter gear are pre-filled for {newChar.class}. Adjust as needed.
                </p>
              )}

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  Track spell slots
                </span>
                <div onClick={() => setField('use_spell_slots', !newChar.use_spell_slots)}
                  className="w-12 h-6 rounded-full transition-colors relative"
                  style={{ background: newChar.use_spell_slots ? 'var(--gold)' : 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
                    style={{ background: 'var(--text)', left: newChar.use_spell_slots ? '26px' : '2px' }} />
                </div>
              </label>

              <button onClick={() => setStep('stats')}
                className="w-full py-3 rounded-xl font-bold transition-opacity hover:opacity-80"
                style={{ background: 'var(--gold)', color: '#1c1917' }}>
                Next: Ability Scores →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Enter your ability scores (1–30):</p>
              <div className="grid grid-cols-3 gap-3">
                {STAT_KEYS.map((key, i) => {
                  const score = parseInt(newChar[key] as string) || 10
                  const mod = abilityModifier(score)
                  return (
                    <div key={key} className="rounded-xl p-3 text-center"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <p className="text-xs font-bold mb-1" style={{ color: 'var(--gold)' }}>{STAT_LABELS[i]}</p>
                      <input type="number" min="1" max="30" value={newChar[key]}
                        onChange={e => setField(key, e.target.value)}
                        className="w-full text-center text-xl font-bold outline-none bg-transparent"
                        style={{ color: 'var(--text)' }} />
                      <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>
                        {mod >= 0 ? '+' : ''}{mod}
                      </p>
                    </div>
                  )
                })}
              </div>
              {createError && <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{createError}</p>}
              <div className="flex gap-3">
                <button onClick={() => setStep('info')} className="flex-1 py-3 rounded-xl font-bold transition-opacity hover:opacity-80"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  ← Back
                </button>
                <button onClick={createCharacter} disabled={creating}
                  className="flex-1 py-3 rounded-xl font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'var(--gold)', color: '#1c1917' }}>
                  {creating ? 'Creating…' : 'Create!'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function Toggle({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <div onClick={() => onChange(!value)}
        className="mt-0.5 w-10 h-6 rounded-full shrink-0 transition-colors relative"
        style={{ background: value ? 'var(--gold)' : 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
          style={{ background: value ? '#1c1917' : 'var(--text-muted)', left: value ? '18px' : '2px' }} />
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>
      </div>
    </label>
  )
}
