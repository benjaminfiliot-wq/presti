#!/usr/bin/env node
// scripts/crm-lot4-qa.mjs — juge du LOT 4 des améliorations du CRM (plan plans/crm-idees-twenty-1810.md, n°7) : l'APRÈS-CHANTIER
// (demande d'avis 2 jours après la fin, proposition d'entretien avant la date anniversaire), sous le drapeau crmApresChantier,
// table crm_apres_chantier et deux types de rappel (migration 0165).
//
//  A. RÈGLES (lib/apresChantier.ts) : désactivé par défaut, propositions (fin réelle, rattrapage borné, équipement reconnu,
//     anniversaire à venir, clés uniques), textes (sans lien, variables connues), décision d'envoi (réglage, adresse, plafonds).
//  B. PASSAGE QUOTIDIEN (lib/apresChantierTour.ts) : seulement les comptes qui l'ont activé et dont l'offre porte le CRM ; il POSE
//     des rappels et n'envoie RIEN ; table absente = pas une panne.
//  C. CODE ET MIGRATION : routes fermées par leur drapeau AVANT la session ; préparer n'écrit rien ; envoyer = confirmation de
//     l'artisan, marque blanche, sans lien, un message par client et par jour ; 0165 idempotente, RLS, anon refusé ; jumeau _NU.
//  L. EN VRAI (TEST_BASE=http://localhost:<port>, serveur dont les drapeaux sont levés, 0165 appliquée) : réglages, passage
//     quotidien, préparation, envoi vers une adresse @presti-test.invalid (jamais délivrée), plafonds, isolation. Nettoyage en finally.
//
// Usage : [TEST_BASE=http://localhost:3219] node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-lot4-qa.mjs
// Codes : 0 vert · 1 rouge
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

const A = await imp('lib/apresChantier.ts')
const Tr = await imp('lib/apresChantierTour.ts')
const { FLAGS } = await imp('lib/flags.ts')

// ═══════════════════════ A. Règles ═══════════════════════
{
  const R = (x = {}) => ({ ...A.REGLAGES_APRES_PAR_DEFAUT, ...x })
  const ch = (id, fin, titre = 'Salle de bain', statut = 'termine', textes = []) => ({ id, titre, statut, date_fin_reelle: fin, client_nom: 'Client T', textes })
  T('A1 désactivé par défaut : rien n’est proposé', A.REGLAGES_APRES_PAR_DEFAUT.avis === false && A.REGLAGES_APRES_PAR_DEFAUT.entretien === false && A.propositions({ chantiers: [ch(U(1), '2026-10-15')], reglages: R(), existantes: new Set(), jour: '2026-10-19' }).length === 0)
  const p = A.propositions({ chantiers: [ch(U(1), '2026-10-15'), ch(U(2), '2026-10-19'), ch(U(3), '2026-10-10', 'X', 'en_cours'), ch(U(4), null)], reglages: R({ avis: true, actif_depuis: '2026-10-01T08:00:00Z' }), existantes: new Set(), jour: '2026-10-19' })
  T('A2 avis : chantier TERMINÉ avec fin réelle seulement ; J+2 (le 17 → aujourd’hui au plus tôt, le 19 → le 21) ; clé avis:<id>',
    egal(p.map((x) => [x.cle, x.echeance, x.type]), [[`avis:${U(1)}`, '2026-10-19', 'demande_avis'], [`avis:${U(2)}`, '2026-10-21', 'demande_avis']]), JSON.stringify(p))
  T('A3 jamais deux fois : une clé déjà posée n’est pas reproposée', A.propositions({ chantiers: [ch(U(1), '2026-10-15')], reglages: R({ avis: true, actif_depuis: '2026-10-01' }), existantes: new Set([`avis:${U(1)}`]), jour: '2026-10-19' }).length === 0)
  T('A4 pas de rattrapage en rafale : à l’activation (le 19), un chantier fini le 1er (plus de 14 jours avant) n’est pas proposé ; le 6, si',
    egal(A.propositions({ chantiers: [ch(U(1), '2026-10-01'), ch(U(2), '2026-10-06')], reglages: R({ avis: true, actif_depuis: '2026-10-19T09:00:00Z' }), existantes: new Set(), jour: '2026-10-19' }).map((x) => x.chantier_id), [U(2)]))
  T('A5 équipement reconnu : chaudière (12 mois), pompe à chaleur (24 mois), conduit (ramonage, poêle) ; rien pour un WC', A.equipementDe(['Remplacement chaudière gaz'])?.mois === 12 && A.equipementDe(['Pose PAC air-eau'])?.nom === 'pompe à chaleur' && A.equipementDe(['Pose pompe à chaleur'])?.mois === 24 && A.equipementDe([null, 'Ramonage conduit'])?.nom === 'conduit de fumée' && A.equipementDe(['Remplacement WC']) === null && A.equipementDe(['pacte']) === null)
  const e = A.propositions({ chantiers: [ch(U(5), '2026-10-15', 'Chaudière, séjour')], reglages: R({ entretien: true, actif_depuis: '2026-10-19' }), existantes: new Set(), jour: '2026-10-19' })
  T('A6 entretien : 15 jours avant le premier anniversaire (fin 15/10/2026 → 30/09/2027), clé entretien:<id>:1', egal(e.map((x) => [x.cle, x.echeance, x.type]), [[`entretien:${U(5)}:1`, '2027-09-30', 'entretien']]), JSON.stringify(e))
  const v = A.propositions({ chantiers: [ch(U(6), '2025-03-10', 'Chaudière')], reglages: R({ entretien: true, actif_depuis: '2026-10-19' }), existantes: new Set(), jour: '2026-10-19' })
  T('A7 un chantier ancien : le prochain anniversaire À VENIR (2027, n = 2), jamais une date passée', egal(v.map((x) => [x.cle, x.echeance]), [[`entretien:${U(6)}:2`, '2027-02-23']]), JSON.stringify(v))
  T('A8 un entretien déjà posé (même rang ou plus loin) n’est pas reproposé ; au-delà de 3 ans (ENTRETIEN_ANS_MAX, audit du 20/10), plus de suivi',
    A.propositions({ chantiers: [ch(U(6), '2025-03-10', 'Chaudière')], reglages: R({ entretien: true }), existantes: new Set([`entretien:${U(6)}:2`]), jour: '2026-10-19' }).length === 0
    && A.propositions({ chantiers: [ch(U(7), '2023-01-10', 'Chaudière')], reglages: R({ entretien: true }), existantes: new Set(), jour: '2026-10-19' }).length === 0)
  T('A9 mois : le 31 janvier + 1 mois = le 28 février ; + 12 mois = l’année suivante', A.ajouterMois('2026-01-31', 1) === '2026-02-28' && A.ajouterMois('2026-10-15', 12) === '2027-10-15' && A.ajouterMois('2026-03-15', -12) === '2025-03-15')
  T('A10 texte : trop court, trop long, LIEN (même sans https), variable inconnue → refusés ; une adresse e-mail en signature passe',
    !!A.erreurTexteApres('court') && !!A.erreurTexteApres('x'.repeat(1501)) && !!A.erreurTexteApres('Bonjour, laissez un avis sur https://g.page/x merci') && !!A.erreurTexteApres('Bonjour, laissez un avis sur maboite.fr merci beaucoup') && !!A.erreurTexteApres('Bonjour {prenom}, merci pour votre confiance !') && A.erreurTexteApres('Bonjour {client}, merci ! Écrivez-moi : contact@plomberie-test.fr') === null && A.erreurTexteApres(A.TEXTES_APRES_PAR_DEFAUT.avis) === null && A.erreurTexteApres(A.TEXTES_APRES_PAR_DEFAUT.entretien) === null)
  T('A11 le lien vers la fiche d’avis reste « à confirmer » (conformité) : pas de lien dans les textes par défaut', A.LIEN_AVIS_AUTORISE === false && !/https?:|www\./.test(Object.values(A.TEXTES_APRES_PAR_DEFAUT).join(' ') + A.PIED_APRES))
  const vars = { client: 'Mme T', chantier: 'Chaudière', artisan: 'Plomberie T', equipement: 'chaudière' }
  T('A12 remplir : les variables connues, les autres intactes ; pied « message à la suite de votre chantier », réponse possible', A.remplirApres('{client} / {chantier} / {artisan} / {equipement} / {x}', vars) === 'Mme T / Chaudière / Plomberie T / chaudière / {x}' && /répondant/.test(A.messageCompletApres('Corps')) && A.sujetApres('entretien', 'X', 'chaudière') === 'Entretien de votre chaudière')
  T('A13 réglages : champs fermés, booléens obligatoires, textes vérifiés, texte vide = texte par défaut',
    !A.lireReglagesApres({ avis: true }).ok && !A.lireReglagesApres({ avis: true, entretien: false, lien: 'x' }).ok && !A.lireReglagesApres({ avis: true, entretien: false, texte_avis: 'voir www.x.fr pour un avis svp merci' }).ok && A.lireReglagesApres({ avis: true, entretien: false, texte_avis: '  ' }).reglages?.texte_avis === null)
  const ok = { email: 'a@b.fr', envoyesAujourdhuiCompte: 0, dejaEcritAujourdhuiAuClient: false, dejaEnvoye: false, reglageActif: true }
  T('A14 décision : réglage coupé, déjà parti, sans adresse, déjà écrit au client aujourd’hui, plafond du compte → refusés', A.decisionEnvoiApres(ok).ok && !A.decisionEnvoiApres({ ...ok, reglageActif: false }).ok && !A.decisionEnvoiApres({ ...ok, dejaEnvoye: true }).ok && !A.decisionEnvoiApres({ ...ok, email: null }).ok && A.decisionEnvoiApres({ ...ok, dejaEcritAujourdhuiAuClient: true }).statut === 429 && !A.decisionEnvoiApres({ ...ok, envoyesAujourdhuiCompte: A.MAX_PAR_COMPTE_JOUR }).ok)
}

// ═══════════════════════ B. Passage quotidien ═══════════════════════
{
  const poses = []
  const dep = (x = {}) => ({
    lireReglages: async () => ({ data: [{ artisan_id: 'S', avis: true, entretien: true, texte_avis: null, texte_entretien: null, actif_depuis: '2026-10-01' }, { artisan_id: 'E', avis: true, entretien: false, texte_avis: null, texte_entretien: null, actif_depuis: '2026-10-01' }, { artisan_id: 'O', avis: false, entretien: false, texte_avis: null, texte_entretien: null, actif_depuis: null }], error: null }),
    lirePlans: async (ids) => ({ data: [{ id: 'S', plan: 'signature' }, { id: 'E', plan: 'essentiel' }].filter((p) => ids.includes(p.id)), error: null }),
    lireChantiers: async () => ({ data: [{ id: U(1), titre: 'Chaudière', statut: 'termine', date_fin_reelle: '2026-10-15', client_nom: 'C', textes: [] }], error: null }),
    lireCles: async () => ({ data: [], error: null }),
    poser: async (id, l) => { poses.push([id, l.map((p) => p.cle)]); return { error: null } },
    ...x,
  })
  const r = await Tr.tourApresChantier('2026-10-19', dep())
  T('B1 seulement les comptes qui l’ont activé ET dont l’offre porte le CRM (Signature oui, Essentiel non, désactivé non) ; avis + entretien posés', r.comptes === 1 && r.poses === 2 && egal(poses, [['S', [`avis:${U(1)}`, `entretien:${U(1)}:1`]]]), JSON.stringify([r, poses]))
  const t = await Tr.tourApresChantier('2026-10-19', dep({ lireReglages: async () => ({ data: null, error: { code: '42P01', message: 'relation does not exist' } }) }))
  T('B2 table absente (0165 non appliquée) : pas une panne, rien de posé', t.installe === false && t.erreurs.length === 0)
  const src = sansCommentaires(lire('lib/apresChantierTour.ts'))
  T('B3 le passage n’envoie RIEN : ni e-mail, ni message (seulement poser des rappels)', !/sendEmail|envoyerPush|fetch\(/.test(src) && /MAX_POSES_PAR_PASSAGE = 20/.test(src))
  const cron = sansCommentaires(lire('app/api/cron/relances/route.ts'))
  T('B4 branché dans le passage quotidien, drapeau levé seulement, jamais sous pause, AVANT la notification du matin ; pose avec origine « systeme » et clé unique (ignoreDuplicates)',
    /if \(!enPause && !interrompue && actif\('crmApresChantier'\)\)/.test(cron) && cron.indexOf('tourApresChantier(') < cron.indexOf('tourRappels(') && /origine: 'systeme', cle: p\.cle/.test(cron) && /onConflict: 'artisan_id,cle', ignoreDuplicates: true/.test(cron.slice(cron.indexOf('tourApresChantier('))))
}

// ═══════════════════════ C. Code et migration ═══════════════════════
{
  T('C1 drapeau LEVÉ le 20/10 après recette, audit de conformité (A1 opposition 0171, A2 3 ans, texte d’avis neutre) et accord de Benj : crmApresChantier', FLAGS.crmApresChantier === true)
  T('C1b opposition du client : refus 409 à l’envoi, lue avant sendEmail, posée par sa propre route ; texte d’avis par défaut neutre (pas de tri satisfaits / mécontents) ; 3 ans de suivi au plus', !A.decisionEnvoiApres({ email: 'a@b.fr', envoyesAujourdhuiCompte: 0, dejaEcritAujourdhuiAuClient: false, dejaEnvoye: false, reglageActif: true, oppose: true }).ok && A.ENTRETIEN_ANS_MAX === 3 && !/satisfait/i.test(A.TEXTES_APRES_PAR_DEFAUT.avis) && /quel qu’il soit/.test(A.TEXTES_APRES_PAR_DEFAUT.avis) && /oppose: c\.oppose \}\)/.test(lire('app/api/crm/apres-chantier/message/route.ts')) && /crm_apres_opposition/.test(lire('app/api/crm/apres-chantier/opposition/route.ts')) && /revoke all on public\.crm_apres_opposition from authenticated/.test(lire('supabase/migrations/0171_crm_apres_opposition.sql')))
  const routes = ['app/api/crm/apres-chantier/route.ts', 'app/api/crm/apres-chantier/message/route.ts']
  T('C2 chaque route passe par gardeCrm AVEC le drapeau (404 avant toute session si baissé), six méthodes', routes.every((f) => { const s = lire(f).replace(/\r\n/g, '\n'); return (s.match(/export async function /g) ?? []).length === 6 && (s.match(/const g = await gardeCrm\(req, \{ drapeau: 'crmApresChantier' \}\)\n\s*if \('reponse' in g\) return g\.reponse/g) ?? []).length === 6 }))
  const msg = sansCommentaires(lire(routes[1]))
  const get = msg.slice(msg.indexOf('export async function GET'), msg.indexOf('export async function POST'))
  T('C3 préparer (GET) n’écrit rien et n’envoie rien', !/sendEmail|\.insert\(|\.update\(|\.upsert\(|\.delete\(|consommerLimite/.test(get))
  const post = msg.slice(msg.indexOf('export async function POST'), msg.indexOf('export async function PUT'))
  const i = (s) => post.indexOf(s)
  T('C4 envoyer : champs fermés, texte vérifié (sans lien) AVANT, décision (réglage, déjà parti, adresse, plafond) AVANT, un message par client et par jour AVANT l’envoi ; marque blanche ; rien d’écrit si l’envoi échoue',
    /champsPermis\(corps\.valeur, \['rappel_id', 'message'\]\)/.test(post) && i('erreurTexteApres(') < i('await sendEmail(') && i('decisionEnvoiApres(') < i('await sendEmail(') && i('consommerLimite(`crm-apres:${g.uid}:${empreinte}`, 1, 86_400)') > 0 && i('consommerLimite(') < i('await sendEmail(') && /fromName: c\.variables\.artisan, replyTo: c\.replyTo, transactionnel: true/.test(post) && i("if (!r.ok)") < i(".update({ fait_le: maintenant, envoye_le: maintenant"))
  T('C5 tout est lu pour le compte de la session (rappel, chantier, devis, réglages) ; seuls les rappels de l’après-chantier sont acceptés', (msg.match(/\.eq\('artisan_id', g\.uid\)/g) ?? []).length >= 5 && /\['demande_avis', 'entretien'\]\.includes/.test(msg))
  const reg = sansCommentaires(lire(routes[0]))
  T('C6 réglages : PUT validé (lireReglagesApres), une ligne par compte (upsert artisan_id), date d’activation gardée tant que c’est actif', /lireReglagesApres\(corps\.valeur\)/.test(reg) && /onConflict: 'artisan_id'/.test(reg) && /etaitActif \? avant\.data\?\.actif_depuis/.test(reg))
  const m = lire('supabase/migrations/0165_crm_apres_chantier.sql'), s = m.replace(/^\s*--.*$/gm, '')
  T('C7 0165 : table neuve désactivée par défaut, textes bornés, RLS « sa ligne » + 4 gardes, anon refusé, aucune écriture directe ; types demande_avis et entretien ajoutés SANS rien retirer ; hors temps réel ; NON APPLIQUÉE en tête',
    /avis\s+boolean not null default false/.test(s) && /entretien\s+boolean not null default false/.test(s) && /between 20 and 1500/.test(s) && (s.match(/as restrictive/g) ?? []).length === 4 && /revoke all on public\.crm_apres_chantier from anon/.test(s) && /revoke insert, update, delete on public\.crm_apres_chantier from authenticated/.test(s)
    && /check \(type in \('rappeler', 'relancer_devis', 'visite', 'metre', 'rendez_vous', 'autre', 'demande_avis', 'entretien'\)\)/.test(s) && /drop constraint if exists crm_rappels_type_check/.test(s) && !/supabase_realtime/.test(s) && /NON APPLIQUÉE/.test(m.slice(0, 300)))
  const { sansCommentaires: scSql, MARQUE_CONTROLE } = await import(pathToFileURL(path.join(RACINE, 'scripts/sql-nu.mjs')).href)
  const lignesSql = (x) => scSql(x).split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim())
  const j = lire('supabase/migrations/_A_COLLER_sql_editor_0165_NU.sql')
  T('C8 le jumeau _NU porte le même SQL (pied de contrôle en lecture seule)', egal(lignesSql(j.split(MARQUE_CONTROLE)[0]), lignesSql(m)) && !/^\s*(insert|update|delete|alter|create|drop)\b/im.test(j.split(MARQUE_CONTROLE)[1] ?? ''))
  const purge = lire('lib/purgeComptes.ts'), exp = lire('app/api/donnees/export/route.ts')
  T('C9 RGPD : la purge d’un compte vide crm_apres_chantier ; l’export le contient', purge.includes("'crm_apres_chantier'") && exp.includes("'crm_apres_chantier'"))
  const fiche = lire('app/crm/FicheChantier.tsx'), comp = sansCommentaires(lire('app/crm/ApresChantier.tsx'))
  T('C10 l’écran : encart fermé par son drapeau ; « Envoyer » demande une confirmation ; toute écriture par appel() (bloquée en exemple) ; aucune donnée fictive', /\{actif\('crmApresChantier'\) && <ApresChantier /.test(fiche) && /confirm\(`Envoyer ce message par e-mail à \$\{dest\} \?`\)/.test(comp) && !/\bfetch\(/.test(comp) && !/\.invalid|fictif/i.test(comp))
  const ex = lire('lib/crm/exemple.ts')
  T('C11 exemple : la demande d’avis du chauffe-eau n’existe que drapeau levé (sans l’encart, elle ne pourrait pas partir)', /\.\.\.\(actif\('crmApresChantier'\) \? \[rappel\(856, \{ chantier_id: ID\(3\) \}, 'demande_avis'/.test(ex))
}

// ═══════════════════════ L. En vrai ═══════════════════════
const BASE = (process.env.TEST_BASE || '').replace(/\/$/, '')
if (!BASE) console.log('\n(L non joué : TEST_BASE absent)')
// Un serveur LOCAL, ou une prévisualisation Vercel du projet (déploiement de branche, jamais la production prestiapp.fr).
else if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$|^https:\/\/presti-[a-z0-9-]+-presti1\.vercel\.app$/.test(BASE)) T('L0 TEST_BASE doit être un serveur local ou une prévisualisation Vercel', false, BASE)
else {
  const sonde = await fetch(`${BASE}/api/crm/apres-chantier`).then((r) => r.status).catch(() => 0)
  if (sonde === 404) {
    const etats = await Promise.all([['GET', '/api/crm/apres-chantier'], ['PUT', '/api/crm/apres-chantier'], ['GET', `/api/crm/apres-chantier/message?rappel_id=${U(1)}`], ['POST', '/api/crm/apres-chantier/message']]
      .map(async ([m, c]) => [m, c, (await fetch(`${BASE}${c}`, { method: m }).catch(() => ({ status: 0 }))).status]))
    T('L1 drapeau baissé : chaque route de l’après-chantier répond 404 (même sans session)', etats.every(([, , s]) => s === 404), JSON.stringify(etats))
    console.log('(L2+ non joué : serveur au drapeau baissé ; le lever sur une copie LOCALE du dépôt, 0165 appliquée)')
  } else {
    for (const l of fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_0-9]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
    const { createClient } = await import('@supabase/supabase-js')
    const { verifierSessionTest } = await import(pathToFileURL(path.join(RACINE, 'scripts/lib/connexion-test.mjs')).href)
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error: absente } = await admin.from('crm_apres_chantier').select('artisan_id').limit(1)
    if (absente) T('L0 0165 appliquée (table crm_apres_chantier présente)', false, absente.message)
    else {
      T('L1 drapeau levé sur ce serveur local : sans session, 401', sonde === 401, String(sonde))
      const comptes = []
      const creer = async (nom, plan) => {
        const slug = `lot4-${nom}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
        const email = `${slug}@presti-test.invalid`, mdp = crypto.randomUUID() + 'Aa1!'
        const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
        if (error) throw new Error(`compte ${nom} : ${error.message}`)
        comptes.push(u.user.id)
        const { error: ea } = await admin.from('artisans').insert({ id: u.user.id, email, nom: `Test lot 4 ${nom}`, metier: 'Chauffagiste', slug, plan })
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
        console.log('\n── L. Comptes de test @presti-test.invalid, données semées par la clé de service')
        const [CA, CB] = [await creer('A', 'signature'), await creer('B', 'signature')]
        const lu = await http(CA, '/api/crm/apres-chantier')
        T('L2 réglages lus : désactivés par défaut', lu.status === 200 && lu.corps?.reglages?.avis === false && lu.corps?.reglages?.entretien === false, JSON.stringify(lu))
        T('L3 un texte avec lien est refusé (400)', (await http(CA, '/api/crm/apres-chantier', { method: 'PUT', body: { avis: true, entretien: true, texte_avis: 'Laissez un avis sur https://exemple.test/avis merci beaucoup' } })).status === 400)
        const act = await http(CA, '/api/crm/apres-chantier', { method: 'PUT', body: { avis: true, entretien: true } })
        T('L4 activer : enregistré, date d’activation posée', act.status === 200 && !!act.corps?.reglages?.actif_depuis, JSON.stringify(act))
        // Un devis signé, client @presti-test.invalid (jamais délivré), et le chantier de la chaudière terminé avant-hier.
        const avantHier = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10)
        const { data: dv, error: ed } = await admin.from('devis').insert({ artisan_id: CA.uid, statut: 'accepte', objet: 'Remplacement chaudière gaz', client_nom: 'Client lot 4', client_email: `client-${crypto.randomBytes(3).toString('hex')}@presti-test.invalid`, total_ttc: 4200 }).select('id').single()
        if (ed) throw new Error(`devis : ${ed.message}`)
        const { data: ch, error: ec } = await admin.from('chantiers').insert({ artisan_id: CA.uid, devis_id: dv.id, titre: 'Chaudière, séjour', statut: 'termine', date_debut: avantHier, date_fin_reelle: avantHier }).select('id').single()
        if (ec) throw new Error(`chantier : ${ec.message}`)
        // Le passage quotidien, joué avec la clé de service et les MÊMES règles (lib/apresChantierTour.ts).
        const jour = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
        const r = await Tr.tourApresChantier(jour, {
          lireReglages: async () => { const x = await admin.from('crm_apres_chantier').select('artisan_id, avis, entretien, texte_avis, texte_entretien, actif_depuis').eq('artisan_id', CA.uid); return { data: x.data, error: x.error } },
          lirePlans: async (ids) => { const x = await admin.from('artisans').select('id, plan, is_founder').in('id', ids); return { data: x.data, error: x.error } },
          lireChantiers: async (id) => { const x = await admin.from('chantiers').select('id, titre, statut, date_fin_reelle, client_nom').eq('artisan_id', id).eq('statut', 'termine'); return { data: (x.data ?? []).map((c) => ({ ...c, textes: ['Remplacement chaudière gaz'] })), error: x.error } },
          lireCles: async (id) => { const x = await admin.from('crm_rappels').select('cle').eq('artisan_id', id).not('cle', 'is', null); return { data: x.data?.map((y) => y.cle), error: x.error } },
          poser: async (id, lignes) => { const x = await admin.from('crm_rappels').upsert(lignes.map((p) => ({ artisan_id: id, chantier_id: p.chantier_id, type: p.type, echeance: p.echeance, origine: 'systeme', cle: p.cle, texte: p.texte })), { onConflict: 'artisan_id,cle', ignoreDuplicates: true }); return { error: x.error } },
        })
        const { data: poses } = await admin.from('crm_rappels').select('id, type, cle, echeance, envoye_le').eq('artisan_id', CA.uid).order('type')
        T('L5 le passage pose « demande d’avis » (aujourd’hui) et « entretien » (dans un an moins 15 jours) ; la base accepte les deux types (0165)', r.poses === 2 && (poses ?? []).length === 2 && poses.some((p) => p.type === 'demande_avis' && p.echeance === jour) && poses.some((p) => p.type === 'entretien'), JSON.stringify([r, poses]))
        await Tr.tourApresChantier(jour, { lireReglages: async () => ({ data: [], error: null }), lirePlans: async () => ({ data: [], error: null }), lireChantiers: async () => ({ data: [], error: null }), lireCles: async () => ({ data: [], error: null }), poser: async () => ({ error: null }) })
        const avis = poses.find((p) => p.type === 'demande_avis')
        const prep = await http(CA, `/api/crm/apres-chantier/message?rappel_id=${avis.id}`)
        T('L6 préparer : le texte de l’artisan rempli (client, chantier, nom), le destinataire, envoyable ; rien n’est écrit', prep.status === 200 && /Client lot 4/.test(prep.corps?.texte ?? '') && /Chaudière, séjour/.test(prep.corps?.texte ?? '') && /presti-test\.invalid$/.test(prep.corps?.destinataire ?? '') && prep.corps?.envoyable === true, JSON.stringify(prep).slice(0, 400))
        T('L7 le compte B ne prépare pas le message d’un rappel de A (404)', (await http(CB, `/api/crm/apres-chantier/message?rappel_id=${avis.id}`)).status === 404)
        T('L8 un message avec lien est refusé à l’envoi (400), rien ne part', (await http(CA, '/api/crm/apres-chantier/message', { method: 'POST', body: { rappel_id: avis.id, message: 'Bonjour, un avis sur www.exemple.test serait super, merci !' } })).status === 400)
        const env = await http(CA, '/api/crm/apres-chantier/message', { method: 'POST', body: { rappel_id: avis.id, message: prep.corps.texte } })
        const { data: apres } = await admin.from('crm_rappels').select('fait_le, envoye_le').eq('id', avis.id).maybeSingle()
        T('L9 envoyer (vers @presti-test.invalid, jamais délivré) : 201, le rappel est coché avec la date d’envoi', env.status === 201 && !!apres?.envoye_le && !!apres?.fait_le, JSON.stringify([env, apres]))
        T('L10 déjà parti : un second envoi est refusé (409)', (await http(CA, '/api/crm/apres-chantier/message', { method: 'POST', body: { rappel_id: avis.id, message: prep.corps.texte } })).status === 409)
        const ent = poses.find((p) => p.type === 'entretien')
        const e2 = await http(CA, '/api/crm/apres-chantier/message', { method: 'POST', body: { rappel_id: ent.id, message: 'Bonjour {client}, l’entretien de votre {equipement} approche : on fixe une date ?' } })
        T('L11 un message par jour et par client : l’entretien au même client le même jour est refusé (429)', e2.status === 429, JSON.stringify(e2))
        await http(CA, '/api/crm/apres-chantier', { method: 'PUT', body: { avis: false, entretien: false } })
        const coupe = await http(CA, `/api/crm/apres-chantier/message?rappel_id=${ent.id}`)
        T('L12 réglage coupé : le message n’est plus envoyable (et l’écran le dit)', coupe.status === 200 && coupe.corps?.envoyable === false && coupe.corps.avertissements.some((a) => /désactivé/.test(a)))
      } catch (e) { T('L erreur inattendue', false, e.message) } finally {
        let restes = 0
        for (const id of comptes) {
          const { error } = await admin.rpc('purger_compte_test', { p_id: id })
          if (error) console.log(`  ⚠️ purge ${id} : ${error.message}`)
          for (const t of ['crm_rappels', 'chantiers', 'devis', 'crm_apres_chantier']) { const { count } = await admin.from(t).select('*', { count: 'exact', head: true }).eq('artisan_id', id); restes += count ?? 0 }
          const { count } = await admin.from('artisans').select('*', { count: 'exact', head: true }).eq('id', id); restes += count ?? 0
        }
        T(`L13 nettoyage : les ${comptes.length} comptes de test et toutes leurs lignes sont supprimés`, restes === 0, `${restes} reste(s)`)
      }
    }
  }
}

console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)${rouges.length ? ' : ' + rouges.join(' · ') : ''}`)
process.exitCode = rouges.length ? 1 : 0
