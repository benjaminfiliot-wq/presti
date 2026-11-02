// JUGE HORS LIGNE du socle `lib-*` (tâche 035-003, prompt 5). Aucun réseau, aucune base, aucun modèle, aucune donnée réelle.
// Il lit les exports des six gabarits (le JSON rendu par le MCP `get_workflow_details`) dans .orchestre/preuves/035-003/, et :
//   S  — leur STRUCTURE : inactifs ; aucun identifiant ni nœud de lecture, d'écriture ou d'envoi (mode A) ; réglages (workflow d'erreur
//        = lib-erreur-commune, Europe/Paris, délai, appelants en liste) ; squelette exact (contrat d'entrée → conforme ? → porte
//        « simulation » → logique → contrat de sortie, et l'arrêt sur la sortie « faux ») ; empreinte du gabarit « Contrat » identique
//        dans chaque enfant ; SHA-256 écrit à la main égal à node:crypto ; étiquettes `lib` et `couche-<nom>`.
//   C  — le gabarit « Contrat » REJOUÉ : chaque nœud Code de l'export est exécuté tel quel (node:vm), en suivant les connexions ; une
//        entrée hors schéma ne produit ni écriture ni envoi (p5:314) ; hors simulation, rien n'est atteint (p5:318).
//   D, J, A, E, K, B — le test « qui doit pouvoir rougir » de chaque gabarit (premiere-reponse.md § 5.5, colonne de droite).
//   N  — les essais réels dans n8n (`test_workflow`, données épinglées) : rejoués ici, ils doivent donner la même sortie.
// Puis il prouve qu'il sait rougir : chaque MUTANT (une porte retirée, un contrat affaibli, une fenêtre d'alerte ôtée…) doit le faire
// échouer pour sa raison.
//   node scripts/lib-socle-n8n-qa.mjs [dossier des exports]
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.resolve(RACINE, process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '.orchestre/preuves/035-003')
const ERREUR = 'lib-erreur-commune'
const ENFANTS = ['lib-dedoublonner', 'lib-journaliser', 'lib-alerter', 'lib-disjoncteur', 'lib-battement']
const LIBS = [ERREUR, ...ENFANTS]
const COUCHES = { 'lib-dedoublonner': 'decision', 'lib-journaliser': 'journal', 'lib-alerter': 'alerte', 'lib-erreur-commune': 'erreurs', 'lib-disjoncteur': 'erreurs', 'lib-battement': 'supervision' }
const LOGIQUE = { 'lib-dedoublonner': 'Calculer la clé', 'lib-journaliser': 'Préparer les lignes', 'lib-alerter': 'Regrouper et rédiger', 'lib-disjoncteur': 'Compter les échecs', 'lib-battement': 'Battre ou contrôler' }
const T = { trigger: 'n8n-nodes-base.executeWorkflowTrigger', erreur: 'n8n-nodes-base.errorTrigger', code: 'n8n-nodes-base.code', si: 'n8n-nodes-base.if', arret: 'n8n-nodes-base.stopAndError', note: 'n8n-nodes-base.stickyNote' }
const ARRET = 'Hors simulation : non branché'
// Le gabarit « Contrat » (PR § 5.5) : le corps commun sous le repère. Ces empreintes sont celles du corps relu dans la revue de 035-003 ;
// un corps changé dans UN enfant, ou dans tous, fait rougir S5 (et se re-signe ici, en connaissance de cause).
const REPERE_ENTREE = "// ─── Gabarit « Contrat d'entrée » 035-003 : au-dessus, CONTRAT et SCHEMA seulement ; en dessous, le corps commun (empreinte tenue par le juge) ───"
const REPERE_SORTIE = '// ─── Gabarit « Contrat de sortie » 035-003 : au-dessus, CONTRAT seulement ; en dessous, le corps commun (empreinte tenue par le juge) ───'
const EMPREINTE_ENTREE = '20f6ff371969130e45b37ea58466baaa9b4581f7dbe145863a2f4a1a57713899'
const EMPREINTE_SORTIE = '8f0f37c68d78f3154204655b3f5343889c5c74733c8b852f27e34bc517394a70'
const CLES_SORTIE = ['contrat', 'statut', 'cle_idempotence', 'simulation', 'resultat', 'effets_prevus', 'effets_faits', 'journal', 'erreurs']
const sha = (t) => createHash('sha256').update(String(t), 'utf8').digest('hex')
const copie = (o) => JSON.parse(JSON.stringify(o))

// ─── L'exécuteur hors ligne : les nœuds Code de l'export, tels quels, dans node:vm ────────────────────────────────────────────
// Il ne connaît que les types du socle (déclencheurs, Code, If, Stop and Error) : tout autre nœud atteint (une lecture, une écriture,
// un envoi ajoutés par un mutant) arrête le rejeu en erreur, ce qui rougit.
function lancerCode(js, items) {
  const entree = copie(items)
  const ctx = { $input: { all: () => entree, first: () => entree[0], last: () => entree[entree.length - 1] }, console: { log() {} } }
  const sortie = vm.runInNewContext(`(function () {\n${js}\n})()`, ctx, { timeout: 5000 })
  if (!Array.isArray(sortie) || !sortie.every((x) => x && typeof x === 'object' && x.json && typeof x.json === 'object')) throw new Error('un nœud Code doit rendre [{ json }]')
  return JSON.parse(JSON.stringify(sortie))
}
function evaluerSi(n, items) {
  const c = n.parameters?.conditions ?? {}
  const cond = c.conditions?.[0] ?? {}
  const m = /^=\{\{\s*\$json\.([\w.]+)\s*\}\}$/.exec(String(cond.leftValue ?? ''))
  if (!m || (c.conditions ?? []).length !== 1) throw new Error(`${n.name} : condition illisible hors ligne`)
  const vrai = [], faux = []
  for (const it of items) {
    const v = m[1].split('.').reduce((o, k) => (o == null ? undefined : o[k]), it.json)
    if (c.options?.typeValidation === 'strict' && typeof v !== 'boolean') throw new Error(`${n.name} : valeur non booléenne en typage strict`)
    const ok = cond.operator?.operation === 'false' ? v === false : v === true
    ;(ok ? vrai : faux).push(it)
  }
  return [vrai, faux]
}
function executer(wf, entrees) {
  const parNom = new Map(wf.nodes.map((n) => [n.name, n]))
  const racines = wf.nodes.filter((n) => n.type === T.trigger || n.type === T.erreur)
  const visites = [], sorties = []
  if (racines.length !== 1) return { sorties, visites, erreur: `${racines.length} déclencheur(s)` }
  const file = [[racines[0].name, entrees.map((j) => ({ json: copie(j) }))]]
  for (let pas = 0; file.length; pas++) {
    if (pas > 300) return { sorties, visites, erreur: 'boucle' }
    const [nom, items] = file.shift()
    const n = parNom.get(nom)
    if (!n) return { sorties, visites, erreur: `nœud absent : ${nom}` }
    visites.push(nom)
    let outs
    try {
      if (n.type === T.trigger || n.type === T.erreur) outs = [items]
      else if (n.type === T.code) outs = [lancerCode(n.parameters?.jsCode ?? '', items)]
      else if (n.type === T.si) outs = evaluerSi(n, items)
      else if (n.type === T.arret) return { sorties, visites, erreur: String(n.parameters?.errorMessage ?? 'Stop and Error') }
      else return { sorties, visites, erreur: `nœud non rejouable hors ligne atteint : ${nom} (${n.type})` }
    } catch (err) { return { sorties, visites, erreur: `${nom} : ${err.message}` } }
    if (nom === 'Contrat de sortie') sorties.push(...outs[0].map((i) => i.json))
    ;(wf.connections?.[nom]?.main ?? []).forEach((liste, i) => { const it = outs[i] ?? []; if (it.length) for (const l of liste ?? []) if (l?.node) file.push([l.node, it]) })
  }
  return { sorties, visites, erreur: null }
}

// ─── Les cas fictifs (« Exemple. », organisations 00000000-0000-4000-8000-…, aucune adresse réelle) ─────────────────────────────
const ORG1 = '00000000-0000-4000-8000-000000000001', ORG2 = '00000000-0000-4000-8000-000000000002'
const OBJ = (i) => `00000000-0000-4000-8000-${String(100 + i).padStart(12, '0')}`
const env = (nom, donnees, config = {}, plus = {}) => ({ contrat: `${nom}@1`, organisation_id: ORG1, simulation: true, cle_idempotence: `exemple:${nom.slice(4)}:0001`,
  trace: { execution_parent: 'Exemple. 1', declencheur: 'essai', tentative: 0 }, config, donnees, ...plus })
const NOMINAL = {
  'lib-dedoublonner': () => env('lib-dedoublonner', { type: 'relance', objet_id: OBJ(1), etape: 'palier-1' }),
  'lib-journaliser': () => env('lib-journaliser', { entrees: [{ evenement: 'decision', agent: 'ent-exemple-relance', objet_ref: 'Exemple. devis-0001', decision: 'Exemple. relance au palier 1', simulation: true }] }),
  'lib-alerter': () => env('lib-alerter', { categorie: 'workflow_en_panne', workflow: 'ent-exemple-relance', lien_execution: null, destinataire_role: 'benj', survenue_le: '2026-11-02T12:00:00Z' }),
  'lib-disjoncteur': () => env('lib-disjoncteur', { agent: 'ent-exemple-relance', issue: 'echec' }, { seuil: 3 }),
  'lib-battement': () => env('lib-battement', { workflow: 'ent-exemple-parent', passe_le: '2026-11-02T12:00:00Z' }),
}
const HORS_CONTRAT = [
  ['trace absente', (e) => { delete e.trace }],
  ['champ en trop dans l’enveloppe', (e) => { e.pirate = 1 }],
  ['organisation_id hors forme', (e) => { e.organisation_id = 'Exemple. pas un uuid' }],
  ['simulation en texte', (e) => { e.simulation = 'true' }],
  ['contrat d’un autre gabarit', (e) => { e.contrat = 'lib-relancer@1' }],
  ['clé de 81 caractères', (e) => { e.cle_idempotence = 'x'.repeat(81) }],
  ['champ hors contrat dans donnees', (e) => { e.donnees.inconnu = 1 }],
  ['adresse e-mail dans la configuration', (e) => { e.config.note = 'Exemple. gerant@exemple.invalid' }],
  ['téléphone dans la configuration', (e) => { e.config.note = 'Exemple. 06 12 34 56 78' }],
]
const ERREURS_FICTIVES = [
  ['authentification', { name: 'NodeApiError', message: 'Exemple. Authorization failed - please check your credentials', httpCode: '401' }],
  ['quota', { name: 'NodeApiError', message: 'Exemple. Too Many Requests', httpCode: '429' }],
  ['delai', { name: 'NodeApiError', message: 'Exemple. connect ETIMEDOUT 10.0.0.1:443' }],
  ['reseau', { name: 'NodeApiError', message: 'Exemple. getaddrinfo ENOTFOUND api.exemple.invalid' }],
  ['entree_invalide', { name: 'NodeOperationError', message: 'Exemple. contrat lib-relancer@1 : entrée hors contrat' }],
  ['expression', { name: 'ExpressionError', message: "Exemple. Cannot read properties of undefined (reading 'id')" }],
  ['execution', { name: 'NodeOperationError', message: 'Exemple. Le nœud a renvoyé un résultat inattendu' }],
]
const CLE_FICTIVE = 'sk-' + 'ant-' + 'api03-' + 'x'.repeat(30)
const objetErreur = (error, plus = {}) => ({ execution: { id: '412', url: 'http://localhost:5679/workflow/AbCdEf123456/executions/412', retryOf: null, error, lastNodeExecuted: 'Lire les devis', mode: 'trigger' },
  workflow: { id: 'AbCdEf123456', name: 'ent-exemple-relance' }, ...plus })

// ─── Les épreuves ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function juger(W, essais) {
  const e = []
  const ko = (id, cond, m) => { if (!cond) e.push(`${id} ${m}`) }
  const wf = (n) => W[n]
  for (const n of LIBS) ko('S1', !!wf(n), `${n} : export absent`)
  if (e.length) return e
  const idErreur = wf(ERREUR).id
  // S1 à S4, S7 : structure, réglages, squelette, étiquettes
  for (const n of LIBS) {
    const w = wf(n), s = w.settings ?? {}
    ko('S1', w.active === false && !w.activeVersionId, `${n} : doit rester inactif, sans version publiée`)
    const enfant = n !== ERREUR
    for (const x of w.nodes) {
      const permis = [T.code, T.si, T.arret, T.note, enfant ? T.trigger : T.erreur]
      ko('S2', permis.includes(x.type), `${n} : nœud ${x.name} de type ${x.type} hors du socle (mode A : ni lecture, ni écriture, ni envoi)`)
      ko('S2', !x.credentials || !Object.keys(x.credentials).length, `${n} : identifiant posé sur ${x.name} (aucun en mode A)`)
      ko('S2', x.disabled !== true, `${n} : nœud ${x.name} désactivé`)
    }
    ko('S3', s.timezone === 'Europe/Paris', `${n} : fuseau ${s.timezone ?? 'absent'}`)
    ko('S3', Number.isInteger(s.executionTimeout) && s.executionTimeout >= 1 && s.executionTimeout <= 60, `${n} : délai maximal ${s.executionTimeout ?? 'absent'} (1 à 60 s : nœuds Code de moins de 60 s)`)
    if (enfant) {
      ko('S3', s.errorWorkflow === idErreur, `${n} : workflow d'erreur ${s.errorWorkflow ?? 'absent'} au lieu de lib-erreur-commune (${idErreur})`)
      const ids = String(s.callerIds ?? '').split(',').map((x) => x.trim()).filter(Boolean)
      ko('S3', s.callerPolicy === 'workflowsFromAList' && ids.length > 0 && ids.every((i) => /^[A-Za-z0-9]{6,64}$/.test(i) && i !== w.id), `${n} : politique d'appel ${s.callerPolicy ?? 'absente'} (${ids.join(',') || 'aucun appelant'}) : une liste d'appelants attendue`)
    } else {
      ko('S3', s.errorWorkflow === undefined, `${n} : ne désigne aucun workflow d'erreur (il est celui des autres)`)
      ko('S3', s.callerPolicy === 'none', `${n} : personne ne l'appelle (callerPolicy none attendu, ${s.callerPolicy ?? 'absent'})`)
    }
    const aretes = Object.entries(w.connections ?? {}).flatMap(([de, c]) => Object.entries(c).flatMap(([genre, sorties]) => (sorties ?? []).flatMap((l, i) => (l ?? []).map((x) => `${de}[${genre}:${i}]→${x.node}`)))).sort()
    const declencheur = w.nodes.find((x) => x.type === (enfant ? T.trigger : T.erreur))?.name
    const attendu = (enfant
      ? [`${declencheur}[main:0]→Contrat d'entrée`, "Contrat d'entrée[main:0]→Entrée conforme ?", 'Entrée conforme ?[main:0]→Porte simulation', 'Entrée conforme ?[main:1]→Contrat de sortie',
        `Porte simulation[main:0]→${LOGIQUE[n]}`, `Porte simulation[main:1]→${ARRET}`, `${LOGIQUE[n]}[main:0]→Contrat de sortie`]
      : [`${declencheur}[main:0]→Diagnostic`, 'Diagnostic[main:0]→Porte simulation', 'Porte simulation[main:0]→Effets prévus', `Porte simulation[main:1]→${ARRET}`, 'Effets prévus[main:0]→Contrat de sortie']).sort()
    ko('S4', JSON.stringify(aretes) === JSON.stringify(attendu), `${n} : squelette différent : ${aretes.filter((a) => !attendu.includes(a)).join(' ; ') || '—'} en trop, ${attendu.filter((a) => !aretes.includes(a)).join(' ; ') || '—'} manquant`)
    const porte = w.nodes.find((x) => x.name === 'Porte simulation'), cp = porte?.parameters?.conditions ?? {}
    ko('S4', porte?.type === T.si && /^\s*porte\s*:\s*simulation\s*$/m.test(String(porte.notes ?? '')) && cp.conditions?.length === 1 && /^=\{\{\s*\$json\.enveloppe\.simulation\s*\}\}$/.test(cp.conditions[0].leftValue)
      && cp.conditions[0].operator?.type === 'boolean' && cp.conditions[0].operator?.operation === 'true' && cp.options?.typeValidation === 'strict', `${n} : porte « simulation » mal formée`)
    const arret = w.nodes.find((x) => x.name === ARRET)
    ko('S4', arret?.type === T.arret, `${n} : la sortie « faux » de la porte doit être un Stop and Error (effet réel non branché en mode A)`)
    const tags = (w.tags ?? []).map((t) => t.name ?? t)
    ko('S7', tags.includes('lib') && tags.includes(`couche-${COUCHES[n]}`), `${n} : étiquettes ${tags.join(',') || 'aucune'} (lib et couche-${COUCHES[n]} attendues)`)
    // S5 : le gabarit « Contrat » (empreinte du corps, tête de deux lignes)
    const sortie = w.nodes.find((x) => x.name === 'Contrat de sortie')?.parameters?.jsCode ?? ''
    const [teteS, corpsS] = sortie.split(REPERE_SORTIE)
    ko('S5', corpsS !== undefined && sha(corpsS) === EMPREINTE_SORTIE, `${n} : corps du « Contrat de sortie » différent du gabarit (empreinte ${sha(corpsS ?? '').slice(0, 12)}…)`)
    ko('S5', (teteS ?? '').split('\n').filter((l) => l && !l.startsWith('//')).join('\n') === `const CONTRAT = '${n}@1';`, `${n} : tête du « Contrat de sortie » : seule la ligne CONTRAT = '${n}@1' est propre à l'enfant`)
    if (enfant) {
      const ent = w.nodes.find((x) => x.name === "Contrat d'entrée")
      const [teteE, corpsE] = String(ent?.parameters?.jsCode ?? '').split(REPERE_ENTREE)
      ko('S5', corpsE !== undefined && sha(corpsE) === EMPREINTE_ENTREE, `${n} : corps du « Contrat d'entrée » différent du gabarit (empreinte ${sha(corpsE ?? '').slice(0, 12)}…)`)
      const lignes = (teteE ?? '').split('\n').filter((l) => l && !l.startsWith('//'))
      ko('S5', lignes.length === 2 && lignes[0] === `const CONTRAT = '${n}@1';` && /^const SCHEMA = \{.*\};$/.test(lignes[1]), `${n} : tête du « Contrat d'entrée » : CONTRAT et SCHEMA seulement`)
      ko('S5', new RegExp(`^\\s*contrat\\s*:\\s*${n}@1\\s*$`, 'm').test(String(ent?.notes ?? '')), `${n} : notes « contrat: ${n}@1 » attendues`)
    }
  }
  // S6 : le SHA-256 écrit à la main (aucun module dans un nœud Code) donne celui de node:crypto
  for (const n of ['lib-dedoublonner', 'lib-journaliser']) {
    const js = wf(n).nodes.find((x) => x.name === LOGIQUE[n])?.parameters?.jsCode ?? ''
    const f = /function sha256\(texte\) \{[\s\S]*?\n\}/.exec(js)?.[0]
    let bon = false
    try { const h = vm.runInNewContext(`${f}\nsha256`, {}); bon = ['', 'abc', 'Exemple. é€😀'.repeat(20), 'x'.repeat(200)].every((t) => h(t) === sha(t)) } catch { bon = false }
    ko('S6', bon, `${n} : le SHA-256 du nœud Code ne donne pas celui de node:crypto`)
  }

  // C : le gabarit « Contrat » rejoué sur chaque enfant
  for (const n of ENFANTS) {
    const r = executer(wf(n), [NOMINAL[n]()])
    const s = r.sorties[0] ?? {}
    ko('C1', !r.erreur && r.sorties.length === 1 && JSON.stringify(Object.keys(s)) === JSON.stringify(CLES_SORTIE) && s.contrat === `${n}@1` && ['ok', 'rien_a_faire'].includes(s.statut)
      && s.simulation === true && Array.isArray(s.effets_faits) && !s.effets_faits.length && r.visites.includes(LOGIQUE[n]), `${n} : l'entrée nominale ne rend pas une sortie conforme (${r.erreur ?? s.statut ?? 'aucune sortie'})`)
    for (const [titre, f] of HORS_CONTRAT) {
      const x = NOMINAL[n](); f(x)
      const q = executer(wf(n), [x]), t = q.sorties[0] ?? {}
      ko('C2', !q.erreur && q.sorties.length === 1 && t.statut === 'rejete' && t.resultat === null && !t.effets_prevus?.length && !t.effets_faits?.length && t.erreurs?.length > 0
        && t.journal?.some((l) => l.evenement === 'contrat_rejete') && !q.visites.includes('Porte simulation') && !q.visites.includes(LOGIQUE[n]) && !/gerant@|06 12 34/.test(JSON.stringify(t)),
      `${n} : entrée hors contrat (${titre}) : ${q.erreur ?? `statut ${t.statut}`}, ${q.visites.includes(LOGIQUE[n]) ? 'la logique a tourné' : 'logique non atteinte'}`)
    }
    const reel = executer(wf(n), [{ ...NOMINAL[n](), simulation: false }])
    ko('C3', /Hors simulation/.test(reel.erreur ?? '') && !reel.sorties.length && !reel.visites.includes(LOGIQUE[n]), `${n} : hors simulation, la chaîne doit s'arrêter avant tout effet (${reel.erreur ?? 'aucun arrêt'}, ${reel.sorties.length} sortie(s))`)
    const lot = executer(wf(n), [NOMINAL[n](), { ...NOMINAL[n](), pirate: 1 }, NOMINAL[n]()])
    ko('C4', !lot.erreur && lot.sorties.length === 3 && lot.sorties.filter((x) => x.statut === 'rejete').length === 1, `${n} : un lot de trois dont un hors contrat doit rendre trois sorties, une seule rejetée`)
  }

  // D : lib-dedoublonner — le rejeu du même lot donne zéro doublon (p5:316)
  const dd = (items) => executer(wf('lib-dedoublonner'), items)
  const lotD = (connues = []) => [1, 2, 3].map((i) => env('lib-dedoublonner', { type: 'relance', objet_id: OBJ(i), etape: 'palier-2' }, { cles_connues: connues }))
  const p1 = dd(lotD()), cles1 = p1.sorties.map((s) => s.resultat?.cle)
  const reserve1 = p1.sorties.flatMap((s) => s.effets_prevus).map((x) => x.cle)
  const p2 = dd(lotD(reserve1)), reserve2 = p2.sorties.flatMap((s) => s.effets_prevus).map((x) => x.cle)
  ko('D1', !p1.erreur && new Set(cles1).size === 3 && reserve1.length === 3 && !p2.erreur && p2.sorties.every((s) => s.resultat?.deja_fait === true) && reserve2.length === 0
    && new Set([...reserve1, ...reserve2]).size === reserve1.length + reserve2.length, `lib-dedoublonner : le rejeu du même lot doit donner zéro doublon (passe 1 : ${reserve1.length} réservée(s), passe 2 : ${reserve2.length})`)
  const double = dd([lotD()[0], lotD()[0]])
  ko('D2', double.sorties.length === 2 && double.sorties[0].resultat?.deja_fait === false && double.sorties[1].resultat?.deja_fait === true, 'lib-dedoublonner : un doublon dans le même lot doit être vu')
  const longue = dd([env('lib-dedoublonner', { type: 'x'.repeat(40), objet_id: OBJ(9), etape: 'y'.repeat(40) })]).sorties[0]?.resultat?.cle ?? ''
  const encore = dd([env('lib-dedoublonner', { type: 'x'.repeat(40), objet_id: OBJ(9), etape: 'y'.repeat(40) })]).sorties[0]?.resultat?.cle
  ko('D3', cles1.every((c) => typeof c === 'string' && c.length <= 80) && longue.length > 0 && longue.length <= 80 && longue === encore, `lib-dedoublonner : clé de ${longue.length} caractères (80 au plus, condensée, stable)`)
  const autreOrg = dd([{ ...env('lib-dedoublonner', { type: 'relance', objet_id: OBJ(1), etape: 'palier-2' }), organisation_id: ORG2 }]).sorties[0]?.resultat?.cle
  const autreEtape = dd([env('lib-dedoublonner', { type: 'relance', objet_id: OBJ(1), etape: 'palier-3' })]).sorties[0]?.resultat?.cle
  ko('D4', autreOrg && autreOrg !== cles1[0] && autreEtape !== cles1[0], 'lib-dedoublonner : la clé doit séparer les organisations et les étapes')

  // J : lib-journaliser — chaque chemin écrit sa ligne ; en simulation, la ligne dit ce qui aurait été fait
  const entree = (i, plus = {}) => ({ evenement: 'decision', agent: 'ent-exemple-relance', objet_ref: `Exemple. devis-000${i}`, decision: `Exemple. relance ${i}`, simulation: true, ...plus })
  const jj = (entrees, plus = {}) => executer(wf('lib-journaliser'), [env('lib-journaliser', { entrees }, {}, plus)]).sorties[0] ?? {}
  const j1 = jj([entree(1), entree(2), entree(3, { simulation: false })]), j1b = jj([entree(1), entree(2), entree(3, { simulation: false })])
  ko('J1', j1.resultat?.ecrites === 3 && j1.journal?.length === 3 && new Set(j1.journal.map((l) => l.cle)).size === 3 && j1.journal.every((l) => l.simulation === true && /^\[simulation\] aurait été fait/.test(l.decision))
    && JSON.stringify(j1.journal.map((l) => l.cle)) === JSON.stringify(j1b.journal?.map((l) => l.cle)), 'lib-journaliser : trois entrées doivent donner trois lignes en simulation, aux clés stables au rejeu')
  const j2 = jj([entree(1, { cout_eur: 0.12 }), entree(2, { cout_eur: 0.12, source_tarif: 'Exemple. grille mesurée' })])
  ko('J2', j2.journal?.[0]?.cout_eur === null && j2.journal?.[1]?.cout_eur === 0.12 && j2.erreurs?.length === 1, 'lib-journaliser : un coût sans source de tarif doit être remis à null (jamais une estimation déguisée)')
  const j3 = jj(Array.from({ length: 201 }, (_, i) => entree(i))), j4 = jj([entree(1, { decision: 'Exemple. écrire à gerant@exemple.invalid' })])
  ko('J3', j3.statut === 'rejete' && j4.statut === 'rejete' && !JSON.stringify(j4).includes('gerant@'), 'lib-journaliser : plus de 200 entrées, ou une adresse dans une entrée, doivent être rejetées')

  // A : lib-alerter — 10 erreurs en une minute donnent une seule alerte ; ni secret ni donnée personnelle dans le texte
  const al = (items) => executer(wf('lib-alerter'), items)
  const alerte = (sec, plus = {}, config = {}) => env('lib-alerter', { categorie: 'workflow_en_panne', workflow: 'ent-exemple-relance', lien_execution: 'http://localhost:5679/workflow/AbCdEf123456/executions/412', destinataire_role: 'benj', survenue_le: new Date(Date.UTC(2026, 10, 2, 12, 4, 30) + sec * 1000).toISOString(), ...plus }, config)
  const envois = (r) => r.sorties.flatMap((s) => s.effets_prevus ?? []).filter((x) => x.effet === 'envoyer_alerte')
  const a1 = al(Array.from({ length: 10 }, (_, i) => alerte(i * 6)))
  ko('A1', !a1.erreur && envois(a1).length === 1 && a1.sorties.find((s) => s.statut === 'ok')?.resultat?.regroupees === 10 && a1.sorties.every((s) => s.resultat?.envoyee === false),
    `lib-alerter : 10 erreurs en une minute (à cheval sur deux fenêtres de 5 min) doivent donner une seule alerte (${envois(a1).length})`)
  const a2 = al([alerte(0), alerte(10, { categorie: 'cout_qui_derive' }), alerte(360)])
  const a3 = al([alerte(0, {}, { alertes_recentes: [{ workflow: 'ent-exemple-relance', categorie: 'workflow_en_panne', envoyee_le: new Date(Date.UTC(2026, 10, 2, 12, 2, 30)).toISOString() }] })])
  ko('A2', envois(a2).length === 3 && envois(a3).length === 0, `lib-alerter : une catégorie neuve, ou 6 min plus tard, réalerte ; un envoi récent (2 min) suffit (${envois(a2).length}, ${envois(a3).length})`)
  const a4 = al([alerte(0, { workflow: 'ent-exemple; DROP', lien_execution: 'http://localhost:5679/workflow/AbCdEf123456/executions/412?jeton=' + CLE_FICTIVE })])
  const texte = envois(a4)[0]?.texte ?? ''
  ko('A3', /^\[[^\]]+\] workflow hors liste$/.test(texte) && !texte.includes('sk-') && /^\[Workflow en panne\] ent-exemple-relance · exécution : http:\/\/localhost:5679\/workflow\/AbCdEf123456\/executions\/412 · 10 occurrences en 5 min$/.test(envois(a1)[0]?.texte ?? ''),
    `lib-alerter : texte minimal attendu (catégorie, workflow, lien d'exécution vérifié), jamais un nom libre ni un lien porteur de jeton (« ${texte} »)`)

  // E : lib-erreur-commune — rejeu d'objets d'erreur fictifs (le déclencheur ne part pas en manuel)
  const er = (obj) => executer(wf(ERREUR), [obj])
  const cats = ERREURS_FICTIVES.map(([c, err]) => [c, er(objetErreur(err)).sorties[0]?.resultat?.categorie])
  ko('E1', cats.every(([a, b]) => a === b), `lib-erreur-commune : diagnostic en 7 catégories (${cats.filter(([a, b]) => a !== b).map(([a, b]) => `${a}→${b}`).join(', ') || 'ok'})`)
  const sale = 'Exemple. Échec pour gerant@exemple.invalid, Bearer ' + 'abcdefghijklmnopqrstuvwxyz012345 cle ' + CLE_FICTIVE + ' client 00000000-0000-4000-8000-000000000123 tél 06 12 34 56 78 IBAN FR76 3000 6000 0112 3456 7890 189 sur https://exemple.invalid/x?token=abc "Exemple. Bonjour, je voudrais refaire ma salle de bain au plus vite"'
  const e2 = er(objetErreur({ name: 'NodeApiError', message: sale })), sortieE2 = JSON.stringify(e2.sorties)
  const fuites = ['gerant@', 'abcdefghijklmnop', 'sk-ant', '000000000123', '06 12 34', '3000 6000', 'token=abc', 'salle de bain'].filter((x) => sortieE2.includes(x))
  ko('E2', !e2.erreur && !fuites.length && (e2.sorties[0]?.resultat?.message_masque?.length ?? 999) <= 300, `lib-erreur-commune : le masquage laisse passer ${fuites.join(', ') || 'rien'}${e2.erreur ? ' (' + e2.erreur + ')' : ''}`)
  const e3 = er({ trigger: { error: { name: 'WorkflowActivationError', message: 'Exemple. There was a problem activating the workflow' }, mode: 'trigger' }, workflow: { id: 'AbCdEf123456', name: 'ent-exemple-parent' } }).sorties[0]
  ko('E3', e3?.statut === 'ok' && e3.resultat?.categorie === 'execution' && e3.cle_idempotence === 'err:AbCdEf123456:declencheur', "lib-erreur-commune : l'échec d'un déclencheur (objet trigger) doit être diagnostiqué")
  const e4 = er(objetErreur(ERREURS_FICTIVES[1][1])), s4 = e4.sorties[0] ?? {}, eff = s4.effets_prevus ?? []
  const e4p = er({ ...objetErreur(ERREURS_FICTIVES[1][1]), workflow: { id: 'AbCdEf123456', name: 'presti-detecteurs' } }).sorties[0]?.effets_prevus ?? []
  ko('E4', !e4.erreur && s4.simulation === true && !s4.effets_faits?.length && ['journaliser', 'alerter', 'compter_echec'].every((k) => eff.some((x) => x.effet === k)) && !e4p.some((x) => x.effet === 'compter_echec') && !e4.visites.includes(ARRET),
    `lib-erreur-commune : journal, alerte et compteur prévus, rien fait (${e4.erreur ?? eff.map((x) => x.effet).join(',')})`)
  // E5 : ce que lib-erreur-commune prévoit respecte le contrat des gabarits qui le recevront
  const parEffet = (k) => eff.find((x) => x.effet === k)
  const vers = [
    ['lib-journaliser', env('lib-journaliser', { entrees: [parEffet('journaliser')?.entree] })],
    ['lib-alerter', env('lib-alerter', parEffet('alerter')?.donnees ?? {})],
    ['lib-disjoncteur', env('lib-disjoncteur', parEffet('compter_echec')?.donnees ?? {}, { seuil: 3 })],
  ].map(([n, x]) => [n, executer(wf(n), [x]).sorties[0]?.statut])
  ko('E5', vers.every(([, st]) => st === 'ok'), `lib-erreur-commune : ses effets prévus doivent passer le contrat de leur gabarit (${vers.map(([n, st]) => `${n} ${st}`).join(', ')})`)

  // K : lib-disjoncteur — N+1 échecs coupent l'agent ; un succès remet le compteur à zéro
  const dj = (issues, precedent) => executer(wf('lib-disjoncteur'), issues.map((issue) => env('lib-disjoncteur', { agent: 'ent-exemple-relance', issue, ...(precedent ? { etat_precedent: precedent } : {}) }, { seuil: 3 }))).sorties
  const k1 = dj(['echec', 'echec', 'echec', 'echec']), coupures = k1.flatMap((s) => s.effets_prevus).filter((x) => x.effet === 'alerter').length
  ko('K1', k1.map((s) => s.resultat?.etat).join(',') === 'ferme,ferme,ouvert,ouvert' && coupures === 1, `lib-disjoncteur : seuil 3 : ${k1.map((s) => s.resultat?.etat).join(',')} (fermé, fermé, ouvert, ouvert attendu), ${coupures} alerte(s) de coupure`)
  const k2 = dj(['echec', 'echec', 'succes', 'echec', 'echec'])
  ko('K2', k2.map((s) => s.resultat?.echecs_consecutifs).join(',') === '1,2,0,1,2' && k2.every((s) => s.resultat?.etat === 'ferme'), `lib-disjoncteur : un succès remet le compteur à zéro (${k2.map((s) => s.resultat?.echecs_consecutifs).join(',')})`)
  const k3 = dj(['succes'], { etat: 'ouvert', echecs_consecutifs: 3 })[0]?.resultat, k4 = dj(['echec'], { etat: 'ferme', echecs_consecutifs: 2 })[0]?.resultat
  ko('K3', k3?.etat === 'ouvert' && k3?.echecs_consecutifs === 0 && k4?.etat === 'ouvert', 'lib-disjoncteur : ouvert ne se referme qu’à la main ; l’état lu par l’appelant compte')
  const k5 = executer(wf('lib-disjoncteur'), [env('lib-disjoncteur', { agent: 'ent-exemple-relance', issue: 'echec' }, { seuil: 1 }), { ...env('lib-disjoncteur', { agent: 'ent-exemple-relance', issue: 'echec' }, { seuil: 3 }), organisation_id: ORG2 }]).sorties
  ko('K4', k5[0]?.resultat?.etat === 'ouvert' && k5[1]?.resultat?.etat === 'ferme' && k5[1]?.resultat?.echecs_consecutifs === 1, 'lib-disjoncteur : une organisation n’en coupe pas une autre')

  // B : lib-battement — un parent muet depuis 26 h donne une seule alerte
  const H = 3600 * 1000, T0 = Date.UTC(2026, 10, 1, 8, 0, 0), iso = (t) => new Date(t).toISOString()
  const ctl = (heure, dernier, levee, config = {}) => executer(wf('lib-battement'), [env('lib-battement', { workflow: 'ent-exemple-controle', passe_le: iso(T0 + heure * H), operation: 'controler',
    battements: [{ workflow: 'ent-exemple-parent', dernier_le: dernier === null ? null : iso(T0 + dernier * H), alerte_levee_le: levee == null ? null : iso(T0 + levee * H) }] }, config)]).sorties[0] ?? {}
  const b1 = executer(wf('lib-battement'), [NOMINAL['lib-battement']()]).sorties[0] ?? {}
  ko('B1', b1.statut === 'ok' && b1.resultat?.ecrit === false && b1.effets_prevus?.[0]?.effet === 'ecrire_battement', 'lib-battement : un battement doit être prévu, jamais écrit en mode A')
  ko('B2', ctl(25, 0).resultat?.alertes === 0 && ctl(26, 0).resultat?.alertes === 1 && ctl(30, 0, null, { silence_max_h: 36 }).resultat?.alertes === 0, 'lib-battement : 25 h de silence : rien ; 26 h : une alerte ; le seuil configuré compte')
  let levee = null, total = 0
  for (let h = 26; h <= 30; h++) { const s = ctl(h, 0, levee); total += s.resultat?.alertes ?? 0; const n = (s.effets_prevus ?? []).find((x) => x.effet === 'noter_alerte_levee'); if (n) levee = (Date.parse(n.alerte_levee_le) - T0) / H }
  const apres = ctl(58, 31, levee)
  ko('B3', total === 1 && apres.resultat?.alertes === 1, `lib-battement : contrôlé toutes les heures de 26 à 30 h, un parent muet donne ${total} alerte(s) (une attendue) ; un nouveau silence après un battement réalerte`)

  // N : les essais réels dans n8n (test_workflow sur données épinglées), rejoués hors ligne : même sortie
  for (const x of essais ?? []) {
    const r = executer(wf(x.workflow), x.entrees)
    // Même multiensemble de sorties : l'ordre des passes du « Contrat de sortie » suit l'ordre d'exécution des branches.
    const tri = (l) => JSON.stringify((l ?? []).map((s) => JSON.stringify(s)).sort())
    const attendu = x.erreur ? `erreur ${x.erreur}` : tri(x.sorties)
    const obtenu = r.erreur ? `erreur ${r.erreur}` : tri(r.sorties)
    ko('N1', x.erreur || (x.sorties?.length ?? 0) > 0, `${x.workflow} : l'essai n8n « ${x.titre} » ne porte aucune sortie`)
    ko('N1', x.erreur ? r.erreur && r.erreur.includes(x.erreur) : obtenu === attendu, `${x.workflow} : l'essai n8n « ${x.titre} » (exécution ${x.execution}) ne se rejoue pas à l'identique hors ligne`)
  }
  return e
}

// ─── Les mutants : chacun doit faire rougir le juge, pour la raison nommée ────────────────────────────────────────────────────
const noeud = (w, nom) => { const n = w.nodes.find((x) => x.name === nom); if (!n) throw new Error(`nœud absent : ${nom}`); return n }
const remplacer = (w, nom, de, vers) => { const n = noeud(w, nom); const js = n.parameters.jsCode; if (!js.includes(de)) throw new Error(`motif absent dans ${nom} : ${de.slice(0, 40)}`); n.parameters.jsCode = js.split(de).join(vers) }
const lien = (vers) => ({ node: vers, type: 'main', index: 0 })
const MUTANTS = [
  ['lib-dedoublonner', 'porte « simulation » retirée (p5:318)', (w) => { w.connections['Entrée conforme ?'].main[0] = [lien('Calculer la clé')]; w.nodes = w.nodes.filter((n) => n.name !== 'Porte simulation'); delete w.connections['Porte simulation'] }, /^C3 |^S4 /],
  ['lib-journaliser', 'porte inversée (la logique sur la sortie « faux »)', (w) => { w.connections['Porte simulation'].main = [[lien(ARRET)], [lien('Préparer les lignes')]] }, /^C1 |^C3 /],
  ['lib-alerter', 'sortie « faux » de la porte branchée sur la logique', (w) => { w.connections['Porte simulation'].main[1] = [lien('Regrouper et rédiger')] }, /^C3 /],
  ['lib-battement', 'une écriture HTTP ajoutée après la logique', (w) => { w.nodes.push({ id: 'h', name: 'Écrire le battement', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [0, 0], credentials: { supabaseApi: { id: 'IdentifiantFictif01', name: 'Supabase account' } }, parameters: { method: 'POST', url: 'https://exemple.invalid/rest/v1/battements' } }); w.connections['Battre ou contrôler'].main[0].push(lien('Écrire le battement')) }, /^S2 /],
  ['lib-disjoncteur', 'contrat d’entrée contourné', (w) => { w.connections['Appelé par un parent'].main = [[lien('Porte simulation')]] }, /^C2 |^S4 /],
  ['lib-dedoublonner', 'contrat d’entrée qui accepte les champs en trop (corps du gabarit affaibli)', (w) => remplacer(w, "Contrat d'entrée", "if (s.additionalProperties === false)", 'if (false)'), /^C2 .*champ|^S5 /],
  ['lib-alerter', 'contrat d’entrée sans la garde des adresses (tête : sans_contact ôté)', (w) => remplacer(w, "Contrat d'entrée", '"sans_contact":true,', ''), /^C2 .*(adresse|téléphone)/],
  ['lib-journaliser', 'sortie « non conforme » branchée sur la porte', (w) => { w.connections['Entrée conforme ?'].main[1] = [lien('Porte simulation')] }, /^C2 /],
  ['lib-battement', 'contrat de sortie qui rend « ok » une entrée rejetée', (w) => remplacer(w, 'Contrat de sortie', "const statut = rejete ? 'rejete' :", "const statut = rejete ? 'ok' :"), /^C2 |^S5 /],
  ['lib-dedoublonner', 'clé sans organisation (fuite entre clients)', (w) => remplacer(w, 'Calculer la clé', '[e.organisation_id, d.type, d.objet_id, d.etape]', '[d.type, d.objet_id, d.etape]'), /^D4 /],
  ['lib-dedoublonner', 'clé non condensée au-delà de 80 caractères', (w) => remplacer(w, 'Calculer la clé', 'brute.length <= MAX ? brute :', 'true ? brute :'), /^D3 /],
  ['lib-dedoublonner', 'clés connues ignorées (le rejeu double)', (w) => remplacer(w, 'Calculer la clé', 'connues.has(cle) || ', ''), /^D1 /],
  ['lib-dedoublonner', 'SHA-256 faussé', (w) => remplacer(w, 'Calculer la clé', 'r(e, 6) ^ r(e, 11) ^ r(e, 25)', 'r(e, 6) ^ r(e, 11) ^ r(e, 24)'), /^S6 /],
  ['lib-journaliser', 'une ligne perdue', (w) => remplacer(w, 'Préparer les lignes', 'journal: lignes, erreurs: avis', 'journal: lignes.slice(0, -1), erreurs: avis'), /^J1 /],
  ['lib-journaliser', 'coût gardé sans source de tarif', (w) => remplacer(w, 'Préparer les lignes', 'sansSource || typeof x.cout_eur', 'typeof x.cout_eur'), /^J2 /],
  ['lib-alerter', 'fenêtre de 5 min ôtée', (w) => remplacer(w, 'Regrouper et rédiger', 'const FENETRE = 5 * 60 * 1000;', 'const FENETRE = 0;'), /^A1 /],
  ['lib-alerter', 'lien d’exécution non vérifié', (w) => remplacer(w, 'Regrouper et rédiger', "typeof d.lien_execution === 'string' && LIEN.test(d.lien_execution)", "typeof d.lien_execution === 'string'"), /^A3 /],
  ['lib-alerter', 'nom de workflow libre dans le texte', (w) => remplacer(w, 'Regrouper et rédiger', "workflow: NOM.test(d.workflow) ? d.workflow : 'workflow hors liste'", 'workflow: d.workflow'), /^A3 /],
  ['lib-erreur-commune', 'masquage ôté', (w) => remplacer(w, 'Diagnostic', 'message_masque: masquer(brut)', 'message_masque: brut'), /^E2 /],
  ['lib-erreur-commune', 'catégorie « quota » ôtée', (w) => remplacer(w, 'Diagnostic', "['quota', ", "['execution', "), /^E1 /],
  ['lib-erreur-commune', 'SIMULATION à faux', (w) => remplacer(w, 'Diagnostic', 'const SIMULATION = true;', 'const SIMULATION = false;'), /^E4 /],
  ['lib-erreur-commune', 'compteur du disjoncteur oublié', (w) => remplacer(w, 'Effets prévus', 'if (agent) effets.push', 'if (false) effets.push'), /^E4 /],
  ['lib-erreur-commune', 'alerte prévue hors du contrat de lib-alerter', (w) => remplacer(w, 'Effets prévus', "destinataire_role: 'benj' }", "destinataire_role: 'equipe' }"), /^E5 /],
  ['lib-disjoncteur', 'seuil franchi d’un cran trop tard (> au lieu de >=)', (w) => remplacer(w, 'Compter les échecs', 'n >= seuil', 'n > seuil'), /^K1 /],
  ['lib-disjoncteur', 'un succès ne remet pas le compteur à zéro', (w) => remplacer(w, 'Compter les échecs', "d.issue === 'succes' ? 0 :", "d.issue === 'succes' ? avant.echecs_consecutifs :"), /^K2 /],
  ['lib-disjoncteur', 'un succès referme le disjoncteur ouvert', (w) => remplacer(w, 'Compter les échecs', "avant.etat === 'ouvert' || ", ''), /^K3 /],
  ['lib-disjoncteur', 'disjoncteur commun à toutes les organisations', (w) => remplacer(w, 'Compter les échecs', "const k = e.organisation_id + '|' + d.agent;", 'const k = d.agent;'), /^K4 /],
  ['lib-battement', 'silence de 24 h au lieu de 26 h', (w) => remplacer(w, 'Battre ou contrôler', ': 26) * HEURE', ': 24) * HEURE'), /^B2 /],
  ['lib-battement', 'alerte déjà levée ignorée (une alerte par heure)', (w) => remplacer(w, 'Battre ou contrôler', "(!isNaN(levee) && (isNaN(dernier) || levee >= dernier)) || ", ''), /^B3 /],
  ['lib-alerter', 'workflow activé', (w) => { w.active = true }, /^S1 /],
  ['lib-battement', 'workflow d’erreur retiré', (w) => { delete w.settings.errorWorkflow }, /^S3 .*workflow d'erreur/],
  ['lib-journaliser', 'appelable par tout workflow', (w) => { w.settings.callerPolicy = 'any' }, /^S3 .*politique/],
  ['lib-erreur-commune', 'fuseau New York', (w) => { w.settings.timezone = 'America/New_York' }, /^S3 .*fuseau/],
  ['lib-disjoncteur', 'étiquette de couche ôtée', (w) => { w.tags = (w.tags ?? []).filter((t) => !String(t.name ?? t).startsWith('couche-')) }, /^S7 /],
  ['lib-alerter', 'essai n8n falsifié (sortie retouchée après coup)', null, /^N1 /],
]

// ─── Lancement ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const lire = (f) => JSON.parse(readFileSync(f, 'utf8'))
const W = {}
for (const n of LIBS) { const f = path.join(DOSSIER, `${n}.workflow.json`); if (existsSync(f)) { const x = lire(f); W[n] = x.workflow && Array.isArray(x.workflow.nodes) ? x.workflow : x } }
const fEssais = path.join(DOSSIER, 'essais-n8n.json')
const essais = existsSync(fEssais) ? lire(fEssais) : []
let echec = 0
const base = juger(W, essais)
console.log(`${base.length ? '✗' : '✓'} socle lib-* (${Object.keys(W).length} export(s) sur ${LIBS.length}, ${essais.length} essai(s) n8n rejoué(s)) : ${base.length ? base.length + ' manquement(s)' : 'S1 à S7, C1 à C4, D, J, A, E, K, B et N tenus'}`)
for (const m of base) console.log(`    ✗ ${m}`)
if (base.length) echec++
if (!essais.length) { console.log('    ✗ N0 aucun essai n8n (essais-n8n.json) : la preuve sur données épinglées manque'); echec++ }
if (!base.length) {
  let verts = 0
  for (const [lib, titre, f, attendu] of MUTANTS) {
    const Wm = copie(W)
    let es = copie(essais), e
    try {
      if (f) f(Wm[lib], Wm)
      else { const x = es.find((y) => y.workflow === lib && !y.erreur); if (!x) throw new Error(`aucun essai réussi de ${lib}`); x.sorties[0].statut = x.sorties[0].statut === 'ok' ? 'rien_a_faire' : 'ok' }
      e = juger(Wm, es)
    } catch (err) { e = []; console.log(`  ✗ mutant « ${titre} » inapplicable : ${err.message}`) }
    const bon = e.filter((m) => attendu.test(m))
    console.log(`  ${bon.length ? '✓' : '✗'} mutant « ${titre} » (${lib}) ${bon.length ? 'fait rougir le juge' : 'NE FAIT PAS rougir le juge pour sa raison'}\n      → ${(bon[0] ?? e[0] ?? 'aucun manquement').slice(0, 200)}`)
    if (!bon.length) verts++
  }
  console.log(`lib-socle-n8n-qa : ${MUTANTS.length} mutants, ${MUTANTS.length - verts} rouges`)
  if (verts) { console.log(`  ✗ ${verts} mutant(s) laissent le juge vert`); echec++ }
}
if (echec) { console.log('ÉCHEC'); process.exit(1) }
console.log('OK')
