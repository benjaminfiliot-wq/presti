// JUGE HORS LIGNE du département Direction (tâche 036-007, prompt 6, lot 7). Aucun réseau, aucune base, aucun modèle, aucune donnée réelle.
// Il lit les exports (le JSON rendu par le MCP `get_workflow_details`) de presti-dep-direction, lib-alerte-liste, lib-cout-ia et du banc presti-banc-direction
// dans .orchestre/preuves/036-007/, et :
//   S  — leur STRUCTURE : inactifs ; aucun identifiant ; aucun nœud réseau, d'envoi ni de modèle ; réglages (workflow d'erreur, Europe/Paris, délai,
//        appelants en liste exacte) ; le gabarit « Contrat » de 035-003 à l'identique ; chaque nœud Code égal à celui de construire.mjs et à son empreinte ;
//        la porte « simulation » avant toute sortie ; le chef appelle la liste fermée pour toute alerte, y compris celle du coût.
//   C  — le gabarit « Contrat » REJOUÉ : hors contrat, rien ; hors simulation, l'arrêt.
//   M  — la page du matin : l'argent d'abord, les trois priorités IDENTIQUES à celles du vrai `composerPriorites` (lib/assistant/briefing.ts, exécuté),
//        les comptes égaux à ceux du vrai `composerBriefing`, elle se TERMINE PAR DES CARTES, chaque chiffre avec sa source et sa date, un zéro jamais inventé.
//   L  — le rapport du lundi : euros calculés à part, une relance n'est créditée que si elle PRÉCÈDE la signature, aucun mot de gain, la demande préparée
//        pour lib-rapport-hebdo est acceptée par son export (035-005) et rend des comptes égaux aux nôtres.
//   D  — le diagnostic : jamais estimé, « pas encore de données » sans données, un bloc non lu n'est pas un zéro.
//   A  — l'agent Alerte : LISTE FERMÉE (sept types, chacun son responsable, écrite ici indépendamment), 300 événements tirés au hasard, heures calmes,
//        plafond du jour, clé d'idempotence, texte sans donnée de client.
//   K  — le coût IA : arithmétique refaite ici, part externe à part, un appel sans tarif daté jamais chiffré, plafond, dérive, doublon, deux comptes.
//   R  — les compétences par département : brouillon, inactives, au format de la table `competences` (0193), garde-fous anti-fabrication et marque blanche.
//   P  — le banc et le chef REJOUÉS hors ligne : mêmes sorties que celles enregistrées dans n8n (essais-n8n.json), pins comprises.
// Puis il prouve qu'il sait rougir : chaque MUTANT (un chiffre sans source, un mot de gain, une alerte hors liste, une page qui finit par une action, un coût
// calculé par le modèle, un diagnostic estimé sans données…) doit le faire échouer pour sa raison.
//   node scripts/direction-n8n-qa.mjs [dossier des exports]
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.resolve(RACINE, process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '.orchestre/preuves/036-007')
const F = await import(pathToFileURL(path.join(RACINE, '.orchestre/preuves/036-007/construire.mjs')).href)
const F3 = await import(pathToFileURL(path.join(RACINE, '.orchestre/preuves/035-003/construire.mjs')).href)
const F5 = await import(pathToFileURL(path.join(RACINE, '.orchestre/preuves/035-005/construire.mjs')).href)
const CHEF = F.CHEF, BANC = F.BANC, ENFANTS = F.ENFANTS
const NOMS = [CHEF, ...ENFANTS, BANC]
const T = { trigger: 'n8n-nodes-base.executeWorkflowTrigger', horloge: 'n8n-nodes-base.scheduleTrigger', code: 'n8n-nodes-base.code', si: 'n8n-nodes-base.if', arret: 'n8n-nodes-base.stopAndError',
  note: 'n8n-nodes-base.stickyNote', appel: 'n8n-nodes-base.executeWorkflow' }
const PORTE = 'Porte simulation', ARRET = 'Hors simulation : non branché'
const sha = (t) => createHash('sha256').update(String(t), 'utf8').digest('hex')
const copie = (o) => JSON.parse(JSON.stringify(o))
const norm = (t) => String(t).replace(/[  ]/g, ' ')
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const EMPREINTE_ENTREE = '20f6ff371969130e45b37ea58466baaa9b4581f7dbe145863a2f4a1a57713899'
const EMPREINTE_SORTIE = '8f0f37c68d78f3154204655b3f5343889c5c74733c8b852f27e34bc517394a70'
const GAIN = new RegExp(F.MOTS_DE_GAIN, 'i')
// Ce que dit le PLAN (A8, p6:110), écrit ici sans lire le code : la liste fermée des alertes et leur responsable.
const LISTE_PLAN = { demande_de_prix_ferme: 'artisan', client_mecontent: 'artisan', litige: 'artisan', message_urgent_tard: 'artisan', impaye_au_dessus_du_seuil: 'artisan', workflow_en_panne: 'benj', cout_qui_derive: 'benj' }
const DEPARTEMENTS = ['accueil', 'devis', 'suivi', 'facturation', 'apres', 'operations', 'direction']
const ORG = F.ORG, ORG2 = F.ORG2

// ─── Le VRAI code de l'application (lib/assistant/briefing.ts), exécuté dans un processus à part ─────────────────────────────────────────
function codeReel(cas) {
  const prog = `const b = await import(${JSON.stringify(pathToFileURL(path.join(RACINE, 'lib/assistant/briefing.ts')).href)});
const d = JSON.parse(process.env.DONNEES);
process.stdout.write(JSON.stringify(d.map((c) => ({ prio: b.composerPriorites(c.prio, new Set(c.exclus)), chiffres: b.composerBriefing(c.brief).chiffres, NB: b.NB_PRIORITES, DEVIS: b.DEVIS_SANS_REPONSE_JOURS }))));`
  return JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', './scripts/ts-loader.mjs', '--input-type=module', '-e', prog],
    { cwd: RACINE, encoding: 'utf8', env: { ...process.env, DONNEES: JSON.stringify(cas) } }))
}
const jours = (de, a) => Math.floor((Date.parse(a + 'T00:00:00Z') - Date.parse(String(de).slice(0, 10) + 'T00:00:00Z')) / 86400000)
function casReel(m, jour) { // construit, pour le vrai code, les entrées de la page à partir des lignes lues — par un calcul écrit ici
  const echus = m.impayes.filter((i) => i.date_echeance && jours(i.date_echeance, jour) > 0).map((i) => ({ id: i.id, numero: i.numero, client: null, montant: i.total_ttc, jours_de_retard: jours(i.date_echeance, jour) }))
  const devis = m.devis.filter((d) => d.envoye_le && jours(d.envoye_le, jour) >= 7).map((d) => ({ id: d.id, numero: d.numero, client: null, montant: d.total_ttc, jours: jours(d.envoye_le, jour) }))
  const demandes = m.demandes.map((l) => ({ id: l.id, nom: null, urgent: l.urgent }))
  const stock = (m.stock || []).map((s) => ({ id: s.id, article: s.article, reste: s.reste }))
  return { prio: { impayes: echus, devis, demandes, stock }, exclus: m.exclus || [],
    brief: { jour: '03/11/2026', jourIso: jour, conversations: { nb_en_attente: demandes.length, conversations: [] },
      devis: m.devis.map((d) => ({ numero: d.numero, client: null, total_ttc: d.total_ttc, envoye_le: d.envoye_le })),
      factures: { impayes: { nombre: m.impayes.length, en_retard: echus.length, total: { euros: 0, texte: '' }, liste: echus.map((i) => ({ numero: i.numero, client: null, montant: { euros: i.montant, texte: '' }, echeance: null, jours_de_retard: i.jours_de_retard })) } },
      stock: { nb_alertes: 0, alertes: [] } } }
}
const REEL = codeReel([casReel(F.matinFictif(), '2026-11-03'), casReel(F.matinReduit(), '2026-11-03')])

// ─── L'exécuteur hors ligne : les nœuds de l'export, tels quels, dans node:vm ─────────────────────────────────────────────────────────────
function lancerCode(js, items, dollar) {
  const entree = copie(items)
  const ctx = { $input: { all: () => entree, first: () => entree[0], last: () => entree[entree.length - 1] }, $: dollar, console: { log() {} } }
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
  const res = { sorties: [], visites: [], erreur: null, run: new Map() }
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
    const suivants = wf.connections?.[nom]?.main ?? []
    if (!suivants.some((a) => (a ?? []).length)) { if (nom === 'Contrat de sortie' || nom === 'Bilan du banc') for (const it of outs.flat()) res.sorties.push(it.json) }
    outs.forEach((sortie, i) => { for (const l of suivants[i] ?? []) if (sortie.length) file.push([l.node, sortie]) })
  }
  return res
}
const chefEnv = (ex) => (env, o = {}) => executer(ex[CHEF], [env], { W: ex.W, epingles: o.epingles })
const sortie1 = (r) => r.sorties[0]
const effets = (s) => s?.effets_prevus ?? []

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

  // S — la structure
  for (const nom of NOMS) {
    const wf = ex[nom]
    if (wf.active !== false || wf.activeVersionId) ko('S1', `${nom} : doit être inactif et jamais publié`)
    if (wf.nodes.some((n) => n.credentials) || /"credentials"/.test(JSON.stringify(wf.nodes))) ko('S2', `${nom} : aucun identifiant n'est permis`)
    for (const n of wf.nodes) if (![T.trigger, T.horloge, T.code, T.si, T.arret, T.note, T.appel].includes(n.type)) ko('S3', `${nom} : ${n.name} est de type ${n.type} (ni réseau, ni envoi, ni modèle, ni base)`)
    if (/langchain|agent|lmChat|httpRequest|supabase|emailSend|slack|telegram/i.test(JSON.stringify(wf.nodes.map((n) => n.type)))) ko('S3', `${nom} : un nœud de modèle, de réseau ou d'envoi est présent`)
    const s = wf.settings ?? {}
    if (s.errorWorkflow !== F.ERREUR) ko('S4', `${nom} : workflow d'erreur ${s.errorWorkflow} (lib-erreur-commune attendu)`)
    if (s.timezone !== 'Europe/Paris') ko('S4', `${nom} : fuseau ${s.timezone}`)
    if (!(Number.isInteger(s.executionTimeout) && s.executionTimeout >= 1 && s.executionTimeout <= 3600)) ko('S4', `${nom} : délai maximal absent`)
    if (s.saveDataSuccessExecution !== 'none' || s.saveExecutionProgress !== false) ko('S4', `${nom} : les succès ne doivent pas être sauvés`)
    const attendu = nom === BANC ? null : nom === CHEF ? [F.CERVEAU, ids[BANC]] : [ids[CHEF], ids[BANC]]
    if (attendu === null) { if (s.callerPolicy !== 'none') ko('S4', `${nom} : politique d'appel ${s.callerPolicy} (none attendu)`) }
    else if (s.callerPolicy !== 'workflowsFromAList' || !egal(String(s.callerIds ?? '').split(',').sort(), [...attendu].sort())) ko('S4', `${nom} : appelants ${s.callerPolicy}/${s.callerIds} (liste ${attendu.join(', ')} attendue, jamais any)`)
  }
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
  // R19 : le registre des empreintes des nœuds Code
  const registre = o.registre ?? {}
  if (o.egalite !== false) for (const nom of NOMS) for (const n of ex[nom].nodes.filter((x) => x.type === T.code)) if (registre[nom]?.[n.name] !== sha(n.parameters.jsCode)) ko('S7', `${nom} : « ${n.name} » ne correspond pas à son empreinte du registre`)
  // le graphe du chef : chaque route finit à la porte, la porte mène seule à la sortie, l'arrêt n'est atteint que par « faux »
  {
    const wf = ex[CHEF]
    for (const dep of ['Page du matin', 'Rapport du lundi', 'Diagnostic', 'Rien à faire', "Habiller l'alerte", 'Habiller le coût']) if (!aretes(wf, dep).includes(PORTE)) ko('S8', `${CHEF} : « ${dep} » doit passer par la porte « simulation »`)
    const p = wf.connections?.[PORTE]?.main ?? []
    if (!egal((p[0] ?? []).map((l) => l.node), ['Contrat de sortie']) || !egal((p[1] ?? []).map((l) => l.node), [ARRET])) ko('S8', `${CHEF} : la porte doit mener à « Contrat de sortie » (vrai) et à l'arrêt (faux)`)
    const voisins = (nom) => aretes(wf, nom)
    const atteint = (de, vers) => { const vu = new Set(), f = [de]; while (f.length) { const x = f.shift(); if (x === vers) return true; if (vu.has(x)) continue; vu.add(x); f.push(...voisins(x)) } return false }
    const racine = wf.nodes.find((n) => n.type === T.trigger).name
    if (!atteint(racine, 'Contrat de sortie')) ko('S8', `${CHEF} : la sortie n'est pas atteignable`)
    const sans = new Set(), f = [racine]
    while (f.length) { const x = f.shift(); if (sans.has(x)) continue; sans.add(x); for (const a of x === PORTE ? [] : voisins(x)) f.push(a) }
    if (sans.has(ARRET)) ko('S8', `${CHEF} : l'arrêt est atteignable sans passer par la porte`)
    const appels = wf.nodes.filter((n) => n.type === T.appel)
    const vises = appels.map((n) => NOMS.find((m) => ids[m] === n.parameters?.workflowId?.value) ?? '?').sort()
    if (!egal(vises, ['lib-alerte-liste', 'lib-alerte-liste', 'lib-cout-ia'])) ko('S9', `${CHEF} : appelle ${vises.join(', ')} (lib-alerte-liste deux fois et lib-cout-ia attendus)`)
    for (const n of appels) if (n.onError !== 'continueRegularOutput' || n.parameters?.source !== 'database') ko('S9', `${CHEF} : ${n.name} doit être en source database, un échec ne fait pas échouer le passage`)
    if (!atteint('Appeler lib-cout-ia', 'Appeler lib-alerte-liste (coût)')) ko('S9', `${CHEF} : une alerte de coût doit passer par lib-alerte-liste (la liste fermée)`)
    if (!aretes(wf, 'Appeler lib-alerte-liste').includes("Habiller l'alerte") || !aretes(wf, 'Appeler lib-alerte-liste (coût)').includes('Habiller le coût')) ko('S9', `${CHEF} : les appels de lib-alerte-liste doivent être habillés`)
    const b = ex[BANC]
    for (const n of b.nodes.filter((x) => x.type === T.appel)) { if (!Object.values(ids).includes(n.parameters?.workflowId?.value)) ko('S9', `${BANC} : ${n.name} appelle un workflow inconnu`); if (n.onError !== 'continueRegularOutput') ko('S9', `${BANC} : ${n.name} : un échec ne doit pas faire échouer le banc`) }
    if (b.nodes.filter((x) => x.type === T.appel).length !== 10) ko('S9', `${BANC} : dix cas attendus`)
  }
  if (e.some((m) => m.startsWith('S'))) return e

  // C — le gabarit « Contrat » rejoué
  for (const nom of [CHEF, ...ENFANTS]) {
    const hors = executer(ex[nom], [{ x: 1 }], { W })
    if (hors.erreur || sortie1(hors)?.statut !== 'rejete') ko('C1', `${nom} : une entrée hors contrat doit être rejetée`)
    else if (effets(sortie1(hors)).length || sortie1(hors).effets_faits.length) ko('C1', `${nom} : une entrée hors contrat ne doit produire aucun effet`)
  }
  const envs = { [CHEF]: F.direction('matin', { matin: F.matinFictif() }), 'lib-alerte-liste': F.alerteEnfant({ evenements: F.evenementsJour(), cles_deja_alertees: [], alertes_envoyees_aujourdhui: 0, maintenant: '2026-11-03T12:00:00.000Z' }), 'lib-cout-ia': F.coutEnfant(F.coutFictif()) }
  for (const nom of [CHEF, ...ENFANTS]) {
    const r = executer(ex[nom], [{ ...envs[nom], simulation: false }], { W })
    if (!r.erreur || !/Hors simulation/.test(r.erreur) || r.sorties.length) ko('C2', `${nom} : hors simulation, le travail doit s'arrêter à « ${ARRET} » sans sortie (${r.erreur ?? 'aucune erreur'})`)
  }

  // M — la page du matin
  const MATIN = F.matinFictif()
  const rm = lancer(F.direction('matin', { matin: MATIN }))
  const sm = sortie1(rm)
  if (rm.erreur || !sm || sm.statut !== 'ok') ko('M1', `la page du matin n'a pas rendu de page (${rm.erreur ?? sm?.statut})`)
  else {
    const page = sm.resultat.page, blocs = page.blocs
    const reel = REEL[0]
    const lisible = (p) => ({ cle: p.cle, objet: p.objet, famille: p.famille, montant: p.montant, href: p.href, texte: norm(p.texte), detail: norm(p.detail) })
    const prio = blocs.find((b) => b.type === 'priorites')
    if (!prio || !egal(prio.priorites.map(lisible), reel.prio.priorites.map(lisible)) || prio.autres !== reel.prio.autres) ko('M2', `les priorités ne sont pas celles du vrai composerPriorites (${JSON.stringify(prio?.priorites?.map((p) => p.cle))} contre ${JSON.stringify(reel.prio.priorites.map((p) => p.cle))})`)
    if (prio && prio.priorites.length > reel.NB) ko('M2', `plus de ${reel.NB} priorités`)
    if (blocs[0]?.type !== 'argent' || !egal(blocs[0].lignes.map((l) => l.id), ['impayes', 'devis_a_signer', 'demandes_sans_reponse'])) ko('M3', "l'argent doit venir d'abord : impayés, devis à signer, demandes sans réponse")
    if (blocs.at(-1)?.type !== 'cartes' || page.dernier_bloc !== 'cartes') ko('M3', `la page doit se terminer par des cartes (dernier bloc : ${blocs.at(-1)?.type})`)
    if (!blocs.every((b) => b && ['argent', 'priorites', 'cartes'].includes(b.type))) ko('M3', `un bloc n'est ni de l'argent, ni une priorité, ni une carte : ${blocs.map((b) => b?.type).join(', ')}`)
    if (JSON.stringify(blocs).match(/"(action|bouton|envoyer|actions)"\s*:/) || blocs.some((b) => b?.type === 'cartes' && (b.cartes ?? []).some((c) => c.statut !== 'a_valider'))) ko('M3', 'une action, ou une carte déjà validée, figure dans la page')
    const attenduImp = MATIN.impayes.filter((i) => jours(i.date_echeance, '2026-11-03') > 0), attenduDev = MATIN.devis.filter((d) => jours(d.envoye_le, '2026-11-03') >= 7)
    const somme = (l) => l.reduce((s, x) => s + Math.round(x.total_ttc * 100), 0)
    const [li, ld, lq] = blocs.find((b) => b?.type === 'argent')?.lignes ?? [{}, {}, {}]
    if (li.nombre !== attenduImp.length || li.montant_centimes !== somme(attenduImp)) ko('M4', `impayés : ${li.nombre}/${li.montant_centimes} au lieu de ${attenduImp.length}/${somme(attenduImp)}`)
    if (ld.nombre !== attenduDev.length || ld.montant_centimes !== somme(attenduDev)) ko('M4', `devis à signer : ${ld.nombre}/${ld.montant_centimes} au lieu de ${attenduDev.length}/${somme(attenduDev)}`)
    if (lq.nombre !== MATIN.demandes.length || lq.montant_centimes !== null) ko('M4', 'demandes sans réponse : un nombre, jamais un montant')
    for (const l of (blocs.find((b) => b?.type === 'argent')?.lignes ?? [])) if (!(typeof l.source === 'string' && l.source.trim() && /^\d{4}-\d{2}-\d{2}$/.test(l.date ?? ''))) ko('M4', `la ligne « ${l.id} » n'a pas de source ou de date`)
    if (li.nombre !== reel.chiffres.factures_echues || ld.nombre !== reel.chiffres.devis_sans_reponse) ko('M5', `les comptes diffèrent du vrai composerBriefing (${li.nombre}/${ld.nombre} contre ${reel.chiffres.factures_echues}/${reel.chiffres.devis_sans_reponse})`)
    const cartesPage = blocs.find((b) => b?.type === 'cartes')?.cartes ?? []
    if (!egal(cartesPage.map((c) => c.cle), MATIN.cartes.map((c) => c.cle))) ko('M3', 'les cartes de la page ne sont pas celles qui ont été lues')
    const types = effets(sm).map((x) => x.effet)
    if (types.some((t) => !['deposer_page', 'noter_evenement'].includes(t)) || sm.effets_faits.length) ko('M9', `effets inattendus : ${types.join(', ')}`)
    if (/@|\+33|0[1-9]( ?\d\d){4}/.test(JSON.stringify(sm.resultat))) ko('M10', 'adresse ou téléphone dans la page')
    const rm2 = lancer(F.direction('matin', { matin: MATIN }))
    if (!egal(sortie1(rm2), sm)) ko('M8', 'rejouée, la page doit être identique (idempotence)')
    const dej = sortie1(lancer(F.direction('matin', { matin: F.matinFictif({ cles_existantes: ['pm:2026-11-03'] }) })))
    if (dej?.statut !== 'rien_a_faire' || effets(dej).length) ko('M8', 'une page déjà déposée ce jour ne doit rien refaire')
  }
  {
    const sans = sortie1(lancer(F.direction('matin', { matin: F.matinReduit({ sources: { impayes: { lue: false, le: '2026-11-03' }, devis: { lue: true, le: '2026-11-03' }, demandes: { lue: true, le: '2026-11-03' }, cartes: { lue: true, le: '2026-11-03' } } }) })))
    const l = sans?.resultat?.page?.blocs?.[0]?.lignes?.[0]
    if (!l || l.nombre !== null || l.montant_centimes !== null || l.confiance !== 'indisponible' || !/non lus/.test(l.texte)) ko('M6', 'une lecture en erreur doit se dire « non lus », jamais un zéro')
    const autre = sortie1(lancer(F.direction('matin', { matin: F.matinFictif({ impayes: [{ ...MATIN.impayes[0], artisan_id: ORG2 }] }) })))
    if (autre?.statut !== 'refuse' || effets(autre).length) ko('M7', "la ligne d'un autre compte doit faire refuser la page")
  }

  // L — le rapport du lundi
  {
    const LUN = F.lundiFictif()
    const rl = lancer(F.direction('lundi', { lundi: LUN }))
    const sl = sortie1(rl)
    if (rl.erreur || sl?.statut !== 'ok') ko('L1', `le rapport du lundi n'est pas rendu (${rl.erreur ?? sl?.statut})`)
    else {
      const ind = Object.fromEntries(sl.resultat.indicateurs.map((x) => [x.id, x]))
      const jourParis = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
      const dansP = (iso) => jourParis(iso) >= LUN.du && jourParis(iso) <= LUN.au
      const encaisse = LUN.encaissements.filter((x) => dansP(x.paye_le)).reduce((s, x) => s + x.montant_centimes, 0)
      const signes = LUN.devis_signes.filter((x) => dansP(x.signe_le))
      const credit = signes.filter((x) => LUN.relances.some((r) => r.devis_id === x.id && new Date(r.le) < new Date(x.signe_le))) // une relance ne compte que si elle PRÉCÈDE la signature
      if (ind.encaisse?.valeur !== encaisse || ind.devis_signes?.valeur !== signes.reduce((s, x) => s + x.montant_centimes, 0) || ind.signes_apres_relance?.valeur !== credit.reduce((s, x) => s + x.montant_centimes, 0)) ko('L1', `les euros diffèrent du calcul refait ici (${ind.encaisse?.valeur}/${ind.devis_signes?.valeur}/${ind.signes_apres_relance?.valeur})`)
      if (ind.signes_apres_relance?.nombre !== 1) ko('L2', 'seule la relance qui précède la signature doit être créditée')
      for (const x of Object.values(ind)) if (!(typeof x.source === 'string' && x.source.trim() && /^\d{4}-\d{2}-\d{2}$/.test(x.date ?? '') && x.confiance)) ko('L3', `l'indicateur « ${x.id} » n'a pas de source, de date ou de confiance`)
      if (GAIN.test(JSON.stringify(sl.resultat.lignes)) || GAIN.test(JSON.stringify(sl.resultat.indicateurs))) ko('L4', 'un mot de gain figure dans le rapport')
      // la demande préparée pour lib-rapport-hebdo : acceptée par son export, et ses comptes sont les nôtres
      const lr = o.rapport
      if (lr) {
        const dem = sl.resultat.demande_rapport
        const r = executer(lr, [dem], { W: new Map() })
        const so = r.sorties[0]
        if (r.erreur || so?.statut !== 'ok') ko('L5', `lib-rapport-hebdo refuse la demande du chef (${r.erreur ?? so?.statut} ${JSON.stringify(so?.erreurs)})`)
        else {
          const dans = LUN.actions.filter((a) => a.le.slice(0, 10) >= LUN.du && a.le.slice(0, 10) <= LUN.au)
          const attendu = { fait_seul: dans.filter((a) => a.etat === 'fait_seul').length, en_attente: dans.filter((a) => a.etat === 'en_attente').length, echecs: dans.filter((a) => a.etat === 'echec').length }
          if (so.resultat.fait_seul !== attendu.fait_seul || so.resultat.en_attente !== attendu.en_attente || so.resultat.echecs !== attendu.echecs) ko('L5', 'les comptes de lib-rapport-hebdo ne sont pas ceux refaits ici')
          if (GAIN.test(so.resultat.lignes.join(' '))) ko('L4', 'un mot de gain dans le rapport de lib-rapport-hebdo')
        }
      }
      const rejeu = sortie1(lancer(F.direction('lundi', { lundi: LUN })))
      if (!egal(rejeu, sl)) ko('L7', 'rejoué, le rapport doit être identique')
    }
    // relance APRÈS la signature : non créditée
    const apres = sortie1(lancer(F.direction('lundi', { lundi: F.lundiFictif({ relances: [{ artisan_id: ORG, devis_id: '00000000-0000-4000-8000-000000000821', le: '2026-10-30T10:00:00.000Z' }] }) })))
    if (apres?.statut === 'ok' && apres.resultat.indicateurs.find((x) => x.id === 'signes_apres_relance')?.valeur !== 0) ko('L2', 'une relance faite après la signature a été créditée')
    const g1 = sortie1(lancer(F.direction('lundi', { lundi: F.lundiFictif({ bases_de_depart: { relances_preparees: { valeur: 2, source: 'Exemple. un gain de temps annoncé', date: '2026-10-01', confiance: 'declare' } } }) })))
    if (g1?.statut !== 'refuse') ko('L4', 'une base de départ qui parle de gain doit faire refuser le rapport')
    const g2 = sortie1(lancer(F.direction('lundi', { lundi: F.lundiFictif({ kpis: ['gain_de_temps'] }) })))
    if (g2?.statut !== 'refuse') ko('L4', 'un indicateur hors de la liste fermée doit faire refuser le rapport')
    const g3 = sortie1(lancer(F.direction('lundi', { lundi: F.lundiFictif({ bases_de_depart: { echecs: { valeur: 1, source: '', date: '2026-10-01', confiance: 'declare' } } }) })))
    if (g3?.statut !== 'refuse') ko('L6', 'une base de départ sans source doit faire refuser le rapport')
    const g4 = sortie1(lancer(F.direction('lundi', { lundi: F.lundiFictif({ lues: { encaissements: false, devis_signes: true, relances: true, journal: true } }) })))
    if (g4?.resultat?.indicateurs?.find((x) => x.id === 'encaisse')?.valeur !== null) ko('L6', "un paiement non lu ne doit pas devenir un zéro")
  }

  // D — le diagnostic
  {
    const vide = sortie1(lancer(F.direction('diagnostic', { diagnostic: F.diagnosticFictif({ demandes: null, devis: null, depuis: null }) })))
    const rv = vide?.resultat
    if (!rv || rv.pas_de_donnees !== true || !/Pas encore de données/.test(rv.texte) || rv.constats.length || rv.etages.length || /\d/.test(JSON.stringify({ ...rv, titre: '' }).replace(/"periode"[^,]*/g, ''))) ko('D1', 'sans données, le diagnostic doit dire « pas encore de données » sans aucun chiffre')
    const zero = sortie1(lancer(F.direction('diagnostic', { diagnostic: F.diagnosticFictif({ demandes: { recues: 0, sans_reponse: 0, delai_median_min: null }, devis: { envoyes: 0, signes: 0, non_signes_nombre: 0, non_signes_centimes: 0 } }) })))
    if (zero?.resultat?.pas_de_donnees !== true) ko('D4', 'zéro demande et zéro devis : pas encore de données')
    const DG = F.diagnosticFictif()
    const plein = sortie1(lancer(F.direction('diagnostic', { diagnostic: DG })))?.resultat
    const cd = plein?.constats?.find((c) => c.id === 'devis_non_signes'), cq = plein?.constats?.find((c) => c.id === 'demandes_sans_reponse')
    if (!plein || plein.pas_de_donnees !== false || cd?.nombre !== DG.devis.non_signes_nombre || cd?.montant_centimes !== DG.devis.non_signes_centimes || cq?.nombre !== DG.demandes.sans_reponse || cq?.sur !== DG.demandes.recues) ko('D2', 'les constats ne sont pas les nombres lus')
    if (plein && (/estim/i.test(JSON.stringify(plein).replace(/rien n’est estimé/g, '')) || plein.constats.some((c) => !(c.source && /^\d{4}-\d{2}-\d{2}$/.test(c.date))))) ko('D2', 'un constat estimé, ou sans source')
    const partiel = sortie1(lancer(F.direction('diagnostic', { diagnostic: F.diagnosticFictif({ devis: null }) })))?.resultat
    if (!partiel || !egal(partiel.non_disponible, ['devis']) || partiel.constats.some((c) => c.id === 'devis_non_signes')) ko('D3', "un bloc non lu doit être dit « non disponible », jamais un zéro")
  }

  // A — l'agent Alerte
  {
    const al = (donnees, config, org) => sortie1(executer(ex['lib-alerte-liste'], [F.alerteEnfant(donnees, config ?? F.configAlerte())].map((x) => (org ? { ...x, organisation_id: org } : x)), { W }))
    const JOUR = { evenements: F.evenementsJour(), cles_deja_alertees: ['litige:e9'], alertes_envoyees_aujourdhui: 0, maintenant: '2026-11-03T12:00:00.000Z' }
    const sj = al(JOUR)
    if (!sj || sj.statut !== 'ok') ko('A1', "lib-alerte-liste n'a pas rendu d'alertes")
    else {
      const r = sj.resultat
      if (!egal([...r.liste_fermee].sort(), Object.keys(LISTE_PLAN).sort()) || !egal(Object.keys(F.LISTE_ALERTES).sort(), Object.keys(LISTE_PLAN).sort())) ko('A1', "la liste fermée n'est pas celle du plan (A8) : sept types")
      for (const [t, resp] of Object.entries(F.LISTE_ALERTES)) if (LISTE_PLAN[t] !== resp) ko('A1', `le responsable de ${t} n'est pas celui du plan`)
      if (!egal(r.alertes.map((x) => x.type).sort(), ['demande_de_prix_ferme', 'impaye_au_dessus_du_seuil', 'workflow_en_panne'])) ko('A2', `les alertes du jour sont ${r.alertes.map((x) => x.type)} (prix ferme, impayé au-dessus du seuil, workflow en panne attendus)`)
      if (r.ignorees.hors_liste !== 1 || !egal(r.types_hors_liste, ['nouvelle_demande']) || r.ignorees.deja_alertee !== 1 || r.ignorees.hors_condition !== 2) ko('A2', 'les événements hors liste, déjà alertés ou sans condition doivent être comptés et ignorés')
      for (const a of r.alertes) if (a.responsable !== LISTE_PLAN[a.type]) ko('A1', `${a.type} : responsable ${a.responsable}`)
      const lib = F3.SCHEMAS['lib-alerter'].donnees.properties
      for (const x of sj.effets_prevus) {
        if (x.effet === 'alerter' && !(lib.categorie.enum.includes(x.donnees.categorie) && lib.destinataire_role.enum.includes(x.donnees.destinataire_role) && x.donnees.destinataire_role === 'benj' && LISTE_PLAN[x.donnees.categorie] === 'benj')) ko('A10', "l'alerte de Benj n'est pas un contrat lib-alerter@1 valide")
        if (x.effet === 'envoyer_push') {
          if (!/^lib\/push\.ts:105 /.test(x.via)) ko('A7', "le push doit citer lib/push.ts:105")
          if (!Object.keys(x.charge).every((k) => ['titre', 'corps', 'lien'].includes(k)) || /@|\d{6,}|e\d\b|Presti/.test(JSON.stringify(x.charge).replace(/1 000 €/, ''))) ko('A7', 'le texte du push contient autre chose que du texte fixe')
        }
      }
      if (sj.effets_faits.length) ko('A2', 'une alerte a été faite en simulation')
    }
    // nuit : seul le message urgent tard réveille
    const sn = al({ evenements: F.evenementsNuit(), cles_deja_alertees: [], alertes_envoyees_aujourdhui: 0, maintenant: '2026-11-03T22:40:00.000Z' })
    if (!sn || !egal(sn.resultat.alertes.map((x) => x.type), ['message_urgent_tard']) || !egal(sn.resultat.reportees_au_matin.map((x) => x.motif), ['heures_calmes', 'heures_calmes'])) ko('A4', "la nuit, seul un message urgent tard réveille l'artisan ; le reste attend la page du matin")
    // plafond du jour
    const sp = al({ evenements: [F.evenementsJour()[0], F.evenementsJour()[2]], cles_deja_alertees: [], alertes_envoyees_aujourdhui: 4, maintenant: '2026-11-03T12:00:00.000Z' })
    if (!sp || sp.resultat.alertes.length !== 1 || !egal(sp.resultat.reportees_au_matin.map((x) => x.motif), ['plafond_du_jour'])) ko('A5', 'au plafond du jour, une alerte de plus doit être reportée à la page du matin')
    // une alerte déjà envoyée ne repart pas ; le même événement deux fois ne compte qu'une fois
    const ev1 = F.evenementsJour()[0]
    const sd = al({ evenements: [ev1, ev1], cles_deja_alertees: [], alertes_envoyees_aujourdhui: 0, maintenant: '2026-11-03T12:00:00.000Z' })
    const se = al({ evenements: [ev1], cles_deja_alertees: ['demande_de_prix_ferme:e1'], alertes_envoyees_aujourdhui: 0, maintenant: '2026-11-03T12:00:00.000Z' })
    if (!sd || sd.resultat.alertes.length !== 1 || !se || se.resultat.alertes.length !== 0) ko('A6', 'une alerte déjà envoyée, ou doublée, ne doit repartir qu’une seule fois')
    if (!egal(al(JOUR), sj)) ko('A6', 'rejouée, l’évaluation doit être identique')
    // deux comptes, interrupteur
    const sa = al({ ...JOUR, evenements: [{ ...F.evenementsJour()[0], artisan_id: ORG2 }] })
    if (sa?.statut !== 'refuse' || effets(sa).length) ko('A8', "l'événement d'un autre compte doit faire refuser l'évaluation")
    const sc = al(JOUR, F.configAlerte({ interrupteur_departement: false }))
    if (sc?.statut !== 'rien_a_faire' || effets(sc).length) ko('A9', 'interrupteur coupé : personne ne doit être réveillé')
    // 300 événements au hasard : rien ne sort de la liste fermée
    let graine = 7
    const alea = () => { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine / 0x7fffffff }
    const TYPES = [...Object.keys(LISTE_PLAN), 'nouvelle_demande', 'devis_signe', 'facture_payee', 'avis_laisse', 'stock_bas', 'demande_recue', 'rappel_envoye', 'message_recu', 'client_content', 'panne_wifi']
    const evs = Array.from({ length: 100 }, (_, i) => ({ artisan_id: ORG, type: TYPES[Math.floor(alea() * TYPES.length)], cle: 'z' + i, survenu_le: new Date(Date.UTC(2026, 10, 3, Math.floor(alea() * 24), Math.floor(alea() * 60))).toISOString(),
      faits: { ...(alea() < 0.5 ? { prix_ferme: true } : {}), ...(alea() < 0.5 ? { mecontent: true } : {}), ...(alea() < 0.5 ? { litige: true } : {}), ...(alea() < 0.5 ? { urgent: true } : {}), ...(alea() < 0.5 ? { montant_centimes: Math.floor(alea() * 400000) } : {}), ...(alea() < 0.5 ? { workflow: 'presti-boite' } : {}), ...(alea() < 0.5 ? { total_centimes: 80 } : {}) } }))
    let hors = 0
    for (let lot = 0; lot < 3; lot++) {
      const s = al({ evenements: evs, cles_deja_alertees: [], alertes_envoyees_aujourdhui: 0, maintenant: ['2026-11-03T12:00:00.000Z', '2026-11-03T22:00:00.000Z', '2026-11-03T04:00:00.000Z'][lot] })
      for (const a of s?.resultat?.alertes ?? []) if (!(a.type in LISTE_PLAN)) hors++
      for (const x of s?.effets_prevus ?? []) if (x.effet === 'alerter' && !(x.donnees.categorie in LISTE_PLAN)) hors++
      for (const x of s?.effets_prevus ?? []) if (x.effet === 'envoyer_push' && LISTE_PLAN[x.cle.replace(/^al:/, '').split(':')[0]] !== 'artisan') hors++
      if ((s?.resultat?.alertes ?? []).filter((a) => a.responsable === 'artisan').length > 5) hors++
    }
    if (hors) ko('A3', `${hors} alerte(s) hors de la liste fermée, ou envoyée(s) à un autre responsable, sur 300 événements tirés au hasard`)
  }

  // K — le coût IA
  {
    const co = (donnees, config) => sortie1(executer(ex['lib-cout-ia'], [F.coutEnfant(donnees, config ?? F.configCout())], { W }))
    const C = F.coutFictif()
    const sc = co(C)
    if (!sc || sc.statut !== 'ok') ko('K1', "lib-cout-ia n'a pas rendu de coût")
    else {
      // l'arithmétique refaite ici : groupes (département, modèle), millièmes de centime, arrondi au centime supérieur par groupe
      const groupes = new Map()
      const add = (dep, mod, ext, n, mc) => { const k = `${dep}|${mod}`; const g = groupes.get(k) ?? { ext, n: 0, mc: 0 }; g.n += n; g.mc += mc; groupes.set(k, g) }
      for (const r of C.cumul_du_jour) add(r.departement, r.modele, r.externe, r.appels, r.cout_millicentimes)
      const vus = new Set(C.cles_connues)
      let sansTarif = 0, doublons = 0
      for (const a of C.appels) { if (vus.has(a.cle)) { doublons++; continue }; vus.add(a.cle); const date = a.source_tarif && /\d{4}-\d{2}-\d{2}/.test(a.source_tarif); if (!(a.cout_eur !== null && date)) sansTarif++; add(a.departement, a.modele, a.externe, 1, a.cout_eur !== null && date ? Math.round(a.cout_eur * 100000) : 0) }
      let total = 0, externe = 0, nb = 0, nbExt = 0
      for (const g of groupes.values()) { const c = Math.ceil(g.mc / 1000); total += c; nb += g.n; if (g.ext) { externe += c; nbExt += g.n } }
      const r = sc.resultat
      if (r.total_centimes !== total || r.appels !== nb) ko('K1', `total ${r.total_centimes}/${r.appels} au lieu de ${total}/${nb}`)
      if (r.externe_centimes !== externe || r.local_centimes !== total - externe || r.appels_externes !== nbExt) ko('K2', `la part externe n'est pas comptée à part (${r.externe_centimes}/${r.local_centimes} au lieu de ${externe}/${total - externe})`)
      if (r.appels_sans_tarif !== sansTarif || r.doublons_ignores !== doublons) ko('K3', 'appels sans tarif ou doublons mal comptés')
      const sansTar = sc.effets_prevus.filter((x) => x.effet === 'ecrire_appel_cout' && x.cout_connu === false)
      if (sansTar.length !== sansTarif || sansTar.some((x) => x.corps.cout_millicentimes !== 0)) ko('K3', 'un appel sans tarif daté ne doit jamais recevoir un coût inventé')
      if (!sc.effets_prevus.every((x) => ['ecrire_appel_cout', 'noter_evenement'].includes(x.effet)) || sc.effets_faits.length) ko('K9', 'effets inattendus')
      const cles = sc.effets_prevus.filter((x) => x.effet === 'ecrire_appel_cout').map((x) => x.corps.cle)
      if (new Set(cles).size !== cles.length || cles.includes('exec-0999:n1')) ko('K6', 'un appel déjà connu ou doublé a été réécrit')
      if (!egal(co(C), sc)) ko('K9', 'rejoué, le coût doit être identique')
      if (!r.derive || r.derive.total_centimes !== total || r.derive.base_centimes !== 20 || r.plafond_atteint) ko('K5', 'la dérive doit être levée (62 contre 20 centimes de base), le plafond de 100 centimes non atteint')
      if (!r.lignes.some((l) => /vers un modèle externe/.test(l))) ko('K2', 'le compteur visible doit dire ce qui part vers un modèle externe')
    }
    const pl = co(F.coutReduit(), F.configCout({ plafond_jour_centimes: 60 }))
    if (!pl?.resultat?.plafond_atteint || !pl.effets_prevus.some((x) => x.effet === 'noter_evenement' && x.type === 'plafond_cout_atteint') || !pl.resultat.evenements_alerte.some((x) => x.cle === 'plafond:2026-11-03')) ko('K4', 'plafond du jour atteint : il doit être noté et alerté')
    const nonAtt = co(F.coutReduit(), F.configCout({ plafond_jour_centimes: 1000 }))
    if (nonAtt?.resultat?.plafond_atteint || nonAtt?.resultat?.evenements_alerte?.length) ko('K4', 'plafond non atteint : rien à alerter')
    const peu = co(F.coutFictif({ jours_precedents: C.jours_precedents.slice(0, 2) }))
    if (peu?.resultat?.derive !== null || peu?.resultat?.base_insuffisante !== true) ko('K5', 'avec moins de jours de base que le minimum, aucune dérive ne doit être inventée')
    const bas = co(F.coutFictif(), F.configCout({ plancher_derive_centimes: 500 }))
    if (bas?.resultat?.derive !== null) ko('K5', 'sous le plancher, aucune dérive')
    const tarifFaux = co(F.coutFictif({ appels: [F.appel('exec-3001:n1', { source_tarif: 'tarif non daté' })] }))
    if (tarifFaux?.resultat?.appels_sans_tarif !== 1) ko('K3', 'un tarif sans date ne vaut pas un tarif daté')
    const dbl = co(F.coutFictif({ appels: [F.appel('exec-4001:n1'), F.appel('exec-4001:n1')], cles_connues: [] }))
    if (dbl?.resultat?.appels_nouveaux !== 1 || dbl?.resultat?.doublons_ignores !== 1) ko('K6', 'le même appel deux fois ne compte qu’une seule fois')
    const autre = co(F.coutFictif({ appels: [F.appel('exec-5001:n1', { artisan_id: ORG2 })] }))
    if (autre?.statut !== 'refuse' || effets(autre).length) ko('K7', "la ligne d'un autre compte doit faire refuser le coût")
    const coupe = co(F.coutFictif(), F.configCout({ interrupteur_general: false }))
    if (coupe?.statut !== 'rien_a_faire') ko('K8', 'interrupteur coupé : rien ne se compte')
    // la chaîne du chef : la dérive passe par la liste fermée
    const rc = lancer(F.direction('cout', { cout: F.coutFictif() }))
    const sk = sortie1(rc)
    if (rc.erreur || sk?.statut !== 'ok' || !sk.resultat?.alerte?.alertes?.some((a) => a.type === 'cout_qui_derive' && a.responsable === 'benj')) ko('K11', `le coût qui dérive doit alerter Benj par la liste fermée (${rc.erreur ?? JSON.stringify(sk?.resultat?.alerte)})`)
    const sinon = sortie1(lancer(F.direction('cout', { cout: F.coutFictif({ jours_precedents: [] }) })))
    if (sinon?.statut !== 'ok' || sinon.resultat.alerte !== null) ko('K11', 'sans dérive ni plafond, aucune alerte ne doit partir')
    const sansPlafond = sortie1(lancer({ ...F.direction('cout', { cout: F.coutFictif() }), config: { ...F.CONFIG_OUVERTE, plafond_cout_jour_centimes: undefined } }))
    if (sansPlafond?.statut !== 'rien_a_faire') ko('K12', "sans plafond du jour, le chef ne doit pas en inventer un")
  }
  // chef : interrupteur et route inconnue
  {
    const coupe = sortie1(lancer({ ...F.direction('matin', { matin: F.matinFictif() }), config: { ...F.CONFIG_OUVERTE, interrupteur_departement: false } }))
    const absent = sortie1(lancer({ ...F.direction('matin', { matin: F.matinFictif() }), config: {} }))
    if (coupe?.statut !== 'rien_a_faire' || effets(coupe).length || absent?.statut !== 'rien_a_faire') ko('C3', 'interrupteur coupé ou absent : le chef ne fait rien (fail-closed)')
    const cerveau = sortie1(lancer(F.enveloppe(`${CHEF}@1`, { evenements: [{ type: 'page_du_matin' }], maintenant: F.MATIN }, F.CONFIG_OUVERTE)))
    if (cerveau?.statut !== 'rien_a_faire' || cerveau.resultat?.etat !== 'lecture_absente') ko('C4', 'le Cerveau envoie un événement page_du_matin sans lecture : le chef ne doit rien affirmer')
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
          const hors = (rb.run.get(nom) ?? []).map((i) => i.json)
          if (!egal(hors, passages.flat())) ko('P1', `${BANC} : « ${nom} » rejoué hors ligne diffère de la sortie enregistrée dans n8n`)
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
  if (o.contrat !== undefined && !egal(o.contrat, F.contrats()['direction.json'])) ko('N1', 'plans/011-cadrage-01-11/p6-signature/contrats/direction.json diffère de construire.mjs --contrats')
  // R — les compétences
  if (o.competences) {
    for (const d of DEPARTEMENTS) {
      const t = o.competences[d]
      if (typeof t !== 'string') { ko('R1', `la compétence « ${d} » manque`); continue }
      const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(t)
      if (!m) { ko('R1', `${d} : en-tête absent`); continue }
      const fm = Object.fromEntries(m[1].split('\n').map((l) => l.split(/:\s(.*)/s).slice(0, 2)))
      if (fm.departement !== d || !/^[a-z][a-z0-9_]{1,59}$/.test(fm.cle ?? '') || !(fm.titre?.trim().length >= 1 && fm.titre.length <= 120) || fm.version !== '1' || fm.actif !== 'false' || fm.statut !== 'brouillon' || fm.pose_par !== 'presti') ko('R2', `${d} : en-tête hors du format de la table competences (0193) ou compétence active`)
      const corps = m[2]
      if (corps.trim().length < 800 || corps.trim().length > 8000) ko('R2', `${d} : corps de ${corps.trim().length} caractères (800 à 8000 attendus, 0193)`)
      for (const sec of ['## Quand l\'agent s\'en sert', '## Pas à pas', '## Le ton de l\'artisan', '## Garde-fous', '## Ce qui part seul, ce qui attend', '## Spécification du workflow']) if (!corps.includes(sec)) ko('R3', `${d} : section « ${sec} » absente`)
      if (!/^1\. /m.test(corps) || (corps.match(/^\d+\. /gm) ?? []).length < 4) ko('R3', `${d} : un pas à pas d'au moins quatre pas`)
      if (!/lib\/ai\.ts:428-430/.test(corps) || !/jamais de prix chiffré/.test(corps) || !/créneau/.test(corps)) ko('R4', `${d} : les garde-fous anti-fabrication de lib/ai.ts manquent`)
      if (!/Marque blanche \(`lib\/email\.ts:6-11`\)/.test(corps)) ko('R5', `${d} : la marque blanche n'est pas rappelée`)
      if (/@[A-Za-z0-9-]+\.[a-z]{2,}|\+33|(?:^|\D)0[1-9]( ?\d\d){4}/.test(corps)) ko('R6', `${d} : une adresse ou un téléphone figure dans la compétence`)
      if (/(?<![a-z-])Presti(?![a-z-])/.test(corps.replace(/le code de Presti/g, ''))) ko('R5', `${d} : le nom de la plateforme figure dans un texte qui pourrait partir chez un client`)
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
const rapport = lire(path.join(RACINE, '.orchestre/preuves/035-005/lib-rapport-hebdo.workflow.json'))
const contratFichier = path.join(RACINE, 'plans/011-cadrage-01-11/p6-signature/contrats/direction.json')
const contrat = existsSync(contratFichier) ? lire(contratFichier) : null
const DIR_COMP = path.join(RACINE, 'plans/011-cadrage-01-11/p6-signature/competences')
const competences = Object.fromEntries(DEPARTEMENTS.map((d) => [d, existsSync(path.join(DIR_COMP, `${d}.md`)) ? readFileSync(path.join(DIR_COMP, `${d}.md`), 'utf8').replace(/\r\n/g, '\n') : null]))
const options = { registre, essais, rapport, contrat: contrat ?? {}, competences }
if (contrat === null) { console.error('✗ contrats/direction.json manque'); process.exit(1) }
const verdict = juger(ex, options)
if (verdict.length) { console.error(`✗ ${verdict.length} manquement(s) :`); for (const m of verdict) console.error('  - ' + m); process.exit(1) }
console.log(`✓ 4 exports (${NOMS.join(', ')}) : structure, gabarit « Contrat », page du matin (priorités du vrai composerPriorites, comptes du vrai composerBriefing), rapport du lundi, diagnostic, liste fermée d'alertes (300 événements au hasard), coût IA, 7 compétences, banc et ${essais.length} essai(s) n8n rejoués : identiques`)

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
const MUTANTS = [
  ['un chiffre sans source (page du matin)', (c) => codeMut(c, CHEF, 'Page du matin', M.source_impayes, "source: ''"), /^M4 /],
  ['un chiffre de gain dans le rapport', (c) => { codeMut(c, CHEF, 'Rapport du lundi', "const lignes = ['Rapport de la semaine ' + periode]", "const lignes = ['Gain estimé de la semaine ' + periode]"); codeMut(c, CHEF, 'Rapport du lundi', 'if (lignes.some((t) => GAIN.test(t)))', 'if (false)') }, /^L4 /],
  ['une base de départ qui parle de gain acceptée', (c) => codeMut(c, CHEF, 'Rapport du lundi', M.gain, 'const GAIN = /(zzzz)/i;'), /^L4 /],
  ['une alerte hors liste', (c) => { codeMut(c, 'lib-alerte-liste', F.NOMS_LOGIQUE['lib-alerte-liste'], M.liste, "const LISTE = {\n  nouvelle_demande: { responsable: 'artisan', titre: 'Une demande', lien: '/messages' },"); codeMut(c, 'lib-alerte-liste', F.NOMS_LOGIQUE['lib-alerte-liste'], "default: return false;", 'default: return true;') }, /^A[123] /],
  ['une page qui finit par une action', (c) => codeMut(c, CHEF, 'Page du matin', "\n    ];\n    const rien = impayes", "\n      { type: 'action', titre: 'Tout envoyer', action: 'envoyer' },\n    ];\n    const rien = impayes"), /^M3 /],
  ['la page ne met plus l’argent d’abord', (c) => codeMut(c, CHEF, 'Page du matin', "{ type: 'argent', titre: 'L’argent d’abord', lignes: argent },\n      { type: 'priorites'", "{ type: 'priorites'"), /^(M3|S6|M[0-9]) /],
  ['un coût calculé par le modèle (nœud de modèle ajouté)', (c) => { c['lib-cout-ia'].nodes.push({ id: 'x', name: 'Calculer le coût', type: '@n8n/n8n-nodes-langchain.agent', typeVersion: 3, position: [0, 0], parameters: {} }) }, /^S3 /],
  ['un coût inventé pour un appel sans tarif', (c) => codeMut(c, 'lib-cout-ia', F.NOMS_LOGIQUE['lib-cout-ia'], 'const mc = tarife ? Math.round(a.cout_eur * 100000) : 0;', 'const mc = tarife ? Math.round(a.cout_eur * 100000) : Math.round((a.jetons_entree + a.jetons_sortie) * 2);'), /^K[135] /],
  ['un diagnostic estimé sans données', (c) => codeMut(c, CHEF, 'Diagnostic', M.pas_de_donnees, 'if (false) {'), /^D1 /],
  ['un zéro inventé pour un bloc non lu du diagnostic', (c) => codeMut(c, CHEF, 'Diagnostic', "} else nonDispo.push('devis');", "} else { constats.push({ id: 'devis_non_signes', nombre: 0, montant_centimes: 0, unite: 'eur', source: 'x', date: g.lu_le, confiance: 'mesure' }); }"), /^D3 /],
  ['une lecture en erreur remplacée par un zéro', (c) => codeMut(c, CHEF, 'Page du matin', 'src.impayes.lue ? { id:', 'true ? { id:'), /^M6 /],
  ['une ligne d’un autre compte lue (page)', (c) => codeMut(c, CHEF, 'Page du matin', M.isolation_page, 'if (false)'), /^M7 /],
  ['un événement d’un autre compte lu (alerte)', (c) => codeMut(c, 'lib-alerte-liste', F.NOMS_LOGIQUE['lib-alerte-liste'], M.isolation_alerte, 'if (false)'), /^A8 /],
  ['une ligne d’un autre compte lue (coût)', (c) => codeMut(c, 'lib-cout-ia', F.NOMS_LOGIQUE['lib-cout-ia'], M.isolation_cout, 'if (false && d.appels.some((x) => x.artisan_id !== org)'), /^K7 /],
  ['un appel doublé compté deux fois', (c) => codeMut(c, 'lib-cout-ia', F.NOMS_LOGIQUE['lib-cout-ia'], M.doublon_appel, 'if (false) { doublons++; continue; }'), /^K[136] /],
  ['la part externe non comptée à part', (c) => codeMut(c, 'lib-cout-ia', F.NOMS_LOGIQUE['lib-cout-ia'], M.externe, ''), /^K2 /],
  ['un plafond du jour jamais atteint', (c) => codeMut(c, 'lib-cout-ia', F.NOMS_LOGIQUE['lib-cout-ia'], M.plafond, 'const plafond_atteint = false;'), /^K[14] /],
  ['une relance faite après la signature créditée', (c) => codeMut(c, CHEF, 'Rapport du lundi', M.avant_signature, 'true'), /^L2 /],
  ['le plafond d’alertes du jour ignoré', (c) => codeMut(c, 'lib-alerte-liste', F.NOMS_LOGIQUE['lib-alerte-liste'], M.plafond_alertes, 'if (false)'), /^A5 /],
  ['les heures calmes ignorées', (c) => codeMut(c, 'lib-alerte-liste', F.NOMS_LOGIQUE['lib-alerte-liste'], M.calmes, 'if (false)'), /^A[34] /],
  ['une alerte déjà envoyée qui repart', (c) => codeMut(c, 'lib-alerte-liste', F.NOMS_LOGIQUE['lib-alerte-liste'], 'if (connues.has(cle) || vus.has(cle))', 'if (false)'), /^A[26] /],
  ['l’interrupteur ignoré (alerte)', (c) => codeMut(c, 'lib-alerte-liste', F.NOMS_LOGIQUE['lib-alerte-liste'], M.interrupteur, 'if (false)'), /^A9 /],
  ['un nom de client dans le push', (c) => codeMut(c, 'lib-alerte-liste', F.NOMS_LOGIQUE['lib-alerte-liste'], "'Ouvrez la page du jour : une carte vous attend.'", "'Client ' + ev.cle + ' : ouvrez la page du jour.'"), /^A7 /],
  ['l’alerte de coût ne passe plus par la liste fermée', (c) => { c[CHEF].connections["Envelopper l'alerte de coût"].main[0] = [] }, /^S9 /],
  ['la porte « simulation » contournée', (c) => { c[CHEF].connections['Page du matin'].main[0] = [{ node: 'Contrat de sortie', type: 'main', index: 0 }] }, /^S8 /],
  ['un workflow publié', (c) => { c[CHEF].active = true }, /^S1 /],
  ['un identifiant ajouté', (c) => { c['lib-cout-ia'].nodes[1].credentials = { supabaseApi: { id: '1', name: 'x' } } }, /^S2 /],
  ['un appelant « any »', (c) => { c['lib-alerte-liste'].settings.callerPolicy = 'any' }, /^S4 /],
  ['un nœud HTTP ajouté', (c) => { c[CHEF].nodes.push({ id: 'h', name: 'Lire', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [0, 0], parameters: {} }) }, /^S3 /],
  ['un nœud d’envoi ajouté', (c) => { c['lib-alerte-liste'].nodes.push({ id: 'm', name: 'Envoyer', type: 'n8n-nodes-base.emailSend', typeVersion: 2, position: [0, 0], parameters: {} }) }, /^S3 /],
  ['le gabarit « Contrat d’entrée » affaibli', (c) => { const n = c['lib-cout-ia'].nodes.find((x) => x.name === "Contrat d'entrée"); n.parameters.jsCode = n.parameters.jsCode.replace("if (s.additionalProperties === false)", 'if (false)') }, /^S5 /],
  ['un octet changé dans un nœud Code', (c) => { const n = c[CHEF].nodes.find((x) => x.name === 'Rien à faire'); n.parameters.jsCode += ' ' }, /^S7 /],
  ['un appel de sous-workflow qui fait échouer le banc', (c) => { delete c[BANC].nodes.find((x) => x.name === 'Appeler lib-cout-ia (9)').onError }, /^S9 /],
]
let ok = true
for (const [nom, fait, attendu] of MUTANTS) {
  const c = jeu()
  fait(c)
  const sortie = juger(c, { ...options, egalite: /^(un octet|le gabarit)/.test(nom) ? undefined : false })
  const bon = sortie.some((m) => attendu.test(m))
  console.log(`  ${bon ? '✓' : '✗'} mutant « ${nom} » ${bon ? 'fait rougir le juge' : 'N’A PAS fait rougir le juge'}${bon ? `\n      → ${sortie.find((m) => attendu.test(m)).slice(0, 150)}` : ` (obtenu : ${sortie.slice(0, 3).join(' | ') || 'rien'})`}`)
  if (!bon) ok = false
}
console.log(`direction-n8n-qa : ${MUTANTS.length} mutants`)
if (!ok) process.exit(1)
console.log('OK')
