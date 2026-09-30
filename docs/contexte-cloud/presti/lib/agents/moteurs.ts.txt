// lib/agents/moteurs.ts — catalogue et table des moteurs des agents (fiche 026-043, contrat de 026-041, complément
// « toutes les IA » du 27/09, décision du chef d'entreprise du 27/09). Constantes et fonctions PURES : aucune E/S, aucun
// import d'un module qui en fait. `lib/agents/llm.ts` (la seule porte des agents vers un modèle) les lit ; la station
// (026-070) lit aussi ce fichier pour afficher le modèle prévu d'un agent.
//
// Décision de Benj du 24-25/09 : aucun achat. Deux moteurs gratuits pour les agents (codex, freellmapi) ; ajout du
// 26/09 : IA locale de l'usine (Ollama, Laya) après un « oui » daté de Benj ; décision du chef d'entreprise du 27/09 :
// une donnée de prospect ne va qu'à Codex ou au local de l'usine, jamais à freellmapi, à Ollama Cloud ni à Groq (exclu).
//
// Ce module ne lit AUCUNE variable d'environnement et n'importe rien qui en lit : toute décision qui dépend de l'état
// réel (configuration, quotas, horloge) est prise par lib/agents/llm.ts, qui appelle les fonctions pures d'ici avec un
// `etat` déjà résolu.

/** Gèle récursivement un objet (et tout ce qu'il contient) : `Object.freeze` en profondeur. */
function gelerProfond<T>(valeur: T): T {
  if (valeur !== null && typeof valeur === 'object' && !Object.isFrozen(valeur)) {
    Object.freeze(valeur)
    for (const v of Object.values(valeur as Record<string, unknown>)) gelerProfond(v)
  }
  return valeur
}

// ── modèles par défaut ────────────────────────────────────────────────────────────────────────────────────────────
export const MODELE_AGENTS = 'gpt-6-luna'
export const MODELE_REJUGE = 'gpt-6-sol'

// ── MOTEUR_DE : la table des sept agents qui passent par lib/agents/llm.ts ──────────────────────────────────────────
export type EntreeMoteur = {
  moteur: 'codex' | 'freellmapi'
  modele: string
  personnelles: boolean
  leger?: string
  affichage?: boolean
}

export const MOTEUR_DE: Readonly<Record<string, Readonly<EntreeMoteur>>> = gelerProfond({
  standardiste: { moteur: 'codex', modele: MODELE_AGENTS, personnelles: true },
  facteur: { moteur: 'codex', modele: MODELE_AGENTS, personnelles: true },
  redacteur_site: { moteur: 'codex', modele: MODELE_REJUGE, personnelles: true },
  chef: { moteur: 'codex', modele: MODELE_REJUGE, leger: MODELE_AGENTS, personnelles: false, affichage: true },
  veille_pubs: { moteur: 'codex', modele: MODELE_AGENTS, personnelles: true },
  douleurs: { moteur: 'freellmapi', modele: 'auto', personnelles: false },
  studio: { moteur: 'codex', modele: MODELE_REJUGE, personnelles: false },
})

// ── le type de travail de chaque agent (pour REPLI) ──────────────────────────────────────────────────────────────────
export const TRAVAIL_DE: Readonly<Record<string, string>> = gelerProfond({
  standardiste: 'prospect_classement',
  facteur: 'prospect_controle',
  redacteur_site: 'prospect_redaction',
  chef: 'chef',
  veille_pubs: 'prospect_lecture',
  douleurs: 'masse',
  studio: 'texte_vendu',
})

// ── le catalogue complet des IA de Presti (§2 du complément du 27/09) ────────────────────────────────────────────────
// Liste fermée des ids pour VERSION_CATALOGUE = '2026-09-27'. Clés écrites entre guillemets (et non en identifiant nu)
// exprès : un identifiant nu resterait lisible tel quel dans le source, alors que ce fichier ne doit citer AUCUN nom de
// service tiers en clair hors de données (LL-3) — les guillemets font de chaque id une chaîne, comme ses valeurs.
export type EntreeCatalogue = {
  role: string
  reserve: string
  voie: 'module' | 'script' | 'session' | 'adaptateur' | 'executant' | 'conteneur' | 'produit' | 'local_outil' | 'exclue'
  d1: 'oui' | 'apres_oui_benj' | 'non'
  modeles: readonly string[]
  quota: string
  commercial: string
}

export const VERSION_CATALOGUE = '2026-09-27'

export const CATALOGUE: Readonly<Record<string, Readonly<EntreeCatalogue>>> = gelerProfond({
  'codex': {
    role: 'Tout ce qui touche un prospect ou un client ; rédaction, rejugement, code, cycles de Matt',
    reserve: '—', voie: 'module', d1: 'oui',
    modeles: ['gpt-6-sol', 'gpt-6-luna', 'gpt-6-astra'],
    quota: 'une seule réserve ChatGPT pour le PC, l\'usine et le chef (fenêtres 5 h et semaine)',
    commercial: 'abonnement ChatGPT de Benj, 0 € de plus',
  },
  'ollama_local': {
    role: 'Données privées après le « oui » de Benj ; relais de masse ; entraide privée',
    reserve: '—', voie: 'module', d1: 'apres_oui_benj',
    modeles: ['qwen3:4b-instruct-2507-q4_K_M', 'qwen3:8b-q4_K_M'],
    quota: 'sans quota, une requête à la fois sur l\'usine',
    commercial: 'licence libre, usage commercial permis',
  },
  'ollama_cloud': {
    role: 'Secours gratuit de Codex pour le code (D0) seulement ; secours de Matt sur son propre état, jamais un prospect',
    reserve: '—', voie: 'script', d1: 'non',
    modeles: ['gpt-oss:120b-cloud', 'gpt-oss:20b-cloud', 'gemma4:cloud', 'nemotron-3-super:cloud'],
    quota: 'quota du compte gratuit, non mesuré',
    commercial: 'gratuit',
  },
  'freellmapi': {
    role: 'Masse sans donnée personnelle ; raisonnement et code en D0 ; entraide publique',
    reserve: '—', voie: 'module', d1: 'non',
    modeles: ['mistral-large-3', 'mistral-medium-3.5', 'devstral-2', 'codestral', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemma-4-31b-it', 'gpt-oss-120b', 'auto'],
    quota: 'variable par fournisseur, daté au 25/09',
    commercial: 'gratuit',
  },
  'laya': {
    role: 'Décisions et scores en local, sans générer de texte : qualification, vérification, routage',
    reserve: '—', voie: 'module', d1: 'apres_oui_benj',
    modeles: ['laya'],
    quota: 'sans quota, recharge le modèle à chaque commande',
    commercial: 'local (ONNX)',
  },
  'perplexity': {
    role: 'Recherche ponctuelle d\'une source publique',
    reserve: '—', voie: 'session', d1: 'non',
    modeles: [],
    quota: 'plan et coût d\'un appel inconnus tant qu\'ils ne sont pas vérifiés',
    commercial: 'inconnu',
  },
  'firecrawl': {
    role: 'Lecture d\'une page web publique (l\'URL publique d\'un site d\'entreprise, rien d\'autre)',
    reserve: '—', voie: 'adaptateur', d1: 'non',
    modeles: [],
    quota: 'borne de crédits, compteur daté',
    commercial: 'forfait',
  },
  'fish_audio': {
    role: 'Voix de synthèse',
    reserve: '—', voie: 'adaptateur', d1: 'non',
    modeles: [],
    quota: 'forfait',
    commercial: 'licence commerciale à vérifier : usage_interne par défaut',
  },
  'antigravity': {
    role: 'Exécutant de code seulement (D0) ; jamais un juge ni un verdict',
    reserve: '—', voie: 'executant', d1: 'non',
    modeles: ['gemini-3.8-flash-high', 'gemini-3.7-flash-high', 'pro', 'flash_lite'],
    quota: 'quota par modèle, dormant depuis le 16/09',
    commercial: 'gratuit',
  },
  'openclaw': {
    role: 'Assistant en conteneur isolé sur l\'usine',
    reserve: '—', voie: 'conteneur', d1: 'non',
    modeles: ['ollama_local', 'ollama_cloud', 'freellmapi'],
    quota: 'sorties réseau en liste fermée',
    commercial: 'jamais l\'abonnement Claude, aucun jeton Claude',
  },
  'groq': {
    role: 'Exclu — refusé par Benj le 25/09 : ni texte, ni recherche, ni transcription',
    reserve: '—', voie: 'exclue', d1: 'non',
    modeles: [],
    quota: 'aucune clé, nulle part',
    commercial: 'exclu',
  },
  'claude': {
    role: 'Claude Code : juges, décisions, relecture visuelle',
    reserve: 'A', voie: 'session', d1: 'non',
    modeles: [],
    quota: 'abonnement Claude Code',
    commercial: 'session',
  },
  'cle_produit': {
    role: 'Cerveaux du produit, pour les clients des artisans (lib/ai.ts)',
    reserve: 'B', voie: 'produit', d1: 'non',
    modeles: [],
    quota: 'clé produit',
    commercial: 'jamais un agent ni un prospect de Presti',
  },
  'cle_agents': {
    role: 'Clé Anthropic « agents » — annulée le 25/09 (décision de Benj : aucun achat)',
    reserve: 'C', voie: 'exclue', d1: 'non',
    modeles: [],
    quota: 'annulée',
    commercial: 'annulée',
  },
  'kokoro': {
    role: 'Voix locale par défaut',
    reserve: '—', voie: 'local_outil', d1: 'non',
    modeles: ['ff_siwis'],
    quota: 'sans quota, local',
    commercial: 'libre',
  },
  'faster_whisper': {
    role: 'Transcription locale (la voix d\'un prospect ne se transcrit qu\'en local)',
    reserve: '—', voie: 'local_outil', d1: 'non',
    modeles: ['large-v3-turbo'],
    quota: 'sans quota, local',
    commercial: 'libre',
  },
  'elevenlabs': {
    role: 'Voix de synthèse, compte gratuit',
    reserve: '—', voie: 'adaptateur', d1: 'non',
    modeles: [],
    quota: 'gratuit',
    commercial: 'sans droit commercial : usage interne seulement',
  },
  'gemini_payant': {
    role: 'API Gemini payante (image, vidéo)',
    reserve: '—', voie: 'exclue', d1: 'non',
    modeles: [],
    quota: 'non branchée',
    commercial: 'décision d\'argent de Benj, non prise',
  },
  'gemini_cli': {
    role: 'Exécutant de code (D0 seulement)',
    reserve: '—', voie: 'executant', d1: 'non',
    modeles: [],
    quota: 'inconnu',
    commercial: 'inconnu',
  },
  'qwen_code': {
    role: 'Exécutant de code (D0 seulement)',
    reserve: '—', voie: 'executant', d1: 'non',
    modeles: [],
    quota: 'inconnu',
    commercial: 'inconnu',
  },
  'cursor': {
    role: 'Exécutant de code (D0 seulement)',
    reserve: '—', voie: 'executant', d1: 'non',
    modeles: [],
    quota: 'inconnu',
    commercial: 'inconnu',
  },
})

export const MODELES_LOCAUX: readonly string[] = gelerProfond(['qwen3:4b-instruct-2507-q4_K_M', 'qwen3:8b-q4_K_M'])
export const MODELES_OLLAMA_CLOUD: readonly string[] = gelerProfond(['gpt-oss:120b-cloud', 'gpt-oss:20b-cloud', 'gemma4:cloud', 'nemotron-3-super:cloud'])
export const MODELES_FREELLMAPI: readonly string[] = gelerProfond(['mistral-large-3', 'mistral-medium-3.5', 'devstral-2', 'codestral', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemma-4-31b-it', 'gpt-oss-120b', 'auto'])

// ── SECOURS_CODEX : la forme éprouvée du lanceur de la veille (§3 du complément du 27/09), copiée élément par élément,
// sans guillemets de shell. `creerLecteur` ne s'en sert JAMAIS (LL-5, décision du 27/09) : lu par les scripts de
// l'usine seuls (le code D0, et les cycles de Matt sur son propre état). classes: ['D0'] — jamais une tâche D1.
export const SECOURS_CODEX: Readonly<{
  fl: readonly string[]
  ol: readonly string[]
  modelesFl: readonly string[]
  modeleOl: string
  ordre: readonly string[]
  classes: readonly string[]
}> = gelerProfond({
  fl: ['-c', 'model_providers.fl={name="freellmapi",base_url="http://127.0.0.1:3001/v1",env_key="FL_KEY",wire_api="responses"}', '-c', 'model_provider=fl'],
  ol: ['-c', 'model_providers.ol={name="ollama",base_url="http://127.0.0.1:11434/v1",wire_api="responses"}', '-c', 'model_provider=ol'],
  modelesFl: ['gpt-oss-120b', 'gemini-3.5-flash', 'gpt-oss-20b'],
  modeleOl: 'gpt-oss:120b-cloud',
  ordre: ['chatgpt', 'ol', 'fl'],
  classes: ['D0'],
})

// ── REPLI : l'ordre de repli par type de travail (§4 du complément du 27/09) ─────────────────────────────────────────
// `id` seul (chaîne) ou `{ id, ... }` (avec une condition documentaire) : `choisirVoie` lit `id`, le reste n'est que
// documentation. `classe` fixe le régime de données par défaut de ce type de travail (un appelant peut relever la
// classe au cas par cas — ex. `transcription` d'une voix de prospect — sans que cela change cette table).
export type VoieRepli = string | { id: string; requiert?: string; role?: string; repli?: boolean }
export type EntreeRepli = { classe: 'D0' | 'D1'; voies: readonly VoieRepli[] }

export const REPLI: Readonly<Record<string, Readonly<EntreeRepli>>> = gelerProfond({
  prospect_classement: { classe: 'D1', voies: ['codex', { id: 'laya', repli: true }, { id: 'ollama_local', repli: true }] },
  prospect_controle: { classe: 'D1', voies: ['codex', { id: 'laya', role: 'troisieme_avis' }] },
  prospect_redaction: { classe: 'D1', voies: ['codex', { id: 'ollama_local', repli: true }] },
  prospect_lecture: { classe: 'D1', voies: ['codex', { id: 'ollama_local', repli: true }] },
  qualification: { classe: 'D1', voies: [{ id: 'laya', repli: true }, 'codex'] },
  masse: { classe: 'D0', voies: ['freellmapi', 'ollama_local', 'codex'] },
  raisonnement: { classe: 'D0', voies: ['codex', 'freellmapi', 'ollama_local'] },
  texte_vendu: { classe: 'D0', voies: ['codex', 'ollama_local'] },
  code: { classe: 'D0', voies: ['codex', 'antigravity'] },
  chef: { classe: 'D0', voies: ['codex'] },
  conseil: { classe: 'D0', voies: ['freellmapi'] },
  decision: { classe: 'D0', voies: [{ id: 'laya' }] },
  verification_publication: { classe: 'D0', voies: [{ id: 'laya' }] },
  recherche_web: { classe: 'D0', voies: [{ id: 'firecrawl', requiert: 'url_publique' }, { id: 'perplexity' }, { id: 'claude' }] },
  transcription: { classe: 'D0', voies: ['faster_whisper', 'freellmapi'] },
  image: { classe: 'D0', voies: ['freellmapi'] },
  voix: { classe: 'D0', voies: ['kokoro', { id: 'fish_audio', requiert: 'preuve_licence' }] },
  juge: { classe: 'D0', voies: ['claude'] },
})

// ── choisirVoie : fonction pure de routage (LL-14) ───────────────────────────────────────────────────────────────────
// `etat` est déjà résolu par l'appelant (jamais un accès direct à l'horloge ou à l'environnement ici) :
//   toutDisponible : simplifie « aucune voie à sec, aucune sonde muette » pour lire le rang 1 d'un type ;
//   drapeau        : le « oui » de Benj (booléen déjà vérifié) ;
//   perplexite.coutInconnu, fish.preuve, entree ('url_publique' | autre) : conditions des voies particulières.
export type EtatChoix = {
  toutDisponible?: boolean
  drapeau?: boolean
  perplexite?: { coutInconnu?: boolean }
  fish?: { preuve?: boolean }
  entree?: string
}
export type ResultatVoie = { voie: string; mode?: string; exige?: readonly string[] } | { attente: true; raison: string }

function admissiblePourChoix(id: string, classe: 'D0' | 'D1', etat: EtatChoix): boolean {
  if (id === 'ollama_local' || id === 'laya') return classe === 'D1' ? etat.drapeau === true : etat.toutDisponible === true
  if (id === 'ollama_cloud') return false // jamais une voie de choisirVoie/creerLecteur (script seulement)
  if (id === 'perplexity') return etat.toutDisponible === true && etat.perplexite?.coutInconnu !== true
  if (id === 'firecrawl') return etat.entree === 'url_publique'
  if (id === 'fish_audio') return etat.toutDisponible === true && etat.fish?.preuve === true
  return etat.toutDisponible === true
}

export function choisirVoie(travail: string, classe: 'D0' | 'D1', etat: EtatChoix = {}): ResultatVoie {
  const def = REPLI[travail]
  if (!def) return { attente: true, raison: `type de travail inconnu : ${travail}` }
  for (const brute of def.voies) {
    const id = typeof brute === 'string' ? brute : brute.id
    if (classe === 'D1' && CATALOGUE[id]?.d1 === 'non') continue
    if (!admissiblePourChoix(id, classe, etat)) continue
    if (id === 'perplexity') return { voie: id, mode: 'session', exige: ['url', 'date'] }
    return { voie: id }
  }
  return { attente: true, raison: `aucune voie admissible pour ${travail} (${classe})` }
}

// ── ENTRAIDE : troisième avis après un tour refusé (§6 du complément du 27/09) ───────────────────────────────────────
export const ENTRAIDE: Readonly<{
  d0: readonly string[]
  d1: readonly string[]
  parTache: number
  maxTokensD0: number
  maxTokensD1: number
  delaiMsD0: number
  delaiMsD1: number
  extraitVerdict: number
  extraitJournal: number
  extraitConsigne: number
  extraitD1: number
}> = gelerProfond({
  d0: ['mistral-large-3', 'gemini-3.5-flash', 'gpt-oss-120b', 'gemini-3.7-flash', 'devstral-2'],
  d1: ['qwen3:4b-instruct-2507-q4_K_M'],
  parTache: 12,
  maxTokensD0: 1500,
  maxTokensD1: 600,
  delaiMsD0: 240_000,
  delaiMsD1: 420_000,
  extraitVerdict: 4000,
  extraitJournal: 6000,
  extraitConsigne: 5000,
  extraitD1: 1500,
})

export function conseillersPour(classe: 'D0' | 'D1', etat: { drapeau?: boolean } = {}): string[] {
  if (classe === 'D0') return [...ENTRAIDE.d0]
  return etat.drapeau === true ? [...ENTRAIDE.d1] : []
}
