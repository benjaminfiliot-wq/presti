#!/usr/bin/env node
// scripts/refonte-avant-css.mjs — chantier « Refonte 18/10 », étape 1 (audit) : cohérence des composants, COMPTÉE dans le CSS.
// Lecture seule. Pour chaque surface (console, landing), on relève les règles qui dessinent un bouton, une carte, un titre,
// et on compte les styles DISTINCTS (même fond + même rayon + même bordure + même taille de texte = un seul style).
// Plus : les couleurs codées en dur hors jetons, les styles en ligne (style={{…}}) dans les .tsx de la console, et le
// contrôle de palette de presti-design (aucun bleu ni violet vivant).
// Usage : node scripts/refonte-avant-css.mjs [sortie.json]
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
// L'état AVANT est celui de la production : on lit les fichiers au commit HEAD (un autre chantier modifie l'arbre de travail).
const lire = (f) => { try { return execFileSync('git', ['show', `HEAD:${f}`], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }) } catch { return '' } } // absent de HEAD = absent de la production
const require = createRequire(import.meta.url)
const postcss = require('postcss')

const SORTIE = process.argv[2] || path.join('..', 'presti-ops', 'refonte-1018', 'avant', 'css-mesures.json')
const CONSOLE = ['app/base.css', 'app/globals.css', 'app/crm/crm.css', 'app/chiffres/chiffres.css', 'app/assistant/assistant.css', 'app/accueil.css', 'app/factures/relances-auto.css', 'app/crm/atelier/atelier.css']
const MORT = /(^|[\s,.])(hud|jv-|will-reveal)/ // code mort connu (presti-design) : exclu du compte
const estLanding = (sel) => /\.lp[-\s.{:]|\.lp$|\.lp,/.test(sel) || /^\.lp/.test(sel.trim())
const decl = (r) => Object.fromEntries(r.nodes.filter((n) => n.type === 'decl').map((d) => [d.prop, d.value.replace(/\s+/g, ' ').trim()]))
const BOUTON = /btn|button|bouton|\bcta\b|-cta|pill-action/i
const CARTE = /card|carte|tuile|tile|panel|panneau|\bbox\b|-box|bloc|kpi|stat(?!us)/i
const TITRE = /(^|[\s>,])h[1-3]\b|titre|title|-head2|heading|-h1|-h2|-h3/i

const res = { console: { boutons: new Map(), cartes: new Map(), titres: new Map(), taillesTitres: new Set(), rayons: new Set(), ombres: new Set(), couleursEnDur: new Map() }, landing: { boutons: new Map(), cartes: new Map(), titres: new Map(), taillesTitres: new Set(), rayons: new Set(), ombres: new Set(), couleursEnDur: new Map() } }
for (const f of CONSOLE) {
  const css = lire(f)
  postcss.parse(css).walkRules((r) => {
    if (r.parent?.type === 'atrule' && /keyframes/.test(r.parent.name)) return
    for (const sel of r.selectors) {
      if (MORT.test(sel)) continue
      const surface = estLanding(sel) ? 'landing' : (f === 'app/globals.css' || f === 'app/base.css' ? 'console' : 'console')
      // Les pages publiques hors landing et les surfaces artisan ne sont pas ici (fichiers distincts) ; :root est un jeton.
      if (/:root/.test(sel)) continue
      const d = decl(r)
      const S = res[surface]
      const base = sel.replace(/:(hover|focus|focus-visible|active|disabled|not\([^)]*\)|is\([^)]*\)|where\([^)]*\)|before|after|first-child|last-child|nth-child\([^)]*\))/g, '').trim()
      if (d['border-radius']) S.rayons.add(d['border-radius'])
      if (d['box-shadow']) S.ombres.add(d['box-shadow'])
      for (const [p, v] of Object.entries(d)) for (const c of v.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi) ?? []) if (!/^rgba?\((0|255), ?(0|255), ?(0|255)/i.test(c)) S.couleursEnDur.set(c.toLowerCase(), (S.couleursEnDur.get(c.toLowerCase()) ?? 0) + 1)
      const visuel = d.background || d['background-color'] || d.border || d['border-radius']
      const sig = (k) => k.map((x) => d[x] ?? '').join(' | ')
      if (BOUTON.test(base) && visuel && !/:hover|:focus|:active|:disabled/.test(sel)) S.boutons.set(sig(['background', 'background-color', 'color', 'border', 'border-radius', 'padding', 'font-size', 'font-weight']), [...(S.boutons.get(sig(['background', 'background-color', 'color', 'border', 'border-radius', 'padding', 'font-size', 'font-weight'])) ?? []), base])
      else if (CARTE.test(base) && (d.background || d['background-color']) && (d['border-radius'] || d.border) && !/:hover/.test(sel)) S.cartes.set(sig(['background', 'background-color', 'border', 'border-radius', 'padding', 'box-shadow']), [...(S.cartes.get(sig(['background', 'background-color', 'border', 'border-radius', 'padding', 'box-shadow'])) ?? []), base])
      else if (TITRE.test(base) && d['font-size']) { S.titres.set(sig(['font-family', 'font-size', 'font-weight', 'letter-spacing', 'line-height']), [...(S.titres.get(sig(['font-family', 'font-size', 'font-weight', 'letter-spacing', 'line-height'])) ?? []), base]); S.taillesTitres.add(d['font-size']) }
    }
  })
}
// Styles en ligne dans les pages de la console (chaque `style={{` est un style hors système).
const PAGES = ['dashboard', 'messages', 'devis', 'factures', 'chiffres', 'crm', 'tarifs', 'inventaire', 'profil', 'plateforme', 'abonnement', 'outils', 'assistant', 'aide', 'parametres', 'site/commander']
const enLigne = {}
const lister = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? lister(path.join(d, e.name)) : /\.tsx$/.test(e.name) ? [path.join(d, e.name)] : []) : []
for (const p of PAGES) enLigne[p] = lister(path.join('app', p)).reduce((s, f) => s + (lire(f.split(path.sep).join('/')).match(/style=\{\{/g) ?? []).length, 0)
enLigne.AppShell = (lire('app/AppShell.tsx').match(/style=\{\{/g) ?? []).length
// Contrôle de palette (presti-design) : bleus et violets vivants.
const palette = {}
for (const f of [...CONSOLE]) palette[f] = (lire(f).split(/\r?\n/).map((l, i) => [i + 1, l]).filter(([, l]) => /#6C8CFF|#8A6BFF|#3EE0F0/i.test(l) && !/hud|jv-/.test(l))).map(([i]) => i)
const plat = (S) => ({ boutonsDistincts: S.boutons.size, cartesDistinctes: S.cartes.size, titresDistincts: S.titres.size, taillesDeTitre: [...S.taillesTitres], rayonsDistincts: S.rayons.size, rayons: [...S.rayons], ombresDistinctes: S.ombres.size, couleursEnDurDistinctes: S.couleursEnDur.size, couleursEnDurTop: [...S.couleursEnDur].sort((a, b) => b[1] - a[1]).slice(0, 25), boutons: [...S.boutons].map(([k, v]) => ({ style: k, selecteurs: [...new Set(v)].slice(0, 6) })), cartes: [...S.cartes].map(([k, v]) => ({ style: k, selecteurs: [...new Set(v)].slice(0, 6) })), titres: [...S.titres].map(([k, v]) => ({ style: k, selecteurs: [...new Set(v)].slice(0, 6) })) })
const sortie = { fichiers: CONSOLE, console: plat(res.console), landing: plat(res.landing), stylesEnLigne: enLigne, paletteBleuViolet: palette }
fs.writeFileSync(SORTIE, JSON.stringify(sortie, null, 1))
for (const s of ['console', 'landing']) { const o = sortie[s]; console.log(`${s} : boutons ${o.boutonsDistincts} · cartes ${o.cartesDistinctes} · titres ${o.titresDistincts} (${o.taillesDeTitre.length} tailles) · rayons ${o.rayonsDistincts} · ombres ${o.ombresDistinctes} · couleurs en dur ${o.couleursEnDurDistinctes}`) }
console.log('styles en ligne (style={{) :', JSON.stringify(enLigne))
console.log('bleu/violet vivants (hors hud/jv) :', JSON.stringify(palette))
