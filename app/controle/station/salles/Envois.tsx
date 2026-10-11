'use client'

import type { ComponentProps } from 'react'
import { apiDirection } from '../../client'
import { GestesEnvoi } from '../Gestes'
import Fenetre, { Corps, Pastille, Tuile, type SalleProps } from './Fenetre'
import { usePanneau, type Rep } from './lecture'

// La Salle des envois (fiche 026-120, voie gratuite du 25/09) : le palier, une ligne par canal (compteur et santé), une ligne
// par technologie de formulaire (envois, échecs d'affilée, état, motif), les envois du jour avec leurs trois verdicts
// (J1, J3, 2e juge), les anomalies en rouge. Sans envoi à froid : la phrase servie, jamais un tableau de zéros. Aucun bouton
// ni lien d'envoi : seuls les gestes du fondateur (GestesEnvoi, 026-117) agissent, et seulement pour le rôle direction.
type GestesServis = ComponentProps<typeof GestesEnvoi>['gestes']
type Canal = { canal: string; libelle?: string; utilises?: number; plafond?: number | null; texte: string; sante: string; raisons?: string[] }
type Technologie = { technologie: string; envois: number; echecs_affilee: number; etat: string; motif: string | null }
type Verdicts = { j1?: string | null; j3?: string | null; second?: string | null }
type Envoi = { id: string; metier?: string | null; commune?: string | null; canal: string; type: string; verdicts?: Verdicts }
type Vue = { palier: string | null; parCanal: Canal[]; parTechnologie: Technologie[]; envois: Envoi[]; rejets: number; anomalies: { id: string; texte: string }[]; vide: string | null; gestes: GestesServis }

const tonSante = (s: string) => (s === 'ok' ? 'ok' : s === 'attention' ? 'warn' : s === 'arretee' ? 'crit' : 'muet')
export const tonVerdict = (v: string | null | undefined) => (v === null || v === undefined ? 'muet' : /^pass$/i.test(v) ? 'ok' : 'crit')

/** Les trois verdicts d'un envoi : J1, J3 et le 2e juge, chacun une pastille (« — » tant qu'il n'a pas jugé). */
export function Verdicts({ verdicts }: { verdicts: Verdicts | undefined }) {
  const trois: [string, string | null | undefined][] = [['J1', verdicts?.j1], ['J3', verdicts?.j3], ['2e juge', verdicts?.second]]
  return (
    <span className="mc-verdicts">
      {trois.map(([nom, v]) => <span key={nom} className="mc-verdict"><span className="mc-doux">{nom}</span> <Pastille ton={tonVerdict(v)}>{v ?? '—'}</Pastille></span>)}
    </span>
  )
}

export default function Envois({ role, equipage, poser, onFermer }: SalleProps) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>('/api/controle/station?vue=salle&salle=envois'))
  const v = etat.rep?.valeur ?? null
  return (
    <Fenetre cle="envois" titre="Salle des envois" onFermer={onFermer} etat={etat} resume={{ equipage, poser, taches: v?.envois?.length ?? null }}>
      <Corps etat={etat} quoi="Salle des envois">
        {(vue) => (
          <>
            <div className="mc-tuiles" data-groupe="envois">
              <Tuile libelle="PALIER" attribut="palier">{vue.palier ?? '—'}</Tuile>
              <Tuile libelle="REJETS" attribut="rejets">{vue.rejets}</Tuile>
            </div>
            {vue.vide ? <p className="mc-vide" data-vide>{vue.vide}</p> : null}
            {vue.parCanal.length ? (
              <>
                <h3 className="mc-titre-zone">PAR CANAL</h3>
                <ul className="mc-liste" data-groupe="par-canal">
                  {vue.parCanal.map((c) => (
                    <li key={c.canal} data-canal={c.canal}>
                      <span className="mc-gras">{c.libelle ?? c.canal}</span>
                      <span className="mc-chiffre">{c.texte}</span>
                      <Pastille ton={tonSante(c.sante)}>{c.sante}</Pastille>
                      {(c.raisons ?? []).map((r, i) => <small key={i} className="mc-doux mc-raison">{r}</small>)}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {vue.parTechnologie.length ? (
              <>
                <h3 className="mc-titre-zone">PAR TECHNOLOGIE DE FORMULAIRE</h3>
                <ul className="mc-liste" data-groupe="par-technologie">
                  {vue.parTechnologie.map((g) => (
                    <li key={g.technologie} data-technologie={g.technologie}>
                      <span className="mc-gras">{g.technologie}</span>
                      <span>{g.envois} {g.envois > 1 ? 'envois' : 'envoi'}</span>
                      <span>{g.echecs_affilee} {g.echecs_affilee > 1 ? 'échecs' : 'échec'} d’affilée</span>
                      <Pastille ton={g.etat === 'pause' ? 'crit' : 'ok'}>{g.etat === 'pause' ? 'en pause' : 'active'}</Pastille>
                      {g.motif ? <small className="mc-doux mc-raison">{g.motif}</small> : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {vue.anomalies.length ? (
              <>
                <h3 className="mc-titre-zone">ANOMALIES</h3>
                <ul className="mc-liste" data-groupe="anomalies">
                  {vue.anomalies.map((a) => <li key={a.id} className="mc-anomalie"><span>{a.texte}</span></li>)}
                </ul>
              </>
            ) : null}
            {vue.envois.length ? (
              <>
                <h3 className="mc-titre-zone">ENVOIS DU JOUR</h3>
                <ul className="mc-liste" data-groupe="envois-du-jour">
                  {vue.envois.map((e) => (
                    <li key={e.id} data-envoi={e.id}>
                      <span className="mc-gras">{e.metier ?? '—'}</span>
                      <span>{e.commune ?? '—'}</span>
                      <small className="mc-doux">{e.canal} · {e.type}</small>
                      <Verdicts verdicts={e.verdicts} />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {role === 'direction' && vue.gestes ? <GestesEnvoi gestes={vue.gestes} canaux={vue.parCanal} role={role} /> : null}
          </>
        )}
      </Corps>
    </Fenetre>
  )
}
