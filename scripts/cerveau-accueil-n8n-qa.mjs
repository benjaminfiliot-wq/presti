// JUGE du sommet du système de chaque artisan (tâche 036-001 ; plans/011-cadrage-01-11/p6-signature/premiere-reponse.md, ligne 036-001) :
// `presti-cerveau` (parent multi-comptes), `presti-dep-accueil` et ses spécialistes `lib-trier-demande` et `lib-lire-photo`, les six chefs
// en squelette et le banc `presti-banc-cerveau`. Hors ligne : aucun réseau, aucune base, aucun modèle. Il ne lit QUE ce qui a été rendu par
// n8n (les exports .orchestre/preuves/036-001/*.workflow.json et essais-n8n.json), les contrats versionnés
// (plans/011-cadrage-01-11/p6-signature/contrats/*.json) et le CODE de l'application (lib/pilote/regles.ts, lib/plateformeConfig.ts,
// lib/plans.ts), jamais la fabrique. Il rejoue les nœuds des exports dans node:vm (moteur de scripts/demo-entreprise-qa.mjs), les lib-*
// existants depuis LEURS exports (035-003 à 035-005), et il rougit (code 1) sur :
//   S  structure : inactif, réglages, politique d'appel, types permis, trois étages, aucun identifiant ;
//   C  contrats : le schéma embarqué dans chaque « Contrat d'entrée » = le contrat versionné ; la table de routage = cerveau.json ;
//   G2 un Cerveau qui calcule (arithmétique, date, montant, note) ou appelle un modèle ou un gabarit métier ; G4 un envoi, une écriture, une
//      porte « simulation » contournée, un effet fait ; G6 un montant calculé dans un chef ;
//   M  multi-tenant : une lecture sans filtre artisan_id, un événement routé vers un autre compte, un effet hors de son compte ;
//   E  escalade : la copie figée des mots du pilote ≠ le code, ou une décision du trieur ≠ sujetEscalade du code ;
//   A  Studio et Signature : une ligne du pilote pour Studio, pour un type non activé, pour un geste OUTILS_JAMAIS_AUTO, ou sur une escalade ;
//   I  idempotence : le même lot rejoué, ou la même demande deux fois, qui crée une seconde carte ;
//   Q  la photo chiffrée qui passe ; K un squelette qui fait quelque chose ; N/P les essais n8n (sortie rejouée = sortie de n8n ; sortie
//      épinglée = export rejoué) ; H « Exemple. » partout, aucune adresse, aucune marque.
// Chaque règle a son MUTANT, qui doit la faire rougir pour sa raison.
//   node scripts/cerveau-accueil-n8n-qa.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { executer, T } from './demo-entreprise-qa.mjs'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PREUVE = path.join(RACINE, '.orchestre/preuves/036-001')
const CONTRATS = path.join(RACINE, 'plans/011-cadrage-01-11/p6-signature/contrats')
const copie = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)))
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const lireJson = (f) => JSON.parse(readFileSync(f, 'utf8'))
const DEPS = ['accueil', 'devis', 'suivi', 'facturation', 'apres', 'operations', 'direction']
const CHEFS = DEPS.map((d) => `presti-dep-${d}`)
const NEUFS = ['lib-trier-demande', 'lib-lire-photo']
const NOMS = ['presti-cerveau', ...CHEFS, ...NEUFS, 'presti-banc-cerveau']
const T2 = { ...T, modele: '@n8n/n8n-nodes-langchain.lmChatAnthropic', parseur: '@n8n/n8n-nodes-langchain.outputParserStructured' }
const PERMIS = {
  'presti-cerveau': [T.horloge, T.rien, T.si, T.code, T.aiguillage, T.reunion, T.appel, T.note],
  chef: [T.trigger, T.code, T.si, T.appel, T.arret, T.note],
  'lib-trier-demande': [T.trigger, T.code, T.si, T.arret, T.note],
  'lib-lire-photo': [T.trigger, T.code, T.si, T.arret, T.note, T.agent, T2.modele, T2.parseur],
  'presti-banc-cerveau': [T.horloge, T.code, T.appel, T.note],
}
const ENVOI_ECRITURE = /email|gmail|outlook|slack|telegram|twilio|whatsapp|discord|mattermost|sendgrid|mailgun|mailjet|brevo|sendinblue|httprequest|supabase|postgres|mysql|redis|ftp|ssh|executecommand/i
const COURRIEL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/
const CREATEURS = new Set(['ecrire_carte', 'mettre_en_file_pilote'])
// Le code d'un nœud sans commentaires ni chaînes : ce qui reste est ce qui CALCULE.
const nu = (js) => String(js).replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, "''")
// Un effet prévu porte son compte et sa clé à plat (lib-decider, lib-qualifier-lead) ou dans son corps (lib-executer : la requête prévue).
const orgDe = (x) => x.organisation_id ?? x.corps?.organisation_id, cleDe = (x) => x.cle ?? x.corps?.cle, objetDe = (x) => x.objet_id ?? x.corps?.objet_id
// La sortie finale d'un rejeu : le moteur de 035-007 lit « Contrat de sortie » et « Bilan du passage » ; le banc finit par « Bilan du banc ».
const finDe = (w, r) => w.name === 'presti-banc-cerveau' ? (r.par['Bilan du banc']?.[0] ?? []) : r.sorties
const aretes = (wf, nom) => Object.values(wf.connections?.[nom] ?? {}).flatMap((liste) => (liste ?? []).flatMap((s, i) => (s ?? []).filter(Boolean).map((l) => ({ vers: l.node, sortie: i }))))

// ─── Le code de l'application, lu par un sous-processus (TypeScript) : la vérité contre laquelle tout est comparé ─────────────────────
export function lireCode(questions) {
  const u = (f) => JSON.stringify(path.join(RACINE, f))
  const prog = `const r = await import(${u('lib/pilote/regles.ts')}); const p = await import(${u('lib/plans.ts')}); const c = await import(${u('lib/plateformeConfig.ts')});
let q = ''; for await (const x of process.stdin) q += x; q = JSON.parse(q);
process.stdout.write(JSON.stringify({ MOTS_ESCALADE_TOUJOURS: r.MOTS_ESCALADE_TOUJOURS, MOTS_ESCALADE_ENTIERS: r.MOTS_ESCALADE_ENTIERS, OUTILS_JAMAIS_AUTO: r.OUTILS_JAMAIS_AUTO,
  OUTILS_EXECUTABLES_PILOTE: r.OUTILS_EXECUTABLES_PILOTE, OUTIL_TYPE: r.OUTIL_TYPE,
  escalade: q.messages.map(([m, mots]) => r.sujetEscalade([m], mots)),
  modes: q.plans.map(([plan, mode]) => c.modeEffectif(plan, { ...c.CONFIG_DEFAUT, mode_reponse: mode }).mode),
  pilote: Object.fromEntries(q.plans.map(([plan]) => [plan, p.peut(plan, 'assistant.pilote')])) }));`
  const sortie = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', './scripts/ts-loader.mjs', '--input-type=module', '-e', prog], { cwd: RACINE, encoding: 'utf8', input: JSON.stringify(questions), maxBuffer: 1 << 26 })
  const code = JSON.parse(sortie)
  const src = readFileSync(path.join(RACINE, 'lib/pilote/regles.ts'), 'utf8')
  for (const n of ['FAUSSE_URGENCE', 'PERTE_D_EAU', 'APPAREIL_PERD', 'NOMS_NEUTRES']) { const m = new RegExp(`^const ${n} = \\/(.+)\\/([gimsuy]*)$`, 'm').exec(src); code[n] = m ? { source: m[1], flags: m[2] } : null }
  return code
}

// ─── Le monde jugé ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export function chargerMonde() {
  const W = {}
  for (const n of NOMS) { const f = path.join(PREUVE, `${n}.workflow.json`); if (existsSync(f)) W[n] = lireJson(f) }
  const L = {}
  for (const d of ['035-003', '035-004', '035-005']) { const dir = path.join(RACINE, '.orchestre/preuves', d); for (const f of readdirSync(dir).filter((x) => x.endsWith('.workflow.json'))) { const w = lireJson(path.join(dir, f)); L[w.name] = w } }
  const c = (f) => (existsSync(path.join(CONTRATS, f)) ? lireJson(path.join(CONTRATS, f)) : null)
  return { W, L, essais: existsSync(path.join(PREUVE, 'essais-n8n.json')) ? lireJson(path.join(PREUVE, 'essais-n8n.json')) : [], cerveau: c('cerveau.json'), accueil: c('accueil.json') }
}
// La sortie que le juge épingle à la place du modèle de lib-lire-photo : sobre, sans aucun chiffre (jamais celle de la fabrique).
const MODELE_JUGE = () => ({ description: 'Exemple. Photo jointe : la pièce et l’élément concerné sont visibles.', elements: ['pièce'], confiance: 'moyenne', chiffrage: null })
const modeleJuge = (j) => MODELE_JUGE(j)
const noeud = (w, nom) => w?.nodes.find((n) => n.name === nom)
const schemaEmbarque = (w) => { const js = noeud(w, "Contrat d'entrée")?.parameters?.jsCode ?? ''; const m = /\nconst SCHEMA = (.*);\n/.exec(js); return m ? JSON.parse(m[1]) : null }

export function juger(M, K) {
  const e = [], ko = (r, m) => e.push(`${r} ${m}`)
  const W = { ...M.L, ...M.W }, id = (n) => M.W[n]?.id
  const ERREUR = M.L['lib-erreur-commune']?.id
  const nomDe = (i) => Object.values(W).find((w) => w.id === i)?.name
  // ── S : structure
  for (const nom of NOMS) {
    const w = M.W[nom]; if (!w) { ko('S1', `${nom} : export absent`); continue }
    if (w.active !== false || w.activeVersionId) ko('S1', `${nom} : actif ou publié`)
    const s = w.settings ?? {}
    if (s.errorWorkflow !== ERREUR || s.timezone !== 'Europe/Paris' || s.saveDataSuccessExecution !== 'none' || !Number.isInteger(s.executionTimeout) || s.executionTimeout < 1 || s.executionTimeout > 3600) ko('S2', `${nom} : réglages (workflow d'erreur, fuseau, rétention, délai)`)
    const appelants = String(s.callerIds ?? '').split(',').map((x) => x.trim()).filter(Boolean)
    const attendus = nom === 'presti-dep-accueil' ? [id('presti-cerveau'), id('presti-banc-cerveau')] : CHEFS.includes(nom) ? [id('presti-cerveau')] : NEUFS.includes(nom) ? [id('presti-dep-accueil')] : null
    if (attendus ? !(s.callerPolicy === 'workflowsFromAList' && egal([...appelants].sort(), [...attendus].sort())) : s.callerPolicy !== 'none') ko('S2', `${nom} : politique d'appel ${s.callerPolicy}/${s.callerIds} (attendu : ${attendus ? attendus.join(',') : 'none'})`)
    const permis = PERMIS[nom] ?? PERMIS.chef
    for (const n of w.nodes) {
      if (ENVOI_ECRITURE.test(n.type)) ko('G4', `${nom} / ${n.name} : nœud d'envoi, d'écriture ou de lecture réelle (${n.type}) : interdit en simulation`)
      else if (String(n.type).includes('langchain') && nom === 'presti-cerveau') ko('G2', `${nom} / ${n.name} : modèle dans le Cerveau (il route, il ne pense pas)`)
      else if (!permis.includes(n.type)) ko('S3', `${nom} / ${n.name} : type hors liste (${n.type})`)
      if (n.credentials && Object.keys(n.credentials).length) ko('S2', `${nom} / ${n.name} : identifiant posé (aucun en simulation)`)
      if (n.type === T.appel) {
        const cible = nomDe(n.parameters?.workflowId?.value)
        if (n.parameters?.source !== 'database' || !cible) ko('S3', `${nom} / ${n.name} : sous-workflow inconnu ou hors source database`)
        else if (nom === 'presti-cerveau' && !CHEFS.includes(cible) && !['lib-journaliser', 'lib-battement'].includes(cible)) ko('G2', `le Cerveau appelle ${cible} lui-même : c'est le travail d'un chef`)
        else if (CHEFS.includes(nom) && !cible.startsWith('lib-')) ko('S3', `${nom} appelle ${cible} : trois étages au plus (Cerveau, chef, lib-*)`)
        else if (nom === 'presti-banc-cerveau' && cible !== 'presti-dep-accueil') ko('S3', `le banc appelle ${cible}`)
      }
    }
  }
  const cerveau = M.W['presti-cerveau'], acc = M.W['presti-dep-accueil'], tri = M.W['lib-trier-demande'], photo = M.W['lib-lire-photo'], banc = M.W['presti-banc-cerveau']
  if (!cerveau || !acc || !tri || !photo || !banc) return e
  // ── C : les contrats versionnés = ce que vérifient les exports
  if (!M.accueil || !M.cerveau || !/^\d+\.\d+\.\d+$/.test(String(M.accueil.version)) || !/^\d+\.\d+\.\d+$/.test(String(M.cerveau.version))) ko('C1', 'contrats absents ou non versionnés')
  else {
    const sa = schemaEmbarque(acc)
    if (!sa || !egal({ config: sa.config, donnees: sa.donnees }, M.accueil.entree)) ko('C1', 'presti-dep-accueil : le schéma de son « Contrat d’entrée » diffère de contrats/accueil.json')
    for (const n of NEUFS) { const s = schemaEmbarque(M.W[n]), c = M.accueil.specialistes?.[`${n}@1`]; if (!s || !c || !egal(s.config, c.config) || !egal(s.donnees, c.donnees)) ko('C1', `${n} : son contrat d'entrée diffère de contrats/accueil.json`) }
    const parseur = photo.nodes.find((n) => n.type === T2.parseur)
    if (!parseur || !egal(JSON.parse(parseur.parameters.inputSchema), M.accueil.specialistes?.['lib-lire-photo@1']?.sortie_modele)) ko('C1', 'lib-lire-photo : le schéma de sortie du modèle diffère de contrats/accueil.json')
    const routes = /const ROUTES = (\{.*?\});/.exec(noeud(cerveau, 'Aiguiller')?.parameters?.jsCode ?? '')
    if (!routes || !egal(JSON.parse(routes[1]), M.cerveau.routes)) ko('C1', 'presti-cerveau : la table de routage diffère de contrats/cerveau.json')
    for (const d of DEPS) { const w = M.W[`presti-dep-${d}`]; if (w && !new RegExp(`^contrat: presti-dep-${d}@1$`, 'm').test(noeud(w, "Contrat d'entrée")?.notes ?? '')) ko('C1', `presti-dep-${d} : contrat presti-dep-${d}@1 non déclaré`) }
  }
  // ── G2 : le Cerveau ne calcule rien ; G6 : aucun chef ne calcule un montant
  for (const n of cerveau.nodes.filter((x) => x.type === T.code)) {
    const c = nu(n.parameters?.jsCode)
    if (/Math\.|\bDate\b|parse(?:Int|Float)|\bNumber\s*\(|toFixed|[^\s=!<>]\s*[*/%]\s*[^\s=]|\s[*/%]\s/.test(c)) ko('G2', `presti-cerveau / ${n.name} : arithmétique ou date dans le Cerveau`)
    if (/montant|centimes|\bprix\b|tarif|\btva\b|\bttc\b|\bnote\b|\bscore\b/i.test(c.replace(/\b\w+\s*:\s*null\b/g, ''))) ko('G2', `presti-cerveau / ${n.name} : le Cerveau touche à un montant, un prix ou une note`)
  }
  for (const nom of CHEFS) for (const n of (M.W[nom]?.nodes ?? []).filter((x) => x.type === T.code)) if (/montant|centimes|\bprix\b|\btarifs?\b|\btva\b|\bttc\b|\bht\b/i.test(nu(n.parameters?.jsCode))) ko('G6', `${nom} / ${n.name} : un montant calculé dans n8n (le montant vient du code, jamais d'un chef)`)
  // ── M1 : chaque lecture du Cerveau filtre sur le compte, telle que le contrat la déclare
  for (const n of cerveau.nodes.filter((x) => x.type === T.rien)) {
    const r = /^requete: (.+)$/m.exec(n.notes ?? '')?.[1]
    if (!r || !/[?&]artisan_id=(?:eq\.|in\.\(|is\.null&)/.test(r)) ko('M1', `presti-cerveau / ${n.name} : requête sans filtre artisan_id (« Supabase account » passe outre la RLS)`)
    else if (M.cerveau && M.cerveau.lectures?.[n.name]?.requete !== r) ko('M1', `presti-cerveau / ${n.name} : requête différente de contrats/cerveau.json`)
  }
  // ── G4 : la porte « simulation » avant tout appel (chef et spécialistes) ; hors simulation, aucun appel
  for (const nom of ['presti-dep-accueil', ...NEUFS]) {
    const w = M.W[nom], porte = noeud(w, 'Porte simulation')
    if (!porte || porte.type !== T.si || !/simulation/.test(JSON.stringify(porte.parameters?.conditions ?? {}))) { ko('G4', `${nom} : porte « simulation » absente`); continue }
    const vus = new Set(), file = [w.nodes.find((n) => n.type === T.trigger)?.name]
    while (file.length) { const x = file.shift(); if (!x || vus.has(x)) continue; vus.add(x); for (const a of aretes(w, x)) if (!(x === porte.name && a.sortie === 0)) file.push(a.vers) }
    for (const x of vus) if ([T.appel, T.agent].includes(noeud(w, x)?.type)) ko('G4', `${nom} / ${x} : atteignable sans passer la porte « simulation »`)
  }
  // ── Les enveloppes du banc (40 demandes), lues dans l'export du banc et rejouées
  const jb = []
  const rb = executer(banc, [{}], W, { modele: modeleJuge, politique: 'notee', journal: jb })
  const envs = jb.filter((x) => x.appelant === 'presti-banc-cerveau' && x.enfant === 'presti-dep-accueil').flatMap((x) => x.entrees)
  if (rb.erreur || envs.length !== 2) { ko('A0', `banc illisible (${rb.erreur ?? envs.length + ' enveloppe(s)'})`); return e }
  const demandes = envs.flatMap((v) => v.donnees.demandes.map((d) => ({ v, d })))
  if (demandes.length !== 40) ko('H1', `le banc porte ${demandes.length} demandes (40 attendues)`)
  for (const { v, d } of demandes) {
    if (d.message && !/^Exemple\. /.test(d.message)) ko('H1', `banc : message sans « Exemple. » (${d.id})`)
    if (d.proposition && (/presti/i.test(d.proposition.texte) || !/^Exemple\. /.test(d.proposition.texte))) ko('H1', `banc : proposition hors marque blanche ou sans « Exemple. » (${d.id})`)
    if (!/^Exemple\. /.test(v.config.nom_artisan)) ko('H1', 'banc : nom d’artisan sans « Exemple. »')
  }
  for (const nom of NOMS) if (M.W[nom] && COURRIEL.test(JSON.stringify(M.W[nom]))) ko('H2', `${nom} : adresse e-mail dans l'export`)
  // La vérité du code : l'escalade de chaque message, le mode servi et le pilote de chaque offre.
  const PROBES = [...K.MOTS_ESCALADE_TOUJOURS, ...K.MOTS_ESCALADE_ENTIERS].map((m) => `Exemple. Bonjour, ${m} chez moi, pouvez-vous passer ?`)
  const plans = [...new Set(envs.map((v) => v.config.offre))].flatMap((p) => ['manuelle', 'assistee', 'auto'].map((m) => [p, m]))
  const V = lireCode({ messages: demandes.map(({ v, d }) => [d.message ?? '', v.config.mots_escalade_artisan]).concat(PROBES.map((p) => [p, []])), plans })
  const escCode = new Map(demandes.map(({ d }, i) => [d.id, V.escalade[i]]))
  const modeServi = (v) => V.modes[plans.findIndex(([p, m]) => p === v.config.offre && m === v.config.mode_reponse)]
  // ── E : la copie figée des mots du pilote = le code ; le trieur décide comme sujetEscalade
  const copieTri = /\nconst COPIE = (\{.*\});\n/.exec(noeud(tri, 'Trier par règles')?.parameters?.jsCode ?? '')
  const CF = copieTri ? JSON.parse(copieTri[1]) : {}
  for (const k of ['MOTS_ESCALADE_TOUJOURS', 'MOTS_ESCALADE_ENTIERS', 'FAUSSE_URGENCE', 'PERTE_D_EAU', 'APPAREIL_PERD', 'NOMS_NEUTRES']) if (!egal(CF[k], K[k])) ko('E1', `lib-trier-demande : la copie figée de ${k} diffère de lib/pilote/regles.ts`)
  const envTri = (texte, i) => ({ contrat: 'lib-trier-demande@1', organisation_id: envs[0].organisation_id, simulation: true, cle_idempotence: 'tri:sonde:' + i, trace: { execution_parent: 'juge', declencheur: 'juge', tentative: 0 }, config: { mots_escalade_artisan: [] }, donnees: { demande_id: '00000000-0000-4000-8000-00000000f' + String(i).padStart(3, '0'), texte, liens: 0, honeypot: false, client_existant: false, urgence_declaree: false } })
  const rt = executer(tri, PROBES.map(envTri), W, {})
  const ecarts = rt.erreur ? [rt.erreur] : rt.sorties.map((s, i) => (s.resultat?.mot ?? null) === V.escalade[demandes.length + i] ? null : `« ${PROBES[i].slice(26, 60)} » : ${s.resultat?.mot ?? 'rien'} au lieu de ${V.escalade[demandes.length + i]}`).filter(Boolean)
  if (ecarts.length) ko('E1', `lib-trier-demande : ${ecarts.length} mot(s) d'escalade lus autrement que par sujetEscalade (${ecarts.slice(0, 2).join(' ; ')})`)
  // ── Le rejeu de l'Accueil sur les 40 demandes, et ses variantes
  const accueil = (enveloppes) => { const j = []; const r = executer(acc, copie(enveloppes), W, { modele: modeleJuge, politique: 'notee', journal: j }); return { r, j, s: r.sorties ?? [] } }
  const pilotes = (x) => x.j.filter((a) => a.appelant === 'presti-dep-accueil' && a.enfant === 'lib-executer').flatMap((a) => a.entrees).filter((y) => y.donnees?.cible === 'pilote').map((y) => ({ org: y.organisation_id, objet: y.donnees.charge.objet_id, type: y.donnees.charge.type_action }))
  const base = accueil(envs)
  if (base.r.erreur || base.s.length !== 2 || base.s.some((s) => s.statut !== 'ok')) { ko('A0', `rejeu de l'Accueil en erreur (${base.r.erreur ?? base.s.map((s) => s.statut + ' ' + (s.erreurs || [])[0]).join(' | ')})`); return e }
  const parId = new Map(demandes.map(({ v, d }) => [d.id, { v, d }]))
  const juger_pilotes = (x, quoi, lot = envs) => { const ici = new Map(lot.flatMap((v) => v.donnees.demandes.map((d) => [d.id, { v, d }]))); for (const p of pilotes(x)) { const { v, d } = ici.get(p.objet) ?? {}; if (!v) { ko('M3', `${quoi} : ligne du pilote pour une demande inconnue`); continue }
    const offrePilote = V.pilote[v.config.offre] === true && modeServi(v) === 'auto'
    if (v.organisation_id !== p.org) ko('M3', `${quoi} : ligne du pilote hors de son compte`)
    if (!offrePilote) ko('A1', `${quoi} : ${v.config.offre} fait partir seul ${d.id} (Studio prépare, l'artisan valide ; mode servi ${modeServi(v)})`)
    else if (!(v.config.pilote.drapeau && v.config.pilote.actif && v.config.pilote.types?.reponse_prospect === true)) ko('A2', `${quoi} : Signature fait partir ${d.id} alors que le type reponse_prospect n'est pas activé`)
    else if (K.OUTILS_JAMAIS_AUTO.includes(d.proposition?.outil) || K.OUTILS_JAMAIS_AUTO.includes(p.type) || !K.OUTILS_EXECUTABLES_PILOTE.includes(d.proposition?.outil)) ko('A3', `${quoi} : le geste ${d.proposition?.outil} (jamais automatique ou hors liste fermée) part seul`)
    else if (escCode.get(d.id)) ko('A4', `${quoi} : ${d.id} part seul sur un sujet d'escalade (« ${escCode.get(d.id)} ») : escalade = carte`) } }
  juger_pilotes(base, 'banc')
  if (!pilotes(base).length) ko('A0', 'le banc ne fait rien partir en Signature : les règles A ne prouvent rien')
  // Les effets restent dans leur compte ; chaque escalade du code est une escalade de l'Accueil, avec le même mot (E2).
  for (const [i, s] of base.s.entries()) {
    const v = envs[i], ids = new Set(v.donnees.demandes.map((d) => d.id))
    for (const x of s.effets_prevus) if (orgDe(x) !== v.organisation_id || (objetDe(x) && (x.objet_type ?? x.corps?.objet_type) === 'demande' && !ids.has(objetDe(x)))) ko('M3', `un effet ${x.effet} sort de son compte`)
    const vues = new Map(s.resultat.escalades.map((x) => [x.demande_id, x.mot]))
    for (const d of v.donnees.demandes) { if (s.resultat.spam.includes(d.id)) continue; const c = escCode.get(d.id) ?? null; if ((vues.get(d.id) ?? null) !== c) ko('E2', `l'Accueil lit l'escalade de ${d.id} autrement que le code (${vues.has(d.id) ? vues.get(d.id) : 'rien'} au lieu de ${c})`) }
    if (s.effets_faits.length) ko('G4', 'effet fait en simulation (banc)')
  }
  const varier = (f) => { const v = copie(envs); f(v); return v }
  const essayer = (f, quoi) => { const lot = varier(f); juger_pilotes(accueil(lot), quoi, lot) }
  essayer((v) => { for (const x of v) x.config.pilote.types = { reponse_prospect: false } }, 'variante « type non activé »')
  essayer((v) => { for (const x of v) x.config.mode_reponse = 'auto' }, 'variante « Studio règle le mode auto »')
  essayer((v) => { for (const x of v) x.donnees.demandes.forEach((d, i) => { if (d.proposition) d.proposition.outil = K.OUTILS_JAMAIS_AUTO[i % K.OUTILS_JAMAIS_AUTO.length] }) }, 'variante « gestes jamais automatiques »')
  // ── I : le même lot rejoué (clés du 1er passage connues) ne crée rien ; la même demande deux fois donne une seule action
  const createurs = (x) => x.s.flatMap((s) => s.effets_prevus).filter((y) => CREATEURS.has(y.effet))
  const c1 = createurs(base), cles = [...new Set(c1.map(cleDe))]
  if (!c1.length) ko('I1', 'le premier passage ne crée rien : le rejeu ne prouve rien')
  const c2 = createurs(accueil(varier((v) => { for (const x of v) x.donnees.cles_existantes = cles })))
  if (c2.length) ko('I1', `le même lot rejoué recrée ${c2.length} carte(s) ou ligne(s) du pilote`)
  const c3 = createurs(accueil(varier((v) => { for (const x of v) x.donnees.demandes = x.donnees.demandes.concat(copie(x.donnees.demandes)) }))).map(cleDe)
  if (c3.length !== new Set(c3).size) ko('I1', `la même demande deux fois dans un lot donne ${c3.length - new Set(c3).size} action(s) en double`)
  // ── Hors simulation : l'Accueil s'arrête avant tout appel
  { const j = []; const r = executer(acc, [{ ...copie(envs[0]), simulation: false }], W, { modele: modeleJuge, politique: 'notee', journal: j }); if (j.length || !/Hors simulation/.test(r.erreur ?? '')) ko('G4', `presti-dep-accueil : avec simulation à faux, ${j.length} appel(s) au lieu de l'arrêt`) }
  // ── M2 : deux comptes dans le Cerveau ; un événement d'un autre compte glissé dans une page n'est jamais routé ; un doublon une seule fois
  {
    const [A, B] = envs, compte = (v) => ({ artisan_id: v.organisation_id, palier: 'simulation', offre: v.config.offre, interrupteurs: { general: true, departements: Object.fromEntries(DEPS.map((d) => [d, true])) }, accueil: (({ interrupteur_general, interrupteur_departement, ...r }) => r)(v.config), empreintes_connues: [], cles_existantes: [] })
    const ev = (v, d) => ({ id: d.id, artisan_id: v.organisation_id, type: 'demande_recue', cle: 'demande:' + d.id.slice(24), demande: d })
    const etranger = ev(B, B.donnees.demandes[0])
    const pins = { "Lire l'interrupteur général (simulation : épinglé)": [{ interrupteur_general: true, organisation_systeme: '00000000-0000-4000-8000-000000000000', passage: '2026-11-07T2142', maintenant: A.donnees.maintenant }],
      'Lire les comptes (simulation : épinglé)': [compte(A), compte(B)],
      'Lire les événements non traités, page par page (simulation : épinglé)': [{ artisan_id: A.organisation_id, page: 0, suivante: null, evenements: [...A.donnees.demandes.slice(0, 4).map((d) => ev(A, d)), ev(A, A.donnees.demandes[0]), etranger] },
        { artisan_id: B.organisation_id, page: 0, suivante: null, evenements: B.donnees.demandes.slice(1, 4).map((d) => ev(B, d)) }] }
    const j = [], r = executer(cerveau, [{}], W, { pins, modele: modeleJuge, politique: 'notee', journal: j })
    const vers = j.filter((x) => x.appelant === 'presti-cerveau' && x.enfant === 'presti-dep-accueil').flatMap((x) => x.entrees)
    if (r.erreur || vers.length !== 2) ko('M2', `Cerveau à deux comptes : ${r.erreur ?? vers.length + ' enveloppe(s)'}`)
    for (const x of vers) { const ids = x.donnees.demandes.map((d) => d.id), propres = new Set((x.organisation_id === A.organisation_id ? A : B).donnees.demandes.map((d) => d.id))
      if (ids.some((i) => !propres.has(i))) ko('M2', `Cerveau : une demande d'un autre compte est routée vers ${x.organisation_id.slice(-4)} (multi-tenant)`)
      if (ids.length !== new Set(ids).size) ko('M2', 'Cerveau : le même événement routé deux fois')
      if (x.organisation_id !== (x.organisation_id === A.organisation_id ? A : B).organisation_id || x.simulation !== true) ko('M2', 'Cerveau : enveloppe hors compte ou hors simulation') }
    const coupe = copie(pins); coupe["Lire l'interrupteur général (simulation : épinglé)"][0].interrupteur_general = false
    const j2 = []; executer(cerveau, [{}], W, { pins: coupe, politique: 'notee', journal: j2 }); if (j2.length) ko('M2', `Cerveau, interrupteur général coupé : ${j2.length} appel(s)`)
  }
  // ── Q : la photo est décrite, jamais chiffrée
  {
    const env = (i) => ({ contrat: 'lib-lire-photo@1', organisation_id: envs[0].organisation_id, simulation: true, cle_idempotence: 'photo:juge:' + i, trace: { execution_parent: 'juge', declencheur: 'juge', tentative: 0 }, config: {}, donnees: { demande_id: '00000000-0000-4000-8000-00000000e00' + i, photo: { ref: 'juge-' + i + '.jpg', type_mime: 'image/jpeg' } } })
    const MAUVAIS = [{ ...MODELE_JUGE(), description: 'Exemple. Un évier ; environ 1 200 € à prévoir.' }, { ...MODELE_JUGE(), chiffrage: 450 }, { ...MODELE_JUGE(), description: 'Exemple. Deux jours de travail et 3 m2 de faïence.' }, { ...MODELE_JUGE(), cout: 'faible' }]
    const sorties = [MODELE_JUGE(), ...MAUVAIS]
    const r = executer(photo, sorties.map((_, i) => env(i)), W, { modele: (j) => sorties[Number(j.action_cle.split(':')[2])] })
    if (r.erreur || r.sorties[0]?.statut !== 'ok') ko('Q1', `lib-lire-photo : une description sobre n'est pas rendue (${r.erreur ?? r.sorties[0]?.erreurs})`)
    const passent = (r.sorties ?? []).slice(1).filter((s) => s.statut === 'ok' || s.resultat)
    if (passent.length) ko('Q1', `lib-lire-photo : ${passent.length} description(s) chiffrée(s) ou hors schéma passent`)
  }
  // ── K : les six squelettes ne font rien, et le disent
  for (const d of DEPS.slice(1)) {
    const w = M.W[`presti-dep-${d}`]; if (!w) continue
    const r = executer(w, [{ contrat: `presti-dep-${d}@1`, organisation_id: envs[0].organisation_id, simulation: true, cle_idempotence: 'juge:' + d, trace: { execution_parent: 'juge', declencheur: 'juge', tentative: 0 }, config: {}, donnees: { evenements: [{ type: 'juge' }] } }], W, {})
    const s = r.sorties?.[0], corps = w.nodes.filter((n) => n.type === T.code && !["Contrat d'entrée", 'Contrat de sortie'].includes(n.name))
    if (r.erreur || !s || s.statut !== 'rien_a_faire' || s.resultat?.etat !== 'non_branche' || s.effets_prevus.length || corps.length !== 1 || w.nodes.some((n) => n.type === T.appel)) ko('K1', `presti-dep-${d} : le squelette doit rendre « non_branche » et rien d'autre`)
  }
  // ── N : chaque essai n8n, rejoué sur l'export, rend la sortie de n8n ; P : ce qui est épinglé à la place d'un appel est l'export rejoué
  if (M.essais.filter((x) => !x.sonde).length < 6) ko('N1', `${M.essais.length} essai(s) n8n : six au moins attendus`)
  for (const x of M.essais) {
    const w = M.W[x.workflow]; if (!w) { ko('N1', `essai ${x.execution} : export ${x.workflow} absent`); continue }
    if (x.sonde) { // n8n refuse les appels à trois étages (voir rapatrier.mjs, SONDES) : on n'y vérifie que le fail-closed
      const t = JSON.stringify(x.sorties ?? [])
      if (!/"(?:statut|accueil)":"erreur"/.test(t) || /mettre_en_file_pilote|"cartes":[1-9]/.test(t) || (x.sorties ?? []).some((s) => Number(s.effets_faits ?? 0) > 0 || (Array.isArray(s.effets_faits) && s.effets_faits.length))) ko('N1', `sonde ${x.execution} : le refus de n8n n'est pas fail-closed`)
      continue }
    const r = executer(w, x.entrees, W, { pins: x.epingles, modele: modeleJuge, politique: 'stricte' })
    if (x.erreur) { if (!r.erreur || !r.erreur.includes(x.erreur)) ko('N1', `essai ${x.execution} : n8n s'arrête (« ${x.erreur.slice(0, 50)} »), le rejeu non (${r.erreur ?? 'aucune erreur'})`) }
    else if (r.erreur) ko('N1', `essai ${x.execution} : le rejeu échoue (${r.erreur})`)
    else if (!egal(finDe(w, r), x.sorties)) ko('N1', `essai ${x.execution} (${x.workflow}) : la sortie rejouée diffère de celle de n8n`)
    for (const s of x.sorties ?? []) if ((Array.isArray(s.effets_faits) && s.effets_faits.length) || (typeof s.effets_faits === 'number' && s.effets_faits > 0)) ko('G4', `essai ${x.execution} : effet fait en simulation`)
    const appels = w.nodes.filter((n) => n.type === T.appel && n.name in (x.epingles ?? {}))
    if (!appels.length) continue
    const sans = Object.fromEntries(Object.entries(x.epingles).filter(([n]) => !appels.some((a) => a.name === n)))
    const r2 = executer(w, x.entrees, W, { pins: sans, modele: (j) => { const p = Object.values(x.epingles).flat(); void p; return MODELE_JUGE(j) }, politique: 'notee' })
    for (const a of appels) {
      if (nomDe(a.parameters.workflowId.value) === 'lib-lire-photo') continue // sa sortie dépend du modèle épinglé, comparée par l'essai de lib-lire-photo lui-même
      const vrai = r2.par[a.name]?.[0], pin = x.epingles[a.name]
      if (!vrai || !egal(vrai, pin)) ko('P1', `essai ${x.execution} / ${a.name} : la sortie épinglée n'est pas celle que rend ${nomDe(a.parameters.workflowId.value)} rejoué`)
    }
  }
  return e
}

// ─── Les mutants : chacun doit faire rougir sa règle ──────────────────────────────────────────────────────────────────────────────
const n_ = (M, wf, nom) => { const n = noeud(M.W[wf], nom); if (!n) throw new Error(`nœud absent : ${wf} / ${nom}`); return n }
const remplacer = (M, wf, nom, de, vers) => { const n = n_(M, wf, nom); if (!n.parameters.jsCode.includes(de)) throw new Error(`mutant inapplicable : ${wf} / ${nom}`); n.parameters.jsCode = n.parameters.jsCode.split(de).join(vers) }
const CIBLE = "const cible = r.resultat.action === 'pilote' ? 'pilote' : 'carte';"
export const MUTANTS = [
  ['Studio qui envoie (le chef décide lui-même du départ seul)', (M) => { remplacer(M, 'presti-dep-accueil', 'Préparer la porte', CIBLE, "const cible = 'pilote';"); remplacer(M, 'presti-dep-accueil', "Préparer l'exécution", 'niveau_max: auto(e) ? 3 : 2', 'niveau_max: 3') }, /^A1 /],
  ['Signature : un type non activé qui part', (M) => remplacer(M, 'presti-dep-accueil', 'Préparer la décision', 'pilote: e.config.pilote,', 'pilote: Object.assign({}, e.config.pilote, { types: { reponse_prospect: true } }),'), /^A2 /],
  ['un geste de OUTILS_JAMAIS_AUTO qui part (porte ôtée)', (M) => { remplacer(M, 'presti-dep-accueil', 'Préparer la porte', CIBLE, "const cible = r.resultat.action === 'pilote' || r.resultat.motif === 'jamais_auto' ? 'pilote' : 'carte';"); remplacer(M, 'presti-dep-accueil', "Préparer l'exécution", " || p.resultat.verdict !== 'passe'", ''); remplacer(M, 'presti-dep-accueil', "Préparer l'exécution", 'cible: p.resultat.cible,', 'cible: a.cible,') }, /^A3 /],
  ['une escalade qui part seule (le tri ignoré)', (M) => { remplacer(M, 'presti-dep-accueil', 'Préparer la décision', 'escalade: bon(t) ? t.resultat.escalade : true', 'escalade: false'); remplacer(M, 'presti-dep-accueil', 'Préparer la porte', "esc = !bon(t) || t.resultat.escalade === true", 'esc = false') }, /^A4 /],
  ['le même événement rejoué deux fois donne deux cartes', (M) => remplacer(M, 'presti-dep-accueil', "Préparer l'exécution", 'cles_existantes: e.donnees.cles_existantes', 'cles_existantes: []'), /^I1 le même lot rejoué/],
  ['une requête sans filtre artisan_id', (M) => { const n = n_(M, 'presti-cerveau', 'Lire les événements non traités, page par page (simulation : épinglé)'); n.notes = n.notes.replace('&artisan_id=eq.<compte>', '') }, /^M1 .*sans filtre artisan_id/],
  ['un événement d’un autre compte routé (contrôle ôté)', (M) => remplacer(M, 'presti-cerveau', 'Aiguiller', 'if (!ev || ev.artisan_id !== p.artisan_id)', 'if (!ev)'), /^M2 Cerveau : une demande d'un autre compte/],
  ['un mot d’escalade ignoré (copie figée amputée)', (M) => remplacer(M, 'lib-trier-demande', 'Trier par règles', '"avocat",', ''), /^E1 /],
  ['un montant calculé dans n8n', (M) => remplacer(M, 'presti-dep-accueil', 'Assembler', 'const vus = new Set();', 'const vus = new Set(); const montant_centimes = r0.demandes_recues * 100;'), /^G6 /],
  ['le Cerveau qui appelle un modèle', (M) => { M.W['presti-cerveau'].nodes.push({ name: 'Classer (modèle)', type: '@n8n/n8n-nodes-langchain.agent', typeVersion: 3.1, position: [0, 0], parameters: {} }) }, /^G2 presti-cerveau \/ Classer/],
  ['le Cerveau qui calcule', (M) => remplacer(M, 'presti-cerveau', 'Aiguiller', 'const s = [];', 'const s = []; const poids = ordre.length * 2;'), /^G2 presti-cerveau \/ Aiguiller : arithmétique/],
  ['un workflow actif', (M) => { M.W['presti-cerveau'].active = true }, /^S1 presti-cerveau : actif/],
  ['un chef appelable par tous', (M) => { M.W['presti-dep-accueil'].settings.callerPolicy = 'any' }, /^S2 presti-dep-accueil : politique/],
  ['la porte « simulation » contournée', (M) => { M.W['presti-dep-accueil'].connections['Entrée conforme ?'].main[0] = [{ node: 'Préparer le tri', type: 'main', index: 0 }] }, /^G4 presti-dep-accueil/],
  ['une photo chiffrée qui passe', (M) => remplacer(M, 'lib-lire-photo', 'Revalider la sortie du modèle', "  if ([o.description].concat(o.elements).some((t) => CHIFFRE.test(t))) return 'la photo est chiffrée : interdit';\n", ''), /^Q1 lib-lire-photo : \d description/],
  ['un squelette qui agit', (M) => remplacer(M, 'presti-dep-devis', 'Non branché', "statut: 'rien_a_faire'", "statut: 'ok'"), /^K1 presti-dep-devis/],
  ['un contrat versionné retouché', (M) => { M.accueil.entree.donnees.properties.demandes.maxItems = 500 }, /^C1 presti-dep-accueil/],
  ['une sortie n8n retouchée après coup', (M) => { M.essais.find((x) => x.workflow === 'presti-dep-accueil' && x.sorties).sorties[0].resultat.cartes.push('h:faux') }, /^N1 essai \d+ \(presti-dep-accueil\)/],
  ['une sortie épinglée retouchée', (M) => { const x = M.essais.find((y) => y.workflow === 'presti-dep-accueil' && y.epingles?.['Appeler lib-decider']); x.epingles['Appeler lib-decider'][0].resultat.motif = 'pilote' }, /^P1 essai \d+ \/ Appeler lib-decider/],
]

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = Date.now()
  const M = chargerMonde()
  const K = lireCode({ messages: [], plans: [] })
  const erreurs = juger(M, K)
  if (erreurs.length) { console.error('✗ cerveau et accueil :\n  ' + erreurs.join('\n  ')); process.exit(1) }
  console.log(`✓ cerveau et accueil (${NOMS.length} exports, ${M.essais.length} essais n8n rejoués) : S, C, G2, G4, G6, M1 à M3, E1, E2, A1 à A4, I1, Q1, K1, N1, P1, H1, H2 tenus`)
  let rouges = 0
  for (const [titre, muter, attendu] of MUTANTS) {
    const m = copie(M); let res
    try { muter(m); res = juger(m, K) } catch (err) { res = [`mutant inapplicable : ${err.message}`] }
    const ok = res.some((x) => attendu.test(x))
    if (ok) rouges++
    console.log(`  ${ok ? '✓' : '✗'} « ${titre} » → ${ok ? res.find((x) => attendu.test(x)).slice(0, 160) : 'RESTÉ VERT ou mauvaise raison : ' + (res[0] ?? 'aucune erreur')}`)
  }
  console.log(`cerveau-accueil-n8n-qa : ${MUTANTS.length} mutants, ${rouges} rouges (${Math.round((Date.now() - t0) / 1000)} s)`)
  if (rouges !== MUTANTS.length) process.exit(1)
  console.log('OK')
}
