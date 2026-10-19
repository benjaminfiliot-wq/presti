#!/usr/bin/env node
// scripts/crm-lot5-qa.mjs — juge du LOT 5 des améliorations du CRM (plan plans/crm-idees-twenty-1810.md, n°8, version 1) : le PLAN
// DU CHANTIER par pièce (un schéma, pas un plan à l'échelle), sous le drapeau crmPlan, colonne chantier_taches.piece (migration 0166).
//
//  A. RÈGLES (lib/crm/plan.ts) : la pièce reconnue dans un libellé, la pièce choisie qui l'emporte, l'état et le pourcentage de
//     chaque pièce, l'équipe par pièce, « Général » en dernier.
//  B. CRÉATION DEPUIS LE DEVIS (lib/crm/chantier.ts) : chaque tâche reçoit la pièce de sa désignation ; elle n'est écrite que
//     drapeau levé (sinon la colonne n'existe peut-être pas encore).
//  C. CODE ET MIGRATION : routes des tâches (pièce refusée drapeau baissé), fiche (colonne lue drapeau levé), écran (schéma
//     sous drapeau, listes masquées plutôt que montées et démontées), 0166 additive et idempotente, jumeau _NU.
//  L. EN VRAI (TEST_BASE, serveur au drapeau levé, 0166 appliquée) : tâches générées depuis un devis avec leur pièce, pièce
//     corrigée, fiche qui la rend, isolation. Nettoyage en finally.
//
// Usage : [TEST_BASE=http://localhost:3219] node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-lot5-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && w.name !== 'ExperimentalWarning') console.error(w) })
const rouges = []
let verts = 0
const T = (nom, cond, detail = '') => { if (cond) { verts++; console.log(`PASS ${nom}`) } else { rouges.push(nom); console.log(`FAIL ${nom}${detail ? ' — ' + String(detail).slice(0, 500) : ''}`) } }
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8')
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const sansCommentaires = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '')
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const P = await imp('lib/crm/plan.ts')
const C = await imp('lib/crm/chantier.ts')
const { FLAGS } = await imp('lib/flags.ts')

// ═══════════════════════ A. Règles ═══════════════════════
{
  const cas = [['Pose d’une douche à l’italienne', 'Salle de bain'], ['Dépose WC et pose bâti-support', 'WC'], ['Évier inox 2 bacs', 'Cuisine'], ['Radiateur chambre 2', 'Chambre'], ['Peinture salon', 'Séjour'], ['Réfection de la toiture', 'Toiture'], ['Ravalement de façade', 'Façade'], ['Clôture du jardin', 'Extérieur'], ['Remplacement chaudière (chaufferie)', 'Garage'], ['Raccordement de l’entrée d’eau', null], ['Main d’œuvre', null], ['Meuble vasque dans la chambre', 'Salle de bain']]
  const faux = cas.filter(([t, attendu]) => P.pieceDe(t) !== attendu)
  T('A1 la pièce que nomme un libellé (et la première citée l’emporte ; « entrée d’eau » n’est pas l’entrée)', faux.length === 0, JSON.stringify(faux.map(([t]) => [t, P.pieceDe(t)])))
  T('A2 pièce saisie : espaces resserrés, 40 caractères au plus, vide → aucune', P.nettoyerPiece('  Chambre   parentale ') === 'Chambre parentale' && [...P.nettoyerPiece('x'.repeat(60))].length === 40 && P.nettoyerPiece('   ') === null && P.nettoyerPiece(3) === null)
  const t = (id, libelle, faite, membre_id = null, piece = null) => ({ id, libelle, faite, membre_id, piece })
  const plan = P.planChantier({ titre: 'Salle de bain, étage', membres: [{ id: 'M1', nom: 'Compagnon Un' }, { id: 'M2', nom: 'Apprenti Deux' }], taches: [
    t('1', 'Dépose ancienne baignoire', true, 'M1'), t('2', 'Pose receveur de douche', false, 'M2'), t('3', 'Pose WC suspendu', true, 'M1'), t('4', 'Évacuation des gravats', false), t('5', 'Faïence', false, null, 'Cuisine'), t('6', 'Main d’œuvre', true),
  ] })
  const de = (n) => plan.find((p) => p.nom === n)
  T('A3 une case par pièce : Salle de bain (tâches nommées + celles sans pièce, qui prennent la pièce du titre), WC, Cuisine (choisie par l’artisan)',
    egal(plan.map((p) => p.nom), ['Salle de bain', 'WC', 'Cuisine']) && de('Salle de bain').total === 4 && de('WC').total === 1 && de('Cuisine').taches[0].pieceDevinee === false && de('Salle de bain').taches.every((x) => x.pieceDevinee), JSON.stringify(plan.map((p) => [p.nom, p.total])))
  T('A4 état et pourcentage : WC fini (100 %), Salle de bain en cours (2/4 = 50 %), Cuisine à faire (0 %)', de('WC').etat === 'fini' && de('WC').pct === 100 && de('Salle de bain').etat === 'en_cours' && de('Salle de bain').pct === 50 && de('Cuisine').etat === 'a_faire' && de('Cuisine').pct === 0)
  T('A5 l’équipe par pièce : les membres qui y ont une tâche, sans doublon', egal(de('Salle de bain').membres.map((m) => m.id), ['M1', 'M2']) && egal(de('WC').membres.map((m) => m.id), ['M1']) && de('Cuisine').membres.length === 0)
  const g = P.planChantier({ titre: 'Dépannage', membres: [], taches: [t('1', 'Main d’œuvre', false), t('2', 'Pose WC', false)] })
  T('A6 sans pièce reconnue (ni libellé, ni titre) : « Général », toujours en dernier', egal(g.map((p) => p.nom), ['WC', 'Général']))
  T('A7 sans tâche, pas de schéma (liste vide)', P.planChantier({ titre: 'X', membres: [], taches: [] }).length === 0)
}

// ═══════════════════════ M. Maquette 3D (version 2) ═══════════════════════
{
  const S = await imp('lib/crm/planScene.ts')
  const pieces = P.planChantier({ titre: 'Rénovation', membres: [{ id: 'M1', nom: 'Compagnon Un' }], taches: [
    { id: '1', libelle: 'Pose baignoire', faite: true, membre_id: 'M1' }, { id: '2', libelle: 'Pose WC', faite: false, membre_id: null },
    { id: '3', libelle: 'Évier cuisine', faite: false, membre_id: 'M1' }, { id: '4', libelle: 'Chambre : peinture', faite: true, membre_id: null }, { id: '5', libelle: 'Main d’œuvre', faite: false, membre_id: null },
  ] })
  const sc = S.sceneChantier({ pieces, prereglage: 'plombier', roles: new Map([['M1', 'compagnon']]) })
  T('M1 une étiquette par pièce, à l’état et au pourcentage du schéma (mêmes chiffres que la version 1)', egal(sc.etiquettes.map((e) => [e.nom, e.pct, e.etat]), pieces.map((p) => [p.nom, p.pct, p.etat])))
  T('M2 budget : au plus cinq appels de dessin (une couche par forme), quelle que soit la maison', S.appelsDeDessin(sc) <= 5 && S.appelsDeDessin(S.sceneChantier({ pieces: [...pieces, ...pieces, ...pieces].map((p, i) => ({ ...p, nom: p.nom + i })), prereglage: 'chauffagiste' })) <= 5)
  const sol = (o) => sc.instances.box.find((b) => b.o === o && b.s[1] === 0.12)
  T('M3 le sol de chaque pièce prend la couleur de son état', pieces.every((p, i) => sol(i)?.c === S.COULEUR_ETAT[p.etat]))
  T('M4 l’équipe est dans sa pièce : un personnage (corps + tête) par membre qui y a des tâches', sc.instances.cyl.filter((c) => c.o === pieces.findIndex((p) => p.nom === 'Salle de bain') && c.s[1] === 0.72).length === 1 && sc.instances.sph.some((x) => x.o === pieces.findIndex((p) => p.nom === 'Cuisine')))
  const vol = (m) => Object.values(S.sceneChantier({ pieces, prereglage: m }).instances).reduce((n, l) => n + l.length, 0)
  T('M5 le décor change avec le métier (chauffagiste : une chaudière ; couvreur : la toiture en coupe)', vol('chauffagiste') > vol('general') && S.sceneChantier({ pieces, prereglage: 'couvreur' }).instances.toit.length > S.sceneChantier({ pieces, prereglage: 'general' }).instances.toit.length)
  T('M6 la grille : 1 pièce = 1 colonne, 4 = 2 × 2, 7 = 3 × 3', egal(S.disposition(1), { colonnes: 1, rangees: 1 }) && egal(S.disposition(4), { colonnes: 2, rangees: 2 }) && egal(S.disposition(7), { colonnes: 3, rangees: 3 }))
  const ec = sansCommentaires(lire('app/crm/PlanChantier.tsx')), sc3 = sansCommentaires(lire('app/crm/atelier/SceneChantier.tsx'))
  T('M7 la maquette est chargée À LA DEMANDE (next/dynamic, sans rendu serveur), jamais sur téléphone, avec « moins d’animations » ou sans WebGL ; ombres figées', ec.includes("dynamic(() => import('./atelier/SceneChantier'), { ssr: false") && ec.includes('min-width: 900px') && ec.includes('prefers-reduced-motion: reduce') && ec.includes("getContext('webgl2')") && sc3.includes('shadowMap.autoUpdate = false'))
}

// ═══════════════════════ V. Lien de suivi pour le client (version 3) ═══════════════════════
{
  const Sv = await imp('lib/crm/suivi.ts')
  const vue = Sv.vueSuivi({
    entreprise: 'Plomberie <Test> & Fils',
    chantier: { titre: 'Salle de bain "étage"', statut: 'en_cours', date_debut: '2026-10-12', date_fin_prevue: '2026-10-24', date_fin_reelle: null, maj_le: '2026-10-18T09:00:00Z', client_nom: 'Mme Secret', adresse: '12 rue Privée', total_ttc: 9999 },
    taches: [{ id: '1', libelle: 'Pose lavabo marque X à 450 €', faite: true, faite_le: '2026-10-19T08:00:00Z', membre_id: 'M1' }, { id: '2', libelle: 'Pose WC', faite: false, membre_id: null }],
  })
  const json = JSON.stringify(vue)
  T('V1 la vue publique n’a QUE ses clés : ni prix, ni adresse, ni client, ni compagnon, ni libellé de tâche', egal(Object.keys(vue).sort(), [...Sv.CLES_SUIVI].sort()) && !/Secret|Privée|9999|450|marque X|M1/.test(json), json)
  T('V2 avancement global 50 %, pièce par pièce (Salle de bain fini, WC à faire), dernière mise à jour = la dernière tâche cochée', vue.avancement === 50 && egal(vue.pieces.map((p) => [p.nom, p.etat]), [['Salle de bain', 'fini'], ['WC', 'a_faire']]) && vue.majLe === '2026-10-19T08:00:00Z' && vue.statut === 'En cours' && vue.finReelle === null)
  const html = Sv.pageSuivi(vue)
  T('V3 la page échappe tout (pas de balise injectée), n’a AUCUN script ni ressource extérieure, dit noindex, ne parle pas de Presti', /Plomberie &lt;Test&gt; &amp; Fils/.test(html) && /Salle de bain &quot;étage&quot;/.test(html) && !/<script|<link|<img|src=|https?:\/\//i.test(html) && /noindex/.test(html) && !/presti/i.test(html))
  T('V4 jeton : 43 caractères base64url exactement', Sv.RE_JETON_SUIVI.test('a'.repeat(43)) && !Sv.RE_JETON_SUIVI.test('a'.repeat(42)) && !Sv.RE_JETON_SUIVI.test('a'.repeat(42) + '/'))
  const pub = sansCommentaires(lire('app/suivi/[jeton]/route.ts'))
  T('V5 page publique : drapeau d’abord, débit par adresse, jeton vérifié, EMPREINTE cherchée, offre et suspension revérifiées, CSP « default-src none », noindex, aucun cache ; chantier annulé = 404',
    pub.indexOf("if (!actif('crmSuivi')) return introuvable()") > 0 && pub.indexOf("if (!actif('crmSuivi'))") < pub.indexOf('consommerLimite(') && /RE_JETON_SUIVI\.test\(jeton\)/.test(pub) && /\.eq\('jeton_empreinte', empreinte\)/.test(pub) && /peut\(art\.plan as string \| null, 'crm'\)/.test(pub) && /suspensionEnCours\(uid\)/.test(pub) && /default-src 'none'/.test(pub) && /'X-Robots-Tag': 'noindex/.test(pub) && /'Cache-Control': 'private, no-store'/.test(pub) && /statut === 'annule'\) return introuvable\(\)/.test(pub) && !/prix|total_ttc|client_nom|adresse|telephone|email/.test(pub.slice(pub.indexOf("from('chantiers')"))))
  const rt = sansCommentaires(lire('app/api/crm/chantiers/[id]/suivi/route.ts'))
  T('V6 routes de la fiche : six méthodes sous gardeCrm + drapeau, chantier DU COMPTE vérifié, 32 octets aléatoires, seule l’empreinte enregistrée, adresse rendue une seule fois (jamais en GET)',
    (rt.match(/const g = await gardeCrm\(req, \{ drapeau: 'crmSuivi' \}\)/g) ?? []).length === 6 && /chantierDe\(uid, id\)/.test(rt) && /randomBytes\(32\)\.toString\('base64url'\)/.test(rt) && /jeton_empreinte: empreinte/.test(rt) && !/adresse\(req/.test(rt.slice(rt.indexOf('export async function GET'), rt.indexOf('export async function POST'))))
  T('V7 « suivi » ne peut pas devenir l’adresse d’un artisan, et le routage des domaines le laisse passer', /'suivi',/.test(lire('lib/urls.ts')) && /'controle', 'suivi'\]\)/.test(lire('proxy.ts')))
  const m = lire('supabase/migrations/0167_chantier_suivi.sql'), s = m.replace(/^\s*--.*$/gm, '')
  T('V8 0167 : un lien par chantier, empreinte SHA-256 seule, RLS SANS politique, aucun droit anon/authenticated, déclencheur « chantier du même compte » ; NON APPLIQUÉE en tête',
    /chantier_id\s+uuid primary key references public\.chantiers\(id\) on delete cascade/.test(s) && /\^\[0-9a-f\]\{64\}\$/.test(s) && /enable row level security/.test(s) && !/create policy/.test(s) && /revoke all on public\.chantier_suivi from anon/.test(s) && /revoke all on public\.chantier_suivi from authenticated/.test(s) && /crm : chantier d un autre artisan/.test(s) && /NON APPLIQUÉE/.test(m.slice(0, 300)))
  const { sansCommentaires: scSql, MARQUE_CONTROLE } = await import(pathToFileURL(path.join(RACINE, 'scripts/sql-nu.mjs')).href)
  const lignesSql = (x) => scSql(x).split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim())
  const j = lire('supabase/migrations/_A_COLLER_sql_editor_0167_NU.sql')
  T('V9 le jumeau _NU de 0167 porte le même SQL (pied de contrôle en lecture seule)', egal(lignesSql(j.split(MARQUE_CONTROLE)[0]), lignesSql(m)) && !/^\s*(insert|update|delete|alter|create|drop)\b/im.test(j.split(MARQUE_CONTROLE)[1] ?? ''))
  T('V10 drapeau baissé tant que la conformité n’a pas relu (photos absentes de la page en attendant) ; la purge d’un compte efface ses liens', FLAGS.crmSuivi === false && lire('lib/purgeComptes.ts').includes("'chantier_suivi'") && /\{actif\('crmSuivi'\) && c\.statut !== 'annule' && <SuiviClient /.test(lire('app/crm/FicheChantier.tsx')))
}

// ═══════════════════════ B. Création depuis le devis ═══════════════════════
{
  const n = C.tachesDepuisDevis([{ id: 'L1', ordre: 1, designation: 'Pose lavabo' }, { id: 'L2', ordre: 2, designation: 'Main d’œuvre' }], [])
  T('B1 chaque tâche née du devis porte la pièce de sa désignation (ou aucune)', n[0].piece === 'Salle de bain' && n[1].piece === null)
  T('B2 drapeau baissé : la pièce n’est PAS écrite (la colonne peut manquer) ; levé : elle l’est, et jamais une pièce vide', !('piece' in C.tacheAInserer(n[0], false)) && C.tacheAInserer(n[0], true).piece === 'Salle de bain' && !('piece' in C.tacheAInserer(n[1], true)))
}

// ═══════════════════════ C. Code et migration ═══════════════════════
{
  T('C1 drapeau baissé tant que le lot n’est pas recetté : crmPlan', FLAGS.crmPlan === false)
  const r1 = sansCommentaires(lire('app/api/crm/chantiers/route.ts')), r2 = sansCommentaires(lire('app/api/crm/chantiers/[id]/taches/route.ts')), r3 = sansCommentaires(lire('app/api/crm/taches/[id]/route.ts')), r4 = sansCommentaires(lire('app/api/crm/chantiers/[id]/route.ts'))
  T('C2 les deux créations depuis le devis passent par tacheAInserer(t, actif(\'crmPlan\'))', /tacheAInserer\(t, actif\('crmPlan'\)\)/.test(r1) && /tacheAInserer\(t, actif\('crmPlan'\)\)/.test(r2))
  T('C3 créer ou modifier une tâche avec `piece` est refusé drapeau baissé (400)', /if \('piece' in t && !actif\('crmPlan'\)\) return erreur\('Champ inconnu : piece\.', 400\)/.test(r2) && /if \('piece' in v\.valeur && !actif\('crmPlan'\)\) return erreur\('Champ inconnu : piece\.', 400\)/.test(r3))
  T('C4 la fiche ne lit la colonne que drapeau levé', /\$\{actif\('crmPlan'\) \? ', piece' : ''\}/.test(r4))
  const fiche = lire('app/crm/FicheChantier.tsx'), ecran = sansCommentaires(lire('app/crm/PlanChantier.tsx'))
  T('C5 l’écran : schéma sous son drapeau, « pas à l’échelle » dit, listes de tâches masquées (hidden) et non montées à l’ouverture, changement de pièce par la route des tâches', /\{actif\('crmPlan'\) && <PlanChantier /.test(fiche) && /pas à l’échelle/.test(ecran) && /hidden=\{choisie !== p\.nom\}/.test(ecran) && /agir\(`\/api\/crm\/taches\/\$\{t\.id\}`, 'PATCH', \{ piece:/.test(ecran) && !/\bfetch\(/.test(ecran))
  const m = lire('supabase/migrations/0166_chantier_taches_piece.sql'), s = m.replace(/^\s*--.*$/gm, '')
  T('C6 0166 : une colonne facultative bornée à 40, idempotente, aucun droit qui change ; NON APPLIQUÉE en tête', /add column if not exists piece text;/.test(s) && /check \(piece is null or char_length\(piece\) between 1 and 40\)/.test(s) && /drop constraint if exists chantier_taches_piece_check/.test(s) && !/grant|revoke|policy/i.test(s) && /NON APPLIQUÉE/.test(m.slice(0, 300)))
  const { sansCommentaires: scSql, MARQUE_CONTROLE } = await import(pathToFileURL(path.join(RACINE, 'scripts/sql-nu.mjs')).href)
  const lignesSql = (x) => scSql(x).split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim())
  const j = lire('supabase/migrations/_A_COLLER_sql_editor_0166_NU.sql')
  T('C7 le jumeau _NU porte le même SQL (pied de contrôle en lecture seule)', egal(lignesSql(j.split(MARQUE_CONTROLE)[0]), lignesSql(m)) && !/^\s*(insert|update|delete|alter|create|drop)\b/im.test(j.split(MARQUE_CONTROLE)[1] ?? ''))
}

// ═══════════════════════ L. En vrai ═══════════════════════
const BASE = (process.env.TEST_BASE || '').replace(/\/$/, '')
if (!BASE) console.log('\n(L non joué : TEST_BASE absent)')
// Un serveur LOCAL, ou une prévisualisation Vercel du projet (déploiement de branche, jamais la production prestiapp.fr).
else if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$|^https:\/\/presti-[a-z0-9-]+-presti1\.vercel\.app$/.test(BASE)) T('L0 TEST_BASE doit être un serveur local ou une prévisualisation Vercel', false, BASE)
else {
  for (const l of fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_0-9]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
  const { createClient } = await import('@supabase/supabase-js')
  const { verifierSessionTest } = await import(pathToFileURL(path.join(RACINE, 'scripts/lib/connexion-test.mjs')).href)
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error: absente } = await admin.from('chantier_taches').select('piece').limit(1)
  const comptes = []
  const creer = async (nom) => {
    const slug = `lot5-${nom}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
    const email = `${slug}@presti-test.invalid`, mdp = crypto.randomUUID() + 'Aa1!'
    const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
    if (error) throw new Error(`compte ${nom} : ${error.message}`)
    comptes.push(u.user.id)
    const { error: ea } = await admin.from('artisans').insert({ id: u.user.id, email, nom: `Test lot 5 ${nom}`, metier: 'Plombier', slug, plan: 'signature' })
    if (ea) throw new Error(`fiche ${nom} : ${ea.message}`)
    const nav = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: s, error: es } = await nav.auth.signInWithPassword({ email, password: mdp })
    if (es) throw new Error(`connexion ${nom} : ${es.message}`)
    await verifierSessionTest(s.session.access_token)
    return { uid: u.user.id, jeton: s.session.access_token }
  }
  const http = async (c, chemin, init = {}) => {
    const r = await fetch(`${BASE}${chemin}`, { method: init.method ?? 'GET', headers: { Authorization: `Bearer ${c.jeton}`, ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: init.body !== undefined ? JSON.stringify(init.body) : undefined })
    return { status: r.status, corps: await r.json().catch(() => null) }
  }
  try {
    console.log('\n── L. Comptes de test @presti-test.invalid')
    const [CA, CB] = [await creer('A'), await creer('B')]
    const { data: dv, error: ed } = await admin.from('devis').insert({ artisan_id: CA.uid, statut: 'accepte', objet: 'Salle de bain', client_nom: 'Client lot 5', total_ttc: 3000 }).select('id').single()
    if (ed) throw new Error(`devis : ${ed.message}`)
    const { error: el } = await admin.from('devis_lignes').insert([{ devis_id: dv.id, ordre: 1, designation: 'Pose lavabo', quantite: 1, unite: 'u', prix_unitaire_ht: 100 }, { devis_id: dv.id, ordre: 2, designation: 'Pose WC suspendu', quantite: 1, unite: 'u', prix_unitaire_ht: 100 }])
    if (el) throw new Error(`lignes : ${el.message}`)
    const { data: ch, error: ec } = await admin.from('chantiers').insert({ artisan_id: CA.uid, devis_id: dv.id, titre: 'Salle de bain', statut: 'en_cours' }).select('id').single()
    if (ec) throw new Error(`chantier : ${ec.message}`)
    const gen = await http(CA, `/api/crm/chantiers/${ch.id}/taches`, { method: 'POST', body: { depuis_devis: true } })
    const { data: taches } = await admin.from('chantier_taches').select(absente ? 'id, libelle' : 'id, libelle, piece').eq('chantier_id', ch.id).order('ordre')
    const leve = gen.status === 201 && !absente && taches?.[0]?.piece !== undefined && taches.some((t) => t.piece)
    if (absente || !leve) {
      // Drapeau baissé (ou colonne absente) : les tâches naissent SANS pièce, et la pièce est refusée.
      T('L1 drapeau baissé : génération sans pièce (201), `piece` refusée à la modification (400)', gen.status === 201 && (taches ?? []).length === 2 && (absente || taches.every((t) => !t.piece)) && (await http(CA, `/api/crm/taches/${taches[0].id}`, { method: 'PATCH', body: { piece: 'Cuisine' } })).status === 400, JSON.stringify([gen, taches]))
      console.log('(L2+ non joué : lever crmPlan sur une copie LOCALE du dépôt, 0166 appliquée)')
    } else {
      T('L1 drapeau levé : les tâches générées depuis le devis portent leur pièce (Salle de bain, WC)', egal(taches.map((t) => t.piece), ['Salle de bain', 'WC']), JSON.stringify(taches))
      const maj = await http(CA, `/api/crm/taches/${taches[1].id}`, { method: 'PATCH', body: { piece: '  Salle   d’eau  ' } })
      const { data: relue } = await admin.from('chantier_taches').select('piece').eq('id', taches[1].id).maybeSingle()
      T('L2 corriger la pièce d’une tâche (PATCH) ; une pièce de plus de 40 caractères est refusée', maj.status === 200 && relue?.piece === 'Salle d’eau' && (await http(CA, `/api/crm/taches/${taches[1].id}`, { method: 'PATCH', body: { piece: 'x'.repeat(41) } })).status === 400, JSON.stringify([maj, relue]))
      const fiche = await http(CA, `/api/crm/chantiers/${ch.id}`)
      T('L3 la fiche rend la pièce de chaque tâche', fiche.status === 200 && JSON.stringify(fiche.corps).includes('"piece":"Salle d’eau"'))
      T('L4 le compte B ne modifie pas la pièce d’une tâche de A (404)', (await http(CB, `/api/crm/taches/${taches[0].id}`, { method: 'PATCH', body: { piece: 'Cuisine' } })).status === 404)
      T('L5 remettre « deviner » (null) efface la pièce choisie', (await http(CA, `/api/crm/taches/${taches[1].id}`, { method: 'PATCH', body: { piece: null } })).status === 200 && (await admin.from('chantier_taches').select('piece').eq('id', taches[1].id).maybeSingle()).data?.piece === null)
    }

    // Le lien de suivi du client (version 3, drapeau crmSuivi, 0167).
    const local = (a) => String(a ?? '').replace(/^https?:\/\/[^/]+/, BASE)
    const sondeSuivi = await http(CA, `/api/crm/chantiers/${ch.id}/suivi`)
    if (sondeSuivi.status === 404) {
      T('L6 drapeau crmSuivi baissé : les routes du lien et la page publique répondent 404', (await fetch(`${BASE}/suivi/${'a'.repeat(43)}`)).status === 404)
    } else if (sondeSuivi.status === 503) {
      T('L6 0167 appliquée (table chantier_suivi présente)', false, JSON.stringify(sondeSuivi))
    } else {
      await admin.from('chantier_taches').update({ faite: true, faite_le: new Date().toISOString() }).eq('id', taches[0].id)
      const cree = await http(CA, `/api/crm/chantiers/${ch.id}/suivi`, { method: 'POST' })
      const jeton = local(cree.corps?.adresse).match(/\/suivi\/([A-Za-z0-9_-]{43})$/)?.[1] ?? ''
      const { data: ligne } = await admin.from('chantier_suivi').select('jeton_empreinte').eq('chantier_id', ch.id).maybeSingle()
      T('L6 lien créé : seule l’EMPREINTE est en base', cree.status === 201 && !!jeton && ligne?.jeton_empreinte === crypto.createHash('sha256').update(jeton).digest('hex'))
      const r = await fetch(local(cree.corps.adresse))
      const html = await r.text()
      T('L7 la page se lit SANS session : HTML autonome, noindex, CSP stricte, sans cache ; avancement par pièce', r.status === 200 && /text\/html/.test(r.headers.get('content-type') ?? '') && /noindex/.test(r.headers.get('x-robots-tag') ?? '') && /default-src 'none'/.test(r.headers.get('content-security-policy') ?? '') && /no-store/.test(r.headers.get('cache-control') ?? '') && /Pièce par pièce/.test(html) && /Salle de bain/.test(html), `${r.status} ${html.slice(0, 200)}`)
      T('L8 rien de privé sur la page : ni nom du client, ni montant, ni libellé de tâche, ni « Presti »', !/Client lot 5|3000|3 000|Pose lavabo|Pose WC suspendu|presti/i.test(html))
      T('L9 le compte B ne crée pas de lien sur le chantier de A (404)', (await http(CB, `/api/crm/chantiers/${ch.id}/suivi`, { method: 'POST' })).status === 404)
      const cree2 = await http(CA, `/api/crm/chantiers/${ch.id}/suivi`, { method: 'POST' })
      T('L10 renouveler : l’ancien lien meurt (404), le nouveau marche', cree2.status === 201 && (await fetch(local(cree.corps.adresse))).status === 404 && (await fetch(local(cree2.corps.adresse))).status === 200)
      await http(CA, `/api/crm/chantiers/${ch.id}/suivi`, { method: 'DELETE' })
      T('L11 révoqué : 404, et la ligne a disparu', (await fetch(local(cree2.corps.adresse))).status === 404 && !(await admin.from('chantier_suivi').select('chantier_id').eq('chantier_id', ch.id).maybeSingle()).data)
    }
  } catch (e) { T('L erreur inattendue', false, e.message) } finally {
    let restes = 0
    for (const id of comptes) {
      const { error } = await admin.rpc('purger_compte_test', { p_id: id })
      if (error) console.log(`  ⚠️ purge ${id} : ${error.message}`)
      for (const t of ['chantier_taches', 'chantiers', 'devis']) { const { count } = await admin.from(t).select('*', { count: 'exact', head: true }).eq('artisan_id', id); restes += count ?? 0 }
      const { count } = await admin.from('artisans').select('*', { count: 'exact', head: true }).eq('id', id); restes += count ?? 0
    }
    T(`L9 nettoyage : les ${comptes.length} comptes de test et toutes leurs lignes sont supprimés`, restes === 0, `${restes} reste(s)`)
  }
}

console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)${rouges.length ? ' : ' + rouges.join(' · ') : ''}`)
process.exitCode = rouges.length ? 1 : 0
