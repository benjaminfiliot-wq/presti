// Témoin de 026-220 : implémentation de RÉFÉRENCE du lanceur OpenClaw confiné (jamais déployée, jamais lancée pour de
// vrai). Elle existe pour prouver que le juge `scripts/juges-026-completude-qa.mjs --partie=openclaw` sait être vert,
// et pour que chaque sabotage de --preuve-echecs le rende rouge. Le contrat : `node scripts/juges-026-completude-qa.mjs
// --contrat=openclaw`. Tout est fictif : l'empreinte d'image est celle d'un fichier vide.
//
// Règles tenues (décision du 26/09) : jamais l'abonnement Claude ni un jeton Claude ; conteneur isolé ; modèles
// gratuits seulement (Ollama local, Ollama Cloud gratuit, freellmapi) ; les données d'un prospect ne vont qu'à Ollama
// local, jamais à un modèle :cloud ni à freellmapi. Chaque refus arrive avant tout appel à docker ou au réseau.

const CONFIG = {
  nom: 'openclaw',
  image: 'ghcr.io/openclaw/openclaw@sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  utilisateur: '10001:10001',
  lecture_seule: true,
  privilegie: false,
  capacites: [],
  volumes: [{ source: 'openclaw-travail', cible: '/travail' }],
  tmpfs: ['/tmp'],
  memoire: '2g',
  cpus: '1.5',
  pids: 256,
  ports: [{ hote: '127.0.0.1', port: 18789, conteneur: 18789 }],
  reseau: 'openclaw-sortant',
  env: ['FREELLMAPI_CLE', 'OLLAMA_API_KEY'],
  sorties: [
    { role: 'ollama-local', url: 'http://host.docker.internal:11434' },
    { role: 'ollama-cloud', url: 'https://ollama.com' },
    { role: 'freellmapi', url: 'http://freellmapi:3001' },
  ],
  // Chaque modèle déclare sa voie : l'API directe d'Ollama Cloud (https://ollama.com) nomme ses modèles SANS suffixe
  // « -cloud », le nom ne dit donc pas où partent les données.
  modeles: [
    { fournisseur: 'ollama', modele: 'qwen3:8b', voie: 'ollama-local' },
    { fournisseur: 'ollama', modele: 'gpt-oss:120b', voie: 'ollama-cloud' },
    { fournisseur: 'freellmapi', modele: 'llama-4-scout', voie: 'freellmapi' },
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
export function sortieAutorisee(url, config = CONFIG) {
  let u
  try { u = new URL(url) } catch { return false }
  if (HOTE_CLAUDE.test(u.hostname)) return false
  return config.sorties.some((s) => sortieAdmissible(s) && new URL(s.url).origin === u.origin)
}
const modeleAdmis = (m) => FOURNISSEURS.includes(m?.fournisseur) && !MODELE_CLAUDE.test(String(m?.modele || ''))
const estCloud = (m) => /[:-]cloud$/i.test(String(m.modele))
const FOURNISSEUR_DE_VOIE = { 'ollama-local': 'ollama', 'ollama-cloud': 'ollama', freellmapi: 'freellmapi' }
const voieCoherente = (m, sorties) => FOURNISSEUR_DE_VOIE[m?.voie] === m?.fournisseur && !(m.voie === 'ollama-local' && estCloud(m))
  && (sorties || []).some((s) => s.role === m.voie)
const sourceNommee = (s) => /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(String(s))

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

  const noms = (c.env || []).filter((n) => env[n] !== undefined && env[n] !== '')
  const argv = ['run', '--rm', '--name', c.nom, '--user', c.utilisateur, '--read-only', '--cap-drop=ALL',
    '--security-opt=no-new-privileges:true', '--memory', c.memoire, '--cpus', String(c.cpus), '--pids-limit', String(c.pids),
    '--network', c.reseau,
    ...(c.tmpfs || []).flatMap((t) => ['--tmpfs', t]),
    ...(c.volumes || []).flatMap((v) => ['-v', `${v.source}:${v.cible}`]),
    ...(c.ports || []).flatMap((p) => ['-p', `127.0.0.1:${p.port}:${p.conteneur}`]),
    ...noms.flatMap((n) => ['-e', n]),
    c.image]
  const envConteneur = Object.fromEntries(noms.map((n) => [n, env[n]]))
  const diagnostic = [`image ${c.image}`, `utilisateur ${c.utilisateur}`, `variables ${noms.join(',') || 'aucune'}`, `sorties ${c.sorties.map((s) => s.role).join(',')}`]
  return { argv, env: envConteneur, diagnostic }
}

export async function lancer({ config, env = {}, deps }) {
  const p = preparerLancement({ config, env })
  if (p.refus) { deps.journal?.(`refus ${p.refus}`); return p }
  for (const l of p.diagnostic) deps.journal?.(l)
  await deps.docker(p.argv, p.env)
  return { ok: true, argv: p.argv }
}

export function choisirModele({ donnees, disponibles = {}, prefere = null, config = CONFIG }) {
  if (prefere && !modeleAdmis(prefere)) return refus('abonnement_claude', 'modèle demandé hors des voies gratuites')
  // Le classement suit la VOIE déclarée, jamais le nom ; une préférence n'emmène jamais une donnée de prospect hors
  // d'Ollama local (elle est ignorée).
  const locaux = config.modeles.filter((m) => m.voie === 'ollama-local' && m.fournisseur === 'ollama' && !estCloud(m))
  const nuages = config.modeles.filter((m) => m.voie === 'ollama-cloud' && m.fournisseur === 'ollama')
  const libres = config.modeles.filter((m) => m.voie === 'freellmapi' && m.fournisseur === 'freellmapi')
  // Seule une donnée classée 'publique' ouvre le cloud et freellmapi : une classe absente ou inconnue reste fermée.
  if (donnees !== 'publique') {
    if (disponibles['ollama-local'] && locaux.length) return { ...locaux[0], voie: 'ollama-local' }
    return refus('donnees_prospect', 'Ollama local indisponible : un prospect ne va ni au cloud ni à freellmapi')
  }
  if (disponibles['ollama-local'] && locaux.length) return { ...locaux[0], voie: 'ollama-local' }
  if (disponibles['ollama-cloud'] && nuages.length) return { ...nuages[0], voie: 'ollama-cloud' }
  if (disponibles.freellmapi && libres.length) return { ...libres[0], voie: 'freellmapi' }
  return refus('aucun_modele_gratuit', 'aucune voie gratuite disponible : OpenClaw reste arrêté')
}
