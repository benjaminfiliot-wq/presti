'use client'

import { useEffect, useState } from 'react'
import { GRILLE, OFFRES, PLANS, ESSAI_JOURS, offreDeReference, planConf, texteCellule, type PlanPayant } from '@/lib/plans'
import { creditsEssai } from '@/lib/essaiGratuit'
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

type Abo = { statut: string; fin_periode: string | null; essai_fin?: string | null; resiliation_prevue: boolean; fin_prevue: string | null } | null

/** L'offre de référence pour comparer : les fondateurs ont celles de Signature. L'essai et l'ancienne offre Essentiel (plus vendue
 *  depuis le 25/10) n'ont aucune offre payante de référence : on compare alors aux capacités du compte (`deverrouilleDepuis`). */
const reference = (plan: string | null): PlanPayant | null => offreDeReference(plan)

/** Sans offre de référence (essai, Essentiel hérité) : les lignes de l'offre cible dont le compte n'a pas toutes les capacités,
 *  plus les lignes de chiffres (crédits, espaces) et le niveau d'automatisation. */
function deverrouilleDepuis(plan: string, cible: PlanPayant): string[] {
  const a = planConf(plan).capacites
  const out: string[] = []
  for (const l of GRILLE) {
    const vers = l.cellules[cible]
    if (vers === false) continue
    if (l.capacites.length && l.capacites.every((c) => a.includes(c))) continue
    const t = texteCellule(l, vers)
    if (t) out.push(l.label === 'Crédits chaque mois' ? `${t} (au lieu de ${planConf(plan).creditsMois})` : t)
  }
  return out
}

function deverrouille(actuel: PlanPayant, cible: PlanPayant): string[] {
  const out: string[] = []
  for (const l of GRILLE) {
    const de = l.cellules[actuel], vers = l.cellules[cible]
    if (de === vers || vers === false) continue
    if (de === false) { const t = texteCellule(l, vers); if (t) out.push(t) }
    else if (typeof vers === 'string') { const t = texteCellule(l, vers); if (t) out.push(l.label === 'Crédits chaque mois' ? `${t} (au lieu de ${de})` : t) }
  }
  return out
}

export default function SectionAbonnement({ a, signaler }: SectionProps) {
  // La coque (stores) : pas d'achat, pas de portail, pas de renvoi — la formule se consulte (critique des fiches, 07/09).
  const natif = estNatif()
  const [abo, setAbo] = useState<Abo>(null)
  const [busy, setBusy] = useState<string | null>(null)
  // Droit à l'essai gratuit sans carte (GET /api/subscribe) : les boutons ne parlent d'essai que si c'est vrai pour ce compte.
  const [essaiDispo, setEssaiDispo] = useState(false)
  const plan = a.plan ?? 'gratuit'
  const conf = planConf(plan)
  const illimite = !!a.is_founder || plan === 'business'
  // Essai gratuit en cours (statut Stripe « trialing ») : la jauge compte les crédits de l'essai, pas ceux du mois.
  const enEssai = abo?.statut === 'trialing' && !!abo.essai_fin
  const inclus = enEssai ? creditsEssai(plan) : conf.creditsMois
  const restants = Math.max(0, a.credits ?? 0)
  const consommes = Math.max(0, Math.min(inclus, inclus - restants))
  const pct = inclus ? Math.round((consommes / inclus) * 100) : 0
  const ref = reference(plan)
  const ordre: PlanPayant[] = ['studio', 'signature']
  // Sans offre de référence (essai, Essentiel hérité), les deux offres sont proposées.
  const superieures = ref === null ? ordre : ordre.filter((o) => ordre.indexOf(o) > ordre.indexOf(ref))

  useEffect(() => {
    if (!a.stripe_subscription_id) return
    api<{ abonnement: Abo }>('/api/stripe/portail').then((r) => { if (r.ok) setAbo(r.data.abonnement ?? null) })
  }, [a.stripe_subscription_id])

  useEffect(() => {
    if (a.stripe_subscription_id || a.is_founder) return
    api<{ essai?: { disponible?: boolean } }>('/api/subscribe').then((r) => { if (r.ok) setEssaiDispo(!!r.data.essai?.disponible) })
  }, [a.stripe_subscription_id, a.is_founder])

  async function portail() {
    if (busy) return
    setBusy('portail')
    const r = await api<{ url?: string }>('/api/stripe/portail', { method: 'POST' })
    setBusy(null)
    if (!r.ok || !r.data.url) { signaler({ type: 'err', text: r.data.error ?? 'Portail indisponible.' }); return }
    window.location.href = r.data.url
  }

  async function souscrire(id: PlanPayant, mode: 'essai' | 'payer' = 'essai') {
    if (busy) return
    if (a.stripe_subscription_id) { portail(); return } // déjà abonné : le changement passe par Stripe (prorata juste)
    setBusy(id)
    const r = await api<{ url?: string }>('/api/subscribe', { method: 'POST', body: JSON.stringify({ plan: id, mode }) })
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
            <span className="muted">{illimite ? 'Crédits jamais décomptés.' : enEssai ? `Essai gratuit jusqu’au ${dateFr(abo!.essai_fin!)}.` : conf.surDevis ? 'Contrat sur mesure.' : conf.prixMois ? `${conf.prixMois} € par mois, sans engagement.` : 'Essai gratuit, sans carte.'}</span>
          </div>
          {enEssai ? <span className="abo-pill" data-essai-gratuit-en-cours>Essai gratuit jusqu’au {dateFr(abo!.essai_fin!)}</span>
            : abo?.resiliation_prevue && abo.fin_prevue ? <span className="abo-pill warn">Résiliation le {dateFr(abo.fin_prevue)}</span>
            : abo?.fin_periode ? <span className="abo-pill">Prochaine échéance le {dateFr(abo.fin_periode)}</span> : null}
        </div>

        <h3 style={{ margin: '1.3rem 0 .3rem', fontSize: '1rem' }}>{enEssai ? 'Crédits de l’essai' : 'Crédits du mois'}</h3>
        {illimite ? (
          <p className="muted" style={{ margin: 0 }}>Illimités.</p>
        ) : (
          <>
            <div className="jauge" role="meter" aria-valuemin={0} aria-valuemax={inclus} aria-valuenow={consommes} aria-label="Crédits consommés ce mois">
              <i style={{ width: `${pct}%` }} className={pct >= 90 ? 'crit' : pct >= 70 ? 'warn' : ''} />
            </div>
            <div className="jauge-leg">
              <span><b>{consommes}</b> consommé{consommes > 1 ? 's' : ''} sur <b>{inclus}</b> inclus</span>
              <span className="muted">{restants} restant{restants > 1 ? 's' : ''}{a.credits_reset_le && !enEssai ? ` · renouvelés le ${dateFr(a.credits_reset_le)}` : ''}</span>
            </div>
            <p className="muted" style={{ fontSize: '.82rem', margin: '.5rem 0 0' }}>1 crédit = 1 génération IA (réponse, devis, dépôt de compta) ; une recherche fournisseurs en consomme 2, le modèle Expert 3. Les relances automatiques ne consomment rien.</p>
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
            {enEssai ? <> <b>Pour continuer après l’essai, ajoutez une carte</b> dans le portail : l’abonnement {conf.label} ({conf.prixMois} € par mois) démarre alors le {dateFr(abo!.essai_fin!)}. Sans carte, rien n’est prélevé : l’abonnement s’arrête ce jour-là et vous repassez à l’offre d’Essai ({PLANS.gratuit.creditsMois} crédits) ; vos données restent en place.</> : null}
            {!enEssai && abo?.fin_periode && !abo.resiliation_prevue ? <> Si vous résiliez, votre formule reste active jusqu’au <b>{dateFr(abo.fin_periode)}</b>, puis vous repassez à l’essai.</> : null}
          </p>
          <button type="button" className="btn btn--primary" disabled={busy === 'portail'} onClick={portail}>{busy === 'portail' ? 'Ouverture…' : enEssai ? 'Ajouter une carte pour continuer' : 'Ouvrir mon portail de facturation'}</button>
        </div>
      ) : null}

      {!natif && !illimite && superieures.length ? (
        <div className="tool-card">
          <h2>Changer d’offre</h2>
          <p className="muted" style={{ margin: '0 0 1rem' }}>Ce que chaque offre débloque par rapport à la vôtre — rien d’autre.</p>
          <div className="abo-deverr">
            {superieures.map((id) => {
              const o = OFFRES.find((x) => x.id === id)!
              const gains = ref === null ? deverrouilleDepuis(plan, id) : deverrouille(ref, id)
              return (
                <div key={id} className="abo-deverr-card">
                  <div className="abo-deverr-head"><b>{o.label}</b><span>{o.prix} €<small>/mois</small></span></div>
                  <p className="muted" style={{ margin: '.2rem 0 .6rem', fontSize: '.85rem' }}>{PLANS[id].accroche}</p>
                  <ul>{gains.map((g) => <li key={g}>{g}</li>)}</ul>
                  <button type="button" className={`btn ${id === 'studio' ? 'btn--primary' : 'btn--ghost'}`} disabled={!!busy} onClick={() => souscrire(id)}>
                    {busy === id ? 'Redirection…' : a.stripe_subscription_id ? `Passer à ${o.label} (via Stripe)` : essaiDispo ? `Essayer ${o.label} ${ESSAI_JOURS[id]} jours gratuits, sans carte` : `Passer à ${o.label}`}
                  </button>
                  {/* Les deux choix (Benj, 16/10) : les semaines gratuites ci-dessus, ou payer tout de suite. */}
                  {essaiDispo && !a.stripe_subscription_id ? (
                    <button type="button" className="btn btn--ghost" data-abo-payer={id} disabled={!!busy} onClick={() => souscrire(id, 'payer')} style={{ marginTop: '.5rem' }}>
                      {`Payer maintenant — ${o.prix} €/mois`}
                    </button>
                  ) : null}
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
