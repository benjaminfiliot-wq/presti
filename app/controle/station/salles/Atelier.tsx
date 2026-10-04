'use client'

import { useState } from 'react'
import { apiDirection } from '../../client'
import Fenetre, { Corps, Onglets, Pastille, Tuile, type SalleProps } from './Fenetre'
import { heure, lienSur, usePanneau, type Rep } from './lecture'

// L'Atelier des maquettes (fiche 026-120, §4.5) : les maquettes du jour, leur verdict, l'aperçu signé que la route sert, la
// zone REJET et le taux de PASS. Une maquette que le juge a renvoyée porte « RÉVISION DEMANDÉE » et sa raison. Lecture seule.
type Maquette = { id: string; metier: string | null; commune: string | null; statut: string; video: boolean | null; verdict: string | null; le: string; apercu: string | null; revision?: string | null }
type Vue = { maquettes: Maquette[]; rejet: number; tauxPass: number | null }

const ONGLETS = [{ cle: 'actives', libelle: 'ACTIVES' }, { cle: 'attente', libelle: 'EN ATTENTE DE JUGE' }, { cle: 'revisions', libelle: 'RÉVISIONS' }]
const tonVerdict = (v: string | null) => (v === null ? 'muet' : /^pass$/i.test(v) ? 'ok' : 'crit')

function Liste({ liste, vide }: { liste: Maquette[]; vide: string }) {
  if (liste.length === 0) return <p className="mc-etat">{vide}</p>
  return (
    <ul className="mc-liste mc-maquettes" data-groupe="maquettes">
      {liste.map((m) => {
        const lien = lienSur(m.apercu)
        return (
          <li key={m.id} data-maquette={m.id}>
            <div className="mc-commande-tete"><span className="mc-gras">{m.metier ?? '—'}</span><span>{m.commune ?? '—'}</span><small className="mc-doux">{heure(m.le)}</small></div>
            <div className="mc-meta">
              <Pastille ton="muet">{m.statut}</Pastille>
              <span>{m.video === null ? 'vidéo —' : m.video ? 'vidéo oui' : 'vidéo non'}</span>
              <span>verdict <Pastille ton={tonVerdict(m.verdict ?? null)}>{m.verdict ?? '—'}</Pastille></span>
            </div>
            {m.revision ? <p className="mc-revision" data-revision><Pastille ton="warn">RÉVISION DEMANDÉE</Pastille> <span>{m.revision}</span></p> : null}
            {lien ? <a className="mc-lien" href={lien} target="_blank" rel="noopener noreferrer">Voir l’aperçu</a> : null}
          </li>
        )
      })}
    </ul>
  )
}

export default function Atelier({ equipage, poser, onFermer }: SalleProps) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>('/api/controle/station?vue=salle&salle=atelier'))
  const [onglet, setOnglet] = useState('actives')
  const v = etat.rep?.valeur ?? null
  return (
    <Fenetre cle="atelier" titre="Atelier des maquettes" onFermer={onFermer} etat={etat} resume={{ equipage, poser, taches: v?.maquettes?.length ?? null }}>
      <Corps etat={etat} quoi="Atelier des maquettes">
        {(vue) => (
          <>
            <div className="mc-tuiles" data-groupe="atelier">
              <Tuile libelle="REJET" attribut="rejet">{vue.rejet}</Tuile>
              <Tuile libelle="PASS" attribut="taux-pass">{vue.tauxPass === null || vue.tauxPass === undefined ? '—' : `${Math.round(vue.tauxPass * 100)} %`}</Tuile>
            </div>
            <Onglets liste={ONGLETS} actif={onglet} choisir={setOnglet} nom="Atelier des maquettes" />
            {onglet === 'actives' ? <Liste liste={vue.maquettes} vide="Aucune maquette aujourd’hui." /> : null}
            {onglet === 'attente' ? <Liste liste={vue.maquettes.filter((m) => m.verdict == null)} vide="Aucune maquette n’attend le juge." /> : null}
            {onglet === 'revisions' ? <Liste liste={vue.maquettes.filter((m) => !!m.revision)} vide="Aucune révision demandée." /> : null}
          </>
        )}
      </Corps>
    </Fenetre>
  )
}
