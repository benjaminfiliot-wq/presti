// Vidéos du centre d'aide : une VRAIE capture de l'interface par fonctionnalité du menu (lib/aide-videos.json).
//
// Même méthode que scripts/demo-gestion-videos.mjs (captures en rafale du vrai écran, rassemblées par ffmpeg avec leur durée
// réelle). Aucun sous-titre n'est incrusté : la capture note les étapes et les gestes (journal <id>.evenements.json), le montage
// (aide-videos-anime.mjs) y ajoute le motion design (zooms, curseur, surlignage, cartons d'étape) et la voix.
//
// Compte : un compte de TEST jetable (carreleur fictif « Atelier Durand », offre Signature, données d'exemple fictives, AUCUNE
// réalisation : le portfolio de la démo, aux photos CC BY-SA, n'existe pas ici). Détruit dans le `finally`, quoi qu'il arrive,
// et on relit la base pour le prouver. Aucun e-mail réel n'est envoyé (adresses *.invalid). Au plus 2 appels IA réels
// (réponses instantanées, assistant), uniquement quand on enregistre ces deux vidéos.
//
// Usage : TEST_BASE=http://localhost:3010 node scripts/aide-videos-capture.mjs <id|explorer>
//   explorer : photographie chaque écran + liste ses boutons (dossier scratch), sans rien enregistrer.
// Sortie : videos/aide-brut/<id>.mp4 (+ .marques.json) ; le montage (aide-videos-montage.mjs) fait public/aide-videos/<id>.mp4.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { codeEmailSiDemande } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'http://localhost:3010'
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) throw new Error('Enregistrer sur un serveur local, pas sur la production.')
const CIBLE = process.argv[2]
if (!CIBLE) throw new Error('Usage : node scripts/aide-videos-capture.mjs <id|explorer>')
const VIDEOS = JSON.parse(fs.readFileSync('lib/aide-videos.json', 'utf8')).videos
const SORTIE = path.join(process.cwd(), 'videos', 'aide-brut')
const SCRATCH = process.env.AIDE_SCRATCH || path.join(process.cwd(), 'videos', 'aide-brut', '_explorer')
fs.mkdirSync(SORTIE, { recursive: true })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const log = (s) => console.log(s)
const DPR = Number(process.env.AIDE_DPR || 1.5) // 1440 × 900 pixels CSS, capturés en 2160 × 1350 : les zooms du montage restent nets

const stamp = Date.now()
const email = `aide-videos-${stamp}@presti-test.invalid`
const mdp = crypto.randomBytes(18).toString('base64url')
const slug = `atelier-durand-${String(stamp).slice(-5)}`
const jours = (n) => new Date(Date.now() - n * 864e5).toISOString()
const jour = (n) => jours(n).slice(0, 10)
let uid = null
let nav = null

const TARIFS = [
  ['Fourniture carrelage grès cérame 60x60', 'm²', 32, 10],
  ['Pose de carrelage au sol', 'm²', 45, 10],
  ['Ragréage autolissant', 'm²', 9, 10],
  ['Dépose de l’ancien carrelage', 'm²', 18, 10],
  ['Colle et joints', 'm²', 6.5, 10],
  ['Plinthes carrelées', 'ml', 8, 10],
]

async function ins(table, rows, select = 'id') {
  const r = await admin.from(table).insert(rows).select(select)
  if (r.error) throw new Error(`${table} : ${r.error.message}`)
  return r.data
}

/** Données d'exemple, toutes fictives, toutes rattachées au compte de test. */
async function semer() {
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
  if (error) throw new Error('compte : ' + error.message)
  uid = u.user.id
  const up = await admin.from('artisans').upsert({
    id: uid, email, nom: 'Atelier Durand', metier: 'Carreleur', slug, plan: 'signature', credits: 600,
    ville: 'Marans', zone_intervention: 'La Rochelle et alentours', tel_public: '05 46 00 00 00', email_public: null, site_seo: false,
    bio: 'Carrelage et faïence : sols, salles de bain, terrasses.', services: [{ nom: 'Carrelage de sol' }, { nom: 'Salles de bain' }],
    ton_style: 'Bonjour ! Merci pour votre message. Je regarde ça et je reviens vers vous rapidement.',
    plateforme_active: true, reponse_auto: false, site_active: false, theme: 'atelier', accent: '#8a5a2b',
    forme_juridique: 'EI', siret: '12345678900012', adresse: '4 rue des Ateliers', code_postal: '17230',
    assurance_nom: 'Assureur Démo', assurance_contrat: 'DEMO-2026', tva_regime: 'reel', tva_num: 'FR00123456789',
    realisations: [], // JAMAIS de photo du portfolio CC BY-SA dans une vidéo
  })
  if (up.error) throw new Error('artisan : ' + up.error.message)
  await admin.from('plateforme_config').upsert({ artisan_id: uid, mode_reponse: 'assistee', modele: 'pro', ton: 'chaleureux', nom_assistant: 'L’atelier' }, { onConflict: 'artisan_id' })
  await ins('prix_artisan', TARIFS.map(([designation, unite, prix_ht, tva_taux]) => ({ artisan_id: uid, designation, unite, prix_ht, tva_taux, source: 'saisie' })))

  // Clients
  const cl = await ins('clients', [
    { artisan_id: uid, nom: 'Mme Martin', email: 'martin@presti-test.invalid', tel: '06 00 00 00 01', adresse: '12 rue des Lilas', code_postal: '17000', ville: 'La Rochelle' },
    { artisan_id: uid, nom: 'M. Garnier', email: 'garnier@presti-test.invalid', tel: '06 00 00 00 02', adresse: '3 allée des Pins', code_postal: '17137', ville: 'Nieul-sur-Mer' },
    { artisan_id: uid, nom: 'Mme Lefèvre', email: 'lefevre@presti-test.invalid', tel: '06 00 00 00 03', adresse: '8 quai Valin', code_postal: '17000', ville: 'La Rochelle' },
  ])

  // Demandes de clients (Messages / Tableau de bord / Plateforme) : la dernière a une réponse préparée à valider.
  const DEMANDES = [
    ['Mme Robin', 'Bonjour, je voudrais refaire le carrelage de ma cuisine (14 m²). Vous pouvez passer pour un devis ?', 'Bonjour Madame Robin, merci pour votre message. Pour un sol de cuisine, le mieux est que je passe prendre les mesures. Quelles sont vos disponibilités cette semaine ?', 'nouveau', 0.05],
    ['M. Petit', 'Salle de bain à refaire : douche à l’italienne et faïence murale, c’est possible en juin ?', 'Bonjour Monsieur Petit, oui, c’est tout à fait possible. Pourriez-vous m’envoyer une photo de la pièce et ses dimensions approximatives ?', 'nouveau', 0.2],
    ['Mme Morel', 'Une terrasse de 20 m² à carreler à Aytré, quels délais ?', 'Bonjour Madame Morel, j’interviens bien à Aytré. Pour chiffrer juste, une courte visite est utile. Quand êtes-vous disponible ?', 'en_discussion', 1.1],
    ['M. Faure', 'Des carreaux qui se décollent dans l’entrée, vous réparez ?', 'Bonjour Monsieur Faure, oui, je peux regarder. Les carreaux sont-ils sur toute l’entrée ou seulement quelques-uns ?', 'en_discussion', 2.3],
    ['Mme Blanc', 'Merci pour le devis, je valide pour la salle de bain !', null, 'gagne', 4.2],
  ]
  for (const [i, [nom, msg, rep, statut, age]] of DEMANDES.entries()) {
    const [lead] = await ins('leads', { artisan_id: uid, nom_prospect: nom, contact: `${nom.toLowerCase().replace(/[^a-z]+/g, '.')}@exemple.invalid`, canal: 'plateforme', message: msg, statut, token: crypto.randomUUID(), urgence: 'normal', type_chantier: 'Carrelage', created_at: jours(age), lu_le: statut === 'nouveau' ? null : jours(age) })
    const msgs = [{ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: msg, sent_at: jours(age) }]
    if (rep) msgs.push({ lead_id: lead.id, sens: 'out', type: 'reponse_auto', contenu: rep, etat: statut === 'nouveau' ? 'proposition' : null, modele: 'pro', sent_at: jours(age - 0.001) })
    await ins('messages', msgs)
  }

  // Devis (lignes cohérentes avec les totaux) et factures
  const ligne = (designation, quantite, unite, pu) => ({ designation, quantite, unite, prix_unitaire_ht: pu, tva_taux: 10 })
  const DEVIS = [
    ['DEV-2026-0007', 'Carrelage cuisine 14 m²', 0, 'brouillon', 'Mme Robin', [ligne('Dépose de l’ancien carrelage', 14, 'm²', 18), ligne('Pose de carrelage au sol', 14, 'm²', 45), ligne('Fourniture carrelage grès cérame 60x60', 14, 'm²', 32)]],
    ['DEV-2026-0006', 'Salle de bain complète', 3, 'envoye', 'M. Garnier', [ligne('Pose de carrelage au sol', 6, 'm²', 45), ligne('Faïence murale', 18, 'm²', 52), ligne('Étanchéité de douche', 1, 'u', 280)]],
    ['DEV-2026-0005', 'Terrasse 20 m²', 9, 'accepte', 'Mme Lefèvre', [ligne('Pose de carrelage extérieur', 20, 'm²', 58), ligne('Plinthes carrelées', 18, 'ml', 8)]],
    ['DEV-2026-0004', 'Entrée : réparation du sol', 20, 'accepte', 'Mme Martin', [ligne('Dépose de l’ancien carrelage', 5, 'm²', 18), ligne('Pose de carrelage au sol', 5, 'm²', 45)]],
  ]
  const devisIds = []
  for (const [numero, objet, age, statut, client, lignes] of DEVIS) {
    const ht = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire_ht, 0)
    const c = cl.find((x) => x.id) && (await admin.from('clients').select('id').eq('artisan_id', uid).eq('nom', client).maybeSingle()).data
    const [d] = await ins('devis', { artisan_id: uid, client_id: c?.id ?? null, numero, objet, statut, date_emission: jour(age), validite_jours: 30, client_nom: client, client_email: 'client@presti-test.invalid', total_ht: ht, total_tva: Math.round(ht * 10) / 100, total_ttc: Math.round(ht * 110) / 100, source: 'manuel', accepte_le: statut === 'accepte' ? jours(age - 2) : null, envoye_le: statut === 'brouillon' ? null : jours(age) })
    devisIds.push(d.id)
    await ins('devis_lignes', lignes.map((l, i) => ({ devis_id: d.id, ordre: i, ...l })))
  }
  const FACTURES = [
    ['FAC-2026-0003', 'Terrasse 20 m² : acompte', 12, 'emise', 'Mme Lefèvre', 612, 8, null],
    ['FAC-2026-0002', 'Entrée : réparation du sol', 25, 'payee', 'Mme Martin', 345, -10, jour(15)],
    ['FAC-2026-0001', 'Salle de bain Blanc', 55, 'payee', 'Mme Blanc', 2310, -30, jour(35)],
  ]
  for (const [numero, objet, age, statut, client, ttc, echeance, payee] of FACTURES) {
    const ht = Math.round(ttc / 1.1 * 100) / 100
    const [f] = await ins('factures', { artisan_id: uid, numero, objet, statut, date_emission: jour(age), date_echeance: jour(-echeance), client_nom: client, client_email: 'client@presti-test.invalid', total_ht: ht, total_tva: Math.round((ttc - ht) * 100) / 100, total_ttc: ttc, payee_le: payee, tva_regime: 'reel', categorie_operation: 'services' })
    await ins('factures_lignes', [{ facture_id: f.id, ordre: 0, designation: objet, quantite: 1, unite: 'u', prix_unitaire_ht: ht, tva_taux: 10 }])
  }

  // Inventaire : fournisseurs, matériaux, stock
  const fo = await ins('fournisseurs', [
    { artisan_id: uid, nom: 'Négoce Martin', type: 'negoce', remise_pct: 12, delai_jours: 2, agence: 'Rochefort', ordre: 0 },
    { artisan_id: uid, nom: 'Comptoir Ouest', type: 'negoce', remise_pct: 8, delai_jours: 1, agence: 'La Rochelle', ordre: 1 },
  ])
  const MAT = [
    ['Carreau grès cérame 60x60 (m²)', 'Carrelage', 'm²', 8, 31.5, { atelier: 24, camion: 6 }],
    ['Colle à carrelage C2 (25 kg)', 'Colles', 'u', 5, 19.9, { atelier: 3 }],
    ['Joint gris perle (5 kg)', 'Joints', 'u', 4, 14.2, { atelier: 7 }],
    ['Croisillons 3 mm (sachet)', 'Accessoires', 'u', 6, 3.4, { atelier: 12, camion: 4 }],
    ['Ragréage autolissant (25 kg)', 'Préparation', 'u', 4, 22.8, { atelier: 2 }],
    ['Profilé de finition alu', 'Accessoires', 'u', 10, 6.9, { atelier: 15 }],
  ]
  for (const [nom, categorie, unite, seuil, prix, stock] of MAT) {
    const [m] = await ins('materiaux', { artisan_id: uid, nom, categorie, unite, seuil_alerte: seuil, prix_dernier_ht: prix, fournisseur_prefere: 'Négoce Martin', fournisseur_id: fo[0].id })
    await ins('stock', Object.entries(stock).map(([lieu, quantite]) => ({ materiau_id: m.id, lieu, quantite })))
  }
  log(`compte de test prêt (${slug})`)
}

/** Ménage : tout ce que les écrans et l'assistant ont pu créer, puis le compte ; la base est relue pour le prouver. */
async function nettoyer() {
  if (!uid) return
  const del = async (t, col, val) => { const r = await admin.from(t).delete().eq(col, val); if (r.error && !/does not exist|schema cache/.test(r.error.message)) log(`  (nettoyage ${t} : ${r.error.message.slice(0, 80)})`) }
  const ids = async (t, col = 'artisan_id') => (await admin.from(t).select('id').eq(col, uid)).data?.map((x) => x.id) ?? []
  const dv = await ids('devis'); const fa = await ids('factures'); const le = await ids('leads'); const ma = await ids('materiaux')
  if (dv.length) await admin.from('devis_lignes').delete().in('devis_id', dv)
  if (fa.length) await admin.from('factures_lignes').delete().in('facture_id', fa)
  if (le.length) await admin.from('messages').delete().in('lead_id', le)
  if (ma.length) { await admin.from('stock').delete().in('materiau_id', ma) }
  const tablesPropres = ['assistant_actions', 'assistant_journal', 'assistant_conversations', 'mouvements_stock', 'prix_observations', 'materiaux', 'fournisseurs', 'crm_taches', 'crm_chantiers', 'crm_clients', 'devis', 'factures', 'leads', 'clients', 'prix_artisan', 'regles_automatisation', 'plateforme_config']
  for (const t of tablesPropres) await del(t, 'artisan_id', uid)
  await del('artisans', 'id', uid)
  await admin.auth.admin.deleteUser(uid).catch((e) => log(`  (deleteUser : ${e.message})`))
  // Preuve : plus rien dans la base pour ce compte.
  const restes = []
  for (const t of ['artisans']) { const r = await admin.from(t).select('id', { count: 'exact', head: true }).eq('id', uid); if (r.count) restes.push(`${t}:${r.count}`) }
  for (const t of ['devis', 'factures', 'leads', 'clients', 'prix_artisan', 'materiaux', 'fournisseurs']) { const r = await admin.from(t).select('id', { count: 'exact', head: true }).eq('artisan_id', uid); if (r.count) restes.push(`${t}:${r.count}`) }
  const u = await admin.auth.admin.getUserById(uid); if (u.data?.user) restes.push('auth.users')
  log(restes.length ? `⚠️ reste en base : ${restes.join(', ')}` : '🧹 compte de test détruit, plus rien en base')
}

try {
  await semer()
  // sans GL logiciel forcé : les captures en rafale y sont bien plus rapides. La maquette 3D du CRM exige WebGL avec GPU (sinon elle bascule en plan 2D).
  nav = await chromium.launch(/^(demo-)?crm$/.test(CIBLE) ? { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], channel: 'chromium' } : undefined)

  // Connexion hors enregistrement : la vidéo ne montre jamais l'e-mail ni le mot de passe du compte de test.
  const ctxLogin = await nav.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' })
  const pl = await ctxLogin.newPage()
  await pl.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await pl.fill('#email-connexion', email); await pl.fill('#mdp-connexion', mdp)
  await pl.click('form button[type="submit"], form button:not([type="button"])')
  await codeEmailSiDemande(pl, email)
  await pl.waitForURL(/\/(outils|dashboard)/, { timeout: 30000 })
  // Visites guidées déjà vues (la vidéo démarre sur l'écran utile) : en base ET en local.
  await admin.from('artisans').update({ aide_vues: ['visite:console', 'visite:crm', 'visite:assistant'] }).eq('id', uid)
  await pl.evaluate(() => { try { localStorage.setItem('presti.aide_vues', JSON.stringify(['visite:console', 'visite:crm', 'visite:assistant'])) } catch {} })
  const etat = await ctxLogin.storageState()
  await ctxLogin.close()

  // Le badge « N / 1 Issue » du serveur de développement (Next.js, <nextjs-portal>) n'existe pas en production : on le masque.
  const nouvellePage = async (ctx) => {
    const p = await ctx.newPage()
    await p.addInitScript(() => {
      const poser = () => { if (document.getElementById('masque-nx')) return; const s = document.createElement('style'); s.id = 'masque-nx'; s.textContent = 'nextjs-portal,[data-nextjs-toast],[data-next-badge-root]{display:none!important}'; document.documentElement.appendChild(s) }
      const cacher = () => { for (const e of document.querySelectorAll('*')) if (e.shadowRoot && /next|issue/i.test(e.tagName + (e.shadowRoot.textContent || '').slice(0, 600))) e.style.setProperty('display', 'none', 'important') }
      setInterval(() => { try { poser(); cacher() } catch {} }, 100) // React peut retirer la balise à l'hydratation : on la repose
    })
    return p
  }

  if (CIBLE === 'explorer') {
    fs.mkdirSync(SCRATCH, { recursive: true })
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR', storageState: etat })
    const p = await nouvellePage(ctx)
    const routes = process.argv[3] ? process.argv[3].split(',') : VIDEOS.map((v) => v.route)
    for (const r of routes) {
      await p.goto(`${BASE}${r}`, { waitUntil: 'networkidle' }).catch(() => {})
      await p.waitForTimeout(1500)
      log('hôtes shadow : ' + JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.shadowRoot).map((e) => e.tagName + ' ' + e.id + ' ' + getComputedStyle(e).display + ' ' + (e.shadowRoot.textContent || '').slice(0, 60)))))
      if (process.argv[4]) { for (const c of process.argv[4].split('|')) { await p.getByText(c, { exact: false }).first().click().catch((e) => log('clic raté ' + c)); await p.waitForTimeout(2500) } }
      const nom = r.replace(/[^a-z0-9]+/gi, '_') + (process.argv[4] ? '_' + process.argv[4].replace(/[^a-z0-9]+/gi, '_') : '')
      await p.screenshot({ path: path.join(SCRATCH, `${nom}.png`) })
      const btns = await p.evaluate(() => [...document.querySelectorAll('button, a, input, textarea, select, [role=tab]')].filter((e) => !e.closest('aside, nav') && e.offsetParent !== null).map((e) => `${e.tagName.toLowerCase()}${e.getAttribute('role') ? '[' + e.getAttribute('role') + ']' : ''} "${(e.getAttribute('aria-label') || e.textContent || e.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 60)}"${e.href ? ' → ' + e.getAttribute('href') : ''}`))
      fs.writeFileSync(path.join(SCRATCH, `${nom}.txt`), `${p.url()}\n` + btns.join('\n'))
      log(`${r} → ${p.url()} (${btns.length} éléments)`)
    }
    await ctx.close()
  } else {
    // « demo-crm » : la démo de la page d'accueil (public/demo/crm-atelier.mp4), même capture, montée par scripts/demo-crm-montage.mjs.
    const v = CIBLE === 'demo-crm' ? { id: 'demo-crm', etapes: [] } : VIDEOS.find((x) => x.id === CIBLE)
    if (!v) throw new Error(`vidéo inconnue : ${CIBLE}`)
    const scenarios = (await import('./aide-videos-scenarios.mjs')).default
    const sc = scenarios[v.id]
    if (!sc) throw new Error(`pas de scénario pour ${v.id}`)
    const dir = path.join(SORTIE, `_${v.id}-images`)
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: DPR, locale: 'fr-FR', storageState: etat })
    const page = await nouvellePage(ctx)
    page.setDefaultTimeout(30000)
    const t0 = Date.now(); const marque = {}; const images = []
    let enCours = true; let depart = null; let finT = null
    const pret = new Promise((r) => { depart = r })
    // Capture par « screencast » du navigateur (≈ 23 images/s en 2160 × 1350, contre ≈ 2 pour une boucle de captures d'écran) :
    // une image à chaque changement de la page, avec son instant ; les images identiques ne coûtent rien.
    const cdp = await ctx.newCDPSession(page)
    cdp.on('Page.screencastFrame', (fr) => {
      const t = Date.now(); const f = `f${String(images.length).padStart(5, '0')}.jpg`
      fs.writeFileSync(path.join(dir, f), Buffer.from(fr.data, 'base64')); images.push({ f, t })
      cdp.send('Page.screencastFrameAck', { sessionId: fr.sessionId }).catch(() => {})
    })
    const boucle = (async () => {
      await pret // pas de capture pendant le chargement initial
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: Math.round(1440 * DPR), maxHeight: Math.round(900 * DPR), everyNthFrame: 1 })
      for (let k = 0; k < 40 && !images.length; k++) await page.waitForTimeout(50)
      if (!images.length) { const buf = await page.screenshot({ type: 'jpeg', quality: 92 }); fs.writeFileSync(path.join(dir, 'f00000.jpg'), buf); images.push({ f: 'f00000.jpg', t: Date.now() }) }
      while (enCours) await page.waitForTimeout(80)
      finT = Date.now(); await cdp.send('Page.stopScreencast').catch(() => {})
    })()
    // Outils pour les scénarios
    const sec = (ms) => page.waitForTimeout(ms)
    // Les étapes sont seulement MARQUÉES (le texte est ajouté au montage, en motion design : plus de bandeau dans la page, donc
    // aucun élément de l'interface n'est jamais masqué). Une étape dure au moins MIN_ETAPE ; le montage coupe ou prolonge au besoin.
    let dernier = 0
    const MIN_ETAPE = Number(process.env.AIDE_MIN_ETAPE || 3500)
    const etape = async (i) => { const reste = MIN_ETAPE - (Date.now() - dernier); if (dernier && reste > 0) await sec(reste); dernier = Date.now(); marque[`etape${i + 1}`] = (Date.now() - t0) / 1000 }
    const marquer = (k) => { marque[k] = (Date.now() - t0) / 1000 }
    // Le curseur est invisible en capture : on NOTE ses gestes (trajets, clics, survols, saisies, défilements) avec leur instant et la
    // boîte de l'élément visé ; le montage (aide-videos-anime.mjs) dessine un vrai curseur, une onde de clic, un surlignage corail et
    // les zooms à partir de ce journal. Le trajet est joué en temps réel (courbe douce) pour que les survols de la page restent justes.
    const evts = []; const now = () => (Date.now() - t0) / 1000
    let pos = { x: 720, y: 470 }
    const glisser = async (x, y) => {
      const a = { ...pos }; const dist = Math.hypot(x - a.x, y - a.y)
      if (dist < 4) return
      const dur = Math.max(380, Math.min(950, 260 + dist * 0.85)); const t1 = now(); const debut = Date.now()
      // Le trajet suit l'HORLOGE, pas un nombre d'étapes : sur une page lourde (maquette 3D) un déplacement de souris prend 100 à 200 ms et le geste durait 5 s.
      for (;;) {
        const k = Math.min(1, (Date.now() - debut) / dur); const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
        await page.mouse.move(a.x + (x - a.x) * e, a.y + (y - a.y) * e)
        if (k >= 1) break
        await page.waitForTimeout(16)
      }
      evts.push({ k: 'move', t: t1, t1: now(), x0: a.x, y0: a.y, x1: x, y1: y }); pos = { x, y }
    }
    const roue = page.mouse.wheel.bind(page.mouse)
    page.mouse.wheel = async (dx, dy) => { evts.push({ k: 'scroll', t: now() }); return roue(dx, dy) }
    const boite = (b) => ({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) })
    // Souris « humaine » : glisse vers l'élément puis clique.
    const cliquer = async (loc, { pause = 500 } = {}) => {
      await loc.scrollIntoViewIfNeeded().catch(() => {})
      const b = await loc.boundingBox(); if (!b) throw new Error('élément sans boîte : ' + loc)
      await glisser(b.x + b.width / 2, b.y + b.height / 2)
      evts.push({ k: 'cible', t: now(), rect: boite(b) })
      await sec(pause)
      evts.push({ k: 'click', t: now(), rect: boite(b), x: pos.x, y: pos.y })
      await loc.click()
    }
    const survoler = async (loc, { pause = 700 } = {}) => {
      await loc.scrollIntoViewIfNeeded().catch(() => {})
      const b = await loc.boundingBox(); if (!b) return
      await glisser(b.x + b.width / 2, b.y + b.height / 2)
      evts.push({ k: 'hover', t: now(), dur: pause / 1000, rect: boite(b) }); await sec(pause)
    }
    const saisir = async (loc, texte, delai = 45) => { await cliquer(loc, { pause: 300 }); const t = now(); await page.keyboard.type(texte, { delay: delai }); evts.push({ k: 'type', t, t1: now() }) }
    const ecartVisite = async () => { const b = page.getByRole('button', { name: /Plus tard|Passer|Fermer la visite/ }); if (await b.count()) { await b.first().click().catch(() => {}); await sec(300) } }
    const ouvrir = async (route, attente) => {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
      await ecartVisite()
      if (attente) await page.waitForSelector(attente, { timeout: 30000 })
    }
    const demarrer = () => { depart(); marque.depart = (Date.now() - t0) / 1000 }
    try {
      await sc({ page, etape, glisser, marquer, sec, cliquer, survoler, saisir, ouvrir, demarrer, ecartVisite, BASE, v })
          const reste = MIN_ETAPE - (Date.now() - dernier); if (dernier && reste > 0) await sec(reste)
    } catch (e) { await page.screenshot({ path: path.join(SORTIE, `_echec-${v.id}.png`) }).catch(() => {}); throw e // l'écran au moment de l'échec, pour comprendre
    } finally { enCours = false; depart(); await boucle; await ctx.close() }

    const liste = images.map((im, i) => `file '${im.f}'\nduration ${(((images[i + 1]?.t ?? im.t + 60) - im.t) / 1000).toFixed(3)}`).join('\n') + `\nfile '${images[images.length - 1].f}'\n`
    fs.writeFileSync(path.join(dir, 'liste.txt'), liste)
    const out = path.join(SORTIE, `${v.id}.mp4`)
    const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'liste.txt'), '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', out], { encoding: 'utf8' })
    if (r.status !== 0) throw new Error('ffmpeg : ' + (r.stderr || '').slice(0, 300))
    const debut = (images[0].t - t0) / 1000 // la vidéo brute commence à la première image : tous les instants du journal se lisent moins `debut`
    fs.writeFileSync(path.join(SORTIE, `${v.id}.marques.json`), JSON.stringify({ ...marque, debut, dpr: DPR, _images: images.length, _etapes: v.etapes }))
    fs.writeFileSync(path.join(SORTIE, `${v.id}.evenements.json`), JSON.stringify({ debut, dpr: DPR, ecran: { w: 1440, h: 900 }, evts }))
    fs.rmSync(dir, { recursive: true, force: true })
    log(`🎬 ${v.id}.mp4 — ${((Date.now() - t0) / 1000).toFixed(1)} s, ${images.length} images ; marques ${JSON.stringify(marque)}`)
  }
} finally {
  try { if (nav) await nav.close() } catch {}
  await nettoyer()
}
