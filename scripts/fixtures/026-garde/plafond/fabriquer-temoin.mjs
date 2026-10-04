// scripts/fixtures/026-garde/plafond/fabriquer-temoin.mjs — fabrique le TÉMOIN du lot garde-plafond : les correctifs MINIMAUX, en copies
// `.temoin` (aucun outil du dépôt ne les prend pour du code), à partir des fichiers de la référence (`git show <référence>:<chemin>`).
// Écrit par Claude Code. Il ne touche ni lib/, ni app/, ni supabase/, ni scripts/ : il n'écrit que sous temoin/ à côté de lui.
//
//   node scripts/fixtures/026-garde/plafond/fabriquer-temoin.mjs            fabrique (chaque `avant` doit figurer exactement une fois)
//   node scripts/fixtures/026-garde/plafond/fabriquer-temoin.mjs --diffs     écrit aussi les diffs (temoin/DIFFS.txt, pour le rapport)
//
// Ce témoin n'est PAS le correctif livré : c'est la preuve que chaque juge sait rendre 0 sur une implémentation conforme, et le
// brouillon des diffs que Claude Code reportera (avec les tests et les migrations d'usage) dans lib/, scripts/ et supabase/.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { reference } from './lot.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..', '..', '..', '..')
const SORTIE = path.join(ICI, 'temoin')
const MARQUE_DOC = ' (annulé le 25/09 : aucun achat, décision de Benj ; plafond de 0 € par agent)'

const lireReference = (chemin) => {
  const r = spawnSync('git', ['show', `${reference}:${chemin}`], { cwd: DEPOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0) throw new Error(`git show ${reference.slice(0, 7)}:${chemin} : ${String(r.stderr).split('\n')[0]}`)
  return r.stdout
}
function remplacer(texte, chemin, avant, apres) {
  const n = texte.split(avant).length - 1
  if (n !== 1) throw new Error(`${chemin} : « ${avant.slice(0, 70).replace(/\n/g, '⏎')} » figure ${n} fois, exactement 1 attendue`)
  return texte.replace(avant, () => apres)
}

// ── Les corrections, fichier par fichier ─────────────────────────────────────────────────────────────────────────────────────
const CORRECTIONS = {
  // GF-1 : un agent n'engage aucun argent.
  'scripts/chef/commun.mjs': [
    ['if (!Number.isInteger(op.engage_cents) || op.engage_cents < 0) f.push(`${ou}.options[${j}].engage_cents : entier ≥ 0`)',
      'if (!Number.isInteger(op.engage_cents) || op.engage_cents !== 0) f.push(`${ou}.options[${j}].engage_cents : 0 (un agent n\'engage aucun argent : plafond de 0 €)`)'],
    ['if (!Number.isInteger(d.montant_cents) || d.montant_cents < 0) f.push(`${ou}.montant_cents : entier ≥ 0`)',
      'if (!Number.isInteger(d.montant_cents) || d.montant_cents !== 0) f.push(`${ou}.montant_cents : 0 (un agent n\'engage aucun argent : plafond de 0 €)`)'],
  ],

  // GF-2 et GF-3 : le coût vient d'une liste fermée, le plafond est contrôlé AVANT l'appel, par défaut la base décide (fail-closed).
  'lib/agents/bus.ts': [
    ['  options: 400, defaut: 400,', '  cout_inconnu: 400, options: 400, defaut: 400,'],
    ['  quota: 429,\n', '  quota: 429, plafond: 429,\n'],
    ['export const ops_etat = (): Promise', 'export const ops_cout_autoriser = fonctionBus<{ p_agent: string; p_montant_eur: number }, boolean>(\'ops_cout_autoriser\', [\'p_agent\', \'p_montant_eur\'])\nexport const ops_etat = (): Promise'],
  ],
  'lib/agents/llm.ts': [
    ["import { ops_cout_ajouter } from './bus'", "import { ops_cout_ajouter, ops_cout_autoriser } from './bus'"],
    ['  attendre?: (ms: number) => Promise<void>\n}\n\nexport const PLAFONDS',
      '  attendre?: (ms: number) => Promise<void>\n' +
      '  /** Le coût en euros d\'une voie : un nombre fini ≥ 0, sinon l\'appel est refusé (un coût inconnu n\'est pas 0). */\n' +
      '  coutDeVoie?: (id: string, detail: Record<string, unknown>) => unknown\n' +
      '  /** Le plafond du jour, contrôlé AVANT l\'appel : Promise<true> autorise ; tout autre retour, ou une exception, refuse. */\n' +
      '  verifierPlafond?: (agent: string, coutPrevuEuros: number) => Promise<unknown>\n}\n\nexport const PLAFONDS'],
    ['// ── emballerDonnees / retirerCoordonnees (contrat inchangé de 026-041)',
      '// ── le coût et le plafond, AVANT l\'appel (plafond de 0 € par agent) ─────────────────────────────────────────────────────\n' +
      '/** La liste fermée des voies dont la gratuité tient à leur nature (abonnement de Benj, machine locale) : toute autre voie a un coût INCONNU. */\n' +
      'export const COUT_VOIE_EUROS: Readonly<Record<string, number>> = Object.freeze({ codex: 0, freellmapi: 0, ollama_local: 0, laya: 0 })\n' +
      'function coutDeVoieParDefaut(id: string): number | undefined {\n' +
      '  return Object.prototype.hasOwnProperty.call(COUT_VOIE_EUROS, id) ? COUT_VOIE_EUROS[id] : undefined\n' +
      '}\n' +
      'const coutValide = (c: unknown): c is number => typeof c === \'number\' && Number.isFinite(c) && c >= 0\n' +
      '/** La base dit oui (true) ou non ; une panne, un retour inattendu ou une exception REFUSENT : jamais « au mieux ». */\n' +
      'async function verifierPlafondReel(agent: string, coutPrevuEuros: number): Promise<boolean> {\n' +
      '  try {\n' +
      '    const r = await ops_cout_autoriser({ p_agent: agent, p_montant_eur: coutPrevuEuros })\n' +
      '    return r.ok === true && r.data === true\n' +
      '  } catch { return false }\n' +
      '}\n' +
      'async function plafondAutorise(verifier: NonNullable<DepsLecteur[\'verifierPlafond\']>, agent: string, cout: number): Promise<boolean> {\n' +
      '  try { return (await verifier(agent, cout)) === true } catch { return false }\n' +
      '}\n\n' +
      '// ── emballerDonnees / retirerCoordonnees (contrat inchangé de 026-041)'],
    ["  const fournisseur = typeof detail?.moteur === 'string' ? String(detail.moteur) : 'inconnu'\n",
      "  if (typeof montant !== 'number' || !Number.isFinite(montant) || montant < 0) return { coupe: true } // un coût inconnu n'est pas un coût nul\n  const fournisseur = typeof detail?.moteur === 'string' ? String(detail.moteur) : 'inconnu'\n"],
    ['  const attendreFn = deps.attendre ?? attendreReel\n\n  const candidats = repli.voies',
      '  const attendreFn = deps.attendre ?? attendreReel\n  const coutDeVoieFn = deps.coutDeVoie ?? ((id: string) => coutDeVoieParDefaut(id))\n  const verifierPlafondFn = deps.verifierPlafond ?? verifierPlafondReel\n\n  const candidats = repli.voies'],
    ["      if (coupe) throw new Error('exécution coupée (plafond de coût)')\n      const resultat = await essayerUneVoie(id, systeme, donnees)\n\n      let retourCout: RetourCout\n      try { retourCout = await enregistrerCoutFn(agent, 0, resultat.detail) }",
      "      if (coupe) throw new Error('exécution coupée (plafond de coût)')\n" +
      "      // Vérifier → appeler → inscrire : le coût est celui de la liste fermée (inconnu ou non numérique : refusé), le plafond du jour\n" +
      "      // est contrôlé AVANT l'appel, jamais constaté après coup.\n" +
      "      const cout = coutDeVoieFn(id, { moteur: id })\n" +
      "      if (!coutValide(cout)) throw new Error('coût inconnu : appel refusé')\n" +
      "      if (!(await plafondAutorise(verifierPlafondFn, agent, cout))) throw new Error('plafond de coût : appel refusé avant consommation')\n" +
      "      const resultat = await essayerUneVoie(id, systeme, donnees)\n\n      let retourCout: RetourCout\n      try { retourCout = await enregistrerCoutFn(agent, cout, resultat.detail) }"],
    ['  if (!urlBase) return null\n',
      "  if (!urlBase) return null\n  const coutConseil = coutDeVoieParDefaut(estD1 ? 'ollama_local' : 'freellmapi')\n  const verifierPlafondFn = deps.verifierPlafond ?? verifierPlafondReel\n  if (!coutValide(coutConseil) || !(await plafondAutorise(verifierPlafondFn, 'entraide', coutConseil))) return null\n"],
    ["      await enregistrerCoutFn('entraide', 0, { moteur, modele, fournisseur_reel: resultat.fournisseurReel })\n      continue",
      "      await enregistrerCoutFn('entraide', coutConseil, { moteur, modele, fournisseur_reel: resultat.fournisseurReel })\n      continue"],
    ["    await enregistrerCoutFn('entraide', 0, { moteur, modele, fournisseur_reel: resultat.fournisseurReel })\n    const lignes",
      "    await enregistrerCoutFn('entraide', coutConseil, { moteur, modele, fournisseur_reel: resultat.fournisseurReel })\n    const lignes"],
    ['  if (!chemin) return null\n',
      "  if (!chemin) return null\n  const coutJev = coutDeVoieParDefaut('laya')\n  const verifierPlafondFn = deps.verifierPlafond ?? verifierPlafondReel\n  if (!coutValide(coutJev) || !(await plafondAutorise(verifierPlafondFn, 'laya', coutJev))) return null\n"],
    ["  await enregistrerCoutFn('laya', 0, { moteur: 'laya', mode })", "  await enregistrerCoutFn('laya', coutJev, { moteur: 'laya', mode })"],
  ],

  // GF-8 : le coupe-circuit ne tolère aucun euro.
  'lib/agents/veilleur.ts': [
    ['  // 5. le coupe-circuit : 150 € sans recette', '  // 5. le coupe-circuit : tout euro de coût sans recette (plafond de 0 € par agent)'],
    ['if (couts > 150) {', 'if (couts > 0) {'],
    ["'coupe-circuit : 150 € dépensés sans recette'", "'coupe-circuit : des euros dépensés sans recette'"],
    ["'Coupe-circuit : 150 € dépensés ce mois sans aucune recette. Laisser les agents en pause ?'", "'Coupe-circuit : des euros dépensés ce mois sans aucune recette. Laisser les agents en pause ?'"],
  ],

  // GF-6 : la quarantaine (bornes Unicode : \b ne connaît que l'ASCII, « crédit », « € », « dépenser » lui échappent).
  'scripts/orchestre.mjs': [
    ['const MOTS_SENSIBLES = /\\b(argent|prix|paiement|payer|abonnement|achat|facture|crédit|budget|€|\\$|supprim|irréversible|irrévocable|envoi|envoyer|publi|migration|marque|promesse|positionnement)\\b/i',
      '// Bornes Unicode (\\b ne connaît que l\'ASCII : « crédit », « dépenser », « € » et « $ » lui échappaient) et radicaux élargis (tarif, coût, dollars…).\n' +
      'const MOTS_SENSIBLES = /(?<![\\p{L}\\p{N}_])(?:argent|prix|tarif|pai(?:ement|e)|pay(?:er|ant|é)|abonnement|ach(?:at|et|ète|eter)|factur|cr[ée]dit|budget|d[ée]pens|co[uû]t|euro|dollar|usd|plafond|supprim|irr[ée]versible|irr[ée]vocable|envoi|envoy|publi|migration|marque|promesse|positionnement)\\p{L}*|[€$]/iu'],
  ],

  // GF-7 : plus aucun budget donné à un agent, même d'essai.
  'scripts/pilotage-recette.mjs': [['p_plafond_euros_jour: 1 })', 'p_plafond_euros_jour: 0 })']],

  // GF-5 : les trois voies payantes hors liste fermée passent par le point de contrôle unique.
  'scripts/coentreprise.mjs': [
    ["import { fileURLToPath } from 'url'\n", "import { fileURLToPath } from 'url'\nimport { autoriserDepense, jetonDepenseDeLEnv, coutEstimeDeLEnv } from '../lib/agents/depense.mjs'\n"],
    ["const api = async (p, { beta = BETA_AGENTS, ...o } = {}) => {\n",
      "const api = async (p, { beta = BETA_AGENTS, ...o } = {}) => {\n" +
      "  const garde = autoriserDepense({ agent: 'coentreprise', fournisseur: 'anthropic_api', cout_eur: coutEstimeDeLEnv(), jeton_depense: jetonDepenseDeLEnv() })\n" +
      "  if (!garde.ok) throw new Error(`dépense refusée (${garde.motif}) : une session Managed Agents se paie, seul un jeton de dépense de Benj l'autorise`)\n"],
  ],
  'scripts/savoir/chercher.mjs': [
    ["import { fileURLToPath } from 'node:url'\n", "import { fileURLToPath } from 'node:url'\nimport { autoriserDepense, jetonDepenseDeLEnv, coutEstimeDeLEnv } from '../../lib/agents/depense.mjs'\n"],
    ["  const appel = async (operation, corps, entetes) => {\n    const r = await fetch(`${HOTE_FIRECRAWL}",
      "  const appel = async (operation, corps, entetes) => {\n" +
      "    const garde = autoriserDepense({ agent: 'savoir', fournisseur: 'firecrawl', cout_eur: coutEstimeDeLEnv(), jeton_depense: jetonDepenseDeLEnv() })\n" +
      "    if (!garde.ok) return { statut: 403, corps: { refus: `depense_${garde.motif}` } }\n" +
      "    const r = await fetch(`${HOTE_FIRECRAWL}"],
    ["  return async (question) => {\n    let r\n",
      "  return async (question) => {\n" +
      "    const garde = autoriserDepense({ agent: 'savoir', fournisseur: 'perplexity', cout_eur: coutEstimeDeLEnv(), jeton_depense: jetonDepenseDeLEnv() })\n" +
      "    if (!garde.ok) return { refus: `depense_${garde.motif}` }\n    let r\n"],
  ],
  'scripts/agents/mesure-a-sec.mjs': [
    ["import { fileURLToPath } from 'node:url'\n", "import { fileURLToPath } from 'node:url'\nimport { autoriserDepense, jetonDepenseDeLEnv, coutEstimeDeLEnv } from '../../lib/agents/depense.mjs'\n"],
    ["  if (operation !== 'scrape') return { statut: 400, corps: null } // la mesure ne fait que lire une page\n",
      "  if (operation !== 'scrape') return { statut: 400, corps: null } // la mesure ne fait que lire une page\n" +
      "  const garde = autoriserDepense({ agent: 'mesure_a_sec', fournisseur: 'firecrawl', cout_eur: coutEstimeDeLEnv(), jeton_depense: jetonDepenseDeLEnv() })\n" +
      "  if (!garde.ok) return { statut: 403, corps: null }\n"],
  ],
}

// ── Les documents (GF-7) : la ligne qui prévoit la dépense est annotée ; rien d'autre ne change ───────────────────────────────────
const DOCUMENTS = {
  'reprise-cloud/docs/Ecosysteme-Plan-2026-09-24.md': ['  - la clé « agents » : plafond de 30 $, 10 à 20 €', '  - clé Anthropic « agents » : 30 $/mois, alertes'],
  'reprise-cloud/docs/Ecosysteme-Prospection-Gratuite-2026-09-24.md': ['- **R16, la clé « agents »** : plafond de 30 $/mois'],
  'reprise-cloud/docs/Ecosysteme-Recherche-Agents-2026-09-24.md': ['  - La clé « agents » à 30 $/mois du plan protège le mois.'],
  'reprise-cloud/docs/Ecosysteme-Rectification-2026-09-24.md': ['| R15 | **Pub Meta à formulaire**', '| R16 | **Clé « agents »**'],
}
function annoter(texte, chemin, debuts) {
  const lignes = texte.split('\n')
  for (const d of debuts) {
    const i = lignes.findIndex((l) => l.startsWith(d))
    if (i < 0 || lignes.filter((l) => l.startsWith(d)).length !== 1) throw new Error(`${chemin} : la ligne « ${d} » doit figurer une fois`)
    lignes[i] = lignes[i].trimEnd().endsWith('|') ? lignes[i].replace(/\s*\|\s*$/, `${MARQUE_DOC} |`) : lignes[i] + MARQUE_DOC
  }
  return lignes.join('\n')
}

// ── Les fichiers neufs ────────────────────────────────────────────────────────────────────────────────────────────────────────
const NEUFS = {}
NEUFS['lib/agents/depense.mjs'] = `// lib/agents/depense.mjs — le point de contrôle UNIQUE de la dépense des agents (plafond de 0 € par agent). JavaScript pur, importable
// par un script comme par du TypeScript : ni réseau, ni base, ni secret lu ailleurs que dans l'environnement qu'on lui passe.
//
// Règle : un agent ne dépense rien. Une voie dont la gratuité tient à sa nature (abonnement de Benj, machine locale) est dans la liste
// fermée GRATUITS et passe à 0 €. Tout le reste — une voie payante, une voie inconnue, un coût > 0 — exige un JETON DE DÉPENSE émis par
// Benj : { emis_par: 'benj', fournisseur, montant_max_eur > 0, expire_le (futur), signature (hex, 64) }, dont la signature est vérifiée
// (HMAC-SHA256 avec PRESTI_SECRET_DEPENSE, que Benj seul détient). Un coût inconnu ou non numérique est refusé, jamais compté 0.
// Sans vérificateur de signature et sans secret, un jeton est REFUSÉ : fail-closed.
import crypto from 'node:crypto'

/** La liste fermée : ces voies sont gratuites par nature (abonnement ChatGPT de Benj, IA locale de l'usine). */
export const GRATUITS = Object.freeze(['codex', 'freellmapi', 'ollama_local', 'laya'])

/** Le coût déclaré d'un fournisseur : 0 pour la liste fermée, sinon INCONNU (undefined). */
export function coutDeclare(fournisseur) { return GRATUITS.includes(fournisseur) ? 0 : undefined }

/** L'estimation de coût (en euros) que Benj pose dans PRESTI_COUT_ESTIME_EUR avec son jeton ; absente ou illisible : undefined. */
export function coutEstimeDeLEnv(env = process.env) {
  const v = env?.PRESTI_COUT_ESTIME_EUR
  if (typeof v !== 'string' || !/^\\d+(?:\\.\\d+)?$/.test(v.trim())) return undefined
  return Number(v)
}

/** Le jeton de dépense de Benj, lu dans PRESTI_JETON_DEPENSE (JSON) ; null s'il est absent ou illisible. */
export function jetonDepenseDeLEnv(env = process.env) {
  try { const j = JSON.parse(env?.PRESTI_JETON_DEPENSE ?? ''); return j && typeof j === 'object' && !Array.isArray(j) ? j : null } catch { return null }
}

/** La vérification par défaut : HMAC-SHA256(secret, fournisseur|montant|expiration) ; pas de secret de 32 signes au moins : faux. */
export function verifierSignatureParDefaut(jeton, env = process.env) {
  const secret = env?.PRESTI_SECRET_DEPENSE
  if (typeof secret !== 'string' || secret.length < 32) return false
  const attendue = crypto.createHmac('sha256', secret).update(\`\${jeton.fournisseur}|\${jeton.montant_max_eur}|\${jeton.expire_le}\`).digest()
  const recue = Buffer.from(String(jeton.signature), 'hex')
  return recue.length === attendue.length && crypto.timingSafeEqual(recue, attendue)
}

/** → { ok, motif }. Ne lève jamais : un refus se rend. deps : { maintenant?: () => number, verifierSignature?: (jeton) => boolean, env? }. */
export function autoriserDepense(demande, deps = {}) {
  const refus = (motif) => ({ ok: false, motif })
  try {
    if (!demande || typeof demande !== 'object' || Array.isArray(demande)) return refus('demande_invalide')
    const { agent, fournisseur, cout_eur: cout, jeton_depense: jeton } = demande
    if (typeof agent !== 'string' || !agent || typeof fournisseur !== 'string' || !fournisseur) return refus('demande_invalide')
    if (typeof cout !== 'number' || !Number.isFinite(cout) || cout < 0) return refus('cout_inconnu')
    if (GRATUITS.includes(fournisseur) && cout === 0) return { ok: true, motif: 'gratuit' }
    if (!jeton || typeof jeton !== 'object' || Array.isArray(jeton)) return refus('jeton_absent')
    const maintenant = (deps.maintenant ?? Date.now)()
    const expire = Date.parse(jeton.expire_le)
    const borne = typeof jeton.montant_max_eur === 'number' && Number.isFinite(jeton.montant_max_eur) && jeton.montant_max_eur > 0
    if (jeton.emis_par !== 'benj' || jeton.fournisseur !== fournisseur || !borne || !Number.isFinite(expire) || expire <= maintenant || !/^[0-9a-f]{64}$/i.test(String(jeton.signature))) return refus('jeton_invalide')
    if (cout > jeton.montant_max_eur) return refus('jeton_insuffisant')
    const verifier = deps.verifierSignature ?? ((j) => verifierSignatureParDefaut(j, deps.env ?? process.env))
    if (verifier(jeton) !== true) return refus('signature_refusee')
    return { ok: true, motif: 'jeton_de_benj' }
  } catch { return refus('erreur') }
}
`

NEUFS['supabase/migrations/0121_plafond_avant_coup.sql'] = `-- ============================================================================================
-- 0121 · Le plafond de 0 € par agent, contrôlé AVANT la dépense (règle du 30/09 : l'écosystème agit seul, le plafond est mécanisé)
--        Témoin du juge scripts/garde-plafond-qa.mjs : le correctif minimal que Claude Code reportera.
--
-- Ce que ce fichier change :
--   · le plafond par défaut d'un agent passe de 1 € (0096) à 0 € ; les lignes déjà semées au défaut (0096 sème sans plafond) sont remises à 0 ;
--   · ops_cout_autoriser (NOUVELLE) : dit oui ou non AVANT l'appel d'une voie ; un coût NULL, NaN ou négatif est refusé, un agent inconnu est
--     refusé, et un dépassement du plafond du jour met l'agent en pause et ouvre une décision d'argent (comme avant, mais avant le coût) ;
--   · ops_cout_ajouter (REMPLACÉE) : refuse un montant inconnu (ops:cout_inconnu) et un dépassement (ops:plafond) AVANT d'inscrire la
--     ligne ; elle ne rend plus un total constaté après coup.
-- Rejouable sans dommage (create or replace, alter … set default, update idempotent).
-- ============================================================================================

alter table ops.agents alter column plafond_euros_jour set default 0;
update ops.agents set plafond_euros_jour = 0 where plafond_euros_jour <> 0;

create or replace function public.ops_cout_autoriser(p_agent text, p_montant_eur numeric)
returns boolean
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_agent ops.agents%rowtype;
  v_jour timestamptz;
  v_total numeric;
begin
  if p_montant_eur is null or p_montant_eur = 'NaN'::numeric or p_montant_eur < 0 then
    return false;
  end if;
  select a.* into v_agent from ops.agents a where a.nom = p_agent and a.retire_le is null;
  if not found then
    return false;
  end if;
  v_jour := date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  select coalesce(sum(c.montant_eur), 0) into v_total from ops.couts c where c.agent = p_agent and c.le >= v_jour;
  if v_total + p_montant_eur > v_agent.plafond_euros_jour then
    if not v_agent.en_pause then
      perform public.ops_agent_pause(p_agent, true, 'plafond de coûts du jour atteint');
      perform public.ops_decision_creer(p_agent,
        left('L''agent ' || p_agent || ' a atteint son plafond du jour (' || to_char(v_agent.plafond_euros_jour, 'FM999990.00') || ' euros) : il est en pause. Le reprendre ou le laisser en pause ?', 300),
        left('coût prévu : ' || to_char(p_montant_eur, 'FM999999990.0000') || ' euros ; déjà dépensé aujourd''hui : ' || to_char(v_total, 'FM999999990.00') || ' euros', 2000),
        jsonb_build_array(jsonb_build_object('cle', 'reprendre', 'libelle', 'Reprendre l''agent', 'recommandee', false),
                          jsonb_build_object('cle', 'laisser_en_pause', 'libelle', 'Le laisser en pause', 'recommandee', true)),
        'laisser_en_pause', null, 'argent', now() + interval '24 hours',
        'cout_plafond:' || p_agent || ':' || (extract(epoch from now()) * 1000000)::bigint, null);
    end if;
    return false;
  end if;
  return true;
end
$$;
revoke all on function public.ops_cout_autoriser(text, numeric) from public, anon, authenticated;
grant execute on function public.ops_cout_autoriser(text, numeric) to service_role;
comment on function public.ops_cout_autoriser(text, numeric) is
  'Contrôle AVANT la dépense (0121) : vrai si total du jour + montant prévu tient dans plafond_euros_jour ; faux pour un montant NULL, NaN ou négatif, un agent inconnu ou un dépassement (qui met l''agent en pause et ouvre une décision d''argent).';

create or replace function public.ops_cout_ajouter(p_agent text, p_fournisseur text, p_montant_eur numeric, p_detail jsonb, p_tache uuid)
returns numeric
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_agent ops.agents%rowtype;
  v_jour timestamptz;
  v_total numeric;
begin
  if p_montant_eur is null or p_montant_eur = 'NaN'::numeric or p_montant_eur < 0 then
    raise exception using message = 'ops:cout_inconnu', errcode = 'P0001';
  end if;
  select a.* into v_agent from ops.agents a where a.nom = p_agent for update;
  if not found then
    raise exception using message = 'ops:agent_inconnu', errcode = 'P0001';
  end if;
  v_jour := date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  select coalesce(sum(c.montant_eur), 0) into v_total from ops.couts c where c.agent = p_agent and c.le >= v_jour;
  if v_total + p_montant_eur > v_agent.plafond_euros_jour then
    raise exception using message = 'ops:plafond', errcode = 'P0001';
  end if;
  insert into ops.couts (agent, fournisseur, montant_eur, detail, tache_id)
  values (p_agent, p_fournisseur, p_montant_eur, coalesce(p_detail, '{}'::jsonb), p_tache);
  insert into ops.evenements (agent, type, objet, resume, tache_id)
  values (p_agent, 'cout', left('cout:' || p_fournisseur, 200),
          left('coût de ' || to_char(p_montant_eur, 'FM999999990.0000') || ' euros chez ' || p_fournisseur, 200), p_tache);
  return v_total + p_montant_eur;
end
$$;
revoke all on function public.ops_cout_ajouter(text, text, numeric, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.ops_cout_ajouter(text, text, numeric, jsonb, uuid) to service_role;
comment on function public.ops_cout_ajouter(text, text, numeric, jsonb, uuid) is
  'Inscrit un coût APRÈS l''avoir contrôlé (0121) : montant NULL, NaN ou négatif = ops:cout_inconnu ; total du jour + montant au-dessus de plafond_euros_jour = ops:plafond, rien n''est inscrit. Rend le total du jour de Paris. Agent absent : ops:agent_inconnu.';
`

// ── Fabrication ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const diffs = []
function ecrire(chemin, texte) {
  const f = path.join(SORTIE, `${chemin}.temoin`)
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, texte)
}
fs.rmSync(SORTIE, { recursive: true, force: true })
for (const [chemin, edits] of Object.entries(CORRECTIONS)) {
  const original = lireReference(chemin)
  let t = original
  for (const [avant, apres] of edits) t = remplacer(t, chemin, avant, apres)
  ecrire(chemin, t)
  diffs.push({ chemin, original, corrige: t })
}
for (const [chemin, debuts] of Object.entries(DOCUMENTS)) {
  const original = lireReference(chemin)
  const t = annoter(original, chemin, debuts)
  ecrire(chemin, t)
  diffs.push({ chemin, original, corrige: t })
}
for (const [chemin, texte] of Object.entries(NEUFS)) { ecrire(chemin, texte); diffs.push({ chemin, original: '', corrige: texte }) }
console.log(`témoin fabriqué : ${Object.keys(CORRECTIONS).length} fichiers corrigés, ${Object.keys(DOCUMENTS).length} documents annotés, ${Object.keys(NEUFS).length} fichiers neufs, sous ${path.relative(DEPOT, SORTIE)}`)
if (process.argv.includes('--diffs')) {
  const tmp = path.join(SORTIE, '..', '.diffs-tmp')
  fs.mkdirSync(tmp, { recursive: true })
  let sortie = ''
  for (const d of diffs) {
    const a = path.join(tmp, 'a'), b = path.join(tmp, 'b')
    fs.writeFileSync(a, d.original); fs.writeFileSync(b, d.corrige)
    const r = spawnSync('diff', ['-u', '--label', `a/${d.chemin}`, '--label', `b/${d.chemin}`, a, b], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    sortie += r.stdout
  }
  fs.rmSync(tmp, { recursive: true, force: true })
  fs.writeFileSync(path.join(ICI, 'DIFFS.patch'), sortie)
  console.log(`diffs écrits : scripts/fixtures/026-garde/plafond/DIFFS.patch (${sortie.split('\n').length} lignes)`)
}
