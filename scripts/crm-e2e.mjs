#!/usr/bin/env node
// scripts/crm-e2e.mjs — les routes /api/crm/* contre un VRAI serveur, en deux modes.
//
//  --drapeau=baisse (défaut)  Aucun compte, aucune base, aucune écriture : contre n'importe quel serveur bâti avec
//                             `crm: false` (le dépôt tel quel), chaque route et chaque méthode répond 404 — sans jeton, avec un
//                             jeton bidon, avec un corps — et la page /crm aussi. Prouve que le drapeau ferme tout AVANT la
//                             session. Usage : TEST_BASE=http://localhost:3157 node scripts/crm-e2e.mjs
//
//  --drapeau=leve             Le parcours complet sur une base de TEST, jamais la production :
//                             création / lecture / modification / suppression d'un chantier et de ses tâches (dont la
//                             génération depuis les lignes d'un devis signé), réservation puis sortie d'un matériau (le
//                             stock baisse une fois), véhicule, membre, notes, déplacement manuel journalisé ; IDOR : un
//                             AUTRE compte Signature ne lit, ne modifie, ne supprime rien du premier (404 partout, la ligne
//                             reste intacte) et ne peut pas rattacher ses objets à ceux du premier ; refus sans capacité : un
//                             compte Studio reçoit 403 sur chaque route ; sans jeton : 401. Comptes créés puis SUPPRIMÉS
//                             dans un finally, même en cas d'échec.
//    Prérequis : la migration 0141 appliquée sur la base de test, et un serveur de l'application BRANCHÉ SUR CETTE BASE avec le
//    drapeau `crm` levé dans SA copie (jamais dans le dépôt).
//    Variables : TEST_BASE (le serveur), CRM_E2E_SUPABASE_URL, CRM_E2E_ANON_KEY, CRM_E2E_SERVICE_KEY (la base de test).
//    Garde : la suite REFUSE de tourner (code 2) si CRM_E2E_SUPABASE_URL est l'adresse Supabase de .env.local (la production),
//    ou si TEST_BASE est le domaine de production. Elle ne lit jamais les clés de .env.local.
//
// Codes : 0 vert · 1 rouge · 2 appel refusé (production visée, variable manquante, migration absente).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mode = (process.argv.find((a) => a.startsWith('--drapeau='))?.split('=')[1]) ?? 'baisse'
const BASE = (process.env.TEST_BASE || '').replace(/\/$/, '')
if (!BASE) { console.error('TEST_BASE manquant (ex. http://localhost:3157).'); process.exit(2) }

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${String(d).slice(0, 300)}` : ''}`) } }
const fin = () => { console.log(`\n${ok} vert(s), ${ko} rouge(s)`); process.exitCode = ko ? 1 : 0 }
const Z = '00000000-0000-4000-8000-000000000000'

// Toutes les routes du CRM, avec un identifiant quelconque là où il en faut un.
const ROUTES = [
  ['GET', '/api/crm/vue'], ['POST', '/api/crm/pipeline'],
  ['GET', '/api/crm/chantiers'], ['POST', '/api/crm/chantiers'],
  ['GET', `/api/crm/chantiers/${Z}`], ['PATCH', `/api/crm/chantiers/${Z}`], ['DELETE', `/api/crm/chantiers/${Z}`],
  ['POST', `/api/crm/chantiers/${Z}/taches`], ['POST', `/api/crm/chantiers/${Z}/materiaux`],
  ['PATCH', `/api/crm/taches/${Z}`], ['DELETE', `/api/crm/taches/${Z}`],
  ['PATCH', `/api/crm/materiaux/${Z}`], ['DELETE', `/api/crm/materiaux/${Z}`],
  ['GET', '/api/crm/vehicules'], ['POST', '/api/crm/vehicules'], ['PATCH', `/api/crm/vehicules/${Z}`], ['DELETE', `/api/crm/vehicules/${Z}`],
  ['GET', '/api/crm/equipe'], ['POST', '/api/crm/equipe'], ['PATCH', `/api/crm/equipe/${Z}`], ['DELETE', `/api/crm/equipe/${Z}`],
  ['GET', '/api/crm/notes?chantier_id=' + Z], ['POST', '/api/crm/notes'], ['PATCH', `/api/crm/notes/${Z}`], ['DELETE', `/api/crm/notes/${Z}`],
  ['GET', '/api/crm/clients'], ['GET', '/api/crm/clients?ref=' + 'a'.repeat(64)],
]
const brut = (methode, chemin, jeton, body) => fetch(BASE + chemin, {
  method: methode, redirect: 'manual',
  headers: { ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
  body: body !== undefined ? JSON.stringify(body) : undefined,
})

// ═══════════════════════ Mode « drapeau baissé » ═══════════════════════
if (mode === 'baisse') {
  console.log(`\n── Drapeau baissé : tout répond 404 (${BASE})`)
  const jetonBidon = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.bidon'
  for (const [m, r] of ROUTES) {
    const a = await brut(m, r, null, m === 'GET' || m === 'DELETE' ? undefined : { titre: 'x' })
    const b = await brut(m, r, jetonBidon, m === 'GET' || m === 'DELETE' ? undefined : { titre: 'x' })
    const corps = await b.text()
    T(`${m} ${r.split('?')[0]} → 404 sans jeton et avec un jeton bidon, sans corps`, a.status === 404 && b.status === 404 && corps === '', `${a.status}/${b.status} ${corps.slice(0, 80)}`)
  }
  for (const page of ['/crm', '/crm?vue=pipeline', `/crm/chantiers/${Z}`, `/crm/clients/${'a'.repeat(64)}`]) {
    const r = await fetch(BASE + page, { redirect: 'manual' })
    T(`page ${page} → 404`, r.status === 404, String(r.status))
  }
  // Le menu de la console ne propose pas le CRM (la page du tableau de bord est rendue côté client : on lit le JS servi).
  const tdb = await fetch(BASE + '/dashboard').then((r) => r.text()).catch(() => '')
  T('la console servie ne contient aucun lien vers /crm', !/href="\/crm"/.test(tdb))
  fin()
} else if (mode !== 'leve') {
  console.error('Mode inconnu : --drapeau=baisse ou --drapeau=leve'); process.exit(2)
} else {
  // ═══════════════════════ Mode « drapeau levé », base de TEST ═══════════════════════
  const SB = process.env.CRM_E2E_SUPABASE_URL, ANON = process.env.CRM_E2E_ANON_KEY, SVC = process.env.CRM_E2E_SERVICE_KEY
  if (!SB || !ANON || !SVC) { console.error('CRM_E2E_SUPABASE_URL, CRM_E2E_ANON_KEY et CRM_E2E_SERVICE_KEY sont obligatoires (base de TEST).'); process.exit(2) }
  // La garde : jamais la production. On lit SEULEMENT l'adresse Supabase de .env.local, pour la comparer.
  let prod = null
  try { prod = fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8').match(/^NEXT_PUBLIC_SUPABASE_URL=["']?([^"'\r\n]+)/m)?.[1]?.trim() ?? null } catch { /* pas de .env.local : rien à comparer */ }
  const hote = (u) => { try { return new URL(u).host.toLowerCase() } catch { return u } }
  if (prod && hote(prod) === hote(SB)) { console.error('⛔ CRM_E2E_SUPABASE_URL est la base de PRODUCTION (.env.local). Refusé : rien n’a été écrit.'); process.exit(2) }
  if (/prestiapp\.fr/i.test(BASE)) { console.error('⛔ TEST_BASE vise le domaine de production. Refusé.'); process.exit(2) }

  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(SB, SVC, { auth: { persistSession: false } })
  // Les aides de connexion lisent ces deux variables au moment de l'appel : on les fait pointer sur la base de TEST.
  process.env.NEXT_PUBLIC_SUPABASE_URL = SB
  process.env.SUPABASE_SERVICE_ROLE_KEY = SVC
  const { verifierSessionTest } = await import('./lib/connexion-test.mjs')

  const { error: eMig } = await admin.from('chantiers').select('id').limit(0)
  if (eMig) { console.error(`⏸  Migration 0141 absente de la base de test (${eMig.message}).`); process.exit(2) }

  const comptes = []
  async function creer(plan, nom) {
    const email = `verif-crm-${nom}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}@presti-test.invalid`
    const motDePasse = crypto.randomBytes(18).toString('base64url')
    const { data: u, error } = await admin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
    if (error) throw new Error(`compte ${nom} : ${error.message}`)
    comptes.push(u.user.id)
    const { error: eA } = await admin.from('artisans').insert({ id: u.user.id, email, nom: `CRM ${nom}`, metier: 'Plombier', slug: `verif-crm-${nom}-${Date.now()}`, plan })
    if (eA) throw new Error(`artisan ${nom} : ${eA.message}`)
    const pub = createClient(SB, ANON, { auth: { persistSession: false } })
    const { data: s, error: e2 } = await pub.auth.signInWithPassword({ email, password: motDePasse })
    if (e2) throw new Error(`connexion ${nom} : ${e2.message}`)
    await verifierSessionTest(s.session.access_token)
    const jeton = s.session.access_token
    const appel = async (methode, chemin, body) => { const r = await brut(methode, chemin, jeton, body); return { statut: r.status, corps: await r.json().catch(() => null) } }
    return { uid: u.user.id, appel }
  }

  try {
    const A = await creer('signature', 'a')
    const B = await creer('signature', 'b')
    const S = await creer('studio', 's')

    console.log('\n── Refus sans capacité (Studio) et sans jeton')
    for (const [m, r] of ROUTES) {
      const x = await S.appel(m, r, m === 'GET' || m === 'DELETE' ? undefined : { titre: 'x' })
      const y = await brut(m, r, null, m === 'GET' || m === 'DELETE' ? undefined : { titre: 'x' })
      T(`${m} ${r.split('?')[0]} : Studio → 403 « Signature », sans jeton → 401`, x.statut === 403 && /Signature/.test(x.corps?.error ?? '') && y.status === 401, `${x.statut} ${y.status}`)
    }

    console.log('\n── Le parcours de A : devis signé → chantier → tâches → matériel → notes')
    // Un devis SIGNÉ de A, avec deux lignes, posé par la clé de service (la création de devis a ses propres suites).
    const { data: devis } = await admin.from('devis').insert({ artisan_id: A.uid, statut: 'accepte', objet: 'Remplacement chauffe-eau', client_nom: 'Client test', client_email: 'client@presti-test.invalid', total_ttc: 1200, accepte_le: new Date().toISOString() }).select('id').single()
    await admin.from('devis_lignes').insert([{ devis_id: devis.id, ordre: 0, designation: 'Dépose de l’ancien appareil', quantite: 1, unite: 'u' }, { devis_id: devis.id, ordre: 1, designation: 'Pose et raccordement', quantite: 1, unite: 'u' }])
    const { data: devisBrouillon } = await admin.from('devis').insert({ artisan_id: A.uid, statut: 'brouillon', objet: 'Brouillon' }).select('id').single()

    const refuseBrouillon = await A.appel('POST', '/api/crm/chantiers', { devis_id: devisBrouillon.id })
    T('un devis non signé ne donne pas de chantier (409)', refuseBrouillon.statut === 409, JSON.stringify(refuseBrouillon))
    const cree = await A.appel('POST', '/api/crm/chantiers', { devis_id: devis.id, generer_taches: true, date_debut: '2030-01-10', date_fin_prevue: '2030-01-12' })
    T('création depuis le devis signé : 201, deux tâches nées des lignes', cree.statut === 201 && cree.corps?.taches === 2, JSON.stringify(cree))
    const chId = cree.corps?.id
    const doublon = await A.appel('POST', '/api/crm/chantiers', { devis_id: devis.id })
    T('un deuxième chantier sur le même devis : 409', doublon.statut === 409)
    const fiche = await A.appel('GET', `/api/crm/chantiers/${chId}`)
    T('lecture de la fiche : titre du devis, 2 tâches, avancement 0 %, étape « chantier »', fiche.statut === 200 && fiche.corps.chantier.titre === 'Remplacement chauffe-eau' && fiche.corps.taches.length === 2 && fiche.corps.avancement.pct === 0 && fiche.corps.etape === 'chantier', JSON.stringify(fiche.corps?.avancement))
    T('« Facturer » actif (devis signé, aucune facture) ; « Notifier » désactivé avec sa raison (pas de demande)', fiche.corps.actions.facturer.actif === true && fiche.corps.actions.notifier.actif === false && !!fiche.corps.actions.notifier.raison)
    const t0 = fiche.corps.taches[0]
    const coche = await A.appel('PATCH', `/api/crm/taches/${t0.id}`, { faite: true })
    const regen = await A.appel('POST', `/api/crm/chantiers/${chId}/taches`, { depuis_devis: true })
    const ajout = await A.appel('POST', `/api/crm/chantiers/${chId}/taches`, { libelle: 'Mise en service' })
    const renomme = await A.appel('PATCH', `/api/crm/taches/${ajout.corps?.id}`, { libelle: 'Mise en service et essai' })
    const apres = await A.appel('GET', `/api/crm/chantiers/${chId}`)
    T('tâche cochée, régénération sans doublon, ajout et renommage', coche.statut === 200 && regen.corps?.creees === 0 && ajout.statut === 201 && renomme.statut === 200 && apres.corps.taches.length === 3 && apres.corps.avancement.pct === 33 && apres.corps.taches.some((t) => t.libelle === 'Mise en service et essai'))
    T('le journal porte la création et la tâche cochée', apres.corps.journal.some((j) => j.champ === 'creation') && apres.corps.journal.some((j) => j.objet === 'tache' && j.vers === 'true'))
    const maj = await A.appel('PATCH', `/api/crm/chantiers/${chId}`, { statut: 'en_cours', ville: 'Ville test' })
    const relu = await A.appel('GET', `/api/crm/chantiers/${chId}`)
    T('modification : statut « en cours », ville ; journalisé', maj.statut === 200 && relu.corps.chantier.statut === 'en_cours' && relu.corps.chantier.ville === 'Ville test' && relu.corps.journal.some((j) => j.champ === 'statut' && j.vers === 'en_cours'))
    const mauvais = await A.appel('PATCH', `/api/crm/chantiers/${chId}`, { statut: 'fini', artisan_id: B.uid })
    T('modification invalide (statut inconnu, champ interdit) : 400', mauvais.statut === 400)

    const membre = await A.appel('POST', '/api/crm/equipe', { nom: 'Compagnon test', role: 'compagnon' })
    const vehicule = await A.appel('POST', '/api/crm/vehicules', { nom: 'Camionnette test', conducteur_id: membre.corps?.id })
    const affecte = await A.appel('PATCH', `/api/crm/chantiers/${chId}`, { equipe: [membre.corps?.id], vehicule_id: vehicule.corps?.id })
    const avecEquipe = await A.appel('GET', `/api/crm/chantiers/${chId}`)
    T('équipe et camionnette affectées', membre.statut === 201 && vehicule.statut === 201 && affecte.statut === 200 && avecEquipe.corps.equipe.length === 1 && avecEquipe.corps.vehicule?.id === vehicule.corps.id)

    const { data: mat } = await admin.from('materiaux').insert({ artisan_id: A.uid, nom: 'Raccord test', unite: 'u', seuil_alerte: 1 }).select('id').single()
    await admin.rpc('appliquer_mouvement', { p_artisan: A.uid, p_materiau: mat.id, p_type: 'entree', p_quantite: 10, p_lieu: 'atelier' })
    const resa = await A.appel('POST', `/api/crm/chantiers/${chId}/materiaux`, { materiau_id: mat.id, quantite: 4 })
    const stockAvant = (await admin.from('stock').select('quantite').eq('materiau_id', mat.id).eq('lieu', 'atelier').single()).data?.quantite
    const sortie = await A.appel('PATCH', `/api/crm/materiaux/${resa.corps?.id}`, { action: 'sortir' })
    const deuxieme = await A.appel('PATCH', `/api/crm/materiaux/${resa.corps?.id}`, { action: 'sortir' })
    const stockApres = (await admin.from('stock').select('quantite').eq('materiau_id', mat.id).eq('lieu', 'atelier').single()).data?.quantite
    const mvt = (await admin.from('mouvements_stock').select('type, quantite, devis_id').eq('materiau_id', mat.id).eq('type', 'sortie')).data ?? []
    T('réserver ne touche pas au stock ; sortir le baisse une fois (10 → 6), mouvement rattaché au devis', resa.statut === 201 && Number(stockAvant) === 10 && sortie.statut === 200 && sortie.corps.reste === 6 && deuxieme.statut === 409 && Number(stockApres) === 6 && mvt.length === 1 && mvt[0].devis_id === devis.id, JSON.stringify({ stockAvant, sortie: sortie.corps, deuxieme: deuxieme.statut, stockApres, mvt }))

    const note = await A.appel('POST', '/api/crm/notes', { texte: 'Accès par le portail de derrière', chantier_id: chId })
    const vue = await A.appel('GET', '/api/crm/vue')
    const client = vue.corps?.clients?.find((c) => c.devis > 0)
    const noteClient = client ? await A.appel('POST', '/api/crm/notes', { texte: 'Préfère être appelé le matin', client: client.id }) : { statut: 0 }
    const ficheClient = client ? await A.appel('GET', `/api/crm/clients?ref=${client.id}`) : { statut: 0 }
    T('notes sur le chantier et sur le client ; fiche 360° : devis, chantier, note, aucun rendez-vous inventé', note.statut === 201 && noteClient.statut === 201 && ficheClient.statut === 200 && ficheClient.corps.devis.length >= 1 && ficheClient.corps.chantiers.length === 1 && ficheClient.corps.notes.length === 1 && ficheClient.corps.prochainRendezVous === null)
    const carte = vue.corps?.pipeline?.colonnes?.flatMap((c) => c.cartes).find((c) => c.devisId === devis.id)
    T('pipeline : le dossier est en « Chantier », d’après ses vrais statuts', carte?.etape === 'chantier' && carte?.manuel === false)
    const dep = await A.appel('POST', '/api/crm/pipeline', { objet: 'devis', id: devis.id, vers: 'a_facturer' })
    const vue2 = await A.appel('GET', '/api/crm/vue')
    const carte2 = vue2.corps?.pipeline?.colonnes?.flatMap((c) => c.cartes).find((c) => c.devisId === devis.id)
    const journalDep = (await admin.from('crm_journal').select('champ, de, vers, etape_derivee').eq('artisan_id', A.uid).eq('objet_id', devis.id).eq('champ', 'etape')).data ?? []
    T('déplacement manuel : la carte passe « À facturer » marquée « à la main », journalisé avec l’étape réelle', dep.statut === 200 && carte2?.etape === 'a_facturer' && carte2?.manuel === true && journalDep.length === 1 && journalDep[0].etape_derivee === 'chantier')
    const { data: devisApres } = await admin.from('devis').select('statut').eq('id', devis.id).single()
    T('… et aucun vrai statut n’a changé (le devis reste « accepte »)', devisApres?.statut === 'accepte')

    console.log('\n── IDOR : B (Signature lui aussi) face aux objets de A')
    const idor = [
      ['GET', `/api/crm/chantiers/${chId}`], ['PATCH', `/api/crm/chantiers/${chId}`, { titre: 'piraté' }], ['DELETE', `/api/crm/chantiers/${chId}`],
      ['POST', `/api/crm/chantiers/${chId}/taches`, { libelle: 'intrus' }], ['POST', `/api/crm/chantiers/${chId}/taches`, { depuis_devis: true }],
      ['POST', `/api/crm/chantiers/${chId}/materiaux`, { materiau_id: mat.id, quantite: 1 }],
      ['PATCH', `/api/crm/taches/${t0.id}`, { faite: false }], ['DELETE', `/api/crm/taches/${t0.id}`],
      ['PATCH', `/api/crm/materiaux/${resa.corps?.id}`, { action: 'sortir' }], ['DELETE', `/api/crm/materiaux/${resa.corps?.id}`],
      ['PATCH', `/api/crm/vehicules/${vehicule.corps?.id}`, { nom: 'piraté' }], ['DELETE', `/api/crm/vehicules/${vehicule.corps?.id}`],
      ['PATCH', `/api/crm/equipe/${membre.corps?.id}`, { nom: 'piraté' }], ['DELETE', `/api/crm/equipe/${membre.corps?.id}`],
      ['GET', `/api/crm/notes?chantier_id=${chId}`], ['PATCH', `/api/crm/notes/${note.corps?.id}`, { texte: 'piraté' }], ['DELETE', `/api/crm/notes/${note.corps?.id}`],
      ['POST', '/api/crm/notes', { texte: 'intrus', chantier_id: chId }],
      ['GET', `/api/crm/clients?ref=${client?.id}`], ['GET', `/api/crm/clients?ref=d-${devis.id}`],
      ['POST', '/api/crm/chantiers', { devis_id: devis.id }],
      ['POST', '/api/crm/pipeline', { objet: 'devis', id: devis.id, vers: 'paye' }],
    ]
    for (const [m, r, body] of idor) {
      const x = await B.appel(m, r, body)
      const lecture = m === 'GET' && r.startsWith('/api/crm/notes')
      T(`B ${m} ${r.replace(/[0-9a-f-]{36}|[0-9a-f]{64}/g, '…')} → ${lecture ? '200 et liste vide' : '404'}`, lecture ? x.statut === 200 && x.corps?.notes?.length === 0 : x.statut === 404, `${x.statut} ${JSON.stringify(x.corps).slice(0, 120)}`)
    }
    // B rattache SES objets à ceux de A : véhicule ou membre de A dans son chantier.
    const chB = await B.appel('POST', '/api/crm/chantiers', { titre: 'Chantier de B' })
    const volVehicule = await B.appel('PATCH', `/api/crm/chantiers/${chB.corps?.id}`, { vehicule_id: vehicule.corps?.id })
    const volEquipe = await B.appel('PATCH', `/api/crm/chantiers/${chB.corps?.id}`, { equipe: [membre.corps?.id] })
    const volMat = await B.appel('POST', `/api/crm/chantiers/${chB.corps?.id}/materiaux`, { materiau_id: mat.id, quantite: 1 })
    T('B ne peut rattacher ni le véhicule, ni le membre, ni le matériau de A à son chantier (404)', chB.statut === 201 && volVehicule.statut === 404 && volEquipe.statut === 404 && volMat.statut === 404)
    const vueB = await B.appel('GET', '/api/crm/vue')
    T('la vue de B ne contient rien de A', vueB.statut === 200 && !JSON.stringify(vueB.corps).includes(devis.id) && !JSON.stringify(vueB.corps).includes(chId))
    const intact = await A.appel('GET', `/api/crm/chantiers/${chId}`)
    T('le chantier de A est intact après les tentatives de B (titre, tâches, réservation, note, véhicule)', intact.statut === 200 && intact.corps.chantier.titre === 'Remplacement chauffe-eau' && intact.corps.taches.length === 3 && intact.corps.taches.find((t) => t.id === t0.id)?.faite === true && intact.corps.notes.length === 1 && intact.corps.vehicule?.nom === 'Camionnette test')

    console.log('\n── Suppressions par A')
    const supT = await A.appel('DELETE', `/api/crm/taches/${t0.id}`)
    const supN = await A.appel('DELETE', `/api/crm/notes/${note.corps?.id}`)
    const supC = await A.appel('DELETE', `/api/crm/chantiers/${chId}`)
    const relire = await A.appel('GET', `/api/crm/chantiers/${chId}`)
    const restesTaches = (await admin.from('chantier_taches').select('id').eq('chantier_id', chId)).data ?? []
    const journalReste = (await admin.from('crm_journal').select('id').eq('artisan_id', A.uid).eq('objet_id', chId)).data ?? []
    T('suppression : tâche, note, puis chantier (404 ensuite, tâches parties, journal gardé, devis intact)', supT.statut === 200 && supN.statut === 200 && supC.statut === 200 && relire.statut === 404 && restesTaches.length === 0 && journalReste.length > 0)
    const supV = await A.appel('DELETE', `/api/crm/vehicules/${vehicule.corps?.id}`)
    const supM = await A.appel('DELETE', `/api/crm/equipe/${membre.corps?.id}`)
    T('suppression du véhicule et du membre', supV.statut === 200 && supM.statut === 200)
  } catch (e) {
    ko++; console.log(`  ❌ arrêt : ${e.message}`)
  } finally {
    // Ménage, quoi qu'il arrive : les comptes de test et tout ce qui leur appartient (cascade sur artisans).
    for (const id of comptes) {
      await admin.from('artisans').delete().eq('id', id)
      await admin.auth.admin.deleteUser(id).catch(() => {})
    }
    const restes = comptes.length ? (await admin.from('artisans').select('id').in('id', comptes)).data ?? [] : []
    T(`ménage : ${comptes.length} compte(s) de test supprimé(s)`, restes.length === 0)
    fin()
  }
}
