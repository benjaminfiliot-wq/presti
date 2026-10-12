#!/usr/bin/env node
// scripts/pack-pub-base-qa.mjs — le juge de la migration du pack pubs (table public.packs_pubs et bucket packs-pubs,
// fiche 026-114), écrit par Claude Code AVANT la migration qu'il juge (fiche 026-108, « Ce qu'il faut faire », point 2).
// Contrat : scripts/fixtures/026-pubs-contenu/contrat-pack.json (seule source ; PB-2 accepte `type` locale|studio et
// `marque_cle`, jamais un prix figé : le pack Studio, fiche 026-166, a le sien).
//
// Sans connexion directe à la base (refusée depuis le 14/09), il juge en trois temps :
//   1. lecture statique de la migration, cherchée par son suffixe (JAMAIS un numéro figé : « les juges cherchent
//      *_packs_pubs.sql … et ne dépendent pas du numéro », fiche 026-108) — PB-1 à PB-4 ;
//   2. les jumeaux et le contrôle (sql-nu.mjs), qui portent le même numéro que la migration trouvée — PB-5, PB-6 ;
//   3. non-régression (PB-7) puis le compte rendu de l'essai à sec, écrit par 026-114 dans
//      .orchestre/preuves/026-114/essai-a-sec.txt, relu par lireCompteRendu de scripts/lib/sql-essai.mjs (PB-8).
// --reel (Claude Code seulement, après l'application) : lit la table et le bucket par PostgREST avec la clé de service,
// vérifie que la clé anonyme n'y lit rien ; charge .env.local lui-même sans rien afficher (scripts/site-deposer.mjs:17).
//
// Critères : PB-1 fichier unique, numéro libre · PB-2 la table du contrat · PB-3 sécurité (RLS, revoke, une politique de
// lecture, aucune d'écriture) · PB-4 le bucket packs-pubs · PB-5 jumeaux équivalents · PB-6 contrôle en lecture seule ·
// PB-7 non-régression · PB-8 essai à sec relu.
//
// Usage :
//   node scripts/pack-pub-base-qa.mjs [--racine=<dossier>]
//   node scripts/pack-pub-base-qa.mjs --temoin     PB-7 seul, plus la vérification que sql-essai.mjs s'importe
//   node scripts/pack-pub-base-qa.mjs --reel        PostgREST, Claude Code seulement, après l'application
// Codes : 0 vert · 1 un critère rouge · 2 appel invalide ou préalable manquant (--reel).
// N'écrit que sous .orchestre/travail/pack-pub-base-qa/. Aucun secret affiché.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { R, lireOptionsOuQuitter } from './fixtures/025/commun.mjs'
import {
  instructions, normaliser, seParse, masquer, fermante, decouperVirgules, compacter, serrer,
  jumeauNuCoupe, empreinte, lireCompteRendu, creerRapport, nonRegression, lireEnvLocal, dossierTravail, court, lf, MARQUE_CONTROLE,
} from './lib/sql-essai.mjs'
import { CONTRAT } from './fixtures/026-pubs-contenu/commun.mjs'

const NOM = 'pack-pub-base-qa'
const FICHE = '026-114'
const T = CONTRAT.table
const IDS = ['PB-1', 'PB-2', 'PB-3', 'PB-4', 'PB-5', 'PB-6', 'PB-7', 'PB-8']

const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: [] })
const refuser = (m) => { console.error(`✗ ${NOM} : ${m}`); process.exit(2) }
if (o.positionnels.length) refuser(`argument(s) inattendu(s) : ${o.positionnels.join(' ')}`)
const racine = o.racine
const ch = (rel) => path.join(racine, rel)
const aff = (p) => String(p).split(path.sep).join('/')
function lireSi(f) { try { const b = fs.readFileSync(f); return b.length ? lf(b.toString('utf8')) : '' } catch { return null } }
const lireInstructions = (sql) => instructions(sql).map((t) => ({ t, n: normaliser(t), c: compacter(t) }))
const apresRoles = (n, mot) => { const i = n.lastIndexOf(` ${mot} `); return i < 0 ? [] : n.slice(i + mot.length + 2).split(',').map((x) => x.trim().replace(/\s+(cascade|restrict)$/, '').replace(/"/g, '')).filter(Boolean) }
const lancerNode = (args) => spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 120_000, windowsHide: true, maxBuffer: 64 << 20 })

// ── Trouver le fichier de migration : suffixe cherché, numéro jamais figé (026-108) ─────────────────────────────────────
function trouverMigration() {
  const dossier = ch('supabase/migrations')
  let noms
  try { noms = fs.readdirSync(dossier) } catch { return { erreur: `dossier introuvable : supabase/migrations (racine ${aff(racine)})` } }
  const RE = new RegExp(`^(\\d{4})${T.suffixe_fichier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
  const correspond = noms.filter((n) => RE.test(n))
  if (correspond.length !== 1) return { erreur: `${correspond.length} fichier(s) supabase/migrations/*${T.suffixe_fichier}, un seul attendu (trouvé(s) : ${correspond.join(', ') || 'aucun'})` }
  const n = RE.exec(correspond[0])[1]
  const autres = noms.filter((f) => f !== correspond[0] && f.startsWith(n))
  if (autres.length) return { erreur: `le numéro ${n} est aussi porté par ${autres.join(', ')} : un numéro de migration ne se partage pas` }
  return { n, fichier: `supabase/migrations/${correspond[0]}` }
}

// ── PB-2 : la table, colonne par colonne (contrat-pack.json → table.colonnes) ───────────────────────────────────────────
function parserTable(t) {
  const m = masquer(t)
  const i = m.indexOf('('), j = i < 0 ? -1 : fermante(m, i)
  if (j < 0) return null
  const colonnes = new Map()
  for (const it of decouperVirgules(t.slice(i + 1, j))) {
    const n = normaliser(it)
    if (/^(constraint|check|unique|primary key|foreign key|exclude)\b/.test(n)) continue
    const nom = n.split(' ')[0].replace(/"/g, '')
    colonnes.set(nom, n)
  }
  return colonnes
}
const listeSet = (t) => new Set(t.split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean))
const REGLES_COLONNES = [
  ['id', /^id uuid primary key/],
  ['artisan_id', /^artisan_id uuid references public\.artisans\(id\) on delete set null/],
  ['commande_site_id', /^commande_site_id uuid references public\.sites_commandes\(id\) on delete set null/],
  ['email', /^email text not null/],
  ['matiere', /^matiere jsonb not null default '\{\}'(::jsonb)?$/],
  ['marque_cle', /^marque_cle text$/],
  ['stripe_session_id', /^stripe_session_id text$/],
  ['stripe_payment_intent_id', /^stripe_payment_intent_id text$/],
  ['paye_le', /^paye_le timestamptz$/],
  ['fabrique_le', /^fabrique_le timestamptz$/],
  ['livre_le', /^livre_le timestamptz$/],
  ['lien_expire_le', /^lien_expire_le timestamptz$/],
  ['fichiers_effaces_le', /^fichiers_effaces_le timestamptz$/],
  ['verifications', /^verifications jsonb$/],
  ['consigne', /^consigne text$/],
  ['refaits', /^refaits integer not null default 0$/],
  ['cree_le', /^cree_le timestamptz/],
  ['modifie_le', /^modifie_le timestamptz/],
]
function jugerTable(s, id, tIns) {
  if (!tIns) { s.echoue(id, 'create table public.packs_pubs : instruction absente'); return }
  const cols = parserTable(tIns.t)
  if (!cols) { s.echoue(id, 'create table public.packs_pubs : parenthèses non refermées'); return }
  for (const col of T.colonnes) if (!cols.has(col)) s.echoue(id, `colonne absente : ${col}`)
  for (const [nom, re] of REGLES_COLONNES) { const d = cols.get(nom); if (d !== undefined && !re.test(d)) s.echoue(id, `${nom} : « ${court(d, 90)} », attendu conforme à ${re}`) }
  // normaliser() retire l'espace de part et d'autre de CHAQUE parenthèse (fixtures/025/commun.mjs, normaliserCode) :
  // « check (etat in (...)) » s'y lit « check(etat in(...)) », jamais avec un espace avant « ( ».
  const etat = cols.get('etat')
  if (etat === undefined) { /* déjà signalé */ } else {
    const m = /^etat text not null default 'brouillon' check\(etat in\(([^)]*)\)\)$/.exec(etat)
    if (!m) s.echoue(id, `etat : « ${court(etat, 100)} » — attendu « etat text not null default 'brouillon' check (etat in (...)) »`)
    else { const vus = listeSet(m[1]), att = new Set(CONTRAT.pack_locale.etats); if (vus.size !== att.size || [...att].some((x) => !vus.has(x))) s.echoue(id, `etat : liste ${[...vus].join(',')}, attendue ${[...att].join(',')}`) }
  }
  const type = cols.get('type')
  if (type === undefined) { /* déjà signalé */ } else {
    const m = /^type text not null default 'locale' check\(type in\(([^)]*)\)\)$/.exec(type)
    if (!m) s.echoue(id, `type : « ${court(type, 100)} » — attendu « type text not null default 'locale' check (type in ('locale','studio')) »`)
    else { const vus = listeSet(m[1]), att = new Set(['locale', 'studio']); if (vus.size !== att.size || [...att].some((x) => !vus.has(x))) s.echoue(id, `type : liste ${[...vus].join(',')}, attendue locale,studio`) }
  }
  const prix = cols.get('prix_cents')
  if (prix !== undefined) {
    if (!/^prix_cents integer not null default 14900/.test(prix)) s.echoue(id, `prix_cents : « ${court(prix, 90)} » — integer not null default 14900 attendu (jamais figé : le pack Studio a le sien)`)
    if (!/check\s*\(\s*prix_cents\s*>\s*0\s*\)/.test(`${prix} ${normaliser(tIns.t)}`)) s.echoue(id, "prix_cents : check (prix_cents > 0) introuvable")
  }
  if (!s.enEchec(id)) s.passe(id, `${T.colonnes.length} colonnes du contrat, dont etat et type en liste fermée et prix_cents > 0 (jamais figé)`)
}

// ── Le jugement d'une migration lue (PB-1 à PB-4) ───────────────────────────────────────────────────────────────────────
// Toujours SANS espace avant une parenthèse (normaliser() les retire, des deux côtés, partout).
const GENRES = [
  ['table', /^create table( if not exists)? public\.packs_pubs\(/],
  ['index_unique', /^create unique index( if not exists)? [a-z0-9_]+ on public\.packs_pubs\(stripe_session_id\) where stripe_session_id is not null$/],
  ['rls', /^alter table( if exists)?( only)? public\.packs_pubs enable row level security$/],
  ['revoke_table', /^revoke all( privileges)?( on( table)?)? public\.packs_pubs from /],
  ['policy', /^create policy .* on public\.packs_pubs /],
  ['bucket', /^insert into storage\.buckets\(/],
  ['comment', /^comment on (table|column) /],
]
function juger0102(s, texteM) {
  const ins = lireInstructions(texteM)
  const genres = ins.map((x) => { for (const [g, re] of GENRES) if (re.test(x.n)) return { ...x, g }; return { ...x, g: null } })
  const seul = (g) => { const l = genres.filter((x) => x.g === g); return l.length === 1 ? l[0] : null }

  // PB-2
  jugerTable(s, 'PB-2', seul('table'))
  const idx = seul('index_unique')
  if (!idx) s.echoue('PB-2', "index unique partiel sur stripe_session_id introuvable (« create unique index … on public.packs_pubs (stripe_session_id) where stripe_session_id is not null », même forme que 0088:63)")

  // PB-3 — sécurité
  const rls = seul('rls')
  if (!rls) s.echoue('PB-3', 'alter table public.packs_pubs enable row level security : absent')
  const rev = seul('revoke_table')
  if (!rev) s.echoue('PB-3', 'revoke all … on public.packs_pubs from … : absent')
  else { const roles = apresRoles(rev.n, 'from'); for (const r of ['public', 'anon', 'authenticated']) if (!roles.includes(r)) s.echoue('PB-3', `revoke all … from … : ${r} manquant (${roles.join(', ') || 'aucun'})`) }
  const policies = genres.filter((x) => x.g === 'policy')
  if (policies.length !== 1) s.echoue('PB-3', `${policies.length} politique(s) sur packs_pubs, une seule (en lecture) attendue`)
  else {
    const p = policies[0]
    if (!/\bfor select\b/.test(p.n)) s.echoue('PB-3', `la politique n'est pas « for select » : « ${court(p.n, 90)} »`)
    if (!/insert|update|delete|all\b/.test(p.n.replace(/for select/, ''))) { /* ok : aucune écriture citée */ } else s.echoue('PB-3', `la politique mentionne une écriture : « ${court(p.n, 100)} »`)
    if (!p.c.includes('auth.uid()=artisan_id')) s.echoue('PB-3', `la politique ne pose pas « auth.uid() = artisan_id » (using) : « ${court(p.n, 100)} »`)
  }
  if (!s.enEchec('PB-3')) s.passe('PB-3', 'RLS activée, revoke all … from public, anon, authenticated, une seule politique en lecture (auth.uid() = artisan_id), aucune politique d\'écriture')

  // PB-4 — le bucket
  const buckets = genres.filter((x) => x.g === 'bucket')
  const b = buckets.find((x) => x.c.includes(`'${T.bucket.nom}'`))
  if (!b) s.echoue('PB-4', `insert into storage.buckets … values ('${T.bucket.nom}', …) : introuvable`)
  else {
    // On ne lit que l'INSERT : un `set public = false` de la clause `on conflict` ne rend pas privé un bucket inséré en `true`.
    const insertSeul = b.n.split(/\bon\s+conflict\b/i)[0]
    if (!new RegExp(`values\\s*\\('${T.bucket.nom}'\\s*,\\s*'${T.bucket.nom}'\\s*,\\s*false`).test(insertSeul)) s.echoue('PB-4', `bucket ${T.bucket.nom} : public ≠ false (« ${court(b.n, 120)} »)`)
    const mTaille = /file_size_limit[^,)]*/.exec(b.n)
    const mVal = new RegExp(`values\\s*\\([^)]*,\\s*(\\d+)\\s*\\)`).exec(b.n)
    const taille = mVal ? Number(mVal[1]) : (mTaille ? Number((/\d+/.exec(mTaille[0]) || [])[0]) : NaN)
    if (!(taille > 0) || taille > T.bucket.file_size_limit_max) s.echoue('PB-4', `bucket ${T.bucket.nom} : file_size_limit ${Number.isFinite(taille) ? taille : '?'}, ≤ ${T.bucket.file_size_limit_max} attendu`)
  }
  const politiqueStorage = ins.filter((x) => /^create policy /.test(x.n) && x.n.includes('storage.objects') && x.c.includes(`'${T.bucket.nom}'`))
  if (politiqueStorage.length) s.echoue('PB-4', `une politique de storage.objects mentionne ${T.bucket.nom} (aucune attendue) : « ${court(politiqueStorage[0].n, 100)} »`)
  if (!s.enEchec('PB-4')) s.passe('PB-4', `bucket ${T.bucket.nom} privé, file_size_limit ≤ ${T.bucket.file_size_limit_max}, aucune politique de storage.objects ne le mentionne`)
}

// ── PB-5, PB-6 : jumeaux et contrôle (même numéro que la migration trouvée) ─────────────────────────────────────────────
function jugerJumeaux(s, id, texteM, n) {
  const jumeau = `supabase/migrations/_A_COLLER_sql_editor_${n}.sql`, nu = `supabase/migrations/_A_COLLER_sql_editor_${n}_NU.sql`
  const J = lireSi(ch(jumeau)), N = lireSi(ch(nu))
  if (J === null || N === null) { s.echoue(id, `jumeau(x) absent(s) : ${[J === null && jumeau, N === null && nu].filter(Boolean).join(', ')}`); return }
  if (!J || !N) { s.echoue(id, `jumeau(x) de 0 octet : ${[!J && jumeau, !N && nu].filter(Boolean).join(', ')}`); return }
  for (const [nom, x] of [[jumeau, J], [nu, N]]) { const p = seParse(x); if (!p.ok) s.echoue(id, `${nom} ne se parse pas : ${p.raisons.slice(0, 2).join(' ; ')}`) }
  let fJ = ch(jumeau)
  if (J.includes(MARQUE_CONTROLE)) { fJ = path.join(dossierTravail(NOM), 'jumeau-coupe.sql'); fs.writeFileSync(fJ, J.split(MARQUE_CONTROLE)[0]) }
  const v = lancerNode([path.join(R, 'scripts', 'sql-nu.mjs'), '--verifier', ch(jumeau), fJ])
  if (v.status !== 0) s.echoue(id, `sql-nu.mjs --verifier ${jumeau} en code ${v.status} : ${court(`${v.stdout}${v.stderr}`, 200)}`)
  if (!N.includes(MARQUE_CONTROLE)) s.echoue(id, `${nu} ne porte pas la marque du contrôle (sql-nu.mjs --controle)`)
  const forme = (x) => instructions(x).map(normaliser)
  const a = forme(texteM), b = forme(jumeauNuCoupe(ch(nu)))
  const k = a.findIndex((x, i) => x !== b[i])
  if (k >= 0 || a.length !== b.length) s.echoue(id, `la migration a ${a.length} instruction(s), le nu coupé ${b.length} ; première différence à l'instruction ${(k >= 0 ? k : Math.min(a.length, b.length)) + 1}`)
  if (!s.enEchec(id)) s.passe(id, `${jumeau} et ${nu} équivalents à la migration (sql-nu.mjs --verifier, ${a.length} instructions)`)
}
function jugerControle(s, id, n) {
  const controle = `supabase/controles/${n}_packs_pubs.sql`
  const C = lireSi(ch(controle))
  if (!C) { s.echoue(id, `contrôle ${C === null ? 'absent' : 'vide'} : ${controle}`); return }
  const ins = lireInstructions(C)
  if (!ins.length) { s.echoue(id, `${controle} ne porte aucune instruction`); return }
  for (const x of ins) if (!/^(select|with)\b/.test(x.n)) s.echoue(id, `${controle} : instruction qui n'est pas une lecture : « ${court(x.n, 90)} »`)
  // serrer (pas compacter) : un blanc reste entre deux mots — compacter collerait « insert into » en « insertinto » et
  // \b n'y verrait plus de limite de mot (le même piège que 026-032 a déjà déjoué sur ce point).
  const verbe = /\b(insert|update|delete|truncate|create|alter|drop|grant|revoke|call|copy|vacuum)\b/.exec(serrer(C).replace(/'(?:[^']|'')*'/g, "''"))
  if (verbe) s.echoue(id, `${controle} contient « ${verbe[1]} » hors des chaînes : un contrôle ne fait que lire`)
  if (!C.includes("'oui'")) s.echoue(id, `${controle} ne rend aucune ligne « oui »`)
  const cc = compacter(C)
  for (const [quoi, motifs] of [
    ['la table', ['packs_pubs']],
    ['la RLS', ['relrowsecurity']],
    ['la politique', ['pg_policies']],
    ['le bucket', [T.bucket.nom, 'storage.buckets']],
  ]) { const m = motifs.filter((mo) => !cc.includes(mo.toLowerCase())); if (m.length) s.echoue(id, `${controle} ne couvre pas ${quoi} (manque ${m.join(', ')})`) }
  if (!s.enEchec(id)) s.passe(id, `${controle} : ${ins.length} lecture(s) seulement, table, RLS, politique et bucket contrôlés, rendent « oui »`)
}

// ── --reel ────────────────────────────────────────────────────────────────────────────────────────────────────────────
class Prealable extends Error {}
async function reel() {
  lireEnvLocal(R)
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const cles = { anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service: process.env.SUPABASE_SERVICE_ROLE_KEY }
  const manque = [!url && 'NEXT_PUBLIC_SUPABASE_URL', !cles.anon && 'NEXT_PUBLIC_SUPABASE_ANON_KEY', !cles.service && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean)
  if (manque.length) throw new Prealable(`${manque.join(', ')} absent(s) de .env.local`)
  async function rest(chemin, cle) {
    try {
      const res = await fetch(`${url}${chemin}`, { headers: { apikey: cle, Authorization: `Bearer ${cle}` }, signal: AbortSignal.timeout(20_000) })
      return { status: res.status, ok: res.ok }
    } catch { return { status: 0, ok: false } }
  }
  const s = creerRapport(NOM, ['PB-REEL'], { entete: `${NOM} — --reel` })
  const table = await rest(`/rest/v1/${T.nom}?select=id&limit=1`, cles.service)
  s.verdict('PB-REEL', table.ok || table.status === 200, `table ${T.nom} lisible avec la clé de service (${table.status})`, `table ${T.nom} refusée avec la clé de service (${table.status}) : ${T.nom} n'est peut-être pas encore appliquée`)
  const bucket = await rest(`/storage/v1/bucket/${T.bucket.nom}`, cles.service)
  s.verdict('PB-REEL', bucket.ok, `bucket ${T.bucket.nom} lisible avec la clé de service (${bucket.status})`, `bucket ${T.bucket.nom} refusé avec la clé de service (${bucket.status})`)
  const anonTable = await rest(`/rest/v1/${T.nom}?select=id&limit=1`, cles.anon)
  const anonTexte = anonTable.ok ? await (async () => { try { const r = await fetch(`${url}/rest/v1/${T.nom}?select=id&limit=1`, { headers: { apikey: cles.anon, Authorization: `Bearer ${cles.anon}` } }); const j = await r.json(); return Array.isArray(j) ? j.length : -1 } catch { return -1 } })() : 0
  s.verdict('PB-REEL', !anonTable.ok || anonTexte === 0, `clé anonyme : ${anonTable.ok ? `${anonTexte} ligne(s) lue(s)` : `refusée (${anonTable.status})`} — aucune ligne attendue`, `clé anonyme : ${anonTexte} ligne(s) lue(s) sur ${T.nom} — la RLS ne ferme pas la table`)
  const anonBucket = await rest(`/storage/v1/bucket/${T.bucket.nom}`, cles.anon)
  s.verdict('PB-REEL', !anonBucket.ok, `bucket ${T.bucket.nom} refusé à la clé anonyme (${anonBucket.status})`, `bucket ${T.bucket.nom} accepté avec la clé anonyme (${anonBucket.status})`)
  return s.fin()
}

// ── Le jugement ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function juger() {
  const s = creerRapport(NOM, IDS, { entete: `${NOM} (${FICHE}) — racine ${aff(racine)}${o.temoin ? ' — témoin' : ''}` })
  if (o.temoin) {
    for (const id of IDS) if (id !== 'PB-7') s.saute(id, `témoin : critère de fabrication, prouvé par le PASS de ${FICHE}`)
    const r = nonRegression(racine, { exclus: [] })
    if (r.ok) s.passe('PB-7', r.resume); else for (const x of r.echecs) s.echoue('PB-7', x)
    for (const nom of ['jumeauNuCoupe', 'empreinte', 'lireCompteRendu', 'creerRapport', 'nonRegression']) if (typeof { jumeauNuCoupe, empreinte, lireCompteRendu, creerRapport, nonRegression }[nom] !== 'function') s.echoue('PB-7', `${nom} ne s'importe pas de scripts/lib/sql-essai.mjs`)
    return s.fin()
  }

  const m = trouverMigration()
  if (m.erreur) {
    s.echoue('PB-1', m.erreur)
    for (const id of IDS) if (id !== 'PB-1' && id !== 'PB-7') s.echoue(id, `non jugé : la migration manque ou est ambiguë (PB-1)`)
  } else {
    if (!s.enEchec('PB-1')) s.passe('PB-1', `${m.fichier} — numéro ${m.n}, porté par aucun autre fichier de supabase/migrations/`)
    const texteM = lireSi(ch(m.fichier))
    if (!texteM) { s.echoue('PB-1', `${m.fichier} absent ou vide alors que trouvé au listage`); for (const id of IDS) if (!['PB-1', 'PB-7'].includes(id)) s.echoue(id, 'non jugé : migration illisible (PB-1)') }
    else {
      juger0102(s, texteM)
      jugerJumeaux(s, 'PB-5', texteM, m.n)
      jugerControle(s, 'PB-6', m.n)
      const essai = ch('.orchestre/preuves/026-114/essai-a-sec.txt')
      const nuFichier = ch(`supabase/migrations/_A_COLLER_sql_editor_${m.n}_NU.sql`)
      if (!lireSi(nuFichier)) s.echoue('PB-8', `jumeau nu absent (${aff(path.relative(racine, nuFichier))}) : l'empreinte de l'essai ne se calcule pas`)
      else {
        const e = empreinte(jumeauNuCoupe(nuFichier))
        const cr = lireCompteRendu(essai, { empreinte: e, cles: ['table', 'rls', 'anon_refuse', 'authenticated_refuse', 'bucket_prive'] })
        if (!cr.ok) for (const r of cr.raisons) s.echoue('PB-8', `.orchestre/preuves/026-114/essai-a-sec.txt : ${r}`)
        else s.passe('PB-8', `essai à sec du jumeau ${e.slice(0, 12)}… : table, rls, anon_refuse, authenticated_refuse, bucket_prive à true, APRES rien_ne_reste=true`)
      }
    }
  }
  const r = nonRegression(racine, { exclus: m.erreur ? [] : [m.fichier, `supabase/migrations/_A_COLLER_sql_editor_${m.n}.sql`, `supabase/migrations/_A_COLLER_sql_editor_${m.n}_NU.sql`, `supabase/controles/${m.n}_packs_pubs.sql`] })
  if (r.ok) s.passe('PB-7', r.resume); else for (const x of r.echecs) s.echoue('PB-7', x)
  return s.fin()
}

if (o.reel) {
  try { process.exitCode = await reel() } catch (e) {
    if (e instanceof Prealable) { console.log(`${NOM} --reel : PRÉALABLE MANQUANT — ${e.message}`); process.exitCode = 2 }
    else { console.log(`${NOM} --reel : ERREUR — ${court(e.message, 160)}`); process.exitCode = 1 }
  }
} else process.exit(juger())
