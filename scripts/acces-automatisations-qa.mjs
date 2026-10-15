// Test d'ACCÈS des deux décisions de Benj du 15/10/2026 :
//   1. les automatisations de « Mes chiffres » (alerte e-mail sur les impayés, export mensuel au comptable) : offre Signature seulement
//      (capacité `chiffres.auto`), drapeaux levés (migration 0140) ;
//   2. les relances automatiques des factures impayées : à partir de Studio (capacité `factures.relances`).
// SANS réseau et SANS base : le passage quotidien de la compta (lib/comptaAutomatisationsTour.ts) est REJOUÉ sur une base en mémoire
// (supabaseAdmin.from remplacé) avec le fetch d'envoi ESPIONNÉ — aucun e-mail réel, aucun compte créé, rien à nettoyer.
// Il vérifie : la matrice par offre, le passage quotidien (seuls Signature/Business sont servis, les autres ne sont même pas lus),
// les gardes des routes (ordre : session → offre → base), l'écran Factures (réglage verrouillé + renvoi /abonnement), la migration 0140
// (gardes de session et de suspension). La preuve HTTP sur de vrais comptes est scripts/ecrans-offre-e2e.mjs.
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/acces-automatisations-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

process.env.RESEND_API_KEY = 'cle-factice-pour-le-juge'
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'cle-factice'
const RACINE = process.cwd()
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8')
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const echecs = []
let n = 0
const ok = (c, m) => { n++; if (!c) echecs.push(m) }

// Aucun envoi réel : tout appel réseau est capté. Seul l'envoi Resend est « réussi » (fausse réponse), et noté.
const envoyes = []
let autresReseau = 0
globalThis.fetch = async (url, init) => {
  if (String(url).includes('api.resend.com')) {
    const corps = JSON.parse(init?.body ?? '{}')
    envoyes.push({ to: [].concat(corps.to)[0], subject: corps.subject, pj: (corps.attachments ?? []).length })
    return new Response(JSON.stringify({ id: 'faux-id' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  // La pause générale (ops_interrupteur) : « non active » — c'est elle qui, sinon, bloque tout envoi (fail-closed). Aucune autre sortie.
  if (String(url).includes('/rest/v1/rpc/ops_interrupteur')) return new Response('false', { status: 200, headers: { 'Content-Type': 'application/json' } })
  // Le compteur d'envois par jour (consommer_limite) échoue « ouvert » sans base : ni envoi ni écriture, on laisse faire.
  if (String(url).includes('/rest/v1/rpc/consommer_limite')) throw new Error('compteur d’envois indisponible dans ce juge (échec ouvert)')
  autresReseau++
  throw new Error('réseau interdit dans ce juge : ' + url)
}

const P = await imp('lib/plans.ts')
const F = await imp('lib/flags.ts')
const { peut, offreMinimale, PLANS } = P

// ── 1. La matrice ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const TOUS = ['gratuit', 'essentiel', 'studio', 'signature', 'business']
const ATTENDU = {
  'chiffres.auto': { gratuit: false, essentiel: false, studio: false, signature: true, business: true },
  'factures.relances': { gratuit: false, essentiel: false, studio: true, signature: true, business: true },
}
for (const [cap, parPlan] of Object.entries(ATTENDU)) for (const p of TOUS) ok(peut(p, cap) === parPlan[p], `${cap} : ${p} devrait être ${parPlan[p]}`)
ok(offreMinimale('chiffres.auto') === 'signature' && offreMinimale('factures.relances') === 'studio', 'offres minimales : Signature pour chiffres.auto, Studio pour factures.relances')
ok(PLANS.business.capacites.includes('chiffres.auto') && PLANS.business.capacites.includes('factures.relances'), 'Business reprend Signature')
ok(peut('essentiel', 'relances') === true, 'les relances de CONVERSATION (J+2, J+5, J+10) restent dans Essentiel')
ok(['chiffres.auto', 'factures.relances'].every((c) => PLANS.essentiel.capacites.filter((x) => x === c).length === 0), 'Essentiel ne liste aucune des deux capacités (ni doublon)')

// ── 2. Les drapeaux ───────────────────────────────────────────────────────────────────────────────────────────────────────
ok(F.FLAGS.comptaAlerteImpayes === true && F.FLAGS.comptaExportMensuel === true && F.FLAGS.comptaDateReglement === true, 'drapeaux de la migration 0140 levés')
ok(F.FLAGS.relancesImpayes === true, 'drapeau relancesImpayes levé')
const grille = P.GRILLE_COMPLETE
for (const flag of ['comptaAlerteImpayes', 'comptaExportMensuel']) {
  const l = grille.find((x) => x.flag === flag)
  ok(!!l && l.cellules.essentiel === false && l.cellules.studio === false && l.cellules.signature !== false, `grille : la ligne ${flag} n'est pas cochée pour Essentiel/Studio, l'est pour Signature`)
  ok(P.GRILLE.includes(l), `grille : la ligne ${flag} est visible drapeau levé`)
}
{ const l = grille.find((x) => x.capacites.includes('factures.relances'))
  ok(!!l && l.cellules.essentiel === false && l.cellules.studio !== false && l.cellules.signature !== false, 'grille : relances d’impayés — Essentiel « — », Studio et Signature oui') }
ok(/relance seule vos factures impayées/.test(P.AUTOMATISATION.studio) && /alerte e-mail sur les impayés/.test(P.AUTOMATISATION.signature) && !/impayées/.test(P.AUTOMATISATION.essentiel), 'encart AUTOMATISATION : Studio relance les impayés, Signature ajoute l’alerte et l’export, Essentiel ni l’un ni l’autre')

// ── 3. Le passage quotidien de la compta, rejoué sur une base en mémoire ──────────────────────────────────────────────────────
const { supabaseAdmin } = await imp('lib/supabaseAdmin.ts')
const { tourCompta } = await imp('lib/comptaAutomatisationsTour.ts')
const MAINTENANT = new Date('2026-11-03T08:00:00Z')
const jour = (d) => new Date(MAINTENANT.getTime() - d * 86_400_000).toISOString().slice(0, 10)
const COMPTES = TOUS.map((plan) => ({ id: `art-${plan}`, plan, email: `${plan}@artisan.test`, nom: `Atelier ${plan}` }))
const REGLAGES = COMPTES.map((c) => ({ artisan_id: c.id, alerte_impayes: true, alerte_jours: 15, export_mensuel: true, export_email: `comptable-${c.plan}@cabinet.test`, dernier_export_mois: null }))
const FACTURES = COMPTES.map((c) => ({
  id: `fac-${c.plan}`, artisan_id: c.id, numero: `F-${c.plan}`, statut: 'emise', date_emission: jour(40), date_echeance: jour(30), total_ttc: 1000, avoir_de: null, client_nom: 'M. Durand', payee_le: null,
}))
const lectures = { artisans: [], factures: [] }
const ecrituresReglages = []
function constructeur(table) {
  const e = { table, op: 'select', filtres: {}, charge: null, un: false }
  const b = {
    select() { return b }, limit() { return b }, or() { return b }, in() { return b }, is() { return b },
    eq(col, val) { e.filtres[col] = val; return b },
    maybeSingle() { e.un = true; return b },
    upsert(c) { e.op = 'upsert'; e.charge = c; return b },
    update(c) { e.op = 'update'; e.charge = c; return b },
    delete() { e.op = 'delete'; return b },
    then(res, rej) { return Promise.resolve(repondre(e)).then(res, rej) },
  }
  return b
}
function repondre(e) {
  if (e.table === 'compta_reglages' && e.op === 'select') return { data: REGLAGES, error: null }
  if (e.table === 'compta_reglages' && e.op === 'update') { ecrituresReglages.push({ ...e.filtres, ...e.charge }); return { data: [{ artisan_id: e.filtres.artisan_id }], error: null } }
  if (e.table === 'artisans') { lectures.artisans.push(e.filtres.id); return { data: COMPTES.find((c) => c.id === e.filtres.id) ?? null, error: null } }
  if (e.table === 'factures') { lectures.factures.push(e.filtres.artisan_id); return { data: FACTURES.filter((f) => f.artisan_id === e.filtres.artisan_id), error: null } }
  if (e.table === 'compta_alertes_envoyees') {
    if (e.op === 'upsert') return { data: e.charge.map((x) => ({ facture_id: x.facture_id })), error: null }
    return { data: [], error: null }
  }
  return { data: null, error: { message: 'table inattendue ' + e.table } }
}
supabaseAdmin.from = (table) => constructeur(table)

const bilan = await tourCompta(MAINTENANT)
const destinataires = envoyes.map((x) => x.to).sort()
ok(!bilan.ferme && bilan.erreurs.length === 0, `le passage n'est pas fermé et sans erreur (${JSON.stringify(bilan)})`)
ok(JSON.stringify(destinataires) === JSON.stringify(['comptable-business@cabinet.test', 'comptable-signature@cabinet.test', 'business@artisan.test', 'signature@artisan.test'].sort()),
  `seuls Signature et Business reçoivent (alerte à l'artisan, export au comptable) : ${JSON.stringify(destinataires)}`)
for (const p of ['gratuit', 'essentiel', 'studio']) {
  ok(!envoyes.some((x) => x.to.startsWith(p) || x.to.includes(`-${p}@`)), `${p} : aucun e-mail (alerte ni export)`)
  ok(!lectures.factures.includes(`art-${p}`), `${p} : ses factures ne sont même pas lues`)
  ok(!ecrituresReglages.some((w) => w.artisan_id === `art-${p}`), `${p} : son mois d'export n'est pas « pris »`)
}
ok(envoyes.filter((x) => x.pj === 1).length === 2, 'l’export mensuel part avec son CSV en pièce jointe, pour les deux comptes servis')
ok(autresReseau === 0, `aucune autre tentative réseau (${autresReseau})`)

// ── 4. Les routes et l'écran (sources) ────────────────────────────────────────────────────────────────────────────────────
const reglages = lire('app/api/compta/reglages/route.ts')
for (const m of ['GET', 'PUT']) {
  const corps = reglages.slice(reglages.indexOf(`export async function ${m}`))
  ok(/exigerCapacite\(req, 'chiffres\.auto'/.test(corps) && corps.indexOf('exigerCapacite') < corps.indexOf('supabaseAdmin'), `compta/reglages ${m} : session + offre Signature AVANT toute lecture`)
}
const relances = lire('app/api/factures/relances-auto/route.ts')
ok(/peut\(data\.plan, 'factures\.relances'\)/.test(relances) && /code: 'offre', offre: offreMinimale\('factures\.relances'\)/.test(relances), 'relances-auto : refus 403 { code: \'offre\', offre } selon la capacité factures.relances')
for (const m of ['GET', 'PUT', 'POST']) {
  const debut = relances.indexOf(`export async function ${m}`)
  const corps = relances.slice(debut, relances.indexOf('export async function', debut + 10) > 0 ? relances.indexOf('export async function', debut + 10) : undefined)
  const iAuth = corps.indexOf('authArtisan(req)'), iDispo = corps.indexOf('await disponible('), iBase = corps.indexOf('supabaseAdmin')
  ok(iAuth > 0 && iDispo > iAuth && iBase > iDispo, `relances-auto ${m} : session (authArtisan) → offre (disponible) → base, dans cet ordre`)
}
ok(/ferme\(\)\) return NextResponse\.json\(\{ error: 'Introuvable' \}, \{ status: 404 \}\)/.test(relances), 'relances-auto : 404 drapeau baissé')
const tourRel = lire('lib/relancesImpayesTour.ts')
ok(/!peut\(art\.plan, 'factures\.relances'\)/.test(tourRel), 'passage quotidien des relances d’impayés : un compte sans la capacité est ignoré')
const tourCpt = lire('lib/comptaAutomatisationsTour.ts')
ok(tourCpt.indexOf("peut(artisan.plan, 'chiffres.auto')") > 0 && tourCpt.indexOf("peut(artisan.plan, 'chiffres.auto')") < tourCpt.indexOf(".from('factures')"), 'passage quotidien de la compta : la capacité est contrôlée avant de lire les factures')
const cron = sansCommentaires(lire('app/api/cron/relances/route.ts'))
ok(/tourCompta\(\)/.test(cron) && /tourRelancesImpayes\(/.test(cron), 'le cron appelle les deux passages')

const page = lire('app/factures/page.tsx')
ok(/status === 403 && .*code === 'offre'/.test(page) && /<RelancesVerrouillees plan=\{plan\} offre=\{verrouRelances\.offre\} \/>/.test(page), 'écran Factures : le 403 « offre » affiche le réglage verrouillé')
ok((page.match(/<RelancesVerrouillees /g) || []).length === 2, 'écran Factures : le verrou est montré avec ou sans facture')
const verrou = lire('app/factures/RelancesVerrouillees.tsx')
ok(/href="\/abonnement"/.test(verrou) && /disabled/.test(verrou) && /PLANS\[offre \?\? 'studio'\]/.test(verrou), 'réglage verrouillé : case désactivée, renvoi vers /abonnement, offre lue dans lib/plans.ts')
ok(!/\bStudio\b/.test(sansCommentaires(verrou).replace(/'studio'/g, '')), 'réglage verrouillé : le nom de l’offre vient de la matrice, jamais retapé')
const comparatif = lire('lib/comparatifConcurrents.ts')
ok(!/relances automatiques dès \$\{PLANS\.essentiel\.label\}/.test(comparatif) && !/prix\('essentiel'\)\} € par mois\)\./.test(comparatif), 'comparatif : plus aucun « relances dès Essentiel »')

// ── 5. La migration 0140 ──────────────────────────────────────────────────────────────────────────────────────────────────
const mig = lire('supabase/migrations/0140_compta_automatisations.sql')
ok(/create policy compta_reglages_own/.test(mig) && /compta_alertes_envoyees enable row level security/.test(mig), '0140 : RLS sur les deux tables')
ok(/policy garde_session on public\.%I as restrictive/.test(mig) && /jeton_session_valide/.test(mig) && /compte_non_suspendu/.test(mig), '0140 : gardes de session et de suspension (comme 0157-0159)')
ok(/revoke all on public\.%I from anon/.test(mig) && /revoke all on public\.compta_alertes_envoyees from anon, authenticated/.test(mig), '0140 : rien pour anon ; table des alertes réservée au service')

// ── 6. Le juge s'attaque lui-même ─────────────────────────────────────────────────────────────────────────────────────────
{
  const m = JSON.parse(JSON.stringify(PLANS)); m.studio.capacites.push('chiffres.auto'); m.essentiel.capacites.push('factures.relances')
  ok(m.studio.capacites.includes('chiffres.auto') && !PLANS.studio.capacites.includes('chiffres.auto'), 'mutation vue : Studio qui aurait les automatisations de Mes chiffres')
  ok(m.essentiel.capacites.includes('factures.relances') && !PLANS.essentiel.capacites.includes('factures.relances'), 'mutation vue : Essentiel qui aurait encore les relances d’impayés')
  ok(!/peut\(artisan\.plan, 'chiffres\.auto'\)/.test(tourCpt.replace("peut(artisan.plan, 'chiffres.auto')", 'true')), 'mutation vue : un passage sans le contrôle de la capacité')
}

if (echecs.length) { console.log(`❌ acces-automatisations-qa : ${echecs.length} échec(s) sur ${n}`); echecs.forEach((e) => console.log('  - ' + e)); process.exit(1) }
console.log(`✅ acces-automatisations-qa : ${n}/${n} contrôles — chiffres.auto : Signature seulement ; factures.relances : dès Studio ; ${envoyes.length} e-mails simulés (Signature + Business), 0 pour Essai/Essentiel/Studio`)
