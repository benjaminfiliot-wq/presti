// scripts/fixtures/026-pilotage/c/parties/station.mjs — les critères ST de pilotage-ecran-qa --partie=station (fiche jugée
// 026-111, cahier du juge écrit en 026-104 par Claude Code). Chargé par scripts/pilotage-ecran-qa.mjs, qui fournit le
// serveur (banc ou next dev), l'interception et les mesures.
//
// Le contrat d'écran que ces critères lisent (026-111 et ses retouches) : racine `.mc[data-station]` portant
// `data-mise-en-page` ; `[data-zone="barre"]` (lignes `[data-barre-ligne="1|2"]`, `[data-compteur="<clé>"]` avec
// `[data-libelle]` et `[data-valeur]`, les trois d'argent `encaisse_mois`, `depense_mois`, `marge_mois`, puis
// `commandes_mois`, `sites_en_ligne` et les clés servies ; `[data-retour-poste]`, `[data-version]`, `[data-sante]`,
// `[data-ariane]`, `[data-jour]`, `[data-heure]`, `[data-nuit="lune|soleil"]`, `[data-drapeau-missions]`,
// `[data-notifications]`, `[data-cloche]`, `[data-auto][data-actif="oui|non"]`) ; `[data-zone="equipage"]`
// (`[data-commandant]`, `[data-agent="<nom>"]` avec `[data-point]`, `[data-activite]`, `[data-anciennete]`,
// `[data-salle-agent]`, `[data-cadence]`, `[data-cout]`, `[data-modele]`, `[data-alerte]`) ; `[data-replier="gauche"]` ;
// `[data-zone="attention"]` (`[data-carte-attention="<clé>"][data-couleur]`, `[data-autres]`, `[data-vide-attention]`) ;
// `[data-zone="commandement"]` (`[data-mission="<clé>"]`, `[data-niveau]`, `[data-dernier-succes]`,
// `[data-compte-rendu]`) ; `[data-station-journal]` ; `[data-station-carte][data-images]` et `[data-liste-salles]
// [data-salle="<clé>"]` ; `[data-zone="bandeau"]` (`[data-nav="station|missions|journal|succes|reglages|aide"]`,
// `[data-element-bandeau]`, `[data-pastille-bandeau]`) ; `[data-toast-erreurs]` ; `[data-direct-pause]` ; au téléphone
// `[data-barre-tel]`, `[data-barre-tel-ligne="2"]`, `[data-feuille="compteurs"]`, `[data-onglet-tel="…"]`,
// `[data-plus="succes|reglages|aide|poste"]` ; « lecture seule » écrit pour le rôle lecture.
import fs from 'node:fs'
import path from 'node:path'
import { CLES_SALLES } from '../../s/contrat-vues.mjs'

const FICHIERS_111 = ['layout.tsx', 'page.tsx', 'Station.tsx', 'Barre.tsx', 'Equipage.tsx', 'Attention.tsx', 'Commandement.tsx', 'Bandeau.tsx', 'Telephone.tsx', 'Carte.tsx', 'Journal.tsx', 'Panneaux.tsx', 'Vues.tsx', 'Habillage.tsx', 'station.css']
const SANTE = { 'en ligne': 'STATION EN LIGNE', 'dégradée': 'DÉGRADÉE', 'hors ligne': 'HORS LIGNE' }
const INTERDITS = /envoy|copier|relayer/i
const UUID = 'd0000000-0000-4000-8000-000000000003'
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))

export async function juger(x) {
  const { S, faute, vu, DETAILS, MODE, RAC, ST, lire, lireBase, existe, code, fichiersSous, appelsApi, lignesAjoutees, gardeMouvement, hexDans, RE_HEX, PAGE_STATION, PAGE_POSTE, immobilite, demarrer, ouvrir, H, outils: O } = x
  const { J, jeu, euros, heureParis, relTime, espaces, PIEGE, PIEGE_HTML, capturer, defautsCapture, tirerDirect, tirerTresorerie, court } = O

  // ── ST-1 (statique, premier critère) ────────────────────────────────────────────────────────────────────────────────
  {
    const e = []
    const manquants = FICHIERS_111.filter((f) => !existe(`${ST}/${f}`))
    if (manquants.length) e.push(`${manquants.length} fichier(s) de ${ST}/ absent(s) : ${manquants.join(', ')}`)
    const lay = code(`${ST}/layout.tsx`)
    if (lay !== null) {
      if (!/actif\(\s*['"]pilotage['"]\s*\)/.test(lay) || !/notFound\(\s*\)/.test(lay)) e.push('layout.tsx ne teste pas actif(\'pilotage\') avec notFound()')
      if (!/from\s+['"]next\/font\/(google|local)['"]/.test(lay)) e.push('layout.tsx ne charge pas la police pixel par next/font')
      if (/https:\/\//.test(lay)) e.push('layout.tsx porte une adresse https:// (police chargée hors de next/font ?)')
    }
    const PERMIS = [/^\/api\/controle\/station\?vue=/, /^\/api\/controle\/tresorerie$/, /^\/api\/controle\/station\/reglages$/]
    for (const f of FICHIERS_111.filter((x) => /\.tsx?$/.test(x) && !['Journal.tsx', 'Panneaux.tsx'].includes(x))) {
      const s = code(`${ST}/${f}`)
      if (s === null) continue
      for (const a of appelsApi(s)) if (!PERMIS.some((r) => r.test(a)) && !(f === 'page.tsx' && /^\/api\/controle\/journal\?limite=1$/.test(a))) e.push(`${f} lit ${a} : seules vue=, /tresorerie et /station/reglages sont permises`)
    }
    const st = code(`${ST}/Station.tsx`)
    if (st !== null && !appelsApi(st).some((a) => a.startsWith('/api/controle/station?vue='))) e.push('Station.tsx ne lit pas /api/controle/station?vue= par apiDirection(')
    for (const f of fichiersSous(ST).filter((x) => /\.(tsx?|mjs|js)$/.test(x) && !x.endsWith('.temoin'))) {
      if (f === `${ST}/moteur/theme/charger.ts`) continue
      let s = code(f) ?? ''
      if (f === `${ST}/page.tsx`) s = s.replace(/import\s*\{\s*supabase\s*\}\s*from\s*['"]@\/lib\/supabaseClient['"]/g, '').replace(/supabase\.auth\.getSession/g, '')
      for (const [re, quoi] of [[/\bfetch\(/, 'fetch('], [/\.from\(/, '.from('], [/\.rpc\(/, '.rpc('], [/supabase/i, 'supabase']]) if (re.test(s)) e.push(`${f} contient ${quoi}`)
    }
    S.juger('ST-1', e, `les ${FICHIERS_111.length} fichiers de ${ST}/ du périmètre sont là ; layout.tsx : actif('pilotage') → notFound(), police pixel par next/font, aucune adresse https:// ; données par apiDirection( sur vue=, /tresorerie et /station/reglages (page.tsx : le rôle sur /api/controle/journal?limite=1) ; ni fetch(, ni .from(, ni .rpc(, ni supabase hors supabase.auth.getSession dans page.tsx`)
    if (e.length) { S.nonJuges(x.P.ids.filter((i) => i !== 'ST-1'), 'ST-1 en échec : la station n’existe pas, aucun navigateur n’est lancé'); return }
  }

  // ── Critères statiques ──────────────────────────────────────────────────────────────────────────────────────────────
  // ST-11 (sources) : jetons, couleurs en hexadécimal, feuilles de base, gardes du mouvement.
  {
    const css = lire(`${ST}/station.css`)
    if (css !== null) {
      const sansCom = css.replace(/\/\*[\s\S]*?\*\//g, '')
      const decl = [...sansCom.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => /--mc-[\w-]+\s*:/.test(m[2]))
      for (const m of decl) if (!/(^|[\s,])\.mc\b/.test(m[1].trim())) faute('ST-11', `station.css déclare des jetons --mc- hors de .mc (« ${court(m[1].trim(), 40)} »)`)
      if (!decl.some((m) => /^\s*\.mc\s*$/.test(m[1].trim().split(',')[0]) && /--mc-fond\s*:/.test(m[2]))) faute('ST-11', 'station.css ne déclare pas les défauts des jetons (--mc-fond…) sur .mc')
      for (const g of gardeMouvement(css, 'station.css')) faute('ST-11', g)
    }
    const ailleurs = [...fichiersSous('app'), ...fichiersSous('lib')].filter((f) => /\.(css|tsx?|mjs|js)$/.test(f) && f !== `${ST}/station.css` && !f.endsWith('.temoin'))
    for (const f of ailleurs) { const s = lire(f) ?? ''; if (/--mc-[\w-]+\s*:\s*[^;{}]+[;}]/.test(s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/setProperty\([^)]*\)/g, ''))) faute('ST-11', `${f} déclare un jeton --mc- : les défauts vivent dans station.css seulement`) }
    for (const f of ['app/globals.css', 'app/base.css']) if (lire(f) !== lireBase(f)) faute('ST-11', `${f} a bougé depuis la base`)
    const cibles = [...fichiersSous('app'), ...fichiersSous('lib'), ...fichiersSous('components')].filter((f) => /\.(css|tsx?|mjs|js)$/.test(f))
    for (const f of cibles) {
      const dansStation = f.startsWith(`${ST}/`)
      const permis = f === `${ST}/station.css` || f.startsWith(`${ST}/moteur/`)
      if (dansStation && permis) continue
      const ajout = lignesAjoutees(f).join('\n')
      const hex = hexDans(ajout.replace(/\/\/[^\n]*/g, ''))
      if (hex.length) faute('ST-11', `${f} : couleur(s) en hexadécimal ajoutée(s) depuis la base (${hex.slice(0, 3).join(', ')})`)
    }
    vu('ST-11')
  }
  // ST-17 (sources) : le diff de app/controle/page.tsx se limite à l'entrée Station et à la redirection.
  {
    const avant = lireBase('app/controle/page.tsx'), apres = lire('app/controle/page.tsx')
    if (apres === null) faute('ST-17', 'app/controle/page.tsx absent')
    else {
      const ajout = lignesAjoutees('app/controle/page.tsx').filter((l) => l.trim())
      const retirees = (() => { if (avant === null) return []; const a = new Map(); for (const l of apres.split(/\r?\n/)) a.set(l, (a.get(l) ?? 0) + 1); return avant.split(/\r?\n/).filter((l) => { const n = a.get(l) ?? 0; if (n > 0) { a.set(l, n - 1); return false } return l.trim() }) })()
      const horsSujet = ajout.filter((l) => !/station|pilotage|Station|Mission Control|decision|UUID|[0-9a-f]\{8\}|^\s*[)}\]]+[,;]?\s*$|^\s*\/\//.test(l))
      if (horsSujet.length) faute('ST-17', `app/controle/page.tsx : ${horsSujet.length} ligne(s) ajoutée(s) sans rapport avec la Station (${court(horsSujet[0].trim(), 70)})`)
      if (retirees.length > 2) faute('ST-17', `app/controle/page.tsx : ${retirees.length} ligne(s) retirée(s) (${court(retirees[0].trim(), 60)})`)
      if (!/\/controle\/station/.test(apres)) faute('ST-17', 'app/controle/page.tsx ne mène pas à /controle/station')
    }
    vu('ST-17')
  }
  // ST-18 (sources) : <Carte carte=…> tel quel ; Vues.tsx et Habillage.tsx ; aucun Phaser.
  {
    const s = code(`${ST}/Station.tsx`) ?? ''
    const m = /<Carte\b([^>]*)\/?>/.exec(s)
    if (!m) faute('ST-18', 'Station.tsx ne monte pas <Carte')
    else {
      const attr = /\bcarte=\{([^}]*)\}/.exec(m[1])
      if (!attr) faute('ST-18', '<Carte ne reçoit pas carte=')
      else if (!/carte/.test(attr[1]) || /\.(map|filter|reduce|slice|sort)\(|\.\.\.|JSON|\?\s*[^:.]+:/.test(attr[1])) faute('ST-18', `<Carte carte={${court(attr[1], 50)}} : la sous-partie carte de vue=direct, sans transformation, attendue`)
      for (const p of ['equipage', 'tapis', 'bulles', 'reglages']) if (!new RegExp(`\\b${p}=\\{`).test(m[1])) faute('ST-18', `<Carte ne reçoit pas ${p}=`)
    }
    for (const f of ['Vues.tsx', 'Habillage.tsx']) if (!/export\s+default\s+function/.test(code(`${ST}/${f}`) ?? '')) faute('ST-18', `${f} n'exporte pas de composant par défaut`)
    for (const f of fichiersSous(ST).filter((y) => !y.includes('/moteur/') && /\.(tsx?|mjs|js)$/.test(y))) if (/['"]phaser['"]/.test(code(f) ?? '')) faute('ST-18', `${f} importe phaser hors de moteur/`)
    vu('ST-18')
  }
  // ST-19 (source) : aucun nom de modèle écrit dans Equipage.tsx.
  { const s = code(`${ST}/Equipage.tsx`) ?? ''; for (const m of ['gpt-', 'Codex', 'freellmapi']) if (s.includes(m)) faute('ST-19', `Equipage.tsx écrit « ${m} » : le modèle est le texte servi`); vu('ST-19') }

  // ── Les écrans ──────────────────────────────────────────────────────────────────────────────────────────────────────
  const srv = await demarrer({ critere: 'ST-3', pages: { station: PAGE_STATION, poste: PAGE_POSTE } })
  const T = tirerTresorerie(H), D = tirerDirect(H)
  const b = D.reponse.valeur.barre.valeur, eqv = D.reponse.valeur.equipage.valeur, at = D.reponse.valeur.attention.valeur, cmd = D.reponse.valeur.commandement.valeur
  const filRep = (rel = 'vues/fil.json') => (appel) => { const j = jeu(rel); const apres = Number(appel.url.searchParams.get('apres')); if (Number.isFinite(apres) && appel.url.searchParams.has('apres')) j.reponse.valeur.bulles = j.reponse.valeur.bulles.filter((y) => y.id > apres); return { statut: 200, reponse: j.reponse } }
  const base = (plus = {}) => ({ direct: D, fil: filRep(), tresorerie: T, reglages: J('reglages.json'), ...(MODE === 'vivant' ? {} : { journal: J('role-direction.json') }), ...plus })
  const texte = (page, sel) => page.evaluate((s) => window.__JUGE__.texte(s), sel)
  const rect = (page, sel) => page.evaluate((s) => window.__JUGE__.rect(s), sel)
  const pret = async (page) => { await page.waitForSelector('[data-station-carte]', { timeout: 20_000 }).catch(() => {}); await page.waitForFunction(() => { const e = document.querySelector('[data-compteur="encaisse_mois"] [data-valeur]'); return e && !/…/.test(e.textContent) }, null, { timeout: 10_000 }).catch(() => {}) }
  // Le réseau : pilotage-ecran-qa.mjs relève chaque requête refusée de chaque page ouverte (ouvrir, servir) et en fait une
  // faute de ST-13 ; cette partie n'a plus de relevé propre (contre-vérification : 2 parties sur 7 le faisaient).
  const captures = {}
  // Les scénarios sont mis en file, puis joués x.PARALLELE à la fois (x.enParallele) : chacun a sa page et son contexte.
  // Un scénario exerce ses critères (vu) même sans faute ; son interruption est une faute de chacun ; sa durée va sur stderr.
  const file = []
  const scenario = (ids, nom, f) => { file.push({ ids, nom, f }) }

  // Scénario 1 : le bureau (1440×900), tout servi.
  await scenario(['ST-3', 'ST-4', 'ST-5', 'ST-7', 'ST-8', 'ST-12', 'ST-13', 'ST-16', 'ST-18', 'ST-19'], 'bureau', async () => {
    const { page, s, erreurs, fermer } = await ouvrir('/controle/station', base())
    await pret(page)
    // ST-3 : la géométrie (colonnes, défaut).
    const g = await page.evaluate(() => { const r = (s) => window.__JUGE__.rect(s); const bf = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).backdropFilter : null }; return { barre: r('[data-zone="barre"]'), l1: r('[data-barre-ligne="1"]'), l2: r('[data-barre-ligne="2"]'), eq: r('[data-zone="equipage"]'), at: r('[data-zone="attention"]'), cmd: r('[data-zone="commandement"]'), jr: r('[data-station-journal]'), carte: r('[data-station-carte]'), bandeau: r('[data-zone="bandeau"]'), colG: (document.querySelector('[data-zone="equipage"]')?.closest('aside, .mc-col, [data-colonne]')), mep: document.querySelector('.mc[data-station]')?.getAttribute('data-mise-en-page'), bfEq: bf('[data-zone="equipage"]'), bfCmd: bf('[data-zone="commandement"]'), vh: innerHeight, vw: innerWidth } })
    const pres = (v, c, t = 2) => Math.abs(v - c) <= t
    if (g.mep !== 'colonnes') faute('ST-3', `.mc porte data-mise-en-page="${g.mep}", « colonnes » attendu par défaut`)
    if (!g.barre || g.barre.y !== 0 || !pres(g.barre.h, 80)) faute('ST-3', `barre : ${JSON.stringify(g.barre && { y: g.barre.y, h: g.barre.h })}, en haut sur 80 ± 2 px attendue`)
    if (!g.l1 || !pres(g.l1.h, 36) || !g.l2 || !pres(g.l2.h, 44)) faute('ST-3', `barre : lignes de ${g.l1?.h} et ${g.l2?.h} px, 36 et 44 attendues`)
    for (const [k, v, larg, cote] of [['équipage', g.eq, 300, 'g'], ['Attention', g.at, 300, 'g'], ['Commandement', g.cmd, 340, 'd'], ['journal', g.jr, 340, 'd']]) {
      if (!v) { faute('ST-3', `${k} absent`); continue }
      const col = cote === 'g' ? { x0: 0, x1: larg } : { x0: g.vw - larg, x1: g.vw }
      if (v.x < col.x0 - 2 || v.d > col.x1 + 2) faute('ST-3', `${k} (${Math.round(v.x)}→${Math.round(v.d)}) hors de la colonne ${cote === 'g' ? 'gauche' : 'droite'} de ${larg} ± 2 px`)
    }
    const colonne = await page.evaluate(() => { const w = (s) => { const e = document.querySelector(s); const c = e && e.parentElement; return c ? c.getBoundingClientRect().width : null }; return { g: w('[data-zone="equipage"]'), d: w('[data-zone="commandement"]') } })
    if (!pres(colonne.g ?? 0, 300)) faute('ST-3', `colonne gauche de ${colonne.g} px, 300 ± 2 attendus`)
    if (!pres(colonne.d ?? 0, 340)) faute('ST-3', `colonne droite de ${colonne.d} px, 340 ± 2 attendus`)
    if (g.eq && g.at && g.eq.y >= g.at.y) faute('ST-3', 'l’équipage n’est pas au-dessus d’Attention')
    if (g.cmd && g.jr && g.cmd.y >= g.jr.y) faute('ST-3', 'le Commandement n’est pas au-dessus du journal')
    if (!g.carte || g.carte.x > 1 || !pres(g.carte.l, g.vw) || !pres(g.carte.y, 80) || !pres(g.carte.b, g.vh - 44)) faute('ST-3', `[data-station-carte] ${JSON.stringify(g.carte && { x: g.carte.x, y: g.carte.y, l: g.carte.l, b: g.carte.b })} : toute la largeur entre la barre et le bandeau attendue`)
    if (g.bfEq && g.bfEq !== 'none' || g.bfCmd && g.bfCmd !== 'none') faute('ST-3', 'backdrop-filter sur une colonne')
    const zc = await page.evaluate(() => { const z = (s) => { let e = document.querySelector(s); let v = 0; while (e) { const zi = parseInt(getComputedStyle(e).zIndex); if (!Number.isNaN(zi)) { v = zi; break } e = e.parentElement } return v }; return { carte: z('[data-station-carte]'), colonne: z('[data-zone="equipage"]') } })
    if (!(zc.carte < zc.colonne)) faute('ST-3', `la carte (z ${zc.carte}) n'est pas sous les colonnes (z ${zc.colonne})`)
    if (!g.bandeau || !pres(g.bandeau.b, g.vh) || !pres(g.bandeau.h, 44)) faute('ST-3', `bandeau ${JSON.stringify(g.bandeau && { b: g.bandeau.b, h: g.bandeau.h })} : collé au bas, 44 ± 2 px attendu`)
    // ST-4 : la barre.
    const cases = await page.evaluate(() => [...document.querySelectorAll('[data-zone="barre"] [data-compteur]')].map((e) => ({ cle: e.getAttribute('data-compteur'), texte: window.__JUGE__.texte(e), valeur: window.__JUGE__.texte(e.querySelector('[data-valeur]') ?? e) })))
    const attendus = [['encaisse_mois', 'ENCAISSÉ · MOIS', euros(T.tire.net)], ['depense_mois', 'DÉPENSÉ · MOIS', euros(T.tire.depenses)], ['marge_mois', 'MARGE · MOIS', euros(T.tire.marge)]]
    for (const [k, lib, v] of attendus) { const c = cases.find((y) => y.cle === k); if (!c) faute('ST-4', `[data-compteur="${k}"] absent`); else { if (!c.texte.includes(lib)) faute('ST-4', `${k} : libellé « ${lib} » absent (« ${c.texte} »)`); if (!c.texte.includes(espaces(v))) faute('ST-4', `${k} : « ${espaces(v)} » tiré, « ${c.texte} » affiché`) } }
    const ordre = cases.map((c) => c.cle)
    const servis = ['encaisse_mois', 'depense_mois', 'marge_mois', 'commandes_mois', 'sites_en_ligne', ...b.compteurs.map((c) => c.cle)]
    if (ordre.join() !== servis.join()) faute('ST-4', `ordre des compteurs ${ordre.join(', ')} ; ${servis.join(', ')} attendu`)
    for (const c of b.compteurs) { const v = cases.find((y) => y.cle === c.cle); if (!v) continue; if (c.ton === 'muet') { if (/\d/.test(v.valeur)) faute('ST-4', `${c.cle} (muet) affiche un chiffre : « ${v.valeur} »`) } else if (!v.texte.includes(espaces(c.texte))) faute('ST-4', `${c.cle} : « ${c.texte} » servi, « ${v.texte} » affiché`) }
    const cm = cases.find((y) => y.cle === 'commandes_mois'), se = cases.find((y) => y.cle === 'sites_en_ligne')
    if (!cm?.texte.includes(String(b.commandes_mois.valeur))) faute('ST-4', `COMMANDES · MOIS : ${b.commandes_mois.valeur} servi, « ${cm?.texte} » affiché`)
    if (!se?.texte.includes(String(b.sites_en_ligne.valeur))) faute('ST-4', `SITES EN LIGNE : ${b.sites_en_ligne.valeur} servi, « ${se?.texte} » affiché`)
    const l1 = await page.evaluate(() => { const a = (s, k) => document.querySelector(s)?.getAttribute(k) ?? null; const t = (s) => window.__JUGE__.texte(s); const auto = document.querySelector('[data-auto]'); const cs = auto ? getComputedStyle(auto) : null; const ok = getComputedStyle(document.querySelector('.mc')).getPropertyValue('--mc-ok').trim(); return { retour: a('[data-retour-poste]', 'href'), version: t('[data-version]'), sante: t('[data-sante]'), jour: t('[data-jour]'), heure: t('[data-heure]'), nuit: a('[data-nuit]', 'data-nuit'), cloche: t('[data-cloche]'), autoActif: a('[data-auto]', 'data-actif'), autoFond: cs?.backgroundColor, autoBord: cs?.borderTopColor, ok } })
    if (l1.retour !== '/controle') faute('ST-4', `« ← Poste » mène à ${l1.retour}, /controle attendu`)
    if (l1.version !== b.version.valeur && !String(l1.version).includes(b.version.valeur)) faute('ST-4', `version « ${l1.version} », « ${b.version.valeur} » servie`)
    if (!String(l1.sante).includes(SANTE[b.sante.valeur.etat])) faute('ST-4', `pastille « ${l1.sante} », « ${SANTE[b.sante.valeur.etat]} » attendue (santé servie : ${b.sante.valeur.etat})`)
    if (!String(l1.jour).includes(b.jour)) faute('ST-4', `« ${l1.jour} » affiché, « ${b.jour} » servi`)
    const h = heureParis(), h1 = heureParis(Date.now() - 60_000), h2 = heureParis(Date.now() + 60_000)
    if (![h, h1, h2].includes(l1.heure)) faute('ST-4', `heure « ${l1.heure} », ${h} (Paris) attendue à une minute près`)
    if ((l1.nuit === 'lune') !== b.nuit) faute('ST-4', `nuit servie ${b.nuit}, [data-nuit="${l1.nuit}"] affiché`)
    if (!String(l1.cloche).includes(String(b.cloche))) faute('ST-4', `cloche « ${l1.cloche} », ${b.cloche} servi`)
    if ((l1.autoActif === 'oui') !== b.auto.actif) faute('ST-4', `AUTO data-actif="${l1.autoActif}", auto.actif ${b.auto.actif}`)
    const rgb = (c) => { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(c).trim()); return m ? `rgb(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)})` : String(c).trim() }
    const vert = [l1.autoFond, l1.autoBord].includes(rgb(l1.ok))
    if (vert !== b.auto.actif) faute('ST-4', `AUTO ${vert ? 'vert' : 'pas vert'} (fond ${l1.autoFond}) alors que auto.actif ${b.auto.actif}`)
    const html = await fetch(`${srv.base}/controle/station`).then((r) => r.text()).catch(() => '')
    if (html.includes(b.version.valeur)) faute('ST-4', 'la version servie est dans le HTML de la page sans session')
    // ST-5 : l'équipage.
    const agents = await page.evaluate(() => [...document.querySelectorAll('[data-zone="equipage"] [data-agent]')].map((e) => ({ nom: e.getAttribute('data-agent'), point: e.querySelector('[data-point]')?.getAttribute('data-point'), texte: window.__JUGE__.texte(e), activite: window.__JUGE__.texte(e.querySelector('[data-activite]') ?? e), alerte: e.querySelector('[data-alerte]') ? window.__JUGE__.texte(e.querySelector('[data-alerte]')) : null, modele: e.querySelector('[data-modele]') ? { texte: window.__JUGE__.texte(e.querySelector('[data-modele]')), visible: e.querySelector('[data-modele]').checkVisibility() } : null })))
    if (agents.map((a) => a.nom).join() !== eqv.agents.map((a) => a.nom).join()) faute('ST-5', `agents ${agents.map((a) => a.nom).join(', ')} ; ${eqv.agents.map((a) => a.nom).join(', ')} servis, dans l'ordre`)
    const salles = x.plaques()
    const couts = Object.fromEntries(eqv.couts.valeur.map((c) => [c.nom, c.cout_mois_eur]))
    for (const a of eqv.agents) {
      const v = agents.find((y) => y.nom === a.nom)
      if (!v) continue
      if (v.point !== a.point) faute('ST-5', `${a.nom} : [data-point="${v.point}"], « ${a.point} » servi`)
      if (v.activite !== espaces(a.activite)) faute('ST-5', `${a.nom} : activité « ${court(v.activite, 50)} », « ${court(a.activite, 50)} » servie`)
      if (!v.texte.includes(espaces(a.cadence))) faute('ST-5', `${a.nom} : cadence « ${a.cadence} » absente`)
      if (!v.texte.includes(espaces(euros(couts[a.nom])))) faute('ST-5', `${a.nom} : coût ${euros(couts[a.nom])} absent`)
      if (!v.texte.includes('📍') || (salles[a.position.salle] && !v.texte.includes(salles[a.position.salle]))) faute('ST-5', `${a.nom} : « 📍 ${salles[a.position.salle] ?? a.position.salle} » absent`)
      // Les jeux sont datés de MAINTENANT_JEUX et servis décalés à maintenant : l'âge se calcule dans ce repère (une minute de jeu).
      const ancs = [0, 30_000, 60_000].map((d) => espaces(relTime(a.activite_le, Date.parse(O.MAINTENANT_JEUX) + d)))
      if (!ancs.some((anc) => v.texte.includes(anc))) faute('ST-5', `${a.nom} : ancienneté « ${ancs[0]} » absente`)
      const carte = at.cartes.find((c) => c.agent === a.nom)
      if (carte && v.alerte?.replace(/^⚠\s*/, '') !== espaces(carte.titre)) faute('ST-5', `${a.nom} : ligne ⚠ « ${v.alerte} », le titre de sa carte « ${carte.titre} » attendu`)
      if (!carte && v.alerte) faute('ST-5', `${a.nom} : une ligne ⚠ sans carte Attention qui le nomme`)
      // ST-19 : son modèle.
      if (!v.modele || !v.modele.visible) faute('ST-19', `${a.nom} : [data-modele] absent ou invisible`)
      else if (!v.modele.texte.includes(espaces(a.modele.texte))) faute('ST-19', `${a.nom} : modèle « ${v.modele.texte} », « ${a.modele.texte} » servi`)
    }
    if (!(await page.$('[data-commandant]'))) faute('ST-5', '[data-commandant] absent en tête de l’équipage')
    const cible = eqv.agents[H.entre(0, eqv.agents.length - 1)].nom
    await page.evaluate(() => { window.__marque = 'juge' })
    await page.click(`[data-agent="${cible}"] [data-activite]`)
    await page.waitForFunction((n) => new URL(location.href).searchParams.get('agent') === n, cible, { timeout: 3000 }).catch(() => {})
    const apres = await page.evaluate(() => ({ agent: new URL(location.href).searchParams.get('agent'), chemin: location.pathname, marque: window.__marque }))
    if (apres.agent !== cible || apres.chemin !== '/controle/station' || apres.marque !== 'juge') faute('ST-5', `un appui sur ${cible} donne ${apres.chemin}?agent=${apres.agent}${apres.marque ? '' : ' (page rechargée)'}, ?agent=${cible} sans changer de page attendu`)
    await page.keyboard.press('Escape'); await page.goto(`${srv.base}/controle/station`, { waitUntil: 'domcontentloaded' }); await pret(page)
    // ST-7 : le Commandement.
    const tc = await texte(page, '[data-zone="commandement"]')
    if (!String(tc).includes('PAR LE CHEF')) faute('ST-7', 'l’objectif n’est pas signé « PAR LE CHEF »')
    for (const m of cmd.missions) { const t = await texte(page, `[data-zone="commandement"] [data-mission="${m.cle}"]`); if (!t || !t.includes(m.texte)) faute('ST-7', `mission ${m.cle} : « ${m.texte} » servi, « ${t} » affiché`) }
    const niv = await texte(page, '[data-zone="commandement"] [data-niveau]')
    if (!niv || !niv.includes(`LV.${cmd.argent.valeur.niveau.lv}`)) faute('ST-7', `niveau « ${niv} », LV.${cmd.argent.valeur.niveau.lv} servi`)
    if (!String(tc).includes(cmd.succes.libelle)) faute('ST-7', `dernier succès « ${cmd.succes.libelle} » absent`)
    const lignesCr = await page.$$eval('[data-zone="commandement"] [data-compte-rendu] > *', (l) => l.length).catch(() => -1)
    if (lignesCr < 1 || lignesCr > 3) faute('ST-7', `${lignesCr} ligne(s) de compte rendu, 1 à 3 attendues`)
    for (const l of cmd.compteRendu) if (!String(tc).includes(espaces(l))) faute('ST-7', `ligne de compte rendu « ${l} » absente`)
    // ST-8 : le bandeau, la navigation, la pastille, le toast.
    const bd = await texte(page, '[data-zone="bandeau"]')
    for (const el of D.reponse.valeur.bandeau.valeur.elements) if (!String(bd).includes(espaces(el.texte))) faute('ST-8', `élément « ${el.texte} » absent du bandeau`)
    const nav = await page.$$eval('[data-zone="bandeau"] [data-nav]', (l) => l.map((e) => e.getAttribute('data-nav')))
    if (nav.join() !== 'station,missions,journal,succes,reglages,aide') faute('ST-8', `navigation ${nav.join(', ')}, « station, missions, journal, succes, reglages, aide » attendue`)
    const pastille = await texte(page, '[data-pastille-bandeau]')
    const attenduPastille = `${espaces(euros(T.tire.net))} · ${b.sites_en_ligne.valeur} en ligne`
    if (pastille !== attenduPastille) faute('ST-8', `pastille « ${pastille} », « ${attenduPastille} » attendue (ENCAISSÉ · MOIS et SITES EN LIGNE)`)
    for (const n of ['missions', 'succes', 'aide', 'reglages']) {
      await page.evaluate(() => { window.__marque = 'juge' })
      await page.click(`[data-zone="bandeau"] [data-nav="${n}"]`)
      await page.waitForFunction((v) => new URL(location.href).searchParams.get('vue') === v, n, { timeout: 3000 }).catch(() => {})
      const r = await page.evaluate(() => ({ vue: new URL(location.href).searchParams.get('vue'), chemin: location.pathname, marque: window.__marque }))
      if (r.vue !== n || r.chemin !== '/controle/station' || r.marque !== 'juge') faute('ST-8', `${n} : ${r.chemin}?vue=${r.vue}${r.marque ? '' : ' (page rechargée)'}, ?vue=${n} sans changer de page attendu`)
      await page.keyboard.press('Escape')
    }
    for (const n of ['station', 'journal']) { await page.evaluate(() => { window.__marque = 'juge' }); await page.click(`[data-zone="bandeau"] [data-nav="${n}"]`); await attendre(150); const r = await page.evaluate(() => ({ chemin: location.pathname, marque: window.__marque })); if (r.chemin !== '/controle/station' || r.marque !== 'juge') faute('ST-8', `${n} change de page`) }
    const toast = await texte(page, '[data-toast-erreurs]')
    if (!toast || !toast.includes(`${b.erreurs.valeur} erreur`)) faute('ST-8', `toast « ${toast} », « ${b.erreurs.valeur} erreurs · 24 h » attendu`)
    if (toast) {
      await page.click('[data-toast-erreurs] button')
      if (await page.$('[data-toast-erreurs]')) faute('ST-8', '× ne masque pas le toast')
      await page.reload({ waitUntil: 'domcontentloaded' }); await pret(page)
      if (await page.$('[data-toast-erreurs]')) faute('ST-8', 'le toast masqué revient au rechargement, sans erreur nouvelle')
    }
    // ST-16 et l'immobilité : 3 s après le chargement, rien ne tourne dans la station ; ST-8 : rien dans le bandeau.
    const im = await immobilite(page, { attente: 3000, duree: 3000, sel: '[data-station]' })
    if (!im.constant) faute('ST-16', `sans événement, la station bouge : ${im.detail}`)
    const animBandeau = await page.evaluate(() => window.__JUGE__.animations('[data-zone="bandeau"]'))
    if (animBandeau.length) faute('ST-8', `3 s après le chargement, une animation tourne dans le bandeau (${animBandeau[0]})`)
    DETAILS['ST-16a'] = `bureau, 3 s après le chargement, sans événement : ${im.detail}`
    // ST-13 : les liens et les boutons.
    const liens = await page.$$eval('[data-station] a[href]', (l) => l.map((a) => a.getAttribute('href')))
    for (const l of liens) if (!/^\/(controle(\/station)?|parametres)([?#/]|$)/.test(l) || l.includes('@') || /\d{9}/.test(l)) faute('ST-13', `lien « ${l} » : /controle…, /controle/station… ou /parametres attendu`)
    const gestesInterdits = await page.$$eval('[data-station] button, [data-station] a', (l) => l.map((e) => `${e.textContent} ${e.getAttribute('aria-label') ?? ''}`).filter((t) => /envoy|copier|relayer/i.test(t)))
    if (gestesInterdits.length) faute('ST-13', `bouton ou lien « ${court(gestesInterdits[0], 40)} »`)
    vu('ST-13')
    // ST-18 : la liste des salles.
    const ls = await page.$$eval('[data-station-carte] [data-liste-salles] [data-salle]', (l) => l.map((e) => ({ cle: e.getAttribute('data-salle'), texte: e.textContent.trim(), h: e.getBoundingClientRect().height, off: e.disabled || e.getAttribute('aria-disabled') === 'true', tag: e.tagName })))
    const actives = ls.filter((y) => !y.off)
    if (actives.map((y) => y.cle).sort().join() !== [...CLES_SALLES].sort().join()) faute('ST-18', `${actives.length} bouton(s) de salle actifs (${actives.map((y) => y.cle).join(', ')}), les 20 clés de SALLES attendues, une fois chacune`)
    for (const y of actives) { if (y.h < 44) faute('ST-18', `bouton ${y.cle} de ${Math.round(y.h)} px`); if (salles[y.cle] && !y.texte.includes(salles[y.cle])) faute('ST-18', `bouton ${y.cle} sans sa plaque « ${salles[y.cle]} »`) }
    const res = ls.find((y) => y.cle === 'ecommerce')
    if (!res || !res.off || !/E-commerce/.test(res.texte) || !/réservée/.test(res.texte)) faute('ST-18', '« E-commerce · réservée » absent ou actif')
    const sal = CLES_SALLES[H.entre(0, CLES_SALLES.length - 1)]
    await page.evaluate(() => { window.__marque = 'juge' })
    await page.click(`[data-liste-salles] [data-salle="${sal}"]`)
    await page.waitForFunction((v) => new URL(location.href).searchParams.get('salle') === v, sal, { timeout: 3000 }).catch(() => {})
    const rs = await page.evaluate(() => ({ salle: new URL(location.href).searchParams.get('salle'), marque: window.__marque, chemin: location.pathname }))
    if (rs.salle !== sal || rs.marque !== 'juge' || rs.chemin !== '/controle/station') faute('ST-18', `un appui sur ${sal} donne ${rs.chemin}?salle=${rs.salle}, ?salle=${sal} sans changer de page attendu`)
    const phaser = (SERVEUR_REQUETES(srv)).filter((u) => /phaser/i.test(u))
    if (phaser.length) faute('ST-18', `/controle/station demande ${phaser.length} fichier(s) portant « phaser » (${court(phaser[0], 60)})`)
    if (srv.mode === 'banc' && srv.banc.paquets.station?.modules.some((m) => /phaser/i.test(m))) faute('ST-18', 'le paquet de la page contient un module phaser')
    const vuesDom = await page.$('[data-vue]')
    if (vuesDom) faute('ST-18', 'une vue est ouverte sans ?vue= dans l’adresse')
    // ST-12 : la capture du bureau (panneau fermé).
    await page.goto(`${srv.base}/controle/station`, { waitUntil: 'domcontentloaded' }); await pret(page); await attendre(400)
    captures.bureau = await capturer(page, cheminCapture('bureau.jpg'))
    for (const m of erreurs) faute('ST-16', `erreur de la page : ${court(m, 80)}`)
    await fermer()
  })

  // Scénario 2 : 1280×800, colonnes de 280 et 320 px.
  await scenario(['ST-3'], '1280', async () => {
    const { page, s, fermer } = await ouvrir('/controle/station', base(), { largeur: 1280, hauteur: 800 })
    await pret(page)
    const w = await page.evaluate(() => { const c = (sel) => document.querySelector(sel)?.parentElement?.getBoundingClientRect().width ?? null; return { g: c('[data-zone="equipage"]'), d: c('[data-zone="commandement"]') } })
    if (Math.abs((w.g ?? 0) - 280) > 2 || Math.abs((w.d ?? 0) - 320) > 2) faute('ST-3', `à 1280×800 : colonnes de ${w.g} et ${w.d} px, 280 et 320 ± 2 attendues`)
    await fermer()
  })

  // Scénario 3 : mise en page flottante.
  await scenario(['ST-3'], 'flottante', async () => {
    const { page, s, fermer } = await ouvrir('/controle/station', base({ reglages: J('reglages-flottante.json') }))
    await pret(page)
    await page.waitForFunction(() => document.querySelector('.mc[data-station]')?.getAttribute('data-mise-en-page') === 'flottante', null, { timeout: 5000 }).catch(() => {})
    const f = await page.evaluate(() => { const vis = (s) => window.__JUGE__.visible(s); const cartes = [...document.querySelectorAll('[data-carte-attention]')].filter((e) => window.__JUGE__.visible(e)).map((e) => e.getBoundingClientRect()); return { mep: document.querySelector('.mc[data-station]')?.getAttribute('data-mise-en-page'), cartes: cartes.map((r) => ({ x: r.x, d: r.right, y: r.y })), cmd: vis('[data-zone="commandement"]'), vw: innerWidth } })
    if (f.mep !== 'flottante') faute('ST-3', `réglages en flottante : data-mise-en-page="${f.mep}"`)
    if (!f.cartes.length || f.cartes.some((r) => r.x < f.vw / 2 || r.y < 80)) faute('ST-3', 'en flottante, les cartes Attention ne flottent pas à droite sous la barre')
    if (f.cmd) faute('ST-3', 'en flottante, le Commandement est ouvert au chargement')
    await page.click('[data-drapeau-missions]')
    await page.waitForFunction(() => window.__JUGE__.visible('[data-zone="commandement"]'), null, { timeout: 3000 }).catch(() => {})
    if (!(await page.evaluate(() => window.__JUGE__.visible('[data-zone="commandement"]')))) faute('ST-3', 'en flottante, ⚑ n’ouvre pas le Commandement')
    await fermer()
  })

  // Scénario 4 : la trésorerie en panne, la santé en manque, les sous-parties hors périmètre.
  await scenario(['ST-4'], 'pannes de la barre', async () => {
    const d2 = structuredClone(D); const b2 = d2.reponse.valeur.barre.valeur
    b2.sante = { valeur: null, source: 'supabase', a: b2.sante.a, cache: false, manque: 'sonde de santé pas encore branchée' }
    b2.commandes_mois = { valeur: null, nonMesure: true, raison: 'hors périmètre' }
    b2.sites_en_ligne = { valeur: null, nonMesure: true, raison: 'hors périmètre' }
    const { page, s, fermer } = await ouvrir('/controle/station', base({ direct: d2, tresorerie: J('tresorerie-503.json') }))
    await pret(page)
    await page.waitForFunction(() => /ne répond pas/.test(document.querySelector('[data-compteur="encaisse_mois"]')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {})
    for (const k of ['encaisse_mois', 'depense_mois', 'marge_mois']) { const t = await texte(page, `[data-compteur="${k}"]`); if (!t || !t.includes('—') || !/Trésorerie ne répond pas/.test(t) || /\b0,00\s*€/.test(t)) faute('ST-4', `trésorerie en panne : ${k} affiche « ${t} », « — » et « Trésorerie ne répond pas » attendus, jamais 0 €`) }
    const sante = await texte(page, '[data-sante]')
    if (sante !== '—') faute('ST-4', `santé en manque : pastille « ${sante} », « — » attendu`)
    for (const k of ['commandes_mois', 'sites_en_ligne']) { const t = await texte(page, `[data-compteur="${k}"]`); if (!t || !t.includes('— · hors périmètre') || /\b0\b/.test(t)) faute('ST-4', `${k} hors périmètre : « ${t} », « — · hors périmètre » attendu, jamais 0`) }
    await fermer()
  })

  // Scénario 5 : la sous-partie equipage en panne (ST-9).
  await scenario(['ST-9'], 'direct-503', async () => {
    const d = J('direct-503.json')
    const { page, s, fermer } = await ouvrir('/controle/station', base({ direct: d }))
    await pret(page)
    const z = await texte(page, '[data-zone="equipage"]')
    const err = d.reponse.valeur.equipage.erreur
    if (!z || !z.includes('ne répond pas') || !z.includes(err)) faute('ST-9', `équipage en panne : « ${court(z, 80)} », « … ne répond pas : ${err} » attendu`)
    if (await page.$('[data-zone="equipage"] [data-agent]')) faute('ST-9', 'équipage en panne : des cartes d’agent sont rendues')
    if (/\d/.test(String(z).replace(/Commandant[\s\S]*console/, ''))) faute('ST-9', `équipage en panne : un chiffre affiché (« ${court(z, 60)} »)`)
    for (const zz of ['attention', 'commandement', 'bandeau']) { const t = await texte(page, `[data-zone="${zz}"]`); if (!t || /ne répond pas/.test(t)) faute('ST-9', `la zone ${zz} n'est pas rendue quand seul l'équipage est en panne`) }
    DETAILS['ST-9'] = `direct-503.json : l’équipage dit « … ne répond pas : ${err} », sans chiffre ni carte ; Attention, Commandement et bandeau rendus`
    await fermer()
  })

  // Scénario 6 : Attention dans l'ordre servi, puis vide (ST-6).
  await scenario(['ST-6'], 'attention', async () => {
    const ao = J('attention-ordre.json')
    const { page, s, fermer } = await ouvrir('/controle/station', base({ direct: ao }))
    await pret(page)
    const cartes = await page.$$eval('[data-zone="attention"] [data-carte-attention]', (l) => l.map((e) => ({ cle: e.getAttribute('data-carte-attention'), couleur: e.getAttribute('data-couleur'), texte: e.textContent })))
    const servies = ao.reponse.valeur.attention.valeur
    if (cartes.map((c) => `${c.cle}:${c.couleur}`).join() !== servies.cartes.map((c) => `${c.cle}:${c.couleur}`).join()) faute('ST-6', `cartes ${cartes.map((c) => `${c.cle}:${c.couleur}`).join(', ')} ; ordre et couleurs servis ${servies.cartes.map((c) => `${c.cle}:${c.couleur}`).join(', ')}`)
    for (const c of servies.cartes) { const v = cartes.find((y) => y.cle === c.cle); if (v && (!espaces(v.texte).includes(espaces(c.titre)) || !v.texte.includes(String(c.nombre)))) faute('ST-6', `carte ${c.cle} : titre ou nombre absent`) }
    // Visible : amenée dans sa colonne (défilement de la colonne permis), puis elementFromPoint en son centre.
    await page.locator('[data-carte-attention="orchestre"]').scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {})
    if (!(await page.evaluate(() => window.__JUGE__.visible('[data-carte-attention="orchestre"]')))) faute('ST-6', 'la carte orchestre n’est pas visible')
    const autres = await texte(page, '[data-zone="attention"] [data-autres]')
    if (!autres || !autres.includes(`${servies.total - servies.cartes.length} autres`)) faute('ST-6', `« ${servies.total - servies.cartes.length} autres » attendu (total ${servies.total}), « ${autres} » affiché`)
    await fermer()
    const av = J('attention-vide.json')
    const r2 = await ouvrir('/controle/station', base({ direct: av }))
    await pret(r2.page)
    const vide = await r2.page.evaluate(() => window.__JUGE__.texte('[data-zone="attention"]'))
    if (!String(vide).includes('Rien pour toi. L’équipage tourne.')) faute('ST-6', `sans carte : « ${court(vide, 60)} », « Rien pour toi. L’équipage tourne. » attendu`)
    if (await r2.page.$('[data-zone="attention"] [data-carte-attention]')) faute('ST-6', 'sans carte servie, une carte est rendue')
    DETAILS['ST-6'] = `attention-ordre.json : ${servies.cartes.length} cartes dans l’ordre et les couleurs servis, orchestre visible, « ${servies.total - servies.cartes.length} autres » ; attention-vide.json : la phrase exacte`
    await r2.fermer()
  })

  // Scénario 7 : le téléphone (ST-10) et sa capture (ST-12).
  await scenario(['ST-10', 'ST-12'], 'téléphone', async () => {
    const { page, s, fermer } = await ouvrir('/controle/station', base(), { largeur: 390, hauteur: 844, mobile: true })
    await page.waitForSelector('[data-barre-tel]', { timeout: 20_000 }).catch(() => {})
    await page.waitForFunction(() => { const e = document.querySelector('[data-barre-tel] [data-compteur="encaisse_mois"]'); return e && !/…/.test(e.textContent) }, null, { timeout: 8000 }).catch(() => {})
    const bt = await page.evaluate(() => ({ r: window.__JUGE__.rect('[data-barre-tel]'), l1: window.__JUGE__.texte('[data-barre-tel]'), l2: [...document.querySelectorAll('[data-barre-tel-ligne="2"] [data-compteur]')].map((e) => e.getAttribute('data-compteur')), sante: !!document.querySelector('[data-barre-tel] [data-sante]'), cloche: !!document.querySelector('[data-barre-tel] [data-cloche]'), auto: !!document.querySelector('[data-barre-tel] [data-auto]') }))
    if (!bt.r || Math.abs(bt.r.h - 88) > 2) faute('ST-10', `barre compacte de ${bt.r?.h} px, 88 ± 2 attendus`)
    if (!String(bt.l1).includes('MISSION CONTROL') || !bt.sante || !bt.cloche || !bt.auto) faute('ST-10', 'la barre compacte n’a pas « MISSION CONTROL », le point d’état, la cloche et AUTO')
    if (bt.l2.join() !== 'encaisse_mois,envois,chef') faute('ST-10', `ligne 2 : ${bt.l2.join(', ')} ; ENCAISSÉ · MOIS, ENVOIS DU JOUR, CHEF DANS attendus`)
    // Chaque compteur de la ligne 2 ENTIER : rectangle dans 0..390 et dans la ligne, elementFromPoint en son centre et à ses
    // deux bords (un compteur coupé par « overflow: hidden » ne se lit pas, même présent dans le DOM : contre-vérification).
    for (const m of await page.evaluate(() => window.__JUGE__.entiers('[data-barre-tel-ligne="2"] [data-compteur]', 390))) faute('ST-10', `ligne 2 de la barre : ${m}`)
    const onglets =await page.$$eval('[data-onglet-tel]', (l) => l.map((e) => ({ o: e.getAttribute('data-onglet-tel'), sel: e.getAttribute('aria-selected'), b: e.getBoundingClientRect().bottom })))
    if (onglets.map((y) => y.o).join() !== 'attention,journal,station,missions,plus') faute('ST-10', `onglets ${onglets.map((y) => y.o).join(', ')}`)
    if (onglets.some((y) => y.b < 844 - 2)) faute('ST-10', 'les onglets ne sont pas en bas')
    if (onglets.find((y) => y.o === 'attention')?.sel !== 'true' || !(await page.$('[data-zone="attention"]'))) faute('ST-10', 'Attention n’est pas ouvert au chargement')
    captures.telephone = await capturer(page, cheminCapture('telephone.jpg'))
    const verifierTel = async (quoi) => {
      const m = await page.evaluate(() => ({ deb: window.__JUGE__.debordements(390), petits: window.__JUGE__.petitsBoutons(44), textes: window.__JUGE__.textesSous(12) }))
      if (m.deb.length) faute('ST-10', `${quoi} : ${m.deb[0]}${m.deb.length > 1 ? ` (et ${m.deb.length - 1} autre(s) : ${m.deb.slice(1, 3).join(' ; ')})` : ''}`)
      if (m.petits.length) faute('ST-10', `${quoi} : bouton ou lien de moins de 44 px (${m.petits[0]})`)
      if (m.textes.length) faute('ST-10', `${quoi} : texte sous 12 px (${m.textes[0]})`)
    }
    await verifierTel('Attention')
    await page.click('[data-barre-tel-ligne="2"]')
    const feuille = await page.$$eval('[data-feuille="compteurs"] [data-compteur]', (l) => l.map((e) => e.getAttribute('data-compteur'))).catch(() => [])
    const tous = ['encaisse_mois', 'depense_mois', 'marge_mois', 'commandes_mois', 'sites_en_ligne', ...b.compteurs.map((c) => c.cle)]
    if (tous.some((k) => !feuille.includes(k))) faute('ST-10', `la feuille « Tous les compteurs » n'a pas ${tous.filter((k) => !feuille.includes(k)).join(', ')}`)
    await verifierTel('feuille des compteurs')
    const fondFeuille = await page.evaluate(() => window.__JUGE__.fondOpaque('[data-feuille="compteurs"]'))
    if (!fondFeuille.ok) faute('ST-10', `feuille « Tous les compteurs » : ${fondFeuille.detail}`)
    await page.click('[data-feuille="compteurs"] [data-fermer], [data-feuille="compteurs"] button').catch(() => {})
    for (const o of ['journal', 'station', 'missions', 'plus']) {
      await page.click(`[data-onglet-tel="${o}"]`); await attendre(200)
      if (o === 'station') {
        const st = await page.evaluate(() => { const c = document.querySelector('[data-station-carte]'), l = document.querySelector('[data-liste-salles]'), e = document.querySelector('[data-zone="equipage"]'); return { c: !!c, l: !!l, ordre: c && e ? (c.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING) > 0 : false } })
        if (!st.c || !st.l || !st.ordre) faute('ST-10', 'l’onglet station ne montre pas le cadre de la carte et sa liste des salles, puis l’équipage')
      }
      if (o === 'plus') { const p = await page.$$eval('[data-plus]', (l) => l.map((e) => e.getAttribute('data-plus'))); if (p.join() !== 'succes,reglages,aide,poste') faute('ST-10', `Plus : ${p.join(', ')} ; succes, reglages, aide, poste attendus`) }
      await verifierTel(`onglet ${o}`)
    }
    DETAILS['ST-10'] = `390×844 : barre compacte de ${Math.round(bt.r?.h ?? 0)} px (MISSION CONTROL, point d’état, cloche, AUTO ; ENCAISSÉ · MOIS, ENVOIS DU JOUR, CHEF DANS), feuille « Tous les compteurs » complète et opaque, onglets en bas (Attention ouvert), Plus → Succès, Réglages, Aide, Poste ; chaque compteur de la ligne 2 entier (dans 0..390 et dans sa ligne, elementFromPoint au centre et aux deux bords) ; sur chaque onglet et sur la feuille : rien hors de 0..390, rien de rogné par un cadre « overflow: hidden », aucun défilement horizontal, boutons ≥ 44 px, textes ≥ 12 px`
    await fermer()
  })

  // Scénario 8 : le rythme des lectures, horloge de la page avancée par le juge (ST-14).
  await scenario(['ST-14'], 'rythme', async () => {
    const t0 = Date.parse('2026-10-23T09:00:00.000Z')
    const faire = async (plus, f) => { const r = await ouvrir('/controle/station', base(plus), { horloge: t0, attendre: '[data-station]' }); try { await f(r) } finally { await r.fermer() } }
    // L'horloge de la page avance par pas (les minuteries tombent dans runFor) ; entre deux pas, un temps réel court laisse
    // les réponses servies arriver (elles ne dépendent pas de l'horloge de la page).
    const avancer = async (page, ms, pas = 1000, reel = 25) => { for (let t = 0; t < ms; t += pas) { await page.clock.runFor(Math.min(pas, ms - t)); await attendre(reel) } }
    const compter = (j, cle) => j.filter((a) => a.cle === cle).length
    // Page visible, aucune bulle nouvelle, reglages-404 : ≤ 3 direct, ≤ 3 trésorerie, ≤ 13 fil, une seule lecture des réglages.
    await faire({ reglages: J('reglages-404.json') }, async ({ page, s }) => {
      await attendre(600)
      await avancer(page, 60_000, 2500, 60)
      const j = s.journal
      const n = { direct: compter(j, 'direct'), treso: compter(j, 'tresorerie'), fil: compter(j, 'fil'), reglages: compter(j, 'reglages') }
      // 2 à 3 : à l'ouverture, puis au moins une relecture en 60 s (cadence de 30 s) — lu une fois puis plus jamais, le direct est figé.
      if (n.direct > 3 || n.direct < 2) faute('ST-14', `en 60 s : ${n.direct} lecture(s) de vue=direct, 2 à 3 attendues (à l’ouverture puis toutes les 30 s)`)
      if (n.treso > 3 || n.treso < 2) faute('ST-14', `en 60 s : ${n.treso} lecture(s) de la trésorerie, 2 à 3 attendues (à l’ouverture puis toutes les 30 s)`)
      if (n.fil > 13 || n.fil < 2) faute('ST-14', `en 60 s : ${n.fil} lecture(s) de vue=fil, 2 à 13 attendues`)
      if (n.reglages !== 1) faute('ST-14', `${n.reglages} lecture(s) de /station/reglages en 60 s, une seule attendue`)
      const fils = j.filter((a) => a.cle === 'fil')
      if (fils[0]?.url.searchParams.has('apres')) faute('ST-14', 'la première lecture du fil porte apres=')
      const maxServi = Math.max(...jeu('vues/fil.json').reponse.valeur.bulles.map((y) => y.id))
      for (const a of fils.slice(1)) if (Number(a.url.searchParams.get('apres')) !== maxServi) { faute('ST-14', `lecture du fil ${a.chemin} : apres=${maxServi} attendu`); break }
      const panne = await page.evaluate(() => /réglages|ne répond pas/i.test(document.querySelector('.mc')?.innerText.match(/Réglages ne répond pas|réglages.*(erreur|panne)/i)?.[0] ?? ''))
      if (panne) faute('ST-14', 'reglages-404 : une panne des réglages est affichée')
      if (await page.evaluate(() => document.querySelector('.mc[data-station]')?.getAttribute('data-mise-en-page')) !== 'colonnes') faute('ST-14', 'reglages-404 : les défauts ne s’appliquent pas (mise en page)')
      DETAILS['ST-14'] = `60 s page visible : ${n.direct} direct, ${n.treso} trésorerie, ${n.fil} fil (apres=${maxServi} après la première), ${n.reglages} réglages (404 → défauts, sans panne)`
    })
    // Une bulle nouvelle à la 4e lecture du fil : un vue=direct dans les 6 s, jamais deux à moins de 5 s.
    await faire({ fil: (a) => a.n >= 4 ? { statut: 200, reponse: (() => { const j = jeu('fil-nouvelle-bulle.json').reponse; const ap = Number(a.url.searchParams.get('apres')); if (a.url.searchParams.has('apres')) j.valeur.bulles = j.valeur.bulles.filter((y) => y.id > ap); return j })() } : filRep()(a) }, async ({ page, s }) => {
      await attendre(600)
      await avancer(page, 40_000, 2500, 60)
      const j = s.journal
      const quatrieme = j.filter((a) => a.cle === 'fil')[3]
      const directs = j.filter((a) => a.cle === 'direct')
      const horloge = (a) => a.t // instant réel de la requête ; l'écart d'horloge de la page est mesuré par sa propre séquence
      if (!quatrieme) faute('ST-14', 'moins de 4 lectures du fil en 40 s')
      else {
        const idx = j.indexOf(quatrieme)
        const apres = j.slice(idx + 1)
        const iDirect = apres.findIndex((a) => a.cle === 'direct')
        const filsAvant = iDirect < 0 ? Infinity : apres.slice(0, iDirect).filter((a) => a.cle === 'fil').length
        if (iDirect < 0 || filsAvant > 1) faute('ST-14', `bulle nouvelle à la 4e lecture du fil : ${iDirect < 0 ? 'aucun vue=direct ne suit' : `${filsAvant} lectures du fil avant le vue=direct`}, un vue=direct dans les 6 s attendu`)
        const avantQuatre = j.slice(0, idx).filter((a) => a.cle === 'direct').length
        if (avantQuatre !== 1) faute('ST-14', `${avantQuatre} vue=direct avant la bulle nouvelle : la première lecture du fil n’en déclenche aucune`)
      }
      // Deux vue=direct à moins de 5 s de l'horloge de la page : lu dans l'ordre (le fil passe toutes les 5 s).
      const seq = j.filter((a) => a.cle === 'direct' || a.cle === 'fil').map((a) => a.cle)
      for (let i = 0; i + 1 < seq.length; i++) if (seq[i] === 'direct' && seq[i + 1] === 'direct') { faute('ST-14', 'deux vue=direct de suite sans lecture du fil entre eux (moins de 5 s)'); break }
      void horloge; void directs
    })
    // Page cachée : aucune requête en 60 s.
    await faire({}, async ({ page, s }) => {
      await attendre(600)
      await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
      const avant = s.journal.length
      await avancer(page, 60_000, 5000, 40)
      const pendant = s.journal.slice(avant).filter((a) => a.methode === 'GET')
      if (pendant.length) faute('ST-14', `page cachée : ${pendant.length} requête(s) en 60 s (${pendant[0].chemin})`)
    })
    // 15 min sans geste : plus aucune requête, « Direct en pause » ; un toucher relance.
    await faire({}, async ({ page, s }) => {
      await attendre(600)
      await avancer(page, 15 * 60_000 + 60_000, 30_000, 60)
      const avant = s.journal.length
      await avancer(page, 60_000, 10_000, 40)
      const pendant = s.journal.slice(avant).filter((a) => a.methode === 'GET')
      if (pendant.length) faute('ST-14', `après 15 min sans geste : ${pendant.length} requête(s) (${pendant[0].chemin})`)
      const pause = await page.evaluate(() => window.__JUGE__.visible('[data-direct-pause]') && /Direct en pause/.test(document.querySelector('[data-direct-pause]')?.textContent ?? ''))
      if (!pause) faute('ST-14', '« Direct en pause » n’est pas visible après 15 min sans geste')
      const avant2 = s.journal.length
      await page.mouse.click(700, 450)
      await avancer(page, 6000, 1000, 40)
      if (!s.journal.slice(avant2).some((a) => a.cle === 'direct' || a.cle === 'fil')) faute('ST-14', 'un toucher ne relance pas le direct')
    })
  })

  // Scénario 9 : le rôle lecture et le partenaire (ST-15).
  await scenario(['ST-15'], 'rôles', async () => {
    const { page, s, fermer } = await ouvrir('/controle/station', { ...base(), journal: J('role-lecture.json') })
    await pret(page)
    const l = await page.evaluate(() => ({ texte: document.querySelector('.mc')?.innerText ?? '', zones: ['barre', 'equipage', 'attention', 'commandement', 'bandeau'].map((z) => !!document.querySelector(`[data-zone="${z}"]`)), carte: !!document.querySelector('[data-station-carte]'), gestes: [...document.querySelectorAll('[data-pause-agent], [data-consigne-agent], button[data-auto], [data-choix], [data-appel-rendu], [data-transmettre], [data-geste], [data-notifications], [data-nav="reglages"], [data-plus="reglages"]')].map((e) => e.getAttribute('data-nav') ?? e.getAttribute('data-plus') ?? [...e.attributes].map((a) => a.name).find((n) => n.startsWith('data-')) ?? e.tagName) }))
    if (!/lecture seule/.test(l.texte)) faute('ST-15', 'rôle lecture : « lecture seule » n’est pas écrit')
    if (l.zones.includes(false) || !l.carte) faute('ST-15', 'rôle lecture : la station n’est pas affichée en entier')
    if (l.gestes.length) faute('ST-15', `rôle lecture : ${l.gestes.length} geste(s) rendu(s) (${l.gestes.slice(0, 4).join(', ')})`)
    await fermer()
    const r2 = await ouvrir('/controle/station', { ...base(), direct: { statut: 403, reponse: { error: 'Réservé aux fondateurs.' } } }, { attendre: null })
    await r2.page.waitForURL(/\/dashboard/, { timeout: 8000 }).catch(() => {})
    const u = new URL(r2.page.url())
    if (u.pathname !== '/dashboard') faute('ST-15', `partenaire (vue=direct en 403) : la page reste sur ${u.pathname}, /dashboard attendu`)
    const carteMontee = r2.s.journal.length && (await r2.page.evaluate(() => window.__BANC__?.navigations ?? [])).length === 0
    void carteMontee
    await r2.fermer()
    DETAILS['ST-15'] = 'rôle lecture : station entière, « lecture seule », aucun geste ni entrée Réglages ; partenaire (403) : renvoyé à /dashboard'
  })

  // Scénario 10 : sans session, et la carte montée seulement après le premier 200 de vue=direct (ST-18).
  await scenario(['ST-18'], 'session et premier direct', async () => {
    const r1 = await ouvrir('/controle/station', base(), { session: false, attendre: null })
    await r1.page.waitForURL(/\/login/, { timeout: 8000 }).catch(() => {})
    if (new URL(r1.page.url()).pathname !== '/login') faute('ST-18', `sans session : ${new URL(r1.page.url()).pathname}, /login attendu`)
    await r1.fermer()
    const r2 = await ouvrir('/controle/station', base({ direct: { ...D, retard: 2000 } }), { attendre: '[data-station]' })
    await attendre(900)
    if (await r2.page.$('[data-station-carte]')) faute('ST-18', 'vue=direct servie en retard de 2 s : [data-station-carte] est monté avant la réponse')
    await r2.page.waitForSelector('[data-station-carte]', { timeout: 8000 }).catch(() => {})
    if (!(await r2.page.$('[data-station-carte]'))) faute('ST-18', 'la carte n’est pas montée après la réponse 200 de vue=direct')
    await r2.fermer()
  })

  // Scénario 11 : la règle de vérité (ST-16, règle 5 de la fiche : un compteur ne change que si la réponse servie a changé).
  // L'horloge de la page est installée par le juge et avancée de 32 s : une SECONDE lecture de vue=direct, identique à la
  // première, est servie (cadence de 30 s) ; le juge exige n1 > n0 lectures, puis compare les textes de toutes les zones,
  // du journal et de chaque [data-compteur], [data-heure] retiré. Ensuite un événement injecté se voit avant t + 10 s.
  await scenario(['ST-16'], 'vérité', async () => {
    const inj = jeu('fil-injection.json')
    let injecte = false
    const agentInj = D.reponse.valeur.equipage.valeur.agents.find((a) => a.nom === inj.activite.agent)
    const direct = () => (injecte ? (() => { const x = structuredClone(D); const a = x.reponse.valeur.equipage.valeur.agents.find((y) => y.nom === inj.activite.agent); if (a) { a.activite = inj.activite.texte; a.activite_le = new Date(Date.parse('2026-10-23T10:00:00.000Z')).toISOString() } return x })() : D)
    const fil = (a) => { if (!injecte) return filRep()(a); const r = { statut: 200, reponse: structuredClone(inj.apres) }; if (a.url.searchParams.has('apres')) { const ap = Number(a.url.searchParams.get('apres')); r.reponse.valeur.bulles = r.reponse.valeur.bulles.filter((y) => y.id > ap) } return r }
    const { page, s, fermer } = await ouvrir('/controle/station', base({ direct: () => direct(), fil }), { horloge: Date.now() })
    // L'horloge avance par pas ; entre deux pas, un temps réel court laisse les réponses servies arriver.
    const avancer = async (ms, pas = 1000, reel = 40) => { for (let t = 0; t < ms; t += pas) { await page.clock.runFor(Math.min(pas, ms - t)); await attendre(reel) } }
    await page.clock.runFor(500); await pret(page)
    await avancer(1500, 500, 60)
    // Les textes : chaque zone, le journal, chaque compteur ; [data-heure] retiré (l'heure de Paris tourne avec l'horloge) ;
    // les âges relatifs de relTime (« à l’instant », « il y a N min|h|j ») ramenés à ⟨âge⟩, que 32 s d'horloge font vieillir.
    const lireTextes = () => page.evaluate(() => [...document.querySelectorAll('[data-station] [data-zone], [data-station] [data-station-journal], [data-station] [data-compteur]')].map((e) => {
      const c = e.cloneNode(true)
      c.querySelectorAll('[data-heure]').forEach((h) => h.remove())
      const quoi = e.getAttribute('data-zone') ?? e.getAttribute('data-compteur') ?? 'journal'
      return `${quoi} : ${c.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').replace(/à l[’']instant|il y a \d+ (?:min|h|j)\b/g, '⟨âge⟩').trim()}`
    }))
    const avant = await lireTextes()
    const n0 = s.journal.filter((a) => a.cle === 'direct').length
    await avancer(32_000, 2000, 50)
    await attendre(300)
    const n1 = s.journal.filter((a) => a.cle === 'direct').length
    const apres = await lireTextes()
    if (n0 < 1) faute('ST-16', 'aucune lecture de vue=direct au chargement')
    if (n1 <= n0) faute('ST-16', `aucune seconde lecture de vue=direct en 32 s d’horloge (${n0} puis ${n1}) : la règle de vérité ne peut pas se juger`)
    else {
      const changes = apres.filter((t, i) => t !== avant[i])
      if (apres.length !== avant.length) faute('ST-16', `deux réponses vue=direct identiques : ${avant.length} blocs de texte avant, ${apres.length} après`)
      else if (changes.length) {
        const i = apres.indexOf(changes[0]), a = avant[i], b = apres[i]
        let k = 0
        while (k < a.length && a[k] === b[k]) k++
        const autour = (t) => `${k > 40 ? '…' : ''}${t.slice(Math.max(0, k - 40), k + 50)}`
        faute('ST-16', `deux réponses vue=direct identiques (${n1 - n0 + 1} lectures) : le texte de « ${a.split(' : ')[0]} » a changé sans événement — « ${autour(a)} » → « ${autour(b)} »`)
      }
    }
    if (!agentInj) faute('ST-16', `l'agent ${inj.activite.agent} n'est pas dans l'équipage servi`)
    injecte = true
    // L'événement injecté : il doit se voir dans l'équipage avant t + 10 s d'horloge de la page.
    const voit = () => page.evaluate(([n, t]) => (document.querySelector(`[data-agent="${n}"] [data-activite]`)?.textContent ?? '').includes(t), [inj.activite.agent, inj.activite.texte])
    let delai = null
    for (let t = 0; t <= 10_000; t += 500) { if (await voit()) { delai = t; break } await page.clock.runFor(500); await attendre(60) }
    if (delai === null) faute('ST-16', `l’événement injecté (${inj.activite.agent} : « ${inj.activite.texte} ») ne se voit pas dans l’équipage avant t + 10 s`)
    DETAILS['ST-16b'] = `${n1 - n0 + 1} lectures identiques de vue=direct (horloge de la page avancée de 32 s) : aucun texte des zones, du journal ni des compteurs n’a changé ([data-heure] retiré, âges relatifs ramenés) ; l’événement injecté (« ${inj.activite.texte} ») se voit dans l’équipage en ${delai === null ? 'plus de 10' : (delai / 1000).toFixed(1)} s d’horloge`
    await fermer()
  })

  // Scénario 12 : le mouvement réduit (un élément nouveau n'entre pas en animation) ; localStorage qui lève (ST-5, ST-8).
  await scenario(['ST-8', 'ST-5'], 'mouvement réduit et stockage', async () => {
    let tour = 0
    const direct = () => { tour++; if (tour < 2) return D; const x = structuredClone(D); x.reponse.valeur.bandeau.valeur.elements.push({ id: 999, le: '2026-10-23T10:00:00.000Z', type: 'commande_payee', texte: 'Site · couvreur, Dijon · 300 €' }); return x }
    const nouvelleBulle = (a) => a.n >= 2 ? (() => { const j = jeu('fil-nouvelle-bulle.json').reponse; if (a.url.searchParams.has('apres')) { const ap = Number(a.url.searchParams.get('apres')); j.valeur.bulles = j.valeur.bulles.filter((y) => y.id > ap) } return { statut: 200, reponse: j } })() : filRep()(a)
    // Sans mouvement réduit : l'élément nouveau entre une fois, puis tout redevient immobile.
    const r0 = await ouvrir('/controle/station', base({ direct, fil: nouvelleBulle }))
    await pret(r0.page)
    await r0.page.waitForSelector('[data-element-bandeau="999"]', { timeout: 12_000 }).catch(() => {})
    const entre = await r0.page.evaluate(() => window.__JUGE__.animations('[data-zone="bandeau"]').length)
    await attendre(1500)
    const reste = await r0.page.evaluate(() => window.__JUGE__.animations('[data-zone="bandeau"]'))
    if (!(await r0.page.$('[data-element-bandeau="999"]'))) faute('ST-8', 'l’élément nouveau du bandeau n’est pas affiché')
    if (reste.length) faute('ST-8', `l’élément nouveau entre, puis une animation tourne encore (${reste[0]})`)
    await r0.fermer()
    tour = 0
    const r1 = await ouvrir('/controle/station', base({ direct, fil: nouvelleBulle }), { reduit: true })
    await pret(r1.page)
    await r1.page.waitForSelector('[data-element-bandeau="999"]', { timeout: 12_000 }).catch(() => {})
    const anim = await r1.page.evaluate(() => window.__JUGE__.animations('[data-station]'))
    if (anim.length) faute('ST-8', `mouvement réduit : une animation tourne à l’entrée d’un élément nouveau (${anim[0]})`)
    await r1.fermer()
    DETAILS['ST-8'] = `bandeau : les éléments servis, six entrées (chacune pose son ?vue= sans changer de page), pastille = ENCAISSÉ · MOIS et SITES EN LIGNE, toast masqué jusqu’au compte suivant ; rien ne tourne 3 s après le chargement ; un élément nouveau entre une fois (${entre ? 'animation vue à l’entrée' : 'entrée sans animation'}) puis tout s’arrête ; mouvement réduit : aucune animation`
    // Replier la colonne : un rail de 44 px, gardé au rechargement ; un localStorage qui lève ne casse rien.
    const r2 = await ouvrir('/controle/station', base())
    await pret(r2.page)
    await r2.page.click('[data-replier="gauche"]')
    await attendre(200)
    const rail = await r2.page.evaluate(() => document.querySelector('[data-zone="equipage"]')?.parentElement?.getBoundingClientRect().width)
    if (Math.abs((rail ?? 0) - 44) > 2) faute('ST-5', `« ◄ » replie la colonne en ${rail} px, un rail de 44 px attendu`)
    await r2.page.reload({ waitUntil: 'domcontentloaded' }); await pret(r2.page)
    const railApres = await r2.page.evaluate(() => document.querySelector('[data-zone="equipage"]')?.parentElement?.getBoundingClientRect().width)
    if (Math.abs((railApres ?? 0) - 44) > 2) faute('ST-5', `après rechargement, la colonne n’est plus repliée (${railApres} px)`)
    await r2.fermer()
    const r3 = await ouvrir('/controle/station', base(), { localStorageQuiLeve: true })
    await pret(r3.page)
    const ok3 = await r3.page.evaluate(() => !!document.querySelector('[data-zone="equipage"] [data-agent]') && !document.querySelector('[data-banc-erreur]'))
    if (!ok3) faute('ST-5', 'un localStorage qui lève casse la station')
    await r3.page.click('[data-replier="gauche"]').catch((e) => faute('ST-5', `localStorage qui lève : « ◄ » inopérant (${court(e.message, 60)})`))
    if (r3.erreurs.length) faute('ST-5', `localStorage qui lève : erreur de la page (${court(r3.erreurs[0], 60)})`)
    await r3.fermer()
    DETAILS['ST-5'] = `${eqv.agents.length} agents dans l’ordre servi : point, activité, cadence, coût, 📍 et plaque de la salle, ancienneté (relTime), ⚠ avec le titre de SA carte ; [data-commandant] ; un appui pose ?agent= sans changer de page ; « ◄ » → rail de 44 px, gardé au rechargement ; localStorage qui lève sans casse`
  })

  // Scénario 13 : ST-11 (réglages avec une couleur de néon) et ST-2 (le Poste, drapeau levé et baissé).
  await scenario(['ST-11'], 'couleurs réglées', async () => {
    const { page, s, fermer } = await ouvrir('/controle/station', base({ reglages: J('reglages-neon.json') }))
    await pret(page)
    await attendre(500)
    const c = await page.evaluate(() => { const v = (e) => (e ? getComputedStyle(e).getPropertyValue('--mc-neon-1').trim() : null); const inline = (e) => (e ? e.style.getPropertyValue('--mc-neon-1').trim() : ''); return { root: inline(document.documentElement), body: inline(document.body), rootCalc: v(document.documentElement), bodyCalc: v(document.body), mc: v(document.querySelector('.mc')) } })
    if (c.root || c.body || c.rootCalc || c.bodyCalc) faute('ST-11', `une couleur réglée est posée hors de .mc (:root « ${c.rootCalc || c.root} », body « ${c.bodyCalc || c.body} »)`)
    await fermer()
  })
  await scenario(['ST-2', 'ST-11'], 'Poste', async () => {
    const uuid = UUID
    // Drapeau levé (la copie) : premier lien du rail → /controle/station ; onglet=pilotage&decision=<uuid> → /controle/station?decision=<uuid>.
    const p1 = await ouvrir('/controle?onglet=aujourdhui', { journal: J('role-direction.json') }, { attendre: '.param-nav, [data-banc-erreur], [data-banc-404]' })
    await attendre(800)
    const premier = await p1.page.evaluate(() => document.querySelector('.param-nav a[href]')?.getAttribute('href') ?? null)
    if (premier !== '/controle/station') faute('ST-2', `drapeau levé : le premier lien du rail mène à ${premier}, /controle/station attendu`)
    const accent = await p1.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase())
    if (accent !== '#d97757') faute('ST-11', `sur /controle?onglet=aujourdhui, --accent vaut « ${accent} », #D97757 attendu`)
    await p1.fermer()
    const p2 = await ouvrir(`/controle?onglet=pilotage&decision=${uuid}`, { ...base(), journal: J('role-direction.json') }, { attendre: null })
    await p2.page.waitForURL(/\/controle\/station/, { timeout: 10_000 }).catch(() => {})
    const u2 = new URL(p2.page.url())
    if (u2.pathname !== '/controle/station' || u2.searchParams.get('decision') !== uuid) faute('ST-2', `onglet=pilotage&decision=<uuid> aboutit à ${u2.pathname}${u2.search}, /controle/station?decision=${uuid} attendu`)
    await p2.fermer()
    const p3 = await ouvrir('/controle?onglet=pilotage&decision=pas-un-uuid', { ...base(), journal: J('role-direction.json') }, { attendre: null })
    await p3.page.waitForURL(/\/controle\/station/, { timeout: 10_000 }).catch(() => {})
    const u3 = new URL(p3.page.url())
    if (u3.searchParams.has('decision')) faute('ST-2', `decision=pas-un-uuid gardée (${u3.search})`)
    await p3.fermer()
    // Drapeau baissé (la racine telle quelle) : /controle/station → 404, /controle sans lien vers la station.
    const baisse = await demarrerBaisse(x)
    try {
      const ctx = await x.SERVEUR_NAV().newContext({ viewport: { width: 1440, height: 900 } })
      const pg = await ctx.newPage()
      await x.preparerPage(pg, { session: true })
      await O.servir(pg, { journal: J('role-direction.json') }, { origine: baisse.base })
      await pg.goto(`${baisse.base}/controle/station`, { waitUntil: 'domcontentloaded' })
      await pg.waitForTimeout(800)
      const e404 = baisse.mode === 'banc' ? await pg.$('[data-banc-404]') : (await pg.evaluate(() => /404|introuvable/i.test(document.body.innerText)))
      if (!e404) faute('ST-2', 'drapeau baissé : /controle/station ne répond pas 404')
      await pg.goto(`${baisse.base}/controle?onglet=aujourdhui`, { waitUntil: 'domcontentloaded' })
      await pg.waitForSelector('.param-nav', { timeout: 20_000 }).catch(() => {})
      await pg.waitForTimeout(500)
      const lien = await pg.$('a[href^="/controle/station"]')
      if (lien) faute('ST-2', 'drapeau baissé : /controle contient un lien vers /controle/station')
      await ctx.close()
    } finally { await baisse.arreter() }
    DETAILS['ST-2'] = `drapeau baissé (racine telle quelle) : /controle/station → 404, aucun lien vers la station ; levé : premier lien du rail → /controle/station, onglet=pilotage&decision=<uuid> → /controle/station?decision=<uuid>, un faux UUID abandonné`
  })

  // Les plus longs d'abord (mesurés : 11 à 19 s chacun), les courts remplissent les trous.
  const LONGS = ['rythme', 'mouvement réduit et stockage', 'bureau', 'vérité', 'Poste']
  file.sort((a, b) => (LONGS.includes(b.nom) ? 1 : 0) - (LONGS.includes(a.nom) ? 1 : 0))
  await x.enParallele(file)

  // ── Les captures (ST-12) et le réseau ───────────────────────────────────────────────────────────────────────────────
  {
    const e = [...defautsCapture(captures.bureau, { largeur: 1440, hauteur: 900 }), ...defautsCapture(captures.telephone, { largeur: 390, hauteur: 844 })]
    if (captures.bureau && captures.telephone && captures.bureau.empreinte === captures.telephone.empreinte) e.push('bureau.jpg et telephone.jpg identiques')
    e.push(...autresParties(captures))
    for (const m of e) faute('ST-12', m)
    vu('ST-12')
    DETAILS['ST-12'] = Object.values(captures).map((c) => `${path.basename(c.fichier)} ${c.largeur}×${c.hauteur}, ${Math.round(c.octets / 1024)} Ko, écart type ${c.ecartType.toFixed(1)}`).join(' ; ') + ' — prises par le juge, différentes entre elles et des autres parties'
  }

  // ── Typecheck : racine réelle seulement ─────────────────────────────────────────────────────────────────────────────
  if (MODE === 'vivant') { const t = O.typecheck(RAC, 'pilotage-ecran-qa'); if (!t.ok) faute('ST-17', t.detail); else DETAILS['ST-17'] = `diff de app/controle/page.tsx limité à l’entrée Station et à la redirection ; ${t.detail}` }
  else DETAILS['ST-17'] = 'diff de app/controle/page.tsx limité à l’entrée Station et à la redirection (le typecheck se juge sur la racine réelle)'
  DETAILS['ST-1'] ??= ''
  DETAILS['ST-16'] = [DETAILS['ST-16a'], DETAILS['ST-16b']].filter(Boolean).join(' ; ')
  DETAILS['ST-3'] = 'colonnes : barre 80 px (36 + 44) en haut, équipage au-dessus d’Attention dans 300 px à gauche, Commandement au-dessus du journal dans 340 px à droite, carte en plein cadre sous les colonnes, sans backdrop-filter, bandeau de 44 px en bas ; 1280×800 : 280 et 320 px ; flottante : Attention à droite sous la barre, Commandement fermé, ⚑ l’ouvre'
  DETAILS['ST-4'] = `ENCAISSÉ, DÉPENSÉ, MARGE · MOIS = ${euros(T.tire.net)}, ${euros(T.tire.depenses)}, ${euros(T.tire.marge)} (tirés) ; compteurs dans l’ordre servi, muets sans chiffre ; AUTO ${b.auto.actif ? 'vert' : 'éteint'} comme servi ; cloche, JOUR, lune, version (absente du HTML sans session), santé, heure de Paris ; trésorerie en panne → « — » et la panne ; santé en manque → « — » ; hors périmètre → « — · hors périmètre »`
  DETAILS['ST-7'] = 'objectif « PAR LE CHEF », missions au texte servi, LV. et dernier succès, compte rendu de 1 à 3 lignes'
  DETAILS['ST-11'] = 'jetons --mc- déclarés sur .mc dans station.css seulement ; aucune couleur hexadécimale ajoutée hors de station.css et moteur/ ; globals.css et base.css inchangés ; gardes prefers-reduced-motion ; réglage de néon posé sur .mc seulement ; --accent #D97757 sur /controle?onglet=aujourdhui'
  DETAILS['ST-13'] = `chaque lien de la station en /controle…, /controle/station… ou /parametres ; aucun « Envoyer », « Copier », « Relayer »`
  DETAILS['ST-18'] = 'liste des salles : les 20 clés de SALLES avec leur plaque, ≥ 44 px, E-commerce réservée désactivée, un appui pose ?salle= sans changer de page ; <Carte carte={…}> tel quel ; Vues.tsx et Habillage.tsx ; aucune vue sans ?vue= ; carte montée après le premier 200 (retard de 2 s) ; sans session → /login ; aucun phaser demandé'
  DETAILS['ST-19'] = `chaque [data-modele] visible porte le modèle servi (dont « sans IA ») ; Equipage.tsx n’écrit aucun modèle`

  // ── outils locaux ─────────────────────────────────────────────────────────────────────────────────────────────────────
  function cheminCapture(nom) { return x.cheminCapture(nom) }
  function autresParties(c) { return x.autresParties(c) }
  function SERVEUR_REQUETES(s) { return s.mode === 'banc' ? s.banc.requetes.map((r) => r.chemin) : [] }
  async function demarrerBaisse(xx) { return xx.demarrerBaisse() }
}
