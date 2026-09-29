#!/usr/bin/env node
// scripts/pack-pub-livraison-qa.mjs — le juge de la livraison du pack pubs (fiches 026-157 « depot », 026-137
// « route », 026-147 « poste », 026-149 « purge »), écrit par Claude Code AVANT ce qu'il juge (fiche 026-110,
// « Ce qu'il faut faire », point 2). Contrat : scripts/fixtures/026-pubs-contenu/contrat-pack.json ; jeux d'essai :
// scripts/fixtures/026-pubs-contenu/livraison/{dossier-casse,fabrication-temoin,lignes,purge}/.
//
// --partie=depot (LV-1, LV-2, LV-10, LV-11) : scripts/pack-pub/deposer.mjs et scripts/pack-pub/exporter.mjs sont
// LANCÉS en sous-processus (jamais de réseau : --a-sec pour l'un, --depuis-fichier= pour l'autre). --partie=route
// (LV-3 à LV-6, LV-15) : lib/packPubLivraison.ts est APPELÉE pour de vrai (ts-loader) ; le reste, lecture statique.
// --partie=poste (LV-7 à LV-9) et --partie=purge (LV-12 à LV-14, lib/packPubPurge.ts APPELÉE pour de vrai) : idem.
//
// Le contrat fixé ici pour les fiches à venir :
//   scripts/pack-pub/deposer.mjs  <pack_id> <dossier_fabrique> [--a-sec]           codes 0/1/2 (voir LV-1)
//   scripts/pack-pub/exporter.mjs <pack_id> <dossier_sortie> --depuis-fichier=<f>  codes 0/1/4 (voir LV-10)
//   lib/packPubLivraison.ts       export const DUREE_LIEN_S ; export function courrielLivraison({ nom, liens,
//                                 expireLe, voixSynthese }): string (pure)
//   lib/packPubPurge.ts           export function packsAPurger(lignes, maintenant): (pure) · export async function
//                                 purgerPacksExpires()
//
// Critères depot : LV-1 deposer.mjs (comportement) · LV-2 deposer.mjs (bucket, marge, transition) · LV-10
// exporter.mjs --depuis-fichier · LV-11 exporter.mjs (.env.local, lecture seule).
// Critères route : LV-3 lib/packPubLivraison.ts (courrielLivraison, fonctions pures) · LV-4 journal.ts + la route
// POST /api/controle/packs/[id] · LV-5 GET /api/controle/packs · LV-6 npm run typecheck · LV-15 non-régression
// (ajouté par 026-110, point 4 : app/controle/Sites.tsx, app/api/controle/sites/[id]/route.ts, lib/direction/
// garde.ts, lib/direction/reconfirmation.ts, lib/direction/journal.ts identique hors pack_livre/pack_refaire).
// Critères poste : LV-7 app/controle/Packs.tsx · LV-8 app/controle/page.tsx (onglet packs) · LV-9 typecheck.
// Critères purge : LV-12 packsAPurger (fonction pure) · LV-13 purgerPacksExpires + le cron · LV-14 typecheck.
//
// Usage :
//   node scripts/pack-pub-livraison-qa.mjs --partie=depot|route|poste|purge [--racine=<dossier>]
//   node scripts/pack-pub-livraison-qa.mjs --partie=… --temoin   route : LV-15 seul (non-régression) ; les trois
//                                                                 autres parties : rien à prouver tant que rien
//                                                                 n'est encore construit (comme pack-pub-paiement-
//                                                                 qa.mjs --partie=route, 026-118)
// Codes : 0 vert · 1 un critère rouge · 2 appel invalide. N'écrit que sous .orchestre/travail/pack-pub-livraison-qa/.
// Aucun secret lu ni affiché ; aucun accès réseau.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { R, lireOptionsOuQuitter, git, lancer } from './fixtures/025/commun.mjs'
import { creerRapport, dossierTravail, court, lf } from './lib/sql-essai.mjs'

const NOM = 'pack-pub-livraison-qa'
const TS_LOADER = path.join(R, 'scripts', 'ts-loader.mjs')
const FIX = path.join(R, 'scripts', 'fixtures', '026-pubs-contenu', 'livraison')
const FICHE = { depot: '026-157', route: '026-137', poste: '026-147', purge: '026-149' }
const IDS = { depot: ['LV-1', 'LV-2', 'LV-10', 'LV-11'], route: ['LV-3', 'LV-4', 'LV-5', 'LV-6', 'LV-15'], poste: ['LV-7', 'LV-8', 'LV-9'], purge: ['LV-12', 'LV-13', 'LV-14'] }
const MAINTENANT = '2026-09-28T12:00:00.000Z'

const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['partie'] })
const refuser = (m) => { console.error(`✗ ${NOM} : ${m}`); process.exit(2) }
if (o.positionnels.length) refuser(`argument(s) inattendu(s) : ${o.positionnels.join(' ')}`)
const PARTIE = o.valeur('partie')
if (!['depot', 'route', 'poste', 'purge'].includes(PARTIE)) refuser(`--partie=depot|route|poste|purge attendu (reçu : ${PARTIE ?? 'rien'})`)
const racine = o.racine
const ch = (rel) => path.join(racine, rel)
const aff = (p) => String(p).split(path.sep).join('/')
function lireSi(f) { try { const b = fs.readFileSync(f); return b.length ? lf(b.toString('utf8')) : '' } catch { return null } }

// ── Un extracteur de bloc { … } (repris de pack-pub-paiement-qa.mjs / pack-pub-dossier-qa.mjs) ────────────────────
function extraireAccolades(texte, iOuverte) {
  let i = iOuverte, prof = 0
  const n = texte.length
  while (i < n) {
    const c = texte[i]
    if (c === '/' && texte[i + 1] === '/') { const nl = texte.indexOf('\n', i); i = nl < 0 ? n : nl; continue }
    if (c === '/' && texte[i + 1] === '*') { const e = texte.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue }
    if (c === "'" || c === '"') { const q = c; i++; while (i < n && texte[i] !== q) { i += texte[i] === '\\' ? 2 : 1 }; i++; continue }
    if (c === '`') { i++; while (i < n && texte[i] !== '`') { if (texte[i] === '\\') i += 2; else if (texte[i] === '$' && texte[i + 1] === '{') { i += 2; let d = 1; while (i < n && d) { if (texte[i] === '{') d++; else if (texte[i] === '}') d--; i++ } } else i++ }; i++; continue }
    if (c === '{') { prof++; i++; continue }
    if (c === '}') { prof--; i++; if (prof === 0) return texte.slice(iOuverte, i); continue }
    i++
  }
  return null
}
function extraireFonction(texte, nom) {
  const re = new RegExp(`export\\s+(?:async\\s+)?function\\s+${nom}\\b[\\s\\S]*?\\{`)
  const m = re.exec(texte)
  if (!m) return null
  return extraireAccolades(texte, m.index + m[0].length - 1)
}
const diffLignes = (fichier) => {
  const d = git(['diff', '--unified=0', 'HEAD', '--', fichier], { cwd: racine })
  return d.stdout.split(/\r?\n/).filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l))
}

// ── --partie=depot ───────────────────────────────────────────────────────────────────────────────────────────────
function jugerLV1(s) {
  const rel = 'scripts/pack-pub/deposer.mjs'
  const fichier = ch(rel)
  if (!fs.existsSync(fichier)) { s.echoue('LV-1', `${rel} absent`); return }
  const envSansSecret = { NEXT_PUBLIC_SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' }
  const rVide = lancer(process.execPath, [fichier], { cwd: racine, timeout: 90_000, env: envSansSecret })
  if (rVide.code !== 2) s.echoue('LV-1', `sans argument : code ${rVide.code}${rVide.signal ? ` (signal ${rVide.signal})` : ''}, 2 attendu`)

  const dossierCasse = path.join(FIX, 'dossier-casse')
  const rCasse = lancer(process.execPath, [fichier, 'pack-casse-0001', dossierCasse], { cwd: racine, timeout: 4 * 60_000, env: envSansSecret })
  if (rCasse.code !== 1) s.echoue('LV-1', `dossier cassé : code ${rCasse.code}${rCasse.signal ? ` (signal ${rCasse.signal})` : ''}, 1 attendu (refus LOCAL par pub-locale-qa.mjs, avant tout accès réseau) — ${court(rCasse.sortie, 160)}`)
  else if (/variables?\s+(?:manquante|manquantes)|SUPABASE/i.test(rCasse.sortie)) s.echoue('LV-1', "dossier cassé : refusé pour des variables d'environnement manquantes plutôt que pour le contenu — pub-locale-qa.mjs doit être jugé AVANT le réseau")

  const fab = path.join(FIX, 'fabrication-temoin')
  // deposer.mjs juge D'ABORD pour de vrai (pub-locale-qa --partie=complet --dossier=<fab>, vidéos + transcription
  // comprises) avant même --a-sec : sur un témoin complet et conforme (026-110, 28/09), cet appel prend ~100 s à lui
  // seul — 20 s le tuait (SIGTERM) quelle que soit la qualité de l'implémentation jugée. Mesuré une fois, marge large.
  const rSec = lancer(process.execPath, [fichier, 'pack-temoin-0001', fab, '--a-sec'], { cwd: racine, timeout: 12 * 60_000, env: envSansSecret })
  if (rSec.code !== 0) s.echoue('LV-1', `--a-sec sur le témoin de fabrication : code ${rSec.code}${rSec.signal ? ` (signal ${rSec.signal})` : ''}, 0 attendu — ${court(rSec.sortie, 200)}`)
  else {
    const attendus = fs.readdirSync(path.join(fab, 'sortie')).sort()
    const manquants = attendus.filter((f) => !rSec.sortie.includes(f))
    if (manquants.length) s.echoue('LV-1', `--a-sec : fichier(s) de sortie/ absent(s) de la liste : ${manquants.join(', ')}`)
    if (/\bpack\.json\b|\bphotos\/|\bhf\//.test(rSec.sortie)) s.echoue('LV-1', "--a-sec : pack.json, photos/ ou hf/ apparaît dans la liste — seuls les fichiers de sortie/ sont attendus")
  }
  if (!s.enEchec('LV-1')) s.passe('LV-1', "sans argument : code 2 ; dossier cassé : refusé LOCALEMENT (code 1) avant le réseau ; --a-sec : exactement les fichiers présents dans sortie/ (sept, huit avec fiche-10-min.md), rien de pack.json/photos//hf/")
}
function jugerLV2(s) {
  const texte = lireSi(ch('scripts/pack-pub/deposer.mjs'))
  if (texte === null) { s.echoue('LV-2', 'scripts/pack-pub/deposer.mjs absent ou vide'); return }
  if (!/['"]packs-pubs['"]/.test(texte)) s.echoue('LV-2', "bucket 'packs-pubs' absent")
  if (!/storage\/v1\/bucket/.test(texte)) s.echoue('LV-2', 'mesure de tous les buckets absente (storage/v1/bucket, comme scripts/promo-heberger.mjs:56-72)')
  // Les deux seuils doivent être DANS une comparaison en octets (400 * 1048576, 30 * 1048576, ou * 1024 * 1024) : un « 400 » resté
  // dans un message ou un commentaire ne prouve rien (contre-vérification du 29/09 : marge ramenée à 40 Mo, LV-2 restait PASS).
  const MO = '(?:1_?048_?576|1024\\s*\\*\\s*1024)'
  const seuil = (n) => new RegExp(`[<>]=?\\s*${n}\\s*\\*\\s*${MO}|\\b${n}\\s*\\*\\s*${MO}\\s*[<>]=?`).test(texte)
  if (!seuil(400)) s.echoue('LV-2', 'marge de 400 Mo absente : aucune comparaison avec 400 * 1048576 dans le code')
  if (!seuil(30)) s.echoue('LV-2', 'refus au-delà de 30 Mo par pack absent : aucune comparaison avec 30 * 1048576 dans le code')
  if (!/\.eq\(\s*['"]etat['"]\s*,\s*['"]payee['"]\s*\)/.test(texte)) s.echoue('LV-2', "passage d'état .eq('etat', 'payee') absent")
  if (!/['"]fabriquee['"]/.test(texte)) s.echoue('LV-2', "état 'fabriquee' absent")
  for (const champ of ['fabrique_le', 'verifications']) if (!texte.includes(champ)) s.echoue('LV-2', `${champ} absent de la mise à jour`)
  if (!s.enEchec('LV-2')) s.passe('LV-2', 'bucket packs-pubs, marge de 400 Mo mesurée sur tous les buckets, refus au-delà de 30 Mo par pack, payee → fabriquee avec fabrique_le et verifications')
}
function jugerLV10(s) {
  const rel = 'scripts/pack-pub/exporter.mjs'
  const fichier = ch(rel)
  if (!fs.existsSync(fichier)) { s.echoue('LV-10', `${rel} absent`); return }
  const LIGNES = path.join(FIX, 'lignes')
  const dossierSortie = (nom) => { const d = path.join(dossierTravail(NOM, 'exporter'), nom); fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); return d }

  {
    const lignePath = path.join(LIGNES, 'payee-sans-voix.json')
    const j = JSON.parse(fs.readFileSync(lignePath, 'utf8'))
    const dest = dossierSortie('payee-sans-voix')
    const r = lancer(process.execPath, [fichier, j.id, dest, `--depuis-fichier=${lignePath}`], { cwd: racine, timeout: 90_000, env: {} })
    if (r.code !== 0) s.echoue('LV-10', `payee sans voix : code ${r.code}${r.signal ? ` (signal ${r.signal})` : ''}, 0 attendu — ${court(r.sortie, 160)}`)
    else {
      const pj = path.join(dest, 'pack.json')
      if (!fs.existsSync(pj)) s.echoue('LV-10', 'payee sans voix : pack.json non écrit')
      else {
        let c = null
        try { c = JSON.parse(fs.readFileSync(pj, 'utf8')) } catch { s.echoue('LV-10', 'pack.json illisible (JSON invalide)') }
        if (c) {
          if (c.pack_id !== j.id) s.echoue('LV-10', `pack.json : pack_id ${JSON.stringify(c.pack_id)} ≠ ${JSON.stringify(j.id)}`)
          if (JSON.stringify(c.matiere) !== JSON.stringify(j.matiere)) s.echoue('LV-10', 'pack.json : matiere différente de la ligne')
          if (c.site !== j.site_slug) s.echoue('LV-10', `pack.json : site ${JSON.stringify(c.site)} ≠ ${JSON.stringify(j.site_slug)} (slug de l'artisan)`)
          if (JSON.stringify(c).toLowerCase().includes(j.email.toLowerCase())) s.echoue('LV-10', 'pack.json contient une adresse de courriel')
        }
      }
    }
  }
  {
    const lignePath = path.join(LIGNES, 'payee-voix-a-produire.json')
    const j = JSON.parse(fs.readFileSync(lignePath, 'utf8'))
    const dest = dossierSortie('payee-voix-a-produire')
    const r = lancer(process.execPath, [fichier, j.id, dest, `--depuis-fichier=${lignePath}`], { cwd: racine, timeout: 90_000, env: {} })
    if (r.code !== 4) s.echoue('LV-10', `voix à produire : code ${r.code}${r.signal ? ` (signal ${r.signal})` : ''}, 4 attendu`)
    const vp = path.join(dest, 'voix-a-produire.txt')
    if (!fs.existsSync(vp)) s.echoue('LV-10', 'voix-a-produire.txt non écrit')
    else {
      const contenuVp = fs.readFileSync(vp, 'utf8')
      const premiere = contenuVp.split(/\r?\n/)[0] || ''
      if (!/^voix\s+à\s+produire\s*:\s*ff_siwis/i.test(premiere)) s.echoue('LV-10', `voix-a-produire.txt : première ligne « ${court(premiere, 70)} », « voix à produire : ff_siwis » attendu`)
      if (!contenuVp.includes(j.matiere.texte_voix)) s.echoue('LV-10', "voix-a-produire.txt ne porte pas le texte_voix exact de la ligne")
    }
  }
  {
    const lignePath = path.join(LIGNES, 'fabriquee-etat-autre.json')
    const j = JSON.parse(fs.readFileSync(lignePath, 'utf8'))
    const dest = dossierSortie('autre-etat')
    const r = lancer(process.execPath, [fichier, j.id, dest, `--depuis-fichier=${lignePath}`], { cwd: racine, timeout: 90_000, env: {} })
    if (r.code !== 1) s.echoue('LV-10', `ligne en état ${j.etat} : code ${r.code}${r.signal ? ` (signal ${r.signal})` : ''}, 1 attendu`)
    if (fs.existsSync(dest) && fs.readdirSync(dest).length) s.echoue('LV-10', `ligne en état ${j.etat} : ${fs.readdirSync(dest).length} fichier(s) écrit(s), aucun attendu`)
  }
  if (!s.enEchec('LV-10')) s.passe('LV-10', "payee → pack.json (matiere identique, site du slug, aucun courriel) ; synthese sans voix.mp3 → voix-a-produire.txt « voix à produire : ff_siwis » + texte_voix (code 4) ; autre état → code 1, rien écrit")
}
function jugerLV11(s) {
  const texte = lireSi(ch('scripts/pack-pub/exporter.mjs'))
  if (texte === null) { s.echoue('LV-11', 'scripts/pack-pub/exporter.mjs absent ou vide'); return }
  if (!/\.env\.local/.test(texte)) s.echoue('LV-11', ".env.local n'est pas chargé par le script lui-même")
  // Le filtre .eq('id', …) doit être sur la lecture de packs_pubs elle-même (contre-vérification du 29/09 : un autre .eq('id', …) du
  // fichier, sur artisans, suffisait à laisser passer une lecture de packs_pubs devenue .limit(1)).
  if (!/from\(\s*['"]packs_pubs['"]\s*\)\s*\.select\([^)]*\)\s*\.eq\(\s*['"]id['"]/.test(texte)) s.echoue('LV-11', "lecture filtrée absente : from('packs_pubs').select(…).eq('id', …) attendu")
  if (/\.(insert|update|upsert|delete)\(/.test(texte)) s.echoue('LV-11', 'écriture en base trouvée (.insert/.update/.upsert/.delete) : exporter.mjs ne doit que lire')
  if (!s.enEchec('LV-11')) s.passe('LV-11', '.env.local chargé par le script lui-même, lecture filtrée .eq(id), aucune écriture en base')
}

// ── --partie=route ───────────────────────────────────────────────────────────────────────────────────────────────
const ENTREE_COURRIEL = {
  nom: 'Jean Dupont',
  liens: {
    artisan_de_confiance: 'https://exemple-projet.supabase.co/storage/v1/object/sign/packs-pubs/pack-essai-0001/artisan_de_confiance.mp4?token=abc123',
    avant_apres: 'https://exemple-projet.supabase.co/storage/v1/object/sign/packs-pubs/pack-essai-0001/avant_apres.mp4?token=def456',
  },
  expireLe: '2026-10-28T10:00:00.000Z',
}
const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
function construireSondeLV3() {
  return `// Sonde de ${NOM} --partie=route (LV-3), écrite par le juge (fiche 026-110). Importe et APPELLE le code jugé.
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const R = ${JSON.stringify(racine)}
async function importer(rel) { try { return { m: await import(pathToFileURL(path.join(R, rel)).href) } } catch (e) { return { erreur: String((e && e.stack) || e) } } }
const mod = await importer('lib/packPubLivraison.ts')
const out = { erreur: null, DUREE_LIEN_S: null, avecVoix: null, sansVoix: null }
if (mod.erreur) out.erreur = mod.erreur
const M = mod.m || {}
out.DUREE_LIEN_S = M.DUREE_LIEN_S
const ENTREE = ${JSON.stringify(ENTREE_COURRIEL)}
try { out.avecVoix = typeof M.courrielLivraison === 'function' ? M.courrielLivraison({ ...ENTREE, voixSynthese: true }) : '(absente)' } catch (e) { out.erreurAvecVoix = String((e && e.message) || e) }
try { out.sansVoix = typeof M.courrielLivraison === 'function' ? M.courrielLivraison({ ...ENTREE, voixSynthese: false }) : '(absente)' } catch (e) { out.erreurSansVoix = String((e && e.message) || e) }
console.log('SONDE_LV3_JSON ' + JSON.stringify(out))
`
}
function lancerSondeLV3() {
  const fichier = path.join(dossierTravail(NOM), 'sonde-lv3.mjs')
  fs.writeFileSync(fichier, construireSondeLV3())
  const r = lancer(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', pathToFileURL(TS_LOADER).href, fichier], { cwd: racine, timeout: 60_000, env: {} })
  const ligne = r.stdout.split(/\r?\n/).find((l) => l.startsWith('SONDE_LV3_JSON '))
  if (!ligne) return { erreur: `la sonde n'a rendu aucun résultat (code ${r.code}${r.signal ? ` signal ${r.signal}` : ''}) : ${court(r.sortie, 300)}` }
  try { return { r: JSON.parse(ligne.slice('SONDE_LV3_JSON '.length)) } } catch { return { erreur: 'résultat de la sonde illisible (JSON invalide)' } }
}
function jugerLV3(s) {
  const sonde = lancerSondeLV3()
  if (sonde.erreur) { s.echoue('LV-3', `sonde en échec : ${sonde.erreur}`); return }
  const { r } = sonde
  if (r.erreur) { s.echoue('LV-3', `lib/packPubLivraison.ts ne s'importe pas : ${court(r.erreur, 200)}`); return }
  if (r.DUREE_LIEN_S !== 2592000) s.echoue('LV-3', `DUREE_LIEN_S = ${JSON.stringify(r.DUREE_LIEN_S)}, 2592000 attendu`)
  if (r.erreurAvecVoix) { s.echoue('LV-3', `courrielLivraison (voix) a levé : ${court(r.erreurAvecVoix, 160)}`); return }
  if (r.avecVoix === '(absente)') { s.echoue('LV-3', 'courrielLivraison absente de lib/packPubLivraison.ts'); return }
  if (typeof r.avecVoix !== 'string' || !r.avecVoix.trim()) { s.echoue('LV-3', 'courrielLivraison ne rend pas un texte'); return }
  const t = r.avecVoix
  for (const [cle, lien] of Object.entries(ENTREE_COURRIEL.liens)) if (!t.includes(lien)) s.echoue('LV-3', `le lien ${cle} est absent du texte`)
  const d = new Date(ENTREE_COURRIEL.expireLe)
  const jour = String(d.getUTCDate())
  const annee = String(d.getUTCFullYear())
  const moisAttendu = MOIS_FR[d.getUTCMonth()]
  if (!t.includes(jour) || !t.includes(annee) || !MOIS_FR.some((m) => t.toLowerCase().includes(m))) s.echoue('LV-3', `la date d'expiration (${jour} ${moisAttendu} ${annee}) ne semble pas écrite en toutes lettres`)
  if (!/lancer la pub en 10 min/i.test(t)) s.echoue('LV-3', "le rappel « lancer la pub en 10 min » est absent")
  if (!t.includes('Voix générée par IA')) s.echoue('LV-3', "« Voix générée par IA » absent alors que voixSynthese=true")
  if (/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(t)) s.echoue('LV-3', 'une adresse de courriel apparaît dans le texte')
  if (/\b0[1-9](?:[\s.-]?\d{2}){4}\b/.test(t)) s.echoue('LV-3', 'un numéro de téléphone apparaît dans le texte')
  if (r.erreurSansVoix) s.echoue('LV-3', `courrielLivraison (sans voix) a levé : ${court(r.erreurSansVoix, 160)}`)
  else if (typeof r.sansVoix === 'string' && r.sansVoix.includes('Voix générée par IA')) s.echoue('LV-3', "« Voix générée par IA » présent alors que voixSynthese=false")
  if (!s.enEchec('LV-3')) s.passe('LV-3', "DUREE_LIEN_S = 2592000 ; courrielLivraison : chaque lien, date en toutes lettres, rappel des 10 min, « Voix générée par IA » selon voixSynthese, aucun courriel ni téléphone")
}
function jugerLV4(s) {
  const fichierJ = 'lib/direction/journal.ts'
  const head = git(['show', `HEAD:${fichierJ}`])
  const ici = lireSi(ch(fichierJ))
  if (head.code !== 0) s.echoue('LV-4', `${fichierJ} introuvable dans HEAD`)
  else if (ici === null) s.echoue('LV-4', `${fichierJ} absent`)
  else {
    const avant = lf(head.stdout)
    if (avant === ici) s.echoue('LV-4', "journal.ts : aucune addition — 'pack_livre' et 'pack_refaire' absents de l'union Action")
    else {
      if (!ici.includes("'pack_livre'")) s.echoue('LV-4', "journal.ts : 'pack_livre' absent de l'union Action")
      if (!ici.includes("'pack_refaire'")) s.echoue('LV-4', "journal.ts : 'pack_refaire' absent de l'union Action")
      const retirees = diffLignes(fichierJ).filter((l) => l.startsWith('-'))
      if (retirees.length) s.echoue('LV-4', `journal.ts : ${retirees.length} ligne(s) retirée(s), le diff ne doit qu'ajouter les deux actions (et un commentaire)`)
    }
  }
  const fichierR = 'app/api/controle/packs/[id]/route.ts'
  const texte = lireSi(ch(fichierR))
  if (texte === null) { s.echoue('LV-4', `${fichierR} absent ou vide`); return }
  const post = extraireFonction(texte, 'POST')
  if (!post) { s.echoue('LV-4', `${fichierR} : export async function POST introuvable`); return }
  if (!/estFondateur\(/.test(post)) s.echoue('LV-4', 'estFondateur( absent')
  if (!/exigerDomaine\(\s*\w+\s*,\s*['"]clients['"]\s*,\s*['"]ecrire['"]\s*\)/.test(post)) s.echoue('LV-4', "exigerDomaine(…, 'clients', 'ecrire') absent")
  if (!/exigerReconfirmation\(/.test(post)) s.echoue('LV-4', "exigerReconfirmation( absent (portée 'artisan', pour livrer)")
  if (!/transitionPackValide\(/.test(post)) s.echoue('LV-4', 'transitionPackValide( absent')
  const iJournal = post.search(/journaliser\(/)
  const iMaj = post.search(/\.update\(/)
  if (iJournal < 0) s.echoue('LV-4', 'journaliser( absent')
  else if (iMaj >= 0 && iJournal >= iMaj) s.echoue('LV-4', 'le journal doit s\'écrire AVANT la mise à jour')
  if (!/['"]packs-pubs['"]/.test(post)) s.echoue('LV-4', "bucket 'packs-pubs' absent (createSignedUrls)")
  if (!/createSignedUrls\(/.test(post)) s.echoue('LV-4', 'createSignedUrls( absent')
  if (!/DUREE_LIEN_S/.test(post)) s.echoue('LV-4', 'DUREE_LIEN_S absent')
  if (!/sendEmail\(/.test(post)) s.echoue('LV-4', 'sendEmail( absent')
  if (!/courrielLivraison\(/.test(post)) s.echoue('LV-4', 'courrielLivraison( absent')
  for (const champ of ['livre_le', 'lien_expire_le']) if (!post.includes(champ)) s.echoue('LV-4', `${champ} absent de la mise à jour`)
  if (!/refaits/.test(post)) s.echoue('LV-4', "refaits absent (incrémenté sur refaire)")
  if (!/10/.test(post) || !/consigne/i.test(post)) s.echoue('LV-4', 'consigne : contrôle de longueur (10 signes au moins) introuvable')
  if (!/livree/.test(post)) s.echoue('LV-4', "l'état 'livree' (refaire depuis livree) est absent")
  if (!/await\s+ctx\.params\b/.test(post)) s.echoue('LV-4', 'ctx.params non attendu par await (Next 16)')
  if (!s.enEchec('LV-4')) s.passe('LV-4', "journal.ts : deux actions ajoutées, rien retiré ; POST : garde, reconfirmation (livrer), transitionPackValide, journal avant écriture, liens signés packs-pubs (DUREE_LIEN_S), courriel, refaire borné (consigne, refaits, depuis livree), await ctx.params")
}
function jugerLV5(s) {
  const fichier = 'app/api/controle/packs/route.ts'
  const texte = lireSi(ch(fichier))
  if (texte === null) { s.echoue('LV-5', `${fichier} absent ou vide`); return }
  const get = extraireFonction(texte, 'GET')
  if (!get) { s.echoue('LV-5', 'export async function GET introuvable'); return }
  if (!/estFondateur\(/.test(get)) s.echoue('LV-5', 'estFondateur( absent (garde de direction)')
  if (!/createSignedUrls\(/.test(get)) s.echoue('LV-5', 'createSignedUrls( absent')
  const m = get.match(/createSignedUrls\([^)]*?,\s*(\d+)\s*\)/)
  if (!m) s.echoue('LV-5', 'durée du lien signé introuvable (createSignedUrls(…, <secondes>))')
  else if (Number(m[1]) > 600) s.echoue('LV-5', `lien signé de ${m[1]} s, 600 s au plus attendu`)
  if (!/['"]fabriquee['"]/.test(get)) s.echoue('LV-5', "le filtre sur l'état 'fabriquee' est introuvable")
  if (!s.enEchec('LV-5')) s.passe('LV-5', 'GET : garde de direction, adresses signées ≤ 600 s pour les packs fabriquee')
}
const FICHIERS_MODELES_LV = ['app/controle/Sites.tsx', 'app/api/controle/sites/[id]/route.ts', 'lib/direction/garde.ts', 'lib/direction/reconfirmation.ts']
const sansLibellesAdmis = (t) => t.split('\n').filter((l) => !/'pack_livre'|'pack_refaire'/.test(l)).join('\n')
function jugerLV15(s) {
  const echecs = []
  for (const f of FICHIERS_MODELES_LV) {
    const head = git(['show', `HEAD:${f}`])
    if (head.code !== 0) { echecs.push(`${f} introuvable dans HEAD`); continue }
    const ici = lireSi(ch(f))
    if (ici === null) { echecs.push(`${f} absent (racine ${aff(racine)})`); continue }
    if (lf(head.stdout) !== ici) echecs.push(`${f} modifié par rapport à HEAD`)
  }
  {
    const f = 'lib/direction/journal.ts'
    const head = git(['show', `HEAD:${f}`])
    const ici = lireSi(ch(f))
    if (head.code !== 0) echecs.push(`${f} introuvable dans HEAD`)
    else if (ici === null) echecs.push(`${f} absent`)
    else if (sansLibellesAdmis(lf(head.stdout)) !== sansLibellesAdmis(ici)) echecs.push(`${f} modifié par rapport à HEAD hors des deux libellés admis (pack_livre, pack_refaire)`)
  }
  if (echecs.length) for (const e of echecs) s.echoue('LV-15', e)
  else s.passe('LV-15', `${FICHIERS_MODELES_LV.length + 1} fichiers modèles identiques à HEAD (garde, reconfirmation, geste du Poste ; journal.ts hors des deux libellés admis)`)
}

// ── --partie=poste ───────────────────────────────────────────────────────────────────────────────────────────────
function jugerLV7(s) {
  const texte = lireSi(ch('app/controle/Packs.tsx'))
  if (texte === null) { s.echoue('LV-7', 'app/controle/Packs.tsx absent ou vide'); return }
  const nbVideo = (texte.match(/<video\s+controls/g) || []).length
  const nbImg = (texte.match(/<img\b/g) || []).length
  if (nbVideo < 3) s.echoue('LV-7', `${nbVideo} <video controls>, 3 attendues`)
  if (nbImg < 3) s.echoue('LV-7', `${nbImg} <img>, 3 attendues`)
  const iLivrer = texte.indexOf('Livrer')
  if (iLivrer < 0) s.echoue('LV-7', "« Livrer » introuvable")
  else {
    const zone = texte.slice(Math.max(0, iLivrer - 150), iLivrer + 700)
    if (!/apiDirection\(/.test(zone)) s.echoue('LV-7', "« Livrer » n'appelle pas apiDirection(")
    if (!/\/api\/controle\/packs\//.test(zone)) s.echoue('LV-7', "« Livrer » n'appelle pas /api/controle/packs/")
    if (!/['"]livrer['"]/.test(zone)) s.echoue('LV-7', "action: 'livrer' introuvable près de « Livrer »")
    if (!/,\s*true\s*\)/.test(zone)) s.echoue('LV-7', 'le troisième argument `true` (reconfirmation) introuvable près de « Livrer »')
    if (!/confirm\(/.test(zone)) s.echoue('LV-7', 'aucune confirmation avant « Livrer »')
  }
  if (!/Refaire/.test(texte)) s.echoue('LV-7', "« Refaire » introuvable")
  else if (!/consigne/i.test(texte)) s.echoue('LV-7', "« Refaire » n'envoie pas de consigne")
  if (!s.enEchec('LV-7')) s.passe('LV-7', "3 <video controls>, 3 <img> ; « Livrer » : confirmation puis apiDirection(…, action:'livrer', true) ; « Refaire » : consigne")
}
function jugerLV8(s) {
  const fichier = 'app/controle/page.tsx'
  const ici = lireSi(ch(fichier))
  const head = git(['show', `HEAD:${fichier}`])
  if (head.code !== 0) { s.echoue('LV-8', `${fichier} introuvable dans HEAD`); return }
  if (ici === null) { s.echoue('LV-8', `${fichier} absent`); return }
  const iType = ici.search(/type\s+Onglet\s*=/)
  const ligneType = iType >= 0 ? ici.slice(iType, ici.indexOf('\n', iType)) : ''
  if (!/'packs'/.test(ligneType)) s.echoue('LV-8', "le type Onglet n'a pas gagné 'packs'")
  const iOnglets = ici.search(/const\s+ONGLETS/)
  const zoneOnglets = iOnglets < 0 ? '' : ici.slice(iOnglets, ici.indexOf(']', iOnglets + 400) + 1 || ici.length)
  if (!/actif\(\s*['"]packPub['"]\s*\)/.test(zoneOnglets) || !/packs/.test(zoneOnglets)) s.echoue('LV-8', "aucune entrée ONGLETS sous actif('packPub') portant 'packs'")
  const iTitres = ici.search(/const\s+TITRES/)
  const zoneTitres = iTitres < 0 ? '' : ici.slice(iTitres, ici.indexOf('\n', iTitres))
  if (!/\bpacks\s*:/.test(zoneTitres)) s.echoue('LV-8', "TITRES n'a pas gagné d'entrée packs")
  const iNav = ici.search(/const\s+NAV/)
  const zoneNav = iNav < 0 ? '' : ici.slice(iNav)
  if (!/id:\s*['"]packs['"]/.test(zoneNav)) s.echoue('LV-8', "NAV n'a pas gagné d'entrée { id: 'packs', … }")
  if (!/onglet\s*===\s*['"]packs['"]/.test(ici)) s.echoue('LV-8', "aucune ligne de rendu onglet === 'packs'")
  const lignes = diffLignes(fichier)
  const retireesHorsGrandit = lignes.filter((l) => l.startsWith('-') && !/type\s+Onglet\s*=|const\s+TITRES/.test(l))
  if (retireesHorsGrandit.length) s.echoue('LV-8', `${retireesHorsGrandit.length} ligne(s) retirée(s) hors du type Onglet et de TITRES : le diff doit rester limité à l'ajout de l'onglet packs`)
  if (lignes.length > 14) s.echoue('LV-8', `${lignes.length} ligne(s) changée(s) : diff anormalement large pour l'ajout d'un seul onglet`)
  if (!s.enEchec('LV-8')) s.passe('LV-8', "Onglet, ONGLETS (sous actif('packPub')), TITRES, NAV et le rendu ont gagné 'packs' ; diff limité")
}

// ── --partie=purge ───────────────────────────────────────────────────────────────────────────────────────────────
function lireFixturesPurge() {
  const DIR = path.join(FIX, 'purge')
  const noms = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()
  if (!noms.length) throw new Error(`${aff(path.relative(R, DIR))} : aucun fichier .json`)
  return noms.map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')))
}
function genererLignesCap() {
  const lignes = []
  for (let i = 1; i <= 25; i++) {
    const d = new Date(new Date(MAINTENANT).getTime() - i * 86_400_000).toISOString()
    lignes.push({ id: `pack-cap-${String(i).padStart(2, '0')}`, artisan_id: `artisan-cap-${i}`, etat: 'livree', refaits: 0, lien_expire_le: d, fichiers_effaces_le: null })
  }
  return lignes
}
function construireSondeLV12(basiques, generees) {
  return `// Sonde de ${NOM} --partie=purge (LV-12), écrite par le juge (fiche 026-110). Importe et APPELLE le code jugé.
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const R = ${JSON.stringify(racine)}
async function importer(rel) { try { return { m: await import(pathToFileURL(path.join(R, rel)).href) } } catch (e) { return { erreur: String((e && e.stack) || e) } } }
const mod = await importer('lib/packPubPurge.ts')
const out = { erreur: null, basiques: null, cap: null }
if (mod.erreur) out.erreur = mod.erreur
const M = mod.m || {}
const MAINTENANT = ${JSON.stringify(MAINTENANT)}
try { out.basiques = typeof M.packsAPurger === 'function' ? M.packsAPurger(${JSON.stringify(basiques)}, MAINTENANT) : '(absente)' } catch (e) { out.erreurBasiques = String((e && e.message) || e) }
try { out.cap = typeof M.packsAPurger === 'function' ? M.packsAPurger(${JSON.stringify(generees)}, MAINTENANT) : '(absente)' } catch (e) { out.erreurCap = String((e && e.message) || e) }
console.log('SONDE_LV12_JSON ' + JSON.stringify(out))
`
}
function lancerSondeLV12(basiques, generees) {
  const fichier = path.join(dossierTravail(NOM), 'sonde-lv12.mjs')
  fs.writeFileSync(fichier, construireSondeLV12(basiques, generees))
  const r = lancer(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', pathToFileURL(TS_LOADER).href, fichier], { cwd: racine, timeout: 60_000, env: {} })
  const ligne = r.stdout.split(/\r?\n/).find((l) => l.startsWith('SONDE_LV12_JSON '))
  if (!ligne) return { erreur: `la sonde n'a rendu aucun résultat (code ${r.code}${r.signal ? ` signal ${r.signal}` : ''}) : ${court(r.sortie, 300)}` }
  try { return { r: JSON.parse(ligne.slice('SONDE_LV12_JSON '.length)) } } catch { return { erreur: 'résultat de la sonde illisible (JSON invalide)' } }
}
function jugerLV12(s) {
  const basiques = lireFixturesPurge()
  const generees = genererLignesCap()
  const sonde = lancerSondeLV12(basiques, generees)
  if (sonde.erreur) { s.echoue('LV-12', `sonde en échec : ${sonde.erreur}`); return }
  const { r } = sonde
  if (r.erreur) { s.echoue('LV-12', `lib/packPubPurge.ts ne s'importe pas : ${court(r.erreur, 200)}`); return }
  if (r.erreurBasiques) s.echoue('LV-12', `packsAPurger (scénarios) a levé : ${court(r.erreurBasiques, 160)}`)
  else if (r.basiques === '(absente)') s.echoue('LV-12', 'packsAPurger absente de lib/packPubPurge.ts')
  else if (!Array.isArray(r.basiques)) s.echoue('LV-12', `packsAPurger ne rend pas un tableau : ${court(JSON.stringify(r.basiques), 100)}`)
  else {
    const ids = r.basiques.map((x) => (typeof x === 'string' ? x : x.id))
    if (ids.join(',') !== 'pack-purge-1,pack-purge-2') s.echoue('LV-12', `scénarios : ${JSON.stringify(ids)} rendu, ["pack-purge-1","pack-purge-2"] attendu (livree, expiré, jamais purgé, le plus ancien d'abord ; jamais payee/fabriquee/pas-expiré/déjà-purgé)`)
  }
  if (r.erreurCap) s.echoue('LV-12', `packsAPurger (plafond) a levé : ${court(r.erreurCap, 160)}`)
  else if (r.cap === '(absente)') { /* déjà signalé ci-dessus */ }
  else if (!Array.isArray(r.cap)) s.echoue('LV-12', 'packsAPurger (plafond) ne rend pas un tableau')
  else {
    const idsCap = r.cap.map((x) => (typeof x === 'string' ? x : x.id))
    const attendu = [...generees].sort((a, b) => (a.lien_expire_le < b.lien_expire_le ? -1 : 1)).slice(0, 20).map((x) => x.id)
    if (idsCap.length !== 20) s.echoue('LV-12', `plafond : ${idsCap.length} pack(s) rendu(s), 20 au plus attendu (25 éligibles en entrée)`)
    if (idsCap.join(',') !== attendu.join(',')) s.echoue('LV-12', `plafond : sélection ou ordre incorrect (reçu ${JSON.stringify(idsCap.slice(0, 4))}… ; attendu ${JSON.stringify(attendu.slice(0, 4))}…)`)
  }
  if (!s.enEchec('LV-12')) s.passe('LV-12', "packsAPurger : 2 packs retenus sur 6 scénarios ; 20 au plus sur 25 éligibles, les plus anciens d'abord")
}
function jugerLV13(s) {
  const fichier = 'lib/packPubPurge.ts'
  const texte = lireSi(ch(fichier))
  if (texte === null) { s.echoue('LV-13', `${fichier} absent ou vide`); return }
  const corps = extraireFonction(texte, 'purgerPacksExpires')
  if (!corps) s.echoue('LV-13', 'export async function purgerPacksExpires introuvable')
  else {
    if (!/\.list\(/.test(corps)) s.echoue('LV-13', '.list( absent (liste packs-pubs/<id>/)')
    if (!/\.remove\(/.test(corps)) s.echoue('LV-13', '.remove( absent')
    if (!/['"]packs-pubs['"]/.test(corps)) s.echoue('LV-13', "bucket 'packs-pubs' absent")
    if (!/\.is\(\s*['"]fichiers_effaces_le['"]\s*,\s*null\s*\)/.test(corps)) s.echoue('LV-13', ".is('fichiers_effaces_le', null) absent")
    if (/\bthrow\b/.test(corps)) s.echoue('LV-13', 'une erreur est levée (throw) : elle doit être comptée et rendue, jamais levée')
  }
  const fichierCron = 'app/api/cron/relances/route.ts'
  const ici = lireSi(ch(fichierCron))
  const head = git(['show', `HEAD:${fichierCron}`])
  if (head.code !== 0) { s.echoue('LV-13', `${fichierCron} introuvable dans HEAD`); return }
  if (ici === null) { s.echoue('LV-13', `${fichierCron} absent`); return }
  if (!/purgerPacksExpires\(/.test(ici)) s.echoue('LV-13', 'purgerPacksExpires( absent du cron')
  if (!/enregistrerPassage\(\s*['"]purge-packs['"]/.test(ici)) s.echoue('LV-13', "enregistrerPassage('purge-packs', …) absent")
  const retirees = diffLignes(fichierCron).filter((l) => l.startsWith('-'))
  if (retirees.length) s.echoue('LV-13', `${retirees.length} ligne(s) retirée(s) du cron : le diff ne doit qu'ajouter l'import et le bloc try`)
  if (!s.enEchec('LV-13')) s.passe('LV-13', "purgerPacksExpires : list/remove sur packs-pubs, .is(fichiers_effaces_le,null), erreurs comptées jamais levées ; cron : import + bloc try après les purges RGPD, rien retiré")
}

// ── typecheck (LV-6, LV-9, LV-14) ───────────────────────────────────────────────────────────────────────────────
function jugerTypecheck(s, id) {
  const r = lancer('npm', ['run', 'typecheck'], { cwd: racine, timeout: 300_000, shell: process.platform === 'win32' })
  if (r.code !== 0) s.echoue(id, `npm run typecheck en code ${r.code}${r.signal ? ` (signal ${r.signal})` : ''} : ${court(r.derniereLigne || r.sortie, 200)}`)
  else s.passe(id, 'npm run typecheck vert')
}

// ── Le jugement ──────────────────────────────────────────────────────────────────────────────────────────────────
function juger() {
  const s = creerRapport(NOM, IDS[PARTIE], { entete: `${NOM} --partie=${PARTIE} (${FICHE[PARTIE]}) — racine ${aff(racine)}${o.temoin ? ' — témoin' : ''}` })
  if (o.temoin) {
    for (const id of IDS[PARTIE]) if (id !== 'LV-15') s.saute(id, `témoin : critère de fabrication, prouvé par le PASS de ${FICHE[PARTIE]}`)
    if (IDS[PARTIE].includes('LV-15')) jugerLV15(s)
    return s.fin()
  }
  if (PARTIE === 'depot') { jugerLV1(s); jugerLV2(s); jugerLV10(s); jugerLV11(s) }
  else if (PARTIE === 'route') { jugerLV3(s); jugerLV4(s); jugerLV5(s); jugerTypecheck(s, 'LV-6'); jugerLV15(s) }
  else if (PARTIE === 'poste') { jugerLV7(s); jugerLV8(s); jugerTypecheck(s, 'LV-9') }
  else { jugerLV12(s); jugerLV13(s); jugerTypecheck(s, 'LV-14') }
  return s.fin()
}
process.exit(juger())
