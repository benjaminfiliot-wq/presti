// scripts/cas-urgence-verifier.mjs — le vérificateur du corpus du cerveau « urgence » (lib/ai/cerveaux/urgence/cas.jsonl).
// Ce que l'évaluateur ne juge pas : la VRAISEMBLANCE des messages. Un corpus de 550 lignes télégraphiques sans un
// accent (livraison 014-15 du 13/09 : 17 messages accentués sur 550, longueur médiane 44 caractères, « Devis pose… »
// trente-quatre fois) mesure le cerveau sur une langue que les clients n'écrivent pas. Ici : accents, longueurs
// variées, débuts variés, pas de quasi-doublons, des pièges des deux côtés, zéro donnée réelle — puis l'évaluateur.
//
// Usage : node scripts/cas-urgence-verifier.mjs      (code 0 si tout passe, 1 sinon)
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'lib', 'ai', 'cerveaux', 'urgence', 'cas.jsonl')
let ko = 0
const T = (nom, cond, detail = '') => { if (cond) console.log(`  ✅ ${nom}`); else { ko++; console.log(`  ❌ ÉCHEC : ${nom}${detail ? ' — ' + detail : ''}`) } }

const lignes = fs.readFileSync(F, 'utf8').split(/\r?\n/).filter(Boolean)
const cas = []
for (const [i, l] of lignes.entries()) { try { cas.push(JSON.parse(l)) } catch { console.log(`  ❌ ligne ${i + 1} illisible`); process.exit(1) } }
const synth = cas.filter((c) => /synth/i.test(c.origine || '') && /-(s|p|q)-\d+$/.test(c.id))
const METIERS = ['plombier', 'electricien', 'chauffagiste', 'macon', 'menuisier', 'peintre', 'carreleur', 'couvreur', 'serrurier', 'vitrier', 'paysagiste']

console.log('── 1. La forme')
const ids = new Set()
T('identifiants uniques', cas.every((c) => !ids.has(c.id) && ids.add(c.id)))
T('chaque cas porte id, message, metier, attendu (urgent|normal), origine, statut (reference|ouvert)', cas.every((c) => c.id && typeof c.message === 'string' && c.metier && ['urgent', 'normal'].includes(c.attendu) && c.origine && ['reference', 'ouvert'].includes(c.statut)))
T(`au moins 500 cas synthétiques (${synth.length})`, synth.length >= 500)

console.log('── 2. La langue : ce qu\'un client écrit vraiment')
const accent = synth.filter((c) => /[àâäéèêëîïôöùûüçœÀÂÉÈÊÎÔÙÛÇ]/.test(c.message)).length
T(`au moins 80 % des messages synthétiques portent un accent (${Math.round((accent / synth.length) * 100)} %)`, accent / synth.length >= 0.8)
const longs = synth.filter((c) => c.message.length > 120).length, courts = synth.filter((c) => c.message.length < 40).length
T(`au moins 15 % de messages longs (> 120 caractères : ${Math.round((longs / synth.length) * 100)} %)`, longs / synth.length >= 0.15)
T(`au moins 15 % de messages courts, façon SMS (< 40 caractères : ${Math.round((courts / synth.length) * 100)} %)`, courts / synth.length >= 0.15)
const debuts = {}
for (const c of synth) { const d = c.message.toLowerCase().split(/\s+/).slice(0, 2).join(' '); debuts[d] = (debuts[d] || 0) + 1 }
const pire = Object.entries(debuts).sort((a, b) => b[1] - a[1])[0]
T(`aucun début de message répété plus de 12 fois (pire : « ${pire[0]} » ×${pire[1]})`, pire[1] <= 12)

console.log('── 2 bis. Du français, pas un gabarit (livraison 014-20 refusée le 13/09 : « Critique (carreleur) [carreleur] : Attention (carreleur)… »)')
// Un vrai message de client est fait de mots-outils (je, ma, le, pour, ça…) et ne cite ni son métier entre parenthèses,
// ni son identifiant, ni des crochets. Un gabarit qui gagne les critères de forme sans être une phrase est un refus.
const OUTILS = new Set(['je', 'j', 'ai', 'mon', 'ma', 'mes', 'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'est', 'pour', 'dans', 'sur', 'ca', 'on', 'pas', 'il', 'elle', 'y', 'a', 'au', 'aux', 'en', 'ne', 'qui', 'que', 'chez', 'avec', 'nous', 'vous', 'me', 'se', 'tout', 'plus', 'bien', 'faut', 'peut', 'depuis', 'ce', 'cette', 'c', 'd', 'l', 'n', 's', 'qu', 'si', 'ou', 'car', 'mais', 'donc', 'alors', 'quand', 'comme', 'sans', 'sous', 'vers', 'trop', 'tres', 'deja', 'encore', 'toujours', 'jamais', 'rien', 'hier', 'demain', 'matin', 'soir', 'bonjour', 'bonsoir', 'merci', 'svp', 'stp', 'urgent', 'vite'])
const mots = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean)
const gabarits = synth.filter((c) => {
  const m = c.message
  if (/[\[\]{}#|]/.test(m) || /\((plombier|electricien|électricien|chauffagiste|macon|maçon|menuisier|peintre|carreleur|couvreur|serrurier|vitrier|paysagiste)[^)]*\)/i.test(m) || m.includes(c.id) || /\bref \d+/i.test(m)) return true
  const w = mots(m)
  if (w.length >= 6 && w.filter((x) => OUTILS.has(x)).length / w.length < 0.15) return true
  const compte = {}
  for (const x of w) if (x.length > 3) { compte[x] = (compte[x] || 0) + 1; if (compte[x] >= 4) return true }
  return false
})
T(`aucun message en forme de gabarit (crochets, métier entre parenthèses, identifiant cité, mot répété, moins de 15 % de mots-outils) — ${gabarits.length} trouvé(s)`, gabarits.length === 0, gabarits.slice(0, 3).map((c) => `${c.id} : ${c.message.slice(0, 60)}`).join(' · '))

console.log('── 3. Pas deux fois le même message')
const norm = (s) => new Set(s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean))
const doublons = []
for (let i = 0; i < cas.length; i++) for (let j = i + 1; j < cas.length; j++) {
  const a = norm(cas[i].message), b = norm(cas[j].message); const inter = [...a].filter((x) => b.has(x)).length
  if (inter / (a.size + b.size - inter) >= 0.8) doublons.push(`${cas[i].id} ~ ${cas[j].id}`)
}
T('aucun quasi-doublon (Jaccard sur les mots ≥ 0,8)', doublons.length === 0, doublons.slice(0, 5).join(', '))

console.log('── 4. Les pièges, des deux côtés, par métier')
for (const m of METIERS) {
  const p = synth.filter((c) => c.metier === m && c.attendu === 'normal' && /urgen|press|vite|rapide/i.test(c.message)).length
  const q = synth.filter((c) => c.metier === m && c.attendu === 'urgent' && !/fuite|inond|feu|brul|panne|cass|enferm|bloqu|effraction|danger|urgen|court|disjonct|gaz|infiltr|rupture|arrach|explos|chute|effondr/i.test(c.message)).length
  T(`${m} : ≥ 5 normaux avec un mot d'urgence (${p}) et ≥ 5 urgents sans aucun mot de la liste (${q})`, p >= 5 && q >= 5)
}

console.log('── 5. Zéro donnée réelle')
T('aucun numéro de téléphone, aucune adresse', !synth.some((c) => /\b0[1-9](\s?\d{2}){4}\b|\d+\s*,?\s+(rue|avenue|bd|boulevard|allee|allée|chemin|impasse)\b/i.test(c.message)))

console.log('── 6. L\'évaluateur (score sur les références, jamais en baisse)')
const ev = spawnSync(process.execPath, ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'lib/ai/cerveaux/urgence/evaluer.mjs'], { cwd: RACINE, encoding: 'utf8' })
const fin = (ev.stdout + ev.stderr).replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n').filter((l) => /score|ouverts|réussis|RÉGRESSION/.test(l))
T('evaluer.mjs rend 0', ev.status === 0, fin.join(' · '))
fin.forEach((l) => console.log('     ' + l.trim()))

console.log(ko ? `\n✗ ${ko} critère(s) en échec` : '\n✓ Tout passe.')
process.exit(ko ? 1 : 0)
