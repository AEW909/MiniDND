'use client'
import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Character, CharacterSkill } from '@/lib/types'
import {
  ABILITY_LABELS, CONDITIONS,
  abilityModifier, proficiencyBonus, formatModifier,
} from '@/lib/constants'
import Modal from '@/components/Modal'
import { Field, inputStyle } from '@/components/character/shared'

const ABILITY_KEYS = [
  { key: 'str_score', ab: 'STR' }, { key: 'dex_score', ab: 'DEX' }, { key: 'con_score', ab: 'CON' },
  { key: 'int_score', ab: 'INT' }, { key: 'wis_score', ab: 'WIS' }, { key: 'cha_score', ab: 'CHA' },
] as const

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xl font-black" style={{ color: 'var(--gold)' }}>{value}</p>
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
                  style={inputStyle} />
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
                  style={inputStyle} />
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

export function OverviewTab({ char, prof, scores, skills, onSave }: {
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

      {/* Saving throws */}
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
