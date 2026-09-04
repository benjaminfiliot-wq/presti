'use client'

import { useState } from 'react'
import { api, dateFr, jeton, type SectionProps } from './commun'

// Données & confidentialité (sprint J-1 §6) : export ZIP, suppressions granulaires
// (v4 §C3, routes /api/donnees) et suppression du compte avec 30 jours de grâce.
// Chaque action définitive : RÉCAPITULATIF (ce qui disparaît, ce qui reste) → saisie du mot
// exact → exécution. Plus de `prompt()` du navigateur : le récapitulatif reste sous les yeux.

type Recap = { disparait: string[]; conserve: string[]; supprime_le?: string | null }
type Action = { id: string; titre: string; detail: string; mot: string; route: 'donnees' | 'compte'; danger?: boolean }

const ACTIONS: Action[] = [
  { id: 'site_reinitialiser', titre: 'Réinitialiser le site', detail: 'Efface les textes et la composition. Vos images restent.', mot: 'REINITIALISER', route: 'donnees' },
  { id: 'site_supprimer', titre: 'Supprimer le site', detail: 'Dépublie et efface contenu + images. Le compte reste.', mot: 'SUPPRIMER', route: 'donnees', danger: true },
  { id: 'plateforme_supprimer', titre: 'Supprimer la plateforme', detail: 'Efface les réglages de l’assistant. Vos conversations sont conservées.', mot: 'SUPPRIMER', route: 'donnees', danger: true },
  { id: 'compte', titre: 'Supprimer mon compte', detail: 'Tout, après 30 jours de grâce pendant lesquels vous pouvez annuler.', mot: 'SUPPRIMER', route: 'compte', danger: true },
]

export default function SectionDonnees({ a, patch, signaler }: SectionProps) {
  const [busy, setBusy] = useState<string | null>(null)
  const [ouverte, setOuverte] = useState<{ action: Action; recap: Recap } | null>(null)
  const [saisie, setSaisie] = useState('')
  const supprimeLe = a.suppression_demandee_le ? new Date(new Date(a.suppression_demandee_le).getTime() + 30 * 86400000).toISOString() : null

  async function exporter() {
    if (busy) return
    setBusy('export')
    try {
      const t = await jeton()
      const res = await fetch('/api/donnees/export', { headers: { Authorization: `Bearer ${t}` } })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const el = document.createElement('a')
      el.href = url; el.download = `mes-donnees-presti-${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(el); el.click(); el.remove(); URL.revokeObjectURL(url)
      signaler({ type: 'ok', text: 'Archive téléchargée ✅' })
    } catch { signaler({ type: 'err', text: 'Export impossible pour le moment.' }) }
    setBusy(null)
  }

  async function ouvrir(action: Action) {
    if (busy) return
    setBusy(action.id); setSaisie('')
    const r = await api<Recap>(action.route === 'compte' ? '/api/account/delete' : `/api/donnees?action=${action.id}`)
    setBusy(null)
    if (!r.ok) { signaler({ type: 'err', text: r.data.error ?? 'Récapitulatif indisponible.' }); return }
    setOuverte({ action, recap: r.data })
  }

  async function executer() {
    if (!ouverte || busy) return
    const { action } = ouverte
    if (saisie.trim().toUpperCase() !== action.mot) return
    setBusy('exec')
    const r = action.route === 'compte'
      ? await api<{ supprime_le?: string; demandee_le?: string }>('/api/account/delete', { method: 'POST', body: JSON.stringify({ confirm: 'SUPPRIMER' }) })
      : await api<{ message?: string }>('/api/donnees', { method: 'POST', body: JSON.stringify({ action: action.id, confirm: 'SUPPRIMER' }) })
    setBusy(null)
    if (!r.ok) { signaler({ type: 'err', text: r.data.error ?? 'Action impossible.' }); return }
    setOuverte(null); setSaisie('')
    if (action.route === 'compte') {
      const d = r.data as { demandee_le?: string }
      patch({ suppression_demandee_le: d.demandee_le ?? new Date().toISOString() })
      signaler({ type: 'ok', text: 'Suppression programmée. Vous pouvez l’annuler jusqu’à la date indiquée.' })
    } else {
      if (action.id.startsWith('site')) patch({ site_active: action.id === 'site_supprimer' ? false : a.site_active })
      if (action.id === 'plateforme_supprimer') patch({ plateforme_active: false })
      signaler({ type: 'ok', text: (r.data as { message?: string }).message || 'C’est fait ✅' })
    }
  }

  async function annulerSuppression() {
    if (busy) return
    setBusy('annuler')
    const r = await api('/api/account/delete', { method: 'DELETE' })
    setBusy(null)
    if (!r.ok) { signaler({ type: 'err', text: r.data.error ?? 'Annulation impossible.' }); return }
    patch({ suppression_demandee_le: null })
    signaler({ type: 'ok', text: 'Suppression annulée — votre compte reste.' })
  }

  return (
    <>
      {supprimeLe ? (
        <div className="param-grace" role="status">
          <b>Votre compte sera supprimé le {dateFr(supprimeLe)}.</b>
          <span>Jusque-là, tout fonctionne normalement. Exportez vos données si ce n’est pas fait.</span>
          <button type="button" className="btn btn--primary" disabled={!!busy} onClick={annulerSuppression}>{busy === 'annuler' ? '…' : 'Annuler la suppression'}</button>
        </div>
      ) : null}

      <div className="tool-card">
        <h2>Emporter mes données</h2>
        <p className="muted" style={{ margin: '0 0 .9rem' }}>
          Une archive ZIP : vos tables en JSON (profil, conversations, messages, devis, factures, clients, tarifs, inventaire) et les <b>PDF de vos devis et factures</b>. Vos données vous appartiennent — à tout moment, sans condition.
        </p>
        <button type="button" className="btn btn--primary" disabled={busy === 'export'} onClick={exporter}>{busy === 'export' ? 'Préparation de l’archive…' : 'Télécharger mon archive (.zip)'}</button>
      </div>

      <div className="tool-card danger-zone">
        <h2>Zone dangereuse</h2>
        <p className="muted" style={{ margin: '0 0 1rem' }}>
          Chaque partie se supprime <b>séparément</b>. Avant chaque action : ce qui disparaît, ce qui reste, puis un mot à taper.
          Les <b>devis envoyés et factures émises</b> ne sont jamais supprimés séparément : la loi impose de les conserver.
        </p>
        <div className="dz-actions">
          {ACTIONS.filter((x) => !(x.id === 'compte' && supprimeLe)).map((x) => (
            <button key={x.id} type="button" className={`btn btn--ghost${x.danger ? ' danger' : ''}${ouverte?.action.id === x.id ? ' on' : ''}`} disabled={!!busy && busy !== x.id} onClick={() => ouvrir(x)}>
              {busy === x.id ? '…' : x.titre}
              <small>{x.detail}</small>
            </button>
          ))}
        </div>

        {ouverte ? (
          <div className="dz-confirm" role="dialog" aria-labelledby="dz-titre">
            <h3 id="dz-titre">{ouverte.action.titre}</h3>
            <div className="dz-cols">
              <div><span className="dz-lab crit">Ce qui disparaît</span><ul>{(ouverte.recap.disparait?.length ? ouverte.recap.disparait : ['Rien']).map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><span className="dz-lab ok">Ce qui reste</span><ul>{(ouverte.recap.conserve?.length ? ouverte.recap.conserve : ['Rien d’autre']).map((x) => <li key={x}>{x}</li>)}</ul></div>
            </div>
            {ouverte.action.route === 'compte' ? (
              <p className="muted" style={{ fontSize: '.86rem', margin: '.2rem 0 .6rem' }}>La suppression sera effective dans <b>30 jours</b>. Jusque-là, un bandeau vous le rappelle et vous pouvez annuler d’un clic.</p>
            ) : null}
            <label htmlFor="dz-saisie">Tapez <code>{ouverte.action.mot}</code> pour confirmer</label>
            <div className="param-ligne">
              <input id="dz-saisie" value={saisie} onChange={(e) => setSaisie(e.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false} onKeyDown={(e) => { if (e.key === 'Enter') executer(); if (e.key === 'Escape') setOuverte(null) }} />
              <button type="button" className="btn btn--ghost danger" disabled={busy === 'exec' || saisie.trim().toUpperCase() !== ouverte.action.mot} onClick={executer}>{busy === 'exec' ? '…' : 'Confirmer'}</button>
              <button type="button" className="btn btn--ghost" onClick={() => setOuverte(null)}>Annuler</button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
