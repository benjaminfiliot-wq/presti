// components/ui/Toasts.tsx — confirmations d'action (« Devis envoyé », « Lien copié »), refonte 18/10 étape 4.2.
// `toast('Lien copié')` depuis n'importe quel composant client ; <Toasts /> est monté UNE fois (par la coque de la console).
// Région aria-live polie (assertive pour une erreur) ; 4 s puis disparaît, suspendu au survol et au focus ; bouton Fermer.
// Même libellé que le bouton (« Envoyer » → « Envoyé ») : c'est l'appelant qui l'écrit.
'use client'

import './ui.css'
import { useEffect, useRef, useState } from 'react'
import { Icone } from './icones'

type Ton = 'info' | 'ok' | 'crit'
type Toast = { id: number; texte: string; ton: Ton }
const EVENEMENT = 'presti:toast'
let suivant = 1

export function toast(texte: string, ton: Ton = 'ok') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<Toast>(EVENEMENT, { detail: { id: suivant++, texte, ton } }))
}

export default function Toasts({ duree = 4000 }: { duree?: number }) {
  const [liste, setListe] = useState<Toast[]>([])
  const [suspendu, setSuspendu] = useState(false)
  const minuteurs = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const recevoir = (e: Event) => { const t = (e as CustomEvent<Toast>).detail; setListe((l) => [...l.slice(-2), t]) }
    window.addEventListener(EVENEMENT, recevoir)
    return () => window.removeEventListener(EVENEMENT, recevoir)
  }, [])
  useEffect(() => {
    const m = minuteurs.current
    if (suspendu) { m.forEach((t) => clearTimeout(t)); m.clear(); return }
    for (const t of liste) if (!m.has(t.id)) m.set(t.id, setTimeout(() => { setListe((l) => l.filter((x) => x.id !== t.id)); m.delete(t.id) }, duree))
  }, [liste, suspendu, duree])

  const retirer = (id: number) => setListe((l) => l.filter((x) => x.id !== id))
  return (
    <div className="ui-toasts" onMouseEnter={() => setSuspendu(true)} onMouseLeave={() => setSuspendu(false)} onFocus={() => setSuspendu(true)} onBlur={() => setSuspendu(false)}>
      <div role="status" aria-live="polite" className="ui-sr">{liste.filter((t) => t.ton !== 'crit').map((t) => t.texte).join('. ')}</div>
      <div role="alert" className="ui-sr">{liste.filter((t) => t.ton === 'crit').map((t) => t.texte).join('. ')}</div>
      {liste.map((t) => (
        <div key={t.id} className={`ui-toast ui-toast--${t.ton}`}>
          <p>{t.texte}</p>
          <button type="button" aria-label="Fermer la notification" onClick={() => retirer(t.id)}><Icone nom="fermer" /></button>
        </div>
      ))}
    </div>
  )
}
