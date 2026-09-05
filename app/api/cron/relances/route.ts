import { NextResponse } from 'next/server'
import { signalerPanneIA } from '@/lib/alerteService'
import { enregistrerPassage, ronde } from '@/lib/alertes'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { purgerComptes } from '@/lib/purgeComptes'
import { purgerRgpd } from '@/lib/purgesRgpd'
import { generateRelanceReply, relanceTemplate } from '@/lib/ai'
import { sendEmail } from '@/lib/email'

// Endpoint appelé automatiquement chaque jour (Vercel Cron → voir vercel.json).
// Envoie les relances arrivées à échéance pour les leads encore en attente.
export async function GET(req: Request) {
  // Sécurité (fail-closed) : le secret est OBLIGATOIRE. Sans CRON_SECRET configuré,
  // ou avec un mauvais header, l'endpoint refuse (évite tout déclenchement public d'emails/IA).
  // Vercel Cron envoie automatiquement `Authorization: Bearer $CRON_SECRET` quand la variable existe.
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()

  const { data: relances, error } = await supabaseAdmin
    .from('relances')
    .select('id, lead_id, rang, planifiee_le')
    .eq('envoyee', false)
    .lte('planifiee_le', nowIso)
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let sent = 0
  let skipped = 0

  for (const r of relances ?? []) {
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
      .select('nom, metier, ton_style, email, is_founder')
      .eq('id', lead.artisan_id)
      .maybeSingle()

    const rang = r.rang ?? 1

    // Texte de relance : IA si possible, sinon modèle de secours
    let text = ''
    try {
      text = await generateRelanceReply(
        { nom: artisan?.nom ?? null, metier: artisan?.metier ?? null, ton_style: artisan?.ton_style ?? null },
        { nom_prospect: lead.nom_prospect, message: lead.message },
        rang,
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
    if (artisan?.is_founder || /\.invalid$/i.test(String(lead.contact ?? ''))) {
      await supabaseAdmin.from('relances').update({ envoyee: true }).eq('id', r.id)
      skipped++
      continue
    }
    if (isMail) {
      const envoi = await sendEmail({
        to: lead.contact as string,
        // Le sujet retombait sur « — Presti » : le prospect d'un artisan recevait une
        // relance signée du nom de l'éditeur. Sans nom d'artisan, on n'écrit rien du tout.
        subject: artisan?.nom ? `Suite à votre demande — ${artisan.nom}` : 'Suite à votre demande',
        text,
        fromName: artisan?.nom ?? undefined,
        replyTo: artisan?.email ?? undefined,
      })
      // Email refusé (plafond, Resend en panne) : la relance reste due, on réessaiera demain —
      // avant, elle était marquée envoyée et tracée dans le fil sans être partie (F, majeur 5).
      if (!envoi.ok) { console.error('[cron/relances] email non parti', r.id, envoi.error); skipped++; continue }
    }

    await supabaseAdmin.from('messages').insert({
      lead_id: lead.id,
      sens: 'out',
      type: 'relance',
      contenu: text,
    })

    await supabaseAdmin.from('relances').update({ envoyee: true }).eq('id', r.id)
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

  // La ronde des alertes (§6) vit ici : Vercel n'accorde que deux tâches planifiées à cette
  // formule. Elle ne fait jamais échouer les relances — une alerte qui rate est journalisée.
  let alertes: { envoyees: number; ignorees: number } | { erreur: string } = { envoyees: 0, ignorees: 0 }
  try { const r = await ronde(); alertes = { envoyees: r.envoyees.length, ignorees: r.ignorees.length }; await enregistrerPassage('alertes', alertes) }
  catch (e) { alertes = { erreur: e instanceof Error ? e.message : String(e) }; await enregistrerPassage('alertes', alertes, false) }
  await enregistrerPassage('relances', { due: relances?.length ?? 0, sent, skipped, purge: (purge as { purges?: number }).purges ?? 0, cache_purge: Number(cachePurge ?? 0) })
  return NextResponse.json({ ok: true, due: relances?.length ?? 0, sent, skipped, purge, cache_purge: Number(cachePurge ?? 0), purges_rgpd: purges, alertes })
}
