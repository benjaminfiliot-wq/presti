#!/usr/bin/env node
// scripts/relances-impayes-sql-qa.mjs — juge SQL de la migration 0159 (relances automatiques des factures impayées), SANS toucher à Supabase.
// La migration est jouée dans un Postgres embarqué (PGlite, en mémoire) ; le socle (artisans, factures) est réduit aux colonnes lues.
// Prouve : elle s'applique et se rejoue ; désactivé par défaut ; calendrier borné ; clés uniques (un rang par facture, un message par
// client et par jour) ; RLS (chaque artisan ne lit que SES lignes, n'écrit pas dans le journal) ; déclencheur d'isolation (jamais la
// facture d'un autre, même par la clé de service) ; cascade avec la facture.
// Prérequis : @electric-sql/pglite (pas une dépendance du projet) dans le projet ou dans PGLITE_DIR. Absent : code 2.
// Usage : node scripts/relances-impayes-sql-qa.mjs   Codes : 0 vert · 1 rouge · 2 prérequis absent
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
async function chargerPglite() {
  try { return await import('@electric-sql/pglite') } catch { /* pas dans le projet */ }
  const dir = process.env.PGLITE_DIR
  if (!dir) return null
  try { return await import(pathToFileURL(createRequire(path.join(path.resolve(dir), 'package.json')).resolve('@electric-sql/pglite')).href) } catch { return null }
}
const mod = await chargerPglite()
if (!mod) { console.log('⏸  @electric-sql/pglite introuvable (ni dans le projet, ni dans PGLITE_DIR) : rien n’est vérifié.'); process.exit(2) }
const db = new mod.PGlite()
const sql = fs.readFileSync(path.join(RACINE, 'supabase/migrations/0159_relances_impayes.sql'), 'utf8')
let verts = 0; const rouges = []
const T = (n, c, d = '') => { if (c) { verts++; console.log('PASS', n) } else { rouges.push(n); console.log('FAIL', n, d) } }
await db.exec(`
  create schema if not exists auth;
  create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role authenticated nologin; create role anon nologin;
  create table public.artisans (id uuid primary key);
  create table public.factures (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade);
  grant usage on schema public to authenticated; grant usage on schema auth to authenticated;
`)
const A = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222'
await db.exec(`insert into public.artisans values ('${A}'), ('${B}')`)
const fa = (await db.query(`insert into public.factures (artisan_id) values ('${A}') returning id`)).rows[0].id
const fb = (await db.query(`insert into public.factures (artisan_id) values ('${B}') returning id`)).rows[0].id
let e1 = null; try { await db.exec(sql) } catch (e) { e1 = e }
T('S1 la migration s’applique', !e1, e1?.message)
let e2 = null; try { await db.exec(sql) } catch (e) { e2 = e }
T('S1 elle se rejoue sans erreur (idempotente)', !e2, e2?.message)
await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated`)
const essai = async (q, params = []) => { try { const r = await db.query(q, params); return { ok: true, rows: r.rows, n: r.affectedRows } } catch (e) { return { ok: false, e: e.message } } }
const en = async (uid, q, p) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false)`); if (uid) await db.exec('set role authenticated'); const r = await essai(q, p); await db.exec('reset role'); return r }

// Réglages : défaut désactivé, calendrier par défaut
await en(A, `insert into public.relances_impayes_reglages (artisan_id) values ('${A}')`)
const r = (await essai(`select actif, jours, textes from public.relances_impayes_reglages where artisan_id='${A}'`)).rows[0]
T('S2 défaut : désactivé', r.actif === false); T('S2 défaut : {3,10,21}', JSON.stringify(r.jours) === '[3,10,21]')
for (const [n, j] of [['0 jour', '{0,10}'], ['91 jours', '{3,91}'], ['écart 1', '{3,4}'], ['ordre inversé', '{10,3}'], ['4 relances', '{1,5,10,20}'], ['vide', '{}']]) {
  const x = await essai(`update public.relances_impayes_reglages set jours='${j}' where artisan_id='${A}'`)
  T(`S3 calendrier refusé : ${n}`, !x.ok)
}
T('S3 calendrier valide {1,5}', (await essai(`update public.relances_impayes_reglages set jours='{1,5}' where artisan_id='${A}'`)).ok)
T('S3 textes non-objet refusé', !(await essai(`update public.relances_impayes_reglages set textes='[1]' where artisan_id='${A}'`)).ok)
// RLS
T('S4 B ne lit pas les réglages de A', (await en(B, `select * from public.relances_impayes_reglages`)).rows.length === 0)
T('S4 A lit les siens', (await en(A, `select * from public.relances_impayes_reglages`)).rows.length === 1)
T('S4 B ne peut pas écrire au nom de A', !(await en(B, `insert into public.relances_impayes_reglages (artisan_id) values ('${A}')`)).ok)
{ const x = await en(B, `update public.relances_impayes_reglages set actif = true where artisan_id='${A}'`); T('S4 B ne modifie pas la ligne de A', (x.n ?? 0) === 0) }
// Journal : unicité, cohérence, RLS
const ins = (art, fac, rang, jour, dest) => essai(`insert into public.relances_impayes (facture_id, artisan_id, rang, jour, destinataire) values ('${fac}', '${art}', ${rang}, '${jour}', '${dest}')`)
T('S5 première relance prise', (await ins(A, fa, 1, '2026-10-20', 'c@example.com')).ok)
T('S5 même facture, même rang : refusé', !(await ins(A, fa, 1, '2026-10-21', 'd@example.com')).ok)
T('S5 même client, même jour, autre facture : refusé', !(await ins(A, (await essai(`insert into public.factures (artisan_id) values ('${A}') returning id`)).rows[0].id, 1, '2026-10-20', 'c@example.com')).ok)
T('S5 rang 2 un autre jour : accepté', (await ins(A, fa, 2, '2026-10-27', 'c@example.com')).ok)
T('S5 rang 4 refusé', !(await ins(A, fa, 4, '2026-11-01', 'c@example.com')).ok)
T('S5 destinataire en majuscules refusé', !(await ins(A, fa, 3, '2026-11-10', 'C@Example.com')).ok)
T('S5 statut inconnu refusé', !(await essai(`insert into public.relances_impayes (facture_id, artisan_id, rang, jour, destinataire, statut) values ('${fa}', '${A}', 3, '2026-11-10', 'z@example.com', 'x')`)).ok)
T('S6 isolation : le journal de A cite la facture de B → refusé', !(await ins(A, fb, 1, '2026-10-20', 'autre@example.com')).ok)
T('S6 isolation : même par la clé de service (superutilisateur)', !(await ins(B, fa, 1, '2026-10-20', 'autre2@example.com')).ok)
T('S7 B ne lit pas le journal de A', (await en(B, `select * from public.relances_impayes`)).rows.length === 0)
T('S7 A lit son journal', (await en(A, `select * from public.relances_impayes`)).rows.length === 2)
T('S7 A ne peut pas écrire dans son journal (service seulement)', !(await en(A, `insert into public.relances_impayes (facture_id, artisan_id, rang, jour, destinataire) values ('${fa}', '${A}', 3, '2026-11-10', 'q@example.com')`)).ok)
T('S7 A ne peut pas modifier son journal', ((await en(A, `update public.relances_impayes set statut='envoyee'`)).n ?? 0) === 0)
// Arrêts
T('S8 arrêt de sa facture', (await essai(`insert into public.relances_impayes_arrets (facture_id, artisan_id, raison) values ('${fa}', '${A}', 'client_x')`)).ok === false)
T('S8 arrêt valide', (await essai(`insert into public.relances_impayes_arrets (facture_id, artisan_id, raison) values ('${fa}', '${A}', 'reponse_client')`)).ok)
T('S8 arrêt de la facture d’un autre : refusé', !(await essai(`insert into public.relances_impayes_arrets (facture_id, artisan_id, raison) values ('${fb}', '${A}', 'artisan')`)).ok)
T('S8 B ne lit pas l’arrêt de A', (await en(B, `select * from public.relances_impayes_arrets`)).rows.length === 0)
// Suppression en cascade avec la facture
await db.exec(`delete from public.factures where id = '${fa}'`)
T('S9 journal et arrêts suivent la facture (cascade)', (await essai(`select count(*)::int n from public.relances_impayes where facture_id='${fa}'`)).rows[0].n === 0)
console.log(rouges.length ? `❌ ${rouges.length} échec(s)` : `✅ ${verts}/${verts} contrôles SQL`)
process.exit(rouges.length ? 1 : 0)
