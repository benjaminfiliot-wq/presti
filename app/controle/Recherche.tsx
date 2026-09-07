'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiDirection } from './client'

// La recherche globale du Poste de contrôle (prompt v11 §1) : tout se trouve en trois lettres.
//
// Trois exigences qui gouvernent ce composant :
//
//   • elle s'ouvre au CLAVIER (Ctrl+K, ⌘K) et se ferme à Échap. Une palette qui demande la souris
//     pour s'ouvrir ne sert à rien : on la veut pendant qu'on tape déjà ;
//   • elle ne cherche qu'à partir de deux caractères, et attend 200 ms — sinon chaque lettre part en
//     requête et la base travaille pour rien ;
//   • elle se navigue aux flèches et valide à Entrée, sans jamais quitter le clavier.
//
// Le périmètre est appliqué côté serveur, pas ici : un partenaire qui tape trois lettres ne doit pas
// découvrir par la recherche ce que les écrans lui refusent.
type Resultat = { type: string; id: string; titre: string; detail: string; onglet: string; cible?: string }

const LIBELLES: Record<string, string> = {
  artisan: 'Artisan', apport: 'Apport', courrier: 'Message', alerte: 'Alerte', journal: 'Journal',
}

export default function Recherche({ ouvert, onFermer, onAller }: {
  ouvert: boolean
  onFermer: () => void
  onAller: (r: Resultat) => void
}) {
  const [q, setQ] = useState('')
  const [resultats, setResultats] = useState<Resultat[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [choisi, setChoisi] = useState(0)
  const [cherche, setCherche] = useState(false)
  const champ = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!ouvert) { setQ(''); setResultats([]); setChoisi(0); setMessage(null); return }
    // Le focus au montage : la palette s'ouvre pour qu'on tape, pas pour qu'on la regarde.
    const t = setTimeout(() => champ.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [ouvert])

  const chercher = useCallback(async (texte: string) => {
    if (texte.trim().length < 2) { setResultats([]); setMessage(null); return }
    setCherche(true)
    try {
      const r = await apiDirection<{ resultats: Resultat[]; message?: string }>(`/api/controle/recherche?q=${encodeURIComponent(texte)}`)
      if (!r.ok) { setResultats([]); setMessage(r.data.error ?? 'Recherche indisponible.'); return }
      setResultats(r.data.resultats ?? [])
      setMessage(r.data.resultats?.length ? null : 'Rien ne correspond.')
      setChoisi(0)
    } finally { setCherche(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void chercher(q), 200)
    return () => clearTimeout(t)
  }, [q, chercher])

  if (!ouvert) return null

  function touche(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); onFermer(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setChoisi((n) => Math.min(n + 1, resultats.length - 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setChoisi((n) => Math.max(n - 1, 0)); return }
    if (e.key === 'Enter' && resultats[choisi]) { e.preventDefault(); onAller(resultats[choisi]); onFermer() }
  }

  return (
    <div className="dir-voile ctl-recherche-voile" role="dialog" aria-modal="true" aria-label="Rechercher"
      onClick={(e) => { if (e.target === e.currentTarget) onFermer() }}>
      <div className="ctl-recherche" onKeyDown={touche}>
        <div className="ctl-recherche-champ">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input ref={champ} value={q} onChange={(e) => setQ(e.target.value)} data-recherche
            placeholder="Un artisan, un message, un apport, une alerte…" aria-label="Rechercher" maxLength={60} />
          <button type="button" className="dir-dep" onClick={onFermer}>Échap</button>
        </div>
        {q.trim().length > 0 && q.trim().length < 2 ? <p className="muted ctl-recherche-vide">Encore une lettre.</p> : null}
        {message ? <p className="muted ctl-recherche-vide">{cherche ? 'Recherche…' : message}</p> : null}
        {resultats.length ? (
          <ul className="ctl-recherche-liste" role="listbox">
            {resultats.map((r, i) => (
              <li key={`${r.type}-${r.id}`} role="option" aria-selected={i === choisi}>
                <button type="button" className={i === choisi ? 'on' : ''} data-resultat={r.type}
                  onMouseEnter={() => setChoisi(i)} onClick={() => { onAller(r); onFermer() }}>
                  <span className="ctl-recherche-type">{LIBELLES[r.type] ?? r.type}</span>
                  <span className="ctl-recherche-titre">{r.titre}</span>
                  <span className="ctl-recherche-detail">{r.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="dir-src ctl-recherche-aide">↑ ↓ pour choisir · Entrée pour ouvrir · Échap pour fermer</p>
      </div>
    </div>
  )
}
