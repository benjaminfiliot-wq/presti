import assert from 'node:assert/strict'
import { suspendrePublication, programmerPublication } from '../lib/crieur/publora.ts'
import { signalerProgrammees } from '../lib/crieur/pauseProgrammees.ts'

// Aucun réseau : transport injecté, clé factice limitée à ce processus.
process.env.PUBLORA_API_KEY = 'cle-factice-sans-valeur'
const appels = []
await suspendrePublication('pub-test', async (url, options) => {
  appels.push({ url, options })
  return { ok: true, json: async () => ({ success: true, postGroup: { status: 'draft' } }) }
})
assert.equal(appels.length, 1)
assert.equal(appels[0].url, 'https://api.publora.com/api/v1/update-post/pub-test')
assert.equal(appels[0].options.method, 'PUT')
assert.deepEqual(JSON.parse(appels[0].options.body), { status: 'draft' })
assert.equal(appels[0].options.headers['x-publora-key'], 'cle-factice-sans-valeur')
console.log('PASS CS-1 — remise en brouillon uniquement, contenu conservé')

for (const resultat of [{ success: false }, { success: true }, { success: true, postGroup: { status: 'scheduled' } }]) {
  await assert.rejects(suspendrePublication('pub-test', async () => ({ ok: true, json: async () => resultat })), /non confirmée/)
}
await assert.rejects(suspendrePublication('pub-test', async () => ({ ok: false, status: 409 })), /HTTP 409/)
await assert.rejects(suspendrePublication('pub-test', async () => { throw new Error('transport indisponible') }), /transport indisponible/)
console.log('PASS CS-2 — états non confirmés et publication déjà en cours refusés')

for (const id of ['', '../autre', 'a?status=scheduled', 'a'.repeat(129)]) {
  await assert.rejects(suspendrePublication(id, async () => { assert.fail('transport interdit') }), /identifiant/)
}
delete process.env.PUBLORA_API_KEY
await assert.rejects(suspendrePublication('pub-test', async () => { assert.fail('transport interdit') }), /absente/)
console.log('PASS CS-3 — identifiant ou clé absente : aucun appel')

process.env.PUBLORA_API_KEY = 'cle-factice-sans-valeur'
const maintenant = new Date('2026-10-01T12:00:00Z')
const futur = '2026-10-02T12:00:00.000Z'
let programmations = 0
const transport = async (_url, options) => {
  programmations++
  assert.equal(options.headers['Idempotency-Key'], 'crieur-test')
  assert.deepEqual(JSON.parse(options.body), { status: 'scheduled', scheduledTime: futur })
  return { ok: true, json: async () => ({ success: true, postGroup: { status: 'scheduled', scheduledTime: futur } }) }
}
await programmerPublication('pub-test', futur, 'crieur-test', 0, transport, maintenant)
for (const cout of [undefined, null, '0', -1, 1, NaN]) await assert.rejects(programmerPublication('pub-test', futur, 'crieur-test', cout, transport, maintenant), /coût/)
assert.equal(programmations, 1)
await assert.rejects(programmerPublication('pub-test', '2026-09-30T12:00:00Z', 'crieur-test', 0, transport, maintenant), /futur/)
for (const postGroup of [{ status: 'draft', scheduledTime: futur }, { status: 'scheduled' }, { status: 'scheduled', scheduledTime: '2026-10-03T12:00:00Z' }]) {
  await assert.rejects(programmerPublication('pub-test', futur, 'crieur-test', 0, async () => ({ ok: true, json: async () => ({ success: true, postGroup }) }), maintenant), /non confirmée/)
}
console.log('PASS CS-4 — coût nul strict et créneau confirmé, sans réseau')

const ligne = (id, statut, raisons = [], date = futur) => ({ id, canal: 'linkedin', statut, raisons, programmee_pour: date, publora_id: `pub-${id}` })
const suspendues = [], inscrites = []
const deps = {
  lire: async () => ({ data: [ligne('future', 'programmee'), ligne('simple', 'brouillon_publora'), ligne('passee', 'programmee', [], '2026-09-30T12:00:00Z'), ligne('externe', 'externe'), ligne('encours', 'brouillon_publora', ['programmation_en_cours']), ligne('incertaine', 'erreur', ['programmation_non_confirmee'])], error: null }),
  suspendre: async id => { suspendues.push(id) },
  inscrire: async id => { assert.ok(suspendues.includes(`pub-${id}`)); inscrites.push(id); return { error: null } },
  notifier: async () => ({ ok: true }),
}
assert.deepEqual(await signalerProgrammees(maintenant, deps), { ok: true, programmees: 3, suspendues: 3, signalees: false })
assert.deepEqual(inscrites, ['future', 'encours', 'incertaine'])
console.log('PASS CS-5 — futures et demandes ambiguës suspendues, brouillons simples et publications passées préservés')
for (const mauvais of [{ ...ligne('sansid', 'programmee'), publora_id: null }, ligne('date', 'programmee', [], 'illisible')]) {
  const r = await signalerProgrammees(maintenant, { ...deps, lire: async () => ({ data: [mauvais], error: null }), suspendre: async () => assert.fail('aucun transport avec registre invalide') })
  assert.equal(r.ok, false)
}
for (const overrides of [
  { lire: async () => { throw new Error('lecture') } },
  { suspendre: async () => { throw new Error('transport') }, inscrire: async () => assert.fail('aucune inscription sans confirmation') },
  { inscrire: async () => ({ error: new Error('registre') }) },
]) {
  const r = await signalerProgrammees(maintenant, { ...deps, lire: async () => ({ data: [ligne('future', 'programmee')], error: null }), notifier: async () => { throw new Error('notification') }, ...overrides })
  assert.equal(r.ok, false)
}
console.log('PASS CS-6 — lecture, suspension et inscription défaillantes restent rouges même si notification échoue')
