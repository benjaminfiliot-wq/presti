// Test permanent — le classement des courriers de l'entreprise (migration 0072, prompt v11).
//
// Demandé par Benj le 07/09 : « je veux qu'il reçoive tous les mails et qu'il les traite selon si
// c'est un client qui nous envoie un message ou un abonnement etc. »
//
// Ce que cette suite prouve, dans l'ordre où ça compte :
//
//   A. la RÉSOLUTION de la boîte : une adresse Gmail ne se relève pas sur le serveur d'OVH. Deux
//      fichiers du dépôt donnaient deux serveurs différents pour le même compte, et la relève
//      échouait sur « Command failed » sans que rien ne dise pourquoi (constaté le 07/09) ;
//   B. le CLASSEMENT, règle par règle, sur une table de cas — sans relever aucune boîte. C'est
//      possible parce que `nature_courrier` est immutable et sans accès table : on lui donne un
//      expéditeur, un sujet, des en-têtes, elle rend une nature. Un classement déterministe se
//      prouve ; c'est toute la raison de ne pas appeler un modèle ici ;
//   C. l'ORDRE des règles, qui est un ordre de danger : les six cas où une règle mal placée
//      enterrerait un message vivant ;
//   D. le VERROU du manuel : une correction faite à la main n'est jamais rejouée par une relève
//      ni par un reclassement de masse. Sans lui, le cron efface chaque matin le rangement de la veille.
//
// Aucun appel IA. Aucun email envoyé. Aucune boîte relevée.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/courriers-e2e.mjs

import crypto from 'node:crypto'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }

// Sortie douce : sur Windows, un `process.exit()` immédiat déclenche parfois une assertion libuv
// (UV_HANDLE_CLOSING) pendant la fermeture des connexions. Un faux rouge coûte plus cher qu'un test
// manquant — on finit par ne plus lire le lanceur.
const sortir = (code) => { process.exitCode = code; setTimeout(() => process.exit(code), 200) }

const marque = `courriers-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
const aEffacer = []

// ── A. La résolution de la boîte ──────────────────────────────────────────────────────────────────
async function resolution() {
  console.log('\n── A. Sur quel serveur on va chercher le courrier')
  const { boiteEntrepriseResolue } = await import('../lib/canaux.ts')
  const garder = { u: process.env.IMAP_USER, p: process.env.IMAP_PASS, h: process.env.IMAP_HOST,
    pu: process.env.PRESTI_MAIL_IMAP_USER, pp: process.env.PRESTI_MAIL_IMAP_PASS }
  const poser = (u, p, h) => {
    for (const k of ['IMAP_USER', 'IMAP_PASS', 'IMAP_HOST', 'PRESTI_MAIL_IMAP_USER', 'PRESTI_MAIL_IMAP_PASS']) delete process.env[k]
    if (u) process.env.IMAP_USER = u
    if (p) process.env.IMAP_PASS = p
    if (h) process.env.IMAP_HOST = h
  }
  try {
    poser('', '', '')
    T('sans identifiants : rien, et surtout pas un serveur par défaut', boiteEntrepriseResolue() === null)

    poser('contact@prestiapp.fr', 'x', '')
    T('adresse du domaine → le serveur d’OVH (les MX de prestiapp.fr y pointent)', boiteEntrepriseResolue()?.hote === 'ssl0.ovh.net', JSON.stringify(boiteEntrepriseResolue()))

    poser('quelquun@gmail.com', 'x', '')
    const g = boiteEntrepriseResolue()
    T('adresse Gmail → imap.gmail.com, PAS le serveur d’OVH', g?.hote === 'imap.gmail.com', JSON.stringify(g))
    T('… et l’écran peut dire que l’hôte a été deviné', g?.devine === true)

    poser('quelquun@gmail.com', 'x', 'imap.choisi-a-la-main.fr')
    const h = boiteEntrepriseResolue()
    T('IMAP_HOST posé à la main gagne sur la déduction', h?.hote === 'imap.choisi-a-la-main.fr' && h?.devine === false, JSON.stringify(h))

    poser('', '', '')
    process.env.PRESTI_MAIL_IMAP_USER = 'contact@prestiapp.fr'
    process.env.PRESTI_MAIL_IMAP_PASS = 'x'
    T('les deux préfixes de variables sont acceptés (PRESTI_MAIL_IMAP_*)', boiteEntrepriseResolue()?.user === 'contact@prestiapp.fr')

    // Le défaut qui rend « cassé » indiscernable de « calme » : si l'adresse à laquelle Presti
    // s'écrit n'est pas celle qu'on relève, la boîte relevée ne contient AUCUN de nos messages.
    // Ni le formulaire de contact, ni les alertes, ni les notifications de paiement — et une boîte
    // vide ressemble exactement à une boîte tranquille.
    for (const k of ['IMAP_USER', 'IMAP_PASS', 'PRESTI_MAIL_IMAP_USER', 'PRESTI_MAIL_IMAP_PASS']) delete process.env[k]
    if (garder.u) process.env.IMAP_USER = garder.u
    if (garder.p) process.env.IMAP_PASS = garder.p
    if (garder.pu) process.env.PRESTI_MAIL_IMAP_USER = garder.pu
    if (garder.pp) process.env.PRESTI_MAIL_IMAP_PASS = garder.pp
    const reelle = boiteEntrepriseResolue()
    const { EMAIL_ENTREPRISE } = await import('../lib/email.ts')
    if (!reelle) {
      console.log(`  ⏭  boîte non configurée ici : l’alignement avec ${EMAIL_ENTREPRISE} se vérifie là où les identifiants existent (production)`)
    } else {
      T(`la boîte relevée est celle où Presti s’écrit (${EMAIL_ENTREPRISE})`,
        reelle.user.toLowerCase() === EMAIL_ENTREPRISE.toLowerCase(),
        `Presti écrit à ${EMAIL_ENTREPRISE}, on relève ${reelle.user} — aucun de nos messages n’arrive dans la boîte relevée`)
    }
  } finally {
    for (const k of ['IMAP_USER', 'IMAP_PASS', 'IMAP_HOST', 'PRESTI_MAIL_IMAP_USER', 'PRESTI_MAIL_IMAP_PASS']) delete process.env[k]
    if (garder.u) process.env.IMAP_USER = garder.u
    if (garder.p) process.env.IMAP_PASS = garder.p
    if (garder.h) process.env.IMAP_HOST = garder.h
    if (garder.pu) process.env.PRESTI_MAIL_IMAP_USER = garder.pu
    if (garder.pp) process.env.PRESTI_MAIL_IMAP_PASS = garder.pp
  }
}

// ── B et C. Le classement, cas par cas ────────────────────────────────────────────────────────────
const NOUS = 'contact@prestiapp.fr'

/** Chaque cas : ce qui arrive, ce qui doit en sortir, et POURQUOI ça compte. */
const CAS = [
  // Le formulaire du site : le message le plus important de la boîte. Il vient de NOTRE adresse.
  { nom: 'formulaire du site → prospect (et surtout PAS technique)', de: NOUS, sujet: '[Presti] Message de Claire Dubois',
    attendu: 'prospect', motif: 'formulaire:contact' },
  { nom: 'un visiteur qui s’appelle « [SIMULATION] » ne se cache pas', de: NOUS, sujet: '[Presti] Message de [SIMULATION] Truc',
    attendu: 'technique', motif: 'interne:simulation',
    note: 'la simulation passe AVANT le formulaire, sinon on se cache derrière son propre nom' },

  // L'argent : nos propres notifications, malgré leur deuxième personne.
  { nom: 'paiement → abonnement', de: NOUS, sujet: '[Presti] Paiement — Jean Dupont', attendu: 'abonnement', motif: 'interne:argent' },
  { nom: '« Votre paiement a échoué » est une notification INTERNE', de: NOUS, sujet: '[Presti] Votre paiement a échoué — Jean Dupont',
    attendu: 'abonnement', motif: 'interne:argent' },
  { nom: 'résiliation → abonnement', de: NOUS, sujet: '[Presti] Résiliation — Atelier du Chêne', attendu: 'abonnement', motif: 'interne:argent' },
  { nom: 'nouvel artisan → abonnement', de: NOUS, sujet: '[Presti] Nouvel artisan — Sophie Martin', attendu: 'abonnement', motif: 'interne:argent' },
  { nom: 'le même sujet venu de DEHORS ne mord pas (aimant à hameçonnage)', de: 'pirate@ailleurs.example',
    sujet: '[Presti] Paiement — Jean Dupont', attendu: 'a_lire', motif: 'defaut' },

  // Nos alertes, avec leurs apostrophes typographiques et leurs cadratins.
  { nom: 'alerte de solde IA (apostrophe ’ et cadratin —) → technique', de: NOUS, sujet: '[Presti] URGENT — le solde de l’API est épuisé',
    attendu: 'technique', motif: 'interne:repertorie',
    note: 'la normalisation du sujet est ce qui fait mordre ce motif' },
  { nom: 'compte à zéro crédit, nombre variable → technique', de: NOUS, sujet: '[Presti] 3 compte(s) à zéro crédit cette semaine',
    attendu: 'technique', motif: 'interne:repertorie' },
  { nom: 'point de la semaine → technique', de: NOUS, sujet: '[Presti] Presti — point de la semaine', attendu: 'technique', motif: 'interne:repertorie' },
  { nom: 'une alerte NEUVE, pas encore répertoriée, reste lue et se signale', de: NOUS, sujet: '[Presti] Un motif inventé demain',
    attendu: 'technique', motif: 'interne:non-repertorie' },
  { nom: 'notre adresse sans aucun de nos préfixes ne mord pas', de: NOUS, sujet: 'Coucou', attendu: 'a_lire', motif: 'defaut' },

  // La non-remise, testée en premier parce qu'elle porte les en-têtes du message d'origine.
  { nom: 'rapport de non-remise (structure MIME) → non remis', de: 'mailer-daemon@ovh.net', sujet: 'Delivery Status Notification',
    entetes: { rapport_remise: true }, attendu: 'non_remise', motif: 'remise:mime' },
  { nom: 'daemon + return-path vide → non remis', de: 'MAILER-DAEMON@ovh.net', sujet: 'Undelivered Mail Returned to Sender',
    entetes: { return_path: '<>' }, attendu: 'non_remise', motif: 'remise:daemon' },
  { nom: 'une non-remise DANS un fil connu reste une non-remise', de: 'mailer-daemon@ovh.net', sujet: 'Mail delivery failed',
    entetes: { rapport_remise: true }, filConnu: true, attendu: 'non_remise', motif: 'remise:mime',
    note: 'testée après le fil, un devis jamais arrivé se lirait comme « un humain m’a répondu »' },
  { nom: 'le SUJET seul d’une non-remise ne suffit jamais', de: 'pirate@ailleurs.example', sujet: 'Mail delivery failed',
    attendu: 'a_lire', motif: 'defaut' },

  // L'artisan : la preuve la plus forte, une jointure sur notre base.
  { nom: 'un artisan inscrit → artisan', de: 'un-artisan@exemple.fr', sujet: 'Une question sur mon devis',
    estArtisan: true, attendu: 'artisan', motif: 'artisan' },
  { nom: 'un artisan dont l’outil colle un List-Unsubscribe reste un artisan', de: 'un-artisan@exemple.fr', sujet: 'Ma signature',
    estArtisan: true, entetes: { list_unsubscribe: '<mailto:stop@outil.fr>' }, attendu: 'artisan', motif: 'artisan' },
  { nom: 'un artisan en réponse automatique → artisan, pas « rien à faire »', de: 'un-artisan@exemple.fr', sujet: 'Absent jusqu’au 15',
    estArtisan: true, entetes: { auto_submitted: 'auto-replied' }, attendu: 'artisan', motif: 'artisan',
    note: 'cinq secondes de lecture contre un client perdu' },

  // Les robots.
  { nom: 'répondeur automatique d’un inconnu → réponse automatique', de: 'quelquun@ailleurs.example', sujet: 'Absent du bureau',
    entetes: { auto_submitted: 'auto-replied' }, attendu: 'reponse_auto', motif: 'entete:auto-submitted' },
  { nom: '« Auto-Submitted: no » n’est PAS un robot', de: 'quelquun@ailleurs.example', sujet: 'Bonjour',
    entetes: { auto_submitted: 'no' }, attendu: 'a_lire', motif: 'defaut' },
  { nom: 'liste de diffusion → diffusion', de: 'news@quelquechose.example', sujet: 'Notre lettre du mois',
    entetes: { list_unsubscribe: '<https://x.example/stop>' }, attendu: 'diffusion', motif: 'entete:liste' },
  { nom: 'Precedence: bulk → diffusion', de: 'promo@quelquechose.example', sujet: 'Offre spéciale',
    entetes: { precedence: 'bulk' }, attendu: 'diffusion', motif: 'entete:liste' },

  // Le fil, et le doute.
  { nom: 'réponse dans un fil que nous avons ouvert → prospect', de: 'client@ailleurs.example', sujet: 'Re: votre devis',
    filConnu: true, attendu: 'prospect', motif: 'fil:reponse' },
  { nom: 'un « Re: » sans fil connu ne suffit pas (Re: se tape à la main)', de: 'client@ailleurs.example', sujet: 'Re: votre devis',
    attendu: 'a_lire', motif: 'defaut' },
  { nom: 'rapport DMARC agrégé → technique', de: 'noreply-dmarc-support@google.com', sujet: 'Report domain: prestiapp.fr Submitter: google.com',
    attendu: 'technique', motif: 'dmarc:rapport' },
  { nom: 'un inconnu sans aucun signal → à lire (le doute, jamais une poubelle)', de: 'inconnu@ailleurs.example', sujet: 'Bonjour',
    attendu: 'a_lire', motif: 'defaut' },
]

async function classement() {
  console.log('\n── B et C. Le classement, règle par règle (aucune boîte relevée, aucun appel IA)')
  for (const c of CAS) {
    const { data, error } = await admin.rpc('nature_courrier', {
      p_email: c.de, p_sujet: c.sujet, p_entetes: c.entetes ?? {},
      p_est_artisan: !!c.estArtisan, p_fil_connu: !!c.filConnu,
    })
    if (error) { T(c.nom, false, error.message); continue }
    const r = data ?? {}
    T(c.nom, r.nature === c.attendu && r.motif === c.motif,
      `attendu ${c.attendu}/${c.motif}, obtenu ${r.nature}/${r.motif}${c.note ? ` — ${c.note}` : ''}`)
  }
}

// ── D. Le verrou du manuel ────────────────────────────────────────────────────────────────────────
async function verrouManuel() {
  console.log('\n── D. Une correction faite à la main n’est jamais rejouée')
  const id = `<${marque}-1@presti-test.invalid>`
  const { data: e1, error: er1 } = await admin.rpc('enregistrer_courrier', {
    p_message_id: id, p_fil: id, p_sens: 'recu', p_email: 'inconnu@ailleurs.example', p_nom: 'Inconnu',
    p_sujet: 'Une question', p_corps: 'Bonjour', p_recu_le: new Date().toISOString(), p_boite: 'INBOX', p_uid: 1,
    p_entetes: {},
  })
  if (er1) { T('enregistrement d’un courrier de test', false, er1.message); return }
  aEffacer.push(e1?.id)
  T('un inconnu tombe en « à lire »', e1?.nature === 'a_lire' && e1?.motif === 'defaut', JSON.stringify(e1))

  // La correction humaine.
  const { data: c1, error: er2 } = await admin.rpc('classer_courrier', {
    p_acteur: null, p_acteur_email: 'test@presti-test.invalid', p_courrier: e1.id, p_statut: null,
    p_assigne: null, p_artisan: null, p_ip: '127.0.0.1', p_agent: 'suite', p_nature: 'fournisseur',
  })
  if (er2) { T('correction à la main', false, er2.message); return }
  T('la correction s’applique', c1?.etat === 'ok' && c1?.nature === 'fournisseur', JSON.stringify(c1))

  const { data: apres } = await admin.from('courriers').select('nature, nature_auto, nature_source').eq('id', e1.id).maybeSingle()
  T('la nature en vigueur est celle qu’on a choisie', apres?.nature === 'fournisseur', JSON.stringify(apres))
  T('ce que la RÈGLE avait dit est gardé (pour mesurer si elle se trompe souvent)', apres?.nature_auto === 'a_lire', JSON.stringify(apres))
  T('la source passe à « manuel » — c’est le verrou', apres?.nature_source === 'manuel', JSON.stringify(apres))

  // Le reclassement de masse ne doit PAS y toucher.
  const { error: er3 } = await admin.rpc('reclasser_courriers', { p_depuis: null })
  T('un reclassement de masse s’exécute', !er3, er3?.message)
  const { data: apres2 } = await admin.from('courriers').select('nature, nature_source').eq('id', e1.id).maybeSingle()
  T('… et la correction humaine a survécu', apres2?.nature === 'fournisseur', JSON.stringify(apres2))

  // Une relève qui repasse sur le même message ne doit rien écraser non plus.
  await admin.rpc('enregistrer_courrier', {
    p_message_id: id, p_fil: id, p_sens: 'recu', p_email: 'inconnu@ailleurs.example', p_nom: 'Inconnu',
    p_sujet: 'Une question', p_corps: 'Bonjour', p_recu_le: new Date().toISOString(), p_boite: 'INBOX', p_uid: 2,
    p_entetes: {},
  })
  const { data: apres3 } = await admin.from('courriers').select('nature, nature_source, uid_imap').eq('id', e1.id).maybeSingle()
  T('une relève du lendemain rafraîchit le numéro IMAP…', Number(apres3?.uid_imap) === 2, JSON.stringify(apres3))
  T('… sans toucher au rangement de la veille', apres3?.nature === 'fournisseur' && apres3?.nature_source === 'manuel', JSON.stringify(apres3))

  // Une nature inconnue est refusée, comme un statut inconnu.
  const { data: c2 } = await admin.rpc('classer_courrier', {
    p_acteur: null, p_acteur_email: 'test@presti-test.invalid', p_courrier: e1.id, p_statut: null,
    p_assigne: null, p_artisan: null, p_ip: '127.0.0.1', p_agent: 'suite', p_nature: 'poubelle',
  })
  T('une nature inventée est refusée', c2?.etat === 'nature_inconnue', JSON.stringify(c2))
}

// ── Les compteurs ─────────────────────────────────────────────────────────────────────────────────
async function compteurs() {
  console.log('\n── E. Les compteurs viennent de la base, pas d’une page')
  const { data, error } = await admin.rpc('compter_courriers_par_nature', { p_assigne: null })
  T('les compteurs répondent', !error && typeof data === 'object' && data !== null, error?.message)
  if (data) {
    const total = Object.values(data).reduce((n, x) => n + Number(x), 0)
    const { count } = await admin.from('courriers').select('id', { count: 'exact', head: true })
    T('leur somme est exactement le nombre de courriers', total === (count ?? 0), `${total} vs ${count}`)
  }
}

async function menage() {
  await admin.from('courriers').delete().like('message_id', `%${marque}%`).then(() => {}, () => {})
  if (aEffacer.length) await admin.from('courriers').delete().in('id', aEffacer.filter(Boolean)).then(() => {}, () => {})
  await admin.from('journal_direction').delete().eq('acteur_email', 'test@presti-test.invalid').then(() => {}, () => {})
}

async function main() {
  console.log('\n══ Le classement des courriers de l’entreprise ══')
  await resolution()

  // La migration 0072 est-elle collée ? Sans elle, rien de ce qui suit ne peut jouer — et ce n'est
  // ni un échec ni un succès : c'est un préalable qui n'appartient qu'à un humain.
  const { error: sonde } = await admin.rpc('nature_courrier', {
    p_email: 'x@y.fr', p_sujet: 'x', p_entetes: {}, p_est_artisan: false, p_fil_connu: false,
  })
  if (sonde && /does not exist|schema cache|PGRST202/i.test(sonde.message)) {
    console.log(`\n⛔ La migration 0072 n’est pas collée : le classement ne peut pas être vérifié.`)
    console.log(`   À faire : coller supabase/migrations/_A_COLLER_sql_editor_0072.sql dans le SQL Editor.`)
    console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués (partie A seulement)\n`)
    sortir(ko ? 1 : 2)
    return
  }

  await classement()
  await verrouManuel()
  await compteurs()
}

main()
  .catch((e) => { console.error('\n💥 La suite s’est arrêtée :', e?.message ?? e); ko++ })
  .finally(async () => {
    if (process.exitCode === 2) return   // déjà dit : la migration manque, rien d'autre à raconter
    await menage()
    console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués\n`)
    sortir(ko ? 1 : 0)
  })
