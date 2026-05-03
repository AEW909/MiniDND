'use client'
import { useEffect, useState } from 'react'

export type Theme = 'dungeon' | 'arcane' | 'parchment' | 'notion' | 'matrix'

const THEME_KEY = 'minidnd_theme'

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
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
  {
    id: 'notion',
    name: 'Notion',
    emoji: '📋',
    preview: { bg: '#ffffff', surface: '#f7f6f3', accent: '#2383e2', text: '#37352f' },
  },
  {
    id: 'matrix',
    name: 'Matrix',
    emoji: '💻',
    preview: { bg: '#000000', surface: '#0a0a0a', accent: '#00ff41', text: '#00ff41' },
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
