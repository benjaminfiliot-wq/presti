// TÉMOIN du juge confidentialite-prospection-qa (026-037) : scripts/notice-prospection.mjs [--verifier] (026-039, point 3).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { noticeHtml, mentionsHtml } = await import(pathToFileURL(path.join(racine, 'lib', 'confidentialite', 'prospection.ts')).href)
const pages = [['notice-prospection/index.html', noticeHtml()], ['notice-prospection/mentions-legales/index.html', mentionsHtml()]]
if (process.argv.includes('--verifier')) {
  const diff = pages.filter(([f, t]) => { try { return fs.readFileSync(path.join(racine, f), 'utf8') !== t } catch { return true } })
  console.log(diff.length ? `à régénérer : ${diff.map(([f]) => f).join(', ')}` : 'notice à jour')
  process.exit(diff.length ? 1 : 0)
}
for (const [f, t] of pages) { fs.mkdirSync(path.dirname(path.join(racine, f)), { recursive: true }); fs.writeFileSync(path.join(racine, f), t) }
console.log('notice écrite')
