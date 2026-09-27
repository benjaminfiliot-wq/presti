#!/usr/bin/env node
// scripts/usine-sql-qa.mjs — le juge SQL de la migration de l'usine (bucket privé `usine`, `ops_tache_detenue`, graines des
// agents `usine` et `livreur_usine`) ; écrit par Claude Code (fiche 026-052) AVANT la migration qu'il juge (026-054).
//
// Depuis le 14/09, la connexion directe à la base est refusée : le juge ne lance aucun SQL. Il juge en trois temps, comme
// scripts/ops-sql-qa.mjs : la lecture statique (instructions découpées par scripts/lib/sql-essai.mjs, commentaires ôtés par
// le tokenizer de sql-nu.mjs), l'essai à sec qu'il GÉNÈRE (--generer-essai) et dont il relit le compte rendu recopié dans
// .orchestre/preuves/026-054/essai-a-sec.txt, puis --reel après l'application par Claude Code.
//
//   US-1  un seul fichier supabase/migrations/*_usine_socle.sql, dont le numéro n'est porté par aucun autre fichier de migration.
//   US-2  le bucket : insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('usine',
//         'usine', false, 8388608, <les types du contrat, ni plus ni moins>) on conflict (id) do update set public = false,
//         file_size_limit = 8388608, allowed_mime_types = excluded.… ; aucune politique sur storage.objects ; aucun autre bucket.
//   US-3  public.ops_tache_detenue(p_agent text, p_id uuid) returns table(id uuid, type text, cle_idempotence text, capacite
//         text, charge jsonb, bail_jusqua timestamptz), stable, security definer, search_path fixé, lecture seule sur ops.taches,
//         filtre EXACTEMENT id = p_id and agent = p_agent and statut = 'bail' and bail_jusqua > now() ; puis revoke all … from
//         public, anon, authenticated ; puis grant execute … to service_role, et aucun autre droit.
//   US-4  exactement deux select public.ops_agent_enregistrer(…), argument par argument égaux aux graines du contrat ; ni
//         jeton_hash, ni en_pause, ni battement_le, ni écriture directe dans ops.agents ; ni atelier_maquettes, ni livreur, ni chef.
//   US-5  ni drop, ni delete, ni truncate, ni alter table ; aucune migration, aucun jumeau ni contrôle existant modifié
//         (nonRegression de sql-essai.mjs : git diff HEAD, ou blobs de HEAD sur une copie), migrations-jumelles-e2e.mjs vert.
//   US-6  les jumeaux _A_COLLER_sql_editor_<n>.sql (avec son pied de contrôle) et _A_COLLER_sql_editor_<n>_NU.sql équivalents
//         (sql-nu.mjs --verifier, le nu régénéré à l'identique, mêmes instructions) ; supabase/controles/<n>_usine_socle.sql
//         ne fait que lire et rend « oui » ou « non » pour le bucket, la fonction, ses droits et les deux agents.
//   US-7  essai-a-sec.txt lié au jumeau nu COURANT par son empreinte, APRES rien_ne_reste=true, chaque clé du scénario
//         scripts/fixtures/026/usine-production/essai-0110.sql à true (une migration modifiée après l'essai le rend caduc).
//   US-R  (--reel, après l'application) : le bucket existe, privé, à ses limites ; la clé anonyme n'y liste rien et ne peut pas
//         appeler ops_tache_detenue ; ops_etat() rend les deux agents à leur période.
//
// Usage :
//   node scripts/usine-sql-qa.mjs [--racine=<copie>] [--critere=US-3]     le verdict (--critere : un seul critère, preuves)
//   node scripts/usine-sql-qa.mjs --generer-essai [--racine=<copie>]       le bloc d'essai à sec sur la sortie standard
//   node scripts/usine-sql-qa.mjs --reel                                    la base réelle (.env.local lu sans rien afficher)
//   node scripts/usine-sql-qa.mjs --preuve-echecs                           autotest (AT-*), l'arbre de référence doit échouer
//        sur US-1 (PE-*), le TÉMOIN (scripts/fixtures/026/usine-production/temoin/) doit être vert (TV-1) et chaque sabotage
//        rendre son critère rouge (SB-*) ; écrit sa section de .orchestre/preuves/026-052/echecs-attendus.md.
// Codes : 0 vert · 1 un critère rouge · 2 appel invalide ou préalable manquant. N'écrit que sous .orchestre/travail/usine-sql-qa/
// (et, en --preuve-echecs, sa section de echecs-attendus.md). N'affiche aucun secret.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  R, MARQUE_CONTROLE, instructions, normaliser, codeSeul, seParse, masquer, fermante, decouperVirgules, compacter,
  jumeauNuCoupe, empreinte, blocEssai, analyserEssai, clesScenario, lireCompteRendu, nonRegression, creerRapport, lireEnvLocal,
  segments, JUMEAU_EXEMPLE,
} from './lib/sql-essai.mjs'
import * as K from './fixtures/026/usine-production/commun.mjs'

const NOM = 'usine-sql-qa'
const FICHIER = fileURLToPath(import.meta.url)
const IDS = ['US-1', 'US-2', 'US-3', 'US-4', 'US-5', 'US-6', 'US-7']
const C = K.CONTRAT
const M = C.migration
const SCENARIO = path.join(R, M.scenario)
const { court, lf, posix } = K

// ── Arguments ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2)
const CONNUS = ['racine', 'critere', 'preuve-echecs', 'reel', 'generer-essai']
for (const a of ARGS) {
  const m = /^--([a-z-]+)(=.*)?$/.exec(a)
  if (!m || !CONNUS.includes(m[1])) { console.error(`✗ ${NOM} : argument inconnu « ${a} » (--racine=, --critere=, --preuve-echecs, --reel, --generer-essai)`); process.exit(2) }
}
const opt = (n) => { const a = ARGS.find((x) => x === `--${n}` || x.startsWith(`--${n}=`)); return a === undefined ? undefined : (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) }
const RACINE = typeof opt('racine') === 'string' ? path.resolve(opt('racine')) : R
if (!K.existe(RACINE)) { console.error(`✗ ${NOM} : racine introuvable : ${RACINE}`); process.exit(2) }
const CRITERE = typeof opt('critere') === 'string' ? opt('critere') : null
if (CRITERE && !IDS.includes(CRITERE)) { console.error(`✗ ${NOM} : --critere=${CRITERE} inconnu (${IDS.join(', ')})`); process.exit(2) }
const ch = (rel) => path.join(RACINE, ...rel.split('/'))

// ── Localiser les fichiers jugés ──────────────────────────────────────────────────────────────────────────────────────
function localiser() {
  const dir = ch('supabase/migrations')
  const tous = K.existe(dir) ? fs.readdirSync(dir) : []
  const migrations = tous.filter((f) => /^\d{4}_.*\.sql$/.test(f))
  const siens = migrations.filter((f) => f.endsWith(M.suffixe))
  const num = siens.length === 1 ? siens[0].slice(0, 4) : null
  return {
    siens, num, migrations,
    homonymes: num ? migrations.filter((f) => f.startsWith(`${num}_`) && f !== siens[0]) : [],
    fichier: num ? `supabase/migrations/${siens[0]}` : null,
    jumeau: num ? `supabase/migrations/_A_COLLER_sql_editor_${num}.sql` : null,
    nu: num ? `supabase/migrations/_A_COLLER_sql_editor_${num}_NU.sql` : null,
    controle: num ? `supabase/controles/${num}${M.suffixe}` : null,
  }
}

// ── Petites lectures SQL ──────────────────────────────────────────────────────────────────────────────────────────────
const chaines = (t) => [...String(t).matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'"))
/** Les chaînes '…' d'une instruction (commentaires déjà ôtés), par le découpage de sql-essai.mjs. */
const chainesDe = (t) => segments(t).filter((x) => x.type === 'chaine').map((x) => x.texte.slice(1, -1).replace(/''/g, "'"))
/** Une valeur SQL de graine → valeur JS : 'x' → x ; array['a']::text[] / '{a,b}' → [a, b] ; 12 / 0::numeric → 12 / 0. */
function valeurSql(v) {
  let x = v.trim().replace(/::[a-z_ ]+(\[\])?$/i, '').trim()
  if (/^array\s*\[/i.test(x)) { const i = x.indexOf('['), j = x.lastIndexOf(']'); return chaines(x.slice(i, j + 1)) }
  const s = /^'((?:[^']|'')*)'$/.exec(x)
  if (s) {
    const t = s[1].replace(/''/g, "'")
    if (/^\{.*\}$/s.test(t)) return t.slice(1, -1).split(',').map((e) => e.trim().replace(/^"|"$/g, '')).filter(Boolean)
    return t
  }
  if (/^-?\d+(\.\d+)?$/.test(x)) return Number(x)
  if (/^(true|false)$/i.test(x)) return x.toLowerCase() === 'true'
  return { brut: x }
}
const memeEnsemble = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && [...a].sort().join('\u0000') === [...b].sort().join('\u0000')
/** Les arguments d'un appel `f(…)` (positionnels, ou nommés p_x => v / p_x := v) rangés dans l'ordre des paramètres. */
function argumentsDe(appel, params) {
  const mq = masquer(appel)
  const i = mq.indexOf('(')
  const j = i >= 0 ? fermante(mq, i) : -1
  if (i < 0 || j < 0) return { erreur: 'parenthèses introuvables' }
  const bruts = decouperVirgules(appel.slice(i + 1, j))
  const nommes = bruts.map((b) => /^([a-z_]+)\s*(=>|:=)\s*([\s\S]+)$/i.exec(b))
  if (nommes.some(Boolean)) {
    if (!nommes.every(Boolean)) return { erreur: 'notation mêlée (positionnelle et nommée)' }
    const o = Object.fromEntries(nommes.map((m) => [m[1].toLowerCase(), m[3]]))
    const inconnus = Object.keys(o).filter((k) => !params.includes(k))
    if (inconnus.length) return { erreur: `paramètre(s) inconnu(s) : ${inconnus.join(', ')}` }
    return { valeurs: params.map((p) => (p in o ? o[p] : null)) }
  }
  return { valeurs: bruts }
}
/** Le texte d'une instruction sans les blocs $tag$ (leur corps compte à part). */
const horsCorps = (t) => segments(t).map((s) => (s.type === 'dollar' ? '$$' : s.texte)).join('')

// ── Les critères ─────────────────────────────────────────────────────────────────────────────────────────────────────
function juger() {
  const ids = CRITERE ? [CRITERE] : IDS
  const s = creerRapport(NOM, ids, { entete: `${NOM} — racine ${RACINE === R ? '(le dépôt)' : posix(path.relative(R, RACINE)) || RACINE}` })
  const veut = (id) => ids.includes(id)
  const L = localiser()
  const texte = L.fichier ? K.lireSi(ch(L.fichier)) : null

  if (veut('US-1')) {
    if (L.siens.length !== 1) s.echoue('US-1', `${L.siens.length} fichier(s) supabase/migrations/*${M.suffixe} (un seul attendu)${L.siens.length ? ` : ${L.siens.join(', ')}` : ''}`)
    else if (L.homonymes.length) s.echoue('US-1', `le numéro ${L.num} est aussi porté par ${L.homonymes.join(', ')}`)
    else if (!texte) s.echoue('US-1', `${L.fichier} ${texte === null ? 'illisible' : 'de 0 octet'}`)
    else s.passe('US-1', `${L.fichier}, numéro ${L.num} porté par lui seul`)
  }
  if (!texte) {
    for (const id of ids.filter((x) => x !== 'US-1')) s.echoue(id, `non jugé : pas de migration *${M.suffixe} unique et lisible (US-1)`)
    return s.fin()
  }
  const ins = instructions(texte)
  const norm = ins.map((x) => normaliser(x))
  const p = seParse(texte)
  if (!p.ok) for (const id of ids.filter((x) => x !== 'US-1')) s.echoue(id, `${L.fichier} ne se parse pas : ${p.raisons.slice(0, 2).join(' ; ')}`)

  // ── US-2 : le bucket ──
  if (veut('US-2')) {
    const id = 'US-2'
    const B = C.bucket
    const inserts = norm.filter((n) => /^insert into storage\.buckets\b/.test(n))
    if (inserts.length !== 1) s.echoue(id, `${inserts.length} insert into storage.buckets (un seul attendu)`)
    else {
      const m = /^insert into storage\.buckets\((.*?)\) values\((.*)\) on conflict\(id\) do update set (.*)$/s.exec(inserts[0])
      if (!m) s.echoue(id, `forme attendue « insert into storage.buckets (…) values (…) on conflict (id) do update set … » : ${court(inserts[0], 140)}`)
      else {
        const cols = decouperVirgules(m[1]).map((x) => x.trim())
        const vals = decouperVirgules(m[2])
        const attendues = ['id', 'name', 'public', 'file_size_limit', 'allowed_mime_types']
        if (JSON.stringify(cols) !== JSON.stringify(attendues)) s.echoue(id, `colonnes (${cols.join(', ')}) ≠ (${attendues.join(', ')})`)
        else {
          const v = vals.map(valeurSql)
          if (v[0] !== B.id || v[1] !== B.name) s.echoue(id, `id et name : ${JSON.stringify(v.slice(0, 2))} (« usine » attendu)`)
          if (v[2] !== false) s.echoue(id, `public = ${court(vals[2], 30)} (false attendu : le bucket est privé)`)
          if (v[3] !== B.file_size_limit) s.echoue(id, `file_size_limit = ${court(vals[3], 30)} (${B.file_size_limit} attendu)`)
          if (!memeEnsemble(v[4], B.allowed_mime_types)) {
            const t = Array.isArray(v[4]) ? v[4] : []
            s.echoue(id, `types permis ≠ ceux du contrat : en trop ${JSON.stringify(t.filter((x) => !B.allowed_mime_types.includes(x)))}, manquants ${JSON.stringify(B.allowed_mime_types.filter((x) => !t.includes(x)))}${t.length !== new Set(t).size ? ', doublons' : ''}`)
          }
        }
        const set = Object.fromEntries(decouperVirgules(m[3]).map((a) => { const x = /^([a-z_]+)\s*=\s*([\s\S]+)$/.exec(a.trim()); return x ? [x[1], x[2].trim()] : [a, null] }))
        if (set.public !== 'false') s.echoue(id, `on conflict : public = ${set.public ?? '(absent)'} (false attendu)`)
        if (!['8388608', 'excluded.file_size_limit'].includes(set.file_size_limit)) s.echoue(id, `on conflict : file_size_limit = ${set.file_size_limit ?? '(absent)'} (8388608 attendu)`)
        const typesSet = set.allowed_mime_types
        if (!(typesSet === 'excluded.allowed_mime_types' || (typesSet && memeEnsemble(valeurSql(typesSet), B.allowed_mime_types)))) s.echoue(id, `on conflict : allowed_mime_types = ${court(typesSet ?? '(absent)', 60)} (excluded.allowed_mime_types attendu)`)
      }
    }
    const politiques = norm.filter((n) => /^(create|alter) policy\b/.test(n) && /\bon storage\.objects\b/.test(n))
    if (politiques.length) s.echoue(id, `${politiques.length} politique(s) sur storage.objects : ${court(politiques[0], 100)}`)
    const autres = norm.filter((n) => /\bstorage\.(buckets|objects)\b/.test(horsCorps(n)) && !/^insert into storage\.buckets\b/.test(n) && !/^(create|alter) policy\b/.test(n))
    if (autres.length) s.echoue(id, `instruction(s) en plus sur le stockage : ${court(autres[0], 100)}`)
    const autresBuckets = chaines(inserts[0] || '').filter((x) => ['sites', 'maquettes', 'photos'].includes(x))
    if (autresBuckets.length) s.echoue(id, `un autre bucket est touché : ${autresBuckets.join(', ')}`)
    if (!s.enEchec(id)) s.passe(id, `bucket « usine » privé, ${B.file_size_limit} octets par fichier, ${B.allowed_mime_types.length} types (ceux du contrat), on conflict qui le garde privé ; aucune politique sur storage.objects`)
  }

  // ── US-3 : la fonction et ses droits ──
  if (veut('US-3')) {
    const id = 'US-3'
    const F = C.fonction
    const k = norm.findIndex((n) => /^create (or replace )?function public\.ops_tache_detenue\(/.test(n))
    const nCreate = norm.filter((n) => /^create (or replace )?function (public\.)?ops_tache_detenue\b/.test(n)).length
    if (k < 0 || nCreate !== 1) s.echoue(id, `${nCreate} « create or replace function public.ops_tache_detenue(…) » (une attendue, qualifiée public.)`)
    else {
      const t = norm[k]
      const mq = masquer(t)
      const i = mq.indexOf('('), j = fermante(mq, i)
      const params = decouperVirgules(t.slice(i + 1, j)).map((x) => x.trim().split(/\s+/))
      if (JSON.stringify(params) !== JSON.stringify(F.params)) s.echoue(id, `paramètres (${params.map((x) => x.join(' ')).join(', ')}) ≠ (${F.params.map((x) => x.join(' ')).join(', ')})`)
      const reste = t.slice(j + 1)
      const rt = /^\s*returns table\(/.exec(reste)
      if (!rt) s.echoue(id, `ne rend pas « returns table(…) » : ${court(reste, 80)}`)
      else {
        const mr = masquer(reste), a = reste.indexOf('('), b = fermante(mr, a)
        const cols = decouperVirgules(reste.slice(a + 1, b)).map((x) => x.trim().split(/\s+/))
        const syn = (ty) => ({ 'timestamp with time zone': 'timestamptz' }[ty] || ty)
        const colsN = cols.map(([n, ...ty]) => [n, syn(ty.join(' '))])
        if (JSON.stringify(colsN) !== JSON.stringify(F.rend)) s.echoue(id, `returns table(${colsN.map((x) => x.join(' ')).join(', ')}) ≠ table(${F.rend.map((x) => x.join(' ')).join(', ')})`)
        const attributs = horsCorps(reste.slice(b + 1))
        if (!/\bstable\b/.test(attributs) || /\b(volatile|immutable)\b/.test(attributs)) s.echoue(id, 'pas « stable » (lecture seule, sans effet)')
        if (!/\bsecurity definer\b/.test(attributs)) s.echoue(id, 'pas « security definer » (ops.taches est fermée)')
        const sp = /\bset search_path\s*(=|to)\s*([^$]*?)(?=\s+(as|language|stable|security|volatile|immutable|strict|parallel|cost|rows)\b|\s*\$\$|$)/.exec(attributs)
        if (!sp) s.echoue(id, 'search_path non fixé (« set search_path = … » attendu)')
        else if (/\$user|""/.test(sp[2]) || !sp[2].trim()) s.echoue(id, `search_path « ${sp[2].trim()} » : des schémas nommés attendus`)
        if (!/\blanguage (sql|plpgsql)\b/.test(attributs)) s.echoue(id, 'langage ni sql ni plpgsql')
        const corpsSeg = segments(t).filter((x) => x.type === 'dollar')
        if (corpsSeg.length !== 1) s.echoue(id, `${corpsSeg.length} corps $…$ (un attendu)`)
        else {
          const corps = corpsSeg[0].corps
          const cs = codeSeul(corps)
          const nc = normaliser(corps)
          const ecrit = /\b(insert|update|delete|truncate|perform|execute|merge|notify|raise)\b/.exec(cs) || /\bops_[a-z_]+\s*\(/.exec(cs)
          if (ecrit) s.echoue(id, `le corps n'est pas une lecture seule sans événement : « ${ecrit[0]} »`)
          if (!/\bops\.taches\b/.test(cs) && !/\bfrom taches\b/.test(cs)) s.echoue(id, 'le corps ne lit pas ops.taches')
          const w = /\bwhere\b([\s\S]*?)(?=\blimit\b|\border by\b|\bfor update\b|\bgroup by\b|;|\bend\b\s*;?\s*$|$)/.exec(nc)
          if (!w) s.echoue(id, 'aucun where dans le corps')
          else {
            const clause = w[1].trim()
            const conds = clause.split(/\band\b/).map((c) => c.replace(/\s+/g, '').replace(/\b(?:[a-z_]+\.)+(?=[a-z_]+\b)/g, ''))
            const canon = (c) => {
              let m = /^(.+?)(=|<>|>=|<=|>|<)(.+)$/.exec(c)
              if (!m) return c
              let [, g, op, d] = m
              if (op === '<' && /^now\(\)$/.test(g)) { [g, d, op] = [d, g, '>'] }
              if (op === '=') { const x = [g, d].sort((u, v) => (u.startsWith('p_') ? 1 : 0) - (v.startsWith('p_') ? 1 : 0) || (u.startsWith("'") ? 1 : 0) - (v.startsWith("'") ? 1 : 0)); [g, d] = x }
              return `${g}${op}${d}`
            }
            const vus = conds.map(canon).filter(Boolean)
            const attendus = F.filtre.map((c) => canon(c.replace(/\s+/g, '')))
            const enTrop = vus.filter((c) => !attendus.includes(c)), absents = attendus.filter((c) => !vus.includes(c))
            if (/\bor\b/.test(clause)) s.echoue(id, `le filtre porte un « or » : ${court(clause, 100)}`)
            if (enTrop.length || absents.length || vus.length !== attendus.length) s.echoue(id, `filtre ≠ « ${F.filtre.join(' and ')} » : ${absents.length ? `manque ${absents.join(', ')}` : ''}${absents.length && enTrop.length ? ' ; ' : ''}${enTrop.length ? `en trop ${enTrop.join(', ')}` : ''}`)
          }
        }
      }
      const sig = /^(revoke|grant) (.+?) on function public\.ops_tache_detenue\((text, ?uuid)?\) (from|to) (.+)$/
      const droits = norm.map((n, x) => [n, x]).filter(([n]) => /\bops_tache_detenue\b/.test(horsCorps(n)) && /^(revoke|grant|alter function|alter default privileges)\b/.test(n))
      const rev = droits.filter(([n]) => /^revoke\b/.test(n)), gr = droits.filter(([n]) => /^grant\b/.test(n))
      const autresD = droits.filter(([n]) => !/^(revoke|grant)\b/.test(n))
      if (autresD.length) s.echoue(id, `droit(s) en plus : ${court(autresD[0][0], 100)}`)
      if (rev.length !== 1) s.echoue(id, `${rev.length} revoke sur la fonction (un « revoke all … from public, anon, authenticated » attendu)`)
      else {
        const mm = sig.exec(rev[0][0])
        const roles = mm ? mm[5].split(',').map((x) => x.trim()) : []
        if (!mm || mm[2] !== 'all' || !mm[3]) s.echoue(id, `revoke mal formé : ${court(rev[0][0], 100)} (revoke all on function public.ops_tache_detenue(text, uuid) attendu)`)
        else if (!['public', 'anon', 'authenticated'].every((r) => roles.includes(r)) || roles.includes('service_role')) s.echoue(id, `revoke from ${roles.join(', ')} (public, anon, authenticated attendus, jamais service_role)`)
        if (rev[0][1] < k) s.echoue(id, 'le revoke précède la création de la fonction')
      }
      if (gr.length !== 1) s.echoue(id, `${gr.length} grant sur la fonction (un seul, à service_role, attendu)`)
      else {
        const mm = sig.exec(gr[0][0])
        const roles = mm ? mm[5].split(',').map((x) => x.trim()) : []
        if (!mm || mm[2] !== 'execute' || !mm[3] || roles.length !== 1 || roles[0] !== 'service_role') s.echoue(id, `grant ≠ « grant execute on function public.ops_tache_detenue(text, uuid) to service_role » : ${court(gr[0][0], 100)}`)
        if (rev.length === 1 && gr[0][1] < rev[0][1]) s.echoue(id, 'le grant précède le revoke all (il serait retiré)')
      }
    }
    if (!s.enEchec(id)) s.passe(id, `public.ops_tache_detenue(p_agent text, p_id uuid) : table à ${F.rend.length} colonnes, stable, security definer, search_path fixé, filtre exact « ${F.filtre.join(' and ')} », revoke public/anon/authenticated puis grant execute à service_role seul`)
  }

  // ── US-4 : les graines ──
  if (veut('US-4')) {
    const id = 'US-4'
    const params = (JSON.parse(fs.readFileSync(path.join(R, 'scripts', 'fixtures', '026-horloge-bus', 'contrat-ops.json'), 'utf8')).fonctions.ops_agent_enregistrer.params).map(([n]) => n)
    const champs = ['nom', 'libelle', 'capacites', 'types_crees', 'tables', 'periode_minutes', 'debit_minute', 'quota_creations_jour', 'plafond_euros_jour']
    const appels = ins.filter((x) => /\bops_agent_enregistrer\b/i.test(horsCorps(x)))
    const selects = appels.filter((x) => /^select public\.ops_agent_enregistrer\s*\(/i.test(x.trim()))
    if (appels.length !== 2 || selects.length !== 2) s.echoue(id, `${appels.length} appel(s) d'ops_agent_enregistrer dont ${selects.length} « select public.ops_agent_enregistrer(…) » (deux attendus)`)
    const vus = []
    for (const a of selects) {
      const r = argumentsDe(a, params)
      if (r.erreur) { s.echoue(id, `graine illisible (${r.erreur}) : ${court(a, 100)}`); continue }
      if (r.valeurs.length !== params.length || r.valeurs.some((v) => v === null)) { s.echoue(id, `graine à ${r.valeurs.length} argument(s) (${params.length} attendus, aucun défaut) : ${court(a, 100)}`); continue }
      const v = r.valeurs.map(valeurSql)
      const g = C.graines.find((x) => x.nom === v[0])
      if (!g) { s.echoue(id, `graine d'un agent hors contrat : « ${court(v[0], 40)} »`); continue }
      vus.push(g.nom)
      champs.forEach((c, n) => {
        const att = g[c], eu = v[n]
        const ok = Array.isArray(att) ? memeEnsemble(eu, att) : eu === att
        if (!ok) s.echoue(id, `${g.nom} : ${params[n]} = ${court(r.valeurs[n], 60)} (${JSON.stringify(att)} attendu)`)
      })
    }
    for (const g of C.graines) if (!vus.includes(g.nom)) s.echoue(id, `graine de ${g.nom} absente`)
    if (new Set(vus).size !== vus.length) s.echoue(id, 'une graine en double')
    const tout = normaliser(texte)
    for (const col of C.colonnes_intouchables) if (new RegExp(`\\b${col}\\b`).test(tout)) s.echoue(id, `la migration mentionne ${col} (le jeton, la pause et le battement ne se sèment pas)`)
    if (/\b(insert into|update|delete from) ops\.agents\b/.test(tout)) s.echoue(id, 'écriture directe dans ops.agents (les graines passent par ops_agent_enregistrer)')
    const touches = ins.flatMap(chainesDe).filter((x) => C.graines_intouchables.includes(x))
    if (touches.length) s.echoue(id, `la migration touche ${[...new Set(touches)].join(', ')} (leurs graines sont celles de 0105)`)
    if (!s.enEchec(id)) s.passe(id, `deux graines par select public.ops_agent_enregistrer(…), argument par argument égales au contrat (${C.graines.map((g) => `${g.nom} ${g.periode_minutes} min`).join(', ')}) ; ni ${C.colonnes_intouchables.join(', ')}, ni ${C.graines_intouchables.join(', ')}`)
  }

  // ── US-5 : rien de destructeur, aucune migration existante changée ──
  if (veut('US-5')) {
    const id = 'US-5'
    const tout = normaliser(texte)
    const destructif = /\b(drop|delete|truncate)\b/.exec(tout)
    if (destructif) s.echoue(id, `« ${destructif[1]} » dans la migration`)
    if (/\balter table\b/.test(tout)) s.echoue(id, '« alter table » dans la migration (elle ne crée aucune table : toute table altérée existe déjà)')
    const r = nonRegression(RACINE, { exclus: [L.fichier, L.jumeau, L.nu, L.controle] })
    if (!r.ok) for (const e of r.echecs) s.echoue(id, e)
    if (!s.enEchec(id)) s.passe(id, `ni drop, ni delete, ni truncate, ni alter table ; ${r.resume}`)
  }

  // ── US-6 : jumeaux et contrôle ──
  if (veut('US-6')) {
    const id = 'US-6'
    const J = K.lireSi(ch(L.jumeau)), N = K.lireSi(ch(L.nu)), Ctl = K.lireSi(ch(L.controle))
    const tmp = K.vider(K.dossierTravail(NOM, 'jumeaux'))
    const nodeSqlNu = (args) => spawnSync(process.execPath, [path.join(R, 'scripts', 'sql-nu.mjs'), ...args], { encoding: 'utf8', windowsHide: true, timeout: 60_000 })
    if (!J || !N) s.echoue(id, `jumeau(x) absent(s) ou de 0 octet : ${[!J && L.jumeau, !N && L.nu].filter(Boolean).join(', ')}`)
    else {
      for (const [nom, x] of [[L.jumeau, J], [L.nu, N]]) { const q = seParse(x); if (!q.ok) s.echoue(id, `${nom} ne se parse pas : ${q.raisons.slice(0, 2).join(' ; ')}`) }
      if (!J.includes(MARQUE_CONTROLE)) s.echoue(id, `${L.jumeau} n'a pas de pied de contrôle (la marque de sql-nu.mjs)`)
      else {
        const pied = J.split(MARQUE_CONTROLE)[1]
        for (const x of instructions(pied)) if (!/^(select|with)\b/i.test(x.trim())) s.echoue(id, `${L.jumeau} : le pied n'est pas une lecture : « ${court(x, 80)} »`)
      }
      for (const [nom, x] of [[L.jumeau, J], [L.nu, N]]) {
        const f = path.join(tmp, `coupe-${path.basename(nom)}`)
        fs.writeFileSync(f, x.split(MARQUE_CONTROLE)[0])
        const v = nodeSqlNu(['--verifier', ch(L.fichier), f])
        if (v.status !== 0) s.echoue(id, `sql-nu.mjs --verifier ${L.fichier} ${nom} (coupé à la marque) en code ${v.status} : ${court(`${v.stdout}${v.stderr}`, 200)}`)
      }
      const a = ins.map(normaliser), b = instructions(jumeauNuCoupe(ch(L.nu))).map(normaliser)
      const d = a.findIndex((x, i) => x !== b[i])
      if (d >= 0 || a.length !== b.length) s.echoue(id, `la migration a ${a.length} instruction(s), le nu coupé ${b.length} ; première différence à l'instruction ${(d >= 0 ? d : Math.min(a.length, b.length)) + 1}`)
      // le nu sort de sql-nu.mjs (avec ou sans --controle), en-tête excepté
      const essais = [[], Ctl ? ['--controle', ch(L.controle)] : null].filter(Boolean).map((extra, n) => {
        const dest = path.join(tmp, `n${n}`, path.basename(L.nu)); fs.mkdirSync(path.dirname(dest), { recursive: true })
        const g = nodeSqlNu([ch(L.fichier), dest, ...extra])
        return g.status === 0 ? lf(fs.readFileSync(dest, 'utf8')).split('\n').slice(1).join('\n') : null
      })
      if (!essais.some((x) => x !== null && x === N.split('\n').slice(1).join('\n'))) s.echoue(id, `${L.nu} n'est pas la sortie de sql-nu.mjs sur la migration (ni avec --controle ${L.controle}, ni sans)`)
    }
    if (!Ctl) s.echoue(id, `contrôle ${Ctl === null ? 'absent' : 'de 0 octet'} : ${L.controle}`)
    else {
      const ci = instructions(Ctl)
      if (!ci.length) s.echoue(id, `${L.controle} ne porte aucune instruction`)
      for (const x of ci) if (!/^(select|with)\b/i.test(x.trim())) s.echoue(id, `${L.controle} : instruction qui n'est pas une lecture : « ${court(x, 80)} »`)
      const verbe = /\b(insert|update|delete|truncate|create|alter|drop|grant|revoke|call|copy|vacuum|comment|do|perform|set|reset|select\s+set_config)\b/.exec(codeSeul(Ctl))
      if (verbe) s.echoue(id, `${L.controle} contient « ${verbe[1]} » hors des chaînes : un contrôle ne fait que lire`)
      const cc = compacter(Ctl)
      for (const [quoi, re] of [["'oui'", /'oui'/], ["'non'", /'non'/], ['storage.buckets', /storage\.buckets/], ["'usine'", /'usine'/], ['ops_tache_detenue', /ops_tache_detenue/], ['service_role', /service_role/], ["'livreur_usine'", /'livreur_usine'/], ['periode_minutes', /periode_minutes/]]) {
        if (!re.test(cc)) s.echoue(id, `${L.controle} ne lit pas ${quoi}`)
      }
    }
    if (!s.enEchec(id)) s.passe(id, `jumeaux ${path.basename(L.jumeau)} (pied de contrôle en lecture) et ${path.basename(L.nu)} équivalents à la migration (sql-nu --verifier, nu régénéré, ${ins.length} instructions) ; ${path.basename(L.controle)} ne fait que lire et répond oui/non pour le bucket, la fonction, ses droits et les deux agents`)
  }

  // ── US-7 : l'essai à sec ──
  if (veut('US-7')) {
    const id = 'US-7'
    const sc = K.lireSi(SCENARIO)
    const N = K.lireSi(ch(L.nu))
    if (!sc) s.echoue(id, `scénario absent ou vide : ${M.scenario}`)
    else if (!N) s.echoue(id, `jumeau nu absent ou vide (${L.nu}) : l'empreinte de l'essai ne se calcule pas`)
    else {
      const cles = clesScenario(sc)
      const e = empreinte(jumeauNuCoupe(ch(L.nu)))
      const cr = lireCompteRendu(ch(M.essai_a_sec), { empreinte: e, cles })
      if (!cr.ok) for (const x of cr.raisons) s.echoue(id, `${M.essai_a_sec} : ${x}`)
      else s.passe(id, `essai à sec du jumeau courant ${e.slice(0, 12)}… : ${cles.length} clés à true, APRES rien_ne_reste=true`)
    }
  }
  return s.fin()
}

// ── --generer-essai ──────────────────────────────────────────────────────────────────────────────────────────────────
function genererEssai() {
  const L = localiser()
  if (!L.nu || !K.lireSi(ch(L.nu))) { console.error(`✗ ${NOM} : préalable manquant : jumeau nu de la migration de l'usine absent ou vide (racine ${posix(RACINE)})`); process.exit(2) }
  const nu = jumeauNuCoupe(ch(L.nu))
  const sc = K.lireSi(SCENARIO)
  if (!sc) { console.error(`✗ ${NOM} : scénario absent ou vide : ${M.scenario}`); process.exit(2) }
  let bloc
  try { bloc = blocEssai({ nus: [nu], scenario: sc, empreinte: empreinte(nu) }) } catch (e) { console.error(`✗ ${NOM} : ${e.message}`); process.exit(1) }
  const a = analyserEssai(bloc, { nus: [nu] })
  if (!a.ok) { console.error(`✗ ${NOM} : bloc d'essai invalide — ${a.raisons.join(' ; ')}`); process.exit(1) }
  process.stdout.write(bloc)
  console.error(`-- ${NOM} : essai à sec de ${L.num}, empreinte ${empreinte(nu).slice(0, 12)}… ; après l'exécution : ${M.apres} → « APRES rien_ne_reste=<valeur> » dans ${M.essai_a_sec}`)
  process.exit(0)
}

// ── --reel ───────────────────────────────────────────────────────────────────────────────────────────────────────────
async function reel() {
  const s = creerRapport(NOM, ['US-R'], { entete: `${NOM} --reel` })
  lireEnvLocal(R)
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!/^https:\/\//.test(url) || !anon || !service) { console.error(`✗ ${NOM} --reel : préalable manquant (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY dans .env.local)`); return 2 }
  const appel = async (chemin, cle, { methode = 'POST', corps } = {}) => {
    try {
      const r = await fetch(`${url}${chemin}`, { method: methode, headers: { apikey: cle, authorization: `Bearer ${cle}`, 'content-type': 'application/json' }, body: corps === undefined ? undefined : JSON.stringify(corps) })
      const t = await r.text(); let j = null; try { j = JSON.parse(t) } catch { /* texte */ }
      return { status: r.status, json: j }
    } catch (e) { return { status: 0, json: null, erreur: e.message } }
  }
  const B = C.bucket
  const b = await appel(`/storage/v1/bucket/${B.id}`, service, { methode: 'GET' })
  if (b.status !== 200 || !b.json) s.echoue('US-R', `bucket ${B.id} : statut ${b.status} (la migration est-elle appliquée ?)`)
  else {
    if (b.json.public !== false) s.echoue('US-R', `bucket ${B.id} public = ${b.json.public}`)
    if (Number(b.json.file_size_limit) !== B.file_size_limit) s.echoue('US-R', `bucket ${B.id} : file_size_limit ${b.json.file_size_limit}`)
    if (!memeEnsemble(b.json.allowed_mime_types || [], B.allowed_mime_types)) s.echoue('US-R', `bucket ${B.id} : types permis ≠ contrat`)
  }
  const l = await appel(`/storage/v1/object/list/${B.id}`, anon, { corps: { prefix: '', limit: 10, offset: 0 } })
  if (l.status === 200 && Array.isArray(l.json) && l.json.length) s.echoue('US-R', `la clé anonyme liste ${l.json.length} objet(s) du bucket ${B.id}`)
  const f = await appel('/rest/v1/rpc/ops_tache_detenue', anon, { corps: { p_agent: 'livreur_usine', p_id: '00000000-0000-4000-8000-000000000000' } })
  if (f.status < 400) s.echoue('US-R', `ops_tache_detenue appelée avec la clé anonyme : statut ${f.status} (refus attendu)`)
  const e = await appel('/rest/v1/rpc/ops_etat', service, { corps: {} })
  const agents = Array.isArray(e.json?.agents) ? e.json.agents : []
  for (const g of C.graines) {
    const a = agents.find((x) => x.nom === g.nom)
    if (!a) s.echoue('US-R', `ops_etat() ne rend pas l'agent ${g.nom}`)
    else if (Number(a.periode_minutes) !== g.periode_minutes) s.echoue('US-R', `${g.nom} : période ${a.periode_minutes} (${g.periode_minutes} attendue)`)
  }
  if (!s.enEchec('US-R')) s.passe('US-R', `bucket ${B.id} privé à ses limites ; la clé anonyme n'y liste rien et ne peut pas appeler ops_tache_detenue (${f.status}) ; ops_etat() rend ${C.graines.map((g) => `${g.nom} (${g.periode_minutes} min)`).join(' et ')}`)
  return s.fin()
}

// ── --preuve-echecs ──────────────────────────────────────────────────────────────────────────────────────────────────
const SABOTAGES = [
  ['US-1', 'supabase/migrations/0110_usine_socle.sql', null, 'supabase/migrations/0111_usine_socle.sql', 'une seconde migration *_usine_socle.sql'],
  ['US-1', 'supabase/controles/0110_usine_socle.sql', null, 'supabase/migrations/0110_autre_chose.sql', 'le numéro 0110 porté par une autre migration'],
  ['US-2', 'supabase/migrations/0110_usine_socle.sql', "values ('usine', 'usine', false,", "values ('usine', 'usine', true,"],
  ['US-2', 'supabase/migrations/0110_usine_socle.sql', "'application/xml', 'text/xml']::text[])", "'application/xml']::text[])"],
  ['US-2', 'supabase/migrations/0110_usine_socle.sql', 'do update set public = false,', 'do update set public = true,'],
  ['US-2', 'supabase/migrations/0110_usine_socle.sql', '-- La tâche détenue', 'create policy "usine_lecture" on storage.objects for select using (bucket_id = \'usine\');\n-- La tâche détenue'],
  ['US-3', 'supabase/migrations/0110_usine_socle.sql', 'language sql stable security definer', 'language sql stable'],
  ['US-3', 'supabase/migrations/0110_usine_socle.sql', ' and t.bail_jusqua > now()', ''],
  ['US-3', 'supabase/migrations/0110_usine_socle.sql', "t.statut = 'bail'", "t.statut in ('bail', 'file')"],
  ['US-3', 'supabase/migrations/0110_usine_socle.sql', 'to service_role;', 'to service_role, authenticated;'],
  ['US-3', 'supabase/migrations/0110_usine_socle.sql', 'from public, anon, authenticated;', 'from public;'],
  ['US-3', 'supabase/migrations/0110_usine_socle.sql', 'set search_path = pg_catalog, ops ', ''],
  ['US-4', 'supabase/migrations/0110_usine_socle.sql', "array['evenements', 'decisions']::text[], 30, 30, 2, 0);", "array['evenements', 'decisions']::text[], 30, 30, 5, 0);"],
  ['US-4', 'supabase/migrations/0110_usine_socle.sql', "'Livreur de sites (usine)'", "'Livreur de sites'"],
  ['US-4', 'supabase/migrations/0110_usine_socle.sql', "array['taches', 'evenements']::text[], 60, 30, 0, 0);", "array['taches', 'evenements']::text[], 60, 30, 0, 0);\nupdate ops.agents set en_pause = false where nom = 'livreur_usine';"],
  ['US-4', 'supabase/migrations/0110_usine_socle.sql', "array['taches', 'evenements']::text[], 60, 30, 0, 0);", "array['taches', 'evenements']::text[], 60, 30, 0, 0);\nselect public.ops_agent_enregistrer('livreur', 'Livreur', array['livraison']::text[], array[]::text[], array['taches']::text[], 15, 30, 0, 0);"],
  ['US-5', 'supabase/migrations/0110_usine_socle.sql', '-- Les deux agents', 'delete from storage.objects where bucket_id = \'usine\';\n-- Les deux agents'],
  ['US-5', 'supabase/migrations/0096_ops_socle.sql', 'create table if not exists ops.agents (', 'create table if not exists ops.agents ( -- modifiée après coup'],
  ['US-6', 'supabase/migrations/_A_COLLER_sql_editor_0110_NU.sql', "array['surveillance']::text[]", "array['surveillance', 'livraison']::text[]"],
  ['US-6', 'supabase/controles/0110_usine_socle.sql', "then 'oui' else 'non' end;", "then 'oui' else 'non' end;\nupdate ops.agents set periode_minutes = 60 where nom = 'livreur_usine';"],
  ['US-6', 'supabase/migrations/_A_COLLER_sql_editor_0110.sql', "grant execute on function public.ops_tache_detenue(text, uuid) to service_role;", "grant execute on function public.ops_tache_detenue(text, uuid) to service_role, anon;"],
  ['US-7', '.orchestre/preuves/026-054/essai-a-sec.txt', 'APRES rien_ne_reste=true', 'APRES rien_ne_reste=false'],
  ['US-7', '.orchestre/preuves/026-054/essai-a-sec.txt', '"pas_pour_bail_expire":true', '"pas_pour_bail_expire":false'],
  ['US-7', 'supabase/migrations/_A_COLLER_sql_editor_0110_NU.sql', ' — coller ce fichier EN ENTIER.', ' — coller ce fichier EN ENTIER, régénéré après l\'essai.', 'le jumeau nu changé après l\'essai (même SQL, autre empreinte)'],
]

/**
 * Le témoin devient un dépôt Git dont l'unique commit est supabase/ de HEAD, les fichiers du témoin (0110 et ses jumeaux)
 * laissés hors du commit : US-5 y juge par « git diff HEAD », comme dans le dépôt, au lieu de relire chaque migration par un
 * git par fichier (plusieurs minutes sur un poste chargé). Une migration existante sabotée reste un changement que git voit.
 * core.autocrlf est fixé à false dans ce dépôt : les octets extraits de HEAD sont comparés tels quels.
 */
function temoinGit(dest, superposes) {
  const g = (args) => {
    const r = spawnSync('git', ['-c', 'user.name=juge-026-052', '-c', 'user.email=juge-026-052@exemple.invalid', ...args], { cwd: dest, encoding: 'utf8', windowsHide: true })
    if (r.status !== 0) throw new Error(`git ${args[0]} dans le témoin : ${court(r.stderr || r.stdout, 160)}`)
    return r.stdout
  }
  g(['init', '-q'])
  g(['config', 'core.autocrlf', 'false'])
  g(['add', '-A', '--', 'supabase'])
  const nouveaux = superposes.filter((x) => x.startsWith('supabase/'))
  if (nouveaux.length) g(['rm', '-q', '--cached', '--', ...nouveaux])
  g(['commit', '-q', '--no-verify', '-m', 'supabase/ de HEAD (témoin de usine-sql-qa, 026-052)'])
  const reste = g(['status', '--porcelain', '--', 'supabase']).split('\n').filter(Boolean)
  const attendus = nouveaux.map((x) => `?? ${x}`).sort()
  if (JSON.stringify(reste.sort()) !== JSON.stringify(attendus)) throw new Error(`dépôt du témoin : état inattendu après le commit (${court(reste.join(' | '), 160)})`)
}

async function preuveEchecs() {
  const T = ['AT-1', 'AT-2', 'AT-3', 'PE-1', 'PE-2', 'TV-1', 'SB-1', 'PE-3']
  const s = creerRapport(`${NOM} --preuve-echecs`, T)
  const at = []
  const note = (id, ok, m) => { at.push({ id, ok, m }); s.verdict(id, ok, m) }
  // AT-1 : le contrat se relit et ses limites sont cohérentes
  {
    const D = []
    let relu = null
    try { relu = JSON.parse(fs.readFileSync(K.CONTRAT_F, 'utf8')) } catch (e) { D.push(`contrat-usine.json illisible : ${e.message}`) }
    if (relu) {
      const Li = relu.limites?.livraison, B = relu.bucket
      if (!Li || !B) D.push('limites.livraison ou bucket absents')
      else {
        if (!memeEnsemble(Li.types, B.allowed_mime_types)) D.push('types de la capacité ≠ types du bucket')
        if (!(B.file_size_limit >= Li.octets_fichier_max)) D.push('le bucket refuserait un fichier permis par la capacité')
        if (!(Li.octets_total_max >= Li.octets_fichier_max && Li.fichiers_max > 0 && Li.entrees_max > 0)) D.push('limites incohérentes')
        if (B.public !== false) D.push('le bucket du contrat est public')
        for (const [ext, types] of Object.entries(relu.extensions)) for (const t of types) if (!Li.types.includes(t)) D.push(`${ext} → ${t}, hors des types`)
      }
      if (relu.graines?.length !== 2 || !relu.graines.every((g) => ['nom', 'libelle', 'capacites', 'types_crees', 'tables', 'periode_minutes', 'debit_minute', 'quota_creations_jour', 'plafond_euros_jour'].every((k) => k in g))) D.push('graines : deux agents à neuf champs attendus')
      if (JSON.stringify(relu.fonction?.params) !== JSON.stringify([['p_agent', 'text'], ['p_id', 'uuid']])) D.push('fonction : paramètres')
      if (!new RegExp(relu.nom_fichier.expression).test('site/index.html') || new RegExp(relu.nom_fichier.expression).test('../x')) D.push('expression des noms de fichier')
    }
    note('AT-1', !D.length, D.length ? D.join(' ; ') : `contrat-usine.json relu : ${C.limites.livraison.types.length} types (bucket = capacité), bucket ${C.bucket.file_size_limit} ≥ ${C.limites.livraison.octets_fichier_max} par fichier, deux graines à neuf champs, expression des noms éprouvée`)
  }
  // AT-2 : le scénario de l'essai se parse et --generer-essai rend un bloc valide sur le jumeau d'exemple
  {
    const D = []
    const sc = K.lireSi(SCENARIO)
    if (!sc) D.push(`${M.scenario} absent ou vide`)
    else {
      const q = seParse(sc); if (!q.ok) D.push(`le scénario ne se parse pas : ${q.raisons[0]}`)
      const cles = clesScenario(sc)
      for (const k of ['installation', 'detenue_pour_lui', 'pas_pour_livreur_usine', 'pas_pour_id_invente', 'pas_pour_bail_expire', 'anon_refuse', 'authenticated_refuse', 'bucket_prive_et_limite', 'graine_usine', 'graine_livreur_usine']) if (!cles.includes(k)) D.push(`clé ${k} absente du scénario`)
      try {
        const bloc = blocEssai({ nus: [JUMEAU_EXEMPLE], scenario: sc, empreinte: empreinte(JUMEAU_EXEMPLE) })
        const a = analyserEssai(bloc, { nus: [JUMEAU_EXEMPLE] })
        if (!a.ok) D.push(`bloc d'essai invalide : ${a.raisons.join(' ; ')}`)
      } catch (e) { D.push(`blocEssai : ${e.message}`) }
      at.cles = cles.length
    }
    note('AT-2', !D.length, D.length ? D.join(' ; ') : `${M.scenario} se parse (${at.cles} clés) ; le bloc généré sur le jumeau d'exemple est un seul énoncé do $essai_026$ … raise, sans mot interdit`)
  }
  // AT-3 : le compte rendu du témoin est lié à SON jumeau nu (sinon le témoin ne prouverait rien)
  {
    const D = []
    const nuT = path.join(K.TEMOIN, 'supabase/migrations/_A_COLLER_sql_editor_0110_NU.sql.temoin')
    const crT = path.join(K.TEMOIN, '.orchestre/preuves/026-054/essai-a-sec.txt.temoin')
    if (!K.existe(nuT) || !K.existe(crT)) D.push('témoin SQL incomplet (nu ou compte rendu absent)')
    else {
      const cr = lireCompteRendu(crT, { empreinte: empreinte(jumeauNuCoupe(nuT)), cles: clesScenario(K.lireSi(SCENARIO) || '') })
      if (!cr.ok) D.push(`compte rendu du témoin : ${cr.raisons.join(' ; ')}`)
    }
    note('AT-3', !D.length, D.length ? D.join(' ; ') : 'le compte rendu d\'essai du témoin porte l\'empreinte de son jumeau nu et toutes les clés du scénario')
  }
  // PE-1, PE-2 : l'arbre de référence échoue sur US-1
  const pe = []
  const ref = K.extraireReference(NOM, ['supabase'], [M.fichier, M.jumeau, M.nu, M.controle])
  s.verdict('PE-1', !!ref.dest, `arbre de référence ${K.REFERENCE} (ancêtre de HEAD, sans aucun fichier jugé) extrait sous ${posix(path.relative(R, ref.dest || ''))}`, ref.echecs.join(' ; '))
  if (ref.dest) {
    const r = await K.lancer(process.execPath, [FICHIER, `--racine=${ref.dest}`], { cwd: R, delaiMs: 300_000 })
    const premier = K.premierFail(r.sortie)
    pe.push({ groupe: '(tous)', attendu: 'US-1', code: r.code, premier })
    const ok = r.code === 1 && K.critereDe(premier) === 'US-1' && !/exception|at .+:\d+:\d+/.test(r.erreur)
    s.verdict('PE-2', ok, `sur la référence : code ${r.code}, premier échec « ${court(premier, 160)} »`, `sur la référence : code ${r.code} (1 attendu), premier échec « ${court(premier || r.erreur, 160)} » (US-1 attendu)`)
  } else s.echoue('PE-2', 'pas d\'arbre de référence (PE-1)')
  // TV-1, SB-1 : le témoin vert, chaque sabotage rouge
  let tv = null
  try {
    const t = K.construireTemoin(NOM, { depuisHead: ['supabase'], prefixes: ['supabase/', '.orchestre/'] })
    temoinGit(t.dest, t.superposes)
    tv = await K.eprouver({ juge: FICHIER, racine: t.dest, args: (c, r) => [`--racine=${r}`, ...(c ? [`--critere=${c}`] : [])], sabotages: SABOTAGES, criteres: IDS })
    s.verdict('TV-1', tv.temoin.code === 0 && !tv.echecs.some((e) => e.startsWith('témoin')), `témoin (${t.superposes.length} fichiers superposés à supabase/ de HEAD) : code 0, les ${IDS.length} critères verts`, tv.echecs.filter((e) => e.startsWith('témoin')).join(' ; ') || `témoin : code ${tv.temoin.code}`)
    const rates = tv.echecs.filter((e) => !e.startsWith('témoin'))
    s.verdict('SB-1', !rates.length, `${tv.lignes.length} sabotages, chacun rend son critère rouge (${[...new Set(tv.lignes.map((l) => l.critere))].join(', ')})`, rates.join(' ; '))
  } catch (e) { s.echoue('TV-1', `témoin impossible : ${e.message}`); s.echoue('SB-1', 'pas de témoin') }
  // PE-3 : la section de echecs-attendus.md
  try {
    const md = [
      `## usine-sql-qa (juge de 026-054)`, '',
      `Écrit par \`node scripts/usine-sql-qa.mjs --preuve-echecs\` le ${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}.`, '',
      '### Autotest des jeux d\'essai', '', '| Critère | Verdict | Ce qui est vérifié |', '|---|---|---|',
      ...at.map((x) => `| ${x.id} | ${x.ok ? 'PASS' : 'FAIL'} | ${String(x.m).replace(/\|/g, '\\|')} |`), '',
      `### Sur l'arbre de référence ${K.REFERENCE} (aucun fichier jugé)`, '', '| Critère attendu en premier | Code | Premier échec réel |', '|---|---|---|',
      ...pe.map((x) => `| ${x.attendu} | ${x.code} | ${x.premier.replace(/\|/g, '\\|')} |`), '',
      '### Le témoin et les sabotages', '',
      `Témoin : \`scripts/fixtures/026/usine-production/temoin/\` (supabase/ et .orchestre/preuves/026-054/), superposé à supabase/ de HEAD ; code ${tv?.temoin.code ?? '—'}.`, '',
      ...(tv ? K.tableSabotages(tv.lignes) : ['(pas de témoin)']),
    ]
    const w = K.ecrireSection(NOM, md)
    const manque = pe.filter((x) => !x.premier || !w.relu.includes(x.premier.replace(/\|/g, '\\|')))
    s.verdict('PE-3', !manque.length && w.octets > 0, `${posix(path.relative(R, w.fichier))} : section ${NOM} écrite et relue (${w.octets} octets)`, 'l\'extrait de la référence n\'est pas dans echecs-attendus.md')
  } catch (e) { s.echoue('PE-3', e.message) }
  return s.fin()
}

// ── Principal ────────────────────────────────────────────────────────────────────────────────────────────────────────
const cle = (p) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p))
const appeleEnLigneDeCommande = !!process.argv[1] && cle(process.argv[1]) === cle(FICHIER)
if (appeleEnLigneDeCommande) {
  if (opt('generer-essai')) genererEssai()
  else if (opt('reel')) { if (RACINE !== R) { console.error(`✗ ${NOM} : --reel ne se lance que sur le dépôt`); process.exit(2) } process.exitCode = await reel() }
  else if (opt('preuve-echecs')) process.exitCode = await preuveEchecs()
  else process.exitCode = juger()
}
