'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { actif } from '@/lib/flags'
import AppShell from '@/app/AppShell'
import { uploadArtisanMedia, preparerPhoto } from '@/lib/media'
import ChargementConsole from '@/components/ui/ChargementConsole' // refonte 18/10 (5.4) : squelette en console v2
import {
  ArtisanSite, Brouillon, Commande, ChiffreArtisan,
  PRIX_SITE_TEXTE, DELAI_TEXTE,
  METIERS_SECONDAIRES_MAX, COMMUNES_MAX, PHOTOS_MIN, PHOTOS_MAX,
  LIBELLE_ETAT, sirenValide, erreursAvantPaiement
} from '@/lib/siteCommande'

type Etape = 'domaine' | 'zone' | 'matiere' | 'parcours' | 'prestations' | 'paiement'

const ETAPES: { id: Etape; nom: string }[] = [
  { id: 'domaine', nom: 'Le domaine' },
  { id: 'zone', nom: 'Métier & Zone' },
  { id: 'matiere', nom: 'La matière' },
  { id: 'parcours', nom: 'Votre parcours' },
  { id: 'prestations', nom: 'Vos prestations' },
  { id: 'paiement', nom: 'Le paiement' },
]

const PRESTATIONS_PAR_METIER: Record<string, string[]> = {
  menuisier: ['Pose de fenêtres', 'Portes et volets', 'Agencement intérieur', 'Terrasse en bois'],
  plombier: ['Recherche de fuite', 'Installation sanitaire', 'Dépannage plomberie', 'Chauffage'],
  électricien: ['Mise aux normes', 'Tableau électrique', 'Éclairage', 'Dépannage électrique'],
  couvreur: ['Réfection de toiture', 'Réparation de fuite', 'Zinguerie', 'Entretien de toiture'],
}

function CommanderSite() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const p_paiement = searchParams?.get('paiement')
  const p_etape = searchParams?.get('etape')
  const p_commande = searchParams?.get('commande')

  const [ready, setReady] = useState(false)
  const [etape, setEtape] = useState<Etape>(() => {
    if (p_etape && ['domaine', 'zone', 'matiere', 'parcours', 'paiement'].includes(p_etape)) {
      return p_etape as Etape
    }
    if (p_paiement === 'annule') return 'paiement'
    return 'domaine'
  })

  useEffect(() => {
    if (p_etape && ['domaine', 'zone', 'matiere', 'parcours', 'paiement'].includes(p_etape)) {
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
    matiere: { artisan: { prenom: '', nom: '', installation: null, parcours: '', citation: '', chiffres: [{ valeur: '', legende: '' }, { valeur: '', legende: '' }, { valeur: '', legende: '' }] }, photos: [], adresse: '', siren: '', horaires: '', decennale: { assureur: '', numero: '' }, avis_google: { url: '' }, logo_url: null }
  })
  const [erreursApi, setErreursApi] = useState<string[]>([])
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [commandeACompleter, setCommandeACompleter] = useState<string | null>(null)
  const [prestationLibre, setPrestationLibre] = useState('')
  const [busy, setBusy] = useState(false)
  const [renonciationRetractation, setRenonciationRetractation] = useState(false)

  const [metierSec, setMetierSec] = useState('')
  const [commune, setCommune] = useState('')

  const modifierArtisan = (champs: Partial<ArtisanSite>) => setBrouillon(b => ({
    ...b, matiere: { ...b.matiere, artisan: { prenom: '', nom: '', installation: null, parcours: '', citation: '', chiffres: [], ...b.matiere.artisan, ...champs } }
  }))
  const modifierChiffre = (index: number, champs: Partial<ChiffreArtisan>) => setBrouillon(b => {
    const actuel = b.matiere.artisan
    const chiffres = Array.isArray(actuel?.chiffres) ? [...actuel.chiffres] : [{ valeur: '', legende: '' }, { valeur: '', legende: '' }, { valeur: '', legende: '' }]
    chiffres[index] = { ...chiffres[index], ...champs }
    return { ...b, matiere: { ...b.matiere, artisan: { prenom: '', nom: '', installation: null, parcours: '', citation: '', ...actuel, chiffres } } }
  })

  useEffect(() => {
    if (!actif('siteCommande')) notFound()
  }, [])

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token

  const charger = useCallback(async () => {
    const t = await jeton()
    // Un visiteur sans compte (le lien vient de la landing) : on le connecte d'abord, puis il revient ici.
    // Sans cette redirection, l'écran restait sur « Chargement… » pour toujours (audit du 11/10).
    if (!t) { router.replace(`/login?retour=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`); return }
    const complement = await fetch('/api/site/commander/complement', { headers: { Authorization: `Bearer ${t}` } })
    if (complement.status === 409) {
      router.replace(`/onboarding?suite=${encodeURIComponent(`/site/commander?commande=${p_commande || ''}`)}`)
      return
    }
    if (complement.ok) {
      const donnees = await complement.json().catch(() => ({}))
      const disponibles = Array.isArray(donnees.commandes) ? donnees.commandes as (Commande & { erreurs?: string[] })[] : []
      const choisie = disponibles.find(c => c.id === p_commande) || disponibles[0]
      if (choisie) {
        setCommandeACompleter(choisie.id)
        setBrouillon(prev => ({ ...prev, ...choisie, matiere: { ...prev.matiere, ...(choisie.matiere || {}) } }))
        setErreursApi(choisie.erreurs || [])
        setEtape('domaine')
        setReady(true)
        return
      }
    }
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
  }, [router, p_paiement, p_commande])

  useEffect(() => {
    charger()
  }, [charger])

  const activeCmd = commandes.find((c) => c.etat !== 'brouillon')

  const saveAndNext = async (suivante: Etape) => {
    setBusy(true)
    const t = await jeton()
    const r = await fetch(commandeACompleter ? '/api/site/commander/complement' : '/api/site/commander/brouillon', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(commandeACompleter ? { ...brouillon, commande: commandeACompleter } : brouillon),
    })
    const d = await r.json().catch(() => ({}))
    if (r.status === 409 && /profil|inscription/i.test(d.error || '')) {
      router.push(`/onboarding?suite=${encodeURIComponent(`/site/commander?commande=${commandeACompleter || ''}`)}`)
      setBusy(false)
      return
    }
    if (!r.ok) {
      alert(d.error || 'Impossible d’enregistrer le dossier.')
      setBusy(false)
      return
    }
    if (d.commande) {
      setBrouillon(prev => ({ ...prev, ...d.commande, matiere: { ...prev.matiere, ...(d.commande.matiere || {}) } }))
    }
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
    if (!renonciationRetractation) return
    setBusy(true)
    const t = await jeton()
    const r = await fetch('/api/site/commander', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ renonciationRetractation: renonciationRetractation }),
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
    } catch (e: unknown) {
      console.error('photo', e)
      alert('La photo n’a pas pu être envoyée. Vérifiez le format (JPEG, PNG ou WebP) et réessayez.')
    } finally {
      setBusy(false)
    }
  }

  if (!ready) return <AppShell active="site" title="Site"><ChargementConsole carte /></AppShell>

  if (!commandeACompleter && (activeCmd || p_paiement === 'ok')) {
    const cmd = activeCmd || commandes[0]
    return (
      <AppShell active="site" title="Votre site" wide>
        <div className="tool-card">
          <h2>{cmd ? LIBELLE_ETAT[cmd.etat] : 'Dossier reçu'}</h2>
          <p>{cmd?.etat === 'en_ligne' ? 'Votre site est en ligne.' : `Le site est commandé. ${DELAI_TEXTE}`}</p>
          {cmd?.paye_le && <p className="muted">Payé le {new Date(cmd.paye_le).toLocaleDateString('fr-FR')}</p>}
        </div>
      </AppShell>
    )
  }

  const errs = erreursAvantPaiement(brouillon)
  const artisan = brouillon.matiere.artisan

  return (
    <AppShell active="site" title={commandeACompleter ? 'Compléter mon dossier' : 'Commander mon site'} wide>
      <div className="prof-grid">
        <div className="tool-card">
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {ETAPES.filter(e => !commandeACompleter || e.id !== 'paiement').map((e, i) => (
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
              <label><input type="radio" checked={brouillon.domaine_mode === 'a_prendre'} onChange={() => setBrouillon({ ...brouillon, domaine_mode: 'a_prendre' })} /> Je n’en ai pas : je le réserve moi-même, à mon nom</label>
              <label><input type="radio" checked={brouillon.domaine_mode === 'aucun'} onChange={() => setBrouillon({ ...brouillon, domaine_mode: 'aucun' })} /> Plus tard</label>

              {brouillon.domaine_mode !== 'aucun' && (
                <div>
                  <input
                    value={brouillon.domaine || ''}
                    onChange={(e) => setBrouillon({ ...brouillon, domaine: e.target.value })}
                    placeholder={brouillon.domaine_mode === 'existant' ? 'Exemple : martin-plomberie.fr' : 'Exemple : martin-plomberie.fr (le nom que vous réserverez)'}
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
                <button type="button" className="btn btn--primary" onClick={() => saveAndNext('parcours')} disabled={busy}>Continuer</button>
              </div>
            </div>
          )}

          {etape === 'parcours' && (
            <div className="inv-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3>Votre parcours</h3>
              <p className="muted">Votre site parle avec votre voix : nous n’inventons rien.</p>
              <div>
                <label htmlFor="artisan-prenom">Prénom (1 à 40 signes)</label>
                <input id="artisan-prenom" name="prenom" value={artisan?.prenom || ''} onChange={e => modifierArtisan({ prenom: e.target.value })} placeholder="Exemple : Camille" />
              </div>
              <div>
                <label htmlFor="artisan-nom">Nom (1 à 60 signes)</label>
                <input id="artisan-nom" name="nom" value={artisan?.nom || ''} onChange={e => modifierArtisan({ nom: e.target.value })} placeholder="Exemple : Martin" />
              </div>
              <div>
                <label htmlFor="artisan-installation">Année d’installation (1960 à {new Date().getFullYear()})</label>
                <input id="artisan-installation" name="installation" type="number" min={1960} max={new Date().getFullYear()} value={artisan?.installation ?? ''} onChange={e => modifierArtisan({ installation: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Exemple : 2011" />
              </div>
              <div>
                <label htmlFor="artisan-parcours">Votre parcours (une ligne, 1 à 140 signes)</label>
                <input id="artisan-parcours" name="parcours" value={artisan?.parcours || ''} onChange={e => modifierArtisan({ parcours: e.target.value })} placeholder="Exemple : J’ai appris le métier en atelier avant de créer mon entreprise." />
              </div>
              <div>
                <label htmlFor="artisan-citation">Votre phrase signée, à la première personne (20 à 160 signes)</label>
                <textarea id="artisan-citation" name="citation" minLength={20} rows={3} value={artisan?.citation || ''} onChange={e => modifierArtisan({ citation: e.target.value })} placeholder="Exemple : Je prends le temps de vérifier chaque détail avant de rendre un chantier." />
              </div>
              <label><input type="checkbox" checked={artisan?.chiffres === null} onChange={e => modifierArtisan({ chiffres: e.target.checked ? null : [{ valeur: '', legende: '' }, { valeur: '', legende: '' }, { valeur: '', legende: '' }] })} /> Je préfère ne pas donner de chiffres</label>
              {artisan?.chiffres !== null && [0, 1, 2].map(index => (
                <fieldset key={index} style={{ border: '1px solid var(--border)', borderRadius: 6 }}>
                  <legend>Chiffre {index + 1}</legend>
                  <label>Valeur (nombre positif, 12 signes au plus)
                    <input name="valeur" value={artisan?.chiffres?.[index]?.valeur || ''} onChange={e => modifierChiffre(index, { valeur: e.target.value })} placeholder="Exemple : 12" />
                  </label>
                  <label>Unité (facultative, 12 signes au plus)
                    <input name="unite" value={artisan?.chiffres?.[index]?.unite || ''} onChange={e => modifierChiffre(index, { unite: e.target.value })} placeholder="Exemple : ans" />
                  </label>
                  <label>Légende (1 à 60 signes)
                    <input name="legende" value={artisan?.chiffres?.[index]?.legende || ''} onChange={e => modifierChiffre(index, { legende: e.target.value })} placeholder="Exemple : d’expérience sur les chantiers" />
                  </label>
                </fieldset>
              ))}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn--ghost" onClick={() => saveAndNext('matiere')} disabled={busy}>Retour</button>
                <button type="button" className="btn btn--primary" onClick={() => saveAndNext('prestations')} disabled={busy}>Continuer</button>
              </div>
            </div>
          )}

          {etape === 'prestations' && (
            <div className="inv-form" style={{ display: 'grid', gap: '1rem' }}>
              <h3>Vos prestations</h3>
              <p>Choisissez uniquement les prestations que vous réalisez vraiment.</p>
              {(Object.entries(PRESTATIONS_PAR_METIER).find(([metier]) => brouillon.metier.toLowerCase().includes(metier))?.[1] || []).map(nom => (
                <label key={nom}><input type="checkbox" checked={(brouillon.matiere.prestations || []).includes(nom)} onChange={e => setBrouillon(prev => {
                  const liste = prev.matiere.prestations || []
                  const prestations = e.target.checked ? [...liste, nom].slice(0, 12) : liste.filter(p => p !== nom)
                  return { ...prev, matiere: { ...prev.matiere, prestations } }
                })} /> {nom}</label>
              ))}
              <label>Autre prestation que vous réalisez
                <input value={prestationLibre} maxLength={80} onChange={e => setPrestationLibre(e.target.value)} />
              </label>
              <button type="button" className="btn btn--ghost" disabled={!prestationLibre.trim() || (brouillon.matiere.prestations || []).length >= 12} onClick={() => {
                const nom = prestationLibre.trim()
                if (nom && !(brouillon.matiere.prestations || []).includes(nom)) setBrouillon(prev => ({ ...prev, matiere: { ...prev.matiere, prestations: [...(prev.matiere.prestations || []), nom].slice(0, 12) } }))
                setPrestationLibre('')
              }}>Ajouter la prestation</button>
              {(brouillon.matiere.prestations || []).map(nom => <div key={nom}>{nom} <button type="button" className="btn btn--ghost" onClick={() => setBrouillon(prev => ({ ...prev, matiere: { ...prev.matiere, prestations: (prev.matiere.prestations || []).filter(p => p !== nom) } }))}>Retirer</button></div>)}
              {commandeACompleter && erreursApi.length > 0 && <div className="msg err"><p>Il manque encore :</p><ul>{erreursApi.map(erreur => <li key={erreur}>{erreur}</li>)}</ul></div>}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn--ghost" onClick={() => setEtape('parcours')}>Retour</button>
                <button type="button" className="btn btn--primary" disabled={busy} onClick={() => saveAndNext(commandeACompleter ? 'prestations' : 'paiement')}>{commandeACompleter ? 'Enregistrer mon dossier' : 'Continuer'}</button>
              </div>
            </div>
          )}

          {etape === 'paiement' && !commandeACompleter && (
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
                <div>
                  <h4>Votre parcours</h4>
                  <p><strong>Prénom et nom :</strong> {artisan?.prenom} {artisan?.nom}</p>
                  <p><strong>Année d’installation :</strong> {artisan?.installation ?? 'Non renseignée'}</p>
                  <p><strong>Parcours :</strong> {artisan?.parcours}</p>
                  <p><strong>Phrase signée :</strong> {artisan?.citation}</p>
                  {artisan?.chiffres === null ? <p>Sans chiffres, à votre demande</p> : artisan?.chiffres?.map((chiffre, index) => (
                    <p key={index}><strong>Chiffre {index + 1} :</strong> {chiffre.valeur} {chiffre.unite} — {chiffre.legende}</p>
                  ))}
                </div>
              </div>

              {errs.length > 0 && (
                <div className="msg err">
                  <h4 style={{ margin: '0 0 0.5rem' }}>Dossier incomplet</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    {errs.map((err, idx) => {
                      let cible: Etape = 'matiere'
                      if (err.includes('domaine')) cible = 'domaine'
                      if (err.includes('métier principal') || err.includes('commune')) cible = 'zone'
                      if (err.includes('Votre parcours')) cible = 'parcours'
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
                <p>{DELAI_TEXTE}</p>
              </div>

              <div>
                <p>Les entreprises de 5 salariés ou moins peuvent bénéficier d’un droit de rétractation de 14 jours selon les conditions prévues par la loi. <a href="/cgu#retractation">Voir les conditions de rétractation</a>.</p>
                <label>
                  <input type="checkbox" checked={renonciationRetractation} onChange={e => setRenonciationRetractation(e.target.checked)} />{' '}
                  Je demande que Presti commence la réalisation de mon site avant la fin du délai de rétractation de 14 jours, et je reconnais perdre mon droit de rétractation une fois le site entièrement livré (article L221-28 du Code de la consommation).
                </label>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button type="button" className="btn btn--ghost" onClick={() => setEtape('parcours')} disabled={busy}>Retour</button>
                <button type="button" className="btn btn--primary" onClick={payer} disabled={errs.length > 0 || busy || !renonciationRetractation}>Payer {PRIX_SITE_TEXTE}</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </AppShell>
  )
}
// `useSearchParams` (l'écran ouvert par ?etape=) impose une frontière Suspense au prérendu, sinon `next build` refuse la page
// — et avec elle tout le déploiement : de 32ef4e6 (13/09 17 h 57 UTC) à f5b1695, 37 déploiements de production en ERROR,
// rien de la nuit n'était en ligne (constaté le 14/09 via l'API Vercel, en cherchant pourquoi la suspension restait sans effet).
export default function CommanderSitePage() {
  return <Suspense fallback={null}><CommanderSite /></Suspense>
}
// Utilise POST /api/media via uploadArtisanMedia
