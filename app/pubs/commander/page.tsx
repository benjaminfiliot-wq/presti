'use client'

// /pubs/commander — le dossier du pack pubs locales (fiche 026-144). Même habillage que /site/commander.
// Le prix et les accroches viennent de lib/packPub.ts : rien n'est écrit en dur ici.
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import { uploadArtisanMedia, preparerPhoto } from '@/lib/media'
import {
  PRIX_PACK_PUB_TEXTE, ACCROCHES_PACK, ROLES_PHOTO_PACK, CTA_PACK,
  PHOTOS_PACK_MIN, PHOTOS_PACK_MAX, TEXTE_VOIX_MIN, TEXTE_VOIX_MAX,
  type AccrochePack, type CtaPack, type PhotoPack, type RolePhotoPack, type VoixPack,
} from '@/lib/packPub'

const LIBELLE_ROLE: Record<RolePhotoPack, string> = {
  avant: 'Avant travaux',
  apres: 'Après travaux',
  chantier: 'Pendant le chantier',
  detail: 'Un détail de finition',
  equipe: 'L’équipe',
}
const LIBELLE_CTA: Record<CtaPack, string> = {
  devis: 'Demander un devis',
  appel: 'Appeler',
  message: 'Envoyer un message',
}
/** Le texte affiché d'une accroche : la clé du contrat, les marques {metier} et {ville} remplacées par ce que
 *  l'artisan a saisi. Aucun chiffre, aucun label, aucun délai chiffré. */
const MODELE_ACCROCHE: Record<AccrochePack, string> = {
  artisan_de_confiance: 'Votre {metier} de confiance à {ville}',
  avant_apres: 'Avant, après : le travail d’un {metier} à {ville}',
  proximite_locale: 'Un {metier} près de chez vous, à {ville}',
  reactivite: 'Un {metier} qui vous répond, à {ville}',
  garantie_decennale: 'Un {metier} à {ville}, avec sa garantie décennale',
  avis_clients: 'Ce que disent les clients d’un {metier} à {ville}',
  savoir_faire: 'Le savoir-faire d’un {metier} de {ville}',
  intervention_rapide: 'Un {metier} qui intervient vite à {ville}',
}
const PAIRES = ['1', '2', '3', '4', '5', '6']

type Erreurs = Record<string, string[]>

function texteAccroche(cle: AccrochePack, metier: string, ville: string): string {
  return MODELE_ACCROCHE[cle]
    .replace('{metier}', metier.trim() || 'artisan')
    .replace('{ville}', ville.trim() || 'votre ville')
}

/** Range les erreurs de l'API par champ : { champ, message } (PUT) ou phrase finissant par « (champ x) » (POST). */
function rangerErreurs(brutes: unknown): Erreurs {
  const rangees: Erreurs = {}
  if (!Array.isArray(brutes)) return rangees
  for (const e of brutes) {
    let champ = 'dossier'
    let message = ''
    if (typeof e === 'string') {
      const m = /\(champ ([\w.]+)\)\s*\.?\s*$/.exec(e)
      if (m) champ = m[1]
      message = e.replace(/\s*\(champ [\w.]+\)\s*\.?\s*$/, '')
    } else if (e && typeof e === 'object') {
      const o = e as { champ?: unknown; message?: unknown }
      if (typeof o.champ === 'string') champ = o.champ
      if (typeof o.message === 'string') message = o.message
    }
    if (!message) continue
    if (!rangees[champ]) rangees[champ] = []
    rangees[champ].push(message)
  }
  return rangees
}

function Sous({ erreurs, champ }: { erreurs: Erreurs; champ: string }) {
  const liste = erreurs[champ]
  if (!liste?.length) return null
  return <p className="msg err" style={{ margin: '.4rem 0 0' }}>{liste.join(' ')}</p>
}

function CommanderPack() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paiementOk = searchParams?.get('paiement') === 'ok'

  const [etat, setEtat] = useState<'chargement' | 'indisponible' | 'pret'>('chargement')
  const [photosDuSite, setPhotosDuSite] = useState<string[]>([])
  const [decennaleDeclaree, setDecennaleDeclaree] = useState(false)
  const [photos, setPhotos] = useState<PhotoPack[]>([])
  const [metier, setMetier] = useState('')
  const [ville, setVille] = useState('')
  const [communes, setCommunes] = useState<string[]>([])
  const [commune, setCommune] = useState('')
  const [dureeTravaux, setDureeTravaux] = useState('')
  const [materiaux, setMateriaux] = useState('')
  const [decennale, setDecennale] = useState(false)
  const [cta, setCta] = useState<CtaPack>('devis')
  const [telephone, setTelephone] = useState('')
  const [accroche, setAccroche] = useState<AccrochePack | ''>('')
  const [voix, setVoix] = useState<VoixPack>('aucune')
  const [texteVoix, setTexteVoix] = useState('')
  const [droits, setDroits] = useState(false)
  const [erreurs, setErreurs] = useState<Erreurs>({})
  const [busy, setBusy] = useState(false)

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token

  const charger = useCallback(async () => {
    const t = await jeton()
    if (!t) { router.replace('/login'); return }
    const r = await fetch('/api/pubs/commander/brouillon', { headers: { Authorization: `Bearer ${t}` } })
    if (r.status === 404) { setEtat('indisponible'); return }
    if (r.status === 401) { router.replace('/login'); return }
    const d = await r.json().catch(() => ({}))
    setPhotosDuSite(Array.isArray(d.photosDuSite) ? d.photosDuSite : [])
    setDecennaleDeclaree(d.decennaleDeclaree === true)
    const m = d.brouillon?.matiere
    if (m) {
      setPhotos(Array.isArray(m.photos) ? m.photos : [])
      setMetier(m.faits?.metier ?? '')
      setVille(m.faits?.ville ?? '')
      setCommunes(Array.isArray(m.faits?.communes) ? m.faits.communes : [])
      setDureeTravaux(m.faits?.duree_travaux ?? '')
      setMateriaux(m.faits?.materiaux ?? '')
      setDecennale(m.faits?.decennale === true)
      setCta(m.faits?.cta ?? 'devis')
      setTelephone(m.faits?.telephone ?? '')
      setAccroche(m.accroche ?? '')
      setVoix(m.voix ?? 'aucune')
      setTexteVoix(m.texte_voix ?? '')
      setDroits(m.consentement_droits === true)
    }
    setEtat('pret')
  }, [router])

  useEffect(() => { charger() }, [charger])

  const retenue = (url: string) => photos.some((p) => p.url === url)
  const cocher = (url: string) => {
    setPhotos((cur) => {
      if (cur.some((p) => p.url === url)) return cur.filter((p) => p.url !== url)
      if (cur.length >= PHOTOS_PACK_MAX) return cur
      return [...cur, { url, role: 'chantier' }]
    })
  }
  const modifierPhoto = (url: string, champs: Partial<PhotoPack>) =>
    setPhotos((cur) => cur.map((p) => {
      if (p.url !== url) return p
      const suivante = { ...p, ...champs }
      if (suivante.personnes !== true) suivante.accord_personnes = false
      if (!suivante.paire) delete suivante.paire
      return suivante
    }))

  const envoyer = async (fichiers: FileList | null) => {
    if (!fichiers || !fichiers.length) return
    setBusy(true)
    try {
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user.id
      if (!uid) throw new Error('Session expirée, reconnectez-vous.')
      for (const fichier of Array.from(fichiers)) {
        if (photos.length >= PHOTOS_PACK_MAX) break
        const prep = await preparerPhoto(fichier, 'galerie')
        const url = await uploadArtisanMedia(uid, prep.blob, prep.ext)
        setPhotos((cur) => (cur.length >= PHOTOS_PACK_MAX ? cur : [...cur, { url, role: 'chantier' }]))
      }
    } catch (e) {
      setErreurs((er) => ({ ...er, photos: [e instanceof Error ? e.message : 'Envoi de la photo impossible.'] }))
    } finally {
      setBusy(false)
    }
  }

  const ajouterCommune = () => {
    const c = commune.trim()
    if (c && communes.length < 5 && !communes.includes(c)) setCommunes([...communes, c])
    setCommune('')
  }

  const payer = async () => {
    setBusy(true)
    setErreurs({})
    try {
      const t = await jeton()
      if (!t) { router.replace('/login'); return }
      const entetes = { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }
      const dossier = {
        photos,
        faits: {
          metier, ville, communes,
          duree_travaux: dureeTravaux || null,
          materiaux: materiaux || null,
          decennale: decennaleDeclaree && decennale,
          cta,
          telephone: cta === 'appel' ? telephone : null,
        },
        accroche,
        voix,
        texte_voix: voix === 'synthese' ? texteVoix : null,
        consentement_droits: droits,
      }
      const put = await fetch('/api/pubs/commander/brouillon', { method: 'PUT', headers: entetes, body: JSON.stringify(dossier) })
      const dput = await put.json().catch(() => ({}))
      if (!put.ok) {
        const rangees = rangerErreurs(dput.erreurs)
        setErreurs(Object.keys(rangees).length ? rangees : { dossier: [dput.error || 'Impossible d’enregistrer le dossier.'] })
        return
      }
      const post = await fetch('/api/pubs/commander', { method: 'POST', headers: entetes, body: '{}' })
      const dpost = await post.json().catch(() => ({}))
      if (post.ok && dpost.url) { window.location.assign(dpost.url); return }
      const rangees = rangerErreurs(dpost.erreurs)
      if (dpost.error) rangees.dossier = [dpost.error, ...(rangees.dossier || [])]
      setErreurs(Object.keys(rangees).length ? rangees : { dossier: ['Impossible d’ouvrir la page de paiement pour le moment.'] })
    } finally {
      setBusy(false)
    }
  }

  if (etat === 'chargement') {
    return <AppShell active="dashboard" title="Pack pubs"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>
  }
  if (etat === 'indisponible') {
    return <AppShell active="dashboard" title="Pack pubs"><div className="tool-card"><p>Le pack pubs n’est pas encore disponible.</p></div></AppShell>
  }
  if (paiementOk) {
    return (
      <AppShell active="dashboard" title="Pack pubs" wide>
        <div className="tool-card"><h2>Paiement reçu. Votre pack est en fabrication.</h2></div>
      </AppShell>
    )
  }

  const candidates = [...photosDuSite, ...photos.map((p) => p.url).filter((u) => !photosDuSite.includes(u))]
  const bloc = { display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1.5rem' } as const

  return (
    <AppShell active="dashboard" title="Vos pubs locales" wide>
      <div className="tool-card">
        <div className="inv-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={bloc}>
            <h3>1. Vos photos ({photos.length} / {PHOTOS_PACK_MAX}, au moins {PHOTOS_PACK_MIN})</h3>
            <p className="muted">Choisissez les photos de vos vrais chantiers. Le pack est fait uniquement avec elles.</p>
            {candidates.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.6rem' }}>
                {candidates.map((url) => (
                  <label key={url} style={{ width: 96, cursor: 'pointer', outline: retenue(url) ? '3px solid var(--green)' : '1px solid var(--line)', borderRadius: 6, overflow: 'hidden' }}>
                    <img src={url} alt="" style={{ width: '100%', height: 72, objectFit: 'cover', display: 'block' }} />
                    <span style={{ display: 'flex', gap: '.3rem', padding: '.25rem', fontSize: '.78rem' }}>
                      <input type="checkbox" checked={retenue(url)} onChange={() => cocher(url)} disabled={busy || (!retenue(url) && photos.length >= PHOTOS_PACK_MAX)} />
                      Retenir
                    </span>
                  </label>
                ))}
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Ajouter des photos</label>
              <input type="file" multiple accept="image/png, image/jpeg, image/webp" onChange={(e) => { envoyer(e.target.files); e.target.value = '' }} disabled={busy || photos.length >= PHOTOS_PACK_MAX} />
            </div>
            <Sous erreurs={erreurs} champ="photos" />

            {photos.map((p, i) => (
              <div key={p.url} style={{ display: 'flex', gap: '.8rem', flexWrap: 'wrap', alignItems: 'flex-start', borderTop: '1px solid var(--line)', paddingTop: '.7rem' }}>
                <img src={p.url} alt="" style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 6 }} />
                <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                  <label>
                    Rôle de la photo {i + 1}
                    <select value={p.role} onChange={(e) => modifierPhoto(p.url, { role: e.target.value as RolePhotoPack })} style={{ display: 'block', width: '100%' }}>
                      {ROLES_PHOTO_PACK.map((r) => <option key={r} value={r}>{LIBELLE_ROLE[r]}</option>)}
                    </select>
                  </label>
                  <Sous erreurs={erreurs} champ={`photos.${i}.role`} />
                  <label>
                    Relier un avant à son après
                    <select value={p.paire ?? ''} onChange={(e) => modifierPhoto(p.url, { paire: e.target.value })} style={{ display: 'block', width: '100%' }}>
                      <option value="">Aucune paire</option>
                      {PAIRES.map((n) => <option key={n} value={n}>Paire {n}</option>)}
                    </select>
                  </label>
                  <label><input type="checkbox" checked={p.personnes === true} onChange={(e) => modifierPhoto(p.url, { personnes: e.target.checked })} /> Des personnes sont visibles sur cette photo</label>
                  <Sous erreurs={erreurs} champ={`photos.${i}.personnes`} />
                  {p.personnes === true && (
                    <label><input type="checkbox" checked={p.accord_personnes === true} onChange={(e) => modifierPhoto(p.url, { accord_personnes: e.target.checked })} /> Elles ont donné leur accord</label>
                  )}
                  <Sous erreurs={erreurs} champ={`photos.${i}.accord_personnes`} />
                  <Sous erreurs={erreurs} champ={`photos.${i}.url`} />
                  <button type="button" className="btn btn--ghost" style={{ alignSelf: 'flex-start' }} onClick={() => cocher(p.url)} disabled={busy}>Retirer</button>
                </div>
              </div>
            ))}
          </div>

          <div style={bloc}>
            <h3>2. Vos faits</h3>
            <label>Métier
              <input value={metier} onChange={(e) => setMetier(e.target.value)} placeholder="Ex : plombier" />
            </label>
            <Sous erreurs={erreurs} champ="faits.metier" />
            <label>Ville
              <input value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Ex : Lyon" />
            </label>
            <Sous erreurs={erreurs} champ="faits.ville" />
            <div>
              <label style={{ display: 'block' }}>Communes réellement servies (5 au plus)</label>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <input value={commune} onChange={(e) => setCommune(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouterCommune() } }} placeholder="Ajouter et valider avec Entrée" />
                <button type="button" className="btn btn--ghost" onClick={ajouterCommune}>Ajouter</button>
              </div>
              {communes.length > 0 && (
                <ul style={{ marginTop: '.5rem' }}>
                  {communes.map((c) => (
                    <li key={c}>{c} <button type="button" className="btn btn--ghost" onClick={() => setCommunes(communes.filter((x) => x !== c))} style={{ padding: '0 .5rem', height: '1.5rem', minHeight: '1.5rem' }}>×</button></li>
                  ))}
                </ul>
              )}
              <Sous erreurs={erreurs} champ="faits.communes" />
            </div>
            <label>Durée des travaux (facultatif)
              <input value={dureeTravaux} onChange={(e) => setDureeTravaux(e.target.value)} placeholder="Ex : deux jours" />
            </label>
            <label>Matériaux (facultatif)
              <input value={materiaux} onChange={(e) => setMateriaux(e.target.value)} placeholder="Ex : chêne massif" />
            </label>
            {decennaleDeclaree && (
              <label><input type="checkbox" checked={decennale} onChange={(e) => setDecennale(e.target.checked)} /> Mentionner ma garantie décennale</label>
            )}
            <label>Appel à l’action
              <select value={cta} onChange={(e) => setCta(e.target.value as CtaPack)} style={{ display: 'block', width: '100%' }}>
                {CTA_PACK.map((c) => <option key={c} value={c}>{LIBELLE_CTA[c]}</option>)}
              </select>
            </label>
            <Sous erreurs={erreurs} champ="faits.cta" />
            {cta === 'appel' && (
              <label>Téléphone
                <input value={telephone} onChange={(e) => setTelephone(e.target.value)} inputMode="tel" placeholder="06 12 34 56 78" />
              </label>
            )}
            <Sous erreurs={erreurs} champ="faits.telephone" />
            <p className="muted">N’écrivez que ce qui est vrai : ces mots seront dans votre pub.</p>
          </div>

          <div style={bloc}>
            <h3>3. Votre accroche</h3>
            {ACCROCHES_PACK.map((a) => {
              const bloquee = a === 'garantie_decennale' && !decennaleDeclaree
              return (
                <label key={a} style={{ opacity: bloquee ? 0.55 : 1 }}>
                  <input type="radio" name="accroche" checked={accroche === a} disabled={bloquee} onChange={() => setAccroche(a)} /> {texteAccroche(a, metier, ville)}
                  {bloquee && <span className="muted"> (décennale à déclarer sur votre site)</span>}
                </label>
              )
            })}
            <Sous erreurs={erreurs} champ="accroche" />
          </div>

          <div style={bloc}>
            <h3>4. La voix</h3>
            <label><input type="radio" name="voix" checked={voix === 'aucune'} onChange={() => setVoix('aucune')} /> Pas de voix (vous ajoutez une musique dans Meta)</label>
            <label><input type="radio" name="voix" checked={voix === 'synthese'} onChange={() => setVoix('synthese')} /> Voix de synthèse</label>
            <Sous erreurs={erreurs} champ="voix" />
            {voix === 'synthese' && (
              <>
                <p className="muted">Elle sera signalée « Voix générée par IA » à l’écran pendant toute la vidéo.</p>
                <textarea value={texteVoix} onChange={(e) => setTexteVoix(e.target.value)} rows={3} maxLength={TEXTE_VOIX_MAX + 40} />
                <p className="muted">{texteVoix.length} / {TEXTE_VOIX_MAX} signes (au moins {TEXTE_VOIX_MIN}). Écrivez les nombres en lettres.</p>
                <Sous erreurs={erreurs} champ="texte_voix" />
              </>
            )}
          </div>

          <div style={bloc}>
            <label><input type="checkbox" checked={droits} onChange={(e) => setDroits(e.target.checked)} /> Je détiens les droits sur ces photos</label>
            <Sous erreurs={erreurs} champ="consentement_droits" />
          </div>

          <div>
            <p><b>{PRIX_PACK_PUB_TEXTE}</b> une fois, TVA non applicable, art. 293 B du CGI</p>
            <Sous erreurs={erreurs} champ="dossier" />
            <button type="button" className="btn btn--primary" onClick={payer} disabled={busy}>Payer {PRIX_PACK_PUB_TEXTE}</button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

// `useSearchParams` impose une frontière Suspense au prérendu (comme /site/commander).
export default function CommanderPackPage() {
  return <Suspense fallback={null}><CommanderPack /></Suspense>
}
