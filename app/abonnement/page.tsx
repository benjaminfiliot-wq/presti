'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import { OFFRES } from '@/lib/plans'

const CONTENT: Record<string, { for: string; feats: string[] }> = {
  essentiel: { for: 'Pour ne plus louper une demande.', feats: ['Réponse instantanée dans votre ton', 'Devis IA (crédits inclus)', 'Relances automatiques', 'Modèles Standard & Pro'] },
  studio: { for: 'Présence en ligne + toute la puissance.', feats: ['Tout l’Essentiel', 'Tous les modèles (Expert)', 'Plus de crédits', 'Site web pro · bientôt'] },
  signature: { for: 'Pour l’atelier à plein régime.', feats: ['Tout Studio', 'Crédits élevés', 'Plusieurs métiers', 'Accompagnement dédié'] },
}

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
    if (!res.ok || !d.url) { setBusy(null); setMsg(d.error || 'Abonnement indisponible.'); return }
    window.location.href = d.url as string
  }

  return (
    <AppShell active="abonnement" title="Abonnement" crumb="Votre formule">
      {!ready ? <p className="muted">Chargement…</p> : (
        <>
          {msg && <div className="msg err" style={{ marginTop: 0 }}>{msg}</div>}
          <p className="muted" style={{ margin: '0 0 1.3rem', maxWidth: '54ch' }}>Chaque formule vous donne des crédits chaque mois (1 crédit = 1 génération IA, le modèle Expert en consomme 3). Rechargés au renouvellement, sans engagement.</p>
          <div className="abo-grid">
            {OFFRES.map((o) => {
              const c = CONTENT[o.id]
              const current = plan === o.id
              return (
                <div key={o.id} className={`abo-card${o.id === 'studio' ? ' feat' : ''}`}>
                  {o.id === 'studio' && <span className="abo-tag">Le plus choisi</span>}
                  <div className="abo-name">{o.label}</div>
                  <div className="abo-price">{o.prix}€<small>/mois</small></div>
                  <div className="abo-credits">{o.credits} crédits / mois</div>
                  <div className="abo-for">{c.for}</div>
                  <ul className="abo-list">{c.feats.map((f) => <li key={f}>{f}</li>)}</ul>
                  {current
                    ? <button className="psh-btn ghost" disabled>Formule actuelle</button>
                    : <button className={`psh-btn ${o.id === 'studio' ? 'primary' : 'ghost'}`} disabled={busy === o.id} onClick={() => souscrire(o.id)}>{busy === o.id ? 'Redirection…' : `S’abonner à ${o.label}`}</button>}
                </div>
              )
            })}
          </div>
          <p className="muted" style={{ marginTop: '1.4rem', fontSize: '.85rem' }}>Paiement sécurisé par Stripe. Vous pouvez résilier à tout moment.</p>
        </>
      )}
    </AppShell>
  )
}
