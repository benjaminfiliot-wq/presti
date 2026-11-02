#!/usr/bin/env node
// scripts/garde-agents-orca-qa.mjs — juge du crochet scripts/hooks/garde-agents-orca.mjs (02/11/2026, défaut E de l'audit 031-012).
// Une session Claude Code lancée par Orca (variable ORCA_TERMINAL_HANDLE) ne doit ni commiter, ni pousser, ni déployer, ni migrer,
// ni compiler sur le .next partagé ; la session principale (sans cette variable) n'est jamais bloquée. Hors ligne : le crochet est
// joué en vrai processus, sur des commandes écrites ici, sans jamais les exécuter. Un MUTANT (le refus du push retiré, dans une copie)
// doit rougir.
//
// Usage : node scripts/garde-agents-orca-qa.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CROCHET = path.join(RACINE, 'scripts/hooks/garde-agents-orca.mjs')
let verts = 0
const rouges = []
const ok = (nom, cond, detail = '') => { if (cond) verts++; else rouges.push(nom); console.log(`${cond ? 'PASS' : 'FAIL'} ${nom}${cond || !detail ? '' : ' — ' + String(detail).slice(0, 300)}`) }

const G = await import(pathToFileURL(CROCHET).href)
const REFUSEES = [
  'git commit -m "registre des relances"', 'git push origin main', 'cd /c/Users/x/presti && git -C ../cerveau push', 'git -c user.name=agent commit -am x',
  'git merge refonte-1018', 'git rebase main', 'git tag v1', 'npx vercel --prod', 'vercel deploy', 'node scripts/appliquer-migration.mjs supabase/migrations/0183_x.sql',
  'psql "$DIRECT_URL" -c "select 1"', 'npx supabase db push', 'npm run build', 'npx next build', 'next dev -p 3000', 'node scripts/tout-verifier.mjs --rapide',
  'npm run dev', 'Set-Location C:\\presti; git push',
]
const PERMISES = [
  'git status', 'git diff --stat', 'git log --oneline -5', 'git show HEAD:lib/plans.ts', 'node scripts/orchestre.mjs verifier 031-016', 'npm run typecheck',
  'PRESTI_DIST=.next-prod npm run build', 'PRESTI_DIST=.next-prod node scripts/tout-verifier.mjs --rapide', 'node scripts/hermes-file-banc.mjs', 'ls .orchestre/en-cours/',
]
console.log('── A. La règle (pure)')
const mal = REFUSEES.filter((c) => !G.refusPour(c))
ok(`A1 ${REFUSEES.length} gestes réservés à l'agent principal sont refusés (commit, push, fusion, déploiement, migration, build partagé)`, mal.length === 0, mal.join(' | '))
const trop = PERMISES.filter((c) => G.refusPour(c))
ok(`A2 ${PERMISES.length} commandes de travail ordinaires passent (lecture git, vérificateur, typecheck, build ISOLÉ par PRESTI_DIST, banc)`, trop.length === 0, trop.map((c) => `${c} → ${G.refusPour(c)?.regle}`).join(' | '))

console.log('\n── B. Le crochet, en vrai processus')
const jouer = (entree, orca) => {
  const env = { ...process.env }
  delete env.ORCA_TERMINAL_HANDLE
  if (orca) env.ORCA_TERMINAL_HANDLE = 'term_essai-0000'
  return spawnSync(process.execPath, [CROCHET], { input: typeof entree === 'string' ? entree : JSON.stringify(entree), env, encoding: 'utf8', timeout: 15_000 })
}
const b1 = jouer({ tool_name: 'Bash', tool_input: { command: 'git push origin main' } }, true)
ok('B1 session Orca, « git push » : bloqué (code 2), le message nomme la règle et renvoie à securite.md', b1.status === 2 && /Refusé \(git-commit-push\)/.test(b1.stderr) && /securite\.md/.test(b1.stderr), `${b1.status} ${b1.stderr}`)
const b2 = jouer({ tool_name: 'Bash', tool_input: { command: 'git push origin main' } }, false)
ok('B2 session principale (sans ORCA_TERMINAL_HANDLE), même commande : jamais bloquée ici', b2.status === 0 && !b2.stderr, `${b2.status} ${b2.stderr}`)
const b3 = jouer({ tool_name: 'PowerShell', tool_input: { command: 'node scripts/appliquer-migration.mjs supabase/migrations/0183_x.sql' } }, true)
ok('B3 session Orca, PowerShell, migration : bloquée', b3.status === 2 && /migration/.test(b3.stderr), `${b3.status} ${b3.stderr}`)
const b4 = jouer({ tool_name: 'Bash', tool_input: { command: 'git status' } }, true)
ok('B4 session Orca, « git status » : passe', b4.status === 0, `${b4.status} ${b4.stderr}`)
const b5 = jouer({ tool_name: 'Read', tool_input: { file_path: 'x' } }, true)
const b6 = jouer('pas du json', true)
ok('B5 un autre outil, ou une entrée illisible : passe (ce n’est pas une commande)', b5.status === 0 && b6.status === 0, `${b5.status} ${b6.status}`)

console.log('\n── C. Le branchement')
let reglages = null
try { reglages = JSON.parse(fs.readFileSync(path.join(RACINE, '.claude/settings.json'), 'utf8')) } catch (e) { reglages = null }
const branche = (reglages?.hooks?.PreToolUse ?? []).some((h) => /(^|\|)Bash(\||$)/.test(h.matcher ?? '') && /(^|\|)PowerShell(\||$)/.test(h.matcher ?? '') && (h.hooks ?? []).some((x) => x.type === 'command' && /scripts\/hooks\/garde-agents-orca\.mjs/.test(x.command ?? '')))
ok('C1 .claude/settings.json branche le crochet sur Bash et PowerShell (PreToolUse)', branche)
const lanceur = fs.readFileSync(path.join(RACINE, 'scripts/tout-verifier.mjs'), 'utf8')
ok('C2 ce juge est au tableau SUITES de scripts/tout-verifier.mjs (cout: gratuit)', /'scripts\/garde-agents-orca-qa\.mjs'\], cout: 'gratuit'/.test(lanceur.split('const retenues')[0]))

console.log('\n── D. Mutant')
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-garde-orca-'))
try {
  const code = fs.readFileSync(CROCHET, 'utf8')
  const avant = '(?:commit|push|merge|rebase|cherry-pick|revert|am|tag)'
  if (!code.includes(avant)) throw new Error('mutant : motif introuvable')
  const f = path.join(TMP, 'garde-agents-orca-mutant.mjs')
  fs.writeFileSync(f, code.replace(avant, '(?:merge|rebase|cherry-pick|revert|am|tag)'))
  const M = await import(pathToFileURL(f).href)
  ok('D1 MUTANT (commit et push retirés de la règle) : le juge VOIT la brèche — le mutant laisse passer « git push », l’original refuse', M.refusPour('git push origin main') === null && G.refusPour('git push origin main') !== null)
} catch (e) {
  ok('D1 MUTANT', false, e.message)
} finally {
  try { fs.rmSync(TMP, { recursive: true, force: true }) } catch { /* dossier temporaire */ }
}

console.log(`\n${verts} PASS, ${rouges.length} FAIL`)
if (rouges.length) { console.log('Rouges :\n- ' + rouges.join('\n- ')); process.exitCode = 1 }
