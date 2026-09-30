// test/preuve.mjs — la preuve du dépôt : bin/orchestre.mjs de bout en bout dans un dossier temporaire : init → prochaine → verifier (PASS puis FAIL)
// → digest → contexte → budget (sans puis avec transcript factice, via --transcripts=) → maj → hooks. Aucune écriture hors
// os.tmpdir() — jamais dans ~/.claude. Lancer : node test/preuve.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

import { fileURLToPath } from 'node:url'
const OUTIL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BIN = path.join(OUTIL, 'bin', 'orchestre.mjs')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestre-essai-'))
const projet = path.join(tmp, 'projet')
fs.cpSync(path.join(OUTIL, 'test', 'projet-factice'), projet, { recursive: true })
const slug = path.resolve(projet).replace(/[^A-Za-z0-9]/g, '-')
const racineTranscripts = path.join(tmp, 'transcripts')
const dossierTranscripts = path.join(racineTranscripts, slug)
const avecTranscripts = '--transcripts=' + racineTranscripts

let echecs = 0
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) echecs++ }
const run = (args, cwd = projet, input) => {
  const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', input, env: { ...process.env, FORCE_COLOR: '0' } })
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }
}
const orch = (...a) => run([path.join(projet, 'scripts', 'orchestre.mjs'), ...a])
const lire = (p) => fs.readFileSync(path.join(projet, p), 'utf8')
const existe = (p) => fs.existsSync(path.join(projet, p))

try {
  spawnSync('git', ['init', '-q'], { cwd: projet })
  spawnSync('git', ['add', '-A'], { cwd: projet })
  spawnSync('git', ['-c', 'user.email=a@b.c', '-c', 'user.name=essai', 'commit', '-qm', 'base'], { cwd: projet })

  // init (depuis le dépôt outil, cwd = tmp, dossier en argument)
  let r = run([BIN, 'init', 'projet', '--projet=essai', '--pile=Next.js + Supabase', "--description=Projet d'essai de l'orchestre."], tmp)
  console.log(r.out)
  ok(r.code === 0 && /Projet prêt/.test(r.out), 'init : « Projet prêt »')
  ok(existe('scripts/orchestre.mjs') && existe('scripts/lib/preuves.mjs'), 'init : bin et lib vendorisés')
  ok(existe('scripts/hooks/read-garde.mjs') && existe('scripts/hooks/contexte-fond.mjs'), 'init : hooks copiés')
  ok(existe('scripts/juges/code-qa.mjs') && existe('scripts/juges/site-qa.mjs') && existe('scripts/juges/video-qa.mjs'), 'init : juges copiés')
  const cfg = JSON.parse(lire('.orchestre/orchestre.json'))
  ok(cfg.projet === 'essai' && cfg.carte.pages === 'app/**/page.tsx' && cfg.carte.api === 'app/api/**/route.ts' && cfg.carte.migrations === 'supabase/migrations' && cfg.carte.drapeaux === 'lib/flags.ts', 'init : carte détectée (pages, api, migrations, drapeaux)')
  ok(cfg.juges?.code?.lint === 'npm run lint' && cfg.juges.code.tests === 'npm test', 'init : juges.code depuis package.json')
  ok(cfg.source === OUTIL.split(path.sep).join('/'), 'init : source = dépôt orchestre (barres obliques)')
  const settings = JSON.parse(lire('.claude/settings.json'))
  ok(settings.hooks?.PreToolUse?.[0]?.hooks?.[0]?.command === 'node scripts/hooks/read-garde.mjs', 'init : settings.json fusionné')
  ok(/essai — contexte du dépôt/.test(lire('CLAUDE.md')) && /orchestre:debut/.test(lire('CLAUDE.md')) && !/\{\{/.test(lire('CLAUDE.md')), 'init : CLAUDE.md rendu, sans {{placeholder}}')
  const agents = lire('AGENTS.md')
  ok(/dépôt essai/.test(agents) && !/\{\{/.test(agents) && !/vault configuré/.test(agents) && !/Gabarit AGENTS/.test(agents), 'init : AGENTS.md rendu, sans vault, sans commentaire de gabarit')
  ok(!/\.\.\/SaaS|deploiement-etat|photos-demo/.test(agents), 'init : bloc Méthode sans les phrases Presti')
  ok(existe('.orchestre/gabarit-tache.md') && existe('.orchestre/decisions.md'), 'init : gabarit-tache.md et decisions.md')
  ok(existe('.orchestre/file/000-test.md') && existe('.orchestre/file/001-test-echec.md'), 'init : tâches témoins déposées')

  // init une seconde fois : idempotent, rien d'écrasé
  fs.appendFileSync(path.join(projet, 'CLAUDE.md'), '\n## Note maison\n\nGardée.\n')
  r = run([BIN, 'init', 'projet'], tmp)
  ok(r.code === 0 && /Note maison/.test(lire('CLAUDE.md')) && (lire('CLAUDE.md').match(/orchestre:debut/g) || []).length === 1, 'init ×2 : CLAUDE.md conservé, un seul bloc')
  ok(existe('.orchestre/file/000-test.md'), 'init ×2 : tâches témoins non dupliquées')

  // valider
  r = orch('valider', '.orchestre/file/000-test.md')
  ok(r.code === 0 && /✓/.test(r.out), `valider : ${r.out.trim()}`)

  // prochaine → 000-test
  r = orch('prochaine', '--agent=ag-a')
  ok(r.code === 0 && /Tâche 000-test prise par ag-a/.test(r.out) && /git restore/.test(r.out), 'prochaine : 000-test prise, pied de tâche affiché')
  ok(existe('.orchestre/en-cours/000-test.lock') && existe('.orchestre/en-cours/000-test.avant.txt') && existe('.orchestre/preuves/000-test/avant.txt'), 'prochaine : verrou + avant.txt')
  // verifier depuis en-cours/
  r = orch('verifier', '000-test')
  ok(r.code === 0 && /000-test : PASS/.test(r.out) && /compact conseillé/.test(r.out), 'verifier (en-cours) : PASS + conseil /compact')
  // → fait/ puis verdict final
  fs.renameSync(path.join(projet, '.orchestre/en-cours/000-test.md'), path.join(projet, '.orchestre/fait/000-test.md'))
  r = orch('verifier', '000-test')
  ok(r.code === 0 && /PASS/.test(r.out), 'verifier (fait) : PASS')
  ok(!existe('.orchestre/en-cours/000-test.lock') && existe('.orchestre/preuves/000-test/verifier.log'), 'verifier (fait) : verrou levé, verifier.log écrit')

  // prochaine → 001-test-echec (deuxième agent), puis FAIL
  r = orch('prochaine', '--agent=ag-b')
  ok(r.code === 0 && /001-test-echec prise/.test(r.out), 'prochaine : 001-test-echec prise')
  fs.renameSync(path.join(projet, '.orchestre/en-cours/001-test-echec.md'), path.join(projet, '.orchestre/fait/001-test-echec.md'))
  r = orch('verifier', '001-test-echec')
  ok(r.code === 1 && /FAIL/.test(r.out) && !/compact/.test(r.out), 'verifier : FAIL, code 1, sans conseil /compact')
  ok(existe('.orchestre/refuse/001-test-echec.md'), 'verifier : tâche renvoyée en refuse/')
  const digest = lire('.orchestre/digest.md')
  ok(/ÉCHEC voulu : cette ligne doit apparaître telle quelle dans digest\.md/.test(digest), 'digest : la ligne ÉCHEC telle quelle')
  ok(/\| 000-test \| test \| fait \| ag-a \| PASS \|/.test(digest), 'digest : ligne 000-test PASS')
  ok(/faites : 1 · refusées : 1/.test(digest), 'digest : état file 0 / faites 1 / refusées 1')

  // rejouer puis liberer
  r = orch('rejouer', '001-test-echec'); ok(r.code === 0 && existe('.orchestre/file/001-test-echec.md'), 'rejouer : retour en file/')
  r = orch('prochaine', '--agent=ag-c'); ok(r.code === 0, 'prochaine : reprise')
  r = orch('liberer', '001-test-echec'); ok(r.code === 0 && existe('.orchestre/file/001-test-echec.md') && !existe('.orchestre/en-cours/001-test-echec.lock'), 'liberer : retour en file/, verrou levé')
  // un agent inscrit dans agents.jsonl ne reçoit que sa tâche
  fs.appendFileSync(path.join(projet, '.orchestre/agents.jsonl'), JSON.stringify({ agent: 'ag-d', tache: '999-rien' }) + '\n')
  r = orch('prochaine', '--agent=ag-d'); ok(r.code === 2 && /999-rien n'est plus dans file/.test(r.out), 'prochaine : « un agent, une tâche » respecté')

  // question / réponse
  fs.writeFileSync(path.join(projet, '.orchestre/en-cours/001-test-echec.question.md'), '1. A\n2. B\n')
  fs.renameSync(path.join(projet, '.orchestre/file/001-test-echec.md'), path.join(projet, '.orchestre/en-cours/001-test-echec.md'))
  r = orch('digest'); ok(/1 question\(s\) en attente/.test(lire('.orchestre/digest.md')), 'digest : question en attente signalée')
  r = orch('repondre', '001-test-echec', '2', 'va pour B'); ok(r.code === 0 && /option: 2/.test(lire('.orchestre/en-cours/001-test-echec.reponse.md')), 'repondre : reponse.md déposé')

  // contexte
  r = orch('contexte')
  console.log(r.out.trim())
  const ctx = lire('.orchestre/contexte.md')
  ok(r.code === 0 && /## Pages \(1\)/.test(ctx) && /## API \(1\) — `app\/api\/\*\*\/route\.ts`, préfixe `\/api`/.test(ctx) && /`\/sante` : · \[GET\]/.test(ctx), 'contexte : pages et API avec méthodes')
  ok(/## Drapeaux — `lib\/flags\.ts` \(1\)/.test(ctx) && /demo=true/.test(ctx), 'contexte : drapeaux extraits')
  ok(/## Migrations — `supabase\/migrations` \(1\)/.test(ctx) && /0001_init\.sql/.test(ctx), 'contexte : migrations listées')
  ok(!/vault/i.test(ctx), 'contexte : aucune phrase vault sans clé vault')
  ok(/Carte du code — essai/.test(ctx), 'contexte : titre avec le nom du projet')

  // contexte avec vault configuré : copie de la carte + phrases vault
  const cfg2 = { ...cfg, vault: '../coffre', carteVault: 'Produit/Carte-du-code.md' }
  fs.mkdirSync(path.join(tmp, 'coffre'), { recursive: true })
  fs.writeFileSync(path.join(projet, '.orchestre/orchestre.json'), JSON.stringify(cfg2, null, 2))
  r = orch('contexte')
  ok(r.code === 0 && fs.existsSync(path.join(tmp, 'coffre', 'Produit', 'Carte-du-code.md')), 'contexte + vault : carte copiée dans le vault')
  ok(/vault/.test(lire('.orchestre/contexte.md')) && /coffre/.test(lire('CLAUDE.md')), 'contexte + vault : phrases vault dans contexte.md et le bloc Méthode')
  fs.writeFileSync(path.join(projet, '.orchestre/orchestre.json'), JSON.stringify(cfg, null, 2))

  // budget sans transcript (le dossier passé n'existe pas encore)
  r = orch('budget', avecTranscripts)
  ok(r.code === 0 && /aucune donnée/.test(r.out), 'budget : « aucune donnée », code 0')
  // budget avec un transcript factice (session + sous-agent + une vieille ligne)
  const t = (d, u) => JSON.stringify({ timestamp: d, message: { role: 'assistant', usage: u } })
  const hier = new Date(Date.now() - 86_400_000).toISOString(), now = new Date().toISOString(), vieux = new Date(Date.now() - 30 * 86_400_000).toISOString()
  fs.mkdirSync(path.join(dossierTranscripts, 'sess-1', 'subagents'), { recursive: true })
  fs.writeFileSync(path.join(dossierTranscripts, 'sess-0.jsonl'), t(vieux, { input_tokens: 1000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 1000 }) + '\n')
  fs.writeFileSync(path.join(dossierTranscripts, 'sess-1', 'subagents', 'agent-x.jsonl'), t(now, { input_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 90 }) + '\n')
  fs.writeFileSync(path.join(dossierTranscripts, 'sess-1.jsonl'), [
    JSON.stringify({ type: 'user', message: { role: 'user', content: 'x' } }),
    t(hier, { input_tokens: 100, cache_creation_input_tokens: 200, cache_read_input_tokens: 600, output_tokens: 100 }),
    // la ligne d'aujourd'hui lit un gros fichier (1 200 jetons neufs) : c'est ce que l'alerte doit voir
    t(now, { input_tokens: 1200, cache_creation_input_tokens: 0, cache_read_input_tokens: 800, output_tokens: 200 }),
    'ligne abîmée {',
  ].join('\n') + '\n')
  r = orch('budget', avecTranscripts)
  console.log(r.out.trim())
  const n = (x) => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, '[\\s\\u202f\\u00a0]')   // séparateur de milliers quel qu'il soit
  ok(r.code === 0 && /🔴 Claude Code lit trop au lieu de faire lire/.test(r.out), 'budget : alerte part lue > 60 %')
  // session = sess-1 (+ sous-agent) : neuf 100+200+1200+10 = 1510, relu du cache 600+800 = 1400, produit 100+200+90 = 390
  // → part lue 1510 / (1510 + 390) = 79 % (la relecture du cache n'entre pas dans la part lue)
  ok(new RegExp(`session courante \\(\`sess-1\`\\) : lu \\(nouveau\\) ${n(1510)} · relu depuis le cache ${n(1400)} · produit 390 · part lue 79 % · 3 réponse`).test(r.out), 'budget : session courante (avec sous-agent) bien sommée')
  // aujourd'hui = la ligne de maintenant + le sous-agent : neuf 1210, relu 800, produit 290 ; sept jours = sess-1 entière, sans la ligne de 30 j
  ok(new RegExp(`aujourd'hui : lu \\(nouveau\\) ${n(1210)} · relu depuis le cache 800 · produit 290`).test(r.out) && new RegExp(`sept derniers jours : lu \\(nouveau\\) ${n(1510)} · relu depuis le cache ${n(1400)}`).test(r.out), 'budget : aujourd’hui et 7 jours (la ligne vieille de 30 j exclue)')
  // et une session qui ne fait que relire son cache n'alerte pas (le défaut du 14/09 : toujours 100 %)
  fs.writeFileSync(path.join(dossierTranscripts, 'sess-1.jsonl'), t(now, { input_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 90000, output_tokens: 400 }) + '\n')
  r = orch('budget', avecTranscripts)
  ok(r.code === 0 && !/🔴/.test(r.out), 'budget : relire son cache n’alerte pas')
  fs.writeFileSync(path.join(dossierTranscripts, 'sess-1.jsonl'), [t(hier, { input_tokens: 100, cache_creation_input_tokens: 200, cache_read_input_tokens: 600, output_tokens: 100 }), t(now, { input_tokens: 1200, cache_creation_input_tokens: 0, cache_read_input_tokens: 800, output_tokens: 200 })].join('\n') + '\n')
  ok(!/€/.test(r.out), 'budget : aucun prix')
  const d1 = lire('.orchestre/digest.md')
  ok(d1.startsWith('<!-- budget:debut -->'), 'budget : bloc EN TÊTE de digest.md')
  r = orch('digest')
  const d2 = lire('.orchestre/digest.md')
  ok(d2.startsWith('<!-- budget:debut -->') && (d2.match(/budget:debut/g) || []).length === 1 && /# Digest —/.test(d2), 'digest : bloc budget préservé, une seule fois')
  r = orch('budget', avecTranscripts); ok((lire('.orchestre/digest.md').match(/budget:debut/g) || []).length === 1, 'budget ×2 : bloc remplacé, pas empilé')
  r = orch('budget', '--tous', avecTranscripts); ok(r.code === 0 && /tous les projets/.test(r.out), 'budget --tous : somme tous les projets')

  // maj : identique, puis après une modification locale
  r = orch('maj'); ok(r.code === 0 && /déjà à jour/.test(r.out), 'maj : déjà à jour')
  fs.appendFileSync(path.join(projet, 'scripts/lib/preuves.mjs'), '\n// dérive locale\n')
  r = orch('maj'); ok(r.code === 0 && /scripts\/lib\/preuves\.mjs mis à jour/.test(r.out) && /1 fichier\(s\) changé/.test(r.out), 'maj : recopie ce qui a changé')

  // depuis un sous-dossier : la racine est remontée
  r = run([path.join(projet, 'scripts', 'orchestre.mjs'), 'digest'], path.join(projet, 'app', 'api'))
  ok(r.code === 0 && /régénéré/.test(r.out), 'racine : trouvée depuis un sous-dossier')
  r = run([BIN, 'digest'], tmp)
  ok(r.code === 1 && /aucun dossier \.orchestre/.test(r.out), 'racine : refus hors projet')

  // hooks
  const gros = Array.from({ length: 400 }, (_, i) => `ligne ${i}`).join('\n')
  fs.writeFileSync(path.join(projet, 'gros.txt'), gros)
  r = run([path.join(projet, 'scripts/hooks/read-garde.mjs')], projet, JSON.stringify({ tool_name: 'Read', tool_input: { file_path: path.join(projet, 'gros.txt') } }))
  ok(r.code === 2 && /400 lignes/.test(r.out), 'hook read-garde : refuse 400 lignes sans offset/limit')
  r = run([path.join(projet, 'scripts/hooks/read-garde.mjs')], projet, JSON.stringify({ tool_name: 'Read', tool_input: { file_path: path.join(projet, 'gros.txt'), offset: 1, limit: 50 } }))
  ok(r.code === 0, 'hook read-garde : laisse passer avec offset/limit')
  r = run([path.join(projet, 'scripts/hooks/contexte-fond.mjs')], projet, JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: path.join(projet, 'lib', 'flags.ts') } }))
  ok(r.code === 0 && existe('.orchestre/.contexte-stamp'), 'hook contexte-fond : code 0, horodatage posé')

  // juge code-qa sur le projet factice
  r = run([path.join(projet, 'scripts/juges/code-qa.mjs')], projet)
  ok(r.code === 0 && /code-qa : PASS/.test(r.out), `juge code-qa : ${r.out.trim().split('\n').at(-1)}`)
  // juges.code déclaré = liste complète : le lint absent de la liste est sauté, même si package.json en a un
  {
    const cheminCfg = path.join(projet, '.orchestre/orchestre.json')
    const avantCfg = fs.readFileSync(cheminCfg, 'utf8')
    const c = JSON.parse(avantCfg); c.juges = { ...(c.juges || {}), code: { typecheck: 'node -e "process.exit(0)"' } }
    fs.writeFileSync(cheminCfg, JSON.stringify(c, null, 2))
    r = run([path.join(projet, 'scripts/juges/code-qa.mjs')], projet)
    ok(r.code === 0 && /code-qa : PASS/.test(r.out) && /lint[^\n]*non configurée/.test(r.out) && !/npm run lint/.test(r.out), 'juge code-qa : juges.code déclaré → le lint non listé est sauté')
    fs.writeFileSync(cheminCfg, avantCfg)
  }
} finally {
  if (!process.argv.includes('--garder')) fs.rmSync(tmp, { recursive: true, force: true })
}
console.log(`\n${echecs ? `✗ ${echecs} contrôle(s) en échec` : '✓ tous les contrôles passent'} — dossier d'essai : ${process.argv.includes('--garder') ? tmp : 'supprimé (--garder pour le conserver)'}`)
process.exit(echecs ? 1 : 0)
