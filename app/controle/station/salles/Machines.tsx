'use client'

import type { CSSProperties } from 'react'
import { euros } from '@/lib/direction/fraicheur'
import { compteARebours } from '@/lib/pilotage/barre'
import { apiDirection } from '../../client'
import type { Env } from '../Station'
import Fenetre, { Corps, Pastille, type SalleProps } from './Fenetre'
import { HORS_PERIMETRE, estNombre, heure, messagePanne, usePanneau, type Rep } from './lecture'

// La Salle des machines (fiche 026-120, revue du 25/09) : ce qui tourne, seul, sans personne. Une ligne par agent (état,
// dernier battement, prochain passage), une ligne par cron (dernier passage, réussi ou non), la dernière mesure de l'usine,
// les IA gratuites (fournisseurs, bascules, coût du jour) et les jauges de quota. Les jauges viennent de /api/controle/jauges,
// la seule source des jauges (026-064) : leur état (ok, attention, pleine) est SERVI, l'écran ne calcule ni part ni seuil.
// Une mesure absente dit son manque ; aucun chiffre n'est inventé.
type AgentMachine = { nom: string; etat: string; battement_le: string | null; prochain_le: string | null }
type Cron = { nom: string; dernier_le: string | null; ok: boolean }
type Usine = { mesure: string; le: string | null }
type IA = { fournisseurs: { objet: string; resume: string; le?: string | null }[]; bascules: { resume: string; le?: string | null }[]; cout_jour_eur: unknown }
type Vue = { agents: AgentMachine[]; crons: Cron[]; usine: Env<Usine>; ia: Env<IA> }
type Jauge = { cle: string; libelle: string; utilise: number; plafond: number; part: number; etat: string }
type Jauges = { jauges: Jauge[]; a?: string }

const tonEtat = (e: string) => (e === 'actif' ? 'ok' : e === 'pause' ? 'muet' : e === 'panne' || e === 'disjoncteur' ? 'crit' : 'warn')
const tonJauge = (e: string) => (e === 'pleine' ? 'crit' : e === 'attention' ? 'warn' : 'ok')
const BASCULES_AFFICHEES = 20

/** Le coût du jour des IA : un montant servi s'écrit par euros() ; « hors périmètre » ou absent reste un tiret. */
function coutDuJour(x: unknown): string {
  if (estNombre(x)) return euros(x)
  if (x && typeof x === 'object' && (x as { nonMesure?: unknown }).nonMesure) return HORS_PERIMETRE
  return '—'
}

export default function Machines({ equipage, poser, onFermer }: SalleProps) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>('/api/controle/station?vue=salle&salle=machines'))
  const jauges = usePanneau(() => apiDirection<Jauges>('/api/controle/jauges'), (c) => Array.isArray(c?.jauges))
  const v = etat.rep?.valeur ?? null
  const maintenant = new Date()
  return (
    <Fenetre cle="machines" titre="Salle des machines" onFermer={onFermer} etat={etat} resume={{ equipage, poser, automatismes: v?.crons?.length ?? null, taches: v?.agents?.length ?? null }}>
      <Corps etat={etat} quoi="Salle des machines">
        {(vue) => (
          <>
            <h3 className="mc-titre-zone">AGENTS</h3>
            {vue.agents.length === 0 ? <p className="mc-etat">Aucun agent servi.</p> : (
              <ul className="mc-liste" data-groupe="agents-machines">
                {vue.agents.map((a) => (
                  <li key={a.nom} data-agent-machine={a.nom}>
                    <span className="mc-chiffre">{a.nom}</span>
                    <Pastille ton={tonEtat(a.etat)}>{a.etat}</Pastille>
                    <small className="mc-doux">dernier battement : {heure(a.battement_le)}</small>
                    <small className="mc-doux">prochain passage : {a.prochain_le ? compteARebours(new Date(a.prochain_le), maintenant) : '—'}</small>
                  </li>
                ))}
              </ul>
            )}
            <h3 className="mc-titre-zone">CRONS</h3>
            {vue.crons.length === 0 ? <p className="mc-etat">Aucun cron servi.</p> : (
              <ul className="mc-liste" data-groupe="crons">
                {vue.crons.map((c) => (
                  <li key={c.nom} data-cron={c.nom}>
                    <span className="mc-chiffre">{c.nom}</span>
                    <small className="mc-doux">dernier passage : {heure(c.dernier_le)}</small>
                    <Pastille ton={c.ok ? 'ok' : 'crit'}>{c.ok ? 'ok' : 'en échec'}</Pastille>
                  </li>
                ))}
              </ul>
            )}
            <h3 className="mc-titre-zone">USINE · DERNIÈRE MESURE</h3>
            {vue.usine?.valeur ? <p data-usine><span className="mc-chiffre">{vue.usine.valeur.mesure}</span> <small className="mc-doux">à {heure(vue.usine.valeur.le)}</small></p>
              : <p className="mc-etat">{vue.usine?.nonMesure ? HORS_PERIMETRE : vue.usine?.erreur ? messagePanne('Usine', vue.usine.erreur) : vue.usine?.manque ?? '—'}</p>}
            <h3 className="mc-titre-zone">IA GRATUITES</h3>
            {vue.ia?.valeur ? (
              <>
                <ul className="mc-liste" data-groupe="ia-fournisseurs">
                  {vue.ia.valeur.fournisseurs.map((f) => <li key={f.objet} data-ia-fournisseur={f.objet}><span>{f.resume}</span></li>)}
                </ul>
                <h4 className="mc-sous-titre">Bascules des dernières 24 h</h4>
                {vue.ia.valeur.bascules.length === 0 ? <p className="mc-etat">Aucune bascule.</p> : (
                  <ul className="mc-liste" data-groupe="ia-bascules">
                    {vue.ia.valeur.bascules.slice(0, BASCULES_AFFICHEES).map((b, i) => <li key={i} data-ia-bascule><span>{b.resume}</span> <small className="mc-doux">{heure(b.le)}</small></li>)}
                  </ul>
                )}
                <p>Coût du jour : <span className="mc-chiffre" data-ia-cout>{coutDuJour(vue.ia.valeur.cout_jour_eur)}</span></p>
              </>
            ) : <p className="mc-etat">{vue.ia?.nonMesure ? HORS_PERIMETRE : vue.ia?.erreur ? messagePanne('IA gratuites', vue.ia.erreur) : vue.ia?.manque ?? '—'}</p>}
            <h3 className="mc-titre-zone">JAUGES DE QUOTA</h3>
            {jauges.rep ? (
              <ul className="mc-liste" data-groupe="jauges">
                {jauges.rep.jauges.map((j) => (
                  <li key={j.cle} data-jauge={j.cle}>
                    <span className="mc-jauge-nom">{j.libelle}</span>
                    <Pastille ton={tonJauge(j.etat)}>{j.etat}</Pastille>
                    <span className="mc-chiffre">{j.utilise} sur {j.plafond}</span>
                    <span className="mc-jauge-barre" aria-hidden="true"><span style={{ '--part': j.part } as CSSProperties} /></span>
                  </li>
                ))}
              </ul>
            ) : jauges.panne ? <p className="mc-panne" role="alert">{messagePanne('Jauges', jauges.panne)}</p> : <p className="mc-etat">Chargement des jauges…</p>}
          </>
        )}
      </Corps>
    </Fenetre>
  )
}
