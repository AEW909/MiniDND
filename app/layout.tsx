import type { Metadata, Viewport } from 'next'
import {
  Cinzel, Inter,
  IM_Fell_English_SC, Crimson_Text,
  Share_Tech_Mono,
  Pirata_One, EB_Garamond,
  Philosopher, Lato,
  Raleway, Nunito,
  Bebas_Neue,
  Cormorant_Garamond, Mulish,
  Josefin_Sans, Quicksand,
  Playfair_Display, Source_Sans_3,
} from 'next/font/google'
import './globals.css'

const cinzel          = Cinzel({ subsets: ['latin'], weight: ['400','600','700','900'], variable: '--font-cinzel', display: 'swap' })
const inter           = Inter({ subsets: ['latin'], weight: ['400','500','600'], variable: '--font-inter', display: 'swap' })
const imFell          = IM_Fell_English_SC({ subsets: ['latin'], weight: '400', style: 'normal', variable: '--font-im-fell', display: 'swap' })
const crimson         = Crimson_Text({ subsets: ['latin'], weight: ['400','600'], style: 'normal', variable: '--font-crimson', display: 'swap' })
const shareTechMono   = Share_Tech_Mono({ subsets: ['latin'], weight: '400', variable: '--font-mono', display: 'swap' })
const pirataOne       = Pirata_One({ subsets: ['latin'], weight: '400', variable: '--font-pirata', display: 'swap' })
const ebGaramond      = EB_Garamond({ subsets: ['latin'], weight: ['400','600'], style: 'normal', variable: '--font-garamond', display: 'swap' })
const philosopher     = Philosopher({ subsets: ['latin'], weight: ['400','700'], variable: '--font-philosopher', display: 'swap' })
const lato            = Lato({ subsets: ['latin'], weight: ['400','700'], variable: '--font-lato', display: 'swap' })
const raleway         = Raleway({ subsets: ['latin'], weight: ['400','600'], variable: '--font-raleway', display: 'swap' })
const nunito          = Nunito({ subsets: ['latin'], weight: ['400','600'], variable: '--font-nunito', display: 'swap' })
const bebasNeue       = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-bebas', display: 'swap' })
const cormorant       = Cormorant_Garamond({ subsets: ['latin'], weight: ['400','600'], style: 'normal', variable: '--font-cormorant', display: 'swap' })
const mulish          = Mulish({ subsets: ['latin'], weight: ['400','600'], variable: '--font-mulish', display: 'swap' })
const josefinSans     = Josefin_Sans({ subsets: ['latin'], weight: ['400','600'], variable: '--font-josefin', display: 'swap' })
const quicksand       = Quicksand({ subsets: ['latin'], weight: ['400','600'], variable: '--font-quicksand', display: 'swap' })
const playfair        = Playfair_Display({ subsets: ['latin'], weight: ['400','600'], style: 'normal', variable: '--font-playfair', display: 'swap' })
const sourceSans      = Source_Sans_3({ subsets: ['latin'], weight: ['400','600'], style: 'normal', variable: '--font-source-sans', display: 'swap' })

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
    cinzel, inter, imFell, crimson, shareTechMono,
    pirataOne, ebGaramond, philosopher, lato, raleway,
    nunito, bebasNeue, cormorant, mulish, josefinSans,
    quicksand, playfair, sourceSans,
  ].map(f => f.variable).join(' ')

  return (
    <html lang="en" className={`h-full ${fontVars}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('minidnd_theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}` }} />
      </head>
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}
