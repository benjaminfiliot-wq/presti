// JUGE HORS LIGNE du département Opérations (tâche 036-008, prompt 6, lot 8). Aucun réseau, aucune base, aucun modèle, aucune donnée réelle.
// Il lit les exports (le JSON rendu par le MCP `get_workflow_details`) de presti-dep-operations, lib-agenda-creneaux, lib-synchroniser-outil et du banc
// presti-banc-operations dans .orchestre/preuves/036-008/, et :
//   S  — leur STRUCTURE : inactifs ; aucun identifiant ; aucun nœud réseau, d'envoi, d'agenda ni de modèle ; réglages (workflow d'erreur, Europe/Paris, délai,
//        appelants en liste exacte) ; le gabarit « Contrat » de 035-003 à l'identique ; chaque nœud Code égal à celui de construire.mjs et à son empreinte ;
//        la porte « simulation » avant toute sortie ; la décision 5 : « rendez-vous posé » et « commande » n'entrent pas dans OUTIL_TYPE (lib/pilote/regles.ts:53-63).
//   C  — le gabarit « Contrat » REJOUÉ : hors contrat, rien ; hors simulation, l'arrêt.
//   G  — l'AGENDA : un créneau vient de l'agenda lu, ou il n'existe pas. Le juge refait le calcul à part (grille, horaires, marge, chevauchement, deux par jour, trois en tout)
//        et le confronte à 200 agendas tirés au hasard ; agenda illisible, ancien ou d'un autre compte = aucun créneau, et la carte le dit.
//   D  — la DÉCISION 5 : jamais de rendez-vous posé sans le clic de l'artisan, en Studio comme en Signature, pilote actif ou non ; après le clic, la pose est PRÉVUE, jamais faite.
//   R  — le RAPPEL de la veille : une carte, jamais un envoi ; consentement, opposition, texte fixe ; plage d'envoi comparée à lib/sms/plage.ts EXÉCUTÉ.
//   T  — le STOCK : seuil de l'inventaire, commande en carte, fournisseur de la liste de l'artisan, montant calculé à part, jamais envoyée seule.
//   I  — l'IMPORT : aperçu d'abord, écriture seulement après la validation sur CETTE empreinte, provenance de chaque donnée, pagination bornée, par clé.
//   P  — le banc et le chef REJOUÉS hors ligne : mêmes sorties que celles enregistrées dans n8n (essais-n8n.json), pins comprises.
//   N  — le contrat versionné ; K — la compétence « operations » (0193).
// Puis il prouve qu'il sait rougir : chaque MUTANT (un créneau absent de l'agenda proposé, un rendez-vous posé seul en Signature, une commande envoyée seule, un import
// écrit sans aperçu, une donnée sans provenance, l'agenda d'un autre compte…) doit le faire échouer pour sa raison.
//   node scripts/operations-n8n-qa.mjs [dossier des exports]
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.resolve(RACINE, process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '.orchestre/preuves/036-008')
const F = await import(pathToFileURL(path.join(RACINE, '.orchestre/preuves/036-008/construire.mjs')).href)
const F3 = await import(pathToFileURL(path.join(RACINE, '.orchestre/preuves/035-003/construire.mjs')).href)
const CHEF = F.CHEF, BANC = F.BANC, ENFANTS = F.ENFANTS
const NOMS = [CHEF, ...ENFANTS, BANC]
const T = { trigger: 'n8n-nodes-base.executeWorkflowTrigger', horloge: 'n8n-nodes-base.scheduleTrigger', code: 'n8n-nodes-base.code', si: 'n8n-nodes-base.if', arret: 'n8n-nodes-base.stopAndError',
  note: 'n8n-nodes-base.stickyNote', appel: 'n8n-nodes-base.executeWorkflow' }
const PORTE = 'Porte simulation', ARRET = 'Hors simulation : non branché'
const sha = (t) => createHash('sha256').update(String(t), 'utf8').digest('hex')
const copie = (o) => JSON.parse(JSON.stringify(o))
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const EMPREINTE_ENTREE = '20f6ff371969130e45b37ea58466baaa9b4581f7dbe145863a2f4a1a57713899'
const EMPREINTE_SORTIE = '8f0f37c68d78f3154204655b3f5343889c5c74733c8b852f27e34bc517394a70'
const ORG = F.ORG, ORG2 = F.ORG2
const OFFRES = ['studio', 'signature', 'essentiel', 'essai']
// Ce que dit le PLAN (décision 5, p6) : ces types n'entrent pas dans la liste fermée du pilote.
const INTERDITS_OUTIL_TYPE = /rendez|rdv|commande|rappel_rendez|creneau|poser/i

// ─── Les temps de Paris, refaits ici autrement que dans les nœuds (format suédois, pas de formatToParts) ────────────────────────────────────
const SV = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const local = (ms) => { const s = SV.format(new Date(ms)); return { jour: s.slice(0, 10), h: Number(s.slice(11, 13)), m: Number(s.slice(14, 16)) } } // "2026-11-03 09:00"
const semaine = (jour) => { const d = new Date(jour + 'T12:00:00Z').getUTCDay(); return d === 0 ? 7 : d } // 1 = lundi … 7 = dimanche
const plusJours = (jour, n) => new Date(Date.parse(jour + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10)
function instant(jour, minutes) { // l'instant UTC dont l'heure de Paris est jour + minutes : recherche par pas d'une minute autour du décalage plausible (1 h ou 2 h)
  for (const dec of [60, 120]) { const ms = Date.parse(jour + 'T00:00:00Z') + (minutes - dec) * 60000; const l = local(ms); if (l.jour === jour && l.h * 60 + l.m === minutes) return ms }
  throw new Error('instant introuvable ' + jour + ' ' + minutes)
}

// ─── Le VRAI code de l'application (lib/sms/plage.ts), exécuté dans un processus à part ────────────────────────────────────────────────────
function plageReelle(instants) {
  const prog = `const p = await import(${JSON.stringify(pathToFileURL(path.join(RACINE, 'lib/sms/plage.ts')).href)});
const d = JSON.parse(process.env.DONNEES);
process.stdout.write(JSON.stringify(d.map((ms) => { const ok = p.verifierPlage(new Date(ms)).ok; let prochain = null; if (ok) prochain = ms; else for (let t = ms; t < ms + 6 * 86400000; t += 60000) if (p.verifierPlage(new Date(t)).ok) { prochain = t; break; } return { ok, prochain }; })));`
  return JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', './scripts/ts-loader.mjs', '--input-type=module', '-e', prog],
    { cwd: RACINE, encoding: 'utf8', env: { ...process.env, DONNEES: JSON.stringify(instants) }, maxBuffer: 1 << 26 }))
}
const INSTANTS = Array.from({ length: 70 }, (_, k) => Math.floor((Date.UTC(2026, 0, 1) + k * 5.3 * 86400000 + (k % 7) * 3 * 3600000) / 60000) * 60000)
INSTANTS.push(Date.parse('2026-12-24T19:59:00.000Z'), Date.parse('2026-05-14T08:30:00.000Z'), Date.parse('2026-11-01T10:00:00.000Z'), Date.parse('2026-11-03T19:00:00.000Z'), Date.parse('2026-11-07T17:30:00.000Z'))
const PLAGE = plageReelle(INSTANTS)

// ─── L'exécuteur hors ligne : les nœuds de l'export, tels quels, dans node:vm ─────────────────────────────────────────────────────────────
function lancerCode(js, items, dollar) {
  const entree = copie(items)
  const ctx = { $input: { all: () => entree, first: () => entree[0], last: () => entree[entree.length - 1] }, $: dollar, console: { log() {} }, Intl, Math, Date, JSON, Set, Map, Number, String, Object, Array, Error }
  const sortie = vm.runInNewContext(`(function () {\n${js}\n})()`, ctx, { timeout: 5000 })
  if (!Array.isArray(sortie) || !sortie.every((x) => x && typeof x === 'object' && x.json && typeof x.json === 'object')) throw new Error('un nœud Code doit rendre [{ json }]')
  return JSON.parse(JSON.stringify(sortie))
}
function evaluerSi(n, items) {
  const c = n.parameters?.conditions ?? {}
  const cond = c.conditions?.[0] ?? {}
  const gauche = String(cond.leftValue ?? '')
  const m = /^=\{\{\s*\$json\.([\w.]+)\s*\}\}$/.exec(gauche)
  if (!m || (c.conditions ?? []).length !== 1) throw new Error(`${n.name} : condition illisible hors ligne (${gauche})`)
  const vrai = [], faux = []
  for (const it of items) {
    const v = m[1].split('.').reduce((o, k) => (o == null ? undefined : o[k]), it.json)
    if (c.options?.typeValidation === 'strict' && typeof v !== 'boolean') throw new Error(`${n.name} : valeur non booléenne en typage strict`)
    ;(v === true ? vrai : faux).push(it)
  }
  return [vrai, faux]
}
function executer(wf, entrees, o = {}) {
  const { W = new Map(), epingles = {}, prof = 0 } = o
  const parNom = new Map(wf.nodes.map((n) => [n.name, n]))
  const racines = wf.nodes.filter((n) => n.type === T.trigger || n.type === T.horloge)
  const res = { sorties: [], visites: [], erreur: null, run: new Map(), toutes: new Map() }
  if (racines.length !== 1) return { ...res, erreur: `${racines.length} déclencheur(s)` }
  if (prof > 4) return { ...res, erreur: 'profondeur' }
  const dollar = (nom) => { const r = res.run.get(nom); if (!r) throw new Error(`Node '${nom}' hasn't been executed`); return { first: () => r[0], all: () => r, last: () => r[r.length - 1] } }
  const file = [[racines[0].name, entrees.map((j) => ({ json: copie(j) }))]]
  for (let pas = 0; file.length; pas++) {
    if (pas > 600) return { ...res, erreur: 'boucle' }
    const [nom, items] = file.shift()
    const n = parNom.get(nom)
    if (!n) return { ...res, erreur: `nœud absent : ${nom}` }
    if (n.type === T.note) continue
    res.visites.push(nom)
    let outs
    try {
      if (epingles[nom]) outs = [epingles[nom].map((j) => ({ json: copie(j) }))]
      else if (n.type === T.trigger || n.type === T.horloge) outs = [items]
      else if (n.type === T.code) outs = [lancerCode(n.parameters.jsCode, items, dollar)]
      else if (n.type === T.si) outs = evaluerSi(n, items)
      else if (n.type === T.arret) return { ...res, erreur: n.parameters?.errorMessage ?? 'arrêt' }
      else if (n.type === T.appel) {
        const enfant = W.get(n.parameters?.workflowId?.value)
        if (!enfant) throw new Error(`sous-workflow inconnu : ${n.parameters?.workflowId?.value}`)
        const r = executer(enfant, items.map((i) => i.json), { W, prof: prof + 1 })
        if (r.erreur) throw new Error(r.erreur)
        outs = [r.sorties.map((j) => ({ json: j }))]
      } else throw new Error(`type de nœud non géré hors ligne : ${n.type}`)
    } catch (err) {
      if (n.onError === 'continueRegularOutput') outs = [[{ json: { error: String(err.message ?? err) } }]]
      else return { ...res, erreur: `${nom} : ${String(err.message ?? err)}` }
    }
    res.run.set(nom, outs.flat())
    res.toutes.set(nom, (res.toutes.get(nom) ?? []).concat(outs.flat())) // tous les passages du nœud (le bilan du banc en a un par cas)
    const suivants = wf.connections?.[nom]?.main ?? []
    if (!suivants.some((a) => (a ?? []).length)) { if (nom === 'Contrat de sortie' || nom === 'Bilan du banc') for (const it of outs.flat()) res.sorties.push(it.json) }
    outs.forEach((sortie, i) => { for (const l of suivants[i] ?? []) if (sortie.length) file.push([l.node, sortie]) })
  }
  return res
}
const chefEnv = (ex) => (env, o = {}) => executer(ex[CHEF], [env], { W: ex.W, epingles: o.epingles })
const sortie1 = (r) => r.sorties[0]
const effets = (s) => s?.effets_prevus ?? []
const ECRITURES = /^(poser_rendez_vous|ecrire_ligne|envoyer|expedier|payer|commander)/
const sansEnvoi = (s) => effets(s).every((x) => !/^(envoyer|expedier|payer|commander|publier)/.test(x.effet))

// ─── Le calcul des créneaux, REFAIT ici (le juge ne lit pas le code des nœuds pour savoir ce qu'il doit rendre) ───────────────────────────────
function creneauxAttendus(d, c) {
  const ag = d.agenda
  const maintenant = Date.parse(d.maintenant)
  if (!ag.lue || ag.lu_le === null || ag.couvre === null) return []
  const lu = Date.parse(ag.lu_le)
  if (lu > maintenant || maintenant - lu > c.age_max_agenda_min * 60000) return []
  const du = d.fenetre.du > ag.couvre.du ? d.fenetre.du : ag.couvre.du, au = d.fenetre.au < ag.couvre.au ? d.fenetre.au : ag.couvre.au
  const [h0, m0] = c.horaires.heures_permises.debut.split(':').map(Number), [h1, m1] = c.horaires.heures_permises.fin.split(':').map(Number)
  const parJour = {}, sortie = []
  for (let jour = du; jour <= au && sortie.length < c.max_creneaux; jour = plusJours(jour, 1)) {
    if (!c.horaires.jours_permis.includes(semaine(jour))) continue
    for (let m = h0 * 60 + m0; m + c.duree_min <= h1 * 60 + m1 && sortie.length < c.max_creneaux; m += c.duree_min) {
      const debut = instant(jour, m), fin = debut + c.duree_min * 60000
      if (debut < maintenant + c.marge_min * 60000) continue
      if (ag.occupe.some((o) => debut < Date.parse(o.fin) && fin > Date.parse(o.debut))) continue
      if ((parJour[jour] ?? 0) >= 2) continue
      parJour[jour] = (parJour[jour] ?? 0) + 1
      sortie.push({ debut: new Date(debut).toISOString(), fin: new Date(fin).toISOString() })
    }
  }
  return sortie
}

// ─── Le jugement : toutes les règles, sur un jeu d'exports ───────────────────────────────────────────────────────────────────────────────────
function juger(ex, o = {}) {
  const e = []
  const ko = (code, msg) => e.push(`${code} ${msg}`)
  const aretes = (wf, nom) => Object.values(wf.connections?.[nom] ?? {}).flat(2).filter(Boolean).map((l) => l.node)
  const noeud = (wf, nom) => wf.nodes.find((n) => n.name === nom)
  const codeDe = (wf, nom) => String(noeud(wf, nom)?.parameters?.jsCode ?? '')
  const ids = Object.fromEntries(NOMS.map((n) => [n, ex[n].id]))
  const W = ex.W
  const lancer = chefEnv(ex)
  const agenda = (donnees, config) => sortie1(executer(ex['lib-agenda-creneaux'], [F.agendaEnfant(donnees, config ?? F.configAgenda())], { W }))
  const sync = (donnees, config, org) => sortie1(executer(ex['lib-synchroniser-outil'], [{ ...F.syncEnfant(donnees, config ?? F.configSync()), ...(org ? { organisation_id: org } : {}) }], { W }))

  // S — la structure
  for (const nom of NOMS) {
    const wf = ex[nom]
    if (wf.active !== false || wf.activeVersionId) ko('S1', `${nom} : doit être inactif et jamais publié`)
    if (wf.nodes.some((n) => n.credentials) || /"credentials"/.test(JSON.stringify(wf.nodes))) ko('S2', `${nom} : aucun identifiant n'est permis`)
    for (const n of wf.nodes) if (![T.trigger, T.horloge, T.code, T.si, T.arret, T.note, T.appel].includes(n.type)) ko('S3', `${nom} : ${n.name} est de type ${n.type} (ni réseau, ni envoi, ni agenda, ni modèle, ni base)`)
    if (/langchain|agent|lmChat|httpRequest|supabase|emailSend|slack|telegram|googleCalendar|outlook|googleSheets|googleDrive/i.test(JSON.stringify(wf.nodes.map((n) => n.type)))) ko('S3', `${nom} : un nœud de modèle, de réseau, d'agenda ou d'envoi est présent`)
    const s = wf.settings ?? {}
    if (s.errorWorkflow !== F.ERREUR) ko('S4', `${nom} : workflow d'erreur ${s.errorWorkflow} (lib-erreur-commune attendu)`)
    if (s.timezone !== 'Europe/Paris') ko('S4', `${nom} : fuseau ${s.timezone}`)
    if (!(Number.isInteger(s.executionTimeout) && s.executionTimeout >= 1 && s.executionTimeout <= 3600)) ko('S4', `${nom} : délai maximal absent`)
    if (s.saveDataSuccessExecution !== 'none' || s.saveExecutionProgress !== false) ko('S4', `${nom} : les succès ne doivent pas être sauvés`)
    const attendu = nom === BANC ? null : nom === CHEF ? [F.CERVEAU, ids[BANC]] : [ids[CHEF], ids[BANC]]
    if (attendu === null) { if (s.callerPolicy !== 'none') ko('S4', `${nom} : politique d'appel ${s.callerPolicy} (none attendu)`) }
    else if (s.callerPolicy !== 'workflowsFromAList' || !egal(String(s.callerIds ?? '').split(',').sort(), [...attendu].sort())) ko('S4', `${nom} : appelants ${s.callerPolicy}/${s.callerIds} (liste ${attendu.join(', ')} attendue, jamais any)`)
  }
  if (ids[CHEF] !== F.CHEF_ID) ko('S4', `${CHEF} : l'identifiant ${ids[CHEF]} n'est pas celui du squelette de 036-001 (${F.CHEF_ID}), que le Cerveau appelle`)
  for (const nom of [CHEF, ...ENFANTS]) {
    const wf = ex[nom], contrat = `${nom}@1`
    const decl = wf.nodes.filter((n) => n.type === T.trigger)
    if (decl.length !== 1 || aretes(wf, decl[0].name)[0] !== "Contrat d'entrée") ko('S5', `${nom} : doit commencer par le Contrat d'entrée`)
    const entree = codeDe(wf, "Contrat d'entrée"), sortie = codeDe(wf, 'Contrat de sortie')
    if (sha(entree.split(F3.REPERE_ENTREE)[1] ?? '') !== EMPREINTE_ENTREE) ko('S5', `${nom} : le corps du gabarit « Contrat d'entrée » n'est plus celui de 035-003`)
    if (sha(sortie.split(F3.REPERE_SORTIE)[1] ?? '') !== EMPREINTE_SORTIE) ko('S5', `${nom} : le corps du gabarit « Contrat de sortie » n'est plus celui de 035-003`)
    if (o.egalite !== false) {
      if (entree !== F3.codeEntree(contrat, F.SCHEMAS[nom])) ko('S6', `${nom} : « Contrat d'entrée » différent de construire.mjs`)
      if (sortie !== F3.codeSortie(contrat)) ko('S6', `${nom} : « Contrat de sortie » différent de construire.mjs`)
    }
    const finals = wf.nodes.filter((n) => n.name === 'Contrat de sortie')
    if (finals.length !== 1 || aretes(wf, 'Contrat de sortie').length) ko('S8', `${nom} : un seul Contrat de sortie, dernier nœud`)
    const porte = noeud(wf, PORTE)
    if (!porte || !/^\s*porte\s*:\s*simulation\s*$/m.test(String(porte.notes ?? ''))) ko('S8', `${nom} : porte « simulation » absente`)
  }
  if (o.egalite !== false) {
    for (const nom of ENFANTS) if (codeDe(ex[nom], F.NOMS_LOGIQUE[nom]) !== F.CODES[nom]) ko('S6', `${nom} : « ${F.NOMS_LOGIQUE[nom]} » différent de construire.mjs`)
    for (const [nom, js] of Object.entries(F.NOEUDS_CHEF)) if (codeDe(ex[CHEF], nom) !== js) ko('S6', `${CHEF} : « ${nom} » différent de construire.mjs`)
  }
  const registre = o.registre ?? {} // R19 : le registre des empreintes des nœuds Code
  if (o.egalite !== false) for (const nom of NOMS) for (const n of ex[nom].nodes.filter((x) => x.type === T.code)) if (registre[nom]?.[n.name] !== sha(n.parameters.jsCode)) ko('S7', `${nom} : « ${n.name} » ne correspond pas à son empreinte du registre`)
  {
    const wf = ex[CHEF]
    for (const dep of ['Poser le rendez-vous', 'Rappel de la veille', 'Gardien du stock', 'Rien à faire', "Habiller l'import", 'Habiller les créneaux']) if (!aretes(wf, dep).includes(PORTE)) ko('S8', `${CHEF} : « ${dep} » doit passer par la porte « simulation »`)
    const p = wf.connections?.[PORTE]?.main ?? []
    if (!egal((p[0] ?? []).map((l) => l.node), ['Contrat de sortie']) || !egal((p[1] ?? []).map((l) => l.node), [ARRET])) ko('S8', `${CHEF} : la porte doit mener à « Contrat de sortie » (vrai) et à l'arrêt (faux)`)
    const voisins = (nom) => aretes(wf, nom)
    const racine = wf.nodes.find((n) => n.type === T.trigger).name
    const sans = new Set(), f = [racine]
    while (f.length) { const x = f.shift(); if (sans.has(x)) continue; sans.add(x); for (const a of x === PORTE ? [] : voisins(x)) f.push(a) }
    if (sans.has(ARRET)) ko('S8', `${CHEF} : l'arrêt est atteignable sans passer par la porte`)
    const appels = wf.nodes.filter((n) => n.type === T.appel)
    const vises = appels.map((n) => NOMS.find((m) => ids[m] === n.parameters?.workflowId?.value) ?? '?').sort()
    if (!egal(vises, ['lib-agenda-creneaux', 'lib-synchroniser-outil'])) ko('S9', `${CHEF} : appelle ${vises.join(', ')} (lib-agenda-creneaux et lib-synchroniser-outil attendus)`)
    for (const n of appels) if (n.onError !== 'continueRegularOutput' || n.parameters?.source !== 'database') ko('S9', `${CHEF} : ${n.name} doit être en source database, un échec ne fait pas échouer le passage`)
    const b = ex[BANC]
    for (const n of b.nodes.filter((x) => x.type === T.appel)) { if (!Object.values(ids).includes(n.parameters?.workflowId?.value)) ko('S9', `${BANC} : ${n.name} appelle un workflow inconnu`); if (n.onError !== 'continueRegularOutput') ko('S9', `${BANC} : ${n.name} : un échec ne doit pas faire échouer le banc`) }
    if (b.nodes.filter((x) => x.type === T.appel).length !== 10) ko('S9', `${BANC} : dix cas attendus`)
  }
  // S10 — la décision 5, lue dans le VRAI code : aucun type « rendez-vous », « rappel de rendez-vous » ou « commande » dans la liste fermée du pilote
  {
    const src = o.regles ?? ''
    const bloc = /export const OUTIL_TYPE[^=]*=\s*\{([\s\S]*?)\n\}/.exec(src)?.[1]
    if (!bloc) ko('S10', 'OUTIL_TYPE introuvable dans lib/pilote/regles.ts')
    else if (INTERDITS_OUTIL_TYPE.test(bloc.replace(/relancer_commande: 'assistant_client',/, ''))) ko('S10', `OUTIL_TYPE contient un type de rendez-vous ou de commande (décision 5 : il n'y entre pas) : ${bloc.match(INTERDITS_OUTIL_TYPE)?.[0]}`)
    const types = /export const TYPES_PILOTE[^=]*=\s*\[([\s\S]*?)\]/.exec(src)?.[1] ?? ''
    if (INTERDITS_OUTIL_TYPE.test(types)) ko('S10', 'TYPES_PILOTE contient un type de rendez-vous')
  }
  if (e.some((m) => m.startsWith('S'))) return e

  // C — le gabarit « Contrat » rejoué
  for (const nom of [CHEF, ...ENFANTS]) {
    const hors = executer(ex[nom], [{ x: 1 }], { W })
    if (hors.erreur || sortie1(hors)?.statut !== 'rejete') ko('C1', `${nom} : une entrée hors contrat doit être rejetée`)
    else if (effets(sortie1(hors)).length || sortie1(hors).effets_faits.length) ko('C1', `${nom} : une entrée hors contrat ne doit produire aucun effet`)
  }
  const envs = { [CHEF]: F.operations('stock', { stock: F.stockFictif() }), 'lib-agenda-creneaux': F.agendaEnfant(F.donneesAgenda()), 'lib-synchroniser-outil': F.syncEnfant(F.donneesSync()) }
  for (const nom of [CHEF, ...ENFANTS]) {
    const r = executer(ex[nom], [{ ...envs[nom], simulation: false }], { W })
    if (!r.erreur || !/Hors simulation/.test(r.erreur) || r.sorties.length) ko('C2', `${nom} : hors simulation, le travail doit s'arrêter à « ${ARRET} » sans sortie (${r.erreur ?? 'aucune erreur'})`)
  }
  {
    const contact = executer(ex['lib-agenda-creneaux'], [F.agendaEnfant(F.donneesAgenda({ rendez_vous_ref: 'jean.dupont@exemple.fr' }))], { W })
    if (sortie1(contact)?.statut !== 'rejete') ko('C3', 'une adresse e-mail dans la demande d’agenda doit la faire rejeter (aucune donnée personnelle dans ce gabarit)')
  }

  // G — l'agenda : un créneau vient de l'agenda lu, ou il n'existe pas
  {
    const D = F.donneesAgenda(), C = F.configAgenda()
    const sg = agenda(D, C)
    if (!sg || sg.statut !== 'ok') ko('G1', `lib-agenda-creneaux n'a pas rendu de créneaux (${sg?.statut} ${JSON.stringify(sg?.erreurs)})`)
    else {
      const att = creneauxAttendus(D, C)
      const rendus = sg.resultat.creneaux.map((x) => ({ debut: x.debut, fin: x.fin }))
      if (!egal(rendus, att)) ko('G1', `les créneaux ne sont pas ceux que le calcul refait ici donne (${JSON.stringify(rendus.map((x) => x.debut))} contre ${JSON.stringify(att.map((x) => x.debut))})`)
      if (rendus.length < 1 || rendus.length > 3) ko('G2', 'au moins un et au plus trois créneaux')
      for (const c of sg.resultat.creneaux) {
        if (D.agenda.occupe.some((b) => Date.parse(c.debut) < Date.parse(b.fin) && Date.parse(c.fin) > Date.parse(b.debut))) ko('G3', `le créneau ${c.debut} chevauche un bloc occupé de l'agenda`)
        if (!(/^lu dans google_agenda le 03\/11\/2026$/.test(c.source))) ko('G4', `le créneau ${c.debut} ne dit pas où il a été lu : « ${c.source} »`)
      }
      const carte = sg.effets_prevus.find((x) => x.effet === 'preparer_carte')
      if (!carte || carte.statut !== 'a_valider' || carte.type_action !== 'proposer_creneaux' || !egal(carte.creneaux, rendus)) ko('G5', 'la proposition doit être une carte « à valider » portant les mêmes créneaux')
      if (!sansEnvoi(sg) || sg.effets_prevus.some((x) => ECRITURES.test(x.effet)) || sg.effets_faits.length) ko('G5', `aucun rendez-vous ne se pose ici, rien ne s'envoie : ${sg.effets_prevus.map((x) => x.effet)}`)
      if (!egal(agenda(D, C), sg)) ko('G6', 'rejoué, le calcul doit être identique')
    }
    // agenda illisible, ancien, du futur, d'un autre compte, interrupteur coupé : AUCUN créneau, et la carte le dit
    for (const [nom, ag, motif] of [['illisible', F.agendaFictif({ lue: false, lu_le: null, couvre: null, occupe: [] }), 'agenda_illisible'], ['lu sans date', F.agendaFictif({ lu_le: null }), 'agenda_illisible'],
      ['sans plage couverte', F.agendaFictif({ couvre: null }), 'agenda_illisible'], ['trop ancien', F.agendaFictif({ lu_le: '2026-11-03T06:00:00.000Z' }), 'agenda_trop_ancien'], ['daté du futur', F.agendaFictif({ lu_le: '2026-11-03T09:00:00.000Z' }), 'agenda_illisible']]) {
      const s = agenda(F.donneesAgenda({ agenda: ag }))
      const k = s?.effets_prevus?.find((x) => x.effet === 'preparer_carte')
      if (!s || s.statut !== 'ok' || s.resultat.creneaux.length || !k || k.creneaux.length || s.resultat.etat !== motif || !/aucun créneau/i.test(k.texte)) ko('G7', `agenda ${nom} : aucun créneau, et la carte doit le dire (obtenu : ${s?.statut} ${JSON.stringify(s?.resultat?.creneaux?.length)} ${s?.resultat?.etat})`)
    }
    const autre = agenda(F.donneesAgenda({ agenda: F.agendaFictif({ artisan_id: ORG2 }) }))
    const autre2 = agenda(F.donneesAgenda({ agenda: F.agendaFictif({ occupe: [{ ...F.BLOCS_OCCUPES[0], artisan_id: ORG2 }] }) }))
    if (autre?.statut !== 'refuse' || effets(autre).length || autre2?.statut !== 'refuse' || effets(autre2).length) ko('G8', "l'agenda d'un autre compte (ou un de ses blocs) doit faire refuser la recherche")
    const coupe = agenda(D, F.configAgenda({ interrupteur_general: false }))
    if (coupe?.statut !== 'rien_a_faire' || effets(coupe).length || coupe.resultat.creneaux.length) ko('G9', 'interrupteur coupé : aucun créneau')
    const pleine = agenda(F.donneesAgenda({ agenda: F.agendaFictif({ occupe: [F.BLOCS_OCCUPES[0] && { artisan_id: ORG, debut: '2026-11-03T00:00:00.000Z', fin: '2026-11-10T00:00:00.000Z' }] }) }))
    if (pleine?.resultat?.creneaux?.length !== 0 || !/Aucun créneau libre/.test(pleine?.effets_prevus?.[0]?.texte ?? '')) ko('G10', 'semaine pleine : aucun créneau inventé, et la carte le dit')
    const hors = agenda(F.donneesAgenda({ fenetre: { du: '2026-11-10', au: '2026-11-12' } }))
    if (hors?.resultat?.creneaux?.length) ko('G11', "hors de la plage que la lecture couvre (3 au 9 novembre), aucun créneau n'existe")
    const large = agenda(F.donneesAgenda({ fenetre: { du: '2026-11-03', au: '2026-12-30' } }))
    if (large?.statut !== 'refuse') ko('G12', 'une fenêtre de plus de quatorze jours doit être refusée')
    const dp = agenda(F.donneesAgenda({ deja_propose: ['cr:2026-11-03T12:00'] }))
    if (dp?.resultat?.creneaux?.some((x) => x.debut.startsWith('2026-11-03T12:00'))) ko('G13', 'un créneau déjà proposé ne repart pas')
    // 200 agendas tirés au hasard : le juge confronte chaque sortie à son propre calcul, et vérifie les propriétés qui comptent
    let graine = 11
    const alea = () => { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine / 0x7fffffff }
    let fautes = 0
    for (let i = 0; i < 200; i++) {
      const n = Math.floor(alea() * 12)
      const occupe = Array.from({ length: n }, () => { const debut = Date.parse('2026-11-03T06:00:00Z') + Math.floor(alea() * 6 * 96) * 15 * 60000; return { artisan_id: ORG, debut: new Date(debut).toISOString(), fin: new Date(debut + (1 + Math.floor(alea() * 12)) * 15 * 60000).toISOString() } })
      const cfg = F.configAgenda({ duree_min: [30, 45, 60, 90, 120][Math.floor(alea() * 5)], marge_min: [0, 60, 120, 600][Math.floor(alea() * 4)], max_creneaux: 1 + Math.floor(alea() * 3), horaires: { jours_permis: [[1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6], [2, 4], [6, 7]][Math.floor(alea() * 4)], heures_permises: { debut: ['07:30', '08:00', '09:00'][Math.floor(alea() * 3)], fin: ['12:00', '17:00', '19:30'][Math.floor(alea() * 3)] } } })
      const don = F.donneesAgenda({ agenda: F.agendaFictif({ occupe, lu_le: alea() < 0.15 ? '2026-11-03T02:00:00.000Z' : '2026-11-03T07:45:00.000Z', lue: alea() > 0.1 }), deja_propose: [] })
      const s = agenda(don, cfg)
      const att = creneauxAttendus(don, cfg)
      const rendus = (s?.resultat?.creneaux ?? []).map((x) => ({ debut: x.debut, fin: x.fin }))
      if (!s || s.statut !== 'ok' || !egal(rendus, att)) fautes++
      for (const c of rendus) {
        const l = local(Date.parse(c.debut))
        if (occupe.some((b) => Date.parse(c.debut) < Date.parse(b.fin) && Date.parse(c.fin) > Date.parse(b.debut))) fautes++
        if (!cfg.horaires.jours_permis.includes(semaine(l.jour)) || Date.parse(c.debut) < Date.parse(don.maintenant) + cfg.marge_min * 60000) fautes++
      }
      if (rendus.length > cfg.max_creneaux || rendus.length > 3) fautes++
      if (!don.agenda.lue && rendus.length) fautes++
    }
    if (fautes) ko('G14', `${fautes} écart(s) entre les créneaux rendus et le calcul refait ici sur 200 agendas tirés au hasard`)
  }

  // D — la décision 5 : le rendez-vous se pose APRÈS le clic de l'artisan, jamais seul
  {
    const poser = (bloc, over = {}) => sortie1(lancer(F.operations('poser', { poser: bloc }, { maintenant: F.MAINTENANT_POSE, ...over })))
    const bon = poser(F.poserFictif())
    if (bon?.statut !== 'ok' || bon.resultat?.etat !== 'pose_prevue' || bon.resultat.pose !== false) ko('D1', `après le clic, la pose doit être PRÉVUE (obtenu ${bon?.statut} ${bon?.resultat?.etat})`)
    else {
      const pr = effets(bon).filter((x) => x.effet === 'poser_rendez_vous')
      if (pr.length !== 1 || pr[0].via !== 'clic_artisan' || pr[0].debut !== F.CRENEAUX_PROPOSES[1].debut || bon.effets_faits.length) ko('D1', 'la pose prévue doit venir du clic, sur le créneau cliqué, sans rien faire')
      if (!/lu dans google_agenda le 03\/11\/2026/.test(bon.resultat.source)) ko('D1', 'la pose doit dire où le créneau a été lu')
    }
    // la matrice : toutes les offres, pilote actif ou non, SANS clic : aucun rendez-vous posé
    let seul = 0
    for (const offre of OFFRES) for (const pilote of [{ drapeau: true, actif: true, types: { reponse_prospect: true, relance_devis: true, assistant_client: true } }, { drapeau: false, actif: false, types: {} }]) {
      for (const sans of [null, { valide_par: 'pilote', valide_le: '2026-11-03T09:30:00.000Z', creneau: F.CRENEAUX_PROPOSES[1] }]) {
        const env = F.operations('poser', { poser: F.poserFictif({ validation: sans }) }, { maintenant: F.MAINTENANT_POSE, config: { ...F.CONFIG_OUVERTE, offre, pilote } })
        const r = sortie1(lancer(env))
        if (sans === null && (r?.statut !== 'refuse' || effets(r).length)) seul++
        if (sans !== null && r?.statut !== 'rejete') seul++ // « pilote » n'est pas « artisan » : le contrat le refuse déjà
        if (r && effets(r).some((x) => x.effet === 'poser_rendez_vous')) seul++
      }
      const avec = sortie1(lancer(F.operations('poser', { poser: F.poserFictif() }, { maintenant: F.MAINTENANT_POSE, config: { ...F.CONFIG_OUVERTE, offre } })))
      if (avec?.statut !== 'ok' || avec.effets_faits.length) seul++
    }
    if (seul) ko('D2', `${seul} cas où un rendez-vous est posé sans le clic de l'artisan, ou où la pose est faite au lieu d'être prévue (Studio, Signature, essentiel, essai ; pilote actif ou non)`)
    const sans = poser(F.poserFictif({ validation: null }))
    if (sans?.resultat?.etat !== 'sans_clic_artisan' || sans.resultat.pose !== false) ko('D2', 'sans clic, le résultat doit dire « sans_clic_artisan » et pose: false')
    // le créneau doit avoir été PROPOSÉ, et être encore libre dans l'agenda RELU
    const inconnu = poser(F.poserFictif({ validation: { valide_par: 'artisan', valide_le: '2026-11-03T09:30:00.000Z', creneau: { debut: '2026-11-03T15:00:00.000Z', fin: '2026-11-03T16:00:00.000Z' } } }))
    if (inconnu?.statut !== 'refuse' || effets(inconnu).length) ko('D3', 'un créneau qui n’a pas été proposé ne se pose pas')
    const pris = poser(F.poserFictif({ agenda: F.agendaFictif({ lu_le: '2026-11-03T09:29:00.000Z', occupe: [...F.BLOCS_OCCUPES, { artisan_id: ORG, debut: '2026-11-03T14:30:00.000Z', fin: '2026-11-03T15:30:00.000Z' }] }) }))
    if (pris?.statut !== 'refuse' || pris.resultat?.etat !== 'plus_libre' || effets(pris).length) ko('D4', 'un créneau qui n’est plus libre dans l’agenda relu ne se pose pas')
    const illisible = poser(F.poserFictif({ agenda: F.agendaFictif({ lue: false, lu_le: null, couvre: null, occupe: [] }) }))
    const ancien = poser(F.poserFictif({ agenda: F.agendaFictif({ lu_le: '2026-11-03T07:00:00.000Z' }) }))
    if (illisible?.statut !== 'refuse' || effets(illisible).length || ancien?.statut !== 'refuse' || effets(ancien).length) ko('D4', 'un agenda illisible ou trop ancien au moment de poser : rien ne se pose')
    const autre = poser(F.poserFictif({ agenda: F.agendaFictif({ artisan_id: ORG2, lu_le: '2026-11-03T09:29:00.000Z' }) }))
    if (autre?.statut !== 'refuse' || effets(autre).length) ko('D5', "l'agenda d'un autre compte ne sert pas à poser un rendez-vous")
    const avant = poser(F.poserFictif({ validation: { valide_par: 'artisan', valide_le: '2026-11-03T08:00:00.000Z', creneau: F.CRENEAUX_PROPOSES[1] } }))
    const futur = poser(F.poserFictif({ validation: { valide_par: 'artisan', valide_le: '2026-11-03T11:00:00.000Z', creneau: F.CRENEAUX_PROPOSES[1] } }))
    if (avant?.statut !== 'refuse' || futur?.statut !== 'refuse') ko('D6', 'un clic antérieur à la proposition, ou daté du futur, ne vaut pas validation')
    const cleVue = effets(bon).find((x) => x.effet === 'poser_rendez_vous')?.cle
    const deja = poser(F.poserFictif({ cles_existantes: [cleVue] }))
    if (deja?.statut !== 'rien_a_faire' || effets(deja).length) ko('D7', 'un rendez-vous déjà posé (même clé) ne se pose pas deux fois')
    if (!egal(poser(F.poserFictif()), bon)) ko('D7', 'rejoué, le résultat doit être identique')
    const absent = sortie1(lancer(F.operations('poser', {}, { maintenant: F.MAINTENANT_POSE })))
    if (absent?.statut !== 'rien_a_faire' || effets(absent).length) ko('D8', 'sans lecture, le chef ne pose rien')
    const rv = sortie1(lancer(F.enveloppe(`${CHEF}@1`, { evenements: [{ type: 'rendez_vous_a_poser' }], maintenant: F.MAINTENANT, creneaux: F.creneauxFictifs() }, F.CONFIG_OUVERTE)))
    if (rv?.statut !== 'ok' || rv.resultat?.genre !== 'creneaux' || effets(rv).some((x) => x.effet === 'poser_rendez_vous')) ko('D9', 'l’événement « rendez_vous_a_poser » du Cerveau propose des créneaux (une carte) et ne pose rien')
  }

  // R — le rappel de la veille
  {
    const rap = (bloc, over = {}) => sortie1(lancer(F.operations('rappel', { rappel: bloc }, { maintenant: F.MAINTENANT_VEILLE, ...over })))
    const sr = rap(F.rappelFictif())
    if (sr?.statut !== 'ok') ko('R1', `le rappel n'a rien rendu (${sr?.statut} ${JSON.stringify(sr?.erreurs)})`)
    else {
      const cartes = sr.resultat.cartes
      const attendus = F.rappelFictif().rendez_vous.filter((r) => local(Date.parse(r.debut)).jour === '2026-11-04' && r.consentement && !r.opposition && r.canal !== 'aucun').map((r) => 'rv:' + r.id).sort()
      if (!egal(cartes.map((c) => c.cle).sort(), attendus) || attendus.length !== 2) ko('R1', `les cartes ne sont pas celles des rendez-vous de demain avec canal consenti (${cartes.map((c) => c.cle)})`)
      if (sr.resultat.sauts.sans_consentement !== 1 || sr.resultat.sauts.opposition !== 1 || sr.resultat.sauts.sans_canal !== 1 || sr.resultat.sauts.pas_demain !== 1) ko('R2', 'sans consentement, opposition, sans canal et autre jour doivent être comptés et écartés')
      for (const c of cartes) {
        if (c.statut !== 'a_valider' || c.type_action !== 'rappel_rendez_vous') ko('R3', 'le rappel doit être une carte « à valider »')
        if (!/STOP/.test(c.texte) || /https?:|www\.|presti/i.test(c.texte) || /\d\s?(€|euros?)/i.test(c.texte) || !/Exemple\. Bâti-Démo/.test(c.texte)) ko('R4', `le texte du rappel doit avoir le STOP, le nom de l'artisan, ni lien, ni montant, ni la marque de la plateforme : « ${c.texte} »`)
      }
      if (!/à 14 h 30/.test(cartes.find((c) => c.cle.endsWith('911')) ? cartes.find((c) => c.cle.endsWith('911')).texte : '') ) ko('R4', 'l’heure du rappel doit être celle de Paris (13 h 30 UTC = 14 h 30)')
      if (!sansEnvoi(sr) || sr.effets_prevus.some((x) => x.effet !== 'preparer_carte' && x.effet !== 'noter_evenement') || sr.effets_faits.length) ko('R5', `un rappel est une carte : jamais un envoi (${sr.effets_prevus.map((x) => x.effet)})`)
      if (!egal(rap(F.rappelFictif()), sr)) ko('R6', 'rejoué, le résultat doit être identique')
    }
    // la plage d'envoi, comparée au VRAI lib/sms/plage.ts exécuté
    let fautes = 0
    INSTANTS.forEach((ms, i) => {
      const jour = plusJours(local(ms).jour, 1)
      const bloc = F.rappelFictif({ rendez_vous: [{ artisan_id: ORG, id: '00000000-0000-4000-8000-000000000999', debut: jour + 'T10:00:00.000Z', canal: 'sms_lien', consentement: true, opposition: false }] })
      const s = rap(bloc, { maintenant: new Date(ms).toISOString() })
      const c = s?.resultat?.cartes?.[0]
      if (!c) { fautes++; return }
      if (c.plage.ok_maintenant !== PLAGE[i].ok) fautes++
      if (Date.parse(c.envoyer_a) !== PLAGE[i].prochain) fautes++
    })
    if (fautes) ko('R7', `${fautes} écart(s) entre la plage d'envoi du rappel et lib/sms/plage.ts exécuté (lundi-samedi 8 h-20 h Paris hors fériés) sur ${INSTANTS.length} instants`)
    const autre = rap(F.rappelFictif({ rendez_vous: [{ ...F.rappelFictif().rendez_vous[0], artisan_id: ORG2 }] }))
    if (autre?.statut !== 'refuse' || effets(autre).length) ko('R8', "le rendez-vous d'un autre compte doit faire refuser les rappels")
    const deja = rap(F.rappelFictif({ cles_existantes: ['rv:00000000-0000-4000-8000-000000000911'] }))
    if (deja?.resultat?.cartes?.length !== 1) ko('R9', 'un rappel déjà préparé (même clé) ne se prépare pas deux fois')
    for (const offre of OFFRES) {
      const s = sortie1(lancer(F.operations('rappel', { rappel: F.rappelFictif() }, { maintenant: F.MAINTENANT_VEILLE, config: { ...F.CONFIG_OUVERTE, offre } })))
      if (!s || s.effets_prevus.some((x) => x.statut && x.statut !== 'a_valider')) ko('R10', `${offre} : un rappel n'est jamais envoyé seul`)
    }
  }

  // T — le gardien du stock
  {
    const stk = (bloc, over = {}) => sortie1(lancer(F.operations('stock', { stock: bloc }, over)))
    const S0 = F.stockFictif()
    const ss = stk(S0)
    if (ss?.statut !== 'ok') ko('T1', `le gardien n'a rien rendu (${ss?.statut} ${JSON.stringify(ss?.erreurs)})`)
    else {
      // le seuil de l'inventaire, lu dans le VRAI code puis refait ici
      if (!/Number\(m\.seuil_alerte\) > 0 && total\(m\) <= Number\(m\.seuil_alerte\)/.test(o.inventaire ?? '')) ko('T2', "la règle du seuil n'est plus celle d'app/api/inventaire/route.ts:70")
      const sous = S0.articles.filter((a) => a.seuil > 0 && a.quantite <= a.seuil && !S0.commandes_ouvertes.includes(a.id))
      const cartes = ss.resultat.cartes
      if (!egal(cartes.map((c) => c.article).sort(), sous.map((a) => a.id).sort()) || sous.length !== 3) ko('T2', `les commandes ne concernent pas exactement les articles sous leur seuil sans commande ouverte (${cartes.map((c) => c.article)})`)
      for (const a of sous) {
        const c = cartes.find((x) => x.article === a.id)
        if (!c) continue
        const f = S0.fournisseurs.find((x) => x.id === a.fournisseur_id)
        const p = S0.prix.find((x) => x.article_id === a.id && x.fournisseur_id === (f && f.id))
        const montant = p && a.qte_reappro ? Math.round(p.prix_ht_centimes * a.qte_reappro) : null
        if (c.montant_centimes !== montant) ko('T3', `${a.nom} : montant ${c.montant_centimes} au lieu de ${montant} (prix × quantité, calculé à part, sinon absent)`)
        if ((c.fournisseur?.id ?? null) !== (f ? f.id : null)) ko('T4', `${a.nom} : le fournisseur doit venir de la liste de l'artisan, ou être « à choisir »`)
        if (c.quantite !== (a.qte_reappro ?? null)) ko('T5', `${a.nom} : la quantité est celle que l'artisan a posée, ou « à saisir »`)
        if (c.statut !== 'a_valider' || c.type_action !== 'commande_fournisseur' || !/jamais seul/.test(c.envoi)) ko('T6', `${a.nom} : une commande est une carte « à valider », jamais envoyée seule`)
        if (!f && !c.a_completer.some((m) => /fournisseur/.test(m))) ko('T4', `${a.nom} : sans fournisseur, la carte doit le dire`)
        if (((f && !p) || a.qte_reappro === null) && !c.a_completer.some((m) => /prix|quantité/.test(m))) ko('T3', `${a.nom} : sans prix ou quantité, la carte doit le dire`)
      }
      const cv = cartes.find((x) => x.article === '00000000-0000-4000-8000-000000000922')
      if (cv && (cv.prix?.a_reverifier !== true || cv.montant_centimes !== null)) ko('T3', 'un prix vu il y a plus de 30 jours est à reverifier ; sans quantité, aucun montant')
      if (ss.effets_prevus.some((x) => x.effet !== 'preparer_carte' && x.effet !== 'noter_evenement') || !sansEnvoi(ss) || ss.effets_faits.length) ko('T6', `une commande n'est jamais envoyée : ${ss.effets_prevus.map((x) => x.effet)}`)
      if (ss.effets_prevus.filter((x) => x.effet === 'preparer_carte').some((x) => x.statut !== 'a_valider')) ko('T6', 'toute commande préparée est « à valider »')
      if (!egal(stk(S0), ss)) ko('T7', 'rejoué, le résultat doit être identique')
    }
    for (const offre of OFFRES) for (const pilote of [{ drapeau: true, actif: true, types: { assistant_client: true } }, { drapeau: false, actif: false, types: {} }]) {
      const s = stk(S0, { config: { ...F.CONFIG_OUVERTE, offre, pilote } })
      if (!s || !sansEnvoi(s) || s.effets_prevus.some((x) => x.effet === 'preparer_carte' && x.statut !== 'a_valider')) ko('T8', `${offre} : une commande ne part jamais seule, pilote actif ou non`)
    }
    const non = stk(F.stockFictif({ source: { lue: false, le: '2026-11-03' } }))
    if (non?.statut !== 'rien_a_faire' || non.resultat?.etat !== 'stock_non_lu' || effets(non).length) ko('T9', 'un stock non lu ne devient pas « rien à commander » : il se dit non lu')
    const autre = stk(F.stockFictif({ articles: [{ ...S0.articles[0], artisan_id: ORG2 }] }))
    if (autre?.statut !== 'refuse' || effets(autre).length) ko('T10', "la ligne d'un autre compte doit faire refuser la lecture du stock")
    const deja = stk(F.stockFictif({ cles_existantes: ['cmd:00000000-0000-4000-8000-000000000921:2026-11-03'] }))
    if (deja?.resultat?.cartes?.length !== 2) ko('T11', 'une commande déjà préparée ce jour (même clé) ne se prépare pas deux fois')
    const etranger = stk(F.stockFictif({ fournisseurs: [{ artisan_id: ORG, id: '00000000-0000-4000-8000-000000000939', nom: 'Exemple. Autre', delai_jours: null }] }))
    if (etranger?.resultat?.cartes?.some((c) => c.fournisseur !== null)) ko('T4', "un fournisseur absent de la liste de l'artisan ne se propose jamais")
    const coupe = sortie1(lancer({ ...F.operations('stock', { stock: S0 }), config: { ...F.CONFIG_OUVERTE, interrupteur_general: false } }))
    if (coupe?.statut !== 'rien_a_faire' || effets(coupe).length) ko('T12', 'interrupteur coupé : le chef ne fait rien (fail-closed)')
  }

  // I — l'import contrôlé
  {
    const D0 = F.donneesSync()
    const ap = sync(D0)
    if (ap?.statut !== 'ok' || ap.resultat?.phase !== 'apercu') ko('I1', `l'aperçu n'est pas rendu (${ap?.statut} ${JSON.stringify(ap?.erreurs)})`)
    else {
      const r = ap.resultat
      const lignes = D0.export.lignes
      // provenance : refaite ici
      const prov = (l) => (l.provenance === 'lu' && l.lu_dans && l.lu_dans.trim() && l.lu_le && l.lu_le <= '2026-11-03') || (l.provenance === 'declare' && l.declare_par === 'artisan')
      const vus = new Set(), attendues = [], sans = [], doublons = []
      for (const l of lignes) { if (vus.has(l.ref_externe)) { doublons.push(l.ref_externe); continue } vus.add(l.ref_externe); if (!prov(l)) { sans.push(l.ref_externe); continue } if (D0.cles_connues.includes('imp:' + l.ref_externe)) continue; attendues.push(l) }
      if (!egal(r.a_importer.map((x) => x.ref_externe), attendues.map((x) => x.ref_externe)) || attendues.length !== 3) ko('I2', `les lignes à importer ne sont pas celles que le calcul refait ici donne (${r.a_importer.map((x) => x.ref_externe)})`)
      if (!egal(r.rejetees.map((x) => x.raison).sort(), [...sans.map(() => 'sans_provenance'), ...doublons.map(() => 'doublon_dans_export')].sort()) || r.totaux.deja_importees !== 1) ko('I3', 'les lignes sans provenance, doublées ou déjà importées doivent être rejetées/comptées')
      for (const x of r.a_importer) if (!/^(lu dans .+ le \d\d\/\d\d\/\d{4}|déclaré par l’artisan)$/.test(x.provenance)) ko('I4', `${x.ref_externe} : chaque donnée porte « lu dans <outil> le <date> » ou « déclaré » : « ${x.provenance} »`)
      const ent = attendues.filter((l) => l.sens === 'entree').reduce((s, l) => s + l.montant_centimes, 0), sor = attendues.filter((l) => l.sens === 'sortie').reduce((s, l) => s + l.montant_centimes, 0)
      if (r.totaux.entrees_centimes !== ent || r.totaux.sorties_centimes !== sor) ko('I5', `totaux ${r.totaux.entrees_centimes}/${r.totaux.sorties_centimes} au lieu de ${ent}/${sor} (calculés par le code, pas par un modèle)`)
      if (effets(ap).some((x) => ECRITURES.test(x.effet)) || !egal(effets(ap).map((x) => x.effet), ['deposer_apercu']) || ap.effets_faits.length) ko('I6', `l'aperçu n'écrit rien (${effets(ap).map((x) => x.effet)})`)
      if (!/lu dans tableur le 03\/11\/2026/.test(r.source)) ko('I4', "l'aperçu doit dire d'où il vient")
      if (!/^[0-9a-f]{14}$/.test(r.empreinte)) ko('I7', "l'aperçu porte une empreinte")
      const autreEmp = sync(F.donneesSync({ export: F.exportFictif({ lignes: F.exportFictif().lignes.map((l, i) => (i === 0 ? { ...l, montant_centimes: l.montant_centimes + 1 } : l)) }) })).resultat.empreinte
      if (autreEmp === r.empreinte) ko('I7', "l'empreinte doit changer quand une ligne change")
      if (!egal(sync(D0), ap)) ko('I8', 'rejoué, l’aperçu doit être identique')
      // l'écriture : seulement avec la validation de l'artisan sur CETTE empreinte
      const valide = { cle_apercu: r.cle_apercu, empreinte: r.empreinte, valide_par: 'artisan', valide_le: '2026-11-03T07:59:00.000Z' }
      const sans1 = sync(F.donneesSync({ phase: 'ecrire', apercu_valide: null }))
      if (sans1?.statut !== 'refuse' || effets(sans1).length || sans1.resultat?.ecrit !== false) ko('I9', 'sans aperçu validé, rien ne s\'écrit')
      const faux = sync(F.donneesSync({ phase: 'ecrire', apercu_valide: { ...valide, empreinte: '0'.repeat(14) } }))
      if (faux?.statut !== 'refuse' || effets(faux).length) ko('I9', "un aperçu validé qui n'est plus celui de l'export (empreinte différente) n'autorise aucune écriture")
      const bonne = sync(F.donneesSync({ phase: 'ecrire', apercu_valide: valide }))
      if (bonne?.statut !== 'ok') ko('I10', `l'écriture validée n'est pas prévue (${bonne?.statut} ${JSON.stringify(bonne?.erreurs)})`)
      else {
        const ec = effets(bonne).filter((x) => x.effet === 'ecrire_ligne')
        if (ec.length !== attendues.length || new Set(ec.map((x) => x.cle)).size !== ec.length || bonne.effets_faits.length || bonne.resultat.ecrit !== false) ko('I10', "une écriture prévue par ligne à importer, par clé, rien de fait")
        if (ec.some((x) => !/^(lu dans .+|déclaré par l’artisan)$/.test(x.corps.source) || x.corps.artisan_id !== ORG || x.cible !== 'mes_chiffres' || !/Mes chiffres/.test(x.via) || !/on_conflict=artisan_id,cle/.test(x.requete))) ko('I11', "chaque écriture porte sa provenance, le compte, la cible « Mes chiffres » et une clé unique")
        if (!egal(sync(F.donneesSync({ phase: 'ecrire', apercu_valide: valide })), bonne)) ko('I8', "rejouée, l'écriture prévue doit être identique")
      }
      const horsListe = sync(F.donneesSync({ phase: 'ecrire', apercu_valide: valide }), F.configSync({ cibles_signees: [] }))
      if (horsListe?.statut !== 'refuse' || effets(horsListe).length) ko('I12', "hors de la liste signée (mes_chiffres), aucune écriture")
      const futur = sync(F.donneesSync({ phase: 'ecrire', apercu_valide: { ...valide, valide_le: '2026-11-03T09:00:00.000Z' } }))
      if (futur?.statut !== 'refuse') ko('I9', 'une validation datée du futur ne vaut pas validation')
    }
    const autre = sync(F.donneesSync({ export: F.exportFictif({ artisan_id: ORG2 }) }))
    if (autre?.statut !== 'refuse' || effets(autre).length) ko('I13', "l'export d'un autre compte doit faire refuser l'import")
    const pages = sync(F.donneesSync({ export: F.exportFictif({ pagination: { pages_lues: 9, derniere_page_vide: false } }) }))
    if (pages?.statut !== 'refuse' || !/pagination_non_bornee/.test(JSON.stringify(pages.erreurs))) ko('I14', 'une pagination qui dépasse le plafond doit être refusée')
    const trop = sync(F.donneesSync(), F.configSync({ max_lignes: 3 }))
    if (trop?.statut !== 'refuse' || !/trop_de_lignes/.test(JSON.stringify(trop.erreurs))) ko('I14', 'un export de plus de lignes que le plafond doit être refusé')
    const coupe = sync(F.donneesSync(), F.configSync({ interrupteur_departement: false }))
    if (coupe?.statut !== 'rien_a_faire' || effets(coupe).length) ko('I15', 'interrupteur coupé : rien ne se lit ni ne s’écrit')
    const mail = executer(ex['lib-synchroniser-outil'], [F.syncEnfant(F.donneesSync({ export: F.exportFictif({ lignes: [{ ...F.exportFictif().lignes[0], libelle: 'jean.dupont@exemple.fr' }] }) }))], { W })
    if (sortie1(mail)?.statut !== 'rejete') ko('I16', "un libellé qui contient une adresse e-mail doit faire rejeter l'import (aucune donnée personnelle)")
    // par la voie du chef : l'import passe par l'enfant, aperçu puis écriture
    const viaChef = sortie1(lancer(F.operations('import', { import: { phase: 'apercu', export: F.exportFictif(), apercu_valide: null, cles_connues: ['imp:exemple-7'] } })))
    if (viaChef?.statut !== 'ok' || viaChef.resultat?.genre !== 'import' || viaChef.resultat.import?.totaux?.lignes !== 3 || effets(viaChef).some((x) => ECRITURES.test(x.effet))) ko('I17', `le chef ne rend pas l'aperçu de l'enfant (${viaChef?.statut} ${viaChef?.erreurs})`)
    const viaChefEcrire = sortie1(lancer(F.operations('import', { import: { phase: 'ecrire', export: F.exportFictif(), apercu_valide: null, cles_connues: [] } })))
    if (viaChefEcrire?.statut !== 'refuse' || effets(viaChefEcrire).length) ko('I17', "par le chef non plus, rien ne s'écrit sans l'aperçu validé")
  }

  // X — le chef : interrupteur et route inconnue
  {
    const coupe = sortie1(lancer({ ...F.operations('rappel', { rappel: F.rappelFictif() }), config: { ...F.CONFIG_OUVERTE, interrupteur_departement: false } }))
    const absent = sortie1(lancer({ ...F.operations('rappel', { rappel: F.rappelFictif() }), config: {} }))
    if (coupe?.statut !== 'rien_a_faire' || effets(coupe).length || absent?.statut !== 'rien_a_faire') ko('X1', 'interrupteur coupé ou absent : le chef ne fait rien (fail-closed)')
    const inconnu = sortie1(lancer(F.enveloppe(`${CHEF}@1`, { evenements: [{ type: 'autre_chose' }], maintenant: F.MAINTENANT }, F.CONFIG_OUVERTE)))
    if (inconnu?.statut !== 'rien_a_faire' || inconnu.resultat?.etat !== 'genre_absent' || effets(inconnu).length) ko('X2', 'un événement inconnu : « genre_absent », aucun effet, aucune supposition')
    const sansLecture = sortie1(lancer(F.enveloppe(`${CHEF}@1`, { evenements: [{ type: 'stock_sous_le_seuil' }], maintenant: F.MAINTENANT }, F.CONFIG_OUVERTE)))
    if (sansLecture?.statut !== 'rien_a_faire' || sansLecture.resultat?.etat !== 'lecture_absente') ko('X3', 'le Cerveau envoie un événement sans lecture : le chef ne doit rien affirmer')
    const rv = sortie1(lancer(F.enveloppe(`${CHEF}@1`, { evenements: [{ type: 'rendez_vous_a_poser' }], maintenant: F.MAINTENANT }, F.CONFIG_OUVERTE)))
    if (rv?.statut !== 'ok' || rv.resultat?.creneaux?.etat !== 'agenda_illisible' || rv.resultat.creneaux.creneaux.length) ko('X4', 'l’événement du Cerveau sans lecture d’agenda : aucun créneau, et la carte le dit')
  }

  // P — le banc et les essais enregistrés dans n8n
  {
    const rb = executer(ex[BANC], [{}], { W })
    if (rb.erreur) ko('P1', `le banc ne se rejoue pas hors ligne : ${rb.erreur}`)
    else {
      const bilans = rb.sorties
      if (bilans.length !== 10 || bilans.some((b) => b.defauts !== 0)) ko('P4', `le bilan du banc : ${bilans.length} passage(s), défauts ${bilans.map((b) => b.defauts)} (dix passages sans défaut attendus)`)
      for (const essai of o.essais ?? []) {
        if (essai.workflow !== BANC) continue
        for (const [nom, passages] of Object.entries(essai.sorties)) {
          const trie = (l) => l.map((x) => JSON.stringify(x)).sort() // « Bilan du banc » arrive une fois par cas : n8n les enchaîne un par un, le rejeu par couches, l'ordre diffère
          const hors = (rb.toutes.get(nom) ?? []).map((i) => i.json)
          if (!egal(trie(hors), trie(passages.flat()))) ko('P1', `${BANC} : « ${nom} » rejoué hors ligne diffère de la sortie enregistrée dans n8n`)
        }
      }
    }
    for (const essai of o.essais ?? []) {
      if (essai.workflow !== CHEF) continue
      const pins = essai.entrees_epinglees
      const env = pins['Appelé par le Cerveau']?.[0]
      const r = executer(ex[CHEF], [env], { W })
      if (r.erreur) { ko('P2', `${CHEF} : essai #${essai.execution} non rejouable (${r.erreur})`); continue }
      for (const [nom, passages] of Object.entries(essai.sorties)) if (!egal((r.run.get(nom) ?? []).map((i) => i.json), passages.flat())) ko('P2', `${CHEF} : « ${nom} » rejoué hors ligne diffère de l'essai #${essai.execution} de n8n`)
      for (const [nom, valeurs] of Object.entries(pins)) if (nom !== 'Appelé par le Cerveau' && !egal((r.run.get(nom) ?? []).map((i) => i.json), valeurs)) ko('P3', `${CHEF} : la sortie épinglée de « ${nom} » n'est pas celle de l'export appelé, rejoué`)
    }
  }
  // N — le contrat versionné
  if (o.contrat !== undefined && !egal(o.contrat, F.contrats()['operations.json'])) ko('N1', 'plans/011-cadrage-01-11/p6-signature/contrats/operations.json diffère de construire.mjs --contrats')
  // K — la compétence « operations » (0193)
  if (o.competence !== undefined) {
    const t = o.competence
    const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(t ?? '')
    if (!m) ko('K1', 'operations : en-tête absent')
    else {
      const fm = Object.fromEntries(m[1].split('\n').map((l) => l.split(/:\s(.*)/s).slice(0, 2)))
      if (fm.departement !== 'operations' || fm.version !== '1' || fm.actif !== 'false' || fm.statut !== 'brouillon' || fm.pose_par !== 'presti') ko('K2', 'operations : brouillon inactif au format de la table competences (0193) attendu')
      const corps = m[2]
      if (corps.trim().length < 800 || corps.trim().length > 8000) ko('K2', `operations : corps de ${corps.trim().length} caractères (800 à 8000 attendus)`)
      if (!/lib\/ai\.ts:428-430/.test(corps) || !/jamais un créneau qui ne vient pas de son agenda/.test(corps) || !/jamais un fournisseur absent de sa liste/.test(corps)) ko('K3', 'operations : les garde-fous anti-fabrication (créneau, fournisseur) manquent')
      if (!/décision 5/.test(corps) || !/après un clic de l['’]artisan/.test(corps)) ko('K3', 'operations : la décision 5 (rendez-vous après un clic) doit y figurer')
      if (/@[A-Za-z0-9-]+\.[a-z]{2,}|\+33|(?:^|\D)0[1-9]( ?\d\d){4}/.test(corps)) ko('K4', 'operations : adresse ou téléphone dans la compétence')
    }
  }
  return e
}

// ─── Chargement ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const lire = (p) => JSON.parse(readFileSync(p, 'utf8'))
const ex = {}
for (const nom of NOMS) { const f = path.join(DOSSIER, `${nom}.workflow.json`); if (!existsSync(f)) { console.error(`✗ ${f} manque`); process.exit(1) }; ex[nom] = lire(f) }
ex.W = new Map(NOMS.map((n) => [ex[n].id, ex[n]]))
const registre = existsSync(path.join(DOSSIER, 'empreintes-code.json')) ? lire(path.join(DOSSIER, 'empreintes-code.json')) : {}
const essais = existsSync(path.join(DOSSIER, 'essais-n8n.json')) ? lire(path.join(DOSSIER, 'essais-n8n.json')) : []
const contratFichier = path.join(RACINE, 'plans/011-cadrage-01-11/p6-signature/contrats/operations.json')
const contrat = existsSync(contratFichier) ? lire(contratFichier) : null
const compFichier = path.join(RACINE, 'plans/011-cadrage-01-11/p6-signature/competences/operations.md')
const competence = existsSync(compFichier) ? readFileSync(compFichier, 'utf8').replace(/\r\n/g, '\n') : null
const regles = readFileSync(path.join(RACINE, 'lib/pilote/regles.ts'), 'utf8')
const inventaire = readFileSync(path.join(RACINE, 'app/api/inventaire/route.ts'), 'utf8')
const options = { registre, essais, contrat: contrat ?? {}, competence: competence ?? '', regles, inventaire }
if (contrat === null) { console.error('✗ contrats/operations.json manque'); process.exit(1) }
const verdict = juger(ex, options)
if (verdict.length) { console.error(`✗ ${verdict.length} manquement(s) :`); for (const m of verdict) console.error('  - ' + m); process.exit(1) }
console.log(`✓ 4 exports (${NOMS.join(', ')}) : structure, gabarit « Contrat », agenda (200 agendas au hasard contre le calcul refait ici), décision 5 (aucun rendez-vous posé sans clic, ${OFFRES.length} offres × pilote actif ou non), rappel de la veille (plage comparée au vrai lib/sms/plage.ts sur ${INSTANTS.length} instants), stock, import contrôlé, compétence, banc et ${essais.length} essai(s) n8n rejoués : identiques`)

// ─── Les mutants : chacun doit faire échouer le juge pour sa raison ─────────────────────────────────────────────────────────────────────────
function jeu() { const c = { W: null }; for (const n of NOMS) c[n] = copie(ex[n]); c.W = new Map(NOMS.map((n) => [c[n].id, c[n]])); return c }
function codeMut(c, wf, noeudNom, de, vers) {
  const n = c[wf].nodes.find((x) => x.name === noeudNom)
  const t = n.parameters.jsCode
  const k = t.split(de).length - 1
  if (k !== 1) throw new Error(`mutant : « ${de.slice(0, 50)} » apparaît ${k} fois dans ${wf}/${noeudNom} (une seule attendue)`)
  n.parameters.jsCode = t.replace(de, () => vers)
}
const M = F.MARQUES
const AG = 'lib-agenda-creneaux', SY = 'lib-synchroniser-outil'
const NA = F.NOMS_LOGIQUE[AG], NS = F.NOMS_LOGIQUE[SY]
const MUTANTS = [
  ['un créneau absent de l’agenda proposé (agenda illisible ignoré)', (c) => codeMut(c, AG, NA, M.lue, 'if (false)'), /^G[17] /],
  ['un créneau qui chevauche un bloc occupé', (c) => codeMut(c, AG, NA, M.occupe, ''), /^G[13] /],
  ['un créneau proposé d’après une lecture trop ancienne', (c) => codeMut(c, AG, NA, M.age, 'if (false)'), /^G7 /],
  ['plus de trois créneaux proposés', (c) => codeMut(c, AG, NA, M.max, ''), /^G[12] /],
  ['trois créneaux le même jour', (c) => codeMut(c, AG, NA, M.par_jour, ''), /^G1 /],
  ['un créneau inventé hors de la plage couverte par la lecture', (c) => codeMut(c, AG, NA, 'const du = d.fenetre.du > ag.couvre.du ? d.fenetre.du : ag.couvre.du, au = d.fenetre.au < ag.couvre.au ? d.fenetre.au : ag.couvre.au;', 'const du = d.fenetre.du, au = d.fenetre.au;'), /^G11 /],
  ['un créneau proposé avant la marge', (c) => codeMut(c, AG, NA, 'if (debut < maintenant + c.marge_min * 60000) continue;', ''), /^G(1|14) /],
  ['l’agenda d’un autre compte lu', (c) => codeMut(c, AG, NA, M.isolation_agenda, 'if (false && ag.occupe.some((x) => x.artisan_id !== org))'), /^G8 /],
  ['une fenêtre de plus de quatorze jours acceptée', (c) => codeMut(c, AG, NA, "> 14 * 86400000) return refuse(j, sim, 'agenda_refuse', 'fenetre_trop_large : quatorze jours au plus');", '> 14 * 86400000 * 99) return refuse(j, sim, \'agenda_refuse\', \'fenetre_trop_large\');'), /^G12 /],
  ['un créneau déjà proposé qui repart', (c) => codeMut(c, AG, NA, 'if (dejaP.has(k)) continue;', ''), /^G13 /],
  ['un rendez-vous posé seul en Signature (le clic n’est plus exigé)', (c) => codeMut(c, CHEF, 'Poser le rendez-vous', M.clic, 'if (false)'), /^D2 /],
  ['un rendez-vous posé sur un créneau jamais proposé', (c) => codeMut(c, CHEF, 'Poser le rendez-vous', M.creneau_propose, 'if (false)'), /^D3 /],
  ['un rendez-vous posé sur un créneau qui n’est plus libre', (c) => codeMut(c, CHEF, 'Poser le rendez-vous', M.encore_libre, 'if (false)'), /^D4 /],
  ['un rendez-vous posé d’après l’agenda d’un autre compte', (c) => codeMut(c, CHEF, 'Poser le rendez-vous', M.isolation_poser, 'if (false && a.occupe.some((x) => x.artisan_id !== org))'), /^D5 /],
  ['un rendez-vous posé au lieu d’être prévu (effet fait)', (c) => codeMut(c, CHEF, 'Contrat de sortie', "'effets_faits': simulation || rejete ? [] : liste(j.effets_faits),", "'effets_faits': liste(j.effets_prevus),"), /^(S5|S6|S7|D1|D2)/],
  ['une pose sans clic en Signature, pilote actif (clic remplacé par l’offre)', (c) => codeMut(c, CHEF, 'Poser le rendez-vous', M.clic, "if (c.offre !== 'signature' && (!v || v.valide_par !== 'artisan'))"), /^D2 /],
  ['« rendez-vous posé » ajouté à la liste fermée du pilote', (c, opt) => { opt.regles = opt.regles.replace("  relancer_commande: 'assistant_client',", "  relancer_commande: 'assistant_client',\n  poser_rendez_vous: 'rendez_vous',") }, /^S10 /],
  ['un rappel envoyé seul (effet d’envoi)', (c) => codeMut(c, CHEF, 'Rappel de la veille', "effets.push({ effet: 'preparer_carte', organisation_id: org, cle: cle, type_action: 'rappel_rendez_vous'", "effets.push({ effet: 'envoyer_sms', organisation_id: org, cle: cle, type_action: 'rappel_rendez_vous'"), /^R5 /],
  ['un rappel sans consentement', (c) => codeMut(c, CHEF, 'Rappel de la veille', M.consentement, ''), /^R[12] /],
  ['un rappel malgré l’opposition (STOP)', (c) => codeMut(c, CHEF, 'Rappel de la veille', M.opposition, ''), /^R[12] /],
  ['la plage d’envoi ignorée', (c) => codeMut(c, CHEF, 'Rappel de la veille', M.envoi, 'const envoi = maintenant;'), /^R7 /],
  ['un rappel sans le STOP', (c) => codeMut(c, CHEF, 'Rappel de la veille', "Pour ne plus recevoir ces messages, répondez STOP.", 'Merci.'), /^R4 /],
  ['le nom de la plateforme dans le rappel', (c) => codeMut(c, CHEF, 'Rappel de la veille', "'Bonjour, ceci est un rappel de votre rendez-vous demain à '", "'Presti : un rappel de votre rendez-vous demain à '"), /^R4 /],
  ['un rappel pour un rendez-vous d’un autre jour', (c) => codeMut(c, CHEF, 'Rappel de la veille', 'if (parisJour(debut) !== demain) { sauts.pas_demain++; continue; }', ''), /^R[12] /],
  ['un rendez-vous d’un autre compte lu (rappel)', (c) => codeMut(c, CHEF, 'Rappel de la veille', "if (r0.rendez_vous.some((x) => x.artisan_id !== org))", 'if (false)'), /^R8 /],
  ['une commande envoyée seule', (c) => codeMut(c, CHEF, 'Gardien du stock', "effets.push({ effet: 'preparer_carte', organisation_id: org, cle: cle, type_action: 'commande_fournisseur', statut: 'a_valider'", "effets.push({ effet: 'envoyer_commande', organisation_id: org, cle: cle, type_action: 'commande_fournisseur', statut: 'envoyee'"), /^T[68] /],
  ['une commande qui se déclare déjà validée', (c) => codeMut(c, CHEF, 'Gardien du stock', "const carte = { cle: cle, type_action: 'commande_fournisseur', statut: 'a_valider'", "const carte = { cle: cle, type_action: 'commande_fournisseur', statut: 'validee'"), /^T6 /],
  ['un montant deviné (prix inventé)', (c) => codeMut(c, CHEF, 'Gardien du stock', M.montant, 'const montant = qte !== null ? Math.round((prix ? prix.prix_ht_centimes : 500) * qte) : null;'), /^T3 /],
  ['un fournisseur absent de la liste de l’artisan', (c) => codeMut(c, CHEF, 'Gardien du stock', M.fournisseur, "const f = a.fournisseur_id === null ? { id: '00000000-0000-4000-8000-000000000939', nom: 'Exemple. Inventé', delai_jours: null } : fourn.get(a.fournisseur_id) || null;"), /^T[34] /],
  ['une quantité inventée', (c) => codeMut(c, CHEF, 'Gardien du stock', "const qte = typeof a.qte_reappro === 'number' && a.qte_reappro > 0 ? a.qte_reappro : null;", "const qte = typeof a.qte_reappro === 'number' && a.qte_reappro > 0 ? a.qte_reappro : a.seuil * 2;"), /^T[35] /],
  ['le seuil de l’inventaire ignoré', (c) => codeMut(c, CHEF, 'Gardien du stock', M.seuil, 'if (!(a.quantite < 1000)) continue;'), /^T2 /],
  ['une commande déjà ouverte reprépare une commande', (c) => codeMut(c, CHEF, 'Gardien du stock', M.commande_ouverte, ''), /^T2 /],
  ['un stock non lu devenu « rien à commander »', (c) => codeMut(c, CHEF, 'Gardien du stock', 'if (!s.source.lue) return', 'if (false) return'), /^T9 /],
  ['la ligne d’un autre compte lue (stock)', (c) => codeMut(c, CHEF, 'Gardien du stock', M.isolation_stock, 'if (false)'), /^T10 /],
  ['un import écrit sans aperçu validé', (c) => codeMut(c, SY, NS, M.validation_import, 'if (false)'), /^I9 /],
  ['un import écrit pendant l’aperçu', (c) => codeMut(c, SY, NS, "if (d.phase === 'apercu') {", 'if (false) {'), /^I[1269] /],
  ['une donnée sans provenance importée', (c) => codeMut(c, SY, NS, M.provenance, 'if (false) { continue; }'), /^I[234] /],
  ['une provenance « lu » sans outil ni date acceptée', (c) => codeMut(c, SY, NS, "(l.provenance === 'lu' && typeof l.lu_dans === 'string' && l.lu_dans.trim() !== '' && typeof l.lu_le === 'string' && l.lu_le <= jourMax)", "(l.provenance === 'lu')"), /^I[234] /],
  ['une écriture vers une cible hors de la liste signée', (c) => codeMut(c, SY, NS, M.cible, 'if (false)'), /^I12 /],
  ['un doublon de l’export écrit deux fois', (c) => codeMut(c, SY, NS, M.doublon_export, ''), /^I[23] /],
  ['l’export d’un autre compte lu', (c) => codeMut(c, SY, NS, M.isolation_export, 'if (false)'), /^I13 /],
  ['une pagination non bornée', (c) => codeMut(c, SY, NS, 'if (ex.pagination.pages_lues > c.max_pages)', 'if (false)'), /^I14 /],
  ['une ligne déjà importée réécrite', (c) => codeMut(c, SY, NS, "if (connues.has('imp:' + l.ref_externe)) { dejaImportees++; continue; }", ''), /^I[23] /],
  ['un total calculé à la place du code (arrondi inventé)', (c) => codeMut(c, SY, NS, "const entrees = aImporter.filter((x) => x.sens === 'entree').reduce((s, x) => s + x.montant_centimes, 0)", "const entrees = Math.round(aImporter.filter((x) => x.sens === 'entree').reduce((s, x) => s + x.montant_centimes, 0) / 30000) * 30000"), /^I5 /],
  ['un nœud de modèle ajouté', (c) => { c[AG].nodes.push({ id: 'x', name: 'Choisir un créneau', type: '@n8n/n8n-nodes-langchain.agent', typeVersion: 3, position: [0, 0], parameters: {} }) }, /^S3 /],
  ['un nœud Google Agenda ajouté', (c) => { c[AG].nodes.push({ id: 'g', name: 'Lire l’agenda', type: 'n8n-nodes-base.googleCalendar', typeVersion: 1.3, position: [0, 0], parameters: {} }) }, /^S3 /],
  ['un nœud HTTP ajouté', (c) => { c[CHEF].nodes.push({ id: 'h', name: 'Lire', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [0, 0], parameters: {} }) }, /^S3 /],
  ['un nœud d’envoi ajouté', (c) => { c[CHEF].nodes.push({ id: 'm', name: 'Envoyer', type: 'n8n-nodes-base.emailSend', typeVersion: 2, position: [0, 0], parameters: {} }) }, /^S3 /],
  ['la porte « simulation » contournée', (c) => { c[CHEF].connections['Poser le rendez-vous'].main[0] = [{ node: 'Contrat de sortie', type: 'main', index: 0 }] }, /^S8 /],
  ['un workflow publié', (c) => { c[CHEF].active = true }, /^S1 /],
  ['un identifiant ajouté', (c) => { c[SY].nodes[1].credentials = { googleCalendarOAuth2Api: { id: '1', name: 'x' } } }, /^S2 /],
  ['un appelant « any »', (c) => { c[AG].settings.callerPolicy = 'any' }, /^S4 /],
  ['l’identifiant du chef changé (le Cerveau ne le trouverait plus)', (c) => { c[CHEF].id = 'AAAAAAAAAAAAAAAA' }, /^S4 /],
  ['le gabarit « Contrat d’entrée » affaibli', (c) => { const n = c[SY].nodes.find((x) => x.name === "Contrat d'entrée"); n.parameters.jsCode = n.parameters.jsCode.replace('if (s.additionalProperties === false)', 'if (false)') }, /^S5 /],
  ['un octet changé dans un nœud Code', (c) => { const n = c[CHEF].nodes.find((x) => x.name === 'Rien à faire'); n.parameters.jsCode += ' ' }, /^S7 /],
  ['un appel de sous-workflow qui fait échouer le banc', (c) => { delete c[BANC].nodes.find((x) => x.name === 'Appeler lib-agenda-creneaux (6)').onError }, /^S9 /],
]
let ok = true
for (const [nom, fait, attendu] of MUTANTS) {
  const c = jeu()
  const opt = { ...options }
  fait(c, opt)
  const sortie = juger(c, { ...opt, egalite: /^(un octet|le gabarit|un rendez-vous posé au lieu)/.test(nom) ? undefined : false })
  const bon = sortie.some((m) => attendu.test(m))
  console.log(`  ${bon ? '✓' : '✗'} mutant « ${nom} » ${bon ? 'fait rougir le juge' : 'N’A PAS fait rougir le juge'}${bon ? `\n      → ${sortie.find((m) => attendu.test(m)).slice(0, 150)}` : ` (obtenu : ${sortie.slice(0, 3).join(' | ') || 'rien'})`}`)
  if (!bon) ok = false
}
console.log(`operations-n8n-qa : ${MUTANTS.length} mutants`)
if (!ok) process.exit(1)
console.log('OK')
