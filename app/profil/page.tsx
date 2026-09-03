'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import StyleAvance from '@/app/profil/StyleAvance'
import { resolveStyle, STYLE_DEFAUT, type SiteStyle } from '@/lib/siteStyle'
import LogoUpload from '@/app/LogoUpload'
import Info from '@/app/Info'
import PortfolioUpload, { type Realisation } from '@/app/PortfolioUpload'
import AvantApresUpload, { type AvantApres } from '@/app/AvantApresUpload'
import { siteMaxForPlan } from '@/lib/plans'
import { afficher, urlPlateforme, urlSite } from '@/lib/urls'
import AdresseEditor from '@/app/AdresseEditor'
import { defaultLayout, SECTION_MIN_TIER, SECTION_ORDER, type SectionId } from '@/lib/siteLayout'

// Libellés artisan des sections (composeur de page).
const SECTION_LABELS: Record<SectionId, string> = {
  hero: 'En-tête (nom + accroche)', trust: 'Bandeau confiance', words: 'Mots-clés géants',
  features: 'Prestations en grand (photos)', manifesto: 'Manifeste plein-cadre', gallery: 'Réalisations (galerie)',
  services: 'Prestations (liste)', process: 'Comment ça se passe', about: 'À propos',
  faq: 'Questions fréquentes', zone: "Zone d'intervention", contact: 'Contact', avantapres: 'Avant / après',
}
const FIXED: SectionId[] = ['hero', 'contact'] // structurantes : toujours présentes, non déplaçables aux extrémités

type Service = { nom: string; description: string }
type Reseaux = { instagram?: string; facebook?: string; tiktok?: string; linkedin?: string; whatsapp?: string; site?: string; google?: string }
// Contenu du site rédigé par l'IA — 100% éditable ensuite par l'artisan (chaque mot est le sien).
type SiteContenu = {
  hero_accroche: string; hero_lede: string; apropos: string
  prestations_intro: string; realisations_intro: string
  cta_titre: string; cta_texte: string; meta_description: string
  manifeste: string; mots_cles: string[]
  // v2 (rédigés par l'IA, conservés à la sauvegarde ; édition dédiée à venir dans le studio)
  process?: { titre: string; texte: string }[]; faq?: { q: string; r: string }[]; zone_texte?: string
}
const CONTENU_VIDE: SiteContenu = { hero_accroche: '', hero_lede: '', apropos: '', prestations_intro: '', realisations_intro: '', cta_titre: '', cta_texte: '', meta_description: '', manifeste: '', mots_cles: [] }
const RESEAUX: { key: keyof Reseaux; label: string; ph: string }[] = [
  { key: 'instagram', label: 'Instagram', ph: 'https://instagram.com/votre_compte' },
  { key: 'facebook', label: 'Facebook', ph: 'https://facebook.com/votre_page' },
  { key: 'tiktok', label: 'TikTok', ph: 'https://tiktok.com/@votre_compte' },
  { key: 'linkedin', label: 'LinkedIn', ph: 'https://linkedin.com/in/…' },
  { key: 'whatsapp', label: 'WhatsApp', ph: '+33 6 12 34 56 78' },
  { key: 'google', label: 'Fiche Google', ph: 'Lien de votre fiche Google' },
  { key: 'site', label: 'Site web', ph: 'https://votre-site.fr' },
]
const TIERS: { n: number; nom: string; desc: string }[] = [
  { n: 1, nom: 'Essentiel', desc: 'Une page nette : présentation, prestations, contact.' },
  { n: 2, nom: 'Pro', desc: 'Réalisations en galerie, à-propos, réseaux — plus complet.' },
  { n: 3, nom: 'Signature', desc: 'Site cinématique haut de gamme, animations, galerie immersive.' },
]
// Thème / DNA visuelle (s'applique au site ET à la plateforme). Aperçu = [fond, encre, accent].
const THEMES: { id: string; nom: string; desc: string; sw: [string, string, string] }[] = [
  { id: 'atelier', nom: 'Atelier', desc: 'Crème éditorial — menuisier, ébéniste', sw: ['#F5EFE4', '#171310', '#C6853F'] },
  { id: 'nuit', nom: 'Nuit', desc: 'Sombre, cinématique — électricien, piscine', sw: ['#12100C', '#F5EFE4', '#C6853F'] },
  { id: 'epure', nom: 'Épuré', desc: 'Blanc minimal — archi, peintre HdG', sw: ['#FBFAF8', '#171614', '#C6853F'] },
  { id: 'chantier', nom: 'Chantier', desc: 'Franc, industriel — maçon, couvreur', sw: ['#EDEBE6', '#1A1A17', '#F2B705'] },
  { id: 'bleu', nom: 'Bleu de travail', desc: 'Dense, rassurant — plombier, chauffagiste', sw: ['#F3F5F8', '#16202E', '#14549E'] },
  { id: 'vitrine', nom: 'Vitrine', desc: 'La photo commande — carreleur, paysagiste', sw: ['#FAF9F6', '#14130F', '#8A7A5F'] },
]
const THEME_IDS = THEMES.map((t) => t.id)

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
  const [realisations, setRealisations] = useState<Realisation[]>([])
  const [avantApres, setAvantApres] = useState<AvantApres[]>([])
  const [reseaux, setReseaux] = useState<Reseaux>({})
  const [telPublic, setTelPublic] = useState('')
  const [emailPublic, setEmailPublic] = useState('')
  const [reponseAuto, setReponseAuto] = useState(true)
  const [leadsPause, setLeadsPause] = useState(false)
  const [siteActive, setSiteActive] = useState(false)
  const [siteTier, setSiteTier] = useState(3)
  const [siteMax, setSiteMax] = useState<1 | 2 | 3>(3) // niveau de site max inclus dans la formule
  const [plan, setPlan] = useState('gratuit')
  const [layout, setLayout] = useState<{ id: SectionId; on: boolean }[]>([]) // composition de la page (ordre + on/off)
  const [previewKey, setPreviewKey] = useState(0) // force le rechargement de l'aperçu après enregistrement
  const [copied, setCopied] = useState(false)
  // Domaine perso (offre Signature)
  const [domaine, setDomaine] = useState('')
  const [domSaved, setDomSaved] = useState<string | null>(null)
  const [domStatus, setDomStatus] = useState<{ verified: boolean; served: boolean; records: { type: string; name: string; value: string }[] } | null>(null)
  const [domBusy, setDomBusy] = useState(false)
  const [domMsg, setDomMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [siteContact, setSiteContact] = useState(true)
  const [genSite, setGenSite] = useState(false)
  const [siteContenu, setSiteContenu] = useState<SiteContenu | null>(null)
  const [active, setActive] = useState(true)
  const [accent, setAccent] = useState('#D97757')
  const [styleSite, setStyleSite] = useState<SiteStyle>(STYLE_DEFAUT)
  const [theme, setTheme] = useState('atelier')
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
      setLogoUrl(a.logo_url ?? null); setActive(a.plateforme_active !== false); setAccent(/^#[0-9a-fA-F]{6}$/.test(a.accent || '') ? a.accent : '#D97757')
      setTheme(THEME_IDS.includes(a.theme) ? a.theme : 'atelier')
      setStyleSite(resolveStyle(a.site_style))
      setServices(Array.isArray(a.services) ? (a.services as Service[]).map((s) => ({ nom: s.nom ?? '', description: s.description ?? '' })) : [])
      setRealisations(Array.isArray(a.realisations) ? (a.realisations as Realisation[]).map((r) => ({ image: r.image ?? '', titre: r.titre ?? '', specialite: r.specialite ?? '', ...(r.blur ? { blur: r.blur } : {}) })).filter((r) => r.image) : [])
      setAvantApres(Array.isArray(a.avant_apres) ? (a.avant_apres as AvantApres[]).map((p) => ({ avant: p.avant ?? '', apres: p.apres ?? '', titre: p.titre ?? '' })) : [])
      setReseaux((a.reseaux && typeof a.reseaux === 'object') ? a.reseaux as Reseaux : {})
      setTelPublic(a.tel_public ?? ''); setEmailPublic(a.email_public ?? ''); setReponseAuto(a.reponse_auto !== false); setLeadsPause(a.leads_pause === true)
      const max = siteMaxForPlan(a.plan); setSiteMax(max); setPlan(a.plan ?? 'gratuit')
      // Composition : depuis site_layout stocké, sinon dérivée du niveau ; on complète avec les
      // sections manquantes (désactivées) pour que l'artisan puisse toutes les gérer.
      const storedSecs = (a.site_layout && Array.isArray(a.site_layout.sections)) ? a.site_layout.sections : defaultLayout([1, 2, 3].includes(Number(a.site_tier)) ? Number(a.site_tier) as 1 | 2 | 3 : 3).sections
      const seen = new Set<string>()
      const comp: { id: SectionId; on: boolean }[] = []
      for (const s of storedSecs) { if (s && SECTION_ORDER.includes(s.id) && !seen.has(s.id)) { seen.add(s.id); comp.push({ id: s.id, on: s.on !== false }) } }
      for (const id of SECTION_ORDER) { if (!seen.has(id)) comp.push({ id, on: false }) }
      setLayout(comp)
      // niveau de site borné par la formule (on ne propose jamais un niveau non inclus)
      setSiteActive(a.site_active === true); setSiteTier(Math.min([1, 2, 3].includes(Number(a.site_tier)) ? Number(a.site_tier) : max, max) as number); setSiteContact(a.site_contact_integre !== false)
      setSiteContenu(a.site_contenu && typeof a.site_contenu === 'object' ? { ...CONTENU_VIDE, ...(a.site_contenu as Partial<SiteContenu>), mots_cles: Array.isArray((a.site_contenu as SiteContenu).mots_cles) ? (a.site_contenu as SiteContenu).mots_cles : [] } : null)
      if (a.domaine) { setDomSaved(a.domaine); setDomaine(a.domaine); refreshDomaine() }
      setReady(true)
    })
  }, [router])

  function setService(i: number, patch: Partial<Service>) {
    setServices((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  }
  function setC(patch: Partial<SiteContenu>) { setSiteContenu((prev) => ({ ...(prev ?? CONTENU_VIDE), ...patch })) }
  function setMot(i: number, v: string) { setSiteContenu((prev) => { const base = prev ?? CONTENU_VIDE; const m = [...(base.mots_cles ?? [])]; while (m.length <= i) m.push(''); m[i] = v; return { ...base, mots_cles: m } }) }
  function toggleSection(id: SectionId) { if (FIXED.includes(id)) return; setLayout((prev) => prev.map((s) => (s.id === id ? { ...s, on: !s.on } : s))) }
  function moveSection(i: number, dir: -1 | 1) { setLayout((prev) => { const j = i + dir; if (j < 0 || j >= prev.length) return prev; const n = [...prev]; const t = n[i]; n[i] = n[j]; n[j] = t; return n }) }
  async function copierLien() { try { await navigator.clipboard.writeText(urlSite(adresse)); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { setMsg({ type: 'err', text: 'Copie impossible — sélectionnez le lien à la main.' }) } }

  async function authToken() { const { data } = await supabase.auth.getSession(); return data.session?.access_token }
  async function refreshDomaine() {
    setDomBusy(true); setDomMsg(null)
    try {
      const t = await authToken()
      const res = await fetch('/api/domain', { headers: { Authorization: `Bearer ${t}` } })
      const d = await res.json().catch(() => ({}))
      if (res.ok) { setDomSaved(d.domaine ?? null); setDomStatus(d.status ?? null); if (d.domaine) setDomaine(d.domaine) }
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
      setDomMsg({ type: 'ok', text: d.status?.served ? 'Domaine connecté et actif ✅' : 'Domaine enregistré. Ajoutez les enregistrements DNS ci-dessous, puis cliquez « Vérifier ».' })
    } catch { setDomMsg({ type: 'err', text: 'Connexion interrompue.' }) } finally { setDomBusy(false) }
  }
  async function retirerDomaine() {
    if (domBusy) return
    setDomBusy(true); setDomMsg(null)
    try {
      const t = await authToken()
      await fetch('/api/domain', { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } })
      setDomSaved(null); setDomStatus(null); setDomaine('')
      setDomMsg({ type: 'ok', text: 'Domaine retiré.' })
    } catch { /* silencieux */ } finally { setDomBusy(false) }
  }

  async function save() {
    setSaving(true); setMsg(null)
    const cleanServices = services.map((s) => ({ nom: s.nom.trim().slice(0, 80), description: s.description.trim().slice(0, 200) })).filter((s) => s.nom)
    // La vignette floue (blur) est conservée : sans ça, elle disparaîtrait au premier enregistrement.
    const cleanReal = realisations.filter((r) => r.image).slice(0, 12).map((r) => ({ image: r.image, titre: r.titre.trim().slice(0, 80), specialite: r.specialite.trim().slice(0, 50), ...(r.blur ? { blur: r.blur } : {}) }))
    const cleanReseaux: Reseaux = {}
    for (const { key } of RESEAUX) { const v = (reseaux[key] ?? '').trim().slice(0, 300); if (v) cleanReseaux[key] = v }
    // Contenu du site édité à la main (chaque texte est personnalisable).
    const t = (v: string, max: number) => (v ?? '').trim().slice(0, max)
    const cleanContenu = siteContenu ? {
      hero_accroche: t(siteContenu.hero_accroche, 80), hero_lede: t(siteContenu.hero_lede, 400), apropos: t(siteContenu.apropos, 900),
      prestations_intro: t(siteContenu.prestations_intro, 300), realisations_intro: t(siteContenu.realisations_intro, 300),
      cta_titre: t(siteContenu.cta_titre, 120), cta_texte: t(siteContenu.cta_texte, 300), meta_description: t(siteContenu.meta_description, 180),
      manifeste: t(siteContenu.manifeste, 120),
      mots_cles: (Array.isArray(siteContenu.mots_cles) ? siteContenu.mots_cles : []).map((m) => t(m, 22)).filter(Boolean).slice(0, 4),
      // v2 : conservés tels quels (rédigés par l'IA), édition dédiée à venir
      ...(Array.isArray(siteContenu.process) ? { process: siteContenu.process } : {}),
      ...(Array.isArray(siteContenu.faq) ? { faq: siteContenu.faq } : {}),
      ...(typeof siteContenu.zone_texte === 'string' ? { zone_texte: t(siteContenu.zone_texte, 240) } : {}),
    } : null
    const { error } = await supabase.from('artisans').update({
      bio: bio.trim().slice(0, 800) || null,
      zone_intervention: zone.trim().slice(0, 160) || null,
      horaires: horaires.trim().slice(0, 200) || null,
      services: cleanServices,
      realisations: cleanReal,
      avant_apres: avantApres.filter((p) => p.avant && p.apres).slice(0, 4).map((p) => ({ avant: p.avant, apres: p.apres, titre: p.titre.trim().slice(0, 80) })),
      reseaux: cleanReseaux,
      tel_public: telPublic.trim().slice(0, 40) || null,
      email_public: emailPublic.trim().slice(0, 160) || null,
      reponse_auto: reponseAuto,
      leads_pause: leadsPause,
      site_active: siteActive,
      site_tier: Math.min([1, 2, 3].includes(siteTier) ? siteTier : 3, siteMax),
      site_contact_integre: siteContact,
      ...(cleanContenu ? { site_contenu: cleanContenu } : {}),
      ...(layout.length ? { site_layout: { v: 2, sections: layout } } : {}),
      plateforme_active: active,
      accent: /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#D97757',
      theme: THEME_IDS.includes(theme) ? theme : 'atelier',
      site_style: styleSite,
    }).eq('id', uid)
    setSaving(false)
    if (error) { setMsg({ type: 'err', text: 'Enregistrement impossible.' }); return }
    setMsg({ type: 'ok', text: 'Profil enregistré ✅' })
    setPreviewKey((k) => k + 1) // recharge l'aperçu avec la nouvelle composition
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
    if (action === 'site_reinitialiser') {
      if (!confirm(texte + 'Confirmer la réinitialisation ?')) return
    } else {
      const s = prompt(texte + 'Tapez SUPPRIMER pour confirmer.')
      if (!s || s.trim().toUpperCase() !== 'SUPPRIMER') { setMsg({ type: 'err', text: 'Annulé — rien n’a été touché.' }); return }
    }
    const res = await fetch('/api/donnees', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ action, confirm: 'SUPPRIMER' }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Action impossible.' }); return }
    setMsg({ type: 'ok', text: d.message || 'C’est fait ✅' })
    setTimeout(() => window.location.reload(), 1400)
  }

  async function supprimerCompte() {
    const t = prompt('Cette action est DÉFINITIVE : votre compte et toutes vos données (page, conversations, devis, factures) seront supprimés.\n\nTapez SUPPRIMER pour confirmer.')
    if (t == null) return
    if (t.trim().toUpperCase() !== 'SUPPRIMER') { setMsg({ type: 'err', text: 'Suppression annulée (confirmation incorrecte).' }); return }
    const { data } = await supabase.auth.getSession()
    const res = await fetch('/api/account/delete', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    if (!res.ok) { setMsg({ type: 'err', text: 'Suppression impossible. Réessayez dans un instant.' }); return }
    await supabase.auth.signOut()
    router.replace('/')
  }

  async function genererSite() {
    if (genSite) return
    setGenSite(true); setMsg(null)
    const { data } = await supabase.auth.getSession()
    const res = await fetch('/api/site/generate', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    const d = await res.json().catch(() => ({}))
    setGenSite(false)
    if (!res.ok) { setMsg({ type: 'err', text: d.outOfCredits ? 'Crédits épuisés — rechargez pour laisser l’IA rédiger votre site.' : (d.error ?? 'Génération impossible.') }); return }
    if (d.contenu && typeof d.contenu === 'object') setSiteContenu({ ...CONTENU_VIDE, ...d.contenu, mots_cles: Array.isArray(d.contenu.mots_cles) ? d.contenu.mots_cles : [] })
    setMsg({ type: 'ok', text: 'Contenu rédigé par l’IA ✅ Relisez et personnalisez chaque texte ci-dessous, puis Enregistrez.' })
    setTimeout(() => setMsg(null), 5000)
  }

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
          <p className="muted" style={{ margin: '0 0 .7rem' }}>Collez-le dans votre bio (Facebook, Instagram, Le Bon Coin), votre signature mail, partout. Chaque contact arrive dans Presti et reçoit une réponse en moins d&apos;une minute.</p>
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

        {/* Apparence */}
        <div className="tool-card">
          <h2>Apparence</h2>
          <p className="muted" style={{ margin: '0 0 .8rem' }}>Le style visuel de votre site <b>et</b> de votre plateforme. Choisissez l&apos;ambiance, puis votre couleur d&apos;accent.</p>
          <div className="prof-themes">
            {THEMES.map((t) => (
              <button key={t.id} type="button" className={`prof-theme${theme === t.id ? ' on' : ''}`} onClick={() => setTheme(t.id)}>
                <span className="prof-theme-pv" style={{ background: t.sw[0] }}>
                  <span style={{ background: t.sw[1] }} /><span style={{ background: t.sw[1], opacity: .55 }} /><b style={{ background: t.sw[2] }} />
                </span>
                <b>{t.nom}</b><span className="prof-theme-d">{t.desc}</span>
              </button>
            ))}
          </div>
          <label style={{ display: 'block', margin: '1.1rem 0 .5rem', fontWeight: 600, fontSize: '.9rem' }}>Couleur d&apos;accent <Info cle="profil.accent" /></label>
          <div className="prof-accent">
            {['#D97757', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#0EA5A0', '#D9A441', '#64748B'].map((c) => (
              <button key={c} type="button" aria-label={c} className={`prof-swatch${accent.toLowerCase() === c.toLowerCase() ? ' on' : ''}`} style={{ background: c }} onClick={() => setAccent(c)} />
            ))}
            <label className="prof-swatch custom" style={{ background: accent }} title="Couleur libre">
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
            </label>
          </div>
        </div>

        {/* Réglages fins du site (v4 §7/E1) — replié par défaut, l'ambiance reste l'entrée simple. */}
        <StyleAvance
          valeur={styleSite}
          onChange={setStyleSite}
          metier={metier}
          accent={accent}
          onPreset={(t, c) => { setTheme(t); setAccent(c) }}
        />

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

        {/* Réalisations (portfolio par image) */}
        <div className="tool-card">
          <h2>Vos réalisations</h2>
          <p className="muted" style={{ margin: '0 0 .8rem' }}>Montrez votre travail en photos — chaque image avec un titre et une spécialité. C&apos;est ce qui donne confiance et déclenche les demandes.</p>
          <PortfolioUpload uid={uid} value={realisations} onChange={setRealisations} />
        </div>

        {/* Canaux connectés */}
        <div className="tool-card">
          <h2>Vos contacts &amp; réseaux</h2>
          <p className="muted" style={{ margin: '0 0 .8rem' }}>Affichés sur votre page pour que les clients vous joignent comme ils veulent. Laissez vide ce que vous ne voulez pas montrer.</p>
          <div className="grid2">
            <div><label>Téléphone (affiché) <Info cle="profil.telephone" /></label><input value={telPublic} onChange={(e) => setTelPublic(e.target.value)} placeholder="06 12 34 56 78" /></div>
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
          <p className="muted" style={{ margin: 0 }}>Le comportement de votre assistant (réponse automatique ou non, modèle, ton, devis auto, mise en pause) se règle désormais dans <a href="/plateforme" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>Ma plateforme → Intelligence</a> — tout au même endroit.</p>
        </div>

        {/* Site web (constructeur 3 niveaux) */}
        <div className="tool-card">
          <h2>Votre site web</h2>
          <p className="muted" style={{ margin: '0 0 .9rem' }}>Un vrai site vitrine, généré depuis votre profil (présentation, réalisations, prestations, contacts). Choisissez le niveau, publiez, partagez.</p>
          <div className="site-tiers">
            {TIERS.map((t) => {
              const locked = t.n > siteMax
              return (
                <button key={t.n} type="button" className={`site-tier${siteTier === t.n ? ' on' : ''}${locked ? ' locked' : ''}`} onClick={() => { if (!locked) setSiteTier(t.n) }} disabled={locked} aria-disabled={locked}>
                  <span className="st-n">Niveau {t.n}{locked ? ' · 🔒' : ''}</span>
                  <b>{t.nom}</b>
                  <span className="st-d">{t.desc}</span>
                  {locked ? <span className="st-lock">Inclus dès {t.n === 2 ? 'Studio' : 'Signature'}</span> : null}
                </button>
              )
            })}
          </div>
          {siteMax < 3 ? (
            <p className="muted" style={{ margin: '.6rem 0 0', fontSize: '.83rem' }}>
              Votre formule inclut le site <b>{siteMax === 1 ? 'Essentiel' : 'Pro'}</b>. <a href="/abonnement" style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>Passez à {siteMax === 1 ? 'Studio ou Signature' : 'Signature'}</a> pour débloquer les niveaux supérieurs{siteMax === 1 ? ' (galerie, cinématique)' : ' (cinématique, niveau agence)'}.
            </p>
          ) : null}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn--ghost" style={{ width: 'auto' }} disabled={genSite} onClick={genererSite}>{genSite ? 'L’IA rédige votre site…' : (siteContenu ? '⚡ Régénérer avec l’IA' : '⚡ Rédiger mon site avec l’IA')}</button>
            <span className="muted" style={{ fontSize: '.85rem' }}>Titres, accroches et à-propos rédigés sur-mesure à partir de votre profil.</span>
          </div>

          {/* Composeur de page — l'artisan agence ses sections (ordre + affichage). Le gating par niveau reste côté serveur. */}
          {layout.length > 0 && (
            <div className="site-compose">
              <div className="site-compose-h">
                <b>Agencer votre page</b>
                <span className="muted">Montez, descendez, affichez ou masquez chaque bloc. L’en-tête et le contact restent toujours là.</span>
              </div>
              <div className="site-compose-list">
                {layout.map((s, i) => {
                  const locked = SECTION_MIN_TIER[s.id] > siteTier
                  const fixed = FIXED.includes(s.id)
                  const shown = s.on && !locked
                  return (
                    <div className={`site-sec${shown ? ' on' : ''}${locked ? ' locked' : ''}`} key={s.id}>
                      <span className="site-sec-move">
                        <button type="button" aria-label="Monter" disabled={i === 0} onClick={() => moveSection(i, -1)}>▲</button>
                        <button type="button" aria-label="Descendre" disabled={i === layout.length - 1} onClick={() => moveSection(i, 1)}>▼</button>
                      </span>
                      <span className="site-sec-lab">
                        {SECTION_LABELS[s.id]}
                        {locked ? <em className="site-sec-lock">Niveau {SECTION_MIN_TIER[s.id]} requis</em> : null}
                      </span>
                      {fixed ? (
                        <span className="site-sec-fixed">Toujours affiché</span>
                      ) : (
                        <button type="button" className={`site-sec-tog${shown ? ' on' : ''}`} disabled={locked} aria-pressed={shown} onClick={() => toggleSection(s.id)}>
                          {shown ? 'Affiché' : 'Masqué'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Édition libre du contenu — tout est personnalisable (l'IA propose, vous décidez). */}
          {siteContenu && (
            <div className="site-copy">
              <div className="site-copy-h">
                <b>Les textes de votre site</b>
                <span className="muted">L’IA a écrit une première version — modifiez chaque mot, c’est votre site. Pensez à Enregistrer.</span>
              </div>
              <label>Signature (accroche sous votre nom) <Info cle="profil.hero_accroche" /></label>
              <input value={siteContenu.hero_accroche} onChange={(e) => setC({ hero_accroche: e.target.value })} maxLength={80} placeholder="Ex : Le bois travaillé avec exigence" />
              <label>Phrase d’introduction <Info cle="profil.hero_lede" /></label>
              <textarea rows={2} value={siteContenu.hero_lede} onChange={(e) => setC({ hero_lede: e.target.value })} maxLength={400} />
              {siteTier === 3 && (
                <>
                  <label>Mots-clés géants (jusqu’à 4, affichés en grand) <Info cle="profil.mots_cles" /></label>
                  <div className="site-mots">
                    {[0, 1, 2, 3].map((i) => (
                      <input key={i} value={(siteContenu.mots_cles ?? [])[i] ?? ''} onChange={(e) => setMot(i, e.target.value)} maxLength={22} placeholder={`Mot ${i + 1}`} />
                    ))}
                  </div>
                  <label>Manifeste (grande phrase pleine page) <Info cle="profil.manifeste" /></label>
                  <input value={siteContenu.manifeste} onChange={(e) => setC({ manifeste: e.target.value })} maxLength={120} placeholder="Ex : Dessiné, taillé, assemblé : le bois prend vie ici." />
                </>
              )}
              <label>À propos <Info cle="profil.apropos" /></label>
              <textarea rows={4} value={siteContenu.apropos} onChange={(e) => setC({ apropos: e.target.value })} maxLength={900} />
              <div className="grid2" style={{ marginTop: '.2rem' }}>
                <div><label>Intro « Prestations »</label><input value={siteContenu.prestations_intro} onChange={(e) => setC({ prestations_intro: e.target.value })} maxLength={300} /></div>
                <div><label>Intro « Réalisations »</label><input value={siteContenu.realisations_intro} onChange={(e) => setC({ realisations_intro: e.target.value })} maxLength={300} /></div>
              </div>
              <div className="grid2" style={{ marginTop: '.2rem' }}>
                <div><label>Titre de la section contact</label><input value={siteContenu.cta_titre} onChange={(e) => setC({ cta_titre: e.target.value })} maxLength={120} /></div>
                <div><label>Texte de la section contact</label><input value={siteContenu.cta_texte} onChange={(e) => setC({ cta_texte: e.target.value })} maxLength={300} /></div>
              </div>
              <label>Description Google (SEO) — 150 à 160 caractères</label>
              <textarea rows={2} value={siteContenu.meta_description} onChange={(e) => setC({ meta_description: e.target.value })} maxLength={180} />
            </div>
          )}

          <label className="prof-toggle" style={{ marginTop: '1rem' }}>
            <input type="checkbox" checked={siteContact} onChange={(e) => setSiteContact(e.target.checked)} />
            <span>Formulaire de contact <b>{siteContact ? 'intégré au site' : 'renvoyé vers la plateforme'}</b> {siteContact ? '— le client discute directement sur votre site' : '— un bouton mène à votre page de contact'}</span>
            <Info cle="profil.contact_integre" />
          </label>
          <label className="prof-toggle" style={{ marginTop: '.7rem' }}>
            <input type="checkbox" checked={siteActive} onChange={(e) => setSiteActive(e.target.checked)} />
            <span>Mon site est <b>{siteActive ? 'publié' : 'hors ligne'}</b> {siteActive ? '— accessible à tous' : '— visible de vous seul'}</span>
            <Info cle="profil.site_actif" />
          </label>
          {slug ? (
            <AdresseEditor slug={slug} prefixe={afficher(urlSite(adresse)).slice(0, -slug.length)} jeton={authToken} onChange={setSlug} />
          ) : null}
          {slug && siteActive && (
            <div className="site-publish">
              <div className="site-publish-share">
                <div className="prof-link" style={{ margin: 0, flex: '1 1 240px' }}>
                  <span>{afficher(urlSite(adresse))}</span>
                  <button type="button" className="btn btn--ghost" style={{ width: 'auto' }} onClick={copierLien}>{copied ? 'Copié ✅' : 'Copier le lien'}</button>
                </div>
                <a className="btn btn--ghost" style={{ width: 'auto' }} href={urlSite(adresse)} target="_blank" rel="noopener">Voir en grand ↗</a>
              </div>
              <div className="site-preview">
                <div className="site-preview-bar">
                  <span className="muted">Aperçu de votre site en ligne</span>
                  <button type="button" className="site-preview-refresh" onClick={() => setPreviewKey((k) => k + 1)} aria-label="Rafraîchir l’aperçu">↻ Rafraîchir</button>
                </div>
                <div className="site-preview-frame">
                  <iframe key={previewKey} src={`/site/${slug}?preview=1`} title="Aperçu du site" loading="lazy" />
                </div>
                <p className="muted" style={{ margin: '.5rem 0 0', fontSize: '.8rem' }}>L’aperçu montre la version <b>enregistrée</b>. Modifiez, cliquez Enregistrer, puis Rafraîchir.</p>
              </div>
            </div>
          )}

          {/* Avant / après — offre Signature (niveau 3) */}
          {siteMax >= 3 ? (
            <div className="site-domain">
              <div className="site-domain-h">
                <b>Avant / après</b>
                <span className="muted">Montrez vos transformations en 3D : une photo brute + une photo finie de la même pièce. Inclus dans l’offre Signature.</span>
              </div>
              <AvantApresUpload uid={uid} value={avantApres} onChange={setAvantApres} />
            </div>
          ) : null}

          {/* Domaine personnalisé — offre Signature (niveau 3) */}
          {siteMax >= 3 ? (
            <div className="site-domain">
              <div className="site-domain-h">
                <b>Votre nom de domaine <Info cle="profil.domaine" /></b>
                <span className="muted">Branchez votre propre adresse (ex : mon-entreprise.fr). Inclus dans l’offre Signature.</span>
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
                    <span className="pdot" />{domStatus.served ? 'Actif — votre site est servi sur ce domaine' : 'En attente de la configuration DNS'}
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
            <button className="btn btn--ghost" style={{ width: 'auto' }} onClick={() => actionDonnees('site_reinitialiser', 'Réinitialiser le site')}>
              Réinitialiser le site
              <small>Efface les textes et la composition. Vos images restent.</small>
            </button>
            <button className="btn btn--ghost danger" style={{ width: 'auto' }} onClick={() => actionDonnees('site_supprimer', 'Supprimer le site')}>
              Supprimer le site
              <small>Dépublie et efface contenu + images. Le compte reste.</small>
            </button>
            <button className="btn btn--ghost danger" style={{ width: 'auto' }} onClick={() => actionDonnees('plateforme_supprimer', 'Supprimer la plateforme')}>
              Supprimer la plateforme
              <small>Efface les réglages. Vos conversations sont conservées.</small>
            </button>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '1.2rem 0' }} />
          <p className="muted" style={{ margin: '0 0 .8rem' }}>Supprimer votre <b>compte</b> efface définitivement votre page, vos conversations, devis et factures. Cette action est irréversible.</p>
          <button className="btn btn--ghost danger" style={{ width: 'auto' }} onClick={supprimerCompte}>Supprimer mon compte</button>
        </div>

        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`}>{msg.text}</div>}
      </div>
    </AppShell>
  )
}
