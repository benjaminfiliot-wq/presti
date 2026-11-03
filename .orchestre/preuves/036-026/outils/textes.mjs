import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
const require = createRequire(path.join(process.cwd(), 'package.json'))
const { chromium } = require('playwright')
const nav = await chromium.launch({ args: ['--no-sandbox'] })
const p = await nav.newPage({ viewport: { width: 1440, height: 900 } })
const sortie = []
for (const [n, titre, sel] of [['carte', 'La carte de #tarifs (variante lp)', '[data-offre-entreprise]'], ['entreprise', 'La page /entreprise', 'main'], ['contact-entreprise', 'Le contact, /contact?motif=entreprise (colonne et formulaire)', 'main']]) {
  await p.goto(pathToFileURL(path.join(process.argv[2], n + '.html')).href)
  const t = await p.evaluate((sel) => { document.querySelectorAll('details').forEach((d) => (d.open = true)); const el = document.querySelector(sel); const ta = [...el.querySelectorAll('textarea')].map((x) => x.value); return el.innerText + (ta.length ? '\n\n[message prérempli]\n' + ta.join('\n') : '') }, sel)
  sortie.push(`## ${titre}\n\n\`\`\`text\n${t.replace(/\n{3,}/g, '\n\n').trim()}\n\`\`\``)
}
const meta = fs.readFileSync('app/entreprise/page.tsx', 'utf8').match(/export const metadata[\s\S]*?\n\}/)[0]
sortie.push(`## Les métadonnées de /entreprise\n\n\`\`\`ts\n${meta}\n\`\`\``)
console.log(sortie.join('\n\n'))
await nav.close()
