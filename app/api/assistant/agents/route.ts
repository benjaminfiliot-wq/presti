import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { gardeAssistant } from '@/lib/assistant/garde'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { consommerLimite } from '@/lib/limites'
import { COLONNES_CARTE, DECISIONS, estDecision, versCarteAgent, type CarteAgent, type LigneCarteAgent } from '@/lib/agents/n8n/cartes'

export const runtime = 'nodejs'

// La boîte « À valider » des agents n8n (tâche 036-030) : les cartes que les départements préparent (assistant_actions, origine « agent »,
// migration 0194), lues et décidées par l'artisan dans l'outil de gestion (app/crm/BoiteAgents.tsx).
//
// GET                         → { cartes } : les 50 dernières cartes d'agents du compte de la session (jamais d'un autre compte).
// POST { id, decision }       → valider (en_attente → en_cours) ou refuser (en_attente → refusee), UNE fois (réclamation atomique).
//
// CETTE ROUTE N'ENVOIE RIEN, sur aucune offre : ni e-mail, ni SMS, ni appel de réalisateur. Elle note la décision ; n8n exécutera une carte
// validée quand le palier « réel » sera branché (lib-executer), jamais l'app (règle n8n-first). Studio : rien ne part sans ce clic ; et ce
// clic lui-même ne fait rien partir aujourd'hui.
// Contrôles : drapeau boiteAgents (404 baissé), garde de l'assistant (session, suspension, offre : lib/assistant/garde.ts), débit.
// Multi-tenant : chaque lecture et chaque écriture est filtrée par artisan_id = la session (la clé de service passe outre la RLS).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LIMITE = { max: 120, fenetreSec: 10 * 60 }
const SANS_CACHE = { 'Cache-Control': 'no-store' }

export async function GET(req: Request) {
  if (!actif('boiteAgents')) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  const g = await gardeAssistant(req)
  if ('reponse' in g) return g.reponse
  const { data, error } = await supabaseAdmin
    .from('assistant_actions')
    .select(COLONNES_CARTE)
    .eq('artisan_id', g.uid)
    .eq('origine', 'agent')
    .order('cree_le', { ascending: false })
    .limit(50)
  // Colonnes de 0194 absentes, ou base indisponible : on le dit, jamais une boîte vide qui ferait croire qu'il n'y a rien.
  if (error) return NextResponse.json({ error: 'La boîte des agents est indisponible pour le moment.', code: 'indisponible' }, { status: 503, headers: SANS_CACHE })
  const maintenant = Date.now()
  const cartes = ((data ?? []) as unknown as LigneCarteAgent[])
    .filter((l) => l.artisan_id === g.uid)
    .map((l) => versCarteAgent(l, maintenant))
    .filter((c): c is CarteAgent => c !== null)
  return NextResponse.json({ cartes }, { headers: SANS_CACHE })
}

export async function POST(req: Request) {
  if (!actif('boiteAgents')) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  const g = await gardeAssistant(req)
  if ('reponse' in g) return g.reponse
  const b = await req.json().catch(() => null)
  const id = typeof b?.id === 'string' ? b.id.trim().toLowerCase() : ''
  const decision: unknown = b?.decision
  if (!UUID.test(id) || !estDecision(decision)) return NextResponse.json({ error: 'Demande invalide.' }, { status: 400 })
  if (!(await consommerLimite(`agents-decisions:${g.uid}`, LIMITE.max, LIMITE.fenetreSec))) {
    return NextResponse.json({ error: 'Beaucoup de clics en peu de temps : reprenez dans quelques minutes.', code: 'debit' }, { status: 429 })
  }

  // La réclamation atomique : une seule requête qui ne touche QUE une carte d'agent de ce compte, encore à valider et pas échue.
  // Un double clic ou deux onglets : le second ne trouve plus de ligne « en_attente ».
  const maintenant = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('assistant_actions')
    .update({ statut: DECISIONS[decision], maj_le: maintenant })
    .eq('id', id)
    .eq('artisan_id', g.uid)
    .eq('origine', 'agent')
    .eq('statut', 'en_attente')
    .gt('expire_le', maintenant)
    .select(COLONNES_CARTE)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'La boîte des agents est indisponible pour le moment.', code: 'indisponible' }, { status: 503 })
  if (data) {
    const carte = versCarteAgent(data as unknown as LigneCarteAgent)
    return NextResponse.json({ ok: true, carte }, { headers: SANS_CACHE })
  }

  // Rien n'a bougé : on dit pourquoi, en relisant la carte AVEC le compte de la session (celle d'un autre compte est « introuvable »).
  const { data: fiche } = await supabaseAdmin
    .from('assistant_actions')
    .select(COLONNES_CARTE)
    .eq('id', id)
    .eq('artisan_id', g.uid)
    .eq('origine', 'agent')
    .maybeSingle()
  if (!fiche) return NextResponse.json({ ok: false, code: 'introuvable', error: 'Carte introuvable.' }, { status: 404 })
  const carte = versCarteAgent(fiche as unknown as LigneCarteAgent)
  const echue = carte?.statut === 'expiree'
  return NextResponse.json(
    { ok: false, code: echue ? 'expiree' : 'deja_traitee', error: echue ? 'Cette carte a expiré.' : 'Cette carte a déjà été traitée.', carte },
    { status: echue ? 410 : 409 },
  )
}
