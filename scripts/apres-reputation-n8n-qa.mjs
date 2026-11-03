// JUGE HORS LIGNE du département « Après-chantier et réputation » (tâche 036-006, prompt 6, lot 6 ; A18, B8, décisions 3 et 4 du plan
// plans/011-cadrage-01-11/p6-signature/premiere-reponse.md). Aucun réseau, aucune base, aucun modèle, aucune donnée réelle. Il lit les exports (le JSON rendu
// par le MCP `get_workflow_details`) de presti-dep-apres, lib-avis-lire, lib-avis-repondre et du banc presti-banc-apres dans .orchestre/preuves/036-006/, et :
//   S  — leur STRUCTURE : inactifs ; aucun identifiant ; AUCUN nœud réseau, d'envoi ni Google Business Profile (« Reply Poster » absent) ; réglages (workflow d'erreur,
//        Europe/Paris, délai, appelants en liste) ; le gabarit « Contrat » de 035-003 à l'identique ; la porte « simulation » ; chaque nœud Code égal à construire.mjs.
//   C  — le gabarit « Contrat » REJOUÉ (node:vm) : hors contrat, rien ; hors simulation, l'arrêt ; une adresse ou un numéro dans l'entrée est refusé.
//   L  — lib-avis-lire : sentiment (note de 3 ou moins, mots de litige du VRAI code) ; un avis n'entre qu'une fois ; un avis d'un autre compte n'est pas lu ; un FAUX AVIS est signalé.
//   R  — lib-avis-repondre : TOUT avis devient une carte, jamais une publication, en Studio comme en Signature ; le brouillon est revalidé (« Presti », lien, montant, promesse, nom du client).
//   D  — presti-dep-apres : les propositions sont CELLES de lib/apresChantier.ts (comparaison cas par cas) ; le consentement (opposé, STOP, litige, illisible, aucun canal) ; le plafond de 10 par jour ;
//        le rappel d'entretien proposé, jamais envoyé seul ; Studio sans CRM ; interrupteurs ; un autre compte ; aucun effet hors des cartes.
//   K  — ce que dit le VRAI code : demander_avis n'est pas exécutable par le pilote, aucun type « réponse à un avis » dans la liste fermée, les textes et les règles SMS sont ceux du code.
//   P, N — le chef et le banc REJOUÉS hors ligne (Execute Sub-workflow rejoue les exports enfants) ; les sorties enregistrées de `test_workflow` (essais-n8n.json) sont celles du rejeu.
// Puis il prouve qu'il sait rougir : chaque MUTANT (un avis négatif publié, une demande d'avis sans consentement, un STOP ignoré, un faux avis non signalé, « Presti » dans la
// réponse, un avis d'un autre compte…) doit le faire échouer pour sa raison.
//   node scripts/apres-reputation-n8n-qa.mjs [dossier des exports]
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync, rmdirSync } from 'node:fs'
import os from 'node:os'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.resolve(RACINE, process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '.orchestre/preuves/036-006')
const F = await import(pathToFileURL(path.join(RACINE, '.orchestre/preuves/036-006/construire.mjs')).href)
const F3 = await import(pathToFileURL(path.join(RACINE, '.orchestre/preuves/035-003/construire.mjs')).href)
const ENFANTS = F.ENFANTS, CHEF = F.CHEF, BANC = F.BANC
const NOMS = [...ENFANTS, CHEF, BANC]
const T = { trigger: 'n8n-nodes-base.executeWorkflowTrigger', horloge: 'n8n-nodes-base.scheduleTrigger', code: 'n8n-nodes-base.code', si: 'n8n-nodes-base.if', arret: 'n8n-nodes-base.stopAndError',
  note: 'n8n-nodes-base.stickyNote', appel: 'n8n-nodes-base.executeWorkflow', noop: 'n8n-nodes-base.noOp', merge: 'n8n-nodes-base.merge' }
const PORTE = 'Porte simulation', ARRET = 'Hors simulation : non branché'
const sha = (t) => createHash('sha256').update(String(t), 'utf8').digest('hex')
const copie = (o) => JSON.parse(JSON.stringify(o))
const EMPREINTE_ENTREE = '20f6ff371969130e45b37ea58466baaa9b4581f7dbe145863a2f4a1a57713899'
const EMPREINTE_SORTIE = '8f0f37c68d78f3154204655b3f5343889c5c74733c8b852f27e34bc517394a70'
const ID_ERREUR = F.ERREUR
const LOGIQUE = F.NOMS_LOGIQUE, CODES = F.CODES
const NOM_A = F.NOM_A

// ─── Ce que disent le VRAI code (pilote, offres, après-chantier, SMS), chargés dans un sous-processus, jamais recopiés ───────────────────────────────
const CHANTIERS_REF = (chantiers) => chantiers.map((c) => ({ id: c.id, titre: c.titre, statut: c.statut, date_fin_reelle: c.date_fin_reelle, client_nom: c.client_nom, textes: c.textes }))
const CAS_PROPOSITIONS = (() => {
  const C = F.CHANTIERS
  const tous = { avis: true, entretien: true, actif_depuis: '2026-10-20', texte_avis: null, texte_entretien: null }
  const ch = (n, fin, titre = 'Exemple. Chantier') => ({ id: F.CHANTIERS[0].id.slice(0, -2) + String(n), titre, statut: 'termine', date_fin_reelle: fin, client_nom: 'Exemple. Client', textes: [], contact: F.CHANTIERS[0].contact, artisan_id: F.ORG })
  return [
    ['toutes les fixtures, avis et entretien', C, tous, [], '2026-11-03'],
    ['rappels déjà posés par le passage quotidien', C, tous, ['avis:' + C[0].id, 'entretien:' + C[7].id + ':1'], '2026-11-03'],
    ['avis seulement', C, { ...tous, entretien: false }, [], '2026-11-03'],
    ['entretien seulement', C, { ...tous, avis: false }, [], '2026-11-03'],
    ['tout désactivé (défaut)', C, { ...tous, avis: false, entretien: false }, [], '2026-11-03'],
    ['activation le jour même (pas de rattrapage)', C, { ...tous, actif_depuis: null }, [], '2026-11-03'],
    ['chaudière ancienne : le prochain anniversaire à venir', [ch(40, '2025-11-10', 'Exemple. Remplacement de la chaudière')], tous, [], '2026-11-03'],
    ['pompe à chaleur : tous les deux ans', [ch(41, '2025-01-12', 'Exemple. Installation de la pompe à chaleur')], tous, [], '2026-11-03'],
    ['ramonage fini un 29 février : fin de mois', [ch(42, '2024-02-29', 'Exemple. Ramonage du conduit')], tous, [], '2026-11-03'],
    ['chantier non terminé', [{ ...ch(43, '2026-10-30'), statut: 'en_cours' }], tous, [], '2026-11-03'],
    ['chantier fini demain (futur)', [ch(44, '2026-11-04')], tous, [], '2026-11-03'],
    ['équipement de plus de trois ans', [ch(45, '2022-05-10', 'Exemple. Remplacement de la chaudière')], tous, [], '2026-11-03'],
  ].map(([titre, chantiers, reglages, existantes, jour]) => ({ titre, chantiers, reglages, existantes, jour }))
})()
const TEXTES_SMS = [
  'Bonjour Exemple. Luc, merci de votre confiance. Votre avis nous aiderait : repondez-nous ici. Exemple. Bati-Demo. STOP pour ne plus recevoir',
  'Bonjour, merci de votre confiance. Votre avis nous aiderait.', 'Bonjour, votre avis ici https://exemple.fr STOP', 'Bonjour, 50 € STOP', 'Bonjour, dernière chance, STOP', 'Bonjour Zoé ç STOP',
  'Bonjour, ' + 'x'.repeat(170) + ' STOP', '', 'Bonjour. Le STOP ne compte pas : stoppé', 'Bonjour, pas de lien exemple.com STOP',
]
function lireCode() {
  const prog = `const R = await import(${J(pathToFileURL(path.join(RACINE, 'lib/pilote/regles.ts')).href)});
const P = await import(${J(pathToFileURL(path.join(RACINE, 'lib/plans.ts')).href)});
const A = await import(${J(pathToFileURL(path.join(RACINE, 'lib/apresChantier.ts')).href)});
const Tour = await import(${J(pathToFileURL(path.join(RACINE, 'lib/apresChantierTour.ts')).href)});
const S = await import(${J(pathToFileURL(path.join(RACINE, 'lib/sms/encodage.ts')).href)});
const L = await import(${J(pathToFileURL(path.join(RACINE, 'lib/sms/lien.ts')).href)});
const cas = ${J(CAS_PROPOSITIONS)}, sms = ${J(TEXTES_SMS)};
const propositions = cas.map((c) => A.propositions({ chantiers: c.chantiers, reglages: c.reglages, existantes: new Set(c.existantes), jour: c.jour }).map((p) => ({ cle: p.cle, type: p.type, echeance: p.echeance })).sort((a, b) => a.cle.localeCompare(b.cle)));
const vars = { client: 'Exemple. Marie', chantier: 'Exemple. Rénovation de la salle de bains', artisan: 'Exemple. Bati-Demo', equipement: 'chaudière' };
const vars2 = { client: 'Exemple. Inès', chantier: 'Exemple. Remplacement de la chaudière', artisan: 'Exemple. Bati-Demo', equipement: 'chaudière' };
process.stdout.write(JSON.stringify({
  OUTIL_TYPE: R.OUTIL_TYPE, EXECUTABLES: R.OUTILS_EXECUTABLES_PILOTE, JAMAIS_AUTO: R.OUTILS_JAMAIS_AUTO, MOTS_ESCALADE: R.MOTS_ESCALADE_TOUJOURS,
  capacites: Object.fromEntries(['studio', 'signature'].map((pl) => [pl, ['assistant', 'crm', 'plateforme.ia.auto', 'assistant.pilote'].filter((c) => P.peut(pl, c))])),
  constantes: { DELAI_AVIS_JOURS: A.DELAI_AVIS_JOURS, RATTRAPAGE_JOURS: A.RATTRAPAGE_JOURS, PREAVIS_JOURS: A.PREAVIS_JOURS, ENTRETIEN_ANS_MAX: A.ENTRETIEN_ANS_MAX, MAX_PAR_COMPTE_JOUR: A.MAX_PAR_COMPTE_JOUR, MAX_POSES_PAR_PASSAGE: Tour.MAX_POSES_PAR_PASSAGE, LIEN_AVIS_AUTORISE: A.LIEN_AVIS_AUTORISE },
  equipements: A.EQUIPEMENTS.map((e) => ({ nom: e.nom, mois: e.mois, source: e.motif.source, flags: e.motif.flags })),
  textes: { avis: A.remplirApres(A.TEXTES_APRES_PAR_DEFAUT.avis, vars), entretien: A.remplirApres(A.TEXTES_APRES_PAR_DEFAUT.entretien, vars2), erreurs: [A.erreurTexteApres(A.remplirApres(A.TEXTES_APRES_PAR_DEFAUT.avis, vars)), A.erreurTexteApres(A.remplirApres(A.TEXTES_APRES_PAR_DEFAUT.entretien, vars))] },
  propositions, sms: sms.map((t) => S.controlerTexte(t, 1)), lienSms: L.lienSms('0612345678', sms[0]).ok,
}));`
  // Le programme passe par un fichier, pas par `-e` : sous Windows, une ligne de commande de plus de 32 767 caractères échoue (ENAMETOOLONG, relevé au PC le 03/11).
  const dossier = mkdtempSync(path.join(os.tmpdir(), 'apres-qa-'))
  const fichier = path.join(dossier, 'lire-code.mjs')
  writeFileSync(fichier, prog)
  try {
    return JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', './scripts/ts-loader.mjs', fichier], { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 26 }))
  } finally {
    rmSync(fichier, { force: true })
    rmdirSync(dossier)
  }
}
function J(x) { return JSON.stringify(x) }
const CODE = lireCode()

// ─── L'exécuteur hors ligne : les nœuds de l'export, tels quels, dans node:vm (avec $("nœud") pour relire un nœud déjà passé) ─────────────────────
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
  const m = /^=\{\{\s*\$json\.([\w.?]+)(\s*===\s*true)?\s*\}\}$/.exec(gauche)
  if (!m || (c.conditions ?? []).length !== 1) throw new Error(`${n.name} : condition illisible hors ligne (${gauche})`)
  const vrai = [], faux = []
  for (const it of items) {
    let v = m[1].split(/\??\./).reduce((o, k) => (o == null ? undefined : o[k]), it.json)
    if (m[2]) v = v === true
    if (c.options?.typeValidation === 'strict' && typeof v !== 'boolean') throw new Error(`${n.name} : valeur non booléenne en typage strict`)
    ;(v === true ? vrai : faux).push(it)
  }
  return [vrai, faux]
}
function executer(wf, entrees, o = {}) {
  const { W = {}, profondeur = 0 } = o
  const parNom = new Map(wf.nodes.map((n) => [n.name, n]))
  const racines = wf.nodes.filter((n) => n.type === T.trigger || n.type === T.horloge)
  const res = { sorties: [], par: {}, visites: [], erreur: null }
  if (racines.length !== 1) return { ...res, erreur: `${racines.length} déclencheur(s)` }
  const dollar = (nom) => { const runs = res.par[nom]; const items = runs?.[runs.length - 1]?.[0] ?? []; return { isExecuted: !!runs, first: () => (items[0] ? { json: copie(items[0]) } : null), all: () => items.map((json) => ({ json: copie(json) })) } }
  const file = [[racines[0].name, entrees.map((j) => ({ json: copie(j) })), false]]
  for (let pas = 0; file.length; pas++) {
    if (pas > 600) return { ...res, erreur: 'boucle' }
    const [nom, items] = file.shift()
    const n = parNom.get(nom)
    if (!n) return { ...res, erreur: `nœud absent : ${nom}` }
    res.visites.push(nom)
    let outs
    try {
      if (n.type === T.trigger || n.type === T.horloge || n.type === T.noop || n.type === T.merge) outs = [items]
      else if (n.type === T.code) outs = [lancerCode(n.parameters?.jsCode ?? '', items, dollar)]
      else if (n.type === T.si) outs = evaluerSi(n, items)
      else if (n.type === T.arret) return { ...res, erreur: String(n.parameters?.errorMessage ?? 'Stop and Error') }
      else if (n.type === T.appel && profondeur < 2) {
        const id = n.parameters?.workflowId?.value
        const enfant = Object.values(W).find((w) => w && w.id === id)
        if (!enfant || n.parameters?.source !== 'database') throw new Error(`sous-workflow ${id} introuvable ou hors source database`)
        if (enfant.settings?.callerPolicy !== 'workflowsFromAList' || !String(enfant.settings?.callerIds ?? '').split(',').includes(wf.id)) throw new Error(`${enfant.name} n'autorise pas ${wf.name} à l'appeler`)
        const r = executer(enfant, items.map((i) => i.json), { W, profondeur: profondeur + 1 })
        if (r.erreur) { if (n.onError === 'continueRegularOutput') outs = [[{ json: { error: r.erreur } }]]; else throw new Error(`${enfant.name} : ${r.erreur}`) }
        else outs = [r.sorties.map((json) => ({ json }))]
      } else throw new Error(`type de nœud inconnu du rejeu : ${n.type}`)
    } catch (e) { return { ...res, erreur: `${nom} : ${e.message}` } }
    ;(res.par[nom] ??= []).push(outs.map((o2) => o2.map((i) => i.json)))
    const liens = wf.connections?.[nom]?.main ?? []
    if (!liens.flat().filter(Boolean).length && n.type !== T.note) res.sorties.push(...(outs[0] ?? []).map((i) => i.json))
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
const seul = (X, nom, envs) => executer(X.ex[nom], envs, { W: X.ex })
const sortie1 = (r) => r.sorties[0]
const effets = (s, type) => (s?.effets_prevus ?? []).filter((e) => !type || e.effet === type)
const ID_ENFANTS = (ex) => Object.fromEntries(NOMS.map((n) => [n, ex[n]?.id]))
const TYPES_CARTE = ['preparer_carte', 'preparer_carte_lot']

// ─── Les contrôles ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function jouer(X, o = {}) {
  const e = []
  const ko = (lettre, m) => e.push(`${lettre} ${m}`)
  const { ex } = X
  for (const nom of NOMS) if (!ex[nom]) { ko('S', `export de ${nom} absent`); return e }
  const ids = ID_ENFANTS(ex)

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
    for (const n of wf.nodes.filter((n) => /httpRequest|supabase|emailSend|emailReadImap|executeCommand|postgres|function$|slack|telegram|gmail|whatsApp|twilio|googleBusinessProfile/i.test(n.type))) ko('S4', `${nom} : nœud réseau, d'envoi ou Google Business Profile interdit (${n.name}, ${n.type}) — le « Reply Poster » n'existe pas`)
    const liste = String(s.callerIds ?? '').split(',').sort().join(',')
    if (ENFANTS.includes(nom)) { if (s.callerPolicy !== 'workflowsFromAList' || liste !== [ids[CHEF], ids[BANC]].sort().join(',')) ko('S5', `${nom} : appelants ${s.callerPolicy}/${s.callerIds} (presti-dep-apres et presti-banc-apres seuls attendus)`) }
    else if (nom === CHEF) { if (s.callerPolicy !== 'workflowsFromAList' || liste !== [F.CERVEAU, ids[BANC]].sort().join(',')) ko('S5', `${nom} : appelants ${s.callerPolicy}/${s.callerIds} (presti-cerveau et presti-banc-apres seuls attendus)`) }
    else if (s.callerPolicy !== 'none') ko('S5', `${nom} : politique d'appel ${s.callerPolicy} (none attendu)`)
  }
  for (const nom of [...ENFANTS, CHEF]) {
    const wf = ex[nom], contrat = `${nom}@1`
    const decl = wf.nodes.filter((n) => n.type === T.trigger)
    if (decl.length !== 1 || aretes(wf, decl[0].name)[0]?.vers !== "Contrat d'entrée") ko('S6', `${nom} : doit commencer par le Contrat d'entrée`)
    const entree = codeDe(wf, "Contrat d'entrée"), sortie = codeDe(wf, 'Contrat de sortie')
    const corpsE = entree.split(F3.REPERE_ENTREE)[1], corpsS = sortie.split(F3.REPERE_SORTIE)[1]
    if (sha(corpsE ?? '') !== EMPREINTE_ENTREE) ko('S7', `${nom} : le corps du gabarit « Contrat d'entrée » n'est plus celui de 035-003`)
    if (sha(corpsS ?? '') !== EMPREINTE_SORTIE) ko('S7', `${nom} : le corps du gabarit « Contrat de sortie » n'est plus celui de 035-003`)
    if (o.egalite !== false) {
      if (entree !== F3.codeEntree(contrat, F.SCHEMAS[nom])) ko('S8', `${nom} : « Contrat d'entrée » différent de construire.mjs`)
      if (sortie !== F3.codeSortie(contrat)) ko('S8', `${nom} : « Contrat de sortie » différent de construire.mjs`)
      if (nom !== CHEF) { if (codeDe(wf, LOGIQUE[nom]) !== CODES[nom]) ko('S8', `${nom} : « ${LOGIQUE[nom]} » différent de construire.mjs`) }
      else for (const [k, js] of Object.entries(F.CHEF_CODE)) if (codeDe(wf, k) !== js) ko('S8', `${nom} : « ${k} » différent de construire.mjs`)
    }
    const porte = noeud(wf, PORTE)
    if (!porte || !/^\s*porte\s*:\s*simulation\s*$/m.test(String(porte.notes ?? ''))) ko('S9', `${nom} : porte « simulation » absente`)
    if (wf.nodes.filter((n) => n.name === 'Contrat de sortie').length !== 1 || aretes(wf, 'Contrat de sortie').length) ko('S9', `${nom} : un seul Contrat de sortie, dernier nœud`)
    if (!aretes(wf, PORTE).some((a) => a.sortie === 1 && a.vers === ARRET)) ko('S9', `${nom} : la sortie « faux » de la porte doit mener à l'arrêt « hors simulation »`)
  }
  {
    const wf = ex[CHEF]
    const appels = wf.nodes.filter((n) => n.type === T.appel)
    const vises = appels.map((n) => Object.entries(ids).find(([, id]) => id === n.parameters?.workflowId?.value)?.[0]).sort()
    if (JSON.stringify(vises) !== JSON.stringify([...ENFANTS].sort())) ko('S12', `${CHEF} : appelle ${vises.join(', ')} (les deux spécialistes attendus)`)
    for (const n of appels) if (n.onError !== 'continueRegularOutput' || n.parameters?.source !== 'database') ko('S12', `${CHEF} : ${n.name} doit être en source database, un échec ne fait pas échouer le département`)
    const b = ex[BANC]
    if (!b.nodes.some((n) => n.type === T.horloge)) ko('S12', 'le banc doit avoir un déclencheur')
    for (const n of b.nodes.filter((n) => n.type === T.appel)) if (!Object.values(ids).includes(n.parameters?.workflowId?.value)) ko('S12', `${BANC} : ${n.name} appelle un workflow inconnu`)
  }
  if (e.some((m) => m.startsWith('S'))) return e

  // C — le gabarit « Contrat » rejoué
  const lire = (avis, over = {}) => sortie1(seul(X, 'lib-avis-lire', [F.lireFictif(avis, over)]))
  const rep = (over = {}) => sortie1(seul(X, 'lib-avis-repondre', [F.repondreFictif(over)]))
  const chef = (over = {}) => sortie1(seul(X, CHEF, [F.chefFictif(over)]))
  for (const nom of [...ENFANTS, CHEF]) {
    const hors = seul(X, nom, [{ x: 1 }])
    if (!hors.erreur && sortie1(hors)?.statut !== 'rejete') ko('C1', `${nom} : une entrée hors contrat doit être rejetée`)
    else if (!hors.erreur && (effets(sortie1(hors)).length || sortie1(hors).effets_faits.length)) ko('C1', `${nom} : une entrée hors contrat ne doit produire aucun effet`)
  }
  const envs = { 'lib-avis-lire': F.lireFictif(), 'lib-avis-repondre': F.repondreFictif(), [CHEF]: F.chefFictif() }
  for (const nom of [...ENFANTS, CHEF]) {
    const r = seul(X, nom, [{ ...envs[nom], simulation: false }])
    if (!r.erreur || !/Hors simulation/.test(r.erreur) || r.sorties.length) ko('C2', `${nom} : hors simulation, le travail doit s'arrêter à « ${ARRET} » sans sortie (${r.erreur ?? 'aucune erreur'})`)
  }
  for (const [titre, env] of [['une adresse e-mail dans un avis', F.lireFictif([F.avisFictif('x1', 3, 'Appelez moi, ecrivez a marie' + String.fromCharCode(64) + 'exemple.invalid merci')])], ['un numéro dans un avis', F.lireFictif([F.avisFictif('x2', 3, 'Mon numero est le 06 12 34 56 78 rappelez moi')])]]) {
    const s = sortie1(seul(X, 'lib-avis-lire', [env]))
    if (s?.statut !== 'rejete') ko('C3', `${titre} : doit être rejeté par le contrat « sans contact » (${s?.statut})`)
  }

  // L — lib-avis-lire
  const L1 = lire(F.AVIS_MELES)
  const attendu = { a2: ['negatif', false], a3: ['negatif', false], a4: ['negatif', true], a1: ['positif', false], a5: ['positif', true], a6: ['positif', true], a7: ['positif', false] }
  if (L1.statut !== 'ok' || L1.resultat.avis.length !== 7) ko('L1', `sept avis mêlés : ${L1.resultat?.avis?.length} classé(s) (${L1.statut})`)
  else {
    for (const a of L1.resultat.avis) if (JSON.stringify([a.sentiment, a.suspect]) !== JSON.stringify(attendu[a.ref])) ko('L1', `avis ${a.ref} : ${a.sentiment}/${a.suspect ? 'suspect' : 'sûr'}, attendu ${attendu[a.ref]}`)
    if (L1.resultat.avis.slice(0, 3).some((a) => a.sentiment !== 'negatif')) ko('L1', 'les avis négatifs doivent passer en premier')
    if (L1.resultat.negatifs !== 3 || L1.resultat.suspects !== 3) ko('L1', `compteurs : ${L1.resultat.negatifs} négatif(s), ${L1.resultat.suspects} suspect(s) (3 et 3 attendus)`)
  }
  for (const [note, texte, sent] of [[4, 'Tres bien mais un avocat va m ecrire a ce sujet', 'negatif'], [5, 'Tres bien, chantier propre et equipe agreable', 'positif'], [3, 'Correct sans plus et des retards', 'negatif'], [4, 'Un tres bon travail sans aucun souci', 'positif']]) {
    const s = lire([F.avisFictif('t1', note, texte)])
    if (s.resultat?.avis?.[0]?.sentiment !== sent) ko('L1', `« ${texte} » (${note} étoiles) : ${s.resultat?.avis?.[0]?.sentiment}, attendu ${sent}`)
  }
  {
    const art = lire([F.avisFictif('t2', 5, 'Superbe travail mais le coulage de la dalle etait tordu')], { config: { mots_escalade_artisan: ['tordu'] } })
    if (art.resultat?.avis?.[0]?.sentiment !== 'negatif') ko('L1', 'un mot de l\'artisan doit rendre un avis négatif')
  }
  const deja = L1.effets_prevus.map((x) => ({ artisan_id: F.ORG, cle: x.cle }))
  const L2 = lire(F.AVIS_MELES, { donnees: { deja_vus: deja } })
  if (L2.resultat?.avis?.length || effets(L2).length || L2.resultat?.ignores?.deja_vu !== 7) ko('L2', `un avis déjà vu est classé de nouveau (${L2.resultat?.avis?.length} avis, ${effets(L2).length} effet(s))`)
  if (JSON.stringify(lire(F.AVIS_MELES).effets_prevus.map((x) => x.cle)) !== JSON.stringify(L1.effets_prevus.map((x) => x.cle))) ko('L2', 'les clés ne sont pas stables d\'un rejeu à l\'autre (idempotence)')
  const L2b = lire([F.AVIS_MELES[0], F.AVIS_MELES[0]])
  if (L2b.resultat?.avis?.length !== 1) ko('L2', `le même avis collé deux fois dans le lot : ${L2b.resultat?.avis?.length} classé(s) (1 attendu)`)
  if (!effets(L1).every((x) => x.effet === 'noter_evenement' && x.type === 'avis_recu' && !JSON.stringify(x.faits).match(/[a-z]{4,} [a-z]{4,}/))) ko('L2', 'seul l\'événement « avis_recu » est permis, sans texte libre dans ses faits')
  // L3 — les mots de litige sont ceux du VRAI code
  const manquants = F.MOTS_LITIGE.filter((m) => !CODE.MOTS_ESCALADE.includes(m))
  if (manquants.length) ko('L3', `mots de litige absents de MOTS_ESCALADE_TOUJOURS (lib/pilote/regles.ts) : ${manquants.join(', ')}`)
  const litigeCopie = /const MOTS_LITIGE = (\[.*?\]);/.exec(codeDe(ex['lib-avis-lire'], LOGIQUE['lib-avis-lire']))?.[1]
  if (!litigeCopie || JSON.stringify(JSON.parse(litigeCopie)) !== JSON.stringify(F.MOTS_LITIGE)) ko('L3', 'la copie figée des mots de litige du nœud diffère de construire.mjs')
  // L4 — isolation
  for (const [titre, env] of [['un avis', F.lireFictif([F.avisFictif('i1', 2, 'Retard important', { artisan_id: F.ORG2 })])], ['un avis déjà vu', F.lireFictif(F.AVIS_MELES, { donnees: { deja_vus: [{ artisan_id: F.ORG2, cle: 'av:col:a1' }] } })]]) {
    const s = sortie1(seul(X, 'lib-avis-lire', [env]))
    if (s.statut !== 'refuse' || effets(s).length || s.resultat) ko('L4', `${titre} d'un autre compte : lu et classé (statut ${s.statut}, ${effets(s).length} effet(s))`)
  }
  // L5 — le faux avis est SIGNALÉ
  {
    const un = (ref, note, texte, over = {}) => F.avisFictif(ref, note, texte, over)
    const seulClient = lire([un('f1', 1, 'Une entreprise a fuir absolument, jamais vu ca', { client_connu: false })]).resultat.avis[0]
    if (!seulClient.suspect || !seulClient.motifs_suspicion.includes('client_inconnu')) ko('L5', 'un avis d\'un client inconnu doit être signalé (client_inconnu)')
    const sur = lire([un('f2', 1, 'Une entreprise a fuir absolument, jamais vu ca', { client_connu: true })]).resultat.avis[0]
    if (sur.suspect) ko('L5', 'un avis d\'un client connu ne doit pas être signalé à tort')
    const inconnu = lire([un('f3', 5, 'Superbe travail, equipe sympathique et ponctuelle', { client_connu: null })]).resultat.avis[0]
    if (inconnu.suspect) ko('L5', 'une provenance inconnue (null) n\'est pas un faux avis : pas d\'accusation')
    const copies = lire([un('f4', 5, 'Parfait, je recommande vivement cette entreprise serieuse', { auteur: 'Exemple. A' }), un('f5', 5, 'Parfait, je recommande vivement cette entreprise serieuse', { auteur: 'Exemple. B' })]).resultat.avis
    if (!copies.every((a) => a.motifs_suspicion.includes('doublon_texte'))) ko('L5', 'deux avis au texte identique doivent être signalés (doublon_texte)')
    const rafale = lire([1, 2, 3].map((i) => un('r' + i, 1, 'Mauvaise experience numero ' + i + ' avec cette societe', { date: `2026-11-03T09:${10 * i}:00.000Z`, auteur: 'Exemple. R' + i }))).resultat.avis
    if (!rafale.every((a) => a.motifs_suspicion.includes('rafale'))) ko('L5', 'trois avis de même note en moins de deux heures doivent être signalés (rafale)')
    const etale = lire([1, 2, 3].map((i) => un('e' + i, 1, 'Mauvaise experience numero ' + i + ' avec cette societe', { date: `2026-11-0${i}T09:00:00.000Z`, auteur: 'Exemple. E' + i }))).resultat.avis
    if (etale.some((a) => a.suspect)) ko('L5', 'trois avis étalés sur trois jours ne sont pas une rafale')
    if (seulClient.sentiment !== 'negatif') ko('L5', 'un avis suspect reste classé (négatif) : il n\'est pas écarté')
  }
  // L6 — interrupteurs
  for (const [titre, config] of [['général', { interrupteur_general: false }], ['département', { interrupteur_departement: false }]]) {
    const s = lire(F.AVIS_MELES, { config })
    if (s.resultat?.avis?.length || effets(s).length || s.resultat?.silence !== true) ko('L6', `interrupteur ${titre} coupé : le lecteur doit se taire`)
  }
  if (JSON.stringify(L1).match(/"(email|telephone|mot_de_passe|secret|token)"/i)) ko('L7', 'une clé de contact ou de secret apparaît dans la sortie')

  // R — lib-avis-repondre
  const neg = F.avisLu(), pos = F.avisLu({ cle: 'av:col:a1', ref: 'a1', note: 5, sentiment: 'positif', motifs: [], auteur: 'Exemple. Marie', texte: 'Travail soigné.' })
  const sus = F.avisLu({ cle: 'av:col:a4', ref: 'a4', suspect: true, motifs_suspicion: ['client_inconnu'], auteur: 'Exemple. Anonyme' })
  const variantes = [['négatif, Signature, pilote et mode auto', { donnees: { avis: neg }, config: { offre: 'signature' } }], ['négatif, Studio', { donnees: { avis: neg }, config: { offre: 'studio' } }],
    ['positif, Signature', { donnees: { avis: pos, brouillon: F.BROUILLON_POSITIF }, config: { offre: 'signature' } }], ['positif, Studio', { donnees: { avis: pos, brouillon: F.BROUILLON_POSITIF }, config: { offre: 'studio' } }],
    ['suspect', { donnees: { avis: sus } }], ['sans brouillon', { donnees: { avis: neg, brouillon: null } }], ['porte de conformité refusée', { donnees: { conformite: { verdict: 'refuse' } } }]]
  const sorties = Object.fromEntries(variantes.map(([t, v]) => [t, rep(v)]))
  for (const [titre, s] of Object.entries(sorties)) {
    const cartes = effets(s, 'preparer_carte')
    if (s.statut !== 'ok' || cartes.length !== 1) { ko('R1', `${titre} : une carte et une seule attendue (statut ${s.statut}, ${cartes.length} carte(s))`); continue }
    if (cartes[0].publication !== 'apres_clic_artisan') ko('R1', `${titre} : la publication doit attendre le clic de l'artisan (${cartes[0].publication})`)
    const hors = effets(s).filter((x) => !['preparer_carte', 'noter_evenement'].includes(x.effet))
    if (hors.length) ko('R1', `${titre} : effet interdit ${hors.map((x) => x.effet).join(', ')} — aucune publication n'existe`)
    if (s.effets_faits.length) ko('R1', `${titre} : un effet FAIT en simulation`)
    if (s.resultat.part_seul !== false) ko('R1', `${titre} : « part_seul » doit être faux`)
    if (/presti/i.test(JSON.stringify(s.effets_prevus))) ko('R6', `${titre} : « Presti » dans les cartes (marque blanche)`)
  }
  {
    const a = sorties['négatif, Signature, pilote et mode auto'], b = sorties['négatif, Studio']
    const de = (s) => JSON.stringify(s.effets_prevus)
    if (a && b && de(a) !== de(b)) ko('R2', 'Studio et Signature doivent préparer exactement la même carte pour un avis négatif')
    if (sorties['négatif, Studio'].effets_prevus[0]?.pourquoi !== 'avis_negatif' || sorties['positif, Studio'].effets_prevus[0]?.pourquoi !== 'positif_type_non_accepte' || sorties['suspect'].effets_prevus[0]?.pourquoi !== 'avis_suspect') ko('R2', 'le motif de la carte est faux (avis_negatif, positif_type_non_accepte, avis_suspect)')
    if (sorties['suspect'].effets_prevus[0]?.brouillon !== null || sorties['suspect'].effets_prevus[0]?.si_suspect !== 'a_signaler_a_google_par_l_artisan') ko('R2', 'un avis suspect : pas de brouillon, et l\'artisan décide de le signaler')
    if (sorties['sans brouillon'].effets_prevus[0]?.brouillon !== null || sorties['porte de conformité refusée'].effets_prevus[0]?.brouillon !== null) ko('R2', 'sans brouillon ou sans accord de la porte : la carte n\'a pas de brouillon')
    if (sorties['négatif, Studio'].effets_prevus[0]?.priorite !== 'haute') ko('R2', 'un avis négatif est une carte de priorité haute')
  }
  for (const [titre, texte, motif] of [['« Presti » nommé', 'Merci pour votre retour, nous avons transmis votre message a notre equipe Presti pour suite.', 'marque'], ['« PRESTI » en majuscules', 'Bonjour, merci pour votre retour. Message envoye depuis PRESTI.', 'marque'],
    ['un lien', 'Merci, retrouvez nos conditions sur exemple.fr pour en savoir plus sur nos engagements.', 'lien'], ['un montant', 'Nous vous proposons un geste de 50 euros pour nous excuser du retard constate.', 'montant'],
    ['une promesse de remboursement', 'Nous allons vous rembourser intégralement ce chantier des demain, soyez rassure.', 'promesse'], ['le nom du client', 'Bonjour Exemple. Paul, merci pour votre message et desole pour ce retard important.', 'nom_du_client'],
    ['un texte trop court', 'Merci a vous.', 'trop_court']]) {
    const s = rep({ donnees: { brouillon: { texte, modele: 'claude-haiku-5-5' } } })
    const c = effets(s, 'preparer_carte')[0]
    if (!c || c.brouillon !== null || c.motif_brouillon !== motif) ko('R3', `brouillon avec ${titre} : doit être refusé (${motif}), obtenu ${c?.motif_brouillon ?? s.statut}`)
    if (/presti/i.test(JSON.stringify(effets(s)[0]?.brouillon ?? ''))) ko('R3', `« Presti » est passé dans une réponse`)
  }
  for (const verdict of ['refuse', 'illisible']) { const c = effets(rep({ donnees: { conformite: { verdict } } }), 'preparer_carte')[0]; if (!c || c.brouillon !== null) ko('R3', `porte de conformité « ${verdict} » : le brouillon doit être écarté`) }
  if (effets(rep(), 'preparer_carte')[0]?.brouillon !== F.BROUILLON_NEGATIF.texte) ko('R3', 'un brouillon valable et accepté doit être gardé tel quel')
  {
    const s = sortie1(seul(X, 'lib-avis-repondre', [F.repondreFictif({ donnees: { artisan_id: F.ORG2 } })]))
    if (s.statut !== 'refuse' || effets(s).length) ko('R4', `un avis d'un autre compte : traité (statut ${s.statut}, ${effets(s).length} effet(s))`)
    const s2 = sortie1(seul(X, 'lib-avis-repondre', [F.repondreFictif({ donnees: { deja_cartes: [{ artisan_id: F.ORG2, cle: 'ra:col:a2' }] } })]))
    if (s2.statut !== 'refuse') ko('R4', 'une carte lue d\'un autre compte : l\'enfant doit refuser')
  }
  {
    const dc = rep({ donnees: { deja_cartes: [{ artisan_id: F.ORG, cle: 'ra:col:a2' }] } })
    if (effets(dc).length || dc.resultat?.motif !== 'deja_cartee') ko('R5', 'une carte déjà posée ne doit pas être refaite (idempotence)')
    for (const config of [{ interrupteur_general: false }, { interrupteur_departement: false }]) if (effets(rep({ config })).length) ko('R5', 'interrupteur coupé : aucune carte')
  }

  // K — ce que dit le VRAI code
  {
    const K = CODE
    for (const outil of ['demander_avis', 'envoyer_rappel_entretien']) {
      if (K.OUTIL_TYPE[outil] !== 'assistant_client') ko('K1', `${outil} n'est plus typé assistant_client dans lib/pilote/regles.ts`)
      if (K.EXECUTABLES.includes(outil)) ko('K1', `${outil} est devenu exécutable par le pilote : la copie « carte seulement » du chef est périmée`)
    }
    if (Object.keys(K.OUTIL_TYPE).some((o) => /avis/.test(o) && o !== 'demander_avis') || Object.values(K.OUTIL_TYPE).some((t) => /avis/.test(t))) ko('K1', 'un type « réponse à un avis » est entré dans la liste fermée du pilote : Benj l\'a-t-il accepté ? la copie du chef est périmée')
    if (!K.capacites.studio.includes('assistant') || !K.capacites.signature.includes('assistant')) ko('K2', 'la capacité « assistant » n\'est plus en Studio et Signature (porte de la lecture des avis)')
    if (K.capacites.studio.includes('crm') || !K.capacites.signature.includes('crm')) ko('K2', 'la capacité « crm » n\'est plus Signature seulement (porte de la demande d\'avis, comme le passage quotidien)')
    const nodeA = codeDe(ex[CHEF], NOM_A)
    const ligneC = /const DELAI_AVIS_JOURS = (\d+), RATTRAPAGE_JOURS = (\d+), PREAVIS_JOURS = (\d+), ENTRETIEN_ANS_MAX = (\d+), MAX_PAR_COMPTE_JOUR = (\d+), MAX_POSES_PAR_PASSAGE = (\d+);/.exec(nodeA)
    const c = K.constantes
    if (!ligneC || JSON.stringify(ligneC.slice(1).map(Number)) !== JSON.stringify([c.DELAI_AVIS_JOURS, c.RATTRAPAGE_JOURS, c.PREAVIS_JOURS, c.ENTRETIEN_ANS_MAX, c.MAX_PAR_COMPTE_JOUR, c.MAX_POSES_PAR_PASSAGE])) ko('K3', `constantes du chef ${ligneC?.slice(1)} ≠ code ${[c.DELAI_AVIS_JOURS, c.RATTRAPAGE_JOURS, c.PREAVIS_JOURS, c.ENTRETIEN_ANS_MAX, c.MAX_PAR_COMPTE_JOUR, c.MAX_POSES_PAR_PASSAGE]}`)
    if (c.LIEN_AVIS_AUTORISE !== false) ko('K3', 'LIEN_AVIS_AUTORISE est levé : le chef refuse encore tout lien, la copie est périmée')
    const eq = [...nodeA.matchAll(/\{ nom: '([^']+)', mois: (\d+), motif: \/(.+?)\/([a-z]*) \}/g)].map((m) => ({ nom: m[1], mois: +m[2], source: m[3], flags: m[4] }))
    if (JSON.stringify(eq) !== JSON.stringify(K.equipements)) ko('K4', 'les équipements à entretenir du chef ne sont plus ceux de lib/apresChantier.ts')
    if (K.textes.erreurs.some((x) => x !== null)) ko('K4', 'les textes par défaut du code ne passent plus son propre contrôle')
    const brut = /const GSM_BASE = [\s\S]*?(?=\nfunction texteSms)/.exec(nodeA)?.[0]
    if (!brut) ko('K5', 'la fonction refusSms est introuvable dans le nœud du chef')
    else {
      const refusSms = vm.runInNewContext(brut + '\n;refusSms', {})
      TEXTES_SMS.forEach((t, i) => { if ((refusSms(t) ?? null) !== (K.sms[i] ?? null)) ko('K5', `règle SMS : « ${t.slice(0, 40)} » → chef ${refusSms(t)} ≠ lib/sms/encodage.ts ${K.sms[i]}`) })
    }
    if (K.lienSms !== true) ko('K5', 'le texte SMS du chef n\'ouvre plus un lien sms: valable (lib/sms/lien.ts)')
  }

  // D — presti-dep-apres
  const C0 = chef()
  const lot = effets(C0, 'preparer_carte_lot')[0]
  if (C0.statut !== 'ok' || !lot) ko('D3', `le cas complet doit préparer une carte de lot (statut ${C0.statut}, erreurs ${C0.erreurs})`)
  else {
    const dest = Object.fromEntries(lot.destinataires.map((d) => [d.chantier_id.slice(-2), d.canal]))
    if (JSON.stringify(dest) !== JSON.stringify({ 10: 'email', 11: 'sms_lien' })) ko('D2', `destinataires ${JSON.stringify(dest)} (10 par e-mail et 11 par lien sms: attendus)`)
    const exclus = Object.fromEntries(lot.exclus.map((x) => [x.chantier_id.slice(-2), x.motif]))
    if (JSON.stringify(exclus) !== JSON.stringify({ 12: 'oppose', 13: 'stop', 14: 'litige', 15: 'aucun_canal_consenti', 19: 'consentement_illisible' })) ko('D2', `exclus ${JSON.stringify(exclus)} (opposé, STOP, litige, aucun canal, opposition illisible attendus)`)
    if (lot.destinataires.some((d) => d.chantier_id.endsWith('16'))) ko('D2', 'un chantier fini hier (avis dû dans deux jours) ne doit pas être dans le lot')
    if (lot.part_seul !== false || lot.publication !== 'apres_clic_artisan') ko('D9', 'la carte de lot doit attendre le clic de l\'artisan')
    const mail = lot.destinataires.find((d) => d.canal === 'email'), sms = lot.destinataires.find((d) => d.canal === 'sms_lien')
    if (mail?.texte !== CODE.textes.avis) ko('D3', 'le texte de la demande d\'avis par e-mail n\'est pas le texte par défaut de lib/apresChantier.ts, rempli')
    if (!sms || sms.texte !== TEXTES_SMS[0]) ko('D3', `le texte SMS préparé n'est pas celui attendu (${sms?.texte})`)
    if (CODE.sms[0] !== null) ko('D3', 'le texte SMS de référence est refusé par lib/sms/encodage.ts : la fixture est périmée')
    if (/presti/i.test(JSON.stringify(lot))) ko('D11', '« Presti » dans la carte de lot (marque blanche)')
  }
  {
    // D1 — les propositions sont celles de lib/apresChantier.ts
    CAS_PROPOSITIONS.forEach((cas, i) => {
      const donnees = { chantiers: cas.chantiers.map((c) => ({ ...c, artisan_id: F.ORG, contact: c.contact ?? F.CHANTIERS[0].contact })), cles_existantes: cas.existantes, jour: cas.jour, avis: [], brouillons_avis: [], conformites_avis: [] }
      const s = chef({ config: { reglages: cas.reglages }, donnees })
      const mien = (s.resultat?.propositions ?? []).map((p) => ({ cle: p.cle, type: p.type, echeance: p.echeance })).sort((a, b) => a.cle.localeCompare(b.cle))
      const rapport = options.rapport
      const pareil = JSON.stringify(mien) === JSON.stringify(CODE.propositions[i])
      if (!pareil) ko('D1', `« ${cas.titre} » : le chef propose ${JSON.stringify(mien)} ; lib/apresChantier.ts propose ${JSON.stringify(CODE.propositions[i])}`)
      if (rapport) rapport.push(`| ${cas.titre} | ${CODE.propositions[i].length} proposition(s) | ${mien.length} proposition(s) | ${pareil ? 'identique' : 'ÉCART'} |`)
    })
  }
  {
    // D4 — le plafond de 10 par jour
    const douze = Array.from({ length: 12 }, (_, i) => F.chantierFictif(20 + i, '2026-10-29', { client_nom: 'Exemple. Client ' + (20 + i) }))
    const s = chef({ donnees: { chantiers: douze } })
    const l = effets(s, 'preparer_carte_lot')[0]
    if (!l || l.destinataires.length !== CODE.constantes.MAX_PAR_COMPTE_JOUR || l.reportes !== 2) ko('D4', `12 chantiers : ${l?.destinataires?.length} destinataire(s) et ${l?.reportes} reporté(s) (10 et 2 attendus)`)
    const s2 = chef({ donnees: { chantiers: douze, deja_demandes_aujourdhui: 7 } })
    const l2 = effets(s2, 'preparer_carte_lot')[0]
    if (!l2 || l2.destinataires.length !== 3 || l2.reportes !== 9) ko('D4', `7 déjà partis aujourd'hui : ${l2?.destinataires?.length} destinataire(s) et ${l2?.reportes} reporté(s) (3 et 9 attendus)`)
    const s3 = chef({ donnees: { chantiers: douze, deja_demandes_aujourdhui: 10 } })
    if (effets(s3, 'preparer_carte_lot').length) ko('D4', 'le plafond du jour atteint : aucune carte de lot ne doit être posée')
  }
  {
    // D5 — le rappel d'entretien est PROPOSÉ
    const cartes = effets(C0, 'preparer_carte').filter((x) => x.type === 'rappel_entretien')
    if (cartes.length !== 1 || cartes[0].date_proposee !== '2026-11-18' || cartes[0].equipement !== 'chaudière' || cartes[0].cle !== 'entretien:' + F.CHANTIERS[7].id + ':1') ko('D5', `rappel d'entretien : ${cartes.length} carte(s), date ${cartes[0]?.date_proposee} (une carte, le 2026-11-18, attendue)`)
    else {
      if (cartes[0].part_seul !== false || cartes[0].publication !== 'apres_clic_artisan') ko('D5', 'un rappel d\'entretien ne part jamais seul')
      if (cartes[0].texte !== CODE.textes.entretien) ko('D5', 'le texte du rappel d\'entretien n\'est pas celui de lib/apresChantier.ts')
    }
    if (C0.resultat?.entretiens?.exclus?.oppose !== 1) ko('D5', 'l\'entretien d\'un client opposé doit être exclu et compté')
    const sansReglage = chef({ config: { reglages: { avis: true, entretien: false, actif_depuis: '2026-10-20', texte_avis: null, texte_entretien: null } } })
    if (effets(sansReglage, 'preparer_carte').some((x) => x.type === 'rappel_entretien')) ko('D5', 'entretien désactivé dans les réglages : aucun rappel (désactivé par défaut)')
  }
  {
    // D6 — l'offre : la demande d'avis suit le CRM (Signature), la lecture des avis suit l'assistant
    const studio = chef({ config: { offre: 'studio', capacites: ['assistant'] } })
    if (effets(studio, 'preparer_carte_lot').length || effets(studio, 'preparer_carte').some((x) => x.type === 'rappel_entretien')) ko('D6', 'sans la capacité crm : ni demande d\'avis ni rappel d\'entretien (comme le passage quotidien)')
    if (!effets(studio, 'preparer_carte').some((x) => x.type === 'reponse_avis')) ko('D6', 'Studio garde la capacité assistant : les cartes de réponse aux avis restent préparées')
    const rien = chef({ config: { offre: 'essentiel', capacites: [] } })
    if (effets(rien, 'preparer_carte').length || effets(rien, 'preparer_carte_lot').length) ko('D6', 'sans capacité : aucune carte')
  }
  {
    // D7 — interrupteurs, config absente (ce que le Cerveau de 036-001 envoie aujourd'hui)
    for (const [titre, config] of [['général', { interrupteur_general: false }], ['département', { interrupteur_departement: false }]]) {
      const s = chef({ config })
      if (s.statut !== 'rien_a_faire' || effets(s).length) ko('D7', `interrupteur ${titre} coupé : le département doit se taire (statut ${s.statut}, ${effets(s).length} effet(s))`)
    }
    const nu = sortie1(seul(X, CHEF, [F.enveloppe('presti-dep-apres@1', { evenements: [{ id: F.ORG, type: 'chantier_termine' }] }, {}, F.ORG, 'exemple:essai:cerveau')]))
    if (nu.statut !== 'rien_a_faire' || effets(nu).length || nu.resultat?.arret !== 'config_absente') ko('D7', `la charge actuelle du Cerveau (config vide) : le chef doit se taire (${nu.statut}, arrêt ${nu.resultat?.arret})`)
  }
  {
    // D8 — un autre compte
    for (const [titre, over] of [['un chantier', { donnees: { chantiers: [{ ...F.CHANTIERS[0], artisan_id: F.ORG2 }] } }], ['un avis', { donnees: { avis: [F.avisFictif('z1', 2, 'Retard', { artisan_id: F.ORG2 })] } }]]) {
      const s = chef(over)
      if (s.statut !== 'refuse' || effets(s).length) ko('D8', `${titre} d'un autre compte : traité (statut ${s.statut}, ${effets(s).length} effet(s))`)
    }
  }
  {
    // D9 — rien ne part, rien n'est publié
    const tous = effets(C0)
    const hors = tous.filter((x) => !F.EFFETS_PERMIS.includes(x.effet))
    if (hors.length) ko('D9', `effet hors de la liste fermée : ${[...new Set(hors.map((x) => x.effet))].join(', ')}`)
    if (tous.some((x) => TYPES_CARTE.includes(x.effet) && (x.part_seul === true || x.publication !== 'apres_clic_artisan'))) ko('D9', 'une carte ne doit ni partir seule ni se publier seule')
    if (C0.effets_faits.length) ko('D9', 'un effet FAIT en simulation')
    if (!C0.resultat || C0.resultat.parti_seul !== 0) ko('D9', 'le résultat doit déclarer zéro envoi parti seul')
    const interdit = JSON.stringify(C0).match(/envoyer_|publier_|payer_|rembourser|emettre_facture/)
    if (interdit) ko('D9', `un geste interdit apparaît dans la sortie : ${interdit[0]}`)
  }
  {
    // D10 — idempotence : une seconde passe avec les clés déjà posées ne refait rien
    const cles = [...(lot?.destinataires ?? []).map((d) => d.cle), ...effets(C0, 'preparer_carte').filter((x) => x.type === 'rappel_entretien').map((x) => x.cle)]
    const vus = effets(C0, 'noter_evenement').filter((x) => x.type === 'avis_recu').map((x) => ({ artisan_id: F.ORG, cle: x.cle }))
    const cartees = effets(C0, 'noter_evenement').filter((x) => x.type === 'carte_reponse_avis').map((x) => ({ artisan_id: F.ORG, cle: x.cle }))
    const s2 = chef({ donnees: { cles_existantes: cles, avis_deja_vus: vus, cartes_avis_existantes: cartees } })
    if (effets(s2, 'preparer_carte_lot').length || effets(s2, 'preparer_carte').length) ko('D10', `une seconde passe refait ${effets(s2, 'preparer_carte_lot').length + effets(s2, 'preparer_carte').length} carte(s) : le chef n'est pas idempotent`)
    const tousExclus = chef({ donnees: { chantiers: F.CHANTIERS.filter((c) => ['12', '13', '14', '15', '19'].includes(c.id.slice(-2))) } })
    if (effets(tousExclus, 'preparer_carte_lot').length) ko('D10', 'aucun destinataire : aucune carte de lot ne doit être posée (une carte d\'exclus seuls reviendrait chaque jour)')
    const memes = JSON.stringify(chef().effets_prevus) === JSON.stringify(C0.effets_prevus)
    if (!memes) ko('D10', 'deux passes sur les mêmes données ne rendent pas les mêmes effets')
  }
  {
    // D12 — le chef de bout en bout (lecture, réponses, assemblage)
    const r = C0.resultat
    if (!r || r.avis.recus !== 7 || r.avis.negatifs !== 3 || r.avis.suspects !== 3 || r.avis.cartes !== 7) ko('D12', `avis : ${JSON.stringify(r?.avis)} (7 reçus, 3 négatifs, 3 suspects, 7 cartes attendus)`)
    const cartesAvis = effets(C0, 'preparer_carte').filter((x) => x.type === 'reponse_avis')
    if (cartesAvis.length !== 7 || cartesAvis.filter((x) => x.brouillon !== null).length !== 2) ko('D12', `${cartesAvis.length} carte(s) de réponse, ${cartesAvis.filter((x) => x.brouillon !== null).length} brouillon(s) (7 et 2 attendus)`)
    if (cartesAvis.filter((x) => x.sentiment === 'negatif' && x.publication !== 'apres_clic_artisan').length) ko('D12', 'un avis négatif n\'attend pas le clic de l\'artisan')
    if (!r || r.cartes !== effets(C0).filter((x) => TYPES_CARTE.includes(x.effet)).length) ko('D12', 'le nombre de cartes du résultat ne correspond pas aux effets')
    const sans = chef({ donnees: { avis: [], brouillons_avis: [], conformites_avis: [] } })
    if (sans.statut !== 'ok' || sans.resultat?.avis?.recus !== 0 || effets(sans, 'preparer_carte').some((x) => x.type === 'reponse_avis')) ko('D12', 'sans avis : la demande d\'avis et l\'entretien restent préparés, sans carte de réponse')
  }

  // P — le banc et le chef rejoués
  const bn = executer(ex[BANC], [{}], { W: ex })
  if (bn.erreur) ko('P3', `rejeu du banc : ${bn.erreur}`)
  else {
    const noms = [`Appeler lib-avis-lire (1)`, `Appeler lib-avis-repondre (2)`, `Appeler lib-avis-repondre (3)`, `Appeler ${CHEF} (4)`, `Appeler ${CHEF} (5)`]
    const statuts = noms.map((n) => bn.par[n]?.[0]?.[0]?.[0]?.statut)
    if (JSON.stringify(statuts) !== JSON.stringify(['ok', 'ok', 'ok', 'ok', 'rien_a_faire'])) ko('P3', `statuts du banc : ${statuts}`)
    if (bn.sorties.some((s) => s.defauts)) ko('P3', 'le banc compte un défaut (effet fait en simulation, appel en erreur)')
    for (const x of X.essais.filter((t) => t.workflow === BANC)) {
      for (const n of noms.slice(0, 3)) if (JSON.stringify(x.sorties[n]?.[0] ?? null) !== JSON.stringify(bn.par[n]?.[0]?.[0] ?? null)) ko('N1', `essai n8n #${x.execution} : « ${n} » rendu par n8n ≠ rejeu hors ligne`)
    }
    for (const x of X.essais.filter((t) => t.workflow === BANC)) for (const n of noms.slice(3)) {
      const epingle = x.entrees_epinglees?.[n]
      if (JSON.stringify(epingle ?? null) !== JSON.stringify(bn.par[n]?.[0]?.[0] ?? null)) ko('P1', `essai du banc : la sortie épinglée de « ${n} » n'est pas celle du rejeu de l'export du chef`)
    }
    if (!X.essais.some((t) => t.workflow === BANC)) ko('N1', 'essais-n8n.json : l\'essai du banc manque')
  }
  {
    const essaiChef = X.essais.find((t) => t.workflow === CHEF)
    if (!essaiChef) ko('N1', 'essais-n8n.json : l\'essai du chef manque')
    else {
      const entree = essaiChef.entrees_epinglees?.['Appelé par le Cerveau']?.[0]
      const r = entree ? executer(ex[CHEF], [entree], { W: ex }) : { erreur: 'entrée de l\'essai absente' }
      if (r.erreur) ko('N1', `rejeu du chef sur l'entrée de l'essai : ${r.erreur}`)
      else {
        const p = (n) => JSON.stringify(r.par[n]?.[0]?.[0] ?? null)
        for (const n of ["Demandes d'avis et rappels d'entretien", 'Préparer la lecture des avis', 'Appeler lib-avis-lire', 'Des avis à répondre ?', 'Préparer les réponses aux avis', 'Appeler lib-avis-repondre', 'Assembler le département', 'Contrat de sortie'])
          if (JSON.stringify(essaiChef.sorties[n]?.[0] ?? null) !== p(n)) ko('N1', `essai n8n #${essaiChef.execution} : « ${n} » rendu par n8n ≠ rejeu hors ligne`)
      }
    }
  }
  return e
}
const options = { rapport: null }

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
const M = F.MARQUES
const LIRE = 'lib-avis-lire', REPO = 'lib-avis-repondre'
const MUTANTS = [
  ['un avis négatif publié (la publication devient automatique)', muter(REPO, LOGIQUE[REPO], M.publication, "publication: 'automatique'"), /^R1 /],
  ['un avis négatif publié (un effet de publication Google ajouté)', muter(REPO, LOGIQUE[REPO], "{ effet: 'noter_evenement', organisation_id: org, type: 'carte_reponse_avis'", "{ effet: 'publier_reponse_google', organisation_id: org, type: 'carte_reponse_avis'"), /^R1 /],
  ['un avis négatif traité comme un positif (seuil de note abaissé)', muter(LIRE, LOGIQUE[LIRE], "const negatif = a.note <= 3 || litige !== null;", 'const negatif = a.note <= 1;'), /^L1 /],
  ['les mots de litige ignorés (un 5 étoiles avec menace de plainte reste positif)', muter(LIRE, LOGIQUE[LIRE], "const negatif = a.note <= 3 || litige !== null;", 'const negatif = a.note <= 3;'), /^L1 /],
  ['une demande d\'avis sans consentement (aucun canal : accepté par e-mail)', muter(CHEF_N(), NOM_A, M.consentement, "return { canal: 'email' };"), /^D2 /],
  ['un STOP ignoré', muter(CHEF_N(), NOM_A, M.stop, ''), /^D2 /],
  ['une opposition ignorée', muter(CHEF_N(), NOM_A, M.opposition, ''), /^D2 /],
  ['un litige en cours ignoré', muter(CHEF_N(), NOM_A, M.litige, ''), /^D2 /],
  ['une opposition illisible acceptée (la lecture en erreur ne vaut plus refus)', muter(CHEF_N(), NOM_A, M.illisible, ''), /^D2 /],
  ['un faux avis non signalé (client inconnu ignoré)', muter(LIRE, LOGIQUE[LIRE], M.client_inconnu, ''), /^L5 /],
  ['un faux avis non signalé (la suspicion n\'est plus retenue)', muter(LIRE, LOGIQUE[LIRE], M.suspicion, 'const suspect = false;'), /^L1 /],
  ['« Presti » dans la réponse (le contrôle de la marque ôté)', muter(REPO, LOGIQUE[REPO], M.marque, ''), /^R3 /],
  ['le nom du client cité dans la réponse', muter(REPO, LOGIQUE[REPO], "if (avis.auteur && sansAccents(avis.auteur).trim().length >= 3 && sansAccents(t).includes(sansAccents(avis.auteur).trim())) return 'nom_du_client';", ''), /^R3 /],
  ['une promesse de remboursement acceptée', muter(REPO, LOGIQUE[REPO], "if (PROMESSE.test(sansAccents(t))) return 'promesse';", ''), /^R3 /],
  ['la porte de conformité ignorée', muter(REPO, LOGIQUE[REPO], "else if (d.conformite.verdict !== 'accepte') motifBrouillon = 'conformite';", ''), /^R3 /],
  ['un avis d\'un autre compte lu (l\'isolation du lecteur ôtée)', muter(LIRE, LOGIQUE[LIRE], M.isolation_lire, 'if (false) {'), /^L4 /],
  ['un avis d\'un autre compte répondu (l\'isolation du rédacteur ôtée)', muter(REPO, LOGIQUE[REPO], M.isolation_repondre, 'if (false) {'), /^R4 /],
  ['un chantier d\'un autre compte traité (l\'isolation du chef ôtée)', muter(CHEF_N(), NOM_A, M.isolation_chef, 'if (false) {'), /^D8 /],
  ['un avis traité deux fois (la clé de déjà-vu ôtée)', muter(LIRE, LOGIQUE[LIRE], M.deja_vu, ''), /^L2 /],
  ['le plafond de 10 par jour oublié', muter(CHEF_N(), NOM_A, M.plafond_jour, 'const reste = 999;'), /^D4 /],
  ['le CRM non exigé (Studio reçoit la demande d\'avis)', muter(CHEF_N(), NOM_A, M.capacite_crm, 'const crm = true;'), /^D6 /],
  ['un rappel d\'entretien qui part seul', muter(CHEF_N(), NOM_A, "texte: t.texte, part_seul: false, publication: 'apres_clic_artisan', pied: 'PIED_APRES' });\n      journal.push(ligne('rappel_entretien'", "texte: t.texte, part_seul: true, publication: 'apres_clic_artisan', pied: 'PIED_APRES' });\n      journal.push(ligne('rappel_entretien'"), /^D[59] /],
  ['un effet d\'envoi dans le chef', muter(CHEF_N(), NOM_A, "effet: 'preparer_carte_lot'", "effet: 'envoyer_email'"), /^D[39] /],
  ['le SMS sans STOP', muter(CHEF_N(), NOM_A, "v.artisan + '. STOP pour ne plus recevoir'\n    : qui", "v.artisan + '.'\n    : qui"), /^D[23] /],
  ['l\'interrupteur du département ignoré', muter(CHEF_N(), NOM_A, "if (!(c.interrupteur_general === true && c.interrupteur_departement === true)) {", 'if (false) {'), /^D7 /],
  ['la garde finale du chef élargie à un effet d\'envoi, que le chef émet', (X) => muter(CHEF, 'Assembler le département', M.effets_permis, "const permis = ['preparer_carte_lot', 'preparer_carte', 'noter_evenement', 'envoyer_email'];")(muter(CHEF_N(), NOM_A, "effet: 'preparer_carte_lot'", "effet: 'envoyer_email'")(X)), /^D9 /],
  ['le travail repris sans tenir compte des rappels déjà posés', muter(CHEF_N(), NOM_A, "const existantes = new Set(d.cles_existantes || []);", 'const existantes = new Set();'), /^D(1|10) /],
  ['le workflow publié (actif)', surNoeud(CHEF, 'Assembler le département', (n, wf) => { wf.active = true }), /^S1 /],
  ['un identifiant ajouté', surNoeud(REPO, LOGIQUE[REPO], (n) => { n.credentials = { googleBusinessProfileOAuth2Api: { id: 'IdentifiantFictif', name: 'Google' } } }), /^S2 /],
  ['un nœud Google Business Profile ajouté (le « Reply Poster »)', surNoeud(REPO, 'Contrat de sortie', (n, wf) => { wf.nodes.push({ id: 'g', name: 'Répondre à l\'avis', type: 'n8n-nodes-base.googleBusinessProfile', typeVersion: 1, position: [0, 0], parameters: { resource: 'review', operation: 'reply' } }) }), /^S4 /],
  ['un nœud d\'envoi ajouté au chef', surNoeud(CHEF, 'Assembler le département', (n, wf) => { wf.nodes.push({ id: 'x', name: 'Envoyer', type: 'n8n-nodes-base.emailSend', typeVersion: 2.1, position: [0, 0], parameters: {}, disabled: true }) }), /^S4 /],
  ['un enfant appelable par n\'importe quel workflow', surNoeud(LIRE, 'Contrat de sortie', (n, wf) => { wf.settings.callerPolicy = 'any' }), /^S5 /],
  ['le gabarit « Contrat d\'entrée » affaibli', muter(REPO, "Contrat d'entrée", 'if (s.additionalProperties === false)', 'if (false)'), /^S7 /],
  ['le gabarit « Contrat de sortie » affaibli (un effet FAIT en simulation)', muter(CHEF, 'Contrat de sortie', "'effets_faits': simulation || rejete ? [] : liste(j.effets_faits),", "'effets_faits': [{ effet: 'envoyer' }],"), /^S7 /],
  ['la sortie « faux » de la porte détournée', surNoeud(LIRE, PORTE, (n, wf) => { wf.connections[PORTE].main[1] = [{ node: 'Contrat de sortie', type: 'main', index: 0 }] }), /^S9 /],
]
function CHEF_N() { return CHEF }

export { executer, charger }
if (!process.argv[1] || import.meta.url !== pathToFileURL(process.argv[1]).href) { /* importé pour son exécuteur (mise au point) : rien à lancer */ }
else {
// ─── Lancement ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const X = charger(DOSSIER)
const rapport = []
options.rapport = rapport
const base = jouer(X, { rapport })
console.log(`apres-reputation-n8n-qa : exports lus dans ${path.relative(RACINE, DOSSIER)} (${NOMS.filter((n) => X.ex[n]).length}/${NOMS.length}), ${X.essais.length} essai(s) n8n`)
console.log('Comparaison à lib/apresChantier.ts (propositions), cas par cas :')
console.log('| cas | lib/apresChantier.ts | presti-dep-apres | verdict |\n|---|---|---|---|')
for (const l of rapport) console.log(l)
console.log(base.length ? base.map((m) => `✗ ${m}`).join('\n') : '✓ S, C, L, R, K, D, P, N : structure, contrat, lecture des avis, cartes de réponse, code de référence, consentement, rejeux et essais n8n tenus')
let echecs = base.length ? 1 : 0, verts = 0
options.rapport = null
if (!base.length) {
  for (const [titre, f, attendu] of MUTANTS) {
    let m
    try { m = jouer(f(X), { egalite: false }) } catch (err) { m = []; console.log(`  ✗ mutant « ${titre} » inapplicable : ${err.message}`); verts++; continue }
    const bon = m.filter((x) => attendu.test(x))
    console.log(`  ${bon.length ? '✓' : '✗'} mutant « ${titre} » ${bon.length ? 'fait rougir le juge' : 'NE FAIT PAS rougir le juge pour sa raison'}\n      → ${(bon[0] ?? m[0] ?? 'aucun manquement').slice(0, 170)}`)
    if (!bon.length) verts++
  }
  const Y = muter(LIRE, LOGIQUE[LIRE], 'const DEUX_HEURES = 2 * 3600000;', 'const DEUX_HEURES = 2 * 3600000; ')(X)
  const eg = jouer(Y)
  console.log(`  ${eg.some((x) => /^S8 /.test(x)) ? '✓' : '✗'} mutant « un octet changé dans un nœud Code » (égalité à construire.mjs)\n      → ${(eg[0] ?? 'aucun manquement').slice(0, 170)}`)
  if (!eg.some((x) => /^S8 /.test(x))) verts++
}
console.log(`apres-reputation-n8n-qa : ${MUTANTS.length + 1} mutants`)
if (echecs || verts) { if (verts) console.log(`  ✗ ${verts} mutant(s) laissent le juge vert`); console.log('ÉCHEC'); process.exit(1) }
console.log('OK')
}
