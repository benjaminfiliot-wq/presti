// Test permanent — inventaire v2 (§8 F1 + F2).
//
// Ce qu'il prouve, contre l'API locale (npm run dev) ou la prod :
//   1. le verrou d'offre `inventaire.stock` est SERVEUR sur les trois nouvelles routes ;
//   2. la fiche matériau : création rapide (nom + prix), fiche complète, import CSV avec
//      aperçu avant enregistrement, historique des prix vus et « à revérifier » > 30 j ;
//   3. « Mes fournisseurs » : fiche, liste de départ idempotente, ordre de préférence ;
//   4. l'ISOLATION : un second artisan, avec SON jeton (jamais la clé de service), ne lit ni
//      matériaux, ni observations, ni fournisseurs du premier — via l'API et en direct
//      contre PostgREST (RLS). C'est la règle juridique du plan §8 : une observation de prix
//      appartient à l'artisan qui l'a demandée, point.
//
// Usage : TEST_BASE=http://localhost:3112 node scripts/inventaire-v2-e2e.mjs
//
// Si la migration 0048 n'est pas appliquée sur la base visée, les sections qui en dépendent
// sont marquées « non vérifiées » et le script sort en code 2 (ni vert, ni rouge : en attente).

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { verifierSessionTest } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const admin = createClient(URL_SB, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0, attente = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const NOTE_ACCES = 'ce site n’affiche ses prix qu’aux comptes connectés : vous verrez le catalogue, pas vos tarifs'

const comptes = []
async function creer(plan, nom) {
  const email = `verif-inv2-${nom}-${Date.now()}@presti-test.invalid`
  const motDePasse = crypto.randomBytes(18).toString('base64url')
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
  if (error) throw new Error(`compte ${nom} : ${error.message}`)
  await admin.from('artisans').insert({ id: u.user.id, email, nom: `Inv2 ${nom}`, metier: 'Plombier', slug: `verif-inv2-${nom}-${Date.now()}`, plan })
  comptes.push(u.user.id)
  // Connexion RÉELLE : c'est ce jeton, et pas la clé de service, qui doit se heurter au verrou et à la RLS.
  const pub = createClient(URL_SB, ANON, { auth: { persistSession: false } })
  const { data: s, error: e2 } = await pub.auth.signInWithPassword({ email, password: motDePasse })
  await verifierSessionTest(s?.session?.access_token)
  if (e2) throw new Error(`connexion ${nom} : ${e2.message}`)
  const token = s.session.access_token
  const appel = async (chemin, init = {}) => {
    const r = await fetch(`${BASE}${chemin}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) } })
    return { statut: r.status, corps: await r.json().catch(() => null) }
  }
  const db = createClient(URL_SB, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } })
  return { uid: u.user.id, appel, db }
}
const post = (appel, chemin, body) => appel(chemin, { method: 'POST', body: JSON.stringify(body) })

try {
  // ── La migration est-elle là ? (lecture seule, clé de service, aucune écriture)
  const { error: eMig } = await admin.from('prix_observations').select('id').limit(0)
  const { error: eCol } = await admin.from('materiaux').select('reference_fabricant').limit(0)
  const migration = !eMig && !eCol
  if (!migration) console.log(`\n⏸  Migration 0048 non appliquée sur ${URL_SB} (${(eMig || eCol)?.message}). Seules les sections indépendantes sont vérifiées.`)

  console.log('\n── 1. Le verrou d’offre est côté serveur, sur les trois routes')
  const essentiel = await creer('essentiel', 'ess')
  for (const route of ['/api/inventaire/materiaux', '/api/inventaire/observations?materiau_id=00000000-0000-4000-8000-000000000000', '/api/inventaire/fournisseurs']) {
    const r = await essentiel.appel(route)
    T(`Essentiel → 403 sur ${route.split('?')[0]}`, r.statut === 403, `${r.statut}`)
  }
  const ecr = await post(essentiel.appel, '/api/inventaire/materiaux', { nom: 'Tentative', prix_achat_ht: 1 })
  T('Essentiel ne peut pas écrire non plus', ecr.statut === 403, `${ecr.statut}`)
  const ecrF = await post(essentiel.appel, '/api/inventaire/fournisseurs', { liste_depart: true })
  T('… ni insérer la liste de départ', ecrF.statut === 403, `${ecrF.statut}`)
  for (const route of ['/api/inventaire/materiaux', '/api/inventaire/observations', '/api/inventaire/fournisseurs']) {
    const r = await fetch(`${BASE}${route}`)
    T(`sans jeton : 401 sur ${route}`, r.status === 401, `${r.status}`)
  }

  console.log('\n── 2. Les pages répondent')
  for (const p of ['/inventaire', '/inventaire/fournisseurs']) {
    const r = await fetch(`${BASE}${p}`)
    T(`${p} → 200`, r.status === 200, `${r.status}`)
  }

  if (!migration) {
    attente = 1
  } else {
    const A = await creer('studio', 'a')

    console.log('\n── 3. Fournisseurs : fiche, liste de départ idempotente, ordre')
    const vide = await A.appel('/api/inventaire/fournisseurs')
    T('Studio ouvre « Mes fournisseurs », vide au départ', vide.statut === 200 && vide.corps.fournisseurs.length === 0, JSON.stringify(vide.corps))
    const four = await post(A.appel, '/api/inventaire/fournisseurs', { nom: 'Mon négoce du coin', url: 'negoce-du-coin.fr', type: 'negoce', remise_pct: 15, delai_jours: 2, agence: 'Lyon Sud', contact: 'Marc 06…', numero_compte: 'C-1234' })
    T('une fiche fournisseur est créée', four.statut === 200 && !!four.corps?.id, JSON.stringify(four.corps))
    const fA = four.corps.fournisseurs.find((f) => f.id === four.corps.id)
    T('l’URL est normalisée en https', fA?.url === 'https://negoce-du-coin.fr', fA?.url)
    T('remise et délai sont ceux saisis (aucune valeur par défaut)', Number(fA?.remise_pct) === 15 && Number(fA?.delai_jours) === 2, JSON.stringify(fA))
    const sansValeurs = await post(A.appel, '/api/inventaire/fournisseurs', { nom: 'Sans rien', type: 'gsb' })
    const fS = sansValeurs.corps?.fournisseurs?.find((f) => f.id === sansValeurs.corps.id)
    T('un fournisseur sans remise ni délai les garde VIDES (anti-fabrication)', fS && fS.remise_pct === null && fS.delai_jours === null && fS.url === null, JSON.stringify(fS))
    const dep1 = await post(A.appel, '/api/inventaire/fournisseurs', { liste_depart: true })
    T('la liste de départ ajoute 8 fournisseurs vérifiés', dep1.statut === 200 && dep1.corps.ajoutes === 8, JSON.stringify({ statut: dep1.statut, ajoutes: dep1.corps?.ajoutes }))
    const dep2 = await post(A.appel, '/api/inventaire/fournisseurs', { liste_depart: true })
    T('un second clic n’ajoute rien (idempotent)', dep2.corps?.ajoutes === 0 && dep2.corps.fournisseurs.length === dep1.corps.fournisseurs.length, JSON.stringify({ ajoutes: dep2.corps?.ajoutes, n: dep2.corps?.fournisseurs?.length }))
    const liste = dep2.corps.fournisseurs
    const casto = liste.find((f) => f.nom === 'Castorama'), rexel = liste.find((f) => f.nom === 'Rexel')
    T('Castorama : prix publics (vérifié par curl)', casto?.prix_publics === true && casto.url === 'https://www.castorama.fr', JSON.stringify(casto))
    T('Rexel : pas de prix publics, avec la phrase exacte du plan', rexel?.prix_publics === false && rexel.note_acces === NOTE_ACCES, JSON.stringify(rexel))
    T('aucun fournisseur bloqué (Point.P, Leroy Merlin, ManoMano, Cedeo…) n’est proposé', !liste.some((f) => /point\.p|leroy|manomano|cedeo|legallais|sonepar|bricoman/i.test(f.nom)))
    const inverse = [...liste].reverse().map((f) => f.id)
    const reord = await post(A.appel, '/api/inventaire/fournisseurs', { ordre: inverse })
    T('l’ordre de préférence est enregistré', reord.corps?.fournisseurs?.map((f) => f.id).join() === inverse.join())
    const dup = await post(A.appel, '/api/inventaire/fournisseurs', { nom: 'castorama' })
    T('un doublon de nom (casse différente) est refusé en 409', dup.statut === 409, `${dup.statut}`)

    console.log('\n── 4. Fiche matériau : rapide, puis complète')
    const rapide = await post(A.appel, '/api/inventaire/materiaux', { nom: 'Coude cuivre 16', prix_achat_ht: '1,35'.replace(',', '.') })
    T('création rapide : nom + prix suffisent', rapide.statut === 200 && !!rapide.corps?.id, JSON.stringify(rapide.corps))
    const idM = rapide.corps.id
    const fiche0 = await A.appel(`/api/inventaire/materiaux?id=${idM}`)
    T('la fiche renvoie le prix d’achat, et rien d’inventé ailleurs', fiche0.corps?.materiau?.prix_achat_ht === 1.35 && fiche0.corps.materiau.marque === null && fiche0.corps.materiau.prix_vu_ht === null && fiche0.corps.materiau.fournisseur_id === null, JSON.stringify(fiche0.corps?.materiau))
    const sansNom = await post(A.appel, '/api/inventaire/materiaux', { prix_achat_ht: 3 })
    T('sans nom : 400', sansNom.statut === 400)
    const complete = await post(A.appel, '/api/inventaire/materiaux', {
      id: idM, nom: 'Coude cuivre 16', marque: 'Comap', reference_fabricant: 'CU16-90', reference_fournisseur: 'RX-4471', categorie: 'Plomberie', sous_categorie: 'Cuivre',
      unite: 'u', conditionnement: 'Sachet de 10', code_barres: '3760000000017', fournisseur_id: fA.id, prix_achat_ht: 1.29, seuil_alerte: 10,
      fiche_technique_url: 'https://exemple.fr/ft.pdf', notes: 'Prendre le 90°', tags: ['Plomberie', ' cuivre ', 'plomberie'], chantiers_lies: ['00000000-0000-4000-8000-000000000000'],
      photo_url: 'https://site-tiers.example/photo.jpg',
    })
    T('la fiche complète est enregistrée', complete.statut === 200, JSON.stringify(complete.corps))
    const fiche = (await A.appel(`/api/inventaire/materiaux?id=${idM}`)).corps?.materiau
    T('tous les champs reviennent', fiche?.marque === 'Comap' && fiche.reference_fabricant === 'CU16-90' && fiche.reference_fournisseur === 'RX-4471' && fiche.sous_categorie === 'Cuivre' && fiche.conditionnement === 'Sachet de 10' && fiche.fiche_technique_url === 'https://exemple.fr/ft.pdf' && fiche.notes === 'Prendre le 90°' && Number(fiche.seuil_alerte) === 10, JSON.stringify(fiche))
    T('le fournisseur est lié et son nom joint', fiche?.fournisseur_id === fA.id && fiche.fournisseur?.nom === 'Mon négoce du coin', JSON.stringify(fiche?.fournisseur))
    T('les tags sont normalisés et dédoublonnés', JSON.stringify(fiche?.tags) === JSON.stringify(['plomberie', 'cuivre']), JSON.stringify(fiche?.tags))
    T('un chantier qui n’est pas un devis de l’artisan est ignoré', Array.isArray(fiche?.chantiers_lies) && fiche.chantiers_lies.length === 0)
    T('une photo hors du dossier de l’artisan est refusée (null)', fiche?.photo_url === null, String(fiche?.photo_url))
    T('la référence héritée (0040) reflète la référence fabricant', fiche?.reference === 'CU16-90', String(fiche?.reference))
    const parCode = await A.appel('/api/inventaire?code=3760000000017')
    T('l’ancien parcours scan retrouve toujours la fiche', parCode.corps?.materiau?.id === idM)
    const volFourn = await post(A.appel, '/api/inventaire/materiaux', { nom: 'Autre', fournisseur_id: '00000000-0000-4000-8000-000000000000' })
    T('un fournisseur inconnu est refusé', volFourn.statut === 400, `${volFourn.statut}`)

    console.log('\n── 5. Prix vus : historique, propriété, « à revérifier »')
    const o1 = await post(A.appel, '/api/inventaire/observations', { materiau_id: idM, prix_ht: 1.5, fournisseur_id: casto.id, url: 'https://www.castorama.fr/coude-cuivre-16.prd', source: 'saisie' })
    T('une observation est notée', o1.statut === 200 && o1.corps.observations.length === 1, JSON.stringify(o1.corps))
    T('elle porte le nom du fournisseur figé, la date et la source', o1.corps?.observations?.[0]?.fournisseur_nom === 'Castorama' && o1.corps.observations[0].source === 'saisie' && !o1.corps.observations[0].a_reverifier)
    const ia = await post(A.appel, '/api/inventaire/observations', { materiau_id: idM, prix_ht: 1.4, source: 'recherche_ia' })
    T('un client ne peut pas se fabriquer une observation « vue par l’assistant »', ia.corps?.observations?.every((o) => o.source !== 'recherche_ia'), JSON.stringify(ia.corps?.observations?.map((o) => o.source)))
    const ilYA45j = new Date(Date.now() - 45 * 86_400_000).toISOString()
    const o2 = await post(A.appel, '/api/inventaire/observations', { materiau_id: idM, prix_ht: 1.1, source: 'facture', vu_le: ilYA45j })
    const vieille = o2.corps?.observations?.find((o) => Number(o.prix_ht) === 1.1)
    T('une facture d’il y a 45 jours est « à revérifier »', vieille?.a_reverifier === true && vieille.source === 'facture', JSON.stringify(vieille))
    const ficheV = (await A.appel(`/api/inventaire/materiaux?id=${idM}`)).corps
    T('le prix vu de la fiche reste le plus RÉCENT (1,40), pas la vieille facture', Number(ficheV?.materiau?.prix_vu_ht) === 1.4 && ficheV.prix_vu_a_reverifier === false, JSON.stringify({ prix_vu_ht: ficheV?.materiau?.prix_vu_ht, rev: ficheV?.prix_vu_a_reverifier }))
    const sansPrix = await post(A.appel, '/api/inventaire/observations', { materiau_id: idM, source: 'saisie' })
    T('une observation sans prix est refusée', sansPrix.statut === 400)
    const listeObs = await A.appel(`/api/inventaire/observations?materiau_id=${idM}`)
    T('l’historique est trié du plus récent au plus ancien', listeObs.corps?.observations?.length === 3 && listeObs.corps.observations[2].prix_ht === 1.1, JSON.stringify(listeObs.corps?.observations?.map((o) => o.prix_ht)))

    console.log('\n── 6. Import CSV : aperçu, puis enregistrement, sans doublon au ré-import')
    const csv = 'Désignation;Référence;Unité;Prix HT\nTube PER 16;PER16;m;1,20 €\nCollier double 16;COL16;u;0,45\nLigne sans prix;;u;\nCoude cuivre 16;CU16-90;u;1,31'
    const ap = await post(A.appel, '/api/inventaire/materiaux', { csv, apercu: true })
    T('l’aperçu compte 3 matériaux reconnus et 1 ligne ignorée', ap.statut === 200 && ap.corps.apercu === true && ap.corps.reconnues === 3 && ap.corps.ignorees === 1, JSON.stringify(ap.corps))
    T('l’aperçu montre les colonnes reconnues et des exemples', ap.corps?.colonnes?.designation === 'Désignation' && ap.corps.exemples?.[0]?.nom === 'Tube PER 16' && ap.corps.exemples[0].prix_achat_ht === 1.2, JSON.stringify(ap.corps?.exemples?.[0]))
    const avant = (await A.appel('/api/inventaire/materiaux')).corps.materiaux.length
    T('l’aperçu n’a rien écrit', avant === 1, `${avant}`)
    const imp = await post(A.appel, '/api/inventaire/materiaux', { csv, fichier: 'tarif.csv', fournisseur_id: fA.id })
    T('l’import enregistre 3 matériaux', imp.statut === 200 && imp.corps.enregistrees === 3, JSON.stringify(imp.corps))
    const apres = (await A.appel('/api/inventaire/materiaux')).corps.materiaux
    // La fiche « Coude cuivre 16 / CU16-90 » existe déjà (créée à la main plus haut) : l'import la MET À JOUR
    // (clé artisan + nom + référence), il ne l'empile pas. 1 existante + 2 nouvelles = 3.
    T('l’inventaire compte 3 fiches (la fiche existante est mise à jour, pas dupliquée)', apres.length === 3, apres.map((m) => `${m.nom}/${m.reference}`).join(' | '))
    T('… et garde ce que la main avait saisi (marque)', apres.find((m) => m.nom === 'Coude cuivre 16')?.marque === 'Comap', JSON.stringify(apres.find((m) => m.nom === 'Coude cuivre 16')))
    const per = apres.find((m) => m.nom === 'Tube PER 16')
    T('une fiche importée porte prix d’achat, référence fournisseur et fournisseur', per?.prix_achat_ht === 1.2 && per.reference_fournisseur === 'PER16' && per.unite === 'm' && per.fournisseur_id === fA.id, JSON.stringify(per))
    await post(A.appel, '/api/inventaire/materiaux', { csv, fichier: 'tarif.csv' })
    T('un ré-import ne crée pas de doublon', (await A.appel('/api/inventaire/materiaux')).corps.materiaux.length === 3)
    const rech = await A.appel('/api/inventaire/materiaux?q=per')
    T('la recherche trouve par nom / référence', rech.corps?.materiaux?.some((m) => m.nom === 'Tube PER 16'), JSON.stringify(rech.corps?.materiaux?.map((m) => m.nom)))
    const illisible = await post(A.appel, '/api/inventaire/materiaux', { csv: 'bonjour\nceci n est pas un tarif', apercu: true })
    T('un fichier sans prix est refusé avec explication', illisible.statut === 400 && /colonne/.test(illisible.corps?.error || ''))

    console.log('\n── 7. Isolation : B, avec SON jeton, ne voit rien de A')
    const B = await creer('studio', 'b')
    T('B ne voit aucun matériau de A', (await B.appel('/api/inventaire/materiaux')).corps.materiaux.length === 0)
    T('B ne peut pas ouvrir la fiche de A (404)', (await B.appel(`/api/inventaire/materiaux?id=${idM}`)).statut === 404)
    T('B ne voit aucune observation de A', (await B.appel(`/api/inventaire/observations?materiau_id=${idM}`)).corps.observations.length === 0)
    T('B ne voit aucun fournisseur de A', (await B.appel('/api/inventaire/fournisseurs')).corps.fournisseurs.length === 0)
    const volObs = await post(B.appel, '/api/inventaire/observations', { materiau_id: idM, prix_ht: 0.01, source: 'saisie' })
    T('B ne peut pas noter un prix sur le matériau de A', volObs.statut === 400, `${volObs.statut}`)
    const volMaj = await post(B.appel, '/api/inventaire/materiaux', { id: idM, nom: 'Piraté' })
    T('B ne peut pas modifier la fiche de A', volMaj.statut === 404, `${volMaj.statut}`)
    const volLien = await post(B.appel, '/api/inventaire/materiaux', { nom: 'Chez B', fournisseur_id: fA.id })
    T('B ne peut pas lier sa fiche au fournisseur de A', volLien.statut === 400, `${volLien.statut}`)
    const volSup = await B.appel(`/api/inventaire/materiaux?id=${idM}`, { method: 'DELETE' })
    T('B ne peut pas supprimer la fiche de A', volSup.corps?.supprime === 0, JSON.stringify(volSup.corps))
    const volSupF = await B.appel(`/api/inventaire/fournisseurs?id=${fA.id}`, { method: 'DELETE' })
    T('… ni le fournisseur de A', volSupF.corps?.supprime === 0, JSON.stringify(volSupF.corps))
    // En direct contre PostgREST, avec la clé publique et le jeton de B : c'est la RLS qui parle.
    for (const t of ['materiaux', 'prix_observations', 'fournisseurs']) {
      const { data, error } = await B.db.from(t).select('id').eq('artisan_id', A.uid)
      T(`RLS : B lit 0 ligne de A dans ${t}`, !error && data.length === 0, error?.message || `${data?.length} lignes`)
    }
    const { error: eIns } = await B.db.from('prix_observations').insert({ artisan_id: A.uid, materiau_id: idM, prix_ht: 1, source: 'saisie' })
    T('RLS : B ne peut pas écrire une observation AU NOM de A', !!eIns, 'insertion acceptée !')
    const { error: eIns2 } = await B.db.from('prix_observations').insert({ artisan_id: B.uid, materiau_id: idM, prix_ht: 1, source: 'saisie' })
    T('trigger : B ne peut pas rattacher une observation au matériau de A', !!eIns2, 'insertion acceptée !')
    const intact = await A.appel(`/api/inventaire/materiaux?id=${idM}`)
    T('la fiche de A est intacte, avec ses 3 prix vus', intact.corps?.materiau?.nom === 'Coude cuivre 16' && intact.corps.observations.length === 3)

    console.log('\n── 8. Suppression : la fiche part avec son historique, le fournisseur laisse les fiches')
    const supF = await A.appel(`/api/inventaire/fournisseurs?id=${fA.id}`, { method: 'DELETE' })
    T('A supprime son fournisseur', supF.corps?.supprime === 1)
    const orphelin = (await A.appel(`/api/inventaire/materiaux?id=${idM}`)).corps
    T('le matériau reste, sans fournisseur', orphelin?.materiau?.fournisseur_id === null && orphelin.materiau.fournisseur === null)
    const supM = await A.appel(`/api/inventaire/materiaux?id=${idM}`, { method: 'DELETE' })
    T('A supprime sa fiche', supM.corps?.supprime === 1)
    const { data: restes } = await admin.from('prix_observations').select('id').eq('materiau_id', idM)
    T('ses observations sont parties avec (cascade)', (restes ?? []).length === 0, `${restes?.length}`)
  }
} catch (e) {
  ko++; console.log('  ❌ exception :', e.stack || e.message)
} finally {
  for (const uid of comptes) {
    await admin.from('materiaux').delete().eq('artisan_id', uid)
    await admin.from('artisans').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid)
  }
  if (comptes.length) console.log(`🧹 ${comptes.length} comptes de test supprimés`)
}

if (attente) console.log(`\n⏸  ${ok} réussis, ${ko} échoués — sections 3 à 8 NON VÉRIFIÉES (migration 0048 absente)\n`)
else console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko ? 1 : attente ? 2 : 0)
