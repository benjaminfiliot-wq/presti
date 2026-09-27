// scripts/poste-sites-qa.mjs — juge du Poste : un geste pour mettre en ligne, la Search Console, le dossier sur demande et
// « À faire » (fiche 026-026, lot D ; critères PS de 026-078), écrit par Claude Code AVANT le code qu'il juge. L'exécutant
// (Codex) qui le lance n'y touche jamais (CLAUDE.md:23). Réécrit en entier le 27/09 : la version du 26/09 (Gemini) ne testait
// que l'existence d'un fichier (app/poste/page.tsx, qui n'est même pas celui de la fiche).
//
//   node --import ./scripts/ts-loader.mjs scripts/poste-sites-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
//
//   --racine=<d>  importe les routes et l'écran sous <d> (défaut : le dépôt). « La référence » (PS-2) est le commit du domaine
//                 (preuve-a.json, 4041ec9), lu dans le dépôt qui contient ce script.
//   --temoin      seulement la non-régression : PS-2 (NR), la garde et les trois gestes d'origine de la route [id], identiques à
//                 la référence ; et PS-PV.
//   --reel        Claude Code seulement, après le déploiement de 026-078 : PS-9 (renvoi à scripts/site-hebergement-e2e.mjs,
//                 qui porte le compte fondateur d'essai : voir PS-9 plus bas). Code 2 si 026-078 n'est pas PASS.
//
// Les routes sont importées dans un PROCESSUS ENFANT (--enfant=complet), l'écran dans un autre (--enfant=ecran : react-dom
// sur le DOM minimal de d/mini-dom.mjs, apiDirection doublé), avec les doublures de d/doublures.mjs : base en mémoire (les
// requêtes consignées avec leurs filtres), stockage en mémoire (le site déposé), addDomain, sendEmail, la garde (un
// fondateur « direction »), exigerReconfirmation (en-tête x-presti-reconfirmation), creerJetonDossier (espion) ; horloge
// figée au mercredi 14/10/2026 10:00 UTC. Aucun réseau (fetch piégé).
//
// Contrats que ce juge fixe pour 026-078 (d/commandes.json, section poste) :
//   POST(req, { params: Promise<{ id }> }) avec { action } en JSON ; GET de /api/controle/sites et de /api/controle/a-faire ;
//   Sites.tsx : export par défaut, props { role, signaler } ; une ligne par commande, dépliée par un bouton aria-expanded
//   qui porte le nom de l'artisan ; les gestes sont des <button> qui postent { action } par apiDirection de ./client.
//
// Sortie : une ligne par critère, puis « poste-sites-qa : PASS|FAIL ». Code 0 seulement si tout est vert ; 1 sinon ; 2 si
// l'appel est invalide ou si un préalable de --reel manque. Écriture seulement sous .orchestre/travail/poste-sites-qa/.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  R, DEPOT_GIT, REFERENCE, lireOptions, refuserAppel, creerSortie, court, premiereLigne, lireRacine, lancer, lancerEnfant,
  resultatEnfant, importer, jugerDans, jugerPreuvesVides, sansCommentaires, instructions, typecheck, fichePass, figerHorloge,
  chargerEnvLocal, marqueEssai, dossierTravail,
} from './fixtures/026-livraison-tresor/commun.mjs'
import { jeuD, preparerEnfantD, texteDans, corpsFonctionD, routeExiste, RE_EMAIL, RE_TEL, relR } from './fixtures/026-livraison-tresor/d/commun-d.mjs'

const JUGE = 'poste-sites-qa'
const FICHE = '026-078'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const o = lireOptions(process.argv.slice(2))
const RAC = o.racine
const ROUTE_ID = 'app/api/controle/sites/[id]/route.ts', ROUTE_SITES = 'app/api/controle/sites/route.ts', ROUTE_AFAIRE = 'app/api/controle/a-faire/route.ts'
const JOURNAL = 'lib/direction/journal.ts', ECRAN = 'app/controle/Sites.tsx'
const ACTIONS = ['valider', 'regenerer', 'mettre_en_ligne', 'valider_et_mettre_en_ligne', 'search_console', 'envoyer_dossier']
const DOUBLES = {
  'lib/supabaseAdmin': 'supabaseAdmin', 'lib/email': 'email', 'lib/limites': 'limites', 'lib/alertes': 'alertes', 'lib/flags': 'flags',
  'lib/vercelDomains': 'vercelDomains', 'lib/direction/garde': 'garde', 'lib/stripe': 'stripe', 'lib/direction/reconfirmation': 'reconfirmation',
  'lib/siteDossier': 'siteDossier', 'lib/supabaseClient': 'supabaseClient',
}
const DOUBLES_ECRAN = { 'app/controle/client': 'client', 'lib/supabaseClient': 'supabaseClient', 'lib/vercelDomains': 'vercelDomains', 'lib/supabaseAdmin': 'supabaseAdmin', 'lib/siteRetrait': 'siteRetrait', 'lib/siteDossier': 'siteDossier', 'lib/email': 'email' }
const MAINTENANT = '2026-10-14T10:00:00.000Z'
const apostrophes = (t) => String(t ?? '').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()

/** Les commandes du jeu d'essai, matière complétée depuis la commande d'exemple de la série 025 (dossier complet). */
function commandesPoste(liste) {
  const ex = JSON.parse(fs.readFileSync(path.join(R, 'scripts', 'fixtures', '025', 'commande-exemple', 'commande.json'), 'utf8'))
  const complete = { ...structuredClone(ex.matiere), prestations: ['Escaliers sur mesure', 'Dressings et placards'] }
  const incomplete = { ...structuredClone(complete), photos: [] }
  return liste.map(({ cle: _c, attendu: _a, site: _s, ...c }) => ({
    metier: ex.metier, metiers_secondaires: ex.metiers_secondaires, communes: ex.communes, prix_cents: 30000, paye_le: null, genere_le: null, valide_le: null, en_ligne_le: null,
    search_console_le: null, retiree_le: null, dossier_envoye_le: null, scores: null, verifications: null, consigne: null, regenerations: 0, apercu_jeton: null,
    cree_le: '2026-10-01T08:00:00.000Z', modifie_le: '2026-10-01T08:00:00.000Z', ...c,
    matiere: c.matiere === 'complete' ? structuredClone(complete) : c.matiere === 'incomplete' ? structuredClone(incomplete) : c.matiere,
  }))
}

// ═══ Le processus enfant : les routes ═══════════════════════════════════════════════════════════════════════════════════
if (o.enfant === 'complet') {
  const J = jeuD('commandes.json'), P = J.poste
  const liberer = { f: figerHorloge(MAINTENANT) }
  const horloge = (iso) => { liberer.f(); liberer.f = figerHorloge(iso) }
  const { D, reseau } = await preparerEnfantD({ racines: [RAC], doubles: DOUBLES })
  const E = D.etat, X = D.etatD
  const suivi = { reseau, inconnues: E.inconnues }
  const res = { criteres: {} }
  const rid = await importer(RAC, ROUTE_ID), rs = await importer(RAC, ROUTE_SITES), ra = await importer(RAC, ROUTE_AFAIRE)
  const C = Object.fromEntries(P.commandes.map((c) => [c.cle, c]))
  const lignes = () => E.tables.sites_commandes ?? []
  const ligne = (id) => lignes().find((l) => l.id === id)
  const initialiser = () => {
    const seaux = { sites: {} }
    for (const c of P.commandes) if (c.site) seaux.sites[`${c.id}/index.html`] = { octets: Buffer.from(`<!doctype html><title>${c.cle}</title>`), type: 'text/html; charset=utf-8' }
    D.reinitialiserD({ tables: { sites_commandes: commandesPoste(P.commandes), artisans: [structuredClone(P.artisan)], journal_direction: [] }, seaux, dns: P.dns })
  }
  const poster = async (id, action, { entetes = {}, corps = {} } = {}) => {
    if (typeof rid.m?.POST !== 'function') return { status: 'POST absente', json: null }
    const req = new Request(`https://prestiapp.fr/api/controle/sites/${id}`, { method: 'POST', body: JSON.stringify({ action, ...corps }), headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9', 'user-agent': 'poste-sites-qa', ...entetes } })
    try {
      const r = await rid.m.POST(req, { params: Promise.resolve({ id }) })
      let json = null
      try { json = await r.clone().json() } catch { json = null }
      return { status: r.status, json }
    } catch (err) { return { status: `lève (${premiereLigne(err)})`, json: null } }
  }
  const ecrituresSur = (tables) => X.requetes.filter((q) => q.genre !== 'select' && tables.includes(q.table) && !q.erreur)

  await jugerDans(res, 'PS-1', async () => {
    const e = []
    if (!rid.m) return { echecs: [`${ROUTE_ID} ne s'importe pas : ${rid.erreur} (les six actions, dont valider_et_mettre_en_ligne, ne sont pas jugées)`] }
    initialiser()
    const refusees = []
    for (const a of ACTIONS) {
      const r = await poster(C.B.id, a, { corps: a === 'regenerer' ? { consigne: 'Consigne du juge, assez longue pour passer.' } : {} })
      if (r.status === 400 || typeof r.status !== 'number') refusees.push(`${a} → ${r.status}${r.json?.error ? ` (« ${court(r.json.error, 60)} »)` : ''}`)
    }
    if (refusees.length) e.push(`${ROUTE_ID} n'accepte pas ${refusees.map((x) => x.split(' ')[0]).join(', ')} : ${refusees.join(' ; ')}`)
    const inconnue = await poster(C.B.id, 'action_du_juge_inconnue')
    if (inconnue.status !== 400) e.push(`une action inconnue → ${inconnue.status}, 400 attendu (la route doit encore refuser le reste)`)
    const src = sansCommentaires(lireRacine(RAC, JOURNAL) ?? '')
    const union = /export\s+type\s+Action\s*=([\s\S]*?)(?=\bexport\b|$)/.exec(src)?.[1] ?? ''
    for (const x of ['site_search_console', 'site_dossier_envoye']) if (!new RegExp(`['"]${x}['"]`).test(union)) e.push(`${JOURNAL} : '${x}' absent de l'union Action`)
    return { echecs: e, detail: `${ROUTE_ID} reconnaît les six actions (${ACTIONS.join(', ')} : aucune ne rend 400 sur une commande brouillon) et refuse toujours une action inconnue (400) ; ${JOURNAL} : 'site_search_console' et 'site_dossier_envoye' dans l'union Action` }
  }, suivi)

  await jugerDans(res, 'PS-3', async () => {
    const e = []
    if (!rid.m) return { echecs: ['route [id] absente (PS-1)'] }
    const A = 'valider_et_mettre_en_ligne'
    for (const k of ['V', 'P']) {
      initialiser()
      const r = await poster(C[k].id, A)
      if (r.status !== 409) e.push(`depuis ${C[k].etat} → ${r.status}, 409 attendu`)
      if (ecrituresSur(['sites_commandes', 'artisans', 'journal_direction']).length) e.push(`depuis ${C[k].etat} : une écriture a eu lieu`)
    }
    initialiser()
    const sans = await poster(C.G2.id, A)
    if (sans.status !== 409) e.push(`sans site déposé → ${sans.status}, 409 attendu`)
    if (ecrituresSur(['sites_commandes', 'artisans', 'journal_direction']).length) e.push('sans site déposé : une entrée de journal ou une écriture a eu lieu')
    // succès
    initialiser()
    const ok = await poster(C.G.id, A)
    if (ok.status !== 200) e.push(`succès → ${ok.status}${ok.json?.error ? ` (« ${court(ok.json.error, 80)} »)` : ''}, 200 attendu`)
    const ecr = ecrituresSur(['sites_commandes', 'artisans', 'journal_direction'])
    const journaux = ecr.filter((q) => q.table === 'journal_direction')
    const iJ = ecr.findIndex((q) => q.table === 'journal_direction'), iM = ecr.findIndex((q) => q.table === 'sites_commandes' && q.genre === 'update')
    if (journaux.length !== 1) e.push(`succès : ${journaux.length} entrée(s) de journal, une seule attendue`)
    else {
      const v = Array.isArray(journaux[0].valeurs) ? journaux[0].valeurs[0] : journaux[0].valeurs
      if (v?.action !== 'site_en_ligne') e.push(`succès : journal action = ${JSON.stringify(v?.action)}, 'site_en_ligne' attendue`)
      if (v?.avant?.etat !== 'generee') e.push(`succès : journal avant.etat = ${JSON.stringify(v?.avant?.etat)}, 'generee' attendu`)
    }
    if (iM < 0) e.push('succès : aucune mise à jour de la commande')
    else if (iJ < 0 || iJ > iM) e.push('succès : le journal n’est pas écrit avant la mise à jour')
    const maj = ecr.filter((q) => q.table === 'sites_commandes' && q.genre === 'update')
    if (maj.length !== 1) e.push(`succès : ${maj.length} mise(s) à jour de la commande, une attendue`)
    else {
      const v = maj[0].valeurs ?? {}
      for (const k of ['valide_le', 'en_ligne_le']) if (!v[k]) e.push(`succès : la mise à jour ne pose pas ${k}`)
      if (v.etat !== 'en_ligne') e.push(`succès : la mise à jour pose etat = ${JSON.stringify(v.etat)}, 'en_ligne' attendu`)
      if (!maj[0].filtres.some((f) => f[0] === 'eq' && f[1] === 'etat' && f[2] === 'generee')) e.push(`succès : la mise à jour n'est pas conditionnée à etat = generee (filtres ${court(JSON.stringify(maj[0].filtres), 80)})`)
    }
    const g = ligne(C.G.id)
    if (g?.etat !== 'en_ligne' || !g?.valide_le || !g?.en_ligne_le) e.push(`succès : commande ${JSON.stringify({ etat: g?.etat, valide_le: g?.valide_le, en_ligne_le: g?.en_ligne_le })}`)
    const art = (E.tables.artisans ?? []).find((a) => a.id === P.artisan.id)
    if (art?.site_origine !== 'commande') e.push(`succès : site_origine de l'artisan = ${JSON.stringify(art?.site_origine)}, 'commande' attendu`)
    if (JSON.stringify(ok.json?.dns ?? null) !== JSON.stringify(P.dns[C.G.domaine])) e.push(`succès : dns rendus ${court(JSON.stringify(ok.json?.dns), 90)}, ceux d'addDomain attendus`)
    if (!X.domaines.some((x) => x.op === 'add' && x.domaine === C.G.domaine)) e.push('succès : addDomain non appelé pour le domaine de la commande')
    // la condition, éprouvée : la commande change entre le journal et l'écriture
    initialiser()
    X.apresEcriture = (q) => { if (q.table === 'journal_direction') { const l = ligne(C.G.id); if (l) l.etat = 'validee' } }
    const course = await poster(C.G.id, A)
    X.apresEcriture = null
    if (ligne(C.G.id)?.etat !== 'validee') e.push(`commande passée à validee entre le journal et l'écriture : elle est devenue ${ligne(C.G.id)?.etat} (mise à jour non conditionnée)`)
    if (course.status === 200) e.push('commande changée entre-temps : 200, un refus (409) attendu')
    // journal indisponible
    initialiser()
    X.pannes.add('journal_direction')
    const panne = await poster(C.G.id, A)
    X.pannes.delete('journal_direction')
    if (panne.status !== 503) e.push(`journal indisponible → ${panne.status}, 503 attendu`)
    if (ecrituresSur(['sites_commandes', 'artisans']).length) e.push('journal indisponible : une écriture a eu lieu')
    return { echecs: e, detail: `depuis validee ou payee → 409 ; sans site déposé → 409, ni journal ni écriture ; succès → une entrée site_en_ligne (avant.etat generee) écrite avant l'unique mise à jour, conditionnée à etat = generee, qui pose valide_le, en_ligne_le et en_ligne ; site_origine = commande ; les DNS d'addDomain rendus ; une commande changée entre le journal et l'écriture n'est pas écrasée ; journal indisponible → 503, aucune écriture` }
  }, suivi)

  await jugerDans(res, 'PS-4', async () => {
    const e = []
    if (!rid.m) return { echecs: ['route [id] absente (PS-1)'] }
    initialiser()
    const g = await poster(C.G.id, 'search_console')
    if (g.status !== 409) e.push(`search_console depuis generee → ${g.status}, 409 attendu`)
    if (ligne(C.G.id)?.search_console_le) e.push('search_console depuis generee : search_console_le posée')
    horloge('2026-10-14T10:00:00.000Z')
    const a1 = await poster(C.E.id, 'search_console')
    const d1 = ligne(C.E.id)?.search_console_le
    horloge('2026-10-14T11:30:00.000Z')
    const a2 = await poster(C.E.id, 'search_console')
    const d2 = ligne(C.E.id)?.search_console_le
    horloge(MAINTENANT)
    if (a1.status !== 200) e.push(`search_console depuis en_ligne → ${a1.status}, 200 attendu`)
    if (!d1) e.push('search_console depuis en_ligne : search_console_le non posée')
    else if (d2 !== d1) e.push(`deux appels depuis en_ligne : la date passe de ${d1} à ${d2}, une seule date attendue`)
    if (typeof a2.status !== 'number' || a2.status >= 500) e.push(`second appel search_console → ${a2.status}`)
    // envoyer_dossier
    initialiser()
    const sans = await poster(C.E.id, 'envoyer_dossier')
    if (sans.status !== 403 || sans.json?.code !== 'reconfirmation_requise') e.push(`envoyer_dossier sans reconfirmation → ${sans.status} ${JSON.stringify(sans.json?.code ?? null)}, 403 « reconfirmation_requise » attendu`)
    if (E.emails.length || D.espionsDe('creerJetonDossier').length) e.push('envoyer_dossier sans reconfirmation : un jeton ou un e-mail est parti')
    if (!X.reconfirmations.length) e.push('envoyer_dossier : exigerReconfirmation jamais appelée')
    else if (X.reconfirmations.some((x) => x.portee !== 'artisan')) e.push(`envoyer_dossier : reconfirmation de portée ${JSON.stringify(X.reconfirmations.map((x) => x.portee))}, 'artisan' attendue`)
    initialiser()
    const avec = await poster(C.E.id, 'envoyer_dossier', { entetes: { 'x-presti-reconfirmation': X.jetonReco } })
    if (avec.status !== 200) e.push(`envoyer_dossier avec reconfirmation → ${avec.status}${avec.json?.error ? ` (« ${court(avec.json.error, 80)} »)` : ''}, 200 attendu`)
    const jetons = D.espionsDe('creerJetonDossier')
    if (jetons.length !== 1 || jetons[0].args[0] !== C.E.id) e.push(`creerJetonDossier ${JSON.stringify(jetons.map((x) => x.args))}, un appel pour la commande attendu`)
    const envois = E.emails.filter((x) => x.genre === 'sendEmail')
    if (envois.length !== 1 || envois[0].to !== C.E.email) e.push(`e-mails : ${JSON.stringify(envois.map((x) => x.to))}, un seul à ${C.E.email} attendu`)
    else {
      const t = `${envois[0].subject ?? ''}\n${envois[0].text ?? ''}${envois[0].html ?? ''}`
      if (!t.includes(`/api/site-dossier/${C.E.id}?j=`)) e.push(`l'e-mail ne porte pas le lien /api/site-dossier/${C.E.id}?j=…`)
      else if (jetons[0] && !t.includes(`j=${encodeURIComponent('jeton-temoin-1')}`)) e.push('le lien ne porte pas le jeton créé par creerJetonDossier')
    }
    if (E.emails.some((x) => x.genre === 'entreprise' && String(x.corps ?? '').includes('jeton-temoin'))) e.push('le jeton en clair part dans une notification')
    return { echecs: e, detail: `search_console depuis generee → 409 ; deux appels depuis en_ligne (10:00 puis 11:30) → une seule date ; envoyer_dossier sans reconfirmation → 403 reconfirmation_requise (portée artisan), ni jeton ni e-mail ; avec → un jeton pour la commande et un seul e-mail, à commande.email, avec /api/site-dossier/<id>?j=<ce jeton>` }
  }, suivi)

  await jugerDans(res, 'PS-5', async () => {
    const e = []
    if (!ra.m || typeof ra.m.GET !== 'function') return { echecs: [`${ROUTE_AFAIRE} : GET ne s'importe pas (${ra.erreur ?? 'absente'})`] }
    const sc = await importer(RAC, 'lib/siteCommande.ts')
    if (typeof sc.m?.erreursFabrication !== 'function') return { echecs: ['lib/siteCommande.ts n’exporte pas erreursFabrication (026-030, préalable de 026-078)'] }
    const F = commandesPoste(P.a_faire.commandes)
    const incomplete = F.find((c) => c.id === P.a_faire.commandes[0].id), complete = F.find((c) => c.id === P.a_faire.commandes[1].id)
    if (!sc.m.erreursFabrication(incomplete).length || sc.m.erreursFabrication(complete).length) return { echecs: [`jeu d'essai : erreursFabrication de la racine ne classe pas F1 incomplète et F2 complète (${court(JSON.stringify(sc.m.erreursFabrication(complete)), 100)})`] }
    D.reinitialiserD({ tables: { sites_commandes: F, artisans: structuredClone(P.a_faire.artisans), alertes: [], passages_cron: [] } })
    let json = null
    try { const r = await ra.m.GET(new Request('https://prestiapp.fr/api/controle/a-faire', { headers: { 'x-forwarded-for': '203.0.113.9' } })); json = await r.json(); if (r.status !== 200) e.push(`GET → ${r.status}`) } catch (err) { return { echecs: [`GET lève (${premiereLigne(err)})`] } }
    const miennes = (json?.lignes ?? []).filter((l) => l.type === 'commande')
    const attendues = P.a_faire.commandes.filter((c) => c.attendu)
    if (miennes.length !== attendues.length) e.push(`${miennes.length} ligne(s) de type commande, exactement ${attendues.length} attendues (${court(miennes.map((l) => l.libelle).join(' | '), 160)})`)
    for (const c of P.a_faire.commandes) {
      const l = miennes.filter((x) => String(x.id ?? '').includes(c.id) || JSON.stringify(x).includes(c.id) || (c.artisan_id && String(x.detail ?? '').includes(P.a_faire.artisans.find((a) => a.id === c.artisan_id)?.nom ?? '§')))
      if (!c.attendu) { if (l.length) e.push(`${c.cle} (${c.etat}${c.search_console_le ? ', plan soumis' : ''}) : une ligne « ${court(l[0].libelle, 50)} », aucune attendue`); continue }
      const [libelle, gravite] = c.attendu
      const bonne = l.find((x) => apostrophes(x.libelle).includes(apostrophes(libelle)))
      if (!bonne) { e.push(`${c.cle} (${c.etat}) : aucune ligne « ${libelle} »${l.length ? ` (lu : « ${court(l[0].libelle, 50)} »)` : ''}`); continue }
      if (bonne.gravite !== gravite) e.push(`${c.cle} « ${libelle} » : gravité ${bonne.gravite}, ${gravite} attendue`)
      if (bonne.libelleType !== 'Site') e.push(`${c.cle} : libellé de type ${JSON.stringify(bonne.libelleType)}, « Site » attendu`)
      if (c.cle === 'F2' && !String(bonne.detail ?? '').includes(`node --import ./scripts/ts-loader.mjs scripts/livrer-site.mjs ${c.id}`)) e.push(`F2 « Générer le site » : le détail ne porte pas node --import ./scripts/ts-loader.mjs scripts/livrer-site.mjs ${c.id}`)
    }
    for (const l of miennes) {
      if (!l.action || typeof l.action.route !== 'string') { e.push(`« ${court(l.libelle, 40)} » : aucune action`); continue }
      const x = routeExiste(RAC, l.action.route)
      if (!x.ok) e.push(`« ${court(l.libelle, 40)} » : l'action ${l.action.route} ne mène à aucune route du dépôt (${x.raison})`)
      const d = String(l.detail ?? '')
      if (RE_EMAIL.test(d) || RE_TEL.test(d)) e.push(`« ${court(l.libelle, 40)} » : le détail contient une adresse ou un téléphone (« ${court(d, 60)} »)`)
    }
    return { echecs: e, detail: `« À faire » sur 7 commandes, horloge au ${MAINTENANT} : exactement les 5 lignes du tableau (Appeler l'artisan, Générer le site avec la commande livrer-site, Relire et mettre en ligne, Mettre en ligne en critique après 74 h ouvrées depuis valide_le, Soumettre le plan), type « Site », gravités justes ; rien pour la commande au plan soumis ni pour la payée depuis 4 h ; chaque action mène à une route du dépôt ; aucun détail avec adresse ou téléphone` }
  }, suivi)

  await jugerDans(res, 'PS-6', async () => {
    const e = []
    if (!rs.m || typeof rs.m.GET !== 'function') return { echecs: [`${ROUTE_SITES} : GET ne s'importe pas (${rs.erreur ?? 'absente'})`] }
    initialiser()
    const ex = commandesPoste(P.commandes).find((c) => c.matiere?.siren)
    const secrets = [ex?.matiere?.siren, ex?.matiere?.adresse].filter((x) => typeof x === 'string' && x.length > 3)
    let json = null
    try { const r = await rs.m.GET(new Request('https://prestiapp.fr/api/controle/sites?limite=50')); json = await r.json(); if (r.status !== 200) e.push(`GET → ${r.status}`) } catch (err) { return { echecs: [`GET lève (${premiereLigne(err)})`] } }
    const cs = json?.commandes
    if (!Array.isArray(cs) || !cs.length) return { echecs: [`GET ne rend aucune commande (${court(JSON.stringify(json), 80)})`] }
    const cles = (x, out = new Set()) => { if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) { out.add(k); cles(v, out) } return out }
    for (const c of cs) {
      const r = c.matiere_resume
      if (!r || typeof r !== 'object') { e.push(`${String(c.id).slice(-4)} : pas de matiere_resume`); continue }
      if (typeof r.photos !== 'number' || typeof r.prestations !== 'number' || !['boolean', 'number'].includes(typeof r.voix) || !Array.isArray(r.manquants)) e.push(`${String(c.id).slice(-4)} : matiere_resume ${court(JSON.stringify(r), 80)} ; { photos: nombre, voix, prestations: nombre, manquants: liste } attendu`)
    }
    const k = cles(cs)
    for (const interdit of ['matiere', 'siren', 'adresse']) if (k.has(interdit)) e.push(`la réponse porte une clé ${interdit}`)
    const texte = JSON.stringify(json)
    for (const s of secrets) if (texte.includes(JSON.stringify(s))) e.push(`la réponse contient « ${court(s, 30)} », une donnée de la matière brute`)
    const g = cs.find((c) => c.id === C.G.id)
    if (g?.matiere_resume && (g.matiere_resume.photos !== (commandesPoste([C.G])[0].matiere.photos ?? []).length || g.matiere_resume.manquants.length)) e.push(`G : matiere_resume ${court(JSON.stringify(g.matiere_resume), 80)} ; ses photos comptées et aucun manquant attendus`)
    const p = cs.find((c) => c.id === C.P.id)
    if (p?.matiere_resume && !p.matiere_resume.manquants.length) e.push('P (sans photo) : matiere_resume.manquants vide')
    return { echecs: e, detail: `/api/controle/sites : ${cs.length} commandes, chacune avec matiere_resume { photos, voix, prestations, manquants } (G complète : ses photos, aucun manquant ; P sans photo : des manquants) ; ni clé matiere, siren ou adresse, ni la valeur du SIREN ou de l'adresse` }
  }, suivi)
  liberer.f()
  resultatEnfant(JUGE, res)
} else if (o.enfant === 'ecran') {
// ═══ Le processus enfant : l'écran (PS-7) ═══════════════════════════════════════════════════════════════════════════════
  const { installerDom, cliquer, texte, tous, ancetre } = await import('./fixtures/026-livraison-tresor/d/mini-dom.mjs')
  const { window, conteneur } = installerDom()
  const { D, reseau } = await preparerEnfantD({ racines: [RAC], doubles: DOUBLES_ECRAN })
  const E = D.etat, X = D.etatD
  const res = { criteres: {} }
  const bruit = []
  const erreurConsole = console.error, avertConsole = console.warn
  console.error = (...a) => bruit.push(a.map(String).join(' ').slice(0, 200))
  console.warn = console.error
  await jugerDans(res, 'PS-7', async () => {
    const e = []
    const m = await importer(RAC, ECRAN)
    if (!m.m || typeof m.m.default !== 'function') return { echecs: [`${ECRAN} ne s'importe pas (${m.erreur ?? 'pas d’export par défaut'})`] }
    const React = await import('react'), { createRoot } = await import('react-dom/client')
    const cas = [['payee', null], ['generee', null], ['validee', null], ['en_ligne', null], ['en_ligne', '2026-10-13T09:00:00.000Z'], ['retiree', null]]
    const commandes = cas.map(([etat, sc], i) => ({
      id: `d0260000-0000-4000-8000-0000000c0${String(i).padStart(3, '0')}`, artisan: { id: `a${i}`, nom: `Artisan-${etat}${sc ? '-plan-soumis' : ''}`, metier: 'plombier', slug: null }, email: `ecran${i}@presti-test.invalid`, etat,
      domaine_mode: 'aucun', domaine: null, metier: 'plombier', metiers_secondaires: [], communes: ['Bruz'], prix_cents: 30000, paye_le: '2026-10-01T08:00:00.000Z', genere_le: null, valide_le: null, en_ligne_le: null,
      search_console_le: sc, retiree_le: etat === 'retiree' ? '2026-10-02T08:00:00.000Z' : null, dossier_envoye_le: null, scores: null, verifications: null, consigne: null, regenerations: 0, cree_le: '2026-10-01T08:00:00.000Z', modifie_le: '2026-10-01T08:00:00.000Z',
      apercu: null, matiere_resume: { photos: 3, voix: true, prestations: 2, manquants: [] },
    }))
    const posts = []
    X.api = async (chemin, init) => {
      if (init.method === 'GET') return { ok: true, status: 200, data: { commandes: structuredClone(commandes) } }
      posts.push({ chemin, action: init.corps?.action })
      return { ok: true, status: 200, data: { ok: true } }
    }
    const root = createRoot(conteneur)
    const attendre = () => React.act(async () => { await new Promise((r) => setTimeout(r, 5)) })
    await React.act(async () => { root.render(React.createElement(m.m.default, { role: 'direction', signaler: () => {} })) })
    await attendre()
    const boutons = (el) => tous(el, (n) => n.tagName === 'BUTTON')
    const parLigne = {}
    for (const c of commandes) {
      const nom = c.artisan.nom
      const bascule = () => boutons(conteneur).find((b) => texte(b).includes(nom))
      const ligneDe = () => { const b = bascule(); const id = tous(conteneur, (n) => n.getAttribute?.('data-site-id') === c.id)[0]; return id ?? (b ? ancetre(b, (n) => n.tagName === 'TR') : null) }
      const ouvrir = async () => { const b = bascule(); if (b && b.getAttribute('aria-expanded') !== 'true') { await React.act(async () => { cliquer(b, window) }); await attendre() } }
      if (!bascule()) { e.push(`aucune ligne ne porte le nom « ${nom} » (commande ${c.etat})`); continue }
      await ouvrir()
      const labels = boutons(ligneDe() ?? conteneur).map(texte).filter((t) => t && !t.includes(nom) && !/Copier/i.test(t))
      const vu = { labels: [...new Set(labels)], actions: new Map() }
      for (const l of vu.labels) {
        await ouvrir()
        const b = boutons(ligneDe() ?? conteneur).find((x) => texte(x) === l)
        if (!b) continue
        const avant = posts.length
        await React.act(async () => { cliquer(b, window) })
        await attendre()
        for (const p of posts.slice(avant)) if (p.chemin === `/api/controle/sites/${c.id}` && p.action) vu.actions.set(p.action, l)
      }
      parLigne[`${c.etat}${c.search_console_le ? '+plan' : ''}`] = vu
    }
    const ou = (action) => Object.entries(parLigne).filter(([, v]) => v.actions.has(action)).map(([k]) => k).sort()
    const ouLabel = (re) => Object.entries(parLigne).filter(([, v]) => v.labels.some((t) => re.test(t))).map(([k]) => k).sort()
    const verifier = (action, re, voulus, nom) => {
      const a = ou(action)
      if (JSON.stringify(a) !== JSON.stringify([...voulus].sort())) e.push(`${nom} (${action}) posté depuis ${JSON.stringify(a)}, seulement ${JSON.stringify(voulus)} attendu`)
      for (const k of a) { const l = parLigne[k].actions.get(action); if (!re.test(l)) e.push(`${k} : le bouton qui poste ${action} dit « ${court(l, 40)} », « ${nom} » attendu`) }
    }
    verifier('valider_et_mettre_en_ligne', /Mettre en ligne/i, ['generee'], 'Mettre en ligne')
    verifier('search_console', /Plan soumis/i, ['en_ligne'], 'Plan soumis')
    verifier('envoyer_dossier', /Envoyer le dossier/i, ['en_ligne', 'en_ligne+plan', 'retiree'], 'Envoyer le dossier')
    const plan = ouLabel(/Plan soumis/i), dossier = ouLabel(/Envoyer le dossier/i)
    if (JSON.stringify(plan) !== JSON.stringify(['en_ligne'])) e.push(`« Plan soumis » affiché pour ${JSON.stringify(plan)}, seulement ["en_ligne"] (sans date) attendu`)
    if (JSON.stringify(dossier) !== JSON.stringify(['en_ligne', 'en_ligne+plan', 'retiree'])) e.push(`« Envoyer le dossier » affiché pour ${JSON.stringify(dossier)}, ["en_ligne","en_ligne+plan","retiree"] attendu`)
    if (parLigne.validee && parLigne.validee.actions.get('mettre_en_ligne') === undefined) e.push('validee : le bouton d’origine « Mettre en ligne » (mettre_en_ligne) a disparu')
    await React.act(async () => { root.unmount() })
    return { echecs: e, detail: `écran rendu par react-dom (DOM minimal) avec 6 commandes factices, chaque ligne dépliée et chaque bouton cliqué : valider_et_mettre_en_ligne (« Mettre en ligne ») depuis generee seulement ; « Plan soumis » (search_console) pour en_ligne sans date seulement ; « Envoyer le dossier » pour en_ligne et retiree seulement ; le « Mettre en ligne » d'origine (mettre_en_ligne) reste sur validee` }
  }, { reseau, inconnues: E.inconnues })
  console.error = erreurConsole; console.warn = avertConsole
  resultatEnfant(JUGE, res)
} else {
// ═══ Le processus principal ═════════════════════════════════════════════════════════════════════════════════════════════
if (o.inconnues.length || o.positionnels.length) refuserAppel(JUGE, `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (o.temoin && o.reel) refuserAppel(JUGE, '--temoin et --reel ensemble')
if (!fs.existsSync(RAC)) refuserAppel(JUGE, `racine introuvable : ${RAC}`)
const IDS = o.temoin ? ['PS-2', 'PS-PV'] : ['PS-1', 'PS-2', 'PS-3', 'PS-4', 'PS-5', 'PS-6', 'PS-7', 'PS-8', ...(o.reel ? ['PS-9'] : []), 'PS-PV']
const s = creerSortie(JUGE, IDS, `${JUGE} — fiche ${FICHE}, racine ${relR(RAC)}, mode ${o.temoin ? 'témoin' : o.reel ? 'réel' : 'complet'}`, { nr: ['PS-2'] })

let enfant = null
if (!o.temoin) {
  const r = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'complet', timeout: 240_000 })
  if (!r.res) {
    s.echoue('PS-1', `l'enfant qui importe ${ROUTE_ID} n'a rien rendu (code ${r.code}${r.erreur ? `, ${r.erreur}` : ''}) : les six actions, dont valider_et_mettre_en_ligne, ne sont pas jugées — ${court(r.sortie.trim().split(/\r?\n/).slice(-3).join(' | '), 200)}`)
  } else { const c = r.res.criteres['PS-1']; if (c) s.juger('PS-1', c.echecs, c.detail); else s.echoue('PS-1', 'non rendu par l’enfant (valider_et_mettre_en_ligne non jugée)') }
  enfant = r
}

// ── PS-2 (NR) : la garde et les trois gestes d'origine, identiques à la référence ────────────────────────────────────────
await s.critere('PS-2', () => {
  const e = []
  const ref = texteDans(DEPOT_GIT, REFERENCE, ROUTE_ID), cur = lireRacine(RAC, ROUTE_ID)
  if (!ref) return { echecs: [`${ROUTE_ID} illisible à la référence ${String(REFERENCE).slice(0, 7)}`] }
  if (!cur) return { echecs: [`${ROUTE_ID} absente de la racine`] }
  const scR = sansCommentaires(ref), scC = sansCommentaires(cur)
  const pR = corpsFonctionD(scR, 'POST'), pC = corpsFonctionD(scC, 'POST')
  if (!pR || !pC) return { echecs: [`${ROUTE_ID} : POST introuvable${pR ? '' : ' à la référence'}`] }
  const norm = (t) => t.replace(/\s+/g, ' ').trim()
  const iR = instructions(pR.corps).slice(0, 4).map(norm), iC = instructions(pC.corps).slice(0, 4).map(norm)
  for (let k = 0; k < 4; k++) if (iR[k] !== iC[k]) e.push(`instruction ${k + 1} de POST : « ${court(iC[k], 70)} », « ${court(iR[k], 70)} » attendue (référence ${String(REFERENCE).slice(0, 7)})`)
  if (!iR.join(' ').includes("exigerDomaine(f, 'clients', 'ecrire')")) e.push('référence : la garde attendue est introuvable (juge à revoir)')
  // Les lignes des branches valider, regenerer et mettre_en_ligne : toutes présentes, telles quelles, dans le POST courant.
  const lignesR = pR.corps.split('\n'), courantes = pC.corps.split('\n').map(norm)
  const brancheLignes = []
  for (let k = 0; k < lignesR.length; k++) {
    const l = lignesR[k]
    if (/action\s*===\s*'(valider|regenerer|mettre_en_ligne)'/.test(l)) {
      brancheLignes.push(l)
      // les suites d'une expression (lignes « ? … » ou « : … ») et le corps d'un bloc if (action === …) {
      let n = (l.match(/\{/g) ?? []).length - (l.match(/\}/g) ?? []).length
      for (let j = k + 1; j < lignesR.length; j++) {
        const x = lignesR[j]
        if (n > 0) { brancheLignes.push(x); n += (x.match(/\{/g) ?? []).length - (x.match(/\}/g) ?? []).length; continue }
        if (/^\s*[?:]/.test(x)) { brancheLignes.push(x); continue }
        break
      }
    }
  }
  const manquantes = [...new Set(brancheLignes.map((l) => norm(l.replace(/^\s*[?:]\s*/, ''))).filter((l) => l && l !== '}' && l !== '{'))].filter((l) => !courantes.some((c) => c.includes(l)))
  for (const l of manquantes.slice(0, 5)) e.push(`branche d'origine changée : « ${court(l, 90)} » introuvable dans le POST courant`)
  return { echecs: e, detail: `les quatre premières instructions de POST (estFondateur, estRefus, exigerDomaine(f, 'clients', 'ecrire'), domaineRefuse) égales à la référence ${String(REFERENCE).slice(0, 7)} ; les ${brancheLignes.length} lignes des branches valider, regenerer et mettre_en_ligne de la référence toutes présentes, telles quelles, dans le POST courant` }
})

if (!o.temoin) {
  const r = enfant
  for (const id of ['PS-3', 'PS-4', 'PS-5', 'PS-6']) { const c = r?.res?.criteres?.[id]; if (c) s.juger(id, c.echecs, c.detail); else s.echoue(id, r?.res ? 'non rendu par l’enfant' : 'non jugé : enfant sans résultat (PS-1)') }
  const x = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'ecran', timeout: 180_000 })
  const c = x.res?.criteres?.['PS-7']
  if (c) s.juger('PS-7', c.echecs, c.detail); else s.echoue('PS-7', `l'enfant qui rend ${ECRAN} n'a rien rendu (code ${x.code}) — ${court(x.sortie.trim().split(/\r?\n/).slice(-2).join(' | '), 200)}`)
  await s.critere('PS-8', () => { const t = typecheck(RAC, JUGE); return { echecs: t.ok ? [] : [t.detail], detail: t.detail } })
}

// ── PS-9 (--reel) ────────────────────────────────────────────────────────────────────────────────────────────────────────
let codeMenage = 0
if (o.reel) {
  if (!fichePass(FICHE)) { s.echoue('PS-9', `préalable absent : la fiche ${FICHE} n'est pas PASS`); s.finir(); process.exit(2) }
  chargerEnvLocal()
  const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const APP = (process.env.PRESTI_BASE_URL || 'https://prestiapp.fr').replace(/\/$/, '')
  if (!SB || !SVC || !ANON) { s.echoue('PS-9', 'préalable absent : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY manque (.env.local)'); s.finir(); process.exit(2) }
  // Le compte fondateur d'essai, sur le modèle de scripts/site-hebergement-e2e.mjs (compteTest de scripts/lib/capture.mjs,
  // plus son rôle « direction ») ; la commande générée d'essai et son site ; tout est défait dans le finally.
  const { compteTest } = await import('./lib/capture.mjs')
  const { chromium } = await import('playwright')
  const marque = marqueEssai()
  const h = { apikey: SVC, Authorization: `Bearer ${SVC}` }
  const rest = (chemin, init = {}) => fetch(`${SB}/rest/v1/${chemin}`, { ...init, headers: { ...h, 'Content-Type': 'application/json', ...(init.headers ?? {}) }, signal: AbortSignal.timeout(20_000) })
  const e = []
  let compte = null, id = null, navigateur = null
  try {
    compte = await compteTest('direction')
    await rest('direction_roles', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: compte.id, role: 'direction' }) })
    await rest(`artisans?id=eq.${compte.id}`, { method: 'PATCH', body: JSON.stringify({ role_interne: 'fondateur' }) })
    const quand = new Date().toISOString()
    const ins = await rest('sites_commandes?select=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ email: `${marque}@presti-test.invalid`, etat: 'generee', metier: 'Essai', entreprise: marque, domaine_mode: 'aucun', paye_le: quand, genere_le: quand }) })
    if (ins.status !== 201) throw new Error(`insertion de la commande d'essai : ${ins.status} ${court(await ins.text(), 120)}`)
    id = (await ins.json())[0].id
    const u = await fetch(`${SB}/storage/v1/object/sites/${id}/index.html`, { method: 'POST', headers: { ...h, 'Content-Type': 'text/html; charset=utf-8', 'x-upsert': 'true' }, body: `<!doctype html><title>${marque}</title>`, signal: AbortSignal.timeout(20_000) })
    if (!u.ok) throw new Error(`dépôt du site d'essai : ${u.status}`)
    const geste = (action) => fetch(`${APP}/api/controle/sites/${id}`, { method: 'POST', headers: { Authorization: `Bearer ${compte.sess.access_token}`, 'Content-Type': 'application/json', 'User-Agent': 'poste-sites-qa --reel' }, body: JSON.stringify({ action }), signal: AbortSignal.timeout(60_000) })
    const r1 = await geste('valider_et_mettre_en_ligne')
    if (r1.status !== 200) e.push(`valider_et_mettre_en_ligne → ${r1.status} ${court(await r1.text(), 100)}`)
    const [c1] = await (await rest(`sites_commandes?select=etat,search_console_le&id=eq.${id}`)).json()
    if (c1?.etat !== 'en_ligne') e.push(`la commande est ${c1?.etat}, en_ligne attendu`)
    const site = await fetch(`${APP}/site-genere/${id}/`, { signal: AbortSignal.timeout(30_000) })
    if (site.status !== 200) e.push(`GET /site-genere/<id>/ → ${site.status}, 200 attendu`)
    const r2 = await geste('search_console')
    const [c2] = await (await rest(`sites_commandes?select=search_console_le&id=eq.${id}`)).json()
    if (r2.status !== 200 || !c2?.search_console_le) e.push(`search_console → ${r2.status}, search_console_le = ${c2?.search_console_le}`)
    // La capture, prise par le juge : l'onglet Sites à 390 × 844, session du compte d'essai.
    navigateur = await chromium.launch()
    const page = await navigateur.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: 'fr-FR' })
    await page.addInitScript((x) => { try { for (const [k, v] of Object.entries(x)) localStorage.setItem(k, v) } catch { /* indisponible */ } }, { [compte.cleLocale]: JSON.stringify(compte.sess), 'presti.aide_vues': JSON.stringify(['visite:console']) })
    await page.goto(`${APP}/controle?onglet=sites`, { waitUntil: 'load', timeout: 120_000 })
    await page.locator('td', { hasText: /commande|Artisan|Essai/i }).first().waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {})
    const dossier = dossierTravail(JUGE, 'capture')
    const fichier = path.join(dossier, 'onglet-sites-390x844.png')
    await page.screenshot({ path: fichier })
    const largeurs = await page.evaluate(() => ({ defile: document.documentElement.scrollWidth, fenetre: window.innerWidth }))
    const png = fs.readFileSync(fichier)
    const { pngValide } = await import('./lib/preuves.mjs')
    if (!pngValide(fichier)) e.push(`capture ${relR(fichier)} vide ou uniforme (${png.length} octets)`)
    if (largeurs.defile > largeurs.fenetre) e.push(`défilement horizontal : ${largeurs.defile} px pour ${largeurs.fenetre}`)
  } catch (err) { e.push(`--reel interrompu : ${premiereLigne(err)}`) } finally {
    await navigateur?.close().catch(() => {})
    try {
      if (id) {
        await fetch(`${SB}/storage/v1/object/sites`, { method: 'DELETE', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [`${id}/index.html`] }), signal: AbortSignal.timeout(20_000) })
        await rest(`sites_commandes?id=eq.${id}`, { method: 'DELETE' })
        const reste = await (await rest(`sites_commandes?select=id&id=eq.${id}`)).json().catch(() => null)
        if (!Array.isArray(reste) || reste.length) { e.push('ménage incomplet : la commande d’essai reste'); codeMenage = 1 }
      }
      if (compte) { await rest(`direction_roles?user_id=eq.${compte.id}`, { method: 'DELETE' }); await rest(`journal_direction?acteur_id=eq.${compte.id}`, { method: 'DELETE' }).catch(() => {}); await compte.supprimer() }
    } catch (err) { e.push(`ménage interrompu : ${premiereLigne(err)}`); codeMenage = 1 }
  }
  s.juger('PS-9', e, `${APP} : valider_et_mettre_en_ligne → en_ligne et /site-genere/<id>/ en 200 ; search_console pose la date ; onglet Sites capturé par le juge à 390 × 844, non vide, sans défilement horizontal ; compte, commande et site d'essai (${marque}) défaits`)
}

jugerPreuvesVides(s, 'PS', RAC, FICHE)
process.exit(codeMenage || s.finir())
}
