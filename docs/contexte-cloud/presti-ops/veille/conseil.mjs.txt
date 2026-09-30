#!/usr/bin/env node
// conseil.mjs — l'entraide des IA (27/09/2026, demande de Benj) : quand le juge refuse un tour de Codex, une AUTRE IA relit le verdict
// et la fin du travail, et propose des corrections concrètes que Codex reçoit au tour suivant.
// Public (sans donnée de prospect) : Mistral Large 3 → GPT-OSS 120B (Cerebras) → Devstral 2, par freellmapi.
// Privé (--prive : données de prospects) : Qwen3 8B en LOCAL par Ollama — rien ne sort de l'usine.
// Usage : node conseil.mjs --verdict=<fichier> --journal=<fichier> --consigne=<fichier> [--prive]
import { readFileSync, existsSync } from 'node:fs'
const A = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')))
const lire = (p, n) => (p && existsSync(p) ? readFileSync(p, 'utf8').slice(-n) : '')
const PRIVE = ('prive' in A)
const verdict = lire(A.verdict, PRIVE ? 1500 : 4000); const journal = lire(A.journal, PRIVE ? 1500 : 6000); const consigne = lire(A.consigne, PRIVE ? 1500 : 5000)
const prompt = `Tu es le relecteur d'une autre IA (Codex) qui n'a pas encore passé son juge. Tu ne fais pas le travail : tu aides.
CONSIGNE DE LA TÂCHE (extrait) :\n${consigne}\n\nVERDICT DU JUGE :\n${verdict}\n\nFIN DU JOURNAL DE CODEX :\n${journal}\n
Donne 5 corrections au plus, concrètes et vérifiables, dans l'ordre d'importance. Pour chacune : le manque du juge qu'elle vise, et l'action exacte (fichier, commande, contenu). Français, 25 lignes au plus. Pas de flatterie, pas de répétition du verdict.`
const essais = PRIVE
  ? [{ url: 'http://127.0.0.1:11434/v1/chat/completions', cle: null, modele: 'qwen3:4b-instruct-2507-q4_K_M', nom: 'Ollama local qwen3:4b' }]
  : [['mistral-large-3', 'Mistral Large 3'], ['gemini-3.5-flash', 'Gemini 3.5 Flash'], ['gpt-oss-120b', 'GPT-OSS 120B'], ['gemini-3.7-flash', 'Gemini 3.7 Flash'], ['devstral-2', 'Devstral 2']].map(([m, n]) => ({ url: 'http://127.0.0.1:3001/v1/chat/completions', cle: process.env.FL_KEY, modele: m, nom: `${n} (freellmapi)` }))
for (const e of essais) {
  try {
    const r = await fetch(e.url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(e.cle ? { Authorization: `Bearer ${e.cle}` } : {}) }, body: JSON.stringify({ model: e.modele, max_tokens: PRIVE ? 600 : 1500, temperature: 0.2, messages: [{ role: 'user', content: prompt }], ...(e.cle ? {} : { think: false }) }), signal: AbortSignal.timeout(PRIVE ? 420000 : 240000) })
    const j = await r.json(); const t = j?.choices?.[0]?.message?.content?.trim()
    if (t) { console.log(`CONSEIL D'UNE AUTRE IA (${e.nom}) :\n${t.replace(/<think>[\s\S]*?<\/think>/g, '').trim()}`); process.exit(0) }
  } catch {}
}
console.log('CONSEIL : aucune IA relectrice disponible pour ce tour.')
