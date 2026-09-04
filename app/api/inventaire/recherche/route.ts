import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authInventaire, estRefus } from '@/lib/inventaire/auth'
import { COLONNES_FOURNISSEUR, type Fournisseur } from '@/lib/inventaire/types'
import { messageVerrou, peut, COUT_RECHERCHE } from '@/lib/plans'
import { resolveModel } from '@/lib/models'
import { consumeCredit } from '@/lib/credits'
import { consommerLimite } from '@/lib/limites'
import { actif } from '@/lib/flags'
import { rechercherChezFournisseurs } from '@/lib/recherche-fournisseurs'

// L'assistant de recherche (§8 F3) — POST { requete, quantite?, fournisseur_ids?, tier? }.
//
// Rend ce que l'assistant a VU chez les fournisseurs cochés : rien n'est stocké ici. C'est
// « /recherche/retenir », sur le clic de l'artisan, qui écrit.
//
// Garde-fous, dans l'ordre : identité + verrou inventaire (authInventaire) → verrou d'offre
// `inventaire.recherche_ia` (Studio+) → limite 20 recherches / heure par artisan → crédit du
// niveau (1 / 1 / 3). Une requête refusée en 429 ne coûte pas de crédit.

export const runtime = 'nodejs'
export const maxDuration = 60

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LIMITE_PAR_HEURE = 20
// Plafonds DURS (coût réel : ~0,20 à 0,50 € par recherche en tokens, contre 0,17 à 0,24 € le
// crédit). Sans eux, un seul artisan pouvait lancer 480 recherches par jour — plusieurs milliers
// d'euros d'API par mois pour un abonnement à 59 €. Ils s'appliquent AUSSI aux comptes fondateur,
// qui ne consomment pas de crédits : c'est justement là que la dérive était invisible.
const LIMITE_PAR_JOUR = 30
const LIMITE_PAR_MOIS = 200

export async function POST(req: Request) {
  try {
    if (!actif('inventaireRecherche')) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    const a = await authInventaire(req)
    if (estRefus(a)) return NextResponse.json({ error: a.error }, { status: a.status })
    if (!a.isFounder && !peut(a.plan, 'inventaire.recherche_ia')) {
      return NextResponse.json({ error: `La recherche chez vos fournisseurs n’est pas dans votre offre. ${messageVerrou('inventaire.recherche_ia')}` }, { status: 403 })
    }
    const b = await req.json().catch(() => null)
    if (!b || typeof b !== 'object') return NextResponse.json({ error: 'Requête vide.' }, { status: 400 })
    const requete = String(b.requete ?? '').trim().slice(0, 300)
    if (requete.length < 2) return NextResponse.json({ error: 'Dites-moi ce que vous cherchez.' }, { status: 400 })
    const quantite = Number(b.quantite)
    const ids: string[] | null = Array.isArray(b.fournisseur_ids) ? b.fournisseur_ids.filter((x: unknown) => UUID.test(String(x))).slice(0, 50) : null

    // Ses fournisseurs, dans son ordre de préférence ; bornés aux cochés si la liste est donnée.
    let q = supabaseAdmin.from('fournisseurs').select(COLONNES_FOURNISSEUR).eq('artisan_id', a.uid).order('ordre').order('nom')
    if (ids) q = q.in('id', ids)
    const { data, error } = await q
    if (error) { console.error('[inventaire/recherche] fournisseurs:', error.message); return NextResponse.json({ error: 'Lecture des fournisseurs impossible.' }, { status: 500 }) }
    const fournisseurs = (data ?? []) as unknown as Fournisseur[]
    if (!fournisseurs.length) return NextResponse.json({ error: 'Cochez au moins un fournisseur — ou ajoutez-en dans « Mes fournisseurs ».' }, { status: 400 })

    if (!(await consommerLimite(`recherche:${a.uid}`, LIMITE_PAR_HEURE, 3600))) {
      return NextResponse.json({ error: `Vous avez lancé ${LIMITE_PAR_HEURE} recherches dans l’heure — c’est la limite. Réessayez un peu plus tard.` }, { status: 429 })
    }

    const { model, tier, downgraded } = resolveModel(typeof b.tier === 'string' ? b.tier : undefined, a.plan)
    // Aucun fournisseur à prix publics → aucun appel, aucun crédit : on répond « non vus » tout de suite.
    const interrogeable = fournisseurs.some((f) => f.prix_publics && f.url)
    // Le crédit se décompte APRÈS la recherche, et seulement si le service a réellement été
    // appelé : un résultat servi par le cache mutualisé (0056) est instantané ET gratuit. C'est
    // délibéré — l'artisan qui cherche souvent remplit le cache, ce qui fait baisser le coût de
    // tous. Avant l'appel on se contente de vérifier que son solde permettrait de payer.
    const cout = COUT_RECHERCHE[tier] ?? COUT_RECHERCHE.standard
    if (interrogeable && !a.isFounder) {
      const { data: solde } = await supabaseAdmin.from('artisans').select('credits').eq('id', a.uid).maybeSingle()
      if (Number(solde?.credits ?? 0) < cout) {
        return NextResponse.json({ error: 'Crédits épuisés — renouvellement mensuel ou formule supérieure.', outOfCredits: true }, { status: 402 })
      }
    }

    const sortie = await rechercherChezFournisseurs({
      artisanId: a.uid, requete, quantite: Number.isFinite(quantite) && quantite > 0 ? Math.min(quantite, 100_000) : null,
      fournisseurs, tier, model,
    })
    // Payant seulement si le moteur a vraiment appelé le service, et seulement s'il a abouti :
    // une panne ne se facture pas.
    // Les plafonds quotidien et mensuel bornent une DÉPENSE : ils ne se consomment donc que
    // lorsqu'un appel payant a réellement eu lieu. Une réponse servie par le cache est gratuite
    // pour nous, elle ne doit rien entamer — sinon l'artisan serait puni de chercher souvent,
    // alors que c'est précisément ce qui remplit le cache.
    let creditsUtilises = 0
    if (sortie.appels > 0 && !sortie.panne) {
      void consommerLimite(`recherche-jour:${a.uid}`, LIMITE_PAR_JOUR, 86_400)
      void consommerLimite(`recherche-mois:${a.uid}`, LIMITE_PAR_MOIS, 30 * 86_400)
      const credit = await consumeCredit(a.uid, tier, a.isFounder, cout)
      if (credit.ok) creditsUtilises = a.isFounder ? 0 : cout
    }
    return NextResponse.json({
      ok: true, resultats: sortie.resultats, nonVus: sortie.nonVus, tier: sortie.tier, downgraded,
      duree_ms: sortie.duree_ms, requete, credits: creditsUtilises,
      depuisCache: sortie.depuisCache ?? [],
      ...(sortie.panne ? { panne: sortie.panne } : {}),
    })
  } catch (e) {
    console.error('[inventaire/recherche] POST:', e)
    return NextResponse.json({ error: 'L’assistant n’a pas pu terminer la recherche. Réessayez, ou avec moins de fournisseurs.' }, { status: 500 })
  }
}
