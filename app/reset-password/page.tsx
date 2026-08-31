'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

// Réinitialisation du mot de passe. Deux modes sur la même page :
//  A) demande : l'artisan saisit son email → on envoie le lien de réinitialisation.
//  B) définition : arrivé via le lien de l'email (session de récupération), il choisit un
//     nouveau mot de passe. Supabase déclenche l'événement PASSWORD_RECOVERY à l'arrivée.
export default function ResetPasswordPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'request' | 'set'>('request')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    // Si on arrive depuis le lien email, Supabase pose une session de récupération.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('set')
    })
    // Filet : certains navigateurs ont déjà la session au montage.
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) setMode('set')
    supabase.auth.getSession().then(({ data }) => { if (data.session && window.location.hash.includes('type=recovery')) setMode('set') })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function demander(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    setLoading(false)
    // On ne révèle jamais si l'email existe (anti-énumération) : message identique dans tous les cas.
    if (error && !/rate|limit/i.test(error.message)) { /* on masque les erreurs non pertinentes */ }
    setMsg({ type: 'ok', text: 'Si un compte existe avec cet email, un lien de réinitialisation vient d’être envoyé. Vérifiez votre boîte (et les spams).' })
  }

  async function definir(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 8) { setMsg({ type: 'err', text: 'Choisissez un mot de passe d’au moins 8 caractères.' }); return }
    if (pw !== pw2) { setMsg({ type: 'err', text: 'Les deux mots de passe ne correspondent pas.' }); return }
    setLoading(true); setMsg(null)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setLoading(false)
    if (error) { setMsg({ type: 'err', text: error.message }); return }
    setMsg({ type: 'ok', text: 'Mot de passe mis à jour ✅ Redirection…' })
    setTimeout(() => router.push('/outils'), 1400)
  }

  return (
    <main className="wrap">
      <div className="card">
        <a className="back-link" href="/login"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>Retour</a>
        <div className="brand"><span className="dot" />Presti</div>
        <h1>{mode === 'set' ? 'Nouveau mot de passe' : 'Mot de passe oublié'}</h1>

        {mode === 'set' ? (
          <form onSubmit={definir}>
            <label>Nouveau mot de passe</label>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} placeholder="8 caractères minimum" />
            <label>Confirmer</label>
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
            <button disabled={loading}>{loading ? '…' : 'Mettre à jour'}</button>
          </form>
        ) : (
          <form onSubmit={demander}>
            <p className="muted" style={{ margin: '0 0 1rem' }}>Saisissez votre email : on vous envoie un lien pour choisir un nouveau mot de passe.</p>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button disabled={loading}>{loading ? '…' : 'Envoyer le lien'}</button>
          </form>
        )}

        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`}>{msg.text}</div>}
      </div>
    </main>
  )
}
