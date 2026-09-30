// lib/agents/acquisition/modeles.ts — les modèles de message de l'acquisition (fiche 026-083, écrit par Claude Code).
//
// Voie gratuite du 25/09 : un premier contact part par le formulaire de contact du site (`formulaire_site`), jamais par un
// e-mail à froid ; la suite part du Gmail de prospection, seulement à qui a répondu (`email_sollicite`), ou de la messagerie
// Meta. Chaque modèle est un gabarit à emplacements (`{fait}`, `{douleur}`, `{adresse}`…) ; J3 (conformite.ts) n'accepte
// qu'un texte EXACTEMENT égal au gabarit rempli. Toutes les entrées naissent à `approuve: false` : Benj les approuve une
// fois, Claude Code passe `approuve: true` dans un commit à part.
//
// Module pur : ni réseau, ni base, ni `process.env`, aucun import de `@/lib/ai`, `@/lib/agents/llm` ni `@/lib/studio`. Le prix
// et le nombre de vidéos du Studio ne sont jamais écrits ici : `{videos}` et `{prix}` sont remplis par le Répondeur depuis
// `lib/studio/offre.ts` (026-166). Syntaxe effaçable seulement (ts-loader) : ni `enum`, ni `namespace`.
import { createHash } from 'node:crypto'
import type { Canal, TypeEnvoi } from './contrat'
import { PREMIERE_PHRASE } from './contrat'

export { PREMIERE_PHRASE }

/** Le pied de tout formulaire. `{source_liste}` : la phrase de `SOURCES_LISTE` de la source du prospect (contrat.ts). */
export const PIED_FORMULAIRE =
  'Benjamin Filiot, Presti.\n{source_liste} Vos données : {notice}\nPour ne plus rien recevoir : écrivez STOP à {adresse}.\nRéf. {reference}'
/** Le pied d'un courriel sollicité : identité, mention IA, notice, STOP en réponse. */
export const PIED_SOLLICITE =
  "Benjamin Filiot, Presti.\nMessage rédigé et envoyé par l'assistant IA de Presti.\nVos données : {notice}\nPour ne plus rien recevoir : répondez STOP."
/** La mention IA et le STOP des formes Meta d'un Répondeur (tutoiement, sans notice : la personne écrit sur Meta). */
const PIED_META = "Message rédigé par l'assistant IA de Presti. Pour ne plus rien recevoir : réponds STOP."
const MENTION_IA = "Message rédigé et envoyé par l'assistant IA de Presti."
const ANNONCE_RELANCE = 'Sans réponse de votre part, je vous relancerai une seule fois dans 4 jours.'

export interface ModeleMessage {
  id: string
  canaux: readonly Canal[]
  types: readonly (TypeEnvoi | 'sujet')[]
  texte: string
  emplacements: readonly string[]
  approuve: boolean
  empreinte: string
  chiffres_justifies: readonly string[]
  liens_permis: readonly string[]
}

/**
 * Les modèles approuvés : approuvé le 29/09/2026 par Claude Code, par délégation de Benj (decisions.md). Chaque id de cette liste a
 * sa ligne dans .orchestre/preuves/026-083/approbation.txt, à l'empreinte du texte actuel : conformite-qa (CO-3) refuse un modèle
 * approuvé dont le texte a changé depuis. NON approuvés, et pourquoi : le Studio (formulaire_studio_v1, sujet_studio_v1,
 * studio_accuse_v1, studio_echantillon_v1, studio_offre_v1) tant que les conditions de l'API ads_archive de Meta ne sont pas lues
 * (docs/agents/meta-ads-archive-conditions.md : Verdict REFUSE), et studio_offre_v1 aussi parce qu'il n'a ni mention IA, ni STOP,
 * ni notice.
 */
export const APPROUVES: readonly string[] = Object.freeze([
  'formulaire_B_v1', 'formulaire_A_v1', 'sujet_formulaire_v1', 'questions_entrant_v2', 'relance_oui_v1',
  'lien_maquette_email_v2', 'lien_maquette_meta_v1', 'lien_maquette_email_rdv_v1', 'lien_maquette_meta_rdv_v1',
  'lien_maquette_entrant_email_v1', 'lien_maquette_entrant_meta_v1', 'lien_maquette_entrant_email_rdv_v1', 'lien_maquette_entrant_meta_rdv_v1',
  'rep_prix_email', 'rep_prix_meta', 'rep_prix_rdv_email', 'rep_prix_rdv_meta', 'rep_appel_email', 'rep_appel_meta', 'rep_faq_email', 'rep_faq_meta',
  'rep_rgpd_accuse_email', 'rep_rgpd_accuse_meta', 'rep_rgpd_acces_email', 'rep_rgpd_acces_meta', 'rep_rgpd_efface_email', 'rep_rgpd_efface_meta',
  'stop_confirmation',
])

const emplacementsDe = (texte: string): string[] => [...new Set([...texte.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[0]))]
const empreinteDe = (texte: string): string => createHash('sha256').update(texte, 'utf8').digest('hex')

interface Extra {
  chiffres_justifies?: string[]
  liens_permis?: string[]
}
function modele(id: string, canaux: Canal[], types: (TypeEnvoi | 'sujet')[], texte: string, extra: Extra = {}): ModeleMessage {
  return Object.freeze({
    id,
    canaux: Object.freeze([...canaux]),
    types: Object.freeze([...types]),
    texte,
    emplacements: Object.freeze(emplacementsDe(texte)),
    approuve: APPROUVES.includes(id),
    empreinte: empreinteDe(texte),
    chiffres_justifies: Object.freeze([...(extra.chiffres_justifies ?? [])]),
    liens_permis: Object.freeze([...(extra.liens_permis ?? [])]),
  })
}

const FORMULAIRE = ['formulaire_site'] as Canal[]
const COURRIEL = ['email_sollicite'] as Canal[]
const META = ['messagerie'] as Canal[]
const OFFRE_300 = { chiffres_justifies: ['300 €', '48 h'], liens_permis: ['{lien}', '{paiement}', '{rendez_vous}'] }
const OFFRE_300_RDV = { chiffres_justifies: ['300 €'], liens_permis: ['{lien}', '{rendez_vous}'] }

const PRIX_ET_ACHAT = 'Le site complet : 300 €, une fois, TVA non applicable. En ligne sous 48 h ouvrées après validation. {paiement} Ou 15 min avec Benjamin : {rendez_vous}.'
const PRIX_RDV = 'Le site complet : 300 €, une fois, TVA non applicable. Pour en discuter, 15 min avec Benjamin : {rendez_vous}.'

export const MODELES: Readonly<Record<string, ModeleMessage>> = Object.freeze({
  // ── Formulaires : le premier contact, texte du §1.1 de la voie gratuite ─────────────────────────────────────────────────
  formulaire_B_v1: modele('formulaire_B_v1', FORMULAIRE, ['premier_contact'],
    `${PREMIERE_PHRASE}\nBonjour, {fait}. {douleur}\nJe peux vous préparer gratuitement une maquette privée de la page d'accueil d'un nouveau site à votre nom. Si ça vous intéresse, écrivez à {adresse}.\n${PIED_FORMULAIRE}`),
  formulaire_A_v1: modele('formulaire_A_v1', FORMULAIRE, ['premier_contact'],
    `${PREMIERE_PHRASE}\nBonjour, {fait}. {douleur}\nJ'ai préparé gratuitement une maquette privée de la page d'accueil d'un nouveau site à votre nom. Si ça vous intéresse, écrivez à {adresse}.\n${PIED_FORMULAIRE}`),
  formulaire_studio_v1: modele('formulaire_studio_v1', FORMULAIRE, ['premier_contact'],
    `${PREMIERE_PHRASE}\nBonjour, j'ai vu votre publicité pour {produit} dans la bibliothèque publicitaire de Meta. Je peux vous préparer gratuitement un essai de vidéo pour {produit}, à partir de vos photos, si vous m'y autorisez. Si ça vous intéresse, écrivez à {adresse}.\n${PIED_FORMULAIRE}`),
  // ── Les sujets du champ « Sujet » d'un formulaire ───────────────────────────────────────────────────────────────────────
  sujet_formulaire_v1: modele('sujet_formulaire_v1', FORMULAIRE, ['sujet'], 'Proposition commerciale : un site pour {entreprise}'),
  sujet_studio_v1: modele('sujet_studio_v1', FORMULAIRE, ['sujet'], 'Proposition commerciale : une vidéo pour {produit}'),

  // ── Entrants : la réponse privée (message unique, sollicité, sans STOP) ─────────────────────────────────────────────────
  questions_entrant_v2: modele('questions_entrant_v2', ['reponse_privee', 'messagerie'], ['reponse'],
    "Merci ! Ici l'assistant IA de Presti. Pour ta maquette : ton métier, ta ville, ton site ou ta page si tu en as un, et ton e-mail pour te l'envoyer ?"),

  // ── La seule relance, 4 jours après un lien de maquette qui l'annonçait ─────────────────────────────────────────────────
  relance_oui_v1: modele('relance_oui_v1', COURRIEL, ['relance'],
    `Je reviens vers vous comme annoncé : votre maquette est toujours en ligne, {lien}. Si vous préférez en parler, 15 min avec Benjamin : {rendez_vous}.\n${PIED_SOLLICITE}`,
    { liens_permis: ['{lien}', '{rendez_vous}'] }),

  // ── Après un « oui » : froid ────────────────────────────────────────────────────────────────────────────────────────────
  lien_maquette_email_v2: modele('lien_maquette_email_v2', COURRIEL, ['lien_maquette'],
    `Comme promis, voici votre maquette : {lien}. ${PRIX_ET_ACHAT}\n${ANNONCE_RELANCE}\n${PIED_SOLLICITE}`, OFFRE_300),
  lien_maquette_meta_v1: modele('lien_maquette_meta_v1', META, ['lien_maquette'],
    `Comme promis, voici ta maquette : {lien}. ${PRIX_ET_ACHAT}
${PIED_META}`, OFFRE_300),
  lien_maquette_email_rdv_v1: modele('lien_maquette_email_rdv_v1', COURRIEL, ['lien_maquette'],
    `Comme promis, voici votre maquette : {lien}. ${PRIX_RDV}\n${ANNONCE_RELANCE}\n${PIED_SOLLICITE}`, OFFRE_300_RDV),
  lien_maquette_meta_rdv_v1: modele('lien_maquette_meta_rdv_v1', META, ['lien_maquette'],
    `Comme promis, voici ta maquette : {lien}. ${PRIX_RDV}
${PIED_META}`, OFFRE_300_RDV),
  // ── Après un « oui » : entrant (sans `{fait}`, il a demandé sa maquette) ────────────────────────────────────────────────
  lien_maquette_entrant_email_v1: modele('lien_maquette_entrant_email_v1', COURRIEL, ['lien_maquette'],
    `Voici la maquette que vous avez demandée : {lien}. ${PRIX_ET_ACHAT}\n${ANNONCE_RELANCE}\n${PIED_SOLLICITE}`, OFFRE_300),
  lien_maquette_entrant_meta_v1: modele('lien_maquette_entrant_meta_v1', META, ['lien_maquette'],
    `Voici la maquette que tu as demandée : {lien}. ${PRIX_ET_ACHAT}
${PIED_META}`, OFFRE_300),
  lien_maquette_entrant_email_rdv_v1: modele('lien_maquette_entrant_email_rdv_v1', COURRIEL, ['lien_maquette'],
    `Voici la maquette que vous avez demandée : {lien}. ${PRIX_RDV}\n${ANNONCE_RELANCE}\n${PIED_SOLLICITE}`, OFFRE_300_RDV),
  lien_maquette_entrant_meta_rdv_v1: modele('lien_maquette_entrant_meta_rdv_v1', META, ['lien_maquette'],
    `Voici la maquette que tu as demandée : {lien}. ${PRIX_RDV}
${PIED_META}`, OFFRE_300_RDV),

  // ── Répondeur : chaque réponse en deux formes, `_email` (vouvoiement, pied sollicité) et `_meta` (tutoiement) ──────────────
  rep_prix_email: modele('rep_prix_email', COURRIEL, ['reponse'], `${PRIX_ET_ACHAT}\n${PIED_SOLLICITE}`,
    { chiffres_justifies: ['300 €', '48 h'], liens_permis: ['{paiement}', '{rendez_vous}'] }),
  rep_prix_meta: modele('rep_prix_meta', META, ['reponse'], `${PRIX_ET_ACHAT}\n${PIED_META}`,
    { chiffres_justifies: ['300 €', '48 h'], liens_permis: ['{paiement}', '{rendez_vous}'] }),
  rep_prix_rdv_email: modele('rep_prix_rdv_email', COURRIEL, ['reponse'], `${PRIX_RDV}\n${PIED_SOLLICITE}`,
    { chiffres_justifies: ['300 €'], liens_permis: ['{rendez_vous}'] }),
  rep_prix_rdv_meta: modele('rep_prix_rdv_meta', META, ['reponse'], `${PRIX_RDV}\n${PIED_META}`,
    { chiffres_justifies: ['300 €'], liens_permis: ['{rendez_vous}'] }),
  rep_appel_email: modele('rep_appel_email', COURRIEL, ['reponse'], `Avec plaisir : 15 min avec Benjamin, {rendez_vous}.\n${PIED_SOLLICITE}`,
    { liens_permis: ['{rendez_vous}'] }),
  rep_appel_meta: modele('rep_appel_meta', META, ['reponse'], `Avec plaisir : 15 min avec Benjamin, {rendez_vous}.\n${PIED_META}`,
    { liens_permis: ['{rendez_vous}'] }),
  rep_faq_email: modele('rep_faq_email', COURRIEL, ['reponse'], `{reponse_faq}\nPour en discuter, {rendez_vous}.\n${PIED_SOLLICITE}`,
    { liens_permis: ['{rendez_vous}'] }),
  rep_faq_meta: modele('rep_faq_meta', META, ['reponse'], `{reponse_faq}\nPour en discuter, {rendez_vous}.\n${PIED_META}`,
    { liens_permis: ['{rendez_vous}'] }),

  // ── Répondeur : les demandes sur ses données (RGPD art. 12, 15, 17), sans STOP : c'est la réponse due ─────────────────────
  rep_rgpd_accuse_email: modele('rep_rgpd_accuse_email', COURRIEL, ['reponse_rgpd'],
    `Votre demande est bien reçue ; réponse dans un mois au plus, par Benjamin Filiot, responsable du traitement.\n${MENTION_IA}\nVos données : {notice}`),
  rep_rgpd_accuse_meta: modele('rep_rgpd_accuse_meta', META, ['reponse_rgpd'],
    "Ta demande est bien reçue ; réponse dans un mois au plus, par Benjamin Filiot, responsable du traitement.\nMessage rédigé par l'assistant IA de Presti."),
  rep_rgpd_acces_email: modele('rep_rgpd_acces_email', COURRIEL, ['reponse_rgpd'],
    `Voici les données que Presti garde sur vous : {export}\n${MENTION_IA}\nVos données : {notice}`),
  rep_rgpd_acces_meta: modele('rep_rgpd_acces_meta', META, ['reponse_rgpd'],
    "Voici les données que Presti garde sur toi : {export}\nMessage rédigé par l'assistant IA de Presti."),
  rep_rgpd_efface_email: modele('rep_rgpd_efface_email', COURRIEL, ['reponse_rgpd'],
    `Vos données seront effacées sous 7 jours ; seule la trace de votre refus est gardée, pour ne plus vous écrire.\n${MENTION_IA}\nVos données : {notice}`),
  rep_rgpd_efface_meta: modele('rep_rgpd_efface_meta', META, ['reponse_rgpd'],
    "Tes données seront effacées sous 7 jours ; seule la trace de ton refus est gardée, pour ne plus t'écrire.\nMessage rédigé par l'assistant IA de Presti."),

  // ── La confirmation d'un STOP : un seul message, sans pied ──────────────────────────────────────────────────────────────
  stop_confirmation: modele('stop_confirmation', ['email_sollicite', 'messagerie'], ['confirmation_stop'],
    `C'est noté : plus aucun message de Presti.\n${MENTION_IA}`),

  // ── Le Studio pubs (une `marque` qui a répondu « oui ») ─────────────────────────────────────────────────────────────────
  studio_accuse_v1: modele('studio_accuse_v1', COURRIEL, ['reponse'],
    `Merci pour votre accord. Je prépare un essai de vidéo pour {produit} à partir des photos de votre site ; il reste privé et n'est diffusé nulle part. Je vous l'envoie ici.\n${PIED_SOLLICITE}`),
  studio_echantillon_v1: modele('studio_echantillon_v1', COURRIEL, ['reponse'],
    `Voici l'Échantillon promis pour {produit}, en pièce jointe. Il n'est diffusé nulle part. S'il vous plaît, répondez-moi simplement : je vous dirai ce que contient le pack de départ.\n${PIED_SOLLICITE}`),
  studio_offre_v1: modele('studio_offre_v1', COURRIEL, ['reponse'],
    "{videos} vidéos de démonstration de {produit}, pour {prix}, une fois. Rien n'est diffusé sans votre accord écrit. Pour commander : {paiement}",
    { chiffres_justifies: ['{videos}', '{prix}'], liens_permis: ['{paiement}'] }),
})

/**
 * Le `{fait}` d'un formulaire de site : il parle de refonte (la cible a déjà un site), jamais d'un site « sans formulaire ».
 * `{extrait}` : la citation lue, au plus privée de sa ponctuation finale (`.`, `!`, `;`, `:`), rien d'autre. `pub_meta` :
 * `{date}` = date de première diffusion, JJ/MM/AAAA (le Studio).
 */
export const AMORCES: Readonly<Record<string, string>> = Object.freeze({
  site_titre: 'sur votre site, « {extrait} »',
  site_h1: 'sur votre site, « {extrait} »',
  site_intertitre: 'sur votre site, « {extrait} »',
  site_http: "votre site s'ouvre sans le cadenas HTTPS",
  site_mobile: "votre site n'a pas de version adaptée au téléphone",
  site_copyright: 'le bas de votre site indique « {extrait} »',
  pub_meta: 'votre publicité du {date} sur Facebook, « {extrait} »',
})

/** Les emplacements d'un texte (« {xxx} »), dans l'ordre d'apparition, sans doublon. */
export { emplacementsDe }
