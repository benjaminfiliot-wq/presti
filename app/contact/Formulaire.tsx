'use client'

import { useEffect, useState } from 'react'
import { actif } from '@/lib/flags'
import { DEMO_ENTREPRISE as D } from '@/lib/landing/contenu'

// Le formulaire de contact public. Il remplace l'adresse email de l'entreprise, dont la boîte
// n'existe pas : un message écrit ici arrive vraiment, et son auteur en a la confirmation à
// l'écran. Une adresse publiée qui jette le courrier ne dit rien à personne.
//
// 02/11 (chantier 2, lot 6) : le volet « démo Entreprise », derrière le drapeau `landingV2`. Le motif se lit DANS LE NAVIGATEUR
// (/contact?motif=entreprise), jamais par le serveur : la page reste statique. La route /api/contact ne change pas : le message est
// composé ici à partir des choix (« [Démo entreprise] Équipe : 2 à 5 · activité : Architecte »), ce qui tient ses gardes (10 caractères
// au moins, champ piège, 3 envois par heure). Motif, taille et activité partent AUSSI en champs séparés : la route les ignore
// aujourd'hui, le lot L19 du chantier 4 les rangera (table demandes_demo, workflow n8n). Ni téléphone, ni délai promis.

function Ensuite() {
  return (
    <div className="ct-ensuite">
      <b>{D.ensuiteTitre}</b>
      <ol>{D.ensuite.map((t) => <li key={t}>{t}</li>)}</ol>
    </div>
  )
}

type Champ = 'prenom' | 'email' | 'taille' | 'activite'
const COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** L'erreur d'un champ, ou '' s'il est bon. */
function verifier(c: Champ, v: string): string {
  if (c === 'prenom') return v.trim() ? '' : D.erreurs.prenom
  if (c === 'email') return COURRIEL.test(v.trim()) ? '' : D.erreurs.email
  return v ? '' : D.erreurs[c]
}

// 033-005 (critique 033-004, défaut 24) : chaque erreur s'affiche SOUS son champ, dès qu'on le quitte (puis se corrige pendant la
// saisie), avec aria-invalid et aria-describedby ; à l'envoi, le focus va au premier champ à reprendre. Le titre de la page est le h1
// (app/contact/page.tsx) : le volet ne le répète plus.
function DemoEntreprise() {
  const [valeurs, setValeurs] = useState<Record<Champ, string>>({ prenom: '', email: '', taille: '', activite: '' })
  const [message, setMessage] = useState('')
  const [societe, setSociete] = useState('') // champ piège
  const [envoi, setEnvoi] = useState(false)
  const [fini, setFini] = useState(false)
  const [erreurs, setErreurs] = useState<Partial<Record<Champ, string>>>({})
  const [erreurEnvoi, setErreurEnvoi] = useState('')

  const changer = (c: Champ, v: string) => {
    setValeurs((x) => ({ ...x, [c]: v }))
    if (erreurs[c]) setErreurs((e) => ({ ...e, [c]: verifier(c, v) }))
  }
  const quitter = (c: Champ) => setErreurs((e) => ({ ...e, [c]: verifier(c, valeurs[c]) }))
  const relie = (c: Champ) => ({
    id: `demo-${c}`, 'aria-invalid': erreurs[c] ? true : undefined, 'aria-describedby': erreurs[c] ? `demo-${c}-erreur` : undefined,
    onBlur: () => quitter(c),
  })
  const erreur = (c: Champ) => (erreurs[c] ? <span className="ct-err-champ" id={`demo-${c}-erreur`}>{erreurs[c]}</span> : null)

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    if (envoi) return
    const toutes = Object.fromEntries((Object.keys(valeurs) as Champ[]).map((c) => [c, verifier(c, valeurs[c])])) as Record<Champ, string>
    setErreurs(toutes)
    const premier = (Object.keys(toutes) as Champ[]).find((c) => toutes[c])
    if (premier) { document.getElementById(`demo-${premier}`)?.focus(); return }
    setEnvoi(true)
    setErreurEnvoi('')
    const { prenom, email, taille, activite } = valeurs
    try {
      const corps = `[Démo entreprise] Équipe : ${taille} · activité : ${activite}${message.trim() ? `\n\n${message.trim()}` : ''}`
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: prenom.trim(), email: email.trim(), message: corps, societe, motif: 'entreprise', taille, activite }),
      })
      if (r.ok) setFini(true)
      else setErreurEnvoi(D.erreurs.envoi)
    } catch {
      setErreurEnvoi(D.erreurs.envoi)
    } finally {
      setEnvoi(false)
    }
  }

  if (fini) {
    return (
      <div className="ct-demo" role="status">
        <p className="ct-ok">{D.merci}</p>
        <Ensuite />
      </div>
    )
  }

  return (
    <div className="ct-demo">
      <Ensuite />
      <form className="ct-form" onSubmit={envoyer} noValidate>
        <label className="ct-champ"><span>Prénom</span><input {...relie('prenom')} value={valeurs.prenom} onChange={(e) => changer('prenom', e.target.value)} required maxLength={120} autoComplete="given-name" />{erreur('prenom')}</label>
        <label className="ct-champ"><span>E-mail</span><input {...relie('email')} type="email" value={valeurs.email} onChange={(e) => changer('email', e.target.value)} required maxLength={200} autoComplete="email" />{erreur('email')}</label>
        <label className="ct-champ"><span>Taille de l’équipe</span>
          <select {...relie('taille')} value={valeurs.taille} onChange={(e) => changer('taille', e.target.value)} required>
            <option value="">Choisir</option>
            {D.tailles.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {erreur('taille')}
        </label>
        {valeurs.taille === '1' ? <p className="ct-seul">Vous travaillez seul ? Vous pouvez aussi <a href="/signup">Essayer Presti</a> directement.</p> : null}
        <label className="ct-champ"><span>Activité</span>
          <select {...relie('activite')} value={valeurs.activite} onChange={(e) => changer('activite', e.target.value)} required>
            <option value="">Choisir</option>
            {D.activites.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          {erreur('activite')}
        </label>
        <label className="ct-champ"><span>Message</span>
          <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={3800} />
          <em>{D.aideMessage}</em>
        </label>
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
          <label>Société<input tabIndex={-1} autoComplete="off" value={societe} onChange={(e) => setSociete(e.target.value)} /></label>
        </div>
        {erreurEnvoi ? <p className="ct-err" role="alert">{erreurEnvoi}</p> : null}
        <button type="submit" className="btn btn--ghost" disabled={envoi}>{envoi ? 'Envoi…' : 'Envoyer ma demande'}</button>
        <p className="ct-mention">{D.mention} <a href="/confidentialite">Confidentialité</a></p>
      </form>
      <dl className="ct-decideurs">
        {D.decideurs.map((d) => (
          <div key={d.titre}><dt>{d.titre}</dt><dd>{d.texte}{d.lien ? <> <a href={d.lien.href}>{d.lien.texte}</a></> : null}</dd></div>
        ))}
      </dl>
    </div>
  )
}

export default function Formulaire() {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [societe, setSociete] = useState('') // champ piège, invisible : seuls les robots le remplissent
  const [envoi, setEnvoi] = useState(false)
  const [etat, setEtat] = useState<{ type: 'ok' | 'err'; texte: string } | null>(null)
  const [demo, setDemo] = useState(false)

  // Le motif « entreprise » ne vaut que drapeau levé : baissé, /contact reste le formulaire de toujours.
  useEffect(() => {
    if (actif('landingV2') && new URLSearchParams(window.location.search).get('motif') === 'entreprise') setDemo(true)
  }, [])

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    if (envoi) return
    setEnvoi(true)
    setEtat(null)
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, email, message, societe }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        setEtat({ type: 'ok', texte: 'Message reçu. Vous aurez une réponse à cette adresse, en général sous 24 h.' })
        setNom(''); setEmail(''); setMessage('')
      } else {
        setEtat({ type: 'err', texte: d.error ?? 'Votre message n’a pas pu partir. Réessayez dans un moment.' })
      }
    } catch {
      setEtat({ type: 'err', texte: 'Connexion interrompue. Votre message n’est pas parti — réessayez.' })
    } finally {
      setEnvoi(false)
    }
  }

  if (demo) return <DemoEntreprise />

  return (
    <form className="ct-form ct-form--support" onSubmit={envoyer} noValidate>
      <label className="ct-champ">
        <span>Votre nom</span>
        <input value={nom} onChange={(e) => setNom(e.target.value)} required maxLength={120} autoComplete="name" />
      </label>

      <label className="ct-champ">
        <span>Votre email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} autoComplete="email" />
        <em>C’est là que la réponse arrivera.</em>
      </label>

      <label className="ct-champ">
        <span>Votre message</span>
        <textarea rows={7} value={message} onChange={(e) => setMessage(e.target.value)} required maxLength={4000} />
      </label>

      {/* Piège à robots : caché à l'œil ET aux lecteurs d'écran, jamais rempli par un humain. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
        <label>Société<input tabIndex={-1} autoComplete="off" value={societe} onChange={(e) => setSociete(e.target.value)} /></label>
      </div>

      <button type="submit" className="btn btn--primary" disabled={envoi}>
        {envoi ? 'Envoi…' : 'Envoyer le message'}
      </button>

      {etat ? <p className={etat.type === 'ok' ? 'ct-ok' : 'ct-err'} role="status">{etat.texte}</p> : null}
    </form>
  )
}
