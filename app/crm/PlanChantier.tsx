'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { GENERAL, LIBELLES_ETAT_PIECE, PIECES, pieceDe, planChantier, type TachePlan } from '@/lib/crm/plan'
import { etiquettesSchema, planBatiment, repartitionUtile, type PlanBatiment, type Zone } from '@/lib/crm/planBatiment'
import { COULEUR_ETAT, LIBELLES_ETAT_ZONE, sceneBatiment, type EtatZone } from '@/lib/crm/planScene'
import { deduireType, LIBELLES_TYPE_BATIMENT, type TypeBat } from '@/lib/crm/carte'
import { metier3DDe } from '@/lib/crm/infrastructure'
import { useExemple } from './mode'

// La maquette 3D : chargée à la demande, jamais sur téléphone ni avec « moins d'animations », ni sans WebGL (le schéma suffit).
const SceneChantier = dynamic(() => import('./atelier/SceneChantier'), { ssr: false, loading: () => <p className="muted crm-maquette-attente" role="status">Chargement de la maquette…</p> })
function maquettePossible(): boolean {
  if (typeof window === 'undefined') return false
  if (!window.matchMedia?.('(min-width: 900px)').matches || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false }
}

// Le PLAN DU CHANTIER (lot 7, Benj : « le modèle est nul ») : le chantier dans SON bâtiment — le même type que sur la carte de
// l'atelier (maison, appartement, immeuble, hôtel, restaurant…). Le SCHÉMA est un plan d'étage (des pièces disposées comme un vrai
// logement ou un vrai restaurant, pas une grille de cartes) ; la MAQUETTE 3D est ce bâtiment en coupe, pièces meublées, travaux du
// métier visibles, compagnons sur place. Mêmes couleurs d'état, mêmes clics : une pièce → ses tâches à cocher (la route de la fiche),
// et la pièce de chaque tâche se corrige. Un schéma, pas à l’échelle (l'écran le dit). Les listes restent dans la page, masquées
// (`hidden`) : ouvrir une pièce ne crée ni ne détruit rien. Sans pièce renseignée : « Répartir les tâches par pièce ».
type Agir = (chemin: string, method: string, body: unknown, ok: string | null) => Promise<boolean>

export default function PlanChantier({ titre, taches, membres, metier, typeBatiment, cocher, agir }: {
  titre: string | null; taches: readonly TachePlan[]; membres: readonly { id: string; nom: string; role?: string }[]; metier?: string | null
  /** Le type du bâtiment (celui de la carte : choisi ou déduit) ; absent, il se déduit du titre. */
  typeBatiment?: TypeBat | null
  cocher: (id: string, faite: boolean) => void; agir: Agir
}) {
  const id = useId()
  const exemple = useExemple()
  // Dans l'exemple, la répartition par pièce est SIMULÉE (rien n'est écrit) : elle s'applique ici seulement.
  const [simulees, setSimulees] = useState<Record<string, string>>({})
  const tachesVues = useMemo(() => taches.map((t) => (simulees[t.id] ? { ...t, piece: simulees[t.id] } : t)), [taches, simulees])
  const plan = useMemo(() => planChantier({ titre, taches: tachesVues, membres }), [titre, tachesVues, membres])
  const type: TypeBat = typeBatiment ?? deduireType(titre)
  const bat = useMemo(() => planBatiment(type, plan), [type, plan])
  const [choisie, setChoisie] = useState<string | null>(null)
  const noms = useMemo(() => [...new Set([...PIECES.map((p) => p.nom), GENERAL, ...plan.map((p) => p.nom), ...bat.zones.map((z) => z.nom)])], [plan, bat])
  const [possible, setPossible] = useState(false)
  const [vue, setVue] = useState<'schema' | 'maquette'>('schema')
  const [repartir, setRepartir] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  useEffect(() => { setPossible(maquettePossible()) }, [])
  const scene = useMemo(() => (vue === 'maquette' ? sceneBatiment({ plan: bat, metier: metier3DDe(metier ?? null), roles: new Map(membres.map((m) => [m.id, m.role ?? 'compagnon'])) }) : null), [vue, bat, metier, membres])
  if (!taches.length) return null
  const zoneChoisie = choisie ? bat.zones.find((z) => z.nom === choisie && !z.piece) ?? null : null
  return (
    <section className="psh-panel crm-plan" aria-labelledby={`${id}-t`} data-crm-plan={type}>
      <header><h2 id={`${id}-t`}>Plan du chantier</h2><span className="muted crm-plan-note">{LIBELLES_TYPE_BATIMENT[type]} · schéma par pièce, pas à l’échelle</span></header>
      <div className="crm-corps">
        <div className="crm-plan-barre">
          {possible && (
            <div className="crm-plan-vues" role="group" aria-label="Affichage du plan">
              <button type="button" className="psh-btn ghost" aria-pressed={vue === 'schema'} onClick={() => setVue('schema')}>Schéma</button>
              <button type="button" className="psh-btn ghost" aria-pressed={vue === 'maquette'} onClick={() => setVue('maquette')}>Maquette 3D</button>
            </div>
          )}
          <Legende />
        </div>
        {repartitionUtile(plan) && !repartir && (
          <div className="crm-plan-repartir" role="note" data-crm-repartir>
            <p>Les tâches de ce chantier ne sont pas encore rangées par pièce{plan.length === 1 ? ` : tout est dans « ${plan[0].nom} »` : ''}.</p>
            <button type="button" className="psh-btn primary" onClick={() => setRepartir(true)}>Répartir les tâches par pièce</button>
          </div>
        )}
        {repartir && <Repartition taches={tachesVues} noms={noms.filter((n) => n !== GENERAL)} onFermer={() => setRepartir(false)} onEnregistrer={async (choix) => {
          if (exemple) { setSimulees((s) => ({ ...s, ...choix })); setNote('Exemple : la répartition est montrée sur le plan, rien n’est enregistré.'); setRepartir(false); return }
          let ok = 0
          for (const [tid, piece] of Object.entries(choix)) if (await agir(`/api/crm/taches/${tid}`, 'PATCH', { piece }, null)) ok++
          setNote(`${ok} tâche${ok > 1 ? 's' : ''} rangée${ok > 1 ? 's' : ''} par pièce.`); setRepartir(false)
        }} />}
        {note && <p className="crm-message" role="status">{note}</p>}
        {vue === 'maquette' && scene && <SceneChantier scene={scene} choisie={choisie} onChoisir={setChoisie} />}
        {vue === 'schema' && <Schema bat={bat} choisie={choisie} onChoisir={setChoisie} />}
        {zoneChoisie && <p className="crm-vide" role="status">Aucune tâche dans « {zoneChoisie.nom} » : cette pièce n’est pas dans les travaux.</p>}
        {plan.map((p) => (
          <div key={p.nom} id={`${id}-${p.nom}`} className="crm-plan-taches" hidden={choisie !== p.nom} data-crm-taches={p.nom}>
            <h3>{p.nom} <span className="muted tnum">· {LIBELLES_ETAT_PIECE[p.etat]} · {p.faites}/{p.total} · {p.pct} %</span></h3>
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

const ETATS: EtatZone[] = ['neutre', 'a_faire', 'en_cours', 'fini']
function Legende() {
  return (
    <ul className="crm-plan-legende" aria-label="Légende">
      {ETATS.map((e) => <li key={e}><i style={{ background: COULEUR_ETAT[e] }} aria-hidden="true" />{LIBELLES_ETAT_ZONE[e]}</li>)}
    </ul>
  )
}

/** Le SCHÉMA : le plan d'étage du bâtiment en SVG — pièces colorées selon leur état, nom et pourcentage DANS la pièce, la toiture en
 *  bandeau au-dessus, la façade en liseré, « Général » en pastille ; chaque pièce est un bouton (clic, Entrée, Espace). */
const ECHELLE_SCHEMA = 46
function Schema({ bat, choisie, onChoisir }: { bat: PlanBatiment; choisie: string | null; onChoisir: (n: string | null) => void }) {
  const e = ECHELLE_SCHEMA
  const haut = bat.toiture ? 34 : 0
  const l = bat.largeur * e, h = bat.profondeur * e
  const etiquettes = useMemo(() => new Map(etiquettesSchema(bat, e).map((x) => [x.cle, x])), [bat, e])
  const etat = (z: Zone): EtatZone => (z.piece ? z.piece.etat : 'neutre')
  const choisir = (n: string) => onChoisir(choisie === n ? null : n)
  const touche = (n: string) => (ev: React.KeyboardEvent) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); choisir(n) } }
  return (
    <div className="crm-schema" data-crm-schema>
      <svg viewBox={`-8 ${-8 - haut} ${l + 16} ${h + 16 + haut}`} role="group" aria-label="Plan d’étage du bâtiment" style={{ maxWidth: Math.max(420, l + 16) }}>
        {bat.toiture && (
          <g role="button" tabIndex={0} aria-pressed={choisie === bat.toiture.nom} aria-label={`${bat.toiture.nom} · ${bat.toiture.pct} %`} onClick={() => choisir(bat.toiture!.nom)} onKeyDown={touche(bat.toiture.nom)} className={`crm-schema-zone${choisie === bat.toiture.nom ? ' choisie' : ''}`} data-crm-zone={bat.toiture.nom}>
            <path d={`M 0 ${-6} L ${l / 2} ${-haut} L ${l} ${-6} Z`} fill={COULEUR_ETAT[bat.toiture.etat]} stroke="var(--ink-soft)" strokeWidth={1.2} />
            <text x={l / 2} y={-12} textAnchor="middle" className="crm-schema-texte">{bat.toiture.nom} · {bat.toiture.pct} %</text>
          </g>
        )}
        <rect x={-4} y={-4} width={l + 8} height={h + 8} rx={3} fill="none" stroke={bat.facade ? COULEUR_ETAT[bat.facade.etat] : 'transparent'} strokeWidth={bat.facade ? 6 : 0} data-crm-zone={bat.facade ? bat.facade.nom : undefined}
          onClick={bat.facade ? () => choisir(bat.facade!.nom) : undefined} style={bat.facade ? { cursor: 'pointer' } : undefined} />
        {bat.zones.map((z) => {
          const et = etiquettes.get(z.cle)
          const n = z.nom
          return (
            <g key={z.cle} role="button" tabIndex={0} aria-pressed={choisie === n} aria-label={`${n} · ${z.piece ? `${z.piece.pct} % · ${LIBELLES_ETAT_ZONE[etat(z)]}` : LIBELLES_ETAT_ZONE.neutre}`}
              onClick={() => choisir(n)} onKeyDown={touche(n)} className={`crm-schema-zone e-${etat(z)}${choisie === n ? ' choisie' : ''}`} data-crm-zone={n}>
              <rect x={z.x * e} y={z.z * e} width={z.w * e} height={z.d * e} fill={COULEUR_ETAT[etat(z)]} stroke="var(--ink)" strokeWidth={z.sorte === 'exterieur' ? 1 : 2.4} strokeDasharray={z.sorte === 'exterieur' ? '5 4' : undefined} />
              {z.piece && z.piece.membres.length > 0 && z.w * e > 60 && z.d * e > 50 && z.piece.membres.slice(0, 3).map((m, k) => (
                <g key={m.id} transform={`translate(${(z.x + z.w) * e - 14 - k * 20}, ${(z.z + z.d) * e - 14})`}><circle r={9} fill="var(--ink)" /><text textAnchor="middle" y={3.5} className="crm-schema-avatar">{initiales(m.nom)}</text></g>
              ))}
              {et && <text x={et.x + et.l / 2} y={et.y + et.taille} textAnchor="middle" className={`crm-schema-texte${z.piece ? '' : ' neutre'}`} style={{ fontSize: et.taille }}>
                {et.lignes.map((t, k) => <tspan key={k} x={et.x + et.l / 2} dy={k ? et.taille * 1.25 : 0}>{t}</tspan>)}
              </text>}
            </g>
          )
        })}
      </svg>
      {bat.general && (
        <button type="button" className={`crm-schema-general e-${bat.general.etat}${choisie === bat.general.nom ? ' choisie' : ''}`} aria-pressed={choisie === bat.general.nom} onClick={() => choisir(bat.general!.nom)} data-crm-zone={bat.general.nom}>
          <i style={{ background: COULEUR_ETAT[bat.general.etat] }} aria-hidden="true" />Tout le chantier (général) · <span className="tnum">{bat.general.pct} %</span>
        </button>
      )}
    </div>
  )
}

/** « Répartir les tâches par pièce » : chaque tâche, sa pièce devinée d'après son libellé (modifiable), enregistrée d'un geste. */
function Repartition({ taches, noms, onFermer, onEnregistrer }: { taches: readonly TachePlan[]; noms: string[]; onFermer: () => void; onEnregistrer: (choix: Record<string, string>) => Promise<void> }) {
  const [choix, setChoix] = useState<Record<string, string>>(() => Object.fromEntries(taches.map((t) => [t.id, pieceDe(t.libelle) ?? ''])))
  const [occupe, setOccupe] = useState(false)
  const a = Object.values(choix).filter(Boolean).length
  return (
    <form className="crm-plan-repartition" data-crm-repartition onSubmit={async (e) => { e.preventDefault(); setOccupe(true); await onEnregistrer(Object.fromEntries(Object.entries(choix).filter(([, v]) => v))); setOccupe(false) }}>
      <p className="muted">La pièce de chaque tâche est devinée d’après son libellé : corrigez-la au besoin, puis enregistrez.</p>
      <ul>
        {taches.map((t) => (
          <li key={t.id}>
            <span>{t.libelle}</span>
            <select value={choix[t.id] ?? ''} onChange={(e) => setChoix((c) => ({ ...c, [t.id]: e.target.value }))} aria-label={`Pièce de « ${t.libelle} »`}>
              <option value="">— Tout le chantier —</option>
              {noms.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </li>
        ))}
      </ul>
      <div className="crm-boutons">
        <button type="submit" className="psh-btn primary" disabled={occupe || a === 0}>{occupe ? 'Enregistrement…' : `Enregistrer la répartition (${a})`}</button>
        <button type="button" className="psh-btn ghost" onClick={onFermer}>Annuler</button>
      </div>
    </form>
  )
}

const initiales = (nom: string) => nom.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase() ?? '').join('') || '?'
