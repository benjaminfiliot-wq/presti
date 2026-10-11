// scripts/verrou-maj-qa.mjs — le juge de la fiche 025-13 (migration 0095 : les verrous de public.artisans complétés), écrit par
// Claude Code AVANT la production. Lecture statique et simulation : aucune base n'est touchée.
//
// Le constat (attaque du 24/09 sur 025-12, essais à sec sur la vraie base ; .orchestre/preuves/025-12/) :
//   1. à la MISE À JOUR, la politique artisan_update_own (0001_artisans.sql:25-26) laisse le navigateur réécrire sa ligne ;
//      lock_artisan_privileges (0068_controle.sql:157-187, puis 0093_site_fige.sql) ne fige ni credits_offerts (consume_credit,
//      0080:44-47 : forfait + credits_offerts à chaque renouvellement → IA illimitée payée par Presti), ni site_contenu_le
//      (app/api/site/generate/route.ts : nulle = génération offerte), ni created_at et email (lib/controle/confiance.ts), ni
//      connexion_verifiee_le (lib/connexion.ts, serveur seul) ;
//   2. à l'INSCRIPTION, le slug est choisi par le navigateur sans contrôle en base : ni les mots réservés (lib/urls.ts,
//      SLUGS_RESERVES), ni les anciennes adresses des autres artisans (slugs_anciens, 0051) ne sont refusés ; les pages publiques
//      cherchent le slug actuel avant l'ancien (app/site/[slug]/page.tsx, app/p/[slug]/page.tsx, app/api/leads/route.ts) ;
//   3. les contrôles après collage de 0093 et 0094 cherchent « new.x := … ; » n'importe où dans pg_get_functiondef (commentée, après
//      le end if, sous « if false » : « oui ») et la ligne du déclencheur ne vérifie ni tgfoid, ni BEFORE … FOR EACH ROW, et
//      accepte tgenabled = 'R' ;
//   4. le commentaire de 0094_insertion_figee.sql:42 dit credits_offerts figée « comme à la mise à jour (0068) » : c'est faux.
//
// Ce qui est jugé (dans <racine>, la racine du dépôt par défaut) :
//   VM-1  une migration supabase/migrations/0095_<nom>.sql (une seule) redéfinit public.lock_artisan_privileges() (MISE À JOUR) :
//           - 0095 ne porte que : les deux « create or replace function » des verrous (une fois chacun), des fonctions d'appoint
//             NOUVELLES (create function public.<nom>, jamais une fonction d'une migration antérieure), leurs revoke / grant / comment ;
//           - la définition précédente est la dernière des migrations antérieures à 0095, et c'est 0093_site_fige.sql ; en-tête
//             identique (espaces près), « ; » seul après le corps ;
//           - le corps, ligne de code par ligne de code (commentaires ôtés), garde toutes les lignes de 0093 dans l'ordre et
//             ajoute exactement « new.<c> := old.<c>; » pour credits_offerts, site_contenu_le, created_at, connexion_verifiee_le,
//             email, une fois chacune, dans la branche then du bloc if current_user not in ('service_role', 'postgres'), à sa
//             profondeur 1 ; rien d'autre ; les cinq colonnes existent ;
//           - email : la règle du constat — figée à old.email SEULEMENT si aucun chemin légitime du navigateur ne change
//             artisans.email : aucun « supabase.from('artisans').update|upsert({ … email … }) » du client navigateur dans app/ et lib/
//             hors de l'inscription (app/onboarding/page.tsx, qui envoie l'adresse de la session), et aucun
//             « supabase.auth.updateUser({ email }) » (aucun écran ne change l'adresse de connexion). Sinon : rouge (il faudrait
//             figer email à auth.email() ou la laisser au serveur) ;
//           - une migration postérieure à 0095 qui nomme la fonction doit la redéfinir en gardant tout 0095 (sinon rouge).
//   VM-2  0095 redéfinit public.lock_artisan_privileges_ins() (INSERTION) : la précédente est 0094_insertion_figee.sql, en-tête
//         identique, toutes ses lignes gardées ; l'arbre des instructions (analyse PL/pgSQL) est celui de 0094 plus des REFUS
//         (« if … then raise exception …; end if; », sans else), placés dans la branche du navigateur ou au premier niveau
//         (25/09 : une affectation unique à new.email dans la branche est mise de côté ici, jugée par VM-6).
//         Puis la fonction est EXÉCUTÉE par l'interprète (scripts/fixtures/025/verrous-sql.mjs), RLS de artisans simulée (le
//         navigateur ne voit que sa ligne : artisan_select_own, seule politique de lecture — prémisse vérifiée dans les
//         migrations), une fonction d'appoint security definer voyant tout, les droits EXECUTE calculés depuis les grant / revoke
//         de 0095 (défaut Supabase : public, anon, authenticated, service_role) :
//           - chaque mot de SLUGS_RESERVES (lu dans lib/urls.ts de la racine, jamais recopié ici) est refusé au navigateur ;
//           - l'ancienne adresse d'un AUTRE artisan est refusée ; la sienne propre (inscription rejouée, upsert) ne l'est pas ;
//           - les slugs normaux de l'inscription sont acceptés : format de app/onboarding/page.tsx (`${slugBase(nom)}-${randomSuffix()}`,
//             vérifié), fonctions de lib/slug.ts de la racine transpilées et appelées, 17 noms (dont www, Admin, Site, FAQ,
//             Mentions légales, ceux d'anciennes adresses…) × 6 suffixes : refusés seulement s'ils tombent exactement sur un mot
//             réservé ou l'ancienne adresse d'un autre ; et les 25 colonnes de 0094 sont toujours forcées ;
//           - le serveur (service_role) insère toujours sans refus ni colonne forcée ;
//           - une fonction d'appoint security definer porte « set search_path » ; notés : anon, service_role et 'WWW', slug nul.
//   VM-3  les contrôles après collage de 0093, 0094 et 0095 (supabase/controles/) sont SENSIBLES À LA BRANCHE. Simulés contre
//         pg_get_functiondef (en-tête de Postgres, corps collé ; LF et CRLF) de la fonction qu'ils visent ET de celle en vigueur
//         après 0095, et contre le catalogue pg_trigger de production (relu le 24/09) :
//           - lecture seule, se parsent ; toute ligne qui peut dire « oui » le dit sur les bonnes fonctions ;
//           - chaque colonne a une ligne à elle qui dit « oui », et PAS « oui » quand son affectation est retirée, remplacée par
//             « -- col », commentée, enfermée dans /* */, déplacée après le end if, enfermée sous « if false », neutralisée ; qui dit
//             « oui » quand une autre colonne est retirée, commentée, neutralisée ou déplacée ; et pas « oui » sur la fonction
//             d'avant (0068 pour 0093, 0008 pour les 17 de 0094, 0093 pour les 5 de 0095) ;
//           - 0095 : chaque refus de l'inscription a une ligne qui dit « oui », et pas « oui » sans ce refus ni sur 0094 ; l'email
//             imposé à l'insertion (VM-6), s'il est là, a sa ligne sensible à la branche comme une colonne, pas « oui » sur 0094 ;
//           - chaque déclencheur visé (0093 : trg_lock_artisan_upd ; 0094 : trg_lock_artisan_ins ; 0095 : les deux) a une ligne qui
//             dit « oui » sur le catalogue et pas « oui » si le déclencheur est absent, sur une autre fonction (tgfoid), AFTER,
//             FOR EACH STATEMENT, sur un autre événement, sur une autre table, ou tgenabled 'D', 'R' ou 'A'.
//   VM-4  les jumeaux de 0093, 0094 et 0095 : _A_COLLER_sql_editor_00NN.sql porte le SQL de sa migration, _NU sort de sql-nu.mjs
//         (bande de 28 tirets, une marque de contrôle) et finit par exactement supabase/controles/<migration> ; sql-nu.mjs
//         --verifier (lu dans la racine) et le découpage du juge d'accord ; scripts/migrations-jumelles-e2e.mjs vert dans la racine
//         et au moins 4 ✅ pour chacun des six jumeaux.
//   VM-5  rien d'autre n'a bougé sous supabase/migrations/, supabase/controles/, app/, lib/, par rapport à l'état relevé
//         (scripts/fixtures/025/etat-verrou-maj.json : le commit et ce qui en différait, empreinte sha1 LF) :
//           - permis : 0094_insertion_figee.sql et _A_COLLER_sql_editor_0094.sql changés dans leurs COMMENTAIRES seulement
//             (empreinte du code identique) et sans le commentaire faux de 0094:42 ; les jumeaux nus de 0093 et 0094 et les
//             contrôles de 0093 et 0094 (jugés par VM-3 / VM-4) ; les ajouts de 0095 (migration, deux jumeaux, contrôle) ;
//           - tolérés et notés : les migrations d'un numéro supérieur à 0095 (fiches postérieures, lus sur disque) ; un fichier
//             identique à son blob de HEAD (committé depuis) ; sous app/ et lib/, un fichier que git status montrait à la prise
//             de 025-13 (.orchestre/preuves/025-13/avant.txt, écrit par l'orchestre) ;
//           - permis depuis le 25/09 (relecture adverse) : lib/urls.ts et lib/purgeComptes.ts, jugés par VM-7 ;
//           - tout le reste (0093, 0068, une autre migration existante, le chemin d'inscription app/onboarding/page.tsx) : rouge.
//         Depuis le 04/10 : VM-5 ne regarde plus que son vrai périmètre — supabase/migrations/, supabase/controles/ et le chemin
//         d'inscription ; le reste de app/ et lib/, que les fiches suivantes modifient légitimement (29 fichiers de
//         app/controle/station/ non encore committés le 04/10), n'est plus de son ressort. Sabotages gardés (--mutations) : une
//         migration existante retouchée, le chemin d'inscription retouché → rouges en VM-5 seul ; un autre fichier de app/ et de lib/
//         ajouté ou retouché → le juge reste vert.
//   VM-6  (25/09, relecture adverse : un compte neuf s'inscrivait avec l'email d'un autre — malus email_jetable contourné, deux lignes
//         pour une adresse cassaient /api/auth/reset-request, notifications envoyées à la victime) : à l'INSERTION, 0095 impose
//         l'adresse du compte connecté :
//           - exactement une affectation à new.email dans toute la fonction d'insertion, dans la branche then du bloc current_user
//             (profondeur 1), AVANT le premier if de cette branche (avec les colonnes forcées, avant les refus) ;
//           - son expression, évaluée par l'interprète (auth.email() lit le jeton simulé) : jeton « titulaire@ » et email envoyé
//             « victime@ », nul, identique ou en majuscules → « titulaire@ » ; notés : jeton sans email, service_role (hors branche) ;
//           - l'inscription (app/onboarding/page.tsx) envoie toujours l'adresse de la session (noté).
//   VM-7  (25/09, même relecture : « supprime-<8 car. de l'uid> » posé par la purge sur une colonne unique ; un tiers qui le prenait
//         faisait échouer en silence l'anonymisation RGPD) : le préfixe de la purge est RÉSERVÉ, en base et dans l'application :
//           - lib/urls.ts exporte PREFIXE_ADRESSE_PURGEE (littéral) ; lib/purgeComptes.ts l'importe de là (ni seconde définition ni
//             littéral dans le slug) et bâtit le slug anonymisé `${PREFIXE_ADRESSE_PURGEE}${id.slice(0, 8)}` ;
//           - problemeSlug (lib/urls.ts transpilé et appelé) refuse <préfixe>abcd1234, <préfixe><8 car. d'un uid>, <préfixe>plomberie-ab12,
//             et accepte plomberie-supprime-ab12, supprimer-ab12, dupont-plomberie-k2x9 ; /api/account/slug passe par problemeSlug ;
//           - la fonction d'insertion de 0095, exécutée (même simulation que VM-2, préfixe lu dans lib/urls.ts), refuse au navigateur
//             <préfixe>abcd1234, <PRÉFIXE>ABCD1234, <préfixe><8 car. d'un autre uid>, avec l'errcode et le message du refus des mots
//             réservés ; accepte plomberie-supprime-ab12 et supprimer-ab12 ; le serveur (service_role) insère <préfixe>… sans refus ;
//             noté : un nom saisi qui commence par « Supprimé » tombe dans le préfixe ;
//           - la purge ne reste plus muette : dans purgerComptes, le bloc « if (echec) { … } » appelle notifierEntreprise.
//
// Options (scripts/fixtures/025/commun.mjs, lireOptions) :
//   --racine=<dossier>  tout est lu dans ce dossier ; hors dépôt Git, VM-5 compare fichier par fichier.
//   --temoin            juge l'arbre témoin .orchestre/travail/verrou-maj-qa/temoin/ : l'état relevé (app/ et lib/ rebâtis depuis
//                       les blobs du commit quand la racine a bougé depuis), sql-nu.mjs, migrations-jumelles-e2e.mjs, puis
//                       scripts/fixtures/025/temoins/verrou-maj-qa/ superposé (0095, 0094 corrigée, contrôles sensibles à la
//                       branche, jumeaux refabriqués ; depuis le 25/09, lib/urls.ts.temoin et lib/purgeComptes.ts.temoin, renommés sans
//                       « .temoin » dans l'arbre : tsc ne lit pas les témoins). VM-1 à VM-7 doivent y passer.
//   --mutations         le témoin, puis des copies mutées (jumeaux refabriqués par sql-nu.mjs) : MUT-T vert ; MUT-OUBLI (credits_offerts
//                       oubliée) rouge en VM-1 ; MUT-APRES (created_at après le end if) rouge en VM-1 ; MUT-RESERVE ('admin' ôté de
//                       la liste) rouge en VM-2 ; MUT-ANCIEN (fonction d'appoint en security invoker : la RLS cache les anciennes
//                       adresses des autres) rouge en VM-2 ; MUT-AVEUGLE (contrôle de 0095 revenu à « (^|\n)\s*new… ») rouge en
//                       VM-3 ; MUT-DECLENCHEUR (ligne du déclencheur revenue à « tgenabled <> 'D' ») rouge en VM-3 ; depuis le 25/09 :
//                       MUT-EMAIL (l'email imposé retiré) et MUT-EMAIL-ORDRE (coalesce(new.email, auth.email()) : l'envoyée gagne)
//                       rouges en VM-6 ; MUT-PREFIXE (refus « supprime- » retiré de 0095), MUT-PREFIXE-TS (problemeSlug ne le
//                       refuse plus) et MUT-PURGE-MUETTE (plus de notifierEntreprise sur échec) rouges en VM-7.
//   --reel est refusé : la preuve sur la base est l'essai à sec (DO … raise exception) puis le contrôle après collage.
//
// Sortie : une ligne « PASS|FAIL <id> — … » par critère, puis « verrou-maj-qa : PASS » ou « … : FAIL — ids » ; code 0 seulement si
// tout est vert. Le juge n'écrit que sous .orchestre/travail/verrou-maj-qa/ et y retire ses copies de app/ et lib/ à la fin.
//
// Usage : node scripts/verrou-maj-qa.mjs [--racine=<dossier>] [--temoin] | node scripts/verrou-maj-qa.mjs --mutations
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import {
  R, FIXTURES, TRAVAIL, creerSortie, lireOptionsOuQuitter, dossierTravail, lsTree, git, estRacineGit, lireOuNull, lireJson, shaBlob,
  lancer, listerFichiers, analyserSortie, exigerSousTravail, sous, blobGit,
} from './fixtures/025/commun.mjs'
import * as V from './fixtures/025/verrous-sql.mjs'

const JUGE = 'verrou-maj-qa'
const FICHE = '025-13'
const NUM = 95
const JUMEAU = '_A_COLLER_sql_editor_0095.sql'
const JUMEAU_NU = '_A_COLLER_sql_editor_0095_NU.sql'
const NOM_0095 = /^0095_[a-z0-9_]+\.sql$/
const COLONNES_MAJ = ['credits_offerts', 'site_contenu_le', 'created_at', 'connexion_verifiee_le', 'email']
const COLONNES_SITE = ['site_active', 'site_tier', 'site_contenu', 'site_origine']
const MAJ = 'lock_artisan_privileges', INS = 'lock_artisan_privileges_ins'
const PREC = { [MAJ]: '0093_site_fige.sql', [INS]: '0094_insertion_figee.sql' }
const M93 = '0093_site_fige.sql', M94 = '0094_insertion_figee.sql'
const DEFINIT = { [MAJ]: /\bcreate\s+(?:or\s+replace\s+)?function\s+(?:public\s*\.\s*)?"?lock_artisan_privileges"?\s*\(/i, [INS]: /\bcreate\s+(?:or\s+replace\s+)?function\s+(?:public\s*\.\s*)?"?lock_artisan_privileges_ins"?\s*\(/i }
const NOMME = { [MAJ]: /\block_artisan_privileges\b/i, [INS]: /\block_artisan_privileges_ins\b/i }
const CREE = { [MAJ]: /^create\s+or\s+replace\s+function\s+public\.lock_artisan_privileges\s*\(\s*\)/i, [INS]: /^create\s+or\s+replace\s+function\s+public\.lock_artisan_privileges_ins\s*\(\s*\)/i }
const ETAT = path.join(FIXTURES, 'etat-verrou-maj.json')
const PREFIXES = ['app/', 'lib/', 'supabase/migrations/', 'supabase/controles/']
const AVANT_TXT = path.join(R, '.orchestre', 'preuves', FICHE, 'avant.txt')
const ONBOARDING = 'app/onboarding/page.tsx'
// 25/09 (VM-6, VM-7)
const URLS = 'lib/urls.ts', PURGE = 'lib/purgeComptes.ts', ROUTE_SLUG = 'app/api/account/slug/route.ts'
const EMAIL_INS = 'new.email := coalesce(auth.email(), new.email);'
const MARQUE_CONTROLE = '-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.'
const TETE_NU = (nom) => new RegExp(`^-{28} ${nom.replace(/\./g, '\\.')} — coller ce fichier EN ENTIER\\.`)
const COMMENTAIRE_FAUX = /credits_offerts[^\n]*comme à la mise à jour \(0068\)|comme à la mise à jour \(0068\)[^\n]*credits_offerts/i
const { premiere, court } = V

const lireTexte = (f) => { const b = lireOuNull(f); return b === null ? null : b.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n') }
const migDir = (racine) => path.join(racine, 'supabase', 'migrations')
const ctlDir = (racine) => path.join(racine, 'supabase', 'controles')
function lireMigrations(racine) {
  const dir = migDir(racine)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort().map((nom) => {
    const texte = lireTexte(path.join(dir, nom)) ?? ''
    return { nom, num: Number(nom.slice(0, 4)), texte, code: V.sansCommentairesPartout(texte) }
  })
}
/** La 0095 de la racine → { nom, texte, echec } */
function la0095(racine) {
  const dir = migDir(racine)
  const noms = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => NOM_0095.test(f)) : []
  const autres = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^0095/.test(f) && !NOM_0095.test(f)) : []
  if (noms.length !== 1) return { nom: null, texte: null, echec: `${noms.length} migration(s) supabase/migrations/0095_<nom>.sql, une attendue${noms.length ? ` : ${noms.join(', ')}` : ' (la fonction de mise à jour n\'est pas redéfinie)'}${autres.length ? ` ; nom(s) refusé(s) : ${autres.join(', ')}` : ''}` }
  const texte = lireTexte(path.join(dir, noms[0]))
  if (!texte || !texte.trim()) return { nom: noms[0], texte: null, echec: `${noms[0]} vide` }
  return { nom: noms[0], texte, echec: null }
}
/** La dernière définition de `fn` dans les migrations de numéro < `avant` → { m, ins, def, debut } | null */
function derniereDefinition(migs, fn, avant) {
  let der = null
  for (const m of migs) { if (m.num >= avant) continue; for (const ins of V.instructions(m.texte)) if (DEFINIT[fn].test(ins.code)) der = { m, ins } }
  if (!der) return null
  return { ...der, def: V.analyserDefinition(der.ins), debut: V.ligneDe(der.m.texte, der.ins.debut) }
}

// ── La structure de 0095 ─────────────────────────────────────────────────────────────────────────────────────────────────────
const AIDE = /^create\s+(?:or\s+replace\s+)?function\s+public\.([a-z_][a-z0-9_]*)\s*\(/i
const ACCORDE = /^grant\s+(?:all|execute)(?:\s+privileges)?\s+on\s+function\s+public\.([a-z_][a-z0-9_]*)\s*\([^)]*\)\s+to\s+([\s\S]+?)\s*;?$/i
const REVOQUE = /^revoke\s+(?:all|execute)(?:\s+privileges)?\s+on\s+function\s+public\.([a-z_][a-z0-9_]*)\s*\([^)]*\)\s+from\s+([\s\S]+?)\s*;?$/i
const COMMENTE = /^comment\s+on\s+function\s+public\.([a-z_][a-z0-9_]*)\s*\(/i
/** → { definitions: { [MAJ|INS]: ins }, aides: Map(nom → { ins, def }), droits: [{ nom, sorte, roles }], echecs[] } */
function structure0095(texte, migs) {
  const echecs = [], definitions = {}, aides = new Map(), droits = []
  const anterieures = new Set()
  for (const m of migs) if (m.num < NUM) for (const ins of V.instructions(m.texte)) { const a = AIDE.exec(ins.code); if (a) anterieures.add(a[1].toLowerCase()) }
  const ins = V.instructions(texte)
  const vus = { [MAJ]: 0, [INS]: 0 }
  for (const x of ins) {
    if (CREE[MAJ].test(x.code)) { vus[MAJ]++; definitions[MAJ] = x; continue }
    if (CREE[INS].test(x.code)) { vus[INS]++; definitions[INS] = x; continue }
    const a = AIDE.exec(x.code)
    if (a) {
      const nom = a[1].toLowerCase()
      if (nom.startsWith('lock_artisan_privileges')) { echecs.push(`fonction ${nom} : seules les deux définitions des verrous (create or replace, sans paramètre) sont attendues`); continue }
      if (anterieures.has(nom)) echecs.push(`fonction d'appoint ${nom} déjà définie par une migration antérieure : 0095 ne redéfinit que les deux verrous`)
      if (aides.has(nom)) echecs.push(`fonction d'appoint ${nom} définie deux fois`)
      aides.set(nom, { ins: x, def: V.analyserDefinition(x) })
      continue
    }
    const g = ACCORDE.exec(x.code) || REVOQUE.exec(x.code)
    if (g) { droits.push({ nom: g[1].toLowerCase(), sorte: ACCORDE.test(x.code) ? 'grant' : 'revoke', roles: g[2].split(',').map((r) => r.trim().replace(/^"|"$/g, '').toLowerCase()), code: x.code }); continue }
    const c = COMMENTE.exec(x.code)
    if (c) { droits.push({ nom: c[1].toLowerCase(), sorte: 'comment', roles: [], code: x.code }); continue }
    echecs.push(`instruction en plus dans 0095 : « ${court(x.code, 70)} » (seuls : les deux verrous, des fonctions d'appoint nouvelles, leurs revoke / grant / comment)`)
  }
  for (const fn of [MAJ, INS]) if (vus[fn] !== 1) echecs.push(`${vus[fn]} « create or replace function public.${fn}() », un attendu`)
  for (const d of droits) if (!aides.has(d.nom)) echecs.push(`${d.sorte} sur public.${d.nom}(…) : pas une fonction d'appoint de 0095 (les verrous et les fonctions existantes n'y changent pas de droits)`)
  return { definitions, aides, droits, echecs }
}
/** Une redéfinition postérieure garde-t-elle `ref` ? → liste de défauts */
function gardeTout(ins, ref, protegees, fn) {
  const d = []
  if (!CREE[fn].test(ins.code)) return [`« ${court(ins.code, 60)} » nomme ${fn} sans la redéfinir (create or replace function public.${fn}() seul permis)`]
  const def = V.analyserDefinition(ins)
  if (def.entete !== ref.entete) d.push('en-tête différent')
  const { retires } = V.differenceLignes(ref.lignes, def.lignes)
  if (retires.length) d.push(`${retires.length} ligne(s) retirée(s) : ${retires.slice(0, 2).map((k) => `« ${court(ref.lignes[k], 50)} »`).join(', ')}`)
  const p = V.piles(def.lignes)
  for (const l of protegees) {
    const j = def.lignes.findIndex((x) => x.toLowerCase() === l)
    if (j < 0) d.push(`« ${l} » absente`)
    else if (!V.dansLaBrancheServeur(p.get(j))) d.push(`« ${l} » hors de la branche then (profondeur 1)`)
  }
  return d
}
function redefinitionsPosterieures(migs, fn, ref, protegees, echecs, faits) {
  for (const m of migs) {
    if (m.num <= NUM || !NOMME[fn].test(m.code)) continue
    const x = V.instructions(m.texte).filter((ins) => NOMME[fn].test(V.sansCommentairesPartout(ins.code)))
    const d = x.flatMap((ins) => gardeTout(ins, ref, protegees, fn))
    if (d.length) echecs.push(`${m.nom} (postérieure à 0095) touche ${fn} sans garder 0095 : ${d.slice(0, 3).join(' ; ')}`)
    else faits.push(`${m.nom} redéfinit ${fn} en gardant 0095 entière : c'est elle qui est en vigueur`)
  }
}

// ── VM-1 : la fonction de mise à jour ────────────────────────────────────────────────────────────────────────────────────────
const LIGNE_MAJ = (c) => `new.${c} := old.${c};`
/** Les écritures de artisans.email par le client navigateur (app/, lib/) → { update[], upsertHorsInscription[], changementAdresse[], inscription } */
function cheminsEmail(racine) {
  const out = { update: [], upsertHorsInscription: [], changementAdresse: [], inscription: false, fichiers: 0 }
  for (const p of ['app', 'lib']) {
    for (const rel of listerFichiers(path.join(racine, p))) {
      if (!/\.(?:ts|tsx|js|jsx|mjs)$/.test(rel)) continue
      const f = `${p}/${rel}`
      const t = lireTexte(path.join(racine, p, ...rel.split('/')))
      if (!t) continue
      out.fichiers++
      if (/\bsupabase\s*\.\s*auth\s*\.\s*updateUser\s*\(\s*\{[^}]*\bemail\b/.test(t)) out.changementAdresse.push(f)
      const re = /\bsupabase\s*\.\s*from\(\s*['"]artisans['"]\s*\)\s*\.\s*(update|upsert|insert)\(\s*\{/g
      let m
      while ((m = re.exec(t))) {
        const debut = m.index + m[0].length
        let prof = 1, k = debut, q = null
        for (; k < t.length && prof > 0; k++) {
          const c = t[k]
          if (q) { if (c === '\\') { k++; continue } if (c === q) q = null; continue }
          if (c === "'" || c === '"' || c === '`') { q = c; continue }
          if ('([{'.includes(c)) prof++; else if (')]}'.includes(c)) prof--
        }
        const objet = t.slice(debut, k - 1)
        if (!/(?:^|[,{\s])email\s*(?:[:,]|$)/.test(objet)) continue
        if (m[1] === 'update') out.update.push(f)
        else if (f === ONBOARDING) out.inscription = true
        else out.upsertHorsInscription.push(f)
      }
    }
  }
  return out
}
function vm1(racine) {
  const echecs = [], faits = []
  const fin = (resume, extra = {}) => ({ ok: echecs.length === 0, echecs, faits, resume, u95: null, u93: null, u68: null, ...extra })
  const migs = lireMigrations(racine)
  const prec = derniereDefinition(migs, MAJ, NUM)
  const prec93 = derniereDefinition(migs, MAJ, 93)
  const extra = { u93: prec && prec.def.corps, u68: prec93 && prec93.def.corps }
  if (!prec) echecs.push('aucune définition de lock_artisan_privileges avant 0095')
  else if (prec.m.nom !== PREC[MAJ] || V.instructions(prec.m.texte).length !== 1) echecs.push(`la dernière définition de lock_artisan_privileges avant 0095 est ${prec.m.nom}:${prec.debut}, ${PREC[MAJ]} (une seule instruction) attendue (prémisse de la fiche)`)
  for (const m of migs) if (m.num > 93 && m.num < NUM && NOMME[MAJ].test(m.code)) echecs.push(`${m.nom} nomme lock_artisan_privileges entre 0093 et 0095`)
  // email : la règle du constat, vérifiée avant de juger la ligne qui la fige
  const ce = cheminsEmail(racine)
  if (ce.update.length || ce.upsertHorsInscription.length) echecs.push(`un chemin du navigateur écrit artisans.email (${[...ce.update, ...ce.upsertHorsInscription].join(', ')}) : figer email à old.email le casserait — la figer à auth.email() ou la laisser au serveur (règle du constat)`)
  if (ce.changementAdresse.length) echecs.push(`un écran change l'adresse de connexion (supabase.auth.updateUser({ email }) : ${ce.changementAdresse.join(', ')}) : artisans.email doit pouvoir la suivre — la figer à auth.email() ou la laisser au serveur`)
  faits.push(`email : ${ce.fichiers} fichier(s) de app/ et lib/ lus ; aucune mise à jour de artisans.email par le navigateur, aucun changement d'adresse de connexion ; seule l'inscription (${ONBOARDING}${ce.inscription ? ', vue' : ', non vue'}) l'envoie, l'adresse de la session → figée à old.email`)
  const f = la0095(racine)
  if (f.echec) { echecs.push(f.echec); return fin('', extra) }
  for (const e of V.defautsDeSyntaxe(f.texte)) echecs.push(`${f.nom} ne se parse pas : ${e}`)
  const st = structure0095(f.texte, migs)
  for (const e of st.echecs) echecs.push(e)
  const ins = st.definitions[MAJ]
  if (!ins) return fin('', { ...extra, nom: f.nom, structure: st })
  const d = V.analyserDefinition(ins)
  if (d.dollars !== 1 || !d.ferme || d.corps === null) echecs.push(`${MAJ} : un corps $$ … $$ refermé attendu (${d.dollars} bloc(s))`)
  if (d.apres !== ';') echecs.push(`${MAJ} : après le corps, « ; » seul attendu, trouvé « ${court(d.apres, 40)} »`)
  let conforme = false
  if (prec) {
    if (d.entete !== prec.def.entete) echecs.push(`en-tête de ${MAJ} différent de ${prec.m.nom} : « ${court(d.entete, 100)} » / « ${court(prec.def.entete, 100)} »`)
    const a = prec.def.lignes, b = d.lignes
    const { retires, ajoutes } = V.differenceLignes(a, b)
    if (retires.length) echecs.push(`${retires.length} ligne(s) de ${prec.m.nom} retirée(s) ou modifiée(s) : ${retires.slice(0, 3).map((k) => `« ${court(a[k], 60)} »`).join(', ')}`)
    const attendues = COLONNES_MAJ.map(LIGNE_MAJ)
    const ajMin = ajoutes.map((j) => b[j].toLowerCase())
    const manquantes = attendues.filter((l) => !ajMin.includes(l))
    const doubles = attendues.filter((l) => ajMin.filter((x) => x === l).length > 1)
    const autres = ajoutes.filter((j) => !attendues.includes(b[j].toLowerCase()))
    if (manquantes.length) echecs.push(`colonne(s) non figée(s) à la mise à jour : ${manquantes.map((l) => `« ${l} »`).join(', ')}`)
    if (doubles.length) echecs.push(`ligne(s) en double : ${doubles.join(', ')}`)
    if (autres.length) echecs.push(`${autres.length} ligne(s) de code en plus des cinq : ${autres.slice(0, 3).map((j) => `« ${court(b[j], 60)} »`).join(', ')}`)
    const p = V.piles(b)
    const mal = ajoutes.filter((j) => attendues.includes(b[j].toLowerCase()) && !V.dansLaBrancheServeur(p.get(j)))
    if (mal.length) echecs.push(`hors de la branche then du bloc « if current_user not in ('service_role', 'postgres') » (profondeur 1) — ${mal.map((j) => `« ${b[j]} » ${V.decrirePile(p.get(j))}`).join(' ; ')}`)
    conforme = !retires.length && !manquantes.length && !doubles.length && !autres.length && !mal.length && d.corps !== null && d.entete === prec.def.entete
    faits.push(`${MAJ} : ${prec.m.nom} (${a.length} lignes de code) → ${f.nom} (${b.length} lignes)`)
    redefinitionsPosterieures(migs, MAJ, d, [...COLONNES_MAJ, ...COLONNES_SITE].map(LIGNE_MAJ), echecs, faits)
  }
  // les cinq colonnes existent
  for (const c of COLONNES_MAJ) {
    const ajout = new RegExp(`\\b(?:create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\s*\\.\\s*)?artisans\\s*\\([^;]*\\b${c}\\s|alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?(?:public\\s*\\.\\s*)?artisans\\b[^;]*?\\badd\\s+(?:column\\s+)?(?:if\\s+not\\s+exists\\s+)?"?${c}"?\\s)`, 'i')
    const retrait = new RegExp(`\\balter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?(?:public\\s*\\.\\s*)?artisans\\b[^;]*?\\bdrop\\s+(?:column\\s+)?(?:if\\s+exists\\s+)?"?${c}"?\\b`, 'i')
    if (!migs.some((m) => m.num < NUM && ajout.test(m.code))) echecs.push(`colonne artisans.${c} créée par aucune migration antérieure à 0095 : new.${c} ferait échouer chaque mise à jour`)
    const r = migs.filter((m) => m.num <= NUM && retrait.test(m.code)).map((m) => m.nom)
    if (r.length) echecs.push(`colonne artisans.${c} retirée par ${r.join(', ')}`)
  }
  return fin(`${f.nom} redéfinit ${MAJ} = ${PREC[MAJ]} à l'identique + ${COLONNES_MAJ.map((c) => `new.${c} := old.${c}`).join(', ')} dans la branche then (profondeur 1), en-tête identique ; email figée (aucun chemin légitime du navigateur ne la change) ; seules instructions en plus : ${st.aides.size} fonction(s) d'appoint et leurs droits`, { ...extra, nom: f.nom, u95: conforme ? d.corps : null, def95: d, structure: st })
}

// ── VM-2 : l'insertion et l'adresse ──────────────────────────────────────────────────────────────────────────────────────────
function slugsReserves(racine) {
  const t = lireTexte(path.join(racine, 'lib', 'urls.ts'))
  if (t === null) throw new Error('lib/urls.ts absent de la racine : SLUGS_RESERVES illisible')
  const m = /export\s+const\s+SLUGS_RESERVES\s*=\s*new\s+Set\(\s*\[([\s\S]*?)\]\s*\)/.exec(t)
  if (!m) throw new Error('lib/urls.ts : « export const SLUGS_RESERVES = new Set([…]) » introuvable')
  const items = m[1].replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').split(',').map((x) => x.trim()).filter(Boolean)
  const mots = items.map((x) => { const q = /^'([^'\\]*)'$|^"([^"\\]*)"$/.exec(x); if (!q) throw new Error(`lib/urls.ts : élément non littéral dans SLUGS_RESERVES : ${x}`); return q[1] ?? q[2] })
  if (mots.length < 10) throw new Error(`lib/urls.ts : ${mots.length} mot(s) réservé(s) seulement`)
  return mots
}
async function fonctionsSlug(racine) {
  const src = lireTexte(path.join(racine, 'lib', 'slug.ts'))
  if (src === null) throw new Error('lib/slug.ts absent de la racine')
  if (/^\s*import\s/m.test(src)) throw new Error('lib/slug.ts importe un module : le juge ne peut plus l\'évaluer seul')
  const ts = createRequire(path.join(R, 'package.json'))('typescript')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  const f = path.join(dossierTravail(JUGE, 'slug'), 'slug.mjs')
  fs.writeFileSync(f, js, 'utf8')
  const mod = await import(`${pathToFileURL(f).href}?${Date.now()}`)
  if (typeof mod.slugBase !== 'function' || typeof mod.randomSuffix !== 'function') throw new Error('lib/slug.ts n\'exporte plus slugBase et randomSuffix')
  return mod
}
/** Les politiques de lecture de public.artisans encore en place avant 0095 → [[nom, { pour, using, nom }]] */
function politiquesLecture(migs) {
  const actives = new Map()
  for (const m of migs) {
    if (m.num >= NUM) continue
    for (const ins of V.instructions(m.code)) {
      const c = /^create\s+policy\s+"?([\w-]+)"?\s+on\s+(?:public\s*\.\s*)?artisans\b([\s\S]*)$/i.exec(ins.code)
      if (c) {
        const pour = ((/\bfor\s+(select|all|insert|update|delete)\b/i.exec(c[2]) || [])[1] || 'all').toLowerCase()
        const u = /\busing\s*\(([\s\S]*)\)\s*(?:with\s+check\b[\s\S]*)?;?\s*$/i.exec(c[2])
        actives.set(c[1].toLowerCase(), { pour, using: u ? u[1].replace(/\s+/g, '').replace(/^\((.*)\)$/, '$1') : null, fichier: m.nom })
        continue
      }
      const d = /^drop\s+policy\s+(?:if\s+exists\s+)?"?([\w-]+)"?\s+on\s+(?:public\s*\.\s*)?artisans\b/i.exec(ins.code)
      if (d) actives.delete(d[1].toLowerCase())
    }
  }
  return [...actives].filter(([, p]) => p.pour === 'select' || p.pour === 'all')
}
/** Une fonction d'appoint de 0095, prête pour l'interprète → { params, select, definer, searchPath, langage, executables } */
function preparerAide(nom, aide, droits) {
  const e = aide.def.entete
  const params = (/\(([^)]*)\)/.exec(e)?.[1] ?? '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => x.split(/\s+/)[0])
  const langage = (/\blanguage\s+(\w+)/.exec(e) || [])[1] || '?'
  const definer = /\bsecurity\s+definer\b/.test(e)
  const searchPath = /\bset\s+search_path\b/.test(e)
  const roles = new Set(['public', 'anon', 'authenticated', 'service_role'])
  for (const d of droits.filter((x) => x.nom === nom)) {
    if (d.sorte === 'revoke') for (const r of d.roles) roles.delete(r)
    if (d.sorte === 'grant') for (const r of d.roles) roles.add(r)
  }
  const executables = new Set(['anon', 'authenticated', 'service_role'].filter((r) => roles.has(r) || roles.has('public')))
  let select = null, erreur = null
  if (langage !== 'sql') erreur = `${nom} : language ${langage} non simulé (language sql attendu)`
  else if (aide.def.corps === null) erreur = `${nom} : corps illisible`
  else {
    try {
      const corps = V.sansCommentaires(aide.def.corps).trim().replace(/;\s*$/, '')
      const x = V.analyserExpression(V.jetons(`(${corps})`))
      if (x.k !== 'sousRequete') throw new Error('un « select … » attendu')
      select = x.s
    } catch (err) { erreur = `${nom} : corps non simulé (${premiere(err)})` }
  }
  return { params, select, definer, searchPath, langage, executables, erreur }
}
const AUTRE = { id: '00000000-0000-4000-8000-00000000a0a0', slug: 'dupont-plomberie-k2x9', slugs_anciens: ['vieille-adresse-ab12', 'www-ancien-q7r2'] }
const MOI = { id: '00000000-0000-4000-8000-00000000b0b0', slug: 'mon-entreprise-zz11', slugs_anciens: ['mon-ancienne-adresse-p0p0'] }
const NOUVEAU = '00000000-0000-4000-8000-00000000c0c0'
const NOMS = ['Dupont Plomberie', 'www', 'Admin', 'Site', 'p', 'Aide', 'FAQ', 'Contact', 'Presti', 'Mentions légales', 'Infos légales', 'Vieille adresse', 'Mon ancienne adresse', 'Électricité Générale Durand & Fils', '', '!!!', 'x'.repeat(80)]
const nouvelle = (id, slug) => ({ id, slug, email: 'essai@presti-test.invalid', nom: 'Essai', metier: 'Plombier', tel: null, ton_style: 'Bonjour', origine_declaree: 'google', origine_precision: null })
async function vm2(racine, r1) {
  const echecs = [], faits = []
  const fin = (resume, extra = {}) => ({ ok: echecs.length === 0, echecs, faits, resume, i95: null, i94: null, i08: null, refus: [], ...extra })
  const migs = lireMigrations(racine)
  const prec = derniereDefinition(migs, INS, NUM)
  const prec94 = derniereDefinition(migs, INS, 94)
  const extra = { i94: prec && prec.def.corps, i08: prec94 && prec94.def.corps }
  if (!prec) { echecs.push('aucune définition de lock_artisan_privileges_ins avant 0095'); return fin('', extra) }
  if (prec.m.nom !== PREC[INS] || V.instructions(prec.m.texte).length !== 1) echecs.push(`la dernière définition de lock_artisan_privileges_ins avant 0095 est ${prec.m.nom}:${prec.debut}, ${PREC[INS]} (une seule instruction) attendue (prémisse de la fiche)`)
  // les prémisses de la simulation : la RLS de lecture, la liste des mots réservés, le format de l'inscription
  const pol = politiquesLecture(migs)
  if (pol.length !== 1 || pol[0][0] !== 'artisan_select_own' || pol[0][1].using !== 'auth.uid()=id') echecs.push(`prémisse de la simulation : la seule politique de lecture de artisans doit être artisan_select_own (auth.uid() = id), trouvé ${pol.map(([n, p]) => `${n} (${p.pour}, ${p.using})`).join(', ') || 'aucune'}`)
  let reserves = [], slug = null
  try { reserves = slugsReserves(racine) } catch (e) { echecs.push(premiere(e)) }
  try { slug = await fonctionsSlug(racine) } catch (e) { echecs.push(premiere(e)) }
  const ob = lireTexte(path.join(racine, ...ONBOARDING.split('/')))
  if (ob === null) echecs.push(`${ONBOARDING} absent de la racine : le format du slug de l'inscription n'est pas vérifiable`)
  else {
    if (!/const\s+slug\s*=\s*`\$\{\s*slugBase\(\s*[\w.]+\s*\)\s*\}-\$\{\s*randomSuffix\(\s*\)\s*\}`/.test(ob)) echecs.push(`${ONBOARDING} ne construit plus le slug par \`\${slugBase(nom)}-\${randomSuffix()}\` : le juge simule un autre format, à revoir`)
    const imp = /import\s*\{([^}]*)\}\s*from\s*['"]@\/lib\/slug['"]/.exec(ob)
    if (!imp || !/\bslugBase\b/.test(imp[1]) || !/\brandomSuffix\b/.test(imp[1])) echecs.push(`${ONBOARDING} n'importe plus slugBase et randomSuffix de @/lib/slug`)
  }
  const f = la0095(racine)
  if (f.echec) { echecs.push(f.echec); return fin('', extra) }
  const st = r1?.structure || structure0095(f.texte, migs)
  const ins = st.definitions[INS]
  if (!ins) { echecs.push(`${f.nom} ne redéfinit pas ${INS}`); return fin('', extra) }
  const d = V.analyserDefinition(ins)
  if (d.dollars !== 1 || !d.ferme || d.corps === null) { echecs.push(`${INS} : un corps $$ … $$ refermé attendu`); return fin('', extra) }
  if (d.apres !== ';') echecs.push(`${INS} : après le corps, « ; » seul attendu, trouvé « ${court(d.apres, 40)} »`)
  if (d.entete !== prec.def.entete) echecs.push(`en-tête de ${INS} différent de ${prec.m.nom} : « ${court(d.entete, 100)} » / « ${court(prec.def.entete, 100)} »`)
  const { retires } = V.differenceLignes(prec.def.lignes, d.lignes)
  if (retires.length) echecs.push(`${retires.length} ligne(s) de ${prec.m.nom} retirée(s) ou modifiée(s) : ${retires.slice(0, 3).map((k) => `« ${court(prec.def.lignes[k], 60)} »`).join(', ')}`)
  // l'arbre : 0094 + des refus, dans la branche du navigateur ou au premier niveau
  let a94, a95
  try { a94 = V.analyserPlpgsql(prec.def.corps); a95 = V.analyserPlpgsql(d.corps) } catch (e) { echecs.push(`corps illisible par l'analyse PL/pgSQL : ${premiere(e)}`); return fin('', extra) }
  const b95 = V.blocServeur(a95), b94 = V.blocServeur(a94)
  const refus = []
  const sansRefus = (liste, ou) => liste.filter((s) => { if (V.estRefus(s)) { refus.push({ st: s, ou }); return false } return true })
  const haut = sansRefus(a95.instructions, 'premier niveau (tous les rôles)')
  // 25/09 : l'email du compte connecté (UNE affectation à new.email, profondeur 1 de la branche) est jugée par VM-6 ; mise de côté ici
  const emails = b95 ? b95.branches[0].corps.filter((s) => s.type === 'affectation' && s.cible === 'new.email') : []
  const sansEmail = (l) => (emails.length === 1 ? l.filter((s) => s !== emails[0]) : l)
  const reduit = haut.map((s) => (s === b95 ? { ...s, branches: [{ ...s.branches[0], corps: sansEmail(sansRefus(s.branches[0].corps, 'branche du navigateur')) }, ...s.branches.slice(1)] } : s))
  if (emails.length === 1) faits.push(`« new.email := ${court(V.texteJetons(emails[0].expr), 60)} » dans la branche du navigateur : mise de côté ici, jugée par VM-6`)
  if (V.signatureListe(reduit) !== V.signatureListe(a94.instructions)) echecs.push(`l'arbre de ${INS} n'est pas celui de ${prec.m.nom} plus des refus (« if … then raise exception … ; end if; » sans else, dans la branche du navigateur ou au premier niveau) : instructions modifiées, ajoutées ailleurs ou refus mal placés`)
  if (!refus.length) echecs.push(`${INS} n'ajoute aucun refus : ni mot réservé, ni ancienne adresse ne sont refusés`)
  for (const r of refus) { try { r.expr = V.analyserExpression(r.st.branches[0].cond); const a = V.aspects(r.expr); r.sorte = r.expr.k === 'like' && !r.expr.neg && r.expr.b.k === 'val' ? 'prefixe' : a.tables.size || a.appels.size ? (a.tableauxLitteraux ? 'mixte' : 'ancien') : a.tableauxLitteraux ? 'reserve' : 'autre' } catch (e) { r.sorte = 'illisible'; echecs.push(`condition de refus non simulée : ${premiere(e)}`) } }
  faits.push(`${refus.length} refus : ${refus.map((r) => `${r.sorte} (${r.ou})`).join(', ')}`)
  const i95 = V.signatureListe(reduit) === V.signatureListe(a94.instructions) && d.entete === prec.def.entete && !retires.length ? d.corps : null
  // les fonctions d'appoint
  const fonctions = new Map()
  for (const [nom, aide] of st.aides) {
    const p = preparerAide(nom, aide, st.droits)
    if (p.erreur) echecs.push(p.erreur)
    if (p.definer && !p.searchPath) echecs.push(`${nom} est security definer sans « set search_path » : n'importe qui pourrait lui faire lire autre chose`)
    faits.push(`${nom}(${p.params.join(', ')}) : language ${p.langage}, ${p.definer ? 'security definer' : 'security invoker'}, EXECUTE pour ${[...p.executables].join(', ') || 'personne'}${p.executables.has('anon') ? ' (anon compris : noté)' : ''}`)
    if (!p.erreur) fonctions.set(nom, p)
  }
  if (!reserves.length || !slug || !b94) { if (!b94) echecs.push(`${prec.m.nom} : bloc current_user introuvable`); return fin('', { ...extra, i95, refus }) }
  // la simulation
  const forcees94 = b94.branches[0].corps.filter((s) => s.type === 'affectation').map((s) => s.cible.slice(4))
  const lignes = [AUTRE, MOI].map((x) => ({ ...x }))
  const jouer = (role, id, s) => { try { return V.executerCorps(a95, { role, uid: id, nouvelle: nouvelle(id, s), lignes, fonctions }) } catch (e) { return { erreur: premiere(e) } } }
  const ecarts = [], nonSimules = new Set()
  const verifier = (quoi, r, refuse) => {
    if (r.erreur) { nonSimules.add(r.erreur); ecarts.push(`${quoi} : non simulé (${r.erreur})`); return }
    if (refuse && !r.refus) ecarts.push(`${quoi} : accepté`)
    if (!refuse && r.refus) ecarts.push(`${quoi} : refusé (« ${court(r.refus.message, 60)} »)`)
  }
  for (const mot of reserves) verifier(`mot réservé « ${mot} »`, jouer('authenticated', NOUVEAU, mot), true)
  for (const s of AUTRE.slugs_anciens) verifier(`ancienne adresse d'un autre « ${s} »`, jouer('authenticated', NOUVEAU, s), true)
  verifier(`inscription rejouée avec l'ancienne adresse d'un autre (${AUTRE.slugs_anciens[0]})`, jouer('authenticated', MOI.id, AUTRE.slugs_anciens[0]), true)
  verifier(`inscription rejouée avec sa propre ancienne adresse (${MOI.slugs_anciens[0]}, upsert)`, jouer('authenticated', MOI.id, MOI.slugs_anciens[0]), false)
  const anciensAutres = new Set([...AUTRE.slugs_anciens, ...MOI.slugs_anciens])
  let normaux = 0, normauxRefuses = 0
  const suffixes = ['ab12', '0000', 'zz99', 'p0p0', slug.randomSuffix(), slug.randomSuffix()]
  for (const nom of NOMS) {
    for (const suf of suffixes) {
      const s = `${slug.slugBase(nom)}-${suf}`
      const attenduRefus = reserves.includes(s) || anciensAutres.has(s)
      const r = jouer('authenticated', NOUVEAU, s)
      verifier(`slug d'inscription « ${s} » (nom « ${court(nom, 20)} »)`, r, attenduRefus)
      if (attenduRefus) normauxRefuses++
      else {
        normaux++
        if (!r.erreur && !r.refus) { const manque = forcees94.filter((c) => !r.forcees.has(c)); if (manque.length) ecarts.push(`slug « ${s} » accepté mais ${manque.length} colonne(s) de 0094 plus forcée(s) : ${manque.slice(0, 4).join(', ')}`) }
      }
    }
  }
  const serveur = jouer('service_role', NOUVEAU, 'serveur-demo-x1y2')
  verifier('le serveur (service_role) crée une ligne', serveur, false)
  if (!serveur.erreur && !serveur.refus && serveur.forcees.size) ecarts.push(`le serveur voit ${serveur.forcees.size} colonne(s) forcée(s) : ${[...serveur.forcees.keys()].slice(0, 4).join(', ')}`)
  if (ecarts.length) echecs.push(`${ecarts.length} cas faux sur ${reserves.length + AUTRE.slugs_anciens.length + 3 + normaux + normauxRefuses} : ${ecarts.slice(0, 5).join(' ; ')}${ecarts.length > 5 ? ' …' : ''}`)
  const note = (quoi, r) => (r.erreur ? `${quoi} : non simulé` : `${quoi} : ${r.refus ? 'refusé' : 'accepté'}`)
  faits.push(`notés : ${note("service_role avec « www »", jouer('service_role', NOUVEAU, 'www'))} ; ${note("navigateur avec « WWW »", jouer('authenticated', NOUVEAU, 'WWW'))} ; ${note('navigateur avec un slug nul', jouer('authenticated', NOUVEAU, null))}`)
  faits.push(`simulé : ${reserves.length} mots réservés (lib/urls.ts), ${AUTRE.slugs_anciens.length} anciennes adresses d'un autre, 2 inscriptions rejouées, ${normaux} slugs normaux acceptés et ${normauxRefuses} tombés exactement sur l'ancienne adresse d'un autre (refusés), le serveur ; ${forcees94.length} colonnes de 0094 toujours forcées`)
  redefinitionsPosterieures(migs, INS, d, [], echecs, faits)
  return fin(`${f.nom} redéfinit ${INS} = ${PREC[INS]}${emails.length === 1 ? ' + l\'email imposé (VM-6)' : ''} + ${refus.length} refus (${refus.map((r) => r.sorte).join(', ')}) ; exécutée par l'interprète (RLS simulée) : ${reserves.length} mots réservés et les anciennes adresses d'un autre refusés, ${normaux} slugs d'inscription acceptés (lib/slug.ts), la sienne propre acceptée, le serveur libre`, { ...extra, i95, refus, jouer, a95, slugMod: slug })
}

// ── VM-3 : les contrôles après collage ──────────────────────────────────────────────────────────────────────────────────────
const ctxDe = (defs, crlf = false, catalogue = V.CATALOGUE_ARTISANS) => ({ defs: Object.fromEntries(Object.entries(defs).map(([fn, c]) => [fn, V.defSimulee(fn, crlf ? V.enCrlf(c) : c)])), catalogue })
/**
 * Juge un contrôle. spec = { rel, contextes: [{ <fn>: corps }], colonnes: [{ fn, col, anciens: [corps] }], refus: [{ nom, sans: corps,
 * anciens: [corps] }], declencheurs: [nom] } → défauts dans echecs, notes dans faits.
 */
function jugerControle(racine, spec, echecs, faits) {
  const texte = lireTexte(path.join(racine, ...spec.rel.split('/')))
  const E = (m) => echecs.push(`${spec.rel} : ${m}`)
  if (texte === null) return E('absent')
  if (!texte.trim()) return E('vide')
  const c = V.lireControle(texte)
  for (const d of c.defauts) E(d)
  if (c.erreur) return E(c.erreur)
  if (c.ecritures.length) E(`n'est pas en lecture seule : ${c.ecritures.join(', ')}`)
  if (!c.lignes.length) return E('aucun « case when … then \'oui\' … end »')
  const bons = spec.contextes.flatMap((x) => [ctxDe(x), ctxDe(x, true)])
  const rep = (l, ctx) => { try { return { v: V.repondre(l, ctx) } } catch (e) { return { e: premiere(e) } } }
  const simulables = []
  for (const l of c.lignes) {
    const r = bons.map((ctx) => rep(l, ctx))
    const err = r.find((x) => x.e)
    if (err) {
      if (l.peutOui && l.litteraux.some((x) => /new\\?\.|trg_lock_artisan_/i.test(x))) E(`ligne ${l.n} (« ${court(l.quoi, 50)} ») non simulable : ${err.e}`)
      else faits.push(`${spec.rel} : ligne ${l.n} non simulée (${court(err.e, 60)}), ne parle ni d'une affectation ni d'un verrou`)
      continue
    }
    if (l.peutOui && r.some((x) => x.v !== 'oui')) { E(`ligne ${l.n} (« ${court(l.quoi, 50)} ») répond « ${r.map((x) => x.v ?? 'NULL').join(' » / « ')} » sur les fonctions attendues (LF / CRLF), « oui » attendu`); continue }
    if (r.every((x) => x.v === 'oui')) simulables.push(l)
  }
  // les colonnes : mutants de branche, spécificité, fonction d'avant
  const mutants = new Map()
  const mutant = (col, fn, mode, k) => {
    const cle = `${col}|${fn}|${mode}|${k}`
    if (!mutants.has(cle)) {
      const base = spec.contextes[k]
      try { mutants.set(cle, ctxDe({ ...base, [fn]: V.muterAffectation(base[fn], col, mode) })) } catch (e) { mutants.set(cle, { erreur: premiere(e) }) }
    }
    return mutants.get(cle)
  }
  const couvertes = []
  for (const x of spec.colonnes) {
    const mut = []
    let erreur = null
    for (let k = 0; k < spec.contextes.length; k++) for (const mode of V.MODES_BRANCHE) { const m = mutant(x.col, x.fn, mode, k); if (m.erreur) erreur = erreur || `${mode} : ${m.erreur}`; else mut.push({ mode, ctx: m }) }
    if (erreur) { E(`mutation impossible pour ${x.col} (${erreur})`); continue }
    const autres = spec.colonnes.filter((y) => y !== x)
    const bonne = simulables.find((l) => {
      if (!mut.every((m) => rep(l, m.ctx).v !== 'oui')) return false
      for (const y of autres) for (let k = 0; k < spec.contextes.length; k++) for (const mode of V.MODES_NEUTRES) { const m = mutant(y.col, y.fn, mode, k); if (m.erreur || rep(l, m).v !== 'oui') return false }
      return x.anciens.every((a) => rep(l, ctxDe({ ...spec.contextes[0], [x.fn]: a })).v !== 'oui')
    })
    if (!bonne) {
      const nomme = new RegExp(`(?<![a-z0-9_])${x.col}(?![a-z0-9_])`, 'i')
      const proche = c.lignes.find((l) => l.litteraux.some((t) => nomme.test(t)))
      let pourquoi = 'aucune ligne ne la nomme'
      if (proche && !simulables.includes(proche)) pourquoi = `la ligne ${proche.n} ne dit pas « oui » sur la bonne fonction, ou n'est pas simulable`
      else if (proche) {
        const encore = [...new Set(mut.filter((m) => rep(proche, m.ctx).v === 'oui').map((m) => V.DESCRIPTION_MODE[m.mode]))]
        const avant = x.anciens.some((a) => rep(proche, ctxDe({ ...spec.contextes[0], [x.fn]: a })).v === 'oui')
        pourquoi = encore.length ? `la ligne ${proche.n} dit encore « oui » quand l'affectation est ${encore.join(', ')}` : avant ? `la ligne ${proche.n} dit « oui » sur la fonction d'avant` : `la ligne ${proche.n} ne dit plus « oui » quand une autre colonne bouge`
      }
      E(`new.${x.col} : aucune ligne sensible à la branche — ${pourquoi}`)
      continue
    }
    couvertes.push(`${x.col} (l.${bonne.n})`)
  }
  // les refus de l'inscription
  for (const x of spec.refus) {
    const bonne = simulables.find((l) => rep(l, ctxDe({ ...spec.contextes[0], [INS]: x.sans })).v !== 'oui' && x.anciens.every((a) => rep(l, ctxDe({ ...spec.contextes[0], [INS]: a })).v !== 'oui'))
    if (!bonne) E(`aucune ligne ne vérifie le refus « ${x.nom} » (oui avec lui, pas oui sans lui ni sur ${PREC[INS]})`)
    else couvertes.push(`refus ${x.nom} (l.${bonne.n})`)
  }
  // les déclencheurs
  for (const nom of spec.declencheurs) {
    const mutantsD = V.mutantsDeclencheur(nom)
    const candidates = c.lignes.filter((l) => l.litteraux.includes(nom))
    const bonne = simulables.filter((l) => candidates.includes(l)).find((l) => mutantsD.every((m) => rep(l, ctxDe(spec.contextes[0], false, m.catalogue)).v !== 'oui'))
    if (!bonne) {
      const l = candidates.find((y) => simulables.includes(y))
      const passe = l ? mutantsD.filter((m) => rep(l, ctxDe(spec.contextes[0], false, m.catalogue)).v === 'oui').map((m) => m.nom) : []
      E(`aucune ligne ne vérifie ${nom} par sa fonction (tgfoid), BEFORE … FOR EACH ROW, son événement et tgenabled = 'O'${l ? ` : la ligne ${l.n} dit encore « oui » avec ${passe.join(', ')}` : candidates.length ? ' (ligne non simulable)' : ' (aucune ligne ne le nomme)'}`)
    } else couvertes.push(`${nom} (l.${bonne.n})`)
  }
  faits.push(`${spec.rel} : ${c.lignes.length} ligne(s), ${mutants.size} fonction(s) mutée(s), couvert : ${couvertes.join(', ')}`)
  return couvertes.length
}
function corpsAttenduMaj(u93) {
  const l = u93.split('\n')
  const k = l.findIndex((x) => V.normaliserLigne(x.replace(/--.*$/, '')) === 'new.site_origine := old.site_origine;')
  if (k < 0) return null
  const r = /^\s*/.exec(l[k])[0]
  return [...l.slice(0, k + 1), ...COLONNES_MAJ.map((c) => `${r}${LIGNE_MAJ(c)}`), ...l.slice(k + 1)].join('\n')
}
function vm3(racine, r1, r2) {
  const echecs = [], faits = []
  const fin = (resume) => ({ ok: echecs.length === 0, echecs, faits, resume })
  const migs = lireMigrations(racine)
  const u68 = r1?.u68, u93 = r1?.u93, i08 = r2?.i08, i94 = r2?.i94
  if (!u68 || !u93 || !i08 || !i94) { echecs.push('fonctions de 0068, 0093, 0008 ou 0094 illisibles : simulation impossible (voir VM-1, VM-2)'); return fin('') }
  let u95 = r1.u95
  if (!u95) { u95 = corpsAttenduMaj(u93); faits.push(`0095 absente ou non conforme (VM-1) : contrôles jugés contre la mise à jour attendue (0093 + les cinq lignes)`) }
  const i95 = r2.i95
  if (!i95) faits.push('0095 absente ou non conforme (VM-2) : les contrôles de 0094 ne sont jugés que sur 0094')
  const f = la0095(racine)
  // 0093
  jugerControle(racine, {
    rel: 'supabase/controles/0093_site_fige.sql',
    contextes: [{ [MAJ]: u93 }, ...(u95 ? [{ [MAJ]: u95 }] : [])],
    colonnes: COLONNES_SITE.map((col) => ({ fn: MAJ, col, anciens: [u68] })), refus: [], declencheurs: ['trg_lock_artisan_upd'],
  }, echecs, faits)
  // 0094
  let a94, a08
  try { a94 = V.analyserPlpgsql(i94); a08 = V.analyserPlpgsql(i08) } catch (e) { echecs.push(`0094 ou 0008 illisible : ${premiere(e)}`); return fin('') }
  const aff = (a) => (V.blocServeur(a)?.branches[0].corps ?? []).filter((s) => s.type === 'affectation').map((s) => s.cible.slice(4))
  const de0008 = new Set(aff(a08))
  jugerControle(racine, {
    rel: 'supabase/controles/0094_insertion_figee.sql',
    contextes: [{ [INS]: i94 }, ...(i95 ? [{ [INS]: i95 }] : [])],
    colonnes: aff(a94).map((col) => ({ fn: INS, col, anciens: de0008.has(col) ? [] : [i08] })), refus: [], declencheurs: ['trg_lock_artisan_ins'],
  }, echecs, faits)
  // 0095
  if (!f.nom) { echecs.push('supabase/controles/0095_<nom>.sql : la migration 0095 est absente, son contrôle aussi'); return fin('') }
  const refus = []
  if (i95) {
    const a95 = V.analyserPlpgsql(i95)
    const tous = [...a95.instructions, ...(V.blocServeur(a95)?.branches[0].corps ?? [])].filter(V.estRefus)
    for (const st of tous) { const s = r2.refus.find((x) => x.st.debut === st.debut); refus.push({ nom: `${s?.sorte ?? '?'} : « ${court(V.texteJetons(st.branches[0].cond), 50)} »`, sans: V.sansInstruction(i95, st), anciens: [i94] }) }
  } else echecs.push('fonction d\'insertion de 0095 absente ou non conforme (VM-2) : les lignes des refus ne sont pas jugées')
  // 25/09 : l'email imposé à l'insertion (VM-6), s'il est là, a lui aussi sa ligne sensible à la branche (pas « oui » sur 0094)
  let emailIns = false
  try { emailIns = !!i95 && (V.blocServeur(V.analyserPlpgsql(i95))?.branches[0].corps ?? []).filter((s) => s.type === 'affectation' && s.cible === 'new.email').length === 1 } catch { emailIns = false }
  jugerControle(racine, {
    rel: `supabase/controles/${f.nom}`,
    contextes: [{ [MAJ]: u95, [INS]: i95 ?? i94 }],
    colonnes: [...COLONNES_MAJ.map((col) => ({ fn: MAJ, col, anciens: [u93] })), ...(emailIns ? [{ fn: INS, col: 'email', anciens: [i94] }] : [])],
    refus, declencheurs: ['trg_lock_artisan_upd', 'trg_lock_artisan_ins'],
  }, echecs, faits)
  if (!emailIns) faits.push('0095 n\'impose pas l\'email à l\'insertion (VM-6) : pas de ligne de contrôle exigée pour lui')
  const aides = [...(r1?.structure?.aides?.keys() ?? [])]
  return fin(`contrôles de 0093, 0094 et ${f.nom} en lecture seule et sensibles à la branche : une ligne par colonne qui tombe si l'affectation est ${V.MODES_BRANCHE.map((m) => V.DESCRIPTION_MODE[m]).join(', ')}, jugée sur la fonction visée et sur celle en vigueur après 0095 (LF et CRLF) ; les refus de l'inscription ; les déclencheurs par tgfoid, BEFORE, FOR EACH ROW, événement, tgenabled = 'O'${aides.length ? ` ; ${aides.join(', ')} : ligne notée (pg_proc non simulé)` : ''}`)
}

// ── VM-4 : les jumeaux ───────────────────────────────────────────────────────────────────────────────────────────────────────
function jumeaux(racine, migration, jumeau, nu, controle, echecs, faits) {
  const dir = migDir(racine)
  const M = path.join(dir, migration), A = path.join(dir, jumeau), N = path.join(dir, nu), C = path.join(ctlDir(racine), controle)
  const m = lireTexte(M), a = lireTexte(A), n = lireTexte(N), c = lireTexte(C)
  const E = (x) => echecs.push(x)
  for (const [nom, t] of [[jumeau, a], [nu, n]]) { if (t === null) E(`supabase/migrations/${nom} absent`); else if (!t.trim()) E(`${nom} vide`) }
  if (!a || !n || !a.trim() || !n.trim()) return []
  for (const [nom, t] of [[jumeau, a], [nu, n]]) for (const d of V.defautsDeSyntaxe(t)) E(`${nom} ne se parse pas : ${d}`)
  if (!TETE_NU(nu).test(n.split('\n')[0])) E(`${nu} : première ligne « ${court(n.split('\n')[0], 60)} », la bande de 28 tirets de sql-nu.mjs attendue`)
  const morceaux = n.split(MARQUE_CONTROLE)
  if (morceaux.length !== 2) E(`${nu} : ${morceaux.length - 1} marque(s) de contrôle, une attendue`)
  if (morceaux.length === 2) {
    if (c === null) E(`pied de ${nu} invérifiable : supabase/controles/${controle} absent`)
    else if (morceaux[1].trim() !== c.trim()) E(`le contrôle en pied de ${nu} n'est pas supabase/controles/${controle} (${V.divergence(c.trim(), morceaux[1].trim())}) : régénérer avec --controle`)
  }
  if (m === null) E(`${migration} absent`)
  else if (V.noyau(m) !== V.noyau(a)) E(`${jumeau} ne porte pas le SQL de ${migration} (${V.divergence(V.noyau(m), V.noyau(a))})`)
  if (V.noyau(a) !== V.noyau(morceaux[0])) E(`${nu} (avant la marque) ne porte pas le SQL de ${jumeau} (${V.divergence(V.noyau(a), V.noyau(morceaux[0]))})`)
  const sqlNu = path.join(racine, 'scripts', 'sql-nu.mjs')
  if (!fs.existsSync(sqlNu)) { E('scripts/sql-nu.mjs absent de la racine'); return [] }
  const w = path.join(TRAVAIL, JUGE, 'nu')
  fs.mkdirSync(w, { recursive: true })
  const fNu = path.join(exigerSousTravail(w), nu)
  fs.writeFileSync(fNu, morceaux[0], 'utf8')
  const vus = []
  for (const [x, y, nom] of [...(m === null ? [] : [[M, A, `${migration} → ${jumeau}`]]), [A, fNu, `${jumeau} → ${nu} coupé`]]) {
    const r = lancer(process.execPath, [sqlNu, '--verifier', x, y], { cwd: racine, timeout: 60_000 })
    if (r.code !== 0 || !r.stdout.includes('✅')) E(`sql-nu.mjs --verifier ${nom} : code ${r.code} — ${court(r.sortie, 140)}`)
    else vus.push(nom)
  }
  faits.push(`sql-nu.mjs --verifier vert : ${vus.join(' ; ') || 'aucun'}`)
  return [jumeau, nu]
}
function vm4(racine) {
  const echecs = [], faits = []
  const fin = (resume) => ({ ok: echecs.length === 0, echecs, faits, resume })
  fs.rmSync(path.join(exigerSousTravail(path.join(TRAVAIL, JUGE, 'nu'))), { recursive: true, force: true })
  const f = la0095(racine)
  const noms = []
  noms.push(...jumeaux(racine, M93, '_A_COLLER_sql_editor_0093.sql', '_A_COLLER_sql_editor_0093_NU.sql', M93, echecs, faits))
  noms.push(...jumeaux(racine, M94, '_A_COLLER_sql_editor_0094.sql', '_A_COLLER_sql_editor_0094_NU.sql', M94, echecs, faits))
  if (f.nom) noms.push(...jumeaux(racine, f.nom, JUMEAU, JUMEAU_NU, f.nom, echecs, faits))
  else echecs.push(`jumeaux de 0095 non jugés : ${f.echec}`)
  const suite = path.join(racine, 'scripts', 'migrations-jumelles-e2e.mjs')
  const r = lancer(process.execPath, [fs.existsSync(suite) ? suite : path.join(R, 'scripts', 'migrations-jumelles-e2e.mjs')], { cwd: racine, timeout: 120_000 })
  const lignes = r.sortie.split(/\r?\n/)
  const rouges = lignes.filter((l) => l.includes('❌'))
  if (r.code !== 0 || rouges.length) echecs.push(`migrations-jumelles-e2e.mjs : code ${r.code}, ${rouges.length} échec(s) : ${rouges.slice(0, 2).map((l) => court(l, 90)).join(' ; ') || court(r.derniereLigne, 90)}`)
  const verts = (nom) => lignes.filter((l) => l.includes('✅') && l.includes(nom)).length
  for (const nom of noms) if (verts(nom) < 4) echecs.push(`migrations-jumelles-e2e.mjs n'a vérifié ${nom} que ${verts(nom)} fois (4 attendues)`)
  if (!r.code && !rouges.length) faits.push(`migrations-jumelles-e2e.mjs vert (${court(r.derniereLigne, 40)}) ; ${noms.map((x) => `${x} ${verts(x)} ✅`).join(', ')}`)
  return fin(`jumeaux de 0093, 0094${f.nom ? ` et ${f.nom}` : ''} : même SQL que leur migration (juge et sql-nu.mjs --verifier), nus sortis de sql-nu.mjs avec leur contrôle en pied ; migrations-jumelles-e2e.mjs vert`)
}

// ── VM-5 : rien d'autre n'a bougé ────────────────────────────────────────────────────────────────────────────────────────────
const MODIFIABLES = {
  'supabase/migrations/0094_insertion_figee.sql': 'commentaires',
  'supabase/migrations/_A_COLLER_sql_editor_0094.sql': 'commentaires',
  'supabase/migrations/_A_COLLER_sql_editor_0094_NU.sql': 'jumeau (VM-4)',
  'supabase/migrations/_A_COLLER_sql_editor_0093_NU.sql': 'jumeau (VM-4)',
  'supabase/controles/0093_site_fige.sql': 'contrôle (VM-3)',
  'supabase/controles/0094_insertion_figee.sql': 'contrôle (VM-3)',
  // 25/09 (relecture adverse) : le préfixe de la purge réservé et partagé, la purge qui prévient sur échec
  [URLS]: 'préfixe réservé (VM-7)',
  [PURGE]: 'purge (VM-7)',
}
// 04/10 : le VRAI périmètre de VM-5 (même correction que VI-5 de verrou-insertion-qa). « Rien d'autre n'a bougé sous app/ et lib/ » était
// la barrière de la fiche 025-13 (interdit : app/**, lib/** hors lib/urls.ts et lib/purgeComptes.ts) ; tout fichier de app/ ou
// lib/ qu'une fiche suivante change sans l'avoir encore committé (29 fichiers de app/controle/station/ le 04/10) la rougissait sans
// rapport avec les verrous. VM-5 garde l'historique des migrations et des contrôles et le chemin d'inscription (ONBOARDING) ;
// lib/urls.ts et lib/purgeComptes.ts restent permis (MODIFIABLES) et jugés sur le fond par VM-7. PREFIXES reste la liste de l'état relevé.
const PERIMETRE_VM5 = ['supabase/migrations/', 'supabase/controles/', ONBOARDING]
const dansPerimetre = (f) => PERIMETRE_VM5.some((p) => f === p || (p.endsWith('/') && f.startsWith(p)))
const estAjout0095 = (f) => /^supabase\/migrations\/(?:0095_[a-z0-9_]+\.sql|_A_COLLER_sql_editor_0095(?:_NU)?\.sql)$/.test(f) || /^supabase\/controles\/0095_[a-z0-9_]+\.sql$/.test(f)
const numeroPosterieur = (f) => { const m = /^supabase\/(?:migrations|controles)\/(?:(\d{4})_[^/]*|_A_COLLER_sql_editor_(\d{4})(?:_NU)?)\.sql$/.exec(f); return !!m && Number(m[1] ?? m[2]) > NUM }
function lireEtat() {
  let e
  try { e = lireJson(ETAT) } catch (x) { throw new Error(`${path.relative(R, ETAT)} illisible : ${premiere(x)}`) }
  if (!/^[0-9a-f]{40}$/.test(e.commit || '')) throw new Error(`${path.relative(R, ETAT)} : commit invalide`)
  if (JSON.stringify(e.prefixes) !== JSON.stringify(PREFIXES)) throw new Error(`${path.relative(R, ETAT)} : préfixes inattendus`)
  if (!e.differents || typeof e.differents !== 'object' || !e.code || typeof e.code !== 'object') throw new Error(`${path.relative(R, ETAT)} : « differents » ou « code » absent`)
  return e
}
function etatReference(etat) {
  const ref = new Map()
  for (const p of PREFIXES) for (const [f, v] of lsTree(R, etat.commit, p)) ref.set(f, { blob: v.sha })
  const commit = new Map(ref)
  for (const [f, s] of Object.entries(etat.differents)) ref.set(f, s === null ? null : { lf: s })
  return { ref, commit }
}
const enLf = (buf) => Buffer.from(buf.toString('latin1').replace(/\r\n/g, '\n'), 'latin1')
const conforme = (buf, attendu) => !!attendu && (attendu.lf ? shaBlob(enLf(buf)) === attendu.lf : (shaBlob(buf) === attendu.blob || shaBlob(enLf(buf)) === attendu.blob))
function lireAvant() {
  const t = lireTexte(AVANT_TXT)
  if (t === null) return null
  const s = new Set()
  for (const l of t.split('\n')) { if (l.length < 4) continue; let p = l.slice(3); if (p.includes(' -> ')) p = p.split(' -> ').pop(); s.add(p.replace(/^"|"$/g, '')) }
  return s
}
function vm5(racine) {
  const echecs = [], faits = []
  const fin = (resume) => ({ ok: echecs.length === 0, echecs, faits, resume })
  const etat = lireEtat()
  const { ref, commit } = etatReference(etat)
  const depot = estRacineGit(racine)
  const candidats = new Set(Object.keys(etat.differents).filter(dansPerimetre))
  if (depot) {
    const d = git(['diff', '--no-renames', '--name-status', '-z', etat.commit, '--', ...PERIMETRE_VM5], { cwd: racine })
    if (d.code !== 0) { echecs.push(`git diff ${etat.commit.slice(0, 7)} en erreur : ${court(d.stderr || d.erreur)}`); return fin('') }
    const champs = d.stdout.split('\0').filter(Boolean)
    for (let k = 0; k + 1 < champs.length; k += 2) candidats.add(champs[k + 1])
    for (const f of git(['ls-files', '--others', '--exclude-standard', '-z', '--', ...PERIMETRE_VM5], { cwd: racine }).stdout.split('\0').filter(Boolean)) candidats.add(f)
  } else {
    for (const f of ref.keys()) if (dansPerimetre(f)) candidats.add(f)
    for (const p of PREFIXES) for (const f of listerFichiers(path.join(racine, p))) if (dansPerimetre(p + f)) candidats.add(p + f)
  }
  const head = new Map()
  for (const p of PREFIXES) for (const [f, v] of lsTree(R, 'HEAD', p)) head.set(f, { blob: v.sha })
  const avant = lireAvant()
  const ecarts = [], ajouts = [], modifies = [], posterieurs = [], exemptes = [], parCommit = []
  for (const f of [...candidats].sort()) {
    const abs = path.join(racine, ...f.split('/'))
    const buf = fs.existsSync(abs) && fs.statSync(abs).isFile() ? fs.readFileSync(abs) : null
    const attendu = ref.has(f) ? ref.get(f) : undefined
    const code = f.startsWith('app/') || f.startsWith('lib/')
    if (buf === null ? !attendu : conforme(buf, attendu)) continue
    if (buf !== null && attendu && MODIFIABLES[f]) {
      if (MODIFIABLES[f] === 'commentaires' && V.empreinteCode(buf.toString('utf8')) !== etat.code[f]) { ecarts.push(`${f} (code changé : seuls ses commentaires peuvent changer)`); continue }
      modifies.push(`${f} (${MODIFIABLES[f]})`); continue
    }
    if (buf !== null && !attendu && estAjout0095(f)) { ajouts.push(f); continue }
    if (buf !== null && !attendu && numeroPosterieur(f)) { posterieurs.push(f); continue }
    if (buf === null ? (commit.has(f) && !head.has(f)) : conforme(buf, head.get(f))) { parCommit.push(f); continue }
    if (avant && avant.has(f) && (code || !attendu)) { exemptes.push(f); continue }
    ecarts.push(`${f} (${buf === null ? 'absent' : attendu ? 'modifié' : 'ajouté'})`)
  }
  // le commentaire faux de 0094:42 est corrigé partout
  for (const nom of [M94, '_A_COLLER_sql_editor_0094.sql', '_A_COLLER_sql_editor_0094_NU.sql']) {
    const t = lireTexte(path.join(migDir(racine), nom))
    if (t !== null && COMMENTAIRE_FAUX.test(t)) echecs.push(`supabase/migrations/${nom} dit encore credits_offerts figée « comme à la mise à jour (0068) » : faux (ni 0068 ni 0093 ne la figent), à corriger`)
  }
  const sup = ecarts.filter((x) => x.startsWith('supabase/')), app = ecarts.filter((x) => !x.startsWith('supabase/'))
  if (sup.length) echecs.push(`${sup.length} fichier(s) de supabase/ changé(s) hors de ce que 025-13 peut toucher : ${sup.slice(0, 5).join(', ')}${sup.length > 5 ? '…' : ''}`)
  if (app.length) echecs.push(`${app.length} fichier(s) du chemin d'inscription changé(s) sans avoir été committé(s) (${ONBOARDING}) : ${app.slice(0, 5).join(', ')}${app.length > 5 ? '…' : ''} — si ce n'est pas vous, écrire .orchestre/en-cours/${FICHE}.question.md, ne rien toucher`)
  if (modifies.length) faits.push(`modifiés, permis : ${modifies.join(', ')}`)
  if (posterieurs.length) faits.push(`ajouts de fiches postérieures (numéro > 0095), tolérés : ${posterieurs.join(', ')}`)
  if (exemptes.length) faits.push(`déjà dans git status à la prise de ${FICHE} (avant.txt), non reproché(s) : ${exemptes.join(', ')}`)
  if (parCommit.length) faits.push(`committé(s) depuis le relevé (identique(s) à HEAD), non reproché(s) : ${parCommit.join(', ')}`)
  faits.push(`état de référence : ${etat.commit.slice(0, 7)} + ${Object.keys(etat.differents).length} fichier(s) relevé(s) le ${String(etat.releve_le).slice(0, 10)} ; ${depot ? 'git diff + non suivis' : 'fichier par fichier'} ; ${candidats.size} chemin(s) examiné(s)${avant ? '' : ' ; avant.txt de la prise absent (juge lancé hors orchestre)'}`)
  return fin(`${ref.size} fichiers de référence sous ${PREFIXES.join(', ')} ; ajouts : ${ajouts.join(', ') || 'aucun'} ; 0094 changée dans ses commentaires seulement, commentaire de 0094:42 corrigé ; aucune autre migration touchée ; le chemin d'inscription ${ONBOARDING} intact ; ${URLS} et ${PURGE} permis (jugés par VM-7) ; le reste de app/ et lib/ n'est plus de son ressort (04/10)`)
}

// ── VM-6 : l'email du compte connecté, imposé à l'inscription (25/09) ────────────────────────────────────────────────────────
/** Toutes les affectations à `cible` d'une liste d'instructions analysée, à toute profondeur → [{ st, liste }] */
function affectationsA(liste, cible, acc = []) {
  for (const s of liste) {
    if (s.type === 'affectation' && s.cible === cible) acc.push({ st: s, liste })
    if (s.type === 'si') for (const b of s.branches) affectationsA(b.corps, cible, acc)
  }
  return acc
}
/** La fonction d'insertion de la 0095 de la racine, analysée → { nom, a (arbre), branche } ; lève avec un message clair. */
function insertion0095(racine) {
  const f = la0095(racine)
  if (f.echec) throw new Error(f.echec)
  const ins = structure0095(f.texte, lireMigrations(racine)).definitions[INS]
  if (!ins) throw new Error(`${f.nom} ne redéfinit pas ${INS}`)
  const d = V.analyserDefinition(ins)
  if (d.corps === null) throw new Error(`${INS} : corps illisible`)
  const a = V.analyserPlpgsql(d.corps)
  const b = V.blocServeur(a)
  if (!b) throw new Error(`${INS} : bloc « if current_user not in ('service_role', 'postgres') then » introuvable au premier niveau`)
  return { nom: f.nom, a, branche: b.branches[0].corps }
}
function vm6(racine, r2) {
  const echecs = [], faits = []
  const fin = (resume) => ({ ok: echecs.length === 0, echecs, faits, resume })
  let x
  try { x = insertion0095(racine) } catch (e) { echecs.push(premiere(e)); return fin('') }
  const toutes = affectationsA(x.a.instructions, 'new.email')
  const ici = toutes.filter((y) => y.liste === x.branche)
  if (!toutes.length) {
    echecs.push(`${INS} ne touche pas new.email : à l'inscription, le navigateur choisit l'adresse de sa ligne (${ONBOARDING} l'envoie ; artisan_insert_own ne contrôle que auth.uid() = id) — un compte neuf peut prendre l'email d'un autre (malus email_jetable contourné, deux lignes pour une adresse : /api/auth/reset-request en erreur, notifications chez la victime). Attendu avec les colonnes forcées, avant les refus : « ${EMAIL_INS} »`)
    return fin('')
  }
  if (toutes.length !== 1 || ici.length !== 1) { echecs.push(`${toutes.length} affectation(s) à new.email dans ${INS}, dont ${ici.length} à la profondeur 1 de la branche du navigateur : une seule, là, attendue`); return fin('') }
  const s = ici[0].st
  const k = x.branche.indexOf(s), premierSi = x.branche.findIndex((y) => y.type === 'si')
  if (premierSi >= 0 && k > premierSi) echecs.push(`« new.email := … » placée après le premier if de la branche (« if ${court(V.texteJetons(x.branche[premierSi].branches[0].cond), 50)} ») : avec les colonnes forcées, avant les refus, attendue`)
  let e
  try { e = V.analyserExpression(s.expr) } catch (err) { echecs.push(`expression de new.email non simulée : ${premiere(err)}`); return fin('') }
  const T = 'titulaire@presti-test.invalid', VICTIME = 'victime@presti-test.invalid'
  const val = (jwt, envoye) => { try { return { v: V.evaluer(e, { role: 'authenticated', uid: NOUVEAU, jwt, nouvelle: { ...nouvelle(NOUVEAU, 'essai-ab12'), email: envoye }, lignes: [], fonctions: new Map() }) } } catch (err) { return { erreur: premiere(err) } } }
  const cas = [['email envoyé = celui d\'un autre', VICTIME], ['email envoyé nul', null], ['email envoyé = le sien', T], ['email envoyé = le sien en majuscules', T.toUpperCase()]]
  const ecarts = []
  for (const [quoi, envoye] of cas) {
    const r = val({ email: T }, envoye)
    if (r.erreur) ecarts.push(`${quoi} : non simulé (${r.erreur})`)
    else if (r.v !== T) ecarts.push(`${quoi} (jeton ${T}) : la ligne porterait « ${r.v} », « ${T} » attendu`)
  }
  if (ecarts.length) echecs.push(`l'email imposé à l'inscription n'est pas celui du jeton : ${ecarts.join(' ; ')}`)
  const sansEmail = val({}, VICTIME), sansJeton = val(undefined, VICTIME)
  const dire = (r) => (r.erreur ? 'non simulé' : r.v === null ? 'nul' : `« ${r.v} »`)
  faits.push(`forme : « new.email := ${V.texteJetons(s.expr)} » (la fiche : « ${EMAIL_INS} ») ; ${cas.length} cas évalués avec le jeton ${T} ; notés : jeton sans email → ${dire(sansEmail)}, sans jeton → ${dire(sansJeton)} (en production : 0 compte sans email, 0 anonyme au 25/09)`)
  if (r2?.jouer) {
    const sv = r2.jouer('service_role', NOUVEAU, 'serveur-demo-x1y2')
    if (!sv.erreur && sv.forcees?.has('email')) echecs.push('le serveur (service_role) voit son email forcé : l\'administration et la purge ne pourraient plus l\'écrire')
    faits.push(`service_role : ${sv.erreur ? `non simulé (${sv.erreur})` : sv.forcees?.has('email') ? 'email forcé' : 'email libre (hors de la branche)'}`)
  } else faits.push('service_role non simulé (VM-2 sans simulation)')
  const ob = lireTexte(path.join(racine, ...ONBOARDING.split('/')))
  if (ob !== null) faits.push(`${ONBOARDING} : ${/setEmail\(\s*data\.session\.user\.email\b/.test(ob) ? 'envoie l\'adresse de la session' : 'adresse envoyée non reconnue'} ; la base impose celle du jeton de toute façon`)
  return fin(`${x.nom} : ${INS} impose « new.email := ${V.texteJetons(s.expr)} » à la profondeur 1 de la branche du navigateur, avant les refus ; évaluée par l'interprète : le jeton gagne sur l'adresse envoyée (${cas.length} cas) ; le serveur reste libre`)
}

// ── VM-7 : le préfixe de la purge réservé, en base et dans l'application (25/09) ─────────────────────────────────────────────
const PREFIXE_EXPORTE = /export\s+const\s+PREFIXE_ADRESSE_PURGEE\s*(?::\s*string\s*)?=\s*(['"])([^'"\\]*)\1/
/** Le texte entre l'accolade qui suit `debut` et celle qui la ferme (chaînes, gabarits et commentaires sautés), ou null. */
function blocApres(t, debut) {
  const k = t.indexOf('{', debut)
  if (k < 0) return null
  let prof = 1, i = k + 1, q = null
  for (; i < t.length && prof > 0; i++) {
    const c = t[i]
    if (q) { if (c === '\\') { i++; continue } if (c === q) q = null; continue }
    if (c === '/' && t[i + 1] === '/') { const n = t.indexOf('\n', i); i = n < 0 ? t.length : n; continue }
    if (c === '/' && t[i + 1] === '*') { const n = t.indexOf('*/', i + 2); i = n < 0 ? t.length : n + 1; continue }
    if (c === "'" || c === '"' || c === '`') { q = c; continue }
    if (c === '{') prof++; else if (c === '}') prof--
  }
  return prof === 0 ? t.slice(k + 1, i - 1) : null
}
async function problemeSlugDe(racine, texte) {
  if (/^\s*import\s/m.test(texte)) throw new Error(`${URLS} importe un module : le juge ne peut plus l'évaluer seul`)
  const ts = createRequire(path.join(R, 'package.json'))('typescript')
  const js = ts.transpileModule(texte, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  const f = path.join(dossierTravail(JUGE, 'urls'), 'urls.mjs')
  fs.writeFileSync(f, js, 'utf8')
  const mod = await import(`${pathToFileURL(f).href}?${Date.now()}`)
  if (typeof mod.problemeSlug !== 'function') throw new Error(`${URLS} n'exporte plus problemeSlug`)
  return mod.problemeSlug
}
async function vm7(racine, r2) {
  const echecs = [], faits = []
  const fin = (resume) => ({ ok: echecs.length === 0, echecs, faits, resume })
  const urls = lireTexte(path.join(racine, ...URLS.split('/'))), purge = lireTexte(path.join(racine, ...PURGE.split('/')))
  if (urls === null || purge === null) { echecs.push(`${urls === null ? URLS : PURGE} absent de la racine`); return fin('') }
  // le préfixe : une source, lib/urls.ts
  let prefixe = PREFIXE_EXPORTE.exec(urls)?.[2] ?? null
  if (prefixe === null) {
    echecs.push(`${URLS} n'exporte pas PREFIXE_ADRESSE_PURGEE (littéral) : la validation des adresses ignore le début d'adresse que la purge pose`)
    prefixe = PREFIXE_EXPORTE.exec(purge)?.[2] ?? /slug:\s*`([a-z0-9-]+)\$\{/.exec(purge)?.[1] ?? null
    if (prefixe === null) { echecs.push(`préfixe de la purge introuvable (ni ${URLS}, ni ${PURGE})`); return fin('') }
    faits.push(`préfixe lu dans ${PURGE}, faute de ${URLS} : « ${prefixe} »`)
  }
  if (!/^[a-z0-9]+-$/.test(prefixe)) echecs.push(`PREFIXE_ADRESSE_PURGEE « ${prefixe} » : des minuscules ou chiffres puis un tiret attendus`)
  // la purge l'importe de là et bâtit le slug avec lui
  const imp = /import\s*\{([^}]*)\}\s*from\s*['"]@\/lib\/urls['"]/.exec(purge)
  if (!imp || !/\bPREFIXE_ADRESSE_PURGEE\b/.test(imp[1])) echecs.push(`${PURGE} n'importe pas PREFIXE_ADRESSE_PURGEE de @/lib/urls : deux sources pour un même préfixe`)
  if (/\bconst\s+PREFIXE_ADRESSE_PURGEE\b/.test(purge)) echecs.push(`${PURGE} définit encore sa propre PREFIXE_ADRESSE_PURGEE`)
  if (!/\bslug:\s*`\$\{\s*PREFIXE_ADRESSE_PURGEE\s*\}\$\{\s*id\.slice\(\s*0\s*,\s*8\s*\)\s*\}`/.test(purge)) echecs.push(`${PURGE} : le slug anonymisé n'est plus \`\${PREFIXE_ADRESSE_PURGEE}\${id.slice(0, 8)}\``)
  // la purge ne reste plus muette sur un échec
  const k = purge.search(/\bif\s*\(\s*echec\s*\)/)
  const bloc = k < 0 ? null : blocApres(purge, k)
  if (bloc === null) echecs.push(`${PURGE} : bloc « if (echec) { … } » introuvable dans purgerComptes`)
  else if (!/\bnotifierEntreprise\s*\(/.test(bloc.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ''))) echecs.push(`${PURGE} : un échec de la purge ne va qu'à la console (bloc « if (echec) { … } » sans notifierEntreprise) — une suppression RGPD peut échouer sans que personne le sache`)
  else faits.push(`${PURGE} : « if (echec) { … } » appelle notifierEntreprise`)
  // problemeSlug, exécutée
  const UID8 = '6c296d27'
  const refusesTs = [`${prefixe}abcd1234`, `${prefixe}${UID8}`, `${prefixe}plomberie-ab12`]
  const acceptesTs = [`plomberie-${prefixe}ab12`, `${prefixe.slice(0, -1)}r-ab12`, 'dupont-plomberie-k2x9']
  try {
    const ps = await problemeSlugDe(racine, urls)
    const faux = [...refusesTs.filter((x) => ps(x) === null).map((x) => `« ${x} » accepté`), ...acceptesTs.filter((x) => ps(x) !== null).map((x) => `« ${x} » refusé (${ps(x)})`)]
    if (ps('admin') === null) faux.push('« admin » accepté (mots réservés perdus)')
    if (faux.length) echecs.push(`problemeSlug (${URLS}) : ${faux.join(' ; ')} — /api/account/slug laisserait un artisan prendre l'adresse d'un compte anonymisé`)
    else faits.push(`problemeSlug : ${refusesTs.length} adresses « ${prefixe}… » refusées, ${acceptesTs.length} voisines acceptées`)
  } catch (e) { echecs.push(`problemeSlug non exécutable : ${premiere(e)}`) }
  const rs = lireTexte(path.join(racine, ...ROUTE_SLUG.split('/')))
  if (rs === null || !/\bproblemeSlug\s*\(/.test(rs)) echecs.push(`${ROUTE_SLUG} ne passe plus par problemeSlug : le changement d'adresse ne refuserait plus le préfixe`)
  // la base : la fonction d'insertion de 0095, exécutée par l'interprète (simulation de VM-2)
  if (!r2?.jouer) echecs.push('simulation de la fonction d\'insertion indisponible (VM-2 n\'a pas pu la préparer) : le refus en base n\'est pas jugé')
  else {
    const refReserve = r2.jouer('authenticated', NOUVEAU, 'www')
    const attendu = refReserve.refus ? { code: refReserve.refus.code, message: refReserve.refus.message } : { code: '23514', message: null }
    const cas = [
      [`${prefixe}abcd1234`, 'authenticated', true], [`${prefixe.toUpperCase()}ABCD1234`, 'authenticated', true], [`${prefixe}${AUTRE.id.slice(0, 8)}`, 'authenticated', true],
      [`${prefixe}plomberie-ab12`, 'authenticated', true], [`plomberie-${prefixe}ab12`, 'authenticated', false], [`${prefixe.slice(0, -1)}r-ab12`, 'authenticated', false],
      [`${prefixe}abcd1234`, 'service_role', false],
    ]
    const faux = []
    for (const [s, role, refuse] of cas) {
      const r = r2.jouer(role, NOUVEAU, s)
      if (r.erreur) { faux.push(`${role} « ${s} » : non simulé (${r.erreur})`); continue }
      if (refuse && !r.refus) faux.push(`${role} « ${s} » : accepté`)
      else if (!refuse && r.refus) faux.push(`${role} « ${s} » : refusé (« ${court(r.refus.message, 50)} »)`)
      else if (refuse && (r.refus.code !== attendu.code || (attendu.message !== null && r.refus.message !== attendu.message))) faux.push(`${role} « ${s} » : refusé avec ${r.refus.code} « ${court(r.refus.message, 50)} », ${attendu.code} « ${court(attendu.message, 50)} » (celui des mots réservés) attendu`)
    }
    if (faux.length) echecs.push(`${INS} (0095) : ${faux.join(' ; ')} — un compte neuf pourrait occuper « ${prefixe}<8 caractères de l'uid> » et faire échouer l'anonymisation de ce compte`)
    else faits.push(`base : ${cas.filter((c) => c[2]).length} inscriptions « ${prefixe}… » refusées au navigateur (${attendu.code}, message des mots réservés), 2 voisines acceptées, le serveur libre`)
    const nom = r2.slugMod ? `${r2.slugMod.slugBase('Supprimé Plomberie')}-ab12` : null
    if (nom) { const r = r2.jouer('authenticated', NOUVEAU, nom); faits.push(`noté : un nom saisi « Supprimé Plomberie » donne « ${nom} » → ${r.erreur ? 'non simulé' : r.refus ? 'refusé à l\'inscription (le suffixe tiré n\'y change rien : changer le nom saisi)' : 'accepté'}`) }
  }
  return fin(`préfixe « ${prefixe} » : une source (${URLS}), la purge l'importe et prévient l'entreprise sur échec ; refusé par problemeSlug (donc /api/account/slug) et, à l'inscription, par ${INS} avec le code et le message des mots réservés ; le serveur reste libre`)
}

// ── Témoin et mutations ──────────────────────────────────────────────────────────────────────────────────────────────────────
function retirerCopiesDuCode(dossier) {
  const d = exigerSousTravail(dossier)
  if (!sous(path.join(TRAVAIL, JUGE), d)) throw new Error(`${d} n'est pas un arbre de ${JUGE}`)
  for (const p of ['app', 'lib']) fs.rmSync(path.join(d, p), { recursive: true, force: true })
}
/** L'arbre témoin : l'état relevé (depuis la racine si elle lui est conforme, sinon depuis les blobs du commit), puis le témoin superposé. */
function preparerTemoinMaj(base, dest = dossierTravail(JUGE, 'temoin')) {
  const etat = lireEtat()
  const { ref } = etatReference(etat)
  const divergents = []
  for (const [f, v] of ref) {
    if (v === null) continue
    const src = path.join(base, ...f.split('/')), out = path.join(dest, ...f.split('/'))
    fs.mkdirSync(path.dirname(out), { recursive: true })
    const buf = fs.existsSync(src) ? fs.readFileSync(src) : null
    if (buf !== null && conforme(buf, v)) { fs.writeFileSync(out, buf); continue }
    if (v.blob) { const b = blobGit(R, etat.commit, f); if (b) { fs.writeFileSync(out, b); continue } }
    if (buf !== null) { fs.writeFileSync(out, buf); divergents.push(f) } else divergents.push(`${f} (absent)`)
  }
  for (const rel of ['scripts/sql-nu.mjs', 'scripts/migrations-jumelles-e2e.mjs']) { fs.mkdirSync(path.join(dest, 'scripts'), { recursive: true }); fs.copyFileSync(path.join(base, ...rel.split('/')), path.join(dest, ...rel.split('/'))) }
  const superposer = path.join(FIXTURES, 'temoins', JUGE)
  if (!fs.existsSync(path.join(superposer, 'supabase', 'migrations'))) throw new Error(`témoin absent : ${path.relative(R, superposer)}`)
  fs.cpSync(superposer, dest, { recursive: true, force: true })
  // 25/09 : les fichiers de app/ et lib/ du témoin portent « .temoin » (tsc lit tous les .ts du dépôt, fixtures comprises)
  for (const rel of listerFichiers(superposer)) {
    if (!rel.endsWith('.temoin')) continue
    const src = path.join(dest, ...rel.split('/')), cible = path.join(dest, ...rel.slice(0, -'.temoin'.length).split('/'))
    fs.rmSync(cible, { force: true })
    fs.renameSync(src, cible)
  }
  return { dest, divergents }
}
const TEXTE = (dossier, rel) => fs.readFileSync(path.join(dossier, ...rel.split('/')), 'utf8')
function refabriquer(dossier, migration, jumeau, nu, controle) {
  const rel = (f) => `supabase/migrations/${f}`
  fs.writeFileSync(path.join(dossier, ...rel(jumeau).split('/')), TEXTE(dossier, rel(migration)), 'utf8')
  const g = lancer(process.execPath, ['scripts/sql-nu.mjs', rel(migration), rel(nu), '--controle', `supabase/controles/${controle}`], { cwd: dossier, timeout: 60_000 })
  if (g.code !== 0) throw new Error(`sql-nu.mjs a refusé le jumeau nu muté : ${court(g.sortie, 120)}`)
}
const BRANCHE_SQL = String.raw`if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*`
const remplacer = (t, a, b, quoi) => { if (!t.includes(a)) throw new Error(`mutation sans prise : ${quoi}`); return t.split(a).join(b) }
const corpsDe = (t, fn) => { const d = t.indexOf(`create or replace function public.${fn}()`); const a = t.indexOf('$$', d); return { a: a + 2, b: t.indexOf('$$', a + 2) } }
const MUTATIONS = [
  { id: 'MUT-OUBLI', attendu: 'VM-1', quoi: 'colonne oubliée : « new.credits_offerts := old.credits_offerts; » retirée de la mise à jour', fichier: 'migration',
    muter: (t) => remplacer(t, '    new.credits_offerts := old.credits_offerts;\n', '', 'credits_offerts') },
  { id: 'MUT-APRES', attendu: 'VM-1', quoi: 'affectation après le end if : « new.created_at := old.created_at; » déplacée hors du bloc current_user (le serveur ne pourrait plus l\'écrire)', fichier: 'migration',
    muter: (t) => { const { a, b } = corpsDe(t, MAJ); return t.slice(0, a) + V.muterAffectation(t.slice(a, b), 'created_at', 'apres') + t.slice(b) } },
  { id: 'MUT-RESERVE', attendu: 'VM-2', quoi: 'slug réservé accepté : « admin » ôté de la liste de l\'inscription', fichier: 'migration',
    muter: (t) => remplacer(t, "'admin', ", '', "'admin'") },
  { id: 'MUT-ANCIEN', attendu: 'VM-2', quoi: 'ancien slug d\'autrui accepté : la fonction d\'appoint en security invoker (la RLS ne montre au navigateur que sa ligne)', fichier: 'migration',
    muter: (t) => remplacer(t, 'security definer', 'security invoker', 'security definer') },
  { id: 'MUT-AVEUGLE', attendu: 'VM-3', quoi: 'contrôle aveugle : les lignes de 0095 cherchent « (^|\\n)\\s*new.… » n\'importe où', fichier: 'controle',
    muter: (t) => remplacer(t, BRANCHE_SQL, String.raw`(^|\n)\s*`, 'motif de branche') },
  { id: 'MUT-DECLENCHEUR', attendu: 'VM-3', quoi: 'déclencheur aveugle : « tgname = \'trg_lock_artisan_upd\' … tgenabled <> \'D\' » (ni tgfoid, ni BEFORE, ni FOR EACH ROW, R accepté)', fichier: 'controle',
    muter: (t) => { const re = /exists \(select 1 from pg_trigger t\s+where t\.tgname = 'trg_lock_artisan_upd'[\s\S]*?t\.tgenabled = 'O'\)/; if (!re.test(t)) throw new Error('mutation sans prise : ligne du déclencheur'); return t.replace(re, "exists (select 1 from pg_trigger where tgname = 'trg_lock_artisan_upd' and tgrelid = 'public.artisans'::regclass and tgenabled <> 'D')") } },
  // 25/09 (relecture adverse) : l'email imposé à l'inscription, le préfixe de la purge
  { id: 'MUT-EMAIL', attendu: 'VM-6', quoi: `email libre à l'inscription : « ${EMAIL_INS} » retirée de 0095`, fichier: 'migration',
    muter: (t) => remplacer(t, `    ${EMAIL_INS}\n`, '', 'email imposé') },
  { id: 'MUT-EMAIL-ORDRE', attendu: 'VM-6', quoi: 'l\'email envoyé gagne : « new.email := coalesce(new.email, auth.email()); »', fichier: 'migration',
    muter: (t) => remplacer(t, EMAIL_INS, 'new.email := coalesce(new.email, auth.email());', 'email imposé') },
  { id: 'MUT-PREFIXE', attendu: 'VM-7', quoi: 'préfixe de la purge accepté en base : le refus « lower(new.slug) like \'supprime-%\' » retiré de 0095', fichier: 'migration',
    muter: (t) => { const re = /\n[ \t]*if lower\(new\.slug\) like 'supprime-%' then\n[^\n]*\n[ \t]*end if;/; if (!re.test(t)) throw new Error('mutation sans prise : refus du préfixe'); return t.replace(re, '') } },
  { id: 'MUT-PREFIXE-TS', attendu: 'VM-7', quoi: 'préfixe accepté par problemeSlug : « if (s.startsWith(PREFIXE_ADRESSE_PURGEE)) … » retirée de lib/urls.ts', fichier: URLS,
    muter: (t) => { const re = /\n[ \t]*if \(s\.startsWith\(PREFIXE_ADRESSE_PURGEE\)\)[^\n]*/; if (!re.test(t)) throw new Error('mutation sans prise : refus du préfixe dans problemeSlug'); return t.replace(re, '') } },
  { id: 'MUT-PURGE-MUETTE', attendu: 'VM-7', quoi: 'purge muette : notifierEntreprise retiré du bloc « if (echec) { … } » de lib/purgeComptes.ts', fichier: PURGE,
    muter: (t) => { const re = /(if \(echec\) \{\n[^\n]*console\.error[^\n]*\n)[\s\S]*?([ \t]*continue\n)/; if (!re.test(t)) throw new Error('mutation sans prise : bloc if (echec)'); return t.replace(re, '$1$2') } },
]
/** Ajoute des lignes à un fichier du témoin ; refuse (mutation sans prise) un fichier absent de la copie. */
function ajouterEn(dossier, rel, texte) {
  const f = path.join(dossier, ...rel.split('/'))
  if (!fs.existsSync(f)) throw new Error(`mutation sans prise : ${rel} absent du témoin`)
  fs.appendFileSync(f, texte, 'utf8')
}
// 04/10 : le périmètre de VM-5 (voir PERIMETRE_VM5). Deux sabotages restent rouges en VM-5 et en VM-5 seul ; le travail d'une autre
// fiche (un fichier de app/ ajouté, un de app/ et un de lib/ retouchés, hors du chemin d'inscription) ne la rougit plus.
const MUTATIONS_VM5 = [
  { id: 'MUT-ANCIENNE', quoi: 'une migration existante retouchée (0008_secure_rpc.sql, une ligne de commentaire en pied)',
    poser: (d) => ajouterEn(d, 'supabase/migrations/0008_secure_rpc.sql', '\n-- retouche de sabotage\n') },
  { id: 'MUT-INSCRIPTION', quoi: `le chemin d'inscription retouché (${ONBOARDING}, une ligne de commentaire en pied)`,
    poser: (d) => ajouterEn(d, ONBOARDING, '\n// retouche de sabotage\n') },
  { id: 'MUT-AUTRE-FICHE', vert: true, quoi: "le travail d'une autre fiche (app/zz-autre-fiche/page.tsx ajouté, app/api/stripe/webhook/route.ts et lib/stripeAiguillage.ts retouchés)",
    poser: (d) => {
      ajouterEn(d, 'app/api/stripe/webhook/route.ts', "\n// travail d'une autre fiche\n")
      ajouterEn(d, 'lib/stripeAiguillage.ts', "\n// travail d'une autre fiche\n")
      fs.mkdirSync(path.join(d, 'app', 'zz-autre-fiche'), { recursive: true })
      fs.writeFileSync(path.join(d, 'app', 'zz-autre-fiche', 'page.tsx'), 'export default function Page() { return null }\n', 'utf8')
    } },
]
async function mutations(s) {
  const { dest } = preparerTemoinMaj(R)
  const arbres = [dest]
  try {
    const lancerJuge = (racine) => lancer(process.execPath, [path.join(R, 'scripts', `${JUGE}.mjs`), `--racine=${racine}`], { cwd: R, timeout: 15 * 60_000 })
    const t = lancerJuge(dest)
    const at = analyserSortie(t.sortie)
    s.verdict('MUT-T', t.code === 0 && at.verdict === 'PASS' && at.lignes.length === 7 && at.lignes.every((l) => l.verdict === 'PASS'),
      `témoin ${path.relative(R, dest)} : code 0, ${at.lignes.length} critères PASS`,
      `témoin : code ${t.code}, rouges ${at.rouges.join(', ') || '—'} — ${court(t.sortie.split('\n').filter((l) => l.startsWith('FAIL')).join(' | '), 300)}`)
    const nom = fs.readdirSync(path.join(dest, 'supabase', 'migrations')).find((f) => NOM_0095.test(f))
    for (const m of MUTATIONS) {
      try {
        const dossier = dossierTravail(JUGE, 'mutations', m.id.toLowerCase())
        arbres.push(dossier)
        fs.cpSync(dest, dossier, { recursive: true })
        const rel = m.fichier === 'migration' ? `supabase/migrations/${nom}` : m.fichier === 'controle' ? `supabase/controles/${nom}` : m.fichier
        const avant = TEXTE(dossier, rel).replace(/\r\n/g, '\n')
        const apres = m.muter(avant)
        if (apres === avant) throw new Error('mutation sans effet')
        fs.writeFileSync(path.join(dossier, ...rel.split('/')), apres, 'utf8')
        refabriquer(dossier, nom, JUMEAU, JUMEAU_NU, nom)
        const r = lancerJuge(dossier)
        const a = analyserSortie(r.sortie)
        const detail = a.lignes.find((l) => l.id === m.attendu)?.detail || ''
        const casse = /^(?:interrompu|non évalué)/.test(detail)
        s.verdict(m.id, r.code === 1 && a.verdict === 'FAIL' && a.rouges.includes(m.attendu) && !casse,
          `${m.quoi} → rouge (${a.rouges.join(', ')}) ; ${m.attendu} : ${court(detail, 200)}`,
          `${m.quoi} → code ${r.code}, rouges ${a.rouges.join(', ') || 'aucun'} (${m.attendu} rouge attendu${casse ? ', et pas interrompu' : ''}) — ${court(detail, 150)}`)
      } catch (e) { s.echoue(m.id, `interrompu : ${premiere(e)}`) }
    }
    for (const m of MUTATIONS_VM5) {
      try {
        const dossier = dossierTravail(JUGE, 'mutations', m.id.toLowerCase())
        arbres.push(dossier)
        fs.cpSync(dest, dossier, { recursive: true })
        m.poser(dossier)
        const r = lancerJuge(dossier)
        const a = analyserSortie(r.sortie)
        const detail = a.lignes.find((l) => l.id === 'VM-5')?.detail || ''
        const casse = /^(?:interrompu|non évalué)/.test(detail)
        const ok = m.vert
          ? r.code === 0 && a.verdict === 'PASS' && a.lignes.length === 7 && a.lignes.every((l) => l.verdict === 'PASS')
          : r.code === 1 && a.verdict === 'FAIL' && a.rouges.length === 1 && a.rouges[0] === 'VM-5' && !casse
        s.verdict(m.id, ok,
          `${m.quoi} → ${m.vert ? 'VM-5 vert, sept critères PASS' : `VM-5 seul rouge : ${court(detail, 170)}`}`,
          `${m.quoi} → code ${r.code}, rouges ${a.rouges.join(', ') || 'aucun'} (${m.vert ? 'vert attendu' : 'VM-5 seul rouge attendu'}) — ${court(detail, 200)}`)
      } catch (e) { s.echoue(m.id, `interrompu : ${premiere(e)}`) }
    }
  } finally { for (const a of arbres) retirerCopiesDuCode(a) }
}

// ── Le juge ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function evaluer(s, id, f) {
  try {
    const r = await f()
    s.resultat(id, { ok: r.ok && r.echecs.length === 0, echecs: r.echecs, resume: r.resume })
    for (const x of r.faits || []) s.note(`${id} : ${x}`)
    return r
  } catch (e) { s.echoue(id, `interrompu : ${premiere(e)}`); return null }
}

const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['mutations'] })
if (o.reel) { console.error('✗ --reel : ce juge n\'a pas d\'essai réel ; la preuve sur la base est l\'essai à sec de la fiche 025-13 (DO … raise exception), puis les contrôles après collage'); process.exit(2) }
if (o.valeur('mutations') !== undefined) { console.error('✗ --mutations ne prend pas de valeur'); process.exit(2) }
const avecMutations = o.drapeau('mutations')
if (avecMutations && (o.temoin || !o.racineParDefaut)) { console.error('✗ --mutations se lance seul, sur la racine du dépôt (ni --temoin, ni --racine=…)'); process.exit(2) }
if (o.positionnels.length) { console.error(`✗ argument(s) inattendu(s) : ${o.positionnels.join(' ')}`); process.exit(2) }

let racine = o.racine, erreurTemoin = null, divergents = []
if (o.temoin) { try { const t = preparerTemoinMaj(o.racine); racine = t.dest; divergents = t.divergents } catch (e) { erreurTemoin = e } }
const ids = avecMutations ? ['MUT-T', ...MUTATIONS.map((m) => m.id), ...MUTATIONS_VM5.map((m) => m.id)] : ['VM-1', 'VM-2', 'VM-3', 'VM-4', 'VM-5', 'VM-6', 'VM-7']
const s = creerSortie(JUGE, ids, { racine, temoin: o.temoin })
await s.executer(async (s) => {
  if (avecMutations) { await mutations(s); return }
  if (erreurTemoin) throw erreurTemoin
  if (o.temoin) s.note(`témoin : état relevé (scripts/fixtures/025/etat-verrou-maj.json) rebâti depuis ${o.racine}${divergents.length ? ` — ${divergents.length} fichier(s) ont bougé depuis le relevé sans blob pour les rebâtir : ${divergents.slice(0, 3).join(', ')}` : ''}, puis scripts/fixtures/025/temoins/${JUGE}/ superposé`)
  const r1 = await evaluer(s, 'VM-1', () => vm1(racine))
  const r2 = await evaluer(s, 'VM-2', () => vm2(racine, r1))
  await evaluer(s, 'VM-3', () => vm3(racine, r1, r2))
  await evaluer(s, 'VM-4', () => vm4(racine))
  await evaluer(s, 'VM-5', () => vm5(racine))
  await evaluer(s, 'VM-6', () => vm6(racine, r2))
  await evaluer(s, 'VM-7', () => vm7(racine, r2))
})
if (o.temoin && !erreurTemoin) retirerCopiesDuCode(racine)
