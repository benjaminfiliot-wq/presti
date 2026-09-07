// Sonde : ce qui coûte les points de performance sur une page, et de combien.
//
// La suite mobile dit « perf 84 ≥ 90 » et s'arrête là. Un score sans ses postes de dépense n'indique
// rien : on ne sait pas s'il faut compresser une image, différer un script ou revoir une police.
//
// On rend donc les métriques qui pèsent, les occasions d'amélioration chiffrées en millisecondes, et
// les éléments coupables quand Lighthouse les nomme.
//
// Usage : node scripts/sonde-lighthouse.mjs [url] [--desktop]

import { chromium } from 'playwright'

const URL_CIBLE = process.argv[2]?.startsWith('http') ? process.argv[2] : 'https://prestiapp.fr/'
const MOBILE = !process.argv.includes('--desktop')

const b = await chromium.launch({ args: ['--remote-debugging-port=9222'] })
try {
  const { default: lighthouse } = await import('lighthouse')
  const r = await lighthouse(URL_CIBLE, {
    port: 9222, output: 'json', logLevel: 'error',
    onlyCategories: ['performance'],
    ...(MOBILE ? {} : { formFactor: 'desktop', screenEmulation: { disabled: true } }),
  })
  const lhr = r.lhr
  const perf = Math.round((lhr.categories.performance?.score ?? 0) * 100)
  console.log(`\n══ ${URL_CIBLE} · ${MOBILE ? 'mobile' : 'ordinateur'} ══\n`)
  console.log(`  performance : ${perf}/100 ${perf >= 90 ? '✅' : `⛔ (budget 90, il manque ${90 - perf})`}\n`)

  // Les cinq métriques qui font le score, avec leur poids réel.
  const METRIQUES = ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time',
    'cumulative-layout-shift', 'speed-index']
  console.log('  ce qui compose le score')
  for (const id of METRIQUES) {
    const a = lhr.audits[id]
    if (!a) continue
    const note = Math.round((a.score ?? 0) * 100)
    console.log(`    ${note >= 90 ? '✅' : note >= 50 ? '🟡' : '⛔'} ${a.title.padEnd(34)} ${String(a.displayValue ?? '').padStart(10)}  (${note}/100)`)
  }

  // Ce que Lighthouse propose, chiffré. On ne garde que ce qui pèse vraiment.
  const gains = Object.values(lhr.audits)
    .filter((a) => a.details?.type === 'opportunity' && (a.details.overallSavingsMs ?? 0) >= 50)
    .sort((x, y) => (y.details.overallSavingsMs ?? 0) - (x.details.overallSavingsMs ?? 0))
  console.log(`\n  ce qu’on gagnerait (${gains.length} piste${gains.length > 1 ? 's' : ''} au-dessus de 50 ms)`)
  for (const g of gains) {
    console.log(`    ${String(Math.round(g.details.overallSavingsMs)).padStart(5)} ms · ${g.title}`)
    for (const item of (g.details.items ?? []).slice(0, 3)) {
      const quoi = item.url ?? item.node?.snippet ?? JSON.stringify(item).slice(0, 70)
      console.log(`             ${String(quoi).replace(/^https:\/\/[^/]+/, '').slice(0, 96)}`)
    }
  }
  if (!gains.length) console.log('    (aucune piste chiffrée : le score vient des métriques elles-mêmes)')

  // L'élément qui porte le LCP : souvent la seule chose à corriger.
  const lcp = lhr.audits['largest-contentful-paint-element']
  const node = lcp?.details?.items?.[0]?.items?.[0]?.node
  if (node) console.log(`\n  élément le plus lourd à peindre : ${String(node.snippet ?? node.selector ?? '').slice(0, 120)}`)

  const diag = lhr.audits['diagnostics']?.details?.items?.[0]
  if (diag) console.log(`\n  poids : ${Math.round((diag.totalByteWeight ?? 0) / 1024)} Ko · ${diag.numRequests} requêtes · ${diag.numScripts} scripts`)
  console.log('')
} finally {
  await b.close()
}
