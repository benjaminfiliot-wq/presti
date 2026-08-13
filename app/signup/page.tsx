'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setMsg({ type: 'err', text: error.message })
      return
    }
    if (data.session) {
      router.push('/dashboard')
    } else {
      setMsg({
        type: 'ok',
        text: "Compte créé ! Vérifie tes emails pour confirmer — ou désactive « Confirm email » dans Supabase pour tester sans confirmation.",
      })
    }
  }

  return (
    <main className="wrap">
      <div className="card">
        <div className="brand"><span className="dot" />Presti</div>
        <h1>Créer un compte</h1>
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Mot de passe</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button disabled={loading}>{loading ? '…' : 'Créer mon compte'}</button>
        </form>
        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`}>{msg.text}</div>}
        <p className="muted" style={{ marginTop: '1rem' }}>
          Déjà un compte ? <a href="/login">Se connecter</a>
        </p>
      </div>
    </main>
  )
}
