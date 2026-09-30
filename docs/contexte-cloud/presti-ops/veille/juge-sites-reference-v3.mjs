#!/usr/bin/env node
// juge-sites-reference-v3.mjs — troisième passe des 10 sites de référence (27/09, écrit AVANT). 0 = PASS, 1 = FAIL.
// La v2 est passée avec des sites propres mais « nettement en dessous de Lestraque » (revue indépendante du 27/09) : un seul
// gabarit pour tous, titres de 4 à 7 lignes qui chassent le bouton sous le pli, blanc sur jaune à 1,84:1, bouton sans forme,
// liens morts en double-clic, « à Les Magnils-Reigniers », et un texte qui parle de la maquette plutôt que de l'artisan.
// Celui-ci relance la v2, puis juge la structure de Lestraque et MESURE dans Chromium (bureau 1440×900, téléphone 390×844).
//
// Contrat de balisage exigé (pour que le juge mesure sans deviner) :
//   [data-role="bandeau-maquette"] sur chaque page ; [data-role="hero"] et, dedans, [data-role="cta-hero"] ;
//   tout bouton ou lien-bouton porte [data-role="cta"] (le cta-hero compris) ; tout surtitre porte [data-role="kicker"] ;
//   accueil : #prestations (≥ 6 [data-role="prestation"]), #atelier, #realisations (≥ 5 img), #communes, #etapes
//   (≥ 3 [data-role="etape"]), #questions (≥ 4 details ou [data-role="question"]), #contact.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname, normalize } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
const R = process.env.VEILLE || join(process.env.HOME || '.', 'veille')
const D = join(R, 'prospection', 'sites-reference')
const PRESTI = process.env.PRESTI || join(process.env.HOME || '.', 'presti')
const manques = []
const v2 = spawnSync(process.execPath, [join(R, 'juges', 'juge-sites-reference-v2.mjs')], { encoding: 'utf8', env: process.env })
if (v2.status !== 0) manques.push(`la v2 ne passe plus : ${(v2.stdout || '').trim().split('\n').slice(0, 5).join(' | ')}`)
const lire = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')
const texte = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&rsquo;|&#8217;/g, '’').replace(/\s+/g, ' ')
const dossiers = existsSync(D) ? readdirSync(D).filter((d) => statSync(join(D, d)).isDirectory() && /^\d\d-/.test(d)) : []
if (dossiers.length < 10) manques.push(`${dossiers.length} site(s) (10 attendus)`)
const signatures = new Map()
for (const d of dossiers) {
  const dos = join(D, d), s = join(dos, 'site')
  let site = {}
  try { site = JSON.parse(lire(join(dos, 'site.json'))) } catch { manques.push(`${d} : site.json illisible`); continue }
  for (const reste of ['amorce-generateur', 'maquette-amorce.json']) if (existsSync(join(dos, reste))) manques.push(`${d} : brouillon ${reste} encore livré (à retirer : site/ le remplace)`)
  if (!/^https:\/\//.test(String(site.source_telephone || ''))) manques.push(`${d} : source_telephone n'est pas une URL publique https (« ${site.source_telephone} »)`)
  const html = existsSync(s) ? readdirSync(s, { recursive: true }).map(String).filter((f) => f.endsWith('.html')) : []
  for (const f of html) {
    const h = lire(join(s, f)), t = texte(h)
    if (!/data-role="bandeau-maquette"/.test(h) || !/Maquette — exemple non contractuel/.test(t)) manques.push(`${d}/${f} : bandeau [data-role="bandeau-maquette"] « Maquette — exemple non contractuel » absent`)
    const mortes = [...h.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^(https?:|tel:|mailto:|#|data:)/.test(u) && !/\.(html|css|js|svg|png|webp|avif|jpe?g|woff2|xml|txt|ico)(#.*)?$/.test(u))
    if (mortes.length) manques.push(`${d}/${f} : liens qui ne s'ouvrent pas en double-clic (dossier sans index.html) : ${mortes.slice(0, 3).join(', ')}`)
    if (/<link[^>]+rel="preload"[^>]+crossorigin/.test(h)) manques.push(`${d}/${f} : preload avec crossorigin (erreur CORS en file://)`)
    // « à La Rochelle » est juste (La ne se contracte pas) ; Le et Les, si : au Mans, aux Magnils-Reigniers, du, des.
    // (?:^|\s) et non \b : sans le drapeau u, \b ne voit pas « à » comme une lettre.
    const faute = t.match(/(?:^|\s)(?:à|de) (?:Les?) (?=[A-ZÉÈ])|(?:^|\s)de (?=[AEIOUYÉÈÊÂÎÔÛ][\wéèêàç’'-])/)
    if (faute) manques.push(`${d}/${f} : contraction ou élision manquante : « …${t.slice(Math.max(0, faute.index - 20), faute.index + 30).trim()}… » (aux, au, des, du, d’)`)
    if (/\b\d+\s*(ans|années)\s+d.exp|\b\d{2,}\s+(chantiers|clients|réalisations)|★{3,}|garantie décennale|Qualibat|\bRGE\b|depuis 19\d\d|depuis 20\d\d/i.test(t)) manques.push(`${d}/${f} : affirmation invérifiable (expérience, chiffres, avis, certification, ancienneté)`)
  }
  const acc = lire(join(s, 'index.html')), ta = texte(acc)
  const hero = (acc.match(/data-role="hero"[\s\S]*?<\/(section|header)>/) || [''])[0]
  if (!hero) manques.push(`${d} : accueil sans [data-role="hero"]`)
  else {
    if (!/data-role="cta-hero"/.test(hero)) manques.push(`${d} : héros sans [data-role="cta-hero"]`)
    if (/maquette|proposition|à préciser|non publié/i.test(texte(hero).replace(/Maquette — exemple non contractuel/g, ''))) manques.push(`${d} : le héros parle de la maquette (le bandeau suffit) : il doit parler de l'artisan et de son métier`)
  }
  const compte = (id, re) => { const m = acc.match(new RegExp(`id="${id}"[\\s\\S]*?(?=<section|<footer|$)`)); return m ? (m[0].match(re) || []).length : -1 }
  for (const [id, re, min, quoi] of [['prestations', /data-role="prestation"/g, 6, 'prestations'], ['atelier', /<p[\s>]/g, 1, 'paragraphe'], ['realisations', /<img[\s>]/g, 5, 'images'], ['communes', /<a[\s>]|<li[\s>]/g, 3, 'communes'], ['etapes', /data-role="etape"/g, 3, 'étapes'], ['questions', /<details[\s>]|data-role="question"/g, 4, 'questions'], ['contact', /href="tel:/g, 1, 'lien tel:']]) {
    const n = compte(id, re)
    if (n < 0) manques.push(`${d} : accueil sans section #${id} (structure de Lestraque)`)
    else if (n < min) manques.push(`${d} : #${id} : ${n} ${quoi} (≥ ${min})`)
  }
  const faq = (acc.match(/id="questions"[\s\S]*?(?=<section|<footer|$)/) || [''])[0]
  if (/publié|maquette/i.test(texte(faq))) manques.push(`${d} : la FAQ parle de la maquette : elle doit répondre aux questions d'un client de l'artisan`)
  const mentions = readdirSync(s, { recursive: true }).map(String).filter((f) => /mentions/.test(f) && f.endsWith('.html')).map((f) => texte(lire(join(s, f)))).join(' ')
  if (!/redimensionn|convert/i.test(mentions)) manques.push(`${d} : les mentions ne disent pas que les images ont été redimensionnées ou converties (CC BY / BY-SA)`)
  const h1 = (acc.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || ['', ''])[1]
  const atelier = (acc.match(/id="atelier"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/) || ['', ''])[1]
  const sig = (texte(h1) + '|' + texte(atelier)).replace(new RegExp(String(site.nom_affiche || '@@').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'X').replace(new RegExp(String(site.commune || '@@').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'Y').trim()
  if (signatures.has(sig)) manques.push(`${d} : même titre et même texte d'atelier que ${signatures.get(sig)} au nom près (chaque site doit être écrit pour son artisan)`)
  else signatures.set(sig, d)
}
// Les mesures, dans Chromium : le bouton du héros dans le premier écran, les contrastes, le téléphone.
let chromium = null
try { chromium = createRequire(join(PRESTI, 'package.json'))('playwright').chromium } catch (e) { manques.push(`Playwright introuvable dans ${PRESTI} : ${e.message.split('\n')[0]}`) }
if (chromium && dossiers.length) {
  const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' }
  let racine = ''
  const srv = createServer((q, r) => {
    let p = normalize(join(racine, decodeURIComponent(q.url.split('?')[0])))
    if (!p.startsWith(racine)) { r.writeHead(403); return r.end() }
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html')
    if (!existsSync(p)) { r.writeHead(404); return r.end() }
    r.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); r.end(readFileSync(p))
  })
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
  const base = `http://127.0.0.1:${srv.address().port}`
  const nav = await chromium.launch()
  const MESURE = () => {
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
    const rgba = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] }
    // Fond effectif : on remonte jusqu'au premier fond opaque. Une image de fond rencontrée avant (photo, dégradé) rend le
    // contraste incalculable depuis les couleurs : null, et le critère saute cet élément au lieu de le compter faux.
    const fond = (el) => { const pile = []
      for (let e = el; e; e = e.parentElement) { const st = getComputedStyle(e); const b = rgba(st.backgroundColor); pile.push(b); if (b && b[3] >= 1) break; if (st.backgroundImage && st.backgroundImage !== 'none') return null }
      let c = [255, 255, 255]; for (const b of pile.reverse()) if (b && b[3] > 0) c = c.map((v, i) => v * (1 - b[3]) + b[i] * b[3]); return c }
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
    const out = { ctaHero: null, contrastes: [], debord: document.documentElement.scrollWidth > innerWidth + 1, tel: null }
    const cta = document.querySelector('[data-role="hero"] [data-role="cta-hero"]')
    if (cta) { const r = cta.getBoundingClientRect(); const hero = cta.closest('[data-role="hero"]'); out.ctaHero = { bas: Math.round(r.bottom + scrollY), haut: Math.round(r.top + scrollY), h: Math.round(r.height), forme: (() => { const a = fond(cta), b = fond(hero.parentElement || hero); return a && b ? ratio(a, b) : 99 })(), bord: parseFloat(getComputedStyle(cta).borderTopWidth) || 0 } }
    for (const el of document.querySelectorAll('[data-role="cta"], [data-role="cta-hero"], [data-role="kicker"]')) {
      const st = getComputedStyle(el); if (st.visibility === 'hidden' || st.display === 'none' || !el.getClientRects().length) continue
      const c = rgba(st.color); if (!c) continue
      const taille = parseFloat(st.fontSize), gras = parseInt(st.fontWeight, 10) >= 700
      const seuil = taille >= 24 || (gras && taille >= 18.66) ? 3 : 4.5
      const fd = fond(el); if (!fd) continue
      const r = ratio(c.slice(0, 3), fd)
      if (r < seuil) out.contrastes.push(`${el.dataset.role} « ${el.textContent.trim().slice(0, 30)} » ${r.toFixed(2)}:1 < ${seuil}`)
    }
    const t = [...document.querySelectorAll('a[href^="tel:"]')].find((a) => { const r = a.getBoundingClientRect(); return r.height > 0 && r.top >= 0 && r.bottom <= innerHeight })
    out.tel = !!t
    return out
  }
  try {
    for (const d of dossiers) {
      racine = normalize(join(D, d, 'site'))
      const pages = readdirSync(racine, { recursive: true }).map(String).filter((f) => f.endsWith('index.html') && !/mentions|contact|prestations/.test(f)).map((f) => '/' + f.replace(/\\/g, '/').replace(/index\.html$/, ''))
      for (const [larg, haut] of [[1440, 900], [390, 844]]) {
        const ctx = await nav.newContext({ viewport: { width: larg, height: haut }, reducedMotion: 'reduce' })
        const pg = await ctx.newPage()
        for (const p of pages) {
          await pg.goto(base + p, { waitUntil: 'networkidle' }); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(400)
          const m = await pg.evaluate(MESURE)
          const ou = `${d}${p} ${larg}×${haut}`
          if (!m.ctaHero) manques.push(`${ou} : bouton du héros introuvable`)
          else {
            if (larg === 1440 && m.ctaHero.bas > 860) manques.push(`${ou} : le bouton du héros finit à ${m.ctaHero.bas} px (≤ 860 exigé : dans le premier écran)`)
            if (m.ctaHero.h < 36) manques.push(`${ou} : bouton du héros de ${m.ctaHero.h} px de haut (≥ 36)`)
            if (m.ctaHero.forme < 1.4 && m.ctaHero.bord < 1) manques.push(`${ou} : le bouton du héros n'a pas de forme visible (fond à ${m.ctaHero.forme.toFixed(2)}:1 du héros, sans bordure)`)
          }
          for (const c of m.contrastes.slice(0, 3)) manques.push(`${ou} : contraste ${c}`)
          if (m.debord) manques.push(`${ou} : débordement horizontal`)
          if (larg === 390 && !m.tel) manques.push(`${ou} : aucun lien tel: visible sans défiler au téléphone`)
        }
        await ctx.close()
      }
    }
  } finally { await nav.close(); srv.close() }
}
if (manques.length) { console.log(`juge-sites-reference-v3 : FAIL — ${manques.length} manque(s)`); for (const m of manques.slice(0, 60)) console.log('  - ' + m); process.exit(1) }
console.log(`juge-sites-reference-v3 : PASS — ${dossiers.length} sites sur la structure de Lestraque, écrits pour leur artisan, mesurés dans Chromium (premier écran, contrastes, téléphone, double-clic)`)
