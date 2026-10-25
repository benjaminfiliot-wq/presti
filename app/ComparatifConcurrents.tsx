import { AVANTAGES_VISIBLES, CONCURRENTS, CRITERES, CRITERES_VISIBLES, PRESTI, COMPARATIF_MENTION, COMPARATIF_PRECAUTION, COMPARATIF_LIMITES_LIGNES, COMPARATIF_LIMITES_TITRE, COMPARATIF_DATE_ISO, phraseAutres } from '@/lib/comparatifConcurrents'
import { AUTOMATISATION, PLANS } from '@/lib/plans'

// Comparatif honnête avec les autres logiciels de devis et factures pour artisans (publicité comparative, art. L122-1 du Code de la
// consommation). TOUT vient de lib/comparatifConcurrents.ts : faits lus sur les sites des éditeurs, datés, mêmes critères pour tous.
// Composant serveur (aucun hook). Même mise en page que le tableau des offres (.cmp) pour rester lisible en 390 px.
const ni = (t: string) => /^Non indiqué$/.test(t)

export default function ComparatifConcurrents() {
  return (
    <div className="cc">
      <p className="cc-hint" aria-hidden="true">Faites défiler le tableau vers la droite pour voir les autres éditeurs →</p>
      <div className="cmp-wrap" role="region" aria-label="Presti face aux autres logiciels de devis et factures, défilement horizontal" tabIndex={0}>
        <table className="cmp cc-table">
          <caption className="visually-hidden">{COMPARATIF_MENTION}</caption>
          <thead>
            <tr>
              <th scope="col"><span className="visually-hidden">Critère</span></th>
              <th scope="col" className="cmp-feat"><span className="cmp-nom">Presti</span></th>
              {CONCURRENTS.map((c) => <th key={c.id} scope="col"><span className="cmp-nom">{c.nom}</span><span className="cmp-prix">{c.site}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {CRITERES_VISIBLES.map((cr) => (
              <tr key={cr.id}>
                <th scope="row">{cr.libelle}</th>
                <td className="cmp-feat"><span className="cmp-txt">{PRESTI[cr.id]}</span></td>
                {CONCURRENTS.map((c) => {
                  const cell = c.cellules[cr.id]
                  return <td key={c.id}><span className={`cmp-txt${ni(cell.t) ? ' cc-ni' : ''}`}>{cell.t}</span></td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="cc-auto" aria-label="Niveau d’automatisation selon l’offre">
        <p className="cc-auto-titre"><b>Tout est automatisé dans les deux offres : avec {PLANS.studio.label}, tout est préparé et vous validez d’un clic ; avec {PLANS.signature.label}, tout part seul.</b></p>
        <ul className="cc-auto-liste">
          {(['studio', 'signature'] as const).map((id) => (
            <li key={id}><b>{PLANS[id].label} ({PLANS[id].prixMois} €)</b> : {AUTOMATISATION[id]}.</li>
          ))}
        </ul>
      </section>
      <section className="cc-plus" aria-labelledby="cc-plus-titre">
        <h3 id="cc-plus-titre">Ce que Presti fait de plus</h3>
        <ul className="cc-plus-liste">
          {AVANTAGES_VISIBLES.map((a) => {
            const autres = phraseAutres(a)
            return (
              <li key={a.id} className="cc-plus-carte" data-avantage={a.id}>
                <span className="cc-plus-critere">{CRITERES.find((c) => c.id === a.critere)?.libelle}</span>
                <h4>{a.titre}</h4>
                <p>{a.texte}</p>
                {autres && <p className="cc-plus-autres">{autres}</p>}
              </li>
            )
          })}
        </ul>
      </section>
      <section className="cc-devant" aria-labelledby="cc-devant-titre">
        <h3 id="cc-devant-titre">{COMPARATIF_LIMITES_TITRE}</h3>
        <ul>{COMPARATIF_LIMITES_LIGNES.map((l) => <li key={l}>{l}</li>)}</ul>
      </section>
      <p className="cc-mention"><b>{COMPARATIF_MENTION}</b></p>
      <p className="cc-precaution">{COMPARATIF_PRECAUTION}</p>
      <details className="cc-sources">
        <summary>Sources du comparatif</summary>
        <p>Pages lues le <time dateTime={COMPARATIF_DATE_ISO}>{COMPARATIF_MENTION.match(/\d{2}\/\d{2}\/\d{4}/)?.[0]}</time> :</p>
        <ul>
          {CONCURRENTS.map((c) => (
            <li key={c.id}><b>{c.nom}</b> : {c.sources.map((s, i) => <span key={s.url}>{i ? ' · ' : ''}<a href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.libelle}</a></span>)}</li>
          ))}
        </ul>
        <p>Une information inexacte ou périmée ? <a href="/contact">Écrivez-nous</a> : nous la corrigeons.</p>
      </details>
    </div>
  )
}
