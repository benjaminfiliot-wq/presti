'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import Scanner from '@/app/inventaire/Scanner'
import Panneau from '@/app/inventaire/Panneau'
import FicheMateriau from '@/app/inventaire/FicheMateriau'
import ImportCsv from '@/app/inventaire/ImportCsv'
import type { Fournisseur } from '@/lib/inventaire/types'
import { actif } from '@/lib/flags'

// Inventaire (v4 §9) — ce que l'artisan a en stock, et ce qui va lui manquer.
//
// L'écran s'ouvre sur CE QUI MANQUE, pas sur la liste complète : c'est la seule chose
// qu'un artisan vient réellement vérifier avant de partir sur un chantier.
//
// v2 (§8 F1/F2) : la fiche complète s'ouvre en panneau latéral (FicheMateriau), l'import
// CSV aussi (ImportCsv), et « Mes fournisseurs » a sa page. Les mouvements de stock
// restent tels quels.

type Materiau = {
  id: string; nom: string; marque: string | null; reference: string | null
  unite: string; code_barres: string | null; fournisseur_prefere: string | null
  prix_dernier_ht: number | null; seuil_alerte: number; quantite_totale: number
  stock: { lieu: string; quantite: number }[]
  photo_url: string | null; prix_achat_ht: number | null
  prix_vu_ht: number | null; prix_vu_le: string | null; prix_vu_a_reverifier: boolean
  fournisseur: { id: string; nom: string } | null
}
type Alerte = { id: string; nom: string; unite: string; reste: number; seuil: number }

const LIEUX = ['atelier', 'camion']

export default function InventairePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [bloque, setBloque] = useState<string | null>(null)
  const [materiaux, setMateriaux] = useState<Materiau[]>([])
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [q, setQ] = useState('')
  const [lieu, setLieu] = useState('atelier')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [scanner, setScanner] = useState(false)
  const [uid, setUid] = useState('')
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  // Panneau latéral : fiche (null = nouvelle) ou import CSV
  const [fiche, setFiche] = useState<{ id: string | null; prefill?: { code_barres?: string; nom?: string } } | null>(null)
  const [importer, setImporter] = useState(false)

  // Formulaire d'ajout
  const [nom, setNom] = useState('')
  const [unite, setUnite] = useState('u')
  const [seuil, setSeuil] = useState('')
  const [code, setCode] = useState('')

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token

  const charger = useCallback(async (recherche = '') => {
    try {
      const t = await jeton()
      // La liste vient de la route v2 : mêmes articles, avec la fiche complète (photo, prix d'achat, prix vu).
      const r = await fetch(`/api/inventaire/materiaux${recherche ? `?q=${encodeURIComponent(recherche)}` : ''}`, { headers: { Authorization: `Bearer ${t}` } })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setBloque(d.error || (r.status === 401 ? 'Session expirée, reconnecte-toi.' : 'Lecture de l’inventaire impossible. Réessayez dans un instant.'))
        return
      }
      setBloque(null)
      setMateriaux(d.materiaux ?? []); setAlertes(d.alertes ?? [])
    } catch {
      setBloque('Connexion interrompue. Réessayez dans un instant.')
    }
  }, [])

  const chargerFournisseurs = useCallback(async () => {
    const t = await jeton()
    const r = await fetch('/api/inventaire/fournisseurs', { headers: { Authorization: `Bearer ${t}` } })
    const d = await r.json().catch(() => ({}))
    if (r.ok) setFournisseurs(d.fournisseurs ?? [])
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setUid(data.session.user.id)
      await charger()
      chargerFournisseurs()
      setReady(true)
    })
  }, [router, charger, chargerFournisseurs])

  async function bouger(materiau_id: string, type: 'entree' | 'sortie' | 'inventaire', quantite: number) {
    if (busy) return
    setBusy(true)
    const t = await jeton()
    const r = await fetch('/api/inventaire', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ mouvement: { materiau_id, type, quantite, lieu, source: 'manuel' } }),
    })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setMsg({ type: 'err', text: d.error ?? 'Mouvement impossible.' }); return }
    await charger(q)
  }

  async function ajouter() {
    if (busy || !nom.trim()) return
    setBusy(true); setMsg(null)
    const t = await jeton()
    const r = await fetch('/api/inventaire', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ nom, unite, seuil_alerte: Number(seuil) || 0, code_barres: code || null }),
    })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setMsg({ type: 'err', text: d.error ?? 'Enregistrement impossible.' }); return }
    setNom(''); setSeuil(''); setCode('')
    setMsg({ type: 'ok', text: 'Article ajouté ✅' })
    await charger(q)
  }

  // Scan : si le code est connu, on ajoute directement une unité — c'est le geste de
  // réception d'une livraison. Sinon on pré-remplit la création.
  const surCode = useCallback(async (codeLu: string) => {
    setScanner(false)
    const t = await jeton()
    const r = await fetch(`/api/inventaire?code=${encodeURIComponent(codeLu)}`, { headers: { Authorization: `Bearer ${t}` } })
    const d = await r.json().catch(() => ({}))
    if (d?.materiau?.id) {
      const rep = await fetch('/api/inventaire', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ mouvement: { materiau_id: d.materiau.id, type: 'entree', quantite: 1, lieu, source: 'scan' } }),
      })
      const j = await rep.json().catch(() => ({}))
      setMsg({ type: 'ok', text: `${d.materiau.nom} : +1 · il en reste ${j.reste ?? '?'} ${d.materiau.unite}` })
      await charger(q)
    } else {
      setCode(codeLu)
      setFiche({ id: null, prefill: { code_barres: codeLu } })
      setMsg({ type: 'ok', text: 'Code inconnu — donnez-lui un nom pour l’ajouter à votre inventaire.' })
    }
  }, [lieu, q, charger])

  if (!ready) return <AppShell active="inventaire" title="Inventaire"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>

  if (bloque) {
    return (
      <AppShell active="inventaire" title="Inventaire">
        <div className="tool-card">
          <h2>Inventaire</h2>
          <p className="muted">{bloque}</p>
          <p className="muted" style={{ marginTop: '.6rem' }}>
            Suivez votre stock à l’atelier et dans le camion, scannez les codes-barres à la livraison,
            et sachez ce qui va vous manquer avant de partir sur un chantier.
          </p>
          <a className="btn btn--primary" style={{ display: 'inline-block', width: 'auto', marginTop: '1rem' }} href="/abonnement">Voir les offres</a>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell active="inventaire" title="Inventaire" crumb={materiaux.length ? `${materiaux.length} articles` : 'Votre stock'} wide
      actions={<div className="inv-tete">
        <a className="btn btn--ghost" href="/inventaire/fournisseurs">Mes fournisseurs{fournisseurs.length ? ` (${fournisseurs.length})` : ''}</a>
        {actif('inventaireRecherche') ? <a className="btn btn--ghost" href="/inventaire/recherche">Recherche</a> : null}
        <button type="button" className="btn btn--ghost" onClick={() => { setMsg(null); setImporter(true) }}>Importer un CSV</button>
        <button type="button" className="btn btn--ghost" onClick={() => { setMsg(null); setFiche({ id: null }) }}>+ Fiche complète</button>
        <button type="button" className="btn btn--primary" onClick={() => setScanner(true)}>⌗ Scanner</button>
      </div>}>
      <div className="prof-grid">
        {alertes.length > 0 ? (
          <div className="tool-card inv-alerte">
            <h2>À racheter</h2>
            <ul className="inv-alertes">
              {alertes.map((a) => (
                <li key={a.id}><b>{a.nom}</b> — il en reste <b>{a.reste}</b> {a.unite} (seuil : {a.seuil})</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="tool-card">
          <h2>Ajouter un article</h2>
          <div className="inv-form">
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Coude cuivre 16" />
            <input value={unite} onChange={(e) => setUnite(e.target.value)} placeholder="u" />
            <input value={seuil} onChange={(e) => setSeuil(e.target.value)} placeholder="Seuil d’alerte" inputMode="numeric" />
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code-barres (facultatif)" inputMode="numeric" />
            <button className="btn btn--primary" style={{ width: 'auto', margin: 0 }} disabled={busy || !nom.trim()} onClick={ajouter}>Ajouter</button>
          </div>
          <p className="muted" style={{ margin: '.6rem 0 0', fontSize: '.82rem' }}>
            Renseignez le code-barres une fois : ensuite, un scan à la livraison suffit à incrémenter le stock.
            Pour la marque, le prix d’achat, la photo ou le fournisseur : <button type="button" className="inv-nom" onClick={() => setFiche({ id: null, prefill: { nom, code_barres: code } })}>ouvrir la fiche complète</button>.
          </p>
        </div>

        <div className="tool-card">
          <h2>Votre stock</h2>
          <div className="inv-barre">
            <input value={q} onChange={(e) => { setQ(e.target.value); charger(e.target.value) }} placeholder="Rechercher un article…" />
            <div className="sa-pills">
              {LIEUX.map((l) => (
                <button key={l} type="button" className={`sa-pill${lieu === l ? ' on' : ''}`} onClick={() => setLieu(l)}>{l === 'atelier' ? 'Atelier' : 'Camion'}</button>
              ))}
            </div>
          </div>

          {materiaux.length === 0 ? (
            <p className="muted" style={{ margin: '1rem 0 0' }}>{q ? 'Aucun article ne correspond.' : 'Votre inventaire est vide — ajoutez un premier article ou scannez un code-barres.'}</p>
          ) : (
            <table className="tar-table full">
              <thead><tr><th>Matériau</th><th className="num">Atelier</th><th className="num">Camion</th><th className="num">Prix d’achat</th><th className="num">Prix vu</th><th>Mouvement ({lieu})</th></tr></thead>
              <tbody>
                {materiaux.map((m) => {
                  const par = (l: string) => Number((m.stock ?? []).find((s) => s.lieu === l)?.quantite ?? 0)
                  const bas = Number(m.seuil_alerte) > 0 && m.quantite_totale <= Number(m.seuil_alerte)
                  return (
                    <tr key={m.id} className={bas ? 'inv-bas' : ''}>
                      <td>
                        {m.photo_url ? <img className="inv-thumb" src={m.photo_url} alt="" /> : null}
                        <button type="button" className="inv-nom" onClick={() => { setMsg(null); setFiche({ id: m.id }) }} title="Ouvrir la fiche">{m.nom}</button>
                        {m.marque ? <span className="muted"> · {m.marque}</span> : null}
                        {m.reference ? <span className="muted"> · {m.reference}</span> : null}
                        {m.code_barres ? <span className="inv-code">⌗</span> : null}
                        {m.fournisseur ? <span className="inv-vu">{m.fournisseur.nom}</span> : null}
                      </td>
                      <td className="num">{par('atelier')} {m.unite}</td>
                      <td className="num">{par('camion')} {m.unite}</td>
                      <td className="num">
                        {m.prix_achat_ht !== null ? `${Number(m.prix_achat_ht).toFixed(2)} €` : m.prix_dernier_ht !== null ? <span title="Dernier prix payé (entrée de stock)">{Number(m.prix_dernier_ht).toFixed(2)} €</span> : <span className="muted">—</span>}
                      </td>
                      <td className="num">
                        {m.prix_vu_ht !== null ? (
                          <>
                            {Number(m.prix_vu_ht).toFixed(2)} €
                            <span className="inv-vu">{m.prix_vu_a_reverifier ? <span className="pill warn">à revérifier</span> : (m.prix_vu_le ? new Date(m.prix_vu_le).toLocaleDateString('fr-FR') : '')}</span>
                          </>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td>
                        <div className="inv-mvt">
                          <button type="button" onClick={() => bouger(m.id, 'sortie', 1)} disabled={busy} aria-label={`Retirer un ${m.nom}`}>−</button>
                          <button type="button" onClick={() => bouger(m.id, 'entree', 1)} disabled={busy} aria-label={`Ajouter un ${m.nom}`}>+</button>
                          <button type="button" className="inv-compter" disabled={busy} onClick={() => {
                            const v = prompt(`Comptage de « ${m.nom} » (${lieu}) — quantité réelle :`, String(par(lieu)))
                            if (v !== null && Number.isFinite(Number(v))) bouger(m.id, 'inventaire', Number(v))
                          }}>Compter</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`}>{msg.text}</div>}
      </div>

      {scanner ? <Scanner onCode={surCode} onFermer={() => setScanner(false)} /> : null}

      {fiche ? (
        <Panneau titre={fiche.id ? (materiaux.find((m) => m.id === fiche.id)?.nom ?? 'Fiche matériau') : 'Nouveau matériau'} onFermer={() => setFiche(null)}>
          <FicheMateriau id={fiche.id} uid={uid} fournisseurs={fournisseurs} jeton={jeton} prefill={fiche.prefill}
            onFermer={() => setFiche(null)}
            onChange={(m) => { setMsg(m); if (fiche.prefill?.code_barres) setCode(''); charger(q) }} />
        </Panneau>
      ) : null}
      {importer ? (
        <Panneau titre="Importer un CSV" onFermer={() => setImporter(false)}>
          <ImportCsv jeton={jeton} fournisseurs={fournisseurs} onFini={(m) => { setMsg(m); setImporter(false); charger(q) }} />
        </Panneau>
      ) : null}
    </AppShell>
  )
}
