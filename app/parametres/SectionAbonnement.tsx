'use client'

import { useEffect, useState } from 'react'
import { GRILLE, OFFRES, PLANS, planConf, type PlanPayant } from '@/lib/plans'
import { api, dateFr, type SectionProps } from './commun'
import { estNatif } from '@/lib/natif'

// Abonnement & usage (sprint J-1 §6). Tout ce qui est chiffré vient de la base ou de Stripe :
//  • la jauge = crédits inclus dans la formule − crédits restants (artisans.credits). Il n'existe
//    pas de journal de consommation par type : on ne montre donc PAS de ventilation
//    « réponses / devis / recherches », on ne l'invente pas.
//  • paiements, moyen de paiement, résiliation = portail Stripe. La date de fin de période
//    vient de Stripe (GET /api/stripe/portail), sinon elle n'est pas affichée.
//  • « ce qui se déverrouille » = les lignes de la grille (lib/plans.ts) qui changent entre
//    l'offre actuelle et la cible. Même source que /abonnement et la landing.

type Abo = { statut: string; fin_periode: string | null; resiliation_prevue: boolean; fin_prevue: string | null } | null

/** L'offre de référence pour comparer : l'essai a les capacités de l'Essentiel, les fondateurs celles de Signature. */
const reference = (plan: string | null): PlanPayant => (plan === 'studio' || plan === 'signature' ? plan : plan === 'business' ? 'signature' : 'essentiel')

function deverrouille(actuel: PlanPayant, cible: PlanPayant): string[] {
  const out: string[] = []
  for (const l of GRILLE) {
    const de = l.cellules[actuel], vers = l.cellules[cible]
    if (de === vers || vers === false) continue
    if (de === false) out.push(typeof vers === 'string' ? `${l.label} — ${vers}` : l.label)
    else if (typeof vers === 'string') out.push(l.label === 'Crédits chaque mois' ? `${vers} crédits chaque mois (au lieu de ${de})` : `${l.label} — ${vers}`)
  }
  return out
}

export default function SectionAbonnement({ a, signaler }: SectionProps) {
  // La coque (stores) : pas d'achat, pas de portail, pas de renvoi — la formule se consulte (critique des fiches, 07/09).
  const natif = estNatif()
  const [abo, setAbo] = useState<Abo>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const plan = a.plan ?? 'gratuit'
  const conf = planConf(plan)
  const illimite = !!a.is_founder || plan === 'business'
  const inclus = conf.creditsMois
  const restants = Math.max(0, a.credits ?? 0)
  const consommes = Math.max(0, Math.min(inclus, inclus - restants))
  const pct = inclus ? Math.round((consommes / inclus) * 100) : 0
  const ref = reference(plan)
  const ordre: PlanPayant[] = ['essentiel', 'studio', 'signature']
  const superieures = ordre.filter((o) => ordre.indexOf(o) > ordre.indexOf(ref))

  useEffect(() => {
    if (!a.stripe_subscription_id) return
    api<{ abonnement: Abo }>('/api/stripe/portail').then((r) => { if (r.ok) setAbo(r.data.abonnement ?? null) })
  }, [a.stripe_subscription_id])

  async function portail() {
    if (busy) return
    setBusy('portail')
    const r = await api<{ url?: string }>('/api/stripe/portail', { method: 'POST' })
    setBusy(null)
    if (!r.ok || !r.data.url) { signaler({ type: 'err', text: r.data.error ?? 'Portail indisponible.' }); return }
    window.location.href = r.data.url
  }

  async function souscrire(id: PlanPayant) {
    if (busy) return
    if (a.stripe_subscription_id) { portail(); return } // déjà abonné : le changement passe par Stripe (prorata juste)
    setBusy(id)
    const r = await api<{ url?: string }>('/api/subscribe', { method: 'POST', body: JSON.stringify({ plan: id }) })
    setBusy(null)
    if (!r.ok || !r.data.url) { signaler({ type: 'err', text: r.data.error ?? 'Abonnement indisponible.' }); return }
    window.location.href = r.data.url
  }

  return (
    <>
      <div className="tool-card">
        <h2>Votre formule</h2>
        <div className="abo-etat">
          <div>
            <b>{illimite ? 'Fondateur · accès total' : conf.label}</b>
            <span className="muted">{illimite ? 'Crédits jamais décomptés.' : conf.prixMois ? `${conf.prixMois} € par mois, sans engagement.` : 'Essai gratuit, sans carte.'}</span>
          </div>
          {abo?.resiliation_prevue && abo.fin_prevue ? <span className="abo-pill warn">Résiliation le {dateFr(abo.fin_prevue)}</span>
            : abo?.fin_periode ? <span className="abo-pill">Prochaine échéance le {dateFr(abo.fin_periode)}</span> : null}
        </div>

        <h3 style={{ margin: '1.3rem 0 .3rem', fontSize: '1rem' }}>Crédits du mois</h3>
        {illimite ? (
          <p className="muted" style={{ margin: 0 }}>Illimités.</p>
        ) : (
          <>
            <div className="jauge" role="meter" aria-valuemin={0} aria-valuemax={inclus} aria-valuenow={consommes} aria-label="Crédits consommés ce mois">
              <i style={{ width: `${pct}%` }} className={pct >= 90 ? 'crit' : pct >= 70 ? 'warn' : ''} />
            </div>
            <div className="jauge-leg">
              <span><b>{consommes}</b> consommé{consommes > 1 ? 's' : ''} sur <b>{inclus}</b> inclus</span>
              <span className="muted">{restants} restant{restants > 1 ? 's' : ''}{a.credits_reset_le ? ` · renouvelés le ${dateFr(a.credits_reset_le)}` : ''}</span>
            </div>
            <p className="muted" style={{ fontSize: '.82rem', margin: '.5rem 0 0' }}>1 crédit = 1 génération IA (réponse, devis, relance) ; le modèle Expert en consomme 3.</p>
          </>
        )}
      </div>

      {natif ? (
        <p className="muted" data-abonnement-natif style={{ margin: '.2rem 0 0' }}>Dans l’application, votre formule se consulte ; sa gestion n’est pas disponible ici.</p>
      ) : null}

      {!natif && a.stripe_customer_id ? (
        <div className="tool-card">
          <h2>Paiements &amp; facturation</h2>
          <p className="muted" style={{ margin: '0 0 .9rem' }}>
            Vos reçus, votre moyen de paiement, le changement ou l’arrêt de votre abonnement : tout se gère dans votre portail Stripe, sécurisé.
            {abo?.fin_periode && !abo.resiliation_prevue ? <> Si vous résiliez, votre formule reste active jusqu’au <b>{dateFr(abo.fin_periode)}</b>, puis vous repassez à l’essai.</> : null}
          </p>
          <button type="button" className="btn btn--primary" disabled={busy === 'portail'} onClick={portail}>{busy === 'portail' ? 'Ouverture…' : 'Ouvrir mon portail de facturation'}</button>
        </div>
      ) : null}

      {!natif && !illimite && superieures.length ? (
        <div className="tool-card">
          <h2>Changer d’offre</h2>
          <p className="muted" style={{ margin: '0 0 1rem' }}>Ce que chaque offre débloque par rapport à la vôtre — rien d’autre.</p>
          <div className="abo-deverr">
            {superieures.map((id) => {
              const o = OFFRES.find((x) => x.id === id)!
              const gains = deverrouille(ref, id)
              return (
                <div key={id} className="abo-deverr-card">
                  <div className="abo-deverr-head"><b>{o.label}</b><span>{o.prix} €<small>/mois</small></span></div>
                  <p className="muted" style={{ margin: '.2rem 0 .6rem', fontSize: '.85rem' }}>{PLANS[id].accroche}</p>
                  <ul>{gains.map((g) => <li key={g}>{g}</li>)}</ul>
                  <button type="button" className={`btn ${id === 'studio' ? 'btn--primary' : 'btn--ghost'}`} disabled={!!busy} onClick={() => souscrire(id)}>
                    {busy === id ? 'Redirection…' : a.stripe_subscription_id ? `Passer à ${o.label} (via Stripe)` : `Passer à ${o.label}`}
                  </button>
                </div>
              )
            })}
          </div>
          <p className="muted" style={{ fontSize: '.82rem', margin: '.9rem 0 0' }}>Le tableau complet, ligne par ligne, est sur <a href="/abonnement">la page Abonnement</a>.</p>
        </div>
      ) : null}
    </>
  )
}
