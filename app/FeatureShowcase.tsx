'use client'

import { useEffect, useRef, useState } from 'react'

/* Compteur animé (0 -> target) qui se relance à chaque montage. */
function useCount(target: number, dec = 0) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0, start = 0
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / 1500, 1)
      setV(target * (0.08 + 0.92 * p * (2 - p)))
      if (p < 1) raf = requestAnimationFrame(step); else setV(target)
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])
  return v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
const R = (d: number) => ({ animationDelay: `${d}s` } as React.CSSProperties)

/* ---- Démos (se jouent au montage) ---- */
function DevisDemo() {
  const total = useCount(873.4, 2)
  return (
    <div className="fs-doc">
      <span className="fs-scan" aria-hidden="true" />
      <div className="fs-doc-h fsr" style={R(0)}>
        <div className="co">Dupont Plomberie<small>17230 Marans</small></div>
        <div className="ti"><b>DEVIS</b><small>DEV-2026-0042</small></div>
      </div>
      <div className="fs-doc-cli fsr" style={R(0.15)}>Client<br /><b>Marie Lefèvre — Rénovation salle d&apos;eau</b></div>
      <div className="fs-dl fsr" style={R(0.5)}><span>Dépose + pose chauffe-eau 200 L</span><span className="p">620,00 €</span></div>
      <div className="fs-dl fsr" style={R(0.85)}><span>Groupe de sécurité + raccords</span><span className="p">84,00 €</span></div>
      <div className="fs-dl fsr" style={R(1.2)}><span>Main-d&apos;œuvre (2 h)</span><span className="p">90,00 €</span></div>
      <div className="fs-doc-tot fsr" style={R(1.5)}><span>Total TTC</span><span className="p">{total} €</span></div>
      <div className="fs-badges">
        <span className="fs-bdg ok fsr" style={R(2.1)}>✓ PDF conforme</span>
        <span className="fs-bdg fsr" style={R(2.3)}>Mentions légales</span>
        <span className="fs-bdg fsr" style={R(2.5)}>Prêt à envoyer</span>
      </div>
    </div>
  )
}
function FactureDemo() {
  const total = useCount(873.4, 2)
  return (
    <div className="fs-doc">
      <span className="fs-scan" aria-hidden="true" />
      <div className="fs-doc-h fsr" style={R(0)}>
        <div className="co">Dupont Plomberie<small>17230 Marans</small></div>
        <div className="ti"><b>FACTURE</b><small>FAC-2026-0018</small></div>
      </div>
      <div className="fs-doc-cli fsr" style={R(0.15)}>Générée depuis le devis <b>DEV-2026-0042</b> — en un clic</div>
      <div className="fs-dl fsr" style={R(0.5)}><span>Dépose + pose chauffe-eau 200 L</span><span className="p">620,00 €</span></div>
      <div className="fs-dl fsr" style={R(0.85)}><span>Groupe de sécurité + raccords</span><span className="p">84,00 €</span></div>
      <div className="fs-dl fsr" style={R(1.2)}><span>Main-d&apos;œuvre (2 h)</span><span className="p">90,00 €</span></div>
      <div className="fs-doc-tot fsr" style={R(1.5)}><span>Total TTC</span><span className="p">{total} €</span></div>
      <div className="fs-doc-ech fsr" style={R(1.8)}><span>Échéance de paiement</span><b>27 sept. 2026</b></div>
      <div className="fs-badges">
        <span className="fs-bdg fsr" style={R(2.1)}>N° FAC- légal</span>
        <span className="fs-bdg fsr" style={R(2.3)}>Mentions pénalités</span>
      </div>
      <span className="fs-stamp" style={R(2.7)} aria-hidden="true">PAYÉE</span>
    </div>
  )
}
function RelancesDemo() {
  return (
    <div className="fs-rel">
      <div className="fs-relmsg fsr" style={R(0.1)}><div className="rt">Jour 0 · réponse envoyée</div><p>« Bonjour Marie, je vous rappelle dans la journée pour un passage. »</p></div>
      <div className="fs-relmsg fsr" style={R(0.7)}><div className="rt">Relance J+2</div><p>« Toujours intéressée ? Je tiens un créneau cette semaine. »</p></div>
      <div className="fs-relmsg fsr" style={R(1.3)}><div className="rt">Relance J+5</div><p>« Je vous renvoie le devis, valable encore 20 jours. »</p></div>
      <div className="fs-relmsg win fsr" style={R(1.9)}><div className="rt">✓ Client répond — relances stoppées</div><p>« C&apos;est bon pour moi, on démarre quand ? »</p></div>
    </div>
  )
}
function DashboardDemo() {
  const n = useCount(12)
  return (
    <div className="fs-dash">
      <div className="dh fsr" style={R(0)}>Vos demandes <b>· {n} ce mois</b></div>
      <div className="fs-drow fsr" style={R(0.35)}><div><div className="who">Marie Lefèvre</div><div className="m">Fuite sous l&apos;évier…</div></div><span className="fs-pill new">Nouveau</span></div>
      <div className="fs-drow fsr" style={R(0.7)}><div><div className="who">Karim B.</div><div className="m">Électricité T2…</div></div><span className="fs-pill ok">Répondu</span></div>
      <div className="fs-drow fsr" style={R(1.05)}><div><div className="who">Sophie D.</div><div className="m">Rénovation salle de bain…</div></div><span className="fs-pill ok">Gagné</span></div>
      <div className="fs-drow fsr" style={R(1.4)}><div><div className="who">Entreprise TP</div><div className="m">Devis carrelage…</div></div><span className="fs-pill wait">En attente</span></div>
    </div>
  )
}
function LienDemo() {
  return (
    <div className="fs-lien">
      <div className="fs-url fsr" style={R(0)}>prestiapp.fr / dupont-plomberie</div>
      <div className="fs-field fsr" style={R(0.4)}>Marie Lefèvre</div>
      <div className="fs-field fsr" style={R(0.75)}>Fuite sous l&apos;évier, vous passez cette semaine ?</div>
      <div className="fs-send fsr" style={R(1.2)}>Envoyer ma demande</div>
      <div className="fs-arrived fsr" style={R(1.9)}><span className="tick">✓</span> Demande reçue dans Presti — réponse partie en 41 s</div>
    </div>
  )
}
function ConversationDemo() {
  return (
    <div className="fs-conv">
      <div className="fs-conv-h fsr" style={R(0)}>
        <span className="fs-conv-ava">DP</span>
        <div className="fs-conv-id"><b>Dupont Plomberie</b><span className="fs-conv-live"><i />En ligne · répond en direct</span></div>
      </div>
      <div className="fs-cbub me fsr" style={R(0.35)}>Fuite sous l&apos;évier, ça goutte de plus en plus. Vous pouvez passer&nbsp;?</div>
      <div className="fs-cbub them fsr" style={R(0.95)}>Bonjour Marie, je vous rappelle dans l&apos;heure. En attendant, placez une bassine et coupez l&apos;arrivée d&apos;eau. Demain matin vous conviendrait&nbsp;?</div>
      <div className="fs-cbub me fsr" style={R(1.7)}>Parfait pour demain 9h. C&apos;est un mitigeur récent.</div>
      <div className="fs-cbub them fsr" style={R(2.3)}>Noté&nbsp;! Un joint usé, ça se règle vite. Je vous prépare un devis clair d&apos;ici là.</div>
      <div className="fs-conv-out fsr" style={R(3)}><span className="tick">✓</span> Conversation transformée en devis — en un clic</div>
    </div>
  )
}
const FEATURES = [
  { id: 'conversation', label: 'Conversation en direct', desc: 'Votre client discute sur votre page, l’IA lui répond dans la seconde — de façon humaine et juste. Vous reprenez la main quand vous voulez, et la conversation devient un devis en un clic.', Demo: ConversationDemo },
  { id: 'devis', label: 'Devis chiffré', desc: 'Décrivez le chantier : Presti détaille les postes, applique la bonne TVA et sort un PDF conforme.', Demo: DevisDemo },
  { id: 'facture', label: 'Facturation', desc: 'Le chantier est fait ? Le devis devient une facture en un clic — numéro légal, échéance et mentions de pénalités générés tout seuls.', Demo: FactureDemo },
  { id: 'relances', label: 'Relances auto', desc: 'Le client ne répond pas ? Presti relance à J+2, J+5, J+10 — et s’arrête dès qu’il répond.', Demo: RelancesDemo },
  { id: 'dashboard', label: 'Tableau de bord', desc: 'Toutes vos demandes au même endroit, avec leur statut. Plus rien ne se perd.', Demo: DashboardDemo },
  { id: 'lien', label: 'Lien de contact', desc: 'Un lien à vous à coller partout. Chaque demande arrive dans Presti, instantanément.', Demo: LienDemo },
] as const

export default function FeatureShowcase() {
  const [active, setActive] = useState(0)
  const [play, setPlay] = useState(0)
  const wrap = useRef<HTMLDivElement>(null)
  const seen = useRef(false)

  // auto-joue quand ça entre dans le viewport
  useEffect(() => {
    const el = wrap.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting && !seen.current) { seen.current = true; setPlay((p) => p + 1) }
    }), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const F = FEATURES[active]
  const select = (i: number) => { setActive(i); setPlay((p) => p + 1) }

  return (
    <div className="fs" ref={wrap}>
      <div className="fs-tabs" role="tablist">
        {FEATURES.map((f, i) => (
          <button key={f.id} role="tab" aria-selected={i === active} className={`fs-tab${i === active ? ' on' : ''}`} onClick={() => select(i)}>{f.label}</button>
        ))}
      </div>

      <div className="fs-stage" onClick={() => setPlay((p) => p + 1)} title="Cliquer pour rejouer">
        <span className="fs-beam" aria-hidden="true" />
        <div className="fs-play"><div className="fs-enter" key={`${active}-${play}`}><F.Demo /></div></div>
        <span className="fs-replay" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6" /><path d="M3 13a9 9 0 1 0 3-7.7L3 8" /></svg> rejouer</span>
      </div>

      <div className="fs-caption">
        <span className="fs-captag">{F.label}</span>
        <p key={active}>{F.desc}</p>
      </div>
    </div>
  )
}
