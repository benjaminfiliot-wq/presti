'use client'

import { useEffect, useRef, useState } from 'react'

// « Comment ça marche » en vidéo : l'assistant de gestion qui AGIT et le CRM (carte Atelier), offre Signature. Ce sont de vraies
// captures de l'interface (Playwright, scripts/demo-gestion-videos.mjs), sans son, courtes, en boucle, légères (< 3 Mo chacune).
// - preload="metadata" + affiche : rien de lourd au chargement de la page ;
// - la vidéo ne joue que visible (IntersectionObserver) et se met en pause hors écran ;
// - prefers-reduced-motion : pas de lecture automatique, l'affiche reste et un bouton lance la lecture si on le veut.
// Aucune photo du portfolio de démonstration (CC BY-SA) n'apparaît dans ces captures : le compte de test n'en a aucune.

type Clip = { id: string; src: string; affiche: string; titre: string; texte: string; note: string; alt: string }

const CLIPS: Clip[] = [
  {
    id: 'assistant',
    src: '/demo/assistant-devis.mp4',
    affiche: '/demo/assistant-devis-affiche.webp',
    titre: 'L’assistant qui fait le devis pour vous',
    texte: 'Vous tapez : « Fais le devis de Mme Martin pour 12 m² de carrelage ». L’assistant va chercher vos tarifs, prépare le brouillon, et vous l’ouvrez pour le relire. Tout ce qui part chez un client attend votre clic « Confirmer ».',
    note: 'Offre Signature. Capture réelle de l’interface, sans son ; l’attente de l’assistant est accélérée.',
    alt: 'Capture animée de l’assistant de gestion : la commande « Fais le devis de Mme Martin pour 12 m² de carrelage » est tapée, l’assistant consulte les tarifs puis propose le brouillon du devis.',
  },
  {
    id: 'crm',
    src: '/demo/crm-atelier.mp4',
    affiche: '/demo/crm-atelier-affiche.webp',
    titre: 'La carte Atelier du CRM',
    texte: 'Vos chantiers, votre équipe et vos alertes (retards, livraisons, stock bas) sur une seule carte, mise à jour en temps réel. Vous ouvrez un chantier : tâches, matériaux réservés, équipe.',
    note: 'Offre Signature. Capture réelle de l’interface sur des données d’exemple fictives.',
    alt: 'Capture animée du CRM : la carte Atelier avec les chantiers et l’équipe, puis l’ouverture de la fiche d’un chantier.',
  },
]

function Lecteur({ c }: { c: Clip }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  const [reduit, setReduit] = useState(false)
  const [monte, setMonte] = useState(false)
  const [lecture, setLecture] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduit(mq.matches); setMonte(true)
    const f = () => setReduit(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])

  // Lecture automatique seulement visible et sans demande de moins de mouvement.
  useEffect(() => {
    const v = ref.current
    if (!v || reduit || !monte) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause() }, { threshold: 0.4 })
    io.observe(v)
    return () => io.disconnect()
  }, [reduit, monte])

  const lancer = () => { const v = ref.current; if (!v) return; setLecture(true); v.currentTime = 0; v.play().catch(() => {}) }

  return (
    <figure className="dg-carte" data-clip={c.id}>
      <div className="dg-cadre">
        <video ref={ref} src={c.src} poster={c.affiche} muted loop playsInline preload="metadata" autoPlay={monte && !reduit}
          controls={reduit && lecture} aria-label={c.alt} width={1280} height={800} />
        {reduit && !lecture ? <button type="button" className="dg-lire" onClick={lancer} aria-label={`Lire la vidéo : ${c.titre}`}>Lire la vidéo</button> : null}
      </div>
      <figcaption>
        <h3>{c.titre}</h3>
        <p>{c.texte}</p>
        <p className="dg-note">{c.note}</p>
      </figcaption>
    </figure>
  )
}

export default function DemoGestion() {
  return (
    <div className="dg reveal" id="gestion">
      <div className="lp-head2 c"><span className="lp-kick">Offre Signature</span><h2>L’assistant qui agit, le CRM qui voit tout.</h2><p>Deux captures de l’écran réel, rognées : une commande tapée en une phrase, et l’atelier sur une carte.</p></div>
      <div className="dg-grille">{CLIPS.map((c) => <Lecteur key={c.id} c={c} />)}</div>
    </div>
  )
}
