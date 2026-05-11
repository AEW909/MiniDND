'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export function SectionPanel({ label, isOpen, onToggle, children }: {
  label: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 font-semibold text-sm"
        style={{ background: 'color-mix(in srgb, var(--surface) 75%, transparent)' }}>
        {label}
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen && <div style={{ background: 'var(--background)' }}>{children}</div>}
    </div>
  )
}

export function RestPanel({ charId, open, onToggle, hasSlots, hasSpecials, onRest }: {
  charId: string; open: boolean; onToggle: () => void
  hasSlots: boolean; hasSpecials: boolean
  onRest: (opts: { spellSlots: boolean; specials: boolean; hp: boolean }) => void
}) {
  const [spellSlots, setSpellSlots] = useState(hasSlots)
  const [specials, setSpecials] = useState(hasSpecials)
  const [hp, setHp] = useState(false)

  return (
    <div>
      <button onClick={onToggle}
        className="w-full py-1.5 rounded-lg font-semibold text-xs transition-opacity hover:opacity-80"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        🛌 Rest
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg p-3 flex flex-col gap-2"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Reset on rest:</p>
          {[
            { label: 'Spell Slots', value: spellSlots, set: setSpellSlots, show: hasSlots },
            { label: 'Specials', value: specials, set: setSpecials, show: hasSpecials },
            { label: 'HP to max', value: hp, set: setHp, show: true },
          ].filter(r => r.show).map(row => (
            <label key={row.label} className="flex items-center gap-2 cursor-pointer text-xs">
              <input type="checkbox" checked={row.value} onChange={e => row.set(e.target.checked)}
                className="w-4 h-4 rounded" />
              {row.label}
            </label>
          ))}
          <button onClick={() => onRest({ spellSlots, specials, hp })}
            className="w-full py-1.5 rounded-lg font-bold text-xs mt-1"
            style={{ background: 'var(--gold)', color: '#1c1917' }}>
            Confirm Rest
          </button>
        </div>
      )}
    </div>
  )
}
