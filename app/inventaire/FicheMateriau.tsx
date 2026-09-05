'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { preparerPhoto, uploadArtisanMedia } from '@/lib/media'
import { SOURCES_OBSERVATION, type Fournisseur, type Materiau, type Observation } from '@/lib/inventaire/types'

// Fiche matériau (§8 F1) — dans le panneau latéral.
//
// Deux vitesses, un seul formulaire : le nom et le prix suffisent (un artisan qui range
// une livraison n'a pas le temps), tout le reste est replié sous « Plus de détails ».
// Rien n'est pré-rempli : une case vide vaut mieux qu'une valeur inventée.

type Props = {
  id: string | null
  uid: string
  fournisseurs: Fournisseur[]
  jeton: () => Promise<string | undefined>
  /** Pré-remplissage (ex. code-barres lu par le scanner). */
  prefill?: { code_barres?: string; nom?: string }
  onFermer: () => void
  onChange: (msg: { type: 'ok' | 'err'; text: string }) => void
}

type Champs = {
  nom: string; prix_achat_ht: string; unite: string
  marque: string; reference_fabricant: string; reference_fournisseur: string
  categorie: string; sous_categorie: string; conditionnement: string; code_barres: string
  fournisseur_id: string; seuil_alerte: string; fiche_technique_url: string; tags: string; notes: string
  photo_url: string | null
}
const VIDE: Champs = {
  nom: '', prix_achat_ht: '', unite: 'u', marque: '', reference_fabricant: '', reference_fournisseur: '',
  categorie: '', sous_categorie: '', conditionnement: '', code_barres: '', fournisseur_id: '', seuil_alerte: '',
  fiche_technique_url: '', tags: '', notes: '', photo_url: null,
}
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const dateFr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '')

export default function FicheMateriau({ id: idInitial, uid, fournisseurs, jeton, prefill, onFermer, onChange }: Props) {
  const [id, setId] = useState<string | null>(idInitial)
  const [c, setC] = useState<Champs>({ ...VIDE, code_barres: prefill?.code_barres ?? '', nom: prefill?.nom ?? '' })
  const [plus, setPlus] = useState(false)
  const [obs, setObs] = useState<Observation[]>([])
  const [materiau, setMateriau] = useState<Materiau | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [chargement, setChargement] = useState(!!idInitial)
  const photoRef = useRef<HTMLInputElement>(null)

  // Nouvelle observation (prix vu, saisi à la main ou lu sur une facture)
  const [oPrix, setOPrix] = useState('')
  const [oFourn, setOFourn] = useState('')
  const [oUrl, setOUrl] = useState('')
  const [oSource, setOSource] = useState<'saisie' | 'facture'>('saisie')
  const [oDate, setODate] = useState('')

  const set = (k: keyof Champs) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setC((p) => ({ ...p, [k]: e.target.value }))

  const charger = useCallback(async (mid: string) => {
    const t = await jeton()
    const r = await fetch(`/api/inventaire/materiaux?id=${encodeURIComponent(mid)}`, { headers: { Authorization: `Bearer ${t}` } })
    const d = await r.json().catch(() => ({}))
    setChargement(false)
    if (!r.ok) { setErr(d.error ?? 'Fiche introuvable.'); return }
    const m = d.materiau as Materiau
    setMateriau(m)
    setObs(d.observations ?? [])
    setC({
      nom: m.nom, prix_achat_ht: s(m.prix_achat_ht), unite: m.unite || 'u',
      marque: s(m.marque), reference_fabricant: s(m.reference_fabricant ?? m.reference), reference_fournisseur: s(m.reference_fournisseur),
      categorie: s(m.categorie), sous_categorie: s(m.sous_categorie), conditionnement: s(m.conditionnement), code_barres: s(m.code_barres),
      fournisseur_id: s(m.fournisseur_id), seuil_alerte: Number(m.seuil_alerte) > 0 ? s(m.seuil_alerte) : '',
      fiche_technique_url: s(m.fiche_technique_url), tags: (m.tags ?? []).join(', '), notes: s(m.notes), photo_url: m.photo_url,
    })
    // Une fiche déjà remplie s'ouvre dépliée : on ne cache pas ce que l'artisan a saisi.
    if (m.marque || m.reference_fabricant || m.categorie || m.notes || m.photo_url || m.fournisseur_id) setPlus(true)
  }, [jeton])

  useEffect(() => { if (idInitial) charger(idInitial) }, [idInitial, charger])

  async function enregistrer() {
    if (busy || !c.nom.trim()) return
    setBusy(true); setErr(null)
    const t = await jeton()
    const body = {
      id: id ?? undefined, nom: c.nom, unite: c.unite || 'u',
      prix_achat_ht: c.prix_achat_ht.trim() === '' ? null : Number(c.prix_achat_ht.replace(',', '.')),
      marque: c.marque, reference_fabricant: c.reference_fabricant, reference_fournisseur: c.reference_fournisseur,
      categorie: c.categorie, sous_categorie: c.sous_categorie, conditionnement: c.conditionnement, code_barres: c.code_barres,
      fournisseur_id: c.fournisseur_id || null, seuil_alerte: c.seuil_alerte.trim() === '' ? 0 : Number(c.seuil_alerte),
      fiche_technique_url: c.fiche_technique_url, notes: c.notes, photo_url: c.photo_url,
      tags: c.tags.split(',').map((x) => x.trim()).filter(Boolean),
      chantiers_lies: materiau?.chantiers_lies ?? [],
    }
    const r = await fetch('/api/inventaire/materiaux', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify(body),
    })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setErr(d.error ?? 'Enregistrement impossible.'); return }
    onChange({ type: 'ok', text: id ? 'Fiche enregistrée ✅' : `${c.nom.trim()} ajouté à votre inventaire ✅` })
    if (!id) { setId(d.id); await charger(d.id) } else await charger(id)
  }

  async function supprimer() {
    if (!id || busy) return
    if (!confirm(`Supprimer « ${c.nom} » de votre inventaire ? Son stock et son historique de prix partent avec.`)) return
    setBusy(true)
    const t = await jeton()
    const r = await fetch(`/api/inventaire/materiaux?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } })
    setBusy(false)
    if (!r.ok) { setErr('Suppression impossible.'); return }
    onChange({ type: 'ok', text: 'Matériau supprimé.' })
    onFermer()
  }

  async function photo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (photoRef.current) photoRef.current.value = ''
    if (!f) return
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) { setErr('Formats acceptés : JPG, PNG, WebP.'); return }
    if (f.size > 12 * 1024 * 1024) { setErr('Photo trop lourde (12 Mo max).'); return }
    setBusy(true); setErr(null)
    try {
      // Même mécanisme que les réalisations du profil : bucket public, dossier de l'artisan,
      // ré-encodage canvas (l'EXIF — géolocalisation comprise — ne part jamais).
      const p = await preparerPhoto(f, 'detail')
      const url = await uploadArtisanMedia(uid, p.blob, p.ext)
      setC((prev) => ({ ...prev, photo_url: url }))
      setPlus(true)
    } catch (e) { setErr(e instanceof Error && e.message ? e.message : 'Envoi de la photo impossible.') }
    setBusy(false)
  }

  async function ajouterObservation() {
    if (!id || busy) return
    const prix = Number(oPrix.replace(',', '.'))
    if (!Number.isFinite(prix) || prix < 0) { setErr('Il faut un prix vu.'); return }
    setBusy(true); setErr(null)
    const t = await jeton()
    const r = await fetch('/api/inventaire/observations', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ materiau_id: id, prix_ht: prix, fournisseur_id: oFourn || null, url: oUrl || null, source: oSource, unite: c.unite || 'u', vu_le: oDate || null }),
    })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setErr(d.error ?? 'Enregistrement impossible.'); return }
    setObs(d.observations ?? [])
    setOPrix(''); setOUrl(''); setODate('')
    await charger(id)
  }

  if (chargement) return <p className="muted">Chargement…</p>

  return (
    <div className="inv-fiche">
      <div className="inv-3">
        <div>
          <label htmlFor="inv-nom">Nom</label>
          <input id="inv-nom" value={c.nom} onChange={set('nom')} placeholder="Ex : Coude cuivre 16" autoFocus={!id} />
        </div>
        <div>
          <label htmlFor="inv-prix">Prix d’achat HT</label>
          <input id="inv-prix" value={c.prix_achat_ht} onChange={set('prix_achat_ht')} placeholder="€" inputMode="decimal" />
        </div>
        <div>
          <label htmlFor="inv-unite">Unité</label>
          <input id="inv-unite" value={c.unite} onChange={set('unite')} placeholder="u, m, kg…" />
        </div>
      </div>
      <p className="muted" style={{ margin: '.5rem 0 0', fontSize: '.82rem' }}>Le nom et le prix suffisent. Le reste peut attendre.</p>

      <button type="button" className="inv-plus" onClick={() => setPlus((p) => !p)} aria-expanded={plus}>
        {plus ? '▾ Moins de détails' : '▸ Plus de détails'}
      </button>

      {plus ? (
        <>
          <label>Photo</label>
          <div className="inv-photo">
            {c.photo_url ? <img src={c.photo_url} alt="" /> : <div className="vide" aria-hidden>▢</div>}
            <div className="inv-actions" style={{ marginTop: 0 }}>
              <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => photoRef.current?.click()}>{c.photo_url ? 'Changer' : 'Ajouter une photo'}</button>
              {c.photo_url ? <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setC((p) => ({ ...p, photo_url: null }))}>Retirer</button> : null}
              <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={photo} style={{ display: 'none' }} />
            </div>
          </div>
          <div className="inv-2">
            <div><label>Marque</label><input value={c.marque} onChange={set('marque')} /></div>
            <div><label>Fournisseur</label>
              <select value={c.fournisseur_id} onChange={set('fournisseur_id')}>
                <option value="">—</option>
                {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </div>
            <div><label>Référence fabricant</label><input value={c.reference_fabricant} onChange={set('reference_fabricant')} /></div>
            <div><label>Référence fournisseur</label><input value={c.reference_fournisseur} onChange={set('reference_fournisseur')} /></div>
            <div><label>Catégorie</label><input value={c.categorie} onChange={set('categorie')} placeholder="Plomberie, Électricité…" /></div>
            <div><label>Sous-catégorie</label><input value={c.sous_categorie} onChange={set('sous_categorie')} /></div>
            <div><label>Conditionnement</label><input value={c.conditionnement} onChange={set('conditionnement')} placeholder="Sachet de 10, carton de 6…" /></div>
            <div><label>Code-barres</label><input value={c.code_barres} onChange={set('code_barres')} inputMode="numeric" /></div>
            <div><label>Seuil d’alerte</label><input value={c.seuil_alerte} onChange={set('seuil_alerte')} inputMode="numeric" placeholder="Prévenir en dessous de…" /></div>
            <div><label>Tags</label><input value={c.tags} onChange={set('tags')} placeholder="séparés par des virgules" /></div>
          </div>
          <label>Fiche technique (lien)</label>
          <input value={c.fiche_technique_url} onChange={set('fiche_technique_url')} placeholder="https://…" inputMode="url" />
          <label>Notes</label>
          <textarea value={c.notes} onChange={set('notes')} rows={3} />
        </>
      ) : null}

      {err ? <div className="msg err">{err}</div> : null}

      <div className="inv-actions">
        <button type="button" className="btn btn--primary" disabled={busy || !c.nom.trim()} onClick={enregistrer}>{busy ? '…' : id ? 'Enregistrer' : 'Ajouter'}</button>
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={onFermer}>Fermer</button>
        {id ? <button type="button" className="btn btn--ghost danger pousse" disabled={busy} onClick={supprimer}>Supprimer</button> : null}
      </div>

      {id ? (
        <section className="inv-section">
          <h3>Prix vus</h3>
          <p className="muted" style={{ margin: 0, fontSize: '.82rem' }}>
            Chaque prix est daté et gardé pour vous seul. Passé 30 jours, il est marqué « à revérifier ».
          </p>
          {materiau?.prix_dernier_ht !== null && materiau?.prix_dernier_ht !== undefined ? (
            <p className="muted" style={{ margin: '.5rem 0 0', fontSize: '.85rem' }}>Dernier prix payé (entrée de stock) : <b>{Number(materiau.prix_dernier_ht).toFixed(2)} € HT</b></p>
          ) : null}
          {obs.length === 0 ? <p className="muted" style={{ margin: '.6rem 0 0' }}>Aucun prix vu pour l’instant.</p> : (
            <ul className="inv-obs">
              {obs.map((o) => (
                <li key={o.id}>
                  <div className="l1">
                    <span className="prix">{o.prix_ht !== null ? `${Number(o.prix_ht).toFixed(2)} € HT` : `${Number(o.prix_ttc).toFixed(2)} € TTC`}</span>
                    {o.unite ? <span className="muted">/ {o.unite}</span> : null}
                    {o.fournisseur_nom ? <span>· {o.fournisseur_nom}</span> : null}
                    <span className="muted">· {dateFr(o.vu_le)} · {SOURCES_OBSERVATION[o.source]}</span>
                    {o.a_reverifier ? <span className="pill warn">à revérifier</span> : <span className="pill ok">récent</span>}
                  </div>
                  {o.designation_vue ? <span>{o.designation_vue}</span> : null}
                  {o.extrait ? <span className="extrait">« {o.extrait} »</span> : null}
                  {o.disponibilite ? <span className="muted">Disponibilité vue : {o.disponibilite}</span> : null}
                  {o.url ? <a href={o.url} target="_blank" rel="noopener noreferrer">Ouvrir la page</a> : null}
                </li>
              ))}
            </ul>
          )}
          <div className="inv-2" style={{ marginTop: '.4rem' }}>
            <div><label>Prix vu HT</label><input value={oPrix} onChange={(e) => setOPrix(e.target.value)} inputMode="decimal" placeholder="€" /></div>
            <div><label>Chez</label>
              <select value={oFourn} onChange={(e) => setOFourn(e.target.value)}>
                <option value="">—</option>
                {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </div>
            <div><label>Source</label>
              <select value={oSource} onChange={(e) => setOSource(e.target.value as 'saisie' | 'facture')}>
                <option value="saisie">Vu sur le site / en magasin</option>
                <option value="facture">Lu sur une facture</option>
              </select>
            </div>
            <div><label>Date (si ce n’est pas aujourd’hui)</label><input type="date" value={oDate} onChange={(e) => setODate(e.target.value)} max={new Date().toISOString().slice(0, 10)} /></div>
          </div>
          <label>Lien de la page (facultatif)</label>
          <input value={oUrl} onChange={(e) => setOUrl(e.target.value)} placeholder="https://…" inputMode="url" />
          <div className="inv-actions">
            <button type="button" className="btn btn--ghost" disabled={busy || !oPrix.trim()} onClick={ajouterObservation}>Noter ce prix</button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
