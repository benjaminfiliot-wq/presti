'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ModelSelect from '@/app/ModelSelect'
import type { Tier } from '@/lib/models'

export default function Outils() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [nom, setNom] = useState('')
  const [plan, setPlan] = useState('gratuit')
  const [tier, setTier] = useState<Tier>('standard')

  // Générateur de réponse
  const [message, setMessage] = useState('')
  const [nomClient, setNomClient] = useState('')
  const [loading, setLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace('/login')
        return
      }
      const { data: prof } = await supabase
        .from('artisans')
        .select('nom, plan')
        .eq('id', data.session.user.id)
        .maybeSingle()
      if (!prof) {
        router.replace('/onboarding')
        return
      }
      setNom((prof as { nom: string | null }).nom ?? '')
      setPlan((prof as { plan?: string }).plan ?? 'gratuit')
      setReady(true)
    })
  }, [router])

  async function generate() {
    setErr(null)
    setReply('')
    setCopied(false)
    if (!message.trim()) {
      setErr('Décris la demande de ton client.')
      return
    }
    setLoading(true)
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const res = await fetch('/api/tools/reponse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message, nomClient, model: tier }),
    })
    setLoading(false)
    const d = await res.json().catch(() => ({}))
    if (!res.ok) {
      setErr(d.error ?? 'Une erreur est survenue.')
      return
    }
    setReply(d.reply ?? '')
  }

  function copyReply() {
    navigator.clipboard?.writeText(reply)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (!ready) {
    return (
      <main className="app-wrap">
        <p className="muted">Chargement…</p>
      </main>
    )
  }

  return (
    <>
      <div className="appbar">
        <div className="appbar-in">
          <span className="brand"><span className="dot" />Presti</span>
          <div className="appbar-links">
            <a className="applink active" href="/outils">Générateurs</a>
            <a className="applink" href="/devis">Devis</a>
            <a className="applink" href="/dashboard">Mes demandes</a>
            <button className="applink" onClick={logout}>Déconnexion</button>
          </div>
        </div>
      </div>

      <main className="app-wrap">
        <h1>Bonjour {nom} 👋</h1>
        <p className="muted" style={{ marginBottom: '1.6rem' }}>
          Générez une réponse ou un devis en quelques secondes, dans votre ton.
        </p>

        <div className="tool-card">
          <h2>Réponse à un client</h2>
          <p className="muted" style={{ margin: '0 0 .6rem' }}>
            Collez la demande de votre client, Presti rédige la réponse à envoyer.
          </p>
          <label>La demande de votre client</label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ex : Bonjour, j'ai une fuite sous mon évier, pouvez-vous passer cette semaine ?"
          />
          <label>Nom du client (facultatif)</label>
          <input value={nomClient} onChange={(e) => setNomClient(e.target.value)} placeholder="Ex : Marie" />
          <div style={{ marginTop: '.7rem' }}><ModelSelect plan={plan} value={tier} onChange={setTier} /></div>
          <button disabled={loading} onClick={generate}>{loading ? 'Presti rédige…' : 'Générer la réponse'}</button>
          {err && <div className="msg err">{err}</div>}
          {reply && (
            <div className="tool-out">
              <div className="tool-out-label">Réponse proposée (modifiable) :</div>
              <textarea rows={8} value={reply} onChange={(e) => setReply(e.target.value)} />
              <button
                className="btn btn--ghost"
                style={{ width: 'auto', marginTop: '.8rem' }}
                onClick={copyReply}
              >
                {copied ? '✓ Copié' : 'Copier la réponse'}
              </button>
            </div>
          )}
        </div>

        <div className="tool-card" style={{ opacity: 0.72 }}>
          <h2>Devis <span className="soon-tag">Bientôt</span></h2>
          <p className="muted" style={{ margin: 0 }}>
            Décrivez le chantier, Presti génère un devis chiffré prêt à envoyer. J&apos;arrive dessus juste après.
          </p>
        </div>
      </main>
    </>
  )
}
