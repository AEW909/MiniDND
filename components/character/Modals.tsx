'use client'
import { useState } from 'react'
import { Character, CharacterAttack, CharacterSpell, CharacterOther } from '@/lib/types'
import { SPECIES } from '@/lib/constants'
import { slotLevelLabel } from '@/lib/spell-slots'
import Modal from '@/components/Modal'
import { Field, DamageTypePicker, inputStyle } from '@/components/character/shared'

export function AddAttackModal({ title = 'Add Attack', initial, onClose, onSave }: {
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

export function AddSpellModal({ title = 'Add Spell', initial, onClose, onSave }: {
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

export function AddInventoryModal({ onClose, onSave }: { onClose: () => void; onSave: (d: object) => void }) {
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

export function AddOtherModal({ title = 'Add Special', initial, onClose, onSave }: {
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

export function EditCharModal({ char, onClose, onSave, onDelete }: {
  char: Character; onClose: () => void
  onSave: (updates: { species?: string | null }) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [species, setSpecies] = useState(char.species ?? '')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
            style={inputStyle} />
          <datalist id="ec-species-list">
            {SPECIES.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>
        <button onClick={save} disabled={saving}
          className="w-full py-3 rounded-xl font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--gold)', color: '#1c1917' }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        <div className="pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              Delete Character
            </button>
          ) : (
            <div className="flex flex-col gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <p className="text-sm text-center font-medium" style={{ color: 'var(--text)' }}>
                Delete <strong>{char.name}</strong>? This can't be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-xl font-semibold text-sm"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  Cancel
                </button>
                <button onClick={() => { setDeleting(true); onDelete() }} disabled={deleting}
                  className="flex-1 py-2 rounded-xl font-bold text-sm disabled:opacity-50"
                  style={{ background: '#ef4444', color: '#fff' }}>
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
