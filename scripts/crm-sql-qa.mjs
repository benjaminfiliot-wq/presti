#!/usr/bin/env node
// scripts/crm-sql-qa.mjs — juge SQL de la migration 0141 (CRM « atelier vivant », jalon J1), SANS toucher à Supabase.
//
// La migration est jouée pour de vrai dans un Postgres embarqué (PGlite, WebAssembly, en mémoire) : rien ne sort de la
// machine, aucune base distante n'est lue ni écrite. Le socle dont 0141 dépend est rejoué depuis les VRAIES migrations
// quand c'est possible (0040 : materiaux, stock, mouvements_stock ; la version 0045 d'appliquer_mouvement), et réduit à
// l'essentiel sinon (artisans, devis, devis_lignes, leads : seules les colonnes lues par 0141). auth.uid() est celui de
// Supabase (le `sub` du jeton, lu dans request.jwt.claim.sub).
//
// Ce qu'il prouve :
//   S1  0141 s'applique, puis se rejoue sans erreur (idempotente) ; son jumeau _NU porte le même SQL.
//   S2  RLS sur les 8 tables : un artisan connecté ne lit, ne modifie, ne supprime que SES lignes ; il ne peut pas écrire
//       au nom d'un autre ; il ne peut pas écrire dans le journal ; il ne peut pas lancer la sortie de stock.
//   S3  Les déclencheurs refusent toute référence vers la ligne d'un AUTRE artisan, même par la clé de service (devis,
//       véhicule, membre, matériau, ligne d'un autre devis).
//   S4  Un devis = un chantier ; une ligne de devis = une tâche par chantier.
//   S5  Le journal se remplit seul : création, changement de statut, tâche cochée.
//   S6  La sortie d'un matériau réservé décrémente le stock par appliquer_mouvement (mouvement rattaché au devis), une
//       seule fois, et se journalise.
//
// Ce qu'il NE prouve PAS : le comportement de la vraie base Supabase (rôles, extensions, autres migrations) — c'est le rôle
// de scripts/crm-e2e.mjs, contre une base de TEST.
//
// Prérequis : le paquet @electric-sql/pglite (pas une dépendance du projet). Résolu depuis le projet, ou depuis le dossier
// donné par PGLITE_DIR (un dossier où `npm install @electric-sql/pglite` a été fait). Absent : code 2 (ni vert ni rouge).
// Usage : node scripts/crm-sql-qa.mjs [--migration=<copie sabotée>]   Codes : 0 vert · 1 rouge · 2 prérequis absent
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8')

async function chargerPglite() {
  try { return await import('@electric-sql/pglite') } catch { /* pas dans le projet */ }
  const dir = process.env.PGLITE_DIR
  if (!dir) return null
  try {
    const req = createRequire(path.join(path.resolve(dir), 'package.json'))
    return await import(pathToFileURL(req.resolve('@electric-sql/pglite')).href)
  } catch { return null }
}
const mod = await chargerPglite()
if (!mod) { console.log('⏸  @electric-sql/pglite introuvable (ni dans le projet, ni dans PGLITE_DIR) : rien n’est vérifié.'); process.exit(2) }

const rouges = []
let verts = 0
const T = (nom, cond, detail = '') => { if (cond) { verts++; console.log(`PASS ${nom}`) } else { rouges.push(nom); console.log(`FAIL ${nom}${detail ? ' — ' + String(detail).slice(0, 300) : ''}`) } }
const db = new mod.PGlite()

/** Exécute en tant que rôle donné (null = superutilisateur = la clé de service) et rend { ok, rows, erreur }. */
async function en(role, uid, sql, params = []) {
  try {
    await db.exec('reset role; select set_config(\'request.jwt.claim.sub\', \'\', false);')
    if (uid) await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid])
    if (role) await db.exec(`set role ${role}`)
    const r = await db.query(sql, params)
    return { ok: true, rows: r.rows, n: r.affectedRows ?? 0 }
  } catch (e) {
    return { ok: false, rows: [], erreur: String(e?.message ?? e) }
  } finally {
    await db.exec('reset role')
  }
}
const service = (sql, p) => en(null, null, sql, p)

// ── Le socle ─────────────────────────────────────────────────────────────────────────────────────────────────
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  create table public.artisans (id uuid primary key);
  create table public.devis (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade,
    statut text default 'brouillon', objet text, total_ttc numeric default 0);
  create table public.devis_lignes (id uuid primary key default gen_random_uuid(), devis_id uuid references public.devis(id) on delete cascade,
    ordre int default 0, designation text, quantite numeric default 1, unite text default 'u');
  create table public.leads (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade, statut text default 'nouveau');
  alter table public.devis enable row level security;
  create policy devis_all_own on public.devis for all using (auth.uid() = artisan_id) with check (auth.uid() = artisan_id);
  alter table public.leads enable row level security;
  create policy lead_select_own on public.leads for select using (auth.uid() = artisan_id);
`)
await db.exec(lire('supabase/migrations/0040_inventaire.sql'))
// La version en service d'appliquer_mouvement est celle de 0045 (l'appelant déduit de la session).
const m0045 = lire('supabase/migrations/0045_colonnes_figees.sql')
const debut = m0045.indexOf('create or replace function public.appliquer_mouvement(')
const fin = m0045.indexOf('end $fn$;', debut) + 'end $fn$;'.length
await db.exec(m0045.slice(debut, fin) + `
  revoke execute on function public.appliquer_mouvement(uuid, uuid, text, numeric, text, uuid, text, numeric, text) from public, anon;
  grant execute on function public.appliquer_mouvement(uuid, uuid, text, numeric, text, uuid, text, numeric, text) to authenticated, service_role;`)

// ── S1. Application, rejeu, jumeau ──────────────────────────────────────────────────────────────────────────
// --migration=<fichier> : jouer une copie (sabotée) à la place, pour prouver que le juge sait rougir.
const autreMigration = process.argv.find((a) => a.startsWith('--migration='))?.slice(12)
const migration = autreMigration ? fs.readFileSync(autreMigration, 'utf8') : lire('supabase/migrations/0141_crm_atelier.sql')
let s1
try { await db.exec(migration); s1 = { ok: true } } catch (e) { s1 = { ok: false, erreur: e.message } }
T('S1 0141 s’applique', s1.ok, s1.erreur)
let rejeu = { ok: true }
try { await db.exec(migration) } catch (e) { rejeu = { ok: false, erreur: e.message } }
T('S1 0141 se rejoue sans erreur (idempotente)', rejeu.ok, rejeu.erreur)
const { sansCommentaires, MARQUE_CONTROLE } = await import(pathToFileURL(path.join(RACINE, 'scripts/sql-nu.mjs')).href)
const noyau = (s) => sansCommentaires(s).split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim()).join('\n')
const jumeau = lire('supabase/migrations/_A_COLLER_sql_editor_0141_NU.sql')
T('S1 le jumeau _NU porte exactement le même SQL', noyau(jumeau.split(MARQUE_CONTROLE)[0]) === noyau(migration))
const controle = jumeau.split(MARQUE_CONTROLE)[1] ?? ''
const c = await service(controle)
T('S1 le contrôle du jumeau rend ce qu’il annonce', c.ok && c.rows.every((r) => /attendu (\d+|false)\)/.test(r.quoi) && r.resultat === r.quoi.match(/attendu (\d+|false)\)/)[1]), c.erreur ?? JSON.stringify(c.rows))

// ── Données : deux artisans ─────────────────────────────────────────────────────────────────────────────────
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222'
await service(`insert into artisans (id) values ($1), ($2)`, [A, B])
const ins = async (sql, p) => (await service(sql + ' returning id', p)).rows[0]?.id
const devisA = await ins(`insert into devis (artisan_id, statut, objet, total_ttc) values ($1, 'accepte', 'Salle de bain', 4200)`, [A])
const devisA2 = await ins(`insert into devis (artisan_id, statut, objet) values ($1, 'accepte', 'Cuisine')`, [A])
const devisB = await ins(`insert into devis (artisan_id, statut, objet) values ($1, 'accepte', 'Toiture')`, [B])
const ligneA = await ins(`insert into devis_lignes (devis_id, designation) values ($1, 'Dépose de l’ancienne baignoire')`, [devisA])
const ligneA2 = await ins(`insert into devis_lignes (devis_id, designation) values ($1, 'Pose du plan de travail')`, [devisA2])
const membreA = await ins(`insert into equipe_membres (artisan_id, nom) values ($1, 'Compagnon A')`, [A])
const membreB = await ins(`insert into equipe_membres (artisan_id, nom) values ($1, 'Compagnon B')`, [B])
const vehA = await ins(`insert into vehicules (artisan_id, nom) values ($1, 'Camionnette A')`, [A])
const vehB = await ins(`insert into vehicules (artisan_id, nom) values ($1, 'Camionnette B')`, [B])
const matA = await ins(`insert into materiaux (artisan_id, nom) values ($1, 'Colle carrelage')`, [A])
const matB = await ins(`insert into materiaux (artisan_id, nom) values ($1, 'Tuiles')`, [B])
const leadB = await ins(`insert into leads (artisan_id) values ($1)`, [B])
const chA = await ins(`insert into chantiers (artisan_id, devis_id, titre, vehicule_id) values ($1, $2, 'Salle de bain', $3)`, [A, devisA, vehA])
const chB = await ins(`insert into chantiers (artisan_id, devis_id, titre) values ($1, $2, 'Toiture')`, [B, devisB])
T('données de départ posées par la clé de service', [devisA, devisB, ligneA, membreA, membreB, vehA, vehB, matA, matB, chA, chB].every(Boolean))

// ── S2. RLS ─────────────────────────────────────────────────────────────────────────────────────────────────
const TABLES = ['equipe_membres', 'vehicules', 'chantiers', 'chantier_equipe', 'chantier_taches', 'chantier_materiaux', 'crm_notes', 'crm_journal']
await service(`insert into chantier_equipe (chantier_id, membre_id, artisan_id) values ($1, $2, $3), ($4, $5, $6)`, [chA, membreA, A, chB, membreB, B])
await service(`insert into chantier_taches (artisan_id, chantier_id, libelle) values ($1, $2, 't A'), ($3, $4, 't B')`, [A, chA, B, chB])
await service(`insert into chantier_materiaux (artisan_id, chantier_id, materiau_id, quantite) values ($1, $2, $3, 1), ($4, $5, $6, 1)`, [A, chA, matA, B, chB, matB])
await service(`insert into crm_notes (artisan_id, chantier_id, texte) values ($1, $2, 'note A'), ($3, $4, 'note B')`, [A, chA, B, chB])
for (const t of TABLES) {
  const r = await en('authenticated', A, `select artisan_id from public.${t}`)
  T(`S2 ${t} : A ne lit que ses lignes`, r.ok && r.rows.length > 0 && r.rows.every((x) => x.artisan_id === A), r.erreur ?? JSON.stringify(r.rows))
  const anon = await en('anon', null, `select count(*)::int as n from public.${t}`)
  T(`S2 ${t} : un visiteur anonyme ne lit rien`, !anon.ok || anon.rows[0]?.n === 0, anon.erreur)
}
const majB = await en('authenticated', A, `update chantiers set titre = 'piraté' where id = $1`, [chB])
const relu = await service(`select titre from chantiers where id = $1`, [chB])
T('S2 A ne modifie pas le chantier de B (0 ligne touchée)', relu.rows[0]?.titre === 'Toiture', JSON.stringify({ majB, relu: relu.rows }))
await en('authenticated', A, `delete from chantier_taches where artisan_id = $1`, [B])
const tB = await service(`select count(*)::int as n from chantier_taches where artisan_id = $1`, [B])
T('S2 A ne supprime pas les tâches de B', tB.rows[0]?.n === 1)
const auNomDeB = await en('authenticated', A, `insert into chantiers (artisan_id, titre) values ($1, 'au nom de B')`, [B])
T('S2 A ne peut pas créer un chantier au nom de B', !auNomDeB.ok && /row-level security/i.test(auNomDeB.erreur), auNomDeB.erreur)
const aSoi = await en('authenticated', A, `insert into chantiers (artisan_id, titre) values ($1, 'chantier sans devis') returning id`, [A])
T('S2 A crée son propre chantier', aSoi.ok && aSoi.rows.length === 1, aSoi.erreur)
const journalNav = await en('authenticated', A, `insert into crm_journal (artisan_id, objet, objet_id, champ) values ($1, 'chantier', $2, 'statut')`, [A, chA])
T('S2 A ne peut pas écrire dans le journal', !journalNav.ok, 'insertion acceptée')
const journalEfface = await en('authenticated', A, `delete from crm_journal where artisan_id = $1`, [A])
const jA = await service(`select count(*)::int as n from crm_journal where artisan_id = $1`, [A])
T('S2 A ne peut pas effacer son journal', jA.rows[0]?.n > 0, JSON.stringify(journalEfface))
const sortieNav = await en('authenticated', A, `select crm_sortir_materiau($1, $2)`, [A, '00000000-0000-4000-8000-000000000000'])
T('S2 un navigateur ne peut pas lancer la sortie de stock', !sortieNav.ok && /permission denied/i.test(sortieNav.erreur), sortieNav.erreur)

// ── S3. Références croisées refusées, même par la clé de service ────────────────────────────────────────────
const refus = async (nom, sql, p, motif) => { const r = await service(sql, p); T(`S3 ${nom}`, !r.ok && r.erreur.includes(motif), r.erreur ?? 'accepté') }
await refus('chantier de A sur le devis de B', `insert into chantiers (artisan_id, devis_id, titre) values ($1, $2, 'x')`, [A, devisB], 'devis d un autre artisan')
await refus('chantier de A avec le véhicule de B', `update chantiers set vehicule_id = $2 where id = $1`, [chA, vehB], 'vehicule d un autre artisan')
await refus('véhicule de A conduit par le membre de B', `update vehicules set conducteur_id = $2 where id = $1`, [vehA, membreB], 'conducteur d un autre artisan')
await refus('membre de B dans l’équipe du chantier de A', `insert into chantier_equipe (chantier_id, membre_id, artisan_id) values ($1, $2, $3)`, [chA, membreB, A], 'membre d un autre artisan')
await refus('A rattache une ligne d’équipe au chantier de B', `insert into chantier_equipe (chantier_id, membre_id, artisan_id) values ($1, $2, $3)`, [chB, membreA, A], 'chantier d un autre artisan')
await refus('tâche de A sur le chantier de B', `insert into chantier_taches (artisan_id, chantier_id, libelle) values ($1, $2, 'x')`, [A, chB], 'chantier d un autre artisan')
await refus('tâche confiée au membre de B', `insert into chantier_taches (artisan_id, chantier_id, libelle, membre_id) values ($1, $2, 'x', $3)`, [A, chA, membreB], 'membre d un autre artisan')
await refus('tâche née d’une ligne d’un AUTRE devis (même artisan)', `insert into chantier_taches (artisan_id, chantier_id, libelle, devis_ligne_id) values ($1, $2, 'x', $3)`, [A, chA, ligneA2], 'ligne d un autre devis')
await refus('réservation du matériau de B', `insert into chantier_materiaux (artisan_id, chantier_id, materiau_id, quantite) values ($1, $2, $3, 1)`, [A, chA, matB], 'materiau d un autre artisan')
await refus('note de A sur la demande de B', `insert into crm_notes (artisan_id, lead_id, texte) values ($1, $2, 'x')`, [A, leadB], 'demande d un autre artisan')
await refus('note sans cible', `insert into crm_notes (artisan_id, texte) values ($1, 'x')`, [A], 'crm_notes_une_cible')
await refus('empreinte client mal formée (une adresse en clair)', `insert into crm_notes (artisan_id, client_cle, texte) values ($1, 'client@exemple.invalid', 'x')`, [A], 'client_cle')
await refus('fin prévue avant le début', `insert into chantiers (artisan_id, titre, date_debut, date_fin_prevue) values ($1, 'x', '2026-10-12', '2026-10-01')`, [A], 'chantiers_dates_ordre')
await refus('statut inconnu', `update chantiers set statut = 'fini' where id = $1`, [chA], 'check')

// ── S4. Unicités ────────────────────────────────────────────────────────────────────────────────────────────
await refus('un deuxième chantier sur le même devis', `insert into chantiers (artisan_id, devis_id, titre) values ($1, $2, 'doublon')`, [A, devisA], 'chantiers_devis_unique')
const t1 = await service(`insert into chantier_taches (artisan_id, chantier_id, libelle, devis_ligne_id) values ($1, $2, 'Dépose', $3) returning id`, [A, chA, ligneA])
T('S4 une ligne du devis du chantier donne une tâche', t1.ok, t1.erreur)
await refus('la même ligne ne donne pas deux tâches', `insert into chantier_taches (artisan_id, chantier_id, libelle, devis_ligne_id) values ($1, $2, 'Dépose bis', $3)`, [A, chA, ligneA], 'chantier_taches_ligne_unique')

// ── S5. Journal automatique ─────────────────────────────────────────────────────────────────────────────────
const creation = await service(`select champ, vers from crm_journal where objet = 'chantier' and objet_id = $1 order by cree_le`, [chA])
T('S5 la création du chantier est journalisée', creation.rows.some((r) => r.champ === 'creation' && r.vers === 'a_planifier'), JSON.stringify(creation.rows))
await service(`update chantiers set statut = 'en_cours' where id = $1`, [chA])
await service(`update chantiers set titre = 'Salle de bain (modifiée)' where id = $1`, [chA])
const st = await service(`select de, vers from crm_journal where objet = 'chantier' and objet_id = $1 and champ = 'statut'`, [chA])
T('S5 le changement de statut est journalisé une fois (pas le changement de titre)', st.rows.length === 1 && st.rows[0].de === 'a_planifier' && st.rows[0].vers === 'en_cours', JSON.stringify(st.rows))
const parNav = await en('authenticated', A, `update chantiers set statut = 'en_pause' where id = $1`, [chA])
const st2 = await service(`select vers, artisan_id from crm_journal where objet = 'chantier' and objet_id = $1 and champ = 'statut' order by cree_le desc limit 1`, [chA])
T('S5 un changement fait depuis une session est journalisé au nom de son artisan', parNav.ok && st2.rows[0]?.vers === 'en_pause' && st2.rows[0]?.artisan_id === A, parNav.erreur ?? JSON.stringify(st2.rows))
await service(`update chantier_taches set faite = true, faite_le = now() where id = $1`, [t1.rows[0].id])
const tj = await service(`select de, vers, chantier_id from crm_journal where objet = 'tache' and objet_id = $1`, [t1.rows[0].id])
T('S5 la tâche cochée est journalisée sur son chantier', tj.rows.length === 1 && tj.rows[0].vers === 'true' && tj.rows[0].chantier_id === chA, JSON.stringify(tj.rows))

// ── S6. Sortie de stock ─────────────────────────────────────────────────────────────────────────────────────
await service(`select appliquer_mouvement($1, $2, 'entree', 10, 'atelier')`, [A, matA])
const resa = await service(`insert into chantier_materiaux (artisan_id, chantier_id, materiau_id, quantite, lieu) values ($1, $2, $3, 3, 'atelier') returning id`, [A, chA, matA])
const avant = await service(`select quantite::float as q from stock where materiau_id = $1 and lieu = 'atelier'`, [matA])
T('S6 réserver ne touche pas au stock', avant.rows[0]?.q === 10, JSON.stringify(avant.rows))
const sortie = await en('service_role', null, `select crm_sortir_materiau($1, $2)::float as reste`, [A, resa.rows[0].id])
T('S6 la sortie rend le reste (10 − 3 = 7)', sortie.ok && sortie.rows[0]?.reste === 7, sortie.erreur ?? JSON.stringify(sortie.rows))
const mvt = await service(`select type, quantite::float as q, devis_id, source from mouvements_stock where materiau_id = $1 and type = 'sortie'`, [matA])
T('S6 un mouvement « sortie » rattaché au devis du chantier', mvt.rows.length === 1 && mvt.rows[0].q === 3 && mvt.rows[0].devis_id === devisA && mvt.rows[0].source === 'devis', JSON.stringify(mvt.rows))
const etat = await service(`select statut, sorti_le is not null as date from chantier_materiaux where id = $1`, [resa.rows[0].id])
T('S6 la réservation passe à « sorti », datée', etat.rows[0]?.statut === 'sorti' && etat.rows[0]?.date === true)
const deux = await en('service_role', null, `select crm_sortir_materiau($1, $2)`, [A, resa.rows[0].id])
const apres = await service(`select quantite::float as q from stock where materiau_id = $1 and lieu = 'atelier'`, [matA])
T('S6 une deuxième sortie est refusée, le stock ne bouge pas', !deux.ok && /deja traitee/.test(deux.erreur) && apres.rows[0]?.q === 7, deux.erreur)
const autre = await en('service_role', null, `select crm_sortir_materiau($1, $2)`, [B, resa.rows[0].id])
T('S6 B ne peut pas sortir la réservation de A', !autre.ok && /introuvable/.test(autre.erreur), autre.erreur)
const js = await service(`select count(*)::int as n from crm_journal where objet = 'materiau' and objet_id = $1 and champ = 'sortie'`, [resa.rows[0].id])
T('S6 la sortie est journalisée une fois', js.rows[0]?.n === 1)

// ── Suppression en cascade ──────────────────────────────────────────────────────────────────────────────────
await service(`delete from chantiers where id = $1`, [chA])
const restes = await service(`select (select count(*) from chantier_taches where chantier_id = $1)::int + (select count(*) from chantier_materiaux where chantier_id = $1)::int + (select count(*) from chantier_equipe where chantier_id = $1)::int + (select count(*) from crm_notes where chantier_id = $1)::int as n`, [chA])
const journalGarde = await service(`select count(*)::int as n from crm_journal where objet_id = $1`, [chA])
T('S7 supprimer un chantier emporte ses tâches, réservations, équipe et notes', restes.rows[0]?.n === 0, JSON.stringify(restes.rows))
T('S7 … mais son journal reste (chantier_id remis à vide)', journalGarde.rows[0]?.n > 0)

console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)${rouges.length ? ' : ' + rouges.join(' · ') : ''}`)
process.exitCode = rouges.length ? 1 : 0
