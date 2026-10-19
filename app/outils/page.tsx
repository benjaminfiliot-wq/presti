'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import ModelSelect from '@/app/ModelSelect'
import Info from '@/app/Info'
import type { Tier } from '@/lib/models'
import EcranVerrouille from '@/app/EcranVerrouille'
import { peut } from '@/lib/plans'
import ChargementConsole from '@/components/ui/ChargementConsole' // refonte 18/10 (5.4) : squelette en console v2

export default function Outils() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [plan, setPlan] = useState('gratuit')
  const [tier, setTier] = useState<Tier>('standard')

  const [message, setMessage] = useState('')
  const [nomClient, setNomClient] = useState('')
  const [loading, setLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const { data: prof } = await supabase.from('artisans').select('nom, plan').eq('id', data.session.user.id).maybeSingle()
      if (!prof) { router.replace('/onboarding'); return }
      setPlan((prof as { plan?: string }).plan ?? 'gratuit')
      setReady(true)
    })
  }, [router])

  async function generate() {
    setErr(null); setReply(''); setCopied(false)
    if (!message.trim()) { setErr('Décris la demande de ton client.'); return }
    setLoading(true)
    const { data } = await supabase.auth.getSession()
    const res = await fetch('/api/tools/reponse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
      body: JSON.stringify({ message, nomClient, model: tier }),
    })
    setLoading(false)
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setErr(d.error ?? 'Une erreur est survenue.'); return }
    setReply(d.reply ?? '')
  }

  function copyReply() {
    navigator.clipboard?.writeText(reply)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <AppShell active="outils" title="Réponses instantanées" crumb="Outils IA">
      {!ready ? (
        <ChargementConsole />
      ) : (
        <>
          {/* 15/10 (Benj) : la réponse préparée par l'IA à une demande fait partie de la plateforme, qui commence avec Studio. */}
          {!peut(plan, 'plateforme.conversation') ? <EcranVerrouille ecran="outils" plan={plan} /> : (
          <div className="tool-card">
            <h2>Répondre à un client</h2>
            <p className="muted" style={{ margin: '0 0 .6rem' }}>Collez la demande de votre client — Presti rédige la réponse à envoyer, dans votre ton.</p>
            <label>La demande de votre client <Info cle="outils.demande" /></label>
            <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ex : Bonjour, j'ai une fuite sous mon évier, pouvez-vous passer cette semaine ?" />
            <label>Nom du client (facultatif) <Info cle="outils.nom_client" /></label>
            <input value={nomClient} onChange={(e) => setNomClient(e.target.value)} placeholder="Ex : Marie" />
            <div style={{ marginTop: '.9rem' }}><ModelSelect plan={plan} value={tier} onChange={setTier} /></div>
            <button disabled={loading} onClick={generate}>{loading ? 'Presti rédige…' : 'Générer la réponse'}</button>
            {err && <div className="msg err">{err}</div>}
            {reply && (
              <div className="tool-out">
                <div className="tool-out-label">Réponse proposée (modifiable) :</div>
                <textarea rows={8} value={reply} onChange={(e) => setReply(e.target.value)} />
                <button className="psh-btn ghost" style={{ marginTop: '.8rem' }} onClick={copyReply}>{copied ? '✓ Copié' : 'Copier la réponse'}</button>
              </div>
            )}
          </div>
          )}

          <a href="/devis" className="tool-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <h2>Créer un devis →</h2>
            <p className="muted" style={{ margin: 0 }}>Décrivez le chantier, Presti génère un devis chiffré et conforme, prêt à envoyer.</p>
          </a>
        </>
      )}
    </AppShell>
  )
}
