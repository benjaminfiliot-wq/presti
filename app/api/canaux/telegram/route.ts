// app/api/canaux/telegram/route.ts — relier, lister, déconnecter le BOT TELEGRAM de l'artisan (Messages → Canaux). 21/10/2026,
// drapeau canauxTelegram ; offre Studio (capacité canaux.whatsapp, lib/canaux/regles.ts).
//
// Règles tenues, comme pour la boîte e-mail (app/api/canaux) et les comptes Meta (app/api/canaux/meta/liaison) :
//   • le jeton du bot est VÉRIFIÉ auprès de Telegram (getMe) avant tout enregistrement, puis CHIFFRÉ (AES-256-GCM, CANAUX_KEY) ;
//     il n'est jamais renvoyé, jamais écrit dans un journal (il est dans le chemin des adresses de l'API Bot) ;
//   • un bot n'est relié qu'à UN espace (index unique (type, externe_id) de 0139 ; externe_id = l'identifiant du bot) ;
//   • le webhook est posé avec un secret DÉRIVÉ de la liaison (lib/canaux/telegram.ts) : sans lui, le chemin ne range rien ;
//   • l'uid vient de la session, jamais du corps ; chaque lecture et écriture porte artisan_id = uid (la clé de service passe la RLS).
// Drapeau baissé : 404, rien n'est lu. Sans CANAUX_KEY : 503 (on ne stocke jamais un jeton en clair).
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chiffrementDisponible, chiffrer, dechiffrer } from '@/lib/secretBox'
import { exigerCapacite } from '@/lib/accesOffreServeur'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { consommerLimite } from '@/lib/limites'
import { BASE_PRESTI } from '@/lib/urls'
import {
  estIdLiaison, jetonTelegramValide, lireGetMe, reponseOk, requeteDeleteWebhook, requeteGetMe, requeteSetWebhook, secretWebhookTelegram,
  urlWebhookTelegram, type RequeteTelegram,
} from '@/lib/canaux/telegram'

export const runtime = 'nodejs'
export const maxDuration = 30

const SUJET = 'Votre bot Telegram'
const introuvable = () => NextResponse.json({ error: 'Introuvable' }, { status: 404 })

/** Appelle l'API Bot (10 s au plus). Ne lève jamais ; l'adresse (qui porte le jeton) n'est jamais journalisée. */
async function appeler(req: RequeteTelegram): Promise<{ statut: number; corps: unknown }> {
  const arret = new AbortController()
  const minuteur = setTimeout(() => arret.abort(), 10_000)
  try {
    const r = await fetch(req.url, { ...req.init, signal: arret.signal, cache: 'no-store' })
    return { statut: r.status, corps: await r.json().catch(() => null) }
  } catch {
    return { statut: 0, corps: null }
  } finally {
    clearTimeout(minuteur)
  }
}

/** L'origine publique https de l'application (jamais un en-tête Host) : CANAUX_WEBHOOK_BASE si posée, sinon prestiapp.fr. */
const baseWebhook = () => process.env.CANAUX_WEBHOOK_BASE || BASE_PRESTI

export async function GET(req: Request) {
  if (!actif('canauxTelegram')) return introuvable()
  const g = await exigerCapacite(req, 'canaux.whatsapp', SUJET)
  if ('reponse' in g) return g.reponse
  const { data } = await supabaseAdmin.from('canaux')
    .select('id, libelle, adresse, actif, derniere_erreur, cree_le')
    .eq('artisan_id', g.uid).eq('type', 'telegram').order('cree_le', { ascending: true })
  return NextResponse.json({ ok: true, bots: data ?? [], chiffrement: chiffrementDisponible() }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
  try {
    if (!actif('canauxTelegram')) return introuvable()
    const g = await exigerCapacite(req, 'canaux.whatsapp', SUJET)
    if ('reponse' in g) return g.reponse
    const cle = process.env.CANAUX_KEY
    if (!chiffrementDisponible() || !cle) return NextResponse.json({ error: 'Stockage sécurisé indisponible côté serveur. Bot non relié.' }, { status: 503 })
    if (!(await consommerLimite(`telegram:liaison:${g.uid}`, 10, 3600))) return NextResponse.json({ error: 'Trop d’essais : réessayez dans une heure.' }, { status: 429 })

    const b = await req.json().catch(() => null)
    const jeton = String(b?.jeton ?? '').trim()
    if (!jetonTelegramValide(jeton)) return NextResponse.json({ error: 'Jeton illisible : copiez en entier le jeton donné par BotFather (« 123456789:AA… »).' }, { status: 400 })

    // 1. Le jeton ouvre-t-il bien un bot ?
    const me = requeteGetMe(jeton)
    if ('erreur' in me) return NextResponse.json({ error: me.erreur }, { status: 400 })
    const lu = lireGetMe((await appeler(me)).corps, jeton)
    if ('erreur' in lu) return NextResponse.json({ error: lu.erreur }, { status: 400 })

    // 2. Déjà relié ailleurs ? On ne dit pas à qui.
    const { data: deja } = await supabaseAdmin.from('canaux').select('id, artisan_id').eq('type', 'telegram').eq('externe_id', lu.id).maybeSingle()
    if (deja && deja.artisan_id !== g.uid) return NextResponse.json({ error: 'Ce bot est déjà relié à un autre espace. Créez un bot à vous avec BotFather.' }, { status: 409 })

    const ligne = {
      artisan_id: g.uid, type: 'telegram', libelle: lu.nom, adresse: `@${lu.username}`, externe_id: lu.id,
      secret: chiffrer(jeton), actif: true, derniere_erreur: null,
    }
    const ecrit = deja
      ? await supabaseAdmin.from('canaux').update(ligne).eq('id', deja.id).eq('artisan_id', g.uid).select('id').single()
      : await supabaseAdmin.from('canaux').insert(ligne).select('id').single()
    if (ecrit.error || !ecrit.data) {
      if (ecrit.error && /duplicate|unique/i.test(ecrit.error.message)) return NextResponse.json({ error: 'Ce bot est déjà relié à un autre espace.' }, { status: 409 })
      // Contrainte canaux_type_connu sans 'telegram' : la migration 0177 n'est pas appliquée (fail-closed).
      console.error('[canaux/telegram] enregistrement en échec')
      return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 503 })
    }
    const id = ecrit.data.id as string

    // 3. Le webhook, avec le secret dérivé de CETTE liaison. Échec : la liaison est retirée (pas de bot fantôme qui ne reçoit rien).
    const url = urlWebhookTelegram(baseWebhook(), id)
    const secret = secretWebhookTelegram(cle, id)
    const pose = url && secret ? requeteSetWebhook(jeton, url, secret) : { erreur: 'Adresse de webhook invalide.' }
    const reponse = 'erreur' in pose ? null : await appeler(pose)
    if (!reponse || !reponseOk(reponse.corps)) {
      if (!deja) await supabaseAdmin.from('canaux').delete().eq('id', id).eq('artisan_id', g.uid)
      return NextResponse.json({ error: 'Telegram a refusé de nous transmettre les messages de ce bot. Réessayez dans un instant.' }, { status: 502 })
    }
    return NextResponse.json({ ok: true, message: `@${lu.username} est relié : les messages que vos clients lui écrivent arriveront dans votre boîte de réception.` })
  } catch {
    console.error('[canaux/telegram] POST en échec')
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}

/** Déconnecter : le webhook est retiré chez Telegram (best effort), puis la liaison. Les conversations reçues restent. */
export async function DELETE(req: Request) {
  if (!actif('canauxTelegram')) return introuvable()
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error }, { status: s.status })
  const id = new URL(req.url).searchParams.get('id') || ''
  if (!estIdLiaison(id)) return NextResponse.json({ error: 'Bot manquant' }, { status: 400 })
  const { data: c } = await supabaseAdmin.from('canaux').select('id, secret').eq('id', id).eq('artisan_id', s.uid).eq('type', 'telegram').maybeSingle()
  if (!c) return introuvable()
  const jeton = dechiffrer(c.secret as string | null)
  if (jeton && jetonTelegramValide(jeton)) {
    const r = requeteDeleteWebhook(jeton)
    if (!('erreur' in r)) await appeler(r)
  }
  await supabaseAdmin.from('canaux').delete().eq('id', id).eq('artisan_id', s.uid).eq('type', 'telegram')
  return NextResponse.json({ ok: true, message: 'Bot déconnecté. Vos conversations déjà reçues restent dans votre boîte de réception.' })
}
