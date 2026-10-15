// LA PLATEFORME et « Mes chiffres » commencent avec Studio, pour TOUS les comptes (Benj, 15/10/2026 : « Dans Essentiel il n'y a PAS de plateforme ») :
// la preuve par HTTP, sur de vrais comptes.
//
// Pour chaque offre (Essai, Essentiel, Studio, Signature), un compte de test est créé, connecté, et appelle les routes des deux écrans :
//   Essai / Essentiel -> 403 { code: 'offre', offre: 'studio' } et AUCUNE donnée dans le corps ;
//   Studio / Signature -> 200 ; les automatisations de « Mes chiffres » (champ `automatisations`) ne sont ouvertes qu'à Signature ;
//   le rangement des fichiers (POST /api/compta/assistant) est refusé avant tout crédit (les crédits du compte ne bougent pas) ;
//   la plateforme : Essai / Essentiel -> la page publique est NEUTRE (200, « ne reçoit pas de demandes en ligne », coordonnées publiques, aucune conversation),
//   POST /api/leads et toutes les routes de conversation d'un client -> 403 { code: 'plateforme' } sans rien enregistrer ni débiter, lien magique sans lien créé,
//   Réponses instantanées / Messages / devis auto / boîte e-mail / nom de domaine -> 403 offre Studio ; Studio / Signature -> tout est ouvert.
//   Le passage quotidien des relances (app/api/cron/relances) n'est PAS appelé ici (il enverrait de vrais e-mails aux demandes réelles dues) : sa garde est jugée
//   par scripts/ecrans-offre-qa.mjs (ordre dans le code) ; la décision pure est celle de lib/plateformeAcces.ts.
// Les comptes de test sont supprimés dans un finally. La matrice est lue dans lib/plans.ts : si Benj la change, les attentes suivent.
//
// Usage (serveur local lancé, voir `npm run build && npx next start -p 3123`) :
//   TEST_BASE=http://localhost:3123 node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/ecrans-offre-e2e.mjs
// Le serveur DOIT être un build de ce dépôt (le test refuse prestiapp.fr tant que ce changement n'y est pas déployé : TEST_BASE obligatoire).

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { peut, PLANS } from '../lib/plans.ts'
import { FLAGS } from '../lib/flags.ts'
import { verifierSessionTest } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE
if (!BASE) { console.log('TEST_BASE obligatoire (serveur local de ce dépôt) : ce test ne vise pas la production par défaut.'); process.exit(2) }
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }

// Une feuille valide pour le rangement (aucun chiffre 0-8 : les montants n'arrivent jamais en clair). Refusée avant tout appel d'IA pour Essai / Essentiel.
const ECHANTILLON = { feuilles: [{ nom: 'Dépenses', lignes: 1, apercu: [['Date', 'Libellé']], valeurs: [['Date'], ['Libellé']] }] }

const comptes = []
const horodatage = Date.now()
try {
  for (const plan of ['gratuit', 'essentiel', 'studio', 'signature']) {
    console.log(`\n── ${PLANS[plan].label}`)
    const email = `ecrans-offre-${plan}-${horodatage}@presti-test.invalid`
    const mdp = crypto.randomBytes(18).toString('base64url')
    const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
    if (error) throw new Error('compte de test : ' + error.message)
    comptes.push(u.user.id)
    const slug = `ecrans-offre-${plan}-${horodatage}`
    await admin.from('artisans').insert({ id: u.user.id, email, nom: `Écrans ${plan}`, metier: 'Plombier', slug, plan, credits: 40 })
    const pub = createClient(URL, ANON, { auth: { persistSession: false } })
    const { data: s } = await pub.auth.signInWithPassword({ email, password: mdp })
    await verifierSessionTest(s?.session?.access_token)
    const jeton = s?.session?.access_token
    if (!jeton) throw new Error('connexion impossible pour ' + plan)
    const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` }
    const appel = async (methode, chemin, corps) => {
      const r = await fetch(BASE + chemin, { method: methode, headers: h, ...(corps ? { body: JSON.stringify(corps) } : {}) })
      return { status: r.status, corps: await r.json().catch(() => ({})) }
    }

    const ecran = peut(plan, 'plateforme.gestion'), chiffres = peut(plan, 'chiffres'), auto = peut(plan, 'chiffres.auto')

    // Mes chiffres : la lecture
    const t = await appel('GET', '/api/compta/tableau')
    if (chiffres) {
      T('Mes chiffres · lecture → 200 avec ses données', t.status === 200 && Array.isArray(t.corps.factures), `HTTP ${t.status}`)
      T(`Mes chiffres · automatisations ${auto ? 'ouvertes' : 'fermées'} (Signature seulement)`, t.corps.automatisations === auto, JSON.stringify(t.corps.automatisations))
    } else {
      T('Mes chiffres · lecture → 403 offre Studio', t.status === 403 && t.corps.code === 'offre' && t.corps.offre === 'studio' && /Disponible avec l’offre Studio/.test(t.corps.error ?? ''), `HTTP ${t.status} ${JSON.stringify(t.corps).slice(0, 160)}`)
      T('Mes chiffres · le refus ne contient AUCUNE donnée', !('factures' in t.corps) && !('devis' in t.corps) && !('demandes' in t.corps))
    }

    // Mes chiffres : le rangement par l'assistant (refus AVANT le crédit)
    if (!chiffres) {
      const avant = (await admin.from('artisans').select('credits').eq('id', u.user.id).maybeSingle()).data?.credits
      const r = await appel('POST', '/api/compta/assistant', { echantillon: ECHANTILLON })
      const apres = (await admin.from('artisans').select('credits').eq('id', u.user.id).maybeSingle()).data?.credits
      T('Mes chiffres · rangement par l’assistant → 403 offre', r.status === 403 && r.corps.code === 'offre', `HTTP ${r.status} ${JSON.stringify(r.corps).slice(0, 120)}`)
      T('Mes chiffres · le refus ne consomme aucun crédit', avant === apres, `${avant} -> ${apres}`)
    }

    // Mes chiffres : les réglages d'automatisation (404 tant que les deux drapeaux sont baissés, avant toute session)
    const fermeParDrapeau = !FLAGS.comptaAlerteImpayes && !FLAGS.comptaExportMensuel
    const rg = await appel('GET', '/api/compta/reglages')
    const rp = await appel('PUT', '/api/compta/reglages', { alerte_impayes: true, alerte_jours: 15 })
    if (fermeParDrapeau) T('Mes chiffres · réglages d’automatisation → 404 (rien de livré : drapeaux baissés)', rg.status === 404 && rp.status === 404, `GET ${rg.status} PUT ${rp.status}`)
    else {
      T(`Mes chiffres · réglages d’automatisation → ${auto ? 'ouverts' : '403 offre Signature'}`, auto ? rg.status === 200 : rg.status === 403 && rg.corps.code === 'offre' && rg.corps.offre === 'signature', `GET ${rg.status}`)
      if (!auto) T('Mes chiffres · écriture des réglages refusée (403)', rp.status === 403, `PUT ${rp.status}`)
    }

    // Relances automatiques des factures impayées (15/10, « En Studio ») : refus 403 { code: 'offre', offre: 'studio' } pour Essai / Essentiel, sans rien écrire.
    // Aucune relance n'est activée ici (actif: false) : aucun e-mail ne peut partir, et le compte de test n'a aucune facture.
    {
      const relances = peut(plan, 'factures.relances')
      const gr = await appel('GET', '/api/factures/relances-auto')
      const pr = await appel('PUT', '/api/factures/relances-auto', { actif: !relances ? true : false, jours: [3, 10, 21], textes: {} })
      const po = await appel('POST', '/api/factures/relances-auto', { facture_id: crypto.randomUUID(), action: 'arreter' })
      if (!FLAGS.relancesImpayes) T('Relances d’impayés · 404 drapeau baissé', gr.status === 404 && pr.status === 404 && po.status === 404, `GET ${gr.status}`)
      else if (relances) {
        T('Relances d’impayés · lecture → 200 (désactivées par défaut)', gr.status === 200 && gr.corps.reglages?.actif === false, `GET ${gr.status} ${JSON.stringify(gr.corps).slice(0, 120)}`)
        T('Relances d’impayés · réglage enregistré (case décochée) → 200', pr.status === 200, `PUT ${pr.status}`)
        T('Relances d’impayés · arrêt d’une facture inconnue → 404 (pas de fuite)', po.status === 404, `POST ${po.status}`)
      } else {
        T('Relances d’impayés · lecture → 403 offre Studio', gr.status === 403 && gr.corps.code === 'offre' && gr.corps.offre === 'studio' && /Disponible avec l’offre Studio/.test(gr.corps.error ?? '') && !('journal' in gr.corps), `GET ${gr.status} ${JSON.stringify(gr.corps).slice(0, 140)}`)
        T('Relances d’impayés · écriture (case cochée) → 403', pr.status === 403 && pr.corps.code === 'offre', `PUT ${pr.status}`)
        T('Relances d’impayés · arrêt d’une facture → 403', po.status === 403, `POST ${po.status}`)
        const ligne = (await admin.from('relances_impayes_reglages').select('actif').eq('artisan_id', u.user.id).maybeSingle()).data
        T('Relances d’impayés · rien n’a été enregistré en base pour ce compte', ligne === null, JSON.stringify(ligne))
      }
    }

    // Ma plateforme : config + apparence
    const c = await appel('GET', '/api/plateforme/config')
    const a = await appel('GET', '/api/plateforme/apparence')
    if (ecran) {
      T('Ma plateforme · config → 200', c.status === 200 && 'mode_effectif' in c.corps, `HTTP ${c.status}`)
      T('Ma plateforme · apparence → 200', a.status === 200 && a.corps.ok === true, `HTTP ${a.status}`)
    } else {
      T('Ma plateforme · config → 403 offre Studio', c.status === 403 && c.corps.code === 'offre' && c.corps.offre === 'studio', `HTTP ${c.status}`)
      T('Ma plateforme · apparence (lecture) → 403 offre Studio', a.status === 403 && a.corps.code === 'offre' && !('slug' in a.corps), `HTTP ${a.status}`)
      const avant = (await admin.from('artisans').select('theme, accent').eq('id', u.user.id).maybeSingle()).data
      const w = await appel('POST', '/api/plateforme/apparence', { theme: 'ardoise', accent: '#336699' })
      const apres = (await admin.from('artisans').select('theme, accent').eq('id', u.user.id).maybeSingle()).data
      T('Ma plateforme · apparence (écriture) → 403, thème et couleur inchangés', w.status === 403 && JSON.stringify(avant) === JSON.stringify(apres), `HTTP ${w.status} ${JSON.stringify(avant)} -> ${JSON.stringify(apres)}`)
    }

    // LA PLATEFORME (15/10, Benj : « Dans Essentiel il n'y a PAS de plateforme ») : Essai / Essentiel -> page publique neutre, aucune demande enregistrée,
    // aucun crédit touché, routes de réponse refusées ; Studio / Signature -> tout marche. Aucun e-mail réel (adresses .invalid), aucun appel d'IA :
    // le compte est EN PAUSE (leads_pause), donc même une garde qui laisserait passer ne dépenserait rien — mais elle enregistrerait la demande, et c'est ce qu'on compte.
    {
      const plateforme = peut(plan, 'plateforme.conversation')
      const credits = async () => (await admin.from('artisans').select('credits').eq('id', u.user.id).maybeSingle()).data?.credits
      const nbLeads = async () => (await admin.from('leads').select('id', { count: 'exact', head: true }).eq('artisan_id', u.user.id)).count ?? 0
      const nbMessages = async (leadId) => (await admin.from('messages').select('id', { count: 'exact', head: true }).eq('lead_id', leadId)).count ?? 0
      await admin.from('artisans').update({ leads_pause: true, tel_public: '06 12 34 56 78', email_public: `contact-${plan}@presti-test.invalid` }).eq('id', u.user.id)
      const c0 = await credits()

      // — La page publique
      const p = await fetch(`${BASE}/p/${slug}`, { redirect: 'manual' })
      const html = await p.text()
      if (plateforme) {
        T('plateforme · page publique → la conversation est montée', p.status === 200 && /plat-app/.test(html) && !/data-sans-plateforme/.test(html), `HTTP ${p.status}`)
      } else {
        T('sans plateforme · page publique → 200 (jamais d’erreur), message neutre et poli', p.status === 200 && /ne reçoit pas de demandes en ligne pour le moment/.test(html) && /data-sans-plateforme/.test(html), `HTTP ${p.status}`)
        T('sans plateforme · la page montre ses coordonnées publiques (tel: et mailto:)', /href="tel:0612345678"/.test(html) && /href="mailto:contact-/.test(html))
        // Le texte VU par le client (le corps de la page, sans balises) : les adresses de l'en-tête (canonique, partage) portent le domaine de l'éditeur pour toute page d'artisan sans domaine à lui.
        const visible = (html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/presti-test\.invalid/g, '')
        T('sans plateforme · aucune conversation montée, aucune mention de Presti dans la page de l’artisan', !/plat-app/.test(html) && !/<textarea/i.test(html) && !/presti/i.test(visible))
      }

      // — Une demande déposée sur la page publique (POST /api/leads)
      const corpsDemande = { slug, contact: `client-${plan}@presti-test.invalid`, nom_prospect: 'Client Test', message: 'Bonjour, test de la plateforme.' }
      const dem = await fetch(`${BASE}/api/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpsDemande) })
      const demCorps = await dem.json().catch(() => ({}))
      if (plateforme) {
        T('plateforme · une demande est enregistrée (200, compte en pause : aucune IA)', dem.status === 200 && demCorps.ok === true && (await nbLeads()) === 1, `HTTP ${dem.status} ${JSON.stringify(demCorps).slice(0, 120)}`)
      } else {
        T('sans plateforme · la demande est refusée (403, code plateforme, message neutre)', dem.status === 403 && demCorps.code === 'plateforme' && /ne reçoit pas de demandes en ligne/.test(demCorps.error ?? ''), `HTTP ${dem.status} ${JSON.stringify(demCorps).slice(0, 120)}`)
        T('sans plateforme · aucune demande enregistrée, aucun crédit consommé', (await nbLeads()) === 0 && (await credits()) === c0, `leads ${await nbLeads()}, crédits ${c0} -> ${await credits()}`)
      }

      // — Une conversation déjà ouverte (un lead existant du compte) : le client ne peut plus y écrire, rien n'est débité
      const { data: lead } = await admin.from('leads').insert({ artisan_id: u.user.id, nom_prospect: 'Ancien client', contact: `ancien-${plan}@presti-test.invalid`, message: 'Demande antérieure', canal: 'formulaire', statut: 'repondu' }).select('id, token').single()
      const tok = lead?.token
      const m0 = await nbMessages(lead.id)
      const g = await fetch(`${BASE}/api/conversation?token=${tok}`)
      const post = async (chemin, corps) => { const r = await fetch(`${BASE}${chemin}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }); return { status: r.status, corps: await r.json().catch(() => ({})) } }
      if (plateforme) {
        T('plateforme · lecture du fil → 200', g.status === 200, `HTTP ${g.status}`)
        const r = await post('/api/conversation', { token: tok, message: 'Bonjour, une question.' })
        T('plateforme · message du client enregistré (compte en pause : aucune IA, aucun crédit)', r.status === 200 && r.corps.ok === true && (await nbMessages(lead.id)) === m0 + 1 && (await credits()) === c0, `HTTP ${r.status} ${JSON.stringify(r.corps).slice(0, 100)}`)
      } else {
        T('sans plateforme · lecture du fil → 403 plateforme', g.status === 403 && (await g.json().catch(() => ({}))).code === 'plateforme', `HTTP ${g.status}`)
        const refus = [
          ['/api/conversation', { token: tok, message: 'Bonjour, une question.' }],
          ['/api/conversation/stream', { token: tok, message: 'Bonjour, une question.' }],
          ['/api/conversation/regles', { token: tok }],
          ['/api/conversation/devis', { token: tok, action: 'accepter' }],
          ['/api/leads/contact', { token: tok, contact: `nouveau-${plan}@presti-test.invalid` }],
        ]
        for (const [chemin, corps] of refus) { const r = await post(chemin, corps); T(`sans plateforme · POST ${chemin} → 403 plateforme`, r.status === 403 && r.corps.code === 'plateforme', `HTTP ${r.status} ${JSON.stringify(r.corps).slice(0, 100)}`) }
        T('sans plateforme · aucun message ajouté au fil, aucun crédit consommé, aucune relance armée', (await nbMessages(lead.id)) === m0 && (await credits()) === c0 && ((await admin.from('relances').select('id', { count: 'exact', head: true }).eq('lead_id', lead.id)).count ?? 0) === 0)
        const pa = await post('/api/p/auth', { action: 'demande', slug, email: `client-${plan}@presti-test.invalid` })
        const liens = (await admin.from('clients_liens').select('id', { count: 'exact', head: true }).eq('artisan_id', u.user.id)).count ?? 0
        T('sans plateforme · lien magique d’un client : réponse uniforme (200) mais aucun lien créé', pa.status === 200 && liens === 0, `HTTP ${pa.status}, ${liens} lien(s)`)
      }

      // — Côté artisan : Messages, Réponses instantanées, devis automatique, boîte e-mail, nom de domaine
      const artisanRefus = async (nom, methode, chemin, corps) => {
        const r = await appel(methode, chemin, corps)
        if (plateforme) T(`plateforme · ${nom} → ouvert (pas de 403 d’offre)`, !(r.status === 403 && r.corps.code === 'offre'), `HTTP ${r.status} ${JSON.stringify(r.corps).slice(0, 100)}`)
        else T(`sans plateforme · ${nom} → 403 offre Studio`, r.status === 403 && r.corps.code === 'offre' && r.corps.offre === 'studio' && /Disponible avec l’offre Studio/.test(r.corps.error ?? ''), `HTTP ${r.status} ${JSON.stringify(r.corps).slice(0, 100)}`)
        return r
      }
      const rep = await artisanRefus('Réponses instantanées (réponse IA)', 'POST', '/api/tools/reponse', { message: plateforme ? '' : 'Bonjour, une fuite sous mon évier.', model: 'standard' })
      if (plateforme) T('plateforme · Réponses instantanées : message vide → 400, aucun crédit pris', rep.status === 400 && (await credits()) === c0, `HTTP ${rep.status}`)
      await artisanRefus('Messages (action sur une conversation)', 'POST', '/api/messages', { action: 'rendre_main', lead_id: lead.id })
      await artisanRefus('devis automatique depuis une conversation', 'POST', '/api/devis/auto', plateforme ? { lead_id: '' } : { lead_id: lead.id })
      await artisanRefus('brancher une boîte e-mail', 'POST', '/api/canaux', { adresse: 'pas-un-mail', mot_de_passe: 'x' })
      await artisanRefus('relever la boîte e-mail', 'POST', '/api/canaux/relever', {})
      if (!plateforme) {
        const d = await appel('POST', '/api/domain', { domaine: `ecrans-offre-${plan}-${horodatage}.test` })
        const dom = (await admin.from('artisans').select('domaine').eq('id', u.user.id).maybeSingle()).data?.domaine
        T('sans plateforme · nom de domaine sur la page → 403, rien d’enregistré', d.status === 403 && !dom, `HTTP ${d.status} domaine=${dom}`)
      }
      T(`${plateforme ? 'plateforme' : 'sans plateforme'} · crédits du compte : ${plateforme ? 'inchangés (compte en pause)' : 'jamais touchés'}`, (await credits()) === c0, `${c0} -> ${await credits()}`)
    }
  }
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  for (const uid of comptes) {
    await admin.from('clients_liens').delete().eq('artisan_id', uid)
    const { data: ls } = await admin.from('leads').select('id').eq('artisan_id', uid)
    for (const l of ls ?? []) { await admin.from('relances').delete().eq('lead_id', l.id); await admin.from('messages').delete().eq('lead_id', l.id) }
    await admin.from('leads').delete().eq('artisan_id', uid)
    await admin.from('artisans').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid).catch(() => {})
  }
  if (comptes.length) console.log(`\n🧹 ${comptes.length} comptes de test supprimés`)
}

console.log(`\n${ok} réussis, ${ko} échoués\n`)
process.exit(ko ? 1 : 0)
