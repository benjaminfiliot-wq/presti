// scripts/fixtures/026-acquisition/messages/modeles.mjs — la copie du juge (026-069) des modèles de formulaire, des sujets
// et des réponses, écrite par Claude Code. `conformite-qa.mjs` compare caractère pour caractère, en --auto-controle
// (AC-1), le texte des gabarits marqués « CO-2 » ci-dessous au texte du §1.1 de
// SaaS/Produit/Ecosysteme-Prospection-Gratuite-2026-09-24.md (formulaire_B_v1, formulaire_A_v1, sujet_formulaire_v1) et au
// point 1 de .orchestre/brouillons-ecosysteme/026/026-083.md (formulaire_studio_v1, sujet_studio_v1, PIED_FORMULAIRE,
// PIED_SOLLICITE, relance_oui_v1, studio_offre_v1, questions_entrant_v2) : c'est cette fidélité, pas une extraction
// automatique, qui fait foi (CO-2 le refait plus tard contre le fichier .ts réel). Les autres modèles (Répondeur,
// lien_maquette_*, stop_confirmation, studio_accuse/echantillon) ne sont pas soumis à ce test octet pour octet : ils
// portent seulement les fragments que J3 exige (STOP, mention IA, emplacements).
//
// `{xxx}` marque un emplacement rempli par le corpus (corpus.mjs) : {fait}, {douleur}, {adresse}, {notice}, {reference},
// {entreprise}, {produit}, {lien}, {rendez_vous}, {paiement}, {videos}, {prix}, {reponse_faq}, {export}.

export const PREMIERE_PHRASE = "Message commercial de Presti, rédigé et envoyé par l'assistant IA de Presti. Ce n'est pas une demande de devis."

export const SOURCES_LISTE = Object.freeze({
  ademe_rge: "Votre site figure dans la liste publique des entreprises RGE de l'ADEME.",
  meta: 'Votre publicité figure dans la bibliothèque publique des publicités de Meta.',
})

/** CO-2 : « Benjamin Filiot, Presti. » + phrase de la source + « Pour ne plus rien recevoir : écrivez STOP à {adresse}. » + « Réf. {reference} ». */
export function piedFormulaire(source) {
  return `Benjamin Filiot, Presti.\n${SOURCES_LISTE[source]} Vos données : {notice}\nPour ne plus rien recevoir : écrivez STOP à {adresse}.\nRéf. {reference}`
}
/** CO-2 : identité, mention IA, notice, STOP en réponse (pas « écrivez à », un e-mail déjà reçu répond). */
export const PIED_SOLLICITE = "Benjamin Filiot, Presti.\nMessage rédigé et envoyé par l'assistant IA de Presti.\nVos données : {notice}\nPour ne plus rien recevoir : répondez STOP."

export const SUJET_FORMULAIRE_V1 = 'Proposition commerciale : un site pour {entreprise}'
export const SUJET_STUDIO_V1 = 'Proposition commerciale : une vidéo pour {produit}'

/** Un modèle : { id, canaux, types, texte(source?) → string, chiffres_justifies, liens_permis, approuve }. */
function m(id, canaux, types, texte, extra = {}) {
  return { id, canaux, types, texte, chiffres_justifies: [], liens_permis: [], approuve: true, ...extra }
}

export const MODELES = Object.freeze({
  // ── Formulaires (CO-2 : fidélité exacte au §1.1 / au point 1 de 026-083, aux emplacements près) ──────────────────────────
  formulaire_B_v1: m('formulaire_B_v1', ['formulaire_site'], ['premier_contact'], (source) => `${PREMIERE_PHRASE}\nBonjour, {fait}. {douleur}\nJe peux vous préparer gratuitement une maquette privée de la page d'accueil d'un nouveau site à votre nom. Si ça vous intéresse, écrivez à {adresse}.\n${piedFormulaire(source)}`),
  formulaire_A_v1: m('formulaire_A_v1', ['formulaire_site'], ['premier_contact'], (source) => `${PREMIERE_PHRASE}\nBonjour, {fait}. {douleur}\nJ'ai préparé gratuitement une maquette privée de la page d'accueil d'un nouveau site à votre nom. Si ça vous intéresse, écrivez à {adresse}.\n${piedFormulaire(source)}`),
  formulaire_studio_v1: m('formulaire_studio_v1', ['formulaire_site'], ['premier_contact'], () => `${PREMIERE_PHRASE}\nBonjour, j'ai vu votre publicité pour {produit} dans la bibliothèque publicitaire de Meta. Je peux vous préparer gratuitement un essai de vidéo pour {produit}, à partir de vos photos, si vous m'y autorisez. Si ça vous intéresse, écrivez à {adresse}.\n${piedFormulaire('meta')}`),

  // ── Réponse privée / entrant (CO-2) ───────────────────────────────────────────────────────────────────────────────────────
  questions_entrant_v2: m('questions_entrant_v2', ['reponse_privee', 'messagerie'], ['reponse'], () => "Merci ! Ici l'assistant IA de Presti. Pour ta maquette : ton métier, ta ville, ton site ou ta page si tu en as un, et ton e-mail pour te l'envoyer ?"),

  // ── La seule relance (CO-2) ────────────────────────────────────────────────────────────────────────────────────────────────
  relance_oui_v1: m('relance_oui_v1', ['email_sollicite'], ['relance'], () => `Je reviens vers vous comme annoncé : votre maquette est toujours en ligne, {lien}. Si vous préférez en parler, 15 min avec Benjamin : {rendez_vous}.\n${PIED_SOLLICITE}`),

  // ── Le Studio (CO-2 sur studio_offre_v1 seulement) ────────────────────────────────────────────────────────────────────────
  studio_offre_v1: m('studio_offre_v1', ['email_sollicite'], ['reponse'], () => '{videos} vidéos de démonstration de {produit}, pour {prix}, une fois. Rien n\'est diffusé sans votre accord écrit. Pour commander : {paiement}', { chiffres_justifies: ['{videos}', '{prix}'], liens_permis: ['{paiement}'] }),
  studio_accuse_v1: m('studio_accuse_v1', ['email_sollicite'], ['reponse'], () => `Merci pour votre accord. Je prépare un essai de vidéo pour {produit} à partir des photos de votre site ; il reste privé et n'est diffusé nulle part. Je vous l'envoie ici.\n${PIED_SOLLICITE}`),
  studio_echantillon_v1: m('studio_echantillon_v1', ['email_sollicite'], ['reponse'], () => `Voici l'Échantillon promis pour {produit}, en pièce jointe. Il n'est diffusé nulle part. S'il vous plaît, répondez-moi simplement : je vous dirai ce que contient le pack de départ.\n${PIED_SOLLICITE}`),

  // ── Après un « oui » (pas de fidélité exacte imposée, seulement les fragments requis par J3) ──────────────────────────────
  lien_maquette_email_v2: m('lien_maquette_email_v2', ['email_sollicite'], ['lien_maquette'], () => `Comme promis, voici votre maquette : {lien}. Le site complet : 300 €, une fois, TVA non applicable. En ligne sous 48 h ouvrées après validation. {paiement} Ou 15 min avec Benjamin : {rendez_vous}.\nSans réponse de votre part, je vous relancerai une seule fois dans 4 jours.\n${PIED_SOLLICITE}`, { chiffres_justifies: ['300 €', '48 h'], liens_permis: ['{lien}', '{paiement}', '{rendez_vous}'] }),
  lien_maquette_meta_v1: m('lien_maquette_meta_v1', ['messagerie'], ['lien_maquette'], () => `Comme promis, voici ta maquette : {lien}. Le site complet : 300 €, une fois, TVA non applicable. En ligne sous 48 h ouvrées après validation. {paiement} Ou 15 min avec Benjamin : {rendez_vous}.`, { chiffres_justifies: ['300 €', '48 h'], liens_permis: ['{lien}', '{paiement}', '{rendez_vous}'] }),
  lien_maquette_email_rdv_v1: m('lien_maquette_email_rdv_v1', ['email_sollicite'], ['lien_maquette'], () => `Comme promis, voici votre maquette : {lien}. Le site complet : 300 €, une fois, TVA non applicable. Pour en discuter, 15 min avec Benjamin : {rendez_vous}.\nSans réponse de votre part, je vous relancerai une seule fois dans 4 jours.\n${PIED_SOLLICITE}`, { chiffres_justifies: ['300 €'], liens_permis: ['{lien}', '{rendez_vous}'] }),
  lien_maquette_meta_rdv_v1: m('lien_maquette_meta_rdv_v1', ['messagerie'], ['lien_maquette'], () => `Comme promis, voici ta maquette : {lien}. Le site complet : 300 €, une fois, TVA non applicable. Pour en discuter, 15 min avec Benjamin : {rendez_vous}.`, { chiffres_justifies: ['300 €'], liens_permis: ['{lien}', '{rendez_vous}'] }),
  lien_maquette_entrant_email_v1: m('lien_maquette_entrant_email_v1', ['email_sollicite'], ['lien_maquette'], () => `Voici la maquette que vous avez demandée : {lien}. Le site complet : 300 €, une fois, TVA non applicable. En ligne sous 48 h ouvrées après validation. {paiement} Ou 15 min avec Benjamin : {rendez_vous}.\nSans réponse de votre part, je vous relancerai une seule fois dans 4 jours.\n${PIED_SOLLICITE}`, { chiffres_justifies: ['300 €', '48 h'], liens_permis: ['{lien}', '{paiement}', '{rendez_vous}'] }),
  lien_maquette_entrant_meta_v1: m('lien_maquette_entrant_meta_v1', ['messagerie'], ['lien_maquette'], () => `Voici la maquette que tu as demandée : {lien}. Le site complet : 300 €, une fois, TVA non applicable. En ligne sous 48 h ouvrées après validation. {paiement} Ou 15 min avec Benjamin : {rendez_vous}.`, { chiffres_justifies: ['300 €', '48 h'], liens_permis: ['{lien}', '{paiement}', '{rendez_vous}'] }),
  lien_maquette_entrant_email_rdv_v1: m('lien_maquette_entrant_email_rdv_v1', ['email_sollicite'], ['lien_maquette'], () => `Voici la maquette que vous avez demandée : {lien}. Le site complet : 300 €, une fois, TVA non applicable. Pour en discuter, 15 min avec Benjamin : {rendez_vous}.\nSans réponse de votre part, je vous relancerai une seule fois dans 4 jours.\n${PIED_SOLLICITE}`, { chiffres_justifies: ['300 €'], liens_permis: ['{lien}', '{rendez_vous}'] }),
  lien_maquette_entrant_meta_rdv_v1: m('lien_maquette_entrant_meta_rdv_v1', ['messagerie'], ['lien_maquette'], () => `Voici la maquette que tu as demandée : {lien}. Le site complet : 300 €, une fois, TVA non applicable. Pour en discuter, 15 min avec Benjamin : {rendez_vous}.`, { chiffres_justifies: ['300 €'], liens_permis: ['{lien}', '{rendez_vous}'] }),

  // ── Répondeur (deux formes, e-mail vouvoyé / Meta tutoyé) ─────────────────────────────────────────────────────────────────
  rep_prix_email: m('rep_prix_email', ['email_sollicite'], ['reponse'], () => `Le site complet : 300 €, une fois, TVA non applicable. En ligne sous 48 h ouvrées après validation. {paiement} Ou 15 min avec Benjamin : {rendez_vous}.\n${PIED_SOLLICITE}`, { chiffres_justifies: ['300 €', '48 h'], liens_permis: ['{paiement}', '{rendez_vous}'] }),
  rep_prix_meta: m('rep_prix_meta', ['messagerie'], ['reponse'], () => `Le site complet : 300 €, une fois, TVA non applicable. En ligne sous 48 h ouvrées après validation. {paiement} Ou 15 min avec Benjamin : {rendez_vous}.`, { chiffres_justifies: ['300 €', '48 h'], liens_permis: ['{paiement}', '{rendez_vous}'] }),
  rep_prix_rdv_email: m('rep_prix_rdv_email', ['email_sollicite'], ['reponse'], () => `Le site complet : 300 €, une fois, TVA non applicable. Pour en discuter, 15 min avec Benjamin : {rendez_vous}.\n${PIED_SOLLICITE}`, { chiffres_justifies: ['300 €'], liens_permis: ['{rendez_vous}'] }),
  rep_appel_email: m('rep_appel_email', ['email_sollicite'], ['reponse'], () => `Avec plaisir : 15 min avec Benjamin, {rendez_vous}.\n${PIED_SOLLICITE}`, { liens_permis: ['{rendez_vous}'] }),
  rep_appel_meta: m('rep_appel_meta', ['messagerie'], ['reponse'], () => 'Avec plaisir : 15 min avec Benjamin, {rendez_vous}.', { liens_permis: ['{rendez_vous}'] }),
  rep_faq_email: m('rep_faq_email', ['email_sollicite'], ['reponse'], () => `{reponse_faq}\nPour en discuter, {rendez_vous}.\n${PIED_SOLLICITE}`, { liens_permis: ['{rendez_vous}'] }),
  rep_faq_meta: m('rep_faq_meta', ['messagerie'], ['reponse'], () => '{reponse_faq}\nPour en discuter, {rendez_vous}.', { liens_permis: ['{rendez_vous}'] }),
  rep_rgpd_accuse_email: m('rep_rgpd_accuse_email', ['email_sollicite'], ['reponse_rgpd'], () => "Votre demande est bien reçue ; réponse dans un mois au plus, par Benjamin Filiot, responsable du traitement.\nMessage rédigé et envoyé par l'assistant IA de Presti.\nVos données : {notice}"),
  rep_rgpd_acces_email: m('rep_rgpd_acces_email', ['email_sollicite'], ['reponse_rgpd'], () => "Voici les données que Presti garde sur vous : {export}\nMessage rédigé et envoyé par l'assistant IA de Presti.\nVos données : {notice}"),
  rep_rgpd_efface_email: m('rep_rgpd_efface_email', ['email_sollicite'], ['reponse_rgpd'], () => "Vos données seront effacées sous 7 jours ; seule la trace de votre refus est gardée, pour ne plus vous écrire.\nMessage rédigé et envoyé par l'assistant IA de Presti.\nVos données : {notice}"),
  stop_confirmation: m('stop_confirmation', ['email_sollicite', 'messagerie'], ['confirmation_stop'], () => "C'est noté : plus aucun message de Presti.\nMessage rédigé et envoyé par l'assistant IA de Presti."),
})

/** Les emplacements d'un texte (« {xxx} »). */
export const emplacementsDe = (texte) => [...new Set([...texte.matchAll(/\{([a-z_]+)\}/g)].map((m2) => m2[0]))]
