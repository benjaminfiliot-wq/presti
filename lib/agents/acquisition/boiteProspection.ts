// lib/agents/acquisition/boiteProspection.ts — la boîte Gmail d'où part la prospection (06/10/2026, repli coupé le 07/10).
//
// La prospection (relève du standardiste, réponse du répondeur, envoi du facteur et du rédacteur, lien de l'atelier, avis du
// second juge) ne travaille QU'AVEC une boîte DÉDIÉE : PROSPECTION_GMAIL_USER + PROSPECTION_GMAIL_PASS (+ ACQ_ADRESSE_REPONSE).
// Sans elles, ce module rend `null` / '' : chaque route reste « en_attente_gmail », rien n'est lu, rien ne part.
//
// 07/10/2026 — INCIDENT : le 06/10, ce module retombait sur la boîte « de l'entreprise » (IMAP_USER / IMAP_PASS). Cette boîte
// est le Gmail PERSONNEL de Benj : le standardiste y a relevé plus d'un millier de messages personnels, en a tiré des
// oppositions et des signaux STOP, et le répondeur aurait pu y répondre. Le repli est donc COUPÉ par défaut. Il ne se
// réactive que par une variable explicite, PROSPECTION_AUTORISER_BOITE_ENTREPRISE=oui, que seul Benj pose (jamais un agent,
// jamais un script) ; même alors, la boîte doit être un Gmail. Voir docs/agents/vercel-variables-prospection.md.
// Le mot de passe n'est jamais recopié ni journalisé : il est lu là où il est déjà.
import { boiteEntrepriseResolue } from '@/lib/canaux'

export type BoiteProspection = { user: string; pass: string; adresse: string; source: 'prospection' | 'entreprise' }

const GMAIL = /@(gmail|googlemail)\.com$/i

/** Le repli sur la boîte de l'entreprise n'est permis que par la variable explicite posée par Benj, valeur exacte « oui ». */
export function repliEntrepriseAutorise(env: Record<string, string | undefined> = process.env): boolean {
  return (env.PROSPECTION_AUTORISER_BOITE_ENTREPRISE ?? '').trim().toLowerCase() === 'oui'
}

export function boiteProspection(env: Record<string, string | undefined> = process.env, entreprise = boiteEntrepriseResolue): BoiteProspection | null {
  const userP = (env.PROSPECTION_GMAIL_USER ?? '').trim()
  const passP = env.PROSPECTION_GMAIL_PASS ?? ''
  const adresseP = (env.ACQ_ADRESSE_REPONSE ?? '').trim()
  if (userP && passP) return { user: userP, pass: passP, adresse: adresseP || userP, source: 'prospection' }
  // Sans boîte dédiée : rien, sauf autorisation explicite de Benj (la boîte de l'entreprise est son Gmail personnel).
  if (!repliEntrepriseAutorise(env)) return null
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
