'use client'
import '@/app/globals.css'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { actif } from '@/lib/flags'
import Info from '@/app/Info'
import { messageAuth } from '@/lib/motDePasse'

// Connexion en une étape (mot de passe), ou deux quand l'artisan a activé la double
// authentification (sprint J-1 §6) : après le mot de passe, Supabase dit que le niveau
// suivant est `aal2` — on demande alors le code de son application, sur cette même page.
//
// `/login?mfa=1` : une session au mot de passe seul existe déjà (jeton aal1) mais une
// route a exigé le second facteur (lib/authArtisan) — on saute directement à l'étape 2.
// `retour=` ramène ensuite là où l'artisan était ; sinon /outils.

const ESSAIS_MAX = 5

/** Destination après connexion : un chemin de Presti, jamais une adresse extérieure. */
function destination(): string {
  const r = new URLSearchParams(window.location.search).get('retour') ?? ''
  return r.startsWith('/') && !r.startsWith('//') && !r.startsWith('/login') ? r : '/outils'
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  // Étape 2 — code de l'application d'authentification.
  const [etape, setEtape] = useState<'mdp' | 'code'>('mdp')
  const [facteurId, setFacteurId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [essais, setEssais] = useState(0)
  const [info, setInfo] = useState<string | null>(null)

  /** Passe à l'étape 2 si cette session a un second facteur à valider. Renvoie vrai si c'est le cas. */
  async function versEtapeCode(): Promise<boolean> {
    if (!actif('mfa')) return false
    // Les facteurs sont relus côté serveur (et pas seulement dans la session locale, qui
    // peut dater d'avant l'activation) ; le niveau courant, lui, est dans le jeton.
    const { data: f } = await supabase.auth.mfa.listFactors()
    const totp = f?.totp?.[0]
    if (!totp) return false
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.currentLevel === 'aal2') return false
    setFacteurId(totp.id); setCode(''); setEssais(0); setMsg(null); setEtape('code')
    return true
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mfa') !== '1') return
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session && await versEtapeCode()) return
      setInfo('Pour continuer, connectez-vous puis saisissez le code de votre application d’authentification.')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
      // Le message brut de Supabase (« Invalid login credentials ») s'affichait tel quel,
      // en anglais, à un artisan qui vient de se tromper de mot de passe.
      setMsg(messageAuth(error.message))
      return
    }
    if (await versEtapeCode()) { setLoading(false); return }
    router.push(destination())
  }

  async function handleCode(e: FormEvent) {
    e.preventDefault()
    if (!facteurId || code.length !== 6 || loading) return
    setLoading(true)
    setMsg(null)
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: facteurId, code })
    if (error) {
      const n = essais + 1
      setEssais(n); setCode(''); setLoading(false)
      if (n >= ESSAIS_MAX) {
        // Cinq codes refusés : on ferme la session au mot de passe et on repart de zéro.
        await supabase.auth.signOut()
        setEtape('mdp'); setPassword('')
        setMsg('Cinq codes refusés. Par sécurité, recommencez la connexion — et vérifiez que l’heure de votre téléphone est réglée automatiquement.')
        return
      }
      setMsg(/rate limit|too many/i.test(error.message) ? 'Trop de tentatives. Patientez quelques minutes.' : `Code incorrect. Il vous reste ${ESSAIS_MAX - n} essai${ESSAIS_MAX - n > 1 ? 's' : ''}.`)
      return
    }
    router.push(destination())
  }

  async function revenir() {
    await supabase.auth.signOut()
    setEtape('mdp'); setCode(''); setMsg(null); setInfo(null); setPassword('')
  }

  return (
    <main className="wrap">
      <div className="card">
        <a className="back-link" href="/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>Retour</a>
        <div className="brand"><span className="dot" />Presti</div>
        {etape === 'code' ? (
          <>
            <h1>Encore une étape</h1>
            <p className="muted" style={{ margin: '0 0 .4rem' }}>Votre compte est protégé par la double authentification.</p>
            <form onSubmit={handleCode}>
              <label htmlFor="code-connexion">Code de votre application d’authentification <Info cle="connexion.code_2fa" /></label>
              <input id="code-connexion" className="mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} placeholder="000000" autoFocus
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
              <button disabled={loading || code.length !== 6}>{loading ? '…' : 'Valider'}</button>
            </form>
            {msg && <div className="msg err" role="alert">{msg}</div>}
            <p className="muted" style={{ marginTop: '.9rem', textAlign: 'center' }}>
              <a href="/login" onClick={(e) => { e.preventDefault(); revenir() }}>Revenir à la connexion</a>
            </p>
          </>
        ) : (
          <>
            <h1>Se connecter</h1>
            {info && <div className="msg" role="status">{info}</div>}
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
          </>
        )}
      </div>
    </main>
  )
}
