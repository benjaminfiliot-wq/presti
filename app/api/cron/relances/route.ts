import { NextResponse } from 'next/server'
import { bearerEgal } from '@/lib/secretEgal' // audit du 20/10 : comparaison du secret en temps constant
import { signalerPanneIA } from '@/lib/alerteService'
import { enregistrerPassage, ronde } from '@/lib/alertes'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { suspensionEnCours } from '@/lib/suspension'
import { plateformeOuverte } from '@/lib/plateformeAcces'
import { purgerComptes } from '@/lib/purgeComptes'
import { purgerRgpd } from '@/lib/purgesRgpd'
import { purgerPacksExpires } from '@/lib/packPubPurge'
import { expirerDevisDepasses } from '@/lib/devisExpiration'
import { generateRelanceReply, relanceTemplate } from '@/lib/ai'
import { sendEmail } from '@/lib/email'
import { sortiePermise } from '@/lib/agents/sortie'
import { relever } from '@/lib/direction/courriers'
import { actif } from '@/lib/flags'
import { tourLivraison } from '@/lib/siteLivraison'
import { getPlateformeConfig, personaDe, tonDeReponse } from '@/lib/plateformeConfig'
import { avecMentionAssistant } from '@/lib/mentionAssistant'
import { tourCompta } from '@/lib/comptaAutomatisationsTour'
import { tourRelancesImpayes } from '@/lib/relancesImpayesTour'
import { magasinSupabase } from '@/lib/relancesImpayesMagasin'
import { tourRappels } from '@/lib/crm/rappelsTour'
import { tourApresChantier } from '@/lib/apresChantierTour'
import { envoyerPushArtisan } from '@/lib/push'
import { peut } from '@/lib/plans'
import { notifierArtisan } from '@/lib/notifications'

// Endpoint appelé automatiquement chaque jour (Vercel Cron → voir vercel.json).
// Envoie les relances arrivées à échéance pour les leads encore en attente.
//
// Pause générale (décision du 30/09) : elle est lue AVANT toute lecture de contact, puis RELUE à chaque relance ; posée, ou dans le
// doute, rien ne part (ni mail, ni appel au modèle, ni livraison). Le bouton « purges-rgpd » rejoue ce même passage : les purges
// (qui effacent, n'envoient rien) continuent de tourner sous pause. Un passage envoie au plus MAX_PAR_PASSAGE relances, et une
// relance est PRISE (envoyee: true, conditionnelle) avant tout envoi : deux passages simultanés ou rejoués ne l'envoient jamais deux fois.
const MAX_PAR_PASSAGE = 100
export async function GET(req: Request) {
  // Sécurité (fail-closed) : le secret est OBLIGATOIRE. Sans CRON_SECRET configuré,
  // ou avec un mauvais header, l'endpoint refuse (évite tout déclenchement public d'emails/IA).
  // Vercel Cron envoie automatiquement `Authorization: Bearer $CRON_SECRET` quand la variable existe.
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!bearerEgal(auth, secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // La boîte de l'entreprise se relève ici plutôt que dans sa propre tâche : le plan Vercel de Presti
  // n'en autorise que deux, toutes deux déjà prises. Bornée et à l'abri d'un `try` — un serveur de
  // messagerie qui ne répond pas ne doit pas empêcher les relances de partir.
  let courriers: unknown = 'messagerie fermée'
  if (actif('messagerie')) {
    try { courriers = await relever(25) } catch (e) { courriers = { ok: false, erreur: (e as Error).message.slice(0, 160) } }
    console.log('[cron] relève de la boîte :', JSON.stringify(courriers))
  }

  const nowIso = new Date().toISOString()

  // La pause d'abord : aucune lecture de relance ni de contact tant qu'on ne sait pas que la sortie est permise.
  const enPause = !(await sortiePermise()).permise
  let relances: { id: string; lead_id: string; rang: number | null; planifiee_le: string }[] = []
  if (!enPause) {
    const lecture = await supabaseAdmin
      .from('relances')
      .select('id, lead_id, rang, planifiee_le')
      .eq('envoyee', false)
      .lte('planifiee_le', nowIso)
      .limit(MAX_PAR_PASSAGE)
    if (lecture.error) return NextResponse.json({ error: lecture.error.message }, { status: 500 })
    relances = lecture.data ?? []
  }

  let sent = 0
  let prepared = 0
  let skipped = 0
  let interrompue = false
  let plafond = false
  const contactes = new Set<string>()

  for (const r of relances) {
    // La pause est relue à CHAQUE relance : posée en cours de passage, le lot s'arrête ici.
    if (!(await sortiePermise()).permise) { interrompue = true; break }
    // Charger le lead
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id, nom_prospect, contact, message, statut, artisan_id')
      .eq('id', r.lead_id)
      .maybeSingle()

    // Lead absent, ou plus en attente (gagné/perdu/nouveau) → on annule la relance
    if (!lead || lead.statut !== 'repondu') {
      await supabaseAdmin.from('relances').update({ envoyee: true }).eq('id', r.id)
      skipped++
      continue
    }

    const { data: artisan } = await supabaseAdmin
      .from('artisans')
      .select('nom, metier, ton_style, email, is_founder, leads_pause, plan')
      .eq('id', lead.artisan_id)
      .maybeSingle()

    // 15/10 (Benj) : les relances de CONVERSATION font partie de la plateforme (Studio et au-dessus). Une offre sans plateforme n'en envoie
    // aucune — ni e-mail, ni appel au modèle, ni crédit. La relance est ANNULÉE (marquée traitée) et non laissée due : sinon les relances
    // des comptes Essentiel rempliraient le lot de chaque passage, et repartiraient en rafale, périmées, le jour d'un passage en Studio.
    if (!artisan || !plateformeOuverte(artisan)) {
      await supabaseAdmin.from('relances').update({ envoyee: true }).eq('id', r.id)
      skipped++
      continue
    }

    // Compte suspendu par la direction (v15 §5) : on n'écrit pas à ses prospects en son nom. La relance n'est pas
    // marquée envoyée : elle repart à la réactivation.
    if (await suspensionEnCours(lead.artisan_id)) { skipped++; continue }
    // L'artisan a mis sa page en PAUSE (Ma plateforme : « n'envoie plus rien automatiquement ») : on n'écrit pas non plus à
    // ses prospects en son nom. Jusqu'au 12/10, les relances partaient quand même — un artisan en congés continuait de
    // relancer (audit des promesses, produit, ligne 51). Même règle que la suspension : la relance reste due et repart à la
    // reprise (« rien n'est perdu »).
    if (artisan?.leads_pause === true) { skipped++; continue }

    // Un prospect ne reçoit qu'une relance par passage ; la suivante reste due et repart demain.
    if (contactes.has(lead.id)) { skipped++; continue }
    // Prise de la relance AVANT toute dépense (modèle, mail) : la mise à jour est conditionnelle, donc atomique. Un second passage
    // (simultané, rejoué par le bouton, ou après une écriture en panne) ne la prend pas et n'envoie rien.
    const prise = await supabaseAdmin.from('relances').update({ envoyee: true }).eq('id', r.id).eq('envoyee', false).select('id')
    if (prise.error || !prise.data?.length) { skipped++; continue }

    const rang = r.rang ?? 1

    // Texte de relance : IA si possible, sinon modèle de secours
    let text = ''
    try {
      // Le ton et la persona de Ma plateforme (vous/tu, longueur, émojis) : jusqu'au 12/10, les relances les ignoraient
      // (audit des promesses, produit, ligne 54).
      const cfg = await getPlateformeConfig(lead.artisan_id)
      text = await generateRelanceReply(
        { nom: artisan?.nom ?? null, metier: artisan?.metier ?? null, ton_style: tonDeReponse(cfg, artisan?.ton_style) },
        { nom_prospect: lead.nom_prospect, message: lead.message },
        rang, undefined, personaDe(cfg),
      )
    } catch (e) {
      console.error('[cron/relances] IA indisponible, repli sur template:', e instanceof Error ? e.message : e)
      // Le repli sur le texte générique n'est plus silencieux : l'entreprise apprend que l'IA est
      // tombée pendant que des relances partent quand même (audit final, E, M5).
      await signalerPanneIA('relances (cron)', e)
    }
    if (!text) text = relanceTemplate(artisan?.nom ?? null, lead.nom_prospect, rang)

    const isMail = typeof lead.contact === 'string' && lead.contact.includes('@')
    // Un compte fondateur est un compte de démonstration : ses « prospects » sont des visiteurs qui
    // essaient le produit, on ne les relance pas au nom d'un artisan fictif (audit final, F, 11).
    // Une adresse de test (.invalid) ne reçoit rien non plus : chaque rebond abîme le domaine.
    // (les adresses .invalid ne sont plus sautées ici : lib/email.ts ne les envoie jamais et les
    // considère parties — le fil garde ainsi sa trace, ce que la suite relances-e2e vérifie)
    if (artisan?.is_founder) {
      await supabaseAdmin.from('relances').update({ envoyee: true }).eq('id', r.id)
      skipped++
      continue
    }
    // 25/10 (Benj) : en Studio, « tout est automatisé, mais il faut valider, sinon ça ne s'envoie pas ». La relance est rédigée puis
    // PROPOSÉE dans le fil (messages.etat = 'proposition') ; elle part au clic de l'artisan (validerPropositionServeur), comme une
    // réponse préparée. Seule l'offre qui a `relances.auto` (Signature) l'envoie seule. Une relance proposée plus tôt et jamais
    // validée est remplacée par celle-ci : l'artisan n'a qu'une relance à valider par conversation.
    if (!peut(artisan.plan, 'relances.auto')) {
      await supabaseAdmin.from('messages').update({ etat: 'rejete' }).eq('lead_id', lead.id).eq('type', 'relance').eq('etat', 'proposition')
      const proposee = await supabaseAdmin.from('messages').insert({ lead_id: lead.id, sens: 'out', type: 'relance', contenu: text, etat: 'proposition' })
      if (proposee.error) {
        console.error('[cron/relances] proposition impossible', r.id, proposee.error.message)
        await supabaseAdmin.from('relances').update({ envoyee: false }).eq('id', r.id)
        skipped++
        continue
      }
      contactes.add(lead.id)
      await notifierArtisan(lead.artisan_id, 'proposition', artisan.email, {
        leadId: lead.id,
        subject: `Relance prête à valider — ${lead.nom_prospect || 'votre client'}`,
        text: `${lead.nom_prospect || 'Votre client'} n'a pas encore répondu. Une relance est prête dans votre espace (Messages) : relisez-la et validez-la d'un clic pour qu'elle parte.`,
      }).catch(() => {})
      prepared++
      continue
    }
    if (isMail) {
      const envoi = await sendEmail({
        to: lead.contact as string,
        // Le sujet retombait sur « — Presti » : le prospect d'un artisan recevait une
        // relance signée du nom de l'éditeur. Sans nom d'artisan, on n'écrit rien du tout.
        subject: artisan?.nom ? `Suite à votre demande — ${artisan.nom}` : 'Suite à votre demande',
        // Une relance part seule, sans relecture : elle dit qu'elle vient de l'assistant (règlement IA, art. 50 ;
        // lib/mentionAssistant.ts). Le fil de la conversation garde le texte sans la mention, comme la page l'affiche.
        text: avecMentionAssistant(text, artisan?.nom),
        fromName: artisan?.nom?.trim() || 'Votre artisan',
        replyTo: artisan?.email ?? undefined,
        // Sa part du plafond est celle du produit ; la pause générale, elle, s'applique quand même — lue plus haut par ce
        // passage (décision du 30/09 : l'arrêt d'urgence coupe aussi ce que l'IA écrit seule, sans geste de l'artisan).
        transactionnel: true,
      })
      // Email refusé (plafond, Resend en panne) : la relance reste due, on réessaiera demain —
      // avant, elle était marquée envoyée et tracée dans le fil sans être partie (F, majeur 5).
      if (!envoi.ok) {
        console.error('[cron/relances] email non parti', r.id, envoi.error)
        // Relâcher la prise : la relance reste due et repart demain.
        await supabaseAdmin.from('relances').update({ envoyee: false }).eq('id', r.id)
        skipped++
        // Plafond du jour atteint : inutile d'insister, tous les envois suivants seraient refusés de même.
        if (/plafond/i.test(envoi.error ?? '')) { plafond = true; break }
        continue
      }
      contactes.add(lead.id)
    }

    await supabaseAdmin.from('messages').insert({
      lead_id: lead.id,
      sens: 'out',
      type: 'relance',
      contenu: text,
    })

    sent++
  }

  // Purge des comptes en fin de grâce (§6) — dans ce cron parce que Vercel Hobby n'en accepte que deux.
  const purge = await purgerComptes().catch((e) => ({ purges: 0, en_attente: 0, erreur: String(e) }))
  // Le cache mutualisé des prix (0056) se purge ici : Vercel n'autorise que deux tâches
  // planifiées sur cette formule, toutes deux déjà prises.
  const { data: cachePurge } = await supabaseAdmin.rpc('purger_cache_recherche')

  // Les purges RGPD (12 mois / 3 ans) vivent ici pour la même raison — et parce qu'elles doivent
  // tourner CHAQUE jour : jusqu'à l'audit final (auditeur B, C6), les durées annoncées par
  // /confidentialite et lib/legalArtisan.ts n'étaient appliquées nulle part. Bornées par passage,
  // elles ne peuvent pas faire expirer le cron ; en erreur, elles ne bloquent pas les relances.
  let purges: Record<string, unknown>
  try {
    const p = await purgerRgpd()
    purges = { ...p }
    await enregistrerPassage('purges-rgpd', purges, p.erreurs.length === 0)
  } catch (e) {
    purges = { erreur: e instanceof Error ? e.message : String(e) }
    await enregistrerPassage('purges-rgpd', purges, false)
  }

  try {
    const r = await purgerPacksExpires()
    await enregistrerPassage('purge-packs', r, r.erreurs.length === 0)
  } catch (e) {
    await enregistrerPassage('purge-packs', { erreur: e instanceof Error ? e.message : String(e) }, false)
  }

  // Les devis envoyés dont la validité est dépassée passent à « expiré » (audit de cohérence du 18/10, C8 : la colonne « Devis
  // envoyé » du pipeline les gardait pour toujours, la tuile « devis en attente » les écartait). N'envoie rien : tourne aussi
  // sous pause, comme les purges. Une erreur ne bloque pas le reste du passage.
  let expirations: Record<string, unknown> = {}
  try {
    const r = await expirerDevisDepasses()
    expirations = { ...r }
    await enregistrerPassage('expiration-devis', expirations, r.erreurs.length === 0)
  } catch (e) {
    expirations = { erreur: e instanceof Error ? e.message : String(e) }
    await enregistrerPassage('expiration-devis', expirations, false)
  }

  // La ronde des alertes (§6) vit ici : Vercel n'accorde que deux tâches planifiées à cette
  // formule. Elle ne fait jamais échouer les relances — une alerte qui rate est journalisée.
  let alertes: { envoyees: number; ignorees: number } | { erreur: string } = { envoyees: 0, ignorees: 0 }
  try { const r = await ronde(); alertes = { envoyees: r.envoyees.length, ignorees: r.ignorees.length }; await enregistrerPassage('alertes', alertes) }
  catch (e) { alertes = { erreur: e instanceof Error ? e.message : String(e) }; await enregistrerPassage('alertes', alertes, false) }
  if (!enPause && !interrompue) { try { await tourLivraison() } catch (e) { console.error('[cron/relances] livraison', e) } }
  // Les automatisations de la compta de l'artisan (alerte impayés, export mensuel au comptable) : derrière leurs drapeaux
  // (comptaAlerteImpayes, comptaExportMensuel), jamais sous pause. Baissés, tourCompta ne lit rien et rend « fermé ».
  let compta: unknown = 'fermée'
  if (!enPause && !interrompue && (actif('comptaAlerteImpayes') || actif('comptaExportMensuel'))) {
    try { const r = await tourCompta(); compta = r; await enregistrerPassage('compta-artisans', r, r.erreurs.length === 0) }
    catch (e) { compta = { erreur: e instanceof Error ? e.message : String(e) }; console.error('[cron/relances] compta', e) }
  }
  // Les relances automatiques des factures impayées (opt-in de chaque artisan, drapeau relancesImpayes, migration 0159) : jamais sous
  // pause générale, jamais deux fois (prise avant l'envoi), plafonnées par compte et par jour. Une erreur ne fait pas échouer le reste.
  let impayes: unknown = 'fermées'
  if (!enPause && !interrompue && actif('relancesImpayes')) {
    try {
      const r = await tourRelancesImpayes({
        actif: true, magasin: magasinSupabase, sortiePermise: async () => (await sortiePermise()).permise,
        envoyer: (m) => sendEmail({ to: m.to, subject: m.subject, text: m.text, fromName: m.fromName, replyTo: m.replyTo, transactionnel: true }),
      })
      impayes = r
      await enregistrerPassage('relances-impayes', r, r.erreurs.length === 0)
    } catch (e) { impayes = { erreur: e instanceof Error ? e.message : String(e) }; console.error('[cron/relances] impayés', e); await enregistrerPassage('relances-impayes', { erreur: String(impayes) }, false) }
  }
  // L'après-chantier (plan du 18/10, n°7, migration 0165, drapeau crmApresChantier) : pose les rappels « Demander un avis » et
  // « Proposer l'entretien » des artisans qui l'ont activé. AUCUN message au client : l'artisan relit et confirme chacun. Avant le
  // passage du matin, pour que sa notification les compte. Jamais sous pause ; une erreur ne fait pas échouer le passage.
  let apresChantier: unknown = 'fermé'
  if (!enPause && !interrompue && actif('crmApresChantier')) {
    try {
      const jour = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
      const r = await tourApresChantier(jour, {
        lireReglages: async () => { const x = await supabaseAdmin.from('crm_apres_chantier').select('artisan_id, avis, entretien, texte_avis, texte_entretien, actif_depuis').or('avis.eq.true,entretien.eq.true').limit(5000); return { data: x.data, error: x.error } },
        lirePlans: async (ids) => { const x = await supabaseAdmin.from('artisans').select('id, plan, is_founder').in('id', ids); return { data: x.data, error: x.error } },
        lireChantiers: async (id, depuis) => {
          const c = await supabaseAdmin.from('chantiers').select('id, titre, statut, date_fin_reelle, client_nom, devis_id').eq('artisan_id', id).eq('statut', 'termine').gte('date_fin_reelle', depuis).limit(1000)
          if (c.error) return { data: null, error: c.error }
          const devisIds = (c.data ?? []).map((x) => x.devis_id).filter(Boolean) as string[]
          const [d, l] = devisIds.length
            ? await Promise.all([
                supabaseAdmin.from('devis').select('id, objet').eq('artisan_id', id).in('id', devisIds),
                supabaseAdmin.from('devis_lignes').select('devis_id, designation').in('devis_id', devisIds).limit(5000),
              ])
            : [{ data: [], error: null }, { data: [], error: null }]
          if (d.error || l.error) return { data: null, error: d.error ?? l.error }
          const textes = new Map<string, string[]>()
          for (const x of d.data ?? []) textes.set(x.id as string, [String(x.objet ?? '')])
          for (const x of l.data ?? []) textes.get(x.devis_id as string)?.push(String(x.designation ?? '').slice(0, 200))
          return { data: (c.data ?? []).map((x) => ({ id: x.id, titre: x.titre, statut: x.statut, date_fin_reelle: x.date_fin_reelle, client_nom: x.client_nom, textes: x.devis_id ? textes.get(x.devis_id) ?? [] : [] })), error: null }
        },
        lireCles: async (id) => { const x = await supabaseAdmin.from('crm_rappels').select('cle').eq('artisan_id', id).or('cle.like.avis:*,cle.like.entretien:*').limit(5000); return { data: x.data ? x.data.map((y) => String(y.cle)) : null, error: x.error } },
        poser: async (id, lignes) => {
          const x = await supabaseAdmin.from('crm_rappels').upsert(lignes.map((p) => ({ artisan_id: id, chantier_id: p.chantier_id, type: p.type, echeance: p.echeance, origine: 'systeme', cle: p.cle, texte: p.texte })), { onConflict: 'artisan_id,cle', ignoreDuplicates: true })
          return { error: x.error }
        },
      })
      apresChantier = r
      if (r.installe) await enregistrerPassage('apres-chantier', r, r.erreurs.length === 0)
    } catch (e) { apresChantier = { erreur: e instanceof Error ? e.message : String(e) }; console.error('[cron/relances] après-chantier', e) }
  }
  // Les rappels du CRM (plan du 18/10, n°1, migration 0162) : une notification du matin par artisan Signature dont des rappels sont
  // dus aujourd'hui ou en retard. Rien n'est envoyé au client. Jamais sous pause ; une erreur ne fait pas échouer le passage.
  let rappelsMatin: unknown = 'pause'
  if (!enPause && !interrompue) {
    try {
      const jour = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
      const r = await tourRappels(jour, {
        lireRappels: async (j) => { const x = await supabaseAdmin.from('crm_rappels').select('artisan_id, echeance').is('fait_le', null).lte('echeance', j).limit(5000); return { data: x.data, error: x.error } },
        lirePlans: async (ids) => { const x = await supabaseAdmin.from('artisans').select('id, plan').in('id', ids); return { data: x.data, error: x.error } },
        envoyer: (id, charge) => envoyerPushArtisan(id, charge),
      })
      rappelsMatin = r
      if (r.installe) await enregistrerPassage('rappels-crm', r, r.erreurs.length === 0)
    } catch (e) { rappelsMatin = { erreur: e instanceof Error ? e.message : String(e) }; console.error('[cron/relances] rappels', e) }
  }
  // La relève de la boîte fait partie de ce passage : son résultat doit s'y lire, et son échec doit
  // le faire échouer. Sans ça, elle a échoué chaque jour sous un « reussi: true » (constaté le 07/09,
  // zéro courrier en base depuis la mise en service, sans que rien ne le signale).
  const releveOk = typeof courriers === 'object' && courriers !== null && (courriers as { ok?: boolean }).ok === true
  // Une boîte NON CONFIGURÉE n'est pas une panne : c'est une absence de réglage, comme un drapeau
  // baissé. Sans cette distinction, une suite lancée depuis un poste sans identifiants IMAP écrivait
  // un « échec » dans la base de PRODUCTION et faisait apparaître une alerte critique dans le Poste
  // de contrôle — arrivé le 07/09 à 21 h 50, une heure après que la vraie boîte se soit mise à marcher.
  const releveNonConfiguree = /n’est pas configurée|n'est pas configurée/.test(String((courriers as { erreur?: string })?.erreur ?? ''))
  const releveResume = courriers === 'messagerie fermée' ? 'drapeau baissé'
    : releveOk ? `${(courriers as { nouveaux: number }).nouveaux} nouveau(x) sur ${(courriers as { lus: number }).lus} lu(s)`
    : releveNonConfiguree ? 'boîte non configurée sur cet environnement'
    : `ÉCHEC — ${(courriers as { erreur?: string })?.erreur ?? 'raison inconnue'}`.slice(0, 180)
  await enregistrerPassage('relances', {
    due: relances.length, sent, prepared, skipped, pause: enPause || interrompue, plafond, purge: (purge as { purges?: number }).purges ?? 0, cache_purge: Number(cachePurge ?? 0),
    boite: releveResume,
  }, courriers === 'messagerie fermée' || releveOk || releveNonConfiguree)
  return NextResponse.json({ ok: true, pause: enPause || interrompue, plafond, due: relances.length, sent, prepared, skipped, purge, cache_purge: Number(cachePurge ?? 0), purges_rgpd: purges, expirations, alertes, courriers, compta, impayes, rappels: rappelsMatin, apres_chantier: apresChantier })
}
