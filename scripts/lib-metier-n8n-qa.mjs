// JUGE HORS LIGNE de la chaîne « de la capture à la décision » (tâche 035-004, prompt 5). Aucun réseau, aucune base, aucun modèle,
// aucune donnée réelle. Il lit les exports (le JSON rendu par le MCP `get_workflow_details`) de lib-capturer-lead, lib-qualifier-lead,
// lib-decider et du banc lib-banc-metier dans .orchestre/preuves/035-004/, et :
//   S  — leur STRUCTURE : inactifs ; aucun identifiant ni nœud de lecture, d'écriture ou d'envoi (mode A) ; réglages (workflow d'erreur
//        = lib-erreur-commune, Europe/Paris, délai, appelants = le banc seul) ; squelette du socle 035-003 ; gabarit « Contrat » de 035-003
//        à l'identique (mêmes empreintes) ; SHA-256 écrit à la main égal à node:crypto ; étiquettes ; le banc n'appelle que ces trois-là.
//   C  — le gabarit « Contrat » REJOUÉ (node:vm, en suivant les connexions) : hors contrat, rien ; hors simulation, l'arrêt.
//   L  — lib-capturer-lead : sans contact, rejet ; un doublon est ignoré ; aucune URL de prospect ne passe ; le contact n'est JAMAIS lu
//        (colonnes de la lecture prévue ⊆ celles que 0189 accorde à n8n_lecture, plus les deux colonnes à naître) ; isolation ; lot borné.
//   Q  — lib-qualifier-lead : doublon sur l'empreinte (question 27), jamais entre deux organisations ; critère discriminant refusé ; rien
//        de deviné ; un résultat hors schéma ne change aucune note.
//   P  — lib-decider : la COPIE FIGÉE des listes du pilote est égale au code (lib/pilote/regles.ts, lib/plans.ts, chargés pour de vrai) ;
//        la liste du code est INCLUSE dans la liste « jamais en automatique » du kit, avec les gestes de p5:226 (Amendement B1) ; aucun
//        de ces gestes n'atteint le pilote, même réglé en automatique (p5:315) ; Studio jamais au niveau 3 ; mode A : 2 au plus ;
//        plafond du jour ; escalade ; montant calculé par le code ; idempotence ; lecture absente = refus.
//   B  — le banc rejoué hors ligne (les Execute Sub-workflow rejouent les exports enfants) : même bilan que dans n8n, zéro défaut.
//   N  — les essais réels dans n8n (`test_workflow`, données épinglées) : rejoués ici, même sortie.
// Puis il prouve qu'il sait rougir : chaque MUTANT (une liste du pilote amputée, un contact lu, un doublon laissé passer, un geste
// « jamais en automatique » décidé en automatique…) doit le faire échouer pour sa raison.
//   node scripts/lib-metier-n8n-qa.mjs [dossier des exports]
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.resolve(RACINE, process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '.orchestre/preuves/035-004')
const ENFANTS = ['lib-capturer-lead', 'lib-qualifier-lead', 'lib-decider']
const BANC = 'lib-banc-metier'
const ID_ERREUR = 'yekMM9ewk03F9y2q' // lib-erreur-commune (035-003, .orchestre/preuves/035-003/lib-erreur-commune.workflow.json)
const COUCHES = { 'lib-capturer-lead': 'capture', 'lib-qualifier-lead': 'qualification', 'lib-decider': 'decision', [BANC]: 'essai' }
const LOGIQUE = { 'lib-capturer-lead': 'Capturer sans lire le contact', 'lib-qualifier-lead': 'Noter selon la grille', 'lib-decider': 'Décider' }
const T = { trigger: 'n8n-nodes-base.executeWorkflowTrigger', horloge: 'n8n-nodes-base.scheduleTrigger', code: 'n8n-nodes-base.code', si: 'n8n-nodes-base.if',
  arret: 'n8n-nodes-base.stopAndError', note: 'n8n-nodes-base.stickyNote', appel: 'n8n-nodes-base.executeWorkflow' }
const ARRET = 'Hors simulation : non branché'
// Le gabarit « Contrat » de 035-003 (scripts/lib-socle-n8n-qa.mjs, mêmes repères, mêmes empreintes) : réutilisé, jamais réécrit.
const REPERE_ENTREE = "// ─── Gabarit « Contrat d'entrée » 035-003 : au-dessus, CONTRAT et SCHEMA seulement ; en dessous, le corps commun (empreinte tenue par le juge) ───"
const REPERE_SORTIE = '// ─── Gabarit « Contrat de sortie » 035-003 : au-dessus, CONTRAT seulement ; en dessous, le corps commun (empreinte tenue par le juge) ───'
const EMPREINTE_ENTREE = '20f6ff371969130e45b37ea58466baaa9b4581f7dbe145863a2f4a1a57713899'
const EMPREINTE_SORTIE = '8f0f37c68d78f3154204655b3f5343889c5c74733c8b852f27e34bc517394a70'
const CLES_SORTIE = ['contrat', 'statut', 'cle_idempotence', 'simulation', 'resultat', 'effets_prevus', 'effets_faits', 'journal', 'erreurs']
const sha = (t) => createHash('sha256').update(String(t), 'utf8').digest('hex')
const copie = (o) => JSON.parse(JSON.stringify(o))

// ─── Ce que dit le VRAI code (chargé, pas recopié) ──────────────────────────────────────────────────────────────────────────────
function lireCode() {
  // Une URL file:// et non un chemin : sous Windows, import('C:\\…') est refusé par le chargeur ESM (vu le 03/11 au PC).
  const prog = `const r = await import(${JSON.stringify(pathToFileURL(path.join(RACINE, 'lib/pilote/regles.ts')).href)});
const p = await import(${JSON.stringify(pathToFileURL(path.join(RACINE, 'lib/plans.ts')).href)});
process.stdout.write(JSON.stringify({ TYPES_PILOTE: r.TYPES_PILOTE, OUTIL_TYPE: r.OUTIL_TYPE, OUTILS_EXECUTABLES_PILOTE: r.OUTILS_EXECUTABLES_PILOTE,
  OUTILS_JAMAIS_AUTO: r.OUTILS_JAMAIS_AUTO, PLAFOND_AUTO_JOUR: r.PLAFOND_AUTO_JOUR, DELAI_ANNULATION_MIN: r.DELAI_ANNULATION_MIN,
  PLANS: Object.keys(p.PLANS), PLANS_PILOTE: Object.keys(p.PLANS).filter((x) => p.peut(x, 'assistant.pilote')).sort() }));`
  const code = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', './scripts/ts-loader.mjs', '--input-type=module', '-e', prog], { cwd: RACINE, encoding: 'utf8' }))
  const regles = readFileSync(path.join(RACINE, 'lib/pilote/regles.ts'), 'utf8')
  code.SOURCE_PRIX = (/const SOURCE_OK = \/(.+)\/i\n/.exec(regles) || [])[1] ?? null
  // Les colonnes de leads que 0189 accorde au rôle de lecture de n8n (supabase/migrations/0189_role_lecture_n8n.sql).
  const m0189 = readFileSync(path.join(RACINE, 'supabase/migrations/0189_role_lecture_n8n.sql'), 'utf8')
  code.COLONNES_LEADS_0189 = ((/grant select \(([^)]+)\) on public\.leads to n8n_lecture/.exec(m0189) || [])[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return code
}
// Les gestes de p5:226 que le juge exige lui-même dans la liste du kit (Amendement B1, premiere-reponse.md:1016-1020), écrits ici sans
// les lire dans l'export : envoyer un devis (question 29), encaisser, déclarer, supprimer des données, passer ou prendre un appel.
const B1_EXIGES = ['envoyer_devis', 'envoi_devis', 'encaisser', 'declarer_urssaf', 'declarer_impots', 'supprimer_donnees', 'passer_appel', 'prendre_appel']
// Les colonnes à naître au « go » (question 27 : empreinte calculée en base ; réclamation a_traiter → en_cours, PR § 5.5).
const COLONNES_A_NAITRE = ['contact_empreinte', 'etat_capture']
const NOMS_DE_CONTACT = /(^|_)(contact|email|e_mail|courriel|mail|telephone|tel|phone|mobile|nom|prenom|nom_prospect|adresse|message|contenu|texte)($|_)/
const DISCRIMINANTS_EXIGES = ['age', 'sexe', 'genre', 'nationalite', 'religion', 'handicap', 'sante', 'orientation_sexuelle', 'nom', 'prenom', 'code_postal',
  'origine_ethnique', 'situation_familiale', 'grossesse', 'lieu_de_residence', 'patronyme', 'langue', 'age_client']

// ─── L'exécuteur hors ligne : les nœuds Code de l'export, tels quels, dans node:vm ───────────────────────────────────────────────
// Il ne connaît que les types de la chaîne (déclencheurs, Code, If, Stop and Error, et pour le banc Execute Sub-workflow, qui rejoue
// l'export enfant désigné par son identifiant) : tout autre nœud atteint arrête le rejeu en erreur, ce qui rougit.
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
    ;((cond.operator?.operation === 'false' ? v === false : v === true) ? vrai : faux).push(it)
  }
  return [vrai, faux]
}
function executer(wf, entrees, W = {}, profondeur = 0) {
  const parNom = new Map(wf.nodes.map((n) => [n.name, n]))
  const racines = wf.nodes.filter((n) => n.type === T.trigger || n.type === T.horloge)
  const visites = [], sorties = [], par = {}
  if (racines.length !== 1) return { sorties, visites, par, erreur: `${racines.length} déclencheur(s)` }
  const file = [[racines[0].name, entrees.map((j) => ({ json: copie(j) }))]]
  for (let pas = 0; file.length; pas++) {
    if (pas > 400) return { sorties, visites, par, erreur: 'boucle' }
    const [nom, items] = file.shift()
    const n = parNom.get(nom)
    if (!n) return { sorties, visites, par, erreur: `nœud absent : ${nom}` }
    visites.push(nom)
    let outs
    try {
      if (n.type === T.trigger || n.type === T.horloge) outs = [items]
      else if (n.type === T.code) outs = [lancerCode(n.parameters?.jsCode ?? '', items)]
      else if (n.type === T.si) outs = evaluerSi(n, items)
      else if (n.type === T.arret) return { sorties, visites, par, erreur: String(n.parameters?.errorMessage ?? 'Stop and Error') }
      else if (n.type === T.appel && profondeur === 0) {
        const id = n.parameters?.workflowId?.value
        const enfant = Object.values(W).find((w) => w && w.id === id)
        if (!enfant || n.parameters?.source !== 'database') throw new Error(`sous-workflow ${id} introuvable ou hors source database`)
        if (enfant.settings?.callerPolicy !== 'workflowsFromAList' || !String(enfant.settings?.callerIds ?? '').split(',').includes(wf.id)) throw new Error(`${enfant.name} n'autorise pas ${wf.name} à l'appeler`)
        const r = executer(enfant, items.map((i) => i.json), W, 1)
        if (r.erreur) throw new Error(`${enfant.name} : ${r.erreur}`)
        outs = [r.sorties.map((json) => ({ json }))]
      } else return { sorties, visites, par, erreur: `nœud non rejouable hors ligne atteint : ${nom} (${n.type})` }
    } catch (err) { return { sorties, visites, par, erreur: `${nom} : ${err.message}` } }
    par[nom] = (par[nom] ?? []).concat(outs[0].map((i) => i.json))
    if (nom === 'Contrat de sortie' || nom === 'Bilan du banc') sorties.push(...outs[0].map((i) => i.json))
    ;(wf.connections?.[nom]?.main ?? []).forEach((liste, i) => { const it = outs[i] ?? []; if (it.length) for (const l of liste ?? []) if (l?.node) file.push([l.node, it]) })
  }
  return { sorties, visites, par, erreur: null }
}
const codeDe = (w, nom) => String(w.nodes.find((n) => n.name === nom)?.parameters?.jsCode ?? '')

// ─── Les cas fictifs (« Exemple. », organisations 00000000-0000-4000-8000-…, aucune adresse réelle) ─────────────────────────────
const ORG1 = '00000000-0000-4000-8000-000000000001', ORG2 = '00000000-0000-4000-8000-000000000002'
const ID = (i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const EMP = (x) => sha('Exemple.|' + x)
const env = (nom, donnees, config, plus = {}) => ({ contrat: `${nom}@1`, organisation_id: ORG1, simulation: true, cle_idempotence: `exemple:${nom.slice(4)}:juge`,
  trace: { execution_parent: 'Exemple. juge', declencheur: 'juge', tentative: 0 }, config, donnees, ...plus })
const ligne = (i, plus = {}) => ({ id: ID(i), artisan_id: ORG1, statut: 'nouveau', canal: 'formulaire', origine: null, urgence: 'normal', type_chantier: 'Exemple. Cuisine',
  created_at: `2026-11-02T0${i % 10}:00:00.000Z`, contact_empreinte: EMP(i), etat_capture: 'a_traiter', ...plus })
const GRILLE = [{ critere: 'urgence=urgent', poids: 40 }, { critere: 'canal=formulaire', poids: 30 }, { critere: 'photo_jointe', poids: 20 }, { critere: 'surface_m2>=20', poids: 10 }]
const CQ = (plus = {}) => ({ grille: GRILLE, seuils: { haute: 60, normale: 30 }, delais_cibles_min: { haute: 15, normale: 60, a_revoir: 240 }, empreintes_connues: [], ...plus })
const q = (i, emp, champs, conf = CQ(), plus = {}) => env('lib-qualifier-lead', { lead_id: ID(i), evenement_id: ID(i + 500), empreinte_contact: emp, champs }, conf, plus)
const TOUT = (code) => ({ autonomie: { niveau_max: 3, niveau_defaut: 2 }, plan: 'signature', pilote: { drapeau: true, actif: true, types: Object.fromEntries(code.TYPES_PILOTE.map((t) => [t, true])) }, parties_depuis_24h: 0 })
const d = (i, constat, conf) => env('lib-decider', { objet_type: 'devis', objet_id: ID(i), constat: { escalade: false, ...constat } }, conf)
const NOMINAL = {
  'lib-capturer-lead': () => env('lib-capturer-lead', { lignes: [ligne(1)] }, { source: 'leads', lot_max: 10 }),
  'lib-qualifier-lead': () => q(1, EMP('a'), { urgence: 'urgent', canal: 'formulaire' }),
  'lib-decider': (code) => d(1, { outil: 'relancer_devis', etape: 'palier-1' }, TOUT(code)),
}
const HORS_CONTRAT = [
  ['trace absente', (e) => { delete e.trace }],
  ['champ en trop dans l’enveloppe', (e) => { e.pirate = 1 }],
  ['organisation_id hors forme', (e) => { e.organisation_id = 'Exemple. pas un uuid' }],
  ['simulation en texte', (e) => { e.simulation = 'true' }],
  ['contrat d’un autre gabarit', (e) => { e.contrat = 'lib-relancer@1' }],
  ['champ hors contrat dans donnees', (e) => { e.donnees.inconnu = 1 }],
  ['adresse e-mail dans la configuration', (e) => { e.config.note = 'Exemple. gerant@exemple.invalid' }],
]

// ─── Les épreuves ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function juger(W, essais, code) {
  const e = []
  const ko = (id, cond, m) => { if (!cond) e.push(`${id} ${m}`) }
  for (const n of [...ENFANTS, BANC]) ko('S1', !!W[n], `${n} : export absent`)
  if (e.length) return e
  const banc = W[BANC]
  const ids = Object.fromEntries(ENFANTS.map((n) => [n, W[n].id]))
  // S1 à S4, S7 : structure, réglages, squelette, étiquettes
  for (const n of [...ENFANTS, BANC]) {
    const w = W[n], s = w.settings ?? {}
    ko('S1', w.active === false && !w.activeVersionId, `${n} : doit rester inactif, sans version publiée`)
    const permis = n === BANC ? [T.horloge, T.code, T.appel, T.note] : [T.trigger, T.code, T.si, T.arret, T.note]
    for (const x of w.nodes) {
      ko('S2', permis.includes(x.type), `${n} : nœud ${x.name} de type ${x.type} hors de la chaîne (mode A : ni lecture, ni écriture, ni envoi)`)
      ko('S2', !x.credentials || !Object.keys(x.credentials).length, `${n} : nœud ${x.name} porteur d'un identifiant`)
    }
    ko('S3', s.timezone === 'Europe/Paris', `${n} : fuseau ${s.timezone}`)
    ko('S3', Number.isInteger(s.executionTimeout) && s.executionTimeout >= 1 && s.executionTimeout <= 3600, `${n} : délai maximal absent ou hors borne`)
    ko('S3', s.errorWorkflow === ID_ERREUR, `${n} : workflow d'erreur ${s.errorWorkflow ?? 'absent'} au lieu de lib-erreur-commune (${ID_ERREUR})`)
    ko('S3', s.saveDataSuccessExecution === 'none', `${n} : succès sauvés`)
    const tags = (w.tags ?? []).map((t) => t.name)
    ko('S7', tags.includes('lib') && tags.includes(`couche-${COUCHES[n]}`), `${n} : étiquettes lib et couche-${COUCHES[n]} attendues`)
    if (n !== BANC) {
      ko('S3', s.callerPolicy === 'workflowsFromAList' && String(s.callerIds ?? '') === banc.id, `${n} : politique d'appel ${s.callerPolicy} (${s.callerIds ?? '—'}) : le banc seul (${banc.id}) attendu`)
      const L = LOGIQUE[n]
      const attendu = new Set(["Appelé par un parent[main:0]→Contrat d'entrée", "Contrat d'entrée[main:0]→Entrée conforme ?", 'Entrée conforme ?[main:0]→Porte simulation',
        'Entrée conforme ?[main:1]→Contrat de sortie', `Porte simulation[main:0]→${L}`, `Porte simulation[main:1]→${ARRET}`, `${L}[main:0]→Contrat de sortie`])
      const vu = new Set()
      for (const [src, c] of Object.entries(w.connections ?? {})) (c.main ?? []).forEach((l, i) => (l ?? []).forEach((x) => vu.add(`${src}[main:${i}]→${x.node}`)))
      const trop = [...vu].filter((x) => !attendu.has(x)), manque = [...attendu].filter((x) => !vu.has(x))
      ko('S4', !trop.length && !manque.length, `${n} : squelette différent : ${trop.map((x) => x + ' en trop').concat(manque.map((x) => x + ' manquant')).join(', ').slice(0, 220)}`)
      const porte = w.nodes.find((x) => x.name === 'Porte simulation')
      ko('S4', porte && /porte: simulation/.test(porte.notes ?? ''), `${n} : porte « simulation » non déclarée`)
      // S5 : le gabarit « Contrat » de 035-003, à l'identique
      const ce = codeDe(w, "Contrat d'entrée"), cs = codeDe(w, 'Contrat de sortie')
      const [teteE, corpsE] = ce.split(REPERE_ENTREE), [teteS, corpsS] = cs.split(REPERE_SORTIE)
      ko('S5', corpsE !== undefined && sha(corpsE) === EMPREINTE_ENTREE, `${n} : corps du « Contrat d'entrée » différent du gabarit 035-003 (empreinte ${corpsE === undefined ? 'sans repère' : sha(corpsE).slice(0, 12)}…)`)
      ko('S5', corpsS !== undefined && sha(corpsS) === EMPREINTE_SORTIE, `${n} : corps du « Contrat de sortie » différent du gabarit 035-003 (empreinte ${corpsS === undefined ? 'sans repère' : sha(corpsS).slice(0, 12)}…)`)
      ko('S5', teteE?.includes(`const CONTRAT = '${n}@1';`) && /"sans_contact":true/.test(teteE ?? '') && teteS?.includes(`const CONTRAT = '${n}@1';`), `${n} : tête du contrat (CONTRAT ${n}@1, sans_contact) attendue`)
    } else {
      ko('S3', s.callerPolicy === 'none', `${n} : le banc n'est appelable par personne (none attendu, ${s.callerPolicy})`)
      const appels = w.nodes.filter((x) => x.type === T.appel)
      for (const a of appels) {
        ko('S3', a.parameters?.source === 'database' && a.parameters?.workflowId?.mode === 'id' && Object.values(ids).includes(a.parameters?.workflowId?.value), `${n} : ${a.name} doit appeler un des trois gabarits par identifiant fixe, source database`)
      }
      for (const [nom, id] of Object.entries(ids)) ko('S3', appels.some((a) => a.parameters?.workflowId?.value === id), `${n} : ${nom} jamais appelé par le banc`)
    }
  }
  // S6 : le SHA-256 écrit à la main (qualifier, décideur) donne celui de node:crypto
  for (const n of ['lib-qualifier-lead', 'lib-decider']) {
    const js = codeDe(W[n], LOGIQUE[n])
    const f = /function sha256\(texte\) \{[\s\S]*?\n\}\n/.exec(js)
    let ok = false
    try { const h = vm.runInNewContext(`${f[0]}; [sha256('abc'), sha256('Exemple. clé d’essai é€𝄞'), sha256('x'.repeat(200))]`); ok = h[0] === sha('abc') && h[1] === sha('Exemple. clé d’essai é€𝄞') && h[2] === sha('x'.repeat(200)) } catch { ok = false }
    ko('S6', ok, `${n} : le SHA-256 du nœud Code ne donne pas celui de node:crypto`)
  }
  if (e.length) return e

  const run = (n, entrees) => executer(W[n], entrees, W)
  const un = (n, x) => { const r = run(n, [x]); return { ...r, s: r.sorties[0] } }
  // C : le gabarit « Contrat » rejoué
  for (const n of ENFANTS) {
    const r = un(n, NOMINAL[n](code))
    ko('C1', !r.erreur && r.s?.statut === 'ok' && CLES_SORTIE.every((k) => k in r.s) && Object.keys(r.s).length === 9 && r.s.effets_faits.length === 0 && r.s.simulation === true,
      `${n} : l'entrée nominale ne rend pas une sortie conforme (${r.erreur ?? r.s?.statut} ${JSON.stringify(r.s?.erreurs ?? [])})`)
    for (const [titre, f] of HORS_CONTRAT) {
      const x = NOMINAL[n](code); f(x)
      const h = un(n, x)
      ko('C2', !h.erreur && h.s?.statut === 'rejete' && !h.visites.includes(LOGIQUE[n]) && h.s.effets_prevus.length === 0, `${n} : entrée hors contrat (${titre}) : statut ${h.s?.statut ?? h.erreur}, la logique ${h.visites.includes(LOGIQUE[n]) ? 'a tourné' : 'n’a pas tourné'}`)
    }
    const hs = un(n, { ...NOMINAL[n](code), simulation: false })
    ko('C3', hs.erreur && hs.erreur.startsWith('Hors simulation') && !hs.visites.includes(LOGIQUE[n]), `${n} : hors simulation, la chaîne doit s'arrêter avant tout effet (${hs.erreur ?? 'aucun arrêt'})`)
  }

  // L : lib-capturer-lead
  {
    const C = 'lib-capturer-lead', w = W[C], js = codeDe(w, LOGIQUE[C])
    const cap = (lignes, conf = { source: 'leads', lot_max: 10 }) => un(C, env(C, { lignes }, conf))
    const r1 = cap([ligne(1), ligne(2, { contact_empreinte: null })])
    const ids1 = (r1.s?.resultat?.evenements ?? []).map((x) => x.id)
    ko('L1', ids1.includes(ID(1)) && !ids1.includes(ID(2)) && !JSON.stringify(r1.s?.effets_prevus ?? []).includes(ID(2)) && (r1.s?.resultat?.ecartes ?? []).some((x) => x.id === ID(2) && x.motif === 'sans_contact'),
      `${C} : une demande sans moyen de contact doit être écartée, jamais réclamée (${JSON.stringify(ids1)})`)
    const r2 = cap([ligne(3), ligne(3), ligne(4)])
    const ev2 = (r2.s?.resultat?.evenements ?? []).map((x) => x.id)
    const rejeu = cap([ligne(3, { etat_capture: 'en_cours' }), ligne(4, { etat_capture: 'en_cours' })])
    ko('L2', ev2.length === 2 && new Set(ev2).size === 2 && (rejeu.s?.resultat?.evenements ?? []).length === 0 && (rejeu.s?.effets_prevus ?? []).every((x) => x.effet !== 'reclamer'),
      `${C} : un doublon est ignoré et le rejeu d'un lot réclamé ne réclame rien (lot : ${ev2.length}, rejeu : ${(rejeu.s?.resultat?.evenements ?? []).length})`)
    const URL = 'Exemple. voir https://exemple.invalid/x?jeton=abc', URL2 = 'Exemple. www.exemple.invalid'
    const r3 = cap([ligne(5, { type_chantier: URL }), ligne(6, { origine: URL2 })])
    const tout3 = JSON.stringify(r3.s ?? {})
    ko('L3', r3.s?.statut === 'ok' && !tout3.includes('exemple.invalid') && !w.nodes.some((x) => /httpRequest|webhook/i.test(x.type)), `${C} : aucune URL fournie par un prospect ne doit passer ni être appelée`)
    // Le contact jamais lu : (a) une colonne de contact dans la lecture fait rejeter l'enveloppe ; (b) la lecture prévue ne demande que
    // des colonnes permises (0189) ou à naître, sans nom de contact ; (c) aucun champ de contact ne sort.
    const r4 = cap([{ ...ligne(7), contact: 'Exemple. client@exemple.invalid' }])
    const r4b = cap([{ ...ligne(8), nom_prospect: 'Exemple. Client' }])
    ko('L4', r4.s?.statut === 'rejete' && r4b.s?.statut === 'rejete', `${C} : une ligne porteuse d'une colonne de contact doit faire rejeter l'entrée (${r4.s?.statut}, ${r4b.s?.statut})`)
    const lecture = (r1.s?.effets_prevus ?? []).find((x) => x.effet === 'lire_demandes')?.requete ?? ''
    const sel = (/select=([^&]+)/.exec(lecture) || [])[1]?.split(',') ?? []
    const permises = new Set([...code.COLONNES_LEADS_0189, ...COLONNES_A_NAITRE])
    ko('L4', code.COLONNES_LEADS_0189.length > 0 && sel.length > 0 && sel.every((c) => permises.has(c) && (c === 'contact_empreinte' || !NOMS_DE_CONTACT.test(c))),
      `${C} : la lecture prévue demande une colonne non permise par 0189 ou un contact (${sel.filter((c) => !permises.has(c) || (c !== 'contact_empreinte' && NOMS_DE_CONTACT.test(c))).join(', ') || 'aucune colonne'})`)
    ko('L4', lecture.includes('artisan_id=eq.' + ORG1) && /contact_empreinte=not\.is\.null/.test(lecture) && !/(^|[&?])(contact|email|telephone)=/.test(lecture), `${C} : la lecture prévue doit filtrer l'organisation et l'empreinte, jamais le contact`)
    const champsSortis = (r1.s?.resultat?.evenements ?? []).flatMap((x) => Object.keys(x.champs ?? {}))
    const lu = /CHAMPS = \[([^\]]*)\]/.exec(js)?.[1]?.split(',').map((x) => x.trim().replace(/['"]/g, '')) ?? []
    ko('L4', champsSortis.every((k) => !NOMS_DE_CONTACT.test(k)) && lu.length && lu.every((k) => !NOMS_DE_CONTACT.test(k)) && !/\bl\.(contact|email|telephone|nom_prospect|message)\b/.test(js),
      `${C} : la logique lit ou rend un champ de contact (${[...lu, ...champsSortis].filter((k) => NOMS_DE_CONTACT.test(k)).join(', ') || 'accès direct'})`)
    const r5 = cap([ligne(9), ligne(10, { artisan_id: ORG2 })])
    ko('L5', (r5.s?.resultat?.evenements ?? []).every((x) => x.id !== ID(10)) && !JSON.stringify(r5.s ?? {}).includes(ID(10)), `${C} : une ligne d'une autre organisation ne doit ni être capturée ni apparaître`)
    const r6 = cap([1, 2, 3, 4, 5].map((i) => ligne(20 + i)), { source: 'leads', lot_max: 2 })
    ko('L6', r6.s?.resultat?.evenements?.length === 2 && r6.s?.resultat?.restants === 3 && (r6.s?.effets_prevus ?? []).find((x) => x.effet === 'reclamer')?.ids?.length === 2,
      `${C} : le lot doit s'arrêter à lot_max (2) et laisser le reste au passage suivant (${r6.s?.resultat?.evenements?.length}, ${r6.s?.resultat?.restants})`)
    const r7 = un(C, env(C, {}, { source: 'demandes', lot_max: 10 }))
    ko('L7', r7.s?.statut === 'refuse' && (r7.s?.effets_prevus ?? []).length === 0, `${C} : la source demandes (sans organisation) doit être refusée`)
  }

  // Q : lib-qualifier-lead
  {
    const Qn = 'lib-qualifier-lead'
    const qs = (xs) => run(Qn, xs).sorties
    const s1 = qs([q(1, EMP('connu'), { urgence: 'urgent', canal: 'formulaire', photo_jointe: true, surface_m2: 30 }, CQ({ empreintes_connues: [{ empreinte: EMP('connu'), lead_id: ID(900) }] }))])[0]
    ko('Q1', s1?.resultat?.doublon === true && s1.resultat.doublon_de === ID(900) && s1.resultat.priorite === 'a_revoir', `${Qn} : même empreinte qu'une demande en base : doublon attendu (question 27)`)
    const s2 = qs([q(2, EMP('b'), { canal: 'formulaire' }), q(3, EMP('b'), { canal: 'formulaire' }), q(4, EMP('c'), { canal: 'formulaire' })])
    ko('Q2', s2[0]?.resultat?.doublon === false && s2[1]?.resultat?.doublon === true && s2[1].resultat.doublon_de === ID(2) && s2[2]?.resultat?.doublon === false, `${Qn} : deux demandes du même contact dans un lot : la seconde est un doublon, pas la troisième`)
    const s3 = qs([q(5, EMP('d'), { canal: 'formulaire' }), q(6, EMP('d'), { canal: 'formulaire' }, CQ(), { organisation_id: ORG2 })])
    ko('Q3', s3[1]?.resultat?.doublon === false, `${Qn} : la même empreinte dans une autre organisation n'est pas un doublon (isolation)`)
    const s4 = qs([q(7, null, { canal: 'formulaire' }), q(8, null, { canal: 'formulaire' })])
    ko('Q4', s4.every((x) => x?.resultat?.doublon === false), `${Qn} : sans empreinte, jamais un doublon deviné`)
    for (const champ of DISCRIMINANTS_EXIGES) {
      const s = qs([q(10, EMP('e'), { canal: 'formulaire' }, CQ({ grille: [...GRILLE, { critere: champ + '=x', poids: 10 }] }))])[0]
      ko('Q5', s?.statut === 'refuse' && s.effets_prevus.length === 0, `${Qn} : critère discriminant « ${champ} » accepté (${s?.statut})`)
    }
    const shl = qs([q(11, EMP('f'), { canal: 'formulaire' }, CQ({ grille: [{ critere: 'humeur=bonne', poids: 10 }] }))])[0]
    ko('Q5', shl?.statut === 'refuse', `${Qn} : critère hors de la liste fermée des champs accepté`)
    const s6 = qs([q(12, EMP('g'), { urgence: 'urgent', canal: 'formulaire', photo_jointe: true, surface_m2: 50, type_chantier: 'Exemple. Toiture' }), q(13, EMP('h'), { canal: 'formulaire' }), q(14, EMP('i'), { urgence: 'normal', canal: 'site', photo_jointe: false, surface_m2: 10 })])
    ko('Q6', s6[0]?.resultat?.note === 100 && s6[0].resultat.priorite === 'haute' && s6[0].resultat.delai_cible_min === 15 && s6[0].resultat.categorie === 'Exemple. Toiture',
      `${Qn} : grille complète et satisfaite : note 100, priorité haute, délai 15 attendus (${JSON.stringify(s6[0]?.resultat ?? {}).slice(0, 120)})`)
    ko('Q6', s6[1]?.resultat?.note === 30 && s6[1].resultat.priorite === 'a_revoir' && /inconnu : urgence, photo_jointe, surface_m2/.test(s6[1].resultat.raison) && s6[1].resultat.categorie === 'non renseignée',
      `${Qn} : champs absents : aucun point, « inconnu », à revoir, jamais deviné (${s6[1]?.resultat?.note}, ${s6[1]?.resultat?.priorite})`)
    ko('Q6', s6[2]?.resultat?.note === 0 && s6[2].resultat.priorite === 'a_revoir', `${Qn} : grille non satisfaite : note 0 attendue`)
    const s7 = qs([q(15, EMP('j'), { urgence: 'urgent' }, CQ({ grille: [{ critere: 'urgence=urgent', poids: 0 }] }))])[0]
    ko('Q7', s7?.statut === 'erreur' && s7.resultat === null && s7.effets_prevus.length === 0, `${Qn} : un résultat hors schéma (note impossible) ne doit changer aucune note (${s7?.statut}, ${s7?.effets_prevus?.length} effet(s))`)
    const s8 = qs([q(16, EMP('k'), { canal: 'formulaire', type_chantier: 'Exemple. 06 39 98 00 01' })])[0]
    ko('Q8', s8?.statut === 'rejete', `${Qn} : un téléphone dans les champs doit faire rejeter l'entrée`)
    const k1 = s6[0]?.effets_prevus?.[0]?.cle, k1b = qs([q(12, EMP('g'), { urgence: 'urgent' })])[0]?.effets_prevus?.[0]?.cle
    const k2 = qs([q(12, EMP('g'), { urgence: 'urgent' }, CQ(), { organisation_id: ORG2 })])[0]?.effets_prevus?.[0]?.cle
    ko('Q9', k1 && k1 === k1b && k1 !== k2 && k1.length <= 80, `${Qn} : clé d'idempotence stable au rejeu, propre à l'organisation, 80 caractères au plus`)
  }

  // P : lib-decider
  {
    const Dn = 'lib-decider', js = codeDe(W[Dn], LOGIQUE[Dn])
    let C = null, G = null
    try { C = JSON.parse(/const COPIE_PILOTE = (\{.*\});\n/.exec(js)[1]); G = JSON.parse(/const GESTES_P5_226 = (\[.*\]);\n/.exec(js)[1]) } catch { C = null }
    ko('P1', !!C && !!G, `${Dn} : copie figée des listes du pilote introuvable`)
    if (C) {
      for (const k of ['TYPES_PILOTE', 'OUTIL_TYPE', 'OUTILS_EXECUTABLES_PILOTE', 'OUTILS_JAMAIS_AUTO', 'PLAFOND_AUTO_JOUR', 'DELAI_ANNULATION_MIN', 'PLANS_PILOTE', 'SOURCE_PRIX']) {
        ko('P1', JSON.stringify(C[k]) === JSON.stringify(code[k]), `${Dn} : copie figée « ${k} » différente du code (${JSON.stringify(C[k]).slice(0, 80)} ≠ ${JSON.stringify(code[k]).slice(0, 80)})`)
      }
      const kit = new Set([...(C.OUTILS_JAMAIS_AUTO ?? []), ...(G ?? [])])
      const absents = [...code.OUTILS_JAMAIS_AUTO, ...B1_EXIGES].filter((x) => !kit.has(x))
      ko('P2', !absents.length, `${Dn} : la liste « jamais en automatique » du kit doit inclure celle du code et les gestes de p5:226 (manquent : ${absents.join(', ')})`)
    }
    const ds = (xs) => run(Dn, xs).sorties
    const res = (xs) => ds(xs).map((s) => s?.resultat ?? { action: 'erreur', motif: s?.statut })
    // P3 : chaque geste « jamais en automatique », réglé en automatique partout, niveau 3 permis, sous chaque offre qui a le pilote
    const gestes = [...new Set([...code.OUTILS_JAMAIS_AUTO, ...B1_EXIGES])]
    for (const plan of code.PLANS_PILOTE) {
      // Chaque geste porte des prix sourcés (« vos tarifs ») : la liste du kit est alors la SEULE garde en jeu (un devis aux prix sourcés
      // reste une carte : p5:226, question 29).
      const r = res(gestes.map((g, i) => d(100 + i, { outil: g, etape: 'geste', lignes: [{ prix_unitaire_ht_centimes: 4100, quantite: 2, source_prix: 'vos tarifs' }] }, { ...TOUT(code), plan })))
      const fautifs = gestes.filter((g, i) => r[i].action !== 'carte' || r[i].niveau === 3)
      ko('P3', !fautifs.length, `${Dn} : geste jamais automatique décidé en automatique (${plan}) : ${fautifs.join(', ')}`)
    }
    // P4 : Studio (et toute offre sans pilote) n'atteint jamais le niveau 3 ; P5 : Signature et Entreprise l'atteignent (le test n'est pas vide)
    const pilotables = Object.keys(code.OUTIL_TYPE)
    for (const plan of [...code.PLANS.filter((p) => !code.PLANS_PILOTE.includes(p)), null, 'inconnue']) {
      const r = res(pilotables.map((o, i) => d(200 + i, { outil: o, etape: 'x' }, { ...TOUT(code), plan })))
      ko('P4', r.every((x) => x.action !== 'pilote' && x.niveau !== 3), `${Dn} : l'offre ${plan} atteint le niveau 3 (${pilotables.filter((o, i) => r[i].action === 'pilote').join(', ')})`)
    }
    for (const plan of ['signature', 'entreprise']) {
      const r = res([d(300, { outil: 'relancer_devis', etape: 'palier-1' }, { ...TOUT(code), plan })])[0]
      ko('P5', r.action === 'pilote' && r.niveau === 3 && r.motif === 'pilote', `${Dn} : sous ${plan}, tout permis, la relance de devis doit atteindre le pilote (${r.action}, ${r.motif})`)
    }
    // P6 : mode A, niveau 2 au plus (question 1)
    const r6 = res(pilotables.map((o, i) => d(400 + i, { outil: o, etape: 'x' }, { ...TOUT(code), autonomie: { niveau_max: 2, niveau_defaut: 2 } })))
    ko('P6', r6.every((x) => x.action !== 'pilote' && x.niveau <= 2), `${Dn} : niveau_max 2 (mode A) : jamais le pilote`)
    // P7 : le plafond du jour, compté dans le lot ; un compte non lu vaut refus
    const r7 = res(Array.from({ length: 25 }, (_, i) => d(500 + i, { outil: 'relancer_devis', etape: 'palier-1' }, TOUT(code))))
    const r7b = res([d(530, { outil: 'relancer_devis', etape: 'palier-1' }, { ...TOUT(code), parties_depuis_24h: code.PLAFOND_AUTO_JOUR })])
    const { parties_depuis_24h, ...sansCompte } = TOUT(code)
    const r7c = res([d(531, { outil: 'relancer_devis', etape: 'palier-1' }, sansCompte)])
    ko('P7', r7.filter((x) => x.action === 'pilote').length === code.PLAFOND_AUTO_JOUR && r7b[0].action === 'carte' && r7c[0].action === 'carte',
      `${Dn} : plafond de ${code.PLAFOND_AUTO_JOUR} par jour : ${r7.filter((x) => x.action === 'pilote').length} pilote(s) sur 25, au plafond ${r7b[0].action}, sans compte ${r7c[0].action}`)
    // P8 : escalade (déclarée ou non lue) : jamais seul
    const r8 = res([d(600, { outil: 'relancer_devis', etape: 'p', escalade: true }, TOUT(code)), env(Dn, { objet_type: 'devis', objet_id: ID(601), constat: { outil: 'relancer_devis', etape: 'p' } }, TOUT(code))])
    ko('P8', r8.every((x) => x.action === 'carte' && x.motif === 'escalade'), `${Dn} : sujet d'escalade (ou non lu) : une carte attendue (${r8.map((x) => x.motif).join(', ')})`)
    // P9 : le montant, calculé par le code
    const L = [{ prix_unitaire_ht_centimes: 4100, quantite: 2, source_prix: 'vos tarifs' }, { prix_unitaire_ht_centimes: 12550, quantite: 1.5, source_prix: 'vos tarifs' }, { prix_unitaire_ht_centimes: 333, quantite: 3 }]
    const r9 = res([d(700, { outil: 'relancer_devis', etape: 'a', lignes: L }, TOUT(code)), d(701, { outil: 'relancer_devis', etape: 'a', lignes: [...L, { prix_unitaire_ht_centimes: null, quantite: 1 }] }, TOUT(code)), d(702, { outil: 'relancer_facture', etape: 'a', montant_centimes_base: 132000 }, TOUT(code))])
    const attendu = L.reduce((s, l) => s + Math.round(l.quantite * l.prix_unitaire_ht_centimes), 0)
    ko('P9', r9[0].montant_centimes === attendu && r9[1].montant_centimes === null && r9[2].montant_centimes === 132000, `${Dn} : montant calculé par le code (${r9[0].montant_centimes} au lieu de ${attendu} ; prix manquant ${r9[1].montant_centimes} ; base ${r9[2].montant_centimes})`)
    // P10 : idempotence
    const s10 = ds([d(800, { outil: 'relancer_devis', etape: 'palier-1' }, TOUT(code)), d(800, { outil: 'relancer_devis', etape: 'palier-1' }, TOUT(code)), d(800, { outil: 'relancer_devis', etape: 'palier-2' }, TOUT(code))])
    const s10b = ds([{ ...d(800, { outil: 'relancer_devis', etape: 'palier-1' }, TOUT(code)), organisation_id: ORG2 }])
    ko('P10', s10[1]?.statut === 'rien_a_faire' && s10[1].effets_prevus.length === 0 && s10[0].resultat.cle_idempotence === s10[1].resultat.cle_idempotence && s10[2].resultat.action === 'pilote'
      && s10[0].resultat.cle_idempotence.length <= 80 && s10[0].resultat.cle_idempotence !== s10b[0]?.resultat?.cle_idempotence,
      `${Dn} : même objet, même étape : décidé une fois ; clé ≤ 80, propre à l'organisation et à l'étape`)
    // P11 : lecture absente vaut refus ; P12 : liste fermée ; P13 : niveau 1
    const { pilote, ...sansPilote } = TOUT(code)
    const r11 = res([d(900, { outil: 'relancer_devis', etape: 'a' }, sansPilote), d(901, { outil: 'relancer_devis', etape: 'a' }, { ...TOUT(code), pilote: { drapeau: false, actif: true, types: { relance_devis: true } } })])
    ko('P11', r11.every((x) => x.action === 'carte'), `${Dn} : réglages du pilote absents ou drapeau baissé : rien ne part seul`)
    const r12 = res([d(910, { outil: 'creer_chantier' }, TOUT(code)), d(911, { outil: 'relancer_commande' }, TOUT(code))])
    ko('P12', r12.every((x) => x.action === 'carte' && x.motif === 'type_non_pilotable'), `${Dn} : un outil hors de la liste fermée (ou non exécutable par le pilote) reste une carte`)
    const s13 = ds([d(920, { outil: 'relancer_devis', etape: 'a' }, { ...TOUT(code), autonomie: { niveau_max: 3, niveaux: { relance_devis: 1 } } })])[0]
    ko('P13', s13?.resultat?.action === 'rien' && s13.resultat.niveau === 1 && s13.effets_prevus.length === 0, `${Dn} : niveau 1 : proposé, rien préparé`)
  }

  // B : le banc, rejoué hors ligne en entier (les trois gabarits appelés pour de vrai, par leurs exports)
  {
    const b = executer(banc, [{ timestamp: '2026-11-02T23:40:00.000+01:00' }], W)
    const essai = (essais ?? []).find((x) => x.workflow === BANC)
    ko('B1', !b.erreur && b.sorties.length === 2 && b.sorties.every((x) => x.defauts === 0), `${BANC} : le banc doit tourner sans défaut (${b.erreur ?? JSON.stringify(b.sorties.map((x) => x.defauts))})`)
    const dec = (b.par['Appeler lib-decider'] ?? []).map((x) => x.resultat)
    const cap = b.par['Appeler lib-capturer-lead']?.[0]?.resultat
    const qual = (b.par['Appeler lib-qualifier-lead'] ?? []).map((x) => x.resultat)
    ko('B2', cap?.ecartes?.some((x) => x.motif === 'sans_contact' && x.id === ID(130)) && qual.some((x) => x?.lead_id === ID(103) && x.doublon_de === ID(102)) && dec.length > 0 && dec.every((x) => x.action === 'carte'),
      `${BANC} : Bâti-Démo : …0130 sans contact écartée, …0103 doublon de …0102, mode A tout en carte`)
    // n8n (ordre v1) finit une branche avant l'autre, l'exécuteur hors ligne va en largeur : on compare les deux bilans sans leur ordre.
    const trie = (xs) => (xs ?? []).map((x) => JSON.stringify(x)).sort().join('\n')
    ko('B3', essai && trie(essai.sorties) === trie(b.sorties), `${BANC} : le bilan rejoué hors ligne diffère de celui de n8n (exécution ${essai?.execution ?? 'absente'})`)
  }
  // N : les essais réels de n8n, rejoués à l'identique
  for (const x of (essais ?? []).filter((y) => ENFANTS.includes(y.workflow))) {
    const r = run(x.workflow, x.entrees)
    if (x.statut_n8n === 'error') ko('N1', r.erreur === x.erreur, `${x.workflow} : l'essai n8n « ${x.titre} » (exécution ${x.execution}) s'arrêtait sur « ${x.erreur} », hors ligne : ${r.erreur}`)
    else ko('N1', !r.erreur && JSON.stringify(r.sorties) === JSON.stringify(x.sorties), `${x.workflow} : l'essai n8n « ${x.titre} » (exécution ${x.execution}) ne se rejoue pas à l'identique hors ligne`)
  }
  ko('N2', ENFANTS.every((n) => (essais ?? []).some((x) => x.workflow === n && x.statut_n8n === 'success')) && ENFANTS.filter((n) => (essais ?? []).some((x) => x.workflow === n && x.statut_n8n === 'error')).length >= 2,
    'essais n8n : un passage réussi par gabarit et au moins deux arrêts hors simulation attendus')
  return e
}

// ─── Les mutants ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const noeud = (W, wf, nom) => W[wf].nodes.find((n) => n.name === nom)
function remplacer(W, wf, nom, de, vers) {
  const n = noeud(W, wf, nom)
  const js = String(n.parameters.jsCode)
  if (!js.includes(de)) throw new Error(`mutant inapplicable : « ${de.slice(0, 60)} » absent de ${wf}/${nom}`)
  n.parameters.jsCode = js.split(de).join(vers)
}
const CAP = 'lib-capturer-lead', QUA = 'lib-qualifier-lead', DEC = 'lib-decider'
const MUTANTS = [
  // La copie figée et la liste « jamais en automatique »
  ['liste du pilote amputée (« payer » ôté de la copie)', 'P1', DEC, (W) => remplacer(W, DEC, 'Décider', '"rembourser","payer",', '"rembourser",')],
  ['offre Studio ajoutée aux offres du pilote', 'P', DEC, (W) => remplacer(W, DEC, 'Décider', '"PLANS_PILOTE":["business","entreprise","signature"]', '"PLANS_PILOTE":["business","entreprise","signature","studio"]')],
  ['plafond du jour recopié faux (25)', 'P1', DEC, (W) => remplacer(W, DEC, 'Décider', '"PLAFOND_AUTO_JOUR":20', '"PLAFOND_AUTO_JOUR":25')],
  ['gestes de p5:226 sans « envoyer un devis »', 'P', DEC, (W) => remplacer(W, DEC, 'Décider', 'const GESTES_P5_226 = ["envoyer_devis","envoi_devis",', 'const GESTES_P5_226 = [')],
  ['geste « jamais en automatique » décidé en automatique (contrôle ôté)', 'P3', DEC, (W) => remplacer(W, DEC, 'Décider', 'if (jamais(outil, typeAction))', 'if (false)')],
  ['contrôle de l’offre ôté (Studio au niveau 3)', 'P4', DEC, (W) => remplacer(W, DEC, 'Décider', "else if (!COPIE_PILOTE.PLANS_PILOTE.includes(c.plan)) motif = 'offre';", '')],
  ['niveau maximal ignoré (mode A au niveau 3)', 'P6', DEC, (W) => remplacer(W, DEC, 'Décider', "else if (niveauMax < 3) motif = 'niveau_max';", '')],
  ['plafond du jour ignoré', 'P7', DEC, (W) => remplacer(W, DEC, 'Décider', "else if (n >= COPIE_PILOTE.PLAFOND_AUTO_JOUR) motif = 'plafond';", '')],
  ['escalade non lue prise pour une absence d’escalade', 'P8', DEC, (W) => remplacer(W, DEC, 'Décider', 'k.escalade !== false', 'k.escalade === true')],
  ['montant sans la quantité', 'P9', DEC, (W) => remplacer(W, DEC, 'Décider', 'Math.round(Number(l.quantite) * l.prix_unitaire_ht_centimes)', 'l.prix_unitaire_ht_centimes')],
  ['même objet décidé deux fois (idempotence ôtée)', 'P10', DEC, (W) => remplacer(W, DEC, 'Décider', "if (cles.has(cle)) { action = 'rien'; niveau = 1; motif = 'deja_decide'; }\n    else ", '')],
  ['réglages du pilote absents pris pour « actif » (fail-open)', 'P11', DEC, (W) => remplacer(W, DEC, 'Décider', "else if (!pil || pil.drapeau !== true) motif = 'drapeau';", "else if (pil && pil.drapeau === false) motif = 'drapeau';\n      else if (!pil) { action = 'pilote'; niveau = 3; motif = 'pilote'; }")],
  // La capture
  ['un contact lu (colonne « contact » acceptée et rendue)', 'L4', CAP, (W) => {
    const n = noeud(W, CAP, "Contrat d'entrée"); n.parameters.jsCode = n.parameters.jsCode.replace('\\"etat_capture\\":{\\"enum\\"', '\\"contact\\":{\\"type\\":\\"string\\"},\\"etat_capture\\":{\\"enum\\"').replace('"etat_capture":{"enum"', '"contact":{"type":"string"},"etat_capture":{"enum"')
    remplacer(W, CAP, 'Capturer sans lire le contact', "const CHAMPS = ['canal', 'origine', 'urgence', 'type_chantier'];", "const CHAMPS = ['canal', 'origine', 'urgence', 'type_chantier', 'contact'];")
  }],
  ['le contact demandé dans la lecture prévue', 'L4', CAP, (W) => remplacer(W, CAP, 'Capturer sans lire le contact', '"contact_empreinte","etat_capture"];', '"contact_empreinte","etat_capture","contact"];')],
  ['demande sans contact capturée', 'L1', CAP, (W) => remplacer(W, CAP, 'Capturer sans lire le contact', "else if (typeof l.contact_empreinte !== 'string') motif = 'sans_contact';", '')],
  ['doublon laissé passer à la capture', 'L2', CAP, (W) => remplacer(W, CAP, 'Capturer sans lire le contact', "else if (vus.has(org + '|' + l.id)) motif = 'doublon';", '')],
  ['URL d’un prospect laissée dans l’événement', 'L3', CAP, (W) => remplacer(W, CAP, 'Capturer sans lire le contact', "if (typeof v === 'string' && WEB.test(v)) { urls++; continue; }", '')],
  ['ligne d’une autre organisation capturée', 'L5', CAP, (W) => remplacer(W, CAP, 'Capturer sans lire le contact', "if (l.artisan_id !== org) motif = 'autre_organisation';\n      else ", '')],
  ['lot non borné', 'L6', CAP, (W) => remplacer(W, CAP, 'Capturer sans lire le contact', 'retenus.slice(0, c.lot_max)', 'retenus.slice(0)')],
  // La qualification
  ['doublon laissé passer (empreintes en base ignorées)', 'Q1', QUA, (W) => remplacer(W, QUA, 'Noter selon la grille', 'if (connu) doublonDe = connu.lead_id;', 'if (false) doublonDe = connu.lead_id;')],
  ['doublon entre deux organisations (clé sans organisation)', 'Q3', QUA, (W) => remplacer(W, QUA, 'Noter selon la grille', "const k = org + '|' + d.empreinte_contact", "const k = d.empreinte_contact")],
  ['critère discriminant accepté (« age » permis, garde ôtée)', 'Q5', QUA, (W) => {
    remplacer(W, QUA, 'Noter selon la grille', 'if (DISCRIMINANTS.some(', 'if (false && DISCRIMINANTS.some(')
    remplacer(W, QUA, 'Noter selon la grille', 'const CHAMPS_PERMIS = {', 'const CHAMPS_PERMIS = {"age":"nombre","sexe":"texte",')
  }],
  ['champ absent compté comme rempli (valeur devinée)', 'Q6', QUA, (W) => remplacer(W, QUA, 'Noter selon la grille', '{ manque += k.poids; absents.push(k.champ); continue; }', '{ gagne += k.poids; continue; }')],
  ['résultat hors schéma qui change la note (revalidation ôtée)', 'Q7', QUA, (W) => remplacer(W, QUA, 'Noter selon la grille', 'const fautes = horsSchema(resultat);', 'const fautes = [];')],
  // La structure
  ['porte « simulation » retirée', 'S4', DEC, (W) => { const c = W[DEC].connections; c['Entrée conforme ?'].main[0] = [{ node: 'Décider', type: 'main', index: 0 }]; delete c['Porte simulation'] }],
  ['workflow activé', 'S1', QUA, (W) => { W[QUA].active = true }],
  ['workflow d’erreur retiré', 'S3', CAP, (W) => { delete W[CAP].settings.errorWorkflow }],
  ['appelable par tout workflow', 'S3', DEC, (W) => { W[DEC].settings.callerPolicy = 'any' }],
  ['une lecture HTTP ajoutée à la capture', 'S2', CAP, (W) => { W[CAP].nodes.push({ name: 'Lire les leads', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, parameters: { url: 'https://exemple.invalid' } }); W[CAP].connections['Capturer sans lire le contact'].main[0].push({ node: 'Lire les leads', type: 'main', index: 0 }) }],
  ['contrat d’entrée affaibli (champs en trop acceptés)', 'S5', QUA, (W) => remplacer(W, QUA, "Contrat d'entrée", "if (s.additionalProperties === false) for", 'if (false) for')],
  ['SHA-256 faussé', 'S6', DEC, (W) => remplacer(W, DEC, 'Décider', 'h = g; g = f; f = e;', 'h = f; g = f; f = e;')],
  ['banc qui appelle un sous-workflow en source « parameter »', 'S3', 'lib-banc-metier', (W) => { W[BANC].nodes.find((n) => n.name === 'Appeler lib-decider').parameters.source = 'parameter' }],
  ['le code du pilote gagne un geste jamais automatique, la copie figée ne suit pas', 'P1', DEC, (W, E, K) => { K.OUTILS_JAMAIS_AUTO = [...K.OUTILS_JAMAIS_AUTO, 'exporter_compta'] }],
  ['le code du pilote ouvre le pilote à Studio, la copie figée ne suit pas', 'P1', DEC, (W, E, K) => { K.PLANS_PILOTE = [...K.PLANS_PILOTE, 'studio'].sort() }],
  ['essai n8n falsifié (sortie retouchée après coup)', 'N1', DEC, (W, E) => { const x = E.find((y) => y.workflow === DEC && y.sorties); x.sorties[0].resultat.action = 'carte' }],
]

// ─── Lancement ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const lire = (f) => JSON.parse(readFileSync(path.join(DOSSIER, f), 'utf8'))
const W = {}
for (const n of [...ENFANTS, BANC]) if (existsSync(path.join(DOSSIER, `${n}.workflow.json`))) W[n] = lire(`${n}.workflow.json`)
const essais = existsSync(path.join(DOSSIER, 'essais-n8n.json')) ? lire('essais-n8n.json') : []
const code = lireCode()
const erreurs = juger(W, essais, code)
let rouges = 0, verts = []
if (!erreurs.length) {
  console.log(`✓ chaîne capture → décision (${ENFANTS.length} gabarits et le banc, ${essais.length} essai(s) n8n rejoué(s)) : S1 à S7, C1 à C3, L1 à L7, Q1 à Q9, P1 à P13, B1 à B3, N1 et N2 tenus`)
  console.log(`  copie figée du pilote = code (lib/pilote/regles.ts, lib/plans.ts) : ${code.OUTILS_JAMAIS_AUTO.length} gestes jamais automatiques, ${code.OUTILS_EXECUTABLES_PILOTE.length} outils pilotables, offres ${code.PLANS_PILOTE.join('/')} ; liste du code incluse dans celle du kit, avec ${B1_EXIGES.length} gestes de p5:226 exigés`)
  for (const [titre, regle, wf, f] of MUTANTS) {
    const M = copie(W), E = copie(essais), K = copie(code)
    let r
    try { f(M, E, K); r = juger(M, E, K) } catch (err) { r = [`(mutant non appliqué : ${err.message})`]; verts.push(titre) ; console.log(`  ✗ mutant « ${titre} » (${wf}) : ${err.message}`); continue }
    const pourSaRaison = r.some((x) => x.startsWith(regle))
    if (r.length && pourSaRaison) { rouges++; console.log(`  ✓ mutant « ${titre} » (${wf}) fait rougir le juge\n      → ${r.find((x) => x.startsWith(regle)).slice(0, 200)}`) }
    else { verts.push(titre); console.log(`  ✗ mutant « ${titre} » (${wf}) ne fait pas rougir le juge pour sa raison (${regle}) : ${r[0] ?? 'aucun défaut'}`) }
  }
  console.log(`lib-metier-n8n-qa : ${MUTANTS.length} mutants, ${rouges} rouges`)
} else {
  for (const x of erreurs) console.log(`  ✗ ${x}`)
}
const ok = !erreurs.length && !verts.length
console.log(ok ? 'OK' : 'ÉCHEC')
process.exit(ok ? 0 : 1)
