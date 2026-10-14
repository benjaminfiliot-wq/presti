'use client'

import { LIBELLE_OUTIL, type NomOutil } from '@/lib/assistant/outils'
import type { CarteAction, StatutAction } from '@/lib/assistant/cartes'

// La CARTE d'une action de l'assistant (plans/016-assistant.md, jalon A3) : ce que l'artisan lit avant de cliquer. Le texte exact d'un
// e-mail ou d'un message, l'avant/après d'un prix, ce qui mérite attention, puis les boutons — Confirmer / Écarter tant que la carte
// attend, Annuler quand l'action faite peut se défaire. Aucune donnée n'est calculée ici : tout vient de la carte rendue par le serveur.

export type Decision = 'confirmer' | 'refuser' | 'annuler'

export const LIBELLE_STATUT: Record<StatutAction, { texte: string; classe: string }> = {
  en_attente: { texte: 'À confirmer', classe: 'warn' },
  en_cours: { texte: 'En cours…', classe: 'muted' },
  executee: { texte: 'Fait', classe: 'ok' },
  refusee: { texte: 'Écartée', classe: 'muted' },
  annulee: { texte: 'Annulée', classe: 'muted' },
  expiree: { texte: 'Expirée', classe: 'muted' },
  echec: { texte: 'Non exécutée', classe: 'crit' },
}
export const heure = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
export const libelleOutil = (o: string) => (o in LIBELLE_OUTIL ? LIBELLE_OUTIL[o as NomOutil] : o)

export function CarteView({ c, occupee, erreur, onDecision }: { c: CarteAction; occupee: boolean; erreur?: string; onDecision: (id: string, d: Decision) => void }) {
  const st = LIBELLE_STATUT[c.statut]
  const enAttente = c.statut === 'en_attente'
  return (
    <article className={`asst-carte ${c.statut}`} aria-label={c.titre}>
      <header className="asst-carte-tete">
        <span className={`pill ${st.classe}`}>{st.texte}</span>
        <span className="asst-carte-outil">{libelleOutil(c.outil)}</span>
        <span className="asst-carte-date">{heure(c.cree_le)}</span>
      </header>
      <h3 className="asst-carte-titre">{c.titre}</h3>
      {c.lignes.length ? (
        <dl className="asst-carte-lignes">
          {c.lignes.map((l, i) => <div key={i}><dt>{l.label}</dt><dd>{l.valeur}</dd></div>)}
        </dl>
      ) : null}
      {c.avant_apres.length ? (
        <ul className="asst-carte-avap" aria-label="Avant et après">
          {c.avant_apres.map((a, i) => <li key={i}><span>{a.libelle}</span><s>{a.avant}</s><span aria-hidden="true">→</span><b>{a.apres}</b></li>)}
        </ul>
      ) : null}
      {c.message ? (
        <div className="asst-carte-msg">
          <div className="asst-carte-msg-tete">{c.message.a ? <>À : <b>{c.message.a}</b></> : null}{c.message.objet ? <> · Objet : {c.message.objet}</> : null}</div>
          <p>{c.message.texte}</p>
        </div>
      ) : null}
      {c.alertes.length ? <ul className="asst-carte-alertes">{c.alertes.map((a, i) => <li key={i}>{a}</li>)}</ul> : null}
      {c.resultat && !enAttente ? <p className="asst-carte-resultat">{c.resultat}</p> : null}
      {erreur ? <p className="asst-carte-erreur" role="alert">{erreur}</p> : null}
      <footer className="asst-carte-pied">
        {enAttente ? (
          <>
            <button type="button" className="btn btn--primary" style={{ width: 'auto' }} disabled={occupee} onClick={() => onDecision(c.id, 'confirmer')}>{occupee ? '…' : 'Confirmer'}</button>
            <button type="button" className="btn btn--ghost" style={{ width: 'auto' }} disabled={occupee} onClick={() => onDecision(c.id, 'refuser')}>Écarter</button>
            <span className="asst-carte-note">{c.irreversible ? 'Rien n’est fait avant votre clic. Une fois confirmée, l’action ne se défait pas.' : 'Rien n’est fait avant votre clic.'}</span>
          </>
        ) : null}
        {c.annulable ? <button type="button" className="btn btn--ghost" style={{ width: 'auto' }} disabled={occupee} title={c.annulation_libelle ?? undefined} onClick={() => onDecision(c.id, 'annuler')}>{occupee ? '…' : 'Annuler'}{c.annulation_libelle ? ` — ${c.annulation_libelle}` : ''}</button> : null}
        {c.lien ? <a className="asst-carte-lien" href={c.lien.href}>{c.lien.libelle}</a> : null}
      </footer>
    </article>
  )
}

