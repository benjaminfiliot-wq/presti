import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getIp, isBanned } from '@/lib/security'
import { consommerLimite } from '@/lib/limites'
import { declencherRegles } from '@/lib/reglesServeur'

// Déclenchement DÉTERMINISTE des règles d'automatisation (v5 §9), appelé par le navigateur du
// client une fois la réponse de l'assistant terminée. Pourquoi une route à part : chiffrer
// dans le flux de la réponse dépassait les 60 s de Vercel en modèle Pro, et `after()` derrière
// une réponse en streaming ne s'exécute pas de façon fiable. Ici la règle a sa propre
// fonction, son propre budget de temps, et elle est idempotente (un seul devis par
// conversation, index unique) : l'appeler deux fois ne fait rien de plus.

export const runtime = 'nodejs'
export const maxDuration = 60

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  try {
    const ip = getIp(req)
    if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    const body = await req.json().catch(() => null)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    if (!TOKEN_RE.test(token)) return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })

    const { data: lead } = await supabaseAdmin.from('leads')
      .select('id, artisan_id, nom_prospect, contact, type_chantier, photos, prise_en_main').eq('token', token).maybeSingle()
    if (!lead) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    // Une conversation ne déclenche pas ses règles plus de 6 fois par heure (le chiffrage coûte).
    if (!(await consommerLimite(`regles:${lead.id}`, 6, 3600))) return NextResponse.json({ ok: true, fait: 'rien', pourquoi: 'plafond' })

    const { count } = await supabaseAdmin.from('messages').select('id', { count: 'exact', head: true }).eq('lead_id', lead.id).eq('sens', 'out').eq('type', 'reponse_auto').is('etat', null)
    const { data: artisan } = await supabaseAdmin.from('artisans').select('email, nom').eq('id', lead.artisan_id).maybeSingle()
    const r = await declencherRegles({ lead, nbReponsesIA: count ?? 0, artisanEmail: artisan?.email ?? null, artisanNom: artisan?.nom ?? null })
    return NextResponse.json({ ok: true, ...r })
  } catch (e) {
    console.error('[conversation/regles]', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
