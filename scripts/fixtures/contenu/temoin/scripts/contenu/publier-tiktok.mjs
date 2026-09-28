// scripts/fixtures/contenu/temoin/scripts/contenu/publier-tiktok.mjs — TÉMOIN de `scripts/contenu/publier-tiktok.mjs`
// (026-210, partie « tiktok »). Zéro publication sans accord individuel exact et sans score de vérité suffisant sur
// la légende ET le texte incrusté ; fichier ≤ 9,5 Mo. TT-3 (jamais TikTok Studio ni Creative Center) se juge par
// lecture statique du texte source, dans contenu-qa.mjs — ce témoin n'importe et n'écrit aucune de ces adresses.
import { accordValide, verdictChiffre, porteUneAffirmationChiffree } from '../../lib/contenu/_noyau'

export async function verdictPublicationTikTok(video, ctx, deps = {}) {
  const texteComplet = `${video.legende || ''} ${video.texteIncruste || ''}`.trim()
  if (porteUneAffirmationChiffree(texteComplet)) {
    const v = await verdictChiffre(texteComplet, video.source, deps)
    if (!v.ok) return { ok: false, motif: v.motif }
  }
  const a = accordValide(ctx.decision, video.id, texteComplet)
  if (!a.ok) return { ok: false, motif: `accord individuel requis : ${a.motif}` }
  if ((video.tailleMo ?? 0) > 9.5) return { ok: false, motif: `fichier ${video.tailleMo} Mo > 9,5 Mo` }
  return { ok: true }
}
