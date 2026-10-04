// scripts/tuile-argent-qa.mjs — juge de la route de trésorerie, de la tuile Argent et de la veille du seuil de TVA (fiche
// 026-018, lot A ; critères TA de 026-059), écrit par Claude Code AVANT le code qu'il juge. L'exécutant (Codex) qui le
// lance n'y touche jamais (CLAUDE.md:23).
//
//   node --import ./scripts/ts-loader.mjs scripts/tuile-argent-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
//
//   --racine=<d>  importe la route, la tuile, la veille et lib/siteLivraison.ts sous <d> et y lit les sources (défaut : le
//                 dépôt). Les « diffs » de TA-5 se lisent contre la version d'avant la fiche, prise dans l'historique du
//                 dépôt qui contient ce script (le plus récent commit dont le fichier ne porte pas encore l'ajout).
//   --temoin      seulement la part de non-régression de TA-5 (NR : le diff de app/controle/Comptabilite.tsx fait 3
//                 lignes au plus, celui de lib/siteLivraison.ts se limite au plus à un try/catch autour de
//                 veilleTresorerie(), app/api/cron/livraison/route.ts n'a pas changé) et la règle des preuves vides (TA-PV).
//   --reel        Claude Code seulement, après déploiement : TA-8 contre PRESTI_BASE_URL (défaut https://prestiapp.fr),
//                 avec un compte fondateur d'essai (scripts/lib/capture.mjs, compteTest('direction'), @presti-test.invalid)
//                 supprimé dans un finally (code 1 si le ménage échoue) ; captures sous .orchestre/travail/tuile-argent-qa/.
//                 Code 2 si 026-059 n'est pas PASS, si le drapeau comptabilite est baissé ou si une variable manque.
//
// Les modules sont importés dans un PROCESSUS ENFANT (ce même script, --enfant=complet), horloge figée au
// 2026-10-14T09:30:00Z, avec les doublures de scripts/fixtures/026-livraison-tresor/a/doublures.mjs à la place de
// lib/stripe (jeu fixe, écritures refusées), lib/supabaseAdmin (tables sites_commandes, achats, reglages_globaux en
// mémoire), lib/supabaseClient, lib/email, lib/limites, lib/vercelDomains, lib/flags, lib/direction/garde (un fondateur
// « direction ») et lib/alertes (coutIADuMois rend ce que le scénario pose) ; pour TA-5, lib/direction/veilleTresorerie est
// remplacée par une veille qui lève. Aucun réseau (fetch piégé), aucune base, aucun Stripe.
//
// Contrats que ce juge fixe pour 026-059 :
//   la tuile (app/controle/TuileArgent.tsx, export par défaut ou nommé TuileArgent) accepte la prop `donnees` — le JSON
//   que rend GET /api/controle/tresorerie — et la rend sans appel réseau ; sa racine porte l'attribut data-tuile-argent
//   (TA-8 la repère ainsi à l'écran) ;
//   alertesTresorerie(tva, maintenant: Date) → Alerte[] ; tva a la forme rendue par situerTva.
//
// Sortie : une ligne par critère, puis « tuile-argent-qa : PASS|FAIL ». Code 0 seulement si tout est vert ; 1 sinon ; 2 si
// l'appel est invalide ou si un préalable de --reel manque. Une route absente fait échouer TA-1 avec son chemin ; les
// critères suivants sont alors « non jugés ». Écriture seulement sous .orchestre/travail/tuile-argent-qa/.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  R, DOUBLURES, lireOptions, refuserAppel, creerSortie, court, premiereLigne, jeu, lireRacine, texteA, dossierTravail, lancerEnfant,
  preparerEnfant, resultatEnfant, importer, figerHorloge, jugerDans, jugerPreuvesVides, sansCommentaires, importsDe,
  corpsDeFonction, instructions, baseAvant, diffLignes, ajoutTryCatch, typecheck, chargerEnvLocal, fichePass, valeurDe,
  egalAuCentime, lf,
} from './fixtures/026-livraison-tresor/commun.mjs'

// Les évolutions approuvées sont soustraites exactement, jamais apprises de la racine jugée.
// 49753f4c : 026-141 (bus/usine) ; 6d9a9c5a : 026-106 (génération distante). Gardes historiques conservées.
// 771d765d : 026-201 (Search Console : tourLivraison appelle lib/sites/searchConsole.ts, trois sites au plus par tour, hors pause).
// Liste de révisions NOMMÉES, de la plus récente à la plus ancienne (chaque évolution se défait sur le texte qui la suit).
function retirerEvolutions(texte, fichier, revisions) {
  const echecs = []
  let projete = texte
  for (const rev of revisions) {
    const avant = texteA(rev + '^', fichier), apres = texteA(rev, fichier)
    if (avant === null || apres === null) { echecs.push('historique authentique absent : ' + rev + ':' + fichier); continue }
    let debut = 0, fin = 0
    while (debut < Math.min(avant.length, apres.length) && avant[debut] === apres[debut]) debut++
    while (fin < Math.min(avant.length, apres.length) - debut && avant[avant.length - 1 - fin] === apres[apres.length - 1 - fin]) fin++
    const ajoute = apres.slice(debut, apres.length - fin), retire = avant.slice(debut, avant.length - fin)
    if (!ajoute || projete === null || projete.indexOf(ajoute) < 0 || projete.indexOf(ajoute) !== projete.lastIndexOf(ajoute)) {
      echecs.push('évolution ' + rev + ' altérée ou ambiguë : ' + fichier); continue
    }
    projete = projete.replace(ajoute, retire)
  }
  return { texte: projete, echecs }
}

const JUGE = 'tuile-argent-qa'
const FICHE = '026-059'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const o = lireOptions(process.argv.slice(2))
const RAC = o.racine
const ROUTE = 'app/api/controle/tresorerie/route.ts', TUILE = 'app/controle/TuileArgent.tsx', COMPTA_ECRAN = 'app/controle/Comptabilite.tsx'
const VEILLE = 'lib/direction/veilleTresorerie.ts', MODULE_LIV = 'lib/siteLivraison.ts', ROUTE_CRON = 'app/api/cron/livraison/route.ts'
const DOUBLES = { 'lib/stripe': 'stripe', 'lib/supabaseAdmin': 'supabaseAdmin', 'lib/supabaseClient': 'supabaseClient', 'lib/email': 'email', 'lib/limites': 'limites', 'lib/vercelDomains': 'vercelDomains', 'lib/flags': 'flags', 'lib/direction/garde': 'garde', 'lib/alertes': 'alertes' }
const geler = (x) => { if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.freeze(x); for (const v of Object.values(x)) geler(v) } return x }
/** Les écarts de `a` (la route) à `b` (l'attendu) sur les seules clés de `b`, montants au centime. */
function ecarts(a, b, chemin = '$', out = []) {
  if (typeof b === 'number') { if (typeof a !== 'number' || !egalAuCentime(a, b)) out.push(`${chemin} : ${JSON.stringify(a)} ≠ ${b}`); return out }
  if (b && typeof b === 'object') { if (!a || typeof a !== 'object') { out.push(`${chemin} : ${JSON.stringify(a)}, un objet attendu`); return out } for (const k of Object.keys(b)) ecarts(a[k], b[k], `${chemin}.${k}`, out); return out }
  if (a !== b && !(a == null && b == null)) out.push(`${chemin} : ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`)
  return out
}
const texteDe = (html) => String(html).replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#x?a0;/gi, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&#x2248;|&#8776;|&asymp;/gi, '≈').replace(/\s+/g, ' ').trim()

// ═══ Le processus enfant ════════════════════════════════════════════════════════════════════════════════════════════════
if (o.enfant === 'complet') {
  const C = jeu('commandes.json'), J = jeu('jeux.json')
  figerHorloge(J.stripe.maintenant)
  const FIXE = Date.now()
  const veilleEnPanne = o.drapeaux.has('veille-en-panne')
  const { D, reseau } = await preparerEnfant({ racines: [RAC], doubles: veilleEnPanne ? { ...DOUBLES, 'lib/direction/veilleTresorerie': 'veille' } : DOUBLES })
  const E = D.etat
  const suivi = { reseau, inconnues: E.inconnues }
  const res = { criteres: {} }
  const conf = (extra = {}) => ({ tables: { sites_commandes: structuredClone(C.ventes_tuile), achats: structuredClone(J.achats), reglages_globaux: structuredClone(J.reglages) }, stripe: J.stripe, coutIA: { usd: 10 }, ...extra })
  const minuit = (() => { const d = new Date(FIXE); d.setUTCHours(0, 0, 0, 0); return Math.floor(d.getTime() / 1000) })()

  if (veilleEnPanne) {
    // TA-5, partie exécutée : la veille lève, tourLivraison rend son bilan et envoie ses e-mails.
    await jugerDans(res, 'TA-5', async () => {
      const e = []
      // 026-141 : bus hors du périmètre TA-5, réponses exactes sur ses deux lectures/clôtures.
      // Toute autre RPC ou argument reste refusé par la doublure historique.
      const baseBus = (await import(pathToFileURL(DOUBLURES).href + '?m=supabaseAdmin')).supabaseAdmin
      const rpcAvant = baseBus.rpc
      baseBus.rpc = function (nom, args) {
        if (nom === 'ops_interrupteur' && args?.p_nom === 'pause_generale') return Promise.resolve({ data: false, error: null })
        if (nom === 'ops_tache_clore' && args?.p_agent === 'livreur' && /^livrer_site:/.test(args?.p_cle ?? '') && /^supabase:\/\/sites_commandes\//.test(args?.p_preuve_url ?? '')) return Promise.resolve({ data: 'absente', error: null })
        return rpcAvant.call(this, nom, args)
      }
      const sl = await importer(RAC, MODULE_LIV)
      if (typeof sl.m?.tourLivraison !== 'function') return { echecs: [`${MODULE_LIV} : tourLivraison introuvable (${sl.erreur ?? 'export absent'})`] }
      D.reinitialiser({ tables: { sites_commandes: [structuredClone(C.idempotence)] }, dns: jeu('dns.json').domaines })
      const envois = []
      // Usine vide : la seule lecture attendue est list('') du bucket usine ; le reste reste piégé.
      const storage = { from: (nom) => nom === 'usine' ? { list: async (prefixe, options) => prefixe === '' ? { data: [], error: null } : D.supabaseAdmin.storage.from(nom).list(prefixe, options) } : D.supabaseAdmin.storage.from(nom) }
      const deps = { base: { ...D.supabaseAdmin, storage }, envoyer: async (x) => { envois.push(x); return { ok: true, id: `temoin-${envois.length}` } }, statutDomaine: D.getStatus, maintenant: () => new Date(FIXE) }
      let bilan
      try { bilan = await sl.m.tourLivraison(deps) } catch (err) { return { echecs: [`tourLivraison lève quand la veille lève (${premiereLigne(err)})`] } }
      if (!E.veilleAppels) e.push('tourLivraison n’appelle pas veilleTresorerie()')
      if (!bilan || typeof bilan !== 'object') e.push(`tourLivraison rend ${court(JSON.stringify(bilan), 60)}, son bilan attendu`)
      if (envois.length !== 2) e.push(`${envois.length} e-mail(s) envoyé(s) par tourLivraison, 2 attendus (commande en ligne jamais prévenue)`)
      return { echecs: e, detail: `veilleTresorerie doublée qui lève : tourLivraison l'appelle, rend quand même son bilan (${court(JSON.stringify(bilan), 60)}) et envoie ses ${envois.length} e-mails` }
    }, suivi)
    resultatEnfant(JUGE, res)
  } else {
    const route = await importer(RAC, ROUTE)
    const st = await importer(RAC, 'lib/direction/stripe.ts'), tr = await importer(RAC, 'lib/direction/tresorerie.ts'), al = await importer(RAC, 'lib/alertes.ts')
    const fr = await importer(RAC, 'lib/direction/fraicheur.ts')
    // Chaque scénario repart de doublures neuves ET d'un cache vide (sourcer garde 90 s ce qu'il a lu).
    const neuf = (extra) => { D.reinitialiser(conf(extra)); fr.m?.oublier?.() }
    const appeler = async () => {
      if (typeof route.m?.GET !== 'function') throw new Error(`${ROUTE} n'exporte pas GET (${route.erreur ?? 'export absent'})`)
      const r = await route.m.GET(new Request('https://prestiapp.fr/api/controle/tresorerie', { headers: { authorization: 'Bearer temoin' } }))
      const texte = await r.text()
      let json = null
      try { json = JSON.parse(texte) } catch { /* pas du JSON */ }
      return { status: r.status, json, texte }
    }
    let rendusTA6 = null

    await jugerDans(res, 'TA-3', async () => {
      const e = []
      neuf()
      const r = await appeler()
      if (r.status !== 200 || !r.json) return { echecs: [`GET ${ROUTE} : ${r.status} ${court(r.texte, 120)}`] }
      const S = st.m ?? {}, T = tr.m ?? {}
      const attendu = {}
      attendu.jour = valeurDe(await S.encaisseDuJour?.())
      attendu.sept_jours = valeurDe(await S.encaisseSur7Jours?.())
      attendu.mois = valeurDe(await S.encaisseDuMois?.())
      attendu.mrr = valeurDe(await S.mrr?.())
      const reg = Object.fromEntries(J.reglages.map((x) => [x.cle, x.valeur]))
      const ca = valeurDe(await T.caDeLAnnee?.())
      attendu.tva = T.situerTva?.(ca ?? null, reg)
      attendu.ventes = T.ventesSites?.(structuredClone(C.ventes_tuile))
      const debutMois = new Date(FIXE).toISOString().slice(0, 8) + '01'
      const achatsMoisCents = J.achats.filter((a) => a.date_facture >= debutMois).reduce((n, a) => n + a.ttc_cents, 0)
      const cout = await al.m?.coutIADuMois?.()
      const coutIaEur = cout && !cout.erreur ? cout.usd * (Number(process.env.TAUX_USD_EUR) || 0.92) : null
      attendu.marge = T.margeDuMois?.({ encaisse: attendu.mois, achatsMoisCents, coutIaEur })
      for (const [k, v] of Object.entries(attendu)) if (v === undefined || v === null) e.push(`la fonction de ${k} ne rend rien sur la doublure (harnais ou bibliothèque à revoir)`)
      const J2 = r.json
      e.push(...ecarts(valeurDe(J2.encaisse?.jour), attendu.jour, 'encaisse.jour'))
      e.push(...ecarts(valeurDe(J2.encaisse?.sept_jours), attendu.sept_jours, 'encaisse.sept_jours'))
      e.push(...ecarts(valeurDe(J2.encaisse?.mois), attendu.mois, 'encaisse.mois'))
      e.push(...ecarts(valeurDe(J2.mrr), attendu.mrr, 'mrr'))
      e.push(...ecarts(valeurDe(J2.tva), attendu.tva, 'tva'))
      e.push(...ecarts(valeurDe(J2.ventes_sites), attendu.ventes, 'ventes_sites'))
      e.push(...ecarts(valeurDe(J2.marge), attendu.marge, 'marge'))
      const ci = valeurDe(J2.cout_ia)
      const ciOk = typeof ci === 'number' ? egalAuCentime(ci, coutIaEur) : ci && typeof ci === 'object' ? (ecarts(ci, cout ?? {}).length === 0 || egalAuCentime(ci.eur ?? ci.euros ?? ci.valeur, coutIaEur)) : false
      if (!ciOk) e.push(`cout_ia : ${court(JSON.stringify(J2.cout_ia), 80)}, ni coutIADuMois() (${JSON.stringify(cout)}) ni ${coutIaEur} € attendu`)
      if (E.stripe.ecritures.length) e.push(`écriture Stripe : ${E.stripe.ecritures.map((x) => `${x.ressource}.${x.methode}`).join(', ')}`)
      const garde = E.gardeAppels.join(' → ')
      if (!/estFondateur/.test(garde) || !/exigerDomaine:comptabilite:voir/.test(garde)) e.push(`garde : ${garde || 'aucun appel'}`)
      return { echecs: e, detail: `route exécutée avec les doublures : encaisse (jour, 7 jours, mois), mrr, tva, ventes_sites, marge et cout_ia égaux au centime à ce que rendent encaisseDuJour, encaisseSur7Jours, encaisseDuMois, mrr, situerTva(caDeLAnnee), ventesSites, margeDuMois et coutIADuMois appelées seules sur les mêmes doublures` }
    }, suivi)

    await jugerDans(res, 'TA-4', () => {
      const e = []
      const v = { m: null }
      return (async () => {
        const x = await importer(RAC, VEILLE)
        v.m = x.m
        if (typeof x.m?.alertesTresorerie !== 'function') return { echecs: [`${VEILLE} : alertesTresorerie introuvable (${x.erreur ?? 'export absent'})`] }
        const semaines = new Set()
        const corps = []
        for (const c of J.veille.cas) {
          let r
          try { r = x.m.alertesTresorerie(geler(structuredClone(c.tva)), new Date(c.maintenant)) } catch (err) { e.push(`« ${c.nom} » : lève (${premiereLigne(err)})`); continue }
          if (r && typeof r.then === 'function') { e.push(`« ${c.nom} » : une promesse, une fonction pure attendue`); continue }
          const l = Array.isArray(r) ? r : []
          if (!c.attendu) { if (l.length) e.push(`« ${c.nom} » : ${l.length} alerte(s), 0 attendue`); continue }
          if (l.length !== 1) { e.push(`« ${c.nom} » : ${l.length} alerte(s), 1 attendue`); continue }
          const a = l[0]
          const m = /^tva:(\d{4})-(\d{1,2}):(alerte|depasse)$/.exec(String(a.cle ?? ''))
          if (!m) e.push(`« ${c.nom} » : clé ${JSON.stringify(a.cle)}, tva:<année>-<semaine>:<alerte|depasse> attendue`)
          else { if (m[3] !== c.attendu) e.push(`« ${c.nom} » : clé ${a.cle}, suffixe ${c.attendu} attendu`); if (m[1] !== '2026') e.push(`« ${c.nom} » : année ${m[1]} dans la clé, 2026 attendue`); semaines.add(m[2]) }
          if (a.motif !== 'paiement') e.push(`« ${c.nom} » : motif ${a.motif}, paiement attendu`)
          if (a.a !== 'entreprise') e.push(`« ${c.nom} » : a = ${JSON.stringify(a.a)}, entreprise attendu`)
          corps.push({ nom: c.nom, corps: String(a.corps ?? '') })
        }
        if (semaines.size > 1) e.push(`deux lundis de la même semaine donnent deux semaines différentes : ${[...semaines].join(', ')}`)
        for (const x2 of corps) {
          if (!/prix/i.test(x2.corps)) e.push(`« ${x2.nom} » : le corps ne cite pas les prix affichés`)
          if (!/mentions\s+légales/i.test(x2.corps)) e.push(`« ${x2.nom} » : le corps ne cite pas les mentions légales`)
          if (!/STRIPE_TAXE_AUTO/.test(x2.corps)) e.push(`« ${x2.nom} » : le corps ne cite pas STRIPE_TAXE_AUTO`)
        }
        return { echecs: e, detail: `alertesTresorerie sur ${J.veille.cas.length} cas : lundi 0 h 30 à Paris (dimanche en UTC) à 80 % → 1 alerte « alerte » ; lundi dépassé → 1 « depasse » ; mardi 0 h 30 à Paris à 90 % → 0 ; lundi à 79 % → 0 ; chiffre inconnu → 0 ; clés tva:2026-<semaine>:…, motif paiement, à l'entreprise ; le corps cite prix, mentions légales et STRIPE_TAXE_AUTO` }
      })()
    }, suivi)

    await jugerDans(res, 'TA-6', async () => {
      const e = []
      const t = await importer(RAC, TUILE)
      const Tuile = t.m?.default ?? t.m?.TuileArgent
      if (typeof Tuile !== 'function') return { echecs: [`${TUILE} : composant introuvable (${t.erreur ?? 'ni export par défaut ni TuileArgent'})`] }
      const req = createRequire(pathToFileURL(path.join(R, 'package.json')).href)
      const React = req('react'), { renderToStaticMarkup } = req('react-dom/server')
      const rendre = async (extra, nom) => {
        neuf(extra)
        const r = await appeler()
        if (r.status !== 200 || !r.json) { e.push(`${nom} : la route répond ${r.status}`); return null }
        try { const html = renderToStaticMarkup(React.createElement(Tuile, { donnees: r.json })); return { html, texte: texteDe(html), json: r.json } } catch (err) { e.push(`${nom} : le rendu de la tuile lève (${premiereLigne(err)})`); return null }
      }
      // Une source en erreur (l'encaissé du jour : Stripe refuse cette lecture) et un coût IA absent (marge estimée).
      const panne = await rendre({ coutIA: null, stripe: { ...J.stripe, panneSur: (a) => a.ressource === 'balanceTransactions' && a.params?.created?.gte === minuit } }, 'source en erreur')
      const sain = await rendre({ coutIA: { usd: 10 } }, 'tout mesuré')
      rendusTA6 = { panne: panne?.texte ?? null, sain: sain?.texte ?? null }
      if (panne) {
        if (!/non mesuré/i.test(panne.texte)) e.push('source en erreur (encaissé du jour) : la tuile n’écrit pas « non mesuré »')
        if (valeurDe(panne.json.marge)?.estimation === true && !/≈|estimation/i.test(panne.texte)) e.push('marge estimée (coût IA absent) : la tuile n’écrit ni « ≈ » ni « estimation »')
        if (valeurDe(panne.json.marge)?.estimation !== true) e.push(`la route ne marque pas la marge estimée quand le coût IA manque (${court(JSON.stringify(panne.json.marge), 80)})`)
        if (!/data-tuile-argent/.test(panne.html)) e.push('la racine de la tuile ne porte pas data-tuile-argent (TA-8 la repère ainsi)')
      }
      if (sain) {
        if (/non mesuré/i.test(sain.texte)) e.push('tout mesuré : la tuile écrit quand même « non mesuré »')
        if (/≈/.test(sain.texte)) e.push('rien d’estimé : la tuile écrit quand même « ≈ »')
      }
      if (E.inconnues.some((x) => /supabaseClient/.test(x)) || reseau.length) e.push('la tuile appelle le réseau ou la base alors que ses données lui sont données')
      return { echecs: e, detail: `tuile rendue (react-dom/server) avec le JSON de la route : encaissé du jour en erreur → « non mesuré » ; coût IA absent → « ≈ »/« estimation » près de la marge ; tout mesuré → ni « non mesuré » ni « ≈ »` }
    }, suivi)
    res.rendus = rendusTA6
    resultatEnfant(JUGE, res)
  }
} else {

// ═══ Le juge ════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (o.inconnues.length || o.positionnels.length) refuserAppel(JUGE, `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (o.temoin && o.reel) refuserAppel(JUGE, '--temoin et --reel ne vont pas ensemble')
if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuserAppel(JUGE, `--racine introuvable : ${RAC}`)
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const IDS = o.temoin ? ['TA-5', 'TA-PV'] : ['TA-1', 'TA-2', 'TA-3', 'TA-4', 'TA-5', 'TA-6', 'TA-7', ...(o.reel ? ['TA-8'] : []), 'TA-PV']
const s = creerSortie(JUGE, IDS, `${JUGE} — fiche ${FICHE}, racine ${rel(RAC)}, mode ${o.temoin ? 'témoin' : o.reel ? 'réel' : 'complet'}`, { nr: o.temoin ? ['TA-5'] : [] })

let suite = true
let enfant = null, enfantVeille = null
if (!o.temoin) {
  // ── TA-1 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const route = lireRacine(RAC, ROUTE)
  if (route === null) {
    s.echoue('TA-1', `${ROUTE} absent : la route de la fiche ${FICHE} n'existe pas (encore)`)
    s.nonJuges(IDS.filter((x) => x !== 'TA-1' && x !== 'TA-PV'), `${ROUTE} absent (TA-1)`)
    suite = false
  } else {
    await s.critere('TA-1', () => {
      const sc = sansCommentaires(route)
      const g = corpsDeFonction(sc, 'GET')
      if (!g) return { echecs: [`${ROUTE} : pas de fonction GET`] }
      const inst = instructions(g.corps).filter((x) => !/^if\s*\(\s*!?\s*(?:estRefus|domaineRefuse)\s*\(/.test(x))
      const attendus = [[/\bactif\s*\(\s*['"]comptabilite['"]\s*\)/, "le drapeau actif('comptabilite')"], [/\bestFondateur\s*\(/, 'estFondateur(req)'], [/\bexigerDomaine\s*\(\s*\w+\s*,\s*['"]comptabilite['"]\s*,\s*['"]voir['"]\s*\)/, "exigerDomaine(f, 'comptabilite', 'voir')"]]
      const e = attendus.map(([re, nom], k) => (re.test(inst[k] ?? '') ? null : `instruction ${k + 1} de GET : « ${court(inst[k] ?? '(aucune)', 70)} », ${nom} attendu`)).filter(Boolean)
      return { echecs: e, detail: `${ROUTE} : GET commence par le drapeau, estFondateur puis exigerDomaine(f, 'comptabilite', 'voir'), dans cet ordre (lu dans le source, refus intercalés ignorés)` }
    })

    // ── TA-2 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
    await s.critere('TA-2', () => {
      const e = []
      const sc = sansCommentaires(route)
      const imps = importsDe(route)
      const specs = imps.map((x) => x.spec)
      for (const x of ['@/lib/direction/stripe', '@/lib/direction/tresorerie']) if (!specs.includes(x)) e.push(`la route n'importe rien de ${x}`)
      for (const x of specs) if ((/stripe/i.test(x) && x !== '@/lib/direction/stripe') || /controle\/compta/.test(x)) e.push(`la route importe « ${x} » : ses chiffres viennent de @/lib/direction/stripe, @/lib/direction/tresorerie et @/lib/alertes seulement`)
      for (const [re, nom] of [[/\.reduce\s*\(/, '.reduce('], [/\/\s*100\b/, '/ 100'], [/\*\s*100\b/, '* 100'], [/amount/, 'amount'], [/balanceTransactions/, 'balanceTransactions'], [/invoices\s*\.\s*list/, 'invoices.list']]) {
        const m = re.exec(sc)
        if (m) e.push(`la route contient ${nom} (ligne ${sc.slice(0, m.index).split('\n').length})`)
      }
      return { echecs: e, detail: 'la route tire ses chiffres de @/lib/direction/stripe et @/lib/direction/tresorerie (et @/lib/alertes) ; ni .reduce(, ni / 100, ni * 100, ni amount, ni balanceTransactions, ni invoices.list' }
    })

    enfant = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'complet', timeout: 180_000 })
    for (const id of ['TA-3', 'TA-4']) {
      const c = enfant.res?.criteres?.[id]
      if (c) s.juger(id, c.echecs, c.detail)
      else s.echoue(id, `l'enfant n'a rien rendu (code ${enfant.code}${enfant.erreur ? `, ${enfant.erreur}` : ''}) — ${court(enfant.sortie.trim().split(/\r?\n/).slice(-2).join(' | '), 200)}`)
    }
  }
}

// ── TA-5 (sa part de non-régression seule en --temoin) ──────────────────────────────────────────────────────────────────
if (o.temoin || suite) {
  const exact = !o.temoin
  if (exact && fs.existsSync(path.join(RAC, MODULE_LIV))) enfantVeille = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'complet', args: ['--veille-en-panne'], timeout: 120_000 })
  await s.critere('TA-5', () => {
    const e = []
    const bC = baseAvant(COMPTA_ECRAN, /\bTuileArgent\b/)
    const d = diffLignes(bC.texte ?? '', lireRacine(RAC, COMPTA_ECRAN) ?? '')
    const n = d.ajouts.length + d.retraits.length
    if (n > 3) e.push(`${COMPTA_ECRAN} : diff de ${n} lignes (base ${bC.commit.slice(0, 7)}), 3 au plus`)
    if (exact) {
      const ajoute = d.ajouts.map((x) => x.texte).join('\n')
      if (!/<TuileArgent\b/.test(ajoute)) e.push(`${COMPTA_ECRAN} ne monte pas <TuileArgent`)
      if (!/import\s+(?:TuileArgent|\{[^}]*\bTuileArgent\b[^}]*\})\s+from\s+['"][^'"]*TuileArgent['"]/.test(ajoute)) e.push(`${COMPTA_ECRAN} n'importe pas TuileArgent`)
    }
    const bL = baseAvant(MODULE_LIV, /\bveilleTresorerie\b/)
    const actuel = lireRacine(RAC, MODULE_LIV)
    const evolution = /\bcloreTacheLivraison\b/.test(actuel ?? '') ? retirerEvolutions(actuel, MODULE_LIV, ['771d765d', '49753f4c', '6d9a9c5a']) : { texte: actuel, echecs: [] }
    e.push(...evolution.echecs)
    const cur = evolution.texte
    if (cur === null && exact) e.push(`${MODULE_LIV} absent`)
    else if (cur !== null || bL.texte !== null) {
      const r = ajoutTryCatch(bL.texte, cur, { nom: 'veilleTresorerie', exact, dansFonction: exact || /\bveilleTresorerie\b/.test(cur ?? '') ? 'tourLivraison' : null })
      e.push(...r.echecs.map((x) => `${MODULE_LIV} (base ${bL.commit.slice(0, 7)}) : ${x}`))
    }
    const avantCron = texteA(bL.commit, ROUTE_CRON), cron = lireRacine(RAC, ROUTE_CRON)
    if ((avantCron ?? null) !== (cron ?? null)) e.push(`${ROUTE_CRON} a changé depuis ${bL.commit.slice(0, 7)}`)
    if (exact) {
      const c = enfantVeille?.res?.criteres?.['TA-5']
      if (!c) e.push(`exécution de tourLivraison avec une veille qui lève : l'enfant n'a rien rendu (code ${enfantVeille?.code}) — ${court(enfantVeille?.sortie?.trim().split(/\r?\n/).slice(-2).join(' | ') ?? '', 160)}`)
      else e.push(...c.echecs)
    }
    return { echecs: [...new Set(e)], detail: exact
      ? `${COMPTA_ECRAN} : ${n} ligne(s) de diff, monte TuileArgent ; ${MODULE_LIV} : un import de veilleTresorerie et un appel dans un try/catch à l'intérieur de tourLivraison (base ${bL.commit.slice(0, 7)}) ; ${enfantVeille?.res?.criteres?.['TA-5']?.detail ?? ''} ; ${ROUTE_CRON} inchangée`
      : `part de non-régression : ${COMPTA_ECRAN} change de ${n} ligne(s) (3 au plus) (base ${bC.commit.slice(0, 7)}) ; ${MODULE_LIV} ne change au plus que d'un try/catch autour de veilleTresorerie() (base ${bL.commit.slice(0, 7)}) ; ${ROUTE_CRON} n'a pas changé` }
  })
}

if (!o.temoin && suite) {
  const c = enfant?.res?.criteres?.['TA-6']
  if (c) s.juger('TA-6', c.echecs, c.detail)
  else s.echoue('TA-6', `l'enfant n'a rien rendu (code ${enfant?.code})`)
  if (enfant?.res?.rendus) {
    const d = dossierTravail(JUGE, 'rendus')
    fs.writeFileSync(path.join(d, 'tuile.txt'), `═══ source en erreur, coût IA absent ═══\n${enfant.res.rendus.panne ?? '(non rendu)'}\n\n═══ tout mesuré ═══\n${enfant.res.rendus.sain ?? '(non rendu)'}\n`)
  }
  await s.critere('TA-7', () => { const r = typecheck(RAC, JUGE); return { echecs: r.ok ? [] : [r.detail], detail: r.detail } })
}

// ── TA-8 (--reel) ────────────────────────────────────────────────────────────────────────────────────────────────────────
let codeMenage = 0
if (o.reel && suite) {
  if (!fichePass(FICHE)) { s.echoue('TA-8', `préalable absent : la fiche ${FICHE} n'est pas PASS (route et tuile déployées)`); s.finir(); process.exit(2) }
  chargerEnvLocal()
  const APP = (process.env.PRESTI_BASE_URL || 'https://prestiapp.fr').replace(/\/$/, '')
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) { s.echoue('TA-8', 'préalable absent : variables Supabase manquantes (.env.local)'); s.finir(); process.exit(2) }
  const { compteTest } = await import(pathToFileURL(path.join(R, 'scripts', 'lib', 'capture.mjs')).href)
  const { chromium } = await import('playwright')
  const e = []
  let compte = null, navigateur = null, captures = []
  try {
    compte = await compteTest('direction')
    const lireApi = async (chemin) => { const r = await fetch(`${APP}${chemin}`, { headers: { Authorization: `Bearer ${compte.sess.access_token}` }, signal: AbortSignal.timeout(60_000) }); return { status: r.status, json: await r.json().catch(() => null) } }
    const t = await lireApi('/api/controle/tresorerie'), c = await lireApi('/api/controle/compta')
    if (t.status === 404) { s.echoue('TA-8', 'préalable absent : /api/controle/tresorerie répond 404 (drapeau comptabilite baissé ou route non déployée)'); throw Object.assign(new Error('préalable'), { prealable: true }) }
    if (t.status !== 200 || c.status !== 200) e.push(`/api/controle/tresorerie ${t.status}, /api/controle/compta ${c.status} : 200 attendus`)
    else {
      const a = valeurDe(t.json?.encaisse?.mois), b = valeurDe(c.json?.ventes?.mois)
      for (const k of ['brut', 'frais', 'net', 'paiements']) if (!egalAuCentime(a?.[k], b?.[k])) e.push(`encaisse.mois.${k} = ${a?.[k]}, ventes.mois.${k} = ${b?.[k]} : égalité au centime attendue`)
      const ta = valeurDe(t.json?.tva) ?? {}, tb = c.json?.tva ?? {}
      for (const k of ['pourcent', 'alerte', 'depasse']) if (ta[k] !== tb[k]) e.push(`tva.${k} : ${JSON.stringify(ta[k])} (trésorerie) ≠ ${JSON.stringify(tb[k])} (compta)`)
    }
    navigateur = await chromium.launch()
    const dossier = dossierTravail(JUGE, 'captures')
    for (const [largeur, hauteur] of [[390, 844], [1440, 900]]) {
      const page = await navigateur.newPage({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1, locale: 'fr-FR' })
      await page.addInitScript((x) => { try { for (const [k, v] of Object.entries(x)) localStorage.setItem(k, v) } catch { /* stockage indisponible */ } }, { [compte.cleLocale]: JSON.stringify(compte.sess), 'presti.aide_vues': JSON.stringify(['visite:console']) })
      await page.goto(`${APP}/controle?onglet=comptabilite`, { waitUntil: 'load', timeout: 120_000 })
      const tuile = page.locator('[data-tuile-argent]').first()
      const visible = await tuile.waitFor({ state: 'visible', timeout: 60_000 }).then(() => true).catch(() => false)
      if (!visible) { e.push(`${largeur} × ${hauteur} : [data-tuile-argent] introuvable ou invisible`); await page.close(); continue }
      await tuile.scrollIntoViewIfNeeded().catch(() => {})
      const mesure = await page.evaluate(() => {
        const t = document.querySelector('[data-tuile-argent]')
        const r = t.getBoundingClientRect()
        // Le centre de la partie visible de la tuile (une tuile plus haute que l'écran a son centre hors champ).
        const haut = Math.max(r.top, 0), bas = Math.min(r.bottom, window.innerHeight)
        const cible = document.elementFromPoint(Math.min(Math.max(r.left + r.width / 2, 0), window.innerWidth - 1), Math.min(Math.max((haut + bas) / 2, 0), window.innerHeight - 1))
        return { dedans: !!cible && t.contains(cible), large: document.documentElement.scrollWidth, fenetre: window.innerWidth }
      })
      if (!mesure.dedans) e.push(`${largeur} × ${hauteur} : le centre de la tuile est couvert (elementFromPoint hors de la tuile)`)
      if (mesure.large > mesure.fenetre) e.push(`${largeur} × ${hauteur} : défilement horizontal (${mesure.large} px pour ${mesure.fenetre})`)
      const fichier = path.join(dossier, `comptabilite-${largeur}x${hauteur}.png`)
      await page.screenshot({ path: fichier })
      captures.push(fichier)
      const png = fs.readFileSync(fichier)
      const u = uniformite(png)
      if (png.length < 5000 || u.distincts < 16) e.push(`${largeur} × ${hauteur} : capture vide ou uniforme (${png.length} octets, ${u.distincts} valeurs d'octet distinctes)`)
      await page.close()
    }
  } catch (err) { if (!err?.prealable) e.push(`--reel interrompu : ${premiereLigne(err)}`) } finally {
    await navigateur?.close().catch(() => {})
    try {
      if (compte) {
        await compte.supprimer()
        // supprimer() ne lève jamais : on vérifie que le compte a bien disparu.
        const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
        const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${compte.id}`, { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` }, signal: AbortSignal.timeout(20_000) })
        if (r.status !== 404) { e.push(`ménage du compte d'essai : le compte ${compte.email} répond encore (${r.status})`); codeMenage = 1 }
      }
    } catch (err) { e.push(`ménage du compte d'essai : ${premiereLigne(err)}`); codeMenage = 1 }
  }
  if (!s.evalue('TA-8')) s.juger('TA-8', e, `${APP} : encaisse.mois (trésorerie) = ventes.mois (compta) au centime ; tva.pourcent, alerte, depasse identiques ; tuile visible (elementFromPoint en son centre) sans défilement horizontal à 390 × 844 et 1440 × 900 ; captures non vides et non uniformes (${captures.map((f) => rel(f)).join(', ')}) ; compte d'essai supprimé`)
  else { jugerPreuvesVides(s, 'TA', RAC, FICHE); s.finir(); process.exit(2) }
}

jugerPreuvesVides(s, 'TA', RAC, FICHE)
process.exit(codeMenage || s.finir())
}

/** Une capture est-elle uniforme ? Décompresse les IDAT du PNG et compte les valeurs d'octet distinctes. */
function uniformite(png) {
  try {
    const morceaux = []
    for (let i = 8; i + 8 <= png.length;) {
      const n = png.readUInt32BE(i), type = png.toString('ascii', i + 4, i + 8)
      if (type === 'IDAT') morceaux.push(png.subarray(i + 8, i + 8 + n))
      i += 12 + n
    }
    const brut = zlib.inflateSync(Buffer.concat(morceaux))
    const vus = new Set()
    for (let i = 0; i < brut.length && vus.size < 256; i += 7) vus.add(brut[i])
    return { distincts: vus.size }
  } catch { return { distincts: 0 } }
}
void lf
