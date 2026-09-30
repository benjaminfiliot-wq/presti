// scripts/fixtures/026-pilotage/t/controles-b.mjs — le contrôle « JA-3 » du lot t, partie B (fiche 026-171, écrit par Claude Code) : les jeux
// d'essai de station-reglages-qa et de poste-extraction-qa se contrôlent eux-mêmes. Un jeu d'essai faux ferait rougir (ou verdir) un juge
// pour une mauvaise raison ; ce contrôle attrape le jeu, pas la route.
//   fonction(ctx) → { echecs, detail }
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const T = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const lire = (rel) => JSON.parse(fs.readFileSync(path.join(T, rel), 'utf8'))

export async function controleJeuxB() {
  const e = []
  const d = []
  // ── Les jeux des réglages (écrits par la partie A du lot t, lus ici par le juge des réglages) ─────────────────────────────
  try {
    const valides = lire('reglages-valides.json'), pieges = lire('reglages-pieges.json')
    if (!Array.isArray(valides.cas) || valides.cas.length < 3) e.push('reglages-valides.json : au moins trois cas valides attendus')
    if (!Array.isArray(pieges.pieges) || pieges.pieges.length < 10) e.push('reglages-pieges.json : au moins dix pièges attendus')
    const noms = new Set()
    for (const p of pieges.pieges ?? []) {
      if (typeof p.nom !== 'string' || noms.has(p.nom)) e.push(`reglages-pieges.json : nom absent ou en double (${p.nom})`)
      noms.add(p.nom)
      if (!('brut' in p)) e.push(`reglages-pieges.json : « ${p.nom} » sans brut`)
      if (p.raison !== undefined) { try { new RegExp(p.raison, 'i') } catch { e.push(`reglages-pieges.json : « ${p.nom} » : raison n'est pas une expression régulière`) } }
    }
    for (const attendu of ['65-ko', 'cle-inconnue', 'couleur-red', 'nom-de-17-signes', 'plaque-de-25-signes', 'texte-html-dans-un-nom', 'surcharge-de-root']) if (!noms.has(attendu)) e.push(`reglages-pieges.json : le piège « ${attendu} » de la fiche manque`)
    d.push(`${valides.cas?.length ?? 0} cas valides, ${pieges.pieges?.length ?? 0} pièges de réglages`)
  } catch (err) { e.push(`jeux de réglages illisibles : ${String(err.message).split('\n')[0]}`) }

  // ── Les cas de l'extraction ────────────────────────────────────────────────────────────────────────────────────────────────
  try {
    const { ROUTES, CAS } = await import(pathToFileURL(path.join(T, 'extraction', 'cas.mjs')).href)
    const { baseExtraction, TICKETS, ARTISANS } = await import(pathToFileURL(path.join(T, 'extraction', 'base.mjs')).href)
    const noms = new Set()
    for (const c of CAS) {
      if (noms.has(c.nom)) e.push(`cas en double : ${c.nom}`)
      noms.add(c.nom)
      if (!ROUTES.includes(c.route)) e.push(`cas « ${c.nom} » : route inconnue ${c.route}`)
      if (!['fondateur', 'lecture', 'partenaire', 'sans_jeton', 'artisan'].includes(c.compte)) e.push(`cas « ${c.nom} » : compte inconnu ${c.compte}`)
      if (!c.chemin.startsWith(`/api/controle/${c.route}`)) e.push(`cas « ${c.nom} » : le chemin ne va pas à la route ${c.route}`)
    }
    for (const r of ROUTES) for (const compte of ['fondateur', 'sans_jeton']) if (!CAS.some((c) => c.route === r && c.compte === compte)) e.push(`aucun cas « ${compte} » pour ${r}`)
    for (const r of ['barre', 'etat', 'audience', 'securite/bans', 'clients', 'cerveaux']) if (CAS.filter((c) => c.route === r).length < 4) e.push(`moins de quatre cas pour ${r}`)
    // La base d'essai : des lignes fictives, des pièges en place, un compte des ouverts qui se recalcule.
    const b = baseExtraction()
    if (b.table('artisans').length !== ARTISANS.length) e.push('base d’essai : les artisans ne sortent pas')
    if (ARTISANS.some((a) => !/@(exemple|presti-test)\.invalid$/.test(a.email))) e.push('base d’essai : une adresse qui n’est pas en .invalid (aucune donnée réelle)')
    if (TICKETS.ouverts < 1) e.push('tickets d’essai : aucun ticket ouvert')
    if (TICKETS.ouverts !== TICKETS.lignes.filter((l) => l.ferme_le === null).length) e.push('tickets d’essai : le compte des ouverts n’est pas celui des lignes dont ferme_le est nul')
    if (!TICKETS.pieges.length || TICKETS.lignes.some((l) => !/PIEGE-TICKET/.test(JSON.stringify(l)))) e.push('tickets d’essai : chaque ligne doit porter un piège de contenu (PIEGE-TICKET)')
    if (b.table('tickets').length !== TICKETS.lignes.length) e.push('base d’essai : les tickets ne sortent pas')
    const panne = baseExtraction({ pannes: ['table:leads', 'rpc:audience_direct'] })
    if (!(panne.table('leads') instanceof Error) || !(panne.rpc('audience_direct') instanceof Error)) e.push('base d’essai : une panne déclarée ne rend pas d’erreur')
    for (const dossier of ['cwd-avec/lib/ai/cerveaux', 'cwd-vide']) if (!fs.existsSync(path.join(T, 'extraction', dossier))) e.push(`extraction/${dossier} absent`)
    d.push(`${CAS.length} cas d’extraction sur ${ROUTES.length} routes, ${ARTISANS.length} artisans fictifs, ${TICKETS.lignes.length} tickets piégés (${TICKETS.ouverts} ouverts)`)
  } catch (err) { e.push(`jeux d’extraction illisibles : ${String(err.stack ?? err.message).split('\n').slice(0, 2).join(' | ')}`) }

  // ── Le témoin : aucun fichier vide, chaque fichier suffixé, les routes réécrites du lot présentes ───────────────────────
  const temoin = path.join(T, 'temoin')
  const attendus = ['app/api/controle/station/reglages/route.ts', 'app/api/controle/barre/route.ts', 'app/api/controle/etat/route.ts', 'app/api/controle/audience/route.ts', 'app/api/controle/securite/bans/route.ts', 'app/api/controle/clients/route.ts', 'app/api/controle/cerveaux/route.ts', 'lib/direction/journal.ts', ...['index', 'sante', 'crons', 'audience', 'bans', 'clients', 'cerveaux', 'tickets'].map((n) => `lib/controle/lectures/${n}.ts`)]
  for (const rel of attendus) {
    const f = path.join(temoin, `${rel}.temoin`)
    if (!fs.existsSync(f)) e.push(`témoin : ${rel}.temoin absent`)
    else if (fs.statSync(f).size === 0) e.push(`témoin : ${rel}.temoin vide`)
  }
  d.push(`${attendus.length} fichiers du témoin de la partie B présents`)
  return { echecs: e, detail: d.join(' ; ') }
}
