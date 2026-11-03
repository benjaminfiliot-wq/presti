// JUGE HORS LIGNE de la chaîne « de la relance au rapport » (tâche 035-005, prompt 5). Aucun réseau, aucune base, aucun modèle, aucune
// donnée réelle. Il lit les exports (le JSON rendu par le MCP `get_workflow_details`) de lib-relancer, lib-normaliser-telephone,
// lib-rediger-message, lib-porte-conformite, lib-executer, lib-rapport-hebdo et du banc lib-banc-relance dans .orchestre/preuves/035-005/,
// et les essais réels de n8n (essais-n8n.json), puis :
//   S  — STRUCTURE : inactifs ; aucun identifiant ni nœud de lecture, d'écriture ou d'envoi (mode A) ; réglages (lib-erreur-commune,
//        Europe/Paris, délai, succès non sauvés, appelants = le banc seul) ; squelette du socle 035-003 ; gabarit « Contrat » à l'identique
//        (mêmes empreintes) ; SHA-256 écrit à la main égal à node:crypto ; étiquettes ; le nœud du modèle sans identifiant, sans outil,
//        parseur en JSON Schema saisi, autoFix coupé, revalidé en Code, ÉPINGLÉ dans chaque essai (question 5).
//   C  — le gabarit « Contrat » rejoué (node:vm, en suivant les connexions) : hors contrat, rien ; hors simulation, l'arrêt.
//   R  — lib-relancer : la COPIE FIGÉE du registre de 3 jours égale au code (lib/relancesRegistre.ts chargé pour de vrai : constantes ET
//        la même décision que relanceRecente() sur une batterie d'historiques) ; un passage manqué fait partir le palier une seule fois ;
//        une relance à moins de 3 jours est bloquée ; stop, litige, escalade ; une lecture en erreur vaut refus ; horaires de Paris.
//   T  — lib-normaliser-telephone : E.164 ou vide, jamais une exception, jamais le numéro au journal ; AU MOMENT D'ENVOYER SEULEMENT
//        (le contrat l'exige, et dans le banc il n'est atteint qu'après la porte et l'exécution, C4:144).
//   D  — lib-rediger-message : le prompt porte les garde-fous de lib/ai.ts ; la mention d'IA (copie figée = lib/mentionAssistant.ts)
//        quand rien n'est relu, et seulement alors ; une sortie de modèle hors schéma ne donne aucun brouillon ; STOP sur un SMS ; aucun
//        contact vers le modèle.
//   K  — lib-porte-conformite : copies figées = code (OUTILS_JAMAIS_AUTO, PLAFOND_AUTO_JOUR, mots d'escalade, mention, pieds d'e-mail) ;
//        la liste du code est INCLUSE dans celle du kit, avec les gestes de p5:226 (Amendement B1) ; aucun de ces gestes ne passe en
//        automatique ; mention, marque, STOP, consentement, prix, dates, créneaux, fournisseurs, escalade, lecture en erreur, plafond, horaires.
//   X  — lib-executer : interrupteurs relus avant l'effet, coupure qui tient tout le passage, idempotence, pas de niveau 3 en mode A,
//        effet prévu seulement (POST sur clé unique, organisation dans le corps), rien de fait.
//   H  — lib-rapport-hebdo : « Exemple. » partout, aucun chiffre de gain, un chiffre sans source fait refuser, une base déclarée n'est
//        jamais dite mesurée, des comptes justes.
//   B  — le banc rejoué hors ligne (les Execute Sub-workflow rejouent les exports enfants ; le modèle, ses sorties épinglées) : même bilan
//        que dans n8n, zéro défaut, la porte refuse le brouillon fautif.
//   N  — les essais réels de n8n (`test_workflow`, données épinglées), rejoués à l'identique.
// Puis il prouve qu'il sait rougir : chaque MUTANT doit le faire échouer pour sa raison.
//   node scripts/lib-relance-n8n-qa.mjs [dossier des exports]
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.resolve(RACINE, process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '.orchestre/preuves/035-005')
const REL = 'lib-relancer', TEL = 'lib-normaliser-telephone', RED = 'lib-rediger-message', POR = 'lib-porte-conformite', EXE = 'lib-executer', RAP = 'lib-rapport-hebdo'
const ENFANTS = [REL, TEL, RED, POR, EXE, RAP]
const BANC = 'lib-banc-relance'
const ID_ERREUR = 'yekMM9ewk03F9y2q' // lib-erreur-commune (035-003)
const COUCHES = { [REL]: 'decision', [TEL]: 'execution', [RED]: 'redaction', [POR]: 'conformite', [EXE]: 'execution', [RAP]: 'reporting', [BANC]: 'essai' }
const LOGIQUE = { [REL]: 'Décider la relance', [TEL]: 'Normaliser le numéro', [RED]: 'Préparer la demande au modèle', [POR]: 'Veto de conformité', [EXE]: 'Prévoir l’effet', [RAP]: 'Calculer le rapport' }
const T = { trigger: 'n8n-nodes-base.executeWorkflowTrigger', horloge: 'n8n-nodes-base.scheduleTrigger', code: 'n8n-nodes-base.code', si: 'n8n-nodes-base.if',
  arret: 'n8n-nodes-base.stopAndError', note: 'n8n-nodes-base.stickyNote', appel: 'n8n-nodes-base.executeWorkflow', agent: '@n8n/n8n-nodes-langchain.agent',
  modele: '@n8n/n8n-nodes-langchain.lmChatAnthropic', parseur: '@n8n/n8n-nodes-langchain.outputParserStructured' }
const ARRET = 'Hors simulation : non branché'
const AGENT = 'Rédiger (modèle épinglé)', REVALIDER = 'Revalider la sortie du modèle'
const REPERE_ENTREE = "// ─── Gabarit « Contrat d'entrée » 035-003 : au-dessus, CONTRAT et SCHEMA seulement ; en dessous, le corps commun (empreinte tenue par le juge) ───"
const REPERE_SORTIE = '// ─── Gabarit « Contrat de sortie » 035-003 : au-dessus, CONTRAT seulement ; en dessous, le corps commun (empreinte tenue par le juge) ───'
const EMPREINTE_ENTREE = '20f6ff371969130e45b37ea58466baaa9b4581f7dbe145863a2f4a1a57713899'
const EMPREINTE_SORTIE = '8f0f37c68d78f3154204655b3f5343889c5c74733c8b852f27e34bc517394a70'
const CLES_SORTIE = ['contrat', 'statut', 'cle_idempotence', 'simulation', 'resultat', 'effets_prevus', 'effets_faits', 'journal', 'erreurs']
const sha = (t) => createHash('sha256').update(String(t), 'utf8').digest('hex')
const copie = (o) => JSON.parse(JSON.stringify(o))
const FIN = '// ─── fin de la copie figée ───'

// ─── Ce que dit le VRAI code (chargé, pas recopié), et sa décision sur des batteries d'essais ─────────────────────────────────────
const MAINT = '2026-11-03T09:30:00.000Z'
const BATTERIE_REGISTRE = (() => {
  const h = (traces, ok = true) => (ok ? { ok: true, traces, ignorees: [] } : { ok: false, erreur: 'Exemple. lecture refusée' })
  const il = (j) => new Date(Date.parse(MAINT) - j * 86400000).toISOString()
  const cas = [h([]), h([], false), h([{ chemin: 'crm', le: il(1) }]), h([{ chemin: 'crm', le: il(2.99) }]), h([{ chemin: 'crm', le: il(3) }]), h([{ chemin: 'crm', le: il(3.01) }]),
    h([{ chemin: 'impayes', le: 'Exemple. pas une date' }]), h([{ chemin: 'assistant', le: il(10) }, { chemin: 'conversation', le: il(0.5) }]), h([{ chemin: 'impayes', le: il(1) }]),
    h([{ chemin: 'assistant', le: il(2) }, { chemin: 'crm', le: il(1) }])]
  return cas.flatMap((x) => [{ h: x, opts: {} }, { h: x, opts: { sauf: 'impayes' } }, { h: x, opts: { delaiJours: 1 } }])
})()
const NOMS_MENTION = [null, '', 'Exemple. Bâti-Démo', 'Exemple.\nRetour à la ligne', 'Exemple. ' + 'x'.repeat(90)]
const TEXTES_MENTION = ['{{salutation}}\n\nExemple. Corps du message.', '{{salutation}}\n\nExemple. Corps.   ']
function lireCode() {
  const u = (f) => JSON.stringify(pathToFileURL(path.join(RACINE, f)).href)
  const prog = `const r = await import(${u('lib/relancesRegistre.ts')}); const p = await import(${u('lib/pilote/regles.ts')});
const m = await import(${u('lib/mentionAssistant.ts')}); const i = await import(${u('lib/relancesImpayes.ts')}); const a = await import(${u('lib/apresChantier.ts')});
const B = ${JSON.stringify(BATTERIE_REGISTRE)}, N = ${JSON.stringify(NOMS_MENTION)}, X = ${JSON.stringify(TEXTES_MENTION)};
process.stdout.write(JSON.stringify({ RELANCE_DELAI_JOURS: r.RELANCE_DELAI_JOURS, OUTILS_JAMAIS_AUTO: p.OUTILS_JAMAIS_AUTO, PLAFOND_AUTO_JOUR: p.PLAFOND_AUTO_JOUR,
  MOTS_ESCALADE_TOUJOURS: p.MOTS_ESCALADE_TOUJOURS, MOTS_ESCALADE_ENTIERS: p.MOTS_ESCALADE_ENTIERS, MENTION: m.mentionAssistant('').replace(/\\.$/, ''),
  PIED_AUTOMATIQUE: i.PIED_AUTOMATIQUE, PIED_APRES: a.PIED_APRES,
  REGISTRE: B.map((c) => r.relanceRecente(c.h, new Date(${JSON.stringify(MAINT)}), c.opts)),
  MENTIONS: N.flatMap((n) => X.map((t) => [m.mentionAssistant(n), m.avecMentionAssistant(t, n), m.avecMentionAssistant(m.avecMentionAssistant(t, n), n)])) }));`
  const code = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', './scripts/ts-loader.mjs', '--input-type=module', '-e', prog], { cwd: RACINE, encoding: 'utf8' }))
  const reg = readFileSync(path.join(RACINE, 'lib/relancesRegistre.ts'), 'utf8')
  code.CHEMINS = [...((/export type CheminRelance = ([^\n]+)/.exec(reg) || [])[1] ?? '').matchAll(/'([a-z]+)'/g)].map((x) => x[1])
  code.MODELE_STANDARD = (/standard: '([^']+)'/.exec(readFileSync(path.join(RACINE, 'lib/models.ts'), 'utf8')) || [])[1] ?? null
  return code
}
// Les gestes de p5:226 que le juge exige lui-même (Amendement B1, premiere-reponse.md:1016-1020), écrits ici sans les lire dans l'export.
const B1_EXIGES = ['envoyer_devis', 'envoi_devis', 'encaisser', 'declarer_urssaf', 'declarer_impots', 'supprimer_donnees', 'passer_appel', 'prendre_appel']
const B1_MOTIFS = { envoyer_devis: 'devis_engageant', envoi_devis: 'devis_engageant', declarer_urssaf: 'declaration_fiscale_ou_sociale', declarer_impots: 'declaration_fiscale_ou_sociale', supprimer_donnees: 'suppression_de_donnees', passer_appel: 'appel_telephonique', prendre_appel: 'appel_telephonique' }

// ─── L'exécuteur hors ligne : les nœuds Code de l'export, tels quels, dans node:vm ───────────────────────────────────────────────
// Il connaît les déclencheurs, Code (avec $input et $('Nœud')), If, Stop and Error, l'AI Agent (sa sortie = la donnée ÉPINGLÉE, jamais
// un modèle), et pour le banc Execute Sub-workflow, qui rejoue l'export enfant désigné. Tout autre nœud atteint arrête le rejeu en erreur.
function lancerCode(js, items, par) {
  const entree = copie(items)
  const ctx = { $input: { all: () => entree, first: () => entree[0], last: () => entree[entree.length - 1] }, console: { log() {} },
    $: (nom) => ({ all: () => copie((par[nom] ?? []).map((json) => ({ json }))) }) }
  const sortie = vm.runInNewContext(`(function () {\n${js}\n})()`, ctx, { timeout: 5000 })
  if (!Array.isArray(sortie) || !sortie.every((x) => x && typeof x === 'object' && x.json && typeof x.json === 'object')) throw new Error('un nœud Code doit rendre [{ json }]')
  return JSON.parse(JSON.stringify(sortie))
}
function evaluerSi(n, items) {
  const c = n.parameters?.conditions ?? {}, cond = c.conditions?.[0] ?? {}
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
// pins : la sortie épinglée du modèle, en tableau (dans l'ordre, comme n8n) ou en table action_cle → sortie.
function executer(wf, entrees, W = {}, opts = {}, profondeur = 0) {
  const parNom = new Map(wf.nodes.map((n) => [n.name, n]))
  const racines = wf.nodes.filter((n) => n.type === T.trigger || n.type === T.horloge)
  const visites = [], sorties = [], par = {}
  if (racines.length !== 1) return { sorties, visites, par, erreur: `${racines.length} déclencheur(s)` }
  const file = [[racines[0].name, entrees.map((j) => ({ json: copie(j) }))]]
  for (let pas = 0; file.length; pas++) {
    if (pas > 600) return { sorties, visites, par, erreur: 'boucle' }
    const [nom, items] = file.shift()
    const n = parNom.get(nom)
    if (!n) return { sorties, visites, par, erreur: `nœud absent : ${nom}` }
    visites.push(nom)
    let outs
    try {
      if (n.type === T.trigger || n.type === T.horloge) outs = [items]
      else if (n.type === T.code) outs = [lancerCode(n.parameters?.jsCode ?? '', items, par)]
      else if (n.type === T.si) outs = evaluerSi(n, items)
      else if (n.type === T.arret) return { sorties, visites, par, erreur: String(n.parameters?.errorMessage ?? 'Stop and Error') }
      else if (n.type === T.agent) {
        const p = opts.pins
        if (Array.isArray(p)) outs = [p.map((o) => ({ json: { output: copie(o) } }))]
        else if (p && typeof p === 'object') outs = [items.map((it) => { if (!(it.json.action_cle in p)) throw new Error(`sortie épinglée du modèle absente pour ${it.json.action_cle}`); return { json: { output: copie(p[it.json.action_cle]) } } })]
        else throw new Error('modèle non épinglé : aucun appel au modèle hors ligne (question 5)')
      } else if (n.type === T.appel && profondeur === 0) {
        const id = n.parameters?.workflowId?.value
        const enfant = Object.values(W).find((w) => w && w.id === id)
        if (!enfant || n.parameters?.source !== 'database') throw new Error(`sous-workflow ${id} introuvable ou hors source database`)
        if (enfant.settings?.callerPolicy !== 'workflowsFromAList' || !String(enfant.settings?.callerIds ?? '').split(',').includes(wf.id)) throw new Error(`${enfant.name} n'autorise pas ${wf.name} à l'appeler`)
        const r = executer(enfant, items.map((i) => i.json), W, { pins: opts.pinsParCle }, 1)
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
const copieFigee = (js, repere) => { const i = js.indexOf(repere); if (i < 0) return null; const j = js.indexOf(FIN, i); return j < 0 ? null : js.slice(i, j) }

// ─── Les cas fictifs (« Exemple. », organisations 00000000-0000-4000-8000-…, aucune adresse réelle) ─────────────────────────────
const ORG1 = '00000000-0000-4000-8000-000000000001', ORG2 = '00000000-0000-4000-8000-000000000002'
const ID = (i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const env = (nom, donnees, config, plus = {}) => ({ contrat: `${nom}@1`, organisation_id: ORG1, simulation: true, cle_idempotence: `exemple:${nom.slice(4)}:juge`,
  trace: { execution_parent: 'Exemple. juge', declencheur: 'juge', tentative: 0 }, config, donnees, ...plus })
const REGLES_R = { paliers_jours: [1, 3, 7], jours_permis: [1, 2, 3, 4, 5], heures_permises: { debut: '08:00', fin: '19:00' } }
const MARDI = '2026-11-03T09:30:00.000+01:00'
const rel = (i, plus = {}, conf = copie(REGLES_R)) => env(REL, { objet_type: 'facture', objet_id: ID(i), depuis_le: '2026-10-24T00:00:00.000+02:00', historique: { ok: true, traces: [], ignorees: [] },
  paliers_envoyes: [], stop: false, escalade: false, maintenant: MARDI, ...plus }, conf)
const FAITS = { type_relance: 'relance_facture', palier: 2, numero: 'FAC-2026-009', objet: 'Exemple. Isolation des combles', montant_ttc_centimes: 45580, echeance_le: '2026-10-30', emis_le: '2026-09-30', regime_tva: 'tva' }
const CFG_RED = (plus = {}) => ({ canal: 'email', ton: 'Exemple. cordial', signature: 'Exemple. L’équipe Bâti-Démo', nom_artisan: 'Exemple. Bâti-Démo', mention_ia: false, ...plus })
const TEXTE_BON = "{{salutation}}\n\nNous nous permettons de revenir vers vous au sujet de la facture FAC-2026-009 (Exemple. Isolation des combles), d'un montant de 455,80 € TTC, arrivée à échéance le 30 octobre 2026. S'il y a une difficulté, il vous suffit de nous répondre.\n\nBien cordialement,\nExemple. L’équipe Bâti-Démo"
const SORTIE_BONNE = { objet: 'Exemple. Rappel : facture FAC-2026-009', texte: TEXTE_BON, faits_cites: ['numero', 'objet', 'montant', 'echeance'], champs_inconnus: [] }
const red = (cle, cfg = CFG_RED(), faits = FAITS) => env(RED, { action_cle: cle, faits }, cfg)
const CFG_POR = (code, plus = {}) => ({ jamais_auto: [], regles_metier: { fournisseurs: ['Exemple-Fournisseur'], mots_escalade_artisan: ['Exemple. mot sensible'], jours_permis: [1, 2, 3, 4, 5], heures_permises: { debut: '08:00', fin: '19:00' } }, plafond_jour: code.PLAFOND_AUTO_JOUR, ...plus })
const AVEC_MENTION = (code, t = TEXTE_BON) => t + '\n\n—\n' + code.MENTION + ' de Exemple. Bâti-Démo.'
const por = (code, { outil = 'relancer_facture', cible = 'carte', texte = TEXTE_BON, canal = 'email', objet = 'Exemple. Rappel', dest = {}, faits = FAITS, conf = {}, maintenant = MARDI, envoyes = 0, prix = true, message } = {}) =>
  env(POR, { action: { type_action: outil, outil, prix_sources: prix, cible, sans_relecture: cible === 'pilote' }, message: message === undefined ? { canal, objet: canal === 'sms' ? null : objet, texte } : message,
    destinataire: { opposition: false, consentement_sms: true, escalade: false, ...dest }, faits, maintenant, compteurs: { envoyes_aujourdhui: envoyes } }, CFG_POR(code, conf))
const exe = (cle, plus = {}, conf = { niveau_max: 2 }) => env(EXE, { verdict: 'passe', cible: 'carte', cle_idempotence: cle, charge: { type_action: 'relance_facture', objet_type: 'facture', objet_id: ID(509), palier: 2, canal: 'email', brouillon: { objet: 'Exemple. Rappel', texte: '{{salutation}}\n\nExemple. Brouillon.' } },
  interrupteurs: { general: true, agent: true }, cles_existantes: [], ...plus }, conf)
const ACT = (type_action, etat, le) => ({ type_action, etat, le })
const ACTIONS = [ACT('relance_facture', 'fait_seul', '2026-10-27T09:00:00.000+01:00'), ACT('relance_devis', 'en_attente', '2026-10-28T09:00:00.000+01:00'), ACT('relance_devis', 'en_attente', '2026-10-29T09:00:00.000+01:00'),
  ACT('reponse_prospect', 'echec', '2026-10-30T09:00:00.000+01:00'), ACT('relance_facture', 'refuse_porte', '2026-10-31T09:00:00.000+01:00'), ACT('relance_facture', 'fait_seul', '2026-11-05T09:00:00.000+01:00')]
const KPIS = ['actions_preparees', 'relances_preparees', 'fait_seul', 'en_attente', 'echecs', 'refus_porte']
const rap = (conf = {}, donnees = {}) => env(RAP, { du: '2026-10-26', au: '2026-11-01', actions: ACTIONS, ...donnees }, { periode: 'semaine', kpis: KPIS, bases_de_depart: { en_attente: { valeur: 3, source: 'Exemple. dit par le gérant', date: '2026-10-01', confiance: 'declare' } }, ...conf })
const NOMINAL = {
  [REL]: () => rel(1), [TEL]: () => env(TEL, { moment: 'envoi', telephone: '06 39 98 00 07' }, {}), [RED]: () => red('exemple:juge:nominal'),
  [POR]: (code) => por(code), [EXE]: () => exe('exemple:juge:nominal'), [RAP]: () => rap(),
}
const PIN_NOMINAL = { 'exemple:juge:nominal': SORTIE_BONNE }
const HORS_CONTRAT = [
  ['trace absente', (e) => { delete e.trace }],
  ['champ en trop dans l’enveloppe', (e) => { e.pirate = 1 }],
  ['organisation_id hors forme', (e) => { e.organisation_id = 'Exemple. pas un uuid' }],
  ['simulation en texte', (e) => { e.simulation = 'true' }],
  ['contrat d’un autre gabarit', (e) => { e.contrat = 'lib-decider@1' }],
  ['champ hors contrat dans donnees', (e) => { e.donnees.inconnu = 1 }],
  ['champ hors contrat dans config', (e) => { e.config.pirate = 'Exemple.' }],
]

// ─── Les épreuves ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function juger(W, essais, code) {
  const e = []
  const ko = (id, cond, m) => { if (!cond) e.push(`${id} ${m}`) }
  for (const n of [...ENFANTS, BANC]) ko('S1', !!W[n], `${n} : export absent`)
  if (e.length) return e
  const banc = W[BANC]
  const ids = Object.fromEntries(ENFANTS.map((n) => [n, W[n].id]))
  // S1 à S5, S7, S8 : structure, réglages, squelette, gabarit, étiquettes, le modèle
  for (const n of [...ENFANTS, BANC]) {
    const w = W[n], s = w.settings ?? {}
    ko('S1', w.active === false && !w.activeVersionId, `${n} : doit rester inactif, sans version publiée`)
    const permis = n === BANC ? [T.horloge, T.code, T.appel, T.note] : n === RED ? [T.trigger, T.code, T.si, T.arret, T.note, T.agent, T.modele, T.parseur] : [T.trigger, T.code, T.si, T.arret, T.note]
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
    if (n === BANC) {
      ko('S3', s.callerPolicy === 'none', `${n} : le banc n'est appelable par personne (none attendu, ${s.callerPolicy})`)
      const appels = w.nodes.filter((x) => x.type === T.appel)
      for (const a of appels) ko('S3', a.parameters?.source === 'database' && a.parameters?.workflowId?.mode === 'id' && Object.values(ids).includes(a.parameters?.workflowId?.value), `${n} : ${a.name} doit appeler un des six gabarits par identifiant fixe, source database`)
      for (const [nom, id] of Object.entries(ids)) ko('S3', appels.some((a) => a.parameters?.workflowId?.value === id), `${n} : ${nom} jamais appelé par le banc`)
      continue
    }
    ko('S3', s.callerPolicy === 'workflowsFromAList' && String(s.callerIds ?? '') === banc.id, `${n} : politique d'appel ${s.callerPolicy} (${s.callerIds ?? '—'}) : le banc seul (${banc.id}) attendu`)
    const L = LOGIQUE[n]
    const attendu = new Set(["Appelé par un parent[main:0]→Contrat d'entrée", "Contrat d'entrée[main:0]→Entrée conforme ?", 'Entrée conforme ?[main:0]→Porte simulation',
      'Entrée conforme ?[main:1]→Contrat de sortie', `Porte simulation[main:0]→${L}`, `Porte simulation[main:1]→${ARRET}`])
    if (n === RED) for (const x of [`${L}[main:0]→${AGENT}`, `${AGENT}[main:0]→${REVALIDER}`, `${REVALIDER}[main:0]→Contrat de sortie`, `Claude Haiku 5.5 (sans identifiant)[ai_languageModel:0]→${AGENT}`, `Sortie structurée (JSON Schema)[ai_outputParser:0]→${AGENT}`]) attendu.add(x)
    else attendu.add(`${L}[main:0]→Contrat de sortie`)
    const vu = new Set()
    for (const [src, c] of Object.entries(w.connections ?? {})) for (const [genre, liste] of Object.entries(c)) (liste ?? []).forEach((l, i) => (l ?? []).forEach((x) => vu.add(`${src}[${genre}:${i}]→${x.node}`)))
    const trop = [...vu].filter((x) => !attendu.has(x)), manque = [...attendu].filter((x) => !vu.has(x))
    ko('S4', !trop.length && !manque.length, `${n} : squelette différent : ${trop.map((x) => x + ' en trop').concat(manque.map((x) => x + ' manquant')).join(', ').slice(0, 240)}`)
    const porte = w.nodes.find((x) => x.name === 'Porte simulation')
    ko('S4', porte && /porte: simulation/.test(porte.notes ?? ''), `${n} : porte « simulation » non déclarée`)
    const ce = codeDe(w, "Contrat d'entrée"), cs = codeDe(w, 'Contrat de sortie')
    const [teteE, corpsE] = ce.split(REPERE_ENTREE), [teteS, corpsS] = cs.split(REPERE_SORTIE)
    ko('S5', corpsE !== undefined && sha(corpsE) === EMPREINTE_ENTREE, `${n} : corps du « Contrat d'entrée » différent du gabarit 035-003 (empreinte ${corpsE === undefined ? 'sans repère' : sha(corpsE).slice(0, 12)}…)`)
    ko('S5', corpsS !== undefined && sha(corpsS) === EMPREINTE_SORTIE, `${n} : corps du « Contrat de sortie » différent du gabarit 035-003`)
    const sansContact = n === TEL ? '"sans_contact":false' : '"sans_contact":true'
    ko('S5', teteE?.includes(`const CONTRAT = '${n}@1';`) && (teteE ?? '').includes(sansContact) && teteS?.includes(`const CONTRAT = '${n}@1';`), `${n} : tête du contrat (CONTRAT ${n}@1, ${sansContact}) attendue`)
  }
  // S6 : le SHA-256 écrit à la main
  for (const [n, noeud] of [[REL, LOGIQUE[REL]], [RED, REVALIDER]]) {
    const f = /function sha256\(texte\) \{[\s\S]*?\n\}\n/.exec(codeDe(W[n], noeud))
    let ok = false
    try { const h = vm.runInNewContext(`${f[0]}; [sha256('abc'), sha256('Exemple. clé d’essai é€𝄞'), sha256('x'.repeat(200))]`); ok = h[0] === sha('abc') && h[1] === sha('Exemple. clé d’essai é€𝄞') && h[2] === sha('x'.repeat(200)) } catch { ok = false }
    ko('S6', ok, `${n} : le SHA-256 du nœud Code ne donne pas celui de node:crypto`)
  }
  // S8 : le nœud du modèle, épinglé (question 5)
  {
    const w = W[RED], ag = w.nodes.find((x) => x.type === T.agent), md = w.nodes.find((x) => x.type === T.modele), ps = w.nodes.find((x) => x.type === T.parseur)
    const o = ag?.parameters?.options ?? {}
    ko('S8', ag && Number(ag.typeVersion) >= 3 && o.passthroughBinaryImages === false && Number.isInteger(o.maxIterations) && o.maxIterations >= 1 && o.maxIterations <= 10 && ag.parameters?.hasOutputParser === true,
      `${RED} : AI Agent 3.x, passthroughBinaryImages faux, maxIterations borné et parseur attendus`)
    ko('S8', ps && ps.parameters?.schemaType === 'manual' && ps.parameters?.autoFix === false, `${RED} : parseur en JSON Schema saisi, autoFix coupé`)
    let sch = null; try { sch = JSON.parse(ps?.parameters?.inputSchema ?? 'null') } catch { sch = null }
    ko('S8', sch && sch.additionalProperties === false && ['objet', 'texte', 'faits_cites', 'champs_inconnus'].every((k) => (sch.required ?? []).includes(k)), `${RED} : schéma du parseur fermé sur objet, texte, faits_cites, champs_inconnus`)
    ko('S8', md && !md.credentials && md.parameters?.model?.value === code.MODELE_STANDARD, `${RED} : modèle du palier Standard (${code.MODELE_STANDARD}, lib/models.ts), sans identifiant`)
    ko('S8', /modele: epingle/.test(ag?.notes ?? '') && !Object.values(w.connections ?? {}).some((c) => c.ai_tool), `${RED} : le modèle n'a aucun outil et se déclare épinglé`)
    const essR = (essais ?? []).filter((x) => x.workflow === RED && x.statut_n8n === 'success')
    ko('S8', essR.length >= 1 && essR.every((x) => Array.isArray(x.epingle_modele) && x.epingle_modele.length > 0), `${RED} : chaque essai doit porter la sortie ÉPINGLÉE du modèle (aucun appel réel)`)
    const essB = (essais ?? []).find((x) => x.workflow === BANC)
    ko('S8', essB && Array.isArray(essB.epingle_redaction) && essB.epingle_redaction.length > 0, `${BANC} : l'essai du banc doit épingler l'appel de ${RED} (les sous-workflows ne sont pas couverts par les données épinglées)`)
  }
  if (e.length) return e

  const run = (n, entrees, pins) => executer(W[n], entrees, W, { pins })
  const un = (n, x, pins) => { const r = run(n, [x], pins); return { ...r, s: r.sorties[0] } }
  const res = (n, xs, pins) => run(n, xs, pins).sorties
  // C : le gabarit « Contrat » rejoué
  for (const n of ENFANTS) {
    const pins = n === RED ? PIN_NOMINAL : undefined
    const r = un(n, NOMINAL[n](code), pins)
    ko('C1', !r.erreur && r.s?.statut === 'ok' && CLES_SORTIE.every((k) => k in r.s) && Object.keys(r.s).length === 9 && r.s.effets_faits.length === 0 && r.s.simulation === true,
      `${n} : l'entrée nominale ne rend pas une sortie conforme (${r.erreur ?? r.s?.statut} ${JSON.stringify(r.s?.erreurs ?? [])})`)
    for (const [titre, f] of HORS_CONTRAT) {
      const x = NOMINAL[n](code); f(x)
      const h = un(n, x, pins)
      ko('C2', !h.erreur && h.s?.statut === 'rejete' && !h.visites.includes(LOGIQUE[n]) && h.s.effets_prevus.length === 0, `${n} : entrée hors contrat (${titre}) : statut ${h.s?.statut ?? h.erreur}`)
    }
    const hs = un(n, { ...NOMINAL[n](code), simulation: false }, pins)
    ko('C3', hs.erreur && hs.erreur.startsWith('Hors simulation') && !hs.visites.includes(LOGIQUE[n]), `${n} : hors simulation, la chaîne doit s'arrêter avant tout effet (${hs.erreur ?? 'aucun arrêt'})`)
  }

  // R : lib-relancer et la copie figée du registre
  {
    const js = codeDe(W[REL], LOGIQUE[REL])
    const bloc = copieFigee(js, '// ─── Copie figée du registre des relances')
    let C = null, f = null
    try { C = JSON.parse(/const COPIE_REGISTRE = (\{.*\});\n/.exec(bloc)[1]); f = vm.runInNewContext(`(function(){ const COPIE_REGISTRE = ${JSON.stringify(C)};\n${bloc.slice(bloc.indexOf('function relanceRecente'))}\nreturn relanceRecente; })()`) } catch { C = null }
    ko('R1', !!C && !!f, `${REL} : copie figée du registre introuvable`)
    if (C && f) {
      ko('R1', C.RELANCE_DELAI_JOURS === code.RELANCE_DELAI_JOURS, `${REL} : copie figée « RELANCE_DELAI_JOURS » différente du code (${C.RELANCE_DELAI_JOURS} ≠ ${code.RELANCE_DELAI_JOURS})`)
      ko('R1', JSON.stringify(C.CHEMINS) === JSON.stringify(code.CHEMINS), `${REL} : copie figée « CHEMINS » différente du code (${C.CHEMINS} ≠ ${code.CHEMINS})`)
      const diff = BATTERIE_REGISTRE.map((c, i) => [i, JSON.stringify(f(copie(c.h), new Date(MAINT), c.opts)), JSON.stringify(code.REGISTRE[i])]).filter(([, a, b]) => a !== b)
      ko('R1', !diff.length, `${REL} : la copie de relanceRecente() ne décide pas comme le code sur ${diff.length} historique(s) (cas ${diff.map((x) => x[0]).join(', ')})`)
    }
    const m = (xs) => res(REL, xs).map((s) => s?.resultat ?? { motif: s?.statut })
    // R2 : passage manqué → le palier atteint le plus haut, une seule fois ; jamais un palier dépassé
    const r2 = m([rel(10, { depuis_le: '2026-10-20T00:00:00.000+02:00' }), rel(10, { depuis_le: '2026-10-20T00:00:00.000+02:00' }), rel(11, { depuis_le: '2026-10-20T00:00:00.000+02:00', paliers_envoyes: [3] }), rel(12, { depuis_le: '2026-10-20T00:00:00.000+02:00', paliers_envoyes: [1] }), rel(13, { depuis_le: '2026-10-30T00:00:00.000+01:00', paliers_envoyes: [3] })])
    ko('R2', r2[0].a_relancer === true && r2[0].palier === 3 && r2[1].a_relancer === false && r2[1].motif === 'palier_deja_envoye' && r2[2].motif === 'palier_deja_envoye' && r2[3].a_relancer === true && r2[3].palier === 3 && r2[4].palier === 2 && r2[4].motif === 'palier_deja_envoye',
      `${REL} : un passage manqué fait partir le palier une seule fois (${r2.map((x) => x.motif + ':' + x.palier).join(', ')})`)
    // R3 : registre de 3 jours, tous chemins ; date illisible = récente
    const il = (j) => new Date(Date.parse(MARDI) - j * 86400000).toISOString()
    const r3 = m([rel(20, { historique: { ok: true, traces: [{ chemin: 'crm', le: il(2.9) }] } }), rel(21, { historique: { ok: true, traces: [{ chemin: 'conversation', le: il(1) }] } }),
      rel(22, { historique: { ok: true, traces: [{ chemin: 'impayes', le: il(3.1) }] } }), rel(23, { historique: { ok: true, traces: [{ chemin: 'assistant', le: 'Exemple. illisible' }] } })])
    ko('R3', r3[0].motif === 'relance_recente_moins_3_jours' && r3[0].derniere_relance?.chemin === 'crm' && r3[1].motif === 'relance_recente_moins_3_jours' && r3[2].a_relancer === true && r3[3].motif === 'relance_recente_moins_3_jours',
      `${REL} : une relance à moins de 3 jours, par n'importe quel chemin, est bloquée (${r3.map((x) => x.motif).join(', ')})`)
    // R4 : stop, litige ou escalade ; une lecture en erreur vaut refus
    const r4 = m([rel(30, { stop: true }), rel(31, { escalade: true }), rel(32, { stop: null }), rel(33, { escalade: null }), rel(34, { historique: { ok: false, erreur: 'Exemple. lecture refusée' } }), rel(35, { stop: true, escalade: true })])
    ko('R4', r4[0].motif === 'stop' && r4[1].motif === 'litige_ou_escalade' && r4[2].motif === 'lecture_en_erreur' && r4[3].motif === 'lecture_en_erreur' && r4[4].motif === 'lecture_en_erreur' && r4[5].motif === 'stop' && r4.every((x) => x.a_relancer === false),
      `${REL} : stop, escalade et lectures en erreur refusent la relance (${r4.map((x) => x.motif).join(', ')})`)
    // R5 : horaires et jours permis, à l'heure de Paris
    const r5 = m([rel(40, { maintenant: '2026-11-08T10:00:00.000+01:00' }), rel(41, { maintenant: '2026-11-03T06:59:00.000Z' }), rel(42, { maintenant: '2026-11-03T07:00:00.000Z' }), rel(43, { maintenant: '2026-11-03T18:00:00.000Z' })])
    ko('R5', r5[0].motif === 'hors_horaires' && r5[1].motif === 'hors_horaires' && r5[2].a_relancer === true && r5[3].motif === 'hors_horaires', `${REL} : horaires et jours permis à l'heure de Paris (${r5.map((x) => x.motif).join(', ')})`)
    // R6 : la clé, propre à l'organisation et au palier, 80 au plus ; R7 : avant le premier palier, rien
    const k1 = m([rel(50)])[0].cle_idempotence, k2 = res(REL, [{ ...rel(50), organisation_id: ORG2 }])[0]?.resultat?.cle_idempotence
    ko('R6', k1 && k2 && k1 !== k2 && k1.length <= 80 && k1 === m([rel(50)])[0].cle_idempotence, `${REL} : clé d'idempotence stable, propre à l'organisation, 80 au plus`)
    ko('R7', m([rel(51, { depuis_le: '2026-11-03T00:00:00.000+01:00' })])[0].motif === 'aucun_palier_atteint', `${REL} : avant le premier palier, aucune relance`)
  }

  // T : lib-normaliser-telephone, au moment d'envoyer seulement
  {
    const cas = [['06 39 98 00 07', '+33639980007'], ['+33 6 39 98 00 07', '+33639980007'], ['+33 (0)6 39 98 00 07', '+33639980007'], ['0033639980007', '+33639980007'], ['06.39.98.00.07', '+33639980007'],
      ['A string', null], ['', null], ['06', null], [null, null], ['06 39 98 00', null], ['00 39 98 00 07', null], ['+44 20 7946 0000', null], ['06 39 98 00 07 99', null]]
    const r = res(TEL, cas.map(([t]) => env(TEL, { moment: 'envoi', telephone: t }, {})))
    const faux = cas.filter(([t, x], i) => !(r[i]?.statut === 'ok' && r[i].resultat?.e164 === x && r[i].resultat?.valide === (x !== null)))
    ko('T1', !faux.length, `${TEL} : E.164 français ou vide, jamais une exception (${faux.map((x) => JSON.stringify(x[0])).join(', ')})`)
    ko('T2', r.every((s) => !/\d{6,}/.test(JSON.stringify(s?.journal ?? [])) && !/\d{2} \d{2} \d{2}/.test(JSON.stringify(s?.journal ?? []))), `${TEL} : le numéro n'entre jamais au journal`)
    const r3 = res(TEL, [env(TEL, { moment: 'qualification', telephone: '06 39 98 00 07' }, {}), env(TEL, { telephone: '06 39 98 00 07' }, {})])
    ko('T3', r3.every((s) => s?.statut === 'rejete'), `${TEL} : hors du moment d'envoyer (moment ≠ envoi), l'entrée est rejetée`)
    // T4 : dans le banc, le téléphone n'est atteint qu'APRÈS la porte et l'exécution, et aucun nœud plus tôt ne porte un numéro
    const w = banc, appelTel = w.nodes.find((x) => x.type === T.appel && x.parameters?.workflowId?.value === ids[TEL])
    const suivants = (nom) => Object.values(w.connections?.[nom] ?? {}).flat(2).filter(Boolean).map((l) => l.node)
    const atteint = (sans) => { const vus = new Set(), f = [w.nodes.find((x) => x.type === T.horloge)?.name]; while (f.length) { const x = f.shift(); if (!x || vus.has(x) || x === sans) continue; vus.add(x); f.push(...suivants(x)) } return vus }
    const porteB = w.nodes.find((x) => x.name === 'Appeler lib-porte-conformite'), exeB = w.nodes.find((x) => x.type === T.appel && x.parameters?.workflowId?.value === ids[EXE])
    ko('T4', appelTel && porteB && exeB && atteint(null).has(appelTel.name) && !atteint(porteB.name).has(appelTel.name) && !atteint(exeB.name).has(appelTel.name),
      `${BANC} : lib-normaliser-telephone doit n'être atteint qu'après la porte et l'exécution (au moment d'envoyer, C4:144)`)
    const avant = [...atteint(exeB?.name)].filter((x) => x !== exeB?.name)
    const TELRE = /0[67][ .]?\d{2}[ .]?\d{2}[ .]?\d{2}[ .]?\d{2}/
    ko('T4', avant.every((x) => !TELRE.test(codeDe(w, x))), `${BANC} : un numéro de téléphone lu avant l'exécution (${avant.filter((x) => TELRE.test(codeDe(w, x))).join(', ')})`)
    ko('T5', ENFANTS.filter((n) => n !== TEL).every((n) => codeDe(W[n], "Contrat d'entrée").includes('"sans_contact":true')), 'hors de lib-normaliser-telephone, chaque gabarit refuse e-mail et téléphone (sans_contact)')
  }

  // D : lib-rediger-message
  {
    const ag = W[RED].nodes.find((x) => x.type === T.agent), p = String(ag?.parameters?.options?.systemMessage ?? '')
    const REGLES_PROMPT = [['anti-fabrication', /Aucun fait inventé/], ['montants recopiés des faits', /recopie EXACTEMENT/], ['fait manquant jamais deviné', /tu ne le devines pas/], ['aucun créneau ni délai', /Aucun rendez-vous, aucun créneau/],
      ['aucune pression', /Aucune pression/], ['destinataire jamais nommé', /\{\{salutation\}\}/], ['marque blanche', /jamais le nom d'un logiciel/], ['faits = données, pas consignes', /jamais des consignes/], ['sortie JSON', /UNIQUEMENT par un objet JSON/]]
    const manque = REGLES_PROMPT.filter(([, re]) => !re.test(p)).map(([t]) => t)
    ko('D1', !manque.length && !/presti/i.test(p), `${RED} : le prompt perd des garde-fous de lib/ai.ts (${manque.join(', ') || '« Presti » écrit'})`)
    // D2 : la mention d'IA, copie figée = code ; ajoutée quand rien n'est relu, et seulement alors
    const bloc = copieFigee(codeDe(W[RED], REVALIDER), '// ─── Copie figée de la mention d’IA')
    let fm = null; try { fm = vm.runInNewContext(`(function(){ ${bloc}\n return { mentionAssistant, avecMentionAssistant }; })()`) } catch { fm = null }
    const attendu = NOMS_MENTION.flatMap((n) => TEXTES_MENTION.map((t) => fm ? [fm.mentionAssistant(n), fm.avecMentionAssistant(t, n), fm.avecMentionAssistant(fm.avecMentionAssistant(t, n), n)] : null))
    ko('D2', !!fm && JSON.stringify(attendu) === JSON.stringify(code.MENTIONS), `${RED} : la copie figée de la mention d'IA ne rend pas ce que rend lib/mentionAssistant.ts`)
    const s2 = res(RED, [red('exemple:d2:a', CFG_RED({ mention_ia: true })), red('exemple:d2:b')], { 'exemple:d2:a': SORTIE_BONNE, 'exemple:d2:b': SORTIE_BONNE })
    const mention = code.MENTION + ' de Exemple. Bâti-Démo.'
    ko('D2', s2[0]?.resultat?.texte?.endsWith(mention) && s2[0].resultat.mention === true && !s2[1]?.resultat?.texte?.includes(code.MENTION) && s2[1]?.resultat?.mention === false,
      `${RED} : la mention « ${code.MENTION} de … » quand le message part sans relecture, et seulement alors`)
    // D3 : une sortie de modèle hors schéma ne donne aucun brouillon
    const fautes = [['salutation absente', { ...SORTIE_BONNE, texte: TEXTE_BON.replace('{{salutation}}', 'Bonjour') }], ['champ {{prenom}}', { ...SORTIE_BONNE, texte: TEXTE_BON.replace('{{salutation}}', '{{salutation}} {{prenom}}') }],
      ['champ en trop', { ...SORTIE_BONNE, prix: 'Exemple.' }], ['texte trop long', { ...SORTIE_BONNE, texte: '{{salutation}} ' + 'x'.repeat(1600) }], ['fait cité inconnu', { ...SORTIE_BONNE, faits_cites: ['remise'] }],
      ['sortie illisible', 'Exemple. pas du JSON'], ['Markdown', { ...SORTIE_BONNE, texte: TEXTE_BON.replace('Nous', '**Nous**') }], ['objet absent', { ...SORTIE_BONNE, objet: null }]]
    const s3 = res(RED, fautes.map((_, i) => red('exemple:d3:' + i)), Object.fromEntries(fautes.map(([, o], i) => ['exemple:d3:' + i, o])))
    const passees = fautes.filter((_, i) => !(s3[i]?.statut === 'erreur' && s3[i].resultat === null && s3[i].effets_prevus.length === 0)).map(([t]) => t)
    ko('D3', !passees.length, `${RED} : sortie du modèle hors schéma acceptée (${passees.join(', ')})`)
    // D4 : un SMS porte STOP, ajouté par le code ; D5 : aucun contact vers le modèle ; D6 : modèle Standard, épinglé, jetons non mesurés
    const sms = { objet: null, texte: '{{salutation}}, nous revenons vers vous au sujet de votre demande. Exemple. L’équipe Bâti-Démo', faits_cites: [], champs_inconnus: [] }
    const s4 = res(RED, [red('exemple:d4', CFG_RED({ canal: 'sms' }), { type_relance: 'relance_conversation', palier: 1 })], { 'exemple:d4': sms })[0]
    ko('D4', /\bSTOP\b/.test(s4?.resultat?.texte ?? ''), `${RED} : un SMS doit porter STOP (C4:680)`)
    const s5 = res(RED, [red('exemple:d5', CFG_RED(), { ...FAITS, objet: 'Exemple. rappeler le 06 39 98 00 09' }), red('exemple:d5b', CFG_RED({ signature: 'Exemple. contact@exemple.invalid' }))], { 'exemple:d5': SORTIE_BONNE, 'exemple:d5b': SORTIE_BONNE })
    ko('D5', s5.every((x) => x?.statut === 'rejete'), `${RED} : un téléphone ou un e-mail vers le modèle doit faire rejeter l'entrée`)
    const s6 = s2[1]?.resultat
    ko('D6', s6 && s6.modele === code.MODELE_STANDARD && s6.epingle === true && s6.jetons_entree === null && s6.jetons_sortie === null, `${RED} : modèle ${code.MODELE_STANDARD}, épinglé, jetons non mesurés (null, jamais une estimation)`)
  }

  // K : lib-porte-conformite
  {
    const js = codeDe(W[POR], LOGIQUE[POR])
    const bloc = copieFigee(js, '// ─── Copie figée de la liste « jamais en automatique »') ?? ''
    let C = null, G = null
    try { C = JSON.parse(/const COPIE = (\{.*\});\n/.exec(bloc)[1]); G = JSON.parse(/const GESTES_P5_226 = (\[.*\]);\n/.exec(bloc)[1]) } catch { C = null }
    ko('K1', !!C && !!G, `${POR} : copie figée introuvable`)
    if (C) for (const k of ['OUTILS_JAMAIS_AUTO', 'PLAFOND_AUTO_JOUR', 'MOTS_ESCALADE_TOUJOURS', 'MOTS_ESCALADE_ENTIERS', 'MENTION', 'PIED_AUTOMATIQUE', 'PIED_APRES']) {
      ko('K1', JSON.stringify(C[k]) === JSON.stringify(code[k]), `${POR} : copie figée « ${k} » différente du code (${JSON.stringify(C[k]).slice(0, 60)} ≠ ${JSON.stringify(code[k]).slice(0, 60)})`)
    }
    const kit = new Set([...(C?.OUTILS_JAMAIS_AUTO ?? []), ...(G ?? [])])
    const absents = [...code.OUTILS_JAMAIS_AUTO, ...B1_EXIGES].filter((x) => !kit.has(x))
    ko('K2', !absents.length, `${POR} : la liste « jamais en automatique » du kit doit inclure celle du code et les gestes de p5:226 (manquent : ${absents.join(', ')})`)
    const P = (xs) => res(POR, xs).map((s) => s?.resultat ?? { verdict: 'erreur', motifs: [s?.statut] })
    const gestes = [...new Set([...code.OUTILS_JAMAIS_AUTO, ...B1_EXIGES, ...(G ?? [])])]
    // K3 : chaque geste, demandé en automatique avec un message propre et mentionné, est refusé (repli en carte) ; en carte, il passe
    const r3 = P(gestes.map((g) => por(code, { outil: g, cible: 'pilote', texte: AVEC_MENTION(code) })))
    const fautifs = gestes.filter((g, i) => !(r3[i].verdict === 'refuse' && r3[i].motifs.includes('geste_jamais_auto') && r3[i].repli === 'carte' && (!B1_MOTIFS[g] || r3[i].motifs.includes(B1_MOTIFS[g]))))
    ko('K3', !fautifs.length, `${POR} : geste « jamais en automatique » qui passe la porte en automatique : ${fautifs.join(', ')}`)
    const r3b = P(gestes.slice(0, 4).map((g) => por(code, { outil: g })))
    ko('K3', r3b.every((x) => x.verdict === 'passe' && x.cible === 'carte'), `${POR} : en carte (l'artisan valide), un geste interdit en automatique reste proposable`)
    // K4 : la mention et les pieds
    const r4 = P([por(code, { cible: 'pilote' }), por(code, { cible: 'pilote', texte: AVEC_MENTION(code) }), por(code, { texte: AVEC_MENTION(code) }), por(code, { texte: TEXTE_BON + '\n' + code.PIED_AUTOMATIQUE }), por(code, { cible: 'pilote', texte: AVEC_MENTION(code, TEXTE_BON + '\n' + code.PIED_APRES) })])
    ko('K4', r4[0].motifs.includes('mention_manquante') && r4[1].verdict === 'passe' && r4[1].cible === 'pilote' && r4[2].motifs.includes('pied_errone') && r4[3].motifs.includes('pied_errone') && r4[4].motifs.includes('pied_errone'),
      `${POR} : mention d'IA exigée sans relecture, absente d'une carte, jamais un autre pied (${r4.map((x) => x.motifs.join('+') || x.verdict).join(' | ')})`)
    // K5 : marque blanche
    const r5 = P([por(code, { texte: TEXTE_BON.replace('Bien cordialement', 'Envoyé avec Presti. Bien cordialement') }), por(code, { texte: TEXTE_BON.replace('Bien cordialement', 'Rédigé par Claude. Bien cordialement') }), por(code, { objet: 'Exemple. Votre relance PRESTI' }), por(code, { texte: TEXTE_BON.replace('Bien cordialement', 'Notre intelligence artificielle vous écrit. Bien cordialement') })])
    ko('K5', r5.every((x) => x.motifs.includes('marque_interdite')), `${POR} : « Presti », une marque ou un modèle dans le message doit être refusé (${r5.map((x) => x.motifs.join('+') || x.verdict).join(' | ')})`)
    // K6 : opposition, STOP, consentement
    const SMS = '{{salutation}}, nous revenons vers vous au sujet de votre demande. Exemple. L’équipe Bâti-Démo'
    const r6 = P([por(code, { dest: { opposition: true } }), por(code, { dest: { opposition: null } }), por(code, { canal: 'sms', texte: SMS }), por(code, { canal: 'sms', texte: SMS + '\nRépondez STOP pour ne plus recevoir de message.' }),
      por(code, { canal: 'sms', texte: SMS + '\nRépondez STOP pour ne plus recevoir de message.', dest: { consentement_sms: false } }), por(code, { canal: 'sms', texte: SMS + ' STOP', dest: { consentement_sms: null } })])
    ko('K6', r6[0].motifs.includes('opposition_ou_stop') && r6[1].motifs.includes('lecture_en_erreur') && r6[2].motifs.includes('opposition_ou_stop') && r6[3].verdict === 'passe' && r6[4].motifs.includes('consentement_sms_absent') && r6[5].motifs.includes('consentement_sms_absent'),
      `${POR} : un STOP ou une opposition ne sont jamais ignorés ; SMS sans STOP ou sans consentement refusé (${r6.map((x) => x.motifs.join('+') || x.verdict).join(' | ')})`)
    // K7 : les prix, et la TVA
    const r7 = P([por(code, { texte: TEXTE_BON.replace('455,80 €', '458,00 €') }), por(code, { faits: { ...FAITS, montant_ttc_centimes: null } }), por(code, { texte: TEXTE_BON.replace('455,80 € TTC', '455,80 €') }),
      por(code, { faits: { ...FAITS, regime_tva: 'franchise' } }), por(code, { texte: TEXTE_BON.replace('455,80 € TTC', '1 455,80 € TTC') }), por(code, { cible: 'pilote', texte: AVEC_MENTION(code), prix: false }), por(code, { texte: TEXTE_BON.replace('455,80 €', '455,80 euros') })])
    ko('K7', r7[0].motifs.includes('prix_sans_source') && r7[1].motifs.includes('prix_sans_source') && r7[2].motifs.includes('tva_ou_franchise') && r7[3].motifs.includes('tva_ou_franchise') && r7[4].motifs.includes('prix_sans_source') && r7[5].motifs.includes('prix_sans_source') && r7[6].verdict === 'passe',
      `${POR} : un prix absent des faits arrête le brouillon ; TTC/HT ou franchise respectés (${r7.map((x) => x.motifs.join('+') || x.verdict).join(' | ')})`)
    // K8 : dates, délais, créneaux, fournisseurs
    const ajoute = (phrase) => por(code, { texte: TEXTE_BON.replace("S'il y a", phrase + " S'il y a") })
    const r8 = P([ajoute('Nous passerons jeudi.'), ajoute('Réponse sous 48 h.'), ajoute('Un créneau est libre.'), ajoute('Le 12 novembre, nous serons là.'), ajoute('Le 12/11, nous serons là.'), ajoute('Matériel de chez Inventex.'),
      ajoute('Matériel de chez Exemple-Fournisseur.'), ajoute('Rappel : la facture date du 30 septembre 2026.'), ajoute("Vous pouvez répondre d'ici demain.")])
    ko('K8', [0, 1, 2, 3, 4, 5, 8].every((i) => r8[i].motifs.includes('delai_creneau_fournisseur_sans_source')) && r8[6].verdict === 'passe' && r8[7].verdict === 'passe',
      `${POR} : un délai, un créneau, une date ou un fournisseur absent des faits est refusé (${r8.map((x) => x.motifs.join('+') || x.verdict).join(' | ')})`)
    // K9 : l'escalade
    const r9 = P([ajoute('Notre avocat suivra le dossier.'), ajoute('Attention au gaz.'), ajoute('Le gazon est tondu.'), ajoute('Exemple. Mot sensible.'), por(code, { dest: { escalade: true } }), por(code, { dest: { escalade: null } })])
    ko('K9', r9[0].motifs.includes('sujet_escalade') && r9[1].motifs.includes('sujet_escalade') && !r9[2].motifs.includes('sujet_escalade') && r9[3].motifs.includes('sujet_escalade') && r9[4].motifs.includes('sujet_escalade') && r9[5].motifs.includes('sujet_escalade'),
      `${POR} : un sujet d'escalade (mots du code, de l'artisan, drapeau, drapeau non lu) reste à la main (${r9.map((x) => x.motifs.join('+') || x.verdict).join(' | ')})`)
    // K10 : une lecture en erreur ou une sortie illisible vaut refus
    const r10 = P([por(code, { conf: { jamais_auto: null } }), por(code, { conf: { regles_metier: null } }), por(code, { conf: { plafond_jour: null } }), por(code, { message: null }), por(code, { message: { canal: 'email', objet: null, texte: null } }), por(code, { texte: TEXTE_BON + ' {{montant}}' })])
    ko('K10', r10.every((x) => x.verdict === 'refuse' && x.motifs.includes('lecture_en_erreur')), `${POR} : lecture en erreur ou sortie illisible : refus (${r10.map((x) => x.motifs.join('+') || x.verdict).join(' | ')})`)
    const r10b = P([por(code, { conf: { jamais_auto: ['relancer_facture'] }, cible: 'pilote', texte: AVEC_MENTION(code) })])
    ko('K10', r10b[0].motifs.includes('geste_jamais_auto'), `${POR} : la configuration du client peut AJOUTER un geste jamais automatique`)
    // K11 : le plafond du jour (le plus bas de la configuration et du code), compté dans le lot ; K12 : horaires
    const auto = (plus = {}) => por(code, { cible: 'pilote', texte: AVEC_MENTION(code), ...plus })
    const r11 = P(Array.from({ length: 25 }, () => auto()))
    const r11b = P([auto({ envoyes: code.PLAFOND_AUTO_JOUR }), auto({ envoyes: code.PLAFOND_AUTO_JOUR, conf: { plafond_jour: 500 } }), { ...auto(), donnees: { ...auto().donnees, compteurs: { envoyes_aujourdhui: null } } }])
    ko('K11', r11.filter((x) => x.verdict === 'passe').length === code.PLAFOND_AUTO_JOUR && r11b[0].motifs.includes('plafond_atteint') && r11b[1].motifs.includes('plafond_atteint') && r11b[2].motifs.includes('lecture_en_erreur'),
      `${POR} : plafond de ${code.PLAFOND_AUTO_JOUR} envois automatiques par jour (${r11.filter((x) => x.verdict === 'passe').length} sur 25 ; ${r11b.map((x) => x.motifs.join('+')).join(' | ')})`)
    const r12 = P([auto({ maintenant: '2026-11-08T10:00:00.000+01:00' }), auto({ maintenant: '2026-11-03T21:00:00.000+01:00' }), por(code, { maintenant: '2026-11-08T10:00:00.000+01:00' })])
    ko('K12', r12[0].motifs.includes('hors_horaires') && r12[1].motifs.includes('hors_horaires') && r12[2].verdict === 'passe', `${POR} : hors des horaires, rien ne part seul (une carte attend l'artisan)`)
    ko('K13', res(POR, [por(code)]).every((s) => !JSON.stringify(s.resultat).includes('texte') && s.effets_prevus.length === 0), `${POR} : la porte ne modifie aucun message et ne prévoit aucun effet`)
  }

  // X : lib-executer
  {
    const X = (xs, conf) => res(EXE, xs.map((x) => (conf ? { ...x, config: conf } : x)))
    const r1 = X([exe('exemple:x:1')])[0]
    ko('X1', r1?.statut === 'ok' && r1.resultat.ecrit === false && r1.effets_faits.length === 0 && r1.effets_prevus.length === 1 && /^POST \/rest\/v1\/opportunites\?on_conflict=organisation_id,cle$/.test(r1.effets_prevus[0].requete) && r1.effets_prevus[0].corps.organisation_id === ORG1 && r1.effets_prevus[0].corps.cle === 'exemple:x:1',
      `${EXE} : en simulation, l'effet est prévu (POST sur clé unique, organisation dans le corps), jamais fait`)
    const r2 = X([exe('exemple:x:2a'), exe('exemple:x:2b', { interrupteurs: { general: false, agent: true } }), exe('exemple:x:2c'), exe('exemple:x:2d')])
    const r2b = X([exe('exemple:x:3a', { interrupteurs: { general: true, agent: false } }), exe('exemple:x:3b', { interrupteurs: null }), exe('exemple:x:3c', { interrupteurs: { general: true, agent: null } })])
    ko('X2', r2[0].statut === 'ok' && r2.slice(1).every((s) => s.statut === 'refuse' && s.effets_prevus.length === 0) && r2b.every((s) => s.statut === 'refuse' && s.effets_prevus.length === 0),
      `${EXE} : un interrupteur coupé (ou illisible) pendant un passage ne laisse partir aucun effet (${r2.map((s) => s.resultat?.motif).join(', ')})`)
    const r2c = X([exe('exemple:x:4a', { interrupteurs: { general: true, agent: null } }), { ...exe('exemple:x:4b'), organisation_id: ORG2 }])
    ko('X2', r2c[0].statut === 'refuse' && r2c[1].statut === 'ok', `${EXE} : la coupure vaut pour son organisation, pas pour une autre`)
    const r3 = X([exe('exemple:x:5', { cles_existantes: ['exemple:x:5'] }), exe('exemple:x:6'), exe('exemple:x:6'), exe('exemple:x:7', { cles_existantes: null })])
    ko('X3', r3[0].resultat?.deja_fait === true && r3[0].effets_prevus.length === 0 && r3[1].statut === 'ok' && r3[2].resultat?.deja_fait === true && r3[2].effets_prevus.length === 0 && r3[3].statut === 'refuse',
      `${EXE} : une clé déjà en base ou vue dans le lot est « déjà fait » ; une lecture des clés en erreur ne fait rien`)
    const r4 = X([exe('exemple:x:8', { cible: 'pilote' })])
    const r4b = X([exe('exemple:x:9', { cible: 'pilote' })], { niveau_max: 3 })
    ko('X4', r4[0].statut === 'refuse' && r4[0].effets_prevus.length === 0 && r4b[0].statut === 'ok' && r4b[0].effets_prevus[0].effet === 'mettre_en_file_pilote', `${EXE} : pas de ligne du pilote sous le niveau 3 (mode A : 2 au plus)`)
    const r5 = X([{ ...exe('exemple:x:10'), donnees: { ...exe('exemple:x:10').donnees, verdict: 'refuse' } }])
    ko('X5', r5[0].statut === 'rejete' && r5[0].effets_prevus.length === 0, `${EXE} : un verdict autre que « passe » ne s'exécute pas`)
  }

  // H : lib-rapport-hebdo
  {
    const H = (xs) => res(RAP, xs)
    const h1 = H([rap()])[0]
    const lignes = h1?.resultat?.lignes ?? []
    ko('H1', h1?.statut === 'ok' && lignes.length >= 3 && lignes.every((l) => l.startsWith('Exemple. ')), `${RAP} : en simulation, chaque ligne du rapport commence par « Exemple. »`)
    const GAIN = /gain|économi|gagn|€|euro|retour sur investissement|\broi\b|chiffre d.affaires/i
    ko('H2', !lignes.some((l) => GAIN.test(l)) && !(h1?.resultat?.indicateurs ?? []).some((x) => GAIN.test(x.id)), `${RAP} : aucun chiffre de gain dans le rapport`)
    const h2 = H(['gain_euros', 'economie_temps', 'chiffre_affaires', 'roi'].map((k) => rap({ kpis: ['fait_seul', k] })))
    ko('H2', h2.every((s) => s.statut === 'refuse' && s.resultat === null), `${RAP} : un indicateur de gain (hors liste fermée) fait refuser le rapport (${h2.map((s) => s.statut).join(', ')})`)
    const h3 = H([rap({ bases_de_depart: { en_attente: { valeur: 3, source: null, date: '2026-10-01', confiance: 'declare' } } }), rap({ bases_de_depart: { en_attente: { valeur: 3, source: 'Exemple. dit', date: null, confiance: 'declare' } } }), rap({ bases_de_depart: { en_attente: { valeur: 3, source: '  ', date: '2026-10-01', confiance: 'mesure' } } })])
    ko('H3', h3.every((s) => s.statut === 'refuse'), `${RAP} : un chiffre sans source ou sans date fait refuser le rapport`)
    const ligneBase = lignes.find((l) => /base de départ : 3/.test(l)) ?? ''
    ko('H4', /non mesurée/.test(ligneBase) && !/base de départ : 3 \(mesurée/.test(ligneBase), `${RAP} : une base déclarée n'est jamais présentée comme mesurée (${ligneBase.slice(0, 120)})`)
    const v = Object.fromEntries((h1?.resultat?.indicateurs ?? []).map((x) => [x.id, x.valeur]))
    ko('H5', v.actions_preparees === 5 && v.relances_preparees === 4 && v.fait_seul === 1 && v.en_attente === 2 && v.echecs === 1 && v.refus_porte === 1 && h1.resultat.fait_seul === 1,
      `${RAP} : des comptes justes, une action hors période non comptée (${JSON.stringify(v)})`)
    ko('H6', (h1?.resultat?.indicateurs ?? []).every((x) => x.source && x.date && x.confiance === 'mesure'), `${RAP} : chaque chiffre porte sa source, sa date et sa confiance`)
  }

  // B : le banc rejoué hors ligne en entier (les six gabarits appelés pour de vrai ; le modèle, ses sorties épinglées)
  {
    const essB = (essais ?? []).find((x) => x.workflow === BANC)
    // Les sorties épinglées du modèle, par clé d'action : rejouées depuis les essais de lib-rediger-message (dans l'ordre, comme n8n).
    const pinsParCle = {}
    for (const x of (essais ?? []).filter((y) => y.workflow === RED && Array.isArray(y.epingle_modele))) {
      const r = executer(W[RED], x.entrees, W, { pins: x.epingle_modele })
      ;(r.par['Préparer la demande au modèle'] ?? []).forEach((p, i) => { if (x.epingle_modele[i] !== undefined) pinsParCle[p.action_cle] = x.epingle_modele[i] })
    }
    const b = executer(banc, [{ timestamp: '2026-11-03T09:30:00.000+01:00' }], W, { pinsParCle })
    ko('B1', !b.erreur && b.sorties.length === 3 && b.sorties.every((x) => x.defauts === 0), `${BANC} : le banc doit tourner sans défaut (${b.erreur ?? JSON.stringify(b.sorties.map((x) => x.defauts))})`)
    const relB = (b.par['Appeler lib-relancer'] ?? []).map((s) => s.resultat)
    const mot = (id) => relB.find((r) => r?.objet_id === ID(id))?.motif
    const porteB = (b.par['Appeler lib-porte-conformite'] ?? []).map((s) => s.resultat)
    const exeB = (b.par['Appeler lib-executer'] ?? [])
    const telB = (b.par['Appeler lib-normaliser-telephone'] ?? []).map((s) => s.resultat)
    ko('B2', mot(311) === 'relance_recente_moins_3_jours' && mot(104) === 'stop' && mot(106) === 'litige_ou_escalade' && mot(121) === 'litige_ou_escalade' && mot(510) === 'aucun_palier_atteint'
      && relB.find((r) => r?.objet_id === ID(509))?.palier === 2 && relB.filter((r) => r?.a_relancer).length === 5,
      `${BANC} : Bâti-Démo : …0311 relancé il y a moins de 3 jours, …0104 stop, …0106 et …0121 escalade, …0510 avant le palier, …0509 au palier 2 (${relB.map((r) => r?.motif).join(', ')})`)
    ko('B2', porteB.filter((r) => r?.verdict === 'refuse').length === 1 && porteB.some((r) => r?.verdict === 'refuse' && r.motifs.includes('prix_sans_source')) && exeB.filter((s) => s.statut === 'ok').length === 4 && exeB.every((s) => s.effets_faits.length === 0),
      `${BANC} : la porte refuse le brouillon fautif (prix inventé sur …0312) ; quatre cartes prévues, aucune faite`)
    ko('B2', telB.length === 2 && telB[0]?.e164 === '+33639980007' && telB[1]?.e164 === null, `${BANC} : au moment d'envoyer, un numéro normalisé et un numéro illisible vidé`)
    const trie = (xs) => (xs ?? []).map((x) => JSON.stringify(x)).sort().join('\n')
    ko('B3', essB && trie(essB.sorties) === trie(b.sorties), `${BANC} : le bilan rejoué hors ligne diffère de celui de n8n (exécution ${essB?.execution ?? 'absente'})`)
    ko('B4', essB && JSON.stringify(essB.epingle_redaction) === JSON.stringify(b.par['Appeler lib-rediger-message'] ?? null), `${BANC} : la sortie épinglée de l'appel de ${RED} n'est pas celle que rend l'enfant rejoué`)
  }
  // N : les essais réels de n8n, rejoués à l'identique
  for (const x of (essais ?? []).filter((y) => ENFANTS.includes(y.workflow))) {
    const r = run(x.workflow, x.entrees, x.epingle_modele)
    if (x.statut_n8n === 'error') ko('N1', r.erreur === x.erreur, `${x.workflow} : l'essai n8n « ${x.titre.slice(0, 60)} » (exécution ${x.execution}) s'arrêtait sur « ${x.erreur} », hors ligne : ${r.erreur}`)
    else ko('N1', !r.erreur && JSON.stringify(r.sorties) === JSON.stringify(x.sorties), `${x.workflow} : l'essai n8n (exécution ${x.execution}) ne se rejoue pas à l'identique hors ligne`)
  }
  ko('N2', ENFANTS.every((n) => (essais ?? []).some((x) => x.workflow === n && x.statut_n8n === 'success')) && (essais ?? []).filter((x) => x.statut_n8n === 'error').length >= 2,
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
const MUTANTS = [
  // Le registre de 3 jours (lib-relancer)
  ['registre recopié faux (2 jours au lieu de 3)', 'R1', REL, (W) => remplacer(W, REL, LOGIQUE[REL], '"RELANCE_DELAI_JOURS":3', '"RELANCE_DELAI_JOURS":2')],
  ['date illisible comptée comme ancienne (copie du registre dérivée)', 'R1', REL, (W) => remplacer(W, REL, LOGIQUE[REL], 'return !Number.isFinite(le) || t - le < delai;', 'return Number.isFinite(le) && t - le < delai;')],
  ['le code passe le registre à 4 jours, la copie figée ne suit pas', 'R1', REL, (W, E, K) => { K.RELANCE_DELAI_JOURS = 4 }],
  ['un palier dépassé renvoyé après un plus haut', 'R2', REL, (W) => remplacer(W, REL, LOGIQUE[REL], 'plusHautEnvoye >= palier || vues.has(cle)', 'envoyes.includes(palier) || vues.has(cle)')],
  ['même palier relancé deux fois dans le lot', 'R2', REL, (W) => remplacer(W, REL, LOGIQUE[REL], 'plusHautEnvoye >= palier || vues.has(cle)', 'plusHautEnvoye >= palier')],
  ['relance à moins de 3 jours laissée passer', 'R3', REL, (W) => remplacer(W, REL, LOGIQUE[REL], "else if (verdict.refus) motif = 'relance_recente_moins_3_jours';", '')],
  ['STOP ignoré par la relance', 'R4', REL, (W) => remplacer(W, REL, LOGIQUE[REL], "if (d.stop === true) motif = 'stop';\n    else ", '')],
  ['stop non lu pris pour « pas de stop »', 'R4', REL, (W) => remplacer(W, REL, LOGIQUE[REL], 'd.stop !== false || ', '')],
  ['horaires ignorés', 'R5', REL, (W) => remplacer(W, REL, LOGIQUE[REL], "else if (!dansLesHoraires(maintenant, c.jours_permis, c.heures_permises)) motif = 'hors_horaires';", '')],
  // Le téléphone
  ['téléphone normalisé trop tôt (avant la relance, dans le banc)', 'T4', BANC, (W) => { const c = W[BANC].connections; c['Cas : relances Bâti-Démo'].main[0].push({ node: 'Appeler lib-normaliser-telephone', type: 'main', index: 0 }) }],
  ['numéro lu dès les cas du banc', 'T4', BANC, (W) => remplacer(W, BANC, 'Cas : relances Bâti-Démo', "const REGLES = {", "const NUMERO = '06 39 98 00 07';\nconst REGLES = {")],
  ['moment d’envoyer non exigé par le contrat', 'T3', TEL, (W) => { const n = noeud(W, TEL, "Contrat d'entrée"); n.parameters.jsCode = n.parameters.jsCode.replace('\\"moment\\":{\\"const\\":\\"envoi\\"}', '\\"moment\\":{\\"type\\":\\"string\\"}').replace('"moment":{"const":"envoi"}', '"moment":{"type":"string"}') }],
  ['numéro trop court accepté', 'T1', TEL, (W) => remplacer(W, TEL, LOGIQUE[TEL], '/^0([1-9]\\d{8})$/', '/^0([1-9]\\d{4,8})$/')],
  ['numéro écrit au journal', 'T2', TEL, (W) => remplacer(W, TEL, LOGIQUE[TEL], "decision: e164 ? 'numéro valide, mis au format international'", "decision: e164 ? 'numéro valide : ' + e164")],
  // La rédaction
  ['mention d’IA ôtée du message sans relecture', 'D2', RED, (W) => remplacer(W, RED, REVALIDER, 'if (c.mention_ia === true) texte = avecMentionAssistant(texte, c.nom_artisan);', '')],
  ['mention d’IA recopiée fausse', 'D2', RED, (W) => remplacer(W, RED, REVALIDER, 'Message rédigé et envoyé automatiquement par l’assistant${', 'Message envoyé automatiquement par l’assistant${')],
  ['le code change la mention, la copie figée ne suit pas', 'D2', RED, (W, E, K) => { K.MENTIONS = K.MENTIONS.map((x) => x.map((t) => t.replace('rédigé et envoyé', 'écrit et envoyé'))) }],
  ['sortie du modèle hors schéma acceptée (revalidation ôtée)', 'D3', RED, (W) => remplacer(W, RED, REVALIDER, 'const fautes = horsSchema(o, c.canal, p.faits_affiches || {});', 'const fautes = [];')],
  ['SMS sans STOP', 'D4', RED, (W) => remplacer(W, RED, REVALIDER, "if (c.canal === 'sms' && !/\\bSTOP\\b/.test(texte)) texte = texte + '\\n' + LIGNE_STOP;", '')],
  ['prompt sans la règle anti-fabrication', 'D1', RED, (W) => { const a = W[RED].nodes.find((n) => n.type === T.agent); a.parameters.options.systemMessage = a.parameters.options.systemMessage.replace('1. Aucun fait inventé.', '1.') }],
  ['parseur en autoFix (un second appel au modèle)', 'S8', RED, (W) => { W[RED].nodes.find((n) => n.type === T.parseur).parameters.autoFix = true }],
  ['identifiant posé sur le modèle (désépinglé)', 'S2', RED, (W) => { W[RED].nodes.find((n) => n.type === T.modele).credentials = { anthropicApi: { id: 'Exemple0001', name: 'Exemple' } } }],
  ['essai de rédaction sans sortie épinglée (modèle appelé)', 'S8', RED, (W, E) => { const x = E.find((y) => y.workflow === RED); delete x.epingle_modele }],
  // La porte
  ['geste « jamais en automatique » qui passe la porte', 'K3', POR, (W) => remplacer(W, POR, LOGIQUE[POR], 'if (auto && jamais) {', 'if (false) {')],
  ['gestes de p5:226 sans « envoyer un devis »', 'K2', POR, (W) => remplacer(W, POR, LOGIQUE[POR], 'const GESTES_P5_226 = ["envoyer_devis","envoi_devis",', 'const GESTES_P5_226 = [')],
  ['liste du code amputée dans la copie (« payer » ôté)', 'K1', POR, (W) => remplacer(W, POR, LOGIQUE[POR], '"rembourser","payer",', '"rembourser",')],
  ['le code gagne un geste jamais automatique, la copie figée ne suit pas', 'K1', POR, (W, E, K) => { K.OUTILS_JAMAIS_AUTO = [...K.OUTILS_JAMAIS_AUTO, 'exporter_compta'] }],
  ['le code gagne un mot d’escalade, la copie figée ne suit pas', 'K1', POR, (W, E, K) => { K.MOTS_ESCALADE_TOUJOURS = [...K.MOTS_ESCALADE_TOUJOURS, 'expertise judiciaire'] }],
  ['mention manquante acceptée en automatique', 'K4', POR, (W) => remplacer(W, POR, LOGIQUE[POR], "if (auto && !aMention) motifs.add('mention_manquante');", '')],
  ['« Presti » accepté dans un message au nom de l’artisan', 'K5', POR, (W) => remplacer(W, POR, LOGIQUE[POR], 'const MARQUES = /presti|', 'const MARQUES = /')],
  ['STOP (opposition) ignoré par la porte', 'K6', POR, (W) => remplacer(W, POR, LOGIQUE[POR], "if (dest.opposition === true) motifs.add('opposition_ou_stop');\n    else ", '')],
  ['SMS sans STOP accepté', 'K6', POR, (W) => remplacer(W, POR, LOGIQUE[POR], "if (!/\\bSTOP\\b/.test(t)) motifs.add('opposition_ou_stop');", '')],
  ['prix absent des faits laissé passer', 'K7', POR, (W) => remplacer(W, POR, LOGIQUE[POR], "if (!permis.includes(centimes)) motifs.add('prix_sans_source');", '')],
  ['créneau inventé laissé passer', 'K8', POR, (W) => remplacer(W, POR, LOGIQUE[POR], "if (CRENEAU.test(tout)) motifs.add('delai_creneau_fournisseur_sans_source');", '')],
  ['mots d’escalade ignorés dans le message', 'K9', POR, (W) => remplacer(W, POR, LOGIQUE[POR], 'if (sujet) motifs.add(', 'if (false) motifs.add(')],
  ['lecture en erreur prise pour un accord', 'K10', POR, (W) => remplacer(W, POR, LOGIQUE[POR], "if (!lu) motifs.add('lecture_en_erreur');", '')],
  ['plafond du jour ignoré', 'K11', POR, (W) => remplacer(W, POR, LOGIQUE[POR], "else if (deja >= plafond) motifs.add('plafond_atteint');", '')],
  // L'exécution
  ['interrupteur coupé ignoré', 'X2', EXE, (W) => remplacer(W, EXE, LOGIQUE[EXE], "if (i.general !== true || i.agent !== true) { coupes.add(org); return fin('refuse', 'interrupteur_coupe', [], false, false); }", '')],
  ['coupure oubliée au fil du passage', 'X2', EXE, (W) => remplacer(W, EXE, LOGIQUE[EXE], "if (coupes.has(org)) return fin('refuse', 'interrupteur_coupe_pendant_le_passage', [], false, false);", '')],
  ['idempotence ôtée (même clé exécutée deux fois)', 'X3', EXE, (W) => remplacer(W, EXE, LOGIQUE[EXE], " || vues.has(org + '|' + d.cle_idempotence)", '')],
  ['ligne du pilote permise en mode A', 'X4', EXE, (W) => remplacer(W, EXE, LOGIQUE[EXE], "if (d.cible === 'pilote' && c.niveau_max < 3) return fin('refuse', 'niveau_3_non_permis', [], false, false);", '')],
  ['envoi hors simulation (porte « simulation » retirée)', 'S4', EXE, (W) => { const c = W[EXE].connections; c['Entrée conforme ?'].main[0] = [{ node: LOGIQUE[EXE], type: 'main', index: 0 }]; delete c['Porte simulation'] }],
  ['une écriture HTTP ajoutée à l’exécution', 'S2', EXE, (W) => { W[EXE].nodes.push({ name: 'Écrire la carte', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, parameters: { method: 'POST', url: 'https://exemple.invalid' } }); W[EXE].connections[LOGIQUE[EXE]].main[0].push({ node: 'Écrire la carte', type: 'main', index: 0 }) }],
  // Le rapport
  ['indicateur de gain accepté', 'H2', RAP, (W) => remplacer(W, RAP, LOGIQUE[RAP], "for (const k of c.kpis) if (!Object.prototype.hasOwnProperty.call(KPI, k)) refus.push(", "for (const k of []) if (!Object.prototype.hasOwnProperty.call(KPI, k)) refus.push(")],
  ['« Exemple. » ôté du rapport', 'H1', RAP, (W) => remplacer(W, RAP, LOGIQUE[RAP], "P = e.simulation ? 'Exemple. ' : ''", "P = ''")],
  ['chiffre sans source accepté', 'H3', RAP, (W) => remplacer(W, RAP, LOGIQUE[RAP], "if (!b || typeof b.source !== 'string' || !b.source.trim() || typeof b.date !== 'string' || !b.date.trim()) refus.push(", 'if (false) refus.push(')],
  ['base déclarée présentée comme mesurée', 'H4', RAP, (W) => remplacer(W, RAP, LOGIQUE[RAP], "declare: 'déclarée par le client, non mesurée'", "declare: 'mesurée'")],
  // La structure
  ['workflow activé', 'S1', POR, (W) => { W[POR].active = true }],
  ['workflow d’erreur retiré', 'S3', REL, (W) => { delete W[REL].settings.errorWorkflow }],
  ['appelable par tout workflow', 'S3', EXE, (W) => { W[EXE].settings.callerPolicy = 'any' }],
  ['contrat d’entrée affaibli (champs en trop acceptés)', 'S5', POR, (W) => remplacer(W, POR, "Contrat d'entrée", 'if (s.additionalProperties === false) for', 'if (false) for')],
  ['SHA-256 faussé', 'S6', REL, (W) => remplacer(W, REL, LOGIQUE[REL], 'h = g; g = f; f = e;', 'h = f; g = f; f = e;')],
  ['banc qui appelle un sous-workflow en source « parameter »', 'S3', BANC, (W) => { W[BANC].nodes.find((n) => n.name === 'Appeler lib-executer').parameters.source = 'parameter' }],
  ['essai n8n falsifié (sortie retouchée après coup)', 'N1', POR, (W, E) => { const x = E.find((y) => y.workflow === POR && y.sorties); x.sorties[3].resultat.verdict = 'passe' }],
]

// ─── Lancement ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const lire = (f) => JSON.parse(readFileSync(path.join(DOSSIER, f), 'utf8'))
const W = {}
for (const n of [...ENFANTS, BANC]) if (existsSync(path.join(DOSSIER, `${n}.workflow.json`))) W[n] = lire(`${n}.workflow.json`)
const essais = existsSync(path.join(DOSSIER, 'essais-n8n.json')) ? lire('essais-n8n.json') : []
const code = lireCode()
const erreurs = juger(W, essais, code)
let rouges = 0
const verts = []
if (!erreurs.length) {
  console.log(`✓ chaîne relance → rapport (${ENFANTS.length} gabarits et le banc, ${essais.length} essai(s) n8n rejoué(s)) : S1 à S8, C1 à C3, R1 à R7, T1 à T5, D1 à D6, K1 à K13, X1 à X5, H1 à H6, B1 à B4, N1 et N2 tenus`)
  console.log(`  copies figées = code : registre ${code.RELANCE_DELAI_JOURS} jours (${code.CHEMINS.join(', ')} ; ${BATTERIE_REGISTRE.length} historiques rejoués contre relanceRecente()), ${code.OUTILS_JAMAIS_AUTO.length} gestes jamais automatiques inclus dans la liste du kit avec ${B1_EXIGES.length} gestes de p5:226 exigés, ${code.MOTS_ESCALADE_TOUJOURS.length}+${code.MOTS_ESCALADE_ENTIERS.length} mots d'escalade, mention d'IA (${code.MENTIONS.length} cas rejoués contre lib/mentionAssistant.ts), PIED_AUTOMATIQUE et PIED_APRES, plafond ${code.PLAFOND_AUTO_JOUR}/jour ; modèle ${code.MODELE_STANDARD}, épinglé`)
  for (const [titre, regle, wf, f] of MUTANTS) {
    const M = copie(W), E = copie(essais), K = copie(code)
    let r
    try { f(M, E, K); r = juger(M, E, K) } catch (err) { verts.push(titre); console.log(`  ✗ mutant « ${titre} » (${wf}) : ${err.message}`); continue }
    const pourSaRaison = r.some((x) => x.startsWith(regle))
    if (r.length && pourSaRaison) { rouges++; console.log(`  ✓ mutant « ${titre} » (${wf}) fait rougir le juge\n      → ${r.find((x) => x.startsWith(regle)).slice(0, 200)}`) }
    else { verts.push(titre); console.log(`  ✗ mutant « ${titre} » (${wf}) ne fait pas rougir le juge pour sa raison (${regle}) : ${r[0] ?? 'aucun défaut'}`) }
  }
  console.log(`lib-relance-n8n-qa : ${MUTANTS.length} mutants, ${rouges} rouges`)
} else {
  for (const x of erreurs) console.log(`  ✗ ${x}`)
}
const ok = !erreurs.length && !verts.length
console.log(ok ? 'OK' : 'ÉCHEC')
process.exit(ok ? 0 : 1)
