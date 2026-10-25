// La plateforme commence avec Studio (Benj, 15/10/2026 : « Dans Essentiel il n'y a PAS de plateforme »). Ce juge rejoue la VRAIE route POST /api/leads
// (transpilée et lancée contre un faux Supabase, comme FS-11 / FS-12 de scripts/formulaire-site-qa.mjs) pour les deux entrées publiques :
//   • la PAGE DE CONVERSATION (le slug seul) : un compte Essai ou resté sur l’ancien Essentiel (hérité, plus vendu depuis le 25/10 : capacités de base) reçoit 403 { code: 'plateforme' } — rien n'est enregistré (ni demande, ni message,
//     ni relance), aucun crédit n'est débité ; Studio (et au-dessus) la sert comme avant ;
//   • le FORMULAIRE d'un site commandé (la commande renseignée) : le site vitrine n'est pas la plateforme, la demande continue d'arriver même sans elle — elle est
//     gardée (une demande, un message), l'artisan est prévenu, mais ni IA, ni crédit, ni relance ne partent.
// Sans réseau, sans base réelle, sans e-mail.
//
// Usage : node scripts/plateforme-formulaire-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chargerRoute } from './formulaire-site-qa.mjs'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const echecs = []
let n = 0
const ok = (cond, msg) => { n++; if (!cond) echecs.push(msg) }

const ID = (k) => `00000000-0000-4000-8000-0000000260${String(k).padStart(2, '0')}`
const COMMANDE = (k) => `00000000-0000-4000-8000-00000026c0${String(k).padStart(2, '0')}`
const art = (x) => ({ slugs_anciens: [], metier: 'plombier', email_public: null, tel_public: null, leads_pause: false, site_active: false, plateforme_active: true, suppression_demandee_le: null, is_founder: false, ton_style: null, services: [], zone_intervention: null, bio: null, tva_regime: null, assurance_nom: null, domaine: null, domaine_verifie: false, credits: 40, ...x })
const base = () => ({
  artisans: [
    art({ id: ID(1), slug: 'atelier-essai', nom: 'Atelier Essai', email: 'essai@exemple.invalid', plan: 'gratuit' }),
    art({ id: ID(2), slug: 'atelier-essentiel', nom: 'Atelier Essentiel', email: 'essentiel@exemple.invalid', plan: 'essentiel' }),
    art({ id: ID(3), slug: 'atelier-studio', nom: 'Atelier Studio', email: 'studio@exemple.invalid', plan: 'studio', leads_pause: true }),
    art({ id: ID(4), slug: 'atelier-signature', nom: 'Atelier Signature', email: 'signature@exemple.invalid', plan: 'signature', leads_pause: true }),
    art({ id: ID(5), slug: 'atelier-fondateur', nom: 'Atelier Fondateur', email: 'fondateur@exemple.invalid', plan: 'gratuit', is_founder: true, leads_pause: true }),
  ],
  sites_commandes: [1, 2, 3].map((k) => ({ id: COMMANDE(k), artisan_id: ID(k), etat: 'en_ligne', email: 'commande@exemple.invalid', domaine_mode: 'existant', metier: 'plombier', communes: ['Rennes'], prix_cents: 30000, domaine: `atelier-${k}.invalid` })),
  leads: [], messages: [], relances: [],
})

async function jouer(corps, routeSource = null) {
  const r = await chargerRoute({ racine: RACINE, base: base(), projeter: true, routeSource })
  const req = { json: async () => JSON.parse(JSON.stringify({ contact: '02 61 91 00 26', nom_prospect: null, message: 'Projet : Chauffe-eau · Commune : Rennes', website: '', ...corps })), headers: new Headers({ 'x-forwarded-for': '203.0.113.26' }) }
  const rep = await r.POST(req)
  return { statut: rep?.status, corps: rep?.corps ?? {}, base: r.base, journal: r.journal ?? [] }
}
// Les doublures de formulaire-site-qa notent chaque envoi dans le journal ; consumeCredit y répond « épuisé » (alors la route renvoie `raison: 'credits'`) :
// une route sans plateforme ne doit donc ni débiter (aucune `raison`), ni rendre un crédit, ni écrire à personne.
const appels = (r, quoi) => r.journal.filter((j) => j.table === `doublure:${quoi}`).length
const sansCredit = (r) => !('raison' in r.corps) && appels(r, 'rendreCredit') === 0

// 1. La page de conversation (le slug seul) : refusée sans plateforme, rien n'est enregistré.
for (const [slug, offre] of [['atelier-essai', 'Essai'], ['atelier-essentiel', 'Essentiel']]) {
  const r = await jouer({ slug })
  ok(r.statut === 403 && r.corps.code === 'plateforme' && /ne reçoit pas de demandes en ligne/.test(r.corps.error ?? ''), `${offre} · page de conversation : 403 { code: 'plateforme' } et message neutre (reçu : ${r.statut} ${JSON.stringify(r.corps).slice(0, 100)})`)
  ok(r.base.leads.length === 0 && r.base.messages.length === 0 && r.base.relances.length === 0, `${offre} · page de conversation : aucune demande, aucun message, aucune relance enregistrés`)
  ok(sansCredit(r), `${offre} · page de conversation : aucun crédit consommé`)
  ok(appels(r, 'sendEmail') === 0 && appels(r, 'notifierArtisan') === 0, `${offre} · page de conversation : aucun e-mail, aucune notification`)
}

// 2. Studio, Signature et le fondateur : la page est servie (comptes en pause : la demande est gardée, aucune IA ne part).
for (const [slug, offre] of [['atelier-studio', 'Studio'], ['atelier-signature', 'Signature'], ['atelier-fondateur', 'Fondateur']]) {
  const r = await jouer({ slug })
  ok(r.statut === 200 && r.corps.ok === true && r.corps.code !== 'plateforme' && r.base.leads.length === 1, `${offre} · page de conversation : servie, demande enregistrée (reçu : ${r.statut} ${JSON.stringify(r.corps).slice(0, 100)}, ${r.base.leads.length} demande(s))`)
}

// 3. Le formulaire d'un site commandé : continue d'arriver sans plateforme — gardé, sans IA, sans crédit, sans relance.
for (const [k, offre] of [[1, 'Essai'], [2, 'Essentiel']]) {
  const r = await jouer({ commande: COMMANDE(k), slug: k === 1 ? 'atelier-essai' : 'atelier-essentiel' })
  ok(r.statut === 200 && r.corps.ok === true && r.corps.sansPlateforme === true && r.corps.reply === null, `${offre} · formulaire du site commandé : 200 sans plateforme et sans réponse IA (reçu : ${r.statut} ${JSON.stringify(r.corps).slice(0, 120)})`)
  ok(r.base.leads.length === 1 && r.base.leads[0].artisan_id === ID(k), `${offre} · formulaire du site commandé : la demande est gardée chez l'artisan de la commande`)
  ok(r.base.relances.length === 0, `${offre} · formulaire du site commandé : aucune relance armée`)
  ok(sansCredit(r), `${offre} · formulaire du site commandé : aucun crédit consommé`)
  ok(!r.base.messages.some((m) => m.sens === 'out'), `${offre} · formulaire du site commandé : aucune réponse partie au nom de l'artisan`)
  ok(appels(r, 'sendEmail') === 1 && appels(r, 'notifierArtisan') === 0, `${offre} · formulaire du site commandé : un seul e-mail, à l'artisan (pas de notification poussée vers Messages, pas d'accusé au client) (e-mails : ${appels(r, 'sendEmail')}, notifications : ${appels(r, 'notifierArtisan')})`)
}
{
  // Studio, compte en pause : le chemin d'avant (pause), inchangé.
  const r = await jouer({ commande: COMMANDE(3) })
  ok(r.statut === 200 && r.corps.paused === true && !r.corps.sansPlateforme, `Studio · formulaire du site commandé : chemin inchangé (pause) (reçu : ${r.statut} ${JSON.stringify(r.corps).slice(0, 100)})`)
}

// 4. Le juge se teste : la route sans sa garde, ou qui laisse l'IA répondre au formulaire d'un site sans plateforme, DOIT être vue.
{
  const source = fs.readFileSync(path.join(RACINE, 'app/api/leads/route.ts'), 'utf8')
  const sansGarde = source.replace('if (!plateforme && !commandeDonnee) {', 'if (false) {')
  ok(sansGarde !== source, 'mutation 1 : la garde est introuvable dans la route')
  const m1 = await jouer({ slug: 'atelier-essentiel' }, sansGarde)
  ok(!(m1.statut === 403 && m1.corps.code === 'plateforme'), 'mutation 1 non vue : la route sans garde refuserait encore la page de conversation')
  const sansBranche = source.replace('if (!plateforme) {', 'if (false) {')
  ok(sansBranche !== source, 'mutation 2 : la branche « sans plateforme » est introuvable dans la route')
  const m2 = await jouer({ commande: COMMANDE(2), slug: 'atelier-essentiel' }, sansBranche)
  ok(!(m2.corps.sansPlateforme === true && appels(m2, 'sendEmail') === 1 && !('raison' in m2.corps)), "mutation 2 non vue : la route qui laisse l'IA et les crédits au formulaire d'un compte sans plateforme passerait le juge")
}

if (echecs.length) {
  console.log(`❌ plateforme-formulaire-qa : ${echecs.length} échec(s) sur ${n} contrôles`)
  for (const e of echecs) console.log('  - ' + e)
  process.exit(1)
}
console.log(`✅ plateforme-formulaire-qa : ${n}/${n} contrôles — Essai et Essentiel : page de conversation refusée (403, rien d'enregistré, aucun crédit) ; formulaire de site commandé gardé sans IA ; Studio, Signature, fondateur : servis`)
