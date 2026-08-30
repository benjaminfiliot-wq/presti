// Éval de l'IA Presti : génère devis + réponses sur une matrice de situations, avec contrôles auto.
// Usage : node scripts/ai-eval.mjs [standard|pro|expert]   (défaut : pro)
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY
const { generateDevis, generateLeadReply } = await import('../lib/ai.ts')

const TIER = { standard: 'claude-haiku-4-5', pro: 'claude-sonnet-5', expert: 'claude-opus-5' }
const model = TIER[(process.argv[2] || 'pro')] || TIER.pro
console.log(`\n★ Éval IA Presti — modèle ${model}\n`)

const green = (s) => `\x1b[32m${s}\x1b[0m`, red = (s) => `\x1b[31m${s}\x1b[0m`
const ok = (c) => (c ? green('✓') : red('✗'))

// ── Devis : métiers × chantiers ───────────────────────────────────────────────
const DEVIS = [
  { metier: 'Plombier', desc: 'Remplacement chauffe-eau 200L, dépose ancien, pose neuf + groupe de sécurité' },
  { metier: 'Électricien', desc: 'Mise aux normes tableau électrique + 8 prises + 4 points lumineux dans un T3' },
  { metier: 'Menuisier', desc: 'Pose de 4 fenêtres double vitrage PVC en rénovation (dépose comprise)' },
]
for (const { metier, desc } of DEVIS) {
  const t0 = Date.now()
  const r = await generateDevis({ nom: 'Test', metier }, desc, [], model)
  const tvaOk = r.lignes.every((l) => [0, 5.5, 10, 20].includes(Number(l.tva_taux)))
  const qteOk = r.lignes.every((l) => Number(l.quantite) > 0 && Number(l.prix_unitaire_ht) >= 0)
  const nbOk = r.lignes.length >= 3 && r.lignes.length <= 12
  const noteOk = (r.note || '').length > 20
  console.log(`DEVIS ${metier} — ${((Date.now() - t0) / 1000).toFixed(1)}s — ${r.lignes.length} lignes`)
  console.log(`  ${ok(tvaOk)} TVA valide  ${ok(qteOk)} quantités/prix bornés  ${ok(nbOk)} 3-12 lignes  ${ok(noteOk)} note d'hypothèses`)
  r.lignes.slice(0, 3).forEach((l) => console.log(`     • ${l.designation.slice(0, 60)} | ${l.quantite}${l.unite} | ${l.prix_unitaire_ht}€ HT | ${l.tva_taux}%`))
  console.log('')
}

// ── Réponses : situations client ──────────────────────────────────────────────
const REPLIES = [
  { label: 'URGENCE', lead: { nom_prospect: 'Julie', contact: 'julie@x.fr', message: "Fuite sous l'évier depuis ce matin, ça coule, urgent !" } },
  { label: 'PRIX', lead: { nom_prospect: 'Karim', contact: 'karim@x.fr', message: 'Combien pour repeindre un salon de 25m² ? Votre meilleur prix ?' } },
  { label: 'FLOU', lead: { nom_prospect: '', contact: '06 12 34 56 78', message: 'Bonjour, j\'ai un souci chez moi, pouvez-vous m\'aider ?' } },
  { label: 'RÉCLAMATION', lead: { nom_prospect: 'M. Durand', contact: 'durand@x.fr', message: 'Depuis votre passage la semaine dernière, ça fuit encore. Je suis déçu.' } },
]
const artisan = { nom: 'Marc', metier: 'Plombier', ton_style: 'chaleureux, direct et rassurant' }
const PRIX_RE = /\b\d{2,}\s?(€|euros?|eur)\b/i
for (const { label, lead } of REPLIES) {
  const t0 = Date.now()
  const reply = await generateLeadReply(artisan, lead, model)
  const noPrice = !PRIX_RE.test(reply)
  const signed = reply.includes(artisan.nom)
  const len = reply.split(/\s+/).length
  const lenOk = len >= 15 && len <= 160
  console.log(`RÉPONSE ${label} — ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log(`  ${ok(noPrice)} aucun prix chiffré  ${ok(signed)} signé ${artisan.nom}  ${ok(lenOk)} longueur ok (${len} mots)`)
  console.log('     ' + reply.replace(/\n+/g, '\n     '))
  console.log('')
}
console.log('★ Fin de l\'éval. Relire les sorties (adaptabilité, ton, cohérence) — les ✓/✗ ne sont que des garde-fous.')
