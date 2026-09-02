'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'

// Paramètres à onglets (v4 §C2). Choix assumé : on n'a PAS rasé /profil qui fonctionne.
// Cette page porte les sections qui n'existaient nulle part (entreprise & légal, sécurité,
// données) et renvoie vers les écrans déjà en place pour le reste.

type Onglet = 'legal' | 'securite' | 'donnees' | 'raccourcis'
const ONGLETS: { id: Onglet; label: string }[] = [
  { id: 'legal', label: 'Entreprise & légal' },
  { id: 'securite', label: 'Sécurité' },
  { id: 'donnees', label: 'Données & confidentialité' },
  { id: 'raccourcis', label: 'Le reste' },
]

type Legal = { siret: string; tva_num: string; iban: string; assurance_nom: string; assurance_contrat: string; assurance_zone: string; assurance_activites: string }
const LEGAL_VIDE: Legal = { siret: '', tva_num: '', iban: '', assurance_nom: '', assurance_contrat: '', assurance_zone: '', assurance_activites: '' }

function ParametresInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [onglet, setOnglet] = useState<Onglet>('legal')
  const [ready, setReady] = useState(false)
  const [uid, setUid] = useState('')
  const [legal, setLegal] = useState<Legal>(LEGAL_VIDE)
  const [aTva, setATva] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mdp, setMdp] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    const o = params.get('onglet') as Onglet | null
    if (o && ONGLETS.some((x) => x.id === o)) setOnglet(o)
  }, [params])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const id = data.session.user.id
      setUid(id)
      const { data: a } = await supabase.from('artisans').select('*').eq('id', id).maybeSingle()
      if (!a) { router.replace('/onboarding'); return }
      setLegal({
        siret: a.siret ?? '', tva_num: a.tva_num ?? '', iban: a.iban ?? '',
        assurance_nom: a.assurance_nom ?? '', assurance_contrat: a.assurance_contrat ?? '',
        assurance_zone: a.assurance_zone ?? '', assurance_activites: a.assurance_activites ?? '',
      })
      setATva(!!a.tva_num)
      setReady(true)
    })
  }, [router])

  function setL<K extends keyof Legal>(k: K, v: string) { setLegal((p) => ({ ...p, [k]: v })) }

  async function enregistrerLegal() {
    if (saving) return
    setSaving(true); setMsg(null)
    const { error } = await supabase.from('artisans').update({
      siret: legal.siret.trim() || null,
      tva_num: aTva ? (legal.tva_num.trim() || null) : null,
      iban: legal.iban.replace(/\s+/g, '').toUpperCase() || null,
      assurance_nom: legal.assurance_nom.trim() || null,
      assurance_contrat: legal.assurance_contrat.trim() || null,
      assurance_zone: legal.assurance_zone.trim() || null,
      assurance_activites: legal.assurance_activites.trim() || null,
    }).eq('id', uid)
    setSaving(false)
    setMsg(error ? { type: 'err', text: 'Enregistrement impossible.' } : { type: 'ok', text: 'Informations enregistrées ✅' })
    setTimeout(() => setMsg(null), 2600)
  }

  async function changerMdp() {
    if (busy) return
    if (mdp.length < 8) { setMsg({ type: 'err', text: 'Choisissez au moins 8 caractères.' }); return }
    setBusy(true); setMsg(null)
    const { error } = await supabase.auth.updateUser({ password: mdp })
    setBusy(false); setMdp('')
    setMsg(error ? { type: 'err', text: 'Changement impossible.' } : { type: 'ok', text: 'Mot de passe modifié ✅' })
  }

  async function deconnecterAutres() {
    if (busy) return
    setBusy(true); setMsg(null)
    const { error } = await supabase.auth.signOut({ scope: 'others' })
    setBusy(false)
    setMsg(error ? { type: 'err', text: 'Action impossible.' } : { type: 'ok', text: 'Vos autres sessions ont été fermées ✅' })
  }

  async function exporter() {
    const t = (await supabase.auth.getSession()).data.session?.access_token
    const res = await fetch('/api/donnees/export', { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) { setMsg({ type: 'err', text: 'Export impossible.' }); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `mes-donnees-presti-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  if (!ready) return <AppShell active="parametres" title="Paramètres"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>

  return (
    <AppShell active="parametres" title="Paramètres">
      <div className="param-onglets" role="tablist">
        {ONGLETS.map((o) => (
          <button key={o.id} role="tab" aria-selected={onglet === o.id} className={onglet === o.id ? 'on' : ''} onClick={() => setOnglet(o.id)}>{o.label}</button>
        ))}
      </div>

      <div className="prof-grid">
        {onglet === 'legal' ? (
          <div className="tool-card">
            <h2>Entreprise &amp; légal</h2>
            <p className="muted" style={{ margin: '0 0 1rem' }}>Ces informations apparaissent sur vos devis et factures — elles sont obligatoires pour qu’ils soient conformes.</p>
            <label>SIRET</label>
            <input value={legal.siret} onChange={(e) => setL('siret', e.target.value)} placeholder="14 chiffres" maxLength={20} />
            <label className="prof-toggle" style={{ marginTop: '.9rem' }}>
              <input type="checkbox" checked={aTva} onChange={(e) => setATva(e.target.checked)} />
              <span>Je suis <b>assujetti à la TVA</b> {aTva ? '' : '— sinon la mention « TVA non applicable, art. 293 B du CGI » est portée sur vos documents'}</span>
            </label>
            {aTva ? (<><label>Numéro de TVA intracommunautaire</label><input value={legal.tva_num} onChange={(e) => setL('tva_num', e.target.value)} placeholder="FR…" maxLength={20} /></>) : null}
            <label>IBAN (pour le règlement de vos factures)</label>
            <input value={legal.iban} onChange={(e) => setL('iban', e.target.value)} placeholder="FR76…" maxLength={40} />
            <h3 style={{ margin: '1.6rem 0 .2rem', fontSize: '1rem' }}>Assurance professionnelle</h3>
            <p className="muted" style={{ margin: '0 0 .6rem', fontSize: '.85rem' }}>Obligatoire sur les devis et factures du bâtiment (garantie décennale).</p>
            <label>Assureur</label>
            <input value={legal.assurance_nom} onChange={(e) => setL('assurance_nom', e.target.value)} placeholder="Ex : AXA" />
            <label>N° de contrat</label>
            <input value={legal.assurance_contrat} onChange={(e) => setL('assurance_contrat', e.target.value)} />
            <label>Zone géographique couverte</label>
            <input value={legal.assurance_zone} onChange={(e) => setL('assurance_zone', e.target.value)} placeholder="Ex : France métropolitaine" />
            <label>Activités couvertes</label>
            <input value={legal.assurance_activites} onChange={(e) => setL('assurance_activites', e.target.value)} placeholder="Ex : menuiserie, agencement" />
            <button className="btn btn--primary" style={{ width: 'auto', marginTop: '1.2rem' }} disabled={saving} onClick={enregistrerLegal}>{saving ? '…' : 'Enregistrer'}</button>
          </div>
        ) : null}

        {onglet === 'securite' ? (
          <div className="tool-card">
            <h2>Sécurité</h2>
            <p className="muted" style={{ margin: '0 0 1rem' }}>Votre mot de passe est stocké haché : personne, pas même nous, ne peut le lire. On ne peut que le remplacer.</p>
            <label>Nouveau mot de passe</label>
            <input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} placeholder="8 caractères minimum" autoComplete="new-password" />
            <button className="btn btn--primary" style={{ width: 'auto', marginTop: '.9rem' }} disabled={busy || !mdp} onClick={changerMdp}>{busy ? '…' : 'Changer mon mot de passe'}</button>
            <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '1.4rem 0' }} />
            <h3 style={{ margin: '0 0 .3rem', fontSize: '1rem' }}>Vos autres appareils</h3>
            <p className="muted" style={{ margin: '0 0 .8rem', fontSize: '.88rem' }}>Vous avez utilisé un ordinateur qui n’est pas le vôtre ? Fermez toutes les autres sessions — elles seront réellement invalidées, pas seulement oubliées.</p>
            <button className="btn btn--ghost" style={{ width: 'auto' }} disabled={busy} onClick={deconnecterAutres}>Fermer mes autres sessions</button>
          </div>
        ) : null}

        {onglet === 'donnees' ? (
          <div className="tool-card">
            <h2>Données &amp; confidentialité</h2>
            <p className="muted" style={{ margin: '0 0 1rem' }}>Vos données vous appartiennent. Vous pouvez les emporter à tout moment, et supprimer chaque partie séparément.</p>
            <button className="btn btn--primary" style={{ width: 'auto' }} onClick={exporter}>Exporter toutes mes données</button>
            <p className="muted" style={{ margin: '.6rem 0 1.4rem', fontSize: '.85rem' }}>Fichier JSON : profil, conversations, messages, devis, factures, clients.</p>
            <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '0 0 1.2rem' }} />
            <h3 style={{ margin: '0 0 .3rem', fontSize: '1rem' }}>Supprimer une partie</h3>
            <p className="muted" style={{ margin: '0 0 .8rem', fontSize: '.88rem' }}>Site, plateforme ou conversation — chacun se supprime séparément, sans toucher à votre compte. Les devis envoyés et factures émises sont conservés : la loi l’impose.</p>
            <a className="btn btn--ghost" style={{ width: 'auto', display: 'inline-flex' }} href="/profil#donnees">Ouvrir les suppressions</a>
          </div>
        ) : null}

        {onglet === 'raccourcis' ? (
          <div className="tool-card">
            <h2>Le reste de vos réglages</h2>
            <p className="muted" style={{ margin: '0 0 1rem' }}>Ces écrans existent déjà et fonctionnent — on ne les a pas déplacés pour le plaisir de déplacer.</p>
            <div className="dz-actions">
              <a className="btn btn--ghost" style={{ width: 'auto' }} href="/profil">Ma page<small>Profil, site, apparence, publication</small></a>
              <a className="btn btn--ghost" style={{ width: 'auto' }} href="/plateforme">Ma plateforme<small>Lien, assistant, automatisations</small></a>
              <a className="btn btn--ghost" style={{ width: 'auto' }} href="/abonnement">Abonnement<small>Formule, crédits, facturation</small></a>
            </div>
          </div>
        ) : null}

        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`}>{msg.text}</div>}
      </div>
    </AppShell>
  )
}

export default function ParametresPage() {
  return <Suspense fallback={<AppShell active="parametres" title="Paramètres"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>}><ParametresInner /></Suspense>
}
