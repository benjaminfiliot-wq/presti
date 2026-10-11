#!/usr/bin/env node
// scripts/veille-plaintes-qa.mjs — le juge de la veille agrégée des plaintes d'artisans (07/10/2026) :
// lib/agents/acquisition/plaintes.ts, lib/agents/acquisition/plaintesParTheme.ts, scripts/veille-plaintes.mjs et
// docs/agents/plaintes-par-theme.md.
//
//   node --import ./scripts/ts-loader.mjs scripts/veille-plaintes-qa.mjs [--hors-ligne]
//        par défaut, VP-4 relit CHAQUE page de PLAINTES_VEILLE sur le réseau (robots.txt lu et respecté pour
//        PrestiRecenseur, une requête par seconde et par hôte) et y retrouve la citation mot pour mot ;
//        --hors-ligne : VP-4 « non jugé » (rouge), pour un essai sans réseau.
//   node --import ./scripts/ts-loader.mjs scripts/veille-plaintes-qa.mjs --auto-controle
//        chaque sabotage (une entrée fautive, une page d'essai servie en local) doit être refusé par le bon critère ;
//        jamais le vrai réseau (piège posé).
//
// Critères :
//   VP-1  les modules s'importent ; 5 thèmes ; PLAINTES_VEILLE gelé ; chaque thème a 3 formulations au moins ; la doc
//         existe, dit pourquoi Reddit et Google Maps ne sont pas lus, et son agrégat est celui du code (régénéré).
//   VP-2  forme : identifiants uniques (aussi face à douleurs.ts), thèmes connus, métier connu, citation de 20 à 200 signes,
//         date valide et passée, approuve: false tant que Benj n'a pas approuvé, AUCUNE autre clé (ni auteur, ni pseudo…) ;
//         THEMES_DES_DOULEURS ne nomme que des entrées existantes.
//   VP-3  aucune donnée personnelle (adresse, téléphone, @pseudo, u/pseudo, lien) ; page https, hors hôtes interdits
//         (Reddit, Google…), hors page de profil, sur un hôte permis (SOURCES du script ou sources déjà relues).
//   VP-4  substance : chaque citation de la veille se retrouve mot pour mot sur sa page (relue poliment).
//   VP-5  la logique pure : phrasesCandidates garde une plainte à la première personne et écarte en-tête « Réponse de… »,
//         citation de message (blockquote), adresse, téléphone, phrase sans thème ; donneesPersonnelles et hoteInterdit justes.
// Codes : 0 tout est vert · 1 un critère est rouge · 2 appel invalide.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { R, LOADER, lireOptions, creerSortie, premiereLigne, normaliser, texteVisibleJuge, piegerReseau, court, importerContrat } from './fixtures/026-acquisition/commun.mjs'

const JUGE = 'veille-plaintes-qa'
const o = lireOptions(process.argv.slice(2), { drapeauxConnus: ['hors-ligne'] })
if (o.inconnues.length || o.positionnels.length) { console.log(`${JUGE} : appel refusé — option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`); process.exit(2) }
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const K = await importerContrat()
const METIERS = K.METIERS.map((m) => m.id)
const THEMES_ATTENDUS = ['devis_sans_suite', 'appels_manques', 'site_absent', 'impayes', 'administratif']
const CLES_PERMISES = ['id', 'themes', 'metier', 'citation', 'source_url', 'relevee_le', 'approuve']
// Les hôtes dont les conditions ont été relues (doc « Sources ») : seuls ceux-là peuvent porter une plainte de la veille.
const HOTES_PERMIS = ['plombiers-reunis.com', 'droit-finances.commentcamarche.com', 'www.volta-electricite.info', 'volta-electricite.info', 'forum.copaindescopeaux.fr']
// Contrôles du JUGE, indépendants du module jugé.
const RE_EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
const RE_TEL = /(?:\+33[\s.-]?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/
const RE_PSEUDO = /(^|[^\w])u\/[\w-]{2,}|(^|[\s(«"'.,;:!?])@[A-Za-z][\w.-]{1,}/i
const RE_LIEN = /\bhttps?:\/\/|\bwww\./i
const RE_PROFIL = /\/(?:user|users|u|profil|profile|membre|membres|member|memberlist)(?:[\/.?#_-]|$)|[?&](?:mode=viewprofile|u=\d)/i
const INTERDITS = ['reddit.com', 'redd.it', 'google.com', 'google.fr', 'facebook.com', 'instagram.com', 'linkedin.com', 'x.com', 'twitter.com', 'tiktok.com', 'pagesjaunes.fr', 'trustpilot.com']
const hoteDe = (u) => { try { return new URL(u).hostname.toLowerCase() } catch { return '' } }
const RE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function controlerEntree(p, { idsDouleurs = new Set() } = {}) {
  const e = { 'VP-2': [], 'VP-3': [] }
  const autres = Object.keys(p ?? {}).filter((k) => !CLES_PERMISES.includes(k))
  if (autres.length) e['VP-2'].push(`clé(s) en trop : ${autres.join(', ')}`)
  if (!RE_ID.test(p?.id ?? '')) e['VP-2'].push(`id ${JSON.stringify(p?.id)} mal formé`)
  if (idsDouleurs.has(p?.id)) e['VP-2'].push(`id ${p.id} déjà pris par douleurs.ts`)
  if (!Array.isArray(p?.themes) || !p.themes.length || p.themes.some((t) => !THEMES_ATTENDUS.includes(t))) e['VP-2'].push(`thèmes ${JSON.stringify(p?.themes)} invalides`)
  if (p?.metier !== 'tous' && !METIERS.includes(p?.metier)) e['VP-2'].push(`métier ${JSON.stringify(p?.metier)} inconnu`)
  const c = String(p?.citation ?? '')
  if (c.length < 20 || c.length > 200) e['VP-2'].push(`citation de ${c.length} signes (20 à 200)`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p?.relevee_le ?? '') || Number.isNaN(Date.parse(p.relevee_le))) e['VP-2'].push(`relevee_le ${JSON.stringify(p?.relevee_le)} mal formé`)
  else if (p.relevee_le > new Date().toISOString().slice(0, 10)) e['VP-2'].push(`relevee_le ${p.relevee_le} dans le futur`)
  if (p?.approuve !== false) e['VP-2'].push(`approuve vaut ${JSON.stringify(p?.approuve)} : false tant que Benj n'a pas approuvé (et alors par un commit à part, juge mis à jour)`)
  for (const [nom, re] of [['adresse e-mail', RE_EMAIL], ['téléphone', RE_TEL], ['pseudo', RE_PSEUDO], ['lien', RE_LIEN]]) if (re.test(c)) e['VP-3'].push(`citation : ${nom}`)
  const url = String(p?.source_url ?? '')
  const h = hoteDe(url)
  if (!url.startsWith('https://')) e['VP-3'].push('source_url non https')
  if (RE_PROFIL.test(url.replace(/^https?:\/\/[^/]+/, ''))) e['VP-3'].push('source_url : page de profil')
  if (INTERDITS.some((d) => h === d || h.endsWith(`.${d}`))) e['VP-3'].push(`source_url : hôte interdit (${h})`)
  else if (!HOTES_PERMIS.includes(h)) e['VP-3'].push(`source_url : hôte non relu (${h || 'illisible'})`)
  return e
}

// ── Lecteur poli du juge (indépendant du script jugé) ─────────────────────────────────────────────────────────────────
const dernier = new Map(), robotsMemo = new Map()
async function tour(hote, ms) { const a = (dernier.get(hote) ?? 0) + ms - Date.now(); if (a > 0) await new Promise((r) => setTimeout(r, a)); dernier.set(hote, Date.now()) }
function robotsPermet(txt, chemin) {
  const blocs = String(txt ?? '').split(/\n(?=user-agent\s*:)/i)
  let nous = null, etoile = null
  for (const b of blocs) {
    const agents = [...b.matchAll(/^user-agent\s*:\s*(.+)$/gim)].map((m) => m[1].trim().toLowerCase())
    const dis = [...b.matchAll(/^disallow\s*:\s*(\S*)/gim)].map((m) => m[1])
    if (agents.includes('prestirecenseur')) nous = [...(nous ?? []), ...dis]
    else if (agents.includes('*')) etoile = [...(etoile ?? []), ...dis]
  }
  const re = (d) => new RegExp('^' + d.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*'))
  return !(nous ?? etoile ?? []).some((d) => d && re(d).test(chemin))
}
async function relire(url, ecart = 1000) {
  let u; try { u = new URL(url) } catch { return { ok: false, raison: 'url' } }
  if (!robotsMemo.has(u.host)) {
    await tour(u.host, ecart)
    try { const r = await fetch(`${u.origin}/robots.txt`, { headers: { 'user-agent': K.UA_RECENSEUR }, signal: AbortSignal.timeout(8000) }); robotsMemo.set(u.host, r.ok ? await r.text() : '') } catch { robotsMemo.set(u.host, '') }
  }
  if (!robotsPermet(robotsMemo.get(u.host), u.pathname + u.search)) return { ok: false, raison: 'robots.txt' }
  await tour(u.host, ecart)
  try {
    const r = await fetch(url, { headers: { 'user-agent': K.UA_RECENSEUR }, redirect: 'follow', signal: AbortSignal.timeout(10_000) })
    if (!r.ok) return { ok: false, raison: `code ${r.status}` }
    return { ok: true, texte: await r.text() }
  } catch (e) { return { ok: false, raison: `injoignable : ${premiereLigne(e.cause ?? e)}` } }
}
const retrouvee = (html, citation) => texteVisibleJuge(html).includes(normaliser(citation))

// ── VP-5 : la page d'essai de la logique pure ─────────────────────────────────────────────────────────────────────────
const PAGE_ESSAI = `<html><head><title>Fil d'essai</title><script>var x = "je relance mes devis sans réponse depuis un mois"</script></head><body>
<div class="post"><p>4 Réponse de Pseudo_Temoin 12-03-2025 10:00:00</p>
<div class="content"><p>Mes devis partent et je n'ai jamais de réponse des clients, même après deux relances.</p>
<blockquote>Je ne retrouve plus aucune facture impayée de mon client, citation d'un autre message.</blockquote>
<p>Écrivez-moi à artisan.temoin@exemple.invalid pour les devis sans réponse que je relance.</p>
<p>Appelez le 06 12 34 56 78 car je rate des appels sur le chantier toute la journée.</p>
<p>La météo est belle aujourd'hui et nous avons fini le chantier à temps.</p>
<p>Les clients ne répondent pas toujours aux devis envoyés par les entreprises.</p>
<p>Je passe mes soirées sur la paperasse au lieu de dormir.</p></div></div></body></html>`

async function juger(M, P, D, docTexte, docAttendu, s, { horsLigne }) {
  // VP-1
  const e1 = []
  if (!M || !Array.isArray(M.THEMES)) e1.push('plaintes.ts : THEMES absent')
  else { const ids = M.THEMES.map((t) => t.id); for (const t of THEMES_ATTENDUS) if (!ids.includes(t)) e1.push(`thème ${t} absent`) }
  if (!P || !Array.isArray(P.PLAINTES_VEILLE)) e1.push('plaintesParTheme.ts : PLAINTES_VEILLE absent')
  else if (!Object.isFrozen(P.PLAINTES_VEILLE)) e1.push('PLAINTES_VEILLE non gelé')
  let ag = []
  try { ag = P.agregatParTheme() } catch (e) { e1.push(`agregatParTheme : ${premiereLigne(e)}`) }
  for (const t of ag) if (t.nombre < 3) e1.push(`thème ${t.theme} : ${t.nombre} formulation(s), 3 au moins`)
  if (!docTexte) e1.push('docs/agents/plaintes-par-theme.md absent')
  else {
    if (!/Reddit/.test(docTexte) || !/Disallow: \//.test(docTexte)) e1.push('la doc ne dit pas pourquoi Reddit n\'est pas lu (robots.txt « Disallow: / »)')
    if (!/Google Maps/.test(docTexte) || !/API Places/.test(docTexte)) e1.push('la doc ne dit pas pourquoi les avis Google ne sont pas lus ni ce qu\'il faudrait')
    if (docAttendu !== null && docTexte.replace(/\r\n/g, '\n') !== docAttendu) e1.push('la doc n\'est pas à jour de plaintesParTheme.ts (relancer veille-plaintes.mjs --agreger)')
  }
  s.juger('VP-1', e1, `5 thèmes ; ${P?.PLAINTES_VEILLE?.length ?? 0} plainte(s) de veille gelée(s) ; formulations par thème : ${ag.map((t) => `${t.theme} ${t.nombre}`).join(', ')} ; doc à jour (Reddit et Google Maps motivés)`)
  // VP-2 / VP-3
  const idsDouleurs = new Set((D?.DOULEURS ?? []).map((d) => d.id))
  const e2 = [], e3 = []
  const vus = new Map()
  for (const p of P?.PLAINTES_VEILLE ?? []) {
    const r = controlerEntree(p, { idsDouleurs })
    e2.push(...r['VP-2'].map((m) => `${p.id} : ${m}`)); e3.push(...r['VP-3'].map((m) => `${p.id} : ${m}`))
    vus.set(p.id, (vus.get(p.id) ?? 0) + 1)
  }
  for (const [id, n] of vus) if (n > 1) e2.push(`identifiant en double : ${id}`)
  for (const [id, themes] of Object.entries(P?.THEMES_DES_DOULEURS ?? {})) {
    if (!idsDouleurs.has(id)) e2.push(`THEMES_DES_DOULEURS : ${id} n'existe pas dans douleurs.ts`)
    if (!Array.isArray(themes) || !themes.length || themes.some((t) => !THEMES_ATTENDUS.includes(t))) e2.push(`THEMES_DES_DOULEURS : ${id} → thèmes invalides`)
  }
  s.juger('VP-2', e2, `${vus.size} plainte(s) : forme, clés permises seules, unicité ; ${Object.keys(P?.THEMES_DES_DOULEURS ?? {}).length} entrées de douleurs.ts rangées`)
  s.juger('VP-3', e3, 'aucune donnée personnelle ; pages https sur des hôtes relus, ni Reddit, ni Google, ni profil')
  // VP-4
  if (horsLigne) s.echoue('VP-4', 'non jugé : --hors-ligne (la substance exige la relecture des pages)')
  else {
    const e4 = [], detail = []
    for (const p of P?.PLAINTES_VEILLE ?? []) {
      const r = await relire(p.source_url)
      const ok = r.ok && retrouvee(r.texte, p.citation)
      detail.push(`${p.id} : ${r.ok ? (ok ? 'retrouvée' : 'absente') : r.raison}`)
      if (!ok) e4.push(detail.at(-1))
    }
    s.juger('VP-4', e4, `${detail.length - e4.length}/${detail.length} citation(s) retrouvée(s) mot pour mot sur leur page (réseau réel, robots.txt respecté) — ${court(detail.join(' | '), 400)}`)
  }
  // VP-5
  const e5 = []
  try {
    const c = M.phrasesCandidates(PAGE_ESSAI).map((x) => x.citation)
    if (!c.some((x) => x.startsWith('Mes devis partent'))) e5.push('la plainte à la première personne (devis sans réponse) n\'est pas gardée')
    if (!c.some((x) => x.startsWith('Je passe mes soirées sur la paperasse'))) e5.push('la plainte « paperasse le soir » n\'est pas gardée')
    if (c.some((x) => /Pseudo_Temoin|Réponse de/.test(x))) e5.push('un en-tête « Réponse de <pseudo> » est gardé')
    if (c.some((x) => /citation d'un autre message/.test(x))) e5.push('une citation de message (blockquote) est gardée')
    if (c.some((x) => /@|06 12/.test(x))) e5.push('une phrase avec adresse ou téléphone est gardée')
    if (c.some((x) => /météo/.test(x))) e5.push('une phrase sans thème est gardée')
    if (c.some((x) => /Les clients ne répondent pas toujours/.test(x))) e5.push('une phrase qui n\'est pas à la première personne est gardée')
    if (c.some((x) => /var x/.test(x) || /depuis un mois/.test(x))) e5.push('le texte d\'un script est gardé')
    if (M.donneesPersonnelles('écrire à a.b@c.fr').length === 0 || M.donneesPersonnelles('voir u/Temoin').length === 0 || M.donneesPersonnelles('Je relance mes devis.').length) e5.push('donneesPersonnelles se trompe')
    if (!M.hoteInterdit('https://www.reddit.com/r/france/') || !M.hoteInterdit('https://old.reddit.com/x') || !M.hoteInterdit('https://www.google.com/maps/place/x') || M.hoteInterdit('https://plombiers-reunis.com/topic1-x.html')) e5.push('hoteInterdit se trompe (Reddit et Google interdits, forum permis)')
    s.juger('VP-5', e5, `page d'essai : ${c.length} phrase(s) gardée(s) (les deux plaintes vécues) ; en-tête à pseudo, blockquote, adresse, téléphone, script, phrase sans thème ou impersonnelle écartés ; Reddit et Google refusés`)
  } catch (e) { s.echoue('VP-5', `logique pure : ${premiereLigne(e)}`) }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const imp = (rel) => import(`${pathToFileURL(path.join(R, rel)).href}`)
const M = await imp('lib/agents/acquisition/plaintes.ts').catch(() => null)
const P = await imp('lib/agents/acquisition/plaintesParTheme.ts').catch(() => null)
const D = await imp('lib/agents/acquisition/douleurs.ts').catch(() => null)
const S = await imp('scripts/veille-plaintes.mjs').catch(() => null)
const docTexte = (() => { try { return fs.readFileSync(path.join(R, 'docs', 'agents', 'plaintes-par-theme.md'), 'utf8') } catch { return null } })()
const docAttendu = S?.documentAgrege ? await S.documentAgrege() : null

if (o.autoControle) {
  const s = creerSortie(`${JUGE} --auto-controle`, [], `${JUGE} --auto-controle — chaque entrée fautive refusée par son critère, réseau piégé`)
  // Le serveur local d'abord (le piège coupe aussi la résolution de noms), puis le piège : seul 127.0.0.1 reste joignable.
  const journal = []
  const srv = http.createServer((req, res) => {
    journal.push(req.url)
    if (req.url === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('User-agent: *\nDisallow: /interdit/\n'); return }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(PAGE_ESSAI)
  })
  await new Promise((r) => srv.listen(0, '127.0.0.1', r))
  const piege = piegerReseau()
  try {
    const base = { id: 'veille-essai-conforme', themes: ['devis_sans_suite'], metier: 'plombier', citation: "Mes devis partent et je n'ai jamais de réponse des clients, même après deux relances.", source_url: 'https://plombiers-reunis.com/topic1-essai.html', relevee_le: '2026-10-01', approuve: false }
    const ok = controlerEntree(base)
    s.juger('AC-0', [...ok['VP-2'], ...ok['VP-3']], 'l\'entrée conforme passe VP-2 et VP-3 sans reproche')
    const CAS = [
      ['AC-1', 'VP-3', 'pseudo dans la citation', { citation: "Merci @Temoin_Plombier, je relance mes devis sans réponse." }],
      ['AC-2', 'VP-3', 'adresse e-mail', { citation: 'Je relance mes devis, écrivez à artisan.temoin@exemple.invalid merci.' }],
      ['AC-3', 'VP-3', 'page Reddit', { source_url: 'https://www.reddit.com/r/france/comments/abc/devis/' }],
      ['AC-4', 'VP-3', 'page de profil', { source_url: 'https://plombiers-reunis.com/user/123' }],
      ['AC-5', 'VP-3', 'hôte jamais relu', { source_url: 'https://forum-inconnu.invalid/fil-1' }],
      ['AC-6', 'VP-2', 'thème inconnu', { themes: ['reputation'] }],
      ['AC-7', 'VP-2', 'citation de 250 signes', { citation: 'Je relance mes devis '.repeat(13).trim() }],
      ['AC-8', 'VP-2', 'clé « auteur » ajoutée', { auteur: 'Pseudo_Temoin' }],
      ['AC-9', 'VP-2', 'date future', { relevee_le: '2999-01-01' }],
      ['AC-10', 'VP-2', 'approuvée sans accord de Benj', { approuve: true }],
      ['AC-11', 'VP-3', 'téléphone', { citation: 'Je rate des appels, rappelez le 06 12 34 56 78 svp.' }],
      ['AC-12', 'VP-2', 'id déjà pris par douleurs.ts', { id: 'plombier-bureaucratie' }],
    ]
    const idsDouleurs = new Set((D?.DOULEURS ?? []).map((d) => d.id))
    for (const [ac, vise, nom, mut] of CAS) {
      const r = controlerEntree({ ...base, ...mut }, { idsDouleurs })
      s.juger(ac, r[vise].length ? [] : [`« ${nom} » accepté par ${vise}`], `« ${nom} » refusé par ${vise} (${court(r[vise][0] ?? '', 80)})`)
    }
    // AC-13 : la relecture sur un serveur local — conforme retrouvée, retouchée absente, page interdite jamais demandée.
    const b = `http://127.0.0.1:${srv.address().port}`
    {
      const e = []
      const r1 = await relire(`${b}/fil.html`, 5)
      if (!r1.ok || !retrouvee(r1.texte, base.citation)) e.push('citation conforme non retrouvée')
      if (r1.ok && retrouvee(r1.texte, base.citation.replace('deux relances', 'trois relances'))) e.push('citation retouchée retrouvée à tort')
      const r2 = await relire(`${b}/interdit/fil.html`, 5)
      if (r2.ok || r2.raison !== 'robots.txt') e.push('robots.txt non respecté')
      if (journal.some((u) => u.startsWith('/interdit/'))) e.push('la page interdite a été demandée')
      s.juger('AC-13', e, 'serveur local : conforme retrouvée, retouchée absente, page interdite par robots.txt jamais demandée')
    }
    // AC-14 : le module jugé lui-même passe VP-5 (sinon les sabotages ci-dessus ne prouvent rien de la logique).
    const m = { ids: [] }
    await juger(M, P, D, docTexte, docAttendu, { juger: (id, e) => { if (e.length) m.ids.push(`${id} : ${e[0]}`) }, echoue: (id, d) => { if (id !== 'VP-4') m.ids.push(`${id} : ${d}`) }, passe: () => {} }, { horsLigne: true })
    s.juger('AC-14', m.ids, 'le dépôt passe VP-1, VP-2, VP-3 et VP-5 (VP-4 se juge sur le réseau, hors autocontrôle)')
  } finally { piege.retirer(); await new Promise((r) => srv.close(r)) }
  const horsLocal = piege.tentatives.filter((t) => !/127\.0\.0\.1|localhost|\[::1\]/i.test(t))
  if (horsLocal.length) s.echoue('AC-15', `réseau tenté pendant l'autocontrôle : ${court(horsLocal.join(' ; '), 160)}`)
  else s.passe('AC-15', 'aucun accès au réseau hors 127.0.0.1')
  process.exitCode = s.finir()
} else {
  const s = creerSortie(`${JUGE}${o.drapeaux.has('hors-ligne') ? ' --hors-ligne' : ''}`, ['VP-1', 'VP-2', 'VP-3', 'VP-4', 'VP-5'], `${JUGE} — ${P?.PLAINTES_VEILLE?.length ?? 0} plainte(s) de veille, ${D?.DOULEURS?.length ?? 0} douleur(s) de la bibliothèque`)
  await juger(M, P, D, docTexte, docAttendu, s, { horsLigne: o.drapeaux.has('hors-ligne') })
  process.exitCode = s.finir()
}
