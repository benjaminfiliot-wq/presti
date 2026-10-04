'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { apiDirection } from '../../client'
import Fenetre, { Pastille, type SalleProps } from './Fenetre'
import { jour, messagePanne, usePanneau } from './lecture'

// Le Studio pubs (fiche 026-164, §4.5) : les packs servis par la route des packs, telle que l'onglet Packs du Poste la lit
// (026-137), une ligne par pack : métier, commune, état, date. Ni aperçu ni film (ils restent dans l'onglet Packs, où se fait
// aussi le geste « Livrer ») : un seul lien y renvoie. Lecture seule, toutes les minutes. La route absente (drapeau `packPub`
// baissé, 404) n'est pas une erreur : la salle le dit.
type Pack = { id: string; etat: string; metier: string | null; commune: string | null; fabrique_le: string | null; livre_le: string | null }
type Packs = { packs: Pack[]; a?: string }

const UNE_MINUTE = 60_000
const estPacks = (corps: any) => !!corps && typeof corps === 'object' && Array.isArray((corps as Packs).packs)
const tonEtat = (e: string) => (e === 'livree' ? 'ok' : e === 'fabriquee' ? 'actif' : 'muet')

export default function Studio({ equipage, poser, onFermer }: SalleProps) {
  const statut = useRef<number | null>(null)
  const etat = usePanneau(async () => { const r = await apiDirection<Packs>('/api/controle/packs'); statut.current = r.status; return r }, estPacks, UNE_MINUTE)
  const packs = etat.rep?.packs ?? null
  return (
    <Fenetre cle="studio" titre="Studio pubs" onFermer={onFermer} resume={{ equipage, poser, taches: packs?.length ?? null }}>
      {packs ? (
        packs.length === 0 ? <p className="mc-etat">Aucun pack pour l'instant.</p> : (
          <ul className="mc-liste" data-groupe="packs">
            {packs.map((p) => (
              <li key={p.id} data-pack={p.id}>
                <span className="mc-gras">{p.metier ?? '—'}</span>
                <span>{p.commune ?? '—'}</span>
                <Pastille ton={tonEtat(p.etat)}>{p.etat}</Pastille>
                <small className="mc-chiffre mc-doux">{jour(p.livre_le ?? p.fabrique_le)}</small>
              </li>
            ))}
          </ul>
        )
      ) : etat.panne && statut.current === 404 ? <p className="mc-etat" data-packs-fermes>Les packs pubs ne sont pas encore ouverts.</p>
        : etat.panne ? <p className="mc-panne" role="alert">{messagePanne('Packs pubs', etat.panne)}</p>
        : <p className="mc-etat" role="status">Chargement…</p>}
      <p><Link className="mc-lien" href="/controle?onglet=packs" data-lien-packs>Ouvrir l'onglet Packs</Link></p>
    </Fenetre>
  )
}
