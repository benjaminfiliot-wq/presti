#!/usr/bin/env node
// scripts/qualite-sites-qa.mjs — le juge du Contrôleur qualité des sites livrés (fiche 026-246, poste manquant n° 3 de
// l'organigramme du 27/09). Écrit AVANT le module qu'il juge ; l'exécutant du module n'y touche jamais.
//
//   node scripts/qualite-sites-qa.mjs [--racine=<d>] [--temoin] [--partie=disponibilite,poids,accessibilite,liens,mentions,formulaire,visuel,decision]
//                                     [--auto-controle] [--preuve-echecs] [--reel]
//
// CE QU'IL MESURE. Le juge démarre un serveur factice sur 127.0.0.1 (port éphémère, aucun réseau externe : scripts/fixtures/026/
// qualite-sites/serveur-factice.mjs) qui sert cinq « sites livrés » aux pannes réglables, puis appelle le module jugé et compare
// ce qu'il rapporte à ce que le SERVEUR a réellement rendu : code, protocole, octets envoyés, ratio WCAG recalculé ici, codes
// des liens, mentions lues dans le gabarit, point d'entrée du formulaire. Le serveur journalise chaque requête : c'est ce
// journal (aucune méthode d'écriture, aucun POST sur le formulaire, aucune requête vers un site programmé au retrait) qui prouve
// la lecture seule — pas la parole du module.
//
// LE MODULE JUGÉ (contrat posé ici, le module de production le tiendra — fiche 026-247) : un fichier .mjs, cherché dans
//   scripts/agents/controleur-qualite.mjs · lib/agents/controleurQualite.mjs · lib/agents/controleur-qualite.mjs · scripts/usine/controleur-qualite.mjs
// qui exporte `auditerSite(commande, deps)` et `passer(commandes, deps)` (formes détaillées en tête du témoin :
// scripts/fixtures/026/qualite-sites/temoin/controleur-qualite.mjs). Aucun de ces fichiers n'existe dans le dépôt à ce jour :
// « module absent » est un critère ROUGE (QSI-2 porte la cause), jamais vert.
//   --racine=<d>     juge l'arbre <d> (défaut : le dépôt).
//   --temoin         juge le TÉMOIN minimal des jeux d'essai (doit tout passer : preuve que les critères PEUVENT passer).
//   --auto-controle  vérifie le serveur factice et la mesure du ratio du juge, sans aucun module jugé.
//   --preuve-echecs  (a) l'arbre courant échoue avec QSI-2 « module absent » ; (b) le témoin passe tout ; (c) chaque sabotage du
//                    témoin (≥ 8) échoue avec le critère nommé ; écrit .orchestre/preuves/026-246/echecs-attendus.md.
//   --reel           audit de sites réels : refusé (code 2) tant que le module de production et l'usine n'existent pas.
// Sortie : « ✅ ID détail » / « ❌ ID détail » par critère, une ligne « FAIL ID — … » par rouge, puis « qualite-sites-qa : PASS|FAIL — ids ».
// Code 0 tout vert ; 1 au moins un rouge ; 2 appel invalide. N'écrit que sous .orchestre/travail/qualite-sites-qa/ et .orchestre/preuves/026-246/.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { syncBuiltinESMExports } from 'node:module'
import { R, lireOptions, creerSortie, sansCommentaires, court } from './fixtures/026-acquisition/commun.mjs'
import { demarrerServeur, COMMANDES, BUDGET_ESSAI } from './fixtures/026/qualite-sites/serveur-factice.mjs'

const JUGE = 'qualite-sites-qa'
const IDS = ['QSI-1', 'QSI-2', 'QSI-3', 'QSI-4', 'QSI-5', 'QSI-6', 'QSI-7', 'QSI-8', 'QSI-9']
const PARTIES = { disponibilite: 'QSI-2', poids: 'QSI-3', accessibilite: 'QSI-4', liens: 'QSI-5', mentions: 'QSI-6', formulaire: 'QSI-7', visuel: 'QSI-8', decision: 'QSI-9' }
const CANDIDATS = ['scripts/agents/controleur-qualite.mjs', 'lib/agents/controleurQualite.mjs', 'lib/agents/controleur-qualite.mjs', 'scripts/usine/controleur-qualite.mjs']
const FIXTURES = path.join(R, 'scripts', 'fixtures', '026', 'qualite-sites')
const TEMOIN = path.join(FIXTURES, 'temoin', 'controleur-qualite.mjs')
const TRAVAIL = path.join(R, '.orchestre', 'travail', JUGE)
const PREUVES = path.join(R, '.orchestre', 'preuves', '026-246')
const MOI = path.join(R, 'scripts', 'qualite-sites-qa.mjs')

const refuser = (m, code = 2) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(code) }
const o = lireOptions(process.argv.slice(2), { connues: ['partie'], drapeauxConnus: ['temoin', 'preuve-echecs', 'reel'] })
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (o.drapeaux.has('reel')) refuser('--reel : aucun site réel n\'est audité tant que le module de production (026-247) et l\'usine n\'existent pas')
if (o.drapeaux.has('temoin') && o.valeurs.racine) refuser('--temoin et --racine s\'excluent')
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
let SELECTION = [...IDS]
if (o.valeurs.partie !== undefined) {
  const noms = o.valeurs.partie.split(',').map((x) => x.trim()).filter(Boolean)
  const mauvais = noms.filter((n) => !PARTIES[n])
  if (!noms.length || mauvais.length) refuser(`--partie inconnue : ${mauvais.join(', ') || '(vide)'} — attendu : ${Object.keys(PARTIES).join(', ')}`)
  SELECTION = ['QSI-1', ...noms.map((n) => PARTIES[n])]
}

// ── le ratio WCAG du juge (indépendant du module jugé) ────────────────────────────────────────────────────────────────
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const lum = (rgb) => { const f = (c) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]) }
const ratioAttendu = (a, b) => { const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const proche = (a, b, e = 0.011) => typeof a === 'number' && Math.abs(a - b) <= e

// ── petit client du juge (lecture seule, sert à contrôler le serveur) ────────────────────────────────────────────────────
function lireBrut(url, methode = 'GET') {
  return new Promise((ok, ko) => {
    const req = http.request(url, { method: methode }, (rep) => {
      const m = []
      rep.on('data', (x) => m.push(x))
      rep.on('end', () => ok({ code: rep.statusCode, entetes: rep.headers, corps: Buffer.concat(m) }))
    })
    req.on('error', ko)
    req.end()
  })
}

// ── --auto-controle : le serveur factice et la mesure du juge, sans module jugé ─────────────────────────────────────────────
async function autoControle() {
  const e = []
  const srv = await demarrerServeur()
  try {
    const U = (slug, p = '/') => `http://127.0.0.1:${srv.port}/s/${slug}${p}`
    const sain = await lireBrut(U('aubier'))
    if (sain.code !== 200 || sain.entetes['x-simule-tls'] !== 'valide' || !sain.corps.toString().includes('id="mentions-legales"')) e.push('le site sain n\'est pas sain (200, tls valide, mentions)')
    if (srv.octetsAccueil('aubier') !== sain.corps.length) e.push('le serveur ne connaît pas le nombre exact d\'octets envoyés')
    srv.regler('vallon', ['http500']); if ((await lireBrut(U('vallon'))).code !== 500) e.push('http500 ne rend pas 500')
    srv.regler('vallon', ['lourd']); const l = await lireBrut(U('vallon'))
    if (l.corps.length <= BUDGET_ESSAI || l.entetes['x-poids-annonce'] !== '1200') e.push('lourd : poids sous le budget ou en-tête d\'estimation non trompeur')
    srv.regler('vallon', ['certificat_expire']); if ((await lireBrut(U('vallon'))).entetes['x-simule-tls'] !== 'expire') e.push('certificat_expire non annoncé')
    srv.regler('vallon', ['sans_mentions']); if ((await lireBrut(U('vallon'))).corps.toString().includes('mentions-legales"')) e.push('sans_mentions garde la section')
    srv.regler('vallon', ['form_sans_action']); if (/<form\s[^>]*action=/.test((await lireBrut(U('vallon'))).corps.toString())) e.push('form_sans_action garde l\'action')
    srv.regler('vallon', ['lien_mort']); if ((await lireBrut(U('vallon', '/services'))).code !== 404) e.push('lien_mort : /services ne rend pas 404')
    if ((await lireBrut(U('vallon', '/boucle-a'))).code !== 302) e.push('la boucle de redirections n\'existe pas')
    const avant = srv.ecritures().length
    await new Promise((ok) => { const r = http.request(U('vallon', '/contact/envoyer'), { method: 'POST' }, (x) => { x.resume(); x.on('end', ok) }); r.end() })
    if (srv.ecritures().length !== avant + 1) e.push('le journal du serveur ne voit pas une écriture (POST)')
    try { srv.resoudre('https://hote-reel.example.com/') ; e.push('resoudre accepte un hôte hors .exemple.invalid') } catch { /* attendu */ }
    if (!proche(ratioAttendu('#777777', '#ffffff'), 4.48) || !proche(ratioAttendu('#767676', '#ffffff'), 4.54) || !proche(ratioAttendu('#000000', '#ffffff'), 21, 0.001)) e.push('le ratio WCAG du juge est faux')
    for (const c of COMMANDES) if (/@|\.(fr|com|net)\b/.test(JSON.stringify(c)) && !/invalid/.test(c.url_en_ligne ?? 'invalid')) e.push(`${c.id} : donnée non fictive`)
  } finally { await srv.fermer() }
  console.log(`${JUGE} --auto-controle : ${e.length ? `FAIL — ${e.join(' ; ')}` : 'PASS — serveur factice (pannes, octets, journal des écritures), ratio WCAG, hôtes fictifs'}`)
  return e.length ? 1 : 0
}

// ── espions : écritures de fichiers et console pendant l'import et les audits ───────────────────────────────────────────────
const ECRITURES_FS = []
const SAUVEES = {}
const NOMS_FS = ['writeFileSync', 'appendFileSync', 'writeFile', 'appendFile', 'mkdirSync', 'mkdir', 'rmSync', 'rm', 'unlinkSync', 'unlink', 'renameSync', 'rename', 'createWriteStream', 'copyFileSync', 'truncateSync']
const NOMS_FSP = ['writeFile', 'appendFile', 'mkdir', 'rm', 'unlink', 'rename', 'copyFile']
function armerEspionFs() {
  for (const n of NOMS_FS) { SAUVEES[n] = fs[n]; fs[n] = (...a) => { ECRITURES_FS.push(`${n}(${String(a[0])})`); throw new Error('écriture interdite pendant l\'audit') } }
  for (const n of NOMS_FSP) { SAUVEES['p:' + n] = fs.promises[n]; fs.promises[n] = async (...a) => { ECRITURES_FS.push(`promises.${n}(${String(a[0])})`); throw new Error('écriture interdite pendant l\'audit') } }
  syncBuiltinESMExports()
}
function desarmerEspionFs() {
  for (const n of NOMS_FS) fs[n] = SAUVEES[n]
  for (const n of NOMS_FSP) fs.promises[n] = SAUVEES['p:' + n]
  syncBuiltinESMExports()
}

// ── la lecture du source : aucune écriture vers le site audité, aucune soumission ──────────────────────────────────────
function ecrituresDansSource(src) {
  const nu = sansCommentaires(src)
  const defauts = []
  for (const m of nu.matchAll(/['"`](POST|PUT|DELETE|PATCH)['"`]/gi)) defauts.push(`méthode d'écriture ${m[0]}`)
  for (const m of nu.matchAll(/\.(post|put|delete|patch)\s*\(/g)) defauts.push(`appel .${m[1]}(`)
  for (const m of nu.matchAll(/\b(basic-ftp|sftp|ssh2|simple-git|isomorphic-git)\b/g)) defauts.push(`client ${m[1]}`)
  if (/['"`]ftp['"`]|\bftp\./i.test(nu)) defauts.push('client FTP')
  if (/\bgit\s+(push|commit|add|apply)\b/.test(nu)) defauts.push('commande git d\'écriture')
  for (const m of nu.matchAll(/\bmethod\s*:\s*(['"`])(?!GET\1|HEAD\1)[^'"`]*\1/g)) defauts.push(`method: ${m[0]}`)
  if (/\.submit\s*\(|requestSubmit|\bFormData\b/.test(nu)) defauts.push('soumission de formulaire (submit / FormData)')
  return [...new Set(defauts)]
}

// ── le jugement d'un module ───────────────────────────────────────────────────────────────────────────────────────────
/** @returns {Promise<Map<string,{echecs:string[], ok:string}>>} un verdict par critère sélectionné */
async function jugerModule(fichier) {
  const verdicts = new Map()
  const noter = (id, echecs, ok) => { if (SELECTION.includes(id)) verdicts.set(id, { echecs, ok }) }
  const src = fs.readFileSync(fichier, 'utf8')
  const srv = await demarrerServeur()
  const consoleVue = []
  const sauveConsole = { log: console.log, error: console.error, warn: console.warn, info: console.info }
  let mod = null
  const echecsImport = []
  try {
    for (const k of Object.keys(sauveConsole)) console[k] = (...a) => { consoleVue.push(a.join(' ')) }
    armerEspionFs()
    try { mod = await import(`${pathToFileURL(fichier).href}?v=${Date.now()}`) } catch (e) { echecsImport.push(`import impossible : ${court(e.message, 120)}`) }
    desarmerEspionFs()
    for (const k of Object.keys(sauveConsole)) console[k] = sauveConsole[k]
    const importFs = ECRITURES_FS.length
    const importConsole = consoleVue.length

    if (!mod || typeof mod.auditerSite !== 'function' || typeof mod.passer !== 'function') {
      const raison = echecsImport[0] ?? 'auditerSite et passer doivent être exportés (fonctions)'
      for (const id of SELECTION) noter(id, [id === 'QSI-1' ? raison : `non jugé : ${raison}`], '')
      return verdicts
    }

    const cmd = (slug) => COMMANDES.find((c) => c.slug === slug)
    const remise = () => { for (const c of COMMANDES) srv.regler(c.slug, []) }
    const depsBase = (extra = {}) => ({ resoudre: srv.resoudre, intervalleMs: 60, delaiMs: 400, ...extra })
    const types = (a) => (a?.pannes ?? []).map((p) => p.type)
    const pathDe = (u) => { try { return new URL(u).pathname } catch { return String(u) } }
    /** Un audit chronométré par le journal du serveur : { res, req (requêtes reçues pendant l'audit), erreur }. */
    async function jouer(slug, pannes = [], extra = {}) {
      remise(); srv.regler(slug, pannes)
      const n0 = srv.requetes.length
      armerEspionFs()
      let res = null, erreur = null
      try { res = await mod.auditerSite(cmd(slug), depsBase(extra)) } catch (e) { erreur = court(e.message, 120) }
      desarmerEspionFs()
      return { res, erreur, req: srv.requetes.slice(n0) }
    }
    const casse = (nom, j) => (j.erreur ? `${nom} : exception ${j.erreur}` : !j.res ? `${nom} : aucun résultat` : null)

    // ── QSI-2 Disponibilité ─────────────────────────────────────────────────────────────────────────────────────────
    {
      const e = []
      const sain = await jouer('aubier')
      if (casse('site sain', sain)) e.push(casse('site sain', sain))
      else {
        const d = sain.res.disponibilite ?? {}
        if (sain.res.statut !== 'audite') e.push(`site sain : statut ${sain.res.statut} au lieu de audite`)
        if (d.code !== 200) e.push(`site sain : code ${d.code} au lieu de 200 rendu`)
        if (d.protocole !== 'https' || d.certificat !== 'valide') e.push(`site sain : protocole ${d.protocole}/${d.certificat} au lieu de https/valide`)
        if (types(sain.res).length) e.push(`site sain : fausses pannes ${types(sain.res).join(', ')}`)
      }
      const p500 = await jouer('vallon', ['http500'])
      if (casse('http 500', p500)) e.push(casse('http 500', p500))
      else {
        if (p500.res.disponibilite?.code !== 500) e.push(`HTTP 500 rendu mais code rapporté ${p500.res.disponibilite?.code}`)
        if (!types(p500.res).includes('indisponible')) e.push('HTTP 500 sans panne « indisponible »')
      }
      const cert = await jouer('vallon', ['certificat_expire'])
      if (casse('certificat expiré', cert)) e.push(casse('certificat expiré', cert))
      else {
        if (cert.res.disponibilite?.certificat !== 'expire') e.push(`certificat expiré rendu mais rapporté « ${cert.res.disponibilite?.certificat} »`)
        if (!types(cert.res).includes('certificat_invalide')) e.push('certificat expiré sans panne « certificat_invalide »')
      }
      const nu = await jouer('vallon', ['http_seulement'])
      if (casse('HTTP sans TLS', nu)) e.push(casse('HTTP sans TLS', nu))
      else {
        if (nu.res.disponibilite?.protocole !== 'http') e.push(`site rendu sans TLS (URL déclarée https) mais protocole rapporté « ${nu.res.disponibilite?.protocole} » — deviné au lieu de mesuré`)
        if (!types(nu.res).includes('protocole_non_securise')) e.push('site en HTTP sans panne « protocole_non_securise »')
      }
      const clair = await jouer('clair')
      if (casse('URL en http://', clair)) e.push(casse('URL en http://', clair))
      else if (!types(clair.res).includes('protocole_non_securise')) e.push('URL déclarée en http:// sans panne « protocole_non_securise »')
      const ret = await jouer('ancien')
      if (casse('site programmé au retrait', ret)) e.push(casse('site programmé au retrait', ret))
      else {
        if (ret.res.statut !== 'exclu_retrait') e.push(`site programmé au retrait : statut ${ret.res.statut} au lieu de exclu_retrait`)
        if (ret.req.length) e.push(`site programmé au retrait audité : ${ret.req.length} requête(s) reçue(s) par le serveur`)
        if (types(ret.res).length) e.push('site programmé au retrait : des pannes rapportées')
      }
      const inach = await jouer('sansurl')
      if (casse('livraison inachevée', inach)) e.push(casse('livraison inachevée', inach))
      else {
        if (inach.res.statut !== 'livraison_inachevee') e.push(`sans URL en ligne : statut ${inach.res.statut} au lieu de livraison_inachevee`)
        if (types(inach.res).length) e.push(`sans URL en ligne : traité comme une panne (${types(inach.res).join(', ')})`)
        if (inach.req.length) e.push('sans URL en ligne : des requêtes ont été émises')
      }
      if (!verdicts.has('QSI-2')) noter('QSI-2', e, 'code, protocole et certificat sont ceux rendus (200/500, https valide/expiré, http), retrait exclu sans requête, sans URL = livraison_inachevee')
    }

    // ── QSI-3 Poids ─────────────────────────────────────────────────────────────────────────────────────────────────
    {
      const e = []
      const sain = await jouer('aubier')
      if (casse('page saine', sain)) e.push(casse('page saine', sain))
      else {
        const octets = srv.octetsAccueil('aubier')
        if (sain.res.poids?.octets !== octets) e.push(`page saine : ${sain.res.poids?.octets} octets rapportés pour ${octets} envoyés (l'en-tête d'estimation annonce 99999999)`)
        if (sain.res.poids?.excessif || types(sain.res).includes('poids_excessif')) e.push('page saine signalée en poids excessif')
      }
      const lourd = await jouer('vallon', ['lourd'])
      if (casse('page lourde', lourd)) e.push(casse('page lourde', lourd))
      else {
        const octets = srv.octetsAccueil('vallon')
        if (lourd.res.poids?.octets !== octets) e.push(`page lourde : ${lourd.res.poids?.octets} octets rapportés pour ${octets} réellement reçus (l'en-tête annonce 1200)`)
        const p = (lourd.res.pannes ?? []).find((x) => x.type === 'poids_excessif')
        if (!p) e.push(`page lourde (${octets} > ${BUDGET_ESSAI}) sans panne « poids_excessif »`)
        else if (!String(p.detail).includes(String(octets))) e.push(`poids_excessif sans le nombre exact d'octets (${octets}) dans le détail`)
      }
      noter('QSI-3', e, 'octets = ceux de la réponse complète (pas l\'en-tête), budget respecté sur la page saine, poids_excessif avec le nombre exact')
    }

    // ── QSI-4 Accessibilité ─────────────────────────────────────────────────────────────────────────────────────────
    {
      const e = []
      const sain = await jouer('aubier')
      if (casse('page saine', sain)) e.push(casse('page saine', sain))
      else {
        const a = sain.res.accessibilite ?? {}
        if ((a.contrastes ?? []).length) e.push(`page saine : faux contrastes ${JSON.stringify(a.contrastes).slice(0, 120)} (#767676 sur blanc = 4,54 passe ; #777777 en 24 px = grand texte, seuil 3)`)
        if (!(a.evalues >= 6)) e.push(`page saine : ${a.evalues} texte(s) évalué(s) (≥ 6 attendus) — le contraste n'est pas calculé sur les textes rendus`)
        if (a.alt_manquants !== 0) e.push(`page saine : ${a.alt_manquants} alt manquant(s) au lieu de 0`)
      }
      const mal = await jouer('vallon', ['contraste', 'sans_alt'])
      if (casse('page à contrastes faibles', mal)) e.push(casse('page à contrastes faibles', mal))
      else {
        const attendus = [ratioAttendu('#cfd8dc', '#eceff1'), ratioAttendu('#777777', '#ffffff'), ratioAttendu('#2a4a5b', '#1b3a4b')].sort((x, y) => x - y)
        const reels = (mal.res.accessibilite?.contrastes ?? []).map((c) => c.ratio).sort((x, y) => x - y)
        if (reels.length !== 3) e.push(`3 textes sous le seuil AA attendus (pâle sur pâle, #777 sur blanc 4,48, texte hérité sur carte), ${reels.length} rapporté(s)`)
        else attendus.forEach((v, i) => { if (!proche(reels[i], v)) e.push(`ratio rapporté ${reels[i]} au lieu du ratio WCAG réel ${v.toFixed(2)}`) })
        if (!types(mal.res).includes('contraste_insuffisant')) e.push('contraste faible sans panne « contraste_insuffisant »')
        const sans = (mal.res.accessibilite?.contrastes ?? []).find((c) => !c.element)
        if (sans) e.push('un contraste insuffisant sans l\'élément concerné')
        if (mal.res.accessibilite?.alt_manquants !== 2) e.push(`${mal.res.accessibilite?.alt_manquants} alt manquant(s) comptés pour 2 images sans alt`)
        if (!types(mal.res).includes('alt_manquant')) e.push('images sans alt sans panne « alt_manquant »')
      }
      noter('QSI-4', e, 'ratio WCAG recalculé sur les couleurs rendues (héritage compris, limite 4,5 / 3 exacte), élément et ratio rapportés, alt manquants comptés')
    }

    // ── QSI-5 Liens morts ───────────────────────────────────────────────────────────────────────────────────────────
    {
      const e = []
      if (!(typeof mod.INTERVALLE_MS === 'number' && mod.INTERVALLE_MS >= 1000)) e.push('INTERVALLE_MS (1 requête par seconde, comme lecteurSite.ts) non exporté ou inférieur à 1000')
      const sain = await jouer('aubier')
      if (casse('site sain', sain)) e.push(casse('site sain', sain))
      else {
        if ((sain.res.liens?.morts ?? []).length) e.push(`site sain : faux liens morts ${JSON.stringify(sain.res.liens.morts).slice(0, 120)}`)
        const v = (sain.res.liens?.verifies ?? []).map((x) => `${pathDe(x.url)}=${x.code}`)
        for (const p of ['/realisations=200', '/services=200', '/contact=200']) if (!v.includes(p)) e.push(`site sain : lien ${p} non suivi jusqu'à son code`)
      }
      const j = await jouer('vallon', ['lien_mort', 'lien_redirige', 'lien_boucle', 'lien_lent', 'lien_500'])
      if (casse('site à liens cassés', j)) e.push(casse('site à liens cassés', j))
      else {
        const morts = j.res.liens?.morts ?? []
        const attendu = { '/services': (m) => m.code === 404, '/boucle-a': (m) => /boucle/.test(m.raison ?? ''), '/lent': (m) => /delai/.test(m.raison ?? ''), '/casse500': (m) => m.code === 500 }
        for (const [p, ok] of Object.entries(attendu)) {
          const m = morts.find((x) => pathDe(x.url) === p)
          if (!m) e.push(`lien mort ${p} non signalé (compté vivant)`)
          else if (!ok(m)) e.push(`lien ${p} signalé avec un mauvais code ou une mauvaise raison (${m.code}/${m.raison})`)
          else if (!/^https:\/\/vallon\.exemple\.invalid\//.test(m.url)) e.push(`lien ${p} : URL non exacte (${m.url})`)
        }
        for (const m of morts) if (!(pathDe(m.url) in attendu)) e.push(`faux lien mort ${m.url} (${m.raison}) — une redirection suivie une fois vers une page 200 est vivante`)
        if (!types(j.res).includes('lien_mort')) e.push('liens morts sans panne « lien_mort »')
        const v = (j.res.liens?.verifies ?? []).map((x) => pathDe(x.url))
        if (!v.includes('/realisations')) e.push('le lien redirigé /realisations n\'est pas suivi')
        if (j.req.some((r) => r.chemin.startsWith('/prive/'))) e.push('robots.txt ignoré : /prive/archives (Disallow) a été demandé')
        else if (!(j.res.liens?.ignores_robots ?? []).some((u) => pathDe(u) === '/prive/archives')) e.push('/prive/archives écarté mais non listé dans liens.ignores_robots')
        if (!j.req.some((r) => r.chemin === '/robots.txt')) e.push('robots.txt jamais lu')
        if (JSON.stringify(j.res.liens ?? {}).includes('externe.exemple.invalid')) e.push('un lien externe a été suivi ou signalé (seuls les liens internes sont vérifiés)')
        const ts = j.req.filter((r) => r.slug === 'vallon').map((r) => r.t).sort((a, b) => a - b)
        // Tolérance à la charge de la machine (un paquet peut arriver groupé) : au plus 15 % des écarts sous la moitié de l'intervalle.
        const ecarts = ts.slice(1).map((t, i) => t - ts[i])
        const trop = ecarts.filter((x) => x < 60 * 0.5)
        if (ecarts.length < 5) e.push(`${ecarts.length + 1} requête(s) seulement : la cadence n'est pas mesurable`)
        else if (trop.length > Math.floor(ecarts.length * 0.15)) e.push(`cadence non tenue : ${trop.length} écart(s) sur ${ecarts.length} sous 30 ms (plus petit : ${Math.min(...ecarts).toFixed(0)} ms) pour un intervalle demandé de 60 ms`)
      }
      noter('QSI-5', e, 'chaque lien interne suivi jusqu\'à son code (404, 500, délai, boucle ; redirection simple vivante), robots.txt et cadence respectés, externes ignorés')
    }

    // ── QSI-6 Mentions légales ──────────────────────────────────────────────────────────────────────────────────────
    {
      const e = []
      const sain = await jouer('aubier')
      if (casse('page saine', sain)) e.push(casse('page saine', sain))
      else if ((sain.res.mentions?.absentes ?? []).length || types(sain.res).includes('mentions_absentes')) e.push(`page saine : mentions « absentes » ${JSON.stringify(sain.res.mentions?.absentes)}`)
      const toutes = ['nom', 'siren', 'adresse', 'forme_juridique']
      const sans = await jouer('vallon', ['sans_mentions'])
      if (casse('sans section', sans)) e.push(casse('sans section', sans))
      else {
        const a = sans.res.mentions?.absentes ?? []
        if (toutes.some((k) => !a.includes(k))) e.push(`sans section mentions légales : absentes ${JSON.stringify(a)} au lieu des quatre (le nom de l'artisan figure pourtant dans l'en-tête de la page)`)
        if (!types(sans.res).includes('mentions_absentes')) e.push('mentions légales absentes sans panne « mentions_absentes »')
      }
      const part = await jouer('vallon', ['mentions_partielles'])
      if (casse('SIREN absent', part)) e.push(casse('SIREN absent', part))
      else if (JSON.stringify(part.res.mentions?.absentes) !== '["siren"]') e.push(`SIREN seul manquant : absentes ${JSON.stringify(part.res.mentions?.absentes)} au lieu de ["siren"]`)
      const adr = await jouer('vallon', ['sans_adresse'])
      if (casse('adresse absente', adr)) e.push(casse('adresse absente', adr))
      else if (JSON.stringify(adr.res.mentions?.absentes) !== '["adresse"]') e.push(`adresse seule manquante : absentes ${JSON.stringify(adr.res.mentions?.absentes)} au lieu de ["adresse"]`)
      const court_ = await jouer('vallon', ['gabarit_court', 'sans_adresse'])
      if (casse('gabarit court', court_)) e.push(casse('gabarit court', court_))
      else {
        if ((court_.res.mentions?.absentes ?? []).length) e.push(`gabarit qui n'attend que nom et siren : absentes ${JSON.stringify(court_.res.mentions.absentes)} — la liste doit être lue dans le HTML rendu, pas supposée`)
        if (types(court_.res).includes('mentions_absentes')) e.push('gabarit court : panne « mentions_absentes » à tort')
      }
      noter('QSI-6', e, 'liste attendue lue dans le HTML rendu, mentions cherchées dans leur section, absentes signalées (toutes, une seule, ou aucune si le gabarit ne les attend pas)')
    }

    // ── QSI-7 Formulaire, contrôle passif ──────────────────────────────────────────────────────────────────────────
    {
      const e = []
      for (const d of ecrituresDansSource(src)) e.push(`source : ${d}`)
      const sain = await jouer('aubier')
      if (casse('formulaire sain', sain)) e.push(casse('formulaire sain', sain))
      else {
        const f = sain.res.formulaire ?? {}
        if (!f.present || !/\/contact\/envoyer$/.test(String(f.action ?? '')) || String(f.methode).toLowerCase() !== 'post') e.push(`formulaire sain mal lu : ${JSON.stringify({ present: f.present, action: f.action, methode: f.methode })}`)
        if (['nom', 'email', 'message'].some((c) => !(f.champs ?? []).includes(c))) e.push(`champs lus ${JSON.stringify(f.champs)} au lieu de nom, email, message`)
        if (f.point_entree?.code !== 200) e.push(`point d'entrée : code ${f.point_entree?.code} rapporté pour 200 rendu`)
        if (types(sain.res).includes('formulaire_casse')) e.push('formulaire sain signalé cassé')
        const surEntree = sain.req.filter((r) => r.chemin === '/contact/envoyer')
        if (!surEntree.length) e.push('le point d\'entrée du formulaire n\'a jamais été interrogé (GET ou HEAD)')
      }
      const sansAction = await jouer('vallon', ['form_sans_action'])
      if (casse('sans action', sansAction)) e.push(casse('sans action', sansAction))
      else if (!(sansAction.res.pannes ?? []).some((p) => p.type === 'formulaire_casse' && /action/.test(p.detail ?? ''))) e.push('formulaire sans attribut action non signalé (formulaire_casse / action)')
      const absent = await jouer('vallon', ['form_absent'])
      if (casse('sans formulaire', absent)) e.push(casse('sans formulaire', absent))
      else if (!types(absent.res).includes('formulaire_casse')) e.push('page sans formulaire non signalée')
      const e500 = await jouer('vallon', ['form_entree_500'])
      if (casse('entrée en 500', e500)) e.push(casse('entrée en 500', e500))
      else if (!types(e500.res).includes('formulaire_casse')) e.push('point d\'entrée en erreur 500 non signalé')
      // Le journal du serveur, sur toute la suite de ce critère : jamais autre chose que GET ou HEAD sur le formulaire.
      const surForm = srv.requetes.filter((r) => /\/contact\/envoyer/.test(r.chemin))
      const mauvaises = surForm.filter((r) => r.methode !== 'GET' && r.methode !== 'HEAD')
      if (mauvaises.length) e.push(`SOUMISSION : ${mauvaises.length} requête(s) ${[...new Set(mauvaises.map((r) => r.methode))].join('/')} reçue(s) sur le point d'entrée du formulaire`)
      noter('QSI-7', e, 'formulaire, champs, action et méthode lus dans le HTML ; point d\'entrée interrogé en GET/HEAD seulement ; aucune soumission reçue par le serveur ; source sans méthode d\'écriture')
    }

    // ── QSI-8 Verdict visuel ────────────────────────────────────────────────────────────────────────────────────────
    {
      const e = []
      const essai = async (nom, entree, attendAppel) => {
        const appels = []
        const j = await jouer('aubier', [], { capture: 'capture-essai.png', moteurVisuel: entree, appelerModele: async (a) => { appels.push(a); return { verdict: 'ok' } } })
        if (casse(nom, j)) { e.push(casse(nom, j)); return }
        if (attendAppel) {
          if (appels.length !== 1) e.push(`${nom} : ${appels.length} appel(s) au modèle, 1 attendu`)
          else if (appels[0].personnelles !== true || appels[0].moteur !== 'codex') e.push(`${nom} : appel sans personnelles:true ou hors Codex ${JSON.stringify({ moteur: appels[0].moteur, personnelles: appels[0].personnelles })}`)
          if (j.res.visuel?.statut === 'non_mesure') e.push(`${nom} : verdict visuel « non_mesure » alors que Codex est autorisé`)
        } else {
          if (appels.length) e.push(`${nom} : un modèle a été appelé (${appels[0].moteur}/${appels[0].modele}) alors que seul Codex est permis pour une donnée personnelle`)
          if (j.res.visuel?.statut !== 'non_mesure') e.push(`${nom} : statut visuel « ${j.res.visuel?.statut} » au lieu de non_mesure`)
        }
      }
      await essai('codex personnelles:true', { moteur: 'codex', modele: 'gpt-6-luna', personnelles: true }, true)
      await essai('moteur gratuit', { moteur: 'freellmapi', modele: 'auto', personnelles: false }, false)
      await essai('modèle :cloud', { moteur: 'codex', modele: 'gpt-oss:120b-cloud', personnelles: true }, false)
      await essai('ollama cloud', { moteur: 'ollama_cloud', modele: 'gemma4:cloud', personnelles: true }, false)
      await essai('codex sans personnelles', { moteur: 'codex', modele: 'gpt-6-luna', personnelles: false }, false)
      await essai('aucun moteur', undefined, false)
      const sans = await jouer('vallon', ['http500'], { capture: undefined })
      if (casse('contrôle automatique sans moteur', sans)) e.push(casse('contrôle automatique sans moteur', sans))
      else {
        if (!types(sans.res).includes('indisponible')) e.push('sans verdict visuel, le contrôle automatique (code HTTP) ne détecte plus la panne')
        if (sans.res.visuel?.statut !== 'non_mesure') e.push(`sans capture, verdict visuel « ${sans.res.visuel?.statut} » au lieu de non_mesure`)
      }
      noter('QSI-8', e, 'appel au modèle seulement via Codex avec personnelles:true ; moteur gratuit, :cloud, absent ou sans capture = non_mesure sans appel ; le contrôle automatique reste valide seul')
    }

    // ── QSI-9 Décision, jamais d'action ─────────────────────────────────────────────────────────────────────────────
    {
      const e = []
      remise(); srv.regler('vallon', ['contraste', 'lien_mort', 'sans_mentions'])
      const store = { decisions: [], async creerDecision(d) { this.decisions.push(d); return { id: `dec-${this.decisions.length}`, cree: true } }, async decisionExiste(cle) { return this.decisions.some((d) => d.cle === cle) } }
      const actions = []
      const espion = (n) => async (...a) => { actions.push(n); return { ok: true, a } }
      let jour = new Date('2026-10-04T08:00:00Z')
      const deps = depsBase({ creerDecision: (d) => store.creerDecision(d), decisionExiste: (c) => store.decisionExiste(c), maintenant: () => jour, corriger: espion('corriger'), publier: espion('publier'), modifierSite: espion('modifierSite'), livreur: { corriger: espion('livreur.corriger') } })
      armerEspionFs()
      let r1 = null, erreur = null
      try { r1 = await mod.passer(COMMANDES, deps) } catch (x) { erreur = court(x.message, 120) }
      if (erreur || !r1) e.push(`passer : ${erreur ?? 'aucun résultat'}`)
      else {
        const attendues = new Set()
        for (const a of r1.audits ?? []) for (const p of a.pannes ?? []) attendues.add(`${a.id}:${p.type}`)
        if (attendues.size < 4) e.push(`l'essai attend au moins 4 pannes distinctes, le module en rapporte ${attendues.size}`)
        if (store.decisions.length !== attendues.size) e.push(`${store.decisions.length} décision(s) créée(s) pour ${attendues.size} panne(s) distincte(s) (une décision par panne)`)
        for (const d of store.decisions) {
          if (d.type !== 'qualite_site') e.push(`décision de type « ${d.type} » au lieu de qualite_site`)
          if (!d.cle || !d.commande_id) e.push('décision sans clé ni commande')
        }
        const cles = store.decisions.map((d) => d.cle)
        if (new Set(cles).size !== cles.length) e.push('deux décisions portent la même clé')
        if (store.decisions.some((d) => ['cmd-0003', 'cmd-0004'].includes(d.commande_id))) e.push('décision pour un site programmé au retrait ou à livraison inachevée')
        if (store.decisions.some((d) => d.commande_id === 'cmd-0001')) e.push('décision pour le site sain')
        const n1 = store.decisions.length
        try { await mod.passer(COMMANDES, deps) } catch (x) { e.push(`2e passage : ${court(x.message, 100)}`) }
        if (store.decisions.length !== n1) e.push(`2e passage sur les mêmes pannes dans la même période : ${store.decisions.length - n1} décision(s) de plus (idempotence rompue)`)
        jour = new Date('2026-11-05T08:00:00Z')
        try { await mod.passer(COMMANDES, deps) } catch (x) { e.push(`passage du mois suivant : ${court(x.message, 100)}`) }
        if (store.decisions.length !== n1 * 2) e.push(`mois suivant : ${store.decisions.length} décision(s) au lieu de ${n1 * 2} (la période doit entrer dans la clé)`)
      }
      desarmerEspionFs()
      if (actions.length) e.push(`correction directe : ${[...new Set(actions)].join(', ')} appelé(s) — le contrôleur propose, il n'agit pas`)
      noter('QSI-9', e, 'une décision qualite_site par panne distincte, aucune pour retrait/inachevé/sain, rien de plus au 2e passage, une nouvelle au mois suivant, aucune action sur le site')
    }

    // ── QSI-1 Contrat (jugé en dernier : il relit tout le journal) ──────────────────────────────────────────────────
    {
      const e = [...echecsImport]
      for (const d of ecrituresDansSource(src)) e.push(`source : ${d}`)
      if (importConsole) e.push(`import avec effet de bord : ${importConsole} sortie(s) console`)
      if (importFs) e.push(`import avec effet de bord : ${importFs} écriture(s) de fichier`)
      const ecr = srv.ecritures()
      if (ecr.length) e.push(`ÉCRITURE vers un site audité : ${[...new Set(ecr.map((r) => `${r.methode} ${r.chemin}`))].join(', ')}`)
      if (ECRITURES_FS.length > importFs) e.push(`écriture de fichier pendant les audits : ${ECRITURES_FS.slice(importFs, importFs + 2).join(', ')}`)
      noter('QSI-1', e, 'import sans effet de bord, source sans méthode d\'écriture ni client FTP/Git, serveur factice : aucune requête hors GET/HEAD sur toute la suite')
    }
  } finally {
    for (const k of Object.keys(sauveConsole)) console[k] = sauveConsole[k]
    try { desarmerEspionFs() } catch { /* déjà rendu */ }
    await srv.fermer()
  }
  return verdicts
}

function candidatsSous(racine) { return CANDIDATS.map((c) => path.join(racine, c)).filter((p) => fs.existsSync(p)) }

// ── le jugement d'une racine, affiché ───────────────────────────────────────────────────────────────────────────────────
async function juger() {
  const temoin = o.drapeaux.has('temoin')
  const nom = `${JUGE}${temoin ? ' --temoin' : ''}`
  const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
  const s = creerSortie(nom, [...SELECTION], `${nom} — ${temoin ? 'témoin (scripts/fixtures/026/qualite-sites/temoin/)' : `racine ${rel(o.racine)}`}`)
  let fichier = null
  if (temoin) fichier = TEMOIN
  else fichier = candidatsSous(o.racine)[0] ?? null
  if (!fichier) {
    const msg = `module absent : aucun de ${CANDIDATS.join(' · ')} n'existe sous ${rel(o.racine)} — le Contrôleur qualité des sites livrés n'est pas écrit`
    for (const id of SELECTION) id === 'QSI-2' || !SELECTION.includes('QSI-2') ? s.echoue(id, msg) : s.echoue(id, 'non jugé : module absent (cause : QSI-2)')
    return s.finir()
  }
  const verdicts = await jugerModule(fichier)
  for (const id of SELECTION) {
    const v = verdicts.get(id)
    if (!v) { s.echoue(id, 'non évalué'); continue }
    s.juger(id, v.echecs, v.ok)
  }
  return s.finir()
}

// ── --preuve-echecs ─────────────────────────────────────────────────────────────────────────────────────────────────────
const SABOTAGES = [
  { id: 'ecriture_tentee_sur_le_site', attendu: 'QSI-1', texte: 'une requête PUT est envoyée au site audité',
    subs: [["  const pannes = []\n  const signaler", "  try { const w = http.request(resoudre(commande.url_en_ligne), { method: 'PUT' }); w.on('error', () => {}); w.end('x') } catch { /* essai */ }\n  const pannes = []\n  const signaler"]] },
  { id: 'module_vide', attendu: 'QSI-1', texte: 'le fichier n\'exporte plus auditerSite ni passer', tout: 'export const rien = 1\n' },
  { id: 'soumission_reelle_du_formulaire', attendu: 'QSI-7', texte: 'le contrôle du formulaire envoie un POST vers son action',
    subs: [["  if (!/^(GET|HEAD)$/.test(methode)) throw new Error(`methode refusee : ${methode}`)\n", ""], ["const e = await lire(new URL(f.action, accueil).href, 'HEAD')", "const e = await lire(new URL(f.action, accueil).href, 'POST')"]] },
  { id: 'site_programme_au_retrait_audite', attendu: 'QSI-2', texte: 'l\'exclusion des sites programmés au retrait est retirée',
    subs: [["  if (commande.statut_site === 'programme_retrait' || commande.retrait_programme_le) return { ...base, statut: 'exclu_retrait' }\n", ""]] },
  { id: 'code_http_devine', attendu: 'QSI-2', texte: 'le code rapporté est toujours 200',
    subs: [["const disponibilite = { code: r.code, protocole, certificat }", "const disponibilite = { code: 200, protocole, certificat }"]] },
  { id: 'protocole_devine_sur_l_url', attendu: 'QSI-2', texte: 'le protocole vient de l\'URL déclarée, pas du rendu',
    subs: [["const protocole = tls === 'aucun' ? 'http' : tls ? 'https' : accueil.protocol.replace(':', '')", "const protocole = accueil.protocol.replace(':', '')"]] },
  { id: 'livraison_inachevee_en_panne', attendu: 'QSI-2', texte: 'un site sans URL en ligne devient une panne',
    subs: [["if (!commande.url_en_ligne) return { ...base, statut: 'livraison_inachevee' }", "if (!commande.url_en_ligne) return { ...base, statut: 'audite', pannes: [{ type: 'indisponible', detail: 'pas d\\'URL' }] }"]] },
  { id: 'poids_sur_fichier_tronque', attendu: 'QSI-3', texte: 'le poids est mesuré sur les 64 premiers Kio seulement',
    subs: [["rep.on('data', (m) => { octets += m.length; morceaux.push(m) })", "rep.on('data', (m) => { if (octets < 65536) { octets += m.length; morceaux.push(m) } })"]] },
  { id: 'poids_lu_dans_l_en_tete', attendu: 'QSI-3', texte: 'le poids est celui d\'un en-tête d\'estimation non vérifié',
    subs: [["const poids = { octets: r.octets, budget, excessif: r.octets > budget }", "const poids = { octets: Number(r.entetes['x-poids-annonce'] ?? r.octets), budget, excessif: Number(r.entetes['x-poids-annonce'] ?? r.octets) > budget }"]] },
  { id: 'contraste_approxime_sans_ratio', attendu: 'QSI-4', texte: 'un écart de luminance remplace le ratio WCAG réel',
    subs: [["if (ratio < seuil) {", "if (Math.abs(luminance(e.couleur) - luminance(e.fond)) < 0.1) {"]] },
  { id: 'alt_manquant_ignore', attendu: 'QSI-4', texte: 'les images sans alt ne sont plus comptées',
    subs: [[".filter((x) => !/\\balt\\s*=/i.test(x[0])).length", ".filter(() => false).length"]] },
  { id: 'lien_mort_compte_vivant', attendu: 'QSI-5', texte: 'seuls les codes ≥ 600 comptent comme morts (404 et 500 passent)',
    subs: [["if (rep.code >= 400) mort = { url: href, code: rep.code, raison: `http_${rep.code}` }", "if (rep.code >= 600) mort = { url: href, code: rep.code, raison: `http_${rep.code}` }"]] },
  { id: 'cadence_ignoree', attendu: 'QSI-5', texte: 'plus aucune attente entre deux requêtes',
    subs: [["    if (attente > 0) await pause(attente)\n", ""]] },
  { id: 'robots_ignore', attendu: 'QSI-5', texte: 'robots.txt n\'est plus appliqué aux liens',
    subs: [["const interdits = rb.code === 200 ? robotsInterdits(rb.corps) : []", "const interdits = []"]] },
  { id: 'mention_absente_non_signalee', attendu: 'QSI-6', texte: 'la liste des mentions absentes est toujours vide',
    subs: [["const absentes = attendues.filter((cle) => !(artisan?.[cle] && texte.includes(String(artisan[cle]).toLowerCase())))", "const absentes = []"]] },
  { id: 'liste_des_mentions_supposee', attendu: 'QSI-6', texte: 'la liste attendue est supposée, plus lue dans le gabarit rendu',
    subs: [["/<meta\\s+name=\"mentions-attendues\"\\s+content=\"([^\"]*)\"/i.exec(html)?.[1] ?? MENTIONS_PAR_DEFAUT.join(',')", "MENTIONS_PAR_DEFAUT.join(',')"]] },
  { id: 'decision_creee_deux_fois', attendu: 'QSI-9', texte: 'le contrôle d\'une décision déjà posée pour la période est retiré',
    subs: [["      if (deps.decisionExiste && await deps.decisionExiste(cle)) { resultat.decisions_ecartees.push(cle); continue }\n", ""]] },
  { id: 'correction_directe_au_lieu_d_une_decision', attendu: 'QSI-9', texte: 'le contrôleur corrige lui-même après avoir créé la décision',
    subs: [["      // FIN-DECISION", "      if (deps.corriger) await deps.corriger(c, p)"]] },
  { id: 'verdict_visuel_a_un_moteur_cloud', attendu: 'QSI-8', texte: 'tout moteur est appelé pour juger la capture (gratuit, :cloud, sans personnelles)',
    subs: [["if (!capture || !e || e.moteur !== 'codex' || e.personnelles !== true || /[:-]cloud$/.test(e.modele ?? '') || typeof deps.appelerModele !== 'function') {", "if (!capture || !e || typeof deps.appelerModele !== 'function') {"]] },
]

function lancerJuge(args) {
  return new Promise((ok) => {
    const t0 = Date.now()
    const p = spawn(process.execPath, [MOI, ...args], { cwd: R, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    p.stdout.on('data', (x) => { out += x })
    p.stderr.on('data', (x) => { out += x })
    p.on('close', (code) => ok({ code, out, ms: Date.now() - t0 }))
  })
}
const lignesFail = (out) => out.split(/\r?\n/).filter((l) => /^FAIL QSI-\d/.test(l))
const idsRouges = (out) => lignesFail(out).map((l) => /^FAIL (QSI-\d)/.exec(l)[1])

async function preuveEchecs() {
  const t0 = Date.now()
  const manques = []
  const md = []
  console.log(`${JUGE} --preuve-echecs : auto-contrôle, arbre courant, témoin, ${SABOTAGES.length} sabotages`)

  // 0. le serveur et la mesure du juge
  const auto = await lancerJuge(['--auto-controle'])
  console.log(auto.out.trim())
  if (auto.code !== 0) { console.log(`${JUGE} --preuve-echecs : FAIL — l'auto-contrôle du décor est rouge, rien d'autre n'est jugé`); return 1 }

  // (a) l'arbre courant
  const courant = await lancerJuge([])
  const aModule = candidatsSous(R).length > 0
  const premierMsg = lignesFail(courant.out).find((l) => l.startsWith('FAIL QSI-2')) ?? ''
  let okA
  let resumeA
  if (!aModule) {
    okA = courant.code === 1 && /module absent/.test(premierMsg) && idsRouges(courant.out).length === 9
    resumeA = okA ? 'module absent : les 9 critères sont rouges, QSI-2 porte la cause' : `attendu : 9 rouges dont QSI-2 « module absent » ; reçu code ${courant.code}, ${idsRouges(courant.out).join(',')}`
  } else {
    okA = courant.code === 0
    resumeA = okA ? 'un module existe dans l\'arbre : jugé directement, tout vert' : `un module existe et le juge le trouve rouge : ${idsRouges(courant.out).join(', ')}`
  }
  console.log(`${okA ? '✅' : '❌'} arbre courant — ${resumeA}`)
  if (!okA) manques.push('arbre courant')

  // (b) le témoin
  const tem = await lancerJuge(['--temoin'])
  const verts = tem.out.split(/\r?\n/).filter((l) => /^✅ QSI-\d/.test(l)).length
  const okB = tem.code === 0 && verts === 9
  console.log(`${okB ? '✅' : '❌'} témoin — code ${tem.code}, ${verts}/9 critères verts`)
  if (!okB) { manques.push('témoin'); console.log(tem.out) }

  // (c) les sabotages : copie du témoin modifiée, jugée comme une racine
  const original = fs.readFileSync(TEMOIN, 'utf8')
  fs.rmSync(TRAVAIL, { recursive: true, force: true })
  const resultats = []
  const preparer = (sab) => {
    const dir = path.join(TRAVAIL, `sab-${sab.id}`)
    const dest = path.join(dir, 'scripts', 'agents', 'controleur-qualite.mjs')
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    let t = original
    const problemes = []
    if (sab.tout !== undefined) t = sab.tout
    else for (const [de, vers] of sab.subs) {
      const n = t.split(de).length - 1
      if (n !== 1) { problemes.push(`le motif à remplacer apparaît ${n} fois (1 attendu) : ${court(de, 70)}`); continue }
      t = t.replace(de, () => vers)
    }
    fs.writeFileSync(dest, t)
    return { dir, problemes }
  }
  const file = [...SABOTAGES]
  const worker = async () => {
    while (file.length) {
      const sab = file.shift()
      const { dir, problemes } = preparer(sab)
      if (problemes.length) { resultats.push({ sab, problemes, code: null, rouges: [], extrait: '' }); continue }
      const r = await lancerJuge([`--racine=${dir}`])
      const rouges = idsRouges(r.out)
      const extrait = lignesFail(r.out).find((l) => l.startsWith(`FAIL ${sab.attendu}`)) ?? ''
      resultats.push({ sab, problemes: [], code: r.code, rouges, extrait, ms: r.ms })
      const ok = r.code === 1 && rouges.includes(sab.attendu)
      console.log(`${ok ? '✅' : '❌'} sabotage ${sab.id} — attendu ${sab.attendu}, rouges : ${rouges.join(', ') || 'aucun'} (code ${r.code})`)
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
  resultats.sort((a, b) => SABOTAGES.indexOf(a.sab) - SABOTAGES.indexOf(b.sab))
  for (const x of resultats) {
    if (x.problemes.length) { manques.push(`${x.sab.id} (non appliqué)`); console.log(`❌ sabotage ${x.sab.id} — ${x.problemes.join(' ; ')}`) }
    else if (!(x.code === 1 && x.rouges.includes(x.sab.attendu))) manques.push(x.sab.id)
  }
  const tues = resultats.filter((x) => !x.problemes.length && x.code === 1 && x.rouges.includes(x.sab.attendu)).length
  const critTues = [...new Set(resultats.filter((x) => x.rouges.includes(x.sab.attendu)).map((x) => x.sab.attendu))]
  const assez = SABOTAGES.length >= 8 && tues === SABOTAGES.length
  if (!assez) manques.push('tous les sabotages ne sont pas tués')

  md.push('# 026-246 — échecs attendus du juge du Contrôleur qualité des sites livrés (`node scripts/qualite-sites-qa.mjs --preuve-echecs`)', '')
  md.push(`Écrit par le juge le ${new Date().toISOString()} (${Math.round((Date.now() - t0) / 1000)} s). Verdict global : **${manques.length ? 'FAIL' : 'PASS'}**.`, '')
  md.push('## Limites assumées (relues avant d\'écrire le juge)', '')
  md.push('- **Le module du Contrôleur qualité n\'existe pas encore** (aucun fichier à `scripts/agents/`, `lib/agents/`, `scripts/usine/` ; sa fabrication est la fiche 026-247). Le juge pose un CONTRAT (`auditerSite`, `passer`) et se prouve sur un TÉMOIN minimal des jeux d\'essai ; les noms de fichiers cherchés et les formes de résultat sont à confirmer le jour de 026-247.')
  md.push('- **Pas de vrai TLS** : le protocole et le certificat « rendus » sont annoncés par un en-tête du serveur factice (`x-simule-tls`), comme le demande la fiche ; la validation réelle d\'un certificat n\'est pas jugée ici.')
  md.push('- **Le verdict visuel** n\'est jugé que par son AIGUILLAGE (Codex et `personnelles: true`, sinon `non_mesure`) avec un modèle factice ; aucune capture réelle, aucun appel de modèle.')
  md.push('- **La cadence** est jugée à 60 ms d\'intervalle injecté (le défaut exporté `INTERVALLE_MS` doit valoir au moins 1000 : vérifié en lecture, pas chronométré à la seconde).')
  md.push('- **`--reel`** : refusé (code 2) tant que 026-247 et l\'usine n\'existent pas. Le déclencheur « mise en ligne » (026-078), la Search Console (026-201) et les tables `ops.*` ne sont pas exercés : l\'indexation n\'a pas de critère QSI.')
  md.push('- Le contraste est calculé sur les couleurs de `<style>` et `style=""` (sélecteurs simples, héritage de la couleur, du fond et de la taille) ; pas de feuille externe, pas d\'image de fond, pas de transparence.', '')
  md.push('## 1. L\'arbre courant', '')
  md.push(`Verdict : ${okA ? '✓' : '✗'} — ${resumeA}`, '', '```', ...lignesFail(courant.out).map((l) => court(l, 260)), '```', '')
  md.push('## 2. Le témoin (`scripts/fixtures/026/qualite-sites/temoin/controleur-qualite.mjs`)', '')
  md.push(`Verdict : ${okB ? '✓' : '✗'} — code ${tem.code}, ${verts}/9 critères verts.`, '', '```', ...tem.out.split(/\r?\n/).filter((l) => /^(✅|❌) QSI-\d|^qualite-sites-qa/.test(l)).map((l) => court(l, 240)), '```', '')
  md.push(`## 3. Les sabotages (${tues}/${SABOTAGES.length} tués, critères exercés : ${critTues.join(', ')})`, '')
  md.push('Chaque sabotage est une copie du témoin dont UN comportement est modifié par remplacement de texte (le juge refuse un motif qui ne s\'applique pas exactement une fois), posée sous `.orchestre/travail/qualite-sites-qa/` et jugée comme une racine.', '')
  md.push('| sabotage | ce qui est cassé | critère attendu | critères rouges | tué |', '| --- | --- | --- | --- | --- |')
  for (const x of resultats) md.push(`| ${x.sab.id} | ${x.sab.texte} | ${x.sab.attendu} | ${x.problemes.length ? 'non appliqué' : x.rouges.join(', ') || 'aucun'} | ${!x.problemes.length && x.code === 1 && x.rouges.includes(x.sab.attendu) ? '✓' : '✗'} |`)
  md.push('', '### Extraits réels (la ligne du critère attendu)', '')
  for (const x of resultats) md.push(`- **${x.sab.id}** → \`${court(x.extrait || x.problemes.join(' ; ') || '(rien)', 300)}\``)
  md.push('')
  fs.mkdirSync(PREUVES, { recursive: true })
  fs.writeFileSync(path.join(PREUVES, 'echecs-attendus.md'), md.join('\n'))
  fs.rmSync(TRAVAIL, { recursive: true, force: true })
  console.log(`${JUGE} --preuve-echecs : ${manques.length ? `FAIL — ${manques.join(' ; ')}` : `PASS — arbre courant rouge (QSI-2 module absent), témoin 9/9, ${tues}/${SABOTAGES.length} sabotages tués par ${critTues.join(', ')}`}`)
  return manques.length ? 1 : 0
}

let code
if (o.autoControle) code = await autoControle()
else if (o.drapeaux.has('preuve-echecs')) code = await preuveEchecs()
else code = await juger()
process.exit(code)
