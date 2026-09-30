'use client'

import { useEffect, useRef, useState } from 'react'
import { euros } from '@/lib/direction/fraicheur'
import { ecrireStockage, lire, lireStockage } from './Barre'
import type { BandeauDonnees, BarreDonnees, Env, Poser, Role, Tresorerie } from './Station'

// Le bandeau du bas : à gauche la navigation à six entrées, au centre les ventes servies, à droite la pastille
// « 1 234 € · n en ligne » (les mêmes objets qu'ENCAISSÉ · MOIS et SITES EN LIGNE). Il ne défile jamais en boucle : un
// élément NOUVEAU entre une fois par la droite (animation déclenchée par lui seul), puis tout reste immobile.
type Props = {
  role: Role
  env: Env<BandeauDonnees> | null
  erreurVue: string | null
  barre: Env<BarreDonnees> | null
  tresorerie: Tresorerie | null
  vue: string | null
  poser: Poser
}

const ENTREES: { cle: string; libelle: string }[] = [
  { cle: 'station', libelle: 'Station' },
  { cle: 'missions', libelle: 'Missions' },
  { cle: 'journal', libelle: 'Journal' },
  { cle: 'succes', libelle: 'Succès' },
  { cle: 'reglages', libelle: 'Réglages' },
  { cle: 'aide', libelle: 'Aide' },
]

export default function Bandeau({ role, env, erreurVue, barre, tresorerie, vue, poser }: Props) {
  const l = lire(env, erreurVue)
  const elements = l.etat === 'ok' ? l.valeur.elements : []
  // Les identifiants déjà vus : le premier chargement ne fait entrer personne ; ensuite, un id inconnu entre une fois.
  const vus = useRef<Set<number> | null>(null)
  const [nouveaux, setNouveaux] = useState<number[]>([])
  const ids = elements.map((e) => e.id).join(',')
  useEffect(() => {
    if (l.etat !== 'ok') return
    if (vus.current === null) { vus.current = new Set(elements.map((e) => e.id)); return }
    const frais = elements.map((e) => e.id).filter((id) => !vus.current!.has(id))
    if (!frais.length) return
    for (const id of frais) vus.current.add(id)
    setNouveaux((prec) => [...prec, ...frais])
  }, [ids, l.etat])

  const encaisse = lire(tresorerie?.encaisse?.mois)
  const b = lire(barre)
  const sites = lire(b.etat === 'ok' ? b.valeur.sites_en_ligne : null)
  const montant = encaisse.etat === 'ok' ? euros(encaisse.valeur.net) : '—'
  const enLigne = sites.etat === 'ok' ? String(sites.valeur) : '—'

  function aller(cle: string) {
    if (cle === 'station') poser({ vue: null, salle: null, agent: null })
    else if (cle === 'journal') document.querySelector('[data-station-journal]')?.scrollIntoView({ block: 'nearest' })
    else poser({ vue: cle })
  }

  return (
    <footer className="mc-bandeau" data-zone="bandeau">
      <nav className="mc-nav" aria-label="Navigation de la station">
        {ENTREES.filter((e) => !(role === 'lecture' && e.cle === 'reglages')).map((e) => (
          <button key={e.cle} type="button" data-nav={e.cle} aria-current={vue === e.cle ? 'page' : undefined} onClick={() => aller(e.cle)}>{e.libelle}</button>
        ))}
      </nav>
      <div className="mc-elements">
        {l.etat === 'chargement' ? <span className="mc-etat">Chargement…</span> : null}
        {l.etat === 'panne' ? <span className="mc-etat mc-panne">{`Ventes ne répond pas : ${l.raison}`}</span> : null}
        {l.etat === 'hors' ? <span className="mc-etat">— · hors périmètre</span> : null}
        {elements.map((e) => <span key={e.id} className="mc-element" data-element-bandeau={e.id} data-nouveau={nouveaux.includes(e.id) ? '' : undefined}>{e.texte}</span>)}
      </div>
      <span className="mc-pastille-bandeau" data-pastille-bandeau>{`${montant} · ${enLigne} en ligne`}</span>
    </footer>
  )
}

/** « n erreurs · 24 h × » : le compte servi ; × le masque dans ce navigateur jusqu'à l'erreur suivante. */
export function ToastErreurs({ barre }: { barre: Env<BarreDonnees> | null }) {
  const b = lire(barre)
  const erreurs = b.etat === 'ok' ? lire(b.valeur.erreurs) : null
  const n = erreurs?.etat === 'ok' ? erreurs.valeur : null
  const [masque, setMasque] = useState<number | null>(null)
  useEffect(() => {
    const m = Number(lireStockage('mc-toast-masque'))
    setMasque(lireStockage('mc-toast-masque') === null || !Number.isFinite(m) ? null : m)
  }, [])
  // Le nombre retombe (les erreurs sortent de la fenêtre de 24 h) : le masque suit, l'erreur suivante se verra.
  useEffect(() => {
    if (n !== null && masque !== null && n < masque) { setMasque(n); ecrireStockage('mc-toast-masque', String(n)) }
  }, [n, masque])
  if (n === null || n <= 0 || (masque !== null && n <= masque)) return null
  return (
    <div className="mc-toast" data-toast-erreurs role="status">
      <span>{n} {n > 1 ? 'erreurs' : 'erreur'} · 24 h</span>
      <button type="button" aria-label="Masquer jusqu’à la prochaine erreur" onClick={() => { setMasque(n); ecrireStockage('mc-toast-masque', String(n)) }}>×</button>
    </div>
  )
}
