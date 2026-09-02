import './site.css'
import type { ReactNode } from 'react'

// Layout de segment : charge la feuille du SITE VITRINE uniquement pour /site/[slug].
export default function SiteSegmentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
