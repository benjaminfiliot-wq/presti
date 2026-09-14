'use client'

import { useEffect, useRef, useState } from 'react'
import { PRIX_SITE_TEXTE } from '@/lib/siteCommande'

// v16 §3.4 — « Et le site qui va avec » : la capture animée de LA démo (Atelier Lestraque, menuisier-agenceur fictif),
// produite par scripts/demo-video.mjs et passée au juge vidéo, et le lien vers le site réel servi depuis
// public/sites-demo/lestraque/. Le bloc montre, il ne vend pas : pas de bouton de commande (drapeau siteCommandeVente).
// La vidéo ne joue que visible, jamais en mouvement réduit (l'affiche reste), et le lien vise index.html : servie par
// Next depuis public/, une démo sans « index.html » perd son dossier et arrive sans styles.

const DEMO = '/sites-demo/lestraque/index.html'

export default function DemoSite() {
  const [reduit, setReduit] = useState(false)
  const ref = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduit(mq.matches)
    const surChange = () => setReduit(mq.matches)
    mq.addEventListener('change', surChange)
    return () => mq.removeEventListener('change', surChange)
  }, [])

  useEffect(() => {
    const v = ref.current
    if (!v || reduit) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause() }, { threshold: 0.35 })
    io.observe(v)
    return () => io.disconnect()
  }, [reduit])

  return (
    <div className="ds reveal">
      <div className="lp-head2 c"><span className="lp-kick">Et le site qui va avec</span><h2>Un site qui donne envie d&apos;appeler.</h2><p>Un artisan fictif, un vrai site : titre qui entre, lumière sur la matière, réalisations qui se dévoilent — et le téléphone qui tient la route en 4G.</p></div>
      <a className="ds-cadre" href={DEMO} target="_blank" rel="noopener" aria-label="Ouvrir le site de démonstration Atelier Lestraque dans un nouvel onglet">
        {reduit
          ? <img src="/promo/demo-site/lestraque-affiche.webp" alt="Le site de démonstration Atelier Lestraque : un rabot sur une planche, le titre « Menuisier à Rennes »" width={1280} height={720} loading="lazy" />
          : <video ref={ref} src="/promo/demo-site/lestraque.mp4" poster="/promo/demo-site/lestraque-affiche.webp" muted loop playsInline preload="none" width={1280} height={720}
              aria-label="Capture animée du site de démonstration Atelier Lestraque : l'accueil, les réalisations, l'atelier, les questions, sur ordinateur et sur téléphone" />}
      </a>
      <p className="ds-credits">Photos de la démo : Wikimedia Commons, sous licences libres — <a href="/sites-demo/lestraque/mentions-legales/index.html#credits" target="_blank" rel="noopener">auteurs et licences</a></p>
      <p className="ds-lien"><a href={DEMO} target="_blank" rel="noopener">Voir le site de démonstration</a></p>
      <p className="ds-prix">Le site, à la demande — {PRIX_SITE_TEXTE}, une fois.</p>
    </div>
  )
}
