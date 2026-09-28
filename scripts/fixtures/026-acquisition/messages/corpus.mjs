// scripts/fixtures/026-acquisition/messages/corpus.mjs — le corpus étiqueté de J3 (fiche 026-069), écrit par Claude Code.
// CONFORMES (≥16) et FAUTIFS (≥40, ≥28 raisons distinctes, JP-4) sont construits à partir de la copie des modèles
// (modeles.mjs) et des repères (reperes.json, douleurs.json) : chaque fautif est le remplissage conforme d'un modèle, puis
// UNE mutation ciblée qui porte la raison attendue. En --auto-controle, conformite-qa.mjs ne rejoue pas jugerMessage (le
// module n'existe pas encore) : il vérifie que chaque étiquette est connue (RAISONS_FERMEES) et que les seuils de JP-4 sont
// atteints — la substance (est-ce VRAIMENT hors modèle ?) sera confirmée par 026-083 une fois conformite.ts écrit.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODELES, PREMIERE_PHRASE, PIED_SOLLICITE, SUJET_FORMULAIRE_V1, SUJET_STUDIO_V1 } from './modeles.mjs'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const lireJson = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
export const REPERES = lireJson('reperes.json')
export const DOULEURS = lireJson('douleurs.json').douleurs

/** La liste fermée des raisons de refus de J3 (conformite.ts, 026-083 point 4 et sa revue du 25/09). */
export const RAISONS_FERMEES = Object.freeze([
  'modele_inconnu', 'modele_non_approuve', 'modele_hors_canal', 'hors_modele', 'premiere_phrase', 'sujet_hors_modele',
  'objet_trompeur', 'adresse_reponse_absente', 'lien_formulaire', 'longueur_champ', 'longueur', 'reference_absente',
  'preuve_demande_absente', 'fait_non_verifie', 'extrait_altere', 'fait_refonte', 'douleur_non_approuvee', 'metier_faux',
  'maquette_absente', 'identite_absente', 'mention_ia_absente', 'stop_absent', 'source_absente', 'notice_absente',
  'domaine_principal', 'lien_invalide', 'lien_ferme', 'prix_premier_message', 'offre_hors_parametre', 'promesse', 'oppose',
  'trop_de_messages', 'trop_tot', 'deja_contacte',
])
/** La liste fermée des codes du second juge (secondJuge.ts, 026-083 point 5). */
export const CODES_PIEGES = Object.freeze(['promesse_implicite', 'pression', 'fausse_familiarite', 'se_dit_humain', 'menace', 'ton_insistant', 'hors_sujet'])

const LIEN_43 = (c) => c.repeat(43)
const VALS = {
  fait: 'sur votre site, « Menuiserie Témoin, artisan à Nantes »',
  douleur: DOULEURS.find((d) => d.id === 'menuisier-mesure').question,
  adresse: REPERES.adresse_prospection,
  notice: REPERES.notice_url,
  reference: 'AB12CD',
  entreprise: 'Menuiserie Témoin',
  produit: 'Gourde isotherme Témoin',
  lien: `https://prestiapp.fr/maquette/${LIEN_43('x')}`,
  rendez_vous: `https://prestiapp.fr/rendez-vous/${LIEN_43('y')}`,
  paiement: 'https://prestiapp.fr/site/acheter',
  videos: '5',
  prix: '490 €',
  reponse_faq: 'Le site est en ligne 48 h ouvrées après validation.',
  export: '(fait Témoin : aucune ligne, prospect Témoin)',
}
function remplir(texteFn, source, vals = VALS) {
  let t = texteFn(source)
  for (const [k, v] of Object.entries(vals)) t = t.split(`{${k}}`).join(v)
  return t
}

// ── CONFORMES (≥16) ───────────────────────────────────────────────────────────────────────────────────────────────────────
export const CONFORMES = [
  { id: 'c-formulaire-b-ademe', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', source_prospect: 'ademe_rge', sujet: remplir(() => SUJET_FORMULAIRE_V1, null), texte: remplir(MODELES.formulaire_B_v1.texte, 'ademe_rge'), note: 'formulaire B, artisan, source ADEME' },
  { id: 'c-formulaire-a-ademe', modele_id: 'formulaire_A_v1', canal: 'formulaire_site', type: 'premier_contact', source_prospect: 'ademe_rge', maquette: 'prete', drapeaux: { varianteA: true }, sujet: remplir(() => SUJET_FORMULAIRE_V1, null), texte: remplir(MODELES.formulaire_A_v1.texte, 'ademe_rge'), note: 'variante A, maquette prête' },
  { id: 'c-formulaire-studio', modele_id: 'formulaire_studio_v1', canal: 'formulaire_site', type: 'premier_contact', cible: 'marque', sujet: remplir(() => SUJET_STUDIO_V1, null), texte: remplir(MODELES.formulaire_studio_v1.texte, 'meta'), note: 'Studio pubs, marque' },
  { id: 'c-questions-entrant', modele_id: 'questions_entrant_v2', canal: 'reponse_privee', type: 'reponse', source_prospect: 'entrant', texte: remplir(MODELES.questions_entrant_v2.texte, null), note: 'sans STOP : message unique sollicité' },
  { id: 'c-relance-oui', modele_id: 'relance_oui_v1', canal: 'email_sollicite', type: 'relance', jours_depuis_lien: 4, texte: remplir(MODELES.relance_oui_v1.texte, null), note: 'une seule relance, 4 jours après' },
  { id: 'c-lien-email-froid', modele_id: 'lien_maquette_email_v2', canal: 'email_sollicite', type: 'lien_maquette', preuve_demande: { type: 'message_recu', id: 'reponse-oui-1' }, drapeaux: { siteAchatPublic: true }, texte: remplir(MODELES.lien_maquette_email_v2.texte, null), note: 'froid, e-mail' },
  { id: 'c-lien-meta-froid', modele_id: 'lien_maquette_meta_v1', canal: 'messagerie', type: 'lien_maquette', drapeaux: { siteAchatPublic: true }, texte: remplir(MODELES.lien_maquette_meta_v1.texte, null), note: 'froid, Meta, tutoiement' },
  { id: 'c-lien-email-rdv', modele_id: 'lien_maquette_email_rdv_v1', canal: 'email_sollicite', type: 'lien_maquette', preuve_demande: { type: 'message_recu', id: 'reponse-oui-2' }, drapeaux: { siteAchatPublic: false }, texte: remplir(MODELES.lien_maquette_email_rdv_v1.texte, null), note: 'achat fermé, sans lien de paiement' },
  { id: 'c-lien-entrant-email', modele_id: 'lien_maquette_entrant_email_v1', canal: 'email_sollicite', type: 'lien_maquette', source_prospect: 'entrant', preuve_demande: { type: 'case_entrant', id: 'entrant-1' }, drapeaux: { siteAchatPublic: true }, texte: remplir(MODELES.lien_maquette_entrant_email_v1.texte, null), note: 'entrant, sans fait' },
  { id: 'c-lien-entrant-meta', modele_id: 'lien_maquette_entrant_meta_v1', canal: 'messagerie', type: 'lien_maquette', source_prospect: 'entrant', drapeaux: { siteAchatPublic: true }, texte: remplir(MODELES.lien_maquette_entrant_meta_v1.texte, null), note: 'entrant, Meta, tutoiement' },
  { id: 'c-rep-prix', modele_id: 'rep_prix_email', canal: 'email_sollicite', type: 'reponse', drapeaux: { siteAchatPublic: true }, texte: remplir(MODELES.rep_prix_email.texte, null), note: 'Répondeur : prix' },
  { id: 'c-rep-prix-rdv', modele_id: 'rep_prix_rdv_email', canal: 'email_sollicite', type: 'reponse', drapeaux: { siteAchatPublic: false }, texte: remplir(MODELES.rep_prix_rdv_email.texte, null), note: 'Répondeur : prix, achat fermé' },
  { id: 'c-rep-appel', modele_id: 'rep_appel_email', canal: 'email_sollicite', type: 'reponse', texte: remplir(MODELES.rep_appel_email.texte, null), note: 'Répondeur : appel' },
  { id: 'c-rep-faq', modele_id: 'rep_faq_email', canal: 'email_sollicite', type: 'reponse', texte: remplir(MODELES.rep_faq_email.texte, null), note: 'Répondeur : FAQ' },
  { id: 'c-rep-rgpd-accuse', modele_id: 'rep_rgpd_accuse_email', canal: 'email_sollicite', type: 'reponse_rgpd', demande_rgpd_le_heures: 6, texte: remplir(MODELES.rep_rgpd_accuse_email.texte, null), note: 'accusé RGPD' },
  { id: 'c-rep-rgpd-acces', modele_id: 'rep_rgpd_acces_email', canal: 'email_sollicite', type: 'reponse_rgpd', oppose: true, demande_rgpd_le_heures: 72, texte: remplir(MODELES.rep_rgpd_acces_email.texte, null), note: "accès RGPD à un opposant qui a fait sa demande il y a 3 jours (exception CO-10)" },
  { id: 'c-stop-confirmation', modele_id: 'stop_confirmation', canal: 'email_sollicite', type: 'confirmation_stop', oppose: true, opposition_le_heures: 2, texte: remplir(MODELES.stop_confirmation.texte, null), note: "opposition il y a 2 h (exception CO-10)" },
  { id: 'c-studio-offre', modele_id: 'studio_offre_v1', canal: 'email_sollicite', type: 'reponse', offre: { videos: 5, prix_texte: '490 €' }, texte: remplir(MODELES.studio_offre_v1.texte, null), note: 'offre Studio conforme au paramètre' },
  { id: 'c-studio-accuse', modele_id: 'studio_accuse_v1', canal: 'email_sollicite', type: 'reponse', texte: remplir(MODELES.studio_accuse_v1.texte, null), note: 'Studio : accusé' },
  { id: 'c-studio-echantillon', modele_id: 'studio_echantillon_v1', canal: 'email_sollicite', type: 'reponse', texte: remplir(MODELES.studio_echantillon_v1.texte, null), note: 'Studio : échantillon' },
]

// ── FAUTIFS (≥40, ≥28 raisons distinctes) ────────────────────────────────────────────────────────────────────────────────
const baseB = remplir(MODELES.formulaire_B_v1.texte, 'ademe_rge')
const lignes = (t) => t.split('\n')
const sansLigne = (t, re) => lignes(t).filter((l) => !re.test(l)).join('\n')
const remplacer = (t, a, b) => t.split(a).join(b)

export const FAUTIFS = [
  { id: 'f-premiere-phrase', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'premiere_phrase', texte: sansLigne(baseB, new RegExp(`^${PREMIERE_PHRASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)), note: 'première phrase absente' },
  { id: 'f-premiere-phrase-modifiee', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'premiere_phrase', texte: remplacer(baseB, PREMIERE_PHRASE, PREMIERE_PHRASE.replace('assistant IA', 'assistant automatisé')), note: 'première phrase modifiée d\'un mot' },
  { id: 'f-adresse-absente', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'adresse_reponse_absente', texte: remplacer(baseB, VALS.adresse, 'notre adresse habituelle'), note: 'adresse de prospection non écrite en toutes lettres' },
  { id: 'f-adresse-une-fois', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'adresse_reponse_absente', texte: baseB.replace(`écrivez STOP à ${VALS.adresse}`, 'écrivez STOP à notre adresse'), note: 'adresse écrite une seule fois sur deux' },
  { id: 'f-lien-formulaire', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'lien_formulaire', texte: remplacer(baseB, 'Bonjour,', 'Bonjour, voir aussi www.presti-temoin.invalid,'), note: 'www. dans le corps du formulaire' },
  { id: 'f-prestiapp-formulaire', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'lien_formulaire', texte: remplacer(baseB, 'Bonjour,', 'Bonjour, voir prestiapp.fr,'), note: 'nom de domaine nu dans le formulaire' },
  { id: 'f-domaine-principal', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'domaine_principal', texte: remplacer(baseB, VALS.adresse, 'contact@prestiapp.fr'), note: 'prestiapp.fr avant un « oui »' },
  { id: 'f-longueur-champ', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'longueur_champ', formulaire_max: 200, texte: `${baseB}\n${'Complément inutile ajouté pour dépasser la longueur maximale du champ du formulaire visé par ce message. '.repeat(3)}`, note: 'formulaire de max 200 signes, texte de plus de 200 signes' },
  { id: 'f-longueur-mots', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'longueur', texte: `${baseB}\n${Array.from({ length: 130 }, (_, i) => `mot${i}`).join(' ')}`, note: 'plus de 120 mots avant la signature' },
  { id: 'f-source-absente', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', source_prospect: 'ademe_rge', raison: 'source_absente', texte: remplacer(baseB, "Votre site figure dans la liste publique des entreprises RGE de l'ADEME.", 'Votre publicité figure dans la bibliothèque publique des publicités de Meta.'), note: 'phrase de la mauvaise source (meta au lieu d\'ademe_rge)' },
  { id: 'f-notice-absente', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'notice_absente', texte: remplacer(baseB, VALS.notice, 'https://autre-domaine-temoin.invalid/confidentialite'), note: '{notice} ne vaut pas NOTICE_URL' },
  { id: 'f-stop-absent', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'stop_absent', texte: sansLigne(baseB, /^Pour ne plus rien recevoir/), note: 'ligne STOP absente' },
  { id: 'f-stop-absent-meta', modele_id: 'rep_faq_meta', canal: 'messagerie', type: 'reponse', raison: 'stop_absent', texte: sansLigne(remplir(MODELES.rep_faq_meta.texte, null), /STOP/), note: 'rep_faq_meta sans STOP' },
  { id: 'f-reference-absente', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'reference_absente', texte: sansLigne(baseB, /^Réf\./), note: 'ligne Réf. absente' },
  { id: 'f-reference-fausse', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'reference_absente', reference_envoi: 'ZZ99ZZ', texte: baseB, note: 'Réf. du texte différente de celle de l\'envoi' },
  { id: 'f-preuve-demande-absente', modele_id: 'lien_maquette_email_v2', canal: 'email_sollicite', type: 'lien_maquette', preuve_demande: null, drapeaux: { siteAchatPublic: true }, raison: 'preuve_demande_absente', texte: remplir(MODELES.lien_maquette_email_v2.texte, null), note: 'e-mail sollicité sans preuve de demande' },
  { id: 'f-fait-non-verifie', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', fait_id: REPERES.faits.non_verifiable_f5.id, froid: true, raison: 'fait_non_verifie', texte: remplacer(baseB, VALS.fait, `sur votre site, « ${REPERES.faits.non_verifiable_f5.extrait} »`), note: 'fait non_verifiable cité à un prospect froid' },
  { id: 'f-fait-absent', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', fait_id: null, froid: true, raison: 'fait_non_verifie', texte: baseB, note: 'aucun fait_id sur un prospect froid' },
  { id: 'f-extrait-altere', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', fait_id: REPERES.faits.site_h1_f1.id, raison: 'extrait_altere', texte: remplacer(baseB, VALS.fait, `sur votre site, « ${REPERES.faits.site_h1_f1.extrait.replace('artisan', 'expert')} »`), note: 'un mot changé dans la citation' },
  { id: 'f-fait-refonte', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'fait_refonte', texte: remplacer(baseB, VALS.fait, 'votre site n\'a pas de formulaire de contact'), note: 'un formulaire de site prétend que le site n\'a pas de formulaire (impossible)' },
  { id: 'f-douleur-non-approuvee', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', douleur_id: 'menuisier-portable', raison: 'douleur_non_approuvee', texte: remplacer(baseB, VALS.douleur, DOULEURS.find((d) => d.id === 'menuisier-portable').question), note: 'douleur non approuvée (approuve:false)' },
  { id: 'f-douleur-autre-metier', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', metier_prospect: 'plombier', douleur_id: 'menuisier-mesure', raison: 'douleur_non_approuvee', texte: baseB, note: 'douleur de menuisier envoyée à un plombier' },
  { id: 'f-metier-faux', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', metier_prospect: 'carreleur', douleur_id: 'menuisier-mesure', raison: 'metier_faux', texte: baseB, note: 'métier du prospect différent de celui de la douleur, sans correspondance' },
  { id: 'f-maquette-absente', modele_id: 'formulaire_A_v1', canal: 'formulaire_site', type: 'premier_contact', drapeaux: { varianteA: true }, maquette: null, raison: 'maquette_absente', texte: remplir(MODELES.formulaire_A_v1.texte, 'ademe_rge'), note: 'variante A sans maquette prête' },
  { id: 'f-maquette-expiree', modele_id: 'formulaire_A_v1', canal: 'formulaire_site', type: 'premier_contact', drapeaux: { varianteA: true }, maquette: 'expiree', raison: 'maquette_absente', texte: remplir(MODELES.formulaire_A_v1.texte, 'ademe_rge'), note: 'variante A, maquette expirée' },
  { id: 'f-identite-absente', modele_id: 'rep_prix_email', canal: 'email_sollicite', type: 'reponse', raison: 'identite_absente', texte: remplacer(remplir(MODELES.rep_prix_email.texte, null), 'Benjamin Filiot, Presti.\n', ''), note: 'identité de l\'expéditeur retirée' },
  { id: 'f-mention-ia-absente', modele_id: 'rep_prix_email', canal: 'email_sollicite', type: 'reponse', raison: 'mention_ia_absente', texte: remplacer(remplir(MODELES.rep_prix_email.texte, null), "Message rédigé et envoyé par l'assistant IA de Presti.\n", ''), note: 'mention IA retirée' },
  { id: 'f-modele-inconnu', modele_id: 'email_A_v1', canal: 'email_sollicite', type: 'premier_contact', raison: 'modele_inconnu', texte: 'Bonjour, un ancien modèle e-mail à froid, retiré par la voie gratuite.', note: 'modele_id retiré (email_A_v1)' },
  { id: 'f-modele-inconnu-relance', modele_id: 'relance_1_v1', canal: 'email_sollicite', type: 'relance', raison: 'modele_inconnu', texte: 'Je me permets de revenir vers vous.', note: 'modele_id retiré (relance_1_v1)' },
  { id: 'f-modele-non-approuve', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', approuve: false, raison: 'modele_non_approuve', texte: baseB, note: 'Benj n\'a pas encore approuvé ce modèle' },
  { id: 'f-modele-hors-canal-entrant-froid', modele_id: 'lien_maquette_entrant_email_v1', canal: 'email_sollicite', type: 'lien_maquette', froid: true, raison: 'modele_hors_canal', texte: remplir(MODELES.lien_maquette_entrant_email_v1.texte, null), note: 'modèle d\'entrant envoyé à un prospect froid' },
  { id: 'f-modele-hors-canal-meta-formulaire', modele_id: 'lien_maquette_meta_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'modele_hors_canal', texte: remplir(MODELES.lien_maquette_meta_v1.texte, null), note: 'modèle Meta utilisé sur un formulaire' },
  { id: 'f-modele-hors-canal-relance-formulaire', modele_id: 'relance_oui_v1', canal: 'formulaire_site', type: 'relance', raison: 'modele_hors_canal', texte: remplir(MODELES.relance_oui_v1.texte, null), note: 'une relance envoyée par formulaire (aucun modèle ne le prévoit)' },
  { id: 'f-modele-hors-canal-stop-reponse', modele_id: 'stop_confirmation', canal: 'email_sollicite', type: 'reponse', raison: 'modele_hors_canal', texte: remplir(MODELES.stop_confirmation.texte, null), note: 'stop_confirmation posé en type reponse au lieu de confirmation_stop' },
  { id: 'f-hors-modele-mot-ajoute', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'hors_modele', texte: remplacer(baseB, 'Bonjour,', 'Bonjour bien cher client,'), note: 'un mot ajouté au gabarit' },
  { id: 'f-hors-modele-espace', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'hors_modele', texte: remplacer(baseB, 'Bonjour, sur', 'Bonjour,  sur'), note: 'un espace ajouté au gabarit' },
  { id: 'f-hors-modele-studio-sans-produit', modele_id: 'formulaire_studio_v1', canal: 'formulaire_site', type: 'premier_contact', cible: 'marque', raison: 'hors_modele', texte: remplacer(remplir(MODELES.formulaire_studio_v1.texte, 'meta'), 'Gourde isotherme Témoin', ''), note: 'formulaire_studio_v1 sans {produit} rempli' },
  { id: 'f-sujet-hors-modele', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'sujet_hors_modele', sujet: 'Votre demande de devis', texte: baseB, note: 'sujet « Votre demande »' },
  { id: 'f-objet-trompeur-re', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'objet_trompeur', sujet: `Re: ${SUJET_FORMULAIRE_V1.replace('{entreprise}', VALS.entreprise)}`, texte: baseB, note: 'faux « Re: » dans un formulaire' },
  { id: 'f-objet-trompeur-fwd', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'objet_trompeur', sujet: `Fwd: ${SUJET_FORMULAIRE_V1.replace('{entreprise}', VALS.entreprise)}`, texte: baseB, note: 'faux « Fwd » dans un formulaire' },
  { id: 'f-lien-invalide', modele_id: 'lien_maquette_email_v2', canal: 'email_sollicite', type: 'lien_maquette', preuve_demande: { type: 'message_recu', id: 'reponse-oui-3' }, drapeaux: { siteAchatPublic: true }, raison: 'lien_invalide', texte: remplacer(remplir(MODELES.lien_maquette_email_v2.texte, null), VALS.lien, 'https://prestiapp.fr/maquette/troplong'), note: 'lien de maquette de 42 signes au lieu de 43' },
  { id: 'f-lien-ferme', modele_id: 'lien_maquette_email_v2', canal: 'email_sollicite', type: 'lien_maquette', preuve_demande: { type: 'message_recu', id: 'reponse-oui-4' }, drapeaux: { siteAchatPublic: false }, raison: 'lien_ferme', texte: remplir(MODELES.lien_maquette_email_v2.texte, null), note: 'https://prestiapp.fr/site/acheter alors que la page est fermée' },
  { id: 'f-prix-premier-message', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'prix_premier_message', texte: remplacer(baseB, 'Bonjour,', 'Bonjour, pour 300 €,'), note: 'prix au premier message' },
  { id: 'f-lien-rdv-premier-message', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', raison: 'prix_premier_message', texte: remplacer(baseB, 'Bonjour,', `Bonjour, prenez rendez-vous ici : ${VALS.rendez_vous},`), note: 'lien de rendez-vous au premier message' },
  { id: 'f-offre-hors-parametre-videos', modele_id: 'studio_offre_v1', canal: 'email_sollicite', type: 'reponse', offre: { videos: 5, prix_texte: '490 €' }, raison: 'offre_hors_parametre', texte: remplacer(remplir(MODELES.studio_offre_v1.texte, null), '5 vidéos', '10 vidéos'), note: 'videos du texte (10) ≠ offre.videos (5)' },
  { id: 'f-offre-hors-parametre-prix', modele_id: 'studio_offre_v1', canal: 'email_sollicite', type: 'reponse', offre: { videos: 5, prix_texte: '490 €' }, raison: 'offre_hors_parametre', texte: remplacer(remplir(MODELES.studio_offre_v1.texte, null), '490 €', '390 €'), note: 'prix du texte (390 €) ≠ offre.prix_texte (490 €)' },
  { id: 'f-promesse-garanti', modele_id: 'rep_faq_email', canal: 'email_sollicite', type: 'reponse', raison: 'promesse', texte: remplacer(remplir(MODELES.rep_faq_email.texte, null), VALS.reponse_faq, `${VALS.reponse_faq} Résultat garanti.`), note: '« garanti »' },
  { id: 'f-promesse-12-mois', modele_id: 'rep_faq_email', canal: 'email_sollicite', type: 'reponse', raison: 'promesse', texte: remplacer(remplir(MODELES.rep_faq_email.texte, null), VALS.reponse_faq, `${VALS.reponse_faq} Site maintenu 12 mois.`), note: '« 12 mois » (retiré, D15)' },
  { id: 'f-promesse-premier-google', modele_id: 'rep_faq_email', canal: 'email_sollicite', type: 'reponse', raison: 'promesse', texte: remplacer(remplir(MODELES.rep_faq_email.texte, null), VALS.reponse_faq, `${VALS.reponse_faq} Premier sur Google rapidement.`), note: '« premier sur Google »' },
  { id: 'f-promesse-sans-engagement', modele_id: 'rep_faq_email', canal: 'email_sollicite', type: 'reponse', raison: 'promesse', texte: remplacer(remplir(MODELES.rep_faq_email.texte, null), VALS.reponse_faq, `${VALS.reponse_faq} Sans engagement.`), note: '« sans engagement »' },
  { id: 'f-promesse-referencement', modele_id: 'rep_faq_email', canal: 'email_sollicite', type: 'reponse', raison: 'promesse', texte: remplacer(remplir(MODELES.rep_faq_email.texte, null), VALS.reponse_faq, `${VALS.reponse_faq} Référencement inclus.`), note: '« référencement »' },
  { id: 'f-promesse-pourcent', modele_id: 'rep_faq_email', canal: 'email_sollicite', type: 'reponse', raison: 'promesse', texte: remplacer(remplir(MODELES.rep_faq_email.texte, null), VALS.reponse_faq, `${VALS.reponse_faq} 30% de visiteurs en plus.`), note: '« % » hors citation' },
  { id: 'f-promesse-chiffre', modele_id: 'rep_faq_email', canal: 'email_sollicite', type: 'reponse', raison: 'promesse', texte: remplacer(remplir(MODELES.rep_faq_email.texte, null), VALS.reponse_faq, `${VALS.reponse_faq} Dix ans d'expérience du secteur.`), note: 'chiffre non justifié hors citation' },
  { id: 'f-oppose-stop-30h', modele_id: 'stop_confirmation', canal: 'email_sollicite', type: 'confirmation_stop', oppose: true, opposition_le_heures: 30, raison: 'oppose', texte: remplir(MODELES.stop_confirmation.texte, null), note: 'confirmation_stop 30 h après l\'opposition (fenêtre de 24 h dépassée)' },
  { id: 'f-oppose-reponse', modele_id: 'rep_prix_email', canal: 'email_sollicite', type: 'reponse', oppose: true, raison: 'oppose', texte: remplir(MODELES.rep_prix_email.texte, null), note: 'réponse à un prospect opposé, sans exception applicable' },
  { id: 'f-trop-de-messages', modele_id: 'rep_appel_email', canal: 'email_sollicite', type: 'reponse', messages_deja_envoyes: 3, raison: 'trop_de_messages', texte: remplir(MODELES.rep_appel_email.texte, null), note: 'quatrième message au même prospect' },
  { id: 'f-trop-tot', modele_id: 'relance_oui_v1', canal: 'email_sollicite', type: 'relance', heures_depuis_dernier: 10, raison: 'trop_tot', texte: remplir(MODELES.relance_oui_v1.texte, null), note: 'moins de 72 h depuis le dernier message' },
  { id: 'f-deja-contacte', modele_id: 'formulaire_B_v1', canal: 'formulaire_site', type: 'premier_contact', jours_depuis_dernier_contact: 30, raison: 'deja_contacte', texte: baseB, note: 'entreprise déjà contactée il y a moins de 90 jours' },
]

// ── SHA-256 du corpus (pour l'empreinte JP-5/AC du dossier pieges/, calculée à part) ─────────────────────────────────────────
export const TOUS = [...CONFORMES.map((x) => ({ ...x, raison: null })), ...FAUTIFS]
