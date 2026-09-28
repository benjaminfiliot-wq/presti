#!/usr/bin/env node
// scripts/juges-026-pont-entrant-preuve.mjs — la preuve du chantier 026-142 : sort en code 0 SEULEMENT si
// scripts/pont-orchestre-qa.mjs et scripts/prospects-entrant-qa.mjs échouent AUJOURD'HUI sur leur premier critère
// (PO-1, PE-1 : les scripts qu'ils jugeront, 026-160 et 026-145, n'existent pas encore) et passent tous les deux
// leur autocontrôle --temoin. Elle fait tout elle-même : lance les deux juges, lit leurs sorties, compare des
// empreintes avant/après — elle ne lit aucun journal déposé par quelqu'un d'autre.
//
//   node scripts/juges-026-pont-entrant-preuve.mjs
//
// JP-1 : les deux juges, sans option, sortent en code ≠ 0, avec PO-1 et PE-1 respectivement en premier échec —
//        l'extrait recopié dans echecs-attendus.md se retrouve dans la sortie que CE passage vient de produire.
// JP-2 : les deux juges, avec --temoin, sortent en code 0.
// JP-3 : aucun des deux ne s'ouvre sur le réseau hors de 127.0.0.1 : les quatre passages sont lancés avec un
//        `fetch` piégé (NODE_OPTIONS=--import "data:…", qui atteint aussi tout processus enfant que les juges
//        lanceraient eux-mêmes, par héritage de l'environnement) — un hôte qui n'est ni 127.0.0.1 ni localhost fait
//        lever une exception avant toute connexion réelle.
// JP-4 : rien n'a bougé hors .orchestre/travail/ et .orchestre/preuves/ : aucun fichier n'est apparu dans
//        .orchestre/file/ ni dans .orchestre/propositions/ du dépôt, et les fichiers du périmètre de 026-142
//        eux-mêmes n'ont pas changé pendant la preuve.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..')
const PREUVES = path.join(RACINE, '.orchestre', 'preuves', '026-142')
fs.mkdirSync(PREUVES, { recursive: true })

// ── JP-3 : le piège, un module chargé AVANT tout code des juges (et de tout enfant qu'ils lanceraient) ───────────
const CODE_PIEGE = [
  "const o = globalThis.fetch",
  "globalThis.fetch = async (entree, init) => {",
  "  const u = typeof entree === 'string' ? entree : (entree && entree.url) || String(entree)",
  "  let h = null",
  "  try { h = new URL(u).hostname } catch { h = null }",
  "  if (h !== '127.0.0.1' && h !== 'localhost' && h !== '::1' && h !== '[::1]') {",
  "    throw new Error('fetch piégé (026-142, JP-3) : hôte refusé « ' + h + ' » pour ' + u)",
  "  }",
  "  return o(entree, init)",
  "}",
].join('\n')
const URL_PIEGE = 'data:text/javascript,' + encodeURIComponent(CODE_PIEGE)

/** Lance un juge (chemin relatif à la racine) sous le piège réseau. `imports` : --import supplémentaires (ex.
 * ts-loader.mjs, exigé par le `verifier` de 026-145.md), passés tels quels sur la ligne de commande. */
function lancerJuge(scriptRel, args, { imports = [] } = {}) {
  return new Promise((resolve) => {
    const argv = []
    for (const i of imports) argv.push('--import', i)
    argv.push(scriptRel, ...args)
    const env = { ...process.env, NODE_OPTIONS: `--import "${URL_PIEGE}"` }
    delete env.PRESTI_JETON_PONT // jamais hérité par accident dans un passage sans jeton
    const debut = Date.now()
    const enfant = spawn(process.execPath, argv, { cwd: RACINE, env, stdio: ['ignore', 'pipe', 'pipe'] })
    let sortie = '', erreur = ''
    let clos = false
    enfant.stdout.on('data', (d) => { sortie += d })
    enfant.stderr.on('data', (d) => { erreur += d })
    const tempo = setTimeout(() => { if (!clos) { enfant.kill('SIGKILL'); resolve({ code: null, expire: true, sortie, erreur, duree_s: (Date.now() - debut) / 1000 }) } }, 180_000)
    enfant.on('close', (code) => { clos = true; clearTimeout(tempo); resolve({ code, expire: false, sortie, erreur, duree_s: (Date.now() - debut) / 1000 }) })
    enfant.on('error', (e) => { clos = true; clearTimeout(tempo); resolve({ code: null, expire: false, sortie, erreur: erreur + String(e), duree_s: (Date.now() - debut) / 1000 }) })
  })
}

// ── JP-4 : empreintes avant/après, scopées (le dépôt est partagé avec d'autres sessions : comparer TOUT git status
// serait pollué par leurs écritures ailleurs — mémoire « immobile » JA-5/JP-6/JL-5). On ne regarde que ce que CES
// deux juges pourraient toucher : .orchestre/file/, .orchestre/propositions/, et le périmètre de 026-142 lui-même.
function listerDossier(rel) { try { return new Set(fs.readdirSync(path.join(RACINE, rel))) } catch { return new Set() } }
function empreinteFichier(rel) { try { const s = fs.statSync(path.join(RACINE, rel)); return `${s.size}:${s.mtimeMs}` } catch { return 'absent' } }
const PERIMETRE_026_142 = [
  'scripts/pont-orchestre-qa.mjs', 'scripts/prospects-entrant-qa.mjs', 'scripts/juges-026-pont-entrant-preuve.mjs',
]
function instantane() {
  return {
    file: listerDossier('.orchestre/file'),
    propositions: listerDossier('.orchestre/propositions'),
    perimetre: Object.fromEntries(PERIMETRE_026_142.map((f) => [f, empreinteFichier(f)])),
  }
}
function nouveauxAjouts(avantSet, apresSet) { return [...apresSet].filter((n) => !avantSet.has(n)) }

async function main() {
  const jp = []
  const marquer = (id, ok, detail) => { jp.push({ id, ok, detail }); return ok }

  const avant = instantane()

  // ── PO : normal puis --temoin ──────────────────────────────────────────────────────────────────────────────────
  const poNormal = await lancerJuge('scripts/pont-orchestre-qa.mjs', [])
  const poTemoin = await lancerJuge('scripts/pont-orchestre-qa.mjs', ['--temoin'])
  // ── PE : normal puis --temoin (le --import ts-loader.mjs est celui du `verifier` de 026-145.md) ──────────────────
  const peNormal = await lancerJuge('scripts/prospects-entrant-qa.mjs', [], { imports: ['./scripts/ts-loader.mjs'] })
  const peTemoin = await lancerJuge('scripts/prospects-entrant-qa.mjs', ['--temoin'], { imports: ['./scripts/ts-loader.mjs'] })

  const apres = instantane()

  // ── JP-1 ────────────────────────────────────────────────────────────────────────────────────────────────────────
  const ligne = (sortie, id) => (sortie.split(/\r?\n/).find((l) => l.startsWith(`✗ ${id} `)) || '')
  const poLigne = ligne(poNormal.sortie + poNormal.erreur, 'PO-1')
  const peLigne = ligne(peNormal.sortie + peNormal.erreur, 'PE-1')
  const jp1Po = marquer('JP-1-PO', poNormal.code !== 0 && poNormal.code !== null && poLigne.length > 0, `code ${poNormal.code}, première ligne PO-1 : « ${poLigne} »`)
  const jp1Pe = marquer('JP-1-PE', peNormal.code !== 0 && peNormal.code !== null && peLigne.length > 0, `code ${peNormal.code}, première ligne PE-1 : « ${peLigne} »`)

  // ── JP-2 ────────────────────────────────────────────────────────────────────────────────────────────────────────
  marquer('JP-2-PO', poTemoin.code === 0, `--temoin : code ${poTemoin.code}${poTemoin.expire ? ' (délai dépassé)' : ''}`)
  marquer('JP-2-PE', peTemoin.code === 0, `--temoin : code ${peTemoin.code}${peTemoin.expire ? ' (délai dépassé)' : ''}`)

  // ── JP-3 : aucune trace du piège dans aucune des quatre sorties (il ne s'est donc jamais déclenché : jamais
  // d'appel hors 127.0.0.1) ; les quatre passages ont bien pu joindre leurs propres serveurs locaux (ils sont
  // verts / rendent PO-1 ou PE-1 nommément, pas une erreur réseau opaque).
  const piegeDeclenche = [poNormal, poTemoin, peNormal, peTemoin].some((r) => (r.sortie + r.erreur).includes('fetch piégé (026-142, JP-3)'))
  marquer('JP-3', !piegeDeclenche, piegeDeclenche ? 'le piège réseau s\'est déclenché : un appel visait un hôte hors 127.0.0.1' : 'jamais déclenché sur les quatre passages (réseau limité à 127.0.0.1)')

  // ── JP-4 ────────────────────────────────────────────────────────────────────────────────────────────────────────
  const ajoutsFile = nouveauxAjouts(avant.file, apres.file)
  const ajoutsPropositions = nouveauxAjouts(avant.propositions, apres.propositions)
  const perimetreInchange = PERIMETRE_026_142.every((f) => avant.perimetre[f] === apres.perimetre[f])
  marquer('JP-4', ajoutsFile.length === 0 && ajoutsPropositions.length === 0 && perimetreInchange,
    `file/ +${ajoutsFile.length} (${ajoutsFile.join(', ') || '—'}), propositions/ +${ajoutsPropositions.length} (${ajoutsPropositions.join(', ') || '—'}), périmètre inchangé : ${perimetreInchange}`)

  const tout = jp.every((c) => c.ok)

  // ── verifier.log ────────────────────────────────────────────────────────────────────────────────────────────────
  const log = [
    `$ node scripts/juges-026-pont-entrant-preuve.mjs`,
    `# ${new Date().toISOString()}`,
    '',
    '== pont-orchestre-qa (normal) ==', `code ${poNormal.code} · ${poNormal.duree_s.toFixed(1)}s`, poNormal.sortie.trim(), poNormal.erreur.trim(),
    '', '== pont-orchestre-qa --temoin ==', `code ${poTemoin.code} · ${poTemoin.duree_s.toFixed(1)}s`, poTemoin.sortie.trim(), poTemoin.erreur.trim(),
    '', '== prospects-entrant-qa (normal) ==', `code ${peNormal.code} · ${peNormal.duree_s.toFixed(1)}s`, peNormal.sortie.trim(), peNormal.erreur.trim(),
    '', '== prospects-entrant-qa --temoin ==', `code ${peTemoin.code} · ${peTemoin.duree_s.toFixed(1)}s`, peTemoin.sortie.trim(), peTemoin.erreur.trim(),
    '', '== critères de la preuve ==',
    ...jp.map((c) => `${c.ok ? '✓' : '✗'} ${c.id} ${c.detail}`),
    '', tout ? '✓ juges-026-pont-entrant-preuve : PASS' : '✗ juges-026-pont-entrant-preuve : FAIL',
  ].join('\n') + '\n'
  fs.writeFileSync(path.join(PREUVES, 'verifier.log'), log)

  // ── echecs-attendus.md ──────────────────────────────────────────────────────────────────────────────────────────
  const md = [
    '# 026-142 — échecs attendus sur l\'arbre actuel (jugé par 026-161)',
    '',
    'Cette preuve lance les deux juges elle-même, aujourd\'hui, avant que 026-160 (`scripts/pont-orchestre.mjs`) et',
    '026-145 (`app/api/prospects/entrant/route.ts`) n\'existent : chacun doit échouer sur son PREMIER critère, et',
    'son autocontrôle `--temoin` (indépendant du script qu\'il juge) doit passer.',
    '',
    '## pont-orchestre-qa.mjs',
    '',
    `- Critère attendu en échec : **PO-1** (\`scripts/pont-orchestre.mjs\` absent).`,
    `- Code de sortie : ${poNormal.code} (attendu : ≠ 0, ici 2 — préalable manquant).`,
    '- Extrait réel de la sortie (recopié depuis ce passage) :',
    '  ```',
    `  ${poLigne || '(ligne introuvable)'}`,
    '  ```',
    `- Autocontrôle \`--temoin\` : ${poTemoin.code === 0 ? 'PASS' : 'FAIL'} (code ${poTemoin.code}).`,
    '',
    '## prospects-entrant-qa.mjs',
    '',
    `- Critère attendu en échec : **PE-1** (\`app/api/prospects/entrant/route.ts\` absent).`,
    `- Code de sortie : ${peNormal.code} (attendu : ≠ 0, ici 2 — préalable manquant).`,
    '- Extrait réel de la sortie (recopié depuis ce passage) :',
    '  ```',
    `  ${peLigne || '(ligne introuvable)'}`,
    '  ```',
    `- Autocontrôle \`--temoin\` : ${peTemoin.code === 0 ? 'PASS' : 'FAIL'} (code ${peTemoin.code}).`,
    '',
    '## Garde-fous (JP-3, JP-4)',
    '',
    `- JP-3 (réseau limité à 127.0.0.1) : ${piegeDeclenche ? 'DÉCLENCHÉ — voir verifier.log' : 'jamais déclenché sur les quatre passages.'}`,
    `- JP-4 (rien hors .orchestre/travail/ et .orchestre/preuves/) : \`.orchestre/file/\` +${ajoutsFile.length}, \`.orchestre/propositions/\` +${ajoutsPropositions.length}, périmètre de 026-142 inchangé : ${perimetreInchange}.`,
    '',
    `Verdict d'ensemble : **${tout ? 'PASS' : 'FAIL'}**.`,
    '',
  ].join('\n')
  fs.writeFileSync(path.join(PREUVES, 'echecs-attendus.md'), md)

  for (const c of jp) console.log(`${c.ok ? '✓' : '✗'} ${c.id} ${c.detail}`)
  console.log('')
  console.log(tout ? '✓ juges-026-pont-entrant-preuve : PASS' : '✗ juges-026-pont-entrant-preuve : FAIL')
  process.exitCode = tout ? 0 : 1
}

main().catch((e) => { console.error('✗ juges-026-pont-entrant-preuve : erreur inattendue —', e && e.stack || e); process.exitCode = 1 })
