'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'

// Mes tarifs (v4 §8/F2) — la bibliothèque de prix réels de l'artisan.
//
// Pourquoi cet écran existe : tant que l'IA chiffre sur des moyennes nationales, elle
// produit un devis plausible mais faux. Le prix qui compte est celui que CET artisan
// paie chez SON fournisseur, et lui seul le possède. Quelques dizaines de lignes ici
// changent la qualité de tous ses devis.

type Ligne = {
  id: string; designation: string; unite: string; prix_ht: number; tva_taux: number
  fournisseur: string | null; reference: string | null; source: string
  source_detail: string | null; date_prix: string
}
type Apercu = {
  colonnes: Record<string, string | null>
  reconnues: number; ignorees: number; total: number
  exemples: { designation: string; unite: string; prix_ht: number; fournisseur: string | null; reference: string | null }[]
}

const SOURCES: Record<string, string> = {
  saisie: 'saisi à la main', import: 'importé', facture: 'lu sur une facture', devis_valide: 'validé dans un devis',
}

export default function TarifsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [lignes, setLignes] = useState<Ligne[]>([])
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // Saisie manuelle
  const [designation, setDesignation] = useState('')
  const [prix, setPrix] = useState('')
  const [unite, setUnite] = useState('u')
  const [fournisseur, setFournisseur] = useState('')

  // Import
  const fichierRef = useRef<HTMLInputElement>(null)
  const [csv, setCsv] = useState<{ texte: string; nom: string } | null>(null)
  const [apercu, setApercu] = useState<Apercu | null>(null)
  const [fournisseurImport, setFournisseurImport] = useState('')

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token

  async function charger(recherche = q) {
    const t = await jeton()
    const r = await fetch(`/api/tarifs${recherche ? `?q=${encodeURIComponent(recherche)}` : ''}`, { headers: { Authorization: `Bearer ${t}` } })
    const d = await r.json()
    setLignes(d.lignes ?? []); setTotal(d.total ?? 0)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      await charger('')
      setReady(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function ajouter() {
    if (busy || !designation.trim() || !prix) return
    setBusy(true); setMsg(null)
    const t = await jeton()
    const r = await fetch('/api/tarifs', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ designation, prix_ht: Number(prix.replace(',', '.')), unite, fournisseur }),
    })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setMsg({ type: 'err', text: d.error ?? 'Enregistrement impossible.' }); return }
    setDesignation(''); setPrix('')
    setMsg({ type: 'ok', text: 'Tarif ajouté ✅' })
    await charger()
  }

  async function choisirFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (fichierRef.current) fichierRef.current.value = ''
    if (!f) return
    setMsg(null)
    const texte = await f.text()
    setCsv({ texte, nom: f.name })
    setBusy(true)
    const t = await jeton()
    const r = await fetch('/api/tarifs', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ csv: texte, apercu: true, fournisseur: fournisseurImport || null }),
    })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setApercu(null); setCsv(null); setMsg({ type: 'err', text: d.error ?? 'Fichier illisible.' }); return }
    setApercu(d)
  }

  async function confirmerImport() {
    if (!csv || busy) return
    setBusy(true); setMsg(null)
    const t = await jeton()
    const r = await fetch('/api/tarifs', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ csv: csv.texte, fichier: csv.nom, fournisseur: fournisseurImport || null }),
    })
    const d = await r.json().catch(() => ({}))
    setBusy(false); setApercu(null); setCsv(null)
    if (!r.ok) { setMsg({ type: 'err', text: d.error ?? 'Import impossible.' }); return }
    setMsg({ type: 'ok', text: `${d.enregistrees} tarif${d.enregistrees > 1 ? 's' : ''} enregistré${d.enregistrees > 1 ? 's' : ''}${d.ignorees ? ` · ${d.ignorees} ligne(s) sans prix ignorée(s)` : ''}` })
    await charger()
  }

  async function supprimer(id: string) {
    const t = await jeton()
    await fetch(`/api/tarifs?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } })
    await charger()
  }

  if (!ready) return <AppShell active="tarifs" title="Mes tarifs"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>

  return (
    <AppShell active="tarifs" title="Mes tarifs" crumb={total ? `${total} prix enregistrés` : 'Vos prix réels'} wide>
      <div className="prof-grid">
        <div className="tool-card">
          <h2>Pourquoi renseigner vos prix</h2>
          <p className="muted" style={{ margin: 0 }}>
            Sans vos tarifs, l’IA chiffre sur des <b>moyennes nationales</b> : le devis a l’air juste, mais il ne l’est pas —
            le prix qui compte est celui que <b>vous</b> payez chez <b>votre</b> fournisseur. Chaque prix que vous ajoutez ici
            est repris tel quel dans vos devis, avec sa provenance.
          </p>
        </div>

        <div className="tool-card">
          <h2>Importer un tarif fournisseur</h2>
          <p className="muted" style={{ margin: '0 0 1rem' }}>
            Un fichier CSV ou un export de tableur suffit. On reconnaît tout seul les colonnes (libellé, prix, unité, référence),
            les points-virgules et les prix écrits « 12,50 € ». Vous voyez ce qu’on a compris <b>avant</b> d’enregistrer.
          </p>
          <div className="tar-import">
            <input value={fournisseurImport} onChange={(e) => setFournisseurImport(e.target.value)} placeholder="Fournisseur (ex : Rexel) — facultatif" />
            <button type="button" className="btn btn--ghost" style={{ width: 'auto', margin: 0 }} disabled={busy} onClick={() => fichierRef.current?.click()}>
              {busy && !apercu ? 'Lecture…' : 'Choisir un fichier'}
            </button>
          </div>
          <input ref={fichierRef} type="file" accept=".csv,text/csv,text/plain" onChange={choisirFichier} style={{ display: 'none' }} />

          {apercu ? (
            <div className="tar-apercu">
              <b>{apercu.reconnues} tarifs reconnus</b>
              {apercu.ignorees ? <span className="muted"> · {apercu.ignorees} ligne(s) sans prix seront ignorées</span> : null}
              <ul className="tar-cols">
                {Object.entries(apercu.colonnes).map(([champ, col]) => (
                  <li key={champ}>{champ.replace('_', ' ')} : {col ? <b>{col}</b> : <em>non trouvée</em>}</li>
                ))}
              </ul>
              <table className="tar-table">
                <tbody>
                  {apercu.exemples.map((e, i) => (
                    <tr key={i}><td>{e.designation}</td><td className="num">{e.prix_ht.toFixed(2)} €</td><td>{e.unite}</td><td className="muted">{e.fournisseur ?? ''}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="tar-actions">
                <button className="btn btn--primary" style={{ width: 'auto', margin: 0 }} disabled={busy} onClick={confirmerImport}>
                  {busy ? 'Enregistrement…' : `Enregistrer ces ${apercu.reconnues} tarifs`}
                </button>
                <button className="btn btn--ghost" style={{ width: 'auto', margin: 0 }} onClick={() => { setApercu(null); setCsv(null) }}>Annuler</button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="tool-card">
          <h2>Ajouter un prix à la main</h2>
          <div className="tar-saisie">
            <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Ex : Chauffe-eau 200 L posé" />
            <input value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="Prix HT" inputMode="decimal" />
            <input value={unite} onChange={(e) => setUnite(e.target.value)} placeholder="u" />
            <input value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} placeholder="Fournisseur" />
            <button className="btn btn--primary" style={{ width: 'auto', margin: 0 }} disabled={busy || !designation.trim() || !prix} onClick={ajouter}>Ajouter</button>
          </div>
        </div>

        <div className="tool-card">
          <h2>Votre bibliothèque</h2>
          <input value={q} onChange={(e) => { setQ(e.target.value); charger(e.target.value) }} placeholder="Rechercher un tarif…" style={{ maxWidth: 340 }} />
          {lignes.length === 0 ? (
            <p className="muted" style={{ margin: '1rem 0 0' }}>{q ? 'Aucun tarif ne correspond.' : 'Aucun tarif pour l’instant — importez un fichier ou ajoutez-en un à la main.'}</p>
          ) : (
            <table className="tar-table full">
              <thead><tr><th>Désignation</th><th className="num">Prix HT</th><th>Unité</th><th>Fournisseur</th><th>Provenance</th><th /></tr></thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.id}>
                    <td>{l.designation}{l.reference ? <span className="muted"> · {l.reference}</span> : null}</td>
                    <td className="num">{Number(l.prix_ht).toFixed(2)} €</td>
                    <td>{l.unite}</td>
                    <td>{l.fournisseur ?? <span className="muted">—</span>}</td>
                    <td className="muted">{SOURCES[l.source] ?? l.source} · {new Date(l.date_prix).toLocaleDateString('fr-FR')}</td>
                    <td><button className="tar-x" onClick={() => supprimer(l.id)} aria-label="Retirer">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {total > lignes.length ? <p className="muted" style={{ margin: '.7rem 0 0', fontSize: '.85rem' }}>{lignes.length} affichés sur {total}. Affinez la recherche pour voir les autres.</p> : null}
        </div>

        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`}>{msg.text}</div>}
      </div>
    </AppShell>
  )
}
