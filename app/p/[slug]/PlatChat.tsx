'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { compressPhotoToDataUrl } from '@/lib/media'
import { noticeCollecte } from '@/lib/legalArtisan'

// L'APPLICATION DE CONVERSATION de la plateforme (v4 §A2).
// Ce n'est plus un formulaire décoré : c'est un client de chat — colonne des conversations,
// fil, composeur, suggestions d'ouverture, et un bandeau de transparence IA permanent.
// White-label absolu : aucune mention de Presti, seule la marque de l'artisan apparaît.

export type Msg = {
  id: string
  sens: 'in' | 'out'
  contenu: string
  type?: string | null            // 'reponse_auto' = IA · 'manuel' = l'artisan en personne
  photos?: string[]
  etat?: 'envoi' | 'envoye' | 'echec'
}
type Conv = { token: string; titre: string; ts: number }
// Carte Devis (§A3) : posée dans la conversation, acceptable en un clic.
type Devis = {
  id: string; numero: string | null; objet: string | null; total_ttc: number | null
  statut: string | null; accepte_le: string | null
  lignes: { designation: string | null; quantite: number | null; unite: string | null }[]
}
type Props = {
  slug: string
  /** Lien vers les infos légales, calculé par la page selon l'adresse servie (jamais « presti » sur un domaine artisan). */
  infosHref?: string
  artisanNom: string
  metier?: string | null
  avatar?: string | null
  services?: string[]
  paused?: boolean
  delai?: string | null
}

const initials = (n: string) => (n || 'A').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || 'A'
const titreDe = (t: string) => { const s = t.trim().replace(/\s+/g, ' '); return s.length > 38 ? s.slice(0, 38) + '…' : s || 'Nouvelle demande' }

export default function PlatChat({ slug, infosHref, artisanNom, metier, avatar, services = [], paused, delai }: Props) {
  const [convs, setConvs] = useState<Conv[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [photoBusy, setPhotoBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [needContact, setNeedContact] = useState(false)
  const [nom, setNom] = useState('')
  const [contact, setContact] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [side, setSide] = useState(false)    // tiroir mobile
  const [err, setErr] = useState<string | null>(null)
  // Compte client (§6) : session portée par un cookie httpOnly, jamais lisible ici.
  const [compte, setCompte] = useState<{ email: string; nom: string | null } | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authEnvoye, setAuthEnvoye] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [devis, setDevis] = useState<Devis | null>(null)
  const [devisBusy, setDevisBusy] = useState(false)
  const [modifOuvert, setModifOuvert] = useState(false)
  const [modifTexte, setModifTexte] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  // Clés de stockage local sans marque : elles sont visibles dans les outils du
  // navigateur du CLIENT de l'artisan, sur une surface censée être en marque blanche.
  // On migre l'ancienne clé pour ne perdre aucune conversation en cours.
  const KEY = `conv-${slug}`

  // ── Amorces personnalisées : construites depuis les VRAIES prestations de l'artisan.
  const amorces = (services.length
    ? services.slice(0, 3).map((s) => `J'ai besoin de : ${s.toLowerCase()}`)
    : ["J'ai un problème à réparer", 'Je voudrais un devis', 'Je veux refaire une pièce']
  ).concat(metier ? [`Une question pour un ${metier.toLowerCase()}`] : []).slice(0, 4)

  const pushEvent = useCallback((event: 'view' | 'lead' | 'contact') => {
    try { fetch('/api/plat-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ slug, event, variant: 'B' }) }).catch(() => {}) } catch { /* ignore */ }
  }, [slug])

  const ouvrir = useCallback(async (t: string) => {
    setToken(t); setNeedContact(false); setErr(null); setSide(false); setDevis(null); setModifOuvert(false)
    try {
      const res = await fetch(`/api/conversation?token=${encodeURIComponent(t)}`)
      if (!res.ok) { setMsgs([]); return }
      const d = await res.json()
      setMsgs(Array.isArray(d.messages) ? d.messages.map((m: Msg, i: number) => ({ id: `s${i}`, sens: m.sens, contenu: m.contenu, type: m.type, etat: 'envoye' as const })) : [])
      setDevis(d.devis ?? null)
    } catch { setMsgs([]) }
  }, [])

  // Chargement initial : conversations locales (+ migration de l'ancien jeton unique).
  useEffect(() => {
    let list: Conv[] = []
    try {
      list = JSON.parse(localStorage.getItem(KEY) || '[]')
      for (const ancienne of [`presti-convs-${slug}`, `convs-${slug}`]) {
        const migre = JSON.parse(localStorage.getItem(ancienne) || '[]')
        if (Array.isArray(migre) && migre.length) {
          for (const c of migre) if (!list.some((x) => x.token === c.token)) list.push(c)
          localStorage.removeItem(ancienne)
          localStorage.setItem(KEY, JSON.stringify(list))
        }
      }
      const vieux = localStorage.getItem(`presti-conv-${slug}`)
      if (vieux && !list.some((c) => c.token === vieux)) { list.unshift({ token: vieux, titre: 'Ma demande', ts: Date.now() }); localStorage.setItem(KEY, JSON.stringify(list)) }
    } catch { list = [] }
    setConvs(list)
    if (list[0]) ouvrir(list[0].token)
    try { const vk = `vu-${slug}`; if (!sessionStorage.getItem(vk)) { sessionStorage.setItem(vk, '1'); pushEvent('view') } } catch { /* ignore */ }
  }, [KEY, slug, ouvrir, pushEvent])

  // Compte client : on consomme d'abord un éventuel lien magique, puis on lit la session.
  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href)
        const lien = url.searchParams.get('connexion')
        if (lien) {
          await fetch('/api/p/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verifier', token: lien }) })
          url.searchParams.delete('connexion') // on n'expose pas le jeton dans la barre d'adresse
          window.history.replaceState({}, '', url.toString())
        }
        const r = await fetch('/api/p/auth')
        const d = await r.json()
        if (d.connecte) setCompte(d.client)
      } catch { /* la conversation marche très bien sans compte */ }
    })()
  }, [])

  async function demanderLien(e: FormEvent) {
    e.preventDefault()
    if (authBusy || !authEmail.trim()) return
    setAuthBusy(true)
    try {
      await fetch('/api/p/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'demande', slug, email: authEmail, website }) })
      setAuthEnvoye(true) // réponse volontairement identique, que le compte existe ou non
    } catch { /* ignore */ } finally { setAuthBusy(false) }
  }
  async function seDeconnecter() {
    await fetch('/api/p/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deconnexion' }) }).catch(() => {})
    setCompte(null)
  }

  useEffect(() => { const el = threadRef.current; if (el) el.scrollTop = el.scrollHeight }, [msgs, thinking, needContact])
  useEffect(() => { const ta = taRef.current; if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 168) + 'px' } }, [draft])

  function saveConvs(next: Conv[]) { setConvs(next); try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ } }
  function nouvelle() { setToken(null); setMsgs([]); setNeedContact(false); setDraft(''); setPhotos([]); setErr(null); setSide(false); setDevis(null); setModifOuvert(false); taRef.current?.focus() }

  // ── Carte Devis : accepter (horodaté côté serveur) ou demander une modification.
  async function repondreDevis(action: 'accepter' | 'modifier') {
    if (!token || devisBusy) return
    if (action === 'modifier' && !modifOuvert) { setModifOuvert(true); return }
    setDevisBusy(true); setErr(null)
    try {
      const res = await fetch('/api/conversation/devis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action, message: action === 'modifier' ? modifTexte : undefined, website }),
      })
      const d = await res.json().catch(() => ({}))
      setDevisBusy(false)
      if (!res.ok) { setErr(d.error ?? 'Action impossible.') ; return }
      if (action === 'accepter') {
        setDevis((v) => (v ? { ...v, statut: 'accepte', accepte_le: new Date().toISOString() } : v))
        setMsgs((m) => [...m, { id: `da${Date.now()}`, sens: 'out', type: 'manuel', etat: 'envoye', contenu: `Merci ! Votre acceptation est enregistrée et horodatée. ${artisanNom} vous recontacte pour la suite.` }])
      } else {
        setModifOuvert(false)
        setMsgs((m) => [...m, { id: `dm${Date.now()}`, sens: 'in', etat: 'envoye', contenu: modifTexte || 'Pouvez-vous modifier le devis ?' }])
        setModifTexte('')
      }
    } catch { setDevisBusy(false); setErr('Connexion interrompue.') }
  }

  async function ajouterPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []); e.target.value = ''
    if (!files.length) return
    setPhotoBusy(true); setErr(null)
    const libres = Math.max(0, 3 - photos.length); const next: string[] = []
    for (const f of files.slice(0, libres)) { if (!f.type.startsWith('image/')) continue; const d = await compressPhotoToDataUrl(f); if (d) next.push(d) }
    if (next.length) setPhotos((p) => [...p, ...next].slice(0, 3))
    setPhotoBusy(false)
  }

  // ── Envoi d'un message (1er = création de la demande, suivants = conversation).
  async function envoyer(texte?: string) {
    const contenu = (texte ?? draft).trim()
    if ((!contenu && !photos.length) || sending || photoBusy) return
    const localId = `t${Date.now()}`
    const envoyees = photos
    setMsgs((m) => [...m, { id: localId, sens: 'in', contenu, photos: envoyees, etat: 'envoi' }])
    setDraft(''); setPhotos([]); setSending(true); setThinking(true); setErr(null)
    const marquer = (etat: Msg['etat']) => setMsgs((m) => m.map((x) => (x.id === localId ? { ...x, etat } : x)))
    try {
      if (!token) {
        const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, message: contenu, photos: envoyees, website, variant: 'B', deferContact: true }) })
        const d = await res.json().catch(() => ({}))
        setThinking(false); setSending(false)
        if (!res.ok) { marquer('echec'); setErr(d.error ?? 'Envoi impossible.'); return }
        marquer('envoye'); pushEvent('lead')
        if (d.token) { setToken(d.token); saveConvs([{ token: d.token, titre: titreDe(contenu), ts: Date.now() }, ...convs]) }
        const rep = d.reply || (d.paused
          ? `Votre demande est bien enregistrée — ${artisanNom} est momentanément indisponible et revient vers vous dès la reprise.`
          : `Bien reçu ! ${artisanNom} a votre demande et vous répond au plus vite.`)
        setMsgs((m) => [...m, { id: `r${Date.now()}`, sens: 'out', contenu: rep, type: d.reply ? 'reponse_auto' : 'manuel', etat: 'envoye' }])
        setNeedContact(true)
        return
      }
      // Réponse DIFFUSÉE au fil de l'eau (SSE) : le texte s'écrit sous les yeux du client.
      const res = await fetch('/api/conversation/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, message: contenu, website }) })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setThinking(false); setSending(false); marquer('echec'); setErr(d.error ?? 'Message non envoyé.'); return
      }
      marquer('envoye')
      // Pas de flux (mode manuel, pause, crédits épuisés) → réponse JSON simple.
      if (!(res.headers.get('content-type') || '').includes('text/event-stream') || !res.body) {
        const d = await res.json().catch(() => ({}))
        setThinking(false); setSending(false)
        if (d.reply) setMsgs((m) => [...m, { id: `r${Date.now()}`, sens: 'out', contenu: d.reply, type: 'reponse_auto', etat: 'envoye' }])
        return
      }
      const rid = `r${Date.now()}`
      setThinking(false)
      setMsgs((m) => [...m, { id: rid, sens: 'out', contenu: '', type: 'reponse_auto', etat: 'envoye' }])
      const lecteur = res.body.getReader(); const dec = new TextDecoder(); let tampon = ''
      for (;;) {
        const { done, value } = await lecteur.read()
        if (done) break
        tampon += dec.decode(value, { stream: true })
        const blocs = tampon.split('\n\n'); tampon = blocs.pop() || ''
        for (const b of blocs) {
          const ligne = b.trim()
          if (!ligne.startsWith('data:')) continue
          try {
            const o = JSON.parse(ligne.slice(5).trim())
            if (o.t === 'delta') setMsgs((m) => m.map((x) => (x.id === rid ? { ...x, contenu: x.contenu + o.v } : x)))
            else if (o.t === 'error') setErr(o.v)
          } catch { /* fragment incomplet : on attend la suite */ }
        }
      }
      setSending(false)
      // Si rien n'est arrivé (IA indisponible), on retire la bulle vide plutôt que de laisser un blanc.
      setMsgs((m) => m.filter((x) => !(x.id === rid && !x.contenu.trim())))
    } catch {
      setThinking(false); setSending(false); marquer('echec'); setErr('Connexion interrompue.')
    }
  }

  // Renvoi d'un message en échec (retry visible, §A2).
  function reessayer(m: Msg) { setMsgs((x) => x.filter((y) => y.id !== m.id)); setPhotos(m.photos ?? []); envoyer(m.contenu) }

  async function envoyerContact(e: FormEvent) {
    e.preventDefault()
    if (!token || !contact.trim() || sending) return
    setSending(true); setErr(null)
    try {
      const res = await fetch('/api/leads/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, nom_prospect: nom, contact, website }) })
      const d = await res.json().catch(() => ({}))
      setSending(false)
      if (!res.ok) { setErr(d.error ?? 'Envoi impossible.'); return }
      pushEvent('contact'); setNeedContact(false)
      setMsgs((m) => [...m, { id: `c${Date.now()}`, sens: 'out', contenu: `Merci${nom.trim() ? ' ' + nom.trim().split(/\s+/)[0] : ''} — ${artisanNom} a vos coordonnées et revient vers vous. Vous pouvez continuer à préciser votre besoin ici.`, type: 'manuel', etat: 'envoye' }])
    } catch { setSending(false); setErr('Connexion interrompue.') }
  }

  const Ava = () => (
    <span className="pchat-ava">{avatar
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={avatar} alt="" /> : <b>{initials(artisanNom)}</b>}</span>
  )
  const humain = msgs.some((m) => m.sens === 'out' && m.type === 'manuel' && m.contenu.length > 0)

  return (
    <div className={`pchat${side ? ' open' : ''}`}>
      {/* ── Colonne des conversations (tiroir sur mobile) */}
      <aside className="pchat-side">
        <div className="pchat-brand"><Ava /><span><b>{artisanNom}</b>{metier ? <small>{metier}</small> : null}</span></div>
        <button type="button" className="pchat-new" onClick={nouvelle}>+ Nouvelle demande</button>
        <nav className="pchat-list" aria-label="Mes demandes">
          {convs.length === 0 ? <p className="pchat-empty">Vos échanges apparaîtront ici.</p> : convs.map((c) => (
            <button type="button" key={c.token} className={`pchat-conv${token === c.token ? ' on' : ''}`} onClick={() => ouvrir(c.token)}>{c.titre}</button>
          ))}
        </nav>
        {/* Compte client — facultatif : la conversation marche sans, le compte sert à la retrouver. */}
        <div className="pchat-compte">
          {compte ? (
            <>
              <span className="pchat-compte-m">{compte.nom || compte.email}</span>
              <button type="button" className="pchat-compte-b" onClick={seDeconnecter}>Se déconnecter</button>
            </>
          ) : authEnvoye ? (
            <span className="pchat-compte-m">Si un espace existe pour cette adresse, un lien de connexion vient d’être envoyé. Vérifiez votre boîte mail.</span>
          ) : (
            <form onSubmit={demanderLien}>
              <span className="pchat-compte-t">Retrouver mes demandes</span>
              <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Votre email" aria-label="Votre email" required />
              <button type="submit" className="pchat-compte-b" disabled={authBusy}>{authBusy ? '…' : 'Recevoir mon lien'}</button>
            </form>
          )}
        </div>
        {delai ? <div className="pchat-side-foot">{delai}</div> : null}
      </aside>
      <button type="button" className="pchat-scrim" onClick={() => setSide(false)} aria-label="Fermer le menu" />

      {/* ── Zone de conversation */}
      <section className="pchat-main">
        <header className="pchat-top">
          <button type="button" className="pchat-burger" onClick={() => setSide(true)} aria-label="Mes demandes">☰</button>
          <span className="pchat-who"><b>{artisanNom}</b>{humain ? <em className="pchat-human">{artisanNom.split(' ')[0]} vous répond directement</em> : null}</span>
        </header>
        {/* Transparence IA — non négociable : le visiteur sait toujours à qui il parle. */}
        <p className="pchat-ia">Assistant de l&apos;entreprise — un humain prend le relais à tout moment.</p>

        <div className="pchat-thread" ref={threadRef} data-lenis-prevent>
          {msgs.length === 0 && !thinking ? (
            <div className="pchat-hello">
              <Ava />
              <h1>Bonjour 👋</h1>
              <p>Décrivez votre besoin en quelques mots — {artisanNom} vous répond.{paused ? ' (Réponses momentanément suspendues : votre demande sera bien enregistrée.)' : ''}</p>
              <div className="pchat-sugg">
                {amorces.map((a, i) => <button type="button" key={i} onClick={() => envoyer(a)}>{a}</button>)}
              </div>
            </div>
          ) : null}

          {msgs.map((m) => (
            <div className={`pchat-row ${m.sens === 'in' ? 'me' : 'them'}`} key={m.id}>
              {m.sens === 'out' ? <Ava /> : null}
              <div className="pchat-bub">
                {m.photos?.length ? (
                  <div className="pchat-photos">{m.photos.map((p, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={p} alt="" />
                  ))}</div>
                ) : null}
                {m.contenu ? m.contenu.split('\n').map((l, i, arr) => <span key={i}>{l}{i < arr.length - 1 ? <br /> : null}</span>) : null}
                {m.sens === 'in' ? (
                  <span className={`pchat-etat ${m.etat}`}>
                    {m.etat === 'envoi' ? 'envoi…' : m.etat === 'echec' ? 'non envoyé' : 'envoyé'}
                    {m.etat === 'echec' ? <button type="button" onClick={() => reessayer(m)}>Réessayer</button> : null}
                  </span>
                ) : null}
              </div>
            </div>
          ))}

          {/* Carte Devis (§A3) : l'objet est posé DANS la conversation, pas promis pour plus tard. */}
          {devis ? (
            <div className={`pchat-carte${devis.statut === 'accepte' ? ' ok' : ''}`}>
              <span className="pchat-carte-k">Devis{devis.numero ? ` ${devis.numero}` : ''}</span>
              <b className="pchat-carte-t">{Number(devis.total_ttc || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € TTC</b>
              {devis.objet ? <span className="pchat-carte-o">{devis.objet}</span> : null}
              {devis.lignes?.length ? (
                <ul className="pchat-carte-l">
                  {devis.lignes.map((l, i) => <li key={i}>{l.designation}{l.quantite ? ` · ${l.quantite} ${l.unite || ''}` : ''}</li>)}
                </ul>
              ) : null}
              {devis.statut === 'accepte' ? (
                <span className="pchat-carte-ok">✅ Accepté{devis.accepte_le ? ` le ${new Date(devis.accepte_le).toLocaleDateString('fr-FR')}` : ''} — {artisanNom} revient vers vous pour la suite.</span>
              ) : (
                <>
                  <div className="pchat-carte-act">
                    <button type="button" onClick={() => repondreDevis('accepter')} disabled={devisBusy}>{devisBusy ? '…' : 'Accepter le devis'}</button>
                    <button type="button" className="g" onClick={() => repondreDevis('modifier')} disabled={devisBusy}>Demander une modification</button>
                  </div>
                  {modifOuvert ? (
                    <div className="pchat-carte-modif">
                      <textarea rows={2} value={modifTexte} onChange={(e) => setModifTexte(e.target.value)} placeholder="Qu’aimeriez-vous changer ?" />
                      <button type="button" onClick={() => repondreDevis('modifier')} disabled={devisBusy}>Envoyer ma demande</button>
                    </div>
                  ) : null}
                  <small className="pchat-carte-note">En acceptant, vous validez ce devis. Votre accord est horodaté et conservé avec l’échange.</small>
                </>
              )}
            </div>
          ) : null}

          {thinking ? (
            <div className="pchat-row them"><Ava /><div className="pchat-bub typing"><span /><span /><span /></div></div>
          ) : null}

          {needContact ? (
            <form className="pchat-capture" onSubmit={envoyerContact}>
              <span>Pour être recontacté par {artisanNom}, laissez vos coordonnées :</span>
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Votre nom (facultatif)" aria-label="Votre nom" />
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email ou téléphone" aria-label="Email ou téléphone" required />
              <button type="submit" disabled={sending || !contact.trim()}>{sending ? '…' : 'Être recontacté'}</button>
            </form>
          ) : null}
        </div>

        {/* ── Composeur */}
        <form className="pchat-composer" onSubmit={(e) => { e.preventDefault(); envoyer() }}>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
          {photos.length ? (
            <div className="pchat-joint">{photos.map((p, i) => (
              <span key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" />
                <button type="button" onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))} aria-label="Retirer">×</button>
              </span>
            ))}</div>
          ) : null}
          <div className="pchat-inputrow">
            <label className="pchat-clip" title="Ajouter une photo du chantier">
              <input type="file" accept="image/*" capture="environment" multiple onChange={ajouterPhotos} hidden disabled={photoBusy || photos.length >= 3} />
              {photoBusy ? '…' : '📎'}
            </label>
            <textarea
              ref={taRef} value={draft} onChange={(e) => setDraft(e.target.value)} rows={1}
              placeholder="Décrivez votre besoin…"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
            />
            <button type="submit" disabled={sending || photoBusy || (!draft.trim() && !photos.length)} aria-label="Envoyer">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" /></svg>
            </button>
          </div>
          <small className="pchat-hint">Entrée pour envoyer · Maj+Entrée pour aller à la ligne · photos bienvenues (la localisation est retirée)</small>
          {/* Information des personnes AU MOMENT de la collecte (RGPD art. 13).
              Elle manquait entièrement, alors qu'on recueille ici nom, coordonnées,
              description de panne, photos de domicile et adresse IP. Et le responsable
              de traitement, c'est l'ARTISAN : c'est lui que la CNIL sanctionnerait. */}
          <small className="pchat-rgpd">
            {noticeCollecte(artisanNom)}{' '}
            <a href={infosHref ?? `/site/${slug}/infos-legales`} target="_blank" rel="noopener">En savoir plus</a>
          </small>
        </form>
        {err ? <div className="pchat-err">{err}</div> : null}
      </section>
    </div>
  )
}
