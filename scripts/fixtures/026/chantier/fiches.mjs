// Jeux d'essai de CT-1 et CT-3 (026-121) : les fiches proposées, fabriquées à partir de fiche-ok.md un écart à la fois.
// Importé par scripts/chantier-qa.mjs et scripts/juges-026-revue-chantier-preuve.mjs ; n'écrit rien.
//
// Chaque variante : { nom, texte, juge, deja, attendu, pourquoi }
//   texte    le Markdown de la proposition (posée dans <racine>/.orchestre/propositions/<ID>.md) ;
//   juge     le juge proposé posé dans <racine>/scripts/relances-devis-qa.mjs : 'rouge' | 'vert' | 'plante' | 'pass-code1' ;
//   deja     un dossier de .orchestre/ (file, en-cours, fait, refuse) qui contient déjà <ID>.md, ou null ;
//   attendu  le code de sortie attendu de `chantier.mjs verifier-fiche` (0 ou 1).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ICI = path.dirname(fileURLToPath(import.meta.url))
export const ID = '090-relances-devis'
export const CLE = 'chef:2026-09-21:idee-relances-devis'
export const SCRIPT_JUGE = 'scripts/relances-devis-qa.mjs'
export const JUGES = {
  rouge: path.join(ICI, 'juges', 'rouge.mjs'),
  vert: path.join(ICI, 'juges', 'vert.mjs'),
  plante: path.join(ICI, 'juges', 'plante.mjs'),
  'pass-code1': path.join(ICI, 'juges', 'pass-code1.mjs'),
}
export const DOSSIERS = ['file', 'en-cours', 'fait', 'refuse']
// Les exécutants de .orchestre/orchestre.json autres que codex et claude-code : chacun a sa variante sur une zone
// protégée (contre-vérification de 026-121, C3 : une zone réservée à claude-code l'est pour TOUS les autres). Un
// exécutant ajouté à orchestre.json sans variante ici fait échouer l'autotest de chantier-qa (verite()).
export const AUTRES_EXECUTANTS = [
  ['antigravity', 'scripts/*-qa.mjs', 'scripts/relances-qa.mjs'],
  ['gemini-cli', 'supabase/**', 'supabase/migrations/0200_relances.sql'],
  ['qwen', 'app/api/agents/**', 'app/api/agents/relances/route.ts'],
]

const PERIMETRE = 'perimetre: [lib/relances/modele.ts, docs/relances.md, .orchestre/preuves/090-relances-devis/**]'
const LIGNE_DECISION = `Décision : ${CLE}`

// Les zones protégées (026-121 §5, 026-146) et, pour chacune, un chemin concret qu'elle couvre sans ambiguïté :
// une comparaison par préfixe littéral (comme orchestre.mjs) et une comparaison par motif concluent pareil.
export const ZONES = [
  ['supabase/**', 'supabase/migrations/0200_relances.sql'],
  ['lib/plans.ts', 'lib/plans.ts'],
  ['lib/stripe*', 'lib/stripeRelances.ts'],
  ['app/api/stripe/**', 'app/api/stripe/relances/route.ts'],
  ['proxy.ts', 'proxy.ts'],
  ['middleware.ts', 'middleware.ts'],
  ['lib/ai.ts', 'lib/ai.ts'],
  ['lib/agents/llm.ts', 'lib/agents/llm.ts'],
  ['app/api/agents/**', 'app/api/agents/relances/route.ts'],
  ['vercel.json', 'vercel.json'],
  ['scripts/*-qa.mjs', 'scripts/relances-qa.mjs'],
  ['scripts/juges/**', 'scripts/juges/relances.mjs'],
  ['scripts/fixtures/**', 'scripts/fixtures/relances/devis.json'],
  ['.claude/**', '.claude/settings.json'],
  ['.github/**', '.github/workflows/relances.yml'],
  ['../', '../SaaS/relances.md'],
]

export const lireFicheOk = () => fs.readFileSync(path.join(ICI, 'fiche-ok.md'), 'utf8')

function remplacer(texte, avant, apres) {
  if (texte.split(avant).length !== 2) throw new Error(`fiches.mjs : « ${avant.slice(0, 60)} » doit figurer une fois dans fiche-ok.md`)
  return texte.replace(avant, () => apres)
}
const avecPerimetre = (texte, ...chemins) => remplacer(texte, PERIMETRE, PERIMETRE.replace(/\]$/, `, ${chemins.join(', ')}]`))
const executant = (texte, nom) => remplacer(texte, 'executant: codex', `executant: ${nom}`)

export function variantes() {
  const ok = lireFicheOk()
  const v = (nom, texte, attendu, pourquoi, autres = {}) => ({ nom, texte, juge: 'rouge', deja: null, attendu, pourquoi, ...autres })
  const liste = [
    v('conforme', ok, 0, 'fiche conforme, juge rouge sur RD-1'),
    v('juge-vert', ok, 1, 'le juge proposé sort en code 0 avant la fabrication', { juge: 'vert' }),
    v('juge-plante', ok, 1, "le juge proposé échoue sans ligne à identifiant de critère (trace de pile)", { juge: 'plante' }),
    v('juge-pass-code1', ok, 1, 'le juge proposé sort en code 1 sans aucune ligne en échec (seulement des PASS RD-n)', { juge: 'pass-code1' }),
    v('sans-decision', remplacer(ok, `${LIGNE_DECISION}\n`, ''), 1, 'aucune ligne « Décision : »'),
    v('cle-arbitrage', remplacer(ok, LIGNE_DECISION, 'Décision : chef:2026-09-21:budget'), 1, "la clé n'est pas celle d'une idée (chef:<date>:budget)"),
    v('cle-sans-date', remplacer(ok, LIGNE_DECISION, 'Décision : chef:21-09-2026:idee-relances-devis'), 1, "la clé n'a pas la forme chef:<AAAA-MM-JJ>:idee-…"),
    v('cle-autre-prefixe', remplacer(ok, LIGNE_DECISION, 'Décision : a_decider:2026-09-21:idee-relances-devis'), 1, 'la clé ne commence pas par chef:'),
    ...ZONES.map(([zone, chemin]) => v(`zone ${zone}`, avecPerimetre(ok, chemin), 1, `executant codex et périmètre sur la zone protégée ${zone} (${chemin})`)),
    ...AUTRES_EXECUTANTS.map(([nom, zone, chemin]) => v(`executant-${nom}`, executant(avecPerimetre(ok, chemin), nom), 1,
      `executant ${nom} et périmètre sur la zone protégée ${zone} (${chemin}) : réservée à claude-code`)),
    v('zone-claude-code', executant(avecPerimetre(ok, 'supabase/migrations/0200_relances.sql', 'lib/agents/llm.ts', 'lib/ai.ts'), 'claude-code'), 0,
      'la même fiche sur des zones protégées, mais executant claude-code'),
    v('verifier-dans-perimetre', executant(avecPerimetre(ok, SCRIPT_JUGE), 'claude-code'), 1, 'le script de verifier est dans le périmètre'),
    v('verifier-absent', remplacer(ok, `verifier: node ${SCRIPT_JUGE}`, 'verifier: node scripts/relances-absentes-qa.mjs'), 1, 'le script de verifier n\'existe pas'),
    v('entete-refuse', remplacer(ok, 'type: feature', 'type: amelioration'), 1, "un en-tête que « orchestre valider » refuse (type inconnu)"),
    ...DOSSIERS.map((d) => v(`id-deja-${d}`, ok, 1, `l'id ${ID} est déjà dans .orchestre/${d}/`, { deja: d })),
  ]
  return liste
}

// Les fixtures de fiche conforme : chacune doit passer `orchestre valider` (preuve de 026-121).
export const conformes = () => variantes().filter((x) => x.attendu === 0)
