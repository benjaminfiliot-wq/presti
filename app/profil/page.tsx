'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import LogoUpload from '@/app/LogoUpload'
import Info from '@/app/Info'
import { SITE_A_LA_DEMANDE } from '@/lib/siteCommande'
import { peut } from '@/lib/plans'
import { afficher, urlPlateforme } from '@/lib/urls'
import { actif } from '@/lib/flags'
import { libelleDomaineActif, type SurfaceDomaine } from '@/lib/surfaceDomaine'

type Service = { nom: string; description: string }
type Reseaux = { instagram?: string; facebook?: string; tiktok?: string; linkedin?: string; whatsapp?: string; site?: string; google?: string }
const RESEAUX: { key: keyof Reseaux; label: string; ph: string }[] = [
  { key: 'instagram', label: 'Instagram', ph: 'https://instagram.com/votre_compte' },
  { key: 'facebook', label: 'Facebook', ph: 'https://facebook.com/votre_page' },
  { key: 'tiktok', label: 'TikTok', ph: 'https://tiktok.com/@votre_compte' },
  { key: 'linkedin', label: 'LinkedIn', ph: 'https://linkedin.com/in/…' },
  { key: 'whatsapp', label: 'WhatsApp', ph: '+33 6 12 34 56 78' },
  { key: 'google', label: 'Fiche Google', ph: 'Lien de votre fiche Google' },
  { key: 'site', label: 'Site web', ph: 'https://votre-site.fr' },
]
export default function ProfilPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [uid, setUid] = useState('')
  const [slug, setSlug] = useState('')
  const [nom, setNom] = useState('')
  const [metier, setMetier] = useState('')
  const [bio, setBio] = useState('')
  const [zone, setZone] = useState('')
  const [horaires, setHoraires] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [reseaux, setReseaux] = useState<Reseaux>({})
  const [telPublic, setTelPublic] = useState('')
  const [emailPublic, setEmailPublic] = useState('')
  const [leadsPause, setLeadsPause] = useState(false)
  // Ce que la BASE dit (l'état réellement public) — le libellé s'y fie, pas à la case avant Enregistrer (audit final, D-2.6).
  const [siteActiveEnregistre, setSiteActiveEnregistre] = useState(false)
  const [plan, setPlan] = useState('gratuit')
  // Domaine perso — pour toutes les offres depuis le 04/09 (le verrou est dans lib/plans.ts)
  const [domaine, setDomaine] = useState('')
  const [domSaved, setDomSaved] = useState<string | null>(null)
  const [domStatus, setDomStatus] = useState<{ verified: boolean; served: boolean; records: { type: string; name: string; value: string }[] } | null>(null)
  const [domSurface, setDomSurface] = useState<SurfaceDomaine | null>(null)
  const [domBusy, setDomBusy] = useState(false)
  const [domMsg, setDomMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const id = data.session.user.id
      setUid(id)
      const { data: a } = await supabase.from('artisans').select('*').eq('id', id).maybeSingle()
      if (!a) { router.replace('/onboarding'); return }
      setSlug(a.slug ?? ''); setNom(a.nom ?? ''); setMetier(a.metier ?? '')
      setBio(a.bio ?? ''); setZone(a.zone_intervention ?? ''); setHoraires(a.horaires ?? '')
      setLogoUrl(a.logo_url ?? null); setActive(a.plateforme_active !== false)
      setServices(Array.isArray(a.services) ? (a.services as Service[]).map((s) => ({ nom: s.nom ?? '', description: s.description ?? '' })) : [])
      setReseaux((a.reseaux && typeof a.reseaux === 'object') ? a.reseaux as Reseaux : {})
      setTelPublic(a.tel_public ?? ''); setEmailPublic(a.email_public ?? ''); setLeadsPause(a.leads_pause === true)
      setPlan(a.plan ?? 'gratuit')
      setSiteActiveEnregistre(a.site_active === true)
      if (a.domaine) { setDomSaved(a.domaine); setDomaine(a.domaine); refreshDomaine() }
      setReady(true)
    })
  }, [router])

  function setService(i: number, patch: Partial<Service>) {
    setServices((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  }
  async function authToken() { const { data } = await supabase.auth.getSession(); return data.session?.access_token }
  async function refreshDomaine() {
    setDomBusy(true); setDomMsg(null)
    try {
      const t = await authToken()
      const res = await fetch('/api/domain', { headers: { Authorization: `Bearer ${t}` } })
      const d = await res.json().catch(() => ({}))
      if (res.ok) { setDomSaved(d.domaine ?? null); setDomStatus(d.status ?? null); setDomSurface(d.surface ?? null); if (d.domaine) setDomaine(d.domaine) }
    } catch { /* silencieux */ } finally { setDomBusy(false) }
  }
  async function connecterDomaine() {
    const v = domaine.trim()
    if (!v || domBusy) return
    setDomBusy(true); setDomMsg(null)
    try {
      const t = await authToken()
      const res = await fetch('/api/domain', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ domaine: v }) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setDomMsg({ type: 'err', text: d.error ?? 'Connexion impossible.' }); return }
      setDomSaved(d.domaine); setDomStatus(d.status); setDomaine(d.domaine)
      await refreshDomaine()
      setDomMsg({ type: 'ok', text: d.status?.served ? 'Domaine connecté et actif ✅' : 'Domaine enregistré. Ajoutez les enregistrements DNS ci-dessous, puis cliquez « Vérifier ».' })
    } catch { setDomMsg({ type: 'err', text: 'Connexion interrompue.' }) } finally { setDomBusy(false) }
  }
  async function retirerDomaine() {
    if (domBusy) return
    setDomBusy(true); setDomMsg(null)
    try {
      const t = await authToken()
      await fetch('/api/domain', { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } })
      setDomSaved(null); setDomStatus(null); setDomSurface(null); setDomaine('')
      setDomMsg({ type: 'ok', text: 'Domaine retiré.' })
    } catch { /* silencieux */ } finally { setDomBusy(false) }
  }

  async function save() {
    setSaving(true); setMsg(null)
    const cleanServices = services.map((s) => ({ nom: s.nom.trim().slice(0, 80), description: s.description.trim().slice(0, 200) })).filter((s) => s.nom)
    const cleanReseaux: Reseaux = {}
    for (const { key } of RESEAUX) { const v = (reseaux[key] ?? '').trim().slice(0, 300); if (v) cleanReseaux[key] = v }
    const { error } = await supabase.from('artisans').update({
      bio: bio.trim().slice(0, 800) || null,
      zone_intervention: zone.trim().slice(0, 160) || null,
      horaires: horaires.trim().slice(0, 200) || null,
      services: cleanServices,
      reseaux: cleanReseaux,
      tel_public: telPublic.trim().slice(0, 40) || null,
      email_public: emailPublic.trim().slice(0, 160) || null,
      leads_pause: leadsPause,
      plateforme_active: active,
    }).eq('id', uid)
    setSaving(false)
    if (error) { setMsg({ type: 'err', text: 'Enregistrement impossible.' }); return }
    setMsg({ type: 'ok', text: 'Profil enregistré ✅' })
    setTimeout(() => setMsg(null), 2500)
  }

  // Suppression GRANULAIRE (§C3) : chaque brique indépendamment, sans toucher au compte.
  // Toujours : récapitulatif de ce qui disparaît → confirmation par saisie → exécution.
  async function actionDonnees(action: string, titre: string) {
    const t = (await supabase.auth.getSession()).data.session?.access_token
    const recap = await (await fetch(`/api/donnees?action=${action}`, { headers: { Authorization: `Bearer ${t}` } })).json()
    if (recap.error) { setMsg({ type: 'err', text: recap.error }); return }
    const liste = (a: string[]) => (a?.length ? a.map((x) => `• ${x}`).join('\n') : '• (rien)')
    const texte = `${titre}\n\nCE QUI DISPARAÎT :\n${liste(recap.disparait)}\n\nCE QUI EST CONSERVÉ :\n${liste(recap.conserve)}\n\n`
    const s = prompt(texte + 'Tapez SUPPRIMER pour confirmer.')
    if (!s || s.trim().toUpperCase() !== 'SUPPRIMER') { setMsg({ type: 'err', text: 'Annulé — rien n’a été touché.' }); return }
    const res = await fetch('/api/donnees', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ action, confirm: 'SUPPRIMER' }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Action impossible.' }); return }
    setMsg({ type: 'ok', text: d.message || 'C’est fait ✅' })
    setTimeout(() => window.location.reload(), 1400)
  }

  // (12/10) La suppression du compte ne se lance plus d'ici. Ce bouton annonçait une suppression « DÉFINITIVE » et
  // « irréversible », factures comprises, puis déconnectait l'artisan — alors que la demande ouvre 30 jours de grâce
  // annulables et que les factures émises sont conservées dix ans (app/api/account/delete, lib/purgeComptes.ts) : il
  // ne voyait jamais qu'il pouvait annuler (audit des promesses, produit, ligne 82). Il renvoie vers Paramètres → Données,
  // qui montre d'abord ce qui disparaît et ce qui reste, et où l'on annule.

  // L'adresse publique — jamais « presti » dès qu'un domaine neutre ou perso existe (lib/urls).
  const adresse = { slug, domaine: domSaved, domaine_verifie: domStatus?.served ?? false }
  const lien = slug ? afficher(urlPlateforme(adresse)) : ''

  const actions = (
    <>
      {slug && <a className="psh-btn ghost" href={urlPlateforme(adresse)} target="_blank" rel="noopener">Voir ma page ↗</a>}
      <button className="psh-btn primary" disabled={saving} onClick={save}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
    </>
  )

  if (!ready) return <AppShell active="profil" title="Ma page" crumb="Plateforme"><p className="muted">Chargement…</p></AppShell>

  return (
    <AppShell active="profil" title="Ma page" crumb="Votre plateforme de contact" actions={actions}>
      <div className="prof">
        {/* Lien à partager */}
        <div className="tool-card">
          <h2>Votre lien à partager</h2>
          <p className="muted" style={{ margin: '0 0 .7rem' }}>Collez-le dans votre bio (Facebook, Instagram), sur votre fiche Google, dans votre signature mail. Pas dans une annonce Le Bon Coin : ses règles interdisent les liens vers un autre site. Chaque demande faite par ce lien arrive dans Presti, avec une réponse prête en moins d&apos;une minute.</p>
          <div className="prof-link">
            <span>{lien || 'Lien indisponible'}</span>
            {lien && <button className="btn btn--ghost" style={{ width: 'auto' }} onClick={() => navigator.clipboard?.writeText('https://' + lien)}>Copier</button>}
          </div>
          <label className="prof-toggle">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>Ma page est <b>{active ? 'active' : 'désactivée'}</b> {active ? '— les clients peuvent me contacter' : '— la page est fermée'}</span>
          </label>
        </div>

        {/* Identité */}
        <div className="tool-card">
          <h2>Votre présentation</h2>
          <div className="prof-id">
            <div>
              <label>Photo / logo <Info cle="profil.logo" /></label>
              {uid && <LogoUpload uid={uid} value={logoUrl} onChange={setLogoUrl} />}
            </div>
          </div>
          <div className="grid2" style={{ marginTop: '.6rem' }}>
            <div><label>Nom affiché</label><input value={nom} disabled title="Modifiable dans vos informations" /></div>
            <div><label>Métier</label><input value={metier} disabled title="Modifiable dans vos informations" /></div>
          </div>
          <label>Présentation (bio) <Info cle="profil.bio" /></label>
          <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Ex : Artisan plombier depuis 15 ans. Dépannage rapide, travail soigné, devis clair et sans surprise." />
          <div className="grid2" style={{ marginTop: '.6rem' }}>
            <div><label>Zone d&apos;intervention <Info cle="profil.zone" /></label><input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ex : La Rochelle et 30 km alentour" /></div>
            <div><label>Disponibilités <Info cle="profil.horaires" /></label><input value={horaires} onChange={(e) => setHoraires(e.target.value)} placeholder="Ex : Lun–Ven 8h–18h · Urgences 7j/7" /></div>
          </div>
        </div>

        {/* Services */}
        <div className="tool-card">
          <h2>Ce que vous proposez</h2>
          <p className="muted" style={{ margin: '0 0 .3rem' }}>Vos prestations, affichées sur votre page.</p>
          {services.map((s, i) => (
            <div className="prof-serv" key={i}>
              <input className="s-nom" value={s.nom} onChange={(e) => setService(i, { nom: e.target.value })} placeholder="Prestation (ex : Dépannage plomberie)" />
              <input className="s-desc" value={s.description} onChange={(e) => setService(i, { description: e.target.value })} placeholder="Détail (optionnel)" />
              <button className="btn btn--ghost danger" style={{ width: 'auto' }} onClick={() => setServices((p) => p.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className="btn btn--ghost" style={{ width: 'auto', marginTop: '.7rem' }} disabled={services.length >= 12} onClick={() => setServices((p) => [...p, { nom: '', description: '' }])}>+ Ajouter une prestation</button>
        </div>

        {/* Canaux connectés */}
        <div className="tool-card">
          <h2>Vos contacts &amp; réseaux</h2>
          <p className="muted" style={{ margin: '0 0 .8rem' }}>Affichés sur votre page pour que les clients vous joignent comme ils veulent. Laissez vide ce que vous ne voulez pas montrer.</p>
          <div className="grid2">
            <div><label>Téléphone (affiché) <Info cle="profil.telephone" /></label><input value={telPublic} type="tel" inputMode="tel" autoComplete="tel" onChange={(e) => setTelPublic(e.target.value)} placeholder="06 12 34 56 78" /></div>
            <div><label>Email (affiché) <Info cle="profil.email" /></label><input value={emailPublic} onChange={(e) => setEmailPublic(e.target.value)} placeholder="contact@votre-entreprise.fr" /></div>
          </div>
          <div className="grid2" style={{ marginTop: '.6rem' }}>
            {RESEAUX.map((r) => (
              <div key={r.key}><label>{r.label}</label><input value={reseaux[r.key] ?? ''} onChange={(e) => setReseaux((p) => ({ ...p, [r.key]: e.target.value }))} placeholder={r.ph} /></div>
            ))}
          </div>
        </div>

        {/* Réponse automatique */}
        <div className="tool-card">
          <h2>Réponses aux demandes</h2>
          <p className="muted" style={{ margin: '0 0 .7rem' }}>Quand un client vous écrit sur votre page, choisissez comment il reçoit sa première réponse. Dans tous les cas, la conversation arrive dans votre boîte de réception.</p>
          <p className="muted" style={{ margin: 0 }}>Le comportement de votre assistant (réponse automatique ou non, modèle, ton, devis auto, mise en pause) se règle désormais dans <a href="/plateforme?volet=reglages" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>Ma plateforme → Intelligence</a> — tout au même endroit.</p>
        </div>

        {/* Site web */}
        <div className="tool-card">
          <h2>Votre site web</h2>
          {actif('siteCommandeVente') && (
            <>
              <p className="muted" style={{ margin: '0 0 .7rem', fontWeight: 600 }}>{SITE_A_LA_DEMANDE.titre}</p>
              {SITE_A_LA_DEMANDE.phrases.map((phrase) => <p key={phrase} className="muted" style={{ margin: '0 0 1rem' }}>{phrase}</p>)}
              <a className="btn btn--primary" href={SITE_A_LA_DEMANDE.lien} style={{ display: 'inline-block', width: 'auto' }}>
                {SITE_A_LA_DEMANDE.bouton}
              </a>
            </>
          )}

          {/* Domaine personnalisé — dans TOUTES les formules, essai compris.
              ⚠️ Ce bloc était conditionné à `siteMax >= 3` (Signature). C'était en contradiction
              avec lib/plans.ts:38, qui met `site.domaine_perso` dans BASE depuis la décision du
              04/09 (« l'adresse sans presti est pour tous »), et avec app/api/domain/route.ts:33
              qui autorise déjà la route pour toutes les formules. L'artisan à 29 € avait donc le
              DROIT sans avoir le CHAMP. Repéré le 2026-09-10 en sourçant une publicité qui
              annonçait « votre nom de domaine dès la formule d'entrée » : la pub disait vrai sur
              le papier, l'écran disait non. */}
          {peut(plan, 'site.domaine_perso') ? (
            <div className="site-domain">
              <div className="site-domain-h">
                <b>Votre nom de domaine <Info cle="profil.domaine" /></b>
                <span className="muted">Branchez votre propre adresse (ex : mon-entreprise.fr). Compris dans toutes les formules, essai inclus. Le nom de domaine s’achète chez un hébergeur et reste à vous.</span>
              </div>
              <div className="site-domain-row">
                <input value={domaine} onChange={(e) => setDomaine(e.target.value)} placeholder="mon-entreprise.fr" spellCheck={false} disabled={domBusy} />
                {domSaved ? (
                  <button type="button" className="btn btn--ghost" style={{ width: 'auto' }} onClick={refreshDomaine} disabled={domBusy}>{domBusy ? '…' : 'Vérifier'}</button>
                ) : (
                  <button type="button" className="btn btn--primary" style={{ width: 'auto' }} onClick={connecterDomaine} disabled={domBusy || !domaine.trim()}>{domBusy ? '…' : 'Connecter'}</button>
                )}
              </div>
              {domMsg ? <p className={`muted${domMsg.type === 'err' ? ' dom-err' : ''}`} style={{ margin: '.5rem 0 0', fontSize: '.85rem' }}>{domMsg.text}</p> : null}

              {domSaved && domStatus ? (
                <div className="site-domain-status">
                  <span className={`dom-badge ${domStatus.served ? 'ok' : 'wait'}`}>
                    <span className="pdot" />{domStatus.served ? (domSurface ? libelleDomaineActif(domSurface) : 'Actif') : 'En attente de la configuration DNS'}
                  </span>
                  {!domStatus.served ? (
                    <>
                      <p className="muted" style={{ margin: '.6rem 0 .4rem', fontSize: '.85rem' }}>Chez votre hébergeur (OVH, Ionos, Gandi…), ajoutez :</p>
                      <div className="dom-records">
                        {domStatus.records.map((r, i) => (
                          <div className="dom-rec" key={i}>
                            <span className="dom-rec-type">{r.type}</span>
                            <span className="dom-rec-name"><small>Nom</small>{r.name}</span>
                            <span className="dom-rec-val"><small>Valeur</small>{r.value}</span>
                          </div>
                        ))}
                      </div>
                      <p className="muted" style={{ margin: '.5rem 0 0', fontSize: '.78rem' }}>La propagation DNS peut prendre de quelques minutes à quelques heures. Cliquez « Vérifier » ensuite.</p>
                    </>
                  ) : null}
                  <button type="button" className="dom-remove" onClick={retirerDomaine} disabled={domBusy}>Retirer ce domaine</button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Données & suppressions — chaque brique indépendamment (§C3) */}
        <div className="tool-card danger-zone" id="donnees">
          <h2>Données &amp; suppressions</h2>
          <p className="muted" style={{ margin: '0 0 1rem' }}>
            Chaque partie se supprime <b>séparément</b> — votre compte Presti reste intact. Avant chaque action, on vous montre exactement ce qui disparaît et ce qui est conservé.
            Les <b>devis envoyés et factures émises</b> ne sont jamais supprimables : la loi impose de les conserver, ils sont archivés.
          </p>
          <div className="dz-actions">
            {siteActiveEnregistre && <button className="btn btn--ghost danger" style={{ width: 'auto' }} onClick={() => actionDonnees('site_supprimer', 'Supprimer le site')}>
              Supprimer le site
              <small>Dépublie et efface contenu + images. Le compte reste.</small>
            </button>}
            <button className="btn btn--ghost danger" style={{ width: 'auto' }} onClick={() => actionDonnees('plateforme_supprimer', 'Supprimer la plateforme')}>
              Supprimer la plateforme
              <small>Efface les réglages. Vos conversations sont conservées.</small>
            </button>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '1.2rem 0' }} />
          <p className="muted" style={{ margin: '0 0 .8rem' }}>Supprimer votre <b>compte</b> se fait dans Paramètres → Données : vous voyez d’abord ce qui disparaît et ce qui est conservé (les factures émises, dix ans, comme la loi l’impose), puis vous avez 30 jours pour changer d’avis.</p>
          <a className="btn btn--ghost danger" style={{ width: 'auto' }} href="/parametres?onglet=donnees">Supprimer mon compte…</a>
        </div>

        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`}>{msg.text}</div>}
      </div>
    </AppShell>
  )
}
