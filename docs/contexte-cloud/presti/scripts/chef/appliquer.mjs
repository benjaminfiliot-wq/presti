#!/usr/bin/env node
// Applique un plan validé, une requête à la fois, puis signale le battement du chef.
import fs from 'node:fs'
import path from 'node:path'
import { TRAVAIL, Arret, option, positionnels, lireJeton, baseSure, appeler, validerPlan, horodatage, ecrireJson, principal } from './commun.mjs'

principal(async () => {
  const fichier = positionnels()[0]
  if (!fichier) throw new Arret(2, 'usage : appliquer.mjs <plan.json> [--base=…] [--cycle=plein|leger]')
  const cycle = option('cycle', 'plein')
  if (!['plein', 'leger'].includes(cycle)) throw new Arret(2, '--cycle : plein ou leger')
  const base = baseSure(option('base'))
  const jeton = lireJeton()
  const rapport = { le: new Date().toISOString(), cycle, taches: 0, decisions: 0, deja: 0, requetes: [], ecarts: [], code: null }
  const fRapport = path.join(TRAVAIL, `appliquer-${horodatage()}.json`)
  const finir = (code) => { rapport.code = code; ecrireJson(fRapport, rapport); return code }

  let plan
  try { plan = JSON.parse(fs.readFileSync(fichier, 'utf8')) } catch { rapport.ecarts.push('plan illisible'); console.error('✗ plan illisible'); return finir(1) }
  const ecarts = validerPlan(plan, cycle)
  if (ecarts.length) {
    rapport.ecarts = ecarts
    console.error(`✗ plan refusé en bloc (${ecarts.length} écart(s)) :\n  ${ecarts.join('\n  ')}`)
    return finir(1)
  }

  const envois = [
    ...plan.taches.map((t) => ({ genre: 'taches', cle: t.cle_idempotence, chemin: '/api/agents/taches', corps: { type: t.type, cle: t.cle_idempotence, capacite: t.capacite, charge: t.charge, ...('objet' in t ? { objet: t.objet } : {}) } })),
    ...plan.decisions.map((d) => ({ genre: 'decisions', cle: d.cle_idempotence, chemin: '/api/agents/decisions', corps: { question: d.question, contexte: d.contexte, options: d.options.map((o) => ({ cle: o.cle, libelle: o.libelle, recommandee: o.recommandee })), defaut: d.option_defaut, montant_cents: d.montant_cents, portee: d.portee, echeance: d.echeance, cle: d.cle_idempotence } })),
  ]
  for (const e of envois) {
    const r = await appeler(base, jeton, 'POST', e.chemin, e.corps)
    rapport.requetes.push({ genre: e.genre, cle: e.cle, statut: r.statut || r.erreur })
    if (r.statut === 201) rapport[e.genre]++
    else if ((r.statut === 200 && r.json?.creee === false) || r.statut === 409) { rapport[e.genre]++; rapport.deja++ }
    else if (r.statut === 429) { console.error('✗ quota du bus atteint (429) : envois arrêtés'); return finir(3) }
    else { console.error(`✗ ${e.genre} refusée (HTTP ${r.statut || r.erreur})`); return finir(1) }
  }
  const b = await appeler(base, jeton, 'POST', '/api/agents/battement')
  rapport.requetes.push({ genre: 'battement', statut: b.statut || b.erreur })
  if (b.statut < 200 || b.statut > 299) { console.error(`✗ battement refusé (HTTP ${b.statut || b.erreur})`); return finir(b.statut === 429 ? 3 : 1) }
  console.log(`✓ plan appliqué : ${rapport.taches} tâche(s), ${rapport.decisions} décision(s), ${rapport.deja} déjà là`)
  return finir(0)
})
