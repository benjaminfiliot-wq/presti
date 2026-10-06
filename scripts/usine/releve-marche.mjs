#!/usr/bin/env node
// scripts/usine/releve-marche.mjs — le relevé de marché quotidien de l'usine (06/10/2026, demande de Benj : « c'est l'écosystème qui fait le travail »).
//
// Pour chaque produit de docs/ecommerce/surveillance-produits.json :
//   · eBay.fr : les annonces à prix fixe en vente (prix demandé, port, compteur « vendus » quand eBay l'affiche) par Firecrawl ;
//   · TikTok : les vidéos françaises les plus aimées des trois derniers mois (vues, likes, compte, lien) par l'acteur Apify apidojo/tiktok-scraper.
// Il ne calcule AUCUNE marge (le prix fournisseur n'est pas mesuré) et ne dit jamais « vendu » d'un prix demandé. Résultat : <travail>/AAAA-MM-JJ.json et .md,
// et un journal. Un seul passage par jour de Paris (sauf --force) ; les plafonds du fichier de surveillance sont des maxima, jamais dépassés.
//
// Usage (presti-preneur-marche.service, compte agents) :
//   node scripts/usine/avec-coffre.mjs FIRECRAWL_API_KEY APIFY_TOKEN -- node scripts/usine/releve-marche.mjs [--travail=<dossier>] [--liste=<fichier>] [--force] [--sans-tiktok] [--sans-ebay]
// Codes : 0 fait (ou déjà fait aujourd'hui) ; 1 aucune source n'a répondu ; 2 usage ou liste illisible.
// Aucune clé n'est imprimée ni écrite. Variables d'essai (le juge) : MARCHE_FIRECRAWL_URL, MARCHE_APIFY_URL.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..', '..')
const FIRECRAWL = process.env.MARCHE_FIRECRAWL_URL || 'https://api.firecrawl.dev/v1/scrape'
const APIFY = process.env.MARCHE_APIFY_URL || 'https://api.apify.com/v2/acts/apidojo~tiktok-scraper/run-sync-get-dataset-items'
const JOUR_PARIS = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })

const options = (argv) => {
  const o = { force: false, sansTiktok: false, sansEbay: false }
  for (const a of argv) {
    if (a === '--force') { o.force = true; continue }
    if (a === '--sans-tiktok') { o.sansTiktok = true; continue }
    if (a === '--sans-ebay') { o.sansEbay = true; continue }
    const m = /^--(travail|liste)=(.+)$/.exec(a)
    if (!m) throw new Error('options')
    o[m[1]] = m[2]
  }
  o.travail ||= path.join(process.env.HOME || os.homedir(), 'travail', 'marche')
  o.liste ||= path.join(DEPOT, 'docs', 'ecommerce', 'surveillance-produits.json')
  return o
}

export const mediane = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null }

/** Les annonces d'une page de résultats eBay.fr rendue en Markdown par Firecrawl. Pure. */
export function annoncesEbay(markdown) {
  const lignes = String(markdown ?? '').split(/\n/).map((l) => l.replace(/\]\(https?:[^)]*\)/g, ']').trim())
  const annonces = []
  for (let i = 0; i < lignes.length; i++) {
    const m = /^\[(.+?)La page s'ouvre dans une nouvelle fenêtre ou un nouvel onglet\]$/.exec(lignes[i])
    if (!m) continue
    const a = { titre: m[1].trim().slice(0, 80), prix: null, port: null, vendus: null }
    for (let k = i + 1; k < Math.min(i + 22, lignes.length); k++) {
      if (/La page s'ouvre dans une nouvelle fenêtre/.test(lignes[k])) break
      const p = /^(\d[\d\s]*,\d{2}) EUR/.exec(lignes[k])
      if (p && a.prix === null) a.prix = Number(p[1].replace(/\s/g, '').replace(',', '.'))
      const lv = /^\+?(\d+,\d{2}) EUR pour la livraison|^\+(\d+,\d{2}) EUR livraison/.exec(lignes[k])
      if (lv && a.port === null) a.port = Number((lv[1] || lv[2]).replace(',', '.'))
      if (/Livraison gratuite/i.test(lignes[k]) && a.port === null) a.port = 0
      const v = /^(\d[\d\s]*) vendus?$/.exec(lignes[k])
      if (v) a.vendus = Number(v[1].replace(/\s/g, ''))
    }
    if (a.prix !== null && !annonces.some((x) => x.titre === a.titre && x.prix === a.prix)) annonces.push(a)
  }
  return annonces
}

/** Le résumé d'une recherche eBay : effectifs et prix DEMANDÉS (jamais des prix vendus). Pure. */
export function resumeEbay(annonces) {
  const prix = annonces.map((a) => a.prix)
  const avecVendus = annonces.filter((a) => a.vendus !== null)
  return {
    annonces: annonces.length, prix_demande_median: mediane(prix), prix_demande_min: prix.length ? Math.min(...prix) : null, prix_demande_max: prix.length ? Math.max(...prix) : null,
    avec_compteur_vendus: avecVendus.length, plus_vendus: avecVendus.sort((x, y) => y.vendus - x.vendus).slice(0, 5),
  }
}

/** Le résumé d'une recherche TikTok : vidéos lues, vidéos à plus de 100 000 vues, les cinq plus vues. Pure. */
export function resumeTiktok(items) {
  const lignes = (Array.isArray(items) ? items : []).map((x) => ({
    vues: Number(x.views ?? x.playCount ?? x.stats?.playCount ?? NaN), likes: Number(x.likes ?? x.diggCount ?? NaN),
    compte: String(x.channel?.username ?? x.authorMeta?.name ?? x.author?.uniqueId ?? ''), lien: String(x.postPage ?? x.webVideoUrl ?? x.url ?? ''),
    date: String(x.uploadedAtFormatted ?? x.createTimeISO ?? '').slice(0, 10), texte: String(x.title ?? x.text ?? '').replace(/\s+/g, ' ').slice(0, 90),
  })).filter((x) => Number.isFinite(x.vues)).sort((a, b) => b.vues - a.vues)
  return { videos: lignes.length, plus_de_100k: lignes.filter((x) => x.vues >= 100_000).length, top: lignes.slice(0, 5) }
}

async function ebay(mot, cle, delaiMs = 60_000) {
  const url = `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(mot)}&_sop=12&LH_BIN=1&LH_PrefLoc=3`
  const r = await fetch(FIRECRAWL, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${cle}` }, signal: AbortSignal.timeout(delaiMs),
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true, timeout: 45000, location: { country: 'FR', languages: ['fr-FR'] } }) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j?.data?.markdown) return { ok: false, statut: r.status }
  return { ok: true, resume: resumeEbay(annoncesEbay(j.data.markdown)) }
}

async function tiktok(mot, jeton, plafondUsd, parRecherche, delaiMs = 170_000) {
  const r = await fetch(`${APIFY}?timeout=150&maxTotalChargeUsd=${encodeURIComponent(plafondUsd)}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${jeton}` }, signal: AbortSignal.timeout(delaiMs),
    body: JSON.stringify({ keywords: [mot], maxItems: parRecherche, dateRange: 'LAST_THREE_MONTHS', sortType: 'MOST_LIKED', location: 'FR' }) })
  const j = await r.json().catch(() => null)
  if (!r.ok && r.status !== 201) return { ok: false, statut: r.status }
  return { ok: true, resume: resumeTiktok(j) }
}

export async function releve(o, env = process.env) {
  const liste = JSON.parse(fs.readFileSync(o.liste, 'utf8'))
  if (!Array.isArray(liste.produits) || !liste.produits.length) throw new Error('liste')
  const pl = liste.plafonds ?? {}
  let creditsFc = Math.min(Number(pl.firecrawl_par_jour) || 12, 30)
  let budgetUsd = Math.min(Number(pl.apify_usd_par_jour) || 0.15, 0.5)
  const parRecherche = Math.min(Number(pl.tiktok_par_recherche) || 20, 30)
  const jour = JOUR_PARIS.format(new Date())
  fs.mkdirSync(o.travail, { recursive: true })
  const fichier = path.join(o.travail, `${jour}.json`)
  if (!o.force && fs.existsSync(fichier)) { console.log(`marché : déjà relevé le ${jour}`); return 0 }
  const sortie = { jour, source: { ebay: 'Firecrawl (annonces à prix fixe EN VENTE : prix demandés, pas des prix vendus)', tiktok: 'Apify apidojo/tiktok-scraper (10 à 20 vidéos par mot-clé, tri « plus aimées », 3 mois, France)' }, produits: [], incidents: [] }
  const cleFc = env.FIRECRAWL_API_KEY, jetonAp = env.APIFY_TOKEN
  for (const p of liste.produits) {
    const ligne = { id: p.id, ebay: null, tiktok: [] }
    if (!o.sansEbay && cleFc && creditsFc > 0 && typeof p.ebay === 'string') {
      creditsFc--
      try { const e = await ebay(p.ebay, cleFc); if (e.ok) ligne.ebay = { mot: p.ebay, ...e.resume }; else sortie.incidents.push(`eBay « ${p.id} » : HTTP ${e.statut}`) }
      catch (e) { sortie.incidents.push(`eBay « ${p.id} » : ${e?.name === 'TimeoutError' ? 'délai' : 'panne'}`) }
    }
    if (!o.sansTiktok && jetonAp && Array.isArray(p.tiktok)) {
      for (const mot of p.tiktok.slice(0, 2)) {
        if (budgetUsd < 0.01) { sortie.incidents.push(`TikTok « ${mot} » : plafond du jour atteint`); break }
        const plafond = Math.min(budgetUsd, 0.05)
        budgetUsd -= plafond
        try { const t = await tiktok(mot, jetonAp, plafond, parRecherche); if (t.ok) ligne.tiktok.push({ mot, ...t.resume }); else sortie.incidents.push(`TikTok « ${mot} » : HTTP ${t.statut}`) }
        catch (e) { sortie.incidents.push(`TikTok « ${mot} » : ${e?.name === 'TimeoutError' ? 'délai' : 'panne'}`) }
      }
    }
    sortie.produits.push(ligne)
  }
  const reponses = sortie.produits.filter((p) => p.ebay || p.tiktok.length).length
  fs.writeFileSync(fichier, JSON.stringify(sortie, null, 1), { mode: 0o600 })
  const md = [`# Relevé de marché du ${jour} (automatique, usine)`, '', '> Prix **demandés** sur eBay.fr (pas des prix vendus) et vidéos TikTok les plus aimées par mot-clé. Aucune marge n\'est calculée : le prix fournisseur n\'est pas mesuré.', '',
    '| Produit | Annonces eBay | Prix demandé médian | Vidéos TikTok lues | ≥ 100 000 vues |', '|---|---|---|---|---|',
    ...sortie.produits.map((p) => `| ${p.id} | ${p.ebay?.annonces ?? '—'} | ${p.ebay?.prix_demande_median ?? '—'} € | ${p.tiktok.reduce((n, t) => n + t.videos, 0)} | ${p.tiktok.reduce((n, t) => n + t.plus_de_100k, 0)} |`),
    '', ...(sortie.incidents.length ? ['## Incidents', ...sortie.incidents.map((i) => `- ${i}`), ''] : [])].join('\n')
  fs.writeFileSync(path.join(o.travail, `${jour}.md`), md, { mode: 0o600 })
  fs.appendFileSync(path.join(o.travail, 'journal.jsonl'), `${JSON.stringify({ le: new Date().toISOString(), jour, produits: sortie.produits.length, reponses, incidents: sortie.incidents.length })}\n`, { mode: 0o600 })
  console.log(`marché : ${jour}, ${reponses}/${sortie.produits.length} produit(s) relevé(s), ${sortie.incidents.length} incident(s)`)
  return reponses ? 0 : 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let o
  try { o = options(process.argv.slice(2)) } catch { console.log('marché : options invalides'); process.exitCode = 2 }
  if (o) {
    try { process.exitCode = await releve(o) } catch (e) { console.log(`marché : ${e?.message === 'liste' ? 'liste de surveillance illisible' : 'erreur'}`); process.exitCode = 2 }
  }
}
