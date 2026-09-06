'use client'

import { useEffect, useRef, useState } from 'react'
import { apiDirection, garderReconfirmation } from './client'

// La boîte de re-confirmation (prompt v10 §1) : le fondateur redonne son mot de passe ; le serveur le vérifie
// et rend un jeton de 5 min pour UNE portée. Le jeton reste en mémoire (client.ts). Piège de focus, Échap,
// `aria-modal`, jamais de mot de passe gardé.
export type Portee = 'securite' | 'argent' | 'artisan' | 'reglages'
const LIBELLES: Record<Portee, string> = { securite: 'un accès', argent: 'de l’argent', artisan: 'les données d’un artisan', reglages: 'un réglage' }

export default function Reconfirmer({ portee, action, onConfirme, onAnnule }: { portee: Portee; action: string; onConfirme: () => void; onAnnule: () => void }) {
  const [mdp, setMdp] = useState('')
  const [busy, setBusy] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const champ = useRef<HTMLInputElement>(null)
  const boite = useRef<HTMLDivElement>(null)

  useEffect(() => {
    champ.current?.focus()
    const clavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onAnnule() }
      if (e.key === 'Tab' && boite.current) {
        const f = [...boite.current.querySelectorAll<HTMLElement>('input, button')].filter((x) => !x.hasAttribute('disabled'))
        if (!f.length) return
        const premier = f[0], dernier = f[f.length - 1]
        if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus() }
        else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus() }
      }
    }
    document.addEventListener('keydown', clavier)
    return () => document.removeEventListener('keydown', clavier)
  }, [onAnnule])

  async function confirmer(e: React.FormEvent) {
    e.preventDefault()
    if (!mdp || busy) return
    setBusy(true); setErreur(null)
    const r = await apiDirection<{ jeton?: string; expire_dans?: number }>('/api/direction/reconfirmer', { method: 'POST', body: JSON.stringify({ password: mdp, portee }) })
    setBusy(false); setMdp('')
    if (!r.ok || !r.data.jeton) { setErreur(r.data.error ?? 'Confirmation refusée.'); champ.current?.focus(); return }
    garderReconfirmation(r.data.jeton, portee, r.data.expire_dans ?? 300)
    onConfirme()
  }

  return (
    <div className="dir-voile" onMouseDown={(e) => { if (e.target === e.currentTarget) onAnnule() }}>
      <div className="dir-modale" role="dialog" aria-modal="true" aria-labelledby="dir-reconf-titre" ref={boite} data-reconfirmer>
        <h2 id="dir-reconf-titre">Confirmer : {action}</h2>
        <p className="muted">Cette action touche {LIBELLES[portee]}. Votre mot de passe est vérifié par le serveur ; la confirmation vaut cinq minutes, pour ce type d’action seulement.</p>
        <form onSubmit={confirmer}>
          <label htmlFor="dir-reconf-mdp">Mot de passe</label>
          <input id="dir-reconf-mdp" ref={champ} type="password" autoComplete="current-password" value={mdp} onChange={(e) => setMdp(e.target.value)} required />
          {erreur ? <p className="notif-erreur" role="alert">{erreur}</p> : null}
          <div className="dir-modale-actions">
            <button type="button" className="btn btn--ghost" onClick={onAnnule} disabled={busy}>Annuler</button>
            <button type="submit" className="btn btn--primary" disabled={busy || !mdp}>{busy ? 'Vérification…' : 'Confirmer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
