// components/ui/Palette.tsx — palette de commandes Ctrl+K / ⌘K de la console (refonte 18/10, étape 4.2).
// Reprend les trois exigences de la recherche du Poste de contrôle (app/controle/Recherche.tsx) : elle s'ouvre AU CLAVIER et
// se ferme à Échap ; la recherche serveur ne part qu'à partir de deux caractères et après 200 ms ; elle se navigue aux
// flèches et valide à Entrée. En plus : des COMMANDES locales (aller à, créer), groupées, filtrées sans réseau.
// Aucune animation d'ouverture : un geste répété cent fois par jour ne doit jamais attendre (emil-design-eng).
// Le focus revient où il était à la fermeture. Le périmètre de la recherche est appliqué côté serveur, pas ici.
'use client'

import './ui.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icone } from './icones'

export type Commande = { id: string; groupe: string; libelle: string; icone?: string; indice?: string; motsCles?: string; href?: string; action?: () => void }

const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function Palette({ commandes, chercher, ouvert: ouvertControle, onFermer, raccourci = true, invite = 'Aller à une page, créer un devis, chercher un client…' }: {
  commandes: Commande[]
  /** Recherche serveur facultative (clients, devis, factures…) : rend des commandes du groupe « Résultats ». */
  chercher?: (q: string) => Promise<Commande[]>
  ouvert?: boolean
  onFermer?: () => void
  raccourci?: boolean
  invite?: string
}) {
  const [ouvertInterne, setOuvertInterne] = useState(false)
  const ouvert = ouvertControle ?? ouvertInterne
  const [q, setQ] = useState('')
  const [choisi, setChoisi] = useState(0)
  const [trouves, setTrouves] = useState<Commande[]>([])
  const [cherche, setCherche] = useState(false)
  const champ = useRef<HTMLInputElement>(null)
  const avant = useRef<HTMLElement | null>(null)

  const fermer = useCallback(() => { setOuvertInterne(false); onFermer?.(); avant.current?.focus?.() }, [onFermer])

  // Ctrl+K / ⌘K, n'importe où dans la console (sauf si la palette est pilotée de l'extérieur sans raccourci).
  useEffect(() => {
    if (!raccourci) return
    const surTouche = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        avant.current = document.activeElement as HTMLElement | null
        setOuvertInterne((v) => !v)
      }
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [raccourci])

  useEffect(() => {
    if (!ouvert) { setQ(''); setChoisi(0); setTrouves([]); return }
    if (!avant.current) avant.current = document.activeElement as HTMLElement | null
    champ.current?.focus()
  }, [ouvert])

  useEffect(() => {
    if (!chercher || q.trim().length < 2) { setTrouves([]); return }
    let vivant = true
    const t = setTimeout(async () => {
      setCherche(true)
      try { const r = await chercher(q.trim()); if (vivant) setTrouves(r) } catch { if (vivant) setTrouves([]) } finally { if (vivant) setCherche(false) }
    }, 200)
    return () => { vivant = false; clearTimeout(t) }
  }, [q, chercher])

  const liste = useMemo(() => {
    const m = normaliser(q.trim())
    const locales = m ? commandes.filter((c) => normaliser(`${c.libelle} ${c.groupe} ${c.motsCles ?? ''}`).includes(m)) : commandes
    return [...locales, ...trouves]
  }, [q, commandes, trouves])
  useEffect(() => { setChoisi(0) }, [q])

  if (!ouvert) return null

  const executer = (c: Commande) => {
    fermer()
    if (c.action) c.action()
    else if (c.href) window.location.assign(c.href)
  }
  const touche = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); fermer(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setChoisi((k) => Math.min(k + 1, liste.length - 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setChoisi((k) => Math.max(k - 1, 0)); return }
    if (e.key === 'Enter' && liste[choisi]) { e.preventDefault(); executer(liste[choisi]) }
    if (e.key === 'Tab') e.preventDefault() // le focus reste dans la palette (modale)
  }

  let groupePrec = ''
  return (
    <div className="ui-palette-voile" onMouseDown={(e) => { if (e.target === e.currentTarget) fermer() }}>
      <div className="ui-palette" role="dialog" aria-modal="true" aria-label="Palette de commandes" onKeyDown={touche}>
        <div className="ui-palette-champ">
          <Icone nom="cherche" />
          <input ref={champ} value={q} onChange={(e) => setQ(e.target.value)} placeholder={invite} aria-label="Commande ou recherche"
            role="combobox" aria-expanded="true" aria-controls="ui-palette-liste" aria-activedescendant={liste[choisi] ? `ui-pal-${liste[choisi].id}` : undefined} maxLength={80} />
          <span className="ui-kbd">Échap</span>
        </div>
        {liste.length ? (
          <ul className="ui-palette-liste" id="ui-palette-liste" role="listbox" aria-label="Commandes">
            {liste.map((c, k) => {
              const titre = c.groupe !== groupePrec ? (groupePrec = c.groupe) : null
              return (
                <li key={c.id} role="presentation">
                  {titre ? <div className="ui-palette-groupe" role="presentation">{titre}</div> : null}
                  <div id={`ui-pal-${c.id}`} role="option" aria-selected={k === choisi} className="ui-palette-item"
                    onMouseMove={() => setChoisi(k)} onClick={() => executer(c)}>
                    {c.icone ? <Icone nom={c.icone} /> : null}
                    <span>{c.libelle}</span>
                    {c.indice ? <span className="ui-palette-indice">{c.indice}</span> : null}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="ui-palette-vide">{cherche ? 'Recherche…' : q.trim().length === 1 ? 'Encore une lettre.' : 'Rien ne correspond.'}</p>
        )}
        <div className="ui-palette-pied" aria-hidden="true"><span>↑ ↓ choisir</span><span>Entrée ouvrir</span><span>Échap fermer</span></div>
      </div>
    </div>
  )
}
