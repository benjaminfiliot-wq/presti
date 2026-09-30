// lib/agents/acquisition/entrant.ts — la normalisation commune d'une demande entrante (fiche 026-085).
//
// Quelqu'un commente « SITE » ou écrit au compte, ou remplit le formulaire « Recevoir la maquette » (026-145) : dans les
// deux cas la demande passe ici, écrite une seule fois. Module pur : aucun effet, aucune autre dépendance que ./contrat.
// Aucune valeur n'est jamais devinée : une entrée qui ne passe pas est refusée avec ses erreurs.
import { DOMAINES_EXCLUS, DOMAINES_TIERS, METIERS } from './contrat'
import type { Candidat, CanalTrouve } from './contrat'

export interface DemandeEntrante {
  entreprise?: string | null
  metier: string
  commune: string
  site_ou_instagram?: string | null
  email?: string | null
}
export type ResultatEntrant = { ok: true; candidat: Candidat } | { ok: false; erreurs: string[] }
export type SiteNormalise = { domaine: string } | { instagram: string }

const RE_DOMAINE = /^[a-z0-9.-]+\.[a-z]{2,}$/
const RE_INSTAGRAM = /^[a-z0-9._]{1,30}$/
const RE_EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
const estOuSousDomaine = (d: string, liste: readonly string[]) => liste.some((x) => d === x || d.endsWith(`.${x}`))

/** L'identifiant de `METIERS` que désigne ce texte (identifiant ou libellé, sans casse ni accents), sinon null. */
export function normaliserMetier(valeur: unknown): string | null {
  if (typeof valeur !== 'string') return null
  const v = sansAccents(valeur.trim().toLowerCase())
  if (!v) return null
  const m = METIERS.find((x) => x.id === v || sansAccents(x.libelle.toLowerCase()) === v)
  return m ? m.id : null
}

/** La commune, espaces resserrés, de 2 à 80 signes ; sinon null. */
export function normaliserCommune(valeur: unknown): string | null {
  if (typeof valeur !== 'string') return null
  const v = valeur.normalize('NFC').replace(/\s+/g, ' ').trim()
  return v.length >= 2 && v.length <= 80 ? v : null
}

/**
 * Un site ramené à un domaine (minuscules, sans `www.`, hors `DOMAINES_EXCLUS`) ou à un compte Instagram (sans `@`), sinon
 * null. Une adresse `instagram.com/<compte>` est un compte ; un texte sans point ni `@` n'est jamais un domaine.
 */
export function normaliserSite(valeur: unknown): SiteNormalise | null {
  if (typeof valeur !== 'string') return null
  let v = valeur.trim().toLowerCase()
  if (!v) return null
  const arobase = v.startsWith('@')
  if (arobase) v = v.slice(1)
  else {
    v = v.replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    const chemin = v.split(/[/?#]/)
    let hote = (chemin[0] ?? '').replace(/^www\./, '')
    hote = hote.replace(/:\d+$/, '')
    if (hote === 'instagram.com' || hote === 'm.instagram.com') {
      const compte = (chemin[1] ?? '').replace(/^@/, '')
      return RE_INSTAGRAM.test(compte) ? { instagram: compte } : null
    }
    v = hote
  }
  if (arobase) return RE_INSTAGRAM.test(v) ? { instagram: v } : null
  if (RE_DOMAINE.test(v) && !v.includes('..') && !v.startsWith('.') && !v.startsWith('-')) {
    if (estOuSousDomaine(v, DOMAINES_EXCLUS) || DOMAINES_TIERS.includes(v)) return null
    return { domaine: v }
  }
  return null
}

/** Une adresse e-mail bien formée, en minuscules, hors `DOMAINES_TIERS` et `DOMAINES_EXCLUS` ; sinon null. */
export function normaliserEmail(valeur: unknown): string | null {
  if (typeof valeur !== 'string') return null
  const v = valeur.trim().toLowerCase()
  if (v.length > 254 || !RE_EMAIL.test(v)) return null
  const domaine = v.slice(v.indexOf('@') + 1)
  if (domaine.includes('..') || estOuSousDomaine(domaine, DOMAINES_TIERS) || estOuSousDomaine(domaine, DOMAINES_EXCLUS)) return null
  return v
}

export function normaliserDemandeEntrante(d: DemandeEntrante): ResultatEntrant {
  const erreurs: string[] = []
  const metier = normaliserMetier(d?.metier)
  if (!metier) erreurs.push('metier_inconnu')
  const commune = normaliserCommune(d?.commune)
  if (!commune) erreurs.push('commune_invalide')
  const brut = d?.site_ou_instagram
  const site = brut === undefined || brut === null || String(brut).trim() === '' ? null : normaliserSite(brut)
  if (!site) erreurs.push(brut === undefined || brut === null || String(brut).trim() === '' ? 'site_absent' : 'site_invalide')
  let email: string | null = null
  if (d?.email !== undefined && d?.email !== null && String(d.email).trim() !== '') {
    email = normaliserEmail(d.email)
    if (!email) erreurs.push('email_invalide')
  }
  const entreprise = typeof d?.entreprise === 'string' ? d.entreprise.replace(/\s+/g, ' ').trim().slice(0, 120) : ''
  if (erreurs.length || !metier || !commune || !site) return { ok: false, erreurs }

  const domaine = 'domaine' in site ? site.domaine : null
  const instagram = 'instagram' in site ? site.instagram : null
  const canaux: CanalTrouve[] = email ? [{ canal: 'email_sollicite', valeur: email, url_source: 'demande_entrante', nature: 'donnee_par_la_personne' }] : []
  const candidat: Candidat = {
    cle_dedup: domaine ? `domaine:${domaine}` : `instagram:${instagram}`,
    source: 'entrant',
    cible: 'artisan',
    entreprise: entreprise || domaine || `@${instagram}`,
    metier,
    commune,
    domaine,
    instagram,
    faits: [],
    canaux,
    froid: false,
  }
  return { ok: true, candidat }
}
