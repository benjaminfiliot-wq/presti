// Audit `fb-humanizer --mode audit` sur les variantes Facebook — prompt v14 §1.2.
//
//   node scripts/audit-fb.mjs
//
// Le catalogue Facebook a quatre contrôles que LinkedIn n'a pas, tous cités du SKILL.md :
//
//   • le point idéal sous 80 caractères ;
//   • le pli « See more » — la première ligne doit tenir DEBOUT toute seule ;
//   • l'appât à engagement (« LIKE and SHARE if you agree », « tag 3 friends ») ;
//   • le lien nu sans texte de cadrage, et le plafond de hashtags et d'émojis.
//
// Comme pour LinkedIn : les listes de vocabulaire de la skill sont anglaises et ne traversent
// pas. Ce sont les règles de FORME qu'on applique, et elles traversent très bien.

import fs from 'node:fs'
import path from 'node:path'

const RACINE = path.resolve(import.meta.dirname, '..')
const texte = fs.readFileSync(path.join(RACINE, 'plans', 'publications-10.md'), 'utf8')

// Découpe : chaque « ## Variante B — Facebook » (ou Instagram) et son bloc cité.
const lignes = texte.split(/\r?\n/)
const posts = []
let courant = null
let pub = '??'
for (const l of lignes) {
  const t = l.match(/^#\s+Publication n°\s*(\d+)/)
  if (t) pub = String(t[1]).padStart(2, '0')
  const v = l.match(/^##\s+Variante\s+([AB])\s*—\s*(.+)$/)
  if (v) {
    courant = /facebook|instagram/i.test(v[2]) ? { pub, variante: v[1], canal: v[2].trim(), lignes: [] } : null
    if (courant) posts.push(courant)
    continue
  }
  if (/^##?\s/.test(l)) courant = null
  if (courant && /^>\s?/.test(l)) courant.lignes.push(l.replace(/^>\s?/, ''))
}

console.log(`${posts.length} variantes Facebook/Instagram auditées.\n${'─'.repeat(92)}`)

let bloquants = 0
for (const p of posts) {
  const corps = p.lignes.join('\n').trim()
  const premiere = p.lignes.find((l) => l.trim()) || ''
  const signes = corps.length
  const hashtags = (corps.match(/#\w+/g) || []).length
  const emojis = (corps.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length
  // Le lien nu : dernière ligne non vide qui n'est qu'une adresse, sans phrase autour.
  const dernieres = p.lignes.filter((l) => l.trim())
  const derniere = dernieres[dernieres.length - 1] || ''
  const lienNu = /^\s*(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?\s*$/i.test(derniere)
  const appat = /\b(like et partage|partagez si|commentez\s+oui|taguez? \d+|identifiez? \d+|abonnez-vous et partagez)\b/i.test(corps)
  // Le pli : la première ligne doit se comprendre seule. Approximation honnête — elle ne doit pas
  // se terminer par une virgule, deux-points, « et », « mais », ni commencer par un connecteur.
  const pliCasse = /[,:;]$/.test(premiere.trim()) || /^(et|mais|donc|or|alors|puis|parce que)\b/i.test(premiere.trim())

  const notes = []
  if (lienNu) { notes.push(['BLOQUANT', `lien nu en clôture : « ${derniere.trim()} » — sans texte de cadrage`]); bloquants++ }
  if (appat) { notes.push(['BLOQUANT', 'appât à engagement détecté']); bloquants++ }
  if (pliCasse) { notes.push(['BLOQUANT', `la première ligne ne tient pas seule : « ${premiere.slice(0, 60)}… »`]); bloquants++ }
  if (hashtags >= 5) notes.push(['AVERT', `${hashtags} hashtags (plafond : moins de 5)`])
  if (emojis > 3) notes.push(['AVERT', `${emojis} émojis`])
  if (signes > 80) notes.push(['INFO', `${signes} signes — hors du point idéal sous 80, acceptable si le propos ne tient pas en une phrase`])

  console.log(`\npub-${p.pub} · variante ${p.variante} · ${p.canal}`)
  console.log(`  première ligne : « ${premiere.slice(0, 72)}${premiere.length > 72 ? '…' : ''} »`)
  if (!notes.length) console.log('  ✓ rien à signaler')
  for (const [n, m] of notes) console.log(`  ${n.padEnd(9)} ${m}`)
}

console.log(`\n${'─'.repeat(92)}`)
console.log(bloquants ? `✗ ${bloquants} bloquant(s).` : '✓ Aucun bloquant.')
process.exit(bloquants ? 1 : 0)
