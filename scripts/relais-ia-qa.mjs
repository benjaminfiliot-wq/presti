#!/usr/bin/env node
// scripts/relais-ia-qa.mjs — le juge du relais d'IA des agents (lib/agents/relais.ts, ordre de Benj du 05/10/2026).
//
//   node scripts/relais-ia-qa.mjs [--temoin] [--garder]
//     (sans option)  le TÉMOIN (le dépôt tel quel : RI-1 à RI-15 verts) puis chaque SABOTAGE sur une COPIE minimale : chacun doit rendre
//                    rouge exactement les critères annoncés (et laisser verts ceux qu'un second verrou protège). Rien n'est jamais
//                    muté dans le dépôt en place : les copies vivent sous .orchestre/travail/relais-ia/ et sont supprimées (sauf --garder).
//     --temoin       seulement le témoin et la lecture du source.
//
// Les scénarios (scripts/fixtures/relais-ia/executer.mjs) n'utilisent que des DOUBLURES : un faux lanceur de Codex, un faux `fetch`, une
// horloge, un dossier de mémoire jetable ; les coordonnées et la clé sont des sentinelles inventées. L'essai réel de chaque moteur est
// scripts/agents/relais-essai.mjs (sur l'usine). Codes : 0 vert, 1 un critère rouge ou un sabotage non attrapé, 2 préalable absent.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..')
const EXECUTERS = ['executer.mjs', 'executer-chef.mjs'].map((f) => path.join(ICI, 'fixtures', 'relais-ia', f))
const LOADER = path.join(ICI, 'ts-loader.mjs')
const TRAVAIL = path.join(DEPOT, '.orchestre', 'travail', 'relais-ia')
const args = process.argv.slice(2)
for (const a of args) if (!['--temoin', '--garder'].includes(a) && !/^--depuis=\d+$/.test(a)) { console.error(`✗ option inconnue : ${a}`); process.exit(2) }
const SEUL_TEMOIN = args.includes('--temoin')
const GARDER = args.includes('--garder')
const DEPUIS = Number((args.find((a) => a.startsWith('--depuis=')) ?? '').slice('--depuis='.length)) || 1 // pour développer le catalogue : ne rejoue que les sabotages n° DEPUIS et suivants (le rapport complet se lance sans option)

const lire = (f) => fs.readFileSync(f, 'utf8')
const SOURCES = ['lib/agents/relais.ts', 'lib/agents/llm.ts', 'lib/agents/moteurs.ts', 'lib/agents/lecons.ts', 'lib/agents/bus.ts', 'lib/savoir/index.ts', 'scripts/usine/relais-chef.mjs', 'scripts/usine/chef-modele.mjs', 'scripts/chef/commun.mjs', 'scripts/chef/reunion-controle.mjs', 'scripts/chef/reunion.mjs', 'scripts/instantane-quotidien.mjs', 'scripts/fixtures/relais-ia/faux-codex-chef.mjs']
for (const f of SOURCES) if (!fs.existsSync(path.join(DEPOT, f))) { console.error(`✗ préalable absent : ${f}`); process.exit(2) }

/** Une racine minimale (de quoi résoudre « @/ ») : les cinq modules du relais, un stub de la base, rien d'autre. */
function copieMinimale(nom) {
  const racine = path.join(TRAVAIL, nom)
  fs.rmSync(racine, { recursive: true, force: true })
  for (const f of SOURCES) { fs.mkdirSync(path.dirname(path.join(racine, f)), { recursive: true }); fs.copyFileSync(path.join(DEPOT, f), path.join(racine, f)) }
  fs.writeFileSync(path.join(racine, 'package.json'), '{"name":"copie-relais-ia","type":"module"}')
  fs.writeFileSync(path.join(racine, 'tsconfig.json'), '{}')
  fs.mkdirSync(path.join(racine, 'app'), { recursive: true })
  fs.writeFileSync(path.join(racine, 'app', '.gardien'), '')
  fs.writeFileSync(path.join(racine, 'lib', 'supabaseAdmin.ts'), 'export const supabaseAdmin = {}\n')
  return racine
}

/** Remplace UNE occurrence exacte (CRLF toléré) ; sinon le juge s'arrête : une ancre qui ne se trouve plus ne prouve rien. */
function muter(racine, fichier, avant, apres) {
  const f = path.join(racine, fichier)
  const brut = lire(f)
  const crlf = brut.includes('\r\n')
  let t = brut.replace(/\r\n/g, '\n')
  const n = t.split(avant).length - 1
  if (n !== 1) { console.error(`✗ ancre ${n ? 'multiple' : 'absente'} dans ${fichier} : ${JSON.stringify(avant.slice(0, 90))}`); process.exit(2) }
  t = t.replace(avant, () => apres)
  fs.writeFileSync(f, crlf ? t.replace(/\n/g, '\r\n') : t)
}

function lancerEnfant(racine) {
  const tous = []
  for (const executer of EXECUTERS) {
    const r = spawnSync(process.execPath, ['--experimental-strip-types', '--import', pathToFileURL(LOADER).href, executer, racine], { cwd: racine, encoding: 'utf8', timeout: 180_000, windowsHide: true, maxBuffer: 1 << 24 })
    const m = /@@RESULTATS@@(.*)/.exec(r.stdout || '')
    if (!m) return { erreur: `${path.basename(executer)} n'a rien rendu (code ${r.status}) : ${String(r.stderr || r.stdout).replace(/\s+/g, ' ').slice(-500)}` }
    tous.push(...JSON.parse(m[1]).resultats)
  }
  return { resultats: tous }
}

let rouge = false
const lignes = []
const dire = (s) => { lignes.push(s); console.log(s) }

// ── lecture du source : aucun hôte distant, aucun shell, aucune clé de modèle, aucun process.exit ─────────────────────────
function lectureDuSource() {
  const e = []
  const s = lire(path.join(DEPOT, 'lib/agents/relais.ts'))
  for (const url of s.match(/https?:\/\/[^\s'"`)]+/g) || []) if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) e.push(`URL non locale : ${url}`)
  for (const h of ['ollama.com', 'api.groq.com', 'openai.com', 'anthropic.com', 'googleapis.com', 'mistral.ai']) if (s.includes(h)) e.push(`cite ${h}`)
  if (/shell\s*:\s*true/.test(s)) e.push('spawn avec shell')
  if (/process\.exit\(/.test(s)) e.push('process.exit (assertion libuv de Node 24 sous Windows)')
  if (/ANTHROPIC_|OPENAI_API|sk-ant-/.test(s)) e.push('une clé de modèle nommée')
  for (const m of s.matchAll(/\bimport\s+[^;]*?from\s*['"]([^'"]+)['"]/g)) if (!m[1].startsWith('node:') && !/^\.\/(moteurs|llm|lecons)$/.test(m[1])) e.push(`import inattendu : ${m[1]}`)
  if (/console\.(log|info|warn|error)/.test(s)) e.push('console.* dans le relais (une trace passe par le journal)')
  return e
}

function afficher(titre, res) {
  if (res.erreur) { dire(`FAIL ${titre} — ${res.erreur}`); rouge = true; return null }
  for (const r of res.resultats) { dire(`${r.ok ? 'PASS' : 'FAIL'} ${titre === 'témoin' ? '' : `[${titre}] `}${r.id} — ${r.detail}`); if (!r.ok && titre === 'témoin') rouge = true }
  return res
}

fs.mkdirSync(TRAVAIL, { recursive: true })
const src = lectureDuSource()
dire(src.length ? `FAIL RI-S — source : ${src.join(' ; ')}` : 'PASS RI-S — source du relais : aucun hôte distant, aucun shell, aucune clé de modèle, imports bornés')
if (src.length) rouge = true
const temoin = afficher('témoin', lancerEnfant(DEPOT))

// ── les sabotages ────────────────────────────────────────────────────────────────────────────────────────────────────
// { nom, mutations: [[fichier, avant, apres]…], rouges: [critères qui DOIVENT échouer], verts: [critères qui DOIVENT rester verts] }
const SABOTAGES = [
  { nom: 'bascule oubliée (un moteur à bout arrête tout au lieu de passer au suivant)',
    mutations: [['lib/agents/relais.ts', '      derniere = new Error(`${m} : ${r.raison}`)\n', '      throw new Error(`${m} : ${r.raison}`)\n']],
    rouges: ['RI-3', 'RI-5'] },
  { nom: 'donnée de prospect envoyée vers un moteur gratuit (chaîne ET garde ouvertes)',
    mutations: [
      ['lib/agents/relais.ts', "prospect: Object.freeze(['codex', 'ollama_8b', 'ollama_4b'] as IdMoteur[]),", "prospect: Object.freeze(['codex', 'freellmapi', 'ollama_cloud', 'ollama_8b', 'ollama_4b'] as IdMoteur[]),"],
      ['lib/agents/relais.ts', "new Set<IdMoteur>(['codex', 'ollama_8b', 'ollama_4b'])", "new Set<IdMoteur>(['codex', 'freellmapi', 'ollama_cloud', 'ollama_8b', 'ollama_4b'])"],
    ],
    rouges: ['RI-1', 'RI-7'] },
  { nom: 'défense en profondeur : la chaîne seule ouverte, la garde tient (aucune donnée ne part, mais la table est signalée)',
    mutations: [['lib/agents/relais.ts', "prospect: Object.freeze(['codex', 'ollama_8b', 'ollama_4b'] as IdMoteur[]),", "prospect: Object.freeze(['codex', 'freellmapi', 'ollama_cloud', 'ollama_8b', 'ollama_4b'] as IdMoteur[]),"]],
    rouges: ['RI-1'], verts: ['RI-6', 'RI-7'] },
  { nom: 'quota HTTP non détecté (429 pris pour une panne)',
    mutations: [['lib/agents/relais.ts', 'if (statut === 429 || /usage limit|rate.?limit|quota|too many requests|exhausted/i.test(t) && statut >= 400) {', 'if (false) {']],
    rouges: ['RI-5', 'RI-10'] },
  { nom: 'quota de Codex non détecté (la sortie du lanceur n\'est pas lue)',
    mutations: [['lib/agents/llm.ts', 'const sortieErreur = code !== 0 ? `${stderr}\\n${stdout}` : stderr', 'const sortieErreur = stderr']],
    rouges: ['RI-3', 'RI-4'] },
  { nom: 'mémoire des moteurs à bout jamais écrite (chaque processus retente Codex)',
    mutations: [['lib/agents/relais.ts', 'magasin.ecrire(courant)', 'void courant']],
    rouges: ['RI-3', 'RI-9'] },
  { nom: 'Codex mis de côté sans borne (il ne reviendrait pas tout seul)',
    mutations: [['lib/agents/relais.ts', 'Math.min(Math.max(jusquaMs ?? 0, maintenant + 15 * MINUTE), maintenant + 6 * HEURE)', 'Math.max(jusquaMs ?? 0, maintenant + 15 * MINUTE)']],
    rouges: ['RI-3', 'RI-9', 'RI-10'] },
  { nom: 'coordonnées du prospect envoyées en clair au local',
    mutations: [['lib/agents/relais.ts', 'corps: emballerDonnees(retirerCoordonnees(donnees))', 'corps: emballerDonnees(donnees)']],
    rouges: ['RI-7'] },
  { nom: 'Facteur replié sur un autre moteur (son étalonnage ne vaut que pour Codex)',
    mutations: [['lib/agents/relais.ts', "new Set(['facteur'])", 'new Set([])']],
    rouges: ['RI-1', 'RI-8'] },
  { nom: 'drapeau du « oui » daté ignoré (le local reçoit du prospect sans l\'accord de Benj)',
    mutations: [['lib/agents/relais.ts', "return c.ollama !== null && (nature !== 'prospect' || drapeau)", 'return c.ollama !== null']],
    rouges: ['RI-6', 'RI-7'] },
  { nom: 'réponse routée vers Groq acceptée',
    mutations: [['lib/agents/relais.ts', "if (fournisseurReel && /^groq/i.test(fournisseurReel)) throw new EchecRelais('refuse', 'fournisseur exclu')", '']],
    rouges: ['RI-11'] },
  { nom: 'clé de freellmapi jamais envoyée',
    mutations: [['lib/agents/relais.ts', 'headers: o.cle ? {', 'headers: false ? {']],
    rouges: ['RI-5'] },
  // ── le relais du chef ──
  { nom: 'chef : donnée de prospect vers le gratuit (les deux verrous ouverts)',
    mutations: [
      ['scripts/usine/relais-chef.mjs', "if (nature === 'prospect') return drapeau ? chaine.filter((m) => m.local) : []", "if (nature === 'prospect') return [...chaine]"],
      ['scripts/usine/relais-chef.mjs', "if (nature === 'prospect' && (m.gratuit || (!m.local && m.id !== 'codex'))) return null", ''],
    ],
    rouges: ['RC-4'] },
  { nom: 'chef : bascule oubliée (le premier échec de Codex arrête le cycle)',
    mutations: [['scripts/usine/relais-chef.mjs', "      if (x?.fait) return x.resultat\n    }\n    // Tous à bout", "      if (x?.fait) return x.resultat\n      if (x) return derniere\n    }\n    // Tous à bout"]],
    rouges: ['RC-1', 'RC-3'] },
  { nom: 'chef : la file IA des prospects reçoit des secours',
    mutations: [['scripts/usine/chef-modele.mjs', 'return !estFileIA() && (!opts.codex || opts.relais === \'oui\')', "return (!opts.codex || opts.relais === 'oui')"]],
    rouges: ['RC-7'] },
  { nom: 'chef : « usage limit » de Codex non reconnu',
    mutations: [['scripts/usine/relais-chef.mjs', 'if (/usage limit/i.test(t)) {', 'if (false) {']],
    rouges: ['RC-2', 'RC-6'] },
  { nom: 'chef : un routeur libre sorti en code 0 sans écrire le plan passe pour un succès',
    mutations: [['scripts/usine/relais-chef.mjs', "const fait = r.code === 0 && (typeof opts.verifier !== 'function' || opts.verifier() === true)", 'const fait = r.code === 0']],
    rouges: ['RC-8', 'RC-7'] },
  { nom: "chef : l'attente de la reprise d'un moteur libre n'a jamais lieu",
    mutations: [['scripts/usine/relais-chef.mjs', 'await attendre(attente)', '']],
    rouges: ['RC-9'] },
  { nom: "chef : l'appel direct lit un fichier hors des dossiers permis (fuite d'un fichier du compte)",
    mutations: [['scripts/usine/relais-chef.mjs', ' || !sousUnPermis(complet)) continue', ') continue']],
    rouges: ['RC-10'] },
  { nom: "chef : le validateur du plan n'est pas branché (un plan refusé en bloc par le cycle serait écrit)",
    mutations: [['scripts/usine/chef-modele.mjs', "if (cycle && /plan/.test(path.basename(sortiePlan))) valider = (objet) => validerPlan(objet, cycle)", '']],
    rouges: ['RC-7'] },
  { nom: "chef : les écarts du validateur ne sont pas rendus au modèle (pas de correction)",
    mutations: [['scripts/usine/relais-chef.mjs', 'if (!ecarts.length) { objet = essai; break }', '{ objet = essai; break }']],
    rouges: ['RC-10', 'RC-7'] },
  { nom: "chef : la clé de freellmapi part vers Ollama",
    mutations: [['scripts/usine/relais-chef.mjs', "if (moteur.api !== 'ollama' && cle) entetes.authorization", 'if (cle) entetes.authorization']],
    rouges: ['RC-10'] },
  { nom: 'chef : moteurs à bout jamais mémorisés',
    mutations: [['scripts/usine/relais-chef.mjs', "      etat.ecrire(courant)\n      dire({ moteur: m.id, modele: m.modele ?? 'codex', issue: 'bascule', raison: c.raison", "      dire({ moteur: m.id, modele: m.modele ?? 'codex', issue: 'bascule', raison: c.raison"]],
    rouges: ['RC-2'] },
  // ── la réunion d'équipage (05/10) : mêmes aides que le cycle quand Codex est à bout ──
  { nom: "réunion : le validateur du compte rendu n'est pas branché (un compte rendu refusé en bloc par reunion.mjs serait écrit)",
    mutations: [['scripts/usine/chef-modele.mjs', '      valider = (objet) => RC.validerReunion(objet, { jour: RC.jourDeParis(maintenant()), maintenant: maintenant(), interdits })\n', '']],
    rouges: ['RC-12'] },
  { nom: "réunion : la réduction déterministe n'est pas branchée dans le relais",
    mutations: [['scripts/usine/chef-modele.mjs', '      reduire = (objet) => RC.reduireReunion(objet, { jour: RC.jourDeParis(maintenant()), maintenant: maintenant(), interdits })\n', '']],
    rouges: ['RC-12'] },
  { nom: 'réunion : les limites exactes et l\'exemple ne sont pas dits au modèle',
    mutations: [['scripts/usine/chef-modele.mjs', 'complement = RC.limitesReunion(jour, Date.now())', 'complement = null']],
    rouges: ['RC-12'] },
  { nom: 'réunion : le fichier de sortie « -o » n\'est pas vérifié (un moteur libre en prose passe pour un succès, le suivant ne prend jamais la demande)',
    mutations: [['scripts/usine/chef-modele.mjs', '      if (!attendus.length && dernier) attendus.push(dernier)\n', '']],
    rouges: ['RC-12'] },
  { nom: "réunion : appelDirect n'essaie jamais la réduction",
    mutations: [['scripts/usine/relais-chef.mjs', "const r2 = typeof reduire === 'function' ? reduire(essai) : null", 'const r2 = null']],
    rouges: ['RC-11', 'RC-12'] },
  { nom: "réunion : la réduction n'est pas revalidée par le validateur avant d'être écrite",
    mutations: [['scripts/usine/relais-chef.mjs', "if (r2 && r2.plan && !(typeof valider === 'function' && valider(r2.plan).length)) {", 'if (r2 && r2.plan) {']],
    rouges: ['RC-11'] },
  { nom: 'réunion : le relais ne dit plus que le compte rendu a été raccourci',
    mutations: [['scripts/usine/relais-chef.mjs', ", ...(Array.isArray(r.raccourci) ? { note: 'compte rendu raccourci par le relais', modifications: r.raccourci.slice(0, 8) } : {}) })", ' })']],
    rouges: ['RC-13', 'RC-12'] },
  { nom: 'réunion : une ligne sans limite de mot est coupée au milieu d\'un mot',
    mutations: [['scripts/chef/reunion-controle.mjs', 'if (k < Math.floor(LIGNE_MAX / 2)) return null', 'if (false) return null']],
    rouges: ['RC-11'] },
  { nom: "réunion : la réduction rend un compte rendu absurde (une ligne de deux mots, des lignes en double, un gabarit)",
    mutations: [['scripts/chef/reunion-controle.mjs', 'if (validerReunion(p, ctx).length || !aUnSens(p)) return null', 'if (validerReunion(p, ctx).length) return null']],
    rouges: ['RC-11'] },
  { nom: "réunion : la réduction rend un compte rendu que le validateur refuse encore (adresse dans une ligne)",
    mutations: [['scripts/chef/reunion-controle.mjs', 'if (validerReunion(p, ctx).length || !aUnSens(p)) return null', 'if (!aUnSens(p)) return null']],
    rouges: ['RC-11'] },
  { nom: 'réunion : validerReunion laisse passer une ligne de 141 signes (et les libellés de 114 signes du 05/10)',
    mutations: [['scripts/chef/reunion-controle.mjs', 'if (signes(t) > max) e.push(', 'if (signes(t) > max + 1000) e.push(']],
    rouges: ['RC-11'] },
  { nom: 'réunion : cinq idées ne sont pas ramenées à trois (quatre sont gardées)',
    mutations: [['scripts/chef/reunion-controle.mjs', 'p.idees = p.idees.slice(0, IDEES_MAX)', 'p.idees = p.idees.slice(0, 4)']],
    rouges: ['RC-11'] },
  { nom: "réunion : l'exemple donné au modèle n'est pas valide (option par défaut « lancer »)",
    mutations: [['scripts/chef/reunion-controle.mjs', "option_defaut: 'reporter', portee: 'aucune', montant_cents: 0, echeance,", "option_defaut: 'lancer', portee: 'aucune', montant_cents: 0, echeance,"]],
    rouges: ['RC-11'] },
  { nom: 'réunion : reunion.mjs ne donne pas au relais le temps de la réunion moins 45 s',
    mutations: [['scripts/chef/reunion.mjs', 'const delaiRelais = /presti-chef-modele', 'const delaiRelais = true ? [] : /presti-chef-modele']],
    rouges: ['RC-13'] },
  { nom: 'réunion : reunion.mjs ne consigne plus le moteur de secours',
    mutations: [['scripts/chef/reunion.mjs', 'if (secours) noter(', 'if (false) noter(']],
    rouges: ['RC-13'] },
]

if (!SEUL_TEMOIN && temoin) {
  let n = 0
  for (const s of SABOTAGES) {
    n++
    if (n < DEPUIS) continue
    const racine = copieMinimale(`s${n}`)
    for (const [f, a, b] of s.mutations) muter(racine, f, a, b)
    const res = lancerEnfant(racine)
    if (res.erreur) { dire(`FAIL sabotage ${n} (${s.nom}) — ${res.erreur}`); rouge = true; continue }
    const rougesVus = res.resultats.filter((r) => !r.ok).map((r) => r.id)
    const manquants = s.rouges.filter((id) => !rougesVus.includes(id))
    const faux = (s.verts ?? []).filter((id) => rougesVus.includes(id))
    if (manquants.length || faux.length) {
      rouge = true
      dire(`FAIL sabotage ${n} (${s.nom}) — ${manquants.length ? `non attrapé par ${manquants.join(', ')}` : ''}${faux.length ? ` ; ${faux.join(', ')} devaient rester verts` : ''} (rouges vus : ${rougesVus.join(', ') || 'aucun'})`)
    } else dire(`PASS sabotage ${n} — ${s.nom} : attrapé par ${rougesVus.join(', ')}`)
    if (!GARDER) fs.rmSync(racine, { recursive: true, force: true })
  }
}
if (!GARDER) { try { fs.rmSync(TRAVAIL, { recursive: true, force: true }) } catch { /* déjà parti */ } }
dire(`relais-ia-qa : ${rouge ? 'FAIL' : 'PASS'}`)
process.exitCode = rouge ? 1 : 0
