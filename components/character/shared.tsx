'use client'
import { Plus, GripVertical } from 'lucide-react'
import {
  PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DAMAGE_TYPES } from '@/lib/constants'

export const inputStyle = { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }

export function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )
}

export function SortableRow({ id, children }: { id: string; children: (drag: React.HTMLAttributes<HTMLElement>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      {children({ ...attributes, ...listeners })}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

export function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-opacity hover:opacity-80"
      style={{ background: 'var(--surface)', border: '2px dashed var(--border)', color: 'var(--gold)' }}>
      <Plus size={18} /> {label}
    </button>
  )
}

export function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <span className="text-4xl">{emoji}</span>
      <p style={{ color: 'var(--text-muted)' }}>{text}</p>
    </div>
  )
}

export function DamageTypePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
