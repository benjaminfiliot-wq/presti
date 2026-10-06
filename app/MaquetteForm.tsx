'use client'

// Le formulaire d'entrée de la vitrine (décision 1 de Benj, 06/10/2026) : « Recevoir la maquette de mon site », sans compte.
// Il poste à /api/prospects/entrant (026-145), qui valide tout côté serveur, piège les robots (champ `societe`), plafonne par
// adresse, et répond la MÊME phrase qu'une entreprise soit nouvelle, déjà connue ou en opposition : ce composant affiche cette
// phrase telle quelle et n'en déduit rien. La case n'est jamais pré-cochée : cochée, elle est la preuve de la demande.
// Rendu seulement si le drapeau prospectsEntrant est levé (app/page.tsx) ; baissé, la route répond 404.
import { useState } from 'react'

type Metier = { id: string; libelle: string }
type Etat = { type: 'repos' } | { type: 'envoi' } | { type: 'ok'; message: string } | { type: 'erreur'; message: string }

export default function MaquetteForm({ metiers }: { metiers: Metier[] }) {
  const [etat, setEtat] = useState<Etat>({ type: 'repos' })

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (etat.type === 'envoi') return
    const f = new FormData(e.currentTarget)
    const champ = (n: string) => String(f.get(n) ?? '')
    setEtat({ type: 'envoi' })
    try {
      const r = await fetch('/api/prospects/entrant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          entreprise: champ('entreprise'),
          metier: champ('metier'),
          commune: champ('commune'),
          site_ou_instagram: champ('site_ou_instagram'),
          email: champ('email'),
          accord: f.get('accord') === 'on',
          societe: champ('societe'),
        }),
      })
      const j = (await r.json().catch(() => null)) as { ok?: boolean; message?: string; error?: string } | null
      if (r.ok && j?.ok) setEtat({ type: 'ok', message: j.message || 'Merci, votre demande est enregistrée.' })
      else setEtat({ type: 'erreur', message: j?.error || 'Votre demande n’a pas pu être envoyée. Réessayez dans un moment.' })
    } catch {
      setEtat({ type: 'erreur', message: 'Votre demande n’a pas pu être envoyée. Vérifiez votre connexion et réessayez.' })
    }
  }

  if (etat.type === 'ok') {
    return (
      <div className="lp-mq-form lp-mq-merci" role="status">
        <b>Demande reçue.</b>
        <p>{etat.message}</p>
      </div>
    )
  }

  return (
    <form className="lp-mq-form" onSubmit={envoyer}>
      <div className="lp-mq-champs">
        <label className="lp-mq-champ">
          <span>Nom de l’entreprise</span>
          <input name="entreprise" required minLength={2} maxLength={120} autoComplete="organization" />
        </label>
        <label className="lp-mq-champ">
          <span>Métier</span>
          <select name="metier" required defaultValue="">
            <option value="" disabled>Choisir</option>
            {metiers.map((m) => <option key={m.id} value={m.id}>{m.libelle}</option>)}
          </select>
        </label>
        <label className="lp-mq-champ">
          <span>Commune</span>
          <input name="commune" required minLength={2} maxLength={80} autoComplete="address-level2" />
        </label>
        <label className="lp-mq-champ">
          <span>Votre site ou votre compte Instagram</span>
          <input name="site_ou_instagram" required maxLength={200} placeholder="monentreprise.fr ou @moncompte" autoComplete="url" inputMode="url" />
        </label>
        <label className="lp-mq-champ lp-mq-large">
          <span>E-mail où recevoir la maquette</span>
          <input name="email" type="email" required maxLength={254} autoComplete="email" inputMode="email" />
        </label>
        {/* Piège à robots : invisible et hors du parcours clavier ; un humain ne le remplit jamais. */}
        <label className="lp-mq-piege" aria-hidden="true">
          Société
          <input name="societe" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="lp-mq-accord">
        <input type="checkbox" name="accord" required />
        <span>
          Je demande à Presti de me préparer une maquette de mon site et de me recontacter à ce sujet, par son assistant IA.{' '}
          <a href="/confidentialite#prospection">Ce que nous faisons de ces informations</a>
        </span>
      </label>
      <div className="lp-mq-bas">
        <button className="lp-btn lp-btn--p" type="submit" disabled={etat.type === 'envoi'}>
          {etat.type === 'envoi' ? 'Envoi…' : 'Recevoir ma maquette'}
        </button>
        <p className="lp-mq-statut" role="status" aria-live="polite">{etat.type === 'erreur' ? etat.message : ''}</p>
      </div>
    </form>
  )
}
