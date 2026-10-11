'use client'

// Vitrine « votre compta, faite par l'IA » (refonte du 11/10/2026, d'après la vidéo de référence : des Excel en
// désordre, un agent qui range, un tableau de bord). Rien n'est dessiné à la main :
//  - les fichiers en désordre sont lib/compta-exemple.ts (FICHIERS_DESORDRE, fictifs) ;
//  - la réponse de l'assistant est écrite d'avance (la landing n'appelle aucune IA), mais passe par la même
//    validation que la vraie (validerPlanIA) ;
//  - les étapes, le bilan en mots et les lignes sortent du VRAI moteur (appliquerPlan, bilanEnMots), et le
//    tableur est celui de /chiffres, en lecture seule. Chaque montant affiché est donc calculé, jamais écrit.
// Le moteur tourne au rendu : tout est déterministe (dates fixes), le serveur et le navigateur voient pareil.
import { useEffect, useRef, useState } from 'react'
import '@/app/chiffres/chiffres.css'
import Tableur from '@/app/chiffres/Tableur'
import { FICHIERS_DESORDRE, PLAN_IA_EXEMPLE } from '@/lib/compta-exemple'
import { appliquerPlan, bilanEnMots, completerPlan, construireEchantillon, planParRegles, validerPlanIA, type Etape } from '@/lib/comptaAssistant'
import { calculerVue } from '@/lib/comptaArtisan'
import { formatEuros, lireCsvNumerote } from '@/lib/comptaImport'

const REGLES = planParRegles(FICHIERS_DESORDRE)
const AVIS = validerPlanIA(PLAN_IA_EXEMPLE, construireEchantillon(FICHIERS_DESORDRE))
const RESULTAT = appliquerPlan(FICHIERS_DESORDRE, AVIS ? completerPlan(AVIS, REGLES) : REGLES)
const LIGNES = RESULTAT.rangement.lignes
const BILAN = bilanEnMots(LIGNES)
const TOTAUX = calculerVue(LIGNES).tableaux
const ETAPES: Etape[] = [
  { texte: `${FICHIERS_DESORDRE.length} feuilles déposées, telles quelles.`, ton: 'ok' },
  { texte: 'L’IA a compris la structure de chaque feuille.', ton: 'ok' },
  ...RESULTAT.etapes,
  { texte: `${LIGNES.length} lignes rangées. Tableau de bord à jour.`, ton: 'ok' },
]
// L'aperçu « avant » : le cahier tel que l'artisan le tient, lignes vides et ligne TOTAL comprises.
const CAHIER = FICHIERS_DESORDRE[0]
const BRUT = CAHIER.texte.split('\n').map((l, i) => ({ ligne: i + 1, cellules: l.split(';') }))
const LIGNES_LUES = new Set(lireCsvNumerote(CAHIER.texte).map((x) => x.ligne))
const PAS = 620

export default function DemoCompta() {
  const ref = useRef<HTMLElement>(null)
  // Rendu serveur : tout est visible (sans JavaScript, la démonstration reste lisible). Le déroulé ne se rejoue
  // que si la scène est encore sous l'écran à l'arrivée, et jamais avec le mouvement réduit.
  const [vues, setVues] = useState(ETAPES.length)
  useEffect(() => {
    const el = ref.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.75) return
    setVues(0)
    let minuterie = 0
    const obs = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return
      obs.disconnect()
      let n = 0
      minuterie = window.setInterval(() => { n++; setVues(n); if (n >= ETAPES.length) clearInterval(minuterie) }, PAS)
    }, { rootMargin: '0px 0px -25% 0px' })
    obs.observe(el)
    return () => { obs.disconnect(); clearInterval(minuterie) }
  }, [])
  const fini = vues >= ETAPES.length

  return (
    <div className="lp-compta reveal">
      <div className="lp-cpt-scene">
        <figure className="lp-cpt-avant" aria-label="Avant : le cahier de chantiers tel quel">
          <figcaption><span>Avant</span>{CAHIER.nom}</figcaption>
          <div className="lp-cpt-brut" role="presentation">
            {BRUT.map((r) => {
              const total = /total/i.test(r.cellules.join(' '))
              const classe = total ? 'total' : !LIGNES_LUES.has(r.ligne) ? 'vide' : r.ligne === 1 ? 'titre' : r.ligne === 3 ? 'entete' : ''
              return <div key={r.ligne} className={`lp-cpt-l ${classe}`}><b>{r.ligne}</b>{r.cellules.slice(0, 5).map((c, j) => <span key={j}>{c}</span>)}</div>
            })}
          </div>
          <p>+ une feuille « Synthèse » et un relevé de carte en Débit / Crédit.</p>
        </figure>

        <section ref={ref} className={`lp-cpt-agent${fini ? '' : ' actif'}`} aria-live="polite" aria-label="L’assistant comptable range les fichiers">
          <header><span className="lp-cpt-pastille" aria-hidden="true" />{fini ? 'Rangement terminé' : 'L’IA range les fichiers…'}</header>
          <ol>
            {ETAPES.map((e, i) => i < vues || fini
              ? <li key={i} className={`ca-etape ca-etape--${e.ton}`}><i aria-hidden="true" /><span>{e.texte}</span></li>
              : i === vues ? <li key={i} className="ca-etape ca-etape--encours"><i aria-hidden="true" /><span>…</span></li> : null)}
          </ol>
          <div className={`lp-cpt-bilan${fini ? ' pret' : ''}`}>
            <p className="ca-eyebrow">Le point de l’assistant</p>
            {BILAN.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </section>
      </div>

      <div className="lp-cpt-kpis" aria-label="Le tableau de bord calculé">
        <div><span>Recettes</span><b>{formatEuros(TOTAUX.recettes)}</b></div>
        <div><span>Dépenses</span><b>{formatEuros(TOTAUX.depenses)}</b></div>
        <div><span>Bénéfice</span><b>{formatEuros(TOTAUX.benefice)}</b></div>
        <div className="crit"><span>Impayés</span><b>{formatEuros(TOTAUX.impayes.montant)}</b></div>
      </div>

      <div className="lp-chiffres-ecran">
        <div className="lp-chiffres-barre" aria-hidden="true"><span /><span /><span /><em>Après : le classeur rangé</em></div>
        <div className="lp-compta-corps ca">
          <Tableur lignes={LIGNES} />
        </div>
      </div>
      <p className="lp-chiffres-note">Exemple sur un plombier fictif : noms et montants inventés. La réponse de l’assistant est écrite d’avance pour cette page ; les étapes, les totaux et le bilan sortent du vrai moteur de calcul.</p>
    </div>
  )
}
