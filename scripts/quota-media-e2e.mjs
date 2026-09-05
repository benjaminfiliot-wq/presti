// Test permanent — quota de stockage par compte (audit final, auditeur F, majeur 4.3 et 4.4).
//
// Le défaut rejoué : le bucket `artisan-media` n'avait aucun plafond par compte. Un compte
// d'essai — gratuit, sans carte — pouvait téléverser en boucle depuis le navigateur, et
// ~70 fichiers de 15 Mo remplissaient l'offre Supabase entière. Le dépassement ne punit pas
// le fautif : il coupe les images de TOUS les artisans en même temps.
//
// Ce qu'on prouve, et rien d'autre :
//   1. la décision elle-même (fonction pure) : plafond par conversation ET par artisan ;
//   2. /api/media accepte tant qu'il reste de la place ;
//   3. il REFUSE au-delà du plafond de l'offre, avec un message que l'artisan comprend ;
//   4. supprimer des images LIBÈRE la place — le compte redevient utilisable aussitôt ;
//   5. le plafond tient image après image : deux entrent, la troisième est refusée ;
//   6. le navigateur ne peut plus écrire dans le bucket en direct (sinon le plafond serait
//      décoratif : la clé anon est publique) ;
//   7. les photos de chantier d'un prospect sont comptées, et décomptées à leur suppression.
//
// Aucun appel IA : le compte de test est en `leads_pause` (la demande est enregistrée, mais
// ni réponse IA ni email ne partent). En revanche la suite ENVOIE ~40 Mo (un plafond ne se
// prouve qu'en le remplissant pour de vrai) : compter une à deux minutes selon la connexion.
//
// Prérequis : migrations 0059 A **et** B appliquées.
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/quota-media-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
// Import APRÈS .env.local : le module tire les clients Supabase du projet, qui se
// construisent à leur chargement. Un import statique les créerait sans clés.
const { PLAFOND_CONVERSATION, formaterOctets, plafondImages, porteMonnaie } = await import('../lib/quotaMedia.ts')
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin = createClient(URL_SB, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

const MO = 1024 * 1024
// PNG 1×1 valide : le début de tous les fichiers envoyés, pour que rien ne soit « faux ».
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const image = (octets) => Buffer.concat([PNG, Buffer.alloc(Math.max(0, octets - PNG.length))])

const comptes = []
const dossiers = []

async function artisan(plan) {
  const tag = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
  const email = `verif-quota-${tag}@presti-test.invalid`
  const motDePasse = crypto.randomBytes(18).toString('base64url')
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
  if (error) throw new Error('compte : ' + error.message)
  comptes.push(u.user.id)
  dossiers.push(u.user.id)
  const slug = `verif-quota-${tag}`
  // leads_pause : la demande est enregistrée (donc les photos aussi), mais aucune réponse
  // IA ni aucun email ne partent. Zéro crédit consommé, zéro envoi Resend.
  await admin.from('artisans').insert({
    id: u.user.id, email, nom: 'Vérif Quota', metier: 'Plombier', slug, plan, leads_pause: true, site_active: false,
  })
  const pub = createClient(URL_SB, ANON, { auth: { persistSession: false } })
  const { data: s, error: eLog } = await pub.auth.signInWithPassword({ email, password: motDePasse })
  if (eLog) throw new Error('connexion : ' + eLog.message)
  return { uid: u.user.id, email, motDePasse, slug, jeton: s.session.access_token }
}

const envoyer = (jeton, buf, ext = 'png') => fetch(`${BASE}/api/media?ext=${ext}`, {
  method: 'POST',
  headers: { authorization: `Bearer ${jeton}`, 'content-type': 'image/png' },
  body: buf,
}).then(async (r) => ({ status: r.status, corps: await r.json().catch(() => ({})) }))

const usage = (jeton) => fetch(`${BASE}/api/media`, { headers: { authorization: `Bearer ${jeton}` } })
  .then(async (r) => ({ status: r.status, corps: await r.json().catch(() => ({})) }))

try {
  console.log('\n── 1. La décision, sans réseau : deux plafonds, et il faut les deux')
  const seul = porteMonnaie(Number.POSITIVE_INFINITY)
  T('trois photos compressées (900 Ko) tiennent dans une conversation',
    [0, 1, 2].every(() => seul.accepte(900 * 1024)))
  T(`la quatrième dépasse le plafond de conversation (${formaterOctets(PLAFOND_CONVERSATION)})`, seul.accepte(900 * 1024) === false)
  T('les octets acceptés sont comptés exactement', seul.octets() === 3 * 900 * 1024, String(seul.octets()))

  const presquePlein = porteMonnaie(1 * MO)
  T('un artisan au bout de son quota ne prend plus une photo de 2 Mo', presquePlein.accepte(2 * MO) === false)
  T('… mais accepte encore ce qui rentre (500 Ko)', presquePlein.accepte(500 * 1024) === true)
  T('rien n’est décompté pour une photo refusée', presquePlein.octets() === 500 * 1024, String(presquePlein.octets()))

  console.log('\n── 2. /api/media : la porte d’entrée')
  const a = await artisan('gratuit')
  const plafond = plafondImages('gratuit')
  console.log(`  offre Essai → plafond ${formaterOctets(plafond)}`)

  const sansJeton = await fetch(`${BASE}/api/media?ext=png`, { method: 'POST', body: image(1024) }).then((r) => r.status)
  T('sans jeton : refusé (401)', sansJeton === 401, String(sansJeton))
  const mauvaisFormat = await envoyer(a.jeton, image(1024), 'gif')
  T('format inconnu : refusé (400)', mauvaisFormat.status === 400, `${mauvaisFormat.status} ${mauvaisFormat.corps.error ?? ''}`)
  const tropLourd = await envoyer(a.jeton, image(4 * MO + 100 * 1024))
  T('fichier au-dessus de la borne par fichier : refusé (413)', tropLourd.status === 413, `${tropLourd.status} ${tropLourd.corps.error ?? ''}`)

  const premier = await envoyer(a.jeton, image(120 * 1024))
  T('une première image passe et renvoie son URL', premier.status === 200 && /^https?:\/\/.+artisan-media\//.test(premier.corps.url || ''), `${premier.status} ${premier.corps.error ?? premier.corps.url}`)
  const u1 = await usage(a.jeton)
  T('l’usage mesuré suit l’envoi', u1.corps.mesure === true && u1.corps.utilise >= 120 * 1024, JSON.stringify(u1.corps))

  console.log('\n── 3. Au-delà du plafond : refus, et message compréhensible')
  // Remplissage écrit en direct (service_role) : on mesure le VRAI contenu du dossier, donc
  // peu importe par où les octets sont entrés. 6 × ~4 Mo = ~24 Mo, sous le plafond de 25 Mo.
  const bloc = 4 * MO - 1024
  const remplissage = await Promise.all(Array.from({ length: 6 }, (_, i) =>
    admin.storage.from('artisan-media').upload(`${a.uid}/remplissage-${i}.png`, image(bloc), { contentType: 'image/png', upsert: true })))
  T('remplissage à ~24 Mo écrit', remplissage.every((r) => !r.error), remplissage.find((r) => r.error)?.error?.message)

  const avant = await usage(a.jeton)
  T(`l’usage est sous le plafond avant l’envoi de trop (${avant.corps.lisible})`, avant.corps.utilise < plafond, JSON.stringify(avant.corps))

  const refus = await envoyer(a.jeton, image(2.5 * MO))
  T('l’image qui ferait déborder est refusée (413)', refus.status === 413, `${refus.status} ${JSON.stringify(refus.corps)}`)
  const msg = String(refus.corps.error || '')
  console.log(`  message rendu : « ${msg} »`)
  T('le message dit la limite atteinte et l’unité', /atteint la limite de .+ Mo d’images/.test(msg), msg)
  T('le message nomme l’offre', /votre offre Essai/.test(msg), msg)
  T('le message donne les deux sorties (supprimer ou monter d’offre)', /supprimez-en/.test(msg) && /offre supérieure/.test(msg), msg)
  const { data: apresRefus } = await admin.storage.from('artisan-media').list(a.uid, { limit: 1000 })
  const images = (apresRefus ?? []).filter((f) => f.name.endsWith('.png'))
  T('rien n’a été écrit malgré le refus (6 blocs + 1 image)', images.length === 7, `${images.length} fichier(s)`)

  console.log('\n── 4. Supprimer libère la place, tout de suite')
  const { error: eSuppr } = await admin.storage.from('artisan-media')
    .remove([`${a.uid}/remplissage-0.png`, `${a.uid}/remplissage-1.png`])
  T('deux images supprimées', !eSuppr, eSuppr?.message)
  const apres = await usage(a.jeton)
  T(`l’usage retombe (${avant.corps.lisible} → ${apres.corps.lisible})`, apres.corps.utilise < avant.corps.utilise - 7 * MO, JSON.stringify(apres.corps))
  const reprise = await envoyer(a.jeton, image(2.5 * MO))
  T('la MÊME image passe maintenant', reprise.status === 200, `${reprise.status} ${JSON.stringify(reprise.corps)}`)

  console.log('\n── 5. Le plafond tient image après image (le parcours réel est séquentiel)')
  // Il reste ~6,4 Mo : deux images de 2,5 Mo entrent, la troisième non. C'est exactement ce
  // que vit un artisan qui remplit sa galerie — les composants d'import envoient une photo,
  // attendent, puis la suivante.
  const suite = []
  for (let i = 0; i < 3; i++) suite.push(await envoyer(a.jeton, image(2.5 * MO)))
  console.log(`  codes : ${suite.map((r) => r.status).join(',')}`)
  T('les deux premières passent', suite[0].status === 200 && suite[1].status === 200, suite.map((r) => r.status).join(','))
  T('la troisième est refusée, elle ferait déborder', suite[2].status === 413, `${suite[2].status} ${suite[2].corps.error ?? ''}`)
  const fin = await usage(a.jeton)
  T(`l’usage final ne dépasse jamais le plafond (${fin.corps.lisible})`, fin.corps.utilise <= plafond, JSON.stringify(fin.corps))

  console.log('\n── 6. Le navigateur n’écrit plus en direct (sinon le plafond est décoratif)')
  const commeNavigateur = createClient(URL_SB, ANON, {
    auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${a.jeton}` } },
  })
  const { error: eDirect } = await commeNavigateur.storage.from('artisan-media')
    .upload(`${a.uid}/contournement-${Date.now()}.png`, image(1024), { contentType: 'image/png' })
  T('un envoi direct avec la clé anon est refusé (0059 B appliquée)', !!eDirect, 'AUCUNE erreur : la policy d’écriture est encore ouverte')
  const { data: liste } = await commeNavigateur.storage.from('artisan-media').list(a.uid, { limit: 1000 })
  T('aucun fichier de contournement dans le dossier', !(liste ?? []).some((f) => f.name.startsWith('contournement-')))

  console.log('\n── 7. Photos de chantier : comptées, puis décomptées')
  const b = await artisan('gratuit')
  const photo = (ko) => `data:image/png;base64,${image(ko * 1024).toString('base64')}`
  const envoiLead = await fetch(`${BASE}/api/leads`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: b.slug, contact: '06 00 00 00 11', nom_prospect: 'Vérif Quota',
      message: 'Test de quota de stockage, à ignorer.', photos: [photo(200), photo(200)],
    }),
  }).then(async (r) => ({ status: r.status, corps: await r.json().catch(() => ({})) }))
  T('la demande avec photos est acceptée', envoiLead.status === 200 && !!envoiLead.corps.leadId, `${envoiLead.status} ${JSON.stringify(envoiLead.corps)}`)

  const { data: lead } = await admin.from('leads').select('id, photos, photos_octets').eq('id', envoiLead.corps.leadId).maybeSingle()
  T('les photos sont enregistrées', Array.isArray(lead?.photos) && lead.photos.length === 2, JSON.stringify(lead?.photos))
  T(`les octets sont comptés (${lead?.photos_octets})`, (lead?.photos_octets ?? 0) >= 400 * 1024, String(lead?.photos_octets))
  const { data: totalB } = await admin.rpc('octets_lead_media', { p_artisan: b.uid })
  T('le total par artisan suit (RPC 0059)', Number(totalB) === Number(lead?.photos_octets), `${totalB} vs ${lead?.photos_octets}`)

  // Ce que fait /api/donnees quand l'artisan efface une conversation.
  await admin.from('leads').update({ photos: null }).eq('id', lead.id)
  const { data: apresEffacement } = await admin.from('leads').select('photos_octets').eq('id', lead.id).maybeSingle()
  T('effacer les photos remet le compteur à zéro (trigger 0059)', apresEffacement?.photos_octets === 0, String(apresEffacement?.photos_octets))
  const { data: totalApres } = await admin.rpc('octets_lead_media', { p_artisan: b.uid })
  T('le quota de l’artisan est libéré', Number(totalApres) === 0, String(totalApres))
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  for (const uid of dossiers) {
    const { data: fichiers } = await admin.storage.from('artisan-media').list(uid, { limit: 1000 })
    if (fichiers?.length) await admin.storage.from('artisan-media').remove(fichiers.map((f) => `${uid}/${f.name}`))
  }
  for (const uid of comptes) {
    const { data: leads } = await admin.from('leads').select('id').eq('artisan_id', uid)
    for (const l of leads ?? []) {
      const { data: photos } = await admin.storage.from('lead-media').list(l.id, { limit: 100 })
      if (photos?.length) await admin.storage.from('lead-media').remove(photos.map((f) => `${l.id}/${f.name}`))
      await admin.from('messages').delete().eq('lead_id', l.id)
      await admin.from('relances').delete().eq('lead_id', l.id)
    }
    await admin.from('leads').delete().eq('artisan_id', uid)
    await admin.from('artisans').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid)
  }
  if (comptes.length) console.log(`\n🧹 ${comptes.length} artisan(s) de test supprimé(s), stockage vidé`)
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
