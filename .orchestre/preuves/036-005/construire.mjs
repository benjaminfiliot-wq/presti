// 036-005 — fabrique des départements « Devis » et « Facturation et encaissement » du système de chaque artisan
// (plans/011-cadrage-01-11/p6-signature/premiere-reponse.md, ligne 036-005 du § 4) :
//   presti-dep-devis        carte « préparer le devis » puis carte « devis prêt » dont chaque prix porte sa source, sinon « estimé » ;
//   presti-dep-facturation  carte « facture prête » (chantier terminé, « Ask you ») ; envoi d'une facture DÉJÀ émise ; relance d'impayé J+3, J+10,
//                           J+21 jusqu'au paiement ou au motif rangé d'un geste ; Stripe de l'artisan : fiche seulement ;
//   presti-banc-argent      le banc : deux comptes (Studio, Signature), des dossiers fictifs « Exemple. ».
// Les deux chefs REMPLACENT le squelette de 036-001 (mêmes identifiants n8n : le Cerveau les appelle déjà). Hors ligne : aucun réseau, aucune base,
// aucun modèle, aucune donnée réelle. « Le code calcule, n8n route » : aucun montant n'est calculé ici (voir codes.mjs).
//   node .orchestre/preuves/036-005/construire.mjs --json <dossier>   → les exports attendus (comparés à ceux de n8n par rapatrier.mjs)
//   node .orchestre/preuves/036-005/construire.mjs --ops <dossier>    → les opérations update_workflow des deux chefs, et le programme SDK du banc
//   node .orchestre/preuves/036-005/construire.mjs --contrats         → plans/011-cadrage-01-11/p6-signature/contrats/{devis,facturation}.json
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { codeEntree, codeSortie } from '../035-003/construire.mjs'
import * as F5 from '../035-005/construire.mjs'
import { ERREUR, LIBS, COMPTE_A, COMPTE_B, reglagesRacine, reglagesEnfant } from '../036-001/construire.mjs'
import { DEVIS, FACT, constituerDevis, constituerFact, ETAPES_DEVIS, ETAPES_FACT, LECTURES_DEVIS, LECTURES_FACT, REQUETES, MOTIFS } from './codes.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '../../..')
const J = JSON.stringify
export { COMPTE_A, COMPTE_B }
export const ID = { cerveau: '596OC5mL2aMBq6SD', devis: 'dNikTYPKKsivUbd3', facturation: 'bNAF6Xzx5On853kD', relancer: 'jGM56jxeLUVXZIiM' }
export const LIB_IDS = { ...LIBS, 'lib-relancer': ID.relancer, 'lib-rediger-message': 'xfRUnkwOKSwQezVb' }
export const VERSION_CONTRATS = '1.0.0'

// ─── La copie figée de ce que le code de l'application dit des prix sourcés et des gestes jamais automatiques ────────────────────────
export function lireCopie() {
  const k = F5.lireCode()
  const src = readFileSync(path.join(RACINE, 'lib/pilote/regles.ts'), 'utf8')
  const m = /^const SOURCE_OK = \/(.+)\/([gimsuy]*)$/m.exec(src)
  if (!m) throw new Error('SOURCE_OK introuvable dans lib/pilote/regles.ts')
  return { SOURCE_PRIX: m[1], OUTILS_JAMAIS_AUTO: k.OUTILS_JAMAIS_AUTO }
}

const squelette = (nom) => JSON.parse(readFileSync(path.join(RACINE, `.orchestre/preuves/036-001/${nom}.workflow.json`), 'utf8'))
// ─── Les contrats (JSON Schema, versionnés) ───────────────────────────────────────────────────────────────────────────────────────────
// Le « Contrat d'entrée » des deux chefs reste CELUI DE 036-001 (le Cerveau envoie `config: {}` et `donnees: { evenements }` tels quels, et
// presti-cerveau n'est pas dans ce périmètre) : un événement est un objet, ses faits sont vérifiés par le chef (un fait absent = pas de carte).
// En simulation seulement, le banc glisse ses lectures dans `config.lectures_simulees` (un objet libre du contrat).
const schemaEntree = (dep) => { const m = /\nconst SCHEMA = (.*);\n/.exec(squelette(`presti-dep-${dep}`).nodes.find((n) => n.name === "Contrat d'entrée").parameters.jsCode); return JSON.parse(m[1]) }
export const SCHEMAS = { 'presti-dep-devis': schemaEntree('devis'), 'presti-dep-facturation': schemaEntree('facturation') }
export const FAITS = {
  devis: 'devis_a_preparer : lead_id (uuid), devis_id (uuid, nul tant que l’application n’a pas chiffré), qualifiee (booléen), escalade (booléen ; absent ou nul = escalade)',
  facturation: 'facture_a_emettre : devis_id (uuid) · impaye_echu : facture_id (uuid)',
}

const LECTURE_DEVIS_FORME = {
  configuration: 'artisan_id, nom_artisan, ton, signature, offre, capacites[], pilote{drapeau,actif,types}, parties_depuis_24h, interrupteur_general, interrupteur_departement, mots_escalade_artisan[], horaires{jours_permis[],heures_permises{debut,fin}}, plafond_jour, relances_impayes{actif,jours[]}, cles_existantes[], maintenant',
  devis: 'artisan_id, devis_id, lead_id, numero, statut (brouillon | envoye…), total_ttc_centimes (entier calculé par le code), total_ttc_affiche (texte rendu par le code)',
  lignes: 'artisan_id, devis_id, rang, designation, quantite, prix_unitaire_ht_centimes (entier calculé par le code), prix_affiche, source_prix (« vos tarifs · … », « prix donné par l’artisan », ou vide), repere_affiche (prix pratiqué sur un ancien chantier, cité), repere_chantier_le',
}
const LECTURE_FACT_FORME = {
  configuration: LECTURE_DEVIS_FORME.configuration,
  apercus: 'artisan_id, devis_id, chantier_termine, deja_facturee, apercu_ok, apercu_erreur, apercu_type (standard | acompte | situation | solde), apercu_total_ttc_centimes, apercu_total_ttc_affiche (rendus par simulerFacture, lib/factureDepuisDevis.ts:64), apercu_nb_deduites, apercu_le',
  factures: 'artisan_id, facture_id, numero, objet, statut (emise | payee | annulee…), avoir_de, regime_tva (tva | franchise), date_echeance, total_ttc_centimes, total_ttc_affiche, contestation (lue par le code : contestationDuClient, lib/relancesImpayes.ts ; null = non lue), paliers_envoyes[], historique{ok,traces[{chemin,le}]} (registre commun, lib/relancesRegistre.ts)',
  arrets: 'artisan_id, facture_id, raison (artisan | reponse_client), le, reprise_le, motif (null | oubli | dit_avoir_paye | litige | autre : migration 0185, relances_impayes_arrets.motif)',
}
export function contrats() {
  const base = { $schema: 'https://json-schema.org/draft/2020-12/schema', version: VERSION_CONTRATS, tache: '036-005', source: 'plans/011-cadrage-01-11/p6-signature/premiere-reponse.md, ligne 036-005 et § 3.3',
    regle: 'Hors contrat = rejet (statut « rejete »), une ligne de journal, rien ne part. Toute lecture filtre sur artisan_id (« Supabase account » passe outre la RLS). Le code calcule, n8n route : aucun montant n’est calculé, converti ni additionné dans n8n ; les montants (centimes entiers et texte affiché) viennent du code de l’application ou de la base et sont recopiés tels quels. Aucun modèle n’est appelé.' }
  const lectures = (L, forme) => Object.fromEntries(Object.entries(L).map(([cle, nom]) => [nom, { requete: REQUETES[nom], lignes_rendues: forme[cle === 'config' ? 'configuration' : cle] }]))
  return {
    'devis.json': { ...base, titre: 'presti-dep-devis@1 — le département Devis', entree: { config: SCHEMAS['presti-dep-devis'].config, donnees: SCHEMAS['presti-dep-devis'].donnees }, entree_simulation: 'config.lectures_simulees = { configuration, devis, lignes } : les lignes de lecture que le banc fournit, honorées seulement quand simulation est vrai',
      evenement_traite: 'devis_a_preparer (table de routage de contrats/cerveau.json) ; faits sans texte : ' + FAITS.devis,
      lectures: lectures(LECTURES_DEVIS, LECTURE_DEVIS_FORME), vues_a_ecrire: 'les vues étroites n8n_config_agents, n8n_devis_prets, n8n_devis_lignes ne sont PAS écrites par ce lot (supabase/** hors périmètre) ; leur colonne montant est calculée par la base',
      specialistes: ['lib-decider@1', 'lib-porte-conformite@1', 'lib-executer@1', 'lib-journaliser@1'],
      sortie: { statut: ['ok', 'rien_a_faire', 'rejete', 'erreur'], resultat: ['evenements_recus', 'rejets', 'non_traites', 'a_preparer', 'devis_prets', 'cartes', 'pilote', 'refus_porte', 'deja_faits', 'sorties_vers_un_modele'],
        devis_pret: 'cle, devis_id, numero, total_ttc_affiche, cible (toujours carte), motif_carte, tous_prix_sources, a_estimer, envoi, lignes[{rang, designation, prix_affiche, statut_prix (source | estime), source, repere{affiche, chantier_le}}]' },
      regles: { prix_source: 'une ligne est sourcée si son prix est entier, > 0 et sa provenance commence par « vos tarifs », « tarif de l’artisan » ou « prix donné par l’artisan » (copie de SOURCE_OK, lib/pilote/regles.ts) ; sinon « estimé »',
        repere: 'un prix pratiqué sur un ancien chantier est un repère cité (repere_affiche) ; il ne rend jamais une ligne sourcée (B9, lib/pilote/regles.ts:116-124)',
        envoi_seul: 'dans l’application, envoi_devis part seul seulement en Signature, pilote actif, type activé, plafond non atteint, aucune escalade et TOUTES les lignes sourcées (lib/pilote/regles.ts:272) ; dans n8n il reste une carte : lib-decider@1 et la porte classent envoyer_devis parmi les gestes P5:226 (devis engageant)',
        chiffrage: 'jamais ici : lib/devisAuto.ts, au clic de l’artisan' },
      studio_signature: { studio: 'carte « préparer le devis » puis carte « devis prêt » ; rien ne part sans un clic', signature: 'idem : l’envoi d’un devis reste un clic de l’artisan dans n8n (lib-decider@1 et la porte réservent envoyer_devis, p5:226) ; le pilote de l’application garde sa règle « toutes les lignes sourcées »' } },
    'facturation.json': { ...base, titre: 'presti-dep-facturation@1 — le département Facturation et encaissement', entree: { config: SCHEMAS['presti-dep-facturation'].config, donnees: SCHEMAS['presti-dep-facturation'].donnees }, entree_simulation: 'config.lectures_simulees = { configuration, apercus, factures, arrets } (même règle)',
      evenements_traites: ['facture_a_emettre (faits : devis_id)', 'impaye_echu (faits : facture_id)'],
      non_porte: 'l’ENVOI d’une facture déjà émise (envoi_facture) n’est pas porté par ce chef : la porte de conformité exige un texte pour tout envoi et lib-rediger-message@1 ne rédige que des relances ; le pilote de l’application garde cet envoi (lib/pilote, jamais l’émission) jusqu’à lib-rediger-message@2',
      lectures: lectures(LECTURES_FACT, LECTURE_FACT_FORME), vues_a_ecrire: 'les vues étroites n8n_config_agents, n8n_apercus_facture, n8n_factures_argent ne sont PAS écrites par ce lot ; leurs colonnes montant sont calculées par la base ou par le code (simulerFacture)',
      specialistes: ['lib-relancer@1', 'lib-decider@1', 'lib-rediger-message@1 (modèle épinglé)', 'lib-porte-conformite@1', 'lib-executer@1', 'lib-journaliser@1'],
      sortie: { statut: ['ok', 'rien_a_faire', 'rejete', 'erreur'], resultat: ['evenements_recus', 'rejets', 'non_traites', 'factures_a_emettre', 'relances', 'relances_arretees', 'cartes_motif', 'cartes', 'pilote', 'refus_porte', 'deja_faits', 'sorties_vers_un_modele'] },
      regles: { emission: 'n8n n’émet jamais une facture : « facture prête » est une carte (creer_facture est dans OUTILS_JAMAIS_AUTO, lib/pilote/regles.ts:79-82), en Studio comme en Signature ; l’émission est le clic de l’artisan (l’étape « Ask you »)',
        impaye: 'J+3, J+10, J+21 (lib/relancesImpayes.ts:38), opt-in (relances_impayes.actif). La relance s’arrête sur un PAIEMENT (statut payée) ou sur un MOTIF rangé d’un geste ; jamais sur le silence du client',
        motifs: { oubli: 'les relances continuent', dit_avoir_paye: 'carte « vérifier le paiement » : l’artisan vérifie, jamais « payée » toute seule', litige: 'carte d’escalade, relances arrêtées (contestation → litige)', autre: 'carte « à traiter à la main » (échéancier → autre)', 'null (rien rangé)': 'relances arrêtées et carte « ranger le motif » en quatre choix' },
        contestation: 'un client qui conteste rend la relance en CARTE « à relire » (lib/relancesImpayes.ts, R1 du 02/11), jamais en envoi seul',
        paiement: 'n8n ne marque aucune facture payée : marquer_facture_payee, rembourser, payer, creer_avoir restent à l’artisan' },
      motif_et_colonne: 'la colonne existe (migration 0185 préparée, non appliquée) : relances_impayes_arrets.motif ∈ {oubli, dit_avoir_paye, litige, autre}. « contestation » se range sous litige, « échéancier » sous autre ; deux valeurs dédiées seraient un amendement à 0185, à valider par Benj (défaut appliqué : aucune)',
      a_venir: { lecteur_de_paiements: { etat: 'FICHE SEULEMENT, aucun nœud', quoi: 'lire les encaissements du Stripe de l’artisan (lecture seule) pour arrêter la relance sur un paiement reçu avant que l’artisan ne l’ait marqué', prerequis: ['jeton restreint en lecture saisi par l’artisan lui-même, chiffré au format lib/secretBox.ts', 'fiche connecteur (036-009)', 'accord de Benj'], aujourd_hui: 'le paiement arrive par le statut « payée » que pose l’artisan dans l’application' } },
      studio_signature: { studio: 'carte « facture prête » ; relance d’impayé préparée (a_valider)', signature: 'carte « facture prête » (toujours une carte) ; relance_impaye part seule si son type est activé (10 minutes pour annuler) ; motifs et contestation : cartes' } },
  }
}

// ─── Les workflows (format d'export n8n) : le squelette de 036-001 est le point de départ, avec ses identifiants ──────────────────────
const nid = (nom) => { let h = 5381; for (const c of nom) h = ((h * 33) ^ c.codePointAt(0)) >>> 0; const x = h.toString(16).padStart(8, '0'); return `${x}-0000-4000-8000-${(x + x + x).slice(0, 12)}` }
const noeud = (name, type, typeVersion, position, parameters, extra = {}) => ({ id: nid(name), name, type, typeVersion, position, parameters, ...extra })
const code = (name, js, pos, notes) => noeud(name, 'n8n-nodes-base.code', 2, pos, { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: js }, notes ? { notes } : {})
const si = (name, gauche, pos, notes) => noeud(name, 'n8n-nodes-base.if', 2.2, pos, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
  conditions: [{ id: name.replace(/[^A-Za-z]/g, '').toLowerCase().slice(0, 30) || 'si', leftValue: '={{ ' + gauche + ' }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, looseTypeValidation: false, options: {} }, notes ? { notes } : {})
const appel = (name, id, notes, pos) => noeud(name, 'n8n-nodes-base.executeWorkflow', 1.2, pos, { source: 'database', workflowId: { __rl: true, mode: 'id', value: id }, mode: 'once', options: { waitForSubWorkflow: true } }, { notes, onError: 'continueRegularOutput' })
const lecture = (name, pos) => noeud(name, 'n8n-nodes-base.noOp', 1, pos, {}, { notes: `requete: ${REQUETES[name]}\nSimulation : un emplacement, sa sortie est ÉPINGLÉE dans chaque essai ; le banc fournit ses lignes dans config.lectures_simulees (honorées seulement en simulation). Les montants lus sont ceux du code de l'application, jamais recalculés. Non fourni, le chef n'agit pas (fail-closed).` })
const NOTES_LIB = { 'lib-relancer': 'La décision de relance (035-005) : palier atteint, registre de 3 jours, horaires. Aucun modèle.', 'lib-decider': 'Carte, pilote ou rien (035-004), appelé tel quel.',
  'lib-porte-conformite': 'La porte de conformité (035-005), veto avant tout effet.', 'lib-rediger-message': 'La rédaction d\u2019une relance (035-005) : modèle ÉPINGLÉ, jamais appelé en simulation ; la porte refuse tout montant qui n\u2019est pas un fait.', 'lib-executer': 'La carte ou la ligne du pilote PRÉVUE (035-005) ; relit les interrupteurs juste avant l’effet.' }
const chemin = (dep, l, base) => `${NOTES_LIB[l]} En simulation, sa sortie est épinglée dans l'essai du chef tant que ${l} n'a pas presti-dep-${dep} dans ses callerIds (session principale).${base || ''}`

function construire(dep, etapes, codes, lectures, k) {
  const w = squelette(`presti-dep-${dep}`)
  const contrat = `presti-dep-${dep}@1`
  const garder = (n) => w.nodes.find((x) => x.name === n)
  const entreeN = garder("Contrat d'entrée")
  const trigger = garder('Appelé par le Cerveau'), conforme = garder('Entrée conforme ?'), sortie = garder('Contrat de sortie'), sticky = w.nodes.find((x) => x.type === 'n8n-nodes-base.stickyNote')
  const N = [trigger, entreeN, conforme]
  let x = 672
  const porte = si('Porte simulation', '$json.enveloppe.simulation', [x, 96], "porte: simulation\nVrai : simulation, rien ne part. Faux : l'effet réel, non branché dans ce lot."); N.push(porte)
  const arret = noeud('Hors simulation : non branché', 'n8n-nodes-base.stopAndError', 1, [x, 464], { errorType: 'errorMessage', errorMessage: "Hors simulation : effet réel non branché (tâche 036-005). Rien n'a été lu, écrit ni envoyé." },
    { notes: "Simulation : aucun effet réel n'est branché. Hors simulation, le travail s'arrête ici, avant tout appel." }); N.push(arret)
  const lec = Object.values(lectures).map((nom, i) => lecture(nom, [x + 224 * (i + 1), 96])); N.push(...lec)
  x += 224 * (lec.length + 1)
  const cons = code('Constituer les dossiers', dep === 'devis' ? constituerDevis(k) : constituerFact(k), [x, 96], 'Lit les lectures et les événements UNE fois, sans rien calculer : les dossiers que les étapes suivantes relisent. Un événement d\u2019un autre compte, d\u2019un autre département ou en double est rejeté ici.'); N.push(cons)
  x += 224
  const prep = [], sis = [], apps = []
  etapes.forEach(([p, s, lib], i) => {
    prep.push(code(p, codes[p], [x, 96])); sis.push(si(s, '$json.vide === true', [x + 224, 96], 'Vrai : rien à faire à cette étape. Faux : on appelle le spécialiste.')); apps.push(appel(`Appeler ${lib}`, LIB_IDS[lib], chemin(dep, lib), [x + 448, 0])); x += 672 })
  const journal = code('Préparer le journal', codes['Préparer le journal'], [x, 96]), appelJ = appel('Appeler lib-journaliser', LIB_IDS['lib-journaliser'], 'Le journal (035-003), une enveloppe par compte.', [x + 224, 96])
  const assembler = code('Assembler', codes.Assembler, [x + 448, 96])
  sortie.position = [x + 672, 176]
  N.push(...prep, ...sis, ...apps, journal, appelJ, assembler, sortie)
  sticky.parameters.content = STICKY[dep]
  N.push(sticky)
  const c = {}
  const lien = (de, vers, sortieIdx = 0) => { c[de] = c[de] ?? { main: [] }; while (c[de].main.length <= sortieIdx) c[de].main.push([]); c[de].main[sortieIdx].push({ node: vers, type: 'main', index: 0 }) }
  lien(trigger.name, entreeN.name); lien(entreeN.name, conforme.name); lien(conforme.name, porte.name, 0); lien(conforme.name, sortie.name, 1)
  lien(porte.name, lec[0].name, 0); lien(porte.name, arret.name, 1)
  lec.slice(1).forEach((n, i) => lien(lec[i].name, n.name)); lien(lec.at(-1).name, cons.name); lien(cons.name, prep[0].name)
  etapes.forEach(([, , lib], i) => {
    lien(prep[i].name, sis[i].name)
    const suiteRien = (lib === 'lib-relancer' || lib === 'lib-rediger-message') ? prep[i + 1].name : journal.name
    lien(sis[i].name, suiteRien, 0); lien(sis[i].name, apps[i].name, 1)
    lien(apps[i].name, i + 1 < etapes.length ? prep[i + 1].name : journal.name)
  })
  lien(journal.name, appelJ.name); lien(appelJ.name, assembler.name); lien(assembler.name, sortie.name)
  w.nodes = N; w.connections = c
  w.nodeCount = N.length
  return w
}
const STICKY = {
  devis: "## presti-dep-devis (036-005)\nDépartement 2, Devis (A13, B9) : une demande qualifiée devient une carte « préparer le devis » ; un devis préparé par l'application devient une carte « devis prêt » dont chaque prix porte sa source, sinon « estimé » ; un prix d'un ancien chantier est un repère cité, jamais une source.\nStudio : carte. Signature : envoi_devis seul seulement si TOUTES les lignes sont sourcées (lib/pilote/regles.ts:272).\nLe chiffrage reste le code de l'application (lib/devisAuto.ts), au clic de l'artisan : « le code calcule, n8n route ».\nINACTIF, jamais publié, en simulation, aucun identifiant, aucun modèle. Juge : scripts/devis-facture-n8n-qa.mjs",
  facturation: "## presti-dep-facturation (036-005)\nDépartement 4, Facturation et encaissement (A14, B7) : « facture quand le chantier est fini » + « Ask you » = une carte « facture prête » (l'émission reste le clic de l'artisan : creer_facture est jamais automatique) ; l'envoi d'une facture déjà émise ; la relance d'impayé J+3, J+10, J+21 jusqu'au paiement ou au motif rangé d'un geste, jamais jusqu'au silence.\nn8n n'émet aucune facture, ne marque aucun paiement, ne calcule aucun montant. Lecteur de paiements (Stripe de l'artisan) : fiche seulement.\nINACTIF, jamais publié, en simulation, aucun identifiant, aucun modèle. Juge : scripts/devis-facture-n8n-qa.mjs",
}
export function exports_(k = lireCopie()) {
  const dv = DEVIS(k), ft = FACT(k)
  return { 'presti-dep-devis': construire('devis', ETAPES_DEVIS, dv, LECTURES_DEVIS, k), 'presti-dep-facturation': construire('facturation', ETAPES_FACT, ft, LECTURES_FACT, k) }
}
export const CHEFS = ['presti-dep-devis', 'presti-dep-facturation']

// ─── Les opérations update_workflow : du squelette à la fabrique (mêmes identifiants n8n) ─────────────────────────────────────────────
export function operations(nom, w) {
  const sq = squelette(nom)
  const ops = []
  for (const n of sq.nodes) if (!w.nodes.some((x) => x.name === n.name)) ops.push({ type: 'removeNode', nodeName: n.name })
  const gardes = sq.nodes.filter((n) => w.nodes.some((x) => x.name === n.name))
  for (const n of gardes) { const v = w.nodes.find((x) => x.name === n.name); if (JSON.stringify(v.parameters) !== JSON.stringify(n.parameters)) ops.push({ type: 'updateNodeParameters', nodeName: n.name, parameters: v.parameters, replace: true }); if ((v.notes ?? '') !== (n.notes ?? '')) ops.push({ type: 'setNodeParameter', nodeName: n.name, path: '/notes', value: v.notes }) }
  for (const v of w.nodes) if (!sq.nodes.some((n) => n.name === v.name)) ops.push({ type: 'addNode', node: { name: v.name, type: v.type, typeVersion: v.typeVersion, position: v.position, parameters: v.parameters, ...(v.notes ? { notes: v.notes } : {}), ...(v.onError ? { settings: { onError: v.onError } } : {}) } })
  for (const n of gardes) { const v = w.nodes.find((x) => x.name === n.name); if (v.position.join() !== n.position.join()) ops.push({ type: 'setNodePosition', nodeName: n.name, position: v.position }) }
  for (const [de, o] of Object.entries(w.connections)) o.main.forEach((liste, i) => liste.forEach((l) => { const avant = sq.connections[de]?.main?.[i]?.some((x) => x.node === l.node); if (!avant) ops.push({ type: 'addConnection', source: de, target: l.node, sourceIndex: i }) }))
  return ops
}

// ─── Le banc presti-banc-argent : dossiers fictifs (« Exemple. » devant tout nom), deux comptes ───────────────────────────────────────
// Le code des deux nœuds « Cas fictifs » est COMPACT (un générateur) : la source est ce code lui-même, rejoué par vm pour obtenir les enveloppes
// que le juge et les essais utilisent. Un lundi matin, heure de Paris ; 7 dossiers de devis par compte au plus, autant de facturation.
export const MAINTENANT = '2026-11-09T10:00:00.000+01:00'
export const PASSAGE = '2026-11-09T1000'
const COMMUN_BANC = String.raw`const ORG = { A: '00000000-0000-4000-8000-0000000000a1', B: '00000000-0000-4000-8000-0000000000b2' };
const U = (c, s, i) => '00000000-0000-4000-8000-' + (c === 'A' ? 'a' : 'b') + s + String(i).padStart(10, '0');
const OFFRE = { A: { nom: 'Exemple. Plomberie Arnal-Démo', offre: 'studio', capacites: ['canaux.email', 'relances', 'factures.relances', 'assistant'], pilote: { drapeau: true, actif: false, types: {} }, parties: 0 },
  B: { nom: 'Exemple. Menuiserie Berthier-Démo', offre: 'signature', capacites: ['canaux.email', 'relances', 'factures.relances', 'assistant', 'plateforme.ia.auto', 'relances.auto', 'factures.relances.auto', 'crm', 'assistant.pilote'], pilote: { drapeau: true, actif: true, types: { envoi_devis: true, envoi_facture: true, relance_impaye: true } }, parties: 3 } };
const config = (c) => ({ artisan_id: ORG[c], nom_artisan: OFFRE[c].nom, ton: 'professionnel et courtois', signature: 'Exemple. L’équipe', offre: OFFRE[c].offre, capacites: OFFRE[c].capacites, pilote: OFFRE[c].pilote, parties_depuis_24h: OFFRE[c].parties,
  interrupteur_general: true, interrupteur_departement: true, mots_escalade_artisan: ['Exemple. mot sensible'], horaires: { jours_permis: [1, 2, 3, 4, 5, 6, 7], heures_permises: { debut: '08:00', fin: '19:00' } }, plafond_jour: 20,
  relances_impayes: { actif: true, jours: [3, 10, 21] }, cles_existantes: [], maintenant: '${MAINTENANT}' });
const enveloppe = (c, dep, evenements, lectures) => ({ contrat: 'presti-dep-' + dep + '@1', organisation_id: ORG[c], simulation: true, cle_idempotence: 'dep:' + dep + ':' + ORG[c].slice(24) + ':${PASSAGE}',
  trace: { execution_parent: 'presti-banc-argent:${PASSAGE}', declencheur: 'presti-banc-argent', tentative: 0 }, config: { lectures_simulees: lectures }, donnees: { evenements: evenements } });
`
export const CODE_BANC = {
  devis: `// presti-banc-argent (036-005) : les dossiers FICTIFS du département Devis pour deux comptes (Studio A, Signature B), « Exemple. » devant tout nom, un lundi matin.
// Chaque enveloppe porte ses lectures dans config.lectures_simulees (honorées seulement en simulation). Rien de réel : ni adresse, ni téléphone.
` + COMMUN_BANC + String.raw`const SRC = 'vos tarifs · Exemple. Pose carrelage', SRC2 = 'prix donné par l’artisan';
// [compte, n°, devis chiffré ? (n° du devis ou 0), qualifiée, escalade, statut du devis, total (centimes, affiché), numéro, lignes : [désignation, centimes, affiché, source, repère]]
const CAS = [
  ['A', 1, 0, true, false],
  ['A', 2, 2, true, false, 'brouillon', 245000, '2 450,00 € TTC', 'DEV-EX-0002', [['Exemple. Dépose et évacuation', 40000, '400,00 € HT', SRC], ['Exemple. Pose carrelage 12 m²', 120000, '1 200,00 € HT', SRC], ['Exemple. Joints et finitions', 15000, '150,00 € HT', SRC2]]],
  ['A', 3, 3, true, false, 'brouillon', 98000, '980,00 € TTC', 'DEV-EX-0003', [['Exemple. Robinetterie', 30000, '300,00 € HT', SRC], ['Exemple. Main-d’œuvre pose', 51000, '510,00 € HT', null, ['480,00 € HT', '2026-03-14']]]],
  ['A', 4, 0, false, false],
  ['B', 5, 5, true, false, 'brouillon', 120000, '1 200,00 € TTC', 'DEV-EX-0005', [['Exemple. Porte d’entrée chêne', 70000, '700,00 € HT', SRC], ['Exemple. Pose', 30000, '300,00 € HT', SRC2]]],
  ['B', 6, 6, true, false, 'brouillon', 150000, '1 500,00 € TTC', 'DEV-EX-0006', [['Exemple. Dressing sur mesure', 90000, '900,00 € HT', SRC], ['Exemple. Pose et réglages', 35000, '350,00 € HT', null, ['420,00 € HT', '2026-02-02']]]],
  ['B', 7, 7, true, true, 'brouillon', 60000, '600,00 € TTC', 'DEV-EX-0007', [['Exemple. Étagère murale', 50000, '500,00 € HT', SRC]]],
  ['B', 8, 8, true, false, 'brouillon', 36000, '360,00 € TTC', 'DEV-EX-0008', [['Exemple. Plinthes séjour', 30000, '300,00 € HT', '']]],
  ['B', 9, 0, true, false],
  ['B', 10, 5, true, false, 'brouillon', 120000, '1 200,00 € TTC', 'DEV-EX-0005', null, 'exemple-devis_a_preparer-5'],
  ['B', 12, 12, true, false, 'envoye', 80000, '800,00 € TTC', 'DEV-EX-0012', [['Exemple. Lambris', 66000, '660,00 € HT', SRC]]],
];
const evs = { A: [], B: [] }, lec = { A: { configuration: [config('A')], devis: [], lignes: [] }, B: { configuration: [config('B')], devis: [], lignes: [] } };
for (const [c, i, d, qual, esc, statut, total, affiche, numero, lignes, cle] of CAS) {
  evs[c].push({ id: U(c, 3, i), artisan_id: ORG[c], type: 'devis_a_preparer', cle: cle || 'exemple-devis_a_preparer-' + i, donnees: { lead_id: U(c, 1, i), devis_id: d ? U(c, 2, d) : null, qualifiee: qual, escalade: esc } });
  if (!d || !lignes) continue;
  lec[c].devis.push({ artisan_id: ORG[c], devis_id: U(c, 2, d), lead_id: U(c, 1, i), numero: numero, statut: statut, total_ttc_centimes: total, total_ttc_affiche: affiche });
  lignes.forEach((l, k) => lec[c].lignes.push({ artisan_id: ORG[c], devis_id: U(c, 2, d), rang: k + 1, designation: l[0], quantite: 1, prix_unitaire_ht_centimes: l[1], prix_affiche: l[2], source_prix: l[3], repere_affiche: l[4] ? l[4][0] : null, repere_chantier_le: l[4] ? l[4][1] : null }));
}
// Un événement de l'autre compte, glissé dans l'enveloppe de B : rejeté.
evs.B.push({ id: U('A', 3, 11), artisan_id: ORG.A, type: 'devis_a_preparer', cle: 'exemple-etranger', donnees: { lead_id: U('A', 1, 2), devis_id: null, qualifiee: true, escalade: false } });
return [{ json: enveloppe('A', 'devis', evs.A, lec.A) }, { json: enveloppe('B', 'devis', evs.B, lec.B) }];`,
  facturation: `// presti-banc-argent (036-005) : les dossiers FICTIFS du département Facturation pour deux comptes (Studio A, Signature B), « Exemple. » devant tout nom, un lundi matin.
// Chaque enveloppe porte ses lectures dans config.lectures_simulees (honorées seulement en simulation). Rien de réel : ni adresse, ni téléphone.
` + COMMUN_BANC + String.raw`const apercu = (c, d, o) => Object.assign({ artisan_id: ORG[c], devis_id: U(c, 2, d), chantier_termine: true, deja_facturee: false, apercu_ok: true, apercu_erreur: null, apercu_type: 'standard', apercu_total_ttc_centimes: 245000, apercu_total_ttc_affiche: '2 450,00 € TTC', apercu_nb_deduites: 0, apercu_le: '2026-11-09' }, o);
const facture = (c, f, o) => Object.assign({ artisan_id: ORG[c], facture_id: U(c, 4, f), numero: 'FAC-EX-' + String(f).padStart(4, '0'), objet: 'Exemple. Travaux de rénovation', statut: 'emise', avoir_de: null, regime_tva: 'tva', date_echeance: '2026-11-05', total_ttc_centimes: 180000, total_ttc_affiche: '1 800,00 € TTC', contestation: false, paliers_envoyes: [], historique: { ok: true, traces: [] } }, o);
const arret = (c, f, motif) => ({ artisan_id: ORG[c], facture_id: U(c, 4, f), raison: 'reponse_client', le: '2026-11-07T09:00:00.000Z', reprise_le: null, motif: motif });
// [compte, n°, type de l'événement, aperçu | facture (écarts), arrêt (motif ; undefined = pas d'arrêt)]
const CAS = [
  ['A', 21, 'facture_a_emettre', {}], ['A', 22, 'facture_a_emettre', { chantier_termine: false }], ['A', 23, 'facture_a_emettre', { deja_facturee: true }],
  ['A', 24, 'impaye_echu', {}], ['A', 25, 'impaye_echu', { statut: 'payee' }], ['A', 26, 'impaye_echu', {}, 'litige'], ['A', 27, 'impaye_echu', {}, null],
  ['B', 31, 'facture_a_emettre', { apercu_total_ttc_centimes: 120000, apercu_total_ttc_affiche: '1 200,00 € TTC', apercu_type: 'solde', apercu_nb_deduites: 1 }],
  ['B', 34, 'impaye_echu', { date_echeance: '2026-10-15', paliers_envoyes: [1, 2] }], ['B', 35, 'impaye_echu', {}, 'dit_avoir_paye'], ['B', 36, 'impaye_echu', { contestation: true }],
  ['B', 37, 'impaye_echu', { date_echeance: '2026-11-04' }, 'oubli'], ['B', 38, 'impaye_echu', { statut: 'payee' }], ['B', 39, 'impaye_echu', {}, 'autre'],
];
const evs = { A: [], B: [] }, lec = { A: { configuration: [config('A')], apercus: [], factures: [], arrets: [] }, B: { configuration: [config('B')], apercus: [], factures: [], arrets: [] } };
for (const [c, i, type, o, motif] of CAS) {
  const emettre = type === 'facture_a_emettre';
  evs[c].push({ id: U(c, 3, i), artisan_id: ORG[c], type: type, cle: 'exemple-' + type + '-' + i, donnees: emettre ? { devis_id: U(c, 2, i) } : { facture_id: U(c, 4, i) } });
  if (emettre) lec[c].apercus.push(apercu(c, i, o)); else lec[c].factures.push(facture(c, i, o));
  if (motif !== undefined) lec[c].arrets.push(arret(c, i, motif));
}
return [{ json: enveloppe('A', 'facturation', evs.A, lec.A) }, { json: enveloppe('B', 'facturation', evs.B, lec.B) }];`,
}
import vm from 'node:vm'
export function banc() {
  const lancer = (js) => vm.runInNewContext(`(function () {\n${js}\n})()`, {}, { timeout: 2000 }).map((x) => JSON.parse(JSON.stringify(x.json)))
  return { devis: lancer(CODE_BANC.devis), facturation: lancer(CODE_BANC.facturation) }
}
export const codeBanc = (dep) => CODE_BANC[dep]
export const CODE_BILAN_BANC = String.raw`// Banc : le bilan agrégé, sans donnée : par département et par compte, le statut, les erreurs, les cartes, les lignes du pilote.
const lire = (nom) => $(nom).all().map((x) => x.json).map((s) => ({ statut: s.statut, erreurs: (s.erreurs || []).length, cartes: s.resultat && s.resultat.cartes ? s.resultat.cartes.length : null, pilote: s.resultat && s.resultat.pilote ? s.resultat.pilote.length : null }));
return [{ json: { devis: lire('Appeler presti-dep-devis'), facturation: lire('Appeler presti-dep-facturation') } }];`
export function sdkBanc(ids) {
  const C = (nom, js) => `node({ type: 'n8n-nodes-base.code', version: 2, config: { name: ${J(nom)}, parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ${J(js)} } } })`
  const A = (nom, id, notes) => `node({ type: 'n8n-nodes-base.executeWorkflow', version: 1.2, config: { name: ${J(nom)}, notes: ${J(notes)}, onError: 'continueRegularOutput', parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: ${J(id)} }, mode: 'once', options: { waitForSubWorkflow: true } } } })`
  return [`import { workflow, node, trigger, sticky } from '@n8n/workflow-sdk';`,
    `const horloge = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { name: 'Banc (jamais planifié : inactif)', parameters: { rule: { interval: [{ field: 'days', daysInterval: 1 }] } } } });`,
    `const casDevis = ${C('Cas fictifs : devis (deux comptes)', '__CAS_DEVIS__')};`,
    `const appelDevis = ${A('Appeler presti-dep-devis', ids.devis, "Le chef Devis, appelé pour de vrai : ses appels aux lib-* sont refusés tant que leurs callerIds ne le contiennent pas (politique d'appel, essai 443 de 035-007) ; il rend alors « erreur » et aucun effet.")};`,
    `const casFact = ${C('Cas fictifs : facturation (deux comptes)', '__CAS_FACT__')};`,
    `const appelFact = ${A('Appeler presti-dep-facturation', ids.facturation, 'Le chef Facturation, appelé pour de vrai (même remarque).')};`,
    `const bilan = ${C('Bilan du banc', CODE_BILAN_BANC)};`,
    `const note = sticky(${J("## presti-banc-argent (036-005)\nBanc des départements Devis et Facturation : des dossiers fictifs, deux comptes (Studio, Signature). INACTIF, jamais publié, jamais planifié. Le juge hors ligne scripts/devis-facture-n8n-qa.mjs rejoue ces dossiers sur les exports.")});`,
    `export default workflow('presti-banc-argent', 'presti-banc-argent', { settings: ${J({ ...reglagesRacine(300) })} })\n  .add(horloge).to(casDevis).to(appelDevis).to(casFact).to(appelFact).to(bilan)\n  .add(note);`].join('\n') + '\n'
}
export function jsonBanc(ids, idBanc = 'AposerXXXXXXXX') {
  const w = { id: idBanc, name: 'presti-banc-argent', active: false, settings: reglagesRacine(300) }
  w.nodes = [noeud('Banc (jamais planifié : inactif)', 'n8n-nodes-base.scheduleTrigger', 1.2, [0, 96], { rule: { interval: [{ field: 'days', daysInterval: 1 }] } }),
    code('Cas fictifs : devis (deux comptes)', codeBanc('devis'), [224, 96]), appel('Appeler presti-dep-devis', ids.devis, '', [448, 96]),
    code('Cas fictifs : facturation (deux comptes)', codeBanc('facturation'), [672, 96]), appel('Appeler presti-dep-facturation', ids.facturation, '', [896, 96]), code('Bilan du banc', CODE_BILAN_BANC, [1120, 96])]
  w.connections = {}
  for (let i = 0; i + 1 < w.nodes.length; i++) w.connections[w.nodes[i].name] = { main: [[{ node: w.nodes[i + 1].name, type: 'main', index: 0 }]] }
  return w
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (x) => process.argv.includes(x)
  const dossier = process.argv.slice(2).find((a) => !a.startsWith('--')) || '/tmp/argent'
  if (arg('--contrats')) {
    const dir = path.join(RACINE, 'plans/011-cadrage-01-11/p6-signature/contrats'); mkdirSync(dir, { recursive: true })
    for (const [f, o] of Object.entries(contrats())) writeFileSync(path.join(dir, f), J(o, null, 2) + '\n')
    console.log('contrats écrits : ' + dir)
  } else if (arg('--json')) {
    mkdirSync(dossier, { recursive: true })
    for (const [nom, w] of Object.entries(exports_())) writeFileSync(path.join(dossier, `${nom}.json`), J(w, null, 2) + '\n')
    console.log('exports attendus écrits dans ' + dossier)
  } else if (arg('--ops')) {
    mkdirSync(dossier, { recursive: true })
    const E = exports_()
    for (const [nom, w] of Object.entries(E)) { const ops = operations(nom, w); writeFileSync(path.join(dossier, `${nom}.ops.json`), J(ops)); console.log(`${nom} : ${ops.length} opération(s), ${J(ops).length} octets`)
      // des lots de 11 Ko au plus, dans l'ordre (les nœuds avant leurs liens), pour qu'un appel ne soit jamais trop gros
      const lots = [[]]; let taille = 0
      for (const op of ops) { const n = J(op).length; if (taille + n > 11000 && lots.at(-1).length) { lots.push([]); taille = 0 } lots.at(-1).push(op); taille += n }
      lots.forEach((l, i) => writeFileSync(path.join(dossier, `${nom}.lot${i + 1}.json`), J(l)))
      console.log(`  ${lots.length} lot(s) : ${lots.map((l) => J(l).length).join(', ')} octets`) }
    writeFileSync(path.join(dossier, 'banc.sdk.js'), sdkBanc(ID).replace(J('__CAS_DEVIS__'), J('return [];')).replace(J('__CAS_FACT__'), J('return [];')))
    writeFileSync(path.join(dossier, 'banc.cas-devis.js'), codeBanc('devis')); writeFileSync(path.join(dossier, 'banc.cas-facturation.js'), codeBanc('facturation'))
    console.log('banc : SDK allégé + deux codes de cas écrits')
  }
}
