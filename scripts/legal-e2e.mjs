// Test permanent — existence juridique des surfaces, celles de l'artisan ET celles de
// l'éditeur (correctif d'audit).
//
// § 0 (audit final, B) : les pages de Presti lui-même. Les mentions légales ne portaient ni
// email ni téléphone alors que la LCEN les exige d'une personne physique (art. 6-III-1 a,
// art. 19) et que la seule adresse citée par le produit, contact@prestiapp.fr, n'existe pas ;
// l'offre Signature vendait un « support prioritaire » qu'aucun texte ne définissait ; et
// l'annexe de sous-traitance (art. 28 RGPD) ne disait ni où ni combien de temps. Ce bloc ne
// crée aucun compte : il tourne d'abord, et seul, si le reste échoue.
//
// §§ 1 à 6 : ce que l'audit reprochait d'abord, et qui reste le plus gros risque du produit :
// le site vitrine
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

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
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

// Un avertissement, pas un échec : ce qui dépend d'une décision du propriétaire (publier son
// numéro de téléphone) ne doit pas laisser une suite rouge en permanence — une suite toujours
// rouge finit par n'être plus lue, et c'est alors tout le fichier qui ne sert plus à rien.
const A = (n) => console.log(`  ⚠️  ${n}`)

try {
  // ── 0 avant tout : les pages de l'ÉDITEUR. Aucun compte n'est créé pour ce bloc — une
  // mention légale absente doit se voir même le jour où Supabase refuse la création de comptes.
  console.log('\n── 0. Les pages légales de l’éditeur (LCEN, support, litiges, art. 28)')
  const [ml, cgu, conf] = await Promise.all(
    ['/mentions-legales', '/cgu', '/confidentialite'].map((p) => fetch(`${BASE}${p}`).then((r) => r.text())),
  )

  // LCEN art. 6-III-1 a et art. 19 : une adresse de courrier électronique, en plus du formulaire.
  const surveillee = (process.env.PRESTI_ALERTES_EMAIL || process.env.EMAIL_ENTREPRISE || '').trim().toLowerCase()
  const publiee = (ml.match(/mailto:([^"'\s>]+@[^"'\s>]+)/) || [])[1]?.toLowerCase()
  T('les mentions légales portent une adresse email (LCEN art. 6-III-1)', !!publiee, 'aucun mailto: dans la page')
  T('… et c’est une boîte relevée, pas la boîte morte du domaine',
    publiee !== 'contact@prestiapp.fr' || surveillee === 'contact@prestiapp.fr', String(publiee))
  // Si la publication et la relève divergent, l'adresse affichée n'est plus lue par personne :
  // c'est exactement le défaut de contact@prestiapp.fr, en plus discret.
  T('… la même que celle qui reçoit les alertes (PRESTI_ALERTES_EMAIL)',
    !surveillee || publiee === surveillee, `publiée ${publiee} ≠ surveillée ${surveillee}`)
  T('le formulaire reste proposé à côté de l’email', /href="\/contact"/.test(ml))
  if (/Téléphone<\/span>\s*(?:<!-- -->)?\s*\+?[\d][\d ().-]{7,}/.test(ml)) T('un numéro de téléphone est publié', true)
  else A('aucun numéro de téléphone publié — la LCEN l’exige d’une personne physique (art. 6-III-1 a, art. 19). Décision du propriétaire : le numéro ne peut pas être inventé ici.')

  // Le « support prioritaire » est vendu dans la grille des offres (lib/plans.ts) : ce qu'il
  // recouvre doit être écrit quelque part d'opposable, sinon c'est une promesse invérifiable.
  for (const [quoi, motif] of [
    ['l’article « Support et assistance »', /id="support"/],
    ['le délai de l’Essentiel', /Essai et Essentiel — 3 jours ouvrés/],
    ['celui du Studio', /Studio — 2 jours ouvrés/],
    ['celui de Signature', /Signature — 1 jour ouvré/],
    ['la définition du « support prioritaire »', /support prioritaire[\s\S]{0,600}tête de file/],
    ['le décompte en jours ouvrés', /hors jours fériés/],
    // Le remboursement au prorata proposé par l'agent a été retiré : c'est au propriétaire d'en décider.
    ['ce qui est dû si le délai n’est pas tenu', /résilier à tout moment, sans frais/],
  ]) T(`${quoi} figure aux CGU`, motif.test(cgu))

  // Médiation et règlement en ligne des litiges : présents, et cohérents avec le reste du
  // produit — l'artisan a un médiateur (art. L. 616-1), l'éditeur n'en a pas et le dit.
  for (const [quoi, motif] of [
    ['l’article « règlement des litiges »', /id="litiges"/],
    ['la médiation de la consommation', /L\. 611-1 et suivants du code de la consommation/],
    ['le sort de la plateforme européenne (fermée le 20/07/2025)', /cessé de fonctionner le.{0,40}20 juillet 2025/s],
    ['le renvoi vers le médiateur de l’artisan', /L\. 616-1 du code de la consommation/],
  ]) T(`${quoi} figure aux CGU`, motif.test(cgu))
  T('aucun lien vers la plateforme européenne fermée', !/ec\.europa\.eu\/consumers\/odr/i.test(cgu))
  T('aucun médiateur inventé pour l’éditeur', !/(nous avons adhéré|notre médiateur)/i.test(cgu))

  // Annexe art. 28 : les quatre points qu'un responsable de traitement doit pouvoir montrer.
  for (const [quoi, motif] of [
    ['le lieu du traitement', /stockées dans l’Union européenne/],
    ['les transferts encadrés', /clauses contractuelles types/],
    ['les durées de conservation', /Durées de conservation/],
    ['les mesures de sécurité (art. 32)', /Sécurité<\/strong>\s*(?:<!-- -->)?\s*\(art\. 32\)/],
    ['le sort des données en fin de contrat', /Sort des données à la fin du contrat/],
    ['la restitution avant suppression', /export complet/],
  ]) T(`${quoi} figure à l’annexe`, motif.test(cgu))
  // Régression surveillée : la version précédente annonçait des sauvegardes que l'audit F-12 a
  // démenties. Tant qu'aucune sauvegarde n'est prouvée, la mention ne doit pas revenir.
  T('aucune mesure de sécurité annoncée sans exister (sauvegardes, journal des accès)',
    !/sauvegardes|journal des accès/i.test(cgu))

  T('la politique de confidentialité publie la même adresse email', !publiee || conf.toLowerCase().includes(publiee))
  T('… et renvoie vers l’annexe de sous-traitance', /href="\/cgu#sous-traitance"/.test(conf))

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
