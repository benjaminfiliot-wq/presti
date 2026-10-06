import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { suspensionEnCours, MESSAGE_PUBLIC_INDISPONIBLE } from '@/lib/suspension'
import { generateConversationReply, generateLeadReply, qualifyLead } from '@/lib/ai'
import { villeDe } from '@/lib/ville'
import { getPlateformeConfig, decisionReponse, personaDe } from '@/lib/plateformeConfig'
import { resolveModel } from '@/lib/models'
import { sendEmail } from '@/lib/email'
import { notifierArtisan } from '@/lib/notifications'
import { consumeCredit, rendreCredit } from '@/lib/credits'
import { signalerPanneIA } from '@/lib/alerteService'
import { getIp, isBanned, recordAbuse, ipPseudonyme } from '@/lib/security'
import { consommerLimite } from '@/lib/limites'
import { porteMonnaieConversation } from '@/lib/quotaMedia'
import { artisanParAncienSlug } from '@/lib/slugRedirect'
import { PREFIXE_ADRESSE_PURGEE } from '@/lib/purgeComptes'

// 025-18 : la route rédige la proposition de réponse (IA) avant de répondre au prospect. Sans ce plafond, la limite par
// défaut de Vercel pouvait couper la fonction en pleine rédaction : crédit non rendu, artisan non prévenu, prospect qui
// renvoie sa demande (relecture à froid du 25/09, R3). Même valeur que les autres routes IA (conversation, messages).
export const maxDuration = 60

// Bornes anti-abus (une demande légitime tient largement dedans).
const MAX = { slug: 80, contact: 200, nom: 120, message: 5000 }
// Plafonds sur 10 minutes : par IP (tout est refusé au-delà) et par artisan (le lead est
// sauvé, seuls l'IA et l'email sont coupés). Comptés en base, atomiquement (lib/limites).
const MAX_LEADS_PAR_IP = 6
const MAX_LEADS_PAR_ARTISAN = 8
const clip = (v: unknown, n: number): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, n) : null
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const slug = clip(body?.slug, MAX.slug)
    const commande = body?.commande
    const commandeDonnee = commande !== undefined && commande !== null && commande !== ''
    const contact = clip(body?.contact, MAX.contact)
    const nom_prospect = clip(body?.nom_prospect, MAX.nom)
    const message = clip(body?.message, MAX.message)
    // Photos de chantier (déjà compressées + EXIF strippé côté client) : ≤ 3 data URLs image.
    const photosIn: string[] = Array.isArray(body?.photos)
      ? body.photos.filter((p: unknown): p is string => typeof p === 'string' && /^data:image\/(webp|jpeg|png);base64,/.test(p)).slice(0, 3)
      : []
    // A/B (J8) : variante servie + « coordonnées différées » (variante B « 1 champ »).
    const variant = body?.variant === 'A' || body?.variant === 'B' ? body.variant : null
    const deferContact = body?.deferContact === true

    // Validation stricte des entrées (slug attendu : minuscules/chiffres/tirets).
    // En mode différé (variante B), le contact arrive APRÈS la 1re réponse → il n'est pas requis ici,
    // mais le message l'est (sinon rien à traiter).
    if ((!slug && !commandeDonnee) || (!contact && !deferContact) || (deferContact && !message)) {
      return NextResponse.json({ error: 'Slug et contact requis' }, { status: 400 })
    }
    if (commandeDonnee && (typeof commande !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(commande))) {
      return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })
    }
    if (!commandeDonnee && !/^[a-z0-9-]{1,80}$/.test(slug!)) {
      return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })
    }

    const ip = getIp(req)

    // Anti-hacker : IP bannie (manuelle ou auto) → on refuse tout, immédiatement.
    if (await isBanned(ip)) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }

    // Honeypot anti-bot : champ caché qui doit rester vide. Rempli = bot → abus + drop silencieux.
    if (typeof body?.website === 'string' && body.website.trim()) {
      await recordAbuse(ip, 'honeypot /api/leads')
      return NextResponse.json({ ok: true })
    }

    // Rate-limit PAR IP (anti-flood + anti-relais email anonyme) : au-delà de 6 demandes
    // par IP sur 10 min, on refuse tout — et on journalise l'abus (peut déclencher un auto-ban).
    // Compteur ATOMIQUE (audit v4 §3) : « select count puis insert » laissait passer 11
    // demandes en rafale parallèle là où 6 sont permises. Ici, exactement 6 passent.
    if (ip !== 'unknown' && !(await consommerLimite(`leads:ip:${ip}`, MAX_LEADS_PAR_IP, 10 * 60))) {
      await recordAbuse(ip, 'flood /api/leads')
      return NextResponse.json({ error: 'Trop de demandes. Réessayez dans quelques minutes.' }, { status: 429 })
    }

    // 1) Une commande désigne son propriétaire par id, indépendamment du slug public.
    let artisanId: string | null = null
    if (commandeDonnee) {
      const { data: site, error: siteErr } = await supabaseAdmin
        .from('sites_commandes').select('artisan_id, etat').eq('id', commande).maybeSingle()
      if (siteErr) {
        console.error('[leads] lookup commande:', siteErr.message)
        return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
      }
      if (!site || site.etat !== 'en_ligne' || !site.artisan_id) {
        return NextResponse.json({ error: 'Artisan introuvable' }, { status: 404 })
      }
      artisanId = site.artisan_id
    }
    const colonnesArtisan = 'id, slug, suppression_demandee_le, nom, metier, ton_style, email, is_founder, leads_pause, services, zone_intervention, bio, tva_regime, assurance_nom, plan'
    let { data: artisan, error: aErr } = commandeDonnee
      ? await supabaseAdmin.from('artisans').select(colonnesArtisan).eq('id', artisanId).maybeSingle()
      : await supabaseAdmin.from('artisans').select(colonnesArtisan).eq('slug', slug).maybeSingle()

    if (aErr) {
      console.error('[leads] lookup artisan:', aErr.message)
      return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
    }
    if (artisan?.slug?.startsWith(PREFIXE_ADRESSE_PURGEE)) artisan = null
    if (commandeDonnee && artisan?.suppression_demandee_le) artisan = null
    if (!artisan) {
      if (!commandeDonnee) {
        const ancienneAdresse = await artisanParAncienSlug(slug!)
        if (ancienneAdresse?.slug && !ancienneAdresse.slug.startsWith(PREFIXE_ADRESSE_PURGEE)) {
          const resultat = await supabaseAdmin
            .from('artisans')
            .select(colonnesArtisan)
            .eq('slug', ancienneAdresse.slug)
            .maybeSingle()
          artisan = resultat.data
          aErr = resultat.error
          if (aErr) {
            console.error('[leads] lookup artisan:', aErr.message)
            return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
          }
          if (artisan?.slug?.startsWith(PREFIXE_ADRESSE_PURGEE)) artisan = null
        }
      }
    }
    if (!artisan) return NextResponse.json({ error: 'Artisan introuvable' }, { status: 404 })
    // Compte suspendu par la direction (v15 §5) : le lien ne prend plus de demandes — refus neutre, sans trace.
    if (await suspensionEnCours(artisan.id)) return NextResponse.json({ error: MESSAGE_PUBLIC_INDISPONIBLE }, { status: 410 })

    // Qualification silencieuse (déterministe, 0 coût IA) : urgence + type de chantier → tri de l'inbox.
    const qualif = qualifyLead(message, artisan.metier)

    // 2) Enregistrer le lead (chemin critique : on ne le perd jamais)
    const { data: lead, error: lErr } = await supabaseAdmin
      .from('leads')
      .insert({
        artisan_id: artisan.id,
        nom_prospect,
        contact,
        message,
        canal: 'formulaire',
        statut: 'nouveau',
        urgence: qualif.urgence,
        type_chantier: qualif.type_chantier,
        // La commune nommée dans le message, sur une liste fermée (0133, lib/ville.ts) : le bloc « Villes » de /chiffres.
        ville: villeDe(message),
        ab_variant: variant,
        ip: ipPseudonyme(ip),
      })
      .select('id, token')
      .single()

    if (lErr) {
      console.error('[leads] insert lead:', lErr.message)
      return NextResponse.json({ error: 'Enregistrement impossible' }, { status: 500 })
    }

    // 2ter) Photos de chantier → bucket `lead-media` (service_role). Non bloquant : si l'upload
    // échoue, le lead est déjà sauvé. On ne stocke QUE l'image ré-encodée (aucun EXIF/géoloc).
    //
    // Quota (audit final, auditeur F, 4.4) : ces octets-là, l'artisan ne les choisit pas — ce
    // sont des inconnus qui les poussent. Deux plafonds donc, et il faut les deux : celui de
    // la CONVERSATION (un prospect seul ne remplit rien) et celui de l'ARTISAN (mille
    // conversations sous le plafond de conversation rempliraient quand même le disque).
    let photoCount = 0
    if (photosIn.length) {
      try {
        // Un fondateur compte comme Business : on ne coupe jamais le compte de démonstration.
        const porte = await porteMonnaieConversation(artisan.id, artisan.is_founder ? 'business' : artisan.plan)
        const urls: string[] = []
        for (let i = 0; i < photosIn.length; i++) {
          const m = photosIn[i].match(/^data:image\/(webp|jpeg|png);base64,(.+)$/)
          if (!m) continue
          const ext = m[1] === 'jpeg' ? 'jpg' : m[1]
          const buf = Buffer.from(m[2], 'base64')
          if (buf.length > 3 * 1024 * 1024) continue // borne dure (le bucket limite déjà à 3 Mo)
          // Plafond atteint : on écarte la photo, jamais la demande — le message du prospect
          // vaut infiniment plus que sa pièce jointe.
          if (!porte.accepte(buf.length)) { console.warn('[leads] photo écartée : plafond de stockage atteint pour', artisan.id); continue }
          const path = `${lead.id}/${i}.${ext}`
          const { error: upErr } = await supabaseAdmin.storage.from('lead-media').upload(path, buf, {
            contentType: `image/${m[1]}`, cacheControl: '31536000', upsert: true,
          })
          if (upErr) { console.warn('[leads] upload photo:', upErr.message); continue }
          // On garde une URL de la même forme qu'avant pour ne pas casser l'existant,
          // mais le bucket est PRIVÉ : elle ne sert que de chemin. La console obtient des
          // liens signés via /api/leads/photos.
          urls.push(supabaseAdmin.storage.from('lead-media').getPublicUrl(path).data.publicUrl)
        }
        if (urls.length) {
          photoCount = urls.length
          // `photos_octets` alimente le quota par artisan (0059). Si la colonne n'est pas
          // encore posée, on réécrit sans elle : perdre les photos d'un vrai prospect pour
          // une migration en retard serait un très mauvais échange.
          const { error: eMaj } = await supabaseAdmin.from('leads')
            .update({ photos: urls, photos_octets: porte.octets() }).eq('id', lead.id)
          if (eMaj) {
            console.warn('[leads] photos_octets ignoré (migration 0059 posée ?):', eMaj.message)
            await supabaseAdmin.from('leads').update({ photos: urls }).eq('id', lead.id)
          }
        }
      } catch (e) {
        console.warn('[leads] photos ignorées (upload échoué):', e)
      }
    }

    // Mode PAUSE : l'artisan a suspendu l'accueil des demandes. Le lead est TOUJOURS sauvé
    // (visible dans sa console à la reprise), mais aucune réponse IA ni email ne part.
    if (artisan.leads_pause === true) {
      if (message) {
        await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: message })
      }
      return NextResponse.json({ ok: true, leadId: lead.id, token: lead.token, paused: true, reply: null })
    }

    // 2bis) Anti-abus (I2) : on plafonne l'IA+email par artisan sur une fenêtre courte.
    // Au-delà, le lead est TOUJOURS sauvé (visible dashboard) mais on coupe le coûteux
    // (empêche l'amplification de coûts IA et le relais d'emails). Ne bloque jamais un vrai lead.
    // Compteur atomique (fail-open : en cas de doute, on ne throttle pas — ne rien perdre).
    const throttled = !(await consommerLimite(`leads:artisan:${artisan.id}`, MAX_LEADS_PAR_ARTISAN, 10 * 60))
    if (throttled) {
      console.warn('[leads] throttle IA/email pour artisan', artisan.id)
      // Message entrant tout de même tracé : le prospect retrouvera son fil.
      if (message) {
        await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: message })
      }
      return NextResponse.json({ ok: true, leadId: lead.id, token: lead.token })
    }

    // La même décision que les deux routes de conversation (v7, bloc 1b) — avant, cette route
    // lisait l'ancien booléen `reponse_auto`, que Ma plateforme n'écrivait plus. Pas de réponse
    // automatique (manuelle, assistée, verrou d'offre, pause…) : on trace, on notifie, on dit pourquoi.
    const cfgPlateforme = await getPlateformeConfig(artisan.id)
    const decision = decisionReponse(artisan, { prise_en_main: false }, cfgPlateforme, { nbReponsesIA: 0, message: message || '' })
    if (!decision.ok && decision.comportement === 'preparer') {
      if (message) {
        await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: message })
      }

      const { model, tier } = resolveModel(cfgPlateforme.modele || 'standard', artisan.plan)
      const credit = message ? await consumeCredit(artisan.id, tier, !!artisan.is_founder) : { ok: false }
      let proposee = false
      if (credit.ok && message) {
        try {
          const proposition = await generateConversationReply(
            { nom: artisan.nom, metier: artisan.metier, ton_style: artisan.ton_style, services: artisan.services, zone: artisan.zone_intervention, bio: artisan.bio, tva_regime: artisan.tva_regime, assurance_nom: artisan.assurance_nom },
            { nom_prospect, contact, message },
            [{ sens: 'in', contenu: message }], model, undefined, { persona: personaDe(cfgPlateforme) },
          )
          if (proposition?.trim()) {
            const { error: eProp } = await supabaseAdmin.from('messages').insert({
              lead_id: lead.id, sens: 'out', type: 'reponse_auto', contenu: proposition.trim(), etat: 'proposition', modele: tier,
            })
            proposee = !eProp
            if (eProp) console.error('[leads] insertion proposition:', eProp.message)
          }
        } catch (e) {
          console.error('[leads] proposition:', e)
          await signalerPanneIA('proposition de réponse (/api/leads)', e)
        }
        if (!proposee) await rendreCredit(artisan.id, tier, !!artisan.is_founder)
      }

      if (artisan.email && !deferContact) {
        await notifierArtisan(artisan.id, 'nouvelle_demande', artisan.email, {
          leadId: lead.id,
          subject: proposee ? `Réponse proposée — à valider — ${nom_prospect || contact}` : `Nouveau contact — ${nom_prospect || contact}`,
          text: proposee
            ? `Réponse proposée — à valider dans votre espace (Messages).\n\nNom : ${nom_prospect || 'non précisé'}\nContact : ${contact}\nBesoin : ${message || 'non précisé'}${photoCount ? `\nPhotos jointes : ${photoCount}` : ''}`
            : `Nouveau contact via votre page Presti — à vous de répondre.\n\nNom : ${nom_prospect || 'non précisé'}\nContact : ${contact}\nBesoin : ${message || 'non précisé'}${photoCount ? `\nPhotos jointes : ${photoCount}` : ''}\n\nRépondez-lui depuis votre espace (Messages).`,
          replyTo: typeof contact === 'string' && contact.includes('@') ? contact : undefined,
        }).catch(() => {})
      }
      if (!deferContact && typeof contact === 'string' && contact.includes('@')) {
        const prenom = (nom_prospect || '').trim().split(/\s+/)[0]
        await sendEmail({
          to: contact,
          fromName: artisan.nom?.trim() || 'Votre artisan',
          subject: `Bien reçu — ${artisan.nom || 'votre demande'}`,
          text: `Bonjour${prenom ? ' ' + prenom : ''},\n\nMerci pour votre demande. ${artisan.nom || 'Nous'} l'a bien reçue et revient vers vous très vite.\n\n${message ? `Votre besoin : ${message}\n\n` : ''}À très bientôt.`,
          replyTo: artisan.email ?? undefined,
        }).catch(() => {})
      }
      return NextResponse.json({ ok: true, leadId: lead.id, token: lead.token, reply: null, raison: decision.raison })
    }
    if (!decision.ok) {
      if (message) {
        await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: message })
      }
      if (artisan.email && !deferContact) {
        await notifierArtisan(artisan.id, 'nouvelle_demande', artisan.email, {
          leadId: lead.id,
          subject: `Nouveau contact — ${nom_prospect || contact}`,
          text: `Nouveau contact via votre page Presti — à vous de répondre.\n\nNom : ${nom_prospect || 'non précisé'}\nContact : ${contact}\nBesoin : ${message || 'non précisé'}${photoCount ? `\nPhotos jointes : ${photoCount}` : ''}\n\nRépondez-lui depuis votre espace (Messages).`,
          replyTo: typeof contact === 'string' && contact.includes('@') ? contact : undefined,
        }).catch(() => {})
      }
      // Accusé de réception au prospect (marque de l'artisan) — même en mode manuel.
      if (!deferContact && typeof contact === 'string' && contact.includes('@')) {
        const prenom = (nom_prospect || '').trim().split(/\s+/)[0]
        await sendEmail({
          to: contact,
          fromName: artisan.nom?.trim() || 'Votre artisan',
          subject: `Bien reçu — ${artisan.nom || 'votre demande'}`,
          text: `Bonjour${prenom ? ' ' + prenom : ''},\n\nMerci pour votre demande. ${artisan.nom || 'Nous'} l'a bien reçue et revient vers vous très vite.\n\n${message ? `Votre besoin : ${message}\n\n` : ''}À très bientôt.`,
          replyTo: artisan.email ?? undefined,
        }).catch(() => {})
      }
      return NextResponse.json({ ok: true, leadId: lead.id, token: lead.token, reply: null, raison: decision.raison })
    }

    // Décompte d'un crédit pour la réponse auto. Si épuisé : le lead est TOUJOURS
    // sauvé (visible dans le dashboard), on coupe seulement la génération IA.
    const credit = await consumeCredit(artisan.id, 'standard', !!artisan.is_founder)
    if (!credit.ok) {
      console.warn('[leads] crédits épuisés pour artisan', artisan.id, '— réponse auto coupée, lead conservé')
      if (message) {
        await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: message })
      }
      return NextResponse.json({ ok: true, leadId: lead.id, token: lead.token, raison: 'credits' })
    }

    // 3) Étape 4 — réponse IA instantanée + emails.
    // Non bloquant : si l'IA ou l'email échoue, le lead est déjà sauvé et
    // apparaîtra dans le dashboard (statut 'nouveau'), donc rien n'est perdu.
    let replyText: string | null = null
    try {
      // trace du message entrant du prospect
      if (message) {
        await supabaseAdmin.from('messages').insert({
          lead_id: lead.id,
          sens: 'in',
          type: 'manuel',
          contenu: message,
        })
      }

      const reply = await generateLeadReply(
        { nom: artisan.nom, metier: artisan.metier, ton_style: artisan.ton_style, services: artisan.services, zone: artisan.zone_intervention, bio: artisan.bio, tva_regime: artisan.tva_regime, assurance_nom: artisan.assurance_nom },
        { nom_prospect, contact, message },
      )

      if (reply) {
        replyText = reply
        await supabaseAdmin.from('messages').insert({
          lead_id: lead.id,
          sens: 'out',
          type: 'reponse_auto',
          contenu: reply,
        })

        const isEmail = typeof contact === 'string' && contact.includes('@')

        // a) réponse instantanée au prospect (si son contact est un email).
        //    En mode différé (variante B), pas encore de contact → l'email partira à la capture.
        if (isEmail && !deferContact) {
          await sendEmail({
            to: contact,
            fromName: artisan.nom?.trim() || 'Votre artisan',
            subject: `Votre demande — ${artisan.nom?.trim() || 'Votre artisan'}`,
            text: reply,
            replyTo: artisan.email ?? undefined,
          })
        }

        // b) notification à l'artisan (différée aussi en variante B : rien à recontacter encore)
        if (artisan.email && !deferContact) {
          const recap = `Nouveau contact via votre lien Presti.

Nom : ${nom_prospect || 'non précisé'}
Contact : ${contact}
Besoin : ${message || 'non précisé'}${photoCount ? `\nPhotos jointes : ${photoCount}` : ''}

Réponse automatique ${isEmail ? 'envoyée au prospect' : '(prospect sans email — à rappeler)'} :
---
${reply}`
          await notifierArtisan(artisan.id, 'nouvelle_demande', artisan.email, {
            leadId: lead.id,
            subject: `Nouveau lead — ${nom_prospect || contact}`,
            text: recap,
            replyTo: isEmail ? contact : undefined,
          })
        }

        await supabaseAdmin
          .from('leads')
          .update({ statut: 'repondu', updated_at: new Date().toISOString() })
          .eq('id', lead.id)

        // Étape 6 — planifier les relances automatiques (J+2, J+5, J+10).
        // Le cron /api/cron/relances les enverra à échéance si le lead est
        // toujours en attente (statut 'repondu', pas encore gagné/perdu).
        // En variante B, on attend d'avoir un contact (planifié à la capture).
        if (!deferContact) {
          const now = Date.now()
          const jours = [2, 5, 10]
          await supabaseAdmin.from('relances').insert(
            jours.map((j, i) => ({
              lead_id: lead.id,
              planifiee_le: new Date(now + j * 86400000).toISOString(),
              rang: i + 1,
              envoyee: false,
            })),
          )
        }
      }
    } catch (e) {
      console.error('[leads] étape 4 (IA/email) a échoué:', e)
      // lead conservé en 'nouveau' — visible dans le dashboard, rien de perdu. L'entreprise est
      // prévenue et le crédit rendu si la réponse n'a pas été produite (audit final, E, M5).
      await signalerPanneIA('première réponse (/api/leads)', e)
      if (!replyText) await rendreCredit(artisan.id, 'standard', !!artisan.is_founder)
    }

    // On renvoie le jeton (pour ouvrir le fil de conversation côté prospect) et,
    // si elle a pu être générée, la réponse IA à afficher immédiatement.
    return NextResponse.json({ ok: true, leadId: lead.id, token: lead.token, reply: replyText })
  } catch (e) {
    console.error('[leads] erreur inattendue:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
