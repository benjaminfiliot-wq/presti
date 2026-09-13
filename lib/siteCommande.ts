// lib/siteCommande.ts — le site à la demande (prompt v15 §3) : ce qu'une commande EST, sans serveur.
//
// Importable côté client (les quatre écrans) comme côté serveur (routes, webhook) : aucun secret, aucun
// accès à la base. Le prix n'existe qu'ici — 300 €, une fois ; l'entreprise est en franchise en base
// (art. 293 B du CGI), la TVA n'est pas applicable, donc 300 € nets — et les états sont ceux du §3.2,
// précédés de 'brouillon' : le dossier se remplit avant de payer, rien ne se génère avant le webhook.
import { normalizeDomain } from '@/lib/vercelDomains'

export const PRIX_SITE_CENTS = 30000
export const PRIX_SITE_TEXTE = '300 €'
export const DELAI_ANNONCE = '48 h ouvrées'

export const ETATS = ['brouillon', 'payee', 'generee', 'validee', 'en_ligne'] as const
export type EtatCommande = (typeof ETATS)[number]
/** Les seuls passages permis. « Renvoyer en génération avec une consigne » = retour de generee à payee. */
export const TRANSITIONS: Record<EtatCommande, EtatCommande[]> = {
  brouillon: ['payee'],
  payee: ['generee'],
  generee: ['validee', 'payee'],
  validee: ['en_ligne'],
  en_ligne: [],
}
export const transitionValide = (de: EtatCommande, vers: EtatCommande): boolean => TRANSITIONS[de]?.includes(vers) ?? false
export const LIBELLE_ETAT: Record<EtatCommande, string> = {
  brouillon: 'Dossier en cours',
  payee: 'Payée — en fabrication',
  generee: 'Aperçu prêt — en relecture',
  validee: 'Validée — mise en ligne en cours',
  en_ligne: 'En ligne',
}

export const MODES_DOMAINE = ['existant', 'a_prendre', 'aucun'] as const
export type ModeDomaine = (typeof MODES_DOMAINE)[number]

export type Photo = { url: string; legende?: string; role?: 'avant' | 'apres' | 'chantier' }
export type Matiere = {
  photos?: Photo[]
  logo_url?: string | null
  adresse?: string
  siren?: string
  horaires?: string
  decennale?: { assureur?: string; numero?: string }
  avis_google?: { url?: string }
}
export type Brouillon = {
  domaine_mode: ModeDomaine
  domaine: string | null
  metier: string
  metiers_secondaires: string[]
  communes: string[]
  matiere: Matiere
}
export type Commande = Brouillon & {
  id: string
  artisan_id: string | null
  email: string
  etat: EtatCommande
  prix_cents: number
  stripe_session_id: string | null
  paye_le: string | null
  genere_le: string | null
  valide_le: string | null
  en_ligne_le: string | null
  consigne: string | null
  cree_le: string
  modifie_le: string
}

export const PHOTOS_MIN = 3
export const PHOTOS_MAX = 40
export const COMMUNES_MAX = 40
export const METIERS_SECONDAIRES_MAX = 4

const texte = (v: unknown, max: number): string => String(v ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
const liste = (v: unknown, max: number, taille: number): string[] => {
  const src = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,;\n]/) : []
  return src.map((x) => texte(x, taille)).filter((t) => t.length >= 2).filter((t, i, a) => a.findIndex((u) => u.toLowerCase() === t.toLowerCase()) === i).slice(0, max)
}
const url = (v: unknown, max = 500): string => { const t = texte(v, max); return /^https:\/\/[^\s"'<>]+$/.test(t) ? t : '' }

/** SIREN : 9 chiffres et la clé de Luhn — un numéro tapé de travers ne finit pas sur un site. */
export function sirenValide(brut: string): boolean {
  const s = String(brut ?? '').replace(/\s/g, '')
  if (!/^\d{9}$/.test(s)) return false
  let somme = 0
  for (let i = 0; i < 9; i++) {
    let n = Number(s[i])
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9 }
    somme += n
  }
  return somme % 10 === 0
}

/** Nettoie ce qui vient des écrans : on ne garde que ce qu'on connaît, borné, sans HTML. Jamais de rejet
 *  ici — un brouillon incomplet se sauvegarde ; c'est `erreursAvantPaiement` qui bloque le paiement. */
export function nettoyerBrouillon(brut: unknown): Brouillon {
  const b = (brut && typeof brut === 'object' ? brut : {}) as Record<string, unknown>
  const m = (b.matiere && typeof b.matiere === 'object' ? b.matiere : {}) as Record<string, unknown>
  const dec = (m.decennale && typeof m.decennale === 'object' ? m.decennale : {}) as Record<string, unknown>
  const avis = (m.avis_google && typeof m.avis_google === 'object' ? m.avis_google : {}) as Record<string, unknown>
  const mode = MODES_DOMAINE.includes(b.domaine_mode as ModeDomaine) ? (b.domaine_mode as ModeDomaine) : 'aucun'
  const photos: Photo[] = (Array.isArray(m.photos) ? m.photos : [])
    .map((p) => (p && typeof p === 'object' ? p : {}) as Record<string, unknown>)
    .map((p) => ({ url: url(p.url), legende: texte(p.legende, 140) || undefined, role: (['avant', 'apres', 'chantier'] as const).find((r) => r === p.role) }))
    .filter((p) => p.url)
    .slice(0, PHOTOS_MAX)
  return {
    domaine_mode: mode,
    domaine: mode === 'existant' ? normalizeDomain(texte(b.domaine, 253)) : mode === 'a_prendre' ? (normalizeDomain(texte(b.domaine, 253)) || null) : null,
    metier: texte(b.metier, 60),
    metiers_secondaires: liste(b.metiers_secondaires, METIERS_SECONDAIRES_MAX, 60),
    communes: liste(b.communes, COMMUNES_MAX, 80),
    matiere: {
      photos,
      logo_url: url(m.logo_url) || null,
      adresse: texte(m.adresse, 200),
      siren: texte(m.siren, 20).replace(/\s/g, ''),
      horaires: texte(m.horaires, 300),
      decennale: { assureur: texte(dec.assureur, 80), numero: texte(dec.numero, 60) },
      avis_google: { url: url(avis.url) },
    },
  }
}

/** Ce qui manque pour payer — chaque phrase est affichable telle quelle sur l'écran 4. */
export function erreursAvantPaiement(b: Brouillon): string[] {
  const e: string[] = []
  if (b.domaine_mode === 'existant' && !b.domaine) e.push('Le nom de domaine indiqué n’est pas valide (ex. martin-plomberie.fr).')
  if (!b.metier) e.push('Le métier principal manque.')
  if (b.communes.length < 1) e.push('Indiquez au moins une commune réellement servie — c’est la matière du référencement local.')
  const m = b.matiere
  if ((m.photos?.length ?? 0) < PHOTOS_MIN) e.push(`Ajoutez au moins ${PHOTOS_MIN} photos de chantiers : elles sont la matière principale du site, jamais un visuel de remplacement.`)
  if (!m.adresse || m.adresse.length < 8) e.push('L’adresse professionnelle manque (mentions légales et fiche Google).')
  if (!m.siren || !sirenValide(m.siren)) e.push('Le SIREN doit faire 9 chiffres valides.')
  if (!m.horaires) e.push('Les horaires manquent.')
  if (!m.decennale?.assureur || !m.decennale?.numero) e.push('L’assurance décennale (assureur et numéro) est obligatoire sur un site d’artisan.')
  return e
}
