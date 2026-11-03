// JUGE HORS LIGNE de la boîte mail de l'artisan dans la plateforme (tâche 036-003, prompt 6, lot 3). Aucun réseau, aucune base, aucun modèle,
// aucune donnée réelle. Il lit les exports (le JSON rendu par le MCP `get_workflow_details`) de presti-boite, lib-boite-lire, lib-boite-brouillon,
// lib-boite-envoyer et du banc presti-banc-boite dans .orchestre/preuves/036-003/, et :
//   S  — leur STRUCTURE : inactifs ; aucun identifiant ; aucun nœud de lecture ou d'écriture réseau ; réglages (workflow d'erreur, Europe/Paris,
//        délai, appelants en liste) ; le gabarit « Contrat » de 035-003 à l'identique ; le nœud SMTP DÉSACTIVÉ, atteignable par la seule sortie
//        « faux » de la porte « simulation » ; le brouillon sans nœud d'envoi ; la cadence de 5 minutes ; chaque nœud Code égal à celui de construire.mjs.
//   C  — le gabarit « Contrat » REJOUÉ (node:vm, en suivant les connexions) : hors contrat, rien ; hors simulation, l'arrêt.
//   L  — lib-boite-lire : un message entre UNE fois ; une seule conversation par client, quel que soit le canal (deux boîtes du même passage
//        comprises) ; la boîte d'un autre compte n'est pas lue ; jeton expiré ou refusé = silence, état « erreur » prévu, alerte, rien ne plante ;
//        aucun secret en sortie ni au journal ; lot de 40, fenêtre de 7 jours.
//   B  — lib-boite-brouillon : APPEND dans Brouillons, drapeau \Draft, jamais d'envoi (Studio comme Signature), au nom de l'artisan, jamais « Presti ».
//   E  — lib-boite-envoyer : Signature seulement, chaque condition du pilote retirée l'une après l'autre ; plafond du jour ; mention d'IA ; réponse à l'artisan.
//   R  — la COMPARAISON à releverCanal (lib/releveCanal.ts), cas par cas : les règles de tri sont celles du VRAI code (la fonction estUneVraieDemande est
//        extraite du source et exécutée), les écarts sont déclarés et chacun est vérifié (un écart non déclaré, ou déclaré à tort, rougit).
//   P, B', N — presti-boite et le banc REJOUÉS hors ligne (Execute Sub-workflow rejoue les exports enfants) : même bilan que dans n8n ; et les sorties
//        enregistrées de `test_workflow` (essais-n8n.json) sont identiques à celles du rejeu.
// Puis il prouve qu'il sait rougir : chaque MUTANT (un message importé deux fois, deux conversations pour un client, un brouillon envoyé en Studio, un
// secret dans un journal, un jeton expiré qui fait planter, « Presti » dans un e-mail, une boîte d'un autre compte lue…) doit le faire échouer pour sa raison.
//   node scripts/boite-n8n-qa.mjs [dossier des exports]
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.resolve(RACINE, process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '.orchestre/preuves/036-003')
const F = await import(pathToFileURL(path.join(RACINE, '.orchestre/preuves/036-003/construire.mjs')).href)
const F3 = await import(pathToFileURL(path.join(RACINE, '.orchestre/preuves/035-003/construire.mjs')).href)
const ENFANTS = F.ENFANTS
const PARENT = 'presti-boite', BANC = 'presti-banc-boite'
const NOMS = [...ENFANTS, PARENT, BANC]
const ID_ERREUR = F.ERREUR
const T = { trigger: 'n8n-nodes-base.executeWorkflowTrigger', horloge: 'n8n-nodes-base.scheduleTrigger', code: 'n8n-nodes-base.code', si: 'n8n-nodes-base.if', arret: 'n8n-nodes-base.stopAndError',
  note: 'n8n-nodes-base.stickyNote', appel: 'n8n-nodes-base.executeWorkflow', noop: 'n8n-nodes-base.noOp', merge: 'n8n-nodes-base.merge', envoi: 'n8n-nodes-base.emailSend' }
const PORTE = 'Porte simulation', ARRET = 'Hors simulation : non branché', SMTP = 'Envoyer la réponse (SMTP, désactivé)'
const sha = (t) => createHash('sha256').update(String(t), 'utf8').digest('hex')
const copie = (o) => JSON.parse(JSON.stringify(o))
const REPERE_ENTREE = F3.REPERE_ENTREE, REPERE_SORTIE = F3.REPERE_SORTIE
const EMPREINTE_ENTREE = '20f6ff371969130e45b37ea58466baaa9b4581f7dbe145863a2f4a1a57713899'
const EMPREINTE_SORTIE = '8f0f37c68d78f3154204655b3f5343889c5c74733c8b852f27e34bc517394a70'
const CLES_SORTIE = ['contrat', 'statut', 'cle_idempotence', 'simulation', 'resultat', 'effets_prevus', 'effets_faits', 'journal', 'erreurs']

// ─── Ce que disent le VRAI code (releverCanal, le pilote, la mention d'IA, les offres), chargés ou extraits, jamais recopiés ───────────────────────
const lireSource = (p) => readFileSync(path.join(RACINE, p), 'utf8').replace(/\r\n/g, '\n') // les sources peuvent être en CRLF (poste Windows)
const SRC_RELEVE = lireSource('lib/releveCanal.ts')
function reference() {
  const auto = /^const AUTOMATIQUE = (\/.+\/[a-z]*)$/m.exec(SRC_RELEVE)?.[1]
  const indes = /^const INDESIRABLE = (\/.+\/[a-z]*)$/m.exec(SRC_RELEVE)?.[1]
  const fn = /function estUneVraieDemande\([\s\S]*?\n}\n/.exec(SRC_RELEVE)?.[0]
  if (!auto || !indes || !fn) throw new Error('releverCanal : AUTOMATIQUE, INDESIRABLE ou estUneVraieDemande introuvables dans lib/releveCanal.ts')
  const js = stripTypeScriptTypes(`const AUTOMATIQUE = ${auto}\nconst INDESIRABLE = ${indes}\n${fn}`) + '\n;estUneVraieDemande'
  const estUneVraieDemande = vm.runInNewContext(js, {})
  const textes = ['Identifiants illisibles — reconnectez la boîte.', 'Identifiants refusés — le mot de passe de la boîte a peut-être changé.', 'Connexion à la boîte impossible pour l’instant.']
  const constantes = { lot: /importes >= 40/.test(SRC_RELEVE), fenetre: /7 \* 24 \* 3600 \* 1000/.test(SRC_RELEVE), conversation: /30 \* 24 \* 3600 \* 1000/.test(SRC_RELEVE),
    textes: textes.every((t) => SRC_RELEVE.includes(t)), rangement: /\.eq\('contact', mail\.de\.email!\)/.test(SRC_RELEVE), derniere: /derniere_releve: new Date\(\)\.toISOString\(\)/.test(SRC_RELEVE),
    doublon: /\.eq\('externe_id', mail\.messageId\)\.eq\('canal_id', canal\.id\)/.test(SRC_RELEVE), minuscules: /email: email \? email\.toLowerCase\(\) : null/.test(lireSource('lib/mailLite.ts')) }
  return { estUneVraieDemande, textes, constantes }
}
function lireCode() {
  const texte = F.msg ? 'Bonjour,\nMerci pour votre message, je passe jeudi matin voir la fuite. À très vite.' : ''
  const prog = `const r = await import(${JSON.stringify(pathToFileURL(path.join(RACINE, 'lib/pilote/regles.ts')).href)});
const p = await import(${JSON.stringify(pathToFileURL(path.join(RACINE, 'lib/plans.ts')).href)});
const m = await import(${JSON.stringify(pathToFileURL(path.join(RACINE, 'lib/mentionAssistant.ts')).href)});
const noms = ['Exemple. Bâti-Démo', '', 'Atelier Dupont'];
process.stdout.write(JSON.stringify({ DELAI_ANNULATION_MIN: r.DELAI_ANNULATION_MIN, PLAFOND_AUTO_JOUR: r.PLAFOND_AUTO_JOUR, ATTENTE_MAX_MS: r.ATTENTE_MAX_MS, TYPES_PILOTE: r.TYPES_PILOTE,
  capacites: Object.fromEntries(['studio', 'signature'].map((pl) => [pl, ['plateforme.ia.auto', 'assistant.pilote'].filter((c) => p.peut(pl, c))])),
  mentions: noms.map((n) => [n, m.avecMentionAssistant(${JSON.stringify(texte)}, n)]), mention_vide: m.mentionAssistant('') }));`
  return JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', './scripts/ts-loader.mjs', '--input-type=module', '-e', prog], { cwd: RACINE, encoding: 'utf8' }))
}
const CODE = lireCode()
const REF = reference()
const TEXTE_REPONSE = 'Bonjour,\nMerci pour votre message, je passe jeudi matin voir la fuite. À très vite.'

// ─── L'exécuteur hors ligne : les nœuds de l'export, tels quels, dans node:vm ─────────────────────────────────────────────────────────────────────
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
  const gauche = String(cond.leftValue ?? '')
  const m = /^=\{\{\s*\$json\.([\w.]+)(\s*===\s*true)?\s*\}\}$/.exec(gauche)
  if (!m || (c.conditions ?? []).length !== 1) throw new Error(`${n.name} : condition illisible hors ligne (${gauche})`)
  const vrai = [], faux = []
  for (const it of items) {
    let v = m[1].split('.').reduce((o, k) => (o == null ? undefined : o[k]), it.json)
    if (m[2]) v = v === true
    if (c.options?.typeValidation === 'strict' && typeof v !== 'boolean') throw new Error(`${n.name} : valeur non booléenne en typage strict`)
    ;((cond.operator?.operation === 'false' ? v === false : v === true) ? vrai : faux).push(it)
  }
  return [vrai, faux]
}
function executer(wf, entrees, o = {}) {
  const { W = {}, epingles = {}, profondeur = 0 } = o
  const parNom = new Map(wf.nodes.map((n) => [n.name, n]))
  const racines = wf.nodes.filter((n) => n.type === T.trigger || n.type === T.horloge)
  const res = { sorties: [], par: {}, visites: [], erreur: null }
  if (racines.length !== 1) return { ...res, erreur: `${racines.length} déclencheur(s)` }
  const file = [[racines[0].name, entrees.map((j) => ({ json: copie(j) })), false]]
  const tampons = new Map()
  for (let pas = 0; file.length || tampons.size; pas++) {
    if (pas > 600) return { ...res, erreur: 'boucle' }
    if (!file.length) { const [nom, items] = tampons.entries().next().value; tampons.delete(nom); file.push([nom, items, true]) }
    const [nom, items, vidage] = file.shift()
    const n = parNom.get(nom)
    if (!n) return { ...res, erreur: `nœud absent : ${nom}` }
    if (n.type === T.merge && !vidage) { tampons.set(nom, [...(tampons.get(nom) ?? []), ...items]); continue }
    res.visites.push(nom)
    let outs
    try {
      if (n.type === T.trigger || n.type === T.horloge) outs = [epingles[nom] ? epingles[nom].map((j) => ({ json: copie(j) })) : items]
      else if (n.type === T.noop) outs = [epingles[nom] ? epingles[nom].map((j) => ({ json: copie(j) })) : items]
      else if (n.type === T.merge) outs = [items]
      else if (n.type === T.code) outs = [lancerCode(n.parameters?.jsCode ?? '', items)]
      else if (n.type === T.si) outs = evaluerSi(n, items)
      else if (n.type === T.arret) return { ...res, erreur: String(n.parameters?.errorMessage ?? 'Stop and Error') }
      else if (n.type === T.envoi) {
        if (n.disabled !== true) throw new Error(`${n.name} : nœud d'envoi ACTIF atteint (rien ne doit partir)`)
        outs = [items]
      } else if (n.type === T.appel && profondeur === 0) {
        const id = n.parameters?.workflowId?.value
        const enfant = Object.values(W).find((w) => w && w.id === id)
        if (!enfant || n.parameters?.source !== 'database') throw new Error(`sous-workflow ${id} introuvable ou hors source database`)
        if (enfant.settings?.callerPolicy !== 'workflowsFromAList' || !String(enfant.settings?.callerIds ?? '').split(',').includes(wf.id)) throw new Error(`${enfant.name} n'autorise pas ${wf.name} à l'appeler`)
        const r = executer(enfant, items.map((i) => i.json), { W, profondeur: 1 })
        if (r.erreur) { if (n.onError === 'continueRegularOutput') outs = [[{ json: { error: r.erreur } }]]; else throw new Error(`${enfant.name} : ${r.erreur}`) }
        else outs = [r.sorties.map((json) => ({ json }))]
      } else throw new Error(`type de nœud inconnu du rejeu : ${n.type}`)
    } catch (e) { return { ...res, erreur: `${nom} : ${e.message}` } }
    ;(res.par[nom] ??= []).push(outs.map((o2) => o2.map((i) => i.json)))
    const liens = wf.connections?.[nom]?.main ?? []
    if (!liens.flat().filter(Boolean).length && n.type !== T.note) res.sorties.push(...(outs[0] ?? []).map((i) => i.json))
    // n8n (executionOrder v1) va au bout de la première branche avant la suivante : on empile donc les suites en tête de file, dans l'ordre des sorties.
    const suites = []
    outs.forEach((sortie, i) => { if (sortie.length) for (const l of liens[i] ?? []) if (l) suites.push([l.node, sortie.map((x) => ({ json: copie(x.json) })), false]) })
    file.unshift(...suites)
  }
  return res
}

// ─── Les exports ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function charger(dossier) {
  const ex = {}
  for (const nom of NOMS) { const f = path.join(dossier, `${nom}.workflow.json`); ex[nom] = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null }
  const essais = existsSync(path.join(dossier, 'essais-n8n.json')) ? JSON.parse(readFileSync(path.join(dossier, 'essais-n8n.json'), 'utf8')) : []
  return { ex, essais }
}
const noeud = (wf, nom) => wf.nodes.find((n) => n.name === nom)
const codeDe = (wf, nom) => String(noeud(wf, nom)?.parameters?.jsCode ?? '')
const aretes = (wf, nom) => Object.entries(wf.connections?.[nom] ?? {}).flatMap(([genre, l]) => (Array.isArray(l) ? l : []).flatMap((s, i) => (Array.isArray(s) ? s : []).filter(Boolean).map((x) => ({ vers: x.node, genre, sortie: i }))))
const LOGIQUE = { 'lib-boite-lire': 'Lire la boîte épinglée et la ranger', 'lib-boite-brouillon': 'Préparer le brouillon', 'lib-boite-envoyer': "Préparer l'envoi" }
const CODES = { 'lib-boite-lire': F.CODE_LIRE, 'lib-boite-brouillon': F.CODE_BROUILLON, 'lib-boite-envoyer': F.CODE_ENVOYER }

// ─── Les essais : un enfant seul, rejoué hors ligne (le banc et le parent rejouent aussi les enfants) ──────────────────────────────────────────────
const sans = (e) => { const c = copie(e); return c }
const enfantSeul = (X, nom, envs) => executer(X.ex[nom], envs, { W: X.ex })
const sortie1 = (r) => r.sorties[0]
const effets = (s, type) => (s?.effets_prevus ?? []).filter((e) => !type || e.effet === type)
const toutLeTexte = (s) => JSON.stringify(s)

// ─── Les contrôles ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function jouer(X, o = {}) {
  const e = []
  const ko = (lettre, m) => e.push(`${lettre} ${m}`)
  const { ex } = X
  for (const nom of NOMS) if (!ex[nom]) { ko('S', `export de ${nom} absent`); return e }
  const ids = Object.fromEntries(NOMS.map((n) => [n, ex[n].id]))
  const W = ex

  // S — structure
  for (const nom of NOMS) {
    const wf = ex[nom]
    if (wf.active !== false || wf.activeVersionId) ko('S1', `${nom} : doit être inactif et sans version publiée`)
    if (wf.nodes.some((n) => n.credentials && Object.keys(n.credentials).length)) ko('S2', `${nom} : aucun identifiant n'est permis (mode A)`)
    const s = wf.settings ?? {}
    if (s.errorWorkflow !== ID_ERREUR) ko('S3', `${nom} : workflow d'erreur ${s.errorWorkflow} (lib-erreur-commune attendu)`)
    if (s.timezone !== 'Europe/Paris') ko('S3', `${nom} : fuseau ${s.timezone}`)
    if (!Number.isInteger(s.executionTimeout) || s.executionTimeout < 1 || s.executionTimeout > 3600) ko('S3', `${nom} : délai maximal ${s.executionTimeout}`)
    if (s.saveDataSuccessExecution !== 'none') ko('S3', `${nom} : les succès ne doivent pas être sauvés (${s.saveDataSuccessExecution})`)
    if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/.test(JSON.stringify(wf.nodes.map((n) => [n.parameters, n.notes])))) ko('S13', `${nom} : une adresse e-mail est écrite dans l'export (R8 de scripts/n8n-specs-qa.mjs)`)
    const interdits = wf.nodes.filter((n) => /httpRequest|supabase|emailReadImap|executeCommand|postgres|function$|slack|telegram|gmail|whatsApp/i.test(n.type) || (/^n8n-nodes-base\.(emailSend)$/.test(n.type) && nom !== 'lib-boite-envoyer'))
    for (const n of interdits) ko('S4', `${nom} : nœud réseau ou d'envoi interdit (${n.name}, ${n.type})`)
    if (nom !== PARENT && nom !== BANC && ENFANTS.includes(nom)) {
      const liste = String(s.callerIds ?? '').split(',').sort().join(',')
      if (s.callerPolicy !== 'workflowsFromAList' || liste !== [ids[PARENT], ids[BANC]].sort().join(',')) ko('S5', `${nom} : appelants ${s.callerPolicy}/${s.callerIds} (presti-boite et presti-banc-boite seuls attendus)`)
    } else if (s.callerPolicy !== 'none') ko('S5', `${nom} : politique d'appel ${s.callerPolicy} (none attendu)`)
  }
  for (const nom of ENFANTS) {
    const wf = ex[nom], contrat = `${nom}@1`
    const decl = wf.nodes.filter((n) => n.type === T.trigger)
    if (decl.length !== 1 || aretes(wf, decl[0].name)[0]?.vers !== "Contrat d'entrée") ko('S6', `${nom} : doit commencer par le Contrat d'entrée`)
    const entree = codeDe(wf, "Contrat d'entrée"), sortie = codeDe(wf, 'Contrat de sortie')
    const corpsE = entree.split(REPERE_ENTREE)[1], corpsS = sortie.split(REPERE_SORTIE)[1]
    if (sha(corpsE ?? '') !== EMPREINTE_ENTREE) ko('S7', `${nom} : le corps du gabarit « Contrat d'entrée » n'est plus celui de 035-003`)
    if (sha(corpsS ?? '') !== EMPREINTE_SORTIE) ko('S7', `${nom} : le corps du gabarit « Contrat de sortie » n'est plus celui de 035-003`)
    if (o.egalite !== false) {
      if (entree !== F3.codeEntree(contrat, F.SCHEMAS[nom])) ko('S8', `${nom} : « Contrat d'entrée » différent de construire.mjs`)
      if (sortie !== F3.codeSortie(contrat)) ko('S8', `${nom} : « Contrat de sortie » différent de construire.mjs`)
      if (codeDe(wf, LOGIQUE[nom]) !== CODES[nom]) ko('S8', `${nom} : « ${LOGIQUE[nom]} » différent de construire.mjs`)
    }
    const porte = noeud(wf, PORTE)
    if (!porte || !/^\s*porte\s*:\s*simulation\s*$/m.test(String(porte.notes ?? ''))) ko('S9', `${nom} : porte « simulation » absente`)
    const finals = wf.nodes.filter((n) => n.name === 'Contrat de sortie')
    if (finals.length !== 1 || aretes(wf, 'Contrat de sortie').length) ko('S9', `${nom} : un seul Contrat de sortie, dernier nœud`)
    if (nom === 'lib-boite-brouillon' && wf.nodes.some((n) => /envoy|smtp|send/i.test(n.name + n.type))) ko('S10', 'lib-boite-brouillon : aucun nœud d\'envoi permis (jamais envoyé)')
    if (nom === 'lib-boite-envoyer') {
      const smtp = noeud(wf, SMTP)
      if (!smtp || smtp.type !== T.envoi) ko('S11', 'lib-boite-envoyer : le nœud SMTP est absent')
      else {
        if (smtp.disabled !== true) ko('S11', 'lib-boite-envoyer : le nœud SMTP doit être DÉSACTIVÉ')
        if (!/^\s*pied\s*:\s*mention\s*$/m.test(String(smtp.notes ?? ''))) ko('S11', 'lib-boite-envoyer : pied « mention » non déclaré')
        const p = smtp.parameters ?? {}
        if (p.options?.appendAttribution !== false) ko('S11', "lib-boite-envoyer : l'attribution n8n doit être coupée")
        if (!p.options?.replyTo) ko('S11', "lib-boite-envoyer : l'adresse de l'artisan doit être en réponse")
        if (/presti/i.test(JSON.stringify(p))) ko('S11', 'lib-boite-envoyer : « Presti » dans le nœud d\'envoi (marque blanche)')
        // Atteignable par la seule sortie « faux » de la porte : sans cette arête, le nœud ne doit plus être atteint.
        const sansFaux = new Set(), file = [wf.nodes.find((n) => n.type === T.trigger).name]
        while (file.length) { const x = file.shift(); if (sansFaux.has(x)) continue; sansFaux.add(x); for (const a of aretes(wf, x)) if (!(x === PORTE && a.sortie === 1)) file.push(a.vers) }
        if (sansFaux.has(SMTP)) ko('S11', 'lib-boite-envoyer : le nœud SMTP est atteignable sans passer par la sortie « faux » de la porte « simulation »')
        if (aretes(wf, PORTE).some((a) => a.sortie === 0 && a.vers === SMTP)) ko('S11', 'lib-boite-envoyer : la sortie « vrai » (simulation) mène au SMTP')
        if (!aretes(wf, SMTP).some((a) => a.vers === ARRET)) ko('S11', "lib-boite-envoyer : le SMTP doit être suivi de l'arrêt « hors simulation »")
      }
    }
  }
  {
    const p = ex[PARENT]
    const h = p.nodes.find((n) => n.type === T.horloge)
    const regle = h?.parameters?.rule?.interval ?? []
    if (!(regle.length === 1 && regle[0].field === 'minutes' && regle[0].minutesInterval === 5)) ko('S12', `presti-boite : cadence ${JSON.stringify(regle)} (toutes les 5 minutes attendu)`)
    const appels = p.nodes.filter((n) => n.type === T.appel)
    const vises = appels.map((n) => Object.entries(ids).find(([, id]) => id === n.parameters?.workflowId?.value)?.[0]).sort()
    if (JSON.stringify(vises) !== JSON.stringify([...ENFANTS].sort())) ko('S12', `presti-boite : appelle ${vises.join(', ')} (les trois enfants attendus)`)
    for (const n of appels) if (n.onError !== 'continueRegularOutput' || n.parameters?.source !== 'database') ko('S12', `presti-boite : ${n.name} doit être en source database, un échec ne fait pas échouer le passage`)
    const b = ex[BANC]
    const hb = b.nodes.find((n) => n.type === T.horloge)
    if (!hb) ko('S12', 'le banc doit avoir un déclencheur')
    for (const n of b.nodes.filter((n) => n.type === T.appel)) if (!Object.values(ids).includes(n.parameters?.workflowId?.value)) ko('S12', `${BANC} : ${n.name} appelle un workflow inconnu`)
  }
  if (e.some((m) => m.startsWith('S'))) return e

  // C — le gabarit « Contrat » rejoué
  for (const nom of ENFANTS) {
    const hors = enfantSeul(X, nom, [{ x: 1 }])
    if (!hors.erreur && sortie1(hors)?.statut !== 'rejete') ko('C1', `${nom} : une entrée hors contrat doit être rejetée`)
    else if (!hors.erreur && (effets(sortie1(hors)).length || sortie1(hors).effets_faits.length)) ko('C1', `${nom} : une entrée hors contrat ne doit produire aucun effet`)
  }
  const envs = { 'lib-boite-lire': F.lire(F.CAS_LIRE_MELES), 'lib-boite-brouillon': F.brouillonFictif(), 'lib-boite-envoyer': F.envoiFictif() }
  for (const nom of ENFANTS) {
    const r = enfantSeul(X, nom, [{ ...envs[nom], simulation: false }])
    if (!r.erreur || !/Hors simulation/.test(r.erreur) || r.sorties.length) ko('C2', `${nom} : hors simulation, le travail doit s'arrêter à « ${ARRET} » sans sortie (${r.erreur ?? 'aucune erreur'})`)
  }

  // L — lib-boite-lire
  const lire = (msgs, over = {}) => sortie1(enfantSeul(X, 'lib-boite-lire', [F.lire(msgs, over)]))
  const depots = (s) => effets(s, 'deposer_message')
  const L1 = lire(F.CAS_LIRE_MELES)
  if (L1.statut !== 'ok' || L1.resultat.importes !== 3 || depots(L1).length !== 3) ko('L1', `relève mêlée : 3 messages attendus, ${L1.resultat?.importes} (${L1.statut})`)
  if (effets(L1, 'creer_conversation').length !== 2) ko('L1', `relève mêlée : 2 conversations attendues (Marie, Luc), ${effets(L1, 'creer_conversation').length}`)
  const deja = depots(L1).map((d) => ({ artisan_id: F.ORG, message_id: d.externe_id }))
  const L2 = lire(F.CAS_LIRE_MELES, { donnees: { deja_importes: deja } })
  if (depots(L2).length) ko('L2', `un message déjà importé est importé de nouveau (${depots(L2).length} dépôt(s) au second passage)`)
  const L2b = lire(F.CAS_LIRE_MELES)
  if (JSON.stringify(L2b.effets_prevus.map((x) => x.cle)) !== JSON.stringify(L1.effets_prevus.map((x) => x.cle))) ko('L2', 'les clés de dépôt ne sont pas stables d\'un rejeu à l\'autre (idempotence)')
  const cles = depots(L1).map((d) => d.cle)
  if (new Set(cles).size !== cles.length) ko('L2', 'deux dépôts portent la même clé')
  const deuxMemeClient = lire([F.CAS_LIRE_MELES[0], F.CAS_LIRE_MELES[1]])
  const convs = effets(deuxMemeClient, 'creer_conversation')
  if (convs.length !== 1) ko('L3', `deux messages du même client dans le même lot : ${convs.length} conversation(s) créée(s) (1 attendue)`)
  if (new Set(depots(deuxMemeClient).map((d) => d.conversation.cle_conversation)).size !== 1) ko('L3', 'les deux messages du même client ne vont pas dans la même conversation')
  {
    // deux boîtes du même compte, dans le même passage, reçoivent le même message : une seule fois, une seule conversation
    const a = F.lire([F.CAS_LIRE_MELES[0]], { cle: 'exemple:essai:a' })
    const b = F.lire([F.CAS_LIRE_MELES[0], F.MSG_M9], { donnees: { canal: { ...F.canalFictif(F.CANAL_B), adresse: F.ADRESSE_B }, connexion: F.connexionFictive({ id: F.CX_B }) }, cle: 'exemple:essai:b' })
    const r = enfantSeul(X, 'lib-boite-lire', [a, b]).sorties
    const tout = r.flatMap((s) => depots(s))
    if (tout.filter((d) => d.externe_id === F.CAS_LIRE_MELES[0].message_id).length !== 1) ko('L3', 'le même message reçu par deux canaux est déposé plus d\'une fois')
    if (r.flatMap((s) => effets(s, 'creer_conversation')).length !== 1) ko('L3', 'le même client écrivant par deux canaux ouvre plus d\'une conversation')
    if (new Set(tout.map((d) => d.conversation.cle_conversation)).size !== 1) ko('L3', 'les messages de deux canaux ne sont pas dans la même conversation')
    if (!tout.every((d) => d.canal_origine === 'email')) ko('L3', 'le canal d\'origine du message n\'est pas gardé')
  }
  {
    const ouverte = lire([F.CAS_LIRE_MELES[0]], { donnees: { conversations: [{ lead_id: '00000000-0000-4000-8000-000000000761', artisan_id: F.ORG, contact: 'marie.exemple@client-a.invalid', created_at: '2026-10-24T08:00:00.000Z' }] } })
    if (effets(ouverte, 'creer_conversation').length || depots(ouverte)[0]?.conversation?.lead_id !== '00000000-0000-4000-8000-000000000761') ko('L3', 'une conversation ouverte il y a 10 jours doit recevoir le message')
    const vieille = lire([F.CAS_LIRE_MELES[0]], { donnees: { conversations: [{ lead_id: '00000000-0000-4000-8000-000000000761', artisan_id: F.ORG, contact: 'marie.exemple@client-a.invalid', created_at: '2026-10-01T08:00:00.000Z' }] } })
    if (effets(vieille, 'creer_conversation').length !== 1) ko('L3', 'une conversation de plus de 30 jours ne doit plus recevoir le message')
  }
  // L4 — isolation
  for (const [titre, over] of [['la boîte', { donnees: { canal: { ...F.canalFictif(F.CANAL, F.ORG2) } } }], ['la connexion', { donnees: { connexion: F.connexionFictive({ artisan_id: F.ORG2 }) } }],
    ['une conversation lue', { donnees: { conversations: [{ lead_id: '00000000-0000-4000-8000-000000000761', artisan_id: F.ORG2, contact: 'marie.exemple@client-a.invalid', created_at: '2026-10-30T08:00:00.000Z' }] } }],
    ['un message déjà importé', { donnees: { deja_importes: [{ artisan_id: F.ORG2, message_id: '<x@y.invalid>' }] } }]]) {
    const s = lire(F.CAS_LIRE_MELES, over)
    if (s.statut !== 'refuse' || effets(s).length || s.resultat) ko('L4', `${titre} d'un autre compte : lue et traitée (statut ${s.statut}, ${effets(s).length} effet(s))`)
  }
  // L5 — autorisation expirée ou refusée
  const expire = lire([], { donnees: { boite: { issue: 'jeton_expire', messages: [] } } })
  if (expire.statut !== 'ok' || expire.resultat?.importes !== 0 || expire.erreurs.length) ko('L5', `jeton expiré : la relève doit se taire sans planter (statut ${expire.statut}, ${expire.erreurs.join(' | ')})`)
  if (!effets(expire, 'maj_connexion').some((x) => x.etat === 'erreur' && x.motif_erreur === 'autorisation_expiree')) ko('L5', 'jeton expiré : l\'état « erreur » n\'est pas prévu pour Connexions')
  if (effets(expire, 'alerter').length !== 1 || effets(expire, 'alerter')[0].contrat !== 'lib-alerter@1') ko('L5', 'jeton expiré : l\'alerte lib-alerter n\'est pas prévue (une seule)')
  if (depots(expire).length) ko('L5', 'jeton expiré : rien ne doit être déposé')
  const silence = lire([], { donnees: { connexion: F.connexionFictive({ etat: 'erreur' }), boite: { issue: 'jeton_expire', messages: F.CAS_LIRE_MELES } } })
  if (silence.statut !== 'rien_a_faire' || effets(silence).length || !silence.resultat?.silence) ko('L5', 'connexion déjà en erreur : le département doit se taire (rien lu, aucune alerte de plus)')
  for (const [issue, texte, alerte] of [['identifiants_refuses', REF.textes[1], true], ['injoignable', REF.textes[2], false]]) {
    const s = lire([], { donnees: { boite: { issue, messages: [] } } })
    if (s.resultat?.erreur !== texte) ko('L5', `${issue} : message « ${s.resultat?.erreur} » au lieu de celui de releverCanal`)
    if ((effets(s, 'alerter').length === 1) !== alerte) ko('L5', `${issue} : l'alerte ${alerte ? 'devrait' : 'ne devrait pas'} partir`)
  }
  const illisible = lire([], { donnees: { connexion: F.connexionFictive({ secret_n8n: null }) } })
  if (illisible.resultat?.erreur !== REF.textes[0] || illisible.statut === 'erreur') ko('L5', 'secret illisible : le message de releverCanal et l\'état « erreur » sont attendus, sans plantage')
  // L6 — aucun secret en sortie
  for (const s of [L1, L2, expire, silence, illisible, deuxMemeClient]) {
    const t = toutLeTexte(s)
    if (t.includes(F.SECRET) || t.includes('aaaaaaaaaaaaaaaa.bbbb')) ko('L6', 'le secret chiffré de la connexion se retrouve dans une sortie (journal, effets ou résultat)')
  }
  // L7 — lot et fenêtre
  const quarante = Array.from({ length: 45 }, (_, i) => F.msg(i + 1, `<lot${i}@c.invalid>`, `client${i}@lot.invalid`, `Demande ${i}`, `Bonjour, demande de devis numéro ${i} pour des travaux de plomberie.`, undefined, `Exemple. Client ${i}`))
  const lot = lire(quarante)
  if (lot.resultat.importes !== 40 || lot.resultat.restants !== 5) ko('L7', `45 messages : ${lot.resultat.importes} importés et ${lot.resultat.restants} reportés (40 et 5 attendus)`)
  const vieux = lire([F.msg(1, '<v@c.invalid>', 'ancien@client.invalid', 'Ancien', 'Bonjour, ceci est un message vieux de neuf jours déjà.', '2026-10-25T09:00:00.000Z')])
  if (vieux.resultat.importes !== 0 || vieux.resultat.ignores.hors_fenetre !== 1) ko('L7', 'un message de plus de 7 jours doit rester hors fenêtre')

  // R — la comparaison à releverCanal, cas par cas
  const rapport = comparer(X, ko)
  o.rapport?.push(...rapport)

  // B — lib-boite-brouillon
  const br = (over) => sortie1(enfantSeul(X, 'lib-boite-brouillon', [F.brouillonFictif(over)]))
  for (const offre of ['studio', 'signature']) {
    const s = br({ config: { offre } })
    const ap = effets(s, 'ajouter_brouillon_imap')
    if (s.statut !== 'ok' || ap.length !== 1) ko('B1', `${offre} : un APPEND est attendu (statut ${s.statut}, ${ap.length})`)
    if (s.effets_prevus.some((x) => /envoy|smtp|send/i.test(x.effet))) ko('B1', `${offre} : un brouillon ne doit jamais produire d'effet d'envoi (${s.effets_prevus.map((x) => x.effet)})`)
    if (ap[0] && JSON.stringify(ap[0].drapeaux) !== JSON.stringify(['\\Draft'])) ko('B1', 'le drapeau \\Draft manque')
    if (ap[0] && ap[0].dossier?.usage_special !== '\\Drafts') ko('B1', 'le dossier Brouillons doit être trouvé par son usage spécial \\Drafts')
    if (s.effets_faits.length || s.resultat?.envoye !== false) ko('B1', 'un brouillon n\'est jamais envoyé')
  }
  {
    const s = br({}), brut = effets(s, 'ajouter_brouillon_imap')[0]?.message_brut ?? ''
    const [tete, corps] = brut.split('\r\n\r\n')
    const h = Object.fromEntries(tete.split('\r\n').map((l) => [l.slice(0, l.indexOf(':')).toLowerCase(), l.slice(l.indexOf(':') + 2)]))
    const decode = (v) => v.replace(/=\?UTF-8\?B\?([^?]+)\?=/g, (_, b) => Buffer.from(b, 'base64').toString('utf8'))
    if (!decode(h.from ?? '').includes(F.ARTISAN_FICTIF.nom) || !(h.from ?? '').includes(F.ARTISAN_FICTIF.adresse)) ko('B2', `l'expéditeur du brouillon n'est pas l'artisan (${h.from})`)
    if (h.to !== 'marie.exemple@client-a.invalid' || h['in-reply-to'] !== '<m1@client-a.invalid>' || !/^Re: /.test(decode(h.subject ?? ''))) ko('B2', 'destinataire, In-Reply-To ou objet du brouillon faux')
    if (Buffer.from((corps ?? '').replace(/\r\n/g, ''), 'base64').toString('utf8').replace(/\r\n/g, '\n') !== TEXTE_REPONSE) ko('B2', 'le corps du brouillon n\'est pas la réponse préparée')
    if (/presti/i.test(brut)) ko('B3', '« Presti » dans un brouillon écrit au nom de l\'artisan (marque blanche)')
    const sansNom = effets(br({ config: { artisan: { nom: '', adresse: F.ARTISAN_FICTIF.adresse } } }), 'ajouter_brouillon_imap')[0]?.message_brut ?? ''
    if (/presti/i.test(sansNom) || !/^From: [^\r\n]*@/m.test(sansNom)) ko('B3', 'sans nom d\'artisan, l\'expéditeur ne doit jamais retomber sur « Presti »')
  }
  for (const [titre, over, motif] of [['conformité refusée', { donnees: { conformite: { verdict: 'refuse' } } }, 'refuse'], ['lecture de la porte illisible', { donnees: { conformite: { verdict: 'illisible' } } }, 'refuse'],
    ['opposition', { donnees: { destinataire: { email: 'marie.exemple@client-a.invalid', opposition: true } } }, 'refuse'], ['connexion en erreur', { donnees: { connexion: F.connexionFictive({ etat: 'erreur' }) } }, 'rien_a_faire'],
    ['interrupteur coupé', { config: { interrupteur_departement: false } }, 'rien_a_faire']]) {
    const s = br(over)
    if (s.statut !== motif || effets(s).length) ko('B4', `${titre} : ${motif} sans effet attendu (${s.statut}, ${effets(s).length} effet(s))`)
  }
  {
    const cle = effets(br({}), 'ajouter_brouillon_imap')[0]?.cle
    const encore = br({ donnees: { deja_ecrits: [cle] } })
    if (encore.statut !== 'rien_a_faire' || effets(encore).length) ko('B4', 'un brouillon déjà écrit ne doit pas être réécrit (idempotence)')
    if (br({}).effets_prevus[0]?.cle !== cle) ko('B4', 'la clé du brouillon n\'est pas stable')
    const autre = br({ donnees: { connexion: F.connexionFictive({ artisan_id: F.ORG2 }) } })
    if (autre.statut !== 'refuse' || effets(autre).length) ko('B4', 'la connexion d\'un autre compte ne doit pas servir')
  }

  // E — lib-boite-envoyer
  const ev = (over) => sortie1(enfantSeul(X, 'lib-boite-envoyer', [F.envoiFictif(over)]))
  const capSig = CODE.capacites.signature, capStu = CODE.capacites.studio
  if (JSON.stringify(capSig) !== JSON.stringify(['plateforme.ia.auto', 'assistant.pilote']) || capStu.length) ko('E0', `les offres du code ont changé (Studio ${capStu}, Signature ${capSig}) : relire le plan`)
  if (CODE.DELAI_ANNULATION_MIN !== 10 || CODE.PLAFOND_AUTO_JOUR !== 20 || CODE.ATTENTE_MAX_MS !== 24 * 3600000) ko('E0', 'les constantes du pilote ont changé (10 min, 20 par jour, 24 h)')
  if (!CODE.TYPES_PILOTE.includes('reponse_prospect')) ko('E0', 'le type reponse_prospect a disparu du pilote')
  {
    const ok = ev({})
    const smtp = effets(ok, 'envoyer_smtp')[0]
    if (ok.statut !== 'ok' || !smtp) ko('E1', `Signature, tout réuni : un envoi est attendu (${ok.statut} ${ok.erreurs})`)
    else {
      if (JSON.stringify(ok.effets_prevus.map((x) => x.effet)) !== JSON.stringify(['reclamer_action', 'envoyer_smtp', 'marquer_action', 'noter_evenement'])) ko('E1', 'l\'ordre des effets doit être : réclamer, envoyer, marquer, noter')
      const attendu = CODE.mentions[0][1]
      if (smtp.texte !== attendu) ko('E1', 'le texte envoyé n\'est pas celui de avecMentionAssistant (lib/mentionAssistant.ts) : mention d\'IA absente ou changée')
      if (smtp.reply_to !== F.ARTISAN_FICTIF.adresse) ko('E1', 'l\'adresse de l\'artisan doit être en réponse (lib/email.ts:6-11)')
      if (!smtp.expediteur.includes(F.ARTISAN_FICTIF.nom) || !smtp.expediteur.includes(F.ARTISAN_FICTIF.adresse)) ko('E1', 'l\'expéditeur doit être l\'artisan')
      if (/presti/i.test(JSON.stringify(smtp))) ko('E1', '« Presti » dans un e-mail au nom de l\'artisan')
      if (ok.effets_faits.length || ok.resultat.envoye !== false) ko('E1', 'en simulation rien n\'est envoyé')
      const smtpNoeud = noeud(ex['lib-boite-envoyer'], SMTP)
      const rendu = String(smtpNoeud.parameters.text).replace(/^=/, '').replace('{{ $json.envoi.corps }}', TEXTE_REPONSE).replace('{{ $json.envoi.nom_artisan }}', F.ARTISAN_FICTIF.nom)
      if (rendu !== smtp.texte) ko('E1', 'le texte du nœud SMTP désactivé n\'est pas celui que le workflow prévoit d\'envoyer')
    }
    const sansNom = effets(ev({ config: { artisan: { nom: '', adresse: F.ARTISAN_FICTIF.adresse } } }), 'envoyer_smtp')[0]
    if (!sansNom || /presti/i.test(JSON.stringify(sansNom)) || sansNom.expediteur !== F.ARTISAN_FICTIF.adresse) ko('E1', 'sans nom d\'artisan, l\'expéditeur ne doit pas retomber sur « Presti »')
    if (sansNom && !sansNom.texte.endsWith('l’assistant.')) ko('E1', 'sans nom d\'artisan, la mention d\'IA reste en pied')
  }
  const refus = [
    ['Studio (aucune des deux capacités)', { config: { offre: 'studio', capacites: capStu } }, 'offre'],
    ['seule plateforme.ia.auto', { config: { capacites: ['plateforme.ia.auto'] } }, 'offre'],
    ['mode assistée', { config: { mode_reponse: 'assistee' } }, 'mode_non_auto'], ['pilote inactif', { config: { pilote: { drapeau: true, actif: false, types: { reponse_prospect: true } } } }, 'pilote_inactif'],
    ['drapeau du pilote baissé', { config: { pilote: { drapeau: false, actif: true, types: { reponse_prospect: true } } } }, 'pilote_inactif'], ['type non activé', { config: { pilote: { drapeau: true, actif: true, types: {} } } }, 'type_inactif'],
    ['action annulée', { donnees: { action: { ...F.envoiFictif().donnees.action, statut: 'annulee' } } }, 'statut_annulee'],
    ['délai de 10 minutes non respecté à la préparation', { donnees: { action: { ...F.envoiFictif().donnees.action, prete_le: '2026-11-03T09:55:00.000Z' } } }, 'delai_trop_court'],
    ['trop ancienne (plus de 24 h)', { donnees: { maintenant: '2026-11-04T10:05:00.000Z' } }, 'trop_ancienne'], ['plafond du jour atteint', { config: { parties_depuis_24h: 20 } }, 'plafond'],
    ['conformité refusée', { donnees: { conformite: { verdict: 'refuse' } } }, 'conformite'], ['lecture de la porte illisible', { donnees: { conformite: { verdict: 'illisible' } } }, 'conformite'],
    ['opposition', { donnees: { destinataire: { email: 'marie.exemple@client-a.invalid', opposition: true } } }, 'opposition'], ['connexion expirée', { donnees: { connexion: F.connexionFictive({ etat: 'expiree' }) } }, 'connexion_expiree'],
    ['relance de devis (hors lot)', { donnees: { action: { ...F.envoiFictif().donnees.action, type: 'relance_devis' } } }, 'type_hors_lot']]
  for (const [titre, over, motif] of refus) {
    const s = ev(over)
    if (effets(s, 'envoyer_smtp').length || s.statut !== 'refuse' || s.resultat?.motif !== motif) ko('E2', `${titre} : refus « ${motif} » attendu, sans envoi (${s.statut}, ${s.resultat?.motif}, ${effets(s, 'envoyer_smtp').length} envoi)`)
    if (!effets(s, 'marquer_action').some((x) => x.statut === 'manuel')) ko('E2', `${titre} : l'action doit repasser en carte`)
  }
  for (const [titre, over, motif] of [['10 minutes non écoulées', { donnees: { maintenant: '2026-11-03T09:58:00.000Z' } }, 'delai_non_ecoule'], ['interrupteur coupé', { config: { interrupteur_general: false } }, 'interrupteur_coupe']]) {
    const s = ev(over)
    if (effets(s, 'envoyer_smtp').length || s.statut !== 'rien_a_faire' || s.resultat?.motif !== motif) ko('E2', `${titre} : attente « ${motif} » sans envoi attendue (${s.statut})`)
  }
  {
    const e1 = F.envoiFictif({ config: { parties_depuis_24h: 19 } }), e2 = F.envoiFictif({ config: { parties_depuis_24h: 19 } })
    e2.donnees.action = { ...e2.donnees.action, id: '00000000-0000-4000-8000-000000000752' }
    const r = enfantSeul(X, 'lib-boite-envoyer', [e1, e2]).sorties
    if (r.flatMap((s) => effets(s, 'envoyer_smtp')).length !== 1) ko('E3', `plafond du jour (19 parties + 2 envois dans un passage) : ${r.flatMap((s) => effets(s, 'envoyer_smtp')).length} envoi(s) prévu(s), 1 attendu`)
    const a = ev({}), b = ev({})
    if (a.resultat.cle !== b.resultat.cle) ko('E3', 'la clé d\'envoi n\'est pas stable')
    if (ev({ donnees: { connexion: F.connexionFictive({ artisan_id: F.ORG2 }) } }).statut !== 'refuse') ko('E3', 'la connexion d\'un autre compte ne doit pas servir à envoyer')
  }

  // P — presti-boite rejoué ; BN — le banc rejoué ; N — les essais enregistrés
  const essaiP = X.essais.find((x) => x.workflow === PARENT), essaiB = X.essais.find((x) => x.workflow === BANC)
  const epingles = Object.fromEntries(Object.entries(F.travailEssai()).map(([k, v]) => [k, v.map((x) => x.json)])) // les données épinglées de test_workflow sont enveloppées dans { json }
  const p = executer(ex[PARENT], [{}], { W, epingles })
  if (p.erreur) ko('P1', `rejeu de presti-boite : ${p.erreur}`)
  else {
    const bilan = p.sorties[0]
    const attendu = { simulation: true, arret: null, bilan: { 'lib-boite-lire@1': { ok: 2 }, 'lib-boite-brouillon@1': { ok: 1 }, 'lib-boite-envoyer@1': { ok: 1, rejete: 1 } }, importes: 3, deposes: 3, brouillons: 1, envois_prevus: 1, effets_faits: 0, defauts: 0 }
    if (JSON.stringify(bilan) !== JSON.stringify(attendu)) ko('P1', `bilan de presti-boite : ${JSON.stringify(bilan)}`)
    const pCoupe = executer(ex[PARENT], [{}], { W, epingles: { ...epingles, "Lire l'interrupteur général (simulation : épinglé)": [{ interrupteur_general: false }] } })
    if (pCoupe.erreur || pCoupe.sorties[0]?.arret !== 'interrupteur_general_coupe' || pCoupe.visites.some((v) => /^Appeler/.test(v))) ko('P2', 'interrupteur général coupé : rien ne doit être appelé')
    const pAbsent = executer(ex[PARENT], [{}], { W, epingles: { ...epingles, "Lire l'interrupteur général (simulation : épinglé)": [{}] } })
    if (pAbsent.visites.some((v) => /^Appeler/.test(v))) ko('P2', 'interrupteur illisible : le passage doit s\'arrêter (fail-closed)')
    if (essaiP) {
      for (const nom of ['Appeler lib-boite-lire', 'Appeler lib-boite-brouillon', 'Appeler lib-boite-envoyer', 'Bilan du passage']) {
        const rec = JSON.stringify(essaiP.sorties[nom]?.[0] ?? null)
        const mine = JSON.stringify(p.par[nom]?.[0]?.[0] ?? null)
        if (rec !== mine) ko('N1', `essai n8n #${essaiP.execution} : « ${nom} » rendu par n8n ≠ rejeu hors ligne`)
      }
    } else ko('N1', 'essais-n8n.json : l\'essai de presti-boite manque')
  }
  const bn = executer(ex[BANC], [{}], { W })
  if (bn.erreur) ko('P3', `rejeu du banc : ${bn.erreur}`)
  else {
    const noms = ['Appeler lib-boite-lire (1)', 'Appeler lib-boite-lire (2)', 'Appeler lib-boite-brouillon (3)', 'Appeler lib-boite-envoyer (4)', 'Appeler lib-boite-envoyer (5)']
    const statuts = noms.map((n) => bn.par[n]?.[0]?.[0]?.[0]?.statut)
    if (JSON.stringify(statuts) !== JSON.stringify(['ok', 'ok', 'ok', 'ok', 'refuse'])) ko('P3', `statuts du banc : ${statuts}`)
    if (bn.sorties.some((s) => s.defauts)) ko('P3', 'le banc compte un défaut (effet fait en simulation, appel en erreur)')
    if (essaiB) for (const n of noms) if (JSON.stringify(essaiB.sorties[n]?.[0] ?? null) !== JSON.stringify(bn.par[n]?.[0]?.[0] ?? null)) ko('N1', `essai n8n #${essaiB.execution} : « ${n} » rendu par n8n ≠ rejeu hors ligne`)
    if (!essaiB) ko('N1', 'essais-n8n.json : l\'essai du banc manque')
  }
  return e
}

// ─── La comparaison à releverCanal, cas par cas ───────────────────────────────────────────────────────────────────────────────────────────────────
// Le modèle de référence est la transcription de releverCanal (lib/releveCanal.ts:68-222) : mêmes constantes, MÊME estUneVraieDemande (extraite du code).
function refReleve({ msgs, canalId, adresse, dejaParCanal = [], leads = [], maintenant, derniere = null }) {
  const JOUR = 86400000, t0 = Date.parse(maintenant)
  const depuis = Math.max(derniere ? Date.parse(derniere) : 0, t0 - 7 * JOUR)
  const limite = t0 - 30 * JOUR
  const base = leads.map((l) => ({ ...l, t: Date.parse(l.created_at) }))
  const deja = new Set(dejaParCanal.map((d) => `${d.canal}|${d.id}`))
  const importes = [], apart = []
  let creees = 0
  for (const m of msgs.slice().sort((a, b) => a.uid - b.uid)) {
    if (importes.length >= 40) break
    if (m.date && Math.floor(Date.parse(m.date) / JOUR) < Math.floor(depuis / JOUR)) continue
    if (!m.message_id) continue
    if (m.de_email && /(^|\.)(leboncoin\.fr|linkedin\.com)$/.test(m.de_email.split('@')[1])) { apart.push(m.message_id); continue } // branche réseaux (drapeau canauxNotifications levé)
    if (!REF.estUneVraieDemande(m.de_email, m.sujet, m.texte, adresse)) continue
    if (deja.has(`${canalId}|${m.message_id}`)) continue
    const existant = base.filter((l) => l.contact === m.de_email && l.t >= limite).sort((a, b) => b.t - a.t)[0]
    if (!existant) { creees++; base.push({ contact: m.de_email, t: t0, created_at: maintenant }) }
    deja.add(`${canalId}|${m.message_id}`)
    importes.push(m.message_id)
  }
  return { importes, creees, apart }
}
const ECARTS_DECLARES = {
  'même message déjà importé par l\'autre boîte du compte': 'E1 — releverCanal garde le Message-ID par boîte (messages.externe_id + canal_id) et le rangerait deux fois ; n8n le garde par compte : « une seule fois »',
  'adresse du lead écrite avec des majuscules': 'E2 — releverCanal compare le contact à la casse près (.eq(\'contact\', …)) et ouvre une seconde conversation ; n8n compare sans la casse',
}
function comparer(X, ko) {
  const rapport = []
  const C = REF.constantes
  for (const [k, v] of Object.entries(C)) if (!v) ko('R0', `lib/releveCanal.ts ne dit plus ce que la copie figée suppose (${k}) : relire la comparaison`)
  const M = (uid, id, de, sujet, texte, date) => F.msg(uid, id, de, sujet, texte, date)
  const T = 'Bonjour, je voudrais un devis pour refaire ma salle de bains complète, merci.'
  const lead = (contact, created) => ({ lead_id: '00000000-0000-4000-8000-000000000761', artisan_id: F.ORG, contact, created_at: created })
  const cas = [
    ['un vrai client', [M(1, '<a1@c.invalid>', 'luc@client.invalid', 'Devis', T)], {}],
    ['deux messages du même client dans le lot', [M(1, '<a1@c.invalid>', 'luc@client.invalid', 'Devis', T), M(2, '<a2@c.invalid>', 'luc@client.invalid', 'Re: Devis', T)], {}],
    ['expéditeur automatique', [M(1, '<a1@c.invalid>', 'noreply@robot.invalid', 'Facture', T)], {}],
    ['expéditeur « mailer-daemon »', [M(1, '<a1@c.invalid>', 'mailer-daemon@robot.invalid', 'Échec', T)], {}],
    ['envoyé par l\'artisan à lui-même', [M(1, '<a1@c.invalid>', F.ARTISAN_FICTIF.adresse, 'Note', T)], {}],
    ['texte trop court', [M(1, '<a1@c.invalid>', 'luc@client.invalid', 'Salut', 'ok merci')], {}],
    ['newsletter courte', [M(1, '<a1@c.invalid>', 'promo@boutique.invalid', 'Newsletter de novembre', 'Nos offres du mois, se désinscrire en bas.')], {}],
    ['newsletter longue (400 caractères et plus)', [M(1, '<a1@c.invalid>', 'promo@boutique.invalid', 'Newsletter de novembre', 'Nos offres du mois. '.repeat(30))], {}],
    ['sans Message-ID', [M(1, null, 'luc@client.invalid', 'Devis', T)], {}],
    ['sans expéditeur lisible', [M(1, '<a1@c.invalid>', null, 'Devis', T)], {}],
    ['déjà importé par cette boîte', [M(1, '<a1@c.invalid>', 'luc@client.invalid', 'Devis', T)], { dejaMemeCanal: ['<a1@c.invalid>'] }],
    ['même message déjà importé par l\'autre boîte du compte', [M(1, '<a1@c.invalid>', 'luc@client.invalid', 'Devis', T)], { dejaAutreCanal: ['<a1@c.invalid>'] }],
    ['conversation ouverte il y a 10 jours', [M(1, '<a1@c.invalid>', 'luc@client.invalid', 'Devis', T)], { leads: [lead('luc@client.invalid', '2026-10-24T08:00:00.000Z')] }],
    ['conversation vieille de 31 jours', [M(1, '<a1@c.invalid>', 'luc@client.invalid', 'Devis', T)], { leads: [lead('luc@client.invalid', '2026-10-03T08:00:00.000Z')] }],
    ['adresse du lead écrite avec des majuscules', [M(1, '<a1@c.invalid>', 'luc@client.invalid', 'Devis', T)], { leads: [lead('Luc@Client.invalid', '2026-10-24T08:00:00.000Z')] }],
    ['message de neuf jours (fenêtre de 7 jours)', [M(1, '<a1@c.invalid>', 'luc@client.invalid', 'Devis', T, '2026-10-25T09:00:00.000Z')], {}],
    ['première relève après une relève de la veille', [M(1, '<a1@c.invalid>', 'luc@client.invalid', 'Devis', T, '2026-11-02T09:00:00.000Z'), M(2, '<a2@c.invalid>', 'luc@client.invalid', 'Suite', T, '2026-11-03T08:00:00.000Z')], { derniere: '2026-11-03T06:00:00.000Z' }],
    ['45 messages (plafond de 40)', Array.from({ length: 45 }, (_, i) => M(i + 1, `<p${i}@c.invalid>`, `c${i}@lot.invalid`, 'Devis', T)), {}],
    ['notification d\'un réseau (Le Bon Coin)', [M(1, '<a1@leboncoin.fr>', 'alerte@leboncoin.fr', 'Nouveau message', T)], {}],
  ]
  for (const [titre, msgs, o] of cas) {
    const canal = F.CANAL, autre = F.CANAL_B
    const ref = refReleve({ msgs, canalId: canal, adresse: F.ARTISAN_FICTIF.adresse, maintenant: F.MAINTENANT, derniere: o.derniere ?? null, leads: (o.leads ?? []).map((l) => ({ contact: l.contact, created_at: l.created_at })),
      dejaParCanal: [...(o.dejaMemeCanal ?? []).map((id) => ({ canal, id })), ...(o.dejaAutreCanal ?? []).map((id) => ({ canal: autre, id }))] })
    const deja_importes = [...(o.dejaMemeCanal ?? []), ...(o.dejaAutreCanal ?? [])].map((id) => ({ artisan_id: F.ORG, message_id: id }))
    const s = sortie1(executer(X.ex['lib-boite-lire'], [F.lire(msgs, { donnees: { deja_importes, conversations: o.leads ?? [], canal: { ...F.canalFictif(canal), derniere_releve: o.derniere ?? null } } })], { W: X.ex }))
    const mien = { importes: effets(s, 'deposer_message').map((d) => d.externe_id), creees: effets(s, 'creer_conversation').length, apart: [] }
    mien.apart = s.resultat?.ignores?.laisse_au_code ? msgs.filter((m) => m.de_email && /leboncoin|linkedin/.test(m.de_email)).map((m) => m.message_id) : []
    const pareil = JSON.stringify([ref.importes, ref.creees, ref.apart]) === JSON.stringify([mien.importes, mien.creees, mien.apart])
    const declare = ECARTS_DECLARES[titre]
    if (!pareil && !declare) ko('R1', `« ${titre} » : n8n diffère de releverCanal sans écart déclaré (releverCanal : ${ref.importes.length} importé(s), ${ref.creees} conversation(s) ; n8n : ${mien.importes.length}, ${mien.creees})`)
    if (pareil && declare) ko('R1', `« ${titre} » : écart déclaré mais décisions identiques (la déclaration est périmée)`)
    rapport.push(`| ${titre} | ${ref.importes.length} importé(s), ${ref.creees} conv., ${ref.apart.length} à part (branche réseaux) | ${mien.importes.length} importé(s), ${mien.creees} conv., ${mien.apart.length} laissé(s) au code | ${pareil ? 'identique' : declare ?? 'ÉCART NON DÉCLARÉ'} |`)
  }
  // Les messages d'erreur, un par un.
  const texteDe = { identifiants_refuses: REF.textes[1], injoignable: REF.textes[2] }
  for (const [issue, texte] of Object.entries(texteDe)) {
    const s = sortie1(executer(X.ex['lib-boite-lire'], [F.lire([], { donnees: { boite: { issue, messages: [] } } })], { W: X.ex }))
    rapport.push(`| boîte : ${issue} | « ${texte} » | « ${s.resultat?.erreur} » | ${s.resultat?.erreur === texte ? 'identique' : 'ÉCART NON DÉCLARÉ'} |`)
    if (s.resultat?.erreur !== texte) ko('R1', `${issue} : le message diffère de releverCanal`)
  }
  rapport.push(`| identifiants illisibles | « ${REF.textes[0]} » | « ${sortie1(executer(X.ex['lib-boite-lire'], [F.lire([], { donnees: { connexion: F.connexionFictive({ secret_n8n: null }) } })], { W: X.ex })).resultat?.erreur} » | identique |`)
  return rapport
}

// ─── Les mutants : chacun doit faire rougir le juge, pour la raison nommée ─────────────────────────────────────────────────────────────────────────
const muter = (nomWf, noeudNom, de, vers) => (X) => {
  const Y = { ex: copie(X.ex), essais: X.essais }
  const n = Y.ex[nomWf].nodes.find((x) => x.name === noeudNom)
  const c = String(n.parameters.jsCode)
  if (!c.includes(de)) throw new Error(`mutant inapplicable : « ${de.slice(0, 60)} » absent de ${nomWf}`)
  n.parameters.jsCode = c.replace(de, vers)
  return Y
}
const surNoeud = (nomWf, noeudNom, f) => (X) => { const Y = { ex: copie(X.ex), essais: X.essais }; f(Y.ex[nomWf].nodes.find((x) => x.name === noeudNom), Y.ex[nomWf]); return Y }
const MUTANTS = [
  ['un message importé deux fois (la garde du Message-ID ôtée)', muter('lib-boite-lire', LOGIQUE['lib-boite-lire'], F.MARQUES.doublon, ''), /^L2 /],
  ['deux conversations pour le même client dans un lot', muter('lib-boite-lire', LOGIQUE['lib-boite-lire'], F.MARQUES.conversation, 'let conv = existantes.get(contact) || null;'), /^L3 /],
  ['deux boîtes du même passage sans état partagé (même message déposé deux fois)', muter('lib-boite-lire', LOGIQUE['lib-boite-lire'], F.MARQUES.etat_partage, 'const dejaVus = new Set(); etat.vus = dejaVus;'), /^L3 /],
  ['un brouillon envoyé en Studio (l\'APPEND devient un envoi)', muter('lib-boite-brouillon', LOGIQUE['lib-boite-brouillon'], F.MARQUES.brouillon, "effet: 'envoyer_smtp'"), /^B1 /],
  ['un secret dans un journal', muter('lib-boite-lire', LOGIQUE['lib-boite-lire'], F.MARQUES.journal_releve + " canal.id, importes", F.MARQUES.journal_releve + " canal.id, cx.secret_n8n + importes"), /^L6 /],
  ['un jeton expiré qui fait planter', muter('lib-boite-lire', LOGIQUE['lib-boite-lire'], F.MARQUES.echec, F.MARQUES.echec + " throw new Error('jeton ' + issue);"), /^L5 /],
  ['« Presti » dans un e-mail au nom de l\'artisan (brouillon sans nom)', muter('lib-boite-brouillon', LOGIQUE['lib-boite-brouillon'], "return nom ? mot2047(nom) + ' <' + artisan.adresse + '>' : artisan.adresse;", "return mot2047(nom || 'Presti') + ' <' + artisan.adresse + '>';"), /^B3 /],
  ['« Presti » dans un envoi SMTP (envoi sans nom)', muter('lib-boite-envoyer', LOGIQUE['lib-boite-envoyer'], "return nom ? nom + ' <' + artisan.adresse + '>' : artisan.adresse;", "return (nom || 'Presti') + ' <' + artisan.adresse + '>';"), /^E1 /],
  ['la boîte d\'un autre compte lue (l\'isolation ôtée)', muter('lib-boite-lire', LOGIQUE['lib-boite-lire'], F.MARQUES.isolation, 'if (false) {'), /^L4 /],
  ['un envoi en Studio (la capacité de l\'offre non contrôlée)', muter('lib-boite-envoyer', LOGIQUE['lib-boite-envoyer'], "if (!(c.capacites.includes('plateforme.ia.auto') && c.capacites.includes('assistant.pilote'))) return manuel('offre');", ''), /^E2 /],
  ['le plafond du jour oublié', muter('lib-boite-envoyer', LOGIQUE['lib-boite-envoyer'], F.MARQUES.plafond, ''), /^E[23] /],
  ['le délai de 10 minutes oublié', muter('lib-boite-envoyer', LOGIQUE['lib-boite-envoyer'], "if (maintenant < Date.parse(a.part_le)) return attendre('delai_non_ecoule');", ''), /^E2 /],
  ['la mention d\'IA retirée', muter('lib-boite-envoyer', LOGIQUE['lib-boite-envoyer'], "return corps.endsWith(mention) ? corps : corps + '\\n\\n—\\n' + mention;", 'return corps;'), /^E1 /],
  ['la porte de conformité ignorée (brouillon)', muter('lib-boite-brouillon', LOGIQUE['lib-boite-brouillon'], "if (d.conformite.verdict !== 'accepte') return", "if (false) return"), /^B4 /],
  ['le nœud SMTP activé', surNoeud('lib-boite-envoyer', SMTP, (n) => { n.disabled = false }), /^S11 /],
  ['le SMTP branché sur la sortie « vrai » de la porte', surNoeud('lib-boite-envoyer', PORTE, (n, wf) => { wf.connections[PORTE].main[0].push({ node: SMTP, type: 'main', index: 0 }) }), /^S11 /],
  ['un identifiant ajouté au SMTP', surNoeud('lib-boite-envoyer', SMTP, (n) => { n.credentials = { smtp: { id: 'IdentifiantFictif', name: 'SMTP' } } }), /^S2 /],
  ['un nœud d\'envoi dans le brouillon', surNoeud('lib-boite-brouillon', 'Préparer le brouillon', (n, wf) => { wf.nodes.push({ id: 'x', name: 'Envoyer le brouillon', type: T.envoi, typeVersion: 2.1, position: [0, 0], parameters: {}, disabled: true }) }), /^S4 /],
  ['le workflow publié (actif)', surNoeud('presti-boite', 'Bilan du passage', (n, wf) => { wf.active = true }), /^S1 /],
  ['la cadence passée à 15 minutes', surNoeud('presti-boite', 'Toutes les 5 minutes', (n) => { n.parameters.rule.interval[0].minutesInterval = 15 }), /^S12 /],
  ['un enfant appelable par n\'importe quel workflow', surNoeud('lib-boite-lire', 'Contrat de sortie', (n, wf) => { wf.settings.callerPolicy = 'any' }), /^S5 /],
  ['le gabarit « Contrat d\'entrée » affaibli', muter('lib-boite-brouillon', "Contrat d'entrée", "if (s.additionalProperties === false)", "if (false)"), /^S7 /],
  ['une lecture HTTP ajoutée à la relève', surNoeud('lib-boite-lire', 'Contrat de sortie', (n, wf) => { wf.nodes.push({ id: 'h', name: 'Lire en direct', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [0, 0], parameters: {} }) }), /^S4 /],
  ['le gabarit « Contrat de sortie » affaibli (un effet FAIT en simulation)', muter('lib-boite-envoyer', "Contrat de sortie", "'effets_faits': simulation || rejete ? [] : liste(j.effets_faits),", "'effets_faits': [{ effet: 'envoyer_smtp' }],"), /^S7 /],
]

// ─── Lancement ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const X = charger(DOSSIER)
const rapport = []
const base = jouer(X, { rapport })
console.log(`boite-n8n-qa : exports lus dans ${path.relative(RACINE, DOSSIER)} (${NOMS.filter((n) => X.ex[n]).length}/${NOMS.length}), ${X.essais.length} essai(s) n8n`)
console.log('Comparaison à releverCanal (lib/releveCanal.ts), cas par cas :')
console.log('| cas | releverCanal | n8n (lib-boite-lire) | verdict |\n|---|---|---|---|')
for (const l of rapport) console.log(l)
console.log(base.length ? base.map((m) => `✗ ${m}`).join('\n') : '✓ S, C, L, R, B, E, P, N : structure, contrat, relève, comparaison, brouillon, envoi, rejeux et essais n8n tenus')
let echecs = base.length ? 1 : 0, verts = 0
if (!base.length) {
  for (const [titre, f, attendu] of MUTANTS) {
    let m
    try { m = jouer(f(X), { egalite: false }) } catch (err) { m = []; console.log(`  ✗ mutant « ${titre} » inapplicable : ${err.message}`); verts++; continue }
    const bon = m.filter((x) => attendu.test(x))
    console.log(`  ${bon.length ? '✓' : '✗'} mutant « ${titre} » ${bon.length ? 'fait rougir le juge' : 'NE FAIT PAS rougir le juge pour sa raison'}\n      → ${(bon[0] ?? m[0] ?? 'aucun manquement').slice(0, 170)}`)
    if (!bon.length) verts++
  }
  // Et le gabarit : l'égalité à construire.mjs rougit aussi pour un octet changé.
  const Y = muter('lib-boite-lire', LOGIQUE['lib-boite-lire'], 'const JOUR = 86400000;', 'const JOUR = 86400000; ')(X)
  const eg = jouer(Y)
  console.log(`  ${eg.some((x) => /^S8 /.test(x)) ? '✓' : '✗'} mutant « un octet changé dans un nœud Code » (égalité à construire.mjs)\n      → ${(eg[0] ?? 'aucun manquement').slice(0, 170)}`)
  if (!eg.some((x) => /^S8 /.test(x))) verts++
}
console.log(`boite-n8n-qa : ${MUTANTS.length + 1} mutants`)
if (echecs || verts) { if (verts) console.log(`  ✗ ${verts} mutant(s) laissent le juge vert`); console.log('ÉCHEC'); process.exit(1) }
console.log('OK')
