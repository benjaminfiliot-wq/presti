'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { GENERAL, LIBELLES_ETAT_PIECE, PIECES, planChantier, type TachePlan } from '@/lib/crm/plan'
import { sceneChantier } from '@/lib/crm/planScene'
import { prereglageDe } from '@/lib/crm/atelier'

// La maquette 3D (version 2) : chargée à la demande, jamais sur téléphone ni avec « moins d'animations », ni sans WebGL.
const SceneChantier = dynamic(() => import('./atelier/SceneChantier'), { ssr: false, loading: () => <p className="muted crm-maquette-attente" role="status">Chargement de la maquette…</p> })
function maquettePossible(): boolean {
  if (typeof window === 'undefined') return false
  if (!window.matchMedia?.('(min-width: 900px)').matches || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false }
}

// Le PLAN DU CHANTIER par pièce (plan du 18/10, n°8, version 1, drapeau crmPlan) : une case par pièce, colorée à faire / en cours
// / fini, son pourcentage et l'équipe qui y a des tâches. Toucher une pièce montre ses tâches, à cocher, et la pièce de chaque
// tâche se corrige. Un SCHÉMA, pas un plan à l'échelle (l'écran le dit). Les listes restent dans la page, masquées (`hidden`) :
// ouvrir une pièce ne crée ni ne détruit rien.
type Agir = (chemin: string, method: string, body: unknown, ok: string | null) => Promise<boolean>

export default function PlanChantier({ titre, taches, membres, metier, cocher, agir }: {
  titre: string | null; taches: readonly TachePlan[]; membres: readonly { id: string; nom: string; role?: string }[]; metier?: string | null
  cocher: (id: string, faite: boolean) => void; agir: Agir
}) {
  const id = useId()
  const plan = useMemo(() => planChantier({ titre, taches, membres }), [titre, taches, membres])
  const [choisie, setChoisie] = useState<string | null>(null)
  const noms = useMemo(() => [...new Set([...PIECES.map((p) => p.nom), GENERAL, ...plan.map((p) => p.nom)])], [plan])
  const [possible, setPossible] = useState(false)
  const [vue, setVue] = useState<'schema' | 'maquette'>('schema')
  useEffect(() => { setPossible(maquettePossible()) }, [])
  const scene = useMemo(() => (vue === 'maquette' ? sceneChantier({ pieces: plan, prereglage: prereglageDe(metier), roles: new Map(membres.map((m) => [m.id, m.role ?? 'compagnon'])) }) : null), [vue, plan, metier, membres])
  if (!taches.length) return null
  return (
    <section className="psh-panel crm-plan" aria-labelledby={`${id}-t`}>
      <header><h2 id={`${id}-t`}>Plan du chantier</h2><span className="muted crm-plan-note">Schéma par pièce, pas à l’échelle</span></header>
      <div className="crm-corps">
        {possible && (
          <div className="crm-plan-vues" role="group" aria-label="Affichage du plan">
            <button type="button" className="psh-btn ghost" aria-pressed={vue === 'schema'} onClick={() => setVue('schema')}>Schéma</button>
            <button type="button" className="psh-btn ghost" aria-pressed={vue === 'maquette'} onClick={() => setVue('maquette')}>Maquette 3D</button>
          </div>
        )}
        {vue === 'maquette' && scene && <SceneChantier scene={scene} choisie={choisie} onChoisir={setChoisie} />}
        <ul className="crm-plan-grille" role="list" hidden={vue === 'maquette'}>
          {plan.map((p) => (
            <li key={p.nom} className={`crm-plan-piece e-${p.etat}${choisie === p.nom ? ' choisie' : ''}`}>
              <button type="button" aria-pressed={choisie === p.nom} aria-controls={`${id}-${p.nom}`} onClick={() => setChoisie(choisie === p.nom ? null : p.nom)}>
                <span className="nom">{p.nom}</span>
                <span className="pct tnum">{p.pct} %</span>
                <span className="etat">{LIBELLES_ETAT_PIECE[p.etat]} · {p.faites}/{p.total}</span>
                <span className="barre" aria-hidden="true"><i style={{ width: `${p.pct}%` }} /></span>
                {p.membres.length > 0 && (
                  <span className="equipe" aria-label={`Équipe : ${p.membres.map((m) => m.nom).join(', ')}`}>
                    {p.membres.slice(0, 4).map((m) => <i key={m.id} title={m.nom} aria-hidden="true">{initiales(m.nom)}</i>)}
                    {p.membres.length > 4 && <i aria-hidden="true">+{p.membres.length - 4}</i>}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        {plan.map((p) => (
          <div key={p.nom} id={`${id}-${p.nom}`} className="crm-plan-taches" hidden={choisie !== p.nom}>
            <h3>{p.nom}</h3>
            <ul>
              {p.taches.map((t) => (
                <li key={t.id}>
                  <label className="crm-coche"><input type="checkbox" checked={!!t.faite} onChange={(e) => cocher(t.id, e.target.checked)} /><span>{t.libelle}</span></label>
                  <label className="crm-plan-deplacer">
                    <span className="crm-sr">Pièce de « {t.libelle} »</span>
                    <select value={t.pieceDevinee ? '' : p.nom} onChange={(e) => void agir(`/api/crm/taches/${t.id}`, 'PATCH', { piece: e.target.value || null }, 'Pièce enregistrée.')}>
                      <option value="">{t.pieceDevinee ? `${p.nom} (devinée)` : 'Deviner d’après le libellé'}</option>
                      {noms.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

const initiales = (nom: string) => nom.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase() ?? '').join('') || '?'
