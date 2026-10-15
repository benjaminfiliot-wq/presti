// Vidéos du centre d'aide : une VRAIE capture de l'interface par fonctionnalité du menu (lib/aide-videos.json).
//
// Même méthode que scripts/demo-gestion-videos.mjs (captures en rafale du vrai écran, rassemblées par ffmpeg avec leur durée
// réelle). Les sous-titres sont incrustés DANS la page (bandeau en bas, pointer-events: none) : ce sont les textes de
// `etapes` du JSON, ceux-là mêmes que le centre d'aide affiche en HTML sous la vidéo.
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

// ── Sous-titres incrustés dans la page ───────────────────────────────────────────────────────────
// Un bandeau fixe en bas, sans événement souris. Il survit aux navigations (sessionStorage + script d'initialisation).
const SCRIPT_BANDEAU = () => {
  const monter = () => {
    if (document.getElementById('aide-sous-titre')) return
    const s = document.createElement('style')
    s.textContent = '#aide-sous-titre{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:2147483647;pointer-events:none;display:none;align-items:center;gap:14px;max-width:min(1180px,calc(100vw - 48px));padding:14px 22px 14px 14px;border-radius:16px;background:rgba(10,12,17,.94);border:1px solid rgba(255,255,255,.14);box-shadow:0 12px 40px rgba(0,0,0,.5);color:#EDEFF4;font:600 25px/1.3 "Segoe UI",system-ui,sans-serif;letter-spacing:.005em}#aide-sous-titre b{flex:none;min-width:40px;height:40px;border-radius:12px;background:#D97757;color:#1a0f0a;display:grid;place-items:center;font:800 20px/1 "Segoe UI",system-ui,sans-serif}'
    const d = document.createElement('div'); d.id = 'aide-sous-titre'; d.innerHTML = '<b></b><span></span>'
    ;(document.head || document.documentElement).appendChild(s); document.documentElement.appendChild(d)
    const v = sessionStorage.getItem('aide-sous-titre'); if (v) afficher(JSON.parse(v))
  }
  function afficher(o) {
    const d = document.getElementById('aide-sous-titre'); if (!d) return
    if (!o) { d.style.display = 'none'; return }
    d.querySelector('b').textContent = o.n; d.querySelector('span').textContent = o.t; d.style.display = 'flex'
  }
  window.__sousTitre = (o) => { if (o) sessionStorage.setItem('aide-sous-titre', JSON.stringify(o)); else sessionStorage.removeItem('aide-sous-titre'); afficher(o) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monter); else monter()
  new MutationObserver(monter).observe(document, { childList: true })
}

try {
  await semer()
  nav = await chromium.launch() // sans GL logiciel forcé : les captures en rafale y sont bien plus rapides

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

  const nouvellePage = async (ctx) => { const p = await ctx.newPage(); await p.addInitScript(SCRIPT_BANDEAU); return p }

  if (CIBLE === 'explorer') {
    fs.mkdirSync(SCRATCH, { recursive: true })
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR', storageState: etat })
    const p = await nouvellePage(ctx)
    const routes = process.argv[3] ? process.argv[3].split(',') : VIDEOS.map((v) => v.route)
    for (const r of routes) {
      await p.goto(`${BASE}${r}`, { waitUntil: 'networkidle' }).catch(() => {})
      await p.waitForTimeout(1500)
      if (process.argv[4]) { for (const c of process.argv[4].split('|')) { await p.getByText(c, { exact: false }).first().click().catch((e) => log('clic raté ' + c)); await p.waitForTimeout(2500) } }
      const nom = r.replace(/[^a-z0-9]+/gi, '_') + (process.argv[4] ? '_' + process.argv[4].replace(/[^a-z0-9]+/gi, '_') : '')
      await p.screenshot({ path: path.join(SCRATCH, `${nom}.png`) })
      const btns = await p.evaluate(() => [...document.querySelectorAll('button, a, input, textarea, select, [role=tab]')].filter((e) => !e.closest('aside, nav') && e.offsetParent !== null).map((e) => `${e.tagName.toLowerCase()}${e.getAttribute('role') ? '[' + e.getAttribute('role') + ']' : ''} "${(e.getAttribute('aria-label') || e.textContent || e.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 60)}"${e.href ? ' → ' + e.getAttribute('href') : ''}`))
      fs.writeFileSync(path.join(SCRATCH, `${nom}.txt`), `${p.url()}\n` + btns.join('\n'))
      log(`${r} → ${p.url()} (${btns.length} éléments)`)
    }
    await ctx.close()
  } else {
    const v = VIDEOS.find((x) => x.id === CIBLE)
    if (!v) throw new Error(`vidéo inconnue : ${CIBLE}`)
    const scenarios = (await import('./aide-videos-scenarios.mjs')).default
    const sc = scenarios[v.id]
    if (!sc) throw new Error(`pas de scénario pour ${v.id}`)
    const dir = path.join(SORTIE, `_${v.id}-images`)
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR', storageState: etat })
    const page = await nouvellePage(ctx)
    page.setDefaultTimeout(12000)
    const t0 = Date.now(); const marque = {}; const images = []
    let enCours = true; let depart = null
    const pret = new Promise((r) => { depart = r })
    const boucle = (async () => {
      await pret // pas de capture pendant le chargement initial : elle resterait bloquée
      while (enCours) {
        const t = Date.now()
        try { const buf = await page.screenshot({ type: 'jpeg', quality: 86, timeout: 2500 }); const f = `f${String(images.length).padStart(5, '0')}.jpg`; fs.writeFileSync(path.join(dir, f), buf); images.push({ f, t }) } catch { await page.waitForTimeout(150) }
        await page.waitForTimeout(Math.max(0, 60 - (Date.now() - t)))
      }
    })()
    // Outils pour les scénarios
    const sec = (ms) => page.waitForTimeout(ms)
    // Chaque sous-titre reste au moins 6,5 s à l'écran (le temps de le lire) : le scénario n'a pas à compter ses pauses.
    let dernier = 0
    const MIN_ETAPE = 6500
    const etape = async (i) => { const reste = MIN_ETAPE - (Date.now() - dernier); if (dernier && reste > 0) await sec(reste); dernier = Date.now(); await page.evaluate((o) => window.__sousTitre && window.__sousTitre(o), { n: String(i + 1), t: v.etapes[i] }); marque[`etape${i + 1}`] = (Date.now() - t0) / 1000 }
    const sansTitre = async () => { await page.evaluate(() => window.__sousTitre && window.__sousTitre(null)) }
    const marquer = (k) => { marque[k] = (Date.now() - t0) / 1000 }
    // Le curseur (invisible en capture) est matérialisé par un point corail qui suit la souris : on voit ce qu'on clique.
    await page.addInitScript(() => {
      const poser = () => {
        if (document.getElementById('aide-curseur')) return
        const c = document.createElement('div'); c.id = 'aide-curseur'
        c.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(217,119,87,.55);border:2px solid #fff;box-shadow:0 0 0 4px rgba(217,119,87,.25);z-index:2147483646;pointer-events:none;transition:transform .08s linear;display:none'
        document.documentElement.appendChild(c)
        window.addEventListener('mousemove', (e) => { c.style.display = 'block'; c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px' }, true)
        window.addEventListener('mousedown', () => { c.style.transform = 'scale(.7)' }, true)
        window.addEventListener('mouseup', () => { c.style.transform = 'scale(1)' }, true)
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poser); else poser()
    })
    // Souris « humaine » : glisse vers l'élément (steps) puis clique.
    const cliquer = async (loc, { pause = 500 } = {}) => {
      await loc.scrollIntoViewIfNeeded().catch(() => {})
      const b = await loc.boundingBox(); if (!b) throw new Error('élément sans boîte : ' + loc)
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 14 })
      await sec(pause)
      await loc.click()
    }
    const survoler = async (loc, { pause = 700 } = {}) => {
      await loc.scrollIntoViewIfNeeded().catch(() => {})
      const b = await loc.boundingBox(); if (!b) return
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 14 }); await sec(pause)
    }
    const saisir = async (loc, texte, delai = 45) => { await cliquer(loc, { pause: 300 }); await page.keyboard.type(texte, { delay: delai }) }
    const ecartVisite = async () => { const b = page.getByRole('button', { name: /Plus tard|Passer|Fermer la visite/ }); if (await b.count()) { await b.first().click().catch(() => {}); await sec(300) } }
    const ouvrir = async (route, attente) => {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
      await ecartVisite()
      if (attente) await page.waitForSelector(attente, { timeout: 30000 })
    }
    const demarrer = () => { depart(); marque.depart = (Date.now() - t0) / 1000 }
    try {
      await sc({ page, etape, sansTitre, marquer, sec, cliquer, survoler, saisir, ouvrir, demarrer, ecartVisite, BASE, v })
          const reste = MIN_ETAPE - (Date.now() - dernier); if (dernier && reste > 0) await sec(reste)
    } finally { enCours = false; depart(); await boucle; await ctx.close() }

    const liste = images.map((im, i) => `file '${im.f}'\nduration ${(((images[i + 1]?.t ?? im.t + 60) - im.t) / 1000).toFixed(3)}`).join('\n') + `\nfile '${images[images.length - 1].f}'\n`
    fs.writeFileSync(path.join(dir, 'liste.txt'), liste)
    const out = path.join(SORTIE, `${v.id}.mp4`)
    const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'liste.txt'), '-vf', 'fps=25,format=yuv420p', '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', out], { encoding: 'utf8' })
    if (r.status !== 0) throw new Error('ffmpeg : ' + (r.stderr || '').slice(0, 300))
    fs.writeFileSync(path.join(SORTIE, `${v.id}.marques.json`), JSON.stringify({ ...marque, _images: images.length, _etapes: v.etapes }))
    fs.rmSync(dir, { recursive: true, force: true })
    log(`🎬 ${v.id}.mp4 — ${((Date.now() - t0) / 1000).toFixed(1)} s, ${images.length} images ; marques ${JSON.stringify(marque)}`)
  }
} finally {
  try { if (nav) await nav.close() } catch {}
  await nettoyer()
}
