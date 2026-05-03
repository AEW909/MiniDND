'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Eye, EyeOff, Trash2, Palette } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Party } from '@/lib/types'
import { useTheme, THEMES } from '@/lib/theme'
import Modal from '@/components/Modal'

const SESSION_KEY = 'minidnd_unlocked'

function getUnlocked(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}') } catch { return {} }
}

function setUnlocked(id: string) {
  const cur = getUnlocked()
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...cur, [id]: true }))
}

export default function PartiesPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [, forceRender] = useState(0)

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newPinConfirm, setNewPinConfirm] = useState('')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  const [pinTarget, setPinTarget] = useState<Party | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [showPin, setShowPin] = useState(false)
  const pinRef = useRef<HTMLInputElement>(null)

  const [showThemePicker, setShowThemePicker] = useState(false)

  useEffect(() => { loadParties() }, [])
  useEffect(() => { if (pinTarget) setTimeout(() => pinRef.current?.focus(), 100) }, [pinTarget])

  async function loadParties() {
    setLoading(true)
    const { data } = await supabase.from('parties').select('*').order('created_at')
    setParties(data ?? [])
    setLoading(false)
  }

  async function createParty() {
    setCreateError('')
    if (!newName.trim()) return setCreateError('Party name is required')
    if (!/^\d{4}$/.test(newPin)) return setCreateError('PIN must be exactly 4 digits')
    if (newPin !== newPinConfirm) return setCreateError('PINs do not match')
    setCreating(true)
    const { data, error } = await supabase
      .from('parties').insert({ name: newName.trim(), pin: newPin }).select().single()
    setCreating(false)
    if (error || !data) return setCreateError('Failed to create party')
    setUnlocked(data.id)
    setShowCreate(false)
    setNewName(''); setNewPin(''); setNewPinConfirm('')
    router.push(`/party/${data.id}`)
  }

  function attemptEnter(party: Party) {
    if (getUnlocked()[party.id]) return router.push(`/party/${party.id}`)
    setPinTarget(party); setPinInput(''); setPinError(''); setShowPin(false)
  }

  function submitPin() {
    if (!pinTarget) return
    if (pinInput === pinTarget.pin) {
      setUnlocked(pinTarget.id)
      router.push(`/party/${pinTarget.id}`)
    } else {
      setPinError('Wrong PIN — try again')
      setPinInput('')
    }
  }

  async function deleteParty(party: Party, e: React.MouseEvent) {
    e.stopPropagation()
    if (!getUnlocked()[party.id]) return
    if (!confirm(`Delete "${party.name}"? This removes all characters inside.`)) return
    await supabase.from('parties').delete().eq('id', party.id)
    loadParties()
  }

  const unlocked = getUnlocked()

  return (
    <div className="min-h-full flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">🐉</span>
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--gold)' }}>MiniDnD</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Choose your party</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowThemePicker(true)}
            className="p-2.5 rounded-xl transition-opacity hover:opacity-80"
            title="Change theme"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <Palette size={18} />
          </button>
          <button onClick={() => { setShowCreate(true); setCreateError('') }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 active:scale-95"
            style={{ background: 'var(--gold)', color: '#1c1917' }}>
            <Plus size={18} /> New Party
          </button>
        </div>
      </header>

      <main className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-lg" style={{ color: 'var(--text-muted)' }}>
            Loading…
          </div>
        ) : parties.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <span className="text-6xl">⚔️</span>
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>No parties yet</p>
            <button onClick={() => setShowCreate(true)}
              className="px-6 py-3 rounded-xl font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--gold)', color: '#1c1917' }}>
              Create your first party
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {parties.map(party => {
              const isUnlocked = unlocked[party.id]
              const hasBg = !!party.background_url
              return (
                <button key={party.id} onClick={() => { forceRender(n => n + 1); attemptEnter(party) }}
                  className="relative text-left rounded-2xl p-6 transition-all duration-150 hover:scale-105 active:scale-100 group cursor-pointer overflow-hidden"
                  style={hasBg ? {
                    backgroundImage: `linear-gradient(var(--overlay-color), var(--overlay-color)), url(${party.background_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1px solid var(--border)',
                  } : {
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                  }}>
                  <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: isUnlocked ? 'var(--gold)' : 'var(--border)' }} />
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-5xl">{isUnlocked ? '🛡️' : '🔒'}</span>
                    {isUnlocked && (
                      <span onClick={e => deleteParty(party, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all cursor-pointer"
                        style={{ color: 'var(--text-muted)' }}>
                        <Trash2 size={18} />
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-xl font-bold mb-1">{party.name}</h2>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {isUnlocked ? 'Tap to enter' : 'PIN required'}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </main>

      {/* Theme Picker */}
      {showThemePicker && (
        <Modal title="Choose Theme" onClose={() => setShowThemePicker(false)}>
          <div className="flex flex-col gap-3">
            {THEMES.map(t => (
              <button key={t.id} onClick={() => { setTheme(t.id); setShowThemePicker(false) }}
                className="flex items-center gap-4 p-4 rounded-xl text-left transition-all hover:opacity-90"
                style={{
                  background: t.preview.bg,
                  border: `2px solid ${theme === t.id ? t.preview.accent : 'rgba(128,128,128,0.3)'}`,
                }}>
                <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-xl"
                  style={{ background: t.preview.surface }}>
                  {t.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-bold" style={{ color: t.preview.text }}>{t.name}</p>
                  <div className="flex gap-1.5 mt-1.5">
                    {[t.preview.bg, t.preview.surface, t.preview.accent].map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-full" style={{ background: c, border: '1px solid rgba(128,128,128,0.3)' }} />
                    ))}
                  </div>
                </div>
                {theme === t.id && (
                  <span className="text-lg shrink-0" style={{ color: t.preview.accent }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Create Party */}
      {showCreate && (
        <Modal title="Create Party" onClose={() => setShowCreate(false)}>
          <div className="flex flex-col gap-4">
            <Field label="Party name">
              <input autoFocus type="text" placeholder="The Fellowship…" value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createParty()}
                className="w-full px-4 py-3 rounded-xl text-base outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </Field>
            <Field label="4-digit PIN">
              <input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-4 py-3 rounded-xl text-base outline-none tracking-widest"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </Field>
            <Field label="Confirm PIN">
              <input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={newPinConfirm}
                onChange={e => setNewPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={e => e.key === 'Enter' && createParty()}
                className="w-full px-4 py-3 rounded-xl text-base outline-none tracking-widest"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </Field>
            {createError && <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{createError}</p>}
            <button onClick={createParty} disabled={creating}
              className="w-full py-3 rounded-xl font-bold text-base transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--gold)', color: '#1c1917' }}>
              {creating ? 'Creating…' : 'Create Party'}
            </button>
          </div>
        </Modal>
      )}

      {/* PIN Entry */}
      {pinTarget && (
        <Modal title={`Enter PIN — ${pinTarget.name}`} onClose={() => setPinTarget(null)}>
          <div className="flex flex-col gap-4">
            <div className="text-center text-5xl mb-2">🔒</div>
            <div className="relative">
              <input ref={pinRef} type={showPin ? 'text' : 'password'} inputMode="numeric"
                maxLength={4} placeholder="••••" value={pinInput}
                onChange={e => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError('') }}
                onKeyDown={e => e.key === 'Enter' && submitPin()}
                className="w-full px-4 py-4 rounded-xl text-center text-2xl tracking-widest outline-none"
                style={{ background: 'var(--surface-2)', border: `1px solid ${pinError ? 'var(--danger)' : 'var(--border)'}`, color: 'var(--text)' }} />
              <button onClick={() => setShowPin(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}>
                {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {pinError && <p className="text-sm text-center font-medium" style={{ color: 'var(--danger)' }}>{pinError}</p>}
            <button onClick={submitPin}
              className="w-full py-3 rounded-xl font-bold text-base transition-opacity hover:opacity-80"
              style={{ background: 'var(--gold)', color: '#1c1917' }}>
              Enter
            </button>
          </div>
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
