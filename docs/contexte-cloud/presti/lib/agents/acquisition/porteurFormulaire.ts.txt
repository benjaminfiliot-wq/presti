// lib/agents/acquisition/porteurFormulaire.ts — la partie pure du porteur du formulaire (fiche 026-095).
//
// Deux fonctions, aucune entrée-sortie hors la page qu'on lui tend :
//   · planDeRemplissage(formulaire, envoi) : ce que le porteur écrit dans le formulaire, champ par champ, ou la raison pour
//     laquelle il ne soumet rien. Le nom est celui de l'expéditeur, l'e-mail celui de la prospection, le téléphone reste
//     VIDE (jamais un faux numéro), le motif est « Autre » ou son équivalent, aucune case « copie », « newsletter » ou
//     « inscription » n'est jamais cochée ; seule une case OBLIGATOIRE de consentement au traitement du message peut l'être ;
//   · controlesEnDirect(page, options) : ce que le navigateur voit et que le HTML lu par le Lecteur (026-020) ne montrait
//     pas (une protection chargée par un script, un champ masqué par la feuille de style). Au moindre signe, un ABANDON
//     DÉFINITIF : ni nouvel essai, ni contournement, ni rien de soumis (garde-fou 5 de la voie gratuite).
//
// Ce module n'importe que ./contrat : il tourne tel quel sur l'usine et sous le juge, sans navigateur (le navigateur, c'est la
// page qu'on passe en argument : seule sa méthode `evaluate(expression)` est appelée).
import { NOM_EXPEDITEUR } from './contrat'
import type { Formulaire, RaisonAbandon, TechnologieFormulaire } from './contrat'

/** Les raisons d'abandon propres au porteur, en plus de celles du contrat (026-016). Toutes sont définitives. */
export type RaisonPorteur = RaisonAbandon | 'longueur' | 'champ_inconnu' | 'formulaire_change' | 'texte_vide'

export type PlanDeRemplissage =
  | { ok: true; champs: { nom: string; valeur: string }[]; cases: string[]; motif: string | null }
  | { ok: false; raison: RaisonPorteur }

export interface EnvoiAPorter {
  texte: string
  objet: string | null
  /** L'adresse de prospection : celle où la personne peut répondre. Jamais une adresse relevée sur un site. */
  adresse: string
}

const DEVIS = /devis/i
const AUTRE = /^\s*autres?\b/i
const NEUTRE = /\b(?:information|renseignement|contact|question|demande g[eé]n[eé]rale)/i
const PLACEHOLDER = /^\s*(?:[-–—.\s]*|choisir.*|s[eé]lectionn.*|please.*|--.*)$/i
const CASE_INTERDITE = /copie|newsletter|lettre d|inscri|abonn|offres?|partenaires?|promotion|marketing|souhaite recevoir|recevoir (?:une|les|nos)/i
const CASE_CONSENTEMENT = /rgpd|consent|accept|traitement|donn[eé]es|privacy|confidentialit|cgu|cgv|mentions|politique/i
const TEXTE_RE = /^(?:text|search|url|number|password|email|tel|textarea|)$/i

const minuscule = (s: string) => s.toLowerCase()

/** Le rôle d'un champ du formulaire, d'après son type et son nom ; `null` pour un champ que le porteur ne sait pas remplir. */
function roleDuChamp(nom: string, type: string): 'email' | 'telephone' | 'message' | 'objet' | 'prenom' | 'nom' | 'nom_complet' | 'societe' | null {
  const n = minuscule(nom)
  const t = minuscule(type)
  if (t === 'email' || /e-?mail|courriel|mail/.test(n)) return 'email'
  if (t === 'tel' || /t[eé]l|phone|mobile|portable/.test(n)) return 'telephone'
  if (t === 'textarea' || /message|msg|commentaire|demande|texte|body|content|projet/.test(n)) return 'message'
  if (/sujet|objet|subject|titre/.test(n)) return 'objet'
  if (/soci[eé]t[eé]|entreprise|company|organi[sz]ation|raison/.test(n)) return 'societe'
  if (/pr[eé]nom|first/.test(n)) return 'prenom'
  if (/^(?:nom|last|family|lastname|surname)$|nom[-_ ]?(?:de[-_ ]?famille|famille)/.test(n)) return 'nom'
  if (/name|nom|contact|identit|auteur/.test(n)) return 'nom_complet'
  return null
}

/** Le motif à choisir dans une liste : « Autre » ou son équivalent ; null si la liste n'en offre aucun. */
function choisirMotif(motifs: string[]): string | null {
  const propres = motifs.map((m) => m.trim()).filter((m) => m && !PLACEHOLDER.test(m))
  return propres.find((m) => AUTRE.test(m)) ?? propres.find((m) => NEUTRE.test(m) && !DEVIS.test(m)) ?? null
}

/**
 * Le plan de remplissage d'un formulaire, ou la raison d'abandon. Pur : aucune lecture de page, aucune écriture.
 * Le téléphone n'est jamais rempli ; un téléphone obligatoire fait abandonner (`telephone_requis`).
 */
export function planDeRemplissage(formulaire: Formulaire, envoi: EnvoiAPorter): PlanDeRemplissage {
  const texte = String(envoi.texte ?? '')
  if (!texte.trim()) return { ok: false, raison: 'texte_vide' }
  if (formulaire.telephone_requis) return { ok: false, raison: 'telephone_requis' }

  // Le motif : décidé sur la liste du formulaire (les options d'un `select` obligatoire), avant tout champ.
  const motifs = Array.isArray(formulaire.motifs) ? formulaire.motifs : []
  const utiles = motifs.filter((m) => m && m.trim() && !PLACEHOLDER.test(m))
  let motif: string | null = null
  if (utiles.length) {
    if (utiles.every((m) => DEVIS.test(m))) return { ok: false, raison: 'motif_devis_seul' }
    motif = choisirMotif(utiles)
  }

  const champs: { nom: string; valeur: string }[] = []
  const cases: string[] = []
  let aEmail = false
  let aMessage = false
  const objet = String(envoi.objet ?? '').trim()
  const nomComplet = NOM_EXPEDITEUR
  const [prenom, ...reste] = nomComplet.split(' ')
  const famille = reste.join(' ')

  for (const c of formulaire.champs ?? []) {
    const type = minuscule(String(c.type ?? 'text'))
    if (['hidden', 'submit', 'button', 'reset', 'image', 'file'].includes(type)) {
      if (type === 'file' && c.requis) return { ok: false, raison: 'champ_inconnu' }
      continue
    }
    if (type === 'checkbox') {
      if (CASE_INTERDITE.test(c.nom)) continue
      if (c.requis) {
        if (!CASE_CONSENTEMENT.test(c.nom)) return { ok: false, raison: 'champ_inconnu' }
        cases.push(c.nom)
      }
      continue
    }
    if (type === 'radio') {
      if (c.requis) return { ok: false, raison: 'champ_inconnu' }
      continue
    }
    if (type === 'select') {
      if (motif !== null) champs.push({ nom: c.nom, valeur: motif })
      else if (c.requis) return { ok: false, raison: 'champ_inconnu' }
      continue
    }
    if (!TEXTE_RE.test(type)) {
      if (c.requis) return { ok: false, raison: 'champ_inconnu' }
      continue
    }
    const role = roleDuChamp(c.nom, type)
    let valeur: string | null = null
    switch (role) {
      case 'email': valeur = envoi.adresse; aEmail = true; break
      case 'telephone':
        if (c.requis) return { ok: false, raison: 'telephone_requis' }
        continue // laissé vide, jamais un faux numéro
      case 'message': valeur = texte; aMessage = true; break
      case 'objet': valeur = objet || null; break
      case 'nom_complet': valeur = nomComplet; break
      case 'prenom': valeur = prenom; break
      case 'nom': valeur = famille || nomComplet; break
      case 'societe': valeur = 'Presti'; break
      default: valeur = null
    }
    if (valeur === null) {
      if (c.requis) return { ok: false, raison: 'champ_inconnu' }
      continue
    }
    const max = typeof c.max === 'number' && c.max > 0 ? c.max : role === 'message' ? formulaire.longueur_max_message : null
    if (max && valeur.length > max) return { ok: false, raison: 'longueur' }
    champs.push({ nom: c.nom, valeur })
  }
  if (!aEmail || !aMessage) return { ok: false, raison: 'champ_inconnu' }
  return { ok: true, champs, cases, motif }
}

/**
 * Une case OBLIGATOIRE vue dans le navigateur et absente du plan (le formulaire structuré lu par le Lecteur n'en gardait pas
 * toujours la trace) : « cocher » si c'est le consentement au traitement du message, « abandon » sinon (copie, newsletter,
 * inscription, ou une case que le porteur ne comprend pas : il ne coche jamais à l'aveugle). Pure.
 */
export function decisionCaseVue(nom: string, libelle: string): 'cocher' | 'abandon' {
  const texte = `${nom} ${libelle}`
  if (CASE_INTERDITE.test(texte) || /commercia|publicit|prospection|partag|revend|c[eé]d[eé]e?s? /i.test(texte)) return 'abandon'
  return CASE_CONSENTEMENT.test(texte) ? 'cocher' : 'abandon'
}

// ── Les contrôles dans le navigateur ────────────────────────────────────────────────────────────────────────────────────────

/** Ce que la page (un objet minimal : Playwright ou une doublure) sait faire ici : évaluer une expression et rendre le résultat. */
export interface PageObservable {
  evaluate(expression: string): Promise<unknown>
}

export interface ChampVu {
  balise: string
  type: string
  nom: string
  requis: boolean
  max: number | null
  masque: boolean
  tabindex: number | null
  ariaHidden: boolean
  options: string[]
}
export interface FormulaireVu {
  action: string | null
  methode: string
  champs: ChampVu[]
}
/** Ce que le navigateur montre de la page, une fois ses scripts exécutés. */
export interface InstantanePage {
  texte: string
  html: string
  formulaire: FormulaireVu | null
}
export interface OptionsControle {
  /** Le code HTTP de la réponse qui a servi la page. */
  statut?: number | null
  /** L'URL d'action enregistrée par le Lecteur : son hôte doit être celui du formulaire vu. */
  urlAction?: string | null
  /** La technologie enregistrée par le Lecteur. */
  technologie?: TechnologieFormulaire | null
  /** La longueur du texte à soumettre : un champ de message plus court fait abandonner (`longueur`). */
  longueurTexte?: number | null
}
export type ControleDirect =
  | { ok: true; action: string | null; technologie: TechnologieFormulaire }
  | { ok: false; raison: RaisonPorteur }

/** Un message du Presti tient au moins là-dedans (la première phrase obligatoire fait déjà 117 signes). */
export const LONGUEUR_MIN_MESSAGE = 300

/**
 * Le script exécuté DANS la page : il rend un instantané JSON (texte visible, HTML, champs du formulaire et s'ils sont
 * visibles à l'écran). Une expression en clair, pas une fonction : elle est envoyée telle quelle au navigateur.
 */
export const SCRIPT_INSTANTANE = `(() => {
  const forme = [...document.forms].find((f) => f.querySelector('textarea')) || null
  const masque = (el) => {
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2 || r.right <= 0 || r.bottom <= 0) return true
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n)
      if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse' || parseFloat(s.opacity) === 0) return true
    }
    return false
  }
  const champs = forme ? [...forme.querySelectorAll('input, textarea, select')].map((el) => ({
    balise: el.tagName.toLowerCase(),
    type: (el.getAttribute('type') || (el.tagName === 'TEXTAREA' ? 'textarea' : el.tagName === 'SELECT' ? 'select' : 'text')).toLowerCase(),
    nom: el.getAttribute('name') || '',
    requis: el.required === true || el.getAttribute('aria-required') === 'true',
    max: el.maxLength > 0 ? el.maxLength : null,
    masque: masque(el),
    tabindex: el.getAttribute('tabindex') === null ? null : Number(el.getAttribute('tabindex')),
    ariaHidden: !!el.closest('[aria-hidden="true"]'),
    options: el.tagName === 'SELECT' ? [...el.options].map((o) => (o.textContent || '').trim()) : [],
  })) : []
  return {
    texte: (document.body ? document.body.innerText : '').slice(0, 200000),
    html: document.documentElement.outerHTML.slice(0, 1500000),
    formulaire: forme ? { action: forme.action || null, methode: (forme.getAttribute('method') || 'get').toLowerCase(), champs } : null,
  }
})()`

const TEXTUELS = new Set(['text', 'search', 'url', 'number', 'password', 'email', 'tel', 'textarea'])
const SPECIFIQUES: readonly TechnologieFormulaire[] = ['contact_form_7', 'wpforms', 'gravity_forms', 'elementor', 'divi', 'wix', 'jimdo', 'webflow', 'squarespace', 'shopify']

/** La technologie du formulaire d'après la page (même lecture que le Lecteur, 026-020). */
export function technologieVue(html: string): TechnologieFormulaire {
  const x = html.toLowerCase()
  if (/wpcf7/.test(x)) return 'contact_form_7'
  if (/wpforms/.test(x)) return 'wpforms'
  if (/gform_/.test(x)) return 'gravity_forms'
  if (/elementor-form/.test(x)) return 'elementor'
  if (/et_pb_contact_form/.test(x)) return 'divi'
  if (/wix/.test(x)) return 'wix'
  if (/jimdo/.test(x)) return 'jimdo'
  if (/w-form/.test(x)) return 'webflow'
  if (/sqs-block-form/.test(x)) return 'squarespace'
  if (/form_type.{0,20}contact/.test(x)) return 'shopify'
  return 'html'
}

const hoteDe = (url: string | null | undefined): string | null => {
  try { return url ? new URL(url).hostname.toLowerCase().replace(/^www\./, '') : null } catch { return null }
}

/**
 * La décision, sur un instantané déjà lu. Pure : c'est ce que le juge et les sabotages exercent sans navigateur.
 * L'ordre est celui de la gravité : défi ou pare-feu, protections, refus écrits, puis le formulaire lui-même.
 */
export function analyserInstantane(v: InstantanePage, o: OptionsControle = {}): ControleDirect {
  const html = String(v.html ?? '')
  const texte = minuscule(String(v.texte ?? ''))
  // 1. un défi JavaScript, puis un pare-feu applicatif : ce n'est pas une page que le porteur a le droit de traverser
  if (/\/cdn-cgi\/challenge-platform\//i.test(html) || /checking your browser|just a moment|enable javascript and cookies|v[eé]rifiez que vous [eê]tes (?:un )?humain|verifying you are human/i.test(texte)) return { ok: false, raison: 'defi_js' }
  if (o.statut === 403 || o.statut === 503) return { ok: false, raison: 'pare_feu' }
  // 2. les captchas, y compris ceux qu'un script fait apparaître ; les extensions anti-spam
  if (/recaptcha|hcaptcha|h-captcha|turnstile|friendly.?captcha|frc-captcha|grecaptcha|captcha/i.test(html)) return { ok: false, raison: 'captcha' }
  if (/akismet|cleantalk|antispam.?bee|ct_checkjs|apbct|wpforms.{0,60}(?:token|nonce)/i.test(html)) return { ok: false, raison: 'extension_antispam' }
  // 3. la case « je ne suis pas un robot » et la question anti-spam
  if (/je ne suis pas un robot|i am not a robot|i'm not a robot|i’m not a robot/.test(texte)) return { ok: false, raison: 'case_robot' }
  if (/combien font\s*\d+\s*[+×x*-]\s*\d+|question anti.?spam|anti.?spam\s*:\s*\d+/.test(texte)) return { ok: false, raison: 'question_antispam' }
  // 4. ce que la page écrit d'elle-même : pas de démarchage, pas de robot
  if (/(?:pas|aucun|n['’]acceptons pas|refusons|interdit|interdisons)[^.]{0,40}d[eé]marchage|d[eé]marchage[^.]{0,40}(?:interdit|refus[eé]|non (?:souhait[eé]|accept[eé]))|sollicitations? commerciales?[^.]{0,30}(?:interdites?|refus[eé]es?|non accept[eé]es?)/.test(texte)) return { ok: false, raison: 'refus_demarchage' }
  if (/extraction automatis[eé]e.{0,40}interdite|robots?.{0,40}interdits?|aspiration.{0,40}interdite/.test(texte)) return { ok: false, raison: 'cgu_robots' }
  // 5. le formulaire lui-même : introuvable (ou changé) → abandon ; puis ses champs
  const f = v.formulaire
  if (!f) return { ok: false, raison: 'formulaire_change' }
  const hoteAttendu = hoteDe(o.urlAction)
  const hoteVu = hoteDe(f.action)
  if (hoteAttendu && hoteVu && hoteAttendu !== hoteVu) return { ok: false, raison: 'formulaire_change' }
  const technologie = technologieVue(html)
  if (o.technologie && SPECIFIQUES.includes(technologie) && technologie !== o.technologie) return { ok: false, raison: 'formulaire_change' }
  for (const c of f.champs) {
    if (['hidden', 'submit', 'button', 'reset', 'image', 'checkbox', 'radio', 'file'].includes(c.type)) continue
    if (!TEXTUELS.has(c.type) && c.balise !== 'textarea') continue
    if (c.masque || c.ariaHidden || c.tabindex === -1) return { ok: false, raison: 'pot_de_miel' }
  }
  if (f.champs.some((c) => c.type === 'tel' && c.requis)) return { ok: false, raison: 'telephone_requis' }
  for (const c of f.champs) {
    if (c.balise !== 'select') continue
    const offres = c.options.filter((m) => m && !PLACEHOLDER.test(m))
    if (offres.length && offres.every((m) => DEVIS.test(m))) return { ok: false, raison: 'motif_devis_seul' }
  }
  const message = f.champs.find((c) => c.type === 'textarea')
  const seuil = o.longueurTexte && o.longueurTexte > 0 ? o.longueurTexte : LONGUEUR_MIN_MESSAGE
  if (message && message.max !== null && message.max < seuil) return { ok: false, raison: 'longueur' }
  return { ok: true, action: f.action, technologie }
}

/** Les contrôles en direct : lit la page telle que le navigateur la montre, puis décide. Une page illisible fait abandonner. */
export async function controlesEnDirect(page: PageObservable, options: OptionsControle = {}): Promise<ControleDirect> {
  let v: unknown
  try { v = await page.evaluate(SCRIPT_INSTANTANE) } catch { return { ok: false, raison: 'formulaire_change' } }
  if (!v || typeof v !== 'object') return { ok: false, raison: 'formulaire_change' }
  return analyserInstantane(v as InstantanePage, options)
}
