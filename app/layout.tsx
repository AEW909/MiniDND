import type { Metadata, Viewport } from 'next'
import { Cinzel, Inter, IM_Fell_English_SC, Crimson_Text, Share_Tech_Mono } from 'next/font/google'
import './globals.css'

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-cinzel',
  display: 'swap',
})
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})
const imFell = IM_Fell_English_SC({
  subsets: ['latin'],
  weight: '400',
  style: 'normal',
  variable: '--font-im-fell',
  display: 'swap',
})
const crimson = Crimson_Text({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: 'normal',
  variable: '--font-crimson',
  display: 'swap',
})
const shareTechMono = Share_Tech_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MiniDnD',
  description: 'D&D character tracker for adventurers',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = [
    cinzel.variable, inter.variable, imFell.variable, crimson.variable, shareTechMono.variable,
  ].join(' ')

  return (
    <html lang="en" className={`h-full ${fontVars}`}>
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('minidnd_theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}` }} />
      </head>
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}
