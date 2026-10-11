// 026-178 — la répartition par nature de la Trésorerie : une table FERMÉE NATURE_DE (fournisseur de ops.couts → texte, image, vidéo,
// voix) appliquée à pilotage_couts_modeles(<1er du mois>). Les identifiants sont ceux du catalogue des IA (lib/agents/moteurs.ts) ;
// un fournisseur qui n'y est pas tombe dans « autre » : un coût n'est jamais perdu. Sous `comptabilite`. Plate : la base ne rend pas
// le coût par agent ET par fournisseur, la répartition « par agent » n'a donc pas de source.
import type { Contexte } from '../station'
import { lignes, nombre } from './outils'

export type Nature = 'texte' | 'image' | 'video' | 'voix'
export const NATURE_DE: Readonly<Record<string, Nature>> = Object.freeze({
  'codex': 'texte', 'ollama_local': 'texte', 'ollama_cloud': 'texte', 'ollama': 'texte', 'freellmapi': 'texte', 'laya': 'texte', 'claude': 'texte',
  'perplexity': 'texte', 'firecrawl': 'texte', 'cle_produit': 'texte', 'antigravity': 'texte', 'gemini_cli': 'texte', 'qwen_code': 'texte',
  'cursor': 'texte', 'openclaw': 'texte', 'groq': 'texte',
  'gemini_payant': 'image', 'hyperframes': 'video',
  'kokoro': 'voix', 'fish_audio': 'voix', 'elevenlabs': 'voix', 'faster_whisper': 'voix',
})
export async function parNature(c: Contexte, depuis: string) {
  const out: Record<string, number> = { texte: 0, image: 0, video: 0, voix: 0 }
  for (const x of lignes(await c.rpc('pilotage_couts_modeles', { p_debut: depuis }))) {
    const n = NATURE_DE[String(x.fournisseur)] ?? 'autre'
    out[n] = (out[n] ?? 0) + nombre(x.eur)
  }
  return out
}
