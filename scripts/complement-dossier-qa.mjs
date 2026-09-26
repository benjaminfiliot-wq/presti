// scripts/complement-dossier-qa.mjs — juge du dossier complété après paiement (fiche 026-023, lot B ; critères CD de
// 026-030), écrit par Claude Code AVANT le code qu'il juge. L'exécutant (codex) n'y touche jamais (CLAUDE.md:23).
//
//   node --import ./scripts/ts-loader.mjs scripts/complement-dossier-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
//
//   --racine=<d>  importe les modules et lit les sources sous <d> (défaut : le dépôt) ; HEAD et la référence (CD-3) sont
//                 ceux du dépôt git.
//   --temoin      seulement CD-3 (NR) et la règle commune des preuves vides (CD-PV).
//   --reel        Claude Code seulement, après déploiement : CD-7 contre PRESTI_BASE_URL (défaut https://prestiapp.fr),
//                 .env.local chargé par le juge (rien n'est affiché) ; refusé (code 2) tant que 026-030 n'est pas PASS.
//
// Les modules sont importés dans un PROCESSUS ENFANT (ce même script, --enfant=complet), horloge figée, avec les doublures
// de scripts/fixtures/026-livraison-tresor/b/doublures.mjs : base en mémoire (journal ordonné des lectures, tables en panne
// sur demande), lib/authArtisan doublé (session ou 401), lib/siteAchatPublic doublé (rattacherCommandesParEmail consigné).
// CD-3 importe aussi la version de référence de lib/siteCommande.ts (commit de preuve-a.json, extraite par git show sous
// .orchestre/travail/complement-dossier-qa/reference/). Aucun réseau (fetch piégé).
//
// Critères (cahier du juge de 026-030) :
//   CD-1  la route app/api/site/commander/complement/route.ts exporte GET et PUT ; lib/siteCommande.ts exporte
//         erreursFabrication ; lib/siteCommandeServeur.ts exporte completerDossier et commandesACompleter. Un fichier absent :
//         les critères suivants sont « non jugés ».
//   CD-2  nettoyerBrouillon garde les prestations bornées (b/dossier-complement.json : 13e élément, HTML, doublon insensible
//         à la casse, un signe écartés ; 12 au plus ; 80 signes au plus) ; erreursFabrication d'un dossier complet sans
//         prestation rend exactement une erreur de plus qu'erreursAvantPaiement, qui parle de prestation.
//   CD-3  (NR) PRIX_SITE_CENTS, PRIX_SITE_TEXTE, DELAI_ANNONCE, ETATS, TRANSITIONS, LIBELLE_ETAT et le résultat
//         d'erreursAvantPaiement(nettoyerBrouillon(jeu)) sur les jeux d'essai de 025 sont identiques à la référence ;
//         scripts/parcours-commande-qa.mjs --temoin est vert (relancé seulement quand la racine est le dépôt).
//   CD-4  completerDossier sur une base en mémoire : commande de l'artisan payee sans genere_le → mise à jour ; autre compte
//         → aucune écriture ; generee ou genere_le posé → aucune écriture ; un corps qui tente etat, prix_cents,
//         stripe_session_id, paye_le, artisan_id, email, achat_public ou genere_le → ces champs ne sont pas écrits (l'objet de
//         mise à jour reçu par la doublure ne porte que domaine_mode, domaine, metier, metiers_secondaires, communes,
//         matiere, modifie_le).
//   CD-5  la route avec des doublures : drapeau baissé → 404 avant toute lecture ; sans session → 401 ; sans profil → 409 ;
//         GET appelle rattacherCommandesParEmail avant de lire sites_commandes et rend { commandes: [{ …, erreurs,
//         complet }] } ; PUT commande inconnue → 404, générée → 409, payée → 200 ; base en panne → 503.
//   CD-6  npm run typecheck (tsc --noEmit) vert sur la racine.
//   CD-7  (--reel) un compte d'essai et une commande payee d'essai ; PUT complet → erreurs: [] et complet: true ; PUT avec
//         la commande d'un autre compte d'essai → 404 ; ménage dans un finally.
//   CD-PV un fichier de 0 octet dans .orchestre/preuves/026-030/ est un échec (règle commune, tous les modes).
//
// Sortie : une ligne par critère, puis « complement-dossier-qa : PASS|FAIL ». Code 0 seulement si tout est vert ; 1 sinon ;
// 2 si l'appel est invalide ou un préalable absent. Écriture seulement sous .orchestre/travail/complement-dossier-qa/.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import {
  R, REFERENCE, TRAVAIL, lireOptions, refuserAppel, creerSortie, court, premiereLigne, lireRacine, lireJson, exportsNommes,
  jugerPreuvesVides, lancerEnfant, resultatEnfant, importer, figerHorloge, jugerDans, typecheck, chargerEnvLocal,
  fichePass, texteA, lancer, exigerSousTravail, marqueEssai,
} from './fixtures/026-livraison-tresor/commun.mjs'
import { preparerEnfantB, jeuB, DOUBLES_B, requeteJson, corpsJson } from './fixtures/026-livraison-tresor/b/enfant.mjs'

const JUGE = 'complement-dossier-qa'
const FICHE = '026-030'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const o = lireOptions(process.argv.slice(2), { connues: ['ref-dir'] })
const RAC = o.racine

const ROUTE = 'app/api/site/commander/complement/route.ts'
const LIB_SITE = 'lib/siteCommande.ts'
const LIB_SRV = 'lib/siteCommandeServeur.ts'
const CONSTANTES = ['PRIX_SITE_CENTS', 'PRIX_SITE_TEXTE', 'DELAI_ANNONCE', 'ETATS', 'TRANSITIONS', 'LIBELLE_ETAT']
const DOUBLES = { ...DOUBLES_B, 'lib/authArtisan': 'authArtisan', 'lib/siteAchatPublic': 'siteAchatPublic' }
const URL_ROUTE = 'https://prestiapp.fr/api/site/commander/complement'
const trier = (x) => (Array.isArray(x) ? x.map(trier) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, trier(x[k])])) : x)

// ═══ Le processus enfant ════════════════════════════════════════════════════════════════════════════════════════════════
if (o.enfant === 'complet' || o.enfant === 'temoin') {
  figerHorloge('2026-09-26T10:00:00Z')
  const REFDIR = o.valeurs['ref-dir']
  const { D, reseau } = await preparerEnfantB({ racines: [RAC, ...(REFDIR ? [REFDIR] : [])], doubles: DOUBLES })
  const E = D.etat
  const suivi = { reseau, inconnues: E.inconnues }
  const res = { criteres: {} }
  const J = jeuB('dossier-complement.json'), C = jeuB('commandes.json')
  const site = await importer(RAC, LIB_SITE)
  const jeu025 = (relatif) => { const j = lireJson(path.join(R, relatif)); return j }

  await jugerDans(res, 'CD-3', async () => {
    const e = []
    if (!site.m) return { echecs: [`${LIB_SITE} ne s'importe pas : ${site.erreur}`] }
    if (!REFDIR) return { echecs: ['version de référence de lib/siteCommande.ts non extraite'] }
    const ref = await importer(REFDIR, LIB_SITE)
    if (!ref.m) return { echecs: [`version de référence de ${LIB_SITE} : ${ref.erreur}`] }
    for (const c of CONSTANTES) {
      const a = JSON.stringify(trier(ref.m[c])), b = JSON.stringify(trier(site.m[c]))
      if (a !== b) e.push(`${c} : ${court(b, 60)}, ${court(a, 60)} attendu (référence ${String(REFERENCE).slice(0, 7)})`)
    }
    if (typeof site.m.nettoyerBrouillon !== 'function' || typeof site.m.erreursAvantPaiement !== 'function') e.push(`${LIB_SITE} n'exporte plus nettoyerBrouillon ou erreursAvantPaiement`)
    else {
      let n = 0
      for (const relatif of J.jeux_025) {
        let jeu
        try { jeu = jeu025(relatif) } catch (err) { e.push(`${relatif} illisible : ${premiereLigne(err)}`); continue }
        const avant = JSON.stringify(ref.m.erreursAvantPaiement(ref.m.nettoyerBrouillon(jeu))), apres = JSON.stringify(site.m.erreursAvantPaiement(site.m.nettoyerBrouillon(jeu)))
        if (avant !== apres) e.push(`${relatif} : erreursAvantPaiement a changé (${court(apres, 80)} ; référence ${court(avant, 80)})`)
        n++
      }
      if (!n) e.push('aucun jeu 025 lu')
    }
    return { echecs: e, detail: `${CONSTANTES.join(', ')} identiques à la référence ${String(REFERENCE).slice(0, 7)} ; erreursAvantPaiement(nettoyerBrouillon(jeu)) identique sur ${J.jeux_025.length} jeux 025` }
  }, suivi)

  if (o.enfant === 'complet') {
    const srv = await importer(RAC, LIB_SRV), route = await importer(RAC, ROUTE)
    const uid = C.artisans.artisan.id
    const reinit = (conf = {}) => D.reinitialiser({ drapeaux: { siteCommande: true, siteAchatPublic: true }, b: { uid, email: C.artisans.artisan.email, ...(conf.b ?? {}) }, ...conf })
    const lignes = () => E.tables.sites_commandes ?? []
    const ligne = (id) => lignes().find((l) => l.id === id)
    // Une écriture = une ligne réellement modifiée : une mise à jour conditionnelle qui ne trouve rien n'écrit rien.
    const majs = () => E.ecritures.filter((x) => (x.genre === 'update' || x.genre === 'upsert' || x.genre === 'insert') && x.lignes > 0)
    const tables = () => ({ sites_commandes: ['commande_payee_artisan', 'commande_autre_compte', 'commande_generee_artisan'].map((k) => structuredClone(C[k])), artisans: [structuredClone(C.artisans.artisan)] })
    const requete = (methode, corps, entetes = { authorization: 'Bearer jeton-doublure' }) => requeteJson(URL_ROUTE, { methode, corps, entetes })

    await jugerDans(res, 'CD-2', async () => {
      const e = []
      if (!site.m || typeof site.m.nettoyerBrouillon !== 'function') return { echecs: [`${LIB_SITE} : nettoyerBrouillon absente (${site.erreur ?? ''})`] }
      if (typeof site.m.erreursFabrication !== 'function') return { echecs: [`${LIB_SITE} : erreursFabrication absente`] }
      const complet = jeu025(J.dossier_complet)
      for (const c of J.prestations.cas) {
        let n
        try { n = site.m.nettoyerBrouillon({ ...complet, matiere: { ...complet.matiere, prestations: c.entree } }) } catch (err) { e.push(`« ${c.nom} » : nettoyerBrouillon lève (${premiereLigne(err)})`); continue }
        const p = n?.matiere?.prestations
        if (!Array.isArray(p)) { e.push(`« ${c.nom} » : matiere.prestations = ${court(JSON.stringify(p), 40)}, une liste attendue`); continue }
        if (c.attendu && JSON.stringify(p) !== JSON.stringify(c.attendu)) e.push(`« ${c.nom} » : ${court(JSON.stringify(p), 80)}, ${court(JSON.stringify(c.attendu), 80)} attendu`)
        if (c.au_plus !== undefined && p.length > c.au_plus) e.push(`« ${c.nom} » : ${p.length} prestation(s), ${c.au_plus} au plus`)
        if (c.sans_html && p.some((x) => /[<>]/.test(x))) e.push(`« ${c.nom} » : une balise reste (${court(JSON.stringify(p), 60)})`)
        if (c.au_plus_par_element && p.some((x) => x.length > c.au_plus_par_element)) e.push(`« ${c.nom} » : une prestation dépasse ${c.au_plus_par_element} signes`)
        if (p.length > 12) e.push(`« ${c.nom} » : ${p.length} prestations, 12 au plus`)
        if (p.some((x) => typeof x !== 'string' || x.trim().length < 2)) e.push(`« ${c.nom} » : une prestation de moins de 2 signes`)
      }
      const sans = site.m.nettoyerBrouillon({ ...complet, matiere: { ...complet.matiere, prestations: [] } })
      const eAvant = site.m.erreursAvantPaiement(sans), eFab = site.m.erreursFabrication(sans)
      if (eAvant.length) e.push(`le jeu ${J.dossier_complet} n'est pas complet pour erreursAvantPaiement (${court(eAvant.join(' | '), 80)}) : harnais à revoir`)
      if (!Array.isArray(eFab) || eFab.length !== eAvant.length + 1) e.push(`erreursFabrication sans prestation : ${Array.isArray(eFab) ? eFab.length : typeof eFab} erreur(s), ${eAvant.length + 1} attendue(s)`)
      else if (!/prestation/i.test(eFab.find((x) => !eAvant.includes(x)) ?? '')) e.push(`l'erreur ajoutée ne parle pas de prestation (« ${court(eFab.find((x) => !eAvant.includes(x)), 80)} »)`)
      const avec = site.m.nettoyerBrouillon({ ...complet, matiere: { ...complet.matiere, prestations: ['Dépannage'] } })
      if (site.m.erreursFabrication(avec).length !== site.m.erreursAvantPaiement(avec).length) e.push('avec une prestation, erreursFabrication ajoute encore une erreur')
      return { echecs: e, detail: `nettoyerBrouillon borne les prestations sur ${J.prestations.cas.length} cas (12 au plus, 80 signes, sans HTML ni doublon ni signe seul) ; erreursFabrication = erreursAvantPaiement + 1 erreur « prestation » sur le dossier complet sans prestation, + 0 avec une` }
    }, suivi)

    await jugerDans(res, 'CD-4', async () => {
      const e = []
      if (typeof srv.m?.completerDossier !== 'function') return { echecs: [`${LIB_SRV} : completerDossier absente (${srv.erreur ?? 'export absent'})`] }
      const payee = C.commande_payee_artisan
      reinit({ tables: tables() })
      let r = null
      try { r = await srv.m.completerDossier(uid, payee.id, J.complement_valide) } catch (err) { e.push(`commande payée : completerDossier lève (${premiereLigne(err)})`) }
      const l = ligne(payee.id)
      if (majs().length !== 1) e.push(`commande payée : ${majs().length} écriture(s), 1 attendue`)
      if (l?.metier !== J.complement_valide.metier || JSON.stringify(l?.communes) !== JSON.stringify(J.complement_valide.communes)) e.push(`commande payée : metier = ${JSON.stringify(l?.metier)}, communes = ${JSON.stringify(l?.communes)} ; le complément attendu`)
      if (JSON.stringify(l?.matiere?.prestations) !== JSON.stringify(J.complement_valide.matiere.prestations)) e.push(`commande payée : matiere.prestations = ${court(JSON.stringify(l?.matiere?.prestations), 60)}`)
      if (!r || typeof r !== 'object' || !Array.isArray(r.erreurs)) e.push(`commande payée : rendu ${court(JSON.stringify(r), 80)}, { commande, erreurs } attendu`)
      for (const [nom, id] of [['commande d\'un autre compte', C.commande_autre_compte.id], ['commande générée', C.commande_generee_artisan.id], ['commande inconnue', 'cmd-inconnue-026b']]) {
        reinit({ tables: tables() })
        try { await srv.m.completerDossier(uid, id, J.complement_valide) } catch { /* un refus qui lève est acceptable */ }
        if (majs().length) e.push(`${nom} : ${majs().length} écriture(s), 0 attendue`)
      }
      reinit({ tables: { sites_commandes: [{ ...structuredClone(payee), genere_le: '2026-09-26T09:00:00Z' }], artisans: tables().artisans } })
      try { await srv.m.completerDossier(uid, payee.id, J.complement_valide) } catch { /* idem */ }
      if (majs().length) e.push(`genere_le posé : ${majs().length} écriture(s), 0 attendue`)
      // Un corps qui tente les champs interdits.
      reinit({ tables: tables() })
      try { await srv.m.completerDossier(uid, payee.id, { ...J.complement_valide, ...J.corps_interdits }) } catch (err) { e.push(`corps avec champs interdits : lève (${premiereLigne(err)})`) }
      const m = majs()
      if (m.length !== 1) e.push(`corps avec champs interdits : ${m.length} écriture(s), 1 attendue`)
      else {
        const cles = Object.keys(m[0].valeurs ?? {})
        const interdites = cles.filter((k) => !J.champs_permis.includes(k))
        if (interdites.length) e.push(`l'objet de mise à jour porte ${interdites.join(', ')} (seuls ${J.champs_permis.join(', ')} sont permis)`)
      }
      const l2 = ligne(payee.id)
      for (const k of Object.keys(J.corps_interdits)) if (l2?.[k] !== payee[k]) e.push(`${k} a changé (${JSON.stringify(payee[k])} → ${JSON.stringify(l2?.[k])})`)
      return { echecs: e, detail: `completerDossier : commande payée sans genere_le → 1 mise à jour (metier, communes, matiere.prestations) et { commande, erreurs } ; autre compte, générée, inconnue, genere_le posé → 0 écriture ; ${Object.keys(J.corps_interdits).join(', ')} jamais écrits` }
    }, suivi)

    await jugerDans(res, 'CD-5', async () => {
      const e = []
      if (typeof route.m?.GET !== 'function' || typeof route.m?.PUT !== 'function') return { echecs: [`${ROUTE} n'exporte pas GET et PUT (${route.erreur ?? 'export absent'})`] }
      const payee = C.commande_payee_artisan
      // Drapeau baissé : 404 avant toute lecture.
      reinit({ drapeaux: { siteCommande: false, siteAchatPublic: true }, tables: tables() })
      let r = await route.m.GET(requete('GET'))
      if (r.status !== 404) e.push(`drapeau baissé → GET ${r.status}, 404 attendu`)
      if (E.b.journal.length) e.push(`drapeau baissé : ${E.b.journal.join(', ')} avant le 404`)
      r = await route.m.PUT(requete('PUT', { commande: payee.id, ...J.complement_valide }))
      if (r.status !== 404) e.push(`drapeau baissé → PUT ${r.status}, 404 attendu`)
      // Sans session : 401.
      reinit({ tables: tables(), b: { auth: 'refus401' } })
      r = await route.m.GET(requete('GET', undefined, {}))
      if (r.status !== 401) e.push(`sans session → GET ${r.status}, 401 attendu`)
      if (E.b.journal.some((j) => j === 'rattacherCommandesParEmail' || j === 'from:sites_commandes')) e.push('sans session : la base est lue ou le rattachement tenté')
      // Sans profil : 409.
      reinit({ tables: { ...tables(), artisans: [] } })
      r = await route.m.GET(requete('GET'))
      if (r.status !== 409) e.push(`sans profil → GET ${r.status}, 409 attendu`)
      // GET : rattachement d'abord, puis les commandes.
      reinit({ tables: tables() })
      r = await route.m.GET(requete('GET'))
      const corps = await corpsJson(r)
      if (r.status !== 200) e.push(`GET → ${r.status} (${court(JSON.stringify(corps), 80)}), 200 attendu`)
      const iRatt = E.b.journal.indexOf('rattacherCommandesParEmail'), iLecture = E.b.journal.indexOf('from:sites_commandes')
      if (iRatt < 0) e.push('GET n\'appelle pas rattacherCommandesParEmail')
      else if (iLecture >= 0 && iLecture < iRatt) e.push('GET lit sites_commandes avant rattacherCommandesParEmail')
      const ratt = E.b.rattachements[0]
      if (ratt && (ratt.uid !== uid || String(ratt.email).toLowerCase() !== C.artisans.artisan.email)) e.push(`rattacherCommandesParEmail(${JSON.stringify(ratt)}), (uid, adresse de la session) attendu`)
      const cmds = corps?.commandes
      if (!Array.isArray(cmds)) e.push(`GET : corps ${court(JSON.stringify(corps), 80)}, { commandes: [...] } attendu`)
      else {
        const c = cmds.find((x) => x?.id === payee.id)
        if (!c) e.push(`GET : la commande payée ${payee.id} manque (${cmds.map((x) => x?.id).join(', ') || 'aucune'})`)
        else { if (!Array.isArray(c.erreurs)) e.push('GET : erreurs absent sur la commande'); if (typeof c.complet !== 'boolean') e.push('GET : complet absent sur la commande') }
        if (cmds.some((x) => x?.id === C.commande_generee_artisan.id)) e.push('GET : une commande déjà générée est proposée à compléter')
      }
      // PUT : inconnue → 404, générée → 409, payée → 200.
      reinit({ tables: tables() })
      r = await route.m.PUT(requete('PUT', { commande: 'cmd-inconnue-026b', ...J.complement_valide }))
      if (r.status !== 404) e.push(`PUT commande inconnue → ${r.status}, 404 attendu`)
      r = await route.m.PUT(requete('PUT', { commande: C.commande_autre_compte.id, ...J.complement_valide }))
      if (r.status !== 404) e.push(`PUT commande d'un autre compte → ${r.status}, 404 attendu`)
      r = await route.m.PUT(requete('PUT', { commande: C.commande_generee_artisan.id, ...J.complement_valide }))
      if (r.status !== 409) e.push(`PUT commande générée → ${r.status}, 409 attendu`)
      r = await route.m.PUT(requete('PUT', { commande: payee.id, ...J.complement_valide }))
      const cp = await corpsJson(r)
      if (r.status !== 200) e.push(`PUT commande payée → ${r.status} (${court(JSON.stringify(cp), 80)}), 200 attendu`)
      if (ligne(payee.id)?.metier !== J.complement_valide.metier) e.push('PUT commande payée : le métier n\'est pas écrit')
      if (!Array.isArray(cp?.erreurs) && !Array.isArray(cp?.commande?.erreurs)) e.push(`PUT commande payée : erreurs absent du corps (${court(JSON.stringify(cp), 60)})`)
      // Base en panne : 503.
      reinit({ tables: tables(), b: { panneTables: ['sites_commandes'] } })
      r = await route.m.GET(requete('GET'))
      if (r.status !== 503) e.push(`base en panne → GET ${r.status}, 503 attendu (jamais un faux vide)`)
      r = await route.m.PUT(requete('PUT', { commande: payee.id, ...J.complement_valide }))
      if (r.status !== 503) e.push(`base en panne → PUT ${r.status}, 503 attendu`)
      return { echecs: e, detail: `route avec doublures : drapeau baissé → 404 sans lecture ; sans session → 401 ; sans profil → 409 ; GET → rattacherCommandesParEmail(uid, adresse de la session) avant sites_commandes, { commandes: [{ …, erreurs, complet }] } ; PUT inconnue et autre compte → 404, générée → 409, payée → 200 ; base en panne → 503` }
    }, suivi)
  }

  resultatEnfant(JUGE, res)
} else {
  // ═══ Le juge ══════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (o.inconnues.length || o.positionnels.length || o.valeurs['ref-dir']) refuserAppel(JUGE, `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels, ...(o.valeurs['ref-dir'] ? ['--ref-dir (option de l\'enfant)'] : [])].join(' ')}`)
  if (o.temoin && o.reel) refuserAppel(JUGE, '--temoin et --reel ne vont pas ensemble')
  if (o.reel && !o.racineParDefaut) refuserAppel(JUGE, '--reel se lance sur le dépôt, pas sur une copie')
  if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuserAppel(JUGE, `--racine introuvable : ${RAC}`)

  const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
  const mode = o.temoin ? 'témoin' : o.reel ? 'réel' : 'complet'
  const COMPLET = ['CD-1', 'CD-2', 'CD-3', 'CD-4', 'CD-5', 'CD-6']
  const IDS = o.temoin ? ['CD-3', 'CD-PV'] : [...COMPLET, ...(o.reel ? ['CD-7'] : []), 'CD-PV']
  const s = creerSortie(JUGE, IDS, `${JUGE} — fiche ${FICHE}, racine ${rel(RAC)}, mode ${mode}`, { nr: ['CD-3'] })
  let suite = true

  if (!o.temoin) {
    await s.critere('CD-1', () => {
      const e = []
      const r = lireRacine(RAC, ROUTE)
      if (r === null) e.push(`${ROUTE} absente`)
      else { const ex = exportsNommes(r); for (const n of ['GET', 'PUT']) if (!ex.includes(n)) e.push(`${ROUTE} n'exporte pas ${n}`) }
      const site = lireRacine(RAC, LIB_SITE)
      if (site === null) e.push(`${LIB_SITE} absent`)
      else if (!exportsNommes(site).includes('erreursFabrication')) e.push(`${LIB_SITE} n'exporte pas erreursFabrication`)
      const srv = lireRacine(RAC, LIB_SRV)
      if (srv === null) e.push(`${LIB_SRV} absent`)
      else for (const n of ['completerDossier', 'commandesACompleter']) if (!exportsNommes(srv).includes(n)) e.push(`${LIB_SRV} n'exporte pas ${n}`)
      return { echecs: e, detail: `${ROUTE} exporte GET et PUT ; ${LIB_SITE} exporte erreursFabrication ; ${LIB_SRV} exporte completerDossier et commandesACompleter` }
    })
    suite = !s.enEchec('CD-1')
    if (!suite) s.nonJuges(COMPLET.filter((id) => !['CD-1', 'CD-3'].includes(id)), 'CD-1 en échec')
  }

  // La version de référence de lib/siteCommande.ts (CD-3), extraite sous .orchestre/travail/complement-dossier-qa/reference/.
  let REFDIR = null
  {
    const texte = REFERENCE ? texteA(REFERENCE, LIB_SITE) : null
    if (texte !== null) {
      REFDIR = exigerSousTravail(path.join(TRAVAIL, JUGE, 'reference'))
      const f = path.join(REFDIR, LIB_SITE)
      fs.mkdirSync(path.dirname(f), { recursive: true })
      fs.writeFileSync(f, texte)
    }
  }

  {
    const complet = !o.temoin && suite
    const enfant = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: complet ? 'complet' : 'temoin', args: REFDIR ? [`--ref-dir=${REFDIR}`] : [], timeout: 240_000 })
    const rendu = (id) => enfant.res?.criteres?.[id] ?? null
    const manque = (id) => `l'enfant n'a rien rendu pour ${id} (code ${enfant.code}${enfant.erreur ? `, ${enfant.erreur}` : ''}) — ${court(enfant.sortie?.trim().split(/\r?\n/).filter((l) => !l.startsWith('@@')).slice(-2).join(' | ') ?? '', 200)}`
    if (complet) for (const id of ['CD-2']) { const c = rendu(id); if (c) s.juger(id, c.echecs, c.detail); else s.echoue(id, manque(id)) }
    {
      const c = rendu('CD-3')
      const e = [...(c?.echecs ?? [])]
      if (!c) e.push(manque('CD-3'))
      if (!REFDIR) e.push(`référence ${String(REFERENCE).slice(0, 7)} : ${LIB_SITE} introuvable dans le dépôt git`)
      let sous = 'parcours-commande-qa non relancé (racine ≠ dépôt : il ne juge que le dépôt)'
      if (o.racineParDefaut) {
        const r = lancer(process.execPath, ['scripts/parcours-commande-qa.mjs', '--temoin'], { timeout: 600_000 })
        const derniere = r.sortie.trim().split(/\r?\n/).filter(Boolean).at(-1) ?? ''
        if (r.code !== 0) e.push(`scripts/parcours-commande-qa.mjs --temoin : code ${r.code}${r.erreur ? ` (${r.erreur})` : ''} — ${court(r.sortie.split(/\r?\n/).find((l) => /^(❌|FAIL)/.test(l)) ?? derniere, 140)}`)
        sous = `scripts/parcours-commande-qa.mjs --temoin → code ${r.code} (« ${court(derniere, 60)} », ${r.duree.toFixed(0)} s)`
      }
      s.juger('CD-3', e, `${c?.detail ?? ''} ; ${sous}`)
    }
    if (complet) for (const id of ['CD-4', 'CD-5']) { const c = rendu(id); if (c) s.juger(id, c.echecs, c.detail); else s.echoue(id, manque(id)) }
  }

  if (!o.temoin && suite) await s.critere('CD-6', () => { const r = typecheck(RAC, JUGE); return { echecs: r.ok ? [] : [r.detail], detail: r.detail } })

  // ── CD-7 (--reel) ──────────────────────────────────────────────────────────────────────────────────────────────────────
  if (o.reel) {
    if (!fichePass(FICHE)) { s.echoue('CD-7', `préalable absent : la fiche ${FICHE} n'est pas PASS (route non déployée)`); s.finir(); process.exit(2) }
    chargerEnvLocal()
    const manque = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'].filter((k) => !process.env[k])
    if (manque.length) { s.echoue('CD-7', `préalable absent : ${manque.join(', ')} (.env.local)`); s.finir(); process.exit(2) }
    const BASE = (process.env.PRESTI_BASE_URL || 'https://prestiapp.fr').replace(/\/$/, '')
    const e = []
    const menage = []
    let detail = ''
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
      const marque = marqueEssai()
      const J = jeuB('dossier-complement.json')
      const compte = async (suffixe) => {
        const email = `${marque}-${suffixe}@presti-test.invalid`
        const motDePasse = crypto.randomBytes(24).toString('base64url')
        const { data: u, error: eU } = await admin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
        if (eU || !u?.user) throw new Error(`compte d'essai ${suffixe} : ${eU?.message ?? 'aucun utilisateur'}`)
        menage.push(async () => { const { error } = await admin.auth.admin.deleteUser(u.user.id); if (error) throw new Error(`ménage du compte ${suffixe} : ${error.message}`) })
        const { error: eA } = await admin.from('artisans').insert({ id: u.user.id, email, nom: `Essai ${marque} ${suffixe}`, metier: 'Plombier', slug: `${marque}-${suffixe}` })
        if (eA) throw new Error(`ligne artisans ${suffixe} : ${eA.message}`)
        menage.push(async () => { await admin.from('artisans').delete().eq('id', u.user.id) })
        const { data: lien, error: eL } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
        if (eL || !lien?.properties?.hashed_token) throw new Error(`generateLink ${suffixe} : ${eL?.message ?? 'pas de hashed_token'}`)
        const r = await fetch(`${BASE}/api/auth/lien`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ th: lien.properties.hashed_token }) })
        const c = await r.json().catch(() => ({}))
        if (r.status !== 200 || !c?.session?.access_token) throw new Error(`session d'essai ${suffixe} : POST /api/auth/lien → ${r.status}`)
        return { uid: u.user.id, email, jeton: c.session.access_token }
      }
      const A = await compte('a'), B = await compte('b')
      const commande = async (c) => {
        const id = crypto.randomUUID()
        const { error } = await admin.from('sites_commandes').insert({ id, artisan_id: c.uid, email: c.email, etat: 'payee', prix_cents: 30000, stripe_session_id: `cs_sim_${marque}_${id.slice(0, 8)}`, paye_le: new Date().toISOString(), domaine_mode: 'aucun', domaine: null, metier: '', metiers_secondaires: [], communes: [], matiere: {} })
        if (error) throw new Error(`commande d'essai : ${error.message}`)
        menage.push(async () => { const { error: eD } = await admin.from('sites_commandes').delete().eq('id', id); if (eD) throw new Error(`ménage de la commande ${id} : ${eD.message}`) })
        return id
      }
      const cmdA = await commande(A), cmdB = await commande(B)
      const complet = lireJson(path.join(R, J.dossier_complet))
      const put = (jeton, corps) => fetch(`${BASE}/api/site/commander/complement`, { method: 'PUT', headers: { 'content-type': 'application/json', Authorization: `Bearer ${jeton}` }, body: JSON.stringify(corps) })
      const r1 = await put(A.jeton, { commande: cmdA, domaine_mode: complet.domaine_mode, domaine: complet.domaine, metier: complet.metier, metiers_secondaires: complet.metiers_secondaires, communes: complet.communes, matiere: { ...complet.matiere, prestations: ['Escalier sur mesure', 'Dressing'] } })
      const c1 = await r1.json().catch(() => ({}))
      const erreurs = c1?.erreurs ?? c1?.commande?.erreurs, complet1 = c1?.complet ?? c1?.commande?.complet
      if (r1.status !== 200 || !Array.isArray(erreurs) || erreurs.length || complet1 !== true) e.push(`PUT complet → ${r1.status}, erreurs ${court(JSON.stringify(erreurs), 80)}, complet ${complet1} ; 200, [] et true attendus`)
      const r2 = await put(A.jeton, { commande: cmdB, metier: 'Plombier' })
      if (r2.status !== 404) e.push(`PUT avec la commande d'un autre compte → ${r2.status}, 404 attendu`)
      detail = `sur ${BASE} : deux comptes d'essai, deux commandes payee ; PUT complet → 200, erreurs [], complet true ; PUT sur la commande de l'autre → 404 ; ménage fait`
    } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`) } finally {
      for (const m of menage.reverse()) { try { await m() } catch (err) { e.push(premiereLigne(err)) } }
    }
    s.juger('CD-7', e, detail)
  }

  jugerPreuvesVides(s, 'CD', RAC, FICHE)
  process.exit(s.finir())
}
