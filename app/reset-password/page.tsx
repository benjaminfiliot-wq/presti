'use client'
import '@/app/globals.css'

import { useEffect, useRef, useState, Suspense, type FormEvent } from 'react'
import { evaluerMotDePasse, messageFuite, verifierFuite, type Fuite } from '@/lib/motDePasse'
import { useRouter } from 'next/navigation'
import Marque from '@/app/Marque'

// Réinitialisation du mot de passe (flux maîtrisé, email via Resend).
//  A) demande : l'artisan saisit son email → on envoie le lien.
//  B) définition : arrivé via le lien (?token=…), il choisit un nouveau mot de passe.
function ResetInner() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  // Mêmes règles qu'à l'inscription : cet écran ne demandait que 8 caractères, ce qui
  // en faisait le moyen le plus simple de se remettre un mot de passe faible.
  const force = evaluerMotDePasse(pw)
  const [fuite, setFuite] = useState<{ mdp: string; res: Fuite } | null>(null)
  const [verifEnCours, setVerifEnCours] = useState(false)
  const champMdp = useRef<HTMLInputElement>(null)
  const verdict = fuite?.mdp === pw ? fuite.res : null
  const compromis = verdict?.compromis === true

  useEffect(() => {
    if (!token || !force.ok || verdict) return
    const mdp = pw
    const minuteur = setTimeout(async () => {
      setVerifEnCours(true)
      const res = await verifierFuite(mdp)
      setVerifEnCours(false)
      setFuite({ mdp, res })
    }, 500)
    return () => clearTimeout(minuteur)
  }, [pw, token, force.ok, verdict])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const t = new URLSearchParams(window.location.search).get('token')
    if (t) setToken(t)
  }, [])

  async function demander(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    try {
      await fetch('/api/auth/reset-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) })
    } catch {}
    setLoading(false)
    setMsg({ type: 'ok', text: 'Si un compte existe avec cet email, un lien de réinitialisation vient d’être envoyé. Vérifiez votre boîte (et les spams).' })
  }

  async function definir(e: FormEvent) {
    e.preventDefault()
    if (!force.ok) { setMsg({ type: 'err', text: force.probleme ?? 'Choisissez un mot de passe plus solide.' }); champMdp.current?.focus(); return }
    if (pw !== pw2) { setMsg({ type: 'err', text: 'Les deux mots de passe ne correspondent pas.' }); return }
    setLoading(true); setMsg(null)
    let verifiee = verdict
    if (!verifiee) { verifiee = await verifierFuite(pw); setFuite({ mdp: pw, res: verifiee }) }
    if (verifiee.compromis) { setLoading(false); setMsg({ type: 'err', text: messageFuite(verifiee) }); champMdp.current?.focus(); return }
    const res = await fetch('/api/auth/reset-confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password: pw }) })
    const d = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Impossible de réinitialiser.' }); return }
    setMsg({ type: 'ok', text: 'Mot de passe mis à jour ✅ Vous pouvez vous connecter.' })
    setTimeout(() => router.push('/login'), 1600)
  }

  return (
    <main className="wrap">
      <div className="card">
        <a className="back-link" href="/login"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>Retour</a>
        <div className="brand"><i className="marque" aria-hidden="true"><Marque size={24} /></i>Presti</div>
        <h1>{token ? 'Nouveau mot de passe' : 'Mot de passe oublié'}</h1>

        {token ? (
          <form onSubmit={definir}>
            <label htmlFor="mdp-nouveau">Nouveau mot de passe</label>
            <input id="mdp-nouveau" ref={champMdp} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={10} placeholder="10 caractères minimum" />
            {pw ? (
              <div className="mdp-force" data-niveau={compromis || !force.ok ? 0 : force.score}>
                <span className="mdp-jauge" aria-hidden="true"><i /><i /><i /></span>
                <span className="mdp-txt">
                  {compromis ? messageFuite(verdict) : force.probleme ?? (verifEnCours ? 'Vérification…' : force.conseil)}
                </span>
              </div>
            ) : null}
            <label htmlFor="mdp-confirmation">Confirmer</label>
            <input id="mdp-confirmation" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
            <button disabled={loading || !force.ok || compromis}>{loading ? '…' : 'Mettre à jour'}</button>
          </form>
        ) : (
          <form onSubmit={demander}>
            <p className="muted" style={{ margin: '0 0 1rem' }}>Saisissez votre email : on vous envoie un lien pour choisir un nouveau mot de passe.</p>
            <label htmlFor="email-reinitialisation">Email</label>
            <input id="email-reinitialisation" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button disabled={loading}>{loading ? '…' : 'Envoyer le lien'}</button>
          </form>
        )}

        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`}>{msg.text}</div>}
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return <Suspense><ResetInner /></Suspense>
}
