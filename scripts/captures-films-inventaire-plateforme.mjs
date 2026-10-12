// Captures des VRAIS écrans Inventaire et Plateforme, pour les films de présentation (12/10).
//
// Même méthode que `captures-console.mjs` : le compte de démonstration `atelier-du-chene`
// (menuisier, offre Signature), mot de passe renouvelé et réécrit dans `.demo-compte.local`.
// On pose le temps de la photo des données de DÉMONSTRATION (fournisseurs, matériaux, stock,
// mouvements, prix vus, quelques demandes de clients fictifs avec une réponse préparée), on
// photographie les écrans tels que le produit les affiche, puis TOUT ce qui a été posé est
// supprimé dans un `finally`, même si une capture échoue. Coût IA : zéro (aucune génération).
//
//   node scripts/captures-films-inventaire-plateforme.mjs
// Sortie : videos/captures-1012/*.png (bureau 1440×900 ×2, téléphone 390×844 ×3)

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { codeEmailSiDemande } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const OUT = path.join(process.cwd(), 'videos', 'captures-1012')
fs.mkdirSync(OUT, { recursive: true })
const compte = Object.fromEntries(fs.readFileSync('.demo-compte.local', 'utf8').split(/\r?\n/).filter(Boolean).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
const email = compte.email
const mdp = crypto.randomBytes(18).toString('base64url')
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const log = (s) => console.log(s)
const jours = (n) => new Date(Date.now() - n * 864e5).toISOString()

// Tout ce qui est posé est noté ici, pour le ménage.
const pose = { fournisseurs: [], materiaux: [], leads: [] }
let navigateur = null

// ── Les données de démonstration (fictives) ────────────────────────────────────────────────────
const FOURNISSEURS = [
  { nom: 'Négoce Martin', type: 'negoce', remise_pct: 12, delai_jours: 2, agence: 'Rochefort', numero_compte: 'C-0418', ordre: 0 },
  { nom: 'Comptoir Ouest', type: 'negoce', remise_pct: 8, delai_jours: 1, agence: 'La Rochelle', ordre: 1 },
]
const MATERIAUX = [
  { nom: 'Charnière invisible 35 mm', categorie: 'Quincaillerie', unite: 'u', code_barres: '3760112450357', seuil_alerte: 10, prix_dernier_ht: 2.38, stock: { atelier: 14, camion: 4 } },
  { nom: 'Vis inox 5×50 (boîte de 200)', categorie: 'Quincaillerie', unite: 'boîte', seuil_alerte: 4, prix_dernier_ht: 18.9, stock: { atelier: 6, camion: 2 } },
  { nom: 'Panneau contreplaqué chêne 19 mm', categorie: 'Panneaux', unite: 'u', seuil_alerte: 5, prix_dernier_ht: 64.5, stock: { atelier: 9 } },
  { nom: 'Tasseau sapin 27×40 (2,40 m)', categorie: 'Bois', unite: 'u', seuil_alerte: 20, prix_dernier_ht: 3.2, stock: { atelier: 32, camion: 6 } },
  { nom: 'Colle vinylique D3 (5 kg)', categorie: 'Colles', unite: 'u', seuil_alerte: 2, prix_dernier_ht: 27.4, stock: { atelier: 1 } },
  { nom: 'Coulisse de tiroir 450 mm', categorie: 'Quincaillerie', unite: 'paire', seuil_alerte: 6, prix_dernier_ht: 11.6, stock: { atelier: 2 } },
  { nom: 'Lasure chêne clair 2,5 L', categorie: 'Finitions', unite: 'u', seuil_alerte: 2, prix_dernier_ht: 38.0, stock: { atelier: 3 } },
  { nom: 'Cheville nylon 8 mm (boîte de 100)', categorie: 'Quincaillerie', unite: 'boîte', seuil_alerte: 3, prix_dernier_ht: 6.9, stock: { atelier: 5, camion: 3 } },
]
const DEMANDES = [
  ['Mme Robin', 'Bonjour, je voudrais faire poser une porte d’entrée en chêne, vous pouvez passer pour un devis ?',
    'Bonjour Madame Robin, merci pour votre message. Pour une porte d’entrée, le mieux est que je passe prendre les mesures. Quelles sont vos disponibilités cette semaine ?'],
  ['M. Petit', 'Un placard sous l’escalier, sur mesure, c’est possible ?',
    'Bonjour Monsieur Petit, oui, c’est tout à fait possible. Pourriez-vous m’envoyer une photo de l’emplacement et ses dimensions approximatives ? Je vous propose ensuite une visite.'],
  ['Mme Morel', 'Deux fenêtres qui ferment mal à La Rochelle, vous intervenez ?',
    'Bonjour Madame Morel, j’interviens bien à La Rochelle. Les fenêtres sont-elles en bois ou en PVC ? Je peux passer voir le réglage rapidement.'],
  ['M. Faure', 'Une terrasse en bois de 20 m², quels délais ?',
    'Bonjour Monsieur Faure, merci pour votre demande. Pour chiffrer une terrasse juste, une courte visite est utile. Quand êtes-vous disponible ?'],
  ['Mme Blanc', 'Escalier qui grince, besoin d’un menuisier',
    'Bonjour Madame Blanc, un escalier qui grince se règle souvent bien. Pouvez-vous me dire s’il est en chêne ou en sapin, et me laisser vos disponibilités ?'],
  ['M. Roux', 'Une bibliothèque murale dans le salon',
    'Bonjour Monsieur Roux, avec plaisir. Quelle est la longueur du mur ? Je vous propose de passer prendre les mesures cette semaine.'],
]

try {
  const { data: artisan } = await admin.from('artisans').select('id, nom').eq('slug', 'atelier-du-chene').single()
  const AID = artisan.id
  log(`compte de démonstration : ${artisan.nom}`)
  const { error: eMdp } = await admin.auth.admin.updateUserById(AID, { password: mdp })
  if (eMdp) throw new Error(`mot de passe non renouvelé : ${eMdp.message}`)
  fs.writeFileSync('.demo-compte.local', `email=${email}\nmot_de_passe=${mdp}\nslug=atelier-du-chene\n`, 'utf8')

  const { data: devis } = await admin.from('devis').select('id, numero').eq('artisan_id', AID).order('created_at', { ascending: false }).limit(1).single()

  // Fournisseurs
  const { data: fs1, error: eF } = await admin.from('fournisseurs').insert(FOURNISSEURS.map((f) => ({ ...f, artisan_id: AID }))).select('id, nom')
  if (eF) throw new Error(`fournisseurs : ${eF.message}`)
  pose.fournisseurs = fs1.map((f) => f.id)
  const fMartin = fs1.find((f) => f.nom === 'Négoce Martin')

  // Matériaux, stock par lieu, mouvements, prix vus
  for (const m of MATERIAUX) {
    const { stock, ...champs } = m
    const { data: mat, error: eM } = await admin.from('materiaux').insert({ ...champs, artisan_id: AID, fournisseur_prefere: 'Négoce Martin' }).select('id').single()
    if (eM) throw new Error(`matériau ${m.nom} : ${eM.message}`)
    pose.materiaux.push(mat.id)
    for (const [lieu, q] of Object.entries(stock)) {
      const { error: eS } = await admin.from('stock').insert({ materiau_id: mat.id, lieu, quantite: q })
      if (eS) throw new Error(`stock : ${eS.message}`)
    }
    if (m.code_barres) {
      await admin.from('mouvements_stock').insert({ artisan_id: AID, materiau_id: mat.id, type: 'entree', quantite: 4, lieu: 'atelier', source: 'scan', cout_unitaire_ht: m.prix_dernier_ht, note: 'Livraison Négoce Martin', cree_le: jours(0.1) })
      await admin.from('prix_observations').insert([
        { artisan_id: AID, materiau_id: mat.id, fournisseur_id: fMartin.id, fournisseur_nom: 'Négoce Martin', designation_vue: m.nom, prix_ht: 2.38, unite: 'u', source: 'saisie', extrait: 'Prix relevé sur le bon de livraison', vu_le: jours(1) },
        { artisan_id: AID, materiau_id: mat.id, fournisseur_nom: 'Comptoir Ouest', designation_vue: m.nom, prix_ht: 2.61, unite: 'u', source: 'saisie', extrait: 'Prix relevé au comptoir', vu_le: jours(2) },
      ])
    }
    if (m.nom.startsWith('Panneau') && devis) await admin.from('mouvements_stock').insert({ artisan_id: AID, materiau_id: mat.id, type: 'sortie', quantite: 2, lieu: 'atelier', devis_id: devis.id, source: 'manuel', note: 'Chantier Dubois', cree_le: jours(0.3) })
    if (m.nom.startsWith('Tasseau') && devis) await admin.from('mouvements_stock').insert({ artisan_id: AID, materiau_id: mat.id, type: 'sortie', quantite: 6, lieu: 'camion', devis_id: devis.id, source: 'manuel', note: 'Chantier Dubois', cree_le: jours(0.2) })
  }
  log(`posé : ${pose.fournisseurs.length} fournisseurs, ${pose.materiaux.length} matériaux`)

  // Demandes de clients fictifs, chacune avec la réponse préparée à valider
  for (const [i, [nom, msg, rep]] of DEMANDES.entries()) {
    const { data: lead, error: eL } = await admin.from('leads').insert({
      artisan_id: AID, nom_prospect: nom, contact: `demo-film-${i}@presti-test.invalid`, canal: 'plateforme', message: msg,
      statut: 'nouveau', token: crypto.randomUUID(), urgence: 'normal', type_chantier: 'Menuiserie', created_at: jours(i * 0.04),
    }).select('id').single()
    if (eL) throw new Error(`demande ${nom} : ${eL.message}`)
    pose.leads.push(lead.id)
    await admin.from('messages').insert([
      { lead_id: lead.id, sens: 'in', type: 'manuel', contenu: msg, sent_at: jours(i * 0.04) },
      { lead_id: lead.id, sens: 'out', type: 'reponse_auto', contenu: rep, etat: 'proposition', modele: 'standard', sent_at: jours(i * 0.04 - 0.001) },
    ])
  }
  log(`posé : ${pose.leads.length} demandes avec réponse préparée`)

  // ── Les captures ──────────────────────────────────────────────────────────────────────────
  navigateur = await chromium.launch()
  const bureau = await navigateur.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  await bureau.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await bureau.fill('#email-connexion', email)
  await bureau.fill('#mdp-connexion', mdp)
  await bureau.click('form button[type="submit"], form button:not([type="button"])')
  await codeEmailSiDemande(bureau, email)
  try { await bureau.waitForURL(/\/(outils|dashboard|plateforme|devis)/, { timeout: 25000 }) } catch {
    const vu = await bureau.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300))
    throw new Error(`connexion bloquée · ${bureau.url()} · ${vu}`)
  }
  const plusTard = async (p) => { const b = p.getByRole('button', { name: /Plus tard/ }); if (await b.count()) { await b.first().click(); await p.waitForTimeout(400) } }
  const shot = async (p, nom) => {
    const f = path.join(OUT, `${nom}.png`)
    await p.screenshot({ path: f })
    const ko = fs.statSync(f).size / 1024
    if (ko < 20) throw new Error(`capture ${nom} suspecte (${ko.toFixed(0)} Ko)`)
    log(`📸 ${nom} — ${ko.toFixed(0)} Ko`)
  }
  const aller = async (p, url, attente = 1500) => { await p.goto(`${BASE}${url}`, { waitUntil: 'networkidle' }); await plusTard(p); await p.waitForTimeout(attente) }

  await aller(bureau, '/inventaire', 2200)
  await shot(bureau, 'inventaire-liste')
  const ligne = bureau.getByText('Charnière invisible 35 mm').first()
  if (await ligne.count()) {
    await ligne.click(); await bureau.waitForTimeout(1800); await shot(bureau, 'inventaire-fiche')
    // Le bas de la fiche : prix vus (source, date) et historique des mouvements
    await bureau.evaluate(() => {
      const zones = [...document.querySelectorAll('aside, [role="dialog"], .panneau, [class*="anneau"], [class*="fiche"]')]
      const z = zones.find((e) => e.scrollHeight > e.clientHeight + 40) || document.scrollingElement
      z.scrollTop = z.scrollHeight
    })
    await bureau.waitForTimeout(1200); await shot(bureau, 'inventaire-fiche-bas')
  }
  // La fiche d'un article sorti pour le chantier (historique : sortie rattachée au devis)
  await aller(bureau, '/inventaire', 1800)
  const ligneP = bureau.getByText('Panneau contreplaqué chêne 19 mm').first()
  if (await ligneP.count()) {
    await ligneP.click(); await bureau.waitForTimeout(1800)
    await bureau.evaluate(() => {
      const zones = [...document.querySelectorAll('aside, [role="dialog"], .panneau, [class*="anneau"], [class*="fiche"]')]
      const z = zones.find((e) => e.scrollHeight > e.clientHeight + 40) || document.scrollingElement
      z.scrollTop = z.scrollHeight
    })
    await bureau.waitForTimeout(1200); await shot(bureau, 'inventaire-fiche-sortie-chantier')
  }
  await aller(bureau, '/inventaire/fournisseurs', 1800)
  await shot(bureau, 'inventaire-fournisseurs')
  await aller(bureau, '/inventaire/recherche', 1500)
  await shot(bureau, 'inventaire-recherche')

  await aller(bureau, '/plateforme', 2000)
  await shot(bureau, 'plateforme-conversations')
  const conv = bureau.getByText('Mme Robin').first()
  if (await conv.count()) { await conv.click(); await bureau.waitForTimeout(1800); await shot(bureau, 'plateforme-conversation-robin') }
  for (const v of ['reglages', 'apparence', 'automatisations']) { await aller(bureau, `/plateforme?volet=${v}`, 1800); await shot(bureau, `plateforme-${v}`) }

  // La page publique, telle que le client la voit sur son téléphone (marque blanche)
  const tel = await navigateur.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  await tel.goto(`${BASE}/p/atelier-du-chene`, { waitUntil: 'networkidle' }); await tel.waitForTimeout(1800)
  await shot(tel, 'p-accueil-telephone')
  // La conversation réelle du 04/09 (Claire Dubois, devis accepté), ouverte comme le ferait son navigateur
  const { data: claire } = await admin.from('leads').select('token').eq('artisan_id', AID).eq('nom_prospect', 'Claire Dubois').maybeSingle()
  if (claire?.token) {
    await tel.evaluate((t) => localStorage.setItem('conv-atelier-du-chene', JSON.stringify([{ token: t, titre: 'Ma demande', ts: Date.now() }])), claire.token)
    await tel.reload({ waitUntil: 'networkidle' }); await tel.waitForTimeout(2200)
    await shot(tel, 'p-conversation-telephone')
  }
  log(`\n✓ captures dans ${path.relative(process.cwd(), OUT)}`)
} finally {
  // Le ménage n'est pas conditionnel : aucune donnée de démonstration ne reste en production.
  try {
    for (const id of pose.leads) { await admin.from('messages').delete().eq('lead_id', id); await admin.from('leads').delete().eq('id', id) }
    if (pose.materiaux.length) {
      await admin.from('prix_observations').delete().in('materiau_id', pose.materiaux)
      await admin.from('mouvements_stock').delete().in('materiau_id', pose.materiaux)
      await admin.from('stock').delete().in('materiau_id', pose.materiaux)
      await admin.from('materiaux').delete().in('id', pose.materiaux)
    }
    if (pose.fournisseurs.length) await admin.from('fournisseurs').delete().in('id', pose.fournisseurs)
    const restes = await Promise.all([
      admin.from('materiaux').select('id', { count: 'exact', head: true }).in('id', pose.materiaux.length ? pose.materiaux : ['00000000-0000-0000-0000-000000000000']),
      admin.from('leads').select('id', { count: 'exact', head: true }).in('id', pose.leads.length ? pose.leads : ['00000000-0000-0000-0000-000000000000']),
      admin.from('fournisseurs').select('id', { count: 'exact', head: true }).in('id', pose.fournisseurs.length ? pose.fournisseurs : ['00000000-0000-0000-0000-000000000000']),
    ])
    log(`🧹 ménage : restes matériaux ${restes[0].count}, demandes ${restes[1].count}, fournisseurs ${restes[2].count}`)
  } catch (e) { log(`⚠️ ménage incomplet : ${e.message}`) }
  if (navigateur) await navigateur.close()
  process.exitCode = process.exitCode ?? 0
}
