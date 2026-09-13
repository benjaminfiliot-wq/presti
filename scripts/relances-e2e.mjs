// « Relances automatiques » — la promesse de la grille, prouvée de bout en bout (registre
// `plans/promesses.md`, ligne 16 : jusqu'ici « pas de suite qui fait partir une relance »).
//
// Ce que cette suite prouve, en faisant réellement partir un email :
//   1. une relance due part UNE fois : `envoyee` passe à true, un message `relance` est tracé
//      dans le fil, et une deuxième exécution ne renvoie rien (idempotence par drapeau) ;
//   2. la cadence vendue est la cadence codée : J+2 / J+5 / J+10 depuis la demande, et seule
//      l'échéance atteinte part (les deux suivantes restent dues) ;
//   3. les conditions d'arrêt tiennent : prospect qui a répondu (`en_discussion`) ou devis
//      accepté (`gagne`) ⇒ relance ANNULÉE, sans email et sans trace dans le fil ;
//   4. les deux exclusions de l'audit final (F, 11 et F, majeur 8) tiennent : aucun email pour
//      un compte fondateur (compte de démonstration : ses « prospects » sont des visiteurs) ni
//      vers une adresse `.invalid` (chaque rebond abîme la réputation du domaine) ;
//   5. l'email est au nom de l'ARTISAN et ne dit jamais « Presti » — vérifié dans le journal
//      Resend (expéditeur affiché, sujet, Reply-To), pas seulement dans la base ;
//   6. la porte est fermée : sans `Authorization: Bearer <CRON_SECRET>`, la route rend 401.
//
// Ce qu'elle NE prouve PAS, et pourquoi :
//   · `CRON_SECRET` n'est pas dans `.env.local` : on ne peut pas appeler la route DÉPLOYÉE.
//     On importe donc `GET` (exportée) et on l'appelle en local avec un secret posé pour la
//     durée du test. Le code exécuté est le même ; le déclencheur (Vercel Cron) ne l'est pas.
//     Que la tâche soit bien enregistrée et active sur Vercel est vérifié ailleurs (auditeur F,
//     §1.1) ; que la route déployée refuse sans secret l'est par `fermeture-e2e`.
//   · aucun appel au modèle : `ANTHROPIC_BASE_URL` est envoyée sur un port mort, donc la route
//     part sur son texte de secours (`relanceTemplate`). C'est CE texte qui est vérifié. La
//     rédaction par l'IA a sa propre preuve (suites `cout: 'ia'`), pas celle-ci.
//
// Effets réels, assumés : la route fait aussi tourner la purge des comptes et la ronde des
// alertes (Vercel Hobby n'accorde que deux tâches planifiées, tout est chaîné là). Un email
// de relance part pour de vrai vers PRESTI_ALERTES_EMAIL — l'adresse de l'entreprise, jamais
// celle d'un prospect. La suite REFUSE de tourner si une relance d'un artisan réel est due au
// même moment : elle partirait, et un vrai prospect recevrait un email à cause d'un test.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/relances-e2e.mjs
//         (… --forcer  → passe outre le refus ci-dessus, en connaissance de cause)
import { register } from 'node:module'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// La route du cron importe `next/server` : Node ne résout ce sous-chemin qu'avec son extension,
// et le hook de `ts-loader.mjs` ne s'occupe que des chemins relatifs et de l'alias `@/`. Le
// crochet posé ici ne sert qu'aux imports DYNAMIQUES plus bas (les statiques sont déjà résolus).
register('data:text/javascript,' + encodeURIComponent(`
  export async function resolve(spec, ctx, next) {
    if (spec === 'next/server') return next('next/server.js', ctx)
    return next(spec, ctx)
  }
`))

// .env.local, SAUF la clé Anthropic : cette suite ne doit pouvoir appeler aucun modèle, même
// par accident (règle du sprint : zéro appel). Le SDK exige une clé non vide pour se
// construire, on lui en donne une fausse et on l'envoie sur un port mort.
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (!m || m[1] === 'ANTHROPIC_API_KEY' || process.env[m[1]]) continue
  process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
process.env.ANTHROPIC_API_KEY = 'suite-relances-aucun-appel'
process.env.ANTHROPIC_BASE_URL = 'http://127.0.0.1:1'
// Le secret du cron ne vit que dans Vercel : on en pose un le temps du test, et on prouve
// au passage qu'un mauvais secret est refusé.
const SECRET = 'cron-local-' + crypto.randomBytes(12).toString('hex')
process.env.CRON_SECRET = SECRET

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const CLE = process.env.SUPABASE_SERVICE_ROLE_KEY
// Deux régimes. Avec une clé d'envoi (poste de travail) : la relance part POUR DE VRAI vers
// l'adresse de l'entreprise, on prouve la livraison. Sans clé (intégration continue, qui n'en
// reçoit volontairement pas) : le contact est une adresse .invalid, que lib/email.ts n'envoie
// jamais et considère comme partie — on prouve alors la mécanique du cron, pas la livraison.
const ENVOI_REEL = !!process.env.RESEND_API_KEY && !process.argv.includes('--sans-envoi')
const ADRESSE = ENVOI_REEL ? (process.env.PRESTI_ALERTES_EMAIL || process.env.EMAIL_ENTREPRISE || '').trim() : 'relance-test@presti-test.invalid'
if (!SB || !CLE) { console.error('❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquantes dans .env.local'); process.exit(1) }
if (ENVOI_REEL && (!ADRESSE || /\.invalid$/i.test(ADRESSE))) {
  console.error('❌ PRESTI_ALERTES_EMAIL doit être une adresse RÉELLE que tu relèves : c’est elle qui reçoit la relance de test.')
  process.exit(1)
}
if (!ENVOI_REEL) console.log('ℹ️  Sans RESEND_API_KEY : contact .invalid, aucun email ne part — la mécanique est prouvée, pas la livraison.')

const admin = createClient(SB, CLE, { auth: { persistSession: false } })
const { relanceTemplate } = await import('../lib/ai.ts')
const { consommerLimite } = await import('../lib/limites.ts')

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const NOTE = (t) => console.log(`  ⏭  ${t}`)

const MARQUE = crypto.randomBytes(3).toString('hex')       // rend le nom d'artisan unique dans le journal Resend
const NOM_ARTISAN = `Couverture Deux-Rives ${MARQUE}`
const NOM_DEMO = `Démo Deux-Rives ${MARQUE}`
const SUJET_ATTENDU = `Suite à votre demande — ${NOM_ARTISAN}`
const SUJET_DEMO = `Suite à votre demande — ${NOM_DEMO}`
const CONTACT_INVALIDE = `prospect-${MARQUE}@presti-test.invalid`
const JOUR = 86_400_000
const comptes = []

// ── Journal Resend : ce qui est réellement parti (expéditeur affiché, sujet, Reply-To).
async function journalResend() {
  if (!process.env.RESEND_API_KEY) return null
  const r = await fetch('https://api.resend.com/emails?limit=30', { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } })
  if (!r.ok) return null
  const d = await r.json().catch(() => null)
  return Array.isArray(d?.data) ? d.data : null
}

async function creerArtisan(prefixe, nom, fondateur) {
  const email = `${prefixe}-${Date.now()}-${crypto.randomBytes(2).toString('hex')}@presti-test.invalid`
  const motDePasse = 'Relances-' + crypto.randomBytes(8).toString('hex') + '-Aa1'
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
  if (error) throw new Error(`création du compte ${prefixe} : ${error.message}`)
  const id = u.user.id
  comptes.push({ id, email })
  // Le service_role passe outre les verrous 0008/0055 : c'est le seul moyen de poser
  // `is_founder` pour prouver le filtre du cron.
  const { error: e2 } = await admin.from('artisans').upsert({
    id, email, nom, metier: 'Couvreur', ton_style: 'professionnel et direct',
    slug: `${prefixe}-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    plan: fondateur ? 'signature' : 'essentiel', is_founder: !!fondateur,
    reponse_auto: true, leads_pause: false, plateforme_active: true,
  })
  if (e2) throw new Error(`profil ${prefixe} : ${e2.message}`)
  return { id, email, nom, motDePasse }
}

// Un lead avec sa demande DATÉE : les relances se calculent depuis cette date, comme le fait
// `app/api/leads/route.ts` (jours = [2, 5, 10]).
async function creerLead(artisanId, { nomProspect, contact, statut, ilYAJours, rangs }) {
  const depart = Date.now() - ilYAJours * JOUR
  const { data: lead, error } = await admin.from('leads').insert({
    artisan_id: artisanId, nom_prospect: nomProspect, contact, canal: 'plateforme',
    message: 'Ma toiture fuit au-dessus de la chambre, 40 m² environ.',
    type_chantier: 'Couverture', statut, token: crypto.randomUUID(),
    created_at: new Date(depart).toISOString(), updated_at: new Date(depart).toISOString(),
  }).select('id').single()
  if (error) throw new Error(`lead ${nomProspect} : ${error.message}`)
  // `rangs: []` = aucune relance posée à la main : c'est au PRODUIT de les armer (§9).
  if (rangs.length) {
    const { error: e2 } = await admin.from('relances').insert(rangs.map((j, i) => ({
      lead_id: lead.id, planifiee_le: new Date(depart + j * JOUR).toISOString(), rang: i + 1, envoyee: false,
    })))
    if (e2) throw new Error(`relances ${nomProspect} : ${e2.message}`)
  }
  return lead.id
}

const relancesDe = async (leadId) => (await admin.from('relances').select('rang, envoyee, planifiee_le').eq('lead_id', leadId).order('rang')).data ?? []
const messagesDe = async (leadId) => (await admin.from('messages').select('type, sens, contenu').eq('lead_id', leadId).eq('type', 'relance')).data ?? []

try {
  // ── 0. Aucune relance d'un artisan RÉEL ne doit être due : elle partirait à cause du test.
  console.log('\n── 0. Rayon d’action : à qui la ronde va-t-elle écrire ?')
  const { data: dues } = await admin.from('relances').select('id, lead_id').eq('envoyee', false).lte('planifiee_le', new Date().toISOString()).limit(100)
  let risque = []
  if (dues?.length) {
    const { data: leads } = await admin.from('leads').select('id, contact, statut, artisan_id').in('id', dues.map((d) => d.lead_id))
    const { data: arts } = await admin.from('artisans').select('id, email, is_founder').in('id', [...new Set((leads ?? []).map((l) => l.artisan_id))])
    const parId = new Map((arts ?? []).map((a) => [a.id, a]))
    risque = (leads ?? []).filter((l) => {
      const a = parId.get(l.artisan_id)
      return l.statut === 'repondu' && !a?.is_founder && typeof l.contact === 'string' && l.contact.includes('@')
        && !/\.invalid$/i.test(l.contact) && !/@presti-test\.invalid$/i.test(a?.email ?? '')
    })
  }
  console.log(`  ${dues?.length ?? 0} relance(s) déjà dues en base, dont ${risque.length} qui partirai(en)t vers un vrai prospect.`)
  if (risque.length && !process.argv.includes('--forcer')) {
    console.log('\n❌ Suite interrompue : jouer la ronde enverrait un email à un prospect réel.')
    console.log('   Rejoue-la après le passage de 08:00 UTC, ou ajoute --forcer si tu sais ce que tu fais.')
    process.exit(1)
  }
  if (risque.length) NOTE(`--forcer : ${risque.length} relance(s) d’artisans réels vont partir avec celles du test`)
  T('la ronde ne touchera aucun prospect réel', risque.length === 0)

  // ── 1. Le décor : deux artisans, cinq situations
  console.log('\n── 1. Décor')
  const artisan = await creerArtisan('relances-artisan', NOM_ARTISAN, false)
  const demo = await creerArtisan('relances-demo', NOM_DEMO, true)
  T('artisan de test et compte fondateur créés', !!artisan.id && !!demo.id)

  // Le lead « suivi » porte la vraie cadence : demande il y a 3 jours ⇒ J+2 est due, J+5 et J+10 non.
  const suivi = await creerLead(artisan.id, { nomProspect: 'Camille', contact: ADRESSE, statut: 'repondu', ilYAJours: 3, rangs: [2, 5, 10] })
  const repondu = await creerLead(artisan.id, { nomProspect: 'Sofiane', contact: ADRESSE, statut: 'en_discussion', ilYAJours: 3, rangs: [2] })
  const gagne = await creerLead(artisan.id, { nomProspect: 'Nadia', contact: ADRESSE, statut: 'gagne', ilYAJours: 3, rangs: [2] })
  const fondateur = await creerLead(demo.id, { nomProspect: 'Visiteur', contact: ADRESSE, statut: 'repondu', ilYAJours: 3, rangs: [2] })
  const invalide = await creerLead(artisan.id, { nomProspect: 'Testeur', contact: CONTACT_INVALIDE, statut: 'repondu', ilYAJours: 3, rangs: [2] })

  const av = await relancesDe(suivi)
  T('cadence J+2 / J+5 / J+10 posée depuis la demande', av.length === 3 && av.every((r) => !r.envoyee), JSON.stringify(av.map((r) => r.rang)))
  const ecart = (i) => Math.round((Date.parse(av[i].planifiee_le) - (Date.now() - 3 * JOUR)) / JOUR)
  T('… soit 2, 5 et 10 jours', ecart(0) === 2 && ecart(1) === 5 && ecart(2) === 10, `${ecart(0)}/${ecart(1)}/${ecart(2)}`)
  // La cadence vendue doit être celle que le code POSE, pas seulement celle que ce test recopie.
  const sourceLeads = fs.readFileSync('app/api/leads/route.ts', 'utf8')
  T('la planification du produit pose bien [2, 5, 10]', /const\s+jours\s*=\s*\[\s*2\s*,\s*5\s*,\s*10\s*\]/.test(sourceLeads))

  // ── 2. La porte : le secret est obligatoire
  console.log('\n── 2. La porte du cron')
  const { GET } = await import('../app/api/cron/relances/route.ts')
  const appel = (entete) => GET(new Request('https://prestiapp.fr/api/cron/relances', { headers: entete ? { authorization: entete } : {} }))
  T('sans en-tête → 401', (await appel(null)).status === 401)
  T('mauvais secret → 401', (await appel('Bearer faux')).status === 401)

  // Le repli sur le texte de secours va déclencher l'alerte « panne IA » : on consomme son
  // verrou d'avance pour ne pas crier au loup pendant un test (une seule alerte par heure).
  await consommerLimite('alerte-ia:inconnu', 1, 3600)
  NOTE('verrou « alerte-ia:inconnu » consommé : la panne d’IA simulée n’alertera pas l’entreprise')

  // ── 3. La ronde part
  console.log('\n── 3. Premier passage')
  const res1 = await appel(`Bearer ${SECRET}`)
  T('avec le bon secret → 200', res1.status === 200, String(res1.status))
  const j1 = await res1.json()
  console.log(`  dues: ${j1.due} · envoyées: ${j1.sent} · annulées: ${j1.skipped} · purge: ${JSON.stringify(j1.purge)} · alertes: ${JSON.stringify(j1.alertes)}`)
  T('au moins une relance est partie', (j1.sent ?? 0) >= 1, JSON.stringify(j1))

  console.log('\n── 4. Le lead encore en attente : une relance, une seule')
  const ap = await relancesDe(suivi)
  // Une relance dont l'email n'est pas parti reste DUE (correctif F-5) : si ce contrôle est
  // rouge, la cause est presque toujours le plafond quotidien d'envois ou une panne Resend,
  // pas la logique de relance. Le dire ici évite une demi-heure de fausse piste.
  if (ap.find((r) => r.rang === 1)?.envoyee !== true) NOTE('rang 1 encore due : regarde le journal du script — `[cron/relances] email non parti` signifie plafond `emails:jour` atteint ou Resend en panne')
  T('rang 1 (J+2, échue) marquée envoyée', ap.find((r) => r.rang === 1)?.envoyee === true)
  T('rangs 2 et 3 (J+5, J+10) toujours dues', ap.filter((r) => r.rang > 1).every((r) => r.envoyee === false))
  const msgs = await messagesDe(suivi)
  T('exactement un message « relance » dans le fil', msgs.length === 1, `${msgs.length}`)
  const texte = msgs[0]?.contenu ?? ''
  T('le texte porte le nom de l’artisan', texte.includes(NOM_ARTISAN))
  T('le texte ne dit jamais « Presti »', !/presti/i.test(texte), texte.slice(0, 120))
  T('le texte est bien celui du repli (IA injoignable, aucun appel au modèle)', texte === relanceTemplate(NOM_ARTISAN, 'Camille', 1))
  T('le message est sortant', msgs[0]?.sens === 'out')

  console.log('\n── 5. Les conditions d’arrêt')
  for (const [nom, id] of [['le prospect a répondu (en_discussion)', repondu], ['le devis est accepté (gagne)', gagne]]) {
    const r = await relancesDe(id)
    const m = await messagesDe(id)
    T(`${nom} → relance annulée`, r[0]?.envoyee === true, JSON.stringify(r))
    T(`${nom} → aucun email, aucune trace dans le fil`, m.length === 0, `${m.length} message(s)`)
  }

  console.log('\n── 6. Les deux exclusions')
  const rf = await relancesDe(fondateur), mf = await messagesDe(fondateur)
  T('compte fondateur (démonstration) → relance annulée', rf[0]?.envoyee === true)
  T('compte fondateur → aucune trace dans le fil', mf.length === 0, `${mf.length} message(s)`)
  const ri = await relancesDe(invalide), mi = await messagesDe(invalide)
  // Une adresse .invalid n'est pas sautée par le cron : lib/email.ts la neutralise (rien ne part,
  // « comme si » c'était parti), donc la relance est traitée et le fil garde sa trace — la preuve
  // qu'aucun email n'a été expédié est en §7 (journal Resend), en envoi réel seulement.
  T('adresse .invalid → relance traitée', ri[0]?.envoyee === true)
  T('adresse .invalid → une trace dans le fil, rien d’expédié', mi.length === 1, `${mi.length} message(s)`)

  console.log('\n── 7. Ce que Resend a réellement expédié')
  await new Promise((r) => setTimeout(r, 2000)) // le journal Resend n'est pas instantané
  const jr = ENVOI_REEL ? await journalResend() : null
  if (!ENVOI_REEL) NOTE('mode sans envoi : rien n’est parti chez Resend, la livraison n’est pas vérifiée ici (elle l’est sur un poste avec la clé)')
  else if (!jr) NOTE('journal Resend illisible (RESEND_API_KEY absente ou API en erreur) — envoi non vérifié côté fournisseur')
  else {
    const partis = jr.filter((e) => e.subject === SUJET_ATTENDU)
    T('un email, et un seul, porte le sujet attendu', partis.length === 1, `${partis.length} · sujet « ${SUJET_ATTENDU} »`)
    const e = partis[0]
    if (e) {
      T('destinataire = le prospect', (e.to ?? []).includes(ADRESSE), JSON.stringify(e.to))
      T('l’expéditeur AFFICHÉ est l’artisan', String(e.from).startsWith(`${NOM_ARTISAN} <`), String(e.from))
      T('le sujet ne dit jamais « Presti »', !/presti/i.test(e.subject), e.subject)
      T('la réponse revient à l’artisan, jamais à l’éditeur', (e.reply_to ?? []).includes(artisan.email), JSON.stringify(e.reply_to))
      // Défaut connu et chiffré ailleurs (audit B-F3 / promesse 10) : seul le domaine
      // prestiapp.fr est vérifié chez Resend, l'ADRESSE d'expédition le laisse donc voir.
      if (/@prestiapp\.fr/.test(String(e.from))) NOTE(`résiduel connu (B-F3) : l’adresse d’expédition reste ${String(e.from).replace(/^.*</, '<')} — seul le nom affiché est en marque blanche`)
    }
    T('aucun email au nom du compte fondateur', !jr.some((x) => x.subject === SUJET_DEMO))
    T('aucun email vers l’adresse .invalid', !jr.some((x) => (x.to ?? []).includes(CONTACT_INVALIDE)))
  }

  console.log('\n── 8. Deuxième passage : rien ne repart')
  const res2 = await appel(`Bearer ${SECRET}`)
  const j2 = await res2.json()
  console.log(`  dues: ${j2.due} · envoyées: ${j2.sent} · annulées: ${j2.skipped}`)
  const msgs2 = await messagesDe(suivi)
  T('toujours un seul message « relance » dans le fil', msgs2.length === 1, `${msgs2.length}`)
  const ap2 = await relancesDe(suivi)
  T('les rangs 2 et 3 n’ont pas été avancés', ap2.filter((r) => r.rang > 1).every((r) => r.envoyee === false))
  await new Promise((r) => setTimeout(r, 2000))
  const jr2 = ENVOI_REEL ? await journalResend() : null
  if (jr2) T('Resend n’a pas expédié de doublon', jr2.filter((e) => e.subject === SUJET_ATTENDU).length === 1)

  // ── 9. La promesse tenue quand c'est l'ARTISAN qui répond (Essentiel, mode assisté)
  //
  // Le trou comblé le 10/09 : jusque-là, les trois relances n'étaient posées QUE dans la branche de
  // /api/leads qui suit une réponse écrite par l'assistant tout seul. Or l'assistant autonome se vend
  // à partir de Studio (`plateforme.ia.auto`) et le mode par défaut est « assistée » : un artisan en
  // Essentiel à 29 € — qui a pourtant « Relances automatiques » coché dans sa grille — n'en avait
  // jamais aucune, et un Studio en mode assisté non plus. Sur le code d'avant, cette section échoue :
  // zéro relance armée, et le lead restait en `en_discussion`, que le cron traite comme un ARRÊT.
  console.log('\n── 9. L’artisan répond de sa main (Essentiel, mode assisté)')
  const { verifierSessionTest } = await import('./lib/connexion-test.mjs')
  const { POST: posterMessage } = await import('../app/api/messages/route.ts')
  const { getPlateformeConfig } = await import('../lib/plateformeConfig.ts')

  const solo = await creerArtisan('relances-essentiel', `Menuiserie du Pont ${MARQUE}`, false)
  // Le mode par défaut, écrit noir sur blanc : l'assistant prépare, l'artisan envoie.
  const { error: eCfg } = await admin.from('plateforme_config').upsert({ artisan_id: solo.id, mode_reponse: 'assistee' })
  if (eCfg) throw new Error(`config plateforme : ${eCfg.message}`)
  const cfgSolo = await getPlateformeConfig(solo.id)
  T('le compte est en Essentiel, mode assisté', cfgSolo.mode_reponse === 'assistee', String(cfgSolo.mode_reponse))

  // Contact `.invalid` : cette section ne doit expédier aucun email, quel que soit le régime.
  const aLaMain = await creerLead(solo.id, { nomProspect: 'Lucie', contact: CONTACT_INVALIDE, statut: 'nouveau', ilYAJours: 0, rangs: [] })
  T('au départ, aucune relance — c’est au produit de les armer', (await relancesDe(aLaMain)).length === 0)

  // /api/messages exige un porteur révocable : il faut une VRAIE session, pas la clé service.
  const jetonSolo = await (async () => {
    const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: solo.email, password: solo.motDePasse }),
    })
    const j = await r.json()
    await verifierSessionTest(j.access_token)
    return j.access_token
  })()
  T('l’artisan a une session ouverte', !!jetonSolo)

  const repondreALaMain = (texte) => posterMessage(new Request('https://prestiapp.fr/api/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${jetonSolo}` },
    body: JSON.stringify({ action: 'reply', lead_id: aLaMain, message: texte }),
  }))

  const rep1 = await repondreALaMain('Bonjour Lucie, je peux passer jeudi matin prendre les mesures.')
  const jrep1 = await rep1.json().catch(() => ({}))
  T('la réponse manuelle part', rep1.status === 200 && jrep1.ok === true, `${rep1.status} · ${JSON.stringify(jrep1).slice(0, 120)}`)

  const { data: leadApres } = await admin.from('leads').select('statut').eq('id', aLaMain).maybeSingle()
  // `repondu` = « on a parlé en dernier ». `en_discussion` dit l'inverse et sert de condition
  // d'ARRÊT au cron (§5) : le poser ici éteignait les relances de sa propre réponse.
  T('le lead passe à « repondu », pas « en_discussion »', leadApres?.statut === 'repondu', String(leadApres?.statut))

  const posees = await relancesDe(aLaMain)
  T('les trois relances sont armées', posees.length === 3, `${posees.length} ligne(s)`)
  const dans = (i) => Math.round((Date.parse(posees[i]?.planifiee_le) - Date.now()) / JOUR)
  T('… à J+2, J+5 et J+10 depuis la réponse', posees.length === 3 && dans(0) === 2 && dans(1) === 5 && dans(2) === 10,
    posees.map((_, i) => dans(i)).join(' / '))

  await repondreALaMain('Petite précision : je serai là vers 9 h.')
  T('une deuxième réponse ne double pas la cadence', (await relancesDe(aLaMain)).length === 3)

  // La cadence vendue est celle que le code POSE — et un seul fichier l'écrit désormais.
  const sourceRelances = fs.readFileSync('lib/relances.ts', 'utf8')
  T('le planificateur du produit pose bien [2, 5, 10]', /CADENCE_RELANCES\s*=\s*\[\s*2\s*,\s*5\s*,\s*10\s*\]/.test(sourceRelances))

  // ── 10. Le cron prend ces relances-là : même filtre `statut = 'repondu'` que pour l'assistant.
  console.log('\n── 10. Le cron traite une relance née d’une réponse manuelle')
  await admin.from('relances').update({ planifiee_le: new Date(Date.now() - 3_600_000).toISOString() }).eq('lead_id', aLaMain).eq('rang', 1)
  const res3 = await appel(`Bearer ${SECRET}`)
  T('la ronde répond 200', res3.status === 200, String(res3.status))
  const apresCron = await relancesDe(aLaMain)
  T('la relance échue est traitée', apresCron.find((r) => r.rang === 1)?.envoyee === true, JSON.stringify(apresCron))
  T('les deux suivantes restent dues', apresCron.filter((r) => r.rang > 1).every((r) => r.envoyee === false))
  const filSolo = await messagesDe(aLaMain)
  T('une trace « relance » dans le fil, au nom de l’artisan', filSolo.length === 1 && filSolo[0].contenu.includes(solo.nom), `${filSolo.length} message(s)`)
} catch (e) {
  ko++; console.log('  ❌ exception —', e instanceof Error ? e.stack : e)
} finally {
  for (const c of comptes) {
    const { error } = await admin.rpc('purger_compte_test', { p_id: c.id })
    if (error && !/réservé/.test(error.message)) console.log('  ⚠️ purge de test :', error.message)
  }
  console.log(`\n🧹 ${comptes.length} compte(s) de test purgé(s) (leads, relances et messages partent avec)`)
}

console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués`)
process.exit(ko ? 1 : 0)
