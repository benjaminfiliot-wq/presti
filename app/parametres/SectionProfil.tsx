'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AdresseEditor from '@/app/AdresseEditor'
import AvatarUpload from '@/app/AvatarUpload'
import { afficher, urlPlateforme, urlSite } from '@/lib/urls'
import { jeton, type SectionProps } from './commun'

// Profil : qui vous êtes dans Presti — photo, nom, adresse publique. Les notifications (emails, push)
// vivent dans l'onglet Notifications depuis v9 J2. Chaque réglage s'enregistre seul : pas de gros bouton « Enregistrer »
// en bas qui ferait perdre trois modifications d'un coup.

export default function SectionProfil({ a, patch, signaler }: SectionProps) {
  const [nom, setNom] = useState(a.nom ?? '')
  const [saving, setSaving] = useState(false)
  const slug = a.slug ?? ''
  const adresse = { slug, domaine: a.domaine, domaine_verifie: a.domaine_verifie }
  const site = afficher(urlSite(adresse))
  const prefixe = slug ? site.slice(0, -slug.length) : site

  async function enregistrerNom() {
    if (saving) return
    const v = nom.trim()
    if (!v) { signaler({ type: 'err', text: 'Le nom ne peut pas être vide.' }); return }
    setSaving(true)
    const { error } = await supabase.from('artisans').update({ nom: v }).eq('id', a.id)
    setSaving(false)
    if (error) { signaler({ type: 'err', text: 'Enregistrement impossible.' }); return }
    patch({ nom: v }); signaler({ type: 'ok', text: 'Nom enregistré ✅' })
  }

  return (
    <>
      <div className="tool-card">
        <h2>Profil</h2>
        <p className="muted" style={{ margin: '0 0 1.1rem' }}>Ce que vos clients et vos documents voient de vous.</p>
        <label style={{ marginTop: 0 }}>Photo</label>
        <AvatarUpload uid={a.id} value={a.logo_url} nom={a.nom} onChange={(v) => patch({ logo_url: v })} />
        <label>Nom affiché</label>
        <div className="param-ligne">
          <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80} placeholder="Votre nom ou celui de votre entreprise" onKeyDown={(e) => { if (e.key === 'Enter') enregistrerNom() }} />
          <button type="button" className="btn btn--primary" disabled={saving || nom.trim() === (a.nom ?? '')} onClick={enregistrerNom}>{saving ? '…' : 'Enregistrer'}</button>
        </div>
        <p className="muted" style={{ fontSize: '.82rem', margin: '.35rem 0 0' }}>Repris en en-tête de vos devis, de vos factures et de votre plateforme.</p>
      </div>

      <div className="tool-card">
        <h2>Adresse publique</h2>
        <p className="muted" style={{ margin: '0 0 .8rem' }}>Là où vos clients vous trouvent : votre site et votre plateforme de conversation.</p>
        <div className="param-urls">
          <div><span>Site</span><a href={urlSite(adresse)} target="_blank" rel="noreferrer">{site}</a></div>
          <div><span>Plateforme</span><a href={urlPlateforme(adresse)} target="_blank" rel="noreferrer">{afficher(urlPlateforme(adresse))}</a></div>
        </div>
        {slug ? <AdresseEditor slug={slug} prefixe={prefixe} jeton={jeton} onChange={(s) => patch({ slug: s })} /> : null}
      </div>

    </>
  )
}
