// Rendu hors ligne (react-dom/server) de /entreprise, de la carte de #tarifs et du contact au motif entreprise, photographié par
// Playwright avec les vraies feuilles de style. Script de contrôle, hors dépôt.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire, register } from 'node:module'
import { pathToFileURL } from 'node:url'
const RACINE = process.cwd()
const SORTIE = process.argv[2]
const require = createRequire(path.join(RACINE, 'package.json'))
process.removeAllListeners('warning')
const STUB_NAV = 'data:text/javascript,' + encodeURIComponent(`export const usePathname = () => '/entreprise'; export const useRouter = () => ({ replace() {}, push() {}, back() {} }); export const useSearchParams = () => new URLSearchParams()`)
const STUB_IMG = 'data:text/javascript,' + encodeURIComponent(`import React from ${JSON.stringify(pathToFileURL(require.resolve('react')).href)}; export default function Image({ src, alt, width, height, className }) { return React.createElement('img', { src: 'file://' + ${JSON.stringify(path.join(RACINE, 'public'))} + (typeof src === 'string' ? src : ''), alt, width, height, className }) }`)
register('data:text/javascript,' + encodeURIComponent(`
  import ts from ${JSON.stringify(pathToFileURL(require.resolve('typescript')).href)}
  import { readFileSync } from 'node:fs'
  import { fileURLToPath } from 'node:url'
  export async function resolve(spec, ctx, next) {
    if (spec === 'next/navigation') return { url: ${JSON.stringify(STUB_NAV)}, shortCircuit: true }
    if (spec.startsWith('next/') && !spec.endsWith('.js') && spec !== 'next/navigation' && spec !== 'next/image') return next(spec + '.js', ctx)
    if (spec === 'next/image') return { url: ${JSON.stringify(STUB_IMG)}, shortCircuit: true }
    return next(spec, ctx)
  }
  export async function load(url, ctx, next) {
    if (url.endsWith('.css')) return { format: 'module', source: 'export default {}', shortCircuit: true }
    if (url.endsWith('.tsx')) {
      const out = ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { fileName: fileURLToPath(url), compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
      return { format: 'module', source: out.outputText, shortCircuit: true }
    }
    return next(url, ctx)
  }
`))
const { renderToStaticMarkup } = await import(pathToFileURL(require.resolve('react-dom/server')).href)
const React = await import(pathToFileURL(require.resolve('react')).href)
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const CSS = ['app/base.css', 'app/globals.css', 'app/accueil.css', 'app/entreprise/entreprise.css'].map((f) => fs.readFileSync(path.join(RACINE, f), 'utf8')).join('\n')
const doc = (corps) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${CSS}</style></head><body>${corps}</body></html>`

const Entreprise = (await imp('app/entreprise/page.tsx')).default
const Offre = (await imp('app/OffreEntreprise.tsx')).default
const Contact = (await imp('app/contact/page.tsx')).default
const pages = {
  entreprise: renderToStaticMarkup(React.createElement(Entreprise)),
  carte: `<div class="lp"><section class="lp-blk"><div class="container"><div class="lp-plans">${renderToStaticMarkup(React.createElement(Offre, { variante: 'lp' }))}</div></div></section></div>`,
  'contact-entreprise': renderToStaticMarkup(await Contact({ searchParams: Promise.resolve({ motif: 'entreprise' }) })),
  'contact-defaut': renderToStaticMarkup(await Contact({ searchParams: Promise.resolve({}) })),
}
fs.mkdirSync(SORTIE, { recursive: true })
for (const [n, h] of Object.entries(pages)) fs.writeFileSync(path.join(SORTIE, n + '.html'), doc(h))
const { chromium } = require('playwright')
const nav = await chromium.launch({ args: ['--no-sandbox'] })
const rapport = []
for (const [n] of Object.entries(pages)) for (const largeur of [390, 1440]) {
  const p = await nav.newPage({ viewport: { width: largeur, height: 900 } })
  await p.goto(pathToFileURL(path.join(SORTIE, n + '.html')).href)
  await p.waitForTimeout(1200)
  const m = await p.evaluate(() => {
    const sw = document.documentElement.scrollWidth, cw = document.documentElement.clientWidth
    const deborde = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > cw + 0.5 || r.left < -0.5) && getComputedStyle(e).position !== 'fixed' && !e.closest('[aria-hidden="true"]') && !e.closest('.sr-only') }).slice(0, 8).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} ${Math.round(e.getBoundingClientRect().left)}→${Math.round(e.getBoundingClientRect().right)}`)
    const c = document.querySelector('.container'); const marge = c ? parseFloat(getComputedStyle(c).paddingLeft) : null
    return { sw, cw, deborde, marge, h: document.documentElement.scrollHeight }
  })
  rapport.push({ page: n, largeur, ...m })
  await p.screenshot({ path: path.join(SORTIE, `${n}-${largeur}.png`), fullPage: true })
  await p.close()
}
await nav.close()
console.log(JSON.stringify(rapport, null, 1))
