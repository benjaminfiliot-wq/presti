// lib/agents/acquisition/boiteProspection.ts — la boîte Gmail d'où part la prospection (06/10/2026).
//
// Jusqu'ici, le facteur, le standardiste, le répondeur et le rédacteur lisaient trois variables propres à la prospection
// (PROSPECTION_GMAIL_USER, PROSPECTION_GMAIL_PASS, ACQ_ADRESSE_REPONSE) qui n'ont jamais été posées sur Vercel : chaque passage
// rendait `en_attente_gmail` et rien ne pouvait partir. Décision de Benj (06/10) : la boîte de l'entreprise déjà configurée
// (IMAP_USER / IMAP_PASS, celle du Poste de contrôle, un compte de travail) sert aussi à la prospection.
// Ordre : les variables propres à la prospection si elles sont posées (une boîte dédiée reste possible), sinon la boîte de
// l'entreprise, mais SEULEMENT si c'est une boîte Gmail (le porteur envoie par le SMTP de Gmail). Le mot de passe n'est jamais
// recopié ni journalisé : il est lu là où il est déjà.
import { boiteEntrepriseResolue } from '@/lib/canaux'

export type BoiteProspection = { user: string; pass: string; adresse: string; source: 'prospection' | 'entreprise' }

const GMAIL = /@(gmail|googlemail)\.com$/i

export function boiteProspection(env: Record<string, string | undefined> = process.env, entreprise = boiteEntrepriseResolue): BoiteProspection | null {
  const userP = (env.PROSPECTION_GMAIL_USER ?? '').trim()
  const passP = env.PROSPECTION_GMAIL_PASS ?? ''
  const adresseP = (env.ACQ_ADRESSE_REPONSE ?? '').trim()
  if (userP && passP) return { user: userP, pass: passP, adresse: adresseP || userP, source: 'prospection' }
  const b = entreprise()
  if (!b || !GMAIL.test(b.user) || !/gmail\.com$/i.test(b.hote)) return null
  return { user: b.user, pass: b.pass, adresse: adresseP || b.user, source: 'entreprise' }
}

/** L'adresse où les prospects répondent : celle posée, sinon celle de la boîte de prospection ; '' si aucune. */
export function adresseReponseProspection(env: Record<string, string | undefined> = process.env, entreprise = boiteEntrepriseResolue): string {
  const posee = (env.ACQ_ADRESSE_REPONSE ?? '').trim()
  if (posee) return posee
  return boiteProspection(env, entreprise)?.adresse ?? ''
}
