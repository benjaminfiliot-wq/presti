// lib/agents/acquisition/expediteur.ts — l'adresse qu'un expéditeur écrit dans l'en-tête From, lue en code (témoin du juge garde-stop-qa).
//
// Un STOP ou une demande RGPD reçu en NOUVEL e-mail (hors d'un fil) n'a ni envoi, ni conversation, ni prospect : la seule clé
// d'opposition que l'on ait est l'adresse de son expéditeur. Ce module la lit sans jamais rien deviner : une valeur qui n'est
// pas une adresse bien formée rend null, et l'appelant ouvre alors une carte (jamais un silence). Module pur, sans effet.
import { MESSAGERIES_GRATUITES } from './contrat'
import type { ClesOpposition } from './contrat'

const RE_ADRESSE = /^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/

/** « Jean Dupont <Jean.Dupont@Exemple.fr> », « "Dupont, Jean" <…> » ou l'adresse nue → l'adresse en minuscules, sinon null. */
export function adresseExpediteur(brut: unknown): string | null {
  if (typeof brut !== 'string') return null
  const t = brut.normalize('NFC').trim()
  if (!t || t.length > 320) return null
  const chevrons = /<([^<>]*)>\s*$/.exec(t)
  const candidate = (chevrons ? chevrons[1] : t).trim().toLowerCase()
  if (candidate.length > 254 || candidate.includes('..') || !RE_ADRESSE.test(candidate)) return null
  return candidate
}

/** L'adresse sans son « +étiquette » (jean+devis@x.fr → jean@x.fr), sinon null quand il n'y en a pas. */
export function adresseDeBase(adresse: string): string | null {
  const arobase = adresse.indexOf('@')
  const local = adresse.slice(0, arobase)
  const plus = local.indexOf('+')
  if (plus <= 0) return null
  return `${local.slice(0, plus)}${adresse.slice(arobase)}`
}

/** Le domaine d'une adresse, sauf s'il s'agit d'une messagerie gratuite (un STOP depuis @orange.fr ne ferme pas tout orange.fr). */
export function domaineProfessionnel(adresse: string): string | null {
  const d = adresse.slice(adresse.indexOf('@') + 1)
  return MESSAGERIES_GRATUITES.includes(d) ? null : d
}

/** Les clés supplémentaires d'une opposition définitive : l'alias sans étiquette, puis le domaine professionnel. */
export function clesSupplementaires(adresse: string): ClesOpposition[] {
  const sortie: ClesOpposition[] = []
  const base = adresseDeBase(adresse)
  if (base) sortie.push({ email: base })
  const domaine = domaineProfessionnel(adresse)
  if (domaine) sortie.push({ domaine })
  return sortie
}
