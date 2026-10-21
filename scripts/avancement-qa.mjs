#!/usr/bin/env node
// scripts/avancement-qa.mjs — juge de l'AVANCEMENT DES CHANTIERS SANS RESSAISIE (décision B du fondateur, 21/10/2026). Gratuit :
// aucun réseau, aucune base, aucun envoi, aucun appel IA ; fonctions pures + texte des sources.
//
//  A. L'ASSISTANT (outil avancer_chantier, lib/assistant/avancement.ts) : « carrelage salle de bain fini » coche les bonnes tâches,
//     ambigu → rien n'est coché et les candidates sont rendues, rien → rien ; action INTERNE (directe, journal, annulable), par la
//     route PATCH /api/crm/taches/<id>, jamais un envoi au client.
//  B. LA PHOTO « APRÈS » (lib/crm/avancementAuto.ts, POST /api/crm/pieces, « Photos et pièces ») : elle PROPOSE de cocher les
//     tâches de la pièce reconnue dans la légende ; rien n'est coché sans le clic de l'artisan.
//  C. LE LIEN DE POINTAGE du compagnon (/pointage/<jeton>, table chantier_pointage, migration 0174, drapeau crmPointage) : sans
//     compte, il ne peut QUE cocher « fait » des tâches de CE chantier ; jeton secret, empreinte seule, page sans script ni prix.
//  D. LANCEUR.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/avancement-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && w.name !== 'ExperimentalWarning') console.error(w) })
const rouges = []
let verts = 0
const T = (nom, cond, detail = '') => { if (cond) { verts++; console.log(`PASS ${nom}`) } else { rouges.push(nom); console.log(`FAIL ${nom}${detail ? ' — ' + String(detail).slice(0, 500) : ''}`) } }
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8').replace(/\r\n/g, '\n')
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const sansCommentaires = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '')
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const { FLAGS } = await imp('lib/flags.ts')
const Av = await imp('lib/assistant/avancement.ts')
const Auto = await imp('lib/crm/avancementAuto.ts')
const { SPEC, categorieDe } = await imp('lib/assistant/outils-actions.ts')

// Un chantier « d'avant » : salle de bain, cuisine, WC.
const TACHES = [
  { id: U(1), libelle: 'Dépose ancienne faïence salle de bain', faite: true, piece: null },
  { id: U(2), libelle: 'Pose carrelage sol salle de bain', faite: false, piece: null },
  { id: U(3), libelle: 'Pose faïence murale', faite: false, piece: 'Salle de bain' },
  { id: U(4), libelle: 'Pose carrelage cuisine', faite: false, piece: null },
  { id: U(5), libelle: 'Joints crédence', faite: false, piece: 'Cuisine' },
  { id: U(6), libelle: 'Remplacement cuvette WC', faite: false, piece: null },
]

// ═══════════════════════ A. L'assistant ═══════════════════════
{
  const net = Av.correspondanceAvancement(TACHES, 'carrelage salle de bain fini')
  T('A1 « carrelage salle de bain fini » → NET : la seule tâche « carrelage » de la salle de bain (pas celle de la cuisine, pas une tâche déjà faite)', net.statut === 'net' && egal(net.taches.map((t) => t.id), [U(2)]) && net.piece === 'Salle de bain')
  const piece = Av.correspondanceAvancement(TACHES, 'la salle de bain est terminée')
  T('A2 « la salle de bain est terminée » → NET : toutes les tâches NON faites de la pièce (libellé ou pièce choisie)', piece.statut === 'net' && egal(piece.taches.map((t) => t.id).sort(), [U(2), U(3)]))
  const amb = Av.correspondanceAvancement(TACHES, 'carrelage fini')
  T('A3 « carrelage fini » sans pièce, deux pièces concernées → AMBIGU : rien n’est coché, les candidates sont rendues', amb.statut === 'ambigu' && egal(amb.candidates.map((t) => t.id).sort(), [U(2), U(4)]))
  const rien = Av.correspondanceAvancement(TACHES, 'peinture du garage finie')
  T('A4 rien ne correspond → RIEN (et pas une tâche approchante cochée)', rien.statut === 'rien' && Av.correspondanceAvancement(TACHES, 'c’est fini').statut === 'rien')
  T('A5 l’avancement est LA règle de la fiche (lib/crm/chantier.ts), pas une copie : 1/6 → 2/6', Av.pctAvancement(TACHES) === Math.round(100 / 6) && Av.pctAvancement(TACHES.map((t) => (t.id === U(2) ? { ...t, faite: true } : t))) === Math.round(200 / 6))
  T('A6 avancer_chantier : action DIRECTE du CRM (interne : exécutée et journalisée, pas un envoi au client), jamais pilotée',
    !!SPEC.avancer_chantier && categorieDe('avancer_chantier') === 'direct' && SPEC.avancer_chantier.crm === true && (await imp('lib/pilote/regles.ts')).typePiloteDeOutil('avancer_chantier') === null)
  const src = sansCommentaires(lire('lib/assistant/actions-tout.ts'))
  const bloc = src.slice(src.indexOf('R.avancer_chantier = async'), src.indexOf('INV.restaurer_taches'))
  T('A7 réalisation : les tâches du chantier de l’artisan (artisan_id = uid), cochées par la route PATCH /api/crm/taches/<id>, ambigu/rien → rien n’est écrit, annulable (restaurer_taches)',
    /\.eq\('artisan_id', b\.uid\)/.test(src.slice(src.indexOf('async function tachesDe'), src.indexOf('R.avancer_chantier'))) && /route\(tacheMaj, `\/api\/crm\/taches\/\$\{t\.id\}`, \{ methode: 'PATCH', corps: \{ faite: true \}/.test(bloc)
    && bloc.indexOf("m.statut === 'ambigu') return ko(") < bloc.indexOf('route(tacheMaj') && bloc.indexOf("m.statut === 'rien') return ko(") < bloc.indexOf('route(tacheMaj') && /annulation: \{ outil: 'restaurer_taches'/.test(bloc) && !/sendEmail|envoyer/.test(bloc))
}

// ═══════════════════════ B. La photo « Après » ═══════════════════════
{
  const p = Auto.tachesPourPhotoApres({ type: 'apres', legende: 'Salle de bain refaite', taches: TACHES })
  T('B1 photo « Après » légendée « Salle de bain refaite » → propose les tâches NON faites de la salle de bain', p.piece === 'Salle de bain' && egal(p.taches.map((t) => t.id).sort(), [U(2), U(3)]))
  T('B2 une photo « Avant » / « Pendant » / « Problème » ne propose rien', ['avant', 'pendant', 'probleme', 'plan'].every((type) => Auto.tachesPourPhotoApres({ type, legende: 'Salle de bain', taches: TACHES }).taches.length === 0))
  T('B3 légende sans pièce reconnue (ou absente) → rien : on ne devine pas la pièce', Auto.tachesPourPhotoApres({ type: 'apres', legende: 'Super résultat', taches: TACHES }).taches.length === 0 && Auto.tachesPourPhotoApres({ type: 'apres', legende: null, taches: TACHES }).taches.length === 0)
  T('B4 pièce reconnue mais tout y est fait → rien à proposer', Auto.tachesPourPhotoApres({ type: 'apres', legende: 'WC terminés', taches: TACHES.map((t) => ({ ...t, faite: true })) }).taches.length === 0)
  const route = sansCommentaires(lire('app/api/crm/pieces/route.ts'))
  const bloc = route.slice(route.indexOf("if (champs.valeur.type === 'apres'"))
  T('B5 la route PROPOSE seulement (aucune écriture de tâche) : lecture filtrée chantier + artisan_id = uid, réponse `avancement_propose`, après l’enregistrement de la photo',
    /\.from\('chantier_taches'\)\.select\('id, libelle, faite, piece'\)\.eq\('chantier_id', chantierId\)\.eq\('artisan_id', g\.uid\)/.test(bloc) && /avancement_propose: prop/.test(bloc)
    && !/from\('chantier_taches'\)\.update/.test(route) && route.indexOf("from('chantier_pieces').insert") < route.indexOf("champs.valeur.type === 'apres'") && /actif\('crmPlan'\)/.test(bloc))
  const ui = lire('app/crm/Pieces.tsx')
  T('B6 l’écran demande la confirmation : « Cocher » passe par PATCH /api/crm/taches/<id> (le chemin du clic), « Pas encore » ne fait rien',
    /r\.corps\.avancement_propose\?\.taches\?\.length\) setProposition/.test(ui) && /appel\(`\/api\/crm\/taches\/\$\{t\.id\}`, \{ method: 'PATCH', body: \{ faite: true \} \}\)/.test(ui) && />Pas encore<\/button>/.test(ui) && /onClick=\{\(\) => setProposition\(null\)\}/.test(ui))
}

// ═══════════════════════ C. Le lien de pointage du compagnon ═══════════════════════
{
  const permis = new Set([U(2), U(3)])
  const corps = `fait=${U(2)}&fait=${U(2).toUpperCase()}&fait=${U(4)}&fait=pas-un-uuid&fait=${U(3)}&autre=${U(5)}`
  T('C1 formulaire : seulement des tâches NON FAITES de CE chantier ; identifiant inventé, d’un autre chantier, mal formé, doublon ou autre champ : ignorés',
    egal(Auto.lireFormulairePointage(corps, permis).sort(), [U(2), U(3)]) && Auto.lireFormulairePointage('', permis).length === 0)
  const beaucoup = new Set(Array.from({ length: 100 }, (_, i) => U(1000 + i)))
  T(`C2 au plus ${Auto.POINTAGE_MAX} tâches par envoi`, Auto.lireFormulairePointage([...beaucoup].map((id) => `fait=${id}`).join('&'), beaucoup).length === Auto.POINTAGE_MAX)
  const v = Auto.vuePointage({ entreprise: 'Atelier Durand', titre: 'Rénovation SDB', taches: TACHES })
  T('C3 la vue : les tâches RESTANTES (avec leur pièce), le compte fait / total — rien d’autre (ni prix, ni adresse, ni client)',
    v.restantes.length === 5 && v.faites === 1 && v.total === 6 && egal(Object.keys(v).sort(), ['entreprise', 'faites', 'message', 'restantes', 'titre', 'total']) && v.restantes.every((t) => egal(Object.keys(t).sort(), ['id', 'libelle', 'piece'])))
  const page = Auto.pagePointage(Auto.vuePointage({ entreprise: 'A & B', titre: '<script>alert(1)</script>', taches: [{ id: U(9), libelle: '"><img src=x onerror=alert(1)>', faite: false }] }))
  T('C4 la page est autonome et sûre : aucun script, texte échappé (titre et libellés), formulaire POST vers elle-même, cases de 44 px au moins',
    !/<script/i.test(page) && !/<img/i.test(page) && page.includes('&lt;script&gt;') && page.includes('A &amp; B') && /<form method="post">/.test(page) && /min-height:44px/.test(page) && /name="fait" value="00000000-0000-4000-8000-000000000009"/.test(page))
  T('C5 tout fait : la page le dit, sans formulaire', !/<form/.test(Auto.pagePointage(Auto.vuePointage({ entreprise: null, titre: null, taches: [{ id: U(1), libelle: 'x', faite: true }] }))))
  const r = sansCommentaires(lire('app/pointage/[jeton]/route.ts'))
  T('C6 page publique : drapeau crmPointage AVANT toute lecture, débit limité, jeton au format exact, empreinte SHA-256 seule cherchée',
    r.indexOf("if (!actif('crmPointage')) return { reponse: introuvable() }") > 0 && r.indexOf("actif('crmPointage')") < r.indexOf('consommerLimite(') && r.indexOf('consommerLimite(') < r.indexOf(".from('chantier_pointage')")
    && /RE_JETON_POINTAGE\.test\(jeton\)/.test(r) && /createHash\('sha256'\)\.update\(jeton\)\.digest\('hex'\)/.test(r) && /\.eq\('jeton_empreinte', empreinte\)/.test(r))
  T('C7 à chaque requête : offre du compte (capacité crm), essai, compte non suspendu ; chantier annulé ou terminé → 404',
    /peut\(art\.plan as string \| null, 'crm'\)/.test(r) && /ouvertPour\('crm', uid\)/.test(r) && /suspensionEnCours\(uid\)/.test(r) && /chd\.statut === 'annule' \|\| chd\.statut === 'termine'\) return \{ reponse: introuvable\(\) \}/.test(r))
  // Audit offensif du 21/10 (F4) : le titre saisi par l'artisan peut contenir le nom ou l'adresse du client.
  T('F4a la page de pointage ne lit PAS le titre du chantier : nom neutre « Chantier réf. XXXX — type de bâtiment », jamais d’adresse',
    !/select\('titre/.test(r) && !/titre: ch\.data\.titre/.test(r) && /titre: libelleNeutre\(lien\.chantier_id as string, chd\.type_batiment \?\? null\)/.test(r))
  T('F4b libelleNeutre : référence courte tirée de l’identifiant, type de bâtiment en clair, rien d’autre',
    Auto.libelleNeutre('3f2a9c00-0000-4000-8000-000000000001', 'maison') === 'Chantier réf. 3F2A — Maison' && Auto.libelleNeutre('3f2a9c00-0000-4000-8000-000000000001', null) === 'Chantier réf. 3F2A' && Auto.libelleNeutre('3f2a9c00-0000-4000-8000-000000000001', 'inconnu') === 'Chantier réf. 3F2A')
  T('C8 l’écriture : SEULEMENT « faite: true », sur les tâches choisies, de CE chantier, de CE compte, encore à faire — jamais décocher, renommer ni supprimer',
    /update\(\{ faite: true, faite_le: new Date\(\)\.toISOString\(\) \}\)\s*\.in\('id', ids\)\.eq\('chantier_id', o\.chantierId\)\.eq\('artisan_id', o\.uid\)\.eq\('faite', false\)/.test(r) && !/faite: false|\.delete\(|libelle:/.test(r.slice(r.indexOf('export async function POST'))))
  T('C9 en-têtes : noindex, no-store, aucune référence sortante, CSP sans script (formulaire vers soi seulement)', /'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"/.test(lire('app/pointage/[jeton]/route.ts')) && /'X-Robots-Tag': 'noindex, nofollow, noarchive'/.test(r) && /'Referrer-Policy': 'no-referrer'/.test(r))
  const lien = lire('app/api/crm/chantiers/[id]/pointage/route.ts')
  const gardes = [...lien.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE|OPTIONS)\(req: Request(, ctx: Ctx)?\) \{\n  const g = await gardeCrm\(req, \{ drapeau: 'crmPointage' \}\)\n  if \('reponse' in g\) return g\.reponse/g)].length
  T('C10 le lien (créer, remplacer, révoquer) : six méthodes, toutes derrière gardeCrm (drapeau crmPointage, session, offre CRM), jeton 32 octets, empreinte seule, artisan_id = uid',
    gardes === 6 && /randomBytes\(32\)\.toString\('base64url'\)/.test(lien) && /jeton_empreinte: empreinte/.test(lien) && (lien.match(/\.eq\('artisan_id', g\.uid\)/g) ?? []).length >= 2 && /artisan_id: g\.uid/.test(lien))
  T('C11 drapeau crmPointage commenté et daté, ordre « 0174 puis lever », LEVÉ le 21/10 après 0174 ; la fiche ne montre le bloc que drapeau levé',
    FLAGS.crmPointage === true && /21\/10\/2026 — CRM : le LIEN DE POINTAGE[\s\S]{0,600}0174[\s\S]{0,300}21\/10\/2026 — LEVÉ[\s\S]{0,200}crmPointage: true/.test(lire('lib/flags.ts')) && /\{actif\('crmPointage'\) && c\.statut !== 'annule' && c\.statut !== 'termine' && <PointageCompagnon/.test(lire('app/crm/FicheChantier.tsx')))
  const mig = lire('supabase/migrations/0174_pilote_automatique.sql')
  T('C12 table chantier_pointage : un lien par chantier, empreinte hexadécimale unique, déclencheur de propriété, RLS sans politique',
    /chantier_id\s+uuid primary key references public\.chantiers\(id\) on delete cascade/.test(mig) && /jeton_empreinte\s+text not null unique check \(jeton_empreinte ~ '\^\[0-9a-f\]\{64\}\$'\)/.test(mig) && /create trigger crm_pointage_verifier/.test(mig) && /alter table public\.chantier_pointage enable row level security/.test(mig))
  T('C13 « pointage » est un chemin technique (jamais pris pour le nom d’un artisan sur un domaine)', /'suivi', 'pointage'\]\)/.test(lire('proxy.ts')))
  T('C14 le choix est écrit : pourquoi la photo et le pointage, pourquoi PAS la facture d’acompte ni la sortie de matériel', /Écartés pour cette version : la facture d'acompte\/situation[\s\S]{0,200}deviner serait de la fabrication[\s\S]{0,200}sortie de matériel/.test(lire('lib/crm/avancementAuto.ts')))
}

// ═══════════════════════ D. Lanceur ═══════════════════════
T('D1 la suite est au tableau SUITES de scripts/tout-verifier.mjs (cout: gratuit)', /scripts\/avancement-qa\.mjs'\], cout: 'gratuit'/.test(lire('scripts/tout-verifier.mjs')))

console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)${rouges.length ? ' : ' + rouges.join(' · ') : ''}`)
process.exitCode = rouges.length ? 1 : 0
