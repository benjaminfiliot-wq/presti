// Coentreprise d'agents Presti — Managed Agents connectés au cerveau (Obsidian + repo)
// avec MÉMOIRE PERSISTANTE (memory stores) : les agents lisent/écrivent leur mémoire,
// qui survit entre sessions ET se synchronise avec le cerveau Obsidian.
//
// Usage :
//   node scripts/coentreprise.mjs provision      # crée env + 4 memory stores (seed cerveau) + 12 agents, écrit le registre
//   node scripts/coentreprise.mjs run <clé> "<tâche>"   # lance un agent avec sa mémoire attachée
//   node scripts/coentreprise.mjs sync-down      # rapatrie la mémoire cloud → Obsidian + journaux repo
//   node scripts/coentreprise.mjs list           # état du registre
//
// Économe : modèles Haiku par défaut, connaissance dans la MÉMOIRE (pas dans le prompt),
// aucune session lancée automatiquement (seulement via `run`).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { autoriserDepense, jetonDepenseDeLEnv, coutEstimeDeLEnv } from '../lib/agents/depense.mjs'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const KDIR = path.join(ROOT, '.claude', 'agents', 'knowledge')
const VAULT = 'C:/Users/benja/Documents/SaaS'
const VAULT_COENT = path.join(VAULT, 'Coentreprise')
const REGISTRY = path.join(ROOT, 'scripts', 'coentreprise.registry.json')

const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const K = env.ANTHROPIC_API_KEY
if (!K) { console.error('ANTHROPIC_API_KEY manquante'); process.exit(1) }

const BETA_AGENTS = 'managed-agents-2026-04-01'
const BETA_MEM = 'agent-memory-2026-07-22'
const base = { 'x-api-key': K, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }
const api = async (p, { beta = BETA_AGENTS, ...o } = {}) => {
  const garde = autoriserDepense({ agent: 'coentreprise', fournisseur: 'anthropic_api', cout_eur: coutEstimeDeLEnv(), jeton_depense: jetonDepenseDeLEnv() })
  if (!garde.ok) throw new Error(`dépense refusée (${garde.motif}) : une session Managed Agents se paie, seul un jeton de dépense de Benj l'autorise`)
  const r = await fetch('https://api.anthropic.com' + p, { ...o, headers: { ...base, 'anthropic-beta': beta, ...(o.headers || {}) } })
  const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = t }
  if (r.status >= 400) throw new Error(`${p} -> ${r.status} ${typeof j === 'object' ? JSON.stringify(j).slice(0, 300) : j}`)
  return j
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const read = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return '' } }

// ── Les 4 pôles et leurs 12 agents ────────────────────────────────────────────
const POLES = ['audit', 'animation', 'gestion', 'mails']
const AGENTS = [
  { key: 'auditeur', pole: 'audit', name: 'Auditeur', model: 'claude-haiku-4-5', role: "Chef de file AUDIT : vue d'ensemble sécurité & qualité. Contrôle, ne construis pas." },
  { key: 'audit-attaque', pole: 'audit', name: 'Audit offensif', model: 'claude-haiku-4-5', role: "AUDIT offensif (pentest) : rejoue les exploits (IDOR, injection, bypass, escalade), prouve ce qui casse. Lecture + tests non destructifs." },
  { key: 'audit-conformite', pole: 'audit', name: 'Conformité', model: 'claude-haiku-4-5', role: 'AUDIT conformité : RGPD + mentions légales devis/facture (assurance décennale, TVA). Signale, ne tranche pas juridiquement.' },
  { key: 'animateur', pole: 'animation', name: 'Animateur', model: 'claude-haiku-4-5', role: 'Chef de file ANIMATION : motion craft (Apple/Emil), avec retenue. Plans, pas de modif de code.' },
  { key: 'anim-accessibilite', pole: 'animation', name: 'Accessibilité', model: 'claude-haiku-4-5', role: 'ANIMATION a11y/perf : reduced-motion, focus clavier, contraste WCAG (sur chaque accent), transform/opacity only.' },
  { key: 'anim-marque', pole: 'animation', name: 'Direction artistique', model: 'claude-haiku-4-5', role: 'ANIMATION marque : white-label (zéro « Presti » sur la plateforme publique), système d\'accent --pc, cohérence, retenue.' },
  { key: 'gestion', pole: 'gestion', name: 'Gestion', model: 'claude-haiku-4-5', role: 'Chef de file GESTION : santé de la plateforme (site up, base, bans, emails). Vérifie, ne construis pas.' },
  { key: 'gestion-donnees', pole: 'gestion', name: 'Données', model: 'claude-haiku-4-5', role: 'GESTION données : tunnel lien→lead→conversation→devis→facture, métriques agrégées (zéro donnée perso).' },
  { key: 'gestion-fiabilite', pole: 'gestion', name: 'Fiabilité', model: 'claude-haiku-4-5', role: 'GESTION fiabilité : coûts IA, quotas, timeouts Vercel, robustesse « ne rien perdre », idempotence.' },
  { key: 'mails', pole: 'mails', name: 'Mails', model: 'claude-haiku-4-5', role: 'Chef de file MAILS : qualité de chaque email (humain, utile, adapté, sûr), garde-fous (zéro prix, zéro délai inventé).' },
  { key: 'mails-delivrabilite', pole: 'mails', name: 'Délivrabilité', model: 'claude-haiku-4-5', role: 'MAILS délivrabilité : statut Resend, DNS (SPF/DKIM/DMARC/MX), réputation, diagnostic non-délivrance.' },
  { key: 'mails-cycle', pole: 'mails', name: 'Cycle & copy', model: 'claude-haiku-4-5', role: 'MAILS cycle : séquences/relances J+2/5/10, copywriting FR artisan, ton humain, stop à la réponse.' },
]

const KNOW = { audit: 'audit', animation: 'animation', gestion: 'gestion', mails: 'mails' }
// Fichiers du cerveau Obsidian à connecter (référence, read-only côté agent).
const BRAIN_FILES = [
  path.join(VAULT, 'Produit', 'Architecture.md'),
  path.join(VAULT, 'Produit', 'Architecture-v2-Devis-Factures-SiteClient.md'),
  path.join(VAULT, 'Produit', 'Audit-Securite-et-corrections.md'),
  path.join(VAULT, 'Problemes', 'Probleme-devis-voix-artisans.md'),
]

const SYSTEM = (a) => `Tu es un agent de la coentreprise Presti. Rôle : ${a.role}

MÉMOIRE (obligatoire) : une mémoire persistante est montée dans /mnt/memory/. AVANT toute
tâche, lis-y le socle (\`socle-*.md\`), le journal (\`journal.md\`) et le cerveau (\`brain-*.md\`).
APRÈS la tâche, AJOUTE au fichier \`journal.md\` de ta mémoire une entrée datée
(## AAAA-MM-JJ — ${a.name} — titre / Constat / Action / À retenir) : c'est ainsi que tu
apprends et que tu restes connecté au cerveau. N'invente jamais : vérifie (curl le site en
ligne, recherche web) ou dis que tu ne sais pas. Réponds en français, concis et actionnable.`

// ── Provision ────────────────────────────────────────────────────────────────
async function provision() {
  const reg = fs.existsSync(REGISTRY) ? JSON.parse(read(REGISTRY)) : { env: null, stores: {}, agents: {} }

  // 1) Environnement cloud partagé (réseau ouvert pour sonder le site / web).
  if (!reg.env) {
    const e = await api('/v1/environments', { method: 'POST', body: JSON.stringify({ name: 'coentreprise-presti', config: { type: 'cloud', networking: { type: 'unrestricted' } } }) })
    reg.env = e.id; console.log('env créé :', e.id)
  } else console.log('env déjà présent :', reg.env)

  // 2) Un memory store par pôle, seedé depuis le repo + le cerveau Obsidian.
  const brainMems = BRAIN_FILES.map((f) => ({ name: 'brain-' + path.basename(f).replace(/\.md$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'), content: read(f) })).filter((m) => m.content)
  for (const pole of POLES) {
    if (reg.stores[pole]) { console.log(`store ${pole} déjà présent :`, reg.stores[pole]); continue }
    const s = await api('/v1/memory_stores', { beta: BETA_MEM, method: 'POST', body: JSON.stringify({ name: `coentreprise-${pole}`, description: `Mémoire du pôle ${pole} : socle de connaissances, journal d'apprentissage, et extraits du cerveau Presti.` }) })
    reg.stores[pole] = s.id
    const put = (p, content) => api(`/v1/memory_stores/${s.id}/memories`, { beta: BETA_MEM, method: 'POST', body: JSON.stringify({ path: p, content: content.slice(0, 99000) }) })
    await put(`/socle-${pole}.md`, read(path.join(KDIR, `${KNOW[pole]}.md`)) || `# Socle ${pole}`)
    await put(`/journal.md`, read(path.join(KDIR, `${KNOW[pole]}.journal.md`)) || `# Journal d'apprentissage — ${pole}\n`)
    await put(`/protocole.md`, read(path.join(KDIR, 'PROTOCOLE.md')) || '# Protocole coentreprise')
    for (const m of brainMems) await put(`/${m.name}.md`, m.content)
    console.log(`store ${pole} créé :`, s.id, `(+${3 + brainMems.length} mémoires)`)
  }

  // 3) Les 12 agents (config, sans coût de calcul).
  for (const a of AGENTS) {
    if (reg.agents[a.key]) { console.log(`agent ${a.key} déjà présent`); continue }
    const ag = await api('/v1/agents', { method: 'POST', body: JSON.stringify({ name: `Presti — ${a.name}`, model: a.model, system: SYSTEM(a), tools: [{ type: 'agent_toolset_20260401' }] }) })
    reg.agents[a.key] = { id: ag.id, pole: a.pole, name: a.name }
    console.log(`agent ${a.key} créé :`, ag.id)
  }

  fs.writeFileSync(REGISTRY, JSON.stringify(reg, null, 2))
  console.log('\n✅ registre écrit :', REGISTRY)
}

// ── Run ──────────────────────────────────────────────────────────────────────
async function run(key, task) {
  const reg = JSON.parse(read(REGISTRY))
  const a = reg.agents[key]; if (!a) throw new Error(`agent inconnu : ${key} (provision d'abord)`)
  const storeId = reg.stores[a.pole]
  const session = await api('/v1/sessions', { method: 'POST', body: JSON.stringify({
    agent: a.id, environment_id: reg.env, title: `${a.name} — ${new Date().toISOString().slice(0, 16)}`,
    resources: [{ type: 'memory_store', memory_store_id: storeId, access: 'read_write', instructions: 'Ta mémoire de pôle. Lis socle + journal + brain avant de commencer ; écris tes acquis dans journal.md à la fin.' }],
  }) })
  console.log('session:', session.id, '| store:', storeId)
  await api(`/v1/sessions/${session.id}/events`, { method: 'POST', body: JSON.stringify({ events: [{ type: 'user.message', content: [{ type: 'text', text: task }] }] }) })

  // Polling jusqu'à idle (cap 5 min).
  for (let i = 0; i < 100; i++) {
    await sleep(3000)
    const s = await api(`/v1/sessions/${session.id}`)
    if (['idle'].includes(String(s.status))) {
      // vérifie qu'un tour a bien eu lieu (au moins un agent.message)
      const ev = await api(`/v1/sessions/${session.id}/events`)
      const items = ev.data || []
      if (items.some((x) => x.type === 'agent.message') || i > 1) { printResult(items); return }
    }
    if (i % 5 === 0) process.stdout.write('.')
  }
  console.log('\n(timeout d\'attente)')
}
function printResult(items) {
  console.log('\n── Résultat ──')
  for (const it of items) {
    if (it.type === 'agent.message') console.log((it.content || []).map((b) => b.text).filter(Boolean).join(''))
    if (it.type === 'agent.tool_use') console.log(`  [outil: ${it.name}]`)
  }
}

// ── Sync-down : mémoire cloud → Obsidian + journaux repo ──────────────────────
async function syncDown() {
  const reg = JSON.parse(read(REGISTRY))
  if (!fs.existsSync(VAULT_COENT)) fs.mkdirSync(VAULT_COENT, { recursive: true })
  for (const pole of POLES) {
    const storeId = reg.stores[pole]; if (!storeId) continue
    const list = await api(`/v1/memory_stores/${storeId}/memories?path_prefix=/`, { beta: BETA_MEM })
    const mems = list.data || []
    const dir = path.join(VAULT_COENT, pole); fs.mkdirSync(dir, { recursive: true })
    for (const m of mems) {
      const full = await api(`/v1/memory_stores/${storeId}/memories/${m.id}`, { beta: BETA_MEM })
      const fname = (m.path || m.id).replace(/^\//, '').replace(/[\\/]/g, '_')
      fs.writeFileSync(path.join(dir, fname), full.content || '')
      // Le journal de mémoire remonte aussi dans le journal repo (source de vérité versionnée).
      if (/journal/i.test(m.path || '')) fs.writeFileSync(path.join(KDIR, `${KNOW[pole]}.journal.md`), full.content || '')
    }
    console.log(`sync ${pole}: ${mems.length} mémoires → ${dir}`)
  }
  console.log('\n✅ cerveau Obsidian + journaux repo à jour')
}

async function list() {
  const reg = fs.existsSync(REGISTRY) ? JSON.parse(read(REGISTRY)) : null
  if (!reg) { console.log('(pas encore provisionné)'); return }
  console.log('env:', reg.env)
  console.log('stores:', reg.stores)
  console.log('agents:', Object.entries(reg.agents).map(([k, v]) => `${k}→${v.id}`).join('\n  '))
}

const [cmd, ...rest] = process.argv.slice(2)
try {
  if (cmd === 'provision') await provision()
  else if (cmd === 'run') await run(rest[0], rest.slice(1).join(' '))
  else if (cmd === 'sync-down') await syncDown()
  else if (cmd === 'list') await list()
  else console.log('commandes : provision | run <clé> "<tâche>" | sync-down | list')
} catch (e) { console.error('❌', e.message); process.exit(1) }
