// scripts/usine/openclaw/lanceur.mjs — fiche 026-221 : le lanceur d'OpenClaw confiné sur l'usine (module ESM).
//
// Ce que ce module EST. Le contrat de la fiche (`node scripts/juges-026-completude-qa.mjs --contrat=openclaw`, juge
// `--partie=openclaw`, critères OC-1 à OC-13) demande cinq fonctions pures : configuration(), preparerLancement(), lancer(),
// sortieAutorisee(), choisirModele(). Elles décrivent le PROFIL D'ISOLEMENT d'OpenClaw sur l'usine Oracle et refusent, AVANT tout
// appel à docker ou au réseau, ce qui l'élargirait : abonnement Claude, jeton Claude, utilisateur root, mode privilégié, montage
// du coffre ou de la socket docker, port hors 127.0.0.1, sortie hors liste, donnée de prospect hors d'Ollama local.
//
// Ce que ce module n'EST PAS : la façon dont OpenClaw tourne aujourd'hui. L'installation réelle (28/09/2026, presti-ops/usine/
// openclaw/, copie versionnée reprise-cloud/usine/openclaw/) se lance par `docker compose` (installer.sh), avec des montages de
// dossiers dédiés sous /srv/openclaw et deux conteneurs (le conteneur isolé « openclaw » et son relais « openclaw-relais »).
// Le contrat du juge (écrit le 27/09, avant l'installation) suppose un `docker run` à volumes NOMMÉS : `preparerLancement` en
// donne la forme, utile pour une relance de secours hors compose. Les écarts entre les deux sont écrits, un par un, dans
// docs/agents/openclaw.md (« Contrat du juge et installation réelle »), jamais cachés. Et l'installation réelle se contrôle,
// elle, par `controlerInstallation` (ci-dessous) : `node scripts/usine/openclaw/lanceur.mjs --controler` lit `docker inspect
// openclaw` sur l'usine et rend ok / les écarts. C'est ce contrôle qui rattache l'installation existante à la fiche.
//
// Règles tenues (décision de Benj du 26/09) : jamais l'abonnement Claude ni un jeton Claude ; conteneur isolé ; modèles gratuits
// seulement (Ollama local, Ollama Cloud gratuit, freellmapi) ; la donnée d'un prospect ne va qu'à Ollama LOCAL, jamais à un modèle
// :cloud ni à freellmapi ; OpenClaw n'est pas une porte d'envoi. Aucun secret n'est lu ici : les clés vivent dans des fichiers
// montés en lecture seule (/run/secrets/*), jamais dans l'environnement ni dans cet argv.
//
// Usage (hors contrat du juge) :
//   node scripts/usine/openclaw/lanceur.mjs --diagnostic          la configuration, sans aucune valeur sensible
//   node scripts/usine/openclaw/lanceur.mjs --argv                le `docker run` de secours que prépare preparerLancement
//   node scripts/usine/openclaw/lanceur.mjs --controler           `docker inspect openclaw` sur l'usine (ssh) contre le profil
//   node scripts/usine/openclaw/lanceur.mjs --controler --inspect=<fichier.json>   le même contrôle sur un `docker inspect` déjà pris
// Codes : 0 conforme ; 1 écart ; 2 usage ou usine injoignable.

const CONFIG = {
  nom: 'openclaw',
  // Empreinte relevée sur l'usine le 04/10/2026 (`docker image inspect ghcr.io/openclaw/openclaw:2026.9.6-slim`), identique à celle
  // de presti-ops/usine/openclaw/LISEZMOI.md. L'image 2026.9.6-slim (révision eb377ac) est arm64.
  image: 'ghcr.io/openclaw/openclaw@sha256:0a5ff5e682e62afa19149df126aa50063bf65ef885b5c94713ce32dc0eb12e15',
  utilisateur: '995:989', // compte système « openclaw », sans shell
  lecture_seule: true,
  privilegie: false,
  capacites: [],
  // Forme `docker run` (relance de secours) : des volumes NOMMÉS. La forme compose, réelle, monte des dossiers dédiés : voir
  // montages_installation.
  volumes: [
    { source: 'openclaw-etat', cible: '/home/node/.openclaw' },
    { source: 'openclaw-travail', cible: '/work' },
    { source: 'openclaw-relais', cible: '/relais' },
    { source: 'openclaw-pont', cible: '/opt/pont', ro: true },
    { source: 'openclaw-secrets', cible: '/run/secrets', ro: true },
  ],
  tmpfs: ['/tmp:size=512m,mode=1777', '/home/node:size=256m,uid=995,gid=989,mode=0700'],
  memoire: '4g',
  cpus: '1.5',
  pids: 512,
  // L'interface de contrôle : publiée sur 127.0.0.1:18800, atteinte par tunnel ssh seulement.
  ports: [{ hote: '127.0.0.1', port: 18800, conteneur: 18789 }],
  reseau: 'openclaw_isole',
  // Les NOMS des variables transmises au conteneur. Aucune clé : celle de freellmapi est un FICHIER monté en lecture seule.
  env: ['HOME', 'OPENCLAW_HOME', 'OPENCLAW_STATE_DIR', 'OPENCLAW_CONFIG_PATH', 'OPENCLAW_DISABLE_BONJOUR', 'DO_NOT_TRACK', 'TZ', 'NODE_OPTIONS'],
  // Leurs valeurs fixes (aucune n'est un secret) ; une valeur passée par l'appelant prévaut.
  env_fixes: {
    HOME: '/home/node', OPENCLAW_HOME: '/home/node', OPENCLAW_STATE_DIR: '/home/node/.openclaw', OPENCLAW_CONFIG_PATH: '/home/node/.openclaw/openclaw.json',
    OPENCLAW_DISABLE_BONJOUR: '1', DO_NOT_TRACK: '1', TZ: 'Europe/Paris', NODE_OPTIONS: '--max-old-space-size=2048',
  },
  entrypoint: ['tini', '-s', '--', 'sh', '/opt/pont/lancer.sh'],
  // Vu DEPUIS le conteneur : Ollama et freellmapi n'écoutent que sur 127.0.0.1 de l'usine ; le pont (pont.mjs, sockets Unix, relais
  // « openclaw-relais ») les expose sur le 127.0.0.1 du conteneur. Ollama Cloud est servi PAR l'Ollama local (le conteneur n'ouvre
  // pas ollama.com lui-même) : la sortie « ollama-cloud » déclare où partent réellement les données.
  sorties: [
    { role: 'ollama-local', url: 'http://127.0.0.1:11434' },
    { role: 'ollama-cloud', url: 'https://ollama.com' },
    { role: 'freellmapi', url: 'http://127.0.0.1:3001' },
  ],
  // Chaque modèle déclare sa voie : le nom ne dit pas où partent les données (l'API directe d'ollama.com n'a pas de suffixe -cloud).
  modeles: [
    { fournisseur: 'ollama', modele: 'qwen3:8b-q4_K_M', voie: 'ollama-local' },
    { fournisseur: 'ollama', modele: 'gpt-oss:120b-cloud', voie: 'ollama-cloud' },
    { fournisseur: 'freellmapi', modele: 'gemini-3-flash-preview', voie: 'freellmapi' },
    { fournisseur: 'freellmapi', modele: 'ministral-14b', voie: 'freellmapi' },
    { fournisseur: 'freellmapi', modele: 'gpt-oss-120b', voie: 'freellmapi' },
  ],
  // ── l'installation RÉELLE (compose), hors contrat du juge : ce que `controlerInstallation` vérifie ───────────────────────────
  montages_installation: [
    { source: '/srv/openclaw/etat', cible: '/home/node/.openclaw', mode: 'rw' },
    { source: '/srv/openclaw/work', cible: '/work', mode: 'rw' },
    { source: '/srv/openclaw/relais', cible: '/relais', mode: 'rw' },
    { source: '/srv/openclaw/pont', cible: '/opt/pont', mode: 'ro' },
    { source: '/srv/openclaw/secrets/freellmapi.key', cible: '/run/secrets/freellmapi.key', mode: 'ro' },
    { source: '/srv/openclaw/secrets/gateway.token', cible: '/run/secrets/gateway.token', mode: 'ro' },
  ],
  // Variables que l'IMAGE pose elle-même (docker inspect les montre) : ni secrets ni choix de Presti.
  env_image: ['PATH', 'NODE_VERSION', 'YARN_VERSION', 'COREPACK_HOME', 'PLAYWRIGHT_BROWSERS_PATH', 'NODE_ENV'],
  // Écarts CONNUS entre le contrat de la fiche et l'installation (acceptés le 28/09, voir LISEZMOI et docs/agents/openclaw.md) :
  // jamais un critère vert déguisé, toujours imprimés par --controler.
  ecarts_connus: [
    'sorties réseau : la liste fermée est vérifiée pour les VOIES MODÈLES (sortieAutorisee, choisirModele) ; le conteneur garde un accès Internet sortant pour web_fetch / web_search, sans pare-feu (iptables interdit sur l\'usine)',
    'montages : dossiers dédiés sous /srv/openclaw (liste fermée montages_installation), pas des volumes nommés comme dans la forme docker run',
    'relais : le conteneur « openclaw-relais » est en réseau hôte (node seul, 128 Mo, lecture seule, toutes capacités retirées) : il porte les sockets Unix vers Ollama et freellmapi',
    'service de métadonnées Oracle (169.254.169.254) joignable depuis le conteneur, comme depuis tout conteneur',
  ],
}

export function configuration() { return structuredClone(CONFIG) }

const NOM_CLAUDE = /ANTHROPIC|CLAUDE/i
const JETON_CLAUDE = /sk-ant-/i
const MODELE_CLAUDE = /claude|anthropic|sonnet|opus|haiku/i
const HOTE_CLAUDE = /(^|\.)anthropic\.com$|(^|\.)claude\.(ai|com)$/i
const FOURNISSEURS = ['ollama', 'freellmapi']
const refus = (code, raison) => ({ refus: code, raison })

function interne(hote) {
  const h = hote.toLowerCase()
  if (h === 'host.docker.internal' || h === '127.0.0.1') return true
  if (/^[a-z0-9-]+$/.test(h)) return true // nom de service du réseau docker, sans point
  const m = h.match(/^(\d+)\.(\d+)\.\d+\.\d+$/)
  if (!m) return false
  const [a, b] = [Number(m[1]), Number(m[2])]
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}
function sortieAdmissible(s) {
  let u
  try { u = new URL(s.url) } catch { return false }
  if (u.username || u.password || HOTE_CLAUDE.test(u.hostname)) return false
  if (s.role === 'ollama-local') return u.protocol === 'http:' && interne(u.hostname) && u.port === '11434'
  if (s.role === 'ollama-cloud') return u.protocol === 'https:' && u.hostname === 'ollama.com'
  if (s.role === 'freellmapi') return u.protocol === 'http:' && interne(u.hostname)
  return false
}
// Liste fermée : vrai SEULEMENT pour une origine (protocole, hôte, port) déclarée dans configuration().sorties.
export function sortieAutorisee(url, config = CONFIG) {
  let u
  try { u = new URL(url) } catch { return false }
  if (HOTE_CLAUDE.test(u.hostname)) return false
  // Des identifiants dans l'URL (user:pass@hôte) ne font pas partie de l'origine : une origine déclarée ne les rend pas admissibles
  // (un secret collé dans une adresse finirait dans un journal). Trouvé par essai-local.mjs le 04/10/2026.
  if (u.username || u.password) return false
  return config.sorties.some((s) => sortieAdmissible(s) && new URL(s.url).origin === u.origin)
}
const modeleAdmis = (m) => FOURNISSEURS.includes(m?.fournisseur) && !MODELE_CLAUDE.test(String(m?.modele || ''))
const estCloud = (m) => /[:-]cloud$/i.test(String(m.modele))
const FOURNISSEUR_DE_VOIE = { 'ollama-local': 'ollama', 'ollama-cloud': 'ollama', freellmapi: 'freellmapi' }
const voieCoherente = (m, sorties) => FOURNISSEUR_DE_VOIE[m?.voie] === m?.fournisseur && !(m.voie === 'ollama-local' && estCloud(m))
  && (sorties || []).some((s) => s.role === m.voie)
const sourceNommee = (s) => /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(String(s))

// Le `docker run` du profil, ou un refus (code + raison) : jamais d'appel à docker ni au réseau ici.
export function preparerLancement({ config, env = {} }) {
  const c = config
  if (!/@sha256:[0-9a-f]{64}$/.test(String(c.image || ''))) return refus('image_non_epinglee', 'image sans empreinte sha256')
  if (!Array.isArray(c.modeles) || !c.modeles.length || !c.modeles.every(modeleAdmis)) return refus('abonnement_claude', 'modèle hors des voies gratuites')
  if (!c.modeles.every((m) => voieCoherente(m, c.sorties))) return refus('voie_modele', 'modèle sans voie déclarée cohérente')
  for (const nom of c.env || []) {
    if (NOM_CLAUDE.test(nom)) return refus('jeton_claude', `variable ${nom} refusée`)
    if (JETON_CLAUDE.test(String(env[nom] ?? ''))) return refus('jeton_claude', `la variable ${nom} porte un jeton Claude`)
  }
  if (!c.utilisateur || /^(root|0)(:|$)/.test(String(c.utilisateur))) return refus('utilisateur_privilegie', 'utilisateur root')
  if (c.privilegie === true || (c.capacites || []).length) return refus('mode_privilegie', 'mode privilégié ou capacité ajoutée')
  if (['host', 'bridge', 'default', 'none', ''].includes(String(c.reseau || ''))) return refus('reseau_hote', 'réseau dédié exigé')
  if (c.lecture_seule !== true) return refus('fs_ecriture', 'système de fichiers en écriture')
  for (const v of c.volumes || []) if (!sourceNommee(v.source)) return refus('montage_interdit', 'montage d\'un chemin de l\'hôte')
  if (!c.memoire || !c.cpus || !c.pids) return refus('limites', 'limites CPU, mémoire ou processus absentes')
  for (const p of c.ports || []) if (p.hote !== '127.0.0.1') return refus('port_expose', 'port d\'administration hors localhost')
  if (!Array.isArray(c.sorties) || !c.sorties.every(sortieAdmissible)) return refus('sortie_hors_liste', 'sortie réseau hors de la liste fermée')

  // Seules les variables NOMMÉES par la configuration passent, avec la valeur de l'appelant sinon la valeur fixe. Jamais process.env.
  const valeur = (n) => (env[n] !== undefined && env[n] !== '' ? env[n] : c.env_fixes?.[n])
  const noms = (c.env || []).filter((n) => valeur(n) !== undefined && valeur(n) !== '')
  const argv = ['run', '-d', '--name', c.nom, '--restart', 'unless-stopped', '--user', c.utilisateur, '--read-only', '--cap-drop=ALL',
    '--security-opt=no-new-privileges:true', '--memory', c.memoire, '--cpus', String(c.cpus), '--pids-limit', String(c.pids),
    '--network', c.reseau,
    ...(c.tmpfs || []).flatMap((t) => ['--tmpfs', t]),
    ...(c.volumes || []).flatMap((v) => ['-v', `${v.source}:${v.cible}${v.ro ? ':ro' : ''}`]),
    ...(c.ports || []).flatMap((p) => ['-p', `127.0.0.1:${p.port}:${p.conteneur}`]),
    ...noms.flatMap((n) => ['-e', n]),
    ...(c.entrypoint?.length ? ['--entrypoint', c.entrypoint[0]] : []),
    c.image,
    ...(c.entrypoint?.slice(1) || [])]
  const envConteneur = Object.fromEntries(noms.map((n) => [n, valeur(n)]))
  const diagnostic = [`image ${c.image}`, `utilisateur ${c.utilisateur}`, `variables ${noms.join(',') || 'aucune'}`, `sorties ${c.sorties.map((s) => s.role).join(',')}`]
  return { argv, env: envConteneur, diagnostic }
}

// Un refus arrive AVANT tout appel à deps.docker ou deps.connecter ; sinon docker est appelé UNE fois avec l'argv de preparerLancement.
export async function lancer({ config, env = {}, deps }) {
  const p = preparerLancement({ config, env })
  if (p.refus) { deps.journal?.(`refus ${p.refus}`); return p }
  for (const l of p.diagnostic) deps.journal?.(l)
  await deps.docker(p.argv, p.env)
  return { ok: true, argv: p.argv }
}

// Le modèle d'une tâche. Seule une donnée classée 'publique' ouvre Ollama Cloud et freellmapi ; une classe absente, vide ou
// inconnue (« Prospect », « client »…) reste fermée comme un prospect : Ollama LOCAL seulement, sinon refus (l'outil reste arrêté).
export function choisirModele({ donnees, disponibles = {}, prefere = null, config = CONFIG }) {
  if (prefere && !modeleAdmis(prefere)) return refus('abonnement_claude', 'modèle demandé hors des voies gratuites')
  // Le classement suit la VOIE déclarée, jamais le nom ; une préférence n'emmène jamais une donnée de prospect hors d'Ollama
  // local (elle est ignorée).
  const locaux = config.modeles.filter((m) => m.voie === 'ollama-local' && m.fournisseur === 'ollama' && !estCloud(m))
  const nuages = config.modeles.filter((m) => m.voie === 'ollama-cloud' && m.fournisseur === 'ollama')
  const libres = config.modeles.filter((m) => m.voie === 'freellmapi' && m.fournisseur === 'freellmapi')
  if (donnees !== 'publique') {
    if (disponibles['ollama-local'] && locaux.length) return { ...locaux[0], voie: 'ollama-local' }
    return refus('donnees_prospect', 'Ollama local indisponible : un prospect ne va ni au cloud ni à freellmapi')
  }
  if (disponibles['ollama-local'] && locaux.length) return { ...locaux[0], voie: 'ollama-local' }
  if (disponibles['ollama-cloud'] && nuages.length) return { ...nuages[0], voie: 'ollama-cloud' }
  if (disponibles.freellmapi && libres.length) return { ...libres[0], voie: 'freellmapi' }
  return refus('aucun_modele_gratuit', 'aucune voie gratuite disponible : OpenClaw reste arrêté')
}

// ── hors contrat du juge : l'installation RÉELLE ────────────────────────────────────────────────────────────────────────────
// Ne garde d'un `docker inspect` que ce qui se contrôle, et seulement les NOMS des variables d'environnement (jamais leurs valeurs).
export function reduireInspect(j) {
  const x = Array.isArray(j) ? j[0] : j
  const h = x?.HostConfig || {}
  const c = x?.Config || {}
  return {
    nom: String(x?.Name || '').replace(/^\//, ''),
    image_demandee: c.Image ?? null,
    image_id: x?.Image ?? null,
    utilisateur: c.User ?? null,
    lecture_seule: h.ReadonlyRootfs === true,
    privilegie: h.Privileged === true,
    cap_add: h.CapAdd || [],
    cap_drop: h.CapDrop || [],
    options_securite: h.SecurityOpt || [],
    memoire: h.Memory ?? null,
    cpus: h.NanoCpus != null ? h.NanoCpus / 1e9 : null,
    pids: h.PidsLimit ?? null,
    reseau: h.NetworkMode ?? null,
    ports: Object.entries(h.PortBindings || {}).flatMap(([cible, l]) => (l || []).map((b) => ({ conteneur: cible, hote: b.HostIp || '', port: b.HostPort || '' }))),
    montages: (h.Binds || []).map((b) => { const p = String(b).split(':'); return { source: p[0], cible: p[1], mode: p[2] || 'rw' } }),
    tmpfs: Object.keys(h.Tmpfs || {}),
    peripheriques: h.Devices || [],
    pid: h.PidMode || '', ipc: h.IpcMode || '', userns: h.UsernsMode || '',
    env_noms: (c.Env || []).map((e) => String(e).split('=')[0]),
    redemarrage: h.RestartPolicy?.Name || '',
  }
}

// Compare l'installation réelle (docker inspect réduit) au profil. { ok, ecarts: [...], ecarts_connus: [...] }
export function controlerInstallation(inspect, config = CONFIG) {
  const r = inspect && inspect.env_noms ? inspect : reduireInspect(inspect)
  const e = []
  const [uid, gid] = String(config.utilisateur).split(':')
  const digest = String(config.image).split('@')[1]
  if (r.image_id !== digest) e.push(`image : ${r.image_id ?? 'inconnue'} au lieu de ${digest}`)
  if (r.utilisateur !== config.utilisateur) e.push(`utilisateur : ${r.utilisateur ?? 'aucun (root)'} au lieu de ${config.utilisateur}`)
  else if (!uid || uid === '0' || !gid) e.push('utilisateur du profil root ou incomplet')
  if (!r.lecture_seule) e.push('système de fichiers en écriture')
  if (r.privilegie) e.push('mode privilégié')
  if (r.cap_add.length) e.push(`capacités ajoutées : ${r.cap_add.join(',')}`)
  if (!r.cap_drop.map(String).map((x) => x.toUpperCase()).includes('ALL')) e.push('capacités : --cap-drop=ALL absent')
  if (!r.options_securite.some((o) => /^no-new-privileges(:true|=true)?$/.test(o))) e.push('no-new-privileges absent')
  if (r.memoire !== 4 * 1024 ** 3) e.push(`mémoire : ${r.memoire} au lieu de 4 Go`)
  if (r.cpus !== Number(config.cpus)) e.push(`processeurs : ${r.cpus} au lieu de ${config.cpus}`)
  if (r.pids !== config.pids) e.push(`processus : ${r.pids} au lieu de ${config.pids}`)
  if (r.reseau !== config.reseau || ['host', 'bridge', 'default', 'none'].includes(r.reseau)) e.push(`réseau : ${r.reseau} (dédié « ${config.reseau} » attendu)`)
  const attendus = (config.ports || []).map((p) => `${p.hote}:${p.port}->${p.conteneur}/tcp`)
  const vus = r.ports.map((p) => `${p.hote}:${p.port}->${p.conteneur}`)
  for (const p of vus) if (!p.startsWith('127.0.0.1:')) e.push(`port publié hors localhost : ${p}`)
  for (const a of attendus) if (!vus.includes(a)) e.push(`port attendu absent : ${a}`)
  for (const v of vus) if (!attendus.includes(v)) e.push(`port publié non prévu : ${v}`)
  const prevus = new Set((config.montages_installation || []).map((m) => `${m.source}|${m.cible}|${m.mode}`))
  for (const m of r.montages) {
    if (/docker\.sock/i.test(`${m.source} ${m.cible}`)) e.push(`socket docker montée : ${m.source}`)
    if (!prevus.has(`${m.source}|${m.cible}|${m.mode}`)) e.push(`montage hors liste : ${m.source} → ${m.cible} (${m.mode})`)
  }
  const vusM = new Set(r.montages.map((m) => `${m.source}|${m.cible}|${m.mode}`))
  for (const p of prevus) if (!vusM.has(p)) e.push(`montage prévu absent : ${p.split('|').slice(0, 2).join(' → ')}`)
  if (r.peripheriques.length) e.push('périphériques exposés')
  if (r.pid === 'host' || r.ipc === 'host' || r.userns === 'host') e.push('espace de noms de l\'hôte partagé (pid, ipc ou userns)')
  const permis = new Set([...(config.env || []), ...(config.env_image || [])])
  for (const n of r.env_noms) {
    if (NOM_CLAUDE.test(n)) e.push(`variable ${n} : un jeton Claude n'a rien à faire ici`)
    else if (/KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL/i.test(n)) e.push(`variable ${n} : un secret dans l'environnement (la clé freellmapi est un fichier monté)`)
    else if (!permis.has(n)) e.push(`variable ${n} : hors des noms prévus`)
  }
  if (!/^unless-stopped$/.test(r.redemarrage)) e.push(`politique de redémarrage : ${r.redemarrage || 'aucune'} (unless-stopped attendu)`)
  return { ok: e.length === 0, ecarts: e, ecarts_connus: config.ecarts_connus.slice() }
}

// Les modèles que l'installation sert (openclaw.json : providers.*.models, primary et fallbacks) contre configuration().modeles.
export function controlerModeles(openclawJson, config = CONFIG) {
  const e = []
  const declares = new Set(config.modeles.map((m) => `${m.fournisseur}/${m.modele}`))
  const servis = new Set()
  for (const [p, d] of Object.entries(openclawJson?.models?.providers || {})) for (const m of d.models || []) servis.add(`${p}/${m.id}`)
  const m = openclawJson?.agents?.defaults?.model || {}
  const utilises = [m.primary, ...(m.fallbacks || [])].filter(Boolean)
  for (const u of utilises) {
    if (MODELE_CLAUDE.test(u) || /^(anthropic|claude)\//i.test(u)) e.push(`modèle utilisé ${u} : Claude interdit`)
    else if (!declares.has(u)) e.push(`modèle utilisé ${u} : absent de configuration().modeles (sa voie n'est pas déclarée)`)
    if (!servis.has(u)) e.push(`modèle utilisé ${u} : absent du catalogue de openclaw.json`)
  }
  for (const s of servis) if (/^(anthropic|claude)\//i.test(s) || MODELE_CLAUDE.test(s)) e.push(`catalogue : ${s} (Claude interdit)`)
  const plug = openclawJson?.plugins?.deny || []
  if (!plug.includes('anthropic')) e.push('plugins.deny ne contient pas « anthropic »')
  if (openclawJson?.telemetry?.enabled !== false) e.push('telemetry.enabled n\'est pas false')
  if (openclawJson?.agents?.defaults?.heartbeat?.every !== '0m') e.push('heartbeat actif (« 0m » attendu : rien ne tourne tout seul)')
  const refuses = new Set(openclawJson?.tools?.deny || [])
  for (const g of ['group:runtime', 'group:messaging', 'group:nodes', 'group:automation']) if (!refuses.has(g)) e.push(`tools.deny sans ${g} (pas de shell, pas de messagerie)`)
  return { ok: e.length === 0, ecarts: e }
}

// ── la ligne de commande ─────────────────────────────────────────────────────────────────────────────────────────────────────
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const estPrincipal = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (estPrincipal) {
  const arg = (n) => { const a = process.argv.slice(2).find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : (process.argv.includes(`--${n}`) ? 'oui' : null) }
  const dire = (t) => console.log(t)
  const fs = await import('node:fs')
  const code = await (async () => {
    if (arg('diagnostic')) {
      const c = configuration(); delete c.montages_installation; delete c.ecarts_connus
      dire(JSON.stringify({ ...c, env_fixes: Object.keys(c.env_fixes) }, null, 2)); return 0
    }
    if (arg('argv')) {
      const p = preparerLancement({ config: configuration(), env: {} })
      if (p.refus) { dire(`refus ${p.refus} : ${p.raison}`); return 1 }
      dire(['docker', ...p.argv].join(' ')); return 0
    }
    if (arg('controler')) {
      let brut
      const fichier = arg('inspect')
      const { spawnSync } = await import('node:child_process')
      // Lecture seule sur l'usine : docker local si on y est, sinon le même docker par ssh (tableau d'arguments, jamais un texte de
      // l'utilisateur dans la commande distante : seules des constantes de ce fichier y passent).
      const lireDocker = (argsDocker) => {
        const local = spawnSync('docker', argsDocker, { encoding: 'utf8', timeout: 30000 })
        if (!local.error && local.status === 0) return local
        const cle = process.env.OPENCLAW_CLE || path.join(process.env.HOME || process.env.USERPROFILE || '', '.ssh', 'presti-usine')
        return spawnSync('ssh', ['-i', cle, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', process.env.OPENCLAW_USINE || 'usine@88.96.53.3', `docker ${argsDocker.join(' ')}`], { encoding: 'utf8', timeout: 45000 })
      }
      if (fichier && fichier !== 'oui') brut = JSON.parse(fs.readFileSync(fichier, 'utf8'))
      else {
        const r = lireDocker(['inspect', 'openclaw'])
        if (r.error || r.status !== 0) { console.error(`✗ docker inspect openclaw impossible (usine injoignable ?) : ${String(r.stderr || r.error?.message || '').slice(0, 200)}`); return 2 }
        try { brut = JSON.parse(r.stdout) } catch { console.error('✗ sortie de docker inspect illisible'); return 2 }
      }
      const rep = controlerInstallation(brut)
      // Les modèles servis : la config VIVANTE du conteneur (rien n'en est imprimé que les écarts), sinon la copie versionnée de
      // presti-ops, sinon celle de reprise-cloud (un instantané qui peut dater). La source lue est toujours nommée.
      let modeles = null
      let source = null
      const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
      const essais = []
      if (arg('config') && arg('config') !== 'oui') essais.push(['fichier', () => fs.readFileSync(arg('config'), 'utf8'), arg('config')])
      else {
        if (!(fichier && fichier !== 'oui')) essais.push(['config vivante du conteneur (docker exec)', () => { const r = lireDocker(['exec', 'openclaw', 'cat', '/home/node/.openclaw/openclaw.json']); if (r.error || r.status !== 0) throw new Error('lecture impossible'); return r.stdout }, null])
        essais.push(['copie versionnée presti-ops', () => fs.readFileSync(path.join(racine, '..', 'presti-ops', 'usine', 'openclaw', 'openclaw.json'), 'utf8'), null])
        essais.push(['instantané reprise-cloud (peut dater)', () => fs.readFileSync(path.join(racine, 'reprise-cloud', 'usine', 'openclaw', 'openclaw.json'), 'utf8'), null])
      }
      for (const [nomSource, lire] of essais) {
        try { modeles = controlerModeles(JSON.parse(lire())); source = nomSource; break } catch { /* source suivante */ }
      }
      dire(`# installation OpenClaw contre le profil de 026-221 : ${rep.ok ? 'CONFORME' : 'ÉCARTS'}`)
      for (const x of rep.ecarts) dire(`  ✗ ${x}`)
      if (modeles) { dire(`# modèles servis (${source}) : ${modeles.ok ? 'CONFORMES' : 'ÉCARTS'}`); for (const x of modeles.ecarts) dire(`  ✗ ${x}`) }
      else dire('# modèles servis : aucune config lisible (conteneur et copies), non contrôlés')
      dire('# écarts connus et acceptés (jamais un critère vert déguisé) :')
      for (const x of rep.ecarts_connus) dire(`  · ${x}`)
      return rep.ok && (!modeles || modeles.ok) ? 0 : 1
    }
    console.error('usage : lanceur.mjs --diagnostic | --argv | --controler [--inspect=<fichier>] [--config=<openclaw.json>]'); return 2
  })()
  process.exitCode = code
}
