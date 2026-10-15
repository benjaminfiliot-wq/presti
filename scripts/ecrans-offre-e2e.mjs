// « Ma plateforme » et « Mes chiffres » commencent avec Studio, pour TOUS les comptes (Benj, 15/10/2026) : la preuve par HTTP, sur de vrais comptes.
//
// Pour chaque offre (Essai, Essentiel, Studio, Signature), un compte de test est créé, connecté, et appelle les routes des deux écrans :
//   Essai / Essentiel -> 403 { code: 'offre', offre: 'studio' } et AUCUNE donnée dans le corps ;
//   Studio / Signature -> 200 ; les automatisations de « Mes chiffres » (champ `automatisations`) ne sont ouvertes qu'à Signature ;
//   le rangement des fichiers (POST /api/compta/assistant) est refusé avant tout crédit (les crédits du compte ne bougent pas) ;
//   le lien de conversation public d'un Essentiel reste servi (200), et la config d'un Essentiel n'a pas bougé après ses tentatives d'écriture.
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

    // Ce qui RESTE en Essentiel : le lien de conversation public est servi, et la réponse préparée (mode « assistée ») est celle du serveur.
    if (plan === 'essentiel' || plan === 'gratuit') {
      const p = await fetch(`${BASE}/p/${slug}`, { redirect: 'manual' })
      T('le lien de conversation public reste servi (200)', p.status === 200, `HTTP ${p.status}`)
      const m = await appel('GET', '/api/messages')
      T('Messages (réponses à valider) reste ouvert', m.status !== 403, `HTTP ${m.status}`)
    }
  }
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  for (const uid of comptes) {
    await admin.from('artisans').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid).catch(() => {})
  }
  if (comptes.length) console.log(`\n🧹 ${comptes.length} comptes de test supprimés`)
}

console.log(`\n${ok} réussis, ${ko} échoués\n`)
process.exit(ko ? 1 : 0)
