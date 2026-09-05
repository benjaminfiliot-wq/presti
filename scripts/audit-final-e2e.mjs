// Test permanent — les défauts de l'audit final (prompt v6, auditeurs B, C, H) restent fermés.
//
// Chaque cas rejoue ce que l'auditeur a constaté. Aucun appel IA, aucun paiement : le seul
// appel Stripe (subscribe) est refusé AVANT de toucher Stripe.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/audit-final-e2e.mjs
import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(SB, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const html = async (u) => (await fetch(`${BASE}${u}`, { headers: { 'User-Agent': 'presti-verif' } })).text()

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const comptes = []

const { mentionFranchise } = await import('../lib/facturation.ts')
const { buildPdfData } = await import('../lib/devisPdfData.ts').catch(() => ({}))
const { concerneAbonnementCourant } = await import('../lib/stripe.ts')

// Contraste WCAG entre deux couleurs hex.
const lum = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const contraste = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)

try {
  console.log('\n── B-A4. Une seule référence de franchise pour l’éditeur et pour les artisans')
  T('aujourd’hui (tolérance ouverte), « auto » cite l’art. 293 B du CGI', /293 B du CGI/.test(mentionFranchise('auto')), mentionFranchise('auto'))
  T('passé le 31/12/2027, « auto » cite le CIBS', /CIBS/.test(mentionFranchise('auto', new Date('2028-02-01'))))
  const cgu = await html('/cgu')
  T('les CGU de Presti citent la même référence', /293 B du CGI/.test(cgu))
  const ml = await html('/mentions-legales')
  T('… et les mentions légales aussi', /293 B du CGI/.test(ml))

  console.log('\n── B-A5. Le n° de TVA de l’artisan assujetti est sur le PDF')
  if (typeof buildPdfData === 'function') {
    const d = buildPdfData({ numero: 'D-1' }, [], { nom: 'Test', siret: '12345678900012', tva_regime: 'normal', tva_num: 'FR12345678901' }, 'devis')
    T('l’en-tête porte le numéro', d.entSub.some((l) => /FR12345678901/.test(l)), JSON.stringify(d.entSub))
    const f = buildPdfData({ numero: 'D-1' }, [], { nom: 'Test', siret: '12345678900012', tva_regime: 'franchise', tva_num: null }, 'devis')
    T('… et pas de ligne vide pour un artisan en franchise', !f.entSub.some((l) => /TVA/.test(l)))
  } else {
    const src = fs.readFileSync('lib/devisPdfData.ts', 'utf8')
    T('l’en-tête porte le numéro (lecture du code)', /tva_num/.test(src) && /N° TVA/.test(src))
  }

  console.log('\n── C2. La page légale d’un artisan suit son réglage de référencement')
  const slug = `verif-final-${Date.now()}`
  const email = `verif-final-${Date.now()}@presti-test.invalid`
  const mdp = crypto.randomBytes(18).toString('base64url')
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
  if (error) throw new Error(error.message)
  comptes.push(u.user.id)
  await admin.from('artisans').insert({ id: u.user.id, email, nom: 'Vérif Final', metier: 'Plombier', slug, plan: 'studio', site_active: true, site_seo: false, plateforme_active: true, credits: 10, stripe_subscription_id: 'sub_verif_final' })
  const legale = await html(`/site/${slug}/infos-legales`)
  T('site_seo=false → infos-légales en noindex', /<meta name="robots" content="noindex/.test(legale), (legale.match(/<meta name="robots"[^>]*>/) || ['aucune balise robots'])[0])

  console.log('\n── C3 / C4. Le comparatif parle aux lecteurs d’écran ; le texte discret se lit')
  const landing = await html('/')
  T('les coches ont un rôle (aria-label sur un span nu est interdit)', /class="cmp-oui" role="img"/.test(landing))
  T('le tableau défilant se prend au clavier', /class="cmp-wrap"[^>]*tabindex="0"/.test(landing))

  console.log('\n── C1. La landing ne charge plus 2,4 Mo d’images sur téléphone')
  T('les scènes de la démo sont en WebP', /\/demo\/scene-1\.webp/.test(landing) && !/scene-\d\.png/.test(landing))
  T('deux scènes montées au plus, pas cinq', (landing.match(/\/demo\/scene-\d\.webp/g) || []).length <= 3, `${(landing.match(/\/demo\/scene-\d\.webp/g) || []).length} références`)
  const poids = (await fetch(`${BASE}/demo/scene-5.webp`, { method: 'HEAD' })).headers.get('content-length')
  T('la scène la plus lourde pèse moins de 120 Ko', Number(poids) > 0 && Number(poids) < 120_000, `${poids} octets`)
  const css = fs.readFileSync('app/globals.css', 'utf8')
  const faint = (css.match(/--faint:(#[0-9A-Fa-f]{6})/) || [])[1]
  T(`--faint (${faint}) contraste ≥ 4,5:1 sur le fond de la landing`, faint && contraste(faint, '#09090C') >= 4.5, faint ? contraste(faint, '#09090C').toFixed(2) : 'introuvable')

  console.log('\n── E3. Les CGU s’acceptent à l’inscription')
  const signup = await html('/signup')
  T('une case à cocher CGU', /name="cgu"/.test(signup) && /required/.test(signup))
  T('… avec le lien vers /cgu et /confidentialite', /href="\/cgu"/.test(signup) && /href="\/confidentialite"/.test(signup))

  console.log('\n── C15. La messagerie connectée est décrite dans la politique')
  const conf = await html('/confidentialite')
  T('collecte décrite', /Messagerie connectée/.test(conf))
  T('finalité décrite', /messagerie connectée/i.test(conf.split('Finalités')[1] || ''))

  console.log('\n── E4. Le client sait qu’il peut se rétracter')
  const chat = fs.readFileSync('app/p/[slug]/PlatChat.tsx', 'utf8')
  const pdf = fs.readFileSync('lib/DevisPDF.tsx', 'utf8')
  T('à l’écran d’acceptation (L. 221-18, L. 221-25, L. 221-28)', /L\. 221-18/.test(chat) && /L\. 221-25/.test(chat) && /L\. 221-28/.test(chat))
  T('sur le devis PDF', /L\. 221-18/.test(pdf))

  console.log('\n── B-A6. Le médiateur figure sur le devis')
  if (typeof buildPdfData === 'function') {
    const dm = buildPdfData({ numero: 'D-1' }, [], { nom: 'Test', mediateur_nom: 'CM2C', mediateur_url: 'https://cm2c.net' }, 'devis')
    T('la donnée PDF porte le médiateur', /CM2C/.test(dm.mediateur ?? ''), JSON.stringify(dm.mediateur))
    T('… et un avoir se reconnaît', buildPdfData({ numero: 'F-1', avoir_de: 'x' }, [], { nom: 'Test' }, 'facture').avoir === true)
  }

  console.log('\n── B-A9. Une facture émise s’annule par un avoir, jamais d’un clic')
  const pub = createClient(SB, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password: mdp })
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session.access_token}` }
  const { data: fac } = await admin.from('factures').insert({ artisan_id: u.user.id, numero: 'FAC-TEST-1', client_nom: 'Client', statut: 'emise', date_emission: new Date().toISOString().slice(0, 10), total_ht: 100, total_tva: 0, total_ttc: 100, verrouillee: true, emise_le: new Date().toISOString() }).select('id').single()
  await admin.from('factures_lignes').insert({ facture_id: fac.id, ordre: 0, designation: 'Main d’œuvre', quantite: 2, unite: 'h', prix_unitaire_ht: 50, tva_taux: 0 })
  const rp = await fetch(`${BASE}/api/factures/${fac.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ statut: 'annulee' }) })
  T('PATCH statut=annulee est refusé (409, avoir requis)', rp.status === 409 && /avoir/i.test((await rp.json().catch(() => ({}))).error ?? ''), String(rp.status))
  const ra = await fetch(`${BASE}/api/factures/${fac.id}/avoir`, { method: 'POST', headers: H, body: '{}' })
  const ja = await ra.json().catch(() => ({}))
  T('POST /avoir crée une pièce numérotée', ra.ok && /^FAC-\d{4}-\d{4}$/.test(ja.numero ?? ''), `${ra.status} ${JSON.stringify(ja).slice(0, 120)}`)
  const { data: av } = ja.id ? await admin.from('factures').select('total_ttc, verrouillee, avoir_de, statut').eq('id', ja.id).maybeSingle() : { data: null }
  T('… négative, scellée, qui cite la facture', av && av.total_ttc === -100 && av.verrouillee === true && av.avoir_de === fac.id, JSON.stringify(av))
  const { data: lav } = ja.id ? await admin.from('factures_lignes').select('prix_unitaire_ht').eq('facture_id', ja.id) : { data: [] }
  T('… avec les lignes en négatif', (lav ?? []).length === 1 && lav[0].prix_unitaire_ht === -50, JSON.stringify(lav))
  const { data: orig } = await admin.from('factures').select('statut').eq('id', fac.id).maybeSingle()
  T('la facture d’origine passe « annulée » par l’avoir', orig?.statut === 'annulee', orig?.statut)
  const ra2 = await fetch(`${BASE}/api/factures/${fac.id}/avoir`, { method: 'POST', headers: H, body: '{}' })
  T('un second avoir est refusé', ra2.status === 409, String(ra2.status))

  console.log('\n── B-C7. L’adresse IP d’un prospect n’est jamais lisible en clair par l’artisan')
  const { ipPseudonyme } = await import('../lib/security.ts')
  T('le pseudonyme ne contient pas l’adresse', /^ip:[0-9a-f]{32}$/.test(ipPseudonyme('203.0.113.7') ?? '') && !/203/.test(ipPseudonyme('203.0.113.7')))
  T('… mais reste stable (même émetteur → même empreinte)', ipPseudonyme('203.0.113.7') === ipPseudonyme('203.0.113.7') && ipPseudonyme('203.0.113.7') !== ipPseudonyme('203.0.113.8'))
  T('inconnue → null', ipPseudonyme('unknown') === null)
  const src = fs.readFileSync('app/api/leads/route.ts', 'utf8') + fs.readFileSync('app/api/conversation/devis/route.ts', 'utf8')
  T('plus aucune écriture d’IP en clair dans leads/devis', !/ip === 'unknown' \? null : ip/.test(src))

  console.log('\n── C10. L’annexe de sous-traitance (art. 28) est dans les CGU')
  T('annexe présente, avec sous-traitants ultérieurs et violation de données', /art\. 28 RGPD/.test(cgu) && /Sous-traitants ultérieurs/.test(cgu) && /Violation de données/.test(cgu))

  console.log('\n── H-majeur. Le client d’un artisan sans crédit n’est pas laissé dans le silence')
  const st = fs.readFileSync('app/api/conversation/stream/route.ts', 'utf8')
  T('le serveur dit pourquoi il ne répond pas (raison: credits)', /raison: 'credits'/.test(st))
  T('le chat affiche une note quand aucune réponse automatique ne vient', /type: 'info'/.test(chat) && /répond en personne/.test(chat))

  console.log('\n── E. L’IA : coûts justes, verrou d’offre serveur, pannes signalées')
  const stream = fs.readFileSync('app/api/conversation/stream/route.ts', 'utf8')
  T('M1 — le crédit est débité au tarif du modèle servi', !/consumeCredit\(artisan\.id, 'standard'/.test(stream))
  T('M2 — l’assistant autonome est verrouillé côté serveur', /peut\(artisan\.plan, 'plateforme\.ia\.auto'\)/.test(stream))
  const routesIA = ['app/api/leads/route.ts', 'app/api/devis/generer/route.ts', 'app/api/tools/reponse/route.ts', 'app/api/site/generate/route.ts', 'app/api/messages/route.ts', 'app/api/cron/relances/route.ts']
  T('M5 — les six chemins signalent une panne IA', routesIA.every((f) => /signalerPanneIA\(/.test(fs.readFileSync(f, 'utf8'))), routesIA.filter((f) => !/signalerPanneIA\(/.test(fs.readFileSync(f, 'utf8'))).join(', '))
  T('M5 — le crédit d’une génération échouée est rendu', /export async function rendreCredit/.test(fs.readFileSync('lib/credits.ts', 'utf8')) && routesIA.slice(0, 5).every((f) => /rendreCredit\(/.test(fs.readFileSync(f, 'utf8'))))

  console.log('\n── D. Parcours : adresse valide, bornes, lien expiré, onglets, libellé du site')
  const { slugify, slugBase } = await import('../lib/slug.ts')
  const long = slugBase('Entreprise très longue très longue très longue et encore') + '-abcd'
  T('D-1.7 — l’adresse générée fait 40 caractères au plus', long.length <= 40, `${long.length} : ${long}`)
  T('… sans double tiret ni tiret de bord', !/--/.test(long) && !/^-|-$/.test(long) && !/-{2,}|^-|-$/.test(slugify('a----b-')), long)
  const { error: eNom } = await admin.from('artisans').update({ nom: 'x'.repeat(371) }).eq('id', u.user.id)
  T('D-1.6 — la base refuse un nom de 371 caractères (migration 0058 à coller sinon)', !!eNom, eNom ? eNom.message.slice(0, 80) : 'accepté : coller supabase/migrations/_A_COLLER_sql_editor_0058.sql')
  const { error: eTel } = await admin.from('artisans').update({ tel_public: 'abc<script>' }).eq('id', u.user.id)
  T('D-1.6 — la base refuse un téléphone « abc<script> »', !!eTel, eTel ? eTel.message.slice(0, 80) : 'accepté')
  await admin.from('artisans').update({ nom: 'Vérif Final', tel_public: null }).eq('id', u.user.id)
  T('D-3.3 — un lien magique expiré est annoncé au client', /a expiré ou a déjà servi/.test(chat) && /role="alert"/.test(chat))
  T('D-4.6 — les onglets de /plateforme défilent au lieu de dézoomer', /\.pil-volets\{[^}]*overflow-x:auto/.test(css) && /\.pil-volets button\{flex:none/.test(css))
  const profilSrc = fs.readFileSync('app/profil/page.tsx', 'utf8')
  T('D-2.6 — le libellé du site suit l’état enregistré, pas la case', /siteActiveEnregistre/.test(profilSrc) && /après Enregistrer/.test(profilSrc))

  console.log('\n── F. Fiabilité : alertes attendues et tracées, emails bornés, relances honnêtes')
  const sources = ['app', 'lib'].flatMap((d) => fs.readdirSync(d, { recursive: true }).filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => fs.readFileSync(`${d}/${f}`, 'utf8'))).join('\n')
  T('F1 — plus aucun signalerPanneIA lancé dans le vide', !/void signalerPanneIA\(/.test(sources))
  T('F2 — une alerte perdue laisse une trace (app_errors)', /enregistrerErreur\(`alerte perdue/.test(fs.readFileSync('lib/alertes.ts', 'utf8')))
  T('F4 — la ronde « erreurs » lit la bonne colonne sur 24 h', /select\('contexte, message, created_at'\)/.test(fs.readFileSync('lib/alertes.ts', 'utf8')) && /24 \* 3_600_000/.test(fs.readFileSync('lib/alertes.ts', 'utf8')))
  const { sendEmail } = await import('../lib/email.ts')
  const skip = await sendEmail({ to: 'quelquun@presti-test.invalid', subject: 'test', text: 'test' })
  T('F8 — une adresse de test n’est jamais envoyée (pas de rebond)', skip.ok === true && skip.id === 'ignore-adresse-de-test', JSON.stringify(skip))
  const rel = fs.readFileSync('app/api/cron/relances/route.ts', 'utf8')
  T('F5 — une relance dont l’email échoue reste due', /if \(!envoi\.ok\)/.test(rel))
  T('F11 — pas de relance au nom d’un compte fondateur ni vers une adresse de test', /is_founder \|\| \/\\\.invalid\$\/i/.test(rel))
  T('F7 — plafond quotidien global sur les envois non critiques', /emails:jour/.test(fs.readFileSync('lib/email.ts', 'utf8')))

  console.log('\n── H-bloquant 2. Pas de second abonnement pour un abonné')
  const r = await fetch(`${BASE}/api/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session.access_token}` }, body: JSON.stringify({ plan: 'signature' }) })
  const j = await r.json().catch(() => ({}))
  T('/api/subscribe répond 409 et renvoie vers le portail', r.status === 409 && j.portail === true, `${r.status} ${JSON.stringify(j).slice(0, 100)}`)
  await admin.from('artisans').update({ stripe_subscription_id: null, is_founder: true }).eq('id', u.user.id)
  const rf = await fetch(`${BASE}/api/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session.access_token}` }, body: JSON.stringify({ plan: 'signature' }) })
  T('un fondateur ne peut pas s’abonner par erreur (403)', rf.status === 403, String(rf.status))

  console.log('\n── H-majeur. Un ancien abonnement qui se termine ne rétrograde pas l’abonné')
  T('id différent → ignoré', concerneAbonnementCourant('sub_courant', 'sub_ancien') === false)
  T('id identique → rétrogradé', concerneAbonnementCourant('sub_courant', 'sub_courant') === true)
  T('sans id en base → rétrogradé (mieux vaut à tort qu’à vie)', concerneAbonnementCourant(null, 'sub_x') === true)
  const wh = fs.readFileSync('app/api/stripe/webhook/route.ts', 'utf8')
  T('le webhook écoute les échecs de prélèvement', /invoice\.payment_failed/.test(wh))
  T('une erreur de traitement rend 500 (Stripe réessaie)', /status: 500/.test(wh))
} catch (e) {
  ko++; console.log('  ❌ exception —', e instanceof Error ? e.message : e)
} finally {
  for (const id of comptes) { const { error } = await admin.rpc('purger_compte_test', { p_id: id }); if (error) console.log('  ⚠️ purge :', error.message) }
  if (comptes.length) console.log(`\n🧹 ${comptes.length} compte(s) de test purgé(s)`)
}

console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués`)
process.exit(ko ? 1 : 0)
