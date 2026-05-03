'use client'
import { useEffect, useState } from 'react'

export type Theme = 'dungeon' | 'arcane' | 'parchment'

const THEME_KEY = 'minidnd_theme'

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
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem(THEME_KEY, t)
    document.documentElement.setAttribute('data-theme', t)
  }

  return { theme, setTheme }
}
