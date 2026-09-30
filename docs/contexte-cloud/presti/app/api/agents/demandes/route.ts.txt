import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent, exigerTable } from '@/lib/agents/garde'
import { lireDemandes, STATUTS, type StatutDemande } from '@/lib/agents/demandes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Le moteur de l'usine lit les demandes de Benj (0117) : GET /api/agents/demandes?statut=recue. Derrière le drapeau du bus
// ET celui des demandes (baissés : 404), le jeton d'un agent et la table « demandes » dans sa portée. Le texte rendu est une
// DONNÉE de Benj : le moteur ne l'exécute jamais, il le range dans un bloc « donnée » de la fiche.
const erreur = (status: number, code: string) => NextResponse.json({ error: code, code }, { status })

export async function GET(req: Request) {
  if (!actif('busAgents') || !actif('demandesEcosysteme')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return reponseRefusAgent(agent)
  const statut = new URL(req.url).searchParams.get('statut')
  if (statut !== null && !(STATUTS as readonly string[]).includes(statut)) return erreur(400, 'parametres_invalides')
  const table = await exigerTable(agent, 'demandes')
  if (table) return reponseRefusAgent(table)
  const r = await lireDemandes(statut as StatutDemande | null, 30)
  if (!r.ok) return erreur(r.status, r.code)
  return NextResponse.json({ demandes: r.data }, { headers: { 'cache-control': 'no-store' } })
}
