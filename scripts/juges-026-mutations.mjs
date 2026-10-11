#!/usr/bin/env node
// scripts/juges-026-mutations.mjs — 026-161 : les mutations des juges qu'aucune fiche de domaine ne contre-vérifie
// (agents-llm-qa, ops-acquisition-qa, constructeur-ferme-qa, parcours-commande-qa, webhook-muet-qa, pont-orchestre-qa,
// prospects-entrant-qa, juges-026-preuve), puis la couverture d'ensemble : chaque juge de la série a-t-il une faute attrapée
// dans un rapport mutations.json ?
//
// Pour chaque juge : le TÉMOIN (copie intacte, code 0 exigé), puis chaque faute plantée par UN remplacement de texte exact
// dans une COPIE du dépôt (code ≠ 0 exigé, avec le critère nommé). Rien n'est jamais muté dans le dépôt en place : les
// copies vivent sous .orchestre/travail/026-161/, les juges sont lancés avec --racine=<copie> depuis le dépôt réel.
// Si une mutation n'est pas attrapée, le juge N'EST PAS corrigé : la mutation est écrite en tête de mutations.md et le
// script sort en code 1.
//
//   node scripts/juges-026-mutations.mjs [--pool=2] [--seul=<critère|juge>] [--ancres] [--garder]
//     --ancres  ne vérifie que les remplacements (avant présent une seule fois), sans lancer de juge (jamais un verdict)
//     --pool=N  N copies et N juges en parallèle (défaut 3 ; les juges qui ouvrent un serveur passent à part, un à la fois)
//     --seul=…  ne rejoue que les mutations dont le critère ou le juge contient ce texte (sortie 3 : jamais un verdict)
// Écrit .orchestre/preuves/026-161/mutations.json (lu par le méta-juge) et mutations.md.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ID = '026-161'
const TRAVAIL = path.join(ROOT, '.orchestre', 'travail', ID)
const PREUVES = path.join(ROOT, '.orchestre', 'preuves', ID)
const args = process.argv.slice(2)
const drapeau = (n) => args.includes(`--${n}`)
const valeur = (n) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3)
for (const a of args) if (!/^--(ancres|garder|pool=\d+|seul=.+)$/.test(a)) { console.error(`✗ option inconnue : ${a}`); process.exit(2) }
const ANCRES = drapeau('ancres'), GARDER = drapeau('garder'), SEUL = valeur('seul')
const POOL = Math.max(1, Math.min(4, Number(valeur('pool') || 3)))
const DELAI_JUGE_MS = 12 * 60_000

const lire = (f) => fs.readFileSync(f, 'utf8')
const ecrire = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t) }
const nl = (t, crlf) => (crlf ? t.replace(/(?<!\r)\n/g, '\r\n') : t)
const court = (s, n = 160) => { const t = String(s).replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }

// ── La table des mutations ───────────────────────────────────────────────────────────────────────────────────────
// Un juge = { id, chemin, base : arguments fixes (la copie s'écrit {racine}), serveur : ouvre un port, depuisCopie : lancé depuis la copie (cwd = copie, arguments relatifs) }
const LOADER = ['--import', './scripts/ts-loader.mjs']
const JUGES = {
  // agents-llm-qa : l'enfant executer.mjs résout @/lib/… depuis SON dépôt (celui du juge), pas depuis --racine : un juge qui ne voit pas la copie ne verrait aucune faute. Lancé depuis la copie.
  'agents-llm': { chemin: 'scripts/agents-llm-qa.mjs', depuisCopie: true, base: ['scripts/agents-llm-qa.mjs'] },
  'ops-socle': { chemin: 'scripts/ops-acquisition-qa.mjs', base: ['scripts/ops-acquisition-qa.mjs', '--migration=socle', '--racine={racine}'] },
  'ops-echanges': { chemin: 'scripts/ops-acquisition-qa.mjs', base: ['scripts/ops-acquisition-qa.mjs', '--migration=echanges', '--racine={racine}'] },
  'ops-planification': { chemin: 'scripts/ops-acquisition-qa.mjs', base: ['scripts/ops-acquisition-qa.mjs', '--migration=planification', '--racine={racine}'] },
  'constructeur': { chemin: 'scripts/constructeur-ferme-qa.mjs', base: ['scripts/constructeur-ferme-qa.mjs', '--racine={racine}'] },
  'parcours': { chemin: 'scripts/parcours-commande-qa.mjs', base: ['scripts/parcours-commande-qa.mjs', '--racine={racine}'] },
  'webhook': { chemin: 'scripts/webhook-muet-qa.mjs', base: ['scripts/webhook-muet-qa.mjs', '--racine={racine}'] },
  // Ces deux juges n'ont pas d'option --racine : ils jugent l'arbre où ils vivent. Lancés DEPUIS la copie.
  'pont': { chemin: 'scripts/pont-orchestre-qa.mjs', depuisCopie: true, base: ['scripts/pont-orchestre-qa.mjs'] },
  'entrant': { chemin: 'scripts/prospects-entrant-qa.mjs', depuisCopie: true, base: [...LOADER, 'scripts/prospects-entrant-qa.mjs'] },
  // La couverture : le jeu d'essai propre de 026-001 (la série réelle est rouge aujourd'hui sur CV-1 à CV-8 : le témoin ne le serait pas).
  'couverture': { chemin: 'scripts/juges-026-preuve.mjs', base: ['scripts/juges-026-preuve.mjs', '--couverture', '--cartes={racine}/scripts/fixtures/026/couverture/propre', '--index={racine}/scripts/fixtures/026/couverture/propre/INDEX.md'] },
}
/** Une ligne du fichier, retrouvée par son début (une seule doit exister) : pour les lignes trop longues à recopier. */
function ligne(f, debut) {
  const L = lire(path.join(ROOT, f)).split(/\r?\n/).filter((l) => l.trimStart().startsWith(debut))
  if (L.length !== 1) throw new Error(`${f} : ${L.length} ligne(s) commençant par « ${debut} »`)
  return L[0]
}
/** Le texte entre deux ancres (la première `de`, puis la première `jusqua` après elle), ancres comprises. */
function entre(f, de, jusqua) {
  const t = lire(path.join(ROOT, f)).replace(/\r\n/g, '\n')
  const a = t.indexOf(de), b = t.indexOf(jusqua, a + de.length)
  if (a < 0 || b < 0) throw new Error(`${f} : ancres « ${de} » … « ${jusqua} » introuvables`)
  return t.slice(a, b + jusqua.length)
}
/** Un remplacement tiré d'une expression régulière du fichier : `avant` est la partie trouvée (unique), `apres` son remplacement. */
function regle(f, re, remplace) {
  const t = lire(path.join(ROOT, f)).replace(/\r\n/g, '\n')
  const x = re.exec(t)
  if (!x) throw new Error(`${f} : l'expression ${re} ne trouve rien`)
  return [x[0], x[0].replace(re, remplace)]
}
const M = []
/** m(juge, critere, fichier, avant, apres, nom) — apres peut être une fonction de avant. */
const m = (juge, critere, fichier, avant, apres, nom) => M.push({ juge, critere, fichier, avant, apres: typeof apres === 'function' ? apres(avant) : apres, nom })
const mr = (juge, critere, fichier, re, remplace, nom) => { const [a, b] = regle(fichier, re, remplace); m(juge, critere, fichier, a, b, nom) }

// agents-llm-qa (LL) — lib/agents/llm.ts et moteurs.ts
const LLM = 'lib/agents/llm.ts', MOT = 'lib/agents/moteurs.ts'
m('agents-llm', 'LL-4', MOT, "  standardiste: { moteur: 'codex', modele: MODELE_AGENTS, personnelles: true },", "  standardiste: { moteur: 'freellmapi', modele: MODELE_AGENTS, personnelles: true },", 'standardiste passé en freellmapi')
m('agents-llm', 'LL-2', LLM, "return u.hostname === '127.0.0.1' || u.hostname === 'localhost' ? valeur : null", 'return u.hostname ? valeur : null', 'FREELLMAPI_URL d\'un hôte public acceptée')
// 05/10/2026 (D-0510-A4, lot « sécurité des juges ») : deux sabotages de plus pour LL-2, que son cas d'hôte public ne voyait pas (veille_pubs est null de toute façon).
m('agents-llm', 'LL-2', LLM, "return u.hostname === '127.0.0.1' || u.hostname === 'localhost' ? valeur : null", "return u.hostname.startsWith('127.0.0.1') || u.hostname === 'localhost' ? valeur : null", 'FREELLMAPI_URL : un hôte qui COMMENCE par 127.0.0.1 (127.0.0.1.autre.domaine) accepté')
m('agents-llm', 'LL-2', LLM, "return u.hostname === '127.0.0.1' || u.hostname === 'localhost' ? valeur : null", "return u.hostname.startsWith('192.') || u.hostname === '127.0.0.1' || u.hostname === 'localhost' ? valeur : null", 'FREELLMAPI_URL : une adresse privée du réseau local (192.x) acceptée')
m('agents-llm', 'LL-5', LLM, "'--sandbox', 'read-only'", "'--sandbox', 'danger-full-access'", 'danger-full-access dans l\'argv de Codex')
m('agents-llm', 'LL-8', LLM, 'try { retourCout = await enregistrerCoutFn(agent, cout, resultat.detail) }', 'try { retourCout = await enregistrerCoutFn(agent, 0.01, resultat.detail) }', 'enregistrerCout reçoit 0,01 €')
m('agents-llm', 'LL-3', LLM, ligne(LLM, "import fs from 'node:fs'"), (l) => `${l}\nimport Anthropic from '@anthropic-ai/sdk'\nvoid Anthropic`,'import Anthropic de @anthropic-ai/sdk ajouté')
m('agents-llm', 'LL-5', LLM, "const nettoye = texte.split('<donnees>').join('').split('</donnees>').join('')", 'const nettoye = texte', 'le retrait des marques <donnees> supprimé')
m('agents-llm', 'LL-6', LLM, "try { return JSON.parse(texte.trim()) } catch { throw new Error('réponse non JSON') }", "try { return JSON.parse(texte.trim()) } catch { const premier = /\\{[\\s\\S]*\\}/.exec(texte); if (premier) return JSON.parse(premier[0]); throw new Error('réponse non JSON') }", 'JSON.parse remplacé par l\'extraction du premier {…}')
m('agents-llm', 'LL-7', LLM, '    compteurAppels++\n', '', 'compteur d\'appels jamais incrémenté')
m('agents-llm', 'LL-9', LLM, '    const consigne = consigneAvecLecons(systeme, leconsChoisies)\n', '    console.log(donnees)\n    const consigne = consigneAvecLecons(systeme, leconsChoisies)\n', 'console.log(donnees) ajouté')
m('agents-llm', 'LL-12', MOT, "export const MODELE_REJUGE = 'gpt-6-sol'", 'export const MODELE_REJUGE = MODELE_AGENTS', 'MODELE_REJUGE égal à MODELE_AGENTS')

// ops-acquisition-qa (OA, OB, PG) — les migrations
const M1 = 'supabase/migrations/0105_acquisition_socle.sql', M2 = 'supabase/migrations/0106_acquisition_echanges.sql', M3 = 'supabase/migrations/0109_acquisition_planification.sql'
m('ops-socle', 'OA-2', M1, 'grant execute on function public.acq_en_pause(text) to service_role;', 'grant execute on function public.acq_en_pause(text) to service_role;\ngrant execute on function public.acq_en_pause(text) to authenticated;', 'grant execute … to authenticated ajouté')
mr('ops-socle', 'OA-4', M1, /,\s*\('lien_envoye', 'oppose'\)/, '', 'une paire retirée de la table des transitions')
m('ops-socle', 'OA-9', M1, ligne(M1, "select public.ops_agent_enregistrer('recenseur'"), (l) => l.replace(', 360, 30, 0, 0)', ', 60, 30, 0, 0)'), 'la graine de recenseur à une période de 60 min')
m('ops-socle', 'OA-10', M1, "public.ops_interrupteur('pause_generale')", '(select actif from ops.pause_generale limit 1)', 'acq_en_pause lit ops.pause_generale')
m('ops-echanges', 'OB-4', M2, "'maquettes', 'maquettes', false", "'maquettes', 'maquettes', true", 'le bucket maquettes passé public = true')
m('ops-echanges', 'OB-6', M2, 'from (select * from ops.reponses where classe is null order by recu_le limit greatest(coalesce(p_limite, 1), 0)) r', 'from (select r0.* from ops.reponses r0 join ops.envois e0 on e0.id = r0.envoi_id where r0.classe is null order by r0.recu_le limit greatest(coalesce(p_limite, 1), 0)) r', 'acq_reponses_a_traiter lit aussi ops.envois (les courriers n existent plus : la jointure fautive est celle de ops.envois)')
mr('ops-echanges', 'OB-9', M2, /(function public\.acq_envoi_preparer[\s\S]*?)exception when others then/, '$1exception when unique_violation then', 'le sous-bloc exception d\'acq_envoi_preparer ne rattrape plus les refus du déclencheur')
m('ops-planification', 'PG-1', M3, "select cron.schedule('acq-repondeur'", "select cron.schedule('acq-facteur-pause', '* * * * *', $$ select 1 $$);\nselect cron.schedule('acq-repondeur'", 'une tâche cron.schedule de plus')

// constructeur-ferme-qa, parcours-commande-qa, webhook-muet-qa
m('constructeur', 'CF-1', 'lib/flags.ts', '  constructeurSite: false,', '  constructeurSite: true,', 'constructeurSite: true dans lib/flags.ts')
m('parcours', 'PC-1', 'lib/siteCommande.ts', ' || a.installation! < 1960 || a.installation! > new Date().getFullYear()', '', 'la borne de l\'année d\'installation retirée')
// 05/10/2026 (D-0510-A4) : WM-1 joue désormais la branche pack_pub ; deux sabotages de plus (pack_id non exigé ; pack servi avant le paiement).
m('webhook', 'WM-1', 'lib/stripeAiguillage.ts', "if (s.mode === 'payment' && s.metadata?.type === 'pack_pub' && s.metadata?.pack_id) {", "if (s.mode === 'payment' && s.metadata?.type === 'pack_pub') {", 'pack_pub sans pack_id : un paiement forgé à la main passe pour un vrai pack')
m('webhook', 'WM-1', 'lib/stripeAiguillage.ts', "return s.payment_status === 'paid' ? 'pack_pub' : s.payment_status === 'unpaid' ? 'en_attente' : 'orphelin'", "return 'pack_pub'", 'pack_pub servi même quand le prélèvement est encore en cours (unpaid)')
m('webhook', 'WM-1', 'lib/stripeAiguillage.ts', "if (s.mode === 'payment' && s.metadata?.type === 'pack_pub' && s.metadata?.pack_id) {", 'if (false) {', 'la branche pack_pub rendue orpheline (son cas retiré de l\'aiguillage, la fonction gardée)')

// pont-orchestre-qa (PO) — scripts/pont-orchestre.mjs et l'unité systemd
const PONT = 'scripts/pont-orchestre.mjs'
m('pont', 'PO-2', PONT, "'<donnees_tache>', JSON.stringify(neutraliser(tache.charge), null, 2), '</donnees_tache>', ''", "'<donnees_tache>', '</donnees_tache>', JSON.stringify(neutraliser(tache.charge), null, 2), ''", 'la charge de la tâche recopiée hors des balises de données')
m('pont', 'PO-3', PONT, '    let nom\n    try { nom = await ranger(tache) }', "    await poster(`taches/${encodeURIComponent(tache.id)}/rendre`, { resultat: 'faite', preuve_url: `git:.orchestre/propositions/${nomFichier(tache)}` })\n    await new Promise((r) => setTimeout(r, 80))\n    let nom\n    try { nom = await ranger(tache) }", 'la tâche rendue faite avant l\'écriture de sa proposition')
m('pont', 'PO-4', PONT, '    if (etat[cle] === signature) continue\n', '', 'l\'événement de verdict reposté à chaque passage')
m('pont', 'PO-6', PONT, "const propositions = path.join(orchestre, 'propositions')", "const propositions = path.join(orchestre, 'file')", 'une proposition écrite dans .orchestre/file/')
m('pont', 'PO-9', PONT, ligne(PONT, 'preuve_url = `supabase://ops.evenements/'), () => '      void evenement', 'en mode prendre, la preuve git: au lieu de l\'événement proposition_rangee')
m('pont', 'PO-11', 'scripts/usine/systemd/presti-pont.service', 'User=agents', 'User=agents\nEnvironmentFile=/etc/presti-agents/env', 'presti-pont.service charge un EnvironmentFile=')

// prospects-entrant-qa (PE) — app/api/prospects/entrant/route.ts
const ENT = 'app/api/prospects/entrant/route.ts'
m('entrant', 'PE-2', ENT, "  if (!actif('prospectsEntrant')) return NextResponse.json({ error: 'Page introuvable.' }, { status: 404 })\n\n  const ip = getIp(req)\n  if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })\n", "  const ip = getIp(req)\n  if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })\n  if (!actif('prospectsEntrant')) return NextResponse.json({ error: 'Page introuvable.' }, { status: 404 })\n", 'le test du drapeau placé après l\'appel à la base de sécurité')
m('entrant', 'PE-3', ENT, "    await recordAbuse(ip, 'honeypot /api/prospects/entrant')\n    return NextResponse.json(SUCCES)\n", "    await recordAbuse(ip, 'honeypot /api/prospects/entrant')\n", 'le champ piège enregistre quand même')
m('entrant', 'PE-4', ENT, "  if (corps.accord !== true) {\n    return NextResponse.json({ error: 'Cochez la case pour demander votre maquette et être recontacté.' }, { status: 400 })\n  }\n", '', 'la case d\'accord n\'est plus exigée')
m('entrant', 'PE-5', ENT, '    ...resultat.candidat,\n', "    ...resultat.candidat,\n    source: 'manuel' as const,\n", 'source: manuel au lieu d\'entrant')
m('entrant', 'PE-6', ENT, '  const resultat = normaliserDemandeEntrante({\n', '  console.log(corps.entreprise)\n  const resultat = normaliserDemandeEntrante({\n', 'l\'entreprise reçue écrite par console.log')

// juges-026-preuve --couverture — sur le jeu d'essai propre de 026-001 (scripts/fixtures/026/couverture/propre)
const CV = 'scripts/fixtures/026/couverture/propre/'
m('couverture', 'CV-2', CV + '026-007.md', 'perimetre: [scripts/c-qa.mjs, scripts/juges-026-deux-preuve.mjs,', 'perimetre: [scripts/juges-026-deux-preuve.mjs,', 'le juge d\'une fiche de fabrication retiré du périmètre de sa fiche de juges')
m('couverture', 'CV-4', CV + '026-005.md', '- **Dépend de (PASS) :** 026-004.', '- **Dépend de (PASS) :** 026-004, 026-009.', 'une ligne « Dépend de » cite un id plus grand')
m('couverture', 'CV-8', CV + 'INDEX.md', '| V06 | — | 026-008 · 026-009 | — | — |\n| V07 | — | 026-010 | — | — |', '| V06 | — | 026-008 · 026-009 · 026-010 | — | — |', 'trois fiches du PC dans une même vague de INDEX.md')
m('couverture', 'CV-8', CV + 'INDEX.md', '| V03 | 026-004 | 026-003 | — | — |', '| V03 | 026-004 | 026-003 · 026-005 | — | — |', 'deux fiches qui se chevauchent (lib/a.ts) rangées dans une même vague')
m('couverture', 'CV-6', CV + '026-011.md', '\n- `scripts/c-qa.mjs` : CQ-1', '', 'un juge d\'une fiche de juges n\'est nommé dans aucune fiche de mutations')


// ── Copies, lancement, lecture ───────────────────────────────────────────────────────────────────────────────────
const DOSSIERS = ['app', 'lib', 'components', 'plans', 'scripts', 'supabase', 'docs', '.github', 'gabarits-pubs', 'public']
const FICHIERS = ['package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'vercel.json', 'proxy.ts', 'middleware.ts']
const jonctions = []
function copier(dest) {
  fs.mkdirSync(dest, { recursive: true })
  const x = spawnSync('git', ['-C', ROOT, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8', maxBuffer: 256 << 20, windowsHide: true })
  if (x.status !== 0) throw new Error(`git ls-files : ${x.stderr}`)
  for (const f of x.stdout.split('\0').filter(Boolean)) {
    const dossier = f.split('/')[0]
    const permis = FICHIERS.includes(f) || DOSSIERS.includes(dossier) || f.startsWith('.orchestre/brouillons-ecosysteme/') || f.startsWith('.orchestre/preuves/')
    if (!permis || /^(\.git|node_modules|\.next)\//.test(f)) continue
    const de = path.join(ROOT, f)
    let st; try { st = fs.lstatSync(de) } catch { continue }
    if (!st.isFile()) continue
    fs.mkdirSync(path.dirname(path.join(dest, f)), { recursive: true }); fs.copyFileSync(de, path.join(dest, f))
  }
  const lien = path.join(dest, 'node_modules')
  // Windows : une jonction. Linux (l'usine) : des liens durs, car Next (Turbopack) refuse un node_modules qui est un lien symbolique hors de sa racine.
  if (process.platform === 'win32') { fs.symlinkSync(path.join(ROOT, 'node_modules'), lien, 'junction'); jonctions.push(lien) }
  else { const cp = spawnSync('cp', ['-al', path.join(ROOT, 'node_modules'), lien], { encoding: 'utf8' }); if (cp.status !== 0) throw new Error(`cp -al node_modules : ${cp.stderr}`) }
}
const commande = (j, racine) => (JUGES[j].depuisCopie ? `cd ${racine.replaceAll('\\', '/')} && ` : '') + ['node', ...JUGES[j].base].map((a) => a.replaceAll('{racine}', racine.replaceAll('\\', '/'))).join(' ')
function lancer(j, racine) {
  return new Promise((resolve) => {
    const debut = Date.now()
    const enfant = spawn(process.execPath, JUGES[j].base.map((a) => a.replaceAll('{racine}', racine)), { cwd: JUGES[j].depuisCopie ? racine : ROOT, env: { ...process.env, FORCE_COLOR: '0' }, windowsHide: true })
    let sortie = '', expire = false
    const t = setTimeout(() => { expire = true; enfant.kill('SIGKILL') }, DELAI_JUGE_MS)
    enfant.stdout.on('data', (d) => { sortie += d }); enfant.stderr.on('data', (d) => { sortie += d })
    enfant.on('close', (code) => { clearTimeout(t); resolve({ code: expire ? 124 : code ?? 1, sortie, duree_s: Math.round((Date.now() - debut) / 100) / 10 }) })
  })
}
/** La ligne en échec du critère : « ❌ RS-3 … » ou « FAIL RS-3 — … », jamais une ligne d'un autre critère qui le cite. */
function extraitDe(sortie, critere) {
  const re = new RegExp(`^\\s*(?:❌|✗|✘|FAIL)\\s+${critere.replace(/[-]/g, '\\-')}(?:\\s|—|$)`)
  const lignes = sortie.split(/\r?\n/)
  const k = lignes.findIndex((l) => re.test(l))
  if (k < 0) return ''
  // La ligne du critère, suivie de ses lignes de détail (« ✗ … » indentées) : certains juges écrivent « FAIL LL-12 — échec » puis le détail dessous.
  const e = lignes[k].trim()
  if (e.length >= 20) return e
  // La ligne du critère est trop courte (« FAIL LL-12 — échec ») : une VRAIE ligne de détail de la sortie la remplace.
  for (let n = k + 1; n < lignes.length && /^\s+(?:✗|•|-)\s/.test(lignes[n]); n++) if (lignes[n].trim().length >= 20) return lignes[n].trim()
  return e
}
/** La ligne de bilan du juge : « <juge> : FAIL — ids » ; « ✗ <juge> : ID en échec » (le premier critère rouge seulement) ; ou « <juge> : FAIL » sans liste (le critère nommé est alors lu dans sa propre ligne). */
const bilanNomme = (sortie, critere) => { const L = sortie.split(/\r?\n/).filter((l) => l.trim()); return L.some((l) => (/ : FAIL(?: — (.*))?$/.test(l) && new RegExp(`(?:^|[^A-Z0-9-])${critere}(?:$|[^A-Z0-9-])`).test(l)) || new RegExp(`^✗ \\S+ : ${critere} en échec`).test(l)) || /^\S+(?: --[\w=-]+)* : FAIL\s*$/.test(L.at(-1) ?? '') || /^✗ \S+ : \S+ en échec\s*$/.test(L.at(-1) ?? '') }

// ── Le déroulé ───────────────────────────────────────────────────────────────────────────────────────────────────
const selection = M.filter((x) => !SEUL || x.critere.includes(SEUL) || x.juge.includes(SEUL))
const erreurs = [], lignesMd = [], rapport = []
const resultats = new Map()
const temoins = new Map()
async function main() {
  // 1. les ancres : avant présent une seule fois dans le dépôt réel
  for (const x of selection) {
    const f = path.join(ROOT, x.fichier)
    if (!fs.existsSync(f)) { erreurs.push(`${x.nom} (${x.critere}) : fichier absent ${x.fichier}`); x.invalide = true; continue }
    const t = lire(f), a = nl(x.avant, t.includes('\r\n'))
    const n = t.split(a).length - 1
    if (n !== 1) { erreurs.push(`${x.nom} (${x.critere}) : « avant » présent ${n} fois dans ${x.fichier}`); x.invalide = true }
    else if (x.avant === x.apres) { erreurs.push(`${x.nom} (${x.critere}) : mutation sans effet (apres = avant)`); x.invalide = true }
  }
  if (ANCRES) { for (const e of erreurs) console.log(`✗ ${e}`); console.log(`ancres : ${selection.length - erreurs.length}/${selection.length} valides`); process.exitCode = erreurs.length ? 1 : 0; return }
  const valides = selection.filter((x) => !x.invalide)
  const jugesUtiles = [...new Set(valides.map((x) => x.juge))]
  // 2. les copies (une par travailleur)
  fs.rmSync(TRAVAIL, { recursive: true, force: true })
  const copies = []
  for (let i = 0; i < POOL; i++) { const d = path.join(TRAVAIL, `copie-${i}`); copier(d); copies.push(d) }
  // 3. les tâches : les témoins d'abord, puis les mutations
  const taches = [
    ...jugesUtiles.map((j) => ({ type: 'temoin', j })),
    ...valides.map((x) => ({ type: 'mutation', x })),
  ]
  const exclusifs = (t) => !!JUGES[t.j ?? t.x.juge].serveur
  const file = taches.filter((t) => !exclusifs(t)), apart = taches.filter(exclusifs)
  const travailleur = async (k, liste) => {
    const racine = copies[k]
    while (liste.length) {
      const t = liste.shift()
      if (t.type === 'temoin') {
        const r = await lancer(t.j, racine)
        temoins.set(t.j, r)
        ecrire(path.join(TRAVAIL, 'journaux', `temoin-${t.j}.log`), r.sortie)
        console.log(`Témoin ${t.j} : code ${r.code} (${r.duree_s} s)`)
        continue
      }
      const x = t.x, cible = path.join(racine, x.fichier), original = lire(cible)
      const a = nl(x.avant, original.includes('\r\n')), b = nl(x.apres, original.includes('\r\n'))
      let r
      try { fs.writeFileSync(cible, original.replace(a, () => b)); r = await lancer(x.juge, racine) } finally { fs.writeFileSync(cible, original) }
      ecrire(path.join(TRAVAIL, 'journaux', `mutation-${x.juge}-${x.critere}-${M.indexOf(x)}.log`), r.sortie)
      x.resultat = { ...r, extrait: extraitDe(r.sortie, x.critere), bilan: bilanNomme(r.sortie, x.critere) }
      console.log(`${x.resultat.extrait.length >= 20 && r.code !== 0 && r.code !== 124 ? 'PRISE ' : 'NON PRISE'} ${x.juge} ${x.critere} ${x.nom} (code ${r.code}, ${r.duree_s} s)`)
    }
  }
  await Promise.all(copies.map((_, k) => travailleur(k, file)))
  await travailleur(0, apart)
  // 4. le verdict
  /** Un témoin rouge sur un AUTRE critère (typecheck d'un fichier d'un autre chantier, par exemple) n'invalide pas une mutation : son critère doit être vert dans le témoin. */
  const vertDans = (sortie, critere) => sortie.split(/\r?\n/).some((l) => new RegExp(`^\\s*(?:✅|✓|PASS)\\s+${critere.replace(/[-]/g, '\\-')}(?:\\s|—|$)`).test(l))
  const temoinOk = (x) => { const w = temoins.get(x.juge); return !!w && (w.code === 0 || vertDans(w.sortie, x.critere)) }
  for (const j of jugesUtiles) if (temoins.get(j)?.code !== 0) erreurs.push(`témoin ${j} : code ${temoins.get(j)?.code} (${court(temoins.get(j)?.sortie.split(/\r?\n/).filter((l) => /^\s*(?:❌|✗|FAIL)\s/.test(l)).slice(0, 3).join(' | ') || temoins.get(j)?.sortie.split(/\r?\n/).filter(Boolean).at(-1) || '', 400)})`)
  for (const x of valides) {
    const r = x.resultat
    const pris = temoinOk(x) && r && r.code !== 0 && r.code !== 124 && r.extrait.length >= 20 && r.bilan
    x.pris = !!pris
    if (!pris) erreurs.push(`NON PRISE : ${x.juge} ${x.critere} « ${x.nom} » : ${r ? `code ${r.code}, ${r.extrait ? 'extrait ' + court(r.extrait, 80) : 'aucune ligne en échec pour ' + x.critere}${r.bilan ? '' : ', bilan sans ' + x.critere}` : 'non jouée'}${temoins.get(x.juge)?.code === 0 ? '' : ' (témoin rouge)'}`)
    else rapport.push({ juge: JUGES[x.juge].chemin, commande: commande(x.juge, '{racine}'), fichier: x.fichier, avant: x.avant, apres: x.apres, critere: x.critere, extrait: r.extrait, duree_s: r.duree_s })
    lignesMd.push(`| ${JUGES[x.juge].chemin} | ${x.nom} | \`${x.fichier}\` | ${x.critere} | ${pris ? 'prise' : '**NON PRISE**'} | ${court(r?.extrait || '—', 140).replace(/\|/g, '\\|')} |`)
  }
}
// ── Le témoin 025 et la couverture d'ensemble ─────────────────────────────────────────────────────────────────────
/** Le témoin du point 4 : les mutations de 025-10, sur l'arbre réel. Le script nommé par la fiche peut ne pas exister (jamais commité). */
function temoin025() {
  const f = path.join(ROOT, 'scripts', 'juges-025-mutations.mjs')
  if (!fs.existsSync(f)) return { ok: false, detail: 'scripts/juges-025-mutations.mjs n\'existe pas dans le dépôt (jamais commité : git log --all ne le connaît pas) : le témoin 025 n\'est pas jouable' }
  const debut = Date.now()
  const r = spawnSync(process.execPath, [f], { cwd: ROOT, encoding: 'utf8', timeout: 25 * 60_000, windowsHide: true, maxBuffer: 64 << 20, env: { ...process.env, FORCE_COLOR: '0' } })
  const fin = (r.stdout + r.stderr).split(/\r?\n/).filter(Boolean).at(-1) || ''
  return { ok: r.status === 0, detail: `code ${r.status} en ${Math.round((Date.now() - debut) / 1000)} s — ${court(fin, 120)}` }
}
const RAPPORTS_COUVERTURE = ['026-091', '026-130', '026-101', '026-152', '026-159', '026-150', '026-151', '026-161']
const ORCH = path.join(ROOT, '.orchestre')
/** Les fiches de juges (type: test, executant: claude-code) : leur périmètre dit quels juges la série compte. Lecture des en-têtes, comme juges-026-preuve.mjs. */
function jugesDeLaSerie() {
  const lieux = ['file', 'en-cours', 'fait', 'refuse'].map((d) => path.join(ORCH, d)).concat([path.join(ORCH, 'brouillons-ecosysteme', '026'), path.join(ORCH, 'brouillons-ecosysteme')])
  const vus = new Map()
  for (const d of lieux) {
    let noms = []; try { noms = fs.readdirSync(d) } catch { continue }
    for (const n of noms) if (/^02[56]-\d+\.md$/.test(n) && !vus.has(n)) vus.set(n, path.join(d, n))
  }
  const juges = new Map()
  for (const [n, f] of [...vus].sort()) {
    const tete = /^---\r?\n([\s\S]*?)\r?\n---/.exec(lire(f))?.[1] ?? ''
    const champ = (c) => new RegExp(`^${c}:\\s*(.*)$`, 'm').exec(tete)?.[1]?.trim() ?? ''
    if (champ('type') !== 'test' || champ('executant') !== 'claude-code') continue
    for (const e of champ('perimetre').replace(/^\[|\]$/g, '').split(',').map((x) => x.trim())) {
      if (/^scripts\/[A-Za-z0-9._-]+-qa\.mjs$/.test(e)) juges.set(e, [...(juges.get(e) ?? []), n.replace('.md', '')])
    }
  }
  return juges
}
function couverture() {
  const juges = jugesDeLaSerie()
  const parJuge = new Map()
  const manquants = []
  for (const id of RAPPORTS_COUVERTURE) {
    let entrees = null
    if (id === ID) entrees = rapport
    else {
      const f = path.join(ORCH, 'preuves', id, 'mutations.json')
      try { entrees = JSON.parse(lire(f)).mutations } catch { entrees = null }
    }
    if (!Array.isArray(entrees) || !entrees.length) { manquants.push(id); continue }
    for (const e of entrees) {
      const juge = String(e.juge ?? '').replace(/^\.\.\/orchestre\//, '../orchestre/')
      if (String(e.extrait ?? '').trim().length < 20) continue
      parJuge.set(juge, [...(parJuge.get(juge) ?? []), id])
    }
  }
  const lignes = ['| Juge | Fiche de juges | Rapports où une faute est attrapée | Couvert |', '|---|---|---|---|']
  let sans = 0
  for (const [juge, fiches] of [...juges].sort()) {
    if (juge === 'scripts/horloge-qa.mjs') { lignes.push(`| ${juge} | ${fiches.join(', ')} | exempté (--reel seulement, CV-6) | oui |`); continue }
    const r = [...new Set(parJuge.get(juge) ?? [])]
    if (!r.length) sans++
    lignes.push(`| ${juge} | ${fiches.join(', ')} | ${r.join(', ') || '—'} | ${r.length ? 'oui' : '**NON**'} |`)
  }
  return { lignes, sans, total: juges.size, manquants }
}
const COUVERT = { lignes: [], sans: 0, total: 0, manquants: [] }
try { await main() } catch (e) { erreurs.push(e.stack || String(e)) } finally {
  if (!GARDER && !ANCRES) {
    for (const p of jonctions) { try { fs.unlinkSync(p) } catch { /* déjà retirée */ } }
    if (path.resolve(TRAVAIL) === path.join(ROOT, '.orchestre', 'travail', ID)) fs.rmSync(TRAVAIL, { recursive: true, force: true })
  }
  if (!ANCRES) {
    if (!SEUL) {
      if (rapport.length !== M.length) erreurs.push(`rapport incomplet : ${rapport.length}/${M.length}`)
      const t25 = temoin025()
      if (!t25.ok) erreurs.push(`témoin 025 : ${t25.detail}`)
      Object.assign(COUVERT, couverture())
      for (const id of COUVERT.manquants) erreurs.push(`couverture : rapport absent, vide ou illisible (.orchestre/preuves/${id}/mutations.json)`)
      if (COUVERT.sans) erreurs.push(`couverture : ${COUVERT.sans} juge(s) sur ${COUVERT.total} sans aucune faute attrapée dans un rapport (voir le tableau)`)
    }
    ecrire(path.join(PREUVES, 'mutations.json'), JSON.stringify({ mutations: rapport }, null, 2) + '\n')
    ecrire(path.join(PREUVES, 'mutations.md'), `# 026-161 — mutations des juges qu'aucun domaine ne mute, et couverture d'ensemble\n\n${erreurs.length ? `**ÉCHECS (${erreurs.length})** :\n${erreurs.map((e) => `- ${e}`).join('\n')}` : 'Tous les témoins sont verts, toutes les mutations sont prises, la couverture est complète.'}\n\n## Couverture juge par juge (huit rapports mutations.json)\n\n${COUVERT.lignes.join('\n') || '(non calculée : --seul)'}\n\n## Les mutations\n\n| Juge | Faute plantée | Fichier | Critère attendu | Verdict | Extrait réel |\n|---|---|---|---|---|---|\n${lignesMd.join('\n')}\n`)
    console.log(`juges-026-mutations : ${erreurs.length ? 'FAIL' : 'PASS'} — ${rapport.length}/${M.length} mutation(s) prises, ${erreurs.length} écart(s)`)
    for (const e of erreurs) console.log(`  ✗ ${e}`)
    process.exitCode = SEUL ? 3 : erreurs.length ? 1 : 0
  }
}
