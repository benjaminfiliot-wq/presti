'use client'

// L'assistant dans le CRM — son travail RENDU VISIBLE dans le poste des assistants (demande du fondateur du 21/10, références « bureau
// d'agents » : compteurs lisibles, agents qui travaillent, actions qui se voient) :
//  • trois COMPTEURS : faites aujourd'hui, à confirmer, partiront seules (pilote automatique, s'il est ouvert) ;
//  • le FIL D'ACTIVITÉ : ce que l'assistant vient de faire (« Tâche « carrelage » cochée — chantier Dupont ») ;
//  • la FILE DU PILOTE : « Partira dans 7 min — Relance facture F-031 » avec « Annuler » (rien n'est montré drapeau baissé).
// Aucune écriture ici, hors « Annuler » une action du pilote (POST /api/pilote/file), refusé dans l'exemple.
import { useEffect, useState } from 'react'
import { LIBELLE_ETAT, quandLisible, type ContexteAssistant } from '@/lib/crm/assistantCrm'
import { LIBELLE_TYPE, texteDecompte } from '@/lib/pilote/regles'
import { useSansEcriture } from '../atelier/contexte'
import { BoutonDemander } from './PanneauAssistant'
import { useActivite } from './useActivite'
import './assistant-crm.css'

const PILL: Record<string, string> = { fait: 'ok', a_confirmer: 'warn', ecarte: 'muted', annule: 'muted', echec: 'crit', en_cours: 'muted', expire: 'muted' }

/** Un battement toutes les 15 s : les « Partira dans … » se mettent à jour sans relire le serveur. */
function useBattement(ms = 15_000) {
  const [t, setT] = useState(() => Date.now())
  useEffect(() => { const i = window.setInterval(() => setT(Date.now()), ms); return () => window.clearInterval(i) }, [ms])
  return t
}

export function ActiviteAssistant({ contexte = null }: { contexte?: ContexteAssistant | null }) {
  const simule = useSansEcriture()
  const { activite, pilote, erreur, annuler } = useActivite(simule)
  const [note, setNote] = useState<Record<string, string>>({})
  const [occupe, setOccupe] = useState<string | null>(null)
  const maintenant = new Date(useBattement())
  const c = activite?.compteurs
  const attente = pilote?.attente.filter((l) => l.statut === 'a_partir') ?? []
  return (
    <section className="aca" aria-labelledby="aca-titre" data-assistant-activite>
      <div className="aca-tete">
        <h3 className="crm-sous" id="aca-titre"><i className="aca-pouls" aria-hidden="true" />Assistant de gestion · en direct</h3>
        <BoutonDemander contexte={contexte} className="psh-btn primary aca-demander" />
      </div>
      <div className="aca-compteurs" role="group" aria-label="Ce que l’assistant a fait aujourd’hui">
        <div className="aca-compteur"><b className="tnum">{c ? c.faitesAujourdhui : '—'}</b><span>faites aujourd’hui</span></div>
        <div className={`aca-compteur${c && c.aConfirmer ? ' alerte' : ''}`}><b className="tnum">{c ? c.aConfirmer : '—'}</b><span>à confirmer</span></div>
        {pilote && <div className="aca-compteur pilote" data-assistant-pilote-compte><b className="tnum">{attente.length}</b><span>partiront seules</span></div>}
      </div>
      {erreur && <p className="crm-note" role="alert">{erreur}</p>}
      {pilote && (
        <div className="aca-pilote" data-assistant-pilote>
          <h4 className="aca-sous">Pilote automatique · {pilote.delai_min} min pour annuler</h4>
          {attente.length === 0 ? <p className="crm-vide">Rien ne partira seul pour l’instant.</p> : (
            <ul className="aca-liste">
              {attente.map((l) => (
                <li key={l.id} data-assistant-pilote-ligne={l.id}>
                  <span><b className="aca-decompte">{texteDecompte(l.part_le, maintenant)}</b> — {l.libelle}<br /><span className="muted">{LIBELLE_TYPE[l.type]?.label ?? l.type}</span>{note[l.id] ? <><br /><span className="muted" role="status">{note[l.id]}</span></> : null}</span>
                  <button type="button" className="psh-btn ghost" disabled={occupe === l.id} data-assistant-annuler={l.id}
                    onClick={async () => { setOccupe(l.id); const r = await annuler(l.id); setNote((n) => ({ ...n, [l.id]: r.texte })); setOccupe(null) }}>
                    Annuler
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <h4 className="aca-sous">Ce que l’assistant vient de faire</h4>
      {!activite ? <p className="muted">Lecture…</p>
        : !activite.disponible ? <p className="crm-vide">Les actions de l’assistant ne sont pas encore ouvertes sur ce compte.</p>
        : activite.lignes.length === 0 ? <p className="crm-vide">Rien encore aujourd’hui. Demandez-lui quelque chose : chaque action s’inscrit ici.</p>
        : (
          <ul className="aca-liste aca-fil" aria-live="polite">
            {activite.lignes.map((l) => (
              <li key={l.id} data-assistant-ligne={l.etat}>
                <span className={`pill ${PILL[l.etat] ?? 'muted'}`}>{LIBELLE_ETAT[l.etat]}</span>
                <span className="aca-texte">{l.texte}</span>
                <time className="muted tnum" dateTime={l.quand}>{quandLisible(l.quand, maintenant)}</time>
              </li>
            ))}
          </ul>
        )}
      {simule && <p className="muted aca-note">Exemple : activité fictive, rien n’est lu ni enregistré.</p>}
    </section>
  )
}

/** Le compteur de l'atelier (en surimpression sur la maquette) : ce que l'assistant a fait, ce qui attend, ce qui partira seul. */
export function CompteurAssistant({ onOuvrir }: { onOuvrir: () => void }) {
  const simule = useSansEcriture()
  const { activite, pilote } = useActivite(simule)
  const c = activite?.compteurs
  if (!c) return null
  const partiront = pilote?.attente.filter((l) => l.statut === 'a_partir').length ?? 0
  return (
    <button type="button" className="aca-tableau" onClick={onOuvrir} data-assistant-compteur aria-label={`Assistant : ${c.faitesAujourdhui} actions faites aujourd’hui, ${c.aConfirmer} à confirmer${pilote ? `, ${partiront} partiront seules` : ''}. Ouvrir le poste des assistants.`}>
      <span className="aca-tableau-titre"><i className="aca-pouls" aria-hidden="true" />Assistant</span>
      <span><b className="tnum">{c.faitesAujourdhui}</b> faites</span>
      <span className={c.aConfirmer ? 'alerte' : ''}><b className="tnum">{c.aConfirmer}</b> à confirmer</span>
      {pilote && <span><b className="tnum">{partiront}</b> partiront</span>}
    </button>
  )
}
