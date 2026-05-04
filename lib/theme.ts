'use client'
import { useEffect, useState } from 'react'

export type Theme =
  | 'dungeon' | 'arcane' | 'parchment' | 'notion' | 'matrix'
  | 'bloodmoon' | 'forest' | 'frost' | 'volcanic' | 'rose'
  | 'celestial' | 'ocean' | 'highcontrast'

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
  { id: 'dungeon',      name: 'Dungeon',       emoji: '🪨', preview: { bg: '#1c1917', surface: '#292524', accent: '#f59e0b', text: '#f5f5f4' } },
  { id: 'arcane',       name: 'Arcane',        emoji: '🔮', preview: { bg: '#0f0e17', surface: '#1a1830', accent: '#a78bfa', text: '#e8e6f0' } },
  { id: 'parchment',    name: 'Parchment',     emoji: '📜', preview: { bg: '#f5efe0', surface: '#ede3cc', accent: '#8b5e2a', text: '#2c1a0e' } },
  { id: 'bloodmoon',    name: 'Blood Moon',    emoji: '🩸', preview: { bg: '#0d0000', surface: '#1a0505', accent: '#cc2222', text: '#f0d0d0' } },
  { id: 'forest',       name: 'Forest',        emoji: '🌿', preview: { bg: '#0a1a0a', surface: '#122012', accent: '#c8962a', text: '#d4e8d0' } },
  { id: 'volcanic',     name: 'Volcanic',      emoji: '🌋', preview: { bg: '#120808', surface: '#1e1010', accent: '#ff6600', text: '#f0c090' } },
  { id: 'ocean',        name: 'Ocean',         emoji: '🌊', preview: { bg: '#061626', surface: '#0d2238', accent: '#00c8b8', text: '#c8e8f8' } },
  { id: 'celestial',    name: 'Celestial',     emoji: '✨', preview: { bg: '#08080f', surface: '#10101e', accent: '#ffd700', text: '#e8e8f8' } },
  { id: 'frost',        name: 'Frost',         emoji: '❄️', preview: { bg: '#e8f4f8', surface: '#d0e8f0', accent: '#0080c0', text: '#1a3040' } },
  { id: 'rose',         name: 'Rose',          emoji: '🌹', preview: { bg: '#fdf4f5', surface: '#f5e0e4', accent: '#c05070', text: '#3d1a24' } },
  { id: 'notion',       name: 'Notion',        emoji: '📋', preview: { bg: '#ffffff', surface: '#f7f6f3', accent: '#2383e2', text: '#37352f' } },
  { id: 'matrix',       name: 'Matrix',        emoji: '💻', preview: { bg: '#000000', surface: '#0a0a0a', accent: '#00ff41', text: '#00ff41' } },
  { id: 'highcontrast', name: 'High Contrast', emoji: '⬛', preview: { bg: '#000000', surface: '#111111', accent: '#ffffff', text: '#ffffff' } },
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
