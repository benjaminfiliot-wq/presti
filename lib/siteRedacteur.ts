// lib/siteRedacteur.ts — redigerContenuV2 (fiche 026-093) : assemble le contenu.json v2 d'un site d'artisan à partir
// du modèle du métier (maquettes/modeles/<métier>/contenu.json, 025-02/025-11) et des SEULS faits du dossier de
// commande. Rien n'est inventé : les marques {entreprise} et {ville} sont remplacées par les faits, les prestations
// gardées sont uniquement celles que l'artisan a déclarées, et la voix de l'artisan (citation, parcours, chiffres)
// n'entre jamais ici — le générateur (public/sites-demo/generer.mjs) la lit directement dans commande.matiere.artisan.
//
// Le seul appel à un modèle de langage rédige le chapeau et l'introduction de CHAQUE PAGE DE COMMUNE (et seulement
// elles) : site-qa.mjs refuse les pages de commune creuses ou répétitives, et c'est la seule raison d'appeler un
// modèle. Tout le reste est déterministe. L'appel est injecté par l'appelant (lib/agents/llm.ts, fiche 026-043) :
// ce module ne joint jamais lui-même un modèle, ne lit aucune clé, n'écrit aucun fichier.
//
// Contrôle d'invention : chaque sortie du modèle passe findFabrications (lib/ai.ts) et detecterCapacitesNonDeclarees
// (lib/ai/antiFabrication.ts) contre les faits du dossier. Un rejet déclenche UN second appel qui nomme les éléments
// refusés ; si la seconde sortie est encore mauvaise (ou si l'appel lève), la page de commune garde le texte du
// modèle du métier (ou un texte de repli déterministe si le modèle n'a pas de page de commune).
import { findFabrications } from './ai'
import { detecterCapacitesNonDeclarees, type ProfilCapacites } from './ai/antiFabrication'

// ── Types de l'entrée (fiche 13 : commande.json exporté, et la ligne « artisans ») ─────────────────────────────────
export type Appel = (requete: { systeme: string; utilisateur: string }) => Promise<string>

type Decennale = { assureur?: string; numero?: string }
type ArtisanVoix = {
  prenom?: string; nom?: string; installation?: number | null
  parcours?: string; citation?: string
  chiffres?: { valeur?: string; unite?: string; legende?: string }[] | null
}
export type Commande = {
  id?: string
  nom: string
  email?: string
  telephone?: string
  metier: string
  metiers_secondaires?: string[]
  communes: string[]
  matiere: {
    prestations?: string[]
    adresse?: string
    siren?: string
    horaires?: string
    decennale?: Decennale
    // la voix : jamais lue par ce module (fiche 026-093, « la voix n'est jamais rédigée »)
    artisan?: ArtisanVoix | null
  }
}
export type ArtisanRow = {
  metier?: string
  services?: ({ nom?: string | null; description?: string | null } | string)[] | null
}

// ── Le modèle du métier (025-02, 025-11), format v2 : pages["/"] et pages["commune"], marques {entreprise}/{ville} ─
type Bloc = { type: string; texte: string }
export type Section = { genre?: string; h2: string; blocs: Bloc[] }
type PageModele = {
  type?: string; title?: string; description?: string
  h1?: string; h1Ligne?: string; chapeau?: string; introduction?: string; kicker?: string
  sections?: Section[]
}
export type Modele = { metier?: string; pages?: { '/'?: PageModele; commune?: PageModele } }

// ── Le contenu v2 rendu ──────────────────────────────────────────────────────────────────────────────────────────
type PageV2 = {
  type: 'accueil' | 'commune' | 'metier' | 'legal'
  cible?: string
  title: string
  description: string
  h1: string
  h1Ligne?: string
  chapeau?: string
  sections: Section[]
  jsonld: Record<string, unknown>[]
}
export type ContenuV2 = { metier: string; pages: Record<string, PageV2> }
export type Rapport = {
  redige: string[]
  rejets: string[]
  degradations: string[]
  ia: 'ok' | 'indisponible'
  bloquant?: string
}
export type Entree = {
  commande: Commande
  artisan?: ArtisanRow | null
  modele: Modele
  modelesSecondaires?: Record<string, Modele>
}

// ── Petits outils, sans dépendance projet ───────────────────────────────────────────────────────────────────────
const sansAccents = (s: unknown): string => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const capitalise = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const slug = (s: string): string => sansAccents(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x'
type Vars = { entreprise: string; ville: string; metier: string; prestationsTxt: string }
const remplir = (texte: string | undefined, vars: { entreprise: string; ville: string }): string =>
  String(texte ?? '').replaceAll('{entreprise}', vars.entreprise).replaceAll('{ville}', vars.ville)

// Le sous-type schema.org le plus précis par métier (§3.3 du prompt v15) ; « HomeAndConstructionBusiness » ailleurs.
const TYPE_SCHEMA: Record<string, string> = {
  plombier: 'Plumber', electricien: 'Electrician', chauffagiste: 'HVACBusiness', peintre: 'HousePainter',
  couvreur: 'RoofingContractor', serrurier: 'Locksmith', macon: 'GeneralContractor',
}
const typeSchemaDe = (metier: string): string => TYPE_SCHEMA[sansAccents(metier)] ?? 'HomeAndConstructionBusiness'

/** « 4 rue du Jeu d'Essai, 35500 Vitré » → { streetAddress, postalCode, addressLocality } (repli si le format diffère). */
function adresseSchema(adresse?: string): Record<string, unknown> {
  const m = /^(.*?),\s*(\d{5})\s+(.+)$/.exec(String(adresse ?? '').trim())
  return m
    ? { '@type': 'PostalAddress', streetAddress: m[1].trim(), postalCode: m[2], addressLocality: m[3].trim() }
    : { '@type': 'PostalAddress', streetAddress: String(adresse ?? ''), postalCode: '', addressLocality: '' }
}

/** h3 → un item, tout ce qui suit (p, li…) nourrit son texte ; ce qui précède le premier h3 est l'intro. */
function decoupeItems(blocs: Bloc[] = []): { intro: string[]; items: { titre: string; textes: string[] }[] } {
  const intro: string[] = []
  const items: { titre: string; textes: string[] }[] = []
  let courant: { titre: string; textes: string[] } | null = null
  for (const b of blocs) {
    if (!b || typeof b.texte !== 'string') continue
    if (b.type === 'h3') { courant = { titre: b.texte, textes: [] }; items.push(courant); continue }
    if (b.type === 'img' || b.type === 'figcaption') continue
    if (!courant) intro.push(b.texte); else courant.textes.push(b.texte)
  }
  return { intro, items }
}

/** Les items h3/p de la section « prestations » du modèle (marques remplacées), ou [] si le modèle n'en a pas. */
function itemsPrestationsModele(modele: Modele, vars: { entreprise: string; ville: string }): { titre: string; textes: string[] }[] {
  const section = (modele.pages?.['/']?.sections ?? []).find((s) => (s?.genre ?? '') === 'prestations')
  if (!section) return []
  const { items } = decoupeItems(section.blocs)
  return items
    .filter((it) => it.titre && it.textes.length)
    .map((it) => ({ titre: remplir(it.titre, vars), textes: it.textes.map((t) => remplir(t, vars)) }))
}

/** Les prestations réellement déclarées (matiere.prestations ∪ artisan.services), dédupliquées sans accents. */
function prestationsDeclarees(commande: Commande, artisan?: ArtisanRow | null): string[] {
  const brut: string[] = [
    ...(commande.matiere.prestations ?? []),
    ...((artisan?.services ?? []) as ({ nom?: string | null; description?: string | null } | string)[])
      .map((s) => (typeof s === 'string' ? s : s?.nom ?? ''))
      .filter((s): s is string => !!s),
  ]
  const vus = new Set<string>()
  const out: string[] = []
  for (const p of brut) {
    const t = String(p ?? '').trim()
    if (!t) continue
    const cle = sansAccents(t)
    if (vus.has(cle)) continue
    vus.add(cle)
    out.push(t)
  }
  return out
}

/** Pour chaque prestation déclarée : l'item du modèle qui la nomme (sans accents), sinon un texte de repli sûr. */
function construirePrestations(declarees: string[], modele: Modele, vars: { entreprise: string; ville: string }): { titre: string; textes: string[] }[] {
  const items = itemsPrestationsModele(modele, vars)
  return declarees.map((label) => {
    const cle = sansAccents(label)
    const trouve = items.find((it) => sansAccents(it.titre) === cle) ?? items.find((it) => sansAccents(it.titre).includes(cle) || cle.includes(sansAccents(it.titre)))
    if (trouve) return trouve
    return { titre: capitalise(label), textes: [`${vars.entreprise} réalise cette prestation.`] }
  })
}

/** Le chapeau et l'introduction d'une page de commune, tirés du modèle (marques remplacées) ou d'un repli déterministe. */
type TexteCommune = { chapeau: string; introduction: string }
function texteModeleCommune(modele: Modele, vars: Vars): TexteCommune {
  const pc = modele.pages?.commune
  if (pc?.chapeau) return { chapeau: remplir(pc.chapeau, vars), introduction: remplir(pc.introduction ?? pc.chapeau, vars) }
  return {
    chapeau: `À ${vars.ville}, ${vars.entreprise} intervient pour vos projets de ${vars.metier}.`,
    introduction: `Pour un projet à ${vars.ville}, ${vars.entreprise} évalue le chantier avant de proposer un devis détaillé.`,
  }
}

// ── Les faits, référence des deux contrôles d'invention ─────────────────────────────────────────────────────────
function construireFaits(commande: Commande, declarees: string[]): string {
  const m = commande.matiere
  return [
    commande.nom, commande.metier, capitalise(commande.metier), commande.communes.join(' '), declarees.join(' '),
    m.adresse ?? '', m.horaires ?? '', 'assurance décennale', m.decennale?.assureur ?? '', m.decennale?.numero ?? '',
    m.siren ?? '', 'Vercel Inc.', 'Presti', 'prestiapp.fr',
  ].join(' ')
}
function construireProfil(commande: Commande, declarees: string[]): ProfilCapacites {
  const m = commande.matiere
  return { metier: commande.metier, services: declarees, horaires: m.horaires, zone: commande.communes.join(', '), assurance_nom: m.decennale?.assureur }
}
function controler(t: TexteCommune, faits: string, profil: ProfilCapacites): string[] {
  const texte = `${t.chapeau}\n${t.introduction}`
  return [...findFabrications(texte, faits), ...detecterCapacitesNonDeclarees(texte, profil).map((h) => h.extrait)]
}
function parseReponse(brut: string): TexteCommune | null {
  try {
    const o = JSON.parse(String(brut ?? '')) as unknown
    if (o && typeof o === 'object') {
      const r = o as Record<string, unknown>
      if (typeof r.chapeau === 'string' && typeof r.introduction === 'string') return { chapeau: r.chapeau.trim(), introduction: r.introduction.trim() }
    }
  } catch { /* réponse illisible : traitée comme un rejet */ }
  return null
}

/**
 * Rédige le chapeau et l'introduction d'UNE commune : un appel, contrôlé ; s'il est refusé, un second appel qui
 * nomme les éléments refusés ; si la seconde sortie est encore mauvaise (ou que l'appel lève), dégradation vers
 * `repli`. `rapport` reçoit les rejets, les dégradations et, si l'appel a levé, `ia = 'indisponible'`.
 */
async function rediger(vars: Vars, appel: Appel, faits: string, profil: ProfilCapacites, repli: TexteCommune, rapport: Rapport): Promise<TexteCommune> {
  const systeme = [
    `Tu rédiges, en français, le chapeau et l’introduction de la page consacrée à la commune de ${vars.ville} sur le site vitrine d’un(e) ${vars.metier}.`,
    `Réponds UNIQUEMENT par un objet JSON strict : {"chapeau":"...","introduction":"..."} — le chapeau tient en une phrase, l’introduction en une ou deux phrases. Aucun texte hors de ce JSON.`,
    `N’utilise QUE les faits donnés entre <donnees> et </donnees>. N’invente AUCUNE année, AUCUN pourcentage, AUCUN prix, AUCUN label ou certification, AUCUN superlatif, et n’affirme AUCUNE capacité (déplacement, atelier, délai chiffré, garantie, permanence) qui n’y figure pas.`,
  ].join('\n')
  const donnees = `<donnees>\nEntreprise : ${vars.entreprise}\nMétier : ${vars.metier}\nCommune : ${vars.ville}\nPrestations proposées : ${vars.prestationsTxt}\n</donnees>`
  const appeler = async (utilisateur: string): Promise<{ panne: true } | { panne: false; reponse: TexteCommune | null }> => {
    let brut: string
    try { brut = await appel({ systeme, utilisateur }) } catch { return { panne: true } }
    return { panne: false, reponse: parseReponse(brut) }
  }
  const r1 = await appeler(donnees)
  if (r1.panne) { rapport.ia = 'indisponible'; return repli }
  const mauvais1 = r1.reponse ? controler(r1.reponse, faits, profil) : ['réponse illisible']
  if (r1.reponse && !mauvais1.length) return r1.reponse
  rapport.rejets.push(`${vars.ville} : ${mauvais1.join(', ')}`)
  const rappel = `Ta réponse précédente affirmait des éléments absents des faits : ${mauvais1.map((x) => `« ${x} »`).join(' ; ')}. Recommence, dans le même format JSON strict, sans eux ni équivalent — uniquement à partir de <donnees>.`
  const r2 = await appeler(`${donnees}\n\n${rappel}`)
  if (r2.panne) { rapport.ia = 'indisponible'; rapport.degradations.push(vars.ville); return repli }
  const mauvais2 = r2.reponse ? controler(r2.reponse, faits, profil) : ['réponse illisible']
  if (r2.reponse && !mauvais2.length) return r2.reponse
  rapport.degradations.push(vars.ville)
  return repli
}

// ── Les pages ────────────────────────────────────────────────────────────────────────────────────────────────────
function prestationsBlocs(items: { titre: string; textes: string[] }[], intro: string): Bloc[] {
  return [{ type: 'p', texte: intro }, ...items.flatMap((it) => [{ type: 'h3', texte: it.titre }, ...it.textes.map((t) => ({ type: 'p', texte: t }))])]
}

function pageAccueil(commande: Commande, vars: Vars, prestations: { titre: string; textes: string[] }[], communes: string[]): PageV2 {
  const metierCap = capitalise(commande.metier)
  const h1 = `${metierCap} à ${vars.ville}`
  const communesTxt = communes.join(', ')
  const sections: Section[] = [
    { genre: 'prestations', h2: 'Mes prestations', blocs: prestationsBlocs(prestations, `${vars.entreprise} présente ici les prestations qu’elle réalise vraiment.`) },
    { genre: 'galerie', h2: 'Chantiers réalisés', blocs: [{ type: 'p', texte: `Quelques chantiers menés par ${vars.entreprise}.` }] },
    { genre: 'communes', h2: 'Zone d’intervention', blocs: [{ type: 'p', texte: `${vars.entreprise} intervient à ${communesTxt}.` }] },
    {
      genre: 'etapes', h2: 'Comment ça se passe', blocs: [
        { type: 'p', texte: 'Du premier échange à la fin du chantier, le même interlocuteur.' },
        { type: 'h3', texte: 'Premier contact' }, { type: 'p', texte: 'Vous décrivez votre projet par le formulaire du site ou par téléphone.' },
        { type: 'h3', texte: 'Devis' }, { type: 'p', texte: 'Un devis détaillé est établi avant toute intervention.' },
        { type: 'h3', texte: 'Réalisation' }, { type: 'p', texte: 'Le chantier est mené jusqu’à sa réception, à la date convenue ensemble.' },
      ],
    },
    {
      genre: 'faq', h2: 'Vos questions', blocs: [
        { type: 'h3', texte: 'Quelles communes sont desservies ?' }, { type: 'p', texte: `${vars.entreprise} intervient à ${communesTxt}.` },
        { type: 'h3', texte: 'Comment obtenir un devis ?' }, { type: 'p', texte: 'Par le formulaire de ce site, avec votre projet et vos coordonnées.' },
      ],
    },
    {
      genre: 'contact', h2: 'Parlons de votre projet', blocs: [
        { type: 'p', texte: 'Décrivez votre projet, un rappel suit pour convenir d’un rendez-vous.' },
        ...(commande.matiere.adresse ? [{ type: 'p', texte: commande.matiere.adresse }] : []),
        ...(commande.matiere.horaires ? [{ type: 'p', texte: commande.matiere.horaires }] : []),
      ],
    },
  ]
  return {
    type: 'accueil',
    // « et alentours » : l'accueil parle de la même première commune que sa page dédiée (/<métier>-<commune>/) —
    // sans ça, les deux pages partagent le même <title> (site-qa.mjs : un title unique par page).
    title: `${h1} et alentours — ${vars.entreprise}`,
    description: `${vars.entreprise}, ${commande.metier} à ${vars.ville} : ${prestations.map((p) => p.titre).join(', ')}. Intervient à ${communesTxt}.`.slice(0, 158),
    h1, h1Ligne: 'À votre écoute',
    chapeau: `${vars.entreprise}, ${commande.metier} : des chantiers menés avec soin à ${vars.ville} et alentours.`,
    sections,
    jsonld: [{ '@context': 'https://schema.org', '@type': typeSchemaDe(commande.metier), name: vars.entreprise, address: adresseSchema(commande.matiere.adresse), openingHours: commande.matiere.horaires || undefined, areaServed: communesTxt }],
  }
}

function pageCommune(commune: string, commande: Commande, vars: Vars, prestations: { titre: string; textes: string[] }[], texte: TexteCommune, autresCommunes: string[]): PageV2 {
  const metierCap = capitalise(commande.metier)
  const h1 = `${metierCap} à ${commune}`
  const sections: Section[] = [
    { genre: 'prestations', h2: 'Mes prestations', blocs: prestationsBlocs(prestations, texte.introduction) },
    { genre: 'communes', h2: 'À proximité', blocs: [{ type: 'p', texte: `${vars.entreprise} intervient aussi ${autresCommunes.length ? `à ${autresCommunes.join(', ')}` : 'aux alentours'}.` }] },
    { genre: 'contact', h2: 'Parlons de votre projet', blocs: [{ type: 'p', texte: `Décrivez votre projet à ${commune}, un rappel suit pour convenir d’un rendez-vous.` }] },
  ]
  return {
    type: 'commune', cible: commune,
    title: `${h1} — ${vars.entreprise}`,
    description: `${vars.entreprise}, ${commande.metier} à ${commune} : ${prestations.map((p) => p.titre).join(', ')}. Devis sur demande.`.slice(0, 158),
    h1, h1Ligne: 'Sur mesure, ici',
    chapeau: texte.chapeau,
    sections,
    jsonld: [{ '@context': 'https://schema.org', '@type': typeSchemaDe(commande.metier), name: vars.entreprise, address: adresseSchema(commande.matiere.adresse), openingHours: commande.matiere.horaires || undefined, areaServed: commande.communes.join(', ') }],
  }
}

function pageMetierSecondaire(metierSec: string, commande: Commande, vars: Vars, prestations: { titre: string; textes: string[] }[]): PageV2 {
  const metierCap = capitalise(metierSec)
  const h1 = `${metierCap} à ${vars.ville}`
  const sections: Section[] = [
    { genre: 'prestations', h2: 'Mes prestations', blocs: prestationsBlocs(prestations, `${vars.entreprise} propose aussi ce métier, aux communes déjà desservies.`) },
    { genre: 'contact', h2: 'Parlons de votre projet', blocs: [{ type: 'p', texte: 'Décrivez votre projet, un rappel suit pour convenir d’un rendez-vous.' }] },
  ]
  return {
    type: 'metier', cible: metierSec,
    title: `${h1} — ${vars.entreprise}`,
    description: `${vars.entreprise}, ${metierSec} à ${vars.ville} : ${prestations.map((p) => p.titre).join(', ')}.`.slice(0, 158),
    h1, h1Ligne: 'À votre écoute',
    chapeau: `${vars.entreprise} propose aussi ce métier, à ${vars.ville} et aux communes desservies.`,
    sections,
    jsonld: [],
  }
}

function pageMentionsLegales(commande: Commande, vars: Vars): PageV2 {
  const m = commande.matiere
  const sections: Section[] = [
    {
      h2: 'Identification de l’entreprise', blocs: [
        { type: 'p', texte: `Nom commercial : ${vars.entreprise}` },
        { type: 'p', texte: `Adresse : ${m.adresse ?? ''}` },
        { type: 'p', texte: `SIREN : ${m.siren ?? ''}` },
        ...(commande.telephone ? [{ type: 'p', texte: `Téléphone : ${commande.telephone}` }] : []),
        ...(commande.email ? [{ type: 'p', texte: `Courrier électronique : ${commande.email}` }] : []),
        { type: 'p', texte: 'Éditeur de la plateforme : Presti.' },
      ],
    },
    {
      h2: 'Assurance décennale', blocs: [
        { type: 'p', texte: `${vars.entreprise} est couverte par une assurance décennale, conformément aux articles L. 241-1 et suivants du Code des assurances.` },
        { type: 'p', texte: `Compagnie d’assurance : ${m.decennale?.assureur ?? ''}` },
        { type: 'p', texte: `Numéro de police : ${m.decennale?.numero ?? ''}` },
      ],
    },
    { h2: 'Hébergement du site', blocs: [{ type: 'p', texte: 'Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.' }] },
    { h2: 'Traitement des demandes du formulaire', blocs: [{ type: 'p', texte: `Les demandes envoyées par le formulaire de ce site sont transmises directement à ${vars.entreprise}, par la plateforme Presti.` }] },
  ]
  return {
    type: 'legal',
    title: `Mentions légales — ${vars.entreprise}`,
    description: `Mentions légales de ${vars.entreprise} : identification, assurance décennale et hébergement du site.`,
    h1: 'Mentions légales',
    sections,
    jsonld: [],
  }
}

function pageConfidentialite(commande: Commande, vars: Vars): PageV2 {
  const sections: Section[] = [
    {
      h2: 'Données collectées via le formulaire', blocs: [
        { type: 'p', texte: 'Le formulaire de demande de devis recueille :' },
        { type: 'li', texte: 'le type de projet et la commune du chantier ;' },
        { type: 'li', texte: 'le délai souhaité ;' },
        { type: 'li', texte: 'votre message, si vous en écrivez un ;' },
        { type: 'li', texte: 'un numéro de téléphone ou une adresse e-mail, pour vous rappeler.' },
        { type: 'p', texte: `Ces demandes sont transmises directement à ${vars.entreprise} par la plateforme Presti.` },
      ],
    },
    { h2: 'Finalité et durée de conservation', blocs: [{ type: 'p', texte: 'Ces données servent uniquement à vous recontacter et à établir un devis. Elles ne sont ni cédées, ni vendues, ni louées.' }] },
    { h2: 'Vos droits', blocs: [{ type: 'p', texte: `Conformément au Règlement général sur la protection des données (RGPD), vous pouvez consulter, corriger ou faire effacer vos données auprès de ${vars.entreprise}${commande.email ? `, à ${commande.email}` : ''}.` }] },
  ]
  return {
    type: 'legal',
    title: `Politique de confidentialité — ${vars.entreprise}`,
    description: `Ce que le formulaire de devis de ${vars.entreprise} recueille, pourquoi, et combien de temps ces données sont gardées.`,
    h1: 'Politique de confidentialité',
    sections,
    jsonld: [],
  }
}

// ── L'assemblage ─────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Assemble `contenu.json` (v2) à partir du modèle du métier et des seuls faits du dossier. `appel`, s'il est fourni,
 * ne rédige que le chapeau et l'introduction de chaque page de commune, toujours contrôlés et dégradés vers le texte
 * du modèle en cas d'invention. → { contenu: null, rapport: { bloquant } } si aucune prestation n'est déclarée, ou si
 * un métier secondaire déclaré n'a pas de modèle.
 */
export async function redigerContenuV2(entree: Entree, appel?: Appel): Promise<{ contenu: ContenuV2 | null; rapport: Rapport }> {
  const rapport: Rapport = { redige: [], rejets: [], degradations: [], ia: 'ok' }
  const { commande, artisan, modele, modelesSecondaires = {} } = entree
  const declarees = prestationsDeclarees(commande, artisan)
  if (!declarees.length) { rapport.bloquant = 'prestations non déclarées'; return { contenu: null, rapport } }

  const communes = [...new Set((commande.communes ?? []).map((c) => String(c ?? '').trim()).filter(Boolean))]
  if (!communes.length) { rapport.bloquant = 'aucune commune déclarée'; return { contenu: null, rapport } }

  const entreprise = String(commande.nom ?? '').trim()
  const varsAccueil: Vars = { entreprise, ville: communes[0], metier: commande.metier, prestationsTxt: declarees.join(', ') }
  const prestationsAccueil = construirePrestations(declarees, modele, varsAccueil)
  const faits = construireFaits(commande, declarees)
  const profil = construireProfil(commande, declarees)

  const pages: Record<string, PageV2> = {}
  pages['/'] = pageAccueil(commande, varsAccueil, prestationsAccueil, communes)
  rapport.redige.push('/')

  for (const commune of communes) {
    const vars: Vars = { entreprise, ville: commune, metier: commande.metier, prestationsTxt: declarees.join(', ') }
    const prestations = construirePrestations(declarees, modele, vars)
    const repli = texteModeleCommune(modele, vars)
    const texte = appel ? await rediger(vars, appel, faits, profil, repli, rapport) : repli
    const chemin = `/${slug(commande.metier)}-${slug(commune)}/`
    pages[chemin] = pageCommune(commune, commande, vars, prestations, texte, communes.filter((c) => c !== commune))
    rapport.redige.push(chemin)
  }

  for (const metierSec of commande.metiers_secondaires ?? []) {
    const modeleSec = modelesSecondaires[metierSec]
    if (!modeleSec) { rapport.bloquant = `modèle secondaire absent : ${metierSec}`; return { contenu: null, rapport } }
    const varsSec: Vars = { entreprise, ville: communes[0], metier: metierSec, prestationsTxt: declarees.join(', ') }
    const prestationsSec = construirePrestations(declarees, modeleSec, varsSec)
    pages[`/${slug(metierSec)}/`] = pageMetierSecondaire(metierSec, commande, varsSec, prestationsSec)
  }

  pages['/mentions-legales/'] = pageMentionsLegales(commande, varsAccueil)
  pages['/confidentialite/'] = pageConfidentialite(commande, varsAccueil)
  rapport.redige.push('/mentions-legales/', '/confidentialite/')

  return { contenu: { metier: commande.metier, pages }, rapport }
}
