// node md5-migration.mjs <migration.sql> '<json [{f,h}] rendu par la base>' : compare md5(prosrc) de chaque fonction du fichier.
import fs from 'node:fs'
import crypto from 'node:crypto'
const t = fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g, '\n')
const base = Object.fromEntries(JSON.parse(process.argv[3] ?? '[]').map((x) => [x.f, x.h]))
const re = /create or replace function (\w+)\.(\w+)\s*\([\s\S]*?\bas\s+\$(\w*)\$([\s\S]*?)\$\3\$/gi
let m, ok = 0, ko = 0; const vus = []
while ((m = re.exec(t))) {
  const nom = `${m[1]}.${m[2]}`, h = crypto.createHash('md5').update(m[4]).digest('hex'); vus.push(nom)
  if (base[nom] === h) ok++; else { ko++; console.log(`✗ ${nom} : fichier ${h} ≠ base ${base[nom] ?? '(absente)'}`) }
}
console.log(`${ok} corps identiques, ${ko} différents, sur ${vus.length} fonction(s) du fichier : ${[...new Set(vus)].join(', ')}`)
