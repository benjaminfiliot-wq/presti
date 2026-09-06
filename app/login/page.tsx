'use client'
import '@/app/globals.css'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { actif } from '@/lib/flags'
import Info from '@/app/Info'
import { messageAuth } from '@/lib/motDePasse'
import Marque from '@/app/Marque'

// Connexion (prompt v7, bloc 2) : le mot de passe est vérifié par le SERVEUR (api/auth/code),
// qui décide de la suite —
//  • `code`  : un code à 6 chiffres est parti par email ; la session n'existe pas encore ici.
//              Le mot de passe reste en mémoire le temps de l'écran : il est redonné avec le
//              code (api/auth/code/verifier), et c'est là que la session arrive ;
//  • `totp`  : le compte a une application d'authentification — elle remplace le code email ;
//              la session est posée, puis on demande le code de l'application (comme avant) ;
//  • `ok`    : appareil de confiance (« se souvenir 30 jours ») — session posée, on entre.
//
// `/login?mfa=1`   : une session au mot de passe seul existe (aal1) mais une route a exigé le
//                    second facteur (lib/authArtisan) — on saute à l'étape du code d'application.
// `/login?verif=1` : une session d'AVANT le code email, ou obtenue sans lui — on la ferme,
//                    l'artisan se reconnecte et reçoit son code.
// `retour=` ramène ensuite là où l'artisan était ; sinon /outils.

const ESSAIS_MAX = 5
type Etape = 'mdp' | 'code' | 'totp'
type Session = { access_token: string; refresh_token: string }

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
  const [etape, setEtape] = useState<Etape>('mdp')
  const [facteurId, setFacteurId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [essais, setEssais] = useState(0)
  const [info, setInfo] = useState<string | null>(null)
  const [souvenir, setSouvenir] = useState(false)
  const [renvoye, setRenvoye] = useState(false)

  /** Passe à l'étape du code d'application si cette session a un second facteur à valider. */
  async function versEtapeTotp(): Promise<boolean> {
    if (!actif('mfa')) return false
    // Les facteurs sont relus côté serveur (et pas seulement dans la session locale, qui
    // peut dater d'avant l'activation) ; le niveau courant, lui, est dans le jeton.
    const { data: f } = await supabase.auth.mfa.listFactors()
    const totp = f?.totp?.[0]
    if (!totp) return false
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.currentLevel === 'aal2') return false
    setFacteurId(totp.id); setCode(''); setEssais(0); setMsg(null); setEtape('totp')
    return true
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get('verrou') === '1') {
      setInfo('Presti a été verrouillée : le déverrouillage a échoué ou a été refusé. Reconnectez-vous avec votre mot de passe.')
      return
    }
    if (q.get('verif') === '1') {
      supabase.auth.signOut().catch(() => {})
      setInfo('Par sécurité, votre connexion doit être vérifiée : reconnectez-vous, un code vous sera envoyé par email.')
      return
    }
    if (q.get('mfa') !== '1') return
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session && await versEtapeTotp()) return
      setInfo('Pour continuer, connectez-vous puis saisissez le code de votre application d’authentification.')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function entrer(session: Session) {
    const { error } = await supabase.auth.setSession(session)
    if (error) { setMsg(messageAuth(error.message)); setLoading(false); return }
    router.push(destination())
  }

  /** Étape 1 : le mot de passe, vérifié par le serveur ; `renvoi` redemande un code depuis l'étape 2. */
  async function demanderCode(renvoi = false) {
    setLoading(true); setMsg(null)
    const r = await fetch('/api/auth/code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, renvoi }) })
    const d = await r.json().catch(() => ({})) as { etape?: Etape | 'ok'; session?: Session; error?: string; code?: string }
    if (!r.ok) { setMsg(d.error ?? 'Connexion impossible pour l’instant.'); setLoading(false); return }
    if (d.etape === 'ok' && d.session) { await entrer(d.session); return }
    if (d.etape === 'totp' && d.session) {
      const { error } = await supabase.auth.setSession(d.session)
      if (error) { setMsg(messageAuth(error.message)); setLoading(false); return }
      if (await versEtapeTotp()) { setLoading(false); return }
      router.push(destination()); return
    }
    // Un code est parti. La session, elle, n'arrivera qu'avec le bon code.
    setCode(''); setEssais(0); setEtape('code'); setRenvoye(renvoi); setLoading(false)
    setInfo(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    if (actif('codeEmail')) { await demanderCode(false); return }
    // Sans le code email (drapeau baissé) : la connexion d'avant, telle quelle.
    setLoading(true); setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setLoading(false); setMsg(messageAuth(error.message)); return }
    if (await versEtapeTotp()) { setLoading(false); return }
    router.push(destination())
  }

  /** Étape 2 (code email) : le code ET le mot de passe — la session n'arrive qu'ici. */
  async function handleCodeEmail(e: FormEvent) {
    e.preventDefault()
    if (code.length !== 6 || loading) return
    setLoading(true); setMsg(null)
    const r = await fetch('/api/auth/code/verifier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, code, souvenir }) })
    const d = await r.json().catch(() => ({})) as { ok?: boolean; session?: Session; error?: string; code?: string; essais_restants?: number }
    if (r.ok && d.session) { await entrer(d.session); return }
    setCode(''); setLoading(false)
    if (d.code === 'code_faux') setEssais(ESSAIS_MAX - (d.essais_restants ?? 0))
    setMsg(d.error ?? 'Vérification impossible pour l’instant.')
  }

  /** Étape 2 (application d'authentification), inchangée. */
  async function handleCodeTotp(e: FormEvent) {
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
    if (etape === 'totp') await supabase.auth.signOut()
    setEtape('mdp'); setCode(''); setMsg(null); setInfo(null); setPassword(''); setRenvoye(false)
  }

  const svgOeil = showPw
    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a17 17 0 0 1-3 3.6M6.6 6.6A17 17 0 0 0 2 11s3.5 7 10 7a10.9 10.9 0 0 0 4-.7" /><path d="m2 2 20 20" /><path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" /></svg>
    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>

  return (
    <main className="wrap">
      <div className="card">
        <a className="back-link" href="/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>Retour à l’accueil</a>
        <div className="brand"><i className="marque" aria-hidden="true"><Marque size={24} /></i>Presti</div>
        {etape === 'code' ? (
          <>
            <h1>Vérifiez que c’est bien vous</h1>
            <p className="muted" style={{ margin: '0 0 .4rem' }}>
              {renvoye ? 'Un nouveau code' : 'Un code à 6 chiffres'} vient de partir à <b>{email}</b>. Il est valable 10 minutes.
            </p>
            <form onSubmit={handleCodeEmail}>
              <label htmlFor="code-email">Code reçu par email <Info cle="securite.code_email" /></label>
              <input id="code-email" className="mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} placeholder="000000" autoFocus
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
              <label className="souvenir" htmlFor="souvenir-appareil">
                <input id="souvenir-appareil" type="checkbox" checked={souvenir} onChange={(e) => setSouvenir(e.target.checked)} />
                Se souvenir de cet appareil 30 jours
              </label>
              <button disabled={loading || code.length !== 6}>{loading ? '…' : 'Valider'}</button>
            </form>
            {msg && <div className="msg err" role="alert">{msg}</div>}
            <p className="muted" style={{ marginTop: '.9rem', textAlign: 'center' }}>
              Rien reçu ? Regardez vos indésirables, ou{' '}
              <a href="/login" onClick={(e) => { e.preventDefault(); if (!loading) demanderCode(true) }}>renvoyer un code</a>
              {' · '}
              <a href="/login" onClick={(e) => { e.preventDefault(); revenir() }}>Revenir à la connexion</a>
            </p>
          </>
        ) : etape === 'totp' ? (
          <>
            <h1>Encore une étape</h1>
            <p className="muted" style={{ margin: '0 0 .4rem' }}>Votre compte est protégé par la double authentification.</p>
            <form onSubmit={handleCodeTotp}>
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
                  {svgOeil}
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
