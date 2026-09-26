import fs from 'node:fs'
import path from 'node:path'

export async function controleJeux(ctx) {
  const e = []
  const a = fs.readFileSync(path.join(ctx.racine, 'scripts/fixtures/026-pilotage/p/donnees-a.json'), 'utf8')
  const b = fs.readFileSync(path.join(ctx.racine, 'scripts/fixtures/026-pilotage/p/donnees-b.json'), 'utf8')
  if (a === b) e.push('donnees-a.json et donnees-b.json sont identiques')
  return { echecs: e, detail: 'jeux ok' }
}
