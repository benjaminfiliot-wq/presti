// scripts/modeles/registre.mjs — LE registre unique des IA et modèles de l'écosystème Presti (ordre de Benj du 08/10/2026 : « tous les
// modèles que j'utilise doivent être accessibles et implémentés pour les agents de l'écosystème »).
//
// Une entrée par IA. Rien de secret ici : une clé n'est jamais écrite, seulement l'ENDROIT où elle se lit (`cle`). Module pur, sans
// effet de bord à l'import, sans dépendance : la sonde (sonde.mjs) l'envoie telle quelle sur l'usine.
//
// Champs
//   id                        identifiant stable (les moteurs du relais gardent le leur : `relais`)
//   famille                   anthropic | openai | google | mistral | cloudflare | cerebras | groq | ollama | agent | recherche | voix
//   acces                     openai-compatible | ollama | anthropic | cli | socket | api-recherche
//   base / commande / socket  où on l'appelle (jamais une clé)
//   modele                    le modèle demandé
//   lieux                     où il doit répondre : 'pc' (le poste de Benj), 'usine' (Oracle ARM, où tournent les agents du bus)
//   branche                   { pc?, usine? } — vrai SEULEMENT si un adaptateur vérifié l'appelle pour de vrai dans ce lieu ; sinon faux
//                             et `reserve[lieu]` dit pourquoi (jamais « branché » par défaut)
//   gratuit / cout            gratuit : jamais pour une donnée de prospect (règle de Benj du 26/09) ; cout : texte
//   aptitudes                 redaction | code | petit-code | relecture | json | recherche web | veille | voix | vision
//   taille                    petite | moyenne | grande | inconnue
//   donnees_personnelles_ok   vrai : peut recevoir une donnée de prospect (Codex, local de l'usine, après le « oui » daté de Benj pour le
//                             local). Faux pour tout IA gratuite ou externe, SANS exception.
//   cle                       { type: 'fichier'|'aucune', pc?, usine?, motif? } — où elle se lit
//   relais                    id du moteur dans CHAINE_SECOURS (scripts/usine/relais-chef.mjs), si présent
//   parc                      nom dans PARC (scripts/passerelle-code/parc.mjs), si présent
//   sonde                     { type, ... } — comment la sonde fait un vrai appel
//   ordre                     rang dans la chaîne publique des agents du bus (plus petit = essayé plus tôt) ; absent : hors chaîne
//   verifie_le                date du dernier constat à la main consigné ici (la sonde, elle, mesure au moment de l'appel)
//
// Règle de choix (choisirModeles) : un agent demande une aptitude, une nature de donnée (« publique » | « prospect ») et un lieu ;
// il reçoit, dans l'ordre, les modèles branchés dans ce lieu qui ont l'aptitude ; pour « prospect », seulement ceux dont
// donnees_personnelles_ok est vrai ET qui ne sont ni gratuits ni distants hors Codex (verrou de relais-chef.mjs).

export const NATURES = Object.freeze(['publique', 'prospect'])
export const LIEUX = Object.freeze(['pc', 'usine'])
export const ACCES = Object.freeze(['openai-compatible', 'ollama', 'anthropic', 'cli', 'socket', 'api-recherche'])
const FL = 'http://127.0.0.1:3001/v1'
const OL = 'http://127.0.0.1:11434'
const FL_CLE = Object.freeze({ type: 'fichier', usine: '/home/usine/.config/presti/freellmapi.key', pc: '../presti-secrets/freellmapi.txt', motif: 'clé du routeur freellmapi (127.0.0.1:3001 sur l\'usine ; lue par sudo, jamais copiée)' })
const AUCUNE = Object.freeze({ type: 'aucune' })
const MSG = 'Réponds uniquement le mot OK.'

function geler(v) { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); for (const x of Object.values(v)) geler(x) } return v }

export const REGISTRE = geler([
  // ── Anthropic ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'claude_haiku', famille: 'anthropic', acces: 'anthropic', base: 'https://api.anthropic.com/v1/messages', modele: 'claude-haiku-5-5',
    lieux: ['pc', 'usine'], branche: { pc: true, usine: false },
    reserve: { usine: 'clé non déployée sur l\'usine : le coffre refuse toute clé de modèle (coffre-regles.mjs, R16 annulée) — geste de Benj, voir docs/agents/modeles-ecosysteme.md ; et PRESTI_HAIKU_ACTIF=oui + PRESTI_HAIKU_COMPTEUR à poser dans les unités' },
    gratuit: false, cout: '0,10 $ le million de jetons en entrée, 0,50 $ en sortie ; plafond du relais 1 $ par jour UTC (compteur partagé chef + preneur)',
    aptitudes: ['redaction', 'code', 'petit-code', 'relecture', 'json'], taille: 'grande', donnees_personnelles_ok: false,
    cle: { type: 'fichier', pc: '../presti-secrets/anthropic-ecosysteme.txt', usine: null, motif: 'PRESTI_HAIKU_CLE ou PRESTI_HAIKU_CLE_FICHIER ; jamais ANTHROPIC_API_KEY de .env.local (401)' },
    relais: 'claude_haiku', parc: 'haiku', ordre: 10, sonde: { type: 'anthropic', thinking: 'disabled' }, verifie_le: '2026-10-08',
  },
  // ── Abonnements et exécutants ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'codex', famille: 'openai', acces: 'cli', commande: 'codex exec (PC : scripts/executant.mjs ; usine : /opt/codex/bin/codex sous chef-modele)', modele: 'gpt-6-sol / gpt-6-luna / gpt-6-astra',
    lieux: ['pc', 'usine'], branche: { pc: true, usine: true },
    gratuit: false, cout: 'abonnement ChatGPT de Benj, une seule réserve pour le PC, l\'usine et le chef',
    aptitudes: ['redaction', 'code', 'petit-code', 'relecture', 'json'], taille: 'grande', donnees_personnelles_ok: true,
    cle: { type: 'fichier', pc: '(connexion de l\'application Codex)', usine: '/home/chef-modele/.codex/auth.json', motif: 'connexion ChatGPT, jamais une clé d\'API' },
    parc: 'codex', ordre: 0, sonde: { type: 'cli', pc: ['node', 'scripts/executant.mjs', 'sonde', '--moteur=codex'], usine: 'codex-usine' }, verifie_le: '2026-10-08',
  },
  {
    id: 'codex_gratuit', famille: 'ollama', acces: 'cli', commande: 'codex exec sur Ollama Cloud (scripts/executant.mjs --moteur=codex-gratuit)', modele: 'gpt-oss:120b-cloud',
    lieux: ['pc'], branche: { pc: false }, reserve: { pc: 'l\'exécutant existe (scripts/executant.mjs --moteur=codex-gratuit) mais PRESTI_CODEX_GRATUIT_URL et PRESTI_CODEX_GRATUIT_CLE ne sont pas posées sur le PC : il s\'arrête avant tout appel' }, gratuit: true, cout: 'compte gratuit Ollama Cloud (quota mensuel)',
    aptitudes: ['redaction', 'code'], taille: 'moyenne', donnees_personnelles_ok: false, cle: AUCUNE,
    parc: 'codex-gratuit', sonde: { type: 'cli', pc: ['node', 'scripts/executant.mjs', 'sonde', '--moteur=codex-gratuit'] }, verifie_le: '2026-10-08',
  },
  {
    id: 'antigravity', famille: 'google', acces: 'cli', commande: 'node scripts/antigravity.mjs (API locale de l\'IDE Antigravity, jeton CSRF relu à chaque appel)', modele: 'gemini flash / pro (flash_lite pour la sonde)',
    lieux: ['pc'], branche: { pc: true }, gratuit: true, cout: 'quota Gemini du compte de Benj (RESOURCE_EXHAUSTED quand épuisé)',
    aptitudes: ['redaction', 'code'], taille: 'grande', donnees_personnelles_ok: false,
    cle: { type: 'aucune', motif: 'l\'IDE Antigravity doit être OUVERT sur le projet' },
    parc: 'antigravity', sonde: { type: 'cli', pc: ['node', 'scripts/antigravity.mjs', 'sonde', '--model=flash_lite'] }, verifie_le: '2026-10-08',
  },
  // ── freellmapi : le routeur gratuit de l'usine (google, mistral, cloudflare ; cerebras sans modèle ; groq refusé) ──────────────
  {
    id: 'freellmapi_gemini', famille: 'google', acces: 'openai-compatible', base: FL, modele: 'gemini-3.8-flash',
    lieux: ['usine'], branche: { usine: true }, gratuit: true, cout: 'gratuit, quota journalier par modèle',
    aptitudes: ['redaction', 'code', 'relecture', 'json'], taille: 'grande', donnees_personnelles_ok: false, cle: FL_CLE,
    relais: 'freellmapi_gemini', ordre: 20, sonde: { type: 'openai' }, verifie_le: '2026-10-08',
  },
  {
    id: 'freellmapi_mistral', famille: 'mistral', acces: 'openai-compatible', base: FL, modele: 'ministral-14b',
    lieux: ['usine'], branche: { usine: true }, gratuit: true, cout: 'gratuit, limité à 2 requêtes par minute',
    aptitudes: ['redaction', 'code', 'relecture', 'json'], taille: 'moyenne', donnees_personnelles_ok: false, cle: FL_CLE,
    relais: 'freellmapi_mistral', ordre: 21, sonde: { type: 'openai' }, verifie_le: '2026-10-08',
  },
  {
    id: 'freellmapi_auto', famille: 'agent', acces: 'openai-compatible', base: FL, modele: 'auto',
    lieux: ['usine'], branche: { usine: true }, gratuit: true, cout: 'gratuit : le routeur choisit un modèle libre parmi ceux qui ont du quota (278 au catalogue, une partie seulement avec clé)',
    aptitudes: ['redaction', 'code', 'relecture', 'json'], taille: 'moyenne', donnees_personnelles_ok: false, cle: FL_CLE,
    relais: 'freellmapi', ordre: 22, sonde: { type: 'openai' }, verifie_le: '2026-10-08',
  },
  {
    id: 'freellmapi_cloudflare', famille: 'cloudflare', acces: 'openai-compatible', base: FL, modele: 'llama-3.3-70b-fp8-fast',
    lieux: ['usine'], branche: { usine: true }, gratuit: true, cout: 'gratuit (Workers AI, clé posée dans freellmapi le 25/09)',
    aptitudes: ['redaction', 'code', 'relecture'], taille: 'grande', donnees_personnelles_ok: false, cle: FL_CLE,
    ordre: 23, sonde: { type: 'openai' }, verifie_le: '2026-10-08',
  },
  {
    id: 'freellmapi_cerebras', famille: 'cerebras', acces: 'openai-compatible', base: FL, modele: '(aucun modèle Cerebras au catalogue du routeur)',
    lieux: ['usine'], branche: { usine: false }, reserve: { usine: 'la clé Cerebras est posée dans freellmapi mais le catalogue appliqué n\'a AUCUN modèle Cerebras (constat du 25/09, docs/contexte-cloud/SaaS/Produit/Ecosysteme-IA-Registre-2026-09-25.md, non revérifié ce jour : le routeur ne dit pas le fournisseur de chaque modèle) ; le routeur « auto » peut en tirer un seul jour où il en aurait un' },
    gratuit: true, cout: 'gratuit', aptitudes: ['redaction'], taille: 'inconnue', donnees_personnelles_ok: false, cle: FL_CLE,
    sonde: { type: 'declare' }, verifie_le: '2026-09-25',
  },
  {
    id: 'groq', famille: 'groq', acces: 'openai-compatible', base: 'https://api.groq.com/openai/v1', modele: '(exclu)',
    lieux: ['usine'], branche: { usine: false }, reserve: { usine: 'EXCLU par Benj le 25/09 : aucune clé Groq ne sera posée' },
    gratuit: true, cout: 'gratuit', aptitudes: [], taille: 'inconnue', donnees_personnelles_ok: false, cle: AUCUNE,
    sonde: { type: 'declare' }, verifie_le: '2026-09-25',
  },
  // ── Ollama : le cloud gratuit, puis les modèles locaux de l'usine ───────────────────────────────────────────────────────────────
  {
    id: 'ollama_cloud', famille: 'ollama', acces: 'ollama', base: OL, modele: 'gpt-oss:120b-cloud',
    lieux: ['usine'], branche: { usine: true }, gratuit: true, cout: 'compte gratuit de Benj relié à l\'Ollama de l\'usine ; quota mensuel (atteint le 03/10)',
    aptitudes: ['redaction', 'code', 'relecture', 'json'], taille: 'grande', donnees_personnelles_ok: false, cle: AUCUNE,
    relais: 'ollama_cloud', ordre: 30, sonde: { type: 'ollama', delaiMs: 180_000 }, verifie_le: '2026-10-08',
  },
  {
    id: 'ollama_chef_leger', famille: 'ollama', acces: 'ollama', base: OL, modele: 'presti-chef-leger:1.5b',
    lieux: ['usine'], branche: { usine: true }, gratuit: false, cout: 'local (CPU de l\'usine), modèle maison Qwen2.5-1.5B affiné',
    aptitudes: ['json'], taille: 'petite', donnees_personnelles_ok: true, cle: AUCUNE,
    relais: 'ollama_maison', ordre: 40, sonde: { type: 'ollama', delaiMs: 420_000 }, verifie_le: '2026-10-08',
  },
  {
    id: 'ollama_8b', famille: 'ollama', acces: 'ollama', base: OL, modele: 'qwen3:8b-q4_K_M',
    lieux: ['usine'], branche: { usine: true }, gratuit: false, cout: 'local (CPU de l\'usine) ; ≈ 1,7 jeton/s',
    aptitudes: ['redaction', 'relecture', 'json'], taille: 'moyenne', donnees_personnelles_ok: true, cle: AUCUNE,
    relais: 'ollama_8b', ordre: 41, sonde: { type: 'ollama', delaiMs: 480_000 }, verifie_le: '2026-10-08',
  },
  {
    id: 'ollama_4b', famille: 'ollama', acces: 'ollama', base: OL, modele: 'qwen3:4b-instruct-2507-q4_K_M',
    lieux: ['usine'], branche: { usine: true }, gratuit: false, cout: 'local (CPU de l\'usine) ; ≈ 5,4 jetons/s',
    aptitudes: ['redaction', 'relecture', 'json'], taille: 'petite', donnees_personnelles_ok: true, cle: AUCUNE,
    relais: 'ollama_4b', ordre: 42, sonde: { type: 'ollama', delaiMs: 420_000 }, verifie_le: '2026-10-08',
  },
  {
    id: 'ollama_preneur_v2', famille: 'ollama', acces: 'ollama', base: OL, modele: 'presti-preneur:1.5b-v2',
    lieux: ['usine'], branche: { usine: true }, gratuit: false, cout: 'local ; modèle maison, branché limité aux tâches courtes et cadrées du preneur (décision de Benj du 07/10)',
    aptitudes: ['redaction'], taille: 'petite', donnees_personnelles_ok: false, cle: AUCUNE,
    sonde: { type: 'ollama', delaiMs: 420_000 }, verifie_le: '2026-10-08',
  },
  {
    id: 'ollama_preneur_v1', famille: 'ollama', acces: 'ollama', base: OL, modele: 'presti-preneur:1.5b',
    lieux: ['usine'], branche: { usine: false }, reserve: { usine: 'installé mais NON branché dans le preneur : la v1 refuse à tort 4 tâches faisables sur 12 (docs/agents/modele-maison-preneur.md) ; la v2 le remplace' },
    gratuit: false, cout: 'local', aptitudes: ['redaction'], taille: 'petite', donnees_personnelles_ok: false, cle: AUCUNE,
    sonde: { type: 'ollama', delaiMs: 420_000 }, verifie_le: '2026-10-07',
  },
  {
    id: 'ollama_vision', famille: 'ollama', acces: 'ollama', base: OL, modele: 'qwen2.5vl:3b',
    lieux: ['usine'], branche: { usine: true }, gratuit: false, cout: 'local ; lit des images (analyse de vidéos)',
    aptitudes: ['vision', 'redaction'], taille: 'petite', donnees_personnelles_ok: false, cle: AUCUNE,
    sonde: { type: 'ollama', delaiMs: 420_000 }, verifie_le: '2026-10-08',
  },
  {
    id: 'ollama_pc', famille: 'ollama', acces: 'ollama', base: OL, modele: 'qwen3:1.7b',
    lieux: ['pc'], branche: { pc: false }, reserve: { pc: 'Ollama du PC n\'est pas un service permanent (lancé à la demande pour OpenClaw du PC) ; la sonde dit s\'il répond au moment de l\'appel' },
    gratuit: false, cout: 'local (PC de Benj)', aptitudes: ['redaction', 'petit-code'], taille: 'petite', donnees_personnelles_ok: true, cle: AUCUNE,
    parc: 'ollama-local', sonde: { type: 'ollama', delaiMs: 120_000 }, verifie_le: '2026-10-08',
  },
  // ── Les agents en conteneur de l'usine (Hermes, OpenClaw) et AtomicAgent (PC) ──────────────────────────────────────────────────
  {
    id: 'hermes', famille: 'agent', acces: 'socket', socket: '/srv/hermes/relais', commande: 'sudo -n env HERMES_DONNEES=publique /srv/hermes/bin/tache.sh <consigne> <sortie>', modele: 'chaîne : gpt-oss:120b-cloud → freellmapi/gemini-3-flash-preview → freellmapi/ministral-14b',
    lieux: ['pc', 'usine'], branche: { pc: true, usine: true }, gratuit: true, cout: 'gratuit (modèles :cloud et freellmapi) ; données PUBLIQUES seulement',
    aptitudes: ['redaction', 'relecture', 'recherche web'], taille: 'moyenne', donnees_personnelles_ok: false,
    cle: { type: 'aucune', motif: 'il atteint freellmapi et Ollama par les deux sockets de /srv/hermes/relais (freellmapi.sock, ollama.sock), la clé reste côté usine' },
    parc: 'hermes', sonde: { type: 'agent', pc: ['node', 'scripts/agents-libres.mjs', 'sonde', 'hermes'], usine: { script: '/srv/hermes/bin/tache.sh', env: 'HERMES', sockets: ['freellmapi.sock', 'ollama.sock'] } }, verifie_le: '2026-10-08',
  },
  {
    id: 'openclaw', famille: 'agent', acces: 'socket', socket: '/srv/openclaw/relais', commande: 'sudo -n env OPENCLAW_DONNEES=publique /srv/openclaw/bin/tache.sh <consigne> <sortie>', modele: 'ollama/gpt-oss:120b-cloud → freellmapi/gemini-3-flash-preview → freellmapi/ministral-14b',
    lieux: ['pc', 'usine'], branche: { pc: true, usine: true }, gratuit: true, cout: 'gratuit ; données PUBLIQUES seulement ; jamais le greffon Anthropic',
    aptitudes: ['redaction', 'recherche web'], taille: 'petite', donnees_personnelles_ok: false,
    cle: { type: 'aucune', motif: 'sockets /srv/openclaw/relais (freellmapi.sock, ollama.sock) ; copie de la clé freellmapi en lecture seule dans le conteneur' },
    parc: 'openclaw', sonde: { type: 'agent', pc: ['node', 'scripts/agents-libres.mjs', 'sonde', 'openclaw'], usine: { script: '/srv/openclaw/bin/tache.sh', env: 'OPENCLAW', sockets: ['freellmapi.sock', 'ollama.sock'] } }, verifie_le: '2026-10-08',
  },
  {
    id: 'atomic_agent', famille: 'agent', acces: 'cli', commande: 'node scripts/agents-libres.mjs lancer atomicagent (PC ; freellmapi par tunnel ssh + scripts/usine/relais-cle.mjs)', modele: 'freellmapi (clé ajoutée côté usine)',
    lieux: ['pc'], branche: { pc: true }, gratuit: true, cout: 'gratuit', aptitudes: ['redaction'], taille: 'petite', donnees_personnelles_ok: false,
    cle: AUCUNE, parc: 'atomic-agent', sonde: { type: 'cli', pc: ['node', 'scripts/agents-libres.mjs', 'sonde', 'atomicagent'] }, verifie_le: '2026-10-08',
  },
  // ── Recherche et voix ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'perplexity', famille: 'recherche', acces: 'api-recherche', base: '(connecteur Claude « Computer » seulement)', modele: 'Claude Opus 5.5 (modes light et standard) via le connecteur',
    lieux: ['pc'], branche: { pc: false }, reserve: { pc: 'AUCUNE clé d\'API Perplexity : seule la voie du chef (connecteur Claude) existe ; aucun agent de l\'usine ne peut l\'appeler, le script ne peut pas l\'appeler non plus (registre-ia-0510.md)' },
    gratuit: false, cout: 'plan et coût par appel non connus', aptitudes: ['recherche web'], taille: 'inconnue', donnees_personnelles_ok: false, cle: { type: 'aucune', motif: 'pas de clé API' },
    parc: 'perplexity', sonde: { type: 'declare' }, verifie_le: '2026-10-05',
  },
  {
    id: 'firecrawl', famille: 'recherche', acces: 'api-recherche', base: 'https://api.firecrawl.dev/v1', modele: 'scrape / crédits',
    lieux: ['pc', 'usine'], branche: { pc: false, usine: false },
    reserve: { pc: 'clé valide mais aucun agent ne l\'appelle (recherche_web est éteint et la garde de dépense de lib/agents/depense.mjs refuse « firecrawl » : cout_inconnu)', usine: 'idem : la clé est dans ~usine/.config/presti/firecrawl.key mais aucune unité ne la reçoit' },
    gratuit: false, cout: '1 000 crédits par période (fin 26/10) ; 1 crédit par lecture ; la sonde lit le solde sans rien consommer', aptitudes: ['recherche web', 'veille'], taille: 'inconnue', donnees_personnelles_ok: false,
    cle: { type: 'fichier', pc: '../presti-secrets/clé api firecrawl.odt', usine: '/home/usine/.config/presti/firecrawl.key', motif: 'forme fc- + 32 signes ; pc : première ligne du fichier texte' },
    parc: 'firecrawl', sonde: { type: 'api', fournisseur: 'firecrawl' }, verifie_le: '2026-10-08',
  },
  {
    id: 'fish_audio', famille: 'voix', acces: 'api-recherche', base: 'https://api.fish.audio', modele: 'S1 (gratuit) / S2.1 Pro (payant)',
    lieux: ['pc', 'usine'], branche: { pc: false, usine: false },
    reserve: { pc: 'forfait gratuit NON commercial : la garde du dépôt (lib/studio/voixFish.ts) exige un forfait commercial prouvé ; usage interne seulement ; aucun agent ne l\'appelle', usine: 'idem ; la clé est dans ~usine/.config/presti/fishaudio.key, aucune unité ne la reçoit' },
    gratuit: true, cout: 'forfait gratuit 8 000 crédits, non commercial ; la sonde lit le solde sans rien consommer', aptitudes: ['voix'], taille: 'inconnue', donnees_personnelles_ok: false,
    cle: { type: 'fichier', pc: '../presti-secrets/clé api firecrawl.odt', usine: '/home/usine/.config/presti/fishaudio.key', motif: 'forme sk-fish- ; pc : troisième ligne du fichier texte' },
    parc: 'fish-audio', sonde: { type: 'api', fournisseur: 'fish' }, verifie_le: '2026-10-08',
  },
])

// ── lecture ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const lister = (registre = REGISTRE) => [...registre]
export const trouver = (id, registre = REGISTRE) => registre.find((e) => e.id === id) ?? null
/** Vrai si l'entrée est déclarée branchée dans ce lieu. */
export const estBranche = (entree, lieu) => entree?.branche?.[lieu] === true
/** La raison (écrite) pour laquelle l'entrée n'est pas branchée dans ce lieu, ou null. */
export const raisonNonBranche = (entree, lieu) => (estBranche(entree, lieu) ? null : (entree?.reserve?.[lieu] ?? 'non déclarée branchée'))

/**
 * Qui peut recevoir cette nature de donnée. « prospect » : donnees_personnelles_ok vrai, jamais gratuit, jamais une IA distante sauf Codex
 * (même verrou que relais-chef.mjs : `nature === 'prospect' && (m.gratuit || (!m.local && m.id !== 'codex'))` → refusé).
 */
export function peutRecevoir(entree, nature) {
  if (nature !== 'prospect') return true
  if (entree.donnees_personnelles_ok !== true) return false
  if (entree.gratuit === true) return false
  const local = entree.acces === 'ollama' && !/cloud/i.test(entree.modele) && entree.famille === 'ollama'
  return entree.id === 'codex' || local
}

/**
 * Comment un agent choisit son modèle : les entrées branchées dans `lieu`, qui ont `aptitude`, qui peuvent recevoir `nature`, dans l'ordre
 * de la chaîne publique (`ordre`), les hors-chaîne ensuite par ordre d'id. `etat` (optionnel) : { [id]: 'OK'|'KO'|… } le dernier relevé de
 * la sonde : un modèle relevé KO est écarté. Pure.
 */
export function choisirModeles({ aptitude = 'redaction', nature = 'publique', lieu = 'usine', registre = REGISTRE, etat = null } = {}) {
  if (!NATURES.includes(nature)) throw new Error(`nature inconnue : ${nature}`)
  return registre
    .filter((e) => estBranche(e, lieu) && e.aptitudes.includes(aptitude) && peutRecevoir(e, nature) && !(etat && etat[e.id] === 'KO'))
    .sort((a, b) => (a.ordre ?? 1e6) - (b.ordre ?? 1e6) || a.id.localeCompare(b.id))
}

// ── contrôle du registre lui-même (utilisé par le juge et par la sonde avant tout appel) ─────────────────────────────────────────
/** Les défauts du registre, sous forme de lignes (jamais une valeur secrète). Liste vide = registre sain. Pure. */
export function defautsDuRegistre(registre = REGISTRE) {
  const d = []
  const ids = new Set()
  for (const e of registre) {
    const nom = e?.id ?? '(sans id)'
    if (!e?.id || !/^[a-z0-9_]+$/.test(e.id)) d.push(`${nom} : id absent ou illisible`)
    if (ids.has(e.id)) d.push(`${nom} : id en double`)
    ids.add(e.id)
    if (!ACCES.includes(e.acces)) d.push(`${nom} : acces « ${e.acces} » inconnu`)
    if (!Array.isArray(e.lieux) || !e.lieux.length || e.lieux.some((l) => !LIEUX.includes(l))) d.push(`${nom} : lieux absents ou inconnus`)
    for (const l of e.lieux ?? []) if (typeof e.branche?.[l] !== 'boolean') d.push(`${nom} : branche.${l} doit être un booléen explicite`)
    for (const l of Object.keys(e.branche ?? {})) if (!e.lieux?.includes(l)) d.push(`${nom} : branche.${l} sans lieu`)
    for (const l of e.lieux ?? []) if (e.branche?.[l] === false && !String(e.reserve?.[l] ?? '').trim()) d.push(`${nom} : non branché dans ${l} sans raison écrite (reserve.${l})`)
    if (typeof e.gratuit !== 'boolean') d.push(`${nom} : gratuit doit être un booléen`)
    if (typeof e.donnees_personnelles_ok !== 'boolean') d.push(`${nom} : donnees_personnelles_ok doit être un booléen`)
    if (e.donnees_personnelles_ok === true && e.gratuit === true) d.push(`${nom} : une IA gratuite ne peut pas recevoir de donnée personnelle`)
    if (e.donnees_personnelles_ok === true && e.acces !== 'ollama' && e.id !== 'codex') d.push(`${nom} : seule une IA locale de l'usine ou Codex peut recevoir une donnée personnelle`)
    if (e.donnees_personnelles_ok === true && e.famille === 'ollama' && /cloud/i.test(e.modele)) d.push(`${nom} : un modèle :cloud ne reçoit jamais de donnée personnelle`)
    if (!Array.isArray(e.aptitudes)) d.push(`${nom} : aptitudes absentes`)
    if (!e.sonde?.type) d.push(`${nom} : aucune sonde déclarée (une IA sans sonde ne peut pas être « branchée »)`)
    if (e.cle?.type === 'fichier' && Object.entries(e.cle).some(([k, v]) => ['pc', 'usine'].includes(k) && typeof v === 'string' && /(?:sk-ant-|sk-fish-|\bfc-[A-Za-z0-9]{20}|eyJ[\w-]+\.[\w-]+\.)/.test(v))) d.push(`${nom} : une clé semble écrite dans le registre`)
    // une IA qui s'appelle avec une clé doit dire OÙ elle se lit, dans chaque lieu où elle est déclarée branchée (jamais la clé elle-même)
    const sondeAvecCle = ['anthropic', 'openai', 'api'].includes(e.sonde?.type)
    if (sondeAvecCle && e.cle?.type !== 'fichier') d.push(`${nom} : sonde « ${e.sonde.type} » sans emplacement de clé (cle.type doit être 'fichier')`)
    for (const l of e.lieux ?? []) if (sondeAvecCle && e.branche?.[l] === true && !(typeof e.cle?.[l] === 'string' && e.cle[l].trim())) d.push(`${nom} : branché dans ${l} sans emplacement de clé pour ${l}`)
    for (const l of e.lieux ?? []) if (e.branche?.[l] === true && e.sonde?.type === 'declare') d.push(`${nom} : déclaré branché dans ${l} avec une sonde « declare » (jamais branché sans vrai appel)`)
  }
  return d
}

export const MESSAGE_SONDE = MSG
