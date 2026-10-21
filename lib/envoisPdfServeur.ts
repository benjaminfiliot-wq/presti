// Les ENVOIS au client AVEC PDF (devis, facture), en un seul endroit, appelés APRÈS l'authentification par les routes de l'interface ET par le pilote
// automatique (lib/pilote/executeur.ts, passage chaque minute). Serveur seulement, clé de service.
//
// Extraits tels quels des routes (21/10) pour que le pilote automatique n'ait AUCUN chemin d'envoi à lui : mêmes contrôles
// (propriété du compte, statut, mentions légales bloquantes, canal de la conversation), même écriture après coup. Chaque
// lecture et chaque écriture porte `artisan_id = uid` (ou la propriété vérifiée de la conversation) : la clé de service passe
// outre la RLS, ce filtre est la barrière. `uid` vient TOUJOURS d'une session vérifiée ou d'une ligne de la file du pilote
// rattachée à ce compte — jamais d'un corps de requête.
//
// Rendu : { status, json } — la route le renvoie tel quel ; le pilote lit `status === 200`.
import React from 'react'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { DevisPDF } from '@/lib/DevisPDF'
import { buildPdfData } from '@/lib/devisPdfData'
import { renderPdfToBuffer } from '@/lib/renderPdf'
import { sendEmail } from '@/lib/email'
import { planifierRelances } from '@/lib/relances'
import { plateformeOuverte } from '@/lib/plateformeAcces'
import { mailDevis } from '@/lib/devisMail'
import { enregistrerEnvoi } from '@/lib/devisEnvoi'
import { OU_REMPLIR, mentionsManquantesEmission, messageMentionsBloquantes, versArtisanLegal } from '@/lib/legalArtisan'
import { consommerLimiteStricte, libererLimite } from '@/lib/limites'
import type { ReponseEnvoi } from './envoisServeur'

// Séparé de lib/envoisServeur.ts (messages) : le moteur PDF ne se charge que là où un PDF part (routes Devis/Factures, pilote).
const rep = (status: number, json: Record<string, unknown>): ReponseEnvoi => ({ status, json })
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// ── Devis ────────────────────────────────────────────────────────────────────────────────────────────────

/** POST /api/devis/[id]/envoyer, après la session : PDF joint, statut et date d'envoi, relances de la conversation. */
export async function envoyerDevisServeur(uid: string, id: string): Promise<ReponseEnvoi> {
  const { data: devis } = await supabaseAdmin.from('devis').select('*').eq('id', id).eq('artisan_id', uid).maybeSingle()
  if (!devis) return rep(404, { error: 'Devis introuvable' })
  if (devis.statut === 'accepte') return rep(409, { error: 'Ce devis est déjà accepté par le client : il ne se renvoie pas. Pour une modification, créez un nouveau devis.' })
  if (!devis.client_email && devis.lead_id) {
    // Devis créé par une règle avant que le client ne laisse ses coordonnées : on reprend
    // le contact de la conversation rattachée (uniquement si c'est un email).
    const { data: lead } = await supabaseAdmin.from('leads').select('contact, nom_prospect').eq('id', devis.lead_id).eq('artisan_id', uid).maybeSingle()
    const contact = typeof lead?.contact === 'string' ? lead.contact.trim() : ''
    if (EMAIL.test(contact)) {
      const maj: Record<string, string> = { client_email: contact }
      if (!devis.client_nom && lead?.nom_prospect) maj.client_nom = lead.nom_prospect
      await supabaseAdmin.from('devis').update(maj).eq('id', id).eq('artisan_id', uid)
      Object.assign(devis, maj)
    }
  }
  if (!devis.client_email) return rep(400, { error: "Renseigne l'email du client pour l'envoyer." })

  const { data: lignes } = await supabaseAdmin.from('devis_lignes').select('*').eq('devis_id', id).order('ordre')
  const { data: artisan } = await supabaseAdmin.from('artisans').select('*').eq('id', uid).maybeSingle()

  // Mentions obligatoires BLOQUANTES (audit v4 §3) : un devis sans SIRET ni assurance
  // décennale ne SORT pas — jusqu'à 3 000 € d'amende pour l'artisan. Le brouillon reste
  // intact : on refuse l'émission, pas le travail. HTTP 422 + la liste + où remplir.
  const manquantes = mentionsManquantesEmission(versArtisanLegal(artisan))
  if (manquantes.length) return rep(422, { error: messageMentionsBloquantes(manquantes, 'ce devis'), code: 'mentions_manquantes', manquantes, lien: OU_REMPLIR.lien })

  const pdfData = buildPdfData(devis, lignes ?? [], artisan ?? {})
  const buffer = await renderPdfToBuffer(React.createElement(DevisPDF, { d: pdfData }))
  const base64 = Buffer.from(buffer).toString('base64')

  const nomEnt = artisan?.nom || 'votre artisan'
  const mail = mailDevis(devis, nomEnt)
  const r = await sendEmail({
    to: devis.client_email,
    subject: mail.subject,
    text: mail.text,
    // Marque blanche : le client final doit voir le nom de SON artisan comme expéditeur, pas « Presti ».
    fromName: artisan?.nom?.trim() || 'Votre artisan',
    replyTo: artisan?.email || undefined,
    attachments: [{ filename: `${devis.numero || 'devis'}.pdf`, content: base64 }],
    transactionnel: true, // le geste de l'artisan : la pause des agents ne le coupe pas (lib/email.ts)
  })
  if (!r.ok) { console.error('[devis envoyer]', r.error); return rep(502, { error: 'Envoi impossible pour le moment.' }) }

  // C1 (audit du 18/10) : statut ET date d'envoi, par une seule écriture partagée avec le test de cohérence (lib/devisEnvoi.ts).
  await enregistrerEnvoi(devis, uid)

  // Relances J+2 / J+5 / J+10 d'un devis rattaché à une conversation (lib/relances.ts), plateforme ouverte seulement (Studio+).
  let relances = 0
  if (devis.lead_id && plateformeOuverte(artisan ?? {})) {
    const { data: lead } = await supabaseAdmin.from('leads').select('id, statut').eq('id', devis.lead_id).eq('artisan_id', uid).maybeSingle()
    if (lead && lead.statut !== 'gagne' && lead.statut !== 'perdu') {
      await supabaseAdmin.from('leads').update({ statut: 'repondu', updated_at: new Date().toISOString() }).eq('id', lead.id).eq('artisan_id', uid)
      relances = await planifierRelances(lead.id)
    }
  }
  return rep(200, { ok: true, relances })
}

// ── Factures ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/factures/[id]/envoyer, après la session : envoie au client, par e-mail, une facture DÉJÀ émise (scellée) ou payée,
 * PDF joint. N'émet rien, n'encaisse rien, ne modifie pas la facture (scellée). Un avoir ou une facture annulée ne s'envoie pas
 * par ce chemin.
 */
/** Envois de factures par jour et par compte (audit du 21/10, F3). */
export const ENVOIS_FACTURES_JOUR = 20
export async function envoyerFactureServeur(uid: string, id: string): Promise<ReponseEnvoi> {
  // Audit du 21/10 (F3) : 20 envois de factures par jour et par compte (fail-closed), et la MÊME facture pas deux fois en 10 minutes
  // (double clic, carte confirmée deux fois, pilote + clic) ; un envoi qui échoue rend la réclamation de la facture.
  if (!(await consommerLimiteStricte(`envoi-facture:${uid}`, ENVOIS_FACTURES_JOUR, 86_400))) return rep(429, { error: `Limite de ${ENVOIS_FACTURES_JOUR} envois de factures par jour atteinte : réessayez demain.` })
  const cle = `envoi-facture-id:${id}`
  if (!(await consommerLimiteStricte(cle, 1, 600))) return rep(409, { error: 'Cette facture vient d’être envoyée (ou part en ce moment) : rien n’a été renvoyé.' })
  let r: ReponseEnvoi | null = null
  try { r = await envoyerFactureUneFois(uid, id); return r } finally { if (!r || r.status !== 200) await libererLimite(cle) }
}

async function envoyerFactureUneFois(uid: string, id: string): Promise<ReponseEnvoi> {
  const { data: facture } = await supabaseAdmin.from('factures').select('*').eq('id', id).eq('artisan_id', uid).maybeSingle()
  if (!facture) return rep(404, { error: 'Facture introuvable' })
  if (facture.avoir_de) return rep(409, { error: 'Un avoir ne s’envoie pas par ce chemin.' })
  if (facture.statut !== 'emise' && facture.statut !== 'payee') return rep(409, { error: `La facture n’est pas émise (statut : ${facture.statut ?? '—'}) : rien à envoyer.` })
  const to = typeof facture.client_email === 'string' ? facture.client_email.trim() : ''
  if (!EMAIL.test(to)) return rep(400, { error: 'Renseignez l’e-mail du client pour envoyer la facture.' })
  const { data: lignes } = await supabaseAdmin.from('factures_lignes').select('*').eq('facture_id', id).order('ordre')
  const { data: artisan } = await supabaseAdmin.from('artisans').select('*').eq('id', uid).maybeSingle()
  const manquantes = mentionsManquantesEmission(versArtisanLegal(artisan))
  if (manquantes.length) return rep(422, { error: messageMentionsBloquantes(manquantes, 'cette facture'), code: 'mentions_manquantes', manquantes, lien: OU_REMPLIR.lien })

  const pdfData = buildPdfData(facture, lignes ?? [], artisan ?? {}, 'facture')
  const buffer = await renderPdfToBuffer(React.createElement(DevisPDF, { d: pdfData }))
  const nom = artisan?.nom?.trim() || 'Votre artisan'
  const client = typeof facture.client_nom === 'string' && facture.client_nom.trim() ? facture.client_nom.trim() : ''
  const r = await sendEmail({
    to,
    subject: `Facture ${facture.numero ?? ''} — ${nom}`.replace(/\s+/g, ' ').trim(),
    text: `Bonjour${client ? ' ' + client : ''},\n\nVeuillez trouver ci-joint la facture ${facture.numero ?? ''}${facture.objet ? ` (${facture.objet})` : ''}.${facture.statut === 'payee' ? '\nElle est réglée : merci.' : facture.date_echeance ? `\nÉchéance : ${String(facture.date_echeance).slice(0, 10).split('-').reverse().join('/')}.` : ''}\n\nBien cordialement,\n${nom}`,
    fromName: nom, // marque blanche
    replyTo: artisan?.email || undefined,
    attachments: [{ filename: `${facture.numero || 'facture'}.pdf`, content: Buffer.from(buffer).toString('base64') }],
    transactionnel: true,
  })
  if (!r.ok) { console.error('[facture envoyer]', r.error); return rep(502, { error: 'Envoi impossible pour le moment.' }) }
  return rep(200, { ok: true })
}

