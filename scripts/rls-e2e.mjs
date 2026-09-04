// Test permanent — isolation entre artisans (v4 §11).
//
// C'est LE test de sécurité qui compte. Presti héberge les clients, les devis, les prix
// négociés et les identifiants email de chaque artisan. Une seule table dont la RLS est
// mal posée, et un artisan lit le fichier clients de son concurrent.
//
// Méthode : on n'utilise PAS la clé de service (qui contourne tout, par conception).
// On se connecte réellement en tant qu'artisan A, avec la clé publique et son jeton —
// exactement ce dont dispose un navigateur — et on essaie de lire et d'écrire chez B.
//
// Usage : node scripts/rls-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

const comptes = []
async function creerArtisan(nom) {
  const email = `verif-rls-${nom}-${Date.now()}@presti-test.invalid`
  const motDePasse = crypto.randomBytes(18).toString('base64url')
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
  if (error) throw new Error(`compte ${nom} : ${error.message}`)
  await admin.from('artisans').insert({ id: u.user.id, email, nom: `RLS ${nom}`, metier: 'Plombier', slug: `verif-rls-${nom}-${Date.now()}`, plan: 'signature' })
  comptes.push(u.user.id)
  // Connexion réelle : c'est ce jeton, et pas la clé de service, qui doit se heurter à la RLS.
  const pub = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: s, error: e2 } = await pub.auth.signInWithPassword({ email, password: motDePasse })
  if (e2) throw new Error(`connexion ${nom} : ${e2.message}`)
  return {
    uid: u.user.id, email, motDePasse,
    // Client « comme dans le navigateur » : clé publique + jeton de l'utilisateur.
    db: createClient(URL, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${s.session.access_token}` } } }),
  }
}

let A = null, B = null
try {
  console.log('\n── Mise en place : deux artisans, des données chez B')
  A = await creerArtisan('a')
  B = await creerArtisan('b')

  // On sème chez B, via la clé de service, une ligne dans chaque table qui porte des
  // données d'artisan. C'est ce que A ne doit jamais voir.
  const { data: lead } = await admin.from('leads').insert({ artisan_id: B.uid, nom_prospect: 'Client secret de B', contact: 'secret@b.fr', message: 'Chantier confidentiel', statut: 'nouveau' }).select('id').single()
  const { data: msg } = await admin.from('messages').insert({ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: 'Message privé de B' }).select('id').single()
  const { data: devis } = await admin.from('devis').insert({ artisan_id: B.uid, numero: 'DEV-B-0001', statut: 'brouillon', objet: 'Devis de B', total_ht: 1000, total_tva: 100, total_ttc: 1100 }).select('id').single()
  const { data: ligneDevis } = await admin.from('devis_lignes').insert({ devis_id: devis.id, ordre: 0, designation: 'Prix négocié de B', quantite: 1, unite: 'u', prix_unitaire_ht: 1000, tva_taux: 10 }).select('id').single()
  const { data: facture } = await admin.from('factures').insert({ artisan_id: B.uid, numero: 'FAC-B-0001', statut: 'emise', objet: 'Facture de B', total_ht: 1000, total_tva: 100, total_ttc: 1100, date_emission: new Date().toISOString().slice(0, 10) }).select('id').single()
  const { data: prix } = await admin.from('prix_artisan').insert({ artisan_id: B.uid, designation: 'Tarif négocié de B', unite: 'u', prix_ht: 42.42, tva_taux: 10, fournisseur: 'Rexel', source: 'import' }).select('id').single()
  const { data: mat } = await admin.from('materiaux').insert({ artisan_id: B.uid, nom: 'Stock de B', unite: 'u' }).select('id').single()
  await admin.rpc('appliquer_mouvement', { p_artisan: B.uid, p_materiau: mat.id, p_type: 'entree', p_quantite: 7, p_lieu: 'atelier' })
  const { data: liste } = await admin.from('listes_achat').insert({ artisan_id: B.uid, nom: 'Achats de B' }).select('id').single()
  await admin.from('lignes_achat').insert({ liste_id: liste.id, designation_libre: 'Article de B', quantite: 1 })
  await admin.from('canaux').insert({ artisan_id: B.uid, type: 'email', libelle: 'Boîte de B', adresse: 'boite@b.fr', identifiant: 'boite@b.fr', secret: 'v1.aaa.bbb.ccc', imap_hote: 'imap.b.fr', imap_port: 993 })
  await admin.from('plateforme_config').upsert({ artisan_id: B.uid, mode_reponse: 'auto' })

  console.log('\n── 1. A ne LIT rien de B')
  const lectures = [
    ['artisans', () => A.db.from('artisans').select('id, nom, email').eq('id', B.uid)],
    ['leads', () => A.db.from('leads').select('id').eq('artisan_id', B.uid)],
    ['messages', () => A.db.from('messages').select('id').eq('lead_id', lead.id)],
    ['devis', () => A.db.from('devis').select('id').eq('artisan_id', B.uid)],
    ['devis_lignes', () => A.db.from('devis_lignes').select('id').eq('devis_id', devis.id)],
    ['factures', () => A.db.from('factures').select('id').eq('artisan_id', B.uid)],
    ['prix_artisan', () => A.db.from('prix_artisan').select('id, prix_ht').eq('artisan_id', B.uid)],
    ['materiaux', () => A.db.from('materiaux').select('id').eq('artisan_id', B.uid)],
    ['stock', () => A.db.from('stock').select('id').eq('materiau_id', mat.id)],
    ['mouvements_stock', () => A.db.from('mouvements_stock').select('id').eq('artisan_id', B.uid)],
    ['listes_achat', () => A.db.from('listes_achat').select('id').eq('artisan_id', B.uid)],
    ['lignes_achat', () => A.db.from('lignes_achat').select('id').eq('liste_id', liste.id)],
    ['canaux', () => A.db.from('canaux').select('id, secret').eq('artisan_id', B.uid)],
    ['plateforme_config', () => A.db.from('plateforme_config').select('artisan_id').eq('artisan_id', B.uid)],
  ]
  for (const [table, req] of lectures) {
    const { data, error } = await req()
    // Une RLS correcte renvoie zéro ligne (ce n'est pas une erreur, c'est un ensemble vide).
    T(`${table} : aucune ligne de B`, (data ?? []).length === 0, error ? `erreur ${error.message}` : `${data.length} ligne(s) lue(s) !`)
  }

  console.log('\n── 2. Le secret d’un canal ne fuit dans aucune lecture')
  const { data: tousCanaux } = await A.db.from('canaux').select('*')
  T('A ne voit aucun canal', (tousCanaux ?? []).length === 0, JSON.stringify(tousCanaux))

  console.log('\n── 3. A ne peut rien ÉCRIRE chez B')
  const ecritures = [
    ['modifier un lead de B', async () => (await A.db.from('leads').update({ statut: 'perdu' }).eq('id', lead.id).select('id')).data],
    ['modifier un devis de B', async () => (await A.db.from('devis').update({ total_ht: 1 }).eq('id', devis.id).select('id')).data],
    ['modifier une ligne de devis de B', async () => (await A.db.from('devis_lignes').update({ prix_unitaire_ht: 1 }).eq('id', ligneDevis.id).select('id')).data],
    ['supprimer un tarif de B', async () => (await A.db.from('prix_artisan').delete().eq('id', prix.id).select('id')).data],
    ['supprimer un matériau de B', async () => (await A.db.from('materiaux').delete().eq('id', mat.id).select('id')).data],
    ['s’attribuer un lead de B', async () => (await A.db.from('leads').update({ artisan_id: A.uid }).eq('id', lead.id).select('id')).data],
  ]
  for (const [quoi, essai] of ecritures) {
    const touche = await essai()
    T(`${quoi} : sans effet`, (touche ?? []).length === 0, `${touche?.length} ligne(s) modifiée(s) !`)
  }

  console.log('\n── 4. Et rien n’a bougé chez B')
  const { data: leadApres } = await admin.from('leads').select('statut, artisan_id').eq('id', lead.id).single()
  T('le lead de B est intact', leadApres.statut === 'nouveau' && leadApres.artisan_id === B.uid, JSON.stringify(leadApres))
  const { data: prixApres } = await admin.from('prix_artisan').select('prix_ht').eq('id', prix.id).maybeSingle()
  T('le tarif de B existe toujours', Number(prixApres?.prix_ht) === 42.42, JSON.stringify(prixApres))
  const { count: nbMat } = await admin.from('materiaux').select('id', { count: 'exact', head: true }).eq('id', mat.id)
  T('le matériau de B existe toujours', nbMat === 1, `${nbMat}`)
  void msg; void facture

  console.log('\n── 5. A voit bien SES propres données')
  await admin.from('prix_artisan').insert({ artisan_id: A.uid, designation: 'Tarif de A', unite: 'u', prix_ht: 10, tva_taux: 10, source: 'saisie' })
  const { data: chezA } = await A.db.from('prix_artisan').select('designation')
  T('A lit ses propres tarifs', (chezA ?? []).length === 1 && chezA[0].designation === 'Tarif de A', JSON.stringify(chezA))
  const { data: monProfil } = await A.db.from('artisans').select('nom').eq('id', A.uid).maybeSingle()
  T('A lit son propre profil', monProfil?.nom === 'RLS a', JSON.stringify(monProfil))

  console.log('\n── 6. Un jeton révoqué ne sert plus à rien (v4 §11)')
  // Le jeton d'accès Supabase est autoporteur : `signOut` ne révoque que le jeton de
  // rafraîchissement. Sans contrôle serveur, un jeton copié — depuis un poste partagé,
  // typiquement — continue d'ouvrir le compte pendant une heure après la déconnexion.
  // On vérifie ici que les routes de Presti le refusent immédiatement.
  const sessionA = (await createClient(URL, ANON, { auth: { persistSession: false } })
    .auth.signInWithPassword({ email: A.email, password: A.motDePasse })).data.session
  const jetonA = sessionA.access_token
  const rafraichissementA = sessionA.refresh_token
  const appelTarifs = () => fetch(`${BASE}/api/tarifs`, { headers: { Authorization: `Bearer ${jetonA}` } })

  T('avant fermeture, le jeton fonctionne', (await appelTarifs()).status === 200)

  const revoc = await fetch(`${BASE}/api/securite/sessions`, { method: 'POST', headers: { Authorization: `Bearer ${jetonA}` } })
  T('la demande de fermeture aboutit', revoc.status === 200, String(revoc.status))

  const apres = await appelTarifs()
  T('le MÊME jeton est désormais refusé', apres.status === 401, `${apres.status} — le jeton fonctionne encore !`)
  const corps = await apres.json().catch(() => ({}))
  T('et le message dit quoi faire', /reconnecte/i.test(corps.error || ''), corps.error)

  const inv = await fetch(`${BASE}/api/inventaire`, { headers: { Authorization: `Bearer ${jetonA}` } })
  T('refusé aussi sur l’inventaire', inv.status === 401, String(inv.status))
  const donnees = await fetch(`${BASE}/api/donnees`, { headers: { Authorization: `Bearer ${jetonA}` } })
  T('refusé aussi sur les données personnelles', donnees.status === 401, String(donnees.status))

  // ── L'ANGLE MORT de la première version de ce test, et le vrai danger.
  // Rejouer le jeton d'accès ne prouve rien : il expire de toute façon en une heure.
  // Ce qu'un voleur utilise, c'est le jeton de RAFRAÎCHISSEMENT, stocké au même endroit.
  // S'il survit, il se refabrique un accès complet, indéfiniment, sans que personne
  // ne le voie — pendant que l'écran a affiché « toutes vos sessions ont été fermées ».
  const reforge = await fetch(`${URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON },
    body: JSON.stringify({ refresh_token: rafraichissementA }),
  })
  T('le jeton de RAFRAÎCHISSEMENT est mort lui aussi', reforge.status !== 200,
    `HTTP ${reforge.status} — un nouvel accès a été refabriqué après la fermeture des sessions !`)

  if (reforge.status === 200) {
    // Si jamais il repassait un jour, on mesure jusqu'où va la brèche plutôt que de
    // s'arrêter à « ça a marché ».
    const neuf = (await reforge.json()).access_token
    const encore = await fetch(`${BASE}/api/tarifs`, { headers: { Authorization: `Bearer ${neuf}` } })
    T('et le jeton refabriqué n’ouvre rien', encore.status === 401, `HTTP ${encore.status}`)
  }
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  for (const uid of comptes) {
    await admin.from('canaux').delete().eq('artisan_id', uid)
    await admin.from('prix_artisan').delete().eq('artisan_id', uid)
    await admin.from('materiaux').delete().eq('artisan_id', uid)
    await admin.from('listes_achat').delete().eq('artisan_id', uid)
    await admin.from('factures').update({ verrouillee: false }).eq('artisan_id', uid)
    await admin.from('factures').delete().eq('artisan_id', uid)
    await admin.from('devis').delete().eq('artisan_id', uid)
    await admin.from('leads').delete().eq('artisan_id', uid)
    await admin.from('artisans').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid)
  }
  if (comptes.length) console.log(`🧹 ${comptes.length} artisans de test et toutes leurs données supprimés`)
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
