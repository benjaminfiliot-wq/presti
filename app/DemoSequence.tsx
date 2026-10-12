'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { actif } from '@/lib/flags'
import { PRIX_SITE_TEXTE } from '@/lib/siteCommande'

// La démo de la landing (v5 §5) : pas un catalogue, UN scénario — « Une demande arrive »,
// en cinq scènes enchaînées. Chaque scène est une CAPTURE DU VRAI PRODUIT (Playwright, sur le
// code de production, compte de démonstration détruit ensuite — scripts/demo-captures.mjs) :
// ce qui est montré existe. Rien n'est dessiné à la main.
//
// Défilement automatique (4,8 s par scène), pause au survol/focus, flèches et points
// cliquables, clavier. prefers-reduced-motion : pas de défilement automatique, transitions
// instantanées — l'histoire se lit à son rythme.

type Scene = {
  heure: string
  titre: string
  texte: string
  appareil: 'telephone' | 'ordinateur'
  image: string
  /** Point d'intérêt pour le cadrage (object-position). */
  focus?: string
}

const TOUTES_SCENES: Scene[] = [
  { heure: '22 h 14', titre: 'Un client écrit sur votre page', texte: 'Sur son téléphone, depuis votre lien. Il décrit ce qu’il veut, avec ses mots.', appareil: 'telephone', image: '/demo/scene-1.webp', focus: '50% 100%' },
  { heure: '22 h 14', titre: 'L’assistant répond seul (formule Studio)', texte: 'Avec Studio, l’assistant peut répondre seul, jour et nuit.', appareil: 'telephone', image: '/demo/scene-2.webp', focus: '50% 100%' },
  { heure: '7 h 50', titre: 'Vous ouvrez votre espace', texte: 'La demande est qualifiée. D’un clic, le devis se chiffre sur vos prix, chaque ligne avec sa provenance. Avec Signature, une règle d’automatisation l’a déjà préparé.', appareil: 'ordinateur', image: '/demo/scene-3.webp', focus: '50% 0%' },
  { heure: '7 h 52', titre: 'Vous validez, le client accepte', texte: 'Le devis part dans la conversation. Il l’accepte sur son téléphone : acceptation horodatée, conservée avec l’échange.', appareil: 'telephone', image: '/demo/scene-4.webp', focus: '50% 100%' },
  // Relecture du 25/09 : le constructeur est fermé et le site ne se vend pas encore (siteCommandeVente) ; montrer ce
  // site comme « capture du produit réel » promettait ce qu'un nouvel inscrit ne peut pas obtenir. Il revient avec la vente.
  { heure: 'Votre site', titre: 'Tout ça, à votre marque', texte: `En option, à part de l’abonnement (${PRIX_SITE_TEXTE}, une fois) : le site qui amène la demande porte votre nom, votre adresse, vos réalisations. Jamais le nôtre.`, appareil: 'ordinateur', image: '/demo/scene-5.webp', focus: '50% 0%' },
]
const SCENES = TOUTES_SCENES.filter((s) => s.image !== '/demo/scene-5.webp' || actif('siteCommandeVente'))

const DUREE = 4800

export default function DemoSequence() {
  const [i, setI] = useState(0)
  const [pause, setPause] = useState(false)
  // Pause VOULUE (bouton, WCAG 2.2.2) : distincte du survol — sur tactile il n'y a pas de survol (audit final, G-1.1).
  const [pauseManuel, setPauseManuel] = useState(false)
  const enPause = pause || pauseManuel
  const [reduit, setReduit] = useState(false)
  const [cle, setCle] = useState(0) // relance l'animation de la barre de progression
  const conteneur = useRef<HTMLDivElement>(null)
  // Identifiants stables serveur/client : le motif « onglets » ARIA n'a de sens que si chaque
  // onglet DÉSIGNE son panneau (aria-controls) et si le panneau dit de quel onglet il vient
  // (aria-labelledby). Sans ça un lecteur d'écran annonce « onglet 2 sur 5 » sans rien relier.
  const uid = useId()
  const idPanneau = `${uid}-panneau`

  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    setReduit(mq.matches)
    const f = () => setReduit(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])

  // Défilement automatique — seulement quand la démo est visible, non survolée, et que
  // l'utilisateur n'a pas demandé moins de mouvement.
  useEffect(() => {
    if (reduit || enPause) return
    const el = conteneur.current
    let visible = true
    const io = 'IntersectionObserver' in window && el ? new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true }, { threshold: 0.3 }) : null
    if (io && el) io.observe(el)
    const t = setInterval(() => { if (visible) { setI((x) => (x + 1) % SCENES.length); setCle((k) => k + 1) } }, DUREE)
    return () => { clearInterval(t); io?.disconnect() }
  }, [reduit, enPause])

  const aller = (n: number) => { setI(((n % SCENES.length) + SCENES.length) % SCENES.length); setCle((k) => k + 1) }
  const s = SCENES[i]

  return (
    <div className={`dm${reduit ? ' dm-reduit' : ''}`} ref={conteneur}
      onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)} onFocus={() => setPause(true)} onBlur={() => setPause(false)}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') aller(i + 1); if (e.key === 'ArrowLeft') aller(i - 1) }}
      role="region" aria-roledescription="démonstration" aria-label={`Une demande arrive : le parcours en ${SCENES.length} scènes`}>

      <div className="dm-scene">
        <div className={`dm-device dm-${s.appareil}`} aria-hidden="true">
          {SCENES.map((sc, k) => (k === i || k === (i + 1) % SCENES.length) && (
            // Seules la scène active et la suivante sont montées : sur téléphone, les cinq PNG empilés
            // pesaient 2,4 Mo au chargement (audit final, C1) — `loading="lazy"` ne protège pas des
            // images superposées dans le viewport. La suivante est déjà là → transition sans flash.
            // eslint-disable-next-line @next/next/no-img-element
            <img key={sc.image} src={sc.image} srcSet={`${sc.image.replace(/\.webp$/, '-390.webp')} 390w, ${sc.image.replace(/\.webp$/, '-520.webp')} 520w, ${sc.image} 780w`} sizes="(max-width:760px) 62vw, 380px" alt="" className={k === i ? 'on' : ''} style={{ objectPosition: sc.focus }} loading={k === 0 ? 'eager' : 'lazy'} decoding="async" />
          ))}
        </div>

        <div className="dm-txt">
          {/* Le panneau de l'onglet actif. L'heure n'est PLUS une région live : elle était relue
              toutes les 4,8 s (« 22 h 14 », « 7 h 02 »…) sans le titre de la scène — du bruit, pas
              de l'information. Le changement de scène est déjà porté par `aria-selected`. */}
          <div className="dm-panneau" id={idPanneau} role="tabpanel" aria-labelledby={`${uid}-onglet-${i}`}>
            <span className="dm-heure">{s.heure}</span>
            <h3 key={`t${i}`}>{s.titre}</h3>
            <p key={`p${i}`}>{s.texte}</p>
          </div>
          <div className="dm-nav">
            <button type="button" className="dm-fleche" onClick={() => aller(i - 1)} aria-label="Scène précédente">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <div className="dm-points" role="tablist" aria-label="Scènes">
              {SCENES.map((sc, k) => (
                <button key={sc.image} type="button" role="tab" id={`${uid}-onglet-${k}`} aria-controls={idPanneau} aria-selected={k === i} aria-label={`Scène ${k + 1} : ${sc.titre}`} className={k === i ? 'on' : ''} onClick={() => aller(k)}>
                  {k === i && !reduit && !enPause ? <span key={cle} className="dm-prog" style={{ animationDuration: `${DUREE}ms` }} /> : null}
                </button>
              ))}
            </div>
            <button type="button" className="dm-fleche dm-pause" onClick={() => setPauseManuel((p) => !p)} aria-pressed={pauseManuel} aria-label={pauseManuel ? 'Reprendre le défilement automatique' : 'Mettre en pause le défilement automatique'}>
              {pauseManuel
                ? <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                : <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>}
            </button>
            <button type="button" className="dm-fleche" onClick={() => aller(i + 1)} aria-label="Scène suivante">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
          <small className="dm-note">Captures du produit réel : rien n’est dessiné.</small>
        </div>
      </div>
    </div>
  )
}
