import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { actif } from '@/lib/flags'
import { messageVerrou, offreMinimale, peut } from '@/lib/plans'
import { jourParis, centimes } from '@/lib/comptaTableau'
import { sendEmail } from '@/lib/email'
import { adresseValable, lireRelanceRetouchee } from '@/lib/relancesImpayes'

export const runtime = 'nodejs'

// Offre Studio (décision du 25/10, migration 0181) : les relances d'impayés sont PRÉPARÉES chaque matin par le passage quotidien
// (lib/relancesImpayesTour.ts, statut « a_valider ») et ne partent que quand l'artisan les ENVOIE ici, ou disparaissent quand il les
// ÉCARTE (« rejetee »). Fermée (404) drapeau baissé.
//
// Garanties :
//  • Session artisan exigée ; la relance doit être celle du compte (artisan_id = session) — sinon introuvable, sans dire si elle existe.
//  • La facture est RELUE : payée, annulée, avoir, montant nul, sans adresse, relances arrêtées, ou adresse du client changée → refus.
//  • Idempotente, sur le motif du passage quotidien : la relance est PRISE avant l'envoi par une mise à jour conditionnelle
//    (a_valider → prise, et jour = aujourd'hui, ce qui rejoue la clé unique « un message par client et par jour ») ; un envoi refusé
//    la rend (prise → a_valider, jour d'origine), un envoi réussi la confirme (envoyee). Deux clics, deux onglets : un seul e-mail.
//  • Jamais un identifiant de compte venu de la requête.
const ferme = () => !actif('relancesImpayes')
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NON_MISE_EN_PLACE = { error: 'La validation des relances n’est pas encore disponible. Réessayez plus tard.' }

type Ligne = { id: string; facture_id: string; artisan_id: string; rang: number; jour: string; destinataire: string; statut: string; sujet: string | null; texte: string | null }

export async function POST(req: Request) {
  if (ferme()) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  const session = await authArtisan(req)
  if (estEchec(session)) return NextResponse.json({ error: session.error, code: session.code }, { status: session.status })

  const art = await supabaseAdmin.from('artisans').select('nom, email, plan, is_founder').eq('id', session.uid).maybeSingle()
  if (art.error || !art.data) return NextResponse.json({ error: 'Compte illisible.' }, { status: 503 })
  if (!art.data.is_founder && !peut(art.data.plan, 'factures.relances')) {
    return NextResponse.json({ error: `Les relances des factures ne sont pas dans votre offre. ${messageVerrou('factures.relances')}`, code: 'offre', offre: offreMinimale('factures.relances') }, { status: 403 })
  }

  const b = (await req.json().catch(() => null)) as { relance_id?: unknown; action?: unknown; sujet?: unknown; texte?: unknown } | null
  const id = typeof b?.relance_id === 'string' && UUID.test(b.relance_id) ? b.relance_id : null
  if (!id || (b?.action !== 'envoyer' && b?.action !== 'ecarter')) return NextResponse.json({ error: 'Demande illisible.' }, { status: 400 })

  const lue = await supabaseAdmin.from('relances_impayes').select('id, facture_id, artisan_id, rang, jour, destinataire, statut, sujet, texte')
    .eq('id', id).eq('artisan_id', session.uid).maybeSingle()
  if (lue.error) { console.error('[relances-auto/a-valider] lecture', lue.error.message); return NextResponse.json(NON_MISE_EN_PLACE, { status: 503 }) }
  const ligne = lue.data as Ligne | null
  if (!ligne) return NextResponse.json({ error: 'Relance introuvable' }, { status: 404 })
  // Rejeu d'un geste déjà fait : même réponse que la première fois, rien ne repart.
  if (ligne.statut === 'envoyee') return NextResponse.json(b.action === 'envoyer' ? { ok: true, deja: true } : { error: 'Cette relance est déjà partie.' }, { status: b.action === 'envoyer' ? 200 : 409 })
  if (ligne.statut === 'rejetee') return NextResponse.json(b.action === 'ecarter' ? { ok: true, deja: true } : { error: 'Cette relance a été écartée.' }, { status: b.action === 'ecarter' ? 200 : 409 })
  if (ligne.statut !== 'a_valider') return NextResponse.json({ error: 'Cette relance est en cours d’envoi.' }, { status: 409 })

  // ── Écarter : a_valider → rejetee, conditionnel. Le rang n'est pas reproposé ; la relance suivante viendra à son heure.
  if (b.action === 'ecarter') {
    const r = await supabaseAdmin.from('relances_impayes').update({ statut: 'rejetee' }).eq('id', id).eq('artisan_id', session.uid).eq('statut', 'a_valider').select('id').maybeSingle()
    if (r.error) { console.error('[relances-auto/a-valider] écart', r.error.message); return NextResponse.json({ error: 'Action impossible.' }, { status: 503 }) }
    if (!r.data) return NextResponse.json({ error: 'Cette relance vient d’être traitée ailleurs. Rechargez la page.' }, { status: 409 })
    return NextResponse.json({ ok: true })
  }

  // ── Envoyer. Le contenu : celui préparé, ou celui retouché par l'artisan (validé de la même façon).
  const contenu = lireRelanceRetouchee(b.sujet ?? ligne.sujet, b.texte ?? ligne.texte)
  if (!contenu.ok) return NextResponse.json({ error: contenu.erreur }, { status: 400 })
  if (!art.data.email) return NextResponse.json({ error: 'Ajoutez votre adresse e-mail dans vos paramètres : vos clients doivent pouvoir vous répondre.' }, { status: 409 })

  // La facture, relue maintenant : elle doit toujours être due, et toujours adressée à ce client.
  const f = await supabaseAdmin.from('factures').select('id, statut, avoir_de, total_ttc, client_email').eq('id', ligne.facture_id).eq('artisan_id', session.uid).maybeSingle()
  if (f.error) return NextResponse.json({ error: 'Facture illisible.' }, { status: 503 })
  if (!f.data) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  if (f.data.statut !== 'emise' || f.data.avoir_de || centimes(f.data.total_ttc) <= 0) return NextResponse.json({ error: 'Cette facture n’est plus impayée : rien n’est parti. Vous pouvez écarter cette relance.' }, { status: 409 })
  if (!adresseValable(f.data.client_email) || f.data.client_email.trim().toLowerCase() !== ligne.destinataire) {
    return NextResponse.json({ error: 'L’adresse e-mail du client a changé depuis la préparation : écartez cette relance, une nouvelle sera préparée.' }, { status: 409 })
  }
  const arret = await supabaseAdmin.from('relances_impayes_arrets').select('reprise_le').eq('facture_id', ligne.facture_id).eq('artisan_id', session.uid).maybeSingle()
  if (arret.error) return NextResponse.json({ error: 'Facture illisible.' }, { status: 503 })
  if (arret.data && !arret.data.reprise_le) return NextResponse.json({ error: 'Les relances de cette facture sont arrêtées : reprenez-les d’abord, ou écartez cette relance.' }, { status: 409 })

  // Prise : a_valider → prise, conditionnelle. Le jour devient aujourd'hui : la clé unique (artisan, destinataire, jour) refuse un
  // second message au même client le même jour.
  const aujourdhui = jourParis(new Date())
  const prise = await supabaseAdmin.from('relances_impayes').update({ statut: 'prise', jour: aujourdhui, sujet: contenu.sujet, texte: contenu.texte })
    .eq('id', id).eq('artisan_id', session.uid).eq('statut', 'a_valider').select('id').maybeSingle()
  if (prise.error) {
    if (prise.error.code === '23505') return NextResponse.json({ error: 'Un message est déjà parti aujourd’hui vers ce client. Réessayez demain.' }, { status: 409 })
    console.error('[relances-auto/a-valider] prise', prise.error.message); return NextResponse.json({ error: 'Envoi impossible.' }, { status: 503 })
  }
  if (!prise.data) {
    // Un autre clic l'a prise entre la lecture et maintenant : on dit ce qu'il en est, sans renvoyer.
    const apres = await supabaseAdmin.from('relances_impayes').select('statut').eq('id', id).eq('artisan_id', session.uid).maybeSingle()
    return apres.data?.statut === 'envoyee' ? NextResponse.json({ ok: true, deja: true }) : NextResponse.json({ error: 'Cette relance vient d’être traitée ailleurs. Rechargez la page.' }, { status: 409 })
  }

  const envoi = await sendEmail({
    to: ligne.destinataire, subject: contenu.sujet, text: contenu.texte,
    fromName: art.data.nom?.trim() || 'Votre artisan', replyTo: art.data.email, transactionnel: true,
  })
  if (!envoi.ok) {
    // Refusé : la relance redevient « à valider », à son jour d'origine, avec le texte retouché (rien n'est perdu).
    const rendue = await supabaseAdmin.from('relances_impayes').update({ statut: 'a_valider', jour: ligne.jour }).eq('id', id).eq('artisan_id', session.uid).eq('statut', 'prise').select('id').maybeSingle()
    if (rendue.error) console.error('[relances-auto/a-valider] rendu', rendue.error.message)
    console.error('[relances-auto/a-valider] envoi', envoi.error)
    return NextResponse.json({ error: `La relance n’est pas partie${/plafond/i.test(envoi.error ?? '') ? ' : le plafond d’envois du jour est atteint' : ''}. Elle reste à valider ; réessayez plus tard.` }, { status: 502 })
  }
  const confirmee = await supabaseAdmin.from('relances_impayes').update({ statut: 'envoyee', envoyee_le: new Date().toISOString() }).eq('id', id).eq('artisan_id', session.uid).eq('statut', 'prise').select('id').maybeSingle()
  if (confirmee.error) console.error('[relances-auto/a-valider] confirmation', confirmee.error.message) // l'e-mail est parti : on le dit quand même
  return NextResponse.json({ ok: true })
}
