#!/usr/bin/env node
// .orchestre/preuves/026-032/eprouver.mjs — la preuve que les trois juges de 026-032 savent être VERTS sur une implémentation
// témoin ET ROUGES sur chaque sabotage (leçon du 26/09 : un juge qui sort toujours en 1 a été accepté par une preuve trop
// faible). Écrit par Claude Code pour 026-032 ; ne touche qu'à .orchestre/travail/026-032/ et écrit sabotages.md ici.
//
// 1. Une racine témoin (copie de supabase/ + les migrations témoins de temoins/, leurs jumeaux fabriqués par sql-nu.mjs, leurs
//    contrôles, docs/agents/horloge.md, et un compte rendu d'essai SYNTHÉTIQUE — empreinte du jumeau courant, toutes les clés du
//    scénario à true, APRES rien_ne_reste=true — qui n'existe que dans cette racine de travail, pour éprouver la LECTURE du juge).
// 2. Chaque juge, --racine=<témoin> : code 0, bilan PASS, chaque critère PASS (ou SAUTE pour --reel).
// 3. Chaque sabotage (une seule altération du témoin) : code 1 et LA ligne « FAIL <critère visé> — … ». Quelques variantes
//    bénignes (un commentaire qui nomme boite_, l'ordre « update of statut or insert »…) doivent rester vertes.
// Usage : node .orchestre/preuves/026-032/eprouver.mjs      Code 0 si tout est comme attendu, 1 sinon.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const R = path.resolve(ICI, '..', '..', '..')
const { empreinte, jumeauNuCoupe, clesScenario, MARQUE_CONTROLE } = await import(new URL('../../../scripts/lib/sql-essai.mjs', import.meta.url))
const T = (f) => fs.readFileSync(path.join(ICI, 'temoins', f), 'utf8').replace(/\r\n?/g, '\n')
const RACINE = path.join(R, '.orchestre', 'travail', '026-032', 'temoin')
const versSlash = (p) => p.split(path.sep).join('/')

const MIG = {
  prospection: { num: '0099', juge: 'scripts/prospection-sql-qa.mjs', fiche: '026-034', mig: 'supabase/migrations/0099_ops_garde_envois.sql', ctrl: 'supabase/controles/0099_ops_garde_envois.sql', scen: 'scripts/fixtures/026-horloge-bus/essais/0099.sql', src: '0099_ops_garde_envois.sql', srcCtrl: '0099_controle.sql' },
  argent: { num: '0100', juge: 'scripts/argent-sql-qa.mjs', fiche: '026-036', mig: 'supabase/migrations/0100_ops_file_argent.sql', ctrl: 'supabase/controles/0100_ops_file_argent.sql', scen: 'scripts/fixtures/026-horloge-bus/essais/0100.sql', src: '0100_ops_file_argent.sql', srcCtrl: '0100_controle.sql' },
  horloge: { num: '0101', juge: 'scripts/horloge-sql-qa.mjs', fiche: '026-086', mig: 'supabase/migrations/0101_ops_horloge.sql', ctrl: 'supabase/controles/0101_ops_horloge.sql', scen: 'scripts/fixtures/026-horloge-bus/essais/0101.sql', src: '0101_ops_horloge.sql', srcCtrl: '0101_controle.sql' },
}
const nuDe = (n) => `supabase/migrations/_A_COLLER_sql_editor_${n}_NU.sql`
const jumeauDe = (n) => `supabase/migrations/_A_COLLER_sql_editor_${n}.sql`
const essaiDe = (fiche) => `.orchestre/preuves/${fiche}/essai-a-sec.txt`

/** Remplace `a` par `b` ; `a` doit apparaître au moins une fois (sinon le sabotage ne saboterait rien : on s'arrête). */
const rep = (a, b, tous = false) => (t) => {
  const n = t.split(a).length - 1
  if (n < 1 || (!tous && n > 1)) throw new Error(`sabotage mal écrit : « ${a.slice(0, 60)} » trouvé ${n} fois`)
  return tous ? t.split(a).join(b) : t.replace(a, () => b)
}
const ecrire = (rel, texte) => { const f = path.join(RACINE, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, texte) }
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8')

// ── La racine : copie de supabase/ une fois, puis l'état témoin (ou saboté) réécrit à chaque passage ──────────────────────
function preparer() {
  const rel = path.relative(path.join(R, '.orchestre', 'travail'), RACINE)
  if (!rel || rel.startsWith('..')) throw new Error('racine hors de .orchestre/travail')
  fs.rmSync(RACINE, { recursive: true, force: true })
  fs.cpSync(path.join(R, 'supabase'), path.join(RACINE, 'supabase'), { recursive: true })
}
const ORIGINAUX = new Map()
function etat(sab = null) {
  // les fichiers existants altérés par un sabotage précédent reviennent à l'original
  for (const [rel, t] of ORIGINAUX) ecrire(rel, t)
  for (const [nom, m] of Object.entries(MIG)) {
    const touche = (quoi, t) => (sab && sab.juge === nom && sab.fichier === quoi ? sab.muter(t) : t)
    ecrire(m.mig, touche('migration', T(m.src)))
    ecrire(m.ctrl, touche('controle', T(m.srcCtrl)))
    const g = spawnSync(process.execPath, [path.join(R, 'scripts', 'sql-nu.mjs'), path.join(RACINE, m.mig), versSlash(path.join(RACINE, nuDe(m.num))), '--controle', path.join(RACINE, m.ctrl)], { encoding: 'utf8', windowsHide: true })
    if (g.status !== 0) throw new Error(`sql-nu.mjs ${m.mig} : ${g.stdout}${g.stderr}`)
    ecrire(jumeauDe(m.num), lire(m.mig))
    if (sab && sab.juge === nom && sab.fichier === 'apres-jumeaux') ecrire(m.mig, sab.muter(lire(m.mig)))
    const e = empreinte(jumeauNuCoupe(path.join(RACINE, nuDe(m.num))))
    const cles = clesScenario(fs.readFileSync(path.join(R, m.scen), 'utf8'))
    const r = Object.fromEntries(cles.map((k) => [k, true]))
    const cr = `${JSON.stringify({ error: { name: 'Error', message: `Failed to run sql query: ERROR:  P0001: ESSAI_A_SEC ${e} ${JSON.stringify(r)}\nCONTEXT:  PL/pgSQL function inline_code_block line 1 at RAISE\n` } })}\n\nAPRES rien_ne_reste=true\n`
    ecrire(essaiDe(m.fiche), touche('essai', cr))
  }
  ecrire('docs/agents/horloge.md', sab && sab.fichier === 'doc' ? sab.muter(T('horloge.md')) : T('horloge.md'))
  if (sab && sab.fichier === 'existant') { if (!ORIGINAUX.has(sab.cible)) ORIGINAUX.set(sab.cible, lire(sab.cible)); ecrire(sab.cible, sab.muter(lire(sab.cible))) }
}
function juger(nom, extra = []) {
  const x = spawnSync(process.execPath, [path.join(R, MIG[nom].juge), `--racine=${RACINE}`, ...extra], { cwd: R, encoding: 'utf8', windowsHide: true, maxBuffer: 64 << 20, timeout: 240_000 })
  const lignes = (x.stdout || '').split(/\r?\n/)
  const criteres = new Map(lignes.map((l) => /^(PASS|FAIL|SAUTE) (\S+) — (.*)$/.exec(l)).filter(Boolean).map((m) => [m[2], { verdict: m[1], detail: m[3] }]))
  const bilan = lignes.map((l) => /^(\S+) : (PASS|FAIL)(?: — (.*))?$/.exec(l)).filter(Boolean).at(-1)
  return { code: x.status, criteres, bilan: bilan ? bilan[2] : null, rouges: bilan?.[3] ? bilan[3].split(', ') : [], sortie: `${x.stdout}${x.stderr}` }
}

// ── Les sabotages : une altération, un critère visé ────────────────────────────────────────────────────────────────────
const S = (juge, critere, quoi, fichier, muter, extra = {}) => ({ juge, critere, quoi, fichier, muter, ...extra })
const ajout = (t, ligne) => `${t}\n${ligne}\n`
const SABOTAGES = [
  // 0099 — prospection-sql-qa
  S('prospection', 'PG-1', 'une table créée', 'migration', (t) => ajout(t, 'create table if not exists ops.essai_sabotage (id int);')),
  S('prospection', 'PG-1', 'une colonne ajoutée', 'migration', (t) => ajout(t, 'alter table ops.envois add column sabotage text;')),
  S('prospection', 'PG-2', 'une fonction qui retire une opposition', 'migration', (t) => ajout(t, 'create or replace function ops.opposition_retirer()\nreturns void\nlanguage sql\nas $fn$ select 1 $fn$;')),
  S('prospection', 'PG-2', 'annuler_sur_opposition efface dans ops.opposition', 'migration', rep('  get diagnostics v_n = row_count;\n  if v_n > 0', '  delete from ops.opposition where id = new.id;\n  get diagnostics v_n = row_count;\n  if v_n > 0')),
  S('prospection', 'PG-2', 'annuler_sur_opposition écrit dans ops.interrupteurs', 'migration', rep('  get diagnostics v_n = row_count;\n  if v_n > 0', "  update ops.interrupteurs set actif = false where nom = 'envoi_froid';\n  get diagnostics v_n = row_count;\n  if v_n > 0")),
  S('prospection', 'PG-2', "ops_garde_etat sans la clé du_jour", 'migration', rep("    'du_jour', (select", "    'aujourdhui', (select")),
  S('prospection', 'PG-2', 'ops_garde_etat lit ops.prospects', 'migration', rep("    'interrupteurs', jsonb_build_object(", "    'prospects', (select count(*) from ops.prospects),\n    'interrupteurs', jsonb_build_object(")),
  S('prospection', 'PG-3', 'ops_garde_etat sans security definer', 'migration', rep('stable\nsecurity definer\nset search_path = ops, public, pg_temp', 'stable\nset search_path = ops, public, pg_temp')),
  S('prospection', 'PG-3', 'garde_envois encore exécutable par service_role', 'migration', rep('revoke all on function ops.garde_envois() from public, anon, authenticated, service_role;', 'revoke all on function ops.garde_envois() from public, anon, authenticated;')),
  S('prospection', 'PG-3', 'ops_garde_etat accordée à anon', 'migration', rep('grant execute on function public.ops_garde_etat() to service_role;', 'grant execute on function public.ops_garde_etat() to service_role, anon;')),
  S('prospection', 'PG-4', 'le code ops:72_heures jamais levé', 'migration', rep("      raise exception using message = 'ops:72_heures', errcode = 'P0001';", '      null;')),
  S('prospection', 'PG-4', 'le code ops:quota_reponses jamais levé', 'migration', rep("raise exception using message = 'ops:quota_reponses', errcode = 'P0001';", 'null;', true)),
  S('prospection', 'PG-4', 'la branche envoye refuse', 'migration', rep('    return new;\n  end if;\n\n  if new.statut not in', "    raise exception using message = 'ops:pause_generale', errcode = 'P0001';\n    return new;\n  end if;\n\n  if new.statut not in")),
  S('prospection', 'PG-4', 'le comptage des plafonds avant le verrou', 'migration', rep("    perform pg_advisory_xact_lock(hashtext('ops:quota:' || new.canal));\n", '')),
  S('prospection', 'PG-4', "le jour à l'heure UTC", 'migration', (t) => t.replace(/(create or replace function ops\.garde_envois\(\)[\s\S]*?\n\$fn\$;)/, (b) => b.split("at time zone 'Europe/Paris'").join("at time zone 'UTC'"))),
  S('prospection', 'PG-4', "l'opposition expirée compte encore", 'migration', rep('     where (o.expire_le is null or o.expire_le > now())\n', '     where true\n')),
  S('prospection', 'PG-4', "preuve_demande lue par new.preuve_demande", 'migration', rep("v_preuve jsonb := to_jsonb(new) -> 'preuve_demande';", 'v_preuve jsonb := new.preuve_demande;')),
  S('prospection', 'PG-4', "le canal 'email' nommé", 'migration', rep("  elsif new.canal = 'email_sollicite' then", "  elsif new.canal = 'email_sollicite' or new.canal = 'email' then")),
  S('prospection', 'PG-4', 'une règle par boîte boite_', 'migration', rep("  if new.canal = 'formulaire_site' then", "  if new.envoyeur like 'boite_%' then\n    return new;\n  end if;\n  if new.canal = 'formulaire_site' then")),
  S('prospection', 'PG-4', 'le déclencheur ne garde plus que les insertions', 'migration', rep('create trigger garde_envois before insert or update of statut on ops.envois', 'create trigger garde_envois before insert on ops.envois')),
  S('prospection', 'PG-4', 'create trigger sans drop trigger if exists avant', 'migration', rep('drop trigger if exists garde_envois on ops.envois;\n', '')),
  S('prospection', 'PG-5', 'le contrôle ne lit plus tgenabled', 'controle', rep("t.tgenabled <> 'D' and ", '')),
  S('prospection', 'PG-5', 'le contrôle écrit', 'controle', (t) => `${t}\nselect 'x' as quoi, 'oui' as resultat where false;\ninsert into ops.interrupteurs (nom) values ('pause_generale');\n`),
  S('prospection', 'PG-5', 'la migration change après ses jumeaux', 'apres-jumeaux', (t) => ajout(t, 'comment on function ops.garde_envois() is \'retouchée après les jumeaux\';')),
  S('prospection', 'PG-6', "compte rendu d'essai de 0 octet", 'essai', () => ''),
  S('prospection', 'PG-6', "compte rendu d'une autre empreinte", 'essai', (t) => t.replace(/ESSAI_A_SEC ([0-9a-f]{64})/, (m, e) => `ESSAI_A_SEC ${e.slice(0, 63)}${e.at(-1) === '0' ? '1' : '0'}`)),
  S('prospection', 'PG-6', 'une clé du scénario à false', 'essai', rep('\\"email_51e_quota\\":true', '\\"email_51e_quota\\":false')),
  S('prospection', 'PG-6', 'sans la ligne APRES', 'essai', rep('APRES rien_ne_reste=true', '')),
  S('prospection', 'PG-7', 'une migration existante modifiée', 'existant', (t) => `${t}\n-- modifiée par un sabotage\nselect 1;\n`, { cible: 'supabase/migrations/0096_ops_socle.sql' }),
  // 0100 — argent-sql-qa
  S('argent', 'FA-1', 'usage de pgmq accordé à anon', 'migration', (t) => ajout(t, 'grant usage on schema pgmq to anon;')),
  S('argent', 'FA-1', 'le schéma pgmq_public', 'migration', (t) => ajout(t, 'create schema if not exists pgmq_public;')),
  S('argent', 'FA-1', 'la file créée sans garde', 'migration', rep("  if not exists (select 1 from pgmq.list_queues() where queue_name = 'argent') then\n    perform pgmq.create('argent');\n  end if;", "  perform pgmq.create('argent');")),
  S('argent', 'FA-1', "l'ordre : le schéma pgmq fermé après les fonctions", 'migration', (t) => ajout(rep('revoke all on schema pgmq from anon, authenticated;\n', '')(t), 'revoke all on schema pgmq from anon, authenticated;')),
  S('argent', 'FA-2', 'un type de plus dans la liste', 'migration', rep("type in ('commande_payee', 'essai_e2e')),", "type in ('commande_payee', 'essai_e2e', 'autre')),")),
  S('argent', 'FA-2', 'charge sans défaut', 'migration', rep("charge        jsonb not null default '{}' check", 'charge        jsonb not null check')),
  S('argent', 'FA-2', 'ops_argent_lire sans mis_le', 'migration', rep('returns table(msg_id bigint, lectures integer, type text, cle text, charge jsonb, mis_le timestamptz)', 'returns table(msg_id bigint, lectures integer, type text, cle text, charge jsonb)')),
  S('argent', 'FA-2', 'un paramètre renommé', 'migration', rep('public.ops_argent_fait(p_msg_id bigint, p_cle text, p_resultat jsonb)\nreturns', 'public.ops_argent_fait(p_msg_id bigint, cle text, p_resultat jsonb)\nreturns')),
  S('argent', 'FA-3', 'search_path sans pgmq', 'migration', rep('set search_path = ops, pgmq, public, pg_temp\nas $fn$\ndeclare\n  v_msg bigint;', 'set search_path = ops, public, pg_temp\nas $fn$\ndeclare\n  v_msg bigint;')),
  S('argent', 'FA-3', 'table sans RLS', 'migration', rep('alter table ops.argent_messages enable row level security;\n', '')),
  S('argent', 'FA-3', 'fonction accordée à authenticated', 'migration', rep('grant execute on function public.ops_argent_etat() to service_role;', 'grant execute on function public.ops_argent_etat() to service_role, authenticated;')),
  S('argent', 'FA-4', 'send même quand la clé est connue', 'migration', rep('  if not found then\n    return null;\n  end if;\n  v_msg', '  v_msg')),
  S('argent', 'FA-4', 'p_vt_s sans borne haute', 'migration', rep('p_vt_s < 5 or p_vt_s > 3600', 'p_vt_s < 5')),
  S('argent', 'FA-4', 'archivé seulement après 5 lectures', 'migration', rep('m.read_ct > 3', 'm.read_ct > 5')),
  S('argent', 'FA-4', 'le message supprimé avant la marque', 'migration', rep("begin\n  update ops.argent_messages set fait_le = now()", "begin\n  perform pgmq.delete('argent', p_msg_id);\n  update ops.argent_messages set fait_le = now()")),
  S('argent', 'FA-5', 'le contrôle ne lit plus l\'usage de pgmq', 'controle', rep("not has_schema_privilege('anon', 'pgmq', 'usage')", 'true')),
  S('argent', 'FA-6', "compte rendu d'essai de 0 octet", 'essai', () => ''),
  S('argent', 'FA-6', "compte rendu d'une autre empreinte", 'essai', (t) => t.replace(/ESSAI_A_SEC ([0-9a-f]{64})/, (m, e) => `ESSAI_A_SEC ${e.slice(0, 63)}${e.at(-1) === '0' ? '1' : '0'}`)),
  S('argent', 'FA-7', '0088_site_commande.sql modifiée', 'existant', (t) => `${t}\n-- modifiée par un sabotage\n`, { cible: 'supabase/migrations/0088_site_commande.sql' }),
  // 0101 — horloge-sql-qa
  S('horloge', 'HS-1', 'un jeton en clair dans un commentaire', 'migration', (t) => ajout(t, '-- jeton : Ab3dEf6hIj9kLm2nOp5qRs8tUv1wXy4zQ7')),
  S('horloge', 'HS-1', 'vault.create_secret', 'migration', (t) => ajout(t, "select vault.create_secret('x', 'cron_secret');")),
  S('horloge', 'HS-2', 'timeout_milliseconds absent', 'migration', rep(", timeout_milliseconds := 30000);", ');')),
  S('horloge', 'HS-2', 'timeout de 2 000 ms', 'migration', rep('timeout_milliseconds := 30000', 'timeout_milliseconds := 2000')),
  S('horloge', 'HS-2', 'une autre URL', 'migration', rep("url := 'https://prestiapp.fr/api/agents/tic'", "url := 'https://prestiapp.fr/api/agents/tic2'")),
  S('horloge', 'HS-2', 'Authorization en clair', 'migration', rep("'Bearer ' || v_s", "'Bearer jeton-de-test'")),
  S('horloge', 'HS-2', 'sans secret, pas de return null', 'migration', rep('    return null;\n  end if;\n  return net.http_get', '  end if;\n  return net.http_get')),
  S('horloge', 'HS-2', 'les baux après la lecture du secret', 'migration', (t) => {
    const bloc = "  begin\n    perform public.ops_baux_expirer();\n  exception when others then\n    perform public.ops_evenement_ajouter('systeme', 'horloge_erreur', 'ops_baux_expirer', left(sqlerrm, 200), null);\n  end;\n"
    return rep("    return null;\n  end if;\n", `    return null;\n  end if;\n${bloc}`)(rep(bloc, '')(t))
  }),
  S('horloge', 'HS-3', 'ops_horloge_minute accordée à service_role', 'migration', (t) => ajout(t, 'grant execute on function public.ops_horloge_minute() to service_role;')),
  S('horloge', 'HS-3', 'ops_horloge_etat sans security definer', 'migration', rep('stable\nsecurity definer\nset search_path = ops, public, pg_temp', 'stable\nset search_path = ops, public, pg_temp')),
  S('horloge', 'HS-4', 'ops_horloge_etat rend le secret', 'migration', rep("    'secret_present', exists", "    'secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),\n    'secret_present', exists")),
  S('horloge', 'HS-5', 'le tic toutes les 5 minutes', 'migration', rep("'presti-agents-tic', '* * * * *'", "'presti-agents-tic', '*/5 * * * *'")),
  S('horloge', 'HS-5', 'le ménage sous un autre nom', 'migration', rep("'presti-cron-menage', '17 3 * * *'", "'presti-menage', '17 3 * * *'")),
  S('horloge', 'HS-6', 'le contrôle lit decrypted_secret hors exists', 'controle', (t) => t.replace(/;\s*$/, "\nunion all\nselect 'valeur', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret');\n")),
  S('horloge', 'HS-6', 'le contrôle oublie presti-cron-menage', 'controle', rep("\n             and exists (select 1 from cron.job where jobname = 'presti-cron-menage' and active)", '')),
  S('horloge', 'HS-7', 'la notice parle de SQL Editor', 'doc', (t) => `${t}\nOu bien, dans le SQL Editor, exécuter une requête.\n`),
  S('horloge', 'HS-7', 'la notice sans « deux endroits »', 'doc', rep('il faut le changer aux deux\nendroits', 'il faut le changer aussi')),
  S('horloge', 'HS-7', 'la notice donne vault.create_secret', 'doc', (t) => `${t}\n\`select vault.create_secret('…', 'cron_secret')\`\n`),
  S('horloge', 'HS-8', "compte rendu d'essai de 0 octet", 'essai', () => ''),
  S('horloge', 'HS-8', "compte rendu d'une autre empreinte", 'essai', (t) => t.replace(/ESSAI_A_SEC ([0-9a-f]{64})/, (m, e) => `ESSAI_A_SEC ${e.slice(0, 63)}${e.at(-1) === '0' ? '1' : '0'}`)),
  S('horloge', 'HS-9', 'un contrôle existant modifié', 'existant', (t) => `${t}\n-- modifié par un sabotage\n`, { cible: 'supabase/controles/0096_ops_socle.sql' }),
]
// Des variantes qui ne sabotent rien : le juge doit rester vert (pas de faux positif).
const BENINS = [
  S('prospection', null, 'un commentaire qui nomme boite_ dans le corps', 'migration', rep('  -- 1. la pause générale\n', "  -- 1. la pause générale (plus de boite_NN ni de canal 'email' : voie gratuite)\n")),
  S('prospection', null, "l'ordre « update of statut or insert »", 'migration', rep('before insert or update of statut on ops.envois', 'before update of statut or insert on ops.envois')),
  S('prospection', null, 'create or replace trigger, sans drop', 'migration', (t) => rep('create trigger garde_envois', 'create or replace trigger garde_envois')(rep('drop trigger if exists garde_envois on ops.envois;\n', '')(t))),
  S('argent', null, 'if not found remplacé par get diagnostics', 'migration', rep('  if not found then\n    return null;\n  end if;\n  v_msg', '  get diagnostics v_msg = row_count;\n  if v_msg = 0 then\n    return null;\n  end if;\n  v_msg')),
  S('horloge', null, 'timeout de 45 000 ms', 'migration', rep('timeout_milliseconds := 30000', 'timeout_milliseconds := 45000')),
]

// ── Déroulé ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// --seulement=<texte> : ne rejoue que les cas dont le juge, le critère ou le libellé contient ce texte (mise au point ; le
// rapport n'est alors pas écrit, pour qu'un passage partiel ne passe jamais pour la preuve entière).
const SEUL = (process.argv.find((a) => a.startsWith('--seulement=')) || '').slice(12)
const garde = (x) => !SEUL || [x.juge, x.critere || '', x.quoi].some((v) => v.includes(SEUL))
if (SEUL) { SABOTAGES.splice(0, SABOTAGES.length, ...SABOTAGES.filter(garde)); BENINS.splice(0, BENINS.length, ...BENINS.filter(garde)) }
const md = ['# 026-032 — les trois juges : verts sur le témoin, rouges sur chaque sabotage', '',
  `Écrit par \`node .orchestre/preuves/026-032/eprouver.mjs\` le ${new Date().toISOString()}. Racine de travail : \`${versSlash(path.relative(R, RACINE))}\` (copie de \`supabase/\`, migrations témoins de \`.orchestre/preuves/026-032/temoins/\`, jumeaux fabriqués par \`sql-nu.mjs\`, compte rendu d'essai synthétique propre à cette racine). Chaque ligne : un passage réel du juge.`, '']
let rates = 0
preparer()
md.push('## Le témoin : chaque juge vert', '', '| Juge | Code | Bilan | Critères |', '|---|---|---|---|')
for (const nom of Object.keys(MIG)) {
  etat()
  const x = juger(nom)
  const verts = [...x.criteres].filter(([, v]) => v.verdict === 'PASS').map(([k]) => k)
  const sautes = [...x.criteres].filter(([, v]) => v.verdict === 'SAUTE').map(([k]) => k)
  const ok = x.code === 0 && x.bilan === 'PASS' && sautes.every((k) => /-(8|10)$/.test(k)) && sautes.length === 1
  if (!ok) { rates++; console.log(`✗ témoin ${nom} : code ${x.code}, bilan ${x.bilan}\n${x.sortie.split('\n').filter((l) => l.startsWith('FAIL')).join('\n')}`) }
  md.push(`| \`${MIG[nom].juge}\` | ${x.code} | ${x.bilan} | ${ok ? '✅' : '❌'} PASS ${verts.join(', ')} ; SAUTE ${sautes.join(', ')} (--reel) |`)
}
md.push('', '## Les sabotages : chaque critère visé rouge', '', '| Juge | Sabotage | Critère visé | Code | Ligne du critère | Verdict |', '|---|---|---|---|---|---|')
for (const sab of SABOTAGES) {
  etat(sab)
  const x = juger(sab.juge)
  const c = x.criteres.get(sab.critere)
  const ok = x.code === 1 && c?.verdict === 'FAIL' && x.rouges.includes(sab.critere)
  if (!ok) { rates++; console.log(`✗ sabotage non vu : ${sab.juge} ${sab.critere} « ${sab.quoi} » → code ${x.code}, ${sab.critere} ${c?.verdict ?? 'absent'}`) }
  md.push(`| ${sab.juge} | ${sab.quoi} | ${sab.critere} | ${x.code} | ${(c ? `${c.verdict} ${sab.critere} — ${c.detail}` : 'aucune').replace(/\|/g, '\\|').slice(0, 170)} | ${ok ? '✅ vu' : '❌ RATÉ'} |`)
}
md.push('', '## Les variantes bénignes : le juge reste vert', '', '| Juge | Variante | Code | Bilan | Verdict |', '|---|---|---|---|---|')
for (const b of BENINS) {
  etat(b)
  const x = juger(b.juge)
  const ok = x.code === 0 && x.bilan === 'PASS'
  if (!ok) { rates++; console.log(`✗ faux positif : ${b.juge} « ${b.quoi} » → code ${x.code} ${x.rouges.join(', ')}\n${x.sortie.split('\n').filter((l) => l.startsWith('FAIL')).join('\n')}`) }
  md.push(`| ${b.juge} | ${b.quoi} | ${x.code} | ${x.bilan}${x.rouges.length ? ` — ${x.rouges.join(', ')}` : ''} | ${ok ? '✅ vert' : '❌ faux positif'} |`)
}
// --sans-essai (mutations seulement) : le critère d'essai est SAUTÉ, même sur un compte rendu de 0 octet, et rien d'autre ne change
md.push('', '## --sans-essai : le critère d\'essai sauté, les autres jugés', '', '| Juge | Compte rendu | Code | Critère d\'essai | Bilan | Verdict |', '|---|---|---|---|---|---|')
const ESSAI = { prospection: 'PG-6', argent: 'FA-6', horloge: 'HS-8' }
for (const nom of Object.keys(MIG).filter((j) => !SEUL || j.includes(SEUL) || SEUL === 'sans-essai')) {
  etat(S(nom, ESSAI[nom], 'compte rendu vide', 'essai', () => ''))
  const x = juger(nom, ['--sans-essai'])
  const c = x.criteres.get(ESSAI[nom])
  const ok = x.code === 0 && x.bilan === 'PASS' && c?.verdict === 'SAUTE'
  if (!ok) { rates++; console.log(`✗ --sans-essai ${nom} : code ${x.code}, ${ESSAI[nom]} ${c?.verdict ?? 'absent'}`) }
  md.push(`| ${nom} | 0 octet | ${x.code} | ${c ? `${c.verdict} ${ESSAI[nom]}` : 'absent'} | ${x.bilan} | ${ok ? '✅' : '❌'} |`)
  const y = juger(nom, ['--sans-essai', '--temoin'])
  const ok2 = y.code === 2
  if (!ok2) { rates++; console.log(`✗ --sans-essai --temoin ${nom} accepté : code ${y.code}`) }
  md.push(`| ${nom} | --sans-essai --temoin (appel invalide) | ${y.code} | — | — | ${ok2 ? '✅ refusé (code 2)' : '❌ accepté'} |`)
}
etat()
const parJuge = Object.keys(MIG).map((j) => `${j} : ${new Set(SABOTAGES.filter((s) => s.juge === j).map((s) => s.critere)).size} critères sabotés`).join(' ; ')
md.push('', `Bilan : ${SABOTAGES.length} sabotages (${parJuge}), ${BENINS.length} variantes bénignes, 3 témoins. ${rates ? `**${rates} écart(s)**` : '**tout est comme attendu**'}.`, '')
if (!SEUL) fs.writeFileSync(path.join(ICI, 'sabotages.md'), md.join('\n'))
console.log(`${rates ? '✗' : '✓'} ${SABOTAGES.length} sabotages, ${BENINS.length} bénins, 3 témoins — ${rates} écart(s) ; .orchestre/preuves/026-032/sabotages.md`)
process.exit(rates ? 1 : 0)
