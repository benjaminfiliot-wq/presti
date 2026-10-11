// 026-143 — l'action du formulaire d'essai du porteur (026-095). Chemin hors `/api/` à dessein : `app/robots.ts` interdit
// `/api/`, et le porteur abandonnerait en `robots_txt` (PF-4), à raison.
//
// Ce que la route garde du message reçu : SON EMPREINTE SHA-256, dans UN événement du journal du bus
// (`ops_evenement_ajouter('systeme', 'essai_formulaire_recu', …)`) ; aucun autre champ n'est gardé ni écrit en journal.
// Au plus 20 événements par jour, au-delà 429 sans rien écrire. Baissé (`essaiFormulaire`), 404 avant tout.
import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { ops_evenement_ajouter } from '@/lib/agents/bus'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLAFOND_PAR_JOUR = 20
const TYPE = 'essai_formulaire_recu'

/** Repli quand la base ne se laisse pas compter : un compteur par instance (jamais plus de 20 par jour et par instance). */
let jourMemoire = ''
let nombreMemoire = 0

const page = (corps: string, status: number) =>
  new NextResponse(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Contact</title></head><body><main><p>${corps}</p></main></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  )

/** Le nombre d'événements d'essai écrits depuis minuit UTC ; null si la base ne le dit pas. */
async function compterDuJour(): Promise<number | null> {
  try {
    const depuis = new Date()
    depuis.setUTCHours(0, 0, 0, 0)
    const { count, error } = await supabaseAdmin
      .schema('ops' as never)
      .from('evenements')
      .select('id', { count: 'exact', head: true })
      .eq('type', TYPE)
      .gte('le', depuis.toISOString())
    if (error || typeof count !== 'number') return null
    return count
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  if (!actif('essaiFormulaire')) return new NextResponse('Not found', { status: 404 })

  let message = ''
  try {
    const form = await req.formData()
    const brut = form.get('message')
    message = typeof brut === 'string' ? brut : ''
  } catch {
    return page('Message manquant.', 400)
  }
  if (message.length === 0 || message.length > 2000) return page('Message manquant.', 400)

  const aujourdhui = new Date().toISOString().slice(0, 10)
  if (jourMemoire !== aujourdhui) {
    jourMemoire = aujourdhui
    nombreMemoire = 0
  }
  const compte = await compterDuJour()
  if ((compte ?? 0) >= PLAFOND_PAR_JOUR || nombreMemoire >= PLAFOND_PAR_JOUR) {
    return page('Trop de messages aujourd’hui, réessayez demain.', 429)
  }

  const empreinte = createHash('sha256').update(message, 'utf8').digest('hex')
  const r = await ops_evenement_ajouter({ p_agent: 'systeme', p_type: TYPE, p_objet: null, p_resume: `empreinte ${empreinte}` })
  if (!r.ok) return page('Service momentanément indisponible.', 503)
  nombreMemoire += 1

  return page('Merci, votre message a bien été envoyé.', 200)
}
