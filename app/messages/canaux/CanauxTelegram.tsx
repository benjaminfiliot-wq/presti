'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Messages → Canaux → Telegram (21/10/2026, drapeau canauxTelegram ; rendu SEULEMENT drapeau levé, voir page.tsx).
// L'artisan crée SON bot avec @BotFather et colle le jeton : Presti le vérifie, le chiffre, pose le webhook. Les messages que ses
// clients écrivent au bot arrivent dans Messages ; la réponse validée (ou partie par le Pilote automatique) repart dans Telegram.

type Bot = { id: string; libelle: string | null; adresse: string; actif: boolean; derniere_erreur: string | null }

export default function CanauxTelegram() {
  const [bots, setBots] = useState<Bot[] | null>(null)
  const [verrou, setVerrou] = useState<string | null>(null)
  const [chiffrement, setChiffrement] = useState(true)
  const [jeton, setJeton] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const entete = async () => ({ Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` })
  const charger = useCallback(async () => {
    const r = await fetch('/api/canaux/telegram', { headers: await entete() })
    const d = await r.json().catch(() => ({}))
    if (r.status === 403) { setVerrou(d.error ?? 'Non disponible avec votre offre.'); setBots([]); return }
    if (r.ok) { setBots(d.bots ?? []); setChiffrement(d.chiffrement !== false) }
  }, [])
  useEffect(() => { void charger() }, [charger])

  async function relier() {
    if (busy) return
    setBusy(true); setMsg(null)
    const r = await fetch('/api/canaux/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await entete()) }, body: JSON.stringify({ jeton: jeton.trim() }) })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setMsg({ type: 'err', text: d.error ?? 'Connexion impossible.' }); return }
    setJeton('')
    setMsg({ type: 'ok', text: d.message ?? 'Bot relié.' })
    await charger()
  }

  async function deconnecter(b: Bot) {
    if (!confirm(`Déconnecter ${b.adresse} ?\n\nLes conversations déjà reçues restent dans votre boîte de réception.`)) return
    const r = await fetch(`/api/canaux/telegram?id=${encodeURIComponent(b.id)}`, { method: 'DELETE', headers: await entete() })
    const d = await r.json().catch(() => ({}))
    setMsg({ type: r.ok ? 'ok' : 'err', text: d.message ?? d.error ?? '' })
    await charger()
  }

  if (bots === null) return null

  return (
    <div className="tool-card">
      <h2>Telegram</h2>
      <p className="muted" style={{ margin: '0 0 1rem' }}>
        Vos clients écrivent à <b>votre</b> bot Telegram ; leurs messages arrivent ici, l’assistant prépare une réponse, vous la validez — elle repart dans Telegram, au nom de votre bot.
      </p>
      {verrou ? <p className="muted" style={{ margin: 0 }}>{verrou}</p> : (
        <>
          {bots.length > 0 ? (
            <div className="canaux-liste" style={{ marginBottom: '1rem' }}>
              {bots.map((b) => (
                <div className="canal" key={b.id}>
                  <span className="canal-ic" aria-hidden="true">✈</span>
                  <span className="canal-id">
                    <b>{b.libelle || 'Bot Telegram'}</b>
                    <small>{b.adresse}</small>
                    {b.derniere_erreur ? <em className="canal-err">{b.derniere_erreur}</em> : null}
                  </span>
                  <span className={`pill ${b.actif && !b.derniere_erreur ? 'ok' : 'warn'}`}><span className="pdot" />{b.actif && !b.derniere_erreur ? 'Relié' : 'À vérifier'}</span>
                  <button className="canal-x" onClick={() => deconnecter(b)}>Déconnecter</button>
                </div>
              ))}
            </div>
          ) : null}
          {!chiffrement ? (
            <p className="muted" style={{ color: 'var(--crit)', margin: 0 }}>Le stockage sécurisé n’est pas disponible sur le serveur : la connexion est désactivée (on ne stocke jamais un jeton en clair).</p>
          ) : (
            <>
              <ol className="muted" style={{ margin: '0 0 .8rem', paddingLeft: '1.2rem', fontSize: '.88rem', lineHeight: 1.55 }}>
                <li>Dans Telegram, ouvrez la conversation avec <b>@BotFather</b> (le compte officiel, coche bleue) et envoyez <b>/newbot</b>.</li>
                <li>Donnez un nom (celui de votre entreprise) puis un identifiant qui finit par « bot » (ex. <i>plomberie_dupont_bot</i>).</li>
                <li>BotFather vous répond avec un <b>jeton</b> (« 123456789:AA… ») : collez-le ci-dessous. Ne le donnez à personne d’autre.</li>
                <li>Partagez le lien <b>t.me/votre_bot</b> à vos clients (site, carte de visite, réseaux).</li>
              </ol>
              <label>Jeton du bot</label>
              <input type="password" value={jeton} onChange={(e) => setJeton(e.target.value)} placeholder="123456789:AA…" autoComplete="new-password" />
              <button className="btn btn--primary" style={{ display: 'block', width: 'auto', marginTop: '1rem' }} disabled={busy || !jeton.trim()} onClick={relier}>
                {busy ? 'Vérification auprès de Telegram…' : 'Relier mon bot'}
              </button>
              <p className="muted" style={{ margin: '.6rem 0 0', fontSize: '.82rem' }}>
                Le jeton est <b>chiffré</b> avant d’être enregistré et n’est jamais réaffiché. Un bot ne peut pas écrire en premier : il répond aux clients qui lui ont écrit.
              </p>
            </>
          )}
        </>
      )}
      {msg && msg.text ? <div className={`msg ${msg.type === 'err' ? 'err' : ''}`} style={{ marginTop: '.8rem' }}>{msg.text}</div> : null}
    </div>
  )
}
