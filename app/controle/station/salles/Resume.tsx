'use client'

import { useEffect, useState } from 'react'
import type { Env, Equipage } from '../Station'
import type { PoserUrl } from './Fenetre'
import { estEnveloppe, estNombre, type Rep } from './lecture'

// Le résumé de salle commun (décision Claw3D du 25/09, §3.1 G) : monté en tête de chaque panneau de salle. RECETTES,
// AGENTS, AUTOMATISMES, PRODUITS DU JOUR, TÂCHES et ACTIVE AUJ., puis GÉRER (la fiche de l'agent titulaire) et INFO (l'aide
// sur la salle). Ce qui n'est pas servi reste « — » : jamais un 0 ni « 0 min ». Aucun bouton UPGRADE (un achat dans le jeu
// d'origine, rien de tel ici). La touche I replie et déplie le résumé ; le choix est gardé dans ce navigateur.
export type ResumeInfos = {
  /** Les recettes du mois de la salle, déjà écrites par euros() — ou rien : « — ». */
  recettes?: string | null
  /** Les crons de la salle, quand la vue les sert. */
  automatismes?: number | null
  /** L'étape du tapis qui correspond à la salle, quand la vue la sert. */
  produits?: string | null
  /** Les lignes de travail de la salle (les éléments servis). */
  taches?: number | null
}
type Props = ResumeInfos & { cle: string; rep: Rep<any> | null; equipage: Env<Equipage> | null; poser: PoserUrl }
const CLE_STOCKAGE = 'mc-resume-replie'
const TIRET = '—'

/** Les minutes actives du jour, écrites en heures et minutes ; non servies : un tiret. */
function activite(rep: Rep<any> | null): string {
  const e = rep?.valeur && typeof rep.valeur === 'object' ? (rep.valeur as Record<string, unknown>).active_auj : null
  if (!estEnveloppe(e)) return TIRET
  const m = (e.valeur as { minutes?: unknown } | null)?.minutes
  if (!estNombre(m)) return TIRET
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`
}
const nombre = (n: number | null | undefined) => (estNombre(n) ? String(n) : TIRET)

export default function Resume({ cle, rep, equipage, poser, recettes, automatismes, produits, taches }: Props) {
  const [replie, setReplie] = useState(false)
  useEffect(() => {
    try { setReplie(window.localStorage.getItem(CLE_STOCKAGE) === 'oui') } catch { /* stockage fermé : le résumé reste déplié */ }
  }, [])
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'i' || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target instanceof HTMLElement ? e.target : null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      setReplie((avant) => {
        try { window.localStorage.setItem(CLE_STOCKAGE, avant ? 'non' : 'oui') } catch { /* stockage fermé */ }
        return !avant
      })
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [])

  const titulaires = (equipage?.valeur?.agents ?? []).filter((a) => a.salle === cle)
  const titulaire = titulaires[0] ?? null
  const hors = rep?.nonMesure ? '— · hors périmètre' : null
  const lignes: [string, string][] = [
    ['RECETTES', recettes ?? hors ?? TIRET],
    ['AGENTS', titulaires.length ? titulaires.map((a) => a.libelle).join(', ') : TIRET],
    ['AUTOMATISMES', nombre(automatismes)],
    ['PRODUITS DU JOUR', produits ?? TIRET],
    ['TÂCHES', nombre(taches)],
    ['ACTIVE AUJ.', activite(rep)],
  ]
  return (
    <section className="mc-resume" data-resume-salle data-replie={replie ? 'oui' : 'non'} aria-label="Résumé de la salle">
      <button type="button" className="mc-resume-bascule" aria-expanded={!replie} onClick={() => setReplie((r) => { const s = !r; try { window.localStorage.setItem(CLE_STOCKAGE, s ? 'oui' : 'non') } catch { /* stockage fermé */ } return s })}>
        {replie ? 'Résumé ▸' : 'Résumé ▾'} <small>(touche I)</small>
      </button>
      {replie ? null : (
        <>
          <dl className="mc-resume-liste">
            {lignes.map(([etiquette, valeur]) => (
              <div key={etiquette} className="mc-resume-ligne">
                <dt>{etiquette}</dt>
                <dd>{valeur}</dd>
              </div>
            ))}
          </dl>
          <div className="mc-resume-gestes">
            <button type="button" disabled={!titulaire} onClick={() => titulaire && poser({ agent: titulaire.nom, salle: null })}>GÉRER</button>
            <button type="button" onClick={() => poser({ vue: 'aide' })}>INFO</button>
          </div>
        </>
      )}
    </section>
  )
}
