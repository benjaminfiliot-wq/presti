'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import LogoUpload from '@/app/LogoUpload'
import PortfolioUpload, { type Realisation } from '@/app/PortfolioUpload'

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
  const [realisations, setRealisations] = useState<Realisation[]>([])
  const [reseaux, setReseaux] = useState<Reseaux>({})
  const [telPublic, setTelPublic] = useState('')
  const [emailPublic, setEmailPublic] = useState('')
  const [reponseAuto, setReponseAuto] = useState(true)
  const [active, setActive] = useState(true)
  const [accent, setAccent] = useState('#D97757')
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
      setServices(Array.isArray(a.services) ? (a.services as Service[]).map((s) => ({ nom: s.nom ?? '', description: s.description ?? '' })) : [])
      setRealisations(Array.isArray(a.realisations) ? (a.realisations as Realisation[]).map((r) => ({ image: r.image ?? '', titre: r.titre ?? '', specialite: r.specialite ?? '' })).filter((r) => r.image) : [])
      setReseaux((a.reseaux && typeof a.reseaux === 'object') ? a.reseaux as Reseaux : {})
      setTelPublic(a.tel_public ?? ''); setEmailPublic(a.email_public ?? ''); setReponseAuto(a.reponse_auto !== false)
      setReady(true)
    })
  }, [router])

  function setService(i: number, patch: Partial<Service>) {
    setServices((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  }

  async function save() {
    setSaving(true); setMsg(null)
    const cleanServices = services.map((s) => ({ nom: s.nom.trim().slice(0, 80), description: s.description.trim().slice(0, 200) })).filter((s) => s.nom)
    const cleanReal = realisations.filter((r) => r.image).slice(0, 12).map((r) => ({ image: r.image, titre: r.titre.trim().slice(0, 80), specialite: r.specialite.trim().slice(0, 50) }))
    const cleanReseaux: Reseaux = {}
    for (const { key } of RESEAUX) { const v = (reseaux[key] ?? '').trim().slice(0, 300); if (v) cleanReseaux[key] = v }
    const { error } = await supabase.from('artisans').update({
      bio: bio.trim().slice(0, 800) || null,
      zone_intervention: zone.trim().slice(0, 160) || null,
      horaires: horaires.trim().slice(0, 200) || null,
      services: cleanServices,
      realisations: cleanReal,
      reseaux: cleanReseaux,
      tel_public: telPublic.trim().slice(0, 40) || null,
      email_public: emailPublic.trim().slice(0, 160) || null,
      reponse_auto: reponseAuto,
      plateforme_active: active,
      accent: /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#D97757',
    }).eq('id', uid)
    setSaving(false)
    if (error) { setMsg({ type: 'err', text: 'Enregistrement impossible.' }); return }
    setMsg({ type: 'ok', text: 'Profil enregistré ✅' })
    setTimeout(() => setMsg(null), 2500)
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

  const lien = slug ? `prestiapp.fr/l/${slug}` : ''

  const actions = (
    <>
      {slug && <a className="psh-btn ghost" href={`/l/${slug}`} target="_blank" rel="noopener">Voir ma page ↗</a>}
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
              <label>Photo / logo</label>
              {uid && <LogoUpload uid={uid} value={logoUrl} onChange={setLogoUrl} />}
            </div>
          </div>
          <div className="grid2" style={{ marginTop: '.6rem' }}>
            <div><label>Nom affiché</label><input value={nom} disabled title="Modifiable dans vos informations" /></div>
            <div><label>Métier</label><input value={metier} disabled title="Modifiable dans vos informations" /></div>
          </div>
          <label>Présentation (bio)</label>
          <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Ex : Artisan plombier depuis 15 ans. Dépannage rapide, travail soigné, devis clair et sans surprise." />
          <div className="grid2" style={{ marginTop: '.6rem' }}>
            <div><label>Zone d&apos;intervention</label><input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ex : La Rochelle et 30 km alentour" /></div>
            <div><label>Disponibilités</label><input value={horaires} onChange={(e) => setHoraires(e.target.value)} placeholder="Ex : Lun–Ven 8h–18h · Urgences 7j/7" /></div>
          </div>
        </div>

        {/* Apparence */}
        <div className="tool-card">
          <h2>Couleur de votre page</h2>
          <p className="muted" style={{ margin: '0 0 .7rem' }}>L&apos;accent de votre page publique — choisissez ce qui vous ressemble.</p>
          <div className="prof-accent">
            {['#D97757', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#0EA5A0', '#D9A441', '#64748B'].map((c) => (
              <button key={c} type="button" aria-label={c} className={`prof-swatch${accent.toLowerCase() === c.toLowerCase() ? ' on' : ''}`} style={{ background: c }} onClick={() => setAccent(c)} />
            ))}
            <label className="prof-swatch custom" style={{ background: accent }} title="Couleur libre">
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
            </label>
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

        {/* Réalisations (portfolio par image) */}
        <div className="tool-card">
          <h2>Vos réalisations</h2>
          <p className="muted" style={{ margin: '0 0 .8rem' }}>Montrez votre travail en photos — chaque image avec un titre et une spécialité. C&apos;est ce qui donne confiance et déclenche les demandes.</p>
          <PortfolioUpload value={realisations} onChange={setRealisations} />
        </div>

        {/* Canaux connectés */}
        <div className="tool-card">
          <h2>Vos contacts &amp; réseaux</h2>
          <p className="muted" style={{ margin: '0 0 .8rem' }}>Affichés sur votre page pour que les clients vous joignent comme ils veulent. Laissez vide ce que vous ne voulez pas montrer.</p>
          <div className="grid2">
            <div><label>Téléphone (affiché)</label><input value={telPublic} onChange={(e) => setTelPublic(e.target.value)} placeholder="06 12 34 56 78" /></div>
            <div><label>Email (affiché)</label><input value={emailPublic} onChange={(e) => setEmailPublic(e.target.value)} placeholder="contact@votre-entreprise.fr" /></div>
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
          <label className="prof-toggle">
            <input type="checkbox" checked={reponseAuto} onChange={(e) => setReponseAuto(e.target.checked)} />
            <span>Réponse <b>{reponseAuto ? 'automatique' : 'manuelle'}</b> {reponseAuto ? '— l’IA répond tout de suite, à votre place (vous gardez la main ensuite)' : '— vous répondez vous-même depuis vos messages (l’IA vous suggère un brouillon)'}</span>
          </label>
        </div>

        {/* Zone dangereuse — droit à l'effacement (RGPD) */}
        <div className="tool-card danger-zone">
          <h2>Zone dangereuse</h2>
          <p className="muted" style={{ margin: '0 0 .8rem' }}>Supprimer votre compte efface définitivement votre page, vos conversations, devis et factures. Cette action est irréversible.</p>
          <button className="btn btn--ghost danger" style={{ width: 'auto' }} onClick={supprimerCompte}>Supprimer mon compte</button>
        </div>

        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`}>{msg.text}</div>}
      </div>
    </AppShell>
  )
}
