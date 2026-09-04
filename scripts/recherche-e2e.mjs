// Test permanent — l'assistant de recherche chez les fournisseurs (§8 F3).
//
// Ce qu'il prouve :
//   A. (unitaire, sans réseau) la validation de la sortie du moteur : un prix absent de
//      l'extrait cité est rejeté, un prix absent des pages récupérées est rejeté, un lien hors
//      des sites cochés est rejeté, un fournisseur sans prix publics passe dans « non vus »
//      SANS appel, le sceau d'un résultat ne survit pas à une retouche ;
//   B. (1 appel IA) une VRAIE recherche — « plaque de plâtre BA13 » chez Castorama + Brico
//      Dépôt, niveau Standard — rend ≥ 1 résultat avec un lien sur un domaine autorisé et un
//      prix présent dans l'extrait ;
//   C. (route) 401 sans jeton, 403 pour un compte Essentiel, 429 au-delà de 20 recherches par
//      heure (compteur simulé par la RPC), 400 pour un résultat au sceau falsifié, et
//      l'enregistrement d'un résultat retenu (observation `recherche_ia`, ligne d'achat).
//
// Usage : TEST_BASE=http://localhost:3114 node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/recherche-e2e.mjs
//
// Budget IA : 1 appel (section B). Comptes de test créés puis supprimés. Les sections qui
// dépendent d'une migration absente (0048 fournisseurs/observations, 0049 limites) sont
// marquées « en attente » et le script sort en code 2.

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const { validerSortie, prixDansTexte, ecrituresPrix, sceller, sceauValide, rechercherChezFournisseurs, MAX_RESULTATS } = await import('../lib/recherche-fournisseurs.ts')
const { NOTE_ACCES_CONNEXION, domaineDe } = await import('../lib/inventaire/liste-depart.ts')
const { resolveModel } = await import('../lib/models.ts')

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const admin = createClient(URL_SB, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0, attente = []
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const EN_ATTENTE = (n, pourquoi) => { attente.push(n); console.log(`  ⏸  ${n} — en attente : ${pourquoi}`) }

const F = (id, nom, url, prix_publics = true) => ({ id, nom, url, type: 'gsb', numero_compte: null, remise_pct: null, delai_jours: null, agence: null, contact: null, ordre: 0, prix_publics, note_acces: prix_publics ? null : NOTE_ACCES_CONNEXION })
const CASTO = F('11111111-1111-4111-8111-111111111111', 'Castorama', 'https://www.castorama.fr')
const BRICO = F('22222222-2222-4222-8222-222222222222', 'Brico Dépôt', 'https://www.bricodepot.fr')
const REXEL = F('33333333-3333-4333-8333-333333333333', 'Rexel', 'https://www.rexel.fr', false)
const ARTISAN = '00000000-0000-4000-8000-00000000f3f3'

const comptes = []
async function creer(plan, nom) {
  const email = `verif-f3-${nom}-${Date.now()}@presti-test.invalid`
  const motDePasse = crypto.randomBytes(18).toString('base64url')
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
  if (error) throw new Error(`compte ${nom} : ${error.message}`)
  await admin.from('artisans').insert({ id: u.user.id, email, nom: `F3 ${nom}`, metier: 'Plaquiste', slug: `verif-f3-${nom}-${Date.now()}`, plan })
  comptes.push(u.user.id)
  const pub = createClient(URL_SB, ANON, { auth: { persistSession: false } })
  const { data: s, error: e2 } = await pub.auth.signInWithPassword({ email, password: motDePasse })
  if (e2) throw new Error(`connexion ${nom} : ${e2.message}`)
  const token = s.session.access_token
  const appel = async (chemin, init = {}) => {
    const r = await fetch(`${BASE}${chemin}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) } })
    return { statut: r.status, corps: await r.json().catch(() => null) }
  }
  return { uid: u.user.id, appel }
}
const post = (appel, chemin, body) => appel(chemin, { method: 'POST', body: JSON.stringify(body) })

try {
  console.log('\n── A. Validation de la sortie (unitaire, sans réseau)')
  T('écritures d’un montant : 12,50 · 12.50 · 12,5 · 12€50', ['12.50', '12,50', '12€50', '12,5'].every((e) => ecrituresPrix(12.5).includes(e)), JSON.stringify(ecrituresPrix(12.5)))
  T('« 6,20 € / plaque » contient 6.2', prixDansTexte(6.2, '8,27 € / M2 soit 6,20 € / plaque'))
  T('« 112,50 € » ne valide PAS 12,50', !prixDansTexte(12.5, 'Prix : 112,50 €'))
  T('« 7,90 € » ne valide pas 7,95', !prixDansTexte(7.95, 'Prix : 7,90 €'))
  const vuLe = new Date().toISOString()
  const cadre = (pages) => ({ artisanId: ARTISAN, interrogeables: [{ f: CASTO, domaine: domaineDe(CASTO.url) }, { f: BRICO, domaine: domaineDe(BRICO.url) }], pages: new Map(Object.entries(pages)), vuLe })
  const URL_OK = 'https://www.castorama.fr/plaque-ba13/123.prd'
  const base = { fournisseur: 'Castorama', designation_vue: 'Plaque de plâtre BA13 250 x 120', reference: '123', prix_vu: 6.2, ht_ou_ttc: 'TTC', unite: 'u', conditionnement: null, disponibilite_vue: 'En stock', url: URL_OK }
  const PAGE = { [URL_OK]: 'Plaque de plâtre BA13 250 x 120 cm — 6,20 € TTC la plaque. En stock.' }

  let v = validerSortie({ resultats: [{ ...base, extrait: 'Plaque de plâtre BA13 — prix en magasin' }], non_vus: [] }, cadre(PAGE))
  T('prix ABSENT de l’extrait ⇒ rejeté', v.resultats.length === 0 && v.rejets.some((r) => /extrait/.test(r)), JSON.stringify(v.rejets))
  v = validerSortie({ resultats: [{ ...base, extrait: 'Plaque BA13 : 6,20 € TTC' }], non_vus: [] }, cadre({ [URL_OK]: 'Plaque de plâtre BA13 — 7,90 € TTC' }))
  T('prix dans l’extrait mais ABSENT des pages récupérées ⇒ rejeté', v.resultats.length === 0 && v.rejets.some((r) => /page/.test(r)), JSON.stringify(v.rejets))
  v = validerSortie({ resultats: [{ ...base, url: 'https://www.leroymerlin.fr/ba13.html', extrait: 'BA13 : 6,20 €' }], non_vus: [] }, cadre(PAGE))
  T('lien hors des sites cochés ⇒ rejeté', v.resultats.length === 0 && v.rejets.some((r) => /hors des sites/.test(r)), JSON.stringify(v.rejets))
  v = validerSortie({ resultats: [{ ...base, extrait: '6,20 € TTC la plaque' }], non_vus: [{ fournisseur: 'Brico Dépôt', raison: 'prix affiché seulement après choix du dépôt' }] }, cadre(PAGE))
  T('résultat conforme ⇒ retenu, avec fournisseur_id, vu_le serveur et sceau', v.resultats.length === 1 && v.resultats[0].fournisseur_id === CASTO.id && v.resultats[0].vu_le === vuLe && /^[0-9a-f]{64}$/.test(v.resultats[0].sceau), JSON.stringify(v))
  T('le « non vu » du modèle est repris tel quel', v.nonVus.length === 1 && v.nonVus[0].fournisseur === 'Brico Dépôt' && /dépôt/.test(v.nonVus[0].raison), JSON.stringify(v.nonVus))
  const r0 = v.resultats[0]
  T('le sceau est valide pour cet artisan', sceauValide(ARTISAN, r0))
  T('… invalide pour un autre artisan', !sceauValide('00000000-0000-4000-8000-000000000099', r0))
  T('… invalide dès que le prix est retouché', !sceauValide(ARTISAN, { ...r0, prix_vu: 5.9 }))
  T('… invalide dès que le lien est retouché', !sceauValide(ARTISAN, { ...r0, url: 'https://www.castorama.fr/autre.prd' }))
  v = validerSortie({ resultats: [{ ...base, extrait: '6,20 € TTC' }], non_vus: [] }, cadre(PAGE))
  T('un fournisseur coché sans résultat ni explication est listé en « non vu »', v.nonVus.some((n) => n.fournisseur === 'Brico Dépôt'), JSON.stringify(v.nonVus))
  v = validerSortie({ resultats: Array.from({ length: 10 }, (_, i) => ({ ...base, url: `${URL_OK}?v=${i}`, extrait: '6,20 € TTC' })), non_vus: [] }, cadre(PAGE))
  T(`au plus ${MAX_RESULTATS} résultats`, v.resultats.length === MAX_RESULTATS, `${v.resultats.length}`)
  T('sortie illisible (null) ⇒ 0 résultat, tout en « non vu »', validerSortie(null, cadre(PAGE)).nonVus.length === 2)
  const sansAppel = await rechercherChezFournisseurs({ artisanId: ARTISAN, requete: 'BA13', fournisseurs: [REXEL], tier: 'standard', model: 'claude-haiku-4-5' })
  T('prix_publics=false ⇒ « non vu » avec la note d’accès, SANS appel IA', sansAppel.appels === 0 && sansAppel.resultats.length === 0 && sansAppel.nonVus[0]?.raison === NOTE_ACCES_CONNEXION, JSON.stringify(sansAppel))

  console.log('\n── C1. La route : identité et verrou d’offre (sans appel IA)')
  const sansJeton = await fetch(`${BASE}/api/inventaire/recherche`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"requete":"BA13"}' })
  T('sans jeton : 401', sansJeton.status === 401, `${sansJeton.status}`)
  const essentiel = await creer('essentiel', 'ess')
  const e1 = await post(essentiel.appel, '/api/inventaire/recherche', { requete: 'plaque BA13', tier: 'standard' })
  T('Essentiel → 403 sur la recherche', e1.statut === 403, `${e1.statut} ${JSON.stringify(e1.corps)}`)
  const e2 = await post(essentiel.appel, '/api/inventaire/recherche/retenir', { action: 'inventaire', resultat: {} })
  T('Essentiel → 403 sur « retenir »', e2.statut === 403, `${e2.statut}`)
  const page = await fetch(`${BASE}/inventaire/recherche`)
  T('/inventaire/recherche → 200', page.status === 200, `${page.status}`)

  const studio = await creer('studio', 'stu')

  console.log(`\n── B. Une VRAIE recherche : « plaque de plâtre BA13 » chez Castorama + Brico Dépôt (${process.env.TEST_TIER || 'standard'})`)
  // TEST_TIER=pro valide aussi la lecture séparée par Sonnet (2 appels au lieu d'1).
  const { model, tier } = resolveModel(process.env.TEST_TIER || 'standard', 'studio')
  const t0 = Date.now()
  const vraie = await rechercherChezFournisseurs({ artisanId: studio.uid, requete: 'plaque de plâtre BA13', quantite: 10, fournisseurs: [CASTO, BRICO, REXEL], tier, model, sansCache: true })
  const duree = Date.now() - t0
  console.log(`     ${vraie.resultats.length} résultat(s) en ${Math.round(duree / 1000)} s, ${vraie.appels} appel(s) API, modèle ${vraie.model}`)
  for (const r of vraie.resultats) console.log(`     · ${r.fournisseur} — ${r.designation_vue} — ${r.prix_vu} € ${r.ht_ou_ttc} — ${r.url}\n       « ${r.extrait} »`)
  for (const n of vraie.nonVus) console.log(`     · non vu : ${n.fournisseur} — ${n.raison}`)
  for (const j of vraie.journal) console.log(`     ∙ ${j}`)
  T('≥ 1 résultat', vraie.resultats.length >= 1)
  T('chaque lien est sur un domaine autorisé', vraie.resultats.every((r) => ['castorama.fr', 'bricodepot.fr'].some((d) => { const h = new URL(r.url).hostname; return h === d || h.endsWith(`.${d}`) })))
  T('chaque prix est présent dans l’extrait cité', vraie.resultats.every((r) => prixDansTexte(r.prix_vu, r.extrait)))
  T('chaque résultat porte fournisseur_id, vu_le (maintenant) et sceau', vraie.resultats.every((r) => r.fournisseur_id && Math.abs(Date.now() - new Date(r.vu_le).getTime()) < 120_000 && r.sceau))
  T('Rexel (sans prix publics) est « non vu » avec la note d’accès', vraie.nonVus.some((n) => n.fournisseur === 'Rexel' && n.raison === NOTE_ACCES_CONNEXION))
  T('sous 55 s, au plus 4 appels', duree < 55_000 && vraie.appels <= 4, `${duree} ms, ${vraie.appels} appels`)

  console.log('\n── C2. La route : limite horaire, sceau, enregistrement sur clic')
  const { error: eLim } = await admin.rpc('consommer_limite', { p_cle: `recherche:${studio.uid}`, p_max: 20, p_fenetre_s: 3600 })
  if (eLim) EN_ATTENTE('429 au-delà de 20 recherches / heure', `migration 0049 absente (${eLim.message})`)
  else {
    // 19 de plus (20 au total) : le compteur est plein, la route doit refuser SANS appel IA ni crédit.
    for (let i = 0; i < 19; i++) await admin.rpc('consommer_limite', { p_cle: `recherche:${studio.uid}`, p_max: 20, p_fenetre_s: 3600 })
    const trop = await post(studio.appel, '/api/inventaire/recherche', { requete: 'plaque BA13', fournisseur_ids: [], tier: 'standard' })
    // (sans fournisseur : 400 avant la limite — on force donc un fournisseur si la table existe)
    const { error: eFour } = await admin.from('fournisseurs').select('id').limit(0)
    if (eFour) EN_ATTENTE('429 au-delà de 20 recherches / heure', `migration 0048 absente (${eFour.message})`)
    else {
      await post(studio.appel, '/api/inventaire/fournisseurs', { liste_depart: true })
      const trop2 = await post(studio.appel, '/api/inventaire/recherche', { requete: 'plaque BA13', tier: 'standard' })
      T('la 21e recherche de l’heure est refusée en 429', trop2.statut === 429, `${trop2.statut} ${JSON.stringify(trop2.corps)}`)
    }
    void trop
  }
  // Si la recherche réelle n'a rien ramené (sites indisponibles à cet instant), on teste
  // l'enregistrement avec un résultat scellé par le moteur lui-même pour cet artisan : ce
  // qui est vérifié ici, c'est le clic « retenir », pas la chance du jour sur le web.
  let temoin = vraie.resultats[0]
  if (!temoin) {
    const base = { fournisseur: 'Castorama', fournisseur_id: null, designation_vue: 'Plaque de plâtre BA13 (témoin de test)', reference: 'TEST-F3', prix_vu: 6.2, ht_ou_ttc: 'TTC', unite: 'u', conditionnement: null, disponibilite_vue: 'En stock', url: 'https://www.castorama.fr/temoin-f3.prd', vu_le: new Date().toISOString(), extrait: '6,20 € TTC la plaque (témoin)' }
    temoin = { ...base, sceau: sceller(studio.uid, base) }
    console.log('     (aucun résultat réel : un témoin scellé sert aux tests d’enregistrement)')
  }
  const forge = { ...temoin, prix_vu: 0.01 }
  const f1 = await post(studio.appel, '/api/inventaire/recherche/retenir', { action: 'inventaire', resultat: forge })
  T('un résultat au prix retouché (sceau invalide) est refusé en 400', f1.statut === 400, `${f1.statut} ${JSON.stringify(f1.corps)}`)
  const autre = await creer('studio', 'autre')
  const f2 = await post(autre.appel, '/api/inventaire/recherche/retenir', { action: 'inventaire', resultat: temoin })
  T('un autre artisan ne peut pas retenir un résultat scellé pour le premier', f2.statut === 400, `${f2.statut}`)

  const { error: eObs } = await admin.from('prix_observations').select('id').limit(0)
  if (eObs) EN_ATTENTE('enregistrement sur clic (observation recherche_ia + fiche pré-remplie)', `migration 0048 absente (${eObs.message})`)
  else {
    const r1 = temoin
    const ret = await post(studio.appel, '/api/inventaire/recherche/retenir', { action: 'inventaire', resultat: r1, nom: 'Plaque BA13 (test F3)' })
    T('« Ajouter à l’inventaire » crée la fiche et l’observation', ret.statut === 200 && ret.corps?.materiau_id && ret.corps?.observation_id, `${ret.statut} ${JSON.stringify(ret.corps)}`)
    const fiche = await studio.appel(`/api/inventaire/materiaux?id=${ret.corps?.materiau_id}`)
    const o = fiche.corps?.observations?.[0]
    T('l’observation est « vue par l’assistant », avec le lien, l’extrait et le prix tel qu’affiché', o?.source === 'recherche_ia' && o.url === r1.url && (Number(o.prix_ht) === r1.prix_vu || Number(o.prix_ttc) === r1.prix_vu) && /\d/.test(o.extrait || ''), JSON.stringify(o))
    T('la fiche porte le prix vu, la date, le lien et la source', fiche.corps?.materiau?.prix_vu_ht === r1.prix_vu && fiche.corps.materiau.prix_vu_url === r1.url && fiche.corps.materiau.prix_vu_source === 'recherche_ia' && fiche.corps.prix_vu_a_reverifier === false, JSON.stringify(fiche.corps?.materiau))
    T('aucun prix d’achat inventé sur la fiche', fiche.corps?.materiau?.prix_achat_ht === null)
    const { data: obsAutre } = await admin.from('prix_observations').select('id').eq('artisan_id', autre.uid)
    T('rien n’a été écrit chez l’autre artisan (aucun stockage mutualisé)', (obsAutre ?? []).length === 0)
  }
  const { error: eLA } = await admin.from('lignes_achat').select('id').limit(0)
  if (eLA) EN_ATTENTE('ajout à la liste d’achat', `table lignes_achat absente (${eLA.message})`)
  else {
    const la = await post(studio.appel, '/api/inventaire/recherche/retenir', { action: 'liste_achat', resultat: temoin, quantite: 10 })
    T('« Ajouter à ma liste d’achat » crée une ligne dans sa liste ouverte', la.statut === 200 && la.corps?.ligne_id && la.corps?.liste_id, `${la.statut} ${JSON.stringify(la.corps)}`)
    const { data: lg } = await admin.from('lignes_achat').select('quantite, designation_libre, fournisseur, prix_cible_ht').eq('id', la.corps?.ligne_id ?? '00000000-0000-4000-8000-000000000000').maybeSingle()
    T('la ligne porte la quantité, la désignation vue, le fournisseur — et pas de prix HT inventé', lg && Number(lg.quantite) === 10 && /BA13/i.test(lg.designation_libre) && lg.fournisseur === temoin.fournisseur && (temoin.ht_ou_ttc === 'HT' ? Number(lg.prix_cible_ht) === temoin.prix_vu : lg.prix_cible_ht === null), JSON.stringify(lg))
  }
} catch (e) {
  ko++; console.log('  ❌ exception :', e.stack || e.message)
} finally {
  for (const uid of comptes) {
    await admin.from('listes_achat').delete().eq('artisan_id', uid)
    await admin.from('materiaux').delete().eq('artisan_id', uid)
    await admin.from('artisans').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid)
  }
  if (comptes.length) console.log(`🧹 ${comptes.length} comptes de test supprimés`)
}

if (attente.length) console.log(`\n⏸  ${ok} réussis, ${ko} échoués — ${attente.length} section(s) EN ATTENTE de migration : ${attente.join(' · ')}\n`)
else console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko ? 1 : attente.length ? 2 : 0)
