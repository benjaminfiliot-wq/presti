// Test E2E de la conversation-plateforme (serveur local next start).
// 1) POST /api/leads (premier contact) → token + réponse IA
// 2) POST /api/conversation (relance du prospect) → réponse IA contextuelle
// 3) GET  /api/conversation?token → le fil complet
const BASE = process.env.BASE || 'http://localhost:3400'
const SLUG = process.env.SLUG || 'benjamin-filiot'

const j = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) })
const line = (s) => console.log(s)

async function main() {
  line(`▶ POST /api/leads (slug=${SLUG})`)
  const r1 = await j(await fetch(`${BASE}/api/leads`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: SLUG, nom_prospect: 'Julie Martin', contact: 'julie.test@example.com', message: "Bonjour, j'ai une fuite sous mon évier de cuisine depuis ce matin, ça goutte de plus en plus. Pouvez-vous intervenir vite ?" }),
  }))
  line(`  status=${r1.status} token=${r1.body.token ? 'oui' : 'NON'} reply=${r1.body.reply ? r1.body.reply.length + ' car.' : 'NON'}`)
  if (r1.body.reply) line(`  IA #1 › ${r1.body.reply.slice(0, 140)}…`)
  const token = r1.body.token
  if (!token) { line('❌ pas de token → stop'); process.exit(1) }

  line(`\n▶ POST /api/conversation (relance prospect)`)
  const r2 = await j(await fetch(`${BASE}/api/conversation`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, message: "C'est un mitigeur assez récent. Le joint a l'air abîmé. Vous pourriez passer demain matin ?" }),
  }))
  line(`  status=${r2.status} reply=${r2.body.reply ? r2.body.reply.length + ' car.' : 'NON'}`)
  if (r2.body.reply) line(`  IA #2 › ${r2.body.reply.slice(0, 180)}…`)

  line(`\n▶ GET /api/conversation?token`)
  const r3 = await j(await fetch(`${BASE}/api/conversation?token=${encodeURIComponent(token)}`))
  const msgs = r3.body.messages || []
  line(`  status=${r3.status} messages=${msgs.length} artisan=${r3.body.artisan?.nom ?? '—'}`)
  msgs.forEach((m, i) => line(`   ${i + 1}. [${m.sens}] ${m.contenu.slice(0, 70).replace(/\n/g, ' ')}…`))

  const ok = r1.status === 200 && !!token && r2.status === 200 && !!r2.body.reply && r3.status === 200 && msgs.length >= 4
  line(`\n${ok ? '✅ FLUX CONVERSATION OK' : '❌ FLUX INCOMPLET'} (attendu ≥4 messages, reçu ${msgs.length})`)
  process.exit(ok ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
