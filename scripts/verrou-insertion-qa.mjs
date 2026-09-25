// scripts/verrou-insertion-qa.mjs — le juge de la fiche 025-12 (migration 0094 : un compte neuf ne naît plus avec des
// privilèges), écrit par Claude Code AVANT la production. Lecture statique : aucune base n'est touchée.
//
// La faille (prouvée le 24/09, étape H de .orchestre/preuves/025-04/essai-a-sec.md) : la ligne `artisans` d'un compte neuf est
// insérée par le NAVIGATEUR (app/onboarding/page.tsx:60-66, upsert sous la politique artisan_insert_own de 0001_artisans.sql:22-23,
// qui ne vérifie que auth.uid() = id). Le déclencheur d'insertion lock_artisan_privileges_ins (dernière définition :
// 0008_secure_rpc.sql:44-58) ne force que huit colonnes ; un compte neuf peut donc naître avec son site en ligne, un domaine
// vérifié, le rôle « partenaire », est_demo, 5 000 crédits offerts… L'essai à sec du témoin (24/09, voir la fiche) l'a mesuré
// sur les 25 colonnes : avant 0094, les 17 nouvelles passent telles quelles ; après, elles sont remises à leur défaut.
//
// Ce qui est jugé (dans <racine>, la racine du dépôt par défaut) :
//   VI-1  supabase/migrations/0094_insertion_figee.sql redéfinit public.lock_artisan_privileges_ins() en gardant TOUT ce que fait
//         la version en vigueur :
//           - la définition précédente est la dernière des migrations 00NN_*.sql antérieures à 0094, et c'est bien
//             0008_secure_rpc.sql, lignes 44 à 58 ; aucune migration entre 0008 et 0094 ne nomme la fonction ; une migration
//             POSTÉRIEURE à 0094 (depuis le 24/09, fiche 025-13 : 0095) ne peut que la redéfinir en gardant 0094 entière (en-tête,
//             toutes ses lignes, ses affectations dans la branche then) — tout autre usage du nom reste rouge ; le
//             déclencheur trg_lock_artisan_ins est créé par 0005 (before insert on public.artisans … lock_artisan_privileges_ins())
//             et aucune autre migration ne le nomme (ni ne le supprime) ;
//           - 0094 ne porte qu'une instruction SQL (commentaires ôtés), le create or replace function, qui se parse ; en-tête
//             identique à celui de 0008 (espaces près) ; après le corps, « ; » seul ;
//           - le corps, ligne de code par ligne de code (commentaires ôtés, espaces réduits, $tag$ ramené à $$), contient toutes
//             les lignes de 0008 dans l'ordre (plus longue sous-suite commune) ; chaque ligne en plus est une affectation
//             « new.<colonne> := <valeur>; » placée dans la branche « then » du bloc if current_user not in ('service_role',
//             'postgres'), à sa profondeur 1 (ni après le end if, ni dans un else, ni dans un if imbriqué) ; rien d'autre.
//   VI-2  chaque colonne privilégiée de l'INVENTAIRE ci-dessous (8 déjà forcées par 0008, 17 nouvelles) est affectée exactement une
//         fois, dans cette branche, à sa valeur par défaut (formes admises : acceptes()). L'inventaire lui-même est vérifié :
//           - complet : ses 76 colonnes sont exactement celles que les migrations antérieures à 0094 créent (create table de 0001,
//             « add column » des alter table artisans, moins les « drop column ») — une colonne ajoutée sans être classée fait
//             échouer le juge ;
//           - fidèle : le défaut noté pour chaque colonne est celui de sa migration, et aucune migration ne le change (alter
//             column … set/drop default). Relu aussi sur la vraie base le 24/09 (information_schema.columns : 76 colonnes, mêmes
//             défauts ; has_column_privilege : INSERT et UPDATE ouverts à authenticated sur les 76).
//   VI-3  l'inscription normale n'est PAS écrasée :
//           - aucune affectation (à aucune profondeur) aux colonnes « inscription » (les neuf de app/onboarding/page.tsx:62-66) ni
//             aux colonnes « libre » (que le navigateur réécrit légitimement ensuite) ; aucune colonne inconnue ;
//           - aucune affectation de la ligne entière (new := …, select … into new), ni return null, ni raise ; le corps finit par
//             « return new; » puis « end » ;
//           - l'appel de app/onboarding/page.tsx (lu dans la racine) n'envoie que des colonnes « inscription » ou « libre » : s'il
//             se mettait à envoyer une colonne privilégiée, l'inscription serait écrasée en silence.
//   VI-4  les jumeaux et le contrôle :
//           - _A_COLLER_sql_editor_0094.sql et _A_COLLER_sql_editor_0094_NU.sql existent, se parsent, portent le même SQL utile que
//             0094 (découpage du juge ET node <racine>/scripts/sql-nu.mjs --verifier) ; le nu sort de sql-nu.mjs (bande de 28
//             tirets) et finit, après l'unique marque de contrôle, par exactement supabase/controles/0094_insertion_figee.sql ;
//           - node scripts/migrations-jumelles-e2e.mjs, lancé dans la racine, est vert et a vérifié les deux jumeaux de 0094 ;
//           - le contrôle est en lecture seule (select / with, aucun mot d'écriture), lit
//             pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure), et dit « oui » par colonne : simulé contre
//             ce que pg_get_functiondef rendrait (corps de 0094, en LF et en CRLF — la fonction de mise à jour est en CRLF en
//             production), chaque colonne privilégiée a une ligne à elle qui répond « oui », et — SENSIBLE À LA BRANCHE depuis le
//             24/09 (fiche 025-13 : l'ancien contrôle disait « oui » après le end if, sous « if false », dans un /* */) — pas
//             « oui » quand son affectation est retirée, remplacée par « -- colonne », commentée (« -- new.… »), enfermée dans
//             /* … */, déplacée après le « end if; » du bloc current_user, enfermée sous « if false then … end if; », ou
//             neutralisée (« new.colonne := new.colonne; ») ; « oui » quand une autre colonne est retirée, commentée, neutralisée
//             ou déplacée ; pour les 17 nouvelles, pas « oui » sur la fonction de 0008 (mutants : scripts/fixtures/025/
//             verrous-sql.mjs). Si 0094 est absente ou incomplète, le contrôle est jugé contre la fonction attendue (0008 + les 17
//             lignes), et c'est noté ;
//           - le déclencheur : une ligne qui dit « oui » sur le catalogue pg_trigger de production (relu le 24/09) et pas « oui »
//             s'il est absent, branché sur une autre fonction (tgfoid), AFTER, FOR EACH STATEMENT, sur UPDATE, sur une autre
//             table, ou tgenabled 'D', 'R' ou 'A' (l'ancienne ligne « tgenabled <> 'D' » acceptait 'R' : muet pour le navigateur).
//   VI-5  rien d'autre n'a bougé sous supabase/migrations/, supabase/controles/, app/ et lib/ : l'état de référence est le commit
//         relevé dans scripts/fixtures/025/etat-verrou-insertion.json, plus les fichiers qui en différaient déjà quand le juge a
//         été écrit (autres chantiers non committés : 0093 de 025-04, le webhook Stripe…), empreinte sha1 de blob, fins de ligne
//         ramenées à LF. Seuls ajouts permis : les trois fichiers de 0094 et son contrôle. Ne sont pas reprochés à la tâche (ils
//         sont notés) : un fichier identique à son blob de HEAD (committé par un autre chantier depuis le relevé — l'exécutant ne
//         committe jamais), et un fichier que git status montrait déjà à la prise de 025-12 (.orchestre/preuves/025-12/avant.txt,
//         écrit par l'orchestre) — sous app/ et lib/ toujours, sous supabase/ seulement s'il est NOUVEAU : une migration
//         existante (0093 comprise) ne se touche jamais. Un vérificateur ne reproche que ce qui a changé DEPUIS.
//         Depuis le 24/09 (fiche 025-13, qui relance ce juge) : --prise=<id> lit l'avant.txt de CETTE prise ; tolérés et notés,
//         les fichiers de supabase/ d'un numéro supérieur à 0094 (fiches postérieures) ; acceptés s'ils gardent ce qui compte ici,
//         le contrôle de 0093 (en lecture seule) et le jumeau nu de 0093 (SQL de 0093 intact, ce contrôle en pied), que 025-13
//         reprend — leur contenu est jugé par verrou-site-qa et verrou-maj-qa. Depuis le 25/09 (relecture adverse de 0095), tolérés
//         et notés aussi : lib/urls.ts et lib/purgeComptes.ts (préfixe « supprime- » de la purge), s'ils exportent toujours
//         SLUGS_RESERVES, problemeSlug et purgerComptes — leur contenu est jugé par verrou-maj-qa (VM-7).
//
// Options (scripts/fixtures/025/commun.mjs, lireOptions) :
//   --racine=<dossier>  tout est lu dans ce dossier (supabase/, app/onboarding/page.tsx, scripts/sql-nu.mjs,
//                       scripts/migrations-jumelles-e2e.mjs) ; hors dépôt Git, VI-5 compare fichier par fichier.
//   --temoin            juge l'arbre témoin .orchestre/travail/verrou-insertion-qa/temoin/ : les fichiers de l'état de référence
//                       (sous les quatre préfixes de VI-5) copiés depuis la racine, sql-nu.mjs et migrations-jumelles-e2e.mjs,
//                       puis scripts/fixtures/025/temoins/verrou-insertion-qa/ superposé (une 0094 conforme, ses deux jumeaux
//                       fabriqués par sql-nu.mjs --controle, son contrôle). VI-1 à VI-5 doivent y passer.
//   --mutations         prépare le témoin, puis trois copies mutées (0094 modifiée, jumeaux refabriqués par sql-nu.mjs) et relance
//                       le juge sur chacune : MUT-T le témoin est vert ; MUT-OUBLI (new.role_interne retirée) rouge en VI-2 ;
//                       MUT-SLUG (new.slug := null ajoutée) rouge en VI-3 ; MUT-SERVICE (les 17 lignes après le end if :
//                       service_role bloqué) rouge en VI-1 ; depuis le 24/09, MUT-AVEUGLE (le contrôle revenu à
//                       « (^|\n)\s*new… ») et MUT-DECLENCHEUR (« tgenabled <> 'D' ») rouges en VI-4.
//   --prise=<id>        l'avant.txt de la prise qui excuse app/ et lib/ en VI-5 (défaut 025-12 ; 025-13 relance le juge avec
//                       --prise=025-13).
//   --reel est refusé : la preuve sur la vraie base est l'essai à sec de la fiche (DO … raise exception) puis le contrôle.
//
// Sortie : une ligne « PASS|FAIL <id> — … » par critère, puis « verrou-insertion-qa : PASS » ou « … : FAIL — ids » ; code 0
// seulement si tout est vert. Le juge n'écrit que sous .orchestre/travail/verrou-insertion-qa/, et retire ses copies de app/ et
// lib/ à la fin d'un passage --temoin ou --mutations (tsc --noEmit lit tous les .ts/.tsx du dépôt, .orchestre/travail/ compris).
//
// L'état de référence a été relevé une fois par Claude Code (git diff du commit et fichiers non suivis sous les quatre préfixes,
// empreinte LF) ; ni le juge ni l'exécutant ne le réécrivent (scripts/fixtures/** est interdit à la fiche).
//
// Usage : node scripts/verrou-insertion-qa.mjs [--racine=<dossier>] [--temoin] | node scripts/verrou-insertion-qa.mjs --mutations
import fs from 'node:fs'
import path from 'node:path'
import {
  R, FIXTURES, TRAVAIL, creerSortie, lireOptionsOuQuitter, preparerTemoin, dossierTravail, lsTree, git, estRacineGit, blobGit,
  lireOuNull, lireJson, shaBlob, lancer, listerFichiers, analyserSortie, exigerSousTravail, sous,
} from './fixtures/025/commun.mjs'
import * as V from './fixtures/025/verrous-sql.mjs'

const JUGE = 'verrou-insertion-qa'
const FICHE = '025-12'
const NUM = 94
const MIGRATION = '0094_insertion_figee.sql'
const JUMEAU = '_A_COLLER_sql_editor_0094.sql'
const JUMEAU_NU = '_A_COLLER_sql_editor_0094_NU.sql'
const CONTROLE = '0094_insertion_figee.sql'
const CONTROLE_REL = `supabase/controles/${CONTROLE}`
const AJOUTS_PERMIS = new Set([`supabase/migrations/${MIGRATION}`, `supabase/migrations/${JUMEAU}`, `supabase/migrations/${JUMEAU_NU}`, CONTROLE_REL])
const PRECEDENTE = { fichier: '0008_secure_rpc.sql', debut: 44, fin: 58 }
const DECLENCHEUR = { nom: 'trg_lock_artisan_ins', fichier: '0005_secure_privileges.sql' }
const ONBOARDING = 'app/onboarding/page.tsx'
const ETAT = path.join(FIXTURES, 'etat-verrou-insertion.json')
const PREFIXES = ['app/', 'lib/', 'supabase/migrations/', 'supabase/controles/']
// La prise dont le git status excuse app/ et lib/ (VI-5) : 025-12 par défaut ; --prise=<id> quand une fiche postérieure relance ce
// juge (025-13 : node scripts/verrou-insertion-qa.mjs --prise=025-13).
let PRISE = FICHE
let AVANT_TXT = path.join(R, '.orchestre', 'preuves', FICHE, 'avant.txt')
/** La marque que sql-nu.mjs pose avant le contrôle de fin (scripts/sql-nu.mjs:21, MARQUE_CONTROLE). */
const MARQUE_CONTROLE = '-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.'
const TETE_NU = new RegExp(`^-{28} ${JUMEAU_NU.replace(/\./g, '\\.')} — coller ce fichier EN ENTIER\\.`)
const CREE_FONCTION = /^create\s+or\s+replace\s+function\s+public\.lock_artisan_privileges_ins\s*\(\s*\)/i
const DEFINIT = /\bcreate\s+(?:or\s+replace\s+)?function\s+(?:public\s*\.\s*)?"?lock_artisan_privileges_ins"?\s*\(/i
const NOMME = /\block_artisan_privileges_ins\b/i
const CREE_DECLENCHEUR = /\bcreate\s+trigger\s+trg_lock_artisan_ins\s+before\s+insert\s+on\s+(?:public\s*\.\s*)?artisans\s+for\s+each\s+row\s+execute\s+(?:function|procedure)\s+(?:public\s*\.\s*)?lock_artisan_privileges_ins\s*\(\s*\)/i
const SI_EXTERIEUR = /^if current_user not in \('service_role', 'postgres'\) then$/i
const AFFECTATION = /^new\.([a-z_][a-z0-9_]*) := (.+);$/i
const COMMANDES_SQL = new Set(['create', 'alter', 'drop', 'select', 'with', 'insert', 'update', 'delete', 'comment', 'grant', 'revoke', 'do', 'begin', 'commit', 'rollback', 'set', 'reset', 'notify', 'truncate', 'analyze', 'vacuum', 'refresh', 'lock', 'call', 'values', 'explain', 'reindex', 'security', 'table'])
const MOTS_ECRITURE = new Set(['insert', 'update', 'delete', 'merge', 'truncate', 'drop', 'alter', 'create', 'grant', 'revoke', 'copy', 'call', 'do', 'execute', 'perform', 'set', 'reset', 'lock', 'vacuum', 'analyze', 'refresh', 'comment', 'begin', 'commit', 'rollback', 'savepoint', 'notify', 'listen', 'reindex', 'cluster', 'discard', 'security', 'into'])

// ── L'inventaire des 76 colonnes de public.artisans (24/09) ──────────────────────────────────────────────────────────────
// [colonne, défaut (texte de sa migration, null = aucun), statut, qui l'écrit]
//   inscription : envoyée par l'inscription normale (app/onboarding/page.tsx:62-66) — jamais écrasée ;
//   libre       : le navigateur la réécrit légitimement ensuite (mise à jour non figée) — la forcer à l'insertion ne fermerait rien ;
//   fige-0008   : privilège déjà forcé à l'insertion par 0008 ;
//   fige-0094   : privilège que 0094 doit forcer à son défaut (figé à la mise à jour par 0068 / 0093, ou écrit par le serveur seul).
const I = 'inscription', L = 'libre', P8 = 'fige-0008', P = 'fige-0094'
const INVENTAIRE = [
  ['id', null, I, 'clé ; artisan_insert_own exige auth.uid() = id'],
  ['email', null, I, 'onboarding ; réécrit aussi par le serveur (purge)'],
  ['nom', null, I, 'onboarding ; /parametres (SectionProfil)'],
  ['metier', null, I, 'onboarding'],
  ['slug', null, I, 'onboarding (slugBase + suffixe) ; figée à la mise à jour (0068), changée par /api/account/slug'],
  ['ton_style', null, I, 'onboarding'],
  ['tel', null, I, 'onboarding'],
  ['plan', "'gratuit'", P8, 'webhook Stripe, lib/abonnementSync.ts'],
  ['created_at', 'now()', P, 'la base ; lue par /controle (inscriptions du jour, apports « inscrit le »), /api/account/inscription'],
  ['siret', null, L, '/parametres (SectionLegal)'],
  ['forme_juridique', null, L, '/parametres (SectionLegal)'],
  ['adresse', null, L, '/parametres (SectionLegal)'],
  ['code_postal', null, L, '/parametres (SectionLegal)'],
  ['ville', null, L, '/parametres (SectionLegal)'],
  ['logo_url', null, L, 'LogoUpload, AvatarUpload'],
  ['assurance_nom', null, L, '/parametres (SectionLegal)'],
  ['assurance_adresse', null, L, 'profil (données légales)'],
  ['assurance_contrat', null, L, '/parametres (SectionLegal)'],
  ['assurance_activites', null, L, '/parametres (SectionLegal)'],
  ['assurance_zone', null, L, '/parametres (SectionLegal)'],
  ['iban', null, L, '/parametres (SectionLegal)'],
  ['bic', null, L, 'profil (données légales)'],
  ['tva_regime', "'franchise'", L, '/parametres (SectionLegal)'],
  ['numero_tva', null, L, 'profil (données légales)'],
  ['conditions_paiement', null, L, 'profil (données légales)'],
  ['compteur_devis', '0', P8, 'next_numero (serveur)'],
  ['compteur_facture', '0', P8, 'next_numero (serveur)'],
  ['is_founder', 'false', P8, 'éditeur SQL seulement'],
  ['credits', '3', P8, 'consume_credit, webhook Stripe, offrir_credits (serveur)'],
  ['credits_reset_le', null, P8, 'consume_credit, webhook Stripe (serveur)'],
  ['stripe_customer_id', null, P8, 'webhook Stripe (serveur)'],
  ['stripe_subscription_id', null, P8, 'webhook Stripe (serveur)'],
  ['bio', null, L, '/profil'],
  ['services', "'[]'::jsonb", L, '/profil'],
  ['zone_intervention', null, L, '/profil'],
  ['photo_url', null, L, '/profil'],
  ['horaires', null, L, '/profil'],
  ['plateforme_active', 'true', L, '/profil'],
  ['accent', "'#d97757'", L, '/profil, /api/plateforme/apparence'],
  ['realisations', "'[]'::jsonb", L, '/profil'],
  ['reseaux', "'{}'::jsonb", L, '/profil'],
  ['tel_public', null, L, '/profil'],
  ['email_public', null, L, '/profil'],
  ['reponse_auto', 'true', L, 'ancien réglage de Ma plateforme'],
  ['site_tier', '3', P, 'serveur ; figée à la mise à jour par 0093'],
  ['site_active', 'false', P, 'serveur (commande du site à 300 €) ; figée par 0093 ; app/site/[slug]/page.tsx:131 publie dès true'],
  ['site_contenu', null, P, '/api/site/generate (serveur) ; figée par 0093'],
  ['site_contenu_le', null, P, '/api/site/generate (serveur) : nulle = 1re génération offerte'],
  ['site_contact_integre', 'true', L, '/profil'],
  ['theme', "'atelier'", L, '/profil, /api/plateforme/apparence'],
  ['site_seo', 'true', L, 'réglage de l’artisan'],
  ['site_layout', null, L, '/profil'],
  ['domaine', null, P, '/api/domain (serveur) ; figée par 0068'],
  ['domaine_verifie', 'false', P, '/api/domain (serveur, Vercel) ; figée par 0068'],
  ['avant_apres', null, L, '/profil'],
  ['leads_pause', 'false', L, '/plateforme'],
  ['tva_num', null, L, '/parametres (SectionLegal)'],
  ['site_style', null, L, '/profil'],
  ['mention_tva_base', "'auto'", L, '/parametres (SectionLegal)'],
  ['tva_sur_debits', 'false', L, 'réglage de facturation de l’artisan'],
  ['sessions_invalides_avant', null, P, 'déconnexion globale (serveur) ; figée par 0068'],
  ['mediateur_nom', null, L, '/parametres (SectionLegal)'],
  ['mediateur_url', null, L, '/parametres (SectionLegal)'],
  ['aide_vues', "'{}'", L, 'AppShell'],
  ['slugs_anciens', "'{}'", P, 'trigger artisans_slug_historique, /api/account/slug (serveur) ; figée par 0068'],
  ['notifications', "'{}'::jsonb", L, '/parametres (SectionNotifications)'],
  ['suppression_demandee_le', null, P, '/api/account/delete (serveur) ; figée par 0068'],
  ['connexion_verifiee_le', null, P, 'lib/connexion.ts (serveur, après le code)'],
  ['role_interne', null, P, '/api/controle/reglages (serveur) ; figée par 0068 ; « partenaire » = bénéficiaire du relevé'],
  ['est_demo', 'false', P, 'serveur ; figée par 0068 ; true = hors des chiffres'],
  ['origine_declaree', null, I, 'onboarding ; scellée une fois répondue (0068)'],
  ['origine_precision', null, I, 'onboarding ; scellée avec origine_declaree'],
  ['credits_forfait_servi', null, P, 'lib/abonnementSync.ts (serveur) ; figée par 0068'],
  ['credits_periode', null, P, 'lib/abonnementSync.ts (serveur) ; figée par 0068'],
  ['credits_offerts', '0', P, 'offrir_credits (serveur) ; ajoutée au forfait à chaque renouvellement (0080)'],
  ['site_origine', "'abonnement'", P, '/api/controle/sites (serveur) ; figée par 0093'],
].map(([col, defaut, statut, qui]) => ({ col, defaut, statut, qui }))
const PAR_COL = new Map(INVENTAIRE.map((x) => [x.col, x]))
const PRIVILEGES = INVENTAIRE.filter((x) => x.statut === P8 || x.statut === P)
const NOUVELLES = INVENTAIRE.filter((x) => x.statut === P)
const INSCRIPTION = INVENTAIRE.filter((x) => x.statut === I).map((x) => x.col)

const premiere = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
const court = (x, n = 140) => { const t = String(x ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
/** Un fichier texte, fins de ligne ramenées à LF et BOM ôté, ou null s'il est absent. */
const lireTexte = (f) => { const b = lireOuNull(f); return b === null ? null : b.toString('utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n') }
const ligneDe = (texte, pos) => texte.slice(0, pos).split('\n').length
const chemins = (racine) => ({
  dir: path.join(racine, 'supabase', 'migrations'),
  M: path.join(racine, 'supabase', 'migrations', MIGRATION),
  A: path.join(racine, 'supabase', 'migrations', JUMEAU),
  N: path.join(racine, 'supabase', 'migrations', JUMEAU_NU),
  C: path.join(racine, 'supabase', 'controles', CONTROLE),
  sqlNu: path.join(racine, 'scripts', 'sql-nu.mjs'),
  jumelles: path.join(racine, 'scripts', 'migrations-jumelles-e2e.mjs'),
  onboarding: path.join(racine, ...ONBOARDING.split('/')),
})
/** Une valeur SQL ramenée à une forme comparable : hors chaînes, espaces ôtés et minuscules ; chaînes intactes. */
const normValeur = (x) => String(x).trim().replace(/('(?:[^']|'')*')|[^']+/g, (m, q) => (q ? q : m.replace(/\s+/g, '').toLowerCase()))
/** Les formes admises pour « new.<col> := <valeur>; », selon le défaut de la colonne. */
function acceptes(defaut) {
  if (defaut === null) return ['null']
  const d = normValeur(defaut)
  if (d === 'now()') return ['now()', 'current_timestamp', 'transaction_timestamp()']
  if (d === "'{}'") return ["'{}'", "'{}'::text[]", 'array[]::text[]']
  if (/^'[^']*'$/.test(d)) return [d, `${d}::text`]
  return [d]
}
/** La forme canonique (celle du témoin) : le défaut tel que sa migration l'écrit, null sinon. */
const canonique = (x) => (x.defaut === null ? 'null' : x.defaut)

// ── Découpage du SQL (état par état, comme scripts/sql-nu.mjs ; repris de scripts/verrou-site-qa.mjs) ─────────────────────
function decouperSql(sql) {
  const seg = []
  let i = 0, code = '', debutCode = 0
  const vider = () => { if (code) seg.push({ type: 'code', texte: code, pos: debutCode }); code = '' }
  while (i < sql.length) {
    const c = sql[i], d = sql.slice(i, i + 2)
    if (c === "'") {
      let j = i + 1, ferme = false
      while (j < sql.length) { if (sql[j] === "'") { if (sql[j + 1] === "'") j += 2; else { j++; ferme = true; break } } else j++ }
      vider(); seg.push({ type: 'chaine', texte: sql.slice(i, j), pos: i, ferme }); i = j; continue
    }
    if (c === '$') {
      const m = /^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/.exec(sql.slice(i))
      if (m) {
        const fin = sql.indexOf(m[0], i + m[0].length)
        const j = fin < 0 ? sql.length : fin + m[0].length
        vider(); seg.push({ type: 'dollar', texte: sql.slice(i, j), pos: i, tag: m[0], corps: sql.slice(i + m[0].length, fin < 0 ? sql.length : fin), ferme: fin >= 0 }); i = j; continue
      }
    }
    if (d === '--') { const nl = sql.indexOf('\n', i); const j = nl < 0 ? sql.length : nl; vider(); seg.push({ type: 'ligne', texte: sql.slice(i, j), pos: i }); i = j; continue }
    if (d === '/*') { const f = sql.indexOf('*/', i + 2); const j = f < 0 ? sql.length : f + 2; vider(); seg.push({ type: 'bloc', texte: sql.slice(i, j), pos: i, ferme: f >= 0 }); i = j; continue }
    if (!code) debutCode = i
    code += c; i++
  }
  vider()
  return seg
}
const sansCommentaires = (sql) => decouperSql(sql).filter((s) => s.type !== 'ligne' && s.type !== 'bloc').map((s) => s.texte).join('')
const sansCommentairesPartout = (sql) => decouperSql(sql).filter((s) => s.type !== 'ligne' && s.type !== 'bloc').map((s) => s.type === 'dollar' ? `${s.tag}${sansCommentairesPartout(s.corps)}${s.ferme ? s.tag : ''}` : s.texte).join('')
const noyau = (sql) => sansCommentaires(sql).split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim()).join('\n')
function instructions(sql) {
  const res = []
  let cur = [], fin = -1
  const clore = () => {
    const utiles = cur.filter((s) => s.type !== 'ligne' && s.type !== 'bloc')
    const code = utiles.map((s) => s.texte).join('')
    if (code.trim()) {
      const s0 = utiles.find((s) => s.texte.trim())
      res.push({ segs: cur, code: code.trim(), debut: s0.pos + (s0.texte.length - s0.texte.trimStart().length), fin })
    }
    cur = []; fin = -1
  }
  for (const s of decouperSql(sql)) {
    if (s.type !== 'code') { cur.push(s); continue }
    let t = s.texte, p = s.pos, k
    while ((k = t.indexOf(';')) >= 0) { cur.push({ type: 'code', texte: t.slice(0, k + 1), pos: p }); fin = p + k; clore(); p += k + 1; t = t.slice(k + 1) }
    if (t) cur.push({ type: 'code', texte: t, pos: p })
  }
  clore()
  return res
}
function defautsDeSyntaxe(sql, { commandes = COMMANDES_SQL } = {}) {
  const d = []
  const verifier = (texte, ou) => {
    let prof = 0, negatif = false
    for (const s of decouperSql(texte)) {
      if (s.type === 'chaine' && !s.ferme) d.push(`${ou}chaîne non refermée (ligne ${ligneDe(texte, s.pos)})`)
      if (s.type === 'dollar' && !s.ferme) d.push(`${ou}bloc ${s.tag} non refermé (ligne ${ligneDe(texte, s.pos)})`)
      if (s.type === 'bloc' && !s.ferme) d.push(`${ou}commentaire /* non refermé`)
      if (s.type === 'code') for (const c of s.texte) { if (c === '(') prof++; else if (c === ')') { prof--; if (prof < 0) negatif = true } }
      if (s.type === 'dollar' && s.ferme) verifier(s.corps, `corps ${s.tag} : `)
    }
    if (prof !== 0 || negatif) d.push(`${ou}parenthèses déséquilibrées (${prof > 0 ? `${prof} non refermée(s)` : negatif ? 'une « ) » avant sa « ( »' : `${-prof} de trop`})`)
  }
  verifier(sql, '')
  const ins = instructions(sql)
  if (!ins.length) d.push('aucune instruction SQL')
  for (const x of ins) {
    const mot = (/^[A-Za-z]+/.exec(x.code) || [''])[0].toLowerCase()
    if (!commandes.has(mot)) d.push(`instruction qui commence par « ${court(x.code, 30)} » (ligne ${ligneDe(sql, x.debut)})`)
  }
  const utile = sansCommentairesPartout(sql)
  if (/\bconstant\b/i.test(utile)) d.push('mot-clé CONSTANT (refusé par l’éditeur SQL le 08/09)')
  if (/U&'/.test(utile)) d.push('littéral U&\'…\' (dépend de standard_conforming_strings)')
  return d
}
function divergence(a, b) {
  const x = a.split('\n'), y = b.split('\n')
  const n = x.findIndex((l, k) => l !== y[k])
  const k = n < 0 ? x.length : n
  return `ligne ${k + 1} du SQL utile : « ${court(x[k] ?? '(fin)', 70)} » / « ${court(y[k] ?? '(fin)', 70)} »`
}
/** Découpe un texte aux virgules de profondeur 0 (parenthèses, crochets, accolades, chaînes '…' "…" `…`). */
function decouperVirgules(t) {
  const out = []
  let prof = 0, cur = '', q = null
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (q) { cur += c; if (c === '\\' && q !== "'") { cur += t[++i] ?? ''; continue } if (c === q) { if (q === "'" && t[i + 1] === "'") { cur += t[++i]; continue } q = null } continue }
    if (c === "'" || c === '"' || c === '`') { q = c; cur += c; continue }
    if ('([{'.includes(c)) prof++
    else if (')]}'.includes(c)) prof--
    if (c === ',' && prof === 0) { out.push(cur); cur = ''; continue }
    cur += c
  }
  if (cur.trim()) out.push(cur)
  return out.map((x) => x.trim()).filter(Boolean)
}

// ── La fonction lock_artisan_privileges_ins ──────────────────────────────────────────────────────────────────────────────
const normaliserLigne = (l) => l.replace(/\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/g, '$$$$').replace(/\s*:=\s*/g, ' := ').replace(/\s+/g, ' ').trim()
const lignesDeCode = (corps) => sansCommentairesPartout(corps).split('\n').map(normaliserLigne).filter(Boolean)
function analyserDefinition(ins) {
  const iDollar = ins.segs.findIndex((s) => s.type === 'dollar')
  const avant = ins.segs.slice(0, iDollar < 0 ? ins.segs.length : iDollar).filter((s) => s.type === 'code' || s.type === 'chaine').map((s) => s.texte).join('')
  const apres = iDollar < 0 ? '' : ins.segs.slice(iDollar + 1).filter((s) => s.type === 'code' || s.type === 'chaine' || s.type === 'dollar').map((s) => s.texte).join('')
  const d = iDollar < 0 ? null : ins.segs[iDollar]
  return {
    entete: avant.replace(/\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/g, '$$$$').replace(/\s+/g, ' ').trim().toLowerCase(),
    corps: d ? d.corps : null, ferme: !!(d && d.ferme), tag: d ? d.tag : null,
    apres: apres.replace(/\s+/g, ''),
    dollars: ins.segs.filter((s) => s.type === 'dollar').length,
    lignes: d ? lignesDeCode(d.corps) : [],
  }
}
function differenceLignes(a, b) {
  const n = a.length, m = b.length
  const Lm = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) Lm[i][j] = a[i] === b[j] ? Lm[i + 1][j + 1] + 1 : Math.max(Lm[i + 1][j], Lm[i][j + 1])
  const retires = [], ajoutes = []
  let i = 0, j = 0
  while (i < n && j < m) { if (a[i] === b[j]) { i++; j++ } else if (Lm[i + 1][j] >= Lm[i][j + 1]) retires.push(i++); else ajoutes.push(j++) }
  while (i < n) retires.push(i++)
  while (j < m) ajoutes.push(j++)
  return { retires, ajoutes }
}
/** Pour chaque ligne de code (indice), la pile des « if … then » ouverts : [{ ligne, branche: 'then' | 'else' }]. */
function piles(lignes) {
  const pile = [], res = new Map()
  lignes.forEach((l, j) => {
    const b = l.toLowerCase()
    if (/^end if\s*;$/.test(b)) { pile.pop(); return }
    if (b === 'else' || /^els(?:e)?if\b.*\bthen$/.test(b)) { if (pile.length) pile[pile.length - 1].branche = 'else'; return }
    if (/^if\b.*\bthen$/.test(b)) { pile.push({ ligne: l, branche: 'then' }); return }
    res.set(j, pile.map((p) => ({ ...p })))
  })
  return res
}
const dansLaBrancheServeur = (p) => !!p && p.length === 1 && SI_EXTERIEUR.test(p[0].ligne) && p[0].branche === 'then'
const decrirePile = (p) => (p && p.length ? `sous ${p.map((x) => `« ${court(x.ligne, 50)} »${x.branche === 'else' ? ' (branche else)' : ''}`).join(' > ')}` : 'hors de tout bloc if')
/** Les affectations « new.col := val; » d'un corps : [{ j, col, valeur, pile }] */
function affectations(lignes) {
  const p = piles(lignes)
  const out = []
  lignes.forEach((l, j) => { const m = AFFECTATION.exec(l); if (m) out.push({ j, col: m[1].toLowerCase(), valeur: m[2], pile: p.get(j) }) })
  return out
}
function lireMigrations(racine) {
  const dir = chemins(racine).dir
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort().map((nom) => {
    const texte = lireTexte(path.join(dir, nom)) ?? ''
    return { nom, num: Number(nom.slice(0, 4)), texte, code: sansCommentairesPartout(texte) }
  })
}
/** La définition précédente (0008:44-58) lue dans la racine → { nom, debut, fin, def, echecs[] }. */
function definitionPrecedente(migs) {
  const echecs = []
  const avant = []
  for (const m of migs) {
    if (m.num >= NUM) continue
    for (const ins of instructions(m.texte)) if (DEFINIT.test(ins.code)) avant.push({ m, ins })
  }
  if (!avant.length) return { echecs: [`aucune définition de lock_artisan_privileges_ins dans les migrations antérieures à 0094`] }
  const der = avant[avant.length - 1]
  const debut = ligneDe(der.m.texte, der.ins.debut), fin = der.ins.fin < 0 ? -1 : ligneDe(der.m.texte, der.ins.fin)
  if (der.m.nom !== PRECEDENTE.fichier || debut !== PRECEDENTE.debut || fin !== PRECEDENTE.fin) echecs.push(`la dernière définition avant 0094 est ${der.m.nom}:${debut}-${fin}, ${PRECEDENTE.fichier}:${PRECEDENTE.debut}-${PRECEDENTE.fin} attendue (prémisse de la fiche)`)
  if (!CREE_FONCTION.test(der.ins.code)) echecs.push(`${der.m.nom}:${debut} n'est pas un « create or replace function public.lock_artisan_privileges_ins() »`)
  const def = analyserDefinition(der.ins)
  if (!def.corps || !def.lignes.length) echecs.push(`${der.m.nom}:${debut} : corps illisible`)
  return { nom: der.m.nom, debut, fin, def, echecs }
}
/** Le corps attendu : celui de 0008, avec les 17 lignes après « new.compteur_facture := 0; » (même retrait). */
function corpsAttendu(corps0008) {
  const l = corps0008.split('\n')
  const k = l.findIndex((x) => normaliserLigne(x.replace(/--.*$/, '')) === 'new.compteur_facture := 0;')
  if (k < 0) throw new Error('0008 : ligne « new.compteur_facture := 0; » introuvable, corps attendu impossible à construire')
  const retrait = /^\s*/.exec(l[k])[0]
  return [...l.slice(0, k + 1), ...NOUVELLES.map((x) => `${retrait}new.${x.col} := ${canonique(x)};`), ...l.slice(k + 1)].join('\n')
}
/** Ce que pg_get_functiondef rend pour cette fonction (forme relue en production le 24/09) : en-tête de Postgres, corps tel quel. */
const defSimulee = (corps) => `CREATE OR REPLACE FUNCTION public.lock_artisan_privileges_ins()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO 'public'\nAS $function$${corps}$function$\n`

// ── VI-1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** → { ok, echecs, faits, resume, d94 (définition analysée ou null), precedente, structureOk } */
function vi1(racine) {
  const echecs = [], faits = []
  const fin = (resume, extra = {}) => ({ ok: echecs.length === 0, echecs, faits, resume, d94: null, structureOk: false, ...extra })
  const migs = lireMigrations(racine)
  const prec = definitionPrecedente(migs)
  for (const e of prec.echecs) echecs.push(e)
  // 025-13 (24/09) : une migration postérieure à 0094 (0095) peut REDÉFINIR la fonction, jugé plus bas — seulement en gardant 0094
  // entière ; tout autre usage du nom après 0008 reste rouge
  const posterieures = []
  for (const m of migs) {
    if (m.nom === MIGRATION) continue
    if (m.num > NUM && NOMME.test(m.code)) posterieures.push(m)
    else if (m.num > 8 && NOMME.test(m.code)) echecs.push(`${m.nom} nomme lock_artisan_privileges_ins (la dernière définition avant 0094 doit rester 0008)`)
    if (m.nom !== DECLENCHEUR.fichier && /\btrg_lock_artisan_ins\b/i.test(m.code)) echecs.push(`${m.nom} nomme le déclencheur trg_lock_artisan_ins (créé par ${DECLENCHEUR.fichier} seulement)`)
  }
  const m5 = migs.find((m) => m.nom === DECLENCHEUR.fichier)
  if (!m5) echecs.push(`${DECLENCHEUR.fichier} absent : le déclencheur d'insertion n'est créé nulle part`)
  else if (!CREE_DECLENCHEUR.test(m5.code)) echecs.push(`${DECLENCHEUR.fichier} ne crée plus « trg_lock_artisan_ins before insert on public.artisans … lock_artisan_privileges_ins() »`)
  const texte = lireTexte(chemins(racine).M)
  if (texte === null) { echecs.push(`supabase/migrations/${MIGRATION} absent : lock_artisan_privileges_ins n'est pas redéfinie`); return fin('', { precedente: prec }) }
  if (!texte.trim()) { echecs.push(`${MIGRATION} vide`); return fin('', { precedente: prec }) }
  const ins = instructions(texte)
  if (ins.length !== 1) echecs.push(`${MIGRATION} porte ${ins.length} instruction(s) SQL, une seule attendue (le create or replace function)${ins.length > 1 ? ` : ${ins.map((x) => `« ${court(x.code, 40)} »`).slice(0, 4).join(', ')}` : ''}`)
  const def = ins.filter((x) => CREE_FONCTION.test(x.code))
  if (def.length !== 1) { echecs.push(`${MIGRATION} : ${def.length} « create or replace function public.lock_artisan_privileges_ins() », un attendu`); if (!def.length) return fin('', { precedente: prec }) }
  const d94 = analyserDefinition(def[0])
  for (const e of defautsDeSyntaxe(texte)) echecs.push(`${MIGRATION} ne se parse pas : ${e}`)
  if (d94.dollars !== 1 || !d94.ferme || d94.corps === null) echecs.push(`${MIGRATION} : un corps $$ … $$ refermé attendu (${d94.dollars} bloc(s))`)
  if (d94.apres !== ';') echecs.push(`${MIGRATION} : après le corps, « ; » seul attendu, trouvé « ${court(d94.apres, 40)} »`)
  let structureOk = false, ajoutees = 0
  if (prec.def) {
    if (d94.entete !== prec.def.entete) echecs.push(`en-tête différent de ${prec.nom} : « ${court(d94.entete, 110)} » / « ${court(prec.def.entete, 110)} »`)
    const a = prec.def.lignes, b = d94.lignes
    const { retires, ajoutes } = differenceLignes(a, b)
    if (retires.length) echecs.push(`${retires.length} ligne(s) de ${prec.nom} retirée(s) ou modifiée(s) : ${retires.slice(0, 3).map((k) => `« ${court(a[k], 60)} »`).join(', ')}`)
    const p = piles(b)
    const autres = ajoutes.filter((j) => !AFFECTATION.test(b[j]))
    if (autres.length) echecs.push(`${autres.length} ligne(s) de code en plus qui ne sont pas des affectations « new.<colonne> := <valeur>; » : ${autres.slice(0, 3).map((j) => `« ${court(b[j], 60)} »`).join(', ')}`)
    const malPlacees = ajoutes.filter((j) => AFFECTATION.test(b[j]) && !dansLaBrancheServeur(p.get(j)))
    if (malPlacees.length) echecs.push(`${malPlacees.length} affectation(s) hors de la branche then du bloc « if current_user not in ('service_role', 'postgres') » (profondeur 1) — le serveur ne pourrait plus créer de ligne privilégiée : ${malPlacees.slice(0, 3).map((j) => `« ${b[j]} » ${decrirePile(p.get(j))}`).join(' ; ')}`)
    ajoutees = ajoutes.length - autres.length
    structureOk = !retires.length && !autres.length && !malPlacees.length && d94.corps !== null
    const com = (x) => (x.match(/^\s*--.*$/gm) || []).length
    if (d94.corps !== null && prec.def.corps !== null) faits.push(`commentaires du corps : ${com(d94.corps)} ligne(s) (${com(prec.def.corps)} dans ${prec.nom}) — libres, non jugés`)
    faits.push(`définition précédente : ${prec.nom}:${prec.debut}-${prec.fin} (${a.length} lignes de code) ; 0094 : ${b.length} lignes de code, ${ajoutees} affectation(s) ajoutée(s)`)
  }
  // les redéfinitions postérieures à 0094 (025-13) : toutes les lignes de 0094 gardées (plus longue sous-suite commune), en-tête
  // identique, et chaque affectation de la branche du navigateur toujours à sa profondeur 1 ; les refus que 0095 ajoute sont jugés
  // par scripts/verrou-maj-qa.mjs (VM-2)
  let enVigueur = MIGRATION
  const protegees = affectations(d94.lignes).filter((y) => dansLaBrancheServeur(y.pile)).map((y) => d94.lignes[y.j])
  for (const m of posterieures) {
    const d = []
    for (const x of instructions(m.texte).filter((y) => NOMME.test(sansCommentairesPartout(y.code)))) {
      if (!CREE_FONCTION.test(x.code)) { d.push(`« ${court(x.code, 50)} » (seul « create or replace function public.lock_artisan_privileges_ins() » est permis)`); continue }
      const dx = analyserDefinition(x)
      if (dx.entete !== d94.entete) d.push('en-tête différent de 0094')
      const { retires } = differenceLignes(d94.lignes, dx.lignes)
      if (retires.length) d.push(`${retires.length} ligne(s) de 0094 retirée(s) ou modifiée(s) : ${retires.slice(0, 2).map((k) => `« ${court(d94.lignes[k], 50)} »`).join(', ')}`)
      const p = piles(dx.lignes)
      for (const l of protegees) { const j = dx.lignes.indexOf(l); if (j < 0) d.push(`« ${l} » absente`); else if (!dansLaBrancheServeur(p.get(j))) d.push(`« ${l} » hors de la branche then (profondeur 1)`) }
    }
    if (d.length) echecs.push(`${m.nom} (postérieure à 0094) touche lock_artisan_privileges_ins sans garder 0094 entière : ${d.slice(0, 3).join(' ; ')}`)
    else { faits.push(`${m.nom} redéfinit lock_artisan_privileges_ins en gardant 0094 entière (${protegees.length} affectations dans la branche then) : c'est elle qui est en vigueur`); enVigueur = m.nom }
  }
  return fin(`${MIGRATION} = ${prec.nom}:${prec.debut}-${prec.fin} à l'identique + ${ajoutees} affectation(s) dans la branche then du bloc current_user, une seule instruction, en-tête identique ; ${enVigueur === MIGRATION ? 'dernière définition' : `redéfinie ensuite par ${enVigueur}, qui la garde entière`} ; trg_lock_artisan_ins créé par 0005 et jamais retouché`, { d94, precedente: prec, structureOk })
}

// ── VI-2 : l'inventaire et les colonnes forcées ─────────────────────────────────────────────────────────────────────────
/** Les colonnes de public.artisans d'après les migrations antérieures à 0094 → { cols: Map(col → { defaut, nom }), echecs[], faits[] } */
function colonnesDesMigrations(migs) {
  const cols = new Map(), echecs = [], faits = [], changeDefaut = []
  const extraireDefaut = (reste) => {
    const m = /\bdefault\s+('(?:[^']|'')*'(?:::[\w[\]]+)?|[^\s,]+)/i.exec(reste)
    return m ? m[1].toLowerCase() : null
  }
  const ajouter = (col, defaut, nom) => {
    const c = col.toLowerCase()
    if (cols.has(c)) { if (cols.get(c).defaut !== defaut) faits.push(`${c} ajoutée aussi par ${nom} avec un autre défaut (${defaut}) : « if not exists », celui de ${cols.get(c).nom} reste`); return }
    cols.set(c, { defaut, nom })
  }
  for (const m of migs) {
    if (m.num >= NUM) continue
    for (const ins of instructions(m.code)) {
      const ct = /^create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\s*\.\s*)?artisans\s*\(/i.exec(ins.code)
      if (ct) {
        const debut = ct[0].length
        let prof = 1, k = debut
        for (; k < ins.code.length && prof > 0; k++) { if (ins.code[k] === '(') prof++; else if (ins.code[k] === ')') prof-- }
        for (const item of decouperVirgules(ins.code.slice(debut, k - 1))) {
          const mot = /^"?([A-Za-z_][A-Za-z0-9_]*)"?\s+([\s\S]*)$/.exec(item)
          if (!mot || /^(?:constraint|primary|unique|check|foreign|exclude|like)$/i.test(mot[1])) continue
          ajouter(mot[1], extraireDefaut(mot[2]), m.nom)
        }
        continue
      }
      const at = /^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\s*\.\s*)?artisans\b([\s\S]*?);?$/i.exec(ins.code)
      if (!at) continue
      for (const action of decouperVirgules(at[1])) {
        const add = /^add\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s+([\s\S]*)$/i.exec(action)
        if (add && !/^(?:constraint|primary|unique|check|foreign)$/i.test(add[1])) { ajouter(add[1], extraireDefaut(add[2]), m.nom); continue }
        const drop = /^drop\s+(?:column\s+)?(?:if\s+exists\s+)?"?([A-Za-z_][A-Za-z0-9_]*)"?/i.exec(action)
        if (drop && !/^constraint$/i.test(drop[1])) { cols.delete(drop[1].toLowerCase()); faits.push(`${drop[1]} retirée par ${m.nom}`); continue }
        const alt = /^alter\s+(?:column\s+)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s+(set\s+default|drop\s+default)\b/i.exec(action)
        if (alt) changeDefaut.push(`${alt[1]} (${alt[2].toLowerCase()} dans ${m.nom})`)
        const ren = /^rename\s+(?:column\s+)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s+to\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/i.exec(action)
        if (ren) { const v = cols.get(ren[1].toLowerCase()); cols.delete(ren[1].toLowerCase()); if (v) cols.set(ren[2].toLowerCase(), v) }
      }
    }
  }
  if (changeDefaut.length) echecs.push(`défaut changé après coup (l'inventaire suppose le défaut de l'ajout) : ${changeDefaut.join(', ')}`)
  return { cols, echecs, faits }
}
function vi2(racine, r1) {
  const echecs = [], faits = []
  const fin = (resume) => ({ ok: echecs.length === 0, echecs, faits, resume })
  // l'inventaire : complet et fidèle
  const { cols, echecs: e0, faits: f0 } = colonnesDesMigrations(lireMigrations(racine))
  for (const e of e0) echecs.push(e)
  for (const f of f0) faits.push(f)
  const nonClassees = [...cols.keys()].filter((c) => !PAR_COL.has(c))
  const disparues = INVENTAIRE.filter((x) => !cols.has(x.col)).map((x) => x.col)
  if (nonClassees.length) echecs.push(`${nonClassees.length} colonne(s) de artisans absente(s) de l'inventaire du juge (à classer : inscription, libre ou privilège) : ${nonClassees.join(', ')}`)
  if (disparues.length) echecs.push(`${disparues.length} colonne(s) de l'inventaire créée(s) par aucune migration antérieure à 0094 : ${disparues.join(', ')}`)
  const defautsFaux = INVENTAIRE.filter((x) => cols.has(x.col) && (cols.get(x.col).defaut ?? null) !== (x.defaut === null ? null : x.defaut.toLowerCase()))
  if (defautsFaux.length) echecs.push(`défaut de l'inventaire différent de la migration : ${defautsFaux.map((x) => `${x.col} (inventaire ${x.defaut ?? 'aucun'}, ${cols.get(x.col).nom} ${cols.get(x.col).defaut ?? 'aucun'})`).join(', ')}`)
  faits.push(`inventaire : ${INVENTAIRE.length} colonnes (${INSCRIPTION.length} inscription, ${INVENTAIRE.filter((x) => x.statut === L).length} libres, ${PRIVILEGES.length} privilèges dont ${NOUVELLES.length} nouveaux) ; migrations : ${cols.size} colonnes`)
  // les colonnes forcées dans 0094
  if (!r1 || !r1.d94 || r1.d94.corps === null) { echecs.push(`${MIGRATION} absente ou illisible : aucune des ${PRIVILEGES.length} colonnes privilégiées n'est forcée par elle (nouvelles : ${NOUVELLES.map((x) => x.col).join(', ')})`); return fin('') }
  const aff = affectations(r1.d94.lignes)
  const manquantes = [], doubles = [], valeurs = [], placees = []
  for (const x of PRIVILEGES) {
    const a = aff.filter((y) => y.col === x.col)
    if (!a.length) { manquantes.push(x.col); continue }
    if (a.length > 1) doubles.push(`${x.col} (${a.length} fois)`)
    for (const y of a) {
      if (!acceptes(x.defaut).includes(normValeur(y.valeur))) valeurs.push(`new.${x.col} := ${y.valeur} (${acceptes(x.defaut).join(' ou ')} attendu : le défaut de la colonne)`)
      if (!dansLaBrancheServeur(y.pile)) placees.push(`new.${x.col} ${decrirePile(y.pile)}`)
    }
  }
  if (manquantes.length) echecs.push(`${manquantes.length} colonne(s) privilégiée(s) non forcée(s) à l'insertion : ${manquantes.join(', ')}`)
  if (doubles.length) echecs.push(`affectation(s) en double : ${doubles.join(', ')}`)
  if (valeurs.length) echecs.push(`valeur(s) qui ne sont pas le défaut : ${valeurs.slice(0, 4).join(' ; ')}`)
  if (placees.length) echecs.push(`hors de la branche then du bloc current_user (profondeur 1) : ${placees.slice(0, 4).join(' ; ')}`)
  const inconnues = aff.filter((y) => !PAR_COL.has(y.col)).map((y) => y.col)
  if (inconnues.length) echecs.push(`affectation(s) à une colonne qui n'existe pas (chaque insertion échouerait) : ${inconnues.join(', ')}`)
  return fin(`${PRIVILEGES.length} colonnes privilégiées forcées à leur défaut dans la branche then, une fois chacune — 0008 : ${PRIVILEGES.filter((x) => x.statut === P8).map((x) => x.col).join(', ')} ; 0094 : ${NOUVELLES.map((x) => `${x.col} := ${canonique(x)}`).join(', ')} ; inventaire de ${INVENTAIRE.length} colonnes complet et fidèle aux migrations`)
}

// ── VI-3 : l'inscription normale n'est pas écrasée ──────────────────────────────────────────────────────────────────────
/** Les clés de l'objet passé à .from('artisans').upsert({…}) (ou insert) dans app/onboarding/page.tsx → { cles[], etalements[] } */
function champsInscription(texte) {
  const m = /\.from\(\s*['"]artisans['"]\s*\)\s*\.(upsert|insert)\(\s*\{/.exec(texte)
  if (!m) throw new Error(`${ONBOARDING} : appel .from('artisans').upsert({ … }) introuvable`)
  const debut = m.index + m[0].length
  let prof = 1, q = null, k = debut
  for (; k < texte.length && prof > 0; k++) {
    const c = texte[k]
    if (q) { if (c === '\\') { k++; continue } if (c === q) q = null; continue }
    if (c === "'" || c === '"' || c === '`') { q = c; continue }
    if (c === '/' && texte[k + 1] === '/') { const nl = texte.indexOf('\n', k); k = nl < 0 ? texte.length : nl; continue }
    if ('([{'.includes(c)) prof++
    else if (')]}'.includes(c)) prof--
  }
  const corps = texte.slice(debut, k - 1).replace(/\/\/[^\n]*/g, '')
  const cles = [], etalements = []
  for (const piece of decouperVirgules(corps)) {
    if (piece.startsWith('...')) { etalements.push(piece); continue }
    const c = /^(?:['"]([A-Za-z_]\w*)['"]|([A-Za-z_$][\w$]*))\s*(?::|$)/.exec(piece)
    if (c) cles.push((c[1] || c[2]).toLowerCase())
    else etalements.push(piece)
  }
  return { methode: m[1], cles, etalements }
}
function vi3(racine, r1) {
  const echecs = [], faits = []
  const fin = (resume) => ({ ok: echecs.length === 0, echecs, faits, resume })
  // l'appel du navigateur à l'inscription
  const t = lireTexte(chemins(racine).onboarding)
  let envoyees = []
  if (t === null) echecs.push(`${ONBOARDING} absent de la racine : l'inscription normale n'est pas vérifiable`)
  else {
    try {
      const { methode, cles, etalements } = champsInscription(t)
      envoyees = cles
      if (etalements.length) echecs.push(`${ONBOARDING} : ${methode}({ … }) porte un étalement ou une clé calculée (${etalements.map((x) => `« ${court(x, 30)} »`).join(', ')}) : colonnes envoyées non vérifiables`)
      const priv = cles.filter((c) => PAR_COL.has(c) && PAR_COL.get(c).statut !== I && PAR_COL.get(c).statut !== L)
      const inconnues = cles.filter((c) => !PAR_COL.has(c))
      if (priv.length) echecs.push(`l'inscription envoie des colonnes privilégiées, qu'un verrou d'insertion écraserait en silence : ${priv.join(', ')}`)
      if (inconnues.length) echecs.push(`l'inscription envoie des colonnes inconnues de l'inventaire : ${inconnues.join(', ')}`)
      const libres = cles.filter((c) => PAR_COL.get(c)?.statut === L)
      if (libres.length) faits.push(`l'inscription envoie aussi des colonnes libres (non forcées) : ${libres.join(', ')}`)
      const absentes = INSCRIPTION.filter((c) => !cles.includes(c))
      if (absentes.length) faits.push(`colonnes « inscription » de l'inventaire que ${ONBOARDING} n'envoie plus : ${absentes.join(', ')}`)
      faits.push(`${ONBOARDING} : ${methode}({ ${cles.join(', ')} })`)
    } catch (e) { echecs.push(premiere(e)) }
  }
  // le corps de 0094
  if (!r1 || !r1.d94 || r1.d94.corps === null) { echecs.push(`${MIGRATION} absente ou illisible : rien à vérifier côté verrou`); return fin('') }
  const lignes = r1.d94.lignes
  const aff = affectations(lignes)
  const ecrasees = aff.filter((y) => PAR_COL.has(y.col) && (PAR_COL.get(y.col).statut === I || PAR_COL.get(y.col).statut === L))
  for (const y of ecrasees) echecs.push(`new.${y.col} := ${y.valeur} écrase une colonne ${PAR_COL.get(y.col).statut === I ? 'de l\'inscription normale' : 'libre (le navigateur l\'écrit légitimement)'}${envoyees.includes(y.col) ? ` — ${ONBOARDING} l'envoie` : ''}`)
  const code = sansCommentairesPartout(r1.d94.corps)
  const interdits = [
    [/\bnew\s*:=/i, 'affectation de la ligne entière (new := …)'],
    [/\binto\s+new\b/i, 'select … into new'],
    [/\breturn\s+null\b/i, 'return null (l\'insertion serait annulée)'],
    [/\braise\b/i, 'raise (l\'insertion échouerait)'],
  ]
  for (const [re, quoi] of interdits) if (re.test(code)) echecs.push(`${MIGRATION} : ${quoi}`)
  const retours = lignes.filter((l) => /^return\b/i.test(l))
  if (retours.length !== 1 || lignes.slice(-2).join(' | ').toLowerCase() !== 'return new; | end') echecs.push(`le corps doit finir par « return new; » puis « end », un seul return (trouvé : ${retours.map((l) => `« ${l} »`).join(', ') || 'aucun'} ; fin « ${court(lignes.slice(-2).join(' | '), 40)} »)`)
  return fin(`aucune affectation aux ${INSCRIPTION.length} colonnes de l'inscription (${INSCRIPTION.join(', ')}) ni aux ${INVENTAIRE.filter((x) => x.statut === L).length} colonnes libres ; ni new :=, ni into new, ni return null, ni raise ; « return new; » en dernier ; ${ONBOARDING} n'envoie que des colonnes inscription/libres`)
}

// ── VI-4 : jumeaux, suite des jumeaux, contrôle ────────────────────────────────────────────────────────────────────────────
function jetons(s) {
  const out = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/\s/.test(c)) { i++; continue }
    if ((c === 'e' || c === 'E') && s[i + 1] === "'") {
      let j = i + 2, v = ''
      for (;;) {
        if (j >= s.length) throw new Error('chaîne E\'…\' non refermée')
        if (s[j] === '\\') { v += s[j + 1] ?? ''; j += 2; continue }
        if (s[j] === "'") { if (s[j + 1] === "'") { v += "'"; j += 2; continue } j++; break }
        v += s[j++]
      }
      out.push({ t: 'lit', v }); i = j; continue
    }
    if (c === "'") {
      let j = i + 1, v = ''
      for (;;) {
        if (j >= s.length) throw new Error('chaîne non refermée')
        if (s[j] === "'") { if (s[j + 1] === "'") { v += "'"; j += 2; continue } j++; break }
        v += s[j++]
      }
      out.push({ t: 'lit', v }); i = j; continue
    }
    if (c === '"') { const f = s.indexOf('"', i + 1); if (f < 0) throw new Error('identifiant "…" non refermé'); out.push({ t: 'mot', v: s.slice(i + 1, f).toLowerCase() }); i = f + 1; continue }
    if ('(),;[]'.includes(c)) { out.push({ t: c }); i++; continue }
    // 025-13 : « & » (tgtype & 3), « @> », « <@ » — la ligne du déclencheur se lit ; verrous-sql.mjs la simule (VI-4, plus bas)
    const op = /^(?:!~\*|!~|~\*|~|<>|!=|>=|<=|::|@>|<@|\|\||[=<>+\-*/%.&|])/.exec(s.slice(i))
    if (op) { out.push({ t: 'op', v: op[0] }); i += op[0].length; continue }
    const w = /^[A-Za-z_][\w$]*(?:\.[A-Za-z_][\w$]*)*/.exec(s.slice(i))
    if (w) { out.push({ t: 'mot', v: w[0].toLowerCase() }); i += w[0].length; continue }
    const nb = /^\d+(?:\.\d+)?/.exec(s.slice(i))
    if (nb) { out.push({ t: 'nb', v: Number(nb[0]) }); i += nb[0].length; continue }
    throw new Error(`caractère inattendu « ${c} »`)
  }
  return out
}
const texteJetons = (ts) => ts.map((x) => x.t === 'lit' ? `'${x.v}'` : x.t === 'mot' || x.t === 'op' || x.t === 'nb' ? String(x.v) : x.t).join(' ')
const echapperRe = (x) => x.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
function likeVersRegex(p, insensible, echap = '\\') {
  let r = ''
  for (let i = 0; i < p.length; i++) {
    const c = p[i]
    if (echap && c === echap) { i++; if (i < p.length) r += echapperRe(p[i]); continue }
    r += c === '%' ? '[\\s\\S]*' : c === '_' ? '[\\s\\S]' : echapperRe(c)
  }
  return new RegExp(`^${r}$`, insensible ? 'i' : '')
}
function areVersRegex(p, insensible) {
  let s = p.startsWith('***:') ? p.slice(4) : p
  s = s.replace(/\[\[:(space|alpha|digit|alnum|upper|lower):\]\]/g, (_, k) => ({ space: '\\s', alpha: '[A-Za-z]', digit: '\\d', alnum: '[A-Za-z0-9]', upper: '[A-Z]', lower: '[a-z]' })[k])
  s = s.replace(/\[:(space|alpha|digit|alnum|upper|lower):\]/g, (_, k) => ({ space: '\\s', alpha: 'A-Za-z', digit: '0-9', alnum: 'A-Za-z0-9', upper: 'A-Z', lower: 'a-z' })[k])
  s = s.replace(/(^|[^\\])\\[mMy]/g, '$1\\b')
  return new RegExp(s, `s${insensible ? 'i' : ''}`)
}
const ARGUMENT_VALIDE = /^(?:public\.)?lock_artisan_privileges_ins(?:\(\))?$/i
function operandeValide(ops, alias) {
  let x = ops.slice()
  for (;;) {
    const n = x.length
    if (n >= 2 && x[n - 2].t === 'op' && x[n - 2].v === '::' && x[n - 1].t === 'mot') { x = x.slice(0, -2); continue }
    if (n >= 2 && x[0].t === '(' && x[n - 1].t === ')') {
      let p = 0, enveloppe = true
      for (let k = 0; k < n; k++) { if (x[k].t === '(') p++; else if (x[k].t === ')') p--; if (p === 0 && k < n - 1) { enveloppe = false; break } }
      if (enveloppe) { x = x.slice(1, -1); if (x[0]?.t === 'mot' && x[0].v === 'select') x = x.slice(1); continue }
    }
    break
  }
  if (x.length === 1 && x[0].t === 'mot' && alias.has(x[0].v)) return true
  return x.length === 6 && x[0].t === 'mot' && /^(?:pg_catalog\.)?pg_get_functiondef$/.test(x[0].v) && x[1].t === '(' && x[2].t === 'lit' && ARGUMENT_VALIDE.test(x[2].v)
    && x[3].t === 'op' && x[3].v === '::' && x[4].t === 'mot' && ['regprocedure', 'regproc'].includes(x[4].v) && x[5].t === ')'
}
function compilerCondition(ts, alias) {
  let i = 0
  const t = (k = 0) => ts[i + k]
  const mot = (x, v) => !!x && x.t === 'mot' && (v === undefined || x.v === v)
  const comparateur = (k = 0) => {
    const x = t(k)
    if (!x) return 0
    if (mot(x, 'like') || mot(x, 'ilike')) return 1
    if (mot(x, 'not') && (mot(t(k + 1), 'like') || mot(t(k + 1), 'ilike'))) return 2
    if (x.t === 'op' && ['~', '~*', '!~', '!~*'].includes(x.v)) return 1
    if (mot(x, 'similar')) return -1
    return 0
  }
  const operande = (arret) => {
    const debut = i
    let p = 0
    while (i < ts.length) {
      const x = t()
      if (p === 0) {
        if (arret ? x.t === arret : comparateur() !== 0) break
        if (x.t === ')' || mot(x, 'and') || mot(x, 'or')) break
      }
      if (x.t === '(') p++; else if (x.t === ')') p--
      i++
    }
    const ops = ts.slice(debut, i)
    if (!ops.length || !operandeValide(ops, alias)) throw new Error(`opérande non simulée « ${court(texteJetons(ops), 70)} » (pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure) attendu)`)
    return ops
  }
  const numerique = (f) => {
    const c = t(), n = t(1)
    if (c?.t !== 'op' || !['>', '>=', '=', '<>', '!=', '<', '<='].includes(c.v) || n?.t !== 'nb') throw new Error('comparaison à un nombre attendue après position/strpos')
    i += 2
    const v = n.v
    const cmp = { '>': (a) => a > v, '>=': (a) => a >= v, '=': (a) => a === v, '<>': (a) => a !== v, '!=': (a) => a !== v, '<': (a) => a < v, '<=': (a) => a <= v }[c.v]
    return (s) => cmp(f(s))
  }
  const atome = () => {
    if (mot(t(), 'position') && t(1)?.t === '(') {
      i += 2
      const l = t(); if (l?.t !== 'lit') throw new Error('position : chaîne attendue'); i++
      if (!mot(t(), 'in')) throw new Error('position : « in » attendu'); i++
      operande(')'); if (t()?.t !== ')') throw new Error('position : « ) » attendue'); i++
      return numerique((s) => s.indexOf(l.v) + 1)
    }
    if (mot(t(), 'strpos') && t(1)?.t === '(') {
      i += 2
      operande(','); if (t()?.t !== ',') throw new Error('strpos : « , » attendue'); i++
      const l = t(); if (l?.t !== 'lit') throw new Error('strpos : chaîne attendue'); i++
      if (t()?.t !== ')') throw new Error('strpos : « ) » attendue'); i++
      return numerique((s) => s.indexOf(l.v) + 1)
    }
    operande(null)
    const k = comparateur()
    if (k <= 0) throw new Error(k < 0 ? 'similar to non pris en charge' : `comparaison attendue (like, ilike, ~, ~*, !~, !~*, position, strpos) près de « ${court(texteJetons(ts.slice(i, i + 4)), 40)} »`)
    let neg = false
    if (k === 2) { neg = true; i++ }
    const x = t(); i++
    let sorte = x.v
    if (x.t === 'op') { if (sorte.startsWith('!')) { neg = !neg; sorte = sorte.slice(1) } }
    const l = t(); if (l?.t !== 'lit') throw new Error('motif littéral attendu après la comparaison'); i++
    let echap = '\\'
    if (mot(t(), 'escape')) { i++; const e = t(); if (e?.t !== 'lit') throw new Error('escape : chaîne attendue'); echap = e.v; i++ }
    const re = sorte === 'like' || sorte === 'ilike' ? likeVersRegex(l.v, sorte === 'ilike', echap) : areVersRegex(l.v, sorte === '~*')
    return (s) => re.test(s) !== neg
  }
  const non = () => {
    if (mot(t(), 'not') && comparateur() !== 2) { i++; const f = non(); return (s) => !f(s) }
    if (t()?.t === '(') {
      const sauve = i
      try { i++; const g = ou(); if (t()?.t !== ')') throw new Error('« ) » attendue'); i++; if (!comparateur()) return g } catch { /* une opérande entre parenthèses */ }
      i = sauve
    }
    return atome()
  }
  const et = () => { let g = non(); while (mot(t(), 'and')) { i++; const d = non(), a = g; g = (s) => a(s) && d(s) } return g }
  const ou = () => { let g = et(); while (mot(t(), 'or')) { i++; const d = et(), a = g; g = (s) => a(s) || d(s) } return g }
  const f = ou()
  if (i !== ts.length) throw new Error(`jeton inattendu « ${court(texteJetons(ts.slice(i, i + 4)), 40)} »`)
  return f
}
function lignesDuControle(ts, alias) {
  const lignes = []
  const mot = (x, v) => !!x && x.t === 'mot' && x.v === v
  for (let i = 0; i < ts.length; i++) {
    if (!mot(ts[i], 'case')) continue
    const ligne = { n: lignes.length + 1, branches: [], sinon: null, erreur: null, litteraux: [], mots: [] }
    lignes.push(ligne)
    let j = i + 1
    if (!mot(ts[j], 'when')) { ligne.erreur = 'case <expression> when … (forme simple) non pris en charge'; continue }
    while (mot(ts[j], 'when')) {
      let k = j + 1, p = 0
      while (k < ts.length && !(p === 0 && mot(ts[k], 'then'))) { if (ts[k].t === '(') p++; else if (ts[k].t === ')') p--; if (mot(ts[k], 'case')) ligne.erreur = 'case imbriqué non pris en charge'; k++ }
      const cond = ts.slice(j + 1, k)
      const val = ts[k + 1]
      for (const x of cond) { if (x.t === 'lit') ligne.litteraux.push(x.v); if (x.t === 'mot') ligne.mots.push(x.v) }
      const b = { cond: null, val: val?.t === 'lit' ? val.v : null, erreur: null }
      if (val?.t !== 'lit') b.erreur = 'valeur de then non littérale'
      else { try { b.cond = compilerCondition(cond, alias) } catch (e) { b.erreur = premiere(e) } }
      ligne.branches.push(b)
      j = k + 2
    }
    if (mot(ts[j], 'else')) { if (ts[j + 1]?.t === 'lit') ligne.sinon = ts[j + 1].v; else ligne.erreur = ligne.erreur || 'valeur de else non littérale'; j += 2 }
    if (!mot(ts[j], 'end')) ligne.erreur = ligne.erreur || '« end » attendu'
    i = j
  }
  return lignes
}
function repondre(ligne, def) {
  if (ligne.erreur) throw new Error(ligne.erreur)
  for (const b of ligne.branches) { if (b.erreur) throw new Error(b.erreur); if (b.cond(def)) return b.val }
  return ligne.sinon
}
/**
 * Le corps muté pour `col` (scripts/fixtures/025/verrous-sql.mjs, fiche 025-13) : l'affectation de la branche du navigateur
 * retirée, remplacée par « -- col », commentée (« -- new.col := … »), enfermée dans /* … *\/, déplacée après le « end if; » du
 * bloc current_user, enfermée sous « if false then … end if; », neutralisée (« new.col := new.col; »). Un contrôle qui dit
 * « oui » sur l'un de ces mutants est aveugle à la branche (constat du 24/09 : l'ancien contrôle disait « oui » après le end if,
 * sous if false, dans un /* *\/) ; null si l'affectation est introuvable à la profondeur 1.
 */
function muter(corps, col, mode) { try { return V.muterAffectation(corps, col, mode) } catch { return null } }
const MODES = V.MODES_BRANCHE
function controleJumeaux(racine, echecs, faits) {
  const ch = chemins(racine)
  const m = lireTexte(ch.M), a = lireTexte(ch.A), n = lireTexte(ch.N), c = lireTexte(ch.C)
  for (const [nom, t] of [[JUMEAU, a], [JUMEAU_NU, n]]) {
    if (t === null) echecs.push(`supabase/migrations/${nom} absent`)
    else if (!t.trim()) echecs.push(`${nom} vide`)
  }
  if (a === null || n === null || !a.trim() || !n.trim()) return
  for (const [nom, t] of [[JUMEAU, a], [JUMEAU_NU, n]]) for (const d of defautsDeSyntaxe(t)) echecs.push(`${nom} ne se parse pas : ${d}`)
  if (!TETE_NU.test(n.split('\n')[0])) echecs.push(`${JUMEAU_NU} : première ligne « ${court(n.split('\n')[0], 60)} », la bande de 28 tirets de sql-nu.mjs attendue (fabriquer par node scripts/sql-nu.mjs <source> <destination> --controle ${CONTROLE_REL}, chemins relatifs)`)
  const morceaux = n.split(MARQUE_CONTROLE)
  if (morceaux.length !== 2) echecs.push(`${JUMEAU_NU} : ${morceaux.length - 1} marque(s) « ${MARQUE_CONTROLE.slice(3, 28)}… », une attendue`)
  const corpsNu = morceaux[0], pied = morceaux.length === 2 ? morceaux[1] : ''
  if (morceaux.length === 2) {
    if (c === null) echecs.push(`pied de ${JUMEAU_NU} invérifiable : ${CONTROLE_REL} absent`)
    else if (pied.trim() !== c.trim()) echecs.push(`le contrôle en pied de ${JUMEAU_NU} n'est pas ${CONTROLE_REL} (${divergence(c.trim(), pied.trim())}) : régénérer avec --controle ${CONTROLE_REL}`)
  }
  const na = noyau(a), nn = noyau(corpsNu)
  if (!na.trim()) echecs.push(`${JUMEAU} : aucun SQL utile`)
  if (m === null) echecs.push(`${MIGRATION} absent : le jumeau ne peut pas être comparé à sa migration`)
  else if (noyau(m) !== na) echecs.push(`${JUMEAU} ne porte pas le SQL de ${MIGRATION} (juge : ${divergence(noyau(m), na)})`)
  if (na !== nn) echecs.push(`${JUMEAU_NU} (avant la marque) ne porte pas le SQL de ${JUMEAU} (juge : ${divergence(na, nn)})`)
  const src = lireTexte(ch.sqlNu)
  if (src === null || !src.trim()) { echecs.push('scripts/sql-nu.mjs absent de la racine : --verifier impossible'); return }
  if (!src.includes(MARQUE_CONTROLE)) echecs.push('scripts/sql-nu.mjs de la racine ne pose plus la marque de contrôle attendue par le juge')
  const w = dossierTravail(JUGE, 'nu')
  const fNu = path.join(w, JUMEAU_NU)
  fs.writeFileSync(fNu, corpsNu, 'utf8')
  const paires = [...(m === null ? [] : [[ch.M, ch.A, `${MIGRATION} → ${JUMEAU}`]]), [ch.A, fNu, `${JUMEAU} → ${JUMEAU_NU} coupé à la marque`]]
  const vus = []
  for (const [x, y, nom] of paires) {
    const r = lancer(process.execPath, [ch.sqlNu, '--verifier', x, y], { cwd: racine, timeout: 60_000 })
    if (r.code !== 0 || !r.stdout.includes('✅')) echecs.push(`sql-nu.mjs --verifier ${nom} : code ${r.code}${r.erreur ? ` (${r.erreur})` : ''} — ${court(r.sortie, 160)}`)
    else vus.push(nom)
  }
  faits.push(`sql-nu.mjs --verifier vert : ${vus.join(' ; ') || 'aucun'}`)
  // la suite des jumeaux, lancée dans la racine (elle lit supabase/migrations relatif au dossier courant)
  const suite = fs.existsSync(ch.jumelles) ? ch.jumelles : path.join(R, 'scripts', 'migrations-jumelles-e2e.mjs')
  if (suite !== ch.jumelles) faits.push('scripts/migrations-jumelles-e2e.mjs absent de la racine : celui du dépôt, lancé dans la racine')
  const r = lancer(process.execPath, [suite], { cwd: racine, timeout: 120_000 })
  const lignes = r.sortie.split(/\r?\n/)
  const rouges = lignes.filter((l) => l.includes('❌'))
  const verts = (nom) => lignes.filter((l) => l.includes('✅') && l.includes(nom)).length
  if (r.code !== 0 || rouges.length) echecs.push(`migrations-jumelles-e2e.mjs : code ${r.code}${r.erreur ? ` (${r.erreur})` : ''}, ${rouges.length} échec(s) : ${rouges.slice(0, 2).map((l) => court(l, 90)).join(' ; ') || court(r.derniereLigne, 90)}`)
  for (const nom of [JUMEAU, JUMEAU_NU]) if (verts(nom) < 4) echecs.push(`migrations-jumelles-e2e.mjs n'a vérifié ${nom} que ${verts(nom)} fois (4 attendues : chaînes, blocs, parenthèses, inclusion dans ${MIGRATION})`)
  if (!r.code && !rouges.length) faits.push(`migrations-jumelles-e2e.mjs vert (${court(r.derniereLigne, 40)}) ; ${JUMEAU} ${verts(JUMEAU)} ✅, ${JUMEAU_NU} ${verts(JUMEAU_NU)} ✅`)
}
function vi4(racine, r1, r2) {
  const echecs = [], faits = []
  const fin = (resume) => ({ ok: echecs.length === 0, echecs, faits, resume })
  controleJumeaux(racine, echecs, faits)
  // le contrôle
  const c = lireTexte(chemins(racine).C)
  if (c === null) { echecs.push(`${CONTROLE_REL} absent`); return fin('') }
  if (!c.trim()) { echecs.push(`${CONTROLE_REL} vide`); return fin('') }
  for (const d of defautsDeSyntaxe(c, { commandes: new Set(['select', 'with']) })) echecs.push(`${CONTROLE_REL} : ${d}`)
  let ts
  try { ts = jetons(sansCommentaires(c)) } catch (e) { echecs.push(`${CONTROLE_REL} illisible par le juge : ${premiere(e)}`); return fin('') }
  const ecritures = [...new Set(ts.filter((x) => x.t === 'mot' && MOTS_ECRITURE.has(x.v)).map((x) => x.v))]
  if (ecritures.length) echecs.push(`${CONTROLE_REL} n'est pas en lecture seule : ${ecritures.join(', ')}`)
  const alias = new Set()
  let lectures = 0
  for (let k = 0; k < ts.length; k++) {
    if (ts[k].t === 'mot' && /^(?:pg_catalog\.)?pg_get_functiondef$/.test(ts[k].v)) {
      if (!operandeValide(ts.slice(k, k + 6), alias)) { echecs.push(`${CONTROLE_REL} : pg_get_functiondef(${court(texteJetons(ts.slice(k + 2, k + 5)), 50)}) ne lit pas public.lock_artisan_privileges_ins()`); continue }
      lectures++
      let q = k + 6
      while (ts[q]?.t === 'op' && ts[q].v === '::' && ts[q + 1]?.t === 'mot') q += 2
      if (ts[q]?.t === 'mot' && ts[q].v === 'as' && ts[q + 1]?.t === 'mot') alias.add(ts[q + 1].v)
    }
  }
  if (!lectures) { echecs.push(`${CONTROLE_REL} ne lit pas pg_get_functiondef('public.lock_artisan_privileges_ins()'::regprocedure)`); return fin('') }
  const prec = r1 && r1.precedente
  if (!prec || !prec.def || prec.def.corps == null) { echecs.push('fonction de 0008 illisible : simulation impossible (voir VI-1)'); return fin('') }
  let corps = r1.structureOk && r2 && r2.ok ? r1.d94.corps : null
  if (corps == null) { corps = corpsAttendu(prec.def.corps); faits.push(`${MIGRATION} absente ou non conforme (VI-1/VI-2) : contrôle jugé contre la fonction attendue (0008 + les ${NOUVELLES.length} lignes)`) }
  const NEUF = [defSimulee(corps), defSimulee(corps.replace(/\r?\n/g, '\r\n'))], ANCIEN = defSimulee(prec.def.corps)
  const mutants = {}
  for (const x of PRIVILEGES) for (const mode of MODES) {
    const mu = muter(corps, x.col, mode)
    if (mu === null) { echecs.push(`simulation : la ligne de ${x.col} est introuvable dans le corps jugé`); return fin('') }
    mutants[`${x.col}/${mode}`] = defSimulee(mu)
  }
  const lignes = lignesDuControle(ts, alias)
  if (!lignes.length) { echecs.push(`${CONTROLE_REL} : aucun « case when … then 'oui' … end » (forme de supabase/controles/0093_site_fige.sql)`); return fin('') }
  const nomme = (l, col) => l.litteraux.some((x) => new RegExp(`\\b${col}\\b`, 'i').test(x.replace(/\\/g, '')))
  const specifiques = new Map(PRIVILEGES.map((x) => [x.col, []]))
  const nonSimulees = []
  for (const l of lignes) {
    const peutOui = l.branches.some((b) => b.val === 'oui') || l.sinon === 'oui'
    let rep
    try {
      rep = { neuf: NEUF.map((d) => repondre(l, d)), ancien: repondre(l, ANCIEN) }
      for (const k of Object.keys(mutants)) rep[k] = repondre(l, mutants[k])
    } catch (e) {
      if (peutOui && PRIVILEGES.some((x) => nomme(l, x.col))) echecs.push(`ligne ${l.n} du contrôle non simulable : ${premiere(e)}`)
      else nonSimulees.push(`ligne ${l.n} (${premiere(e).slice(0, 60)})`)
      continue
    }
    if (peutOui && rep.neuf.some((v) => v !== 'oui')) echecs.push(`ligne ${l.n} du contrôle répond « ${rep.neuf.map((v) => v ?? 'NULL').join(' » / « ')} » sur la fonction de 0094 (LF / CRLF), « oui » attendu`)
    if (rep.neuf.some((v) => v !== 'oui')) continue
    for (const x of PRIVILEGES) {
      const tombe = MODES.every((mode) => rep[`${x.col}/${mode}`] !== 'oui')
      // « oui » quand une AUTRE colonne est retirée, commentée, neutralisée ou déplacée (pas quand un if ou un /* s'intercale
      // avant elle : la ligne de la colonne cherchée ne sait plus, alors, si elle est encore dans la branche)
      const tientLesAutres = PRIVILEGES.every((y) => y.col === x.col || V.MODES_NEUTRES.every((mode) => rep[`${y.col}/${mode}`] === 'oui'))
      if (tombe && tientLesAutres) specifiques.get(x.col).push({ l, rep })
    }
  }
  const couvertes = []
  for (const x of PRIVILEGES) {
    const s = specifiques.get(x.col)
    if (!s.length) {
      const proche = lignes.find((l) => nomme(l, x.col))
      let encore = []
      if (proche) { try { encore = [...new Set(MODES.filter((mode) => repondre(proche, mutants[`${x.col}/${mode}`]) === 'oui').map((mode) => V.DESCRIPTION_MODE[mode]))] } catch { /* ligne non simulable */ } }
      echecs.push(`new.${x.col} := ${canonique(x)} : aucune ligne sensible à la branche (« oui » sur 0094 ; pas « oui » si l'affectation est ${MODES.map((m) => V.DESCRIPTION_MODE[m]).join(', ')} ; « oui » quand une autre colonne bouge)${proche ? ` ; la ligne ${proche.n} ${encore.length ? `dit encore « oui » quand elle est ${encore.join(', ')}` : 'en parle sans tenir ces cas'}` : ''}`)
      continue
    }
    if (x.statut === P) {
      const bonne = s.find(({ rep }) => rep.ancien !== 'oui')
      if (!bonne) { echecs.push(`la ligne ${s[0].l.n} (${x.col}) répond « oui » sur la fonction de 0008, qui ne force pas ${x.col}`); continue }
      couvertes.push(`${x.col} (l.${bonne.l.n})`)
    } else couvertes.push(`${x.col} (l.${s[0].l.n})`)
  }
  // Le déclencheur (025-13) : une ligne qui dit « oui » sur le catalogue pg_trigger de production (relu le 24/09) et pas « oui »
  // s'il est absent, sur une autre fonction (tgfoid), AFTER, FOR EACH STATEMENT, sur UPDATE au lieu d'INSERT, sur une autre table,
  // ou tgenabled 'D', 'R' (réplication seulement : muet pour le navigateur) ou 'A'. Simulée par verrous-sql.mjs.
  const cv = V.lireControle(c)
  const ctxD = (catalogue) => ({ defs: { lock_artisan_privileges_ins: NEUF[0] }, catalogue })
  const essai = (l, catalogue) => { try { return V.repondre(l, ctxD(catalogue)) } catch (e) { return `non simulable (${premiere(e)})` } }
  const mutantsD = V.mutantsDeclencheur('trg_lock_artisan_ins')
  const candidates = cv.lignes.filter((l) => l.litteraux.includes('trg_lock_artisan_ins'))
  const strict = candidates.find((l) => essai(l, V.CATALOGUE_ARTISANS) === 'oui' && mutantsD.every((m) => essai(l, m.catalogue) !== 'oui'))
  if (!strict) {
    const l = candidates[0]
    const detail = !l ? 'aucune ligne ne nomme trg_lock_artisan_ins' : essai(l, V.CATALOGUE_ARTISANS) !== 'oui' ? `la ligne ${l.n} répond « ${essai(l, V.CATALOGUE_ARTISANS)} » sur le catalogue de production` : `la ligne ${l.n} dit encore « oui » avec : ${mutantsD.filter((m) => essai(l, m.catalogue) === 'oui').map((m) => m.nom).join(', ')}`
    echecs.push(`${CONTROLE_REL} ne vérifie pas trg_lock_artisan_ins par sa fonction (tgfoid), BEFORE … FOR EACH ROW, INSERT et tgenabled = 'O' : ${detail}`)
  }
  if (nonSimulees.length) faits.push(`ligne(s) non simulée(s), sans colonne privilégiée : ${nonSimulees.join(', ')}`)
  faits.push(`${lignes.length} ligne(s) case évaluée(s) contre pg_get_functiondef simulé (LF, CRLF, ${Object.keys(mutants).length} mutants, 0008) ; ${lectures} lecture(s) de pg_get_functiondef`)
  return fin(`jumeaux équivalents (juge, sql-nu.mjs --verifier, migrations-jumelles-e2e.mjs), nu fini par ${CONTROLE_REL} ; contrôle en lecture seule, déclencheur vérifié par tgfoid, BEFORE, FOR EACH ROW, INSERT et tgenabled = 'O' (l.${strict?.n}), une ligne « oui » par colonne (LF et CRLF), sensible à la branche (tombe si l'affectation est retirée, commentée, enfermée dans /* */, déplacée après le end if, sous « if false » ou neutralisée), qui ne dit pas « oui » sur 0008 pour les ${NOUVELLES.length} nouvelles : ${couvertes.length}/${PRIVILEGES.length}`)
}

// ── VI-5 : rien d'autre n'a bougé ────────────────────────────────────────────────────────────────────────────────────────
function lireEtat() {
  let e
  try { e = lireJson(ETAT) } catch (x) { throw new Error(`${path.relative(R, ETAT)} illisible : ${premiere(x)}`) }
  if (!/^[0-9a-f]{40}$/.test(e.commit || '')) throw new Error(`${path.relative(R, ETAT)} : commit invalide`)
  if (JSON.stringify(e.prefixes) !== JSON.stringify(PREFIXES)) throw new Error(`${path.relative(R, ETAT)} : préfixes ${JSON.stringify(e.prefixes)}, ${JSON.stringify(PREFIXES)} attendus`)
  if (!e.differents || typeof e.differents !== 'object') throw new Error(`${path.relative(R, ETAT)} : « differents » absent`)
  return e
}
/** L'état de référence : Map(chemin → { blob } (fichier du commit) | { lf } (relevé) | null (supprimé au relevé)). */
function etatReference(etat) {
  const ref = new Map()
  for (const p of PREFIXES) for (const [f, v] of lsTree(R, etat.commit, p)) ref.set(f, { blob: v.sha })
  const commit = new Map(ref)
  for (const [f, s] of Object.entries(etat.differents)) ref.set(f, s === null ? null : { lf: s })
  return { ref, commit }
}
const enLf = (buf) => Buffer.from(buf.toString('latin1').replace(/\r\n/g, '\n'), 'latin1')
const conforme = (buf, attendu) => !!attendu && (attendu.lf ? shaBlob(enLf(buf)) === attendu.lf : (shaBlob(buf) === attendu.blob || shaBlob(enLf(buf)) === attendu.blob))
/** Un fichier de supabase/ d'un numéro SUPÉRIEUR à 0094 (00NN_*.sql, _A_COLLER_sql_editor_00NN[_NU].sql, contrôle 00NN_*.sql) :
 *  l'ajout d'une fiche postérieure (0095 de 025-13…), toléré et noté — ses juges le jugent (verrou-maj-qa), et VI-1 rougit si une
 *  migration postérieure redéfinit la fonction sans garder 0094. */
const numeroPosterieur = (f) => { const m = /^supabase\/(?:migrations|controles)\/(?:(\d{4})_[^/]*|_A_COLLER_sql_editor_(\d{4})(?:_NU)?)\.sql$/.exec(f); return !!m && Number(m[1] ?? m[2]) > NUM }
/**
 * Fichiers de 025-04 que la fiche 025-13 reprend (contrôle de 0093 rendu sensible à la branche, jumeau nu refabriqué avec lui) :
 * acceptés s'ils gardent ce qui compte ici — le contrôle en lecture seule, le jumeau nu porteur du SQL intact de 0093 et du
 * contrôle en pied. Leur contenu est jugé par verrou-site-qa (VS-2, VS-3) et verrou-maj-qa (VM-3, VM-4). → défaut ou null.
 */
const REPRIS = {
  'supabase/controles/0093_site_fige.sql': (racine, buf) => { const c = V.lireControle(buf.toString('utf8')); return c.erreur || c.defauts[0] || (c.ecritures.length ? `n'est plus en lecture seule : ${c.ecritures.join(', ')}` : null) },
  'supabase/migrations/_A_COLLER_sql_editor_0093_NU.sql': (racine, buf) => {
    const [avant, pied, ...reste] = buf.toString('utf8').replace(/\r\n/g, '\n').split(MARQUE_CONTROLE)
    const m = lireTexte(path.join(racine, 'supabase', 'migrations', '0093_site_fige.sql')), c = lireTexte(path.join(racine, 'supabase', 'controles', '0093_site_fige.sql'))
    if (pied === undefined || reste.length) return 'une marque de contrôle attendue'
    if (m === null || noyau(avant) !== noyau(m)) return 'ne porte plus le SQL de 0093_site_fige.sql'
    if (c === null || pied.trim() !== c.trim()) return 'le pied n\'est pas supabase/controles/0093_site_fige.sql'
    return null
  },
}
/**
 * 25/09 (relecture adverse de 0095) : deux fichiers de lib/ que la suite de 025-13 reprend — le préfixe « supprime- » de la purge
 * partagé et refusé par problemeSlug (lib/urls.ts), la purge qui l'importe et prévient sur échec (lib/purgeComptes.ts). Tolérés et
 * notés s'ils gardent ce que le reste du dépôt importe ; leur contenu est jugé par verrou-maj-qa (VM-7). → défaut ou null.
 */
const REPRIS_APP = {
  'lib/urls.ts': (racine, buf) => { const t = buf.toString('utf8'); return /export\s+const\s+SLUGS_RESERVES\b/.test(t) && /export\s+function\s+problemeSlug\b/.test(t) ? null : 'SLUGS_RESERVES ou problemeSlug n\'est plus exporté' },
  'lib/purgeComptes.ts': (racine, buf) => { const t = buf.toString('utf8'); return /export\s+async\s+function\s+purgerComptes\b/.test(t) ? null : 'purgerComptes n\'est plus exportée' },
}
/** Les chemins que git status montrait à la prise (.orchestre/preuves/<prise>/avant.txt ; 025-12, ou --prise=<id>), ou null. */
function lireAvant() {
  const t = lireTexte(AVANT_TXT)
  if (t === null) return null
  const s = new Set()
  for (const l of t.split('\n')) {
    if (l.length < 4) continue
    let p = l.slice(3)
    if (p.includes(' -> ')) p = p.split(' -> ').pop()
    s.add(p.replace(/^"|"$/g, ''))
  }
  return s
}
function vi5(racine) {
  const echecs = [], faits = []
  const fin = (resume) => ({ ok: echecs.length === 0, echecs, faits, resume })
  const etat = lireEtat()
  const { ref, commit } = etatReference(etat)
  const depot = estRacineGit(racine)
  const candidats = new Set(Object.keys(etat.differents))
  if (depot) {
    const d = git(['diff', '--no-renames', '--name-status', '-z', etat.commit, '--', ...PREFIXES], { cwd: racine })
    if (d.code !== 0) { echecs.push(`git diff ${etat.commit.slice(0, 7)} en erreur : ${court(d.stderr || d.erreur)}`); return fin('') }
    const champs = d.stdout.split('\0').filter(Boolean)
    for (let k = 0; k + 1 < champs.length; k += 2) candidats.add(champs[k + 1])
    const o = git(['ls-files', '--others', '--exclude-standard', '-z', '--', ...PREFIXES], { cwd: racine })
    for (const f of o.stdout.split('\0').filter(Boolean)) candidats.add(f)
  } else {
    for (const f of ref.keys()) candidats.add(f)
    for (const p of PREFIXES) for (const f of listerFichiers(path.join(racine, p))) candidats.add(p + f)
  }
  // Ce que d'autres chantiers ont committé depuis le relevé (025-05 touche app/profil, par exemple) n'est pas du fait de la tâche :
  // un fichier identique à son blob de HEAD est accepté et noté. L'exécutant ne committe jamais (règle de l'orchestre).
  const head = new Map()
  for (const p of PREFIXES) for (const [f, v] of lsTree(R, 'HEAD', p)) head.set(f, { blob: v.sha })
  const avant = lireAvant()
  const ecarts = [], ajouts = [], exemptes = [], parCommit = [], posterieurs = [], repris = [], reprisApp = []
  let controles = 0
  for (const f of [...candidats].sort()) {
    controles++
    const abs = path.join(racine, ...f.split('/'))
    const buf = fs.existsSync(abs) && fs.statSync(abs).isFile() ? fs.readFileSync(abs) : null
    const attendu = ref.has(f) ? ref.get(f) : undefined
    const code = f.startsWith('app/') || f.startsWith('lib/')
    if (buf === null ? !attendu : conforme(buf, attendu)) continue
    if (buf !== null && !attendu && AJOUTS_PERMIS.has(f)) { ajouts.push(f); continue }
    if (buf !== null && !attendu && numeroPosterieur(f)) { posterieurs.push(f); continue }
    if (buf !== null && attendu && REPRIS[f]) { const d = REPRIS[f](racine, buf); if (!d) { repris.push(f); continue } ecarts.push(`${f} (repris par 025-13, mais ${d})`); continue }
    if (buf !== null && attendu && REPRIS_APP[f] && !conforme(buf, head.get(f))) { const d = REPRIS_APP[f](racine, buf); if (!d) { reprisApp.push(f); continue } ecarts.push(`${f} (repris par la suite de 025-13, mais ${d})`); continue }
    // committé depuis le relevé : contenu = blob de HEAD, ou suppression d'un fichier suivi au commit relevé et absent de HEAD
    if (buf === null ? (commit.has(f) && !head.has(f)) : conforme(buf, head.get(f))) { parCommit.push(f); continue }
    // déjà dans git status à la prise de la tâche : non reproché sous app/ et lib/ ; sous supabase/, seulement pour un fichier
    // NOUVEAU (une migration existante, 0093 comprise, ne se touche jamais, même si elle n'était pas committée)
    if (avant && avant.has(f) && (code || !attendu)) { exemptes.push(f); continue }
    ecarts.push(`${f} (${buf === null ? 'absent' : attendu ? 'modifié' : 'ajouté'})`)
  }
  const mig = ecarts.filter((x) => x.startsWith('supabase/')), app = ecarts.filter((x) => !x.startsWith('supabase/'))
  if (mig.length) echecs.push(`${mig.length} fichier(s) de supabase/migrations ou supabase/controles changé(s) hors des quatre de 0094 : ${mig.slice(0, 5).join(', ')}${mig.length > 5 ? '…' : ''}`)
  if (app.length) echecs.push(`${app.length} fichier(s) de app/ ou lib/ changé(s) (interdits à ${PRISE}) : ${app.slice(0, 5).join(', ')}${app.length > 5 ? '…' : ''} — si ce n'est pas vous, écrire .orchestre/en-cours/${PRISE}.question.md, ne rien toucher`)
  if (exemptes.length) faits.push(`déjà dans git status à la prise de ${PRISE} (avant.txt), non reproché(s) : ${exemptes.join(', ')}`)
  if (parCommit.length) faits.push(`committé(s) depuis le relevé (identique(s) à HEAD), non reproché(s) : ${parCommit.join(', ')}`)
  if (posterieurs.length) faits.push(`ajouts de fiches postérieures (numéro > 0094), tolérés : ${posterieurs.join(', ')}`)
  if (repris.length) faits.push(`repris par 025-13 et conformes (lecture seule ; SQL de 0093 intact, contrôle en pied) : ${repris.join(', ')}`)
  if (reprisApp.length) faits.push(`repris par la suite de 025-13 (25/09, préfixe « supprime- » de la purge), tolérés, jugés par verrou-maj-qa VM-7 : ${reprisApp.join(', ')}`)
  faits.push(`état de référence : ${etat.commit.slice(0, 7)} + ${Object.keys(etat.differents).length} fichier(s) relevé(s) le ${String(etat.releve_le).slice(0, 10)} ; ${depot ? 'git diff + fichiers non suivis' : 'fichier par fichier'} ; ${controles} chemin(s) examiné(s)${avant ? '' : ' ; avant.txt de la prise absent (juge lancé hors orchestre)'}`)
  return fin(`${ref.size} fichiers de référence sous ${PREFIXES.join(', ')} présents et identiques (${depot ? 'dépôt' : 'arbre'}) ; ajout(s) : ${ajouts.length ? ajouts.join(', ') : 'aucun'} (seuls permis : les quatre de 0094)`)
}

// ── Témoin et mutations ──────────────────────────────────────────────────────────────────────────────────────────────────
/** Retire les copies de app/ et lib/ d'un arbre de travail du juge : tsc --noEmit lit **\/*.tsx (tsconfig.json), il les typechecherait. */
function retirerCopiesDuCode(dossier) {
  const d = exigerSousTravail(dossier)
  if (!sous(path.join(TRAVAIL, JUGE), d)) throw new Error(`${d} n'est pas un arbre de ${JUGE}`)
  for (const p of ['app', 'lib']) fs.rmSync(path.join(d, p), { recursive: true, force: true })
}
function preparerTemoinInsertion(base) {
  const { ref } = etatReference(lireEtat())
  const voulus = [...[...ref].filter(([, v]) => v !== null).map(([f]) => f), 'scripts/sql-nu.mjs', 'scripts/migrations-jumelles-e2e.mjs']
  const presents = voulus.filter((rel) => fs.existsSync(path.join(base, rel)))
  const superposer = path.join(FIXTURES, 'temoins', JUGE)
  for (const f of [`supabase/migrations/${MIGRATION}`, `supabase/migrations/${JUMEAU}`, `supabase/migrations/${JUMEAU_NU}`, CONTROLE_REL]) {
    if (!fs.existsSync(path.join(superposer, f))) throw new Error(`témoin incomplet : ${path.relative(R, superposer)}/${f} absent`)
  }
  const dest = preparerTemoin(JUGE, { base, copier: presents, superposer })
  // 025-13 (24/09) : un fichier de app/ ou lib/ que d'autres chantiers ont changé depuis le relevé est rebâti depuis son blob du
  // commit relevé (app/api/leads/route.ts rendait le témoin rouge en VI-5 sans que 0094 y soit pour rien) ; sans blob (fichier
  // relevé non committé), il reste la copie de la racine et VI-5 le dira.
  const etat = lireEtat()
  const refEtat = etatReference(etat).ref
  for (const rel of presents) {
    const v = refEtat.get(rel)
    if (!v || !v.blob || fs.existsSync(path.join(superposer, rel))) continue
    const f = path.join(dest, ...rel.split('/'))
    if (conforme(fs.readFileSync(f), v)) continue
    const b = blobGit(R, etat.commit, rel)
    if (b) fs.writeFileSync(f, b)
  }
  return { dest, absents: voulus.filter((rel) => !presents.includes(rel)) }
}
const LIGNES_NOUVELLES = (t) => t.split('\n').filter((l) => NOUVELLES.some((x) => new RegExp(`^\\s*new\\.${x.col}\\s*:=`).test(l)))
const MUTATIONS = [
  {
    id: 'MUT-OUBLI', attendu: 'VI-2', quoi: 'une colonne oubliée : « new.role_interne := null; » retirée',
    muter: (t) => t.split('\n').filter((l) => !/^\s*new\.role_interne\s*:=/.test(l)).join('\n'),
  },
  {
    id: 'MUT-SLUG', attendu: 'VI-3', quoi: 'slug écrasé : « new.slug := null; » ajoutée dans la branche du navigateur',
    muter: (t) => t.replace(/^(\s*)new\.created_at := now\(\);$/m, '$1new.created_at := now();\n$1new.slug := null;'),
  },
  {
    id: 'MUT-SERVICE', attendu: 'VI-1', quoi: 'service_role bloqué : les 17 lignes déplacées après le « end if; » (forcées pour tous)',
    muter: (t) => {
      const nouvelles = LIGNES_NOUVELLES(t)
      const sans = t.split('\n').filter((l) => !nouvelles.includes(l)).join('\n')
      return sans.replace(/^(\s*)end if;$/m, (m, r) => `${m}\n${nouvelles.map((l) => `${r}${l.trim()}`).join('\n')}`)
    },
  },
  // 025-13 : le contrôle aveugle à la branche (le défaut constaté le 24/09) ne passe plus
  {
    id: 'MUT-AVEUGLE', attendu: 'VI-4', cible: 'controle', quoi: 'contrôle aveugle à la branche : chaque ligne revient à « (^|\\n)\\s*new.<col>… » (oui après le end if, sous if false, dans /* */)',
    muter: (t) => { if (!t.includes(BRANCHE_SQL)) throw new Error('mutation sans prise : motif de branche absent du contrôle témoin'); return t.split(BRANCHE_SQL).join(String.raw`(^|\n)\s*`) },
  },
  {
    id: 'MUT-DECLENCHEUR', attendu: 'VI-4', cible: 'controle', quoi: 'déclencheur aveugle : « tgname = \'trg_lock_artisan_ins\' … tgenabled <> \'D\' » (ni tgfoid, ni BEFORE, ni FOR EACH ROW, R accepté)',
    muter: (t) => { const re = /exists \(select 1 from pg_trigger t\s+where t\.tgname = 'trg_lock_artisan_ins'[\s\S]*?t\.tgenabled = 'O'\)/; if (!re.test(t)) throw new Error('mutation sans prise : ligne du déclencheur'); return t.replace(re, "exists (select 1 from pg_trigger where tgname = 'trg_lock_artisan_ins' and tgrelid = 'public.artisans'::regclass and tgenabled <> 'D')") },
  },
]
/** Le motif de branche des contrôles témoins (scripts/fixtures/025/temoins/*, fiche 025-13), tel qu'écrit en SQL. */
const BRANCHE_SQL = String.raw`if\s+current_user\s+not\s+in\s*\(\s*''service_role''\s*,\s*''postgres''\s*\)\s*then[ \t\r]*(?:--[^\n]*)?(?:\n(?:(?!\mif\M|\melse\M|\melsif\M|\mend\M|/\*|--)[^\n])*(?:--[^\n]*)?)*?\n\s*`
async function mutations(s) {
  const { dest } = preparerTemoinInsertion(R)
  const arbres = [dest]
  try { await mutationsSur(s, dest, arbres) } finally { for (const a of arbres) retirerCopiesDuCode(a) }
}
async function mutationsSur(s, dest, arbres) {
  const lancerJuge = (racine) => lancer(process.execPath, [path.join(R, 'scripts', `${JUGE}.mjs`), `--racine=${racine}`], { cwd: R, timeout: 15 * 60_000 })
  // MUT-T : le témoin, jugé comme une racine quelconque, est vert
  const t = lancerJuge(dest)
  const at = analyserSortie(t.sortie)
  s.verdict('MUT-T', t.code === 0 && at.verdict === 'PASS' && at.lignes.length === 5 && at.lignes.every((l) => l.verdict === 'PASS'),
    `témoin ${path.relative(R, dest)} : code 0, ${at.lignes.length} critères PASS`,
    `témoin : code ${t.code}, verdict ${at.verdict ?? '?'}, rouges ${at.rouges.join(', ') || '—'} — ${court(t.sortie.split('\n').filter((l) => l.startsWith('FAIL')).join(' | '), 300)}`)
  const texteTemoin = fs.readFileSync(path.join(dest, 'supabase', 'migrations', MIGRATION), 'utf8').replace(/\r\n/g, '\n')
  const controleTemoin = fs.readFileSync(path.join(dest, ...CONTROLE_REL.split('/')), 'utf8').replace(/\r\n/g, '\n')
  for (const m of MUTATIONS) {
    try {
      const dossier = dossierTravail(JUGE, 'mutations', m.id.toLowerCase())
      arbres.push(dossier)
      fs.cpSync(dest, dossier, { recursive: true })
      const origine = m.cible === 'controle' ? controleTemoin : texteTemoin
      const mute = m.muter(origine)
      if (mute === origine) throw new Error('mutation sans effet : le texte du témoin n\'a pas changé')
      const rel = (f) => `supabase/migrations/${f}`
      if (m.cible === 'controle') fs.writeFileSync(path.join(dossier, ...CONTROLE_REL.split('/')), mute, 'utf8')
      else {
        fs.writeFileSync(path.join(dossier, rel(MIGRATION)), mute, 'utf8')
        fs.writeFileSync(path.join(dossier, rel(JUMEAU)), mute, 'utf8')
      }
      const g = lancer(process.execPath, ['scripts/sql-nu.mjs', rel(MIGRATION), rel(JUMEAU_NU), '--controle', CONTROLE_REL], { cwd: dossier, timeout: 60_000 })
      if (g.code !== 0) throw new Error(`sql-nu.mjs a refusé le jumeau nu muté : ${court(g.sortie, 120)}`)
      const r = lancerJuge(dossier)
      const a = analyserSortie(r.sortie)
      const detail = a.lignes.find((l) => l.id === m.attendu)?.detail || ''
      const casse = /^(?:interrompu|non évalué)/.test(detail)
      s.verdict(m.id, r.code === 1 && a.verdict === 'FAIL' && a.rouges.includes(m.attendu) && !casse,
      `${m.quoi} → rouge (${a.rouges.join(', ')}) ; ${m.attendu} : ${court(detail, 170)}`,
      `${m.quoi} → code ${r.code}, verdict ${a.verdict ?? '?'}, rouges ${a.rouges.join(', ') || 'aucun'} (${m.attendu} rouge attendu${casse ? ', et pas interrompu' : ''})`)
    } catch (e) { s.echoue(m.id, `interrompu : ${premiere(e)}`) }
  }
}

// ── Le juge ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function evaluer(s, id, f) {
  try {
    const r = await f()
    s.resultat(id, { ok: r.ok && r.echecs.length === 0, echecs: r.echecs, resume: r.resume })
    for (const x of r.faits || []) s.note(`${id} : ${x}`)
    return r
  } catch (e) { s.echoue(id, `interrompu : ${premiere(e)}`); return null }
}

const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['mutations', 'prise'] })
if (o.reel) { console.error('✗ --reel : ce juge n\'a pas d\'essai réel ; la preuve sur la base est l\'essai à sec de la fiche 025-12 (DO … raise exception), puis le contrôle après collage'); process.exit(2) }
if (o.drapeau('prise')) { console.error('✗ --prise attend un identifiant de fiche : --prise=025-13'); process.exit(2) }
if (o.valeur('prise') !== undefined) {
  if (!/^\d{3}-\d{2}$/.test(o.valeur('prise'))) { console.error(`✗ --prise=${o.valeur('prise')} : identifiant de fiche attendu (NNN-NN)`); process.exit(2) }
  PRISE = o.valeur('prise')
  AVANT_TXT = path.join(R, '.orchestre', 'preuves', PRISE, 'avant.txt')
}
if (o.valeur('mutations') !== undefined) { console.error('✗ --mutations ne prend pas de valeur'); process.exit(2) }
const avecMutations = o.drapeau('mutations')
if (avecMutations && (o.temoin || !o.racineParDefaut)) { console.error('✗ --mutations se lance seul, sur la racine du dépôt (ni --temoin, ni --racine=…)'); process.exit(2) }
if (o.positionnels.length) { console.error(`✗ argument(s) inattendu(s) : ${o.positionnels.join(' ')}`); process.exit(2) }

let racine = o.racine, erreurTemoin = null, absents = []
if (o.temoin) { try { const t = preparerTemoinInsertion(o.racine); racine = t.dest; absents = t.absents } catch (e) { erreurTemoin = e } }
const ids = avecMutations ? ['MUT-T', ...MUTATIONS.map((m) => m.id)] : ['VI-1', 'VI-2', 'VI-3', 'VI-4', 'VI-5']
const s = creerSortie(JUGE, ids, { racine, temoin: o.temoin })
await s.executer(async (s) => {
  if (avecMutations) { await mutations(s); return }
  if (erreurTemoin) throw erreurTemoin
  if (o.temoin) s.note(`témoin : fichiers de l'état de référence copiés depuis ${o.racine}${absents.length ? ` (${absents.length} absent(s) : ${absents.slice(0, 3).join(', ')})` : ''}, puis scripts/fixtures/025/temoins/${JUGE}/ superposé`)
  const r1 = await evaluer(s, 'VI-1', () => vi1(racine))
  const r2 = await evaluer(s, 'VI-2', () => vi2(racine, r1))
  await evaluer(s, 'VI-3', () => vi3(racine, r1))
  await evaluer(s, 'VI-4', () => vi4(racine, r1, r2))
  await evaluer(s, 'VI-5', () => vi5(racine))
})
if (o.temoin && !erreurTemoin) retirerCopiesDuCode(racine)
