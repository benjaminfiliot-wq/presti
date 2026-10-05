// 026-092 — adapté de la référence contractuelle 026-067, sans import de fixture à l'exécution.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { stationHorsWebPourRequete } from '@/lib/stationHorsWeb'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { peutFaire } from '@/lib/controle/droits'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ventesSites } from '@/lib/direction/tresorerie'
import { mrr } from '@/lib/direction/stripe'
import * as lectures from '@/lib/controle/lectures'
import { VUES, CLES_SALLE, lireVue, trier, objetDe, type Vue, type Base } from '@/lib/pilotage/station'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const NOM = /^[a-z0-9_]{2,40}$/

export async function GET(req: Request) {
  if (!actif('pilotage')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  if (stationHorsWebPourRequete(req)) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const d = exigerDomaine(f, 'sante', 'voir')
  if (domaineRefuse(d)) return reponseRefus(d)
  const u = new URL(req.url)
  const vue = u.searchParams.get('vue') ?? ''
  if (!(VUES as readonly string[]).includes(vue)) return NextResponse.json({ error: 'Vue inconnue.' }, { status: 400 })
  const salle = u.searchParams.get('salle')
  if (vue === 'salle' && (!salle || !CLES_SALLE.includes(salle))) return NextResponse.json({ error: 'Salle inconnue.' }, { status: 400 })
  const nom = u.searchParams.get('nom'), agent = u.searchParams.get('agent')
  if ((nom !== null && !NOM.test(nom)) || (agent !== null && !NOM.test(agent)) || (vue === 'agent' && nom === null)) return NextResponse.json({ error: 'Nom d’agent invalide.' }, { status: 400 })
  const brut = u.searchParams.get('apres')
  const apres = brut && /^[1-9]\d{0,14}$/.test(brut) ? Number(brut) : null
  // La santé du service se mesure par la même sonde que la barre du Poste : elle a besoin de l'origine et du jeton de la requête.
  const origine = u.origin, jeton = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null
  const r = await lireVue(vue as Vue, { apres, agent, salle, nom }, {
    db: supabaseAdmin as unknown as Base, ventesSites, version: process.env.VERCEL_GIT_COMMIT_SHA ?? null, mrr,
    lectures: { santeService: () => lectures.santeService(origine, jeton), cronsDuService: lectures.cronsDuService, audience: lectures.audience, bans: lectures.bans, clients: () => lectures.clients(), cerveaux: lectures.cerveaux, ticketsOuverts: lectures.ticketsOuverts },
  })
  return NextResponse.json({ vue, role: f.role, ...trier(r, (dom) => peutFaire(f.roleInterne, dom, 'voir').permis, objetDe(vue, salle)) })
}


