// Les migrations 0183 (organisations), 0184 (garde de session étendue aux membres) et 0188 (gardes reposées) tiennent-elles leurs
// promesses multi-locataires, AVANT que Benj ne les pose ? (chantier 4, lot L6b, pas M1, M2 et M6 ; plan §8.2, §8.3, §10 ; tâche 032-032)
//
// Partie STATIQUE, toujours jouée, hors ligne (`--statique` : elle seule) : elle lit les trois fichiers et prouve
//   en-tête « NON APPLIQUÉE » et retour arrière écrit ; RLS, les quatre gardes de 0138, anon retiré, écritures retirées à authenticated
//   sur chaque table neuve ; aucune politique existante touchée (aucune org_*, rien sur une table existante, 0184 et 0188 sans aucune
//   politique modifiée) ; l'interrupteur organisations_ouvertes semé FAUX et lu par comptes_accessibles ; comptes_accessibles en
//   security definer, membre actif seulement, organisation et personne dans le bon sens, suspension exclue de l'écriture ;
//   lib/organisations/droits.ts égal à droits_roles, ligne pour ligne, dans le même ordre ; 0184 recopie les corps de 0138 à l'octet près
//   et ferme la faille ; 0188 strictement additive ; jumeaux identiques à leur migration.
// MUTANTS : chaque promesse est cassée à son tour dans une copie en mémoire (dont les 4 du plan §10 l.658 : statut='actif' retiré,
//   organisation_id inversé, garde de suspension retirée, security invoker) ; la vérification visée DOIT rougir.
// Partie PGLITE (sans `--statique`), seulement si PGLITE_DIR est posé (dossier où `npm install @electric-sql/pglite` a été fait, comme
//   assistant-qa.mjs:1131-1137) : 0138, 0183, 0184 et 0188 jouées deux fois sur un socle factice ; deux organisations à quatre rôles,
//   étanches ; matrice dans les deux sens ; compagnon ; membre sans ligne artisans ; inscription non régressée ; interrupteur ; suspension ;
//   retours arrière ; les 4 mutations du plan rejouées pour de vrai. Sans PGlite : code 2, « en attente », jamais un faux vert.
//
// Ce qu'elle NE prouve PAS : le comportement de la vraie base Supabase (essai à sec de la session principale, plan §8.3 l.574-575).
// Aucune donnée réelle : des identifiants tirés au hasard.
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/organisations-qa.mjs [--statique]
// Codes : 0 vert · 1 rouge · 2 partie PGlite en attente (PGLITE_DIR absent, ou paquet introuvable)
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { sansCommentaires, MARQUE_CONTROLE } from './sql-nu.mjs'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(RACINE, 'supabase/migrations')
const STATIQUE = process.argv.includes('--statique')
const FICHIERS = { '0183': '0183_organisations.sql', '0184': '0184_garde_session_membres.sql', '0188': '0188_garde_session_rejouee.sql' }
const lire = (nom) => fs.readFileSync(path.join(DIR, nom), 'utf8')
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const espaces = (s) => s.replace(/\s+/g, ' ')

const TABLES_0183 = ['utilisateurs', 'organisations', 'membres', 'invitations', 'droits_roles']
const SANS_LECTURE = new Set(['invitations', 'droits_roles']) // aucune politique : clé de service seulement
const LECTURES_PERMISES = {
  utilisateurs: 'for select to authenticated using ((select auth.uid()) = id)',
  organisations: 'for select to authenticated using ((select auth.uid()) = id)',
  membres: 'for select to authenticated using ((select auth.uid()) = organisation_id or (select auth.uid()) = utilisateur_id)',
}
const GARDES = {
  garde_session: 'as restrictive for all to authenticated using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()))',
  garde_suspension_ins: 'as restrictive for insert to authenticated with check ((select public.compte_non_suspendu()))',
  garde_suspension_maj: 'as restrictive for update to authenticated using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()))',
  garde_suspension_sup: 'as restrictive for delete to authenticated using ((select public.compte_non_suspendu()))',
}

/** Le corps entre parenthèses qui suit `create table if not exists public.<t>`, ou null. */
function corpsTable(code, t) {
  const m = new RegExp(`create table if not exists public\\.${esc(t)}\\s*\\(`, 'i').exec(code)
  if (!m) return null
  let i = m.index + m[0].length, prof = 1, dansChaine = false
  for (; i < code.length && prof > 0; i++) {
    const c = code[i]
    if (c === "'") dansChaine = !dansChaine
    else if (!dansChaine && c === '(') prof++
    else if (!dansChaine && c === ')') prof--
  }
  return code.slice(m.index + m[0].length, i - 1)
}

/** La définition entière d'une fonction (`create or replace function public.<nom>(` … tag de fin), ou ''. */
function fonction(code, nom) {
  const m = new RegExp(`create or replace function public\\.${esc(nom)}\\(`, 'i').exec(code)
  if (!m) return ''
  const tag = /as (\$[A-Za-z_]*\$)/.exec(code.slice(m.index))
  if (!tag) return ''
  const debut = m.index + tag.index + tag[0].length
  const fin = code.indexOf(tag[1], debut)
  return fin < 0 ? '' : code.slice(m.index, fin + tag[1].length)
}

/** Le bloc `do $gardes$ … $gardes$` : la liste des tables qu'il parcourt, et son corps aplati. */
function blocGardes(code) {
  const m = /do \$gardes\$([\s\S]*?)\$gardes\$/i.exec(code)
  if (!m) return { tables: [], corps: '' }
  const a = /foreach t in array array\[([^\]]*)\]/i.exec(m[1])
  return { tables: a ? [...a[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]) : [], corps: espaces(m[1]) }
}

/** Les lignes `--` qui suivent « Retour arrière » dans l'en-tête. */
const retourArriere = (brut) => /Retour arrière[^\n]*\n((?:--[^\n]*\n)+)/.exec(brut)?.[1] ?? ''

/** La matrice insérée dans droits_roles, dans l'ordre du fichier. */
function matriceSql(code) {
  const m = /insert into public\.droits_roles \(role, domaine, niveau\) values([\s\S]*?)on conflict/i.exec(code)
  return m ? [...m[1].matchAll(/\('([a-z_]+)', '([a-z_]+)', '([a-z_]+)'\)/g)].map((x) => [x[1], x[2], x[3]]) : []
}

/** Les corps de 0138 tels que 0184 les recopie : de la création de jeton_session_valide au dernier grant. */
const corps0138 = (t0138) => {
  const l = t0138.split('\n')
  const d = l.findIndex((x) => x.startsWith('create or replace function public.jeton_session_valide()'))
  const f = l.findIndex((x) => x.startsWith('grant execute on function public.compte_non_suspendu() to authenticated, anon;'))
  return d < 0 || f < 0 ? null : l.slice(d, f + 1).map((x) => x.replace(/\s+$/, ''))
}
const copieDans0184 = (t0184) => {
  const m = /-- ▼ CORPS DE 0138[^\n]*\n([\s\S]*?)-- ▲ FIN DES CORPS DE 0138/.exec(t0184)
  return m ? m[1].replace(/\n$/, '').split('\n').map((x) => x.replace(/^-- ?/, '').replace(/\s+$/, '')) : null
}

/** Rend les vérifications { nom, ok, detail } sur les textes donnés (bruts) et la matrice de droits.ts. */
function verifier(textes, matrice, t0138) {
  const res = []
  const T = (nom, ok, detail = '') => res.push({ nom, ok: !!ok, detail })

  for (const [num, brut] of Object.entries(textes)) {
    const code = sansCommentaires(brut)
    T(`${num} en-tête « NON APPLIQUÉE, préparée le 02/11, attend le go écrit de Benj »`, /NON APPLIQUÉE, préparée le 02\/11, attend le go écrit de Benj/.test(brut.slice(0, 1500)))
    T(`${num} retour arrière écrit`, retourArriere(brut).length > 40)
    T(`${num} aucune politique org_* (elles viennent en M3, plan §10 l.648-650)`, !/create policy "?org_/i.test(code))
    T(`${num} aucune alter policy`, !/alter policy/i.test(code))
    T(`${num} aucune colonne organization_id`, !/\borganization_id\b/i.test(code))
    T(`${num} aucun grant à anon`, !/grant [^;]* to [^;]*\banon\b/i.test(espaces(code).replace(/grant execute on function public\.(jeton_session_valide|compte_non_suspendu)\(\) to authenticated, anon;/g, '')))
    T(`${num} rien pour n8n_lecture`, !/n8n_lecture/i.test(code))
    const definers = [...espaces(code).matchAll(/create or replace function (public\.\w+)\(([^)]*)\)([^$]*)\$/gi)]
    T(`${num} chaque fonction a un search_path vide`, definers.every((f) => /set search_path = ''/.test(f[3])), definers.filter((f) => !/set search_path = ''/.test(f[3])).map((f) => f[1]).join(', '))
  }

  // ── 0183 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const b83 = textes['0183'] ?? '', c83 = sansCommentaires(b83), p83 = espaces(c83), ra83 = retourArriere(b83)
  const g = blocGardes(c83)
  for (const t of TABLES_0183) {
    const corps = corpsTable(c83, t)
    T(`0183 ${t} : créée`, corps !== null)
    T(`0183 ${t} : retour arrière la retire`, new RegExp(`drop table if exists public\\.${esc(t)};`).test(ra83))
    if (corps === null) continue
    T(`0183 ${t} : colonnes en français (cree_le, ni created_at ni updated_at)`, /\bcree_le\b/.test(corps) && !/\b(created_at|updated_at)\b/.test(corps))
    T(`0183 ${t} : RLS activée`, new RegExp(`alter table public\\.${esc(t)} enable row level security;`, 'i').test(c83))
    T(`0183 ${t} : dans la boucle des gardes`, g.tables.includes(t), `boucle : ${g.tables.join(', ') || '(absente)'}`)
    T(`0183 ${t} : anon retiré`, g.tables.includes(t) && /revoke all on public\.%I from anon/i.test(g.corps))
    T(`0183 ${t} : écritures retirées à authenticated`, g.tables.includes(t) && /revoke insert, update, delete, truncate[^']*on public\.%I from authenticated/i.test(g.corps))
    for (const [nom, def] of Object.entries(GARDES)) {
      T(`0183 ${t} : ${nom}`, g.tables.includes(t) && g.corps.includes(`create policy ${nom} on public.%I ${def}`))
    }
    const pols = [...p83.matchAll(new RegExp(`create policy (\\w+) on public\\.${esc(t)} ([^;]*);`, 'gi'))].map((m) => ({ nom: m[1], texte: m[2].trim() }))
    if (SANS_LECTURE.has(t)) {
      T(`0183 ${t} : aucune politique, rien pour authenticated`, pols.length === 0 && new RegExp(`revoke all on public\\.${esc(t)} from authenticated;`, 'i').test(c83))
    } else {
      T(`0183 ${t} : une seule politique, lecture de ses propres lignes`, pols.length === 1 && pols[0].texte === LECTURES_PERMISES[t], pols.map((p) => `${p.nom} ${p.texte}`).join(' | '))
    }
    T(`0183 ${t} : rien n'est accordé à anon ni à authenticated`, !new RegExp(`grant [^;]* on (table )?public\\.${esc(t)}\\b[^;]* to [^;]*(anon|authenticated|public)`, 'i').test(p83))
  }
  // Aucune table existante touchée (cadrage-p3.md:321) : politiques, alter table et déclencheurs ne visent que les tables neuves.
  const cibles = (re) => [...p83.matchAll(re)].map((m) => m[1]).filter((x) => x !== '%I')
  const horsPerimetre = [
    ...cibles(/(?:create|drop) policy (?:if exists )?\w+ on public\.([%\w]+)/gi),
    ...cibles(/alter table public\.([%\w]+)/gi),
    ...cibles(/create trigger \w+ [^;]*? on public\.([%\w]+)/gi),
    ...cibles(/drop trigger if exists \w+ on public\.([%\w]+)/gi),
  ].filter((x) => !TABLES_0183.includes(x))
  T('0183 aucune politique, aucun déclencheur, aucun alter sur une table existante', horsPerimetre.length === 0, [...new Set(horsPerimetre)].join(', '))
  T('0183 aucune colonne ajoutée à une table existante', !/add column/i.test(c83))

  // L'interrupteur.
  T('0183 interrupteur organisations_ouvertes semé FAUX', /insert into ops\.interrupteurs \(nom, actif, motif\)\s*values \('organisations_ouvertes', false,/i.test(c83) && /on conflict \(nom\) do nothing;/.test(c83))
  T('0183 la contrainte de nom admet organisations_ouvertes (et sms_arret, pour 0186 posée avant)', /add constraint interrupteurs_nom\s+check \(nom in \('pause_generale', 'envoi_froid', 'sms_arret', 'organisations_ouvertes'\)\)/i.test(c83))
  T('0183 retour arrière : l’interrupteur retiré', /delete from ops\.interrupteurs where nom = 'organisations_ouvertes';/.test(ra83))
  const lu = espaces(fonction(c83, 'organisations_ouvertes_lu'))
  T('0183 organisations_ouvertes_lu : absent = fermé', lu.includes("select coalesce((select i.actif from ops.interrupteurs i where i.nom = 'organisations_ouvertes'), false)"))
  T('0183 organisations_ouvertes_lu : réservée aux fonctions (retirée à public, anon et authenticated)', /revoke all on function public\.organisations_ouvertes_lu\(\) from public, anon, authenticated;/.test(c83) && !/grant execute on function public\.organisations_ouvertes_lu/.test(c83))

  // comptes_accessibles : les quatre mutations du plan visent ces lignes.
  const ca = espaces(fonction(c83, 'comptes_accessibles'))
  T('comptes_accessibles : stable, security definer, search_path vide', /returns setof uuid language sql stable security definer set search_path = ''/.test(ca))
  T('comptes_accessibles : membre actif seulement (statut = actif)', ca.includes("where m.utilisateur_id = (select auth.uid()) and m.statut = 'actif'"))
  T('comptes_accessibles : rend l’organisation, filtrée sur la personne (organisation_id dans le bon sens)', ca.includes('select m.organisation_id from public.membres m join public.organisations o on o.id = m.organisation_id') && ca.includes('where m.utilisateur_id = (select auth.uid())') && !/m\.organisation_id = \(select auth\.uid\(\)\)/.test(ca))
  T('comptes_accessibles : garde de suspension (écriture refusée à un compte suspendu)', ca.includes("and (p_niveau = 'lecture' or not exists (select 1 from public.suspensions s where s.artisan_id = m.organisation_id and s.levee_le is null))"))
  T('comptes_accessibles : lit l’interrupteur organisations_ouvertes', ca.includes('and (select public.organisations_ouvertes_lu())'))
  T('comptes_accessibles : organisation active seulement', ca.includes('and o.actif'))
  T('comptes_accessibles : siens et restreint n’ouvrent pas le compte', ca.includes("and p_niveau in ('lecture', 'ecriture') and (d.niveau = 'ecriture' or (d.niveau = 'lecture' and p_niveau = 'lecture'))"))
  T('comptes_accessibles : son propre compte, toujours (comportement d’aujourd’hui)', ca.includes('select u.uid from (select auth.uid() as uid) u where u.uid is not null union'))
  const rd = espaces(fonction(c83, 'role_de'))
  T('role_de : security definer, membre actif, organisation active, interrupteur lu', /security definer set search_path = ''/.test(rd) && rd.includes("and m.statut = 'actif' and o.actif and (select public.organisations_ouvertes_lu())"))
  const pa = espaces(fonction(c83, 'peut_acceder'))
  T('peut_acceder : passe par comptes_accessibles (security invoker)', /security invoker/.test(pa) && pa.includes('from public.comptes_accessibles(p_domaine, p_niveau) c where c = p_artisan'))
  for (const f of ['comptes_accessibles(text, text)', 'peut_acceder(uuid, text, text)', 'role_de(uuid)']) {
    T(`0183 ${f} : exécution retirée à public et à anon`, c83.includes(`revoke all on function public.${f} from public, anon;`))
  }
  T('0183 chaque fonction security definer contrôle auth.uid() ou n’est appelable par personne', ['comptes_accessibles', 'role_de', 'organisations_ouvertes_lu'].every((n) => {
    const f = fonction(c83, n)
    return !/security definer/.test(f) || /auth\.uid\(\)/.test(f) || new RegExp(`revoke all on function public\\.${n}\\(\\) from public, anon, authenticated;`).test(c83)
  }))
  for (const f of ['role_de', 'peut_acceder', 'comptes_accessibles', 'organisations_ouvertes_lu', 'invitations_gardes', 'membres_gardes', 'organisations_maj_le']) {
    T(`0183 retour arrière : ${f} retirée`, new RegExp(`drop function if exists public\\.${f}\\(`).test(ra83))
  }
  T('0183 retour arrière : refuse de passer tant que 0184 est en place (les deux fonctions de garde)', espaces(ra83.replace(/^--/gm, '')).includes("proname in ('jeton_session_valide', 'compte_non_suspendu') and (prosrc ilike '%utilisateurs%' or prosrc ilike '%membres%')") && /raise exception 'retirer 0184 avant 0183/.test(ra83))
  T('0183 note pour M3 : les politiques org_* s’écrivent « to authenticated »', /chaque politique org_\* s'écrit « to authenticated »/.test(b83.slice(0, 4000)))

  // utilisateurs (relecture du 02/11, G1) : vérifiée dès la création, une ligne pour chaque membre non titulaire.
  const ut = espaces(corpsTable(c83, 'utilisateurs') ?? '')
  T('utilisateurs : connexion_verifiee_le naît à now() (un membre au mot de passe seul passe le code)', ut.includes('connexion_verifiee_le timestamptz default now()'))
  const mg = espaces(fonction(c83, 'membres_gardes'))
  T('membres : chaque adhésion non titulaire crée sa ligne utilisateurs', mg.includes("if new.role <> 'titulaire' then insert into public.utilisateurs (id) values (new.utilisateur_id) on conflict (id) do nothing; end if;"))
  // membres, invitations.
  const mb = espaces(corpsTable(c83, 'membres') ?? '')
  T('membres : cinq rôles, pas un de plus', mb.includes("role text not null check (role in ('titulaire', 'associe', 'administratif', 'compagnon', 'invite'))"))
  T('membres : statut invité, actif ou retiré, invité par défaut', mb.includes("statut text not null default 'invite' check (statut in ('invite', 'actif', 'retire'))"))
  T('membres : unique par (organisation, utilisateur)', mb.includes('constraint membres_unique unique (organisation_id, utilisateur_id)'))
  T('membres : le titulaire est l’artisan lui-même, et lui seul', mb.includes("constraint membres_titulaire_soi check ((role = 'titulaire') = (utilisateur_id = organisation_id))") && /create unique index if not exists membres_un_titulaire on public\.membres \(organisation_id\) where role = 'titulaire';/.test(c83))
  T('membres : la fiche d’équipe appartient à la même organisation', espaces(fonction(c83, 'membres_gardes')).includes('where e.id = new.equipe_membre_id and e.artisan_id = new.organisation_id'))
  T('membres : index sur la personne pour comptes_accessibles', /create index if not exists membres_utilisateur_actif_idx on public\.membres \(utilisateur_id\) where statut = 'actif';/.test(c83))
  const iv = espaces(corpsTable(c83, 'invitations') ?? '')
  T('invitations : 7 jours au plus', iv.includes("constraint invitations_duree check (expire_le > cree_le and expire_le <= cree_le + interval '7 days')"))
  T('invitations : seulement l’empreinte du jeton (SHA-256), unique', iv.includes("jeton_empreinte text not null check (jeton_empreinte ~ '^[0-9a-f]{64}$')") && iv.includes('constraint invitations_jeton_unique unique (jeton_empreinte)') && !/\bjeton text\b/.test(iv))
  T('invitations : on n’invite jamais un titulaire', iv.includes("role text not null check (role in ('associe', 'administratif', 'compagnon', 'invite'))"))
  const ig = espaces(fonction(c83, 'invitations_gardes'))
  T('invitations : usage unique (figée une fois utilisée ou révoquée), date de création imposée', ig.includes('if old.utilisee_le is not null or old.revoquee_le is not null then raise exception') && ig.includes('new.cree_le := now();') && /create trigger invitations_gardes before insert or update on public\.invitations/.test(p83))
  T('invitations : la mise à null par une clé étrangère passe (effacement d’une fiche d’équipe ou d’un compte, relecture G2)', iv.includes('constraint invitations_usage check (utilisee_par is null or utilisee_le is not null)')
    && ig.indexOf('and (new.utilisee_par is distinct from old.utilisee_par or new.equipe_membre_id is distinct from old.equipe_membre_id)') > 0
    && ig.indexOf('and (new.utilisee_par is distinct from old.utilisee_par or new.equipe_membre_id is distinct from old.equipe_membre_id)') < ig.indexOf('if old.utilisee_le is not null or old.revoquee_le is not null then raise exception'))
  T('invitations : courriel, auteur et fiche d’équipe figés ; une utilisation nomme la personne', ig.includes('or new.invite_par <> old.invite_par or new.equipe_membre_id is distinct from old.equipe_membre_id then raise exception') && ig.includes('new.courriel_empreinte <> old.courriel_empreinte') && ig.includes('if new.utilisee_le is not null and new.utilisee_par is null then raise exception'))
  T('invitations : la fiche d’équipe appartient à la même organisation', ig.includes('where e.id = new.equipe_membre_id and e.artisan_id = new.organisation_id'))

  // Une organisation et un titulaire par artisan existant.
  T('0183 une organisation par artisan (idempotent)', p83.includes('insert into public.organisations (id) select a.id from public.artisans a on conflict (id) do nothing;'))
  T('0183 un titulaire actif par artisan (idempotent)', p83.includes("insert into public.membres (organisation_id, utilisateur_id, role, statut, actif_le) select a.id, a.id, 'titulaire', 'actif', now() from public.artisans a on conflict (organisation_id, utilisateur_id) do nothing;"))

  // La matrice : droits.ts = droits_roles, dans le même ordre.
  const sql = matriceSql(c83)
  T('droits_roles : 60 lignes (5 rôles × 12 domaines), chaque paire une fois', sql.length === 60 && new Set(sql.map(([r, d]) => `${r}:${d}`)).size === 60, `${sql.length} lignes`)
  T('lib/organisations/droits.ts dit la même chose que droits_roles, ligne pour ligne et dans le même ordre', JSON.stringify(sql) === JSON.stringify((matrice ?? []).map((l) => [...l])),
    (() => { const i = sql.findIndex((l, k) => JSON.stringify(l) !== JSON.stringify(matrice?.[k] ? [...matrice[k]] : null)); return i < 0 ? `longueurs ${sql.length} / ${matrice?.length}` : `ligne ${i + 1} : SQL ${sql[i]} / TS ${matrice?.[i]}` })())
  const n = (r, d) => sql.find((l) => l[0] === r && l[1] === d)?.[2]
  T('matrice : le titulaire seul gère l’abonnement, les membres et le niveau 3', ['abonnement', 'autonomie'].every((d) => n('titulaire', d) === 'ecriture' && ['associe', 'administratif', 'compagnon', 'invite'].every((r) => n(r, d) === 'aucun')))
  T('matrice : le compagnon ne voit jamais la compta (demandes, devis, factures, tarifs)', ['demandes', 'devis', 'factures', 'tarifs'].every((d) => n('compagnon', d) === 'aucun') && n('compagnon', 'chantiers') === 'siens')
  T('matrice : l’invité n’écrit rien', sql.filter((l) => l[0] === 'invite').every((l) => ['aucun', 'lecture'].includes(l[2])))
  T('matrice : le titulaire a tout', sql.filter((l) => l[0] === 'titulaire').every((l) => l[2] === 'ecriture'))

  // ── 0184 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const b84 = textes['0184'] ?? '', c84 = sansCommentaires(b84), p84 = espaces(c84)
  const attendu = t0138 ? corps0138(t0138) : null, copie = copieDans0184(b84)
  T('0184 retour arrière : les corps de 0138 recopiés en tête, à l’octet près', attendu && copie && JSON.stringify(attendu) === JSON.stringify(copie),
    attendu && copie ? (() => { const i = attendu.findIndex((l, k) => l !== copie[k]); return `ligne ${i + 1} : « ${attendu[i]} » / « ${copie[i]} »` })() : 'copie ou 0138 introuvable')
  T('0184 aucune politique créée, retirée ni modifiée', !/(create|drop|alter) policy/i.test(c84))
  T('0184 aucune table créée ni modifiée', !/(create|alter|drop) table/i.test(c84))
  const js = espaces(fonction(c84, 'jeton_session_valide'))
  T('0184 jeton_session_valide : stable, security definer, search_path vide', /returns boolean language sql stable security definer set search_path = ''/.test(js))
  T('0184 jeton_session_valide : lit artisans ET utilisateurs, le plus strict gagne (relecture G1)', js.includes('from public.artisans ar, j where ar.id = j.uid union all select u.sessions_invalides_avant, u.connexion_verifiee_le from public.utilisateurs u, j where u.id = j.uid )') && !/ar2/.test(js))
  T('0184 jeton_session_valide : refuse un membre actif non titulaire sans ligne (la faille de 0138)', js.includes("(exists (select 1 from a) or not exists (select 1 from public.membres m, j where m.utilisateur_id = j.uid and m.statut = 'actif' and m.role <> 'titulaire'))"))
  T('0184 jeton_session_valide : garde les trois conditions de 0138 (révocation, aal2, code par e-mail)', js.includes("coalesce(((select c from j)->>'iat')::bigint, 0) < floor(extract(epoch from a.sessions_invalides_avant))::bigint")
    && js.includes("f.factor_type = 'totp' and f.status = 'verified'") && js.includes("where s.session_id::text = j.c->>'session_id' and s.user_id = j.uid"))
  T('0184 compte_non_suspendu reste celle de 0138 (la suspension d’une organisation passe par comptes_accessibles, relecture M3)', !/function public\.compte_non_suspendu/i.test(c84))
  T('0184 les droits d’exécution de 0138, inchangés', p84.includes('revoke all on function public.jeton_session_valide() from public; grant execute on function public.jeton_session_valide() to authenticated, anon;'))

  // ── 0188 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const b88 = textes['0188'] ?? '', c88 = sansCommentaires(b88), p88 = espaces(c88), ra88 = retourArriere(b88)
  T('0188 parcourt chaque table à RLS du schéma public (la boucle de 0138:102-104)', p88.includes("where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity"))
  T('0188 strictement additive : une garde n’est créée que si elle manque', p88.includes('if not exists (select 1 from pg_policies p where p.schemaname = \'public\' and p.tablename = t.relname and p.policyname = g.nom) then'))
  T('0188 aucune politique retirée ni modifiée', !/(drop|alter) policy/i.test(c88))
  for (const [nom, def] of Object.entries(GARDES)) T(`0188 ${nom} : même définition que 0138`, p88.includes(`('${nom}', '${def}')`))
  T('0188 chaque garde posée porte « posée par 0188 »', p88.includes("execute format('comment on policy %I on public.%I is %L', g.nom, t.relname, 'posée par 0188');"))
  T('0188 contrôle final : quatre gardes restrictives sur chaque table à RLS, sinon rien ne reste', p88.includes("and p.permissive = 'RESTRICTIVE' and p.cmd = v.commande and p.roles = array['authenticated']::name[]") && /raise exception '0188 : tables à RLS sans leurs quatre gardes/.test(c88))
  T('0188 contrôle final : la commande et la fonction appelée de chaque garde, pas seulement son nom', p88.includes("('garde_session', 'ALL', 'jeton_session_valide'), ('garde_suspension_ins', 'INSERT', 'compte_non_suspendu')") && p88.includes("and (p.cmd = 'DELETE' or p.with_check like '%' || v.fonction || '%')) < 4;"))
  T('0188 retour arrière : ne retire que les gardes « posée par 0188 »', ra88.includes("obj_description(pol.oid, 'pg_policy') = 'posée par 0188'") && /drop policy if exists %I on public\.%I/.test(ra88))
  return res
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const resultats = []
const compter = (nom, ok, detail = '') => { resultats.push({ nom, ok: !!ok, detail }); console.log(`  ${ok ? '✅' : '❌'} ${nom}${!ok && detail ? `\n     → ${detail}` : ''}`) }

let droits = null
try { droits = await import(pathToFileURL(path.join(RACINE, 'lib/organisations/droits.ts')).href) } catch (e) {
  console.log(`  ❌ lib/organisations/droits.ts introuvable ou illisible (lancer avec --experimental-strip-types --import ./scripts/ts-loader.mjs) : ${e.message}`)
}
const textes = {}
for (const [n, f] of Object.entries(FICHIERS)) { try { textes[n] = lire(f) } catch { textes[n] = '' } }
const t0138 = lire('0138_garde_session_rls.sql')

console.log('\n══ 1. Les trois migrations, lues hors ligne ══\n')
compter('lib/organisations/droits.ts se charge', !!droits?.MATRICE)
compter('les trois migrations existent', Object.values(textes).every((t) => t.length > 0))
for (const v of verifier(textes, droits?.MATRICE, t0138)) compter(v.nom, v.ok, v.detail)
if (droits) {
  compter('droits.ts : ROLES et DOMAINES dans l’ordre de la matrice', JSON.stringify([...new Set(droits.MATRICE.map((l) => l[0]))]) === JSON.stringify(droits.ROLES) && JSON.stringify([...new Set(droits.MATRICE.map((l) => l[1]))]) === JSON.stringify(droits.DOMAINES))
  compter('droits.ts : ouvreLeCompte suit la règle de comptes_accessibles (siens et restreint fermés)', droits.ouvreLeCompte('compagnon', 'chantiers', 'lecture') === false && droits.ouvreLeCompte('administratif', 'assistant', 'lecture') === false
    && droits.ouvreLeCompte('invite', 'factures', 'lecture') === true && droits.ouvreLeCompte('invite', 'factures', 'ecriture') === false && droits.ouvreLeCompte('associe', 'devis', 'ecriture') === true)
}

console.log('\n══ 2. Les jumeaux à coller ══\n')
const noyau = (sql) => sansCommentaires(sql).split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim()).join('\n')
for (const [n, f] of Object.entries(FICHIERS)) {
  const j = `_A_COLLER_sql_editor_${n}_NU.sql`
  let jumeau = ''
  try { jumeau = lire(j) } catch { /* absent */ }
  compter(`${j} : présent`, jumeau.length > 0)
  if (!jumeau) continue
  compter(`${j} : même SQL que ${f}`, noyau(jumeau.split(MARQUE_CONTROLE)[0]) === noyau(textes[n]))
  compter(`${j} : porte un contrôle après collage`, jumeau.includes(MARQUE_CONTROLE) && /\(attendu : /.test(jumeau.split(MARQUE_CONTROLE)[1] ?? ''))
}

console.log('\n══ 3. Les mutants rougissent (une suite qui ne sait pas rougir ne prouve rien) ══\n')
const MUTANTS = [
  // Les quatre du plan (§10 l.658 ; cadrage-p3.md:342 (d)).
  ['PLAN 1 · statut = actif retiré', '0183', (s) => s.replace("   where m.utilisateur_id = (select auth.uid())\n     and m.statut = 'actif'\n", "   where m.utilisateur_id = (select auth.uid())\n"), 'comptes_accessibles : membre actif seulement (statut = actif)'],
  ['PLAN 2 · organisation_id inversé', '0183', (s) => s.replace('   where m.utilisateur_id = (select auth.uid())\n', '   where m.organisation_id = (select auth.uid())\n'), 'comptes_accessibles : rend l’organisation, filtrée sur la personne (organisation_id dans le bon sens)'],
  ['PLAN 3 · garde de suspension retirée', '0183', (s) => s.replace("\n     and (p_niveau = 'lecture'\n          or not exists (select 1 from public.suspensions s where s.artisan_id = m.organisation_id and s.levee_le is null))", ''), 'comptes_accessibles : garde de suspension (écriture refusée à un compte suspendu)'],
  ['PLAN 4 · comptes_accessibles en security invoker', '0183', (s) => s.replace('returns setof uuid\nlanguage sql stable security definer', 'returns setof uuid\nlanguage sql stable security invoker'), 'comptes_accessibles : stable, security definer, search_path vide'],
  // Les autres promesses.
  ['interrupteur semé vrai', '0183', (s) => s.replace("values ('organisations_ouvertes', false,", "values ('organisations_ouvertes', true,"), '0183 interrupteur organisations_ouvertes semé FAUX'],
  ['interrupteur non lu par comptes_accessibles', '0183', (s) => s.replace('     and (select public.organisations_ouvertes_lu())\n', ''), 'comptes_accessibles : lit l’interrupteur organisations_ouvertes'],
  ['siens compté comme lecture', '0183', (s) => s.replace("(d.niveau = 'ecriture' or (d.niveau = 'lecture' and p_niveau = 'lecture'))", "(d.niveau = 'ecriture' or (d.niveau in ('lecture', 'siens') and p_niveau = 'lecture'))"), 'comptes_accessibles : siens et restreint n’ouvrent pas le compte'],
  ['RLS retirée sur membres', '0183', (s) => s.replace('alter table public.membres enable row level security;', ''), '0183 membres : RLS activée'],
  ['membres sortie de la boucle des gardes', '0183', (s) => s.replace("'organisations', 'membres', 'invitations'", "'organisations', 'invitations'"), '0183 membres : garde_session'],
  ['garde de session affaiblie (permissive)', '0183', (s) => s.replace('garde_session on public.%I as restrictive for all', 'garde_session on public.%I for all'), '0183 invitations : garde_session'],
  ['anon non retiré', '0183', (s) => s.replace("    execute format('revoke all on public.%I from anon', t);\n", ''), '0183 utilisateurs : anon retiré'],
  ['écritures laissées à authenticated', '0183', (s) => s.replace(/\n {4}execute format\('revoke insert, update, delete, truncate[^\n]*/, ''), '0183 organisations : écritures retirées à authenticated'],
  ['membres : politique de lecture élargie à tous', '0183', (s) => s.replace('using ((select auth.uid()) = organisation_id or (select auth.uid()) = utilisateur_id);', 'using (true);'), '0183 membres : une seule politique, lecture de ses propres lignes'],
  ['invitations lisibles par le navigateur', '0183', (s) => s.replace('revoke all on public.invitations from authenticated;', ''), '0183 invitations : aucune politique, rien pour authenticated'],
  ['politique org_* posée sur une table existante', '0183', (s) => s + "\ncreate policy org_lire on public.devis for select to authenticated using (artisan_id in (select public.comptes_accessibles('devis', 'lecture')));\n", '0183 aucune politique, aucun déclencheur, aucun alter sur une table existante'],
  ['comptes_accessibles appelable par anon', '0183', (s) => s.replace('revoke all on function public.comptes_accessibles(text, text) from public, anon;\n', ''), '0183 comptes_accessibles(text, text) : exécution retirée à public et à anon'],
  ['invitation de 30 jours', '0183', (s) => s.replace("cree_le + interval '7 days'", "cree_le + interval '30 days'"), 'invitations : 7 jours au plus'],
  ['un titulaire par invitation', '0183', (s) => s.replace("role                text not null check (role in ('associe',", "role                text not null check (role in ('titulaire', 'associe',"), 'invitations : on n’invite jamais un titulaire'],
  ['titulaire qui n’est pas l’artisan', '0183', (s) => s.replace("  constraint membres_titulaire_soi check ((role = 'titulaire') = (utilisateur_id = organisation_id)),\n", ''), 'membres : le titulaire est l’artisan lui-même, et lui seul'],
  ['compagnon qui lit les devis (SQL)', '0183', (s) => s.replace("('compagnon', 'devis', 'aucun')", "('compagnon', 'devis', 'lecture')"), 'matrice : le compagnon ne voit jamais la compta (demandes, devis, factures, tarifs)'],
  ['matrice SQL changée d’un seul côté', '0183', (s) => s.replace("('administratif', 'tarifs', 'lecture')", "('administratif', 'tarifs', 'ecriture')"), 'lib/organisations/droits.ts dit la même chose que droits_roles, ligne pour ligne et dans le même ordre'],
  ['retour arrière d’une table oublié', '0183', (s) => s.replace('--   drop table if exists public.membres;\n', ''), '0183 membres : retour arrière la retire'],
  ['retour arrière : verrou sur une seule fonction', '0183', (s) => s.replace("proname in ('jeton_session_valide', 'compte_non_suspendu')", "proname in ('jeton_session_valide')"), '0183 retour arrière : refuse de passer tant que 0184 est en place (les deux fonctions de garde)'],
  ['utilisateurs non vérifiée à la création', '0183', (s) => s.replace('connexion_verifiee_le     timestamptz default now(),', 'connexion_verifiee_le     timestamptz,'), 'utilisateurs : connexion_verifiee_le naît à now() (un membre au mot de passe seul passe le code)'],
  ['membre créé sans sa ligne utilisateurs', '0183', (s) => s.replace("    insert into public.utilisateurs (id) values (new.utilisateur_id) on conflict (id) do nothing;\n", ''), 'membres : chaque adhésion non titulaire crée sa ligne utilisateurs'],
  ['invitations : la clé étrangère bloquée', '0183', (s) => s.replace('  constraint invitations_usage check (utilisee_par is null or utilisee_le is not null),', '  constraint invitations_usage check ((utilisee_le is null) = (utilisee_par is null)),'), 'invitations : la mise à null par une clé étrangère passe (effacement d’une fiche d’équipe ou d’un compte, relecture G2)'],
  ['invitations : fiche d’équipe d’une autre organisation', '0183', (s) => s.replace(/(raise exception 'invitations : une invitation naît ni utilisée ni révoquée';\n {4}end if;\n)( {4}if new\.equipe_membre_id is not null and not exists \(\n[^\n]*\n {4}\) then\n[^\n]*\n {4}end if;\n)/, '$1'), 'invitations : la fiche d’équipe appartient à la même organisation'],
  ['0184 : copie de 0138 altérée', '0184', (s) => s.replace('-- language sql\n', '-- language plpgsql\n'), '0184 retour arrière : les corps de 0138 recopiés en tête, à l’octet près'],
  ['0184 : membre actif sans ligne laissé passer', '0184', (s) => s.replace('      (exists (select 1 from a)\n', '      (true\n'), '0184 jeton_session_valide : refuse un membre actif non titulaire sans ligne (la faille de 0138)'],
  ['0184 : utilisateurs non lu', '0184', (s) => s.replace('from public.utilisateurs u, j', 'from public.artisans u, j'), '0184 jeton_session_valide : lit artisans ET utilisateurs, le plus strict gagne (relecture G1)'],
  ['0184 : la ligne artisans masque utilisateurs', '0184', (s) => s.replace('from public.utilisateurs u, j where u.id = j.uid\n', 'from public.utilisateurs u, j where u.id = j.uid and not exists (select 1 from public.artisans ar2 where ar2.id = j.uid)\n'), '0184 jeton_session_valide : lit artisans ET utilisateurs, le plus strict gagne (relecture G1)'],
  ['0184 : compte_non_suspendu élargie à toutes les organisations', '0184', (s) => s + "\ncreate or replace function public.compte_non_suspendu() returns boolean language sql stable security definer set search_path = '' as $$ select false $$;\n", '0184 compte_non_suspendu reste celle de 0138 (la suspension d’une organisation passe par comptes_accessibles, relecture M3)'],
  ['0184 : une politique glissée', '0184', (s) => s + '\ndrop policy if exists garde_session on public.devis;\n', '0184 aucune politique créée, retirée ni modifiée'],
  ['0188 : garde permissive', '0188', (s) => s.replace("('garde_session', 'as restrictive for all", "('garde_session', 'for all"), '0188 garde_session : même définition que 0138'],
  ['0188 : boucle non additive (retire puis recrée)', '0188', (s) => s.replace("      if not exists (select 1 from pg_policies p", "      execute format('drop policy if exists %I on public.%I', g.nom, t.relname);\n      if not exists (select 1 from pg_policies p"), '0188 aucune politique retirée ni modifiée'],
  ['0188 : contrôle final sur le seul nom', '0188', (s) => s.replace("and p.permissive = 'RESTRICTIVE' and p.cmd = v.commande and p.roles = array['authenticated']::name[]", "and p.permissive = 'RESTRICTIVE'"), '0188 contrôle final : quatre gardes restrictives sur chaque table à RLS, sinon rien ne reste'],
  ['0188 : contrôle final retiré', '0188', (s) => s.replace("raise exception '0188 : tables à RLS sans leurs quatre gardes", "raise notice '0188 : tables à RLS sans leurs quatre gardes"), '0188 contrôle final : quatre gardes restrictives sur chaque table à RLS, sinon rien ne reste'],
  ['0188 : en-tête NON APPLIQUÉE retiré', '0188', (s) => s.replace('NON APPLIQUÉE, préparée le 02/11', 'préparée le 02/11'), '0188 en-tête « NON APPLIQUÉE, préparée le 02/11, attend le go écrit de Benj »'],
]
for (const [nom, num, muter, attendue] of MUTANTS) {
  const muté = muter(textes[num])
  if (muté === textes[num]) { compter(`mutant « ${nom} » : il modifie bien ${num}`, false, 'le motif de mutation ne s’applique plus : le mettre à jour'); continue }
  const visee = verifier({ ...textes, [num]: muté }, droits?.MATRICE, t0138).find((v) => v.nom === attendue)
  compter(`mutant « ${nom} » rougit « ${attendue} »`, visee && !visee.ok, visee ? 'la vérification est restée verte' : 'vérification introuvable')
}
{
  // droits.ts changé d'un seul côté : une cellule de la matrice TypeScript.
  const m = (droits?.MATRICE ?? []).map((l) => (l[0] === 'compagnon' && l[1] === 'factures' ? ['compagnon', 'factures', 'lecture'] : l))
  const visee = verifier(textes, m, t0138).find((v) => v.nom.startsWith('lib/organisations/droits.ts dit la même chose'))
  compter('mutant « droits.ts changé d’un seul côté (compagnon lit les factures) » rougit', droits && visee && !visee.ok)
  const ordre = [...(droits?.MATRICE ?? [])]; [ordre[0], ordre[1]] = [ordre[1], ordre[0]]
  const v2 = verifier(textes, ordre, t0138).find((v) => v.nom.startsWith('lib/organisations/droits.ts dit la même chose'))
  compter('mutant « droits.ts dans un autre ordre » rougit', droits && v2 && !v2.ok)
}

// Avertissement inter-migrations (hors périmètre de 032-032, ne fait pas le verdict) : 0186 réécrit la contrainte de nom.
{
  let t86 = ''
  try { t86 = lire('0186_sms_clients.sql') } catch { /* absente */ }
  const m = /add constraint interrupteurs_nom check \(nom in \(([^)]*)\)\)/.exec(sansCommentaires(t86))
  if (m && !/organisations_ouvertes/.test(m[1])) {
    console.log('\n  ⚠️  AVERTISSEMENT (ne fait pas le verdict) : 0186_sms_clients.sql:282 réécrit la contrainte de ops.interrupteurs SANS organisations_ouvertes.')
    console.log('      Posée APRÈS 0183, 0186 échouerait (tout ou rien). Avant de la poser après 0183, ajouter \'organisations_ouvertes\' à sa liste.')
  }
}

const rougesStatiques = resultats.filter((r) => !r.ok)

// ── 4. PGlite : jamais avec --statique ; seulement si PGLITE_DIR est posé ────────────────────────────────────────────────────────
async function chargerPglite() {
  const dir = process.env.PGLITE_DIR
  if (!dir) return null
  try {
    const req = createRequire(path.join(path.resolve(dir), 'package.json'))
    return await import(pathToFileURL(req.resolve('@electric-sql/pglite')).href)
  } catch { return null }
}

const SOCLE = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema ops;
  create table auth.users (id uuid primary key);
  create table auth.mfa_factors (user_id uuid, factor_type text, status text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;
  grant select on auth.mfa_factors to authenticated;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  create table public.artisans (id uuid primary key references auth.users(id) on delete cascade, nom text, is_founder boolean not null default false,
    sessions_invalides_avant timestamptz, connexion_verifiee_le timestamptz);
  alter table public.artisans enable row level security;
  create policy artisan_select_own on public.artisans for select using (auth.uid() = id);
  create policy artisan_insert_own on public.artisans for insert with check (auth.uid() = id);
  create policy artisan_update_own on public.artisans for update using (auth.uid() = id);
  create table public.sessions_verifiees (session_id uuid primary key, user_id uuid not null, moyen text not null default 'code_email', verifiee_le timestamptz not null default now());
  create table public.suspensions (id uuid primary key default gen_random_uuid(), artisan_id uuid not null references public.artisans(id) on delete cascade,
    motif text not null default 'essai', levee_le timestamptz);
  create table public.equipe_membres (id uuid primary key default gen_random_uuid(), artisan_id uuid not null references public.artisans(id) on delete cascade, nom text not null);
  create table public.devis (id uuid primary key default gen_random_uuid(), artisan_id uuid not null references public.artisans(id) on delete cascade, objet text);
  alter table public.devis enable row level security;
  create policy devis_own on public.devis for all to authenticated using (auth.uid() = artisan_id) with check (auth.uid() = artisan_id);
  create table ops.interrupteurs (nom text primary key check (nom in ('pause_generale', 'envoi_froid')), actif boolean not null default false,
    motif text, change_le timestamptz, change_par uuid);
  insert into ops.interrupteurs (nom) values ('pause_generale'), ('envoi_froid');
`

/** Le scénario complet sur une base neuve. Rend les vérifications { nom, ok, detail }. */
async function scenario(mod, txt, matrice, ouvreLeCompte) {
  const res = []
  const T = (nom, ok, detail = '') => res.push({ nom, ok: !!ok, detail })
  const db = new mod.PGlite()
  const id = () => crypto.randomUUID()
  const maintenant = Math.floor(Date.now() / 1000)
  const en = async (uid, sql, params = [], claims = {}) => {
    try {
      await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claims', '', false);")
      if (uid) {
        await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid])
        await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: uid, iat: maintenant, aal: 'aal1', amr: [{ method: 'otp' }], session_id: id(), ...claims })])
        await db.exec('set role authenticated')
      } else if (uid === '') await db.exec('set role anon')
      const r = await db.query(sql, params)
      return { ok: true, rows: r.rows }
    } catch (e) { return { ok: false, rows: [], erreur: String(e?.message ?? e) } } finally { await db.exec('reset role') }
  }
  const service = (sql, p) => en(null, sql, p)
  const poser = async (t) => { try { await db.exec(`begin;\n${t}\ncommit;`); return { ok: true } } catch (e) { try { await db.exec('rollback') } catch { /* rien */ } return { ok: false, erreur: e.message } } }
  const un = async (uid, sql, p, c) => { const r = await en(uid, sql, p, c); return r.ok ? Object.values(r.rows[0] ?? {})[0] : `ERREUR ${r.erreur}` }

  await db.exec(SOCLE)
  const TA = id(), TB = id()
  for (const u of [TA, TB]) await service('insert into auth.users (id) values ($1)', [u])
  await service('insert into public.artisans (id, nom) values ($1, $2), ($3, $4)', [TA, 'Atelier A (fictif)', TB, 'Atelier B (fictif)'])
  const r38 = await poser(lire('0138_garde_session_rls.sql'))
  T('PGlite · 0138 se pose sur le socle', r38.ok, r38.erreur)
  // Une table créée APRÈS 0138, sans garde : 0188 doit la couvrir.
  await db.exec('create table public.table_tardive (id serial primary key, artisan_id uuid); alter table public.table_tardive enable row level security;')
  for (const n of ['0183', '0184', '0188']) {
    const a = await poser(txt[n]), b = await poser(txt[n])
    T(`PGlite · ${n} se pose, puis se rejoue (idempotente)`, a.ok && b.ok, a.erreur ?? b.erreur)
  }
  T('PGlite · une organisation et un titulaire par artisan, sans doublon après rejeu', await un(null, "select count(*)::int from public.organisations") === 2
    && await un(null, "select count(*)::int from public.membres where role = 'titulaire' and statut = 'actif' and utilisateur_id = organisation_id") === 2)
  T('PGlite · interrupteur organisations_ouvertes semé faux', await un(null, "select actif from ops.interrupteurs where nom = 'organisations_ouvertes'") === false)

  // Les membres de A (quatre rôles), un administratif dans B, un membre en attente, un membre actif sans ligne, un compte neuf.
  const M = { associe: id(), administratif: id(), compagnon: id(), invite: id() }
  const adminB = id(), enAttente = id(), sansLigne = id(), neuf = id()
  for (const u of [...Object.values(M), adminB, enAttente, sansLigne, neuf]) await service('insert into auth.users (id) values ($1)', [u])
  for (const u of [...Object.values(M), adminB, enAttente]) await service('insert into public.utilisateurs (id) values ($1)', [u])
  const equipe = (await service('insert into public.equipe_membres (artisan_id, nom) values ($1, $2) returning id', [TA, 'Compagnon fictif'])).rows[0]?.id
  for (const [role, u] of Object.entries(M)) {
    const r = await service("insert into public.membres (organisation_id, utilisateur_id, role, statut, actif_le, equipe_membre_id) values ($1, $2, $3, 'actif', now(), $4)", [TA, u, role, role === 'compagnon' ? equipe : null])
    T(`PGlite · membre ${role} de A posé`, r.ok, r.erreur)
  }
  await service("insert into public.membres (organisation_id, utilisateur_id, role, statut, actif_le) values ($1, $2, 'administratif', 'actif', now())", [TB, adminB])
  await service("insert into public.membres (organisation_id, utilisateur_id, role, statut) values ($1, $2, 'associe', 'invite')", [TA, enAttente])
  await service("insert into public.membres (organisation_id, utilisateur_id, role, statut, actif_le) values ($1, $2, 'associe', 'actif', now())", [TA, sansLigne])
  T('PGlite · une adhésion non titulaire crée sa ligne utilisateurs, vérifiée dès la création', await un(null, 'select connexion_verifiee_le is not null from public.utilisateurs where id = $1', [sansLigne]) === true)
  await service('delete from public.utilisateurs where id = $1', [sansLigne]) // pour éprouver la garde sur un membre sans aucune ligne
  await service('insert into public.devis (artisan_id, objet) values ($1, $2), ($3, $4)', [TA, 'devis A', TB, 'devis B'])
  T('PGlite · la fiche d’équipe d’une autre organisation est refusée', !(await service("insert into public.membres (organisation_id, utilisateur_id, role, statut, actif_le, equipe_membre_id) values ($1, $2, 'compagnon', 'actif', now(), $3)", [TB, neuf, equipe])).ok)
  T('PGlite · personne d’autre que l’artisan ne devient titulaire', !(await service("insert into public.membres (organisation_id, utilisateur_id, role, statut, actif_le) values ($1, $2, 'titulaire', 'actif', now())", [TA, neuf])).ok)

  const peut = (u, compte, d, n) => un(u, 'select public.peut_acceder($1, $2, $3)', [compte, d, n])
  // Interrupteur fermé : comportement d'aujourd'hui (son seul compte).
  T('PGlite · interrupteur faux : un associé n’accède qu’à lui-même', await peut(M.associe, TA, 'devis', 'lecture') === false && await peut(M.associe, M.associe, 'devis', 'lecture') === true)
  T('PGlite · interrupteur faux : le titulaire garde son compte', await peut(TA, TA, 'factures', 'ecriture') === true)
  await service("update ops.interrupteurs set actif = true where nom = 'organisations_ouvertes'")

  // La matrice dans les deux sens, et l'étanchéité.
  let ecarts = [], fuites = []
  for (const [role, u] of Object.entries(M)) for (const [r, d] of matrice.filter((l) => l[0] === role)) for (const n of ['lecture', 'ecriture']) {
    const base = await peut(u, TA, d, n)
    if (base !== ouvreLeCompte(r, d, n)) ecarts.push(`${role}/${d}/${n} : base ${base}`)
    if (await peut(u, TB, d, n) !== false) fuites.push(`${role} → B/${d}/${n}`)
  }
  T('PGlite · matrice : la base dit ce que dit droits.ts, pour chaque rôle, domaine et niveau', ecarts.length === 0, ecarts.slice(0, 5).join(' ; '))
  T('PGlite · étanchéité : aucun membre de A n’accède à B', fuites.length === 0, fuites.slice(0, 5).join(' ; '))
  T('PGlite · étanchéité : B n’accède pas à A, ni A à B', await peut(adminB, TA, 'devis', 'lecture') === false && await peut(TA, TB, 'devis', 'lecture') === false && await peut(TB, TA, 'devis', 'lecture') === false)
  T('PGlite · role_de : associé dans A, rien dans B', await un(M.associe, 'select public.role_de($1)', [TA]) === 'associe' && await un(M.associe, 'select public.role_de($1)', [TB]) === null)
  T('PGlite · compagnon : ses chantiers ne passent pas par comptes_accessibles (siens), jamais la compta', await peut(M.compagnon, TA, 'chantiers', 'lecture') === false && await peut(M.compagnon, TA, 'factures', 'lecture') === false && await peut(M.compagnon, TA, 'stock', 'lecture') === true)
  T('PGlite · un membre en attente (statut invité) n’accède à rien', await peut(enAttente, TA, 'devis', 'lecture') === false)

  // Suspension de A : la lecture reste, l'écriture tombe, pour les membres aussi.
  await service('insert into public.suspensions (artisan_id) values ($1)', [TA])
  T('PGlite · A suspendue : l’associé lit, n’écrit plus', await peut(M.associe, TA, 'devis', 'lecture') === true && await peut(M.associe, TA, 'devis', 'ecriture') === false)
  T('PGlite · A suspendue : compte_non_suspendu reste celle de 0138 (l’associé peut écrire ailleurs), B intact', await un(M.associe, 'select public.compte_non_suspendu()') === true && await un(TB, 'select public.compte_non_suspendu()') === true && await peut(adminB, TB, 'devis', 'ecriture') === true)
  await service('update public.suspensions set levee_le = now() where artisan_id = $1', [TA])
  T('PGlite · suspension levée : l’associé écrit de nouveau', await peut(M.associe, TA, 'devis', 'ecriture') === true)
  await service("update public.membres set statut = 'retire', retire_le = now() where utilisateur_id = $1", [M.administratif])
  T('PGlite · un membre retiré n’accède plus', await peut(M.administratif, TA, 'devis', 'lecture') === false)
  await service('update public.organisations set actif = false where id = $1', [TA])
  T('PGlite · une organisation fermée n’est plus accessible à ses membres', await peut(M.associe, TA, 'devis', 'lecture') === false)
  await service('update public.organisations set actif = true where id = $1', [TA])

  // La garde de session (0184) : la faille de 0138 fermée, l'inscription non régressée, l'artisan inchangé.
  const garde = (u, c) => un(u, 'select public.jeton_session_valide()', [], c)
  T('PGlite · 0184 : un membre actif sans aucune ligne est refusé', await garde(sansLigne) === false)
  await service('insert into public.utilisateurs (id) values ($1)', [sansLigne])
  T('PGlite · 0184 : avec sa ligne utilisateurs, il passe', await garde(sansLigne) === true)
  await service("update public.utilisateurs set sessions_invalides_avant = now() + interval '1 minute' where id = $1", [M.associe])
  T('PGlite · 0184 : la révocation d’un membre (utilisateurs) tue son jeton', await garde(M.associe) === false)
  await service('update public.utilisateurs set sessions_invalides_avant = null, connexion_verifiee_le = now() where id = $1', [M.associe])
  const sid = id()
  T('PGlite · 0184 : mot de passe seul sur un membre vérifié : refusé sans le code', await garde(M.associe, { amr: [{ method: 'password' }], session_id: sid }) === false)
  await service('insert into public.sessions_verifiees (session_id, user_id) values ($1, $2)', [sid, M.associe])
  T('PGlite · 0184 : … et admis une fois le code passé', await garde(M.associe, { amr: [{ method: 'password' }], session_id: sid }) === true)
  T('PGlite · 0184 : un compte neuf garde sa session d’inscription', await garde(neuf) === true)
  T('PGlite · inscription non régressée : un compte neuf écrit sa ligne artisans sous la RLS', (await en(neuf, 'insert into public.artisans (id, nom) values ($1, $2)', [neuf, 'Nouveau (fictif)'])).ok)
  await service('update public.artisans set sessions_invalides_avant = now() + interval \'1 minute\' where id = $1', [TA])
  T('PGlite · 0184 : l’artisan garde la règle de 0138 (révocation)', await garde(TA) === false && await garde(TB) === true)
  await service('update public.artisans set sessions_invalides_avant = null where id = $1', [TA])

  // RLS des tables neuves sous le jeton.
  T('PGlite · membres : le titulaire voit les siens, un associé ne voit que lui, B ne voit rien de A',
    await un(TA, 'select count(*)::int from public.membres') >= 5 && await un(M.associe, 'select count(*)::int from public.membres') === 1
    && await un(TB, 'select count(*)::int from public.membres where organisation_id = $1', [TA]) === 0)
  T('PGlite · invitations et droits_roles : fermés au navigateur', !(await en(TA, 'select * from public.invitations')).ok && !(await en(TA, 'select * from public.droits_roles')).ok)
  T('PGlite · écriture directe dans membres refusée au navigateur', !(await en(TA, "insert into public.membres (organisation_id, utilisateur_id, role) values ($1, $2, 'associe')", [TA, neuf])).ok)
  T('PGlite · anon ne lit aucune table neuve', !(await en('', 'select * from public.organisations')).ok && !(await en('', 'select * from public.membres')).ok)
  T('PGlite · anon n’appelle pas comptes_accessibles', !(await en('', "select * from public.comptes_accessibles('devis', 'lecture')")).ok)
  T('PGlite · une invitation de plus de 7 jours est refusée', !(await service("insert into public.invitations (organisation_id, role, jeton_empreinte, courriel_empreinte, invite_par, expire_le) values ($1, 'associe', $2, $2, $1, now() + interval '8 days')", [TA, 'a'.repeat(64)])).ok)
  const inv = await service("insert into public.invitations (organisation_id, role, jeton_empreinte, courriel_empreinte, invite_par, expire_le) values ($1, 'associe', $2, $2, $1, now() + interval '2 days') returning id", [TA, 'b'.repeat(64)])
  await service('update public.invitations set utilisee_le = now(), utilisee_par = $2 where id = $1', [inv.rows[0]?.id, neuf])
  T('PGlite · une invitation utilisée ne resert pas', !(await service('update public.invitations set utilisee_le = now(), utilisee_par = $2 where id = $1', [inv.rows[0]?.id, TB])).ok)
  // Relecture G2 : effacer une fiche d'équipe ou un compte lié à une invitation utilisée passe (on delete set null).
  const equipe2 = (await service('insert into public.equipe_membres (artisan_id, nom) values ($1, $2) returning id', [TA, 'Second compagnon fictif'])).rows[0]?.id
  const inv2 = await service("insert into public.invitations (organisation_id, role, jeton_empreinte, courriel_empreinte, invite_par, expire_le, equipe_membre_id) values ($1, 'compagnon', $2, $2, $1, now() + interval '2 days', $3) returning id", [TA, 'c'.repeat(64), equipe2])
  await service('update public.invitations set utilisee_le = now(), utilisee_par = $2 where id = $1', [inv2.rows[0]?.id, neuf])
  T('PGlite · une invitation ne prend pas la fiche d’équipe d’une autre organisation', !(await service("insert into public.invitations (organisation_id, role, jeton_empreinte, courriel_empreinte, invite_par, expire_le, equipe_membre_id) values ($1, 'compagnon', $2, $2, $1, now() + interval '2 days', $3)", [TB, 'd'.repeat(64), equipe2])).ok)
  const efface1 = await service('delete from public.equipe_membres where id = $1', [equipe2])
  const efface2 = await service('delete from auth.users where id = $1', [neuf])
  T('PGlite · effacer une fiche d’équipe, puis un compte, liés à une invitation utilisée passe', efface1.ok && efface2.ok
    && await un(null, 'select utilisee_le is not null and utilisee_par is null and equipe_membre_id is null from public.invitations where id = $1', [inv2.rows[0]?.id]) === true, efface1.erreur ?? efface2.erreur)
  // Relecture G1 : un membre qui se crée une ligne artisans garde sa révocation (le plus strict gagne).
  await service("update public.utilisateurs set sessions_invalides_avant = now() + interval '1 minute' where id = $1", [M.invite])
  await service('insert into public.artisans (id, nom) values ($1, $2)', [M.invite, 'Invité devenu artisan (fictif)'])
  T('PGlite · 0184 : une ligne artisans ne masque pas la révocation inscrite dans utilisateurs', await garde(M.invite) === false)

  // 0188 : la table tardive a ses gardes ; les gardes de 0138 sont intactes ; le retour arrière ne retire que les siennes.
  const gardes = (t) => un(null, "select count(*)::int from pg_policies where schemaname = 'public' and tablename = $1 and policyname like 'garde\\_%' and permissive = 'RESTRICTIVE'", [t])
  T('PGlite · 0188 : la table créée après 0138 a ses quatre gardes', await gardes('table_tardive') === 4)
  T('PGlite · 0188 : les gardes de 0138 ne sont pas touchées (sans marque)', await un(null, "select count(*)::int from pg_policy pol join pg_class c on c.oid = pol.polrelid where c.relname = 'devis' and obj_description(pol.oid, 'pg_policy') = 'posée par 0188'") === 0 && await gardes('devis') === 4)
  const ra88 = retourArriere(txt['0188']).split('\n').map((l) => l.replace(/^--\s?/, '')).join('\n').replace(/^Retour arrière[^\n]*\n/, '')
  const r88 = await poser(ra88.slice(ra88.indexOf('do $$'), ra88.indexOf('end loop; end $$;') + 'end loop; end $$;'.length))
  T('PGlite · 0188 : son retour arrière ne retire que ses gardes', r88.ok && await gardes('table_tardive') === 0 && await gardes('devis') === 4, r88.erreur)

  // 0183 refuse de se défaire tant que 0184 est en place ; 0184 se défait par la copie de 0138, qui rouvre la faille (preuve inverse).
  const ra83 = retourArriere(txt['0183']).split('\n').map((l) => l.replace(/^--\s{0,3}/, '')).join('\n')
  const verrou = ra83.slice(ra83.indexOf('do $$'), ra83.indexOf('end $$;') + 'end $$;'.length)
  T('PGlite · retour arrière de 0183 refusé tant que 0184 est en place', !(await poser(verrou)).ok)
  const copie = copieDans0184(txt['0184'])
  const r84 = await poser(copie ? copie.join('\n') : 'select 1/0')
  await service('delete from public.utilisateurs where id = $1', [sansLigne])
  T('PGlite · 0184 défaite par les corps de 0138 : la faille revient (le banc la voit)', r84.ok && await garde(sansLigne) === true, r84.erreur)
  await db.close?.()
  return res
}

let codePglite = 0
if (STATIQUE) {
  console.log('\n⏸  --statique : partie PGlite non jouée (la partie statique et les mutants ci-dessus font le verdict).')
} else if (!process.env.PGLITE_DIR) {
  console.log('\n⏸  Partie PGlite EN ATTENTE : PGLITE_DIR n’est pas posé. Ce n’est ni un vert ni un rouge (code 2).')
  codePglite = 2
} else {
  const mod = await chargerPglite()
  if (!mod || !droits) { console.log('\n⏸  PGLITE_DIR est posé mais @electric-sql/pglite (ou droits.ts) est introuvable : partie PGlite EN ATTENTE (code 2).'); codePglite = 2 }
  else {
    console.log('\n══ 4. PGlite : les migrations jouées pour de vrai, deux organisations à quatre rôles ══\n')
    for (const v of await scenario(mod, textes, droits.MATRICE, droits.ouvreLeCompte)) compter(v.nom, v.ok, v.detail)
    console.log('\n══ 5. PGlite : les 4 mutations du plan rejouées en base (chacune doit faire échouer au moins un cas) ══\n')
    for (const [nom, num, muter] of MUTANTS.filter((m) => m[0].startsWith('PLAN '))) {
      const r = await scenario(mod, { ...textes, [num]: muter(textes[num]) }, droits.MATRICE, droits.ouvreLeCompte)
      const tombes = r.filter((v) => !v.ok)
      compter(`PGlite · mutant « ${nom} » fait échouer au moins un cas`, tombes.length > 0, 'aucun cas n’a échoué : la base ne voit pas cette faille')
    }
  }
}

const rouges = resultats.filter((r) => !r.ok)
const verts = resultats.length - rouges.length
console.log(`\n${rouges.length ? '❌' : codePglite ? '⏸ ' : '✅'} ${verts} réussis, ${rouges.length} échoués (dont ${rougesStatiques.length} en statique)${codePglite ? ' — partie PGlite en attente' : ''}\n`)
process.exitCode = rouges.length ? 1 : codePglite
