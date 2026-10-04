'use client'

import { useState } from 'react'
import { euros } from '@/lib/direction/fraicheur'
import { apiDirection } from '../../client'
import type { Env, Tresorerie } from '../Station'
import Fenetre, { Corps, Onglets, Tuile, type SalleProps } from './Fenetre'
import { HORS_PERIMETRE, ecrire, estNombre, jour, usePanneau, type Rep } from './lecture'

// La salle Recettes (fiche 026-120, §4.5) : l'argent qui entre, tel que la route le sert. Les montants qui existent déjà
// ailleurs (MRR, paiements, brut, frais, net) viennent de la trésorerie (026-059) : deux chiffres, un écran. C'est ICI, et
// nulle part ailleurs dans la station, que le brut et les frais de Stripe s'affichent (CANAUX).
type Source = { commandes: number; montant_eur: number }
type Jour = { jour: string; agents_eur: number; hors_agents_eur: number }
type Vue = { jours: Jour[]; sites: { agents: Source; hors_agents: Source }; packs: Env<unknown> }
type Mois = { brut: number; frais: number; net: number; paiements: number; rembourse: number }
type Abonnements = { mrr: number; abonnements: number }

const ONGLETS = [
  { cle: 'tout', libelle: 'Tout' },
  { cle: 'sites', libelle: 'Sites' },
  { cle: 'abonnements', libelle: 'Abonnements' },
  { cle: 'packs', libelle: 'Packs' },
  { cle: 'hors_agents', libelle: 'Hors agents' },
]
const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`

export default function Recettes({ tresorerie, equipage, poser, onFermer }: SalleProps & { tresorerie: Tresorerie | null }) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>('/api/controle/station?vue=salle&salle=recettes'))
  const [onglet, setOnglet] = useState('tout')
  const [choisi, setChoisi] = useState<number | null>(null)
  const mois = (tresorerie?.encaisse?.mois ?? null) as Env<Mois> | null
  const abonnements = (tresorerie?.mrr ?? null) as Env<Abonnements> | null
  const net = mois?.valeur ? euros(mois.valeur.net) : mois?.nonMesure ? HORS_PERIMETRE : null

  const sites = (v: Vue, froid: boolean, hors: boolean) => (
    <div className="mc-tuiles" data-groupe="sites">
      {froid ? <Tuile libelle="Venu des agents (froid)" note={pluriel(v.sites.agents.commandes, 'commande', 'commandes')}>{euros(v.sites.agents.montant_eur)}</Tuile> : null}
      {hors ? <Tuile libelle="Hors agents (base existante)" note={pluriel(v.sites.hors_agents.commandes, 'commande', 'commandes')}>{euros(v.sites.hors_agents.montant_eur)}</Tuile> : null}
    </div>
  )
  const stripe = (
    <>
      <div className="mc-tuiles" data-groupe="abonnements">
        <Tuile libelle="MRR" note="abonnements récurrents">{ecrire(abonnements, (a) => euros(a.mrr), 'Stripe')}</Tuile>
        <Tuile libelle="ABONNEMENTS ACTIFS">{ecrire(abonnements, (a) => String(a.abonnements), 'Stripe')}</Tuile>
        <Tuile libelle="PAIEMENTS">{ecrire(mois, (m) => String(m.paiements), 'Stripe')}</Tuile>
      </div>
      <h3 className="mc-titre-zone">CANAUX</h3>
      <div className="mc-tuiles" data-groupe="canaux">
        <Tuile libelle="Stripe · brut">{ecrire(mois, (m) => euros(m.brut), 'Stripe')}</Tuile>
        <Tuile libelle="Frais">{ecrire(mois, (m) => euros(m.frais), 'Stripe')}</Tuile>
        <Tuile libelle="Net">{ecrire(mois, (m) => euros(m.net), 'Stripe')}</Tuile>
      </div>
    </>
  )
  const packs = (v: Vue) => {
    const p = v.packs
    let texte = '—'
    if (p.nonMesure) texte = HORS_PERIMETRE
    else if (p.valeur && typeof p.valeur === 'object') {
      const x = p.valeur as { commandes?: unknown; montant_eur?: unknown }
      texte = estNombre(x.commandes) && estNombre(x.montant_eur) ? `${pluriel(x.commandes, 'pack', 'packs')} · ${euros(x.montant_eur)}` : '—'
    } else texte = p.manque ?? p.erreur ?? '—'
    return <div className="mc-tuiles" data-groupe="packs"><Tuile libelle="Packs">{texte}</Tuile></div>
  }
  const histogramme = (v: Vue) => {
    const max = Math.max(1, ...v.jours.map((j) => j.agents_eur + j.hors_agents_eur))
    const j = choisi !== null ? v.jours[choisi] : null
    return (
      <div className="mc-histo-boite">
        <h3 className="mc-titre-zone">30 DERNIERS JOURS</h3>
        <ul className="mc-histo" data-histogramme aria-label="Recettes des 30 derniers jours">
          {v.jours.map((d, i) => (
            <li key={d.jour} data-jour={d.jour} tabIndex={0} aria-label={`${jour(d.jour)} : agents ${euros(d.agents_eur)}, hors agents ${euros(d.hors_agents_eur)}`} title={`${jour(d.jour)} · agents ${euros(d.agents_eur)} · hors agents ${euros(d.hors_agents_eur)}`}
              onMouseEnter={() => setChoisi(i)} onFocus={() => setChoisi(i)} onClick={() => setChoisi(i)}>
              <span className="mc-histo-h" style={{ height: `${(d.hors_agents_eur / max) * 100}%` }} />
              <span className="mc-histo-a" style={{ height: `${(d.agents_eur / max) * 100}%` }} />
            </li>
          ))}
        </ul>
        <p className="mc-histo-detail" data-jour-detail role="status">
          {j ? `${jour(j.jour)} · agents ${euros(j.agents_eur)} · hors agents ${euros(j.hors_agents_eur)}` : 'Survolez ou touchez un jour pour lire ses montants.'}
        </p>
        <p className="mc-histo-legende"><span className="mc-leg mc-leg-a" aria-hidden="true" /> venu des agents <span className="mc-leg mc-leg-h" aria-hidden="true" /> hors agents</p>
      </div>
    )
  }

  return (
    <Fenetre cle="recettes" titre="Recettes" onFermer={onFermer} etat={etat} resume={{ equipage, poser, recettes: net }}>
      <Corps etat={etat} quoi="Recettes">
        {(v) => (
          <>
            <Onglets liste={ONGLETS} actif={onglet} choisir={setOnglet} nom="Recettes" />
            {onglet === 'tout' ? <>{sites(v, true, true)}{stripe}{packs(v)}{histogramme(v)}</> : null}
            {onglet === 'sites' ? <>{sites(v, true, true)}{histogramme(v)}</> : null}
            {onglet === 'abonnements' ? stripe : null}
            {onglet === 'packs' ? packs(v) : null}
            {onglet === 'hors_agents' ? <>{sites(v, false, true)}<p className="mc-etat">Hors agents : la base existante, les commandes que les agents n’ont pas amenées.</p></> : null}
          </>
        )}
      </Corps>
    </Fenetre>
  )
}
