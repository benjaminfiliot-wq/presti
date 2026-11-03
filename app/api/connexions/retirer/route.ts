// POST /api/connexions/retirer (tâche 036-009). 404 tant que le drapeau `connexions` est baissé (lib/flags.ts) :
// la garde est la première ligne de retirer() (lib/connexions/routes.ts). Tout le reste y vit, prouvé par scripts/connexions-qa.mjs.
import { retirer } from '@/lib/connexions/routes'
import { dependancesReelles } from '@/lib/connexions/serveur'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request): Promise<Response> { return retirer(req, dependancesReelles()) }
export async function GET(req: Request): Promise<Response> { return retirer(req, dependancesReelles()) }
