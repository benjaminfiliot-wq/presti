'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Messages → Canaux : relier WhatsApp Business, une Page Facebook (Messenger) ou un compte Instagram professionnel.
// Rendu SEULEMENT drapeau levé (canauxWhatsapp / canauxReseaux, voir page.tsx) ; chaque canal n'apparaît que s'il est ouvert.
//
// Voie actuelle : saisie accompagnée (identifiant + jeton), vérifiée auprès de Meta avant d'être enregistrée. La connexion
// « en un clic » (Embedded Signup pour WhatsApp, Facebook Login for Business pour les Pages) demande que l'application Meta de
// Presti ait passé l'examen de Meta : elle remplacera ce formulaire, pas la vérification derrière.

type Liaison = { id: string; type: 'whatsapp' | 'messenger' | 'instagram'; libelle: string | null; actif: boolean; derniere_erreur: string | null }
type EtatCanal = { ouvert: boolean; formule: boolean; verrou: string }
type Etat = {
  liaisons: Liaison[]; chiffrement: boolean
  application: { id: string | null; prete: boolean }
  canaux: Record<'whatsapp' | 'messenger' | 'instagram', EtatCanal>
}
const NOMS = { whatsapp: 'WhatsApp Business', messenger: 'Messenger (Page Facebook)', instagram: 'Instagram' } as const
const ICONES = { whatsapp: '☏', messenger: '✉', instagram: '◎' } as const

export default function CanauxMeta() {
  const [etat, setEtat] = useState<Etat | null>(null)
  const [ouvert, setOuvert] = useState<'whatsapp' | 'messenger' | 'instagram' | null>(null)
  const [compte, setCompte] = useState('')
  const [waba, setWaba] = useState('')
  const [jeton, setJeton] = useState('')
  const [parInstagram, setParInstagram] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const entete = async () => ({ Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` })
  const charger = useCallback(async () => {
    const r = await fetch('/api/canaux/meta/liaison', { headers: await entete() })
    if (r.ok) setEtat(await r.json())
  }, [])
  useEffect(() => { void charger() }, [charger])

  async function relier() {
    if (!ouvert || busy) return
    setBusy(true); setMsg(null)
    const r = await fetch('/api/canaux/meta/liaison', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(await entete()) },
      body: JSON.stringify({ canal: ouvert, compte: compte.trim(), jeton: jeton.trim(), waba_id: waba.trim(), hote: ouvert === 'instagram' && parInstagram ? 'graph.instagram.com' : 'graph.facebook.com' }),
    })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setMsg({ type: 'err', text: d.error ?? 'Connexion impossible.' }); return }
    setJeton(''); setCompte(''); setWaba(''); setOuvert(null)
    setMsg({ type: 'ok', text: d.message ?? 'Canal relié.' })
    await charger()
  }

  async function deconnecter(l: Liaison) {
    if (!confirm(`Déconnecter ${l.libelle ?? NOMS[l.type]} ?\n\nLes conversations déjà reçues restent dans votre boîte de réception.`)) return
    await fetch(`/api/canaux?id=${l.id}`, { method: 'DELETE', headers: await entete() })
    await charger()
  }

  if (!etat) return null
  const visibles = (['whatsapp', 'messenger', 'instagram'] as const).filter((c) => etat.canaux[c].ouvert)
  if (visibles.length === 0) return null

  return (
    <div className="tool-card">
      <h2>WhatsApp, Messenger, Instagram</h2>
      <p className="muted" style={{ margin: '0 0 1rem' }}>
        Vos clients vous écrivent là où ils ont l’habitude ; leurs messages arrivent ici, l’assistant prépare une réponse, vous la relisez et la validez — elle repart sur le même canal. Rien ne part sans vous.
      </p>

      {etat.liaisons.length > 0 ? (
        <div className="canaux-liste" style={{ marginBottom: '1rem' }}>
          {etat.liaisons.map((l) => (
            <div className="canal" key={l.id}>
              <span className="canal-ic" aria-hidden="true">{ICONES[l.type]}</span>
              <span className="canal-id">
                <b>{NOMS[l.type]}</b>
                <small>{l.libelle}</small>
                {l.derniere_erreur ? <em className="canal-err">{l.derniere_erreur}</em> : null}
              </span>
              <span className={`pill ${l.actif && !l.derniere_erreur ? 'ok' : 'warn'}`}><span className="pdot" />{l.actif && !l.derniere_erreur ? 'Relié' : 'À vérifier'}</span>
              <button className="canal-x" onClick={() => deconnecter(l)}>Déconnecter</button>
            </div>
          ))}
        </div>
      ) : null}

      {!etat.application.prete ? (
        <p className="muted" style={{ margin: 0 }}>La connexion de ces canaux n’est pas encore disponible sur votre espace. Écrivez-nous : nous la faisons avec vous.</p>
      ) : !etat.chiffrement ? (
        <p className="muted" style={{ color: 'var(--crit)', margin: 0 }}>Le stockage sécurisé n’est pas disponible sur le serveur : la connexion est désactivée (on ne stocke jamais un jeton en clair).</p>
      ) : (
        <>
          <div className="pil-filtres" role="tablist" aria-label="Canal à relier">
            {visibles.map((c) => (
              <button key={c} type="button" role="tab" aria-selected={ouvert === c} className={ouvert === c ? 'on' : ''} onClick={() => { setOuvert(c); setMsg(null) }}>{NOMS[c]}</button>
            ))}
          </div>

          {ouvert && !etat.canaux[ouvert].formule ? <p className="muted" style={{ marginTop: '.8rem' }}>{etat.canaux[ouvert].verrou}</p> : null}

          {ouvert && etat.canaux[ouvert].formule ? (
            <div style={{ marginTop: '.8rem' }}>
              {ouvert === 'whatsapp' ? (
                <ol className="muted" style={{ margin: '0 0 .8rem', paddingLeft: '1.2rem', fontSize: '.88rem', lineHeight: 1.55 }}>
                  <li>Votre numéro doit être un numéro <b>WhatsApp Business Platform</b> (l’« API Cloud »), pas l’application WhatsApp Business du téléphone : un numéro ne peut pas être sur les deux.</li>
                  <li>Dans <b>WhatsApp Manager</b> (business.facebook.com → Comptes WhatsApp), relevez l’<b>ID du compte WhatsApp Business</b> et, dans « Numéros de téléphone », l’<b>ID du numéro</b> (« Phone number ID »).</li>
                  <li>Dans <b>Paramètres de l’entreprise → Utilisateurs système</b>, générez un jeton pour l’application Presti{etat.application.id ? ` (ID ${etat.application.id})` : ''} avec les permissions <b>whatsapp_business_messaging</b> et <b>whatsapp_business_management</b>, sans date d’expiration.</li>
                  <li>Collez les trois ci-dessous : Presti vérifie auprès de Meta que le jeton ouvre bien ce numéro, puis s’abonne à ses messages.</li>
                </ol>
              ) : (
                <ol className="muted" style={{ margin: '0 0 .8rem', paddingLeft: '1.2rem', fontSize: '.88rem', lineHeight: 1.55 }}>
                  {ouvert === 'instagram' ? <li>Votre compte Instagram doit être <b>professionnel</b> et, pour la voie recommandée, <b>relié à votre Page Facebook</b> (Paramètres de la Page → Comptes liés). Dans Instagram → Paramètres → Messages, autorisez l’accès aux messages pour les outils connectés.</li> : null}
                  <li>Relevez l’<b>ID de votre Page</b> (Page → À propos → Transparence de la Page, ou dans l’adresse de Meta Business Suite).</li>
                  <li>Autorisez l’application Presti{etat.application.id ? ` (ID ${etat.application.id})` : ''} sur votre Page et copiez le <b>jeton d’accès</b> obtenu (permissions <b>pages_messaging</b>, <b>pages_manage_metadata</b>{ouvert === 'instagram' ? <>, <b>instagram_basic</b>, <b>instagram_manage_messages</b></> : null}). Presti l’échange contre un jeton de Page qui n’expire pas.</li>
                  <li>Collez-les ci-dessous : Presti vérifie que le jeton ouvre bien cette Page, puis s’abonne à ses messages.</li>
                </ol>
              )}

              {ouvert === 'instagram' ? (
                <label style={{ display: 'flex', gap: '.5rem', alignItems: 'center', fontWeight: 400 }}>
                  <input type="checkbox" checked={parInstagram} onChange={(e) => setParInstagram(e.target.checked)} style={{ width: 'auto' }} />
                  Mon compte n’est pas relié à une Page : j’ai un jeton « Instagram Login » (ID du compte Instagram au lieu de l’ID de Page)
                </label>
              ) : null}
              {ouvert === 'whatsapp' ? (<><label>ID du compte WhatsApp Business</label><input inputMode="numeric" value={waba} onChange={(e) => setWaba(e.target.value)} placeholder="ex. 1029384756" autoComplete="off" /></>) : null}
              <label>{ouvert === 'whatsapp' ? 'ID du numéro (Phone number ID)' : ouvert === 'instagram' && parInstagram ? 'ID du compte Instagram professionnel' : 'ID de la Page Facebook'}</label>
              <input inputMode="numeric" value={compte} onChange={(e) => setCompte(e.target.value)} placeholder="une suite de chiffres" autoComplete="off" />
              <label>Jeton d’accès</label>
              <input type="password" value={jeton} onChange={(e) => setJeton(e.target.value)} placeholder="Collez le jeton en entier" autoComplete="new-password" />
              <button className="btn btn--primary" style={{ display: 'block', width: 'auto', marginTop: '1rem' }} disabled={busy || !compte || !jeton || (ouvert === 'whatsapp' && !waba)} onClick={relier}>
                {busy ? 'Vérification auprès de Meta…' : `Relier ${NOMS[ouvert]}`}
              </button>
              <p className="muted" style={{ margin: '.6rem 0 0', fontSize: '.82rem' }}>
                Le jeton est <b>chiffré</b> avant d’être enregistré et n’est jamais réaffiché. Règle de Meta : passé <b>24 heures</b> après le dernier message de votre client, une entreprise ne peut plus lui écrire librement — Presti vous le dira au lieu d’envoyer.
              </p>
            </div>
          ) : null}
        </>
      )}
      {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`} style={{ marginTop: '.8rem' }}>{msg.text}</div>}
    </div>
  )
}
