'use client'

import { useEffect, useState } from 'react'
import { CLE_NE_PAS_COMPTER } from '@/lib/audience'

// Le droit d'opposition à la mesure d'audience (migrations 0090, 0091), en un geste. Le choix reste dans CE navigateur
// (stockage local) : il ne nous est pas envoyé — l'envoyer serait justement compter la personne qui refuse.
//
// `?exclure=1` : le lien du Poste de contrôle. Le stockage est propre à chaque origine, et le Poste vit souvent sur
// qg.prestiapp.fr : une clé posée là-bas ne serait jamais lue ici. Le lien vient donc la poser sur la vitrine.
export default function NePasCompter() {
  const [etat, setEtat] = useState<'compte' | 'refuse' | 'signal' | 'ferme' | null>(null)

  useEffect(() => {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
    if (nav.globalPrivacyControl === true || nav.doNotTrack === '1') { setEtat('signal'); return }
    try {
      if (new URLSearchParams(window.location.search).get('exclure') === '1') { localStorage.setItem(CLE_NE_PAS_COMPTER, 'non'); setEtat('refuse'); return }
      setEtat(localStorage.getItem(CLE_NE_PAS_COMPTER) === 'non' ? 'refuse' : 'compte')
    } catch { setEtat('ferme') }
  }, [])

  const basculer = () => {
    try {
      if (etat === 'refuse') { localStorage.removeItem(CLE_NE_PAS_COMPTER); setEtat('compte') }
      else { localStorage.setItem(CLE_NE_PAS_COMPTER, 'non'); setEtat('refuse') }
    } catch { setEtat('ferme') }
  }

  if (etat === null) return null
  if (etat === 'signal') return <p data-audience-etat="signal"><strong>Votre navigateur envoie un signal de refus (Global Privacy Control ou Do Not Track) : vous n’êtes pas compté.</strong></p>
  if (etat === 'ferme') return <p data-audience-etat="ferme">Le stockage de votre navigateur est fermé : pour ne pas être compté, activez le signal « Global Privacy Control » ou « Do Not Track » de votre navigateur.</p>
  return (
    <p data-audience-etat={etat}>
      {etat === 'refuse' ? <strong>Ce navigateur n’est pas compté. </strong> : 'Ce navigateur est compté, anonymement. '}
      <button type="button" className="btn" onClick={basculer} style={{ width: 'auto', marginLeft: '.4rem' }}>{etat === 'refuse' ? 'Me compter à nouveau' : 'Ne plus me compter'}</button>
    </p>
  )
}
