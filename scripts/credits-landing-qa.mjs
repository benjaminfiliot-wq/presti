// scripts/credits-landing-qa.mjs — la vidéo de la landing (app/DemoSite.tsx) filme des photos de la démo sous licence CC BY
// et CC BY-SA : leurs auteurs doivent être crédités. Ce juge exige, sous la vidéo et avant la ligne de prix, une ligne
// « ds-credits » qui parle des photos et de leurs licences et renvoie au détail (mentions légales de la démo, ancre #credits),
// une règle de style pour cette ligne, et l'ancre elle-même dans la page des mentions légales. Relevé le 14/09/2026 :
// la vidéo était en ligne sans aucun crédit.
//
// Usage : node scripts/credits-landing-qa.mjs     (code 1 au premier manque)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LIEN = '/sites-demo/lestraque/mentions-legales/index.html#credits'
const src = fs.readFileSync(path.join(R, 'app', 'DemoSite.tsx'), 'utf8')
const css = fs.readFileSync(path.join(R, 'app', 'globals.css'), 'utf8')
const mentions = path.join(R, 'public', 'sites-demo', 'lestraque', 'mentions-legales', 'index.html')
const echecs = []

const bloc = src.match(/<p\s+className="ds-credits"[^>]*>([\s\S]*?)<\/p>/)
if (!bloc) echecs.push('DemoSite.tsx : aucune ligne <p className="ds-credits"> sous la vidéo')
else {
  const texte = bloc[1].replace(/<[^>]+>/g, ' ').replace(/\{[^}]*\}/g, ' ')
  if (!/photo/i.test(texte)) echecs.push('ligne de crédits : le mot « photo » manque')
  if (!/licence/i.test(texte)) echecs.push('ligne de crédits : le mot « licence » manque')
  if (!bloc[1].includes(LIEN)) echecs.push(`ligne de crédits : le lien vers ${LIEN} doit être dans la ligne`)
}
const iCadre = src.indexOf('className="ds-cadre"')
const iCredits = src.indexOf('className="ds-credits"')
const iPrix = src.indexOf('className="ds-prix"')
if (iCredits >= 0 && !(iCadre >= 0 && iCadre < iCredits && (iPrix < 0 || iCredits < iPrix))) echecs.push('ligne de crédits : attendue après la vidéo (ds-cadre) et avant la ligne de prix (ds-prix)')
if (!/\.ds-credits[\s,{:]/.test(css)) echecs.push('app/globals.css : aucune règle .ds-credits')
if (!fs.existsSync(mentions) || !/id="credits"/.test(fs.readFileSync(mentions, 'utf8'))) echecs.push('mentions légales de la démo : ancre id="credits" absente')

console.log(echecs.length ? `✗ crédits landing : FAIL — ${echecs.join(' ; ')}` : '✓ crédits landing : PASS — ligne de crédits photo sous la vidéo, lien vers les auteurs et licences')
process.exitCode = echecs.length ? 1 : 0
