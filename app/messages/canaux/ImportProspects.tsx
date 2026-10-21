'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { RESEAUX_IMPORT, libelleReseauImport, type ReseauImport } from '@/lib/canaux/importProspects'

// Messages → Canaux → « Prospects de vos publicités » (21/10/2026, drapeau importProspects ; rendu SEULEMENT drapeau levé).
// Le CSV exporté du réseau (TikTok, Facebook / Instagram, LinkedIn) → aperçu (colonnes reconnues, doublons écartés) → import en
// demandes « à contacter ». Aucun message n'est envoyé aux prospects importés.

type Prospect = { ligne: number; nom: string | null; email: string | null; telephone: string | null; ville: string | null; etat: 'a_importer' | 'doublon_fichier' | 'doublon_existant' | 'sans_contact' }
type Apercu = { colonnes: { entete: string; role: string }[]; prospects: Prospect[]; a_importer: number }

const ETAT: Record<Prospect['etat'], string> = { a_importer: 'À importer', doublon_fichier: 'Doublon dans le fichier', doublon_existant: 'Déjà dans vos demandes', sans_contact: 'Ni e-mail ni téléphone' }
const OU: Record<ReseauImport, string> = {
  tiktok: 'TikTok Ads Manager → Outils → Leads Center (ou la campagne → Télécharger les prospects) → CSV.',
  facebook: 'Meta Business Suite → Tous les outils → Centre de prospects (ou la Page → Outils de publication → Formulaires) → Télécharger CSV.',
  instagram: 'Mêmes formulaires que Facebook : Meta Business Suite → Centre de prospects → Télécharger CSV.',
  linkedin: 'Campaign Manager → Actifs du compte → Formulaires Lead Gen → Télécharger les prospects (CSV).',
  autre: 'Tout export CSV avec une colonne e-mail ou téléphone.',
}

/** Le fichier en texte : les exports Meta sont parfois en UTF-16 (tabulations) — l'octet d'ordre le dit. */
async function lireFichier(f: File): Promise<string> {
  const b = new Uint8Array(await f.arrayBuffer())
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(b.subarray(2))
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(b.subarray(2))
  return new TextDecoder('utf-8').decode(b)
}

export default function ImportProspects() {
  const [reseau, setReseau] = useState<ReseauImport>('tiktok')
  const [csv, setCsv] = useState<string | null>(null)
  const [nomFichier, setNomFichier] = useState('')
  const [apercu, setApercu] = useState<Apercu | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const appel = async (confirmer: boolean, texte: string) => {
    const t = (await supabase.auth.getSession()).data.session?.access_token
    const r = await fetch('/api/demandes/import', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ reseau, csv: texte, confirmer }) })
    return { ok: r.ok, d: await r.json().catch(() => ({})) }
  }

  async function choisir(f: File | undefined) {
    setApercu(null); setMsg(null)
    if (!f) return
    if (f.size > 1024 * 1024 * 2) { setMsg({ type: 'err', text: 'Fichier trop lourd : exportez une période plus courte.' }); return }
    const texte = await lireFichier(f)
    setCsv(texte); setNomFichier(f.name)
    setBusy(true)
    const { ok, d } = await appel(false, texte)
    setBusy(false)
    if (!ok) { setMsg({ type: 'err', text: d.error ?? 'Fichier illisible.' }); return }
    setApercu(d as Apercu)
  }

  async function importer() {
    if (!csv || busy) return
    setBusy(true); setMsg(null)
    const { ok, d } = await appel(true, csv)
    setBusy(false)
    if (!ok) { setMsg({ type: 'err', text: d.error ?? 'Import impossible.' }); return }
    setApercu(null); setCsv(null); setNomFichier('')
    setMsg({ type: 'ok', text: d.message ?? 'Import terminé.' })
  }

  return (
    <div className="tool-card">
      <h2>Prospects de vos publicités</h2>
      <p className="muted" style={{ margin: '0 0 1rem' }}>
        Vos formulaires TikTok, Facebook, Instagram ou LinkedIn ont recueilli des prospects ? Exportez-les en CSV et déposez le fichier : chacun devient une demande <b>« à contacter »</b>. Aucun message ne leur est envoyé : c’est vous qui les appelez ou leur écrivez.
      </p>
      <div className="pil-filtres" role="tablist" aria-label="Réseau du formulaire">
        {RESEAUX_IMPORT.map((r) => (
          <button key={r} type="button" role="tab" aria-selected={reseau === r} className={reseau === r ? 'on' : ''} onClick={() => { setReseau(r); setApercu(null); setCsv(null) }}>{r === 'autre' ? 'Autre' : libelleReseauImport(r)}</button>
        ))}
      </div>
      <p className="muted" style={{ margin: '.7rem 0', fontSize: '.86rem' }}><b>Où trouver l’export :</b> {OU[reseau]}</p>
      <label>Fichier CSV</label>
      <input type="file" accept=".csv,text/csv,.tsv,text/tab-separated-values" onChange={(e) => void choisir(e.target.files?.[0])} disabled={busy} />
      {busy ? <p className="muted">Lecture du fichier…</p> : null}

      {apercu ? (
        <div style={{ marginTop: '.9rem' }}>
          <p className="muted" style={{ margin: '0 0 .5rem', fontSize: '.86rem' }}>
            {nomFichier} · colonnes reconnues : {apercu.colonnes.filter((c) => c.role !== 'ignore' && c.role !== 'question').map((c) => c.entete).join(', ') || 'aucune'}
            {apercu.colonnes.some((c) => c.role === 'question') ? ` · gardées dans la demande : ${apercu.colonnes.filter((c) => c.role === 'question').map((c) => c.entete).join(', ')}` : ''}
            {apercu.colonnes.some((c) => c.role === 'ignore') ? ` · écartées (inutiles à la demande) : ${apercu.colonnes.filter((c) => c.role === 'ignore').length} colonne(s)` : ''}
          </p>
          <div style={{ maxHeight: 280, overflow: 'auto', border: '1px solid var(--line, #333)', borderRadius: 8 }}>
            <table style={{ width: '100%', fontSize: '.84rem', borderCollapse: 'collapse' }}>
              <thead><tr><th style={{ textAlign: 'left', padding: '.3rem .5rem' }}>Nom</th><th style={{ textAlign: 'left', padding: '.3rem .5rem' }}>Contact</th><th style={{ textAlign: 'left', padding: '.3rem .5rem' }}>Ville</th><th style={{ textAlign: 'left', padding: '.3rem .5rem' }}>État</th></tr></thead>
              <tbody>
                {apercu.prospects.slice(0, 200).map((p) => (
                  <tr key={p.ligne} style={{ opacity: p.etat === 'a_importer' ? 1 : 0.55 }}>
                    <td style={{ padding: '.3rem .5rem' }}>{p.nom || '—'}</td>
                    <td style={{ padding: '.3rem .5rem' }}>{[p.email, p.telephone].filter(Boolean).join(' · ') || '—'}</td>
                    <td style={{ padding: '.3rem .5rem' }}>{p.ville || '—'}</td>
                    <td style={{ padding: '.3rem .5rem' }}>{ETAT[p.etat]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn btn--primary" style={{ display: 'block', width: 'auto', marginTop: '.9rem' }} disabled={busy || apercu.a_importer === 0} onClick={importer}>
            {apercu.a_importer === 0 ? 'Rien de nouveau à importer' : `Importer ${apercu.a_importer} prospect${apercu.a_importer > 1 ? 's' : ''}`}
          </button>
          <p className="muted" style={{ margin: '.6rem 0 0', fontSize: '.8rem' }}>
            Ces personnes ont demandé à être recontactées par votre annonce : vous pouvez les contacter pour leur demande. Ne les ajoutez pas à une lettre d’information sans leur accord.
          </p>
        </div>
      ) : null}
      {msg ? <div className={`msg ${msg.type === 'err' ? 'err' : ''}`} style={{ marginTop: '.8rem' }}>{msg.text}</div> : null}
    </div>
  )
}
