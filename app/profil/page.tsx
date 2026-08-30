'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import LogoUpload from '@/app/LogoUpload'

type Service = { nom: string; description: string }

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
      setReady(true)
    })
  }, [router])

  function setService(i: number, patch: Partial<Service>) {
    setServices((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  }

  async function save() {
    setSaving(true); setMsg(null)
    const cleanServices = services.map((s) => ({ nom: s.nom.trim().slice(0, 80), description: s.description.trim().slice(0, 200) })).filter((s) => s.nom)
    const { error } = await supabase.from('artisans').update({
      bio: bio.trim().slice(0, 800) || null,
      zone_intervention: zone.trim().slice(0, 160) || null,
      horaires: horaires.trim().slice(0, 200) || null,
      services: cleanServices,
      plateforme_active: active,
    }).eq('id', uid)
    setSaving(false)
    if (error) { setMsg({ type: 'err', text: 'Enregistrement impossible.' }); return }
    setMsg({ type: 'ok', text: 'Profil enregistré ✅' })
    setTimeout(() => setMsg(null), 2500)
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

        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`}>{msg.text}</div>}
      </div>
    </AppShell>
  )
}
