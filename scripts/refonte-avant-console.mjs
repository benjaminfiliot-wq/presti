#!/usr/bin/env node
// scripts/refonte-avant-console.mjs — chantier « Refonte 18/10 », étape 1 (audit) : l'état « AVANT » de la console de l'artisan,
// photographié sur la PRODUCTION (qg.prestiapp.fr), page par page, en 1440 et 390 px.
//
// Deux comptes de TEST jetables (adresses *.invalid, motif reconnu par scripts/zero-demo-e2e.mjs) :
//   - « rempli » : carreleur fictif « Atelier Exemple », offre Signature, données d'EXEMPLE fictives (demandes, devis, factures,
//     inventaire, chantiers). Visites guidées marquées vues : la capture montre l'écran utile.
//   - « vide »   : même offre, AUCUNE donnée, visite NON vue : il montre les états vides et la visite guidée de la 1re connexion.
// Les deux sont DÉTRUITS dans le `finally`, quoi qu'il arrive, et la base est relue pour le prouver.
// Aucun e-mail réel (adresses *.invalid), aucun envoi (on ne clique sur aucun bouton d'action), aucun appel IA.
//
// Mesures par page : titre, entrées de menu, boutons et liens visibles (pour compter les clics des 6 tâches), squelettes ou
// textes « Chargement » au tout premier instant, contrastes WCAG calculés (même méthode que refonte-avant-landing.mjs),
// défilement de côté sur téléphone.
//
// Usage : node scripts/refonte-avant-console.mjs [dossier]   (défaut : ../presti-ops/refonte-1018/avant)
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
const BASE = (process.env.TEST_BASE || 'https://qg.prestiapp.fr').replace(/\/$/, '')
const DOSSIER = path.resolve(process.argv[2] || path.join(process.cwd(), '..', 'presti-ops', 'refonte-1018', 'avant'))
const SORTIE = path.join(DOSSIER, 'console')
fs.mkdirSync(SORTIE, { recursive: true })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const log = (s) => console.log(s)
const stamp = Date.now()
const jours = (n) => new Date(Date.now() - n * 864e5).toISOString()
const jour = (n) => jours(n).slice(0, 10)
const comptes = [] // { uid, email, mdp, role }

async function ins(table, rows, select = 'id') {
  const r = await admin.from(table).insert(rows).select(select)
  if (r.error) throw new Error(`${table} : ${r.error.message}`)
  return r.data
}

async function creerCompte(role) {
  const email = `refonte-${role}-${stamp}@presti-test.invalid`
  const mdp = crypto.randomBytes(18).toString('base64url')
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
  if (error) throw new Error('compte : ' + error.message)
  const c = { uid: u.user.id, email, mdp, role }
  comptes.push(c) // AVANT toute autre écriture : le finally le retrouvera
  const up = await admin.from('artisans').upsert({
    id: c.uid, email, nom: role === 'rempli' ? 'Atelier Exemple' : 'Atelier Vide (exemple)', metier: 'Carreleur', slug: `atelier-exemple-${role}-${String(stamp).slice(-5)}`, plan: 'signature', credits: 600,
    ville: 'Exempleville', zone_intervention: 'Exempleville et alentours', tel_public: '05 00 00 00 00', email_public: null, site_seo: false,
    bio: 'Compte d’exemple pour les captures de la refonte.', services: [{ nom: 'Carrelage de sol' }, { nom: 'Salles de bain' }],
    ton_style: 'Bonjour ! Merci pour votre message. Je regarde ça et je reviens vers vous rapidement.',
    plateforme_active: true, reponse_auto: false, site_active: false, theme: 'atelier', accent: '#8a5a2b',
    forme_juridique: 'EI', siret: '12345678900012', adresse: '1 rue de l’Exemple', code_postal: '00000',
    assurance_nom: 'Assureur Exemple', assurance_contrat: 'EXEMPLE-2026', tva_regime: 'reel', tva_num: 'FR00123456789',
    realisations: [],
    aide_vues: role === 'rempli' ? ['visite:console', 'visite:crm', 'visite:assistant'] : [],
  })
  if (up.error) throw new Error('artisan : ' + up.error.message)
  await admin.from('plateforme_config').upsert({ artisan_id: c.uid, mode_reponse: 'assistee', modele: 'pro', ton: 'chaleureux', nom_assistant: 'L’atelier' }, { onConflict: 'artisan_id' })
  return c
}

/** Données d'EXEMPLE (fictives) du compte rempli. Les noms de clients sont des personnages, marqués « (exemple) ». */
async function semer(uid) {
  const TARIFS = [['Fourniture carrelage grès cérame 60x60', 'm²', 32, 10], ['Pose de carrelage au sol', 'm²', 45, 10], ['Ragréage autolissant', 'm²', 9, 10], ['Dépose de l’ancien carrelage', 'm²', 18, 10], ['Faïence murale', 'm²', 52, 10]]
  await ins('prix_artisan', TARIFS.map(([designation, unite, prix_ht, tva_taux]) => ({ artisan_id: uid, designation, unite, prix_ht, tva_taux, source: 'saisie' })))
  await ins('clients', [
    { artisan_id: uid, nom: 'Mme Exemple-Martin', email: 'martin@presti-test.invalid', tel: '06 00 00 00 01', adresse: '1 rue de l’Exemple', code_postal: '00000', ville: 'Exempleville' },
    { artisan_id: uid, nom: 'M. Exemple-Garnier', email: 'garnier@presti-test.invalid', tel: '06 00 00 00 02', adresse: '2 rue de l’Exemple', code_postal: '00000', ville: 'Exempleville' },
    { artisan_id: uid, nom: 'Mme Exemple-Lefèvre', email: 'lefevre@presti-test.invalid', tel: '06 00 00 00 03', adresse: '3 rue de l’Exemple', code_postal: '00000', ville: 'Exempleville' },
  ])
  const DEMANDES = [
    ['Mme Exemple-Robin', 'Bonjour, je voudrais refaire le carrelage de ma cuisine (14 m²). Vous pouvez passer pour un devis ?', 'Bonjour Madame, merci pour votre message. Pour un sol de cuisine, le mieux est que je passe prendre les mesures. Quelles sont vos disponibilités cette semaine ?', 'nouveau', 0.05],
    ['M. Exemple-Petit', 'Salle de bain à refaire : douche à l’italienne et faïence murale, c’est possible en juin ?', 'Bonjour Monsieur, oui, c’est tout à fait possible. Pourriez-vous m’envoyer une photo de la pièce et ses dimensions approximatives ?', 'nouveau', 0.2],
    ['Mme Exemple-Morel', 'Une terrasse de 20 m² à carreler, quels délais ?', 'Bonjour Madame, pour chiffrer juste, une courte visite est utile. Quand êtes-vous disponible ?', 'en_discussion', 1.1],
    ['M. Exemple-Faure', 'Des carreaux qui se décollent dans l’entrée, vous réparez ?', 'Bonjour Monsieur, oui, je peux regarder. Les carreaux sont-ils sur toute l’entrée ou seulement quelques-uns ?', 'en_discussion', 2.3],
    ['Mme Exemple-Blanc', 'Merci pour le devis, je valide pour la salle de bain !', null, 'gagne', 4.2],
  ]
  for (const [nom, msg, rep, statut, age] of DEMANDES) {
    const [lead] = await ins('leads', { artisan_id: uid, nom_prospect: nom, contact: `${nom.toLowerCase().replace(/[^a-z]+/g, '.')}@exemple.invalid`, canal: 'plateforme', message: msg, statut, token: crypto.randomUUID(), urgence: 'normal', type_chantier: 'Carrelage', created_at: jours(age), lu_le: statut === 'nouveau' ? null : jours(age) })
    const msgs = [{ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: msg, sent_at: jours(age) }]
    if (rep) msgs.push({ lead_id: lead.id, sens: 'out', type: 'reponse_auto', contenu: rep, etat: statut === 'nouveau' ? 'proposition' : null, modele: 'pro', sent_at: jours(age - 0.001) })
    await ins('messages', msgs)
  }
  const ligne = (designation, quantite, unite, pu) => ({ designation, quantite, unite, prix_unitaire_ht: pu, tva_taux: 10 })
  const DEVIS = [
    ['DEV-2026-0007', 'Carrelage cuisine 14 m²', 0, 'brouillon', 'Mme Exemple-Robin', [ligne('Dépose de l’ancien carrelage', 14, 'm²', 18), ligne('Pose de carrelage au sol', 14, 'm²', 45), ligne('Fourniture carrelage grès cérame 60x60', 14, 'm²', 32)]],
    ['DEV-2026-0006', 'Salle de bain complète', 9, 'envoye', 'M. Exemple-Garnier', [ligne('Pose de carrelage au sol', 6, 'm²', 45), ligne('Faïence murale', 18, 'm²', 52), ligne('Étanchéité de douche', 1, 'u', 280)]],
    ['DEV-2026-0005', 'Terrasse 20 m²', 12, 'accepte', 'Mme Exemple-Lefèvre', [ligne('Pose de carrelage extérieur', 20, 'm²', 58), ligne('Plinthes carrelées', 18, 'ml', 8)]],
    ['DEV-2026-0004', 'Entrée : réparation du sol', 20, 'accepte', 'Mme Exemple-Martin', [ligne('Dépose de l’ancien carrelage', 5, 'm²', 18), ligne('Pose de carrelage au sol', 5, 'm²', 45)]],
    ['DEV-2026-0003', 'Faïence cuisine', 40, 'refuse', 'M. Exemple-Faure', [ligne('Faïence murale', 6, 'm²', 52)]],
  ]
  const devisIds = {}
  for (const [numero, objet, age, statut, client, lignes] of DEVIS) {
    const ht = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire_ht, 0)
    const c = (await admin.from('clients').select('id').eq('artisan_id', uid).eq('nom', client).maybeSingle()).data
    const [d] = await ins('devis', { artisan_id: uid, client_id: c?.id ?? null, numero, objet, statut, date_emission: jour(age), validite_jours: 30, client_nom: client, client_email: 'client@presti-test.invalid', total_ht: ht, total_tva: Math.round(ht * 10) / 100, total_ttc: Math.round(ht * 110) / 100, source: 'manuel', accepte_le: statut === 'accepte' ? jours(age - 2) : null, envoye_le: statut === 'brouillon' ? null : jours(age) })
    devisIds[statut] ??= d.id
    await ins('devis_lignes', lignes.map((l, i) => ({ devis_id: d.id, ordre: i, ...l })))
  }
  const FACTURES = [
    ['FAC-2026-0004', 'Terrasse 20 m² : acompte', 12, 'emise', 'Mme Exemple-Lefèvre', 612, 8, null],
    ['FAC-2026-0003', 'Faïence salle d’eau', 50, 'emise', 'M. Exemple-Petit', 980, -20, null],
    ['FAC-2026-0002', 'Entrée : réparation du sol', 25, 'payee', 'Mme Exemple-Martin', 345, -10, jour(15)],
    ['FAC-2026-0001', 'Salle de bain', 55, 'payee', 'Mme Exemple-Blanc', 2310, -30, jour(35)],
  ]
  for (const [numero, objet, age, statut, client, ttc, echeance, payee] of FACTURES) {
    const ht = Math.round(ttc / 1.1 * 100) / 100
    const [f] = await ins('factures', { artisan_id: uid, numero, objet, statut, date_emission: jour(age), date_echeance: jour(-echeance), client_nom: client, client_email: 'client@presti-test.invalid', total_ht: ht, total_tva: Math.round((ttc - ht) * 100) / 100, total_ttc: ttc, payee_le: payee, tva_regime: 'reel', categorie_operation: 'services' })
    await ins('factures_lignes', [{ facture_id: f.id, ordre: 0, designation: objet, quantite: 1, unite: 'u', prix_unitaire_ht: ht, tva_taux: 10 }])
  }
  const fo = await ins('fournisseurs', [
    { artisan_id: uid, nom: 'Négoce Exemple', type: 'negoce', remise_pct: 12, delai_jours: 2, agence: 'Exempleville', ordre: 0 },
    { artisan_id: uid, nom: 'Comptoir Exemple', type: 'negoce', remise_pct: 8, delai_jours: 1, agence: 'Exempleville', ordre: 1 },
  ])
  const MAT = [
    ['Carreau grès cérame 60x60 (m²)', 'Carrelage', 'm²', 8, 31.5, { atelier: 24, camion: 6 }],
    ['Colle à carrelage C2 (25 kg)', 'Colles', 'u', 5, 19.9, { atelier: 3 }],
    ['Joint gris perle (5 kg)', 'Joints', 'u', 4, 14.2, { atelier: 7 }],
    ['Croisillons 3 mm (sachet)', 'Accessoires', 'u', 6, 3.4, { atelier: 12, camion: 4 }],
    ['Ragréage autolissant (25 kg)', 'Préparation', 'u', 4, 22.8, { atelier: 2 }],
  ]
  for (const [nom, categorie, unite, seuil, prix, stock] of MAT) {
    const [m] = await ins('materiaux', { artisan_id: uid, nom, categorie, unite, seuil_alerte: seuil, prix_dernier_ht: prix, fournisseur_prefere: 'Négoce Exemple', fournisseur_id: fo[0].id })
    await ins('stock', Object.entries(stock).map(([lieu, quantite]) => ({ materiau_id: m.id, lieu, quantite })))
  }
  // Chantiers (CRM) : un en cours lié au devis accepté, un planifié, un à planifier.
  const ch = await ins('chantiers', [
    { artisan_id: uid, devis_id: devisIds.accepte, client_nom: 'Mme Exemple-Lefèvre', titre: 'Terrasse 20 m² (exemple)', ville: 'Exempleville', statut: 'en_cours', date_debut: jour(2), date_fin_prevue: jour(-3) },
    { artisan_id: uid, client_nom: 'M. Exemple-Garnier', titre: 'Salle de bain complète (exemple)', ville: 'Exempleville', statut: 'planifie', date_debut: jour(-6), date_fin_prevue: jour(-12) },
    { artisan_id: uid, client_nom: 'Mme Exemple-Robin', titre: 'Cuisine 14 m² (exemple)', ville: 'Exempleville', statut: 'a_planifier' },
  ])
  await ins('chantier_taches', [
    { artisan_id: uid, chantier_id: ch[0].id, libelle: 'Préparer le support', ordre: 0, faite: true, faite_le: jours(1) },
    { artisan_id: uid, chantier_id: ch[0].id, libelle: 'Poser le carrelage extérieur', ordre: 1, faite: false, faite_le: null },
    { artisan_id: uid, chantier_id: ch[0].id, libelle: 'Joints et plinthes', ordre: 2, faite: false, faite_le: null },
  ])
  return { devisBrouillon: devisIds.brouillon, devisEnvoye: devisIds.envoye, chantier: ch[0].id }
}

async function detruire(c) {
  const uid = c.uid
  // La purge prévue pour les comptes de test (0054/0083/0085) lève les gardes de conservation de 0078 ; le ménage table par
  // table ci-dessous n'est que le filet si elle échoue.
  { const { error } = await admin.rpc('purger_compte_test', { p_id: uid }); if (error) log(`  (purger_compte_test : ${error.message.slice(0, 120)})`) }
  const del = async (t, col, val) => { const r = await admin.from(t).delete().eq(col, val); if (r.error && !/does not exist|schema cache/.test(r.error.message)) log(`  (nettoyage ${t} : ${r.error.message.slice(0, 80)})`) }
  const ids = async (t, col = 'artisan_id') => (await admin.from(t).select('id').eq(col, uid)).data?.map((x) => x.id) ?? []
  const dv = await ids('devis'); const fa = await ids('factures'); const le = await ids('leads'); const ma = await ids('materiaux')
  if (dv.length) await admin.from('devis_lignes').delete().in('devis_id', dv)
  if (fa.length) await admin.from('factures_lignes').delete().in('facture_id', fa)
  if (le.length) await admin.from('messages').delete().in('lead_id', le)
  if (ma.length) await admin.from('stock').delete().in('materiau_id', ma)
  for (const t of ['assistant_actions', 'assistant_journal', 'assistant_conversations', 'chantier_taches', 'chantier_materiaux', 'chantier_equipe', 'crm_notes', 'crm_journal', 'chantiers', 'mouvements_stock', 'prix_observations', 'materiaux', 'fournisseurs', 'devis', 'factures', 'leads', 'clients', 'prix_artisan', 'regles_automatisation', 'plateforme_config', 'sessions_verifiees']) await del(t, t === 'sessions_verifiees' ? 'user_id' : 'artisan_id', uid)
  await del('artisans', 'id', uid)
  await admin.auth.admin.deleteUser(uid).catch((e) => log(`  (deleteUser : ${e.message})`))
  const restes = []
  { const r = await admin.from('artisans').select('id', { count: 'exact', head: true }).eq('id', uid); if (r.count) restes.push(`artisans:${r.count}`) }
  for (const t of ['devis', 'factures', 'leads', 'clients', 'prix_artisan', 'materiaux', 'fournisseurs', 'chantiers']) { const r = await admin.from(t).select('id', { count: 'exact', head: true }).eq('artisan_id', uid); if (r.count) restes.push(`${t}:${r.count}`) }
  const u = await admin.auth.admin.getUserById(uid); if (u.data?.user) restes.push('auth.users')
  log(restes.length ? `⚠️ compte ${c.role} : reste en base ${restes.join(', ')}` : `🧹 compte ${c.role} détruit, plus rien en base`)
  return restes.length === 0
}

function mesurer() {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity !== 0 }
  const txt = (e) => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim()
  const menu = [...document.querySelectorAll('.psh-side .psh-nav a, .psh-side .psh-nav button')].map((e) => ({ texte: txt(e), href: e.getAttribute('href'), groupe: e.closest('.psh-nav')?.previousElementSibling?.textContent?.trim() || null }))
  const groupes = [...document.querySelectorAll('.psh-side .psh-navlabel')].map((e) => txt(e))
  const zone = document.querySelector('main') || document.body
  const actions = [...zone.querySelectorAll('a,button,[role=tab],select,input[type=search]')].filter(vis).filter((e) => !e.closest('.psh-side')).map((e) => ({ t: e.tagName.toLowerCase(), texte: (txt(e) || e.getAttribute('aria-label') || e.getAttribute('placeholder') || '').slice(0, 60), href: e.getAttribute('href'), cls: typeof e.className === 'string' ? e.className.split(' ').slice(0, 2).join(' ') : '' }))
  const titres = [...zone.querySelectorAll('h1,h2')].filter(vis).map((e) => ({ t: e.tagName.toLowerCase(), texte: txt(e).slice(0, 80), cls: typeof e.className === 'string' ? e.className : '' }))
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 } }
  const comp = (h, b) => ({ r: h.r * h.a + b.r * (1 - h.a), g: h.g * h.a + b.g * (1 - h.a), b: h.b * h.a + b.b * (1 - h.a), a: 1 })
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b) }
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const fond = (e) => { const pile = []; for (let n = e; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.backgroundImage && s.backgroundImage !== 'none' && !/^url\(.*\.svg/.test(s.backgroundImage)) return { image: true }; const c = parse(s.backgroundColor); if (c && c.a > 0) { pile.push(c); if (c.a >= 1) break } } let base = { r: 255, g: 255, b: 255, a: 1 }; for (let i = pile.length - 1; i >= 0; i--) base = comp(pile[i], base); return { c: base } }
  const echecs = []; let mesures = 0; let nonCalc = 0
  for (const e of [...document.querySelectorAll('body *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1) && vis(e))) {
    const s = getComputedStyle(e); const t = parse(s.color); if (!t) continue
    const f = fond(e); if (f.image) { nonCalc++; continue }
    let op = 1; for (let n = e; n; n = n.parentElement) op *= +getComputedStyle(n).opacity
    const r = ratio(comp({ ...t, a: t.a * op }, f.c), f.c)
    const px = parseFloat(s.fontSize); const grand = px >= 24 || (+s.fontWeight >= 700 && px >= 18.66); const seuil = grand ? 3 : 4.5
    mesures++
    if (r < seuil) echecs.push({ texte: [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim().slice(0, 70), sel: e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ').slice(0, 3).join('.') : ''), ratio: +r.toFixed(2), seuil, px, couleur: s.color, fond: `rgb(${Math.round(f.c.r)},${Math.round(f.c.g)},${Math.round(f.c.b)})` })
  }
  return { url: location.pathname + location.search, titrePage: document.title, titres, menu, groupes, actions, hauteurPx: document.documentElement.scrollHeight, ecrans: +(document.documentElement.scrollHeight / innerHeight).toFixed(1), deborde: document.documentElement.scrollWidth - innerWidth, contrastes: { mesures, nonCalculables: nonCalc, echecs } }
}

const chargement = () => {
  const t = (document.body?.innerText || '').replace(/\s+/g, ' ')
  return { squelettes: document.querySelectorAll('[class*="skel"],[class*="squel"],[class*="shimmer"],[aria-busy="true"]').length, texteChargement: (t.match(/Chargement[^.]{0,40}/i) || [null])[0], longueurTexte: t.length }
}

async function connecter(nav, c) {
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' })
  const p = await ctx.newPage()
  await p.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 90_000 })
  await p.fill('#email-connexion', c.email); await p.fill('#mdp-connexion', c.mdp)
  await p.click('form button[type="submit"], form button:not([type="button"])')
  const issue = await codeEmailSiDemande(p, c.email, { uid: c.uid })
  await p.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 60_000 })
  log(`connecté (${c.role}) : ${issue} → ${new URL(p.url()).pathname}`)
  if (c.role === 'rempli') await p.evaluate(() => { try { localStorage.setItem('presti.aide_vues', JSON.stringify(['visite:console', 'visite:crm', 'visite:assistant'])) } catch {} })
  const etat = await ctx.storageState()
  await ctx.close()
  return etat
}

const AXE = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js')
/** Contrastes vérifiés PAR OUTIL : axe-core, règle color-contrast (WCAG 2 AA), sur la page telle qu'affichée. */
async function axeContraste(page) {
  try {
    await page.addScriptTag({ path: AXE })
    return await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] }, resultTypes: ['violations', 'incomplete'] })
      const v = r.violations[0]?.nodes ?? []
      return { violations: v.length, incomplets: r.incomplete[0]?.nodes?.length ?? 0, exemples: v.slice(0, 8).map((n) => ({ cible: n.target.join(' '), resume: (n.any[0]?.message || '').slice(0, 160) })) }
    })
  } catch (e) { return { erreur: String(e).slice(0, 120) } }
}

const resultat = { base: BASE, date: new Date().toISOString(), pages: {}, chargement: {} }
let nav = null
let propre = true
try {
  const rempli = await creerCompte('rempli')
  const ids = await semer(rempli.uid)
  const vide = await creerCompte('vide')
  log('comptes de test prêts')
  nav = await chromium.launch()
  const etats = { rempli: await connecter(nav, rempli), vide: await connecter(nav, vide) }

  const PAGES_REMPLI = ['/dashboard', '/messages', '/messages/canaux', '/devis', `/devis/${ids.devisBrouillon}`, `/devis/${ids.devisEnvoye}`, '/factures', '/chiffres', '/crm', '/crm?vue=pipeline', '/crm?vue=tableau', `/crm/chantiers/${ids.chantier}`, '/tarifs', '/inventaire', '/inventaire/fournisseurs', '/inventaire/recherche', '/profil', '/site/commander', '/plateforme', '/abonnement', '/outils', '/assistant', '/aide', '/parametres', '/parametres?onglet=abonnement', '/parametres?onglet=securite']
  const PAGES_VIDE = ['/dashboard', '/messages', '/devis', '/factures', '/chiffres', '/inventaire', '/crm', '/tarifs', '/assistant']
  const nomDe = (ch) => ch.replace(/^\//, '').replace(ids.devisBrouillon, 'fiche-brouillon').replace(ids.devisEnvoye, 'fiche-envoye').replace(ids.chantier, 'fiche').replace(/[^a-z0-9]+/gi, '-').replace(/-$/, '')

  for (const [role, pages] of [['rempli', PAGES_REMPLI], ['vide', PAGES_VIDE]]) {
    for (const [nomVue, vue] of [['1440', { width: 1440, height: 900 }], ['390', { width: 390, height: 844 }]]) {
      const ctx = await nav.newContext({ viewport: vue, deviceScaleFactor: 1, storageState: etats[role], locale: 'fr-FR', reducedMotion: 'reduce' })
      const page = await ctx.newPage()
      const erreurs = []
      page.on('pageerror', (e) => erreurs.push(String(e).slice(0, 200)))
      let premiere = true
      for (const chemin of pages) try {
        erreurs.length = 0
        const nom = `${role}-${nomDe(chemin)}-${nomVue}`
        // État de chargement : la capture du tout premier instant (après « commit »), avant les données.
        const t0 = Date.now()
        await page.goto(`${BASE}${chemin}`, { waitUntil: 'commit', timeout: 90_000 })
        await page.waitForTimeout(350)
        const ch0 = await page.evaluate(chargement).catch(() => null)
        if (role === 'rempli') await page.screenshot({ path: path.join(SORTIE, `${nom}-chargement.png`) }).catch(() => {})
        await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})
        // La visite guidée de la première connexion (compte vide, première page) : photographiée telle quelle, puis fermée.
        if (role === 'vide' && premiere) {
          await page.waitForTimeout(1800)
          await page.screenshot({ path: path.join(SORTIE, `vide-visite-guidee-${nomVue}.png`) })
          for (let i = 0; i < 6; i++) { const b = page.getByRole('button', { name: /suivant|continuer/i }).first(); if (!(await b.isVisible().catch(() => false))) break; await b.click().catch(() => {}); await page.waitForTimeout(500); await page.screenshot({ path: path.join(SORTIE, `vide-visite-guidee-${nomVue}-etape${i + 2}.png`) }) }
          const passer = page.getByRole('button', { name: /passer|terminer|fermer|compris/i }).first()
          if (await passer.isVisible().catch(() => false)) await passer.click().catch(() => {})
          premiere = false
        }
        await page.waitForTimeout(chemin.startsWith('/crm') ? 3500 : 1200)
        const tPret = Date.now() - t0
        await page.screenshot({ path: path.join(SORTIE, `${nom}.png`), fullPage: true, timeout: 120_000 }).catch((e) => log(`  (capture ${nom} : ${e.message.slice(0, 60)})`))
        const m = await page.evaluate(mesurer)
        m.axe = await axeContraste(page)
        resultat.pages[`${role}:${chemin}@${nomVue}`] = { ...m, msPret: tPret, erreurs: [...erreurs] }
        resultat.chargement[`${role}:${chemin}@${nomVue}`] = ch0
        log(`${role} ${chemin} @${nomVue} : ${m.titres[0]?.texte ?? '(sans titre)'} · menu ${m.menu.length} · ${m.ecrans} écrans · contrastes ${m.contrastes.echecs.length}/${m.contrastes.mesures} · axe ${m.axe?.violations ?? m.axe?.erreur} · débord ${m.deborde}px · chargement: squelettes=${ch0?.squelettes} « ${ch0?.texteChargement ?? '—'} »${erreurs.length ? ' · ERREURS ' + erreurs.length : ''}`)
      } catch (e) { log(`  ⚠️ ${role} ${chemin} @${nomVue} : ${e.message.slice(0, 120)}`) }
      // Téléphone : le menu ouvert (tiroir) et le menu du compte.
      if (nomVue === '390' && role === 'rempli') {
        await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
        await page.locator('.psh-hamb').click().catch(() => {})
        await page.waitForTimeout(600)
        await page.screenshot({ path: path.join(SORTIE, 'rempli-menu-ouvert-390.png') })
        resultat.menuTelephone = await page.evaluate(() => ({ entrees: document.querySelectorAll('.psh-side .psh-nav a').length, hauteur: document.querySelector('.psh-side-scroll')?.scrollHeight ?? null, vh: innerHeight }))
      }
      if (nomVue === '1440' && role === 'rempli') {
        await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
        await page.locator('.psh-founder').click().catch(() => {})
        await page.waitForTimeout(400)
        await page.screenshot({ path: path.join(SORTIE, 'rempli-menu-compte-1440.png') })
        // Ctrl+K existe-t-il dans la console ?
        await page.keyboard.press('Escape').catch(() => {})
        await page.keyboard.press('Control+k')
        await page.waitForTimeout(500)
        resultat.ctrlK = await page.evaluate(() => !!document.querySelector('[role=dialog] input, .rech, [class*="palette"]'))
      }
      await ctx.close()
    }
  }
} catch (e) {
  console.error('ÉCHEC :', e.message)
  process.exitCode = 1
} finally {
  if (nav) await nav.close().catch(() => {})
  for (const c of comptes) propre = (await detruire(c).catch((e) => { log(`⚠️ ménage ${c.role} : ${e.message}`); return false })) && propre
  fs.writeFileSync(path.join(DOSSIER, 'console-mesures.json'), JSON.stringify(resultat, null, 1))
  log(`\nMesures → ${path.join(DOSSIER, 'console-mesures.json')} · ménage ${propre ? 'complet' : 'INCOMPLET'}`)
  if (!propre) process.exitCode = 1
}
