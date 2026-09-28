// scripts/fixtures/contenu/temoin/scripts/contenu/veille.mjs — TÉMOIN de `scripts/contenu/veille.mjs` (026-215,
// partie « veille », corrigée le 27/09 : Firecrawl seulement en `lire` sur une URL publique de site d'entreprise,
// jamais `chercher`, jamais un nom/pseudo/téléphone/e-mail dans l'adresse ; aucune donnée de prospect vers une IA
// gratuite ni vers Ollama `:cloud`.
const RE_EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/
const RE_TEL_FR = /(?:\+33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}/

export function verdictFirecrawl(operation, url) {
  if (operation !== 'lire') return { ok: false, motif: `operation « ${operation} » refusée : Firecrawl ne sert qu'en « lire », jamais « chercher » (une requête libre peut porter un nom)` }
  if (RE_EMAIL.test(url) || RE_TEL_FR.test(url)) return { ok: false, motif: 'URL portant une adresse ou un téléphone : refusée avant tout appel Firecrawl' }
  try { new URL(url) } catch { return { ok: false, motif: 'URL invalide' } }
  return { ok: true }
}

export function verdictEnvoiIA(texte, moteur) {
  const gratuitOuCloud = moteur === 'freellmapi' || /:cloud$/i.test(String(moteur || '')) || moteur === 'ollama_cloud'
  const peutPorterUnProspect = RE_EMAIL.test(texte) || RE_TEL_FR.test(texte)
  if (gratuitOuCloud && peutPorterUnProspect) return { ok: false, motif: `donnée pouvant identifier un prospect vers « ${moteur} » : interdit (Codex ou local seulement)` }
  return { ok: true }
}
