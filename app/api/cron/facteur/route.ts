// app/api/cron/facteur/route.ts — la moitié « envoi » du Facteur, sur Vercel (fiche 026-089).
//
// GET (toutes les 15 min, jour et nuit) : envoie par le Gmail de prospection et par Meta ce que la base a approuvé ; les
// formulaires approuvés restent au porteur de l'usine. GET ?passe=soir (18 h et 19 h UTC ; la passe ne se fait que s'il est
// 20 h à Paris) : palier, rejugement de la veille, notice. Cette route NE JUGE PLUS : le second juge n'a de modèle que sur
// l'usine (routes usine/facteur/travail et usine/facteur/avis) ; aucun `creerLecteur` ici, il rendrait `null`.
//
// Rien ne sort : la pause générale, la pause du Facteur. Aucun secret, texte de message, adresse ni jeton dans la console,
// le passage ou la réponse (des compteurs seulement).
import { NextResponse } from 'next/server'
import { pauseGenerale } from '@/lib/agents/pause'
import { ops_battement } from '@/lib/agents/bus'
import { enregistrerPassage } from '@/lib/alertes'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { recuperateurReseau } from '@/lib/agents/acquisition/lecteurSite'
import { executerFacteur } from '@/lib/agents/acquisition/facteur'
import type { MagasinFacteur } from '@/lib/agents/acquisition/facteur'
import { creerPorteurGmail } from '@/lib/agents/acquisition/porteurs/gmail'
import { boiteProspection } from '@/lib/agents/acquisition/boiteProspection'
import { creerEnvoiMeta } from '@/lib/agents/acquisition/envoiMeta'
import { mentionsHtml, noticeHtml } from '@/lib/confidentialite/prospection'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUDGET_MS = 45_000
const heureParis = (): number => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date()))

/** Le magasin de la base, plus les deux gestes de la passe du soir que 0111 porte (`acq_palier_evaluer`, `acq_notice_verifiee`). */
function magasinDuFacteur(): MagasinFacteur {
  return {
    ...magasinSupabase,
    async palierEvaluer() {
      const { error } = await supabaseAdmin.rpc('acq_palier_evaluer', {})
      if (error) throw new Error(`[facteur] acq_palier_evaluer : ${error.message}`)
    },
    async noticeVerifiee(le: string) {
      const { error } = await supabaseAdmin.rpc('acq_notice_verifiee', { p_le: le })
      if (error) throw new Error(`[facteur] acq_notice_verifiee : ${error.message}`)
    },
  }
}

async function lirePieceJointe(chemin: string): Promise<Uint8Array | null> {
  try {
    const { data, error } = await supabaseAdmin.storage.from('packs-pubs').download(chemin)
    if (error || !data) return null
    return new Uint8Array(await data.arrayBuffer())
  } catch { return null }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let demandee: string | null = null
  try { demandee = new URL(req.url).searchParams.get('passe') } catch { demandee = null }
  if (demandee !== null && demandee !== 'envoi' && demandee !== 'soir') return NextResponse.json({ error: 'passe inconnue' }, { status: 400 })
  const passe: 'envoi' | 'soir' = demandee === 'soir' ? 'soir' : 'envoi'
  const nom = passe === 'soir' ? 'acq-facteur-soir' : 'acq-facteur'

  // Quand on ne sait pas si la pause est levée, rien ne sort.
  const pause = await pauseGenerale()
  if (!pause || pause.active) return NextResponse.json({ pause: true })
  try {
    if (await magasinSupabase.enPause('facteur')) return NextResponse.json({ pause: true })
    // La passe du soir n'a lieu qu'à 20 h de Paris : la planification tire à 18 h et à 19 h UTC, l'heure d'été ou d'hiver.
    if (passe === 'soir' && heureParis() !== 20) return NextResponse.json({ hors_heure: true })

    // La boîte dédiée, sinon le mode « fil seul » de la boîte de l'entreprise (boiteProspection.ts, décision du 07/10) :
    // envoi depuis la boîte, Reply-To = l'adresse « plus » du fil, seule adresse relevée.
    const boite = boiteProspection()
    const gmail = boite ? creerPorteurGmail({ user: boite.user, pass: boite.pass, adresse: boite.expediteur, repondreA: boite.repondreA, lirePieceJointe }) : null
    const jeton = (process.env.META_PAGE_TOKEN ?? '').trim()
    const compte = (process.env.META_IG_ID ?? '').trim()
    const magasin = magasinDuFacteur()
    const meta = jeton && compte ? creerEnvoiMeta({ jeton, idCompte: compte, fetch, magasin }) : null
    const horloge = { maintenant: Date.now, attendre: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)) }

    const bilan = await executerFacteur({
      magasin, gmail, meta, horloge, echeance: Date.now() + BUDGET_MS, passe, adresseReponse: boite?.adresse || null,
      notice: { html: noticeHtml(), mentions: mentionsHtml() }, recuperer: recuperateurReseau,
    })

    // Passages réussis : en_attente_gmail, en_attente_meta et envoi_froid_ferme n'en sont pas des échecs.
    await enregistrerPassage(nom, { passe, gmail: bilan.gmail, meta: bilan.meta, envoyes: bilan.envoyes, echecs: bilan.echecs }, true)
    // Le battement suit un passage réussi seulement ; J3 (le Garde) tourne dans la moitié Vercel du Facteur : son battement aussi.
    try { await ops_battement({ p_nom: 'facteur' }) } catch { console.error('[cron/facteur] battement indisponible') }
    try { await ops_battement({ p_nom: 'garde' }) } catch { console.error('[cron/facteur] battement du garde indisponible') }
    return NextResponse.json({ ok: true, passe, gmail: bilan.gmail, meta: bilan.meta, envoyes: bilan.envoyes, annules: bilan.annules, echecs: bilan.echecs, retenus: bilan.retenus, formulaires: bilan.formulaires, ...(bilan.soir ? { soir: bilan.soir } : {}) })
  } catch (e) {
    await enregistrerPassage(nom, { erreur: (e instanceof Error ? e.message : String(e)).slice(0, 160) }, false)
    return NextResponse.json({ error: 'échec' }, { status: 500 })
  }
}
