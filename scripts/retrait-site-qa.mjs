// scripts/retrait-site-qa.mjs — juge du site retiré douze mois après la suppression du compte (fiche 026-026, lot D ;
// critères RT de 026-031), écrit par Claude Code AVANT le module qu'il juge. L'exécutant (Codex) qui le lance n'y touche
// jamais (CLAUDE.md:23). Réécrit en entier le 27/09 : la version du 26/09 (Gemini) ne testait que l'existence d'un fichier.
//
//   node --import ./scripts/ts-loader.mjs scripts/retrait-site-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
//
//   --racine=<d>  importe <d>/lib/siteRetrait.ts et <d>/lib/siteLivraison.ts, lit <d>/lib/purgeComptes.ts (défaut : le
//                 dépôt). « La version d'avant la fiche » (RT-4, RT-7) se lit dans l'historique du dépôt git de la racine
//                 si elle en a un (maquette), sinon dans celui du dépôt qui contient ce script : le plus récent commit dont le
//                 fichier ne porte pas encore l'ajout.
//   --temoin      seulement la non-régression : RT-6 (NR) et RT-PV. RT-6 lance aussi
//                 `node scripts/parcours-commande-qa.mjs --temoin` (le juge de 025-09) et exige son code 0.
//   --reel        Claude Code seulement, après le déploiement de 026-031 : RT-9 contre PRESTI_BASE_URL (défaut
//                 https://prestiapp.fr), une commande d'essai en ligne essai-026-lt-<horodatage> avec un petit site et
//                 compte_supprime_le reculé de 12 mois et 1 jour, /api/cron/livraison appelé avec le secret ; ménage dans un
//                 finally (code 1 s'il échoue). Code 2 si 026-021, 026-028 ou 026-031 n'est pas PASS, ou si une variable
//                 manque.
//
// Les modules sont importés dans des PROCESSUS ENFANTS (ce script, --enfant=complet puis --enfant=livraison), avec les
// doublures de scripts/fixtures/026-livraison-tresor/d/doublures.mjs (base en mémoire, e-mails consignés, stockage en
// mémoire, auth.admin factice ; dans l'enfant « livraison », qui exécute purgerComptes (RT-4) et tourLivraison (RT-7),
// lib/siteRetrait, lib/siteDossier, lib/siteLivraisonBus, lib/siteLivraisonUsine, lib/siteGenerationDistante et
// lib/siteAchatPublic sont des espions) : aucun réseau (fetch piégé).
//
// Contrats que ce juge fixe pour 026-031 (d/commandes.json) :
//   deps = { base, envoyer, detacherDomaine, creerJeton, notifier, maintenant } : base = la doublure de supabaseAdmin ;
//     envoyer(opts) → { ok, error? } (comme sendEmail) ; detacherDomaine(domaine) → booléen (comme removeDomain,
//     lib/vercelDomains.ts:66) ; creerJeton(id, jours) → le jeton ; notifier(sujet, corps) (comme notifierEntreprise) ;
//   dateRetrait(compteSupprimeLe: string ISO) → une date (Date ou ISO) : le jour civil attendu, en UTC ou à Paris ;
//   retraitsDus(deps) → les commandes (objets avec id, ou ids) ; retirer(commande, deps) ; marquerSuppression(ids, deps) ;
//   commandesEnLigneDe(artisanId, deps) → ids (ou objets avec id) ; tourLivraison(deps) appelle retraitsDus, retirer et
//   purgerFichiersExpires avec les arguments qu'il veut.
// Les e-mails rendus (RT-5) sont écrits dans .orchestre/travail/retrait-site-qa/courriels/courriels.txt (la fiche 026-031
// les recopie dans ses preuves).
//
// Sortie : une ligne par critère, puis « retrait-site-qa : PASS|FAIL ». Code 0 seulement si tout est vert ; 1 sinon ; 2 si
// l'appel est invalide ou si un préalable de --reel manque. Un module absent fait échouer RT-1 avec son chemin ; les critères
// suivants sont alors « non jugés ». Écriture seulement sous .orchestre/travail/retrait-site-qa/.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  R, DEPOT_GIT, REFERENCE, lireOptions, refuserAppel, creerSortie, court, premiereLigne, lireRacine, dossierTravail, lancer,
  lancerEnfant, resultatEnfant, importer, jugerDans, jugerPreuvesVides, sansCommentaires, corpsDeFonction, diffLignes, blocs,
  blanchirImports, importsDe, fermante, typecheck, chargerEnvLocal, marqueEssai, fichePass,
} from './fixtures/026-livraison-tresor/commun.mjs'
import {
  jeuD, preparerEnfantD, baseAvantD, texteDans, positionsAppel, dansTry, sousCatchChaine, conditionsEnglobantes,
  contientDate, plusMois, lireProxy, RE_PROMESSE, relR, lireZip, corpsFonctionD, masquer, apparier,
} from './fixtures/026-livraison-tresor/d/commun-d.mjs'

const JUGE = 'retrait-site-qa'
const FICHE = '026-031'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const o = lireOptions(process.argv.slice(2))
const RAC = o.racine
const MODULE = 'lib/siteRetrait.ts', PURGE = 'lib/purgeComptes.ts', LIVRAISON = 'lib/siteLivraison.ts'
const COMMANDE = 'lib/siteCommande.ts', ROUTE_SITE = 'app/site-genere/[commande]/[[...chemin]]/route.ts'
const EXPORTS = ['commandesEnLigneDe', 'marquerSuppression', 'dateRetrait', 'retraitsDus', 'retirer']
const DOUBLES = { 'lib/supabaseAdmin': 'supabaseAdmin', 'lib/email': 'email', 'lib/limites': 'limites', 'lib/alertes': 'alertes', 'lib/flags': 'flags', 'lib/vercelDomains': 'vercelDomains', 'lib/siteDossier': 'siteDossier', 'lib/direction/garde': 'garde' }
const DOUBLES_TOUR = { ...DOUBLES, 'lib/siteRetrait': 'siteRetrait', 'lib/siteLivraisonBus': 'siteLivraisonBus', 'lib/siteLivraisonUsine': 'siteLivraisonUsine', 'lib/siteGenerationDistante': 'siteGenerationDistante', 'lib/siteAchatPublic': 'siteAchatPublic', 'lib/supabaseClient': 'supabaseClient', 'lib/stripe': 'stripe' }
const JOUR = 86_400_000
const ids = (x) => (Array.isArray(x) ? x.map((y) => (y && typeof y === 'object' ? y.id : y)) : null)

// ═══ Les processus enfants ══════════════════════════════════════════════════════════════════════════════════════════════
if (o.enfant === 'complet') {
  const J = jeuD('commandes.json'), T = J.retrait
  const M = new Date(J.maintenant).getTime()
  const { D, reseau } = await preparerEnfantD({ racines: [RAC], doubles: DOUBLES })
  const E = D.etat, X = D.etatD
  const suivi = { reseau, inconnues: E.inconnues }
  const res = { criteres: {}, courriels: '' }
  const sr = await importer(RAC, MODULE)
  const L = sr.m ?? {}
  const lignes = () => E.tables.sites_commandes ?? []
  const ligne = (id) => lignes().find((l) => l.id === id)
  const initialiser = (commandes) => D.reinitialiserD({ tables: { sites_commandes: structuredClone(commandes) } })
  const courriels = { suppression: null, retrait: null }

  await jugerDans(res, 'RT-1', () => {
    const e = []
    if (!sr.m) return { echecs: [`${MODULE} ne s'importe pas : ${sr.erreur}`] }
    if (L.ETAT_RETIRE !== 'retiree') e.push(`ETAT_RETIRE = ${JSON.stringify(L.ETAT_RETIRE)}, 'retiree' attendu`)
    for (const n of EXPORTS) if (typeof L[n] !== 'function') e.push(`${MODULE} n'exporte pas la fonction ${n}`)
    return { echecs: e, detail: `${MODULE} exporte ETAT_RETIRE = 'retiree', ${EXPORTS.join(', ')}` }
  }, suivi)

  await jugerDans(res, 'RT-2', async () => {
    const e = []
    if (typeof L.dateRetrait !== 'function' || typeof L.retraitsDus !== 'function') return { echecs: ['dateRetrait ou retraitsDus absente (RT-1)'] }
    const jourDe = (d) => { const x = new Date(d); if (!Number.isFinite(x.getTime())) return [String(d)]; return [x.toISOString().slice(0, 10), new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(x)] }
    for (const [entree, voulu] of T.dates) {
      let r
      try { r = L.dateRetrait(entree) } catch (err) { e.push(`dateRetrait(${entree}) lève (${premiereLigne(err)})`); continue }
      if (r && typeof r.then === 'function') { e.push(`dateRetrait(${entree}) rend une promesse : une fonction pure attendue`); continue }
      if (!jourDe(r).includes(voulu)) e.push(`dateRetrait(${entree.slice(0, 10)}) = ${court(r instanceof Date ? r.toISOString() : JSON.stringify(r), 40)}, le ${voulu} attendu`)
    }
    initialiser(T.dus)
    let dus
    try { dus = ids(await L.retraitsDus({ base: D.supabaseAdmin, maintenant: () => new Date(M) })) } catch (err) { e.push(`retraitsDus lève (${premiereLigne(err)})`) }
    if (dus) {
      const voulu = [T.dus[0].id]
      if (JSON.stringify([...dus].sort()) !== JSON.stringify(voulu)) e.push(`retraitsDus (maintenant ${J.maintenant}) : ${JSON.stringify(dus.map((x) => String(x).slice(-4)))}, seule …${voulu[0].slice(-4)} (J+365) attendue — pas J+364, pas sans date, pas retirée, pas payée`)
    }
    return { echecs: e, detail: `dateRetrait : 24/09/2025 → 24/09/2026, 29/02/2028 → 28/02/2029, 31/01/2026 → 31/01/2027 ; retraitsDus, horloge injectée au ${J.maintenant} : la commande en ligne à J+365, pas celle à J+364, ni une sans date, ni une retirée, ni une payée` }
  }, suivi)

  // ── RT-3 : retirer, avec des doublures injectées et un journal des appels ─────────────────────────────────────────────
  const scenario = (modes = {}) => {
    const journal = []
    let n = 0
    X.apresEcriture = (q) => { if (q.table === 'sites_commandes' && q.genre === 'update') journal.push({ quoi: 'maj', valeurs: q.valeurs, filtres: q.filtres, lignes: q.lignes }) }
    const deps = {
      base: D.supabaseAdmin,
      maintenant: () => new Date(M),
      creerJeton: async (id, jours) => { journal.push({ quoi: 'jeton', id, jours }); return `jeton-rt-${++n}-${id.slice(-4)}` },
      envoyer: async (opts) => { journal.push({ quoi: 'email', opts: structuredClone(opts) }); if (modes.envoi === 'leve') throw new Error('envoi en panne (doublure RT-3)'); return modes.envoi === 'refuse' ? { ok: false, error: 'refusé (doublure RT-3)' } : { ok: true, id: `e${n}` } },
      detacherDomaine: async (d) => { journal.push({ quoi: 'detacher', domaine: d }); if (modes.detache === 'leve') throw new Error('Vercel en panne (doublure RT-3)'); return modes.detache !== 'refuse' },
      notifier: async (sujet, corps) => { journal.push({ quoi: 'notifier', sujet, corps }); return { ok: true } },
    }
    return { journal, deps }
  }
  const retirer = async (c, deps) => { try { await L.retirer(structuredClone(c), deps); return null } catch (err) { return premiereLigne(err) } }
  let jetonRetrait = null
  await jugerDans(res, 'RT-3', async () => {
    const e = []
    if (typeof L.retirer !== 'function') return { echecs: ['retirer absente (RT-1)'] }
    const [RA, RB] = T.a_retirer
    // succès, avec domaine
    initialiser(T.a_retirer)
    const s1 = scenario()
    const l1 = await retirer(RA, s1.deps)
    if (l1) e.push(`succès : retirer lève (${l1})`)
    const i = (q, depuis = 0) => s1.journal.findIndex((x, k) => k >= depuis && x.quoi === q)
    const iJ = i('jeton'), iE = i('email'), iM = s1.journal.findIndex((x) => x.quoi === 'maj' && x.valeurs?.etat === 'retiree'), iD = i('detacher'), iN = s1.journal.map((x) => x.quoi).lastIndexOf('notifier')
    const ordre = s1.journal.map((x) => x.quoi).join(' → ')
    if (iJ < 0 || iE < 0 || iM < 0 || iD < 0 || iN < 0) e.push(`succès : appels ${ordre || 'aucun'} ; jeton, e-mail, mise à jour (etat retiree), détachement et notification attendus`)
    else if (!(iJ < iE && iE < iM && iM < iD && iD < iN)) e.push(`succès : ordre ${ordre} ; jeton → e-mail → mise à jour → détachement → notification attendu`)
    const jeton = s1.journal.find((x) => x.quoi === 'jeton')
    if (jeton && (jeton.id !== RA.id || jeton.jours !== 90)) e.push(`creerJeton(${court(jeton.id, 40)}, ${jeton.jours}) ; (id, 90) attendu`)
    const mail = s1.journal.find((x) => x.quoi === 'email')
    if (mail && mail.opts?.to !== RA.email) e.push(`e-mail de retrait à ${JSON.stringify(mail.opts?.to)}, ${RA.email} attendu`)
    if (mail && mail.opts?.critique !== true) e.push(`e-mail de retrait sans critique: true (${JSON.stringify(mail.opts?.critique)})`)
    if (mail) { courriels.retrait = mail.opts; jetonRetrait = `jeton-rt-1-${RA.id.slice(-4)}` }
    const apres = ligne(RA.id)
    if (apres?.etat !== 'retiree' || !apres?.retiree_le || !apres?.dossier_envoye_le) e.push(`succès : commande ${JSON.stringify({ etat: apres?.etat, retiree_le: apres?.retiree_le, dossier_envoye_le: apres?.dossier_envoye_le })} ; retiree avec retiree_le et dossier_envoye_le attendus`)
    const maj = s1.journal.find((x) => x.quoi === 'maj' && x.valeurs?.etat === 'retiree')
    if (maj && !maj.filtres.some((f) => f[0] === 'eq' && f[1] === 'etat' && f[2] === 'en_ligne')) e.push(`la mise à jour n'est pas conditionnée à etat = en_ligne (filtres ${court(JSON.stringify(maj.filtres), 90)})`)
    const d1 = s1.journal.filter((x) => x.quoi === 'detacher')
    if (d1.length !== 1 || d1[0].domaine !== RA.domaine) e.push(`détachement : ${JSON.stringify(d1.map((x) => x.domaine))}, [${RA.domaine}] attendu`)
    for (const n of s1.journal.filter((x) => x.quoi === 'notifier')) if (String(n.sujet).includes(RA.email)) e.push(`le sujet d'une notification contient l'adresse de l'artisan (« ${court(n.sujet, 60)} »)`)
    const alertesSucces = s1.journal.filter((x) => x.quoi === 'notifier').length + E.alertes.length
    // second appel sur la même commande (l'objet d'avant, « en_ligne ») : aucun second e-mail
    const n0 = s1.journal.filter((x) => x.quoi === 'email').length
    const l2 = await retirer(RA, s1.deps)
    if (l2) e.push(`second appel : retirer lève (${l2})`)
    if (s1.journal.filter((x) => x.quoi === 'email').length !== n0) e.push('second appel sur la même commande : un second e-mail est parti')
    if (s1.journal.filter((x) => x.quoi === 'detacher').length !== 1) e.push('second appel sur la même commande : un second détachement')
    // envoi en échec (refusé, puis levé) : aucune mise à jour, aucun détachement
    for (const envoi of ['refuse', 'leve']) {
      initialiser(T.a_retirer)
      const s = scenario({ envoi })
      await retirer(RA, s.deps)
      if (s.journal.some((x) => x.quoi === 'maj')) e.push(`envoi ${envoi === 'refuse' ? 'refusé' : 'qui lève'} : une mise à jour a eu lieu`)
      if (ligne(RA.id)?.etat !== 'en_ligne') e.push(`envoi ${envoi === 'refuse' ? 'refusé' : 'qui lève'} : la commande est passée à ${ligne(RA.id)?.etat}`)
      if (s.journal.some((x) => x.quoi === 'detacher')) e.push(`envoi ${envoi === 'refuse' ? 'refusé' : 'qui lève'} : detacherDomaine appelé`)
    }
    // pas de domaine : pas de détachement
    initialiser(T.a_retirer)
    const s3 = scenario()
    await retirer(RB, s3.deps)
    if (s3.journal.some((x) => x.quoi === 'detacher')) e.push('sans domaine : detacherDomaine appelé')
    if (ligne(RB.id)?.etat !== 'retiree') e.push(`sans domaine : la commande est ${ligne(RB.id)?.etat}, retiree attendue`)
    // détachement en échec (refusé, puis levé) : la commande reste retiree, et une alerte part
    for (const detache of ['refuse', 'leve']) {
      initialiser(T.a_retirer)
      D.etat.alertes.length = 0
      const s = scenario({ detache })
      const l = await retirer(RA, s.deps)
      const nom = detache === 'refuse' ? 'détachement refusé (false)' : 'détachement qui lève'
      if (l) e.push(`${nom} : retirer lève (${l})`)
      if (ligne(RA.id)?.etat !== 'retiree') e.push(`${nom} : la commande est ${ligne(RA.id)?.etat}, elle doit rester retiree`)
      const alertes = s.journal.filter((x) => x.quoi === 'notifier').length + E.alertes.length
      if (alertes <= alertesSucces) e.push(`${nom} : ${alertes} notification(s) ou alerte(s), comme un succès (${alertesSucces}) : une alerte de plus attendue`)
    }
    return { echecs: e, detail: `succès : jeton (id, 90) → e-mail critique à l'artisan → mise à jour conditionnée à en_ligne (retiree, retiree_le, dossier_envoye_le) → détachement du domaine → notification (sujet sans l'adresse) ; second appel : ni e-mail ni détachement ; envoi refusé ou qui lève : ni mise à jour ni détachement ; sans domaine : pas de détachement ; détachement refusé ou qui lève : la commande reste retiree, une alerte de plus part` }
  }, suivi)

  await jugerDans(res, 'RT-4', async () => {
    const e = []
    // Le source de la purge.
    const cur = lireRacine(RAC, PURGE)
    if (cur === null) return { echecs: [`${PURGE} absent`] }
    const sc = sansCommentaires(cur)
    const f = corpsFonctionD(sc, 'purgerComptes')
    if (!f) e.push(`${PURGE} : purgerComptes introuvable`)
    else {
      const debut = f.debut
      const pos = (nom) => positionsAppel(sc, nom).filter((p) => p > debut && p < f.fin)
      const [cel] = pos('commandesEnLigneDe'), [mar] = pos('marquerSuppression')
      const effacements = [...pos('effacer'), ...pos('anonymiser')]
      const ifEchec = /\bif\s*\(\s*echec\s*\)\s*\{/.exec(masquer(sc).slice(debut, f.fin))
      if (cel === undefined) e.push(`${PURGE} : purgerComptes n'appelle pas commandesEnLigneDe(`)
      else if (!effacements.length || cel > Math.min(...effacements)) e.push(`${PURGE} : commandesEnLigneDe( ne précède pas l'appel à effacer/anonymiser`)
      if (mar === undefined) e.push(`${PURGE} : purgerComptes n'appelle pas marquerSuppression(`)
      else if (!ifEchec) e.push(`${PURGE} : la ligne if (echec) { de purgerComptes est introuvable`)
      else {
        const ouvre = debut + ifEchec.index + ifEchec[0].length - 1, ferme = apparier(sc, ouvre)
        if (mar < ferme) e.push(`${PURGE} : marquerSuppression( est ${mar > ouvre ? 'dans' : 'avant'} le bloc if (echec) : il doit le suivre (purge réussie seulement)`)
      }
      for (const [nom, p] of [['commandesEnLigneDe', cel], ['marquerSuppression', mar]]) if (p !== undefined && !dansTry(sc, p) && !sousCatchChaine(sc, p)) e.push(`${PURGE} : ${nom}( hors d'un try/catch (une erreur doit être journalisée sans arrêter la purge)`)
    }
    // Le reste du diff de lib/purgeComptes.ts est nul.
    const base = baseAvantD(RAC, PURGE, /\bcommandesEnLigneDe\b|\bmarquerSuppression\b/)
    if (base.texte === null) e.push(`${PURGE} : aucune version d'avant la fiche dans l'historique`)
    else {
      const cle = (i) => i.noms.map((n) => `${i.spec}#${n}`)
      const avant = new Set(importsDe(base.texte).flatMap(cle)), apres = importsDe(cur).flatMap(cle)
      for (const n of avant) if (!apres.includes(n)) e.push(`${PURGE} : import retiré ${n.replace('#', ' → ')}`)
      for (const n of apres) if (!avant.has(n) && !/#(commandesEnLigneDe|marquerSuppression)$/.test(n)) e.push(`${PURGE} : import ajouté hors contrat ${n.replace('#', ' → ')}`)
      const d = diffLignes(blanchirImports(base.texte), blanchirImports(cur))
      for (const x of d.retraits) if (x.texte.trim()) e.push(`${PURGE} (base ${base.commit.slice(0, 7)}) : ligne ${x.i + 1} retirée ou changée : « ${court(x.texte, 70)} »`)
      const groupes = blocs(d.ajouts).map((g) => sansCommentaires(g.map((l) => l.texte).join('\n')).trim()).filter(Boolean)
      const tout = groupes.join('\n')
      // Un bloc ajouté porte l'un des deux appels, ou ne fait que déclarer une variable vide qu'un appel ajouté remplit.
      const declaration = /^(?:let|const|var)\s+([\w$]+)\s*(?::[^=]+)?=\s*(?:\[\]|null|undefined|''|""|0|false|new Set\(\)|new Map\(\))\s*;?$/
      for (const g of groupes) {
        if (/\b(commandesEnLigneDe|marquerSuppression)\s*\(/.test(g)) continue
        const lignesG = g.split('\n').map((l) => l.trim()).filter(Boolean)
        if (lignesG.every((l) => { const m = declaration.exec(l); return m && new RegExp(`\\b${m[1]}\\b`).test(tout.replace(l, '')) })) continue
        e.push(`${PURGE} : lignes ajoutées sans rapport avec le retrait : « ${court(g, 80)} »`)
      }
      for (const n of ['commandesEnLigneDe', 'marquerSuppression']) { const k = (tout.match(new RegExp(`\\b${n}\\s*\\(`, 'g')) ?? []).length; if (k !== 1) e.push(`${PURGE} : ${k} appel(s) ajouté(s) à ${n}(, 1 attendu`) }
    }
    // marquerSuppression et commandesEnLigneDe, en base en mémoire.
    if (typeof L.marquerSuppression === 'function') {
      const S = T.suppression
      initialiser(S)
      const envois = []
      try { await L.marquerSuppression(S.map((c) => c.id), { base: D.supabaseAdmin, maintenant: () => new Date(M), envoyer: async (x) => { envois.push(structuredClone(x)); return { ok: true } }, notifier: async () => ({ ok: true }) }) } catch (err) { e.push(`marquerSuppression lève (${premiereLigne(err)})`) }
      const [m1, m2, m3, m4] = S.map((c) => ligne(c.id))
      if (!m1?.compte_supprime_le || Math.abs(new Date(m1.compte_supprime_le).getTime() - M) > 60_000) e.push(`marquerSuppression : la commande en ligne sans date porte ${JSON.stringify(m1?.compte_supprime_le)}, maintenant attendu`)
      if (m2?.compte_supprime_le !== S[1].compte_supprime_le) e.push(`marquerSuppression a réécrit une date existante (${S[1].compte_supprime_le} → ${m2?.compte_supprime_le})`)
      if (m3?.compte_supprime_le || m4?.compte_supprime_le) e.push(`marquerSuppression a daté une commande qui n'est pas en ligne (${[m3, m4].filter((x) => x?.compte_supprime_le).map((x) => x.etat).join(', ')})`)
      if (!envois.some((x) => x.to === S[0].email)) e.push(`marquerSuppression : aucun e-mail « suppression » à ${S[0].email}`)
      if (envois.some((x) => [S[2].email, S[3].email].includes(x.to))) e.push('marquerSuppression : un e-mail à une commande qui n’est pas en ligne')
      courriels.suppression = envois.find((x) => x.to === S[0].email) ?? null
    } else e.push('marquerSuppression absente (RT-1)')
    if (typeof L.commandesEnLigneDe === 'function') {
      initialiser(T.artisan_commandes)
      let x = null
      try { x = ids(await L.commandesEnLigneDe(T.artisan, { base: D.supabaseAdmin })) } catch (err) { e.push(`commandesEnLigneDe lève (${premiereLigne(err)})`) }
      const voulu = T.artisan_commandes.filter((c) => c.artisan_id === T.artisan && c.etat === 'en_ligne').map((c) => c.id).sort()
      if (x && JSON.stringify([...x].sort()) !== JSON.stringify(voulu)) e.push(`commandesEnLigneDe : ${JSON.stringify(x.map((y) => String(y).slice(-4)))}, ${JSON.stringify(voulu.map((y) => y.slice(-4)))} attendus (en ligne, de cet artisan seulement)`)
    }
    return { echecs: [...new Set(e)], detail: `purgerComptes : commandesEnLigneDe( avant effacer/anonymiser, marquerSuppression( après le bloc if (echec), chacun dans un try ; le reste du diff de ${PURGE} est nul (base ${base.commit.slice(0, 7)} : deux ajouts et leur import) ; marquerSuppression ne date que la commande en ligne sans date et lui écrit ; commandesEnLigneDe rend les commandes en ligne de l'artisan, et elles seules` }
  }, suivi)

  await jugerDans(res, 'RT-5', () => {
    const e = []
    const texte = (x) => (x ? `${x.subject ?? ''}\n${x.text ?? ''}${x.html ? `\n${x.html}` : ''}` : '')
    const sup = texte(courriels.suppression), ret = texte(courriels.retrait)
    const retrait = plusMois(M, 12), expire = new Date(M + 90 * JOUR)
    if (!sup) e.push('e-mail « suppression » non rendu (RT-4)')
    else {
      if (!contientDate(sup, retrait)) e.push(`l'e-mail « suppression » ne donne pas la date du retrait (${retrait.toISOString().slice(0, 10)}, écrite 14/10/2027, 14 octobre 2027 ou 2027-10-14)`)
      if (!/sur simple demande/i.test(sup)) e.push('l’e-mail « suppression » ne dit pas « sur simple demande »')
    }
    if (!ret) e.push('e-mail « retrait » non rendu (RT-3)')
    else {
      const liens = [...ret.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map((m) => { try { return new URL(m[0]) } catch { return null } }).filter(Boolean)
      const bon = liens.find((u) => u.protocol === 'https:' && u.hostname === 'prestiapp.fr' && u.pathname === `/api/site-dossier/${T.a_retirer[0].id}` && u.searchParams.has('j'))
      if (!bon) e.push(`l'e-mail « retrait » n'a pas de lien https://prestiapp.fr/api/site-dossier/${T.a_retirer[0].id}?j=… (liens : ${court(liens.map(String).join(' '), 120) || 'aucun'})`)
      else if (jetonRetrait && bon.searchParams.get('j') !== jetonRetrait) e.push(`le lien porte j=${court(bon.searchParams.get('j'), 30)}, pas le jeton créé (${jetonRetrait})`)
      if (!contientDate(ret, expire)) e.push(`l'e-mail « retrait » ne donne pas la date d'expiration du lien (${expire.toISOString().slice(0, 10)})`)
    }
    for (const [nom, t] of [['suppression', sup], ['retrait', ret]]) { const m = RE_PROMESSE.exec(t); if (m) e.push(`l'e-mail « ${nom} » promet : « ${m[0]} »`) }
    res.courriels = [['suppression', courriels.suppression], ['retrait', courriels.retrait]].map(([k, x]) => `═══ ${k} ═══\nÀ : ${x?.to ?? '(non rendu)'}\nSujet : ${x?.subject ?? ''}\n\n${x?.text ?? ''}\n`).join('\n')
    return { echecs: e, detail: `« suppression » : la date du retrait (${retrait.toISOString().slice(0, 10)}) et « sur simple demande » ; « retrait » : https://prestiapp.fr/api/site-dossier/<id>?j=<le jeton créé> et la date d'expiration (${expire.toISOString().slice(0, 10)}) ; aucun ne promet garantie, classement ni première page` }
  }, suivi)
  X.apresEcriture = null
  resultatEnfant(JUGE, res)
} else if (o.enfant === 'livraison') {
  // ── RT-7 : tourLivraison, avec siteRetrait, siteDossier et les modules de 026-141 en espions ──────────────────────────
  const { D, reseau } = await preparerEnfantD({ racines: [RAC], doubles: DOUBLES_TOUR })
  const E = D.etat, X = D.etatD
  const res = { criteres: {} }
  const sl = await importer(RAC, LIVRAISON)
  await jugerDans(res, 'RT-7', async () => {
    const e = []
    if (!sl.m || typeof sl.m.tourLivraison !== 'function') return { echecs: [`${LIVRAISON} : tourLivraison ne s'importe pas (${sl.erreur ?? 'absente'})`] }
    const tour = async (pause, conf = {}) => {
      D.reinitialiserD({ tables: { sites_commandes: [] }, retraitsDus: conf.dus ?? [] })
      X.retraitsDusLeve = !!conf.leve
      let leve = null
      try { await sl.m.tourLivraison({ base: D.supabaseAdmin, envoyer: D.sendEmail, statutDomaine: D.getStatus, maintenant: () => new Date('2026-10-14T10:00:00Z'), enPause: async () => pause }) } catch (err) { leve = premiereLigne(err) }
      const n = (nom) => X.espions.filter((x) => x.nom === nom)
      return { leve, retraitsDus: n('retraitsDus').length, retirer: n('retirer'), purger: n('purgerFichiersExpires').length }
    }
    const douze = Array.from({ length: 12 }, (_, i) => ({ id: `d0260000-0000-4000-8000-0000000fd0${String(i).padStart(2, '0')}`, etat: 'en_ligne', email: `tour${i}@presti-test.invalid`, domaine: null, compte_supprime_le: '2025-01-01T00:00:00.000Z' }))
    const a = await tour(true, { dus: douze })
    if (a.leve) e.push(`en pause : tourLivraison lève (${a.leve})`)
    if (a.retraitsDus || a.retirer.length || a.purger) e.push(`en pause : retraitsDus ×${a.retraitsDus}, retirer ×${a.retirer.length}, purgerFichiersExpires ×${a.purger} ; rien attendu`)
    const b = await tour(false, { dus: douze })
    if (b.leve) e.push(`hors pause : tourLivraison lève (${b.leve})`)
    if (b.retraitsDus !== 1) e.push(`hors pause : retraitsDus ×${b.retraitsDus}, 1 attendu`)
    if (b.retirer.length !== 10) e.push(`hors pause, 12 retraits dus : retirer ×${b.retirer.length}, 10 au plus par passage attendus`)
    else if (!b.retirer.every((x) => douze.some((c) => c.id === (x.args[0]?.id ?? x.args[0])))) e.push('retirer reçoit autre chose que les commandes rendues par retraitsDus')
    if (b.purger !== 1) e.push(`hors pause : purgerFichiersExpires ×${b.purger}, 1 attendu`)
    const c = await tour(false, { dus: douze, leve: true })
    if (c.leve) e.push(`retraitsDus qui lève : tourLivraison lève à son tour (${c.leve})`)
    if (c.purger !== 1) e.push(`retraitsDus qui lève : purgerFichiersExpires ×${c.purger}, 1 attendu (chaque bloc a son try)`)
    void E; void reseau
    return { echecs: e, detail: 'exécuté : en pause, ni retraitsDus, ni retirer, ni purgerFichiersExpires ; hors pause, retraitsDus une fois, retirer 10 fois sur 12 dus, puis purgerFichiersExpires ; retraitsDus qui lève n’empêche pas la purge' }
  }, { reseau, inconnues: E.inconnues })
  // ── RT-4, la purge exécutée : purgerComptes avec commandesEnLigneDe et marquerSuppression en espions ──────────────────
  const pc = await importer(RAC, PURGE)
  await jugerDans(res, 'RT-4-purge', async () => {
    if (!pc.m || typeof pc.m.purgerComptes !== 'function') return { echecs: [`${PURGE} : purgerComptes ne s'importe pas (${pc.erreur ?? 'absente'})`] }
    const e = []
    const ART = { id: 'd0260000-0000-4000-8000-0000000000e1', email: 'purge.temoin@presti-test.invalid', nom: 'Artisan purgé (témoin)', stripe_subscription_id: null, suppression_demandee_le: '2020-01-01T00:00:00.000Z' }
    const IDS = ['d0260000-0000-4000-8000-00000000ee01', 'd0260000-0000-4000-8000-00000000ee02']
    const passe = async ({ leve = [], authPanne = false } = {}) => {
      D.reinitialiserD({ tables: { artisans: [structuredClone(ART)], factures: [] }, rendus: { commandesEnLigneDe: IDS }, leve })
      X.authPanne = authPanne
      let r = null, erreur = null
      try { r = await pc.m.purgerComptes() } catch (err) { erreur = premiereLigne(err) }
      const esp = (n) => X.espions.filter((x) => x.nom === n)
      const effacement = X.requetes.find((q) => q.table === 'artisans' && (q.genre === 'delete' || q.genre === 'update'))
      return { r, erreur, cel: esp('commandesEnLigneDe'), mar: esp('marquerSuppression'), effacement, reste: (E.tables.artisans ?? []).some((x) => x.id === ART.id) }
    }
    const a = await passe()
    if (a.erreur) e.push(`purge réussie : purgerComptes lève (${a.erreur})`)
    if (a.cel.length !== 1 || a.cel[0].args[0] !== ART.id) e.push(`purge réussie : commandesEnLigneDe ${JSON.stringify(a.cel.map((x) => x.args))}, une fois avec l'id de l'artisan attendu`)
    else if (!a.effacement || a.cel[0].rang > a.effacement.rang) e.push('commandesEnLigneDe n’est pas appelée avant l’effacement de la ligne artisan (après, artisan_id est nul)')
    if (a.mar.length !== 1 || JSON.stringify(a.mar[0].args[0]) !== JSON.stringify(IDS)) e.push(`purge réussie : marquerSuppression ${JSON.stringify(a.mar.map((x) => x.args))}, une fois avec les ids rendus par commandesEnLigneDe attendu`)
    if (a.reste) e.push('purge réussie : la ligne artisan reste')
    const b = await passe({ leve: ['commandesEnLigneDe'] })
    if (b.erreur || b.reste || b.r?.purges !== 1) e.push(`commandesEnLigneDe qui lève : la purge ne va pas au bout (${b.erreur ? `lève : ${b.erreur}` : `purges = ${b.r?.purges}, ligne artisan ${b.reste ? 'restée' : 'effacée'}`}) ; l'erreur doit être journalisée sans arrêter la purge`)
    const c = await passe({ leve: ['marquerSuppression'] })
    if (c.erreur || c.reste || c.r?.purges !== 1) e.push(`marquerSuppression qui lève : la purge ne va pas au bout (${c.erreur ? `lève : ${c.erreur}` : `purges = ${c.r?.purges}`}) ; l'erreur doit être journalisée sans arrêter la purge`)
    const d = await passe({ authPanne: true })
    if (d.mar.length) e.push('purge en échec (auth refuse) : marquerSuppression appelée — la date ne se pose que si la purge a réussi')
    return { echecs: e, detail: 'purgerComptes exécutée : commandesEnLigneDe(id de l’artisan) avant l’effacement de sa ligne, marquerSuppression(ces ids) après une purge réussie et jamais après un échec ; l’une ou l’autre qui lève n’arrête pas la purge' }
  }, { reseau, inconnues: E.inconnues })
  resultatEnfant(JUGE, res)
} else if (o.enfant === 'reel-jeton') {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.REEL_SUPABASE_URL ?? ''
  const sd = await importer(RAC, 'lib/siteDossier.ts')
  let jeton = null
  try { jeton = await sd.m.creerJetonDossier(o.valeurs.commande, 90) } catch { jeton = null }
  resultatEnfant(JUGE, { jeton })
} else {
// ═══ Le processus principal ═════════════════════════════════════════════════════════════════════════════════════════════
if (o.inconnues.length || o.positionnels.length) refuserAppel(JUGE, `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (o.temoin && o.reel) refuserAppel(JUGE, '--temoin et --reel ensemble')
if (!fs.existsSync(RAC)) refuserAppel(JUGE, `racine introuvable : ${RAC}`)
const IDS = o.temoin ? ['RT-6', 'RT-PV'] : ['RT-1', 'RT-2', 'RT-3', 'RT-4', 'RT-5', 'RT-6', 'RT-7', 'RT-8', ...(o.reel ? ['RT-9'] : []), 'RT-PV']
const s = creerSortie(JUGE, IDS, `${JUGE} — fiche ${FICHE}, racine ${relR(RAC)}, mode ${o.temoin ? 'témoin' : o.reel ? 'réel' : 'complet'}`, { nr: ['RT-6'] })
const ENFANT = ['RT-1', 'RT-2', 'RT-3', 'RT-4', 'RT-5']

let suite = true
let livraison = null
if (!o.temoin) {
  if (!fs.existsSync(path.join(RAC, MODULE))) {
    s.echoue('RT-1', `${MODULE} absent : le module de la fiche ${FICHE} n'existe pas (encore)`)
    s.nonJuges(IDS.filter((x) => !['RT-1', 'RT-6', 'RT-PV'].includes(x)), `${MODULE} absent (RT-1)`)
    suite = false
  } else {
    const r = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'complet', timeout: 180_000 })
    if (!r.res) {
      s.echoue('RT-1', `l'enfant qui importe ${MODULE} n'a rien rendu (code ${r.code}${r.erreur ? `, ${r.erreur}` : ''}) — ${court(r.sortie.trim().split(/\r?\n/).slice(-3).join(' | '), 240)}`)
      s.nonJuges(ENFANT.slice(1), 'enfant sans résultat (RT-1)')
    } else {
      if (r.res.courriels) {
        const d = dossierTravail(JUGE, 'courriels')
        fs.writeFileSync(path.join(d, 'courriels.txt'), r.res.courriels)
        if (r.res.criteres['RT-5']) r.res.criteres['RT-5'].detail += ` ; rendus écrits dans ${relR(path.join(d, 'courriels.txt'))}`
      }
      // La purge et le tour s'exécutent dans un second enfant (lib/siteRetrait y est un espion) : RT-4 réunit les deux.
      livraison = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'livraison', timeout: 180_000 })
      const purge = livraison.res?.criteres?.['RT-4-purge'] ?? { echecs: [`l'enfant qui exécute purgerComptes n'a rien rendu (code ${livraison.code}) — ${court(livraison.sortie.trim().split(/\r?\n/).slice(-2).join(' | '), 160)}`], detail: '' }
      if (r.res.criteres['RT-4']) r.res.criteres['RT-4'] = { echecs: [...r.res.criteres['RT-4'].echecs, ...purge.echecs], detail: `${r.res.criteres['RT-4'].detail} ; ${purge.detail}` }
      for (const id of ENFANT) { const c = r.res.criteres[id]; if (c) s.juger(id, c.echecs, c.detail); else s.echoue(id, 'non rendu par l’enfant') }
    }
  }
}

// ── RT-6 (NR) : ce qui sert le site en ligne n'a pas bougé ; parcours-commande-qa --temoin vert ──────────────────────────
await s.critere('RT-6', () => {
  const e = []
  const declaration = (t, nom) => {
    const sc = sansCommentaires(t ?? '')
    const m = new RegExp(`export\\s+const\\s+${nom}\\b[^=]*=\\s*`).exec(sc)
    if (!m) return null
    const i = m.index + m[0].length
    const ouvre = sc[i], ferme = ouvre === '[' ? ']' : ouvre === '{' ? '}' : null
    if (!ferme) return null
    let n = 0, j = i
    for (; j < sc.length; j++) { if (sc[j] === ouvre) n++; else if (sc[j] === ferme) { n--; if (n === 0) break } }
    return sc.slice(i, j + 1).replace(/\s+/g, ' ').replace(/,\s*([\]}])/g, '$1').trim()
  }
  const ref = texteDans(DEPOT_GIT, REFERENCE, COMMANDE), cur = lireRacine(RAC, COMMANDE)
  if (!ref) e.push(`${COMMANDE} illisible à la référence ${String(REFERENCE).slice(0, 7)}`)
  if (!cur) e.push(`${COMMANDE} absent de la racine`)
  if (ref && cur) for (const n of ['ETATS', 'TRANSITIONS']) {
    const a = declaration(ref, n), b = declaration(cur, n)
    if (!a || !b) e.push(`${COMMANDE} : ${n} introuvable`)
    else if (a !== b) e.push(`${COMMANDE} : ${n} changé depuis la référence ${String(REFERENCE).slice(0, 7)} (« ${court(b, 90)} » au lieu de « ${court(a, 90)} »)`)
  }
  const route = lireRacine(RAC, ROUTE_SITE)
  if (route === null) e.push(`${ROUTE_SITE} absente`)
  else if (!/\bc\.etat\s*===\s*['"]en_ligne['"]/.test(sansCommentaires(route))) e.push(`${ROUTE_SITE} : la condition c.etat === 'en_ligne' a disparu`)
  const px = lireProxy(RAC)
  if (!px) e.push('ni proxy.ts ni middleware.ts')
  else if (!/etat=eq\.en_ligne/.test(sansCommentaires(px.texte))) e.push(`${px.nom} : le filtre etat=eq.en_ligne a disparu`)
  const t0 = Date.now()
  // Une seconde chance, et une seule : le 27/09, juste après un git merge, git a rendu une fois « révision introuvable »
  // (paquets en cours de réécriture) ; un vrai rouge le reste deux fois.
  let pc = lancer(process.execPath, [path.join(R, 'scripts', 'parcours-commande-qa.mjs'), '--temoin'], { cwd: R, timeout: 600_000 })
  if (pc.code !== 0) pc = lancer(process.execPath, [path.join(R, 'scripts', 'parcours-commande-qa.mjs'), '--temoin'], { cwd: R, timeout: 600_000 })
  const derniere = pc.sortie.trim().split(/\r?\n/).pop()
  if (pc.code !== 0) e.push(`node scripts/parcours-commande-qa.mjs --temoin : code ${pc.code}${pc.erreur ? ` (${pc.erreur})` : ''} — ${court(pc.sortie.split(/\r?\n/).find((l) => /^FAIL|❌/.test(l)) ?? derniere, 140)}`)
  return { echecs: e, detail: `ETATS et TRANSITIONS de ${COMMANDE} égaux à ceux de la référence ${String(REFERENCE).slice(0, 7)} ; ${ROUTE_SITE} garde c.etat === 'en_ligne' ; ${px?.nom ?? '?'} (${px?.ou ?? '?'}) garde etat=eq.en_ligne ; node scripts/parcours-commande-qa.mjs --temoin → code 0 en ${Math.round((Date.now() - t0) / 1000)} s (« ${court(derniere, 50)} »)` }
})

if (!o.temoin && suite) {
  // ── RT-7 : le diff de lib/siteLivraison.ts, puis tourLivraison exécuté ──────────────────────────────────────────────────
  await s.critere('RT-7', () => {
    const e = []
    const cur = lireRacine(RAC, LIVRAISON)
    if (cur === null) return { echecs: [`${LIVRAISON} absent`] }
    const base = baseAvantD(RAC, LIVRAISON, /\bretraitsDus\b/)
    const d = diffLignes(base.texte ?? '', cur)
    const ajoute = sansCommentaires(d.ajouts.map((l) => l.texte).join('\n'))
    const sc = sansCommentaires(cur)
    const tour = corpsFonctionD(sc, 'tourLivraison')
    if (!tour) e.push(`${LIVRAISON} : tourLivraison introuvable`)
    const gardes = new Set([...sc.matchAll(/\b([\w$]+)\s*=\s*(?:await\s+)?[\w$.]*\benPause\s*\(/g)].map((m) => m[1]))
    for (const nom of ['retraitsDus', 'retirer', 'purgerFichiersExpires']) {
      if (!new RegExp(`\\b${nom}\\s*\\(`).test(ajoute)) { e.push(`le diff de ${LIVRAISON} (base ${base.commit.slice(0, 7)}) n'ajoute pas d'appel à ${nom}(`); continue }
      if (!tour) continue
      const p = positionsAppel(sc, nom).filter((x) => x > tour.debut && x < tour.fin)
      if (!p.length) { e.push(`${nom}( n'est pas appelé dans tourLivraison`); continue }
      // Le garde : l'appel est sous une condition qui lit la pause, ou le diff ajoute une lecture de enPause (sortie anticipée,
      // else…) ; ce que le garde FAIT est jugé plus bas, tour exécuté en pause et hors pause.
      const gardeAjoute = /\benPause\b/.test(ajoute) || [...gardes].some((g) => new RegExp(`\\b${g}\\b`).test(ajoute))
      for (const x of p) {
        if (!dansTry(sc, x)) e.push(`${nom}( hors d'un try dans tourLivraison`)
        const conditions = conditionsEnglobantes(sc, x)
        if (!gardeAjoute && !conditions.some((c) => /\benPause\b/.test(c) || [...gardes].some((g) => new RegExp(`\\b${g}\\b`).test(c)))) e.push(`${nom}( n'est sous aucun garde sur enPause`)
      }
    }
    const r = livraison ?? lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'livraison', timeout: 180_000 })
    const c = r.res?.criteres?.['RT-7']
    if (!c) e.push(`l'enfant qui exécute tourLivraison n'a rien rendu (code ${r.code}) — ${court(r.sortie.trim().split(/\r?\n/).slice(-2).join(' | '), 160)}`)
    else e.push(...c.echecs)
    return { echecs: [...new Set(e)], detail: `diff de ${LIVRAISON} (base ${base.commit.slice(0, 7)}) : appels ajoutés à retraitsDus, retirer et purgerFichiersExpires, chacun dans un try, sous un garde sur enPause ; ${c?.detail ?? ''}` }
  })
  await s.critere('RT-8', () => { const r = typecheck(RAC, JUGE); return { echecs: r.ok ? [] : [r.detail], detail: r.detail } })
}

// ── RT-9 (--reel) ────────────────────────────────────────────────────────────────────────────────────────────────────────
let codeMenage = 0
if (o.reel && suite) {
  for (const f of ['026-021', '026-028', FICHE]) if (!fichePass(f)) { s.echoue('RT-9', `préalable absent : la fiche ${f} n'est pas PASS`); s.finir(); process.exit(2) }
  chargerEnvLocal()
  const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, SECRET = process.env.CRON_SECRET
  const APP = (process.env.PRESTI_BASE_URL || 'https://prestiapp.fr').replace(/\/$/, '')
  if (!SB || !SVC || !SECRET) { s.echoue('RT-9', 'préalable absent : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou CRON_SECRET manque (.env.local)'); s.finir(); process.exit(2) }
  const marque = marqueEssai()
  const h = { apikey: SVC, Authorization: `Bearer ${SVC}` }
  const rest = (chemin, init = {}) => fetch(`${SB}/rest/v1/${chemin}`, { ...init, headers: { ...h, 'Content-Type': 'application/json', ...(init.headers ?? {}) }, signal: AbortSignal.timeout(20_000) })
  const e = []
  let id = null
  try {
    const recule = new Date(plusMois(Date.now(), -12).getTime() - JOUR).toISOString()
    const ins = await rest('sites_commandes?select=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ email: `${marque}@presti-test.invalid`, etat: 'en_ligne', metier: 'Essai', entreprise: marque, domaine_mode: 'aucun', paye_le: recule, en_ligne_le: recule, compte_supprime_le: recule }) })
    if (ins.status !== 201) throw new Error(`insertion de la commande d'essai : ${ins.status} ${court(await ins.text(), 120)}`)
    id = (await ins.json())[0].id
    const u = await fetch(`${SB}/storage/v1/object/sites/${id}/index.html`, { method: 'POST', headers: { ...h, 'Content-Type': 'text/html; charset=utf-8', 'x-upsert': 'true' }, body: `<!doctype html><title>${marque}</title>`, signal: AbortSignal.timeout(20_000) })
    if (!u.ok) throw new Error(`dépôt du site d'essai : ${u.status}`)
    const cron = await fetch(`${APP}/api/cron/livraison`, { headers: { Authorization: `Bearer ${SECRET}` }, signal: AbortSignal.timeout(90_000) })
    if (cron.status !== 200) e.push(`/api/cron/livraison : ${cron.status}`)
    const [c] = await (await rest(`sites_commandes?select=etat,dossier_envoye_le&id=eq.${id}`)).json()
    if (c?.etat !== 'retiree') e.push(`la commande est ${c?.etat}, retiree attendue`)
    if (!c?.dossier_envoye_le) e.push('dossier_envoye_le non posée')
    const site = await fetch(`${APP}/site-genere/${id}/`, { signal: AbortSignal.timeout(30_000) })
    if (site.status !== 404) e.push(`GET /site-genere/<id>/ → ${site.status}, 404 attendu`)
    const x = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'reel-jeton', args: [`--commande=${id}`], env: { REEL_SUPABASE_URL: SB, SUPABASE_SERVICE_ROLE_KEY: SVC }, timeout: 60_000 })
    if (!x.res?.jeton) e.push('creerJetonDossier n’a pas rendu de jeton')
    else {
      const z = await fetch(`${APP}/api/site-dossier/${id}?j=${encodeURIComponent(x.res.jeton)}`, { signal: AbortSignal.timeout(60_000) })
      if (z.status !== 200) e.push(`lien du dossier → ${z.status}, 200 attendu`)
      else { const lu = lireZip(Buffer.from(await z.arrayBuffer())); if (!lu.entrees.some((y) => y.nom === 'index.html')) e.push('archive sans index.html') }
    }
  } catch (err) { e.push(`--reel interrompu : ${premiereLigne(err)}`) } finally {
    try {
      if (id) {
        await fetch(`${SB}/storage/v1/object/sites`, { method: 'DELETE', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [`${id}/index.html`] }), signal: AbortSignal.timeout(20_000) })
        await rest(`sites_commandes?id=eq.${id}`, { method: 'DELETE' })
        const reste = await (await rest(`sites_commandes?select=id&id=eq.${id}`)).json().catch(() => null)
        if (!Array.isArray(reste) || reste.length) { e.push('ménage incomplet : la commande d’essai reste'); codeMenage = 1 }
      }
    } catch (err) { e.push(`ménage interrompu : ${premiereLigne(err)}`); codeMenage = 1 }
  }
  s.juger('RT-9', e, `${APP} : commande d'essai (${marque}) supprimée il y a 12 mois et 1 jour → après /api/cron/livraison : retiree, dossier_envoye_le posée, /site-genere/<id>/ en 404, un nouveau jeton ouvre une archive avec index.html ; ménage fait`)
}

jugerPreuvesVides(s, 'RT', RAC, FICHE)
process.exit(codeMenage || s.finir())
}
