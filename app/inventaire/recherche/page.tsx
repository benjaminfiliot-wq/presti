'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import Panneau from '@/app/inventaire/Panneau'
import { actif } from '@/lib/flags'
import { messageVerrou, peut } from '@/lib/plans'
import { TIERS, tierAllowed, type Tier } from '@/lib/models'
import { aReverifier, type Fournisseur } from '@/lib/inventaire/types'
import type { NonVu, ResultatRecherche } from '@/lib/recherche-fournisseurs'

// L'assistant de recherche chez les fournisseurs (§8 F3).
//
// L'artisan dit ce qu'il cherche, coche ses fournisseurs, choisit le niveau ; l'assistant va
// voir sur CES sites et rapporte ce qu'il a vu — lien, prix tel qu'affiché, extrait cité.
// Rien n'entre dans l'inventaire sans son clic : « Ajouter à l'inventaire » ouvre la fiche
// pré-remplie (lien, source, date), il valide, et seulement là c'est enregistré.

type Tri = 'prix' | 'dispo' | 'preference'
type MateriauCourt = { id: string; nom: string; reference: string | null }
type Retenue = { r: ResultatRecherche; action: 'inventaire' | 'liste_achat' }

const enStock = (d: string | null) => !!d && /en stock|disponible|dispo|retrait/i.test(d) && !/indisponible|rupture|non disponible|pas disponible/i.test(d)
const dateFr = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const prixFr = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function RecherchePage() {
  if (!actif('inventaireRecherche')) notFound()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [bloque, setBloque] = useState<string | null>(null)
  const [plan, setPlan] = useState('gratuit')
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [coches, setCoches] = useState<string[]>([])
  const [materiaux, setMateriaux] = useState<MateriauCourt[]>([])
  const [requete, setRequete] = useState('')
  const [quantite, setQuantite] = useState('')
  const [tier, setTier] = useState<Tier>('standard')
  const [busy, setBusy] = useState(false)
  const [resultats, setResultats] = useState<ResultatRecherche[] | null>(null)
  const [nonVus, setNonVus] = useState<NonVu[]>([])
  const [derniere, setDerniere] = useState<{ requete: string; tier: Tier; duree_ms: number; downgraded: boolean } | null>(null)
  const [tri, setTri] = useState<Tri>('prix')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [retenue, setRetenue] = useState<Retenue | null>(null)
  const [nomFiche, setNomFiche] = useState('')
  const [rattache, setRattache] = useState('')
  const [qte, setQte] = useState('1')
  const [enregistre, setEnregistre] = useState(false)

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token
  const appel = useCallback(async (chemin: string, init?: RequestInit) => {
    const t = await jeton()
    const r = await fetch(chemin, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}`, ...(init?.headers || {}) } })
    const d = await r.json().catch(() => ({}))
    return { r, d }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const uid = data.session.user.id
      const [{ data: art }, four, mat] = await Promise.all([
        supabase.from('artisans').select('plan, is_founder').eq('id', uid).maybeSingle(),
        appel('/api/inventaire/fournisseurs'),
        appel('/api/inventaire/materiaux'),
      ])
      const p = art?.is_founder ? 'business' : (art?.plan as string) || 'gratuit'
      setPlan(p)
      if (four.r.status === 403) { setBloque(four.d.error); setReady(true); return }
      if (!art?.is_founder && !peut(p, 'inventaire.recherche_ia')) { setBloque(`La recherche chez vos fournisseurs n’est pas dans votre offre. ${messageVerrou('inventaire.recherche_ia')}`); setReady(true); return }
      const liste: Fournisseur[] = four.d.fournisseurs ?? []
      setFournisseurs(liste)
      setCoches(liste.map((f) => f.id))
      setMateriaux(((mat.d.materiaux ?? []) as MateriauCourt[]).map((m) => ({ id: m.id, nom: m.nom, reference: m.reference })))
      setReady(true)
    })
  }, [router, appel])

  const cochesActifs = useMemo(() => fournisseurs.filter((f) => coches.includes(f.id)), [fournisseurs, coches])
  const interrogeables = cochesActifs.filter((f) => f.prix_publics && f.url)

  async function chercher(texte = requete) {
    const q = texte.trim()
    if (busy || q.length < 2) return
    if (!cochesActifs.length) { setMsg({ type: 'err', text: 'Cochez au moins un fournisseur.' }); return }
    setBusy(true); setMsg(null); setResultats(null); setNonVus([]); setEnregistre(false)
    if (texte !== requete) setRequete(texte)
    const { r, d } = await appel('/api/inventaire/recherche', {
      method: 'POST',
      body: JSON.stringify({ requete: q, quantite: quantite ? Number(quantite) : null, fournisseur_ids: coches, tier }),
    })
    setBusy(false)
    if (!r.ok) { setMsg({ type: 'err', text: d.error ?? 'La recherche n’a pas abouti.' }); return }
    setResultats(d.resultats ?? [])
    setNonVus(d.nonVus ?? [])
    setDerniere({ requete: q, tier: d.tier, duree_ms: d.duree_ms, downgraded: !!d.downgraded })
  }

  const tries = useMemo(() => {
    if (!resultats) return []
    const ordre = new Map(fournisseurs.map((f, i) => [f.id, i]))
    const pref = (r: ResultatRecherche) => (r.fournisseur_id ? ordre.get(r.fournisseur_id) ?? 99 : 99)
    return [...resultats].sort((a, b) => {
      if (tri === 'prix') return a.prix_vu - b.prix_vu || pref(a) - pref(b)
      if (tri === 'dispo') return Number(enStock(b.disponibilite_vue)) - Number(enStock(a.disponibilite_vue)) || a.prix_vu - b.prix_vu
      return pref(a) - pref(b) || a.prix_vu - b.prix_vu
    })
  }, [resultats, tri, fournisseurs])

  function ouvrir(r: ResultatRecherche, action: Retenue['action']) {
    setMsg(null); setEnregistre(false)
    setNomFiche(r.designation_vue); setRattache(''); setQte(quantite || '1')
    setRetenue({ r, action })
  }

  async function retenir() {
    if (!retenue || busy) return
    setBusy(true); setMsg(null)
    const { r, d } = await appel('/api/inventaire/recherche/retenir', {
      method: 'POST',
      body: JSON.stringify({ action: retenue.action, resultat: retenue.r, materiau_id: rattache || null, nom: nomFiche.trim() || retenue.r.designation_vue, quantite: Number(qte) || 1 }),
    })
    setBusy(false)
    if (!r.ok) { setMsg({ type: 'err', text: d.error ?? 'Enregistrement impossible.' }); return }
    setEnregistre(true)
    setRetenue(null)
    if (retenue.action === 'inventaire') {
      setMsg({ type: 'ok', text: `« ${nomFiche.trim() || retenue.r.designation_vue} » est dans votre inventaire, avec le prix vu chez ${retenue.r.fournisseur}, le lien et la date ✅` })
      if (!rattache) setMateriaux((m) => [...m, { id: d.materiau_id, nom: nomFiche.trim() || retenue.r.designation_vue, reference: retenue.r.reference }])
    } else {
      setMsg({ type: 'ok', text: `Ajouté à votre liste d’achat (${qte} × ${retenue.r.designation_vue}) ✅` })
    }
  }

  if (!ready) return <AppShell active="inventaire" title="Recherche chez vos fournisseurs"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>

  if (bloque) {
    return (
      <AppShell active="inventaire" title="Recherche chez vos fournisseurs">
        <div className="tool-card">
          <h2>L’assistant de recherche</h2>
          <p className="muted">{bloque}</p>
          <p className="muted" style={{ marginTop: '.6rem' }}>
            Vous décrivez ce que vous cherchez, l’assistant va voir chez vos fournisseurs et vous rapporte les liens, les prix affichés et la disponibilité — vous validez ce qui entre dans votre inventaire.
          </p>
          <a className="btn btn--primary" style={{ display: 'inline-block', width: 'auto', marginTop: '1rem' }} href="/abonnement">Voir les offres</a>
        </div>
      </AppShell>
    )
  }

  const expertVerrou = !peut(plan, 'plateforme.ia.expert')
  const nomsInterroges = interrogeables.map((f) => f.nom).join(', ')

  return (
    <AppShell active="inventaire" title="Recherche chez vos fournisseurs" crumb="Inventaire" wide
      actions={<div className="inv-tete">
        <a className="btn btn--ghost" href="/inventaire">← Inventaire</a>
        <a className="btn btn--ghost" href="/inventaire/fournisseurs">Mes fournisseurs{fournisseurs.length ? ` (${fournisseurs.length})` : ''}</a>
      </div>}>
      <div className="prof-grid">
        <div className="tool-card">
          <h2>Que cherchez-vous ?</h2>
          <p className="muted" style={{ margin: 0 }}>
            Une désignation ou une référence. L’assistant regarde sur les sites cochés et rapporte ce qu’il a vu — prix tel qu’affiché, lien direct, extrait cité. Rien n’est estimé, rien n’est enregistré sans votre validation.
          </p>
          <form className="rch-form" onSubmit={(e) => { e.preventDefault(); chercher() }}>
            <input value={requete} onChange={(e) => setRequete(e.target.value)} placeholder="Ex : plaque de plâtre BA13, tube PER 16, disjoncteur 20 A…" autoFocus disabled={busy} aria-label="Que cherchez-vous ?" />
            <input value={quantite} onChange={(e) => setQuantite(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Quantité" inputMode="decimal" disabled={busy} aria-label="Quantité souhaitée" />
            <button type="submit" className="btn btn--primary" disabled={busy || requete.trim().length < 2 || !cochesActifs.length}>{busy ? '…' : 'Chercher'}</button>
          </form>

          <div className="rch-options">
            <div>
              <span className="rch-lab">Niveau</span>
              <div className="sa-pills" role="radiogroup" aria-label="Niveau de modèle">
                {TIERS.map((t) => {
                  const ok = t.value === 'expert' ? !expertVerrou && tierAllowed('expert', plan) : tierAllowed(t.value, plan)
                  return (
                    <button key={t.value} type="button" role="radio" aria-checked={tier === t.value} className={`sa-pill${tier === t.value ? ' on' : ''}${ok ? '' : ' locked'}`}
                      disabled={!ok || busy} onClick={() => setTier(t.value)}
                      title={ok ? `${t.desc} · ${t.value === 'expert' ? 3 : 1} crédit${t.value === 'expert' ? 's' : ''}` : messageVerrou(t.value === 'expert' ? 'plateforme.ia.expert' : 'inventaire.recherche_ia')}>
                      {ok ? '' : '🔒 '}{t.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="rch-four-bloc">
              <span className="rch-lab">Chez qui</span>
              {fournisseurs.length === 0 ? (
                <p className="muted" style={{ margin: 0, fontSize: '.88rem' }}>Aucun fournisseur — <a href="/inventaire/fournisseurs">ajoutez-en</a> pour lancer une recherche.</p>
              ) : (
                <ul className="rch-four">
                  {fournisseurs.map((f) => (
                    <li key={f.id}>
                      <label>
                        <input type="checkbox" checked={coches.includes(f.id)} disabled={busy} onChange={(e) => setCoches((c) => e.target.checked ? [...c, f.id] : c.filter((x) => x !== f.id))} />
                        <span>{f.nom}</span>
                        {f.prix_publics ? <span className="pill ok">prix publics</span> : <span className="pill muted" title={f.note_acces ?? ''}>catalogue seul</span>}
                      </label>
                      {!f.prix_publics ? <span className="rch-note">⚠ {f.note_acces || 'ce site n’affiche ses prix qu’aux comptes connectés : vous verrez le catalogue, pas vos tarifs'}</span> : null}
                      {f.prix_publics && !f.url ? <span className="rch-note">⚠ aucune adresse de site sur la fiche — l’assistant ne peut pas y aller</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {busy ? (
          <div className="tool-card rch-attente" aria-live="polite">
            <span className="rch-spin" aria-hidden />
            <div>
              <b>L’assistant regarde chez {interrogeables.length} fournisseur{interrogeables.length > 1 ? 's' : ''}…</b>
              <span className="muted">{nomsInterroges || 'aucun site consultable parmi les cochés'} · il ouvre les fiches produit et note ce qu’il voit. Comptez 15 à 45 secondes.</span>
            </div>
          </div>
        ) : null}

        {resultats && !busy ? (
          <div className="tool-card">
            <div className="rch-entete">
              <h2>{resultats.length ? `${resultats.length} prix vu${resultats.length > 1 ? 's' : ''}` : 'Aucun prix vu'} <span className="muted">pour « {derniere?.requete} »</span></h2>
              <div className="sa-pills" role="group" aria-label="Trier">
                {([['prix', 'Prix'], ['dispo', 'Disponibilité'], ['preference', 'Préférence']] as [Tri, string][]).map(([k, l]) => (
                  <button key={k} type="button" className={`sa-pill${tri === k ? ' on' : ''}`} onClick={() => setTri(k)}>{l}</button>
                ))}
              </div>
            </div>
            <p className="muted" style={{ margin: '.2rem 0 0', fontSize: '.82rem' }}>
              Vu le {derniere ? dateFr(resultats[0]?.vu_le ?? new Date().toISOString()) : ''} avec le niveau {TIERS.find((t) => t.value === derniere?.tier)?.label ?? 'Standard'}{derniere?.downgraded ? ' (niveau replié selon votre offre)' : ''}{derniere ? ` · ${Math.round(derniere.duree_ms / 1000)} s` : ''}. Les prix sont ceux affichés sur chaque site au moment de la visite : ni convertis, ni estimés.
            </p>

            {resultats.length === 0 ? (
              <p className="muted" style={{ margin: '1rem 0 0' }}>Rien de lisible avec un prix sur les sites cochés. Reformulez (désignation plus courante, référence), ou regardez « ce que je n’ai pas pu voir » ci-dessous.</p>
            ) : (
              <table className="tar-table full rch-table">
                <thead><tr><th>Fournisseur</th><th>Ce qui a été vu</th><th className="num">Prix vu</th><th>Dispo</th><th>Actions</th></tr></thead>
                <tbody>
                  {tries.map((r) => (
                    <tr key={r.sceau}>
                      <td><b>{r.fournisseur}</b></td>
                      <td>
                        <div className="rch-desig">{r.designation_vue}</div>
                        <div className="rch-meta">
                          {r.reference ? <span>réf. {r.reference}</span> : null}
                          {r.conditionnement ? <span>{r.conditionnement}</span> : null}
                          {r.unite ? <span>par {r.unite}</span> : null}
                        </div>
                        <blockquote className="rch-extrait" title="Extrait cité de la page">« {r.extrait} »</blockquote>
                      </td>
                      <td className="num">
                        <b>{prixFr(r.prix_vu)} €</b>
                        <span className="inv-vu">{r.ht_ou_ttc === 'inconnu' ? 'HT/TTC non précisé' : r.ht_ou_ttc}</span>
                        {aReverifier(r.vu_le) ? <span className="pill warn">à revérifier</span> : null}
                      </td>
                      <td>{r.disponibilite_vue ? <span className={`pill ${enStock(r.disponibilite_vue) ? 'ok' : 'muted'}`} title={r.disponibilite_vue}>{r.disponibilite_vue.length > 38 ? `${r.disponibilite_vue.slice(0, 36)}…` : r.disponibilite_vue}</span> : <span className="muted">non indiquée</span>}</td>
                      <td>
                        <div className="rch-actions">
                          <button type="button" className="btn btn--primary" onClick={() => ouvrir(r, 'inventaire')}>Ajouter à l’inventaire</button>
                          <button type="button" className="btn btn--ghost" onClick={() => ouvrir(r, 'liste_achat')}>Ajouter à ma liste d’achat</button>
                          <a className="btn btn--ghost" href={r.url} target="_blank" rel="noopener noreferrer">Ouvrir le site ↗</a>
                          <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => chercher(`équivalent de « ${r.designation_vue} », autre marque`)}>Rechercher une équivalence</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : null}

        {(resultats || enregistre) && !busy && nonVus.length ? (
          <div className="tool-card rch-nonvu">
            <h2>Ce que je n’ai pas pu voir</h2>
            <ul>
              {nonVus.map((n) => <li key={`${n.fournisseur_id ?? n.fournisseur}`}><b>{n.fournisseur}</b> — {n.raison}</li>)}
            </ul>
            <p className="muted" style={{ margin: '.6rem 0 0', fontSize: '.82rem' }}>Un prix que l’assistant n’a pas vu n’est jamais remplacé par une estimation.</p>
          </div>
        ) : null}

        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`}>{msg.text}</div>}
      </div>

      {retenue ? (
        <Panneau titre={retenue.action === 'inventaire' ? 'Ajouter à l’inventaire' : 'Ajouter à ma liste d’achat'} onFermer={() => setRetenue(null)}>
          <div className="inv-fiche">
            <p className="muted" style={{ margin: 0, fontSize: '.88rem' }}>Fiche pré-remplie avec ce que l’assistant a vu. Rien n’est enregistré tant que vous n’avez pas validé.</p>
            {retenue.action === 'inventaire' ? (
              <>
                <label htmlFor="rch-nom">Nom dans votre inventaire</label>
                <input id="rch-nom" value={nomFiche} onChange={(e) => setNomFiche(e.target.value)} disabled={!!rattache} />
                {materiaux.length ? (
                  <>
                    <label htmlFor="rch-rattache">Ou rattacher à une fiche existante</label>
                    <select id="rch-rattache" value={rattache} onChange={(e) => setRattache(e.target.value)}>
                      <option value="">— nouvelle fiche —</option>
                      {materiaux.map((m) => <option key={m.id} value={m.id}>{m.nom}{m.reference ? ` · ${m.reference}` : ''}</option>)}
                    </select>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <label htmlFor="rch-qte">Quantité</label>
                <input id="rch-qte" value={qte} onChange={(e) => setQte(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" />
              </>
            )}
            <dl className="rch-recap">
              <dt>Vu chez</dt><dd>{retenue.r.fournisseur}</dd>
              <dt>Désignation</dt><dd>{retenue.r.designation_vue}</dd>
              {retenue.r.reference ? <><dt>Référence</dt><dd>{retenue.r.reference}</dd></> : null}
              <dt>Prix vu</dt><dd><b>{prixFr(retenue.r.prix_vu)} €</b> {retenue.r.ht_ou_ttc === 'inconnu' ? '(HT/TTC non précisé sur la page)' : retenue.r.ht_ou_ttc}{retenue.r.unite ? ` par ${retenue.r.unite}` : ''}</dd>
              {retenue.r.conditionnement ? <><dt>Conditionnement</dt><dd>{retenue.r.conditionnement}</dd></> : null}
              {retenue.r.disponibilite_vue ? <><dt>Disponibilité</dt><dd>{retenue.r.disponibilite_vue}</dd></> : null}
              <dt>Lien</dt><dd><a href={retenue.r.url} target="_blank" rel="noopener noreferrer">{retenue.r.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 70)}{retenue.r.url.length > 78 ? '…' : ''}</a></dd>
              <dt>Source</dt><dd>vu par l’assistant · {dateFr(retenue.r.vu_le)}</dd>
              <dt>Extrait</dt><dd className="rch-extrait">« {retenue.r.extrait} »</dd>
            </dl>
            <div className="inv-actions">
              <button type="button" className="btn btn--primary" disabled={busy || (retenue.action === 'inventaire' && !rattache && !nomFiche.trim())} onClick={retenir}>{busy ? '…' : retenue.action === 'inventaire' ? 'Enregistrer dans l’inventaire' : 'Ajouter à la liste'}</button>
              <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setRetenue(null)}>Annuler</button>
            </div>
          </div>
        </Panneau>
      ) : null}
    </AppShell>
  )
}
