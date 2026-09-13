'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { actif } from '@/lib/flags'
import AppShell from '@/app/AppShell'
import { uploadArtisanMedia, preparerPhoto } from '@/lib/media'
import {
  Brouillon, Commande,
  PRIX_SITE_TEXTE, DELAI_ANNONCE,
  METIERS_SECONDAIRES_MAX, COMMUNES_MAX, PHOTOS_MIN, PHOTOS_MAX,
  LIBELLE_ETAT, sirenValide, erreursAvantPaiement
} from '@/lib/siteCommande'

type Etape = 'domaine' | 'zone' | 'matiere' | 'paiement'

const ETAPES: { id: Etape; nom: string }[] = [
  { id: 'domaine', nom: 'Le domaine' },
  { id: 'zone', nom: 'Métier & Zone' },
  { id: 'matiere', nom: 'La matière' },
  { id: 'paiement', nom: 'Le paiement' },
]

export default function CommanderSitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const p_paiement = searchParams?.get('paiement')
  const p_etape = searchParams?.get('etape')

  const [ready, setReady] = useState(false)
  const [etape, setEtape] = useState<Etape>(() => {
    if (p_etape && ['domaine', 'zone', 'matiere', 'paiement'].includes(p_etape)) {
      return p_etape as Etape
    }
    if (p_paiement === 'annule') return 'paiement'
    return 'domaine'
  })

  useEffect(() => {
    if (p_etape && ['domaine', 'zone', 'matiere', 'paiement'].includes(p_etape)) {
      setEtape(p_etape as Etape)
    } else if (p_paiement === 'annule') {
      setEtape('paiement')
    }
  }, [p_etape, p_paiement])
  const [brouillon, setBrouillon] = useState<Brouillon>({
    domaine_mode: 'aucun',
    domaine: null,
    metier: '',
    metiers_secondaires: [],
    communes: [],
    matiere: { photos: [], adresse: '', siren: '', horaires: '', decennale: { assureur: '', numero: '' }, avis_google: { url: '' }, logo_url: null }
  })
  const [erreursApi, setErreursApi] = useState<string[]>([])
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [busy, setBusy] = useState(false)

  const [metierSec, setMetierSec] = useState('')
  const [commune, setCommune] = useState('')

  useEffect(() => {
    if (!actif('siteCommande')) notFound()
  }, [])

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token

  const charger = useCallback(async () => {
    const t = await jeton()
    if (!t) return
    const r = await fetch('/api/site/commander/brouillon', { headers: { Authorization: `Bearer ${t}` } })
    if (r.status === 404) return notFound()
    if (r.status === 401) { router.replace('/login'); return }
    const d = await r.json().catch(() => ({}))
    if (d.brouillon) {
      setBrouillon((prev) => ({
        ...prev,
        ...d.brouillon,
        matiere: { ...prev.matiere, ...(d.brouillon.matiere || {}) }
      }))
    }
    if (d.erreurs) setErreursApi(d.erreurs)
    if (d.commandes) setCommandes(d.commandes)
    setReady(true)

    if (p_paiement === 'annule') setEtape('paiement')
  }, [router, p_paiement])

  useEffect(() => {
    charger()
  }, [charger])

  const activeCmd = commandes.find((c) => c.etat !== 'brouillon')

  const saveAndNext = async (suivante: Etape) => {
    setBusy(true)
    const t = await jeton()
    const r = await fetch('/api/site/commander/brouillon', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(brouillon),
    })
    const d = await r.json().catch(() => ({}))
    if (d.brouillon) {
      setBrouillon((prev) => ({
        ...prev,
        ...d.brouillon,
        matiere: { ...prev.matiere, ...(d.brouillon.matiere || {}) }
      }))
    }
    if (d.erreurs) setErreursApi(d.erreurs)
    setEtape(suivante)
    setBusy(false)
  }

  const payer = async () => {
    setBusy(true)
    const t = await jeton()
    const r = await fetch('/api/site/commander', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
    })
    const d = await r.json().catch(() => ({}))
    if (r.ok && d.url) {
      window.location.assign(d.url)
    } else {
      alert(d.error || 'Erreur lors de l’initialisation du paiement.')
      setBusy(false)
    }
  }

  const upload = async (file: File, isLogo: boolean) => {
    if (!file) return
    setBusy(true)
    try {
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user.id
      if (!uid) throw new Error('Non connecté')

      if (isLogo) {
        const prep = await preparerPhoto(file, 'detail')
        const url = await uploadArtisanMedia(uid, prep.blob, prep.ext)
        setBrouillon((b) => ({ ...b, matiere: { ...b.matiere, logo_url: url } }))
      } else {
        const prep = await preparerPhoto(file, 'galerie')
        const url = await uploadArtisanMedia(uid, prep.blob, prep.ext)
        setBrouillon((b) => {
          const cur = b.matiere.photos || []
          return { ...b, matiere: { ...b.matiere, photos: [...cur, { url }] } }
        })
      }
    } catch (e: any) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (!ready) return <AppShell active="site" title="Site"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>

  if (activeCmd || p_paiement === 'ok') {
    const cmd = activeCmd || commandes[0]
    return (
      <AppShell active="site" title="Votre site" wide>
        <div className="tool-card">
          <h2>{cmd ? LIBELLE_ETAT[cmd.etat] : 'Dossier reçu'}</h2>
          <p>Le site est commandé. Livré sous {DELAI_ANNONCE}.</p>
          {cmd?.paye_le && <p className="muted">Payé le {new Date(cmd.paye_le).toLocaleDateString('fr-FR')}</p>}
        </div>
      </AppShell>
    )
  }

  const errs = erreursAvantPaiement(brouillon)

  return (
    <AppShell active="site" title="Commander mon site" wide>
      <div className="prof-grid">
        <div className="tool-card">
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {ETAPES.map((e, i) => (
              <button
                key={e.id}
                type="button"
                className={`sa-pill ${etape === e.id ? 'on' : ''}`}
                onClick={() => setEtape(e.id)}
              >
                {i + 1}. {e.nom}
              </button>
            ))}
          </div>

          {etape === 'domaine' && (
            <div className="inv-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3>Nom de domaine</h3>
              <p className="muted">Le domaine reste à votre nom, jamais au nôtre.</p>

              <label><input type="radio" checked={brouillon.domaine_mode === 'existant'} onChange={() => setBrouillon({ ...brouillon, domaine_mode: 'existant' })} /> J’ai déjà un nom de domaine</label>
              <label><input type="radio" checked={brouillon.domaine_mode === 'a_prendre'} onChange={() => setBrouillon({ ...brouillon, domaine_mode: 'a_prendre' })} /> Je n’en ai pas, proposez-m’en un</label>
              <label><input type="radio" checked={brouillon.domaine_mode === 'aucun'} onChange={() => setBrouillon({ ...brouillon, domaine_mode: 'aucun' })} /> Plus tard</label>

              {brouillon.domaine_mode !== 'aucun' && (
                <div>
                  <input
                    value={brouillon.domaine || ''}
                    onChange={(e) => setBrouillon({ ...brouillon, domaine: e.target.value })}
                    placeholder={brouillon.domaine_mode === 'existant' ? 'Ex: martin-plomberie.fr' : 'Une idée ? (facultatif)'}
                  />
                  {brouillon.domaine_mode === 'existant' && erreursApi.find(e => e.includes('domaine')) && (
                    <p className="msg err" style={{ marginTop: '0.5rem' }}>Le nom de domaine indiqué n’est pas valide (ex. martin-plomberie.fr).</p>
                  )}
                </div>
              )}

              <div style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn--primary" onClick={() => saveAndNext('zone')} disabled={busy}>Continuer</button>
              </div>
            </div>
          )}

          {etape === 'zone' && (
            <div className="inv-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3>Métier & Zone</h3>
              
              <div>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Métier principal</label>
                <input value={brouillon.metier} onChange={(e) => setBrouillon({ ...brouillon, metier: e.target.value })} placeholder="Ex: Plombier chauffagiste" />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Métiers secondaires (max {METIERS_SECONDAIRES_MAX})</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input value={metierSec} onChange={(e) => setMetierSec(e.target.value)} onKeyDown={(e) => {
                    if (e.key === 'Enter' && metierSec.trim() && brouillon.metiers_secondaires.length < METIERS_SECONDAIRES_MAX) {
                      e.preventDefault()
                      if (!brouillon.metiers_secondaires.includes(metierSec.trim())) {
                        setBrouillon({ ...brouillon, metiers_secondaires: [...brouillon.metiers_secondaires, metierSec.trim()] })
                      }
                      setMetierSec('')
                    }
                  }} placeholder="Ajouter et valider avec Entrée" />
                  <button type="button" className="btn btn--ghost" onClick={() => {
                    if (metierSec.trim() && brouillon.metiers_secondaires.length < METIERS_SECONDAIRES_MAX) {
                      if (!brouillon.metiers_secondaires.includes(metierSec.trim())) {
                        setBrouillon({ ...brouillon, metiers_secondaires: [...brouillon.metiers_secondaires, metierSec.trim()] })
                      }
                      setMetierSec('')
                    }
                  }}>Ajouter</button>
                </div>
                {brouillon.metiers_secondaires.length > 0 && (
                  <ul style={{ marginTop: '0.5rem' }}>
                    {brouillon.metiers_secondaires.map(m => (
                      <li key={m}>{m} <button type="button" className="btn btn--ghost" onClick={() => setBrouillon({ ...brouillon, metiers_secondaires: brouillon.metiers_secondaires.filter(x => x !== m) })} style={{ padding: '0 0.5rem', height: '1.5rem', minHeight: '1.5rem' }}>×</button></li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Communes réellement servies (max {COMMUNES_MAX})</label>
                <p className="muted" style={{ marginBottom: '0.5rem' }}>C’est la matière de votre référencement local : les communes où vous allez vraiment, pas un rayon.</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input value={commune} onChange={(e) => setCommune(e.target.value)} onKeyDown={(e) => {
                    if (e.key === 'Enter' && commune.trim() && brouillon.communes.length < COMMUNES_MAX) {
                      e.preventDefault()
                      if (!brouillon.communes.includes(commune.trim())) {
                        setBrouillon({ ...brouillon, communes: [...brouillon.communes, commune.trim()] })
                      }
                      setCommune('')
                    }
                  }} placeholder="Ajouter et valider avec Entrée" />
                  <button type="button" className="btn btn--ghost" onClick={() => {
                    if (commune.trim() && brouillon.communes.length < COMMUNES_MAX) {
                      if (!brouillon.communes.includes(commune.trim())) {
                        setBrouillon({ ...brouillon, communes: [...brouillon.communes, commune.trim()] })
                      }
                      setCommune('')
                    }
                  }}>Ajouter</button>
                </div>
                {brouillon.communes.length > 0 && (
                  <ul style={{ marginTop: '0.5rem' }}>
                    {brouillon.communes.map(c => (
                      <li key={c}>{c} <button type="button" className="btn btn--ghost" onClick={() => setBrouillon({ ...brouillon, communes: brouillon.communes.filter(x => x !== c) })} style={{ padding: '0 0.5rem', height: '1.5rem', minHeight: '1.5rem' }}>×</button></li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn--ghost" onClick={() => saveAndNext('domaine')} disabled={busy}>Retour</button>
                <button type="button" className="btn btn--primary" onClick={() => saveAndNext('matiere')} disabled={busy}>Continuer</button>
              </div>
            </div>
          )}

          {etape === 'matiere' && (
            <div className="inv-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3>La matière</h3>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Logo (facultatif)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {brouillon.matiere.logo_url && <img src={brouillon.matiere.logo_url} alt="Logo" style={{ width: 60, height: 60, objectFit: 'contain' }} />}
                  <input type="file" accept="image/png, image/jpeg, image/webp" onChange={(e) => upload(e.target.files?.[0] as File, true)} disabled={busy} />
                  {brouillon.matiere.logo_url && <button type="button" className="btn btn--ghost" onClick={() => setBrouillon(b => ({ ...b, matiere: { ...b.matiere, logo_url: null } }))} disabled={busy}>Supprimer</button>}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Photos de chantiers ({brouillon.matiere.photos?.length || 0} / {PHOTOS_MAX}, min {PHOTOS_MIN})</label>
                {(brouillon.matiere.photos || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    {(brouillon.matiere.photos || []).map((p, i) => (
                      <div key={i} style={{ border: '1px solid var(--border)', padding: '0.5rem', borderRadius: '4px', maxWidth: '200px' }}>
                        <img src={p.url} alt="" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '2px' }} />
                        <select
                          value={p.role || ''}
                          onChange={(e) => {
                            const nouv = [...(brouillon.matiere.photos || [])]
                            nouv[i].role = e.target.value as 'avant' | 'apres' | 'chantier' | undefined
                            if (!nouv[i].role) delete nouv[i].role
                            setBrouillon(b => ({ ...b, matiere: { ...b.matiere, photos: nouv } }))
                          }}
                          style={{ display: 'block', width: '100%', margin: '0.5rem 0' }}
                        >
                          <option value="">Rôle...</option>
                          <option value="avant">Avant</option>
                          <option value="chantier">Pendant (chantier)</option>
                          <option value="apres">Après (fini)</option>
                        </select>
                        <input
                          placeholder="Légende (facultatif)"
                          value={p.legende || ''}
                          onChange={(e) => {
                            const nouv = [...(brouillon.matiere.photos || [])]
                            nouv[i].legende = e.target.value
                            setBrouillon(b => ({ ...b, matiere: { ...b.matiere, photos: nouv } }))
                          }}
                          style={{ display: 'block', width: '100%', margin: '0.5rem 0', boxSizing: 'border-box' }}
                        />
                        <button type="button" className="btn btn--ghost" style={{ width: '100%' }} onClick={() => {
                          const nouv = [...(brouillon.matiere.photos || [])]
                          nouv.splice(i, 1)
                          setBrouillon(b => ({ ...b, matiere: { ...b.matiere, photos: nouv } }))
                        }} disabled={busy}>Supprimer</button>
                      </div>
                    ))}
                  </div>
                )}
                {(brouillon.matiere.photos || []).length < PHOTOS_MAX && (
                  <input type="file" accept="image/png, image/jpeg, image/webp" onChange={(e) => upload(e.target.files?.[0] as File, false)} disabled={busy} />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Adresse professionnelle</label>
                <input value={brouillon.matiere.adresse} onChange={(e) => setBrouillon(b => ({ ...b, matiere: { ...b.matiere, adresse: e.target.value } }))} placeholder="N°, rue, CP Ville" />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold' }}>SIREN (9 chiffres)</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input value={brouillon.matiere.siren} onChange={(e) => setBrouillon(b => ({ ...b, matiere: { ...b.matiere, siren: e.target.value } }))} placeholder="123456789" />
                  {brouillon.matiere.siren && !sirenValide(brouillon.matiere.siren) && <span style={{ color: 'var(--red)' }}>Invalide</span>}
                  {brouillon.matiere.siren && sirenValide(brouillon.matiere.siren) && <span style={{ color: 'var(--green)' }}>Valide</span>}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Horaires</label>
                <textarea value={brouillon.matiere.horaires} onChange={(e) => setBrouillon(b => ({ ...b, matiere: { ...b.matiere, horaires: e.target.value } }))} placeholder="Ex: Lundi-Vendredi 8h-18h" rows={3} style={{ width: '100%', resize: 'vertical' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Assurance décennale</label>
                <input value={brouillon.matiere.decennale?.assureur || ''} onChange={(e) => setBrouillon(b => ({ ...b, matiere: { ...b.matiere, decennale: { ...b.matiere.decennale, assureur: e.target.value } } }))} placeholder="Assureur" style={{ marginBottom: '0.5rem' }} />
                <input value={brouillon.matiere.decennale?.numero || ''} onChange={(e) => setBrouillon(b => ({ ...b, matiere: { ...b.matiere, decennale: { ...b.matiere.decennale, numero: e.target.value } } }))} placeholder="Numéro de contrat" />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Lien vers les avis Google (facultatif)</label>
                <input value={brouillon.matiere.avis_google?.url || ''} onChange={(e) => setBrouillon(b => ({ ...b, matiere: { ...b.matiere, avis_google: { ...b.matiere.avis_google, url: e.target.value } } }))} placeholder="https://..." />
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn--ghost" onClick={() => saveAndNext('zone')} disabled={busy}>Retour</button>
                <button type="button" className="btn btn--primary" onClick={() => saveAndNext('paiement')} disabled={busy}>Continuer</button>
              </div>
            </div>
          )}

          {etape === 'paiement' && (
            <div className="inv-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3>Récapitulatif & Paiement</h3>

              <div style={{ padding: '1rem', background: 'var(--surface-sunken)', borderRadius: '6px' }}>
                <p><strong>Domaine :</strong> {brouillon.domaine_mode === 'existant' ? brouillon.domaine : brouillon.domaine_mode === 'a_prendre' ? `Souhait : ${brouillon.domaine || 'Non précisé'}` : 'Plus tard'}</p>
                <p><strong>Métier :</strong> {brouillon.metier}</p>
                <p><strong>Métiers secondaires :</strong> {brouillon.metiers_secondaires.join(', ') || 'Aucun'}</p>
                <p><strong>Communes :</strong> {brouillon.communes.length} renseignée(s)</p>
                <p><strong>Photos :</strong> {(brouillon.matiere.photos || []).length} ajoutée(s)</p>
                <p><strong>SIREN :</strong> {brouillon.matiere.siren}</p>
                <p><strong>Assurance :</strong> {brouillon.matiere.decennale?.assureur} {brouillon.matiere.decennale?.numero}</p>
              </div>

              {errs.length > 0 && (
                <div className="msg err">
                  <h4 style={{ margin: '0 0 0.5rem' }}>Dossier incomplet</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    {errs.map((err, idx) => {
                      let cible: Etape = 'matiere'
                      if (err.includes('domaine')) cible = 'domaine'
                      if (err.includes('métier principal') || err.includes('commune')) cible = 'zone'
                      return (
                        <li key={idx}>
                          {err} <button type="button" className="btn btn--ghost" style={{ padding: '0 0.5rem', height: '1.5rem', minHeight: '1.5rem', fontSize: '0.8rem', display: 'inline-flex' }} onClick={() => setEtape(cible)}>Corriger</button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: '1rem' }}>
                <p><strong>Prix : {PRIX_SITE_TEXTE} une fois, sans abonnement — TVA non applicable, art. 293 B du CGI.</strong></p>
                <p>Livré sous {DELAI_ANNONCE} après validation.</p>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button type="button" className="btn btn--ghost" onClick={() => setEtape('matiere')} disabled={busy}>Retour</button>
                <button type="button" className="btn btn--primary" onClick={payer} disabled={errs.length > 0 || busy}>Payer {PRIX_SITE_TEXTE}</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </AppShell>
  )
}
// Utilise POST /api/media via uploadArtisanMedia
