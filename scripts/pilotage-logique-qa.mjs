// scripts/pilotage-logique-qa.mjs — juge hors ligne de la logique du Pilotage (fiche 026-012, lot a), écrit par Claude Code
// AVANT les modules qu'il juge. L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node --import ./scripts/ts-loader.mjs scripts/pilotage-logique-qa.mjs --partie=decider|envois|agents [--racine=<dossier>] [--temoin]
//
//   --partie=decider  critères DC de 026-014 : lib/pilotage/decisions.ts, appels.ts, liens.ts
//   --partie=envois   critères LE de 026-015 réécrite : lib/pilotage/envois.ts, entonnoir.ts (envois des agents, lecture seule)
//   --partie=agents   critères AC de 026-017 : lib/pilotage/agents.ts, code.ts, scripts/pilotage-code-publier.mjs
//   --partie=lot      n'existe plus (rectification du 24/09) : code 2, renvoi vers --partie=envois
//   --racine=<d>      importe <d>/lib/pilotage/<module>.ts par URL de fichier et lit les sources sous <d> (défaut : le dépôt)
//   --temoin          seulement l'auto-contrôle des jeux d'essai, les critères de non-régression et la preuve du harnais
//                     (définition de 025-01 : la preuve qu'un juge échoue sur une vraie faute vient des fiches de mutations)
//
// Sortie : une ligne par critère (« ✅ DC-3 … » ou « ❌ DC-3 … »), puis « pilotage-logique-qa --partie=<p> : PASS|FAIL — … ».
// Code 0 seulement si tout est vert ; 1 sinon ; 2 si l'appel est invalide. Un module absent fait échouer le premier critère
// (DC-1, LE-1, AC-1) avec son identifiant ; les suivants sont alors « non jugés » (en échec).
// Hors ligne : aucune base, aucun réseau hors 127.0.0.1 (le faux PostgREST d'AC-7, démarré et arrêté ici). Instant figé,
// fuseau du processus forcé à UTC (celui de Vercel et de l'usine) : un module qui lirait l'heure locale au lieu de l'heure de
// Paris échoue ici comme en production. Écriture seulement sous .orchestre/travail/pilotage-logique-qa/.
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import {
  R, LOADER, TRAVAIL, jeu, lireOptions, creerSortie, importerDepuis, importsDe, exportsNommes, sansCommentaires, gelerProfond,
  valeursInterdites, clesProfondes, jourParis, RE_EMAIL, RE_UUID, typecheck, court, lancerAsync, dossierTravail,
  instantaneDossier, comparerInstantanes, lireOuNull,
} from './fixtures/026-pilotage/a/commun.mjs'
import { TEMOINS, blocAttention, ORCHESTRE_ESSAI, CLES_SNAPSHOT } from './fixtures/026-pilotage/a/jeux.mjs'

const JUGE = 'pilotage-logique-qa'
const o = lireOptions(process.argv.slice(2), { connues: ['partie'] })
const partie = o.valeurs.partie
if (partie === 'lot') {
  console.log(`${JUGE} : --partie=lot n'existe plus — partie retirée par la rectification du 24/09 : --partie=envois (envois des agents, fiche 026-015 réécrite)`)
  process.exit(2)
}
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (!['decider', 'envois', 'agents'].includes(partie)) refuser(`--partie=decider|envois|agents attendue (reçu : ${partie ?? 'rien'})`)
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (!process.execArgv.some((a) => /ts-loader/.test(a))) await import(pathToFileURL(LOADER).href) // lancé sans --import : on charge le crochet

const NOM = `${JUGE} --partie=${partie}`
const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const TRAV = path.join(TRAVAIL, JUGE)
const canon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((c) => [c, v[c]])) : v))
const egal = (a, b) => canon(a) === canon(b)
const chaines = (x, out = []) => { if (typeof x === 'string') out.push(x); else if (x && typeof x === 'object') for (const v of Object.values(x)) chaines(v, out); return out }
const fn = (m, nom, fichier) => { if (typeof m?.[nom] !== 'function') throw new Error(`export ${nom} absent de ${fichier} (ou pas une fonction)`); return m[nom] }
const val = (m, nom, fichier) => { if (m?.[nom] === undefined) throw new Error(`export ${nom} absent de ${fichier}`); return m[nom] }
const H = 3_600_000, MIN = 60_000, J = 24 * H
const decaler = (iso, delta) => new Date(Date.parse(iso) + delta).toISOString()

/**
 * Premier critère de chaque partie : les modules existent, s'importent, et n'importent que ce qui est permis.
 * permis(spec, type) → vrai si l'import est permis. Rend les modules importés, ou null (critère en échec).
 */
async function modulesPresents(s, id, fichiers, permis, libellePermis, extra = []) {
  const e = [], mods = {}
  for (const f of fichiers) {
    const abs = path.join(RAC, f)
    const src = lireOuNull(abs)
    if (src === null) { e.push(`${f} absent de ${RAC}`); continue }
    const nus = sansCommentaires(src)
    for (const i of importsDe(src)) {
      if (i.spec === null) e.push(`${f} : ${i.genre} non littéral`)
      else if (!permis(i.spec, i.type)) e.push(`${f} importe « ${i.spec} »${i.type ? ' (type)' : ''} — seuls ${libellePermis}`)
    }
    for (const [re, quoi] of [[/\bsupabaseAdmin\b/, 'supabaseAdmin'], [/\bfetch\s*\(/, 'fetch('], [/['"`]node:/, 'node:'], [/['"`]next\//, 'next/*'], [/\brequire\s*\(/, 'require(']]) if (re.test(nus)) e.push(`${f} cite ${quoi}`)
  }
  for (const x of extra) e.push(x)
  if (!e.length) {
    for (const f of fichiers) {
      try { mods[path.basename(f, '.ts')] = await importerDepuis(RAC, f) } catch (err) { e.push(`${f} ne s'importe pas : ${court(err.message, 200)}`) }
    }
  }
  s.juger(id, e, `${fichiers.join(', ')} présents sous ${rel(RAC)}, importés par ts-loader ; imports limités à ${libellePermis} ; ni supabaseAdmin, ni next/*, ni fetch, ni node:`)
  return e.length ? null : mods
}
const relatifPilotage = (spec) => (/^\.\/[\w./-]+$/.test(spec) && !spec.includes('..')) || /^@\/lib\/pilotage\/[\w-]+(\.ts)?$/.test(spec)

/** Témoin : l'auto-contrôle des jeux d'essai de la partie. */
function temoinJeux(s, id, p) {
  const e = []
  for (const [nom, f] of Object.entries(TEMOINS[p])) { try { for (const x of f()) e.push(`${nom} : ${x}`) } catch (err) { e.push(`${nom} : illisible (${court(err.message, 120)})`) } }
  s.juger(id, e, `jeux d'essai de scripts/fixtures/026-pilotage/a/ conformes (${Object.keys(TEMOINS[p]).join(', ')}) : attendus recalculés indépendamment et égaux à ceux qui sont écrits`)
}
/** Témoin : la dépendance permise lib/direction/fraicheur.ts existe, exporte relTime et euros, et n'importe rien. */
async function temoinFraicheur(s, id) {
  await s.critere(id, async () => {
    const f = 'lib/direction/fraicheur.ts', src = lireOuNull(path.join(RAC, f)), e = []
    if (src === null) return { echecs: [`${f} absent`] }
    if (importsDe(src).length) e.push(`${f} importe désormais quelque chose : les modules du Pilotage ne pourraient plus l'importer purement`)
    const m = await importerDepuis(RAC, f)
    if (typeof m.euros !== 'function' || typeof m.relTime !== 'function') e.push(`${f} n'exporte plus euros et relTime`)
    else if (m.euros(3.2) !== '3,20 €' || m.euros(null) !== '—') e.push(`euros(3.2) = ${JSON.stringify(m.euros(3.2))}, euros(null) = ${JSON.stringify(m.euros(null))}`)
    return { echecs: e, detail: `${f} sans import, exporte euros (euros(3.2) = « 3,20 € », euros(null) = « — ») et relTime : la seule dépendance permise hors de lib/pilotage/ tient` }
  })
}
/** Témoin : le harnais — gel profond effectif, détecteurs d'adresse et de NaN, fuseau UTC, heure de Paris. */
function temoinHarnais(s, id) {
  const e = []
  const g = gelerProfond({ a: [{ b: 1 }] })
  try { g.a[0].b = 2; e.push('gelerProfond : une écriture profonde est passée') } catch { /* attendu */ }
  if (!RE_EMAIL.test('x jean.temoin@exemple.invalid y') || RE_EMAIL.test('Plombier · Lyon')) e.push('RE_EMAIL ne distingue pas une adresse')
  if (valeursInterdites({ a: [1, NaN], b: { c: Infinity }, d: undefined }, { undefinedInterdit: true }).length !== 3) e.push('valeursInterdites ne voit pas NaN, Infinity et undefined')
  if (new Date('2026-10-30T13:30:00Z').getHours() !== 13) e.push('le fuseau du processus n’est pas UTC')
  if (new Date('2026-10-30T13:30:00Z').toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' }).slice(0, 5) !== '14:30') e.push('heure de Paris fausse (14:30 attendu le 30/10 à 13:30 UTC)')
  if (jourParis('2026-10-13T22:30:00Z') !== '2026-10-14' || jourParis('2026-10-13T21:30:00Z') !== '2026-10-13') e.push('jourParis faux autour de minuit UTC')
  s.juger(id, e, 'harnais prouvé : gel profond effectif, adresse et NaN/Infinity/undefined détectés, processus en UTC (13 h 30 UTC reste 13 h en local) et heure de Paris juste (14 h 30), jour de Paris juste autour de minuit UTC')
}

// ═══ --partie=decider (026-014) ═════════════════════════════════════════════════════════════════════════════════════════
async function decider(s) {
  const m = await modulesPresents(s, 'DC-1', ['lib/pilotage/decisions.ts', 'lib/pilotage/appels.ts', 'lib/pilotage/liens.ts'],
    (spec) => relatifPilotage(spec) || spec === '@/lib/direction/fraicheur', '« ./… » de lib/pilotage/ et @/lib/direction/fraicheur')
  if (!m) return s.nonJuges(IDS.decider, 'DC-1 en échec (modules absents, interdits ou illisibles)')
  const D = 'lib/pilotage/decisions.ts', AP = 'lib/pilotage/appels.ts', L = 'lib/pilotage/liens.ts'
  const d = gelerProfond(jeu('decisions.json'))
  const t = new Date(d.maintenant)

  await s.critere('DC-2', () => {
    const carteValide = fn(m.decisions, 'carteValide', D), e = []
    for (const x of d.fautives) {
      const r = carteValide(x)
      if (!(r && r.ok === false && typeof r.raison === 'string' && r.raison.trim())) e.push(`${d.fautes[x.id]} : ${JSON.stringify(r)} au lieu de { ok: false, raison }`)
    }
    for (const x of d.valides) { const r = carteValide(x); if (!(r && r.ok === true)) e.push(`décision valide à ${x.options.length} options refusée : ${JSON.stringify(r)}`) }
    return { echecs: e, detail: `carteValide refuse les 6 fautives, chacune avec sa raison (${d.fautives.map((x) => d.fautes[x.id]).join(', ')}) et accepte les 8 valides, dont celles à 2, 3 et 7 options` }
  })

  await s.critere('DC-3', () => {
    const cartesDecisions = fn(m.decisions, 'cartesDecisions', D), e = []
    const ids = (r) => (r?.cartes ?? []).map((c) => c.id)
    const nbInvalides = (r) => (Array.isArray(r?.invalides) ? r.invalides.length : r?.invalides)
    const r1 = cartesDecisions(d.valides, undefined, t)
    if (ids(r1).join() !== d.ordre_attendu.slice(0, 5).join()) e.push(`sans épingle : ordre ${ids(r1).map((x) => x.slice(7, 8)).join('')} au lieu de ${d.ordre_attendu.slice(0, 5).map((x) => x.slice(7, 8)).join('')} (montant, échéance, création)`)
    if (r1?.autres !== 3) e.push(`sans épingle : autres = ${r1?.autres}, 3 attendu`)
    if (nbInvalides(r1) !== 0) e.push(`sans fautive : invalides = ${JSON.stringify(r1?.invalides)}, 0 attendu`)
    const melange = [d.valides[0], d.fautives[0], d.valides[1], d.fautives[1], d.fautives[2], ...d.valides.slice(2, 5), d.fautives[3], ...d.valides.slice(5), d.fautives[4], d.fautives[5]]
    const r2 = cartesDecisions(melange, undefined, t)
    if (ids(r2).join() !== d.ordre_attendu.slice(0, 5).join()) e.push('avec les 6 fautives mêlées : les cartes changent (une fautive passe ou l’ordre bouge)')
    if (nbInvalides(r2) !== 6 || r2?.autres !== 3) e.push(`avec les 6 fautives : invalides = ${JSON.stringify(r2?.invalides)} et autres = ${r2?.autres}, 6 et 3 attendus`)
    const r3 = cartesDecisions(d.valides, d.epinglee, t)
    const attendu3 = [d.epinglee, ...d.ordre_attendu.slice(0, 4)]
    if (ids(r3).join() !== attendu3.join()) e.push(`épinglée = la 7e : ordre ${ids(r3).map((x) => x.slice(7, 8)).join('')} au lieu de ${attendu3.map((x) => x.slice(7, 8)).join('')}`)
    if (r3?.cartes?.[0]?.epinglee !== true || r3?.cartes?.slice(1).some((c) => c.epinglee !== false)) e.push('épinglée : seule la première carte doit porter epinglee: true (les autres false)')
    if (r3?.autres !== 3) e.push(`épinglée : autres = ${r3?.autres}, 3 attendu`)
    for (const c of r1?.cartes ?? []) {
      const src = d.valides.find((x) => x.id === c.id)
      for (const k of ['id', 'question', 'contexte', 'montant', 'options', 'defaut', 'libelleDefaut', 'portee', 'echeance', 'epinglee']) if (!(k in c)) e.push(`carte ${c.id.slice(7, 8)} sans ${k}`)
      if (c.defaut?.cle !== src.option_defaut || c.defaut?.libelle !== src.options.find((x) => x.cle === src.option_defaut).libelle) e.push(`carte ${c.id.slice(7, 8)} : defaut ${JSON.stringify(c.defaut)}`)
    }
    return { echecs: e, detail: `8 valides → 5 cartes dans l'ordre montant/échéance/création, autres = 3, invalides = 0 ; 6 fautives mêlées → mêmes cartes, invalides = 6 ; la 7e épinglée passe en tête (epinglee: true), 5 cartes, autres = 3` }
  })

  await s.critere('DC-4', () => {
    const libelleDefaut = fn(m.decisions, 'libelleDefaut', D), e = []
    const A = d.valides.find((x) => x.id === d.roles.deux_options)
    const lib = A.options.find((x) => x.cle === A.option_defaut).libelle
    const cas = [
      [decaler(d.maintenant, 24 * H), `Par défaut dans 24 h : ${lib}`],
      [decaler(d.maintenant, 45 * MIN), `Par défaut dans 45 min : ${lib}`],
      [decaler(d.maintenant, -1 * MIN), `Par défaut appliqué sous peu : ${lib}`],
      [null, 'Pas d’échéance : rien ne se fait sans vous'],
      [decaler(d.maintenant, 3.5 * H), `Par défaut dans 3 h : ${lib}`],
    ]
    for (const [ech, attendu] of cas) {
      const r = libelleDefaut(gelerProfond({ ...A, echeance: ech }), t)
      if (r !== attendu) e.push(`échéance ${ech === null ? 'nulle' : `${(Date.parse(ech) - t.getTime()) / MIN} min`} : ${JSON.stringify(r)} au lieu de ${JSON.stringify(attendu)}`)
    }
    return { echecs: e, detail: `libelleDefaut exact : « Par défaut dans 24 h : ${lib} », « … 45 min … », « Par défaut appliqué sous peu : … », « Pas d’échéance : rien ne se fait sans vous », et 3 h 30 → « 3 h » (heures arrondies à l'inférieur)` }
  })

  await s.critere('DC-5', () => {
    const porteeExigee = fn(m.decisions, 'porteeExigee', D), choixValide = fn(m.decisions, 'choixValide', D), e = []
    const A = d.valides.find((x) => x.id === d.roles.deux_options)
    const cas = [[{ portee: 'aucune', montant_cents: 100 }, 'argent'], [{ portee: 'securite', montant_cents: 0 }, 'securite'], [{ portee: 'aucune', montant_cents: 0 }, null], [{ portee: 'aucune', montant_cents: null }, null], [{ portee: 'artisan', montant_cents: 5000 }, 'artisan']]
    for (const [x, attendu] of cas) { const r = porteeExigee(gelerProfond({ ...A, ...x })); if (r !== attendu) e.push(`porteeExigee(${JSON.stringify(x)}) = ${JSON.stringify(r)}, ${JSON.stringify(attendu)} attendu`) }
    const cle = A.options[0].cle, libelle = A.options[0].libelle
    if (choixValide(A, cle) !== true) e.push(`choixValide(clé « ${cle} ») ≠ true`)
    if (choixValide(A, libelle) !== false) e.push(`choixValide(libellé « ${libelle} ») ≠ false`)
    if (choixValide(A, '') !== false) e.push('choixValide(\'\') ≠ false')
    return { echecs: e, detail: 'porteeExigee : aucune + 100 → argent, securite + 0 → securite, aucune + 0 → null, aucune + nul → null, artisan → artisan ; choixValide vrai pour une clé, faux pour un libellé et pour « »' }
  })

  await s.critere('DC-6', () => {
    const lienTel = fn(m.appels, 'lienTel', AP), e = []
    for (const x of ['06 12 34 56 78', '+33 6 12 34 56 78', '0033612345678', '06.12.34.56.78']) { const r = lienTel(x); if (r !== 'tel:+33612345678') e.push(`lienTel(« ${x} ») = ${JSON.stringify(r)}`) }
    for (const x of ['abc', '12', 'javascript:alert(1)']) { const r = lienTel(x); if (r !== null) e.push(`lienTel(« ${x} ») = ${JSON.stringify(r)}, null attendu`) }
    return { echecs: e, detail: 'lienTel : quatre graphies de 06 12 34 56 78 → tel:+33612345678 ; « abc », « 12 », javascript:alert(1) → null' }
  })

  const cm = gelerProfond(jeu('commandes.json')), ap = gelerProfond(jeu('appels.json'))
  await s.critere('DC-7', () => {
    const depuisCommandes = fn(m.appels, 'appelsDepuisCommandes', AP), depuisReponses = fn(m.appels, 'appelsDepuisReponses', AP), fusionner = fn(m.appels, 'fusionnerAppels', AP), e = []
    const tc = new Date(cm.maintenant)
    const cartes = depuisCommandes(cm.commandes, tc)
    const idsC = (cartes ?? []).map((c) => c.id)
    if (idsC.includes(cm.roles.complete)) e.push('la commande complète sort en carte')
    if (idsC.includes(cm.roles.brouillon)) e.push('le brouillon sort en carte')
    const inc = cartes?.find((c) => c.id === cm.roles.incomplete), sansTel = cartes?.find((c) => c.id === cm.roles.sans_telephone)
    const cmdInc = cm.commandes.find((x) => x.id === cm.roles.incomplete)
    if (!inc) e.push('la commande payée incomplète ne sort pas')
    else {
      const l = (inc.lignes ?? []).find((x) => typeof x === 'string' && x.startsWith('Manque : '))
      if (!l) e.push(`carte incomplète sans ligne « Manque : » (${JSON.stringify(inc.lignes)})`)
      else {
        if (!l.startsWith(`Manque : ${cmdInc.manques[0].slice(0, 40)}`)) e.push(`« Manque : » ne porte pas le premier manque (${court(l, 100)})`)
        if (!/\(\+1\)\s*$/.test(l)) e.push(`« Manque : » sans « (+1) » pour le second manque (${court(l, 140)})`)
        if (l.replace(/^Manque : /, '').replace(/\s*\(\+\d+\)\s*$/, '').length > 81) e.push('le premier manque n’est pas coupé à 80 signes')
      }
      if (inc.tel !== 'tel:+33299123456') e.push(`carte incomplète : tel ${JSON.stringify(inc.tel)}`)
      if (inc.source !== 'Commande de site') e.push(`carte incomplète : source ${JSON.stringify(inc.source)}`)
      if ('sourceAppel' in inc && inc.sourceAppel !== undefined) e.push('une carte de commande porte sourceAppel')
    }
    if (!sansTel) e.push('la commande générée sans téléphone ne sort pas')
    else if (sansTel.tel !== null) e.push(`commande sans téléphone : tel ${JSON.stringify(sansTel.tel)}, null attendu`)
    const rep = depuisReponses(ap.lignes, new Date(ap.maintenant))
    const r = rep?.find((c) => c.id === ap.roles.reponse)
    if (!r) e.push('appelsDepuisReponses : la réponse « appel » ne sort pas')
    else {
      const contexte = ap.lignes.find((x) => x.id === ap.roles.reponse).contexte
      if ((r.lignes ?? []).some((x) => String(x).length > 140)) e.push(`une ligne de la réponse dépasse 140 signes (${Math.max(...r.lignes.map((x) => String(x).length))})`)
      if (!(r.lignes ?? []).some((x) => String(x).startsWith(contexte.slice(0, 30)))) e.push('le contexte de la réponse n’apparaît pas dans ses lignes')
    }
    const fus = fusionner(rep ?? [], cartes ?? [])
    if (!Array.isArray(fus) || fus.length !== (rep?.length ?? 0) + (cartes?.length ?? 0)) e.push(`fusionnerAppels rend ${fus?.length} cartes, ${(rep?.length ?? 0) + (cartes?.length ?? 0)} attendues`)
    else for (let i = 1; i < fus.length; i++) if (Date.parse(fus[i - 1].a) > Date.parse(fus[i].a)) e.push('fusionnerAppels : pas la plus ancienne d’abord (champ a)')
    const douze = Array.from({ length: 12 }, (_, i) => ({ ...cartes[0], id: `${cartes[0].id}-${i}`, a: decaler(cm.maintenant, -(i + 1) * H) }))
    const f12 = fusionner(gelerProfond(douze.slice(0, 6)), gelerProfond(douze.slice(6)))
    if (!Array.isArray(f12) || f12.length !== 10) e.push(`fusionnerAppels de 12 cartes : ${f12?.length}, 10 au plus attendues`)
    const adresses = chaines([cartes, rep, fus]).filter((x) => RE_EMAIL.test(x))
    if (adresses.length) e.push(`adresse e-mail rendue : ${court(adresses[0], 80)}`)
    return { echecs: e, detail: `commandes : complète et brouillon écartées, incomplète avec « Manque : <premier manque> (+1) » et tel:+33299123456, sans téléphone → tel: null ; réponse coupée à 140 signes ; fusion : la plus ancienne d'abord, 10 au plus ; aucune adresse e-mail rendue` }
  })

  await s.critere('DC-8', () => {
    const lienPilotage = fn(m.liens, 'lienPilotage', L), estLien = fn(m.liens, 'estLienPilotage', L), RE0 = val(m.liens, 'RE_LIEN_PILOTAGE', L), BLOCS = val(m.liens, 'BLOCS', L), e = []
    if (!(RE0 instanceof RegExp)) return { echecs: ['RE_LIEN_PILOTAGE n’est pas une expression régulière'] }
    const RE = new RegExp(RE0.source, RE0.flags.replace(/[gy]/g, ''))
    const blocs = ['argent', 'decider', 'appeler', 'envois', 'entonnoir', 'agents', 'code']
    if ([...BLOCS].sort().join() !== [...blocs].sort().join()) e.push(`BLOCS = ${JSON.stringify(BLOCS)} : ${blocs.join(', ')} attendus (plus de « lot », revue du 25/09)`)
    const uuid = d.valides[0].id, base = '/controle?onglet=pilotage'
    const cas = [[{ decision: uuid }, `${base}&decision=${uuid}`], [{ decision: 'jean.temoin@exemple.invalid' }, base], [{ bloc: 'admin' }, base], [{ bloc: 'envois' }, `${base}&bloc=envois`], [undefined, base], [{ decision: uuid.toUpperCase() }, base], [{ bloc: 'lot' }, base]]
    for (const [x, attendu] of cas) { const r = lienPilotage(x); if (r !== attendu) e.push(`lienPilotage(${JSON.stringify(x)}) = ${JSON.stringify(r)}, ${JSON.stringify(attendu)} attendu`) }
    for (const x of [base, `${base}&decision=${uuid}`, `${base}&bloc=argent`]) if (!RE.test(x) || !estLien(x)) e.push(`RE_LIEN_PILOTAGE ou estLienPilotage refuse « ${x} »`)
    for (const x of [`${base}&decision=jean@x`, `${base}&bloc=admin`, 'javascript:alert(1)', `${base}&decision=${uuid}&x=1`, `https://exemple.invalid${base}`, `${base}&bloc=argent&decision=${uuid}`, `${base}&decision=${uuid.toUpperCase()}`]) if (RE.test(x) || estLien(x)) e.push(`RE_LIEN_PILOTAGE ou estLienPilotage accepte « ${x} »`)
    const f = jeu('liens-fuzz.json')
    let n = 0
    for (const x of [...f.piegees, ...f.neutres]) for (const arg of [{ decision: x }, { bloc: x }, { decision: x, bloc: x }]) {
      n++
      const r = lienPilotage(arg)
      const sansUuid = typeof r === 'string' ? r.replace(RE_UUID, '') : ''
      if (typeof r !== 'string' || !RE.test(r) || !estLien(r) || r.includes('@') || /\d{9}/.test(sansUuid)) { e.push(`entrée ${JSON.stringify(x).slice(0, 60)} → ${JSON.stringify(r).slice(0, 90)}`); if (e.length > 12) break }
    }
    return { echecs: e, detail: `lienPilotage exact sur 7 cas (UUID gardé, adresse, « admin », « lot » et UUID en capitales ignorés) ; RE_LIEN_PILOTAGE accepte les trois formes et refuse 7 formes voisines ; ${n} liens fabriqués à partir des 200 chaînes de liens-fuzz.json : tous conformes, sans @ ni 9 chiffres hors UUID` }
  })

  await s.critere('DC-9', () => {
    const e = []
    const avant = canon([jeu('decisions.json'), jeu('commandes.json'), jeu('appels.json')])
    const sorties = []
    const appels = [
      ['cartesDecisions', () => fn(m.decisions, 'cartesDecisions', D)(d.valides, d.epinglee, t)],
      ['cartesDecisions (fautives)', () => fn(m.decisions, 'cartesDecisions', D)([...d.valides, ...d.fautives], undefined, t)],
      ['trierDecisions', () => fn(m.decisions, 'trierDecisions', D)(d.valides)],
      ['libelleDefaut', () => d.valides.map((x) => fn(m.decisions, 'libelleDefaut', D)(x, t))],
      ['appelsDepuisCommandes', () => fn(m.appels, 'appelsDepuisCommandes', AP)(cm.commandes, t)],
      ['appelsDepuisReponses', () => fn(m.appels, 'appelsDepuisReponses', AP)(ap.lignes, t)],
    ]
    for (const [nom, f] of appels) { try { sorties.push([nom, f()]) } catch (err) { e.push(`${nom} sur entrées gelées : ${court(err.message, 120)}`) } }
    const tri = sorties.find(([n]) => n === 'trierDecisions')?.[1]
    if (tri && tri.map((x) => x.id).join() !== d.ordre_attendu.join()) e.push('trierDecisions : ordre complet faux')
    if (tri === d.valides) e.push('trierDecisions rend l’entrée elle-même (tri en place)')
    for (const [nom, x] of sorties) { const v = valeursInterdites(x); if (v.length) e.push(`${nom} : ${v.slice(0, 2).join(', ')}`) }
    if (canon([d, cm, ap].map((x) => ({ ...x }))) === '' || avant !== canon([jeu('decisions.json'), jeu('commandes.json'), jeu('appels.json')])) e.push('un jeu d’essai a changé sur le disque')
    if (canon([d, cm, ap]) !== avant) e.push('une entrée gelée a changé')
    return { echecs: e, detail: 'entrées gelées en profondeur (Object.freeze) : aucune écriture tentée, trierDecisions rend une copie dans l’ordre complet, aucune sortie ne porte NaN ni Infinity' }
  })

  await s.critere('DC-10', () => { const r = typecheck(RAC, JUGE); return { echecs: r.ok ? [] : [r.detail], detail: r.detail } })

  await s.critere('DC-11', () => {
    const depuisReponses = fn(m.appels, 'appelsDepuisReponses', AP), e = []
    const cartes = depuisReponses(ap.lignes, new Date(ap.maintenant))
    if (!Array.isArray(cartes) || cartes.length !== 2) e.push(`${cartes?.length} carte(s) pour une réservation, une réponse et une source inconnue : 2 attendues`)
    const rdv = cartes?.find((c) => c.id === ap.roles.rdv), rep = cartes?.find((c) => c.id === ap.roles.reponse)
    if (cartes?.[0]?.id !== ap.roles.rdv) e.push('la première carte n’est pas la réservation')
    if (cartes?.some((c) => c.id === ap.roles.inconnue)) e.push('la ligne de source inconnue sort en carte')
    if (!rdv) e.push('la réservation ne sort pas')
    else {
      if (rdv.source !== 'Rendez-vous réservé') e.push(`réservation : source ${JSON.stringify(rdv.source)}`)
      if (rdv.sourceAppel !== 'rdv') e.push(`réservation : sourceAppel ${JSON.stringify(rdv.sourceAppel)}`)
      const lignes = (rdv.lignes ?? []).join(' | ')
      if (!/14 h 30/.test(lignes)) e.push(`réservation : « 14 h 30 » (heure de Paris, heure d’hiver) absent (${court(lignes, 120)})`)
      if (/13 h 30|13:30/.test(lignes)) e.push('réservation : heure UTC affichée')
      if (!/Plombier · Lyon/.test(lignes)) e.push('réservation : contexte « Plombier · Lyon » absent')
      if (rdv.tel !== 'tel:+33612345678') e.push(`réservation : tel ${JSON.stringify(rdv.tel)}`)
    }
    if (!rep) e.push('la réponse « appel » ne sort pas')
    else {
      if (rep.source !== 'Réponse à un message') e.push(`réponse : source ${JSON.stringify(rep.source)}`)
      if (rep.sourceAppel !== 'reponse') e.push(`réponse : sourceAppel ${JSON.stringify(rep.sourceAppel)}`)
    }
    const adresses = chaines(cartes).filter((x) => RE_EMAIL.test(x))
    if (adresses.length) e.push(`adresse rendue : ${court(adresses[0], 80)}`)
    return { echecs: e, detail: 'réservation du 30/10 à 13 h 30 UTC → « Rendez-vous réservé », sourceAppel rdv, « 14 h 30 » ; réponse → « Réponse à un message », sourceAppel reponse ; source inconnue écartée ; aucune adresse' }
  })
}

// ═══ --partie=envois (026-015 réécrite) ═════════════════════════════════════════════════════════════════════════════════
async function envois(s) {
  const lot = path.join(RAC, 'lib/pilotage/lot.ts')
  const m = await modulesPresents(s, 'LE-1', ['lib/pilotage/envois.ts', 'lib/pilotage/entonnoir.ts'], (spec) => relatifPilotage(spec), '« ./… » de lib/pilotage/',
    fs.existsSync(lot) ? ['lib/pilotage/lot.ts existe (remplacé par envois.ts, rectification du 24/09)'] : [])
  if (!m) return s.nonJuges(IDS.envois, 'LE-1 en échec (modules absents, interdits ou illisibles)')
  const EV = 'lib/pilotage/envois.ts', EN = 'lib/pilotage/entonnoir.ts'
  const srcEv = sansCommentaires(fs.readFileSync(path.join(RAC, EV), 'utf8')), srcEn = sansCommentaires(fs.readFileSync(path.join(RAC, EN), 'utf8'))
  const v = jeu('envois.json'), cc = gelerProfond(jeu('compteurs-canaux.json')), tc = gelerProfond(jeu('technologies.json'))
  const t = new Date(v.maintenant)
  const lignesPiegees = gelerProfond(v.envois.map((l) => ({ ...l, ...(v.pieges[l.id] ?? {}) })))
  const lignes = gelerProfond(v.envois)
  const envoisDesAgents = () => fn(m.envois, 'envoisDesAgents', EV)
  const cas = v.cas

  await s.critere('LE-2', () => {
    const e = []
    const noms = new Set([...exportsNommes(srcEv), ...Object.keys(m.envois)])
    for (const n of noms) {
      if (['texteEnvoyable', 'lienProfil', 'lotDuJour'].includes(n)) e.push(`export ${n}`)
      else if (/copier|envoyer|marquer|sauter|relayer/i.test(n)) e.push(`export ${n} (geste d'envoi)`)
    }
    for (const mot of ['Copier', 'Envoyé', 'Relayer']) if (srcEv.includes(mot)) e.push(`le texte d'envois.ts (commentaires ôtés) contient « ${mot} »`)
    return { echecs: e, detail: `envois.ts en lecture seule : ${noms.size} export(s) (${[...noms].join(', ')}), aucun ne copie, n'envoie, ne marque, ne saute ni ne relaie ; ni « Copier », ni « Envoyé », ni « Relayer » dans son texte` }
  })

  await s.critere('LE-3', () => {
    const e = []
    const r = envoisDesAgents()(lignesPiegees, cc.canaux, tc.technologies, t)
    const CLES = ['id', 'canal', 'technologie', 'type', 'statut', 'metier', 'commune', 'variante', 'froid', 'verdicts', 'complet', 'envoye_le'].sort().join()
    if (!Array.isArray(r?.envois) || !r.envois.length) e.push('aucun envoi rendu')
    for (const x of r?.envois ?? []) { if (Object.keys(x).sort().join() !== CLES) { e.push(`envoi ${x.id} : clés ${Object.keys(x).sort().join(',')}`); break } }
    const cles = new Set(clesProfondes(r))
    for (const k of ['parBoite', 'boite']) if (cles.has(k)) e.push(`la sortie porte une clé ${k}`)
    const texte = JSON.stringify(r)
    const piege = Object.values(v.pieges)[0]
    if (texte.includes('Témoin SARL')) e.push('« Témoin SARL » sort')
    if (texte.includes('@')) e.push('un @ sort')
    if (texte.includes(piege.texte.slice(0, 30)) || texte.includes(piege.profil) || texte.includes(piege.identifiant)) e.push('le texte, le profil ou l’identifiant piégé sort')
    return { echecs: e, detail: `envoisDesAgents sur ${lignesPiegees.length} lignes dont ${Object.keys(v.pieges).length} piégées (texte, destinataire, entreprise, profil, identifiant) : chaque envoi a exactement les 12 clés de la liste blanche, ni parBoite ni boite, rien de « Témoin SARL », aucun @, aucun texte piégé` }
  })

  await s.critere('LE-4', () => {
    const compteur = fn(m.envois, 'compteur', EV), e = []
    const c = (u, p, texte, plein, reste) => {
      const r = compteur(u, p)
      if (r?.texte !== texte) e.push(`compteur(${u}, ${p}).texte = ${JSON.stringify(r?.texte)}, « ${texte} » attendu`)
      if (r?.plein !== plein) e.push(`compteur(${u}, ${p}).plein = ${r?.plein}, ${plein} attendu`)
      if (reste !== undefined && r?.reste !== reste) e.push(`compteur(${u}, ${p}).reste = ${r?.reste}, ${reste} attendu`)
    }
    c(2, 4, '2/4', false, 2); c(4, 4, '4/4', true); c(0, 0, '0/0', true); c(2, null, '2 / plafond non réglé', true)
    const r = envoisDesAgents()(lignes, cc.canaux, tc.technologies, t)
    if (r?.palier !== 'P1') e.push(`palier ${JSON.stringify(r?.palier)}, P1 attendu (celui de formulaire_site)`)
    const f = r?.parCanal?.find((x) => x.canal === 'formulaire_site')
    if (!(f && f.texte === '10/10' && f.plein === true)) e.push(`formulaire_site à 10/10 au palier P1 : ${JSON.stringify(f && { texte: f.texte, plein: f.plein })}, plein attendu`)
    const pn = r?.parCanal?.find((x) => x.canal === cc.roles.plafond_null)
    if (!(pn && pn.plein === true)) e.push('canal au plafond null : plein attendu (prudent)')
    const tp = r?.parTechnologie?.find((x) => x.technologie === tc.roles.pause), ta = r?.parTechnologie?.find((x) => x.technologie === tc.roles.active)
    const src = tc.technologies.find((x) => x.technologie === tc.roles.pause)
    if (!(tp && tp.etat === 'pause' && tp.echecs_affilee === src.echecs_affilee && tp.pause_motif === src.pause_motif && tp.envois === src.envois_jour)) e.push(`technologie en pause : ${JSON.stringify(tp)}`)
    if (!(ta && ta.etat === 'active')) e.push(`technologie saine : ${JSON.stringify(ta)}`)
    return { echecs: e, detail: 'compteur : 2/4 pas plein reste 2, 4/4 plein, 0/0 plein, « 2 / plafond non réglé » plein ; palier P1 ; formulaire_site 10/10 plein ; plafond null plein ; Contact Form 7 en pause avec ses 3 échecs et son motif, WPForms active' }
  })

  await s.critere('LE-5', () => {
    const santeCanal = fn(m.envois, 'santeCanal', EV), e = []
    const base = { canal: 'formulaire_site', palier: 'P2', plafond: 20, utilises: 3, plaintes_7j: 0, avis_abus: 0, stop_100: 3, echecs_affilee: 2, reponses_positives: 0 }
    const cas = [
      [{ plaintes_7j: 1 }, 'rouge', /1/], [{ avis_abus: 1 }, 'rouge', /1/], [{ stop_100: 4 }, 'rouge', /4/], [{ echecs_affilee: 3 }, 'rouge', /3/],
      [{ palier: 'P3', reponses_positives: 0 }, 'rouge', null], [{}, 'vert', null], [{ palier: 'P3', reponses_positives: 1 }, 'vert', null],
      [{ stop_100: null }, 'inconnu', null], [{ plaintes_7j: null, avis_abus: null, stop_100: null, echecs_affilee: null, reponses_positives: null }, 'inconnu', null],
      [{ stop_100: null, plaintes_7j: 2 }, 'rouge', /2/],
    ]
    for (const [x, attendu, chiffre] of cas) {
      const r = santeCanal(gelerProfond({ ...base, ...x }))
      if (r?.etat !== attendu) e.push(`santeCanal(${JSON.stringify(x)}) = ${r?.etat}, ${attendu} attendu`)
      else if (attendu === 'rouge' && !(Array.isArray(r.raisons) && r.raisons.length && r.raisons.every((y) => typeof y === 'string' && y.trim()))) e.push(`santeCanal(${JSON.stringify(x)}) rouge sans raison lisible`)
      else if (chiffre && !r.raisons.some((y) => chiffre.test(y))) e.push(`santeCanal(${JSON.stringify(x)}) : raison sans le chiffre (${r.raisons.join(' / ')})`)
    }
    const phrase = 'Aucun envoi à froid : le canal formulaire s\'ouvre au plus tôt le 12/10, après la mesure à sec, l\'épreuve de bout en bout et l\'ouverture par Benj.'
    const chauds = gelerProfond(lignes.filter((l) => !l.froid))
    const ferme = gelerProfond(cc.canaux.map((c) => (c.canal === 'formulaire_site' ? { ...c, plafond: 0, utilises: 0 } : c)))
    const r0 = envoisDesAgents()(chauds, ferme, tc.technologies, t)
    if (r0?.vide !== phrase) e.push(`formulaire au plafond 0 sans envoi froid : vide = ${JSON.stringify(r0?.vide)}`)
    const r1 = envoisDesAgents()(chauds, gelerProfond(cc.canaux.filter((c) => c.canal !== 'formulaire_site')), tc.technologies, t)
    if (r1?.vide !== phrase) e.push(`formulaire absent sans envoi froid : vide = ${JSON.stringify(r1?.vide)}`)
    const r2 = envoisDesAgents()(lignes, cc.canaux, tc.technologies, t)
    if (r2?.vide !== null) e.push(`envois froids du jour au plafond 10 : vide = ${JSON.stringify(r2?.vide)}, null attendu`)
    const r3 = envoisDesAgents()(lignes, ferme, tc.technologies, t)
    if (r3?.vide !== null) e.push(`plafond 0 mais envois froids du jour : vide = ${JSON.stringify(r3?.vide)}, null attendu`)
    for (const [re, quoi] of [[/santeBoite/, 'santeBoite'], [/parBoite/, 'parBoite'], [/boite/i, 'boite'], [/chauffe/i, 'chauffe'], [/\bR1\b/, 'R1']]) if (re.test(srcEv) || re.test(srcEn)) e.push(`source : « ${quoi} »`)
    return { echecs: e, detail: `santeCanal : plainte, avis d'abus, 4 STOP, 3 échecs d'affilée, P3 sans réponse positive → rouge avec raison chiffrée ; 0/0/3/2 au P2 → vert ; un compteur nul → inconnu, jamais vert ; vide = la phrase exacte quand le formulaire est fermé sans envoi froid, null sinon ; ni boite, ni chauffe, ni R1 dans le source` }
  })

  await s.critere('LE-6', () => {
    const e = []
    const r = envoisDesAgents()(lignes, cc.canaux, tc.technologies, t)
    const ids = (r?.envois ?? []).map((x) => x.id)
    const sv = r?.envois?.find((x) => x.id === cas.sans_verdict), cp = r?.envois?.find((x) => x.id === cas.complet)
    const an = r?.anomalies ?? []
    if (!sv || sv.complet !== false) e.push(`envoi sans verdict : complet = ${sv?.complet}, false attendu`)
    if (!an.some((a) => a.id === cas.sans_verdict && a.raison === 'verdicts_incomplets')) e.push('envoi sans verdict absent des anomalies (raison verdicts_incomplets)')
    if (!cp || cp.complet !== true) e.push(`envoi aux trois pass : complet = ${cp?.complet}, true attendu`)
    if (an.some((a) => a.id === cas.complet)) e.push('envoi aux trois pass compté en anomalie')
    if (an.length !== v.attendu.anomalies.length) e.push(`${an.length} anomalie(s), ${v.attendu.anomalies.length} attendue(s) (${an.map((a) => a.id.slice(-2)).join(', ')})`)
    if (an.some((a) => a.id === cas.prepare_sans_second)) e.push('un envoi seulement préparé est compté en anomalie')
    if (r?.rejets !== v.attendu.rejets) e.push(`rejets = ${r?.rejets}, ${v.attendu.rejets} attendus (envois du jour avec au moins un refus)`)
    if (ids.includes(cas.hier) || an.some((a) => a.id === cas.hier)) e.push('l’envoi d’hier (23 h 30 à Paris) apparaît')
    if (!ids.includes(cas.minuit_paris)) e.push('l’envoi de 0 h 30 à Paris (22 h 30 UTC la veille) manque : jour pris en UTC ?')
    if (ids.length !== v.attendu.du_jour) e.push(`${ids.length} envois du jour, ${v.attendu.du_jour} attendus`)
    const date = (x) => Date.parse(x.envoye_le ?? lignes.find((l) => l.id === x.id).prepare_le)
    for (let i = 1; i < (r?.envois ?? []).length; i++) if (date(r.envois[i - 1]) < date(r.envois[i])) { e.push('envois pas du plus récent au plus ancien'); break }
    const soir = envoisDesAgents()(lignes, cc.canaux, tc.technologies, new Date('2026-10-14T21:30:00.000Z'))
    const idsSoir = (soir?.envois ?? []).map((x) => x.id)
    if (idsSoir.length !== v.attendu.du_jour || idsSoir.includes(cas.hier) || !idsSoir.includes(cas.minuit_paris)) e.push(`à 23 h 30 à Paris le même jour : ${idsSoir.length} envois, hier ${idsSoir.includes(cas.hier) ? 'présent' : 'absent'}, 0 h 30 ${idsSoir.includes(cas.minuit_paris) ? 'présent' : 'absent'}`)
    return { echecs: e, detail: `l'envoi « envoye » sans son second verdict est l'unique anomalie (verdicts_incomplets, complet: false) ; l'envoi aux trois pass est complet ; rejets = ${v.attendu.rejets} ; ${v.attendu.du_jour} envois du jour à Paris, du plus récent au plus ancien : 0 h 30 à Paris (22 h 30 UTC la veille) dedans, 23 h 30 la veille dehors, à 12 h comme à 23 h 30` }
  })

  const n = jeu('entonnoir.json')
  const tn = new Date(n.maintenant)
  const froids = (k, o = {}) => gelerProfond(Array.from({ length: k }, (_, i) => ({ id: `synth-${i}`, canal: 'formulaire_site', variante: 'A', froid: true, envoye_le: new Date(tn.getTime() - (i % 140) * H - H).toISOString(), repondu: false, oui: false, appel: false, vente: null, ...(typeof o === 'function' ? o(i) : o) })))
  await s.critere('LE-7', () => {
    const entonnoir = fn(m.entonnoir, 'entonnoir', EN), e = []
    const r = entonnoir(gelerProfond(n.lignes), tn)
    for (const j of ['j7', 'j30']) for (const k of ['contacts', 'reponses', 'oui', 'appels', 'ventes', 'chauds']) if (r?.[j]?.[k] !== n.attendu[j][k]) e.push(`${j}.${k} = ${JSON.stringify(r?.[j]?.[k])}, ${n.attendu[j][k]} attendu`)
    const sansOui = entonnoir(froids(5), tn)
    if (sansOui?.j7?.tauxAchat !== null) e.push(`0 « oui » : tauxAchat = ${sansOui?.j7?.tauxAchat}, null attendu`)
    if (sansOui?.j7?.ventes !== null) e.push(`ventes toutes inconnues : ventes = ${sansOui?.j7?.ventes}, null attendu`)
    const phrase = '0 réponse sur 300 contacts froids : changer de message'
    const a300 = entonnoir(froids(300), tn), a299 = entonnoir(froids(299), tn)
    const a290 = entonnoir(gelerProfond([...froids(290), ...Array.from({ length: 10 }, (_, i) => ({ id: `chaud-${i}`, canal: 'messagerie', variante: null, froid: false, envoye_le: new Date(tn.getTime() - (i + 2) * H).toISOString(), repondu: false, oui: false, appel: false, vente: null }))]), tn)
    for (const j of ['j7', 'j30']) {
      if (a300?.[j]?.alerte !== phrase) e.push(`300 froids sans réponse : ${j}.alerte = ${JSON.stringify(a300?.[j]?.alerte)}`)
      if (a299?.[j]?.alerte !== null) e.push(`299 froids : ${j}.alerte = ${JSON.stringify(a299?.[j]?.alerte)}, null attendu`)
      if (a290?.[j]?.alerte !== null) e.push(`290 froids et 10 chauds : ${j}.alerte = ${JSON.stringify(a290?.[j]?.alerte)}, null attendu`)
    }
    return { echecs: e, detail: `entonnoir sur 60 lignes : j7 ${JSON.stringify(n.attendu.j7)}, j30 ${JSON.stringify(n.attendu.j30)} exacts (les 10 chauds seulement dans chauds, la ligne de 35 jours ignorée) ; tauxAchat et ventes nuls quand il le faut ; alerte exacte à 300 froids sans réponse, nulle à 299 et à 290 froids + 10 chauds` }
  })

  const b = jeu('bilan.json')
  await s.critere('LE-8', () => {
    const bilan = fn(m.entonnoir, 'bilan', EN), e = []
    const tb = new Date(b.maintenant), apres = new Date(b.apres_bilan)
    const date = gelerProfond({ ...b.date }), sansDate = gelerProfond({ ...b.sansDate })
    const sc = (nom) => b.scenarios.find((x) => x.nom === nom)
    const trie = (x) => [...x.lignes].sort((p, q) => Date.parse(p.envoye_le) - Date.parse(q.envoye_le))
    for (const x of b.scenarios) {
      const r = bilan(gelerProfond(x.lignes), tb, date)
      if (r?.verdict !== x.attendu) e.push(`${x.nom} : verdict ${JSON.stringify(r?.verdict)}, ${x.attendu} attendu`)
      if (r?.contacts !== 100) e.push(`${x.nom} : contacts ${r?.contacts}, 100 attendus`)
      if (r?.enRetard !== false) e.push(`${x.nom} : enRetard ${r?.enRetard} avant la date du bilan`)
      if (!String(r?.bilan_le ?? '').startsWith('2026-11-02')) e.push(`${x.nom} : bilan_le ${JSON.stringify(r?.bilan_le)}, celui de la base (2026-11-02) attendu`)
      if (r?.texte !== 'bilan du 02/11') e.push(`${x.nom} : texte ${JSON.stringify(r?.texte)}, « bilan du 02/11 » attendu`)
    }
    const q60 = bilan(gelerProfond(trie(sc('quatre-oui')).slice(0, 60)), tb, date)
    if (q60?.verdict !== 'P3') e.push(`4 « oui » dans les 60 premiers : ${q60?.verdict}, P3 attendu avant le 100e`)
    const z60 = bilan(gelerProfond(trie(sc('zero-oui')).slice(0, 60)), apres, date)
    if (!(z60?.verdict === 'en_cours' && z60?.enRetard === true)) e.push(`60 contacts sans « oui » après le bilan : ${JSON.stringify({ verdict: z60?.verdict, enRetard: z60?.enRetard })}, en_cours et enRetard attendus`)
    const cent1 = { ...sc('zero-oui').lignes[0], id: 'contact-101', envoye_le: '2026-10-28T08:00:00.000Z', repondu: true, oui: true, vente: true }
    const r101 = bilan(gelerProfond([...sc('zero-oui').lignes, cent1]), tb, date)
    if (!(r101?.verdict === 'arret_froid' && r101?.contacts === 100 && r101?.oui === 0)) e.push(`un 101e contact (oui et vente) compté : ${JSON.stringify({ verdict: r101?.verdict, contacts: r101?.contacts, oui: r101?.oui })}`)
    const chaud = { ...sc('zero-oui').lignes[0], id: 'contact-chaud', froid: false, envoye_le: '2026-10-12T05:00:00.000Z', repondu: true, oui: true, vente: true }
    const rc = bilan(gelerProfond([...sc('zero-oui').lignes, chaud]), tb, date)
    if (!(rc?.verdict === 'arret_froid' && rc?.contacts === 100 && rc?.oui === 0)) e.push(`un contact chaud compté : ${JSON.stringify({ verdict: rc?.verdict, contacts: rc?.contacts, oui: rc?.oui })}`)
    const rn = bilan(gelerProfond(sc('deux-oui').lignes), tb, sansDate)
    if (!(rn?.bilan_le === null && rn?.texte === 'bilan non daté (formulaire fermé)' && rn?.enRetard === false)) e.push(`date nulle : ${JSON.stringify({ bilan_le: rn?.bilan_le, texte: rn?.texte, enRetard: rn?.enRetard })}`)
    for (const x of ['2026-10-12', '2026-11-02', '2026-10-23', '2026-11-05', 'JALON']) if (srcEv.includes(x) || srcEn.includes(x)) e.push(`source : « ${x} » écrit en dur (la date vient de la base)`)
    return { echecs: e, detail: 'bilan sur les 4 scénarios, date lue dans la base (2026-11-02) : 1 vente → P3, 4 oui → P3 (dès 60 contacts), 2 oui → nouveau_message, 0 oui → arret_froid ; 60 contacts après le bilan → en_cours, enRetard ; 101e et contact chaud jamais comptés ; date nulle → « bilan non daté (formulaire fermé) » ; aucune date ni JALON dans le source' }
  })

  await s.critere('LE-9', () => {
    const e = []
    const tv = new Date(v.maintenant)
    const vides = [
      ['entonnoir([])', () => fn(m.entonnoir, 'entonnoir', EN)(gelerProfond([]), tv)],
      ['bilan([], null)', () => fn(m.entonnoir, 'bilan', EN)(gelerProfond([]), tv, gelerProfond({ bilan_le: null }))],
      ['envoisDesAgents([], [], [])', () => envoisDesAgents()(gelerProfond([]), gelerProfond([]), gelerProfond([]), tv)],
    ]
    for (const [nom, f] of vides) {
      try { const r = f(); const x = valeursInterdites(r, { undefinedInterdit: true }); if (x.length) e.push(`${nom} : ${x.slice(0, 3).join(', ')}`) } catch (err) { e.push(`${nom} : ${court(err.message, 120)}`) }
    }
    const tc2 = typecheck(RAC, JUGE)
    if (!tc2.ok) e.push(tc2.detail)
    return { echecs: e, detail: `entrées vides gelées : ni NaN, ni Infinity, ni undefined dans entonnoir, bilan et envoisDesAgents ; ${tc2.detail}` }
  })
}

// ═══ --partie=agents (026-017) ══════════════════════════════════════════════════════════════════════════════════════════
const PUBLIER = 'scripts/pilotage-code-publier.mjs'
/** Le faux PostgREST : 127.0.0.1, port libre ; consigne chaque requête ; répond selon `mode` (ok, 500, trop_gros). */
async function fauxPostgrest() {
  const requetes = []
  let mode = 'ok'
  const serveur = http.createServer((req, res) => {
    let corps = ''
    req.setEncoding('utf8')
    req.on('data', (x) => { corps += x })
    req.on('end', () => {
      requetes.push({ methode: req.method, url: req.url, entetes: req.headers, corps })
      // `connection: close` : aucune connexion gardée ouverte par le client. Sous Windows, un process.exit() pendant la
      // fermeture d'une connexion gardée fait planter libuv (assertion dans src\win\async.c, code 127 au lieu de 1).
      if (mode === '500') { res.writeHead(500, { 'content-type': 'application/json', connection: 'close' }); res.end('{"message":"erreur simulée"}'); return }
      res.writeHead(200, { 'content-type': 'application/json', connection: 'close' })
      res.end(JSON.stringify(mode === 'trop_gros' ? 'trop_gros' : 'ok'))
    })
  })
  await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok))
  const fermer = () => new Promise((ok) => { serveur.closeAllConnections?.(); serveur.close(() => ok()) })
  return { url: `http://127.0.0.1:${serveur.address().port}`, requetes, regler: (x) => { mode = x; requetes.length = 0 }, fermer }
}
/** L'environnement du script publié : sans gh (PATH réduit au dossier de node), sans variable Supabase héritée. */
function envPublier(extra = {}) {
  const env = { ...process.env }
  for (const k of Object.keys(env)) if (/SUPABASE|^GH_|^GITHUB_/i.test(k)) delete env[k]
  const cle = Object.keys(env).find((k) => k.toLowerCase() === 'path')
  if (cle) delete env[cle]
  env.PATH = path.dirname(process.execPath)
  return { ...env, ...extra }
}
async function agents(s) {
  const m = await modulesPresents(s, 'AC-1', ['lib/pilotage/agents.ts', 'lib/pilotage/code.ts'],
    (spec) => relatifPilotage(spec) || spec === '@/lib/direction/fraicheur', '@/lib/direction/fraicheur et « ./… »')
  if (!m) return s.nonJuges(IDS.agents, 'AC-1 en échec (modules absents, interdits ou illisibles)')
  const AG = 'lib/pilotage/agents.ts', CO = 'lib/pilotage/code.ts'
  const g = gelerProfond(jeu('agents.json')), t = new Date(g.maintenant)
  const fraicheur = await importerDepuis(RAC, 'lib/direction/fraicheur.ts')

  await s.critere('AC-2', () => {
    const etatAgent = fn(m.agents, 'etatAgent', AG), e = []
    for (const a of g.agents) {
      const r = etatAgent(a, t), attendu = g.attendu.etats[a.nom]
      if (r?.etat !== attendu) e.push(`${a.nom} : ${JSON.stringify(r?.etat)}, ${attendu} attendu`)
      if (r?.panne2h !== (attendu === 'panne')) e.push(`${a.nom} : panne2h ${r?.panne2h}`)
      if (r?.nom !== a.nom) e.push(`${a.nom} : nom rendu ${JSON.stringify(r?.nom)}`)
    }
    const v = etatAgent(g.agents.find((a) => a.nom === g.attendu.cout_3_2), t), n = etatAgent(g.agents.find((a) => a.nom === g.attendu.cout_nul), t)
    if (v?.cout !== fraicheur.euros(3.2)) e.push(`coût 3.2 : ${JSON.stringify(v?.cout)}, ${JSON.stringify(fraicheur.euros(3.2))} (euros(3.2)) attendu`)
    if (n?.cout !== '—') e.push(`coût nul : ${JSON.stringify(n?.cout)}, « — » attendu`)
    return { echecs: e, detail: `etatAgent à l'instant figé : battement de 9 min → actif, 11 min → muet, 2 h 11 → panne (panne2h), nul → jamais, en pause → pause, disjoncteur ouvert et en pause → disjoncteur ; coût 3.2 → « ${fraicheur.euros(3.2)} » (euros(3.2)), nul → « — »` }
  })
  await s.critere('AC-3', () => {
    const lignesAgents = fn(m.agents, 'lignesAgents', AG)
    const ordre = (lignesAgents(g.agents, t) ?? []).map((x) => x.nom)
    return { echecs: ordre.join() === g.attendu.ordre.join() ? [] : [`ordre ${ordre.join(', ')}, ${g.attendu.ordre.join(', ')} attendu`], detail: `lignesAgents : ${g.attendu.ordre.join(' → ')} (panne, disjoncteur, muet, pause, jamais, actif)` }
  })

  const sn = gelerProfond(jeu('snapshot-code.json'))
  await s.critere('AC-4', () => {
    const resumeCode = fn(m.code, 'resumeCode', CO), validerSnapshot = fn(m.code, 'validerSnapshot', CO), e = []
    const ts = new Date(sn.maintenant)
    const frais = resumeCode(sn.releve, sn.publie_le_frais, ts)
    if (JSON.stringify(frais?.verrousVieux) !== JSON.stringify([sn.verrou_vieux])) e.push(`verrousVieux ${JSON.stringify(frais?.verrousVieux)}, ["${sn.verrou_vieux}"] attendu (verrou de 75 min)`)
    if (frais?.perime !== false || frais?.message !== null) e.push(`relevé de 10 min : perime ${frais?.perime}, message ${JSON.stringify(frais?.message)}`)
    if (JSON.stringify(frais?.attention) !== JSON.stringify(sn.releve.attention)) e.push('les 3 lignes d’attention ne reviennent pas dans le même ordre')
    const vieux = resumeCode(sn.releve, sn.publie_le_vieux, ts)
    if (!(vieux?.perime === true && vieux?.message === 'Le poste ne publie plus depuis 3 h : PC éteint ?')) e.push(`relevé de 3 h : perime ${vieux?.perime}, message ${JSON.stringify(vieux?.message)}`)
    const rien = resumeCode(null, null, ts)
    if (!(rien?.message === 'Aucun relevé du poste reçu.' && Array.isArray(rien?.attention) && rien.attention.length === 0)) e.push(`sans relevé : message ${JSON.stringify(rien?.message)}, attention ${JSON.stringify(rien?.attention)}`)
    if (validerSnapshot(sn.releve) === null) e.push('validerSnapshot refuse le relevé valide du jeu d’essai')
    const r = sn.releve
    const refus = [
      ['version 2', { ...r, version: 2 }], ['une liste de 51', { ...r, file: Array.from({ length: 51 }, (_, i) => `099-temoin-${i}`) }],
      ['attention de 8 lignes', { ...r, attention: Array.from({ length: 8 }, (_, i) => `ligne ${i} : \`node scripts/orchestre.mjs digest\``) }],
      ['une chaîne de 201 signes', { ...r, file: ['x'.repeat(201)] }], ['une clé inconnue', { ...r, inconnue: 1 }],
      ['sans attention', Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'attention'))],
    ]
    for (const [nom, x] of refus) if (validerSnapshot(gelerProfond(x)) !== null) e.push(`validerSnapshot accepte un relevé avec ${nom}`)
    return { echecs: e, detail: 'resumeCode : verrou de 75 min → verrousVieux, relevé de 3 h → perime et « Le poste ne publie plus depuis 3 h : PC éteint ? », sans relevé → « Aucun relevé du poste reçu. » et attention [], 3 lignes d’attention rendues dans l’ordre ; validerSnapshot accepte le relevé d’essai et refuse version 2, 51 éléments, 8 lignes d’attention, 201 signes, clé inconnue, relevé sans attention' }
  })

  const script = path.join(RAC, PUBLIER)
  const travail = dossierTravail(JUGE, 'agents')
  const cle = `sb_secret_temoin_${crypto.randomBytes(24).toString('hex')}`
  const sorties = []
  const lancerPublier = async (args, env, nom) => {
    const r = await lancerAsync(process.execPath, [script, ...args], { cwd: travail, env, timeout: 90_000 })
    sorties.push({ nom, ...r })
    fs.writeFileSync(path.join(travail, `${nom}.log`), `$ node ${PUBLIER} ${args.join(' ')}\n${r.stdout}\n--- stderr ---\n${r.stderr}\n--- code ${r.code}\n`)
    return r
  }
  const lireJsonSortie = (txt) => { const x = txt.trim(); try { return JSON.parse(x) } catch { const i = x.indexOf('{'), j = x.lastIndexOf('}'); return i >= 0 && j > i ? JSON.parse(x.slice(i, j + 1)) : null } }

  await s.critere('AC-5', async () => {
    const e = []
    if (!fs.existsSync(script)) return { echecs: [`${PUBLIER} absent de ${RAC}`] }
    const validerSnapshot = fn(m.code, 'validerSnapshot', CO)
    const avant = instantaneDossier(ORCHESTRE_ESSAI)
    const r = await lancerPublier(['--a-sec', `--orchestre=${ORCHESTRE_ESSAI}`], envPublier({ SUPABASE_SERVICE_ROLE_KEY: cle }), 'a-sec')
    if (r.code !== 0) e.push(`--a-sec : code ${r.code} (${court(r.stderr || r.stdout, 160)})`)
    let j = null
    try { j = lireJsonSortie(r.stdout) } catch (err) { e.push(`--a-sec : sortie illisible (${court(err.message, 80)})`) }
    if (j) {
      if (validerSnapshot(j) === null) e.push('le relevé produit est refusé par validerSnapshot')
      if (Buffer.byteLength(r.stdout.trim()) > 20_000) e.push(`relevé de ${Buffer.byteLength(r.stdout.trim())} octets (> 20 000)`)
      if ([...(j.file ?? [])].sort().join() !== '099-temoin-a,099-temoin-b') e.push(`file ${JSON.stringify(j.file)}`)
      const ec = j.en_cours ?? []
      if (!(ec.length === 1 && ec[0].id === '099-temoin-c' && ec[0].agent === 'codex-temoin' && Date.parse(ec[0].depuis) === Date.parse('2026-10-14T08:45:00Z'))) e.push(`en_cours ${JSON.stringify(ec)}`)
      if (j.fait !== 3 || j.refusees !== 1) e.push(`fait ${j.fait}, refusees ${j.refusees} (3 et 1 attendus)`)
      const verdicts = fs.readFileSync(path.join(ORCHESTRE_ESSAI, 'verdicts.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map((x) => JSON.parse(x)).slice(-5)
      const d = j.derniers ?? []
      if (d.map((x) => `${x.id}:${x.verdict}`).join() !== verdicts.map((x) => `${x.id}:${x.verdict}`).join()) e.push(`derniers ${d.map((x) => `${x.id}:${x.verdict}`).join(', ')} ≠ les 5 dernières lignes dans l’ordre du fichier`)
      if (d.some((x) => String(x.ligne ?? '').length > 160)) e.push('une ligne de verdict n’est pas coupée à 160 signes')
      const bloc = blocAttention(fs.readFileSync(path.join(ORCHESTRE_ESSAI, 'digest.md'), 'utf8'))
      const norm = (l) => String(l).replace(/^\s*[-*]\s+/, '').trim()
      if (JSON.stringify((j.attention ?? []).map(norm)) !== JSON.stringify(bloc.lignes)) e.push(`attention ${JSON.stringify(j.attention)} ≠ les 3 lignes du bloc « ## Attention (3) »`)
    }
    const sansDigest = path.join(travail, 'orchestre-sans-digest')
    fs.cpSync(ORCHESTRE_ESSAI, sansDigest, { recursive: true })
    fs.rmSync(path.join(sansDigest, 'digest.md'))
    const r2 = await lancerPublier(['--a-sec', `--orchestre=${sansDigest}`], envPublier({ SUPABASE_SERVICE_ROLE_KEY: cle }), 'a-sec-sans-digest')
    let j2 = null
    try { j2 = lireJsonSortie(r2.stdout) } catch { /* noté plus bas */ }
    if (r2.code !== 0 || !j2 || !Array.isArray(j2.attention) || j2.attention.length) e.push(`copie sans digest.md : code ${r2.code}, attention ${JSON.stringify(j2?.attention)} ([] attendu)`)
    const ecarts = comparerInstantanes(avant, instantaneDossier(ORCHESTRE_ESSAI))
    if (ecarts.length) e.push(`le dossier d'essai a changé : ${ecarts.slice(0, 3).join(', ')}`)
    return { echecs: e, detail: `--a-sec sur le faux orchestre : JSON valide pour validerSnapshot, ${j ? Buffer.byteLength(r.stdout.trim()) : '?'} octets ≤ 20 000, 2 en file, 1 en cours (codex-temoin, 08:45Z), 3 faites, 1 refusée, les 5 derniers verdicts dans l'ordre, attention = les 3 lignes du digest ([] sans digest.md) ; dossier d'essai inchangé (empreintes)` }
  })

  const faux = await fauxPostgrest()
  try {
    await s.critere('AC-7', async () => {
      const e = []
      if (!fs.existsSync(script)) return { echecs: [`${PUBLIER} absent de ${RAC}`] }
      const env = envPublier({ NEXT_PUBLIC_SUPABASE_URL: faux.url, SUPABASE_SERVICE_ROLE_KEY: cle })
      faux.regler('ok')
      const r = await lancerPublier([`--orchestre=${ORCHESTRE_ESSAI}`], env, 'reel-ok')
      const posts = faux.requetes.filter((q) => q.methode === 'POST' && q.url.split('?')[0] === '/rest/v1/rpc/pilotage_code_publier')
      if (r.code !== 0) e.push(`réponse "ok" : code ${r.code}, 0 attendu (${court(r.stdout + r.stderr, 120)})`)
      if (posts.length !== 1 || faux.requetes.length !== 1) e.push(`${faux.requetes.length} requête(s) dont ${posts.length} POST /rest/v1/rpc/pilotage_code_publier : exactement un attendu`)
      if (posts[0]) {
        let corps = null
        try { corps = JSON.parse(posts[0].corps) } catch { e.push('corps du POST illisible') }
        if (!corps || typeof corps.p_etat !== 'object' || Object.keys(corps).join() !== 'p_etat') e.push(`corps ${court(posts[0].corps, 80)} : { p_etat } attendu`)
        else if (fn(m.code, 'validerSnapshot', CO)(corps.p_etat) === null) e.push('p_etat refusé par validerSnapshot')
        if (posts[0].entetes.apikey !== cle) e.push('en-tête apikey absent ou faux')
        if (posts[0].entetes.authorization !== `Bearer ${cle}`) e.push('en-tête Authorization absent ou faux')
      }
      for (const mode of ['500', 'trop_gros']) {
        faux.regler(mode)
        const rr = await lancerPublier([`--orchestre=${ORCHESTRE_ESSAI}`], env, `reel-${mode}`)
        if (rr.code !== 1) e.push(`réponse ${mode} : code ${rr.code}, 1 attendu`)
        if (faux.requetes.length !== 1) e.push(`réponse ${mode} : ${faux.requetes.length} requête(s)`)
      }
      return { echecs: e, detail: `contre le faux PostgREST (${faux.url}) : un seul POST /rest/v1/rpc/pilotage_code_publier { p_etat } avec apikey et Authorization: Bearer, code 0 sur "ok" ; code 1 sur 500 et sur "trop_gros"` }
    })
  } finally { await faux.fermer() }

  await s.critere('AC-6', () => {
    const e = []
    const src = lireOuNull(script)
    if (src === null) return { echecs: [`${PUBLIER} absent de ${RAC}`] }
    const nu = sansCommentaires(src)
    if (/console\.log\s*\(\s*process\.env/.test(nu)) e.push('le source affiche process.env')
    if (/presti-secrets/.test(src)) e.push('le source lit presti-secrets')
    if (!sorties.length) e.push('aucun lancement du script à examiner (AC-5 et AC-7 n’ont rien lancé)')
    for (const x of sorties) if (x.stdout.includes(cle) || x.stderr.includes(cle)) e.push(`lancement ${x.nom} : la clé de service apparaît sur sa sortie`)
    if (!sorties.some((x) => x.nom.startsWith('reel'))) e.push('aucun lancement réel examiné')
    return { echecs: e, detail: `fausse clé de service tirée au hasard (${cle.length} signes) : absente des sorties standard et d'erreur des ${sorties.length} lancements (--a-sec et réels) ; ni console.log(process.env, ni presti-secrets dans le source` }
  })

  await s.critere('AC-8', () => { const r = typecheck(RAC, JUGE); return { echecs: r.ok ? [] : [r.detail], detail: r.detail } })
}
async function temoinAgents(s) {
  temoinJeux(s, 'AC-T1', 'agents')
  await s.critere('AC-T2', async () => {
    const e = []
    const faux = await fauxPostgrest()
    try {
      for (const [mode, statut, corps] of [['ok', 200, '"ok"'], ['500', 500, null], ['trop_gros', 200, '"trop_gros"']]) {
        faux.regler(mode)
        const r = await fetch(`${faux.url}/rest/v1/rpc/pilotage_code_publier`, { method: 'POST', headers: { apikey: 'essai', authorization: 'Bearer essai', 'content-type': 'application/json' }, body: JSON.stringify({ p_etat: { version: 1 } }) })
        const txt = await r.text()
        if (r.status !== statut || (corps && txt !== corps)) e.push(`faux PostgREST en mode ${mode} : ${r.status} ${txt}`)
        if (faux.requetes.length !== 1 || faux.requetes[0].entetes.apikey !== 'essai' || JSON.parse(faux.requetes[0].corps).p_etat?.version !== 1) e.push(`faux PostgREST en mode ${mode} : requête mal consignée`)
      }
    } finally { await faux.fermer() }
    const a = `sb_secret_temoin_${crypto.randomBytes(24).toString('hex')}`, b = `sb_secret_temoin_${crypto.randomBytes(24).toString('hex')}`
    if (a === b || a.length < 60) e.push('clé tirée au hasard non aléatoire')
    const env = envPublier({})
    if (Object.keys(env).some((k) => /SUPABASE/i.test(k)) || env.PATH !== path.dirname(process.execPath)) e.push('environnement du script : variable Supabase héritée ou PATH non réduit')
    return { echecs: e, detail: 'faux PostgREST démarré sur 127.0.0.1, réponses ok / 500 / trop_gros, chaque requête consignée avec ses en-têtes puis arrêté ; clés tirées au hasard ; environnement du script sans variable Supabase héritée et sans gh (PATH réduit au dossier de node)' }
  })
  await s.critere('AC-T3', () => {
    const src = lireOuNull(path.join(RAC, 'scripts', 'orchestre.mjs')), e = []
    if (!src) return { echecs: ['scripts/orchestre.mjs absent'] }
    if (!/agent: \$\{agent\}\\ndepuis: \$\{maintenant\(\)\}/.test(src)) e.push('scripts/orchestre.mjs n’écrit plus le verrou « agent: … / depuis: <ISO> » que le relevé lit')
    if (!/verdicts\.jsonl/.test(src)) e.push('scripts/orchestre.mjs ne cite plus verdicts.jsonl')
    return { echecs: e, detail: 'scripts/orchestre.mjs écrit toujours le verrou « agent: … » / « depuis: <ISO> » et le journal verdicts.jsonl que pilotage-code-publier relève' }
  })
  await temoinFraicheur(s, 'AC-T4')
}

// ═══ Déroulé ════════════════════════════════════════════════════════════════════════════════════════════════════════════
const IDS = {
  decider: ['DC-1', 'DC-2', 'DC-3', 'DC-4', 'DC-5', 'DC-6', 'DC-7', 'DC-8', 'DC-9', 'DC-10', 'DC-11'],
  envois: ['LE-1', 'LE-2', 'LE-3', 'LE-4', 'LE-5', 'LE-6', 'LE-7', 'LE-8', 'LE-9'],
  agents: ['AC-1', 'AC-2', 'AC-3', 'AC-4', 'AC-5', 'AC-6', 'AC-7', 'AC-8'],
}
const IDS_TEMOIN = {
  decider: ['DC-T1', 'DC-T2', 'DC-T3'],
  envois: ['LE-T1', 'LE-T2', 'LE-T3'],
  agents: ['AC-T1', 'AC-T2', 'AC-T3', 'AC-T4'],
}
const s = creerSortie(NOM, [...(o.temoin ? IDS_TEMOIN : IDS)[partie]], `${NOM} — racine ${RAC}${o.temoin ? ' — témoin' : ''}`)
fs.mkdirSync(TRAV, { recursive: true })
try {
  if (!o.temoin) await { decider, envois, agents }[partie](s)
  else if (partie === 'decider') { temoinJeux(s, 'DC-T1', 'decider'); await temoinFraicheur(s, 'DC-T2'); temoinHarnais(s, 'DC-T3') }
  else if (partie === 'envois') {
    temoinJeux(s, 'LE-T1', 'envois')
    s.juger('LE-T2', fs.existsSync(path.join(RAC, 'lib/pilotage/lot.ts')) ? ['lib/pilotage/lot.ts existe : le module « lot du jour » est remplacé par envois.ts (rectification du 24/09)'] : [], 'lib/pilotage/lot.ts n’existe pas (rectification du 24/09 : le Pilotage montre les envois des agents, il ne prépare plus de lot à copier)')
    temoinHarnais(s, 'LE-T3')
  } else await temoinAgents(s)
} catch (e) {
  console.log(`(juge interrompu : ${court(e?.stack ?? e, 300)})`)
}
// Sortie sans process.exit() immédiat : sous Windows, couper le processus pendant qu'un fil de libuv se ferme encore (connexion
// du faux PostgREST, fil des crochets de ts-loader) fait planter Node (assertion de src\win\async.c, code 127 au lieu de 1).
// La boucle se vide d'elle-même ; un minuteur détaché tranche au bout de 3 s si un module jugé laissait une poignée ouverte.
const code = s.finir()
process.exitCode = code
setTimeout(() => process.exit(code), 3000).unref()
