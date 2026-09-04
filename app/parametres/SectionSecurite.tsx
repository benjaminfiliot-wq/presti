'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { actif } from '@/lib/flags'
import Info from '@/app/Info'
import { evaluerMotDePasse, messageFuite, verifierFuite, type Fuite } from '@/lib/motDePasse'
import { api, dateFr, type SectionProps } from './commun'

// Sécurité (sprint J-1 §6) : mot de passe (ancien + nouveau, politique renforcée),
// sessions ouvertes avec fermeture unitaire, « fermer toutes mes sessions », et la
// double authentification (TOTP via Supabase MFA — décision Benj du 04/09 : dans le
// sprint, derrière le drapeau `mfa`).

type Session = { id: string; appareil: string; navigateur: string; ip: string | null; ouverte_le: string; derniere_activite: string; courante: boolean }

export default function SectionSecurite({ a, signaler }: SectionProps) {
  const router = useRouter()
  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<Fuite | null>(null)
  const [verif, setVerif] = useState(false)
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [erreurSessions, setErreurSessions] = useState('')

  const force = evaluerMotDePasse(nouveau, a.email ?? '')
  const compromis = !!verdict?.compromis

  // Fuites connues (HIBP, k-anonymat) : vérifiées à la frappe, comme à l'inscription.
  useEffect(() => {
    setVerdict(null)
    if (!force.ok) return
    let vivant = true
    setVerif(true)
    const t = setTimeout(async () => {
      const r = await verifierFuite(nouveau)
      if (vivant) { setVerdict(r); setVerif(false) }
    }, 350)
    return () => { vivant = false; clearTimeout(t) }
  }, [nouveau, force.ok])

  const charger = useCallback(async () => {
    const r = await api<{ sessions?: Session[] }>('/api/securite/sessions')
    if (!r.ok) { setErreurSessions(r.data.error ?? 'Liste indisponible.'); setSessions([]); return }
    setSessions(r.data.sessions ?? [])
  }, [])
  useEffect(() => { charger() }, [charger])

  async function changerMdp() {
    if (busy || !force.ok || compromis) return
    setBusy('mdp')
    const r = await api<{ conseil?: string }>('/api/securite/mot-de-passe', { method: 'POST', body: JSON.stringify({ ancien, nouveau }) })
    setBusy(null)
    if (!r.ok) { signaler({ type: 'err', text: r.data.error ?? 'Changement impossible.' }); return }
    setAncien(''); setNouveau('')
    signaler({ type: 'ok', text: 'Mot de passe modifié ✅' })
  }

  async function fermer(s: Session) {
    if (busy) return
    setBusy(s.id)
    const r = await api<{ courante?: boolean }>('/api/securite/sessions', { method: 'DELETE', body: JSON.stringify({ id: s.id }) })
    setBusy(null)
    if (!r.ok) { signaler({ type: 'err', text: r.data.error ?? 'Fermeture impossible.' }); return }
    if (s.courante) { await supabase.auth.signOut(); router.replace('/login'); return }
    setSessions((p) => (p ?? []).filter((x) => x.id !== s.id))
    signaler({ type: 'ok', text: `Session fermée : ${s.appareil} · ${s.navigateur}.` })
  }

  async function fermerToutes() {
    if (busy) return
    setBusy('toutes')
    // On passe par le serveur : `signOut({ scope: 'others' })` seul ne révoque que les
    // jetons de rafraîchissement ; la route pose une date de révocation que toutes les
    // routes de Presti vérifient — l'effet est immédiat (v4 §11).
    const r = await api('/api/securite/sessions', { method: 'POST' })
    setBusy(null)
    if (!r.ok) { signaler({ type: 'err', text: r.data.error ?? 'Action impossible.' }); return }
    signaler({ type: 'ok', text: 'Toutes vos sessions sont fermées. Reconnexion…' })
    await supabase.auth.signOut()
    setTimeout(() => router.replace('/login'), 1200)
  }

  return (
    <>
      <div className="tool-card">
        <h2>Mot de passe</h2>
        <p className="muted" style={{ margin: '0 0 .6rem' }}>Stocké haché : personne, pas même nous, ne peut le lire. On ne peut que le remplacer — et pour ça, il faut l’actuel.</p>
        <label>Mot de passe actuel</label>
        <input type="password" value={ancien} onChange={(e) => setAncien(e.target.value)} autoComplete="current-password" />
        <label>Nouveau mot de passe <Info cle="parametres.mot_de_passe" /></label>
        <input type="password" value={nouveau} onChange={(e) => setNouveau(e.target.value)} autoComplete="new-password" placeholder="10 caractères minimum — trois mots sans rapport, c’est parfait" />
        {nouveau ? (
          <div className="mdp-force" data-niveau={compromis || !force.ok ? 0 : force.score}>
            <span className="mdp-jauge" aria-hidden="true"><i /><i /><i /></span>
            <span className="mdp-txt">{compromis && verdict ? messageFuite(verdict) : force.probleme ?? (verif ? 'Vérification…' : force.conseil)}</span>
          </div>
        ) : null}
        <button type="button" className="btn btn--primary" style={{ marginTop: '.9rem' }} disabled={busy === 'mdp' || !ancien || !force.ok || compromis || verif} onClick={changerMdp}>{busy === 'mdp' ? '…' : 'Changer mon mot de passe'}</button>
      </div>

      <div className="tool-card">
        <h2>Sessions ouvertes</h2>
        <p className="muted" style={{ margin: '0 0 .9rem' }}>Chaque appareil connecté à votre compte. Fermez ce que vous ne reconnaissez pas — c’est immédiat.</p>
        {sessions === null ? <p className="muted">Chargement…</p>
          : erreurSessions ? <p className="muted">{erreurSessions}</p>
          : (
            <ul className="sess">
              {sessions.map((s) => (
                <li key={s.id} className={s.courante ? 'courante' : ''}>
                  <span className="sess-ic" aria-hidden="true">
                    {/iPhone|Android|iPad/.test(s.appareil)
                      ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18h2" /></svg>
                      : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>}
                  </span>
                  <span className="sess-txt">
                    <b>{s.appareil} · {s.navigateur}{s.courante ? <em>Cette session</em> : null}</b>
                    <small>
                      Dernière activité le {dateFr(s.derniere_activite, true)}
                      {s.ip ? ` · ${s.ip}` : ''}
                      {' · ouverte le '}{dateFr(s.ouverte_le)}
                    </small>
                  </span>
                  <button type="button" className={`btn btn--ghost${s.courante ? '' : ' danger'}`} disabled={!!busy} onClick={() => fermer(s)}>{busy === s.id ? '…' : s.courante ? 'Me déconnecter' : 'Fermer'}</button>
                </li>
              ))}
            </ul>
          )}
        <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '1.2rem 0' }} />
        <p className="muted" style={{ margin: '0 0 .7rem', fontSize: '.88rem' }}>Vous avez utilisé un ordinateur qui n’est pas le vôtre ? Fermez tout d’un coup — les sessions sont réellement invalidées, pas seulement oubliées.</p>
        <button type="button" className="btn btn--ghost danger" disabled={!!busy} onClick={fermerToutes}>{busy === 'toutes' ? '…' : 'Fermer toutes mes sessions'}</button>
      </div>

      {actif('mfa') ? <DoubleAuth signaler={signaler} /> : null}
    </>
  )
}

// ── Double authentification ──────────────────────────────────────────────────────
//
// Tout se passe avec le jeton de l'artisan, côté navigateur, via l'API MFA de Supabase :
// enrôler (QR code + clé), vérifier un code (la session passe alors en `aal2`), retirer
// le facteur (après un dernier code — pour être sûr que c'est bien lui). Côté serveur,
// lib/authArtisan refuse ensuite tout jeton sans second facteur. Pas de bibliothèque :
// le QR code est un SVG fourni par Supabase, le code se tape dans un champ à 6 chiffres.

type Facteur = { id: string; status: 'verified' | 'unverified'; created_at: string; updated_at: string }
type EtatMfa =
  | { etat: 'chargement' }
  | { etat: 'inactive' }
  | { etat: 'enrolement'; id: string; qr: string; secret: string }
  | { etat: 'active'; facteur: Facteur; retrait: boolean }

/** Le SVG de Supabase arrive en `data:image/svg+xml;utf-8,<svg…>` non encodé : on l'encode pour que `<img>` l'accepte quoi qu'il contienne. */
const imageQr = (s: string) => s.startsWith('data:image/svg+xml;utf-8,') ? `data:image/svg+xml,${encodeURIComponent(s.slice(25))}` : s

function messageMfa(brut?: string): string {
  const m = (brut ?? '').toLowerCase()
  if (m.includes('not enabled') || m.includes('disabled')) return 'La double authentification n’est pas activée côté serveur pour l’instant.'
  if (m.includes('insufficient_aal') || m.includes('aal2')) return 'Reconnectez-vous avec votre code avant de modifier ce réglage.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Patientez quelques minutes.'
  return 'Action impossible pour l’instant. Réessayez dans un instant.'
}
const CODE_REFUSE = 'Code incorrect. Vérifiez que l’heure de votre téléphone est réglée automatiquement, puis réessayez.'

function DoubleAuth({ signaler }: { signaler: SectionProps['signaler'] }) {
  const [m, setM] = useState<EtatMfa>({ etat: 'chargement' })
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [copie, setCopie] = useState(false)

  const lire = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors()
    const f = error ? null : data.totp[0]
    setM(f ? { etat: 'active', facteur: f as Facteur, retrait: false } : { etat: 'inactive' })
  }, [])
  useEffect(() => { lire() }, [lire])

  async function activer() {
    if (busy) return
    setBusy(true)
    // Un enrôlement abandonné (QR jamais validé) bloquerait le suivant — même nom, conflit. On nettoie.
    const { data: l } = await supabase.auth.mfa.listFactors()
    for (const f of l?.all ?? []) if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id })
    // `issuer` : le nom que l'application du téléphone affichera à côté du code. Sans lui,
    // GoTrue prend l'hôte de la « Site URL » du projet — pas forcément « Presti ».
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Presti', issuer: 'Presti' })
    setBusy(false)
    if (error || !data) { signaler({ type: 'err', text: messageMfa(error?.message) }); return }
    setCode(''); setCopie(false)
    setM({ etat: 'enrolement', id: data.id, qr: imageQr(data.totp.qr_code), secret: data.totp.secret })
  }

  async function valider() {
    if (m.etat !== 'enrolement' || busy || code.length !== 6) return
    setBusy(true)
    const { data: ch, error: eCh } = await supabase.auth.mfa.challenge({ factorId: m.id })
    if (eCh || !ch) { setBusy(false); signaler({ type: 'err', text: messageMfa(eCh?.message) }); return }
    const { error } = await supabase.auth.mfa.verify({ factorId: m.id, challengeId: ch.id, code })
    setBusy(false)
    if (error) { setCode(''); signaler({ type: 'err', text: CODE_REFUSE }); return }
    setCode('')
    await lire()
    signaler({ type: 'ok', text: 'Double authentification activée ✅' })
  }

  async function annuler() {
    if (m.etat !== 'enrolement' || busy) return
    await supabase.auth.mfa.unenroll({ factorId: m.id })
    setM({ etat: 'inactive' })
  }

  async function desactiver() {
    if (m.etat !== 'active' || busy || code.length !== 6) return
    setBusy(true)
    const { error: eV } = await supabase.auth.mfa.challengeAndVerify({ factorId: m.facteur.id, code })
    if (eV) { setBusy(false); setCode(''); signaler({ type: 'err', text: CODE_REFUSE }); return }
    const { error } = await supabase.auth.mfa.unenroll({ factorId: m.facteur.id })
    setBusy(false)
    if (error) { signaler({ type: 'err', text: messageMfa(error.message) }); return }
    setCode(''); setM({ etat: 'inactive' })
    signaler({ type: 'ok', text: 'Double authentification désactivée.' })
  }

  async function copier() {
    if (m.etat !== 'enrolement') return
    try { await navigator.clipboard.writeText(m.secret); setCopie(true); setTimeout(() => setCopie(false), 2000) } catch { /* presse-papiers refusé : la clé reste lisible à l'écran */ }
  }

  const champCode = (onEntree: () => void) => (
    <input id="mfa-code" className="mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} placeholder="000000"
      value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onEntree() } }} />
  )

  return (
    <div className="tool-card" data-mfa={m.etat}>
      <h2>Double authentification <Info cle="parametres.deux_facteurs" /></h2>
      <p className="muted" style={{ margin: '0 0 .9rem' }}>Un second verrou en plus du mot de passe : un code à 6 chiffres affiché par une application sur votre téléphone (Google Authenticator, Microsoft Authenticator…). Un mot de passe volé ne suffit plus.</p>
      {m.etat === 'chargement' ? <p className="muted">Chargement…</p>
        : m.etat === 'inactive' ? (
          <div className="mfa-etat">
            <span className="mfa-pastille" aria-hidden="true" />
            <span className="mfa-etat-txt"><b>Désactivée</b><small>Votre compte n’est protégé que par le mot de passe.</small></span>
            <button type="button" className="btn btn--primary" disabled={busy} onClick={activer}>{busy ? '…' : 'Activer'}</button>
          </div>
        ) : m.etat === 'enrolement' ? (
          <div className="mfa-enrol">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="mfa-qr"><img src={m.qr} alt="QR code à scanner avec votre application d’authentification" /></div>
            <div>
              <ol className="mfa-etapes">
                <li>Ouvrez votre application d’authentification et scannez ce QR code.</li>
                <li>Pas d’appareil photo ? Saisissez cette clé à la main dans l’application :</li>
              </ol>
              <div className="mfa-secret">
                <code>{m.secret.replace(/(.{4})/g, '$1 ').trim()}</code>
                <button type="button" className="btn btn--ghost" onClick={copier}>{copie ? 'Copié ✓' : 'Copier'}</button>
              </div>
              <label htmlFor="mfa-code">Code à 6 chiffres affiché par l’application</label>
              {champCode(valider)}
              <div className="mfa-actions">
                <button type="button" className="btn btn--primary" disabled={busy || code.length !== 6} onClick={valider}>{busy ? '…' : 'Vérifier et activer'}</button>
                <button type="button" className="btn btn--ghost" disabled={busy} onClick={annuler}>Annuler</button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mfa-etat on">
              <span className="mfa-pastille" aria-hidden="true" />
              <span className="mfa-etat-txt"><b>Activée le {dateFr(m.facteur.updated_at || m.facteur.created_at)}</b><small>À chaque connexion, un code de votre téléphone est demandé après le mot de passe.</small></span>
              {!m.retrait ? <button type="button" className="btn btn--ghost danger" onClick={() => { setCode(''); setM({ ...m, retrait: true }) }}>Désactiver</button> : null}
            </div>
            {m.retrait ? (
              <div style={{ marginTop: '.9rem' }}>
                <p className="muted" style={{ margin: '0 0 .2rem', fontSize: '.88rem' }}>Pour désactiver, tapez un dernier code de votre application — pour être sûr que c’est bien vous.</p>
                <label htmlFor="mfa-code">Code à 6 chiffres</label>
                {champCode(desactiver)}
                <div className="mfa-actions">
                  <button type="button" className="btn btn--ghost danger" disabled={busy || code.length !== 6} onClick={desactiver}>{busy ? '…' : 'Désactiver la double authentification'}</button>
                  <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => { setCode(''); setM({ ...m, retrait: false }) }}>Garder</button>
                </div>
              </div>
            ) : null}
          </>
        )}
    </div>
  )
}
