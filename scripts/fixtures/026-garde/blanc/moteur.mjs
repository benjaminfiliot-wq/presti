// scripts/fixtures/026-garde/blanc/moteur.mjs — le moteur pur du juge garde-blanc-qa (écrit par Claude Code) : détection de la
// marque de l'éditeur sur les surfaces que voit le prospect ou le client d'un artisan, liste fermée des exemptions, lecture du
// texte d'un HTML, rubriques légales, marqueurs « à confirmer ». Aucune lecture du dépôt ici, aucun réseau : des fonctions de
// chaînes, pour que le juge ET le contrôle JA-3 des jeux d'essai (controles.mjs) s'en servent.
import { sansCommentaires } from '../../026-pilotage/a/commun.mjs'

// ── La marque ────────────────────────────────────────────────────────────────────────────────────────────────────────────
// « presti » ou « prestiapp », casse ignorée, mais PAS « prestige » / « prestidigitateur » : le mot ne doit pas être suivi d'une
// lettre ou d'un chiffre (le tiret, le point, le tiret bas, l'apostrophe, la fin de chaîne le laissent passer : « presti-conv »,
// « PRESTI_ALERTES », « prestiapp.fr », « Presti' »).
export const SOURCE_MARQUE = 'presti(?:app)?(?![a-zà-ÿ0-9])'
export const reMarque = (drapeaux = 'gi') => new RegExp(SOURCE_MARQUE, drapeaux)

const ENTITES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', shy: '', zwnj: '', zwj: '', ndash: '–', mdash: '—', laquo: '«', raquo: '»' }
/** Le texte tel que l'œil le lit : invisibles ôtés, entités décodées, pleine chasse repliée (« Ｐresti », « Pres&shy;ti », « &#80;resti »). Les fins de ligne sont gardées. */
export function normaliser(t) {
  return String(t ?? '')
    .replace(/&#x([0-9a-f]{1,6});/gi, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)) } catch { return '' } })
    .replace(/&#(\d{1,7});/g, (_, d) => { try { return String.fromCodePoint(Number(d)) } catch { return '' } })
    .replace(/&([a-z]{2,8});/gi, (m, n) => (n.toLowerCase() in ENTITES ? ENTITES[n.toLowerCase()] : m))
    .normalize('NFKC')
    .replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g, '')
}

// ── La liste fermée des exemptions (GB-7) ───────────────────────────────────────────────────────────────────────────────
// Une exemption retire du texte d'UN fichier (ou d'un dossier nommé, jamais d'un joker) les seules chaînes que `motif` décrit,
// avant la recherche de la marque. Courte (GB-7 en plafonne le nombre), justifiée, et jamais sur public/ : aucune exemption ne
// couvre une page, un gabarit, un crédit ou une mention légale qu'un prospect d'artisan lit. `large` : le motif est le mot seul
// (le fichier entier est de la parole de l'éditeur) ; sinon il doit porter un contexte que le mot seul ne suffit pas à déclencher.
export const EXEMPTIONS = [
  { id: 'E1', fichier: 'lib/agents/acquisition/modeles.ts', motif: '\\bPresti\\b', drapeaux: 'g', large: true,
    justification: "Modèles de prospection de Presti À DES ARTISANS (sa voie gratuite) : l'expéditeur s'y identifie, pied et mention de l'assistant IA compris, tels que conformite-qa.mjs les attend (PIED_SOLLICITE_ATTENDU, QUESTIONS_ENTRANT_V2_ATTENDU). Le destinataire est l'artisan, jamais le client d'un artisan ; « prestiapp » reste interdit." },
  { id: 'E2', fichier: 'app/site/commander/', motif: '\\bPresti\\b', drapeaux: 'g', large: true,
    justification: "Parcours de commande d'un site : page commerciale de Presti, lue par l'artisan qui l'achète (la demande de démarrage avant rétractation nomme le prestataire), pas par le client d'un artisan." },
  { id: 'E3', fichier: 'app/site/acheter/', motif: '\\bPresti\\b', drapeaux: 'g', large: true,
    justification: "Page d'achat d'un site, même audience que E2 : l'artisan acheteur, qui valide avec Presti ; aucun client d'artisan n'y passe." },
  { id: 'E4', fichier: 'app/p/[slug]/PlatChat.tsx', motif: 'presti-convs?-\\$\\{slug\\}', drapeaux: 'g',
    justification: "Anciennes clés localStorage du visiteur de l'artisan, lues une seule fois pour migrer ses conversations puis supprimées (removeItem) : jamais écrites, jamais affichées par la plateforme. Les retirer casserait la reprise des conversations déjà ouvertes." },
  { id: 'E5', fichier: 'lib/email.ts', motif: "process\\.env\\.PRESTI_ALERTES_EMAIL|\\|\\|\\s*'contact@prestiapp\\.fr'|FROM_ADDR_PLATEFORME\\s*=\\s*'contact@prestiapp\\.fr'|NOM_PLATEFORME\\s*=\\s*'Presti'|\\[Presti\\] |— Presti \\(notification automatique\\)", drapeaux: 'g',
    justification: "E-mails DE Presti (réinitialisation, notifications à l'artisan, alertes internes) : nom de la variable d'environnement, adresse de l'entreprise par défaut, adresse et nom d'expédition de la plateforme, objet et signature de notifierEntreprise. Aucun ne part au nom d'un artisan ; le chemin « fromName » est jugé par GB-4." },
  { id: 'E6', fichier: 'app/api/leads/route.ts', motif: 'Nouveau contact via votre (?:page|lien) Presti', drapeaux: 'g',
    justification: "Notification envoyée à l'artisan lui-même par notifierArtisan (destinataire = l'artisan, en réponse au client par replyTo) : Presti y parle à son client. L'accusé au prospect n'est jamais exempté." },
]
export const LIMITE_EXEMPTIONS = 8
const DOSSIERS_PERMIS = ['app/site/commander/', 'app/site/acheter/']
const concerne = (ex, chemin) => (ex.fichier.endsWith('/') ? chemin.startsWith(ex.fichier) : chemin === ex.fichier)

/** Audit de la liste fermée elle-même (GB-7). → liste de défauts. */
export function defautsExemptions(liste = EXEMPTIONS) {
  const d = []
  if (liste.length > LIMITE_EXEMPTIONS) d.push(`${liste.length} exemptions, ${LIMITE_EXEMPTIONS} au plus : la liste est fermée ET courte`)
  const ids = new Set()
  for (const e of liste) {
    const q = `exemption ${e?.id ?? '?'}`
    if (typeof e?.id !== 'string' || ids.has(e.id)) d.push(`${q} : identifiant absent ou en double`)
    ids.add(e?.id)
    if (typeof e?.fichier !== 'string' || !e.fichier || /[*?]/.test(e.fichier) || e.fichier.startsWith('/') || e.fichier.includes('..')) { d.push(`${q} : fichier ${JSON.stringify(e?.fichier)} (un chemin du dépôt, sans joker)`); continue }
    if (e.fichier.endsWith('/') && !DOSSIERS_PERMIS.includes(e.fichier)) d.push(`${q} : le dossier ${e.fichier} n'est pas dans la courte liste des dossiers exemptables (${DOSSIERS_PERMIS.join(', ')})`)
    if (/^(public|gabarits-pubs|maquettes|lib\/pubs)\//.test(e.fichier)) d.push(`${q} : ${e.fichier} est une surface lue par le client d'un artisan, aucune exemption n'y est permise`)
    if (typeof e.justification !== 'string' || e.justification.trim().length < 80) d.push(`${q} : justification de moins de 80 caractères`)
    else if (!/(artisan|destinataire|plateforme|éditeur|Presti)/.test(e.justification) || !/(jamais|aucun|pas |seul)/i.test(e.justification)) d.push(`${q} : la justification ne dit ni à qui s'adresse la surface ni ce que l'exemption n'autorise pas`)
    let re
    try { re = new RegExp(e.motif, e.drapeaux ?? 'g') } catch { d.push(`${q} : motif illisible`); continue }
    if (re.test('')) d.push(`${q} : le motif accepte la chaîne vide`)
    if (!e.large && (new RegExp(e.motif, e.drapeaux ?? 'g').test('Presti') || new RegExp(e.motif, e.drapeaux ?? 'g').test('prestiapp'))) d.push(`${q} : le motif accepte le mot seul sans contexte (marquer large: true et dire pourquoi, ou resserrer)`)
    if (new RegExp(e.motif, e.drapeaux ?? 'g').test('prestiapp.fr/site')) d.push(`${q} : le motif laisserait passer une adresse publique de Presti`)
  }
  return d
}

// ── Lecture d'un fichier ─────────────────────────────────────────────────────────────────────────────────────────────────
export const EXTENSIONS_TEXTE = /\.(?:html?|css|m?js|json|txt|xml|svg|md|tsx?|webmanifest)$/i
/** Comment lire un fichier du dépôt : 'code' (commentaires ôtés : le serveur ne les sert pas), 'css' (idem, compilé par Next), 'brut' (servi tel quel). */
export function modeDe(chemin) {
  if (/^(?:app|lib)\/.+\.(?:tsx?|mjs)$/.test(chemin)) return 'code'
  if (/^app\/.+\.css$/.test(chemin)) return 'css'
  if (/^public\/sites-demo\/(?:generer|extraire-contenu)\.mjs$/.test(chemin)) return 'code' // outils de fabrication : leurs chaînes fabriquent les sites, leurs commentaires ne sortent nulle part
  return 'brut'
}
export function lireSelonMode(source, mode) {
  const s = String(source ?? '')
  if (mode === 'code') { try { return sansCommentaires(s) } catch { return s } }
  if (mode === 'css') return s.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ''))
  return s
}

/** Les occurrences de la marque : [{ ligne, extrait }], exemptions appliquées (celles utilisées sont rangées dans `utilisees`). */
export function trouverMarque(chemin, source, { mode = modeDe(chemin), exemptions = EXEMPTIONS, utilisees = null, sansExemption = false } = {}) {
  let t = normaliser(lireSelonMode(source, mode))
  if (!sansExemption) {
    for (const ex of exemptions) {
      if (!concerne(ex, chemin)) continue
      t = t.replace(new RegExp(ex.motif, ex.drapeaux ?? 'g'), (m) => { utilisees?.add(ex.id); return ' '.repeat(m.length) })
    }
  }
  const out = []
  const lignes = t.split('\n')
  for (let i = 0; i < lignes.length; i++) {
    const re = reMarque()
    const m = re.exec(lignes[i])
    if (!m) continue
    const a = Math.max(0, m.index - 45)
    out.push({ ligne: i + 1, extrait: lignes[i].slice(a, m.index + 55).replace(/\s+/g, ' ').trim() })
  }
  // Une adresse publique fabriquée avec la constante de l'éditeur (canonique, sitemap, liens d'un site livré) : le mot n'y figure pas en clair.
  if (mode === 'code' || mode === 'brut') {
    const lg = normaliser(lireSelonMode(source, mode)).split('\n')
    for (let i = 0; i < lg.length; i++) if (/\$\{\s*(?:base[_]?presti|BASE_PRESTI)\s*\}/i.test(lg[i]) && !/^\s*(?:import|export\s+const)\b/.test(lg[i])) out.push({ ligne: i + 1, extrait: `adresse publique fabriquée avec la constante de l'éditeur : ${lg[i].trim().slice(0, 90)}` })
  }
  return out
}

/** Le texte d'un fichier (selon son mode) débarrassé de ce que la liste fermée exempte pour lui : sert aux critères qui ne doivent pas re-juger une parole de l'éditeur (GB-2). */
export function sansExemptions(chemin, source, mode = modeDe(chemin), exemptions = EXEMPTIONS) {
  let t = normaliser(lireSelonMode(source, mode))
  for (const ex of exemptions) if (concerne(ex, chemin)) t = t.replace(new RegExp(ex.motif, ex.drapeaux ?? 'g'), (m) => ' '.repeat(m.length))
  return t
}

// ── Le HTML lu comme du texte ────────────────────────────────────────────────────────────────────────────────────────────
export function texteHtml(html) {
  return normaliser(String(html ?? '')
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(?:p|li|div|section|h[1-6]|dd|dt|tr|td|th|header|footer|ul|ol|table|article|figure|figcaption|nav|main|small)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
}
export const titreHtml = (h) => normaliser(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(h)?.[1] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
export const h1Html = (h) => normaliser(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(h)?.[1] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

// ── « à confirmer » ──────────────────────────────────────────────────────────────────────────────────────────────────────
export const MARQUEUR = /(?<![\p{L}\p{N}])(?:à|a)\s+(?:re)?(?:confirmer|compléter|completer|vérifier|verifier|valider|préciser|renseigner)(?![\p{L}])|(?<![\p{L}])non\s+(?:communiqué|renseigné|confirmé)(?![\p{L}])|(?<![\p{L}])(?:re)?confirmation\s+en\s+cours(?![\p{L}])/iu
const ZONE = /zone|intervention|secteur|commune|rayon|d[ée]placement|alentours|couverture|p[ée]rim[èe]tre|d[ée]partement|r[ée]gion/i
const CLAIM_ZONE = /(?:\bet\s+(?:ses\s+)?(?:alentours|environs)|\bautour\s+de\b|\bsecteur\b|\bdans\s+un\s+rayon|\brayon\s+de\b|\b\d+\s?km\b|\bcommunes?\b|\bd[ée]partements?\b|\btoute\s+la\s+(?:r[ée]gion|france)\b|\bzone\s+d['’]intervention\b|\bintervenons\b|\bà\s+\p{Lu}[\p{L}'’-]+\s*(?:,|\s+et\s+)\s*\p{Lu})/iu
const MOTS_VIDES = new Set('avec votre vous pour dans cette nous leurs sont être elle elles plus mais tout tous toute toutes chez sans sous entre vers comme notre nos vos ses ces les des aux une the'.split(' '))
const motsDe = (t) => new Set(normaliser(t).toLowerCase().match(/[a-zà-ÿ]{5,}/g) ?? [])

/** GB-5 : les contradictions d'une page (titre / h1 qui affirment ce que le corps marque « à confirmer »). → { marques, defauts } */
export function contradictionsTitre(html) {
  const titre = titreHtml(html), h1 = h1Html(html)
  const lignes = texteHtml(html).filter((l) => MARQUEUR.test(l))
  const defauts = []
  const affiches = [['title', titre], ['h1', h1]].filter(([, t]) => t)
  for (const l of lignes) {
    const sujet = [...motsDe(l.replace(MARQUEUR, ' '))].filter((m) => !MOTS_VIDES.has(m))
    for (const [nom, t] of affiches) {
      if (ZONE.test(l) && CLAIM_ZONE.test(t)) { defauts.push(`${nom} « ${t.slice(0, 80)} » affirme une zone d'intervention que le corps marque à confirmer (« ${l.slice(0, 70)} »)`); continue }
      const mt = motsDe(t)
      const commun = sujet.filter((m) => mt.has(m))
      if (commun.length) defauts.push(`${nom} « ${t.slice(0, 80)} » reprend « ${commun.join(', ')} » que le corps marque à confirmer (« ${l.slice(0, 70)} »)`)
    }
  }
  return { marques: lignes.length, defauts: [...new Set(defauts)] }
}

/** GB-6 : les liens tel: qui portent un numéro que la page dit « à reconfirmer ». → { liens, defauts } */
export function telephonesMarques(html) {
  const defauts = []
  const h = String(html ?? '')
  const liens = [...h.matchAll(/<a\b[^>]*\bhref\s*=\s*["']tel:([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
  const chiffres = (s) => String(s).replace(/\D/g, '').replace(/^33/, '0').replace(/^0+/, '0')
  const lignes = texteHtml(h).filter((l) => MARQUEUR.test(l) && /(?:num[ée]ro|t[ée]l(?:[ée]phone|\.)?|appel|joindre|\d{2}[\s.]?\d{2}[\s.]?\d{2}[\s.]?\d{2}[\s.]?\d{2})/i.test(l))
  for (const m of liens) {
    const num = chiffres(decodeURIComponent(m[1]))
    const debut = Math.max(h.lastIndexOf('<p', m.index), h.lastIndexOf('<li', m.index), h.lastIndexOf('<div', m.index), h.lastIndexOf('<dd', m.index), h.lastIndexOf('<td', m.index), h.lastIndexOf('<section', m.index), 0)
    const finsPossibles = ['</p>', '</li>', '</div>', '</dd>', '</td>', '</section>'].map((b) => h.indexOf(b, m.index)).filter((i) => i >= 0)
    const fin = finsPossibles.length ? Math.min(...finsPossibles) : Math.min(h.length, m.index + 400)
    const bloc = texteHtml(h.slice(debut, fin)).join(' ')
    if (MARQUEUR.test(bloc)) { defauts.push(`lien tel:${m[1]} posé sur un numéro que son bloc marque à confirmer (« ${bloc.slice(0, 80)} »)`); continue }
    for (const l of lignes) {
      const numsLigne = [...l.matchAll(/(?:\+?33|0)[\s.]?\d(?:[\s.]?\d{2}){4}/g)].map((x) => chiffres(x[0]))
      if (numsLigne.includes(num) || (!numsLigne.length && /(?:num[ée]ro|t[ée]l)/i.test(l))) { defauts.push(`lien tel:${m[1]} cliquable alors que la page dit : « ${l.slice(0, 90)} »`); break }
    }
  }
  return { liens: liens.length, defauts: [...new Set(defauts)] }
}

// ── Les mentions légales d'un site d'artisan (GB-3) ──────────────────────────────────────────────────────────────────────
export const RUBRIQUES = [
  { cle: 'raison sociale', re: /(?:raison sociale|d[ée]nomination|nom commercial|[ée]diteur|forme juridique)/i, valeur: 'texte' },
  { cle: 'SIREN', re: /\b(?:siren|siret)\b/i, valeur: 'siren' },
  { cle: 'adresse', re: /(?:adresse|si[èe]ge)/i, valeur: 'texte' },
  { cle: 'hébergeur', re: /h[ée]berg/i, valeur: 'texte' },
  { cle: 'directeur de publication', re: /(?:directeur|directrice|responsable)\s+(?:de\s+(?:la\s+)?)?publication/i, valeur: 'deuxPoints' },
  { cle: 'médiateur', re: /m[ée]diat/i, valeur: 'texte' },
  { cle: 'RGPD/cookies', re: /(?:rgpd|donn[ée]es personnelles|cookies?)/i, valeur: 'presence' },
]
/** Les défauts d'un corpus légal (lignes de texte) : rubrique absente, sans valeur ni marqueur explicite, ou nommant l'éditeur. */
export function defautsLegaux(lignes) {
  const d = []
  const nu = (t) => t.replace(/[^\p{L}\p{N}]+/gu, '')
  const global = (re) => new RegExp(re.source, 'gi')
  // « Libellé : valeur » → la valeur est ce qui suit les deux points ; sans deux points, la phrase moins le libellé.
  const valeurDe = (r, z) => { const k = z.indexOf(':'); return k >= 0 ? nu(z.slice(k + 1)).length >= 3 : nu(z.replace(global(r.re), ' ')).length >= 12 }
  for (const r of RUBRIQUES) {
    const idx = lignes.map((l, i) => (r.re.test(l) ? i : -1)).filter((i) => i >= 0)
    if (!idx.length) { d.push(`rubrique « ${r.cle} » absente (ni renseignée ni marquée « à compléter »)`); continue }
    if (r.valeur === 'presence') continue
    const renseignee = (z) => MARQUEUR.test(z) || (r.valeur === 'siren' ? /\b\d{9}\b|\b\d{3}\s\d{3}\s\d{3}\b|\b\d{14}\b/.test(z) : valeurDe(r, z))
    // la rubrique est renseignée sur sa propre ligne, ou son intitulé est seul sur sa ligne et la suivante (qui n'est pas une autre rubrique) la renseigne
    const ok = idx.some((i) => {
      if (renseignee(lignes[i])) return true
      const suivante = lignes[i + 1]
      return suivante !== undefined && !RUBRIQUES.some((x) => x !== r && x.re.test(suivante)) && renseignee(`${lignes[i]} ${suivante}`)
    })
    if (!ok) d.push(`rubrique « ${r.cle} » sans valeur ni marqueur « à compléter » (« ${lignes[idx[0]].slice(0, 60)} »)`)
  }
  lignes.forEach((l) => { if (reMarque().test(l)) d.push(`mention légale au nom de l'éditeur : « ${l.slice(0, 90)} »`) })
  return d
}

// ── Crédits photo (GB-2) ─────────────────────────────────────────────────────────────────────────────────────────────────
export const MOTS_CREDIT = /(?:photo|cr[ée]dit|licen[cs]e|attribution|modifi[ée]|[ée]talonn|recadr|redimension|adaptation|retouch|clich[ée]|illustration)/i
const NOM_EDITEUR = /(?:presti(?:app)?(?![a-zà-ÿ0-9])|\bFiliot\b)/i
/** Les segments d'une chaîne où un crédit nomme l'éditeur ou son fondateur. */
export function creditsNommantEditeur(texte) {
  const out = []
  for (const s of normaliser(texte).split(/<\/?(?:p|li|span|figcaption|small)\b[^>]*>|\n|(?<=[.;!?])\s+/i)) {
    if (MOTS_CREDIT.test(s) && NOM_EDITEUR.test(s)) out.push(s.replace(/\s+/g, ' ').trim().slice(0, 110))
  }
  return out
}
