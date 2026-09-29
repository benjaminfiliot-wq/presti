'use client'

import type { Bilan } from '@/lib/contenu/couts'
import { euros } from '@/lib/direction/fraicheur'

// Relevé des jetons et des coûts par agent et par IA (fiche 026-218) : Salle des machines et Trésorerie. Affichage pur du
// `Bilan` de lib/contenu/couts.ts. Un montant inconnu s'écrit « non mesuré », jamais 0 ; les appels du score local Laya
// s'affichent à part (ce ne sont pas des jetons facturés) ; le quota restant et les données manquantes sont séparés de la
// consommation ; chaque bloc dit sa fraîcheur.
const nombre = new Intl.NumberFormat('fr-FR')

function Fraicheur({ f }: { f: Bilan['fraicheur'] }) {
  if (f.etat === 'inconnu') return <span className="muted">date inconnue</span>
  const heures = f.ageMs === null ? null : Math.round(f.ageMs / 3_600_000)
  return <span className={f.etat === 'perime' ? 'warn' : 'muted'}>{f.etat === 'perime' ? 'périmé' : 'à jour'}{heures !== null ? ` · il y a ${heures} h` : ''}</span>
}

export default function Couts({ bilan }: { bilan: Bilan | null | undefined }) {
  if (!bilan) return <section className="tool-card" data-couts><h2>Jetons et coûts par IA</h2><p className="muted">Relevé indisponible.</p></section>
  return <section className="tool-card" data-couts style={{ minWidth: 0, overflow: 'hidden' }}>
    <h2>Jetons et coûts par IA</h2>
    <p className="muted" style={{ fontSize: '.85rem' }}>Relevé <Fraicheur f={bilan.fraicheur} /></p>
    {bilan.consommation.length === 0 ? <p className="muted">Aucune ligne relevée.</p> : (
      <div style={{ display: 'grid', gap: '.6rem' }}>
        {bilan.consommation.map((c) => {
          const cle = `${c.agent}:${c.moteur}:${c.modele ?? ''}`
          const laya = c.appelsLaya > 0
          return <div key={cle} style={{ minWidth: 0, padding: '.4rem 0', borderTop: '1px solid var(--border, rgba(127,127,127,.25))' }}>
            <strong style={{ overflowWrap: 'anywhere' }}>{c.agent} · {c.moteur}{c.modele ? ` · ${c.modele}` : ''}</strong>
            {laya
              ? <div className="muted">{nombre.format(c.appelsLaya)} appel(s) du score local, comptés à part (ni jetons ni euros facturés)</div>
              : <div>
                  <span>{c.inconnu > 0 && c.connuEur === 0 ? 'non mesuré' : euros(c.connuEur)}</span>
                  <span className="muted"> · jetons {c.jetonsInconnus > 0 && c.jetonsEntree === 0 && c.jetonsSortie === 0 ? 'non mesurés' : `${nombre.format(c.jetonsEntree)} entrée / ${nombre.format(c.jetonsSortie)} sortie`}</span>
                  {c.inconnu > 0 && c.connuEur > 0 ? <span className="warn"> · {c.inconnu} ligne(s) sans montant</span> : null}
                </div>}
          </div>
        })}
      </div>
    )}
    {bilan.quotas.length > 0 ? <div style={{ marginTop: '.8rem' }}>
      <h3 style={{ fontSize: '1rem', margin: '0 0 .3rem' }}>Quota disponible</h3>
      {bilan.quotas.map((q) => <div key={`${q.agent}:${q.moteur}:${q.modele ?? ''}`} className="muted">
        {q.agent} · {q.moteur}{q.modele ? ` · ${q.modele}` : ''} : {q.connu ? `${nombre.format(q.restant as number)} ${q.unite ?? ''}`.trim() : 'non exposé'} · <Fraicheur f={q.fraicheur} />
      </div>)}
    </div> : null}
    {bilan.manquants.length > 0 ? <details style={{ marginTop: '.8rem' }}>
      <summary className="muted">Données manquantes ({bilan.manquants.length})</summary>
      <ul>{bilan.manquants.map((m) => <li key={m} className="muted">{m}</li>)}</ul>
    </details> : null}
  </section>
}
