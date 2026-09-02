import './plat.css'
import type { ReactNode } from 'react'

// Layout de segment : charge la feuille de la PLATEFORME uniquement pour /p/[slug].
export default function PlatSegmentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
