// scripts/contenu/veille.mjs — C12 (fiche 026-215) : veille des tendances et laboratoire des accroches.
// Garde-fous en code, testables sans réseau : les accès externes sont INJECTÉS (deps), rien ici ne lit un secret ni
// n'appelle le réseau. Toute donnée d'artisan ou de prospect reste locale (Codex ou Laya ; Ollama seulement après le
// « oui » de Benj) ; Firecrawl ne reçoit que l'URL publique d'un site d'entreprise en « lire » ; aucune voie Groq ;
// Perplexity seulement ponctuel, plan et coût connus, sans donnée personnelle ; vidéos d'autrui : jamais
// téléchargées ni transcrites ; métadonnées nominatives supprimées à 30 jours. Une publication reste l'accord
// individuel de Benj (R24) : rien ici ne publie.

export const CONSERVATION_NOMINATIF_JOURS = 30
const JOUR_MS = 86_400_000

const RE_EMAIL = /[\w.+-]+(?:@|%40)[\w-]+(?:\.|%2e)[\w.-]+/i
const RE_TEL = /(?:\+33|0033|%2b33)[\s.\d%+-]{8,}|(?:\+33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}/i
const RE_PSEUDO = /(?:^|[\s(/])@[A-Za-z0-9._]{2,30}/
const RE_TEL_G = new RegExp(RE_TEL.source, 'gi')
const RE_EMAIL_G = new RegExp(RE_EMAIL.source, 'gi')
const RE_PSEUDO_G = /(^|[\s(/])@[A-Za-z0-9._]{2,30}/g
const RE_URL_G = /https?:\/\/\S+/gi
const RE_VILLE_G = /(?<![\p{L}])(à|de|du|près de|sur|en)\s+(?:(?:Saint|Sainte|Le|La|Les)[- ])?[A-ZÉÈÀÂÊÎÔÛÇ][\p{L}'’-]{2,}(?:[- ][A-ZÉÈÀÂÊÎÔÛÇ][\p{L}'’-]{2,})*/gu
const RE_NOM_G = /\b(?:M\.|Mme|Monsieur|Madame|Maître)\s+[A-ZÉÈÀÂÊÎÔÛÇ][\p{L}'’-]+(?:\s+[A-ZÉÈÀÂÊÎÔÛÇ][\p{L}'’-]+)?/gu

const MOTEURS_LOCAUX_LIBRES = new Set(['codex', 'laya'])
const CHAMPS_NOMINATIFS = ['auteur', 'chaine', 'chaine_id', 'pseudo', 'ville', 'nom', 'compte', 'visage', 'url_profil']

const echapper = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const prospectsDe = (opts) => (Array.isArray(opts?.prospects) ? opts.prospects.filter((p) => typeof p === 'string' && p.trim().length >= 2) : [])

/** Vrai si le texte peut identifier une personne : adresse, téléphone, pseudo, ou un prospect connu (nom exact). */
export function peutIdentifier(texte, opts = {}) {
  const t = String(texte ?? '')
  let dec = t
  try { dec = decodeURIComponent(t) } catch { /* texte gardé tel quel : un %XX invalide reste suspect ci-dessous */ }
  if (RE_EMAIL.test(t) || RE_EMAIL.test(dec) || RE_TEL.test(t) || RE_TEL.test(dec) || RE_PSEUDO.test(dec)) return true
  const bas = dec.toLowerCase()
  return prospectsDe(opts).some((p) => bas.includes(p.toLowerCase()))
}

/** Élague noms, pseudos, villes, adresses, téléphones et liens avant toute analyse facultative. */
export function elaguerNominatif(texte, opts = {}) {
  let t = String(texte ?? '')
  t = t.replace(RE_URL_G, '[lien]').replace(RE_EMAIL_G, '[adresse]').replace(RE_TEL_G, '[tel]').replace(RE_PSEUDO_G, '$1[pseudo]')
  for (const p of prospectsDe(opts)) t = t.replace(new RegExp(echapper(p), 'gi'), '[nom]')
  t = t.replace(RE_NOM_G, '[nom]').replace(RE_VILLE_G, (m, mot) => `${mot} [ville]`)
  return t.replace(/\s{2,}/g, ' ').trim()
}

/** Firecrawl : uniquement « lire » sur l'URL publique d'un site d'entreprise ; jamais « chercher », jamais une adresse
 *  ni un téléphone ni un identifiant dans l'URL. Le verdict se rend AVANT tout appel. */
export function verdictFirecrawl(operation, url, opts = {}) {
  if (operation !== 'lire') return { ok: false, critere: 'operation', motif: `operation « ${operation} » refusée : Firecrawl ne sert qu'en « lire », jamais « chercher » (une requête libre peut porter un nom)` }
  let u
  try { u = new URL(String(url)) } catch { return { ok: false, critere: 'url', motif: 'URL invalide' } }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return { ok: false, critere: 'url', motif: 'URL non publique (protocole ou identifiants)' }
  if (peutIdentifier(String(url), opts) || peutIdentifier(u.href, opts)) return { ok: false, critere: 'donnee_personnelle', motif: 'URL portant une adresse, un téléphone, un pseudo ou un nom : refusée avant tout appel Firecrawl' }
  return { ok: true }
}

/** Envoi d'un texte à un moteur d'IA : une donnée pouvant identifier un prospect ou un artisan ne va qu'à Codex ou au
 *  local (Laya ; Ollama après le « oui » de Benj : opts.ouiBenjOllama === true). Groq n'est jamais permis. */
export function verdictEnvoiIA(texte, moteur, opts = {}) {
  const m = String(moteur || '').toLowerCase()
  if (/groq|compound|whisper/.test(m)) return { ok: false, critere: 'groq', motif: `moteur « ${moteur} » retiré de tout secours (décision du 27/09)` }
  if (!peutIdentifier(texte, opts)) return { ok: true }
  const nuage = /:cloud$/.test(m) || m === 'ollama_cloud' || m === 'freellmapi' || /perplexity|gemini|openrouter/.test(m)
  if (nuage) return { ok: false, critere: 'nuage', motif: `donnée pouvant identifier un prospect vers « ${moteur} » : interdit (Codex ou local seulement)` }
  if (m === 'ollama' || m === 'ollama:local') return opts?.ouiBenjOllama === true ? { ok: true } : { ok: false, critere: 'ollama_sans_oui', motif: 'Ollama exige le « oui » de Benj pour une donnée de prospect' }
  if (MOTEURS_LOCAUX_LIBRES.has(m)) return { ok: true }
  return { ok: false, critere: 'moteur_inconnu', motif: `moteur « ${moteur} » inconnu : fermé par défaut pour une donnée de prospect` }
}

/** Perplexity : recherche ponctuelle d'une source publique. Plan, droit et coût doivent être CONNUS ; sinon aucun appel
 *  (recherche gratuite ou lecteur existant). Jamais dans une boucle de masse ni avec une donnée personnelle. */
export function verdictPerplexity(demande = {}, opts = {}) {
  const repli = 'lecteur_026_020'
  const ferme = (critere, motif) => ({ ok: false, appel: false, critere, motif, repli })
  if (demande.masse === true) return ferme('masse', 'Perplexity est ponctuel : jamais dans la boucle automatique de masse')
  if (typeof demande.requete !== 'string' || !demande.requete.trim()) return ferme('requete', 'requête absente')
  if (peutIdentifier(demande.requete, opts)) return ferme('donnee_personnelle', 'donnée personnelle dans la requête : aucun appel')
  if (!demande.plan || demande.droit !== true) return ferme('plan_inconnu', 'plan ou droit inconnu : aucun appel')
  if (typeof demande.cout !== 'number' || !Number.isFinite(demande.cout) || demande.cout < 0) return ferme('cout_inconnu', 'coût inconnu : aucun appel')
  if (typeof demande.budget !== 'number' || !Number.isFinite(demande.budget) || demande.budget <= 0) return ferme('budget_absent', 'budget absent : aucun appel')
  if (demande.cout > demande.budget) return ferme('budget_depasse', 'coût supérieur au budget : aucun appel')
  return { ok: true, appel: true }
}

/** Vidéos d'autrui et interfaces TikTok : jamais téléchargées, transcrites ni lues par un robot. */
export function verdictSource(action, cible = '') {
  if (['telecharger', 'transcrire', 'extraire_audio'].includes(action)) return { ok: false, critere: 'video_autrui', motif: `« ${action} » interdit sur une vidéo d'autrui : titres, descriptions et statistiques seulement ; une accroche vue se note à la main en séance` }
  if (/tiktokstudio|studio\.tiktok\.com|creativecenter/i.test(String(cible))) return { ok: false, critere: 'tiktok_robot', motif: 'TikTok Studio et Creative Center ne sont pas lus par un robot' }
  return { ok: true }
}

/** Sources de la veille : Search Console (API officielle) et agrégats 026-072 toujours ; Business Discovery fermée tant
 *  que R6 n'est pas levée ; YouTube Data API réduite à titres, descriptions, statistiques. */
export function sourcesAutorisees(etat = {}) {
  return {
    search_console: { ok: true, api: 'officielle' },
    agregats_026_072: { ok: true, nouvel_appel_prospects: false },
    youtube_data_api: { ok: true, champs: ['titre', 'description', 'statistiques'] },
    business_discovery: etat.r6 === true ? { ok: true } : { ok: false, etat: 'ferme_r6', motif: 'R6 non levée : voie fermée, jamais simulée avec un vrai jeton' },
  }
}

/** Réduit un élément YouTube aux seuls champs permis ; les métadonnées nominatives portent la date de collecte. */
export function retenirYouTube(element, collecteLe) {
  const e = element || {}
  const stats = e.statistiques && typeof e.statistiques === 'object' ? e.statistiques : {}
  return {
    id: String(e.id ?? ''), collecte_le: collecteLe,
    titre: elaguerNominatif(e.titre ?? ''), description: elaguerNominatif(e.description ?? ''),
    statistiques: { vues: Number.isFinite(stats.vues) ? stats.vues : null, likes: Number.isFinite(stats.likes) ? stats.likes : null },
    nominatif: Object.fromEntries(CHAMPS_NOMINATIFS.filter((c) => e[c] !== undefined).map((c) => [c, e[c]])),
  }
}

/** Supprime les métadonnées nominatives à 30 jours au plus. Une date illisible est traitée comme périmée. */
export function expirerNominatif(entrees, maintenant, jours = CONSERVATION_NOMINATIF_JOURS) {
  return (entrees || []).map((e) => {
    const t = Date.parse(e?.collecte_le)
    const perime = !Number.isFinite(t) || maintenant - t >= jours * JOUR_MS
    return perime ? { ...e, nominatif: {}, nominatif_expire: true } : e
  })
}

/** Un prospect caché dans un titre est élagué ; le titre n'est plus jamais transmis tel quel à une IA. */
export function traiterTitre(titre, opts = {}) {
  const contient = peutIdentifier(titre, opts)
  return { nominatif: contient, texteAnalyse: elaguerNominatif(titre, opts), versIA: contient ? { ok: false, motif: 'titre nominatif : règles locales seulement' } : { ok: true } }
}

/** Lecture d'une page publique d'entreprise : le verdict précède tout appel ; l'adaptateur 026-223 (lireAvecFirecrawl
 *  lié à ses deps, robots, quota, repli 026-020) est injecté et n'est appelé qu'en « lire ». La source est conservée. */
export async function lireUrlEntreprise(url, deps, opts = {}) {
  const v = verdictFirecrawl('lire', url, opts)
  if (!v.ok) return { refus: v.critere, motif: v.motif, appelFirecrawl: false }
  if (typeof deps?.adaptateur !== 'function') return { refus: 'adaptateur_absent', motif: 'adaptateur 026-223 non fourni : voie fermée', appelFirecrawl: false }
  const r = await deps.adaptateur({ operation: 'lire', url })
  if (r?.refus) return { refus: r.refus, raison: r.raison_repli ?? r.raison ?? null, source: url }
  return { ...r, source: url, repli: r?.methode !== 'firecrawl' }
}
