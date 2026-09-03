'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import Scanner from '@/app/inventaire/Scanner'

// Inventaire (v4 §9) — ce que l'artisan a en stock, et ce qui va lui manquer.
//
// L'écran s'ouvre sur CE QUI MANQUE, pas sur la liste complète : c'est la seule chose
// qu'un artisan vient réellement vérifier avant de partir sur un chantier.

type Materiau = {
  id: string; nom: string; marque: string | null; reference: string | null
  unite: string; code_barres: string | null; fournisseur_prefere: string | null
  prix_dernier_ht: number | null; seuil_alerte: number; quantite_totale: number
  stock: { lieu: string; quantite: number }[]
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

  // Formulaire d'ajout
  const [nom, setNom] = useState('')
  const [unite, setUnite] = useState('u')
  const [seuil, setSeuil] = useState('')
  const [code, setCode] = useState('')

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token

  const charger = useCallback(async (recherche = '') => {
    const t = await jeton()
    const r = await fetch(`/api/inventaire${recherche ? `?q=${encodeURIComponent(recherche)}` : ''}`, { headers: { Authorization: `Bearer ${t}` } })
    const d = await r.json().catch(() => ({}))
    if (r.status === 403) { setBloque(d.error); return }
    setBloque(null)
    setMateriaux(d.materiaux ?? []); setAlertes(d.alertes ?? [])
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      await charger()
      setReady(true)
    })
  }, [router, charger])

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
      actions={<button className="btn btn--primary" style={{ width: 'auto', margin: 0 }} onClick={() => setScanner(true)}>⌗ Scanner</button>}>
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
              <thead><tr><th>Article</th><th className="num">Atelier</th><th className="num">Camion</th><th className="num">Dernier prix</th><th>Mouvement ({lieu})</th></tr></thead>
              <tbody>
                {materiaux.map((m) => {
                  const par = (l: string) => Number((m.stock ?? []).find((s) => s.lieu === l)?.quantite ?? 0)
                  const bas = Number(m.seuil_alerte) > 0 && m.quantite_totale <= Number(m.seuil_alerte)
                  return (
                    <tr key={m.id} className={bas ? 'inv-bas' : ''}>
                      <td>
                        {m.nom}
                        {m.reference ? <span className="muted"> · {m.reference}</span> : null}
                        {m.code_barres ? <span className="inv-code">⌗</span> : null}
                      </td>
                      <td className="num">{par('atelier')} {m.unite}</td>
                      <td className="num">{par('camion')} {m.unite}</td>
                      <td className="num">{m.prix_dernier_ht !== null ? `${Number(m.prix_dernier_ht).toFixed(2)} €` : <span className="muted">—</span>}</td>
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
    </AppShell>
  )
}
