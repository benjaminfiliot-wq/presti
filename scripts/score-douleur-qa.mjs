#!/usr/bin/env node
// scripts/score-douleur-qa.mjs — le juge du score de douleur B2B (07/10/2026) : lib/agents/acquisition/scoreDouleur.ts,
// son branchement dans le recenseur, la passe scripts/score-douleur-passe.mjs et les migrations 0135-0136.
//
//   node --import ./scripts/ts-loader.mjs scripts/score-douleur-qa.mjs [--racine=<dossier>]
//   node --import ./scripts/ts-loader.mjs scripts/score-douleur-qa.mjs --auto-controle
//        le juge éprouvé sur lui-même : chaque sabotage (copie modifiée du module ou de la migration, sous
//        .orchestre/travail/score-douleur-qa/) doit rendre ROUGE le critère qu'il vise ; le dépôt, lui, doit être vert.
//   node --import ./scripts/ts-loader.mjs scripts/score-douleur-qa.mjs --reel
//        en plus : lit acq_prospects_a_noter (.env.local chargé sans rien afficher) et vérifie que chaque prospect en file
//        porte un score noté et un détail fait de codes et de nombres seulement. Lecture seule.
//
// Critères :
//   SD-1  le module s'importe : scoreDouleur, compterAvis, detailStockable, formulaireCasse, POIDS, VERSION_SCORE.
//   SD-2  barème : chaque signal seul donne son poids ; site non lu → pas de « formulaire absent » ; plafonds ; 0 à 100.
//   SD-3  monotonie : ajouter un signal ne baisse jamais le score (toutes les combinaisons des signaux de site) ; déterminisme.
//   SD-4  aucune donnée personnelle : detailStockable ne rend que version/code/poids/n ; compterAvis ne rend que des nombres,
//         compte juste sur des avis d'essai et ne laisse rien passer des textes (noms, adresses).
//   SD-5  branchement : le recenseur pose score_douleur et score_douleur_detail dans son patch ; la passe convertit une
//         ligne de base (site lu ou non) comme il faut.
//   SD-6  migrations : 0135 (colonnes bornées, détail sans « @ », files par score décroissant, droits service_role seuls)
//         et 0136 (lecture sans nom ni canal, service_role seul).
// Codes : 0 tout est vert · 1 un critère est rouge · 2 appel invalide.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { R, LOADER, lireOptions, creerSortie, premiereLigne, sansCommentaires } from './fixtures/026-acquisition/commun.mjs'
import { sansCommentaires as sqlNu } from './sql-nu.mjs'

const JUGE = 'score-douleur-qa'
const o = lireOptions(process.argv.slice(2), { drapeauxConnus: ['reel'] })
if (o.inconnues.length || o.positionnels.length) { console.log(`${JUGE} : appel refusé — option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`); process.exit(2) }
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const MODULE = 'lib/agents/acquisition/scoreDouleur.ts'
const RECENSEUR = 'lib/agents/acquisition/recenseur.ts'
const PASSE = 'scripts/score-douleur-passe.mjs'
const M135 = 'supabase/migrations/0135_score_douleur.sql'
const M136 = 'supabase/migrations/0136_prospects_a_noter.sql'
const CODES = ['pas_de_site', 'site_obsolete', 'site_sans_https', 'site_pas_mobile', 'formulaire_absent', 'formulaire_casse', 'avis_devis_sans_reponse', 'avis_injoignable', 'avis_sans_reponse', 'nos_messages_sans_reponse']

// ── Les critères, appliqués à une racine (le dépôt ou une copie sabotée) ─────────────────────────────────────────────────
async function juger(racine, s) {
  const lire = (rel) => { try { return fs.readFileSync(path.join(racine, rel), 'utf8') } catch { return null } }
  let M = null
  try { M = await import(`${pathToFileURL(path.join(racine, MODULE)).href}?t=${Date.now()}${Math.random()}`) } catch (e) { s.echoue('SD-1', `${MODULE} ne s'importe pas : ${premiereLigne(e)}`) }
  if (M) {
    const manque = ['scoreDouleur', 'compterAvis', 'detailStockable', 'formulaireCasse'].filter((n) => typeof M[n] !== 'function')
    if (!M.POIDS || typeof M.POIDS !== 'object') manque.push('POIDS')
    if (typeof M.VERSION_SCORE !== 'string') manque.push('VERSION_SCORE')
    s.juger('SD-1', manque.map((n) => `${n} absent`), `${MODULE} : 4 fonctions, POIDS et VERSION_SCORE (${M.VERSION_SCORE}) exportés`)
  }
  if (!M || s.enEchec('SD-1')) { s.nonJuges(['SD-2', 'SD-3', 'SD-4'], 'SD-1 en échec') } else {
    const sc = (e) => M.scoreDouleur(e)
    const codes = (e) => sc(e).signaux.map((x) => x.code).sort()
    const FORM = { url_page: 'https://x.invalid/contact', url_action: 'https://x.invalid/envoi', champs: [{ nom: 'message' }] }
    const SITE = { domaine: 'x.invalid', faits: [{ type: 'site_titre' }], formulaire: FORM, site_lu: true }
    // SD-2 : le barème
    const e2 = []
    const attendu = (nom, e, score, cs) => { const r = sc(e); if (r.score !== score) e2.push(`${nom} : score ${r.score}, ${score} attendu`); if (cs && JSON.stringify(codes(e)) !== JSON.stringify([...cs].sort())) e2.push(`${nom} : signaux ${JSON.stringify(codes(e))}, ${JSON.stringify(cs)} attendus`) }
    attendu('rien de connu (site lu, formulaire sain)', SITE, 0, [])
    attendu('pas de site', { domaine: null }, 35, ['pas_de_site'])
    attendu('domaine vide', { domaine: '  ' }, 35, ['pas_de_site'])
    attendu('copyright ancien', { ...SITE, faits: [{ type: 'site_titre' }, { type: 'site_copyright' }] }, 20, ['site_obsolete'])
    attendu('pas mobile', { ...SITE, faits: [{ type: 'site_mobile' }] }, 15, ['site_pas_mobile'])
    attendu('sans https', { ...SITE, faits: [{ type: 'site_http' }] }, 10, ['site_sans_https'])
    attendu('trois défauts de site', { ...SITE, faits: [{ type: 'site_http' }, { type: 'site_mobile' }, { type: 'site_copyright' }] }, 45)
    attendu('site lu sans formulaire', { domaine: 'x.invalid', faits: [{ type: 'site_titre' }], formulaire: null, site_lu: true }, 15, ['formulaire_absent'])
    attendu('verdict sans_formulaire', { ...SITE, verdict_formulaire: { eligible: false, raison: 'sans_formulaire' } }, 15, ['formulaire_absent'])
    attendu('site NON lu sans formulaire (on ne sait pas)', { domaine: 'x.invalid', faits: [], formulaire: null }, 0, [])
    attendu('formulaire à action « # »', { ...SITE, formulaire: { ...FORM, url_action: '#' } }, 15, ['formulaire_casse'])
    attendu('page du formulaire en 404', { ...SITE, pages: [{ url: FORM.url_page, statut: 404 }] }, 15, ['formulaire_casse'])
    attendu('avis : 1 devis sans réponse', { ...SITE, avis: { total: 10, devis_sans_reponse: 1, injoignable: 0, sans_reponse: 0 } }, 10)
    attendu('avis : 5 devis sans réponse (plafond 25)', { ...SITE, avis: { total: 10, devis_sans_reponse: 5, injoignable: 0, sans_reponse: 0 } }, 25)
    attendu('avis : plus de plaintes que d\'avis (borné au total)', { ...SITE, avis: { total: 1, devis_sans_reponse: 9, injoignable: 0, sans_reponse: 0 } }, 10)
    attendu('avis : total nul ignoré', { ...SITE, avis: { total: 0, devis_sans_reponse: 3, injoignable: 3, sans_reponse: 3 } }, 0)
    attendu('nos messages sans réponse (plafond 5)', { ...SITE, messages_sans_reponse: 4 }, 5)
    const tout = sc({ domaine: null, avis: { total: 50, devis_sans_reponse: 50, injoignable: 50, sans_reponse: 50 }, messages_sans_reponse: 9 })
    if (tout.score !== 100) e2.push(`tous les signaux : score ${tout.score}, plafonné à 100 attendu`)
    for (const v of [{}, { domaine: 'x' }, { avis: { total: -3, devis_sans_reponse: -1, injoignable: NaN, sans_reponse: 'x' } }]) { const r = sc(v); if (!Number.isInteger(r.score) || r.score < 0 || r.score > 100) e2.push(`entrée ${JSON.stringify(v)} : score ${r.score} hors de 0..100`) }
    s.juger('SD-2', e2, '17 cas du barème justes (pas de site 35, copyright 20, mobile 15, https 10, formulaire absent/cassé 15, avis plafonnés et bornés, site non lu sans faux signal), plafond 100')
    // SD-3 : monotonie et déterminisme
    const e3 = []
    const types = ['site_copyright', 'site_mobile', 'site_http']
    const variantes = []
    for (let m = 0; m < 8; m++) for (const formulaire of [FORM, null, { ...FORM, url_action: '' }]) variantes.push({ domaine: 'x.invalid', faits: [{ type: 'site_titre' }, ...types.filter((_, i) => m & (1 << i)).map((type) => ({ type }))], formulaire, site_lu: true })
    for (const a of variantes) for (const b of variantes) {
      const inclus = a.faits.every((f) => b.faits.some((g) => g.type === f.type)) && (a.formulaire === b.formulaire || (a.formulaire === FORM))
      if (inclus && sc(b).score < sc(a).score) e3.push(`ajouter des signaux baisse le score : ${JSON.stringify(a.faits.map((f) => f.type))} → ${JSON.stringify(b.faits.map((f) => f.type))}`)
    }
    for (const v of variantes) if (JSON.stringify(sc(v)) !== JSON.stringify(sc(JSON.parse(JSON.stringify(v))))) e3.push('deux appels sur la même entrée diffèrent')
    const sansSite = sc({ domaine: null }).score, avecSiteSain = sc(SITE).score
    if (!(sansSite > avecSiteSain)) e3.push(`une entreprise sans site (${sansSite}) ne passe pas avant une entreprise au site sain (${avecSiteSain})`)
    s.juger('SD-3', e3, `${variantes.length} variantes de site croisées : jamais de baisse en ajoutant un signal ; même entrée → même score ; sans site > site sain`)
    // SD-4 : aucune donnée personnelle
    const e4 = []
    const PIEGE = 'Jean Témoin jean.temoin@exemple.invalid 06 12 34 56 78'
    const r4 = sc({ domaine: null, faits: [{ type: 'site_copyright', extrait: PIEGE }], avis: { total: 2, devis_sans_reponse: 1, injoignable: 1, sans_reponse: 0 }, messages_sans_reponse: 1 })
    const d4 = M.detailStockable(r4)
    const json4 = JSON.stringify(d4)
    if (/Jean|temoin|@|06 12/i.test(json4)) e4.push(`le détail stocké laisse passer un texte d'entrée : ${json4.slice(0, 160)}`)
    const cles = new Set(); const parcourir = (x) => { if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) { cles.add(k); parcourir(v) } }; parcourir(d4)
    const horsListe = [...cles].filter((k) => !['version', 'signaux', 'code', 'poids', 'n', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(k))
    if (horsListe.length) e4.push(`clés inattendues dans le détail : ${horsListe.join(', ')}`)
    for (const x of d4.signaux ?? []) { if (!CODES.includes(x.code)) e4.push(`code inconnu dans le détail : ${x.code}`); if (typeof x.poids !== 'number') e4.push('poids non numérique') }
    if (octets(json4) > 2000) e4.push(`détail de ${octets(json4)} octets (2 000 au plus, contrainte de 0135)`)
    const avis = [
      'Devis jamais reçu malgré trois relances, dommage.',
      "Impossible de les joindre, ça tombe toujours sur la messagerie et personne ne rappelle.",
      "Aucune réponse à mon message depuis deux semaines. Signé Jean Témoin, jean.temoin@exemple.invalid",
      'Très bon travail, équipe ponctuelle, je recommande.',
      "J'attends toujours le devis promis.",
      '',
    ]
    const c4 = M.compterAvis(avis)
    const attenduAvis = { total: 5, devis_sans_reponse: 2, injoignable: 1, sans_reponse: 1 }
    for (const [k, v] of Object.entries(attenduAvis)) if (c4[k] !== v) e4.push(`compterAvis.${k} = ${c4[k]}, ${v} attendu`)
    if (Object.values(c4).some((v) => typeof v !== 'number')) e4.push(`compterAvis rend autre chose que des nombres : ${JSON.stringify(c4)}`)
    if (/Jean|@/.test(JSON.stringify(c4))) e4.push('compterAvis laisse passer un texte d\'avis')
    s.juger('SD-4', e4, `détail stocké = version + {code, poids, n} (${octets(json4)} octets, aucun texte d'entrée) ; compterAvis ${JSON.stringify(c4)} sur 6 avis d'essai, nombres seulement`)
  }
  // SD-5 : branchement recenseur et passe
  {
    const e5 = []
    const rec = lire(RECENSEUR)
    if (!rec) e5.push(`${RECENSEUR} absent`)
    else {
      const nu = sansCommentaires(rec)
      if (!/from\s+['"]\.\/scoreDouleur['"]/.test(nu)) e5.push('le recenseur n\'importe pas ./scoreDouleur')
      if (!/score_douleur\s*:/.test(nu) || !/score_douleur_detail\s*:\s*detailStockable\(/.test(nu)) e5.push('le patch du recenseur ne pose pas score_douleur et score_douleur_detail (detailStockable)')
      if (!/scoreDouleur\(\s*\{[^}]*site_lu/.test(nu)) e5.push('le recenseur n\'indique pas si le site a été lu (site_lu)')
    }
    try {
      const P = await import(`${pathToFileURL(path.join(racine, PASSE)).href}?t=${Date.now()}`)
      const lu = P.entreeDepuisLigne({ id: 'x', domaine: 'x.invalid', faits: [{ type: 'site_titre' }], formulaire: null, messages_sans_reponse: 2 })
      const nonLu = P.entreeDepuisLigne({ id: 'y', domaine: 'y.invalid', faits: [{ type: 'pub_meta' }], formulaire: null })
      if (lu.site_lu !== true) e5.push('la passe ne reconnaît pas un site lu (fait site_titre)')
      if (nonLu.site_lu !== false) e5.push('la passe prend un prospect Meta sans lecture de site pour un site lu')
      if (lu.messages_sans_reponse !== 2) e5.push('la passe perd le nombre de messages sans réponse')
      const src = sansCommentaires(lire(PASSE) ?? '')
      if (/console\.(log|error)\([^)]*\b(l|ligne)\.(domaine|id|faits)\b/.test(src)) e5.push('la passe affiche un domaine, un id ou des faits de prospect')
    } catch (e) { e5.push(`${PASSE} ne s'importe pas : ${premiereLigne(e)}`) }
    s.juger('SD-5', e5, 'recenseur : import, patch score_douleur + detailStockable, site_lu ; passe : site lu reconnu, prospect Meta non lu, messages sans réponse gardés, aucune donnée de prospect affichée')
  }
  // SD-6 : migrations
  {
    const e6 = []
    const a = lire(M135), b = lire(M136)
    if (!a) e6.push(`${M135} absent`)
    else {
      const n = sqlNu(a).replace(/\s+/g, ' ').toLowerCase()
      if (!/score_douleur between 0 and 100/.test(n)) e6.push('0135 : score_douleur non borné à 0..100')
      if (!/position\('@' in score_douleur_detail::text\) = 0/.test(n)) e6.push('0135 : le détail n\'interdit pas « @ »')
      if (!/octet_length\(score_douleur_detail::text\) <= 2000/.test(n)) e6.push('0135 : le détail n\'est pas borné en taille')
      const reserver = /function public\.acq_reserver[\s\S]*?\$function\$;/.exec(n)?.[0] ?? ''
      if (!/order by score_douleur desc nulls last, maj_le, id/.test(reserver)) e6.push('0135 : acq_reserver ne passe pas par score décroissant')
      if (!/for update skip locked/.test(reserver) || !/tentatives >= 2/.test(reserver)) e6.push('0135 : acq_reserver perd son verrou ou sa règle des trois tentatives')
      const pc = /function public\.acq_prospects_pour_premier_contact[\s\S]*?\$function\$;/.exec(n)?.[0] ?? ''
      if ((pc.match(/order by rang, p\.score_douleur desc nulls last, p\.maj_le limit/g) ?? []).length !== 2) e6.push('0135 : acq_prospects_pour_premier_contact ne trie pas par score avant la limite (deux branches)')
      for (const f of ['acq_prospect_mettre_a_jour', 'acq_score_douleur_poser', 'acq_reserver', 'acq_prospects_pour_premier_contact']) {
        if (!new RegExp(`revoke all on function public\\.${f}\\([^)]*\\) from public, anon, authenticated`).test(n)) e6.push(`0135 : ${f} sans revoke anon/authenticated`)
        if (!new RegExp(`grant execute on function public\\.${f}\\([^)]*\\) to service_role`).test(n)) e6.push(`0135 : ${f} sans grant service_role`)
      }
      if (/grant[^;]*to (anon|authenticated)/.test(n)) e6.push('0135 : un droit donné à anon ou authenticated')
    }
    if (!b) e6.push(`${M136} absent`)
    else {
      const n = sqlNu(b).replace(/\s+/g, ' ').toLowerCase()
      const sel = /select p\.id,([^]*?) from ops\.prospects p/.exec(n)?.[1] ?? ''
      for (const interdit of ['entreprise', 'commune', 'canaux', 'siren', 'instagram', 'page_meta', 'texte', 'destinataire']) if (new RegExp(`\\bp\\.${interdit}\\b`).test(sel)) e6.push(`0136 : la lecture rend ${interdit}`)
      if (!/revoke all on function public\.acq_prospects_a_noter\(integer\) from public, anon, authenticated/.test(n) || !/grant execute on function public\.acq_prospects_a_noter\(integer\) to service_role/.test(n)) e6.push('0136 : droits non réservés à service_role')
    }
    s.juger('SD-6', e6, '0135 : score borné, détail sans « @ » et ≤ 2 000 octets, files par score décroissant (verrou et 3 tentatives gardés), droits service_role seuls ; 0136 : ni nom, ni commune, ni canal')
  }
}
const octets = (t) => Buffer.byteLength(String(t), 'utf8')

// ── --reel : la base, en lecture ──────────────────────────────────────────────────────────────────────────────────────
async function jugerReel(s) {
  const { lireEnvLocal } = await import(pathToFileURL(path.join(R, 'scripts', 'lib', 'sql-essai.mjs')).href)
  lireEnvLocal(R)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) { s.echoue('SD-R', 'clés Supabase absentes de .env.local'); return }
  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/acq_prospects_a_noter`, { method: 'POST', headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ p_limite: 500 }) })
  if (!r.ok) { s.echoue('SD-R', `acq_prospects_a_noter : HTTP ${r.status}`); return }
  const lignes = await r.json()
  const anon = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/acq_prospects_a_noter`, { method: 'POST', headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', 'content-type': 'application/json' }, body: '{"p_limite":1}' })
  const e = []
  if (anon.ok) e.push('acq_prospects_a_noter répond à la clé anon')
  const nonNotes = lignes.filter((l) => l.score_douleur === null || l.score_douleur === undefined).length
  if (nonNotes) e.push(`${nonNotes} prospect(s) en file sans score (lancer scripts/score-douleur-passe.mjs --ecrire)`)
  s.juger('SD-R', e, `${lignes.length} prospect(s) en file, tous notés ; clé anon refusée (HTTP ${anon.status})`)
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const IDS = ['SD-1', 'SD-2', 'SD-3', 'SD-4', 'SD-5', 'SD-6']
if (o.autoControle) {
  const s = creerSortie(`${JUGE} --auto-controle`, [], `${JUGE} --auto-controle — chaque sabotage doit rougir son critère`)
  const TRAV = path.join(R, '.orchestre', 'travail', 'score-douleur-qa')
  const copier = (dest) => {
    for (const rel of [MODULE, 'lib/agents/acquisition/plaintes.ts', RECENSEUR, PASSE, M135, M136, 'scripts/lib/sql-essai.mjs', 'scripts/sql-nu.mjs']) {
      const src = path.join(R, rel); if (!fs.existsSync(src)) continue
      fs.mkdirSync(path.dirname(path.join(dest, rel)), { recursive: true }); fs.copyFileSync(src, path.join(dest, rel))
    }
  }
  const muet = () => { const ids = []; return { ids, sortie: { passe: () => {}, echoue: (id) => ids.push(id), juger: (id, e) => { if (e.length) ids.push(id) }, nonJuges: (l) => ids.push(...l), enEchec: (id) => ids.includes(id) } } }
  // Le dépôt d'abord : tout vert.
  { const m = muet(); await juger(R, m.sortie); s.juger('AC-0', m.ids.map((id) => `${id} rouge sur le dépôt`), 'le dépôt rend SD-1 à SD-6 verts') }
  const SABOTAGES = [
    ['AC-1', 'SD-1', 'export retiré', MODULE, (t) => t.replace('export function compterAvis', 'function compterAvis')],
    ['AC-2', 'SD-2', 'plus de « pas de site »', MODULE, (t) => t.replace("if (!domaine) ajouter('pas_de_site')", 'if (!domaine) { /* rien */ }')],
    ['AC-3', 'SD-2', 'plafond 100 retiré', MODULE, (t) => t.replace('Math.max(0, Math.min(100, signaux.reduce((s, x) => s + x.poids, 0)))', 'signaux.reduce((s, x) => s + x.poids, 0)')],
    ['AC-4', 'SD-2', '« formulaire absent » même sans lecture du site', MODULE, (t) => t.replace('if (lu) {', 'if (true) {')],
    ['AC-5', 'SD-3', 'un signal qui retire des points', MODULE, (t) => t.replace("site_sans_https: { theme: 'site_absent', parUnite: 10, max: 10 }", "site_sans_https: { theme: 'site_absent', parUnite: -30, max: -30 }")],
    ['AC-6', 'SD-4', 'le détail stocké garde l\'extrait', MODULE, (t) => t.replace('return { version: s.version, signaux:', "return { version: s.version, note: 'Jean Témoin', signaux:")],
    ['AC-7', 'SD-4', 'compterAvis compte mal les devis', MODULE, (t) => t.replace('r.devis_sans_reponse++', 'r.injoignable += 0')],
    ['AC-8', 'SD-5', 'le recenseur ne pose plus le score', RECENSEUR, (t) => t.replace('score_douleur_detail: detailStockable(douleur),', '')],
    ['AC-9', 'SD-5', 'la passe prend tout domaine pour un site lu', PASSE, (t) => t.replace("site_lu: !!l?.formulaire || faits.some((f) => typeof f?.type === 'string' && f.type.startsWith('site_')),", 'site_lu: true,')],
    ['AC-10', 'SD-6', 'file du recenseur par score croissant', M135, (t) => t.replace('order by score_douleur desc nulls last, maj_le, id', 'order by score_douleur asc nulls last, maj_le, id')],
    ['AC-11', 'SD-6', 'détail sans garde « @ »', M135, (t) => t.replace(" and position('@' in score_douleur_detail::text) = 0", '')],
    ['AC-12', 'SD-6', 'la lecture de 0136 rend le nom', M136, (t) => t.replace('select p.id, p.etape,', 'select p.id, p.entreprise, p.etape,')],
    ['AC-13', 'SD-6', 'droit donné à anon', M135, (t) => t + '\ngrant execute on function public.acq_score_douleur_poser(uuid, integer, jsonb) to anon;\n'],
  ]
  for (const [ac, vise, nom, rel, muter] of SABOTAGES) {
    const dest = path.join(TRAV, ac)
    fs.rmSync(dest, { recursive: true, force: true }); copier(dest)
    const f = path.join(dest, rel), avant = fs.readFileSync(f, 'utf8'), apres = muter(avant)
    if (apres === avant) { s.echoue(ac, `sabotage « ${nom} » sans effet sur ${rel} (le motif a changé)`); continue }
    fs.writeFileSync(f, apres)
    const m = muet(); await juger(dest, m.sortie)
    s.juger(ac, m.ids.includes(vise) ? [] : [`sabotage « ${nom} » : ${vise} reste vert (rouges : ${m.ids.join(', ') || 'aucun'})`], `« ${nom} » → ${vise} rouge`)
  }
  process.exitCode = s.finir()
} else {
  const s = creerSortie(`${JUGE}${o.drapeaux.has('reel') ? ' --reel' : ''}`, [...IDS, ...(o.drapeaux.has('reel') ? ['SD-R'] : [])], `${JUGE} — racine ${path.relative(R, o.racine) || '.'}`)
  await juger(o.racine, s)
  if (o.drapeaux.has('reel')) await jugerReel(s)
  process.exitCode = s.finir()
}
