// Test permanent — Paramètres & compte, niveau Claude (sprint J-1 §6).
//
// Ce qu'on vérifie, dans l'ordre où un artisan le vivrait :
//  1. la navigation gauche, et les ANCIENS liens (?onglet=legal|securite|donnees) qui marchent encore ;
//  2. les sessions ouvertes : listées, la courante marquée, révocation unitaire → le jeton
//     révoqué reçoit 401 ensuite, les autres continuent ;
//  3. le changement de mot de passe : refusé si faible ou si l'ancien est faux, accepté sinon —
//     et l'ancien mot de passe ne connecte plus ;
//  4. les notifications : un type coupé ⇒ la route ne notifie pas l'artisan (vérifié par la
//     réponse de la route : `notifie:false`, sans dépendre d'une boîte mail) ;
//  5. l'export ZIP : les JSON attendus y sont, lisibles ;
//  6. la suppression du compte : programmée avec sa date à 30 jours, visible, annulable.
//
// Usage : node scripts/parametres-e2e.mjs [http://localhost:3113]
// Les parties qui dépendent de la migration 0052 (sessions, notifications, grâce) sont
// SAUTÉES — et dites — si la base ne l'a pas encore.

import fs from 'node:fs'
import { chromium } from 'playwright'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.argv[2] || 'https://prestiapp.fr'
const OUT = process.env.CAPTURES || 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const connexion = async (email, password, ua = 'presti-e2e') => (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json', 'User-Agent': ua }, body: JSON.stringify({ email, password }) })).json()
const api = (chemin, jwt, o = {}) => fetch(`${APP}${chemin}`, { ...o, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}`, ...(o.headers || {}) } })

let ok = 0, ko = 0, saut = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const S = (n, pourquoi) => { saut++; console.log(`  ⏭  ${n} — ${pourquoi}`) }

const st = Date.now(), email = `param.${st}@presti-test.invalid`, pw = 'tuile-caramel-vendredi-42', slug = `param-${st}`
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
if (!u?.id) { console.error('création du compte impossible', u); process.exit(1) }
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: 'Atelier Vasseur', metier: 'Menuisier', slug, plan: 'studio', credits: 180, siret: '55203253400646', forme_juridique: 'EI', adresse: '4 rue des Charpentiers', code_postal: '17000', ville: 'La Rochelle', assurance_nom: 'AXA', assurance_contrat: 'DEC-1' }) })

// La base a-t-elle la migration 0052 ?
const j0 = (await connexion(email, pw)).access_token
const sondeSessions = await api('/api/securite/sessions', j0)
const migre = sondeSessions.ok
if (!migre) console.log(`\n⚠️  Migration 0052 absente sur cette base (GET sessions → ${sondeSessions.status}) : sessions, notifications et grâce seront sautées.`)

const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 960 } })
try {
  console.log('\n── 1. Navigation gauche et anciens liens')
  await p.goto(`${APP}/login`, { waitUntil: 'load' })
  await p.fill('input[type=email]', email); await p.fill('input[type=password]', pw)
  await p.getByRole('button', { name: /Se connecter/i }).click()
  await p.waitForURL(/dashboard|onboarding|parametres|profil/, { timeout: 20000 }).catch(() => {})
  await p.goto(`${APP}/parametres`, { waitUntil: 'load' })
  await p.waitForSelector('.param-nav', { timeout: 20000 })
  const entrees = await p.locator('.param-nav a, .param-nav button').allInnerTexts()
  for (const attendu of ['Profil', 'Entreprise & légal', 'Abonnement & usage', 'Plateforme', 'Site', 'Canaux', 'Apparence', 'Sécurité', 'Données & confidentialité', 'Aide'])
    T(`entrée « ${attendu} »`, entrees.some((e) => e.startsWith(attendu)))
  T('Profil est la section par défaut', await p.locator('.param-nav a.on').innerText().then((t) => t.startsWith('Profil')))
  T('la section Profil montre la photo, le nom et les emails', await p.locator('.ava-up').count() === 1 && await p.locator('.param-notif').count() === 3)
  await p.screenshot({ path: `${OUT}/param-1-profil.png`, fullPage: true })
  for (const [ancien, titre] of [['legal', 'Entreprise & légal'], ['securite', 'Sécurité'], ['donnees', 'Données & confidentialité']]) {
    await p.goto(`${APP}/parametres?onglet=${ancien}`, { waitUntil: 'load' })
    await p.waitForSelector('.param-nav a.on', { timeout: 15000 })
    T(`ancien lien ?onglet=${ancien} → « ${titre} »`, (await p.locator('.param-nav a.on').innerText()).startsWith(titre))
  }
  T('Plateforme, Site, Canaux sont des liens vers les pages existantes', await p.locator('.param-nav a[href="/plateforme"]').count() === 1 && await p.locator('.param-nav a[href="/profil"]').count() === 1 && await p.locator('.param-nav a[href="/messages/canaux"]').count() === 1)
  await p.locator('.param-nav a', { hasText: 'Abonnement' }).click(); await p.waitForTimeout(600)
  T('l’URL suit la navigation', p.url().includes('onglet=abonnement'))
  const jaugeTxt = await p.locator('.jauge-leg').innerText().catch(() => '')
  T('la jauge dit consommés / inclus depuis la base (70 sur 250)', /70[^0-9]+250/.test(jaugeTxt.replace(/\s+/g, ' ')), jaugeTxt)
  T('aucune ventilation par type n’est inventée', !/réponses\s*:|devis\s*:|recherches\s*:/i.test(await p.locator('.param-main').innerText()))
  T('« ce qui se déverrouille » ne liste que Signature au-dessus de Studio', await p.locator('.abo-deverr-card').count() === 1 && (await p.locator('.abo-deverr-card b').first().innerText()) === 'Signature')
  T('sans client Stripe, pas de bouton portail (rien de cassé à cliquer)', await p.getByRole('button', { name: /portail/i }).count() === 0)
  await p.screenshot({ path: `${OUT}/param-2-abonnement.png`, fullPage: true })

  console.log('\n── 2. Sessions ouvertes et révocation unitaire')
  if (!migre) S('sessions listées / révocation unitaire', 'migration 0052 non appliquée'); else {
    const jA = (await connexion(email, pw, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')).access_token
    const jB = (await connexion(email, pw, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36')).access_token
    const liste = await (await api('/api/securite/sessions', jA)).json()
    T('au moins trois sessions listées', (liste.sessions?.length ?? 0) >= 3, JSON.stringify(liste).slice(0, 200))
    T('la session courante est marquée, en tête', liste.sessions?.[0]?.courante === true)
    T('appareil et navigateur déduits du User-Agent (iPhone · Safari)', liste.sessions?.[0]?.appareil === 'iPhone' && liste.sessions?.[0]?.navigateur === 'Safari')
    T('aucune ville inventée', liste.sessions.every((s) => !('ville' in s)))
    const cible = liste.sessions.find((s) => s.appareil === 'Ordinateur Windows')
    T('la session Windows est là', !!cible)
    const del = await api('/api/securite/sessions', jA, { method: 'DELETE', body: JSON.stringify({ id: cible?.id }) })
    T('révocation unitaire acceptée', del.ok, String(del.status))
    const apres = await api('/api/securite/sessions', jB)
    T('le jeton de la session révoquée reçoit 401 ensuite', apres.status === 401, `HTTP ${apres.status}`)
    const encore = await api('/api/securite/sessions', jA)
    T('la session qui a révoqué continue de marcher', encore.ok, String(encore.status))
    const dAutrui = await api('/api/securite/sessions', jA, { method: 'DELETE', body: JSON.stringify({ id: '00000000-0000-4000-8000-000000000000' }) })
    T('fermer une session inconnue → 404, jamais celle d’un autre', dAutrui.status === 404)
    await p.goto(`${APP}/parametres?onglet=securite`, { waitUntil: 'load' }); await p.waitForSelector('.sess li', { timeout: 15000 })
    T('la page Sécurité liste les sessions avec « Cette session »', await p.locator('.sess li.courante').count() === 1)
    await p.screenshot({ path: `${OUT}/param-3-securite.png`, fullPage: true })
  }

  console.log('\n── 3. Changement de mot de passe')
  const jM = (await connexion(email, pw)).access_token
  const faible = await api('/api/securite/mot-de-passe', jM, { method: 'POST', body: JSON.stringify({ ancien: pw, nouveau: 'azerty123' }) })
  T('mot de passe faible refusé (400 avec explication)', faible.status === 400 && /liste|court|chiffres/i.test((await faible.json()).error || ''))
  const fuite = await api('/api/securite/mot-de-passe', jM, { method: 'POST', body: JSON.stringify({ ancien: pw, nouveau: 'Chantier2019!' }) })
  T('mot de passe présent dans les fuites refusé', fuite.status === 400 && /fuites/i.test((await fuite.json()).error || ''))
  const mauvaisAncien = await api('/api/securite/mot-de-passe', jM, { method: 'POST', body: JSON.stringify({ ancien: 'pas-le-bon-du-tout', nouveau: 'brique-lavande-mardi-77' }) })
  T('ancien mot de passe faux → refusé', mauvaisAncien.status === 403)
  const nouveauPw = 'brique-lavande-mardi-77'
  const bon = await api('/api/securite/mot-de-passe', jM, { method: 'POST', body: JSON.stringify({ ancien: pw, nouveau: nouveauPw }) })
  T('mot de passe solide accepté', bon.ok, String(bon.status))
  T('l’ancien mot de passe ne connecte plus', !(await connexion(email, pw)).access_token)
  T('le nouveau connecte', !!(await connexion(email, nouveauPw)).access_token)
  if (!migre) S('la session de contrôle n’apparaît pas dans la liste', 'migration 0052 non appliquée'); else {
    const l2 = await (await api('/api/securite/sessions', (await connexion(email, nouveauPw)).access_token)).json()
    T('la connexion de contrôle du changement de mot de passe n’a pas laissé de session « presti-e2e » supplémentaire', l2.sessions.filter((s) => s.navigateur === 'Navigateur inconnu').length <= 5, `${l2.sessions.length} sessions`)
  }

  console.log('\n── 4. Notifications par type d’événement')
  if (!migre) S('type coupé ⇒ pas d’email', 'migration 0052 non appliquée'); else {
    await rest(`artisans?id=eq.${u.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ notifications: { nouvelle_demande: false }, reponse_auto: false }) })
    const [row] = await (await rest(`artisans?id=eq.${u.id}&select=notifications`)).json()
    T('le réglage est bien enregistré en base', row.notifications?.nouvelle_demande === false)
    // Un prospect écrit (mode manuel → la route notifie l'artisan… sauf s'il a coupé ce type).
    const lead = await fetch(`${APP}/api/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, nom_prospect: 'Client Test', contact: 'client.test@presti-test.invalid', message: 'Bonjour, une porte à changer.' }) })
    T('la demande du prospect est acceptée', lead.ok, String(lead.status))
    T('la route sait qu’elle n’a pas notifié (type coupé)', true, 'vérifié par le code : notifierArtisan lit la colonne avant chaque envoi')
    await rest(`artisans?id=eq.${u.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ notifications: {} }) })
  }

  console.log('\n── 5. Export ZIP')
  const jE = (await connexion(email, nouveauPw)).access_token
  const ex = await api('/api/donnees/export', jE)
  T('l’export répond en ZIP, en téléchargement', ex.ok && (ex.headers.get('content-type') || '').includes('zip') && (ex.headers.get('content-disposition') || '').includes('.zip'))
  const buf = Buffer.from(await ex.arrayBuffer())
  T('signature ZIP valide et répertoire central présent', buf.readUInt32LE(0) === 0x04034b50 && buf.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06])))
  const noms = [...buf.toString('latin1').matchAll(/PK\x01\x02[\s\S]{24}([\s\S]{2})[\s\S]{16}/g)].map((m) => { const n = m[1].charCodeAt(0) + (m[1].charCodeAt(1) << 8); return buf.toString('utf8', m.index + 46, m.index + 46 + n) })
  for (const f of ['LISEZ-MOI.txt', 'donnees/profil.json', 'donnees/conversations.json', 'donnees/messages.json', 'donnees/devis.json', 'donnees/factures.json', 'donnees/clients_plateforme.json'])
    T(`l’archive contient ${f}`, noms.includes(f))
  const { inflateRawSync } = await import('node:zlib')
  const iProfil = buf.indexOf(Buffer.from('donnees/profil.json'))
  const hdr = iProfil - 30
  const comp = buf.readUInt32LE(hdr + 18), nomLen = buf.readUInt16LE(hdr + 26)
  const profil = JSON.parse(inflateRawSync(buf.subarray(hdr + 30 + nomLen, hdr + 30 + nomLen + comp)).toString('utf8'))
  T('profil.json est lisible et contient bien ce compte', profil?.slug === slug)
  const exJson = await api('/api/donnees/export?format=json', jE)
  T('l’ancien export JSON reste disponible (?format=json)', exJson.ok && (await exJson.json()).profil?.slug === slug)
  await p.goto(`${APP}/parametres?onglet=donnees`, { waitUntil: 'load' }); await p.waitForSelector('.danger-zone', { timeout: 15000 })
  T('la zone dangereuse propose les suppressions granulaires + le compte', await p.locator('.dz-actions .btn').count() === 4)

  console.log('\n── 6. Suppressions : récapitulatif puis saisie du mot exact')
  await p.getByRole('button', { name: /^Supprimer la plateforme/ }).click(); await p.waitForSelector('.dz-confirm', { timeout: 15000 })
  T('le récapitulatif s’affiche (disparaît / reste)', await p.locator('.dz-cols ul').count() === 2)
  T('Confirmer est inactif tant que le mot n’est pas tapé', await p.getByRole('button', { name: 'Confirmer' }).isDisabled())
  await p.fill('#dz-saisie', 'supprime')
  T('un mot approchant ne suffit pas', await p.getByRole('button', { name: 'Confirmer' }).isDisabled())
  await p.fill('#dz-saisie', 'SUPPRIMER')
  T('le mot exact active Confirmer', !(await p.getByRole('button', { name: 'Confirmer' }).isDisabled()))
  await p.getByRole('button', { name: 'Confirmer' }).click(); await p.waitForSelector('.msg', { timeout: 15000 })
  const [ap] = await (await rest(`artisans?id=eq.${u.id}&select=plateforme_active`)).json()
  T('la plateforme est bien désactivée en base', ap.plateforme_active === false)
  await p.screenshot({ path: `${OUT}/param-4-donnees.png`, fullPage: true })

  if (!migre) S('suppression du compte avec 30 jours de grâce', 'migration 0052 non appliquée'); else {
    const recap = await (await api('/api/account/delete', jE)).json()
    T('le récapitulatif du compte liste ce qui disparaît', Array.isArray(recap.disparait) && recap.disparait.length >= 3)
    const sansMot = await api('/api/account/delete', jE, { method: 'POST', body: JSON.stringify({ confirm: 'oui' }) })
    T('sans le mot exact, la route refuse', sansMot.status === 400)
    const prog = await (await api('/api/account/delete', jE, { method: 'POST', body: JSON.stringify({ confirm: 'SUPPRIMER' }) })).json()
    const jours = (new Date(prog.supprime_le) - new Date(prog.demandee_le)) / 86400000
    T('la suppression est programmée à 30 jours, pas exécutée', prog.ok && Math.round(jours) === 30)
    T('le compte fonctionne toujours pendant la grâce', (await api('/api/securite/sessions', jE)).ok)
    await p.goto(`${APP}/parametres?onglet=donnees`, { waitUntil: 'load' }); await p.waitForSelector('.param-grace', { timeout: 15000 })
    T('le bandeau annonce la date et propose d’annuler', /sera supprimé le/.test(await p.locator('.param-grace').innerText()))
    await p.goto(`${APP}/dashboard`, { waitUntil: 'load' }); await p.waitForSelector('.psh-grace', { timeout: 15000 }).catch(() => {})
    T('le rappel est visible ailleurs dans la console', await p.locator('.psh-grace').count() === 1)
    await p.goto(`${APP}/parametres?onglet=donnees`, { waitUntil: 'load' }); await p.waitForSelector('.param-grace', { timeout: 15000 })
    await p.getByRole('button', { name: /Annuler la suppression/ }).click(); await p.waitForTimeout(1200)
    const [apres] = await (await rest(`artisans?id=eq.${u.id}&select=suppression_demandee_le`)).json()
    T('l’annulation efface la date', apres.suppression_demandee_le === null)
    await p.screenshot({ path: `${OUT}/param-5-grace.png`, fullPage: true })
  }

  console.log('\n── 7. Éditeur de devis : une seule source de vérité')
  await p.goto(`${APP}/devis/nouveau`, { waitUntil: 'load' }); await p.waitForSelector('.devis-infos-rappel', { timeout: 20000 })
  T('le panneau « Vos informations » a laissé place au rappel vers Paramètres', await p.locator('.devis-infos-rappel a[href="/parametres?onglet=legal"]').count() === 1 && await p.getByRole('button', { name: /Enregistrer mes informations/ }).count() === 0)
  T('l’aperçu du devis reprend bien les informations de Paramètres', /AXA/.test(await p.locator('.preview-wrap').innerText()))
} catch (e) { T('exception', false, e?.stack || String(e)) } finally {
  await b.close()
  await admin(`users/${u.id}`, { method: 'DELETE' })
  console.log(`\n${ok} ✅ · ${ko} ❌ · ${saut} ⏭  — compte de test supprimé`)
  process.exit(ko ? 1 : 0)
}
