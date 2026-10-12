// app/api/canaux/meta/liaison/route.ts — relier le numéro WhatsApp Business, la Page Facebook ou le compte Instagram de
// l'artisan à Presti (Messages → Canaux). Voie « manuelle » : l'artisan (ou nous, en l'accompagnant) colle l'identifiant du compte
// et un jeton d'accès. Le flux « Embedded Signup » / « Facebook Login for Business » remplacera la saisie quand l'application
// Meta de Presti aura passé l'App Review (voir le rapport du chantier) ; la vérification et l'enregistrement restent ceux-ci.
//
// Règles tenues, comme pour la boîte e-mail (app/api/canaux) :
//   • le jeton est CHIFFRÉ (AES-256-GCM, CANAUX_KEY) avant d'entrer en base, et jamais renvoyé ;
//   • on VÉRIFIE auprès de Meta que le jeton donne accès au compte déclaré avant d'enregistrer — sans quoi un artisan pourrait
//     déclarer la Page d'un autre et recevoir ses messages ;
//   • on abonne l'application aux webhooks du compte (subscribed_apps) : sans cela Meta n'envoie rien ;
//   • un compte Meta n'est relié qu'à UN artisan (index unique de 0139).
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chiffrementDisponible, chiffrer } from '@/lib/secretBox'
import { authArtisan as verifierSession, estEchec } from '@/lib/authArtisan'
import { messageVerrou } from '@/lib/plans'
import {
  HOTES_META, estCanalMeta, lireJetonLong, lireJetonPage, lireVerificationLiaison, requeteAbonnement, requeteEchangeJetonLong,
  requeteJetonPage, requeteVerificationLiaison, versionGraph, type HoteMeta,
} from '@/lib/canaux/meta'
import { canalOuvert, capaciteCanal, formuleCanal, metaOuvert } from '@/lib/canaux/regles'
import { appelerGraph } from '@/lib/canaux/serveur'

export const runtime = 'nodejs'
export const maxDuration = 30

const RE_ID = /^[0-9]{5,30}$/

export async function GET(req: Request) {
  if (!metaOuvert()) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  const s = await verifierSession(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error }, { status: s.status })
  const { data } = await supabaseAdmin.from('canaux')
    .select('id, type, libelle, externe_id, meta_hote, actif, derniere_erreur, cree_le')
    .eq('artisan_id', s.uid).in('type', ['whatsapp', 'messenger', 'instagram']).order('cree_le', { ascending: true })
  const { data: a } = await supabaseAdmin.from('artisans').select('plan, is_founder').eq('id', s.uid).maybeSingle()
  const plan = a?.plan as string | null, fondateur = a?.is_founder as boolean | null
  return NextResponse.json({
    ok: true,
    liaisons: data ?? [],
    chiffrement: chiffrementDisponible(),
    // Ce que l'écran a besoin de savoir, rien de secret : l'ID de l'application est public (il figure dans toute page qui l'utilise).
    application: { id: process.env.META_CANAUX_APP_ID || null, prete: !!(process.env.META_CANAUX_APP_SECRET && process.env.META_CANAUX_VERIFY_TOKEN) },
    canaux: {
      whatsapp: { ouvert: canalOuvert('whatsapp'), formule: formuleCanal('whatsapp', plan, fondateur), verrou: messageVerrou(capaciteCanal('whatsapp')) },
      messenger: { ouvert: canalOuvert('messenger'), formule: formuleCanal('messenger', plan, fondateur), verrou: messageVerrou(capaciteCanal('messenger')) },
      instagram: { ouvert: canalOuvert('instagram'), formule: formuleCanal('instagram', plan, fondateur), verrou: messageVerrou(capaciteCanal('instagram')) },
    },
  })
}

export async function POST(req: Request) {
  try {
    if (!metaOuvert()) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    const s = await verifierSession(req)
    if (estEchec(s)) return NextResponse.json({ error: s.error }, { status: s.status })
    if (!chiffrementDisponible()) return NextResponse.json({ error: 'Stockage sécurisé indisponible côté serveur. Canal non enregistré.' }, { status: 503 })

    const b = await req.json().catch(() => null)
    const canal = b?.canal
    if (!estCanalMeta(canal) || !canalOuvert(canal)) return NextResponse.json({ error: 'Canal inconnu.' }, { status: 400 })
    const { data: a } = await supabaseAdmin.from('artisans').select('plan, is_founder').eq('id', s.uid).maybeSingle()
    if (!formuleCanal(canal, a?.plan as string | null, a?.is_founder as boolean | null)) return NextResponse.json({ error: messageVerrou(capaciteCanal(canal)) }, { status: 403 })

    const compte = String(b?.compte ?? '').trim()
    const jetonSaisi = String(b?.jeton ?? '').trim()
    const waba = String(b?.waba_id ?? '').trim()
    const hote: HoteMeta | null = canal === 'instagram' && (HOTES_META as readonly string[]).includes(b?.hote) ? b.hote as HoteMeta : canal === 'instagram' ? 'graph.facebook.com' : null
    if (!RE_ID.test(compte)) return NextResponse.json({ error: canal === 'whatsapp' ? 'L’identifiant du numéro (« Phone number ID ») est une suite de chiffres.' : 'L’identifiant de la Page (ou du compte) est une suite de chiffres.' }, { status: 400 })
    if (jetonSaisi.length < 20 || jetonSaisi.length > 1000 || /\s/.test(jetonSaisi)) return NextResponse.json({ error: 'Jeton d’accès illisible : collez-le en entier, sans espace.' }, { status: 400 })
    if (canal === 'whatsapp' && !RE_ID.test(waba)) return NextResponse.json({ error: 'L’identifiant du compte WhatsApp Business (« WhatsApp Business Account ID ») est requis.' }, { status: 400 })

    const v = versionGraph(process.env.META_GRAPH_VERSION)
    // Par une Page (Messenger, Instagram par la Page) : l'artisan colle le jeton UTILISATEUR obtenu en autorisant l'application ;
    // on en tire un jeton de PAGE qui n'expire pas. Si l'échange échoue, le jeton collé est essayé tel quel (déjà un jeton de Page).
    let jeton = jetonSaisi
    const parPage = canal === 'messenger' || (canal === 'instagram' && hote === 'graph.facebook.com')
    const appId = process.env.META_CANAUX_APP_ID || '', appSecret = process.env.META_CANAUX_APP_SECRET || ''
    if (parPage && appId && appSecret) {
      const echange = requeteEchangeJetonLong(jetonSaisi, appId, appSecret, v)
      const long = 'erreur' in echange ? null : lireJetonLong((await appelerGraph(echange)).corps)
      const page = long ? requeteJetonPage(compte, long, v) : null
      const jetonPage = page && !('erreur' in page) ? lireJetonPage(compte, (await appelerGraph(page)).corps) : null
      if (jetonPage) jeton = jetonPage
    }
    const verif = requeteVerificationLiaison({ canal, compte, jeton, hote }, v)
    if ('erreur' in verif) return NextResponse.json({ error: verif.erreur }, { status: 400 })
    const lu = await appelerGraph(verif)
    const liaison = lireVerificationLiaison(canal, compte, lu.corps, hote)
    if ('erreur' in liaison) return NextResponse.json({ error: liaison.erreur }, { status: 400 })

    // Déjà relié ailleurs ? On ne dit pas à qui.
    const { data: deja } = await supabaseAdmin.from('canaux').select('id, artisan_id').eq('type', canal).eq('externe_id', liaison.externe_id).maybeSingle()
    if (deja && deja.artisan_id !== s.uid) return NextResponse.json({ error: 'Ce compte est déjà relié à un autre espace Presti. Écrivez-nous si c’est le vôtre.' }, { status: 409 })

    const abo = requeteAbonnement({ canal, jeton, waba_id: waba || null, page_id: liaison.page_id, hote }, v)
    if ('erreur' in abo) return NextResponse.json({ error: abo.erreur }, { status: 400 })
    const abonne = await appelerGraph(abo)
    if (!abonne.ok) return NextResponse.json({ error: 'Le jeton est valide, mais Meta refuse d’abonner Presti aux messages de ce compte : il manque une permission (whatsapp_business_management, ou pages_manage_metadata pour une Page).' }, { status: 400 })

    const ligne = {
      artisan_id: s.uid, type: canal, libelle: liaison.libelle, adresse: liaison.libelle,
      externe_id: liaison.externe_id, meta_waba_id: canal === 'whatsapp' ? waba : null, meta_page_id: liaison.page_id, meta_hote: hote,
      secret: chiffrer(jeton), actif: true, derniere_erreur: null,
    }
    const { error } = deja
      ? await supabaseAdmin.from('canaux').update(ligne).eq('id', deja.id)
      : await supabaseAdmin.from('canaux').insert(ligne)
    if (error) {
      // Course perdue sur l'index unique : un autre espace vient de relier ce compte.
      if (/duplicate|unique/i.test(error.message)) return NextResponse.json({ error: 'Ce compte est déjà relié à un autre espace Presti.' }, { status: 409 })
      console.error('[canaux/meta/liaison] enregistrement en échec')
      return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, message: `${liaison.libelle} est relié : les messages de vos clients arriveront dans votre boîte de réception.` })
  } catch {
    console.error('[canaux/meta/liaison] POST en échec')
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
