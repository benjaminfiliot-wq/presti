'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import Info from '@/app/Info'
import { actif } from '@/lib/flags'
import CanauxMeta from './CanauxMeta'

// Messages → Canaux (v4 §B2). Voie IMAP/SMTP : marche avec N'IMPORTE QUELLE boîte email
// (OVH, Gmail, Orange, Free…) sans dépendre d'une application OAuth tierce.
// Le mot de passe est chiffré côté serveur avant d'entrer en base, et la connexion est
// TESTÉE avant enregistrement — pas de canal fantôme qui échoue en silence.

type Canal = {
  id: string; type: string; libelle: string | null; adresse: string
  imap_hote: string | null; imap_port: number | null; actif: boolean
  derniere_releve: string | null; derniere_erreur: string | null
}

export default function CanauxPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [canaux, setCanaux] = useState<Canal[]>([])
  const [chiffrement, setChiffrement] = useState(true)
  const [adresse, setAdresse] = useState('')
  const [mdp, setMdp] = useState('')
  const [avance, setAvance] = useState(false)
  const [imapHote, setImapHote] = useState('')
  const [imapPort, setImapPort] = useState(993)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token

  async function charger() {
    const t = await jeton()
    const d = await (await fetch('/api/canaux', { headers: { Authorization: `Bearer ${t}` } })).json()
    setCanaux(d.canaux ?? []); setChiffrement(d.chiffrement !== false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      await charger()
      setReady(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function brancher() {
    if (busy) return
    setBusy(true); setMsg(null)
    const t = await jeton()
    const res = await fetch('/api/canaux', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ adresse, mot_de_passe: mdp, ...(avance ? { imap_hote: imapHote, imap_port: imapPort } : {}) }),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Connexion impossible.' }); return }
    setMdp(''); setAdresse(''); setAvance(false)
    setMsg({ type: 'ok', text: d.message || 'Boîte connectée ✅' })
    await charger()
  }

  async function relever() {
    if (busy) return
    setBusy(true); setMsg(null)
    const t = await jeton()
    const r = await fetch('/api/canaux/relever', { method: 'POST', headers: { Authorization: `Bearer ${t}` } })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    setMsg({ type: d.ok ? 'ok' : 'err', text: d.message || d.error || 'Relève impossible.' })
    await charger()
  }

  async function deconnecter(id: string, adr: string) {
    if (!confirm(`Déconnecter ${adr} ?\n\nVos messages déjà reçus restent dans votre boîte de réception.`)) return
    const t = await jeton()
    await fetch(`/api/canaux?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } })
    setMsg({ type: 'ok', text: 'Canal déconnecté.' })
    await charger()
  }

  if (!ready) return <AppShell active="messages" title="Canaux"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>

  return (
    <AppShell active="messages" title="Canaux" crumb="Messages" actions={<a className="btn btn--ghost" style={{ width: 'auto' }} href="/messages">← Boîte de réception</a>}>
      <div className="prof-grid">
        <div className="tool-card">
          <h2>Vos boîtes connectées</h2>
          <p className="muted" style={{ margin: '0 0 1rem' }}>
            Reliez votre adresse email : les demandes qui y arrivent viendront se ranger dans votre boîte de réception Presti, à côté de celles de votre plateforme.
          </p>
          {canaux.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Aucune boîte connectée pour l’instant.</p>
          ) : (
            <div className="canaux-liste">
              {canaux.map((c) => (
                <div className="canal" key={c.id}>
                  <span className="canal-ic" aria-hidden="true">✉</span>
                  <span className="canal-id">
                    <b>{c.libelle || 'Boîte email'}</b>
                    <small>{c.adresse}{c.imap_hote ? ` · ${c.imap_hote}` : ''}</small>
                    {c.derniere_erreur ? <em className="canal-err">{c.derniere_erreur}</em> : null}
                  </span>
                  <span className={`pill ${c.actif && !c.derniere_erreur ? 'ok' : 'warn'}`}><span className="pdot" />{c.actif && !c.derniere_erreur ? 'Connectée' : 'À vérifier'}</span>
                  <button className="canal-x" onClick={() => deconnecter(c.id, c.adresse)}>Déconnecter</button>
                </div>
              ))}
            </div>
          )}
          {canaux.length > 0 ? (
            <>
              <button className="btn btn--ghost" style={{ display: 'block', width: 'auto', marginTop: '1rem' }} disabled={busy} onClick={relever}>
                {busy ? 'Relève en cours…' : '↻ Relever maintenant'}
              </button>
              <p className="muted" style={{ margin: '.5rem 0 0', fontSize: '.82rem' }}>
                Vos boîtes sont relevées automatiquement chaque matin, et à chaque fois que vous ouvrez vos messages.
              </p>
            </>
          ) : null}
        </div>

        <div className="tool-card">
          <h2>Connecter une boîte email</h2>
          {!chiffrement ? (
            <p className="muted" style={{ color: 'var(--crit)' }}>Le stockage sécurisé n’est pas disponible sur le serveur : la connexion est désactivée (on ne stocke jamais un mot de passe en clair).</p>
          ) : (
            <>
              <p className="muted" style={{ margin: '0 0 1rem' }}>
                Fonctionne avec <b>n’importe quelle</b> adresse (OVH, Gmail, Orange, Free, La Poste…). On reconnaît les réglages tout seul — vous n’avez que votre adresse et votre mot de passe à saisir.
              </p>
              <label>Votre adresse email <Info cle="canaux.adresse" /></label>
              <input type="email" value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="contact@mon-entreprise.fr" autoComplete="off" />
              <label>Mot de passe <Info cle="canaux.mot_de_passe" /></label>
              <input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} placeholder="Mot de passe de la boîte" autoComplete="new-password" />
              <p className="muted" style={{ margin: '.45rem 0 0', fontSize: '.83rem' }}>
                ⚠️ Avec <b>Gmail</b> ou <b>Outlook</b>, votre mot de passe habituel ne fonctionne pas : créez un <b>« mot de passe d’application »</b> dans les réglages de sécurité de votre compte, et collez-le ici.
              </p>
              <button type="button" className="canal-avance" onClick={() => setAvance((v) => !v)}>{avance ? '− Réglages du serveur' : '+ Mon serveur n’est pas reconnu'}</button>
              {avance ? (
                <div className="pcfg-heures">
                  <span>Serveur IMAP</span>
                  <input value={imapHote} onChange={(e) => setImapHote(e.target.value)} placeholder="imap.mon-hebergeur.fr" style={{ minWidth: 220 }} />
                  <span>port</span>
                  <input type="number" value={imapPort} onChange={(e) => setImapPort(Number(e.target.value))} style={{ width: 90 }} />
                </div>
              ) : null}
              <button className="btn btn--primary" style={{ display: 'block', width: 'auto', marginTop: '1.1rem' }} disabled={busy || !adresse || !mdp} onClick={brancher}>
                {busy ? 'Vérification de la connexion…' : 'Connecter ma boîte'}
              </button>
              <p className="muted" style={{ margin: '.6rem 0 0', fontSize: '.82rem' }}>
                Votre mot de passe est <b>chiffré</b> avant d’être enregistré, et la connexion est <b>testée</b> avant de valider : si ça ne marche pas, on vous le dit tout de suite.
              </p>
            </>
          )}
        </div>

        {/* « Une fonctionnalité non finie n'apparaît pas » : ce bloc ne parle des autres canaux que lorsqu'ils existent. */}
        {(actif('canauxWhatsapp') || actif('canauxReseaux')) && <CanauxMeta />}

        {actif('canauxLeboncoin') && <div className="tool-card">
          <h2>Le Bon Coin</h2>
          <p className="muted" style={{ margin: 0 }}>
            Le Bon Coin ne permet à aucun logiciel de lire ou d’envoyer vos messages. Mais il vous prévient par e-mail à chaque nouveau message : connectez ci-dessus la boîte qui reçoit ces e-mails, et chaque message arrive dans votre boîte de réception avec une réponse préparée. Un clic la copie et ouvre la conversation sur Le Bon Coin : vous n’avez qu’à la coller.
          </p>
          <p className="muted" style={{ margin: '.5rem 0 0', fontSize: '.82rem' }}>
            Quand l’e-mail ne recopie pas le texte du message, vous êtes prévenu et la conversation s’ouvre sur Le Bon Coin pour le lire.
          </p>
        </div>}

        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`}>{msg.text}</div>}
      </div>
    </AppShell>
  )
}
