'use client'
import '@/app/globals.css'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { messageAuth } from '@/lib/motDePasse'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      // Le message brut de Supabase (« Invalid login credentials ») s'affichait tel quel,
      // en anglais, à un artisan qui vient de se tromper de mot de passe.
      setMsg(messageAuth(error.message))
      return
    }
    router.push('/outils')
  }

  return (
    <main className="wrap">
      <div className="card">
        <a className="back-link" href="/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>Retour</a>
        <div className="brand"><span className="dot" />Presti</div>
        <h1>Se connecter</h1>
        <form onSubmit={handleSubmit}>
          {/* htmlFor/id : sans lien explicite, axe remonte une infraction CRITIQUE et un
              lecteur d'écran annonce un champ sans nom. autoComplete : exigé par WCAG 1.3.5. */}
          <label htmlFor="email-connexion">Email</label>
          <input id="email-connexion" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="mdp-connexion">Mot de passe</label>
          <div className="pw-field">
            <input id="mdp-connexion" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="pw-eye" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              {showPw
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a17 17 0 0 1-3 3.6M6.6 6.6A17 17 0 0 0 2 11s3.5 7 10 7a10.9 10.9 0 0 0 4-.7" /><path d="m2 2 20 20" /><path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" /></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>}
            </button>
          </div>
          <button disabled={loading}>{loading ? '…' : 'Se connecter'}</button>
        </form>
        {msg && <div className="msg err">{msg}</div>}
        <p className="muted" style={{ marginTop: '.9rem', textAlign: 'center' }}>
          <a href="/reset-password">Mot de passe oublié&nbsp;?</a>
        </p>
        <p className="muted" style={{ marginTop: '.4rem' }}>
          Pas encore de compte ? <a href="/signup">Créer un compte</a>
        </p>
      </div>
    </main>
  )
}
