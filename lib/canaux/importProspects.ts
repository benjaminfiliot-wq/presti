// lib/canaux/importProspects.ts — l'IMPORT des prospects d'un formulaire publicitaire (21/10/2026, drapeau importProspects).
//
// TikTok (Instant Form, « Leads Center » → Télécharger), Facebook / Instagram (Lead Ads : Meta Business Suite → Centre de prospects
// → Télécharger), LinkedIn (Lead Gen Forms : Campaign Manager → Actifs du compte → Formulaires → Télécharger) exportent leurs
// prospects en CSV. Ces exports se déposent ici, deviennent des DEMANDES dans la messagerie, « à contacter ».
//
// Pourquoi pas l'API : l'API Leads de TikTok et Lead Sync de LinkedIn demandent une application développeur approuvée par le réseau
// (et l'autorisation de chaque annonceur) ; celle de Meta, l'application Meta et son examen. Le fichier, lui, est à l'artisan.
//
// RGPD — ces personnes N'ONT PAS écrit à l'artisan sur sa page : elles ont rempli le formulaire de SON annonce pour être recontactées.
// Donc : aucune réponse de l'IA, aucune relance, aucun pilote (lib/canaux/regles.ts, piloteInterdit ; lib/relances.ts) — c'est
// l'artisan qui les contacte, à la main. Seules les colonnes utiles sont gardées (nom, contact, ville, réponses au formulaire) ;
// les identifiants publicitaires (ad_id, campaign_id…) sont écartés.
//
// Module PUR : lecture du CSV, colonnes reconnues, normalisation, doublons. Testé hors ligne par scripts/canaux-reseaux-qa.mjs.
import { LIBELLE_ORIGINE, type Origine } from './reseaux.ts'

export const RESEAUX_IMPORT = ['tiktok', 'facebook', 'instagram', 'linkedin', 'autre'] as const
export type ReseauImport = typeof RESEAUX_IMPORT[number]
export const estReseauImport = (x: unknown): x is ReseauImport => typeof x === 'string' && (RESEAUX_IMPORT as readonly string[]).includes(x)
export const libelleReseauImport = (r: ReseauImport): string => (r === 'autre' ? 'formulaire publicitaire' : LIBELLE_ORIGINE[r as Origine])

export const MAX_OCTETS_IMPORT = 1024 * 1024
export const MAX_LIGNES_IMPORT = 1000

// ── CSV ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Le séparateur : celui qui découpe le mieux la PREMIÈRE ligne hors guillemets (« , » « ; » tabulation). */
export function separateurDe(texte: string): string {
  const premiere = texte.split(/\r?\n/, 1)[0] ?? ''
  let meilleur = ',', max = -1
  for (const sep of [',', ';', '\t']) {
    let n = 0, dans = false
    for (const c of premiere) { if (c === '"') dans = !dans; else if (c === sep && !dans) n++ }
    if (n > max) { max = n; meilleur = sep }
  }
  return meilleur
}

/** Lit un CSV (RFC 4180 : guillemets doublés, champs multilignes), BOM retiré. Rend les lignes non vides. */
export function lireCsv(brut: string, sep = separateurDe(brut.replace(/^﻿/, ''))): string[][] {
  const t = brut.replace(/^﻿/, '')
  const lignes: string[][] = []
  let ligne: string[] = [], champ = '', dans = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (dans) {
      if (c === '"') { if (t[i + 1] === '"') { champ += '"'; i++ } else dans = false }
      else champ += c
    } else if (c === '"' && champ === '') dans = true
    else if (c === sep) { ligne.push(champ); champ = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      ligne.push(champ); champ = ''
      if (ligne.some((x) => x.trim() !== '')) lignes.push(ligne)
      ligne = []
    } else champ += c
  }
  ligne.push(champ)
  if (ligne.some((x) => x.trim() !== '')) lignes.push(ligne)
  return lignes
}

// ── Colonnes ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** « Adresse e-mail » → « adresse_e_mail » : minuscules, sans accents, tout le reste en « _ ». */
export const normaliserEntete = (h: string): string =>
  h.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

export type Role = 'nom_complet' | 'prenom' | 'nom' | 'email' | 'telephone' | 'ville' | 'code_postal' | 'date' | 'formulaire' | 'ignore' | 'question'

const ROLES: [Role, RegExp][] = [
  ['nom_complet', /^(full_?name|name|nom_complet|nom_et_prenom|nom_prenom|prenom_et_nom|prenom_nom|contact_name|lead_name|nom_du_contact|votre_nom)$/],
  ['prenom', /^(first_?name|prenom|given_name|votre_prenom)$/],
  ['nom', /^(last_?name|nom|family_name|surname|nom_de_famille)$/],
  ['email', /^(e_?mail|email_address|e_mail_address|adresse_e_?mail|adresse_mail|courriel|work_email|business_email|email_professionnel|votre_e_?mail)$/],
  ['telephone', /^(phone|phone_number|phone_number_e164|telephone|tel|numero_de_telephone|numero|mobile|portable|work_phone_number|votre_telephone|numero_de_portable)$/],
  ['ville', /^(city|ville|commune|localite|town)$/],
  ['code_postal', /^(zip|zip_code|zip_post_code|post_code|postal_code|postcode|code_postal|cp)$/],
  ['date', /^(created_time|created_at|create_time|date|submit_time|submitted_at|submission_time|date_de_creation|lead_created_time|date_de_soumission|horodatage|timestamp)$/],
  // La TRACE du consentement (audit RGPD du 21/10, M3) : le formulaire que la personne a rempli. Gardée dans la demande, avec la date.
  ['formulaire', /^(form_name|nom_du_formulaire|lead_form_name|formulaire|form)$/],
  // Les identifiants et métadonnées publicitaires : jamais gardés.
  ['ignore', /^(id|lead_id|leadid|ad_id|ad_name|adset_id|adset_name|ad_group_id|ad_group_name|campaign_id|campaign_name|form_id|page_id|page_name|platform|is_organic|advertiser_id|advertiser_name|lead_type|retailer_item_id|inbox_url|creative_id|creative_name|source|status|statut|owner|lead_status|vehicle|custom_disclaimer_responses|consent|gdpr|company_size|ip|user_agent)$/],
]

/**
 * LISTE BLANCHE des réponses au formulaire gardées (audit RGPD du 21/10, M3) : seules les questions qui décrivent le BESOIN (travaux,
 * projet, surface, délai, budget…) entrent dans la demande. Toute autre colonne inconnue (entreprise, poste, date de naissance, champ
 * libre d'un autre usage) est écartée : on ne garde que ce qui sert à répondre à la demande (minimisation, art. 5.1 c).
 */
const QUESTION_GARDEE = /(projet|travaux|besoin|demande|message|description|precision|commentaire|chantier|prestation|service|type_de|surface|superficie|m2|delai|date_souhaitee|quand|budget|logement|maison|appartement|piece|renovation|question)/

export function roleDe(entete: string): Role {
  const n = normaliserEntete(entete)
  if (!n) return 'ignore'
  for (const [role, re] of ROLES) if (re.test(n)) return role
  return QUESTION_GARDEE.test(n) ? 'question' : 'ignore'
}

// ── Valeurs ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Les exports Meta préfixent parfois les champs (« p:+33612345678 », « e:x@y.fr ») ; on les retire. */
const sansPrefixe = (v: string) => v.trim().replace(/^[a-z]:(?=\S)/i, '').trim()
/** Une valeur sûre : sans caractère de contrôle, bornée. */
const propre = (v: string, n: number) => v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, n)
/**
 * Un texte LIBRE venu du fichier (nom, ville, réponses, formulaire) : en plus, un « = + - @ » en tête est neutralisé (apostrophe)
 * — une cellule « =HYPERLINK(…) » reste du texte si la demande est un jour exportée vers un tableur (injection de formule, audit du 21/10).
 */
export const texteLibre = (v: string, n: number): string => { const t = propre(v, n); return /^[=+\-@]/.test(t) ? `'${t}`.slice(0, n) : t }

export function emailValide(v: string): string | null {
  const e = sansPrefixe(v).toLowerCase()
  return e.length <= 200 && /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/.test(e) ? e : null
}

/** Un numéro rendu comparable : +33XXXXXXXXX pour la France (06…, 0033…, +33…), +<indicatif>… sinon ; null si illisible. */
export function telephoneNormalise(v: string): string | null {
  const brut = sansPrefixe(v)
  if (!/^[+0-9 ().\-/]{6,30}$/.test(brut)) return null
  let c = brut.replace(/[^0-9+]/g, '')
  if (c.startsWith('00')) c = `+${c.slice(2)}`
  if (/^0[1-9][0-9]{8}$/.test(c)) c = `+33${c.slice(1)}`
  if (/^33[1-9][0-9]{8}$/.test(c)) c = `+${c}`
  if (!/^\+[1-9][0-9]{6,14}$/.test(c)) return null
  return c
}

/** Clé de doublon d'un contact déjà en base (e-mail en minuscules, ou téléphone normalisé) ; null si ce n'est ni l'un ni l'autre. */
export function cleContact(contact: string | null | undefined): string | null {
  if (!contact) return null
  return emailValide(contact) ?? telephoneNormalise(contact)
}

export type ProspectImporte = {
  /** Numéro de ligne dans le fichier (1 = première ligne de données). */
  ligne: number
  nom: string | null
  email: string | null
  telephone: string | null
  ville: string | null
  /** Le résumé gardé comme premier message de la demande. */
  message: string
  /** Ce que l'import en fera. */
  etat: 'a_importer' | 'doublon_fichier' | 'doublon_existant' | 'sans_contact'
}

export type Analyse = {
  separateur: string
  colonnes: { entete: string; role: Role }[]
  prospects: ProspectImporte[]
  a_importer: number
  erreur?: string
}

/**
 * Lit l'export et rend l'APERÇU : chaque ligne avec son état. `existants` : les clés de contact (cleContact) des demandes déjà dans
 * l'espace de l'artisan — une personne déjà là n'est pas réimportée. Ne lève jamais.
 */
export function analyserImport(brut: string, reseau: ReseauImport, existants: ReadonlySet<string> = new Set(), maintenant = new Date()): Analyse {
  const aujourdhui = maintenant.toISOString().slice(0, 10)
  const vide = (erreur: string): Analyse => ({ separateur: ',', colonnes: [], prospects: [], a_importer: 0, erreur })
  if (typeof brut !== 'string' || !brut.trim()) return vide('Fichier vide.')
  if (brut.length > MAX_OCTETS_IMPORT) return vide('Fichier trop lourd (1 Mo au plus) : exportez une période plus courte.')
  const sep = separateurDe(brut.replace(/^﻿/, ''))
  const lignes = lireCsv(brut, sep)
  if (lignes.length < 2) return vide('Aucune ligne de prospect dans ce fichier.')
  if (lignes.length - 1 > MAX_LIGNES_IMPORT) return vide(`Trop de lignes (${MAX_LIGNES_IMPORT} au plus par import) : exportez une période plus courte.`)
  const entetes = lignes[0].map((h) => propre(h, 120))
  const colonnes = entetes.map((entete) => ({ entete, role: roleDe(entete) }))
  if (!colonnes.some((c) => c.role === 'email' || c.role === 'telephone')) return { separateur: sep, colonnes, prospects: [], a_importer: 0, erreur: 'Aucune colonne e-mail ni téléphone reconnue : est-ce bien l’export des prospects du formulaire ?' }

  const vus = new Set<string>()
  const prospects: ProspectImporte[] = []
  const source = libelleReseauImport(reseau)
  lignes.slice(1).forEach((cellules, i) => {
    const val = (role: Role) => colonnes.map((c, k) => (c.role === role ? texteLibre(cellules[k] ?? '', 300) : '')).find((v) => v) ?? ''
    const complet = val('nom_complet')
    const nom = texteLibre(complet || `${val('prenom')} ${val('nom')}`, 120) || null
    const email = colonnes.map((c, k) => (c.role === 'email' ? emailValide(cellules[k] ?? '') : null)).find(Boolean) ?? null
    const telephone = colonnes.map((c, k) => (c.role === 'telephone' ? telephoneNormalise(cellules[k] ?? '') : null)).find(Boolean) ?? null
    const ville = texteLibre([val('code_postal'), val('ville')].filter(Boolean).join(' '), 120) || null
    const date = propre(val('date'), 40)
    const formulaire = texteLibre(val('formulaire'), 120)
    const reponses = colonnes
      .map((c, k) => (c.role === 'question' && (cellules[k] ?? '').trim() ? `${texteLibre(c.entete.replace(/_/g, ' '), 120)} : ${texteLibre(cellules[k], 1000)}` : null))
      .filter((x): x is string => !!x)
    const message = [
      `Prospect du formulaire ${source}${date ? ` (${date})` : ''} — à contacter : cette personne a demandé à être recontactée, elle ne vous a pas encore écrit.`,
      // La trace du consentement (M3) : quel formulaire, quand, d'où vient le fichier.
      `Consentement : formulaire${formulaire ? ` « ${formulaire} »` : ''} rempli${date ? ` le ${date}` : ''} (export ${source} importé le ${aujourdhui}).`,
      telephone ? `Téléphone : ${telephone}` : null,
      email ? `E-mail : ${email}` : null,
      ville ? `Ville : ${ville}` : null,
      ...reponses,
    ].filter(Boolean).join('\n').slice(0, 5000)
    const cles = [email, telephone].filter((x): x is string => !!x)
    let etat: ProspectImporte['etat'] = 'a_importer'
    if (!cles.length) etat = 'sans_contact'
    else if (cles.some((c) => existants.has(c))) etat = 'doublon_existant'
    else if (cles.some((c) => vus.has(c))) etat = 'doublon_fichier'
    cles.forEach((c) => vus.add(c))
    prospects.push({ ligne: i + 1, nom, email, telephone, ville, message, etat })
  })
  return { separateur: sep, colonnes, prospects, a_importer: prospects.filter((p) => p.etat === 'a_importer').length }
}
