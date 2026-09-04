'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Info from '@/app/Info'
import { evaluerMotDePasse, messageFuite, verifierFuite, type Fuite } from '@/lib/motDePasse'
import { api, dateFr, type SectionProps } from './commun'

// Sécurité (sprint J-1 §6) : mot de passe (ancien + nouveau, politique renforcée),
// sessions ouvertes avec fermeture unitaire, et « fermer toutes mes sessions ».
// Pas de 2FA : décision Benj, après la démo — rien n'est affiché à ce sujet.

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
    </>
  )
}
