'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import Attention from './Attention'
import { Auto, Cloche, Compteur, Sante, compteursDe, lire } from './Barre'
import { ToastErreurs } from './Bandeau'
import Commandement from './Commandement'
import Equipage from './Equipage'
import Journal from './Journal'
import type { Bulle, Compteur as CompteurServi, Direct, Poser, Role, Tresorerie } from './Station'

// La disposition téléphone (moins de 1024 px) : une barre compacte de 88 px (deux lignes), cinq onglets en bas
// (Attention ouvert par défaut, avec le total en badge), et la feuille « Tous les compteurs » ouverte par un appui sur la
// seconde ligne de la barre. Rien ne défile à l'horizontale : tout se replie ou passe à la ligne.
type Props = {
  role: Role
  direct: Direct | null
  erreurVue: string | null
  tresorerie: Tresorerie | null
  erreurTresorerie: string | null
  maintenant: number
  prenom: string
  poser: Poser
  bulles: Bulle[]
  agentsActifs: CompteurServi | null
  /** Le cadre de la carte, monté par Station.tsx après le premier 200 de vue=direct (ou rien avant). */
  carte: ReactNode
}

type Onglet = 'attention' | 'journal' | 'station' | 'missions' | 'plus'
const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: 'attention', libelle: 'Attention' },
  { cle: 'journal', libelle: 'Journal' },
  { cle: 'station', libelle: 'Station' },
  { cle: 'missions', libelle: 'Missions' },
  { cle: 'plus', libelle: 'Plus' },
]
// La ligne 2 de la barre compacte : ces trois compteurs, dans cet ordre (ceux que le serveur ne sert pas sont omis).
const LIGNE_2 = ['encaisse_mois', 'envois', 'chef']

export default function Telephone({ role, direct, erreurVue, tresorerie, erreurTresorerie, maintenant, prenom, poser, bulles, agentsActifs, carte }: Props) {
  const [onglet, setOnglet] = useState<Onglet>('attention')
  const [feuille, setFeuille] = useState(false)
  const barre = direct?.barre ?? null
  const compteurs = compteursDe(barre, tresorerie, erreurTresorerie, erreurVue)
  const ligne2 = LIGNE_2.map((cle) => compteurs.find((c) => c.cle === cle)).filter((c) => !!c)
  const att = lire(direct?.attention)
  const total = att.etat === 'ok' ? att.valeur.total : null

  return (
    <>
      <header className="mc-barre-tel" data-barre-tel>
        <div className="mc-tel-l1">
          <b className="mc-tel-titre">MISSION CONTROL</b>
          <Sante barre={barre} erreurVue={erreurVue} court />
          <Cloche barre={barre} />
          <Auto barre={barre} />
        </div>
        <button type="button" className="mc-tel-l2" data-barre-tel-ligne="2" aria-label="Tous les compteurs" onClick={() => setFeuille(true)}>
          {ligne2.map((c) => c ? <Compteur key={c.cle} c={c} /> : null)}
        </button>
      </header>

      <main className="mc-tel-main">
        {onglet === 'attention' ? <Attention env={direct?.attention ?? null} erreurVue={erreurVue} /> : null}
        {onglet === 'journal' ? <Journal bulles={bulles} role={role} equipage={direct?.equipage ?? null} agentsActifs={agentsActifs} /> : null}
        {onglet === 'station' ? (
          <>
            {carte}
            <ToastErreurs barre={barre} />
            <Equipage env={direct?.equipage ?? null} erreurVue={erreurVue} attention={direct?.attention ?? null} maintenant={maintenant} prenom={prenom} replie={false} poser={poser} />
          </>
        ) : null}
        {onglet === 'missions' ? <Commandement env={direct?.commandement ?? null} erreurVue={erreurVue} /> : null}
        {onglet === 'plus' ? (
          <nav className="mc-plus" aria-label="Plus">
            <button type="button" data-plus="succes" onClick={() => poser({ vue: 'succes' })}>Succès</button>
            {role === 'direction' ? <button type="button" data-plus="reglages" onClick={() => poser({ vue: 'reglages' })}>Réglages</button> : null}
            <button type="button" data-plus="aide" onClick={() => poser({ vue: 'aide' })}>Aide</button>
            <Link href="/controle" data-plus="poste">← Poste</Link>
          </nav>
        ) : null}
      </main>

      <nav className="mc-tel-onglets" role="tablist" aria-label="Sections de la station">
        {ONGLETS.map((o) => (
          <button key={o.cle} type="button" role="tab" data-onglet-tel={o.cle} aria-selected={onglet === o.cle ? 'true' : 'false'} onClick={() => setOnglet(o.cle)}>
            <span>{o.libelle}</span>
            {o.cle === 'attention' && total ? <span className="mc-badge" aria-label={`${total} à traiter`}>{total}</span> : null}
          </button>
        ))}
      </nav>

      {feuille ? (
        <div className="mc-feuille" data-feuille="compteurs" role="dialog" aria-modal="true" aria-label="Tous les compteurs">
          <div className="mc-feuille-tete">
            <h2>Tous les compteurs</h2>
            <button type="button" data-fermer onClick={() => setFeuille(false)}>Fermer</button>
          </div>
          <div className="mc-feuille-grille">
            {compteurs.map((c) => <Compteur key={c.cle} c={c} />)}
          </div>
        </div>
      ) : null}
    </>
  )
}
