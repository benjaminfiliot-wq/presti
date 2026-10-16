'use client'
import '@/app/globals.css'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { evaluerMotDePasse, messageAuth, messageFuite, verifierFuite, type Fuite } from '@/lib/motDePasse'
import Marque from '@/app/Marque'

// Version des CGU acceptées : la date de « Dernière mise à jour » de app/cgu/page.tsx. Elle est
// gravée avec l'heure d'acceptation dans les métadonnées du compte (art. 1119 c. civ. : des
// conditions générales n'ont d'effet que si elles ont été portées à la connaissance et acceptées).
const CGU_VERSION = '2026-09-05'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  // Force du mot de passe, évaluée à la frappe. On refuse ce qui figure dans les listes
  // d'attaque — et on DIT pourquoi, au lieu de refuser sans expliquer.
  const force = evaluerMotDePasse(password, email)
  // Résultat de la recherche dans les fuites, mémorisé AVEC le mot de passe testé :
  // sinon un verdict rendu pour l'ancienne saisie s'appliquerait à la nouvelle.
  const [fuite, setFuite] = useState<{ mdp: string; res: Fuite } | null>(null)
  const [cgu, setCgu] = useState(false)
  const [verifEnCours, setVerifEnCours] = useState(false)
  const verdict = fuite?.mdp === password ? fuite.res : null
  const compromis = verdict?.compromis === true

  // On interroge pendant la frappe, une fois les règles de forme passées : l'artisan
  // apprend le problème avant de cliquer, pas après. Une demi-seconde de calme évite
  // d'envoyer une requête par touche.
  useEffect(() => {
    if (!force.ok || verdict) return
    const mdp = password
    const minuteur = setTimeout(async () => {
      setVerifEnCours(true)
      const res = await verifierFuite(mdp)
      setVerifEnCours(false)
      setFuite({ mdp, res })
    }, 500)
    return () => clearTimeout(minuteur)
  }, [password, force.ok, verdict])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!force.ok) { setMsg({ type: 'err', text: force.probleme ?? 'Choisissez un mot de passe plus solide.' }); return }
    setLoading(true)
    setMsg(null)
    // Filet : si la frappe a été trop rapide pour que la vérification de fond aboutisse,
    // on la fait maintenant, en bloquant. Personne ne passe sans avoir été vérifié.
    let res = verdict
    if (!res) {
      res = await verifierFuite(password)
      setFuite({ mdp: password, res })
    }
    if (res.compromis) {
      setLoading(false)
      setMsg({ type: 'err', text: messageFuite(res) })
      return
    }
    if (!cgu) { setLoading(false); setMsg({ type: 'err', text: 'Merci d’accepter les conditions générales pour créer votre compte.' }); return }
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { cgu_acceptees_le: new Date().toISOString(), cgu_version: CGU_VERSION } } })
    setLoading(false)
    if (error) {
      setMsg({ type: 'err', text: messageAuth(error.message) })
      return
    }
    if (data.session) {
      // Venu de l'offre « s'abonner directement » de l'accueil (?abonnement=studio) : on poursuit vers le paiement de CETTE offre.
      const voulue = new URLSearchParams(window.location.search).get('abonnement')
      router.push(voulue === 'essentiel' || voulue === 'studio' || voulue === 'signature' ? `/onboarding?suite=${encodeURIComponent(`/abonnement?offre=${voulue}`)}` : '/outils')
    } else {
      setMsg({
        type: 'ok',
        // Ce message donnait une consigne de DÉVELOPPEUR (« désactive Confirm email dans
        // Supabase ») à l'artisan qui vient de créer son compte.
        text: 'Compte créé. Ouvrez le lien de confirmation qu’on vient de vous envoyer par email pour accéder à votre espace.',
      })
    }
  }

  return (
    <main className="wrap">
      <div className="card">
        <a className="back-link" href="/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>Retour</a>
        <div className="brand"><i className="marque" aria-hidden="true"><Marque size={24} /></i>Presti</div>
        <h1>Créer un compte</h1>
        <form onSubmit={handleSubmit}>
          {/* htmlFor/id : sans lien explicite, axe remonte une infraction CRITIQUE et un
              lecteur d'écran annonce un champ sans nom. autoComplete : exigé par WCAG 1.3.5. */}
          <label htmlFor="email-inscription">Email</label>
          <input id="email-inscription" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="mdp-inscription">Mot de passe</label>
          <div className="pw-field">
            <input id="mdp-inscription" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <button type="button" className="pw-eye" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              {showPw
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a17 17 0 0 1-3 3.6M6.6 6.6A17 17 0 0 0 2 11s3.5 7 10 7a10.9 10.9 0 0 0 4-.7" /><path d="m2 2 20 20" /><path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" /></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>}
            </button>
          </div>
          {password ? (
            <div className="mdp-force" data-niveau={compromis || !force.ok ? 0 : force.score}>
              <span className="mdp-jauge" aria-hidden="true"><i /><i /><i /></span>
              <span className="mdp-txt">
                {compromis
                  ? messageFuite(verdict)
                  : force.probleme ?? (verifEnCours ? 'Vérification…' : force.conseil)}
              </span>
            </div>
          ) : null}
          <label className="cgu-accord" htmlFor="cgu-inscription">
            <input id="cgu-inscription" type="checkbox" name="cgu" checked={cgu} onChange={(e) => setCgu(e.target.checked)} required />
            <span>J’ai lu et j’accepte les <a href="/cgu" target="_blank" rel="noopener">conditions générales</a> et la <a href="/confidentialite" target="_blank" rel="noopener">politique de confidentialité</a>.</span>
          </label>
          <button disabled={loading || !force.ok || compromis || !cgu}>{loading ? '…' : 'Créer mon compte'}</button>
        </form>
        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`}>{msg.text}</div>}
        <p className="muted" style={{ marginTop: '1rem' }}>
          Déjà un compte ? <a href="/login">Se connecter</a>
        </p>
      </div>
    </main>
  )
}
