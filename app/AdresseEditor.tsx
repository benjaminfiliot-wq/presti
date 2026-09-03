'use client'

import { useState } from 'react'
import { problemeSlug } from '@/lib/urls'

// L'artisan choisit son adresse (v5). Le contrôle final est côté serveur (/api/account/slug) ;
// ici on lui évite juste d'attendre pour apprendre qu'un tiret final n'est pas permis.
//
// Après un changement, l'ancienne adresse continue de rediriger : on le lui dit, parce que
// c'est la question qu'il se pose (« et mes cartes de visite ? »).

type Props = {
  slug: string
  /** Le début de l'adresse, tel qu'affiché : « votreartisan.fr/ » ou « prestiapp.fr/site/ ». */
  prefixe: string
  jeton: () => Promise<string | undefined>
  onChange: (slug: string) => void
}

export default function AdresseEditor({ slug, prefixe, jeton, onChange }: Props) {
  const [ouvert, setOuvert] = useState(false)
  const [valeur, setValeur] = useState(slug)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const probleme = valeur !== slug ? problemeSlug(valeur) : null

  async function enregistrer() {
    if (busy || probleme || valeur === slug) return
    setBusy(true); setMsg(null)
    const t = await jeton()
    const r = await fetch('/api/account/slug', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ slug: valeur }) })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setMsg({ type: 'err', text: d.error ?? 'Changement impossible.' }); return }
    onChange(d.slug)
    setOuvert(false)
    setMsg({ type: 'ok', text: `Adresse changée. L’ancienne (${prefixe}${d.ancien}) continue de mener ici.` })
    setTimeout(() => setMsg(null), 6000)
  }

  if (!ouvert) {
    return (
      <div className="adr">
        <button type="button" className="adr-lien" onClick={() => { setValeur(slug); setOuvert(true); setMsg(null) }}>Modifier l’adresse</button>
        {msg ? <span className={`adr-msg ${msg.type}`}>{msg.text}</span> : null}
      </div>
    )
  }
  return (
    <div className="adr adr-ouvert">
      <label htmlFor="adresse-artisan">Votre adresse</label>
      <div className="adr-champ">
        <span className="adr-prefixe">{prefixe}</span>
        <input id="adresse-artisan" value={valeur} autoCapitalize="none" autoCorrect="off" spellCheck={false}
          onChange={(e) => setValeur(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-'))}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); enregistrer() } if (e.key === 'Escape') setOuvert(false) }} />
      </div>
      <small className={probleme ? 'adr-aide err' : 'adr-aide'}>{probleme ?? 'Lettres minuscules, chiffres et tirets. L’ancienne adresse redirigera vers la nouvelle.'}</small>
      <div className="adr-actions">
        <button type="button" className="btn btn--primary" disabled={busy || !!probleme || valeur === slug} onClick={enregistrer}>{busy ? '…' : 'Changer l’adresse'}</button>
        <button type="button" className="btn btn--ghost" onClick={() => setOuvert(false)}>Annuler</button>
      </div>
      {msg ? <span className={`adr-msg ${msg.type}`}>{msg.text}</span> : null}
    </div>
  )
}
