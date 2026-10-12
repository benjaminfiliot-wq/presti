'use client'

import { useEffect, useRef, useState } from 'react'
import { PRIX_SITE_TEXTE } from '@/lib/siteCommande'

// v16 §3.4 — « Et le site qui va avec » : la capture animée de LA démo (Atelier Lestraque, menuisier-agenceur fictif),
// produite par scripts/demo-video.mjs et passée au juge vidéo, et le lien vers le site réel servi depuis
// public/sites-demo/lestraque/. Le bloc montre, il ne vend pas : pas de bouton de commande (drapeau siteCommandeVente).
// La vidéo ne joue que visible, jamais en mouvement réduit (l'affiche reste), et le lien vise index.html : servie par
// Next depuis public/, une démo sans « index.html » perd son dossier et arrive sans styles.

const DEMO = '/sites-demo/lestraque/index.html'
// L'affiche (53 Ko, 1280 × 720) : un attribut poster se télécharge dès le chargement de la page, alors que le bloc est à
// plusieurs écrans du haut. Mesuré le 06/10 en production (Lighthouse mobile) : elle partait avec les polices, en concurrence
// avec la peinture du haut de page. Elle n'est donc posée qu'à l'approche du bloc (800 px avant qu'il entre à l'écran).
const AFFICHE = '/promo/demo-site/lestraque-affiche.webp'

export default function DemoSite() {
  const [reduit, setReduit] = useState(false)
  const [proche, setProche] = useState(false)
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
    if (!v || reduit || proche) return
    if (!('IntersectionObserver' in window)) { setProche(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setProche(true); io.disconnect() } }, { rootMargin: '800px 0px' })
    io.observe(v)
    return () => io.disconnect()
  }, [reduit, proche])

  useEffect(() => {
    const v = ref.current
    if (!v || reduit) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause() }, { threshold: 0.35 })
    io.observe(v)
    return () => io.disconnect()
  }, [reduit])

  return (
    <div className="ds reveal">
      <div className="lp-head2 c"><span className="lp-kick">En option : le site</span><h2>Un site qui donne envie d&apos;appeler.</h2><p>Un artisan fictif, un vrai site : l&apos;escalier ouvre la visite, puis l&apos;atelier, les pièces livrées et le devis se découvrent au fil de la page.</p></div>
      <a className="ds-cadre" href={DEMO} target="_blank" rel="noopener" aria-label="Ouvrir le site de démonstration Atelier Lestraque dans un nouvel onglet">
        {reduit
          ? <img src={AFFICHE} alt="Le site de démonstration Atelier Lestraque : un escalier en bois en plein cadre sous le titre « Fait pour rester »" width={1280} height={720} loading="lazy" />
          : <video ref={ref} src="/promo/demo-site/lestraque.mp4" poster={proche ? AFFICHE : undefined} muted loop playsInline preload="none" width={1280} height={720}
              aria-label="Capture animée du site de démonstration Atelier Lestraque : la plongée dans l'escalier sous le titre « Fait pour rester », l'aperçu des prestations au survol, la vidéo de l'atelier, puis l'escalier qui s'éclate pièce par pièce en quatre temps jusqu'au devis" />}
      </a>
      <p className="ds-credits">Photos de la démo : Wikimedia Commons, sous licences libres ; vidéo d&apos;atelier : Mixkit — <a href="/sites-demo/lestraque/mentions-legales/index.html#credits" target="_blank" rel="noopener">auteurs et licences</a></p>
      <p className="ds-lien"><a href={DEMO} target="_blank" rel="noopener">Voir le site de démonstration</a></p>
      <p className="ds-prix">Le site, à la demande : {PRIX_SITE_TEXTE}, une fois.</p>
    </div>
  )
}
