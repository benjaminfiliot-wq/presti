#!/usr/bin/env node
// scripts/refonte-lighthouse.mjs — Lighthouse sur une prévisualisation Vercel protégée (refonte 18/10, PROMPT-BENJ §6 :
// landing mobile performance ≥ 90, accessibilité ≥ 95). Le lien de partage du déploiement donne le cookie _vercel_jwt, passé
// en en-tête à Lighthouse (jamais écrit sur le disque hors d'un fichier temporaire supprimé aussitôt).
// Trois passages par mode, la MÉDIANE fait foi (une machine chargée fausse un passage isolé ; Lighthouse le signale).
// Usage : TEST_BASE=https://<déploiement>.vercel.app VERCEL_SHARE=<jeton> node scripts/refonte-lighthouse.mjs [chemin=/] [passages=3]
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
const BASE = (process.env.TEST_BASE || '').replace(/\/$/, '')
const PROD = BASE === 'https://prestiapp.fr' // la production, pour une comparaison dans les MÊMES conditions de machine
if (!PROD && !/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(BASE)) { console.error('TEST_BASE : un déploiement *.vercel.app ou https://prestiapp.fr'); process.exit(2) }
const chemin = process.argv[2] || '/'
const passages = Number(process.argv[3] || 3)
const SORTIE = path.join(process.cwd(), '..', 'presti-ops', 'refonte-1018', 'apres', 'lighthouse')
fs.mkdirSync(SORTIE, { recursive: true })

const r = PROD ? null : await fetch(`${BASE}/?_vercel_share=${encodeURIComponent(process.env.VERCEL_SHARE || '')}`, { redirect: 'manual' })
const jwt = r ? (r.headers.get('set-cookie') || '').match(/_vercel_jwt=([^;]+)/)?.[1] : 'sans-objet'
if (!jwt) { console.error('Pas de cookie _vercel_jwt : jeton de partage invalide ou expiré.'); process.exit(2) }
const entetes = path.join(os.tmpdir(), `lh-${process.pid}.json`)
fs.writeFileSync(entetes, JSON.stringify({ Cookie: `_vercel_jwt=${jwt}` }))
const lh = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'lighthouse.cmd' : 'lighthouse')
const mediane = (l) => { const s = [...l].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
const bilan = {}
try {
  for (const mode of ['mobile', 'desktop']) {
    const runs = []
    for (let k = 1; k <= passages; k++) {
      const out = path.join(SORTIE, `${PROD ? 'prod-' : ''}${chemin === '/' ? 'landing' : chemin.replace(/\W+/g, '-')}-${mode}-${k}`)
      spawnSync(lh, [`${BASE}${chemin}`, ...(mode === 'desktop' ? ['--preset=desktop'] : []), ...(PROD ? [] : [`--extra-headers=${entetes}`]), '--only-categories=performance,accessibility,best-practices',
        '--output=json', `--output-path=${out}.json`, '--chrome-flags=--headless=new --no-sandbox', '--quiet'], { stdio: 'ignore', shell: process.platform === 'win32', env: process.env })
      if (!fs.existsSync(`${out}.json`)) continue
      const j = JSON.parse(fs.readFileSync(`${out}.json`, 'utf8'))
      if (typeof j.audits?.['largest-contentful-paint']?.numericValue !== 'number' || typeof j.audits?.['cumulative-layout-shift']?.numericValue !== 'number') { console.log(`${mode} #${k} : passage en erreur (${j.runtimeError?.code ?? 'mesure incomplète'})`); continue }
      const s = Object.fromEntries(Object.entries(j.categories).map(([c, v]) => [c, Math.round(v.score * 100)]))
      runs.push({ ...s, lcp: j.audits['largest-contentful-paint'].numericValue, tbt: j.audits['total-blocking-time'].numericValue, cls: j.audits['cumulative-layout-shift'].numericValue, avertissement: j.runWarnings.some((w) => /slower CPU/i.test(w)) })
      console.log(`${mode} #${k} : perf ${s.performance} · a11y ${s.accessibility} · LCP ${Math.round(runs.at(-1).lcp)} ms · TBT ${Math.round(runs.at(-1).tbt)} ms · CLS ${runs.at(-1).cls.toFixed(3)}${runs.at(-1).avertissement ? ' · ⚠ CPU lent' : ''}`)
    }
    if (runs.length) bilan[mode] = { performance: mediane(runs.map((x) => x.performance)), accessibilite: mediane(runs.map((x) => x.accessibility)), lcp: Math.round(mediane(runs.map((x) => x.lcp))), tbt: Math.round(mediane(runs.map((x) => x.tbt))), cls: +mediane(runs.map((x) => x.cls)).toFixed(3), passages: runs.length }
  }
} finally { fs.rmSync(entetes, { force: true }) }
fs.writeFileSync(path.join(SORTIE, PROD ? 'bilan-prod.json' : 'bilan.json'), JSON.stringify({ base: BASE, chemin, date: new Date().toISOString(), bilan }, null, 1))
console.log('MÉDIANES', JSON.stringify(bilan))
