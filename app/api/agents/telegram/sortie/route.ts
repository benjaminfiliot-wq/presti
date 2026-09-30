// GET /api/agents/telegram/sortie — ce que le pont Telegram doit dire au téléphone de Benj (fiche 026-195).
// Derrière le drapeau busAgents (404 avant toute identité) et le jeton de l'agent pont_telegram seul.
// Lit les alertes des motifs poussés (id, motif et date seulement : jamais le détail d'une alerte) et les comptes
// rendus du Chef ; rend au plus 20 messages { id, texte } et les deux curseurs à renvoyer à la relève suivante.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { MOTIFS_POUSSES } from '@/lib/pilotage/notifications'
import { EVENEMENTS_SORTANTS, MAX_MESSAGES, messageAlerte, messageEvenement } from '@/lib/agents/telegram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AGENT = 'pont_telegram'
const DELAI_MS = 8_000
const SANS_CACHE = { 'cache-control': 'no-store' }
const erreur = (status: number, code: string) => NextResponse.json({ error: code, code }, { status, headers: SANS_CACHE })

type LigneAlerte = { id: string; motif: string; cree_le: string }
type LigneEvenement = { id: number; type: string; resume: string | null }

/** Le curseur d'alerte est « <cree_le>|<id> » : l'ordre est celui de la date, l'id départage deux alertes du même instant. */
function lireCurseurAlerte(brut: string | null): { cree_le: string; id: string } | null | 'invalide' {
  if (brut === null || brut === '') return null
  const i = brut.indexOf('|')
  if (i < 0) return 'invalide'
  const cree_le = brut.slice(0, i), id = brut.slice(i + 1)
  if (!/^\d{4}-\d{2}-\d{2}T[0-9:.]+(Z|[+-]\d{2}:\d{2})$/.test(cree_le) || !Number.isFinite(Date.parse(cree_le)) || !/^[0-9a-f-]{8,40}$/i.test(id)) return 'invalide'
  return { cree_le, id }
}

export async function GET(req: Request) {
  if (!actif('busAgents')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return reponseRefusAgent(agent)
  if (agent.nom !== AGENT) return erreur(403, 'agent')

  const url = new URL(req.url)
  const brutA = url.searchParams.get('apres_alerte'), brutE = url.searchParams.get('apres_evenement')
  const curseurA = lireCurseurAlerte(brutA)
  if (curseurA === 'invalide' || (brutE !== null && brutE !== '' && !/^\d{1,15}$/.test(brutE))) return erreur(400, 'parametres_invalides')
  const curseurE = brutE === null || brutE === '' ? null : Number(brutE)

  // 1. les alertes des motifs poussés, après le curseur
  let requete = supabaseAdmin.from('alertes').select('id, motif, cree_le').in('motif', [...MOTIFS_POUSSES])
  if (curseurA) requete = requete.or(`cree_le.gt.${curseurA.cree_le},and(cree_le.eq.${curseurA.cree_le},id.gt.${curseurA.id})`)
  const lues = await requete.order('cree_le', { ascending: true }).order('id', { ascending: true }).limit(MAX_MESSAGES).abortSignal(AbortSignal.timeout(DELAI_MS))
  if (lues.error) { console.error('[telegram/sortie] alertes :', lues.error.code ?? 'erreur'); return erreur(503, 'base_indisponible') }

  const messages: { id: string; texte: string }[] = []
  let apresAlerte: string | null = brutA ? brutA : null
  for (const l of (lues.data ?? []) as LigneAlerte[]) {
    const m = messageAlerte(l.motif)
    if (!m) continue
    messages.push({ id: `a-${l.id}`, texte: m.texte })
    apresAlerte = `${l.cree_le}|${l.id}`
  }

  // 2. les comptes rendus du Chef, après le curseur, dans la place qui reste
  let apresEvenement: number | null = curseurE
  const place = MAX_MESSAGES - messages.length
  if (place > 0) {
    const ev = await supabaseAdmin.rpc('pilotage_evenements', { p_apres: curseurE ?? 0, p_limite: place, p_agent: 'chef', p_types: Object.keys(EVENEMENTS_SORTANTS) }).abortSignal(AbortSignal.timeout(DELAI_MS))
    if (ev.error) { console.error('[telegram/sortie] événements :', ev.error.code ?? 'erreur'); return erreur(503, 'base_indisponible') }
    for (const e of ((ev.data ?? []) as LigneEvenement[]).slice(0, place)) {
      const m = messageEvenement(e)
      if (!m) continue
      messages.push({ id: `e-${e.id}`, texte: m.texte })
      apresEvenement = Number(e.id)
    }
  }

  return NextResponse.json({ messages, apres_alerte: apresAlerte, apres_evenement: apresEvenement }, { headers: SANS_CACHE })
}
