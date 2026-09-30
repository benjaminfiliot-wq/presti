// lib/agents/jetons.ts — les jetons des agents extérieurs à Vercel (fiche 026-040). Pur : ni réseau, ni base, ni secret.
//
// Un jeton : `pa_<nom de l'agent>_<32 octets tirés par crypto.randomBytes, en base64url>` (43 signes, sans remplissage).
// Il s'affiche UNE fois (scripts/agents-jeton.mjs) et ne se garde nulle part en clair : la base ne connaît que son
// empreinte, le sha256 hexadécimal du jeton entier (ops.agents.jeton_hash, migration 0096).
//
// Vérification en temps constant : le jeton n'est jamais comparé à un autre en mémoire. La garde (lib/agents/garde.ts)
// en calcule l'empreinte et demande à la base l'agent qui la porte (`ops_agent_par_jeton`). Ce qui se compare, c'est un
// sha256 : un attaquant qui mesure les temps n'apprend que des préfixes d'empreintes, dont il ne peut rien tirer sans
// une préimage (256 bits au hasard derrière). Le nom lu dans le jeton, lui, est public.
//
// La portée (types de tâches, tables) et le débit sont portés par la ligne de l'agent, pas par le jeton. Un jeton cesse
// de valoir quand on en pose un autre (`--rotation`), quand l'agent est retiré, et il est suspendu tant que l'agent est
// en pause ou son disjoncteur ouvert.
import crypto from 'node:crypto'

/** Le format d'un jeton : le nom (celui d'`ops.agents.nom`), puis 43 signes base64url. */
export const FORMAT_JETON = /^pa_([a-z0-9_]{2,40})_([A-Za-z0-9_-]{43})$/

/** Le nom d'un agent, tel qu'`ops.agents` l'accepte (contrainte de la migration 0096). */
export const FORMAT_NOM_AGENT = /^[a-z0-9_]{2,40}$/

/** Un jeton neuf pour l'agent `nom`. Lève une erreur si le nom n'est pas celui d'un agent possible. */
export function genererJeton(nom: string): string {
  if (typeof nom !== 'string' || !FORMAT_NOM_AGENT.test(nom)) throw new Error('nom d’agent hors format (a-z, 0-9, _ : 2 à 40 signes)')
  return `pa_${nom}_${crypto.randomBytes(32).toString('base64url')}`
}

/** L'empreinte d'un jeton : le sha256 hexadécimal (64 signes) du jeton entier. La seule chose que la base garde. */
export function empreinteJeton(jeton: string): string {
  return crypto.createHash('sha256').update(jeton, 'utf8').digest('hex')
}

/** Le nom de l'agent porté par un jeton au format, ou `null` pour tout le reste (pas une chaîne, hors format). */
export function nomDuJeton(jeton: unknown): string | null {
  if (typeof jeton !== 'string') return null
  const m = FORMAT_JETON.exec(jeton)
  return m ? m[1] : null
}
