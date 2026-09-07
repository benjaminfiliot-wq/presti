import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/controle/courriers/<fil> — un fil entier, du plus ancien au plus récent.
//
// C'est ici, et seulement ici, que le CORPS d'un message est rendu. La liste n'en montre que
// l'aperçu : ouvrir un fil est un geste délibéré, pas un effet de bord d'un affichage.
export async function GET(req: Request, ctx: { params: Promise<{ fil: string }> }) {
  if (!actif('messagerie')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'messagerie', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  const { fil } = await ctx.params
  const cle = decodeURIComponent(fil).slice(0, 400)

  const { data, error } = await supabaseAdmin.from('courriers')
    // C'est le seul écran où l'on peut montrer POURQUOI un message est rangé là, et proposer la
    // correction juste à côté : une erreur de classement doit se voir au lieu de se subir.
    .select('id, sens, correspondant_email, correspondant_nom, sujet, corps, recu_le, statut, assigne_a, artisan_id, message_id, nature, nature_source, nature_motif, nature_auto, repondre_a')
    .eq('fil', cle).order('recu_le', { ascending: true }).limit(100)
  if (error) return NextResponse.json({ error: 'Fil indisponible pour l’instant.' }, { status: 503 })
  if (!data?.length) return NextResponse.json({ error: 'Fil inconnu.' }, { status: 404 })
  // Un fil qui ne lui est pas assigné répond « inconnu », pas « interdit » : dire « interdit »
  // apprendrait au partenaire que ce fil existe (v11 §5).
  if (perimetre.borne && !data.some((c) => c.assigne_a === f.uid)) return NextResponse.json({ error: 'Fil inconnu.' }, { status: 404 })

  const artisanId = data.find((c) => c.artisan_id)?.artisan_id ?? null
  const artisan = artisanId
    ? (await supabaseAdmin.from('artisans').select('id, nom, metier').eq('id', artisanId).maybeSingle()).data
    : null

  return NextResponse.json({ fil: cle, messages: data, artisan, role: f.role, a: new Date().toISOString() })
}
