// Les purges RGPD (12 mois / 3 ans) — sans aucun appel IA.
//
// Ce que ce test protège (audit final, auditeur B, majeur C6) : les pages légales annoncent
// douze mois pour les données anti-abus et trois ans pour une conversation sans suite, et rien
// ne les appliquait. Maintenant `lib/purgesRgpd.ts` les applique — donc deux risques neufs
// apparaissent, et ce sont eux qu'on surveille ici :
//   · la purge n'efface PAS ce qu'elle devrait (la promesse reste creuse) ;
//   · la purge efface ce qu'elle ne doit JAMAIS toucher — une facture, ou la conversation qui
//     porte le devis d'une facture. Dix ans, art. L. 102 B du LPF.
//
// La méthode : on fabrique des données VIEILLIES avec la clé de service (des horodatages de
// 2007, pour qu'elles soient toujours les premières servies par les purges bornées), on joue
// `purgerRgpd()`, et on vérifie dans les deux sens — ce qui part ET ce qui reste.
//
// ⚠️ La purge est globale : jouée sur la base de production, elle efface aussi les vraies
// données réellement expirées. C'est son travail (le cron quotidien le fait de toute façon) ;
// le test, lui, n'affirme rien que sur ses propres lignes, plus un garde-fou global sur le
// nombre de factures, qui ne doit pas bouger d'une seule.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/purges-rgpd-e2e.mjs
import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { purgerRgpd, seuilMois, seuilJours, PLAFOND_LIGNES, PLAFOND_CONVERSATIONS, JOURS_GRACE_JETONS } =
  await import('../lib/purgesRgpd.ts')
const { DUREES_MOIS, TRAITEMENTS, libelleDuree } = await import('../lib/legalArtisan.ts')

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

const marque = crypto.randomBytes(4).toString('hex')
const jours = (n) => new Date(Date.now() - n * 86400000).toISOString()
const ANCIEN = jours(365 * 19)   // 2007 : toujours en tête des purges bornées
const RECENT = jours(60)         // deux mois : à l'abri des deux durées
const FUTUR = new Date(Date.now() + 30 * 86400000).toISOString()

let artisanId = null
const ipsBannies = []

console.log('\n── 1. Les durées appliquées sont EXACTEMENT celles annoncées')
T('la conversation est annoncée en trois ans', DUREES_MOIS.conversation === 36, String(DUREES_MOIS.conversation))
T('l’anti-abus est annoncé en douze mois', DUREES_MOIS.anti_abus === 12, String(DUREES_MOIS.anti_abus))
T('les pièces comptables sont annoncées en dix ans', DUREES_MOIS.comptable === 120, String(DUREES_MOIS.comptable))
for (const t of TRAITEMENTS) {
  // Une ligne sans clé (agenda, assistant : pas de purge propre) le dit dans son texte de durée ; scripts/rgpd-qa.mjs (F5) juge le reste hors ligne.
  if (!t.cle) continue
  T(`le traitement « ${t.finalite.slice(0, 40)}… » affiche la durée qu’on applique`,
    t.duree.startsWith(libelleDuree(DUREES_MOIS[t.cle])), `${t.duree} vs ${libelleDuree(DUREES_MOIS[t.cle])}`)
}
T('douze mois s’écrit « 12 mois », pas « 1 an »', libelleDuree(12) === '12 mois', libelleDuree(12))
T('trente-six mois s’écrivent « 3 ans »', libelleDuree(36) === '3 ans', libelleDuree(36))
T('chaque purge est bornée (aucun passage illimité)',
  Number.isFinite(PLAFOND_LIGNES) && PLAFOND_LIGNES > 0 && Number.isFinite(PLAFOND_CONVERSATIONS) && PLAFOND_CONVERSATIONS > 0,
  `${PLAFOND_LIGNES} / ${PLAFOND_CONVERSATIONS}`)
T('le seuil anti-abus tombe bien il y a un an', new Date(seuilMois(12)).getTime() < Date.now() - 350 * 86400000)
T('le délai de grâce des jetons est court', JOURS_GRACE_JETONS > 0 && JOURS_GRACE_JETONS <= 30 && new Date(seuilJours(JOURS_GRACE_JETONS)).getTime() < Date.now())

try {
  console.log('\n── 2. Fabrication des données vieillies')
  const email = `purge-rgpd-${marque}@presti-test.invalid`
  const { data: u, error: eU } = await admin.auth.admin.createUser({ email, password: 'Purge-RGPD-' + crypto.randomBytes(8).toString('hex'), email_confirm: true })
  if (eU) throw new Error('compte : ' + eU.message)
  artisanId = u.user.id
  const { error: eA } = await admin.from('artisans').upsert({
    id: artisanId, email, nom: 'Purge RGPD', metier: 'Plombier', slug: `purge-rgpd-${marque}`, plan: 'studio', // 25/10 : Studio (l'Essentiel n'est plus vendu)
    siret: '12345678900012', adresse: '1 rue du Test', code_postal: '17230', ville: 'Marans',
  })
  if (eA) throw new Error('artisan : ' + eA.message)

  const lead = async (nom, created_at, ip = null) => {
    const { data, error } = await admin.from('leads').insert({
      artisan_id: artisanId, nom_prospect: nom, contact: `${nom}-${marque}@presti-test.invalid`,
      message: 'Demande de test', statut: 'nouveau', token: crypto.randomUUID(), created_at, updated_at: created_at, ip,
    }).select('id').single()
    if (error) throw new Error(`lead ${nom} : ${error.message}`)
    return data.id
  }
  const message = async (leadId, sent_at) => {
    const { error } = await admin.from('messages').insert({ lead_id: leadId, sens: 'in', type: 'manuel', contenu: 'Bonjour', sent_at })
    if (error) throw new Error('message : ' + error.message)
  }

  // A — fil mort, aucun devis : doit disparaître, avec ses messages.
  const filMort = await lead('mort', ANCIEN)
  await message(filMort, ANCIEN)
  // A bis — fil mort dont le devis n'a jamais été signé (brouillon) : part aussi (audit RGPD du 20/10) ; le devis, lui, survit détaché.
  const filBrouillon = await lead('brouillon', ANCIEN)
  await message(filBrouillon, ANCIEN)
  const { data: dvBrouillon, error: eDvB } = await admin.from('devis').insert({
    artisan_id: artisanId, lead_id: filBrouillon, numero: `D-RGPD-${marque}-brouillon`, statut: 'brouillon',
    total_ht: 10, total_tva: 0, total_ttc: 10, created_at: ANCIEN,
  }).select('id').single()
  if (eDvB) throw new Error('devis brouillon : ' + eDvB.message)
  // B — fil mort MAIS facturé : doit rester, intégralement.
  const filFacture = await lead('facture', ANCIEN)
  await message(filFacture, ANCIEN)
  const { data: dvFacture, error: eDv } = await admin.from('devis').insert({
    artisan_id: artisanId, lead_id: filFacture, numero: `D-RGPD-${marque}`, statut: 'accepte',
    total_ht: 100, total_tva: 0, total_ttc: 100, created_at: ANCIEN,
  }).select('id').single()
  if (eDv) throw new Error('devis facturé : ' + eDv.message)
  const { data: facture, error: eF } = await admin.from('factures').insert({
    artisan_id: artisanId, devis_id: dvFacture.id, numero: `F-RGPD-${marque}`, client_nom: 'Client Facturé',
    statut: 'emise', date_emission: ANCIEN.slice(0, 10), total_ht: 100, total_tva: 0, total_ttc: 100,
    verrouillee: true, emise_le: ANCIEN, created_at: ANCIEN,
  }).select('id').single()
  if (eF) throw new Error('facture : ' + eF.message)
  // C — fil ancien mais qui a échangé récemment : doit rester.
  const filVivant = await lead('vivant', ANCIEN)
  await message(filVivant, RECENT)
  // D — fil récent : hors de portée de la purge.
  const filRecent = await lead('recent', RECENT)
  await message(filRecent, RECENT)
  // E — fil ancien, échange récent, empreinte d'IP : l'IP part, le fil reste.
  const filIp = await lead('ip', ANCIEN, `ip:vieille-${marque}`)
  await message(filIp, RECENT)
  // F — fil récent avec IP : rien ne bouge.
  const filIpRecent = await lead('ip-recent', RECENT, `ip:recente-${marque}`)

  // Devis : une empreinte d'acceptation périmée, une fraîche.
  const devisAccepte = async (suffixe, accepte_le) => {
    const { data, error } = await admin.from('devis').insert({
      artisan_id: artisanId, numero: `D-RGPD-${marque}-${suffixe}`, statut: 'accepte',
      total_ht: 50, total_tva: 0, total_ttc: 50, created_at: accepte_le,
      accepte_le, accepte_ip: `ip:${suffixe}-${marque}`, accepte_canal: 'plateforme',
    }).select('id').single()
    if (error) throw new Error(`devis ${suffixe} : ${error.message}`)
    return data.id
  }
  const devisVieux = await devisAccepte('vieux', ANCIEN)
  const devisFrais = await devisAccepte('frais', RECENT)

  // Anti-abus.
  const ipVieille = `test-purge-${marque}-vieille`, ipFraiche = `test-purge-${marque}-fraiche`, ipPerm = `test-purge-${marque}-permanent`
  ipsBannies.push(ipVieille, ipFraiche, ipPerm)
  const { error: eAb } = await admin.from('ip_abus').insert([
    { ip: ipVieille, raison: `test ${marque}`, at: ANCIEN },
    { ip: ipFraiche, raison: `test ${marque}`, at: RECENT },
  ])
  if (eAb) throw new Error('ip_abus : ' + eAb.message)
  const { error: eBan } = await admin.from('ip_bans').insert([
    { ip: ipVieille, raison: `test ${marque}`, auto: true, expires_le: ANCIEN },
    { ip: ipFraiche, raison: `test ${marque}`, auto: true, expires_le: RECENT },
    { ip: ipPerm, raison: `test ${marque}`, auto: false, expires_le: null },
  ])
  if (eBan) throw new Error('ip_bans : ' + eBan.message)

  // Jetons.
  const { error: eR } = await admin.from('password_resets').insert([
    { uid: artisanId, token_hash: `perime-${marque}`, expires_at: ANCIEN },
    { uid: artisanId, token_hash: `valide-${marque}`, expires_at: FUTUR },
  ])
  if (eR) throw new Error('password_resets : ' + eR.message)
  const { data: client, error: eC } = await admin.from('clients_plateforme')
    .insert({ artisan_id: artisanId, email: `client-${marque}@presti-test.invalid`, nom: 'Client Test' }).select('id').single()
  if (eC) throw new Error('clients_plateforme : ' + eC.message)
  const { error: eS } = await admin.from('clients_sessions').insert([
    { client_id: client.id, token_hash: `sess-perimee-${marque}`, expire_le: ANCIEN, ip: `ip:sess-${marque}` },
    { client_id: client.id, token_hash: `sess-valide-${marque}`, expire_le: FUTUR },
  ])
  if (eS) throw new Error('clients_sessions : ' + eS.message)
  const { error: eL } = await admin.from('clients_liens').insert({
    artisan_id: artisanId, email: `client-${marque}@presti-test.invalid`, token_hash: `lien-perime-${marque}`, expire_le: ANCIEN,
  })
  if (eL) throw new Error('clients_liens : ' + eL.message)
  console.log(`  6 conversations, 3 devis, 1 facture, 5 lignes anti-abus, 4 jetons — marque ${marque}`)

  const { count: facturesAvant } = await admin.from('factures').select('id', { count: 'exact', head: true })

  console.log('\n── 3. La purge tourne')
  const bilan = await purgerRgpd()
  console.log('  bilan :', JSON.stringify(bilan))
  T('aucune erreur remontée', bilan.erreurs.length === 0, bilan.erreurs.join(' | '))

  console.log('\n── 4. Ce qui doit PARTIR est parti')
  const existe = async (table, id) => {
    const { data } = await admin.from(table).select('id').eq('id', id).maybeSingle()
    return !!data
  }
  T('le fil mort sans devis a disparu', !(await existe('leads', filMort)))
  T('le fil dont le devis n’a jamais été signé (brouillon) a disparu aussi, le devis reste', !(await existe('leads', filBrouillon)) && await existe('devis', dvBrouillon.id))
  const { count: msgMort } = await admin.from('messages').select('id', { count: 'exact', head: true }).eq('lead_id', filMort)
  T('… et ses messages avec lui (cascade)', msgMort === 0, `${msgMort} message(s)`)
  const { data: lIp } = await admin.from('leads').select('id, ip').eq('id', filIp).maybeSingle()
  T('l’empreinte d’IP de plus de douze mois est effacée', lIp?.ip == null, String(lIp?.ip))
  const { data: dV } = await admin.from('devis').select('id, accepte_ip, numero, statut').eq('id', devisVieux).maybeSingle()
  T('l’empreinte d’IP d’acceptation de plus de douze mois est effacée', dV?.accepte_ip == null, String(dV?.accepte_ip))
  const { count: abVieux } = await admin.from('ip_abus').select('id', { count: 'exact', head: true }).eq('ip', ipVieille)
  T('l’abus de plus de douze mois est effacé', abVieux === 0, `${abVieux} ligne(s)`)
  const { data: banVieux } = await admin.from('ip_bans').select('ip').eq('ip', ipVieille).maybeSingle()
  T('le bannissement expiré depuis plus de douze mois est effacé', !banVieux)
  const { data: resetPerime } = await admin.from('password_resets').select('id').eq('token_hash', `perime-${marque}`).maybeSingle()
  T('le jeton de réinitialisation périmé est effacé', !resetPerime)
  const { data: sessPerimee } = await admin.from('clients_sessions').select('id').eq('token_hash', `sess-perimee-${marque}`).maybeSingle()
  T('la session expirée est effacée (avec son IP)', !sessPerimee)
  const { data: lienPerime } = await admin.from('clients_liens').select('id').eq('token_hash', `lien-perime-${marque}`).maybeSingle()
  T('le lien magique expiré est effacé', !lienPerime)

  console.log('\n── 5. Ce qui doit RESTER est resté — surtout ce qu’une facture cite')
  T('la facture émise est intacte', await existe('factures', facture.id))
  const { count: facturesApres } = await admin.from('factures').select('id', { count: 'exact', head: true })
  T('aucune facture n’a disparu de la base, nulle part', facturesApres === facturesAvant, `${facturesAvant} → ${facturesApres}`)
  T('le devis facturé est intact', await existe('devis', dvFacture.id))
  T('la CONVERSATION facturée est intacte, malgré ses dix-neuf ans', await existe('leads', filFacture))
  const { count: msgFacture } = await admin.from('messages').select('id', { count: 'exact', head: true }).eq('lead_id', filFacture)
  T('… avec ses messages', msgFacture === 1, `${msgFacture} message(s)`)
  T('le fil ancien qui a échangé récemment est intact', await existe('leads', filVivant))
  T('le fil récent est intact', await existe('leads', filRecent))
  T('le fil dont on vient d’effacer l’IP existe toujours (on efface l’IP, pas la demande)', await existe('leads', filIp))
  const { data: lIpR } = await admin.from('leads').select('ip').eq('id', filIpRecent).maybeSingle()
  T('une empreinte d’IP de moins de douze mois est conservée', lIpR?.ip === `ip:recente-${marque}`, String(lIpR?.ip))
  T('le devis dont on vient d’effacer l’IP garde son numéro et son statut', dV?.numero === `D-RGPD-${marque}-vieux` && dV?.statut === 'accepte')
  const { data: dF } = await admin.from('devis').select('accepte_ip').eq('id', devisFrais).maybeSingle()
  T('une acceptation de moins de douze mois garde son empreinte (preuve encore utile)', dF?.accepte_ip === `ip:frais-${marque}`, String(dF?.accepte_ip))
  const { count: abFrais } = await admin.from('ip_abus').select('id', { count: 'exact', head: true }).eq('ip', ipFraiche)
  T('un abus récent reste (il alimente encore l’auto-ban)', abFrais === 1, `${abFrais} ligne(s)`)
  const { data: banFrais } = await admin.from('ip_bans').select('ip').eq('ip', ipFraiche).maybeSingle()
  T('un bannissement expiré depuis moins de douze mois reste', !!banFrais)
  const { data: banPerm } = await admin.from('ip_bans').select('ip').eq('ip', ipPerm).maybeSingle()
  T('un bannissement PERMANENT reste (l’effacer rouvrirait la porte)', !!banPerm)
  const { data: resetValide } = await admin.from('password_resets').select('id').eq('token_hash', `valide-${marque}`).maybeSingle()
  T('un jeton de réinitialisation encore valable reste', !!resetValide)
  const { data: sessValide } = await admin.from('clients_sessions').select('id').eq('token_hash', `sess-valide-${marque}`).maybeSingle()
  T('une session en cours reste (personne n’est déconnecté par une purge)', !!sessValide)

  console.log('\n── 6. Un second passage ne retouche rien')
  const bilan2 = await purgerRgpd()
  T('aucune erreur au second passage', bilan2.erreurs.length === 0, bilan2.erreurs.join(' | '))
  T('le fil facturé a survécu aux deux passages', await existe('leads', filFacture))
  T('la facture a survécu aux deux passages', await existe('factures', facture.id))
  // Les compteurs ne peuvent être nuls que si le PREMIER passage a tout épuisé : sur une base
  // qui déborde de vieilles données, le plafond par passage laisse volontairement du reste.
  if (bilan.reste) console.log('  ⏭  un plafond a été atteint au premier passage : compteurs non vérifiés (comportement voulu)')
  else {
    T('plus aucune conversation à effacer', bilan2.conversations === 0, String(bilan2.conversations))
    T('plus aucune empreinte d’IP à effacer', bilan2.leads_ip === 0 && bilan2.devis_ip === 0, `${bilan2.leads_ip} / ${bilan2.devis_ip}`)
    T('plus aucun jeton expiré à effacer', bilan2.jetons === 0, String(bilan2.jetons))
  }
} catch (e) {
  ko++; console.log('  ❌ exception —', e instanceof Error ? e.message : e)
} finally {
  // Ménage : les lignes anti-abus et les jetons ne dépendent pas du compte, on les nomme.
  await admin.from('ip_abus').delete().like('ip', `test-purge-${marque}-%`)
  if (ipsBannies.length) await admin.from('ip_bans').delete().in('ip', ipsBannies)
  await admin.from('password_resets').delete().like('token_hash', `%${marque}`)
  if (artisanId) {
    // clients_sessions, clients_liens, clients_plateforme et leads cascadent depuis l'artisan ;
    // la facture de test, elle, exige la fonction dédiée (trigger factures_conservees, 0041).
    const { error } = await admin.rpc('purger_compte_test', { p_id: artisanId })
    if (error) console.log('  ⚠️ purge du compte de test :', error.message)
    else console.log(`\n🧹 compte de test purgé (${artisanId})`)
  }
}

console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués`)
process.exit(ko ? 1 : 0)
