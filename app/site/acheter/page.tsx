'use client'

import { useState, type FormEvent } from 'react'
import { notFound } from 'next/navigation'
import { actif } from '@/lib/flags'
import { PRIX_SITE_TEXTE, DELAI_ANNONCE } from '@/lib/siteCommande'

export default function AcheterSite() {
  const [email, setEmail] = useState('')
  const [entreprise, setEntreprise] = useState('')
  const [metier, setMetier] = useState('')
  const [commune, setCommune] = useState('')
  const [cgu, setCgu] = useState(false)
  const [renonciationRetractation, setRenonciationRetractation] = useState(false)
  const [website, setWebsite] = useState('')
  const [erreur, setErreur] = useState('')
  const [attente, setAttente] = useState(false)

  if (!actif('siteAchatPublic') || !actif('siteCommande')) notFound()

  async function envoyer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttente(true)
    setErreur('')
    try {
      const reponse = await fetch('/api/site/commander/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, entreprise, metier, commune, cgu, renonciationRetractation, website }),
      })
      const donnees = await reponse.json().catch(() => ({}))
      if (!reponse.ok || typeof donnees.url !== 'string') throw new Error(donnees.error || 'Le paiement est momentanément indisponible.')
      window.location.assign(donnees.url)
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : 'Une erreur est survenue.')
      setAttente(false)
    }
  }

  return <main className="wrap" style={{ maxWidth: 720, paddingBlock: '3rem' }}>
    <div className="card" style={{ padding: 'clamp(1.25rem, 4vw, 2.5rem)' }}>
      <h1>Commander votre site</h1>
      <p>Votre site : <strong>{PRIX_SITE_TEXTE}</strong>, paiement unique. TVA non applicable (art. 293 B du CGI).</p>
      <p>En ligne sous {DELAI_ANNONCE} après validation par Presti.</p>
      <form onSubmit={envoyer} style={{ display: 'grid', gap: '1rem' }}>
        <label>E-mail<input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Nom de l’entreprise<input name="entreprise" required minLength={2} maxLength={80} value={entreprise} onChange={e => setEntreprise(e.target.value)} /></label>
        <label>Métier<input name="metier" required minLength={2} maxLength={60} value={metier} onChange={e => setMetier(e.target.value)} /></label>
        <label>Commune principale<input name="commune" required minLength={2} maxLength={80} value={commune} onChange={e => setCommune(e.target.value)} /></label>
        <div style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
          <label>Site web<input name="website" tabIndex={-1} aria-hidden="true" autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '.65rem' }}><input type="checkbox" required checked={cgu} onChange={e => setCgu(e.target.checked)} style={{ width: 'auto', marginTop: '.2rem' }} /><span>J’accepte les <a href="/cgu#site">CGU, article 3 bis</a>.</span></label>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '.65rem' }}><input type="checkbox" required checked={renonciationRetractation} onChange={e => setRenonciationRetractation(e.target.checked)} style={{ width: 'auto', marginTop: '.2rem' }} /><span>Je demande le début de la réalisation avant la fin du délai de rétractation et reconnais perdre ce droit une fois le site entièrement livré. <a href="/cgu#retractation">Voir les conditions</a>.</span></label>
        {erreur && <p className="msg err" role="alert">{erreur}</p>}
        <button className="btn btn--primary" disabled={attente}>{attente ? 'Ouverture du paiement…' : `Continuer — ${PRIX_SITE_TEXTE}`}</button>
      </form>
    </div>
  </main>
}
