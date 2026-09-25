import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { MEDIA_BUCKET } from '@/lib/media'
import { authArtisan as verifierSession, estEchec } from '@/lib/authArtisan'
import { actif } from '@/lib/flags'

// Données & suppressions granulaires (v4 §C3). Principe : CHAQUE brique se réinitialise ou
// se supprime indépendamment, sans jamais toucher au compte Presti.
// Deux garde-fous non négociables :
//  1) tout est précédé d'un RÉCAPITULATIF (GET) de ce qui va disparaître ;
//  2) les documents à valeur légale (devis ENVOYÉS, factures ÉMISES) ne sont JAMAIS supprimés —
//     ils sont conservés (obligation de conservation) et l'interface l'explique.

export const runtime = 'nodejs'
export const maxDuration = 30

type Action = 'site_reinitialiser' | 'site_supprimer' | 'plateforme_supprimer' | 'conversation_supprimer'
const ACTIONS: Action[] = ['site_reinitialiser', 'site_supprimer', 'plateforme_supprimer', 'conversation_supprimer']

async function auth(req: Request) {
  // Contrôle central : il refuse aussi les jetons émis AVANT une déconnexion globale
  // (v4 §11), ce que `getUser` seul ne fait pas.
  const s = await verifierSession(req)
  if (estEchec(s)) return { error: s.error, status: s.status }
  return { uid: s.uid }
}

const compte = async (table: string, filtre: Record<string, string>) => {
  let q = supabaseAdmin.from(table).select('id', { count: 'exact', head: true })
  for (const [k, v] of Object.entries(filtre)) q = q.eq(k, v)
  const { count } = await q
  return count ?? 0
}

/** Fichiers de l'artisan dans le bucket média (un dossier par artisan). */
async function fichiersArtisan(uid: string): Promise<string[]> {
  const { data } = await supabaseAdmin.storage.from(MEDIA_BUCKET).list(uid, { limit: 1000 })
  return (data ?? []).map((f) => `${uid}/${f.name}`)
}

// ── GET : récapitulatif de ce qui va disparaître (jamais d'action ici).
export async function GET(req: Request) {
  const a = await auth(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const uid = a.uid
  const action = new URL(req.url).searchParams.get('action') as Action | null
  const leadId = new URL(req.url).searchParams.get('lead_id') || ''
  if (!action || !ACTIONS.includes(action)) return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  if (action === 'site_reinitialiser' && !actif('constructeurSite')) return NextResponse.json({ error: 'Action indisponible' }, { status: 404 })

  const { data: art } = await supabaseAdmin.from('artisans')
    .select('site_contenu, site_layout, realisations, avant_apres, site_active, plateforme_active').eq('id', uid).maybeSingle()

  if (action === 'site_reinitialiser' || action === 'site_supprimer') {
    const fichiers = action === 'site_supprimer' ? (await fichiersArtisan(uid)).length : 0
    return NextResponse.json({
      ok: true,
      disparait: [
        art?.site_contenu ? 'Les textes rédigés de votre site' : null,
        art?.site_layout ? 'La composition de vos sections' : null,
        action === 'site_supprimer' && Array.isArray(art?.realisations) && art.realisations.length ? `${art.realisations.length} réalisation(s)` : null,
        action === 'site_supprimer' && Array.isArray(art?.avant_apres) && art.avant_apres.length ? `${art.avant_apres.length} paire(s) avant/après` : null,
        action === 'site_supprimer' && fichiers ? `${fichiers} fichier(s) image` : null,
      ].filter(Boolean),
      conserve: ['Votre compte Presti', 'Vos conversations', 'Vos devis et factures', action === 'site_reinitialiser' ? 'Vos images' : null].filter(Boolean),
    })
  }

  if (action === 'plateforme_supprimer') {
    const convs = await compte('leads', { artisan_id: uid })
    return NextResponse.json({
      ok: true,
      disparait: ['Les réglages de votre assistant (Intelligence)', 'Le lien de conversation cesse de répondre'],
      conserve: [`Vos ${convs} conversation(s) — conservées comme preuve`, 'Vos devis et factures', 'Votre compte Presti'],
    })
  }

  // conversation_supprimer
  if (!leadId) return NextResponse.json({ error: 'Conversation manquante' }, { status: 400 })
  const { data: lead } = await supabaseAdmin.from('leads').select('id, artisan_id, photos').eq('id', leadId).maybeSingle()
  if (!lead || lead.artisan_id !== uid) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
  const nbMsg = await compte('messages', { lead_id: leadId })
  const { data: devisLies } = await supabaseAdmin.from('devis').select('id, statut').eq('lead_id', leadId)
  const aValeurLegale = (devisLies ?? []).filter((d) => d.statut !== 'brouillon')
  return NextResponse.json({
    ok: true,
    disparait: [
      'Le nom et les coordonnées du client',
      `${nbMsg} message(s)`,
      Array.isArray(lead.photos) && lead.photos.length ? `${lead.photos.length} photo(s) de chantier` : null,
    ].filter(Boolean),
    conserve: aValeurLegale.length
      ? [`${aValeurLegale.length} devis déjà envoyé(s) — la loi impose de les conserver (ils sont archivés, pas supprimables)`]
      : ['Rien d’autre'],
  })
}

// ── POST : exécution. Confirmation par saisie obligatoire pour tout ce qui est définitif.
export async function POST(req: Request) {
  try {
    const a = await auth(req)
    if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
    const uid = a.uid
    const body = await req.json().catch(() => null)
    const action = body?.action as Action
    if (!action || !ACTIONS.includes(action)) return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    if (action === 'site_reinitialiser' && !actif('constructeurSite')) return NextResponse.json({ error: 'Action indisponible' }, { status: 404 })
    if (action !== 'site_reinitialiser' && String(body?.confirm || '').trim().toUpperCase() !== 'SUPPRIMER') {
      return NextResponse.json({ error: 'Confirmation manquante.' }, { status: 400 })
    }

    if (action === 'site_reinitialiser') {
      await supabaseAdmin.from('artisans').update({ site_contenu: null, site_layout: null, theme: 'atelier' }).eq('id', uid)
      return NextResponse.json({ ok: true, message: 'Site réinitialisé — vos images et votre compte sont intacts.' })
    }

    if (action === 'site_supprimer') {
      const fichiers = await fichiersArtisan(uid)
      if (fichiers.length) await supabaseAdmin.storage.from(MEDIA_BUCKET).remove(fichiers).catch(() => {})
      await supabaseAdmin.from('artisans').update({
        site_active: false, site_contenu: null, site_layout: null,
        realisations: [], avant_apres: [], logo_url: null, photo_url: null,
      }).eq('id', uid)
      return NextResponse.json({ ok: true, message: 'Site supprimé. Votre compte, vos conversations et vos documents sont conservés.' })
    }

    if (action === 'plateforme_supprimer') {
      await supabaseAdmin.from('plateforme_config').delete().eq('artisan_id', uid)
      await supabaseAdmin.from('artisans').update({ plateforme_active: false }).eq('id', uid)
      return NextResponse.json({ ok: true, message: 'Plateforme supprimée. Vos conversations restent consultables (elles font preuve).' })
    }

    // ── Droit à l'effacement sur UNE conversation : on anonymise, on ne casse pas la
    //    chaîne comptable (un devis envoyé reste, rattaché à un client anonymisé).
    const leadId = typeof body?.lead_id === 'string' ? body.lead_id : ''
    if (!leadId) return NextResponse.json({ error: 'Conversation manquante' }, { status: 400 })
    const { data: lead } = await supabaseAdmin.from('leads').select('id, artisan_id, photos').eq('id', leadId).maybeSingle()
    if (!lead || lead.artisan_id !== uid) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })

    // Photos du chantier : suppression réelle des fichiers.
    if (Array.isArray(lead.photos) && lead.photos.length) {
      const chemins = lead.photos
        .map((u: string) => { const m = String(u).match(/\/lead-media\/(.+)$/); return m ? m[1] : null })
        .filter(Boolean) as string[]
      if (chemins.length) await supabaseAdmin.storage.from('lead-media').remove(chemins).catch(() => {})
    }
    await supabaseAdmin.from('messages')
      .update({ contenu: '(message supprimé à la demande du client)' }).eq('lead_id', leadId)
    await supabaseAdmin.from('leads').update({
      nom_prospect: '(client supprimé)', contact: null, message: null, ip: null, photos: null,
      urgence: null, type_chantier: null, updated_at: new Date().toISOString(),
    }).eq('id', leadId)

    return NextResponse.json({ ok: true, message: 'Conversation anonymisée. Les documents déjà émis restent archivés, comme la loi l’exige.' })
  } catch (e) {
    console.error('[donnees] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
