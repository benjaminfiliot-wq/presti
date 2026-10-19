'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import Comparatif from '@/app/Comparatif'
import OffreDetail from '@/app/OffreDetail'
import { OFFRES, PLANS, ESSAI_JOURS } from '@/lib/plans'
import { estNatif } from '@/lib/natif'
import { SITE_A_LA_DEMANDE } from '@/lib/siteCommande'
import { actif } from '@/lib/flags'
import ChargementConsole from '@/components/ui/ChargementConsole' // refonte 18/10 (5.4) : squelette en console v2

// Abonnement — tout vient de la matrice de lib/plans.ts (v5 §3). Avant, cette page portait
// sa propre liste de fonctionnalités, différente de la landing et des verrous serveur.

const NOTE_NATIF = 'Dans l’application, votre formule se consulte ; sa gestion n’est pas disponible ici.'

export default function Abonnement() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [plan, setPlan] = useState('gratuit')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  // Droit à l'essai gratuit sans carte (GET /api/subscribe) : « jours gratuits, sans carte » ne s'écrit que si c'est vrai pour CE compte.
  const [essai, setEssai] = useState(false)
  // Venu de « s'abonner directement » (/abonnement?offre=studio) : cette offre est mise en avant.
  const [voulue, setVoulue] = useState<string | null>(null)
  useEffect(() => { const o = new URLSearchParams(window.location.search).get('offre'); setVoulue(o === 'essentiel' || o === 'studio' || o === 'signature' ? o : null) }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const { data: a } = await supabase.from('artisans').select('plan').eq('id', data.session.user.id).maybeSingle()
      if (!a) { router.replace('/onboarding'); return }
      setPlan(a.plan ?? 'gratuit'); setReady(true)
      fetch('/api/subscribe', { headers: { Authorization: `Bearer ${data.session.access_token}` } }).then((r) => r.json()).then((d) => setEssai(!!d?.essai?.disponible)).catch(() => {})
    })
  }, [router])

  async function souscrire(id: string, mode: 'essai' | 'payer' = 'essai') {
    setBusy(id); setMsg(null)
    const { data } = await supabase.auth.getSession()
    const res = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ plan: id, mode }) })
    const d = await res.json().catch(() => ({}))
    if (res.status === 409 && d.portail) {
      // Déjà abonné : on l'emmène directement changer d'offre dans son portail de facturation.
      const p = await fetch('/api/stripe/portail', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token}` } })
      const pd = await p.json().catch(() => ({}))
      if (p.ok && pd.url) { window.location.href = pd.url as string; return }
      setBusy(null); setMsg(d.error || 'Vous êtes déjà abonné.'); return
    }
    if (!res.ok || !d.url) { setBusy(null); setMsg(d.error || 'Abonnement indisponible.'); return }
    window.location.href = d.url as string
  }

  const actuel = PLANS[plan as keyof typeof PLANS]
  // La coque (stores) : l'achat ne passe ni par Stripe ni par un renvoi vers le site — la formule se consulte, point.
  const natif = estNatif()

  return (
    <AppShell active="abonnement" title="Abonnement" crumb="Votre formule">
      {!ready ? <ChargementConsole /> : natif ? (
        <div className="tool-card" data-abonnement-natif>
          <h2>Votre formule</h2>
          <p className="muted" style={{ margin: 0 }}>
            Vous êtes en <b>{actuel?.label ?? 'Essai'}</b>{actuel?.creditsMois ? <> — {actuel.creditsMois} crédits chaque mois</> : null}. {NOTE_NATIF}
          </p>
        </div>
      ) : (
        <>
          {msg && <div className="msg err" style={{ marginTop: 0 }}>{msg}</div>}
          <p className="muted" style={{ margin: '0 0 1.3rem', maxWidth: '58ch' }}>
            Vous êtes en <b>{actuel?.label ?? 'Essai'}</b>{actuel?.creditsMois ? <> — {actuel.creditsMois} crédits chaque mois</> : null}.
            Chaque formule donne des crédits mensuels (1 crédit = 1 génération IA, le modèle Expert en consomme 3). Sans engagement.
            {essai ? <> Premier abonnement : essai gratuit, sans carte ({ESSAI_JOURS.essentiel} jours en Essentiel, {ESSAI_JOURS.studio} en Studio, {ESSAI_JOURS.signature} en Signature). Les crédits de l’essai sont proportionnels à sa durée. Sans carte à la fin de l’essai, rien n’est prélevé : vous repassez à l’offre d’Essai.</> : null}
          </p>

          <div className="abo-grid">
            {OFFRES.map((o) => {
              // Mis en avant : la formule en cours ; sans abonnement, Studio comme avant.
              const abonne = OFFRES.some((x) => x.id === plan)
              const current = plan === o.id
              return (
                <div key={o.id} className={`abo-card${current ? ' feat actuelle' : (voulue ? voulue === o.id : !abonne && o.id === 'studio') ? ' feat' : ''}`} aria-current={current ? 'true' : undefined}>
                  {current && <span className="abo-tag">Votre formule</span>}
                  <div className="abo-name">{o.label}</div>
                  <div className="abo-price">{o.prix}€<small>/mois</small></div>
                  <div className="abo-credits">{o.credits} crédits / mois</div>
                  {essai && !current ? <div className="abo-essai" data-essai-gratuit={o.id}><b>{ESSAI_JOURS[o.id]} jours gratuits, sans carte</b></div> : null}
                  <div className="abo-tva">TVA non applicable, art. 293 B du CGI</div>
                  <div className="abo-for">{o.accroche}</div>
                  <OffreDetail id={o.id} classe="abo-list" />
                  {current
                    ? <button className="psh-btn ghost" disabled>Formule actuelle</button>
                    : essai
                      // Les DEUX choix, côte à côte (Benj, 16/10) : les semaines gratuites sans carte, ou payer tout de suite.
                      ? <div className="abo-choix" data-abo-choix={o.id}>
                          <button className={`psh-btn ${o.id === 'studio' ? 'primary' : 'ghost'}`} data-abo-essai={o.id} disabled={busy === o.id} onClick={() => souscrire(o.id, 'essai')}>{busy === o.id ? 'Redirection…' : `Essayer ${ESSAI_JOURS[o.id]} jours gratuits`}</button>
                          <button className="psh-btn ghost" data-abo-payer={o.id} disabled={busy === o.id} onClick={() => souscrire(o.id, 'payer')}>{`Payer maintenant — ${o.prix} €/mois`}</button>
                        </div>
                      : <button className={`psh-btn ${o.id === 'studio' ? 'primary' : 'ghost'}`} data-abo-payer={o.id} disabled={busy === o.id} onClick={() => souscrire(o.id, 'payer')}>{busy === o.id ? 'Redirection…' : `S’abonner à ${o.label}`}</button>}
                </div>
              )
            })}
          </div>

          <h2 style={{ margin: '2rem 0 .8rem' }}>Qui a quoi, ligne par ligne</h2>
          <Comparatif actuel={plan} />

          {actif('siteCommandeVente') && (
            <div className="tool-card" style={{ marginTop: '2rem' }}>
              <h2>{SITE_A_LA_DEMANDE.titre}</h2>
              {SITE_A_LA_DEMANDE.phrases.map((p, i) => (
                <p key={i} className="muted" style={{ margin: '.5rem 0' }}>{p}</p>
              ))}
              <div style={{ marginTop: '1rem' }}>
                <a className="psh-btn primary" href={SITE_A_LA_DEMANDE.lien} style={{ display: 'inline-block', width: 'auto' }}>{SITE_A_LA_DEMANDE.bouton}</a>
              </div>
            </div>
          )}

          <p className="muted" style={{ marginTop: '1.4rem', fontSize: '.85rem' }}>Paiement sécurisé par Stripe. Vous pouvez résilier à tout moment.</p>
        </>
      )}
    </AppShell>
  )
}
