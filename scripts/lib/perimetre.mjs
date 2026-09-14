// scripts/lib/perimetre.mjs — « rien hors périmètre », version qui vit avec plusieurs agents en même temps.
// Un vérificateur ne reproche à une tâche que ce qui a changé DEPUIS sa prise (l'instantané avant.txt), dans son propre
// chantier : les fichiers qu'une AUTRE tâche en cours a le droit de toucher (son `perimetre:`) ne sont pas les siens.
// Le 14/09, l'agent de 014-18 se voyait reprocher scripts/site-hebergement-e2e.mjs, écrit au même moment par l'agent de 014-19.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const SENSIBLE = /^(app\/|lib\/|supabase\/|scripts\/|middleware\.ts$)/
const chemins = (txt) => txt.split('\n').filter(Boolean).map((l) => l.slice(3).trim().replace(/^"|"$/g, ''))
const prefixe = (g) => String(g).trim().split(/[*?{]/)[0]

/** Les fichiers sensibles modifiés depuis la prise de `id`, hors de son périmètre et hors des chantiers des autres tâches en cours. */
export function horsPerimetre(RACINE, id, PERIMETRE) {
  let porcelain = ''
  try { porcelain = spawnSync('git', ['status', '--porcelain'], { cwd: RACINE, encoding: 'utf8' }).stdout || '' } catch { /* hors git */ }
  const avant = [path.join(RACINE, '.orchestre', 'en-cours', `${id}.avant.txt`), path.join(RACINE, '.orchestre', 'preuves', id, 'avant.txt')].find((p) => fs.existsSync(p))
  const dejaSales = new Set(avant ? chemins(fs.readFileSync(avant, 'utf8')) : [])
  const autres = []
  const enCours = path.join(RACINE, '.orchestre', 'en-cours')
  if (fs.existsSync(enCours)) for (const f of fs.readdirSync(enCours)) {
    if (!/^\d{3}-\d{2}\.md$/.test(f) || f === `${id}.md`) continue
    const m = fs.readFileSync(path.join(enCours, f), 'utf8').match(/^perimetre:\s*\[(.*)\]/m)
    if (m) autres.push(...m[1].split(',').map(prefixe).filter(Boolean))
  }
  return chemins(porcelain).filter((p) => SENSIBLE.test(p) && !dejaSales.has(p) && !PERIMETRE.some((re) => re.test(p)) && !autres.some((pre) => p.startsWith(pre)))
}
