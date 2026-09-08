// Sonde : un fondateur voit-il, dans SON écran Devis, les devis des autres artisans ?
//
// `app/devis/page.tsx` et `app/factures/page.tsx` chargent sans `.eq('artisan_id', …)` : ils
// s'appuient entièrement sur la RLS. Or `0004_founder_access.sql` donne `for all` à `is_founder()`
// sur `devis`, `devis_lignes`, `leads`, `factures` et `factures_lignes`. La migration 0070 a exclu
// le PARTENAIRE de cette fonction — pas le fondateur.
//
// Le prompt v11 §5 est pourtant clair : les données des clients d'un artisan sont interdites au
// fondateur lui-même, « sauf ticket support ouvert, journalisé et notifié ». C'est toute la raison
// d'être du mode support : si l'écran Devis les montre déjà, la porte étroite ne sert à rien.
//
// Cette sonde crée un fondateur de test, lit avec SA session (donc sous RLS, comme le navigateur),
// et compte ce qui sort sans jamais l'afficher. Puis elle le supprime.
//
// Usage : node scripts/sonde-rls-fondateur.mjs

import crypto from 'node:crypto'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { verifierSessionTest } from './lib/connexion-test.mjs'

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const marque = `rlsfond-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
const comptes = []

async function compte(fondateur, role) {
  const email = `${marque}-${role ? 'p' : fondateur ? 'f' : 'a'}@presti-test.invalid`
  const password = `Rls-${crypto.randomBytes(9).toString('base64url')}-1`
  const { data: u } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (!u?.user?.id) throw new Error('création impossible')
  comptes.push(u.user.id)
  await admin.from('artisans').insert({
    id: u.user.id, email, nom: fondateur ? 'Fondateur test' : 'Artisan test', metier: 'Test',
    slug: `${marque}-${role ? 'p' : fondateur ? 'f' : 'a'}`, plan: 'gratuit', is_founder: fondateur, role_interne: role ?? null,
  })
  const pub = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password })
  if (!s?.session?.access_token) throw new Error('session impossible')
  await verifierSessionTest(s.session.access_token)
  return { uid: u.user.id, jeton: s.session.access_token, pub }
}

async function menage() {
  for (const id of comptes) {
    await admin.from('artisans').update({ is_founder: false }).eq('id', id).then(() => {}, () => {})
    await admin.rpc('purger_compte_test', { p_id: id }).then(() => {}, () => {})
    await admin.from('artisans').delete().eq('id', id).then(() => {}, () => {})
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
  const { count } = await admin.from('artisans').select('id', { count: 'exact', head: true }).like('email', `%${marque}%`)
  if (count) console.error(`\n⚠️  ${count} compte(s) de sonde SUBSISTENT — ils portent is_founder.`)
}

try {
  console.log('\n══ Ce qu’un fondateur voit sous RLS, comme son navigateur ══\n')
  const artisan = await compte(false)
  const fondateur = await compte(true)
  // Le profil d'Alexandre : is_founder = true (le contrat le lui laisse), role_interne = partenaire.
  // La migration 0070 a corrige la FONCTION is_founder() pour l'exclure — les policies l'utilisent-elles ?
  const partenaire = await compte(true, 'partenaire')

  // Un devis qui appartient à l'artisan, et à personne d'autre.
  const { data: d, error: eD } = await admin.from('devis').insert({
    artisan_id: artisan.uid, numero: `SONDE-${marque.slice(-6)}`, objet: 'Sonde RLS',
    client_nom: 'Client de la sonde', statut: 'brouillon', total_ht: 100, total_tva: 20, total_ttc: 120,
  }).select('id').single()
  if (eD) { console.log('⛔ impossible de créer le devis de test :', eD.message); throw eD }
  console.log(`  un devis appartenant à l’artisan de test : ${d.id.slice(0, 8)}\n`)

  const lire = async (session, table, colonne) => {
    const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${session.jeton}` } },
    })
    const { data, error } = await c.from(table).select(colonne)
    return { n: data?.length ?? 0, erreur: error?.message }
  }

  // `artisans` a été ajoutée le 08/09 : la sonde ne regardait que devis, factures et demandes, et
  // c'est exactement pour ça que `founders_read_artisans` a survécu au ménage de 0074 pendant une
  // journée. Cette table porte les IBAN : c'est la plus sensible des quatre.
  const fuites = []
  for (const [table, colonne] of [['devis', 'id, artisan_id'], ['factures', 'id, artisan_id'], ['leads', 'id, artisan_id'], ['artisans', 'id']]) {
    const vuArtisan = await lire(artisan, table, colonne)
    const vuFondateur = await lire(fondateur, table, colonne)
    const vuPartenaire = await lire(partenaire, table, colonne)
    // Sur `artisans`, chacun voit SA ligne (`artisan_select_own`, 0001) : le seuil normal est 1,
    // pas 0. Une sonde qui crie au feu sur le comportement normal finit par être ignorée.
    const sien = table === 'artisans' ? 1 : 0
    const propres = (vuFondateur.n ?? 0) <= sien
    const partenairePropre = (vuPartenaire.n ?? 0) <= sien
    if (!propres || !partenairePropre) fuites.push(table)
    console.log(`  ${table.padEnd(9)} l’artisan voit ${String(vuArtisan.n).padStart(4)} ligne(s) · le fondateur en voit ${String(vuFondateur.n).padStart(5)} ${propres ? '✅' : `⛔ dont ${vuFondateur.n - sien} qui ne sont pas à lui`}`)
    console.log(`  ${' '.repeat(9)} le PARTENAIRE (profil d’Alexandre) en voit ${String(vuPartenaire.n).padStart(4)} ${partenairePropre ? '✅ exclu par 0070' : '⛔ FUITE'}`)
    if (vuFondateur.erreur) console.log(`             (${vuFondateur.erreur.slice(0, 70)})`)
  }
  console.log('\n  Rappel v11 §5 : « Données des clients des artisans — fondateur : INTERDIT, sauf ticket')
  console.log('  support ouvert, journalisé et notifié. » Si les chiffres de droite ne sont pas nuls,')
  console.log('  la porte étroite du mode support ne protège rien : la fenêtre d’à côté est ouverte.\n')
  // Un code de sortie, pour qu'un lanceur puisse la jouer : une sonde qui écrit « FUITE » et sort
  // zéro n'est jamais branchée nulle part, donc jamais jouée, donc inutile le jour où ça compte.
  if (fuites.length) { console.log(`❌ ${fuites.length} table(s) laissent voir les lignes des autres : ${fuites.join(', ')}\n`); process.exitCode = 1 }
  else console.log('✅ aucune table ne laisse voir les lignes des autres\n')
} catch (e) {
  console.error('\n💥', e?.message ?? e)
} finally {
  await menage()
}
