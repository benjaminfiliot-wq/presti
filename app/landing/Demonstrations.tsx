// Section 4 de la landing v2, passe 3 (033-009) : « Ce que Presti fait pour vous », fonction par fonction.
// Chaque fonction : son nom, une promesse d'une ligne (h3), deux ou trois phrases pour un artisan, ce qui change entre Studio et
// Signature, l'offre qui la comprend (lue dans lib/plans.ts), et sa DÉMONSTRATION : un vrai écran de Presti recréé et animé
// (demos/Ecrans.tsx), posé sur une mosaïque de pixels en marches (la grammaire de mistral.ai, demos/Mosaique.tsx), puce « Exemple ».
// Les rangées alternent texte à gauche / à droite, comme les pages produit de claude.com. Sans script : tout est là, à l'état final.
import Ecran from './demos/Ecrans'
import Mosaique from './demos/Mosaique'
import Mots from './demos/Mots'
import { DEMOS } from '@/lib/landing/demos'
import { etiquetteOffre, STUDIO, SIGNATURE } from '@/lib/landing/contenu'

export default function Demonstrations() {
  return (
    <ol className="lp3-fns">
      {DEMOS.map((d, i) => {
        const inverse = i % 2 === 1
        return (
          <li key={d.id} id={`fonction-${d.id}`} className={`lp3-fn${inverse ? ' lp3-fn--inverse' : ''}`}>
            <div className="lp3-fn-texte reveal">
              <p className="lp3-surtitre"><span className="lp3-fn-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>{d.nom}</p>
              <h3 className="lp3-fn-titre"><Mots texte={d.promesse} /></h3>
              <p className="lp3-fn-explication">{d.explication}</p>
              <ul className="lp3-fn-offres">
                <li><span className="lp3-fn-marque" aria-hidden="true">{STUDIO}</span>{d.studio}</li>
                {d.signature ? <li><span className="lp3-fn-marque lp3-fn-marque--plein" aria-hidden="true">{SIGNATURE}</span>{d.signature}</li> : null}
              </ul>
              <span className="lp3-offre">{etiquetteOffre(d.capacite)}</span>
            </div>
            <div className="lp3-fn-scene reveal">
              <Mosaique n={101 + i * 17} cote={inverse ? 'gauche' : 'droite'} />
              <div className="lp3-fn-ecran" role="img" aria-label={d.alt}>
                <span className="lp3-puce lp3-puce--flottante">Exemple</span>
                <div aria-hidden="true"><Ecran id={d.id} /></div>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
