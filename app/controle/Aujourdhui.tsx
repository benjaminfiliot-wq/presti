'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiDirection, reconfirmationValide } from './client'
import Fraicheur, { type SourceInfo } from './Fraicheur'
import Reconfirmer, { type Portee } from './Reconfirmer'
import { relTime, euros } from '@/lib/direction/fraicheur'

// « Aujourd'hui » (prompt v10 §2.1) : est-ce que tout va bien, et qu'est-ce que je dois faire ?
// Quatre blocs, chacun avec sa source et sa fraîcheur ; rien n'est recopié, rien n'est inventé.
//
// Deux règles apprises à la revue du 07/09 : une source en panne se VOIT (sans elle, « Rien en attente »
// affirmait le calme alors que Stripe ne répondait pas) ; et chaque bloc s'affiche dès qu'il arrive, sans
// attendre le plus lent.
type Controle = { cle: string; libelle: string; etat: 'ok' | 'warn' | 'crit' | 'info'; detail: string; source: string; a: string; cache: boolean; manque?: string }
type Etat = { niveau: 'ok' | 'degrade' | 'incident'; controles: Controle[]; role: 'direction' | 'lecture'; a: string }
type Sourcee<T> = { valeur: T | null; source: string; a: string; cache: boolean; erreur?: string; manque?: string }
type Chiffres = { mrr: Sourcee<{ mrr: number; abonnements: number; enPause?: number; abonnementsEnPause?: number }>; payants: Sourcee<number>; essais: Sourcee<number>; conversions: Sourcee<number>; encaisse: Sourcee<{ brut: number; frais: number; net: number; paiements: number; rembourse: number }>; coutIA: Sourcee<{ euros: number; budget: number | null; estimation: boolean; credits?: number; perimetre?: string }>; coutProduit: Sourcee<{ euros: number; credits?: number; estimation?: boolean }>; credits: Sourcee<{ consommes: number; inclus: number }>; a: string }
type Action = { libelle: string; route?: string; methode?: 'POST' | 'DELETE'; corps?: Record<string, unknown>; reconfirmation: boolean; portee?: string }
type Ligne = { id: string; type: string; libelleType: string; gravite: 'info' | 'attention' | 'critique'; libelle: string; detail: string; a: string; source: string; action?: Action }
type AFaire = { lignes: Ligne[]; sources: Record<string, { a: string; erreur?: string }>; a: string }
type Evenement = { id: string; type: string; libelleType: string; a: string; libelle: string; detail: string | null; onglet: string | null; source: string }
type Fil = { evenements: Evenement[]; sources: Record<string, { a: string; erreur?: string }>; a: string }

const NIVEAU = { ok: { pill: 'ok', texte: 'Tout fonctionne' }, degrade: { pill: 'warn', texte: 'Service dégradé' }, incident: { pill: 'crit', texte: 'Incident en cours' } } as const
const NOMS_SOURCE: Record<string, string> = { stripe: 'Stripe', alertes: 'la base', crons: 'la base', journal: 'la base', artisans: 'la base' }

export default function Aujourdhui({ role, signaler }: { role: 'direction' | 'lecture'; signaler: (m: { type: 'ok' | 'err'; text: string }) => void }) {
  const [etat, setEtat] = useState<Etat | null>(null)
  const [chiffres, setChiffres] = useState<Chiffres | null>(null)
  const [afaire, setAfaire] = useState<AFaire | null>(null)
  const [fil, setFil] = useState<Fil | null>(null)
  const [panne, setPanne] = useState<string | null>(null)
  const [detailEtat, setDetailEtat] = useState(false)
  const [maintenant, setMaintenant] = useState(() => Date.now())
  const [busy, setBusy] = useState<string | null>(null)
  const [aConfirmer, setAConfirmer] = useState<{ ligne: Ligne; portee: Portee } | null>(null)

  const charger = useCallback(() => {
    // Chaque bloc s'affiche dès qu'il revient : un Stripe lent ne retarde plus le reste de l'écran.
    const suivre = <T,>(chemin: string, poser: (v: T) => void) => {
      void apiDirection<T>(chemin).then((r) => {
        if (r.ok) { poser(r.data); setPanne(null); return }
        // 429 (trop d’appels), 503 (base muette), 0 (réseau) : tout refus se dit. Un bloc silencieux qui reste
        // « en chargement » pour toujours est le pire des deux mondes (constaté au premier passage du 07/09).
        setPanne(r.data.error ?? 'Une partie de la direction ne répond pas.')
      })
    }
    suivre<Etat>('/api/controle/etat', setEtat)
    suivre<Chiffres>('/api/controle/chiffres', setChiffres)
    suivre<AFaire>('/api/controle/a-faire', setAfaire)
    suivre<Fil>('/api/controle/fil', setFil)
    setMaintenant(Date.now())
  }, [])

  useEffect(() => {
    charger()
    const t = setInterval(() => { if (document.visibilityState === 'visible') charger() }, 60_000)
    const h = setInterval(() => setMaintenant(Date.now()), 20_000)
    return () => { clearInterval(t); clearInterval(h) }
  }, [charger])

  const executer = useCallback(async (l: Ligne) => {
    const act = l.action
    if (!act?.route || !act.methode) return
    if (act.reconfirmation && act.portee && !reconfirmationValide(act.portee)) { setAConfirmer({ ligne: l, portee: act.portee as Portee }); return }
    setBusy(l.id)
    try {
      const r = await apiDirection<{ message?: string }>(act.route, { method: act.methode, ...(act.corps ? { body: JSON.stringify(act.corps) } : {}) }, act.reconfirmation)
      if (r.ok) { signaler({ type: 'ok', text: r.data.message ?? 'C’est fait.' }); charger(); return }
      // La portée exigée est celle que le SERVEUR annonce : la deviner ouvrait la modale en boucle.
      const portee = (r.data.portee as Portee | undefined) ?? (act.portee as Portee | undefined)
      if (['reconfirmation_requise', 'expire', 'rejoue', 'portee'].includes(r.data.code ?? '') && portee) { setAConfirmer({ ligne: l, portee }); return }
      signaler({ type: 'err', text: r.data.error ?? 'Action refusée.' })
    } finally { setBusy(null) }
  }, [charger, signaler])

  const fermerModale = useCallback(() => setAConfirmer(null), [])
  const confirmee = useCallback(() => { const l = aConfirmer?.ligne; setAConfirmer(null); if (l) void executer(l) }, [aConfirmer, executer])

  const n = etat ? NIVEAU[etat.niveau] : null
  const kpi = (lab: string, valeur: string, s: SourceInfo | null, sub?: string) => (
    <div className="psh-kpi" data-kpi={lab}>
      <div className="lab">{lab}</div>
      <div className="val">{valeur}</div>
      <div className="sub">{sub ? <>{sub}<br /></> : null}{s ? <Fraicheur s={s} maintenant={maintenant} /> : <span className="dir-src">chargement…</span>}</div>
    </div>
  )
  const val = <T,>(s: Sourcee<T> | undefined, f: (v: T) => string) => (!s ? '…' : s.valeur === null ? '—' : f(s.valeur))
  const pannes = (sources: Record<string, { a: string; erreur?: string }> | undefined) => Object.entries(sources ?? {}).filter(([, s]) => s.erreur)

  return (
    <>
      {panne ? <p className="notif-erreur" role="alert" data-panne>{panne} Les blocs déjà chargés restent affichés ; le prochain rafraîchissement réessaie.</p> : null}

      <section className={`dir-bandeau ${etat ? etat.niveau : 'attente'}`} data-bandeau>
        <span className="visually-hidden" aria-live="polite">{n ? `État du service : ${n.texte}.` : ''}</span>
        <button type="button" className="dir-bandeau-btn" onClick={() => setDetailEtat((v) => !v)} aria-expanded={detailEtat}>
          <span className={`pill ${n ? n.pill : panne ? 'crit' : 'muted'}`}><span className="pdot" />{n ? n.texte : panne ? 'État non vérifié' : 'Vérification…'}</span>
          <span className="dir-bandeau-txt">{etat ? `${etat.controles.filter((c) => c.etat === 'ok').length} contrôles verts sur ${etat.controles.length}` : panne ? panne : 'Site, connexion, Stripe, emails, tâches, budget IA'}</span>
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

      <section className="psh-panel dir-afaire" data-afaire aria-labelledby="dir-afaire-t">
        <header><h2 id="dir-afaire-t">À faire</h2><span className="tag">{afaire ? `${afaire.lignes.length} en attente` : '…'}</span></header>
        <div className="dir-liste">
          {!afaire ? <div className="psh-item"><div className="psh-ibody"><p>Chargement…</p></div></div>
            : afaire.lignes.length === 0 ? (
              <div className="psh-item" data-afaire-vide>
                <div className="psh-ibody">
                  {pannes(afaire.sources).length
                    ? <><b>Liste incomplète.</b><p>{pannes(afaire.sources).map(([k]) => NOMS_SOURCE[k] ?? k).join(', ')} ne répond pas : ce qui en vient n’est pas listé.</p></>
                    : <><b>Rien en attente.</b><p>Aucun paiement échoué, aucune alerte, toutes les tâches à l’heure.</p></>}
                </div>
              </div>
            )
            : afaire.lignes.map((l) => (
              <div key={l.id} className="psh-item" data-ligne={l.type}>
                <span className={`pill ${l.gravite === 'critique' ? 'crit' : l.gravite === 'attention' ? 'warn' : 'muted'}`}><span className="pdot" />{l.libelleType}</span>
                <div className="psh-ibody">
                  <div className="top"><b>{l.libelle}</b><span className="time">{relTime(l.a, maintenant)}</span></div>
                  <p>{l.detail}</p>
                  <div className="meta">
                    {l.action?.route && role === 'direction'
                      ? <button type="button" className="psh-btn primary" disabled={busy === l.id} onClick={() => void executer(l)} data-action={l.action.route}>{busy === l.id ? '…' : l.action.libelle}</button>
                      : l.action?.route ? <span className="dir-src">lecture seule</span> : null}
                    <Fraicheur s={{ source: l.source, a: afaire.a }} maintenant={maintenant} />
                  </div>
                </div>
              </div>
            ))}
          {afaire && afaire.lignes.length > 0 && pannes(afaire.sources).length ? (
            <div className="psh-item" data-afaire-incomplet>
              <span className="pill crit"><span className="pdot" />incomplet</span>
              <div className="psh-ibody"><b>Liste incomplète</b><p>{pannes(afaire.sources).map(([k, s]) => `${NOMS_SOURCE[k] ?? k} : ${s.erreur}`).join(' · ')}</p></div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="dir-chiffres" aria-labelledby="dir-chiffres-t" data-chiffres>
        <h2 id="dir-chiffres-t" className="dir-h2">Chiffres du jour</h2>
        <div className="psh-kpis dir-kpis">
          {kpi('MRR', val(chiffres?.mrr, (v) => euros(v.mrr)), chiffres?.mrr ?? null, chiffres?.mrr?.valeur ? `${chiffres.mrr.valeur.abonnements} abonnement${chiffres.mrr.valeur.abonnements > 1 ? 's' : ''}${chiffres.mrr.valeur.abonnementsEnPause ? ` · ${chiffres.mrr.valeur.abonnementsEnPause} en pause (${euros(chiffres.mrr.valeur.enPause ?? 0)} non facturés)` : ''}` : undefined)}
          {kpi('Artisans payants', val(chiffres?.payants, (v) => String(v)), chiffres?.payants ?? null)}
          {kpi('Essais en cours', val(chiffres?.essais, (v) => String(v)), chiffres?.essais ?? null)}
          {kpi('Abonnements activés aujourd’hui', val(chiffres?.conversions, (v) => String(v)), chiffres?.conversions ?? null)}
          {kpi('Encaissé ce mois', val(chiffres?.encaisse, (v) => euros(v.net)), chiffres?.encaisse ?? null, chiffres?.encaisse?.valeur ? `${euros(chiffres.encaisse.valeur.brut)} brut · ${euros(chiffres.encaisse.valeur.frais)} de frais` : undefined)}
          {kpi('Facture Anthropic', val(chiffres?.coutIA, (v) => `${v.estimation ? '≈ ' : ''}${euros(v.euros)}`), chiffres?.coutIA ?? null, chiffres?.coutIA?.valeur ? `toute l’organisation (développement compris)${chiffres.coutIA.valeur.budget ? ` · budget ${euros(chiffres.coutIA.valeur.budget)}` : ''}` : undefined)}
          {kpi('Coût IA du produit', val(chiffres?.coutProduit, (v) => `${v.estimation === false ? '' : '≈ '}${euros(v.euros)}`), chiffres?.coutProduit ?? null,
            chiffres?.coutProduit?.valeur
              ? (chiffres.coutProduit.valeur.estimation === false ? 'espace de travail Presti, facturé' : `${chiffres.coutProduit.valeur.credits ?? 0} crédit${(chiffres.coutProduit.valeur.credits ?? 0) > 1 ? 's' : ''} consommés par les artisans`)
              : undefined)}
          {kpi('Crédits consommés', val(chiffres?.credits, (v) => String(v.consommes)), chiffres?.credits ?? null, chiffres?.credits?.valeur ? `sur ${chiffres.credits.valeur.inclus} inclus ce mois` : undefined)}
        </div>
      </section>

      <section className="psh-panel dir-fil" data-fil aria-labelledby="dir-fil-t">
        <header><h2 id="dir-fil-t">Fil</h2><span className="tag">{fil ? `${fil.evenements.length} derniers événements` : '…'}</span></header>
        <div className="dir-liste">
          {!fil ? <div className="psh-item"><div className="psh-ibody"><p>Chargement…</p></div></div>
            : fil.evenements.length === 0 ? <div className="psh-item"><div className="psh-ibody"><p>Rien encore.</p></div></div>
            : fil.evenements.map((e) => (
              <div key={e.id} className="psh-item" data-evenement={e.type}>
                <span className="pill muted">{e.libelleType}</span>
                <div className="psh-ibody"><div className="top"><b>{e.libelle}</b><span className="time">{relTime(e.a, maintenant)}</span></div>{e.detail ? <p>{e.detail}</p> : null}</div>
              </div>
            ))}
        </div>
      </section>

      {aConfirmer ? <Reconfirmer portee={aConfirmer.portee} action={aConfirmer.ligne.action?.libelle ?? 'cette action'} onConfirme={confirmee} onAnnule={fermerModale} /> : null}
    </>
  )
}
