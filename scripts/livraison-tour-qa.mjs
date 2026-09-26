// scripts/livraison-tour-qa.mjs — juge du tour de livraison : trois e-mails à l'artisan, retards, route et cron (fiche
// 026-018, lot A ; critères TL de 026-024), écrit par Claude Code AVANT le module qu'il juge. L'exécutant (Codex) qui le
// lance n'y touche jamais (CLAUDE.md:23).
//
//   node --import ./scripts/ts-loader.mjs scripts/livraison-tour-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
//
//   --racine=<d>  importe <d>/lib/siteLivraison.ts et <d>/lib/siteCommande.ts et lit les sources sous <d> (défaut : le
//                 dépôt). Les « diffs » de TL-8 se lisent contre la version d'avant la fiche, prise dans l'historique du
//                 dépôt qui contient ce script (le plus récent commit dont le fichier ne porte pas encore l'ajout).
//   --temoin      seulement la part de non-régression de TL-8 (NR : le diff de app/api/cron/relances/route.ts se limite à
//                 un appel de tourLivraison dans un try/catch au plus, celui de lib/alertes.ts à une entrée de
//                 CRONS_ATTENDUS au plus) et la règle commune des preuves vides (TL-PV).
//   --reel        Claude Code seulement, après l'application de 0103 et le déploiement : TL-10 contre
//                 PRESTI_BASE_URL (défaut https://prestiapp.fr), secrets lus dans .env.local sans rien afficher, trois
//                 commandes d'essai essai-026-lt-<horodatage> en @presti-test.invalid, ménage dans un finally (code 1 s'il
//                 échoue). Code 2 si 026-021 ou 026-024 n'est pas PASS, ou si une variable manque.
//
// Les modules sont importés dans un PROCESSUS ENFANT (ce même script, --enfant=complet), horloge figée au
// 2026-10-14T10:00:00Z, avec les doublures de scripts/fixtures/026-livraison-tresor/a/doublures.mjs à la place de
// lib/supabaseAdmin (base en mémoire, filtres sur un chemin JSON « courriels->payee » compris ; rpc et or() refusés),
// lib/email, lib/limites, lib/stripe, lib/vercelDomains (getStatus rend a/dns.json), lib/flags, lib/direction/garde et
// lib/alertes (envoyerAlertes consigné) : aucun réseau (fetch piégé), aucun e-mail, aucune base.
//
// Contrats que ce juge fixe pour 026-024 (a/commandes.json, a/dns.json, a/jeux.json) :
//   courrielsDus(commande) → la liste (ou l'ensemble) des clés dues parmi payee, generee, en_ligne ;
//   courrielPayee / courrielGeneree (commande), courrielEnLigne(commande, enregistrements) → { subject, text } ;
//   envoyerCourrielsDus(commandeId, deps) et commandesEnRetard(deps), deps = { base, envoyer, statutDomaine, maintenant } :
//     le juge passe base = la doublure de supabaseAdmin, envoyer = un sendEmail factice, statutDomaine = getStatus doublé,
//     maintenant = () => la date figée ; les alertes de retard passent par envoyerAlertes (lib/alertes) ou sont rendues ;
//   heuresOuvreesEntre(a: Date, b: Date) → un nombre d'heures.
// Les gabarits rendus (TL-3) sont écrits dans .orchestre/travail/livraison-tour-qa/courriels.txt (le juge n'écrit que
// sous .orchestre/travail/ : la fiche 026-024 recopie ce fichier dans ses preuves).
//
// Sortie : une ligne par critère, puis « livraison-tour-qa : PASS|FAIL ». Code 0 seulement si tout est vert ; 1 sinon ; 2
// si l'appel est invalide ou si un préalable de --reel manque. Un module absent fait échouer TL-1 avec son chemin ; les
// critères suivants sont alors « non jugés ». Écriture seulement sous .orchestre/travail/livraison-tour-qa/.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  R, lireOptions, refuserAppel, creerSortie, court, premiereLigne, jeu, lireRacine, dossierTravail, lancerEnfant,
  preparerEnfant, resultatEnfant, importer, figerHorloge, jugerDans, jugerPreuvesVides, sansCommentaires, corpsDeFonction,
  baseAvant, ajoutTryCatch, cronsAttendus, typecheck, chargerEnvLocal, marqueEssai, fichePass,
} from './fixtures/026-livraison-tresor/commun.mjs'

const JUGE = 'livraison-tour-qa'
const FICHE = '026-024'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const o = lireOptions(process.argv.slice(2))
const RAC = o.racine
const MODULE = 'lib/siteLivraison.ts', ROUTE = 'app/api/cron/livraison/route.ts', RELANCES = 'app/api/cron/relances/route.ts', ALERTES = 'lib/alertes.ts'
const EXPORTS = ['courrielsDus', 'courrielPayee', 'courrielGeneree', 'courrielEnLigne', 'envoyerCourrielsDus', 'heuresOuvreesEntre', 'commandesEnRetard', 'tourLivraison']
const DOUBLES = { 'lib/supabaseAdmin': 'supabaseAdmin', 'lib/email': 'email', 'lib/limites': 'limites', 'lib/stripe': 'stripe', 'lib/vercelDomains': 'vercelDomains', 'lib/flags': 'flags', 'lib/direction/garde': 'garde', 'lib/alertes': 'alertes' }
const INTERDIT_TL3 = /premi[eè]re page|classement|positionn|garanti|douze mois|12 mois/i
const geler = (x) => { if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.freeze(x); for (const v of Object.values(x)) geler(v) } return x }

// ═══ Le processus enfant ════════════════════════════════════════════════════════════════════════════════════════════════
if (o.enfant === 'complet') {
  const C = jeu('commandes.json'), J = jeu('jeux.json'), DNS = jeu('dns.json').domaines
  figerHorloge(C.retards.maintenant)
  const FIXE = Date.now()
  const { D, reseau } = await preparerEnfant({ racines: [RAC], doubles: DOUBLES })
  const E = D.etat
  const suivi = { reseau, inconnues: E.inconnues }
  const res = { criteres: {}, courriels: '' }
  D.reinitialiser({ dns: DNS })
  const sl = await importer(RAC, MODULE), sc = await importer(RAC, 'lib/siteCommande.ts')
  const L = sl.m ?? {}, SC = sc.m ?? {}

  await jugerDans(res, 'TL-1', () => {
    const e = []
    if (!sl.m) e.push(`${MODULE} ne s'importe pas : ${sl.erreur}`)
    else for (const n of EXPORTS) if (typeof L[n] !== 'function') e.push(`${MODULE} n'exporte pas la fonction ${n}`)
    return { echecs: e, detail: `${MODULE} exporte ${EXPORTS.join(', ')} (importé par ts-loader, doublures en place)` }
  }, suivi)

  await jugerDans(res, 'TL-2', () => {
    const e = []
    if (typeof L.courrielsDus !== 'function') return { echecs: ['courrielsDus absente (TL-1)'] }
    if (C.courriels_dus.length !== 8) e.push(`a/commandes.json : ${C.courriels_dus.length} cas, 8 attendus`)
    for (const c of C.courriels_dus) {
      let r
      try { r = L.courrielsDus(geler(structuredClone(c.commande))) } catch (err) { e.push(`« ${c.nom} » : courrielsDus lève (${premiereLigne(err)})`); continue }
      if (r && typeof r.then === 'function') { e.push(`« ${c.nom} » : courrielsDus rend une promesse, une fonction pure attendue`); continue }
      const lu = Array.isArray(r) ? r : r instanceof Set ? [...r] : null
      if (!lu) { e.push(`« ${c.nom} » : ${court(JSON.stringify(r), 60)}, une liste de clés attendue`); continue }
      if (JSON.stringify([...lu].sort()) !== JSON.stringify([...c.attendu].sort())) e.push(`« ${c.nom} » : ${JSON.stringify(lu)}, ${JSON.stringify(c.attendu)} attendu`)
    }
    return { echecs: e, detail: `courrielsDus sur les 8 cas de a/commandes.json (état × e-mails déjà partis ; brouillon et retirée : rien ; en ligne jamais prévenue : payee et en_ligne ; entrées gelées)` }
  }, suivi)

  await jugerDans(res, 'TL-3', () => {
    const e = []
    for (const n of ['courrielPayee', 'courrielGeneree', 'courrielEnLigne']) if (typeof L[n] !== 'function') e.push(`${n} absente (TL-1)`)
    if (typeof SC.PRIX_SITE_TEXTE !== 'string' || typeof SC.DELAI_ANNONCE !== 'string') e.push('PRIX_SITE_TEXTE ou DELAI_ANNONCE introuvable dans lib/siteCommande.ts')
    if (e.length) return { echecs: e }
    const G = C.gabarits
    const rendre = (nom, f) => {
      try {
        const r = f()
        if (r && typeof r.then === 'function') { e.push(`${nom} : une promesse, un gabarit pur attendu`); return null }
        if (typeof r?.subject !== 'string' || typeof r?.text !== 'string' || !r.subject.trim() || !r.text.trim()) { e.push(`${nom} : ${court(JSON.stringify(r), 80)}, { subject, text } non vides attendus`); return null }
        return r
      } catch (err) { e.push(`${nom} lève (${premiereLigne(err)})`); return null }
    }
    const recs = DNS['plomberie-temoin.fr']
    const rendus = {
      payee: rendre('courrielPayee', () => L.courrielPayee(geler(structuredClone(G.payee)))),
      generee: rendre('courrielGeneree', () => L.courrielGeneree(geler(structuredClone(G.generee)))),
      en_ligne_existant: rendre('courrielEnLigne (existant)', () => L.courrielEnLigne(geler(structuredClone(G.en_ligne_existant)), geler(structuredClone(recs)))),
      en_ligne_a_prendre: rendre('courrielEnLigne (à prendre)', () => L.courrielEnLigne(geler(structuredClone(G.en_ligne_a_prendre)), [])),
      en_ligne_aucun: rendre('courrielEnLigne (aucun)', () => L.courrielEnLigne(geler(structuredClone(G.en_ligne_aucun)), [])),
    }
    const tout = (r) => (r ? `${r.subject}\n${r.text}` : '')
    res.courriels = Object.entries(rendus).map(([k, r]) => `═══ ${k} ═══\nSujet : ${r?.subject ?? '(non rendu)'}\n\n${r?.text ?? ''}\n`).join('\n')
    const p = tout(rendus.payee)
    if (rendus.payee) {
      if (!p.includes(SC.PRIX_SITE_TEXTE)) e.push(`« payée » ne contient pas PRIX_SITE_TEXTE (« ${SC.PRIX_SITE_TEXTE} »)`)
      if (!/TVA non applicable/i.test(p)) e.push('« payée » ne contient pas « TVA non applicable »')
      if (!p.includes(SC.DELAI_ANNONCE)) e.push(`« payée » ne contient pas DELAI_ANNONCE (« ${SC.DELAI_ANNONCE} »)`)
    }
    for (const [k, r] of Object.entries(rendus)) { const m = INTERDIT_TL3.exec(tout(r)); if (m) e.push(`« ${k} » contient « ${m[0]} » (classement, garantie ou douze mois : interdits)`) }
    const ex = tout(rendus.en_ligne_existant)
    if (rendus.en_ligne_existant) for (const x of recs) for (const champ of ['type', 'name', 'value']) if (!ex.includes(x[champ])) e.push(`« en ligne, domaine existant » ne donne pas ${champ} = ${x[champ]}`)
    const ap = tout(rendus.en_ligne_a_prendre)
    if (rendus.en_ligne_a_prendre) {
      if (!/à votre nom/i.test(ap)) e.push('« en ligne, domaine à prendre » ne dit pas « à votre nom »')
      if (/nous achetons/i.test(ap)) e.push('« en ligne, domaine à prendre » dit « nous achetons »')
    }
    const au = tout(rendus.en_ligne_aucun)
    if (rendus.en_ligne_aucun && !au.includes(`/site-genere/${G.en_ligne_aucun.id}/`)) e.push(`« en ligne, sans domaine » ne donne pas /site-genere/${G.en_ligne_aucun.id}/`)
    return { echecs: e, detail: `gabarits rendus sur a/commandes.json : « payée » cite ${SC.PRIX_SITE_TEXTE}, « TVA non applicable » et ${SC.DELAI_ANNONCE} ; aucun ne promet classement, garantie ni douze mois ; « en ligne » donne type, nom et valeur de chaque enregistrement de a/dns.json (existant), « à votre nom » sans « nous achetons » (à prendre), /site-genere/<id>/ (aucun)` }
  }, suivi)

  // ── TL-4 et TL-5 : idempotence et destinataire, base en mémoire ────────────────────────────────────────────────────────
  const CMD = C.idempotence
  const envois = []
  let modeEnvoi = 'ok'
  const base = () => D.supabaseAdmin
  const ligneBase = () => (E.tables.sites_commandes ?? []).find((l) => l.id === CMD.id)
  const cles = () => Object.keys(ligneBase()?.courriels ?? {}).filter((k) => (ligneBase()?.courriels ?? {})[k] != null)
  const envoyer = async (opts) => {
    envois.push({ opts: structuredClone(opts), reservees: cles().length })
    if (modeEnvoi === 'refuse') return { ok: false, error: 'envoi refusé (doublure de TL-4)' }
    if (modeEnvoi === 'leve') throw new Error('envoi en panne (doublure de TL-4)')
    return { ok: true, id: `temoin-${envois.length}` }
  }
  const deps = () => ({ base: base(), envoyer, statutDomaine: D.getStatus, maintenant: () => new Date(FIXE) })
  const passer = async () => { try { await L.envoyerCourrielsDus(CMD.id, deps()); return null } catch (err) { return premiereLigne(err) } }
  const scenarioA = []
  await jugerDans(res, 'TL-4', async () => {
    const e = []
    if (typeof L.envoyerCourrielsDus !== 'function') return { echecs: ['envoyerCourrielsDus absente (TL-1)'] }
    const neuf = () => { D.reinitialiser({ tables: { sites_commandes: [structuredClone(CMD)] }, dns: DNS }); envois.length = 0; modeEnvoi = 'ok' }
    // 1er et 2e passage.
    neuf()
    const x1 = await passer()
    const n1 = envois.length
    scenarioA.push(...envois.map((v) => v.opts))
    if (x1) e.push(`1er passage : envoyerCourrielsDus lève (${x1})`)
    if (n1 !== 2) e.push(`1er passage sur une commande en ligne jamais prévenue : ${n1} envoi(s), 2 attendus (payee, en_ligne)`)
    if (JSON.stringify(cles().sort()) !== JSON.stringify(['en_ligne', 'payee'])) e.push(`après le 1er passage, courriels porte ${JSON.stringify(cles())}, payee et en_ligne attendus`)
    envois.forEach((v, k) => { if (v.reservees < k + 1) e.push(`envoi ${k + 1} parti avant sa réservation (${v.reservees} clé(s) posée(s) au moment de l'envoi) : réserver d'abord, envoyer ensuite`) })
    const x2 = await passer()
    if (x2) e.push(`2e passage : envoyerCourrielsDus lève (${x2})`)
    if (envois.length !== n1) e.push(`2e passage : ${envois.length - n1} envoi(s), 0 attendu`)
    // Un envoi qui échoue (refusé, puis qui lève) : la réservation est retirée, le passage suivant renvoie.
    for (const mode of ['refuse', 'leve']) {
      neuf(); modeEnvoi = mode
      await passer()
      const tentes = envois.length
      if (!tentes) e.push(`envoi ${mode === 'refuse' ? 'refusé' : 'qui lève'} : aucun envoi tenté`)
      if (cles().length) e.push(`envoi ${mode === 'refuse' ? 'refusé' : 'qui lève'} : la réservation n'est pas retirée (courriels porte ${JSON.stringify(cles())})`)
      modeEnvoi = 'ok'
      await passer()
      if (envois.length - tentes !== 2) e.push(`après un envoi ${mode === 'refuse' ? 'refusé' : 'qui lève'}, le passage suivant fait ${envois.length - tentes} envoi(s), 2 attendus`)
    }
    // Deux passages en même temps : un envoi par clé.
    neuf()
    await Promise.all([passer(), passer()])
    const sujets = envois.map((v) => v.opts?.subject)
    if (envois.length !== 2 || new Set(sujets).size !== 2) e.push(`deux passages en même temps : ${envois.length} envoi(s) (${sujets.map((x) => court(x, 30)).join(' | ')}), 2 distincts attendus`)
    return { echecs: [...new Set(e)], detail: `base en mémoire, envoyer factice : 1er passage → 2 envois (payee, en_ligne), chacun réservé avant de partir ; 2e passage → 0 ; envoi refusé ou qui lève → réservation retirée, le passage suivant renvoie les 2 ; deux passages simultanés → 1 envoi par clé` }
  }, suivi)

  await jugerDans(res, 'TL-5', () => {
    const e = []
    if (!scenarioA.length) return { echecs: ['aucun envoi observé (TL-4)'] }
    for (const [k, v] of scenarioA.entries()) {
      if (v?.to !== CMD.email) e.push(`envoi ${k + 1} : destinataire ${JSON.stringify(v?.to)}, ${CMD.email} (commande.email) attendu`)
      if (v?.critique !== true) e.push(`envoi ${k + 1} : critique = ${JSON.stringify(v?.critique)}, true attendu`)
      if (v && 'fromName' in v && v.fromName !== undefined) e.push(`envoi ${k + 1} : fromName = ${JSON.stringify(v.fromName)} (aucun attendu)`)
      for (const autre of ['cc', 'bcc', 'cci', 'destinataires']) if (v && v[autre] != null) e.push(`envoi ${k + 1} : ${autre} = ${JSON.stringify(v[autre])} (aucun autre destinataire)`)
    }
    const directs = E.emails.filter((m) => m.genre === 'sendEmail')
    if (directs.length) e.push(`${directs.length} envoi(s) par lib/email au lieu de deps.envoyer (destinataires ${directs.map((m) => m.to).join(', ')})`)
    return { echecs: e, detail: `${scenarioA.length} envois vers commande.email seulement, critique: true, sans fromName` }
  }, suivi)

  await jugerDans(res, 'TL-6', () => {
    const e = []
    if (typeof L.heuresOuvreesEntre !== 'function') return { echecs: ['heuresOuvreesEntre absente (TL-1)'] }
    for (const c of J.heures.cas) {
      let r
      try { r = L.heuresOuvreesEntre(new Date(c.a), new Date(c.b)) } catch (err) { e.push(`« ${c.nom} » : lève (${premiereLigne(err)})`); continue }
      if (typeof r !== 'number' || Math.abs(r - c.attendu) > 1e-9) e.push(`« ${c.nom} » : ${JSON.stringify(r)}, ${c.attendu} attendu`)
    }
    return { echecs: e, detail: J.heures.cas.map((c) => `${c.nom} = ${c.attendu}`).join(' ; ') }
  }, suivi)

  await jugerDans(res, 'TL-7', async () => {
    const e = []
    if (typeof L.commandesEnRetard !== 'function') return { echecs: ['commandesEnRetard absente (TL-1)'] }
    const T = C.retards
    // Le jeu d'essai d'abord : ses dossiers « complets » le sont-ils au sens d'erreursAvantPaiement de la racine ?
    if (typeof SC.erreursAvantPaiement === 'function') {
      for (const l of T.lignes) {
        const n = SC.erreursAvantPaiement(structuredClone(l)).length
        if (T.complets.includes(l.id) && n) e.push(`jeu d'essai : ${l.id} devrait être complet (${n} erreur(s) d'erreursAvantPaiement)`)
        if (T.incomplets.includes(l.id) && !n) e.push(`jeu d'essai : ${l.id} devrait être incomplet`)
      }
    }
    D.reinitialiser({ tables: { sites_commandes: structuredClone(T.lignes) }, dns: DNS })
    let rendu
    try { rendu = await L.commandesEnRetard({ base: D.supabaseAdmin, envoyer, statutDomaine: D.getStatus, maintenant: () => new Date(FIXE) }) } catch (err) { return { echecs: [...e, `commandesEnRetard lève (${premiereLigne(err)})`] } }
    const alertes = E.alertes.length ? E.alertes : Array.isArray(rendu) ? rendu.filter((a) => a && typeof a === 'object' && 'cle' in a) : []
    const cles = alertes.map((a) => a.cle).sort()
    if (JSON.stringify(cles) !== JSON.stringify([...T.attendus].sort())) e.push(`alertes ${JSON.stringify(cles)}, ${JSON.stringify(T.attendus)} attendues`)
    const pieges = T.lignes.flatMap((l) => [l.email, l.entreprise, l.matiere?.artisan?.nom, l.matiere?.artisan?.prenom]).filter((x) => typeof x === 'string' && x.length >= 3)
    for (const a of alertes) {
      if (a.motif !== 'paiement') e.push(`${a.cle} : motif ${a.motif}, « paiement » attendu`)
      if (a.a !== 'entreprise') e.push(`${a.cle} : a = ${JSON.stringify(a.a)}, « entreprise » attendu`)
      const sujet = String(a.sujet ?? '')
      if (!sujet.trim()) e.push(`${a.cle} : sujet vide`)
      if (/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.test(sujet)) e.push(`${a.cle} : le sujet contient une adresse e-mail`)
      for (const p of pieges) if (sujet.toLowerCase().includes(p.toLowerCase())) e.push(`${a.cle} : le sujet contient « ${p} »`)
    }
    return { echecs: [...new Set(e)], detail: `jeu de retards (mercredi 14/10/2026 12 h à Paris) : exactement ${T.attendus.length} alertes (payée 50 h ouvrées, générée 52 h, validée 74 h) ; aucune pour les commandes à jour, le dossier incomplet, le brouillon, la commande en ligne ou retirée ; motif paiement, à l'entreprise, sujets sans adresse ni nom` }
  }, suivi)

  resultatEnfant(JUGE, res)
} else {

// ═══ Le juge ════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (o.inconnues.length || o.positionnels.length) refuserAppel(JUGE, `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (o.temoin && o.reel) refuserAppel(JUGE, '--temoin et --reel ne vont pas ensemble')
if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuserAppel(JUGE, `--racine introuvable : ${RAC}`)
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const IDS = o.temoin ? ['TL-8', 'TL-PV'] : ['TL-1', 'TL-2', 'TL-3', 'TL-4', 'TL-5', 'TL-6', 'TL-7', 'TL-8', 'TL-9', ...(o.reel ? ['TL-10'] : []), 'TL-PV']
const s = creerSortie(JUGE, IDS, `${JUGE} — fiche ${FICHE}, racine ${rel(RAC)}, mode ${o.temoin ? 'témoin' : o.reel ? 'réel' : 'complet'}`, { nr: o.temoin ? ['TL-8'] : [] })

let suite = true
if (!o.temoin) {
  if (!fs.existsSync(path.join(RAC, MODULE))) {
    s.echoue('TL-1', `${MODULE} absent : le module de la fiche ${FICHE} n'existe pas (encore)`)
    s.nonJuges(IDS.filter((x) => x !== 'TL-1' && x !== 'TL-PV'), `${MODULE} absent (TL-1)`)
    suite = false
  } else {
    const r = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'complet', timeout: 120_000 })
    if (!r.res) {
      s.echoue('TL-1', `l'enfant qui importe ${MODULE} n'a rien rendu (code ${r.code}${r.erreur ? `, ${r.erreur}` : ''}) — ${court(r.sortie.trim().split(/\r?\n/).slice(-2).join(' | '), 200)}`)
      s.nonJuges(['TL-2', 'TL-3', 'TL-4', 'TL-5', 'TL-6', 'TL-7'], 'enfant sans résultat (TL-1)')
    } else {
      if (r.res.courriels) {
        const d = dossierTravail(JUGE, 'gabarits')
        fs.writeFileSync(path.join(d, 'courriels.txt'), r.res.courriels)
        if (r.res.criteres['TL-3']) r.res.criteres['TL-3'].detail += ` ; rendus écrits dans ${rel(path.join(d, 'courriels.txt'))}`
      }
      for (const id of ['TL-1', 'TL-2', 'TL-3', 'TL-4', 'TL-5', 'TL-6', 'TL-7']) { const c = r.res.criteres[id]; if (c) s.juger(id, c.echecs, c.detail); else s.echoue(id, 'non rendu par l’enfant') }
    }
  }
}

// ── TL-8 (sa part de non-régression seule en --temoin) ──────────────────────────────────────────────────────────────────
if (o.temoin || suite) {
  await s.critere('TL-8', () => {
    const e = []
    const exact = !o.temoin
    if (exact) {
      const route = lireRacine(RAC, ROUTE)
      if (route === null) e.push(`${ROUTE} absent`)
      else {
        const sc = sansCommentaires(route)
        const g = corpsDeFonction(sc, 'GET')
        if (!g) e.push(`${ROUTE} : pas de fonction GET`)
        else {
          const corps = g.corps
          const iSecret = corps.search(/\bCRON_SECRET\b/)
          const i401 = corps.search(/\b401\b/)
          const iBase = corps.search(/\bsupabaseAdmin\b|\.from\s*\(|\.rpc\s*\(|\btourLivraison\s*\(|\bcreateClient\s*\(|\benvoyerCourrielsDus\s*\(|\bcommandesEnRetard\s*\(/)
          if (iSecret < 0) e.push(`${ROUTE} : GET ne lit pas CRON_SECRET`)
          if (i401 < 0) e.push(`${ROUTE} : GET ne répond jamais 401`)
          if (iBase >= 0 && (iSecret < 0 || i401 < 0 || iBase < Math.max(iSecret, i401))) e.push(`${ROUTE} : un appel à la base (« ${court(corps.slice(iBase, iBase + 30), 30)} ») précède la comparaison au secret`)
          if (iBase < 0) e.push(`${ROUTE} : GET n'appelle pas tourLivraison()`)
        }
        if (!/\bexport\s+const\s+maxDuration\s*=\s*60\b/.test(sc)) e.push(`${ROUTE} : maxDuration ne vaut pas 60`)
      }
    }
    const b1 = baseAvant(RELANCES, /\btourLivraison\b/)
    const r1 = ajoutTryCatch(b1.texte, lireRacine(RAC, RELANCES), { nom: 'tourLivraison', exact })
    e.push(...r1.echecs.map((x) => `${RELANCES} (base ${b1.commit.slice(0, 7)}) : ${x}`))
    const b2 = baseAvant(ALERTES, /nom:\s*['"]livraison['"]/)
    const avant = cronsAttendus(b2.texte), apres = cronsAttendus(lireRacine(RAC, ALERTES))
    if (!avant || !apres || !avant.lisibles || !apres.lisibles) e.push(`${ALERTES} : CRONS_ATTENDUS illisible`)
    else {
      const k = (x) => `${x.nom}:${x.maxHeures}`
      const ajoutes = apres.entrees.map(k).filter((x) => !avant.entrees.map(k).includes(x))
      const retires = avant.entrees.map(k).filter((x) => !apres.entrees.map(k).includes(x))
      if (retires.length) e.push(`${ALERTES} : entrée(s) retirée(s) de CRONS_ATTENDUS : ${retires.join(', ')}`)
      if (ajoutes.some((x) => x !== 'livraison:26') || ajoutes.length > 1) e.push(`${ALERTES} : entrée(s) ajoutée(s) ${ajoutes.join(', ')} (seule { nom: 'livraison', maxHeures: 26 } est permise)`)
      if (exact && JSON.stringify(ajoutes) !== JSON.stringify(['livraison:26'])) e.push(`${ALERTES} : { nom: 'livraison', maxHeures: 26 } absente de CRONS_ATTENDUS`)
      if (apres.reste.replace(/\s+/g, ' ') !== avant.reste.replace(/\s+/g, ' ')) e.push(`${ALERTES} (base ${b2.commit.slice(0, 7)}) : le fichier change hors de CRONS_ATTENDUS`)
    }
    return { echecs: [...new Set(e)], detail: exact
      ? `${ROUTE} : la comparaison au secret (401) précède tout appel à la base, maxDuration = 60 ; le diff de ${RELANCES} se limite à un appel de tourLivraison() dans un try/catch (base ${b1.commit.slice(0, 7)}) ; celui de ${ALERTES} à l'entrée { nom: 'livraison', maxHeures: 26 } (base ${b2.commit.slice(0, 7)})`
      : `part de non-régression : ${RELANCES} ne change au plus que d'un try/catch autour de tourLivraison() (base ${b1.commit.slice(0, 7)}, ${r1.blocs} bloc ajouté) ; ${ALERTES} au plus d'une entrée { nom: 'livraison', maxHeures: 26 } dans CRONS_ATTENDUS (base ${b2.commit.slice(0, 7)})` }
  })
}

// ── TL-9 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (!o.temoin && suite) await s.critere('TL-9', () => { const r = typecheck(RAC, JUGE); return { echecs: r.ok ? [] : [r.detail], detail: r.detail } })

// ── TL-10 (--reel) ───────────────────────────────────────────────────────────────────────────────────────────────────────
let codeMenage = 0
if (o.reel && suite) {
  for (const f of ['026-021', FICHE]) if (!fichePass(f)) { s.echoue('TL-10', `préalable absent : la fiche ${f} n'est pas PASS (0103 appliquée, tour déployé)`); s.finir(); process.exit(2) }
  chargerEnvLocal()
  const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, SECRET = process.env.CRON_SECRET
  const APP = (process.env.PRESTI_BASE_URL || 'https://prestiapp.fr').replace(/\/$/, '')
  if (!SB || !SVC || !SECRET) { s.echoue('TL-10', 'préalable absent : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou CRON_SECRET manque (.env.local)'); s.finir(); process.exit(2) }
  const marque = marqueEssai()
  const h = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
  const rest = (chemin, init = {}) => fetch(`${SB}/rest/v1/${chemin}`, { ...init, headers: { ...h, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(20_000) })
  const cron = (avecSecret) => fetch(`${APP}/api/cron/livraison`, { headers: avecSecret ? { Authorization: `Bearer ${SECRET}` } : {}, signal: AbortSignal.timeout(90_000) })
  const e = []
  try {
    const maintenant = new Date().toISOString()
    const lignes = [
      { email: `${marque}.payee@presti-test.invalid`, etat: 'payee', paye_le: maintenant, metier: 'Essai', entreprise: marque, domaine_mode: 'aucun' },
      { email: `${marque}.generee@presti-test.invalid`, etat: 'generee', paye_le: maintenant, genere_le: maintenant, metier: 'Essai', entreprise: marque, domaine_mode: 'aucun' },
      { email: `${marque}.en_ligne@presti-test.invalid`, etat: 'en_ligne', paye_le: maintenant, genere_le: maintenant, valide_le: maintenant, en_ligne_le: maintenant, metier: 'Essai', entreprise: marque, domaine_mode: 'aucun' },
    ]
    const ins = await rest('sites_commandes?select=id,etat', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(lignes) })
    if (ins.status !== 201) throw new Error(`insertion des commandes d'essai : ${ins.status} ${court(await ins.text(), 120)}`)
    const lire = async () => { const r = await rest(`sites_commandes?select=id,etat,courriels&email=like.${encodeURIComponent(`${marque}.%`)}`); return r.ok ? r.json() : null }
    const sans = await cron(false)
    if (sans.status !== 401) e.push(`GET ${APP}/api/cron/livraison sans secret : ${sans.status}, 401 attendu`)
    const r1 = await cron(true)
    if (r1.status !== 200) e.push(`1er appel avec le secret : ${r1.status} ${court(await r1.text(), 120)}`)
    const a1 = await lire()
    const attendu = { payee: ['payee'], generee: ['generee', 'payee'], en_ligne: ['en_ligne', 'payee'] }
    for (const l of a1 ?? []) if (JSON.stringify(Object.keys(l.courriels ?? {}).sort()) !== JSON.stringify(attendu[l.etat])) e.push(`commande ${l.etat} : courriels ${JSON.stringify(l.courriels)}, dates ${attendu[l.etat].join(' et ')} attendues`)
    const r2 = await cron(true)
    if (r2.status !== 200) e.push(`2e appel avec le secret : ${r2.status}`)
    const a2 = await lire()
    if (JSON.stringify(a2) !== JSON.stringify(a1)) e.push('le 2e appel a changé les dates de courriels')
  } catch (err) { e.push(`--reel interrompu : ${premiereLigne(err)}`) } finally {
    try {
      await rest(`sites_commandes?email=like.${encodeURIComponent(`${marque}.%`)}`, { method: 'DELETE' })
      const reste = await (await rest(`sites_commandes?select=id&email=like.${encodeURIComponent(`${marque}.%`)}`)).json().catch(() => null)
      if (!Array.isArray(reste) || reste.length) { e.push(`ménage incomplet : ${Array.isArray(reste) ? reste.length : '?'} commande(s) ${marque} restante(s)`); codeMenage = 1 }
    } catch (err) { e.push(`ménage interrompu : ${premiereLigne(err)}`); codeMenage = 1 }
  }
  s.juger('TL-10', e, `${APP} : sans secret → 401 ; avec le secret, les trois commandes d'essai (${marque}) reçoivent leurs dates dans courriels ; le 2e appel ne les change pas ; ménage fait`)
}

jugerPreuvesVides(s, 'TL', RAC, FICHE)
process.exit(codeMenage || s.finir())
}
