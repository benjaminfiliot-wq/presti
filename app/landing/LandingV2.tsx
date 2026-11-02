// La landing v2 de Presti (chantier 2, lot 6, tâche 033-003), derrière le drapeau `landingV2` (lib/flags.ts) : app/page.tsx la sert
// à la place de l'accueil actuel quand il est levé, sur le « oui » de Benj seulement.
// - Structure : les 7 sections du prompt 4 de Benj, dans son ordre (p4-landing.md:33-103 ; plan du chantier 2, §0).
// - Texte : plans/011-cadrage-01-11/c2-lot4/texte.md, lu dans lib/landing/contenu.ts. Aucun prix ni durée d'essai ici (ils vivent sur
//   /offres, lus dans lib/plans.ts) ; toute donnée fictive porte « Exemple » ; le vert ne marque que « validé ».
// - Direction artistique (Benj, 02/11 au soir : « un mélange entre claude.com et mistral.ai ») : le calme éditorial de claude.com
//   (grands titres en serif, beaucoup de vide, filets fins, boutons pilule, sections ivoire) et l'énergie chaude de mistral.ai (un très
//   grand titre, le dégradé corail → ambre → orange employé deux fois, les pixels en marches), sur l'identité Presti (corail seul accent,
//   fond nuit chaud de la piste B « Cinéma », Bricolage / Hanken / JetBrains Mono). La signature : « l'aube en pixels »
//   (lib/landing/aube.ts), derrière le produit du héros et sous l'appel final.
// - Visuels : uniquement le vrai produit — la fenêtre animée de l'accueil (app/HeroApp.tsx, réutilisée sans la modifier) et les
//   captures de public/demo. Aucune interface redessinée, aucune illustration générique.
// - Mouvement : app/Motion.tsx (révélations en cascade, filet de sécurité : rien ne reste caché sans JS), une entrée CSS du produit
//   dans le héros, et des animations liées au défilement en CSS pur (animation-timeline), sans WebGL ; mouvement réduit respecté.
// - 033-005 (passe 2, « de belles animations, de belles slides ») : le titre monte ligne par ligne, l'aube se lève rang par rang, les
//   trois temps passent en diapositives épinglées (Etapes.tsx), le 7× compte, les filets se tracent, les captures se dévoilent, une lueur
//   suit la souris sur les cartes, la grappe de l'entreprise s'allume case par case, l'horizon du bandeau monte. Le détail, les durées,
//   les courbes et le repli en mouvement réduit : .orchestre/preuves/033-005/resume.md, « Mouvements ».
// - 033-009 (passe 3, « aucune animation, aucune slide », Benj) : la page EXPLIQUE et MONTRE. La traînée de pixels suit le pointeur sur
//   le fond du héros (n8n.io) ; des marches de pixels coulent entre les sections nuit et ivoire (mistral.ai) ; une scène d'artisan se
//   construit là où elle sert le sens (le mur du « Problème », les outils de « Pour qui », la maison de l'entreprise, l'aube du point du
//   jour) — moteur de 033-008, importé depuis @/app/landing/pixels. « Une journée avec Presti » passe en diapositives épinglées dans la
//   section 3 (Journee.tsx) ; la section 4 explique et démontre sept fonctions sur de vrais écrans de Presti animés (Demonstrations.tsx).
//   Les titres montent mot par mot. Détail : .orchestre/preuves/033-009/resume.md, « Ce que la page explique » et « Mouvements ».
import type { CSSProperties, ReactNode } from 'react'
import '@/app/globals.css'
import './landing-v2.css'
import HeroApp from '@/app/HeroApp'
import Motion from '@/app/Motion'
import Entete from './Entete'
import Pied from './Pied'
import Etapes from './Etapes'
import Journee from './Journee'
import Demonstrations from './Demonstrations'
import Mots from './demos/Mots'
import { PixelTrail, PixelChantier, PixelTransition } from './demos/Pixels'
import { serif } from './polices'
import { aube, type Pixel } from '@/lib/landing/aube'
import { donneesStructurees, jsonLdSur } from '@/lib/landing/donneesStructurees'
import { COMMENT, ENTREPRISE, FAQ_ACCUEIL, FINAL, HERO, POUR_QUI, PROBLEME } from '@/lib/landing/contenu'

/* Pictogrammes au trait fin (1,5), jamais d'emoji. */
const trait = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
const ICONES: Record<string, ReactNode> = {
  horloge: <svg {...trait}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>,
  boucle: <svg {...trait}><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5" /><path d="M20 4v4.5h-4.5" /><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5" /><path d="M4 20v-4.5h4.5" /></svg>,
  dossier: <svg {...trait}><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /><path d="M3.5 10.5h17" /></svg>,
  devis: <svg {...trait}><path d="M6.5 3.5h8l3 3v14h-11z" /><path d="M14.5 3.5v3h3" /><path d="M9 11h6M9 14h6M9 17h3.5" /></svg>,
  crm: <svg {...trait}><rect x="3.5" y="4.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="4.5" width="7" height="4.5" rx="1.5" /><rect x="13.5" y="12" width="7" height="7.5" rx="1.5" /><rect x="3.5" y="14.5" width="7" height="5" rx="1.5" /></svg>,
  factures: <svg {...trait}><path d="M6 3.5h12v17l-2.5-1.6-2 1.6-1.5-1.2-1.5 1.2-2-1.6L6 20.5z" /><path d="M9 8.5h6M9 12h6M9 15.5h3.5" /></svg>,
  inventaire: <svg {...trait}><path d="m12 3.5 8 4v9l-8 4-8-4v-9z" /><path d="m4 7.5 8 4 8-4M12 11.5v9" /></svg>,
  documents: <svg {...trait}><path d="M8 3.5h7l3.5 3.5v10.5a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 8 3.5z" /><path d="M4 7v12.5A1.5 1.5 0 0 0 5.5 21H15" /></svg>,
  assistant: <svg {...trait}><path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4 3.5v-3.5h-.5a2 2 0 0 1-2-2z" /><path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" /></svg>,
  fleche: <svg {...trait}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
}

/** Rangs de l'aube, du bas vers le haut ; chaque rang coupé en trois paquets stables (le même pixel tombe toujours dans le même) : la
 *  cascade monte en marches irrégulières, et une trentaine de groupes s'animent au lieu de centaines de carrés. */
function parRangs(pixels: Pixel[]) {
  const rangs = [...new Set(pixels.map((p) => p.y))].sort((a, b) => b - a)
  return rangs.flatMap((y, r) => [0, 1, 2].map((k) => ({ cle: `${y}-${k}`, ordre: r * 3 + k, pixels: pixels.filter((p) => p.y === y && ((p.x / 24) * 7 + y / 24) % 3 === k) })))
}

/** L'aube en pixels : SVG statique, calculé côté serveur (lib/landing/aube.ts). Décor seulement : aria-hidden.
 *  `mode` : « rangs » (groupes qui se lèvent du bas vers le haut) ou « cases » (chaque case porte son rang d'allumage, --i). */
function Aube({ pixels, largeur, hauteur, id, className, mode = 'rangs' }: { pixels: Pixel[]; largeur: number; hauteur: number; id: string; className: string; mode?: 'rangs' | 'cases' }) {
  // Cases : l'ordre d'allumage part du coin bas-droit (le soleil) et s'étend, avec un léger désordre stable.
  const ordre = (p: Pixel) => Math.round((largeur - p.x) / 24 + (hauteur - p.y) / 24 + ((p.x * 13 + p.y * 7) % 5) * 0.6)
  return (
    <svg className={className} viewBox={`0 0 ${largeur} ${hauteur}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2={largeur} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D97757" />
          <stop offset=".42" stopColor="#F5B301" />
          <stop offset=".7" stopColor="#EE8B3C" />
          <stop offset="1" stopColor="#D97757" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`}>
        {mode === 'cases'
          ? pixels.map((p) => <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width="24" height="24" opacity={p.o} style={{ '--i': ordre(p) } as CSSProperties} />)
          : parRangs(pixels).map((g) => (
            <g key={g.cle} className="lp3-rang" style={{ '--i': g.ordre } as CSSProperties}>
              {g.pixels.map((p) => <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width="24" height="24" opacity={p.o} />)}
            </g>
          ))}
      </g>
    </svg>
  )
}

const AUBE_HEROS = aube({ colonnes: 60, rangs: 9 })
const AUBE_FINAL = aube({ colonnes: 60, rangs: 6, largeurSoleil: 0.45, n: 711 })

/** Les couleurs des fonds, pour les marches de pixels entre sections (mêmes valeurs que landing-v2.css). */
const NUIT = '#09090C', IVOIRE = '#F3EEE5'

export default function LandingV2() {
  return (
    <div className={`lp lp3 ${serif.variable}`}>
      {donneesStructurees().map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSur(d) }} />)}
      <Motion />
      <a className="lp3-evitement" href="#contenu">Aller au contenu</a>
      <Entete />

      <main id="contenu">
        {/* 1 · HÉROS — une phrase de valeur, une sous-phrase, deux boutons, le produit au travail. */}
        <section className="lp3-heros" aria-labelledby="titre-heros">
          {/* Le fond du héros : une grille de points (n8n.io) où le pointeur allume une traînée de pixels (PixelTrail, 033-008). */}
          <div className="lp3-points" aria-hidden="true" />
          <PixelTrail className="lp3-trainee" couleur="#D97757" case={20} persistanceMs={600} />
          <div className="lp3-c lp3-heros-texte">
            {/* Deux lignes masquées : chacune monte derrière son masque, l'italique corail en dernier (CSS seul : rien n'attend le script). */}
            <h1 id="titre-heros" className="lp3-h1"><span className="lp3-ligne"><span>{HERO.h1Debut}</span></span> <em className="lp3-ligne"><span>{HERO.h1Fin}</span></em></h1>
            <p className="lp3-chapo">{HERO.sousPhrase}</p>
            <div className="lp3-boutons">
              <a className="lp3-btn lp3-btn--plein lp3-btn--grand" href="/signup">Essayer Presti</a>
              <a className="lp3-btn lp3-btn--contour lp3-btn--grand" href="#entreprise">Presti pour l’entreprise</a>
            </div>
            <p className="lp3-micro">{HERO.microcopie}</p>
          </div>
          <div className="lp3-scene">
            <Aube className="lp3-aube" pixels={AUBE_HEROS} largeur={1440} hauteur={216} id="aube-heros" />
            <div className="lp3-lueur" aria-hidden="true" />
            <div className="lp3-plateau">
              <div className="lp3-fenetre" role="img" aria-label={HERO.alt}>
                <span className="lp3-puce lp3-puce--flottante">Exemple</span>
                <div aria-hidden="true"><HeroApp /></div>
              </div>
              <figure className="lp3-tel-heros">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/demo/scene-2-390.webp" srcSet="/demo/scene-2-390.webp 390w, /demo/scene-2-520.webp 520w" sizes="230px" width={390} height={844}
                  alt="Exemple, capture du produit : côté client, la réponse arrive au nom de l’artisan." decoding="async" />
                <figcaption><span>Côté client : votre nom.</span></figcaption>
              </figure>
            </div>
          </div>
        </section>

        <PixelTransition de={NUIT} vers={IVOIRE} sens="descend" />

        {/* 2 · PROBLÈME — trois douleurs, puis la seule ligne chiffrée de la page, avec sa source. Section ivoire. Le mur se monte, rang
            par rang, à mesure qu'on lit (« le chantier, vous savez faire »). */}
        <section className="lp3-ivoire lp3-probleme" aria-labelledby="titre-probleme">
          <div className="lp3-c">
            <div className="lp3-probleme-tete">
              <header className="lp3-tete reveal">
                <h2 id="titre-probleme" className="lp3-h2"><Mots texte={PROBLEME.titre} /></h2>
                <p>{PROBLEME.sousPhrase}</p>
              </header>
              <PixelChantier scene="mur" mode="defilement" className="lp3-chantier lp3-chantier--mur" />
            </div>
            <ul className="lp3-douleurs reveal-kids">
              {PROBLEME.douleurs.map((d) => (
                <li key={d.titre}>
                  <span className="lp3-filet" aria-hidden="true" />
                  <span className="lp3-icone">{ICONES[d.icone]}</span>
                  <h3>{d.titre}</h3>
                  <p>{d.texte}</p>
                </li>
              ))}
            </ul>
            <figure className="lp3-chiffre reveal">
              <div className="lp3-chiffre-n" aria-hidden="true"><span className="count" data-to={PROBLEME.chiffre}>{PROBLEME.chiffre}</span><span>×</span></div>
              <blockquote><p>{PROBLEME.chiffreTexte}</p></blockquote>
              <figcaption>{PROBLEME.source}</figcaption>
            </figure>
          </div>
        </section>

        <PixelTransition de={IVOIRE} vers={NUIT} sens="monte" />

        {/* 3 · COMMENT ÇA MARCHE — trois temps, le texte de Benj, chacun avec sa capture du vrai produit ; puis « Une journée avec
            Presti », sept moments en diapositives épinglées. */}
        <section className="lp3-sombre lp3-comment" id="comment" aria-labelledby="titre-comment">
          <div className="lp3-c">
            <header className="lp3-tete lp3-tete--centre reveal">
              <h2 id="titre-comment" className="lp3-h2"><Mots texte={COMMENT.titre} /></h2>
              <p>{COMMENT.sousPhrase}</p>
            </header>
            <Etapes />
            <Journee />
          </div>
        </section>

        {/* 4 · FONCTIONNALITÉS — sept fonctions, dans l'ordre du travail : chacune expliquée, et montrée sur un vrai écran de Presti
            animé ; l'offre de chacune est lue dans lib/plans.ts. */}
        <section className="lp3-sombre lp3-fonctions" id="fonctionnalites" aria-labelledby="titre-fonctions">
          <div className="lp3-c">
            <header className="lp3-tete lp3-tete--centre reveal">
              <h2 id="titre-fonctions" className="lp3-h2"><Mots texte="Ce que Presti fait pour vous" /></h2>
              <p>Sept fonctions, dans l’ordre de votre travail. Chacune expliquée, et montrée sur un écran de Presti.</p>
            </header>
            <Demonstrations />
            <p className="lp3-suite lp3-suite--centre reveal"><a className="lp3-lien" href="/offres">Voir le détail des offres{ICONES.fleche}</a></p>
          </div>
        </section>

        <PixelTransition de={NUIT} vers={IVOIRE} sens="descend" />

        {/* 5 · POUR QUI — cinq profils ; les architectes et les entreprises vont vers « Presti pour l'entreprise ». Section ivoire. */}
        <section className="lp3-ivoire lp3-pourqui" id="pour-qui" aria-labelledby="titre-pourqui">
          <div className="lp3-c lp3-pourqui-in">
            <header className="lp3-tete reveal">
              <h2 id="titre-pourqui" className="lp3-h2 lp3-h2--geant"><Mots texte={POUR_QUI.titre} /></h2>
              <p>{POUR_QUI.sousPhrase}</p>
              <PixelChantier scene="outils" mode="boucle" className="lp3-chantier lp3-chantier--outils" />
            </header>
            <div>
              <ul className="lp3-profils reveal-kids">
                {POUR_QUI.profils.map((p) => (
                  <li key={p.nom}>
                    <h3>{p.nom}</h3>
                    <p>{p.detail}</p>
                    {p.entreprise ? <a className="lp3-vers" href="#entreprise" aria-label={`${p.nom} : voir Presti pour l’entreprise`}>Entreprise{ICONES.fleche}</a> : null}
                  </li>
                ))}
              </ul>
              <div className="lp3-boutons lp3-boutons--gauche reveal">
                <a className="lp3-btn lp3-btn--plein" href="/signup">Essayer Presti</a>
                <a className="lp3-lien" href="#entreprise">Voir Presti pour l’entreprise{ICONES.fleche}</a>
              </div>
            </div>
          </div>
        </section>

        <PixelTransition de={IVOIRE} vers={NUIT} sens="monte" />

        {/* 6 · PRESTI POUR L'ENTREPRISE — le texte de Benj mot pour mot, sans prix, un bouton à contour vers /contact. */}
        <section className="lp3-sombre lp3-entreprise" id="entreprise" aria-labelledby="titre-entreprise">
          <div className="lp3-c">
            <div className="lp3-panneau reveal">
              {/* La maison se construit dans le panneau : on intègre Presti à votre organisation, pièce par pièce. */}
              <div className="lp3-chantier--maison" aria-hidden="true"><PixelChantier scene="maison" mode="boucle" /></div>
              <div className="lp3-panneau-texte">
                <h2 id="titre-entreprise" className="lp3-h2"><Mots texte={ENTREPRISE.titre} /></h2>
                <p className="lp3-panneau-question">{ENTREPRISE.question}</p>
                <p className="lp3-panneau-reponse">{ENTREPRISE.reponse}</p>
                <div className="lp3-boutons lp3-boutons--gauche">
                  <a className="lp3-btn lp3-btn--contour lp3-btn--grand" href={ENTREPRISE.lien}>Demander une démo</a>
                </div>
                <p className="lp3-micro lp3-micro--gauche">{ENTREPRISE.microcopie}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 7 · APPEL FINAL — « Créer mon compte » et « Demander une démo entreprise », puis la FAQ courte (AEO, reprise par FAQPage). */}
        <section className="lp3-sombre lp3-final" aria-labelledby="titre-final">
          <div className="lp3-c">
            <div className="lp3-bandeau reveal">
              <span className="lp3-bandeau-souffle" aria-hidden="true" />
              <Aube className="lp3-bandeau-pixels" pixels={AUBE_FINAL} largeur={1440} hauteur={144} id="aube-final" />
              <h2 id="titre-final" className="lp3-h2"><Mots texte={FINAL.titre} /></h2>
              <p>{FINAL.sousPhrase}</p>
              <div className="lp3-boutons">
                <a className="lp3-btn lp3-btn--encre lp3-btn--grand" href="/signup">Créer mon compte</a>
                <a className="lp3-btn lp3-btn--contour-encre lp3-btn--grand" href={ENTREPRISE.lien}>Demander une démo entreprise</a>
              </div>
              <p className="lp3-micro">{HERO.microcopie}</p>
            </div>

            <div className="lp3-faq" id="questions">
              <h2 id="titre-questions" className="lp3-h3 reveal">Questions fréquentes</h2>
              <div className="lp3-faq-liste">
                {FAQ_ACCUEIL.map((f) => (
                  <details key={f.question} className="lp3-question">
                    <summary>{f.question}<span className="lp3-plus" aria-hidden="true" /></summary>
                    <p>{f.reponse}{f.lien ? <> <a className="lp3-lien" href={f.lien.href}>{f.lien.texte}</a></> : null}</p>
                  </details>
                ))}
              </div>
              <p className="lp3-suite"><a className="lp3-lien" href="/faq">Toutes les questions{ICONES.fleche}</a></p>
            </div>
          </div>
        </section>
      </main>

      <Pied />
    </div>
  )
}
