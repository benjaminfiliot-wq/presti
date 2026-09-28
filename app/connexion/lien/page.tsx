'use client'
import '@/app/globals.css'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Marque from '@/app/Marque'

// /connexion/lien?th=<hashed_token>&commande=<id> : le lien envoyé à l'acheteur après un achat public (fiche 026-027).
//
// Les robots de messagerie ouvrent les liens, et certains en exécutent le JavaScript : cette page ne poste donc RIEN
// au chargement. Elle regarde seulement si l'adresse porte un jeton bien formé ; le jeton n'est consommé (POST
// /api/auth/lien) que par le bouton « Ouvrir mon dossier ». La session rendue est posée par setSession, puis l'acheteur
// part vers /site/commander?commande=<id> : c'est cet écran qui rattache la commande à son compte (par l'adresse de
// la session, jamais par une adresse venue de la page) et l'envoie terminer son inscription si le profil manque.
// Un compte qui a une application d'authentification la passe ensuite, comme partout ailleurs.
//
// Le jeton n'est jamais affiché ni recopié dans un lien ; la page n'est pas indexée et ne transmet pas son adresse
// (referrer) aux ressources qu'elle charge. Métadonnées rendues ici : une page client ne peut pas exporter `metadata`.

type Session = { access_token: string; refresh_token: string }

const FORME_TH = /^[0-9a-f]{20,128}$/i
/** L'identifiant de la commande : un uuid (hexadécimal et tirets). Autre chose est ignoré, jamais recopié. */
const FORME_COMMANDE = /^[0-9a-f-]{8,64}$/i

/** Lit le jeton et la commande dans l'adresse ; un paramètre mal formé vaut null. */
function lireAdresse(): { jeton: string | null; commande: string | null } {
  const q = new URLSearchParams(window.location.search)
  const brut = q.get('th') ?? ''
  const cmd = q.get('commande') ?? ''
  return { jeton: FORME_TH.test(brut) ? brut : null, commande: FORME_COMMANDE.test(cmd) ? cmd : null }
}

export default function LienConnexionPage() {
  // null : l'adresse n'est pas encore lue ; false : le lien est incomplet.
  const [lienLisible, setLienLisible] = useState<boolean | null>(null)
  const [attente, setAttente] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // Lecture seule au chargement : rien n'est posté, aucune session n'est ouverte.
  useEffect(() => { setLienLisible(lireAdresse().jeton !== null) }, [])

  const ouvrirDossier = async () => {
    if (attente) return
    const lu = lireAdresse()
    const th = lu.jeton
    if (!th) { setLienLisible(false); return }
    setAttente(true); setMsg(null)
    const r = await fetch('/api/auth/lien', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ th }), cache: 'no-store' }).catch(() => null)
    const d = (r ? await r.json().catch(() => ({})) : {}) as { ok?: boolean; session?: Session; error?: string }
    if (!r || !r.ok || !d.session) {
      setMsg(d.error ?? 'Connexion impossible pour l’instant. Réessayez dans un instant.')
      setAttente(false)
      return
    }
    const { error } = await supabase.auth.setSession(d.session)
    if (error) { setMsg('Connexion impossible pour l’instant. Réessayez dans un instant.'); setAttente(false); return }
    // replace : l'adresse qui portait le jeton sort de l'historique du navigateur.
    window.location.replace(lu.commande ? `/site/commander?commande=${encodeURIComponent(lu.commande)}` : '/site/commander')
  }

  return (
    <main className="wrap">
      <meta name="robots" content="noindex, nofollow" />
      <meta name="referrer" content="no-referrer" />
      <div className="card">
        <div className="brand"><i className="marque" aria-hidden="true"><Marque size={24} /></i>Presti</div>
        {lienLisible === false ? (
          <>
            <h1>Ce lien est incomplet</h1>
            <p className="muted" style={{ margin: '0 0 .4rem' }}>
              Ouvrez le lien tel qu’il figure dans l’e-mail de votre commande. S’il a déjà servi ou a expiré, la page de
              confirmation de votre commande vous permet d’en recevoir un nouveau.
            </p>
            <p className="muted" style={{ marginTop: '.9rem', textAlign: 'center' }}>
              <a href="/login">Se connecter autrement</a>
            </p>
          </>
        ) : (
          <>
            <h1>Votre dossier vous attend</h1>
            <p className="muted" style={{ margin: '0 0 .4rem' }}>
              Merci pour votre commande. Ce lien personnel ouvre votre espace Presti : il ne sert qu’une fois.
            </p>
            <button type="button" onClick={ouvrirDossier} disabled={attente || lienLisible === null}>
              {attente ? '…' : 'Ouvrir mon dossier'}
            </button>
            {msg && <div className="msg err" role="alert">{msg}</div>}
            <p className="muted" style={{ marginTop: '.9rem', textAlign: 'center' }}>
              Vous n’êtes pas à l’origine de cette commande ? Ne cliquez pas, et répondez à l’e-mail reçu.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
