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
export const DELAI_TEXTE = `Livré sous ${DELAI_ANNONCE} après la validation humaine de votre site par Presti.`

/** Le bloc de vente (v15 §2.1), rendu par la landing et /abonnement HORS grille d'abonnement, uniquement quand le
 *  drapeau `siteCommandeVente` est levé. Trois phrases, pas une promesse de classement, pas un délai autre que le
 *  nôtre. Le prix vient d'ici, comme partout. */
export const SITE_A_LA_DEMANDE = {
  titre: `Le site, à la demande — ${PRIX_SITE_TEXTE} une fois`,
  phrases: [
    'Un site à votre nom, avec une page par commune que vous servez vraiment : c’est ça, le référencement local bien fait.',
    'Vos photos, votre métier, vos coordonnées — rien d’inventé — et votre page de conversation pour que la demande arrive chez vous.',
    `${PRIX_SITE_TEXTE} une fois, sans abonnement, TVA non applicable (art. 293 B du CGI). ${DELAI_TEXTE}`,
  ],
  bouton: 'Commander mon site',
  lien: '/site/commander',
} as const

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
export type ChiffreArtisan = { valeur: string; unite?: string; legende: string }
export type ArtisanSite = {
  prenom: string
  nom: string
  installation: number | null
  parcours: string
  citation: string
  chiffres?: ChiffreArtisan[] | null
}
export type Matiere = {
  artisan?: ArtisanSite | null
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
const texteArtisan = (v: unknown): string => {
  const nettoye = String(v ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().replace(/(?<=\p{L})'(?=\p{L})/gu, '’')
  return nettoye.length <= 2000 ? nettoye : ''
}
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
  const artisan = (m.artisan && typeof m.artisan === 'object' && !Array.isArray(m.artisan) ? m.artisan : null) as Record<string, unknown> | null
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
      artisan: artisan ? {
        prenom: texteArtisan(artisan.prenom),
        nom: texteArtisan(artisan.nom),
        installation: typeof artisan.installation === 'number' && Number.isInteger(artisan.installation) ? artisan.installation : null,
        parcours: texteArtisan(artisan.parcours),
        citation: texteArtisan(artisan.citation),
        ...(Object.prototype.hasOwnProperty.call(artisan, 'chiffres') ? {
          chiffres: artisan.chiffres === null ? null : Array.isArray(artisan.chiffres) ? artisan.chiffres.slice(0, 3).map((brut) => {
            const c = (brut && typeof brut === 'object' && !Array.isArray(brut) ? brut : {}) as Record<string, unknown>
            return {
              valeur: texteArtisan(c.valeur),
              ...(c.unite !== undefined && c.unite !== null && c.unite !== '' ? { unite: texteArtisan(c.unite) } : {}),
              legende: texteArtisan(c.legende),
            }
          }) : [],
        } : {}),
      } : null,
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
  const verifierBorne = (valeur: string | undefined, borne: number, nom: string) => {
    if (valeur && valeur.length > borne) e.push(`Votre parcours : ${nom} dépasse ${borne} signes (${valeur.length}) : raccourcissez ce texte, rien n’est coupé à votre place.`)
  }
  if (b.domaine_mode === 'existant' && !b.domaine) e.push('Le nom de domaine indiqué n’est pas valide (ex. martin-plomberie.fr).')
  if (!b.metier) e.push('Le métier principal manque.')
  if (b.communes.length < 1) e.push('Indiquez au moins une commune réellement servie — c’est la matière du référencement local.')
  const m = b.matiere
  const a = m.artisan
  if (!a) {
    e.push('Votre parcours : indiquez votre prénom, votre nom, votre année d’installation, votre parcours et une phrase signée.')
  } else {
    verifierBorne(a.prenom, 40, 'le prénom')
    verifierBorne(a.nom, 60, 'le nom')
    verifierBorne(a.parcours, 140, 'le parcours')
    verifierBorne(a.citation, 160, 'la phrase signée')
    a.chiffres?.forEach((c, index) => {
      verifierBorne(c.valeur, 12, `la valeur du chiffre ${index + 1}`)
      verifierBorne(c.unite, 12, `l’unité du chiffre ${index + 1}`)
      verifierBorne(c.legende, 60, `la légende du chiffre ${index + 1}`)
    })
    if (!a.prenom || !a.nom) e.push('Votre parcours : le prénom et le nom manquent.')
    if (!Number.isInteger(a.installation) || a.installation! < 1960 || a.installation! > new Date().getFullYear()) e.push('Votre parcours : indiquez une année d’installation valide.')
    if (!a.parcours || /[\r\n]/.test(a.parcours)) e.push('Votre parcours : décrivez votre parcours en une ligne (140 signes au plus).')
    if (!a.citation || a.citation.length < 20 || !/(?<![\p{L}])(?:je|me|moi|mon|ma|mes)(?![\p{L}])|(?<![\p{L}])[jm]['’](?=\p{L})/iu.test(a.citation)) e.push('Votre parcours : la phrase signée doit compter 20 à 160 signes et être à la première personne.')
    if (a.chiffres === undefined || (a.chiffres !== null && (!Array.isArray(a.chiffres) || a.chiffres.length !== 3 || a.chiffres.some((c) => {
      const nombre = Number(String(c.valeur).replace(',', '.').replace(/\s/g, ''))
      return !c.valeur || c.valeur.length > 12 || !Number.isFinite(nombre) || nombre <= 0 || (c.unite?.length ?? 0) > 12 || !c.legende || c.legende.length > 60
    })))) e.push('Votre parcours : renseignez trois chiffres positifs avec leur légende, ou choisissez de ne pas en donner.')
  }
  if ((m.photos?.length ?? 0) < PHOTOS_MIN) e.push(`Ajoutez au moins ${PHOTOS_MIN} photos de chantiers : elles sont la matière principale du site, jamais un visuel de remplacement.`)
  if (!m.adresse || m.adresse.length < 8) e.push('L’adresse professionnelle manque (mentions légales et fiche Google).')
  if (!m.siren || !sirenValide(m.siren)) e.push('Le SIREN doit faire 9 chiffres valides.')
  if (!m.horaires) e.push('Les horaires manquent.')
  if (!m.decennale?.assureur || !m.decennale?.numero) e.push('L’assurance décennale (assureur et numéro) est obligatoire sur un site d’artisan.')
  return e
}
