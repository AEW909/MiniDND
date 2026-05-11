'use client'
import { CharacterSkill } from '@/lib/types'
import { ABILITY_LABELS, abilityModifier, formatModifier } from '@/lib/constants'

const ABILITY_ORDER = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

export function SkillsTab({ skills, scores, prof, onToggle }: {
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
