// Sonde du juge comptable-qa (026-242) : importe le module jugé dans CE processus, dont le réseau et les écritures de fichiers sont
// piégés, l'exerce sur le jeu d'essai (stripe-factice.mjs, ventes-factices.json, seuil.json) et imprime UNE ligne JSON
// { resultats: { 'CPT-n': { ok, detail? } }, appels } — les appels observés (réseau, écriture, journal, moteur, Stripe).
// Usage : node --import scripts/ts-loader.mjs sonde.mjs <chemin du module>. Le contrat de banc est dans CONTRAT.md.
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import http from 'node:http'
import https from 'node:https'
import { syncBuiltinESMExports } from 'node:module'
import { evenements, stripeFactice } from './stripe-factice.mjs'

const ventes = JSON.parse(fs.readFileSync(new URL('./ventes-factices.json', import.meta.url)))
const seuil = JSON.parse(fs.readFileSync(new URL('./seuil.json', import.meta.url)))
const appels = [], resultats = {}, lignes = new Map()

// Pièges : tout appel réseau, toute écriture de fichier est consignée puis refusée. Le module n'a aucune raison d'en faire.
const interdit = (...args) => { appels.push({ type: 'reseau', args: args.map(String) }); throw Error('réseau interdit') }
globalThis.fetch = interdit; http.request = interdit; http.get = interdit; https.request = interdit; https.get = interdit
const ecriture = (...args) => { appels.push({ type: 'mention-ecrite', chemin: String(args[0]) }); throw Error('écriture de fichier interdite dans le module') }
for (const nom of ['writeFile', 'appendFile', 'copyFile', 'cp', 'rename', 'rm', 'rmdir', 'unlink', 'truncate', 'symlink']) {
  for (const objet of [fs, fs.promises]) if (typeof objet[nom] === 'function') objet[nom] = ecriture
  if (typeof fs[`${nom}Sync`] === 'function') fs[`${nom}Sync`] = ecriture
}
syncBuiltinESMExports()

const d = {
  evenements: structuredClone(evenements), ventes: structuredClone(ventes), seuil: structuredClone(seuil),
  stripe: stripeFactice(evenements, appels), maintenant: '2026-04-01T00:00:00Z',
  journal: { ajouter(e) { appels.push({ type: 'journal', evenement: structuredClone(e) }); if (!lignes.has(e.cle)) lignes.set(e.cle, structuredClone(e)) } },
  MOTEUR_DE: { comptable: { moteur: 'codex', modele: 'gpt-test', personnelles: true } },
  moteur: async (e, cfg) => { appels.push({ type: 'moteur', cfg }); return 'Libellé factice' },
}
const check = (v, message) => { if (!v) throw Error(message) }
const juger = async (id, fn) => { try { await fn(); resultats[id] = { ok: true } } catch (e) { resultats[id] = { ok: false, detail: e.message } } }
const gele = x => { Object.values(x).forEach(v => { if (v && typeof v === 'object') gele(v) }); return Object.freeze(x) }
const nbMoteur = () => appels.filter(a => a.type === 'moteur').length

let M
try { M = await import(pathToFileURL(process.argv[2]).href) } catch (e) { resultats['CPT-2'] = { ok: false, detail: `import : ${e.message}` } }
if (M) {
  // Le contrat de banc : un export manquant est dit clairement, pas rendu en TypeError.
  const fn = nom => { check(typeof M[nom] === 'function', `export ${nom}(periode, dependances) absent — contrat de banc : scripts/fixtures/026/comptable/CONTRAT.md`); return M[nom] }
  const importAppels = appels.length
  await juger('CPT-1', () => check(importAppels === 0, 'effet de bord à l’import'))
  await juger('CPT-2', async () => {
    const r = await fn('rapprocher')('2026-01', d)
    check(r.recettes.length === 10 && new Set(r.recettes.map(e => e.id)).size === 10, '10 paiements distincts attendus')
    check(r.orphelins.map(e => e.id).sort().join(',') === 'orphelin_1,orphelin_2', 'orphelins exacts requis')
    check(r.ecarts.length === 1 && r.ecarts[0].id === 'ecart', 'écart un centime non corrigé requis')
    check(r.recettes.reduce((s, e) => s + e.montant, 0) === 99000, '99000 centimes nets rapprochés attendus, sans orphelin/écart')
  })
  await juger('CPT-3', async () => {
    const seuilFranchise = fn('seuilFranchise')
    for (const s of seuil.scenarios) {
      const e = [30000, 30000, s.cumul - 60000].filter(v => v > 0).map((amount, i) => ({ id: `scenario_${i}`, type: 'paiement', status: 'succeeded', amount, created: `2026-03-0${i + 1}` }))
      const dx = { ...d, evenements: e, ventes: { commandes: e.map(p => ({ paiement_id: p.id, prix_cents: p.amount })), abonnements: [] } }
      const r = await seuilFranchise('2026-03', dx)
      check(r.cumul === s.cumul && r.seuil === seuil.valeur_cents && r.pourcentage === s.cumul / seuil.valeur_cents * 100 && r.alerte === s.alerte && r.franchi_le === (s.franchi_le ?? null), `seuil ${s.cumul} incorrect`)
    }
    const r = await seuilFranchise('2026-01', d)
    check(r.cumul === 99000, 'cumul inclut un orphelin ou un écart')
    const exact90 = { ...d, evenements: [{ id: 'limite90', type: 'paiement', status: 'succeeded', amount: 90000, created: '2026-02-01' }], ventes: { commandes: [{ paiement_id: 'limite90', prix_cents: 90000 }], abonnements: [] } }
    check((await seuilFranchise('2026-02', exact90)).alerte === 'approche_seuil', '90% exact non alerté')
    let rejete = false; try { await seuilFranchise('2026-01', { ...d, seuil: { valeur_cents: 100000 } }) } catch { rejete = true }
    check(rejete, 'seuil sans source datée accepté')
    const horsAnnee = { ...d, evenements: [...d.evenements, { id: 'hors', type: 'paiement', status: 'succeeded', amount: 99999, created: '2025-12-31' }], ventes: { ...d.ventes, commandes: [...d.ventes.commandes, { paiement_id: 'hors', prix_cents: 99999 }] } }
    check((await seuilFranchise('2026-01', horsAnnee)).cumul === 99000, 'année civile non respectée')
  })
  await juger('CPT-4', async () => {
    const avant = appels.length
    const r = await fn('preparerDeclaration')('2026-01', d)
    check(r.periode === '2026-01' && r.recettes === 99000 && r.tva === 0 && r.source === 'rapprochement' && r.prepare_le === d.maintenant, 'montants préparés incorrects')
    check(appels.length === avant, 'préparation impure : effet de bord observé')
    check(!appels.some(a => a.type === 'reseau'), 'appel réseau dépôt/paiement')
    // Toute fonction publique qui « déclare » ou « paie » doit être prouvée pure : appelée sur des entrées gelées, elle ne
    // consigne aucun effet (réseau, écriture, journal, moteur, Stripe) et ne modifie pas ses entrées. Pureté non prouvée = rouge.
    for (const [nom, f] of Object.entries(M).filter(([n, f]) => typeof f === 'function' && /declarer|payer/i.test(n))) {
      const dg = { ...d, evenements: gele(structuredClone(evenements)), ventes: gele(structuredClone(ventes)), seuil: gele(structuredClone(seuil)) }
      const avantF = appels.length
      try { await f('2026-01', dg) } catch (e) { throw Error(`fonction ${nom} : pureté non prouvée (${String(e.message).slice(0, 80)})`) }
      check(appels.length === avantF, `fonction ${nom} impure : effet de bord observé`)
    }
  })
  await juger('CPT-5', () => check(!appels.some(a => a.type === 'mention-ecrite'), 'mention ou gabarit écrit'))
  await juger('CPT-6', async () => {
    const libelle = fn('libelle')
    for (const moteur of ['freellmapi', 'perplexity', 'ollama_cloud', 'codex']) {
      const avant = nbMoteur()
      const cfg = { moteur, modele: moteur === 'codex' ? 'gpt-test:cloud' : 'auto', personnelles: true }
      check(await libelle({ montant: 99000 }, { ...d, MOTEUR_DE: { comptable: cfg } }) === 'Encaissement rapproché', 'repli fixe requis')
      check(nbMoteur() === avant, 'moteur gratuit/cloud appelé')
    }
    const avant = nbMoteur()
    check(await libelle({ montant: 99000 }, d) === 'Libellé factice', 'Codex autorisé non utilisé')
    check(nbMoteur() === avant + 1, 'un appel Codex attendu')
    check(await libelle({}, { ...d, moteur: async () => { throw Error('indisponible') } }) === 'Encaissement rapproché', 'repli indisponibilité')
    for (const cfg of [undefined, { moteur: 'codex', modele: 'gpt-test', personnelles: false }]) {
      const avantCfg = nbMoteur()
      check(await libelle({}, { ...d, MOTEUR_DE: { comptable: cfg } }) === 'Encaissement rapproché', 'absence D1 ou personnelles:false sans repli')
      check(nbMoteur() === avantCfg, 'D1 absent ou données non protégées appelées')
    }
    check(await libelle({}, { ...d, MOTEUR_DE: { comptable: { moteur: 'ollama_local', modele: 'local-test', personnelles: true } } }) === 'Libellé factice', 'moteur local explicitement autorisé indisponible')
  })
  await juger('CPT-7', async () => check(await fn('recettesTuile')('2026-01', d) === (await fn('preparerDeclaration')('2026-01', d)).recettes, 'totaux publics différents'))
  await juger('CPT-8', async () => {
    lignes.clear(); const avant = appels.length
    await fn('rapprocher')('2026-01', d); const premier = [...lignes.values()]
    await fn('rapprocher')('2026-01', d)
    check(premier.length === 10 && lignes.size === 10, 'journal non idempotent ou manquant')
    check(premier.every(e => e.type === 'rapprochement' && Number.isInteger(e.montant) && e.cle.startsWith('2026-01:')), 'événement invalide')
    check(!/424242|sk_test|secret|card_number/i.test(JSON.stringify(appels.slice(avant))), 'donnée interdite au journal')
  })
  if (appels.some(a => a.type === 'stripe-ecriture')) resultats['CPT-1'] = { ok: false, detail: 'écriture Stripe appelée' }
  if (appels.some(a => a.type === 'mention-ecrite')) resultats['CPT-5'] = { ok: false, detail: 'écriture de mention tentée' }
}
console.log(JSON.stringify({ resultats, appels }))
