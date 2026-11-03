// JUGE de la démonstration du mode A (tâche 035-007) : `ent-exemple-parent` et ses cinq chaînes d'agents, sur « Exemple. Bâti-Démo ».
// Hors ligne : aucun réseau, aucune base, aucun modèle. Il rejoue tels quels les nœuds Code des EXPORTS (.orchestre/preuves/035-007/*.workflow.json)
// dans node:vm, en suivant leurs connexions, et les `lib-*` appelés depuis LEURS exports (035-003, 035-004, 035-005) ; il relit les
// essais n8n (essais-n8n.json) et les rejoue. Il rougit (code de sortie 1) sur :
//   G1 toute paire base / résultat chiffrée, et tout chiffre de gain (p5:42 ; PR § 7.3) : dans le rapport rendu et dans le rapport d'exemple
//      du gérant (plans/011-cadrage-01-11/p5-entreprise/demo/rapport-gerant-exemple.html) ;
//   G2 un parent qui calcule (PR § 4.2-4.3 ; p5:156, p5:176) : modèle, arithmétique, dates, montants, ou appel direct d'un gabarit métier ;
//   G3 un geste « jamais en automatique » qui atteint l'exécution (p5:226, p5:315 ; Amendement B1) ;
//   G4 un envoi hors simulation (p5:318) : nœud d'envoi ou d'écriture, porte « simulation » absente, effet fait, chaîne qui va au-delà de
//      la porte quand simulation vaut faux ;
//   G5 un doublon au rejeu du même lot (p5:316) ;
//   S  la structure (inactif, réglages, politique d'appel, sous-workflows désignés) et N les essais n8n (sortie rejouée = sortie de n8n),
//   plus R le runbook (un agent qui s'arrête, rejouer, couper) et le rapport d'exemple (« Exemple. » partout).
// Chaque règle a son MUTANT, qui doit la faire rougir pour sa raison.
//   node scripts/demo-entreprise-qa.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PREUVE = path.join(RACINE, '.orchestre/preuves/035-007')
const DEMO = path.join(RACINE, 'plans/011-cadrage-01-11/p5-entreprise/demo')
const copie = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)))
export const T = {
  horloge: 'n8n-nodes-base.scheduleTrigger', trigger: 'n8n-nodes-base.executeWorkflowTrigger', code: 'n8n-nodes-base.code', si: 'n8n-nodes-base.if',
  aiguillage: 'n8n-nodes-base.switch', reunion: 'n8n-nodes-base.merge', appel: 'n8n-nodes-base.executeWorkflow', arret: 'n8n-nodes-base.stopAndError',
  rien: 'n8n-nodes-base.noOp', agent: '@n8n/n8n-nodes-langchain.agent', note: 'n8n-nodes-base.stickyNote', erreur: 'n8n-nodes-base.errorTrigger',
}

// ─── L'exécuteur hors ligne ──────────────────────────────────────────────────────────────────────────────────────────────────────
// Code : $input, $('Nœud') (.all(branche), .first(), .isExecuted). If : une expression `={{ … }}` évaluée sur $json, typage strict.
// Switch : règles « égal » sur une expression, sortie de secours. Merge : ajout, une seule fois, quand plus rien d'autre n'attend.
// Execute Sub-workflow : la sortie ÉPINGLÉE si l'essai l'épingle, sinon l'export enfant rejoué (politique d'appel contrôlée, ou notée).
// AI Agent : la sortie épinglée du modèle, jamais un modèle. Tout autre nœud atteint arrête le rejeu en erreur.
function evaluer(expr, json) {
  const m = /^=\{\{([\s\S]*)\}\}$/.exec(String(expr ?? ''))
  if (!m) throw new Error(`expression illisible hors ligne : ${String(expr).slice(0, 60)}`)
  return vm.runInNewContext(`(function () { return (${m[1]}); })()`, { $json: copie(json) }, { timeout: 1000 })
}
function lancerCode(js, items, etat) {
  const entree = copie(items)
  const proxy = (nom) => ({
    get isExecuted() { return nom in etat.par },
    all: (b = 0) => { if (!(nom in etat.par)) throw new Error(`$('${nom}') : nœud non exécuté`); return copie((etat.par[nom][b] ?? []).map((json) => ({ json }))) },
    first: (b = 0) => { if (!(nom in etat.par)) throw new Error(`$('${nom}') : nœud non exécuté`); const l = etat.par[nom][b] ?? []; return l.length ? { json: copie(l[0]) } : undefined },
  })
  const ctx = { $input: { all: () => entree, first: () => entree[0], last: () => entree[entree.length - 1] }, console: { log() {} }, $: proxy }
  const sortie = vm.runInNewContext(`(function () {\n${js}\n})()`, ctx, { timeout: 5000 })
  if (!Array.isArray(sortie) || !sortie.every((x) => x && typeof x === 'object' && x.json && typeof x.json === 'object')) throw new Error('un nœud Code doit rendre [{ json }]')
  return JSON.parse(JSON.stringify(sortie))
}
// opts : { pins: { nœud: [json…] } (au premier niveau seulement, comme n8n), modele: { action_cle: sortie } (pour lib-rediger-message),
//          politique: 'stricte' | 'notee', journal: [] (chaque appel de sous-workflow, à toute profondeur), appelant }
export function executer(wf, entrees, W, opts = {}, profondeur = 0) {
  const parNom = new Map(wf.nodes.map((n) => [n.name, n]))
  const racines = wf.nodes.filter((n) => [T.trigger, T.horloge].includes(n.type))
  const etat = { par: {} }
  const visites = []
  const fini = (erreur) => ({ sorties: (etat.par['Contrat de sortie']?.[0] ?? etat.par['Bilan du passage']?.[0] ?? []), par: etat.par, visites, erreur })
  if (racines.length !== 1) return fini(`${racines.length} déclencheur(s)`)
  const file = [[racines[0].name, 0, entrees.map((j) => ({ json: copie(j) }))]]
  const attente = new Map() // Merge : entrée → éléments
  const pins = profondeur === 0 ? (opts.pins ?? {}) : {}
  for (let pas = 0; file.length || attente.size; pas++) {
    if (pas > 2000) return fini('boucle')
    let tache
    if (file.length) {
      const i = file.findIndex(([nom]) => parNom.get(nom)?.type !== T.reunion)
      if (i >= 0) tache = file.splice(i, 1)[0]
      else { const [nom, entreeIdx, items] = file.shift(); const a = attente.get(nom) ?? {}; a[entreeIdx] = (a[entreeIdx] ?? []).concat(items); attente.set(nom, a); continue }
    } else {
      const [nom, a] = attente.entries().next().value; attente.delete(nom)
      const n = parNom.get(nom), k = Number(n.parameters?.numberInputs ?? 2)
      tache = [nom, -1, Array.from({ length: k }, (_, i) => a[i] ?? []).flat()]
    }
    const [nom, , items] = tache
    const n = parNom.get(nom)
    if (!n) return fini(`nœud absent : ${nom}`)
    visites.push(nom)
    let outs
    try {
      if (nom in pins && n.type !== T.horloge && n.type !== T.trigger) outs = [pins[nom].map((json) => ({ json: copie(json) }))]
      else if (n.type === T.horloge || n.type === T.trigger || n.type === T.rien) outs = [items]
      else if (n.type === T.code) outs = [lancerCode(n.parameters?.jsCode ?? '', items, etat)]
      else if (n.type === T.si) {
        const c = n.parameters?.conditions ?? {}, cond = c.conditions?.[0] ?? {}
        if ((c.conditions ?? []).length !== 1 || cond.operator?.type !== 'boolean' || cond.operator?.operation !== 'true') throw new Error(`${nom} : condition hors forme`)
        const vrai = [], faux = []
        for (const it of items) { const v = evaluer(cond.leftValue, it.json); if (c.options?.typeValidation === 'strict' && typeof v !== 'boolean') throw new Error(`${nom} : valeur non booléenne en typage strict`); (v === true ? vrai : faux).push(it) }
        outs = [vrai, faux]
      } else if (n.type === T.aiguillage) {
        const regles = n.parameters?.rules?.values ?? []
        outs = Array.from({ length: regles.length + (n.parameters?.options?.fallbackOutput === 'extra' ? 1 : 0) }, () => [])
        for (const it of items) {
          const i = regles.findIndex((r) => { const k = r.conditions?.conditions?.[0]; return k && k.operator?.operation === 'equals' && evaluer(k.leftValue, it.json) === k.rightValue })
          if (i >= 0) outs[i].push(it); else if (n.parameters?.options?.fallbackOutput === 'extra') outs[regles.length].push(it)
        }
      } else if (n.type === T.reunion) outs = [items]
      else if (n.type === T.arret) { if (profondeur > 0) throw new Error(String(n.parameters?.errorMessage ?? 'Stop and Error')); return fini(String(n.parameters?.errorMessage ?? 'Stop and Error')) }
      else if (n.type === T.agent) {
        const p = opts.modele
        if (!p) throw new Error('modèle non épinglé : aucun appel au modèle hors ligne (question 5)')
        outs = [items.map((it) => { const cle = it.json.action_cle; const o = typeof p === 'function' ? p(it.json) : p[cle]; if (o === undefined) throw new Error(`sortie épinglée du modèle absente pour ${cle}`); return { json: { output: copie(o) } } })]
      } else if (n.type === T.appel) {
        const id = n.parameters?.workflowId?.value
        const enfant = Object.values(W).find((w) => w && w.id === id)
        try {
          if (!enfant || n.parameters?.source !== 'database') throw new Error(`sous-workflow ${id} introuvable ou hors source database`)
          const permis = enfant.settings?.callerPolicy === 'workflowsFromAList' && String(enfant.settings?.callerIds ?? '').split(',').map((x) => x.trim()).includes(wf.id)
          if (opts.journal) opts.journal.push({ appelant: wf.name, noeud: nom, enfant: enfant.name, permis, entrees: copie(items.map((i) => i.json)) })
          if (!permis && !(opts.politique === 'notee' || (opts.politique === 'notee-premier-niveau' && profondeur === 0))) throw new Error(`${enfant.name} n'autorise pas ${wf.name} à l'appeler (callerIds)`)
          const r = executer(enfant, items.map((i) => i.json), W, opts, profondeur + 1)
          if (r.erreur) throw new Error(`${enfant.name} : ${r.erreur}`)
          outs = [r.sorties.map((json) => ({ json }))]
        } catch (err) {
          if (n.onError === 'continueErrorOutput') outs = [[], [{ json: { error: { message: err.message } } }]]
          else if (n.onError === 'continueRegularOutput') outs = [[{ json: { error: { message: err.message } } }]]
          else throw err
        }
      } else return fini(`nœud non rejouable hors ligne atteint : ${nom} (${n.type})`)
    } catch (err) { if (profondeur > 0) return fini(`${nom} : ${err.message}`); return fini(`${nom} : ${err.message}`) }
    const p = etat.par[nom] ?? (etat.par[nom] = [])
    outs.forEach((o, i) => { p[i] = (p[i] ?? []).concat(o.map((x) => x.json)) })
    // Comme n8n (essai 460) : un nœud épinglé qui a une sortie d'erreur rend aussi ses éléments épinglés sur $('…').all(1).
    if (nom in pins && n.onError === 'continueErrorOutput') p[1] = (p[1] ?? []).concat(outs[0].map((x) => x.json))
    ;(wf.connections?.[nom]?.main ?? []).forEach((liste, i) => { const it = outs[i] ?? []; if (it.length) for (const l of liste ?? []) if (l?.node) file.push([l.node, l.index ?? 0, it]) })
  }
  return fini(null)
}

// ─── Le monde jugé : les exports de 035-007, les lib-* de 035-003 à 035-005, les essais n8n, le rapport et le runbook ─────────────────
const NOMS = ['ent-exemple-parent', 'ent-exemple-qualification', 'ent-exemple-relance', 'ent-exemple-redaction', 'ent-exemple-alerte', 'ent-exemple-reporting']
const CHAINES = NOMS.slice(1)
const LIBS_DU_PARENT = ['lib-capturer-lead', 'lib-disjoncteur', 'lib-journaliser', 'lib-battement'] // l'infrastructure du routage, aucun gabarit métier
const lireJson = (f) => JSON.parse(readFileSync(f, 'utf8'))
function chargerLibs() {
  const W = {}
  for (const d of ['035-003', '035-004', '035-005']) { const dir = path.join(RACINE, '.orchestre/preuves', d); for (const f of readdirSync(dir).filter((x) => x.endsWith('.workflow.json'))) { const w = lireJson(path.join(dir, f)); W[w.name] = w } }
  return W
}
export function chargerMonde() {
  const W = {}
  for (const n of NOMS) { const f = path.join(PREUVE, `${n}.workflow.json`); if (existsSync(f)) W[n] = lireJson(f) }
  return { W, essais: existsSync(path.join(PREUVE, 'essais-n8n.json')) ? lireJson(path.join(PREUVE, 'essais-n8n.json')) : [],
    html: existsSync(path.join(DEMO, 'rapport-gerant-exemple.html')) ? readFileSync(path.join(DEMO, 'rapport-gerant-exemple.html'), 'utf8') : '',
    runbook: existsSync(path.join(DEMO, 'runbook.md')) ? readFileSync(path.join(DEMO, 'runbook.md'), 'utf8') : '' }
}
const sansJournal = (o) => { const c = copie(o); if (c && typeof c === 'object' && !Array.isArray(c)) delete c.journal; return c }
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const GAIN = /\bgains?\b|gagn|[ée]conomi|\bROI\b|retour sur investissement|€|\beuros?\b|\d+\s?%|heures? (?:gagn|économ)|chiffre d.affaires (?:en hausse|gagné)/i
const CREATEURS = new Set(['ecrire_carte', 'ecrire_note', 'reserver_cle', 'ecrire_rapport', 'envoyer_alerte', 'mettre_en_file_pilote'])
const TYPES_INTERDITS = /email|gmail|outlook|slack|telegram|twilio|whatsapp|discord|mattermost|sendgrid|mailgun|mailjet|brevo|sendinblue|httprequest|supabase|postgres|mysql|redis|ftp|ssh|executecommand|langchain/i
const PERMIS = {
  parent: new Set([T.horloge, T.rien, T.si, T.code, T.aiguillage, T.reunion, T.appel, T.note]),
  chaine: new Set([T.trigger, T.code, T.si, T.appel, T.arret, T.note]),
}
// Le code d'un nœud, sans commentaires ni chaînes : ce qui reste est ce qui CALCULE.
const nu = (js) => String(js).replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, "''")
const aretes = (wf, nom) => Object.values(wf.connections?.[nom] ?? {}).flatMap((liste) => (liste ?? []).flatMap((s, i) => (s ?? []).filter(Boolean).map((l) => ({ vers: l.node, sortie: i }))))

let F5 = null
async function outils() { if (!F5) { const m = await import(path.join(RACINE, ".orchestre/preuves/035-005/construire.mjs")); F5 = { ...m, code: m.lireCode() } } return F5 }
const modeleDe = (F) => (j) => F.sortieModele(null, j.enveloppe.donnees.faits, j.enveloppe.donnees.faits.palier)

export async function juger(M) {
  const e = [], ko = (r, m) => e.push(`${r} ${m}`)
  const F = await outils(), modele = modeleDe(F)
  const LIBS = chargerLibs(), W = { ...LIBS, ...M.W }
  const parent = M.W['ent-exemple-parent']
  const ID_ERREUR = LIBS['lib-erreur-commune']?.id
  const idDe = (nom) => W[nom]?.id
  const nomDe = (id) => Object.values(W).find((w) => w.id === id)?.name
  // ── S : structure
  for (const nom of NOMS) {
    const w = M.W[nom]
    if (!w) { ko('S1', `${nom} : export absent`); continue }
    if (w.active !== false || w.activeVersionId) ko('S1', `${nom} : actif ou publié`)
    const s = w.settings ?? {}
    if (s.errorWorkflow !== ID_ERREUR) ko('S2', `${nom} : workflow d'erreur ${s.errorWorkflow} (lib-erreur-commune attendu)`)
    if (s.timezone !== 'Europe/Paris' || s.saveDataSuccessExecution !== 'none') ko('S2', `${nom} : fuseau ou rétention des succès`)
    if (nom === 'ent-exemple-parent' ? s.callerPolicy !== 'none' : !(s.callerPolicy === 'workflowsFromAList' && String(s.callerIds) === parent?.id)) ko('S2', `${nom} : politique d'appel ${s.callerPolicy}/${s.callerIds} (le parent seul peut appeler une chaîne ; personne n'appelle le parent)`)
    const permis = nom === 'ent-exemple-parent' ? PERMIS.parent : PERMIS.chaine
    for (const n of w.nodes) {
      if (TYPES_INTERDITS.test(n.type)) ko('G4', `${nom} / ${n.name} : nœud d'envoi, d'écriture, de lecture réelle ou de modèle (${n.type}) : interdit en mode A`)
      else if (!permis.has(n.type)) ko('S3', `${nom} / ${n.name} : type hors liste (${n.type})`)
      if (n.type === T.appel) {
        const cible = nomDe(n.parameters?.workflowId?.value)
        if (n.parameters?.source !== 'database' || !cible) ko('S3', `${nom} / ${n.name} : sous-workflow inconnu ou hors source database`)
        else if (nom === 'ent-exemple-parent' && !CHAINES.includes(cible) && !LIBS_DU_PARENT.includes(cible)) ko('G2', `le parent appelle ${cible} lui-même : un gabarit métier, c'est le travail d'un agent`)
        else if (nom !== 'ent-exemple-parent' && !cible.startsWith('lib-')) ko('S3', `${nom} appelle ${cible} : trois étages au plus (parent, chaîne, lib-*)`)
      }
    }
  }
  if (!parent) return e
  // ── G2 : le parent ne calcule rien
  for (const n of parent.nodes.filter((x) => x.type === T.code)) {
    const c = nu(n.parameters?.jsCode)
    if (/Math\.|\bDate\b|parse(?:Int|Float)|\bNumber\s*\(|toFixed|[^\s=!<>]\s*[*/%]\s*[^\s=]|\s[*/%]\s/.test(c)) ko('G2', `parent / ${n.name} : arithmétique ou date dans le parent`)
    if (/montant|centimes|\bprix|tarif|\btva\b|\bnote\b|poids|grille\b(?!s)/i.test(c.replace(/C\.agents/g, '').replace(/\b\w+\s*:\s*null\b/g, ''))) ko('G2', `parent / ${n.name} : le parent touche à un montant, un prix ou une note`)
  }
  // ── G4 : la porte « simulation » avant tout appel, dans chaque chaîne
  for (const nom of CHAINES) {
    const w = M.W[nom]; if (!w) continue
    const porte = w.nodes.find((n) => n.name === 'Porte simulation' && n.type === T.si && /simulation/.test(JSON.stringify(n.parameters?.conditions ?? {})))
    if (!porte) { ko('G4', `${nom} : porte « simulation » absente`); continue }
    const vus = new Set(), file = [w.nodes.find((n) => n.type === T.trigger)?.name]
    while (file.length) { const x = file.shift(); if (!x || vus.has(x)) continue; vus.add(x); for (const a of aretes(w, x)) if (!(x === porte.name && a.sortie === 0)) file.push(a.vers) }
    for (const x of vus) if (w.nodes.find((n) => n.name === x)?.type === T.appel) ko('G4', `${nom} / ${x} : appel atteignable sans passer la porte « simulation »`)
  }
  // ── N : chaque essai n8n, rejoué hors ligne sur l'export, rend la sortie de n8n
  const parExe = Object.fromEntries(M.essais.map((x) => [x.execution, x]))
  for (const x of M.essais) {
    if (x.version_precedente) continue
    const w = M.W[x.workflow]; if (!w) { ko('N1', `essai ${x.execution} : export ${x.workflow} absent`); continue }
    const r = executer(w, x.entrees, W, { pins: x.epingles, modele, politique: 'stricte' })
    if (x.erreur) { if (!r.erreur || !r.erreur.includes(x.erreur)) ko('N1', `essai ${x.execution} : n8n s'arrête (« ${x.erreur.slice(0, 60)} »), le rejeu non (${r.erreur ?? 'aucune erreur'})`) }
    else if (r.erreur) ko('N1', `essai ${x.execution} : le rejeu échoue (${r.erreur})`)
    else if (!egal(r.sorties, x.sorties)) ko('N1', `essai ${x.execution} (${x.workflow}) : la sortie rejouée diffère de celle de n8n`)
  }
  // ── P : ce qui est épinglé à la place d'un lib-* ou d'une chaîne est ce que rend leur export, rejoué (champ journal ôté seulement s'il l'a été)
  for (const x of M.essais) {
    if (x.version_precedente) continue
    const w = M.W[x.workflow]; if (!w) continue
    const appels = w.nodes.filter((n) => n.type === T.appel && n.name in (x.epingles ?? {}))
    if (!appels.length) continue
    const sansAppels = Object.fromEntries(Object.entries(x.epingles).filter(([n]) => !appels.some((a) => a.name === n)))
    // La politique d'appel est NOTÉE pour les appels du workflow jugé (leurs callerIds sont à poser), APPLIQUÉE plus bas (essai 456 : les
    // chaînes réelles voient leurs lib-* refusés, comme dans n8n).
    // Quand l'essai épinglait les chaînes (461), on les rejoue avec leurs lib-* notés : la sortie épinglée doit être celle de leur rejeu.
    const chainesEpinglees = appels.some((a) => CHAINES.includes(nomDe(a.parameters.workflowId.value)))
    const r = executer(w, x.entrees, W, { pins: sansAppels, modele, politique: chainesEpinglees ? 'notee' : 'notee-premier-niveau' })
    for (const a of appels) {
      const vrai = r.par[a.name]?.[0], pin = x.epingles[a.name]
      const comparer = (p, v) => egal(p, ('journal' in p) ? v : sansJournal(v))
      if (!vrai || vrai.length !== pin.length || !pin.every((p, i) => comparer(p, vrai[i]))) ko('P1', `essai ${x.execution} / ${a.name} : la sortie épinglée n'est pas celle que rend ${nomDe(a.parameters.workflowId.value)} rejoué`)
    }
  }
  // ── G4 (suite) : hors simulation, aucune chaîne n'appelle rien ; aucun essai n'a d'effet fait
  for (const nom of CHAINES) {
    const x = M.essais.find((y) => y.workflow === nom && !y.erreur && y.entrees[0]?.simulation === true); if (!x || !M.W[nom]) continue
    const env = copie(x.entrees[0]); env.simulation = false
    const journal = []
    const r = executer(M.W[nom], [env], W, { modele, politique: 'notee', journal })
    if (journal.length || !/Hors simulation/.test(r.erreur ?? '')) ko('G4', `${nom} : avec simulation à faux, ${journal.length} appel(s) partent au lieu de l'arrêt`)
  }
  for (const x of M.essais) for (const s of x.sorties ?? []) if ((Array.isArray(s.effets_faits) && s.effets_faits.length) || (typeof s.effets_faits === 'number' && s.effets_faits > 0)) ko('G4', `essai ${x.execution} : effet fait en simulation`)
  // ── G3 : un geste « jamais en automatique » demandé en automatique n'atteint jamais l'exécution
  const red = M.W['ent-exemple-redaction'], baseRed = M.essais.find((y) => y.workflow === 'ent-exemple-redaction' && y.sorties)
  if (red && baseRed) {
    const env = copie(baseRed.entrees[0]), d0 = env.donnees.demandes[0]
    const kit = [...new Set([...F.code.OUTILS_JAMAIS_AUTO, ...F.GESTES_P5_226])]
    env.donnees.demandes = kit.map((g, i) => ({ ...copie(d0), action_cle: 'exemple:geste:' + i, type_action: g, outil: g, cible: 'pilote' }))
    const journal = []
    const r = executer(red, [env], W, { modele, politique: 'notee', journal })
    const atteints = journal.filter((a) => a.enfant === 'lib-executer').flatMap((a) => a.entrees).filter((x) => kit.includes(x.donnees?.charge?.type_action))
    if (r.erreur) ko('G3', `cas des gestes jamais automatiques : rejeu en erreur (${r.erreur})`)
    else if (atteints.length) ko('G3', `${atteints.length} geste(s) « jamais en automatique » atteignent lib-executer (${atteints.slice(0, 3).map((x) => x.donnees.charge.type_action).join(', ')})`)
  }
  for (const a of [].concat(...M.essais.map((x) => Object.entries(x.epingles ?? {})))) void a
  // ── G5 : le rejeu du même lot ne crée aucun doublon (passage complet hors ligne, lib-* rejoués, deux tours)
  const nominal = parExe[461]
  if (nominal) {
    const lect = Object.fromEntries(Object.entries(nominal.epingles).filter(([n]) => !n.startsWith('Appeler ')))
    const tour = (pins) => executer(parent, nominal.entrees, W, { pins, modele, politique: 'notee' })
    const effetsDe = (r) => CHAINES.flatMap((c) => (r.par['Appeler ' + c]?.[0] ?? []).flatMap((s) => s?.effets_prevus ?? []))
    const t1 = tour(lect), e1 = effetsDe(t1).filter((x) => CREATEURS.has(x.effet))
    const cles = [...new Set(e1.flatMap((x) => [x.cle, x.corps?.cle]).filter(Boolean))]
    const recentes = (t1.par['Appeler ent-exemple-alerte']?.[0] ?? []).flatMap((s) => s?.resultat?.alertes_prevues ?? []).map((k) => ({ categorie: k.split(':')[1], workflow: k.split(':')[2], envoyee_le: lect['Lire les événements échus (mode A : épinglés)'][0].maintenant }))
    const l2 = copie(lect)
    l2['Lire les événements échus (mode A : épinglés)'][0].cles_connues = cles
    l2['Lire la configuration (mode A : épinglée)'][0].agents.alerte.alertes_recentes = recentes
    const t2 = tour(l2), e2 = effetsDe(t2).filter((x) => CREATEURS.has(x.effet))
    if (t1.erreur || t2.erreur) ko('G5', `rejeu du passage en erreur (${t1.erreur ?? t2.erreur})`)
    else if (!e1.length) ko('G5', 'le premier passage ne crée rien : le rejeu ne prouve rien')
    else if (e2.length) ko('G5', `le rejeu du même lot recrée ${e2.length} effet(s) (${[...new Set(e2.map((x) => x.effet))].join(', ')})`)
    // Le même événement deux fois dans un lot : une seule carte par clé.
    const l3 = copie(lect), V3 = l3['Lire les événements échus (mode A : épinglés)'][0]
    V3.evenements = V3.evenements.concat(V3.evenements.filter((x) => x.type === 'relance_due').map((x) => ({ ...copie(x), id: x.id.slice(0, -3) + '999' })))
    const t3 = tour(l3), cartes = effetsDe(t3).filter((x) => x.effet === 'ecrire_carte').map((x) => x.corps?.cle ?? x.cle)
    if (cartes.length !== new Set(cartes).size) ko('G5', `un événement en double dans le lot donne ${cartes.length - new Set(cartes).size} carte(s) en double`)
    // ── G1 sur le passage rejoué : aucune paire base / résultat chiffrée dans le rapport rendu
    const rap = (t1.par['Appeler ent-exemple-reporting']?.[0] ?? []).flatMap((s) => s?.resultat?.rapports ?? [])
    for (const p of rap) for (const i of p.indicateurs ?? []) if (i.base !== null && i.base !== undefined) ko('G1', `rapport rejoué : l'indicateur ${i.id} porte une base chiffrée (${i.base}) face à sa valeur : aucune paire base / résultat en mode A`)
  } else ko('N1', 'essai de bout en bout 461 absent')
  // ── G1 : aucun chiffre de gain, aucune paire base / résultat, ni dans les rapports rendus par n8n, ni dans le rapport du gérant
  for (const x of M.essais) for (const s of x.sorties ?? []) for (const p of s?.resultat?.rapports ?? []) {
    for (const i of p.indicateurs ?? []) if (i.base !== null && i.base !== undefined) ko('G1', `essai ${x.execution} : l'indicateur ${i.id} porte une base chiffrée (${i.base})`)
    for (const l of p.lignes ?? []) { if (GAIN.test(l)) ko('G1', `essai ${x.execution} : chiffre de gain dans le rapport (« ${l.slice(0, 60)} »)`); if (!/^Exemple\. /.test(l)) ko('H1', `essai ${x.execution} : ligne de rapport sans « Exemple. »`) }
  }
  const texte = M.html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ')
  if (!M.html) ko('H1', 'rapport du gérant absent')
  else {
    if (GAIN.test(texte.replace(/aucun chiffre de gain/gi, ''))) ko('G1', `rapport du gérant : chiffre de gain (« ${(GAIN.exec(texte.replace(/aucun chiffre de gain/gi, '')) || [''])[0]} »)`)
    const bases = [...M.html.matchAll(/<td[^>]*data-base[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1].trim())
    if (bases.length < 8) ko('H2', `rapport du gérant : ${bases.length} indicateur(s) au lieu des 8 KPI`)
    for (const b of bases) if (b !== 'Inconnue, à mesurer') ko('G1', `rapport du gérant : une base de départ chiffrée ou renseignée (« ${b} ») : en mode A, toute base est « Inconnue, à mesurer »`)
    for (const m of M.html.matchAll(/<(h1|h2|title|li)[^>]*>([\s\S]*?)<\/\1>/g)) if (!/Exemple\./.test(m[2])) ko('H1', `rapport du gérant : « ${m[2].replace(/<[^>]+>/g, '').trim().slice(0, 50)} » sans « Exemple. »`)
    if (/<script|https?:\/\/|@import|\bon[a-z]+=/i.test(M.html)) ko('H3', 'rapport du gérant : script, ressource distante ou gestionnaire d’événement (HTML statique attendu)')
    if (/presti/i.test(texte)) ko('H3', 'rapport du gérant : la marque « Presti » apparaît')
    // Les comptes affichés sont ceux des essais n8n (aucun chiffre écrit à la main).
    const s = (n) => parExe[n]?.sorties?.[0]
    if (s(451) && s(452)) {
      const bureau = s(452).resultat.cartes_prevues.length + s(451).resultat.decisions.filter((d) => d.action === 'carte').length
      const lu = Number(/data-compte="bureau">(\d+)</.exec(M.html)?.[1]), rep = Number(/data-compte="reprendre">(\d+)</.exec(M.html)?.[1])
      if (lu !== bureau || rep !== s(452).resultat.refus_porte.length) ko('H2', `rapport du gérant : comptes (${lu}, ${rep}) ≠ essais n8n (${bureau}, ${s(452).resultat.refus_porte.length})`)
    }
  }
  // ── R : le runbook dit quoi faire quand un agent s'arrête, comment rejouer, comment couper
  const rb = M.runbook
  if (!/^##[^\n]*agent s.arr[êe]te/im.test(rb)) ko('R1', 'runbook : section « un agent s’arrête » absente')
  if (!/^##[^\n]*Rejouer/im.test(rb)) ko('R1', 'runbook : section « rejouer » absente')
  if (!/^##[^\n]*Couper/im.test(rb)) ko('R1', 'runbook : section « couper » absente')
  for (const n of NOMS) if (M.W[n] && !rb.includes(M.W[n].id)) ko('R2', `runbook : l'identifiant de ${n} manque`)
  if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}|sk-ant-|sb_secret_|Bearer\s+\S{20,}/.test(rb + M.html)) ko('R3', 'runbook ou rapport : adresse ou secret')
  return e
}

// Les callerIds que les lib-* devront accepter (lu dans les exports : qui appelle quoi), pour la session principale.
export function appelantsManquants(M) {
  const LIBS = chargerLibs(), manque = {}
  for (const w of Object.values(M.W)) for (const n of w.nodes.filter((x) => x.type === T.appel)) {
    const lib = Object.values(LIBS).find((l) => l.id === n.parameters?.workflowId?.value); if (!lib) continue
    if (!String(lib.settings?.callerIds ?? '').split(',').includes(w.id)) (manque[lib.name] ??= new Set()).add(`${w.name} (${w.id})`)
  }
  return Object.fromEntries(Object.entries(manque).map(([k, v]) => [k, [...v].sort()]).sort())
}

// ─── Les mutants : chacun doit faire rougir sa règle ──────────────────────────────────────────────────────────────────────────────
const noeud = (M, wf, nom) => { const n = M.W[wf].nodes.find((x) => x.name === nom); if (!n) throw new Error(`nœud absent : ${wf} / ${nom}`); return n }
const remplacer = (M, wf, nom, de, vers) => { const n = noeud(M, wf, nom); if (!n.parameters.jsCode.includes(de)) throw new Error(`mutant inapplicable : ${nom}`); n.parameters.jsCode = n.parameters.jsCode.replace(de, vers) }
export const MUTANTS = [
  ['chiffre de gain dans le rapport du gérant', (M) => { M.html = M.html.replace('</main>', '<p>Exemple. Gain estimé : 1 200 € par mois</p></main>') }, /^G1 rapport du gérant : chiffre de gain/],
  ['base de départ chiffrée dans le rapport du gérant', (M) => { M.html = M.html.replace('Inconnue, à mesurer</td>', '12 h par semaine</td>') }, /^G1 rapport du gérant : une base/],
  ['paire base / résultat dans un rapport rendu', (M) => { M.essais.find((x) => x.execution === 448).sorties[0].resultat.rapports[0].indicateurs[0].base = 2 }, /^G1 essai 448 : l'indicateur/],
  ['ligne de gain dans un rapport rendu', (M) => { M.essais.find((x) => x.execution === 448).sorties[0].resultat.rapports[0].lignes.push('Exemple. Temps gagné : 3 h') }, /^G1 essai 448 : chiffre de gain/],
  ['le parent calcule (arithmétique)', (M) => remplacer(M, 'ent-exemple-parent', 'Aiguiller', 'const s = [];', 'const s = []; const marge = V.passage.length * 2;'), /^G2 parent \/ Aiguiller : arithmétique/],
  ['le parent touche à un montant', (M) => remplacer(M, 'ent-exemple-parent', 'Bilan du passage', 'let prevus = 0, faits = 0;', 'let prevus = 0, faits = 0; const montant_total = prevus;'), /^G2 parent \/ Bilan du passage : le parent touche/],
  ['le parent appelle lui-même un gabarit métier (lib-decider)', (M) => { noeud(M, 'ent-exemple-parent', 'Appeler lib-journaliser').parameters.workflowId.value = 'hckqX1tQjIommtTH' }, /^G2 le parent appelle lib-decider/],
  ['le parent appelle un modèle', (M) => { M.W['ent-exemple-parent'].nodes.push({ name: 'Classer (modèle)', type: '@n8n/n8n-nodes-langchain.agent', typeVersion: 3.1, position: [0, 0], parameters: {} }) }, /^G4 ent-exemple-parent \/ Classer/],
  ['un geste « jamais en automatique » atteint l’exécution (filtre de la porte ôté)', (M) => remplacer(M, 'ent-exemple-redaction', "Préparer l'exécution", " || p.resultat.verdict !== 'passe'", ''), /^G3 \d+ geste/],
  ['nœud d’envoi ajouté à une chaîne', (M) => { M.W['ent-exemple-relance'].nodes.push({ name: 'Envoyer', type: 'n8n-nodes-base.emailSend', typeVersion: 2, position: [0, 0], parameters: {} }) }, /^G4 ent-exemple-relance \/ Envoyer/],
  ['porte « simulation » contournée', (M) => { const w = M.W['ent-exemple-relance']; w.connections['Entrée conforme ?'].main[0] = [{ node: 'Préparer les relances', type: 'main', index: 0 }] }, /^G4 ent-exemple-relance : avec simulation à faux|^G4 ent-exemple-relance \/ Appeler/],
  ['effet fait en simulation dans un essai', (M) => { M.essais.find((x) => x.execution === 452).sorties[0].effets_faits = [{ effet: 'ecrire_carte' }] }, /^G4 essai 452 : effet fait/],
  ['le rejeu ignore les clés déjà réservées (qualification)', (M) => remplacer(M, 'ent-exemple-qualification', 'Préparer le dédoublonnage', '{ cles_connues: D.cles_connues }', '{ cles_connues: [] }'), /^G5 le rejeu du même lot recrée/],
  ['le rejeu ignore les clés déjà réservées (relance)', (M) => remplacer(M, 'ent-exemple-relance', 'Préparer le dédoublonnage', '{ cles_connues: D.cles_connues }', '{ cles_connues: [] }'), /^G5 le rejeu du même lot recrée/],
  ['chaîne appelable par tous', (M) => { M.W['ent-exemple-alerte'].settings.callerPolicy = 'any' }, /^S2 ent-exemple-alerte : politique/],
  ['workflow activé', (M) => { M.W['ent-exemple-parent'].active = true }, /^S1 ent-exemple-parent : actif/],
  ['workflow d’erreur retiré', (M) => { delete M.W['ent-exemple-reporting'].settings.errorWorkflow }, /^S2 ent-exemple-reporting : workflow d'erreur/],
  ['une chaîne appelle une autre chaîne (quatre étages)', (M) => { noeud(M, 'ent-exemple-relance', 'Appeler lib-dedoublonner').parameters.workflowId.value = M.W['ent-exemple-redaction'].id }, /^S3 ent-exemple-relance appelle ent-exemple-redaction/],
  ['sortie n8n retouchée après coup', (M) => { M.essais.find((x) => x.execution === 461).sorties[0].effets_prevus = 47 }, /^N1 essai 461/],
  ['sortie épinglée d’un lib-* retouchée', (M) => { M.essais.find((x) => x.execution === 450).epingles['Appeler lib-relancer'][3].resultat.a_relancer = true }, /^P1 essai 450 \/ Appeler lib-relancer/],
  ['« Exemple. » ôté d’une ligne du rapport du gérant', (M) => { M.html = M.html.replace('<li><span class="t">Exemple. Relance de la facture', '<li><span class="t">Relance de la facture') }, /^H1 rapport du gérant : « Relance/],
  ['compte du rapport du gérant écrit à la main', (M) => { M.html = M.html.replace(/data-compte="bureau">\d+</, 'data-compte="bureau">12<') }, /^H2 rapport du gérant : comptes/],
  ['script dans le rapport du gérant', (M) => { M.html = M.html.replace('</body>', '<script>fetch("https://exemple.invalid")</script></body>') }, /^H3 rapport du gérant : script/],
  ['runbook sans la section « couper »', (M) => { M.runbook = M.runbook.replace(/^## 3\. Couper[\s\S]*?(?=^## 4)/m, '') }, /^R1 runbook : section « couper »/],
  ['runbook sans l’identifiant du parent', (M) => { M.runbook = M.runbook.split(M.W['ent-exemple-parent'].id).join('xxxxxxxxxxxxxxxx') }, /^R2 runbook : l'identifiant de ent-exemple-parent/],
]

if (import.meta.url === `file://${process.argv[1]}`) {
  const M = chargerMonde()
  const erreurs = await juger(M)
  if (erreurs.length) { console.error('✗ démo du mode A :\n  ' + erreurs.join('\n  ')); process.exit(1) }
  const parExe = Object.fromEntries(M.essais.map((x) => [x.execution, x]))
  console.log(`✓ démo du mode A (6 workflows, ${M.essais.length} essais n8n dont ${M.essais.filter((x) => !x.version_precedente).length} rejoués) : S1 à S3, G1 à G5, N1, P1, H1 à H3, R1 à R3 tenus`)
  console.log(`  bout en bout #461 : ${JSON.stringify(parExe[461]?.sorties?.[0]?.statuts)} ; ${parExe[461]?.sorties?.[0]?.effets_prevus} effets prévus, ${parExe[461]?.sorties?.[0]?.effets_faits} fait`)
  console.log('  callerIds à ajouter par la session principale : ' + Object.entries(appelantsManquants(M)).map(([l, a]) => `${l} ← ${a.map((x) => x.split(' ')[0]).join(', ')}`).join(' ; '))
  let rouges = 0
  for (const [titre, muter, attendu] of MUTANTS) {
    const m = copie(M); let res
    try { muter(m); res = await juger(m) } catch (err) { res = [`mutant inapplicable : ${err.message}`] }
    const ok = res.some((x) => attendu.test(x))
    if (ok) rouges++
    console.log(`  ${ok ? '✓' : '✗'} « ${titre} » → ${ok ? res.find((x) => attendu.test(x)).slice(0, 150) : 'RESTÉ VERT ou mauvaise raison : ' + (res[0] ?? 'aucune erreur')}`)
  }
  console.log(`demo-entreprise-qa : ${MUTANTS.length} mutants, ${rouges} rouges`)
  if (rouges !== MUTANTS.length) process.exit(1)
  console.log('OK')
}
