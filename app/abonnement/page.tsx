'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import Comparatif from '@/app/Comparatif'
import { OFFRES, PLANS, pointsForts } from '@/lib/plans'

// Abonnement — tout vient de la matrice de lib/plans.ts (v5 §3). Avant, cette page portait
// sa propre liste de fonctionnalités, différente de la landing et des verrous serveur.

export default function Abonnement() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [plan, setPlan] = useState('gratuit')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const { data: a } = await supabase.from('artisans').select('plan').eq('id', data.session.user.id).maybeSingle()
      if (!a) { router.replace('/onboarding'); return }
      setPlan(a.plan ?? 'gratuit'); setReady(true)
    })
  }, [router])

  async function souscrire(id: string) {
    setBusy(id); setMsg(null)
    const { data } = await supabase.auth.getSession()
    const res = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ plan: id }) })
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

  return (
    <AppShell active="abonnement" title="Abonnement" crumb="Votre formule">
      {!ready ? <p className="muted">Chargement…</p> : (
        <>
          {msg && <div className="msg err" style={{ marginTop: 0 }}>{msg}</div>}
          <p className="muted" style={{ margin: '0 0 1.3rem', maxWidth: '58ch' }}>
            Vous êtes en <b>{actuel?.label ?? 'Essai'}</b>{actuel?.creditsMois ? <> — {actuel.creditsMois} crédits chaque mois</> : null}.
            Chaque formule donne des crédits mensuels (1 crédit = 1 génération IA, le modèle Expert en consomme 3). Sans engagement.
          </p>

          <div className="abo-grid">
            {OFFRES.map((o) => {
              const current = plan === o.id
              return (
                <div key={o.id} className={`abo-card${o.id === 'studio' ? ' feat' : ''}`}>
                  <div className="abo-name">{o.label}</div>
                  <div className="abo-price">{o.prix}€<small>/mois</small></div>
                  <div className="abo-credits">{o.credits} crédits / mois</div>
                  <div className="abo-tva">TVA non applicable, art. 293 B du CGI</div>
                  <div className="abo-for">{o.accroche}</div>
                  <ul className="abo-list">{pointsForts(o.id).slice(0, 6).map((f) => <li key={f}>{f}</li>)}</ul>
                  {current
                    ? <button className="psh-btn ghost" disabled>Formule actuelle</button>
                    : <button className={`psh-btn ${o.id === 'studio' ? 'primary' : 'ghost'}`} disabled={busy === o.id} onClick={() => souscrire(o.id)}>{busy === o.id ? 'Redirection…' : `S’abonner à ${o.label}`}</button>}
                </div>
              )
            })}
          </div>

          <h2 style={{ margin: '2rem 0 .8rem' }}>Qui a quoi, ligne par ligne</h2>
          <Comparatif actuel={plan} />

          <p className="muted" style={{ marginTop: '1.4rem', fontSize: '.85rem' }}>Paiement sécurisé par Stripe. Vous pouvez résilier à tout moment.</p>
        </>
      )}
    </AppShell>
  )
}
