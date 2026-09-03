'use client'

import { useRef, useState } from 'react'
import type { Fournisseur } from '@/lib/inventaire/types'

// Import CSV de matériaux (§8 F1) — même analyseur et même geste que /tarifs :
// on montre d'abord ce qu'on a compris (aperçu), l'artisan valide, puis on enregistre.

type Apercu = {
  colonnes: Record<string, string | null>
  reconnues: number; ignorees: number; total: number
  exemples: { nom: string; unite: string; prix_achat_ht: number; reference_fournisseur: string | null; fournisseur_prefere: string | null }[]
}
type Props = {
  jeton: () => Promise<string | undefined>
  fournisseurs: Fournisseur[]
  onFini: (msg: { type: 'ok' | 'err'; text: string }) => void
}

const LIBELLES: Record<string, string> = {
  designation: 'Nom', prix_ht: 'Prix HT', unite: 'Unité', reference: 'Référence', fournisseur: 'Fournisseur', tva_taux: 'TVA',
}

export default function ImportCsv({ jeton, fournisseurs, onFini }: Props) {
  const fichierRef = useRef<HTMLInputElement>(null)
  const [csv, setCsv] = useState<{ texte: string; nom: string } | null>(null)
  const [apercu, setApercu] = useState<Apercu | null>(null)
  const [fournisseurId, setFournisseurId] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function poster(body: Record<string, unknown>) {
    const t = await jeton()
    const r = await fetch('/api/inventaire/materiaux', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify(body),
    })
    return { r, d: await r.json().catch(() => ({})) }
  }

  async function choisirFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (fichierRef.current) fichierRef.current.value = ''
    if (!f) return
    setErr(null)
    const texte = await f.text()
    setCsv({ texte, nom: f.name })
    setBusy(true)
    const { r, d } = await poster({ csv: texte, apercu: true, fournisseur: fournisseurs.find((x) => x.id === fournisseurId)?.nom ?? null })
    setBusy(false)
    if (!r.ok) { setApercu(null); setCsv(null); setErr(d.error ?? 'Fichier illisible.'); return }
    setApercu(d)
  }

  async function confirmer() {
    if (!csv || busy) return
    setBusy(true); setErr(null)
    const { r, d } = await poster({ csv: csv.texte, fichier: csv.nom, fournisseur_id: fournisseurId || null, fournisseur: fournisseurs.find((x) => x.id === fournisseurId)?.nom ?? null })
    setBusy(false)
    if (!r.ok) { setErr(d.error ?? 'Import impossible.'); return }
    onFini({ type: 'ok', text: `${d.enregistrees} matériau${d.enregistrees > 1 ? 'x' : ''} enregistré${d.enregistrees > 1 ? 's' : ''}${d.ignorees ? ` · ${d.ignorees} ligne(s) sans prix ignorée(s)` : ''}` })
  }

  return (
    <div className="inv-fiche">
      <p className="muted" style={{ margin: 0 }}>
        Un export de tableur ou le tarif CSV de votre fournisseur suffit. Les colonnes sont reconnues toutes seules
        (nom, prix, unité, référence) — vous vérifiez avant d’enregistrer.
      </p>
      <label>Fournisseur de ce fichier (facultatif)</label>
      <select value={fournisseurId} onChange={(e) => setFournisseurId(e.target.value)}>
        <option value="">—</option>
        {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
      </select>
      <div className="inv-actions">
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => fichierRef.current?.click()}>
          {busy && !apercu ? 'Lecture…' : 'Choisir un fichier CSV'}
        </button>
        <input ref={fichierRef} type="file" accept=".csv,text/csv,text/plain" onChange={choisirFichier} style={{ display: 'none' }} />
      </div>
      {err ? <div className="msg err">{err}</div> : null}

      {apercu ? (
        <div className="tar-apercu">
          <b>{apercu.reconnues} matériau{apercu.reconnues > 1 ? 'x' : ''} reconnu{apercu.reconnues > 1 ? 's' : ''}</b>
          {apercu.ignorees ? <span className="muted"> · {apercu.ignorees} ligne(s) sans prix seront ignorées</span> : null}
          <ul className="tar-cols">
            {Object.entries(apercu.colonnes).map(([champ, col]) => (
              <li key={champ}>{LIBELLES[champ] ?? champ} : {col ? <b>{col}</b> : <em>non trouvée</em>}</li>
            ))}
          </ul>
          <div className="tar-table full">
            <table className="tar-table" style={{ marginTop: 0 }}>
              <thead><tr><th>Nom</th><th>Unité</th><th className="num">Prix d’achat HT</th><th>Référence</th></tr></thead>
              <tbody>
                {apercu.exemples.map((e, i) => (
                  <tr key={i}><td>{e.nom}</td><td>{e.unite}</td><td className="num">{e.prix_achat_ht.toFixed(2)} €</td><td className="muted">{e.reference_fournisseur ?? '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tar-actions">
            <button type="button" className="btn btn--primary" style={{ width: 'auto', margin: 0 }} disabled={busy} onClick={confirmer}>
              {busy ? 'Enregistrement…' : `Enregistrer ces ${apercu.reconnues} matériaux`}
            </button>
            <button type="button" className="btn btn--ghost" style={{ width: 'auto', margin: 0 }} disabled={busy} onClick={() => { setApercu(null); setCsv(null) }}>Annuler</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
