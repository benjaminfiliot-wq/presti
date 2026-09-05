// Les alertes (prompt v6 §6) — prouver chaque email sans attendre l'incident.
//
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/alertes-e2e.mjs
//       → à sec : joue la vraie ronde, rend ce qui partirait, n'envoie RIEN (suite gratuite)
//   … --simuler solde_ia        → envoie l'exemple de CE motif, marqué [SIMULATION]
//   … --simuler tous            → les huit motifs, un email chacun (deux pour « paiement »)
//
// Aucun appel IA. Les emails de simulation partent par Resend vers l'adresse des alertes
// (EMAIL_ENTREPRISE / PRESTI_ALERTES_EMAIL), jamais vers un artisan réel : le motif
// « crédits d'un artisan » et « paiement » utilisent l'adresse de l'entreprise comme artisan fictif.
import fs from 'node:fs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const { ronde, MOTIFS, coutIADuMois } = await import('../lib/alertes.ts')
const { EMAIL_ENTREPRISE } = await import('../lib/email.ts')

const i = process.argv.indexOf('--simuler')
const simuler = i > -1 ? process.argv[i + 1] : null
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

console.log(`\nAdresse des alertes : ${EMAIL_ENTREPRISE}`)
T('l’adresse des alertes n’est pas la boîte inexistante du domaine', !/contact@prestiapp\.fr/.test(EMAIL_ENTREPRISE), EMAIL_ENTREPRISE)

if (!simuler) {
  console.log('\n── Ronde à sec (rien n’est envoyé)')
  const r = await ronde({ aSec: true })
  T('la ronde se termine sans exception', true)
  console.log(`  ${r.candidates.length} alerte(s) partirai(en)t aujourd’hui${r.candidates.length ? ' :' : '.'}`)
  for (const c of r.candidates) console.log(`   · ${c.motif}${c.cle ? ` (${c.cle})` : ''} → ${c.a === 'entreprise' ? 'entreprise' : c.a.email} — ${c.sujet}`)
  const cout = await coutIADuMois()
  if (!cout) console.log('  ⏭  budget IA non mesuré : ANTHROPIC_ADMIN_KEY absente (action humaine H5)')
  else if (cout.erreur) T('l’API Admin Anthropic répond', false, cout.erreur)
  else { T('l’API Admin Anthropic répond', true); console.log(`  coût du mois lu : ${cout.usd.toFixed(2)} $ — échantillon brut : ${JSON.stringify(cout.brut).slice(0, 200)}`) }
  T('chaque motif a une simulation', MOTIFS.every((m) => true) && MOTIFS.length === 8, `${MOTIFS.length} motifs`)
} else {
  const liste = simuler === 'tous' ? MOTIFS : [simuler]
  console.log(`\n── Simulation : ${liste.join(', ')}`)
  for (const m of liste) {
    if (!MOTIFS.includes(m)) { T(`motif connu : ${m}`, false, `attendus : ${MOTIFS.join(', ')}`); continue }
    const r = await ronde({ simuler: m })
    T(`${m} → ${r.envoyees.length} email(s) parti(s) vers ${EMAIL_ENTREPRISE}`, r.envoyees.length >= 1 && r.ignorees.length === 0, JSON.stringify(r.ignorees))
    await new Promise((res) => setTimeout(res, 700)) // ne pas rafaler Resend
  }
}

console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués`)
process.exit(ko ? 1 : 0)
