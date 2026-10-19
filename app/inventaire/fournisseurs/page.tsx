'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import Panneau from '@/app/inventaire/Panneau'
import { LISTE_DEPART } from '@/lib/inventaire/liste-depart'
import { TYPES_FOURNISSEUR, type Fournisseur, type TypeFournisseur } from '@/lib/inventaire/types'
import ChargementConsole from '@/components/ui/ChargementConsole' // refonte 18/10 (5.4) : squelette en console v2

// « Mes fournisseurs » (§8 F2) — la liste des vendeurs chez qui l'artisan achète, dans
// son ordre de préférence. C'est cette liste qui borne l'assistant de recherche (F3).
//
// L'ordre se change en glissant une carte (glisser-déposer natif du navigateur, aucune
// dépendance) ou avec les flèches — au clavier, sur mobile, ça marche aussi.

type Champs = { nom: string; url: string; type: TypeFournisseur; numero_compte: string; remise_pct: string; delai_jours: string; agence: string; contact: string; prix_publics: boolean; note_acces: string }
const VIDE: Champs = { nom: '', url: '', type: 'negoce', numero_compte: '', remise_pct: '', delai_jours: '', agence: '', contact: '', prix_publics: false, note_acces: '' }
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v))

export default function FournisseursPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [bloque, setBloque] = useState<string | null>(null)
  const [liste, setListe] = useState<Fournisseur[]>([])
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [fiche, setFiche] = useState<{ id: string | null; c: Champs } | null>(null)
  const [depart, setDepart] = useState(false)
  const [glisse, setGlisse] = useState<string | null>(null)
  const [cible, setCible] = useState<string | null>(null)

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token

  const appel = useCallback(async (init?: RequestInit, query = '') => {
    const t = await jeton()
    const r = await fetch(`/api/inventaire/fournisseurs${query}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}`, ...(init?.headers || {}) } })
    const d = await r.json().catch(() => ({}))
    return { r, d }
  }, [])

  const charger = useCallback(async () => {
    const { r, d } = await appel()
    if (r.status === 403) { setBloque(d.error); return }
    setBloque(null)
    setListe(d.fournisseurs ?? [])
  }, [appel])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      await charger()
      setReady(true)
    })
  }, [router, charger])

  function ouvrir(f: Fournisseur | null) {
    setMsg(null)
    setFiche(f ? {
      id: f.id,
      c: { nom: f.nom, url: s(f.url), type: f.type, numero_compte: s(f.numero_compte), remise_pct: s(f.remise_pct), delai_jours: s(f.delai_jours), agence: s(f.agence), contact: s(f.contact), prix_publics: !!f.prix_publics, note_acces: s(f.note_acces) },
    } : { id: null, c: VIDE })
  }

  async function enregistrer() {
    if (!fiche || busy || !fiche.c.nom.trim()) return
    setBusy(true); setMsg(null)
    const { r, d } = await appel({ method: 'POST', body: JSON.stringify({ id: fiche.id ?? undefined, ...fiche.c, remise_pct: fiche.c.remise_pct || null, delai_jours: fiche.c.delai_jours || null }) })
    setBusy(false)
    if (!r.ok) { setMsg({ type: 'err', text: d.error ?? 'Enregistrement impossible.' }); return }
    setListe(d.fournisseurs ?? [])
    setFiche(null)
    setMsg({ type: 'ok', text: fiche.id ? 'Fournisseur enregistré ✅' : `${fiche.c.nom.trim()} ajouté à vos fournisseurs ✅` })
  }

  async function supprimer(f: Fournisseur) {
    if (busy || !confirm(`Retirer « ${f.nom} » de vos fournisseurs ? Vos matériaux et vos prix vus restent.`)) return
    setBusy(true)
    const { r } = await appel({ method: 'DELETE' }, `?id=${encodeURIComponent(f.id)}`)
    setBusy(false)
    if (!r.ok) { setMsg({ type: 'err', text: 'Suppression impossible.' }); return }
    setFiche(null)
    await charger()
  }

  async function listeDepart() {
    if (busy) return
    setBusy(true); setMsg(null)
    const { r, d } = await appel({ method: 'POST', body: JSON.stringify({ liste_depart: true }) })
    setBusy(false); setDepart(false)
    if (!r.ok) { setMsg({ type: 'err', text: d.error ?? 'Ajout impossible.' }); return }
    setListe(d.fournisseurs ?? [])
    setMsg({ type: 'ok', text: d.ajoutes ? `${d.ajoutes} fournisseur${d.ajoutes > 1 ? 's' : ''} ajouté${d.ajoutes > 1 ? 's' : ''} ✅` : 'Ils y sont déjà tous.' })
  }

  async function reordonner(nouvelle: Fournisseur[]) {
    setListe(nouvelle)
    const { r, d } = await appel({ method: 'POST', body: JSON.stringify({ ordre: nouvelle.map((f) => f.id) }) })
    if (r.ok) setListe(d.fournisseurs ?? nouvelle)
  }
  function deplacer(i: number, delta: number) {
    const j = i + delta
    if (j < 0 || j >= liste.length) return
    const n = [...liste]; const [x] = n.splice(i, 1); n.splice(j, 0, x)
    reordonner(n)
  }
  function deposer(surId: string) {
    if (!glisse || glisse === surId) { setGlisse(null); setCible(null); return }
    const de = liste.findIndex((f) => f.id === glisse), a = liste.findIndex((f) => f.id === surId)
    if (de < 0 || a < 0) return
    const n = [...liste]; const [x] = n.splice(de, 1); n.splice(a, 0, x)
    setGlisse(null); setCible(null)
    reordonner(n)
  }

  const manquants = LISTE_DEPART.filter((d) => !liste.some((f) => f.nom.toLowerCase() === d.nom.toLowerCase()))

  if (!ready) return <AppShell active="inventaire" title="Mes fournisseurs"><ChargementConsole carte /></AppShell>

  if (bloque) {
    return (
      <AppShell active="inventaire" title="Mes fournisseurs">
        <div className="tool-card">
          <h2>Mes fournisseurs</h2>
          <p className="muted">{bloque}</p>
          <a className="btn btn--primary" style={{ display: 'inline-block', width: 'auto', marginTop: '1rem' }} href="/abonnement">Voir les offres</a>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell active="inventaire" title="Mes fournisseurs" crumb={liste.length ? `${liste.length} fournisseur${liste.length > 1 ? 's' : ''}` : 'Inventaire'} wide
      actions={<div className="inv-tete">
        <a className="btn btn--ghost" href="/inventaire">← Inventaire</a>
        <button type="button" className="btn btn--primary" onClick={() => ouvrir(null)}>+ Fournisseur</button>
      </div>}>
      <div className="prof-grid">
        <div className="tool-card">
          <h2>Chez qui vous achetez</h2>
          <p className="muted" style={{ margin: 0 }}>
            Dans votre ordre de préférence : c’est lui qui départage deux prix identiques, et cette liste borne la recherche de prix.
            Glissez une carte pour la déplacer.
          </p>

          {liste.length === 0 ? (
            <p className="muted" style={{ margin: '1rem 0 0' }}>Aucun fournisseur pour l’instant — ajoutez-en un, ou partez de la liste vérifiée ci-dessous.</p>
          ) : (
            <ul className="four-liste">
              {liste.map((f, i) => (
                <li key={f.id} className={`four-item${glisse === f.id ? ' glisse' : ''}${cible === f.id ? ' cible' : ''}`}
                  draggable onDragStart={() => setGlisse(f.id)} onDragEnd={() => { setGlisse(null); setCible(null) }}
                  onDragOver={(e) => { e.preventDefault(); if (cible !== f.id) setCible(f.id) }} onDrop={(e) => { e.preventDefault(); deposer(f.id) }}>
                  <span className="four-poignee" aria-hidden title="Glisser pour réordonner">⋮⋮</span>
                  <span className="four-rang">{i + 1}</span>
                  <div className="four-corps">
                    <b>{f.nom}</b>
                    <div className="meta">
                      <span>{TYPES_FOURNISSEUR[f.type]}</span>
                      {f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer">{f.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a> : null}
                      {f.prix_publics ? <span className="pill ok">prix publics</span> : <span className="pill muted">catalogue seul</span>}
                      {f.remise_pct !== null ? <span>remise {Number(f.remise_pct)} %</span> : null}
                      {f.delai_jours !== null ? <span>délai {Number(f.delai_jours)} j</span> : null}
                      {f.agence ? <span>{f.agence}</span> : null}
                    </div>
                    {f.note_acces ? <span className="note">⚠ {f.note_acces}</span> : null}
                  </div>
                  <div className="four-fleches">
                    <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0 || busy} aria-label={`Monter ${f.nom}`}>↑</button>
                    <button type="button" onClick={() => deplacer(i, 1)} disabled={i === liste.length - 1 || busy} aria-label={`Descendre ${f.nom}`}>↓</button>
                  </div>
                  <button type="button" className="btn btn--ghost" onClick={() => ouvrir(f)}>Fiche</button>
                </li>
              ))}
            </ul>
          )}

          {manquants.length > 0 ? (
            <div className="four-depart">
              <b>Partir de la liste vérifiée</b>
              <p className="muted" style={{ margin: '.3rem 0 0', fontSize: '.88rem' }}>
                {manquants.length} fournisseur{manquants.length > 1 ? 's' : ''} courant{manquants.length > 1 ? 's' : ''}, vérifié{manquants.length > 1 ? 's' : ''} un par un le 03/09/2026 : ceux qui affichent leurs prix sans compte, et ceux qui ne montrent que leur catalogue.
                Rien n’est ajouté sans votre clic.
              </p>
              {depart ? (
                <>
                  <ul>
                    {manquants.map((d) => (
                      <li key={d.nom}><b>{d.nom}</b> · {TYPES_FOURNISSEUR[d.type]}{d.prix_publics ? ' · prix publics' : ` — ${d.note_acces}`}</li>
                    ))}
                  </ul>
                  <div className="inv-actions">
                    <button type="button" className="btn btn--primary" disabled={busy} onClick={listeDepart}>{busy ? '…' : `Ajouter ces ${manquants.length} fournisseurs`}</button>
                    <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setDepart(false)}>Annuler</button>
                  </div>
                </>
              ) : (
                <div className="inv-actions" style={{ marginTop: '.8rem' }}>
                  <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setDepart(true)}>Ajouter mes fournisseurs habituels</button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`}>{msg.text}</div>}
      </div>

      {fiche ? (
        <Panneau titre={fiche.id ? fiche.c.nom || 'Fournisseur' : 'Nouveau fournisseur'} onFermer={() => setFiche(null)}>
          <div className="inv-fiche">
            <label htmlFor="four-nom">Nom</label>
            <input id="four-nom" value={fiche.c.nom} onChange={(e) => setFiche({ ...fiche, c: { ...fiche.c, nom: e.target.value } })} placeholder="Ex : Rexel Lyon Sud" autoFocus={!fiche.id} />
            <label htmlFor="four-url">Site (URL)</label>
            <input id="four-url" value={fiche.c.url} onChange={(e) => setFiche({ ...fiche, c: { ...fiche.c, url: e.target.value } })} placeholder="https://…" inputMode="url" />
            <div className="inv-2">
              <div><label>Type</label>
                <select value={fiche.c.type} onChange={(e) => setFiche({ ...fiche, c: { ...fiche.c, type: e.target.value as TypeFournisseur } })}>
                  {(Object.keys(TYPES_FOURNISSEUR) as TypeFournisseur[]).map((t) => <option key={t} value={t}>{TYPES_FOURNISSEUR[t]}</option>)}
                </select>
              </div>
              <div><label>N° de compte client</label><input value={fiche.c.numero_compte} onChange={(e) => setFiche({ ...fiche, c: { ...fiche.c, numero_compte: e.target.value } })} /></div>
              <div><label>Remise habituelle (%)</label><input value={fiche.c.remise_pct} onChange={(e) => setFiche({ ...fiche, c: { ...fiche.c, remise_pct: e.target.value } })} inputMode="numeric" /></div>
              <div><label>Délai (jours)</label><input value={fiche.c.delai_jours} onChange={(e) => setFiche({ ...fiche, c: { ...fiche.c, delai_jours: e.target.value } })} inputMode="numeric" /></div>
              <div><label>Agence</label><input value={fiche.c.agence} onChange={(e) => setFiche({ ...fiche, c: { ...fiche.c, agence: e.target.value } })} placeholder="Ville, dépôt…" /></div>
              <div><label>Contact</label><input value={fiche.c.contact} onChange={(e) => setFiche({ ...fiche, c: { ...fiche.c, contact: e.target.value } })} placeholder="Nom, téléphone, email" /></div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={fiche.c.prix_publics} onChange={(e) => setFiche({ ...fiche, c: { ...fiche.c, prix_publics: e.target.checked } })} />
              Ce site affiche ses prix sans compte
            </label>
            {!fiche.c.prix_publics ? (
              <p className="muted" style={{ margin: '.3rem 0 0', fontSize: '.85rem' }}>
                {fiche.c.note_acces || 'Sans prix publics, l’assistant de recherche ne pourra voir que le catalogue (référence, description, disponibilité), pas vos tarifs.'}
              </p>
            ) : null}
            <label>Note d’accès (facultatif)</label>
            <input value={fiche.c.note_acces} onChange={(e) => setFiche({ ...fiche, c: { ...fiche.c, note_acces: e.target.value } })} placeholder="Ex : prix visibles seulement après connexion" />
            <div className="inv-actions">
              <button type="button" className="btn btn--primary" disabled={busy || !fiche.c.nom.trim()} onClick={enregistrer}>{busy ? '…' : fiche.id ? 'Enregistrer' : 'Ajouter'}</button>
              <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setFiche(null)}>Fermer</button>
              {fiche.id ? <button type="button" className="btn btn--ghost danger pousse" disabled={busy} onClick={() => { const f = liste.find((x) => x.id === fiche.id); if (f) supprimer(f) }}>Retirer</button> : null}
            </div>
          </div>
        </Panneau>
      ) : null}
    </AppShell>
  )
}
