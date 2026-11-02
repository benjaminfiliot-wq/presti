'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection } from './client'
import { EMAIL_LIEN } from '@/lib/demandesDemo'

// Poste de contrôle → Démos (chantier 4, lot L19, tâche 032-026 ; migration 0190, drapeau `demandesDemo`).
//
// Les demandes de démo « Presti pour l'entreprise » laissées sur /contact : qui, quelle activité, quelle taille d'équipe, le message,
// et le geste « traitée ». Benj y lit ce que l'e-mail lui donne aujourd'hui (prénom, adresse, message) ; l'e-mail reste tant que
// cette liste n'est pas en ligne et contrôlée. Rien n'est envoyé au demandeur d'ici : le bouton « Écrire » ouvre la messagerie de Benj.
// Densité d'un outil de travail (presti-design : pas de grandes cartes décoratives) ; les classes sont celles du Poste.

type Etat = 'nouvelle' | 'traitee'
type Demande = {
  id: string; taille: string; activite: string; prenom: string; email: string; message: string | null
  etat: Etat; rendez_vous_le: string | null; traitee_le: string | null; cree_le: string
}
type Filtre = 'nouvelle' | 'toutes'
const FILTRES: { id: Filtre; label: string }[] = [{ id: 'nouvelle', label: 'À traiter' }, { id: 'toutes', label: 'Toutes' }]
const ETATS: Record<Etat, { libelle: string; classe: string }> = {
  nouvelle: { libelle: 'Nouvelle', classe: 'warn' },
  traitee: { libelle: 'Traitée', classe: 'ok' },
}
const quand = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const equipe = (t: string) => (t === '1' ? 'seul' : `${t} personnes`)

export default function DemandesDemo({ role, signaler }: {
  role: 'direction' | 'lecture'
  signaler: (m: { type: 'ok' | 'err'; text: string }) => void
}) {
  const [liste, setListe] = useState<Demande[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [filtre, setFiltre] = useState<Filtre>('nouvelle')
  const [enCours, setEnCours] = useState<string | null>(null)

  const charger = useCallback(async () => {
    const r = await apiDirection<{ demandes?: Demande[] }>('/api/controle/demandes-demo')
    if (r.ok) { setListe(r.data.demandes ?? []); setErreur(null) }
    else { setListe((l) => l ?? []); setErreur(r.data.error ?? 'Les demandes de démo ne se lisent pas pour le moment.') }
  }, [])
  useEffect(() => { void charger() }, [charger])

  async function traiter(id: string) {
    if (role !== 'direction' || enCours) return
    setEnCours(id)
    try {
      const r = await apiDirection<{ message?: string }>('/api/controle/demandes-demo', { method: 'POST', body: JSON.stringify({ id }) })
      if (r.ok) { signaler({ type: 'ok', text: r.data.message ?? 'Demande marquée traitée.' }); await charger(); return }
      signaler({ type: 'err', text: r.data.error ?? 'Rien n’a changé.' })
    } finally { setEnCours(null) }
  }

  const toutes = liste ?? []
  const nouvelles = toutes.filter((d) => d.etat === 'nouvelle').length
  const vues = filtre === 'nouvelle' ? toutes.filter((d) => d.etat === 'nouvelle') : toutes

  return (
    <div className="tool-card" data-demandes-demo>
      <h2>Demandes de démo entreprise</h2>
      <p className="muted" style={{ margin: '0 0 1rem' }}>
        Les demandes laissées sur la page Contact, motif « entreprise ». Répondez depuis votre messagerie, puis marquez la demande
        traitée : la relance de J+2 s’arrête là. Rien n’est envoyé au demandeur depuis cet écran.
      </p>

      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1rem' }} role="group" aria-label="Filtrer les demandes">
        {FILTRES.map((f) => (
          <button key={f.id} type="button" className={`btn ${filtre === f.id ? 'btn--primary' : 'btn--ghost'}`} aria-pressed={filtre === f.id}
            onClick={() => setFiltre(f.id)} data-filtre={f.id}>
            {f.label}{f.id === 'nouvelle' && nouvelles > 0 ? <span style={{ fontVariantNumeric: 'tabular-nums' }}> · {nouvelles}</span> : null}
          </button>
        ))}
      </div>

      {erreur ? (
        <div>
          <p className="notif-erreur" role="alert">{erreur}</p>
          <button type="button" className="btn btn--primary" onClick={() => void charger()}>Réessayer</button>
        </div>
      ) : null}
      {liste === null ? <p className="muted">Chargement…</p>
        : vues.length === 0 && !erreur ? (
          <p className="muted" data-demandes-demo-vide>{filtre === 'nouvelle' ? 'Aucune demande à traiter.' : 'Aucune demande de démo pour l’instant.'}</p>
        ) : (
          <ul className="sess" data-demandes-demo-liste>
            {vues.map((d) => {
              const e = ETATS[d.etat] ?? ETATS.nouvelle
              return (
                <li key={d.id} style={{ alignItems: 'flex-start', gap: '1rem' }} data-demande-demo={d.id}>
                  <span className="sess-txt" style={{ minWidth: 0, flex: 1 }}>
                    <b style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                      <span className={`pill ${e.classe}`}><span className="pdot" />{e.libelle}</span>
                      <span>{d.activite} · {equipe(d.taille)}</span>
                      <small className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        reçue le {quand(d.cree_le)}{d.traitee_le ? ` · traitée le ${quand(d.traitee_le)}` : ''}
                      </small>
                    </b>
                    <small style={{ display: 'block', marginTop: '.35rem', overflowWrap: 'anywhere' }}>
                      {/* Le lien n'est posé que sur une adresse sans `?`, `&`, `%`… : une adresse piégée n'ouvre pas un brouillon prérempli (audit, point 6). */}
                      {d.prenom} · {EMAIL_LIEN.test(d.email) ? <a href={`mailto:${d.email}`}>{d.email}</a> : <span>{d.email}</span>}
                    </small>
                    {d.message ? <small className="muted" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', display: 'block', marginTop: '.35rem' }}>{d.message}</small> : null}
                    {d.rendez_vous_le ? <small style={{ display: 'block', marginTop: '.3rem' }}>Rendez-vous : {quand(d.rendez_vous_le)}</small> : null}
                  </span>
                  {d.etat === 'nouvelle' && role === 'direction' ? (
                    <button type="button" className="btn btn--ghost" style={{ flexShrink: 0 }} disabled={enCours !== null}
                      onClick={() => void traiter(d.id)} data-action="demande-demo-traitee">
                      {enCours === d.id ? 'Un instant…' : 'Marquer traitée'}
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      {role === 'lecture' ? <p className="muted">Votre rôle est en lecture seule.</p> : null}
    </div>
  )
}
