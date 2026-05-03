'use client'
import { useEffect, useState } from 'react'

export type Theme = 'dungeon' | 'arcane' | 'parchment'

const THEME_KEY = 'minidnd_theme'

const THEME_FONTS: Record<Theme, { display: string; body: string }> = {
  dungeon:   { display: "'Cinzel', Georgia, serif",            body: "system-ui, -apple-system, sans-serif" },
  arcane:    { display: "'Cinzel', Georgia, serif",            body: "'Inter', system-ui, sans-serif" },
  parchment: { display: "'IM Fell English SC', Georgia, serif", body: "'Crimson Text', Georgia, serif" },
}

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
  // Set font variables directly on the element so browsers repaint immediately
  const { display, body } = THEME_FONTS[t]
  document.documentElement.style.setProperty('--font-display', display)
  document.documentElement.style.setProperty('--font-body', body)
  document.body.style.fontFamily = body
}

export const THEMES: {
  id: Theme
  name: string
  emoji: string
  preview: { bg: string; surface: string; accent: string; text: string }
}[] = [
  {
    id: 'dungeon',
    name: 'Dungeon',
    emoji: '🪨',
    preview: { bg: '#1c1917', surface: '#292524', accent: '#f59e0b', text: '#f5f5f4' },
  },
  {
    id: 'arcane',
    name: 'Arcane',
    emoji: '🔮',
    preview: { bg: '#0f0e17', surface: '#1a1830', accent: '#a78bfa', text: '#e8e6f0' },
  },
  {
    id: 'parchment',
    name: 'Parchment',
    emoji: '📜',
    preview: { bg: '#f5efe0', surface: '#ede3cc', accent: '#8b5e2a', text: '#2c1a0e' },
  },
]

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dungeon')

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as Theme) || 'dungeon'
    setThemeState(stored)
    applyTheme(stored)
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem(THEME_KEY, t)
    applyTheme(t)
  }

  return { theme, setTheme }
}
