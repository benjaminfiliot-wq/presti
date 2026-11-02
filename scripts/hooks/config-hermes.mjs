// Contrôle de la configuration de Hermes pour le garde des outils obligatoires (audit du chantier 1, 02/11/2026).
// L'ancien contrôle tenait en une expression régulière, qui ne voyait qu'une façon d'écrire un repli vers freellmapi : un
// fallback_model, une liste en ligne, un modèle principal ou des sous-agents sur le modèle gratuit passaient tous. On lit donc
// le YAML pour de vrai (blocs, listes, listes en ligne), et on vérifie aussi ce que l'audit a trouvé sans surveillance : les
// outils d'écriture de n8n-oracle, les plafonds de passage, les commandes interdites et les deux correctifs locaux.

const sansGuillemets = (v) => (/^(['"]).*\1$/.test(v) && v.length >= 2 ? v.slice(1, -1) : v)

function scalaire(brut) {
  const v = brut.trim()
  if (v === '') return ''
  if (v === '{}') return {}
  if (v === '[]') return []
  if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map((x) => scalaire(x)).filter((x) => x !== '')
  if (/^\{.*\}$/.test(v)) {
    const o = {}
    for (const p of v.slice(1, -1).split(',')) {
      const i = p.indexOf(':')
      if (i > 0) o[sansGuillemets(p.slice(0, i).trim())] = scalaire(p.slice(i + 1))
    }
    return o
  }
  if (v === 'true' || v === 'false') return v === 'true'
  if (v === 'null' || v === '~') return null
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  return sansGuillemets(v)
}

// Retire un commentaire de fin de ligne, sauf à l'intérieur de guillemets.
function sansCommentaire(ligne) {
  let guillemet = null
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i]
    if (guillemet) { if (c === guillemet) guillemet = null; continue }
    if (c === '"' || c === "'") guillemet = c
    else if (c === '#' && (i === 0 || /\s/.test(ligne[i - 1]))) return ligne.slice(0, i)
  }
  return ligne
}

const CLE = /^("[^"]*"|'[^']*'|[^:'"[{][^:]*?)\s*:(?:\s+(.*)|\s*)$/

/** Sous-ensemble du YAML en blocs, assez pour config.yaml : cartes, listes (indentées ou au niveau de leur clé), listes et
 *  cartes en ligne, scalaires entre guillemets. Les blocs littéraux (| ou >) sont sautés. */
export function lireYamlBloc(texte) {
  const racine = {}
  const pile = [{ indent: -1, obj: racine }]
  for (const brut of String(texte).split(/\r?\n/)) {
    const l = sansCommentaire(brut).replace(/\s+$/, '')
    if (!l.trim()) continue
    const indent = l.length - l.trimStart().length
    const ligne = l.trim()
    const tiret = ligne === '-' || ligne.startsWith('- ')
    while (pile.length > 1) {
      const h = pile[pile.length - 1]
      if (indent > h.indent) break
      // « clé: » suivie d'une liste au même retrait qu'elle (YAML le permet) : le tiret appartient encore à la clé.
      if (indent === h.indent && tiret && (h.attendListe || Array.isArray(h.obj))) break
      pile.pop()
    }
    const h = pile[pile.length - 1]
    if (h.bloc) continue
    if (tiret) {
      if (h.attendListe && !Array.isArray(h.obj) && Object.keys(h.obj).length === 0) { h.obj = []; h.parent[h.cle] = h.obj }
      if (!Array.isArray(h.obj)) continue
      const reste = ligne.slice(1).trim()
      const m = CLE.exec(reste)
      if (m) {
        const element = {}
        element[sansGuillemets(m[1].trim())] = m[2] === undefined ? {} : scalaire(m[2])
        h.obj.push(element)
        pile.push({ indent, obj: element, parent: h.obj, element: true })
      } else h.obj.push(scalaire(reste))
      continue
    }
    const m = CLE.exec(ligne)
    if (!m || Array.isArray(h.obj)) continue
    const cle = sansGuillemets(m[1].trim())
    const v = m[2]
    if (v === undefined || v === '') {
      h.obj[cle] = {}
      pile.push({ indent, obj: h.obj[cle], parent: h.obj, cle, attendListe: true })
    } else if (/^[|>][-+0-9]*$/.test(v.trim())) {
      h.obj[cle] = ''
      pile.push({ indent, obj: {}, bloc: true })
    } else h.obj[cle] = scalaire(v)
  }
  return racine
}

// Outils de n8n-oracle permis dans l'accès permanent : LISTE BLANCHE (audit 031-012, défaut G ; 031-016). L'ancienne liste noire
// laissait passer tout préfixe neuf (call_agent, mutate_agent, revert_agent…). Seuls get_, search_ et list_ lisent ; list_credentials
// en est exclu (il énumère les identifiants de n8n).
const OUTIL_LECTURE = /^(get|search|list)_[a-z0-9_]+$/
const OUTIL_EXCLU = new Set(['list_credentials'])
const outilPermis = (o) => OUTIL_LECTURE.test(o) && !OUTIL_EXCLU.has(o)
// Chaque commande interdite à Hermes par la règle (.claude/rules/architecture-outils.md, plafonds du 02/11 : « approvals.deny :
// git push/commit, vercel, migrations, secrets, jeton, build ») doit figurer dans approvals.deny ; une seule manquante est refusée.
export const DENY_EXIGES = [
  ['git push', /git push/i], ['git commit', /git commit/i], ['vercel', /vercel/i],
  ['migrations (appliquer-migration)', /appliquer-migration/i], ['secrets (presti-secrets)', /presti-secrets/i],
  ['secrets (.env.local)', /\.env\.local/i], ['jeton de la file (file-n8n.jeton)', /file-n8n\.jeton/i],
  ['build (npm run build)', /npm run build/i], ['build (next build)', /next build/i],
]

const vide = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) ? v.length === 0 : typeof v === 'object' && Object.keys(v).length === 0)

/**
 * @param {{ config: string, petites?: string|null, fichiers?: { credentials?: string|null, tuiSource?: string|null, tuiDist?: string|null } }} entree
 * @returns {string[]} les problèmes trouvés (vide = conforme)
 */
export function controlerConfigHermes({ config, petites = null, fichiers = {} }) {
  const p = []
  const c = lireYamlBloc(config)
  const modele = c.model && typeof c.model === 'object' ? c.model : {}
  if (modele.provider !== 'anthropic') p.push(`modèle principal hors d'Anthropic (model.provider = ${JSON.stringify(modele.provider ?? null)}) : Haiku 5.5 ou Sonnet 5.5 seulement (règle de Benj du 01/11)`)
  if (!/^claude-/.test(String(modele.default ?? ''))) p.push(`modèle principal inattendu (model.default = ${JSON.stringify(modele.default ?? null)})`)
  if (!vide(c.fallback_providers)) p.push('repli de modèle déclaré (fallback_providers) : interdit, la session entière partirait au modèle de repli')
  if (!vide(c.fallback_model)) p.push('repli de modèle déclaré (fallback_model) : interdit')
  if (c.delegation && !vide(c.delegation.provider) && c.delegation.provider !== 'anthropic') p.push(`sous-agents hors d'Anthropic (delegation.provider = ${JSON.stringify(c.delegation.provider)})`)
  for (const [nom, aux] of Object.entries(c.auxiliary && typeof c.auxiliary === 'object' ? c.auxiliary : {})) {
    if (aux && typeof aux === 'object' && /freellmapi/i.test(String(aux.provider ?? ''))) p.push(`tâche auxiliaire ${nom} sur freellmapi`)
  }
  if (c.providers && typeof c.providers === 'object' && c.providers.freellmapi) p.push('freellmapi est revenu dans le profil principal, qui garde les MCP (données de prospects) : utiliser le profil petites-taches')
  const mcp = c.mcp_servers && typeof c.mcp_servers === 'object' ? c.mcp_servers : {}
  if (!mcp['n8n-oracle']) p.push('Hermes ne déclare pas le MCP n8n-oracle')
  if (!mcp.cerveau) p.push('Hermes ne déclare pas le MCP cerveau (réseau neuronal)')
  const inclus = mcp['n8n-oracle']?.tools?.include
  if (mcp['n8n-oracle'] && (!Array.isArray(inclus) || !inclus.length)) p.push('n8n-oracle sans liste include : tous ses outils, y compris d\'écriture, seraient ouverts')
  for (const outil of Array.isArray(inclus) ? inclus : []) if (!outilPermis(String(outil))) p.push(`outil n8n hors de la liste blanche de lecture (get_, search_, list_ sauf list_credentials) ouvert en permanence : ${outil}`)
  const refus = Array.isArray(c.approvals?.deny) ? c.approvals.deny.map(String) : []
  for (const [nom, motif] of DENY_EXIGES) if (!refus.some((r) => motif.test(r))) p.push(`approvals.deny ne bloque plus ${nom} (Orca lance Hermes en --yolo ; architecture-outils.md)`)
  if (!(Number(c.agent?.run_budget_seconds) > 0)) p.push('aucun plafond de durée par passage (agent.run_budget_seconds)')
  if (Number(c.max_concurrent_sessions) !== 1) p.push('plus d\'une session Hermes permise à la fois (max_concurrent_sessions doit valoir 1)')
  if (petites) {
    const pt = lireYamlBloc(petites)
    if (!vide(pt.mcp_servers)) p.push('le profil petites-taches (modèles gratuits) a des serveurs MCP : aucune donnée de prospect ne doit partir chez un fournisseur gratuit')
  }
  const { credentials, tuiSource, tuiDist } = fichiers
  if (credentials !== undefined && !(credentials && /sk-ant-usr/.test(credentials))) p.push('correctif local perdu : agent/anthropic_credentials.py ne reconnaît plus les clés sk-ant-usr (git apply presti-ops/usine/hermes-correctifs/…sk-ant-usr.patch)')
  if (tuiSource !== undefined && !(tuiSource && /i < 1200/.test(tuiSource))) p.push('correctif local perdu : la TUI n\'attend plus la session 120 s (git apply presti-ops/usine/hermes-correctifs/…attente-session-tui-120s.patch)')
  if (tuiDist !== undefined && !(tuiDist && /i < 1200/.test(tuiDist))) p.push('correctif local absent de ui-tui/dist/entry.js : relancer Hermes pour qu\'il reconstruise dist/')
  return p
}
