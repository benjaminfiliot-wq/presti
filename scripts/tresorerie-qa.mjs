// scripts/tresorerie-qa.mjs — juge des calculs de trésorerie (fiche 026-018, lot A ; critères TR de 026-055), écrit par
// Claude Code AVANT le module qu'il juge. L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node --import ./scripts/ts-loader.mjs scripts/tresorerie-qa.mjs [--racine=<dossier>] [--temoin]
//
//   --racine=<d>  importe <d>/lib/direction/tresorerie.ts et <d>/lib/direction/stripe.ts et lit les sources sous <d>
//                 (défaut : le dépôt). La référence (TR-3, TR-5, TR-6) est le commit de preuve-a.json, lu dans le dépôt
//                 git qui contient ce script ; HEAD (TR-8) aussi.
//   --temoin      seulement TR-8 (NR) et la règle commune des preuves vides (TR-PV).
//
// Les modules sont importés dans un PROCESSUS ENFANT (ce même script, --enfant=complet), horloge figée au
// 2026-10-14T09:30:00Z, avec les doublures de scripts/fixtures/026-livraison-tresor/a/doublures.mjs à la place de lib/stripe
// (un jeu fixe : balanceTransactions.list, invoices.list, subscriptions.list ; toute écriture lève), lib/supabaseAdmin,
// lib/email, lib/limites, lib/flags, lib/direction/garde et lib/alertes : aucun réseau (fetch piégé), aucune base, aucun
// Stripe. TR-3 exécute aussi la version de référence de lib/direction/stripe.ts (extraite par `git show` sous
// .orchestre/travail/tresorerie-qa/) sur la même doublure.
//
// Contrats que ce juge fixe pour 026-055 (a/jeux.json, a/tva.json) :
//   situerTva(caCents, reglages) → { seuil, seuilMajore, alerteA, pourcent, alerte, depasse }, exactement ces clés ;
//   margeDuMois({ encaisse, achatsMoisCents, coutIaEur }) → { recettesNettes, depenses, marge, estimation } en euros
//     arrondis au centime, calculés en centimes entiers ; coutIaEur null ou non fourni : compté 0, estimation vraie ;
//   ventesSites(lignes) → { payee, generee, validee, en_ligne, retiree, encaisseCents } (comptes sous « parEtat » et total
//     sous « totalCents » acceptés) ;
//   les fonctions pures ne rendent pas de promesse et ne modifient pas leurs entrées (entrées gelées).
//
// Sortie : une ligne par critère, puis « tresorerie-qa : PASS|FAIL ». Code 0 seulement si tout est vert ; 1 sinon ; 2 si
// l'appel est invalide. Un module absent fait échouer TR-1 avec son chemin ; les critères suivants sont alors « non jugés ».
// Écriture seulement sous .orchestre/travail/tresorerie-qa/.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  R, REFERENCE, lireOptions, refuserAppel, creerSortie, court, premiereLigne, lf, jeu, lireRacine, texteA, dossierTravail,
  lancerEnfant, preparerEnfant, resultatEnfant, importer, figerHorloge, jugerDans, differentsDeHead, jugerPreuvesVides,
  sansCommentaires, importsDe, diffLignes, typecheck, exigerSousTravail,
} from './fixtures/026-livraison-tresor/commun.mjs'

const JUGE = 'tresorerie-qa'
const FICHE = '026-055'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const o = lireOptions(process.argv.slice(2), { connues: ['ref-dir'] })
const RAC = o.racine
const TRESO = 'lib/direction/tresorerie.ts', STRIPE = 'lib/direction/stripe.ts', COMPTA = 'app/api/controle/compta/route.ts'
const EXPORTS_TRESO = ['caDeLAnnee', 'situerTva', 'margeDuMois', 'ventesSites']
const EXPORTS_STRIPE = ['encaisseDepuis', 'encaisseDuJour', 'encaisseSur7Jours']
const DOUBLES = { 'lib/stripe': 'stripe', 'lib/supabaseAdmin': 'supabaseAdmin', 'lib/email': 'email', 'lib/limites': 'limites', 'lib/flags': 'flags', 'lib/direction/garde': 'garde', 'lib/alertes': 'alertes' }
const ETATS_VENTES = ['payee', 'generee', 'validee', 'en_ligne', 'retiree']
const trier = (x) => (Array.isArray(x) ? x.map(trier) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, trier(x[k])])) : x)
const geler = (x) => { if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.freeze(x); for (const v of Object.values(x)) geler(v) } return x }

// ═══ Le processus enfant ════════════════════════════════════════════════════════════════════════════════════════════════
if (o.enfant === 'complet') {
  const J = jeu('jeux.json'), TVA = jeu('tva.json')
  figerHorloge(J.stripe.maintenant)
  const REFDIR = o.valeurs['ref-dir']
  const { D, reseau } = await preparerEnfant({ racines: [RAC, ...(REFDIR ? [REFDIR] : [])], doubles: DOUBLES })
  const E = D.etat
  const suivi = { reseau, inconnues: E.inconnues }
  const res = { criteres: {}, imports: {} }
  D.reinitialiser({ stripe: J.stripe })
  const t = await importer(RAC, TRESO), st = await importer(RAC, STRIPE)
  res.imports = { [TRESO]: t.erreur ?? 'ok', [STRIPE]: st.erreur ?? 'ok' }
  const T = t.m ?? {}, S = st.m ?? {}

  await jugerDans(res, 'TR-1', () => {
    const e = []
    if (!t.m) e.push(`${TRESO} ne s'importe pas : ${t.erreur}`)
    if (!st.m) e.push(`${STRIPE} ne s'importe pas : ${st.erreur}`)
    for (const n of EXPORTS_TRESO) if (t.m && typeof T[n] !== 'function') e.push(`${TRESO} n'exporte pas la fonction ${n}`)
    for (const n of EXPORTS_STRIPE) if (st.m && typeof S[n] !== 'function') e.push(`${STRIPE} n'exporte pas la fonction ${n}`)
    return { echecs: e, detail: `${TRESO} exporte ${EXPORTS_TRESO.join(', ')} ; ${STRIPE} exporte ${EXPORTS_STRIPE.join(', ')} (importés par ts-loader, doublures en place)` }
  }, suivi)

  await jugerDans(res, 'TR-2', () => {
    const e = []
    // Le jeu d'essai d'abord : sa formule est-elle celle de la référence, et ses attendus sont-ils ceux qu'elle calcule ?
    const ref = TVA.reference && texteA(TVA.reference, TVA.fichier)
    if (!ref) e.push(`tva.json : ${TVA.fichier} illisible au commit ${String(TVA.reference).slice(0, 7)}`)
    else {
      const l = ref.split('\n')
      if (JSON.stringify(l.slice(71, 74)) !== JSON.stringify(TVA.lignes_72_74) || JSON.stringify(l.slice(88, 91)) !== JSON.stringify(TVA.lignes_89_91)) e.push(`tva.json : la formule recopiée n'est plus celle de ${TVA.fichier}:72-74 et :89-91 au commit ${TVA.reference.slice(0, 7)}`)
    }
    if (TVA.reference !== REFERENCE) e.push(`tva.json : commit ${String(TVA.reference).slice(0, 7)}, la référence du domaine est ${String(REFERENCE).slice(0, 7)}`)
    const corps = `${TVA.lignes_72_74.join('\n')}\nreturn { seuil, seuilMajore, alerteA,\n${TVA.lignes_89_91.join('\n')}\n}`
    const formule = new Function('reg', 'caCents', corps)
    if (TVA.cas.length !== 12) e.push(`tva.json : ${TVA.cas.length} cas, 12 attendus`)
    for (const c of TVA.cas) if (JSON.stringify(formule(c.reglages, c.caCents)) !== JSON.stringify(c.attendu)) e.push(`tva.json, cas « ${c.nom} » : l'attendu n'est pas celui que calcule la formule recopiée`)
    if (e.length) return { echecs: e }
    if (typeof T.situerTva !== 'function') return { echecs: ['situerTva absente (TR-1)'] }
    for (const c of TVA.cas) {
      let r
      try { r = T.situerTva(c.caCents, geler(structuredClone(c.reglages))) } catch (err) { e.push(`« ${c.nom} » : situerTva lève (${premiereLigne(err)})`); continue }
      if (r && typeof r.then === 'function') { e.push(`« ${c.nom} » : situerTva rend une promesse, une fonction pure attendue`); continue }
      const cles = Object.keys(r ?? {}).sort().join(','), attendues = Object.keys(c.attendu).sort().join(',')
      if (cles !== attendues) e.push(`« ${c.nom} » : clés ${cles || 'aucune'}, ${attendues} attendues`)
      for (const [k, v] of Object.entries(c.attendu)) if (r?.[k] !== v) e.push(`« ${c.nom} » : ${k} = ${JSON.stringify(r?.[k])}, ${JSON.stringify(v)} attendu`)
    }
    return { echecs: e, detail: `les 12 cas de a/tva.json (formule de ${TVA.fichier}:72-74 et :89-91 au commit ${TVA.reference.slice(0, 7)}, recopiée et réévaluée) : situerTva rend exactement l'attendu, pourcent: null compris (chiffre inconnu, seuil nul)` }
  }, suivi)

  await jugerDans(res, 'TR-3', async () => {
    const e = []
    if (!REFDIR) return { echecs: ['version de référence de lib/direction/stripe.ts non extraite'] }
    const ref = await importer(REFDIR, STRIPE)
    if (!ref.m || typeof ref.m.encaisseDuMois !== 'function') return { echecs: [`version de référence de ${STRIPE} : ${ref.erreur ?? 'encaisseDuMois absente'}`] }
    if (typeof S.encaisseDuMois !== 'function') return { echecs: [`${STRIPE} n'exporte plus encaisseDuMois`] }
    D.reinitialiser({ stripe: J.stripe })
    const avant = await ref.m.encaisseDuMois()
    D.reinitialiser({ stripe: J.stripe })
    const apres = await S.encaisseDuMois()
    if (avant?.valeur == null) e.push(`la version de référence rend une erreur sur la doublure (${avant?.erreur ?? '?'}) : harnais à revoir`)
    if (JSON.stringify(trier(avant)) !== JSON.stringify(trier(apres))) e.push(`encaisseDuMois() a changé : référence ${court(JSON.stringify(trier(avant)), 150)}, courante ${court(JSON.stringify(trier(apres)), 150)}`)
    const fixe = Date.now()
    const minuitUtc = (() => { const d = new Date(fixe); d.setUTCHours(0, 0, 0, 0); return Math.floor(d.getTime() / 1000) })()
    const moins7j = Math.floor(fixe / 1000) - 7 * 86400
    for (const [nom, attendu, dit] of [['encaisseDuJour', minuitUtc, 'minuit UTC'], ['encaisseSur7Jours', moins7j, 'maintenant − 7 j']]) {
      if (typeof S[nom] !== 'function') { e.push(`${nom} absente (TR-1)`); continue }
      D.reinitialiser({ stripe: J.stripe })
      const r = await S[nom]()
      const appels = E.stripe.appels.filter((a) => a.ressource === 'balanceTransactions' && a.methode === 'list')
      if (!appels.length) e.push(`${nom}() n'appelle pas balanceTransactions.list (cache partagé avec le mois ?) — rendu ${court(JSON.stringify(r), 80)}`)
      for (const a of appels) if (a.params?.created?.gte !== attendu) e.push(`${nom}() passe created.gte = ${JSON.stringify(a.params?.created?.gte)}, ${attendu} (${dit}, horloge figée au ${new Date(fixe).toISOString()}) attendu`)
    }
    return { echecs: e, detail: `doublure de Stripe (jeu fixe de a/jeux.json) : encaisseDuMois() de la référence ${String(REFERENCE).slice(0, 7)} et de l'arbre jugé rendent le même objet ; encaisseDuJour passe created.gte = ${minuitUtc} (minuit UTC), encaisseSur7Jours ${moins7j} (maintenant − 7 j), horloge figée` }
  }, suivi)

  await jugerDans(res, 'TR-4', () => {
    const e = []
    if (typeof T.margeDuMois !== 'function' || typeof T.ventesSites !== 'function') return { echecs: ['margeDuMois ou ventesSites absente (TR-1)'] }
    if (J.marge.cas.length !== 8 || J.ventes.cas.length !== 8) e.push(`a/jeux.json : ${J.marge.cas.length} cas de marge et ${J.ventes.cas.length} de ventes, 8 et 8 attendus`)
    for (const c of J.marge.cas) {
      const args = { encaisse: c.encaisse, achatsMoisCents: c.achatsMoisCents, ...(c.coutIaEur === 'absent' ? {} : { coutIaEur: c.coutIaEur }) }
      let r
      try { r = T.margeDuMois(geler(structuredClone(args))) } catch (err) { e.push(`marge « ${c.nom} » : margeDuMois lève (${premiereLigne(err)})`); continue }
      if (r && typeof r.then === 'function') { e.push(`marge « ${c.nom} » : margeDuMois rend une promesse, une fonction pure attendue`); continue }
      for (const [k, v] of Object.entries(c.attendu)) {
        if (r?.[k] === v) continue
        if (typeof v === 'number' && typeof r?.[k] === 'number' && Math.round(r[k] * 100) === Math.round(v * 100)) e.push(`marge « ${c.nom} » : ${k} = ${r[k]}, ${v} attendu (soustraction de flottants hors centimes)`)
        else e.push(`marge « ${c.nom} » : ${k} = ${JSON.stringify(r?.[k])}, ${JSON.stringify(v)} attendu`)
      }
    }
    for (const c of J.ventes.cas) {
      let r
      try { r = T.ventesSites(geler(structuredClone(c.lignes))) } catch (err) { e.push(`ventes « ${c.nom} » : ventesSites lève (${premiereLigne(err)})`); continue }
      if (r && typeof r.then === 'function') { e.push(`ventes « ${c.nom} » : ventesSites rend une promesse, une fonction pure attendue`); continue }
      const comptes = r?.parEtat ?? r ?? {}
      const total = r?.encaisseCents ?? r?.totalCents
      for (const k of ETATS_VENTES) if (comptes[k] !== c.attendu[k]) e.push(`ventes « ${c.nom} » : ${k} = ${JSON.stringify(comptes[k])}, ${c.attendu[k]} attendu`)
      if (total !== c.attendu.encaisseCents) e.push(`ventes « ${c.nom} » : encaisseCents = ${JSON.stringify(total)}, ${c.attendu.encaisseCents} attendu`)
    }
    return { echecs: e, detail: `margeDuMois sur 8 cas (coût IA absent → estimation, 0,30 − 0,10 = 0,2 et 19,99 − 9,99 = 10 au centime près, arrondi du coût IA) et ventesSites sur 8 cas (retirée comptée, brouillons et états inconnus ignorés, total en centimes), entrées gelées` }
  }, suivi)

  resultatEnfant(JUGE, res)
} else {

// ═══ Le juge ════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (o.inconnues.length || o.positionnels.length || o.valeurs['ref-dir'] || o.reel) refuserAppel(JUGE, `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels, ...(o.valeurs['ref-dir'] ? ['--ref-dir'] : []), ...(o.reel ? ['--reel (TR n\'a pas de critère --reel)'] : [])].join(' ')}`)
if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuserAppel(JUGE, `--racine introuvable : ${RAC}`)
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const IDS = o.temoin ? ['TR-8', 'TR-PV'] : ['TR-1', 'TR-2', 'TR-3', 'TR-4', 'TR-5', 'TR-6', 'TR-7', 'TR-8', 'TR-PV']
const s = creerSortie(JUGE, IDS, `${JUGE} — fiche ${FICHE}, racine ${rel(RAC)}, référence ${String(REFERENCE).slice(0, 7)}, mode ${o.temoin ? 'témoin' : 'complet'}`, { nr: ['TR-8'] })

let suite = true
if (!o.temoin) {
  const absents = [TRESO, STRIPE].filter((f) => !fs.existsSync(path.join(RAC, f)))
  if (absents.length) {
    s.echoue('TR-1', absents.map((f) => `${f} absent : le module de la fiche ${FICHE} n'existe pas (encore)`).join(' ; '))
    s.nonJuges(['TR-2', 'TR-3', 'TR-4', 'TR-5', 'TR-6', 'TR-7', 'TR-8'], `${absents.join(', ')} absent (TR-1)`)
    suite = false
  } else {
    // La version de référence de lib/direction/stripe.ts (et de ce qu'elle importe en relatif), pour TR-3.
    let refDir = null
    try {
      if (!REFERENCE) throw new Error('référence du domaine illisible (scripts/fixtures/026-livraison-tresor/preuve-a.json)')
      refDir = dossierTravail(JUGE, `reference-${REFERENCE.slice(0, 7)}`)
      for (const f of [STRIPE, 'lib/direction/fraicheur.ts']) {
        const t = texteA(REFERENCE, f)
        if (t === null) throw new Error(`${f} absent du commit ${REFERENCE.slice(0, 7)}`)
        const cible = exigerSousTravail(path.join(refDir, f))
        fs.mkdirSync(path.dirname(cible), { recursive: true })
        fs.writeFileSync(cible, t)
      }
    } catch (err) { refDir = null; console.log(`   (référence non extraite : ${premiereLigne(err)})`) }
    const r = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'complet', args: refDir ? [`--ref-dir=${refDir}`] : [], timeout: 120_000 })
    if (!r.res) {
      s.echoue('TR-1', `l'enfant qui importe ${TRESO} n'a rien rendu (code ${r.code}${r.erreur ? `, ${r.erreur}` : ''}) — ${court(r.sortie.trim().split(/\r?\n/).slice(-2).join(' | '), 200)}`)
      s.nonJuges(['TR-2', 'TR-3', 'TR-4'], 'enfant sans résultat (TR-1)')
    } else for (const id of ['TR-1', 'TR-2', 'TR-3', 'TR-4']) { const c = r.res.criteres[id]; if (c) s.juger(id, c.echecs, c.detail); else s.echoue(id, 'non rendu par l’enfant') }
  }
}

if (!o.temoin && suite) {
  // ── TR-5 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await s.critere('TR-5', () => {
    const e = []
    const ref = REFERENCE && texteA(REFERENCE, COMPTA)
    const cur = lireRacine(RAC, COMPTA)
    if (!ref) return { echecs: [`${COMPTA} illisible au commit de référence`] }
    if (cur === null) return { echecs: [`${COMPTA} absent`] }
    const sc = sansCommentaires(cur)
    if (/\b(?:const|let|var|function)\s+caDeLAnnee\b/.test(sc)) e.push('la route définit encore caDeLAnnee')
    if (/caCents\s*\/\s*seuil/.test(sc)) e.push('la route porte encore la formule caCents / seuil')
    if (!/\bsituerTva\s*\(/.test(sc)) e.push('la route n’appelle pas situerTva(')
    const imp = importsDe(cur).filter((x) => /(?:^@\/lib\/direction\/tresorerie|\/tresorerie)$/.test(x.spec)).flatMap((x) => x.noms)
    for (const n of ['caDeLAnnee', 'situerTva']) if (!imp.includes(n)) e.push(`la route n'importe pas ${n} de @/lib/direction/tresorerie`)
    // Le reste du texte : identique à la référence, hors imports et hors les deux blocs (caDeLAnnee ; formules 72-74 et 89-91).
    const sansImports = (t) => t.split('\n').map((l) => (/^\s*import\s/.test(l) || /^\s*\}\s*from\s*['"]/.test(l) ? '' : l))
    const R0 = sansImports(ref), C0 = sansImports(cur)
    const zones = []
    const iCa = R0.findIndex((l) => /\bconst\s+caDeLAnnee\b/.test(l))
    if (iCa >= 0) {
      let debut = iCa; while (debut > 0 && /^\s*(\/\*\*|\*|\/\/)/.test(R0[debut - 1])) debut--
      let fin = iCa; while (fin < R0.length && !/^\}\s*,\s*300_000\)/.test(R0[fin])) fin++
      zones.push([debut, fin])
    }
    // Le bloc des lignes 72-74, avec la ligne de caCents qui le suit (situerTva(caCents, …) a besoin d'elle avant lui).
    const i72 = R0.findIndex((l) => /^\s*const seuil = /.test(l)); if (i72 >= 0) zones.push([i72, /^\s*const caCents = /.test(R0[i72 + 3] ?? '') ? i72 + 3 : i72 + 2])
    const i89 = R0.findIndex((l) => /^\s*pourcent: caCents/.test(l)); if (i89 >= 0) zones.push([/^\s*\/\//.test(R0[i89 - 1]) ? i89 - 1 : i89, i89 + 2])
    if (zones.length !== 3) return { echecs: [...e, `les deux blocs de la référence n'ont pas été retrouvés (${zones.length}/3 zones) : juge à revoir`] }
    const dedans = (i) => zones.some(([a, b]) => i >= a && i <= b)
    const d = diffLignes(R0.join('\n'), C0.join('\n'))
    for (const x of d.retraits) if (x.texte.trim() && !dedans(x.i)) e.push(`ligne ${x.i + 1} de la référence changée hors des deux blocs : « ${court(x.texte, 70)} »`)
    for (const x of d.ajouts) if (x.texte.trim() && !dedans(x.pos) && !dedans(x.pos - 1)) e.push(`ligne ajoutée hors des deux blocs (avant la ligne ${x.pos + 1} de la référence) : « ${court(x.texte, 70)} »`)
    return { echecs: [...new Set(e)].slice(0, 12), detail: `${COMPTA} : plus de caDeLAnnee ni de caCents / seuil, appelle situerTva( et importe caDeLAnnee et situerTva de @/lib/direction/tresorerie ; le reste du texte est celui de la référence ${REFERENCE.slice(0, 7)}, hors imports et les deux blocs (lignes ${zones.map(([a, b]) => `${a + 1}-${b + 1}`).join(', ')})` }
  })

  // ── TR-6 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await s.critere('TR-6', () => {
    const e = []
    const INTERDITS = [/\.create\s*\(/, /\.update\s*\(/, /\.del\s*\(/, /\.cancel\s*\(/, /\.pay\s*\(/, /\brefunds\b/]
    const t = sansCommentaires(lireRacine(RAC, TRESO) ?? '')
    t.split('\n').forEach((l, i) => { for (const re of INTERDITS) if (re.test(l)) e.push(`${TRESO}:${i + 1} « ${court(l.trim(), 70)} »`) })
    const ref = REFERENCE && texteA(REFERENCE, STRIPE)
    if (!ref) e.push(`${STRIPE} illisible au commit de référence`)
    else {
      const d = diffLignes(sansCommentaires(ref), sansCommentaires(lireRacine(RAC, STRIPE) ?? ''))
      for (const x of d.ajouts) for (const re of INTERDITS) if (re.test(x.texte)) e.push(`diff de ${STRIPE}, ligne ${x.i + 1} : « ${court(x.texte.trim(), 70)} »`)
    }
    return { echecs: [...new Set(e)], detail: `aucune écriture Stripe (.create( .update( .del( .cancel( .pay( refunds) dans ${TRESO} ni dans le diff de ${STRIPE} depuis ${String(REFERENCE).slice(0, 7)}` }
  })

  // ── TR-7 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await s.critere('TR-7', () => { const r = typecheck(RAC, JUGE); return { echecs: r.ok ? [] : [r.detail], detail: r.detail } })
}

// ── TR-8 (NR) ────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (o.temoin || suite) {
  await s.critere('TR-8', () => {
    const d = [...differentsDeHead(RAC, 'app/api/controle/chiffres'), ...differentsDeHead(RAC, 'app/api/controle/barre')]
    return { echecs: d, detail: `/api/controle/chiffres et /api/controle/barre identiques à HEAD${o.racineParDefaut ? '' : ' (copie comparée au dépôt)'}` }
  })
}

jugerPreuvesVides(s, 'TR', RAC, FICHE)
process.exit(s.finir())
}
