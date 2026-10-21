'use client'

// « Ce qui est automatique » : deux listes tirées du code (lib/aideAutomatique.ts), chacune entrée avec la pastille de l'offre qui l'inclut.
// 1. sans l'assistant de gestion : ce que Presti fait seul ; 2. avec lui : ce qu'il fait, et la réponse à « est-ce entièrement automatique ? ».
import { AUTOMATIQUE_AVEC_ASSISTANT, AUTOMATIQUE_SANS_ASSISTANT, offrePremiere, QUESTION_ASSISTANT, REPONSE_ASSISTANT, visibles, type EntreeAuto } from '@/lib/aideAutomatique'
import PastilleOffre from './PastilleOffre'

function Liste({ entrees }: { entrees: EntreeAuto[] }) {
  return (
    <ul className="aide-auto">
      {entrees.map((e) => (
        <li key={e.id} id={`auto-${e.id}`}>
          <div className="aide-auto-t">
            <b>{e.titre}</b>
            <PastilleOffre offre={offrePremiere(e.cap)} />
            {e.surDemande && <span className="aide-auto-opt" title="Rien ne se passe tant que vous ne l’avez pas activé vous-même.">À activer par vous</span>}
          </div>
          <p>{e.texte}</p>
        </li>
      ))}
    </ul>
  )
}

/** `mots` : les mots de la recherche (déjà sans accents) ; vide = tout montrer. */
export const filtrer = (l: EntreeAuto[], mots: string[], n: (t: string) => string): EntreeAuto[] =>
  mots.length ? l.filter((e) => { const t = n(`${e.titre} ${e.texte}`); return mots.every((m) => t.includes(m)) }) : l

export default function Automatique({ mots = [], n = (t: string) => t }: { mots?: string[]; n?: (t: string) => string }) {
  const sans = filtrer(visibles(AUTOMATIQUE_SANS_ASSISTANT), mots, n)
  const avec = filtrer(visibles(AUTOMATIQUE_AVEC_ASSISTANT), mots, n)
  if (!sans.length && !avec.length) return null
  const tout = !mots.length
  return (
    <section id="grp-automatique" className="aide-grp" aria-labelledby="grp-automatique-t">
      <h2 id="grp-automatique-t">Ce qui est automatique</h2>
      {tout && <p className="aide-auto-intro">La pastille dit la première offre qui inclut la fonctionnalité ; les offres au-dessus l’incluent aussi.</p>}
      {sans.length > 0 && (
        <>
          <h3 className="aide-auto-h">Sans l’assistant de gestion : ce qui se fait tout seul</h3>
          <Liste entrees={sans} />
        </>
      )}
      {avec.length > 0 && (
        <>
          <h3 className="aide-auto-h">Avec l’assistant de gestion : ce qu’il fait pour vous</h3>
          <Liste entrees={avec} />
          {tout && (
            <div className="aide-auto-rep" role="note">
              <h4>{QUESTION_ASSISTANT}</h4>
              <p><b>{REPONSE_ASSISTANT.titre}</b></p>
              {REPONSE_ASSISTANT.paragraphes.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          )}
        </>
      )}
    </section>
  )
}
