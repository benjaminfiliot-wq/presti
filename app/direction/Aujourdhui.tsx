'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection, reconfirmationValide } from './client'
import Fraicheur, { type SourceInfo } from './Fraicheur'
import Reconfirmer, { type Portee } from './Reconfirmer'
import { relTime } from '@/lib/direction/fraicheur'

// « Aujourd'hui » (prompt v10 §2.1) : est-ce que tout va bien, et qu'est-ce que je dois faire ?
// Quatre blocs, chacun avec sa source et sa fraîcheur ; rien n'est recopié, rien n'est inventé.
type Controle = { cle: string; libelle: string; etat: 'ok' | 'warn' | 'crit' | 'info'; detail: string; source: string; a: string; cache: boolean }
type Etat = { niveau: 'ok' | 'degrade' | 'incident'; controles: Controle[]; role: 'direction' | 'lecture'; a: string }
type Sourcee<T> = { valeur: T | null; source: string; a: string; cache: boolean; erreur?: string; manque?: string }
type Chiffres = { mrr: Sourcee<{ mrr: number; abonnements: number }>; payants: Sourcee<number>; essais: Sourcee<number>; conversions: Sourcee<number>; encaisse: Sourcee<{ brut: number; frais: number; net: number; paiements: number; rembourse: number }>; coutIA: Sourcee<{ euros: number; budget: number | null; estimation: boolean; credits?: number }>; credits: Sourcee<{ consommes: number; inclus: number }>; a: string }
type Action = { libelle: string; route: string; methode: 'POST' | 'DELETE' | 'GET'; corps?: Record<string, unknown>; reconfirmation: boolean; portee?: string; externe?: string | null }
type Ligne = { id: string; type: string; gravite: 'info' | 'attention' | 'critique'; libelle: string; detail: string; a: string; source: string; action: Action }
type AFaire = { lignes: Ligne[]; sources: Record<string, { a: string; erreur?: string }>; a: string }
type Evenement = { id: string; type: string; a: string; libelle: string; detail: string | null; lien: string | null; source: string }
type Fil = { evenements: Evenement[]; sources: Record<string, { a: string; erreur?: string }>; a: string }

const euros = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`)
const NIVEAU = { ok: { pill: 'ok', texte: 'Tout fonctionne' }, degrade: { pill: 'warn', texte: 'Service dégradé' }, incident: { pill: 'crit', texte: 'Incident en cours' } } as const

export default function Aujourdhui({ role, signaler }: { role: 'direction' | 'lecture'; signaler: (m: { type: 'ok' | 'err'; text: string }) => void }) {
  const [etat, setEtat] = useState<Etat | null>(null)
  const [chiffres, setChiffres] = useState<Chiffres | null>(null)
  const [afaire, setAfaire] = useState<AFaire | null>(null)
  const [fil, setFil] = useState<Fil | null>(null)
  const [detailEtat, setDetailEtat] = useState(false)
  const [maintenant, setMaintenant] = useState(() => Date.now())
  const [busy, setBusy] = useState<string | null>(null)
  const [aConfirmer, setAConfirmer] = useState<{ ligne: Ligne; portee: Portee } | null>(null)

  const charger = useCallback(async () => {
    const [e, c, a, f] = await Promise.all([apiDirection<Etat>('/api/direction/etat'), apiDirection<Chiffres>('/api/direction/chiffres'), apiDirection<AFaire>('/api/direction/a-faire'), apiDirection<Fil>('/api/direction/fil')])
    if (e.ok) setEtat(e.data); if (c.ok) setChiffres(c.data); if (a.ok) setAfaire(a.data); if (f.ok) setFil(f.data)
    setMaintenant(Date.now())
  }, [])

  useEffect(() => {
    void charger()
    const t = setInterval(() => { if (document.visibilityState === 'visible') void charger() }, 60_000)
    const h = setInterval(() => setMaintenant(Date.now()), 20_000)
    return () => { clearInterval(t); clearInterval(h) }
  }, [charger])

  async function executer(l: Ligne) {
    const act = l.action
    if (act.reconfirmation && act.portee && !reconfirmationValide(act.portee)) { setAConfirmer({ ligne: l, portee: act.portee as Portee }); return }
    setBusy(l.id)
    const r = await apiDirection(act.route, { method: act.methode, ...(act.corps ? { body: JSON.stringify(act.corps) } : {}) }, act.reconfirmation)
    setBusy(null)
    if (r.ok) { signaler({ type: 'ok', text: `${act.libelle} ✅` }); void charger() }
    else if (r.data.code === 'reconfirmation_requise' || r.data.code === 'expire' || r.data.code === 'rejoue' || r.data.code === 'portee') setAConfirmer({ ligne: l, portee: (act.portee as Portee) || 'securite' })
    else signaler({ type: 'err', text: r.data.error ?? 'Action refusée.' })
  }

  const n = etat ? NIVEAU[etat.niveau] : null
  const kpi = (lab: string, valeur: string, s: SourceInfo | null, sub?: string) => (
    <div className="psh-kpi" data-kpi={lab}>
      <div className="lab">{lab}</div>
      <div className="val">{valeur}</div>
      <div className="sub">{sub ? <>{sub}<br /></> : null}{s ? <Fraicheur s={s} maintenant={maintenant} /> : <span className="dir-src">chargement…</span>}</div>
    </div>
  )
  const val = <T,>(s: Sourcee<T> | undefined, f: (v: T) => string) => (!s ? '…' : s.valeur === null ? '—' : f(s.valeur))

  return (
    <>
      <section className={`dir-bandeau ${etat ? etat.niveau : 'attente'}`} aria-live="polite" data-bandeau>
        <button type="button" className="dir-bandeau-btn" onClick={() => setDetailEtat((v) => !v)} aria-expanded={detailEtat}>
          <span className={`pill ${n ? n.pill : 'muted'}`}><span className="pdot" />{n ? n.texte : 'Vérification…'}</span>
          <span className="dir-bandeau-txt">{etat ? `${etat.controles.filter((c) => c.etat === 'ok').length} contrôles verts sur ${etat.controles.length}` : 'Site, connexion, Stripe, emails, tâches, budget IA'}</span>
          <span className="dir-bandeau-when">{etat ? relTime(etat.a, maintenant) : ''}</span>
        </button>
        {detailEtat && etat ? (
          <ul className="dir-controles">
            {etat.controles.map((c) => (
              <li key={c.cle} data-controle={c.cle}>
                <span className={`pill ${c.etat === 'info' ? 'muted' : c.etat}`}><span className="pdot" />{c.libelle}</span>
                <span>{c.detail}</span>
                <Fraicheur s={c} maintenant={maintenant} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="psh-panel dir-afaire" data-afaire>
        <header><h2>À faire</h2><span className="tag">{afaire ? `${afaire.lignes.length} en attente` : '…'}</span></header>
        <div className="dir-liste">
          {!afaire ? <div className="psh-item"><div className="psh-ibody"><p>Chargement…</p></div></div>
            : afaire.lignes.length === 0 ? <div className="psh-item" data-afaire-vide><div className="psh-ibody"><b>Rien en attente.</b><p>Aucun paiement échoué, aucune alerte, toutes les tâches à l’heure.</p></div></div>
            : afaire.lignes.map((l) => (
              <div key={l.id} className="psh-item" data-ligne={l.type}>
                <span className={`pill ${l.gravite === 'critique' ? 'crit' : l.gravite === 'attention' ? 'warn' : 'muted'}`}><span className="pdot" />{l.type}</span>
                <div className="psh-ibody">
                  <div className="top"><b>{l.libelle}</b><span className="time">{relTime(l.a, maintenant)}</span></div>
                  <p>{l.detail}</p>
                  <div className="meta">
                    {l.action.externe ? <a className="psh-btn ghost" href={l.action.externe} target="_blank" rel="noopener">{l.action.libelle}</a>
                      : l.action.methode === 'GET' ? null
                      : role === 'lecture' ? <span className="dir-src">lecture seule</span>
                      : <button type="button" className="psh-btn primary" disabled={busy === l.id} onClick={() => executer(l)} data-action={l.action.route}>{busy === l.id ? '…' : l.action.libelle}</button>}
                    <Fraicheur s={{ source: l.source, a: afaire.sources[l.type === 'paiement' ? 'stripe' : l.type === 'alerte' ? 'alertes' : 'crons']?.a ?? afaire.a }} maintenant={maintenant} />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="psh-kpis dir-kpis" data-chiffres>
        {kpi('MRR', val(chiffres?.mrr, (v) => euros(v.mrr)), chiffres?.mrr ?? null, chiffres?.mrr?.valeur ? `${chiffres.mrr.valeur.abonnements} abonnement${chiffres.mrr.valeur.abonnements > 1 ? 's' : ''}` : undefined)}
        {kpi('Artisans payants', val(chiffres?.payants, (v) => String(v)), chiffres?.payants ?? null)}
        {kpi('Essais en cours', val(chiffres?.essais, (v) => String(v)), chiffres?.essais ?? null)}
        {kpi('Conversions du jour', val(chiffres?.conversions, (v) => String(v)), chiffres?.conversions ?? null)}
        {kpi('Encaissé ce mois', val(chiffres?.encaisse, (v) => euros(v.net)), chiffres?.encaisse ?? null, chiffres?.encaisse?.valeur ? `${euros(chiffres.encaisse.valeur.brut)} brut · ${euros(chiffres.encaisse.valeur.frais)} de frais` : undefined)}
        {kpi('Coût IA du mois', val(chiffres?.coutIA, (v) => `${v.estimation ? '≈ ' : ''}${euros(v.euros)}`), chiffres?.coutIA ?? null, chiffres?.coutIA?.valeur ? (chiffres.coutIA.valeur.budget ? `sur ${euros(chiffres.coutIA.valeur.budget)} de budget` : 'aucun budget posé') : undefined)}
        {kpi('Crédits consommés', val(chiffres?.credits, (v) => String(v.consommes)), chiffres?.credits ?? null, chiffres?.credits?.valeur ? `sur ${chiffres.credits.valeur.inclus} inclus ce mois` : undefined)}
      </section>

      <section className="psh-panel dir-fil" data-fil>
        <header><h2>Fil</h2><span className="tag">{fil ? `${fil.evenements.length} derniers événements` : '…'}</span></header>
        <div className="dir-liste">
          {!fil ? <div className="psh-item"><div className="psh-ibody"><p>Chargement…</p></div></div>
            : fil.evenements.length === 0 ? <div className="psh-item"><div className="psh-ibody"><p>Rien encore.</p></div></div>
            : fil.evenements.map((e) => {
              const corps = <div className="psh-ibody"><div className="top"><b>{e.libelle}</b><span className="time">{relTime(e.a, maintenant)}</span></div>{e.detail ? <p>{e.detail}</p> : null}</div>
              return e.lien ? <a key={e.id} className="psh-item" href={e.lien} data-evenement={e.type}><span className="pill muted">{e.type}</span>{corps}</a> : <div key={e.id} className="psh-item" data-evenement={e.type}><span className="pill muted">{e.type}</span>{corps}</div>
            })}
        </div>
      </section>

      {aConfirmer ? <Reconfirmer portee={aConfirmer.portee} action={aConfirmer.ligne.action.libelle} onConfirme={() => { const l = aConfirmer.ligne; setAConfirmer(null); void executer(l) }} onAnnule={() => setAConfirmer(null)} /> : null}
    </>
  )
}
