#!/usr/bin/env node
// hooks/garde-agents-orca.mjs — crochet PreToolUse « Bash » et « PowerShell » de Claude Code (02/11/2026, défaut E de l'audit 031-012).
//
// Pourquoi ce fichier existe : depuis le 02/11, la file n8n lance aussi Claude Code par Orca (`orca agent launch --agent claude`), et
// Benj fait passer les tâches de Claude Code par des conversations Orca. Une telle session tourne sans personne devant, et Orca ne
// propose aucune option de permission : rien de mécanique n'arrêtait un `git push` (un push sur `main` déploie la production), un
// commit, un build sur le `.next` partagé ou une migration. Or ces gestes reviennent à l'agent principal, après l'accord de Benj
// (`.claude/rules/securite.md`, « Interdits des sous-agents »).
//
// Le crochet ne joue QUE dans une session lancée par Orca : Orca pose `ORCA_TERMINAL_HANDLE` dans chacun de ses terminaux (relevé du
// 02/11). La session principale de Benj (application Claude, terminal ordinaire) ne la porte pas et n'est jamais bloquée ici.
//
// Entrée : sur stdin, le JSON des crochets : { "tool_name": "Bash" | "PowerShell", "tool_input": { "command": "…" } }.
// Sortie : rien (code 0), ou un message sur stderr qui nomme la règle (code 2 = l'outil est bloqué).
// Prudent par construction : le motif est cherché dans TOUTE la ligne, guillemets compris. Un faux refus (« echo git push ») coûte une
// reformulation ; un faux passage coûterait la production. Entrée illisible : on laisse passer (ce n'est pas une commande).
import fs from 'node:fs'

/** Les gestes réservés à l'agent principal. `sauf` : la forme permise du même geste (build isolé par PRESTI_DIST). */
export const REGLES = [
  { regle: 'git-commit-push', motif: /\bgit(?:\s+(?:-C\s+\S+|-c\s+\S+|--[\w-]+(?:=\S+)?))*\s+(?:commit|push|merge|rebase|cherry-pick|revert|am|tag)\b/i,
    pourquoi: 'commit, push, fusion et réécriture de branche reviennent à l’agent principal ; un push sur main déploie la production' },
  { regle: 'deploiement', motif: /\b(?:vercel|netlify)\b/i, pourquoi: 'un déploiement revient à l’agent principal, après l’accord de Benj' },
  { regle: 'migration', motif: /appliquer-migration|\bsupabase\s+(?:db\s+(?:push|reset)|migration\s+(?:up|repair))\b|\bpsql\b/i,
    pourquoi: 'une migration touche la base réelle : elle attend le « go » écrit de Benj et revient à l’agent principal' },
  { regle: 'build-partage', motif: /\bnpm\s+run\s+(?:build|dev|start)\b|\bnext\s+(?:build|dev|start)\b|tout-verifier\.mjs/i, sauf: /\bPRESTI_DIST=\S+/,
    pourquoi: 'le dossier .next est partagé (un build parallèle a déjà cassé celui de l’agent principal) ; un build se fait sur un dossier isolé, PRESTI_DIST=.next-prod devant' },
]

/** La règle qui refuse `commande`, ou null. Pure. */
export function refusPour(commande) {
  const c = String(commande ?? '')
  for (const r of REGLES) if (r.motif.test(c) && !(r.sauf && r.sauf.test(c))) return r
  return null
}

function principal() {
  if (!process.env.ORCA_TERMINAL_HANDLE) return 0
  let entree = {}
  try { entree = JSON.parse(fs.readFileSync(0, 'utf8') || '{}') } catch { return 0 }
  const outil = entree?.tool_name
  if (outil !== 'Bash' && outil !== 'PowerShell') return 0
  const r = refusPour(entree?.tool_input?.command)
  if (!r) return 0
  process.stderr.write(`Refusé (${r.regle}) : session lancée par Orca — ${r.pourquoi}. Écris-le dans ta preuve ; l'agent principal s'en charge (.claude/rules/securite.md).\n`)
  return 2
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) process.exit(principal())
