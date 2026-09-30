import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { exigerReconfirmation } from '@/lib/direction/reconfirmation'
import { sendEmail, EMAIL_ENTREPRISE } from '@/lib/email'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/controle/support/demander — Presti DEMANDE à regarder un élément. Il n'ouvre rien.
//
// C'est la nuance qui tient tout le dispositif : cette route écrit une demande et envoie un email.
// La porte, elle, ne s'ouvre que sous la session de l'artisan, par une autre route. Il n'existe
// aucun code permettant au fondateur d'ouvrir — ce n'est pas une politesse, c'est une absence.
//
// L'ORDRE DES GESTES, et pourquoi il ne peut pas être autre :
//   1. la demande est écrite en base (avec sa ligne de journal, dans la même transaction) ;
//   2. l'email part, et on ATTEND son résultat ;
//   3. seulement s'il est parti, `notifier_acces_support` pose `notifie_le` — et sans `notifie_le`,
//      `ouvrir_acces_support` refuse.
// Autrement dit : pas d'email, pas de porte. Une fenêtre qui s'ouvrirait sans que l'artisan ait été
// prévenu serait exactement ce que ce chantier existe pour empêcher. Si l'email échoue, la demande
// est annulée et la route rend 503.

export async function POST(req: Request) {
  if (!actif('supportArtisan')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  // Le périmètre AVANT le rôle : le partenaire doit entendre que le support n'est pas dans son
  // périmètre, pas « lecture seule » — aucun rôle ne le lui ouvre.
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'support', 'ecrire')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  if (f.role !== 'direction') return reponseRefus({ error: 'Votre rôle est en lecture seule.', status: 403, code: 'lecture_seule' })

  const b = (await req.json().catch(() => null)) as { ticket?: unknown; type?: unknown; element?: unknown; titre?: unknown; motif?: unknown } | null
  const UUID = /^[0-9a-f-]{36}$/i
  const ticket = typeof b?.ticket === 'string' && UUID.test(b.ticket) ? b.ticket : ''
  const type = typeof b?.type === 'string' ? b.type : ''
  const element = typeof b?.element === 'string' && UUID.test(b.element) ? b.element : ''
  const titre = typeof b?.titre === 'string' ? b.titre.slice(0, 120) : ''
  const motif = typeof b?.motif === 'string' ? b.motif.trim() : ''

  // On valide AVANT de consommer le jeton de re-confirmation : il est à usage unique, et une demande
  // mal formée le brûlait sans rien faire (leçon des actions sur un artisan).
  if (!ticket) return NextResponse.json({ error: 'Ticket inconnu.' }, { status: 400 })
  if (!['lead', 'devis', 'facture'].includes(type)) return NextResponse.json({ error: 'Type d’élément inconnu.' }, { status: 400 })
  if (!element) return NextResponse.json({ error: 'Élément inconnu.' }, { status: 400 })
  if (motif.length < 10) return NextResponse.json({ error: 'Écrivez le motif : l’artisan le lira tel quel.' }, { status: 400 })
  if (motif.length > 300) return NextResponse.json({ error: 'Motif trop long (300 caractères au maximum).' }, { status: 400 })

  const refus = await exigerReconfirmation(req, f.uid, 'artisan')
  if (refus) return refus

  const { data: d, error } = await supabaseAdmin.rpc('demander_acces_support', {
    p_acteur: f.uid, p_acteur_email: f.email, p_ticket: ticket, p_type: type,
    p_element: element, p_titre: titre, p_motif: motif, p_ip: f.ip, p_agent: 'poste de contrôle',
  })
  if (error) { console.error('[support] demande :', error.message); return NextResponse.json({ error: 'Rien n’a été fait.', code: 'transaction' }, { status: 503 }) }

  const r = d as { etat?: string; acces?: string; artisan?: string }
  const REFUS: Record<string, string> = {
    verrouille: 'Cet artisan a verrouillé le support : il a demandé qu’on ne lui demande jamais d’accès.',
    suspendu: 'Ce compte est suspendu : on ne regarde pas les données de quelqu’un à qui on vient de couper l’accès.',
    suppression_demandee: 'Ce compte est en cours de suppression.',
    plafond: 'Trois accès ont déjà été demandés sur ce ticket. Au-delà, ce n’est plus un diagnostic : reproduisez le problème sur un compte de démonstration.',
    refuse_recemment: 'L’artisan a refusé cet élément il y a moins de 24 heures. Un refus est une réponse.',
    element_inconnu: 'Cet élément n’appartient pas à cet artisan.',
    ticket_ferme: 'Ce ticket est fermé.',
    ticket_inconnu: 'Ticket inconnu.',
    motif_requis: 'Le motif est obligatoire.',
    type_inconnu: 'Type d’élément inconnu.',
  }
  if (r?.etat !== 'ok') return NextResponse.json({ error: REFUS[r?.etat ?? ''] ?? 'Demande refusée.' }, { status: 400 })

  const { data: a } = await supabaseAdmin.from('artisans').select('nom, email').eq('id', r.artisan).maybeSingle()
  if (!a?.email) {
    // Pas d'adresse, pas de notification, donc pas de porte. On annule proprement plutôt que de
    // laisser une demande que personne ne pourra jamais ni ouvrir ni refuser.
    await supabaseAdmin.rpc('refuser_acces_support', {
      p_acces: r.acces, p_motif: 'aucune adresse pour prévenir l’artisan', p_par: r.artisan,
      p_par_email: '', p_ip: f.ip, p_agent: 'système',
    }).then(() => {}, () => {})
    return NextResponse.json({ error: 'Cet artisan n’a pas d’adresse email : impossible de le prévenir, donc impossible de demander.' }, { status: 503 })
  }

  const lien = `${new URL(req.url).origin}/parametres#support`
  const envoi = await sendEmail({
    to: a.email, critique: true, replyTo: EMAIL_ENTREPRISE,
    subject: 'Presti demande à regarder un élément de votre compte',
    text: `Bonjour ${a.nom || ''},

Nous avons besoin de regarder ${titre || 'un élément de votre compte'} pour avancer sur votre demande d’aide.

Motif : ${motif}

C’est VOUS qui décidez. Rien n’est ouvert tant que vous n’avez pas cliqué :

  ${lien}

Si vous acceptez, l’accès dure une heure, il ne montre que la forme de l’élément — jamais le contenu
de vos échanges, ni les coordonnées de votre client, ni vos photos — et vous verrez, ligne par ligne,
ce qui a été consulté. Vous pouvez le refermer à tout moment.

Si vous préférez refuser, refusez : c’est une réponse, et nous ne redemanderons pas la même chose.

— Benjamin, Presti`,
  })

  if (!envoi.ok) {
    await supabaseAdmin.rpc('refuser_acces_support', {
      p_acces: r.acces, p_motif: 'la notification n’est pas partie', p_par: r.artisan,
      p_par_email: a.email, p_ip: f.ip, p_agent: 'système',
    }).then(() => {}, () => {})
    return NextResponse.json({ error: `L’email n’est pas parti (${envoi.error ?? 'raison inconnue'}) : sans notification, aucune porte ne s’ouvre.` }, { status: 503 })
  }

  await supabaseAdmin.rpc('notifier_acces_support', { p_acces: r.acces, p_envoi: envoi.id ?? 'sans-identifiant' })
  return NextResponse.json({
    ok: true, acces: r.acces,
    message: `Demande envoyée à ${a.nom || a.email}. C’est lui qui ouvre, ou non.`,
  })
}
