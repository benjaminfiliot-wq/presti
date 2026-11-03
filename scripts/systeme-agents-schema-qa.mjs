// La migration 0193 (système d'agents d'un artisan : connexions chiffrées, palier et interrupteur par département, compétences, coût IA
// par jour, marque « traité » et vue étroite des événements à traiter) tient-elle ses promesses de sécurité AVANT que Benj ne la pose ?
// (prompt 6, prompt 1, lot 036-002 ; plans/011-cadrage-01-11/p6-signature/premiere-reponse.md § 4, § 5 décision 1)
//
// Partie STATIQUE, toujours jouée, hors ligne : elle lit 0193, son jumeau, 0185 (les colonnes de evenements_metier, qu'elle ne recopie
// pas) et lib/flags.ts, et prouve : en-tête « NON APPLIQUÉE » et ordre de pose 0185 → 0192 → 0193 ; prérequis qui refusent la pose ;
// RLS et gardes de 0138 sur chaque table neuve ; anon retiré ; aucune écriture pour authenticated ; seules des politiques de lecture de
// ses lignes ; connexions : les deux secrets JAMAIS lisibles par authenticated (droits par colonne), leur format vérifié contre de VRAIS
// chiffrés de lib/secretBox.ts ; défaut du palier « simulation », interrupteur coupé ; « ombre » et « reel » par Presti seulement ; vue
// à security_barrier, colonnes permises seulement, lue par n8n_lecture seul ; marque bornée et filtrée sur le compte ; drapeaux
// systemeAgents et connexions baissés ; jumeau identique à sa migration.
// MUTANTS : chaque garde est retirée ou affaiblie à son tour dans une copie en mémoire ; la vérification visée DOIT rougir, sinon la
//   suite ne prouve rien et rougit elle-même.
// Partie PGLITE, seulement si PGLITE_DIR est posé (dossier où `npm install @electric-sql/pglite` a été fait) : rejoue 0138, 0185 et
//   0193 (deux fois) sur un socle factice, puis prouve les mêmes promesses par des requêtes réelles sous anon, authenticated, n8n_lecture
//   et la clé de service. PGLITE_DIR posé mais paquet introuvable : code 2 (ni vert ni rouge). JAMAIS JOUÉE sur l'hôte des agents
//   d'Oracle le 03/11 (paquet absent, réseau sortant fermé) : son premier passage est celui de la session principale.
//
// Ce qu'elle NE prouve PAS : le comportement de la vraie base Supabase (essai à sec de la session principale avant le collage).
// Aucune donnée réelle : des identifiants tirés au hasard, une clé de chiffrement d'essai faite d'octets fixes.
// Usage : node scripts/systeme-agents-schema-qa.mjs     Codes : 0 vert · 1 rouge · 2 PGlite absent alors que PGLITE_DIR est posé
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { sansCommentaires, MARQUE_CONTROLE } from './sql-nu.mjs'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(RACINE, 'supabase/migrations')
const F_SQL = '0193_systeme_agents.sql'
const F_JUMEAU = '_A_COLLER_sql_editor_0193_systeme_agents_NU.sql'
const lire = (p) => fs.readFileSync(path.join(RACINE, p), 'utf8')

const TABLES = ['connexions', 'departements_reglages', 'competences', 'couts_ia_appels', 'couts_ia_jour']
const TABLES_0185 = ['evenements_metier', 'detecteurs_reglages', 'autonomie_reglages', 'passages_detecteurs', 'opportunites', 'opportunites_decisions', 'relances_exclusions']
const FONCTIONS_0185 = ['faits_sans_texte', 'bilan_sans_texte', 'automatisation_maj_le', 'automatisation_objet_du_compte', 'opportunites_cycle', 'opportunites_decisions_journal', 'relances_exclusions_coherence']
// Ce que la tâche 036-002 fixe (.orchestre/en-cours/036-002.md, « À faire ») et le plan (§ 3.2 : sept départements).
const FOURNISSEURS = ['imap', 'gmail', 'outlook', 'google_agenda', 'outlook_agenda', 'google_drive', 'onedrive', 'fiche_google', 'whatsapp', 'telegram', 'stripe_artisan']
const ETATS = ['a_verifier', 'active', 'expiree', 'retiree', 'erreur']
const DEPARTEMENTS = ['tous', 'accueil', 'devis', 'suivi', 'facturation', 'apres', 'operations', 'direction']
const PALIERS = ['arret', 'simulation', 'ombre', 'reel']
const SECRETS = ['secret_app', 'secret_n8n']
const VUE = 'n8n_evenements_a_traiter'

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const espaces = (s) => s.replace(/\s+/g, ' ')
const memes = (a, b) => a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',')

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
/** Les colonnes déclarées d'un corps de table (une par ligne, deux espaces de retrait). */
const colonnes = (corps) => [...(corps ?? '').matchAll(/^\s{2}([a-z_][a-z0-9_]*)\s+(uuid|text\[\]|text|boolean|integer|smallint|bigint|date|timestamptz|jsonb)\b/gm)]
  .map((m) => m[1]).filter((c) => !['constraint', 'primary'].includes(c))
/** La définition d'une colonne (le reste de sa ligne et de ses suites jusqu'à la colonne suivante). */
function defColonne(corps, c) {
  const m = new RegExp(`^\\s{2}${esc(c)}\\s+[\\s\\S]*?(?=\\n\\s{2}[a-z_]+\\s|(?![\\s\\S]))`, 'm').exec(corps ?? '')
  return m ? espaces(m[0]) : ''
}
/** Les valeurs d'une liste `<col> in ('a', 'b')` dans un texte. */
const listeIn = (texte, col) => {
  const m = new RegExp(`${esc(col)} in \\(([^)]*)\\)`, 'i').exec(espaces(texte))
  return m ? [...m[1].matchAll(/'([a-z_0-9]+)'/g)].map((x) => x[1]) : []
}
function blocGardes(code) {
  const m = /do \$gardes\$([\s\S]*?)\$gardes\$/i.exec(code)
  if (!m) return { tables: [], corps: '' }
  const a = /foreach t in array array\[([^\]]*)\]/i.exec(m[1])
  return { tables: a ? [...a[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]) : [], corps: espaces(m[1]) }
}
const politiques = (code, t) => [...espaces(code).matchAll(new RegExp(`create policy (\\w+) on public\\.${esc(t)} ([^;]*);`, 'gi'))]
  .map((m) => ({ nom: m[1], texte: m[2] }))
/** Les fonctions créées : nom, en-tête (jusqu'au corps), corps. */
const fonctions = (code) => [...code.matchAll(/create or replace function public\.(\w+)\(([^)]*)\)([\s\S]*?)as \$fn\$([\s\S]*?)\$fn\$;/gi)]
  .map((m) => ({ nom: m[1], args: m[2], entete: espaces(m[3]), corps: m[4] }))
/** Le corps d'un bloc `do $tag$ … $tag$`. */
const blocDo = (code, tag) => (new RegExp(`do \\$${tag}\\$([\\s\\S]*?)\\$${tag}\\$`, 'i').exec(code) ?? [])[1] ?? ''

const GARDES_ATTENDUES = [
  ['anon retiré', /revoke all on public\.%I from anon/i],
  ['tout retiré à authenticated (MAINTAIN de PG 17 compris)', /revoke all on public\.%I from authenticated/i],
  ['garde_session', /create policy garde_session on public\.%I as restrictive for all to authenticated using \(\(select public\.jeton_session_valide\(\)\)\) with check \(\(select public\.jeton_session_valide\(\)\)\)/i],
  ['garde_suspension_ins', /create policy garde_suspension_ins on public\.%I as restrictive for insert to authenticated with check \(\(select public\.compte_non_suspendu\(\)\)\)/i],
  ['garde_suspension_maj', /create policy garde_suspension_maj on public\.%I as restrictive for update to authenticated using \(\(select public\.compte_non_suspendu\(\)\)\) with check \(\(select public\.compte_non_suspendu\(\)\)\)/i],
  ['garde_suspension_sup', /create policy garde_suspension_sup on public\.%I as restrictive for delete to authenticated using \(\(select public\.compte_non_suspendu\(\)\)\)/i],
]

// ── De VRAIS chiffrés de lib/secretBox.ts (clé d'essai d'octets fixes, jamais une vraie clé) : le format de la contrainte doit les
//    accepter, et refuser un secret en clair. Le juge ne fabrique pas le format qu'il vérifie : il appelle le code de l'app.
const CLE_ESSAI = Buffer.alloc(32, 0x5a).toString('base64')
const cleAvant = process.env.CANAUX_KEY
process.env.CANAUX_KEY = CLE_ESSAI
const boite = await import(pathToFileURL(path.join(RACINE, 'lib/secretBox.ts')).href)
const CHIFFRES = ['x', 'mot-de-passe-application-essai', 'jeton-oauth-essai-'.repeat(40)].map((c) => boite.chiffrer(c))
if (cleAvant === undefined) delete process.env.CANAUX_KEY; else process.env.CANAUX_KEY = cleAvant
const EN_CLAIR = ['motdepasse-en-clair', 'v1.motdepasse', 'v2.' + CHIFFRES[0].slice(3), CHIFFRES[0] + ' ', 'v1..' + 'A'.repeat(22) + '.abc', '']

/** La vérification, sur les textes donnés (bruts, commentaires compris) : liste de { nom, ok, detail }. */
function verifier(textes) {
  const res = []
  const T = (nom, ok, detail = '') => res.push({ nom, ok: !!ok, detail })
  const brut = textes.sql
  const code = sansCommentaires(brut)
  const plat = espaces(code)
  const tete = brut.slice(0, 2500)

  // ── En-tête, ordre, prérequis, retour arrière
  T('en-tête « ÉTAT : NON APPLIQUÉE »', /ÉTAT : NON APPLIQUÉE\./.test(tete))
  T('ordre de pose écrit en tête : 0185, 0192, puis 0193', /1\.\s+0185_automatisation\.sql[\s\S]*2\.\s+0192_accuse_reception_n8n\.sql[\s\S]*3\.\s+CETTE migration/.test(tete))
  const pre = espaces(blocDo(code, 'prerequis'))
  T('prérequis : la pose refuse sans 0185', /to_regclass\('public\.evenements_metier'\) is null/.test(pre) && /raise exception '0193 : 0185/.test(pre))
  T('prérequis : la pose refuse sans 0192', /column_name = 'accuse_n8n_le'/.test(pre) && /raise exception '0193 : 0192/.test(pre))
  T('prérequis : avant tout objet créé', code.indexOf('do $prerequis$') > -1 && code.indexOf('do $prerequis$') < code.indexOf('create table'))
  const ra = /Retour arrière[^\n]*\n((?:--[^\n]*\n)+)/.exec(brut)
  const raTexte = ra ? ra[1] : ''
  for (const t of TABLES) T(`retour arrière : ${t} retirée`, new RegExp(`drop table if exists public\\.${esc(t)};`).test(raTexte))
  T('retour arrière : vue, fonction de marque, colonne traite_le, fonction de 0185 rejouée',
    /drop view if exists public\.n8n_evenements_a_traiter;/.test(raTexte) && /drop function if exists public\.evenements_marquer_traites\(uuid, uuid\[\]\);/.test(raTexte)
    && /drop column if exists traite_le;/.test(raTexte) && /rejouer la fonction evenements_metier_coherence de 0185/.test(raTexte))

  // ── 0193 s'appuie sur 0185, elle ne la recopie pas
  const recopiees = TABLES_0185.filter((t) => new RegExp(`create table (if not exists )?public\\.${esc(t)}\\b`, 'i').test(code))
  const fRecopiees = FONCTIONS_0185.filter((f) => new RegExp(`create or replace function public\\.${esc(f)}\\(`, 'i').test(code))
  T('ne recopie aucune table de 0185', recopiees.length === 0, recopiees.join(', '))
  T('ne recopie aucune fonction de 0185 (seule evenements_metier_coherence est redéfinie)', fRecopiees.length === 0, fRecopiees.join(', '))

  // ── Les fonctions
  const fns = fonctions(code)
  T('des fonctions trouvées', fns.length >= 5, `${fns.length}`)
  const sansChemin = fns.filter((f) => !/set search_path = ''/.test(f.entete))
  T('toutes les fonctions à search_path vide', sansChemin.length === 0, sansChemin.map((f) => f.nom).join(', '))
  const definers = fns.filter((f) => /security definer/i.test(f.entete)).map((f) => f.nom)
  T('une seule fonction en security definer : evenements_marquer_traites', memes(definers, ['evenements_marquer_traites']), definers.join(', '))
  T('aucun CONSTANT ni littéral U&', !/constant/i.test(code) && !/U&'/.test(code))

  // ── Droits généraux
  T('aucun droit accordé à anon', !/grant [^;]* to [^;]*\banon\b/i.test(plat))
  const ecrituresAuth = [...plat.matchAll(/grant ([^;]*?) on ([^;]*?) to ([^;]*);/gi)]
    .filter((m) => /\bauthenticated\b/.test(m[3]) && /\b(insert|update|delete|truncate|all)\b/i.test(m[1]))
  T('aucune écriture accordée à authenticated', ecrituresAuth.length === 0, ecrituresAuth.map((m) => m[0]).join(' | '))

  // ── Chaque table neuve
  const g = blocGardes(code)
  for (const t of TABLES) {
    const corps = corpsTable(code, t)
    T(`${t} : créée`, corps !== null)
    if (corps === null) continue
    T(`${t} : RLS activée`, new RegExp(`alter table public\\.${esc(t)} enable row level security;`, 'i').test(code))
    T(`${t} : dans la boucle des gardes`, g.tables.includes(t), `boucle : ${g.tables.join(', ') || '(absente)'}`)
    for (const [nom, re] of GARDES_ATTENDUES) T(`${t} : ${nom}`, g.tables.includes(t) && re.test(g.corps))
    const pols = politiques(code, t).filter((p) => !p.nom.startsWith('garde_'))
    const lecture = /^for select to authenticated using \(\(select auth\.uid\(\)\) = artisan_id\)$/i
    T(`${t} : une politique de lecture de ses lignes`, pols.some((p) => lecture.test(p.texte.trim())))
    const ouvertes = pols.filter((p) => !lecture.test(p.texte.trim()))
    T(`${t} : seules des politiques de lecture de ses lignes`, ouvertes.length === 0, ouvertes.map((p) => `${p.nom} ${p.texte}`).join(' | '))
    T(`${t} : lecture rendue explicitement (hors connexions, rendue par colonne)`, /if t <> 'connexions' then execute format\('grant select on public\.%I to authenticated', t\); end if;/.test(g.corps))
    T(`${t} : artisan_id rattaché au compte, supprimé avec lui`, /artisan_id\s+uuid not null references public\.artisans\(id\) on delete cascade/.test(corps))
    T(`${t} : aucune colonne organization_id`, !/\borgani[sz]ation_id\b/i.test(corps))
    T(`${t} : colonnes en français (cree_le, ni created_at ni updated_at)`, /\bcree_le\b/.test(corps) && !/\b(created_at|updated_at)\b/.test(corps))
  }

  // ── connexions
  const cx = corpsTable(code, 'connexions') ?? ''
  const colsCx = colonnes(cx)
  T('connexions : les onze fournisseurs, ni plus ni moins', memes(listeIn(defColonne(cx, 'fournisseur'), 'fournisseur'), FOURNISSEURS), listeIn(defColonne(cx, 'fournisseur'), 'fournisseur').join(', '))
  T('connexions : les cinq états, ni plus ni moins', memes(listeIn(defColonne(cx, 'etat'), 'etat'), ETATS), listeIn(defColonne(cx, 'etat'), 'etat').join(', '))
  T('connexions : naît « a_verifier » (défaut de la colonne)', /default 'a_verifier'/.test(defColonne(cx, 'etat')))
  T('connexions : portées, verifiee_le, derniere_synchro, expire_le', ['portees', 'verifiee_le', 'derniere_synchro', 'expire_le'].every((c) => colsCx.includes(c)) && /text\[\]/.test(defColonne(cx, 'portees')))
  for (const s of SECRETS) {
    T(`connexions : colonne ${s}`, colsCx.includes(s))
    const m = new RegExp(`${s} ~ '([^']+)'`).exec(cx)
    let re = null
    try { re = m ? new RegExp(m[1]) : null } catch { re = null }
    T(`connexions : ${s} au format v1 de lib/secretBox.ts (de vrais chiffrés passent)`, re && CHIFFRES.every((c) => re.test(c)), m?.[1] ?? 'contrainte absente')
    T(`connexions : ${s} refuse un secret en clair ou mal formé`, re && EN_CLAIR.every((c) => !re.test(c)) && /^\^.*\$$/.test(m?.[1] ?? ''), m?.[1] ?? 'contrainte absente')
    T(`connexions : ${s} contrôlé par une contrainte nommée`, new RegExp(`constraint connexions_${s}_format check \\(${s} is null`).test(espaces(cx)))
  }
  // Droits par colonne : la table entière retirée à authenticated, puis les colonnes rendues SANS secret.
  T('connexions : la table entière retirée à anon et authenticated', /revoke all on public\.connexions from anon, authenticated;/i.test(plat))
  const grantsCx = [...plat.matchAll(/grant ([^;]*?) on public\.connexions to ([^;]*);/gi)]
  const grantsAuthCx = grantsCx.filter((m) => /\bauthenticated\b/.test(m[2]))
  const colGrant = grantsAuthCx.map((m) => /^select \(([^)]*)\)$/i.exec(m[1].trim())).filter(Boolean)
  const lisibles = colGrant.flatMap((m) => m[1].split(',').map((c) => c.trim()))
  T('connexions : aucun droit de table pour authenticated (seulement des colonnes)', grantsAuthCx.length === colGrant.length && grantsAuthCx.length === 1, grantsAuthCx.map((m) => m[0]).join(' | '))
  T('connexions : authenticated ne lit aucune colonne de secret', lisibles.length > 0 && SECRETS.every((s) => !lisibles.includes(s)), lisibles.join(', '))
  T('connexions : les colonnes rendues existent et montrent l’état', lisibles.every((c) => colsCx.includes(c)) && ['id', 'artisan_id', 'fournisseur', 'etat', 'verifiee_le', 'derniere_synchro', 'expire_le'].every((c) => lisibles.includes(c)))
  T('connexions : le revoke vient APRÈS la boucle des gardes (rien ne le défait)', code.indexOf('revoke all on public.connexions from anon, authenticated') > code.indexOf('$gardes$;'))
  T('connexions : le retrait efface les deux secrets (contrainte)', /constraint connexions_retiree_sans_secret check \(etat <> 'retiree' or \(secret_app is null and secret_n8n is null/.test(espaces(cx)))
  const cohCx = fns.find((f) => f.nom === 'connexions_coherence')?.corps ?? ''
  T('connexions : le retrait efface les deux secrets (déclencheur)', /new\.secret_app := null;/.test(cohCx) && /new\.secret_n8n := null;/.test(cohCx))
  for (const s of SECRETS) {
    const m = new RegExp(`new\\.${s} !~ '([^']+)'`).exec(cohCx)
    const dansTable = new RegExp(`${s} ~ '([^']+)'`).exec(cx)?.[1]
    T(`connexions : ${s} validé par le déclencheur avant la contrainte (même format)`, m && m[1] === dansTable, m?.[1] ?? 'absent du déclencheur')
  }
  T('connexions : le refus d’un secret ne recopie pas la valeur', /raise exception 'connexions : un secret doit arriver chiffré au format v1 \(la valeur reçue n''est pas recopiée ici\)';/.test(cohCx)
    && cohCx.indexOf('un secret doit arriver chiffré') < cohCx.indexOf("if tg_op = 'INSERT' then"))
  T('connexions : une portée = un mot (le nombre de mots égale le nombre d’éléments)', /cardinality\(string_to_array\(array_to_string\(portees, ' '\), ' '\)\) = cardinality\(portees\)/.test(espaces(cx)))
  T('connexions : une connexion retirée le reste', /if old\.etat = 'retiree' then\s*raise exception/.test(cohCx))
  T('connexions : active exige un essai de lecture réussi (verifiee_le)', /constraint connexions_active_verifiee check \(etat <> 'active' or verifiee_le is not null\)/.test(espaces(cx)))
  T('connexions : déclencheur posé avant insert et update', /create trigger connexions_coherence before insert or update on public\.connexions/.test(plat))

  // ── departements_reglages
  const dr = corpsTable(code, 'departements_reglages') ?? ''
  T('departements_reglages : les sept départements du plan et « tous »', memes(listeIn(defColonne(dr, 'departement'), 'departement'), DEPARTEMENTS), listeIn(defColonne(dr, 'departement'), 'departement').join(', '))
  T('departements_reglages : les quatre paliers', memes(listeIn(defColonne(dr, 'palier'), 'palier'), PALIERS), listeIn(defColonne(dr, 'palier'), 'palier').join(', '))
  T('departements_reglages : défaut du palier « simulation »', /palier\s+text not null default 'simulation'/.test(defColonne(dr, 'palier')))
  T('departements_reglages : interrupteur coupé par défaut', /en_marche\s+boolean not null default false/.test(defColonne(dr, 'en_marche')))
  T('departements_reglages : plafond du jour et plafond de coût', colonnes(dr).includes('plafond_jour') && colonnes(dr).includes('plafond_cout_centimes_jour') && /bigint/.test(defColonne(dr, 'plafond_cout_centimes_jour')))
  T('departements_reglages : une ligne par compte et département', /primary key \(artisan_id, departement\)/.test(dr))
  const cohDr = espaces(fns.find((f) => f.nom === 'departements_reglages_coherence')?.corps ?? '')
  T('departements_reglages : un département naît en arrêt ou en simulation', /if tg_op = 'INSERT' then if new\.palier not in \('arret', 'simulation'\) then raise exception/.test(cohDr))
  T('departements_reglages : ombre et réel posés par Presti seulement (acteur fondateur, lu en base)',
    /if new\.palier in \('ombre', 'reel'\) and new\.palier is distinct from old\.palier then if new\.acteur_id is null or not exists \(select 1 from public\.artisans a where a\.id = new\.acteur_id and a\.is_founder\) then raise exception/.test(cohDr)
    && /new\.pose_par := 'presti';/.test(cohDr))
  T('departements_reglages : la garde ne se fie pas à pose_par (aucune contrainte qui le lit), l’arrêt ne se bloque jamais', !/check \([^;]*pose_par = 'presti'/.test(espaces(dr)))
  T('departements_reglages : déclencheur posé avant insert et update', /create trigger departements_reglages_coherence before insert or update on public\.departements_reglages/.test(plat))

  // ── competences
  const cp = corpsTable(code, 'competences') ?? ''
  T('competences : par département (les huit valeurs)', memes(listeIn(defColonne(cp, 'departement'), 'departement'), DEPARTEMENTS))
  const borne = /corps\s+text not null check \(char_length\(btrim\(corps\)\) between 1 and (\d+)\)/.exec(defColonne(cp, 'corps'))
  T('competences : corps borné (20 000 caractères au plus)', borne && Number(borne[1]) <= 20000, defColonne(cp, 'corps'))
  T('competences : titre, version, actif', ['titre', 'version', 'actif'].every((c) => colonnes(cp).includes(c)))
  T('competences : naît inactive', /actif\s+boolean not null default false/.test(defColonne(cp, 'actif')))
  T('competences : naître active est refusé (déclencheur à l’insertion)', /if tg_op = 'INSERT' then if new\.actif then raise exception/.test(espaces(fns.find((f) => f.nom === 'competences_coherence')?.corps ?? ''))
    && /create trigger competences_coherence before insert or update on public\.competences/.test(plat))
  T('competences : une version par (compte, département, clé, version)', /constraint competences_version_unique unique \(artisan_id, departement, cle, version\)/.test(cp))
  T('competences : une seule version active par clé', /create unique index if not exists competences_active_unique on public\.competences \(artisan_id, departement, cle\) where actif;/.test(plat))
  const cohCp = espaces(fns.find((f) => f.nom === 'competences_coherence')?.corps ?? '')
  T('competences : une version ne se réécrit pas (corps et titre figés)', /new\.corps is distinct from old\.corps/.test(cohCp) && /new\.titre is distinct from old\.titre/.test(cohCp) && /raise exception/.test(cohCp))

  // ── couts_ia_appels, couts_ia_jour
  const ca = corpsTable(code, 'couts_ia_appels') ?? '', cj = corpsTable(code, 'couts_ia_jour') ?? ''
  T('couts_ia_appels : un appel compté une fois (unique par compte et clé)', /constraint couts_ia_appels_cle_unique unique \(artisan_id, cle\)/.test(ca))
  T('couts_ia_appels : externe vrai par défaut (un appel non situé compte comme externe)', /externe\s+boolean not null default true/.test(defColonne(ca, 'externe')))
  T('couts_ia_appels : coût en entier (bigint), calculé par le code', /cout_millicentimes\s+bigint not null/.test(defColonne(ca, 'cout_millicentimes')))
  T('couts_ia_appels : le jour est calculé à Paris, jamais déclaré', /new\.jour := \(new\.survenu_le at time zone 'Europe\/Paris'\)::date;/.test(fns.find((f) => f.nom === 'couts_ia_appels_coherence')?.corps ?? ''))
  T('couts_ia_jour : par compte, jour, département et modèle (le plafond de coût est par département)', /primary key \(artisan_id, jour, departement, modele\)/.test(cj))
  T('couts_ia_jour : ne s’écrit que par le cumul (profondeur de déclencheur)', /if pg_trigger_depth\(\) < 2 then\s*raise exception/.test(fns.find((f) => f.nom === 'couts_ia_jour_garde')?.corps ?? '')
    && /create trigger couts_ia_jour_garde before insert or update on public\.couts_ia_jour/.test(plat))
  T('couts_ia_appels : la date d’un appel reste dans sa fenêtre', /if new\.survenu_le > now\(\) \+ interval '5 minutes' or new\.survenu_le < now\(\) - interval '7 days' then\s*raise exception/.test(fns.find((f) => f.nom === 'couts_ia_appels_coherence')?.corps ?? ''))
  T('couts_ia_jour : appels, jetons, externe', ['appels', 'jetons_entree', 'jetons_sortie', 'externe'].every((c) => colonnes(cj).includes(c)))
  T('couts_ia_jour : coût en centimes, entier, dérivé', /cout_centimes\s+bigint generated always as \(\(cout_millicentimes \+ 999\) \/ 1000\) stored/.test(defColonne(cj, 'cout_centimes')))
  T('couts_ia_jour : alimenté après chaque appel neuf', /create trigger couts_ia_cumuler after insert on public\.couts_ia_appels/.test(plat)
    && /on conflict \(artisan_id, jour, departement, modele\) do update/.test(espaces(fns.find((f) => f.nom === 'couts_ia_cumuler')?.corps ?? '')))
  T('aucun montant en numeric ni en réel', !/\b(numeric|real|double precision|money)\b/i.test(code))

  // ── evenements_metier.traite_le et la fonction de 0185 redéfinie
  T('evenements_metier.traite_le ajoutée', /alter table public\.evenements_metier add column if not exists traite_le timestamptz;/.test(plat))
  T('evenements_metier : index des non traités', /create index if not exists evenements_metier_a_traiter on public\.evenements_metier \(survenu_le, id\) where traite_le is null;/.test(plat))
  const coh = espaces(fns.find((f) => f.nom === 'evenements_metier_coherence')?.corps ?? '')
  const cols0185 = colonnes(corpsTable(sansCommentaires(textes.m0185), 'evenements_metier'))
  const figees = cols0185.filter((c) => c !== 'traite_le')
  const oubliees = figees.filter((c) => !coh.includes(`new.${c} is distinct from old.${c}`))
  T('evenements_metier : les colonnes de 0185 lues dans 0185 (le juge ne les invente pas)', cols0185.length >= 8, cols0185.join(', '))
  T('evenements_metier : seule traite_le change, chaque autre colonne de 0185 reste figée', coh && oubliees.length === 0 && !coh.includes('new.traite_le is distinct'), oubliees.join(', '))
  T('evenements_metier : l’objet est toujours vérifié à l’insertion', /automatisation_objet_du_compte\(new\.artisan_id, new\.objet_type, new\.objet_id\)/.test(coh))

  // ── La vue étroite
  const mv = new RegExp(`create or replace view public\\.${VUE} with \\(([^)]*)\\) as select ([\\s\\S]*?) from public\\.evenements_metier e where ([^;]*);`, 'i').exec(plat)
  T('vue : créée sur evenements_metier', !!mv)
  T('vue : security_barrier', mv && /security_barrier = true/.test(mv[1]))
  T('vue : pas en security_invoker (droits du propriétaire, comme 0192)', mv && !/security_invoker/.test(mv[1]))
  const colsVue = mv ? mv[2].split(',').map((c) => c.trim().replace(/^e\./, '')) : []
  T('vue : colonnes permises seulement (celles d’un fait, ni création ni marque)', memes(colsVue, ['id', 'artisan_id', 'type', 'objet_type', 'objet_id', 'cle', 'faits', 'survenu_le']), colsVue.join(', '))
  T('vue : colonnes qui existent dans 0185', colsVue.every((c) => cols0185.includes(c)))
  T('vue : seulement les non traités', mv && /^e\.traite_le is null\b/.test(mv[3].trim()))
  T('vue : retirée à public, anon, authenticated, service_role', new RegExp(`revoke all on public\\.${VUE} from public, anon, authenticated, service_role;`).test(plat))
  const grantsVue = [...plat.matchAll(new RegExp(`grant ([^;]*?) on public\\.${VUE} to ([^;]*);`, 'gi'))]
  T('vue : lue par n8n_lecture seul', grantsVue.length === 1 && /^select$/i.test(grantsVue[0][1].trim()) && grantsVue[0][2].trim() === 'n8n_lecture', grantsVue.map((m) => m[0]).join(' | '))

  // ── La marque « traité »
  const mq = fns.find((f) => f.nom === 'evenements_marquer_traites')
  const mqc = espaces(mq?.corps ?? '')
  T('marque : prend le compte en premier argument', mq && /^p_artisan uuid, p_ids uuid\[\]$/.test(mq.args.trim()))
  T('marque : refuse sans compte', /if p_artisan is null then raise exception/.test(mqc))
  T('marque : filtre sur le compte', /where artisan_id = p_artisan and id = any\(p_ids\) and traite_le is null and /.test(mqc))
  T('marque : jamais un compte en suppression (comme la vue)', /and exists \(select 1 from public\.artisans a where a\.id = p_artisan and a\.suppression_demandee_le is null\);/.test(mqc))
  T('marque : 200 identifiants au plus', /if cardinality\(p_ids\) > 200 then raise exception/.test(mqc))
  T('marque : n’écrit que traite_le', /update public\.evenements_metier set traite_le = now\(\) where/.test(mqc) && (mqc.match(/\bupdate\b/g) ?? []).length === 1)
  T('marque : retirée à public, anon, authenticated, service_role', /revoke all on function public\.evenements_marquer_traites\(uuid, uuid\[\]\) from public, anon, authenticated, service_role;/.test(plat))
  const grantsMq = [...plat.matchAll(/grant execute on function public\.evenements_marquer_traites\(uuid, uuid\[\]\) to ([^;]*);/gi)]
  T('marque : exécutée par n8n_lecture seul', grantsMq.length === 1 && grantsMq[0][1].trim() === 'n8n_lecture')

  // ── Les drapeaux
  for (const d of ['systemeAgents', 'connexions']) {
    const m = new RegExp(`/\\*\\*((?:(?!\\*/)[\\s\\S])*)\\*/\\s*${d}: (true|false),`).exec(textes.flags)
    T(`drapeau ${d} présent et baissé`, m && m[2] === 'false', m ? m[2] : 'absent')
    T(`drapeau ${d} commenté : « on colle 0193, PUIS on lève »`, m && /0193/.test(m[1]) && /colle 0193, PUIS on lève/.test(m[1]))
  }

  // ── Le jumeau
  const noyau = (s) => sansCommentaires(s).split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim()).join('\n')
  T('jumeau : même SQL que la migration', noyau(textes.jumeau.split(MARQUE_CONTROLE)[0]) === noyau(brut))
  T('jumeau : porte un contrôle après collage', textes.jumeau.includes(MARQUE_CONTROLE) && /\(attendu : /.test(textes.jumeau.split(MARQUE_CONTROLE)[1] ?? ''))
  return res
}

let verts = 0
const rouges = []
const compter = (nom, ok, detail = '') => { if (ok) { verts++; console.log(`  ✅ ${nom}`) } else { rouges.push(nom); console.log(`  ❌ ${nom}${detail ? `\n     → ${detail}` : ''}`) } }

const textes = { sql: lire(`supabase/migrations/${F_SQL}`), jumeau: lire(`supabase/migrations/${F_JUMEAU}`), m0185: lire('supabase/migrations/0185_automatisation.sql'), flags: lire('lib/flags.ts') }

console.log('\n══ 1. 0193, son jumeau et les drapeaux, lus tels quels ══\n')
for (const v of verifier(textes)) compter(v.nom, v.ok, v.detail)

console.log('\n══ 2. Les drapeaux, lus par le code (pas par le texte) ══\n')
const { FLAGS } = await import(pathToFileURL(path.join(RACINE, 'lib/flags.ts')).href)
compter('FLAGS.systemeAgents === false', FLAGS.systemeAgents === false, String(FLAGS.systemeAgents))
compter('FLAGS.connexions === false', FLAGS.connexions === false, String(FLAGS.connexions))
compter('les chiffrés d’essai viennent bien de lib/secretBox.ts et se déchiffrent', (() => {
  process.env.CANAUX_KEY = CLE_ESSAI
  const ok = boite.dechiffrer(CHIFFRES[1]) === 'mot-de-passe-application-essai'
  if (cleAvant === undefined) delete process.env.CANAUX_KEY; else process.env.CANAUX_KEY = cleAvant
  return ok
})())

console.log('\n══ 3. Les mutants rougissent (une suite qui ne sait pas rougir ne prouve rien) ══\n')
const S = 'sql', FL = 'flags'
// Remplacement LITTÉRAL de la première occurrence : String.replace interprète « $' » et « $& » dans le remplacement (un mutant
// qui contient « {1,79}$' » se recopiait lui-même de travers et restait vert pour une mauvaise raison).
const rep = (s, a, b) => { const i = s.indexOf(a); return i < 0 ? s : s.slice(0, i) + b + s.slice(i + a.length) }
const MUTANTS = [
  // Les cinq que la tâche nomme
  ['une colonne de secret lisible par authenticated', S, (s) => rep(s, 'grant select (id, artisan_id, fournisseur,', 'grant select (id, artisan_id, secret_n8n, fournisseur,'), 'connexions : authenticated ne lit aucune colonne de secret'],
  ['RLS absente sur connexions', S, (s) => rep(s, 'alter table public.connexions enable row level security;', ''), 'connexions : RLS activée'],
  ['vue sans security_barrier', S, (s) => rep(s, `create or replace view public.${VUE} with (security_barrier = true) as`, `create or replace view public.${VUE} with (check_option = local) as`), 'vue : security_barrier'],
  ['défaut de palier « reel »', S, (s) => rep(s, "palier                      text not null default 'simulation'", "palier                      text not null default 'reel'"), 'departements_reglages : défaut du palier « simulation »'],
  ['drapeau systemeAgents levé', FL, (s) => rep(s, 'systemeAgents: false,', 'systemeAgents: true,'), 'drapeau systemeAgents présent et baissé'],
  // Et les autres gardes
  ['drapeau connexions levé', FL, (s) => rep(s, '  connexions: false,', '  connexions: true,'), 'drapeau connexions présent et baissé'],
  ['droit de table entier rendu au navigateur', S, (s) => rep(s, 'retiree_le, cree_le, maj_le) on public.connexions to authenticated;', 'retiree_le, cree_le, maj_le) on public.connexions to authenticated;\ngrant select on public.connexions to authenticated;'), 'connexions : aucun droit de table pour authenticated (seulement des colonnes)'],
  ['revoke de connexions retiré', S, (s) => rep(s, 'revoke all on public.connexions from anon, authenticated;', ''), 'connexions : la table entière retirée à anon et authenticated'],
  ['format de secret affaibli', S, (s) => rep(s, "secret_n8n ~ '^v1\\.[A-Za-z0-9_-]{16}\\.[A-Za-z0-9_-]{22}\\.[A-Za-z0-9_-]+$'", "secret_n8n ~ '^v1\\..+$'"), 'connexions : secret_n8n refuse un secret en clair ou mal formé'],
  ['format de secret faux (étiquette de 16)', S, (s) => rep(s, "secret_app ~ '^v1\\.[A-Za-z0-9_-]{16}\\.[A-Za-z0-9_-]{22}", "secret_app ~ '^v1\\.[A-Za-z0-9_-]{16}\\.[A-Za-z0-9_-]{16}"), 'connexions : secret_app au format v1 de lib/secretBox.ts (de vrais chiffrés passent)'],
  ['le retrait garde les secrets', S, (s) => rep(s, "constraint connexions_retiree_sans_secret check (etat <> 'retiree' or (secret_app is null and secret_n8n is null and retiree_le is not null)),", ''), 'connexions : le retrait efface les deux secrets (contrainte)'],
  ['le déclencheur n’efface plus secret_n8n', S, (s) => rep(s, '    new.secret_n8n := null;\n', ''), 'connexions : le retrait efface les deux secrets (déclencheur)'],
  ['un fournisseur oublié (telegram)', S, (s) => rep(s, "'whatsapp', 'telegram', 'stripe_artisan'", "'whatsapp', 'stripe_artisan'"), 'connexions : les onze fournisseurs, ni plus ni moins'],
  ['active sans essai de lecture', S, (s) => rep(s, "constraint connexions_active_verifiee check (etat <> 'active' or verifiee_le is not null),", ''), 'connexions : active exige un essai de lecture réussi (verifiee_le)'],
  ['interrupteur allumé par défaut', S, (s) => rep(s, 'en_marche                   boolean not null default false', 'en_marche                   boolean not null default true'), 'departements_reglages : interrupteur coupé par défaut'],
  ['le réel posé par l’artisan (fondateur non lu)', S, (s) => rep(s, ' or not exists (select 1 from public.artisans a where a.id = new.acteur_id and a.is_founder)', ''), 'departements_reglages : ombre et réel posés par Presti seulement (acteur fondateur, lu en base)'],
  ['un département naît au réel', S, (s) => rep(s, "    if new.palier not in ('arret', 'simulation') then\n      raise exception 'departements_reglages : un département naît", "    if false then\n      raise exception 'departements_reglages : un département naît"), 'departements_reglages : un département naît en arrêt ou en simulation'],
  ['la garde revient à pose_par (l’arrêt se bloque)', S, (s) => rep(s, '  primary key (artisan_id, departement)\n);', "  primary key (artisan_id, departement),\n  constraint departements_reglages_palier_presti check (palier in ('arret', 'simulation') or pose_par = 'presti')\n);"), 'departements_reglages : la garde ne se fie pas à pose_par (aucune contrainte qui le lit), l’arrêt ne se bloque jamais'],
  ['secret en clair recopié dans l’erreur (validation du déclencheur retirée)', S, (s) => rep(s, "  if (new.secret_app is not null and (char_length(new.secret_app) > 16384\n        or new.secret_app !~ '^v1\\.[A-Za-z0-9_-]{16}\\.[A-Za-z0-9_-]{22}\\.[A-Za-z0-9_-]+$'))\n     or", '  if'), 'connexions : secret_app validé par le déclencheur avant la contrainte (même format)'],
  ['une portée avec une espace acceptée', S, (s) => rep(s, "\n         and cardinality(string_to_array(array_to_string(portees, ' '), ' ')) = cardinality(portees)", ''), 'connexions : une portée = un mot (le nombre de mots égale le nombre d’éléments)'],
  ['une compétence naît active par la base', S, (s) => rep(s, '    if new.actif then\n', '    if false then\n'), 'competences : naître active est refusé (déclencheur à l’insertion)'],
  ['couts_ia_jour écrite en direct', S, (s) => rep(s, 'if pg_trigger_depth() < 2 then', 'if pg_trigger_depth() < 1 then'), 'couts_ia_jour : ne s’écrit que par le cumul (profondeur de déclencheur)'],
  ['coût du jour sans département', S, (s) => rep(s, 'primary key (artisan_id, jour, departement, modele)', 'primary key (artisan_id, jour, modele)'), 'couts_ia_jour : par compte, jour, département et modèle (le plafond de coût est par département)'],
  ['date d’appel libre', S, (s) => rep(s, "if new.survenu_le > now() + interval '5 minutes' or new.survenu_le < now() - interval '7 days' then", 'if false then'), 'couts_ia_appels : la date d’un appel reste dans sa fenêtre'],
  ['marque d’un compte en suppression', S, (s) => rep(s, "\n     and exists (select 1 from public.artisans a where a.id = p_artisan and a.suppression_demandee_le is null);", ';'), 'marque : jamais un compte en suppression (comme la vue)'],
  ['lecture non rendue explicitement', S, (s) => rep(s, "      execute format('grant select on public.%I to authenticated', t);\n", ''), 'competences : lecture rendue explicitement (hors connexions, rendue par colonne)'],
  ['connexions rendue en entier par la boucle', S, (s) => rep(s, "    if t <> 'connexions' then\n      execute format('grant select on public.%I to authenticated', t);\n    end if;", "    execute format('grant select on public.%I to authenticated', t);"), 'connexions : lecture rendue explicitement (hors connexions, rendue par colonne)'],
  ['un département oublié (direction)', S, (s) => rep(s, "departement                 text not null check (departement in ('tous', 'accueil', 'devis', 'suivi', 'facturation', 'apres',\n                                'operations', 'direction')),", "departement                 text not null check (departement in ('tous', 'accueil', 'devis', 'suivi', 'facturation', 'apres',\n                                'operations')),"), 'departements_reglages : les sept départements du plan et « tous »'],
  ['RLS absente sur couts_ia_jour', S, (s) => rep(s, 'alter table public.couts_ia_jour enable row level security;', ''), 'couts_ia_jour : RLS activée'],
  ['competences sortie de la boucle des gardes', S, (s) => rep(s, "'departements_reglages', 'competences', 'couts_ia_appels'", "'departements_reglages', 'couts_ia_appels'"), 'competences : garde_session'],
  ['garde de session affaiblie (permissive)', S, (s) => rep(s, 'garde_session on public.%I as restrictive for all', 'garde_session on public.%I for all'), 'connexions : garde_session'],
  ['écritures laissées à authenticated', S, (s) => rep(s, "    execute format('revoke all on public.%I from authenticated', t);\n", ''), 'departements_reglages : tout retiré à authenticated (MAINTAIN de PG 17 compris)'],
  ['lecture ouverte à tous', S, (s) => rep(s, 'on public.departements_reglages for select to authenticated\n  using ((select auth.uid()) = artisan_id);', 'on public.departements_reglages for select to authenticated\n  using (true);'), 'departements_reglages : seules des politiques de lecture de ses lignes'],
  ['politique d’écriture pour le navigateur', S, (s) => rep(s, 'create policy competences_lecture on public.competences for select to authenticated', 'create policy competences_lecture on public.competences for all to authenticated'), 'competences : seules des politiques de lecture de ses lignes'],
  ['écriture accordée au navigateur', S, (s) => s + '\ngrant insert on public.departements_reglages to authenticated;\n', 'aucune écriture accordée à authenticated'],
  ['droit accordé à anon', S, (s) => s + '\ngrant select on public.couts_ia_jour to anon;\n', 'aucun droit accordé à anon'],
  ['une compétence naît active', S, (s) => rep(s, 'actif        boolean not null default false', 'actif        boolean not null default true'), 'competences : naît inactive'],
  ['corps sans borne', S, (s) => rep(s, 'check (char_length(btrim(corps)) between 1 and 8000)', 'check (char_length(btrim(corps)) between 1 and 800000)'), 'competences : corps borné (20 000 caractères au plus)'],
  ['une compétence se réécrit', S, (s) => rep(s, 'or new.corps is distinct from old.corps ', ''), 'competences : une version ne se réécrit pas (corps et titre figés)'],
  ['un appel compté deux fois', S, (s) => rep(s, 'constraint couts_ia_appels_cle_unique unique (artisan_id, cle)', 'constraint couts_ia_appels_cle_unique unique (id, cle)'), 'couts_ia_appels : un appel compté une fois (unique par compte et clé)'],
  ['un appel non situé compté comme local', S, (s) => rep(s, "  modele              text not null check (modele ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),\n  externe             boolean not null default true,\n  jetons_entree       integer", "  modele              text not null check (modele ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),\n  externe             boolean not null default false,\n  jetons_entree       integer"), 'couts_ia_appels : externe vrai par défaut (un appel non situé compte comme externe)'],
  ['coût en numeric', S, (s) => rep(s, 'cout_millicentimes  bigint not null default 0 check (cout_millicentimes between', 'cout_millicentimes  numeric not null default 0 check (cout_millicentimes between'), 'aucun montant en numeric ni en réel'],
  ['un fait modifiable (faits)', S, (s) => rep(s, 'or new.faits is distinct from old.faits ', ''), 'evenements_metier : seule traite_le change, chaque autre colonne de 0185 reste figée'],
  ['vue élargie (cree_le, traite_le)', S, (s) => rep(s, '  e.faits,\n  e.survenu_le\nfrom', '  e.faits,\n  e.survenu_le,\n  e.cree_le,\n  e.traite_le\nfrom'), 'vue : colonnes permises seulement (celles d’un fait, ni création ni marque)'],
  ['vue en security_invoker', S, (s) => rep(s, `${VUE} with (security_barrier = true) as`, `${VUE} with (security_barrier = true, security_invoker = true) as`), 'vue : pas en security_invoker (droits du propriétaire, comme 0192)'],
  ['vue laissée au navigateur', S, (s) => rep(s, `revoke all on public.${VUE} from public, anon, authenticated, service_role;`, `revoke all on public.${VUE} from public, anon, service_role;`), 'vue : retirée à public, anon, authenticated, service_role'],
  ['vue accordée à authenticated', S, (s) => rep(s, `grant select on public.${VUE} to n8n_lecture;`, `grant select on public.${VUE} to n8n_lecture, authenticated;`), 'vue : lue par n8n_lecture seul'],
  ['vue sans filtre « non traités »', S, (s) => rep(s, 'where e.traite_le is null\n  and exists', 'where exists'), 'vue : seulement les non traités'],
  ['marque sans filtre sur le compte', S, (s) => rep(s, '   where artisan_id = p_artisan\n     and id = any(p_ids)', '   where id = any(p_ids)'), 'marque : filtre sur le compte'],
  ['marque sans borne', S, (s) => rep(s, 'if cardinality(p_ids) > 200 then', 'if cardinality(p_ids) > 200000 then'), 'marque : 200 identifiants au plus'],
  ['marque ouverte à service_role', S, (s) => rep(s, 'revoke all on function public.evenements_marquer_traites(uuid, uuid[]) from public, anon, authenticated, service_role;', 'revoke all on function public.evenements_marquer_traites(uuid, uuid[]) from public, anon, authenticated;'), 'marque : retirée à public, anon, authenticated, service_role'],
  ['une deuxième fonction en security definer', S, (s) => rep(s, "create or replace function public.competences_coherence() returns trigger\nlanguage plpgsql security invoker", "create or replace function public.competences_coherence() returns trigger\nlanguage plpgsql security definer"), 'une seule fonction en security definer : evenements_marquer_traites'],
  ['search_path oublié', S, (s) => rep(s, "create or replace function public.couts_ia_cumuler() returns trigger\nlanguage plpgsql security invoker set search_path = ''", 'create or replace function public.couts_ia_cumuler() returns trigger\nlanguage plpgsql security invoker'), 'toutes les fonctions à search_path vide'],
  ['0185 recopiée', S, (s) => rep(s, '-- ══ 1. connexions', 'create table if not exists public.evenements_metier (id uuid primary key);\n-- ══ 1. connexions'), 'ne recopie aucune table de 0185'],
  ['une fonction de 0185 recopiée', S, (s) => rep(s, '-- ══ 1. connexions', "create or replace function public.automatisation_maj_le() returns trigger\nlanguage plpgsql security invoker set search_path = '' as $fn$\nbegin\n  return new;\nend\n$fn$;\n-- ══ 1. connexions"), 'ne recopie aucune fonction de 0185 (seule evenements_metier_coherence est redéfinie)'],
  ['en-tête NON APPLIQUÉE retiré', S, (s) => rep(s, 'ÉTAT : NON APPLIQUÉE.', 'ÉTAT : préparée.'), 'en-tête « ÉTAT : NON APPLIQUÉE »'],
  ['ordre de pose retiré', S, (s) => rep(s, '--   2. 0192_accuse_reception_n8n.sql, contrôlée ;\n', ''), 'ordre de pose écrit en tête : 0185, 0192, puis 0193'],
  ['prérequis 0192 retiré', S, (s) => rep(s, "raise exception '0193 : 0192 (leads.accuse_n8n_le) doit être posée avant';", "raise notice '0193 : 0192 absente';"), 'prérequis : la pose refuse sans 0192'],
  ['retour arrière d’une table oublié', S, (s) => rep(s, '--   drop table if exists public.connexions;\n', ''), 'retour arrière : connexions retirée'],
  ['colonne organization_id ajoutée', S, (s) => rep(s, '  departement  text not null check (departement in (\'tous\', \'accueil\', \'devis\', \'suivi\', \'facturation\', \'apres\', \'operations\', \'direction\')),\n  cle          text', '  organization_id uuid,\n  departement  text not null check (departement in (\'tous\', \'accueil\', \'devis\', \'suivi\', \'facturation\', \'apres\', \'operations\', \'direction\')),\n  cle          text'), 'competences : aucune colonne organization_id'],
]
for (const [nom, cible, muter, attendue] of MUTANTS) {
  const muté = muter(textes[cible])
  if (muté === textes[cible]) { compter(`mutant « ${nom} » : il modifie bien ${cible}`, false, 'le motif de mutation ne s’applique plus : le mettre à jour'); continue }
  // Le jumeau suit la migration mutée : c'est la garde visée qui doit rougir, pas l'équivalence du jumeau.
  const r = verifier({ ...textes, [cible]: muté })
  const visee = r.find((v) => v.nom === attendue)
  compter(`mutant « ${nom} » rougit « ${attendue} »`, visee && !visee.ok, visee ? 'la vérification est restée verte' : 'vérification introuvable')
}

// ── 4. PGlite : seulement si PGLITE_DIR est posé ────────────────────────────────────────────────────────────────────────────────
async function chargerPglite() {
  try { return await import('@electric-sql/pglite') } catch { /* pas dans le projet */ }
  const dir = process.env.PGLITE_DIR
  if (!dir) return null
  try {
    const req = createRequire(path.join(path.resolve(dir), 'package.json'))
    return await import(pathToFileURL(req.resolve('@electric-sql/pglite')).href)
  } catch { return null }
}

const SOCLE = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create role n8n_lecture nologin;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select null::jsonb $$;
  create table auth.mfa_factors (user_id uuid, factor_type text, status text);
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role, n8n_lecture;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  create table public.artisans (id uuid primary key, sessions_invalides_avant timestamptz, connexion_verifiee_le timestamptz, suppression_demandee_le timestamptz, is_founder boolean not null default false);
  create table public.sessions_verifiees (session_id uuid, user_id uuid);
  create table public.suspensions (artisan_id uuid references public.artisans(id) on delete cascade, levee_le timestamptz);
  create table public.clients (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade, tel text);
  create table public.devis (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade);
  create table public.factures (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade, verrouillee boolean not null default false);
  create table public.leads (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade, accuse_n8n_le timestamptz);
  create table public.chantiers (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade);
  create table public.materiaux (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade);
  create table public.crm_rappels (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade);
  create table public.commandes_fournisseur (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id) on delete cascade);
  create table public.assistant_actions (id uuid primary key default gen_random_uuid(), artisan_id uuid not null references public.artisans(id) on delete cascade, statut text not null default 'en_attente');
  create table public.actions_auto (id uuid primary key default gen_random_uuid(), artisan_id uuid not null references public.artisans(id) on delete cascade, statut text not null default 'a_partir');
  create table public.relances_impayes_arrets (facture_id uuid primary key references public.factures(id) on delete cascade,
    artisan_id uuid not null references public.artisans(id) on delete cascade, raison text not null, le timestamptz not null default now(), reprise_le timestamptz);
`

let codePglite = 0
if (!process.env.PGLITE_DIR) {
  console.log('\n⏸  Partie PGlite non jouée : PGLITE_DIR n’est pas posé (la partie statique et les mutants ci-dessus font le verdict).')
} else {
  const mod = await chargerPglite()
  if (!mod) { console.log('\n⏸  PGLITE_DIR est posé mais @electric-sql/pglite est introuvable : partie PGlite en attente (code 2).'); codePglite = 2 }
  else await jouerPglite(mod)
}

async function jouerPglite(mod) {
  console.log('\n══ 4. PGlite : 0138, 0185 puis 0193 rejouées sous les vrais rôles ══\n')
  const T = (nom, cond, detail = '') => compter(`PGlite ${nom}`, cond, detail)

  // 0193 refuse d'être posée sans 0185 (base neuve, socle seul).
  const nue = new mod.PGlite()
  await nue.exec(SOCLE)
  let refus = null
  try { await nue.exec(textes.sql) } catch (e) { refus = String(e?.message ?? e) }
  T('sans 0185, la pose est refusée', refus && /0185/.test(refus), refus ?? 'acceptée')

  const db = new mod.PGlite()
  async function en(role, uid, sql, params = []) {
    try {
      await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);")
      if (uid) await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid])
      if (role) await db.exec(`set role ${role}`)
      const r = await db.query(sql, params)
      return { ok: true, rows: r.rows }
    } catch (e) {
      return { ok: false, rows: [], erreur: String(e?.message ?? e) }
    } finally {
      await db.exec('reset role')
    }
  }
  const service = (sql, p) => en(null, null, sql, p)
  await db.exec(SOCLE)
  await db.exec(lire('supabase/migrations/0138_garde_session_rls.sql'))
  await db.exec(textes.m0185)
  for (let k = 1; k <= 2; k++) {
    let r = { ok: true }
    try { await db.exec(textes.sql) } catch (e) { r = { ok: false, erreur: e.message } }
    T(k === 1 ? '0193 s’applique après 0185' : '0193 se rejoue sans erreur (idempotente)', r.ok, r.erreur)
  }

  const A = crypto.randomUUID(), B = crypto.randomUUID(), FONDATEUR = crypto.randomUUID()
  await service('insert into public.artisans (id) values ($1), ($2)', [A, B])
  await service('insert into public.artisans (id, is_founder) values ($1, true)', [FONDATEUR])

  // connexions
  const insCx = (art, extra = {}) => service(
    `insert into public.connexions (artisan_id, fournisseur, compte_affiche, portees, secret_app, secret_n8n, etat) values ($1, $2, $3, $4, $5, $6, $7) returning id`,
    [art, extra.fournisseur ?? 'imap', extra.compte ?? 'boite-essai', extra.portees ?? ['imap.lire'], extra.app ?? CHIFFRES[1], extra.n8n ?? CHIFFRES[2], extra.etat ?? 'a_verifier'])
  const cxA = await insCx(A)
  T('la clé de service écrit une connexion chiffrée', cxA.ok, cxA.erreur)
  await insCx(B)
  const clair = await insCx(A, { fournisseur: 'gmail', app: 'motdepasse-en-clair' })
  T('un secret en clair est refusé', !clair.ok)
  T('le refus ne recopie pas le secret en clair', !clair.ok && !String(clair.erreur).includes('motdepasse-en-clair'), clair.erreur)
  T('une portée avec une espace est refusée', !(await insCx(A, { fournisseur: 'onedrive', portees: ['lire tout'] })).ok)
  T('une connexion ne naît pas active', !(await insCx(A, { fournisseur: 'outlook', etat: 'active' })).ok)
  T('deux connexions vivantes au même compte affiché sont refusées', !(await insCx(A)).ok)
  const lisA = await en('authenticated', A, 'select id, fournisseur, etat, verifiee_le from public.connexions')
  T('A lit sa connexion sans secret, et la sienne seulement', lisA.ok && lisA.rows.length === 1, lisA.erreur)
  T('A ne lit pas secret_app', !(await en('authenticated', A, 'select secret_app from public.connexions')).ok)
  T('A ne lit pas secret_n8n', !(await en('authenticated', A, 'select secret_n8n from public.connexions')).ok)
  T('un « select * » du navigateur échoue', !(await en('authenticated', A, 'select * from public.connexions')).ok)
  T('anon ne lit rien', !(await en('anon', null, 'select id from public.connexions')).ok)
  T('le navigateur n’écrit pas une connexion', !(await en('authenticated', A, `insert into public.connexions (artisan_id, fournisseur) values ('${A}', 'telegram')`)).ok)
  T('active sans essai de lecture refusée', !(await service(`update public.connexions set etat = 'active' where id = $1`, [cxA.rows[0]?.id])).ok)
  const ret = await service(`update public.connexions set etat = 'retiree' where id = $1 returning secret_app, secret_n8n, retiree_le`, [cxA.rows[0]?.id])
  T('le retrait efface les deux secrets', ret.ok && ret.rows[0]?.secret_app === null && ret.rows[0]?.secret_n8n === null && ret.rows[0]?.retiree_le != null, ret.erreur)
  T('une connexion retirée ne revient pas', !(await service(`update public.connexions set etat = 'a_verifier' where id = $1`, [cxA.rows[0]?.id])).ok)
  T('retirée, la même boîte peut être rebranchée', (await insCx(A)).ok)

  // departements_reglages
  const dep = await service(`insert into public.departements_reglages (artisan_id, departement) values ($1, 'accueil') returning palier, en_marche`, [A])
  T('un département naît « simulation, coupé »', dep.ok && dep.rows[0]?.palier === 'simulation' && dep.rows[0]?.en_marche === false, dep.erreur)
  T('un département ne naît pas au réel, même déclaré « presti »', !(await service(`insert into public.departements_reglages (artisan_id, departement, palier, pose_par) values ($1, 'devis', 'reel', 'presti')`, [A])).ok)
  await service(`insert into public.departements_reglages (artisan_id, departement) values ($1, 'devis')`, [A])
  T('monter au réel sans acteur fondateur est refusé (pose_par recopié n’y suffit pas)', !(await service(`update public.departements_reglages set palier = 'reel', pose_par = 'presti', acteur_id = $1 where artisan_id = $1 and departement = 'devis'`, [A])).ok)
  const reel = await service(`update public.departements_reglages set palier = 'reel', acteur_id = $2 where artisan_id = $1 and departement = 'devis' returning pose_par`, [A, FONDATEUR])
  T('monter au réel par un fondateur passe, pose_par devient presti', reel.ok && reel.rows[0]?.pose_par === 'presti', reel.erreur)
  T('au réel, couper l’interrupteur passe toujours', (await service(`update public.departements_reglages set en_marche = false, pose_par = 'artisan', acteur_id = $1 where artisan_id = $1 and departement = 'devis'`, [A])).ok)
  T('redescendre en simulation passe toujours', (await service(`update public.departements_reglages set palier = 'simulation', acteur_id = $1 where artisan_id = $1 and departement = 'devis'`, [A])).ok)
  T('un département inconnu est refusé', !(await service(`insert into public.departements_reglages (artisan_id, departement) values ($1, 'marketing')`, [A])).ok)
  T('le navigateur ne change pas un palier', (await en('authenticated', A, `update public.departements_reglages set palier = 'reel' returning artisan_id`)).rows.length === 0)
  const depB = await en('authenticated', B, 'select departement from public.departements_reglages')
  T('B ne lit pas les réglages de A', depB.ok && depB.rows.length === 0, depB.erreur)

  // competences
  const cp = await service(`insert into public.competences (artisan_id, departement, cle, titre, corps) values ($1, 'devis', 'devis_toiture', 'Devis de toiture', 'Étape 1 : relire la demande.') returning id, actif`, [A])
  T('une compétence naît inactive', cp.ok && cp.rows[0]?.actif === false, cp.erreur)
  T('une compétence ne naît pas active', !(await service(`insert into public.competences (artisan_id, departement, cle, titre, corps, actif) values ($1, 'devis', 'autre', 'Autre', 'x', true)`, [A])).ok)
  T('une version ne se réécrit pas', !(await service(`update public.competences set corps = 'autre' where id = $1`, [cp.rows[0]?.id])).ok)
  T('on l’active', (await service(`update public.competences set actif = true where id = $1`, [cp.rows[0]?.id])).ok)
  T('deux versions actives de la même clé sont refusées', !(await service(`insert into public.competences (artisan_id, departement, cle, titre, corps, version, actif) values ($1, 'devis', 'devis_toiture', 'Devis de toiture', 'v2', 2, true)`, [A])).ok)
  T('un corps trop long est refusé', !(await service(`insert into public.competences (artisan_id, departement, cle, titre, corps) values ($1, 'devis', 'long', 'Long', repeat('x', 8001))`, [A])).ok)

  // couts_ia
  // Une date d'il y a une heure ; le jour attendu est calculé à Paris par Intl, pas par le juge.
  const survenu = new Date(Date.now() - 3600_000)
  const jourParis = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(survenu)
  const appel = (cle, mc, quand = survenu.toISOString()) => service(`insert into public.couts_ia_appels (artisan_id, cle, departement, modele, jetons_entree, jetons_sortie, cout_millicentimes, survenu_le)
    values ($1, $2, 'accueil', 'claude-haiku-5-5', 1000, 200, $3, $4) on conflict (artisan_id, cle) do nothing`, [A, cle, mc, quand])
  await appel('exec:1:n1', 1500); await appel('exec:1:n1', 1500); await appel('exec:2:n1', 700)
  const jour = await service(`select jour::text, departement, appels, cout_millicentimes, cout_centimes, externe from public.couts_ia_jour where artisan_id = $1`, [A])
  T('un appel rejoué ne compte qu’une fois ; le cumul du jour est juste', jour.ok && jour.rows.length === 1 && jour.rows[0].appels === 2 && Number(jour.rows[0].cout_millicentimes) === 2200 && Number(jour.rows[0].cout_centimes) === 3 && jour.rows[0].departement === 'accueil', JSON.stringify(jour.rows))
  T('le jour est celui de Paris', jour.rows[0]?.jour === jourParis, `${jour.rows[0]?.jour} au lieu de ${jourParis}`)
  T('une date d’appel à un mois est refusée', !(await appel('exec:3:n1', 10, new Date(Date.now() - 30 * 86400_000).toISOString())).ok)
  T('couts_ia_jour ne s’écrit pas en direct, clé de service comprise', !(await service(`update public.couts_ia_jour set cout_millicentimes = 0 where artisan_id = $1`, [A])).ok)
  T('un upsert « do update » sur un appel est refusé (l’appel ne se réécrit pas)', !(await service(`insert into public.couts_ia_appels (artisan_id, cle, departement, modele) values ($1, 'exec:1:n1', 'accueil', 'claude-haiku-5-5') on conflict (artisan_id, cle) do update set jetons_entree = 0`, [A])).ok)
  T('un appel non situé compte comme externe', jour.rows[0]?.externe === true)
  T('un appel compté ne se réécrit pas', !(await service(`update public.couts_ia_appels set cout_millicentimes = 0 where artisan_id = $1`, [A])).ok)
  const cB = await en('authenticated', B, 'select appels from public.couts_ia_jour')
  T('B ne lit pas le coût IA de A', cB.ok && cB.rows.length === 0, cB.erreur)

  // evenements_metier, la vue, la marque
  const ev = await service(`insert into public.evenements_metier (artisan_id, type, cle, faits) values ($1, 'demande_recue', 'd:1', '{"jours": 0}') returning id`, [A])
  const evB = await service(`insert into public.evenements_metier (artisan_id, type, cle, faits) values ($1, 'demande_recue', 'd:1', '{"jours": 0}') returning id`, [B])
  T('un fait s’écrit', ev.ok && evB.ok, ev.erreur ?? evB.erreur)
  T('un fait ne se modifie toujours pas', !(await service(`update public.evenements_metier set faits = '{"jours": 9}' where id = $1`, [ev.rows[0]?.id])).ok)
  const vue = await en('n8n_lecture', null, `select * from public.${VUE} order by survenu_le, id`)
  T('n8n_lecture lit la vue : les deux faits non traités', vue.ok && vue.rows.length === 2, vue.erreur)
  T('la vue ne montre que les colonnes permises', vue.ok && memes(Object.keys(vue.rows[0] ?? {}), ['id', 'artisan_id', 'type', 'objet_type', 'objet_id', 'cle', 'faits', 'survenu_le']), Object.keys(vue.rows[0] ?? {}).join(', '))
  T('authenticated ne lit pas la vue', !(await en('authenticated', A, `select id from public.${VUE}`)).ok)
  T('service_role ne lit pas la vue', !(await en('service_role', null, `select id from public.${VUE}`)).ok)
  T('n8n_lecture ne lit pas la table', !(await en('n8n_lecture', null, 'select id from public.evenements_metier')).ok)
  const mauvais = await en('n8n_lecture', null, 'select public.evenements_marquer_traites($1, $2) as n', [B, [ev.rows[0]?.id]])
  T('la marque sous le compte B ne touche pas le fait de A', mauvais.ok && mauvais.rows[0]?.n === 0, mauvais.erreur)
  const bon = await en('n8n_lecture', null, 'select public.evenements_marquer_traites($1, $2) as n', [A, [ev.rows[0]?.id]])
  T('la marque sous le compte A marque son fait, une fois', bon.ok && bon.rows[0]?.n === 1, bon.erreur)
  T('marquer deux fois ne marque rien de plus', (await en('n8n_lecture', null, 'select public.evenements_marquer_traites($1, $2) as n', [A, [ev.rows[0]?.id]])).rows[0]?.n === 0)
  T('marqué, le fait quitte la vue', (await en('n8n_lecture', null, `select id from public.${VUE}`)).rows.length === 1)
  T('le navigateur n’appelle pas la marque', !(await en('authenticated', A, 'select public.evenements_marquer_traites($1, $2)', [A, [ev.rows[0]?.id]])).ok)
  T('la marque refuse un appel sans compte', !(await en('n8n_lecture', null, 'select public.evenements_marquer_traites(null, $1)', [[ev.rows[0]?.id]])).ok)
  await service('update public.artisans set suppression_demandee_le = now() where id = $1', [B])
  T('un compte en suppression sort de la vue', (await en('n8n_lecture', null, `select id from public.${VUE}`)).rows.length === 0)
  T('un compte en suppression ne se marque pas', (await en('n8n_lecture', null, 'select public.evenements_marquer_traites($1, $2) as n', [B, [evB.rows[0]?.id]])).rows[0]?.n === 0)
  T('authenticated lit ses réglages (droit rendu explicitement)', (await en('authenticated', A, 'select departement from public.departements_reglages')).rows.length >= 1)
}

console.log(`\n${rouges.length ? '❌' : codePglite ? '⏸ ' : '✅'} ${verts} réussis, ${rouges.length} échoués${codePglite ? ' (partie PGlite en attente)' : ''}\n`)
process.exitCode = rouges.length ? 1 : codePglite
