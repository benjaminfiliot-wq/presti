// Une passe RÉELLE de l'Atelier (generer.mjs --maquette, maquette-capturer.mjs, maquette-video.mjs) avec un magasin factice :
// aucun réseau, aucun secret. Les sorties vont dans le scratchpad (hors du dépôt).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const RACINE = 'C:/Users/benja/Documents/presti'
const SORTIE = process.argv[2]
const { passeAtelier } = await import(pathToFileURL(path.join(RACINE, 'scripts/agents/atelier-maquettes.mjs')).href)
const deposes = {}, pretes = []
const magasin = {
  async travail() {
    return {
      a_fabriquer: [
        { prospect_id: '00000000-0000-4000-8000-000000000001', cle: 'reel0000000000a1', entreprise: 'Menuiserie Témoin', metier: 'menuisier', ville: 'Nantes', communes: ['Nantes'], fait: { extrait: 'Menuiserie Témoin, artisan à Nantes', url: 'https://menuiserie-temoin.invalid/', id: 'f'.repeat(16), lu_le: '2026-10-04T07:00:00.000Z' }, entrant: false },
        { prospect_id: '00000000-0000-4000-8000-000000000002', cle: 'reel0000000000a2', entreprise: 'Plomberie Témoin', metier: 'plombier', ville: 'Lyon', communes: ['Lyon'], fait: null, entrant: true },
      ],
      liens_a_creer: [],
    }
  },
  async deposer(id, nom, octets) { (deposes[id] ??= {})[nom] = octets; return `${id}/${crypto.randomUUID()}/${nom}` },
  async maquettePrete(id, objets, empreintes) { pretes.push({ id, objets, empreintes }); return { ok: true } },
  async demanderLien() { return { ok: false } },
}
const t0 = Date.now()
const bilan = await passeAtelier({ magasin, executer: spawnSync, horloge: { maintenant: () => Date.now() }, dossierSortie: SORTIE })
console.log(JSON.stringify({ bilan, secondes: Math.round((Date.now() - t0) / 1000) }))
for (const p of pretes) {
  const d = deposes[p.id]
  for (const [nom, octets] of Object.entries(d)) {
    const ok = crypto.createHash('sha256').update(octets).digest('hex') === p.empreintes[nom]
    console.log(`${p.id.slice(-1)} ${nom} ${octets.length} octets empreinte=${ok ? 'ok' : 'FAUSSE'} debut=${octets.subarray(0, 4).toString('hex')}`)
  }
}
console.log(`pretes=${pretes.length}`)
