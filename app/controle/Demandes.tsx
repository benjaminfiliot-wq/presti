'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection } from './client'

// Poste de contrôle → Demandes : envoyer un travail à l'écosystème quand la limite de Claude Code est atteinte.
//
// Benj écrit comme il l'écrirait à Claude ; le moteur de l'usine prend la demande, la confie à Gemini puis aux modèles
// gratuits, et travaille SUR UNE BRANCHE (demandes/dem-<id>) — jamais sur main, jamais en ligne tout seul. L'écran
// dit où en est chaque demande : reçue, en cours, faite (avec sa branche), échec (avec la cause).
// Une demande qui parle de prospects ne part pas vers une IA gratuite : elle reste « reçue » et attend Claude.

type Statut = 'recue' | 'en_cours' | 'faite' | 'echec'
type Demande = { id: string; texte: string; statut: Statut; branche: string | null; compte_rendu: string | null; cree_le: string; maj_le: string }
const MIN = 10
const MAX = 4000
const ETATS: Record<Statut, { libelle: string; classe: string }> = {
  recue: { libelle: 'Reçue', classe: 'info' },
  en_cours: { libelle: 'En cours', classe: 'warn' },
  faite: { libelle: 'Faite', classe: 'ok' },
  echec: { libelle: 'Échec', classe: 'crit' },
}
const quand = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const apercu = (t: string) => (t.length > 220 ? `${t.slice(0, 220).trimEnd()}…` : t)

export default function Demandes({ role, signaler }: {
  role: 'direction' | 'lecture'
  signaler: (m: { type: 'ok' | 'err'; text: string }) => void
}) {
  const [liste, setListe] = useState<Demande[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [texte, setTexte] = useState('')
  const [busy, setBusy] = useState(false)

  const charger = useCallback(async () => {
    const r = await apiDirection<{ demandes?: Demande[] }>('/api/controle/demandes')
    if (r.ok) { setListe(r.data.demandes ?? []); setErreur(null) }
    else { setListe((l) => l ?? []); setErreur(r.data.error ?? 'Les demandes ne se lisent pas pour le moment.') }
  }, [])
  useEffect(() => { void charger() }, [charger])
  // Tant qu'une demande attend ou travaille, l'écran se met à jour tout seul (toutes les 30 s) ; sinon il reste calme.
  const enAttente = (liste ?? []).some((d) => d.statut === 'recue' || d.statut === 'en_cours')
  useEffect(() => {
    if (!enAttente) return
    const t = window.setInterval(() => { void charger() }, 30_000)
    return () => window.clearInterval(t)
  }, [enAttente, charger])

  const propre = texte.trim()
  const envoyable = role === 'direction' && !busy && propre.length >= MIN && propre.length <= MAX

  async function envoyer() {
    if (!envoyable) return
    setBusy(true)
    try {
      const r = await apiDirection<{ message?: string }>('/api/controle/demandes', { method: 'POST', body: JSON.stringify({ texte: propre }) })
      if (r.ok) { setTexte(''); signaler({ type: 'ok', text: r.data.message ?? 'Demande envoyée.' }); await charger(); return }
      signaler({ type: 'err', text: r.data.error ?? 'Rien n’a été envoyé.' })
    } finally { setBusy(false) }
  }

  return (
    <div className="tool-card" data-demandes>
      <h2>Demandes à l’écosystème</h2>
      <p className="muted" style={{ margin: '0 0 1rem' }}>
        Quand la limite de Claude Code est atteinte, écrivez ici ce que vous voulez, comme à Claude. L’écosystème la prend en charge
        sans lui : Gemini d’abord, puis les modèles gratuits. Le travail arrive sur une branche à relire — jamais directement en ligne.
        Une demande qui touche des prospects n’est pas confiée à une IA gratuite : elle attend Claude.
      </p>

      {role === 'direction' ? (
        <div style={{ display: 'grid', gap: '.6rem', marginBottom: '1.4rem' }}>
          <label htmlFor="demande-texte" className="muted" style={{ fontSize: '.85rem' }}>Votre demande</label>
          <textarea
            id="demande-texte"
            className="input"
            rows={6}
            maxLength={MAX}
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Ex. Ajoute un bouton « Copier le lien » sur la page d’un devis, comme celui des factures."
            style={{ width: '100%', resize: 'vertical' }}
            data-demande-texte
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--primary" disabled={!envoyable} onClick={() => void envoyer()} data-action="envoyer-demande">
              {busy ? 'Envoi…' : 'Envoyer à l’écosystème'}
            </button>
            <small className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {propre.length < MIN ? `Encore ${MIN - propre.length} signe${MIN - propre.length > 1 ? 's' : ''} au moins` : `${propre.length} / ${MAX}`}
            </small>
          </div>
        </div>
      ) : <p className="muted">Votre rôle est en lecture seule : vous voyez les demandes, sans pouvoir en envoyer.</p>}

      {erreur ? <p className="notif-erreur" role="alert">{erreur}</p> : null}
      {liste === null ? <p className="muted">Chargement…</p>
        : liste.length === 0 && !erreur ? <p className="muted" data-demandes-vide>Aucune demande pour l’instant.</p>
        : (
          <ul className="sess" data-demandes-liste>
            {liste.map((d) => {
              const e = ETATS[d.statut] ?? ETATS.recue
              return (
                <li key={d.id} style={{ alignItems: 'flex-start' }}>
                  <span className="sess-txt" style={{ minWidth: 0 }}>
                    <b style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                      <span className={`pill ${e.classe}`}><span className="pdot" />{e.libelle}</span>
                      <small className="muted">envoyée le {quand(d.cree_le)}{d.maj_le !== d.cree_le ? ` · mise à jour le ${quand(d.maj_le)}` : ''}</small>
                    </b>
                    <small style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', display: 'block', marginTop: '.35rem' }}>{apercu(d.texte)}</small>
                    {d.branche ? <small style={{ display: 'block', marginTop: '.3rem' }}>Branche à relire : <code>{d.branche}</code></small> : null}
                    {d.compte_rendu ? <small className="muted" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', display: 'block', marginTop: '.3rem' }}>{d.compte_rendu}</small> : null}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
    </div>
  )
}
