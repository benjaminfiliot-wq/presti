// scripts/redacteur-v2-qa.mjs — juge du rédacteur v2 (fiche 026-029, lot C ; critères RV de 026-093), écrit par Claude Code
// AVANT le code qu'il juge (réécrit en entier le 27/09 : la version du 26/09 ne testait que l'existence d'un fichier).
// L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node --import ./scripts/ts-loader.mjs scripts/redacteur-v2-qa.mjs [--racine=<dossier>] [--temoin] [--reel] [--seulement=RV-3]
//
//   --racine=<d>  importe <d>/lib/siteRedacteur.ts et lance <d>/scripts/commande-rediger.mjs avec cwd = <d> (défaut : le dépôt).
//   --temoin      seulement la part de non-régression de RV-3 (NR : findFabrications de lib/ai.ts et
//                 detecterCapacitesNonDeclarees de lib/ai/antiFabrication.ts, ceux de la racine, attrapent « 15 ans » et
//                 « RGE » dans la réponse de la doublure fautive et laissent passer les quatre réponses de la doublure propre)
//                 et RV-PV.
//   --reel        non écrit ici : code 2 (aucun critère --reel dans le cahier de 026-093).
//   --seulement   auto-contrôle de 026-029 (preuve « sait échouer ») : ne juge que ces critères ; jamais le verdict d'une fiche.
//
// Le rédacteur est importé dans un PROCESSUS ENFANT (ce même script, --enfant=fonction, cwd = la racine) dont l'environnement ne
// porte AUCUNE clé (chemins et dossiers temporaires seulement) et où fetch et les sockets sont piégés (NODE_OPTIONS) : tout appel
// hors 127.0.0.1 est refusé et consigné. Le script commande-rediger.mjs est lancé de la même façon.
//
// Contrat que ce juge fixe pour 026-093 (jeux d'essai dans scripts/fixtures/026-livraison-tresor/c/) :
//   redigerContenuV2({ commande, artisan, modele, modelesSecondaires }, appel?) → { contenu, rapport } (ou une promesse) ;
//   commande = export-menuisier/commande.json ; artisan = la ligne artisans de commande-payee.json ; modele =
//   modele-menuisier.json (cinq prestations en h3 de la section « prestations » ; le jeu d'essai en déclare deux) ;
//   appel({ systeme, utilisateur }) → une promesse de texte (le JSON rendu par le modèle) ; doublures appel-fautif.mjs,
//   appel-propre.mjs et appel-panne.mjs ; rapport = { rejets, degradations, ia, bloquant? } où rejets et degradations sont des
//   listes (ou des nombres) ; ia vaut 'indisponible' quand appel lève.
//   Le « texte visible » d'un contenu : toutes les chaînes de pages.*, hors jsonld, type, cible et chemins.
//   Les faits du jeu d'essai (référence de findFabrications) : nom, métier, communes, prestations déclarées, adresse, horaires,
//   « assurance décennale », assureur et numéro, SIREN, « Vercel Inc. », « Presti », « prestiapp.fr ». Le profil de
//   detecterCapacitesNonDeclarees : { metier, services: prestations déclarées, horaires, zone: communes, assurance_nom }.
//
// Critères (cahier du juge de 026-093) :
//   RV-1  lib/siteRedacteur.ts exporte redigerContenuV2 (importé dans l'enfant) ; scripts/commande-rediger.mjs existe et sort en
//         code 2 sans argument. Le modèle du métier (maquettes/modeles/menuisier/contenu.json, 025-02) absent : code 2.
//   RV-2  commande-rediger.mjs <copie de export-menuisier/> --sans-ia : code 0, puis contenu.json : exactement une page de
//         commune par commune déclarée (type « commune », sa cible), aucune marque {…} restante, un h1 d'accueil qui contient
//         le métier et la première commune, /mentions-legales/ avec le SIREN, l'adresse et l'assureur, sans « fictif » ni
//         « démonstration ».
//   RV-3  zéro invention, sur le contenu du script (RV-2) ET sur celui de la fonction (modèle à cinq prestations) :
//         findFabrications(texte, faits) = [] et detecterCapacitesNonDeclarees(texte, profil) = [] ; ni « avis », ni
//         « témoignage », ni « ★ », ni « étoile » ; aucune citation entre guillemets.
//   RV-4  la voix : ni la phrase signée, ni le parcours, ni les chiffres (légende, « valeur unité ») du jeu d'essai dans
//         contenu.json (script et fonction).
//   RV-5  les prestations : « Escaliers » et « Bibliothèques » (déclarées) sont gardées ; « Dressings et placards », « Cuisines »
//         et « Parquets », titres et descriptions, n'apparaissent nulle part. Sans prestation : rapport.bloquant (fonction) et
//         code 3 (script).
//   RV-6  doublure fautive : exactement 2 appels par commune (2 × N en tout), N seconds appels qui nomment « 15 ans » et « RGE »,
//         aucun des deux dans la version finale, rapport qui compte au moins N rejets et exactement N dégradations ; doublure
//         propre : N appels, chapeaux de commune deux à deux différents et rendus par la doublure ; doublure en panne : pas
//         d'exception, rapport.ia = 'indisponible', N pages de commune avec un chapeau.
//   RV-7  ce que reçoit appel : les faits entre <donnees> et </donnees> (le nom de l'entreprise y est), et ni l'e-mail, ni le
//         téléphone (espacé ou non), ni le SIREN du jeu d'essai, dans aucune requête.
//   RV-8  lib/siteRedacteur.ts n'importe ni @anthropic-ai/sdk, ni de @/lib/ai autre chose que findFabrications, ni node:fs ;
//         aucun « process.env » dans son source ; exécuté, il n'écrit aucun fichier et ne lit aucune variable d'environnement
//         (fs et process.env espionnés dans l'enfant).
//   RV-9  si 025-03 est PASS : generer.mjs --source=<export + contenu.json du script> sort en code 0, puis site-qa.mjs <sortie>
//         --statique, lancé par le juge, est vert ; sinon code 2, « 025-03 attendue ».
//   RV-10 npm run typecheck (tsc --noEmit) vert sur la racine.
//   RV-PV un fichier de 0 octet dans .orchestre/preuves/026-093/ est un échec (règle commune, tous les modes).
// Le rapport de rédaction du jeu d'essai (RV-2) est recopié dans .orchestre/travail/redacteur-v2-qa/redaction.json : la fiche
// 026-093 le recopie dans ses preuves (le juge n'écrit que sous .orchestre/travail/).
//
// Sortie : une ligne par critère, puis « redacteur-v2-qa : PASS|FAIL ». Code 0 seulement si tout est vert ; 1 sinon ; 2 si
// l'appel est invalide ou un préalable absent. Écriture seulement sous .orchestre/travail/redacteur-v2-qa/.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  R, lireOptions, refuserAppel, creerSortie, court, premiereLigne, lireRacine, sansCommentaires, importsDe, jugerPreuvesVides,
  dossierTravail, fichePass, typecheck,
} from './fixtures/026-livraison-tresor/commun.mjs'
import { C, LOADER_URL, jeuC, lancerAsync, envEnfant, piegeReseau, siteQaStatique, lireArbre, auPlus, sansAccents, contientSansAccents } from './fixtures/026-livraison-tresor/c/commun-c.mjs'

const JUGE = 'redacteur-v2-qa'
const FICHE = '026-093'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const LIB = 'lib/siteRedacteur.ts', SCRIPT = 'scripts/commande-rediger.mjs'
const o = lireOptions(process.argv.slice(2), { connues: ['seulement'] })
const RAC = o.racine
const MARQUE = `@@${JUGE}@@ `
const EXPORT = path.join(C, 'export-menuisier')
const J = jeuC('commande-payee.json')
const CMD = J.commande, ART = J.artisan
const EXP = JSON.parse(fs.readFileSync(path.join(EXPORT, 'commande.json'), 'utf8'))
const DECLAREES = CMD.matiere.prestations
const FAITS = [EXP.nom, EXP.metier, 'Menuisier', EXP.communes.join(' '), DECLAREES.join(' '), 'Bibliothèques', CMD.matiere.adresse, CMD.matiere.horaires, 'assurance décennale', CMD.matiere.decennale.assureur, CMD.matiere.decennale.numero, CMD.matiere.siren, 'Vercel Inc.', 'Presti', 'prestiapp.fr'].join(' ')
const PROFIL = { metier: EXP.metier, services: DECLAREES, horaires: CMD.matiere.horaires, zone: EXP.communes.join(', '), assurance_nom: CMD.matiere.decennale.assureur }
const NON_DECLAREES = [['Dressings et placards', 'Penderies sous combles et placards sous escalier'], ['Cuisines', 'Façades et plans de travail en bois massif'], ['Parquets', 'Chêne à l’anglaise ou à bâtons rompus']]

/** Le texte visible d'un contenu v2 : toutes les chaînes de pages.*, hors jsonld, type, cible. */
function texteVisible(contenu) {
  const out = []
  const rec = (x, cle) => { if (typeof x === 'string') { if (!['type', 'cible', 'chemin'].includes(cle)) out.push(x) } else if (Array.isArray(x)) x.forEach((v) => rec(v, cle)); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) if (k !== 'jsonld') rec(v, k) }
  rec(contenu?.pages ?? {}, '')
  return out.join('\n')
}
const communesDe = (contenu) => Object.entries(contenu?.pages ?? {}).filter(([, p]) => p?.type === 'commune')

// ═══ Le processus enfant ════════════════════════════════════════════════════════════════════════════════════════════════
if (o.enfant === 'fonction' || o.enfant === 'controles') {
  const res = { erreur: null }
  const ecrire = () => process.stdout.write(`${MARQUE}${JSON.stringify(res)}\n`, () => process.exit(0))
  try {
    const ai = await import(pathToFileURL(path.join(RAC, 'lib', 'ai.ts')).href)
    const anti = await import(pathToFileURL(path.join(RAC, 'lib', 'ai', 'antiFabrication.ts')).href)
    const controler = (t) => ({ fab: ai.findFabrications(t, FAITS), cap: anti.detecterCapacitesNonDeclarees(t, PROFIL).map((x) => x.extrait) })
    if (o.enfant === 'controles') {
      const fautif = (await import(pathToFileURL(path.join(C, 'appel-fautif.mjs')).href)).creerAppel()
      const propre = (await import(pathToFileURL(path.join(C, 'appel-propre.mjs')).href))
      const brut = JSON.parse(await fautif.appel({ systeme: '', utilisateur: '' }))
      res.fautif = controler(`${brut.chapeau}\n${brut.introduction}`)
      res.propres = propre.VARIANTES.map((v) => controler(`${v.chapeau}\n${v.introduction}`))
      for (const f of JSON.parse(o.valeurs.fichiers ?? '[]')) (res.fichiers ??= {})[f] = controler(texteVisible(JSON.parse(fs.readFileSync(f, 'utf8'))))
      ecrire()
    } else {
      // Espions : aucune écriture de fichier, aucune lecture de process.env pendant les appels à redigerContenuV2.
      const { syncBuiltinESMExports } = await import('node:module')
      let surveille = false
      const ecritures = [], lectures = []
      for (const k of ['writeFileSync', 'writeFile', 'appendFileSync', 'appendFile', 'mkdirSync', 'mkdir', 'rmSync', 'rm', 'renameSync', 'rename', 'copyFileSync', 'copyFile', 'cpSync', 'unlinkSync', 'unlink', 'createWriteStream', 'openSync', 'writeSync']) {
        const f0 = fs[k]; if (typeof f0 !== 'function') continue
        fs[k] = function (...a) { if (surveille && !(k === 'openSync' && !/[wa+]/.test(String(a[1] ?? 'r')))) ecritures.push(`fs.${k}(${court(a[0], 60)})`); return f0.apply(this, a) }
      }
      for (const k of ['writeFile', 'appendFile', 'mkdir', 'rm', 'rename', 'copyFile', 'cp', 'unlink']) {
        const f0 = fs.promises[k]; if (typeof f0 !== 'function') continue
        fs.promises[k] = function (...a) { if (surveille) ecritures.push(`fs.promises.${k}(${court(a[0], 60)})`); return f0.apply(this, a) }
      }
      syncBuiltinESMExports()
      const envReel = process.env
      const espion = new Proxy(envReel, { get(t, k) { if (surveille && typeof k === 'string') lectures.push(k); return Reflect.get(t, k) }, has(t, k) { if (surveille && typeof k === 'string') lectures.push(k); return Reflect.has(t, k) }, ownKeys(t) { if (surveille) lectures.push('(liste)'); return Reflect.ownKeys(t) } })
      const m = await import(pathToFileURL(path.join(RAC, LIB)).href)
      res.exporte = typeof m.redigerContenuV2 === 'function'
      if (!res.exporte) { res.erreur = `${LIB} n'exporte pas redigerContenuV2 (exports : ${Object.keys(m).join(', ') || 'aucun'})`; ecrire() }
      else {
        const modele = jeuC('modele-menuisier.json')
        const entree = (commande = EXP) => ({ commande: structuredClone(commande), artisan: structuredClone(ART), modele: structuredClone(modele), modelesSecondaires: {} })
        const lancer = async (nom, appel, commande) => {
          surveille = true; process.env = espion
          try { const r = await m.redigerContenuV2(entree(commande), appel); return { contenu: r?.contenu ?? null, rapport: r?.rapport ?? null } } catch (e) { return { exception: premiereLigne(e) } } finally { surveille = false; process.env = envReel }
        }
        const doublure = async (f) => (await import(pathToFileURL(path.join(C, f)).href)).creerAppel()
        res.sans = await lancer('sans appel', undefined)
        const fautif = await doublure('appel-fautif.mjs'); res.fautif = { ...(await lancer('fautif', fautif.appel)), appels: fautif.appels.map((a) => ({ ...a.requete, brut: JSON.stringify(a.brut ?? null) })) }
        const propre = await doublure('appel-propre.mjs'); res.propre = { ...(await lancer('propre', propre.appel)), appels: propre.appels.map((a) => ({ ...a.requete, brut: JSON.stringify(a.brut ?? null), chapeau: a.variante.chapeau })) }
        const panne = await doublure('appel-panne.mjs'); res.panne = { ...(await lancer('panne', panne.appel)), appels: panne.appels.length }
        const sansPresta = structuredClone(EXP); sansPresta.matiere.prestations = []
        res.sansPrestation = await lancer('sans prestation', undefined, sansPresta)
        res.controles = {}
        for (const k of ['sans', 'fautif', 'propre']) if (res[k]?.contenu) res.controles[k] = controler(texteVisible(res[k].contenu))
        res.ecritures = ecritures; res.lectures = [...new Set(lectures)]
        ecrire()
      }
    }
  } catch (e) { res.erreur = `interrompu : ${premiereLigne(e)}`; ecrire() }
} else {
  // ═══ Le processus parent ════════════════════════════════════════════════════════════════════════════════════════════════
  if (o.inconnues.length || o.positionnels.length) refuserAppel(JUGE, `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
  if (o.temoin && o.reel) refuserAppel(JUGE, '--temoin et --reel ne vont pas ensemble')
  const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
  const COMPLET = ['RV-1', 'RV-2', 'RV-3', 'RV-4', 'RV-5', 'RV-6', 'RV-7', 'RV-8', 'RV-9', 'RV-10']
  const SEUL = o.valeurs.seulement ? new Set(o.valeurs.seulement.split(',')) : null
  const mode = o.temoin ? 'témoin' : o.reel ? 'réel' : SEUL ? `partiel (${[...SEUL].join(',')})` : 'complet'
  const IDS = o.temoin ? ['RV-3', 'RV-PV'] : [...(SEUL ? COMPLET.filter((x) => SEUL.has(x)) : COMPLET), 'RV-PV']
  const s = creerSortie(JUGE, IDS, `${JUGE} — fiche ${FICHE}, racine ${rel(RAC)}, mode ${mode}`, { nr: o.temoin ? ['RV-3'] : [] })
  const veut = (id) => IDS.includes(id)
  const finir = (code) => { jugerPreuvesVides(s, 'RV', RAC, FICHE); process.exit(Math.max(code ?? 0, s.finir())) }
  const TRAV = dossierTravail(JUGE)
  const piege = piegeReseau(TRAV, 'redacteur')
  const ENV = envEnfant(piege.env)
  const enfant = async (quoi, extra = []) => {
    const r = await lancerAsync(process.execPath, ['--import', LOADER_URL, CE_SCRIPT, `--enfant=${quoi}`, `--racine=${RAC}`, ...extra], { cwd: RAC, env: ENV, timeout: 300_000 })
    const l = r.stdout.split(/\r?\n/).find((x) => x.startsWith(MARQUE))
    let res = null
    try { res = l ? JSON.parse(l.slice(MARQUE.length)) : null } catch { /* illisible */ }
    return res ?? { erreur: `enfant ${quoi} sans résultat (code ${r.code}) : ${court(r.sortie.trim().split(/\r?\n/).slice(-3).join(' | '), 240)}` }
  }
  const rediger = (dossier, ...args) => lancerAsync(process.execPath, ['--import', LOADER_URL, SCRIPT, ...(dossier ? [dossier] : []), ...args], { cwd: RAC, env: ENV, timeout: 300_000 })

  // ── --temoin : la part NR de RV-3 ─────────────────────────────────────────────────────────────────────────────────────
  if (o.temoin) {
    await s.critere('RV-3', async () => {
      const r = await enfant('controles')
      if (r.erreur) return { echecs: [r.erreur] }
      const e = []
      const vus = [...r.fautif.fab, ...r.fautif.cap].join(' ')
      for (const x of ['15 ans', 'RGE']) if (!vus.includes(x)) e.push(`les contrôles de la racine ne voient plus « ${x} » dans la réponse fautive (vu : ${vus || 'rien'})`)
      r.propres.forEach((p, i) => { if (p.fab.length || p.cap.length) e.push(`variante propre ${i + 1} refusée à tort : ${[...p.fab, ...p.cap].join(', ')}`) })
      return { echecs: e, detail: `findFabrications et detecterCapacitesNonDeclarees de ${rel(RAC)}/lib attrapent ${vus} dans la réponse fautive et laissent passer les ${r.propres.length} réponses propres` }
    })
    finir(0)
  }
  if (o.reel) { s.nonJuges(IDS.filter((x) => x !== 'RV-PV'), '--reel : aucun critère réel dans le cahier de 026-093'); finir(2) }

  // ── RV-1 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  if (lireRacine(RAC, LIB) === null) {
    s.echoue('RV-1', `${LIB} absent de ${rel(RAC)} : le rédacteur de 026-093 n'existe pas encore`)
    s.nonJuges(IDS.filter((x) => x !== 'RV-PV'), `RV-1 en échec (${LIB} absent)`)
    finir(1)
  }
  if (lireRacine(RAC, 'maquettes/modeles/menuisier/contenu.json') === null) {
    s.echoue('RV-1', 'non jugé : 025-02 attendue (maquettes/modeles/menuisier/contenu.json absent)')
    s.nonJuges(IDS.filter((x) => x !== 'RV-PV'), '025-02 attendue')
    finir(2)
  }
  const F = await enfant('fonction')
  const sansUsage = lireRacine(RAC, SCRIPT) === null ? null : await rediger(null)
  if (veut('RV-1')) s.juger('RV-1', [
    ...(F.erreur ? [F.erreur] : []),
    ...(sansUsage === null ? [`${SCRIPT} absent`] : sansUsage.code !== 2 ? [`${SCRIPT} sans argument : code ${sansUsage.code}, 2 attendu`] : []),
  ], `${LIB} exporte redigerContenuV2 (importé dans l'enfant sans clé) ; ${SCRIPT} sans argument → code 2`)
  const sansF = F.erreur ? `non jugé : ${F.erreur}` : null

  // ── RV-2 : le script sur l'export du jeu d'essai ──────────────────────────────────────────────────────────────────────
  const DOSSIER = path.join(TRAV, 'source')
  fs.cpSync(EXPORT, DOSSIER, { recursive: true })
  const r2 = sansUsage === null ? null : await rediger(DOSSIER, '--sans-ia')
  let SCR = null
  try { SCR = JSON.parse(fs.readFileSync(path.join(DOSSIER, 'contenu.json'), 'utf8')) } catch { /* jugé plus bas */ }
  try { fs.copyFileSync(path.join(DOSSIER, 'redaction.json'), path.join(TRAV, 'redaction.json')) } catch { /* absent */ }
  const sansScript = r2 === null ? `non jugé : ${SCRIPT} absent` : !SCR ? `non jugé : ${SCRIPT} --sans-ia n'a pas écrit de contenu.json lisible (code ${r2.code})` : null
  if (veut('RV-2')) await s.critere('RV-2', () => {
    if (r2 === null) return { echecs: [`${SCRIPT} absent`] }
    const e = []
    if (r2.code !== 0) e.push(`--sans-ia : code ${r2.code} — ${court(r2.sortie.trim().split(/\r?\n/).slice(-2).join(' | '), 200)}`)
    if (!SCR) return { echecs: [...e, 'contenu.json absent ou illisible'] }
    const communes = communesDe(SCR)
    for (const c of EXP.communes) { const n = communes.filter(([, p]) => p.cible === c).length; if (n !== 1) e.push(`commune ${c} : ${n} page(s), 1 attendue`) }
    const satellites = communes.filter(([, p]) => !EXP.communes.includes(p.cible))
    if (satellites.length) e.push(`page(s) de commune non déclarée(s) : ${satellites.map(([k]) => k).join(', ')}`)
    const marques = []
    const rec = (x) => { if (typeof x === 'string') { const m = x.match(/\{[^{}\s"]{1,40}\}/); if (m) marques.push(m[0]) } else if (x && typeof x === 'object') Object.values(x).forEach(rec) }
    rec(SCR)
    if (marques.length) e.push(`marque(s) restante(s) : ${[...new Set(marques)].join(', ')}`)
    const acc = SCR.pages?.['/']
    const h1 = `${acc?.h1 ?? ''} ${acc?.h1Ligne ?? ''}`
    if (!contientSansAccents(h1, EXP.metier) || !contientSansAccents(h1, EXP.communes[0])) e.push(`h1 d'accueil « ${court(h1, 60)} » : le métier (${EXP.metier}) et la première commune (${EXP.communes[0]}) attendus`)
    const ml = SCR.pages?.['/mentions-legales/']
    if (!ml) e.push('/mentions-legales/ absente')
    else {
      const t = JSON.stringify(ml)
      for (const [quoi, v] of [['le SIREN', EXP.matiere.siren], ['l\'adresse', EXP.matiere.adresse], ['l\'assureur', EXP.matiere.decennale.assureur]]) if (!t.includes(v)) e.push(`/mentions-legales/ : ${quoi} (« ${v} ») manque`)
      for (const x of ['fictif', 'fictive', 'demonstration']) if (new RegExp(`\\b${x}\\b`).test(sansAccents(t))) e.push(`/mentions-legales/ dit « ${x} »`)
    }
    return { echecs: e, detail: `${SCRIPT} --sans-ia → code 0 ; ${communes.length} pages de commune (${EXP.communes.join(', ')}), aucune marque, h1 « ${court(acc?.h1, 40)} », mentions légales avec SIREN, adresse et assureur, sans « fictif » ni « démonstration »` }
  })

  // ── RV-3 : zéro invention (script et fonction) ────────────────────────────────────────────────────────────────────────
  const CTRL = SCR ? await enfant('controles', [`--fichiers=${JSON.stringify([path.join(DOSSIER, 'contenu.json')])}`]) : null
  if (veut('RV-3')) await s.critere('RV-3', () => {
    const e = []
    const juger = (quoi, contenu, ctrl) => {
      if (!contenu) { e.push(`${quoi} : aucun contenu`); return }
      if (!ctrl) { e.push(`${quoi} : contrôles non lancés`); return }
      if (ctrl.fab.length) e.push(`${quoi} : findFabrications → ${ctrl.fab.join(', ')}`)
      if (ctrl.cap.length) e.push(`${quoi} : detecterCapacitesNonDeclarees → ${ctrl.cap.join(', ')}`)
      const t = texteVisible(contenu)
      for (const [re, x] of [[/\bavis\b/i, 'avis'], [/t[ée]moignage/i, 'témoignage'], [/★/, '★'], [/[ée]toiles?\b/i, 'étoile']]) if (re.test(t)) e.push(`${quoi} : « ${x} » dans le texte`)
      const cit = t.match(/[«“][^»”]{8,}[»”]|"[^"\n]{8,}"/)
      if (cit) e.push(`${quoi} : citation entre guillemets « ${court(cit[0], 60)} »`)
    }
    if (sansScript) e.push(sansScript); else juger('script (--sans-ia, modèle de la racine)', SCR, CTRL?.fichiers?.[path.join(DOSSIER, 'contenu.json')])
    if (sansF) e.push(sansF); else { juger('fonction sans appel (modèle à cinq prestations)', F.sans?.contenu, F.controles?.sans); juger('fonction, doublure propre', F.propre?.contenu, F.controles?.propre) }
    if (CTRL?.erreur) e.push(CTRL.erreur)
    return { echecs: e, detail: 'findFabrications et detecterCapacitesNonDeclarees de la racine rendent [] sur tout le texte visible (script, fonction sans appel, fonction avec la doublure propre) ; ni avis, ni témoignage, ni étoile, ni citation' }
  })

  // ── RV-4 : la voix de l'artisan n'entre pas dans contenu.json ─────────────────────────────────────────────────────────
  if (veut('RV-4')) await s.critere('RV-4', () => {
    const e = []
    const a = CMD.matiere.artisan
    const norm = (t) => sansAccents(t).replace(/[’']/g, "'").replace(/\s+/g, ' ')
    const voix = [['la phrase signée', a.citation], ['le parcours', a.parcours], ...a.chiffres.flatMap((c) => [['un chiffre', c.legende], ['un chiffre', `${c.valeur} ${c.unite}`]])]
    const juger = (quoi, contenu) => { const t = norm(JSON.stringify(contenu ?? {})); for (const [x, v] of voix) if (t.includes(norm(v))) e.push(`${quoi} : ${x} (« ${court(v, 50)} »)`) }
    if (sansScript) e.push(sansScript); else juger('script', SCR)
    if (sansF) e.push(sansF); else for (const k of ['sans', 'fautif', 'propre', 'panne']) juger(`fonction (${k})`, F[k]?.contenu)
    return { echecs: e, detail: `ni la phrase signée, ni le parcours, ni les ${a.chiffres.length} chiffres dans contenu.json (script et quatre appels de la fonction)` }
  })

  // ── RV-5 : les prestations déclarées seulement ────────────────────────────────────────────────────────────────────────
  if (veut('RV-5')) await s.critere('RV-5', async () => {
    const e = []
    const juger = (quoi, contenu) => {
      const t = sansAccents(texteVisible(contenu))
      for (const [titre, desc] of NON_DECLAREES) {
        if (new RegExp(`\\b${sansAccents(titre)}\\b`).test(t)) e.push(`${quoi} : « ${titre} » (non déclarée) apparaît`)
        if (t.includes(sansAccents(desc))) e.push(`${quoi} : la description de « ${titre} » (non déclarée) apparaît`)
      }
      const h3 = (contenu?.pages?.['/']?.sections ?? []).find((x) => x?.genre === 'prestations')?.blocs?.filter((b) => b?.type === 'h3').map((b) => sansAccents(b.texte)) ?? []
      for (const d of ['Escaliers', 'Bibliothèques']) if (!h3.includes(sansAccents(d))) e.push(`${quoi} : la prestation déclarée « ${d} » n'est plus dans les prestations de l'accueil (h3 : ${h3.join(', ') || 'aucun'})`)
    }
    if (sansF) e.push(sansF)
    else {
      for (const k of ['sans', 'propre']) if (F[k]?.contenu) juger(`fonction (${k})`, F[k].contenu); else e.push(`fonction (${k}) : aucun contenu${F[k]?.exception ? ` (exception : ${F[k].exception})` : ''}`)
      if (!F.sansPrestation?.rapport?.bloquant) e.push(`sans prestation : rapport.bloquant absent (${F.sansPrestation?.exception ? `exception : ${F.sansPrestation.exception}` : JSON.stringify(F.sansPrestation?.rapport ?? null).slice(0, 80)})`)
    }
    if (sansScript) e.push(sansScript)
    else {
      const d = path.join(TRAV, 'sans-prestation')
      fs.cpSync(EXPORT, d, { recursive: true })
      const c = JSON.parse(fs.readFileSync(path.join(d, 'commande.json'), 'utf8')); c.matiere.prestations = []; fs.writeFileSync(path.join(d, 'commande.json'), JSON.stringify(c, null, 1))
      const r = await rediger(d, '--sans-ia')
      if (r.code !== 3) e.push(`script sans prestation : code ${r.code}, 3 attendu`)
    }
    return { echecs: e, detail: '« Escaliers » et « Bibliothèques » gardées, « Dressings et placards », « Cuisines » et « Parquets » (titres et descriptions) absentes ; sans prestation : rapport.bloquant et code 3' }
  })

  // ── RV-6 : les doublures fautive, propre et en panne ──────────────────────────────────────────────────────────────────
  const N = EXP.communes.length
  const compte = (x) => (Array.isArray(x) ? x.length : Number(x) || 0)
  if (veut('RV-6')) await s.critere('RV-6', () => {
    if (sansF) return { echecs: [sansF] }
    const e = []
    const fa = F.fautif
    if (fa.exception) e.push(`fautive : exception « ${fa.exception} »`)
    if (fa.appels.length !== 2 * N) e.push(`fautive : ${fa.appels.length} appel(s), ${2 * N} attendus (2 par commune)`)
    const nomment = fa.appels.filter((a) => /15 ans/i.test(`${a.systeme}\n${a.utilisateur}`) && /RGE/.test(`${a.systeme}\n${a.utilisateur}`)).length
    if (nomment !== N) e.push(`fautive : ${nomment} requête(s) nomment « 15 ans » et « RGE », ${N} attendues (le second appel de chaque commune)`)
    const final = texteVisible(fa.contenu)
    for (const x of [/15 ans/i, /\bRGE\b/]) if (x.test(final)) e.push(`fautive : ${x.source} reste dans la version finale`)
    if (communesDe(fa.contenu).length !== N) e.push(`fautive : ${communesDe(fa.contenu).length} page(s) de commune, ${N} attendues`)
    if (compte(fa.rapport?.rejets) < N) e.push(`fautive : rapport.rejets = ${JSON.stringify(fa.rapport?.rejets ?? null).slice(0, 60)}, au moins ${N} attendus`)
    if (compte(fa.rapport?.degradations) !== N) e.push(`fautive : rapport.degradations compte ${compte(fa.rapport?.degradations)}, ${N} attendues`)
    const pr = F.propre
    if (pr.exception) e.push(`propre : exception « ${pr.exception} »`)
    if (pr.appels.length !== N) e.push(`propre : ${pr.appels.length} appel(s), ${N} attendus (1 par commune)`)
    const chapeaux = communesDe(pr.contenu).map(([, p]) => p.chapeau)
    if (new Set(chapeaux).size !== chapeaux.length || chapeaux.length !== N) e.push(`propre : chapeaux de commune ${JSON.stringify(chapeaux).slice(0, 120)} (N distincts attendus)`)
    const rendus = pr.appels.map((a) => a.chapeau)
    const etrangers = chapeaux.filter((c) => !rendus.includes(c))
    if (etrangers.length) e.push(`propre : ${etrangers.length} chapeau(x) de commune ne viennent pas de la doublure (« ${court(etrangers[0], 50)} »)`)
    const pa = F.panne
    if (pa.exception) e.push(`en panne : exception « ${pa.exception} » (le rédacteur doit rendre le texte du modèle)`)
    if (pa.rapport?.ia !== 'indisponible') e.push(`en panne : rapport.ia = ${JSON.stringify(pa.rapport?.ia)}, 'indisponible' attendu`)
    const cp = communesDe(pa.contenu)
    if (cp.length !== N || cp.some(([, p]) => !String(p.chapeau ?? '').trim())) e.push(`en panne : ${cp.length} page(s) de commune avec chapeau, ${N} attendues`)
    return { echecs: e, detail: `fautive : ${fa.appels.length} appels, ${nomment} seconds appels nommant les refus, final sans « 15 ans » ni « RGE », ${compte(fa.rapport?.rejets)} rejets et ${compte(fa.rapport?.degradations)} dégradations ; propre : ${pr.appels.length} appels, ${N} chapeaux distincts rendus par la doublure ; en panne : ia « indisponible », ${cp.length} pages complètes` }
  })

  // ── RV-7 : ce que reçoit appel ────────────────────────────────────────────────────────────────────────────────────────
  if (veut('RV-7')) await s.critere('RV-7', () => {
    if (sansF) return { echecs: [sansF] }
    const e = []
    const requetes = [...F.fautif.appels, ...F.propre.appels]
    if (!requetes.length) return { echecs: ['aucune requête reçue par les doublures'] }
    const chiffres = (t) => String(t).replace(/\D/g, '')
    const tel = chiffres(EXP.telephone)
    requetes.forEach((a, i) => {
      const m = /<donnees>([\s\S]*?)<\/donnees>/.exec(a.utilisateur)
      if (!m || !m[1].trim()) e.push(`requête ${i + 1} : pas de faits entre <donnees> et </donnees>`)
      else if (!m[1].includes(EXP.nom)) e.push(`requête ${i + 1} : le nom de l'entreprise n'est pas entre <donnees> et </donnees>`)
      const tout = `${a.systeme}\n${a.utilisateur}\n${a.brut}`
      if (tout.includes(EXP.email)) e.push(`requête ${i + 1} : l'e-mail est envoyé`)
      if (tout.includes(EXP.matiere.siren)) e.push(`requête ${i + 1} : le SIREN est envoyé`)
      if ((tout.match(/\+?\d(?:[\d .-]*\d)?/g) ?? []).map(chiffres).some((x) => x.includes(tel) || x.includes(`33${tel.slice(1)}`))) e.push(`requête ${i + 1} : le téléphone est envoyé`)
    })
    return { echecs: [...new Set(e)], detail: `${requetes.length} requêtes relues : les faits entre <donnees> et </donnees>, ni e-mail, ni téléphone, ni SIREN` }
  })

  // ── RV-8 : pas de clé, pas de fichier, pas d'environnement ────────────────────────────────────────────────────────────
  if (veut('RV-8')) await s.critere('RV-8', () => {
    const e = []
    const src = lireRacine(RAC, LIB) ?? ''
    for (const i of importsDe(src)) {
      if (/^@anthropic-ai\/sdk/.test(i.spec)) e.push(`importe ${i.spec}`)
      if (/^(?:@\/lib\/ai|(?:\.\.?\/)+(?:lib\/)?ai)(?:\.ts)?$/.test(i.spec)) { const autres = i.noms.filter((n) => n !== 'findFabrications'); if (autres.length || i.genre !== 'import') e.push(`importe de ${i.spec} : ${autres.join(', ') || i.genre} (findFabrications seulement)`) }
      if (/^(?:node:)?fs(?:\/promises)?$/.test(i.spec)) e.push(`importe ${i.spec}`)
    }
    if (/\bprocess\s*(?:\.\s*env|\[\s*['"`]env)/.test(sansCommentaires(src))) e.push('lit process.env dans son source')
    if (sansF) e.push(sansF)
    else {
      if (F.ecritures?.length) e.push(`exécuté, il écrit : ${auPlus(F.ecritures, 3)}`)
      if (F.lectures?.length) e.push(`exécuté, il lit process.env : ${auPlus(F.lectures, 4)}`)
    }
    const fuites = piege.lire()
    if (fuites.length) e.push(`appel(s) réseau hors 127.0.0.1 : ${auPlus(fuites, 2)}`)
    return { echecs: e, detail: `ni @anthropic-ai/sdk, ni @/lib/ai hors findFabrications, ni fs dans ${LIB} ; exécuté (5 appels), 0 écriture de fichier, 0 lecture de process.env, 0 appel réseau` }
  })

  // ── RV-9 : génération et site-qa --statique ───────────────────────────────────────────────────────────────────────────
  let prealable = false
  if (veut('RV-9')) await s.critere('RV-9', async () => {
    if (!fichePass('025-03')) { prealable = true; return { echecs: ['non jugé : 025-03 attendue (generer.mjs --source)'] } }
    if (sansScript) return { echecs: [sansScript] }
    const site = path.join(TRAV, 'site')
    const g = await lancerAsync(process.execPath, ['public/sites-demo/generer.mjs', `--source=${DOSSIER}`, `--sortie=${site}`], { cwd: RAC, env: ENV, timeout: 300_000 })
    if (g.code !== 0) return { echecs: [`generer.mjs --source : code ${g.code} — ${court(g.sortie.trim().split(/\r?\n/).slice(-2).join(' | '), 220)}`] }
    const q = await siteQaStatique(RAC, site, ENV)
    return { echecs: q.ok ? [] : [`site-qa --statique : code ${q.code}, ${auPlus(q.echecs, 3)}`], detail: `generer.mjs --source → code 0 (${lireArbre(site).length} fichiers) ; site-qa.mjs --statique, relancé par le juge : vert` }
  })

  // ── RV-10 : typecheck ─────────────────────────────────────────────────────────────────────────────────────────────────
  if (veut('RV-10')) await s.critere('RV-10', () => { const r = typecheck(RAC, JUGE); return { echecs: r.ok ? [] : [r.detail], detail: r.detail } })
  finir(prealable ? 2 : 0)
}
