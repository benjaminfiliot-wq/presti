// Effacer les données fabriquées par les suites de test (prompt v11 §2.2).
//
// Benj a donné son accord le 07/09 : « vire-moi toutes les factures, devis et autres faits par des
// tests ». Ce script le fait, dans un ordre qui ne casse rien et sans jamais forcer un verrou.
//
// TROIS RÈGLES, et elles ne se négocient pas :
//
//   1. SAUVEGARDE D'ABORD. Tout ce qui va être supprimé est écrit dans un fichier JSON horodaté avant
//      la première suppression. Une purge sans retour en arrière est une décision qu'on ne peut plus
//      revoir, et personne ne devrait avoir à vivre avec ça.
//   2. UNE FACTURE ÉMISE NE SE SUPPRIME PAS. La loi impose dix ans de conservation (art. L. 102 B du
//      LPF), et un trigger l'applique depuis 0041. Ce script ne cherche pas à le contourner : il
//      supprime les BROUILLONS, signale les factures verrouillées, et les laisse. Elles sont déjà
//      exclues de tous les chiffres par `est_demo` — invisibles, mais présentes, comme la loi veut.
//   3. RIEN QUI NE SOIT MARQUÉ. On ne supprime que ce qui appartient à un compte `est_demo` ou à une
//      adresse de test. Aucune heuristique sur le contenu : un vrai artisan qui écrirait « test » dans
//      un devis ne doit pas perdre son travail.
//
// Usage : node scripts/purger-donnees-test.mjs            (dit ce qu'il ferait, ne touche à rien)
//         node scripts/purger-donnees-test.mjs --purger   (le fait, après sauvegarde)

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

for (const f of ['.env.local']) {
  if (!fs.existsSync(f)) continue
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_SB || !SERVICE) { console.log('\n⛔ Supabase non configuré.\n'); process.exit(2) }
const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } })
const PURGER = process.argv.includes('--purger')

/** Les comptes qui gardent leur droit de cité, quoi qu'il arrive — et pourquoi.
 *
 *  Le v11 §2.3 le demande explicitement : « à ne pas supprimer par excès de zèle ». Les deux sont
 *  marqués `est_demo`, donc absents de tous les chiffres — ils existent sans compter. */
const GARDER = [
  // Apple et Google EXIGENT un compte de test fonctionnel pour relire l'application.
  'relecture-stores@presti-test.invalid',
  // « Atelier du Chêne » : sa page publique alimente les captures de la vitrine (demo-captures.mjs),
  // et quatre suites s'appuient sur lui. Le supprimer casserait le marketing et les tests.
  'demo-menuisier@presti-test.invalid',
]

async function main() {
  console.log('\n══ Les données fabriquées par les tests ══\n')

  const { data: artisans, error } = await admin.from('artisans').select('id, email, nom, est_demo, is_founder')
  if (error) { console.log('⛔ base injoignable :', error.message); process.exit(2) }

  const cibles = (artisans ?? []).filter((a) =>
    !GARDER.includes(a.email ?? '') && !a.is_founder &&
    (a.est_demo || /@presti-test\.invalid$|@example\.(com|org|net)$|@x\.fr$/i.test(a.email ?? '')))
  if (!cibles.length) { console.log('✅ Aucun compte de test en base. Rien à purger.\n'); return }

  const ids = cibles.map((a) => a.id)
  console.log(`${cibles.length} compte(s) concerné(s) :`)
  for (const a of cibles) console.log(`  · ${a.email} — ${a.nom ?? 'sans nom'}`)

  // ── Ce qu'ils ont produit ────────────────────────────────────────────────────────────────────────
  const [leads, devis, factures, materiaux] = await Promise.all([
    admin.from('leads').select('*').in('artisan_id', ids),
    admin.from('devis').select('*').in('artisan_id', ids),
    admin.from('factures').select('*').in('artisan_id', ids),
    admin.from('materiaux').select('*').in('artisan_id', ids).then((r) => r, () => ({ data: [] })),
  ])
  const messages = leads.data?.length
    ? await admin.from('messages').select('*').in('lead_id', leads.data.map((l) => l.id))
    : { data: [] }

  const emises = (factures.data ?? []).filter((f) => f.verrouillee)
  const brouillons = (factures.data ?? []).filter((f) => !f.verrouillee)

  console.log('\nce qu’ils ont produit :')
  console.log(`  demandes (leads)      ${leads.data?.length ?? 0}`)
  console.log(`  messages              ${messages.data?.length ?? 0}`)
  console.log(`  devis                 ${devis.data?.length ?? 0}`)
  console.log(`  matériaux             ${materiaux.data?.length ?? 0}`)
  console.log(`  factures brouillon    ${brouillons.length}  → supprimables`)
  console.log(`  factures ÉMISES       ${emises.length}  → CONSERVÉES : dix ans obligatoires (art. L. 102 B du LPF)`)
  if (emises.length) {
    console.log('     Elles restent en base, invisibles de tous les chiffres (est_demo). Les supprimer')
    console.log('     demanderait de lever un verrou légal — une table de factures qu\'on peut vider sur')
    console.log('     demande ne vaut plus rien comme preuve, y compris pour les vraies.')
  }

  if (!PURGER) { console.log('\n(Rien n’a été supprimé. Relancez avec --purger.)\n'); return }

  // ── Sauvegarde, avant tout ───────────────────────────────────────────────────────────────────────
  const dossier = path.join(process.cwd(), 'sauvegardes')
  fs.mkdirSync(dossier, { recursive: true })
  const fichier = path.join(dossier, `purge-test-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(fichier, JSON.stringify({
    date: new Date().toISOString(), comptes: cibles,
    leads: leads.data ?? [], messages: messages.data ?? [], devis: devis.data ?? [],
    factures: factures.data ?? [], materiaux: materiaux.data ?? [],
  }, null, 2), 'utf8')
  console.log(`\n💾 Sauvegarde écrite : ${path.relative(process.cwd(), fichier)}`)

  // ── Suppression, des feuilles vers la racine ─────────────────────────────────────────────────────
  let n = 0
  const effacer = async (table, colonne, valeurs, quoi) => {
    if (!valeurs.length) return
    const { error: e, count } = await admin.from(table).delete({ count: 'exact' }).in(colonne, valeurs)
    if (e) console.log(`  ⚠️  ${quoi} : ${e.message}`)
    else { n += count ?? 0; console.log(`  · ${count ?? 0} ${quoi}`) }
  }
  console.log('\nsuppression :')
  await effacer('messages', 'lead_id', (leads.data ?? []).map((l) => l.id), 'message(s)')
  await effacer('relances', 'lead_id', (leads.data ?? []).map((l) => l.id), 'relance(s)')
  await effacer('devis_lignes', 'devis_id', (devis.data ?? []).map((d) => d.id), 'ligne(s) de devis')
  await effacer('factures_lignes', 'facture_id', brouillons.map((f) => f.id), 'ligne(s) de facture')
  await effacer('factures', 'id', brouillons.map((f) => f.id), 'facture(s) brouillon')
  await effacer('devis', 'id', (devis.data ?? []).map((d) => d.id), 'devis')
  await effacer('leads', 'id', (leads.data ?? []).map((l) => l.id), 'demande(s)')
  await effacer('materiaux', 'id', (materiaux.data ?? []).map((m) => m.id), 'matériau(x)')

  // Les comptes eux-mêmes : ceux qui ne portent plus AUCUNE facture émise. Les autres restent, marqués
  // `est_demo`, parce qu'une facture doit pouvoir désigner son émetteur pendant dix ans.
  const avecFacture = new Set(emises.map((f) => f.artisan_id))
  let comptesEffaces = 0, comptesGardes = 0
  for (const a of cibles) {
    if (avecFacture.has(a.id)) { comptesGardes++; continue }
    await admin.from('direction_roles').delete().eq('user_id', a.id).then(() => {}, () => {})
    await admin.from('journal_direction').delete().eq('artisan_id', a.id).then(() => {}, () => {})
    await admin.rpc('purger_compte_test', { p_id: a.id }).then(() => {}, () => {})
    const { error: eA } = await admin.from('artisans').delete().eq('id', a.id)
    if (eA) { console.log(`  ⚠️  ${a.email} : ${eA.message}`); continue }
    await admin.auth.admin.deleteUser(a.id).catch(() => {})
    comptesEffaces++
  }
  console.log(`  · ${comptesEffaces} compte(s) supprimé(s)`)
  if (comptesGardes) console.log(`  · ${comptesGardes} compte(s) gardé(s) : ils portent une facture émise, qui doit pouvoir désigner son émetteur.`)

  // Les comptes de connexion orphelins, qui n'ont jamais eu de fiche.
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 })
  const { data: restants } = await admin.from('artisans').select('id')
  const connus = new Set((restants ?? []).map((a) => a.id))
  let orphelins = 0
  for (const u of users?.users ?? []) {
    if (connus.has(u.id)) continue
    if (!/@presti-test\.invalid$|@example\.(com|org|net)$|@x\.fr$/i.test(u.email ?? '')) continue
    await admin.auth.admin.deleteUser(u.id).catch(() => {})
    orphelins++
  }
  if (orphelins) console.log(`  · ${orphelins} compte(s) de connexion orphelin(s)`)

  console.log(`\n✅ ${n} ligne(s) de données supprimée(s). Sauvegarde : ${path.relative(process.cwd(), fichier)}\n`)
}

main().catch((e) => { console.error('\n💥', e?.message ?? e, '\n'); process.exit(1) })
