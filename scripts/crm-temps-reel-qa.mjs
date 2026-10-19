#!/usr/bin/env node
// scripts/crm-temps-reel-qa.mjs — la PREUVE du temps réel du CRM : deux clients, l'un écrit, l'autre reçoit l'évènement.
//
// Ce que le script fait, pour de vrai, contre la base Supabase du .env.local (il n'existe pas de base de test distincte) :
//   1. crée DEUX comptes de test (@presti-test.invalid, aucun e-mail ne part vers ce domaine) avec leur fiche artisan (offre Signature) ;
//   2. connecte chacun comme le navigateur le fait (jeton de session, RLS appliquée) et l'abonne avec EXACTEMENT les abonnements
//      de l'écran (lib/crm/tempsReel.ts : douze tables, filtre `artisan_id=eq.<uid>`) ;
//   3. un « autre client » (la clé de service, comme les routes /api/crm/* ou un second appareil) écrit sur chaque table que l'écran
//      écoute — chantier créé, tâche créée puis cochée, devis envoyé puis signé, demande, véhicule, membre, matériau, mouvement de stock,
//      commande fournisseur — et on vérifie que le client abonné REÇOIT l'évènement (table, type, ligne du bon compte) et en combien de ms ;
//   4. isolation : les écritures du compte A n'arrivent JAMAIS au client du compte B (et inversement), y compris à un abonnement SANS
//      filtre (la RLS seule, sans le filtre de compte, suffit à l'empêcher) ;
//   5. information : un DELETE filtré est-il reçu ? (Supabase ne filtre pas les DELETE : le CRM ne s'y fie pas, il relit chaque minute.)
//   6. NETTOYAGE dans un `finally`, quoi qu'il arrive : les lignes des deux comptes, leurs fiches, leurs utilisateurs ; puis vérifie
//      qu'il n'en reste rien.
//
// Prérequis : la migration 0158 APPLIQUÉE (publication `supabase_realtime` + table commandes_fournisseur). Sans elle, AUCUN évènement
// n'arrive : le script le dit (code 2, « non prouvé »), il ne fait jamais semblant. Les cas « commande » sont ignorés (et dits) si seule
// la publication est posée mais pas la table.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-temps-reel-qa.mjs
// Codes : 0 tout reçu · 1 un évènement manque ou une fuite · 2 non prouvé (prérequis absent : variables, migration 0158)
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.removeAllListeners('warning')
for (const l of fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !ANON || !SERVICE) { console.error('Variables Supabase manquantes dans .env.local : non prouvé.'); process.exit(2) }
const { abonnements, TABLES_TEMPS_REEL } = await import(pathToFileURL(path.join(RACINE, 'lib/crm/tempsReel.ts')).href)

let ok = 0, ko = 0, ignores = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${String(d).slice(0, 300)}` : ''}`) } }
const SKIP = (n, d) => { ignores++; console.log(`  ⏭️  ${n} — ${d}`) }
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })
const nav = () => createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } })

const comptes = []
const creer = async (nom) => {
  const slug = `tr-${nom}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
  const email = `${slug}@presti-test.invalid`, mdp = crypto.randomUUID() + 'Aa1!'
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
  if (error) throw new Error(`compte de test ${nom} : ${error.message}`)
  const c = { nom, uid: u.user.id, email, mdp, slug, client: nav(), evenements: [], canaux: [] }
  comptes.push(c)
  const { error: ea } = await admin.from('artisans').insert({ id: c.uid, email, nom: `Test temps réel ${nom}`, metier: 'plombier', slug, plan: 'signature' })
  if (ea) throw new Error(`fiche artisan ${nom} : ${ea.message}`)
  const { error: es } = await c.client.auth.signInWithPassword({ email, password: mdp })
  if (es) throw new Error(`connexion ${nom} : ${es.message}`)
  return c
}

/** Abonne un compte exactement comme app/crm/useTempsReel.ts, et consigne chaque évènement reçu. */
async function abonner(c) {
  const canal = c.client.channel(`crm:${c.uid}`)
  // Une table encore absente de la base (0162 non appliquée : crm_rappels) n'est pas écoutée, comme à l'écran.
  const { error: sansRappels } = await admin.from('crm_rappels').select('id').limit(1)
  for (const a of abonnements(c.uid, sansRappels ? ['crm_rappels'] : [])) {
    canal.on('postgres_changes', { event: a.event, schema: a.schema, table: a.table, filter: a.filter }, (p) => c.evenements.push({ table: a.table, type: p.eventType, nouveau: p.new, ancien: p.old, a: Date.now() }))
  }
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`abonnement de ${c.nom} : délai dépassé`)), 15000)
    canal.subscribe((s, err) => { if (s === 'SUBSCRIBED') { clearTimeout(t); resolve() } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { clearTimeout(t); reject(new Error(`abonnement de ${c.nom} : ${s} ${err?.message ?? ''}`)) } })
  })
  c.canaux.push(canal)
  return canal
}

/** Attend l'évènement attendu sur un compte ; rend le délai en ms, ou null. */
async function attendre(c, test, debut, ms = 8000) {
  const fin = Date.now() + ms
  while (Date.now() < fin) {
    const e = c.evenements.find((x) => x.a >= debut && test(x))
    if (e) return e.a - debut
    await dormir(50)
  }
  return null
}

const nettoyer = async () => {
  for (const c of comptes) {
    for (const k of c.canaux) { try { await c.client.removeChannel(k) } catch { /* déjà fermé */ } }
    try { await c.client.auth.signOut() } catch { /* session déjà fermée */ }
  }
  for (const c of comptes) {
    // Les tables du CRM et de l'inventaire cascadent depuis artisans ; on supprime d'abord la fiche, puis l'utilisateur.
    await admin.from('commandes_fournisseur').delete().eq('artisan_id', c.uid)
    await admin.from('mouvements_stock').delete().eq('artisan_id', c.uid)
    await admin.from('devis').delete().eq('artisan_id', c.uid)
    await admin.from('leads').delete().eq('artisan_id', c.uid)
    await admin.from('materiaux').delete().eq('artisan_id', c.uid)
    const { error } = await admin.from('artisans').delete().eq('id', c.uid)
    if (error) console.log(`  ⚠️ fiche ${c.nom} non supprimée : ${error.message}`)
    const { error: eu } = await admin.auth.admin.deleteUser(c.uid)
    if (eu) console.log(`  ⚠️ utilisateur ${c.nom} non supprimé : ${eu.message}`)
  }
  // Rien ne doit rester.
  let restes = 0
  for (const c of comptes) {
    for (const t of ['chantiers', 'chantier_taches', 'devis', 'leads', 'vehicules', 'equipe_membres', 'materiaux', 'mouvements_stock', 'commandes_fournisseur']) {
      const { count } = await admin.from(t).select('*', { count: 'exact', head: true }).eq('artisan_id', c.uid)
      restes += count ?? 0
    }
    const { count } = await admin.from('artisans').select('*', { count: 'exact', head: true }).eq('id', c.uid)
    restes += count ?? 0
  }
  console.log(restes === 0 ? '\n🧹 Nettoyage : aucune ligne de test ne reste.' : `\n⚠️ Nettoyage incomplet : ${restes} ligne(s) restent.`)
  if (restes) ko++
}

let code = 0
try {
  console.log('\n── Deux comptes de test, deux clients abonnés comme l’écran CRM')
  const A = await creer('A'), B = await creer('B')
  await abonner(A); await abonner(B)
  // Un abonnement SANS filtre de compte, côté A : la RLS seule doit l'empêcher de voir les lignes de B.
  const brut = []
  const canalBrut = A.client.channel('rls-sans-filtre').on('postgres_changes', { event: '*', schema: 'public', table: 'chantiers' }, (p) => brut.push(p))
  await new Promise((r) => { const t = setTimeout(r, 12000); canalBrut.subscribe((s) => { if (s === 'SUBSCRIBED') { clearTimeout(t); r() } }) })
  A.canaux.push(canalBrut)
  T(`les deux clients sont abonnés aux ${TABLES_TEMPS_REEL.length} tables`, A.canaux.length >= 1 && B.canaux.length >= 1)
  await dormir(1500)

  const ecrire = async (nom, tableEvt, typeEvt, faire, quand = (e) => true) => {
    const debut = Date.now()
    const r = await faire()
    if (r?.error) { return { erreur: r.error } }
    const ms = await attendre(A, (e) => e.table === tableEvt && e.type === typeEvt && e.nouveau?.artisan_id === A.uid && quand(e), debut)
    return { ms, r }
  }
  const verifier = (nom, res) => {
    if (res.erreur) { T(nom, false, `écriture refusée : ${res.erreur.message}`); return false }
    T(`${nom} — reçu${res.ms !== null ? ` en ${res.ms} ms` : ''}`, res.ms !== null, 'aucun évènement reçu en 8 s')
    return res.ms !== null
  }

  console.log('\n── Le client « serveur » écrit, le client « écran » reçoit')
  const chantier = await ecrire('chantier créé', 'chantiers', 'INSERT', () => admin.from('chantiers').insert({ artisan_id: A.uid, titre: 'Chantier temps réel', statut: 'en_cours' }).select('id').single())
  if (chantier.erreur) { T('chantier créé', false, chantier.erreur.message) }
  else if (chantier.ms === null) {
    console.log('\n⛔ Aucun évènement reçu : la publication `supabase_realtime` ne contient pas encore les tables du CRM (migration 0158 non appliquée), ou la RLS refuse la lecture.')
    code = 2
  } else {
    T(`chantier créé — reçu en ${chantier.ms} ms`, true)
    const cid = chantier.r.data.id
    const t1 = await ecrire('tâche créée', 'chantier_taches', 'INSERT', () => admin.from('chantier_taches').insert({ artisan_id: A.uid, chantier_id: cid, libelle: 'Poser le receveur', ordre: 0 }).select('id').single())
    verifier('tâche créée', t1)
    if (t1.r?.data) {
      const coche = await ecrire('tâche cochée', 'chantier_taches', 'UPDATE', () => admin.from('chantier_taches').update({ faite: true, faite_le: new Date().toISOString() }).eq('id', t1.r.data.id), (e) => e.nouveau?.faite === true)
      verifier('tâche cochée (UPDATE, faite = true)', coche)
    }
    verifier('chantier mis à jour (statut → termine)', await ecrire('chantier mis à jour', 'chantiers', 'UPDATE', () => admin.from('chantiers').update({ statut: 'termine' }).eq('id', cid), (e) => e.nouveau?.statut === 'termine'))
    const d = await ecrire('devis créé', 'devis', 'INSERT', () => admin.from('devis').insert({ artisan_id: A.uid, statut: 'envoye', objet: 'Devis temps réel', client_nom: 'Client test', client_email: 'client@presti-test.invalid', total_ttc: 1200 }).select('id').single())
    verifier('devis créé', d)
    if (d.r?.data) verifier('devis signé (UPDATE, statut = accepte)', await ecrire('devis signé', 'devis', 'UPDATE', () => admin.from('devis').update({ statut: 'accepte', accepte_le: new Date().toISOString() }).eq('id', d.r.data.id), (e) => e.nouveau?.statut === 'accepte'))
    verifier('demande reçue (leads)', await ecrire('demande reçue', 'leads', 'INSERT', () => admin.from('leads').insert({ artisan_id: A.uid, nom_prospect: 'Prospect test', contact: 'prospect@presti-test.invalid', message: 'Bonjour', statut: 'nouveau', token: crypto.randomUUID() })))
    verifier('véhicule ajouté', await ecrire('véhicule', 'vehicules', 'INSERT', () => admin.from('vehicules').insert({ artisan_id: A.uid, nom: 'Camionnette test' })))
    verifier('membre ajouté', await ecrire('membre', 'equipe_membres', 'INSERT', () => admin.from('equipe_membres').insert({ artisan_id: A.uid, nom: 'Compagnon test' })))
    const m = await ecrire('matériau ajouté', 'materiaux', 'INSERT', () => admin.from('materiaux').insert({ artisan_id: A.uid, nom: 'Raccord test', unite: 'u', seuil_alerte: 5 }).select('id').single())
    verifier('matériau ajouté (inventaire)', m)
    if (m.r?.data) {
      // Une variation de stock passe par appliquer_mouvement : c'est mouvements_stock (porteur d'artisan_id) qui dit « le stock a bougé ».
      verifier('stock modifié (mouvements_stock, par appliquer_mouvement)', await ecrire('mouvement de stock', 'mouvements_stock', 'INSERT', () => admin.rpc('appliquer_mouvement', { p_artisan: A.uid, p_materiau: m.r.data.id, p_type: 'entree', p_quantite: 3, p_lieu: 'atelier', p_devis: null, p_source: 'manuel', p_cout: null, p_note: 'test temps réel' })))
    }
    const cmd = await ecrire('commande créée', 'commandes_fournisseur', 'INSERT', () => admin.from('commandes_fournisseur').insert({ artisan_id: A.uid, fournisseur_nom: 'Négoce test', livraison_prevue: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10), lignes: [{ nom: 'Tube', quantite: 2, unite: 'm' }] }).select('id').single())
    if (cmd.erreur && /commandes_fournisseur|schema cache|does not exist/i.test(cmd.erreur.message)) SKIP('commande fournisseur', 'la table n’existe pas : migration 0158 non appliquée')
    else verifier('commande fournisseur créée', cmd)

    console.log('\n── Isolation : le compte B ne reçoit rien du compte A, et réciproquement')
    await dormir(2500)
    T('le client du compte B n’a reçu AUCUN évènement du compte A', B.evenements.length === 0, `${B.evenements.length} évènement(s) : ${B.evenements.map((e) => e.table).join(',')}`)
    T('tout ce que le client A a reçu porte SON identifiant de compte', A.evenements.length > 0 && A.evenements.every((e) => (e.nouveau?.artisan_id ?? A.uid) === A.uid))
    const avant = brut.length
    const chB = await admin.from('chantiers').insert({ artisan_id: B.uid, titre: 'Chantier du compte B', statut: 'en_cours' }).select('id').single()
    const msB = await attendre(B, (e) => e.table === 'chantiers' && e.type === 'INSERT' && e.nouveau?.artisan_id === B.uid, Date.now() - 1, 8000)
    T(`le compte B reçoit SON chantier${msB !== null ? ` (en ${msB} ms)` : ''}`, !chB.error && msB !== null, chB.error?.message)
    await dormir(2000)
    T('le client A n’a PAS reçu le chantier de B (abonnement filtré)', !A.evenements.some((e) => e.nouveau?.artisan_id === B.uid))
    T('… ni l’abonnement SANS filtre de A : la RLS seule suffit à empêcher la fuite entre comptes', brut.length === avant && !brut.some((p) => p.new?.artisan_id === B.uid), `${brut.length - avant} évènement(s) reçu(s) sans filtre`)

    console.log('\n── Information : les suppressions')
    const t0 = Date.now()
    await admin.from('chantiers').delete().eq('id', cid)
    const msDel = await attendre(A, (e) => e.table === 'chantiers' && e.type === 'DELETE', t0, 5000)
    console.log(`  ℹ️  DELETE filtré par compte : ${msDel !== null ? `reçu en ${msDel} ms (Supabase le délivre ici)` : 'NON reçu — comme documenté, l’écran relit chaque minute et au retour sur l’onglet'}`)
  }
} catch (e) {
  console.log(`\n❌ ${e.message}`)
  ko++
} finally {
  await nettoyer().catch((e) => { console.log(`⚠️ nettoyage : ${e.message}`); ko++ })
}
console.log(`\n${ok} vert(s), ${ko} rouge(s)${ignores ? `, ${ignores} ignoré(s)` : ''}${code === 2 ? ' — NON PROUVÉ (migration 0158 à appliquer)' : ''}`)
process.exit(code === 2 ? 2 : ko ? 1 : 0)
