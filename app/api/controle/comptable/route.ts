// 026-243 — la lecture du Comptable : rapprochement Stripe, seuil de franchise daté, montants PRÉPARÉS (jamais déposés).
//
// GET seul. Deux entrées, une seule porte :
//   · l'agent `tresorier` (jeton `pa_tresorier_…`, lib/agents/garde.ts) — c'est le passage quotidien de pg_cron : un passage
//     réussi bat (`ops_battement('tresorier')`), un échec ne bat jamais, et la pause générale non plus ;
//   · une session de Benj au Poste (fondateur, domaine `comptabilite`), comme les autres routes /api/controle/*.
// `actif('busAgents')` faux : 404. La réponse ne porte JAMAIS un numéro de carte, une clé ni un identifiant Stripe entier
// (seuls les quatre derniers signes d'une référence), et la TVA préparée reste à 0.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { FORMAT_JETON } from '@/lib/agents/jetons'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { ops_battement } from '@/lib/agents/bus'
import { pauseGenerale } from '@/lib/agents/pause'
import { AGENT, ErreurComptable, periodeCourante, preparerDeclaration, preparerDonnees, rapprocher, seuilDeLaBase, seuilFranchise } from '@/lib/direction/comptable'
import type { Ecart, Recette } from '@/lib/direction/comptable'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PERIODE = /^\d{4}-(0[1-9]|1[0-2])$/
const SANS_CACHE = { 'cache-control': 'no-store' }
const reponse = (corps: unknown, status = 200) => NextResponse.json(corps, { status, headers: SANS_CACHE })

/** `…a1b2` : de quoi se repérer, pas de quoi retrouver l'objet chez Stripe. */
const masquer = (id: string) => `…${id.slice(-4)}`
const montrer = (r: Recette) => ({ ref: masquer(r.id), montant: r.montant, date: r.date })
const montrerEcart = (r: Ecart) => ({ ref: masquer(r.id), montant: r.montant, attendu: r.attendu, date: r.date })

type Acteur = { agent: boolean }

/** L'agent `tresorier` par son jeton, ou le fondateur par sa session : le format de l'en-tête dit laquelle des deux gardes. */
async function garde(req: Request): Promise<Acteur | NextResponse> {
  const entete = (req.headers.get('authorization') ?? '').trim()
  const m = /^Bearer +(\S+)$/i.exec(entete)
  if (!m || FORMAT_JETON.test(m[1])) {
    const agent = await authAgent(req)
    if (estRefusAgent(agent)) return reponseRefusAgent(agent)
    if (agent.nom !== AGENT) return reponse({ error: 'Réservé au Trésorier.', code: 'agent' }, 403)
    return { agent: true }
  }
  if (!actif('comptabilite')) return reponse({ error: 'Introuvable.' }, 404)
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'comptabilite', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  return { agent: false }
}

export async function GET(req: Request) {
  if (!actif('busAgents')) return reponse({ error: 'Introuvable.' }, 404)
  const acteur = await garde(req)
  if (acteur instanceof NextResponse) return acteur

  const demandee = new URL(req.url).searchParams.get('periode')
  if (demandee !== null && !PERIODE.test(demandee)) return reponse({ error: 'Période attendue : AAAA-MM.', code: 'periode' }, 400)
  const periode = demandee ?? periodeCourante()

  try {
    const pause = await pauseGenerale()
    // Lus UNE fois : le rapprochement, le seuil et la déclaration partent des mêmes données.
    const donnees = await preparerDonnees(periode)
    const seuilLu = await seuilDeLaBase().then(s => s, () => undefined)
    const deps = seuilLu ? { ...donnees, seuil: seuilLu } : donnees
    const rapprochement = await rapprocher(periode, deps)
    const seuil = await seuilFranchise(periode, deps).then(s => s, () => ({ periode, erreur: 'seuil_non_date' }))
    const montants = await preparerDeclaration(periode, deps)

    // Un passage réussi bat ; ni un échec (on n'arrive pas ici) ni la pause générale ne battent.
    if (acteur.agent && !pause.active) {
      try { await ops_battement({ p_nom: AGENT }) } catch { /* le veilleur constatera le silence */ }
    }
    return reponse({
      rapprochement: {
        periode,
        recettes: rapprochement.recettes.map(montrer),
        orphelins: rapprochement.orphelins.map(montrer),
        ecarts: rapprochement.ecarts.map(montrerEcart),
      },
      seuil,
      montants_prepares: montants,
      a: new Date().toISOString(),
    })
  } catch (e) {
    // Jamais le message d'une erreur Stripe ou Postgres : il peut citer une clé ou un nom de table.
    const code = e instanceof ErreurComptable ? e.code : 'erreur'
    console.error('[comptable]', code)
    return reponse({ error: 'Lecture du Comptable indisponible.', code }, code === 'periode' ? 400 : 503)
  }
}
