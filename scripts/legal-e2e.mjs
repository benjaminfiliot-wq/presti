// Test permanent — existence juridique des surfaces de l'artisan (correctif d'audit).
//
// Ce que l'audit reprochait, et qui est le plus gros risque du produit : le site vitrine
// et la plateforme n'avaient AUCUNE mention légale ni information sur les données, alors
// que la plateforme recueille nom, coordonnées, description de panne, photos de domicile
// et adresse IP. Le responsable de traitement, c'est l'ARTISAN — c'est lui que la CNIL
// sanctionnerait, pour un site que Presti a produit.
//
// On vérifie donc deux choses : que l'information EXISTE et qu'elle est atteignable, et
// qu'elle n'INVENTE rien quand l'artisan n'a pas renseigné ses informations.
//
// Usage : node scripts/legal-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

const comptes = []
async function creer(complet) {
  const slug = `verif-legal-${complet ? 'complet' : 'vide'}-${Date.now()}`
  const email = `${slug}@presti-test.invalid`
  const { data: u, error } = await sb.auth.admin.createUser({ email, password: crypto.randomUUID(), email_confirm: true })
  if (error) throw new Error('compte : ' + error.message)
  comptes.push(u.user.id)
  await sb.from('artisans').insert({
    id: u.user.id, email, slug, plan: 'signature', site_active: true, site_tier: 3, plateforme_active: true,
    nom: complet ? 'Menuiserie Ducasse' : 'Sans Mentions', metier: complet ? 'Menuisier' : 'Plombier',
    ...(complet ? {
      forme_juridique: 'SARL au capital de 10 000 €', siret: '55203253400646',
      adresse: '4 rue des Charpentiers', code_postal: '17000', ville: 'La Rochelle',
      tel_public: '05 46 00 00 00', email_public: 'contact@menuiserie-ducasse.fr',
      assurance_nom: 'AXA France IARD', assurance_contrat: 'DEC-778812',
      assurance_activites: 'garantie décennale — menuiserie', assurance_zone: 'France métropolitaine',
      zone_intervention: 'La Rochelle et 30 km',
    } : {}),
  })
  return slug
}

try {
  const complet = await creer(true)
  const vide = await creer(false)

  console.log('\n── 1. La page existe et porte les mentions obligatoires')
  const h = await (await fetch(`${BASE}/site/${complet}/infos-legales`)).text()
  for (const [quoi, motif] of [
    ['la dénomination', /Menuiserie Ducasse/],
    ['la forme juridique', /SARL au capital/],
    ['le SIRET', /55203253400646/],
    ['l’adresse', /4 rue des Charpentiers/],
    ['le contact', /contact@menuiserie-ducasse\.fr/],
    ['l’assurance décennale', /AXA France IARD.*DEC-778812/s],
    ['l’hébergeur', /Vercel/],
    ['le directeur de la publication', /Directeur de la publication/],
  ]) T(`${quoi} figure`, motif.test(h))

  console.log('\n── 2. L’information sur les données (RGPD art. 13)')
  for (const [quoi, motif] of [
    ['les finalités', /Répondre à votre demande de devis/],
    ['la base légale', /Mesures précontractuelles/],
    ['les durées de conservation', /3 ans à compter de notre dernier échange/],
    ['la conservation comptable de 10 ans', /10 ans pour les pièces comptables/],
    ['les sous-traitants réels', /Supabase.*Vercel.*Anthropic.*Resend/s],
    ['les droits', /accéder|corriger|supprimer/i],
    ['le recours à la CNIL', /cnil\.fr/],
    ['le sort des photos et de leur localisation', /localisation.*retir/is],
  ]) T(`${quoi} y figure${quoi.startsWith('les') ? 'nt' : ''}`, motif.test(h))
  // Le seul « Presti » légitime sur cette page est celui de la liste des sous-traitants :
  // l'artisan DOIT dire qui héberge les données de ses clients. Tout le reste — auteur,
  // mots-clés, nom d'application — doit être le sien.
  const meta = h.match(/<meta name="(author|keywords|application-name)" content="[^"]*"/g) || []
  T('les métadonnées portent la marque de l’artisan, pas celle de Presti',
    !meta.some((m) => /Presti|devis artisan|logiciel devis/i.test(m)), meta.join(' | '))
  // On retire aussi les <script> : la charge RSC de Next y duplique tout le rendu, et
  // compter dedans ferait passer une occurrence légitime pour cinq.
  const corps = h.replace(/<head>[\s\S]*?<\/head>/, '').replace(/<script[\s\S]*?<\/script>/g, '')
  // React glisse un `<!-- -->` entre deux nœuds de texte voisins : la regex doit le tolérer,
  // sinon le test échoue sur du balisage parfaitement correct.
  T('« Presti » n’apparaît dans le corps que comme sous-traitant déclaré',
    (corps.match(/Presti/g) || []).length === 1
    && /<b>Presti<\/b>\s*—\s*(<!-- -->)?Éditeur de l’outil/.test(corps),
    (corps.match(/.{0,40}Presti.{0,40}/g) || []).join(' ‖ '))

  console.log('\n── 3. Rien n’est inventé quand l’artisan n’a rien renseigné')
  const hv = await (await fetch(`${BASE}/site/${vide}/infos-legales`)).text()
  T('la page existe quand même', hv.includes('Informations légales'))
  T('les champs manquants sont signalés comme tels', /non communiqué/.test(hv))
  T('et l’obligation est rappelée', /information obligatoire/.test(hv))
  T('aucun SIRET fabriqué', !/\b\d{14}\b/.test(hv))
  T('aucune assurance fabriquée', !/AXA|décennale souscrite|assuré auprès/i.test(hv))

  console.log('\n── 4. La page est atteignable depuis les deux surfaces')
  const site = await (await fetch(`${BASE}/site/${complet}`)).text()
  T('lien depuis le pied de page du site', site.includes(`/site/${complet}/infos-legales`))

  const nav = await chromium.launch()
  const page = await (await nav.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
  await page.goto(`${BASE}/p/${complet}`, { waitUntil: 'networkidle' })
  const texte = await page.evaluate(() => document.body.innerText)
  T('la plateforme informe au moment de la collecte',
    /transmis à Menuiserie Ducasse pour répondre à votre demande/.test(texte), texte.slice(-260))
  T('elle annonce la durée de conservation', /conserv/i.test(texte))
  T('elle rappelle les droits', /accéder|corriger|supprimer/i.test(texte))
  T('et renvoie vers la page complète', await page.locator(`a[href="/site/${complet}/infos-legales"]`).count() > 0)

  console.log('\n── 5. Plus de marque Presti dans le navigateur du client')
  const cles = await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)))
  T('aucune clé de stockage ne contient « presti »', !cles.some((k) => /presti/i.test(k)), cles.join(', '))

  console.log('\n── 6. La page reste servie si le site n’est pas publié')
  await sb.from('artisans').update({ site_active: false }).eq('slug', complet)
  const r = await fetch(`${BASE}/site/${complet}/infos-legales`)
  T('une obligation légale ne dépend pas d’un réglage marketing', r.status === 200, `HTTP ${r.status}`)

  await nav.close()
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  for (const uid of comptes) {
    await sb.from('artisans').delete().eq('id', uid)
    await sb.auth.admin.deleteUser(uid)
  }
  if (comptes.length) console.log(`\n🧹 ${comptes.length} artisans de test supprimés`)
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
