// Garde de la configuration de Hermes (scripts/hooks/config-hermes.mjs, audit du chantier 1, 02/11/2026).
// 1) Le lecteur YAML lit les formes que Hermes accepte (listes au retrait de leur clé, listes en ligne, guillemets, commentaires).
// 2) Chaque façon de rouvrir un risque est refusée : modèle gratuit (principal, repli, sous-agents), freellmapi dans le profil
//    qui garde les MCP, outil n8n d'écriture ouvert, plus de plafond, plus d'interdit git push, profil gratuit avec MCP,
//    correctif local perdu. L'ancienne expression régulière du garde laissait passer la plupart : le banc le montre.
// 3) Sur ce PC, la vraie configuration est conforme (sauté si Hermes n'est pas installé, par exemple sur GitHub).
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { lireYamlBloc, controlerConfigHermes } from './hooks/config-hermes.mjs'

let echecs = 0
const verifier = (nom, ok, detail = '') => { if (!ok) { echecs++; console.log(`✗ ${nom}${detail ? ` — ${detail}` : ''}`) } else console.log(`✓ ${nom}`) }

// ── 1. Lecteur YAML ──────────────────────────────────────────────────────────────────────────────────────────────
const y = lireYamlBloc([
  'model:',
  '  default: "claude-haiku-5-5"   # commentaire',
  '  provider: anthropic',
  'fallback_providers:',
  '- provider: freellmapi',
  '  model: gpt-oss-120b',
  '- provider: autre',
  'liste_en_ligne: [a, "b c", d]',
  'carte_en_ligne: {x: 1, y: deux}',
  'vide: {}',
  'texte: "avec # dans les guillemets"',
  'approvals:',
  '  deny:',
  '    - "*git push*"',
  "    - '*vercel*'",
  'bloc: |',
  '  model: ne-doit-pas-compter',
  'mcp_servers:',
  '  n8n-oracle:',
  '    tools:',
  '      include:',
  '        - search_workflows',
  '        # un commentaire au milieu',
  '        - get_workflow_details',
  '  cerveau:',
  '    tools:',
  '      include: [chercher, lire]',
].join('\r\n'))
verifier('carte et commentaire de fin de ligne', y.model?.default === 'claude-haiku-5-5' && y.model?.provider === 'anthropic')
verifier('liste au retrait de sa clé, éléments en carte', Array.isArray(y.fallback_providers) && y.fallback_providers.length === 2 && y.fallback_providers[0].provider === 'freellmapi' && y.fallback_providers[0].model === 'gpt-oss-120b' && y.fallback_providers[1].provider === 'autre', JSON.stringify(y.fallback_providers))
verifier('liste et carte en ligne', JSON.stringify(y.liste_en_ligne) === '["a","b c","d"]' && y.carte_en_ligne?.x === 1 && y.carte_en_ligne?.y === 'deux')
verifier('carte vide et # entre guillemets', JSON.stringify(y.vide) === '{}' && y.texte === 'avec # dans les guillemets')
verifier('liste indentée entre guillemets', JSON.stringify(y.approvals?.deny) === '["*git push*","*vercel*"]', JSON.stringify(y.approvals))
verifier('bloc littéral sauté', y.bloc === '' && y.model?.default === 'claude-haiku-5-5')
verifier('listes imbriquées des MCP', JSON.stringify(y.mcp_servers?.['n8n-oracle']?.tools?.include) === '["search_workflows","get_workflow_details"]' && JSON.stringify(y.mcp_servers?.cerveau?.tools?.include) === '["chercher","lire"]', JSON.stringify(y.mcp_servers))

// ── 2. Contrôles ─────────────────────────────────────────────────────────────────────────────────────────────────
const BONNE = [
  'model:', '  default: claude-haiku-5-5', '  provider: anthropic',
  'agent:', '  max_turns: 150', '  run_budget_seconds: 3600', '  disabled_toolsets: [code_execution]',
  'max_concurrent_sessions: 1',
  'delegation:', '  max_iterations: 50',
  'providers: {}', 'fallback_providers: []',
  'mcp_servers:', '  n8n-oracle:', '    url: "http://localhost:5679/mcp-server/http"', '    tools:', '      include:', '        - search_workflows', '        - get_workflow_details', '        - search_nodes',
  '  cerveau:', '    command: node', '    tools:', '      include: [chercher, lire]',
  'approvals:', '  deny:', '    - "*git push*"', '    - "*git commit*"', '    - "*vercel*"', '    - "*appliquer-migration*"',
  '    - "*presti-secrets*"', '    - "*file-n8n.jeton*"', '    - "*.env.local*"', '    - "*npm run build*"', '    - "*next build*"',
].join('\n')
const PETITES = ['model:', '  default: gpt-oss-120b', '  provider: freellmapi', 'mcp_servers: {}'].join('\n')
const CORRECTIFS = { credentials: 'key.startswith(("sk-ant-api", "sk-ant-usr"))', tuiSource: 'for (let i = 0; !sid && i < 1200; i += 1)', tuiDist: 'for (let i = 0; !sid && i < 1200; i += 1)' }
const bonne = controlerConfigHermes({ config: BONNE, petites: PETITES, fichiers: CORRECTIFS })
verifier('configuration conforme : aucun problème', bonne.length === 0, bonne.join(' ; '))

// L'ancienne garde (scripts/verifier-outils-obligatoires.mjs avant le 02/11) : une seule expression régulière.
const ancienne = (conf) => /^\s+-\s*provider:\s*freellmapi/m.test(conf)
const remplace = (de, vers) => { if (!BONNE.includes(de)) throw new Error(`motif absent du banc : ${de}`); return BONNE.replace(de, vers) }
const CAS = [
  ['modèle principal sur freellmapi', remplace('  provider: anthropic', '  provider: freellmapi'), /model\.provider/],
  ['modèle principal non Claude', remplace('  default: claude-haiku-5-5', '  default: gpt-oss-120b'), /model\.default/],
  ['repli en liste au retrait de la clé', remplace('fallback_providers: []', 'fallback_providers:\n- provider: freellmapi'), /fallback_providers/],
  ['repli en liste en ligne', remplace('fallback_providers: []', 'fallback_providers: [{provider: freellmapi}]'), /fallback_providers/],
  ['repli en fallback_model', remplace('fallback_providers: []', 'fallback_providers: []\nfallback_model:\n  provider: freellmapi\n  model: gpt-oss-120b'), /fallback_model/],
  ['sous-agents sur freellmapi', remplace('  max_iterations: 50', '  max_iterations: 50\n  provider: freellmapi'), /delegation\.provider/],
  ['tâche auxiliaire sur freellmapi', BONNE + '\nauxiliary:\n  vision:\n    provider: freellmapi', /auxiliaire/],
  ['freellmapi dans le profil principal', remplace('providers: {}', 'providers:\n  freellmapi:\n    api: http://127.0.0.1:3001/v1'), /profil principal/],
  ['outil n8n d’écriture ouvert', remplace('        - search_nodes', '        - search_nodes\n        - update_workflow'), /update_workflow/],
  ['outil tiers explore_node_resources ouvert', remplace('        - search_nodes', '        - search_nodes\n        - explore_node_resources'), /explore_node_resources/],
  ['n8n-oracle sans liste include', remplace('    tools:\n      include:\n        - search_workflows\n        - get_workflow_details\n        - search_nodes\n', ''), /sans liste include/],
  ['git push plus interdit', remplace('    - "*git push*"\n', ''), /git push/],
  ['plus de plafond de durée', remplace('  run_budget_seconds: 3600\n', ''), /run_budget_seconds/],
  ['sessions simultanées permises', remplace('max_concurrent_sessions: 1', 'max_concurrent_sessions:'), /max_concurrent_sessions/],
  ['MCP cerveau retiré', remplace('  cerveau:\n    command: node\n    tools:\n      include: [chercher, lire]\n', ''), /cerveau/],
  // 031-016 : les cas de l'audit adverse 031-012 (garde-config-hermes.txt), que la liste noire laissait passer
  ['call_agent ouvert (appelle un agent n8n, outils réels)', remplace('        - search_nodes', '        - search_nodes\n        - call_agent'), /call_agent/],
  ['mutate_agent ouvert (modifie un agent n8n)', remplace('        - search_nodes', '        - search_nodes\n        - mutate_agent'), /mutate_agent/],
  ['revert_agent ouvert', remplace('        - search_nodes', '        - search_nodes\n        - revert_agent'), /revert_agent/],
  ['outil d’un préfixe inconnu ouvert (sync_workflow)', remplace('        - search_nodes', '        - search_nodes\n        - sync_workflow'), /sync_workflow/],
  ['list_credentials ouvert (énumère les identifiants)', remplace('        - search_nodes', '        - search_nodes\n        - list_credentials'), /list_credentials/],
  ['deny réduit à git push (commit, vercel, migrations, build retirés)', BONNE.replace(/\n {4}- "\*(?!git push)[^\n]*/g, ''), /git commit/],
]
// 031-016 : chaque entrée de deny exigée par la règle, retirée seule, est refusée
for (const ligne of ['git commit', 'vercel', 'appliquer-migration', 'presti-secrets', 'file-n8n.jeton', '.env.local', 'npm run build', 'next build']) {
  const echappe = ligne.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  CAS.push([`deny sans « ${ligne} »`, remplace(`\n    - "*${ligne}*"`, ''), new RegExp(`ne bloque plus [^;]*${echappe}`)])
}
const reduit = controlerConfigHermes({ config: BONNE.replace(/\n {4}- "\*(?!git push)[^\n]*/g, ''), petites: PETITES, fichiers: CORRECTIFS })
verifier('deny réduit à git push : les 8 autres entrées exigées sont toutes signalées', reduit.filter((x) => /ne bloque plus/.test(x)).length === 8, reduit.join(' ; '))
for (const [nom, conf, attendu] of CAS) {
  const pb = controlerConfigHermes({ config: conf, petites: PETITES, fichiers: CORRECTIFS })
  verifier(`refusé : ${nom}${ancienne(conf) ? '' : ' (l’ancienne garde le laissait passer)'}`, pb.some((x) => attendu.test(x)), pb.join(' ; ') || 'aucun problème vu')
}
const avecMcp = controlerConfigHermes({ config: BONNE, petites: PETITES.replace('mcp_servers: {}', 'mcp_servers:\n  cerveau:\n    command: node'), fichiers: CORRECTIFS })
verifier('refusé : profil petites-taches avec un MCP', avecMcp.some((x) => /petites-taches/.test(x)), avecMcp.join(' ; '))
for (const [cle, motif] of [['credentials', /sk-ant-usr/], ['tuiSource', /120 s/], ['tuiDist', /dist/]]) {
  const pb = controlerConfigHermes({ config: BONNE, petites: PETITES, fichiers: { ...CORRECTIFS, [cle]: 'version amont sans le correctif' } })
  verifier(`refusé : correctif local perdu (${cle})`, pb.some((x) => motif.test(x)), pb.join(' ; '))
}
const illisible = controlerConfigHermes({ config: BONNE, petites: PETITES, fichiers: { ...CORRECTIFS, credentials: null } })
verifier('refusé : fichier du correctif illisible', illisible.some((x) => /sk-ant-usr/.test(x)))

// ── 3. La vraie configuration de ce PC ───────────────────────────────────────────────────────────────────────────
const LOCALAPPDATA = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
const H = join(LOCALAPPDATA, 'hermes')
if (!existsSync(join(H, 'config.yaml'))) console.log('— configuration réelle : sautée (Hermes absent de ce poste)')
else {
  const lire = (p) => { try { return readFileSync(p, 'utf8') } catch { return null } }
  const HA = join(H, 'hermes-agent')
  const pb = controlerConfigHermes({
    config: lire(join(H, 'config.yaml')),
    petites: lire(join(H, 'profiles', 'petites-taches', 'config.yaml')),
    fichiers: { credentials: lire(join(HA, 'agent', 'anthropic_credentials.py')), tuiSource: lire(join(HA, 'ui-tui', 'src', 'app', 'createGatewayEventHandler.ts')), tuiDist: lire(join(HA, 'ui-tui', 'dist', 'entry.js')) },
  })
  verifier('configuration réelle de Hermes conforme', pb.length === 0, pb.join(' ; '))
}

console.log(echecs ? `\n${echecs} vérification(s) en échec` : '\nToutes les vérifications passent')
process.exit(echecs ? 1 : 0)
