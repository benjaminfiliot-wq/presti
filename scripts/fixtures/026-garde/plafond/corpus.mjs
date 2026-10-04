// scripts/fixtures/026-garde/plafond/corpus.mjs — les jeux d'essai du juge garde-plafond-qa (plafond de 0 € par agent), écrits
// par Claude Code. Rien de réel : des phrases inventées, un plan de chef fictif, des demandes de dépense fictives.
// Le contrôle « JA-3 » du lot (controles.mjs) les relit : effectifs, unicité, plan de base accepté par la référence.

// ── GF-1 : un plan du chef, valide, sans aucun argent ────────────────────────────────────────────────────────────────────────
const HEURE = 3_600_000
/** Le plan de base : une seule décision, deux options, rien d'engagé. `maintenant` : le Date passé à validerPlan. */
export function planDeBase(maintenant) {
  return {
    cycle: 'plein',
    brief: ['Essai du juge', 'Aucune donnée réelle', 'Un plan fictif'],
    compte_rendu: ['Essai un', 'Essai deux', 'Essai trois'],
    consignes_lues: [],
    taches: [],
    decisions: [{
      cle_idempotence: 'chef:2026-09-30:essai-plafond',
      nature: 'arbitrage',
      question: 'Garder la relance du lundi ?',
      contexte: 'Décision fictive du jeu d’essai.',
      options: [
        { cle: 'garder', libelle: 'Garder', recommandee: true, engage_cents: 0 },
        { cle: 'retirer', libelle: 'Retirer', recommandee: false, engage_cents: 0 },
      ],
      option_defaut: 'garder',
      montant_cents: 0,
      portee: 'aucune',
      echeance: new Date(maintenant.getTime() + 2 * HEURE).toISOString(),
    }],
  }
}
/** Les variantes fautives : chacune doit être refusée par validerPlan, avec une faute qui nomme `mot`. */
export const VARIANTES_GF1 = [
  { nom: 'montant-un-centime', mot: 'montant_cents', modifier: (p) => { p.decisions[0].montant_cents = 1 } },
  { nom: 'montant-quarante-neuf-euros', mot: 'montant_cents', modifier: (p) => { p.decisions[0].montant_cents = 4900; p.decisions[0].portee = 'argent' } },
  { nom: 'engage-option-non-defaut', mot: 'engage_cents', modifier: (p) => { p.decisions[0].options[1].engage_cents = 4900 } },
  { nom: 'engage-un-centime', mot: 'engage_cents', modifier: (p) => { p.decisions[0].options[1].engage_cents = 1 } },
]

// ── GF-2 et GF-3 : les coûts, le contrôle avant l'appel ─────────────────────────────────────────────────────────────────────
/** Ce que coutDeVoie rend pour une voie dont le coût est INCONNU : chacun doit faire refuser l'appel. */
export const COUTS_INCONNUS = [
  { nom: 'indefini', valeur: { type: 'undefined' } },
  { nom: 'nul', valeur: { type: 'null' } },
  { nom: 'nan', valeur: { type: 'nan' } },
  { nom: 'chaine-zero', valeur: { type: 'chaine', v: '0' } },
  { nom: 'negatif', valeur: { type: 'nombre', v: -1 } },
  { nom: 'infini', valeur: { type: 'infini' } },
  { nom: 'objet', valeur: { type: 'objet' } },
]
/** Ce que verifierPlafond rend quand le plafond n'est PAS prouvé respecté : chacun doit faire refuser l'appel. */
export const PLAFONDS_REFUSES = [
  { nom: 'faux', valeur: { type: 'nombre-ou-bool', v: false } },
  { nom: 'indefini', valeur: { type: 'undefined' } },
  { nom: 'nul', valeur: { type: 'null' } },
  { nom: 'un', valeur: { type: 'nombre', v: 1 } },
  { nom: 'chaine-oui', valeur: { type: 'chaine', v: 'oui' } },
  { nom: 'exception', valeur: { type: 'exception' } },
]

// ── GF-5 : les demandes de dépense, une à une ──────────────────────────────────────────────────────────────────────────────
const DEMAIN = '2099-01-01T00:00:00.000Z'
const HIER = '2001-01-01T00:00:00.000Z'
const jeton = (o = {}) => ({ emis_par: 'benj', fournisseur: 'firecrawl', montant_max_eur: 5, expire_le: DEMAIN, signature: 'a'.repeat(64), ...o })
/** `ok` : la décision attendue de autoriserDepense(demande, { verifierSignature: () => true, maintenant: () => <2026-09-30> }). */
export const DEMANDES = [
  { nom: 'gratuit-local-zero', ok: true, demande: { agent: 'standardiste', fournisseur: 'ollama_local', cout_eur: 0 } },
  { nom: 'gratuit-codex-zero', ok: true, demande: { agent: 'chef', fournisseur: 'codex', cout_eur: 0 } },
  { nom: 'payant-zero-sans-jeton', ok: false, demande: { agent: 'savoir', fournisseur: 'firecrawl', cout_eur: 0 } },
  { nom: 'payant-cout-connu-sans-jeton', ok: false, demande: { agent: 'savoir', fournisseur: 'perplexity', cout_eur: 0.01 } },
  { nom: 'gratuit-mais-cout-positif-sans-jeton', ok: false, demande: { agent: 'chef', fournisseur: 'codex', cout_eur: 0.5 } },
  { nom: 'fournisseur-inconnu-zero', ok: false, demande: { agent: 'chef', fournisseur: 'inconnu_xyz', cout_eur: 0 } },
  { nom: 'cout-absent', ok: false, demande: { agent: 'savoir', fournisseur: 'firecrawl' } },
  { nom: 'cout-chaine', ok: false, demande: { agent: 'savoir', fournisseur: 'ollama_local', cout_eur: '0' } },
  { nom: 'cout-nan', ok: false, demande: { agent: 'savoir', fournisseur: 'ollama_local', cout_eur: Number.NaN } },
  { nom: 'cout-negatif', ok: false, demande: { agent: 'savoir', fournisseur: 'ollama_local', cout_eur: -1 } },
  { nom: 'agent-absent', ok: false, demande: { fournisseur: 'ollama_local', cout_eur: 0 } },
  { nom: 'jeton-valide', ok: true, demande: { agent: 'savoir', fournisseur: 'firecrawl', cout_eur: 1, jeton_depense: jeton() } },
  { nom: 'jeton-trop-petit', ok: false, demande: { agent: 'savoir', fournisseur: 'firecrawl', cout_eur: 6, jeton_depense: jeton() } },
  { nom: 'jeton-expire', ok: false, demande: { agent: 'savoir', fournisseur: 'firecrawl', cout_eur: 1, jeton_depense: jeton({ expire_le: HIER }) } },
  { nom: 'jeton-autre-fournisseur', ok: false, demande: { agent: 'savoir', fournisseur: 'firecrawl', cout_eur: 1, jeton_depense: jeton({ fournisseur: 'perplexity' }) } },
  { nom: 'jeton-pas-de-benj', ok: false, demande: { agent: 'savoir', fournisseur: 'firecrawl', cout_eur: 1, jeton_depense: jeton({ emis_par: 'chef' }) } },
  { nom: 'jeton-sans-signature', ok: false, demande: { agent: 'savoir', fournisseur: 'firecrawl', cout_eur: 1, jeton_depense: jeton({ signature: '' }) } },
  { nom: 'jeton-cout-chaine', ok: false, demande: { agent: 'savoir', fournisseur: 'firecrawl', cout_eur: '1', jeton_depense: jeton() } },
  { nom: 'jeton-cout-nan', ok: false, demande: { agent: 'savoir', fournisseur: 'firecrawl', cout_eur: Number.NaN, jeton_depense: jeton() } },
  { nom: 'jeton-montant-nul', ok: false, demande: { agent: 'savoir', fournisseur: 'firecrawl', cout_eur: 0, jeton_depense: jeton({ montant_max_eur: 0 }) } },
]
/** Le cas décisif : un jeton de forme valable, SANS vérificateur de signature injecté : refusé (fail-closed par défaut). */
export const DEMANDE_SANS_VERIFICATEUR = { agent: 'savoir', fournisseur: 'firecrawl', cout_eur: 1, jeton_depense: jeton() }

// ── GF-6 : les propositions de la quarantaine ──────────────────────────────────────────────────────────────────────────────
/** Des propositions qui touchent à l'argent ou au prix : la promotion sans --benj doit être refusée (code 3, rien ne bouge). */
export const PROPOSITIONS_ARGENT = [
  'Acheter la clé agents à 30 $ par mois (id de la tâche : 901)',
  'Changer le tarif mensuel de l’offre Pro (id de la tâche : 902)',
  'Dépenser 200 euros en publicités Meta (id de la tâche : 903)',
  'Passer Vercel en Pro pour 20 dollars par mois (id de la tâche : 904)',
  'Souscrire un abonnement ElevenLabs (id de la tâche : 905)',
  'Augmenter le prix du pack Studio (id de la tâche : 906)',
  'Le coût d’une génération Veo est acceptable (id de la tâche : 907)',
  'Ouvrir un budget de 50 € pour les voix (id de la tâche : 908)',
  'Payer l’API Gemini pour les images (id de la tâche : 909)',
  'Publier trois annonces payantes (id de la tâche : 910)',
]
/** Des propositions anodines : la promotion sans --benj doit passer (sinon « tout refuser » passerait pour une garde). */
export const PROPOSITIONS_ANODINES = [
  'Renommer un bouton du tableau de bord (id de la tâche : 911)',
  'Ajouter un test sur la pagination de l’historique (id de la tâche : 912)',
  'Corriger une faute d’orthographe dans la notice (id de la tâche : 913)',
]
